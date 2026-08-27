"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const sql = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260825_gucc_integrity_hardening.sql"),
  "utf8"
);
const edge = fs.readFileSync(
  path.join(ROOT, "supabase/functions/gameup-api/index.ts"),
  "utf8"
);
const creatorMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260826230000_gucc_creator_phase1_revision_conflict_protection.sql"),
  "utf8"
);
const creatorTypeCompatMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260827022000_creator_standard_video_compat.sql"),
  "utf8"
);
const creatorLocalFirstMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260827050000_creator_local_first_foundation.sql"),
  "utf8"
);
const creatorLocalFirstIndexes = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260827051000_creator_local_first_fk_indexes.sql"),
  "utf8"
);
const creatorFileObservationMigration = fs.readFileSync(
  path.join(ROOT, "supabase/migrations/20260827110000_creator_local_file_observation_rpc.sql"),
  "utf8"
);
const creatorEdge = fs.readFileSync(
  path.join(ROOT, "supabase/functions/creator-project-api/index.ts"),
  "utf8"
);

// Public API contract must remain stable for the existing frontend.
for (const pair of [
  ["saveCharacter", "app_save_character"],
  ["saveParty", "app_save_party"],
  ["saveVersion", "app_save_version"],
  ["searchCharacters", "app_search_characters"],
  ["searchParties", "app_search_parties"],
  ["searchVersions", "app_search_versions"]
]) {
  assert.match(edge, new RegExp(`${pair[0]}:\\s*'${pair[1]}'`));
}

// Backend must reject duplicate-create semantics instead of silently overwriting.
assert.match(sql, /Character already exists/);
assert.match(sql, /Version already exists/);
assert.doesNotMatch(sql, /insert into public\.characters[\s\S]{0,500}on conflict \(game_id, name\) do update/i);
assert.doesNotMatch(sql, /insert into public\.game_versions[\s\S]{0,500}on conflict \(game_id, version_no\) do update/i);

// Party member IDs must remain stable on ordinary edits.
assert.match(sql, /on conflict\(party_id,slot_no\) do update/i);
assert.doesNotMatch(sql, /delete from public\.party_members where party_id=v_party_id;\s*for rec/i);

// Imported provenance must not be wiped by a normal character save.
assert.match(sql, /rr\.source_sheet is null and rr\.source_field is null/i);

// Character linkage supports punctuation variants and aliases.
assert.match(sql, /app_normalize_character_name/);
assert.match(sql, /app_resolve_character_id/);

// Privileged event-trigger helper must not be callable from client roles.
assert.match(sql, /revoke execute on function public\.rls_auto_enable\(\) from public, anon, authenticated/i);

// Creator project saves must use server-side optimistic concurrency.
assert.match(creatorMigration, /revision bigint not null default 1/i);
assert.match(creatorMigration, /for update/i);
assert.match(creatorMigration, /p_base_revision <> v_current\.revision/i);
assert.match(creatorMigration, /security invoker/i);
assert.match(creatorMigration, /revoke all on function public\.save_creator_project_revision[\s\S]*from public, anon, authenticated/i);
assert.match(creatorEdge, /rpc\/save_creator_project_revision/);
assert.match(creatorEdge, /REVISION_CONFLICT/);
assert.doesNotMatch(creatorEdge, /creator_projects\?on_conflict=project_id/);

// Phase 1.2 new projects may persist STANDARD_VIDEO without invalidating any
// legacy A/B/C/D project_type value. Project Type remains compatibility metadata.
for (const type of ["A_FULL_GUIDE", "B_SUNO_VIDEO", "C_GAME_SYSTEM", "D_MUSIC_RELEASE", "STANDARD_VIDEO"]) {
  assert.match(creatorTypeCompatMigration, new RegExp(`'${type}'::text`));
}
assert.match(creatorTypeCompatMigration, /drop constraint if exists creator_projects_type_chk/i);
assert.match(creatorTypeCompatMigration, /add constraint creator_projects_type_chk/i);
assert.doesNotMatch(creatorTypeCompatMigration, /delete\s+from|truncate\s+table|drop\s+table/i);

// JSON object key order must not create false semantic events such as LOCKS_CHANGED.
assert.match(creatorEdge, /function canonicalJson\(/);
assert.match(creatorEdge, /Object\.keys\(source\)\.sort\(\)/);
assert.match(creatorEdge, /JSON\.stringify\(canonicalJson\(a \?\? null\)\)/);

// Phase 2A: logical artifacts and physical locations are separate concepts.
assert.match(creatorLocalFirstMigration, /create table if not exists public\.creator_devices/i);
assert.match(creatorLocalFirstMigration, /create table if not exists public\.creator_file_locations/i);
assert.match(creatorLocalFirstMigration, /logical_file_id uuid not null/i);
assert.match(creatorLocalFirstMigration, /references public\.creator_project_files\(id, project_id, owner_user_id\)/i);
assert.match(creatorLocalFirstMigration, /references public\.creator_devices\(owner_user_id, device_id\)/i);
assert.match(creatorLocalFirstMigration, /alter table public\.creator_devices enable row level security/i);
assert.match(creatorLocalFirstMigration, /alter table public\.creator_file_locations enable row level security/i);
assert.match(creatorLocalFirstMigration, /canonical expected project-relative path for the logical artifact/i);
assert.match(creatorLocalFirstMigration, /physical\/provider observations belong in creator_file_locations/i);

// Migration may backfill known device identities, but must never fabricate a
// physical file location from the 48 legacy/template logical artifact rows.
assert.match(creatorLocalFirstMigration, /insert into public\.creator_devices/i);
assert.doesNotMatch(creatorLocalFirstMigration, /insert into public\.creator_file_locations/i);

// Composite foreign keys must have matching left-prefix covering indexes. This
// keeps the production advisor clean as the location registry grows.
assert.match(creatorLocalFirstIndexes, /creator_file_locations_logical_owner_fk_idx[\s\S]*\(logical_file_id, project_id, owner_user_id\)/i);
assert.match(creatorLocalFirstIndexes, /creator_file_locations_project_owner_fk_idx[\s\S]*\(project_id, owner_user_id\)/i);
assert.doesNotMatch(creatorLocalFirstIndexes, /delete\s+from|update\s+public\.|insert\s+into|drop\s+table/i);

// Phase 2A.2 observation writes keep location + meaningful FILE_* history atomic.
assert.match(creatorFileObservationMigration, /create or replace function public\.save_creator_file_location_observation/i);
assert.match(creatorFileObservationMigration, /insert into public\.creator_file_locations/i);
assert.match(creatorFileObservationMigration, /insert into public\.creator_project_events/i);
assert.match(creatorFileObservationMigration, /security invoker/i);
assert.match(creatorFileObservationMigration, /revoke all on function public\.save_creator_file_location_observation[\s\S]*from public, anon, authenticated/i);
assert.match(creatorFileObservationMigration, /grant execute on function public\.save_creator_file_location_observation[\s\S]*to service_role/i);

// The Creator API exposes the local-first contract without accepting media bytes.
assert.match(creatorEdge, /function normalizeRelativePath\(/);
assert.match(creatorEdge, /workspace-relative, not absolute/);
assert.match(creatorEdge, /async function touchDevice\(/);
assert.match(creatorEdge, /async function saveFileLocation\(/);
assert.match(creatorEdge, /async function saveFileLocationsBatch\(/);
assert.match(creatorEdge, /MAX_LOCATION_BATCH = 100/);
assert.match(creatorEdge, /action === "getDevice"/);
assert.match(creatorEdge, /action === "registerDevice"/);
assert.match(creatorEdge, /action === "saveFileLocation"/);
assert.match(creatorEdge, /action === "saveFileLocationsBatch"/);
assert.match(creatorEdge, /rpc\/save_creator_file_location_observation/);
for (const event of ["FILE_FIRST_SEEN", "FILE_DISAPPEARED", "FILE_REAPPEARED", "FILE_REPLACED"]) {
  assert.match(creatorEdge, new RegExp(event));
}
assert.doesNotMatch(creatorEdge, /FILE_SCANNED|FILE_PRESENT|FILE_LOCATION_UPDATED/);
assert.match(creatorEdge, /Local observation path must match logical artifact contract/);
assert.match(creatorEdge, /return \{ projects, files, releases, devices, fileLocations, serverTime:/);
assert.match(creatorEdge, /const deviceId = await touchDevice\(userId, body\);[\s\S]{0,500}rpc\/save_creator_project_revision/);
assert.doesNotMatch(creatorEdge, /base64|multipart\/form-data|arrayBuffer\(\)|formData\(\)/i);

console.log("Supabase contract regression tests passed.");
