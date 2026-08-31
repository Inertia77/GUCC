(function () {
  "use strict";

  const E = window.GuccProductionEngine;
  const T = window.GuccTimelineContract;
  const STORAGE_KEY = "gucc_ai_video_production_v1";
  const TIMELINE_EDIT_STATES = new Set(["AUDIO_LOCKED", "TIMELINE_GENERATION"]);
  if (!E || !T) return;

  let timelineActive = false;
  let validation = null;
  let srtDraft = null;

  const h = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

  function loadStore() {
    try {
      const store = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return store && Array.isArray(store.projects) ? store : null;
    } catch { return null; }
  }

  function selectedProject() {
    const store = loadStore();
    if (!store) return null;
    const raw = store.projects.find((item) => item.projectId === store.selectedProjectId) || null;
    return raw ? E.normalizeProject(raw, { source: "timeline_browser" }) : null;
  }

  function persistProject(project) {
    E.assertWorkflowInvariants(project, "Timeline persist");
    const store = loadStore();
    if (!store) throw new Error("Production 本地状态不可读");
    const index = store.projects.findIndex((item) => item.projectId === project.projectId);
    if (index < 0) throw new Error(`当前项目 ${project.projectId} 不在 Production Store 中`);
    store.projects[index] = project;
    store.schemaVersion = E.SCHEMA_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }

  function notify(message, error = false) {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.className = `toast show${error ? " error" : ""}`;
    window.setTimeout(() => { toast.className = "toast"; }, 4200);
  }

  function canEditTimeline(project) {
    return Boolean(project && project.locks?.audioLock && E.fileReady(project, "AUDIO_MASTER") && TIMELINE_EDIT_STATES.has(project.currentState));
  }

  function existingSrt(project) {
    return String(project?.files?.SUBTITLE_MASTER?.content || "");
  }

  function setTextArtifact(project, key, content) {
    const definition = E.FILE_DEFINITIONS[key];
    if (!definition) throw new Error(`未知 Timeline Artifact：${key}`);
    const current = project.files?.[key] || {};
    project.files ||= {};
    project.files[key] = {
      ...current,
      key,
      filename: definition.filename,
      relativePath: definition.path,
      kind: definition.kind,
      status: "Ready",
      content: String(content),
      size: new TextEncoder().encode(String(content)).byteLength,
      updatedAt: new Date().toISOString(),
      notes: current.notes || "",
    };
  }

  function validationMarkup(result) {
    if (!result) return `<p class="muted">导入或粘贴 SRT 后先校验。</p>`;
    const comparison = result.comparison;
    const status = result.errors.length ? "ERROR" : result.warnings.length ? "WARNING" : "PASS";
    return `<div class="grid-3">
      <div class="metric"><span>SRT Validation</span><strong>${h(status)}</strong></div>
      <div class="metric"><span>Cues</span><strong>${h(result.stats?.cueCount || 0)}</strong></div>
      <div class="metric"><span>Timeline End</span><strong>${h(T.formatTimelineTime(result.stats?.durationMs || 0))}</strong></div>
    </div>
    ${result.errors.length ? `<div class="notice"><strong>错误</strong><br>${result.errors.map((item) => h(item)).join("<br>")}</div>` : ""}
    ${result.warnings.length ? `<div class="notice"><strong>警告</strong><br>${result.warnings.map((item) => h(item)).join("<br>")}</div>` : ""}
    ${comparison ? `<div class="notice"><strong>VOICE_MASTER 对比：${h(comparison.status)}</strong><br>${comparison.status === "MATCH" ? "标准化后文本一致。" : `首个差异位置 ${h(comparison.firstDifferenceIndex)}；实际口播与脚本不一致时，以真实音频/SRT 为准。`}</div>` : ""}`;
  }

  function cuePreview(result) {
    const cues = result?.cues || [];
    if (!cues.length) return `<p class="muted">暂无可预览字幕。</p>`;
    const rows = cues.slice(0, 24).map((cue) => `<tr><td>${h(cue.index)}</td><td>${h(T.formatTimelineTime(cue.startMs))}<br>${h(T.formatTimelineTime(cue.endMs))}</td><td>${h(cue.text).replace(/\n/g, "<br>")}</td></tr>`).join("");
    const tail = cues.length > 24 ? `<p class="muted">仅预览前 24 条；完整内容以 SUBTITLE_MASTER.srt 为准。</p>` : "";
    return `<div class="table-wrap"><table class="data-table"><thead><tr><th>#</th><th>时间</th><th>实际字幕</th></tr></thead><tbody>${rows}</tbody></table></div>${tail}`;
  }

  function renderTimeline() {
    if (!timelineActive) return;
    const project = selectedProject();
    const content = document.querySelector("#tabContent");
    if (!content || !project) return;
    const editable = canEditTimeline(project);
    const ready = E.timelineBundleReady(project);
    const srt = srtDraft == null ? existingSrt(project) : srtDraft;
    if (srtDraft == null) srtDraft = srt;
    if (!validation && srt.trim()) {
      const inspected = T.inspectSrt(srt);
      validation = { ...inspected, comparison: inspected.errors.length ? null : T.compareTranscript(project.voiceMaster || project.files?.VOICE_MASTER?.content || "", inspected.cues.map((cue) => cue.text).join("\n")) };
    }
    content.innerHTML = `<section class="panel">
      <div class="section-title"><div><p class="eyebrow">AUDIO → SUBTITLE → TIMELINE</p><h3>字幕与精确时间轴</h3></div><p>时间码只认真实 SUBTITLE_MASTER；VOICE_MASTER 仅用于文字差异检查。</p></div>
      <div class="grid-3">
        <div class="metric"><span>AUDIO_MASTER</span><strong>${h(project.files?.AUDIO_MASTER?.status || "Missing")}</strong></div>
        <div class="metric"><span>Audio Lock</span><strong>${project.locks?.audioLock ? "LOCKED" : "OPEN"}</strong></div>
        <div class="metric"><span>Timeline Bundle</span><strong>${ready ? "READY" : "INCOMPLETE"}</strong></div>
      </div>
      <div class="notice">GUCC 本阶段不内置 Whisper / ASR，也不启动 AI Runner。先把 AUDIO_MASTER + VOICE_MASTER 交给 Codex/ChatGPT 生成真实 SRT，再由这里做确定性校验与派生。</div>
      ${editable ? "" : `<div class="notice"><strong>当前不可改写 Timeline。</strong><br>${project.currentState === "TIMELINE_LOCKED" || E.PRODUCTION_FLOW.indexOf(project.currentState) > E.PRODUCTION_FLOW.indexOf("TIMELINE_LOCKED") ? "如需修改字幕，请先把项目回退到“字幕对齐 / TIMELINE_GENERATION”。" : "必须先完成真实 AUDIO_MASTER 并确认 Audio Lock，进入 AUDIO_LOCKED 后才能生成精确时间轴。"}</div>`}
      <div class="inline-actions">
        <button class="button ghost" type="button" data-timeline-action="copy-handoff">复制 Codex 字幕 Prompt</button>
        <button class="button ghost" type="button" data-timeline-action="import-srt">导入 SRT</button>
        <button class="button ghost" type="button" data-timeline-action="validate-srt">校验</button>
        <button class="button primary" type="button" data-timeline-action="generate-bundle" ${editable ? "" : "disabled"}>生成 / 刷新时间线包</button>
      </div>
      <label class="field">SUBTITLE_MASTER.srt<textarea id="timelineSrtInput" class="editor" spellcheck="false" placeholder="1\n00:00:00,000 --> 00:00:02,000\n实际说出口的字幕……">${h(srt)}</textarea></label>
    </section>
    <section class="panel"><div class="toolbar"><div><p class="eyebrow">VALIDATION</p><h3>时间码检查</h3></div><span class="muted">重叠只警告；倒序、空字幕、结束≤开始会阻止生成。</span></div>${validationMarkup(validation)}</section>
    <section class="panel"><div class="toolbar"><div><p class="eyebrow">PREVIEW</p><h3>字幕预览</h3></div><span class="muted">Timeline 不从脚本猜时间。</span></div>${cuePreview(validation)}</section>
    <section class="panel"><div class="section-title"><div><p class="eyebrow">DERIVED ARTIFACTS</p><h3>确定性输出</h3></div><p>四件套写入 Project JSON；随后“创建 / 同步本地 Workspace”会投影到 04_SUBTITLES。</p></div>
      <div class="file-list">${E.TIMELINE_BUNDLE_FILES.map((key) => `<div class="file-row"><div><strong>${h(E.FILE_DEFINITIONS[key]?.label || key)}</strong><br><code>${h(E.FILE_DEFINITIONS[key]?.path || key)}</code></div><div><span class="status-pill ${String(project.files?.[key]?.status || "Missing").toLowerCase()}">${h(project.files?.[key]?.status || "Missing")}</span></div><div></div></div>`).join("")}</div>
    </section>`;
  }

  function ensureTimelineTab() {
    const tabs = document.querySelector("#tabs");
    if (!tabs) return;
    let button = tabs.querySelector("[data-timeline-tab]");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "tab";
      button.dataset.timelineTab = "true";
      button.textContent = "字幕 / 时间线";
      const audioTab = tabs.querySelector('[data-tab="audio"]');
      if (audioTab?.nextSibling) tabs.insertBefore(button, audioTab.nextSibling);
      else tabs.appendChild(button);
    }
    if (timelineActive) {
      tabs.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === button));
      renderTimeline();
    }
  }

  function inputSrt() {
    return String(document.querySelector("#timelineSrtInput")?.value || "");
  }

  function validateCurrentInput() {
    const project = selectedProject();
    if (!project) throw new Error("当前没有 Creator Project");
    srtDraft = inputSrt();
    const inspected = T.inspectSrt(srtDraft);
    const comparison = inspected.errors.length ? null : T.compareTranscript(project.voiceMaster || project.files?.VOICE_MASTER?.content || "", inspected.cues.map((cue) => cue.text).join("\n"));
    validation = { ...inspected, comparison };
    renderTimeline();
    return validation;
  }

  async function importSrt() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".srt,application/x-subrip,text/plain";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const area = document.querySelector("#timelineSrtInput");
      const text = await file.text();
      if (area) area.value = text;
      srtDraft = text;
      validateCurrentInput();
      notify(`${file.name} 已载入，尚未写入 Project；确认校验结果后生成时间线包`);
    };
    input.click();
  }

  function generateBundle() {
    const project = selectedProject();
    if (!project) throw new Error("当前没有 Creator Project");
    if (!canEditTimeline(project)) throw new Error("Timeline 只能在 AUDIO_LOCKED / TIMELINE_GENERATION 且 Audio Lock 有效时生成");
    const result = T.buildTimelineArtifacts({
      projectId: project.projectId,
      projectName: project.name,
      voiceMaster: project.voiceMaster || project.files?.VOICE_MASTER?.content || "",
      srtText: (srtDraft = inputSrt()),
    });
    for (const key of E.TIMELINE_BUNDLE_FILES) setTextArtifact(project, key, result.artifacts[key]);
    project.history ||= [];
    project.history.push({
      at: new Date().toISOString(),
      action: "TIMELINE_BUNDLE_GENERATED",
      state: project.currentState,
      cueCount: result.validation.stats.cueCount,
      scriptComparison: result.validation.comparison.status,
      timingSource: T.TIMING_SOURCE,
    });
    if (project.currentState === "AUDIO_LOCKED") E.transition(project, "TIMELINE_GENERATION", { note: "Validated SUBTITLE_MASTER accepted" });
    if (project.currentState === "TIMELINE_GENERATION") E.transition(project, "TIMELINE_LOCKED", { note: "Complete deterministic timeline bundle generated" });
    E.refreshGeneratedFiles(project);
    persistProject(project);
    notify(`时间线包已生成：${result.validation.stats.cueCount} 条字幕；VOICE_MASTER 对比 ${result.validation.comparison.status}`);
    window.setTimeout(() => window.location.reload(), 550);
  }

  async function copyHandoff() {
    const project = selectedProject();
    if (!project) throw new Error("当前没有 Creator Project");
    await navigator.clipboard.writeText(T.timelineHandoffPrompt(project));
    notify("Codex 字幕 Prompt 已复制；提交时同时附上 AUDIO_MASTER 与 VOICE_MASTER");
  }

  document.addEventListener("click", (event) => {
    const timelineTab = event.target.closest?.("[data-timeline-tab]");
    if (timelineTab) {
      event.preventDefault();
      event.stopPropagation();
      timelineActive = true;
      validation = null;
      srtDraft = null;
      ensureTimelineTab();
      return;
    }
    if (event.target.closest?.("[data-tab]")) timelineActive = false;

    const action = event.target.closest?.("[data-timeline-action]")?.dataset.timelineAction;
    if (!action) return;
    event.preventDefault();
    Promise.resolve().then(async () => {
      if (action === "copy-handoff") await copyHandoff();
      if (action === "import-srt") await importSrt();
      if (action === "validate-srt") { validateCurrentInput(); notify(validation.errors.length ? "SRT 校验未通过" : "SRT 校验通过", Boolean(validation.errors.length)); }
      if (action === "generate-bundle") generateBundle();
    }).catch((error) => notify(error.message, true));
  });

  const observer = new MutationObserver(() => ensureTimelineTab());
  const tabs = document.querySelector("#tabs");
  if (tabs) observer.observe(tabs, { childList: true });
  ensureTimelineTab();
})();
