(function () {
  "use strict";

  const Rules = window.GuccPublishingRules;
  const STORAGE_KEY = "gucc_publish_console_v1";
  const SCHEMA_VERSION = "gucc-publish-console-1";
  const ASSISTANT_URL = "http://127.0.0.1:17877";
  const EXECUTION_STATUSES = ["未开始", "准备中", "等待最终检查", "已上传草稿", "审核中", "已发布", "失败 / 待处理"];
  const runtimeAssets = { video: null, cover: null };
  let toastTimer = 0;
  let saveTimer = 0;
  let assistantOnline = false;
  let jobPollTimer = 0;

  function defaultState() {
    const enabled = {};
    const platforms = {};
    const execution = {};
    Object.keys(Rules.PLATFORMS).forEach((key) => {
      enabled[key] = true;
      platforms[key] = {};
      execution[key] = { status: "未开始", postUrl: "", postId: "", note: "" };
    });
    platforms.bilibili.copyright = "原创";
    platforms.douyin.disclosure = "无特殊披露";
    platforms.youtube.visibility = "私享";
    platforms.youtube.madeForKids = "否，不是面向儿童的内容";
    platforms.youtube.language = "简体中文";
    platforms.tiktok.visibility = "Only you / 仅自己";
    platforms.tiktok.interaction = "允许评论、Duet、Stitch";
    platforms.tiktok.disclosure = "无特殊披露";
    return {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      project: { title: "", shortName: "", game: "", note: "" },
      common: { publishAt: "", timezone: "Asia/Tokyo", video: null, cover: null, videoPath: "", coverPath: "" },
      enabled,
      platforms,
      execution,
      snapshots: [],
      source: { workspaceVersion: "", publishPackage: "" },
      preflight: { checkedAt: "", errors: 0, warnings: 0 }
    };
  }

  function mergeState(saved) {
    const base = defaultState();
    if (!saved || typeof saved !== "object") return base;
    return {
      ...base,
      ...saved,
      project: { ...base.project, ...(saved.project || {}) },
      common: { ...base.common, ...(saved.common || {}) },
      enabled: { ...base.enabled, ...(saved.enabled || {}) },
      platforms: Object.fromEntries(Object.keys(Rules.PLATFORMS).map((key) => [key, { ...base.platforms[key], ...(saved.platforms?.[key] || {}) }])),
      execution: Object.fromEntries(Object.keys(Rules.PLATFORMS).map((key) => [key, { ...base.execution[key], ...(saved.execution?.[key] || {}) }])),
      snapshots: Array.isArray(saved.snapshots) ? saved.snapshots : [],
      source: { ...base.source, ...(saved.source || {}) },
      preflight: { ...base.preflight, ...(saved.preflight || {}) }
    };
  }

  function loadState() {
    try { return mergeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")); }
    catch { return defaultState(); }
  }

  let state = loadState();

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  function getPath(object, path) {
    return path.split(".").reduce((value, key) => value?.[key], object);
  }

  function setPath(object, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    const target = keys.reduce((value, key) => (value[key] ||= {}), object);
    target[last] = value;
  }

  function saveState(message = "已自动保存") {
    clearTimeout(saveTimer);
    const indicator = $("#saveState");
    if (indicator) indicator.textContent = "正在保存…";
    saveTimer = window.setTimeout(() => {
      state.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      if (indicator) indicator.textContent = message;
    }, 180);
  }

  function toast(message) {
    const box = $("#toast");
    box.textContent = message;
    box.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => box.classList.remove("show"), 2400);
  }

  async function assistantRequest(path, options = {}) {
    const response = await fetch(`${ASSISTANT_URL}${path}`, {
      method: options.method || "GET",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `本机助手返回 ${response.status}`);
    return data;
  }

  function renderAssistantState(online, detail = "") {
    assistantOnline = online;
    const indicator = $("#assistantState");
    indicator.classList.toggle("online", online);
    indicator.classList.toggle("offline", !online);
    indicator.innerHTML = `<i></i>${online ? "本机助手已连接" : "本机助手未连接"}`;
    indicator.title = detail;
    $("#oneClickPrepareButton").disabled = !online;
  }

  async function checkAssistant(silent = false) {
    try {
      const health = await assistantRequest("/api/health");
      renderAssistantState(true, health.profileDir || "");
      if (!silent) toast("本机发布助手连接正常");
      return true;
    } catch (error) {
      renderAssistantState(false, error.message);
      if (!silent) toast("本机助手未启动；请运行 scripts/start-publishing-console.bat");
      return false;
    }
  }

  async function pickAssistantFile(kind) {
    if (!assistantOnline && !await checkAssistant()) return;
    try {
      const result = await assistantRequest("/api/select-file", { method: "POST", body: { kind } });
      if (!result.path) return;
      if (kind === "video") {
        state.common.videoPath = result.path;
        state.common.video = { name: result.name, size: null, type: "video/local" };
        $("#localVideoPath").value = result.path;
      } else {
        state.common.coverPath = result.path;
        state.common.cover = { name: result.name, size: null, type: "image/local" };
        $("#localCoverPath").value = result.path;
      }
      state.preflight.checkedAt = "";
      renderAssetMeta();
      updateHero();
      saveState("本机素材路径已保存");
      toast(`${kind === "video" ? "成片" : "封面"}已选择`);
    } catch (error) { toast(`选择失败：${error.message}`); }
  }

  async function openLoginSetup() {
    if (!assistantOnline && !await checkAssistant()) return;
    const button = $("#openLoginButton");
    button.disabled = true;
    button.textContent = "正在打开…";
    try {
      await assistantRequest("/api/open-login", { method: "POST", body: { platforms: enabledKeys() } });
      toast("专用浏览器已打开；请确认各平台都已登录");
    } catch (error) { toast(`打开失败：${error.message}`); }
    finally { button.disabled = false; button.textContent = "首次登录 / 检查账号"; }
  }

  const JOB_STATUS_LABELS = {
    queued: "等待执行", running: "正在准备", ready_for_review: "等待最终检查",
    needs_login: "需要登录", needs_attention: "需要处理", failed: "执行失败",
    completed: "全部准备完成"
  };

  function renderAutomationJob(job) {
    const box = $("#automationJob");
    if (!job) {
      box.className = "automation-job empty-state";
      box.textContent = "尚未启动自动准备任务。";
      return;
    }
    box.className = "automation-job active";
    const platforms = Object.entries(job.platforms || {}).map(([key, item]) => {
      const platform = Rules.PLATFORMS[key];
      const filled = item.filled?.length ? `已处理：${item.filled.join("、")}` : "尚未填写字段";
      const warnings = item.warnings?.length ? `<span class="job-warning">${escapeHtml(item.warnings.join("；"))}</span>` : "";
      return `<div class="job-platform" style="--platform-accent:${platform?.accent || "var(--cyan)"}">
        <strong>${escapeHtml(platform?.label || key)} · ${escapeHtml(JOB_STATUS_LABELS[item.status] || item.status)}</strong>
        <span>${escapeHtml(filled)}</span>${warnings}
      </div>`;
    }).join("");
    box.innerHTML = `<div class="job-head"><strong>${escapeHtml(JOB_STATUS_LABELS[job.status] || job.status)}</strong><span>${job.current ? `当前：${escapeHtml(Rules.PLATFORMS[job.current]?.label || job.current)}` : "浏览器标签页会保持打开"}</span></div><div class="job-platforms">${platforms}</div>${job.error ? `<div class="check-item error"><i>×</i><span>${escapeHtml(job.error)}</span></div>` : ""}`;
  }

  function finishAutomationJob(job) {
    Object.entries(job.platforms || {}).forEach(([key, item]) => {
      if (!state.execution[key]) return;
      if (item.status === "ready_for_review") state.execution[key].status = "等待最终检查";
      else if (["failed", "needs_login", "needs_attention"].includes(item.status)) state.execution[key].status = "失败 / 待处理";
      if (item.warnings?.length) state.execution[key].note = item.warnings.join("；");
    });
    renderExecution();
    updateHero();
    saveState("自动准备结果已保存");
    $("#oneClickPrepareButton").disabled = !assistantOnline;
    $("#oneClickPrepareButton").textContent = "重新准备全部平台";
    toast(job.status === "completed" ? "全部平台已准备好，请在浏览器中最终检查" : "自动准备已结束，部分平台需要登录或人工处理");
  }

  async function pollAutomationJob(jobId) {
    clearTimeout(jobPollTimer);
    try {
      const result = await assistantRequest(`/api/jobs/${jobId}`);
      renderAutomationJob(result.job);
      if (["completed", "needs_attention", "failed"].includes(result.job.status)) {
        finishAutomationJob(result.job);
        return;
      }
      jobPollTimer = window.setTimeout(() => pollAutomationJob(jobId), 1400);
    } catch (error) {
      $("#oneClickPrepareButton").disabled = false;
      toast(`读取自动任务失败：${error.message}`);
    }
  }

  async function startOneClickPrepare() {
    if (!assistantOnline && !await checkAssistant()) return;
    const checks = runPreflight();
    if (checks.errors) { showView("preflight"); toast(`还有 ${checks.errors} 个硬错误，请先修复`); return; }
    if (!Rules.normalizeText(state.common.videoPath)) { showView("prepare"); toast("请先通过本机助手选择成片"); return; }
    const button = $("#oneClickPrepareButton");
    button.disabled = true;
    button.textContent = "正在启动…";
    try {
      enabledKeys().forEach((key) => { state.execution[key].status = "准备中"; });
      renderExecution();
      const result = await assistantRequest("/api/prepare", {
        method: "POST",
        body: {
          videoPath: state.common.videoPath,
          coverPath: state.common.coverPath || "",
          enabled: enabledKeys(),
          platforms: state.platforms
        }
      });
      renderAutomationJob(result.job);
      button.textContent = "正在自动上传和填表…";
      pollAutomationJob(result.job.id);
    } catch (error) {
      button.disabled = false;
      button.textContent = "一键准备全部平台";
      toast(`启动失败：${error.message}`);
    }
  }

  function enabledKeys() {
    return Object.keys(Rules.PLATFORMS).filter((key) => state.enabled[key]);
  }

  function updateHero() {
    const enabled = enabledKeys();
    const published = enabled.filter((key) => state.execution[key]?.status === "已发布").length;
    $("#heroPlatformCount").textContent = String(enabled.length);
    $("#heroPublishedCount").textContent = `${published} / ${enabled.length}`;
    $("#platformSelectionHint").textContent = `已启用 ${enabled.length} 个平台`;
    $("#heroCheckStatus").textContent = !state.preflight.checkedAt
      ? "待检查"
      : state.preflight.errors
        ? `${state.preflight.errors} 个错误`
        : state.preflight.warnings
          ? `通过 · ${state.preflight.warnings} 提醒`
          : "全部通过";
  }

  function bindStaticFields() {
    $$('[data-state]').forEach((element) => {
      const value = getPath(state, element.dataset.state);
      if (value != null) element.value = value;
      element.addEventListener("input", () => {
        setPath(state, element.dataset.state, element.value);
        state.preflight.checkedAt = "";
        saveState();
        updateHero();
      });
    });
  }

  function renderPlatformToggles() {
    $("#platformToggles").innerHTML = Object.entries(Rules.PLATFORMS).map(([key, platform]) => `
      <label class="platform-toggle" style="--platform-accent:${platform.accent}">
        <input type="checkbox" data-platform-toggle="${key}" ${state.enabled[key] ? "checked" : ""} />
        <span>${escapeHtml(platform.label)}</span>
      </label>`).join("");
    $$('[data-platform-toggle]').forEach((input) => input.addEventListener("change", () => {
      state.enabled[input.dataset.platformToggle] = input.checked;
      state.preflight.checkedAt = "";
      renderPlatformForms();
      renderPreviews();
      renderExecution();
      populateSnapshotPlatforms();
      updateHero();
      saveState();
    }));
  }

  function fieldControl(platformKey, rule) {
    const value = state.platforms[platformKey]?.[rule.key] || "";
    const attrs = `data-platform-field="${platformKey}" data-field-key="${rule.key}"`;
    if (rule.type === "textarea") {
      return `<textarea ${attrs} placeholder="${escapeHtml(rule.placeholder || "")}">${escapeHtml(value)}</textarea>`;
    }
    if (rule.type === "select") {
      return `<select ${attrs}>${rule.options.map((option) => `<option ${value === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
    }
    return `<input ${attrs} value="${escapeHtml(value)}" placeholder="${escapeHtml(rule.placeholder || (rule.type === "tags" ? "逗号或换行分隔" : ""))}" />`;
  }

  function fieldMeta(value, rule) {
    const text = Rules.normalizeText(value);
    if (rule.type === "tags") {
      const count = Rules.tagItems(text).length;
      const limit = rule.hardItems || rule.safeItems;
      return `<span>${count} 项</span><span>${limit ? `${rule.hardItems ? "上限" : "建议"} ${limit} 项` : "逗号或换行分隔"}</span>`;
    }
    const count = [...text].length;
    const limit = rule.hardMax || rule.safeMax;
    const over = limit && count > limit;
    return `<span class="${over ? "over" : ""}">${count} 字符</span><span>${limit ? `${rule.hardMax ? "硬上限" : "本地保守线"} ${limit}` : ""}</span>`;
  }

  function renderPlatformForms() {
    const container = $("#platformForms");
    container.innerHTML = enabledKeys().map((key) => {
      const platform = Rules.PLATFORMS[key];
      const fields = platform.fields.map((rule) => `
        <label class="field ${rule.type === "textarea" ? "span-2" : ""}">
          <span>${escapeHtml(rule.label)}${rule.required ? " <b>*</b>" : ""}</span>
          ${fieldControl(key, rule)}
          <small class="field-meta" data-field-meta="${key}.${rule.key}">${fieldMeta(state.platforms[key]?.[rule.key], rule)}</small>
        </label>`).join("");
      return `<section class="panel platform-form" style="--platform-accent:${platform.accent}">
        <div class="panel-title">
          <div class="platform-heading"><span class="platform-code">${platform.code}</span><h3>${escapeHtml(platform.label)}</h3></div>
          <button class="text-button" type="button" data-copy-platform="${key}">复制整包</button>
        </div>
        <div class="form-grid columns-2">${fields}</div>
      </section>`;
    }).join("");

    $$('[data-platform-field]', container).forEach((element) => {
      const handler = () => {
        const key = element.dataset.platformField;
        const fieldKey = element.dataset.fieldKey;
        state.platforms[key][fieldKey] = element.value;
        const rule = Rules.PLATFORMS[key].fields.find((item) => item.key === fieldKey);
        const meta = $(`[data-field-meta="${key}.${fieldKey}"]`, container);
        if (meta) meta.innerHTML = fieldMeta(element.value, rule);
        state.preflight.checkedAt = "";
        updateHero();
        saveState();
      };
      element.addEventListener("input", handler);
      element.addEventListener("change", handler);
    });
    $$('[data-copy-platform]', container).forEach((button) => button.addEventListener("click", () => copyText(platformPackageMarkdown(button.dataset.copyPlatform), `${Rules.PLATFORMS[button.dataset.copyPlatform].label}发布包已复制`)));
  }

  function formatBytes(size) {
    if (!Number.isFinite(size)) return "";
    const units = ["B", "KB", "MB", "GB"];
    let value = size;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index += 1; }
    return `${value.toFixed(index > 1 ? 2 : 0)} ${units[index]}`;
  }

  function setAsset(kind, file) {
    if (!file) return;
    const expectedVideo = kind === "video";
    if (expectedVideo && file.type && !file.type.startsWith("video/") && !/\.(mkv|mp4|mov|webm)$/i.test(file.name)) {
      toast("这不像视频文件，请重新选择");
      return;
    }
    if (!expectedVideo && file.type && !file.type.startsWith("image/")) {
      toast("这不像图片文件，请重新选择");
      return;
    }
    runtimeAssets[kind] = file;
    state.common[kind] = { name: file.name, size: file.size, type: file.type || "unknown", lastModified: file.lastModified };
    state.preflight.checkedAt = "";
    renderAssetMeta();
    updateHero();
    saveState();
  }

  function renderAssetMeta() {
    const video = state.common.video;
    const cover = state.common.cover;
    $("#videoMeta").textContent = video
      ? `${video.name}${video.size ? ` · ${formatBytes(video.size)}` : ""}${state.common.videoPath ? " · 本机助手可用" : runtimeAssets.video ? " · 本次会话已选中" : " · 刷新后需重新选择"}`
      : "支持拖放；文件只在本机检查，不会上传到 GUCC";
    $("#coverMeta").textContent = cover
      ? `${cover.name}${cover.size ? ` · ${formatBytes(cover.size)}` : ""}${state.common.coverPath ? " · 本机助手可用" : runtimeAssets.cover ? " · 本次会话已选中" : " · 刷新后需重新选择"}`
      : "可选；各平台封面仍在发布页确认裁切";
  }

  function bindAssetInputs() {
    $("#videoFile").addEventListener("change", (event) => setAsset("video", event.target.files[0]));
    $("#coverFile").addEventListener("change", (event) => setAsset("cover", event.target.files[0]));
    const drop = $("#videoDrop");
    ["dragenter", "dragover"].forEach((name) => drop.addEventListener(name, (event) => { event.preventDefault(); drop.classList.add("dragging"); }));
    ["dragleave", "drop"].forEach((name) => drop.addEventListener(name, (event) => { event.preventDefault(); drop.classList.remove("dragging"); }));
    drop.addEventListener("drop", (event) => setAsset("video", event.dataTransfer.files[0]));
  }

  function importProjectData(data) {
    if (data?.schemaVersion === SCHEMA_VERSION) {
      state = mergeState(data);
      runtimeAssets.video = null;
      runtimeAssets.cover = null;
      hydrateAll();
      saveState("控制台项目已导入");
      toast("已导入控制台项目");
      return;
    }
    if (!data || typeof data !== "object" || (!data.__workspaceName && !Object.prototype.hasOwnProperty.call(data, "publishCN"))) {
      throw new Error("不是可识别的 GUCC WorkSpace 或发布控制台 JSON");
    }
    state.project.title = data.projectTitle || state.project.title;
    state.project.shortName = data.projectShortName || state.project.shortName;
    state.project.game = data.game || state.project.game;
    state.project.note = data.projectMemo || state.project.note;
    state.source.workspaceVersion = data.__workspaceVersion || data.__templateVersion || "unknown";
    state.source.publishPackage = data.publishCN || "";
    const parsed = Rules.parseWorkspacePackage(data.publishCN || "");
    let importedFields = 0;
    Object.entries(parsed).forEach(([platformKey, values]) => {
      Object.entries(values).forEach(([fieldKey, value]) => {
        if (value) { state.platforms[platformKey][fieldKey] = value; importedFields += 1; }
      });
    });
    state.preflight.checkedAt = "";
    hydrateAll();
    saveState("WorkSpace 发布包已导入");
    toast(`已导入 WorkSpace：识别 ${importedFields} 个平台字段`);
  }

  function bindImportExport() {
    $("#importWorkspaceButton").addEventListener("click", () => $("#workspaceFile").click());
    $("#workspaceFile").addEventListener("change", async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      try { importProjectData(JSON.parse(await file.text())); }
      catch (error) { toast(`导入失败：${error.message}`); }
      event.target.value = "";
    });
    $("#exportProjectButton").addEventListener("click", () => {
      download(`${safeName(state.project.shortName || state.project.title || "publish-console")}.publish.json`, JSON.stringify(state, null, 2), "application/json;charset=utf-8");
      toast("控制台项目 JSON 已导出");
    });
  }

  function runPreflight() {
    const groups = [];
    const commonErrors = [];
    const commonWarnings = [];
    if (!Rules.normalizeText(state.project.title)) commonErrors.push("项目标题未填写");
    if (!state.common.video && !Rules.normalizeText(state.common.videoPath)) commonWarnings.push("尚未登记完整成片；可以继续准备文案，但执行投稿前需要选择视频文件");
    else if (!/\.(mp4|mov|webm|mkv)$/i.test(state.common.video.name || "")) commonWarnings.push("视频扩展名不是常见的 mp4 / mov / webm / mkv，请在各发布页确认兼容性");
    if (!state.common.cover) commonWarnings.push("尚未登记母版封面；请确认每个平台是否需要单独封面和裁切");
    if (!state.common.publishAt) commonWarnings.push("尚未填写计划发布时间");
    if (!enabledKeys().length) commonErrors.push("至少启用一个平台");
    groups.push({ key: "common", label: "公共项目与素材", errors: commonErrors, warnings: commonWarnings });

    enabledKeys().forEach((key) => {
      const platform = Rules.PLATFORMS[key];
      const errors = [];
      const warnings = [];
      platform.fields.forEach((rule) => {
        const value = state.platforms[key]?.[rule.key] || "";
        const result = Rules.validateField(value, rule);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      });
      const copyTextValue = platform.fields.map((rule) => state.platforms[key]?.[rule.key] || "").join("\n");
      warnings.push(...Rules.scanCopyRisk(copyTextValue));
      groups.push({ key, label: platform.label, errors, warnings });
    });

    const errors = groups.reduce((sum, group) => sum + group.errors.length, 0);
    const warnings = groups.reduce((sum, group) => sum + group.warnings.length, 0);
    state.preflight = { checkedAt: new Date().toISOString(), errors, warnings };
    saveState("预检结果已保存");
    renderChecks(groups);
    renderPreviews();
    updateHero();
    return { groups, errors, warnings };
  }

  function renderChecks(groups) {
    const result = groups || runPreflight().groups;
    const errors = result.reduce((sum, group) => sum + group.errors.length, 0);
    const warnings = result.reduce((sum, group) => sum + group.warnings.length, 0);
    $("#checkScore").textContent = errors ? `${errors} 个错误` : "可以执行";
    $("#checkScore").style.color = errors ? "var(--danger)" : "var(--mint)";
    $("#checkScoreNote").textContent = warnings ? `另有 ${warnings} 个提醒需要人工确认` : "没有发现本地规则问题";
    $("#checkResults").classList.remove("empty-state");
    $("#checkResults").innerHTML = result.map((group) => {
      const items = [
        ...group.errors.map((text) => `<div class="check-item error"><i>×</i><span>${escapeHtml(text)}</span></div>`),
        ...group.warnings.map((text) => `<div class="check-item warning"><i>!</i><span>${escapeHtml(text)}</span></div>`)
      ];
      if (!items.length) items.push('<div class="check-item ok"><i>✓</i><span>本地规则检查通过</span></div>');
      return `<section class="check-group"><h4>${escapeHtml(group.label)}</h4>${items.join("")}</section>`;
    }).join("");
  }

  function renderPreviews() {
    $("#platformPreviews").innerHTML = enabledKeys().map((key) => {
      const platform = Rules.PLATFORMS[key];
      const fields = platform.fields.filter((rule) => Rules.normalizeText(state.platforms[key]?.[rule.key])).map((rule) => `
        <div class="preview-field"><span>${escapeHtml(rule.label)}</span><pre>${escapeHtml(state.platforms[key][rule.key])}</pre></div>`).join("");
      return `<article class="preview-card" style="--platform-accent:${platform.accent}"><h4>${escapeHtml(platform.label)}</h4>${fields || '<div class="empty-state">尚未填写</div>'}</article>`;
    }).join("");
  }

  function platformPackageMarkdown(key) {
    const platform = Rules.PLATFORMS[key];
    const lines = [`# ${platform.label}`, ""];
    platform.fields.forEach((rule) => {
      const value = Rules.normalizeText(state.platforms[key]?.[rule.key]);
      if (value) lines.push(`## ${rule.label}`, value, "");
    });
    if (state.common.publishAt) lines.push("## 计划发布时间", `${state.common.publishAt} (${state.common.timezone || "local"})`, "");
    return lines.join("\n").trim();
  }

  function fullPackageMarkdown() {
    const lines = [
      `# ${state.project.title || "未命名视频"}｜发布执行包`, "",
      `- 项目简称：${state.project.shortName || ""}`,
      `- 游戏 / 主题：${state.project.game || ""}`,
      `- 完整成片：${state.common.video?.name || "未登记"}`,
      `- 母版封面：${state.common.cover?.name || "未登记"}`,
      `- 计划发布：${state.common.publishAt || "未填写"} ${state.common.timezone || ""}`,
      "",
      ...enabledKeys().flatMap((key) => [platformPackageMarkdown(key), "", "---", ""]),
      "# 执行记录", ""
    ];
    enabledKeys().forEach((key) => {
      const execution = state.execution[key];
      lines.push(`- ${Rules.PLATFORMS[key].label}：${execution.status}｜${execution.postUrl || "未登记链接"}｜${execution.postId || "未登记 ID"}`);
    });
    return lines.join("\n").trim() + "\n";
  }

  async function copyText(text, successMessage = "已复制") {
    try {
      await navigator.clipboard.writeText(text);
      toast(successMessage);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      toast(successMessage);
    }
  }

  function openUrl(url) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) toast("浏览器拦截了新标签页，请允许此站点打开弹窗");
  }

  function renderExecution() {
    $("#executionList").innerHTML = enabledKeys().map((key) => {
      const platform = Rules.PLATFORMS[key];
      const execution = state.execution[key] || {};
      const fieldButtons = platform.fields
        .filter((rule) => Rules.normalizeText(state.platforms[key]?.[rule.key]))
        .map((rule) => `<button class="button subtle" type="button" data-copy-field-platform="${key}" data-copy-field-key="${rule.key}">复制${escapeHtml(rule.label)}</button>`)
        .join("");
      return `<article class="execution-card" style="--platform-accent:${platform.accent}">
        <div class="execution-main">
          <h3>${platform.label}</h3>
          <p>建议顺序：复制整包 → 打开官方页 → 上传视频/封面 → 核对字段 → 先存草稿或私密。</p>
          <div class="execution-buttons">
            <button class="button primary" type="button" data-exec-copy="${key}">复制整包</button>
            <button class="button subtle" type="button" data-exec-open="${key}">打开发布页 ↗</button>
            <button class="button subtle" type="button" data-exec-analytics="${key}">数据页 ↗</button>
          </div>
          <div class="execution-buttons field-copy-buttons">${fieldButtons}</div>
        </div>
        <div class="execution-meta">
          <label>状态<select data-exec-field="status" data-exec-platform="${key}">${EXECUTION_STATUSES.map((status) => `<option ${execution.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
          <label>作品链接<input data-exec-field="postUrl" data-exec-platform="${key}" value="${escapeHtml(execution.postUrl || "")}" placeholder="https://..." /></label>
          <label>平台作品 ID<input data-exec-field="postId" data-exec-platform="${key}" value="${escapeHtml(execution.postId || "")}" placeholder="可选，用于未来 API 取数" /></label>
          <label>执行备注<input data-exec-field="note" data-exec-platform="${key}" value="${escapeHtml(execution.note || "")}" placeholder="审核、封面版本、失败原因等" /></label>
        </div>
      </article>`;
    }).join("");
    $$('[data-exec-copy]').forEach((button) => button.addEventListener("click", () => copyText(platformPackageMarkdown(button.dataset.execCopy), `${Rules.PLATFORMS[button.dataset.execCopy].label}发布包已复制`)));
    $$('[data-copy-field-platform]').forEach((button) => button.addEventListener("click", () => {
      const platformKey = button.dataset.copyFieldPlatform;
      const fieldKey = button.dataset.copyFieldKey;
      const rule = Rules.PLATFORMS[platformKey].fields.find((item) => item.key === fieldKey);
      copyText(state.platforms[platformKey][fieldKey], `${Rules.PLATFORMS[platformKey].label} · ${rule.label}已复制`);
    }));
    $$('[data-exec-open]').forEach((button) => button.addEventListener("click", () => openUrl(Rules.PLATFORMS[button.dataset.execOpen].uploadUrl)));
    $$('[data-exec-analytics]').forEach((button) => button.addEventListener("click", () => openUrl(Rules.PLATFORMS[button.dataset.execAnalytics].analyticsUrl)));
    $$('[data-exec-field]').forEach((element) => {
      const handler = () => {
        state.execution[element.dataset.execPlatform][element.dataset.execField] = element.value;
        updateHero();
        saveState();
      };
      element.addEventListener("input", handler);
      element.addEventListener("change", handler);
    });
  }

  function localDateTimeValue(date = new Date()) {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function populateSnapshotPlatforms() {
    const select = $("#snapshotPlatform");
    const previous = select.value;
    select.innerHTML = enabledKeys().map((key) => `<option value="${key}">${Rules.PLATFORMS[key].label}</option>`).join("");
    if (enabledKeys().includes(previous)) select.value = previous;
  }

  function numberOrNull(id) {
    const value = $(id).value;
    return value === "" ? null : Number(value);
  }

  function interactionRate(snapshot) {
    if (!snapshot.views) return null;
    const interactions = [snapshot.likes, snapshot.comments, snapshot.shares, snapshot.saves].reduce((sum, value) => sum + (Number(value) || 0), 0);
    return interactions / snapshot.views * 100;
  }

  function formatMetric(value, suffix = "") {
    return value == null || value === "" || Number.isNaN(Number(value)) ? "—" : `${Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}${suffix}`;
  }

  function renderReview() {
    $("#snapshotCount").textContent = `${state.snapshots.length} 条快照`;
    $("#snapshotRows").innerHTML = [...state.snapshots].sort((a, b) => String(b.at).localeCompare(String(a.at))).map((snapshot) => {
      const platform = Rules.PLATFORMS[snapshot.platform];
      const rate = interactionRate(snapshot);
      return `<tr>
        <td><strong>${escapeHtml(platform?.label || snapshot.platform)}</strong><br>${escapeHtml(snapshot.window || "")}</td>
        <td>${escapeHtml(String(snapshot.at || "").replace("T", " "))}</td>
        <td>${formatMetric(snapshot.impressions)}</td><td>${formatMetric(snapshot.views)}</td>
        <td>${formatMetric(rate, "%")}</td><td>${formatMetric(snapshot.completion, "%")}</td><td>${formatMetric(snapshot.followers)}</td>
        <td><button class="text-button danger" type="button" data-remove-snapshot="${snapshot.id}">删除</button></td>
      </tr>`;
    }).join("") || '<tr><td colspan="8">暂无快照</td></tr>';
    $$('[data-remove-snapshot]').forEach((button) => button.addEventListener("click", () => {
      state.snapshots = state.snapshots.filter((item) => item.id !== button.dataset.removeSnapshot);
      renderReview();
      saveState();
    }));

    const latest = {};
    [...state.snapshots].sort((a, b) => String(a.at).localeCompare(String(b.at))).forEach((snapshot) => { latest[snapshot.platform] = snapshot; });
    const summaries = Object.values(latest).map((snapshot) => {
      const platform = Rules.PLATFORMS[snapshot.platform];
      return `<div class="summary-platform" style="--platform-accent:${platform?.accent || "var(--cyan)"}">
        <strong>${escapeHtml(platform?.label || snapshot.platform)} · ${escapeHtml(snapshot.window || "")}</strong>
        <span>播放 ${formatMetric(snapshot.views)} · 互动率 ${formatMetric(interactionRate(snapshot), "%")}</span>
        <span>完播 ${formatMetric(snapshot.completion, "%")} · 新增关注 ${formatMetric(snapshot.followers)}</span>
      </div>`;
    }).join("");
    const summary = $("#reviewSummary");
    if (summaries) {
      summary.classList.remove("empty-state");
      summary.innerHTML = `<div class="summary-grid">${summaries}</div>`;
    } else {
      summary.classList.add("empty-state");
      summary.textContent = "保存第一条快照后，这里会出现汇总。";
    }
  }

  function snapshotMarkdown(snapshot) {
    return [
      `### ${Rules.PLATFORMS[snapshot.platform]?.label || snapshot.platform}｜${snapshot.window}｜${String(snapshot.at || "").replace("T", " ")}`,
      `- 曝光量：${formatMetric(snapshot.impressions)}`,
      `- 播放量：${formatMetric(snapshot.views)}`,
      `- 平均观看时长：${formatMetric(snapshot.avgWatch, " 秒")}`,
      `- 完播率：${formatMetric(snapshot.completion, "%")}`,
      `- 点赞 / 评论 / 分享 / 收藏：${formatMetric(snapshot.likes)} / ${formatMetric(snapshot.comments)} / ${formatMetric(snapshot.shares)} / ${formatMetric(snapshot.saves)}`,
      `- 互动率（本地计算）：${formatMetric(interactionRate(snapshot), "%")}`,
      `- 新增关注：${formatMetric(snapshot.followers)}`,
      `- 观察备注：${snapshot.note || "无"}`,
      ""
    ].join("\n");
  }

  function reviewMarkdown(includePrompt = false) {
    const lines = [
      `# ${state.project.title || "未命名视频"}｜发布复盘`, "",
      `- 项目简称：${state.project.shortName || ""}`,
      `- 游戏 / 主题：${state.project.game || ""}`,
      `- 计划发布时间：${state.common.publishAt || "未填写"} ${state.common.timezone || ""}`,
      "", "## 正式发布记录", ""
    ];
    enabledKeys().forEach((key) => {
      const execution = state.execution[key];
      lines.push(`- ${Rules.PLATFORMS[key].label}：${execution.status}｜${execution.postUrl || "未登记链接"}｜ID ${execution.postId || "未登记"}`);
    });
    lines.push("", "## 数据快照", "");
    if (state.snapshots.length) state.snapshots.forEach((snapshot) => lines.push(snapshotMarkdown(snapshot)));
    else lines.push("尚未录入数据。", "");
    if (includePrompt) {
      lines.push(
        "## 给 AI 的任务", "",
        "请基于以上真实数据做视频复盘。先列数据缺口，不得补造平台数据或平台口径。然后分别判断：点击/开头、观看留存、互动、关注转化中最可能的问题；与不同平台自身数据比较，不要把各平台播放量定义成完全相同。最后给出 3 个能在下一期验证的具体实验，每个实验写清改动位置、预期信号和判定标准。不要只写‘优化标题、提高质量、加强互动’。", ""
      );
    }
    return lines.join("\n").trim() + "\n";
  }

  function bindReview() {
    populateSnapshotPlatforms();
    $("#snapshotAt").value = localDateTimeValue();
    $("#snapshotForm").addEventListener("submit", (event) => {
      event.preventDefault();
      const snapshot = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        platform: $("#snapshotPlatform").value,
        at: $("#snapshotAt").value,
        window: $("#snapshotWindow").value,
        impressions: numberOrNull("#metricImpressions"), views: numberOrNull("#metricViews"),
        avgWatch: numberOrNull("#metricAvgWatch"), completion: numberOrNull("#metricCompletion"),
        likes: numberOrNull("#metricLikes"), comments: numberOrNull("#metricComments"),
        shares: numberOrNull("#metricShares"), saves: numberOrNull("#metricSaves"),
        followers: numberOrNull("#metricFollowers"), note: $("#snapshotNote").value.trim()
      };
      state.snapshots.push(snapshot);
      ["#metricImpressions", "#metricViews", "#metricAvgWatch", "#metricCompletion", "#metricLikes", "#metricComments", "#metricShares", "#metricSaves", "#metricFollowers", "#snapshotNote"].forEach((id) => { $(id).value = ""; });
      $("#snapshotAt").value = localDateTimeValue();
      renderReview();
      saveState("数据快照已保存");
      toast("数据快照已保存");
    });
    $("#openAnalyticsButton").addEventListener("click", () => {
      const key = $("#snapshotPlatform").value;
      if (key) openUrl(Rules.PLATFORMS[key].analyticsUrl);
    });
    $("#copyReviewPromptButton").addEventListener("click", () => copyText(reviewMarkdown(true), "AI 复盘 Prompt 已复制"));
    $("#downloadReviewButton").addEventListener("click", () => download(`${safeName(state.project.shortName || state.project.title || "video")}.review.md`, reviewMarkdown(false), "text/markdown;charset=utf-8"));
    $("#clearSnapshotsButton").addEventListener("click", () => {
      if (!state.snapshots.length) return;
      if (!window.confirm(`确定删除全部 ${state.snapshots.length} 条数据快照吗？此操作只影响当前浏览器草稿。`)) return;
      state.snapshots = [];
      renderReview();
      saveState();
      toast("数据快照已清空");
    });
  }

  function safeName(name) {
    return String(name || "file").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").slice(0, 80);
  }

  function download(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function showView(name) {
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${name}`));
    $$(".flow-step").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
    if (name === "preflight") renderPreviews();
    if (name === "execute") renderExecution();
    if (name === "review") renderReview();
    window.scrollTo({ top: 180, behavior: "smooth" });
  }

  function bindNavigation() {
    $$(".flow-step").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
    $$('[data-go]').forEach((button) => button.addEventListener("click", () => showView(button.dataset.go)));
    $("#goPreflightButton").addEventListener("click", () => { showView("preflight"); runPreflight(); });
    $("#runChecksButton").addEventListener("click", () => { const result = runPreflight(); toast(result.errors ? `发现 ${result.errors} 个硬错误` : "预检完成，可以生成执行队列"); });
    $("#goExecuteButton").addEventListener("click", () => {
      const result = runPreflight();
      if (result.errors) { toast(`还有 ${result.errors} 个硬错误，请先修复`); return; }
      showView("execute");
    });
    $("#downloadPackageButton").addEventListener("click", () => download(`${safeName(state.project.shortName || state.project.title || "video")}.publish.md`, fullPackageMarkdown(), "text/markdown;charset=utf-8"));
    $("#openPublishingBatchHelp").addEventListener("click", () => {
      window.alert("Windows 下可在仓库中运行 automation\\创作中心\\01-publishing.bat，一次打开六个平台发布页。\n\n控制台也提供每个平台的独立打开按钮；浏览器可能拦截一次打开多个标签页，因此没有在网页里强行批量弹窗。");
    });
  }

  function bindAssistant() {
    $("#checkAssistantButton").addEventListener("click", () => checkAssistant(false));
    $("#pickVideoPathButton").addEventListener("click", () => pickAssistantFile("video"));
    $("#pickCoverPathButton").addEventListener("click", () => pickAssistantFile("image"));
    $("#openLoginButton").addEventListener("click", openLoginSetup);
    $("#oneClickPrepareButton").addEventListener("click", startOneClickPrepare);
    renderAssistantState(false);
    checkAssistant(true);
  }

  function hydrateAll() {
    $$('[data-state]').forEach((element) => { element.value = getPath(state, element.dataset.state) || ""; });
    renderAssetMeta();
    renderPlatformToggles();
    renderPlatformForms();
    renderPreviews();
    renderExecution();
    populateSnapshotPlatforms();
    renderReview();
    updateHero();
  }

  bindStaticFields();
  bindAssetInputs();
  bindImportExport();
  bindReview();
  bindNavigation();
  bindAssistant();
  hydrateAll();
})();
