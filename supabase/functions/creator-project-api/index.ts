type JsonMap = Record<string, unknown>;
type HttpError = Error & { status?: number; payload?: JsonMap };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const DEFAULT_ALLOWED_ORIGINS = new Set(["http://localhost:8000", "https://inertia77.github.io"]);
const DEVICE_KINDS = new Set(["web", "desktop", "agent", "unknown"]);
const LOCATION_AVAILABILITY = new Set(["unknown", "present", "missing", "stale"]);
const ARTIFACT_SCOPES = new Set(["project", "language_track", "visual_master", "variant"]);
const LANGUAGE_WORKFLOW_STATES = new Set(["DRAFT", "SCRIPTING", "SCRIPT_LOCKED", "AUDIO_PRODUCTION", "AUDIO_LOCKED", "TIMELINE_GENERATION", "TIMELINE_LOCKED", "READY"]);
const LANGUAGE_ALIGNMENT_STATES = new Set(["PENDING", "VALID", "REVIEW_REQUIRED", "INVALID"]);
const VISUAL_MASTER_STATES = new Set(["DRAFT", "PLANNING", "STORYBOARDING", "ASSET_COMPLETION", "READY", "LOCKED"]);
const VARIANT_STATES = new Set(["DRAFT", "ASSEMBLING", "READY", "PLATFORM_PREPARATION", "LOCKED", "RELEASE_READY"]);
const PUBLICATION_STATES = new Set(["READY_TO_PUBLISH", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED", "RETRY", "REPOST"]);
const PUBLICATION_MODES = new Set(["INITIAL", "RETRY", "REPOST"]);
const GLOBAL_METADATA_ACTIONS = new Set([
  "saveScopedArtifact", "saveResearchSource", "saveAsset", "saveLanguageTrack", "saveVisualMaster",
  "saveVisualSegment", "saveVisualProjection", "saveAssetCoverage", "saveVariant", "saveChannel",
  "savePlatformPresentation", "savePublishPackage", "runAiQa", "savePublication", "recordMetricSnapshot",
  "savePerformanceReport", "saveLearningProposal",
]);
const FORBIDDEN_MEDIA_KEYS = new Set([
  "bytes", "base64", "blob", "binary", "buffer", "audiobytes", "videobytes", "imagebytes", "mediabytes", "filebytes",
  "servicerolekey", "accesstoken",
]);
const MAX_METADATA_JSON = 350_000;
const ARCHIVE_WORKFLOW_STATES = new Set(["PUBLISHED", "ARCHIVED"]);
const MAX_LOCATION_BATCH = 100;
const ARCHIVE_VERSION = 1;

function allowedOrigins() {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((value) => value.trim()).filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}
function corsFor(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = allowedOrigins();
  const allowOrigin = !origin ? "*" : allowed.has(origin) ? origin : "";
  return { "Access-Control-Allow-Origin": allowOrigin, "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", Vary: "Origin" };
}
function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsFor(req), "Content-Type": "application/json; charset=utf-8" } });
}
function fail(message: string, status = 400): never { const error = new Error(message) as HttpError; error.status = status; throw error; }
function failWithPayload(message: string, status: number, payload: JsonMap): never { const error = new Error(message) as HttpError; error.status = status; error.payload = payload; throw error; }
function tokenFrom(req: Request) { const header = req.headers.get("authorization") || ""; if (!header.toLowerCase().startsWith("bearer ")) fail("Missing Authorization bearer token", 401); return header.slice(7).trim(); }

async function verifyUser(req: Request) {
  const token = tokenFrom(req);
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
  if (!response.ok) fail("Invalid or expired session", 401);
  const user = await response.json();
  if (!user?.id) fail("Authenticated user has no id", 401);
  return user as { id: string; email?: string };
}

async function serviceRest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("apikey", SUPABASE_SERVICE_ROLE_KEY);
  headers.set("Authorization", `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers });
  const text = await response.text();
  let payload: unknown = null;
  if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }
  if (!response.ok) {
    const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
    fail(`Database request failed (${response.status}): ${detail}`, response.status >= 500 ? 502 : response.status);
  }
  return payload;
}

async function requireActiveAppUser(userId: string) {
  const rows = await serviceRest(`app_users?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=user_id,role&limit=1`) as Array<JsonMap>;
  if (!Array.isArray(rows) || !rows.length) fail("This account is not enabled for GUCC", 403);
  return rows[0];
}
async function rawProject(projectId: string) {
  const rows = await serviceRest(`creator_projects?project_id=eq.${encodeURIComponent(projectId)}&select=*`) as Array<JsonMap>;
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
async function ownedProject(projectId: string, ownerUserId: string) {
  const project = await rawProject(projectId);
  if (!project) fail("Creator project not found", 404);
  if (project.owner_user_id !== ownerUserId) fail("Creator project belongs to another account", 403);
  return project;
}
function asObject(value: unknown): JsonMap { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonMap : {}; }
function boundedText(value: unknown, max: number) { return String(value == null ? "" : value).trim().slice(0, max); }
function dateOrNull(value: unknown) { const text = String(value || "").trim(); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null; }
function timestampOrNull(value: unknown) { const text = String(value || "").trim(); if (!text) return null; const parsed = Date.parse(text); return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null; }
function nonnegativeIntegerOrNull(value: unknown, label = "sizeBytes") { if (value == null || value === "") return null; const number = Number(value); if (!Number.isSafeInteger(number) || number < 0) fail(`${label} must be a non-negative integer or null`); return number; }
function finiteNumberOrNull(value: unknown, label = "number") { if (value == null || value === "") return null; const number = Number(value); if (!Number.isFinite(number)) fail(`${label} must be a finite number or null`); return number; }
function uuidOrNull(value: unknown, label = "id") { const text = boundedText(value, 80); if (!text) return null; if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) fail(`${label} must be a UUID`); return text; }
function requiredText(value: unknown, label: string, max = 240) { const text = boundedText(value, max); if (!text) fail(`${label} is required`); return text; }
function booleanValue(value: unknown, label: string, fallback = false) { if (value == null) return fallback; if (typeof value !== "boolean") fail(`${label} must be a boolean`); return value; }
function optionalBoolean(value: unknown, label: string) { return value == null ? null : booleanValue(value, label); }
function httpsUrlOrNull(value: unknown, label: string) { const url = boundedText(value, 2000); if (!url) return null; let parsed: URL; try { parsed = new URL(url); } catch { fail(`${label} must be a valid https URL`); } if (parsed!.protocol !== "https:" || !parsed!.hostname || parsed!.username || parsed!.password) fail(`${label} must be a valid https URL without embedded credentials`); return parsed!.href; }
function boundedJson(value: unknown, label: string, max = MAX_METADATA_JSON) { const normalized = value == null ? {} : value; let serialized = ""; try { serialized = JSON.stringify(normalized); } catch { fail(`${label} must be valid JSON`); } if (serialized.length > max) fail(`${label} is too large`, 413); return normalized; }
function boundedTextArray(value: unknown, label: string, maxItems = 100, maxItemLength = 240) { if (value == null) return []; if (!Array.isArray(value)) fail(`${label} must be an array`); if (value.length > maxItems) fail(`${label} has too many items`, 413); return value.map((item) => requiredText(item, `${label} item`, maxItemLength)); }
function enumValue(value: unknown, allowed: Set<string>, label: string, fallback?: string) { const normalized = boundedText(value, 80).toUpperCase() || fallback || ""; if (!allowed.has(normalized)) fail(`Unsupported ${label}: ${normalized || "empty"}`); return normalized; }
function normalizeRelativePath(value: unknown) {
  const raw = boundedText(value, 1200).replace(/\\/g, "/");
  if (!raw) fail("location.relativePath is required");
  if (/^(?:[A-Za-z]:\/|\/|\/\/)/.test(raw)) fail("location.relativePath must be workspace-relative, not absolute");
  const parts = raw.split("/").filter((part) => part && part !== ".");
  if (!parts.length || parts.includes("..")) fail("location.relativePath must stay inside the workspace root");
  return parts.join("/");
}
function canonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => canonicalJson(item));
  if (value && typeof value === "object") { const source = value as JsonMap; const result: JsonMap = {}; for (const key of Object.keys(source).sort()) result[key] = canonicalJson(source[key]); return result; }
  return value;
}
function sameJson(a: unknown, b: unknown) { try { return JSON.stringify(canonicalJson(a ?? null)) === JSON.stringify(canonicalJson(b ?? null)); } catch { return false; } }
function safeDriveId(value: unknown) { const id = boundedText(value, 300); if (id && !/^[A-Za-z0-9_-]+$/.test(id)) fail("Invalid Google Drive file/folder id"); return id; }
function safeDriveUrl(value: unknown) { const url = boundedText(value, 2000); if (!url) return ""; let parsed: URL; try { parsed = new URL(url); } catch { fail("Invalid Google Drive URL"); } if (parsed!.protocol !== "https:" || parsed!.hostname !== "drive.google.com") fail("Archive URL must be a Google Drive https URL"); return parsed!.href; }

function fileRows(project: JsonMap, ownerUserId: string, now: string) {
  const files = asObject(project.files);
  const projectId = String(project.projectId || "");
  return Object.entries(files).map(([fileKey, raw]) => {
    const file = asObject(raw);
    return {
      project_id: projectId, owner_user_id: ownerUserId,
      artifact_scope_type: "project", artifact_scope_id: projectId, file_key: fileKey,
      relative_path: String(file.relativePath || ""), kind: String(file.kind || "other"), status: String(file.status || "Missing"),
      storage_provider: String(file.storageProvider || "local"), provider_file_id: file.providerFileId || null, provider_url: file.providerUrl || null,
      filename: file.filename || null, mime_type: file.mimeType || null,
      size_bytes: Number.isFinite(Number(file.size)) ? Number(file.size) : null, checksum: file.checksum || null,
      metadata: { notes: file.notes || "", sourceUpdatedAt: file.updatedAt || "" }, updated_at: now,
    };
  });
}
function cloudRevision(project: JsonMap) { const revision = Number(asObject(asObject(project.integration).cloud).revision); return Number.isInteger(revision) && revision >= 0 ? revision : null; }
function serverArchive(projectRow: JsonMap | null) { return projectRow ? asObject(asObject(asObject(asObject(projectRow.project_data).integration).archive)) : {}; }
function projectWithoutServerMetadata(project: JsonMap, existing: JsonMap | null = null) {
  const clean = structuredClone(project); const integration = { ...asObject(clean.integration) };
  delete integration.cloud;
  delete integration.archive;
  const existingArchive = serverArchive(existing);
  if (Object.keys(existingArchive).length) integration.archive = structuredClone(existingArchive);
  clean.integration = integration;
  return clean;
}
function guardGenericArchiveState(existing: JsonMap | null, currentState: string) {
  const previousState = String(existing?.current_state || "");
  if (!existing && currentState === "ARCHIVED") fail("Generic saveProject cannot create an ARCHIVED project; use the verified Archive workflow", 409);
  if (existing && previousState !== "ARCHIVED" && currentState === "ARCHIVED") fail("Generic saveProject cannot enter ARCHIVED; use recordArchivePublished or manualArchiveOverride", 409);
  if (existing && previousState === "ARCHIVED" && currentState !== "ARCHIVED") fail("Generic saveProject cannot reopen an ARCHIVED project; refresh the cloud project before editing", 409);
}
function revisionConflict(project: JsonMap | null, currentRevision: number) { failWithPayload("Cloud project has a newer revision", 409, { error: "REVISION_CONFLICT", conflict: { currentRevision, project } }); }
function inferredDeviceKind(deviceId: string, explicit: string) { if (DEVICE_KINDS.has(explicit)) return explicit; if (deviceId.startsWith("web_")) return "web"; if (deviceId.startsWith("agent_")) return "agent"; if (deviceId.startsWith("desktop_")) return "desktop"; return "unknown"; }

async function deviceRow(userId: string, deviceId: string) {
  const rows = await serviceRest(`creator_devices?owner_user_id=eq.${encodeURIComponent(userId)}&device_id=eq.${encodeURIComponent(deviceId)}&select=*&limit=1`) as Array<JsonMap>;
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
async function touchDevice(userId: string, body: JsonMap) {
  const descriptor = asObject(body.device); const deviceId = boundedText(body.deviceId || descriptor.deviceId, 160); if (!deviceId) return null;
  const existing = await deviceRow(userId, deviceId); const now = new Date().toISOString();
  const patch: JsonMap = { label: boundedText(descriptor.label, 160) || boundedText(existing?.label, 160) || "GUCC Web", device_kind: inferredDeviceKind(deviceId, boundedText(descriptor.deviceKind || descriptor.kind, 32)), last_seen_at: now };
  const platform = boundedText(descriptor.platform, 240); const workspaceRoot = boundedText(descriptor.workspaceRoot, 1200);
  if (platform) patch.platform = platform; if (workspaceRoot) patch.workspace_root = workspaceRoot;
  if (Object.keys(asObject(descriptor.capabilities)).length) patch.capabilities = asObject(descriptor.capabilities);
  if (Object.keys(asObject(descriptor.metadata)).length) patch.metadata = asObject(descriptor.metadata);
  if (existing) await serviceRest(`creator_devices?owner_user_id=eq.${encodeURIComponent(userId)}&device_id=eq.${encodeURIComponent(deviceId)}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch) });
  else await serviceRest("creator_devices", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ owner_user_id: userId, device_id: deviceId, ...patch }) });
  return deviceId;
}
async function getDevice(userId: string, body: JsonMap) { const deviceId = boundedText(body.deviceId, 160); if (!deviceId) fail("deviceId is required"); const device = await deviceRow(userId, deviceId); if (!device) fail("Creator device not found", 404); return { device }; }
async function registerDevice(userId: string, body: JsonMap) { const deviceId = await touchDevice(userId, body); if (!deviceId) fail("deviceId is required"); return { device: await deviceRow(userId, deviceId) }; }

function artifactIdentity(projectId: string, source: JsonMap) {
  const artifactScopeType = boundedText(source.artifactScopeType, 40) || "project";
  if (!ARTIFACT_SCOPES.has(artifactScopeType)) fail("Unsupported artifactScopeType");
  const artifactScopeId = boundedText(source.artifactScopeId, 220) || (artifactScopeType === "project" ? projectId : "");
  if (!artifactScopeId) fail("artifactScopeId is required outside project scope");
  if (artifactScopeType === "project" && artifactScopeId !== projectId) fail("Project-scoped artifactScopeId must equal projectId");
  return { artifactScopeType, artifactScopeId };
}
async function ownedLogicalFile(userId: string, projectId: string, fileKey: string, artifactScopeType = "project", artifactScopeId = projectId, skipProjectCheck = false) {
  if (!skipProjectCheck) await ownedProject(projectId, userId);
  const rows = await serviceRest(`creator_project_files?owner_user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}&artifact_scope_type=eq.${encodeURIComponent(artifactScopeType)}&artifact_scope_id=eq.${encodeURIComponent(artifactScopeId)}&file_key=eq.${encodeURIComponent(fileKey)}&select=id,project_id,owner_user_id,artifact_scope_type,artifact_scope_id,file_key,relative_path,kind,status&limit=1`) as Array<JsonMap>;
  if (!Array.isArray(rows) || !rows.length) fail("Logical artifact not found", 404); return rows[0];
}
async function previousLocation(userId: string, logicalFileId: string, deviceId: string, storageProvider: string) {
  const rows = await serviceRest(`creator_file_locations?owner_user_id=eq.${encodeURIComponent(userId)}&logical_file_id=eq.${encodeURIComponent(logicalFileId)}&device_id=eq.${encodeURIComponent(deviceId)}&storage_provider=eq.${encodeURIComponent(storageProvider)}&select=*&limit=1`) as Array<JsonMap>;
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
function locationReplacement(previous: JsonMap, next: JsonMap) {
  const oldChecksum = boundedText(previous.checksum, 300); const newChecksum = boundedText(next.checksum, 300);
  if (oldChecksum && newChecksum) return oldChecksum !== newChecksum;
  if (Number(previous.size_bytes ?? -1) !== Number(next.size_bytes ?? -1)) return true;
  const oldMtime = timestampOrNull(previous.file_modified_at); const newMtime = timestampOrNull(next.file_modified_at);
  return Boolean(oldMtime && newMtime && oldMtime !== newMtime);
}
function meaningfulFileEvent(previous: JsonMap | null, next: JsonMap) {
  const nextAvailability = String(next.availability || "unknown");
  if (!previous) return nextAvailability === "present" ? "FILE_FIRST_SEEN" : null;
  const previousAvailability = String(previous.availability || "unknown");
  if (previousAvailability === "present" && nextAvailability === "missing") return "FILE_DISAPPEARED";
  if (previousAvailability === "unknown" && nextAvailability === "present") return "FILE_FIRST_SEEN";
  if (previousAvailability === "missing" && nextAvailability === "present") return "FILE_REAPPEARED";
  if (previousAvailability === "present" && nextAvailability === "present" && locationReplacement(previous, next)) return "FILE_REPLACED";
  return null;
}
async function writeEvent(projectId: string, ownerUserId: string, eventType: string, state: string, detail: JsonMap = {}) {
  await serviceRest("creator_project_events", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ project_id: projectId, owner_user_id: ownerUserId, event_type: eventType, state, detail }) });
}
async function ownedEntity(table: string, idColumn: string, id: string, userId: string, projectId?: string) {
  let query = `${table}?${idColumn}=eq.${encodeURIComponent(id)}&owner_user_id=eq.${encodeURIComponent(userId)}`;
  if (projectId) query += `&project_id=eq.${encodeURIComponent(projectId)}`;
  const rows = await serviceRest(`${query}&select=*&limit=1`) as Array<JsonMap>;
  if (!Array.isArray(rows) || !rows.length) fail(`${table} row not found`, 404);
  return rows[0];
}
async function insertReturning(table: string, row: JsonMap) {
  const rows = await serviceRest(table, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) }) as Array<JsonMap>;
  if (!Array.isArray(rows) || !rows.length) fail(`${table} insert returned no row`, 502);
  return rows[0];
}
async function patchReturning(table: string, filter: string, patch: JsonMap) {
  const rows = await serviceRest(`${table}?${filter}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch) }) as Array<JsonMap>;
  if (!Array.isArray(rows) || !rows.length) fail(`${table} update returned no row`, 409);
  return rows[0];
}
async function upsertReturning(table: string, conflictColumns: string, row: JsonMap) {
  const rows = await serviceRest(`${table}?on_conflict=${encodeURIComponent(conflictColumns)}`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify(row) }) as Array<JsonMap>;
  if (!Array.isArray(rows) || !rows.length) fail(`${table} upsert returned no row`, 502);
  return rows[0];
}

async function saveOneFileLocation(userId: string, project: JsonMap, logicalFile: JsonMap, deviceId: string, location: JsonMap) {
  const relativePath = normalizeRelativePath(location.relativePath);
  const storageProvider = boundedText(location.storageProvider, 80) || "local";
  if (storageProvider === "local") { const expectedPath = normalizeRelativePath(logicalFile.relative_path); if (relativePath !== expectedPath) fail(`Local observation path must match logical artifact contract: ${expectedPath}`); }
  const availability = boundedText(location.availability, 32) || "present";
  if (!LOCATION_AVAILABILITY.has(availability)) fail("Unsupported location availability");
  const row: JsonMap = {
    logical_file_id: logicalFile.id, project_id: project.project_id, owner_user_id: userId, device_id: deviceId,
    storage_provider: storageProvider, relative_path: relativePath, availability,
    provider_file_id: boundedText(location.providerFileId, 500) || null, provider_url: boundedText(location.providerUrl, 2000) || null,
    filename: boundedText(location.filename, 300) || relativePath.split("/").pop() || null, mime_type: boundedText(location.mimeType, 240) || null,
    size_bytes: nonnegativeIntegerOrNull(location.sizeBytes), checksum: boundedText(location.checksum, 300) || null,
    file_modified_at: timestampOrNull(location.fileModifiedAt), observed_at: timestampOrNull(location.observedAt) || new Date().toISOString(), metadata: asObject(location.metadata),
  };
  const previous = await previousLocation(userId, String(logicalFile.id), deviceId, storageProvider);
  const eventType = meaningfulFileEvent(previous, row);
  const eventDetail = { artifactScopeType: logicalFile.artifact_scope_type, artifactScopeId: logicalFile.artifact_scope_id, fileKey: logicalFile.file_key, logicalFileId: logicalFile.id, deviceId, storageProvider, relativePath, previousAvailability: previous?.availability || null, availability: row.availability, previousSizeBytes: previous?.size_bytes ?? null, sizeBytes: row.size_bytes ?? null, previousChecksum: previous?.checksum || null, checksum: row.checksum || null, fileModifiedAt: row.file_modified_at || null, observedAt: row.observed_at || null };
  const saved = asObject(await serviceRest("rpc/save_creator_file_location_observation", { method: "POST", body: JSON.stringify({
    p_owner_user_id: userId, p_logical_file_id: logicalFile.id, p_project_id: project.project_id, p_device_id: deviceId, p_storage_provider: storageProvider,
    p_location: { relative_path: row.relative_path, availability: row.availability, provider_file_id: row.provider_file_id, provider_url: row.provider_url, filename: row.filename, mime_type: row.mime_type, size_bytes: row.size_bytes, checksum: row.checksum, file_modified_at: row.file_modified_at, observed_at: row.observed_at, metadata: row.metadata },
    p_event_type: eventType, p_state: String(project.current_state || ""), p_event_detail: eventDetail,
  }) }));
  return { location: saved, eventType };
}

async function saveFileLocation(userId: string, body: JsonMap) {
  const location = asObject(body.location); const projectId = boundedText(body.projectId || location.projectId, 220); const fileKey = boundedText(body.fileKey || location.fileKey, 220);
  if (!projectId) fail("projectId is required"); if (!fileKey) fail("fileKey is required");
  const scope = artifactIdentity(projectId, { ...location, artifactScopeType: body.artifactScopeType || location.artifactScopeType, artifactScopeId: body.artifactScopeId || location.artifactScopeId });
  const project = await ownedProject(projectId, userId); const logicalFile = await ownedLogicalFile(userId, projectId, fileKey, scope.artifactScopeType, scope.artifactScopeId, true);
  const deviceId = await touchDevice(userId, { ...body, deviceId: body.deviceId || location.deviceId, device: Object.keys(asObject(body.device)).length ? body.device : location.device });
  if (!deviceId) fail("deviceId is required");
  const saved = await saveOneFileLocation(userId, project, logicalFile, deviceId, location);
  return { projectId, ...scope, fileKey, logicalFileId: logicalFile.id, ...saved };
}

async function saveFileLocationsBatch(userId: string, body: JsonMap) {
  const projectId = boundedText(body.projectId, 220); const locations = Array.isArray(body.locations) ? body.locations : [];
  if (!projectId) fail("projectId is required"); if (!locations.length) fail("locations must contain at least one observation"); if (locations.length > MAX_LOCATION_BATCH) fail(`locations batch exceeds ${MAX_LOCATION_BATCH}`, 413);
  const project = await ownedProject(projectId, userId); const deviceId = await touchDevice(userId, body); if (!deviceId) fail("deviceId is required");
  const saved: JsonMap[] = []; const errors: JsonMap[] = []; const events: JsonMap[] = [];
  for (let index = 0; index < locations.length; index += 1) {
    const location = asObject(locations[index]); const fileKey = boundedText(location.fileKey, 220); let scope: JsonMap = {};
    try {
      if (!fileKey) fail("fileKey is required");
      scope = artifactIdentity(projectId, location);
      const logicalFile = await ownedLogicalFile(userId, projectId, fileKey, String(scope.artifactScopeType), String(scope.artifactScopeId), true);
      const result = await saveOneFileLocation(userId, project, logicalFile, deviceId, location);
      saved.push({ index, ...scope, fileKey, logicalFileId: logicalFile.id, location: result.location });
      if (result.eventType) events.push({ index, ...scope, fileKey, eventType: result.eventType });
    } catch (error) { const problem = error as HttpError; errors.push({ index, ...scope, fileKey: fileKey || null, error: problem.message || "Invalid location", status: problem.status || 400 }); }
  }
  return { projectId, deviceId, saved: saved.length, failed: errors.length, results: saved, errors, events };
}

async function saveProject(userId: string, body: JsonMap) {
  const project = asObject(body.projectData); const projectId = String(project.projectId || "").trim();
  if (!projectId) fail("projectData.projectId is required"); if (JSON.stringify(project).length > 3_500_000) fail("Project JSON is too large for creator-project sync", 413);
  const existing = await rawProject(projectId); if (existing && existing.owner_user_id !== userId) fail("Project id collision", 409);
  const requestedRevision = body.baseRevision == null ? cloudRevision(project) : Number(body.baseRevision);
  if (existing && (!Number.isInteger(requestedRevision) || Number(requestedRevision) < 1)) revisionConflict(existing, Number(existing.revision || 1));
  if (!existing && requestedRevision != null && requestedRevision !== 0) revisionConflict(null, 0);
  const now = new Date().toISOString(); const integration = asObject(project.integration); const drive = asObject(integration.drive); const workspace = asObject(integration.workspace);
  const currentState = String(project.currentState || "IDEA");
  guardGenericArchiveState(existing, currentState);
  const locks = asObject(project.locks); const projectData = projectWithoutServerMetadata(project, existing);
  const row = {
    name: String(project.name || ""), game: String(project.game || ""), topic: String(project.topic || ""), project_type: String(project.projectType || "STANDARD_VIDEO"), current_state: currentState,
    target_publish_date: dateOrNull(project.targetPublishDate), locks,
    drive_root_id: drive.rootId || null, drive_root_url: drive.rootUrl || null, drive_folder_id: drive.folderId || null, drive_folder_url: drive.folderUrl || null,
    source_workspace_version: workspace.version || project.sourceWorkspaceVersion || null, project_data: projectData,
  };
  const files = fileRows(projectData, userId, now); const deviceId = await touchDevice(userId, body);
  const result = asObject(await serviceRest("rpc/save_creator_project_revision", { method: "POST", body: JSON.stringify({ p_owner_user_id: userId, p_project_id: projectId, p_base_revision: existing ? requestedRevision : 0, p_device_id: deviceId, p_project_row: row, p_files: files }) }));
  if (result.status === "conflict") revisionConflict(asObject(result.project), Number(result.current_revision || 0));
  if (result.status === "forbidden") fail("Creator project belongs to another account", 403);
  if (result.status !== "saved") fail(String(result.message || "Creator project save failed"), 400);
  const saved = asObject(result.project); const savedRevision = Number(result.revision || saved.revision || 0); const savedState = String(saved.current_state || currentState);
  if (!existing) await writeEvent(projectId, userId, "PROJECT_CREATED", savedState, { source: workspace.version || "production-system", revision: savedRevision, deviceId });
  else {
    if (existing.current_state !== savedState) await writeEvent(projectId, userId, "STATE_CHANGED", savedState, { from: existing.current_state, to: savedState });
    if (!sameJson(existing.locks, locks)) await writeEvent(projectId, userId, "LOCKS_CHANGED", savedState, { from: existing.locks, to: locks });
  }
  if (body.reason === "manual") await writeEvent(projectId, userId, "MANUAL_SYNC", savedState, { revision: savedRevision, deviceId });
  return { project: saved, revision: savedRevision, fileCount: files.length, deviceId };
}

async function listProjects(userId: string) { return await serviceRest(`creator_projects?owner_user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`); }
async function dashboard(userId: string) {
  const owner = encodeURIComponent(userId);
  const [projects, files, releases, devices, fileLocations, languageTracks, scopedArtifacts, visualMasters, variants, publishPackages, publications, metricSnapshots, performanceReports, learnings] = await Promise.all([
    serviceRest(`creator_projects?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`), serviceRest(`creator_project_files?owner_user_id=eq.${owner}&artifact_scope_type=eq.project&select=*&order=updated_at.desc`),
    serviceRest(`creator_project_releases?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`), serviceRest(`creator_devices?owner_user_id=eq.${owner}&select=*&order=last_seen_at.desc`),
    serviceRest(`creator_file_locations?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_language_tracks?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_project_files?owner_user_id=eq.${owner}&artifact_scope_type=neq.project&select=*&order=updated_at.desc`),
    serviceRest(`creator_visual_masters?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_variants?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_publish_packages?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_publications?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_publication_metric_snapshots?owner_user_id=eq.${owner}&select=*&order=captured_at.desc&limit=500`),
    serviceRest(`creator_performance_reports?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_learnings?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
  ]);
  return { projects, files, releases, devices, fileLocations, languageTracks, scopedArtifacts, visualMasters, variants, publishPackages, publications, metricSnapshots, performanceReports, learnings, serverTime: new Date().toISOString() };
}
async function getProject(userId: string, body: JsonMap) {
  const projectId = String(body.projectId || "").trim(); if (!projectId) fail("projectId is required"); const project = await ownedProject(projectId, userId);
  const owner = encodeURIComponent(userId); const projectFilter = encodeURIComponent(projectId);
  const [files, languageTracks, scopedArtifacts, events, releases, fileLocations, devices, researchSources, assets, visualMasters, visualSegments, visualSegmentProjections, assetCoverage, variants, variantLanguageTracks, platforms, channels, platformPresentations, publishPackages, qaReports, publications, metricSnapshots, performanceReports, learnings] = await Promise.all([
    serviceRest(`creator_project_files?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&artifact_scope_type=eq.project&artifact_scope_id=eq.${projectFilter}&select=*&order=updated_at.desc`),
    serviceRest(`creator_language_tracks?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=created_at.asc`),
    serviceRest(`creator_project_files?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&artifact_scope_type=neq.project&select=*&order=updated_at.desc`),
    serviceRest(`creator_project_events?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=created_at.desc&limit=200`),
    serviceRest(`creator_project_releases?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_file_locations?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_devices?owner_user_id=eq.${owner}&select=*&order=last_seen_at.desc`),
    serviceRest(`creator_research_sources?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_assets?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_visual_masters?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_visual_segments?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=sequence_no.asc`),
    serviceRest(`creator_visual_segment_projections?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=start_ms.asc`),
    serviceRest(`creator_asset_coverage?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_variants?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=created_at.asc`),
    serviceRest(`creator_variant_language_tracks?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=sequence_no.asc`),
    serviceRest("platforms?select=*&order=name.asc"),
    serviceRest(`creator_channels?owner_user_id=eq.${owner}&select=*&order=name.asc`),
    serviceRest(`creator_platform_presentations?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_publish_packages?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_qa_reports?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=created_at.desc`),
    serviceRest(`creator_publications?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=created_at.desc`),
    serviceRest(`creator_publication_metric_snapshots?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=captured_at.desc`),
    serviceRest(`creator_performance_reports?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_learnings?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
  ]);
  return { project, files, languageTracks, scopedArtifacts, events, releases, fileLocations, devices, researchSources, assets, visualMasters, visualSegments, visualSegmentProjections, assetCoverage, variants, variantLanguageTracks, platforms, channels, platformPresentations, publishPackages, qaReports, publications, metricSnapshots, performanceReports, learnings };
}

function assertMetadataOnly(value: unknown, path = "body", depth = 0) {
  if (depth > 32) fail(`${path} is too deeply nested`, 400);
  if (typeof value === "string" && /^data:(?:audio|video|image|application\/octet-stream)[/;,]/i.test(value.trim())) {
    fail(`${path} contains an embedded media payload; Creator cloud state is metadata-only`, 400);
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) assertMetadataOnly(value[index], `${path}[${index}]`, depth + 1);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value as JsonMap)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (FORBIDDEN_MEDIA_KEYS.has(normalized) && child != null) fail(`${path}.${key} is not accepted; Creator cloud state is metadata-only`, 400);
    assertMetadataOnly(child, `${path}.${key}`, depth + 1);
  }
}
async function saveScopedArtifact(userId: string, body: JsonMap) {
  assertMetadataOnly(body);
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const scope = artifactIdentity(projectId, body); const fileKey = requiredText(body.fileKey, "fileKey", 220);
  const relativePath = normalizeRelativePath(body.relativePath); const metadata = boundedJson(asObject(body.metadata), "metadata") as JsonMap;
  const checksum = boundedText(body.checksum, 300) || null;
  if (checksum && !/^sha256:[a-f0-9]{64}$/i.test(checksum)) fail("checksum must be sha256:<64 hex characters>");
  if (scope.artifactScopeType === "language_track" && fileKey === "AUDIO_MASTER") {
    if (metadata.timing_provenance !== "real_audio") fail("AUDIO_MASTER requires timing_provenance=real_audio");
    if (!checksum) fail("AUDIO_MASTER requires a real local file SHA-256 checksum");
  }
  const row: JsonMap = {
    project_id: projectId, owner_user_id: userId, artifact_scope_type: scope.artifactScopeType, artifact_scope_id: scope.artifactScopeId,
    file_key: fileKey, relative_path: relativePath, kind: boundedText(body.kind, 80) || "other", status: boundedText(body.status, 80) || "Missing",
    storage_provider: boundedText(body.storageProvider, 80) || "local", provider_file_id: boundedText(body.providerFileId, 500) || null,
    provider_url: boundedText(body.providerUrl, 2000) || null, filename: boundedText(body.filename, 300) || relativePath.split("/").pop() || null,
    mime_type: boundedText(body.mimeType, 240) || null, size_bytes: nonnegativeIntegerOrNull(body.sizeBytes), checksum,
    metadata,
  };
  const artifact = await upsertReturning("creator_project_files", "project_id,artifact_scope_type,artifact_scope_id,file_key", row);
  return { artifact };
}

async function saveResearchSource(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const sourceKey = requiredText(body.sourceKey, "sourceKey", 160); const sourceUrl = httpsUrlOrNull(body.sourceUrl, "sourceUrl");
  const row: JsonMap = {
    project_id: projectId, owner_user_id: userId, source_key: sourceKey, source_kind: boundedText(body.sourceKind, 80) || "official", source_url: sourceUrl,
    version_context: boundedText(body.versionContext, 300) || null, last_checked_at: timestampOrNull(body.lastCheckedAt), source_updated_at: timestampOrNull(body.sourceUpdatedAt),
    fact_snapshot: boundedJson(asObject(body.factSnapshot), "factSnapshot"), is_stale: booleanValue(body.isStale, "isStale"), revalidation_required: booleanValue(body.revalidationRequired, "revalidationRequired"),
    source_change_note: boundedText(body.sourceChangeNote, 1200) || null, metadata: boundedJson(asObject(body.metadata), "metadata"),
  };
  return { researchSource: await upsertReturning("creator_research_sources", "project_id,owner_user_id,source_key", row) };
}

async function saveAsset(userId: string, body: JsonMap) {
  assertMetadataOnly(body);
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const rawPath = boundedText(body.relativePath, 1200); const relativePath = rawPath ? normalizeRelativePath(rawPath) : null;
  const sourceUrl = httpsUrlOrNull(body.sourceUrl, "sourceUrl");
  const row: JsonMap = {
    project_id: projectId, owner_user_id: userId, asset_key: requiredText(body.assetKey, "assetKey", 160), asset_type: requiredText(body.assetType, "assetType", 80),
    label: boundedText(body.label, 240), relative_path: relativePath, source_name: boundedText(body.sourceName, 240) || null, source_url: sourceUrl,
    rights_status: boundedText(body.rightsStatus, 80) || "unknown", evidence_grade: boundedText(body.evidenceGrade, 80) || "unknown", quality_status: boundedText(body.qualityStatus, 80) || "unreviewed",
    horizontal_compatible: optionalBoolean(body.horizontalCompatible, "horizontalCompatible"), vertical_compatible: optionalBoolean(body.verticalCompatible, "verticalCompatible"),
    reusable: booleanValue(body.reusable, "reusable"), semantic_tags: boundedTextArray(body.semanticTags, "semanticTags"), clip_metadata: boundedJson(asObject(body.clipMetadata), "clipMetadata"), metadata: boundedJson(asObject(body.metadata), "metadata"),
  };
  return { asset: await upsertReturning("creator_assets", "project_id,owner_user_id,asset_key", row) };
}

async function saveLanguageTrack(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const status = enumValue(body.status, LANGUAGE_WORKFLOW_STATES, "Language Track status", "DRAFT");
  if (["SCRIPT_LOCKED", "AUDIO_LOCKED", "TIMELINE_LOCKED", "READY"].includes(status)) fail("Locked/ready Language Track states require the explicit humanLock workflow", 409);
  const provenance = boundedText(body.timingProvenance, 80) || null; if (provenance && provenance !== "real_audio") fail("timingProvenance must be real_audio or null");
  const row: JsonMap = {
    project_id: projectId, owner_user_id: userId, track_key: requiredText(body.trackKey, "trackKey", 160), language_code: requiredText(body.languageCode, "languageCode", 80),
    label: boundedText(body.label, 240), is_source: booleanValue(body.isSource, "isSource"), status, timing_provenance: provenance,
    alignment_status: enumValue(body.alignmentStatus, LANGUAGE_ALIGNMENT_STATES, "alignmentStatus", "PENDING"), metadata: boundedJson(asObject(body.metadata), "metadata"),
  };
  const requestedId = uuidOrNull(body.languageTrackId, "languageTrackId");
  if (!requestedId) return { languageTrack: await upsertReturning("creator_language_tracks", "project_id,owner_user_id,track_key", row) };
  const existing = await ownedEntity("creator_language_tracks", "language_track_id", requestedId, userId, projectId);
  const expectedRevision = Number(body.expectedRevision); if (Number.isInteger(expectedRevision) && Number(existing.revision) !== expectedRevision) fail("Language Track revision conflict", 409);
  return { languageTrack: await patchReturning("creator_language_tracks", `language_track_id=eq.${requestedId}&owner_user_id=eq.${encodeURIComponent(userId)}&revision=eq.${Number(existing.revision)}`, row) };
}

async function saveVisualMaster(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const status = enumValue(body.status, VISUAL_MASTER_STATES, "Visual Master status", "DRAFT");
  if (status === "LOCKED") fail("Visual Master LOCKED requires the explicit humanLock workflow", 409);
  const row: JsonMap = { project_id: projectId, owner_user_id: userId, visual_master_key: requiredText(body.visualMasterKey, "visualMasterKey", 160), label: boundedText(body.label, 240), status, metadata: boundedJson(asObject(body.metadata), "metadata") };
  const requestedId = uuidOrNull(body.visualMasterId, "visualMasterId");
  if (!requestedId) return { visualMaster: await upsertReturning("creator_visual_masters", "project_id,owner_user_id,visual_master_key", row) };
  const existing = await ownedEntity("creator_visual_masters", "visual_master_id", requestedId, userId, projectId);
  const expectedRevision = Number(body.expectedRevision); if (Number.isInteger(expectedRevision) && Number(existing.revision) !== expectedRevision) fail("Visual Master revision conflict", 409);
  return { visualMaster: await patchReturning("creator_visual_masters", `visual_master_id=eq.${requestedId}&owner_user_id=eq.${encodeURIComponent(userId)}&revision=eq.${Number(existing.revision)}`, row) };
}

async function saveVisualSegment(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const visualMasterId = uuidOrNull(body.visualMasterId, "visualMasterId"); if (!visualMasterId) fail("visualMasterId is required");
  await ownedEntity("creator_visual_masters", "visual_master_id", visualMasterId, userId, projectId);
  const sequenceNo = Number(body.sequenceNo); if (!Number.isSafeInteger(sequenceNo) || sequenceNo < 1) fail("sequenceNo must be a positive integer");
  const row: JsonMap = { visual_master_id: visualMasterId, project_id: projectId, owner_user_id: userId, semantic_anchor: requiredText(body.semanticAnchor, "semanticAnchor", 240), sequence_no: sequenceNo, visual_intent: requiredText(body.visualIntent, "visualIntent", 4000), evidence_requirement: boundedText(body.evidenceRequirement, 2000) || null, asset_references: boundedJson(Array.isArray(body.assetReferences) ? body.assetReferences : [], "assetReferences"), metadata: boundedJson(asObject(body.metadata), "metadata") };
  const segmentId = uuidOrNull(body.visualSegmentId, "visualSegmentId");
  if (!segmentId) return { visualSegment: await insertReturning("creator_visual_segments", row) };
  await ownedEntity("creator_visual_segments", "visual_segment_id", segmentId, userId, projectId);
  return { visualSegment: await patchReturning("creator_visual_segments", `visual_segment_id=eq.${segmentId}&owner_user_id=eq.${encodeURIComponent(userId)}`, row) };
}

async function saveVisualProjection(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const visualSegmentId = uuidOrNull(body.visualSegmentId, "visualSegmentId"); const languageTrackId = uuidOrNull(body.languageTrackId, "languageTrackId");
  if (!visualSegmentId || !languageTrackId) fail("visualSegmentId and languageTrackId are required");
  await Promise.all([ownedEntity("creator_visual_segments", "visual_segment_id", visualSegmentId, userId, projectId), ownedEntity("creator_language_tracks", "language_track_id", languageTrackId, userId, projectId)]);
  const startMs = Number(body.startMs); const endMs = Number(body.endMs); if (!Number.isSafeInteger(startMs) || startMs < 0 || !Number.isSafeInteger(endMs) || endMs <= startMs) fail("Projection timing must be real non-negative milliseconds with endMs > startMs");
  const row: JsonMap = { visual_segment_id: visualSegmentId, language_track_id: languageTrackId, project_id: projectId, owner_user_id: userId, start_ms: startMs, end_ms: endMs, metadata: boundedJson(asObject(body.metadata), "metadata") };
  return { visualProjection: await upsertReturning("creator_visual_segment_projections", "visual_segment_id,language_track_id", row) };
}

async function saveAssetCoverage(userId: string, body: JsonMap) {
  const allowed = new Set(["MATCHED", "BROLL", "MISSING", "PIXEL_ANIMATION", "DIAGRAM", "ADDITIONAL_RECORDING"]);
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const visualSegmentId = uuidOrNull(body.visualSegmentId, "visualSegmentId"); const assetId = uuidOrNull(body.assetId, "assetId");
  if (visualSegmentId) await ownedEntity("creator_visual_segments", "visual_segment_id", visualSegmentId, userId, projectId);
  if (assetId) await ownedEntity("creator_assets", "asset_id", assetId, userId, projectId);
  const row: JsonMap = { project_id: projectId, owner_user_id: userId, visual_segment_id: visualSegmentId, asset_id: assetId, semantic_anchor: requiredText(body.semanticAnchor, "semanticAnchor", 240), coverage_status: enumValue(body.coverageStatus, allowed, "coverageStatus"), notes: boundedText(body.notes, 2000) || null, metadata: boundedJson(asObject(body.metadata), "metadata") };
  const coverageId = uuidOrNull(body.coverageId, "coverageId");
  if (!coverageId) return { assetCoverage: await insertReturning("creator_asset_coverage", row) };
  await ownedEntity("creator_asset_coverage", "coverage_id", coverageId, userId, projectId);
  return { assetCoverage: await patchReturning("creator_asset_coverage", `coverage_id=eq.${coverageId}&owner_user_id=eq.${encodeURIComponent(userId)}`, row) };
}

async function variantHasPlatformLock(userId: string, variantId: string) {
  const rows = await serviceRest(`creator_publish_packages?owner_user_id=eq.${encodeURIComponent(userId)}&variant_id=eq.${encodeURIComponent(variantId)}&platform_locked_at=not.is.null&select=publish_package_id&limit=1`) as Array<JsonMap>;
  return Array.isArray(rows) && rows.length > 0;
}
async function saveVariant(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const visualMasterId = uuidOrNull(body.visualMasterId, "visualMasterId"); if (!visualMasterId) fail("visualMasterId is required");
  await ownedEntity("creator_visual_masters", "visual_master_id", visualMasterId, userId, projectId);
  const status = enumValue(body.status, VARIANT_STATES, "Variant status", "DRAFT");
  if (["LOCKED", "RELEASE_READY"].includes(status)) fail("Variant lock/readiness is derived from the Publish Package gates", 409);
  const row: JsonMap = {
    project_id: projectId, owner_user_id: userId, variant_key: requiredText(body.variantKey, "variantKey", 160), label: boundedText(body.label, 240), status,
    visual_master_id: visualMasterId, output_profile: boundedText(body.outputProfile, 160) || null, market: boundedText(body.market, 120) || null, format: boundedText(body.format, 120) || null,
    metadata: boundedJson(asObject(body.metadata), "metadata"),
  };
  const requestedId = uuidOrNull(body.variantId, "variantId"); let variant: JsonMap;
  if (requestedId) {
    const existing = await ownedEntity("creator_variants", "variant_id", requestedId, userId, projectId);
    if (await variantHasPlatformLock(userId, requestedId)) fail("Platform-locked Variant composition is immutable; create a new Publish Package/Variant revision", 409);
    const expectedRevision = Number(body.expectedRevision); if (Number.isInteger(expectedRevision) && Number(existing.revision) !== expectedRevision) fail("Variant revision conflict", 409);
    variant = await patchReturning("creator_variants", `variant_id=eq.${requestedId}&owner_user_id=eq.${encodeURIComponent(userId)}&revision=eq.${Number(existing.revision)}`, row);
  } else variant = await upsertReturning("creator_variants", "project_id,owner_user_id,variant_key", row);

  if (body.languageTracks != null) {
    if (!Array.isArray(body.languageTracks) || !body.languageTracks.length) fail("A Variant composition requires at least one Language Track");
    if (body.languageTracks.length > 30) fail("Variant language composition is too large", 413);
    if (await variantHasPlatformLock(userId, String(variant.variant_id))) fail("Platform-locked Variant composition is immutable", 409);
    const composition: JsonMap[] = [];
    for (let index = 0; index < body.languageTracks.length; index += 1) {
      const input = asObject(body.languageTracks[index]); const languageTrackId = uuidOrNull(input.languageTrackId, "languageTrackId"); if (!languageTrackId) fail("languageTrackId is required");
      await ownedEntity("creator_language_tracks", "language_track_id", languageTrackId, userId, projectId);
      composition.push({ variant_id: variant.variant_id, language_track_id: languageTrackId, project_id: projectId, owner_user_id: userId, audio_role: boundedText(input.audioRole, 80) || (index === 0 ? "primary" : "alternate"), subtitle_role: boundedText(input.subtitleRole, 80) || "default", sequence_no: index + 1, metadata: boundedJson(asObject(input.metadata), "languageTrack metadata") });
    }
    await serviceRest(`creator_variant_language_tracks?variant_id=eq.${encodeURIComponent(String(variant.variant_id))}&owner_user_id=eq.${encodeURIComponent(userId)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await serviceRest("creator_variant_language_tracks", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(composition) });
  }
  const composition = await serviceRest(`creator_variant_language_tracks?variant_id=eq.${encodeURIComponent(String(variant.variant_id))}&owner_user_id=eq.${encodeURIComponent(userId)}&select=*&order=sequence_no.asc`);
  return { variant, languageTracks: composition };
}

async function saveChannel(userId: string, body: JsonMap) {
  const platformId = uuidOrNull(body.platformId, "platformId"); if (!platformId) fail("platformId is required");
  const platforms = await serviceRest(`platforms?id=eq.${platformId}&select=id&limit=1`) as Array<JsonMap>; if (!Array.isArray(platforms) || !platforms.length) fail("Platform not found", 404);
  const row: JsonMap = {
    owner_user_id: userId, platform_id: platformId, channel_key: requiredText(body.channelKey, "channelKey", 160), name: requiredText(body.name, "name", 240),
    account_label: boundedText(body.accountLabel, 240), market: boundedText(body.market, 120) || "Global", primary_language: boundedText(body.primaryLanguage, 80) || null,
    language_mode: boundedText(body.languageMode, 80) || "single_language", supported_languages: boundedTextArray(body.supportedLanguages, "supportedLanguages", 30, 80),
    status: boundedText(body.status, 80) || "active", metadata: boundedJson(asObject(body.metadata), "metadata"),
  };
  const channelId = uuidOrNull(body.channelId, "channelId");
  if (!channelId) return { channel: await upsertReturning("creator_channels", "owner_user_id,channel_key", row) };
  await ownedEntity("creator_channels", "channel_id", channelId, userId);
  return { channel: await patchReturning("creator_channels", `channel_id=eq.${channelId}&owner_user_id=eq.${encodeURIComponent(userId)}`, row) };
}

async function savePlatformPresentation(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const variantId = uuidOrNull(body.variantId, "variantId"); const platformId = uuidOrNull(body.platformId, "platformId"); if (!variantId || !platformId) fail("variantId and platformId are required");
  await ownedEntity("creator_variants", "variant_id", variantId, userId, projectId);
  const platforms = await serviceRest(`platforms?id=eq.${platformId}&select=id&limit=1`) as Array<JsonMap>; if (!Array.isArray(platforms) || !platforms.length) fail("Platform not found", 404);
  const thumbnailArtifactId = uuidOrNull(body.thumbnailArtifactId, "thumbnailArtifactId"); if (thumbnailArtifactId) await ownedEntity("creator_project_files", "id", thumbnailArtifactId, userId, projectId);
  const row: JsonMap = {
    variant_id: variantId, project_id: projectId, owner_user_id: userId, platform_id: platformId, title: boundedText(body.title, 500), description: boundedText(body.description, 10_000),
    tags: boundedTextArray(body.tags, "tags", 100, 240), chapters: boundedJson(Array.isArray(body.chapters) ? body.chapters : [], "chapters"),
    language_metadata: boundedJson(asObject(body.languageMetadata), "languageMetadata"), market_metadata: boundedJson(asObject(body.marketMetadata), "marketMetadata"),
    export_profile: boundedJson(asObject(body.exportProfile), "exportProfile"), platform_metadata: boundedJson(asObject(body.platformMetadata), "platformMetadata"), thumbnail_artifact_id: thumbnailArtifactId,
  };
  const presentationId = uuidOrNull(body.presentationId, "presentationId");
  if (!presentationId) return { platformPresentation: await upsertReturning("creator_platform_presentations", "variant_id,platform_id", row) };
  const existing = await ownedEntity("creator_platform_presentations", "presentation_id", presentationId, userId, projectId);
  const expectedRevision = Number(body.expectedRevision); if (Number.isInteger(expectedRevision) && Number(existing.revision) !== expectedRevision) fail("Platform Presentation revision conflict", 409);
  return { platformPresentation: await patchReturning("creator_platform_presentations", `presentation_id=eq.${presentationId}&owner_user_id=eq.${encodeURIComponent(userId)}&revision=eq.${Number(existing.revision)}`, row) };
}

function validatePackageManifest(manifest: JsonMap, variantId: string, presentationId: string, channelId: string) {
  const errors: string[] = [];
  if (manifest.variantId !== variantId) errors.push("manifest.variantId must match Variant");
  if (manifest.presentationId !== presentationId) errors.push("manifest.presentationId must match Platform Presentation");
  if (manifest.channelId !== channelId) errors.push("manifest.channelId must match Channel");
  const output = asObject(manifest.outputArtifact);
  if (output.scopeType !== "variant" || output.scopeId !== variantId || !boundedText(output.fileKey, 220)) errors.push("manifest.outputArtifact must identify a Variant-scoped artifact");
  if (!boundedText(output.relativePath, 1200)) errors.push("manifest.outputArtifact.relativePath is required");
  if (!/^sha256:[a-f0-9]{64}$/i.test(boundedText(output.checksum, 300))) errors.push("manifest.outputArtifact.checksum must be sha256:<64 hex characters>");
  const languageTrackIds = Array.isArray(manifest.languageTrackIds) ? manifest.languageTrackIds : [];
  if (!languageTrackIds.length) errors.push("manifest.languageTrackIds is required");
  if (!Object.keys(asObject(manifest.exportProfile)).length) errors.push("manifest.exportProfile is required");
  return errors;
}
async function savePublishPackage(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const variantId = uuidOrNull(body.variantId, "variantId"); const presentationId = uuidOrNull(body.presentationId, "presentationId"); const channelId = uuidOrNull(body.channelId, "channelId");
  if (!variantId || !presentationId || !channelId) fail("variantId, presentationId and channelId are required");
  const [variant, presentation, channel] = await Promise.all([ownedEntity("creator_variants", "variant_id", variantId, userId, projectId), ownedEntity("creator_platform_presentations", "presentation_id", presentationId, userId, projectId), ownedEntity("creator_channels", "channel_id", channelId, userId)]);
  if (presentation.variant_id !== variantId) fail("Platform Presentation does not belong to Variant", 409);
  if (presentation.platform_id !== channel.platform_id) fail("Channel platform does not match Platform Presentation", 409);
  const manifest = boundedJson(asObject(body.packageManifest), "packageManifest") as JsonMap; const errors = validatePackageManifest(manifest, variantId, presentationId, channelId);
  const languageTrackIds = Array.isArray(manifest.languageTrackIds) ? manifest.languageTrackIds.map((value) => uuidOrNull(value, "manifest languageTrackId")) : [];
  const composition = await serviceRest(`creator_variant_language_tracks?variant_id=eq.${variantId}&owner_user_id=eq.${encodeURIComponent(userId)}&select=language_track_id`) as Array<JsonMap>;
  const composed = new Set((Array.isArray(composition) ? composition : []).map((row) => String(row.language_track_id)));
  if (languageTrackIds.some((id) => !id || !composed.has(String(id)))) errors.push("manifest Language Tracks must belong to Variant composition");
  const readyTracks = languageTrackIds.length ? await serviceRest(`creator_language_tracks?project_id=eq.${encodeURIComponent(projectId)}&owner_user_id=eq.${encodeURIComponent(userId)}&language_track_id=in.(${languageTrackIds.map((id) => encodeURIComponent(String(id))).join(",")})&select=language_track_id,status,voice_timeline_locked_at`) as Array<JsonMap> : [];
  if (!languageTrackIds.length || readyTracks.length !== languageTrackIds.length || readyTracks.some((track) => track.status !== "READY" || !track.voice_timeline_locked_at)) errors.push("All package Language Tracks must be Voice/Timeline locked and READY");
  const visualMasterId = uuidOrNull(variant.visual_master_id, "visualMasterId");
  const visualMaster = visualMasterId ? await ownedEntity("creator_visual_masters", "visual_master_id", visualMasterId, userId, projectId) : {};
  if (!visualMaster.master_render_locked_at) errors.push("Visual Master Render Lock is required");
  const output = asObject(manifest.outputArtifact); const artifactRows = await serviceRest(`creator_project_files?project_id=eq.${encodeURIComponent(projectId)}&owner_user_id=eq.${encodeURIComponent(userId)}&artifact_scope_type=eq.variant&artifact_scope_id=eq.${variantId}&file_key=eq.${encodeURIComponent(boundedText(output.fileKey, 220))}&select=id,status,relative_path,checksum&limit=1`) as Array<JsonMap>;
  if (!Array.isArray(artifactRows) || !artifactRows.length) errors.push("Variant output artifact is not registered");
  else {
    if (String(artifactRows[0].relative_path) !== String(output.relativePath)) errors.push("Variant output artifact path does not match registry");
    if (!["ready", "present", "available", "locked"].includes(String(artifactRows[0].status || "").toLowerCase())) errors.push("Variant output artifact is not ready");
    if (boundedText(artifactRows[0].checksum, 300) !== boundedText(output.checksum, 300)) errors.push("Variant output artifact checksum does not match registry");
  }
  const row: JsonMap = { project_id: projectId, owner_user_id: userId, package_key: requiredText(body.packageKey, "packageKey", 160), variant_id: variantId, presentation_id: presentationId, channel_id: channelId, package_manifest: manifest, validation_status: errors.length ? "INVALID" : "VALID", validation_errors: errors, metadata: boundedJson(asObject(body.metadata), "metadata") };
  const packageId = uuidOrNull(body.publishPackageId, "publishPackageId");
  let publishPackage: JsonMap;
  if (!packageId) publishPackage = await upsertReturning("creator_publish_packages", "project_id,owner_user_id,package_key", row);
  else {
    const existing = await ownedEntity("creator_publish_packages", "publish_package_id", packageId, userId, projectId);
    const expectedRevision = Number(body.expectedRevision); if (Number.isInteger(expectedRevision) && Number(existing.package_revision) !== expectedRevision) fail("Publish Package revision conflict", 409);
    publishPackage = await patchReturning("creator_publish_packages", `publish_package_id=eq.${packageId}&owner_user_id=eq.${encodeURIComponent(userId)}&package_revision=eq.${Number(existing.package_revision)}`, row);
  }
  return { publishPackage, validation: { status: errors.length ? "INVALID" : "VALID", errors }, variantRevision: variant.revision, presentationRevision: presentation.revision };
}

async function humanLock(userId: string, body: JsonMap) {
  if (body.humanConfirmed !== true || body.source !== "human_ui") fail("Explicit confirmation from the human UI is required; AI and automation cannot operate human locks", 403);
  const scopeType = requiredText(body.scopeType, "scopeType", 80); const scopeId = requiredText(body.scopeId, "scopeId", 220); const lockType = requiredText(body.lockType, "lockType", 100);
  const allowed: Record<string, Set<string>> = {
    project: new Set(["project_scope", "evidence_snapshot", "master_script"]),
    language_track: new Set(["language_script", "voice_timeline"]),
    visual_master: new Set(["visual_master", "edit_plan", "master_render"]),
    publish_package: new Set(["platform_variant", "human_final_review", "release"]),
    publication: new Set(["final_publish_confirmation"]),
  };
  if (!allowed[scopeType]?.has(lockType)) fail("Unsupported human lock scope/type");
  const expectedRevision = Number(body.expectedRevision); if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) fail("expectedRevision is required");
  const reason = requiredText(body.reason, "reason", 1000); const locked = booleanValue(body.locked, "locked", true);
  if (["human_final_review", "release"].includes(lockType) && !locked) fail(`${lockType} is a one-way human completion gate`);
  const result = await serviceRest("rpc/app_creator_human_lock", { method: "POST", body: JSON.stringify({ p_owner_user_id: userId, p_scope_type: scopeType, p_scope_id: scopeId, p_lock_type: lockType, p_locked: locked, p_expected_revision: expectedRevision, p_confirmed_by_human: true, p_reason: reason }) });
  return { ...asObject(result), humanGate: { scopeType, scopeId, lockType, locked, reason } };
}

async function runAiQa(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const publishPackageId = uuidOrNull(body.publishPackageId, "publishPackageId"); if (!publishPackageId) fail("publishPackageId is required");
  const publishPackage = await ownedEntity("creator_publish_packages", "publish_package_id", publishPackageId, userId, projectId);
  const checks: JsonMap[] = [];
  function check(key: string, pass: boolean, detail: string) { checks.push({ key, status: pass ? "PASS" : "BLOCKED", detail }); }
  check("PACKAGE_VALID", publishPackage.validation_status === "VALID", "Server-validated package manifest");
  check("PLATFORM_LOCK", Boolean(publishPackage.platform_locked_at), "Human Platform Variant Lock");
  const manifest = asObject(publishPackage.package_manifest); const languageTrackIds = Array.isArray(manifest.languageTrackIds) ? manifest.languageTrackIds.map(String) : [];
  const tracks = languageTrackIds.length ? await serviceRest(`creator_language_tracks?project_id=eq.${encodeURIComponent(projectId)}&owner_user_id=eq.${encodeURIComponent(userId)}&language_track_id=in.(${languageTrackIds.map(encodeURIComponent).join(",")})&select=language_track_id,status,voice_timeline_locked_at`) as Array<JsonMap> : [];
  check("LANGUAGE_TRACKS_READY", languageTrackIds.length > 0 && tracks.length === languageTrackIds.length && tracks.every((track) => track.status === "READY" && track.voice_timeline_locked_at), "All composed Language Tracks are real-audio timeline locked");
  const variant = await ownedEntity("creator_variants", "variant_id", String(publishPackage.variant_id), userId, projectId); const visualMasterId = uuidOrNull(variant.visual_master_id, "visualMasterId");
  const visualMaster = visualMasterId ? await ownedEntity("creator_visual_masters", "visual_master_id", visualMasterId, userId, projectId) : {};
  check("MASTER_RENDER_LOCK", Boolean(visualMaster.master_render_locked_at), "Human Master Render Lock");
  const output = asObject(manifest.outputArtifact); const artifacts = await serviceRest(`creator_project_files?project_id=eq.${encodeURIComponent(projectId)}&owner_user_id=eq.${encodeURIComponent(userId)}&artifact_scope_type=eq.variant&artifact_scope_id=eq.${encodeURIComponent(String(publishPackage.variant_id))}&file_key=eq.${encodeURIComponent(boundedText(output.fileKey, 220))}&select=id,status,checksum,relative_path&limit=1`) as Array<JsonMap>;
  check("OUTPUT_REGISTERED", Array.isArray(artifacts) && artifacts.length === 1 && ["ready", "present", "available", "locked"].includes(String(artifacts[0].status || "").toLowerCase()), "Variant output is registered and ready");
  const modelFindings = Array.isArray(body.findings) ? boundedJson(body.findings.slice(0, 100), "findings") as unknown[] : [];
  const blockingFindings = modelFindings.filter((finding) => String(asObject(finding).severity || "").toUpperCase() === "BLOCKER");
  const status = checks.every((entry) => entry.status === "PASS") && !blockingFindings.length ? "PASS" : "BLOCKED";
  const reportArtifactId = uuidOrNull(body.reportArtifactId, "reportArtifactId"); if (reportArtifactId) await ownedEntity("creator_project_files", "id", reportArtifactId, userId, projectId);
  const qaReport = await insertReturning("creator_qa_reports", { publish_package_id: publishPackageId, project_id: projectId, owner_user_id: userId, package_revision: publishPackage.package_revision, status, checks, findings: modelFindings, report_artifact_id: reportArtifactId, model_metadata: boundedJson(asObject(body.modelMetadata), "modelMetadata") });
  return { qaReport, status, checks, humanReviewRequired: status === "PASS" };
}

async function savePublication(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const requestedId = uuidOrNull(body.publicationId, "publicationId"); let existing: JsonMap | null = null;
  if (requestedId) existing = await ownedEntity("creator_publications", "publication_id", requestedId, userId, projectId);
  const publishPackageId = existing ? String(existing.publish_package_id) : uuidOrNull(body.publishPackageId, "publishPackageId");
  if (!publishPackageId) fail("publishPackageId is required");
  const publishPackage = await ownedEntity("creator_publish_packages", "publish_package_id", publishPackageId, userId, projectId);
  const variantId = existing ? String(existing.variant_id) : String(publishPackage.variant_id); const channelId = existing ? String(existing.channel_id) : String(publishPackage.channel_id);
  const mode = existing ? String(existing.publication_mode) : enumValue(body.publicationMode, PUBLICATION_MODES, "publicationMode", "INITIAL");
  const retryOf = mode === "RETRY" ? uuidOrNull(body.retryOfPublicationId, "retryOfPublicationId") : null;
  const repostOf = mode === "REPOST" ? uuidOrNull(body.repostOfPublicationId, "repostOfPublicationId") : null;
  if (!existing && mode === "RETRY" && !retryOf) fail("Retry Publication requires retryOfPublicationId");
  if (!existing && mode === "REPOST" && !repostOf) fail("Repost Publication requires repostOfPublicationId");
  const parentId = retryOf || repostOf; if (parentId) { const parent = await ownedEntity("creator_publications", "publication_id", parentId, userId, projectId); if (parent.variant_id !== variantId || parent.channel_id !== channelId) fail("Retry/Repost must preserve Variant and Channel identity", 409); }
  const status = enumValue(body.status, PUBLICATION_STATES, "Publication status", "READY_TO_PUBLISH");
  const postUrl = httpsUrlOrNull(body.postUrl, "postUrl");
  const row: JsonMap = {
    project_id: projectId, owner_user_id: userId, publish_package_id: publishPackageId, variant_id: variantId, channel_id: channelId, publication_mode: mode,
    retry_of_publication_id: existing ? existing.retry_of_publication_id : retryOf, repost_of_publication_id: existing ? existing.repost_of_publication_id : repostOf,
    status, post_id: boundedText(body.postId, 500) || null, post_url: postUrl, scheduled_at: timestampOrNull(body.scheduledAt), published_at: timestampOrNull(body.publishedAt),
    failure_reason: boundedText(body.failureReason, 2000) || null, metadata: boundedJson(asObject(body.metadata), "metadata"),
  };
  if (!existing) return { publication: await insertReturning("creator_publications", row) };
  const expectedRevision = Number(body.expectedRevision); if (!Number.isSafeInteger(expectedRevision) || expectedRevision !== Number(existing.revision)) fail("Publication revision conflict", 409);
  return { publication: await patchReturning("creator_publications", `publication_id=eq.${requestedId}&owner_user_id=eq.${encodeURIComponent(userId)}&revision=eq.${expectedRevision}`, row) };
}

async function recordMetricSnapshot(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); const publicationId = uuidOrNull(body.publicationId, "publicationId"); if (!publicationId) fail("publicationId is required");
  const publication = await ownedEntity("creator_publications", "publication_id", publicationId, userId, projectId); if (publication.status !== "PUBLISHED") fail("Metrics require a PUBLISHED Publication", 409);
  function count(value: unknown, label: string) { const number = nonnegativeIntegerOrNull(value, label); return number == null ? null : number; }
  function rate(value: unknown, label: string) { const number = finiteNumberOrNull(value, label); if (number != null && (number < 0 || number > 1)) fail(`${label} must be between 0 and 1`); return number; }
  function duration(value: unknown, label: string) { const number = finiteNumberOrNull(value, label); if (number != null && number < 0) fail(`${label} must be non-negative`); return number; }
  const row: JsonMap = {
    publication_id: publicationId, project_id: projectId, owner_user_id: userId, captured_at: timestampOrNull(body.capturedAt) || new Date().toISOString(), provider: requiredText(body.provider, "provider", 120),
    views: count(body.views, "views"), likes: count(body.likes, "likes"), comments: count(body.comments, "comments"), shares: count(body.shares, "shares"), saves: count(body.saves, "saves"),
    watch_time_seconds: duration(body.watchTimeSeconds, "watchTimeSeconds"), average_view_duration_seconds: duration(body.averageViewDurationSeconds, "averageViewDurationSeconds"),
    retention_rate: rate(body.retentionRate, "retentionRate"), ctr: rate(body.ctr, "ctr"), followers_gained: count(body.followersGained, "followersGained"), raw_snapshot: boundedJson(asObject(body.rawSnapshot), "rawSnapshot"),
  };
  return { metricSnapshot: await upsertReturning("creator_publication_metric_snapshots", "publication_id,captured_at,provider", row) };
}

async function savePerformanceReport(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const variantId = uuidOrNull(body.variantId, "variantId"); if (!variantId) fail("variantId is required"); await ownedEntity("creator_variants", "variant_id", variantId, userId, projectId);
  const publicationId = uuidOrNull(body.publicationId, "publicationId"); if (publicationId) await ownedEntity("creator_publications", "publication_id", publicationId, userId, projectId);
  const reportArtifactId = uuidOrNull(body.reportArtifactId, "reportArtifactId"); if (reportArtifactId) await ownedEntity("creator_project_files", "id", reportArtifactId, userId, projectId);
  const windowStart = timestampOrNull(body.windowStart); const windowEnd = timestampOrNull(body.windowEnd); const capturedThrough = timestampOrNull(body.metricsCapturedThrough);
  if (!windowStart || !windowEnd || !capturedThrough) fail("windowStart, windowEnd and metricsCapturedThrough are required timestamps"); if (Date.parse(windowEnd) < Date.parse(windowStart)) fail("windowEnd must not precede windowStart");
  const row: JsonMap = { project_id: projectId, owner_user_id: userId, report_key: requiredText(body.reportKey, "reportKey", 160), variant_id: variantId, publication_id: publicationId, window_start: windowStart, window_end: windowEnd, metrics_captured_through: capturedThrough, report: boundedJson(asObject(body.report), "report"), report_artifact_id: reportArtifactId };
  return { performanceReport: await upsertReturning("creator_performance_reports", "project_id,owner_user_id,report_key", row) };
}

async function saveLearningProposal(userId: string, body: JsonMap) {
  const projectId = requiredText(body.projectId, "projectId", 220); await ownedProject(projectId, userId);
  const performanceReportId = uuidOrNull(body.performanceReportId, "performanceReportId"); if (!performanceReportId) fail("performanceReportId is required"); await ownedEntity("creator_performance_reports", "performance_report_id", performanceReportId, userId, projectId);
  const supersedesLearningId = uuidOrNull(body.supersedesLearningId, "supersedesLearningId"); if (supersedesLearningId) await ownedEntity("creator_learnings", "learning_id", supersedesLearningId, userId);
  const confidence = finiteNumberOrNull(body.confidence, "confidence"); if (confidence != null && (confidence < 0 || confidence > 1)) fail("confidence must be between 0 and 1");
  const row: JsonMap = { project_id: projectId, owner_user_id: userId, learning_key: requiredText(body.learningKey, "learningKey", 160), performance_report_id: performanceReportId, category: requiredText(body.category, "category", 120), status: "PROPOSED", proposal: boundedJson(asObject(body.proposal), "proposal"), confidence, supersedes_learning_id: supersedesLearningId };
  return { learning: await upsertReturning("creator_learnings", "project_id,owner_user_id,learning_key", row), humanReviewRequired: true };
}
async function reviewLearning(userId: string, body: JsonMap) {
  if (body.humanConfirmed !== true || body.source !== "human_ui") fail("Learning review requires explicit confirmation from the human UI", 403);
  const learningId = uuidOrNull(body.learningId, "learningId"); if (!learningId) fail("learningId is required");
  const decision = enumValue(body.decision, new Set(["ACCEPTED", "REJECTED"]), "learning decision");
  return asObject(await serviceRest("rpc/app_creator_review_learning", { method: "POST", body: JSON.stringify({ p_owner_user_id: userId, p_learning_id: learningId, p_decision: decision, p_review_note: boundedText(body.reviewNote, 2000), p_confirmed_by_human: true }) }));
}
async function acceptedLearnings(userId: string) {
  return { learnings: await serviceRest(`creator_learnings?owner_user_id=eq.${encodeURIComponent(userId)}&status=eq.ACCEPTED&select=*&order=reviewed_at.desc&limit=200`) };
}
async function saveRelease(userId: string, body: JsonMap) {
  const publishState = asObject(body.publishState); const source = asObject(publishState.source); const projectId = String(body.projectId || source.creatorProjectId || "").trim();
  if (!projectId) fail("projectId is required"); await ownedProject(projectId, userId);
  const execution = asObject(publishState.execution); const platforms = asObject(publishState.platforms); const snapshots = Array.isArray(publishState.snapshots) ? publishState.snapshots : []; const now = new Date().toISOString();
  const keys = new Set([...Object.keys(execution), ...Object.keys(platforms)]);
  const rows = [...keys].map((platform) => { const exec = asObject(execution[platform]); return {
    project_id: projectId, owner_user_id: userId, platform, status: String(exec.status || "draft"), post_url: exec.postUrl || null, post_id: exec.postId || null, published_at: exec.publishedAt || null,
    snapshot: { fields: asObject(platforms[platform]), execution: exec, metrics: snapshots.filter((item) => asObject(item).platform === platform).slice(-10) }, updated_at: now,
  }; });
  if (rows.length) await serviceRest("creator_project_releases?on_conflict=project_id,platform", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows) });
  return { projectId, releaseCount: rows.length };
}

function archiveFromProject(project: JsonMap) { return asObject(asObject(asObject(project.project_data).integration).archive); }
function archiveRevision(body: JsonMap, project: JsonMap) {
  const requested = Number(body.baseRevision);
  const current = Number(project.revision || 0);
  if (!Number.isInteger(requested) || requested < 1 || requested !== current) revisionConflict(project, current);
  return current;
}
function archiveBaseData(project: JsonMap) {
  const current = archiveFromProject(project);
  return { ...current, provider: current.provider || "google_drive", archiveVersion: Number(current.archiveVersion || ARCHIVE_VERSION), generatedAt: current.generatedAt || new Date().toISOString() };
}
async function patchArchiveProject(userId: string, project: JsonMap, baseRevision: number, archive: JsonMap, options: { currentState?: string; archivedAt?: string | null } = {}) {
  const now = new Date().toISOString();
  const projectData = structuredClone(asObject(project.project_data));
  const integration = { ...asObject(projectData.integration), archive };
  projectData.integration = integration;
  projectData.currentState = options.currentState || String(project.current_state || projectData.currentState || "PUBLISHED");
  projectData.updatedAt = now;
  const patch: JsonMap = { project_data: projectData, revision: baseRevision + 1, updated_at: now };
  if (options.currentState) patch.current_state = options.currentState;
  if (options.archivedAt !== undefined) patch.archived_at = options.archivedAt;
  const rows = await serviceRest(`creator_projects?project_id=eq.${encodeURIComponent(String(project.project_id))}&owner_user_id=eq.${encodeURIComponent(userId)}&revision=eq.${baseRevision}&select=*`, {
    method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch),
  }) as Array<JsonMap>;
  if (!Array.isArray(rows) || !rows.length) {
    const latest = await ownedProject(String(project.project_id), userId);
    revisionConflict(latest, Number(latest.revision || 0));
  }
  return rows[0];
}
function requireArchiveEligible(project: JsonMap) { if (!ARCHIVE_WORKFLOW_STATES.has(String(project.current_state || ""))) fail("Project Archive is available only for PUBLISHED or ARCHIVED projects", 409); }

async function requestArchive(userId: string, body: JsonMap) {
  const projectId = boundedText(body.projectId, 220); if (!projectId) fail("projectId is required");
  const project = await ownedProject(projectId, userId); requireArchiveEligible(project); const revision = archiveRevision(body, project);
  const previous = archiveBaseData(project);
  const archive = { ...previous, status: "pending", provider: "google_drive", archiveVersion: ARCHIVE_VERSION, requestedAt: new Date().toISOString(), lastError: null };
  const saved = await patchArchiveProject(userId, project, revision, archive);
  return { project: saved, revision: Number(saved.revision), archive: archiveFromProject(saved) };
}

async function beginArchiveGeneration(userId: string, body: JsonMap) {
  const projectId = boundedText(body.projectId, 220); if (!projectId) fail("projectId is required");
  const project = await ownedProject(projectId, userId); requireArchiveEligible(project); const revision = archiveRevision(body, project);
  const archive = { ...archiveBaseData(project), status: "generating", provider: "google_drive", archiveVersion: ARCHIVE_VERSION, generationStartedAt: new Date().toISOString(), lastError: null };
  const saved = await patchArchiveProject(userId, project, revision, archive);
  return { project: saved, revision: Number(saved.revision), archive: archiveFromProject(saved) };
}

async function recordArchiveGenerated(userId: string, body: JsonMap) {
  const projectId = boundedText(body.projectId, 220); if (!projectId) fail("projectId is required");
  const project = await ownedProject(projectId, userId); requireArchiveEligible(project); const revision = archiveRevision(body, project); const input = asObject(body.archive);
  const mainFilename = boundedText(input.mainFilename, 300); if (!mainFilename.endsWith(".md")) fail("Archive mainFilename must be Markdown");
  const totalBytes = nonnegativeIntegerOrNull(input.totalBytes); if (totalBytes != null && totalBytes > 20 * 1024 * 1024) fail("Archive package exceeds 20 MB policy");
  const fingerprint = boundedText(input.fingerprint, 300); if (!/^sha256:[0-9a-f]{64}$/i.test(fingerprint)) fail("Archive fingerprint must be SHA-256");
  const current = archiveFromProject(project);
  const unchanged = current.status === "generated"
    && Number(current.archiveVersion || 0) === ARCHIVE_VERSION
    && boundedText(current.mainFilename, 300) === mainFilename
    && Number(current.totalBytes ?? -1) === Number(totalBytes ?? -1)
    && boundedText(current.fingerprint, 300) === fingerprint;
  if (unchanged) return { project, revision: Number(project.revision || 0), archive: current, unchanged: true };
  const now = new Date().toISOString();
  const archive = { ...archiveBaseData(project), status: "generated", provider: "google_drive", archiveVersion: ARCHIVE_VERSION, generatedAt: timestampOrNull(input.generatedAt) || archiveBaseData(project).generatedAt, mainFilename, fingerprint, totalBytes, warnings: Array.isArray(input.warnings) ? input.warnings.slice(0, 50).map((item) => boundedText(item, 500)) : [], lastError: null, generatedRecordedAt: now };
  const saved = await patchArchiveProject(userId, project, revision, archive);
  await writeEvent(projectId, userId, "PROJECT_ARCHIVE_GENERATED", String(saved.current_state || project.current_state), { archiveVersion: ARCHIVE_VERSION, mainFilename, fingerprint, totalBytes, revision: saved.revision });
  return { project: saved, revision: Number(saved.revision), archive: archiveFromProject(saved), unchanged: false };
}

async function recordArchiveFailed(userId: string, body: JsonMap) {
  const projectId = boundedText(body.projectId, 220); if (!projectId) fail("projectId is required");
  const project = await ownedProject(projectId, userId); requireArchiveEligible(project); const revision = archiveRevision(body, project);
  const lastError = boundedText(body.error, 1200) || "Archive publisher failed";
  const archive = { ...archiveBaseData(project), status: "failed", failedAt: new Date().toISOString(), lastError };
  const saved = await patchArchiveProject(userId, project, revision, archive);
  await writeEvent(projectId, userId, "PROJECT_ARCHIVE_FAILED", String(saved.current_state || project.current_state), { error: lastError, revision: saved.revision });
  return { project: saved, revision: Number(saved.revision), archive: archiveFromProject(saved) };
}

async function recordArchivePublished(userId: string, body: JsonMap) {
  const projectId = boundedText(body.projectId, 220); if (!projectId) fail("projectId is required");
  const project = await ownedProject(projectId, userId); requireArchiveEligible(project); const revision = archiveRevision(body, project); const input = asObject(body.archive);
  const folderId = safeDriveId(input.folderId); const mainFileId = safeDriveId(input.mainFileId); const folderUrl = safeDriveUrl(input.folderUrl); const mainFileUrl = safeDriveUrl(input.mainFileUrl);
  const verifiedAt = timestampOrNull(input.verifiedAt); const publishedAt = timestampOrNull(input.publishedAt) || new Date().toISOString(); const checksum = boundedText(input.checksum, 300); const fingerprint = boundedText(input.fingerprint, 300);
  if (!folderId || !mainFileId || !folderUrl || !mainFileUrl || !verifiedAt || !checksum) fail("Remote verification metadata is incomplete; project cannot become ARCHIVED");
  if (fingerprint && !/^sha256:[0-9a-f]{64}$/i.test(fingerprint)) fail("Archive fingerprint must be SHA-256");
  const wasArchived = String(project.current_state) === "ARCHIVED"; const current = archiveFromProject(project);
  const unchanged = wasArchived
    && current.status === "published"
    && current.provider === "google_drive"
    && current.folderId === folderId
    && current.mainFileId === mainFileId
    && current.checksum === checksum
    && (!fingerprint || current.fingerprint === fingerprint);
  if (unchanged) return { project, revision: Number(project.revision || 0), archive: current, unchanged: true };
  const archive = { ...archiveBaseData(project), status: "published", provider: "google_drive", archiveVersion: ARCHIVE_VERSION, folderId, folderUrl, mainFileId, mainFileUrl, checksum, fingerprint: fingerprint || current.fingerprint || null, verifiedAt, publishedAt, warnings: Array.isArray(input.warnings) ? input.warnings.slice(0, 50).map((item) => boundedText(item, 500)) : [], lastError: null };
  const saved = await patchArchiveProject(userId, project, revision, archive, wasArchived ? { currentState: "ARCHIVED" } : { currentState: "ARCHIVED", archivedAt: verifiedAt });
  const eventType = wasArchived ? "PROJECT_ARCHIVE_UPDATED" : "PROJECT_ARCHIVE_PUBLISHED";
  await writeEvent(projectId, userId, eventType, "ARCHIVED", { provider: "google_drive", folderId, mainFileId, checksum, fingerprint: archive.fingerprint, verifiedAt, revision: saved.revision });
  if (!wasArchived) await writeEvent(projectId, userId, "STATE_CHANGED", "ARCHIVED", { from: "PUBLISHED", to: "ARCHIVED", reason: "drive_archive_remote_verified" });
  return { project: saved, revision: Number(saved.revision), archive: archiveFromProject(saved), unchanged: false };
}

async function manualArchiveOverride(userId: string, body: JsonMap) {
  const projectId = boundedText(body.projectId, 220); if (!projectId) fail("projectId is required");
  const project = await ownedProject(projectId, userId); requireArchiveEligible(project); const revision = archiveRevision(body, project); const reason = boundedText(body.reason, 1000);
  if (!reason) fail("Manual Archive Override requires an explicit reason");
  const wasArchived = String(project.current_state) === "ARCHIVED"; const now = new Date().toISOString();
  const archive = { ...archiveBaseData(project), status: "manual_override", provider: "manual", archiveVersion: ARCHIVE_VERSION, overrideReason: reason, overrideAt: now, lastError: null };
  const saved = await patchArchiveProject(userId, project, revision, archive, wasArchived ? { currentState: "ARCHIVED" } : { currentState: "ARCHIVED", archivedAt: now });
  await writeEvent(projectId, userId, "PROJECT_ARCHIVE_MANUAL_OVERRIDE", "ARCHIVED", { reason, revision: saved.revision });
  if (!wasArchived) await writeEvent(projectId, userId, "STATE_CHANGED", "ARCHIVED", { from: "PUBLISHED", to: "ARCHIVED", reason: "manual_archive_override" });
  return { project: saved, revision: Number(saved.revision), archive: archiveFromProject(saved) };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin"); if (origin && !allowedOrigins().has(origin)) return json(req, { error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) }); if (req.method !== "POST") return json(req, { error: "POST only" }, 405);
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) fail("Server configuration is incomplete", 500);
    const user = await verifyUser(req); const appUser = await requireActiveAppUser(user.id); const body = asObject(await req.json()); const action = String(body.action || "ping");
    if (GLOBAL_METADATA_ACTIONS.has(action)) assertMetadataOnly(body);
    if (action === "ping") return json(req, { ok: true, user: { id: user.id, email: user.email }, role: appUser.role });
    if (action === "dashboard") return json(req, await dashboard(user.id));
    if (action === "listProjects") return json(req, { projects: await listProjects(user.id) });
    if (action === "getProject") return json(req, await getProject(user.id, body));
    if (action === "getDevice") return json(req, await getDevice(user.id, body));
    if (action === "registerDevice") return json(req, await registerDevice(user.id, body));
    if (action === "saveFileLocation") return json(req, await saveFileLocation(user.id, body));
    if (action === "saveFileLocationsBatch") return json(req, await saveFileLocationsBatch(user.id, body));
    if (action === "saveProject") return json(req, await saveProject(user.id, body));
    if (action === "saveScopedArtifact") return json(req, await saveScopedArtifact(user.id, body));
    if (action === "saveResearchSource") return json(req, await saveResearchSource(user.id, body));
    if (action === "saveAsset") return json(req, await saveAsset(user.id, body));
    if (action === "saveLanguageTrack") return json(req, await saveLanguageTrack(user.id, body));
    if (action === "saveVisualMaster") return json(req, await saveVisualMaster(user.id, body));
    if (action === "saveVisualSegment") return json(req, await saveVisualSegment(user.id, body));
    if (action === "saveVisualProjection") return json(req, await saveVisualProjection(user.id, body));
    if (action === "saveAssetCoverage") return json(req, await saveAssetCoverage(user.id, body));
    if (action === "saveVariant") return json(req, await saveVariant(user.id, body));
    if (action === "saveChannel") return json(req, await saveChannel(user.id, body));
    if (action === "savePlatformPresentation") return json(req, await savePlatformPresentation(user.id, body));
    if (action === "savePublishPackage") return json(req, await savePublishPackage(user.id, body));
    if (action === "humanLock") return json(req, await humanLock(user.id, body));
    if (action === "runAiQa") return json(req, await runAiQa(user.id, body));
    if (action === "savePublication") return json(req, await savePublication(user.id, body));
    if (action === "recordMetricSnapshot") return json(req, await recordMetricSnapshot(user.id, body));
    if (action === "savePerformanceReport") return json(req, await savePerformanceReport(user.id, body));
    if (action === "saveLearningProposal") return json(req, await saveLearningProposal(user.id, body));
    if (action === "reviewLearning") return json(req, await reviewLearning(user.id, body));
    if (action === "acceptedLearnings") return json(req, await acceptedLearnings(user.id));
    if (action === "saveRelease") return json(req, await saveRelease(user.id, body));
    if (action === "requestArchive") return json(req, await requestArchive(user.id, body));
    if (action === "beginArchiveGeneration") return json(req, await beginArchiveGeneration(user.id, body));
    if (action === "recordArchiveGenerated") return json(req, await recordArchiveGenerated(user.id, body));
    if (action === "recordArchiveFailed") return json(req, await recordArchiveFailed(user.id, body));
    if (action === "recordArchivePublished") return json(req, await recordArchivePublished(user.id, body));
    if (action === "manualArchiveOverride") return json(req, await manualArchiveOverride(user.id, body));
    fail(`Unknown action: ${action}`, 400);
  } catch (error) {
    const problem = error as HttpError; console.error("creator-project-api", problem.message);
    return json(req, problem.payload || { error: problem.message || "Unexpected error" }, problem.status || 500);
  }
});
