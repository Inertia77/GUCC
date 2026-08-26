"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const E = require("../apps/video-workspace/production-system/engine.js");

function ready(project, key, name, content = "ready") {
  E.registerFile(project, key, { name: name || E.FILE_DEFINITIONS[key].filename, content, size: content.length, status: "Ready" });
}

function legacyRaw(type, state = "PLANNING", extra = {}) {
  return {
    projectId: `legacy_${type}`,
    name: `Legacy ${type}`,
    game: "TEST",
    topic: "legacy",
    projectType: type,
    currentState: state,
    locks: { contentLock: false, scriptLock: false, musicLock: false, audioLock: false, pictureLock: false },
    files: {},
    assets: [], reviews: [], blueprint: [], ttsChunks: [], avAnchors: [], linkedMusicIds: [], history: [],
    ...extra,
  };
}

function testUnifiedProjectModel() {
  const project = E.createProject({ name: "Direct Create", game: "鸣潮", topic: "机制专题" });
  assert.equal(project.projectType, "STANDARD_VIDEO", "new projects use the unified internal compatibility value");
  assert.equal(project.legacyProjectType, "");
  assert.deepEqual(E.flowFor(), E.PRODUCTION_FLOW);
  assert(!E.PRODUCTION_FLOW.includes("MUSIC_DRAFT"));
  assert(!E.PRODUCTION_FLOW.includes("MUSIC_LOCKED"));
  assert.equal(E.musicMode(project), "skip");
  assert(!project.files.LYRICS && !project.files.SUNO_PROMPT && !project.files.MUSIC_MASTER, "Music Skip must not create music requirements");
}

function testLegacyTypesNormalize() {
  for (const type of ["A_FULL_GUIDE", "B_SUNO_VIDEO", "C_GAME_SYSTEM", "D_MUSIC_RELEASE"]) {
    const project = E.normalizeProject(legacyRaw(type));
    assert.equal(project.projectType, "STANDARD_VIDEO", `${type} must normalize into unified project model`);
    assert.equal(project.legacyProjectType, type, `${type} must remain readable as legacy metadata`);
    assert.equal(project.currentState, "PLANNING");
    assert.deepEqual(E.progress(project).flow, E.PRODUCTION_FLOW);
  }
}

function testLegacyMusicStateMigration() {
  const draft = E.normalizeProject(legacyRaw("B_SUNO_VIDEO", "MUSIC_DRAFT", {
    files: { LYRICS: { status: "Ready", content: "legacy lyrics" }, SUNO_PROMPT: { status: "Ready", content: "legacy prompt" } },
  }));
  assert.equal(draft.currentState, "AUDIO_PRODUCTION");
  assert.equal(draft.audioProduction.musicMode, "generate");
  assert.equal(draft.files.LYRICS.content, "legacy lyrics", "legacy music data must survive normalization");

  const lockedButNoAudioLock = E.normalizeProject(legacyRaw("D_MUSIC_RELEASE", "MUSIC_LOCKED", {
    locks: { contentLock: false, scriptLock: false, musicLock: true, audioLock: false, pictureLock: false },
    files: { MUSIC_MASTER: { status: "Ready", filename: "old_music.wav" } },
  }));
  assert.equal(lockedButNoAudioLock.currentState, "AUDIO_PRODUCTION", "legacy Music Lock must never bypass Audio Lock");
  assert.equal(lockedButNoAudioLock.files.MUSIC_MASTER.filename, "old_music.wav");

  const safelyAudioLocked = E.normalizeProject(legacyRaw("D_MUSIC_RELEASE", "MUSIC_LOCKED", {
    locks: { contentLock: false, scriptLock: false, musicLock: true, audioLock: true, pictureLock: false },
    files: { AUDIO_MASTER: { status: "Ready", filename: "AUDIO_MASTER.wav" }, MUSIC_MASTER: { status: "Ready", filename: "old_music.wav" } },
  }));
  assert.equal(safelyAudioLocked.currentState, "AUDIO_LOCKED", "only a real AUDIO_MASTER + Audio Lock may preserve the later state");
}

function testMusicCapabilities() {
  const skip = E.createProject({ name: "Skip Music" });
  skip.currentState = "AUDIO_PRODUCTION";
  const skipAction = E.nextAction(skip);
  assert.deepEqual(skipAction.outputKeys, ["AUDIO_MASTER"]);
  assert(!skipAction.missingOutputs.includes("MUSIC_MASTER"));
  assert.equal(E.fileContract(skip, "LYRICS"), "hidden");

  const existing = E.createProject({ name: "Existing Music" });
  existing.currentState = "AUDIO_PRODUCTION";
  E.setMusicMode(existing, "existing");
  assert.equal(E.fileContract(existing, "MUSIC_MASTER"), "optional");
  assert.equal(E.fileContract(existing, "LYRICS"), "hidden");
  ready(existing, "MUSIC_MASTER", "existing_track.wav", "");
  ready(existing, "AUDIO_MASTER", "AUDIO_MASTER.wav", "");
  E.setLock(existing, "audioLock", true);
  E.transition(existing, "AUDIO_LOCKED");
  assert.equal(existing.currentState, "AUDIO_LOCKED");

  const generate = E.createProject({ name: "Generate Music" });
  generate.currentState = "AUDIO_PRODUCTION";
  E.setMusicMode(generate, "generate");
  for (const key of ["LYRICS", "SUNO_PROMPT", "MUSIC_MASTER", "INSTRUMENTAL"]) {
    assert(generate.files[key], `${key} capability should exist in generate mode`);
    assert.equal(E.fileContract(generate, key), "optional");
  }
  assert(!E.nextAction(generate).missingOutputs.includes("MUSIC_MASTER"), "music subflow must not change top-level gate requirements");
  assert.throws(() => E.setLock(generate, "musicLock", true), /Music Lock 已取消/);
}

function testHumanGatesAndSharedTools() {
  const project = E.createProject({ name: "Gate Case" });
  assert.throws(() => E.setLock(project, "scriptLock", true), /脚本制作.*阶段前/);
  E.transition(project, "PLANNING");
  E.transition(project, "RESEARCHING");
  E.transition(project, "RESEARCH_LOCKED");
  ready(project, "CONTENT_LOCK", "CONTENT_LOCK.md", "结论已锁定");
  E.setLock(project, "contentLock", true);
  E.transition(project, "CONTENT_LOCKED");
  E.transition(project, "SCRIPTING");
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
  assert.match(E.generatePrompt(project), /实际音频是唯一时间源|AUDIO_MASTER/);
  assert.doesNotMatch(E.generatePrompt(project), /Project Type Template/);
  assert.doesNotMatch(E.generatePrompt(project), /Music Lock/);

  const sentences = Array.from({ length: 54 }, (_, index) => `这是第${index + 1}个自然语义句子，用于验证旁白分块不会在句子中间任意截断。`).join("");
  const chunks = E.splitTts(sentences);
  assert(chunks.length >= 3);
  assert(chunks.every((chunk) => chunk.wordCount >= 300 && chunk.wordCount <= 520));
  assert.equal(chunks.map((chunk) => chunk.content).join(""), sentences);
  const anchors = E.extractAvAnchors("展示界面。[AV:UI]这里比较数值。[AV:COMPARE]最后说明错误。[AV:ERROR]");
  assert.deepEqual(anchors.map((item) => item.type), ["AV_UI", "AV_COMPARE", "AV_ERROR"]);
}

function testUiContract() {
  const indexHtml = fs.readFileSync(path.join(__dirname, "..", "apps", "video-workspace", "production-system", "index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(__dirname, "..", "apps", "video-workspace", "production-system", "app.js"), "utf8");
  const engineJs = fs.readFileSync(path.join(__dirname, "..", "apps", "video-workspace", "production-system", "engine.js"), "utf8");
  assert(!indexHtml.includes("projectTypeSelect"), "Production Direct Create must not ask for Project Type");
  assert(!indexHtml.includes("projectTypeBadge"), "Production hero must not expose A/B/C/D badge");
  assert(!appJs.includes("E.PROJECT_TYPES[project.projectType]"), "Production UI must not branch on legacy type");
  assert.doesNotMatch(engineJs, /\b(?:const|let|var)\s+B_FLOW\b|\bB_FLOW\s*=/, "B_FLOW must not exist as a top-level workflow");
  assert.doesNotMatch(engineJs, /\b(?:const|let|var)\s+D_FLOW\b|\bD_FLOW\s*=/, "D_FLOW must not exist as a top-level workflow");
  assert(appJs.includes('data-music-mode="skip"') && appJs.includes('data-music-mode="existing"') && appJs.includes('data-music-mode="generate"'));
}

function testSerializationDoesNotGrow() {
  const project = E.createProject({ name: "Serialization" });
  const first = E.projectDataJson(project).length;
  for (let index = 0; index < 8; index += 1) E.refreshGeneratedFiles(project);
  assert(E.projectDataJson(project).length < first * 1.3, "PROJECT_DATA must not recursively grow");
}

testUnifiedProjectModel();
testLegacyTypesNormalize();
testLegacyMusicStateMigration();
testMusicCapabilities();
testHumanGatesAndSharedTools();
testUiContract();
testSerializationDoesNotGrow();
console.log("AI Video Production System Phase 1.2 tests passed: unified workflow, legacy migration, optional Music and gates.");
