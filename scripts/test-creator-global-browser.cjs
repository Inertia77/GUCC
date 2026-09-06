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
const output = path.join(repo, "tmp", "global-browser-20260906");
const snapshots = Object.fromEntries(["A", "B"].map((id) => [id, {
  project: { project_id: id, global_revision: 1 },
  languageTracks: [{ language_track_id: `${id}-ja`, track_key: "JA", language_code: "ja", revision: 1, status: "SCRIPTING" }],
  visualMasters: [{ visual_master_id: `${id}-vm`, visual_master_key: "VM_MAIN", status: "DRAFT", revision: 1 }],
  variants: [{ variant_id: `${id}-variant`, variant_key: "YOUTUBE_GLOBAL_LONG", visual_master_id: `${id}-vm`, market: "Global", format: "16:9 long", status: "DRAFT" }],
  variantLanguageTracks: [{ variant_id: `${id}-variant`, language_track_id: `${id}-ja` }],
  platforms: [{ id: "fixture-youtube", name: "YouTube" }],
  publishPackages: [], publications: [], files: [], scopedArtifacts: [],
} ]));

async function main() {
  const browser = await chromium.launch({ channel: process.env.GUCC_TEST_BROWSER || "msedge", headless: true });
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 1440, height: 900 } });
  const requests = [], failures = [], blocked = [];
  let holdB = false, releaseB = null;
  try {
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === "https://api.gucc.test") {
        const body = route.request().postDataJSON(); requests.push(body);
        if (body.action === "getProject") {
          if (body.projectId === "B" && holdB) await new Promise((resolve) => { releaseB = resolve; });
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
      if (url.pathname === "/assets/access-guard.js") return module("// Access Guard is isolated out of this local fixture test.");
      if (url.pathname === "/apps/command-center/src/config.js") return module('export const CONFIG = {SUPABASE_URL:"https://api.gucc.test",SUPABASE_ANON_KEY:"fixture"};');
      if (url.pathname === "/apps/command-center/src/auth.js") return module('export const getSession=()=>({access_token:"isolated"}); export const getAccessToken=async()=>"isolated";');
      const target = path.resolve(repo, `.${decodeURIComponent(url.pathname)}`, url.pathname.endsWith("/") ? "index.html" : "");
      if (!target.startsWith(`${repo}${path.sep}`)) return route.abort();
      try {
        const contentType = ({ ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".json": "application/json" })[path.extname(target)] || "application/octet-stream";
        return route.fulfill({ contentType, body: await fs.readFile(target) });
      } catch { failures.push(`Missing fixture asset: ${url.pathname}`); return route.fulfill({ status: 404, body: "Not found" }); }
    });
    const projects = ["A", "B"].map((id) => ({ ...E.createProject({ name: `ISOLATED ${id} · Global Production` }), projectId: id }));
    await context.addInitScript((projects) => localStorage.setItem("gucc_ai_video_production_v1", JSON.stringify({ projects, musicLibrary: [], selectedProjectId: "B" })), projects);
    const page = await context.newPage();
    page.on("pageerror", (error) => failures.push(error.message));
    await page.goto(`${origin}/apps/video-workspace/production-system/?project=A`);
    await page.locator('#globalProduction [data-human-lock][data-scope-id="A"]').first().waitFor();
    assert.equal(await page.locator("#projectTitle").getAttribute("data-project-id"), "A");
    const stale = await page.locator('#globalProduction [data-human-lock]').first().elementHandle();
    holdB = true;
    await page.locator('[data-select-project="B"]').click();
    await page.waitForFunction(() => document.getElementById("globalProduction").inert);
    assert.equal(await page.locator("#globalProduction [data-human-lock]").count(), 0);
    await stale.evaluate((button) => button.click());
    assert.equal(requests.filter((request) => request.action === "humanLock").length, 0);
    await page.waitForFunction(() => document.getElementById("projectTitle").dataset.projectId === "B");
    // Wait for the routed B request itself, not a guessed network delay.
    for (let tries = 0; !releaseB && tries < 100; tries++) await new Promise((resolve) => setTimeout(resolve, 10));
    assert.ok(releaseB, "Project B must request its own snapshot");
    holdB = false; releaseB();
    await page.locator('#globalProduction [data-human-lock][data-scope-id="B"]').first().waitFor();
    assert.match(page.url(), /project=B/);
    assert.equal(await page.locator('.project-item[aria-current="true"]').count(), 1);
    assert.equal(await page.locator('.project-item[aria-current="true"]').getAttribute("data-select-project"), "B");
    const selection = await page.locator(".project-item").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor));
    assert.notEqual(selection[0], selection[1], "Global theme must not mask the active project");

    await page.locator(".global-setup summary").click();
    await page.locator('[data-global-form="language"] [name="trackKey"]').fill("EN_FIXTURE");
    await page.locator('[data-global-form="language"] [name="languageCode"]').fill("en");
    await page.locator('[data-global-form="language"] button[type="submit"]').click();
    await page.waitForFunction(() => !document.getElementById("globalProduction").inert);
    assert.equal(requests.filter((request) => request.action === "saveLanguageTrack").length, 1);
    assert.equal(await page.locator(".global-setup").getAttribute("open"), null);
    const toastStyle = await page.locator("#toast").evaluate((node) => ({ foreground: getComputedStyle(node).color, background: getComputedStyle(node).backgroundColor }));
    assert.deepEqual(toastStyle, { foreground: "rgb(238, 252, 255)", background: "rgb(20, 35, 48)" });

    await fs.mkdir(output, { recursive: true });
    const widths = [];
    for (const [width, height] of [[1440, 900], [768, 1024], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.locator("#globalProduction").scrollIntoViewIfNeeded();
      const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
      assert.equal(dimensions.scroll, dimensions.client, `Horizontal overflow at ${width}px`);
      assert.equal(await page.locator("[aria-labelledby]").evaluateAll((nodes) => nodes.filter((node) => node.getAttribute("aria-labelledby").split(/\s+/).some((id) => !document.getElementById(id))).length), 0);
      await page.screenshot({ path: path.join(output, `global-${width}.png`), fullPage: true });
      await page.locator("#globalProduction").screenshot({ path: path.join(output, `global-panel-${width}.png`) });
      widths.push({ width, height, ...dimensions });
    }
    assert.deepEqual(failures, []);
    assert.deepEqual(blocked, [], "Fixture test must not attempt external network access");
    console.log(JSON.stringify({ status: "PASS", browser: await browser.version(), scope: "isolated fixture; NOT authenticated owner-session", requests: requests.map((r) => ({ action: r.action, projectId: r.projectId })), widths, screenshots: output }, null, 2));
  } finally { await context.close(); await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
