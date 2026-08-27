import { createHash } from "node:crypto";
import { ARCHIVE_POLICY, evaluateArchiveFile } from "../../assets/creator-project-archive-core.mjs";

const FOLDER_MIME = "application/vnd.google-apps.folder";

function sha256(content) {
  return `sha256:${createHash("sha256").update(Buffer.from(String(content), "utf8")).digest("hex")}`;
}

function driveFolderUrl(id) {
  return id ? `https://drive.google.com/drive/folders/${encodeURIComponent(id)}` : "";
}

function driveFileUrl(id) {
  return id ? `https://drive.google.com/file/d/${encodeURIComponent(id)}/view` : "";
}

function stableChoice(items) {
  return [...items].sort((a, b) => String(a.createdTime || "").localeCompare(String(b.createdTime || "")) || String(a.id || "").localeCompare(String(b.id || "")))[0] || null;
}

export class DriveArchivePublisher {
  constructor({ transport, rootFolderId }) {
    if (!transport) throw new Error("Drive transport is required");
    if (!rootFolderId) throw new Error("GUCC Creator Projects root folder ID is required");
    this.transport = transport;
    this.rootFolderId = rootFolderId;
  }

  async resolveFolder(parentId, name, warnings) {
    const matches = await this.transport.findChildren({ parentId, name, mimeType: FOLDER_MIME });
    if (matches.length) {
      if (matches.length > 1) warnings.push(`Duplicate Drive folders already existed for ${name}; reused one deterministic folder and created nothing.`);
      return { file: stableChoice(matches), created: false };
    }
    const created = await this.transport.createFolder({ parentId, name });
    return { file: created, created: true };
  }

  async resolveArchiveFolder(pkg, warnings) {
    const levels = [pkg.folder.root, pkg.folder.collection, pkg.folder.year, pkg.folder.game];
    let parentId = this.rootFolderId;
    let final = null;
    for (const name of levels) {
      const result = await this.resolveFolder(parentId, name, warnings);
      final = result.file;
      parentId = result.file.id;
    }
    return final;
  }

  validatePackage(pkg) {
    if (!pkg?.identity?.projectId) throw new Error("Archive package project identity is missing");
    if (Number(pkg.totalBytes || 0) > ARCHIVE_POLICY.packageMaxBytes) throw new Error("Archive package exceeds total size policy");
    const files = [pkg.mainMarkdown, pkg.snapshotJson, pkg.eventsJson, ...(pkg.companions || [])].filter(Boolean);
    for (const file of files) {
      const check = evaluateArchiveFile(file);
      if (!check.allowed) throw new Error(`Drive archive rejected ${file.filename}: ${check.reason}`);
    }
    return files;
  }

  async upsertArchiveFile(parentId, file, warnings) {
    const matches = await this.transport.findChildren({ parentId, name: file.filename, excludeFolders: true });
    let remote;
    let created = false;
    if (matches.length) {
      if (matches.length > 1) warnings.push(`Duplicate Drive files already existed for ${file.filename}; updated one deterministic file and created nothing.`);
      const chosen = stableChoice(matches);
      remote = await this.transport.updateTextFile({ fileId: chosen.id, name: file.filename, content: file.content, mimeType: fileMime(file.filename) });
    } else {
      remote = await this.transport.createTextFile({ parentId, name: file.filename, content: file.content, mimeType: fileMime(file.filename) });
      created = true;
    }
    return { remote, created };
  }

  async verifyFile(parentId, file, remote) {
    const metadata = await this.transport.getFile({ fileId: remote.id });
    if (!metadata || metadata.id !== remote.id) throw new Error(`Drive verification failed for ${file.filename}: metadata missing`);
    if (metadata.name !== file.filename) throw new Error(`Drive verification failed for ${file.filename}: name mismatch`);
    if (Array.isArray(metadata.parents) && !metadata.parents.includes(parentId)) throw new Error(`Drive verification failed for ${file.filename}: parent mismatch`);
    const downloaded = await this.transport.readTextFile({ fileId: remote.id });
    const expected = sha256(file.content);
    const actual = sha256(downloaded);
    if (expected !== actual) throw new Error(`Drive verification failed for ${file.filename}: content checksum mismatch`);
    return { metadata, checksum: expected };
  }

  async publish(pkg) {
    const files = this.validatePackage(pkg);
    const warnings = [...(pkg.warnings || [])];
    const folder = await this.resolveArchiveFolder(pkg, warnings);
    const published = [];
    for (const file of files) {
      const saved = await this.upsertArchiveFile(folder.id, file, warnings);
      const verified = await this.verifyFile(folder.id, file, saved.remote);
      published.push({
        filename: file.filename,
        fileId: saved.remote.id,
        fileUrl: driveFileUrl(saved.remote.id),
        checksum: verified.checksum,
        sizeBytes: Buffer.byteLength(String(file.content), "utf8"),
        created: saved.created,
      });
    }
    const main = published.find((item) => item.filename === pkg.mainMarkdown.filename);
    if (!main) throw new Error("Drive archive main Markdown was not published");
    return {
      provider: "google_drive",
      archiveVersion: pkg.archiveVersion,
      projectId: pkg.identity.projectId,
      folderId: folder.id,
      folderUrl: driveFolderUrl(folder.id),
      mainFileId: main.fileId,
      mainFileUrl: main.fileUrl,
      checksum: main.checksum,
      verifiedAt: new Date().toISOString(),
      files: published,
      warnings,
    };
  }
}

function fileMime(filename) {
  const lower = String(filename || "").toLowerCase();
  if (lower.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".csv")) return "text/csv; charset=utf-8";
  if (lower.endsWith(".srt")) return "application/x-subrip; charset=utf-8";
  if (lower.endsWith(".vtt")) return "text/vtt; charset=utf-8";
  return "text/plain; charset=utf-8";
}

export { FOLDER_MIME, driveFolderUrl, driveFileUrl, fileMime, sha256 };
