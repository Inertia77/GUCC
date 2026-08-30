(function () {
  "use strict";

  const E = window.GuccProductionEngine;
  const Contract = window.GuccLocalProjectContract;
  const STORAGE_KEY = "gucc_ai_video_production_v1";
  if (!E || !Contract) return;

  function notify(message, error = false) {
    const toast = document.querySelector("#toast");
    if (!toast) { window.alert(message); return; }
    toast.textContent = message;
    toast.className = `toast show${error ? " error" : ""}`;
    window.setTimeout(() => { toast.className = "toast"; }, 4200);
  }

  function currentProject() {
    try {
      const store = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      const project = store?.projects?.find((item) => item.projectId === store.selectedProjectId) || null;
      return project ? E.normalizeProject(project) : null;
    } catch { return null; }
  }

  async function sha256Text(value) {
    const data = new TextEncoder().encode(String(value));
    const digest = await crypto.subtle.digest("SHA-256", data);
    return `sha256:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  }

  async function readTextFile(directory, relativePath) {
    const parts = Contract.normalizeRelativePath(relativePath).split("/");
    const filename = parts.pop();
    let handle = directory;
    try {
      for (const part of parts) handle = await handle.getDirectoryHandle(part);
      const file = await (await handle.getFileHandle(filename)).getFile();
      return await file.text();
    } catch (error) {
      if (error?.name === "NotFoundError") return null;
      throw error;
    }
  }

  async function writeTextFile(directory, relativePath, content) {
    const parts = Contract.normalizeRelativePath(relativePath).split("/");
    const filename = parts.pop();
    let handle = directory;
    for (const part of parts) handle = await handle.getDirectoryHandle(part, { create: true });
    const fileHandle = await handle.getFileHandle(filename, { create: true });
    // File System Access createWritable() writes through a temporary backing file and commits on close.
    const writable = await fileHandle.createWritable();
    try { await writable.write(String(content)); await writable.close(); }
    catch (error) { await writable.abort().catch(() => {}); throw error; }
  }

  async function readProjectId(directory) {
    const text = await readTextFile(directory, "00_CONTROL/PROJECT_DATA.json");
    if (!text) return "";
    try { return String(JSON.parse(text)?.projectId || "").trim(); }
    catch { return "__INVALID_JSON__"; }
  }

  async function findExistingProjectDirectory(root, projectId) {
    const matches = [];
    for await (const [name, handle] of root.entries()) {
      if (handle.kind !== "directory") continue;
      const id = await readProjectId(handle).catch(() => "");
      if (id === projectId) matches.push({ name, handle });
    }
    if (matches.length > 1) throw new Error(`Workspace Root 中有多个目录声明同一 projectId：${projectId}`);
    return matches[0] || null;
  }

  async function directoryHasEntries(handle) {
    for await (const _ of handle.keys()) return true;
    return false;
  }

  async function resolveProjectDirectory(root, project) {
    const existing = await findExistingProjectDirectory(root, project.projectId);
    const canonicalName = Contract.canonicalProjectFolderName(project);
    if (existing) return { ...existing, canonicalName, reusedLegacy: existing.name !== canonicalName };

    let handle;
    let existed = true;
    try { handle = await root.getDirectoryHandle(canonicalName); }
    catch (error) {
      if (error?.name !== "NotFoundError") throw error;
      existed = false;
      handle = await root.getDirectoryHandle(canonicalName, { create: true });
    }
    if (existed) {
      const id = await readProjectId(handle);
      if (id && id !== project.projectId) throw new Error(`Canonical Folder collision：${canonicalName} 已属于 ${id}`);
      if (!id && await directoryHasEntries(handle)) throw new Error(`Canonical Folder 已存在未识别内容：${canonicalName}`);
    }
    return { name: canonicalName, handle, canonicalName, reusedLegacy: false };
  }

  async function loadManifest(projectHandle) {
    const text = await readTextFile(projectHandle, Contract.PROJECTION_MANIFEST);
    if (!text) return { version: 1, projectId: "", files: {} };
    try {
      const parsed = JSON.parse(text);
      if (!parsed.files || typeof parsed.files !== "object") parsed.files = {};
      return parsed;
    } catch { throw new Error("本地 .gucc-projections.json 损坏；为避免覆盖已停止同步"); }
  }

  async function syncFile(projectHandle, relativePath, content, previous, next) {
    const desired = String(content);
    const desiredHash = await sha256Text(desired);
    const existing = await readTextFile(projectHandle, relativePath);
    if (existing == null) {
      await writeTextFile(projectHandle, relativePath, desired);
      next.files[relativePath] = desiredHash;
      return "created";
    }
    const existingHash = await sha256Text(existing);
    if (existingHash === desiredHash) {
      next.files[relativePath] = desiredHash;
      return "unchanged";
    }
    if (previous.files?.[relativePath] && previous.files[relativePath] === existingHash) {
      await writeTextFile(projectHandle, relativePath, desired);
      next.files[relativePath] = desiredHash;
      return "updated";
    }
    return "conflict";
  }

  async function createOrSyncWorkspace() {
    if (!window.showDirectoryPicker) throw new Error("当前浏览器不支持 File System Access；请使用 Creator Local Agent bootstrap fallback");
    const project = currentProject();
    if (!project) throw new Error("当前没有选中的 Creator Project");
    const root = await window.showDirectoryPicker({ mode: "readwrite" });
    const resolved = await resolveProjectDirectory(root, project);
    for (const relative of E.DIRECTORY_STRUCTURE) {
      let handle = resolved.handle;
      for (const part of Contract.normalizeRelativePath(relative).split("/")) handle = await handle.getDirectoryHandle(part, { create: true });
    }
    const tree = E.projectFileTree(project);
    const previous = await loadManifest(resolved.handle);
    if (previous.projectId && previous.projectId !== project.projectId) throw new Error(`Projection manifest belongs to ${previous.projectId}`);
    const next = { version: 1, projectId: project.projectId, canonicalFolderName: resolved.canonicalName, updatedAt: new Date().toISOString(), files: { ...(previous.files || {}) } };
    const result = { created: 0, updated: 0, unchanged: 0, conflicts: [] };
    for (const [relativePath, content] of Object.entries(tree)) {
      const status = await syncFile(resolved.handle, relativePath, content, previous, next);
      if (status === "conflict") result.conflicts.push(relativePath);
      else result[status] += 1;
    }
    await writeTextFile(resolved.handle, Contract.PROJECTION_MANIFEST, `${JSON.stringify(next, null, 2)}\n`);
    const identity = resolved.reusedLegacy ? `${resolved.name}（Legacy Project ID 匹配，保持原目录名）` : resolved.name;
    if (result.conflicts.length) {
      notify(`Workspace 已同步到 ${identity}；${result.conflicts.length} 个本地文件有人工修改冲突，未覆盖`, true);
    } else {
      notify(`Workspace 已就绪：${identity} · 新建 ${result.created} / 更新 ${result.updated} / 无变化 ${result.unchanged}`);
    }
    return result;
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.('[data-action="sync-directory"]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    button.disabled = true;
    const oldText = button.textContent;
    button.textContent = "创建 / 同步中…";
    createOrSyncWorkspace().catch((error) => {
      if (error?.name !== "AbortError") notify(`Workspace 同步失败：${error.message}`, true);
    }).finally(() => { button.disabled = false; button.textContent = "创建 / 同步本地 Workspace"; });
  }, true);

  const button = document.querySelector('[data-action="sync-directory"]');
  if (button) {
    button.textContent = "创建 / 同步本地 Workspace";
    button.title = "按 Project ID 复用已有目录；新项目使用 标题_ShortProjectId canonical folder";
  }
})();
