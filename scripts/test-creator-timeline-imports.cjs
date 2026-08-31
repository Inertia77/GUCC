"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const E = require("../apps/video-workspace/production-system/engine.js");

const root = path.join(__dirname, "..");
const app = fs.readFileSync(path.join(root, "apps", "video-workspace", "production-system", "app.js"), "utf8");
const bridge = fs.readFileSync(path.join(root, "assets", "creator-pipeline-bridge.mjs"), "utf8");
const pipelineCore = fs.readFileSync(path.join(root, "assets", "creator-pipeline-core.mjs"), "utf8");

function invalidLockedRaw(projectId) {
  const project = E.createProject({ projectId, name: projectId });
  project.currentState = "TIMELINE_LOCKED";
  project.locks.audioLock = true;
  project.files.AUDIO_MASTER.status = "Ready";
  project.files.AUDIO_MASTER.filename = "AUDIO_MASTER.wav";
  project.files.SUBTITLE_MASTER.status = "Ready";
  project.files.SUBTITLE_MASTER.content = "1\n00:00:00,000 --> 00:00:01,000\nhello\n";
  project.files.TIMELINE_SENTENCE.status = "Missing";
  project.files.TIMELINE_SENTENCE.content = "";
  project.files.TRANSCRIPT_ALIGNED.status = "Missing";
  project.files.TRANSCRIPT_ALIGNED.content = "";
  project.files.ALIGNMENT_REPORT.status = "Missing";
  project.files.ALIGNMENT_REPORT.content = "";
  return JSON.parse(JSON.stringify(project));
}

function assertImportRecovery(source) {
  const raw = invalidLockedRaw(`invalid_${source}`);
  assert.equal(E.validateWorkflowInvariants(raw).valid, false);
  const normalized = E.normalizeProject(raw, { source });
  assert.equal(normalized.currentState, "TIMELINE_GENERATION", `${source} must not preserve an invalid Timeline Lock`);
  assert.equal(normalized.workflowRecovery?.source, source);
  assert.equal(E.validateWorkflowInvariants(normalized).valid, true);
  return normalized;
}

function testSingleProjectJsonImport() {
  const normalized = assertImportRecovery("project_json");
  assert(normalized.workflowRecovery.missing.includes("TIMELINE_SENTENCE"));
  assert.match(app, /function importProject\(raw\)[\s\S]*?E\.normalizeProject\(raw\)/, "single project JSON import must pass through normalizeProject");
}

function testSystemJsonImport() {
  assertImportRecovery("system_json");
  assert.match(app, /Array\.isArray\(raw\.projects\)[\s\S]*?raw\.projects\.map\(E\.normalizeProject\)/, "system JSON projects must all pass through normalizeProject");
}

function testDirectoryProjectDataImport() {
  assertImportRecovery("directory_project_data");
  assert.match(app, /PROJECT_DATA\.json[\s\S]*?importProject\(raw\)/, "directory PROJECT_DATA import must reuse the normalized project import path");
}

function testLocalStoreReloadImport() {
  assertImportRecovery("local_store");
  assert.match(app, /raw\.projects\.map\(E\.normalizeProject\)/, "persisted local projects must be normalized on Production load");
}

function testCloudPullUsesCoreNormalize() {
  assertImportRecovery("cloud_pull");
  assert.match(pipelineCore, /engine\.normalizeProject\(raw, \{ source: "cloud_pull" \}\)/, "cloud project rows must pass through the same core normalization invariant with an explicit recovery source");
}

function testCloudAutosyncFailsClosedOnInvalidState() {
  const raw = invalidLockedRaw("invalid_cloud_autosync");
  const validation = E.validateWorkflowInvariants(raw);
  assert.equal(validation.valid, false);
  assert(validation.errors.some((item) => /TIMELINE_SENTENCE|TRANSCRIPT_ALIGNED|ALIGNMENT_REPORT/.test(item)));

  const validatorPos = bridge.indexOf("const workflow = validateProjectWorkflow(engine, project);");
  const invalidReturnPos = bridge.indexOf("if (!workflow.valid)", validatorPos);
  const savePos = bridge.indexOf('creatorApi("saveProject"', validatorPos);
  assert(validatorPos >= 0 && invalidReturnPos > validatorPos && savePos > invalidReturnPos, "Production Bridge must validate the Core workflow invariant before saveProject");
  assert.match(bridge.slice(invalidReturnPos, savePos), /return false/, "invalid workflow must fail closed before cloud save");
  assert.match(bridge, /function validateProjectWorkflow\(engine, project\)[\s\S]*?engine\.validateWorkflowInvariants\(project\)/, "Bridge must delegate to the Core validator rather than duplicate Timeline rules");

  const publishHandler = bridge.indexOf('publish.addEventListener("click"');
  const handoffWrite = bridge.indexOf("PUBLISH_HANDOFF_KEY", publishHandler);
  const publishValidation = bridge.indexOf("validateProjectWorkflow(engine, project)", publishHandler);
  assert(publishHandler >= 0 && publishValidation > publishHandler && handoffWrite > publishValidation, "invalid Production state must not be handed to Publish Console as a valid project");
}

function testCompleteImportedProjectSurvives() {
  const raw = invalidLockedRaw("complete_import");
  for (const key of E.TIMELINE_BUNDLE_FILES) {
    raw.files[key].status = "Ready";
    raw.files[key].content ||= `${key}\n`;
  }
  const normalized = E.normalizeProject(raw, { source: "system_json" });
  assert.equal(normalized.currentState, "TIMELINE_LOCKED");
  assert.equal(normalized.workflowRecovery, undefined);
  assert.equal(E.validateWorkflowInvariants(normalized).valid, true);
}

testSingleProjectJsonImport();
testSystemJsonImport();
testDirectoryProjectDataImport();
testLocalStoreReloadImport();
testCloudPullUsesCoreNormalize();
testCloudAutosyncFailsClosedOnInvalidState();
testCompleteImportedProjectSurvives();
console.log("Creator OS Phase 2C.2 import tests passed: project/system/directory/local/cloud normalization and autosync fail-closed invariant.");
