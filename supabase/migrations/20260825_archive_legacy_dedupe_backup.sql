-- Move the legacy dedupe backup out of the public API schema.
-- The table remains available for rollback/audit but is no longer part of the live public data model.
alter table if exists public.resource_relations_dedupe_backup set schema gucc_backup;
alter table if exists gucc_backup.resource_relations_dedupe_backup rename to resource_relations_dedupe_backup_legacy;
