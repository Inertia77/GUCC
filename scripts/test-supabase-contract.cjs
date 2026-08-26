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

console.log("Supabase contract regression tests passed.");
