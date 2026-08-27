export const ARCHIVE_STATUSES = Object.freeze(["not_generated", "pending", "generating", "generated", "published", "failed", "manual_override"]);

function object(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
function text(value) { return String(value == null ? "" : value).trim(); }

export function archiveState(project = {}) {
  const archive = object(object(project.integration).archive);
  const status = ARCHIVE_STATUSES.includes(archive.status) ? archive.status : "not_generated";
  return {
    status,
    provider: text(archive.provider),
    archiveVersion: Number(archive.archiveVersion || 0) || null,
    folderId: text(archive.folderId),
    folderUrl: text(archive.folderUrl),
    mainFileId: text(archive.mainFileId),
    mainFileUrl: text(archive.mainFileUrl),
    checksum: text(archive.checksum),
    generatedAt: text(archive.generatedAt),
    publishedAt: text(archive.publishedAt),
    verifiedAt: text(archive.verifiedAt),
    lastError: text(archive.lastError),
    overrideReason: text(archive.overrideReason),
  };
}

export function archiveVerified(project = {}) {
  const state = archiveState(project);
  return state.status === "published" && state.provider === "google_drive" && Boolean(state.folderId && state.mainFileId && state.verifiedAt);
}

export function archiveManuallyOverridden(project = {}) {
  const state = archiveState(project);
  return state.status === "manual_override" && Boolean(state.overrideReason);
}

export function canEnterArchived(project = {}) {
  return archiveVerified(project) || archiveManuallyOverridden(project);
}

export function archiveUiState(project = {}) {
  const state = archiveState(project);
  const map = {
    not_generated: ["Not Generated", "Generate Archive", "not_generated"],
    pending: ["Archive Pending", "Generate Archive", "pending"],
    generating: ["Generating", "Generating…", "generating"],
    generated: ["Ready", "Publish Archive", "ready"],
    published: ["Archived", "Update Archive", "archived"],
    failed: ["Failed", "Retry Archive", "failed"],
    manual_override: ["Archived · Manual", "Update Archive", "archived"],
  };
  const [label, actionLabel, code] = map[state.status] || map.not_generated;
  return {
    ...state,
    label,
    actionLabel,
    code,
    canOpen: Boolean(state.mainFileUrl),
    isArchived: archiveVerified(project) || archiveManuallyOverridden(project),
    isBusy: state.status === "generating",
  };
}

export function archiveNextAction(project = {}) {
  const currentState = String(project.currentState || project.current_state || "");
  const state = archiveUiState(project);
  if (currentState === "ARCHIVED") {
    return { title: "Archived ✓", reason: state.canOpen ? "Project Knowledge Archive 已完成，可打开正式归档。" : "Project Knowledge Archive 已完成。", route: "production", archive: state };
  }
  if (currentState !== "PUBLISHED") return null;
  if (state.status === "failed") return { title: "重试 Project Archive", reason: state.lastError || "上一次 Drive Archive 未完成。", route: "production", archive: state };
  if (state.status === "generating") return { title: "等待 Project Archive 完成", reason: "Archive Generator 正在整理轻量项目知识档案。", route: "production", archive: state };
  if (state.status === "generated") return { title: "发布 Project Archive", reason: "Archive Package 已生成，等待 Google Drive 发布与远端校验。", route: "production", archive: state };
  if (state.status === "published") return { title: "更新 Project Archive", reason: "Archive 已存在；可把新增 Analytics 更新到同一正式文件。", route: "production", archive: state };
  return { title: "生成 Project Archive", reason: "发布已完成；下一步只归档轻量 Project Knowledge，不上传媒体文件。", route: "production", archive: state };
}
