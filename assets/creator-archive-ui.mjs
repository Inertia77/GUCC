import { CONFIG } from "../apps/command-center/src/config.js";
import { getAccessToken, getSession } from "../apps/command-center/src/auth.js";
import { PRODUCTION_STORAGE_KEY } from "./creator-pipeline-core.mjs";
import { archiveUiState, canEnterArchived } from "./creator-archive-state-core.mjs";

const CREATOR_API = `${CONFIG.SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/creator-project-api`;
const PANEL_ID = "guccCreatorBridge";
const ARCHIVE_ROW_ID = "guccCreatorArchiveRow";
let archiveBusy = false;
let enginePatched = false;

function sessionReady() {
  const session = getSession();
  return Boolean(session?.access_token || session?.refresh_token);
}

function readStore() {
  try { return JSON.parse(localStorage.getItem(PRODUCTION_STORAGE_KEY) || "null") || null; }
  catch { return null; }
}

function writeStore(store) {
  localStorage.setItem(PRODUCTION_STORAGE_KEY, JSON.stringify(store));
}

function currentProject() {
  const store = readStore();
  if (!store) return null;
  return store.projects?.find((item) => item.projectId === store.selectedProjectId) || store.projects?.[0] || null;
}

function updateLocalFromCloud(row) {
  if (!row?.project_id || !row?.project_data) return;
  const store = readStore();
  if (!store) return;
  const index = store.projects?.findIndex((item) => item.projectId === row.project_id) ?? -1;
  if (index < 0) return;
  const local = store.projects[index];
  local.integration ||= {};
  local.integration.archive = structuredClone(row.project_data.integration?.archive || {});
  local.integration.cloud ||= {};
  local.integration.cloud.revision = Number(row.revision || local.integration.cloud.revision || 0);
  local.integration.cloud.lastSyncedAt = new Date().toISOString();
  local.currentState = row.current_state || row.project_data.currentState || local.currentState;
  local.updatedAt = row.project_data.updatedAt || local.updatedAt;
  writeStore(store);
}

async function api(action, payload = {}) {
  const token = await getAccessToken();
  const response = await fetch(CREATOR_API, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || `Creator API ${response.status}`);
    error.status = response.status;
    error.payload = result;
    throw error;
  }
  return result;
}

function setPanelStatus(mode, message) {
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  panel.dataset.cloud = mode;
  const target = panel.querySelector("[data-gcb-status]");
  if (target) target.textContent = message;
}

function patchEngineGate() {
  if (enginePatched) return;
  const engine = window.GuccProductionEngine;
  if (!engine?.transition) return;
  const original = engine.transition.bind(engine);
  engine.transition = (project, target, options = {}) => {
    if (target === "ARCHIVED" && !canEnterArchived(project)) {
      throw new Error("ARCHIVED 只表示 Project Knowledge Archive 已完成；必须先完成 Google Drive 远端校验，或执行带原因的 Manual Archive Override。");
    }
    return original(project, target, options);
  };
  enginePatched = true;
}

function button(label, handler, primary = false) {
  const el = document.createElement("button");
  el.type = "button";
  el.textContent = label;
  if (primary) el.classList.add("gcb-primary");
  el.addEventListener("click", handler);
  return el;
}

function openLink(label, href) {
  const link = document.createElement("a");
  link.textContent = label;
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  return link;
}

async function fetchCloudProject(projectId) {
  if (!sessionReady()) return null;
  const result = await api("getProject", { projectId });
  updateLocalFromCloud(result.project);
  return result.project;
}

async function requestArchive(projectId) {
  if (archiveBusy) return;
  archiveBusy = true;
  try {
    const row = await fetchCloudProject(projectId);
    if (!row) throw new Error("先登录 Command Center，Archive 请求才能写入 Supabase。 ");
    const result = await api("requestArchive", { projectId, baseRevision: Number(row.revision || 0) });
    updateLocalFromCloud(result.project);
    setPanelStatus("ok", "Archive Pending · 本地 Archive Worker 将生成并发布轻量档案");
    renderArchiveControls();
  } catch (error) {
    setPanelStatus("error", error.message || "Archive request failed");
  } finally { archiveBusy = false; }
}

async function manualOverride(projectId) {
  if (archiveBusy) return;
  const reason = window.prompt("Manual Archive Override 原因（必填）。这只表示 GUCC Project Knowledge Archive 被人工跳过，不代表大型媒体已备份：", "");
  if (!reason?.trim()) return;
  archiveBusy = true;
  try {
    const row = await fetchCloudProject(projectId);
    const result = await api("manualArchiveOverride", { projectId, baseRevision: Number(row?.revision || 0), reason: reason.trim() });
    updateLocalFromCloud(result.project);
    setPanelStatus("ok", "Archived · Manual Override 已记录");
    window.location.reload();
  } catch (error) {
    setPanelStatus("error", error.message || "Manual Archive Override failed");
  } finally { archiveBusy = false; }
}

function renderArchiveControls() {
  patchEngineGate();
  const panel = document.getElementById(PANEL_ID);
  if (!panel) return;
  panel.querySelector(`#${ARCHIVE_ROW_ID}`)?.remove();
  const project = currentProject();
  if (!project || !["PUBLISHED", "ARCHIVED"].includes(project.currentState)) return;

  const state = archiveUiState(project);
  const row = document.createElement("div");
  row.id = ARCHIVE_ROW_ID;
  row.className = "gcb-row";
  row.dataset.archiveState = state.status;

  const status = document.createElement("span");
  status.className = "gcb-status";
  status.textContent = `Archive · ${state.label}`;
  row.append(status);

  if (!state.isBusy) {
    const actionLabel = project.currentState === "ARCHIVED" ? "Update Archive" : state.actionLabel;
    const action = button(actionLabel, () => requestArchive(project.projectId), project.currentState === "PUBLISHED" && !state.isArchived);
    row.append(action);
  }
  if (state.canOpen) row.append(openLink("Open Drive Archive", state.mainFileUrl));
  if (project.currentState === "PUBLISHED" && state.status === "failed") row.append(button("Manual Override", () => manualOverride(project.projectId)));

  const actions = panel.querySelector("[data-gcb-actions]");
  actions?.insertAdjacentElement("afterend", row);
}

async function refreshFromCloud() {
  const project = currentProject();
  if (!project || !["PUBLISHED", "ARCHIVED"].includes(project.currentState) || !sessionReady() || archiveBusy) {
    renderArchiveControls();
    return;
  }
  try {
    const beforeState = project.currentState;
    const beforeArchive = JSON.stringify(project.integration?.archive || {});
    await fetchCloudProject(project.projectId);
    const after = currentProject();
    renderArchiveControls();
    if (after && (after.currentState !== beforeState || JSON.stringify(after.integration?.archive || {}) !== beforeArchive)) {
      if (after.currentState === "ARCHIVED" && beforeState !== "ARCHIVED") window.location.reload();
    }
  } catch {
    renderArchiveControls();
  }
}

async function boot() {
  if (!window.location.pathname.includes("/apps/video-workspace/production-system/")) return;
  const started = Date.now();
  while (Date.now() - started < 10000 && !document.getElementById(PANEL_ID)) await new Promise((resolve) => setTimeout(resolve, 80));
  patchEngineGate();
  renderArchiveControls();
  await refreshFromCloud();
  setInterval(refreshFromCloud, 15000);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
else boot();
