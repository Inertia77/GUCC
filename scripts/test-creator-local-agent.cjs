"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const fsp = fs.promises;
const os = require("node:os");
const path = require("node:path");
const Core = require("./creator-local-agent/core.cjs");

(async () => {
  const temp = await fsp.mkdtemp(path.join(os.tmpdir(), "gucc-agent-test-"));
  const workspace = path.join(temp, "workspace");
  await fsp.mkdir(workspace, { recursive: true });

  const stable = Core.stableDeviceId();
  assert.match(stable, /^agent_[a-f0-9]{32}$/);
  assert.equal(Core.stableDeviceId(stable), stable);

  const validRoot = await Core.validateWorkspaceRoot(workspace);
  assert.equal(validRoot.root, path.resolve(workspace));
  await assert.rejects(() => Core.validateWorkspaceRoot(path.join(temp, "missing")), /does not exist/);

  async function createProject(folder, projectId, options = {}) {
    const root = path.join(workspace, folder);
    await fsp.mkdir(path.join(root, "00_CONTROL"), { recursive: true });
    const data = { projectId, name: options.name || folder, game: "TEST", currentState: "AUDIO_PRODUCTION", files: {} };
    if (options.noProjectId) delete data.projectId;
    await fsp.writeFile(path.join(root, "00_CONTROL", "PROJECT_DATA.json"), options.raw || JSON.stringify(data));
    return root;
  }

  const p1 = await createProject("TEST_Project_A", "project_test_a", { name: "TEST A" });
  let discovery = await Core.discoverProjects(workspace);
  assert.deepEqual(discovery.projects.map((p) => p.projectId), ["project_test_a"]);

  await createProject("TEST_No_ID", "ignored", { noProjectId: true });
  discovery = await Core.discoverProjects(workspace);
  assert.equal(discovery.projects.some((p) => p.projectRoot.endsWith("TEST_No_ID")), false);
  assert(discovery.warnings.some((w) => /missing projectId/.test(w)));

  await createProject("TEST_Broken", "ignored", { raw: "{broken" });
  discovery = await Core.discoverProjects(workspace);
  assert(discovery.warnings.some((w) => /Broken PROJECT_DATA/.test(w)));

  await createProject("TEST_Dup_1", "project_dup");
  await createProject("TEST_Dup_2", "project_dup");
  discovery = await Core.discoverProjects(workspace);
  assert(discovery.duplicateIds.includes("project_dup"));
  assert.equal(discovery.projects.some((p) => p.projectId === "project_dup"), false);

  await fsp.mkdir(path.join(p1, "03_AUDIO"), { recursive: true });
  await fsp.mkdir(path.join(p1, "04_SUBTITLES"), { recursive: true });
  await fsp.mkdir(path.join(p1, "05_ASSETS", "GAMEPLAY"), { recursive: true });
  await fsp.writeFile(path.join(p1, "03_AUDIO", "AUDIO_MASTER.wav"), Buffer.from("audio-v1"));
  await fsp.writeFile(path.join(p1, "04_SUBTITLES", "SUBTITLE_MASTER.srt"), "1\n00:00:00,000 --> 00:00:01,000\nTEST\n");
  await fsp.writeFile(path.join(p1, "05_ASSETS", "GAMEPLAY", "huge-raw.mp4"), Buffer.alloc(1024));

  const project = (await Core.discoverProjects(workspace)).projects.find((p) => p.projectId === "project_test_a");
  const logicalFiles = [
    { id: "lf-audio", file_key: "AUDIO_MASTER", relative_path: "03_AUDIO/AUDIO_MASTER.wav" },
    { id: "lf-sub", file_key: "SUBTITLE_MASTER", relative_path: "04_SUBTITLES/SUBTITLE_MASTER.srt" },
    { id: "lf-video", file_key: "VIDEO_V1", relative_path: "09_FINAL/VIDEO_V1.mp4" },
  ];
  const cache = { version: 1, files: {} };

  let observed = await Core.observeProject({ workspaceRealRoot: validRoot.realRoot, project, logicalFiles, cache });
  assert.deepEqual(observed.observations.map((o) => o.fileKey), ["AUDIO_MASTER", "SUBTITLE_MASTER", "VIDEO_V1"]);
  assert.equal(JSON.stringify(observed).includes("huge-raw.mp4"), false);

  const audio = observed.observations.find((o) => o.fileKey === "AUDIO_MASTER");
  assert.equal(audio.availability, "present");
  assert.equal(audio.relativePath, "03_AUDIO/AUDIO_MASTER.wav");
  assert.equal(audio.filename, "AUDIO_MASTER.wav");
  assert.equal(audio.mimeType, "audio/wav");
  assert(audio.sizeBytes > 0);
  assert.match(audio.checksum, /^sha256:[a-f0-9]{64}$/);
  assert(audio.fileModifiedAt && audio.observedAt);

  const video = observed.observations.find((o) => o.fileKey === "VIDEO_V1");
  assert.equal(video.availability, "unknown");

  await fsp.rm(path.join(p1, "03_AUDIO", "AUDIO_MASTER.wav"));
  observed = await Core.observeProject({
    workspaceRealRoot: validRoot.realRoot, project, logicalFiles: [logicalFiles[0]], cache,
    previousLocations: [{ logical_file_id: "lf-audio", relative_path: "03_AUDIO/AUDIO_MASTER.wav", availability: "present", size_bytes: audio.sizeBytes, checksum: audio.checksum }],
  });
  assert.equal(observed.observations[0].availability, "missing");

  assert.equal(Core.normalizeRelativePath("03_AUDIO\\AUDIO_MASTER.wav"), "03_AUDIO/AUDIO_MASTER.wav");
  assert.throws(() => Core.normalizeRelativePath("C:\\Secret\\file.wav"), /absolute path/);
  assert.throws(() => Core.normalizeRelativePath("../Secret/file.wav"), /traversal/);
  assert.throws(() => Core.normalizeRelativePath("03_AUDIO/../../Secret/file.wav"), /traversal/);

  if (process.platform !== "win32") {
    const outside = path.join(temp, "outside.wav");
    await fsp.writeFile(outside, "outside");
    const link = path.join(p1, "03_AUDIO", "AUDIO_MASTER.wav");
    await fsp.symlink(outside, link);
    const symlinkObs = await Core.observeProject({ workspaceRealRoot: validRoot.realRoot, project, logicalFiles: [logicalFiles[0]], cache: { files: {} } });
    assert.equal(symlinkObs.observations.length, 0);
    assert(symlinkObs.errors.some((e) => /Symlink|outside/.test(e.error)));
    await fsp.rm(link);
  }

  const audioPath = path.join(p1, "03_AUDIO", "AUDIO_MASTER.wav");
  await fsp.writeFile(audioPath, "hash-v1");
  let hashCalls = 0;
  const hashFile = async (file) => { hashCalls += 1; return `sha256:${crypto.createHash("sha256").update(await fsp.readFile(file)).digest("hex")}`; };
  const hashCache = { files: {} };
  const firstHash = await Core.observeLogicalArtifact({ workspaceRealRoot: validRoot.realRoot, project, logicalFile: logicalFiles[0], cache: hashCache, hashFile });
  assert.equal(hashCalls, 1); assert.equal(firstHash.rehashed, true);
  const secondHash = await Core.observeLogicalArtifact({ workspaceRealRoot: validRoot.realRoot, project, logicalFile: logicalFiles[0], cache: hashCache, hashFile });
  assert.equal(hashCalls, 1); assert.equal(secondHash.metadata.hashStrategy, "cache-reuse");
  await new Promise((r) => setTimeout(r, 15));
  await fsp.writeFile(audioPath, "hash-v2-changed");
  const thirdHash = await Core.observeLogicalArtifact({ workspaceRealRoot: validRoot.realRoot, project, logicalFile: logicalFiles[0], cache: hashCache, hashFile });
  assert.equal(hashCalls, 2); assert.equal(thirdHash.rehashed, true);

  const largeNoHash = await Core.observeLogicalArtifact({ workspaceRealRoot: validRoot.realRoot, project, logicalFile: logicalFiles[0], cache: { files: {} }, hashLimitBytes: 1, hashFile });
  assert.equal(largeNoHash.checksum, null); assert.equal(largeNoHash.metadata.hashStrategy, "skipped-large");

  let debouncedCalls = 0;
  const scheduler = Core.createDebouncedScheduler(async () => { debouncedCalls += 1; }, 30);
  scheduler.schedule("same"); scheduler.schedule("same"); scheduler.schedule("same");
  assert.equal(scheduler.pending(), 1);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(debouncedCalls, 1);
  scheduler.cancelAll();

  const agentIndex = await fsp.readFile(path.join(__dirname, "creator-local-agent", "index.cjs"), "utf8");
  const cloud = await fsp.readFile(path.join(__dirname, "creator-local-agent", "cloud.cjs"), "utf8");
  const agentCore = await fsp.readFile(path.join(__dirname, "creator-local-agent", "core.cjs"), "utf8");
  const edgePath = path.join(__dirname, "..", "supabase", "functions", "creator-project-api", "index.ts");
  const edge = fs.existsSync(edgePath) ? await fsp.readFile(edgePath, "utf8") : "";
  const observationRpcPath = path.join(__dirname, "..", "supabase", "migrations", "20260827110000_creator_local_file_observation_rpc.sql");
  const observationRpc = fs.existsSync(observationRpcPath) ? await fsp.readFile(observationRpcPath, "utf8") : "";

  for (const source of [agentIndex, cloud, agentCore]) assert.doesNotMatch(source, /base64|multipart\/form-data|formData\(|arrayBuffer\(/i);
  assert.doesNotMatch(cloud, /readFile|createReadStream/);
  assert.doesNotMatch(`${agentIndex}\n${cloud}\n${agentCore}`, /service[_ -]?role/i);

  assert.match(cloud, /registerDevice/); assert.match(cloud, /saveFileLocationsBatch/);
  if (edge) {
    assert.match(edge, /action === "getDevice"/);
    assert.match(edge, /action === "registerDevice"/);
    assert.match(edge, /action === "saveFileLocationsBatch"/);
    assert.match(edge, /MAX_LOCATION_BATCH = 100/);
    for (const event of ["FILE_FIRST_SEEN", "FILE_DISAPPEARED", "FILE_REAPPEARED", "FILE_REPLACED"]) assert.match(edge, new RegExp(event));
    assert.doesNotMatch(edge, /FILE_SCANNED|FILE_LOCATION_UPDATED/);
    assert.match(edge, /workspace-relative, not absolute/);
    assert.match(edge, /Local observation path must match logical artifact contract/);
    assert.match(edge, /project\.projectType \|\| "STANDARD_VIDEO"/);
    assert.match(edge, /rpc\/save_creator_file_location_observation/);
  }
  if (observationRpc) {
    assert.match(observationRpc, /security invoker/i);
    assert.match(observationRpc, /insert into public\.creator_file_locations/i);
    assert.match(observationRpc, /insert into public\.creator_project_events/i);
    assert.match(observationRpc, /revoke all on function public\.save_creator_file_location_observation[\s\S]*from public, anon, authenticated/i);
    assert.match(observationRpc, /grant execute on function public\.save_creator_file_location_observation[\s\S]*to service_role/i);
  }

  assert.doesNotMatch(`${agentIndex}\n${agentCore}\n${cloud}`, /audioLock|pictureLock|contentLock|scriptLock/);
  assert.doesNotMatch(cloud, /saveProject|saveRelease/);

  const parentDirs = Core.parentDirsForLogicalFiles(p1, [
    ...logicalFiles,
    { id: "raw", file_key: "RAW_TEST", relative_path: "05_ASSETS/GAMEPLAY/raw.mp4" },
  ]);
  assert.equal(parentDirs.some((dir) => dir.includes(`${path.sep}05_ASSETS${path.sep}`)), false);

  await fsp.rm(temp, { recursive: true, force: true });
  console.log("Creator Local Agent Phase 2A.2 tests passed.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
