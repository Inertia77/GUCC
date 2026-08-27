const ARCHIVE_VERSION = 1;
const DEFAULT_COMPANION_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_PACKAGE_MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".md", ".json", ".srt", ".csv", ".txt", ".vtt"]);
const BLOCKED_EXTENSIONS = new Set([
  ".mp4", ".mov", ".mkv", ".avi", ".webm",
  ".wav", ".mp3", ".flac", ".aac", ".m4a",
  ".psd", ".psb", ".aep", ".prproj", ".blend",
  ".zip", ".rar", ".7z",
]);
const BLOCKED_KINDS = new Set(["audio", "video", "image", "binary", "archive", "project", "raw", "capture"]);
const MEANINGFUL_EVENT_TYPES = new Set([
  "PROJECT_CREATED", "STATE_CHANGED", "LOCKS_CHANGED", "LOCK_SET", "LOCK_REOPENED",
  "FILE_FIRST_SEEN", "FILE_DISAPPEARED", "FILE_REAPPEARED", "FILE_REPLACED",
  "PUBLISHED", "PROJECT_ARCHIVE_GENERATED", "PROJECT_ARCHIVE_PUBLISHED", "PROJECT_ARCHIVE_FAILED",
  "PROJECT_ARCHIVE_UPDATED", "PROJECT_ARCHIVE_MANUAL_OVERRIDE",
]);
const RELEASE_PLATFORMS = ["bilibili", "douyin", "xiaohongshu", "wechat_video_account", "youtube", "tiktok"];

function clone(value) {
  return value == null ? value : structuredClone(value);
}

export function canonicalizeJson(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) throw new TypeError("Circular JSON value");
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) => canonicalizeJson(item, seen));
    seen.delete(value);
    return result;
  }
  const result = {};
  for (const key of Object.keys(value).sort()) {
    const normalized = canonicalizeJson(value[key], seen);
    if (normalized !== undefined && typeof normalized !== "function" && typeof normalized !== "symbol") result[key] = normalized;
  }
  seen.delete(value);
  return result;
}

export function stableStringify(value, space = 2) {
  return `${JSON.stringify(canonicalizeJson(value), null, space)}\n`;
}

function text(value) {
  return String(value == null ? "" : value).trim();
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function sanitizeArchiveName(value, maxLength = 88) {
  const cleaned = text(value)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/[. ]+$/g, "")
    .replace(/^[_ .]+/g, "");
  return (cleaned || "Untitled").slice(0, maxLength).replace(/[. ]+$/g, "") || "Untitled";
}

export function shortProjectId(projectId) {
  const compact = text(projectId).replace(/[^\p{L}\p{N}]+/gu, "");
  return (compact.slice(-8) || "unknown").toLowerCase();
}

function datePart(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : "";
}

function publishedAtFrom(releases, project) {
  const direct = text(project.publishedAt || project.published_at);
  if (datePart(direct)) return new Date(direct).toISOString();
  const dates = asArray(releases).map((item) => item?.published_at).filter((value) => datePart(value)).sort();
  return dates[0] || "";
}

function existingArchive(project) {
  return asObject(asObject(asObject(project).integration).archive);
}

export function archiveIdentity(input = {}, options = {}) {
  const projectRow = asObject(input.project);
  const projectData = asObject(projectRow.project_data || input.projectData || projectRow);
  const releases = asArray(input.releases);
  const archive = existingArchive(projectData);
  const generatedAt = text(archive.generatedAt || archive.generated_at || options.generatedAt || new Date().toISOString());
  const publishedAt = publishedAtFrom(releases, projectData);
  const archiveDate = datePart(publishedAt) || datePart(generatedAt) || "1970-01-01";
  const title = text(projectData.name || projectRow.name || "Untitled");
  const game = text(projectData.game || projectRow.game || "Unknown Game");
  const projectId = text(projectData.projectId || projectRow.project_id || input.projectId);
  const stem = `${archiveDate}_${sanitizeArchiveName(title)}_${shortProjectId(projectId)}`;
  return {
    archiveVersion: ARCHIVE_VERSION,
    projectId,
    title,
    game,
    topic: text(projectData.topic || projectRow.topic),
    publishedAt,
    generatedAt,
    archiveDate,
    year: archiveDate.slice(0, 4),
    gameFolder: sanitizeArchiveName(game, 64),
    stem,
  };
}

function extension(filename) {
  const match = text(filename).toLowerCase().match(/(\.[a-z0-9]+)$/);
  return match ? match[1] : "";
}

export function evaluateArchiveFile(candidate = {}, policy = {}) {
  const filename = text(candidate.filename || candidate.name);
  const ext = extension(filename);
  const kind = text(candidate.kind || candidate.semanticType).toLowerCase();
  const content = candidate.content == null ? "" : String(candidate.content);
  const sizeBytes = Number.isFinite(Number(candidate.sizeBytes)) ? Number(candidate.sizeBytes) : new TextEncoder().encode(content).byteLength;
  const maxBytes = Number(policy.companionMaxBytes || DEFAULT_COMPANION_MAX_BYTES);
  if (!filename) return { allowed: false, reason: "missing_filename", sizeBytes, extension: ext };
  if (BLOCKED_EXTENSIONS.has(ext)) return { allowed: false, reason: "blocked_extension", sizeBytes, extension: ext };
  if (!ALLOWED_EXTENSIONS.has(ext)) return { allowed: false, reason: "extension_not_allowlisted", sizeBytes, extension: ext };
  if (BLOCKED_KINDS.has(kind)) return { allowed: false, reason: "blocked_semantic_type", sizeBytes, extension: ext };
  if (sizeBytes > maxBytes) return { allowed: false, reason: "file_too_large", sizeBytes, extension: ext };
  return { allowed: true, reason: "allowed", sizeBytes, extension: ext };
}

function artifactContent(projectData, contents, key) {
  const explicit = contents?.[key];
  if (explicit != null && String(explicit).trim()) return String(explicit).trim();
  const file = asObject(asObject(projectData.files)[key]);
  if (file.content != null && String(file.content).trim()) return String(file.content).trim();
  const fieldMap = {
    RESEARCH: "research",
    CONTENT_LOCK: "contentLock",
    VOICE_MASTER: "voiceMaster",
    REVIEW_NOTES: "reviewNotes",
    RELEASE_PACK: "releasePack",
    EDIT_BLUEPRINT: "editBlueprint",
    SUBTITLE_MASTER: "subtitleMaster",
  };
  const value = fieldMap[key] ? projectData[fieldMap[key]] : "";
  return typeof value === "string" ? value.trim() : "";
}

function extractMarkdownSection(markdown, headings) {
  const source = text(markdown);
  if (!source) return "";
  const lines = source.split(/\r?\n/);
  const names = headings.map((item) => item.toLowerCase());
  let start = -1;
  let level = 7;
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/^(#{1,6})\s+(.+?)\s*$/);
    if (!match) continue;
    const label = match[2].replace(/[：:]/g, "").trim().toLowerCase();
    if (names.some((name) => label === name || label.includes(name))) {
      start = i + 1;
      level = match[1].length;
      break;
    }
  }
  if (start < 0) return "";
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    const match = lines[i].match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) { end = i; break; }
  }
  return lines.slice(start, end).join("\n").trim();
}

function extractUrls(...values) {
  const seen = new Set();
  const urls = [];
  for (const value of values) {
    const candidates = typeof value === "string" ? (value.match(/https?:\/\/[^\s)\]}>"']+/g) || []) : [];
    for (const url of candidates) {
      const normalized = url.replace(/[.,;:]+$/g, "");
      if (!seen.has(normalized)) { seen.add(normalized); urls.push(normalized); }
    }
  }
  return urls;
}

function explicitSources(projectData) {
  const values = [projectData.sources, projectData.references, projectData.evidence, projectData.officialSources]
    .flatMap((item) => asArray(item));
  return values.map((item) => {
    if (typeof item === "string") return item;
    const object = asObject(item);
    return text(object.url || object.href || object.source || object.title);
  }).filter(Boolean);
}

function safeRelativePath(value) {
  const raw = text(value).replace(/\\/g, "/");
  if (!raw || /^(?:[A-Za-z]:\/|\/|\\\\)/.test(raw)) return "";
  const parts = raw.split("/").filter((part) => part && part !== ".");
  if (!parts.length || parts.includes("..")) return "";
  return parts.join("/");
}

function deviceMap(devices) {
  return new Map(asArray(devices).map((item) => [item.device_id, item]));
}

function latestLocations(fileLocations) {
  const byLogical = new Map();
  for (const location of asArray(fileLocations)) {
    const key = location.logical_file_id || `${location.project_id}:${location.relative_path}`;
    const current = byLogical.get(key);
    if (!current || String(location.observed_at || location.updated_at || "") > String(current.observed_at || current.updated_at || "")) byLogical.set(key, location);
  }
  return byLogical;
}

function fileMetadata(files, fileLocations, devices) {
  const locations = latestLocations(fileLocations);
  const deviceById = deviceMap(devices);
  return asArray(files).map((file) => {
    const location = locations.get(file.id) || null;
    const device = location ? deviceById.get(location.device_id) : null;
    return {
      logicalFileId: file.id || null,
      fileKey: file.file_key || "",
      kind: file.kind || "",
      filename: location?.filename || file.filename || file.relative_path?.split("/").pop() || "",
      relativePath: safeRelativePath(location?.relative_path || file.relative_path),
      availability: location?.availability || "unknown",
      deviceId: location?.device_id || "",
      deviceLabel: device?.label || "",
      sizeBytes: location?.size_bytes ?? file.size_bytes ?? null,
      checksum: location?.checksum || file.checksum || "",
      fileModifiedAt: location?.file_modified_at || "",
      observedAt: location?.observed_at || "",
      storageProvider: location?.storage_provider || file.storage_provider || "local",
    };
  });
}

function meaningfulEvents(events) {
  return asArray(events)
    .filter((event) => MEANINGFUL_EVENT_TYPES.has(String(event.event_type || "")) || /^(LOCK_|PUBLISH)/.test(String(event.event_type || "")))
    .filter((event) => !/(HEARTBEAT|AUTOSAVE|SCAN|PRESENT|LOCATION_UPDATED)/i.test(String(event.event_type || "")))
    .map((event) => ({
      id: event.id || null,
      eventType: event.event_type || "",
      state: event.state || "",
      detail: canonicalizeJson(event.detail || {}),
      createdAt: event.created_at || "",
    }))
    .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)) || String(a.id || "").localeCompare(String(b.id || "")));
}

function releaseRows(releases) {
  return asArray(releases).map((release) => ({
    platform: release.platform || "",
    status: release.status || "",
    postId: release.post_id || "",
    postUrl: release.post_url || "",
    publishedAt: release.published_at || "",
    snapshot: canonicalizeJson(release.snapshot || {}),
  })).sort((a, b) => String(a.platform).localeCompare(String(b.platform)));
}

function analyticsSnapshots(releases, analytics) {
  const rows = [];
  for (const release of asArray(releases)) {
    const metrics = asArray(release?.snapshot?.metrics);
    for (const metric of metrics) rows.push({ platform: release.platform || metric.platform || "", ...canonicalizeJson(metric) });
  }
  for (const metric of asArray(analytics)) rows.push(canonicalizeJson(metric));
  return rows.filter((item) => /T\s*\+\s*(1|3|7|30)/i.test(String(item.window || item.checkpoint || item.label || "")))
    .sort((a, b) => String(a.window || a.checkpoint || "").localeCompare(String(b.window || b.checkpoint || "")) || String(a.platform || "").localeCompare(String(b.platform || "")));
}

function markdownValue(value) {
  const output = text(value);
  return output || "Not recorded";
}

function mdList(values, fallback = "Not recorded") {
  const list = asArray(values).filter((item) => text(item));
  return list.length ? list.map((item) => `- ${text(item)}`).join("\n") : fallback;
}

function releasePackageMarkdown(projectData, releases) {
  const rawPack = artifactContent(projectData, {}, "RELEASE_PACK");
  const rows = releaseRows(releases);
  if (rawPack) return rawPack;
  const byPlatform = new Map(rows.map((row) => [String(row.platform).toLowerCase(), row]));
  const lines = [];
  for (const platform of RELEASE_PLATFORMS) {
    const row = byPlatform.get(platform);
    const fields = asObject(row?.snapshot?.fields);
    lines.push(`### ${platform}`);
    lines.push(`- Title: ${text(fields.title) || "Not recorded"}`);
    lines.push(`- Description: ${text(fields.description) || "Not recorded"}`);
    lines.push(`- Tags: ${Array.isArray(fields.tags) ? fields.tags.join(", ") : text(fields.tags) || "Not recorded"}`);
    lines.push(`- Caption: ${text(fields.caption) || "Not recorded"}`);
    lines.push(`- Pinned Comment: ${text(fields.pinnedComment || fields.pinned_comment) || "Not recorded"}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

function storyboardSummary(projectData, artifactContents) {
  const rows = asArray(projectData.blueprint);
  const anchors = asArray(projectData.avAnchors);
  const lines = [`- Storyboard items: ${rows.length}`, `- AV Anchors: ${anchors.length}`];
  rows.slice(0, 16).forEach((row) => {
    const item = asObject(row);
    const timing = [item.start, item.end].filter(Boolean).join(" → ");
    const label = text(item.visual || item.description || item.asset || item.action || item.note);
    if (timing || label) lines.push(`- ${timing ? `${timing} · ` : ""}${label || "Storyboard item"}`);
  });
  const edit = artifactContent(projectData, artifactContents, "EDIT_BLUEPRINT");
  if (edit && !rows.length) lines.push(`- EDIT_BLUEPRINT recorded (${new TextEncoder().encode(edit).byteLength} bytes); full table kept as optional companion.`);
  return lines.join("\n");
}

function keyAssets(projectData) {
  const assets = asArray(projectData.assets);
  if (!assets.length) return "Not recorded";
  return assets.map((asset) => {
    const item = asObject(asset);
    const fields = [
      text(item.description || item.name || item.filename),
      text(item.source) && `Source: ${text(item.source)}`,
      text(item.purpose || item.role) && `Purpose: ${text(item.purpose || item.role)}`,
      text(item.avAnchor || item.anchor || item.anchorId) && `AV Anchor: ${text(item.avAnchor || item.anchor || item.anchorId)}`,
    ].filter(Boolean);
    return `- ${fields.join(" · ") || "Asset metadata recorded"}`;
  }).join("\n");
}

function productionHistoryMarkdown(events) {
  if (!events.length) return "Not recorded";
  return events.map((event) => {
    const fileKey = text(event.detail?.fileKey);
    const note = text(event.detail?.reason || event.detail?.note);
    return `- ${event.createdAt || "Time not recorded"} · ${event.eventType}${event.state ? ` · ${event.state}` : ""}${fileKey ? ` · ${fileKey}` : ""}${note ? ` · ${note}` : ""}`;
  }).join("\n");
}

function fileNotesMarkdown(metadata) {
  const important = metadata.filter((file) => ["AUDIO_MASTER", "VIDEO_V1", "VIDEO_FINAL", "PROJECT_FILE"].includes(file.fileKey) || ["audio", "video", "project"].includes(String(file.kind).toLowerCase()));
  if (!important.length) return "Not recorded\n\nLarge-file archival is user-managed outside GUCC.";
  const rows = important.map((file) => [
    `### ${file.fileKey || file.filename}`,
    `- Filename: ${file.filename || "Not recorded"}`,
    `- Logical Artifact: ${file.fileKey || "Not recorded"}`,
    `- Device: ${file.deviceLabel || file.deviceId || "Not recorded"}`,
    `- Relative Path: ${file.relativePath || "Not recorded"}`,
    `- Availability: ${file.availability || "unknown"}`,
    `- Checksum: ${file.checksum || "Not recorded"}`,
    `- Size: ${file.sizeBytes == null ? "Not recorded" : `${file.sizeBytes} bytes`}`,
  ].join("\n"));
  return `${rows.join("\n\n")}\n\nLarge-file archival is user-managed outside GUCC.`;
}

function audioMarkdown(metadata) {
  const file = metadata.find((item) => item.fileKey === "AUDIO_MASTER");
  if (!file) return "Not recorded";
  return [
    `- Logical Artifact: AUDIO_MASTER`,
    `- Filename: ${file.filename || "Not recorded"}`,
    `- Size: ${file.sizeBytes == null ? "Not recorded" : `${file.sizeBytes} bytes`}`,
    `- Checksum: ${file.checksum || "Not recorded"}`,
    `- Device: ${file.deviceLabel || file.deviceId || "Not recorded"}`,
    `- Relative Path: ${file.relativePath || "Not recorded"}`,
    `- Availability: ${file.availability || "unknown"}`,
    `- Last Observed: ${file.observedAt || "Not recorded"}`,
  ].join("\n");
}

function subtitleMarkdown(metadata, artifactContents) {
  const file = metadata.find((item) => item.fileKey === "SUBTITLE_MASTER");
  const content = artifactContents.SUBTITLE_MASTER || "";
  if (!file && !content) return "Not recorded";
  const cueCount = content ? (content.match(/--> /g) || []).length : null;
  return [
    `- Filename: ${file?.filename || "SUBTITLE_MASTER.srt"}`,
    `- Relative Path: ${file?.relativePath || "Not recorded"}`,
    `- Availability: ${file?.availability || (content ? "content recorded" : "unknown")}`,
    `- Cue Count: ${cueCount == null ? "Not recorded" : cueCount}`,
    `- Checksum: ${file?.checksum || "Not recorded"}`,
  ].join("\n");
}

function reviewMarkdown(projectData, artifactContents) {
  const notes = artifactContent(projectData, artifactContents, "REVIEW_NOTES");
  const reviews = asArray(projectData.reviews);
  const lines = [];
  if (notes) lines.push(notes);
  if (reviews.length) {
    lines.push(reviews.map((review) => {
      const item = asObject(review);
      return `- ${text(item.timecode || item.time || "")} ${text(item.type || item.category || "Review")} · ${text(item.note || item.description || item.content) || "Not recorded"} · ${text(item.status || "")}`.trim();
    }).join("\n"));
  }
  const revision = text(projectData.revisionNotes || projectData.finalRevisionResult);
  if (revision) lines.push(`\nFinal Revision Result\n\n${revision}`);
  return lines.filter(Boolean).join("\n\n") || "Not recorded";
}

function publishedUrlsMarkdown(releases) {
  const rows = releaseRows(releases).filter((row) => row.postUrl || row.postId || row.publishedAt);
  if (!rows.length) return "No published URLs recorded yet.";
  return rows.map((row) => [
    `### ${row.platform || "Unknown platform"}`,
    `- Post ID: ${row.postId || "Not recorded"}`,
    `- URL: ${row.postUrl || "Not recorded"}`,
    `- Published At: ${row.publishedAt || "Not recorded"}`,
  ].join("\n")).join("\n\n");
}

function analyticsMarkdown(metrics) {
  if (!metrics.length) return "No analytics snapshot archived yet.";
  return metrics.map((metric) => {
    const copy = { ...metric };
    const label = copy.window || copy.checkpoint || copy.label || "Snapshot";
    delete copy.window; delete copy.checkpoint; delete copy.label;
    return `### ${label}${copy.platform ? ` · ${copy.platform}` : ""}\n\n\`\`\`json\n${stableStringify(copy).trim()}\n\`\`\``;
  }).join("\n\n");
}

function buildMarkdown(model) {
  const p = model.projectData;
  const identity = model.identity;
  const research = model.artifacts.RESEARCH;
  const contentLock = model.artifacts.CONTENT_LOCK;
  const voice = model.artifacts.VOICE_MASTER;
  const finalSummary = text(p.finalSummary || p.summary || p.notes) || extractMarkdownSection(contentLock, ["final summary", "summary", "最终摘要", "摘要"]);
  const coreConclusion = extractMarkdownSection(contentLock, ["core conclusion", "conclusion", "核心结论", "结论"])
    || extractMarkdownSection(research, ["core conclusion", "conclusion", "核心结论", "结论"])
    || text(p.coreConclusion);
  const sources = [...explicitSources(p), ...extractUrls(research, contentLock, voice)].filter((value, index, array) => array.indexOf(value) === index);
  return `# Project Archive

## Project

- Project ID: ${identity.projectId || "Not recorded"}
- Title: ${identity.title || "Not recorded"}
- Game: ${identity.game || "Not recorded"}
- Topic: ${identity.topic || "Not recorded"}
- Created At: ${p.createdAt || model.projectRow.created_at || "Not recorded"}
- Published At: ${identity.publishedAt || "Not recorded"}
- Archived At: ${model.archiveMeta.archivedAt || model.archiveMeta.publishedAt || "Not recorded"}
- Revision: ${model.projectRow.revision ?? p.integration?.cloud?.revision ?? "Not recorded"}

## Final Summary

${markdownValue(finalSummary)}

## Core Conclusion

${markdownValue(coreConclusion)}

## Research Summary

${markdownValue(research)}

## Sources / Evidence

${mdList(sources)}

## Content Lock

${markdownValue(contentLock)}

## Final Voice Script

${markdownValue(voice)}

## Audio

${audioMarkdown(model.fileMetadata)}

## Subtitle / Timeline

${subtitleMarkdown(model.fileMetadata, model.artifacts)}

## Storyboard Summary

${storyboardSummary(p, model.artifacts)}

## Key Assets

${keyAssets(p)}

## Production History

${productionHistoryMarkdown(model.events)}

## Review / Revision

${reviewMarkdown(p, model.artifacts)}

## Final Release Package

${markdownValue(releasePackageMarkdown(p, model.releases))}

## Published URLs

${publishedUrlsMarkdown(model.releases)}

## Analytics

${analyticsMarkdown(model.analytics)}

## Final Retrospective

${markdownValue(p.finalRetrospective || p.retrospective)}

## Local / Large File Notes

${fileNotesMarkdown(model.fileMetadata)}
`;
}

function makeGeneratedFile(filename, content, kind) {
  return { filename, content, kind, semanticType: kind, sizeBytes: new TextEncoder().encode(content).byteLength };
}

function companionCandidate(projectData, artifacts, key, filename, kind) {
  const content = artifactContent(projectData, artifacts, key);
  return content ? makeGeneratedFile(filename, content.endsWith("\n") ? content : `${content}\n`, kind) : null;
}

export function generateArchivePackage(input = {}, options = {}) {
  const projectRow = asObject(input.project);
  const projectData = clone(asObject(projectRow.project_data || input.projectData || projectRow));
  const identity = archiveIdentity({ ...input, project: projectRow, projectData }, options);
  if (!identity.projectId) throw new Error("Archive project ID is required");
  const artifacts = {};
  for (const key of ["RESEARCH", "CONTENT_LOCK", "VOICE_MASTER", "SUBTITLE_MASTER", "RELEASE_PACK", "EDIT_BLUEPRINT", "REVIEW_NOTES"]) artifacts[key] = artifactContent(projectData, input.artifactContents || {}, key);
  const events = meaningfulEvents(input.events);
  const releases = releaseRows(input.releases);
  const analytics = analyticsSnapshots(input.releases, input.analytics);
  const metadata = fileMetadata(input.files, input.fileLocations, input.devices);
  const archiveMeta = existingArchive(projectData);
  const model = { projectRow, projectData, identity, artifacts, events, releases, analytics, fileMetadata: metadata, archiveMeta };
  const mainContent = buildMarkdown(model);
  const snapshot = {
    archiveVersion: ARCHIVE_VERSION,
    project: canonicalizeJson(projectRow),
    projectData: canonicalizeJson(projectData),
    files: canonicalizeJson(asArray(input.files)),
    fileLocations: canonicalizeJson(metadata),
    releases: canonicalizeJson(releases),
    analytics: canonicalizeJson(analytics),
  };
  const eventHistory = { archiveVersion: ARCHIVE_VERSION, projectId: identity.projectId, events: canonicalizeJson(events) };
  const mainMarkdown = makeGeneratedFile(`${identity.stem}.md`, mainContent, "markdown");
  const snapshotJson = makeGeneratedFile(`${identity.stem}.snapshot.json`, stableStringify(snapshot), "json");
  const eventsJson = makeGeneratedFile(`${identity.stem}.events.json`, stableStringify(eventHistory), "json");
  const optional = [
    companionCandidate(projectData, artifacts, "SUBTITLE_MASTER", "SUBTITLE_MASTER.srt", "subtitle"),
    companionCandidate(projectData, artifacts, "RELEASE_PACK", "RELEASE_PACK.md", "markdown"),
    companionCandidate(projectData, artifacts, "EDIT_BLUEPRINT", "EDIT_BLUEPRINT.csv", "timeline"),
  ].filter(Boolean);
  const warnings = [];
  const companions = [];
  let totalBytes = mainMarkdown.sizeBytes + snapshotJson.sizeBytes + eventsJson.sizeBytes;
  const packageMax = Number(options.packageMaxBytes || DEFAULT_PACKAGE_MAX_BYTES);
  for (const candidate of optional) {
    const check = evaluateArchiveFile(candidate, options);
    if (!check.allowed) {
      warnings.push(`${candidate.filename}: ${check.reason}`);
      continue;
    }
    if (totalBytes + check.sizeBytes > packageMax) {
      warnings.push(`${candidate.filename}: package_size_limit`);
      continue;
    }
    companions.push({ ...candidate, sizeBytes: check.sizeBytes });
    totalBytes += check.sizeBytes;
  }
  if (totalBytes > packageMax) throw new Error(`Core archive package exceeds ${packageMax} bytes`);
  return {
    archiveVersion: ARCHIVE_VERSION,
    identity,
    folder: { root: "02_ARCHIVE", collection: "Creator Projects", year: identity.year, game: identity.gameFolder },
    mainMarkdown,
    snapshotJson,
    eventsJson,
    companions,
    warnings,
    totalBytes,
    policy: { companionMaxBytes: Number(options.companionMaxBytes || DEFAULT_COMPANION_MAX_BYTES), packageMaxBytes: packageMax, allowedExtensions: [...ALLOWED_EXTENSIONS].sort() },
  };
}

export const ARCHIVE_POLICY = Object.freeze({
  archiveVersion: ARCHIVE_VERSION,
  companionMaxBytes: DEFAULT_COMPANION_MAX_BYTES,
  packageMaxBytes: DEFAULT_PACKAGE_MAX_BYTES,
  allowedExtensions: Object.freeze([...ALLOWED_EXTENSIONS].sort()),
  blockedExtensions: Object.freeze([...BLOCKED_EXTENSIONS].sort()),
});
