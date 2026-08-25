type JsonMap = Record<string, unknown>;

type HttpError = Error & { status?: number };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const DEFAULT_ALLOWED_ORIGINS = new Set([
  "http://localhost:8000",
  "https://inertia77.github.io",
]);

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

function dateOrNull(value: unknown) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function sameJson(a: unknown, b: unknown) {
  try { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); }
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

  const now = new Date().toISOString();
  const integration = asObject(project.integration);
  const drive = asObject(integration.drive);
  const workspace = asObject(integration.workspace);
  const currentState = String(project.currentState || "IDEA");
  const locks = asObject(project.locks);

  const row = {
    project_id: projectId,
    owner_user_id: userId,
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
    project_data: project,
    archived_at: currentState === "ARCHIVED" ? now : null,
    updated_at: now,
  };

  const saved = await serviceRest("creator_projects?on_conflict=project_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });

  const files = fileRows(project, userId, now);
  if (files.length) {
    await serviceRest("creator_project_files?on_conflict=project_id,file_key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(files),
    });
  }

  if (!existing) {
    await writeEvent(projectId, userId, "PROJECT_CREATED", currentState, { source: workspace.version || "production-system" });
  } else {
    if (existing.current_state !== currentState) {
      await writeEvent(projectId, userId, "STATE_CHANGED", currentState, { from: existing.current_state, to: currentState });
    }
    if (!sameJson(existing.locks, locks)) {
      await writeEvent(projectId, userId, "LOCKS_CHANGED", currentState, { from: existing.locks, to: locks });
    }
  }

  if (body.reason === "manual") {
    await writeEvent(projectId, userId, "MANUAL_SYNC", currentState, {});
  }

  return { project: Array.isArray(saved) ? saved[0] : saved, fileCount: files.length };
}

async function listProjects(userId: string) {
  return await serviceRest(
    `creator_projects?owner_user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`,
  );
}

async function getProject(userId: string, body: JsonMap) {
  const projectId = String(body.projectId || "").trim();
  if (!projectId) fail("projectId is required");
  const project = await ownedProject(projectId, userId);
  const [files, events, releases] = await Promise.all([
    serviceRest(`creator_project_files?project_id=eq.${encodeURIComponent(projectId)}&owner_user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`),
    serviceRest(`creator_project_events?project_id=eq.${encodeURIComponent(projectId)}&owner_user_id=eq.${encodeURIComponent(userId)}&select=*&order=created_at.desc&limit=100`),
    serviceRest(`creator_project_releases?project_id=eq.${encodeURIComponent(projectId)}&owner_user_id=eq.${encodeURIComponent(userId)}&select=*&order=updated_at.desc`),
  ]);
  return { project, files, events, releases };
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
    if (action === "listProjects") return json(req, { projects: await listProjects(user.id) });
    if (action === "getProject") return json(req, await getProject(user.id, body));
    if (action === "saveProject") return json(req, await saveProject(user.id, body));
    if (action === "saveRelease") return json(req, await saveRelease(user.id, body));
    fail(`Unknown action: ${action}`, 400);
  } catch (error) {
    const problem = error as HttpError;
    console.error("creator-project-api", problem.message);
    return json(req, { error: problem.message || "Unexpected error" }, problem.status || 500);
  }
});
