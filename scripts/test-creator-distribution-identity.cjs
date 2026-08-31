"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const canonicalFoundation = "20260831043241_creator_distribution_identity_foundation.sql";
const canonicalFkIndexes = "20260831043603_creator_distribution_identity_fk_indexes.sql";
const driftedFoundation = "20260831133000_creator_distribution_identity_foundation.sql";
const driftedFkIndexes = "20260831134500_creator_distribution_identity_fk_indexes.sql";
const migrationPath = path.join(migrationsDir, canonicalFoundation);
const fkIndexMigrationPath = path.join(migrationsDir, canonicalFkIndexes);
const acceptancePath = path.join(root, "supabase", "sql", "wp_glob_001_distribution_identity_acceptance.sql");
const contractPath = path.join(root, "docs", "creator-distribution-identity-v0.1.md");
const readmePath = path.join(root, "README.md");

assert.ok(fs.existsSync(migrationPath), `Canonical Production-synced migration missing: ${canonicalFoundation}`);
assert.ok(fs.existsSync(fkIndexMigrationPath), `Canonical Production-synced migration missing: ${canonicalFkIndexes}`);
assert.ok(!fs.existsSync(path.join(migrationsDir, driftedFoundation)), `Drifted repo migration identity must not return: ${driftedFoundation}`);
assert.ok(!fs.existsSync(path.join(migrationsDir, driftedFkIndexes)), `Drifted repo migration identity must not return: ${driftedFkIndexes}`);

const migration = fs.readFileSync(migrationPath, "utf8");
const fkIndexes = fs.readFileSync(fkIndexMigrationPath, "utf8");
const acceptance = fs.readFileSync(acceptancePath, "utf8");
const contract = fs.readFileSync(contractPath, "utf8");
const readme = fs.readFileSync(readmePath, "utf8");

function has(pattern, source = migration, message = String(pattern)) {
  assert.match(source, pattern, message);
}
function lacks(pattern, source = migration, message = String(pattern)) {
  assert.doesNotMatch(source, pattern, message);
}

// Identity layer exists and creator_projects/platforms/legacy releases keep their roles.
has(/create table public\.creator_variants\s*\(/i);
has(/create table public\.creator_channels\s*\(/i);
has(/create table public\.creator_publications\s*\(/i);
has(/Content Project Root/);
has(/Platform Dictionary only/);
has(/Legacy Project Release Compatibility Model/);

// Variant is project-scoped but is not implemented as a language-track identity.
has(/foreign key \(project_id, owner_user_id\)[\s\S]*?references public\.creator_projects\(project_id, owner_user_id\)/i);
has(/Distribution Variant identity[\s\S]*?not a Language Track/i);
lacks(/AUDIO_MASTER_(?:JA|EN|ZH)|SUBTITLE_MASTER_(?:JA|EN|ZH)/i, migration,
  "WP_GLOB_001 implementation must not simulate artifact scope with language-suffixed file keys");
has(/Do not emulate scope[\s\S]*AUDIO_MASTER_JA[\s\S]*SUBTITLE_MASTER_EN/i, contract,
  "Architecture contract should preserve explicit examples of the forbidden file-key anti-pattern");

// Channel must use platform_id identity; multiple channels per platform remain legal.
has(/platform_id uuid not null references public\.platforms\(id\) on delete restrict/i);
has(/Multiple Channels may point to the same platform_id/i);
lacks(/unique\s*\(\s*(?:owner_user_id\s*,\s*)?platform_id\s*\)/i,
  "Channel schema must not make platform_id unique");
lacks(/insert\s+into\s+public\.platforms/i,
  "WP_GLOB_001 must not create market-specific Platform rows");

// Publication is an instance/event: no slot uniqueness on project/platform/channel/variant.
has(/publication_id uuid primary key/i);
has(/foreign key \(variant_id, project_id, owner_user_id\)[\s\S]*?references public\.creator_variants/i);
has(/foreign key \(channel_id, owner_user_id\)[\s\S]*?references public\.creator_channels/i);
has(/there is intentionally no uniqueness constraint/i);
lacks(/unique\s*\(\s*project_id\s*,\s*platform/i);
lacks(/unique\s*\(\s*project_id\s*,\s*channel_id/i);
lacks(/unique\s*\(\s*variant_id\s*,\s*channel_id/i);

// Foreign keys keep dedicated leading-column coverage without changing identity/cardinality semantics.
has(/creator_channels_platform_fk_idx[\s\S]*creator_channels \(platform_id\)/i, fkIndexes);
has(/creator_publications_project_owner_fk_idx[\s\S]*creator_publications \(project_id, owner_user_id\)/i, fkIndexes);
has(/creator_publications_variant_project_owner_fk_idx[\s\S]*creator_publications \(variant_id, project_id, owner_user_id\)/i, fkIndexes);
has(/creator_publications_channel_owner_fk_idx[\s\S]*creator_publications \(channel_id, owner_user_id\)/i, fkIndexes);
lacks(/unique\s+index/i, fkIndexes, "FK performance follow-up must not introduce uniqueness semantics");

// Legacy table is documented, not structurally rewritten.
lacks(/alter table public\.creator_project_releases/i,
  "Legacy creator_project_releases must not be structurally changed in WP_GLOB_001");
lacks(/drop table(?: if exists)? public\.creator_project_releases/i);

// Owner boundaries mirror existing Creator Local-first security posture.
for (const table of ["creator_variants", "creator_channels", "creator_publications"]) {
  has(new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  for (const action of ["select", "insert", "update", "delete"]) {
    has(new RegExp(`create policy ${table}_owner_${action}`, "i"));
  }
  has(new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, "i"));
  has(new RegExp(`grant select, insert, update, delete on table public\\.${table} to service_role`, "i"));
}

// Identity tables are cloud metadata only, never media binary storage.
lacks(/\bbytea\b|storage\.objects|create bucket|media upload|video binary|audio binary/i, migration,
  "Distribution identity migration must not create media/binary storage");
has(/Media bytes and absolute local file paths must not be stored here/i);

// Artifact scope and child-state contracts are explicit without implementing them.
for (const scope of ["project", "language_track", "visual_master", "variant"]) {
  assert.ok(contract.includes(scope), `artifact scope contract missing ${scope}`);
}
has(/must not become the dumping ground for every future child workflow/i, contract);
has(/VIDEO_V1[\s\S]*does \*\*not\*\* mean/i, contract);
has(/One Project = One Video/i, contract);

// Local/Supabase/Drive boundary and implemented Lightweight Archive are explicit.
has(/Local machine[\s\S]*Large Media/i, contract);
has(/Supabase[\s\S]*State \+ History \+ Identity \+ Metadata/i, contract);
has(/Google Drive[\s\S]*Lightweight Project Archive/i, contract);
has(/Google Drive Lightweight Project Archive is implemented/i, contract);

// Acceptance probe covers the required behavior and is rollback-only.
has(/begin;/i, acceptance);
has(/rollback;/i, acceptance);
has(/YOUTUBE_GLOBAL_LONG/, acceptance);
has(/TIKTOK_JA_SHORT/, acceptance);
has(/TIKTOK_EN_SHORT/, acceptance);
has(/TIKTOK_JP/, acceptance);
has(/TIKTOK_GLOBAL/, acceptance);
has(/count\(distinct platform_id\)/i, acceptance);
has(/expected 2 publication instances/i, acceptance);
has(/creator_project_releases changed/i, acceptance);
has(/Authenticated direct CRUD unexpectedly granted/i, acceptance);
has(/Media\/binary bytea column/i, acceptance);
has(/WP_GLOB_001_ACCEPTANCE_OK/, acceptance);

// README must point future agents at the identity contract after this WP is wired in.
has(/Content Project Root/i, readme, "README must describe Creator Project as Content Project Root");
has(/Platform[^\n]*Channel/i, readme, "README must distinguish Platform and Channel");
has(/Google Drive Lightweight Project Archive/i, readme, "README must state the implemented lightweight archive boundary");

console.log(`WP_GLOB_001 distribution identity tests passed: canonical migrations ${canonicalFoundation} + ${canonicalFkIndexes}, identity cardinality, compatibility, artifact/state contracts, FK index coverage, RLS posture, and local/cloud/archive boundaries are pinned.`);
