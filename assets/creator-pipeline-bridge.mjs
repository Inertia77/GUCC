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
} from "./creator-pipeline-core.mjs";

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

async function creatorApi(action, payload = {}) {
  const token = await getAccessToken();
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
  if (!response.ok) throw new Error(result.error || `Creator API ${response.status}`);
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
    @media(max-width:680px){.gucc-creator-bridge{right:8px;bottom:8px;width:calc(100vw - 16px);border-radius:14px}.gucc-creator-bridge p{display:none}}
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

async function pushCurrentProject(panel, reason = "auto") {
  if (!loggedIn()) {
    setPanelStatus(panel, "local", "本地模式 · Command Center 登录后自动上云");
    return false;
  }
  const store = currentProductionStore();
  const project = store.projects.find((item) => item.projectId === store.selectedProjectId);
  if (!project) return false;
  if (ensureDriveRoot(project)) writeJson(PRODUCTION_STORAGE_KEY, store);
  setPanelStatus(panel, "busy", "同步中…");
  try {
    await creatorApi("saveProject", { projectData: project, reason });
    setPanelStatus(panel, "ok", `云端已同步 · ${project.currentState}`);
    return true;
  } catch (error) {
    setPanelStatus(panel, loggedIn() ? "error" : "local", error.message || "云同步失败");
    return false;
  }
}

async function pullCloudProjects(panel, engine, reloadOnChange = true) {
  if (!loggedIn()) {
    setPanelStatus(panel, "local", "本地模式 · Command Center 登录后自动上云");
    return false;
  }
  setPanelStatus(panel, "busy", "读取云端项目…");
  try {
    const response = await creatorApi("listProjects");
    const merged = mergeCloudProjects(currentProductionStore(), response.projects || [], engine);
    if (merged.changed) {
      writeJson(PRODUCTION_STORAGE_KEY, merged.store);
      setPanelStatus(panel, "ok", "已合并云端最新状态");
      if (reloadOnChange) setTimeout(() => window.location.reload(), 120);
      return true;
    }
    setPanelStatus(panel, "ok", "本地与云端一致");
    return false;
  } catch (error) {
    setPanelStatus(panel, "error", error.message || "读取云端失败");
    return false;
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

  sync.addEventListener("click", () => pushCurrentProject(panel, "manual"));
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
    await pushCurrentProject(panel, "manual");
    writeJson(PUBLISH_HANDOFF_KEY, { project, releasePackage: releasePackageFromProject(project), createdAt: new Date().toISOString() });
    window.location.href = publishConsoleUrl();
  });

  await pullCloudProjects(panel, engine, true);
  let lastSynced = "";
  setInterval(async () => {
    const project = currentProductionProject();
    if (!project) return;
    const serialized = JSON.stringify(project);
    if (serialized === lastSynced) return;
    const ok = await pushCurrentProject(panel, "auto");
    if (ok) lastSynced = serialized;
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
      await creatorApi("saveProject", { projectData: handoff.project, reason: "manual" });
      await creatorApi("saveRelease", { projectId: handoff.project.projectId, publishState: next });
    } catch (error) {
      console.warn("GUCC publish handoff cloud sync", error);
    }
  }
  localStorage.removeItem(PUBLISH_HANDOFF_KEY);
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
