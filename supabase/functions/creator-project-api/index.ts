type JsonMap = Record<string, unknown>;

type HttpError = Error & { status?: number; payload?: JsonMap };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const DEFAULT_ALLOWED_ORIGINS = new Set([
  "http://localhost:8000",
  "https://inertia77.github.io",
]);
const DEVICE_KINDS = new Set(["web", "desktop", "agent", "unknown"]);
const LOCATION_AVAILABILITY = new Set(["unknown", "present", "missing", "stale"]);

function allowedOrigins() {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);
}

function corsFor(req: Request) {
  const origin = req.headers.get("origin");
  const allowed = allowedOrigins();
  const allowOrigin = !origin ? "*" : allowed.has(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsFor(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

function fail(message: string, status = 400): never {
  const error = new Error(message) as HttpError;
  error.status = status;
  throw error;
}

function failWithPayload(message: string, status: number, payload: JsonMap): never {
  const error = new Error(message) as HttpError;
  error.status = status;
  error.payload = payload;
  throw error;
}

function tokenFrom(req: Request) {
  const header = req.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) fail("Missing Authorization bearer token", 401);
  return header.slice(7).trim();
}

async function verifyUser(req: Request) {
  const token = tokenFrom(req);
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
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
  if (text) {
    try { payload = JSON.parse(text); }
    catch { payload = text; }
  }
  if (!response.ok) {
    const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
    fail(`Database request failed (${response.status}): ${detail}`, response.status >= 500 ? 502 : response.status);
  }
  return payload;
}

async function requireActiveAppUser(userId: string) {
  const rows = await serviceRest(
    `app_users?user_id=eq.${encodeURIComponent(userId)}&is_active=eq.true&select=user_id,role&limit=1`,
  ) as Array<JsonMap>;
  if (!Array.isArray(rows) || !rows.length) fail("This account is not enabled for GUCC", 403);
  return rows[0];
}

async function rawProject(projectId: string) {
  const rows = await serviceRest(
    `creator_projects?project_id=eq.${encodeURIComponent(projectId)}&select=*`,
  ) as Array<JsonMap>;
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function ownedProject(projectId: string, ownerUserId: string) {
  const project = await rawProject(projectId);
  if (!project) fail("Creator project not found", 404);
  if (project.owner_user_id !== ownerUserId) fail("Creator project belongs to another account", 403);
  return project;
}

function asObject(value: unknown): JsonMap {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonMap : {};
}

function boundedText(value: unknown, max: number) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

function dateOrNull(value: unknown) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function timestampOrNull(value: unknown) {
  const text = String(value || "").trim();
  if (!text) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function nonnegativeIntegerOrNull(value: unknown) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) fail("sizeBytes must be a non-negative integer or null");
  return number;
}

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
  if (value && typeof value === "object") {
    const source = value as JsonMap;
    const result: JsonMap = {};
    for (const key of Object.keys(source).sort()) result[key] = canonicalJson(source[key]);
    return result;
  }
  return value;
}

function sameJson(a: unknown, b: unknown) {
  try { return JSON.stringify(canonicalJson(a ?? null)) === JSON.stringify(canonicalJson(b ?? null)); }
  catch { return false; }
}

function fileRows(project: JsonMap, ownerUserId: string, now: string) {
  const files = asObject(project.files);
  return Object.entries(files).map(([fileKey, raw]) => {
    const file = asObject(raw);
    return {
      project_id: String(project.projectId || ""),
      owner_user_id: ownerUserId,
      file_key: fileKey,
      relative_path: String(file.relativePath || ""),
      kind: String(file.kind || "other"),
      status: String(file.status || "Missing"),
      storage_provider: String(file.storageProvider || "local"),
      provider_file_id: file.providerFileId || null,
      provider_url: file.providerUrl || null,
      filename: file.filename || null,
      mime_type: file.mimeType || null,
      size_bytes: Number.isFinite(Number(file.size)) ? Number(file.size) : null,
      checksum: file.checksum || null,
      metadata: {
        notes: file.notes || "",
        sourceUpdatedAt: file.updatedAt || "",
      },
      updated_at: now,
    };
  });
}

function cloudRevision(project: JsonMap) {
  const integration = asObject(project.integration);
  const cloud = asObject(integration.cloud);
  const revision = Number(cloud.revision);
  return Number.isInteger(revision) && revision >= 0 ? revision : null;
}

function projectWithoutCloudMetadata(project: JsonMap) {
  const clean = structuredClone(project);
  const integration = asObject(clean.integration);
  if (Object.prototype.hasOwnProperty.call(integration, "cloud")) {
    const nextIntegration = { ...integration };
    delete nextIntegration.cloud;
    clean.integration = nextIntegration;
  }
  return clean;
}

function revisionConflict(project: JsonMap | null, currentRevision: number) {
  failWithPayload("Cloud project has a newer revision", 409, {
    error: "REVISION_CONFLICT",
    conflict: {
      currentRevision,
      project,
    },
  });
}

function inferredDeviceKind(deviceId: string, explicit: string) {
  if (DEVICE_KINDS.has(explicit)) return explicit;
  if (deviceId.startsWith("web_")) return "web";
  if (deviceId.startsWith("agent_")) return "agent";
  if (deviceId.startsWith("desktop_")) return "desktop";
  return "unknown";
}

async function touchDevice(userId: string, body: JsonMap) {
  const descriptor = asObject(body.device);
  const deviceId = boundedText(body.deviceId || descriptor.deviceId, 160);
  if (!deviceId) return null;
  const explicitKind = boundedText(descriptor.deviceKind || descriptor.kind, 32);
  const owner = encodeURIComponent(userId);
  const encodedId = encodeURIComponent(deviceId);
  const rows = await serviceRest(
    `creator_devices?owner_user_id=eq.${owner}&device_id=eq.${encodedId}&select=*&limit=1`,
  ) as Array<JsonMap>;
  const existing = Array.isArray(rows) && rows.length ? rows[0] : null;
  const now = new Date().toISOString();
  const label = boundedText(descriptor.label, 160) || boundedText(existing?.label, 160) || "GUCC Web";
  const patch: JsonMap = {
    label,
    device_kind: inferredDeviceKind(deviceId, explicitKind),
    last_seen_at: now,
  };
  const platform = boundedText(descriptor.platform, 240);
  const workspaceRoot = boundedText(descriptor.workspaceRoot, 1200);
  if (platform) patch.platform = platform;
  if (workspaceRoot) patch.workspace_root = workspaceRoot;
  if (Object.keys(asObject(descriptor.capabilities)).length) patch.capabilities = asObject(descriptor.capabilities);
  if (Object.keys(asObject(descriptor.metadata)).length) patch.metadata = asObject(descriptor.metadata);

  if (existing) {
    await serviceRest(`creator_devices?owner_user_id=eq.${owner}&device_id=eq.${encodedId}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(patch),
    });
  } else {
    await serviceRest("creator_devices", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ owner_user_id: userId, device_id: deviceId, ...patch }),
    });
  }
  return deviceId;
}

async function registerDevice(userId: string, body: JsonMap) {
  const deviceId = await touchDevice(userId, body);
  if (!deviceId) fail("deviceId is required");
  const rows = await serviceRest(
    `creator_devices?owner_user_id=eq.${encodeURIComponent(userId)}&device_id=eq.${encodeURIComponent(deviceId)}&select=*&limit=1`,
  ) as Array<JsonMap>;
  return { device: Array.isArray(rows) && rows.length ? rows[0] : null };
}

async function ownedLogicalFile(userId: string, projectId: string, fileKey: string) {
  await ownedProject(projectId, userId);
  const rows = await serviceRest(
    `creator_project_files?owner_user_id=eq.${encodeURIComponent(userId)}&project_id=eq.${encodeURIComponent(projectId)}&file_key=eq.${encodeURIComponent(fileKey)}&select=id,project_id,owner_user_id,file_key,relative_path,kind,status&limit=1`,
  ) as Array<JsonMap>;
  if (!Array.isArray(rows) || !rows.length) fail("Logical artifact not found", 404);
  return rows[0];
}

async function saveFileLocation(userId: string, body: JsonMap) {
  const location = asObject(body.location);
  const projectId = boundedText(body.projectId || location.projectId, 220);
  const fileKey = boundedText(body.fileKey || location.fileKey, 220);
  if (!projectId) fail("projectId is required");
  if (!fileKey) fail("fileKey is required");
  const logicalFile = await ownedLogicalFile(userId, projectId, fileKey);
  const deviceBody = {
    ...body,
    deviceId: body.deviceId || location.deviceId,
    device: Object.keys(asObject(body.device)).length ? body.device : location.device,
  } as JsonMap;
  const deviceId = await touchDevice(userId, deviceBody);
  if (!deviceId) fail("deviceId is required");

  const relativePath = normalizeRelativePath(location.relativePath);
  const storageProvider = boundedText(location.storageProvider, 80) || "local";
  const requestedAvailability = boundedText(location.availability, 32) || "present";
  if (!LOCATION_AVAILABILITY.has(requestedAvailability)) fail("Unsupported location availability");
  const filename = boundedText(location.filename, 300) || relativePath.split("/").pop() || null;
  const row = {
    logical_file_id: logicalFile.id,
    project_id: projectId,
    owner_user_id: userId,
    device_id: deviceId,
    storage_provider: storageProvider,
    relative_path: relativePath,
    availability: requestedAvailability,
    provider_file_id: boundedText(location.providerFileId, 500) || null,
    provider_url: boundedText(location.providerUrl, 2000) || null,
    filename,
    mime_type: boundedText(location.mimeType, 240) || null,
    size_bytes: nonnegativeIntegerOrNull(location.sizeBytes),
    checksum: boundedText(location.checksum, 300) || null,
    file_modified_at: timestampOrNull(location.fileModifiedAt),
    observed_at: timestampOrNull(location.observedAt) || new Date().toISOString(),
    metadata: asObject(location.metadata),
  };
  const rows = await serviceRest(
    "creator_file_locations?on_conflict=owner_user_id,logical_file_id,device_id,storage_provider",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    },
  ) as Array<JsonMap>;
  return {
    projectId,
    fileKey,
    logicalFileId: logicalFile.id,
    location: Array.isArray(rows) && rows.length ? rows[0] : row,
  };
}

async function writeEvent(projectId: string, ownerUserId: string, eventType: string, state: string, detail: JsonMap = {}) {
  await serviceRest("creator_project_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      project_id: projectId,
      owner_user_id: ownerUserId,
      event_type: eventType,
      state,
      detail,
    }),
  });
}

async function saveProject(userId: string, body: JsonMap) {
  const project = asObject(body.projectData);
  const projectId = String(project.projectId || "").trim();
  if (!projectId) fail("projectData.projectId is required");
  if (JSON.stringify(project).length > 3_500_000) fail("Project JSON is too large for creator-project sync", 413);

  const existing = await rawProject(projectId);
  if (existing && existing.owner_user_id !== userId) fail("Project id collision", 409);

  const requestedRevision = body.baseRevision == null ? cloudRevision(project) : Number(body.baseRevision);
  if (existing && (!Number.isInteger(requestedRevision) || Number(requestedRevision) < 1)) {
    revisionConflict(existing, Number(existing.revision || 1));
  }
  if (!existing && requestedRevision != null && requestedRevision !== 0) {
    revisionConflict(null, 0);
  }

  const now = new Date().toISOString();
  const integration = asObject(project.integration);
  const drive = asObject(integration.drive);
  const workspace = asObject(integration.workspace);
  const currentState = String(project.currentState || "IDEA");
  const locks = asObject(project.locks);

  const projectData = projectWithoutCloudMetadata(project);
  const row = {
    name: String(project.name || ""),
    game: String(project.game || ""),
    topic: String(project.topic || ""),
    project_type: String(project.projectType || "A_FULL_GUIDE"),
    current_state: currentState,
    target_publish_date: dateOrNull(project.targetPublishDate),
    locks,
    drive_root_id: drive.rootId || null,
    drive_root_url: drive.rootUrl || null,
    drive_folder_id: drive.folderId || null,
    drive_folder_url: drive.folderUrl || null,
    source_workspace_version: workspace.version || project.sourceWorkspaceVersion || null,
    project_data: projectData,
  };

  const files = fileRows(projectData, userId, now);
  const deviceId = await touchDevice(userId, body);
  const result = asObject(await serviceRest("rpc/save_creator_project_revision", {
    method: "POST",
    body: JSON.stringify({
      p_owner_user_id: userId,
      p_project_id: projectId,
      p_base_revision: existing ? requestedRevision : 0,
      p_device_id: deviceId,
      p_project_row: row,
      p_files: files,
    }),
  }));
  if (result.status === "conflict") {
    revisionConflict(asObject(result.project), Number(result.current_revision || 0));
  }
  if (result.status === "forbidden") fail("Creator project belongs to another account", 403);
  if (result.status !== "saved") fail(String(result.message || "Creator project save failed"), 400);

  const saved = asObject(result.project);
  const savedRevision = Number(result.revision || saved.revision || 0);

  if (!existing) {
    await writeEvent(projectId, userId, "PROJECT_CREATED", currentState, {
      source: workspace.version || "production-system",
      revision: savedRevision,
      deviceId,
    });
  } else {
    if (existing.current_state !== currentState) {
      await writeEvent(projectId, userId, "STATE_CHANGED", currentState, { from: existing.current_state, to: currentState });
    }
    if (!sameJson(existing.locks, locks)) {
      await writeEvent(projectId, userId, "LOCKS_CHANGED", currentState, { from: existing.locks, to: locks });
    }
  }

  if (body.reason === "manual") {
    await writeEvent(projectId, userId, "MANUAL_SYNC", currentState, { revision: savedRevision, deviceId });
  }

  return { project: saved, revision: savedRevision, fileCount: files.length, deviceId };
}

async function listProjects(userId: string) {
  return await serviceRest(
    `creator_projects?owner_user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`,
  );
}

async function dashboard(userId: string) {
  const owner = encodeURIComponent(userId);
  const [projects, files, releases, devices, fileLocations] = await Promise.all([
    serviceRest(`creator_projects?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_project_files?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_project_releases?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_devices?owner_user_id=eq.${owner}&select=*&order=last_seen_at.desc`),
    serviceRest(`creator_file_locations?owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
  ]);
  return { projects, files, releases, devices, fileLocations, serverTime: new Date().toISOString() };
}

async function getProject(userId: string, body: JsonMap) {
  const projectId = String(body.projectId || "").trim();
  if (!projectId) fail("projectId is required");
  const project = await ownedProject(projectId, userId);
  const owner = encodeURIComponent(userId);
  const projectFilter = encodeURIComponent(projectId);
  const [files, events, releases, fileLocations] = await Promise.all([
    serviceRest(`creator_project_files?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_project_events?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=created_at.desc&limit=100`),
    serviceRest(`creator_project_releases?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
    serviceRest(`creator_file_locations?project_id=eq.${projectFilter}&owner_user_id=eq.${owner}&select=*&order=updated_at.desc`),
  ]);
  return { project, files, events, releases, fileLocations };
}

async function saveRelease(userId: string, body: JsonMap) {
  const publishState = asObject(body.publishState);
  const source = asObject(publishState.source);
  const projectId = String(body.projectId || source.creatorProjectId || "").trim();
  if (!projectId) fail("projectId is required");
  await ownedProject(projectId, userId);

  const execution = asObject(publishState.execution);
  const platforms = asObject(publishState.platforms);
  const snapshots = Array.isArray(publishState.snapshots) ? publishState.snapshots : [];
  const now = new Date().toISOString();
  const keys = new Set([...Object.keys(execution), ...Object.keys(platforms)]);
  const rows = [...keys].map((platform) => {
    const exec = asObject(execution[platform]);
    return {
      project_id: projectId,
      owner_user_id: userId,
      platform,
      status: String(exec.status || "draft"),
      post_url: exec.postUrl || null,
      post_id: exec.postId || null,
      published_at: exec.publishedAt || null,
      snapshot: {
        fields: asObject(platforms[platform]),
        execution: exec,
        metrics: snapshots.filter((item) => asObject(item).platform === platform).slice(-10),
      },
      updated_at: now,
    };
  });
  if (rows.length) {
    await serviceRest("creator_project_releases?on_conflict=project_id,platform", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(rows),
    });
  }
  return { projectId, releaseCount: rows.length };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return json(req, { error: "Origin not allowed" }, 403);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsFor(req) });
  if (req.method !== "POST") return json(req, { error: "POST only" }, 405);

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) fail("Server configuration is incomplete", 500);
    const user = await verifyUser(req);
    const appUser = await requireActiveAppUser(user.id);
    const body = asObject(await req.json());
    const action = String(body.action || "ping");

    if (action === "ping") return json(req, { ok: true, user: { id: user.id, email: user.email }, role: appUser.role });
    if (action === "dashboard") return json(req, await dashboard(user.id));
    if (action === "listProjects") return json(req, { projects: await listProjects(user.id) });
    if (action === "getProject") return json(req, await getProject(user.id, body));
    if (action === "registerDevice") return json(req, await registerDevice(user.id, body));
    if (action === "saveFileLocation") return json(req, await saveFileLocation(user.id, body));
    if (action === "saveProject") return json(req, await saveProject(user.id, body));
    if (action === "saveRelease") return json(req, await saveRelease(user.id, body));
    fail(`Unknown action: ${action}`, 400);
  } catch (error) {
    const problem = error as HttpError;
    console.error("creator-project-api", problem.message);
    return json(req, problem.payload || { error: problem.message || "Unexpected error" }, problem.status || 500);
  }
});
