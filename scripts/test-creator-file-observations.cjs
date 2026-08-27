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
  ];
  const locations = [
    { logical_file_id: "f1", project_id: "p1", device_id: "agent_win", availability: "present", relative_path: "03_AUDIO/AUDIO_MASTER.wav", size_bytes: 123, observed_at: "2026-08-27T00:00:00Z" },
    { logical_file_id: "f2", project_id: "p1", device_id: "agent_win", availability: "missing", relative_path: "09_FINAL/VIDEO_V1.mp4", observed_at: "2026-08-27T00:00:00Z" },
  ];
  const devices = [{ device_id: "agent_win", label: "主力 Windows 创作机" }];
  const summary = Core.buildObservationSummary(files, locations, devices);
  assert.equal(summary.present, 1);
  assert.equal(summary.missing, 1);
  assert.equal(summary.unknown, 0);
  const audio = summary.artifacts.find((a) => a.fileKey === "AUDIO_MASTER");
  assert.equal(audio.logicalStatus, "Missing", "physical observation must not mutate logical artifact status");
  assert.equal(audio.physicalAvailability, "present");
  assert.equal(audio.locations[0].deviceLabel, "主力 Windows 创作机");

  const dashboard = { projects: [{ projectId: "p1" }], activeProjects: [{ projectId: "p1" }], actions: [{ projectId: "p1", project: { projectId: "p1" } }] };
  Core.attachObservationSummaries(dashboard, { files, fileLocations: locations, devices });
  assert.equal(dashboard.projects[0].fileObservation.present, 1);
  assert.equal(dashboard.activeProjects[0].fileObservation.missing, 1);

  const productionUi = fs.readFileSync(path.join(__dirname, "..", "assets", "creator-file-observations.mjs"), "utf8");
  const dashboardUi = fs.readFileSync(path.join(__dirname, "..", "assets", "creator-dashboard.mjs"), "utf8");
  assert.match(productionUi, /<strong>Expected<\/strong>/);
  assert.match(productionUi, /<strong>Observed<\/strong>/);
  assert.match(productionUi, /尚未由 Local Agent 验证/);
  assert.match(productionUi, /上次存在，现在未找到/);
  assert.match(dashboardUi, /物理文件/);
  assert.match(dashboardUi, /Local Agent/);
  assert.doesNotMatch(productionUi, /audioLock|pictureLock|saveProject|saveRelease/);

  console.log("Creator file observation UI tests passed.");
})().catch((error) => { console.error(error); process.exit(1); });
