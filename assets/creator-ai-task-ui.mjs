import { CONFIG } from "../apps/command-center/src/config.js";
import { getAccessToken, getSession } from "../apps/command-center/src/auth.js";

const Core = window.GuccCreatorAiTask;
const E = window.GuccProductionEngine;
const G = window.GuccCreatorGlobal;
const STORAGE_KEY = "gucc_ai_video_production_v1";
const CREATOR_API = `${CONFIG.SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/creator-project-api`;
const CONSTITUTION_URL = new URL("../docs/ai-video-production/CREATOR_CONSTITUTION.md", import.meta.url);

let contextEpoch = 0;
let activeContext = null;
let activeResult = null;
let lastCommand = "";
let constitutionPromise = null;

function h(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function readStore() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return value && Array.isArray(value.projects) ? value : null;
  } catch { return null; }
}
function currentLocalProject() {
  const store = readStore();
  if (!store) return null;
  const requested = new URLSearchParams(location.search).get("project");
  const project = store.projects.find((item) => item.projectId === requested)
    || store.projects.find((item) => item.projectId === store.selectedProjectId)
    || store.projects[0]
    || null;
  return project && E?.normalizeProject ? E.normalizeProject(project, { source: "ai_task_ui" }) : project;
}
function loggedIn() {
  const session = getSession();
  return Boolean(session?.access_token || session?.refresh_token);
}
async function creatorApiGetProject(projectId) {
  if (!loggedIn() || !projectId) return null;
  const token = await getAccessToken();
  const response = await fetch(CREATOR_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: CONFIG.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action: "getProject", projectId }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || `Creator API ${response.status}`);
  if (result.project?.project_id && result.project.project_id !== projectId) throw new Error("AI Task cloud snapshot project mismatch");
  return result;
}
function constitutionText() {
  if (!constitutionPromise) {
    constitutionPromise = fetch(CONSTITUTION_URL, { cache: "no-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`Creator Constitution ${response.status}`);
        return response.text();
      })
      .catch((error) => {
        constitutionPromise = null;
        throw error;
      });
  }
  return constitutionPromise;
}
function injectStyles() {
  if (document.getElementById("creatorAiTaskStyles")) return;
  const style = document.createElement("style");
  style.id = "creatorAiTaskStyles";
  style.textContent = `
    .ai-task-panel{display:grid;gap:12px}
    .ai-task-command{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end}
    .ai-task-command input{min-height:44px}
    .ai-task-recognition{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .ai-task-badge{display:inline-flex;align-items:center;min-height:30px;padding:5px 9px;border:1px solid var(--line);border-radius:999px;font-size:12px;font-weight:800}
    .ai-task-badge.ready{border-color:rgba(83,214,156,.42)}
    .ai-task-badge.blocked{border-color:rgba(255,118,132,.45)}
    .ai-task-blockers{margin:0;padding-left:20px}
    .ai-task-preview{white-space:pre-wrap;max-height:420px;overflow:auto}
    @media(max-width:680px){.ai-task-command{grid-template-columns:1fr}.ai-task-command .button{min-height:44px;width:100%}}
  `;
  document.head.appendChild(style);
}
function taskHelp() {
  return Object.values(Core?.TASKS || {}).map((task) => task.aliases?.[0]).filter(Boolean).join(" · ");
}
function panelMarkup() {
  return `<section class="panel ai-task-panel" id="creatorAiTaskPanel">
    <div class="section-title"><div><p class="eyebrow">AI TASK</p><h3>短指令 → 当前项目执行 Prompt</h3></div><p>只读当前 Project / Supabase 上下文；不会推进状态，也不会替你点 Human Gate。</p></div>
    <div class="ai-task-command">
      <label class="field">输入短指令
        <input id="creatorAiTaskInput" autocomplete="off" placeholder="例如：制作像素包 / 生成 SRT / 做剪辑蓝图" value="${h(lastCommand)}">
      </label>
      <button class="button primary" id="creatorAiTaskCopy" type="button" disabled>复制当前 AI Prompt</button>
    </div>
    <div class="ai-task-recognition">
      <span class="ai-task-badge" id="creatorAiTaskRecognition">等待指令</span>
      <span class="muted" id="creatorAiTaskSource">正在读取当前上下文…</span>
    </div>
    <div id="creatorAiTaskBlockers" hidden></div>
    <details>
      <summary>支持的短指令</summary>
      <p class="muted">${h(taskHelp())}</p>
    </details>
    <details id="creatorAiTaskContractDetails" hidden>
      <summary>查看当前 Video Contract</summary>
      <pre class="editor prompt ai-task-preview" id="creatorAiTaskContract"></pre>
    </details>
    <details id="creatorAiTaskPromptDetails" hidden>
      <summary>预览当前 AI Prompt</summary>
      <pre class="editor prompt ai-task-preview" id="creatorAiTaskPrompt"></pre>
    </details>
  </section>`;
}
function notify(message, error = false) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast show${error ? " error" : ""}`;
  window.setTimeout(() => { toast.className = "toast"; }, 3200);
}
function renderTask() {
  const input = document.querySelector("#creatorAiTaskInput");
  const badge = document.querySelector("#creatorAiTaskRecognition");
  const source = document.querySelector("#creatorAiTaskSource");
  const blockers = document.querySelector("#creatorAiTaskBlockers");
  const copy = document.querySelector("#creatorAiTaskCopy");
  const contractDetails = document.querySelector("#creatorAiTaskContractDetails");
  const promptDetails = document.querySelector("#creatorAiTaskPromptDetails");
  const contractPre = document.querySelector("#creatorAiTaskContract");
  const promptPre = document.querySelector("#creatorAiTaskPrompt");
  if (!input || !badge || !source || !blockers || !copy) return;

  lastCommand = input.value;
  if (!activeContext) {
    badge.textContent = "读取上下文中…";
    badge.className = "ai-task-badge";
    copy.disabled = true;
    return;
  }

  const command = input.value.trim();
  if (!command) {
    activeResult = null;
    badge.textContent = "等待指令";
    badge.className = "ai-task-badge";
    blockers.hidden = true;
    copy.disabled = true;
    promptDetails.hidden = true;
    contractDetails.hidden = false;
    contractPre.textContent = Core.formatVideoContract(activeContext.contract);
    source.textContent = activeContext.cloudLoaded ? "Project + Supabase 当前状态已读取" : "当前使用本地 Project 状态；Cloud Global 上下文不可用";
    return;
  }

  activeResult = Core.buildAiTaskPrompt({
    command,
    contract: activeContext.contract,
    constitutionText: activeContext.constitution,
  });
  contractDetails.hidden = false;
  contractPre.textContent = Core.formatVideoContract(activeContext.contract);
  promptDetails.hidden = !activeResult.recognized;
  if (activeResult.recognized) promptPre.textContent = activeResult.prompt;

  if (!activeResult.recognized) {
    badge.textContent = "未识别";
    badge.className = "ai-task-badge blocked";
    blockers.hidden = false;
    blockers.innerHTML = "<strong>没有匹配稳定任务别名。</strong><p class='muted'>请使用上方支持的短指令；这里不会做模糊 NLP 猜测。</p>";
    copy.disabled = true;
    return;
  }

  badge.textContent = activeResult.task.label;
  badge.className = `ai-task-badge ${activeResult.ready ? "ready" : "blocked"}`;
  copy.disabled = !activeResult.ready;
  source.textContent = activeResult.ready
    ? `可执行 · ${activeContext.cloudLoaded ? "已合并 Supabase 当前上下文" : "本地 Project 上下文"}`
    : "当前阶段不可执行 · 不会自动跨阶段";

  if (activeResult.blockers.length) {
    blockers.hidden = false;
    blockers.innerHTML = `<strong>先补这些：</strong><ul class="ai-task-blockers">${activeResult.blockers.map((item) => `<li>${h(item)}</li>`).join("")}</ul>`;
  } else blockers.hidden = true;
}
async function hydrateContext() {
  if (!Core || !E) return;
  const project = currentLocalProject();
  if (!project) return;
  const projectId = project.projectId;
  const epoch = ++contextEpoch;
  const source = document.querySelector("#creatorAiTaskSource");
  if (source) source.textContent = "正在读取 Creator Constitution / Supabase 当前状态…";

  let constitution = "";
  let snapshot = null;
  let cloudLoaded = false;
  try { constitution = await constitutionText(); }
  catch (error) { console.warn("Creator AI Task Constitution", error); }
  if (epoch !== contextEpoch || currentLocalProject()?.projectId !== projectId) return;

  try {
    snapshot = await creatorApiGetProject(projectId);
    cloudLoaded = Boolean(snapshot?.project);
  } catch (error) {
    console.warn("Creator AI Task cloud context", error);
  }
  if (epoch !== contextEpoch || currentLocalProject()?.projectId !== projectId) return;

  const legacyNextAction = E.nextAction(project);
  const globalNextAction = snapshot?.project && G?.nextGlobalAction ? G.nextGlobalAction(snapshot) : null;
  const contract = Core.buildVideoContract({ project, snapshot: snapshot || {}, legacyNextAction, globalNextAction });
  activeContext = { projectId, project, snapshot: snapshot || {}, constitution, contract, legacyNextAction, globalNextAction, cloudLoaded };

  const generated = document.querySelector("#generatedPrompt");
  if (generated) {
    generated.textContent = Core.buildStagePrompt({
      contract,
      constitutionText: constitution,
      legacyStagePrompt: E.generatePrompt(project),
    });
  }
  renderTask();
}
function mount() {
  if (!Core || !E) return;
  const generated = document.querySelector("#generatedPrompt");
  if (!generated) return;
  const stagePanel = generated.closest("section.panel");
  if (!stagePanel || document.getElementById("creatorAiTaskPanel")) return;
  injectStyles();
  stagePanel.insertAdjacentHTML("beforebegin", panelMarkup());
  document.querySelector("#creatorAiTaskInput")?.addEventListener("input", renderTask);
  document.querySelector("#creatorAiTaskCopy")?.addEventListener("click", async () => {
    if (!activeResult?.ready) return;
    await navigator.clipboard.writeText(activeResult.prompt);
    notify(`${activeResult.task.label} Prompt 已复制`);
  });
  hydrateContext();
}

const tabContent = document.querySelector("#tabContent");
if (tabContent) new MutationObserver(() => mount()).observe(tabContent, { childList: true, subtree: true });
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY && event.key !== "gameup_session_v5") return;
  activeContext = null;
  activeResult = null;
  mount();
  hydrateContext();
});
mount();
