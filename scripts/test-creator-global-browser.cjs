"use strict";

// Optional real-browser regression. All HTTP requests are fulfilled locally or
// blocked. It never connects to Supabase or reuses a personal browser profile.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright-core");
const E = require("../apps/video-workspace/production-system/engine.js");
const repo = path.resolve(__dirname, "..");
const origin = "https://gucc.test";
const output = path.join(repo, "tmp", "creator-global-browser");
const snapshots = Object.fromEntries(["A", "B"].map((id) => [id, {
  project: { project_id: id, global_revision: 1 },
  languageTracks: [{ language_track_id: `${id}-ja`, track_key: "JA", language_code: "ja", revision: 1, status: "SCRIPTING" }],
  visualMasters: [{ visual_master_id: `${id}-vm`, visual_master_key: "VM_MAIN", status: "DRAFT", revision: 1 }],
  variants: [{ variant_id: `${id}-variant`, variant_key: "YOUTUBE_GLOBAL_LONG", visual_master_id: `${id}-vm`, market: "Global", format: "16:9 long", status: "DRAFT" }],
  variantLanguageTracks: [{ variant_id: `${id}-variant`, language_track_id: `${id}-ja` }],
  platforms: [{ id: "fixture-youtube", name: "YouTube" }],
  publishPackages: [], publications: [], files: [{ id: `${id}-audio`, file_key: "AUDIO_MASTER", relative_path: `${id}/03_AUDIO/AUDIO_MASTER.wav`, status: "Ready" }], scopedArtifacts: [],
} ]));

async function main() {
  const channel = process.env.GUCC_TEST_BROWSER || (process.platform === "win32" ? "msedge" : undefined);
  const browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: true });
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 900 } });
  const requests = [], failures = [], blocked = [];
  let holdB = false, releaseB = null, notifyHeldB = null;
  let allowProjectSave = false, releaseSave = null, notifyHeldSave = null;
  let listRows = [], releaseList = null, notifyHeldList = null;
  const revisions = { A: 2, B: 2 };
  function holdNextB() {
    holdB = true; releaseB = null;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Expected Project B request did not arrive")), 5000);
      notifyHeldB = () => { clearTimeout(timer); resolve(); };
    });
  }
  let page;
  try {
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === "https://api.gucc.test") {
        const body = route.request().postDataJSON(); requests.push(body);
        if (body.action === "listProjects") {
          if (notifyHeldList) await new Promise((resolve) => { releaseList = resolve; notifyHeldList(); notifyHeldList = null; });
          return route.fulfill({ json: { projects: listRows } });
        }
        if (body.action === "saveProject" && allowProjectSave) {
          const id = body.projectData.projectId;
          if (id !== "A" || body.baseRevision !== revisions[id]) {
            failures.push(`Invalid fixture save: ${id} / revision ${body.baseRevision}`);
            return route.fulfill({ status: 409, json: { error: "Invalid fixture save" } });
          }
          if (!releaseSave) await new Promise((resolve) => { releaseSave = resolve; notifyHeldSave?.(); });
          return route.fulfill({ json: { revision: ++revisions[id], project: { project_id: id } } });
        }
        if (body.action === "getProject") {
          if (body.projectId === "B" && holdB) await new Promise((resolve) => { releaseB = resolve; notifyHeldB?.(); });
          return route.fulfill({ json: snapshots[body.projectId] });
        }
        if (body.action === "registerDevice") return route.fulfill({ json: { device: { device_id: "isolated-device" } } });
        if (body.action !== "saveLanguageTrack" || body.projectId !== "B") {
          failures.push(`Unexpected fixture action: ${body.action} / ${body.projectId}`);
          return route.fulfill({ status: 403, json: { error: "Fixture action blocked" } });
        }
        return route.fulfill({ json: { ok: true } });
      }
      if (url.origin !== origin) { blocked.push(url.origin); return route.abort(); }
      const module = (body) => route.fulfill({ contentType: "text/javascript", body });
      if (url.pathname === "/assets/access-guard.js") return module('import("/assets/creator-pipeline-bridge.mjs"); import("/assets/creator-pipeline-ux.mjs"); // Real bridge/UX with isolated Auth/network boundaries.');
      if (url.pathname === "/apps/command-center/src/config.js") return module('export const CONFIG = {SUPABASE_URL:"https://api.gucc.test",SUPABASE_ANON_KEY:"fixture"};');
      if (url.pathname === "/apps/command-center/src/auth.js") return module('export const getSession=()=>({access_token:"isolated"}); export const getAccessToken=async()=>"isolated";');
      const target = path.resolve(repo, `.${decodeURIComponent(url.pathname)}`, url.pathname.endsWith("/") ? "index.html" : "");
      if (!target.startsWith(`${repo}${path.sep}`)) return route.abort();
      try {
        const contentType = ({ ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".json": "application/json" })[path.extname(target)] || "application/octet-stream";
        return route.fulfill({ contentType, body: await fs.readFile(target) });
      } catch { failures.push(`Missing fixture asset: ${url.pathname}`); return route.fulfill({ status: 404, body: "Not found" }); }
    });
    const { DRIVE_ROOT } = await import("../assets/creator-pipeline-core.mjs");
    const projects = ["A", "B"].map((id) => ({ ...E.createProject({ projectId: id, name: `ISOLATED ${id} · Global Production` }),
      integration: { cloud: { revision: 2 }, drive: { rootId: DRIVE_ROOT.id, rootUrl: DRIVE_ROOT.url, rootName: DRIVE_ROOT.name } } }));
    await context.addInitScript((projects) => {
      if (!localStorage.getItem("gucc_ai_video_production_v1")) localStorage.setItem("gucc_ai_video_production_v1", JSON.stringify({ projects, musicLibrary: [], selectedProjectId: "A" }));
      // Capture only the bridge's five-second autosync tick, without sleeping or
      // accelerating unrelated UI clocks. Production module code stays unchanged.
      const originalInterval = window.setInterval;
      window.setInterval = (fn, ms, ...args) => ms === 5000 ? (window.fixtureAutosync = fn, 1) : originalInterval(fn, ms, ...args);
    }, projects);
    page = await context.newPage();
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto(`${origin}/apps/video-workspace/production-system/?project=A`);
    await page.locator('#globalProduction [data-human-lock][data-scope-id="A"]').first().waitFor();
    await page.waitForFunction(() => typeof window.fixtureAutosync === "function");
    await page.locator('.gcb-integrated-host .gcb-inline').waitFor();
    assert.equal(await page.locator("#projectTitle").getAttribute("data-project-id"), "A");
    const stale = await page.locator('#globalProduction [data-human-lock]').first().elementHandle();
    const selectedB = holdNextB();
    await page.locator('[data-select-project="B"]').click();
    await page.waitForFunction(() => document.getElementById("globalProduction").inert);
    assert.equal(await page.locator("#globalProduction [data-human-lock]").count(), 0);
    await stale.evaluate((button) => button.click());
    assert.equal(requests.filter((request) => request.action === "humanLock").length, 0);
    await page.waitForFunction(() => document.getElementById("projectTitle").dataset.projectId === "B");
    // Wait for the routed B request itself, not a guessed network delay.
    await selectedB;
    assert.ok(releaseB, "Project B must request its own snapshot");
    holdB = false; releaseB();
    await page.locator('#globalProduction [data-human-lock][data-scope-id="B"]').first().waitFor();
    assert.match(page.url(), /project=B/);
    assert.equal(await page.locator('.project-item[aria-current="true"]').count(), 1);
    assert.equal(await page.locator('.project-item[aria-current="true"]').getAttribute("data-select-project"), "B");
    const selection = await page.locator(".project-item").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor));
    assert.notEqual(selection[0], selection[1], "Global theme must not mask the active project");
    await page.evaluate(() => window.fixtureAutosync());
    if (requests.some((r) => r.action === "saveProject")) {
      const changed = (a, b, prefix = "") => Object.keys({ ...a, ...b }).flatMap((key) => {
        const x = a?.[key], y = b?.[key], p = `${prefix}/${key}`;
        return JSON.stringify(x) === JSON.stringify(y) ? [] : x && y && typeof x === "object" && typeof y === "object" ? changed(x, y, p) : [p];
      });
      console.error("Unexpected navigation changes:", changed(projects[1], requests.find((r) => r.action === "saveProject").projectData));
    }
    assert.equal(requests.filter((r) => r.action === "saveProject").length, 0, "Real bridge must not save merely because Project B was selected");

    await page.locator(".global-setup summary").click();
    await page.locator('[data-global-form="language"] [name="trackKey"]').fill("EN_FIXTURE");
    await page.locator('[data-global-form="language"] [name="languageCode"]').fill("en");
    await page.locator('[data-global-form="language"] button[type="submit"]').click();
    await page.waitForFunction(() => !document.getElementById("globalProduction").inert);
    assert.equal(requests.filter((request) => request.action === "saveLanguageTrack").length, 1);
    assert.equal(await page.locator(".global-setup").getAttribute("open"), null);
    const toastStyle = await page.locator("#toast").evaluate((node) => ({ foreground: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor }));
    assert.deepEqual(toastStyle, { foreground: "rgb(238, 252, 255)", background: "rgb(20, 35, 48)" });

    const observedB = holdNextB();
    const beforeFiles = requests.length;
    await page.locator('[data-tab="files"]').click();
    await observedB;
    assert.ok(releaseB, "Files tab must request observations");
    await page.locator('[data-tab="control"]').click();
    await page.evaluate(() => window.fixtureAutosync());
    assert.equal(requests.filter((r) => r.action === "saveProject").length, 0, "Files/tab/project navigation must remain read-only");

    await page.locator('[data-tab="files"]').click();
    assert.equal(requests.length - beforeFiles, 1, "Repeated tab switching must reuse the pending observation read");
    await page.locator('[data-select-project="A"]').click();
    const audioObservation = page.locator('.file-row:has([data-upload-file="AUDIO_MASTER"]) .creator-observed-locations');
    await audioObservation.filter({ hasText: "A/03_AUDIO/AUDIO_MASTER.wav" }).waitFor();
    const staleResponse = page.waitForResponse((response) => response.request().postDataJSON()?.projectId === "B");
    holdB = false; releaseB(); await staleResponse;
    await page.evaluate(() => new Promise(requestAnimationFrame));
    assert.match(await audioObservation.textContent(), /A\/03_AUDIO\/AUDIO_MASTER.wav/);
    assert.doesNotMatch(await audioObservation.textContent(), /B\/03_AUDIO/);
    await page.locator('[data-tab="control"]').click();

    allowProjectSave = true;
    await page.locator('[data-tab="script"]').click();
    const note = page.locator('[data-project-field="voiceMaster"]');
    await note.fill("ISOLATED fixture first edit"); await note.blur();
    const saveHeld = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Expected fixture save did not arrive")), 5000);
      notifyHeldSave = () => { clearTimeout(timer); resolve(); };
    });
    await page.evaluate(() => { window.fixtureSaving = window.fixtureAutosync(); });
    await saveHeld;
    assert.ok(releaseSave, "Real bridge must save an authored fixture edit");
    await page.locator('[data-project-field="voiceMaster"]').fill("ISOLATED fixture newer edit while saving");
    await page.locator('[data-select-project="B"]').click();
    releaseSave(); await page.evaluate(() => window.fixtureSaving);
    assert.equal(await page.locator("#projectTitle").getAttribute("data-project-id"), "B", "Late acknowledgement must not change selection");
    await page.locator('[data-select-project="A"]').click();
    assert.equal(await page.locator('[data-project-field="voiceMaster"]').inputValue(), "ISOLATED fixture newer edit while saving");
    await page.evaluate(() => window.fixtureAutosync());
    assert.equal(requests.filter((r) => r.action === "saveProject").length, 2);
    await page.locator('[data-select-project="B"]').click();
    await page.locator('[data-select-project="A"]').click();
    await page.evaluate(() => window.fixtureAutosync());
    assert.equal(requests.filter((r) => r.action === "saveProject").length, 2, "Acknowledged content and subsequent navigation must settle");

    const cloudProject = structuredClone(requests.filter((r) => r.action === "saveProject").at(-1).projectData);
    cloudProject.voiceMaster = "ISOLATED cloud changed independently";
    listRows = [{ project_id: "A", project_data: cloudProject, revision: 5, updated_at: "2099-01-01T00:00:00.000Z" }];
    const listHeld = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Expected fixture pull did not arrive")), 5000);
      notifyHeldList = () => { clearTimeout(timer); resolve(); };
    });
    const syncDetails = page.locator(".ux-sync-details");
    assert.equal(await syncDetails.getAttribute("open"), null, "Manual sync controls must be collapsed by default");
    await syncDetails.locator("summary").click();
    assert.notEqual(await syncDetails.getAttribute("open"), null, "Manual sync requires explicit Sync details disclosure");
    await page.getByRole("button", { name: "拉取云端", exact: true }).click(); await listHeld;
    await page.locator('[data-project-field="voiceMaster"]').fill("ISOLATED unblurred edit during pull");
    releaseList();
    const friendlyDirty = page.locator('[data-gcb-status]').filter({ hasText: "● 本地有修改 · 正在同步" });
    await friendlyDirty.waitFor();
    assert.match(await friendlyDirty.getAttribute("title"), /编辑|本地/, "Friendly sync status must retain the underlying diagnostic in its title");
    assert.equal(await page.locator('[data-project-field="voiceMaster"]').inputValue(), "ISOLATED unblurred edit during pull", "Pending pull must not reload away the active editor");
    await page.locator('[data-project-field="voiceMaster"]').blur();
    await page.getByRole("button", { name: "拉取云端", exact: true }).click();
    const friendlyConflict = page.locator('[data-gcb-status]').filter({ hasText: "⚠ 冲突需要处理" });
    await friendlyConflict.waitFor();
    assert.match(await friendlyConflict.getAttribute("title"), /冲突/, "Friendly conflict status must retain the underlying diagnostic in its title");
    await page.waitForFunction(() => typeof window.fixtureAutosync === "function");
    const preserved = await page.evaluate(() => JSON.parse(localStorage.getItem("gucc_ai_video_production_v1")).projects.find((project) => project.projectId === "A"));
    assert.equal(preserved.voiceMaster, "ISOLATED unblurred edit during pull");
    assert.equal(preserved.integration.cloud.revision, 4);
    assert.equal(preserved.integration.cloud.conflict.currentRevision, 5);
    await page.evaluate(() => window.fixtureAutosync());
    assert.equal(requests.filter((r) => r.action === "saveProject").length, 2, "Pull conflicts must never auto-save a resolution");

    await page.getByRole("button", { name: "立即云同步", exact: true }).click();
    const conflictDialog = page.getByRole("dialog", { name: "云端版本冲突处理" });
    await conflictDialog.waitFor();
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.choice), "cancel", "Initial keyboard focus must not select an overwrite");
    await fs.mkdir(output, { recursive: true });
    for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width, height });
      const layout = await conflictDialog.evaluate((dialog) => ({ client: dialog.clientWidth, scroll: dialog.scrollWidth,
        actions: [...dialog.querySelectorAll('[data-choice]')].map((button) => ({ left: button.getBoundingClientRect().left, right: button.getBoundingClientRect().right })) }));
      assert.equal(layout.scroll, layout.client, `Conflict dialog overflow at ${width}px`);
      assert.ok(layout.actions.every((action) => action.left >= 0 && action.right <= width), "Every explicit conflict choice must stay reachable");
      await conflictDialog.screenshot({ path: path.join(output, `conflict-${width}.png`) });
    }
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem("gucc_ai_video_production_v1"));
      store.projects.find((project) => project.projectId === "A").voiceMaster = "ISOLATED newer edit while conflict modal is open";
      localStorage.setItem("gucc_ai_video_production_v1", JSON.stringify(store));
    });
    await conflictDialog.getByRole("button", { name: "保留云端", exact: true }).click();
    await page.waitForFunction(() => typeof window.fixtureAutosync === "function" && !document.querySelector('.gcb-conflict-dialog'));
    await page.locator('[data-tab="script"]').click();
    assert.equal(await page.locator('[data-project-field="voiceMaster"]').inputValue(), "ISOLATED newer edit while conflict modal is open", "Stale overwrite choices must reload the newest local draft without applying the old remote snapshot");
    assert.equal(requests.filter((r) => r.action === "saveProject").length, 2);
    const syncDetailsAfterReload = page.locator(".ux-sync-details");
    assert.equal(await syncDetailsAfterReload.getAttribute("open"), null, "Reload must restore Sync details to its collapsed default");
    await syncDetailsAfterReload.locator("summary").click();
    await page.getByRole("button", { name: "立即云同步", exact: true }).click();
    await conflictDialog.waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await conflictDialog.count(), 0, "Escape cancels an idle conflict dialog without choosing a version");
    await page.locator('[data-tab="control"]').click();

    await fs.mkdir(output, { recursive: true });
    const widths = [];
    for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.locator("#globalProduction").scrollIntoViewIfNeeded();
      const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert.equal(dimensions.scroll, dimensions.client, `Horizontal overflow at ${width}px`);
      if (width <= 1200) {
        const hero = await page.locator('.project-hero').evaluate((node) => ({
          width: node.clientWidth, title: node.querySelector('h2').getBoundingClientRect().width,
          titleBottom: node.querySelector('h2').getBoundingClientRect().bottom,
          actionsTop: node.querySelector('.hero-actions').getBoundingClientRect().top,
        }));
        assert.ok(hero.title > hero.width * 0.75, `Project identity must not be squeezed by its toolbar at ${width}px`);
        assert.ok(hero.actionsTop >= hero.titleBottom, `Project actions must stack below the identity at ${width}px`);
      }
      if (width <= 980) {
        const bridge = await page.locator('#guccCreatorBridge').evaluate((node) => ({
          width: node.clientWidth, title: node.querySelector('strong').getBoundingClientRect().width,
          statusBottom: node.querySelector('.gcb-status').getBoundingClientRect().bottom,
          actionsTop: node.querySelector('.gcb-row').getBoundingClientRect().top,
        }));
        assert.ok(bridge.title > bridge.width * 0.75, `Sync identity must remain readable at ${width}px`);
        assert.ok(bridge.actionsTop >= bridge.statusBottom, `Sync actions must not squeeze the status at ${width}px`);
      }
      assert.equal(await page.locator("[aria-labelledby]").evaluateAll((nodes) => nodes.filter((node) => node.getAttribute("aria-labelledby").split(/\s+/).some((id) => !document.getElementById(id))).length), 0);
      await page.screenshot({ path: path.join(output, `global-${width}.png`), fullPage: true });
      await page.locator("#globalProduction").screenshot({ path: path.join(output, `global-panel-${width}.png`) });
      await page.locator(".project-hero").screenshot({ path: path.join(output, `project-hero-${width}.png`) });
      await page.locator("#guccCreatorBridge").screenshot({ path: path.join(output, `sync-status-${width}.png`) });
      widths.push({ width, height, ...dimensions });
    }
    assert.deepEqual(failures, []);
    assert.deepEqual(blocked, [], "Fixture test must not attempt external network access");
    console.log(JSON.stringify({ status: "PASS", browser: await browser.version(), scope: "isolated fixture; NOT authenticated owner-session", requests: requests.map((r) => ({ action: r.action, projectId: r.projectId })), widths, screenshots: output }, null, 2));
  } catch (error) {
    await fs.mkdir(output, { recursive: true });
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
    throw error;
  } finally { releaseB?.(); releaseSave?.(); releaseList?.(); await context.close(); await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
