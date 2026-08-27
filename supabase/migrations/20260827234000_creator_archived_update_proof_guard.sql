-- Creator OS Phase 2B follow-up: an already ARCHIVED project may refresh its
-- lightweight Drive archive without reopening the project. During the worker's
-- pending/generating/generated/failed states, the prior verified proof must stay
-- attached to the row. A first transition into ARCHIVED still requires final
-- published Drive proof or an explicit manual override reason.

create or replace function public.creator_archive_has_retained_drive_proof(p_archive jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_archive ->> 'provider', '') = 'google_drive'
     and nullif(btrim(coalesce(p_archive ->> 'folderId', '')), '') is not null
     and nullif(btrim(coalesce(p_archive ->> 'mainFileId', '')), '') is not null
     and coalesce(p_archive ->> 'folderUrl', '') like 'https://drive.google.com/%'
     and coalesce(p_archive ->> 'mainFileUrl', '') like 'https://drive.google.com/%'
     and nullif(btrim(coalesce(p_archive ->> 'verifiedAt', '')), '') is not null
     and nullif(btrim(coalesce(p_archive ->> 'checksum', '')), '') is not null;
$$;

create or replace function public.creator_archive_preserves_prior_proof(
  p_old_archive jsonb,
  p_new_archive jsonb
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when public.creator_archive_has_retained_drive_proof(p_old_archive)
      then public.creator_archive_has_retained_drive_proof(p_new_archive)
       and coalesce(p_new_archive ->> 'folderId', '') = coalesce(p_old_archive ->> 'folderId', '')
       and coalesce(p_new_archive ->> 'mainFileId', '') = coalesce(p_old_archive ->> 'mainFileId', '')
       and coalesce(p_new_archive ->> 'folderUrl', '') = coalesce(p_old_archive ->> 'folderUrl', '')
       and coalesce(p_new_archive ->> 'mainFileUrl', '') = coalesce(p_old_archive ->> 'mainFileUrl', '')
       and coalesce(p_new_archive ->> 'verifiedAt', '') = coalesce(p_old_archive ->> 'verifiedAt', '')
       and coalesce(p_new_archive ->> 'checksum', '') = coalesce(p_old_archive ->> 'checksum', '')
    when nullif(btrim(coalesce(p_old_archive ->> 'overrideReason', '')), '') is not null
      then coalesce(p_new_archive ->> 'overrideReason', '') = coalesce(p_old_archive ->> 'overrideReason', '')
    else false
  end;
$$;

revoke all on function public.creator_archive_has_retained_drive_proof(jsonb) from public;
revoke all on function public.creator_archive_has_retained_drive_proof(jsonb) from anon;
revoke all on function public.creator_archive_has_retained_drive_proof(jsonb) from authenticated;
revoke all on function public.creator_archive_preserves_prior_proof(jsonb, jsonb) from public;
revoke all on function public.creator_archive_preserves_prior_proof(jsonb, jsonb) from anon;
revoke all on function public.creator_archive_preserves_prior_proof(jsonb, jsonb) from authenticated;

create or replace function public.guard_creator_archive_state_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_archive jsonb := coalesce(new.project_data #> '{integration,archive}', '{}'::jsonb);
  v_old_archive jsonb := case
    when tg_op = 'UPDATE' then coalesce(old.project_data #> '{integration,archive}', '{}'::jsonb)
    else '{}'::jsonb
  end;
  v_new_status text := coalesce(v_new_archive ->> 'status', '');
begin
  if tg_op = 'INSERT' then
    if new.current_state = 'ARCHIVED' and not public.creator_archive_transition_is_verified(v_new_archive) then
      raise exception using
        errcode = '23514',
        message = 'ARCHIVE_STATE_GATE: new Creator projects cannot be created as ARCHIVED without verified archive metadata';
    end if;
    return new;
  end if;

  if old.current_state = 'ARCHIVED' and new.current_state <> 'ARCHIVED' then
    raise exception using
      errcode = '23514',
      message = 'ARCHIVE_STATE_GATE: an ARCHIVED Creator project cannot be reopened by a generic project update';
  end if;

  -- First entry into ARCHIVED is a final transition. Transient worker metadata
  -- cannot be used to cross the state boundary.
  if old.current_state <> 'ARCHIVED' and new.current_state = 'ARCHIVED'
     and not public.creator_archive_transition_is_verified(v_new_archive) then
    raise exception using
      errcode = '23514',
      message = 'ARCHIVE_STATE_GATE: ARCHIVED requires verified Google Drive archive metadata or an explicit manual override reason';
  end if;

  -- Once ARCHIVED, an archive refresh keeps the project ARCHIVED. The worker may
  -- temporarily move archive.status through its internal pipeline, but it must
  -- carry forward the prior remote proof/override until a newly verified final
  -- published payload replaces it.
  if old.current_state = 'ARCHIVED' and new.current_state = 'ARCHIVED' then
    if public.creator_archive_transition_is_verified(v_new_archive) then
      return new;
    end if;

    if v_new_status in ('pending', 'generating', 'generated', 'failed')
       and public.creator_archive_preserves_prior_proof(v_old_archive, v_new_archive) then
      return new;
    end if;

    raise exception using
      errcode = '23514',
      message = 'ARCHIVE_STATE_GATE: ARCHIVED archive refresh must preserve prior verified archive proof until replacement verification succeeds';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_creator_archive_state_transition() from public;
revoke all on function public.guard_creator_archive_state_transition() from anon;
revoke all on function public.guard_creator_archive_state_transition() from authenticated;

-- Keep the trigger definition explicit and idempotent for production replay.
drop trigger if exists creator_archive_state_guard on public.creator_projects;
create trigger creator_archive_state_guard
before insert or update of current_state, project_data
on public.creator_projects
for each row
execute function public.guard_creator_archive_state_transition();
