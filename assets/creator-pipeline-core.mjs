import { attachCloudMetadata, summarizeProjectDiff } from "./creator-dashboard-core.mjs";

export const PRODUCTION_STORAGE_KEY = "gucc_ai_video_production_v1";
export const PUBLISH_STORAGE_KEY = "gucc_publish_console_v1";
export const STUDIO_HANDOFF_KEY = "gucc_creator_studio_handoff_v1";
export const PUBLISH_HANDOFF_KEY = "gucc_creator_publish_handoff_v1";
export const STUDIO_CREATOR_PROJECT_ID_KEY = "gucc_creator_studio_project_id_v1"; // legacy fallback only
export const STUDIO_WORKSPACE_IDENTITY_KEY = "gucc_creator_studio_workspace_identity_v2";
export const DRIVE_ROOT = Object.freeze({
  id: "1wVMD-nIk6ArtGDi5gyOCmhW1pY-iRM9L",
  url: "https://drive.google.com/drive/folders/1wVMD-nIk6ArtGDi5gyOCmhW1pY-iRM9L",
  name: "GUCC Creator Projects",
});

function newCanonicalProjectId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `project_${Date.now().toString(36)}_${random}`;
}

function newWorkspaceInstanceId() {
  const random = Math.random().toString(36).slice(2, 8);
  return `workspace_${Date.now().toString(36)}_${random}`;
}

export function resolveStudioProjectId(existingId = "", forceNew = false, idFactory = newCanonicalProjectId) {
  const current = String(existingId || "").trim();
  if (!forceNew && current) return current;
  return idFactory();
}

export function resolveStudioWorkspaceIdentity(existing = {}, options = {}) {
  const forceNewWorkspace = Boolean(options.forceNewWorkspace);
  const forceNewProject = Boolean(options.forceNewProject);
  const idFactory = options.idFactory || newCanonicalProjectId;
  const workspaceIdFactory = options.workspaceIdFactory || newWorkspaceInstanceId;
  const legacyProjectId = String(options.legacyProjectId || "").trim();
  const currentWorkspaceId = String(existing?.workspaceInstanceId || "").trim();
  const currentProjectId = String(existing?.creatorProjectId || "").trim();
  const workspaceInstanceId = forceNewWorkspace || !currentWorkspaceId ? workspaceIdFactory() : currentWorkspaceId;
  let creatorProjectId = currentProjectId;
  if (forceNewWorkspace || forceNewProject || !creatorProjectId) {
    creatorProjectId = (!forceNewWorkspace && !forceNewProject && legacyProjectId) ? legacyProjectId : idFactory();
  }
  return {
    workspaceInstanceId,
    creatorProjectId,
    updatedAt: new Date().toISOString(),
    migratedFromLegacy: Boolean(!currentProjectId && legacyProjectId && creatorProjectId === legacyProjectId),
  };
}

function isStudioBrowser() {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
  const path = String(window.location?.pathname || "");
  return path.includes("/apps/video-workspace/") && !path.includes("/production-system/");
}

function readStudioIdentity() {
  if (!isStudioBrowser()) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STUDIO_WORKSPACE_IDENTITY_KEY) || "null");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch { return {}; }
}

function readLegacyStudioProjectId() {
  if (!isStudioBrowser()) return "";
  try { return localStorage.getItem(STUDIO_CREATOR_PROJECT_ID_KEY) || ""; }
  catch { return ""; }
}

function persistStudioIdentity(identity) {
  if (!isStudioBrowser()) return identity;
  try {
    localStorage.setItem(STUDIO_WORKSPACE_IDENTITY_KEY, JSON.stringify(identity));
    // Keep the old scalar key as a compatibility mirror, never as the source of truth.
    localStorage.setItem(STUDIO_CREATOR_PROJECT_ID_KEY, identity.creatorProjectId || "");
  } catch { /* local identity convenience only */ }
  return identity;
}

function currentStudioIdentity() {
  const existing = readStudioIdentity();
  const identity = resolveStudioWorkspaceIdentity(existing, { legacyProjectId: readLegacyStudioProjectId() });
  return persistStudioIdentity(identity);
}

export function createCanonicalProjectId() {
  if (!isStudioBrowser()) return newCanonicalProjectId();
  return currentStudioIdentity().creatorProjectId;
}

export function createNewStudioProjectId() {
  if (!isStudioBrowser()) return newCanonicalProjectId();
  const identity = resolveStudioWorkspaceIdentity(readStudioIdentity(), { forceNewProject: true });
  return persistStudioIdentity(identity).creatorProjectId;
}

export function createNewStudioWorkspaceIdentity() {
  if (!isStudioBrowser()) return resolveStudioWorkspaceIdentity({}, { forceNewWorkspace: true });
  return persistStudioIdentity(resolveStudioWorkspaceIdentity(readStudioIdentity(), { forceNewWorkspace: true }));
}

function installStudioProjectIdentityControl() {
  if (!isStudioBrowser() || typeof MutationObserver === "undefined" || typeof document === "undefined") return;
  const inject = () => {
    const actions = document.querySelector("#guccCreatorBridge [data-gcb-actions]");
    if (!actions || actions.querySelector("[data-gcb-save-as-new]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.gcbSaveAsNew = "true";
    button.textContent = "复制为新项目";
    button.title = "复制当前 Workspace 的内容，但明确创建新的 Creator Project ID";
    button.addEventListener("click", () => {
      const projectId = createNewStudioProjectId();
      button.textContent = `新 Project · ${projectId.slice(-6)}`;
      window.setTimeout(() => { if (button.isConnected) button.textContent = "复制为新项目"; }, 1800);
    });
    const firstLink = actions.querySelector("a");
    actions.insertBefore(button, firstLink || null);
  };

  const start = () => {
    currentStudioIdentity();
    inject();
    let lastStatus = String(document.querySelector("#statusText")?.textContent || "");
    const observer = new MutationObserver(() => {
      inject();
      const status = String(document.querySelector("#statusText")?.textContent || "");
      if (status !== lastStatus && status.includes("已清空")) createNewStudioWorkspaceIdentity();
      lastStatus = status;
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
}

installStudioProjectIdentityControl();

function text(value) {
  return String(value == null ? "" : value).trim();
}

function section(title, value) {
  const content = text(value);
  return content ? `## ${title}\n${content}` : "";
}

function markFile(project, key, content) {
  const value = text(content);
  if (!value || !project.files?.[key]) return;
  project.files[key].content = value;
  project.files[key].status = "Ready";
  project.files[key].updatedAt = new Date().toISOString();
}

export function studioSnapshotToProduction(engine, snapshot = {}) {
  if (!engine?.createProject) throw new Error("Production engine is not ready");
  const projectId = text(snapshot.projectId) || createCanonicalProjectId();
  const project = engine.createProject({
    projectId,
    name: text(snapshot.projectTitle) || text(snapshot.projectShortTitle) || "未命名创作项目",
    game: text(snapshot.game),
    topic: text(snapshot.coreQuestion) || text(snapshot.projectShortTitle),
    targetPublishDate: /^\d{4}-\d{2}-\d{2}$/.test(text(snapshot.ddl)) ? text(snapshot.ddl) : "",
    notes: [
      text(snapshot.version) && `版本：${text(snapshot.version)}`,
      text(snapshot.priority) && `优先级：${text(snapshot.priority)}`,
      text(snapshot.type) && `Studio 内容标签：${text(snapshot.type)}`,
    ].filter(Boolean).join("\n"),
  });

  const research = [
    section("事前学习目标", snapshot.preStudyGoal),
    section("学习材料 / 链接", snapshot.preStudyMaterials),
    section("学习笔记 / 关键概念", snapshot.preStudyNotes),
    section("事前学习结论", snapshot.preStudyTakeaways),
    section("仍待确认", snapshot.preStudyQuestions),
    section("一句话问题", snapshot.coreQuestion),
    section("暂定核心结论", snapshot.coreConclusion),
    section("目标观众", snapshot.audience),
    section("这期不做什么", snapshot.notDo),
    section("官方信息 / 链接", snapshot.officialInfo),
    section("社区争议 / 玩家问题", snapshot.communityDebate),
    section("自己的观察 / 实测条件", snapshot.testNotes),
    section("事实核对 / 参考来源", snapshot.evidenceLocker),
    section("已有 AI 分析", snapshot.aiAnalysis),
    section("已有章节结构", snapshot.chapterTable),
  ].filter(Boolean).join("\n\n");

  if (research) markFile(project, "RESEARCH", `# RESEARCH｜${project.name}\n\n${research}`);
  if (text(snapshot.script)) {
    project.voiceMaster = text(snapshot.script);
    markFile(project, "VOICE_MASTER", project.voiceMaster);
  }

  const assetGuide = [
    section("需要录制的游戏画面", snapshot.gameFootage),
    section("截图 / 图表 / 封面方向", snapshot.visualPlan),
  ].filter(Boolean).join("\n\n");
  if (assetGuide) {
    project.preAssetGuide = assetGuide;
    markFile(project, "PRE_ASSET_GUIDE", assetGuide);
  }

  const releasePackage = text(snapshot.publishCN);
  if (releasePackage) {
    project.releasePack = releasePackage;
    markFile(project, "RELEASE_PACK", releasePackage);
  }

  project.integration = {
    ...(project.integration || {}),
    workspace: {
      version: text(snapshot.__workspaceVersion) || "studio-v5",
      instanceId: text(snapshot.__creatorWorkspaceInstanceId),
      importedAt: new Date().toISOString(),
      snapshot,
    },
    drive: {
      rootId: DRIVE_ROOT.id,
      rootUrl: DRIVE_ROOT.url,
      rootName: DRIVE_ROOT.name,
      folderId: "",
      folderUrl: "",
    },
  };

  project.currentState = research ? "RESEARCHING" : "PLANNING";
  project.history = Array.isArray(project.history) ? project.history : [];
  project.history.push({
    at: new Date().toISOString(),
    action: "STUDIO_HANDOFF_IMPORTED",
    state: project.currentState,
    note: "Imported from GUCC Studio into the unified Creator Project. Locks remain intentionally open for human confirmation.",
  });
  engine.refreshGeneratedFiles?.(project);
  return project;
}

export function releasePackageFromProject(project = {}) {
  return text(project.releasePack) || text(project.files?.RELEASE_PACK?.content);
}

export function buildReleasePrompt(basePrompt, project = {}) {
  return `${text(basePrompt)}\n\n# GUCC Publish Console 固定交接合同\n你现在输出的是 10_RELEASE/RELEASE_PACK.md。必须让 Publish Console 可以直接解析，不要改下面的二级标题和三级字段名。没有必要的字段可以留空，但不要发明数据。\n\n## B站\n### 最终标题\n### 最终简介\n### 普通标签\n### 置顶评论\n\n## 抖音\n### 最终发布文案\n### 置顶评论\n\n## 小红书视频\n### 最终标题\n### 最终正文\n### 话题\n### 置顶评论\n\n## 微信视频号\n### 最终完整描述\n### 话题\n### 置顶评论\n\n## YouTube 简体中文\n### 最终标题\n### 最终简介\n### Hashtags\n### 后台 Tags\n\n## TikTok 简体中文\n### 最终 Caption\n### 置顶评论\n\n项目：${text(project.name)}\n游戏：${text(project.game)}\nProject ID：${text(project.projectId)}\n最终发布动作仍由用户确认。`;
}

function defaultPlatformValues(key) {
  const defaults = {
    bilibili: { category: "游戏 / 手机游戏", copyright: "原创" },
    douyin: { disclosure: "无特殊披露" },
    youtube: { visibility: "私享", madeForKids: "否，不是面向儿童的内容", language: "简体中文" },
    tiktok: { visibility: "Only you / 仅自己", interaction: "仅允许评论", disclosure: "无特殊披露" },
  };
  return defaults[key] || {};
}

function freshPublishState(project, rules, packageText) {
  const enabled = {};
  const platforms = {};
  const execution = {};
  for (const [key, config] of Object.entries(rules.PLATFORMS || {})) {
    enabled[key] = true;
    platforms[key] = { ...defaultPlatformValues(key) };
    for (const field of config.fields || []) {
      if (!(field.key in platforms[key])) platforms[key][field.key] = "";
    }
    execution[key] = { status: "draft", postUrl: "", postId: "", note: "" };
  }
  return {
    schemaVersion: "gucc-publish-console-1",
    project: { title: text(project.name), shortName: text(project.name), game: text(project.game), note: `Project ID: ${text(project.projectId)}` },
    common: { publishAt: "", timezone: "Asia/Tokyo", video: "", cover: "", videoPath: "", coverPath: "" },
    enabled,
    platforms,
    execution,
    snapshots: [],
    source: { workspaceVersion: "production-system-v1", publishPackage: packageText, creatorProjectId: text(project.projectId) },
    preflight: null,
  };
}

export function productionToPublishState(existingState, project, rules) {
  if (!rules?.parseWorkspacePackage || !rules?.PLATFORMS) throw new Error("Publish rules are not ready");
  const packageText = releasePackageFromProject(project);
  const sameProject = existingState?.source?.creatorProjectId === project.projectId;
  const state = sameProject ? structuredClone(existingState) : freshPublishState(project, rules, packageText);

  state.schemaVersion = "gucc-publish-console-1";
  state.project = { ...(state.project || {}), title: text(project.name), shortName: text(project.name), game: text(project.game), note: `Project ID: ${text(project.projectId)}` };
  state.common = { publishAt: "", timezone: "Asia/Tokyo", video: "", cover: "", videoPath: "", coverPath: "", ...(state.common || {}) };
  state.source = { ...(state.source || {}), workspaceVersion: "production-system-v1", publishPackage: packageText, creatorProjectId: text(project.projectId) };

  const parsed = rules.parseWorkspacePackage(packageText || "");
  for (const [platformKey, values] of Object.entries(parsed || {})) {
    state.platforms[platformKey] = { ...(state.platforms[platformKey] || defaultPlatformValues(platformKey)) };
    for (const [field, value] of Object.entries(values || {})) {
      if (text(value)) state.platforms[platformKey][field] = value;
    }
  }
  return state;
}

export function mergeCloudProjects(localStore, remoteRows, engine, preferredProjectId = "") {
  const store = localStore && Array.isArray(localStore.projects)
    ? { ...localStore, projects: [...localStore.projects] }
    : { schemaVersion: engine.SCHEMA_VERSION, projects: [], musicLibrary: [], selectedProjectId: "" };
  let changed = false;

  for (const row of remoteRows || []) {
    const raw = row?.project_data;
    if (!raw?.projectId) continue;
    const remote = attachCloudMetadata(engine.normalizeProject(raw, { source: "cloud_pull" }), row);
    const index = store.projects.findIndex((item) => item.projectId === remote.projectId);
    if (index < 0) {
      store.projects.push(remote);
      changed = true;
      continue;
    }
    const localProject = store.projects[index];
    const localCloud = localProject?.integration?.cloud || {};
    if (localCloud.conflict) continue;
    const localTime = Date.parse(localProject.updatedAt || 0) || 0;
    const remoteTime = Date.parse(remote.updatedAt || row.updated_at || 0) || 0;
    const localRevision = Number(localCloud.revision || 0);
    const remoteRevision = Number(row.revision || 0);
    const baseCloudTime = Date.parse(localCloud.updatedAt || 0) || 0;
    const localDirty = localRevision > 0 && localTime > baseCloudTime;

    if (localRevision === 0 && remoteRevision >= 1) {
      const differences = summarizeProjectDiff(localProject, remote);
      if (differences.length) {
        const conflicted = structuredClone(localProject);
        conflicted.integration ||= {};
        conflicted.integration.cloud = {
          ...localCloud,
          revision: 0,
          conflict: {
            kind: "bootstrap",
            currentRevision: remoteRevision,
            project: row,
            differences: differences.map((item) => item.key),
            detectedAt: new Date().toISOString(),
          },
        };
        store.projects[index] = conflicted;
      } else {
        store.projects[index] = attachCloudMetadata(localProject, row);
      }
      changed = true;
      continue;
    }

    if (remoteRevision > localRevision && localRevision > 0 && localDirty) {
      const conflicted = structuredClone(localProject);
      conflicted.integration ||= {};
      conflicted.integration.cloud = {
        ...localCloud,
        conflict: {
          kind: "concurrent",
          currentRevision: remoteRevision,
          project: row,
          detectedAt: new Date().toISOString(),
        },
      };
      store.projects[index] = conflicted;
      changed = true;
    } else if ((remoteRevision > localRevision && localRevision > 0) || remoteTime > localTime) {
      store.projects[index] = remote;
      changed = true;
    } else if (Number(localCloud.revision || 0) !== Number(row.revision || 0)
      || localCloud.updatedAt !== (row.updated_at || "")) {
      store.projects[index] = attachCloudMetadata(localProject, row);
      changed = true;
    }
  }
  if (preferredProjectId && store.projects.some((project) => project.projectId === preferredProjectId)
    && store.selectedProjectId !== preferredProjectId) {
    store.selectedProjectId = preferredProjectId;
    changed = true;
  }
  if (!store.selectedProjectId && store.projects[0]) store.selectedProjectId = store.projects[0].projectId;
  return { store, changed };
}
