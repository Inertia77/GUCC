"use strict";
const fs = require("node:fs/promises"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require("playwright-core");
const { fixture } = require("./gucc-unified-fixture.cjs");
const pages = {
  portal: "/",
  creator: "/apps/video-workspace/production-system/",
  studio: "/apps/video-workspace/legacy-prompt-studio-v6.html",
  cover: "/apps/cover-generator/",
  publish: "/apps/publishing-console/",
};
const sizes = [
  [360, 800],
  [390, 844],
  [430, 932],
  [768, 1024],
  [1440, 900],
  [1920, 1080],
];
(async () => {
  const out = path.resolve(
    "tmp/atelier-" + (process.env.ATELIER_PHASE || "after"),
  );
  await fs.mkdir(out, { recursive: true });
  const b = await chromium.launch({
    headless: true,
    executablePath: process.env.GUCC_TEST_EXECUTABLE,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const f = fixture(),
    c = await b.newContext({ serviceWorkers: "block" });
  await f.install(c);
  const p = await c.newPage(),
    errors = [],
    metrics = [];
  c.setDefaultTimeout(10000);
  p.on("pageerror", (e) => errors.push(e.message));
  for (const [w, h] of sizes) {
    await p.setViewportSize({ width: w, height: h });
    for (const [name, url] of Object.entries(pages)) {
      await p.goto(f.origin + url + "?project=A&video=FIONI");
      await p.waitForFunction(
        () => window.GuccCreatorWorkspace?.context()?.videoId === "FIONI",
      );
      await p.evaluate(() => document.fonts.ready);
      await p.screenshot({
        animations: "disabled",
        path: path.join(out, `${name}-${w}.png`),
      });
      const rect = await p.locator("#guccCreatorContextBar").boundingBox();
      assert(
        rect && rect.height <= 64,
        `${name} ${w}: context must remain compact`,
      );
      assert(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `${name} ${w}: horizontal overflow`,
      );
      assert.deepEqual(
        await p.evaluate(() => window.GuccCreatorWorkspace.context()),
        { projectId: "A", videoId: "FIONI" },
      );
      metrics.push({ name, width: w, contextHeight: rect.height });
      if (w <= 430) {
        if (name === "studio")
          assert(
            (await p.locator(".prompt-panel").boundingBox()).y < 480,
            "Prompt must be present in the first screen",
          );
        if (name === "cover")
          assert(
            (await p.locator("#stageShell").boundingBox()).y < 400,
            "Canvas must be present in the first screen",
          );
        if (name === "publish")
          assert(
            (await p.locator("#projectTitle").boundingBox()).y < 680,
            "Publishing title must be reachable in the first screen",
          );
      }
      if (w === 390 || w === 1440) {
        const opener = p.locator(".gcc-context-trigger");
        if (await opener.count()) {
          await opener.click();
          await p.screenshot({
            animations: "disabled",
            path: path.join(out, `${name}-selector-${w}.png`),
          });
          const bounds = await p.locator("#guccProjectSwitcher").boundingBox();
          assert(
            bounds.x >= 0 && bounds.y >= 0 && bounds.y + bounds.height <= h + 1,
            "Switcher stays inside viewport",
          );
          assert(
            !(await p.locator(".gucc-shell-dock").isVisible()),
            "Global navigation yields to the modal",
          );
          for (let i = 0; i < 18; i++) await p.keyboard.press("Tab");
          assert(
            await p
              .locator("#guccProjectSwitcher")
              .evaluate((d) => d.contains(document.activeElement)),
            "Keyboard focus stays in selector",
          );
          await p.keyboard.press("Escape");
          assert(!(await p.locator("#guccProjectSwitcher").isVisible()));
        }
        if (name === "creator") {
          const open = p.locator('[data-gcc-outcome="script"]');
          if (await open.count()) await open.first().click();
          else await p.locator(".gcc-outcomes > summary").click();
          await p.screenshot({
            animations: "disabled",
            path: path.join(out, `outcome-${w}.png`),
          });
          await p.keyboard.press("Escape");
        }
        if (name === "cover" && w === 390) {
          await p.locator("[data-cover-view=materials]").click();
          assert(await p.locator(".materials-panel").isVisible());
          assert(!(await p.locator(".workspace").isVisible()));
          await p.screenshot({
            animations: "disabled",
            path: path.join(out, "cover-layers-390.png"),
          });
          await p.locator("#elementList .element-item").first().click();
          await p.locator("[data-cover-view=inspector]").click();
          assert(await p.locator("#propText").isVisible());
          await p.screenshot({
            animations: "disabled",
            path: path.join(out, "cover-properties-390.png"),
          });
          await p.locator("[data-cover-view=canvas]").click();
          assert(await p.locator("#stage").isVisible());
        }
      }
    }
  }
  // A completed project opens its real records without an empty mission taking over.
  f.snapshots.A.completedAt = "2026-10-14T10:00:00Z";
  const id = f.key("A", "FIONI", "script"),
    record = {
      project_id: "A",
      video_id: "FIONI",
      deliverable_key: "script",
      status: "confirmed",
      revision: 2,
      review_note: "已核对来源与口播节奏",
      evidence: {
        content: "隔离验收样稿：每条视频保留自己的正式文案。",
        locked: true,
        humanConfirmed: true,
        artifacts: [
          {
            fileName: "SCRIPT_FINAL.md",
            sizeBytes: 8240,
            sha256: "a".repeat(64),
            source: "browser_file",
          },
        ],
      },
    };
  f.deliverables.set(id, record);
  f.versions.set(id, [
    {
      revision: 2,
      record: structuredClone(record),
      created_at: "2026-10-14T10:00:00Z",
    },
    {
      revision: 1,
      record: {
        ...record,
        status: "review",
        review_note: "调整开场段落，等待审核",
        evidence: { ...record.evidence, locked: false, humanConfirmed: false },
      },
      created_at: "2026-10-13T12:00:00Z",
    },
  ]);
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(f.origin + pages.creator + "?project=A&video=FIONI");
  await p.waitForFunction(() =>
    window.GuccCreatorWorkspace?.records().some(
      (r) => r.status === "confirmed",
    ),
  );
  assert(
    await p
      .locator(".current-task-panel")
      .evaluate((e) => e.getBoundingClientRect().height < 240),
  );
  assert(!(await p.locator("#copyCurrentPrompt").isVisible()));
  await p.locator(".gcc-overview-list [data-gcc-outcome=script]").click();
  assert(await p.getByLabel("成果内容", { exact: true }).isDisabled());
  await p.locator(".gcc-history>summary").click();
  await p.waitForFunction(
    () => document.querySelectorAll(".gcc-version").length === 2,
  );
  await p.locator(".gcc-history").scrollIntoViewIfNeeded();
  await p.screenshot({
    animations: "disabled",
    path: path.join(out, "history-locked-390.png"),
  });
  assert.match(
    await p.locator(".gcc-version").first().innerText(),
    /已核对来源与口播节奏/,
  );
  await p
    .getByRole("button", { name: "重新打开已锁定成果", exact: true })
    .click();
  await p.screenshot({
    animations: "disabled",
    path: path.join(out, "reopen-confirm-390.png"),
  });
  await p.getByRole("button", { name: "取消", exact: true }).click();
  assert.deepEqual(
    f.deliverables.get(id),
    record,
    "Inspecting and cancelling never changes a Lock",
  );
  await p.keyboard.press("Escape");
  await p.locator(".gcc-context-trigger").click();
  await p.getByRole("button", { name: "＋ 新项目", exact: true }).click();
  await p.screenshot({
    animations: "disabled",
    path: path.join(out, "create-project-390.png"),
  });
  await p.getByRole("button", { name: "取消", exact: true }).click();
  assert.deepEqual(errors, []);
  assert.equal(
    f.writes.length,
    0,
    "Visual review does not mutate formal outcomes",
  );
  await fs.writeFile(
    path.join(out, "result.json"),
    JSON.stringify(
      {
        source:
          "isolated browser / actual repo HTML, CSS and JavaScript; synthetic records",
        sizes,
        metrics,
        errors,
      },
      null,
      2,
    ),
  );
  await b.close();
  console.log(
    "Captured " + out + "; errors " + JSON.stringify([...new Set(errors)]),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
