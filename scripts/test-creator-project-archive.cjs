const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

(async () => {
  const Archive = await import(pathToFileURL(path.resolve(__dirname, "../assets/creator-project-archive-core.mjs")));
  const NOW = "2026-08-29T12:00:00.000Z";
  const projectData = {
    projectId: "project_清宵_x7k29a",
    name: "清宵完整攻略",
    game: "鸣潮",
    topic: "先看懂机制，再谈配装和配队",
    createdAt: "2026-08-20T01:02:03.000Z",
    currentState: "PUBLISHED",
    notes: "面向需要长期查阅的攻略观众。",
    locks: { contentLock: true, scriptLock: true, audioLock: true, pictureLock: true },
    files: {
      RESEARCH: { content: "# Research\n\n## 核心结论\n研究结论 A。\n\n官方：https://example.com/official" },
      CONTENT_LOCK: { content: "# Content Lock\n\n## 核心结论\n锁定结论 B。\n\n## Summary\n最终摘要。" },
      VOICE_MASTER: { content: "# Voice Master\n\n这是最终口播。" },
      SUBTITLE_MASTER: { content: "1\n00:00:00,000 --> 00:00:01,000\n字幕。\n" },
      RELEASE_PACK: { content: "# Release Pack\n\nBilibili title" },
      EDIT_BLUEPRINT: { content: "start,end,visual\n00:00,00:01,UI\n" },
    },
    assets: [{ filename: "ui.png", description: "技能 UI", source: "官方", purpose: "证明机制", avAnchor: "AV_UI_1" }],
    blueprint: [{ start: "00:00", end: "00:05", visual: "官方 UI" }],
    avAnchors: [{ id: "AV_UI_1", type: "AV_UI" }],
    reviews: [{ timecode: "00:03", type: "Visual", note: "换成官方 UI", status: "Done" }],
    finalRetrospective: "这次流程稳定。",
    integration: { archive: { generatedAt: NOW } },
  };
  const project = {
    project_id: projectData.projectId,
    name: projectData.name,
    game: projectData.game,
    topic: projectData.topic,
    current_state: "PUBLISHED",
    revision: 7,
    created_at: projectData.createdAt,
    project_data: projectData,
  };
  const files = [
    { id: "f_audio", file_key: "AUDIO_MASTER", relative_path: "03_AUDIO/AUDIO_MASTER.wav", kind: "audio" },
    { id: "f_sub", file_key: "SUBTITLE_MASTER", relative_path: "04_SUBTITLES/SUBTITLE_MASTER.srt", kind: "srt" },
    { id: "f_video", file_key: "VIDEO_V1", relative_path: "09_FINAL/VIDEO_V1.mp4", kind: "video" },
  ];
  const fileLocations = [
    { logical_file_id: "f_audio", device_id: "agent_main", relative_path: "03_AUDIO/AUDIO_MASTER.wav", availability: "present", filename: "AUDIO_MASTER.wav", size_bytes: 123456, checksum: "sha256:aaa", observed_at: "2026-08-29T10:00:00Z" },
    { logical_file_id: "f_sub", device_id: "agent_main", relative_path: "04_SUBTITLES/SUBTITLE_MASTER.srt", availability: "present", filename: "SUBTITLE_MASTER.srt", size_bytes: 48, checksum: "sha256:bbb", observed_at: "2026-08-29T10:01:00Z" },
    { logical_file_id: "f_video", device_id: "agent_main", relative_path: "D:\\GUCC\\bad\\VIDEO_V1.mp4", availability: "missing", filename: "VIDEO_V1.mp4", size_bytes: 999999, checksum: "sha256:ccc", observed_at: "2026-08-29T10:02:00Z" },
  ];
  const devices = [{ device_id: "agent_main", label: "Main Windows Creator PC" }];
  const events = [
    { id: "1", event_type: "PROJECT_CREATED", state: "IDEA", created_at: "2026-08-20T01:02:03Z", detail: {} },
    { id: "2", event_type: "AUTOSAVE", state: "SCRIPTING", created_at: "2026-08-20T02:00:00Z", detail: {} },
    { id: "3", event_type: "FILE_FIRST_SEEN", state: "AUDIO_PRODUCTION", created_at: "2026-08-21T01:00:00Z", detail: { fileKey: "AUDIO_MASTER" } },
    { id: "4", event_type: "FILE_REPLACED", state: "AUDIO_PRODUCTION", created_at: "2026-08-21T02:00:00Z", detail: { fileKey: "AUDIO_MASTER" } },
    { id: "5", event_type: "STATE_CHANGED", state: "PUBLISHED", created_at: "2026-08-29T09:00:00Z", detail: { from: "RELEASE_READY", to: "PUBLISHED" } },
  ];
  const releases = [{
    platform: "bilibili", status: "published", post_id: "BV1test", post_url: "https://www.bilibili.com/video/BV1test", published_at: "2026-08-29T09:00:00Z",
    snapshot: { fields: { title: "标题", description: "简介", tags: ["鸣潮"] }, metrics: [{ window: "T+1", views: 1234 }] },
  }];
  const input = { project, files, fileLocations, devices, events, releases };
  const a = Archive.generateArchivePackage(input, { generatedAt: NOW });
  const b = Archive.generateArchivePackage(JSON.parse(JSON.stringify(input)), { generatedAt: NOW });

  assert.equal(a.mainMarkdown.content, b.mainMarkdown.content, "Markdown must be deterministic");
  assert.equal(a.snapshotJson.content, b.snapshotJson.content, "snapshot JSON must be deterministic");
  assert.equal(a.eventsJson.content, b.eventsJson.content, "events JSON must be deterministic");
  assert.equal(a.identity.stem, b.identity.stem, "archive identity must be stable");
  assert.equal(a.identity.archiveDate, "2026-08-29", "published date should win");
  assert.match(a.mainMarkdown.filename, /^2026-08-29_清宵完整攻略_/u);
  assert.equal(a.folder.root, "02_ARCHIVE");
  assert.equal(a.folder.collection, "Creator Projects");
  assert.equal(a.folder.year, "2026");
  assert.equal(a.folder.game, "鸣潮");

  const md = a.mainMarkdown.content;
  const sections = ["## Project", "## Final Summary", "## Core Conclusion", "## Research Summary", "## Sources / Evidence", "## Content Lock", "## Final Voice Script", "## Audio", "## Subtitle / Timeline", "## Storyboard Summary", "## Key Assets", "## Production History", "## Review / Revision", "## Final Release Package", "## Published URLs", "## Analytics", "## Final Retrospective", "## Local / Large File Notes"];
  let previous = -1;
  for (const section of sections) {
    const index = md.indexOf(section);
    assert(index > previous, `${section} must exist in stable order`);
    previous = index;
  }
  assert.match(md, /Project ID: project_清宵_x7k29a/u);
  assert.match(md, /Title: 清宵完整攻略/u);
  assert.match(md, /Game: 鸣潮/u);
  assert.match(md, /Topic: 先看懂机制，再谈配装和配队/u);
  assert.match(md, /锁定结论 B/u, "Content Lock conclusion must be used");
  assert.match(md, /这是最终口播/u, "VOICE_MASTER must be preserved");
  assert.match(md, /研究结论 A/u, "Research must be preserved");
  assert.match(md, /https:\/\/example\.com\/official/u, "sources must be extracted");
  assert.match(md, /FILE_FIRST_SEEN/u);
  assert.match(md, /FILE_REPLACED/u);
  assert.doesNotMatch(md, /AUTOSAVE/u, "autosave noise must be excluded");
  assert.match(md, /Main Windows Creator PC/u);
  assert.match(md, /03_AUDIO\/AUDIO_MASTER\.wav/u);
  assert.doesNotMatch(md, /D:\\GUCC/u, "absolute Windows path must never be archived");
  assert.match(md, /https:\/\/www\.bilibili\.com\/video\/BV1test/u);
  assert.match(md, /T\+1/u);
  assert.match(md, /Large-file archival is user-managed outside GUCC\./u);

  const eventPayload = JSON.parse(a.eventsJson.content);
  assert.deepEqual(eventPayload.events.map((item) => item.eventType), ["PROJECT_CREATED", "FILE_FIRST_SEEN", "FILE_REPLACED", "STATE_CHANGED"]);

  const companions = a.companions.map((item) => item.filename).sort();
  assert.deepEqual(companions, ["EDIT_BLUEPRINT.csv", "RELEASE_PACK.md", "SUBTITLE_MASTER.srt"]);
  assert(a.totalBytes < Archive.ARCHIVE_POLICY.packageMaxBytes);

  const withoutRelease = Archive.generateArchivePackage({ ...input, releases: [], analytics: [] }, { generatedAt: NOW });
  assert.match(withoutRelease.mainMarkdown.content, /No published URLs recorded yet\./u);
  assert.match(withoutRelease.mainMarkdown.content, /No analytics snapshot archived yet\./u);
  assert.equal(withoutRelease.identity.archiveDate, "2026-08-29", "existing generatedAt must stabilize filename when unpublished");

  const later = Archive.generateArchivePackage({ ...input, project: { ...project, project_data: { ...projectData, integration: { archive: { generatedAt: NOW } } } }, releases: [] }, { generatedAt: "2026-09-03T00:00:00Z" });
  assert.equal(later.identity.stem, withoutRelease.identity.stem, "regeneration date must not rename an existing archive");

  const pass = [
    ["x.md", "markdown"], ["x.json", "json"], ["x.srt", "subtitle"], ["x.csv", "timeline"], ["x.txt", "text"], ["x.vtt", "subtitle"],
  ];
  for (const [filename, kind] of pass) assert.equal(Archive.evaluateArchiveFile({ filename, kind, content: "x" }).allowed, true, `${filename} should pass`);
  const reject = [
    ["x.mp4", "video"], ["x.mov", "video"], ["x.mkv", "video"], ["x.wav", "audio"], ["x.mp3", "audio"], ["x.flac", "audio"], ["x.psd", "image"], ["x.zip", "archive"], ["x.bin", "binary"],
  ];
  for (const [filename, kind] of reject) assert.equal(Archive.evaluateArchiveFile({ filename, kind, content: "x" }).allowed, false, `${filename} should reject`);
  assert.equal(Archive.evaluateArchiveFile({ filename: "tiny.txt", kind: "audio", content: "x" }).allowed, false, "semantic media type must reject even with allowed extension");
  assert.equal(Archive.evaluateArchiveFile({ filename: "large.md", kind: "markdown", sizeBytes: 6 * 1024 * 1024 }).allowed, false, "large file must reject");

  const sorted = Archive.stableStringify({ z: 1, a: { y: 2, b: 3 } });
  assert.equal(sorted, '{\n  "a": {\n    "b": 3,\n    "y": 2\n  },\n  "z": 1\n}\n');
  assert.equal(Archive.sanitizeArchiveName('  清宵 / 完整:*?攻略  '), "清宵_完整_攻略");
  assert.equal(Archive.shortProjectId("project-abcdef123456"), "ef123456");

  console.log("creator project archive tests passed");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
