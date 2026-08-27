const assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

class FakeDriveTransport {
  constructor() {
    this.files = new Map();
    this.counter = 0;
    this.files.set("root", { id: "root", name: "GUCC Creator Projects", mimeType: "application/vnd.google-apps.folder", parents: [], createdTime: "2026-01-01T00:00:00Z" });
    this.failVerification = false;
  }
  nextId() { this.counter += 1; return `id_${String(this.counter).padStart(3, "0")}`; }
  async findChildren({ parentId, name, mimeType = "", excludeFolders = false }) {
    return [...this.files.values()].filter((file) => file.name === name && (file.parents || []).includes(parentId) && (!mimeType || file.mimeType === mimeType) && (!excludeFolders || file.mimeType !== "application/vnd.google-apps.folder"));
  }
  async createFolder({ parentId, name }) {
    const file = { id: this.nextId(), name, mimeType: "application/vnd.google-apps.folder", parents: [parentId], createdTime: new Date(2026, 0, this.counter).toISOString() };
    this.files.set(file.id, file); return { ...file };
  }
  async createTextFile({ parentId, name, content, mimeType }) {
    const file = { id: this.nextId(), name, mimeType, parents: [parentId], content, size: Buffer.byteLength(content), createdTime: new Date(2026, 0, this.counter).toISOString() };
    this.files.set(file.id, file); return { ...file };
  }
  async updateTextFile({ fileId, name, content, mimeType }) {
    const file = this.files.get(fileId); if (!file) throw new Error("missing fake Drive file");
    Object.assign(file, { name, content, mimeType, size: Buffer.byteLength(content) });
    return { ...file };
  }
  async getFile({ fileId }) {
    const file = this.files.get(fileId); return file ? { ...file } : null;
  }
  async readTextFile({ fileId }) {
    const file = this.files.get(fileId); if (!file) throw new Error("missing fake Drive file");
    return this.failVerification ? `${file.content}\ncorrupt` : file.content;
  }
}

(async () => {
  const { DriveArchivePublisher } = await import(pathToFileURL(path.resolve(__dirname, "creator-archive/drive-publisher.mjs")));
  const transport = new FakeDriveTransport();
  const publisher = new DriveArchivePublisher({ transport, rootFolderId: "root" });
  const pkg = {
    archiveVersion: 1,
    identity: { projectId: "project_test", title: "Test", stem: "2026-08-29_Test_jecttest" },
    folder: { root: "02_ARCHIVE", collection: "Creator Projects", year: "2026", game: "TEST" },
    mainMarkdown: { filename: "2026-08-29_Test_jecttest.md", content: "# Project Archive\n\nFirst\n", kind: "markdown", sizeBytes: 26 },
    snapshotJson: { filename: "2026-08-29_Test_jecttest.snapshot.json", content: "{\n  \"a\": 1\n}\n", kind: "json", sizeBytes: 15 },
    eventsJson: { filename: "2026-08-29_Test_jecttest.events.json", content: "{\n  \"events\": []\n}\n", kind: "json", sizeBytes: 20 },
    companions: [{ filename: "SUBTITLE_MASTER.srt", content: "1\n00:00:00,000 --> 00:00:01,000\nX\n", kind: "subtitle", sizeBytes: 39 }],
    warnings: [], totalBytes: 100,
  };

  const first = await publisher.publish(pkg);
  assert(first.folderId);
  assert(first.mainFileId);
  assert.equal(first.files.length, 4);
  const afterFirstCount = transport.files.size;
  const firstIds = new Map(first.files.map((item) => [item.filename, item.fileId]));

  const second = await publisher.publish(pkg);
  assert.equal(transport.files.size, afterFirstCount, "second publish must not create folders or files");
  assert.equal(second.folderId, first.folderId, "folder identity must be stable");
  for (const file of second.files) assert.equal(file.fileId, firstIds.get(file.filename), `${file.filename} should preserve Drive file id`);
  assert.equal([...transport.files.values()].some((file) => /\(1\)/.test(file.name)), false, "publisher must never invent (1) names");

  const updated = structuredClone(pkg);
  updated.mainMarkdown.content = "# Project Archive\n\nSecond version\n";
  updated.mainMarkdown.sizeBytes = Buffer.byteLength(updated.mainMarkdown.content);
  const third = await publisher.publish(updated);
  assert.equal(third.mainFileId, first.mainFileId, "content update must preserve main file identity");
  assert.equal(transport.files.get(first.mainFileId).content, updated.mainMarkdown.content);
  assert.equal(transport.files.size, afterFirstCount, "content update must not create duplicate file");

  transport.failVerification = true;
  await assert.rejects(() => publisher.publish(updated), /verification failed/i, "remote verification failure must fail publish");
  transport.failVerification = false;

  const mediaPackage = structuredClone(pkg);
  mediaPackage.companions.push({ filename: "AUDIO_MASTER.wav", content: "tiny", kind: "audio", sizeBytes: 4 });
  await assert.rejects(() => publisher.publish(mediaPackage), /rejected AUDIO_MASTER\.wav/i, "media must never upload even when tiny");

  const oversized = structuredClone(pkg);
  oversized.totalBytes = 21 * 1024 * 1024;
  await assert.rejects(() => publisher.publish(oversized), /total size policy/i, "oversized package must fail");

  // Existing duplicate folders are tolerated without creating yet another duplicate.
  const canonicalCollection = [...transport.files.values()].find((file) => file.name === "Creator Projects" && file.mimeType === "application/vnd.google-apps.folder");
  assert(canonicalCollection?.parents?.[0], "canonical Creator Projects folder must exist");
  const duplicateFolder = { id: transport.nextId(), name: "Creator Projects", mimeType: "application/vnd.google-apps.folder", parents: [...canonicalCollection.parents], createdTime: "2030-01-01T00:00:00Z" };
  transport.files.set(duplicateFolder.id, duplicateFolder);
  const beforeExistingDuplicatePublish = transport.files.size;
  const fourth = await publisher.publish(pkg);
  assert.equal(transport.files.size, beforeExistingDuplicatePublish, "pre-existing duplicate should not trigger another create");
  assert(fourth.warnings.some((warning) => warning.includes("Duplicate Drive folders already existed")));

  console.log("creator archive Drive publisher tests passed");
})().catch((error) => { console.error(error); process.exit(1); });
