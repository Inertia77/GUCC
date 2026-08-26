-- Production migration: 20260826090950 gucc_creator_owner_fk_indexes_20260826
-- Cover composite Creator Project ownership foreign keys in FK column order.

create index if not exists creator_project_files_project_owner_idx
  on public.creator_project_files(project_id, owner_user_id);
create index if not exists creator_project_events_project_owner_idx
  on public.creator_project_events(project_id, owner_user_id);
create index if not exists creator_project_releases_project_owner_idx
  on public.creator_project_releases(project_id, owner_user_id);
