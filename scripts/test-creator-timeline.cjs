"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const T = require("../assets/creator-timeline-contract.js");
const E = require("../apps/video-workspace/production-system/engine.js");

const SAMPLE_SRT = `1\n00:00:00,000 --> 00:00:01,500\n你好，世界。\n\n2\n00:00:01,700 --> 00:00:03,000\n这是测试。\n`;

function testParseAndNormalize() {
  const result = T.inspectSrt(SAMPLE_SRT);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.stats.cueCount, 2);
  assert.equal(result.stats.durationMs, 3000);
  assert.equal(result.cues[0].startMs, 0);
  assert.equal(result.cues[1].endMs, 3000);
  assert.equal(T.normalizeSrt(result.cues), SAMPLE_SRT);

  const dotted = T.inspectSrt("7\n00:00:00.250 --> 00:00:01.000\nA\n");
  assert.equal(dotted.errors.length, 0);
  assert.equal(dotted.cues[0].startMs, 250);
  assert.match(T.normalizeSrt(dotted.cues), /^1\n00:00:00,250/);
}

function testValidationSafety() {
  const reversed = T.inspectSrt("1\n00:00:02,000 --> 00:00:01,000\n坏时间\n");
  assert(reversed.errors.some((item) => item.includes("结束时间")));

  const overlap = T.inspectSrt("1\n00:00:00,000 --> 00:00:02,000\nA\n\n2\n00:00:01,900 --> 00:00:03,000\nB\n");
  assert.equal(overlap.errors.length, 0, "overlap is a warning because intentional subtitle overlap can exist");
  assert(overlap.warnings.some((item) => item.includes("重叠")));

  assert.throws(() => T.buildTimelineArtifacts({ srtText: reversed.cues.length ? T.normalizeSrt(reversed.cues) : "" }), /校验失败/);
}

function testDerivedArtifactsAndScriptComparison() {
  const input = {
    projectId: "x7k29a",
    projectName: "Timeline Test",
    voiceMaster: "# 第一章\n你好，世界。[AV:UI]这是测试。",
    srtText: SAMPLE_SRT,
  };
  const built = T.buildTimelineArtifacts(input);
  const again = T.buildTimelineArtifacts(input);
  assert.equal(built.validation.comparison.status, "MATCH");
  assert.deepEqual(Object.keys(built.artifacts), E.TIMELINE_BUNDLE_FILES);
  assert.deepEqual(again.artifacts, built.artifacts, "same SRT + VOICE_MASTER must produce byte-stable timeline artifacts");
  assert.match(built.artifacts.TIMELINE_SENTENCE, /START_MS,END_MS,DURATION_MS/);
  assert.match(built.artifacts.TRANSCRIPT_ALIGNED, /"timingSource": "SUBTITLE_MASTER"/);
  assert.doesNotMatch(built.artifacts.TRANSCRIPT_ALIGNED, /generatedAt/, "generation timestamps belong in Project/File metadata, not deterministic artifacts");
  assert.match(built.artifacts.ALIGNMENT_REPORT, /时间码只来自 SUBTITLE_MASTER\.srt/);
  assert.doesNotMatch(built.artifacts.ALIGNMENT_REPORT, /VOICE_MASTER.*时间码来源/);

  const mismatch = T.buildTimelineArtifacts({ voiceMaster: "原稿甲乙丙", srtText: "1\n00:00:00,000 --> 00:00:01,000\n实际甲乙丁\n" });
  assert.equal(mismatch.validation.comparison.status, "REVIEW");
  assert.match(mismatch.artifacts.ALIGNMENT_REPORT, /需要人工确认差异/);
}

function readyTimelineFile(project, key, content = "ready") {
  E.registerFile(project, key, { name: E.FILE_DEFINITIONS[key].filename, status: "Ready", content });
}

function audioLockedProject(id = "timeline_gate") {
  const project = E.createProject({ projectId: id, name: "Timeline Gate" });
  project.currentState = "AUDIO_LOCKED";
  project.locks.audioLock = true;
  E.registerFile(project, "AUDIO_MASTER", { name: "AUDIO_MASTER.wav", status: "Ready", content: "" });
  return project;
}

function testBareEngineTimelineGate() {
  const project = audioLockedProject();
  assert.deepEqual(E.nextAction(project).outputKeys, E.TIMELINE_BUNDLE_FILES);

  readyTimelineFile(project, "SUBTITLE_MASTER", SAMPLE_SRT);
  assert.equal(project.currentState, "TIMELINE_GENERATION", "SRT starts Timeline Generation but cannot lock an incomplete bundle");
  assert.equal(E.timelineBundleReady(project), false);
  assert.equal(E.nextAction(project).canAdvance, false);
  assert.throws(() => E.transition(project, "TIMELINE_LOCKED"), /TIMELINE_SENTENCE\.csv|TRANSCRIPT_ALIGNED\.json|ALIGNMENT_REPORT\.md/);

  readyTimelineFile(project, "TIMELINE_SENTENCE", "INDEX,START,END\r\n");
  assert.equal(project.currentState, "TIMELINE_GENERATION");
  readyTimelineFile(project, "TRANSCRIPT_ALIGNED", "{}\n");
  assert.equal(project.currentState, "TIMELINE_GENERATION");
  readyTimelineFile(project, "ALIGNMENT_REPORT", "# report\n");
  assert.equal(project.currentState, "TIMELINE_LOCKED", "bare engine reconcile locks only after all four artifacts are ready");
  assert.equal(E.timelineBundleReady(project), true);
}

function testStoryboardRequiresCompleteBundle() {
  const incomplete = audioLockedProject("storyboard_incomplete");
  readyTimelineFile(incomplete, "SUBTITLE_MASTER", SAMPLE_SRT);
  incomplete.currentState = "TIMELINE_LOCKED"; // simulate a corrupt external raw object bypassing transition
  const errors = E.gateForState(incomplete, "STORYBOARDING");
  assert(errors.some((item) => /TIMELINE_SENTENCE|TRANSCRIPT_ALIGNED|ALIGNMENT_REPORT/.test(item)));
  assert.throws(() => E.transition(incomplete, "STORYBOARDING"), /TIMELINE_SENTENCE|TRANSCRIPT_ALIGNED|ALIGNMENT_REPORT/);
}

function rawTimelineProject(state, complete = false) {
  const project = audioLockedProject(`raw_${state}_${complete ? "complete" : "incomplete"}`);
  project.currentState = state;
  project.files.SUBTITLE_MASTER = { ...project.files.SUBTITLE_MASTER, status: "Ready", content: SAMPLE_SRT };
  if (complete) {
    project.files.TIMELINE_SENTENCE = { ...project.files.TIMELINE_SENTENCE, status: "Ready", content: "INDEX,START,END\r\n" };
    project.files.TRANSCRIPT_ALIGNED = { ...project.files.TRANSCRIPT_ALIGNED, status: "Ready", content: "{}\n" };
    project.files.ALIGNMENT_REPORT = { ...project.files.ALIGNMENT_REPORT, status: "Ready", content: "# report\n" };
  }
  return JSON.parse(JSON.stringify(project));
}

function testNormalizeWorkflowInvariantRecovery() {
  for (const source of ["project_json", "system_json", "directory_project_data", "local_store", "cloud_pull"]) {
    const raw = rawTimelineProject("TIMELINE_LOCKED", false);
    assert.equal(E.validateWorkflowInvariants(raw).valid, false, `${source}: raw invalid lock must be detected`);
    const normalized = E.normalizeProject(raw, { source });
    assert.equal(normalized.currentState, "TIMELINE_GENERATION", `${source}: incomplete locked import must reopen Timeline Generation`);
    assert.equal(normalized.workflowRecovery?.kind, "TIMELINE_BUNDLE_INCOMPLETE");
    assert.equal(normalized.workflowRecovery?.source, source);
    assert.deepEqual(normalized.workflowRecovery?.missing, ["TIMELINE_SENTENCE", "TRANSCRIPT_ALIGNED", "ALIGNMENT_REPORT"]);
    assert.equal(E.validateWorkflowInvariants(normalized).valid, true, `${source}: recovered project must no longer masquerade as a valid Timeline Lock`);
  }

  const completeRaw = rawTimelineProject("TIMELINE_LOCKED", true);
  const complete = E.normalizeProject(completeRaw, { source: "project_json" });
  assert.equal(complete.currentState, "TIMELINE_LOCKED");
  assert.equal(complete.workflowRecovery, undefined, "existing complete Timeline project must remain unchanged");
  assert.equal(E.validateWorkflowInvariants(complete).valid, true);

  const terminalLegacy = rawTimelineProject("PUBLISHED", false);
  const terminal = E.normalizeProject(terminalLegacy, { source: "legacy_terminal" });
  assert.equal(terminal.currentState, "PUBLISHED", "terminal published history is not reopened by a nonterminal production invariant");
}

function testHumanLocksUnchanged() {
  const project = E.createProject({ name: "Human Lock Regression" });
  assert.throws(() => E.setLock(project, "audioLock", true), /音频制作.*阶段前|AUDIO_MASTER/);
  project.currentState = "AUDIO_PRODUCTION";
  assert.throws(() => E.setLock(project, "audioLock", true), /AUDIO_MASTER/);
  E.registerFile(project, "AUDIO_MASTER", { name: "AUDIO_MASTER.wav", status: "Ready", content: "" });
  E.setLock(project, "audioLock", true);
  assert.equal(project.locks.audioLock, true);
  assert.throws(() => E.setLock(project, "musicLock", true), /Music Lock 已取消/);
}

function testBrowserAndPageContract() {
  const browser = fs.readFileSync(path.join(__dirname, "..", "assets", "creator-timeline-browser.js"), "utf8");
  const index = fs.readFileSync(path.join(__dirname, "..", "apps", "video-workspace", "production-system", "index.html"), "utf8");
  const contractPos = index.indexOf("creator-timeline-contract.js");
  const enginePos = index.indexOf("./engine.js");
  const appPos = index.indexOf("./app.js");
  const browserPos = index.indexOf("creator-timeline-browser.js");
  assert(contractPos >= 0 && enginePos > contractPos && appPos > enginePos && browserPos > appPos, "timeline contract, core engine, app and browser must load in stable order");
  assert(!index.includes("creator-timeline-engine-guard.js"), "long-term timeline monkey patch must be removed");
  assert(!fs.existsSync(path.join(__dirname, "..", "assets", "creator-timeline-engine-guard.js")), "obsolete guard file must be deleted");
  assert(browser.includes("E.TIMELINE_BUNDLE_FILES"), "browser must reuse the core Timeline Bundle contract");
  assert(browser.includes("E.timelineBundleReady(project)"), "browser readiness must delegate to the core engine");
  assert(!browser.includes("T.ARTIFACT_KEYS"), "browser must not own a duplicate four-file list");
  assert(browser.includes('new Set(["AUDIO_LOCKED", "TIMELINE_GENERATION"])'), "timeline rewrite is only allowed before Timeline Lock");
  assert(browser.includes("TIMELINE_BUNDLE_GENERATED"));
  assert(!browser.includes("fetch("), "Phase 2C.2 browser integration must not add a network upload or AI API path");
  assert(!browser.includes("XMLHttpRequest"));
  assert(!browser.includes("MediaRecorder"), "Phase 2C.2 must not smuggle in an ASR/audio capture runtime");
}

function testHandoffBoundary() {
  const prompt = T.timelineHandoffPrompt({ projectId: "x7k29a", name: "测试项目" });
  assert.match(prompt, /AUDIO_MASTER\.wav：唯一真实时间轴/);
  assert.match(prompt, /只需要交付 SUBTITLE_MASTER\.srt/);
  assert.match(prompt, /无法可靠读取音频.*BLOCKED/);
  assert.match(prompt, /不得估算时间码/);
}

testParseAndNormalize();
testValidationSafety();
testDerivedArtifactsAndScriptComparison();
testBareEngineTimelineGate();
testStoryboardRequiresCompleteBundle();
testNormalizeWorkflowInvariantRecovery();
testHumanLocksUnchanged();
testBrowserAndPageContract();
testHandoffBoundary();
console.log("Creator OS Phase 2C.2 core timeline tests passed: bare-engine invariant, deterministic artifacts, import recovery, lock regression and browser boundary.");
