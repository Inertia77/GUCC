"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = fs.promises;
const os = require("node:os");
const path = require("node:path");
const Engine = require("../apps/video-workspace/production-system/engine.js");
const Contract = require("../assets/creator-local-project-contract.js");
const Bootstrap = require("./creator-local-agent/workspace-bootstrap.cjs");

function project(projectId, name = "清宵完整攻略", currentState = "IDEA") {
  return Engine.normalizeProject({ projectId, name, game: "鸣潮", topic: "Phase 2C.1 test", currentState });
}

async function exists(target) {
  try { await fsp.access(target); return true; } catch { return false; }
}

(async () => {
  const a = project("project_alpha123", "清宵完整攻略");
  const b = project("project_bravo456", "清宵完整攻略");
  assert.equal(Contract.canonicalProjectFolderName(a), Contract.canonicalProjectFolderName(a), "same project must be deterministic");
  assert.notEqual(Contract.canonicalProjectFolderName(a), Contract.canonicalProjectFolderName(b), "same title + different projectId must not collide");
  assert.match(Contract.canonicalProjectFolderName(a), /^清宵完整攻略_[a-z0-9]{6}$/u, "Chinese title should stay human-readable");
  assert.equal(Contract.safeProjectName('A:B/C*D?E"F<G>H|I'), "A_B_C_D_E_F_G_H_I", "Windows illegal chars must be sanitized");
  assert.equal(Contract.safeProjectName("CON"), "_CON", "Windows reserved device names must be safe");
  assert.throws(() => Contract.normalizeRelativePath("../escape.txt"), /traversal/i);
  assert.throws(() => Contract.normalizeRelativePath("C:/escape.txt"), /absolute/i);

  const workspace = await fsp.mkdtemp(path.join(os.tmpdir(), "gucc-phase2c1-bootstrap-"));
  try {
    const first = await Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: workspace, project: a });
    assert.equal(path.basename(first.projectRoot), Contract.canonicalProjectFolderName(a));
    assert.equal(first.reusedLegacyFolder, false);
    assert.equal(first.conflicts.length, 0);
    for (const relative of Engine.DIRECTORY_STRUCTURE) {
      assert.equal(await exists(path.join(first.projectRoot, ...relative.split("/"))), true, `standard directory missing: ${relative}`);
    }
    const data = JSON.parse(await fsp.readFile(path.join(first.projectRoot, "00_CONTROL", "PROJECT_DATA.json"), "utf8"));
    assert.equal(data.projectId, a.projectId, "PROJECT_DATA must contain exact projectId");
    const manifestText = await fsp.readFile(path.join(first.projectRoot, "00_CONTROL", "PROJECT_MANIFEST.md"), "utf8");
    const statusText = await fsp.readFile(path.join(first.projectRoot, "00_CONTROL", "STATUS.md"), "utf8");
    assert.match(manifestText, new RegExp(`project_id: ${a.projectId}`), "generated manifest must identify exact project");
    assert.match(statusText, /## STATE\nIDEA/, "generated STATUS must reflect the real project state");
    assert.equal(await exists(path.join(first.projectRoot, "00_CONTROL", ".gucc-projections.json")), true);

    const second = await Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: workspace, project: a });
    assert.equal(second.projectRoot, first.projectRoot, "same project must reuse same folder");
    assert.equal(second.created.length, 0, "second bootstrap should not create duplicate projection files");
    assert.equal((await fsp.readdir(workspace)).filter((name) => name === path.basename(first.projectRoot)).length, 1, "no duplicate project folder");

    const statusPath = path.join(first.projectRoot, "00_CONTROL", "STATUS.md");
    const manual = "# STATUS\n\nHuman edited content that must survive.\n";
    await fsp.writeFile(statusPath, manual, "utf8");
    const changed = project(a.projectId, a.name, "PLANNING");
    const third = await Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: workspace, project: changed });
    assert.ok(third.conflicts.includes("00_CONTROL/STATUS.md"), "manual local edit must surface conflict");
    assert.equal(await fsp.readFile(statusPath, "utf8"), manual, "manual local edit must not be overwritten");

    const legacy = project("project_legacy789", "Legacy 中文项目");
    const legacyRoot = path.join(workspace, "旧目录_不要改名");
    await fsp.mkdir(path.join(legacyRoot, "00_CONTROL"), { recursive: true });
    await fsp.writeFile(path.join(legacyRoot, "00_CONTROL", "PROJECT_DATA.json"), `${JSON.stringify({ projectId: legacy.projectId, name: legacy.name }, null, 2)}\n`, "utf8");
    const legacyResult = await Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: workspace, project: legacy });
    assert.equal(legacyResult.projectRoot, legacyRoot, "matching legacy PROJECT_DATA projectId must win over folder name");
    assert.equal(legacyResult.reusedLegacyFolder, true);
    assert.equal(await exists(path.join(workspace, Contract.canonicalProjectFolderName(legacy))), false, "legacy folder must not be renamed/duplicated");

    const collision = project("project_collision12", "Collision");
    const collisionRoot = path.join(workspace, Contract.canonicalProjectFolderName(collision));
    await fsp.mkdir(collisionRoot, { recursive: true });
    await fsp.writeFile(path.join(collisionRoot, "USER_NOTES.txt"), "keep me", "utf8");
    await assert.rejects(() => Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: workspace, project: collision }), /untracked local content/i);

    if (process.platform !== "win32") {
      const escaped = project("project_escape123", "Escape Project");
      const outside = await fsp.mkdtemp(path.join(os.tmpdir(), "gucc-phase2c1-outside-"));
      const link = path.join(workspace, Contract.canonicalProjectFolderName(escaped));
      await fsp.symlink(outside, link, "dir");
      await assert.rejects(() => Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: workspace, project: escaped }), /Symlink\/junction|outside Workspace Root/i);
      await fsp.rm(outside, { recursive: true, force: true });

      const nested = project("project_nested123", "Nested Escape");
      const nestedRoot = path.join(workspace, "legacy_nested_escape");
      await fsp.mkdir(path.join(nestedRoot, "00_CONTROL"), { recursive: true });
      await fsp.writeFile(path.join(nestedRoot, "00_CONTROL", "PROJECT_DATA.json"), `${JSON.stringify({ projectId: nested.projectId, name: nested.name }, null, 2)}\n`, "utf8");
      const outsideNested = await fsp.mkdtemp(path.join(os.tmpdir(), "gucc-phase2c1-nested-outside-"));
      await fsp.symlink(outsideNested, path.join(nestedRoot, "01_RESEARCH"), "dir");
      await assert.rejects(() => Bootstrap.bootstrapProjectWorkspace({ workspaceRoot: workspace, project: nested }), /Symlink\/junction directory/i, "nested symlink/junction must be rejected before projection writes");
      assert.deepEqual(await fsp.readdir(outsideNested), [], "bootstrap must not write through nested symlink/junction");
      await fsp.rm(path.join(nestedRoot, "01_RESEARCH"), { force: true });
      await fsp.rm(outsideNested, { recursive: true, force: true });
    }

    const browserSource = await fsp.readFile(path.join(__dirname, "..", "assets", "creator-project-bootstrap-browser.js"), "utf8");
    const productionHtml = await fsp.readFile(path.join(__dirname, "..", "apps", "video-workspace", "production-system", "index.html"), "utf8");
    assert.match(browserSource, /canonicalProjectFolderName/, "Browser bootstrap must use shared canonical contract");
    assert.match(browserSource, /projectId/, "Browser folder resolution must use projectId");
    assert.match(browserSource, /conflict/i, "Browser bootstrap must surface local conflicts");
    assert.match(productionHtml, /创建 \/ 同步本地 Workspace/, "Production UI must expose Create/Sync Local Workspace");
    assert.match(productionHtml, /creator-local-project-contract\.js/, "Production UI must load shared folder contract");

    console.log("Creator project bootstrap tests passed");
  } finally {
    await fsp.rm(workspace, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
