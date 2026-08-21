"use strict";

const assert = require("node:assert/strict");
const E = require("../apps/video-workspace/production-system/engine.js");

function ready(project, key, name, content = "ready") {
  E.registerFile(project, key, { name: name || E.FILE_DEFINITIONS[key].path.split("/").pop(), content, size: content.length, status: "Ready" });
}

function testAFullGuide() {
  const project = E.createProject({ name: "A Case", projectType: "A_FULL_GUIDE" });
  assert(!E.flowFor(project.projectType).includes("MUSIC_DRAFT"));
  assert(!project.files.MUSIC_MASTER);
  assert.throws(() => E.setLock(project, "scriptLock", true), /脚本制作.*阶段前/);
  E.transition(project, "PLANNING");
  E.transition(project, "RESEARCHING");
  E.transition(project, "RESEARCH_LOCKED");
  ready(project, "CONTENT_LOCK", "CONTENT_LOCK.md", "结论与章节已锁定");
  E.setLock(project, "contentLock", true);
  E.transition(project, "CONTENT_LOCKED");
  E.transition(project, "SCRIPTING");
  assert.throws(() => E.setLock(project, "scriptLock", true), /VOICE_MASTER/);
  ready(project, "VOICE_MASTER", "VOICE_MASTER.md", "第一段。[AV:UI]第二段。[AV:NUMBER]");
  E.setLock(project, "scriptLock", true);
  E.transition(project, "SCRIPT_LOCKED");
  E.transition(project, "PRE_ASSET_PREPARATION");
  E.transition(project, "AUDIO_PRODUCTION");
  assert.throws(() => E.transition(project, "AUDIO_LOCKED"), /Audio Lock|AUDIO_MASTER/);
  ready(project, "AUDIO_MASTER", "AUDIO_MASTER.wav", "");
  E.setLock(project, "audioLock", true);
  E.transition(project, "AUDIO_LOCKED");
  assert.equal(E.nextState(project), "TIMELINE_GENERATION");
  assert.match(E.generatePrompt(project), /实际 AUDIO_MASTER 为唯一时间源/);
  E.transition(project, "TIMELINE_GENERATION");
  ready(project, "SUBTITLE_MASTER", "SUBTITLE_MASTER.srt", "1\n00:00:00,000 --> 00:00:03,000\n测试字幕\n");
  assert.equal(project.currentState, "TIMELINE_LOCKED");
  E.transition(project, "STORYBOARDING");
  E.createBlueprintRow(project, { start: "00:00.000", end: "00:03.000", purpose: "展示 UI", visualLevel: "A", visualType: "UI" });
  E.transition(project, "ASSET_COMPLETION");
  E.createAsset(project, { type: "UI", priority: "Must", status: "Ready", description: "真实 UI 录屏" });
  ready(project, "VISUAL_STYLE", "VISUAL_STYLE.md", "Hard Cut / Crop / Zoom");
  ready(project, "EXPORT_SPEC", "EXPORT_SPEC.md", "3840x2160 H.264");
  assert.equal(project.currentState, "PRODUCTION_READY");
  E.transition(project, "CODEX_BUILD");
  ready(project, "VIDEO_V0_REVIEW", "VIDEO_V0_REVIEW.mp4", "");
  assert.equal(project.currentState, "REVIEW");
}

function testBSunoVideo() {
  const project = E.createProject({ name: "B Case", projectType: "B_SUNO_VIDEO" });
  const flow = E.flowFor(project.projectType);
  assert(flow.includes("MUSIC_DRAFT") && flow.includes("MUSIC_LOCKED"));
  assert(project.files.LYRICS && project.files.SUNO_PROMPT && project.files.MUSIC_MASTER);
  assert.throws(() => E.setLock(project, "musicLock", true), /音乐生成.*阶段前/);
  E.transition(project, "MUSIC_DRAFT", { force: true });
  assert.throws(() => E.setLock(project, "musicLock", true), /MUSIC_MASTER/);
  ready(project, "MUSIC_MASTER", "MUSIC_MASTER.wav", "");
  E.setLock(project, "musicLock", true);
  assert(project.locks.musicLock);
}

function testCGameSystem() {
  const project = E.createProject({ name: "C Case", projectType: "C_GAME_SYSTEM" });
  assert.deepEqual(E.flowFor(project.projectType), E.flowFor("A_FULL_GUIDE"));
  assert(!project.files.LYRICS && !project.files.MUSIC_MASTER);
  const asset = E.createAsset(project, { type: "Diagram", priority: "Must", description: "底层机制因果图" });
  assert.match(asset.filename, /^FIG_001_/);
  assert.equal(asset.status, "Planned");
}

function testDMusicReleaseAndLibrary() {
  const project = E.createProject({ name: "D Case", projectType: "D_MUSIC_RELEASE" });
  assert.deepEqual(E.flowFor(project.projectType), ["IDEA", "PLANNING", "MUSIC_DRAFT", "MUSIC_LOCKED", "RELEASE_READY", "PUBLISHED", "ARCHIVED"]);
  const music = E.createMusicAsset({ title: "Furina Theme", projectId: project.projectId, sunoVersion: "v4.5" });
  project.linkedMusicIds.push(music.musicId);
  assert.equal(music.projectId, project.projectId);
  assert(project.linkedMusicIds.includes(music.musicId));
}

function testSharedEngines() {
  const sentences = Array.from({ length: 54 }, (_, index) => `这是第${index + 1}个自然语义句子，用于验证旁白分块不会在句子中间任意截断。`).join("");
  const chunks = E.splitTts(sentences);
  assert(chunks.length >= 3);
  assert(chunks.every((chunk) => chunk.wordCount >= 300 && chunk.wordCount <= 520));
  assert.equal(chunks.map((chunk) => chunk.content).join(""), sentences);
  const anchors = E.extractAvAnchors("展示界面。[AV:UI]这里比较数值。[AV:COMPARE]最后说明错误。[AV:ERROR]");
  assert.deepEqual(anchors.map((item) => item.type), ["AV_UI", "AV_COMPARE", "AV_ERROR"]);
  const project = E.createProject({ name: "Prompt Case", projectType: "A_FULL_GUIDE" });
  const prompt = E.generatePrompt(project);
  for (const section of ["## Role", "## Goal", "## Current Project State", "## Input Files", "## Facts / Locks", "## Task", "## Rules", "## Required Output Files", "## Next Handoff", "## Do Not"]) assert(prompt.includes(section), `Prompt missing ${section}`);
  const first = E.projectDataJson(project).length;
  for (let index = 0; index < 8; index += 1) E.refreshGeneratedFiles(project);
  assert(E.projectDataJson(project).length < first * 1.3, "PROJECT_DATA must not recursively grow");
}

testAFullGuide();
testBSunoVideo();
testCGameSystem();
testDMusicReleaseAndLibrary();
testSharedEngines();
console.log("AI Video Production System tests passed: Cases A–D, gates, prompts, TTS, anchors and serialization.");
