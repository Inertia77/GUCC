"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const E = require(path.join(root, "apps", "video-workspace", "production-system", "engine.js"));
const AI = require(path.join(root, "assets", "creator-ai-task-core.js"));
const constitution = fs.readFileSync(path.join(root, "docs", "ai-video-production", "CREATOR_CONSTITUTION.md"), "utf8");

function readyFile(project, key, { content = "", name = "" } = {}) {
  project.files[key] ||= { key, status: "Missing", relativePath: E.FILE_DEFINITIONS[key]?.path || key, filename: E.FILE_DEFINITIONS[key]?.filename || key };
  project.files[key].status = "Ready";
  project.files[key].content = content;
  if (name) project.files[key].filename = name;
}
function projectAt(state) {
  const project = E.createProject({
    projectId: "AI_TASK_TEST",
    name: "绝区零｜测试角色复刻攻略",
    game: "绝区零",
    topic: "解释核心机制、配队与抽取价值",
    notes: "版本：3.x\n只用于 AI Task regression",
  });
  project.currentState = state;
  project.integration = { workspace: { snapshot: { version: "3.x" } } };
  return project;
}
function context(project, snapshot = {}) {
  return {
    project,
    snapshot,
    legacyNextAction: E.nextAction(project),
    globalNextAction: snapshot.project ? { stage: "TEST", title: "测试 Global 下一步", owner: "GUCC", humanRequired: false } : null,
  };
}

assert.equal(AI.resolveTask("制作像素包").key, "PIXEL_PACKAGE");
assert.equal(AI.resolveTask("生成 SRT").key, "SRT_ALIGNMENT");
assert.equal(AI.resolveTask("做剪辑蓝图").key, "EDIT_BLUEPRINT");
assert.equal(AI.resolveTask("审核稿件").key, "SCRIPT_REVIEW");
assert.equal(AI.resolveTask("去 AI 味").key, "NATURALNESS_REVIEW");
assert.equal(AI.resolveTask("做发布包").key, "PUBLISH_PACKAGE");
assert.equal(AI.resolveTask("解析 PV").key, "OFFICIAL_VIDEO_EVIDENCE");
assert.equal(AI.resolveTask("做个差不多的动画"), null, "Unknown commands must not be guessed by fuzzy NLP");

for (const marker of [
  "统一长期规则来源",
  "不得为了“顺手完成”擅自跨阶段",
  "Codex 默认是**执行者，不是导演**",
  "最终真实 `AUDIO_MASTER` 是绝对主时间轴",
  "绝对禁止按文稿长度",
  "官方角色参考图用于**锁定角色身份",
  "默认是**局部修改**",
  "不得出现内部制作信息",
  "声音 + 画面 + UI / 状态变化 + 时间戳",
]) assert.ok(constitution.includes(marker), "Creator Constitution missing canonical rule: " + marker);

// A. Timeline Lock + 制作像素包 => complete executable prompt.
{
  const project = projectAt("TIMELINE_LOCKED");
  project.locks.scriptLock = true;
  project.locks.audioLock = true;
  readyFile(project, "VOICE_MASTER", { content: "锁定口播：角色触发技能后获得资源，资源满后进入强化状态。" });
  project.voiceMaster = project.files.VOICE_MASTER.content;
  readyFile(project, "AUDIO_MASTER", { name: "AUDIO_MASTER.wav" });
  readyFile(project, "SUBTITLE_MASTER", { content: "1\n00:00:00,000 --> 00:00:02,000\n角色触发技能。\n" });
  readyFile(project, "TIMELINE_SENTENCE", { content: "start_ms,end_ms,text\n0,2000,角色触发技能\n" });
  readyFile(project, "TRANSCRIPT_ALIGNED", { content: "{\"segments\":[]}" });
  readyFile(project, "ALIGNMENT_REPORT", { content: "# ALIGNMENT REPORT\nVALID\n" });

  const contract = AI.buildVideoContract(context(project));
  const result = AI.buildAiTaskPrompt({ command: "制作像素包", contract, constitutionText: constitution });
  assert.equal(result.recognized, true);
  assert.equal(result.ready, true, result.blockers.join(" / "));
  assert.equal(result.task.label, "PIXEL PACKAGE");
  assert.match(result.prompt, /关闭声音时/);
  assert.match(result.prompt, /静态 PPT/);
  assert.match(result.prompt, /Buff \/ Debuff/);
  assert.match(result.prompt, /不得用 AI 假游戏画面替代/);
  assert.match(result.prompt, /官方角色参考图用于锁定角色身份/);
  assert.match(result.prompt, /Audience-facing/);
  assert.match(result.prompt, /CURRENT VIDEO CONTRACT/);
  assert.match(result.prompt, /统一长期规则来源/);
}

// B. Audio Lock + 生成 SRT => WHEN comes from final real audio; WHAT comes from locked text.
{
  const project = projectAt("AUDIO_LOCKED");
  project.locks.scriptLock = true;
  project.locks.audioLock = true;
  readyFile(project, "VOICE_MASTER", { content: "克拉蕾先触发技能，再进入强化状态。" });
  project.voiceMaster = project.files.VOICE_MASTER.content;
  readyFile(project, "AUDIO_MASTER", { name: "AUDIO_MASTER.wav" });

  const contract = AI.buildVideoContract(context(project));
  const result = AI.buildAiTaskPrompt({ command: "生成 SRT", contract, constitutionText: constitution });
  assert.equal(result.ready, true, result.blockers.join(" / "));
  assert.match(result.prompt, /WHEN = 最终真实 AUDIO_MASTER/);
  assert.match(result.prompt, /WHAT = 已锁定 Script \/ Master Script \/ VOICE_MASTER/);
  assert.match(result.prompt, /绝对禁止按文字长度、字数、平均语速或句长平均分配 \/ 猜测时间/);
  assert.match(result.prompt, /真实朗读与锁定文本不一致时，时间服从真实音频/);
}

// C. Script stage + 制作像素包 => blocked and lists real prerequisites; no mutation.
{
  const project = projectAt("SCRIPTING");
  readyFile(project, "VOICE_MASTER", { content: "仍在修改中的稿件。" });
  project.voiceMaster = project.files.VOICE_MASTER.content;
  const before = JSON.stringify(project);
  const contract = AI.buildVideoContract(context(project));
  const result = AI.buildAiTaskPrompt({ command: "制作像素包", contract, constitutionText: constitution });
  assert.equal(result.ready, false);
  assert.match(result.blockers.join("\n"), /Script Lock/);
  assert.match(result.blockers.join("\n"), /Audio Lock/);
  assert.match(result.blockers.join("\n"), /Timeline Lock/);
  assert.match(result.prompt, /BLOCKED — DO NOT EXECUTE/);
  assert.equal(JSON.stringify(project), before, "Prompt generation must never mutate Project state or locks");
}

// Official videos stay inside the existing Evidence model instead of creating a new workflow/table.
{
  const project = projectAt("RESEARCHING");
  const result = AI.buildAiTaskPrompt({ command: "解析官方视频", ...context(project), constitutionText: constitution });
  assert.equal(result.ready, true, result.blockers.join(" / "));
  assert.match(result.prompt, /声音 \+ 画面 \+ UI \/ 状态变化 \+ 时间戳/);
  assert.match(result.prompt, /creator_research_sources\.fact_snapshot/);
  assert.match(result.prompt, /"spoken"/);
  assert.match(result.prompt, /"visual"/);
  assert.match(result.prompt, /"ui_state_change"/);
  assert.match(result.prompt, /"confirmed_claim"/);
  assert.match(result.prompt, /"evidence_grade"/);
}

// Video Contract is derived from existing Project + getProject snapshot data.
{
  const project = projectAt("TIMELINE_LOCKED");
  project.locks.scriptLock = true;
  project.locks.audioLock = true;
  const snapshot = {
    project: { project_id: project.projectId, name: project.name, master_script_locked_at: "2026-09-25T00:00:00Z" },
    languageTracks: [{ language_track_id: "track-source", track_key: "ZH_SOURCE", language_code: "zh-CN", is_source: true, status: "TIMELINE_LOCKED", script_locked_at: "x", voice_timeline_locked_at: "x", alignment_status: "VALID", timing_provenance: "real_audio" }],
    scopedArtifacts: ["AUDIO_MASTER", "SUBTITLE_MASTER", "TIMELINE_SENTENCE", "TRANSCRIPT_ALIGNED", "ALIGNMENT_REPORT"].map((key) => ({ project_id: project.projectId, artifact_scope_type: "language_track", artifact_scope_id: "track-source", file_key: key, status: "Ready", relative_path: "scope/" + key })),
    visualMasters: [{ visual_master_id: "vm-1", visual_master_key: "VM_MAIN", label: "主视觉母版", status: "READY", visual_locked_at: "x", edit_plan_locked_at: null, master_render_locked_at: null }],
    visualSegments: [{ visual_master_id: "vm-1", semantic_anchor: "mechanic-1" }],
    assets: [{ asset_id: "asset-1", asset_key: "OFFICIAL_DEMO", asset_type: "Video", label: "官方角色展示", evidence_grade: "A", quality_status: "reviewed", semantic_tags: ["official"] }],
    researchSources: [{ research_source_id: "source-1", source_key: "OFFICIAL_PV", source_kind: "official_video", version_context: "3.x", fact_snapshot: { video_analysis: { observations: [{ timestamp: "00:01", spoken: "x", visual: "y" }] } } }],
  };
  const contract = AI.buildVideoContract(context(project, snapshot));
  assert.equal(contract.project.version, "3.x");
  assert.equal(contract.formalScript.trackKey, "ZH_SOURCE");
  assert.equal(contract.visualMaster.key, "VM_MAIN");
  assert.equal(contract.assets[0].key, "OFFICIAL_DEMO");
  assert.equal(contract.researchSources[0].videoObservations, 1);
  assert.match(AI.formatVideoContract(contract), /主视觉母版/);
}

// Enriched Stage Prompt uses the same canonical Constitution and current Video Contract.
{
  const project = projectAt("PLANNING");
  const contract = AI.buildVideoContract(context(project));
  const prompt = AI.buildStagePrompt({ contract, constitutionText: constitution, legacyStagePrompt: E.generatePrompt(project) });
  assert.match(prompt, /Current Video Contract/);
  assert.match(prompt, /Canonical Creator Constitution/);
  assert.match(prompt, /统一长期规则来源/);
  assert.match(prompt, /Current Stage Direction/);
}

const ui = fs.readFileSync(path.join(root, "assets", "creator-ai-task-ui.mjs"), "utf8");
const html = fs.readFileSync(path.join(root, "apps", "video-workspace", "production-system", "index.html"), "utf8");
assert.match(ui, /action: "getProject"/, "AI Task UI must use the existing read-only getProject snapshot");
assert.doesNotMatch(ui, /action:\s*"(?:saveProject|humanLock|savePublication|saveLanguageTrack|saveVariant|savePublishPackage)"/, "AI Task UI must not add a write path");
assert.match(ui, /复制当前 AI Prompt/);
assert.match(ui, /短指令 → 当前项目执行 Prompt/);
assert.ok(html.includes("creator-ai-task-core.js?v=1"));
assert.ok(html.includes("creator-ai-task-ui.mjs?v=1"));

console.log("Creator AI Task Context contract tests passed: aliases + Video Contract + A/B/C gates + Evidence video analysis.");
