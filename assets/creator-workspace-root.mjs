import { CONFIG } from "../apps/command-center/src/config.js";
import { getAccessToken, getSession } from "../apps/command-center/src/auth.js";

const CREATOR_API = `${CONFIG.SUPABASE_URL.replace(/\/+$/, "")}/functions/v1/creator-project-api`;
const DEVICE_ID_KEY = "gucc_creator_device_id_v1";
const WORKSPACE_ROOT_KEY = "gucc_creator_workspace_root_v1";
const BUTTON_ID = "creatorWorkspaceRootButton";
const DIALOG_ID = "creatorWorkspaceRootDialog";
const STYLE_ID = "creatorWorkspaceRootStyles";

function ready() {
  if (document.readyState === "loading") {
    return new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }));
  }
  return Promise.resolve();
}

function loggedIn() {
  const session = getSession();
  return Boolean(session?.access_token || session?.refresh_token);
}

function deviceId() {
  let value = localStorage.getItem(DEVICE_ID_KEY) || "";
  if (!value) {
    value = `web_${crypto.randomUUID?.() || `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`}`;
    localStorage.setItem(DEVICE_ID_KEY, value);
  }
  return value;
}

function platformName() {
  return String(navigator.userAgentData?.platform || navigator.platform || "Web").slice(0, 240);
}

function readLocalConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WORKSPACE_ROOT_KEY) || "null");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? {
          label: String(parsed.label || "").trim().slice(0, 160),
          workspaceRoot: String(parsed.workspaceRoot || "").trim().slice(0, 1200),
          updatedAt: String(parsed.updatedAt || ""),
        }
      : { label: "", workspaceRoot: "", updatedAt: "" };
  } catch {
    return { label: "", workspaceRoot: "", updatedAt: "" };
  }
}

function writeLocalConfig(config) {
  const next = {
    label: String(config.label || "").trim().slice(0, 160),
    workspaceRoot: String(config.workspaceRoot || "").trim().slice(0, 1200),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(WORKSPACE_ROOT_KEY, JSON.stringify(next));
  return next;
}

function deviceDescriptor(config, includeRoot = true) {
  const descriptor = {
    deviceId: deviceId(),
    label: config.label || "GUCC Web",
    deviceKind: "web",
    platform: platformName(),
    capabilities: {
      workspaceRootRegistration: true,
      filesystemObservation: false,
    },
  };
  if (includeRoot && config.workspaceRoot) {
    descriptor.workspaceRoot = config.workspaceRoot;
    descriptor.metadata = {
      workspaceRootSource: "user-declared-web",
      workspaceRootVerified: false,
    };
  }
  return descriptor;
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

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .creator-workspace-root-dialog{width:min(640px,calc(100vw - 24px));border:1px solid rgba(142,164,255,.32);border-radius:18px;background:#0f131d;color:#f6f7fb;padding:0;box-shadow:0 28px 90px rgba(0,0,0,.58)}
    .creator-workspace-root-dialog::backdrop{background:rgba(0,0,0,.72);backdrop-filter:blur(4px)}
    .creator-workspace-root-inner{padding:22px}.creator-workspace-root-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}.creator-workspace-root-head h2{margin:3px 0 6px}.creator-workspace-root-head p{margin:0;color:#aeb6c7}.creator-workspace-root-close{border:0;background:transparent;color:#dce2f0;font-size:24px;cursor:pointer}
    .creator-workspace-root-device{margin:16px 0;padding:12px;border:1px solid rgba(142,164,255,.18);border-radius:12px;background:rgba(255,255,255,.035)}.creator-workspace-root-device code{display:block;margin-top:4px;overflow-wrap:anywhere;color:#bfc9ff}
    .creator-workspace-root-form{display:grid;gap:14px}.creator-workspace-root-form label{display:grid;gap:6px;font-weight:650}.creator-workspace-root-form input{width:100%;box-sizing:border-box;border:1px solid rgba(142,164,255,.25);border-radius:10px;background:#171c29;color:#f6f7fb;padding:10px 12px;font:inherit}.creator-workspace-root-form small{color:#98a3b8;font-weight:400;line-height:1.55}
    .creator-workspace-root-notice{padding:12px 14px;border-radius:12px;background:rgba(245,193,93,.09);border:1px solid rgba(245,193,93,.24);color:#e8d9b8;line-height:1.6}.creator-workspace-root-status{min-height:20px;color:#aeb6c7;font-size:12px}.creator-workspace-root-status.error{color:#ff8893}.creator-workspace-root-status.ok{color:#79dda6}
    .creator-workspace-root-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:2px}.creator-workspace-root-actions button{border:1px solid rgba(142,164,255,.28);border-radius:10px;background:#22283a;color:#f6f7fb;padding:9px 12px;cursor:pointer}.creator-workspace-root-actions button.primary{background:#5166f5;border-color:#6d7efa}.creator-workspace-root-actions button:disabled{opacity:.55;cursor:wait}
  `;
  document.head.appendChild(style);
}

function ensureUi() {
  injectStyles();
  const actions = document.querySelector(".top-actions");
  if (!actions) return null;

  let button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = "button ghost";
    button.addEventListener("click", () => openDialog());
    actions.prepend(button);
  }

  let dialog = document.getElementById(DIALOG_ID);
  if (!dialog) {
    dialog = document.createElement("dialog");
    dialog.id = DIALOG_ID;
    dialog.className = "creator-workspace-root-dialog";
    dialog.innerHTML = `
      <div class="creator-workspace-root-inner">
        <div class="creator-workspace-root-head">
          <div><p class="eyebrow">LOCAL-FIRST DEVICE</p><h2>本机工作区登记</h2><p>告诉 GUCC 这台设备通常把 Creator 项目放在哪里。</p></div>
          <button class="creator-workspace-root-close" type="button" aria-label="关闭">×</button>
        </div>
        <div class="creator-workspace-root-device"><strong>当前 Device ID</strong><code data-workspace-device-id></code></div>
        <form class="creator-workspace-root-form" data-workspace-root-form>
          <label>设备名称
            <input name="label" maxlength="160" placeholder="例如：主力 Windows 创作机">
            <small>用于以后区分桌面机、笔记本或其他 Creator 设备。</small>
          </label>
          <label>Workspace Root
            <input name="workspaceRoot" maxlength="1200" required placeholder="例如：D:\\GUCC\\Projects">
            <small>建议填写所有 Creator 项目的共同父目录，而不是某一个具体项目目录。</small>
          </label>
          <div class="creator-workspace-root-notice"><strong>这是“登记”，不是扫描。</strong> 网页浏览器无法验证你填写的完整系统路径，也不会读取、扫描或上传这个目录。保存后只把这段路径文字和设备身份同步到 Supabase，供后续 Local Agent / 文件位置登记使用。</div>
          <div class="creator-workspace-root-status" data-workspace-root-status></div>
          <div class="creator-workspace-root-actions"><button type="button" data-workspace-cancel>取消</button><button class="primary" type="submit">保存登记</button></div>
        </form>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector(".creator-workspace-root-close").addEventListener("click", () => dialog.close());
    dialog.querySelector("[data-workspace-cancel]").addEventListener("click", () => dialog.close());
    dialog.querySelector("[data-workspace-root-form]").addEventListener("submit", saveDialog);
  }

  refreshButton();
  return { button, dialog };
}

function setStatus(text, mode = "") {
  const el = document.querySelector("[data-workspace-root-status]");
  if (!el) return;
  el.textContent = text;
  el.className = `creator-workspace-root-status${mode ? ` ${mode}` : ""}`;
}

function refreshButton(config = readLocalConfig()) {
  const button = document.getElementById(BUTTON_ID);
  if (!button) return;
  button.textContent = config.workspaceRoot ? "本机工作区 ✓" : "本机工作区";
  button.title = config.workspaceRoot
    ? `已登记：${config.workspaceRoot}`
    : "登记这台 Creator 设备的 Workspace Root";
}

function openDialog() {
  const ui = ensureUi();
  if (!ui) return;
  const config = readLocalConfig();
  const form = ui.dialog.querySelector("[data-workspace-root-form]");
  form.elements.label.value = config.label || "GUCC Web";
  form.elements.workspaceRoot.value = config.workspaceRoot;
  ui.dialog.querySelector("[data-workspace-device-id]").textContent = deviceId();
  setStatus(loggedIn() ? "保存后会同步到 Creator Cloud State。" : "当前未登录：先保存到本浏览器，登录后会自动登记。", "");
  ui.dialog.showModal();
  form.elements.workspaceRoot.focus();
}

async function saveDialog(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');
  const workspaceRoot = String(form.elements.workspaceRoot.value || "").trim();
  const label = String(form.elements.label.value || "GUCC Web").trim();
  if (!workspaceRoot) {
    setStatus("Workspace Root 不能为空。", "error");
    return;
  }

  const config = writeLocalConfig({ label, workspaceRoot });
  refreshButton(config);
  if (!loggedIn()) {
    setStatus("已保存到本浏览器；登录 Command Center 后会登记到云端。", "ok");
    return;
  }

  submit.disabled = true;
  setStatus("正在登记这台设备…");
  try {
    await creatorApi("registerDevice", {
      deviceId: deviceId(),
      device: deviceDescriptor(config, true),
    });
    setStatus("登记完成。GUCC 只保存了设备身份与路径文字，没有扫描文件。", "ok");
  } catch (error) {
    console.error("Workspace Root registration failed", error);
    setStatus(`本地已保存，但云端登记失败：${error.message}`, "error");
  } finally {
    submit.disabled = false;
  }
}

async function hydrateDevice() {
  const local = readLocalConfig();
  refreshButton(local);
  if (!loggedIn()) return;
  try {
    const result = await creatorApi("registerDevice", {
      deviceId: deviceId(),
      device: deviceDescriptor(local, Boolean(local.workspaceRoot)),
    });
    const cloud = result?.device || {};
    if (!local.workspaceRoot && cloud.workspace_root) {
      const hydrated = writeLocalConfig({
        label: cloud.label || local.label || "GUCC Web",
        workspaceRoot: cloud.workspace_root,
      });
      refreshButton(hydrated);
    }
  } catch (error) {
    console.warn("Workspace Root cloud hydration skipped", error);
  }
}

await ready();
if (ensureUi()) await hydrateDevice();
