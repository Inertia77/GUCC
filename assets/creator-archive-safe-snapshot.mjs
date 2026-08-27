const SECRET_KEY = /(access[_-]?token|refresh[_-]?token|service[_-]?role|authorization|password|secret|session|credential|oauth|cache)/i;
const RUNTIME_KEY = /^(cloud|workspaceRoot|workspace_root|absolutePath|absolute_path|localRoot|local_root|runtime|temporary|temp)$/i;
const WINDOWS_ABSOLUTE = /\b[A-Za-z]:[\\/][^\r\n\t"'<>|]*/g;
const POSIX_ABSOLUTE = /\/(?:Users|home)\/[^\r\n\t"'<>]*/g;

function object(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function array(value) { return Array.isArray(value) ? value : []; }
function text(value) { return String(value == null ? "" : value).trim(); }

export function canonicalizeArchiveJson(value, seen = new WeakSet()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) throw new TypeError("Circular archive snapshot value");
  seen.add(value);
  if (Array.isArray(value)) {
    const result = value.map((item) => canonicalizeArchiveJson(item, seen));
    seen.delete(value);
    return result;
  }
  const result = {};
  for (const key of Object.keys(value).sort()) {
    const normalized = canonicalizeArchiveJson(value[key], seen);
    if (normalized !== undefined) result[key] = normalized;
  }
  seen.delete(value);
  return result;
}

export function stableArchiveJson(value) {
  return `${JSON.stringify(canonicalizeArchiveJson(value), null, 2)}\n`;
}

export function sanitizeArchiveText(value) {
  return text(value)
    .replace(WINDOWS_ABSOLUTE, "[LOCAL_PATH_REDACTED]")
    .replace(POSIX_ABSOLUTE, "[LOCAL_PATH_REDACTED]");
}

function safeRelativePath(value) {
  const raw = text(value).replace(/\\/g, "/");
  if (!raw || /^(?:[A-Za-z]:\/|\/|\\\\)/.test(raw)) return "";
  const parts = raw.split("/").filter((part) => part && part !== ".");
  if (!parts.length || parts.includes("..")) return "";
  return parts.join("/");
}

function safeObject(value, depth = 0) {
  if (depth > 5) return undefined;
  if (value == null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return sanitizeArchiveText(value);
  if (Array.isArray(value)) return value.slice(0, 500).map((item) => safeObject(item, depth + 1)).filter((item) => item !== undefined);
  if (typeof value !== "object") return undefined;
  const output = {};
  for (const key of Object.keys(value).sort()) {
    if (SECRET_KEY.test(key) || RUNTIME_KEY.test(key)) continue;
    const next = safeObject(value[key], depth + 1);
    if (next !== undefined) output[key] = next;
  }
  return output;
}

function archiveMetadata(projectData) {
  const raw = object(object(projectData.integration).archive);
  return safeObject({
    status: raw.status,
    provider: raw.provider,
    archiveVersion: raw.archiveVersion,
    folderId: raw.folderId,
    folderUrl: raw.folderUrl,
    mainFileId: raw.mainFileId,
    mainFileUrl: raw.mainFileUrl,
    checksum: raw.checksum,
    generatedAt: raw.generatedAt,
    publishedAt: raw.publishedAt,
    verifiedAt: raw.verifiedAt,
    overrideReason: raw.overrideReason,
    lastError: raw.lastError,
  });
}

function projectProjection(projectRow) {
  const p = object(projectRow.project_data);
  return {
    projectId: text(p.projectId || projectRow.project_id),
    title: sanitizeArchiveText(p.name || projectRow.name),
    game: sanitizeArchiveText(p.game || projectRow.game),
    topic: sanitizeArchiveText(p.topic || projectRow.topic),
    currentState: text(p.currentState || projectRow.current_state),
    targetPublishDate: text(p.targetPublishDate || projectRow.target_publish_date),
    createdAt: text(p.createdAt || projectRow.created_at),
    updatedAt: text(p.updatedAt || projectRow.updated_at),
    revision: Number(projectRow.revision || 0),
    locks: safeObject(p.locks || projectRow.locks || {}),
    audioProduction: safeObject(p.audioProduction || {}),
    knowledge: safeObject({
      finalSummary: p.finalSummary,
      coreConclusion: p.coreConclusion,
      notes: p.notes,
      finalRetrospective: p.finalRetrospective || p.retrospective,
    }),
    archive: archiveMetadata(p),
  };
}

function logicalArtifacts(files) {
  return array(files).map((file) => ({
    logicalFileId: file.id || null,
    fileKey: text(file.file_key),
    relativePath: safeRelativePath(file.relative_path),
    kind: text(file.kind),
    status: text(file.status),
    storageProvider: text(file.storage_provider),
    filename: sanitizeArchiveText(file.filename),
    mimeType: text(file.mime_type),
    sizeBytes: file.size_bytes == null ? null : Number(file.size_bytes),
    checksum: text(file.checksum),
  })).sort((a, b) => a.fileKey.localeCompare(b.fileKey));
}

function physicalLocations(fileLocations, devices) {
  const labels = new Map(array(devices).map((device) => [device.device_id, sanitizeArchiveText(device.label)]));
  return array(fileLocations).map((location) => ({
    logicalFileId: location.logical_file_id || null,
    deviceId: text(location.device_id),
    deviceLabel: labels.get(location.device_id) || "",
    storageProvider: text(location.storage_provider),
    relativePath: safeRelativePath(location.relative_path),
    availability: text(location.availability || "unknown"),
    filename: sanitizeArchiveText(location.filename),
    mimeType: text(location.mime_type),
    sizeBytes: location.size_bytes == null ? null : Number(location.size_bytes),
    checksum: text(location.checksum),
    fileModifiedAt: text(location.file_modified_at),
    observedAt: text(location.observed_at),
  })).sort((a, b) => String(a.logicalFileId).localeCompare(String(b.logicalFileId)) || a.deviceId.localeCompare(b.deviceId));
}

function releaseProjection(releases) {
  return array(releases).map((release) => ({
    platform: text(release.platform),
    status: text(release.status),
    postId: sanitizeArchiveText(release.post_id || release.postId),
    postUrl: sanitizeArchiveText(release.post_url || release.postUrl),
    publishedAt: text(release.published_at || release.publishedAt),
    snapshot: safeObject(release.snapshot || {}),
  })).sort((a, b) => a.platform.localeCompare(b.platform));
}

function eventProjection(events) {
  return array(events).map((event) => ({
    eventType: text(event.event_type || event.eventType),
    state: text(event.state),
    createdAt: text(event.created_at || event.createdAt),
    detail: safeObject(event.detail || {}),
  })).filter((event) => event.eventType && !/(AUTOSAVE|HEARTBEAT|FILE_PRESENT|FILE_SCANNED|LOCATION_UPDATED)/i.test(event.eventType))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.eventType.localeCompare(b.eventType));
}

export function buildArchiveSafeSnapshot(input = {}) {
  return canonicalizeArchiveJson({
    schemaVersion: "gucc-creator-archive-snapshot-v1",
    project: projectProjection(object(input.project)),
    logicalArtifacts: logicalArtifacts(input.files),
    fileLocations: physicalLocations(input.fileLocations, input.devices),
    releases: releaseProjection(input.releases),
    analytics: safeObject(array(input.analytics)),
    meaningfulHistory: eventProjection(input.events),
  });
}

export function applyArchiveSafeSnapshot(pkg, input = {}) {
  const next = structuredClone(pkg);
  const content = stableArchiveJson(buildArchiveSafeSnapshot(input));
  const previousBytes = Number(next.snapshotJson?.sizeBytes || 0);
  const nextBytes = new TextEncoder().encode(content).byteLength;
  next.snapshotJson = { ...next.snapshotJson, content, sizeBytes: nextBytes, kind: "json", semanticType: "json" };
  next.totalBytes = Number(next.totalBytes || 0) - previousBytes + nextBytes;
  if (next.totalBytes > Number(next.policy?.packageMaxBytes || 20 * 1024 * 1024)) throw new Error("Archive-safe snapshot exceeds total package size policy");
  return next;
}
