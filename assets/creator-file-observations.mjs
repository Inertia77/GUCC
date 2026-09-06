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
  style.textContent = `.creator-observed-locations{grid-column:1/-1;margin-top:8px;padding:9px 11px;border-radius:10px;background:rgba(255,255,255,.035);font-size:12px;color:#aeb6c7}.creator-observed-locations strong{color:#e7eafb}.creator-observed-location{display:flex;gap:8px;flex-wrap:wrap;margin-top:5px}.creator-observed-location.present{color:#79dda6}.creator-observed-location.missing{color:#f5c15d}.creator-observed-location.unknown{color:#98a3b8}`;
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
  const button = row.querySelector("[data-upload-file]"); const fileKey = button?.dataset.uploadFile; if (!fileKey) return;
  const logical = (data?.files || []).find((file) => file.file_key === fileKey);
  const devices = new Map((data?.devices || []).map((device) => [device.device_id, device]));
  const locations = logical ? (data?.fileLocations || []).filter((location) => location.logical_file_id === logical.id) : [];
  const existing = row.querySelector(".creator-observed-locations");
  let html = `<strong>Expected</strong> · ${escapeHtml(logical?.relative_path || fileKey)} · Logical ${escapeHtml(logical?.status || "Unknown")}<br><strong>Observed</strong> · `;
  if (!locations.length) html += `尚未由 Local Agent 验证`;
  else html += locations.map((location) => {
    const availability = String(location.availability || "unknown"); const icon = availability === "present" ? "✓" : availability === "missing" ? "⚠" : "?";
    const label = devices.get(location.device_id)?.label || location.device_id || "未知设备";
    const status = availability === "missing" ? "上次存在，现在未找到" : availability;
    const size = location.size_bytes == null ? "" : ` · ${Number(location.size_bytes).toLocaleString()} B`;
    return `<span class="creator-observed-location ${escapeHtml(availability)}">${icon} ${escapeHtml(label)} · ${escapeHtml(location.relative_path || logical.relative_path || "")} · ${escapeHtml(status)} · ${escapeHtml(relativeTime(location.observed_at))}${size}</span>`;
  }).join("");
  if (existing) { if (existing.innerHTML !== html) existing.innerHTML = html; }
  else { const el = document.createElement("div"); el.className = "creator-observed-locations"; el.innerHTML = html; row.appendChild(el); }
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
