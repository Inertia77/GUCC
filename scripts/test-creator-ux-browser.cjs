"use strict";

// Focused Creator UX acceptance. All network is fulfilled locally or blocked;
// no Supabase production state, Human Gate, Publication, or external publish is mutated.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright-core");
const E = require("../apps/video-workspace/production-system/engine.js");

const repo = path.resolve(__dirname, "..");
const origin = "https://gucc.test";
const output = path.join(repo, "tmp", "creator-ux-browser");
const snapshot = {
  project: {
    project_id: "A", global_revision: 3,
    project_scope_locked_at: "2026-09-08T00:00:00Z",
    evidence_locked_at: "2026-09-08T00:01:00Z",
    master_script_locked_at: "2026-09-08T00:02:00Z",
  },
  languageTracks: [{ language_track_id: "A-ja", track_key: "JA", language_code: "ja", revision: 1, status: "SCRIPTING", script_locked_at: null }],
  visualMasters: [{ visual_master_id: "A-vm", visual_master_key: "VM_MAIN", status: "DRAFT", revision: 1 }],
  visualSegments: [],
  variants: [{ variant_id: "A-variant", variant_key: "YOUTUBE_GLOBAL_LONG", visual_master_id: "A-vm", market: "Global", format: "16:9 long", status: "DRAFT" }],
  variantLanguageTracks: [{ variant_id: "A-variant", language_track_id: "A-ja" }],
  platforms: [{ id: "fixture-youtube", name: "YouTube" }],
  channels: [{ channel_id: "A-channel", platform_id: "fixture-youtube", channel_key: "YOUTUBE_GLOBAL", name: "YouTube Global", market: "Global" }],
  platformPresentations: [{ presentation_id: "A-presentation", variant_id: "A-variant", platform_id: "fixture-youtube", title: "Fixture title" }],
  publishPackages: [{ publish_package_id: "A-package", variant_id: "A-variant", package_key: "YT_GLOBAL_R1", package_revision: 1, validation_status: "VALID", validation_errors: [], platform_locked_at: "2026-09-08T00:03:00Z", qa_status: "PASS", qa_package_revision: 1, human_reviewed_at: "2026-09-08T00:04:00Z", release_locked_at: "2026-09-08T00:05:00Z" }],
  publications: [{ publication_id: "A-publication-raw-id", publish_package_id: "A-package", publication_mode: "INITIAL", status: "READY_TO_PUBLISH", revision: 1 }],
  metricSnapshots: [], performanceReports: [], learnings: [],
  files: [], scopedArtifacts: [{ id: "A-video", artifact_scope_type: "variant", artifact_scope_id: "A-variant", file_key: "MASTER_VIDEO", relative_path: "09_FINAL/A.mp4", checksum: `sha256:${"a".repeat(64)}`, status: "Ready" }],
};

async function main() {
  const channel = process.env.GUCC_TEST_BROWSER || (process.platform === "win32" ? "msedge" : undefined);
  const browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: true });
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 } });
  const requests = [], failures = [], consoleErrors = [], blocked = [];
  let page;
  try {
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === "https://api.gucc.test") {
        const body = route.request().postDataJSON(); requests.push(body);
        if (body.action === "listProjects") return route.fulfill({ json: { projects: [] } });
        if (body.action === "getProject" && body.projectId === "A") return route.fulfill({ json: snapshot });
        if (body.action === "registerDevice") return route.fulfill({ json: { device: { device_id: "ux-isolated-device" } } });
        failures.push(`Unexpected write/action in UX smoke: ${body.action}`);
        return route.fulfill({ status: 403, json: { error: "UX smoke is read/navigation only" } });
      }
      if (url.origin !== origin) { blocked.push(url.origin); return route.abort(); }
      const module = (body) => route.fulfill({ contentType: "text/javascript", body });
      if (url.pathname === "/assets/access-guard.js") return module('import("/assets/creator-pipeline-bridge.mjs"); import("/assets/creator-pipeline-ux.mjs");');
      if (url.pathname === "/apps/command-center/src/config.js") return module('export const CONFIG={SUPABASE_URL:"https://api.gucc.test",SUPABASE_ANON_KEY:"fixture"};');
      if (url.pathname === "/apps/command-center/src/auth.js") return module('export const getSession=()=>({access_token:"isolated"}); export const getAccessToken=async()=>"isolated";');
      const target = path.resolve(repo, `.${decodeURIComponent(url.pathname)}`, url.pathname.endsWith("/") ? "index.html" : "");
      if (!target.startsWith(`${repo}${path.sep}`)) return route.abort();
      try {
        const contentType = ({ ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png" })[path.extname(target)] || "application/octet-stream";
        return route.fulfill({ contentType, body: await fs.readFile(target) });
      } catch { failures.push(`Missing fixture asset: ${url.pathname}`); return route.fulfill({ status: 404, body: "Not found" }); }
    });

    const { DRIVE_ROOT } = await import("../assets/creator-pipeline-core.mjs");
    const project = { ...E.createProject({ projectId: "A", name: "ISOLATED A · Creator UX" }), integration: { cloud: { revision: 3 }, drive: { rootId: DRIVE_ROOT.id, rootUrl: DRIVE_ROOT.url, rootName: DRIVE_ROOT.name } } };
    await context.addInitScript((project) => {
      localStorage.setItem("gucc_ai_video_production_v1", JSON.stringify({ projects: [project], musicLibrary: [], selectedProjectId: "A" }));
    }, project);

    page = await context.newPage();
    page.on("pageerror", (error) => failures.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    await page.goto(`${origin}/apps/video-workspace/production-system/?project=A`);
    await page.locator(".ux-canonical-now").waitFor();
    await page.locator("#guccCreatorBridge").waitFor();
    await page.waitForFunction(() => document.body.dataset.creatorUxCloseout === "creator-ux-simplification-v1-closeout");

    assert.equal(await page.locator(".ux-primary-action:visible").count(), 1, "Default Production must have one canonical primary next action");
    assert.equal(await page.locator("#nextActionCard:visible").count(), 0, "Legacy Next Action must remain in closed Advanced detail");
    assert.equal(await page.locator("#globalProduction .global-next:visible").count(), 0, "Original Global next action must not compete visually");
    assert.equal(await page.locator("#globalProduction [data-human-lock]:visible").count(), 1, "Only the current Human Gate may be visible by default");
    assert.equal(await page.locator(".ux-canonical-now [data-human-lock]:visible").count(), 1, "Visible Human Gate must be the canonical decision control");
    assert.equal(requests.filter((request) => request.action === "humanLock").length, 0, "Human Gate must never auto-fire during rendering");

    assert.equal(await page.locator(".ux-legacy-workflow").getAttribute("open"), null, "Legacy workflow detail must default collapsed");
    assert.match(await page.locator(".ux-project-stage").textContent(), /语言版本/, "Project hero must expose a friendly current stage");
    const language = page.locator(".global-lane").filter({ hasText: "Language Tracks" }).locator(".global-card-head strong").first();
    assert.equal(await language.textContent(), "日语版", "Raw language identity must not be the primary visible label");
    assert.match(await language.getAttribute("title"), /JA/, "Raw language identity must remain available as secondary technical detail");

    const setup = page.locator(".global-setup");
    const setupSummary = setup.locator(":scope > summary");
    await setupSummary.click();
    await page.locator('[data-global-form="language"] .ux-identity-settings').waitFor();
    assert.equal(await page.locator('[data-global-form="language"] [name="trackKey"]').isVisible(), false, "Raw language identity input must be hidden from default setup");
    assert.equal(await page.locator('[data-global-form="language"] .ux-identity-settings').getAttribute("open"), null, "Raw identity override must default collapsed");
    assert.equal(await page.locator('[data-global-form="visual"]:visible').count(), 0, "Non-current Global setup forms must be progressively disclosed");
    const languageCode = page.locator('[data-global-form="language"] [name="languageCode"]');
    assert.equal(await languageCode.isVisible(), true, "Human language choice must remain directly editable");
    await setupSummary.click();

    assert.equal(await page.locator("#globalProduction [data-create-publication]:visible").count(), 0, "Production must not expose Publication creation execution");
    assert.equal(await page.locator("#globalProduction [data-record-published]:visible").count(), 0, "Production must not expose published-record execution");
    assert.equal(await page.locator("#globalProduction [data-publication-copy]:visible").count(), 0, "Production must not expose Retry/Repost execution");
    assert.equal(await page.locator(".ux-sync-details").getAttribute("open"), null, "Manual sync controls must default collapsed");
    assert.equal(requests.filter((request) => request.action === "saveProject").length, 0, "Opening and navigating the UX must not write the Project");

    await fs.mkdir(output, { recursive: true });
    const widths = [];
    for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(20);
      const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert.equal(dimensions.scroll, dimensions.client, `Horizontal overflow at ${width}px`);
      const broken = await page.locator("img").evaluateAll((images) => images.filter((image) => image.complete && image.naturalWidth === 0).length);
      assert.equal(broken, 0, `Broken image at ${width}px`);
      const primary = page.locator(".ux-primary-action:visible");
      const box = await primary.boundingBox();
      assert.ok(box && box.width > 0 && box.height >= 44, `Canonical CTA must be reachable and at least 44px at ${width}px`);
      const occluded = await primary.evaluate((button) => {
        const rect = button.getBoundingClientRect(); const node = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return !(node === button || button.contains(node));
      });
      assert.equal(occluded, false, `Canonical CTA must not be covered by a fixed overlay at ${width}px`);
      if (width === 390) {
        for (const selector of ["#projectTitle", ".ux-project-stage", ".ux-canonical-now h3", ".ux-primary-action"]) {
          const rect = await page.locator(selector).first().boundingBox();
          assert.ok(rect && rect.y >= 0 && rect.y + rect.height <= height, `${selector} must be in the 390×844 first fold`);
        }
        await setupSummary.click();
        const fontSize = await languageCode.evaluate((input) => parseFloat(getComputedStyle(input).fontSize));
        assert.ok(fontSize >= 16, "Phone form controls must use at least 16px input text");
        await setupSummary.click();
      }
      await page.screenshot({ path: path.join(output, `current-task-first-${width}.png`), fullPage: false });
      await page.screenshot({ path: path.join(output, `global-${width}.png`), fullPage: true });
      widths.push({ width, height, ...dimensions });
    }

    assert.deepEqual(failures, []);
    assert.deepEqual(consoleErrors, [], "Creator UX smoke must have no console errors");
    assert.deepEqual(blocked, [], "Creator UX smoke must not attempt external network access");
    assert.equal(requests.filter((request) => ["humanLock", "saveProject", "saveLanguageTrack", "saveVariant", "savePublishPackage", "savePublication"].includes(request.action)).length, 0, "Read/navigation acceptance must create no Production data");
    console.log(JSON.stringify({ status: "PASS", scope: "Creator UX isolated read/navigation smoke; no Production writes", widths, screenshots: output }, null, 2));
  } catch (error) {
    await fs.mkdir(output, { recursive: true });
    if (page && !page.isClosed()) await page.screenshot({ path: path.join(output, "failure.png"), fullPage: true }).catch(() => {});
    throw error;
  } finally {
    await context.close(); await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
