import { CONFIG } from "../apps/command-center/src/config.js";
import { getAccessToken, getSession } from "../apps/command-center/src/auth.js";

const CREATOR_API = `${CONFIG.SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/creator-project-api`;
const PRODUCTION_STORAGE_KEY = "gucc_ai_video_production_v1";
const AUTH_STORE_KEY = "gameup_session_v5";
let cache = null;
let cacheAt = 0;
let pendingLoad = null;
let sessionEpoch = 0;
let renderEpoch = 0;

function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function loggedIn() { const session = getSession(); return Boolean(session?.access_token || session?.refresh_token); }
function currentProjectId() {
  const query = new URLSearchParams(location.search).get("project");
  if (query) return query;
  try {
    const store = JSON.parse(localStorage.getItem(PRODUCTION_STORAGE_KEY) || "null");
    return String(store?.selectedProjectId || store?.projects?.[0]?.projectId || "");
  } catch { return ""; }
}
async function creatorApi(action, payload = {}) {
  const token = await getAccessToken();
  const response = await fetch(CREATOR_API, { method: "POST", headers: { "Content-Type": "application/json", apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, ...payload }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Creator API ${response.status}`);
  return result;
}
function injectStyles() {
  if (document.getElementById("creatorFileObservationStyles")) return;
  const style = document.createElement("style");
  style.id = "creatorFileObservationStyles";
  style.textContent = `
    .file-local-first-note{margin:0 0 12px;padding:11px 13px;border:1px solid rgba(116,243,255,.17);border-radius:12px;background:rgba(116,243,255,.055);font-size:12px;line-height:1.65;color:#c9d3e5}
    .file-local-first-note strong{color:#eefcff}
    .file-status-legend{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
    .file-status-legend span{padding:7px 9px;border-radius:9px;background:rgba(255,255,255,.035);font-size:11px;color:#aeb6c7}
    .file-status-legend b{color:#e7eafb}
    .file-row{grid-template-columns:minmax(240px,1.15fr) minmax(210px,.85fr) minmax(190px,.7fr)}
    .file-identity{min-width:0}.file-path-line{display:grid;gap:4px;margin-top:6px}.file-path-line>span,.file-state-label{font-size:10px;color:#8995aa;font-weight:800;letter-spacing:.04em}
    .file-status-stack{display:grid;gap:7px}.file-state-line{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.file-registered-name{display:block}
    .file-local-pill{display:inline-flex;align-items:center;min-height:25px;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.06);font-size:11px;font-weight:800}
    .file-local-pill.present{color:#79dda6;background:rgba(121,221,166,.08)}.file-local-pill.missing{color:#f5c15d;background:rgba(245,193,93,.08)}.file-local-pill.unverified{color:#98a3b8}
    .file-actions{display:grid;justify-items:start;align-content:center}.file-actions .button{white-space:nowrap}.file-manual-help{max-width:250px;color:#8995aa;font-size:10px;line-height:1.45}
    .file-row.local-present{outline:1px solid rgba(121,221,166,.16)}
    .creator-observed-locations{grid-column:1/-1;margin-top:2px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.028);font-size:11px;color:#aeb6c7}
    .creator-observed-locations summary{cursor:pointer;color:#aeb6c7}.creator-observed-location{display:flex;gap:8px;flex-wrap:wrap;margin-top:5px}
    .creator-observed-location.present{color:#79dda6}.creator-observed-location.missing{color:#f5c15d}.creator-observed-location.unknown{color:#98a3b8}
    @media(max-width:900px){.file-row{grid-template-columns:1fr 1fr}.file-actions{grid-column:1/-1;grid-template-columns:auto minmax(0,1fr);align-items:center}.file-manual-help{max-width:none}}
    @media(max-width:700px){.file-row{grid-template-columns:1fr}.file-actions{grid-column:auto;grid-template-columns:1fr}.file-actions .button{width:100%;min-height:44px}.file-status-legend{display:grid}}
  `;
  document.head.appendChild(style);
}
function relativeTime(value) {
  const time = Date.parse(value || ""); if (!Number.isFinite(time)) return "未记录";
  const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (seconds < 60) return `${seconds}s ago`; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; return `${Math.floor(seconds / 86400)}d ago`;
}
async function loadData(projectId, session) {
  if (!loggedIn() || !projectId) return null;
  if (cache?.project?.project_id === projectId && Date.now() - cacheAt < 15000) return cache;
  if (pendingLoad?.projectId === projectId && pendingLoad.session === session) return pendingLoad.promise;
  const request = { projectId, session, promise: null };
  pendingLoad = request;
  request.promise = creatorApi("getProject", { projectId }).then((data) => {
    if (pendingLoad !== request || session !== sessionEpoch || !loggedIn() || currentProjectId() !== projectId) return null;
    if (data.project?.project_id !== projectId) throw new Error("File observations response belongs to a different project");
    cache = data; cacheAt = Date.now(); return data;
  }).finally(() => { if (pendingLoad === request) pendingLoad = null; });
  return request.promise;
}
function renderForRow(row, data) {
  const button = row.querySelector("[data-upload-file]");
  const fileKey = row.dataset.fileKey || button?.dataset.uploadFile;
  if (!fileKey) return;
  const logical = (data?.files || []).find((file) => file.file_key === fileKey);
  const devices = new Map((data?.devices || []).map((device) => [device.device_id, device]));
  const locations = logical ? (data?.fileLocations || []).filter((location) => location.logical_file_id === logical.id) : [];
  const hasPresent = locations.some((location) => String(location.availability || "unknown") === "present");
  const hasMissing = locations.some((location) => String(location.availability || "unknown") === "missing");
  const physical = hasPresent ? "present" : hasMissing ? "missing" : "unverified";
  const physicalLabel = physical === "present" ? "✓ 已找到" : physical === "missing" ? "⚠ 未找到" : "○ 尚未验证";
  const localStatus = row.querySelector("[data-file-local-status]");
  if (localStatus) localStatus.innerHTML = `<span class="file-state-label">本机状态</span><span class="file-local-pill ${physical}">${physicalLabel}</span>`;

  row.classList.toggle("local-present", physical === "present");
  row.classList.toggle("local-missing", physical === "missing");

  const mode = row.dataset.fileMode || "media";
  const logicalReady = String(logical?.status || "").toLowerCase() === "ready";
  const helper = row.querySelector("[data-file-manual-help]");
  if (button && helper && physical === "present") {
    if (logicalReady) {
      button.textContent = mode === "text" ? "替换内容（可选）" : "更新登记信息（可选）";
      helper.textContent = mode === "text"
        ? "Local Agent 已找到本机文件；通常无需手工操作。只有要把该文本重新读入当前项目时才使用。"
        : "Local Agent 已找到本机文件；通常无需手工操作。这里只更新项目登记信息，不上传媒体本体。";
    } else {
      button.textContent = mode === "text" ? "导入内容（手工）" : "纳入项目（手工）";
      helper.textContent = mode === "text"
        ? "Local Agent 已证明文件存在，但不会自动把文本读入项目。确认这是正式版本后，可手工导入内容。"
        : "Local Agent 已证明文件存在，但不会自动把项目状态改为 Ready。确认这是正式产物后，可手工纳入；仍不会上传媒体本体。";
    }
  }

  const detailHtml = locations.length ? locations.map((location) => {
    const availability = String(location.availability || "unknown");
    const icon = availability === "present" ? "✓" : availability === "missing" ? "⚠" : "○";
    const label = devices.get(location.device_id)?.label || location.device_id || "未知设备";
    const status = availability === "present" ? "已找到" : availability === "missing" ? "上次存在，现在未找到" : "尚未验证";
    const size = location.size_bytes == null ? "" : ` · ${Number(location.size_bytes).toLocaleString()} B`;
    return `<span class="creator-observed-location ${escapeHtml(availability)}">${icon} ${escapeHtml(label)} · ${escapeHtml(location.relative_path || logical?.relative_path || "")} · ${escapeHtml(status)} · ${escapeHtml(relativeTime(location.observed_at))}${size}</span>`;
  }).join("") : "Local Agent 还没有为这个文件留下本机观察记录。";

  const existing = row.querySelector(".creator-observed-locations");
  const html = `<summary>Local Agent 详情</summary>${detailHtml}`;
  if (existing) {
    if (existing.innerHTML !== html) existing.innerHTML = html;
  } else {
    const el = document.createElement("details");
    el.className = "creator-observed-locations";
    el.innerHTML = html;
    row.appendChild(el);
  }
}
async function apply() {
  const epoch = ++renderEpoch; const projectId = currentProjectId(); const session = sessionEpoch;
  if (!loggedIn()) {
    cache = null; cacheAt = 0;
    document.querySelectorAll("#tabContent .creator-observed-locations").forEach((node) => node.remove());
    return;
  }
  if (!projectId || !document.querySelectorAll("#tabContent .file-row").length) return;
  try {
    const data = await loadData(projectId, session);
    if (!data || epoch !== renderEpoch || session !== sessionEpoch || !loggedIn() || currentProjectId() !== projectId
      || document.getElementById("projectTitle")?.dataset.projectId !== projectId) return;
    // Resolve rows after I/O: a tab switch may have replaced the entire file list.
    document.querySelectorAll("#tabContent .file-row").forEach((row) => renderForRow(row, data));
  }
  catch (error) { if (epoch === renderEpoch && session === sessionEpoch) console.warn("Creator file observations unavailable", error); }
}

injectStyles();
const target = document.getElementById("tabContent");
if (target) new MutationObserver(() => { void apply(); }).observe(target, { childList: true, subtree: true });
document.addEventListener("visibilitychange", () => { if (!document.hidden) { cacheAt = 0; void apply(); } });
window.addEventListener("storage", (event) => {
  if (event.key !== AUTH_STORE_KEY) return;
  sessionEpoch += 1; cache = null; cacheAt = 0;
  void apply();
});
void apply();
