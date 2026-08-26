import {
  STUDIO_CREATOR_PROJECT_ID_KEY,
  STUDIO_WORKSPACE_IDENTITY_KEY,
  createCanonicalProjectId,
  createNewStudioWorkspaceIdentity,
} from "./creator-pipeline-core.mjs";

const IMPORT_MARKERS = ["importFile", "aiImportPaste"];
let pendingExternalImport = false;

function studioPage() {
  const path = String(window.location?.pathname || "");
  return path.includes("/apps/video-workspace/") && !path.includes("/production-system/");
}

function readIdentity() {
  createCanonicalProjectId();
  try {
    const value = JSON.parse(localStorage.getItem(STUDIO_WORKSPACE_IDENTITY_KEY) || "null");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function writeIdentity(identity) {
  const workspaceInstanceId = String(identity?.workspaceInstanceId || "").trim();
  const creatorProjectId = String(identity?.creatorProjectId || "").trim();
  if (!workspaceInstanceId || !creatorProjectId) return createNewStudioWorkspaceIdentity();
  const next = {
    workspaceInstanceId,
    creatorProjectId,
    updatedAt: new Date().toISOString(),
    migratedFromLegacy: false,
  };
  localStorage.setItem(STUDIO_WORKSPACE_IDENTITY_KEY, JSON.stringify(next));
  localStorage.setItem(STUDIO_CREATOR_PROJECT_ID_KEY, creatorProjectId);
  return next;
}

export function identityMetadata(identity = readIdentity()) {
  return {
    __creatorWorkspaceInstanceId: String(identity?.workspaceInstanceId || ""),
    __creatorProjectId: String(identity?.creatorProjectId || ""),
  };
}

export function identityForImportedWorkspace(data = {}) {
  const workspaceInstanceId = String(data?.__creatorWorkspaceInstanceId || "").trim();
  const creatorProjectId = String(data?.__creatorProjectId || data?.projectId || "").trim();
  if (workspaceInstanceId && creatorProjectId) return writeIdentity({ workspaceInstanceId, creatorProjectId });
  return createNewStudioWorkspaceIdentity();
}

function wrapCollect() {
  const original = window.collect;
  if (typeof original !== "function" || original.__guccIdentityWrapped) return;
  function collectWithIdentity(...args) {
    const data = original.apply(this, args);
    if (data && typeof data === "object") Object.assign(data, identityMetadata());
    return data;
  }
  collectWithIdentity.__guccIdentityWrapped = true;
  window.collect = collectWithIdentity;
}

function wrapFill() {
  const original = window.fill;
  if (typeof original !== "function" || original.__guccIdentityWrapped) return;
  function fillWithIdentity(data, ...args) {
    if (data && typeof data === "object" && (pendingExternalImport || data.__creatorWorkspaceInstanceId || data.__creatorProjectId)) {
      identityForImportedWorkspace(data);
    }
    pendingExternalImport = false;
    return original.call(this, data, ...args);
  }
  fillWithIdentity.__guccIdentityWrapped = true;
  window.fill = fillWithIdentity;
}

function wrapBlankWorkspace() {
  const original = window.openBlankWorkspace;
  if (typeof original !== "function" || original.__guccIdentityWrapped) return;
  function openBlankWorkspaceWithIdentity(...args) {
    // “从空白项目开始”必须真的是新 Draft，而不是仅滚动到第一个输入框。
    if (typeof window.clearAll === "function") window.clearAll();
    else createNewStudioWorkspaceIdentity();
    return original.apply(this, args);
  }
  openBlankWorkspaceWithIdentity.__guccIdentityWrapped = true;
  window.openBlankWorkspace = openBlankWorkspaceWithIdentity;
}

function markImportIntent(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.id === "importFile" || target.closest?.("[onclick*='importAIPackage']")) pendingExternalImport = true;
}

function markDropIntent(event) {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest?.("#dropZone") && event.dataTransfer?.files?.length) pendingExternalImport = true;
}

function install() {
  if (!studioPage()) return;
  readIdentity();
  wrapCollect();
  wrapFill();
  wrapBlankWorkspace();

  document.addEventListener("change", markImportIntent, true);
  document.addEventListener("click", markImportIntent, true);
  document.addEventListener("drop", markDropIntent, true);

  // Studio may replace helpers during future in-page upgrades; keep wrappers attached cheaply.
  const observer = new MutationObserver(() => {
    wrapCollect();
    wrapFill();
    wrapBlankWorkspace();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 15000);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
}
