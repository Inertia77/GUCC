(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GuccCreatorGlobal = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = "gucc-creator-global-production-v1";
  const LANGUAGE_STATES = Object.freeze([
    "DRAFT", "SCRIPTING", "SCRIPT_LOCKED", "AUDIO_PRODUCTION", "AUDIO_LOCKED",
    "TIMELINE_GENERATION", "TIMELINE_LOCKED", "READY",
  ]);
  const VISUAL_MASTER_STATES = Object.freeze(["DRAFT", "PLANNING", "STORYBOARDING", "ASSET_COMPLETION", "READY", "LOCKED"]);
  const VARIANT_STATES = Object.freeze(["DRAFT", "ASSEMBLING", "READY", "PLATFORM_PREPARATION", "LOCKED", "RELEASE_READY"]);
  const PUBLICATION_STATES = Object.freeze(["READY_TO_PUBLISH", "SCHEDULED", "PUBLISHING", "PUBLISHED", "FAILED", "RETRY", "REPOST"]);
  const TIMELINE_BUNDLE = Object.freeze(["SUBTITLE_MASTER", "TIMELINE_SENTENCE", "TRANSCRIPT_ALIGNED", "ALIGNMENT_REPORT"]);
  const HUMAN_LOCKS = Object.freeze({
    project: Object.freeze(["project_scope", "evidence_snapshot", "master_script"]),
    language_track: Object.freeze(["language_script", "voice_timeline"]),
    visual_master: Object.freeze(["visual_master", "edit_plan", "master_render"]),
    publish_package: Object.freeze(["platform_variant", "human_final_review", "release"]),
    publication: Object.freeze(["final_publish_confirmation"]),
  });
  const COVERAGE_STATES = Object.freeze(["MATCHED", "BROLL", "MISSING", "PIXEL_ANIMATION", "DIAGRAM", "ADDITIONAL_RECORDING"]);

  const ARTIFACTS = Object.freeze({
    project: Object.freeze({
      PROJECT_BRIEF: "01_RESEARCH/PROJECT_BRIEF.md",
      KNOWLEDGE_BASE: "01_RESEARCH/KNOWLEDGE_BASE.md",
      EVIDENCE_INDEX: "01_RESEARCH/EVIDENCE_INDEX.csv",
      COMMUNITY_QUESTION_POOL: "01_RESEARCH/COMMUNITY_QUESTION_POOL.md",
      RESEARCH_CONCLUSIONS: "01_RESEARCH/RESEARCH_CONCLUSIONS.md",
      SOURCE_FRESHNESS: "01_RESEARCH/SOURCE_FRESHNESS.json",
      FACT_SNAPSHOT: "01_RESEARCH/FACT_SNAPSHOT.json",
      CONTENT_OUTLINE: "02_SCRIPT/PROJECT/CONTENT_OUTLINE.md",
      CHAPTER_PLAN: "02_SCRIPT/PROJECT/CHAPTER_PLAN.md",
      VISUAL_REQUIREMENT_DRAFT: "02_SCRIPT/PROJECT/VISUAL_REQUIREMENT_DRAFT.md",
      MASTER_SCRIPT_ZH: "02_SCRIPT/PROJECT/MASTER_SCRIPT_ZH.md",
      VISUAL_CUE_MAP: "02_SCRIPT/PROJECT/VISUAL_CUE_MAP.json",
      ASSET_INDEX: "06_EDIT_PLAN/PROJECT/ASSET_INDEX.csv",
      CLIP_METADATA: "06_EDIT_PLAN/PROJECT/CLIP_METADATA.json",
      SEMANTIC_TAGS: "06_EDIT_PLAN/PROJECT/SEMANTIC_TAGS.json",
      SOURCE_RIGHTS_METADATA: "06_EDIT_PLAN/PROJECT/SOURCE_RIGHTS_METADATA.json",
      MISSING_ASSET_LIST: "06_EDIT_PLAN/PROJECT/MISSING_ASSET_LIST.csv",
      PIXEL_ANIMATION_LIST: "06_EDIT_PLAN/PROJECT/PIXEL_ANIMATION_LIST.csv",
      ADDITIONAL_RECORDING_LIST: "06_EDIT_PLAN/PROJECT/ADDITIONAL_RECORDING_LIST.csv",
    }),
    language_track: Object.freeze({
      VOICE_SCRIPT: "02_SCRIPT/LANG/{scope}/VOICE_SCRIPT.md",
      AUDIO_MASTER: "03_AUDIO/LANG/{scope}/AUDIO_MASTER.wav",
      SUBTITLE_MASTER: "04_SUBTITLES/LANG/{scope}/SUBTITLE_MASTER.srt",
      TIMELINE_SENTENCE: "04_SUBTITLES/LANG/{scope}/TIMELINE_SENTENCE.csv",
      TRANSCRIPT_ALIGNED: "04_SUBTITLES/LANG/{scope}/TRANSCRIPT_ALIGNED.json",
      ALIGNMENT_REPORT: "04_SUBTITLES/LANG/{scope}/ALIGNMENT_REPORT.md",
    }),
    visual_master: Object.freeze({
      VISUAL_MASTER_TIMELINE: "06_EDIT_PLAN/VISUAL_MASTER/{scope}/VISUAL_MASTER_TIMELINE.json",
      EDIT_DECISION_LIST: "06_EDIT_PLAN/VISUAL_MASTER/{scope}/EDIT_DECISION_LIST.csv",
      SHOT_LIST: "06_EDIT_PLAN/VISUAL_MASTER/{scope}/SHOT_LIST.csv",
      ANIMATION_INSTRUCTIONS: "06_EDIT_PLAN/VISUAL_MASTER/{scope}/ANIMATION_INSTRUCTIONS.md",
      SUBTITLE_INSTRUCTIONS: "06_EDIT_PLAN/VISUAL_MASTER/{scope}/SUBTITLE_INSTRUCTIONS.md",
      BGM_INSTRUCTIONS: "06_EDIT_PLAN/VISUAL_MASTER/{scope}/BGM_INSTRUCTIONS.md",
      SFX_INSTRUCTIONS: "06_EDIT_PLAN/VISUAL_MASTER/{scope}/SFX_INSTRUCTIONS.md",
      ASSET_ASSIGNMENT: "06_EDIT_PLAN/VISUAL_MASTER/{scope}/ASSET_ASSIGNMENT.csv",
      TIMING_PROJECTION: "06_EDIT_PLAN/VISUAL_MASTER/{scope}/TIMING_PROJECTION.json",
      BUILD_MANIFEST: "07_CODEX_BUILD/VISUAL_MASTER/{scope}/BUILD_MANIFEST.json",
      CODEX_BUILD_INSTRUCTIONS: "07_CODEX_BUILD/VISUAL_MASTER/{scope}/CODEX_BUILD_INSTRUCTIONS.md",
      BUILD_REPORT: "07_CODEX_BUILD/VISUAL_MASTER/{scope}/BUILD_REPORT.md",
      QC_REPORT: "07_CODEX_BUILD/VISUAL_MASTER/{scope}/QC_REPORT.md",
      MISSING_ASSET_REPORT: "07_CODEX_BUILD/VISUAL_MASTER/{scope}/MISSING_ASSET_REPORT.md",
      MASTER_VIDEO: "09_FINAL/VISUAL_MASTER/{scope}/MASTER_VIDEO.mp4",
    }),
    variant: Object.freeze({
      BUILD_MANIFEST: "10_RELEASE/VARIANTS/{scope}/BUILD_MANIFEST.json",
      EXPORT_MANIFEST: "10_RELEASE/VARIANTS/{scope}/EXPORT_MANIFEST.json",
      PUBLISH_PACKAGE: "10_RELEASE/VARIANTS/{scope}/PUBLISH_PACKAGE.json",
      QA_REPORT: "10_RELEASE/VARIANTS/{scope}/QA_REPORT.md",
      PERFORMANCE_REPORT: "10_RELEASE/VARIANTS/{scope}/PERFORMANCE_REPORT.md",
      RELEASE_PACK: "10_RELEASE/VARIANTS/{scope}/RELEASE_PACK.md",
    }),
  });

  function text(value) { return String(value == null ? "" : value).trim(); }
  function upper(value) { return text(value).toUpperCase(); }
  function asArray(value) { return Array.isArray(value) ? value : []; }
  function asObject(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
  function safeKey(value) {
    const result = upper(value).replace(/[^A-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 160);
    if (!result) throw new Error("A stable scope key is required");
    return result;
  }
  function artifactPath(scopeType, scopeKey, fileKey) {
    const template = ARTIFACTS[scopeType]?.[fileKey];
    if (!template) throw new Error(`Unsupported ${scopeType} artifact: ${fileKey}`);
    return template.replace("{scope}", safeKey(scopeKey));
  }
  function scopedIdentity(projectId, artifact) {
    const scopeType = text(artifact?.artifact_scope_type || artifact?.artifactScopeType || "project") || "project";
    const scopeId = text(artifact?.artifact_scope_id || artifact?.artifactScopeId || (scopeType === "project" ? projectId : ""));
    const fileKey = text(artifact?.file_key || artifact?.fileKey);
    if (!projectId || !scopeId || !fileKey) throw new Error("Scoped Artifact identity is incomplete");
    return { projectId: text(projectId), scopeType, scopeId, fileKey };
  }
  function scopedCacheKey(projectId, artifact) {
    const id = scopedIdentity(projectId, artifact);
    return `${id.projectId}::${id.scopeType}::${id.scopeId}::${id.fileKey}`;
  }
  function filesForScope(snapshot, scopeType, scopeId) {
    return [...asArray(snapshot?.files), ...asArray(snapshot?.scopedArtifacts)].filter((file) =>
      text(file.artifact_scope_type || "project") === scopeType && text(file.artifact_scope_id) === text(scopeId));
  }
  function fileReady(file) {
    return Boolean(file) && ["ready", "present", "available", "locked"].includes(text(file.status).toLowerCase());
  }
  function fileMap(rows) { return new Map(asArray(rows).map((row) => [text(row.file_key || row.fileKey), row])); }

  function timelineReadiness(track, artifacts) {
    const files = fileMap(artifacts);
    const missing = ["AUDIO_MASTER", ...TIMELINE_BUNDLE].filter((key) => !fileReady(files.get(key)));
    const audio = files.get("AUDIO_MASTER");
    const provenance = asObject(audio?.metadata).timing_provenance || asObject(audio?.metadata).timingProvenance || track?.timing_provenance;
    const realAudio = provenance === "real_audio";
    const aligned = upper(track?.alignment_status) === "VALID";
    return { ready: missing.length === 0 && realAudio && aligned, missing, realAudio, aligned };
  }

  function validateAudioAnalysis(input = {}) {
    const durationMs = Number(input.durationMs);
    const segments = asArray(input.segments);
    const errors = [];
    if (!Number.isFinite(durationMs) || durationMs <= 0) errors.push("AUDIO_MASTER duration must come from a readable real audio file");
    if (!segments.length) errors.push("ASR returned no timestamped segments");
    let previousEnd = 0;
    for (const [index, segment] of segments.entries()) {
      const startMs = Number(segment.startMs); const endMs = Number(segment.endMs);
      if (!text(segment.text)) errors.push(`segment ${index + 1} has no transcript text`);
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs < 0 || endMs <= startMs) errors.push(`segment ${index + 1} has invalid real-audio timestamps`);
      if (Number.isFinite(startMs) && startMs < previousEnd) errors.push(`segment ${index + 1} overlaps the previous ASR segment`);
      if (Number.isFinite(endMs) && Number.isFinite(durationMs) && endMs > durationMs + 100) errors.push(`segment ${index + 1} exceeds AUDIO_MASTER duration`);
      if (Number.isFinite(endMs)) previousEnd = endMs;
    }
    const provider = text(input.provider);
    if (!provider) errors.push("ASR provider identity is required");
    if (/(?:script|estimate|synthetic|mock|fake)/i.test(provider)) errors.push("ASR provider must analyze real AUDIO_MASTER, not estimated or synthetic timing");
    if (!/^sha256:[a-f0-9]{64}$/i.test(text(input.audioChecksum))) errors.push("AUDIO_MASTER SHA-256 is required for timing provenance");
    return { valid: errors.length === 0, errors, provenance: "real_audio", durationMs, segmentCount: segments.length };
  }

  function validatePublishPackage(pkg = {}) {
    const manifest = Object.keys(asObject(pkg.manifest || pkg.package_manifest || pkg.publish_package_snapshot)).length
      ? asObject(pkg.manifest || pkg.package_manifest || pkg.publish_package_snapshot) : asObject(pkg);
    const required = ["variantId", "presentationId", "channelId", "languageTrackIds", "outputArtifact", "exportProfile"];
    const missing = required.filter((key) => {
      const value = manifest[key];
      return Array.isArray(value) ? value.length === 0 : !text(typeof value === "object" ? JSON.stringify(value || null) : value);
    });
    if (!asArray(manifest.languageTrackIds).length) missing.push("languageTrackIds");
    const output = asObject(manifest.outputArtifact);
    if (output.scopeType !== "variant" || text(output.scopeId) !== text(manifest.variantId)) missing.push("outputArtifact.scope");
    if (!text(output.fileKey) || !text(output.relativePath) || !/^sha256:[a-f0-9]{64}$/i.test(text(output.checksum))) missing.push("outputArtifact.identity");
    return { valid: missing.length === 0, missing: [...new Set(missing)] };
  }

  function distributionReadiness(pkg = {}, publication = {}) {
    const revision = Number(pkg.package_revision || pkg.packageRevision || 0);
    const qaRevision = Number(pkg.qa_package_revision || pkg.qaPackageRevision || -1);
    const blockers = [];
    if (!pkg.platform_locked_at && !pkg.platformLockedAt) blockers.push("Platform Variant Lock is required");
    if (upper(pkg.qa_status) !== "PASS" || qaRevision !== revision) blockers.push("AI QA PASS for the current package revision is required");
    if (!pkg.human_reviewed_at && !pkg.humanReviewedAt) blockers.push("Human Final Aesthetic Review is required");
    if (!pkg.release_locked_at && !pkg.releaseLockedAt) blockers.push("Release Lock is required");
    if (!publication.final_publish_confirmed_at && !publication.finalPublishConfirmedAt) blockers.push("Final Publish Confirmation is required before Distribution");
    return { ready: blockers.length === 0, blockers };
  }

  function projectLocks(project) {
    return {
      scope: project?.project_scope_locked_at,
      evidence: project?.evidence_locked_at,
      masterScript: project?.master_script_locked_at,
    };
  }

  function nextGlobalAction(snapshot = {}) {
    const project = snapshot.project || {};
    const locks = projectLocks(project);
    if (!locks.scope) return { stage: "PROJECT_SCOPE", title: "确认 Project Scope", owner: "Human", entityType: "project", entityId: project.project_id, humanRequired: true };
    if (!locks.evidence) return { stage: "EVIDENCE", title: "完成并锁定 Evidence Snapshot", owner: "Human", entityType: "project", entityId: project.project_id, humanRequired: true };
    if (!locks.masterScript) return { stage: "MASTER_SCRIPT", title: "完成中文母稿并确认 Master Script Lock", owner: "Human", entityType: "project", entityId: project.project_id, humanRequired: true };

    const tracks = asArray(snapshot.languageTracks);
    if (!tracks.length) return { stage: "LOCALIZATION", title: "建立第一个 Language Track", owner: "GUCC", entityType: "project", entityId: project.project_id, humanRequired: false };
    for (const track of tracks) {
      const artifacts = filesForScope(snapshot, "language_track", track.language_track_id);
      if (!track.script_locked_at) return { stage: "LANGUAGE_SCRIPT", title: `${track.track_key} 口播稿待人工锁定`, owner: "Human", entityType: "language_track", entityId: track.language_track_id, humanRequired: true };
      const timeline = timelineReadiness(track, artifacts);
      if (!timeline.ready) return { stage: "REAL_AUDIO_TIMELINE", title: `${track.track_key} 需要真实音频分析`, owner: "GUCC / Codex", entityType: "language_track", entityId: track.language_track_id, humanRequired: false, blockers: [...timeline.missing, ...(!timeline.realAudio ? ["REAL_AUDIO_PROVENANCE"] : []), ...(!timeline.aligned ? ["ALIGNMENT_VALID"] : [])] };
      if (!track.voice_timeline_locked_at) return { stage: "VOICE_TIMELINE_LOCK", title: `${track.track_key} Voice / Timeline 待人工锁定`, owner: "Human", entityType: "language_track", entityId: track.language_track_id, humanRequired: true };
    }

    const visualMasters = asArray(snapshot.visualMasters);
    if (!visualMasters.length) return { stage: "VISUAL_MASTER", title: "建立统一 Visual Master", owner: "GUCC / Human", entityType: "project", entityId: project.project_id, humanRequired: false };
    const visual = visualMasters[0];
    if (!visual.visual_locked_at) return { stage: "VISUAL_MASTER_LOCK", title: `${visual.visual_master_key} 待人工锁定`, owner: "Human", entityType: "visual_master", entityId: visual.visual_master_id, humanRequired: true };
    if (!visual.edit_plan_locked_at) return { stage: "AI_DIRECTOR", title: "生成 AI Director Edit Plan 并人工锁定", owner: "GUCC / Human", entityType: "visual_master", entityId: visual.visual_master_id, humanRequired: false };
    if (!visual.master_render_locked_at) return { stage: "CODEX_PRODUCTION", title: "完成 Codex Build、人工精修与 Master Render Lock", owner: "Codex / Human", entityType: "visual_master", entityId: visual.visual_master_id, humanRequired: false };

    const variants = asArray(snapshot.variants);
    if (!variants.length) return { stage: "VARIANT", title: "建立 Distribution Variant", owner: "GUCC", entityType: "project", entityId: project.project_id, humanRequired: false };
    const packages = asArray(snapshot.publishPackages);
    for (const variant of variants) {
      const pkg = packages.find((item) => item.variant_id === variant.variant_id);
      if (!pkg) return { stage: "PUBLISH_PACKAGE", title: `${variant.variant_key} 需要 Platform Presentation / Publish Package`, owner: "GUCC", entityType: "variant", entityId: variant.variant_id, humanRequired: false };
      if (!pkg.platform_locked_at) return { stage: "PLATFORM_VARIANT_LOCK", title: `${variant.variant_key} Package 待人工锁定`, owner: "Human", entityType: "publish_package", entityId: pkg.publish_package_id, humanRequired: true };
      if (upper(pkg.qa_status) !== "PASS" || Number(pkg.qa_package_revision) !== Number(pkg.package_revision)) return { stage: "AI_QA", title: `${variant.variant_key} 需要当前 Revision 的 AI QA`, owner: "GUCC / Codex", entityType: "publish_package", entityId: pkg.publish_package_id, humanRequired: false };
      if (!pkg.human_reviewed_at) return { stage: "HUMAN_FINAL_REVIEW", title: `${variant.variant_key} 等待最终审美确认`, owner: "Human", entityType: "publish_package", entityId: pkg.publish_package_id, humanRequired: true };
      if (!pkg.release_locked_at) return { stage: "RELEASE_LOCK", title: `${variant.variant_key} 等待 Release Lock`, owner: "Human", entityType: "publish_package", entityId: pkg.publish_package_id, humanRequired: true };
    }

    const publications = asArray(snapshot.publications);
    if (!publications.length || publications.every((item) => upper(item.status) !== "PUBLISHED")) return { stage: "DISTRIBUTION", title: "生成 Manual Publish Handoff；真实发布前等待最终确认", owner: "Human", entityType: "project", entityId: project.project_id, humanRequired: true };
    if (!asArray(snapshot.metricSnapshots).length) return { stage: "ANALYTICS", title: "采集 Publication Analytics Snapshot", owner: "GUCC / Human", entityType: "project", entityId: project.project_id, humanRequired: false };
    if (!asArray(snapshot.performanceReports).length) return { stage: "PERFORMANCE_REPORT", title: "生成 Performance Report", owner: "GUCC / Codex", entityType: "project", entityId: project.project_id, humanRequired: false };
    const learnings = asArray(snapshot.learnings);
    if (!learnings.length) return { stage: "LEARNING", title: "生成 GUCC Learning Proposal", owner: "GUCC / Codex", entityType: "project", entityId: project.project_id, humanRequired: false };
    const proposal = learnings.find((item) => upper(item.status) === "PROPOSED");
    if (proposal) return { stage: "LEARNING_REVIEW", title: "审核 GUCC Learning Proposal", owner: "Human", entityType: "learning", entityId: proposal.learning_id, humanRequired: true };
    return { stage: "COMPLETE", title: "Global Production 已闭环；Accepted Learning 可供下一项目使用", owner: "GUCC", entityType: "project", entityId: project.project_id, humanRequired: false };
  }

  function globalSummary(snapshot = {}) {
    const packages = asArray(snapshot.publishPackages);
    return {
      nextAction: nextGlobalAction(snapshot),
      languageTracks: asArray(snapshot.languageTracks).length,
      readyLanguageTracks: asArray(snapshot.languageTracks).filter((track) => track.voice_timeline_locked_at).length,
      visualMasters: asArray(snapshot.visualMasters).length,
      variants: asArray(snapshot.variants).length,
      packageQaPass: packages.filter((pkg) => upper(pkg.qa_status) === "PASS" && Number(pkg.qa_package_revision) === Number(pkg.package_revision)).length,
      releaseLocked: packages.filter((pkg) => pkg.release_locked_at).length,
      published: asArray(snapshot.publications).filter((publication) => upper(publication.status) === "PUBLISHED").length,
      analyticsSnapshots: asArray(snapshot.metricSnapshots).length,
      acceptedLearnings: asArray(snapshot.learnings).filter((learning) => upper(learning.status) === "ACCEPTED").length,
    };
  }

  function globalWorkspacePlan(snapshot = {}) {
    const directories = new Set(["02_SCRIPT/PROJECT", "05_ASSETS/POOL", "06_EDIT_PLAN/PROJECT"]);
    const files = {};
    for (const track of asArray(snapshot.languageTracks)) {
      const key = safeKey(track.track_key);
      directories.add(`02_SCRIPT/LANG/${key}`); directories.add(`03_AUDIO/LANG/${key}`); directories.add(`04_SUBTITLES/LANG/${key}`);
      files[`02_SCRIPT/LANG/${key}/TRACK_MANIFEST.json`] = `${JSON.stringify({ languageTrackId: track.language_track_id, trackKey: track.track_key, languageCode: track.language_code, status: track.status }, null, 2)}\n`;
    }
    for (const visual of asArray(snapshot.visualMasters)) {
      const key = safeKey(visual.visual_master_key);
      directories.add(`06_EDIT_PLAN/VISUAL_MASTER/${key}`); directories.add(`07_CODEX_BUILD/VISUAL_MASTER/${key}`); directories.add(`09_FINAL/VISUAL_MASTER/${key}`);
      files[`06_EDIT_PLAN/VISUAL_MASTER/${key}/VISUAL_MASTER_MANIFEST.json`] = `${JSON.stringify({ visualMasterId: visual.visual_master_id, visualMasterKey: visual.visual_master_key, status: visual.status }, null, 2)}\n`;
    }
    for (const variant of asArray(snapshot.variants)) {
      const key = safeKey(variant.variant_key);
      directories.add(`10_RELEASE/VARIANTS/${key}`);
      files[`10_RELEASE/VARIANTS/${key}/VARIANT_MANIFEST.json`] = `${JSON.stringify({ variantId: variant.variant_id, variantKey: variant.variant_key, status: variant.status, visualMasterId: variant.visual_master_id || null }, null, 2)}\n`;
    }
    files["00_CONTROL/GLOBAL_PRODUCTION.json"] = `${JSON.stringify({ schemaVersion: SCHEMA_VERSION, projectId: snapshot.project?.project_id || snapshot.project?.projectId || "", summary: globalSummary(snapshot) }, null, 2)}\n`;
    return { directories: [...directories].sort(), files };
  }

  function stagePrompt(stage, snapshot = {}) {
    const action = nextGlobalAction(snapshot);
    const requested = upper(stage || action.stage);
    return [
      `# GUCC GLOBAL PRODUCTION · ${requested}`,
      "",
      `Project: ${snapshot.project?.name || snapshot.project?.project_id || "UNKNOWN"}`,
      `Current next action: ${action.title}`,
      "",
      "## Non-negotiable boundaries",
      "- Never fabricate game UI, character art, footage, facts, sources, timestamps, or publish results.",
      "- AUDIO_MASTER is the only real-audio timing provenance; do not estimate timestamps from script text.",
      "- Language Timeline and Visual Master Timeline are different identities joined by semantic anchors.",
      "- Media stays local. Cloud records identity, state, metadata, locks, history, and relative locations only.",
      "- AI may suggest and validate, but must not set human locks or final publish confirmation.",
      "- If an input is missing, fail closed and report the exact replacement needed.",
    ].join("\n");
  }

  return Object.freeze({
    SCHEMA_VERSION, LANGUAGE_STATES, VISUAL_MASTER_STATES, VARIANT_STATES, PUBLICATION_STATES,
    TIMELINE_BUNDLE, HUMAN_LOCKS, COVERAGE_STATES, ARTIFACTS, safeKey, artifactPath,
    scopedIdentity, scopedCacheKey, filesForScope, timelineReadiness, validateAudioAnalysis,
    validatePublishPackage, distributionReadiness, nextGlobalAction, globalSummary,
    globalWorkspacePlan, stagePrompt,
  });
});
