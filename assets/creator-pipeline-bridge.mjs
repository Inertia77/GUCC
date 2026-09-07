import { CONFIG } from "../apps/command-center/src/config.js";
import { getAccessToken, getSession } from "../apps/command-center/src/auth.js";
import {
  DRIVE_ROOT,
  PRODUCTION_STORAGE_KEY,
  PUBLISH_STORAGE_KEY,
  STUDIO_HANDOFF_KEY,
  PUBLISH_HANDOFF_KEY,
  createCanonicalProjectId,
  studioSnapshotToProduction,
  releasePackageFromProject,
  buildReleasePrompt,
  productionToPublishState,
  mergeCloudProjects,
} from "./creator-pipeline-core.mjs?v=2";
import {
  attachCloudMetadata,
  mergeProjectVersions,
  stripCloudMetadata,
  stableStringify,
  summarizeProjectDiff,
} from "./creator-dashboard-core.mjs";

const CREATOR_API = `${CONFIG.SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/creator-project-api`;
const PRODUCTION_PATH = "/apps/video-workspace/production-system/";
const STUDIO_PATH = "/apps/video-workspace/";
const PUBLISH_PATH = "/apps/publishing-console/";
const FIELD_IDS = [
  "projectTitle", "game", "gameCode", "type", "status", "ddl", "version", "duration", "priority",
  "projectShortTitle", "projectShortName", "shortName",
  "preStudyGoal", "preStudyMaterials", "preStudyNotes", "preStudyTakeaways", "preStudyQuestions",
  "coreQuestion", "coreConclusion", "audience", "notDo",
  "officialInfo", "communityDebate", "testNotes", "evidenceLocker", "aiAnalysis", "chapterTable", "script",
  "gameFootage", "visualPlan", "publishCN", "publishMulti", "publishLog", "diffusionGoal", "diffusionAssets",
  "diffusionPackage", "diffusionLog", "progressLog", "review",
];
const DEVICE_ID_KEY = "gucc_creator_device_id_v1";
const SYNC_BASES_KEY = "gucc_creator_sync_bases_v1";
const productionBaselines = new Map();
let projectPushInFlight = false;
let projectPullInFlight = false;

function productionSignature(project) {
  const clean = stripCloudMetadata(project);
  // Render regenerates derived artifacts and older drafts may lack default
  // Drive metadata. Compare canonical content without treating either as edits.
  ensureDriveRoot(clean);
  window.GuccProductionEngine?.refreshGeneratedFiles?.(clean);
  // This generated echo includes cloud bookkeeping; it is not an authored edit.
  if (clean.files?.PROJECT_DATA) delete clean.files.PROJECT_DATA.content;
  return stableStringify(clean);
}

const page = (() => {
  const path = window.location.pathname;
  if (path.includes(PRODUCTION_PATH)) return "production";
  if (path.includes(PUBLISH_PATH)) return "publish";
  if (path.includes(STUDIO_PATH)) return "studio";
  return "other";
})();

function ready() {
  if (document.readyState === "loading") return new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
  return Promise.resolve();
}

async function waitFor(test, timeout = 8000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const value = test();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  return null;
}

function readJson(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
  catch { return fallback; }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function h(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function deviceId() {
  let value = localStorage.getItem(DEVICE_ID_KEY) || "";
  if (!value) {
    value = `web_${crypto.randomUUID?.() || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
    localStorage.setItem(DEVICE_ID_KEY, value);
  }
  return value;
}

function requestedProjectId() {
  return new URLSearchParams(window.location.search).get("project") || "";
}

function syncBase(projectId) {
  return readJson(SYNC_BASES_KEY, {})?.[projectId] || null;
}

function rememberSyncBase(projectId, project) {
  const bases = readJson(SYNC_BASES_KEY, {}) || {};
  bases[projectId] = stripCloudMetadata(project);
  const keys = Object.keys(bases);
  if (keys.length > 30) keys.slice(0, keys.length - 30).forEach((key) => delete bases[key]);
  writeJson(SYNC_BASES_KEY, bases);
}

function readField(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  if ("value" in el) return String(el.value ?? "");
  return String(el.textContent ?? "");
}

function collectStudioSnapshot() {
  const snapshot = { __workspaceVersion: "studio-v5" };
  for (const id of FIELD_IDS) snapshot[id] = readField(id);
  snapshot.projectId = createCanonicalProjectId();
  return snapshot;
}

function currentProductionStore() {
  return readJson(PRODUCTION_STORAGE_KEY, { schemaVersion: "gucc-ai-video-production-v1", projects: [], musicLibrary: [], selectedProjectId: "" });
}

function currentProductionProject() {
  const store = currentProductionStore();
  return store.projects?.find((project) => project.projectId === store.selectedProjectId) || store.projects?.[0] || null;
}

function validateProjectWorkflow(engine, project) {
  if (!engine?.validateWorkflowInvariants) {
    return { valid: false, errors: ["Production Core workflow invariant validator unavailable"] };
  }
  return engine.validateWorkflowInvariants(project);
}

function ensureDriveRoot(project) {
  if (!project) return false;
  project.integration ||= {};
  project.integration.drive ||= {};
  const drive = project.integration.drive;
  let changed = false;
  for (const [key, value] of Object.entries({ rootId: DRIVE_ROOT.id, rootUrl: DRIVE_ROOT.url, rootName: DRIVE_ROOT.name })) {
    if (!drive[key]) { drive[key] = value; changed = true; }
  }
  return changed;
}

async function creatorApi(action, payload = {}, beforeRequest = () => {}) {
  const token = await getAccessToken();
  beforeRequest();
  const response = await fetch(CREATOR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
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

function loggedIn() {
  const session = getSession();
  return Boolean(session?.access_token || session?.refresh_token);
}

function injectStyles() {
  if (document.getElementById("guccCreatorBridgeStyles")) return;
  const style = document.createElement("style");
  style.id = "guccCreatorBridgeStyles";
  style.textContent = `
    .gucc-creator-bridge{position:fixed;right:16px;bottom:16px;z-index:2147482800;width:min(360px,calc(100vw - 24px));padding:12px;border:1px solid rgba(142,164,255,.28);border-radius:16px;background:rgba(15,18,27,.94);backdrop-filter:blur(18px);box-shadow:0 18px 55px rgba(0,0,0,.35);color:#f6f7fb;font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}
    .gucc-creator-bridge strong{font-size:14px}.gucc-creator-bridge p{margin:5px 0;color:#aeb6c7}.gucc-creator-bridge .gcb-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.gucc-creator-bridge button,.gucc-creator-bridge a{appearance:none;border:1px solid rgba(142,164,255,.32);border-radius:10px;background:#22283a;color:#f6f7fb;padding:7px 10px;text-decoration:none;cursor:pointer;font:inherit}.gucc-creator-bridge button.gcb-primary{background:#5166f5;border-color:#6d7efa}.gucc-creator-bridge button:disabled{opacity:.45;cursor:not-allowed}.gucc-creator-bridge .gcb-status{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#bac3d6}.gucc-creator-bridge .gcb-dot{width:8px;height:8px;border-radius:99px;background:#8a93a8}.gucc-creator-bridge[data-cloud="ok"] .gcb-dot{background:#58d68d}.gucc-creator-bridge[data-cloud="busy"] .gcb-dot{background:#f5c15d}.gucc-creator-bridge[data-cloud="error"] .gcb-dot{background:#ff6b78}.gucc-creator-bridge .gcb-close{float:right;padding:2px 7px;background:transparent}
    .gcb-conflict-dialog{width:min(640px,calc(100vw - 24px));border:1px solid rgba(255,107,120,.35);border-radius:18px;background:#101522;color:#f6f7fb;padding:0;box-shadow:0 25px 90px rgba(0,0,0,.55)}.gcb-conflict-dialog::backdrop{background:rgba(0,0,0,.7);backdrop-filter:blur(4px)}.gcb-conflict-inner{padding:20px}.gcb-conflict-inner h2{margin:0 0 6px}.gcb-conflict-inner p{color:#aeb6c7}.gcb-conflict-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:14px 0}.gcb-conflict-list span{padding:8px 10px;border-radius:9px;background:rgba(255,255,255,.06);font-size:12px}.gcb-conflict-actions{display:flex;gap:8px;flex-wrap:wrap}.gcb-conflict-actions button{border:1px solid rgba(142,164,255,.32);border-radius:10px;background:#22283a;color:#f6f7fb;padding:9px 12px;cursor:pointer}.gcb-conflict-actions .danger{border-color:rgba(255,107,120,.5)}
    @media(max-width:680px){.gucc-creator-bridge{right:8px;bottom:8px;width:calc(100vw - 16px);border-radius:14px}.gucc-creator-bridge p{display:none}.gcb-conflict-list{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function createPanel(title, description) {
  injectStyles();
  document.getElementById("guccCreatorBridge")?.remove();
  const panel = document.createElement("aside");
  panel.id = "guccCreatorBridge";
  panel.className = "gucc-creator-bridge";
  panel.dataset.cloud = loggedIn() ? "busy" : "local";
  panel.innerHTML = `<button class="gcb-close" type="button" title="收起">×</button><strong>${title}</strong><div class="gcb-status"><span class="gcb-dot"></span><span data-gcb-status>${loggedIn() ? "检查云端…" : "本地模式"}</span></div><p>${description}</p><div class="gcb-row" data-gcb-actions></div>`;
  panel.querySelector(".gcb-close").addEventListener("click", () => panel.remove());
  document.body.appendChild(panel);
  return panel;
}

function setPanelStatus(panel, mode, text) {
  if (!panel?.isConnected) return;
  panel.dataset.cloud = mode;
  const el = panel.querySelector("[data-gcb-status]");
  if (el) el.textContent = text;
}

function replaceLocalProject(project) {
  const store = currentProductionStore();
  const index = store.projects.findIndex((item) => item.projectId === project.projectId);
  if (index >= 0) store.projects[index] = project;
  else store.projects.push(project);
  store.selectedProjectId = project.projectId;
  writeJson(PRODUCTION_STORAGE_KEY, store);
}

function showConflictDialog(panel, engine, localProject, conflict) {
  document.querySelector(".gcb-conflict-dialog")?.remove();
  const remoteRow = conflict?.project || {};
  const remote = attachCloudMetadata(engine.normalizeProject(remoteRow.project_data || {}, { source: "cloud_conflict_remote" }), remoteRow);
  const differences = summarizeProjectDiff(localProject, remote);
  const dialog = document.createElement("dialog");
  dialog.className = "gcb-conflict-dialog";
  dialog.innerHTML = `<div class="gcb-conflict-inner"><p class="eyebrow">REVISION CONFLICT · r${h(conflict.currentRevision || remoteRow.revision || 0)}</p><h2>云端已有更新版本</h2><p>后台自动同步已经停止。下面列出本机与云端不同的区域；任何选择都必须由你明确点击。</p><div class="gcb-conflict-list">${differences.length ? differences.map((item) => `<span>${h(item.label)}</span>`).join("") : "<span>仅同步元数据不同</span>"}</div><div class="gcb-conflict-actions"><button type="button" data-choice="remote">保留云端</button><button class="danger" type="button" data-choice="local">保留本地</button><button type="button" data-choice="merge">尝试合并</button><button type="button" data-choice="cancel">暂不处理</button></div></div>`;
  document.body.appendChild(dialog);

  const close = () => { dialog.close(); dialog.remove(); };
  dialog.addEventListener("click", async (event) => {
    const choice = event.target.closest("[data-choice]")?.dataset.choice;
    if (!choice) return;
    if (choice === "cancel") return close();
    if (choice === "remote") {
      replaceLocalProject(remote);
      rememberSyncBase(remote.projectId, remote);
      close();
      window.location.reload();
      return;
    }
    const currentRevision = Number(conflict.currentRevision || remoteRow.revision || 0);
    if (choice === "local") {
      replaceLocalProject(attachCloudMetadata(stripCloudMetadata(localProject), remoteRow));
      close();
      await pushCurrentProject(panel, "manual", engine, { baseRevision: currentRevision, bypassConflict: true });
      return;
    }
    const result = mergeProjectVersions(syncBase(localProject.projectId), localProject, remote);
    if (result.conflicts.length) {
      window.alert(`以下区域双方都改过，无法安全自动合并：\n${result.conflicts.map((item) => `- ${item.label}`).join("\n")}\n\n请先保留一侧，再手工补回另一侧内容。`);
      return;
    }
    replaceLocalProject(attachCloudMetadata(engine.normalizeProject(result.merged, { source: "cloud_conflict_merge" }), remoteRow));
    close();
    await pushCurrentProject(panel, "manual", engine, { baseRevision: currentRevision, bypassConflict: true });
  });
  dialog.addEventListener("cancel", close, { once: true });
  dialog.showModal();
}

function actionButton(label, primary = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  if (primary) button.className = "gcb-primary";
  return button;
}

function actionLink(label, href) {
  const link = document.createElement("a");
  link.textContent = label;
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  return link;
}

async function runStudio() {
  const panel = createPanel("AI 制作总线", "Studio 用来想清楚；确定要做以后，一键带着同一个 Project ID 进入正式 Production。锁不会被自动越过。");
  const actions = panel.querySelector("[data-gcb-actions]");
  const transfer = actionButton("转入正式制作", true);
  const drive = actionLink("Drive 项目库", DRIVE_ROOT.url);
  actions.append(transfer, drive);
  transfer.addEventListener("click", () => {
    const snapshot = collectStudioSnapshot();
    writeJson(STUDIO_HANDOFF_KEY, { projectId: snapshot.projectId, snapshot, createdAt: new Date().toISOString() });
    window.location.href = new URL("./production-system/", window.location.href).href;
  });
  setPanelStatus(panel, loggedIn() ? "ok" : "local", loggedIn() ? "Supabase 登录可复用" : "本地可用 · 云同步需先登录 Command Center");
}

async function importStudioHandoff(engine) {
  const handoff = readJson(STUDIO_HANDOFF_KEY);
  if (!handoff?.snapshot) return false;
  handoff.snapshot.projectId = handoff.projectId || handoff.snapshot.projectId;
  const project = studioSnapshotToProduction(engine, handoff.snapshot);
  const store = currentProductionStore();
  const index = store.projects.findIndex((item) => item.projectId === project.projectId);
  if (index >= 0) store.projects[index] = project;
  else store.projects.push(project);
  store.selectedProjectId = project.projectId;
  store.schemaVersion = engine.SCHEMA_VERSION;
  writeJson(PRODUCTION_STORAGE_KEY, store);
  localStorage.removeItem(STUDIO_HANDOFF_KEY);
  return true;
}

async function pushCurrentProject(panel, reason = "auto", engine = window.GuccProductionEngine, options = {}) {
  if (projectPushInFlight || projectPullInFlight) return false;
  if (!loggedIn()) {
    setPanelStatus(panel, "local", "本地模式 · Command Center 登录后自动上云");
    return false;
  }
  const store = currentProductionStore();
  const project = store.projects.find((item) => item.projectId === store.selectedProjectId);
  if (!project) return false;
  const workflow = validateProjectWorkflow(engine, project);
  if (!workflow.valid) {
    setPanelStatus(panel, "error", `工作流状态不合法 · ${workflow.errors.join(" / ")}`);
    return false;
  }
  const existingConflict = project.integration?.cloud?.conflict;
  if (existingConflict && !options.bypassConflict) {
    setPanelStatus(panel, "error", "云端冲突待处理 · 自动同步已停止");
    if (reason === "manual" && engine) showConflictDialog(panel, engine, project, existingConflict);
    return false;
  }
  if (ensureDriveRoot(project)) writeJson(PRODUCTION_STORAGE_KEY, store);
  projectPushInFlight = true;
  const stillSelected = () => {
    const latest = currentProductionStore();
    return latest.selectedProjectId === project.projectId && latest.projects.some((item) => item.projectId === project.projectId);
  };
  setPanelStatus(panel, "busy", "同步中…");
  try {
    const baseRevision = options.baseRevision ?? project.integration?.cloud?.revision ?? 0;
    const result = await creatorApi("saveProject", { projectData: project, reason, baseRevision, deviceId: deviceId() }, () => {
      if (!loggedIn() || !stillSelected()) throw new Error("项目或登录状态已改变 · 本次同步已取消");
    });
    const row = { ...(result.project || {}), revision: result.revision || result.project?.revision };
    if (!Number.isInteger(row.revision) || row.revision <= Number(baseRevision)
      || (row.project_id && row.project_id !== project.projectId)) throw new Error("云同步响应的项目 / 修订号不匹配");
    const latestStore = currentProductionStore();
    const index = latestStore.projects.findIndex((item) => item.projectId === project.projectId);
    if (index < 0) return false;
    const latest = latestStore.projects[index];
    if (Number(latest.integration?.cloud?.revision || 0) > row.revision) return false;
    // Only bookkeeping belongs to this response. Authored edits and selection
    // may have changed while the network was pending, including project removal.
    latestStore.projects[index] = attachCloudMetadata(latest, row);
    writeJson(PRODUCTION_STORAGE_KEY, latestStore);
    rememberSyncBase(project.projectId, project);
    productionBaselines.set(project.projectId, productionSignature(project));
    if (stillSelected()) {
      const dirty = productionSignature(latest) !== productionSignature(project);
      setPanelStatus(panel, dirty ? "busy" : "ok", dirty ? "新编辑已保存在本地 · 等待下一次同步" : `云端已同步 · r${row.revision} · ${project.currentState}`);
    }
    return true;
  } catch (error) {
    if (error.status === 409 && error.payload?.error === "REVISION_CONFLICT") {
      const conflict = { ...(error.payload.conflict || {}), detectedAt: new Date().toISOString() };
      const latestStore = currentProductionStore();
      const latest = latestStore.projects.find((item) => item.projectId === project.projectId);
      if (!latest || Number(latest.integration?.cloud?.revision || 0) > Number(project.integration?.cloud?.revision || 0)) return false;
      latest.integration ||= {};
      latest.integration.cloud ||= {};
      latest.integration.cloud.conflict = conflict;
      writeJson(PRODUCTION_STORAGE_KEY, latestStore);
      if (stillSelected()) {
        setPanelStatus(panel, "error", "云端已有新版本 · 自动同步已停止");
        if (reason === "manual" && engine) showConflictDialog(panel, engine, latest, conflict);
      }
      return false;
    }
    if (stillSelected()) setPanelStatus(panel, loggedIn() ? "error" : "local", error.message || "云同步失败");
    return false;
  } finally {
    projectPushInFlight = false;
  }
}

async function pullCloudProjects(panel, engine, reloadOnChange = true) {
  if (projectPullInFlight || projectPushInFlight) return false;
  if (!loggedIn()) {
    setPanelStatus(panel, "local", "本地模式 · Command Center 登录后自动上云");
    return false;
  }
  projectPullInFlight = true;
  const before = currentProductionStore();
  const beforeProjects = new Map(before.projects.map((project) => [project.projectId, productionSignature(project)]));
  setPanelStatus(panel, "busy", "读取云端项目…");
  try {
    const response = await creatorApi("listProjects", {}, () => {
      if (!loggedIn()) throw new Error("登录状态已改变 · 本次拉取已取消");
    });
    if (!loggedIn()) {
      setPanelStatus(panel, "local", "登录状态已改变 · 本次拉取已取消");
      return false;
    }
    // An unblurred field has not reached localStorage yet. Keep the editor
    // intact; a later deliberate pull can safely retry after local persistence.
    if (document.activeElement?.matches?.("input, textarea, select") || document.activeElement?.isContentEditable) {
      setPanelStatus(panel, "local", "正在编辑 · 云端拉取未应用，请保存输入后重试");
      return false;
    }
    if (!Array.isArray(response.projects)) throw new Error("云端项目列表格式不正确");
    const latest = currentProductionStore();
    const currentIds = new Set(latest.projects.map((project) => project.projectId));
    // Deletion during a pending read is not permission to resurrect the draft.
    const rows = response.projects.filter((row) => !beforeProjects.has(row?.project_data?.projectId) || currentIds.has(row.project_data.projectId));
    const merged = mergeCloudProjects(latest, rows, engine, latest.selectedProjectId || requestedProjectId(), {
      isLocalDirty(project) {
        const signature = productionSignature(project);
        if (beforeProjects.has(project.projectId) && beforeProjects.get(project.projectId) !== signature) return true;
        const base = syncBase(project.projectId);
        return base ? productionSignature(base) !== signature : undefined;
      },
    });
    if (merged.changed) writeJson(PRODUCTION_STORAGE_KEY, merged.store);
    // A conflict is not an accepted sync. Preserve its original three-way base,
    // and never bless an ignored/stale response as the next autosave baseline.
    for (const row of rows) {
      const project = merged.store.projects.find((item) => item.projectId === row?.project_data?.projectId);
      if (!project || project.integration?.cloud?.conflict || (row.project_id && row.project_id !== project.projectId)
        || !Number.isSafeInteger(row.revision) || row.revision < 1 || project.integration?.cloud?.revision !== row.revision) continue;
      const remote = engine.normalizeProject(row.project_data, { source: "cloud_pull" });
      if (productionSignature(project) !== productionSignature(remote)) continue;
      rememberSyncBase(project.projectId, project);
      productionBaselines.set(project.projectId, productionSignature(project));
    }
    const selected = merged.store.projects.find((project) => project.projectId === merged.store.selectedProjectId);
    if (merged.changed) {
      setPanelStatus(panel, selected?.integration?.cloud?.conflict ? "error" : "ok",
        selected?.integration?.cloud?.conflict ? "云端冲突待处理 · 自动同步已停止" : "已合并云端最新状态");
      if (reloadOnChange) window.location.reload();
      return true;
    }
    const dirty = selected && syncBase(selected.projectId) && productionSignature(selected) !== productionSignature(syncBase(selected.projectId));
    setPanelStatus(panel, selected?.integration?.cloud?.conflict ? "error" : dirty ? "local" : "ok",
      selected?.integration?.cloud?.conflict ? "云端冲突待处理 · 自动同步已停止" : dirty ? "本地编辑已保留 · 等待同步" : "云端读取完成 · 本地草稿已保留");
    return false;
  } catch (error) {
    setPanelStatus(panel, "error", error.message || "读取云端失败");
    return false;
  } finally {
    projectPullInFlight = false;
  }
}

function publishConsoleUrl() {
  return new URL("../../publishing-console/", window.location.href).href;
}

async function runProduction() {
  const engine = await waitFor(() => window.GuccProductionEngine);
  if (!engine) return;
  const imported = await importStudioHandoff(engine);
  if (imported) {
    window.location.reload();
    return;
  }

  const panel = createPanel("Production · 单一状态源", "Production 自动保存本地草稿；登录过 Command Center 后，同一 Project ID 还会同步到 Supabase。音视频大文件仍放 Drive / 本地同步目录。");
  const actions = panel.querySelector("[data-gcb-actions]");
  const sync = actionButton("立即云同步", true);
  const pull = actionButton("拉取云端");
  const releasePrompt = actionButton("复制发布 Prompt");
  const publish = actionButton("送去 Publish Console");
  const drive = actionLink("Drive 项目库", DRIVE_ROOT.url);
  actions.append(sync, pull, releasePrompt, publish, drive);

  sync.addEventListener("click", () => pushCurrentProject(panel, "manual", engine));
  pull.addEventListener("click", () => pullCloudProjects(panel, engine, true));
  releasePrompt.addEventListener("click", async () => {
    const project = currentProductionProject();
    if (!project) return;
    const prompt = buildReleasePrompt(engine.generatePrompt(project), project);
    await navigator.clipboard.writeText(prompt);
    setPanelStatus(panel, "ok", "可解析的发布 Prompt 已复制");
  });
  publish.addEventListener("click", async () => {
    const project = currentProductionProject();
    if (!project) return;
    const workflow = validateProjectWorkflow(engine, project);
    if (!workflow.valid) {
      setPanelStatus(panel, "error", `工作流状态不合法 · ${workflow.errors.join(" / ")}`);
      return;
    }
    const saved = await pushCurrentProject(panel, "manual", engine);
    const latest = currentProductionProject();
    if (!saved || latest?.projectId !== project.projectId) return;
    if (productionSignature(latest) !== productionBaselines.get(project.projectId)) {
      setPanelStatus(panel, "busy", "项目有新编辑 · 同步完成后再交接发布");
      return;
    }
    writeJson(PUBLISH_HANDOFF_KEY, { project: latest, releasePackage: releasePackageFromProject(latest), createdAt: new Date().toISOString() });
    window.location.href = publishConsoleUrl();
  });

  // Navigation is not an edit. Remember every existing project's own content,
  // including local-only drafts; opening this page must not publish those drafts.
  currentProductionStore().projects.forEach((project) => productionBaselines.set(project.projectId, productionSignature(project)));
  if (await pullCloudProjects(panel, engine, true)) return; // Reload is pending.
  setInterval(async () => {
    const project = currentProductionProject();
    if (!project) return;
    if (productionSignature(project) === productionBaselines.get(project.projectId)) return;
    await pushCurrentProject(panel, "auto", engine);
  }, 5000);
}

function publishDefaultsExist(state) {
  return state && state.schemaVersion === "gucc-publish-console-1";
}

async function consumePublishHandoff(rules) {
  const handoff = readJson(PUBLISH_HANDOFF_KEY);
  if (!handoff?.project?.projectId) return false;
  const existing = readJson(PUBLISH_STORAGE_KEY);
  const next = productionToPublishState(publishDefaultsExist(existing) ? existing : null, handoff.project, rules);
  writeJson(PUBLISH_STORAGE_KEY, next);
  if (loggedIn()) {
    try {
      await creatorApi("saveProject", {
        projectData: handoff.project,
        reason: "manual",
        baseRevision: handoff.project.integration?.cloud?.revision ?? 0,
        deviceId: deviceId(),
      });
      await creatorApi("saveRelease", { projectId: handoff.project.projectId, publishState: next });
    } catch (error) {
      console.warn("GUCC publish handoff cloud sync", error);
    }
  }
  localStorage.removeItem(PUBLISH_HANDOFF_KEY);
  return true;
}

function hydratePublishReleases(state, releases) {
  const snapshots = [];
  for (const release of releases || []) {
    if (!release?.platform) continue;
    state.execution[release.platform] = {
      ...(state.execution[release.platform] || {}),
      status: release.status || "未开始",
      postUrl: release.post_url || "",
      postId: release.post_id || "",
      publishedAt: release.published_at || "",
    };
    const metrics = Array.isArray(release.snapshot?.metrics) ? release.snapshot.metrics : [];
    snapshots.push(...metrics);
  }
  if (snapshots.length) state.snapshots = snapshots;
  return state;
}

async function loadPublishProjectFromQuery(rules) {
  const projectId = requestedProjectId();
  if (!projectId || !loggedIn()) return false;
  const response = await creatorApi("getProject", { projectId });
  const raw = response.project?.project_data;
  if (!raw?.projectId) return false;
  const existing = readJson(PUBLISH_STORAGE_KEY);
  const next = hydratePublishReleases(productionToPublishState(existing, raw, rules), response.releases || []);
  next.source = { ...(next.source || {}), cloudRevision: Number(response.project.revision || 0) };
  if (JSON.stringify(existing) === JSON.stringify(next)) return false;
  writeJson(PUBLISH_STORAGE_KEY, next);
  return true;
}

async function syncPublishState(panel) {
  const state = readJson(PUBLISH_STORAGE_KEY);
  const projectId = state?.source?.creatorProjectId;
  if (!projectId || !loggedIn()) {
    setPanelStatus(panel, "local", projectId ? "发布记录仅本地 · 登录后自动上云" : "等待 Production 项目交接");
    return false;
  }
  setPanelStatus(panel, "busy", "同步发布状态…");
  try {
    await creatorApi("saveRelease", { projectId, publishState: state });
    setPanelStatus(panel, "ok", "发布状态 / 数据快照已同步");
    return true;
  } catch (error) {
    setPanelStatus(panel, "error", error.message || "发布状态同步失败");
    return false;
  }
}

async function runPublish() {
  const rules = await waitFor(() => window.GuccPublishingRules);
  if (!rules) return;
  const loadedFromCloud = await loadPublishProjectFromQuery(rules).catch((error) => {
    console.warn("GUCC publish deep link", error);
    return false;
  });
  if (loadedFromCloud) {
    window.location.reload();
    return;
  }
  const imported = await consumePublishHandoff(rules);
  if (imported) {
    window.location.reload();
    return;
  }

  const panel = createPanel("Publish · Production 已直连", "从 Production 送来的 RELEASE_PACK 会直接拆成六个平台字段；公开发布按钮仍保留给你最后确认。");
  const actions = panel.querySelector("[data-gcb-actions]");
  const sync = actionButton("同步发布状态", true);
  const drive = actionLink("Drive 项目库", DRIVE_ROOT.url);
  actions.append(sync, drive);
  sync.addEventListener("click", () => syncPublishState(panel));
  await syncPublishState(panel);

  let last = "";
  setInterval(async () => {
    const state = readJson(PUBLISH_STORAGE_KEY);
    if (!state?.source?.creatorProjectId) return;
    const serialized = JSON.stringify({ execution: state.execution, snapshots: state.snapshots, platforms: state.platforms });
    if (serialized === last) return;
    const ok = await syncPublishState(panel);
    if (ok) last = serialized;
  }, 7000);
}

await ready();
if (page === "studio") await runStudio();
if (page === "production") await runProduction();
if (page === "publish") await runPublish();
