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

async function getBootstrapCredentials() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const publicDer = publicKey.export({ type: "spki", format: "der" });
  const runId = String(process.env.GITHUB_RUN_ID || Date.now());
  const payloadPath = `.github/smoke/phase2a2-${runId}.json`;
  console.log(`SMOKE_BOOTSTRAP_PATH=${payloadPath}`);
  console.log(`SMOKE_PUBLIC_KEY_DER_B64=${publicDer.toString("base64")}`);
  const token = String(process.env.GUCC_SMOKE_GITHUB_TOKEN || "");
  const branch = encodeURIComponent(String(process.env.GITHUB_REF_NAME || "feature/creator-os-phase-2b-archive"));
  const url = `https://api.github.com/repos/Inertia77/GUCC/contents/${payloadPath}?ref=${branch}`;
  for (let attempt = 1; attempt <= 90; attempt += 1) {
    const headers = { Accept: "application/vnd.github+json", "User-Agent": "GUCC-Phase2A2-Smoke" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, { headers });
    if (response.ok) {
      const remote = await response.json();
      const text = Buffer.from(String(remote.content || "").replace(/\n/g, ""), "base64").toString("utf8");
      const envelope = JSON.parse(text);
      const clear = crypto.privateDecrypt({ key: privateKey, oaepHash: "sha256", padding: crypto.constants.RSA_PKCS1_OAEP_PADDING }, Buffer.from(String(envelope.ciphertext || ""), "base64"));
      const credentials = JSON.parse(clear.toString("utf8"));
      if (!credentials.email || !credentials.password) throw new Error("Encrypted bootstrap payload is incomplete");
      console.log("SMOKE_BOOTSTRAP_RECEIVED=1");
      return credentials;
    }
    if (attempt === 1 || attempt % 10 === 0) console.log(`SMOKE_WAITING_FOR_BOOTSTRAP attempt=${attempt}`);
    await sleep(3000);
  }
  throw new Error("Encrypted smoke bootstrap payload was not supplied");
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

  const credentials = await getBootstrapCredentials();
  const auth = await Cloud.passwordLogin(credentials.email, credentials.password);
  const client = new Cloud.CreatorCloudClient({ refreshToken: auth.refresh_token });
  client.accessToken = auth.access_token || "";
  const ping = await client.ping();
  assert(ping?.user?.id);
  console.log(`SMOKE_USER_ID=${ping.user.id}`);
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
  await Core.saveConfig({ deviceId: agentDeviceId, label: "GUCC Phase2A2 Smoke Agent", workspaceRoot: validated.root, workspaceRealRoot: validated.realRoot, email: credentials.email, refreshToken: auth.refresh_token, lastSync: null }, configPath);
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
