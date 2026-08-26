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

-- Phase 1 optimistic concurrency and atomic project/file save.
+-- GUCC Creator OS Phase 1: optimistic concurrency for canonical creator projects.
-- The API supplies base_revision. Project JSON and its file metadata commit in one transaction.

alter table public.creator_projects
  add column if not exists revision bigint not null default 1,
  add column if not exists last_device_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'creator_projects_revision_positive'
      and conrelid = 'public.creator_projects'::regclass
  ) then
    alter table public.creator_projects
      add constraint creator_projects_revision_positive check (revision > 0);
  end if;
end $$;

create index if not exists creator_projects_owner_active_target_idx
  on public.creator_projects (owner_user_id, target_publish_date, updated_at desc)
  where archived_at is null;

create or replace function public.save_creator_project_revision(
  p_owner_user_id uuid,
  p_project_id text,
  p_base_revision bigint,
  p_device_id text,
  p_project_row jsonb,
  p_files jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current public.creator_projects%rowtype;
  v_revision bigint;
  v_now timestamptz := now();
begin
  if p_owner_user_id is null or nullif(btrim(p_project_id), '') is null then
    return jsonb_build_object('status', 'invalid', 'message', 'owner and project id are required');
  end if;

  select *
    into v_current
    from public.creator_projects
   where project_id = p_project_id
   for update;

  if not found then
    if coalesce(p_base_revision, 0) <> 0 then
      return jsonb_build_object('status', 'conflict', 'current_revision', 0, 'project', null);
    end if;

    insert into public.creator_projects (
      project_id, owner_user_id, name, game, topic, project_type, current_state,
      target_publish_date, locks, drive_root_id, drive_root_url, drive_folder_id,
      drive_folder_url, source_workspace_version, project_data, archived_at,
      revision, last_device_id, updated_at
    ) values (
      p_project_id,
      p_owner_user_id,
      coalesce(p_project_row ->> 'name', ''),
      coalesce(p_project_row ->> 'game', ''),
      coalesce(p_project_row ->> 'topic', ''),
      coalesce(nullif(p_project_row ->> 'project_type', ''), 'A_FULL_GUIDE'),
      coalesce(nullif(p_project_row ->> 'current_state', ''), 'IDEA'),
      nullif(p_project_row ->> 'target_publish_date', '')::date,
      coalesce(p_project_row -> 'locks', '{}'::jsonb),
      nullif(p_project_row ->> 'drive_root_id', ''),
      nullif(p_project_row ->> 'drive_root_url', ''),
      nullif(p_project_row ->> 'drive_folder_id', ''),
      nullif(p_project_row ->> 'drive_folder_url', ''),
      nullif(p_project_row ->> 'source_workspace_version', ''),
      coalesce(p_project_row -> 'project_data', '{}'::jsonb),
      case when p_project_row ->> 'current_state' = 'ARCHIVED' then v_now else null end,
      1,
      nullif(btrim(p_device_id), ''),
      v_now
    )
    on conflict (project_id) do nothing
    returning * into v_current;
    if not found then
      select * into v_current from public.creator_projects where project_id = p_project_id;
      if v_current.owner_user_id <> p_owner_user_id then
        return jsonb_build_object('status', 'forbidden');
      end if;
      return jsonb_build_object(
        'status', 'conflict',
        'current_revision', coalesce(v_current.revision, 0),
        'project', case when v_current.project_id is null then null else to_jsonb(v_current) end
      );
    end if;
    v_revision := 1;
  else
    if v_current.owner_user_id <> p_owner_user_id then
      return jsonb_build_object('status', 'forbidden');
    end if;
    if p_base_revision is null or p_base_revision <> v_current.revision then
      return jsonb_build_object(
        'status', 'conflict',
        'current_revision', v_current.revision,
        'project', to_jsonb(v_current)
      );
    end if;

    v_revision := v_current.revision + 1;
    update public.creator_projects
       set name = coalesce(p_project_row ->> 'name', ''),
           game = coalesce(p_project_row ->> 'game', ''),
           topic = coalesce(p_project_row ->> 'topic', ''),
           project_type = coalesce(nullif(p_project_row ->> 'project_type', ''), 'A_FULL_GUIDE'),
           current_state = coalesce(nullif(p_project_row ->> 'current_state', ''), 'IDEA'),
           target_publish_date = nullif(p_project_row ->> 'target_publish_date', '')::date,
           locks = coalesce(p_project_row -> 'locks', '{}'::jsonb),
           drive_root_id = nullif(p_project_row ->> 'drive_root_id', ''),
           drive_root_url = nullif(p_project_row ->> 'drive_root_url', ''),
           drive_folder_id = nullif(p_project_row ->> 'drive_folder_id', ''),
           drive_folder_url = nullif(p_project_row ->> 'drive_folder_url', ''),
           source_workspace_version = nullif(p_project_row ->> 'source_workspace_version', ''),
           project_data = coalesce(p_project_row -> 'project_data', '{}'::jsonb),
           archived_at = case when p_project_row ->> 'current_state' = 'ARCHIVED' then coalesce(archived_at, v_now) else null end,
           revision = v_revision,
           last_device_id = nullif(btrim(p_device_id), ''),
           updated_at = v_now
     where project_id = p_project_id
       and owner_user_id = p_owner_user_id
       and revision = p_base_revision
    returning * into v_current;

    if not found then
      select * into v_current from public.creator_projects where project_id = p_project_id;
      return jsonb_build_object(
        'status', 'conflict',
        'current_revision', coalesce(v_current.revision, 0),
        'project', case when v_current.project_id is null then null else to_jsonb(v_current) end
      );
    end if;
  end if;

  insert into public.creator_project_files (
    project_id, owner_user_id, file_key, relative_path, kind, status, storage_provider,
    provider_file_id, provider_url, filename, mime_type, size_bytes, checksum, metadata, updated_at
  )
  select
    p_project_id,
    p_owner_user_id,
    f.file_key,
    coalesce(f.relative_path, ''),
    coalesce(f.kind, 'other'),
    coalesce(f.status, 'Missing'),
    coalesce(f.storage_provider, 'local'),
    f.provider_file_id,
    f.provider_url,
    f.filename,
    f.mime_type,
    f.size_bytes,
    f.checksum,
    coalesce(f.metadata, '{}'::jsonb),
    v_now
  from jsonb_to_recordset(
    case when jsonb_typeof(p_files) = 'array' then p_files else '[]'::jsonb end
  ) as f(
    file_key text,
    relative_path text,
    kind text,
    status text,
    storage_provider text,
    provider_file_id text,
    provider_url text,
    filename text,
    mime_type text,
    size_bytes bigint,
    checksum text,
    metadata jsonb
  )
  where nullif(btrim(f.file_key), '') is not null
  on conflict (project_id, file_key) do update
    set owner_user_id = excluded.owner_user_id,
        relative_path = excluded.relative_path,
        kind = excluded.kind,
        status = excluded.status,
        storage_provider = excluded.storage_provider,
        provider_file_id = excluded.provider_file_id,
        provider_url = excluded.provider_url,
        filename = excluded.filename,
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        checksum = excluded.checksum,
        metadata = excluded.metadata,
        updated_at = excluded.updated_at;

  return jsonb_build_object(
    'status', 'saved',
    'revision', v_revision,
    'project', to_jsonb(v_current)
  );
end;
$$;

revoke all on function public.save_creator_project_revision(uuid, text, bigint, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_creator_project_revision(uuid, text, bigint, text, jsonb, jsonb)
  to service_role;

notify pgrst, 'reload schema';
