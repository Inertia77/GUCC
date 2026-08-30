"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = fs.promises;
const os = require("node:os");
const path = require("node:path");
const Assets = require("./creator-local-agent/project-assets.cjs");
const Contract = require("../assets/creator-local-project-contract.js");
const CloudSafety = require("../assets/creator-publish-cloud-safety.js");

async function makeProject(workspace, folder, projectId, name = "Same Title") {
  const root = path.join(workspace, folder);
  await fsp.mkdir(path.join(root, "00_CONTROL"), { recursive: true });
  await fsp.mkdir(path.join(root, "09_FINAL"), { recursive: true });
  await fsp.mkdir(path.join(root, "10_RELEASE"), { recursive: true });
  await fsp.writeFile(path.join(root, "00_CONTROL", "PROJECT_DATA.json"), `${JSON.stringify({ projectId, name }, null, 2)}\n`, "utf8");
  return root;
}

async function touch(filePath, content = "fixture") {
  await fsp.writeFile(filePath, content, "utf8");
  return filePath;
}

(async () => {
  const workspace = await fsp.mkdtemp(path.join(os.tmpdir(), "gucc-phase2c1-discovery-"));
  try {
    const alphaId = "project_alpha111";
    const betaId = "project_beta222";
    const alpha = await makeProject(workspace, "legacy-title-folder-a", alphaId, "同名项目");
    const beta = await makeProject(workspace, "legacy-title-folder-b", betaId, "同名项目");

    let result = await Assets.discoverProjectAssets({ workspaceRoot: workspace, projectId: betaId });
    assert.equal(result.projectId, betaId);
    assert.equal(result.projectRoot, beta, "creatorProjectId must resolve exact project root even when titles match");
    assert.notEqual(result.projectRoot, alpha, "discovery must not resolve by title only");
    assert.equal(result.canonicalFolderName, Contract.canonicalProjectFolderName({ projectId: betaId, name: "同名项目" }), "Publisher Assistant discovery must use the shared canonical folder contract");
    assert.equal(result.reusedLegacyFolder, true, "legacy physical folder stays in place even when canonical identity differs");
    assert.equal(result.video.status, "missing");
    assert.equal(result.covers.preferred.status, "missing", "missing cover must be allowed");

    const canonical = await touch(path.join(beta, "09_FINAL", "VIDEO_V1.mp4"));
    result = await Assets.discoverProjectAssets({ workspaceRoot: workspace, projectId: betaId });
    assert.equal(result.video.status, "found");
    assert.equal(result.video.source, "canonical");
    assert.equal(result.video.path, canonical, "canonical VIDEO_V1 must win");
    await fsp.rm(canonical);

    const extensionFallback = await touch(path.join(beta, "09_FINAL", "VIDEO_V1.mov"));
    result = await Assets.discoverProjectAssets({ workspaceRoot: workspace, projectId: betaId });
    assert.equal(result.video.status, "found");
    assert.equal(result.video.source, "video_v1_extension_fallback");
    assert.equal(result.video.path, extensionFallback);
    await fsp.rm(extensionFallback);

    const onlyFallback = await touch(path.join(beta, "09_FINAL", "final-export.webm"));
    result = await Assets.discoverProjectAssets({ workspaceRoot: workspace, projectId: betaId });
    assert.equal(result.video.status, "found");
    assert.equal(result.video.source, "single_final_candidate");
    assert.equal(result.video.path, onlyFallback);
    await fsp.rm(onlyFallback);

    const older = await touch(path.join(beta, "09_FINAL", "A-final.mp4"));
    const newer = await touch(path.join(beta, "09_FINAL", "Z-final.mkv"));
    const oldTime = new Date("2020-01-01T00:00:00Z");
    const newTime = new Date("2030-01-01T00:00:00Z");
    await fsp.utimes(older, oldTime, oldTime);
    await fsp.utimes(newer, newTime, newTime);
    result = await Assets.discoverProjectAssets({ workspaceRoot: workspace, projectId: betaId });
    assert.equal(result.video.status, "ambiguous", "multiple final videos must be ambiguous");
    assert.deepEqual(result.video.candidates.map((item) => item.name), ["A-final.mp4", "Z-final.mkv"], "candidate order must be deterministic by name, not mtime");
    assert.equal(result.video.path, "", "ambiguous result must never choose newest path");
    await fsp.rm(older); await fsp.rm(newer);

    const cover16 = await touch(path.join(beta, "10_RELEASE", "COVER_16_9.png"));
    result = await Assets.discoverProjectAssets({ workspaceRoot: workspace, projectId: betaId });
    assert.equal(result.covers.COVER_16_9.status, "found");
    assert.equal(result.covers.preferred.path, cover16);
    await fsp.rm(cover16);

    const generatorCover = await touch(path.join(beta, "10_RELEASE", "清宵_16x9_1920x1080.webp"));
    result = await Assets.discoverProjectAssets({ workspaceRoot: workspace, projectId: betaId });
    assert.equal(result.covers.COVER_16_9.status, "found", "Cover Generator 16:9 export naming should be recognized");
    assert.equal(result.covers.preferred.path, generatorCover);
    await fsp.rm(generatorCover);

    const coverA = await touch(path.join(beta, "10_RELEASE", "COVER_16_9.png"));
    const coverB = await touch(path.join(beta, "10_RELEASE", "COVER_16_9.jpg"));
    result = await Assets.discoverProjectAssets({ workspaceRoot: workspace, projectId: betaId });
    assert.equal(result.covers.COVER_16_9.status, "ambiguous");
    assert.equal(result.covers.preferred.status, "ambiguous", "multiple cover candidates must not be guessed");
    assert.equal(result.covers.preferred.path, "");
    await fsp.rm(coverA); await fsp.rm(coverB);

    const cover43 = await touch(path.join(beta, "10_RELEASE", "COVER_4_3.png"));
    const cover916 = await touch(path.join(beta, "10_RELEASE", "COVER_9_16.png"));
    result = await Assets.discoverProjectAssets({ workspaceRoot: workspace, projectId: betaId });
    assert.equal(result.covers.COVER_4_3.status, "found");
    assert.equal(result.covers.COVER_9_16.status, "found");
    assert.equal(result.covers.preferred.status, "ambiguous", "multiple valid ratio-specific covers must be explicit ambiguity, not missing");
    assert.equal(result.covers.preferred.source, "ratio_specific");
    assert.deepEqual(result.covers.preferred.candidates.map((item) => item.name), ["COVER_4_3.png", "COVER_9_16.png"]);
    await fsp.rm(cover43); await fsp.rm(cover916);

    const missing = await Assets.discoverProjectAssets({ workspaceRoot: workspace, projectId: "project_not_here" });
    assert.equal(missing.status, "project_missing");
    assert.equal(missing.projectRoot, "");

    if (process.platform !== "win32") {
      const outside = await fsp.mkdtemp(path.join(os.tmpdir(), "gucc-phase2c1-assets-outside-"));
      await touch(path.join(outside, "evil.mp4"));
      const finalDir = path.join(beta, "09_FINAL");
      await fsp.rm(finalDir, { recursive: true, force: true });
      await fsp.symlink(outside, finalDir, "dir");
      await assert.rejects(() => Assets.discoverProjectAssets({ workspaceRoot: workspace, projectId: betaId }), /outside Project Root/i, "discovery must not follow assets outside Workspace Root");
      await fsp.rm(finalDir, { force: true });
      await fsp.mkdir(finalDir, { recursive: true });
      await fsp.rm(outside, { recursive: true, force: true });
    }

    const localVideoPath = String.raw`C:\Users\Inertia\GUCC Creator Projects\TEST\09_FINAL\VIDEO_V1.mp4`;
    const localCoverPath = String.raw`C:\Users\Inertia\GUCC Creator Projects\TEST\10_RELEASE\COVER_16_9.png`;
    const releaseInit = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveRelease",
        projectId: betaId,
        publishState: {
          common: { timezone: "Asia/Tokyo", videoPath: localVideoPath, coverPath: localCoverPath },
          execution: { bilibili: { status: "未开始" } },
        },
      }),
    };
    const sanitizedInit = CloudSafety.sanitizeFetchInit("https://rubjeqnuxuvupjwyksmo.supabase.co/functions/v1/creator-project-api", releaseInit);
    const cloudPayload = JSON.parse(sanitizedInit.body);
    assert.equal(Object.prototype.hasOwnProperty.call(cloudPayload.publishState.common, "videoPath"), false, "absolute videoPath must not reach Supabase payload");
    assert.equal(Object.prototype.hasOwnProperty.call(cloudPayload.publishState.common, "coverPath"), false, "absolute coverPath must not reach Supabase payload");
    assert.equal(cloudPayload.publishState.common.timezone, "Asia/Tokyo", "non-local publish fields must remain intact");
    const originalPayload = JSON.parse(releaseInit.body);
    assert.equal(originalPayload.publishState.common.videoPath, localVideoPath, "local runtime state must remain available to Publisher Assistant");
    assert.equal(CloudSafety.sanitizeFetchInit("http://127.0.0.1:17877/api/prepare", releaseInit), releaseInit, "localhost Publisher Assistant payload must not be altered by cloud guard");

    const server = await fsp.readFile(path.join(__dirname, "publisher-assistant", "server.cjs"), "utf8");
    const ui = await fsp.readFile(path.join(__dirname, "..", "assets", "creator-publish-asset-discovery.js"), "utf8");
    const consoleHtml = await fsp.readFile(path.join(__dirname, "..", "apps", "publishing-console", "index.html"), "utf8");
    const adapters = await fsp.readFile(path.join(__dirname, "publisher-assistant", "adapters.cjs"), "utf8");
    const pipeline = await fsp.readFile(path.join(__dirname, "..", "assets", "creator-pipeline-core.mjs"), "utf8");

    assert.match(server, /\/api\/discover-project-assets/, "Publisher Assistant must expose project asset discovery");
    assert.match(server, /body\?\.workspaceRoot.*body\?\.root.*body\?\.path.*body\?\.projectRoot/s, "browser-supplied discovery roots must be rejected");
    assert.match(server, /CreatorCore\.CONFIG_PATH/, "discovery must reuse Creator Local Agent config");
    assert.match(server, /\/api\/select-file/, "manual picker endpoint must remain available");
    assert.match(consoleHtml, /creator-publish-cloud-safety\.js[\s\S]*access-guard\.js/, "cloud path guard must install before creator bridge can sync release state");
    assert.match(consoleHtml, /creator-publish-asset-discovery\.js/, "Publishing Console must load auto discovery UI");
    assert.match(ui, /creatorProjectId/, "Publishing Console discovery must use creatorProjectId");
    assert.match(ui, /ambiguous/, "Publishing Console must render ambiguity instead of guessing");
    assert.match(ui, /DataTransfer/, "discovered local paths must hydrate existing Console asset metadata contract");
    assert.match(ui, /PROVENANCE_KEY/, "auto discovery provenance must survive page reload without entering publish state");
    assert.match(ui, /clearStaleAutoDiscovered/, "ambiguous/missing rediscovery must clear stale auto-filled values");
    assert.match(ui, /manual-preserved/, "manual local selection must take precedence over automatic discovery");
    assert.match(ui, /event\.isTrusted/, "trusted manual browser edits must drop automatic provenance");
    assert.match(adapters, /PROTECTED_ACTION/, "final publish protected action boundary must remain intact");
    assert.match(pipeline, /creatorProjectId/, "Creator Project ID must remain in Production→Publish handoff");
    assert.doesNotMatch(server, /supabase\.storage|drive\.google|upload.*supabase/i, "Publisher discovery must not add media cloud upload");
    assert.doesNotMatch(server, /service_role/i, "Publisher Assistant must not receive service_role");

    console.log("Creator publish discovery tests passed");
  } finally {
    await fsp.rm(workspace, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
