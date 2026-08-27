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

const WAIT_MS = 2500;
const WAIT_ATTEMPTS = 120;

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function randomHex(bytes = 8) { return crypto.randomBytes(bytes).toString("hex"); }
function eventFor(events, type, fileKey) {
  return (events || []).filter((event) => event.event_type === type && event.detail?.fileKey === fileKey);
}
function fileRow(snapshot, key) { return (snapshot.files || []).find((file) => file.file_key === key); }
function locationRow(snapshot, logicalFile, deviceId) {
  return (snapshot.fileLocations || []).find((row) => row.logical_file_id === logicalFile.id && row.device_id === deviceId && (row.storage_provider || "local") === "local");
}

async function signUp(email, password) {
  const response = await fetch(`${Cloud.SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: Cloud.SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password, data: { gucc_smoke_test: true } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error_description || payload.error || `signup ${response.status}`);
  if (!payload.user?.id) throw new Error("Supabase signup did not return a user id");
  return payload;
}

async function awaitEnabledSession(email, password) {
  let lastError = null;
  for (let attempt = 1; attempt <= WAIT_ATTEMPTS; attempt += 1) {
    try {
      const session = await Cloud.passwordLogin(email, password);
      const client = new Cloud.CreatorCloudClient({ refreshToken: session.refresh_token });
      client.accessToken = session.access_token || "";
      await client.ping();
      return { session, client };
    } catch (error) {
      lastError = error;
      if (attempt === 1 || attempt % 12 === 0) {
        console.log(`SMOKE_WAITING_FOR_TEST_ACCOUNT attempt=${attempt} status=${error.status || 0}`);
      }
      await sleep(WAIT_MS);
    }
  }
  throw new Error(`Temporary smoke account was not enabled in time: ${lastError?.message || "unknown error"}`);
}

async function runAgent(configPath) {
  const { stdout, stderr } = await execFileAsync(process.execPath, [
    path.join(ROOT, "scripts/creator-local-agent/index.cjs"), "--once", "--config", configPath,
  ], { cwd: ROOT, env: process.env, maxBuffer: 4 * 1024 * 1024 });
  if (stderr.trim()) process.stderr.write(stderr);
  const clean = stdout.split(/\r?\n/).filter((line) => !/refresh|token|password/i.test(line)).join("\n");
  console.log(clean);
  return stdout;
}

async function main() {
  const suffix = `${Date.now().toString(36)}_${randomHex(4)}`;
  const email = `gucc-smoke-${suffix}@gmail.com`;
  const password = `${randomHex(18)}Aa!7`;
  const projectId = `project_smoke_${suffix}`;
  const bootstrapDeviceId = `web_smoke_${randomHex(12)}`;
  const agentDeviceId = Core.stableDeviceId();
  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), "GUCC_SMOKE_TEST_"));
  const workspace = path.join(temp, "GUCC_SMOKE_TEST");
  const projectRoot = path.join(workspace, "TEST_SMOKE_CREATOR_PROJECT");
  const configPath = path.join(temp, "creator-agent.json");

  console.log(`SMOKE_EMAIL=${email}`);
  const signup = await signUp(email, password);
  console.log(`SMOKE_USER_ID=${signup.user.id}`);
  console.log("SMOKE_ACTIVATION_REQUIRED=1");

  const { session, client } = await awaitEnabledSession(email, password);
  console.log("SMOKE_ACCOUNT_ENABLED=1");

  const project = Engine.createProject({
    projectId,
    name: "TEST / SMOKE Creator Project",
    game: "TEST",
    topic: "Phase 2A.2 Production Smoke",
  });
  assert.equal(project.projectType, "STANDARD_VIDEO");
  assert.equal(project.currentState, "IDEA");
  assert.equal(project.locks.audioLock, false);
  assert.equal(project.locks.pictureLock, false);

  await client.api("saveProject", {
    projectData: project,
    baseRevision: 0,
    deviceId: bootstrapDeviceId,
    device: { deviceId: bootstrapDeviceId, label: "GUCC Smoke Bootstrap", deviceKind: "web", platform: "github-actions-smoke" },
  });
  console.log(`SMOKE_PROJECT_ID=${projectId}`);

  await fsp.mkdir(path.join(projectRoot, "00_CONTROL"), { recursive: true });
  await fsp.mkdir(path.join(projectRoot, "03_AUDIO"), { recursive: true });
  await fsp.mkdir(path.join(projectRoot, "04_SUBTITLES"), { recursive: true });
  await fsp.mkdir(path.join(projectRoot, "09_FINAL"), { recursive: true });
  await fsp.writeFile(path.join(projectRoot, "00_CONTROL", "PROJECT_DATA.json"), Engine.projectDataJson(project));
  const audioPath = path.join(projectRoot, "03_AUDIO", "AUDIO_MASTER.wav");
  const subtitlePath = path.join(projectRoot, "04_SUBTITLES", "SUBTITLE_MASTER.srt");
  const videoPath = path.join(projectRoot, "09_FINAL", "VIDEO_V1.mp4");
  await fsp.writeFile(audioPath, Buffer.from("GUCC phase2a2 smoke audio v1\n"));
  await fsp.writeFile(subtitlePath, "1\n00:00:00,000 --> 00:00:01,000\nGUCC Phase 2A.2 smoke\n");
  await fsp.writeFile(videoPath, Buffer.from("GUCC smoke video metadata only\n"));

  const validated = await Core.validateWorkspaceRoot(workspace);
  await Core.saveConfig({
    deviceId: agentDeviceId,
    label: "GUCC Phase2A2 Smoke Agent",
    workspaceRoot: validated.root,
    workspaceRealRoot: validated.realRoot,
    email,
    refreshToken: session.refresh_token,
    lastSync: null,
  }, configPath);
  console.log(`SMOKE_AGENT_DEVICE_ID=${agentDeviceId}`);

  await runAgent(configPath);
  let snapshot = await client.getProject(projectId);
  const audioFile = fileRow(snapshot, "AUDIO_MASTER");
  const subtitleFile = fileRow(snapshot, "SUBTITLE_MASTER");
  const videoFile = fileRow(snapshot, "VIDEO_V1");
  assert(audioFile && subtitleFile && videoFile);
  const audioLocation1 = locationRow(snapshot, audioFile, agentDeviceId);
  const subtitleLocation1 = locationRow(snapshot, subtitleFile, agentDeviceId);
  const videoLocation1 = locationRow(snapshot, videoFile, agentDeviceId);
  for (const [location, expectedPath] of [
    [audioLocation1, "03_AUDIO/AUDIO_MASTER.wav"],
    [subtitleLocation1, "04_SUBTITLES/SUBTITLE_MASTER.srt"],
    [videoLocation1, "09_FINAL/VIDEO_V1.mp4"],
  ]) {
    assert(location);
    assert.equal(location.availability, "present");
    assert.equal(location.relative_path, expectedPath);
    assert(Number(location.size_bytes) > 0);
    assert.match(String(location.checksum || ""), /^sha256:[a-f0-9]{64}$/);
    assert(location.observed_at);
    assert(location.file_modified_at);
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
  const replaced = locationRow(snapshot, audioFile, agentDeviceId);
  assert.notEqual(replaced.checksum, beforeChecksum);
  assert.equal(eventFor(snapshot.events, "FILE_REPLACED", "AUDIO_MASTER").length, 1);

  const fileEventCountBefore = (snapshot.events || []).filter((event) => String(event.event_type || "").startsWith("FILE_")).length;
  await runAgent(configPath);
  await runAgent(configPath);
  snapshot = await client.getProject(projectId);
  const fileEvents = (snapshot.events || []).filter((event) => String(event.event_type || "").startsWith("FILE_"));
  assert.equal(fileEvents.length, fileEventCountBefore);
  assert.equal(fileEvents.some((event) => ["FILE_PRESENT", "FILE_SCANNED", "FILE_LOCATION_UPDATED"].includes(event.event_type)), false);

  assert.equal(snapshot.project.current_state, "IDEA");
  assert.equal(snapshot.project.locks.audioLock, false);
  assert.equal(snapshot.project.locks.pictureLock, false);

  console.log(`SMOKE_FILE_EVENTS=${fileEvents.map((event) => `${event.event_type}:${event.detail?.fileKey || ""}`).join(",")}`);
  console.log("SMOKE_PASS=1");
  console.log("SMOKE_CLEANUP_NOTE=Production test rows intentionally retained for connector readback; clean by exact project/user ids after verification.");

  await fsp.rm(temp, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(`SMOKE_FAIL=${error.stack || error.message || error}`);
  process.exit(1);
});
