(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GuccProductionEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = "gucc-ai-video-production-v1";
  const AV_TYPES = ["AV_ACTION", "AV_UI", "AV_NUMBER", "AV_COMPARE", "AV_CAUSE_EFFECT", "AV_SEQUENCE", "AV_ERROR", "AV_CORRECT", "AV_DIAGRAM", "AV_TEXT"];
  const ASSET_TYPES = ["Gameplay", "UI", "Character", "Build", "Diagram", "Image", "Video", "Music", "SFX", "BGM", "Other"];
  const ASSET_STATUSES = ["Missing", "Planned", "Ready", "Used", "Rejected"];
  const ASSET_PRIORITIES = ["Must", "Should", "Optional"];
  const REVIEW_TYPES = ["Content", "Visual", "Asset", "Sync", "Subtitle", "Audio", "Motion", "QC"];

  const PROJECT_TYPES = {
    A_FULL_GUIDE: { short: "A", label: "角色全方位攻略", primaryAI: "ChatGPT → Codex", music: false, release: "video" },
    B_SUNO_VIDEO: { short: "B", label: "Suno 歌曲 / 音乐视频", primaryAI: "ChatGPT ↔ Suno → Codex", music: true, release: "video" },
    C_GAME_SYSTEM: { short: "C", label: "游戏底层机制系列", primaryAI: "ChatGPT → Codex", music: false, release: "video" },
    D_MUSIC_RELEASE: { short: "D", label: "Music Library / 音乐发行", primaryAI: "ChatGPT ↔ Suno", music: true, release: "music" }
  };

  const VIDEO_FLOW_BASE = [
    "IDEA", "PLANNING", "RESEARCHING", "RESEARCH_LOCKED", "CONTENT_LOCKED", "SCRIPTING", "SCRIPT_LOCKED",
    "PRE_ASSET_PREPARATION", "AUDIO_PRODUCTION", "AUDIO_LOCKED", "TIMELINE_GENERATION", "TIMELINE_LOCKED",
    "STORYBOARDING", "ASSET_COMPLETION", "PRODUCTION_READY", "CODEX_BUILD", "REVIEW", "REVISION", "FINE_EDIT",
    "PICTURE_LOCKED", "RELEASE_READY", "PUBLISHED", "ARCHIVED"
  ];
  const B_FLOW = (() => {
    const flow = [...VIDEO_FLOW_BASE];
    const insertAt = flow.indexOf("PRE_ASSET_PREPARATION") + 1;
    flow.splice(insertAt, 0, "MUSIC_DRAFT", "MUSIC_LOCKED");
    return flow;
  })();
  const D_FLOW = ["IDEA", "PLANNING", "MUSIC_DRAFT", "MUSIC_LOCKED", "RELEASE_READY", "PUBLISHED", "ARCHIVED"];

  const STATE_LABELS = {
    IDEA: "选题", PLANNING: "立案规划", RESEARCHING: "资料研究", RESEARCH_LOCKED: "研究锁定",
    CONTENT_LOCKED: "Content Lock", SCRIPTING: "脚本制作", SCRIPT_LOCKED: "Script Lock",
    PRE_ASSET_PREPARATION: "前置素材规划", MUSIC_DRAFT: "音乐生成", MUSIC_LOCKED: "Music Lock",
    AUDIO_PRODUCTION: "音频制作", AUDIO_LOCKED: "Audio Lock", TIMELINE_GENERATION: "字幕对齐",
    TIMELINE_LOCKED: "Timeline Lock", STORYBOARDING: "Timed Storyboard", ASSET_COMPLETION: "素材补全",
    PRODUCTION_READY: "Production Ready", CODEX_BUILD: "Codex Build", REVIEW: "Review", REVISION: "Revision",
    FINE_EDIT: "Fine Edit", PICTURE_LOCKED: "Picture Lock", RELEASE_READY: "发布准备", PUBLISHED: "已发布", ARCHIVED: "已归档"
  };

  const FILE_DEFINITIONS = {
    PROJECT_DATA: { path: "00_CONTROL/PROJECT_DATA.json", label: "项目数据", kind: "json", generated: true },
    PROJECT_MANIFEST: { path: "00_CONTROL/PROJECT_MANIFEST.md", label: "Project Manifest", kind: "md", generated: true },
    STATUS: { path: "00_CONTROL/STATUS.md", label: "唯一状态源", kind: "md", generated: true },
    RESEARCH: { path: "01_RESEARCH/RESEARCH.md", label: "研究与事实", kind: "md" },
    CONTENT_LOCK: { path: "01_RESEARCH/CONTENT_LOCK.md", label: "Content Lock", kind: "md" },
    VOICE_MASTER: { path: "02_SCRIPT/VOICE_MASTER.md", label: "完整口播", kind: "md" },
    TTS_MANIFEST: { path: "02_SCRIPT/TTS_MANIFEST.csv", label: "TTS Manifest", kind: "csv", generated: true },
    LYRICS: { path: "02_SCRIPT/LYRICS.md", label: "歌词", kind: "md", musicOnly: true },
    SUNO_PROMPT: { path: "02_SCRIPT/SUNO_PROMPT.md", label: "Suno Prompt", kind: "md", musicOnly: true },
    AUDIO_MASTER: { path: "03_AUDIO/AUDIO_MASTER.wav", label: "最终主音频", kind: "audio" },
    MUSIC_MASTER: { path: "03_AUDIO/MUSIC_MASTER.wav", label: "锁定音乐", kind: "audio", musicOnly: true },
    INSTRUMENTAL: { path: "03_AUDIO/INSTRUMENTAL.wav", label: "Instrumental", kind: "audio", musicOnly: true },
    SUBTITLE_MASTER: { path: "04_SUBTITLES/SUBTITLE_MASTER.srt", label: "精确字幕", kind: "srt" },
    TIMELINE_SENTENCE: { path: "04_SUBTITLES/TIMELINE_SENTENCE.csv", label: "句级时间轴", kind: "csv" },
    TRANSCRIPT_ALIGNED: { path: "04_SUBTITLES/TRANSCRIPT_ALIGNED.json", label: "对齐稿", kind: "json" },
    ALIGNMENT_REPORT: { path: "04_SUBTITLES/ALIGNMENT_REPORT.md", label: "对齐差异报告", kind: "md" },
    PRE_ASSET_GUIDE: { path: "06_EDIT_PLAN/PRE_ASSET_GUIDE.md", label: "语义素材指南", kind: "md" },
    ASSET_INDEX: { path: "06_EDIT_PLAN/ASSET_INDEX.csv", label: "素材索引", kind: "csv", generated: true },
    EDIT_BLUEPRINT: { path: "06_EDIT_PLAN/EDIT_BLUEPRINT.csv", label: "Timed Storyboard", kind: "csv", generated: true },
    VISUAL_STYLE: { path: "06_EDIT_PLAN/VISUAL_STYLE.md", label: "视觉规范", kind: "md" },
    EXPORT_SPEC: { path: "06_EDIT_PLAN/EXPORT_SPEC.md", label: "导出规范", kind: "md" },
    VIDEO_V0_REVIEW: { path: "07_CODEX_BUILD/VIDEO_V0_REVIEW.mp4", label: "Structural Cut", kind: "video" },
    BUILD_REPORT: { path: "07_CODEX_BUILD/BUILD_REPORT.md", label: "Build Report", kind: "md" },
    QC_REPORT: { path: "07_CODEX_BUILD/QC_REPORT.md", label: "QC Report", kind: "md" },
    MISSING_ASSET_REPORT: { path: "07_CODEX_BUILD/MISSING_ASSET_REPORT.md", label: "缺失素材报告", kind: "md" },
    REVIEW_NOTES: { path: "08_REVIEW/REVIEW_NOTES.md", label: "Review Notes", kind: "md", generated: true },
    VIDEO_V1: { path: "09_FINAL/VIDEO_V1.mp4", label: "Fine Edit Master", kind: "video" },
    RELEASE_PACK: { path: "10_RELEASE/RELEASE_PACK.md", label: "发布包", kind: "md" }
  };

  const PRODUCTION_READY_FILES = ["AUDIO_MASTER", "SUBTITLE_MASTER", "EDIT_BLUEPRINT", "ASSET_INDEX", "VISUAL_STYLE", "EXPORT_SPEC"];
  const DIRECTORY_STRUCTURE = [
    "00_CONTROL", "01_RESEARCH", "02_SCRIPT/TTS_CHUNKS", "03_AUDIO", "04_SUBTITLES", "05_ASSETS/GAMEPLAY",
    "05_ASSETS/UI", "05_ASSETS/CHARACTER", "05_ASSETS/BUILD", "05_ASSETS/GRAPHICS", "05_ASSETS/MUSIC",
    "05_ASSETS/SFX", "06_EDIT_PLAN", "07_CODEX_BUILD", "08_REVIEW", "09_FINAL", "10_RELEASE"
  ];

  const CONSTITUTION_SUMMARY = [
    "最新可验证版本优先，禁止混用不同测试版本。", "不得捏造游戏 UI、角色图、技能图标或不存在的素材。",
    "所有画面服务当前旁白，视觉优先级始终为 AV Anchor > Evidence Visual > Ambient Gameplay。",
    "AUDIO_MASTER 是绝对主时间轴；SUBTITLE_MASTER 是字幕唯一时间源；EDIT_BLUEPRINT 是剪辑结构唯一基准。",
    "素材不足时不得擅自生成假的游戏素材，必须输出 MISSING_ASSET_REPORT。", "视觉效果保持克制，避免廉价 AI 感和无信息装饰。"
  ];
  const PROJECT_TYPE_RULES = {
    A_FULL_GUIDE: "以完整、可执行的角色攻略为目标，优先真实实机、UI、配装与循环证据。",
    B_SUNO_VIDEO: "歌词、发音、结构和 Suno 版本必须经过 Music Lock；Music Lock 后再制作最终 AUDIO_MASTER。",
    C_GAME_SYSTEM: "以公式、因果、对比和实机验证解释底层机制，优先 Diagram / Number / Sequence 类 AV Anchor。",
    D_MUSIC_RELEASE: "以可复用音乐资产和发行 metadata 为目标，保留歌词、Prompt、母带、伴奏、封面和版本关系。"
  };

  function uid(prefix = "id") {
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${Date.now().toString(36)}_${random}`;
  }
  function now() { return new Date().toISOString(); }
  function flowFor(type) { return type === "B_SUNO_VIDEO" ? B_FLOW : type === "D_MUSIC_RELEASE" ? D_FLOW : VIDEO_FLOW_BASE; }
  function fileReady(project, key) { return project.files?.[key]?.status === "Ready" || Boolean(project.files?.[key]?.content); }
  function csvCell(value) { const text = String(value == null ? "" : value); return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
  function toCsv(headers, rows) { return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n"; }
  function safeName(value) { return String(value || "PROJECT").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").slice(0, 72); }

  function blankFiles(type) {
    const files = {};
    Object.entries(FILE_DEFINITIONS).forEach(([key, def]) => {
      if (def.musicOnly && !PROJECT_TYPES[type].music) return;
      files[key] = { key, filename: def.path.split("/").pop(), relativePath: def.path, status: def.generated && ["PROJECT_DATA", "PROJECT_MANIFEST", "STATUS", "ASSET_INDEX", "EDIT_BLUEPRINT", "REVIEW_NOTES"].includes(key) ? "Ready" : "Missing", content: "", size: null, updatedAt: "", notes: "" };
    });
    return files;
  }

  function createProject(input) {
    const type = PROJECT_TYPES[input.projectType] ? input.projectType : "A_FULL_GUIDE";
    const project = {
      schemaVersion: SCHEMA_VERSION,
      projectId: input.projectId || uid("project"),
      name: String(input.name || "未命名项目").trim(), game: String(input.game || "").trim(), topic: String(input.topic || "").trim(),
      projectType: type, createdAt: now(), updatedAt: now(), targetPublishDate: input.targetPublishDate || "", currentState: "IDEA",
      locks: { contentLock: false, scriptLock: false, musicLock: false, audioLock: false, pictureLock: false },
      masters: { audio: "", video: "" }, notes: String(input.notes || ""),
      files: blankFiles(type), assets: [], reviews: [], blueprint: [], ttsChunks: [], avAnchors: [],
      voiceMaster: "", preAssetGuide: "", visualStyle: "", exportSpec: "", releasePack: "",
      history: [{ at: now(), action: "PROJECT_CREATED", state: "IDEA", note: "Project Manifest / Status initialized" }],
      linkedMusicIds: []
    };
    refreshGeneratedFiles(project);
    return project;
  }

  function normalizeProject(raw) {
    const base = createProject({ name: raw?.name, game: raw?.game, topic: raw?.topic, projectType: raw?.projectType, targetPublishDate: raw?.targetPublishDate, notes: raw?.notes });
    const project = { ...base, ...(raw || {}) };
    project.locks = { ...base.locks, ...(raw?.locks || {}) };
    project.masters = { ...base.masters, ...(raw?.masters || {}) };
    project.files = Object.fromEntries(Object.keys(base.files).map((key) => [key, { ...base.files[key], ...(raw?.files?.[key] || {}) }]));
    project.assets = Array.isArray(raw?.assets) ? raw.assets : [];
    project.reviews = Array.isArray(raw?.reviews) ? raw.reviews : [];
    project.blueprint = Array.isArray(raw?.blueprint) ? raw.blueprint : [];
    project.ttsChunks = Array.isArray(raw?.ttsChunks) ? raw.ttsChunks : [];
    project.avAnchors = Array.isArray(raw?.avAnchors) ? raw.avAnchors : [];
    project.history = Array.isArray(raw?.history) ? raw.history : [];
    if (!flowFor(project.projectType).includes(project.currentState)) project.currentState = "IDEA";
    refreshGeneratedFiles(project);
    return project;
  }

  function currentIndex(project) { return Math.max(0, flowFor(project.projectType).indexOf(project.currentState)); }
  function previousState(project) { const flow = flowFor(project.projectType); return flow[Math.max(0, currentIndex(project) - 1)]; }
  function nextState(project) { const flow = flowFor(project.projectType); return flow[Math.min(flow.length - 1, currentIndex(project) + 1)]; }

  function gateForState(project, target) {
    const errors = [];
    if (target === "CONTENT_LOCKED" && !project.locks.contentLock) errors.push("先确认 Content Lock");
    if (target === "SCRIPT_LOCKED") {
      if (!project.locks.scriptLock) errors.push("先确认 Script Lock");
      if (!fileReady(project, "VOICE_MASTER")) errors.push("缺少 VOICE_MASTER.md");
    }
    if (target === "MUSIC_LOCKED" && !project.locks.musicLock) errors.push("先确认 Music Lock");
    if (target === "AUDIO_LOCKED") {
      if (!project.locks.audioLock) errors.push("先确认 Audio Lock");
      if (!fileReady(project, "AUDIO_MASTER")) errors.push("缺少 AUDIO_MASTER.wav");
    }
    if (target === "TIMELINE_GENERATION" && !project.locks.audioLock) errors.push("Audio Lock 前禁止生成精确时间轴");
    if (target === "TIMELINE_LOCKED" && !fileReady(project, "SUBTITLE_MASTER")) errors.push("缺少 SUBTITLE_MASTER.srt");
    if (target === "STORYBOARDING" && !fileReady(project, "SUBTITLE_MASTER")) errors.push("Timed Storyboard 必须基于真实字幕时间轴");
    if (target === "PRODUCTION_READY") {
      PRODUCTION_READY_FILES.filter((key) => !fileReady(project, key)).forEach((key) => errors.push(`缺少 ${FILE_DEFINITIONS[key].filename}`));
      const mustMissing = project.assets.filter((asset) => asset.priority === "Must" && !["Ready", "Used"].includes(asset.status));
      if (mustMissing.length) errors.push(`仍有 ${mustMissing.length} 个 Must 素材未就绪`);
    }
    if (target === "REVIEW" && !fileReady(project, "VIDEO_V0_REVIEW")) errors.push("缺少 VIDEO_V0_REVIEW.mp4");
    if (target === "PICTURE_LOCKED" && !project.locks.pictureLock) errors.push("先确认 Picture Lock");
    return errors;
  }

  function transition(project, target, options = {}) {
    const flow = flowFor(project.projectType);
    if (!flow.includes(target)) throw new Error(`${project.projectType} 不使用状态 ${target}`);
    const current = currentIndex(project);
    const targetIndex = flow.indexOf(target);
    if (!options.force && Math.abs(targetIndex - current) > 1) throw new Error("状态只能前进或回退一个阶段");
    const errors = targetIndex > current ? gateForState(project, target) : [];
    if (errors.length) throw new Error(errors.join("；"));
    const from = project.currentState;
    project.currentState = target;
    project.updatedAt = now();
    project.history.push({ at: now(), action: targetIndex > current ? "STATE_ADVANCED" : "STATE_REOPENED", from, state: target, note: options.note || "" });
    refreshGeneratedFiles(project);
    return project;
  }

  function setLock(project, lockKey, value) {
    if (!Object.prototype.hasOwnProperty.call(project.locks, lockKey)) throw new Error("未知 Lock");
    const lockStage = { contentLock: "RESEARCH_LOCKED", scriptLock: "SCRIPTING", musicLock: "MUSIC_DRAFT", audioLock: "AUDIO_PRODUCTION", pictureLock: "FINE_EDIT" }[lockKey];
    const flow = flowFor(project.projectType);
    if (value && (!flow.includes(lockStage) || currentIndex(project) < flow.indexOf(lockStage))) throw new Error(`${STATE_LABELS[lockStage]} 阶段前不能确认 ${lockKey}`);
    if (value && lockKey === "contentLock" && !fileReady(project, "CONTENT_LOCK")) throw new Error("Content Lock 前必须登记 CONTENT_LOCK.md");
    if (value && lockKey === "scriptLock" && !fileReady(project, "VOICE_MASTER")) throw new Error("Script Lock 前必须登记 VOICE_MASTER.md");
    if (value && lockKey === "musicLock" && !fileReady(project, "MUSIC_MASTER")) throw new Error("Music Lock 前必须登记 MUSIC_MASTER.wav");
    if (value && lockKey === "audioLock" && !fileReady(project, "AUDIO_MASTER")) throw new Error("Audio Lock 前必须登记真实 AUDIO_MASTER.wav");
    if (value && lockKey === "pictureLock" && !fileReady(project, "VIDEO_V1")) throw new Error("Picture Lock 前必须登记 VIDEO_V1.mp4");
    project.locks[lockKey] = Boolean(value);
    project.updatedAt = now();
    project.history.push({ at: now(), action: value ? "LOCK_SET" : "LOCK_REOPENED", lock: lockKey, state: project.currentState });
    refreshGeneratedFiles(project);
    return project;
  }

  const ACTIONS = {
    IDEA: ["ChatGPT", "完成立案规划", ["PROJECT_MANIFEST"], "把选题、观众、目标和不做什么收口成项目 Manifest。"],
    PLANNING: ["ChatGPT", "制定研究计划", ["RESEARCH"], "只研究会改变结论和结构的事实。"],
    RESEARCHING: ["ChatGPT", "完成研究并申请 Research Lock", ["RESEARCH"], "核实版本、数值、官方规则和争议事实。"],
    RESEARCH_LOCKED: ["ChatGPT", "生成 Content Lock 提案", ["CONTENT_LOCK"], "锁定核心结论、章节、必讲/简讲/不讲与叙事顺序。"],
    CONTENT_LOCKED: ["ChatGPT", "撰写 VOICE_MASTER", ["VOICE_MASTER"], "写完整口播，并在强音画关联处加入 [AV:TYPE]。"],
    SCRIPTING: ["ChatGPT", "完成脚本并生成 TTS Chunks", ["VOICE_MASTER", "TTS_MANIFEST"], "按自然语义完成口播和 350～450 中文字 TTS 分块。"],
    SCRIPT_LOCKED: ["ChatGPT", "生成 PRE_ASSET_GUIDE", ["PRE_ASSET_GUIDE", "ASSET_INDEX"], "只描述确定需要的素材，不绑定时间码。"],
    PRE_ASSET_PREPARATION: ["User", "准备音频制作", ["AUDIO_MASTER"], "用 VOICE_MASTER / TTS_CHUNKS 完成真人朗读或剪映 TTS。"],
    MUSIC_DRAFT: ["Suno", "生成并筛选音乐版本", ["MUSIC_MASTER"], "根据锁定歌词与 Suno Prompt 生成候选，记录版本差异。"],
    MUSIC_LOCKED: ["User", "制作最终 AUDIO_MASTER", ["AUDIO_MASTER"], "以选定音乐版本完成混音与最终音频。"],
    AUDIO_PRODUCTION: ["User", "完成最终音频并确认 Audio Lock", ["AUDIO_MASTER"], "拼接、修正并导出真实 AUDIO_MASTER.wav。"],
    AUDIO_LOCKED: ["Codex", "按真实音频生成字幕时间轴", ["SUBTITLE_MASTER", "TIMELINE_SENTENCE", "TRANSCRIPT_ALIGNED", "ALIGNMENT_REPORT"], "实际音频是唯一时间源，VOICE_MASTER 只用于校正文案。"],
    TIMELINE_GENERATION: ["Codex", "完成音频转写与对齐", ["SUBTITLE_MASTER", "TIMELINE_SENTENCE", "TRANSCRIPT_ALIGNED", "ALIGNMENT_REPORT"], "记录实际朗读与原稿差异。"],
    TIMELINE_LOCKED: ["ChatGPT", "生成 Timed Storyboard", ["EDIT_BLUEPRINT"], "基于 SRT 和 AV Anchor 为每个时间段绑定真实素材。"],
    STORYBOARDING: ["ChatGPT", "完善 EDIT_BLUEPRINT", ["EDIT_BLUEPRINT"], "坚持 A AV Anchor > B Evidence Visual > C Ambient Gameplay。"],
    ASSET_COMPLETION: ["User", "补齐 Must 素材", ["ASSET_INDEX"], "真实录制或收集缺失素材，禁止用假 UI 替代。"],
    PRODUCTION_READY: ["Codex", "执行 Structural Cut", ["VIDEO_V0_REVIEW", "BUILD_REPORT", "QC_REPORT", "MISSING_ASSET_REPORT"], "严格按主音频、字幕、蓝图和素材索引完成 V0。"],
    CODEX_BUILD: ["Codex", "完成 V0 Build", ["VIDEO_V0_REVIEW", "BUILD_REPORT", "QC_REPORT", "MISSING_ASSET_REPORT"], "先保证内容、镜头、时间、字幕、AV Anchor 正确。"],
    REVIEW: ["User", "记录时间码 Review Notes", ["REVIEW_NOTES"], "按 Content / Visual / Asset / Sync / Subtitle / Audio 分类记录。"],
    REVISION: ["Codex", "执行 Revision", ["VIDEO_V1"], "只按 REVIEW_NOTES 修订，不擅自改变锁定内容和音频长度。"],
    FINE_EDIT: ["User + Codex", "完成 Fine Edit 并确认 Picture Lock", ["VIDEO_V1", "QC_REPORT"], "完成字幕强调、音效、BGM、节奏和信息动效微调。"],
    PICTURE_LOCKED: ["Codex", "执行最终 QC 与导出", ["QC_REPORT", "RELEASE_PACK"], "画面不再修改，只做 QC、导出与发布准备。"],
    RELEASE_READY: ["ChatGPT", "生成发布包并发布", ["RELEASE_PACK"], "根据锁定成片生成平台元数据，最终发布由用户确认。"],
    PUBLISHED: ["User", "归档项目与音乐资产", [], "登记链接、版本和复盘入口后归档。"],
    ARCHIVED: ["User", "项目已完成", [], "仅在需要修订或再发行时重新打开。"]
  };

  function actionFor(project) {
    if (project.projectType === "B_SUNO_VIDEO" && project.currentState === "SCRIPT_LOCKED") {
      return { target: "ChatGPT", title: "设计歌词与 Suno Prompt", outputKeys: ["LYRICS", "SUNO_PROMPT", "PRE_ASSET_GUIDE"], description: "先完成歌词设计、发音与结构，再交给 Suno；不要在 Music Lock 前进入精确时间轴。" };
    }
    if (project.projectType === "D_MUSIC_RELEASE" && ["IDEA", "PLANNING"].includes(project.currentState)) {
      return { target: "ChatGPT", title: "设计音乐发行项目", outputKeys: ["LYRICS", "SUNO_PROMPT"], description: "确定曲目定位、歌词、风格、版本和发行 metadata。" };
    }
    const action = ACTIONS[project.currentState] || ACTIONS.IDEA;
    return { target: action[0], title: action[1], outputKeys: action[2], description: action[3] };
  }

  function nextAction(project) {
    const action = actionFor(project);
    const requiredInputs = [];
    if (["AUDIO_LOCKED", "TIMELINE_GENERATION"].includes(project.currentState)) requiredInputs.push("AUDIO_MASTER", "VOICE_MASTER");
    if (["TIMELINE_LOCKED", "STORYBOARDING"].includes(project.currentState)) requiredInputs.push("SUBTITLE_MASTER", "TRANSCRIPT_ALIGNED", "PRE_ASSET_GUIDE");
    if (["PRODUCTION_READY", "CODEX_BUILD"].includes(project.currentState)) requiredInputs.push(...PRODUCTION_READY_FILES);
    if (project.currentState === "REVISION") requiredInputs.push("VIDEO_V0_REVIEW", "REVIEW_NOTES");
    const missingInputs = requiredInputs.filter((key) => !fileReady(project, key));
    const missingOutputs = action.outputKeys.filter((key) => project.files[key] && !fileReady(project, key));
    const next = nextState(project);
    return {
      ...action, requiredInputs, missingInputs, missingOutputs, nextState: next,
      transitionErrors: next === project.currentState ? [] : gateForState(project, next),
      canAdvance: next === project.currentState || gateForState(project, next).length === 0
    };
  }

  function generatePrompt(project) {
    const action = nextAction(project);
    const type = PROJECT_TYPES[project.projectType];
    const inputLines = action.requiredInputs.length ? action.requiredInputs.map((key) => `- ${FILE_DEFINITIONS[key]?.path || key}${fileReady(project, key) ? "（已有）" : "（缺失）"}`).join("\n") : "- 00_CONTROL/PROJECT_MANIFEST.md\n- 00_CONTROL/STATUS.md";
    const outputs = action.outputKeys.length ? action.outputKeys.map((key) => `- ${FILE_DEFINITIONS[key]?.path || key}`).join("\n") : "- 更新 STATUS.md";
    const lockLines = Object.entries(project.locks).map(([key, value]) => `- ${key}: ${value ? "LOCKED" : "OPEN"}`).join("\n");
    const special = ["AUDIO_LOCKED", "TIMELINE_GENERATION"].includes(project.currentState)
      ? "\n- 必须以实际 AUDIO_MASTER 为唯一时间源。\n- 不得根据脚本文字猜时间。\n- 使用实际音频进行转写 / 对齐。\n- VOICE_MASTER 仅用于校正文案。\n- 实际朗读与原稿不同之处必须写入 ALIGNMENT_REPORT。"
      : ["PRODUCTION_READY", "CODEX_BUILD"].includes(project.currentState)
        ? "\n- AUDIO_MASTER 不得裁切、拉伸或修改长度。\n- SUBTITLE_MASTER 是字幕唯一时间源。\n- EDIT_BLUEPRINT 是剪辑结构唯一基准。\n- 首轮只做 Structural Cut；优先修正 AV Anchor。"
        : "";
    return `# GUCC Stage Handoff｜${action.title}

## Role
你是 ${action.target}，正在执行 GUCC AI Video Production System 的标准阶段任务。不要延续任何未写入项目文件的聊天假设。

## Goal
${action.description}

## Prompt Hierarchy
- L0 Creator Constitution: docs/ai-video-production/CREATOR_CONSTITUTION.md
- L1 Project Type Template: ${project.projectType}｜${PROJECT_TYPE_RULES[project.projectType]}
- L2 Project Bootstrap: 00_CONTROL/PROJECT_MANIFEST.md
- L3 Stage Prompt: ${project.currentState}｜${STATE_LABELS[project.currentState]}
- L4 Handoff: 本 Prompt 与下方 Required Output Files

## Current Project State
- Project ID: ${project.projectId}
- Project: ${project.name}
- Game: ${project.game || "未填写"}
- Topic: ${project.topic || "未填写"}
- Type: ${project.projectType}｜${type.label}
- State: ${project.currentState}｜${STATE_LABELS[project.currentState]}
- Target Publish Date: ${project.targetPublishDate || "未填写"}

## Input Files
${inputLines}

## Facts / Locks
${lockLines}

## Task
1. 读取所有输入文件，以 STATUS.md 为唯一状态源。
2. 完成“${action.title}”，不要越权进入后续阶段。
3. 发现素材或事实不足时明确列出缺口，不得编造。
4. 输出可直接写入标准项目目录的完整文件。${special}

## Rules
${CONSTITUTION_SUMMARY.map((rule) => `- ${rule}`).join("\n")}

## Required Output Files
${outputs}

## Next Handoff
完成后更新 STATUS.md，列出实际输出、未解决问题和建议下一状态 ${action.nextState || nextState(project)}。不要只在聊天中宣布完成。

## Do Not
- 不得更改已锁定的 Content / Script / Music / Audio / Picture。
- 不得生成假的游戏 UI、角色立绘、技能图标或伪造录屏。
- 不得使用随机 Gameplay 覆盖应当精确音画绑定的 AV Anchor。
- 不得省略缺失素材；写入 MISSING_ASSET_REPORT 或 STATUS Missing。
`;
  }

  function registerFile(project, key, file) {
    if (!project.files[key]) throw new Error(`当前项目不使用文件 ${key}`);
    project.files[key] = { ...project.files[key], filename: file.name || project.files[key].filename, size: file.size ?? project.files[key].size, content: file.content ?? project.files[key].content, status: file.status || "Ready", updatedAt: now(), notes: file.notes ?? project.files[key].notes };
    if (key === "VOICE_MASTER" && typeof file.content === "string") { project.voiceMaster = file.content; project.avAnchors = extractAvAnchors(file.content); }
    if (key === "AUDIO_MASTER") project.masters.audio = file.name || project.files[key].filename;
    if (["VIDEO_V0_REVIEW", "VIDEO_V1"].includes(key)) project.masters.video = file.name || project.files[key].filename;
    project.updatedAt = now();
    project.history.push({ at: now(), action: "FILE_REGISTERED", file: key, state: project.currentState });
    reconcileProject(project);
    refreshGeneratedFiles(project);
    return project;
  }

  function reconcileProject(project) {
    if (project.currentState === "AUDIO_LOCKED" && fileReady(project, "SUBTITLE_MASTER")) transition(project, "TIMELINE_GENERATION");
    if (project.currentState === "TIMELINE_GENERATION" && fileReady(project, "SUBTITLE_MASTER")) transition(project, "TIMELINE_LOCKED");
    if (project.currentState === "ASSET_COMPLETION" && gateForState(project, "PRODUCTION_READY").length === 0) transition(project, "PRODUCTION_READY");
    if (project.currentState === "CODEX_BUILD" && fileReady(project, "VIDEO_V0_REVIEW")) transition(project, "REVIEW");
    return project;
  }

  function splitTts(text, targetMin = 350, targetMax = 450) {
    const source = String(text || "").replace(/\r\n?/g, "\n").trim();
    if (!source) return [];
    const units = [];
    let chapter = "正文";
    source.split(/\n+/).forEach((paragraph) => {
      const line = paragraph.trim();
      if (!line) return;
      const heading = line.match(/^#{1,4}\s+(.+)/);
      if (heading) { chapter = heading[1].trim(); return; }
      const sentences = line.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [line];
      sentences.forEach((sentence) => units.push({ chapter, text: sentence.trim() }));
    });
    const chunks = [];
    let buffer = [];
    let length = 0;
    let activeChapter = units[0]?.chapter || "正文";
    function flush() {
      const content = buffer.map((unit) => unit.text).join("");
      if (!content) return;
      chunks.push({ id: `TTS_${String(chunks.length + 1).padStart(3, "0")}`, chapter: activeChapter, content, startText: content.slice(0, 24), endText: content.slice(-24), wordCount: [...content].length, status: "Planned" });
      buffer = []; length = 0;
    }
    units.forEach((unit, index) => {
      const unitLength = [...unit.text].length;
      const next = units[index + 1];
      const chapterChanges = next && next.chapter !== unit.chapter;
      if (!buffer.length) activeChapter = unit.chapter;
      if (length >= targetMin && (length + unitLength > targetMax || unit.chapter !== activeChapter)) flush();
      if (!buffer.length) activeChapter = unit.chapter;
      buffer.push(unit); length += unitLength;
      if ((chapterChanges && length >= Math.floor(targetMin * .72)) || length >= targetMax) flush();
    });
    flush();
    if (chunks.length > 1 && chunks[chunks.length - 1].wordCount < Math.floor(targetMin * .55)) {
      const tail = chunks.pop();
      const previous = chunks[chunks.length - 1];
      previous.content += tail.content; previous.endText = previous.content.slice(-24); previous.wordCount = [...previous.content].length;
    }
    return chunks;
  }

  function generateTts(project) {
    project.ttsChunks = splitTts(project.voiceMaster || project.files.VOICE_MASTER?.content || "");
    project.files.TTS_MANIFEST.content = ttsManifestCsv(project.ttsChunks);
    project.files.TTS_MANIFEST.status = project.ttsChunks.length ? "Ready" : "Missing";
    project.files.TTS_MANIFEST.updatedAt = now();
    project.updatedAt = now();
    return project.ttsChunks;
  }

  function ttsManifestCsv(chunks) { return toCsv(["ID", "Chapter", "StartText", "EndText", "WordCount", "Status"], chunks.map((item) => [item.id, item.chapter, item.startText, item.endText, item.wordCount, item.status])); }

  function extractAvAnchors(text) {
    const anchors = [];
    const pattern = /\[AV:(ACTION|UI|NUMBER|COMPARE|CAUSE_EFFECT|SEQUENCE|ERROR|CORRECT|DIAGRAM|TEXT)\]/gi;
    let match;
    while ((match = pattern.exec(String(text || "")))) {
      const before = String(text).slice(Math.max(0, match.index - 80), match.index).split(/\n|[。！？!?]/).pop().trim();
      anchors.push({ id: `AVA_${String(anchors.length + 1).padStart(3, "0")}`, type: `AV_${match[1].toUpperCase()}`, cue: before, sourceIndex: match.index, status: "Planned", assetId: "", notes: "" });
    }
    return anchors;
  }

  const PREFIXES = { Gameplay: "V_CORE", UI: "IMG_UI", Character: "IMG_CHAR", Build: "IMG_BUILD", Diagram: "FIG", Image: "IMG", Video: "V", Music: "MUS", SFX: "SFX", BGM: "BGM", Other: "ASSET" };
  function suggestAssetFilename(project, input) {
    const type = ASSET_TYPES.includes(input.type) ? input.type : "Other";
    const prefix = input.prefix || PREFIXES[type];
    const number = String(project.assets.filter((asset) => asset.type === type).length + 1).padStart(3, "0");
    const slug = safeName(input.slug || input.description || type).replace(/[^\w\u4e00-\u9fff-]+/g, "_").slice(0, 42);
    const ext = input.extension || (type === "Gameplay" || type === "Video" ? ".mp4" : ["Music", "BGM", "SFX"].includes(type) ? ".wav" : ".png");
    return `${prefix}_${number}_${slug || "asset"}${ext.startsWith(".") ? ext : `.${ext}`}`;
  }
  function createAsset(project, input) {
    const asset = {
      assetId: input.assetId || uid("asset"), filename: input.filename || suggestAssetFilename(project, input),
      type: ASSET_TYPES.includes(input.type) ? input.type : "Other", category: input.category || "", description: input.description || "",
      status: ASSET_STATUSES.includes(input.status) ? input.status : "Planned", priority: ASSET_PRIORITIES.includes(input.priority) ? input.priority : "Should",
      source: input.source || "", duration: input.duration || "", notes: input.notes || "", tags: Array.isArray(input.tags) ? input.tags : String(input.tags || "").split(/[,，]/).map((x) => x.trim()).filter(Boolean),
      projectId: project.projectId, createdAt: now(), updatedAt: now()
    };
    project.assets.push(asset); project.updatedAt = now(); refreshGeneratedFiles(project); return asset;
  }

  function createReview(project, input) {
    const review = { id: uid("review"), timestamp: input.timestamp || "00:00.000", type: REVIEW_TYPES.includes(input.type) ? input.type : "Visual", comment: input.comment || "", status: input.status || "Open", createdAt: now() };
    project.reviews.push(review); project.updatedAt = now(); refreshGeneratedFiles(project); return review;
  }

  function createBlueprintRow(project, input = {}) {
    const row = { id: uid("shot"), start: input.start || "00:00.000", end: input.end || "00:00.000", voice: input.voice || "", purpose: input.purpose || "", avAnchor: input.avAnchor || "", visualLevel: input.visualLevel || "B", visualType: input.visualType || "Gameplay", assetId: input.assetId || "", inPoint: input.inPoint || "", outPoint: input.outPoint || "", crop: input.crop || "", zoom: input.zoom || "", overlay: input.overlay || "", text: input.text || "", sfx: input.sfx || "", bgm: input.bgm || "", transition: input.transition || "Hard Cut", animation: input.animation || "", notes: input.notes || "" };
    project.blueprint.push(row); project.updatedAt = now(); refreshGeneratedFiles(project); return row;
  }

  function createMusicAsset(input) {
    return { musicId: input.musicId || uid("music"), title: input.title || "未命名单曲", game: input.game || "", character: input.character || "", type: input.type || "Other", projectId: input.projectId || "", album: input.album || "", sunoVersion: input.sunoVersion || "", audioMaster: input.audioMaster || "", instrumental: input.instrumental || "", lyrics: input.lyrics || "", cover: input.cover || "", createdAt: input.createdAt || now(), sunoPrompt: input.sunoPrompt || "", stylePrompt: input.stylePrompt || "", videoUsage: input.videoUsage || "", releaseStatus: input.releaseStatus || "Draft", notes: input.notes || "" };
  }

  function assetIndexCsv(project) { return toCsv(["asset_id", "filename", "type", "category", "description", "status", "priority", "source", "duration", "notes", "tags", "project_id"], project.assets.map((a) => [a.assetId, a.filename, a.type, a.category, a.description, a.status, a.priority, a.source, a.duration, a.notes, a.tags.join("|"), a.projectId])); }
  function blueprintCsv(project) { const h = ["START", "END", "VOICE", "PURPOSE", "AV_ANCHOR", "VISUAL_LEVEL", "VISUAL_TYPE", "ASSET_ID", "IN_POINT", "OUT_POINT", "CROP", "ZOOM", "OVERLAY", "TEXT", "SFX", "BGM", "TRANSITION", "ANIMATION", "NOTES"]; return toCsv(h, project.blueprint.map((r) => [r.start, r.end, r.voice, r.purpose, r.avAnchor, r.visualLevel, r.visualType, r.assetId, r.inPoint, r.outPoint, r.crop, r.zoom, r.overlay, r.text, r.sfx, r.bgm, r.transition, r.animation, r.notes])); }
  function reviewMarkdown(project) { return `# REVIEW NOTES｜${project.name}\n\n${project.reviews.length ? project.reviews.map((r) => `## ${r.timestamp}｜${r.type}｜${r.status}\n${r.comment}`).join("\n\n") : "（暂无 Review Note）"}\n`; }
  function manifestMarkdown(project) { return `# PROJECT MANIFEST\n\n- project_id: ${project.projectId}\n- name: ${project.name}\n- game: ${project.game}\n- topic: ${project.topic}\n- project_type: ${project.projectType}\n- created_at: ${project.createdAt}\n- target_publish_date: ${project.targetPublishDate}\n- current_state: ${project.currentState}\n- content_lock: ${project.locks.contentLock}\n- script_lock: ${project.locks.scriptLock}\n- music_lock: ${project.locks.musicLock}\n- audio_lock: ${project.locks.audioLock}\n- picture_lock: ${project.locks.pictureLock}\n- current_master_audio: ${project.masters.audio}\n- current_master_video: ${project.masters.video}\n\n## Notes\n${project.notes || "（无）"}\n`; }
  function statusMarkdown(project) { const action = nextAction(project); return `# STATUS\n\n## PROJECT\n${project.name}\n\n## TYPE\n${project.projectType}\n\n## STATE\n${project.currentState}\n\n## LOCKS\n- CONTENT LOCK: ${project.locks.contentLock ? "YES" : "NO"}\n- SCRIPT LOCK: ${project.locks.scriptLock ? "YES" : "NO"}\n- MUSIC LOCK: ${project.locks.musicLock ? "YES" : "NO"}\n- AUDIO LOCK: ${project.locks.audioLock ? "YES" : "NO"}\n- PICTURE LOCK: ${project.locks.pictureLock ? "YES" : "NO"}\n\n## NEXT ACTION\n${action.title}\n\n## OWNER\n${action.target}\n\n## REQUIRED INPUT\n${action.requiredInputs.map((key) => FILE_DEFINITIONS[key]?.filename || key).join("\n") || "PROJECT_MANIFEST.md"}\n\n## MISSING\n${[...action.missingInputs, ...action.missingOutputs].map((key) => FILE_DEFINITIONS[key]?.filename || key).join("\n") || "None"}\n`; }

  function projectDataJson(project) {
    const snapshot = { ...project, files: { ...project.files } };
    if (snapshot.files.PROJECT_DATA) snapshot.files.PROJECT_DATA = { ...snapshot.files.PROJECT_DATA, content: "" };
    return JSON.stringify(snapshot, null, 2);
  }

  function refreshGeneratedFiles(project) {
    if (!project.files) return project;
    const generated = {
      PROJECT_DATA: projectDataJson(project), PROJECT_MANIFEST: manifestMarkdown(project), STATUS: statusMarkdown(project),
      TTS_MANIFEST: ttsManifestCsv(project.ttsChunks || []), ASSET_INDEX: assetIndexCsv(project), EDIT_BLUEPRINT: blueprintCsv(project), REVIEW_NOTES: reviewMarkdown(project)
    };
    Object.entries(generated).forEach(([key, content]) => {
      if (!project.files[key]) return;
      project.files[key].content = content;
      const emptyCollection = (key === "TTS_MANIFEST" && !project.ttsChunks.length)
        || (key === "ASSET_INDEX" && !project.assets.length)
        || (key === "EDIT_BLUEPRINT" && !project.blueprint.length);
      project.files[key].status = emptyCollection ? "Missing" : "Ready";
    });
    if (project.files.VOICE_MASTER && project.voiceMaster) { project.files.VOICE_MASTER.content = project.voiceMaster; project.files.VOICE_MASTER.status = "Ready"; }
    if (project.files.PRE_ASSET_GUIDE && project.preAssetGuide) { project.files.PRE_ASSET_GUIDE.content = project.preAssetGuide; project.files.PRE_ASSET_GUIDE.status = "Ready"; }
    if (project.files.VISUAL_STYLE && project.visualStyle) { project.files.VISUAL_STYLE.content = project.visualStyle; project.files.VISUAL_STYLE.status = "Ready"; }
    if (project.files.EXPORT_SPEC && project.exportSpec) { project.files.EXPORT_SPEC.content = project.exportSpec; project.files.EXPORT_SPEC.status = "Ready"; }
    if (project.files.RELEASE_PACK && project.releasePack) { project.files.RELEASE_PACK.content = project.releasePack; project.files.RELEASE_PACK.status = "Ready"; }
    return project;
  }

  function projectFileTree(project) {
    refreshGeneratedFiles(project);
    const tree = {};
    Object.values(project.files).forEach((file) => { if (file.content != null && String(file.content).length) tree[file.relativePath] = String(file.content); });
    project.ttsChunks.forEach((chunk) => { tree[`02_SCRIPT/TTS_CHUNKS/${chunk.id}.txt`] = chunk.content; });
    return tree;
  }

  function progress(project) {
    const flow = flowFor(project.projectType);
    return { index: currentIndex(project), total: flow.length, percent: Math.round(currentIndex(project) / Math.max(1, flow.length - 1) * 100), flow };
  }

  return {
    SCHEMA_VERSION, PROJECT_TYPES, PROJECT_TYPE_RULES, STATE_LABELS, FILE_DEFINITIONS, DIRECTORY_STRUCTURE, AV_TYPES, ASSET_TYPES, ASSET_STATUSES, ASSET_PRIORITIES, REVIEW_TYPES,
    flowFor, createProject, normalizeProject, transition, previousState, nextState, gateForState, setLock, nextAction, generatePrompt,
    registerFile, reconcileProject, splitTts, generateTts, ttsManifestCsv, extractAvAnchors, suggestAssetFilename, createAsset,
    createReview, createBlueprintRow, createMusicAsset, assetIndexCsv, blueprintCsv, reviewMarkdown, manifestMarkdown, statusMarkdown,
    refreshGeneratedFiles, projectDataJson, projectFileTree, progress, fileReady, safeName, toCsv
  };
});
