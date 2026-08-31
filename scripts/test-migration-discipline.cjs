const fs = require('fs');
const path = require('path');
const assert = require('assert');

const dir = path.join(__dirname, '..', 'supabase', 'migrations');
const sqlFiles = fs.readdirSync(dir).filter((name) => name.endsWith('.sql')).sort();

const legacyAllowlist = new Set([
  '20260825_archive_legacy_dedupe_backup.sql',
  '20260825_gucc_integrity_hardening.sql',
  '20260825_gucc_restore_hsr_hold_status.sql',
  '20260825_gucc_status_cleanup.sql',
  '20260826_character_card_localized_names.sql',
  '20260826_gucc_metadata_maintenance_rollup.sql',
  '20260826_gucc_metadata_rollup_portability.sql',
  '20260826_gucc_nte_zankou_power_rank.sql',
]);

const checkpoint = 20260826085831n;
const seenVersions = new Set();
for (const file of sqlFiles) {
  if (legacyAllowlist.has(file)) continue;
  const match = file.match(/^(\d{14})_([a-z0-9_]+)\.sql$/i);
  assert(match, `Post-checkpoint migration must use <14-digit-version>_<name>.sql: ${file}`);
  const version = BigInt(match[1]);
  assert(version >= checkpoint, `Unexpected pre-checkpoint version outside legacy allowlist: ${file}`);
  assert(!seenVersions.has(match[1]), `Duplicate production migration version: ${match[1]}`);
  seenVersions.add(match[1]);
}

for (const required of [
  '20260826085831_gucc_cn_version_and_character_facts_20260826.sql',
  '20260826085937_gucc_schema_guardrails_resources_creator_20260826.sql',
  '20260826090148_gucc_core_game_mechanisms_seed_20260826.sql',
  '20260826090225_gucc_creator_project_sync_triggers_20260826.sql',
  '20260826090950_gucc_creator_owner_fk_indexes_20260826.sql',
  '20260826230000_gucc_creator_phase1_revision_conflict_protection.sql',
  '20260827140034_creator_archive_state_guard.sql',
  '20260827143937_creator_archived_update_proof_guard.sql',
  '20260831043241_creator_distribution_identity_foundation.sql',
  '20260831043603_creator_distribution_identity_fk_indexes.sql',
  '20260831084516_creator_language_track_scoped_artifacts.sql',
]) {
  assert(sqlFiles.includes(required), `Missing production-synced migration: ${required}`);
}

for (const drifted of [
  '20260827222000_creator_archive_state_guard.sql',
  '20260827234000_creator_archived_update_proof_guard.sql',
  '20260831133000_creator_distribution_identity_foundation.sql',
  '20260831134500_creator_distribution_identity_fk_indexes.sql',
]) {
  assert(!sqlFiles.includes(drifted), `Drifted migration identity must not return: ${drifted}`);
}

console.log(`Migration discipline OK: ${seenVersions.size} strict migration(s), ${legacyAllowlist.size} legacy allowlisted file(s), WP_GLOB_001 + WP_GLOB_002 production identities pinned.`);
