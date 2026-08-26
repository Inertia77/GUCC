import { CONFIG } from "../apps/command-center/src/config.js";
import { getAccessToken, getSession } from "../apps/command-center/src/auth.js";
import { PRODUCTION_STORAGE_KEY } from "./creator-pipeline-core.mjs";
import { buildCreatorDashboard } from "./creator-dashboard-core.mjs";

const CREATOR_API = `${CONFIG.SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/creator-project-api`;
const root = document.getElementById("creatorDashboard");

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function loggedIn() {
  const session = getSession();
  return Boolean(session?.access_token || session?.refresh_token);
}

function readLocalProjects() {
  try {
    const store = JSON.parse(localStorage.getItem(PRODUCTION_STORAGE_KEY) || "null");
    return Array.isArray(store?.projects) ? store.projects : [];
  } catch {
    return [];
  }
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

function projectHref(projectId, route = "production") {
  const base = route === "publish" ? "./apps/publishing-console/" : "./apps/video-workspace/production-system/";
  return `${base}?project=${encodeURIComponent(projectId)}`;
}

function formatDate(value) {
  if (!value) return "未设置";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: value.includes?.("T") ? "2-digit" : undefined, minute: value.includes?.("T") ? "2-digit" : undefined }).format(date);
}

function lockPills(locks = {}) {
  const entries = [["contentLock", "C"], ["scriptLock", "S"], ["audioLock", "A"], ["pictureLock", "P"]];
  return entries.map(([key, label]) => `<span class="creator-lock ${locks[key] ? "is-on" : ""}" title="${key}">${label}</span>`).join("");
}

function renderAction(item) {
  const project = item.project;
  return `<a class="creator-action creator-action-${escapeHtml(item.kind)}" href="${projectHref(project.projectId, item.route)}">
    <span class="creator-action-icon">${item.icon}</span>
    <span class="creator-action-body"><small>${escapeHtml(item.label)} · ${escapeHtml(project.name)}</small><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.reason || "")}</span></span>
    <span class="creator-action-go">继续 →</span>
  </a>`;
}

function renderProject(project) {
  const requirements = project.nextRequirements.slice(0, 3).map((file) => file.label).join(" · ");
  const healthNote = project.health.reasons[0] || project.warnings[0] || "当前项目状态正常";
  return `<a class="creator-project-card health-${escapeHtml(project.health.code)}" href="${projectHref(project.projectId)}">
    <div class="creator-project-top"><span class="creator-health">${project.health.icon} ${escapeHtml(project.health.label)}</span><span class="creator-revision">r${project.revision || 0}</span></div>
    <h3>${escapeHtml(project.name)}</h3>
    <p>${escapeHtml(project.game)}</p>
    <p class="creator-topic">${escapeHtml(project.topic)}</p>
    <div class="creator-stage"><strong>${escapeHtml(project.currentState)}</strong><span>${project.progress}%</span></div>
    <div class="creator-progress"><span style="width:${project.progress}%"></span></div>
    <div class="creator-project-meta"><span>${lockPills(project.locks)}</span><span>目标 ${escapeHtml(formatDate(project.targetPublishDate))} · 更新 ${escapeHtml(formatDate(project.updatedAt))}</span></div>
    <div class="creator-project-next"><small>唯一下一步</small><strong>${escapeHtml(project.nextAction)}</strong><span>下一步需要 · ${escapeHtml(requirements || "无需额外文件")}</span><span class="creator-project-health-note">项目状态 · ${escapeHtml(healthNote)}</span></div>
  </a>`;
}

function renderDashboard(dashboard) {
  const actions = dashboard.actions.slice(0, 5);
  const projects = dashboard.activeProjects;
  root.innerHTML = `
    <div class="creator-dashboard-head">
      <div><p class="eyebrow">TODAY / ACTION QUEUE</p><h2>现在最应该做</h2></div>
      <button class="creator-refresh" id="creatorDashboardRefresh" type="button">刷新</button>
    </div>
    <div class="creator-action-list">${actions.length ? actions.map(renderAction).join("") : `<div class="creator-empty">当前没有待推进项目。难得清静，但别急着给系统再添十个按钮。</div>`}</div>
    <div class="creator-dashboard-head creator-projects-head">
      <div><p class="eyebrow">MY CREATIONS</p><h2>我的创作 <span>${projects.length}</span></h2></div>
      <a href="./apps/video-workspace/production-system/">打开 Production</a>
    </div>
    <div class="creator-project-grid">${projects.length ? projects.map(renderProject).join("") : `<div class="creator-empty">还没有 Active Project。先在 Studio 想清楚，再转入正式制作。</div>`}</div>`;
  document.getElementById("creatorDashboardRefresh")?.addEventListener("click", loadDashboard);
}

function renderLogin() {
  root.innerHTML = `<div class="creator-login-card"><div><p class="eyebrow">CREATOR OS</p><h2>我的创作</h2><p>登录 DB 后，这里会直接显示跨项目下一步、健康状态和截止日期。</p></div><a href="./apps/command-center/">登录并读取项目</a></div>`;
}

function renderError(error) {
  root.innerHTML = `<div class="creator-login-card creator-error"><div><p class="eyebrow">CREATOR DASHBOARD</p><h2>暂时无法读取项目</h2><p>${escapeHtml(error?.message || "未知错误")}</p></div><button id="creatorDashboardRetry" type="button">重试</button></div>`;
  document.getElementById("creatorDashboardRetry")?.addEventListener("click", loadDashboard);
}

async function loadDashboard() {
  if (!root) return;
  if (!loggedIn()) return renderLogin();
  root.setAttribute("aria-busy", "true");
  root.innerHTML = `<div class="creator-loading">正在计算跨项目唯一下一步…</div>`;
  try {
    const data = await creatorApi("dashboard");
    renderDashboard(buildCreatorDashboard(data, { localProjects: readLocalProjects(), now: new Date() }));
  } catch (error) {
    renderError(error);
  } finally {
    root.removeAttribute("aria-busy");
  }
}

loadDashboard();
