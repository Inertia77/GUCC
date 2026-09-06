(function () {
  "use strict";

  const E = window.GuccProductionEngine;
  const STORAGE_KEY = "gucc_ai_video_production_v1";
  const TABS = [
    ["control", "控制台"], ["files", "文件"], ["assets", "素材"], ["script", "脚本 / TTS"],
    ["audio", "音频"], ["storyboard", "Storyboard"], ["review", "Review"], ["prompt", "Prompt"]
  ];
  const LOCKS = [
    ["contentLock", "Content Lock", "结论、结构与范围不再漂移"],
    ["scriptLock", "Script Lock", "VOICE_MASTER 已确认"],
    ["audioLock", "Audio Lock", "真实 AUDIO_MASTER 成为绝对时间轴"],
    ["pictureLock", "Picture Lock", "VIDEO_V1 画面不再修改"]
  ];
  const state = loadStore();
  let activeTab = "control";
  let toastTimer;

  const $ = (selector, root = document) => root.querySelector(selector);
  const h = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const currentProject = () => state.projects.find((project) => project.projectId === state.selectedProjectId) || null;
  const fileLabel = (key) => E.FILE_DEFINITIONS[key]?.filename || key;

  function syncProjectQuery(projectId) {
    const url = new URL(location.href);
    if (projectId) url.searchParams.set("project", projectId);
    else url.searchParams.delete("project");
    if (url.href !== location.href) history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function loadStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (raw && Array.isArray(raw.projects)) {
        const requested = new URLSearchParams(location.search).get("project");
        const selectedProjectId = [requested, raw.selectedProjectId, raw.projects[0]?.projectId]
          .find((id) => raw.projects.some((project) => project.projectId === id)) || "";
        return {
          schemaVersion: E.SCHEMA_VERSION,
          projects: raw.projects.map(E.normalizeProject),
          musicLibrary: Array.isArray(raw.musicLibrary) ? raw.musicLibrary : [],
          selectedProjectId
        };
      }
    } catch (error) { console.warn("Production System store reset", error); }
    return { schemaVersion: E.SCHEMA_VERSION, projects: [], musicLibrary: [], selectedProjectId: "" };
  }

  function save() {
    const el = $("#saveState");
    if (el) el.textContent = "保存中…";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (el) requestAnimationFrame(() => { el.textContent = "已自动保存"; });
  }

  function notify(message, error = false) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.className = `toast show${error ? " error" : ""}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = "toast"; }, 3200);
  }

  function download(name, content, type = "application/json") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function render() {
    renderProjectList();
    const project = currentProject();
    $("#projectTitle").dataset.projectId = project?.projectId || "";
    $("#emptyState").hidden = Boolean(project);
    $("#projectWorkspace").hidden = !project;
    if (!project) return;
    E.refreshGeneratedFiles(project);
    const progress = E.progress(project);
    $("#projectTitle").textContent = project.name;
    $("#projectMeta").textContent = [project.game, project.topic, project.targetPublishDate && `目标 ${project.targetPublishDate}`].filter(Boolean).join(" · ") || "尚未补充项目资料";
    $("#currentStateLabel").textContent = `${project.currentState} · ${E.STATE_LABELS[project.currentState]}`;
    $("#progressText").textContent = `${progress.percent}% · ${progress.index + 1}/${progress.total}`;
    $("#progressBar").style.width = `${progress.percent}%`;
    renderNextAction(project);
    renderLocks(project);
    renderTabs();
    renderTab(project);
  }

  function renderProjectList() {
    $("#projectCount").textContent = state.projects.length;
    $("#projectList").innerHTML = state.projects.map((project) => `<button class="project-item ${project.projectId === state.selectedProjectId ? "active" : ""}" aria-current="${project.projectId === state.selectedProjectId ? "true" : "false"}" data-select-project="${h(project.projectId)}"><strong>${h(project.name)}</strong><span>${h(E.STATE_LABELS[project.currentState] || project.currentState)}</span></button>`).join("");
  }

  function renderNextAction(project) {
    const action = E.nextAction(project);
    const missing = [...action.missingInputs, ...action.missingOutputs];
    $("#nextActionCard").innerHTML = `<div class="next-grid"><div><p class="eyebrow">ONE NEXT ACTION · ${h(action.target)}</p><h3>${h(action.title)}</h3><p>${h(action.description)}</p><div class="inline-actions"><button class="button primary" data-action="open-prompt">生成交接 Prompt</button><button class="button ghost" data-action="state-next" ${action.canAdvance ? "" : "disabled"}>${action.canAdvance ? "进入下一阶段" : "门禁尚未满足"}</button></div></div><div><p class="eyebrow">INPUT / OUTPUT CHECK</p><div class="check-list">${missing.length ? missing.map((key) => `<div class="check missing">缺少 · ${h(fileLabel(key))}</div>`).join("") : `<div class="check">当前必需项已齐备</div>`}${action.transitionErrors.map((item) => `<div class="check missing">门禁 · ${h(item)}</div>`).join("")}</div></div></div>`;
  }

  function renderLocks(project) {
    $("#lockGrid").innerHTML = LOCKS.map(([key, label, help]) => `<div class="lock-card ${project.locks[key] ? "locked" : ""}"><label><span>${h(label)}</span><input type="checkbox" data-lock="${key}" ${project.locks[key] ? "checked" : ""}></label><small>${h(help)}</small></div>`).join("");
  }

  function renderTabs() {
    $("#tabs").innerHTML = TABS.map(([key, label]) => `<button class="tab ${activeTab === key ? "active" : ""}" data-tab="${key}">${label}</button>`).join("");
  }

  function renderTab(project) {
    const views = { control: controlView, files: filesView, assets: assetsView, script: scriptView, audio: audioView, storyboard: storyboardView, review: reviewView, prompt: promptView };
    $("#tabContent").innerHTML = views[activeTab](project);
  }

  function controlView(project) {
    const progress = E.progress(project);
    const visibleKeys = E.visibleFileKeys(project);
    return `<section class="panel"><div class="section-title"><div><p class="eyebrow">STATE MACHINE</p><h3>统一生产管线</h3></div><p>所有 Creator Project 使用同一条状态机。回退保留文件和历史，但重新打开相应决策。</p></div><div class="pipeline">${progress.flow.map((key, index) => `<div class="stage ${index < progress.index ? "past" : index === progress.index ? "current" : ""}">${String(index + 1).padStart(2, "0")}<b>${h(E.STATE_LABELS[key])}</b></div>`).join("")}</div></section>
      <section class="grid-3"><div class="metric"><span>当前可用文件</span><strong>${visibleKeys.filter((key) => project.files[key]?.status === "Ready").length}/${visibleKeys.length}</strong></div><div class="metric"><span>Must 素材缺口</span><strong>${project.assets.filter((asset) => asset.priority === "Must" && !["Ready", "Used"].includes(asset.status)).length}</strong></div><div class="metric"><span>Review Open</span><strong>${project.reviews.filter((review) => review.status !== "Done").length}</strong></div></section>
      <section class="panel"><div class="section-title"><div><p class="eyebrow">PROJECT CONTEXT</p><h3>阶段上下文</h3></div><p>这些内容会写入项目标准文件，并参与下一步判断。</p></div><div class="grid-2"><label class="field">前置素材指南<textarea class="editor small" data-project-field="preAssetGuide">${h(project.preAssetGuide)}</textarea></label><label class="field">视觉规范<textarea class="editor small" data-project-field="visualStyle">${h(project.visualStyle)}</textarea></label><label class="field">导出规范<textarea class="editor small" data-project-field="exportSpec">${h(project.exportSpec)}</textarea></label><label class="field">发布包<textarea class="editor small" data-project-field="releasePack">${h(project.releasePack)}</textarea></label></div></section>
      <section class="panel danger-zone"><div class="toolbar"><div><p class="eyebrow">PROJECT MAINTENANCE</p><strong>项目操作</strong></div><button class="button danger" data-action="delete-project">删除当前项目</button></div><p class="muted">删除只影响本浏览器内的项目记录；已经同步到磁盘的目录不会被删除。</p></section>`;
  }

  function filesView(project) {
    const keys = E.visibleFileKeys(project);
    return `<section class="panel"><div class="toolbar"><div><p class="eyebrow">ARTIFACT CONTRACT</p><h3>项目文件登记</h3></div><span class="muted">文本保存在项目 JSON；大音视频只登记文件信息。Music 文件随 Music Mode 显示。</span></div><div class="file-list">${keys.map((key) => {
      const file = project.files[key];
      const contract = E.fileContract(project, key);
      return `<div class="file-row"><div><strong>${h(E.FILE_DEFINITIONS[key]?.label || key)}</strong>${contract === "optional" ? ` <small class="muted">Optional</small>` : ""}<br><code>${h(file.relativePath)}</code></div><div><span class="status-pill ${String(file.status).toLowerCase()}">${h(file.status)}</span>${file.filename && file.filename !== E.FILE_DEFINITIONS[key]?.filename ? ` <small class="muted">${h(file.filename)}</small>` : ""}</div><div class="file-actions"><button class="button tiny ghost" data-upload-file="${key}">${file.status === "Ready" ? "替换" : "登记"}</button>${file.content ? `<button class="button tiny ghost" data-download-file="${key}">下载</button>` : ""}</div></div>`;
    }).join("")}</div></section>`;
  }

  function assetsView(project) {
    return `<section class="panel"><div class="section-title"><div><p class="eyebrow">ASSET INDEX</p><h3>素材管理</h3></div><p>Must 未就绪时无法进入 Production Ready。文件名会按类型自动生成。</p></div><form id="assetForm" class="grid-3"><label class="field">类型<select name="type">${E.ASSET_TYPES.map((v) => `<option>${v}</option>`).join("")}</select></label><label class="field">优先级<select name="priority">${E.ASSET_PRIORITIES.map((v) => `<option>${v}</option>`).join("")}</select></label><label class="field">描述<input name="description" required placeholder="画面要证明什么？"></label><label class="field">来源<input name="source" placeholder="录屏 / 官方资料"></label><label class="field">状态<select name="status">${E.ASSET_STATUSES.map((v) => `<option>${v}</option>`).join("")}</select></label><label class="field">标签<input name="tags" placeholder="UI,爆发,对比"></label><div><button class="button primary" type="submit">添加素材</button></div></form></section><section class="panel table-wrap"><table class="data-table"><thead><tr><th>文件</th><th>说明</th><th>优先级</th><th>状态</th><th></th></tr></thead><tbody>${project.assets.length ? project.assets.map((asset) => `<tr><td><strong>${h(asset.filename)}</strong><br><small>${h(asset.type)}</small></td><td>${h(asset.description)}<br><small class="muted">${h(asset.source)}</small></td><td>${h(asset.priority)}</td><td><select data-asset-status="${h(asset.assetId)}">${E.ASSET_STATUSES.map((v) => `<option ${asset.status === v ? "selected" : ""}>${v}</option>`).join("")}</select></td><td><button class="button tiny danger" data-remove-asset="${h(asset.assetId)}">删除</button></td></tr>`).join("") : `<tr><td colspan="5" class="muted">还没有素材。先登记 Must 画面，再考虑氛围填充。</td></tr>`}</tbody></table></section>`;
  }

  function scriptView(project) {
    return `<section class="panel"><div class="toolbar"><div><p class="eyebrow">VOICE MASTER</p><h3>口播与 AV Anchor</h3></div><div class="inline-actions"><button class="button ghost" data-action="scan-anchors">扫描 AV Anchor</button><button class="button primary" data-action="generate-tts">生成 TTS Chunks</button></div></div><div class="notice">在强音画绑定处写 <code>[AV:ACTION]</code>、<code>[AV:UI]</code>、<code>[AV:NUMBER]</code>、<code>[AV:COMPARE]</code>、<code>[AV:CAUSE_EFFECT]</code> 等标记。</div><textarea class="editor" data-project-field="voiceMaster" placeholder="# 第一章\n完整口播……[AV:UI]">${h(project.voiceMaster)}</textarea></section>
      <section class="grid-2"><div class="panel"><div class="toolbar"><strong>TTS Chunks</strong><span class="muted">${project.ttsChunks.length} 段</span></div><div class="card-list">${project.ttsChunks.map((chunk) => `<article class="item-card"><h4>${h(chunk.id)} · ${h(chunk.chapter)}</h4><p>${chunk.wordCount} 字 · ${h(chunk.startText)} … ${h(chunk.endText)}</p></article>`).join("") || `<p class="muted">保存脚本后生成。</p>`}</div></div><div class="panel"><div class="toolbar"><strong>AV Anchors</strong><span class="muted">${project.avAnchors.length} 个</span></div><div class="card-list">${project.avAnchors.map((anchor) => `<article class="item-card"><h4>${h(anchor.id)} · ${h(anchor.type)}</h4><p>${h(anchor.cue || "等待补充语义提示")}</p></article>`).join("") || `<p class="muted">脚本中的标记会在这里形成强制画面锚点。</p>`}</div></div></section>`;
  }

  function audioView(project) {
    const audio = project.audioProduction || E.defaultAudioProduction();
    const mode = E.musicMode(project);
    const musicFields = mode === "skip" ? `<div class="notice">本项目不使用音乐。LYRICS / SUNO_PROMPT / MUSIC_MASTER / INSTRUMENTAL 不参与缺失判断，也不会阻塞流程。</div>`
      : mode === "existing" ? `<section class="panel"><div class="section-title"><div><p class="eyebrow">EXISTING MUSIC</p><h3>使用已有音乐</h3></div><p>音乐文件仍是本地 Production Asset；可在“文件”页登记 MUSIC_MASTER。</p></div><div class="grid-2"><label class="field">曲名<input data-audio-field="trackName" value="${h(audio.trackName)}"></label><label class="field">来源<input data-audio-field="source" value="${h(audio.source)}" placeholder="已有文件 / 来源说明"></label><label class="field">Music Notes<textarea class="editor small" data-audio-field="musicNotes">${h(audio.musicNotes)}</textarea></label><div class="metric"><span>MUSIC_MASTER</span><strong>${project.files.MUSIC_MASTER?.status || "Missing"}</strong></div></div></section>`
      : `<section class="panel"><div class="section-title"><div><p class="eyebrow">GENERATE MUSIC</p><h3>Suno / 音乐生成</h3></div><p>这是 Audio Production 的子流程，不会创建独立 Music State 或 Music Lock。</p></div><div class="grid-2"><label class="field">Suno Prompt<textarea class="editor small" data-audio-field="sunoPrompt">${h(audio.sunoPrompt)}</textarea></label><label class="field">Lyrics（如需要）<textarea class="editor small" data-audio-field="lyrics">${h(audio.lyrics)}</textarea></label><label class="field">候选版本（每行一个）<textarea class="editor small" data-audio-array="candidateVersions">${h((audio.candidateVersions || []).join("\n"))}</textarea></label><label class="field">Selected Version<input data-audio-field="selectedVersion" value="${h(audio.selectedVersion)}"></label><label class="field">Music Notes<textarea class="editor small" data-audio-field="musicNotes">${h(audio.musicNotes)}</textarea></label><div class="metric"><span>MUSIC_MASTER</span><strong>${project.files.MUSIC_MASTER?.status || "Missing"}</strong></div></div></section>`;

    const linked = new Set(project.linkedMusicIds || []);
    return `<section class="panel"><div class="section-title"><div><p class="eyebrow">AUDIO PRODUCTION</p><h3>Voice + Optional Music + Optional SFX</h3></div><p>真正进入 Timeline 前只认最终 AUDIO_MASTER 与人工 Audio Lock。</p></div><div class="grid-3"><div class="metric"><span>Voice</span><strong>${h(audio.voiceStatus || "draft")}</strong></div><div class="metric"><span>最终 AUDIO_MASTER</span><strong>${project.files.AUDIO_MASTER?.status || "Missing"}</strong></div><div class="metric"><span>Audio Lock</span><strong>${project.locks.audioLock ? "LOCKED" : "OPEN"}</strong></div></div><div class="panel"><div class="toolbar"><strong>Music</strong><span class="muted">按项目需要选择，不影响顶级状态机</span></div><div class="inline-actions"><label><input type="radio" name="musicMode" data-music-mode="skip" ${mode === "skip" ? "checked" : ""}> 不使用</label><label><input type="radio" name="musicMode" data-music-mode="existing" ${mode === "existing" ? "checked" : ""}> 使用已有音乐</label><label><input type="radio" name="musicMode" data-music-mode="generate" ${mode === "generate" ? "checked" : ""}> 生成音乐</label></div></div><div class="grid-2"><label class="field">SFX 状态<select data-audio-field="sfxStatus"><option value="optional" ${audio.sfxStatus === "optional" ? "selected" : ""}>可选</option><option value="planned" ${audio.sfxStatus === "planned" ? "selected" : ""}>计划使用</option><option value="ready" ${audio.sfxStatus === "ready" ? "selected" : ""}>已准备</option><option value="skip" ${audio.sfxStatus === "skip" ? "selected" : ""}>不使用</option></select></label><label class="field">SFX Notes<input data-audio-field="sfxNotes" value="${h(audio.sfxNotes)}"></label></div></section>${musicFields}
      <section class="panel"><div class="section-title"><div><p class="eyebrow">REUSABLE MUSIC ASSETS</p><h3>Music Library</h3></div><p>可选的音乐资产登记区。它不决定项目工作流，也不产生 Music Lock。</p></div><form id="musicForm" class="grid-3"><label class="field">曲名<input name="title" required></label><label class="field">游戏<input name="game" value="${h(project.game)}"></label><label class="field">角色<input name="character"></label><label class="field">类型<input name="type" placeholder="Character Song / BGM"></label><label class="field">Suno 版本<input name="sunoVersion"></label><label class="field">状态<select name="releaseStatus"><option>Draft</option><option>Selected</option><option>Ready</option><option>Released</option></select></label><div><button class="button primary" type="submit">保存音乐资产</button></div></form></section><section class="panel card-list">${state.musicLibrary.length ? state.musicLibrary.map((music) => `<article class="item-card"><div class="toolbar"><div><h4>${h(music.title)}</h4><p>${h(music.game)} ${music.character ? `· ${h(music.character)}` : ""} · ${h(music.releaseStatus)}</p></div><div class="inline-actions"><button class="button tiny ${linked.has(music.musicId) ? "primary" : "ghost"}" data-link-music="${h(music.musicId)}">${linked.has(music.musicId) ? "已关联" : "关联当前项目"}</button><button class="button tiny danger" data-remove-music="${h(music.musicId)}">删除</button></div></div></article>`).join("") : `<p class="muted">还没有音乐资产。</p>`}</section>`;
  }

  function storyboardView(project) {
    return `<section class="panel"><div class="section-title"><div><p class="eyebrow">TIMED STORYBOARD</p><h3>剪辑蓝图</h3></div><p>必须基于真实 SUBTITLE_MASTER 时间码。A = AV Anchor，B = Evidence，C = Ambient Gameplay。</p></div><form id="storyboardForm" class="grid-3"><label class="field">开始<input name="start" value="00:00.000"></label><label class="field">结束<input name="end" value="00:05.000"></label><label class="field">Visual Level<select name="visualLevel"><option>A</option><option selected>B</option><option>C</option></select></label><label class="field">旁白<input name="voice" placeholder="该段实际旁白"></label><label class="field">画面目的<input name="purpose" required placeholder="证明 / 展示 / 对比"></label><label class="field">素材 ID<input name="assetId" placeholder="asset_..."></label><label class="field">画面类型<input name="visualType" value="Gameplay"></label><label class="field">字幕文字<input name="text"></label><label class="field">备注<input name="notes"></label><div><button class="button primary" type="submit">添加镜头段</button></div></form></section><section class="panel table-wrap"><table class="data-table"><thead><tr><th>时间</th><th>Level</th><th>目的</th><th>素材</th><th>画面 / 文字</th><th></th></tr></thead><tbody>${project.blueprint.length ? project.blueprint.map((row) => `<tr><td>${h(row.start)}<br>${h(row.end)}</td><td>${h(row.visualLevel)}</td><td>${h(row.purpose)}</td><td>${h(row.assetId || "—")}</td><td>${h(row.visualType)}<br><small>${h(row.text)}</small></td><td><button class="button tiny danger" data-remove-shot="${h(row.id)}">删除</button></td></tr>`).join("") : `<tr><td colspan="6" class="muted">尚无镜头段。</td></tr>`}</tbody></table></section>`;
  }

  function reviewView(project) {
    return `<section class="panel"><div class="section-title"><div><p class="eyebrow">TIMECODE REVIEW</p><h3>复盘记录</h3></div><p>按时间码和问题类型记录，Revision 只处理这里的明确事项。</p></div><form id="reviewForm" class="grid-3"><label class="field">时间码<input name="timestamp" value="00:00.000"></label><label class="field">类型<select name="type">${E.REVIEW_TYPES.map((v) => `<option>${v}</option>`).join("")}</select></label><label class="field">问题<input name="comment" required placeholder="具体哪里不对，期望如何"></label><div><button class="button primary" type="submit">添加 Review Note</button></div></form></section><section class="panel card-list">${project.reviews.length ? project.reviews.map((review) => `<article class="item-card"><div class="toolbar"><h4>${h(review.timestamp)} · ${h(review.type)}</h4><div class="inline-actions"><select data-review-status="${h(review.id)}"><option ${review.status === "Open" ? "selected" : ""}>Open</option><option ${review.status === "Done" ? "selected" : ""}>Done</option></select><button class="button tiny danger" data-remove-review="${h(review.id)}">删除</button></div></div><p>${h(review.comment)}</p></article>`).join("") : `<p class="muted">暂无复盘项。</p>`}</section>`;
  }

  function promptView(project) {
    return `<section class="panel"><div class="toolbar"><div><p class="eyebrow">STAGE HANDOFF</p><h3>Prompt Generator</h3></div><div class="inline-actions"><button class="button ghost" data-action="copy-prompt">复制 Prompt</button><button class="button primary" data-action="download-prompt">下载 .md</button></div></div><pre id="generatedPrompt" class="editor prompt">${h(E.generatePrompt(project))}</pre></section>`;
  }

  function openProjectDialog(project = null) {
    const form = $("#projectForm");
    form.reset();
    $("#projectDialogTitle").textContent = project ? "编辑项目" : "新建项目";
    form.elements.projectId.value = project?.projectId || "";
    ["name", "game", "topic", "targetPublishDate", "notes"].forEach((key) => { if (project) form.elements[key].value = project[key] || ""; });
    $("#projectDialog").showModal();
  }

  async function chooseFile(key) {
    const project = currentProject();
    if (!project) return;
    const input = document.createElement("input");
    input.type = "file";
    const kind = E.FILE_DEFINITIONS[key]?.kind;
    input.accept = kind === "audio" ? "audio/*" : kind === "video" ? "video/*" : `.${kind || "*"}`;
    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;
      const textKinds = ["md", "json", "csv", "srt"];
      const content = textKinds.includes(kind) ? await file.text() : "";
      E.registerFile(project, key, { name: file.name, size: file.size, content, status: "Ready" });
      save();
      render();
      notify(`${file.name} 已登记`);
    };
    input.click();
  }

  async function syncDirectory() {
    const project = currentProject();
    if (!project || !window.showDirectoryPicker) return notify("当前浏览器不支持目录写入，请使用桌面版 Chrome / Edge。", true);
    try {
      const root = await window.showDirectoryPicker({ mode: "readwrite" });
      const folder = await root.getDirectoryHandle(E.safeName(project.name), { create: true });
      for (const path of E.DIRECTORY_STRUCTURE) await ensureDirectory(folder, path);
      const tree = E.projectFileTree(project);
      for (const [path, content] of Object.entries(tree)) await writeText(folder, path, content);
      save(); render(); notify(`已同步 ${Object.keys(tree).length} 个文本文件到 ${root.name}/${E.safeName(project.name)}`);
    } catch (error) { if (error.name !== "AbortError") notify(`目录同步失败：${error.message}`, true); }
  }

  async function ensureDirectory(root, path) {
    let dir = root;
    for (const part of path.split("/").filter(Boolean)) dir = await dir.getDirectoryHandle(part, { create: true });
    return dir;
  }

  async function writeText(root, path, content) {
    const parts = path.split("/");
    const filename = parts.pop();
    const dir = await ensureDirectory(root, parts.join("/"));
    const handle = await dir.getFileHandle(filename, { create: true });
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  async function importDirectory() {
    if (!window.showDirectoryPicker) return notify("当前浏览器不支持目录读取。", true);
    try {
      const root = await window.showDirectoryPicker({ mode: "read" });
      let projectRoot = root;
      let control;
      try { control = await projectRoot.getDirectoryHandle("00_CONTROL"); }
      catch (_) {
        const entries = [];
        for await (const entry of root.values()) if (entry.kind === "directory") entries.push(entry);
        if (entries.length !== 1) throw new Error("请选择项目根目录，或只包含一个项目目录的父目录");
        projectRoot = entries[0];
        control = await projectRoot.getDirectoryHandle("00_CONTROL");
      }
      const handle = await control.getFileHandle("PROJECT_DATA.json");
      const raw = JSON.parse(await (await handle.getFile()).text());
      importProject(raw);
      notify(`已从 ${projectRoot.name} 读取项目`);
    } catch (error) { if (error.name !== "AbortError") notify(`读取失败：${error.message}`, true); }
  }

  function importProject(raw) {
    const project = E.normalizeProject(raw);
    const index = state.projects.findIndex((item) => item.projectId === project.projectId);
    if (index >= 0) state.projects[index] = project;
    else state.projects.push(project);
    state.selectedProjectId = project.projectId;
    syncProjectQuery(state.selectedProjectId);
    save();
    render();
  }

  function runAction(action) {
    const project = currentProject();
    try {
      if (action === "new-project") return openProjectDialog();
      if (!project) return;
      if (action === "edit-project") return openProjectDialog(project);
      if (action === "export-project") return download(`${E.safeName(project.name)}.production.json`, E.projectDataJson(project));
      if (action === "sync-directory") return syncDirectory();
      if (action === "import-directory") return importDirectory();
      if (action === "state-next") E.transition(project, E.nextState(project));
      if (action === "state-back") E.transition(project, E.previousState(project));
      if (action === "open-prompt") { activeTab = "prompt"; render(); $("#tabs").scrollIntoView({ behavior: "smooth" }); return; }
      if (action === "scan-anchors") { project.avAnchors = E.extractAvAnchors(project.voiceMaster); notify(`识别到 ${project.avAnchors.length} 个 AV Anchor`); }
      if (action === "generate-tts") { E.generateTts(project); notify(`已生成 ${project.ttsChunks.length} 个 TTS Chunks`); }
      if (action === "copy-prompt") { navigator.clipboard.writeText(E.generatePrompt(project)); notify("Prompt 已复制"); return; }
      if (action === "download-prompt") return download(`${E.safeName(project.name)}_${project.currentState}_HANDOFF.md`, E.generatePrompt(project), "text/markdown");
      if (action === "delete-project") {
        if (!confirm(`只删除浏览器内的“${project.name}”？磁盘目录不会受影响。`)) return;
        state.projects = state.projects.filter((item) => item.projectId !== project.projectId);
        state.selectedProjectId = state.projects[0]?.projectId || "";
        syncProjectQuery(state.selectedProjectId);
      }
      save();
      render();
    } catch (error) { notify(error.message, true); render(); }
  }

  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action) return runAction(action);
    const select = event.target.closest("[data-select-project]");
    if (select) { state.selectedProjectId = select.dataset.selectProject; syncProjectQuery(state.selectedProjectId); save(); render(); return; }
    const tab = event.target.closest("[data-tab]");
    if (tab) { activeTab = tab.dataset.tab; render(); return; }
    const upload = event.target.closest("[data-upload-file]");
    if (upload) return chooseFile(upload.dataset.uploadFile);
    const dl = event.target.closest("[data-download-file]");
    if (dl) { const file = currentProject().files[dl.dataset.downloadFile]; return download(file.filename, file.content, "text/plain"); }
    const asset = event.target.closest("[data-remove-asset]");
    if (asset) { currentProject().assets = currentProject().assets.filter((item) => item.assetId !== asset.dataset.removeAsset); E.refreshGeneratedFiles(currentProject()); save(); render(); }
    const shot = event.target.closest("[data-remove-shot]");
    if (shot) { currentProject().blueprint = currentProject().blueprint.filter((item) => item.id !== shot.dataset.removeShot); E.refreshGeneratedFiles(currentProject()); save(); render(); }
    const review = event.target.closest("[data-remove-review]");
    if (review) { currentProject().reviews = currentProject().reviews.filter((item) => item.id !== review.dataset.removeReview); E.refreshGeneratedFiles(currentProject()); save(); render(); }
    const link = event.target.closest("[data-link-music]");
    if (link) { const ids = currentProject().linkedMusicIds ||= []; const id = link.dataset.linkMusic; currentProject().linkedMusicIds = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]; save(); render(); }
    const music = event.target.closest("[data-remove-music]");
    if (music) { state.musicLibrary = state.musicLibrary.filter((item) => item.musicId !== music.dataset.removeMusic); state.projects.forEach((item) => { item.linkedMusicIds = (item.linkedMusicIds || []).filter((id) => id !== music.dataset.removeMusic); }); save(); render(); }
  });

  document.addEventListener("change", (event) => {
    const project = currentProject();
    if (!project) return;
    if (event.target.matches("[data-lock]")) {
      try { E.setLock(project, event.target.dataset.lock, event.target.checked); save(); render(); }
      catch (error) { notify(error.message, true); render(); }
      return;
    }
    if (event.target.matches("[data-music-mode]")) {
      try { E.setMusicMode(project, event.target.dataset.musicMode); save(); render(); notify("Music 模式已更新"); }
      catch (error) { notify(error.message, true); render(); }
      return;
    }
    if (event.target.matches("[data-audio-field]")) {
      project.audioProduction ||= E.defaultAudioProduction();
      project.audioProduction[event.target.dataset.audioField] = event.target.value;
      project.updatedAt = new Date().toISOString();
      E.refreshGeneratedFiles(project);
      save();
      return;
    }
    if (event.target.matches("[data-asset-status]")) { const item = project.assets.find((asset) => asset.assetId === event.target.dataset.assetStatus); if (item) item.status = event.target.value; E.refreshGeneratedFiles(project); save(); render(); }
    if (event.target.matches("[data-review-status]")) { const item = project.reviews.find((review) => review.id === event.target.dataset.reviewStatus); if (item) item.status = event.target.value; E.refreshGeneratedFiles(project); save(); render(); }
  });

  document.addEventListener("focusout", (event) => {
    const project = currentProject();
    if (!project) return;
    const key = event.target.dataset.projectField;
    if (key) {
      project[key] = event.target.value;
      if (key === "voiceMaster") E.registerFile(project, "VOICE_MASTER", { name: "VOICE_MASTER.md", content: event.target.value, status: event.target.value.trim() ? "Ready" : "Missing" });
      else E.refreshGeneratedFiles(project);
      save();
      render();
      return;
    }
    const audioKey = event.target.dataset.audioField;
    if (audioKey) {
      project.audioProduction ||= E.defaultAudioProduction();
      project.audioProduction[audioKey] = event.target.value;
      if (E.musicMode(project) === "generate") {
        if (audioKey === "sunoPrompt") E.registerFile(project, "SUNO_PROMPT", { name: "SUNO_PROMPT.md", content: event.target.value, status: event.target.value.trim() ? "Ready" : "Missing" });
        if (audioKey === "lyrics") E.registerFile(project, "LYRICS", { name: "LYRICS.md", content: event.target.value, status: event.target.value.trim() ? "Ready" : "Missing" });
      }
      project.updatedAt = new Date().toISOString();
      E.refreshGeneratedFiles(project);
      save();
      return;
    }
    const audioArray = event.target.dataset.audioArray;
    if (audioArray) {
      project.audioProduction ||= E.defaultAudioProduction();
      project.audioProduction[audioArray] = event.target.value.split(/\n+/).map((item) => item.trim()).filter(Boolean);
      project.updatedAt = new Date().toISOString();
      E.refreshGeneratedFiles(project);
      save();
    }
  });

  document.addEventListener("submit", (event) => {
    if (!["assetForm", "storyboardForm", "reviewForm", "musicForm"].includes(event.target.id)) return;
    event.preventDefault();
    const project = currentProject();
    const data = Object.fromEntries(new FormData(event.target));
    if (event.target.id === "assetForm") E.createAsset(project, data);
    if (event.target.id === "storyboardForm") E.createBlueprintRow(project, data);
    if (event.target.id === "reviewForm") E.createReview(project, data);
    if (event.target.id === "musicForm") {
      const music = E.createMusicAsset({ ...data, projectId: project.projectId });
      state.musicLibrary.push(music);
      project.linkedMusicIds.push(music.musicId);
    }
    save();
    render();
  });

  $("#projectForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    let project = state.projects.find((item) => item.projectId === data.projectId);
    if (project) {
      Object.assign(project, { name: data.name, game: data.game, topic: data.topic, targetPublishDate: data.targetPublishDate, notes: data.notes });
      project = E.normalizeProject(project);
      state.projects[state.projects.findIndex((item) => item.projectId === project.projectId)] = project;
    } else {
      project = E.createProject(data);
      state.projects.unshift(project);
    }
    state.selectedProjectId = project.projectId;
    syncProjectQuery(state.selectedProjectId);
    $("#projectDialog").close();
    save();
    render();
    notify("项目 Manifest 已保存");
  });

  $("#newProjectButton").addEventListener("click", () => openProjectDialog());
  $("#exportSystemButton").addEventListener("click", () => download(`GUCC-production-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2)));
  $("#importSystemButton").addEventListener("click", () => $("#systemFileInput").click());
  $("#systemFileInput").addEventListener("change", async (event) => {
    try {
      const raw = JSON.parse(await event.target.files[0].text());
      if (Array.isArray(raw.projects)) {
        state.projects = raw.projects.map(E.normalizeProject);
        state.musicLibrary = Array.isArray(raw.musicLibrary) ? raw.musicLibrary : [];
        state.selectedProjectId = raw.selectedProjectId || state.projects[0]?.projectId || "";
        syncProjectQuery(state.selectedProjectId);
      } else importProject(raw);
      save();
      render();
      notify("JSON 已导入");
    } catch (error) { notify(`导入失败：${error.message}`, true); }
    event.target.value = "";
  });

  render();
})();
