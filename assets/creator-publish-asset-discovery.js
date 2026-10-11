(function () {
  "use strict";

  const STORAGE_KEY = "gucc_publish_console_v1";
  const PROVENANCE_KEY = "gucc_publish_asset_discovery_v1";
  const ASSISTANT_URL = "http://127.0.0.1:17877";

  function savedState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {}; }
    catch { return {}; }
  }

  function identity(){const state=window.GuccPublishDrafts?.current()||savedState();return {projectId:String(state.project?.creatorProjectId||state.source?.creatorProjectId||"").trim(),videoId:String(state.project?.videoId||"").trim()};}
  function projectId() { return identity().projectId; }
  function provenanceId(){const id=identity();return id.videoId?JSON.stringify([id.projectId,id.videoId]):id.projectId;}

  function provenanceStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(PROVENANCE_KEY) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch { return {}; }
  }

  function projectProvenance() {
    const id = provenanceId();
    const record = provenanceStore()[id];
    return record && typeof record === "object" ? record : {};
  }

  function saveProvenance(kind, value) {
    const id = provenanceId();
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
      body: JSON.stringify(id),
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
    if(document.querySelector(fileSelector(kind))?.files?.length)return false;
    const input = document.querySelector(pathSelector(kind));
    if (!input) return false;
    const current = String(input.value || "");
    if (!current) return true;
    const autoPath = String(currentAutoRecord(kind).path || "");
    return Boolean(autoPath && current === autoPath);
  }

  function applyAutoResult(kind, result) {
    if (!canAutoFill(kind)) return false;
    const selector = pathSelector(kind);
    const input = document.querySelector(selector);
    if (!input) return false;
    setStateInput(selector, result.path);
    input.dataset.autoDiscoveredPath = result.path || "";
    // Register actual assistant-observed metadata; never create a placeholder
    // browser File or imply that its media bytes were selected in this session.
    window.GuccPublishDrafts?.registerAsset(kind,result,identity());
    saveProvenance(kind, { path: result.path, name: result.name });
    return true;
  }

  function clearStaleAutoDiscovered(kind) {
    const record = currentAutoRecord(kind);
    const pathInput = document.querySelector(pathSelector(kind));
    const autoPath = String(record.path || pathInput?.dataset.autoDiscoveredPath || "");
    if (pathInput && autoPath && pathInput.value === autoPath) setStateInput(pathSelector(kind), "");
    if (pathInput) delete pathInput.dataset.autoDiscoveredPath;

    if(autoPath)window.GuccPublishDrafts?.registerAsset(kind,null,identity());
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
    const id = identity();
    const button = document.querySelector("#discoverProjectAssetsButton");
    if (!id.projectId) {
      if (!silent) window.alert("当前发布单还没有连接创作项目；请导入该视频的资料交接包，或手动选择成片与封面。");
      return null;
    }
    if (button) { button.disabled = true; button.textContent = "查找中…"; }
    try {
      const result = await requestDiscovery(id);
      if(JSON.stringify(identity())!==JSON.stringify(id))return null;
      if(result.projectId!==id.projectId||String(result.videoId||"")!==id.videoId)throw Error("本机素材结果与当前项目或视频不匹配");
      showVideo(result.video || { status: "missing" });
      showCover(result.covers?.preferred || { status: "missing" });
      const hint = document.querySelector("#assetDiscoveryHint");
      if (hint) hint.textContent = result.status === "resolved" ? `已定位此${id.videoId?'视频':'项目'}的本机目录；执行前仍会核验文件` : (result.warnings?.[0]||"本机尚未登记该项目目录，请手动选择文件");
      return result;
    } catch (error) {
      if (!silent) window.alert(`自动查找失败：${error.message}\n\n仍可使用现有“选择成片 / 选择封面”。`);
      return null;
    } finally {
      if (button) { button.disabled = false; button.textContent = "查找此视频的成片 / 封面"; }
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
    wrap.innerHTML = `<button id="discoverProjectAssetsButton" class="button subtle" type="button">查找此视频的成片 / 封面</button><small id="assetDiscoveryHint" style="color:var(--muted,#8e9aab)">使用项目与视频身份查找；多个候选需手动选择。</small>`;
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
