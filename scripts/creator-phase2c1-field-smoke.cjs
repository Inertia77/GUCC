#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = fs.promises;
const http = require("node:http");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright-core");
const Core = require("./creator-local-agent/core.cjs");
const Cloud = require("./creator-local-agent/cloud.cjs");
const Bootstrap = require("./creator-local-agent/workspace-bootstrap.cjs");
const Assets = require("./creator-local-agent/project-assets.cjs");
const BrowserField = require("./creator-phase2c1-browser-field.cjs");
const Persistence = require("./creator-phase2c1-persistence.cjs");
const Engine = require("../apps/video-workspace/production-system/engine.js");
const Contract = require("../assets/creator-local-project-contract.js");

const TEST_PROJECT_ID = "TEST_Phase2C1_LocalBootstrap";
const FIXTURE_MARKER = "GUCC_PHASE2C1_DISCOVERY_FIXTURE_ONLY\n";
const REPO_ROOT = path.resolve(__dirname, "..");
const PUBLISHER_URL = "http://127.0.0.1:17877";
const STATIC_URL = "http://127.0.0.1:8000";
const ACCESS_HASH = "fa730fc17620bb57e6f247329e9aff57d22eab704420c047eddebde8a00cf5a3";

async function exists(target) {
  try { await fsp.access(target); return true; } catch { return false; }
}

async function configuredClient() {
  const config = await Core.loadConfig(Core.CONFIG_PATH);
  if (!config.refreshToken || !config.workspaceRoot) {
    throw new Error(`Formal Creator Agent config is required at ${Core.CONFIG_PATH}. Run creator:agent -- --setup first.`);
  }
  const client = new Cloud.CreatorCloudClient({
    refreshToken: config.refreshToken,
    onRefreshToken: async (refreshToken) => {
      config.refreshToken = refreshToken;
      await Core.saveConfig(config, Core.CONFIG_PATH);
    },
  });
  return { config, client };
}

async function exactLocalProject(workspaceRoot) {
  const discovered = await Core.discoverProjects(workspaceRoot);
  if ((discovered.duplicateIds || []).includes(TEST_PROJECT_ID)) throw new Error(`Duplicate TEST projectId ${TEST_PROJECT_ID}`);
  const matches = discovered.projects.filter((item) => item.projectId === TEST_PROJECT_ID);
  if (matches.length > 1) throw new Error(`Multiple local folders claim ${TEST_PROJECT_ID}`);
  return { discovered, project: matches[0] || null };
}

async function safeFixture(project, relativePath, content = FIXTURE_MARKER) {
  const relative = Contract.normalizeRelativePath(relativePath);
  const target = path.resolve(project.projectRoot, ...relative.split("/"));
  assert.equal(Core.isPathInside(project.realProjectRoot, target), true, `Fixture path escapes TEST project: ${relative}`);
  const parent = path.dirname(target);
  const parentReal = await fsp.realpath(parent);
  assert.equal(Core.isPathInside(project.realProjectRoot, parentReal), true, `Fixture parent escapes TEST project: ${relative}`);
  await fsp.writeFile(target, content, { encoding: "utf8", flag: "w" });
  return target;
}

async function fetchJson(url, options = {}, timeoutMs = 2500) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) throw new Error(data.error || `${url} returned ${response.status}`);
  return data;
}

async function publisherDiscovery() {
  return fetchJson(`${PUBLISHER_URL}/api/discover-project-assets`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: STATIC_URL },
    body: JSON.stringify({ projectId: TEST_PROJECT_ID }),
  });
}

async function ensurePublisherAssistant() {
  try {
    await fetchJson(`${PUBLISHER_URL}/api/health`, {}, 900);
    try {
      await publisherDiscovery();
      return { managed: false, close: async () => {} };
    } catch (error) {
      throw new Error(`Port 17877 already has an incompatible Publisher Assistant. Stop the old assistant and rerun this smoke. Detail: ${error.message}`);
    }
  } catch (error) {
    if (/incompatible Publisher Assistant/.test(error.message)) throw error;
  }

  const logs = [];
  const child = spawn(process.execPath, [path.join(REPO_ROOT, "scripts", "publisher-assistant", "server.cjs")], {
    cwd: REPO_ROOT,
    env: { ...process.env, GUCC_PUBLISHER_PORT: "17877" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const collect = (chunk) => { logs.push(String(chunk)); if (logs.join("").length > 5000) logs.shift(); };
  child.stdout.on("data", collect);
  child.stderr.on("data", collect);
  child.on("error", collect);

  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`Publisher Assistant exited early (${child.exitCode}): ${logs.join("").slice(-2500)}`);
    try {
      await fetchJson(`${PUBLISHER_URL}/api/health`, {}, 700);
      return {
        managed: true,
        close: async () => {
          if (child.exitCode == null) child.kill("SIGTERM");
          await new Promise((resolve) => {
            if (child.exitCode != null) return resolve();
            child.once("exit", resolve);
            setTimeout(resolve, 2500).unref();
          });
        },
      };
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  if (child.exitCode == null) child.kill("SIGTERM");
  throw new Error(`Publisher Assistant did not become ready: ${logs.join("").slice(-2500)}`);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if ([".js", ".mjs"].includes(ext)) return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json" || ext === ".webmanifest") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if ([".jpg", ".jpeg"].includes(ext)) return "image/jpeg";
  return "text/html; charset=utf-8";
}

async function ensureStaticServer() {
  const existing = await BrowserField.verifyStaticTree(STATIC_URL);
  if (existing.ok) {
    console.log(`browserStaticServer=existing-compatible ${BrowserField.formatStaticTree(existing)}`);
    return { managed: false, health: existing, close: async () => {} };
  }

  let portOccupied = false;
  try {
    const response = await fetch(`${STATIC_URL}/`, { cache: "no-store", signal: AbortSignal.timeout(700) });
    portOccupied = Boolean(response);
  } catch {}
  if (portOccupied) {
    throw new Error(`Port 8000 is serving an incomplete/stale GUCC browser tree. Refusing field acceptance. ${BrowserField.formatStaticTree(existing)}`);
  }

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, STATIC_URL);
      const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
      let target = path.resolve(REPO_ROOT, relative);
      if (!Core.isPathInside(REPO_ROOT, target)) { response.writeHead(403); response.end("Forbidden"); return; }
      let stat = await fsp.stat(target);
      if (stat.isDirectory()) { target = path.join(target, "index.html"); stat = await fsp.stat(target); }
      if (!stat.isFile()) { response.writeHead(404); response.end("Not found"); return; }
      const body = await fsp.readFile(target);
      response.writeHead(200, { "Content-Type": contentType(target), "Cache-Control": "no-store" });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end("Not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(8000, "127.0.0.1", resolve);
  });
  const managedHealth = await BrowserField.verifyStaticTree(STATIC_URL);
  assert.equal(managedHealth.ok, true, `Managed static server must serve the complete current Publish Console browser tree. ${BrowserField.formatStaticTree(managedHealth)}`);
  console.log(`browserStaticServer=managed ${BrowserField.formatStaticTree(managedHealth)}`);
  return { managed: true, health: managedHealth, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function launchInstalledBrowser() {
  let lastError;
  for (const channel of ["msedge", "chrome"]) {
    try {
      const browser = await chromium.launch({ channel, headless: true });
      return { browser, channel };
    } catch (error) { lastError = error; }
  }
  throw new Error(`Windows Browser smoke requires installed Edge or Chrome: ${lastError?.message || "launch failed"}`);
}

function browserStores(project) {
  const normalized = Engine.normalizeProject(project);
  return {
    production: {
      schemaVersion: Engine.SCHEMA_VERSION,
      projects: [normalized],
      musicLibrary: [],
      selectedProjectId: TEST_PROJECT_ID,
    },
    publish: {
      schemaVersion: "gucc-publish-console-1",
      updatedAt: new Date().toISOString(),
      project: { title: normalized.name, shortName: normalized.name, game: normalized.game, note: `Project ID: ${TEST_PROJECT_ID}` },
      common: { publishAt: "", timezone: "Asia/Tokyo", video: null, cover: null, videoPath: "", coverPath: "" },
      enabled: {}, platforms: {}, execution: {}, snapshots: [],
      source: { workspaceVersion: "production-system-v1", publishPackage: "", creatorProjectId: TEST_PROJECT_ID },
      preflight: { checkedAt: "", errors: 0, warnings: 0 },
    },
  };
}

function logNavigation(label, status, snapshot) {
  console.log(`browserNavigation=${label}:target=${snapshot.targetUrl}:status=${status == null ? "NO_RESPONSE" : status}:final=${snapshot.currentUrl}:title=${snapshot.title || ""}:readyState=${snapshot.readyState || ""}:redirected=${Boolean(snapshot.redirected)}`);
}

function logAccess(snapshot) {
  console.log(`browserAccess=hash:${snapshot.accessHashPresent ? "present" : "missing"},GuccAccess:${snapshot.guccAccessPresent ? "present" : "missing"},hasAccess:${snapshot.accessPassed === true ? "true" : snapshot.accessPassed === false ? "false" : "unavailable"},redirected:${Boolean(snapshot.redirected)}`);
}

function logPublishDom(snapshot) {
  console.log(`browserPublishDom=assistantSetup:${snapshot.assistantSetupCount || 0},discoverButton:${snapshot.discoverButtonCount || 0},discoverVisible:${Boolean(snapshot.discoverButtonVisible)},localVideoPath:${snapshot.localVideoPathCount || 0},localCoverPath:${snapshot.localCoverPathCount || 0}`);
}

function logCriticalResponses(diagnostics) {
  const responses = diagnostics.criticalResponses();
  for (const key of BrowserField.BROWSER_RESOURCE_KEYS) {
    const item = responses[key];
    console.log(`browserAsset=${key}:${item ? `HTTP:${item.status}` : "NO_RESPONSE"}`);
  }
}

async function runBrowserSmoke(project, localProject) {
  const staticServer = await ensureStaticServer();
  let launched;
  let context;
  let page;
  let diagnostics;
  let activeTarget = "";
  const canonicalVideo = path.join(localProject.projectRoot, "09_FINAL", "VIDEO_V1.mp4");
  const older = path.join(localProject.projectRoot, "09_FINAL", "A-final.mp4");
  const newer = path.join(localProject.projectRoot, "09_FINAL", "Z-final.mkv");
  try {
    launched = await launchInstalledBrowser();
    const stores = browserStores(project);
    context = await launched.browser.newContext();
    await context.addInitScript(({ accessHash, production, publish }) => {
      try {
        localStorage.setItem("gucc_access_hash_v2", accessHash);
        if (!localStorage.getItem("gucc_ai_video_production_v1")) localStorage.setItem("gucc_ai_video_production_v1", JSON.stringify(production));
        if (!localStorage.getItem("gucc_publish_console_v1")) localStorage.setItem("gucc_publish_console_v1", JSON.stringify(publish));
      } catch {}
    }, { accessHash: ACCESS_HASH, production: stores.production, publish: stores.publish });
    page = await context.newPage();
    diagnostics = BrowserField.attachPageDiagnostics(page, {
      accessKey: "gucc_access_hash_v2",
      staticUrl: STATIC_URL,
      publisherHealthUrl: `${PUBLISHER_URL}/api/health`,
    });
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      try {
        const location = typeof message.location === "function" ? message.location() : null;
        if (location?.url) {
          console.log(`browserConsoleLocation=${location.url}:${location.lineNumber ?? ""}:${location.columnNumber ?? ""}`);
        }
      } catch {}
    });

    const productionUrl = `${STATIC_URL}/apps/video-workspace/production-system/`;
    activeTarget = productionUrl;
    const productionStatus = await BrowserField.runStage(
      "production-navigation",
      () => BrowserField.navigateDocument(page, productionUrl, 15000),
      diagnostics,
      productionUrl,
    );
    const productionSnapshot = await diagnostics.snapshot(productionUrl);
    logNavigation("production", productionStatus, productionSnapshot);

    await BrowserField.runStage("production-ui", async () => {
      const bootstrapButton = page.locator('[data-action="sync-directory"]');
      await bootstrapButton.waitFor({ state: "visible", timeout: 8000 });
      assert.equal((await bootstrapButton.textContent()).trim(), "创建 / 同步本地 Workspace", "Production must expose the simplified Local Workspace action");
      assert.equal(await page.locator('input[name="projectId"]:visible').count(), 0, "Production must not require visible manual Project ID input");
    }, diagnostics, productionUrl);

    const publishUrl = `${STATIC_URL}/apps/publishing-console/`;
    activeTarget = publishUrl;
    const publishStatus = await BrowserField.runStage(
      "publish-navigation",
      () => BrowserField.navigateDocument(page, publishUrl, 15000),
      diagnostics,
      publishUrl,
    );
    let publishSnapshot = await diagnostics.snapshot(publishUrl);
    logNavigation("publish", publishStatus, publishSnapshot);

    await BrowserField.runStage("publish-access", async () => {
      publishSnapshot = await diagnostics.snapshot(publishUrl);
      assert.equal(publishSnapshot.redirected, false, `Publish Console redirected unexpectedly to ${publishSnapshot.currentUrl}`);
      assert.equal(publishSnapshot.accessHashPresent, true, "gucc_access_hash_v2 must exist before Publish Console guard runs");
      assert.equal(publishSnapshot.guccAccessPresent, true, "window.GuccAccess must exist on Publish Console");
      assert.equal(publishSnapshot.accessPassed, true, "GuccAccess.hasAccess() must pass on field smoke");
      assert.equal(publishSnapshot.title, "GUCC Publish Console", "Field smoke must remain on the real Publish Console document");
      logAccess(publishSnapshot);
    }, diagnostics, publishUrl);

    await BrowserField.runStage("publish-script", async () => {
      diagnostics.assertCriticalResponses();
      logCriticalResponses(diagnostics);
    }, diagnostics, publishUrl);

    await BrowserField.runStage("publish-discovery-ui", async () => {
      await page.locator("#discoverProjectAssetsButton").waitFor({ state: "visible", timeout: 8000 });
      publishSnapshot = await diagnostics.snapshot(publishUrl);
      assert.equal(publishSnapshot.assistantSetupCount, 1, "Publish Console must expose one .assistant-setup region");
      assert.equal(publishSnapshot.discoverButtonCount, 1, "creator-publish-asset-discovery.js must install one discovery button");
      assert.equal(publishSnapshot.discoverButtonVisible, true, "Discovery button must be visible");
      assert.equal(publishSnapshot.localVideoPathCount, 1, "Publish Console must expose localVideoPath");
      assert.equal(publishSnapshot.localCoverPathCount, 1, "Publish Console must expose localCoverPath");
      logPublishDom(publishSnapshot);
    }, diagnostics, publishUrl);

    await BrowserField.runStage("publish-discovery-behavior", async () => {
      await page.waitForFunction(() => document.querySelector("#localVideoPath")?.value?.endsWith("VIDEO_V1.mp4"), null, { timeout: 12000 });
      await page.waitForFunction(() => document.querySelector("#localCoverPath")?.value?.endsWith("COVER_16_9.png"), null, { timeout: 12000 });
    }, diagnostics, publishUrl);

    const persistence = await BrowserField.runStage(
      "publish-persistence",
      () => Persistence.waitForPublishPersistence(page, { projectId: TEST_PROJECT_ID, timeoutMs: 3000 }),
      diagnostics,
      publishUrl,
    );
    Persistence.assertProvenanceSeparated(persistence);
    assert.equal(await page.locator("#localVideoPath").inputValue(), persistence.domVideoPath, "DOM video path must match persistence evidence");
    assert.equal(persistence.persistedVideoPath, persistence.domVideoPath, "Publish runtime state must persist the discovered video path before provenance comparison");
    assert.equal(persistence.provenanceVideoPath, persistence.domVideoPath, "Independent provenance must persist the same discovered video path");
    console.log(`browserPersistence=PASS:video=${persistence.domVideoPath}`);

    let publishState = persistence.publishState;
    assert.equal(publishState?.source?.creatorProjectId, TEST_PROJECT_ID, "Production→Publish Creator Project ID must remain intact in browser runtime");
    assert.equal(await page.locator("#videoMeta").getAttribute("data-discovery"), "found", "Publish browser must show discovered Final Video");
    assert.equal(await page.locator("#coverMeta").getAttribute("data-discovery"), "found", "Publish browser must show discovered Cover");
    assert.equal(await page.locator("#pickVideoPathButton").count(), 1, "Manual video picker must remain available");
    assert.equal(await page.locator("#pickCoverPathButton").count(), 1, "Manual cover picker must remain available");
    let provenance = await page.evaluate(() => JSON.parse(localStorage.getItem("gucc_publish_asset_discovery_v1") || "{}"));
    assert.equal(provenance?.[TEST_PROJECT_ID]?.video?.path, publishState.common.videoPath, "Auto video provenance must be stored outside publish state");

    const manualVideo = String.raw`C:\GUCC_MANUAL_OVERRIDE\manual-final.mp4`;
    await page.locator("#localVideoPath").fill(manualVideo);
    await page.locator("#discoverProjectAssetsButton").click();
    await page.waitForFunction(() => document.querySelector("#videoMeta")?.dataset.discovery === "manual-preserved", null, { timeout: 8000 });
    assert.equal(await page.locator("#localVideoPath").inputValue(), manualVideo, "Automatic discovery must not overwrite a manual local path");

    await page.locator("#localVideoPath").fill("");
    await page.locator("#discoverProjectAssetsButton").click();
    await page.waitForFunction(() => document.querySelector("#localVideoPath")?.value?.endsWith("VIDEO_V1.mp4"), null, { timeout: 8000 });
    await BrowserField.runStage(
      "publish-pre-reload-persistence",
      () => Persistence.waitForPublishPersistence(page, { projectId: TEST_PROJECT_ID, timeoutMs: 3000 }),
      diagnostics,
      publishUrl,
    );
    await BrowserField.runStage("publish-reload-navigation", async () => {
      await page.reload({ waitUntil: "commit", timeout: 15000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 15000 });
      const snapshot = await diagnostics.snapshot(publishUrl);
      assert.equal(snapshot.redirected, false, `Publish reload redirected unexpectedly to ${snapshot.currentUrl}`);
    }, diagnostics, publishUrl);
    await page.locator("#discoverProjectAssetsButton").waitFor({ state: "visible", timeout: 8000 });
    await page.waitForFunction(() => document.querySelector("#localVideoPath")?.value?.endsWith("VIDEO_V1.mp4"), null, { timeout: 12000 });
    provenance = await page.evaluate(() => JSON.parse(localStorage.getItem("gucc_publish_asset_discovery_v1") || "{}"));
    assert.ok(provenance?.[TEST_PROJECT_ID]?.video?.path?.endsWith("VIDEO_V1.mp4"), "Auto discovery provenance must survive page reload");

    await fsp.rm(canonicalVideo, { force: true });
    await safeFixture(localProject, "09_FINAL/A-final.mp4");
    await safeFixture(localProject, "09_FINAL/Z-final.mkv");
    await fsp.utimes(older, new Date("2020-01-01T00:00:00Z"), new Date("2020-01-01T00:00:00Z"));
    await fsp.utimes(newer, new Date("2030-01-01T00:00:00Z"), new Date("2030-01-01T00:00:00Z"));
    await page.locator("#discoverProjectAssetsButton").click();
    await page.waitForFunction(() => document.querySelector("#videoMeta")?.dataset.discovery === "ambiguous", null, { timeout: 8000 });
    assert.equal(await page.locator("#localVideoPath").inputValue(), "", "Ambiguous rediscovery after reload must clear a stale auto-filled path");

    await fsp.rm(older, { force: true });
    await fsp.rm(newer, { force: true });
    await safeFixture(localProject, "09_FINAL/VIDEO_V1.mp4");
    await page.locator("#discoverProjectAssetsButton").click();
    await page.waitForFunction(() => document.querySelector("#localVideoPath")?.value?.endsWith("VIDEO_V1.mp4"), null, { timeout: 8000 });
    const finalPersistence = await BrowserField.runStage(
      "publish-final-persistence",
      () => Persistence.waitForPublishPersistence(page, { projectId: TEST_PROJECT_ID, timeoutMs: 3000 }),
      diagnostics,
      publishUrl,
    );
    Persistence.assertProvenanceSeparated(finalPersistence);
    publishState = finalPersistence.publishState;

    console.log(`browserRuntimeEvents=console:${diagnostics.events.console.length},pageerror:${diagnostics.events.pageErrors.length},requestfailed:${diagnostics.events.requestFailed.length}`);
    for (const item of diagnostics.events.responses.filter((entry) => entry.status >= 400)) console.log(`browserHttpError=${item.url}:${item.status}`);

    await context.close();
    return { channel: launched.channel, videoPath: publishState.common.videoPath, coverPath: publishState.common.coverPath, manualPrecedence: true, reloadProvenance: true, browserAmbiguous: true };
  } catch (error) {
    if (diagnostics) await diagnostics.dump("browser-runtime", activeTarget).catch((dumpError) => console.error(`browserDiagnosticsError=${dumpError?.message || dumpError}`));
    throw error;
  } finally {
    await fsp.rm(older, { force: true }).catch(() => {});
    await fsp.rm(newer, { force: true }).catch(() => {});
    if (!await exists(canonicalVideo)) await safeFixture(localProject, "09_FINAL/VIDEO_V1.mp4").catch(() => {});
    if (launched?.browser) await launched.browser.close().catch(() => {});
    await staticServer.close().catch(() => {});
  }
}

async function prepareSmoke() {
  const { config, client } = await configuredClient();
  const snapshot = await client.getProject(TEST_PROJECT_ID);
  const raw = snapshot?.project?.project_data || {};
  assert.equal(snapshot?.project?.project_id, TEST_PROJECT_ID, "Cloud getProject must return the isolated TEST project");
  assert.equal(raw.projectId, TEST_PROJECT_ID, "Cloud project_data projectId mismatch");

  const first = await Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: config.workspaceRoot, snapshot });
  const expectedFolder = Contract.canonicalProjectFolderName({ projectId: TEST_PROJECT_ID, name: snapshot.project.name });
  assert.equal(first.reusedLegacyFolder, false, "TEST project must use a new canonical folder, not legacy reuse");
  assert.equal(path.basename(first.projectRoot), expectedFolder, "Windows bootstrap folder must match canonical contract");
  assert.equal(first.conflicts.length, 0, "First bootstrap must not conflict");

  for (const relative of Engine.DIRECTORY_STRUCTURE) {
    assert.equal(await exists(path.join(first.projectRoot, ...relative.split("/"))), true, `Missing standard directory: ${relative}`);
  }
  const projectDataPath = path.join(first.projectRoot, "00_CONTROL", "PROJECT_DATA.json");
  const localProjectData = JSON.parse(await fsp.readFile(projectDataPath, "utf8"));
  assert.equal(localProjectData.projectId, TEST_PROJECT_ID, "Local PROJECT_DATA must keep exact TEST Project ID");

  const second = await Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: config.workspaceRoot, snapshot });
  assert.equal(second.projectRoot, first.projectRoot, "Second bootstrap must reuse the exact same folder");
  assert.equal(second.created.length, 0, "Second bootstrap must not create duplicate projection files");
  assert.equal(second.updated.length, 0, "Second bootstrap must not rewrite unchanged projection files");
  assert.equal(second.conflicts.length, 0, "Second bootstrap must remain conflict-free");

  const located = await exactLocalProject(config.workspaceRoot);
  assert.ok(located.project, "TEST project must be discoverable by PROJECT_DATA.projectId");
  assert.equal(located.project.projectRoot, first.projectRoot, "Project ID discovery must resolve the bootstrapped folder");

  const canonicalVideo = await safeFixture(located.project, "09_FINAL/VIDEO_V1.mp4");
  const canonicalCover = await safeFixture(located.project, "10_RELEASE/COVER_16_9.png");
  let discovery = await Assets.discoverProjectAssets({ workspaceRoot: config.workspaceRoot, projectId: TEST_PROJECT_ID });
  assert.equal(discovery.video.status, "found");
  assert.equal(discovery.video.source, "canonical");
  assert.equal(discovery.video.path, canonicalVideo);
  assert.equal(discovery.covers.preferred.status, "found");
  assert.equal(discovery.covers.preferred.path, canonicalCover);

  const publisher = await ensurePublisherAssistant();
  try {
    let assistantDiscovery = await publisherDiscovery();
    assert.equal(assistantDiscovery.projectId, TEST_PROJECT_ID, "Publisher Assistant must resolve the exact Project ID");
    assert.equal(assistantDiscovery.canonicalFolderName, expectedFolder, "Publisher Assistant must report shared canonical identity");
    assert.equal(assistantDiscovery.video.status, "found");
    assert.equal(assistantDiscovery.video.path, canonicalVideo);
    assert.equal(assistantDiscovery.covers.preferred.path, canonicalCover);

    await fsp.rm(canonicalVideo, { force: true });
    const oldCandidate = await safeFixture(located.project, "09_FINAL/A-final.mp4");
    const newCandidate = await safeFixture(located.project, "09_FINAL/Z-final.mkv");
    await fsp.utimes(oldCandidate, new Date("2020-01-01T00:00:00Z"), new Date("2020-01-01T00:00:00Z"));
    await fsp.utimes(newCandidate, new Date("2030-01-01T00:00:00Z"), new Date("2030-01-01T00:00:00Z"));
    discovery = await Assets.discoverProjectAssets({ workspaceRoot: config.workspaceRoot, projectId: TEST_PROJECT_ID });
    assert.equal(discovery.video.status, "ambiguous", "Two Final candidates must be Ambiguous");
    assert.equal(discovery.video.path, "", "Ambiguous discovery must not choose a path");
    assert.deepEqual(discovery.video.candidates.map((item) => item.name), ["A-final.mp4", "Z-final.mkv"], "Ambiguous order must be deterministic by filename, not mtime");
    assistantDiscovery = await publisherDiscovery();
    assert.equal(assistantDiscovery.video.status, "ambiguous", "Publisher Assistant must surface Ambiguous, not guess by mtime");
    assert.equal(assistantDiscovery.video.path, "");

    await fsp.rm(oldCandidate, { force: true });
    await fsp.rm(newCandidate, { force: true });
    await safeFixture(located.project, "09_FINAL/VIDEO_V1.mp4");
    discovery = await Assets.discoverProjectAssets({ workspaceRoot: config.workspaceRoot, projectId: TEST_PROJECT_ID });
    assert.equal(discovery.video.status, "found", "Canonical Final fixture must be restored for browser smoke");
    assert.equal(discovery.covers.preferred.status, "found", "Cover fixture must remain ready for browser smoke");
    assistantDiscovery = await publisherDiscovery();
    assert.equal(assistantDiscovery.video.status, "found");
    assert.equal(assistantDiscovery.covers.preferred.status, "found");

    const browser = await runBrowserSmoke({ ...raw, projectId: TEST_PROJECT_ID, name: snapshot.project.name, game: snapshot.project.game, topic: snapshot.project.topic }, located.project);

    console.log("\nPHASE2C1_WINDOWS_SMOKE_OK\n");
    console.log(`projectId=${TEST_PROJECT_ID}`);
    console.log(`folder=${first.projectRoot}`);
    console.log(`canonicalFolder=${expectedFolder}`);
    console.log(`bootstrap1=created:${first.created.length},updated:${first.updated.length},conflicts:${first.conflicts.length}`);
    console.log(`bootstrap2=created:${second.created.length},updated:${second.updated.length},conflicts:${second.conflicts.length}`);
    console.log(`publisherAssistant=PASS:${publisher.managed ? "managed" : "existing-compatible"}`);
    console.log(`video=${discovery.video.status}:${discovery.video.name}`);
    console.log(`cover=${discovery.covers.preferred.status}:${discovery.covers.preferred.name}`);
    console.log("ambiguousFinal=PASS:no-mtime-guess");
    console.log(`browserSmoke=PASS:${browser.channel}`);
    console.log("manualPrecedence=PASS");
    console.log("reloadProvenance=PASS");
    console.log("browserAmbiguous=PASS:stale-auto-path-cleared");
    console.log("manualPicker=PASS:preserved");
    console.log("browserFixtures=READY");
    console.log("No TEST cleanup has run yet. Run this script with --cleanup after reporting this output.");
  } finally {
    await publisher.close().catch(() => {});
  }
}

async function cleanupSmoke() {
  const { config } = await configuredClient();
  const { discovered, project } = await exactLocalProject(config.workspaceRoot);
  if (!project) {
    console.log("PHASE2C1_LOCAL_CLEANUP_OK: TEST folder already absent");
    return;
  }
  const workspaceReal = discovered.realRoot;
  const projectReal = await fsp.realpath(project.projectRoot);
  assert.equal(Core.isPathInside(workspaceReal, projectReal), true, "Refusing cleanup outside formal Workspace Root");
  const data = JSON.parse(await fsp.readFile(path.join(project.projectRoot, "00_CONTROL", "PROJECT_DATA.json"), "utf8"));
  assert.equal(data.projectId, TEST_PROJECT_ID, "Refusing cleanup: local folder is not the fixed Phase 2C.1 TEST project");
  await fsp.rm(project.projectRoot, { recursive: true, force: true });
  console.log(`PHASE2C1_LOCAL_CLEANUP_OK: ${project.projectRoot}`);
}

(async () => {
  if (process.argv.includes("--cleanup")) await cleanupSmoke();
  else await prepareSmoke();
})().catch((error) => {
  console.error(`PHASE2C1_WINDOWS_SMOKE_FAILED: ${error.stack || error.message}`);
  process.exit(1);
});