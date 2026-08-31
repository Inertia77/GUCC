-- WP_GLOB_002 candidate migration. This file is intentionally staged outside
-- supabase/migrations until Production assigns the canonical migration version.
-- Final repository identity MUST match supabase_migrations.schema_migrations.

create table public.creator_language_tracks (
  language_track_id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  track_key text not null,
  language_code text not null,
  label text not null default '',
  is_source boolean not null default false,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_language_tracks_project_owner_fkey
    foreign key (project_id, owner_user_id)
    references public.creator_projects(project_id, owner_user_id)
    on delete cascade,
  constraint creator_language_tracks_track_project_owner_key
    unique (language_track_id, project_id, owner_user_id),
  constraint creator_language_tracks_project_track_key
    unique (project_id, owner_user_id, track_key),
  constraint creator_language_tracks_track_key_nonempty
    check (length(btrim(track_key)) between 1 and 160),
  constraint creator_language_tracks_language_code_nonempty
    check (length(btrim(language_code)) between 2 and 80),
  constraint creator_language_tracks_status_nonempty
    check (length(btrim(status)) between 1 and 80)
);

comment on table public.creator_language_tracks is
  'Language Track identity under one Content Project Root. Language Track is not a Distribution Variant and does not create a separate Creator Project.';
comment on column public.creator_language_tracks.language_code is
  'Open language/locale identity such as ZH, JA, EN, KO, FR, ES, DE or future locale tags. It is not a platform identity.';

create unique index creator_language_tracks_one_source_per_project_idx
  on public.creator_language_tracks (project_id, owner_user_id)
  where is_source;
create index creator_language_tracks_owner_idx
  on public.creator_language_tracks (owner_user_id, project_id, updated_at desc);

alter table public.creator_language_tracks enable row level security;

create policy creator_language_tracks_owner_select
  on public.creator_language_tracks for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy creator_language_tracks_owner_insert
  on public.creator_language_tracks for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy creator_language_tracks_owner_update
  on public.creator_language_tracks for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy creator_language_tracks_owner_delete
  on public.creator_language_tracks for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

revoke all on table public.creator_language_tracks from anon, authenticated;
grant select, insert, update, delete on table public.creator_language_tracks to service_role;

drop trigger if exists trg_creator_language_tracks_touch_updated_at on public.creator_language_tracks;
create trigger trg_creator_language_tracks_touch_updated_at
before update on public.creator_language_tracks
for each row execute function public.app_touch_updated_at();

-- Extend the existing logical-artifact registry in place. Existing IDs are
-- preserved; no row is deleted/reinserted during the backfill.
alter table public.creator_project_files
  add column artifact_scope_type text,
  add column artifact_scope_id text;

update public.creator_project_files
set artifact_scope_type = 'project',
    artifact_scope_id = project_id
where artifact_scope_type is null
   or artifact_scope_id is null;

alter table public.creator_project_files
  alter column artifact_scope_type set default 'project',
  alter column artifact_scope_type set not null,
  alter column artifact_scope_id set not null,
  add constraint creator_project_files_artifact_scope_type_chk
    check (artifact_scope_type in ('project', 'language_track', 'visual_master', 'variant'));

alter table public.creator_project_files
  drop constraint creator_project_files_project_id_file_key_key;

alter table public.creator_project_files
  add constraint creator_project_files_scoped_file_key_key
    unique (project_id, artifact_scope_type, artifact_scope_id, file_key);

comment on column public.creator_project_files.artifact_scope_type is
  'Logical Artifact scope identity. project and language_track are implemented in WP_GLOB_002; visual_master and variant are reserved identifiers for later child-identity work.';
comment on column public.creator_project_files.artifact_scope_id is
  'Scope owner identity. project scope uses project_id; language_track scope uses creator_language_tracks.language_track_id as text.';

-- Legacy callers that omit scope remain Project-scoped. Language-track scope
-- is ownership-validated against the same project/owner. Reserved future scope
-- names cannot be written until their dedicated contracts are explicitly added.
create or replace function public.app_guard_creator_artifact_scope()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
begin
  new.artifact_scope_type := coalesce(nullif(btrim(new.artifact_scope_type), ''), 'project');

  if new.artifact_scope_type = 'project' then
    new.artifact_scope_id := coalesce(nullif(btrim(new.artifact_scope_id), ''), new.project_id);
    if new.artifact_scope_id <> new.project_id then
      raise exception 'project artifact scope_id must equal project_id';
    end if;
  elsif new.artifact_scope_type = 'language_track' then
    if nullif(btrim(new.artifact_scope_id), '') is null then
      raise exception 'language_track artifact requires artifact_scope_id';
    end if;
    if not exists (
      select 1
      from public.creator_language_tracks t
      where t.language_track_id::text = new.artifact_scope_id
        and t.project_id = new.project_id
        and t.owner_user_id = new.owner_user_id
    ) then
      raise exception 'language_track artifact scope ownership mismatch';
    end if;
  elsif new.artifact_scope_type in ('visual_master', 'variant') then
    raise exception 'artifact scope % is reserved but not writable in WP_GLOB_002', new.artifact_scope_type;
  else
    raise exception 'unsupported artifact scope type: %', new.artifact_scope_type;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_creator_project_files_scope_guard on public.creator_project_files;
create trigger trg_creator_project_files_scope_guard
before insert or update of project_id, owner_user_id, artifact_scope_type, artifact_scope_id
on public.creator_project_files
for each row execute function public.app_guard_creator_artifact_scope();

-- Project-data pruning remains strictly a Legacy/default Project-scope concern.
-- Child scoped artifacts are never deleted merely because project_data.files does
-- not contain their file_key.
create or replace function public.app_prune_creator_project_files()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_files jsonb := coalesce(new.project_data->'files', '{}'::jsonb);
begin
  if jsonb_typeof(v_files) <> 'object' then
    v_files := '{}'::jsonb;
  end if;

  delete from public.creator_project_files f
  where f.project_id = new.project_id
    and f.owner_user_id = new.owner_user_id
    and f.artifact_scope_type = 'project'
    and f.artifact_scope_id = new.project_id
    and not (v_files ? f.file_key);

  return new;
end;
$function$;

-- Backward-compatible revision save: p_files may optionally contain explicit
-- artifact_scope_type / artifact_scope_id. Legacy payloads omit both and are
-- normalized to Project scope. Scoped upserts never overwrite a child artifact.
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
set search_path to ''
as $function$
declare
  v_current public.creator_projects%rowtype;
  v_revision bigint;
  v_now timestamptz := now();
begin
  if p_owner_user_id is null or nullif(btrim(p_project_id), '') is null then
    return jsonb_build_object('status', 'invalid', 'message', 'owner and project id are required');
  end if;

  select * into v_current
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
    project_id, owner_user_id, artifact_scope_type, artifact_scope_id,
    file_key, relative_path, kind, status, storage_provider,
    provider_file_id, provider_url, filename, mime_type, size_bytes, checksum, metadata, updated_at
  )
  select
    p_project_id,
    p_owner_user_id,
    coalesce(nullif(btrim(f.artifact_scope_type), ''), 'project'),
    case
      when coalesce(nullif(btrim(f.artifact_scope_type), ''), 'project') = 'project'
        then coalesce(nullif(btrim(f.artifact_scope_id), ''), p_project_id)
      else nullif(btrim(f.artifact_scope_id), '')
    end,
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
    artifact_scope_type text,
    artifact_scope_id text,
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
  on conflict (project_id, artifact_scope_type, artifact_scope_id, file_key) do update
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
$function$;

notify pgrst, 'reload schema';
