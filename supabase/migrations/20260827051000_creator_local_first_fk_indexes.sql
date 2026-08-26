-- GUCC Creator OS Phase 2A follow-up: cover composite foreign keys reported by
-- the Supabase performance advisor. No rows or constraints are changed.

create index if not exists creator_file_locations_logical_owner_fk_idx
  on public.creator_file_locations (logical_file_id, project_id, owner_user_id);

create index if not exists creator_file_locations_project_owner_fk_idx
  on public.creator_file_locations (project_id, owner_user_id);
