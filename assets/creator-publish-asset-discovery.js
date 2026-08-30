(function () {
  "use strict";

  const STORAGE_KEY = "gucc_publish_console_v1";
  const PROVENANCE_KEY = "gucc_publish_asset_discovery_v1";
  const ASSISTANT_URL = "http://127.0.0.1:17877";

  function savedState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {}; }
    catch { return {}; }
  }

  function projectId() { return String(savedState()?.source?.creatorProjectId || "").trim(); }

  function provenanceStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROVENANCE_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  }

  function projectProvenance() {
    const id = projectId();
    const record = provenanceStore()[id];
    return record && typeof record === "object" ? record : {};
  }

  function saveProvenance(kind, value) {
    const id = projectId();
    if (!id) return;
    const store = provenanceStore();
    const current = store[id] && typeof store[id] === "object" ? store[id] : {};
    if (value) {
      store[id] = { ...current, [kind]: { path: String(value.path || ""), name: String(value.name || ""), updatedAt: new Date().toISOString() } };
    } else {
      delete current[kind];
      if (Object.keys(current).length) store[id] = current;
      else delete store[id];
    }
    localStorage.setItem(PROVENANCE_KEY, JSON.stringify(store));
  }

  async function requestDiscovery(id) {
    const response = await fetch(`${ASSISTANT_URL}/api/discover-project-assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id }),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `本机助手返回 ${response.status}`);
    return data;
  }

  function setStateInput(selector, value) {
    const input = document.querySelector(selector);
    if (!input) return;
    input.value = value || "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function pathSelector(kind) { return kind === "video" ? "#localVideoPath" : "#localCoverPath"; }
  function fileSelector(kind) { return kind === "video" ? "#videoFile" : "#coverFile"; }

  function currentAutoRecord(kind) {
    const record = projectProvenance()[kind];
    return record && typeof record === "object" ? record : {};
  }

  function canAutoFill(kind) {
    const input = document.querySelector(pathSelector(kind));
    if (!input) return false;
    const current = String(input.value || "");
    if (!current) return true;
    const autoPath = String(currentAutoRecord(kind).path || "");
    return Boolean(autoPath && current === autoPath);
  }

  function mimeFor(kind, name) {
    const lower = String(name || "").toLowerCase();
    if (kind === "video") {
      if (lower.endsWith(".webm")) return "video/webm";
      if (lower.endsWith(".mov")) return "video/quicktime";
      if (lower.endsWith(".mkv")) return "video/x-matroska";
      return "video/mp4";
    }
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    return "image/png";
  }

  function hydrateExistingConsoleAsset(kind, name) {
    const input = document.querySelector(fileSelector(kind));
    if (!input || typeof DataTransfer === "undefined" || typeof File === "undefined") return;
    // The bytes remain on disk and Publisher Assistant uploads by absolute local path.
    // This zero-byte File only reuses the Console's existing metadata/state path so
    // preflight behaves exactly like the manual Windows picker without cloud upload.
    const transfer = new DataTransfer();
    transfer.items.add(new File([], name, { type: mimeFor(kind, name), lastModified: Date.now() }));
    input.files = transfer.files;
    input.dataset.autoDiscoveredName = name || "";
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function applyAutoResult(kind, result) {
    if (!canAutoFill(kind)) return false;
    const selector = pathSelector(kind);
    const input = document.querySelector(selector);
    if (!input) return false;
    setStateInput(selector, result.path);
    input.dataset.autoDiscoveredPath = result.path || "";
    hydrateExistingConsoleAsset(kind, result.name);
    saveProvenance(kind, { path: result.path, name: result.name });
    return true;
  }

  function clearStaleAutoDiscovered(kind) {
    const record = currentAutoRecord(kind);
    const pathInput = document.querySelector(pathSelector(kind));
    const autoPath = String(record.path || pathInput?.dataset.autoDiscoveredPath || "");
    if (pathInput && autoPath && pathInput.value === autoPath) setStateInput(pathSelector(kind), "");
    if (pathInput) delete pathInput.dataset.autoDiscoveredPath;

    const fileInput = document.querySelector(fileSelector(kind));
    const autoName = String(record.name || fileInput?.dataset.autoDiscoveredName || "");
    if (fileInput && typeof DataTransfer !== "undefined" && autoName && fileInput.files?.length === 1 && fileInput.files[0]?.name === autoName && fileInput.files[0]?.size === 0) {
      fileInput.files = new DataTransfer().files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (fileInput) delete fileInput.dataset.autoDiscoveredName;
    saveProvenance(kind, null);
  }

  function names(candidates) { return (candidates || []).map((item) => item.name).filter(Boolean).join("、"); }

  function showVideo(result) {
    const meta = document.querySelector("#videoMeta");
    if (!meta) return;
    if (result.status === "found") {
      const applied = applyAutoResult("video", result);
      meta.textContent = applied ? `✅ 已找到本项目成片 · ${result.name}` : `ℹ 已找到本项目成片 · ${result.name}；保留当前手动选择`;
      meta.dataset.discovery = applied ? "found" : "manual-preserved";
    } else if (result.status === "ambiguous") {
      clearStaleAutoDiscovered("video");
      meta.textContent = `⚠ 发现多个成片候选：${names(result.candidates)}。不会按 mtime 猜，请手动选择。`;
      meta.dataset.discovery = "ambiguous";
    } else {
      clearStaleAutoDiscovered("video");
      meta.textContent = "未找到本项目成片，请手动选择；文件不会上传到 GUCC。";
      meta.dataset.discovery = "missing";
    }
  }

  function showCover(result) {
    const meta = document.querySelector("#coverMeta");
    if (!meta) return;
    if (result.status === "found") {
      const applied = applyAutoResult("cover", result);
      meta.textContent = applied ? `✅ 已找到封面 · ${result.name}` : `ℹ 已找到封面 · ${result.name}；保留当前手动选择`;
      meta.dataset.discovery = applied ? "found" : "manual-preserved";
    } else if (result.status === "ambiguous") {
      clearStaleAutoDiscovered("cover");
      meta.textContent = `⚠ 发现多个封面候选：${names(result.candidates)}。请手动选择。`;
      meta.dataset.discovery = "ambiguous";
    } else {
      clearStaleAutoDiscovered("cover");
      meta.textContent = "未找到封面；封面可选，也可以继续使用手动选择。";
      meta.dataset.discovery = "missing";
    }
  }

  async function discover(silent = false) {
    const id = projectId();
    const button = document.querySelector("#discoverProjectAssetsButton");
    if (!id) {
      if (!silent) window.alert("当前发布单没有 creatorProjectId；请从同一个 Creator Project handoff 进入 Publish，或继续使用手动选择。");
      return null;
    }
    if (button) { button.disabled = true; button.textContent = "查找中…"; }
    try {
      const result = await requestDiscovery(id);
      showVideo(result.video || { status: "missing" });
      showCover(result.covers?.preferred || { status: "missing" });
      const hint = document.querySelector("#assetDiscoveryHint");
      if (hint) hint.textContent = result.status === "resolved" ? `Project ID 已定位本机 Workspace · ${id}` : `本机未找到 ${id}`;
      return result;
    } catch (error) {
      if (!silent) window.alert(`自动查找失败：${error.message}\n\n仍可使用现有“选择成片 / 选择封面”。`);
      return null;
    } finally {
      if (button) { button.disabled = false; button.textContent = "自动查找本项目成片 / 封面"; }
    }
  }

  function installManualPrecedenceListeners() {
    [["video", pathSelector("video"), "input"], ["cover", pathSelector("cover"), "input"], ["video", fileSelector("video"), "change"], ["cover", fileSelector("cover"), "change"]].forEach(([kind, selector, eventName]) => {
      const input = document.querySelector(selector);
      if (!input) return;
      input.addEventListener(eventName, (event) => {
        if (!event.isTrusted) return;
        saveProvenance(kind, null);
        delete input.dataset.autoDiscoveredPath;
        delete input.dataset.autoDiscoveredName;
      });
    });
  }

  function installUi() {
    const setup = document.querySelector(".assistant-setup");
    if (!setup || document.querySelector("#discoverProjectAssetsButton")) return;
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gap = "6px";
    wrap.style.marginTop = "8px";
    wrap.innerHTML = `<button id="discoverProjectAssetsButton" class="button subtle" type="button">自动查找本项目成片 / 封面</button><small id="assetDiscoveryHint" style="color:var(--muted,#8e9aab)">按 creatorProjectId 定位，不按标题或最近文件猜测。</small>`;
    setup.after(wrap);
    wrap.querySelector("button").addEventListener("click", () => discover(false));
  }

  installManualPrecedenceListeners();
  installUi();
  window.setTimeout(async () => {
    if (!projectId()) return;
    try {
      const health = await fetch(`${ASSISTANT_URL}/api/health`, { cache: "no-store" });
      if (health.ok) await discover(true);
    } catch {}
  }, 450);
})();
