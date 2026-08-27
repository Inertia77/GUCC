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

const WAIT_MS = 2000;
const WAIT_ATTEMPTS = 150;
const SMOKE_USER_ID = "4eca9371-dd6e-4d84-95b6-324728313653";
const SMOKE_EMAIL = "gucc-smoke-mtb9x097_1269a527@outlook.com";

function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function randomHex(bytes = 8) { return crypto.randomBytes(bytes).toString("hex"); }
function smokePassword() {
  const sha = String(process.env.GITHUB_SHA || "").trim();
  if (!/^[a-f0-9]{40}$/i.test(sha)) throw new Error("GITHUB_SHA is required for isolated production smoke authentication");
  return `${crypto.createHash("sha256").update(`gucc-phase2a2:${sha}:${SMOKE_USER_ID}`).digest("hex")}Aa!7`;
}
function eventFor(events, type, fileKey) {
  return (events || []).filter((event) => event.event_type === type && event.detail?.fileKey === fileKey);
}
function fileRow(snapshot, key) { return (snapshot.files || []).find((file) => file.file_key === key); }
function locationRow(snapshot, logicalFile, deviceId) {
  return (snapshot.fileLocations || []).find((row) => row.logical_file_id === logicalFile.id && row.device_id === deviceId && (row.storage_provider || "local") === "local");
}
function fileEventCount(snapshot) {
  return (snapshot.events || []).filter((event) => String(event.event_type || "").startsWith("FILE_")).length;
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
      if (attempt === 1 || attempt % 10 === 0) console.log(`SMOKE_WAITING_FOR_TEST_ACCOUNT attempt=${attempt} status=${error.status || 0}`);
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
  const clean = stdout.split(/\r?\n/).filter((line) => !/refresh|token|password|authorization/i.test(line)).join("\n");
  console.log(clean);
  return stdout;
}

async function main() {
  assert.equal(process.platform, "win32", "Production smoke must run on a Windows runner");
  const suffix = `${Date.now().toString(36)}_${randomHex(4)}`;
  const email = SMOKE_EMAIL;
  const password = smokePassword();
  const projectId = `project_smoke_${suffix}`;
  const bootstrapDeviceId = `web_smoke_${randomHex(12)}`;
  const agentDeviceId = Core.stableDeviceId();
  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), "GUCC_LocalAgent_Smoke_"));
  const workspace = path.join(temp, "GUCC_ACTIVE");
  const projectRoot = path.join(workspace, `GUCC_LocalAgent_Smoke_${suffix.slice(-8)}`);
  const configPath = path.join(temp, "creator-agent.json");

  console.log(`SMOKE_EMAIL=${email}`);
  console.log(`SMOKE_USER_ID=${SMOKE_USER_ID}`);
  console.log(`SMOKE_CREDENTIAL_SHA=${process.env.GITHUB_SHA}`);

  let session;
  let client;
  try {
    ({ session, client } = await awaitEnabledSession(email, password));
    console.log("SMOKE_ACCOUNT_ENABLED=1");

    const project = Engine.createProject({
      projectId,
      name: "GUCC Local Agent Smoke Test",
      game: "TEST",
      topic: "Phase 2A.2 Windows Production Smoke",
    });
    assert.equal(project.projectType, "STANDARD_VIDEO");
    assert.equal(project.currentState, "IDEA");
    assert.equal(project.locks.audioLock, false);
    assert.equal(project.locks.pictureLock, false);

    await client.api("saveProject", {
      projectData: project,
      baseRevision: 0,
      deviceId: bootstrapDeviceId,
      device: { deviceId: bootstrapDeviceId, label: "GUCC Smoke Bootstrap", deviceKind: "web", platform: "github-actions/windows" },
    });
    console.log(`SMOKE_PROJECT_ID=${projectId}`);

    await fsp.mkdir(path.join(projectRoot, "00_CONTROL"), { recursive: true });
    await fsp.mkdir(path.join(projectRoot, "03_AUDIO"), { recursive: true });
    await fsp.mkdir(path.join(projectRoot, "04_SUBTITLES"), { recursive: true });
    await fsp.mkdir(path.join(projectRoot, "09_FINAL"), { recursive: true });
    await fsp.writeFile(path.join(projectRoot, "00_CONTROL", "PROJECT_DATA.json"), Engine.projectDataJson(project), "utf8");
    const audioPath = path.join(projectRoot, "03_AUDIO", "AUDIO_MASTER.wav");
    const subtitlePath = path.join(projectRoot, "04_SUBTITLES", "SUBTITLE_MASTER.srt");
    const videoPath = path.join(projectRoot, "09_FINAL", "VIDEO_V1.mp4");
    const audioV1 = Buffer.from("GUCC phase2a2 smoke audio v1 fixture\n");
    await fsp.writeFile(audioPath, audioV1);
    await fsp.writeFile(subtitlePath, "1\r\n00:00:00,000 --> 00:00:01,000\r\nGUCC Phase 2A.2 smoke\r\n", "utf8");
    await fsp.writeFile(videoPath, Buffer.from("GUCC VIDEO_V1 local fixture; observation only\n"));

    const validated = await Core.validateWorkspaceRoot(workspace);
    await Core.saveConfig({
      deviceId: agentDeviceId,
      label: "GUCC Windows Smoke Agent",
      workspaceRoot: validated.root,
      workspaceRealRoot: validated.realRoot,
      email,
      refreshToken: session.refresh_token,
      lastSync: null,
    }, configPath);
    console.log(`SMOKE_AGENT_DEVICE_ID=${agentDeviceId}`);
    console.log(`SMOKE_PLATFORM=${process.platform}/${process.arch} Node ${process.versions.node}`);

    // 1) First real Windows Local Agent scan: present + metadata.
    await runAgent(configPath);
    let snapshot = await client.getProject(projectId);
    const audioFile = fileRow(snapshot, "AUDIO_MASTER");
    const subtitleFile = fileRow(snapshot, "SUBTITLE_MASTER");
    const videoFile = fileRow(snapshot, "VIDEO_V1");
    assert(audioFile && subtitleFile && videoFile);
    for (const [logical, expectedPath] of [
      [audioFile, "03_AUDIO/AUDIO_MASTER.wav"],
      [subtitleFile, "04_SUBTITLES/SUBTITLE_MASTER.srt"],
      [videoFile, "09_FINAL/VIDEO_V1.mp4"],
    ]) {
      const location = locationRow(snapshot, logical, agentDeviceId);
      assert(location, `${logical.file_key} location missing`);
      assert.equal(location.availability, "present");
      assert.equal(location.relative_path, expectedPath);
      assert.equal(/^[A-Za-z]:[\\/]/.test(location.relative_path), false);
      assert(Number(location.size_bytes) > 0);
      assert.match(String(location.checksum || ""), /^sha256:[a-f0-9]{64}$/);
      assert(location.observed_at);
      assert(location.file_modified_at);
    }
    const agentDevice = (snapshot.devices || []).find((device) => device.device_id === agentDeviceId);
    assert(agentDevice);
    assert.equal(agentDevice.device_kind, "agent");
    assert.match(String(agentDevice.platform || ""), /^win32\//);
    assert.equal(path.resolve(agentDevice.workspace_root), path.resolve(workspace));
    assert(agentDevice.first_seen_at && agentDevice.last_seen_at);
    assert.equal(eventFor(snapshot.events, "FILE_FIRST_SEEN", "AUDIO_MASTER").length, 1);
    assert.equal(eventFor(snapshot.events, "FILE_FIRST_SEEN", "SUBTITLE_MASTER").length, 1);
    assert.equal(eventFor(snapshot.events, "FILE_FIRST_SEEN", "VIDEO_V1").length, 1);
    assert.equal(snapshot.project.current_state, "IDEA");
    assert.equal(snapshot.project.locks.audioLock, false);
    assert.equal(snapshot.project.locks.pictureLock, false);

    // 2) Repeat unchanged first state: no duplicate FIRST_SEEN.
    const afterFirst = fileEventCount(snapshot);
    await runAgent(configPath);
    snapshot = await client.getProject(projectId);
    assert.equal(fileEventCount(snapshot), afterFirst);

    // 3) Disappear and repeat missing.
    await fsp.rm(audioPath);
    await runAgent(configPath);
    snapshot = await client.getProject(projectId);
    assert.equal(locationRow(snapshot, audioFile, agentDeviceId).availability, "missing");
    assert.equal(eventFor(snapshot.events, "FILE_DISAPPEARED", "AUDIO_MASTER").length, 1);
    const afterDisappear = fileEventCount(snapshot);
    await runAgent(configPath);
    snapshot = await client.getProject(projectId);
    assert.equal(fileEventCount(snapshot), afterDisappear);

    // 4) Reappear and repeat present.
    await fsp.writeFile(audioPath, audioV1);
    await runAgent(configPath);
    snapshot = await client.getProject(projectId);
    assert.equal(locationRow(snapshot, audioFile, agentDeviceId).availability, "present");
    assert.equal(eventFor(snapshot.events, "FILE_REAPPEARED", "AUDIO_MASTER").length, 1);
    const afterReappear = fileEventCount(snapshot);
    await runAgent(configPath);
    snapshot = await client.getProject(projectId);
    assert.equal(fileEventCount(snapshot), afterReappear);

    // 5) Content replace -> checksum changes exactly once.
    const beforeChecksum = locationRow(snapshot, audioFile, agentDeviceId).checksum;
    await sleep(50);
    await fsp.writeFile(audioPath, Buffer.from("GUCC phase2a2 smoke audio v2 replacement with different bytes\n"));
    await runAgent(configPath);
    snapshot = await client.getProject(projectId);
    const replaced = locationRow(snapshot, audioFile, agentDeviceId);
    assert.notEqual(replaced.checksum, beforeChecksum);
    assert.equal(eventFor(snapshot.events, "FILE_REPLACED", "AUDIO_MASTER").length, 1);

    // 6) mtime-only change with identical bytes must not count as replacement.
    const sameBytes = await fsp.readFile(audioPath);
    const replaceCount = eventFor(snapshot.events, "FILE_REPLACED", "AUDIO_MASTER").length;
    const future = new Date(Date.now() + 5000);
    await fsp.utimes(audioPath, future, future);
    assert.deepEqual(await fsp.readFile(audioPath), sameBytes);
    await runAgent(configPath);
    snapshot = await client.getProject(projectId);
    assert.equal(eventFor(snapshot.events, "FILE_REPLACED", "AUDIO_MASTER").length, replaceCount);

    // 7) Final unchanged scan and human gate proof.
    const eventCountBeforeFinal = fileEventCount(snapshot);
    await runAgent(configPath);
    snapshot = await client.getProject(projectId);
    assert.equal(fileEventCount(snapshot), eventCountBeforeFinal);
    assert.equal(snapshot.project.current_state, "IDEA");
    assert.equal(snapshot.project.locks.contentLock, false);
    assert.equal(snapshot.project.locks.scriptLock, false);
    assert.equal(snapshot.project.locks.audioLock, false);
    assert.equal(snapshot.project.locks.pictureLock, false);

    const fileEvents = (snapshot.events || []).filter((event) => String(event.event_type || "").startsWith("FILE_"));
    assert.equal(fileEvents.some((event) => ["FILE_PRESENT", "FILE_SCANNED", "FILE_LOCATION_UPDATED"].includes(event.event_type)), false);
    console.log(`SMOKE_FILE_EVENTS=${fileEvents.map((event) => `${event.event_type}:${event.detail?.fileKey || ""}`).join(",")}`);
    console.log(`SMOKE_AUDIO_FINAL_CHECKSUM=${locationRow(snapshot, audioFile, agentDeviceId).checksum}`);
    console.log("SMOKE_LOCKS_UNCHANGED=1");
    console.log("SMOKE_NO_MEDIA_UPLOAD_PATH=1");
    console.log("SMOKE_PASS=1");
  } finally {
    await fsp.rm(temp, { recursive: true, force: true });
    console.log("SMOKE_LOCAL_FIXTURE_CLEANED=1");
  }
}

main().catch((error) => {
  console.error(`SMOKE_FAIL=${error.stack || error.message || error}`);
  process.exit(1);
});
