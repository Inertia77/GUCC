-- Creator OS Phase 2B: ARCHIVED is a server-controlled knowledge-archive state.
-- Generic project saves must not create, enter, or reopen ARCHIVED.

create or replace function public.creator_archive_transition_is_verified(p_archive jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(p_archive ->> 'status', '') = 'published'
      then coalesce(p_archive ->> 'provider', '') = 'google_drive'
       and nullif(btrim(coalesce(p_archive ->> 'folderId', '')), '') is not null
       and nullif(btrim(coalesce(p_archive ->> 'mainFileId', '')), '') is not null
       and nullif(btrim(coalesce(p_archive ->> 'verifiedAt', '')), '') is not null
       and nullif(btrim(coalesce(p_archive ->> 'checksum', '')), '') is not null
    when coalesce(p_archive ->> 'status', '') = 'manual_override'
      then nullif(btrim(coalesce(p_archive ->> 'overrideReason', '')), '') is not null
    else false
  end;
$$;

revoke all on function public.creator_archive_transition_is_verified(jsonb) from public;
revoke all on function public.creator_archive_transition_is_verified(jsonb) from anon;
revoke all on function public.creator_archive_transition_is_verified(jsonb) from authenticated;
grant execute on function public.creator_archive_transition_is_verified(jsonb) to service_role;

create or replace function public.guard_creator_archive_state_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_archive jsonb := coalesce(new.project_data #> '{integration,archive}', '{}'::jsonb);
begin
  if tg_op = 'INSERT' then
    if new.current_state = 'ARCHIVED' and not public.creator_archive_transition_is_verified(v_archive) then
      raise exception using
        errcode = '23514',
        message = 'ARCHIVE_STATE_GATE: new Creator projects cannot be created as ARCHIVED without verified archive metadata';
    end if;
    return new;
  end if;

  if old.current_state <> 'ARCHIVED' and new.current_state = 'ARCHIVED' then
    if not public.creator_archive_transition_is_verified(v_archive) then
      raise exception using
        errcode = '23514',
        message = 'ARCHIVE_STATE_GATE: ARCHIVED requires verified Google Drive archive metadata or an explicit manual override reason';
    end if;
  elsif old.current_state = 'ARCHIVED' and new.current_state <> 'ARCHIVED' then
    raise exception using
      errcode = '23514',
      message = 'ARCHIVE_STATE_GATE: an ARCHIVED Creator project cannot be reopened by a generic project update';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_creator_archive_state_transition() from public;
revoke all on function public.guard_creator_archive_state_transition() from anon;
revoke all on function public.guard_creator_archive_state_transition() from authenticated;

-- Trigger functions are invoked by PostgreSQL itself; no client EXECUTE grant is needed.
drop trigger if exists creator_archive_state_guard on public.creator_projects;
create trigger creator_archive_state_guard
before insert or update of current_state, project_data
on public.creator_projects
for each row
execute function public.guard_creator_archive_state_transition();
