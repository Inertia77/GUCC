"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const G = require("../assets/creator-global-production-core.js");
const Agent = require("./creator-local-agent/core.cjs");

const root = path.join(__dirname, "..");
const migrations = path.join(root, "supabase", "migrations");
const migrationName = fs.readdirSync(migrations).find((name) => name.endsWith("_creator_global_production_v1.sql"));
assert.ok(migrationName, "Global Production v1 migration is missing");
const migration = fs.readFileSync(path.join(migrations, migrationName), "utf8");
const gateMigrationName = "20260901033423_creator_global_production_v1_gate_context_hardening.sql";
const indexMigrationName = "20260901040409_creator_global_production_v1_fk_indexes.sql";
const gateMigration = fs.readFileSync(path.join(migrations, gateMigrationName), "utf8");
const indexMigration = fs.readFileSync(path.join(migrations, indexMigrationName), "utf8");
const acceptance = fs.readFileSync(path.join(root, "supabase", "sql", "creator_global_production_v1_acceptance.sql"), "utf8");
const api = fs.readFileSync(path.join(root, "supabase", "functions", "creator-project-api", "index.ts"), "utf8");
const ui = fs.readFileSync(path.join(root, "assets", "creator-global-production-ui.mjs"), "utf8");
const html = fs.readFileSync(path.join(root, "apps", "video-workspace", "production-system", "index.html"), "utf8");

assert.equal(G.SCHEMA_VERSION, "gucc-creator-global-production-v1");
assert.deepEqual(G.LANGUAGE_STATES, ["DRAFT", "SCRIPTING", "SCRIPT_LOCKED", "AUDIO_PRODUCTION", "AUDIO_LOCKED", "TIMELINE_GENERATION", "TIMELINE_LOCKED", "READY"]);
assert.deepEqual(G.TIMELINE_BUNDLE, ["SUBTITLE_MASTER", "TIMELINE_SENTENCE", "TRANSCRIPT_ALIGNED", "ALIGNMENT_REPORT"]);

const projectId = "PROJECT_GLOBAL_TEST";
const trackA = "00000000-0000-4000-8000-000000000001";
const trackB = "00000000-0000-4000-8000-000000000002";
const timelineFiles = (scopeId, ready = true) => ["AUDIO_MASTER", ...G.TIMELINE_BUNDLE].map((fileKey) => ({
  project_id: projectId, artifact_scope_type: "language_track", artifact_scope_id: scopeId, file_key: fileKey,
  status: ready ? "Ready" : "Missing", metadata: fileKey === "AUDIO_MASTER" ? { timing_provenance: "real_audio" } : {},
}));
const snapshot = { scopedArtifacts: [...timelineFiles(trackA), ...timelineFiles(trackB, false)] };
assert.equal(G.filesForScope(snapshot, "language_track", trackA).length, 5, "Same file keys must coexist across Language Track scopes");
assert.equal(G.timelineReadiness({ timing_provenance: "real_audio", alignment_status: "VALID" }, G.filesForScope(snapshot, "language_track", trackA)).ready, true);
assert.equal(G.timelineReadiness({ timing_provenance: "real_audio", alignment_status: "VALID" }, G.filesForScope(snapshot, "language_track", trackB)).ready, false);
assert.notEqual(Agent.cacheKey(projectId, snapshot.scopedArtifacts[0]), Agent.cacheKey(projectId, snapshot.scopedArtifacts[5]), "Local Agent cache must include scoped Artifact identity");

assert.equal(G.validateAudioAnalysis({ durationMs: 6000, provider: "local-whisper", audioChecksum: "sha256:" + "a".repeat(64), segments: [{ startMs: 0, endMs: 1800, text: "real" }, { startMs: 1900, endMs: 5900, text: "audio" }] }).valid, true);
assert.equal(G.validateAudioAnalysis({ durationMs: 6000, provider: "script-estimate", segments: [{ startMs: 0, endMs: 5900, text: "guessed" }] }).valid, false, "Script-estimated timestamps must fail closed");
assert.equal(G.validateAudioAnalysis({ durationMs: 6000, provider: "local-whisper", audioChecksum: "sha256:not-a-real-digest", segments: [{ startMs: 0, endMs: 5900, text: "audio" }] }).valid, false, "Timing provenance requires an exact SHA-256 digest");

const packageManifest = { variantId: "variant-1", presentationId: "presentation-1", channelId: "channel-1", languageTrackIds: [trackA, trackB], outputArtifact: { scopeType: "variant", scopeId: "variant-1", fileKey: "EXPORT_MANIFEST", relativePath: "10_RELEASE/VARIANTS/YT/export.mp4", checksum: "sha256:" + "b".repeat(64) }, exportProfile: { ratio: "16:9" } };
assert.equal(G.validatePublishPackage(packageManifest).valid, true);
assert.equal(G.validatePublishPackage({ ...packageManifest, languageTrackIds: [] }).valid, false);
assert.equal(G.validatePublishPackage({ ...packageManifest, outputArtifact: { ...packageManifest.outputArtifact, checksum: "sha256:short" } }).valid, false);
assert.equal(G.distributionReadiness({ platform_locked_at: "x", qa_status: "PASS", qa_package_revision: 2, package_revision: 2, human_reviewed_at: "x", release_locked_at: "x" }, { final_publish_confirmed_at: "x" }).ready, true);
assert.equal(G.distributionReadiness({ package_revision: 2 }, {}).ready, false);

const plan = G.globalWorkspacePlan({ project: { project_id: projectId }, languageTracks: [{ language_track_id: trackA, track_key: "JA", language_code: "ja", status: "READY" }, { language_track_id: trackB, track_key: "FR_CA", language_code: "fr-CA", status: "SCRIPTING" }], visualMasters: [{ visual_master_id: "vm", visual_master_key: "VM_MAIN", status: "DRAFT" }], variants: [{ variant_id: "v", variant_key: "YT_GLOBAL", status: "DRAFT", visual_master_id: "vm" }] });
for (const expected of ["02_SCRIPT/LANG/JA", "03_AUDIO/LANG/FR_CA", "06_EDIT_PLAN/VISUAL_MASTER/VM_MAIN", "10_RELEASE/VARIANTS/YT_GLOBAL"]) assert.ok(plan.directories.includes(expected), `Workspace plan missing ${expected}`);
assert.ok(plan.files["00_CONTROL/GLOBAL_PRODUCTION.json"]);

const early = G.nextGlobalAction({ project: { project_id: projectId } });
assert.equal(early.stage, "PROJECT_SCOPE"); assert.equal(early.humanRequired, true);
const localization = G.nextGlobalAction({ project: { project_id: projectId, project_scope_locked_at: "x", evidence_locked_at: "x", master_script_locked_at: "x" }, languageTracks: [] });
assert.equal(localization.stage, "LOCALIZATION"); assert.equal(localization.humanRequired, false);

for (const table of ["creator_research_sources", "creator_assets", "creator_visual_masters", "creator_visual_segments", "creator_visual_segment_projections", "creator_asset_coverage", "creator_variant_language_tracks", "creator_platform_presentations", "creator_publish_packages", "creator_qa_reports", "creator_publication_metric_snapshots", "creator_performance_reports", "creator_learnings"]) {
  assert.match(migration, new RegExp(`create table public\\.${table}\\s*\\(`, "i"), `${table} DDL missing`);
  assert.match(migration, new RegExp(`alter table public\\.%I enable row level security|${table}.*enable row level security`, "i"), `${table} RLS contract missing`);
}
for (const marker of ["app_creator_human_lock", "app_creator_review_learning", "Voice / Timeline locked", "Platform Variant locked", "Release-approved Publish Package snapshot is immutable", "Final Publish Confirmation is a human-only gate", "Project prune removed"] .filter(Boolean)) {
  if (marker === "Project prune removed") continue;
  assert.ok(migration.includes(marker), `Migration safety marker missing: ${marker}`);
}
assert.match(migration, /publication_mode in \('INITIAL','RETRY','REPOST'\)/i);
assert.match(migration, /unique \(publication_id, captured_at, provider\)/i);
assert.match(migration, /status in \('PROPOSED','ACCEPTED','REJECTED','SUPERSEDED'\)/i);
assert.match(migration, /artifact_scope_type='project'.*file_key=any\(v_legacy_keys\)/is, "Legacy prune must remain Project-scope/key allowlist only");
assert.doesNotMatch(migration + api, /AUDIO_MASTER_(ZH|JA|EN)|SUBTITLE_MASTER_(ZH|JA|EN)|VISUAL_MASTER_TIMELINE_[A-Z]{2}/i, "Scope identity must not be simulated with suffixes");
assert.doesNotMatch(migration, /\bbytea\b|storage\.objects|create bucket/i, "Global Production must remain metadata-only/local-first");
assert.match(gateMigration, /app_reset_creator_human_action_after_event/i, "Human action context must be reset after each guarded gate RPC");
assert.match(gateMigration, /trg_creator_human_gate_context_reset/i, "Human gate reset trigger is missing");
assert.match(gateMigration, /trg_creator_learning_human_context_reset/i, "Learning review reset trigger is missing");
assert.equal((indexMigration.match(/create index if not exists/gi) || []).length, 36, "Every uncovered Global Production foreign key must receive a covering index");
for (const indexName of [
  "creator_visual_segments_master_owner_idx",
  "creator_variant_tracks_language_owner_idx",
  "creator_publish_packages_variant_owner_idx",
  "creator_publications_package_owner_idx",
  "creator_metric_snapshots_publication_owner_idx",
  "creator_performance_reports_artifact_owner_idx",
]) assert.ok(indexMigration.includes(indexName), `Foreign-key performance index missing: ${indexName}`);
assert.match(acceptance, /^begin;/im, "Production acceptance must be transaction-scoped");
assert.match(acceptance, /^rollback;/im, "Production acceptance must leave no fixture residue");
assert.doesNotMatch(migrationName + gateMigrationName + indexMigrationName, /provisional|temporary/i, "Canonical migration identities must not use provisional names");

for (const action of ["saveScopedArtifact", "saveResearchSource", "saveAsset", "saveLanguageTrack", "saveVisualMaster", "saveVisualSegment", "saveVisualProjection", "saveAssetCoverage", "saveVariant", "saveChannel", "savePlatformPresentation", "savePublishPackage", "humanLock", "runAiQa", "savePublication", "recordMetricSnapshot", "savePerformanceReport", "saveLearningProposal", "reviewLearning", "acceptedLearnings"]) assert.ok(api.includes(`action === "${action}"`), `API action missing: ${action}`);
assert.match(api, /body\.humanConfirmed !== true \|\| body\.source !== "human_ui"/i, "AI must not be able to invoke human locks");
assert.match(api, /GLOBAL_METADATA_ACTIONS\.has\(action\).*assertMetadataOnly\(body\)/s, "Every Global Production write action must enforce the metadata-only boundary");
assert.match(api, /Object\.entries\(value as JsonMap\)/, "Metadata-only validation must inspect nested payloads");
assert.match(api, /data:\(\?:audio\|video\|image\|application\\\/octet-stream\)/i, "Embedded media data URLs must be rejected");
assert.match(api, /AUDIO_MASTER requires a real local file SHA-256 checksum/, "Real-audio artifacts must be bound to an exact local file digest");
assert.match(api, /manifest\.outputArtifact\.checksum must be sha256:<64 hex characters>/, "Publish Package output must have an exact SHA-256 digest");
assert.match(api, /artifact_scope_type=eq\.project/i, "Legacy Dashboard files must remain Project-scope filtered");
assert.match(api, /artifactScopeType = "project", artifactScopeId = projectId/i, "Legacy file observation calls must default to Project scope");

assert.ok(html.includes('id="globalProduction"')); assert.ok(html.includes("creator-global-production-ui.mjs"));
for (const label of ["Language Tracks", "Visual Master", "Variants", "Publish Packages", "Publications", "Analytics", "Learning", "最终发布确认"]) assert.ok(ui.includes(label), `Global UI path missing ${label}`);

console.log(`Creator Global Production v1 contract tests passed (${migrationName} + ${gateMigrationName} + ${indexMigrationName}).`);
