#!/usr/bin/env node
"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = fs.promises;
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const ROOT = path.resolve(__dirname, "..");
const Engine = require(path.join(ROOT, "apps/video-workspace/production-system/engine.js"));
const Core = require(path.join(ROOT, "scripts/creator-local-agent/core.cjs"));
const Cloud = require(path.join(ROOT, "scripts/creator-local-agent/cloud.cjs"));
const execFileAsync = promisify(execFile);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const eventFor = (events, type, fileKey) => (events || []).filter((event) => event.event_type === type && event.detail?.fileKey === fileKey);
const fileRow = (snapshot, key) => (snapshot.files || []).find((file) => file.file_key === key);
const locationRow = (snapshot, logicalFile, deviceId) => (snapshot.fileLocations || []).find((row) => row.logical_file_id === logicalFile.id && row.device_id === deviceId && (row.storage_provider || "local") === "local");

async function createAnonymousSession() {
  const response = await fetch(`${Cloud.SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: Cloud.SUPABASE_ANON_KEY },
    body: JSON.stringify({ data: { gucc_smoke_test: true, purpose: "phase2a2-production-smoke" } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error_description || payload.error || `anonymous signup ${response.status}`);
  const user = payload.user?.id ? payload.user : payload.id ? payload : null;
  const accessToken = payload.access_token || payload.session?.access_token || "";
  const refreshToken = payload.refresh_token || payload.session?.refresh_token || "";
  if (!user?.id || !accessToken || !refreshToken) throw new Error(`Anonymous signup returned incomplete session; keys=${Object.keys(payload).sort().join(",")}`);
  return { user, accessToken, refreshToken };
}

async function awaitAppUser(client) {
  let lastError = null;
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    try { return await client.ping(); }
    catch (error) {
      lastError = error;
      if (attempt === 1 || attempt % 12 === 0) console.log(`SMOKE_WAITING_FOR_APP_USER attempt=${attempt} status=${error.status || 0}`);
      await sleep(2500);
    }
  }
  throw new Error(`Temporary smoke app_user was not enabled: ${lastError?.message || "unknown"}`);
}

async function runAgent(configPath) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [path.join(ROOT, "scripts/creator-local-agent/index.cjs"), "--once", "--config", configPath], {
    cwd: ROOT, env: process.env, maxBuffer: 4 * 1024 * 1024,
  });
  if (stderr.trim()) process.stderr.write(stderr);
  console.log(stdout.split(/\r?\n/).filter((line) => !/refresh|token|password/i.test(line)).join("\n"));
}

async function main() {
  const runSha = String(process.env.GITHUB_SHA || crypto.createHash("sha256").update(String(Date.now())).digest("hex")).toLowerCase();
  const suffix = runSha.slice(0, 12);
  const projectId = `project_smoke_${suffix}`;
  const bootstrapDeviceId = `web_smoke_${suffix}`;
  const agentDeviceId = Core.stableDeviceId();
  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), "GUCC_SMOKE_TEST_"));
  const workspace = path.join(temp, "GUCC_SMOKE_TEST");
  const projectRoot = path.join(workspace, "TEST_SMOKE_CREATOR_PROJECT");
  const configPath = path.join(temp, "creator-agent.json");

  const session = await createAnonymousSession();
  console.log(`SMOKE_USER_ID=${session.user.id}`);
  console.log("SMOKE_APP_USER_REQUIRED=1");
  const client = new Cloud.CreatorCloudClient({ refreshToken: session.refreshToken });
  client.accessToken = session.accessToken;
  await awaitAppUser(client);
  console.log("SMOKE_ACCOUNT_ENABLED=1");

  const project = Engine.createProject({ projectId, name: "TEST / SMOKE Creator Project", game: "TEST", topic: "Phase 2A.2 Production Smoke" });
  assert.equal(project.projectType, "STANDARD_VIDEO");
  assert.equal(project.currentState, "IDEA");
  assert.equal(project.locks.audioLock, false);
  assert.equal(project.locks.pictureLock, false);
  await client.api("saveProject", {
    projectData: project, baseRevision: 0, deviceId: bootstrapDeviceId,
    device: { deviceId: bootstrapDeviceId, label: "GUCC Smoke Bootstrap", deviceKind: "web", platform: "github-actions-smoke" },
  });
  console.log(`SMOKE_PROJECT_ID=${projectId}`);

  for (const dir of ["00_CONTROL", "03_AUDIO", "04_SUBTITLES", "09_FINAL"]) await fsp.mkdir(path.join(projectRoot, dir), { recursive: true });
  await fsp.writeFile(path.join(projectRoot, "00_CONTROL", "PROJECT_DATA.json"), Engine.projectDataJson(project));
  const audioPath = path.join(projectRoot, "03_AUDIO", "AUDIO_MASTER.wav");
  const subtitlePath = path.join(projectRoot, "04_SUBTITLES", "SUBTITLE_MASTER.srt");
  const videoPath = path.join(projectRoot, "09_FINAL", "VIDEO_V1.mp4");
  await fsp.writeFile(audioPath, Buffer.from("GUCC phase2a2 smoke audio v1\n"));
  await fsp.writeFile(subtitlePath, "1\n00:00:00,000 --> 00:00:01,000\nGUCC Phase 2A.2 smoke\n");
  await fsp.writeFile(videoPath, Buffer.from("GUCC smoke video metadata only\n"));

  const validated = await Core.validateWorkspaceRoot(workspace);
  await Core.saveConfig({ deviceId: agentDeviceId, label: "GUCC Phase2A2 Smoke Agent", workspaceRoot: validated.root, workspaceRealRoot: validated.realRoot, email: "", refreshToken: session.refreshToken, lastSync: null }, configPath);
  console.log(`SMOKE_AGENT_DEVICE_ID=${agentDeviceId}`);

  await runAgent(configPath);
  let snapshot = await client.getProject(projectId);
  const audioFile = fileRow(snapshot, "AUDIO_MASTER");
  const subtitleFile = fileRow(snapshot, "SUBTITLE_MASTER");
  const videoFile = fileRow(snapshot, "VIDEO_V1");
  assert(audioFile && subtitleFile && videoFile);
  for (const [logical, expectedPath] of [[audioFile, "03_AUDIO/AUDIO_MASTER.wav"], [subtitleFile, "04_SUBTITLES/SUBTITLE_MASTER.srt"], [videoFile, "09_FINAL/VIDEO_V1.mp4"]]) {
    const location = locationRow(snapshot, logical, agentDeviceId);
    assert(location);
    assert.equal(location.availability, "present");
    assert.equal(location.relative_path, expectedPath);
    assert(Number(location.size_bytes) > 0);
    assert.match(String(location.checksum || ""), /^sha256:[a-f0-9]{64}$/);
    assert(location.observed_at && location.file_modified_at);
  }
  const agentDevice = (snapshot.devices || []).find((device) => device.device_id === agentDeviceId);
  assert(agentDevice);
  assert.equal(agentDevice.device_kind, "agent");
  assert.equal(path.resolve(agentDevice.workspace_root), path.resolve(workspace));
  assert(agentDevice.last_seen_at);
  assert.equal(eventFor(snapshot.events, "FILE_FIRST_SEEN", "AUDIO_MASTER").length, 1);
  assert.equal(eventFor(snapshot.events, "FILE_FIRST_SEEN", "SUBTITLE_MASTER").length, 1);
  assert.equal(snapshot.project.current_state, "IDEA");
  assert.equal(snapshot.project.locks.audioLock, false);
  assert.equal(snapshot.project.locks.pictureLock, false);

  await fsp.rm(audioPath);
  await runAgent(configPath);
  snapshot = await client.getProject(projectId);
  assert.equal(locationRow(snapshot, audioFile, agentDeviceId).availability, "missing");
  assert.equal(eventFor(snapshot.events, "FILE_DISAPPEARED", "AUDIO_MASTER").length, 1);

  await fsp.writeFile(audioPath, Buffer.from("GUCC phase2a2 smoke audio v1\n"));
  await runAgent(configPath);
  snapshot = await client.getProject(projectId);
  assert.equal(locationRow(snapshot, audioFile, agentDeviceId).availability, "present");
  assert.equal(eventFor(snapshot.events, "FILE_REAPPEARED", "AUDIO_MASTER").length, 1);

  const beforeChecksum = locationRow(snapshot, audioFile, agentDeviceId).checksum;
  await sleep(25);
  await fsp.writeFile(audioPath, Buffer.from("GUCC phase2a2 smoke audio v2 replaced\n"));
  await runAgent(configPath);
  snapshot = await client.getProject(projectId);
  assert.notEqual(locationRow(snapshot, audioFile, agentDeviceId).checksum, beforeChecksum);
  assert.equal(eventFor(snapshot.events, "FILE_REPLACED", "AUDIO_MASTER").length, 1);

  const eventCount = (snapshot.events || []).filter((event) => String(event.event_type || "").startsWith("FILE_")).length;
  await runAgent(configPath);
  await runAgent(configPath);
  snapshot = await client.getProject(projectId);
  const fileEvents = (snapshot.events || []).filter((event) => String(event.event_type || "").startsWith("FILE_"));
  assert.equal(fileEvents.length, eventCount);
  assert.equal(fileEvents.some((event) => ["FILE_PRESENT", "FILE_SCANNED", "FILE_LOCATION_UPDATED"].includes(event.event_type)), false);
  assert.equal(snapshot.project.current_state, "IDEA");
  assert.equal(snapshot.project.locks.audioLock, false);
  assert.equal(snapshot.project.locks.pictureLock, false);

  console.log(`SMOKE_FILE_EVENTS=${fileEvents.map((event) => `${event.event_type}:${event.detail?.fileKey || ""}`).join(",")}`);
  console.log("SMOKE_PASS=1");
  console.log("SMOKE_CLEANUP_NOTE=Production TEST rows retained only for connector readback; delete by exact project/user ids after verification.");
  await fsp.rm(temp, { recursive: true, force: true });
}

main().catch((error) => { console.error(`SMOKE_FAIL=${error.stack || error.message || error}`); process.exit(1); });
