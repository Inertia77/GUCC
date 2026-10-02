"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

(async () => {
  const Core = await import(pathToFileURL(path.join(__dirname, "..", "assets", "creator-file-observation-core.mjs")).href);
  const files = [
    { id: "f1", project_id: "p1", file_key: "AUDIO_MASTER", relative_path: "03_AUDIO/AUDIO_MASTER.wav", status: "Missing" },
    { id: "f2", project_id: "p1", file_key: "VIDEO_V1", relative_path: "09_FINAL/VIDEO_V1.mp4", status: "Ready" },
    { id: "f3", project_id: "p1", file_key: "EDIT_BLUEPRINT", relative_path: "06_EDIT_PLAN/EDIT_BLUEPRINT.csv", status: "Missing" },
  ];
  const locations = [
    { logical_file_id: "f1", project_id: "p1", device_id: "agent_win", availability: "present", relative_path: "03_AUDIO/AUDIO_MASTER.wav", size_bytes: 123, observed_at: "2026-08-27T00:00:00Z" },
    { logical_file_id: "f2", project_id: "p1", device_id: "agent_win", availability: "missing", relative_path: "09_FINAL/VIDEO_V1.mp4", observed_at: "2026-08-27T00:00:00Z" },
  ];
  const devices = [{ device_id: "agent_win", label: "主力 Windows 创作机" }];
  const summary = Core.buildObservationSummary(files, locations, devices);
  assert.equal(summary.present, 1);
  assert.equal(summary.missing, 1);
  assert.equal(summary.unknown, 1);
  const audio = summary.artifacts.find((a) => a.fileKey === "AUDIO_MASTER");
  assert.equal(audio.logicalStatus, "Missing", "physical observation must not mutate logical artifact status");
  assert.equal(audio.physicalAvailability, "present");
  assert.equal(audio.locations[0].deviceLabel, "主力 Windows 创作机");
  const blueprint = summary.artifacts.find((a) => a.fileKey === "EDIT_BLUEPRINT");
  assert.equal(blueprint.logicalStatus, "Missing");
  assert.equal(blueprint.physicalAvailability, "unknown", "no Local Agent observation must remain unverified");

  const dashboard = { projects: [{ projectId: "p1" }], activeProjects: [{ projectId: "p1" }], actions: [{ projectId: "p1", project: { projectId: "p1" } }] };
  Core.attachObservationSummaries(dashboard, { files, fileLocations: locations, devices });
  assert.equal(dashboard.projects[0].fileObservation.present, 1);
  assert.equal(dashboard.activeProjects[0].fileObservation.missing, 1);

  const productionUi = fs.readFileSync(path.join(__dirname, "..", "assets", "creator-file-observations.mjs"), "utf8");
  const productionApp = fs.readFileSync(path.join(__dirname, "..", "apps", "video-workspace", "production-system", "app.js"), "utf8");
  const creatorApi = fs.readFileSync(path.join(__dirname, "..", "supabase", "functions", "creator-project-api", "index.ts"), "utf8");
  const dashboardUi = fs.readFileSync(path.join(__dirname, "..", "assets", "creator-dashboard.mjs"), "utf8");

  // Files UX speaks in user-facing local-first terms, not database vocabulary.
  assert.match(productionApp, /GUCC 不是云盘/);
  assert.match(productionApp, /标准位置/);
  assert.match(productionApp, /项目状态/);
  assert.match(productionApp, /本机状态/);
  assert.match(productionUi, /✓ 已找到/);
  assert.match(productionUi, /⚠ 未找到/);
  assert.match(productionUi, /○ 尚未验证/);
  assert.match(productionUi, /上次存在，现在未找到/);

  // Case A/D/E: text import reads content into Project state and export is explicitly text-only.
  assert.match(productionApp, /TEXT_FILE_KINDS = new Set\(\["md", "json", "csv", "srt"\]\)/);
  assert.match(productionApp, /textArtifact \? await file\.text\(\) : ""/);
  assert.match(productionApp, /导入内容/);
  assert.match(productionApp, /内容已导入当前项目/);
  assert.match(productionApp, /导出文本/);
  assert.match(productionApp, /isTextArtifact\(key\) && file\.content/);
  assert.doesNotMatch(productionApp, />下载<\/button>/);

  // Case C: media registration stores metadata/status only; no browser media-byte upload path is introduced.
  assert.match(productionApp, /登记本地文件/);
  assert.match(productionApp, /不会上传音频 \/ 视频文件本体/);
  assert.match(productionApp, /文件信息已登记；未上传文件本体/);
  const chooseFileSource = productionApp.match(/async function chooseFile\(key\) \{[\s\S]*?\n  \}/)?.[0] || "";
  assert.match(chooseFileSource, /const content = textArtifact \? await file\.text\(\) : ""/);
  assert.doesNotMatch(chooseFileSource, /arrayBuffer\(\)|readAsDataURL|FormData|multipart\/form-data|base64/i);

  // Cloud sync persists full Project JSON (including imported lightweight text) while logical rows remain metadata-only.
  assert.match(creatorApi, /project_data: projectData/);
  assert.match(creatorApi, /function fileRows\([\s\S]*metadata: \{ notes:/);
  assert.doesNotMatch(creatorApi.match(/function fileRows\([\s\S]*?\n\}/)?.[0] || "", /content\s*:/);

  // Observed state stays a separate Local Agent / creator_file_locations fact and never mutates logical Ready.
  assert.match(productionUi, /Local Agent 已找到本机文件/);
  assert.match(productionUi, /不会自动把项目状态改为 Ready/);
  assert.match(dashboardUi, /物理文件/);
  assert.match(dashboardUi, /Local Agent/);
  assert.doesNotMatch(productionUi, /audioLock|pictureLock|saveProject|saveRelease/);

  console.log("Creator file observation UI tests passed.");
})().catch((error) => { console.error(error); process.exit(1); });
