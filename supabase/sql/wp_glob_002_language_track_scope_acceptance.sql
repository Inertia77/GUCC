-- WP_GLOB_002 Production acceptance probe.
-- Run only after 20260831084516_creator_language_track_scoped_artifacts.sql.
-- Every fixture/change is transaction-scoped and rolled back.

begin;

create temporary table wp_glob_002_ctx on commit drop as
select p.*,
       (select count(*) from public.creator_projects) as project_count_before,
       (select count(*) from public.creator_project_files) as file_count_before,
       (select md5(string_agg(f.id::text, ',' order by f.id::text)) from public.creator_project_files f) as file_id_digest_before
from public.creator_projects p
order by p.created_at
limit 1;

do $$
begin
  if not exists (select 1 from wp_glob_002_ctx) then
    raise exception 'WP_GLOB_002 requires one existing Creator Project';
  end if;
end $$;

-- CASE A: one Content Project owns three Language Tracks; Project count is unchanged.
insert into public.creator_language_tracks (
  project_id, owner_user_id, track_key, language_code, label, is_source, status, metadata
)
select project_id, owner_user_id, x.track_key, x.language_code, x.label, x.is_source, 'draft', jsonb_build_object('wp','WP_GLOB_002','case','A')
from wp_glob_002_ctx
cross join (values
  ('ZH_SOURCE','ZH','Chinese source',true),
  ('JA','JA','Japanese',false),
  ('EN','EN','English',false)
) as x(track_key, language_code, label, is_source);

-- CASE B/C/D: the same file_key may coexist across Project and Language Track scopes.
insert into public.creator_project_files (
  project_id, owner_user_id, artifact_scope_type, artifact_scope_id,
  file_key, relative_path, kind, status, storage_provider, metadata
)
select c.project_id, c.owner_user_id, 'language_track', t.language_track_id::text,
       k.file_key, 'wp_glob_002_fixture/' || lower(t.language_code) || '/' || k.file_key,
       'fixture', 'Ready', 'local', jsonb_build_object('wp','WP_GLOB_002','track',t.track_key,'case',k.case_name)
from wp_glob_002_ctx c
join public.creator_language_tracks t
  on t.project_id=c.project_id and t.owner_user_id=c.owner_user_id
cross join (values
  ('AUDIO_MASTER','B'),
  ('SUBTITLE_MASTER','C'),
  ('TIMELINE_SENTENCE','D'),
  ('TRANSCRIPT_ALIGNED','D'),
  ('ALIGNMENT_REPORT','D')
) as k(file_key, case_name);

do $$
declare
  c record;
  n integer;
  project_timeline integer;
  child_before jsonb;
  child_after jsonb;
  result jsonb;
begin
  select * into c from wp_glob_002_ctx limit 1;

  if (select count(*) from public.creator_projects) <> c.project_count_before then
    raise exception 'CASE A failed: creating Language Tracks changed Project count';
  end if;

  select count(*) into n
  from public.creator_language_tracks
  where project_id=c.project_id and owner_user_id=c.owner_user_id
    and language_code in ('ZH','JA','EN');
  if n <> 3 then raise exception 'CASE A failed: expected 3 Language Tracks, got %', n; end if;

  if (select count(*) from public.creator_language_tracks where project_id=c.project_id and owner_user_id=c.owner_user_id and is_source) <> 1 then
    raise exception 'CASE A failed: exactly one source track expected';
  end if;

  select count(*) into n
  from public.creator_project_files f
  join public.creator_language_tracks t on t.language_track_id::text=f.artifact_scope_id
  where f.project_id=c.project_id and f.owner_user_id=c.owner_user_id
    and f.artifact_scope_type='language_track'
    and f.file_key='AUDIO_MASTER'
    and t.language_code in ('ZH','JA','EN');
  if n <> 3 then raise exception 'CASE B failed: expected 3 scoped AUDIO_MASTER rows, got %', n; end if;

  select count(*) into n
  from public.creator_project_files f
  where f.project_id=c.project_id and f.owner_user_id=c.owner_user_id
    and f.file_key='SUBTITLE_MASTER'
    and (
      (f.artifact_scope_type='project' and f.artifact_scope_id=c.project_id)
      or f.artifact_scope_type='language_track'
    );
  if n <> 4 then raise exception 'CASE C failed: project + 3 language SUBTITLE_MASTER rows expected, got %', n; end if;

  select count(*) into project_timeline
  from public.creator_project_files f
  where f.project_id=c.project_id and f.owner_user_id=c.owner_user_id
    and f.artifact_scope_type='project' and f.artifact_scope_id=c.project_id
    and f.file_key in ('SUBTITLE_MASTER','TIMELINE_SENTENCE','TRANSCRIPT_ALIGNED','ALIGNMENT_REPORT');
  if project_timeline <> 4 then
    raise exception 'CASE D failed: Legacy/default Project Timeline bundle changed: %', project_timeline;
  end if;

  if exists (
    select 1
    from public.creator_language_tracks t
    where t.project_id=c.project_id and t.owner_user_id=c.owner_user_id
      and (select count(*) from public.creator_project_files f
           where f.project_id=c.project_id and f.owner_user_id=c.owner_user_id
             and f.artifact_scope_type='language_track'
             and f.artifact_scope_id=t.language_track_id::text
             and f.file_key in ('SUBTITLE_MASTER','TIMELINE_SENTENCE','TRANSCRIPT_ALIGNED','ALIGNMENT_REPORT')) <> 4
  ) then raise exception 'CASE D failed: each Language Track needs an independent 4-artifact Timeline bundle'; end if;

  select jsonb_object_agg(f.artifact_scope_id, f.metadata order by f.artifact_scope_id) into child_before
  from public.creator_project_files f
  where f.project_id=c.project_id and f.owner_user_id=c.owner_user_id
    and f.artifact_scope_type='language_track' and f.file_key='AUDIO_MASTER';

  -- CASE E: legacy p_files without scope defaults to Project scope and cannot overwrite children.
  select public.save_creator_project_revision(
    c.owner_user_id,
    c.project_id,
    c.revision,
    c.last_device_id,
    jsonb_build_object(
      'name', c.name,
      'game', c.game,
      'topic', c.topic,
      'project_type', c.project_type,
      'current_state', c.current_state,
      'target_publish_date', c.target_publish_date,
      'locks', c.locks,
      'drive_root_id', c.drive_root_id,
      'drive_root_url', c.drive_root_url,
      'drive_folder_id', c.drive_folder_id,
      'drive_folder_url', c.drive_folder_url,
      'source_workspace_version', c.source_workspace_version,
      'project_data', c.project_data
    ),
    jsonb_build_array(jsonb_build_object(
      'file_key','AUDIO_MASTER',
      'relative_path','03_AUDIO/AUDIO_MASTER.wav',
      'kind','audio',
      'status','Ready',
      'storage_provider','local',
      'metadata',jsonb_build_object('wp','WP_GLOB_002','case','E','legacyDefault',true)
    ))
  ) into result;

  if result->>'status' <> 'saved' then raise exception 'CASE E failed: legacy save returned %', result; end if;

  if not exists (
    select 1 from public.creator_project_files f
    where f.project_id=c.project_id and f.file_key='AUDIO_MASTER'
      and f.artifact_scope_type='project' and f.artifact_scope_id=c.project_id
      and f.metadata->>'legacyDefault'='true'
  ) then raise exception 'CASE E failed: legacy save did not target Project scope'; end if;

  select jsonb_object_agg(f.artifact_scope_id, f.metadata order by f.artifact_scope_id) into child_after
  from public.creator_project_files f
  where f.project_id=c.project_id and f.owner_user_id=c.owner_user_id
    and f.artifact_scope_type='language_track' and f.file_key='AUDIO_MASTER';
  if child_before is distinct from child_after then
    raise exception 'CASE E failed: legacy save overwrote Language Track AUDIO_MASTER';
  end if;

  -- The Project update invoked the existing prune trigger. Child artifacts must survive it.
  if (select count(*) from public.creator_project_files f where f.project_id=c.project_id and f.artifact_scope_type='language_track') <> 15 then
    raise exception 'CASE E failed: Project prune removed child scoped artifacts';
  end if;

  -- CASE F: all 48 pre-existing rows are Project-scope identities; their IDs must stay byte-for-byte the same.
  if (select md5(string_agg(f.id::text, ',' order by f.id::text))
      from public.creator_project_files f
      where f.artifact_scope_type='project') <> c.file_id_digest_before then
    raise exception 'CASE F failed: existing creator_project_files IDs changed';
  end if;
end $$;

-- CASE G: RLS remains enabled and authenticated direct CRUD remains revoked.
do $$
declare
  policy_count integer;
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='creator_language_tracks' and c.relrowsecurity
  ) then raise exception 'CASE G failed: creator_language_tracks RLS disabled'; end if;

  select count(*) into policy_count
  from pg_policies
  where schemaname='public' and tablename='creator_language_tracks'
    and policyname in (
      'creator_language_tracks_owner_select',
      'creator_language_tracks_owner_insert',
      'creator_language_tracks_owner_update',
      'creator_language_tracks_owner_delete'
    );
  if policy_count <> 4 then raise exception 'CASE G failed: expected 4 owner policies, got %', policy_count; end if;

  if has_table_privilege('authenticated','public.creator_language_tracks','SELECT')
     or has_table_privilege('authenticated','public.creator_language_tracks','INSERT')
     or has_table_privilege('authenticated','public.creator_language_tracks','UPDATE')
     or has_table_privilege('authenticated','public.creator_language_tracks','DELETE') then
    raise exception 'CASE G failed: authenticated direct Language Track CRUD unexpectedly granted';
  end if;
end $$;

-- CASE H: scoped identity is metadata only; no binary/media or absolute local paths.
do $$
declare
  n integer;
begin
  select count(*) into n
  from information_schema.columns
  where table_schema='public'
    and table_name in ('creator_language_tracks','creator_project_files')
    and data_type='bytea';
  if n <> 0 then raise exception 'CASE H failed: bytea media column introduced'; end if;

  if exists (
    select 1 from public.creator_project_files f
    where f.metadata->>'wp'='WP_GLOB_002'
      and (f.relative_path ~ '^[A-Za-z]:[\\/]' or f.relative_path ~ '^/' or f.relative_path ~ '^\\\\')
  ) then raise exception 'CASE H failed: absolute local path stored in scoped fixture'; end if;
end $$;

select
  'WP_GLOB_002_ACCEPTANCE_OK' as result,
  (select count(*) from public.creator_language_tracks where metadata->>'wp'='WP_GLOB_002') as language_tracks_inside_tx,
  (select count(*) from public.creator_project_files where metadata->>'wp'='WP_GLOB_002' and artifact_scope_type='language_track') as scoped_artifacts_inside_tx;

rollback;
