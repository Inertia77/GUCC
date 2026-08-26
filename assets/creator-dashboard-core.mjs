const VIDEO_FLOW = [
  "IDEA", "PLANNING", "RESEARCHING", "RESEARCH_LOCKED", "CONTENT_LOCKED", "SCRIPTING", "SCRIPT_LOCKED",
  "PRE_ASSET_PREPARATION", "AUDIO_PRODUCTION", "AUDIO_LOCKED", "TIMELINE_GENERATION", "TIMELINE_LOCKED",
  "STORYBOARDING", "ASSET_COMPLETION", "PRODUCTION_READY", "CODEX_BUILD", "REVIEW", "REVISION", "FINE_EDIT",
  "PICTURE_LOCKED", "RELEASE_READY", "PUBLISHED", "ARCHIVED",
];

const B_FLOW = (() => {
  const flow = [...VIDEO_FLOW];
  flow.splice(flow.indexOf("PRE_ASSET_PREPARATION") + 1, 0, "MUSIC_DRAFT", "MUSIC_LOCKED");
  return flow;
})();

const D_FLOW = ["IDEA", "PLANNING", "MUSIC_DRAFT", "MUSIC_LOCKED", "RELEASE_READY", "PUBLISHED", "ARCHIVED"];

export const STATE_LABELS = Object.freeze({
  IDEA: "选题", PLANNING: "立案规划", RESEARCHING: "资料研究", RESEARCH_LOCKED: "研究锁定",
  CONTENT_LOCKED: "Content Lock", SCRIPTING: "脚本制作", SCRIPT_LOCKED: "Script Lock",
  PRE_ASSET_PREPARATION: "前置素材规划", MUSIC_DRAFT: "音乐生成", MUSIC_LOCKED: "Music Lock",
  AUDIO_PRODUCTION: "音频制作", AUDIO_LOCKED: "Audio Lock", TIMELINE_GENERATION: "字幕对齐",
  TIMELINE_LOCKED: "Timeline Lock", STORYBOARDING: "Timed Storyboard", ASSET_COMPLETION: "素材补全",
  PRODUCTION_READY: "Production Ready", CODEX_BUILD: "Codex Build", REVIEW: "Review", REVISION: "Revision",
  FINE_EDIT: "Fine Edit", PICTURE_LOCKED: "Picture Lock", RELEASE_READY: "发布准备", PUBLISHED: "已发布", ARCHIVED: "已归档",
});

export const PROJECT_TYPE_LABELS = Object.freeze({
  A_FULL_GUIDE: "角色全方位攻略",
  B_SUNO_VIDEO: "Suno 歌曲 / 音乐视频",
  C_GAME_SYSTEM: "游戏底层机制系列",
  D_MUSIC_RELEASE: "音乐发行",
});

const FILE_LABELS = Object.freeze({
  RESEARCH: "RESEARCH.md", CONTENT_LOCK: "CONTENT_LOCK.md", VOICE_MASTER: "VOICE_MASTER.md",
  TTS_MANIFEST: "TTS_MANIFEST.csv", LYRICS: "LYRICS.md", SUNO_PROMPT: "SUNO_PROMPT.md",
  AUDIO_MASTER: "AUDIO_MASTER.wav", MUSIC_MASTER: "MUSIC_MASTER.wav", SUBTITLE_MASTER: "SUBTITLE_MASTER.srt",
  TIMELINE_SENTENCE: "TIMELINE_SENTENCE.csv", TRANSCRIPT_ALIGNED: "TRANSCRIPT_ALIGNED.json",
  ALIGNMENT_REPORT: "ALIGNMENT_REPORT.md", PRE_ASSET_GUIDE: "PRE_ASSET_GUIDE.md", ASSET_INDEX: "ASSET_INDEX.csv",
  EDIT_BLUEPRINT: "EDIT_BLUEPRINT.csv", VISUAL_STYLE: "VISUAL_STYLE.md", EXPORT_SPEC: "EXPORT_SPEC.md",
  VIDEO_V0_REVIEW: "VIDEO_V0_REVIEW.mp4", BUILD_REPORT: "BUILD_REPORT.md", QC_REPORT: "QC_REPORT.md",
  MISSING_ASSET_REPORT: "MISSING_ASSET_REPORT.md", REVIEW_NOTES: "REVIEW_NOTES.md", VIDEO_V1: "VIDEO_V1.mp4",
  RELEASE_PACK: "RELEASE_PACK.md",
});

const ACTIONS = Object.freeze({
  IDEA: ["完成立案规划", ["PROJECT_MANIFEST"], "把选题、观众和目标收口"],
  PLANNING: ["制定研究计划", ["RESEARCH"], "进入会改变结论的事实研究"],
  RESEARCHING: ["完成研究并申请 Research Lock", ["RESEARCH"], "核实版本、数值和争议事实"],
  RESEARCH_LOCKED: ["生成 Content Lock 提案", ["CONTENT_LOCK"], "锁定核心结论与章节顺序"],
  CONTENT_LOCKED: ["撰写 VOICE_MASTER", ["VOICE_MASTER"], "完成正式口播"],
  SCRIPTING: ["完成脚本并生成 TTS Chunks", ["VOICE_MASTER", "TTS_MANIFEST"], "确认完整口播与语音分块"],
  SCRIPT_LOCKED: ["生成 PRE_ASSET_GUIDE", ["PRE_ASSET_GUIDE", "ASSET_INDEX"], "规划确定需要的真实素材"],
  PRE_ASSET_PREPARATION: ["准备音频制作", ["AUDIO_MASTER"], "用锁定脚本制作最终音频"],
  MUSIC_DRAFT: ["生成并筛选音乐版本", ["MUSIC_MASTER"], "完成音乐候选与版本记录"],
  MUSIC_LOCKED: ["制作最终 AUDIO_MASTER", ["AUDIO_MASTER"], "根据锁定音乐完成混音"],
  AUDIO_PRODUCTION: ["完成最终音频并确认 Audio Lock", ["AUDIO_MASTER"], "导出真实最终音频"],
  AUDIO_LOCKED: ["按真实音频生成字幕时间轴", ["SUBTITLE_MASTER", "TIMELINE_SENTENCE", "TRANSCRIPT_ALIGNED", "ALIGNMENT_REPORT"], "实际音频是唯一时间源"],
  TIMELINE_GENERATION: ["完成音频转写与对齐", ["SUBTITLE_MASTER", "TIMELINE_SENTENCE", "TRANSCRIPT_ALIGNED", "ALIGNMENT_REPORT"], "记录实际朗读与原稿差异"],
  TIMELINE_LOCKED: ["生成 Timed Storyboard", ["EDIT_BLUEPRINT"], "把真实字幕时间绑定到素材"],
  STORYBOARDING: ["完善 EDIT_BLUEPRINT", ["EDIT_BLUEPRINT"], "完成音画蓝图"],
  ASSET_COMPLETION: ["补齐 Must 素材", ["ASSET_INDEX"], "真实录制或收集缺失素材"],
  PRODUCTION_READY: ["执行 Structural Cut", ["VIDEO_V0_REVIEW", "BUILD_REPORT", "QC_REPORT", "MISSING_ASSET_REPORT"], "按锁定音频与蓝图构建 V0"],
  CODEX_BUILD: ["完成 V0 Build", ["VIDEO_V0_REVIEW", "BUILD_REPORT", "QC_REPORT", "MISSING_ASSET_REPORT"], "先保证结构与信息正确"],
  REVIEW: ["记录时间码 Review Notes", ["REVIEW_NOTES"], "人工审查 V0"],
  REVISION: ["执行 Revision", ["VIDEO_V1"], "只按 Review Notes 修订"],
  FINE_EDIT: ["完成 Fine Edit 并确认 Picture Lock", ["VIDEO_V1", "QC_REPORT"], "完成最终画面确认"],
  PICTURE_LOCKED: ["执行最终 QC 与导出", ["QC_REPORT", "RELEASE_PACK"], "画面锁定后准备发布资料"],
  RELEASE_READY: ["完成发布确认", ["RELEASE_PACK"], "最终公开发布仍由你点击"],
  PUBLISHED: ["登记链接并准备归档", [], "补齐发布记录与复盘入口"],
  ARCHIVED: ["项目已完成", [], "需要再发行时再重新打开"],
});

const TOP_LEVEL_MERGE_KEYS = [
  "name", "game", "topic", "projectType", "targetPublishDate", "currentState", "locks", "masters", "notes",
  "files", "assets", "reviews", "blueprint", "ttsChunks", "avAnchors", "voiceMaster", "preAssetGuide",
  "visualStyle", "exportSpec", "releasePack", "linkedMusicIds", "integration",
];

const DIFF_LABELS = Object.freeze({
  name: "项目名称", game: "游戏", topic: "主题", projectType: "项目类型", targetPublishDate: "目标发布日期",
  currentState: "当前阶段", locks: "Locks", masters: "母版", notes: "备注", files: "项目文件",
  assets: "素材", reviews: "Review Notes", blueprint: "Storyboard", ttsChunks: "TTS Chunks", avAnchors: "AV Anchors",
  voiceMaster: "口播", preAssetGuide: "素材指南", visualStyle: "视觉规范", exportSpec: "导出规范",
  releasePack: "发布包", linkedMusicIds: "音乐关联", integration: "外部关联",
});

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function same(a, b) {
  try { return JSON.stringify(a ?? null) === JSON.stringify(b ?? null); }
  catch { return false; }
}

function flowFor(type) {
  return type === "B_SUNO_VIDEO" ? B_FLOW : type === "D_MUSIC_RELEASE" ? D_FLOW : VIDEO_FLOW;
}

function projectFromRow(row) {
  const raw = row?.project_data && typeof row.project_data === "object" ? clone(row.project_data) : {};
  return {
    ...raw,
    projectId: raw.projectId || row?.project_id || "",
    name: raw.name || row?.name || "未命名项目",
    game: raw.game || row?.game || "",
    topic: raw.topic || row?.topic || "",
    projectType: raw.projectType || row?.project_type || "A_FULL_GUIDE",
    currentState: raw.currentState || row?.current_state || "IDEA",
    targetPublishDate: raw.targetPublishDate || row?.target_publish_date || "",
    locks: { ...(row?.locks || {}), ...(raw.locks || {}) },
    files: raw.files && typeof raw.files === "object" ? raw.files : {},
  };
}

function fileReady(project, fileRows, key) {
  const local = project.files?.[key];
  const remote = fileRows.find((file) => file.file_key === key);
  return local?.status === "Ready" || Boolean(local?.content) || remote?.status === "Ready";
}

function actionFor(project) {
  if (project.projectType === "B_SUNO_VIDEO" && project.currentState === "SCRIPT_LOCKED") {
    return ["设计歌词与 Suno Prompt", ["LYRICS", "SUNO_PROMPT", "PRE_ASSET_GUIDE"], "先完成歌词、发音与音乐结构"];
  }
  if (project.projectType === "D_MUSIC_RELEASE" && ["IDEA", "PLANNING"].includes(project.currentState)) {
    return ["设计音乐发行项目", ["LYRICS", "SUNO_PROMPT"], "确定曲目、歌词、风格和发行 metadata"];
  }
  return ACTIONS[project.currentState] || ACTIONS.IDEA;
}

function requiredInputs(project) {
  const state = project.currentState;
  if (["AUDIO_LOCKED", "TIMELINE_GENERATION"].includes(state)) return ["AUDIO_MASTER", "VOICE_MASTER"];
  if (["TIMELINE_LOCKED", "STORYBOARDING"].includes(state)) return ["SUBTITLE_MASTER", "TRANSCRIPT_ALIGNED", "PRE_ASSET_GUIDE"];
  if (["PRODUCTION_READY", "CODEX_BUILD"].includes(state)) return ["AUDIO_MASTER", "SUBTITLE_MASTER", "EDIT_BLUEPRINT", "ASSET_INDEX", "VISUAL_STYLE", "EXPORT_SPEC"];
  if (state === "REVISION") return ["VIDEO_V0_REVIEW", "REVIEW_NOTES"];
  return [];
}

function checkpointFromWindow(value) {
  const match = String(value || "").match(/T\s*\+\s*(1|3|7|30)/i);
  return match ? Number(match[1]) : null;
}

function dueAnalytics(releases, now) {
  const due = new Set();
  for (const release of releases) {
    if (!release.published_at) continue;
    const age = Math.floor((now.getTime() - new Date(release.published_at).getTime()) / 86400000);
    if (!Number.isFinite(age) || age < 1) continue;
    const metrics = Array.isArray(release.snapshot?.metrics) ? release.snapshot.metrics : [];
    const completed = new Set(metrics.map((item) => checkpointFromWindow(item?.window)).filter(Boolean));
    for (const day of [1, 3, 7, 30]) if (age >= day && !completed.has(day)) due.add(day);
  }
  return [...due].sort((a, b) => a - b);
}

function daysUntil(date, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return null;
  const target = new Date(`${date}T23:59:59`);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function lockProblems(project, flow) {
  const index = flow.indexOf(project.currentState);
  const required = [
    ["CONTENT_LOCKED", "contentLock", "Content Lock 已被越过但未确认"],
    ["SCRIPT_LOCKED", "scriptLock", "Script Lock 已被越过但未确认"],
    ["AUDIO_LOCKED", "audioLock", "Audio Lock 已被越过但未确认"],
    ["PICTURE_LOCKED", "pictureLock", "Picture Lock 已被越过但未确认"],
  ];
  return required.filter(([state, key]) => flow.includes(state) && index >= flow.indexOf(state) && !project.locks?.[key]).map(([, , message]) => message);
}

function releaseProblems(project, releases) {
  if (!["PUBLISHED", "ARCHIVED"].includes(project.currentState)) return [];
  if (!releases.length) return ["已发布项目尚无 Publish 记录"];
  const published = releases.filter((release) => ["已发布", "published"].includes(release.status) || release.published_at);
  if (!published.length) return ["Publish 状态尚未确认已发布"];
  const incomplete = published.filter((release) => !release.post_url || !release.post_id);
  return incomplete.length ? [`${incomplete.length} 个平台缺少作品 URL 或 ID`] : [];
}

export function stripCloudMetadata(project) {
  const clean = clone(project) || {};
  if (clean.integration?.cloud) {
    clean.integration = { ...clean.integration };
    delete clean.integration.cloud;
  }
  return clean;
}

export function attachCloudMetadata(project, row) {
  const next = stripCloudMetadata(project);
  next.integration = { ...(next.integration || {}), cloud: {
    revision: Number(row?.revision || 0),
    updatedAt: row?.updated_at || "",
    deviceId: row?.last_device_id || "",
    syncedAt: new Date().toISOString(),
  } };
  return next;
}

export function summarizeProjectDiff(localProject, remoteProject) {
  const local = stripCloudMetadata(localProject);
  const remote = stripCloudMetadata(remoteProject);
  return TOP_LEVEL_MERGE_KEYS.filter((key) => !same(local?.[key], remote?.[key])).map((key) => ({ key, label: DIFF_LABELS[key] || key }));
}

export function mergeProjectVersions(baseProject, localProject, remoteProject) {
  const base = stripCloudMetadata(baseProject || {});
  const local = stripCloudMetadata(localProject || {});
  const remote = stripCloudMetadata(remoteProject || {});
  const merged = { ...remote };
  const conflicts = [];
  for (const key of TOP_LEVEL_MERGE_KEYS) {
    const baseValue = base?.[key];
    const localValue = local?.[key];
    const remoteValue = remote?.[key];
    if (same(localValue, remoteValue) || same(remoteValue, baseValue)) merged[key] = clone(localValue);
    else if (same(localValue, baseValue)) merged[key] = clone(remoteValue);
    else conflicts.push({ key, label: DIFF_LABELS[key] || key });
  }
  merged.projectId = local.projectId || remote.projectId;
  merged.updatedAt = new Date().toISOString();
  return { merged, conflicts };
}

export function analyzeCreatorProject(row, fileRows = [], releases = [], options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const serverProject = projectFromRow(row);
  const local = options.localProject?.projectId === serverProject.projectId ? options.localProject : null;
  const project = local && (Date.parse(local.updatedAt || 0) > Date.parse(row?.updated_at || 0)) ? clone(local) : serverProject;
  const flow = flowFor(project.projectType);
  const stateIndex = flow.indexOf(project.currentState);
  const [actionTitle, outputKeys, actionReason] = actionFor(project);
  const missingKeys = [...new Set([...requiredInputs(project), ...outputKeys])].filter((key) => key !== "PROJECT_MANIFEST" && !fileReady(project, fileRows, key));
  const problems = stateIndex < 0 ? [`非法状态：${project.currentState}`] : lockProblems(project, flow);
  const cloudConflict = local?.integration?.cloud?.conflict;
  if (cloudConflict) problems.push("本机与云端存在未解决冲突");
  const releaseIssues = releaseProblems(project, releases);
  const reviewState = project.currentState === "REVIEW";
  let health = { code: "ready", label: "Ready", icon: "🟢", reasons: [] };
  if (problems.length) health = { code: "blocked", label: "Blocked", icon: "🔴", reasons: problems };
  else if (reviewState) health = { code: "review", label: "Awaiting Review", icon: "🟣", reasons: ["等待人工审片"] };
  else if (missingKeys.length || releaseIssues.length) health = { code: "missing", label: "Missing File", icon: "🟡", reasons: [...missingKeys.map((key) => `缺少 ${FILE_LABELS[key] || key}`), ...releaseIssues] };

  const due = dueAnalytics(releases, now);
  const targetDays = daysUntil(project.targetPublishDate, now);
  const lastUpdated = new Date(row?.updated_at || project.updatedAt || 0);
  const staleDays = Number.isNaN(lastUpdated.getTime()) ? 0 : Math.max(0, Math.floor((now.getTime() - lastUpdated.getTime()) / 86400000));
  const warnings = [];
  if (local && Date.parse(local.updatedAt || 0) > Date.parse(row?.updated_at || 0) && !cloudConflict) warnings.push("本机有待同步修改");
  if (staleDays >= 14 && !["PUBLISHED", "ARCHIVED"].includes(project.currentState)) warnings.push(`${staleDays} 天未更新`);
  if (targetDays != null && targetDays < 0) warnings.push(`目标发布日期已过 ${Math.abs(targetDays)} 天`);
  else if (targetDays != null && targetDays <= 2) warnings.push(`距离目标发布 ${targetDays} 天`);

  const percent = stateIndex < 0 ? 0 : Math.round(stateIndex / Math.max(1, flow.length - 1) * 100);
  return {
    projectId: project.projectId,
    name: project.name || "未命名项目",
    game: project.game || "未指定游戏",
    topic: project.topic || "未填写 Topic",
    projectType: project.projectType,
    projectTypeLabel: PROJECT_TYPE_LABELS[project.projectType] || project.projectType,
    currentState: project.currentState,
    currentStateLabel: STATE_LABELS[project.currentState] || project.currentState,
    progress: percent,
    locks: project.locks || {},
    targetPublishDate: project.targetPublishDate || row?.target_publish_date || "",
    updatedAt: row?.updated_at || project.updatedAt || "",
    revision: Number(row?.revision || 0),
    lastDeviceId: row?.last_device_id || "",
    nextAction: actionTitle,
    actionReason,
    missingFiles: missingKeys.map((key) => ({ key, label: FILE_LABELS[key] || key })),
    health,
    warnings,
    analyticsDue: due,
    targetDays,
    archived: project.currentState === "ARCHIVED",
  };
}

function queueItem(project) {
  if (project.archived) return null;
  if (project.health.code === "blocked") return { projectId: project.projectId, kind: "blocked", icon: "⚠️", label: "阻塞", score: 1000, title: project.nextAction, reason: project.health.reasons[0], route: "production" };
  if (project.analyticsDue.length) return { projectId: project.projectId, kind: "review", icon: "📊", label: "待复盘", score: 900 + Math.max(...project.analyticsDue), title: `补录 ${project.analyticsDue.map((day) => `T+${day}`).join(" / ")} 数据`, reason: "发布复盘节点已到", route: "publish" };
  if (project.health.code === "review") return { projectId: project.projectId, kind: "review", icon: "🟣", label: "待确认", score: 850, title: project.nextAction, reason: project.health.reasons[0], route: "production" };
  const urgent = project.targetDays != null && project.targetDays <= 2;
  const missingBoost = project.missingFiles.length ? 80 : 0;
  return {
    projectId: project.projectId,
    kind: urgent ? "urgent" : "next",
    icon: urgent ? "🔥" : "→",
    label: urgent ? "优先" : "下一步",
    score: (urgent ? 700 - Math.min(project.targetDays, 2) * 20 : 400) + missingBoost + project.progress,
    title: project.nextAction,
    reason: urgent ? (project.targetDays < 0 ? "目标发布日期已过" : `目标发布日期还有 ${project.targetDays} 天`) : project.actionReason,
    route: "production",
  };
}

export function buildCreatorDashboard(data = {}, options = {}) {
  const filesByProject = new Map();
  const releasesByProject = new Map();
  for (const file of data.files || []) {
    const items = filesByProject.get(file.project_id) || [];
    items.push(file); filesByProject.set(file.project_id, items);
  }
  for (const release of data.releases || []) {
    const items = releasesByProject.get(release.project_id) || [];
    items.push(release); releasesByProject.set(release.project_id, items);
  }
  const localById = new Map((options.localProjects || []).map((project) => [project.projectId, project]));
  const projects = (data.projects || []).map((row) => analyzeCreatorProject(
    row,
    filesByProject.get(row.project_id) || [],
    releasesByProject.get(row.project_id) || [],
    { ...options, localProject: localById.get(row.project_id) },
  ));
  const activeProjects = projects.filter((project) => !project.archived).sort((a, b) => {
    const aDays = a.targetDays == null ? 9999 : a.targetDays;
    const bDays = b.targetDays == null ? 9999 : b.targetDays;
    return aDays - bDays || b.progress - a.progress || String(b.updatedAt).localeCompare(String(a.updatedAt));
  });
  const actions = projects.map(queueItem).filter(Boolean).map((item) => ({ ...item, project: projects.find((project) => project.projectId === item.projectId) })).sort((a, b) => b.score - a.score);
  return { projects, activeProjects, actions, generatedAt: data.serverTime || new Date().toISOString() };
}

