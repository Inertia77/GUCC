const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

(async () => {
  const core = await import(pathToFileURL(path.resolve(__dirname, "../assets/creator-project-archive-core.mjs")));
  const safe = await import(pathToFileURL(path.resolve(__dirname, "../assets/creator-archive-safe-snapshot.mjs")));
  const input = {
    project: {
      project_id: "project_snapshot_test",
      name: "Archive Safe Test",
      game: "TEST",
      topic: "Snapshot",
      current_state: "PUBLISHED",
      revision: 7,
      project_data: {
        projectId: "project_snapshot_test",
        name: "Archive Safe Test",
        game: "TEST",
        topic: "Snapshot",
        currentState: "PUBLISHED",
        locks: { contentLock: true, scriptLock: true, audioLock: true, pictureLock: true },
        notes: "Local draft once lived at D:\\GUCC\\Active\\SecretProject",
        finalSummary: "Recorded fact",
        integration: {
          cloud: { revision: 7, access_token: "SECRET_ACCESS", refresh_token: "SECRET_REFRESH", workspaceRoot: "D:\\GUCC\\Active" },
          archive: { status: "generated", provider: "google_drive", archiveVersion: 1 },
        },
        files: {
          PROJECT_DATA: { content: JSON.stringify({ access_token: "SHOULD_NOT_REPEAT", workspace: "/home/test/GUCC" }) },
        },
        runtime: { cache: { service_role: "SECRET_ROLE" } },
      },
    },
    files: [
      { id: "lf_audio", file_key: "AUDIO_MASTER", relative_path: "03_AUDIO/AUDIO_MASTER.wav", kind: "audio", status: "Ready", filename: "AUDIO_MASTER.wav" },
    ],
    devices: [
      { device_id: "agent_test", label: "Main Windows", workspace_root: "D:\\GUCC\\Active", metadata: { refresh_token: "NOPE" } },
    ],
    fileLocations: [
      { logical_file_id: "lf_audio", device_id: "agent_test", storage_provider: "local", relative_path: "03_AUDIO/AUDIO_MASTER.wav", availability: "present", filename: "AUDIO_MASTER.wav", size_bytes: 123, checksum: "sha256:abc", observed_at: "2026-08-27T12:00:00Z" },
    ],
    releases: [
      { platform: "youtube", status: "published", post_url: "https://youtube.com/watch?v=test", post_id: "test", published_at: "2026-08-27T11:00:00Z", snapshot: { metrics: [{ window: "T+1", views: 10 }], access_token: "NOPE" } },
    ],
    events: [
      { event_type: "PROJECT_CREATED", created_at: "2026-08-27T10:00:00Z", detail: { note: "created" } },
      { event_type: "AUTOSAVE", created_at: "2026-08-27T10:01:00Z", detail: { path: "/Users/test/GUCC" } },
    ],
    artifactContents: { RESEARCH: "Research", CONTENT_LOCK: "Conclusion", VOICE_MASTER: "Voice" },
  };

  const raw = core.generateArchivePackage(input, { generatedAt: "2026-08-27T12:00:00Z" });
  const pkg = safe.applyArchiveSafeSnapshot(raw, input);
  const snapshot = pkg.snapshotJson.content;

  assert.match(snapshot, /project_snapshot_test/);
  assert.match(snapshot, /Archive Safe Test/);
  assert.match(snapshot, /03_AUDIO\/AUDIO_MASTER\.wav/);
  assert.match(snapshot, /https:\/\/youtube\.com\/watch\?v=test/);
  assert.doesNotMatch(snapshot, /[A-Za-z]:\\/);
  assert.doesNotMatch(snapshot, /D:\\/);
  assert.doesNotMatch(snapshot, /C:\\/);
  assert.doesNotMatch(snapshot, /\/Users\//);
  assert.doesNotMatch(snapshot, /\/home\//);
  assert.doesNotMatch(snapshot, /access_token/i);
  assert.doesNotMatch(snapshot, /refresh_token/i);
  assert.doesNotMatch(snapshot, /service_role/i);
  assert.doesNotMatch(snapshot, /SECRET_ACCESS|SECRET_REFRESH|SECRET_ROLE|SHOULD_NOT_REPEAT/);
  assert.doesNotMatch(snapshot, /PROJECT_DATA/);
  assert.doesNotMatch(snapshot, /integration"\s*:\s*\{\s*"cloud/i);

  const again = safe.applyArchiveSafeSnapshot(core.generateArchivePackage(input, { generatedAt: "2026-08-27T12:00:00Z" }), input);
  assert.equal(pkg.snapshotJson.content, again.snapshotJson.content, "archive-safe snapshot must be deterministic");

  console.log("creator archive safe snapshot tests passed");
})().catch((error) => { console.error(error); process.exit(1); });
