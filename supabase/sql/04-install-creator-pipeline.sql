-- GUCC unified AI creator pipeline
-- Canonical project state lives in creator_projects.project_data.
-- Large binaries stay outside Postgres (Google Drive / local project directory);
-- creator_project_files stores only their metadata and provider pointers.

create table if not exists public.creator_projects (
  project_id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  game text not null default '',
  topic text not null default '',
  project_type text not null default 'A_FULL_GUIDE',
  current_state text not null default 'IDEA',
  target_publish_date date,
  locks jsonb not null default '{}'::jsonb,
  drive_root_id text,
  drive_root_url text,
  drive_folder_id text,
  drive_folder_url text,
  source_workspace_version text,
  project_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists creator_projects_owner_updated_idx
  on public.creator_projects (owner_user_id, updated_at desc);
create index if not exists creator_projects_owner_state_idx
  on public.creator_projects (owner_user_id, current_state);

create table if not exists public.creator_project_files (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.creator_projects(project_id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  file_key text not null,
  relative_path text not null default '',
  kind text not null default 'other',
  status text not null default 'Missing',
  storage_provider text not null default 'local',
  provider_file_id text,
  provider_url text,
  filename text,
  mime_type text,
  size_bytes bigint,
  checksum text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, file_key)
);
create index if not exists creator_project_files_owner_project_idx
  on public.creator_project_files (owner_user_id, project_id);

create table if not exists public.creator_project_events (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.creator_projects(project_id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  state text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists creator_project_events_project_created_idx
  on public.creator_project_events (project_id, created_at desc);
create index if not exists creator_project_events_owner_created_idx
  on public.creator_project_events (owner_user_id, created_at desc);

create table if not exists public.creator_project_releases (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.creator_projects(project_id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  status text not null default 'draft',
  post_url text,
  post_id text,
  published_at timestamptz,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, platform)
);
create index if not exists creator_project_releases_owner_project_idx
  on public.creator_project_releases (owner_user_id, project_id);

-- Defense in depth. The browser does not receive table grants; all normal
-- creator-project writes go through creator-project-api after Auth + app_users checks.
alter table public.creator_projects enable row level security;
alter table public.creator_project_files enable row level security;
alter table public.creator_project_events enable row level security;
alter table public.creator_project_releases enable row level security;

revoke all on table public.creator_projects from anon, authenticated;
revoke all on table public.creator_project_files from anon, authenticated;
revoke all on table public.creator_project_events from anon, authenticated;
revoke all on table public.creator_project_releases from anon, authenticated;

grant select, insert, update, delete on table public.creator_projects to service_role;
grant select, insert, update, delete on table public.creator_project_files to service_role;
grant select, insert, update, delete on table public.creator_project_events to service_role;
grant select, insert, update, delete on table public.creator_project_releases to service_role;

drop policy if exists creator_projects_owner_select on public.creator_projects;
drop policy if exists creator_projects_owner_insert on public.creator_projects;
drop policy if exists creator_projects_owner_update on public.creator_projects;
drop policy if exists creator_projects_owner_delete on public.creator_projects;
create policy creator_projects_owner_select on public.creator_projects for select to authenticated
  using ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id);
create policy creator_projects_owner_insert on public.creator_projects for insert to authenticated
  with check ((select auth.uid()) is not null and (select auth.uid()) = owner_user_id);
create policy creator_projects_owner_update on public.creator_projects for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy creator_projects_owner_delete on public.creator_projects for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists creator_project_files_owner_select on public.creator_project_files;
drop policy if exists creator_project_files_owner_insert on public.creator_project_files;
drop policy if exists creator_project_files_owner_update on public.creator_project_files;
drop policy if exists creator_project_files_owner_delete on public.creator_project_files;
create policy creator_project_files_owner_select on public.creator_project_files for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy creator_project_files_owner_insert on public.creator_project_files for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy creator_project_files_owner_update on public.creator_project_files for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy creator_project_files_owner_delete on public.creator_project_files for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists creator_project_events_owner_select on public.creator_project_events;
drop policy if exists creator_project_events_owner_insert on public.creator_project_events;
create policy creator_project_events_owner_select on public.creator_project_events for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy creator_project_events_owner_insert on public.creator_project_events for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists creator_project_releases_owner_select on public.creator_project_releases;
drop policy if exists creator_project_releases_owner_insert on public.creator_project_releases;
drop policy if exists creator_project_releases_owner_update on public.creator_project_releases;
drop policy if exists creator_project_releases_owner_delete on public.creator_project_releases;
create policy creator_project_releases_owner_select on public.creator_project_releases for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy creator_project_releases_owner_insert on public.creator_project_releases for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy creator_project_releases_owner_update on public.creator_project_releases for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy creator_project_releases_owner_delete on public.creator_project_releases for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

notify pgrst, 'reload schema';
