"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const canonicalMigration = "20260831084516_creator_language_track_scoped_artifacts.sql";
const migrationPath = path.join(migrationsDir, canonicalMigration);
const provisionalCandidatePath = path.join(root, "supabase", "sql", "wp_glob_002_language_track_scope_migration_candidate.sql");
const acceptancePath = path.join(root, "supabase", "sql", "wp_glob_002_language_track_scope_acceptance.sql");
const apiPath = path.join(root, "supabase", "functions", "creator-project-api", "index.ts");
const enginePath = path.join(root, "apps", "video-workspace", "production-system", "engine.js");
const contractPath = path.join(root, "docs", "creator-language-track-artifact-scope-v0.1.md");
const distributionPath = path.join(root, "docs", "creator-distribution-identity-v0.1.md");
const unifiedPath = path.join(root, "docs", "ai-video-production", "UNIFIED_PIPELINE.md");

assert.ok(fs.existsSync(migrationPath), `Canonical Production-synced migration missing: ${canonicalMigration}`);
assert.ok(!fs.existsSync(provisionalCandidatePath), "Provisional WP_GLOB_002 migration candidate must not remain after Production assigns a version");

const migration = fs.readFileSync(migrationPath, "utf8");
const acceptance = fs.readFileSync(acceptancePath, "utf8");
const api = fs.readFileSync(apiPath, "utf8");
const engine = fs.readFileSync(enginePath, "utf8");
const contract = fs.readFileSync(contractPath, "utf8");
const distribution = fs.readFileSync(distributionPath, "utf8");
const unified = fs.readFileSync(unifiedPath, "utf8");

assert.ok(acceptance.includes(canonicalMigration), `Acceptance SQL must reference canonical Production migration: ${canonicalMigration}`);
assert.ok(!acceptance.includes("wp_glob_002_language_track_scope_migration_candidate.sql"), "Acceptance SQL must not reference provisional migration candidate");

function has(pattern, source, message = String(pattern)) { assert.match(source, pattern, message); }
function lacks(pattern, source, message = String(pattern)) { assert.doesNotMatch(source, pattern, message); }

// Language Track identity.
has(/create table public\.creator_language_tracks\s*\(/i, migration);
has(/language_track_id uuid primary key/i, migration);
has(/foreign key \(project_id, owner_user_id\)[\s\S]*references public\.creator_projects\(project_id, owner_user_id\)/i, migration);
has(/unique \(project_id, owner_user_id, track_key\)/i, migration);
has(/creator_language_tracks_one_source_per_project_idx[\s\S]*where is_source/i, migration);
has(/language_code text not null/i, migration);
lacks(/language_code[^\n]*(?:ZH|JA|EN)[^\n]*(?:check|enum)/i, migration, "Language schema must not hard-code a fixed ZH/JA/EN universe");

// Scoped Artifact identity evolves the existing registry in place.
has(/alter table public\.creator_project_files[\s\S]*add column artifact_scope_type text[\s\S]*add column artifact_scope_id text/i, migration);
has(/update public\.creator_project_files[\s\S]*artifact_scope_type = 'project'[\s\S]*artifact_scope_id = project_id/i, migration);
has(/drop constraint creator_project_files_project_id_file_key_key/i, migration);
has(/unique \(project_id, artifact_scope_type, artifact_scope_id, file_key\)/i, migration);
has(/artifact_scope_type in \('project', 'language_track', 'visual_master', 'variant'\)/i, migration);
has(/language_track artifact scope ownership mismatch/i, migration);
has(/reserved but not writable in WP_GLOB_002/i, migration);
lacks(/delete from public\.creator_project_files[\s\S]*where[^;]*artifact_scope_type\s*<>/i, migration,
  "Migration must not delete/reinsert existing logical-file rows during scope backfill");

// Project-data prune is narrowed to Legacy/default Project scope.
has(/create or replace function public\.app_prune_creator_project_files/i, migration);
has(/f\.artifact_scope_type = 'project'/i, migration);
has(/f\.artifact_scope_id = new\.project_id/i, migration);

// Revision RPC defaults old p_files to Project scope and uses the four-part conflict target.
has(/artifact_scope_type text,[\s\S]*artifact_scope_id text,[\s\S]*file_key text/i, migration);
has(/coalesce\(nullif\(btrim\(f\.artifact_scope_type\), ''\), 'project'\)/i, migration);
has(/then coalesce\(nullif\(btrim\(f\.artifact_scope_id\), ''\), p_project_id\)/i, migration);
has(/on conflict \(project_id, artifact_scope_type, artifact_scope_id, file_key\) do update/i, migration);
lacks(/on conflict \(project_id, file_key\)/i, migration, "Legacy two-column conflict identity must not remain in the upgraded RPC");

// API preserves Legacy/default projection and exposes future-facing reads additively.
has(/artifact_scope_type: "project", artifact_scope_id: projectId/i, api, "fileRows() must explicitly write Project scope");
has(/artifact_scope_type=eq\.project&artifact_scope_id=eq\.\$\{encodeURIComponent\(projectId\)\}&file_key=/i, api,
  "ownedLogicalFile() must be Project-scope explicit");
has(/creator_project_files\?owner_user_id=eq\.\$\{owner\}&artifact_scope_type=eq\.project/i, api,
  "dashboard files projection must remain Project-scope only");
has(/creator_language_tracks\?project_id=eq\.\$\{projectFilter\}/i, api);
has(/artifact_scope_type=neq\.project/i, api);
has(/return \{ project, files, languageTracks, scopedArtifacts, events, releases, fileLocations, devices \}/i, api);
lacks(/projectId \? project : project/i, api, "Repository API source must not contain the superseded v7 parity drift");

// No fake language suffixes in implementation.
lacks(/AUDIO_MASTER_(?:ZH|JA|EN)|SUBTITLE_MASTER_(?:ZH|JA|EN)/i, migration + "\n" + api,
  "Artifact scope must not be simulated with language-suffixed file keys");

// Current global workflow and local directories remain unchanged by this WP.
lacks(/LANGUAGE_SCRIPTING|JA_AUDIO_LOCKED|EN_TIMELINE_LOCKED|ZH_AUDIO_LOCKED/i, engine + "\n" + migration + "\n" + api);
lacks(/02_SCRIPT\/(?:ZH|JA|EN)|03_AUDIO\/(?:ZH|JA|EN)|04_SUBTITLES\/(?:ZH|JA|EN)/i, migration + "\n" + api);
has(/Legacy\/default Project Timeline Compatibility Layer/i, contract);
has(/Do not introduce `ZH\/`, `JA\/`, `EN\/` local folders yet/i, contract);

// Distribution / Unified Pipeline docs must reflect the implemented identity layer without claiming new workflow.
has(/creator_language_tracks[^\n]*Language Track/i, distribution);
has(/\(project_id, artifact_scope_type, artifact_scope_id, file_key\)/i, distribution);
has(/No new Global Creator Pipeline state is introduced by WP_GLOB_001 or WP_GLOB_002/i, distribution);
has(/Language Track Identity \| Supabase `creator_language_tracks`/i, unified);
has(/multilingual identity foundation[^\n]*不改变这套日常操作/i, unified);
lacks(/Language Track tables or workflow/i, distribution, "Distribution doc must not claim the Language Track table is still unimplemented");

// Storage/security boundary.
has(/alter table public\.creator_language_tracks enable row level security/i, migration);
for (const action of ["select", "insert", "update", "delete"]) has(new RegExp(`creator_language_tracks_owner_${action}`, "i"), migration);
has(/revoke all on table public\.creator_language_tracks from anon, authenticated/i, migration);
lacks(/\bbytea\b|storage\.objects|create bucket|supabase storage/i, migration + "\n" + api);

// Acceptance contract pins all required cases and rollback-only behavior.
has(/begin;/i, acceptance);
has(/rollback;/i, acceptance);
for (const marker of ["CASE A", "CASE B", "CASE C", "CASE D", "CASE E", "CASE F", "CASE G", "CASE H"]) {
  assert.ok(acceptance.includes(marker), `Acceptance SQL missing ${marker}`);
}
has(/WP_GLOB_002_ACCEPTANCE_OK/i, acceptance);
has(/file_id_digest_before/i, acceptance);
has(/legacy save did not target Project scope/i, acceptance);
has(/Project prune removed child scoped artifacts/i, acceptance);
has(/where f\.artifact_scope_type='project'/i, acceptance,
  "Acceptance ID-preservation proof must structurally hash the pre-existing Project-scope rows");
has(/metadata->>'wp'='WP_GLOB_002' and artifact_scope_type='language_track'\) as scoped_artifacts_inside_tx/i, acceptance,
  "Acceptance summary must count only the 15 Language Track scoped artifacts");

console.log(`WP_GLOB_002 language-track scope tests passed using ${canonicalMigration}: Language Track identity, scoped Artifact identity, legacy Project compatibility, RPC/API scope defaults, prune safety, migration identity, docs alignment, security/storage boundaries and rollback acceptance are pinned.`);
