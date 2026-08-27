const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const edge = fs.readFileSync(path.join(root, "supabase/functions/creator-project-api/index.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260827140034_creator_archive_state_guard.sql"), "utf8");
const refreshMigration = fs.readFileSync(path.join(root, "supabase/migrations/20260827143937_creator_archived_update_proof_guard.sql"), "utf8");

assert.match(migration, /creator_archive_transition_is_verified/i);
assert.match(migration, /guard_creator_archive_state_transition/i);
assert.match(migration, /before insert or update of current_state, project_data/i);
assert.match(migration, /new Creator projects cannot be created as ARCHIVED/i);
assert.match(migration, /ARCHIVED requires verified Google Drive archive metadata/i);
assert.match(migration, /ARCHIVED Creator project cannot be reopened/i);
assert.match(migration, /status[^\n]+published[\s\S]+provider[^\n]+google_drive/i);
assert.match(migration, /status[^\n]+manual_override[\s\S]+overrideReason/i);

assert.match(refreshMigration, /creator_archive_has_retained_drive_proof/i);
assert.match(refreshMigration, /creator_archive_preserves_prior_proof/i);
assert.match(refreshMigration, /old\.current_state <> 'ARCHIVED' and new\.current_state = 'ARCHIVED'/i);
assert.match(refreshMigration, /old\.current_state = 'ARCHIVED' and new\.current_state <> 'ARCHIVED'/i);
assert.match(refreshMigration, /old\.current_state = 'ARCHIVED' and new\.current_state = 'ARCHIVED'/i);
assert.match(refreshMigration, /pending[\s\S]+generating[\s\S]+generated[\s\S]+failed/i);
assert.match(refreshMigration, /preserve prior verified archive proof until replacement verification succeeds/i);
assert.match(refreshMigration, /folderId[\s\S]+mainFileId[\s\S]+verifiedAt[\s\S]+checksum/i);

assert.match(edge, /function guardGenericArchiveState/i, "Edge must reject generic ARCHIVED transitions before the DB RPC");
assert.match(edge, /guardGenericArchiveState\(existing, currentState\)/, "saveProject must invoke the Edge archive gate");
assert.match(edge, /projectWithoutServerMetadata\(project, existing\)/, "generic save must preserve server-owned archive metadata");
assert.match(edge, /recordArchivePublished[\s\S]+Remote verification metadata is incomplete/i);
assert.match(edge, /manualArchiveOverride[\s\S]+explicit reason/i);
assert.match(edge, /fingerprint/i, "archive generation should carry a deterministic package fingerprint");

console.log("creator archive server gate tests passed");
