(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GuccCreatorAiTask = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const PROJECT_FLOW = Object.freeze([
    "IDEA", "PLANNING", "RESEARCHING", "RESEARCH_LOCKED", "CONTENT_LOCKED", "SCRIPTING", "SCRIPT_LOCKED",
    "PRE_ASSET_PREPARATION", "AUDIO_PRODUCTION", "AUDIO_LOCKED", "TIMELINE_GENERATION", "TIMELINE_LOCKED",
    "STORYBOARDING", "ASSET_COMPLETION", "PRODUCTION_READY", "CODEX_BUILD", "REVIEW", "REVISION", "FINE_EDIT",
    "PICTURE_LOCKED", "RELEASE_READY", "PUBLISHED", "ARCHIVED",
  ]);
  const TIMELINE_KEYS = Object.freeze(["SUBTITLE_MASTER", "TIMELINE_SENTENCE", "TRANSCRIPT_ALIGNED", "ALIGNMENT_REPORT"]);

  const TASKS = Object.freeze({
    PIXEL_PACKAGE: Object.freeze({
      label: "PIXEL PACKAGE",
      title: "像素机制动画包",
      aliases: ["制作像素包", "像素包", "制作像素动画", "像素机制动画"],
    }),
    SRT_ALIGNMENT: Object.freeze({
      label: "SRT ALIGNMENT",
      title: "真实音频字幕对齐",
      aliases: ["生成srt", "srt", "生成字幕", "字幕对齐", "生成srt字幕"],
    }),
    EDIT_BLUEPRINT: Object.freeze({
      label: "EDITING BLUEPRINT",
      title: "剪辑蓝图",
      aliases: ["做剪辑蓝图", "剪辑蓝图", "editingblueprint", "做editingblueprint"],
    }),
    SCRIPT_REVIEW: Object.freeze({
      label: "SCRIPT REVIEW",
      title: "稿件审核",
      aliases: ["审核稿件", "审稿", "稿件审核", "审核文案"],
    }),
    NATURALNESS_REVIEW: Object.freeze({
      label: "NATURALNESS REVIEW",
      title: "口播自然度 / 去 AI 味审核",
      aliases: ["去ai味", "去ai感", "口播自然度", "自然度审核", "去ai味审核"],
    }),
    PUBLISH_PACKAGE: Object.freeze({
      label: "PUBLISH PACKAGE",
      title: "发布包",
      aliases: ["做发布包", "发布包", "生成发布包", "制作发布包"],
    }),
    OFFICIAL_VIDEO_EVIDENCE: Object.freeze({
      label: "OFFICIAL VIDEO EVIDENCE",
      title: "官方视频证据解析",
      aliases: ["解析官方视频", "解析直播", "解析pv", "解析角色展示", "解析实机演示", "视频证据解析"],
    }),
  });

  const TASK_RULES = Object.freeze({
    PIXEL_PACKAGE: Object.freeze([
      "像素动画首先解释机制，不是装饰、转场或填空镜头。",
      "关闭声音时，观众仍应大致看懂：谁做了什么 → 资源 / 状态如何变化 → 触发什么结果。",
      "优先用角色、动作、资源条、状态、Buff / Debuff、敌人标记、技能触发、因果箭头和时间顺序表达机制变化。",
      "必须有时间上的动作、触发、变化和反馈；不得做成静态 PPT。",
      "像素解释画面与真实游戏证据分工明确；需要真实游戏证据的结论不得用 AI 假画面替代。",
      "如果使用角色形象，官方角色参考图用于锁定角色身份和关键识别特征，不只是风格参考。",
    ]),
    SRT_ALIGNMENT: Object.freeze([
      "WHEN = 最终真实 AUDIO_MASTER。所有字幕开始 / 结束时间只从真实音频、真实 ASR 或人工校准时间码获得。",
      "WHAT = 已锁定 Script / Master Script / VOICE_MASTER。正式角色名、术语、标点优先使用锁定文本校正。",
      "绝对禁止按文字长度、字数、平均语速或句长平均分配 / 猜测时间。",
      "真实朗读与锁定文本不一致时，时间服从真实音频；差异必须写入 ALIGNMENT_REPORT，不得伪造朗读内容。",
    ]),
    EDIT_BLUEPRINT: Object.freeze([
      "只使用已经锁定的真实 Timeline；不得从脚本文字重新估时。",
      "每个镜头段必须说明画面目的：证明 / 展示 / 对比 / 因果 / 补充氛围。",
      "画面优先级：A AV Anchor > B Evidence Visual > C Ambient Gameplay。",
      "缺失 Must 素材必须明确标 Missing / Additional Recording / Pixel Animation / Diagram，不得拿假 UI 顶替。",
    ]),
    SCRIPT_REVIEW: Object.freeze([
      "核对事实、机制、逻辑、重复、结构、术语和口播可读性。",
      "最新正式输入优先于旧稿和聊天历史。",
      "已锁定脚本默认只输出问题清单 / 局部 Patch；未人工 Reopen 前不得整篇重写。",
      "修改已完成稿件默认局部修改，不自动全文重写。",
    ]),
    NATURALNESS_REVIEW: Object.freeze([
      "重点检查过度工整、模板句、同构排比、重复转折、机械总结、无必要的术语堆叠和不自然书面语。",
      "保留事实、数值、角色名、机制名和锁定结论；去 AI 味不是改事实。",
      "默认输出局部替换建议，并尽量保持原句节奏；除非明确要求，不全文重写。",
    ]),
    PUBLISH_PACKAGE: Object.freeze([
      "只根据锁定成片 / 当前 Release-ready 内容生成标题、简介、章节、标签、封面文案、平台字段和发布检查项。",
      "不得夸大成片没有兑现的结论，不得伪造福利、活动、Post ID、URL 或发布结果。",
      "Publish Package / QA 可以由 AI 准备，但 Final Publish Confirmation 和真实平台发布必须由人完成。",
    ]),
    OFFICIAL_VIDEO_EVIDENCE: Object.freeze([
      "必须解析视频本身，不允许只读字幕或只总结文案。",
      "逐段结合声音 + 画面 + UI / 状态变化 + 时间戳。",
      "把“官方说了什么”和“画面实际证明什么”分开记录，再给出可确认结论与证据等级。",
      "若音画存在冲突或画面不足以证明口播结论，必须标记不确定，不得脑补。",
    ]),
  });

  const TASK_OUTPUTS = Object.freeze({
    PIXEL_PACKAGE: Object.freeze([
      "一份可直接制作的像素机制动画包：镜头 / 场景序列、角色与对象、资源 / 状态变化、动作触发、屏幕文字、时长与 Timeline Anchor。",
      "逐段标记：抽象解释画面 / 真实证据画面需求；不能用像素动画替代证据的地方列为素材缺口。",
      "给出静音可读性检查，以及 Audience-facing 清洁检查。",
    ]),
    SRT_ALIGNMENT: Object.freeze([
      "SUBTITLE_MASTER.srt：使用锁定文本校正术语，但时间码来自最终真实音频。",
      "TIMELINE_SENTENCE.csv、TRANSCRIPT_ALIGNED.json、ALIGNMENT_REPORT.md（或与 GUCC 当前 Timeline contract 等价的四件套）。",
      "列出实际朗读与锁定文本的差异；无法可靠对齐的区段标 REVIEW_REQUIRED。",
    ]),
    EDIT_BLUEPRINT: Object.freeze([
      "EDIT_BLUEPRINT / Timed Storyboard：每段包含真实 start/end、实际旁白、画面目的、Visual Level、素材 / 缺口、字幕与动画说明。",
      "所有时间码可追溯到当前锁定 Timeline。",
    ]),
    SCRIPT_REVIEW: Object.freeze([
      "按严重程度给出问题清单，并标明原句 / 问题 / 建议修改。",
      "默认给局部 Patch；如果脚本已锁定，只做 Review，不直接替换正式稿。",
    ]),
    NATURALNESS_REVIEW: Object.freeze([
      "AI 味风险点清单 + 局部自然化替换建议。",
      "说明哪些句子无需修改，避免为了改而改。",
    ]),
    PUBLISH_PACKAGE: Object.freeze([
      "按当前目标平台 / Variant 输出可执行发布包与 QA checklist。",
      "明确哪些字段仍需人工最终确认；不得声称已真实发布。",
    ]),
    OFFICIAL_VIDEO_EVIDENCE: Object.freeze([
      "人类可读的视频证据表。",
      "可写入现有 creator_research_sources.fact_snapshot.video_analysis 的 JSON；不要新造数据库模型。",
    ]),
  });

  const TASK_ACCEPTANCE = Object.freeze({
    PIXEL_PACKAGE: Object.freeze([
      "静音查看仍能大致理解机制因果。",
      "不是静态 PPT；关键机制变化都有动作 / 状态反馈。",
      "没有用 AI 假游戏画面冒充真实证据。",
      "最终观众可见内容不含 LOCK、TODO、AI、Codex、内部审核、修改记录或文件路径。",
    ]),
    SRT_ALIGNMENT: Object.freeze([
      "每个 cue 的时间来自最终真实 AUDIO_MASTER，而非文字长度估算。",
      "显示文本遵循锁定 Script / Master Script 的正式术语。",
      "音频与锁定文本差异被显式记录；不确定区段未被强行通过。",
    ]),
    EDIT_BLUEPRINT: Object.freeze([
      "时间轴与当前锁定字幕 / Timeline 一致。",
      "每段都有明确画面目的，Must 缺口可见。",
    ]),
    SCRIPT_REVIEW: Object.freeze([
      "不改写锁定事实；建议可定位到具体句子。",
      "没有无授权全文重写。",
    ]),
    NATURALNESS_REVIEW: Object.freeze([
      "保持原事实和术语；只针对自然度。",
      "以局部修改为默认。",
    ]),
    PUBLISH_PACKAGE: Object.freeze([
      "平台字段与锁定成片一致，QA 项清楚。",
      "Final Publish 仍保留人工确认。",
    ]),
    OFFICIAL_VIDEO_EVIDENCE: Object.freeze([
      "每条核心观察包含时间戳、spoken、visual、ui_state_change、confirmed_claim、evidence_grade。",
      "不能仅靠字幕得出画面机制结论。",
    ]),
  });

  function text(value) { return String(value == null ? "" : value).trim(); }
  function asArray(value) { return Array.isArray(value) ? value : []; }
  function asObject(value) { return value && typeof value === "object" && !Array.isArray(value) ? value : {}; }
  function yes(value) { return Boolean(value); }
  function stateIndex(state) { return PROJECT_FLOW.indexOf(text(state)); }
  function stateAtLeast(state, target) {
    const current = stateIndex(state); const required = stateIndex(target);
    return current >= 0 && required >= 0 && current >= required;
  }
  function fileReady(row) {
    return Boolean(row) && ["ready", "present", "available", "locked"].includes(text(row.status).toLowerCase());
  }
  function localFile(project, key) {
    const row = project?.files?.[key];
    if (!row) return null;
    return {
      key,
      status: row.status || "Missing",
      path: row.relativePath || row.relative_path || "",
      filename: row.filename || "",
      checksum: row.checksum || "",
      content: typeof row.content === "string" ? row.content : "",
      source: "project",
    };
  }
  function scopedFiles(snapshot, scopeType, scopeId) {
    return [...asArray(snapshot?.files), ...asArray(snapshot?.scopedArtifacts)].filter((row) =>
      text(row.artifact_scope_type || "project") === scopeType
      && text(row.artifact_scope_id || (scopeType === "project" ? row.project_id : "")) === text(scopeId));
  }
  function scopedFile(snapshot, scopeType, scopeId, key) {
    const row = scopedFiles(snapshot, scopeType, scopeId).find((item) => text(item.file_key || item.fileKey) === key);
    if (!row) return null;
    return {
      key,
      status: row.status || "Missing",
      path: row.relative_path || row.relativePath || "",
      filename: row.filename || "",
      checksum: row.checksum || "",
      content: "",
      source: scopeType,
      metadata: asObject(row.metadata),
    };
  }
  function sourceTrack(snapshot) {
    const tracks = asArray(snapshot?.languageTracks);
    return tracks.find((track) => track.is_source === true) || tracks[0] || null;
  }
  function findVersion(project, cloudData) {
    const direct = text(project?.integration?.workspace?.snapshot?.version || cloudData?.integration?.workspace?.snapshot?.version);
    if (direct) return direct;
    const notes = text(project?.notes || cloudData?.notes);
    const match = notes.match(/(?:^|\n)版本[：:]\s*([^\n]+)/);
    return match ? text(match[1]) : "";
  }
  function resolveTask(command) {
    const normalized = text(command).toLowerCase().replace(/[\s·・_\-—:：/\\]+/g, "");
    if (!normalized) return null;
    for (const [key, task] of Object.entries(TASKS)) {
      if (task.aliases.some((alias) => alias.toLowerCase().replace(/[\s·・_\-—:：/\\]+/g, "") === normalized)) {
        return { key, ...task };
      }
    }
    return null;
  }
  function sourceOfTruth(project, snapshot, track, visual) {
    const result = ["当前 Project / Supabase 最新状态优先于旧 Chat、旧稿和旧 Prompt。"];
    const legacyLocks = asObject(project?.locks);
    if (legacyLocks.scriptLock || track?.script_locked_at || snapshot?.project?.master_script_locked_at) {
      result.push("WHAT：已锁定 Script / Master Script / VOICE_MASTER 是正式文字基准。");
    }
    if (legacyLocks.audioLock || track?.voice_timeline_locked_at || stateAtLeast(track?.status, "AUDIO_LOCKED")) {
      result.push("WHEN：最终真实 AUDIO_MASTER 是绝对时间基准。");
    }
    if (stateAtLeast(project?.currentState || snapshot?.project?.current_state, "TIMELINE_LOCKED") || track?.voice_timeline_locked_at) {
      result.push("字幕 / 镜头时间：当前锁定 SUBTITLE_MASTER + Timeline Bundle。");
    }
    if (visual) result.push(`视觉语义：Visual Master ${visual.label || visual.visual_master_key || visual.visual_master_id}（锁状态以当前云端为准）。`);
    return result;
  }
  function buildVideoContract(input = {}) {
    const project = asObject(input.project);
    const snapshot = asObject(input.snapshot);
    const cloudRow = asObject(snapshot.project);
    const cloudData = asObject(cloudRow.project_data);
    const effective = Object.keys(project).length ? project : cloudData;
    const projectId = text(effective.projectId || cloudRow.project_id);
    const legacyState = text(effective.currentState || cloudRow.current_state || "UNKNOWN");
    const track = sourceTrack(snapshot);
    const visual = asArray(snapshot.visualMasters)[0] || null;

    const legacyLocks = asObject(effective.locks);
    const globalLocks = {
      projectScope: cloudRow.project_scope_locked_at || null,
      evidenceSnapshot: cloudRow.evidence_locked_at || null,
      masterScript: cloudRow.master_script_locked_at || null,
      languageScript: track?.script_locked_at || null,
      voiceTimeline: track?.voice_timeline_locked_at || null,
      visual: visual?.visual_locked_at || null,
      editPlan: visual?.edit_plan_locked_at || null,
      masterRender: visual?.master_render_locked_at || null,
    };

    const localScript = localFile(effective, "VOICE_MASTER");
    const cloudScript = track ? scopedFile(snapshot, "language_track", track.language_track_id, "VOICE_SCRIPT") : null;
    const script = localScript || cloudScript || null;
    const localAudio = localFile(effective, "AUDIO_MASTER");
    const cloudAudio = track ? scopedFile(snapshot, "language_track", track.language_track_id, "AUDIO_MASTER") : null;
    const audio = localAudio || cloudAudio || null;

    const timeline = {};
    for (const key of TIMELINE_KEYS) {
      timeline[key] = localFile(effective, key) || (track ? scopedFile(snapshot, "language_track", track.language_track_id, key) : null);
    }

    const assets = asArray(snapshot.assets).map((asset) => ({
      key: asset.asset_key || asset.asset_id,
      type: asset.asset_type || "",
      label: asset.label || "",
      path: asset.relative_path || "",
      evidenceGrade: asset.evidence_grade || "unknown",
      quality: asset.quality_status || "unreviewed",
      tags: asArray(asset.semantic_tags),
    }));
    const legacyAssets = asArray(effective.assets).map((asset) => ({
      key: asset.assetId || asset.id || "",
      type: asset.type || "",
      label: asset.description || asset.filename || "",
      path: asset.relativePath || "",
      evidenceGrade: "",
      quality: asset.status || "",
      priority: asset.priority || "",
      tags: asArray(asset.tags),
    }));
    const research = asArray(snapshot.researchSources).map((source) => ({
      key: source.source_key || source.research_source_id,
      kind: source.source_kind || "",
      url: source.source_url || "",
      version: source.version_context || "",
      stale: Boolean(source.is_stale || source.revalidation_required),
      videoObservations: asArray(asObject(source.fact_snapshot).video_analysis?.observations).length,
    }));

    const timelineReady = TIMELINE_KEYS.every((key) => fileReady(timeline[key]));
    const scriptLocked = Boolean(legacyLocks.scriptLock || globalLocks.languageScript || globalLocks.masterScript);
    const audioLocked = Boolean(legacyLocks.audioLock || track?.voice_timeline_locked_at || ["AUDIO_LOCKED", "TIMELINE_GENERATION", "TIMELINE_LOCKED", "READY"].includes(text(track?.status)));
    const timelineLocked = Boolean(
      (stateAtLeast(legacyState, "TIMELINE_LOCKED") && timelineReady)
      || (globalLocks.voiceTimeline && text(track?.alignment_status).toUpperCase() === "VALID")
    );
    const pictureLocked = Boolean(legacyLocks.pictureLock || globalLocks.masterRender);
    const videoReady = Boolean(
      fileReady(localFile(effective, "VIDEO_V1"))
      || asArray(snapshot.scopedArtifacts).some((row) => ["MASTER_VIDEO", "EXPORT_MANIFEST"].includes(text(row.file_key)) && fileReady(row))
    );

    const legacyNext = input.legacyNextAction || null;
    const globalNext = input.globalNextAction || null;
    const missing = [];
    if (legacyNext) {
      for (const key of [...asArray(legacyNext.missingInputs), ...asArray(legacyNext.missingOutputs)]) if (!missing.includes(key)) missing.push(key);
      for (const item of asArray(legacyNext.transitionErrors)) if (!missing.includes(item)) missing.push(item);
    }

    return {
      project: {
        id: projectId,
        name: effective.name || cloudRow.name || "UNKNOWN",
        game: effective.game || cloudRow.game || "",
        version: findVersion(effective, cloudData),
        topic: effective.topic || cloudRow.topic || "",
        targetPublishDate: effective.targetPublishDate || cloudRow.target_publish_date || "",
      },
      stage: { legacy: legacyState, globalNext: globalNext ? { stage: globalNext.stage, title: globalNext.title, owner: globalNext.owner, humanRequired: Boolean(globalNext.humanRequired) } : null },
      sourceOfTruth: sourceOfTruth(effective, snapshot, track, visual),
      locks: { legacy: { content: yes(legacyLocks.contentLock), script: yes(legacyLocks.scriptLock), audio: yes(legacyLocks.audioLock), picture: yes(legacyLocks.pictureLock) }, global: globalLocks },
      formalScript: {
        locked: scriptLocked,
        path: script?.path || "",
        status: script?.status || "Missing",
        content: script?.content || text(effective.voiceMaster),
        scope: script?.source || (track ? "language_track" : "project"),
        language: track?.language_code || "",
        trackKey: track?.track_key || "",
      },
      audio: {
        locked: audioLocked,
        path: audio?.path || "",
        status: audio?.status || "Missing",
        filename: audio?.filename || "",
        checksum: audio?.checksum || "",
        timingProvenance: track?.timing_provenance || asObject(audio?.metadata).timing_provenance || (legacyLocks.audioLock ? "real_audio" : ""),
      },
      timeline: {
        locked: timelineLocked,
        alignmentStatus: track?.alignment_status || (timelineReady ? "READY" : "INCOMPLETE"),
        files: timeline,
      },
      visualMaster: visual ? {
        id: visual.visual_master_id,
        key: visual.visual_master_key,
        label: visual.label || "",
        status: visual.status || "",
        visualLocked: Boolean(visual.visual_locked_at),
        editPlanLocked: Boolean(visual.edit_plan_locked_at),
        masterRenderLocked: Boolean(visual.master_render_locked_at),
        segmentCount: asArray(snapshot.visualSegments).filter((item) => item.visual_master_id === visual.visual_master_id).length,
      } : null,
      assets: [...assets, ...legacyAssets],
      assetCoverage: asArray(snapshot.assetCoverage),
      researchSources: research,
      variants: asArray(snapshot.variants).map((item) => ({ key: item.variant_key, label: item.label || "", status: item.status, market: item.market || "", format: item.format || "" })),
      publishPackages: asArray(snapshot.publishPackages).map((item) => ({ key: item.package_key, revision: item.package_revision, validation: item.validation_status, qa: item.qa_status, releaseLocked: Boolean(item.release_locked_at) })),
      missing,
      nextAction: globalNext ? globalNext.title : legacyNext?.title || "",
      readiness: { scriptLocked, audioLocked, timelineLocked, pictureLocked, videoReady, scriptAvailable: Boolean(text(script?.content || effective.voiceMaster) || fileReady(script)), audioAvailable: fileReady(audio), timelineReady },
    };
  }

  function fileLine(file, fallback) {
    if (!file) return `${fallback}: Missing`;
    const bits = [file.status || "Unknown", file.path || file.filename || ""].filter(Boolean);
    if (file.checksum) bits.push(file.checksum);
    return `${fallback}: ${bits.join(" · ")}`;
  }
  function maybeContent(title, file) {
    const content = text(file?.content);
    return content ? `### ${title}\n\n\`\`\`text\n${content}\n\`\`\`` : `### ${title}\n\n（当前云端只保存 Artifact 身份 / 状态；执行任务时请附上本地正式文件。）`;
  }
  function formatVideoContract(contract) {
    const c = contract;
    const lock = c.locks;
    const assets = c.assets.slice(0, 40);
    const evidence = c.researchSources.slice(0, 30);
    const timelineLines = TIMELINE_KEYS.map((key) => `- ${fileLine(c.timeline.files[key], key)}`).join("\n");
    return `# CURRENT VIDEO CONTRACT

## Identity
- Project: ${c.project.name}
- Project ID: ${c.project.id || "UNKNOWN"}
- Game: ${c.project.game || "未填写"}
- Version: ${c.project.version || "未填写"}
- Core Topic: ${c.project.topic || "未填写"}
- Legacy Stage: ${c.stage.legacy}
- Global Next: ${c.stage.globalNext ? `${c.stage.globalNext.stage} · ${c.stage.globalNext.title}` : "无 / 未读取云端"}
- Canonical Next Action: ${c.nextAction || "未计算"}

## Source of Truth
${c.sourceOfTruth.map((line) => `- ${line}`).join("\n")}

## Human Locks
- Legacy Content: ${lock.legacy.content ? "LOCKED" : "OPEN"}
- Legacy Script: ${lock.legacy.script ? "LOCKED" : "OPEN"}
- Legacy Audio: ${lock.legacy.audio ? "LOCKED" : "OPEN"}
- Legacy Picture: ${lock.legacy.picture ? "LOCKED" : "OPEN"}
- Project Scope: ${lock.global.projectScope ? "LOCKED" : "OPEN / unavailable"}
- Evidence Snapshot: ${lock.global.evidenceSnapshot ? "LOCKED" : "OPEN / unavailable"}
- Master Script: ${lock.global.masterScript ? "LOCKED" : "OPEN / unavailable"}
- Language Script: ${lock.global.languageScript ? "LOCKED" : "OPEN / unavailable"}
- Voice / Timeline: ${lock.global.voiceTimeline ? "LOCKED" : "OPEN / unavailable"}
- Visual Master: ${lock.global.visual ? "LOCKED" : "OPEN / unavailable"}
- Edit Plan: ${lock.global.editPlan ? "LOCKED" : "OPEN / unavailable"}
- Master Render: ${lock.global.masterRender ? "LOCKED" : "OPEN / unavailable"}

## Formal Script
- Status: ${c.formalScript.status}
- Locked: ${c.formalScript.locked ? "YES" : "NO"}
- Scope: ${c.formalScript.scope}
- Language: ${c.formalScript.language || "project default"}
- Path: ${c.formalScript.path || "未登记"}

${c.formalScript.content ? `\`\`\`text\n${c.formalScript.content}\n\`\`\`` : "（正式脚本文本未在浏览器 Project snapshot 中；执行脚本类任务时请附上本地正式稿。）"}

## Final Audio
- Locked: ${c.audio.locked ? "YES" : "NO"}
- ${fileLine(c.audio, "AUDIO_MASTER")}
- Timing Provenance: ${c.audio.timingProvenance || "未确认"}

## Subtitle / Timeline
- Timeline Lock: ${c.timeline.locked ? "LOCKED" : "OPEN"}
- Alignment: ${c.timeline.alignmentStatus}
${timelineLines}

${maybeContent("SUBTITLE_MASTER", c.timeline.files.SUBTITLE_MASTER)}

${maybeContent("TIMELINE_SENTENCE", c.timeline.files.TIMELINE_SENTENCE)}

## Visual Master
${c.visualMaster ? `- ${c.visualMaster.label || c.visualMaster.key} · ${c.visualMaster.status || "UNKNOWN"}\n- Visual Lock: ${c.visualMaster.visualLocked ? "LOCKED" : "OPEN"} · Edit Plan: ${c.visualMaster.editPlanLocked ? "LOCKED" : "OPEN"} · Master Render: ${c.visualMaster.masterRenderLocked ? "LOCKED" : "OPEN"}\n- Semantic Segments: ${c.visualMaster.segmentCount}` : "（当前没有 Visual Master）"}

## Available Assets
${assets.length ? assets.map((asset) => `- ${asset.key || "asset"} · ${asset.type || "Other"} · ${asset.label || "未命名"} · ${asset.quality || ""}${asset.evidenceGrade ? ` · evidence=${asset.evidenceGrade}` : ""}`).join("\n") : "- 尚无已登记素材"}

## Research / Evidence
${evidence.length ? evidence.map((source) => `- ${source.key} · ${source.kind || "source"} · version=${source.version || "n/a"} · ${source.stale ? "STALE / REVALIDATE" : "current"} · video observations=${source.videoObservations}`).join("\n") : "- 尚无 Global Research Source；Legacy RESEARCH 仍以当前 Project 文件为准"}

## Current Missing / Blockers
${c.missing.length ? c.missing.map((item) => `- ${item}`).join("\n") : "- None reported by current Legacy Next Action"}
`;
  }

  function taskBlockers(taskKey, c) {
    const r = c.readiness;
    const blockers = [];
    if (taskKey === "PIXEL_PACKAGE") {
      if (!r.scriptLocked) blockers.push("先完成 Script Lock / Master Script Lock");
      if (!r.audioLocked) blockers.push("先完成最终 AUDIO_MASTER 与 Audio Lock");
      if (!r.timelineLocked) blockers.push("先完成 Timeline Lock / Voice-Timeline Lock");
      if (!r.timelineReady) blockers.push("当前 Timeline Bundle 不完整");
      if (r.pictureLocked) blockers.push("画面已锁定；需要人工 Reopen Picture / Master Render Gate 后才能新增像素动画");
    } else if (taskKey === "SRT_ALIGNMENT") {
      if (!r.scriptLocked) blockers.push("先完成 Script Lock / Master Script Lock");
      if (!r.audioLocked) blockers.push("先完成最终 AUDIO_MASTER 与 Audio Lock");
      if (!r.audioAvailable) blockers.push("缺少已登记的最终真实 AUDIO_MASTER");
    } else if (taskKey === "EDIT_BLUEPRINT") {
      if (!r.timelineLocked) blockers.push("先完成 Timeline Lock / Voice-Timeline Lock");
      if (!r.timelineReady) blockers.push("当前 Timeline Bundle 不完整");
      if (r.pictureLocked) blockers.push("画面已锁定；需人工 Reopen 后才能重做剪辑蓝图");
    } else if (["SCRIPT_REVIEW", "NATURALNESS_REVIEW"].includes(taskKey)) {
      if (!r.scriptAvailable) blockers.push("缺少当前正式脚本 / VOICE_MASTER / VOICE_SCRIPT");
    } else if (taskKey === "PUBLISH_PACKAGE") {
      if (!r.pictureLocked) blockers.push("先完成 Picture Lock / Master Render Lock");
      if (!r.videoReady) blockers.push("缺少当前锁定成片 / Master Video");
    } else if (taskKey === "OFFICIAL_VIDEO_EVIDENCE") {
      if (c.locks.global.evidenceSnapshot || c.locks.global.masterScript || stateAtLeast(c.stage.legacy, "CONTENT_LOCKED")) {
        blockers.push("Evidence / Content 已锁定；如确需补入新官方视频证据，先由人明确 Reopen 对应 Evidence / Content Gate");
      }
    }
    return blockers;
  }

  function requiredInputs(taskKey, c) {
    const map = {
      PIXEL_PACKAGE: [
        "当前锁定 Script / Master Script（理解机制叙事）",
        "当前 SUBTITLE_MASTER + Timeline（确定每段发生时间）",
        "当前 Visual Master / Visual Style（如已有）",
        "官方角色参考图（涉及角色像素形象时，用于锁定身份）",
        "需要证明机制的真实游戏证据素材；缺失时必须明确标 Missing",
      ],
      SRT_ALIGNMENT: [
        "最终真实 AUDIO_MASTER（必须实际附上音频文件；云端只保存身份 / 元数据）",
        "已锁定 Script / Master Script / VOICE_MASTER（决定 WHAT）",
      ],
      EDIT_BLUEPRINT: [
        "锁定 SUBTITLE_MASTER + Timeline Bundle",
        "PRE_ASSET_GUIDE / Visual Master（如已有）",
        "当前 Asset Index / 已有素材与缺失清单",
      ],
      SCRIPT_REVIEW: ["当前正式脚本", "当前 Research / Evidence 与已锁定结论"],
      NATURALNESS_REVIEW: ["当前正式脚本", "用户指定的语言 / 口播风格约束"],
      PUBLISH_PACKAGE: ["锁定成片 / Master Video", "目标 Variant / Platform / Channel / Market", "当前锁定脚本与最终成片实际内容"],
      OFFICIAL_VIDEO_EVIDENCE: ["官方直播 / PV / 角色展示 / 实机演示的真实视频或可访问视频", "项目指定游戏 / 版本 / 区服上下文"],
    };
    return map[taskKey] || [];
  }

  function forbidden(taskKey, c) {
    const common = [
      "不得自动推进 Project / child workflow state，不得设置 / 撤销 Human Lock。",
      "不得修改未 Reopen 的锁定内容。",
      "不得编造缺失事实、素材、游戏 UI、角色身份、时间戳或发布结果。",
      "Audience-facing 输出不得出现 LOCK、TODO、AI、Codex、内部审核、Review Note、修改记录、状态机或文件路径等制作过程信息。",
    ];
    if (["SCRIPT_REVIEW", "NATURALNESS_REVIEW"].includes(taskKey) && c.formalScript.locked) {
      common.push("当前脚本已锁定：只能 Review / 提局部 Patch；不得直接重写正式稿。");
    }
    if (taskKey === "SRT_ALIGNMENT") common.push("不得按文字长度 / 字数 / 平均语速推算或均分字幕时间。");
    return common;
  }

  const VIDEO_EVIDENCE_TEMPLATE = Object.freeze({
    fact_snapshot: {
      video_analysis: {
        source_kind: "official_video",
        analyzed_at: "<ISO-8601>",
        observations: [{
          start_ms: 0,
          end_ms: 0,
          timestamp: "00:00.000-00:00.000",
          spoken: "官方在这一段说了什么",
          visual: "画面实际发生什么",
          ui_state_change: "UI / 资源 / 状态 / Buff / Debuff / 技能触发有什么变化",
          confirmed_claim: "这一段可以确认什么；不能确认则明确写未知",
          evidence_grade: "A_OFFICIAL_AV",
        }],
      },
    },
  });

  function buildAiTaskPrompt(input = {}) {
    const task = resolveTask(input.command);
    const contract = input.contract || buildVideoContract(input);
    if (!task) {
      return { recognized: false, ready: false, task: null, contract, blockers: ["无法识别短指令；请使用已支持的稳定任务别名。"], prompt: "" };
    }
    const blockers = taskBlockers(task.key, contract);
    const ready = blockers.length === 0;
    const rules = TASK_RULES[task.key] || [];
    const outputs = TASK_OUTPUTS[task.key] || [];
    const acceptance = TASK_ACCEPTANCE[task.key] || [];
    const evidenceTemplate = task.key === "OFFICIAL_VIDEO_EVIDENCE"
      ? `\n## Existing Evidence Persistence Shape\n把机器可读结果组织为以下结构，供现有 creator_research_sources.fact_snapshot 直接保存：\n\n\`\`\`json\n${JSON.stringify(VIDEO_EVIDENCE_TEMPLATE, null, 2)}\n\`\`\`\n`
      : "";
    const prompt = `# GUCC AI TASK · ${task.label}

## Recognition
- User Command: ${text(input.command)}
- Task: ${task.title}
- Execution Gate: ${ready ? "READY" : "BLOCKED"}

${ready ? "" : `## BLOCKED — DO NOT EXECUTE\n${blockers.map((item) => `- ${item}`).join("\n")}\n\n不得为了满足用户短指令自动跨阶段。补齐 / 人工 Reopen 后重新生成 Prompt。\n`}
## Current Video Contract
${formatVideoContract(contract)}

## Canonical Creator Constitution
${text(input.constitutionText) || "（Constitution 未载入；Fail Closed，不应执行正式任务。）"}

## Task-specific Rules
${rules.map((rule) => `- ${rule}`).join("\n")}

## Required Inputs
${requiredInputs(task.key, contract).map((item) => `- ${item}`).join("\n")}

## Forbidden
${forbidden(task.key, contract).map((item) => `- ${item}`).join("\n")}

## Required Output
${outputs.map((item) => `- ${item}`).join("\n")}

## Acceptance Criteria
${acceptance.map((item) => `- ${item}`).join("\n")}
${evidenceTemplate}
## Handoff
- 只完成本任务，不主动进入后续阶段。
- 列出实际使用的 Source of Truth、实际输入、输出、缺口与需要人工决定的事项。
- 如果正式文件未随 Prompt 一起提供，不得用旧 Chat 内容或猜测代替；明确要求用户附上当前正式文件。
`;
    return { recognized: true, ready: ready && Boolean(text(input.constitutionText)), task, contract, blockers: text(input.constitutionText) ? blockers : [...blockers, "Creator Constitution 未载入"], prompt };
  }

  function buildStagePrompt(input = {}) {
    const contract = input.contract || buildVideoContract(input);
    const constitution = text(input.constitutionText);
    return `# GUCC CURRENT STAGE HANDOFF

## Current Video Contract
${formatVideoContract(contract)}

## Canonical Creator Constitution
${constitution || "（Creator Constitution 未载入。正式执行前必须先载入长期规则。）"}

## Current Stage Direction
${text(input.legacyStagePrompt) || "按当前 Canonical Next Action 执行，不跨阶段。"}

## Execution Contract
- 先服从 Video Contract 的 Source of Truth、Lock 与缺口，再执行当前阶段任务。
- 最新正式 Project / Supabase 状态优先于旧 Chat。
- 缺失必要输入时 Fail Closed，不得自动推进。
- 修改已完成内容默认局部修改；已锁定内容必须先由人 Reopen。
- 完成后只交付当前阶段要求的结果，不自动点击 Human Gate 或 Final Publish。
`;
  }

  return Object.freeze({
    TASKS, TASK_RULES, TASK_OUTPUTS, TASK_ACCEPTANCE, VIDEO_EVIDENCE_TEMPLATE, PROJECT_FLOW, TIMELINE_KEYS,
    resolveTask, buildVideoContract, formatVideoContract, taskBlockers, requiredInputs, buildAiTaskPrompt, buildStagePrompt,
  });
});
