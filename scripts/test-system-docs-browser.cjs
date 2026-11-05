"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright-core");
const { fixture } = require("./gucc-unified-fixture.cjs");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.GUCC_TEST_EXECUTABLE,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  const f = fixture();
  const context = await browser.newContext({ serviceWorkers: "block" });
  await f.install(context);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const output = path.resolve("tmp/system-docs-browser");
  await fs.mkdir(output, { recursive: true });
  const routes = [
    ["sql", "/docs/maintenance/query-manual.html", "查询与 SQL 维护手册"],
    ["db", "/docs/maintenance/db-structure.html", "数据库结构说明"],
    ["sys", "/docs/supabase-setup.html", "系统运行与维护指南"]
  ];

  try {
    for (const [width, height] of [[320, 760], [390, 844], [1440, 900]]) {
      await page.setViewportSize({ width, height });
      for (const [name, url, title] of routes) {
        await page.goto(f.origin + url);
        assert(await page.locator("h1").first().innerText().then(s => s.includes(title)), name+" heading mismatch");
        assert.equal(await page.locator(".doc-header nav a").count(), 3);
        const metrics = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          readable: getComputedStyle(document.body).color !== "rgba(0, 0, 0, 0)"
        }));
        assert(metrics.overflow <= 2, name + "/" + width + " horizontal overflow " + metrics.overflow);
        assert(metrics.readable, name + " color not set");
        if (name === "db") {
          assert.equal(await page.locator(".schema-table").count(), 46);
          const first = page.locator(".schema-table").first();
          await first.locator("summary").click();
          assert(await first.evaluate(el => el.open), "DB table accordion must be interactive");
        }
        await page.screenshot({ path: path.join(output, name + "-" + width + ".png"), fullPage: false });
      }
    }
    await page.goto(f.origin + "/");
    await page.locator(".system-panel summary").click();
    for (const url of routes.map(r => r[1])) {
      assert.equal(await page.locator('.system-grid a[href=".' + url + '"]').count(),1);
    }
    assert.deepEqual(errors, [], "Browser errors: " + errors.join(" / "));
    console.log("GUCC system docs: three routes × three viewports + 46 expandable tables + Portal navigation PASS");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
