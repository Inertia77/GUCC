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
]) {
  assert(sqlFiles.includes(required), `Missing production-synced migration: ${required}`);
}

console.log(`Migration discipline OK: ${seenVersions.size} strict migration(s), ${legacyAllowlist.size} legacy allowlisted file(s).`);
