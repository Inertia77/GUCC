-- Additive stabilization. No existing business state is rewritten.
create or replace function public.creator_os_lifecycle(d jsonb)
returns text language sql immutable security invoker set search_path='' as $$
 select case when nullif(d->>'deletedAt','') is not null then 'trash'
 when nullif(d->>'archivedAt','') is not null then 'archived'
 when nullif(d->>'completedAt','') is not null then 'completed' else 'active' end;
$$;
revoke all on function public.creator_os_lifecycle(jsonb) from public,anon;
grant execute on function public.creator_os_lifecycle(jsonb) to authenticated,service_role;
comment on function public.creator_os_lifecycle(jsonb) is 'Management lifecycle authority: Creator OS snapshot timestamps. creator_projects.current_state is production stage only.';
create index if not exists creator_os_snapshots_project_owner_idx on public.creator_os_workspace_snapshots(project_id,owner_user_id);

create table gucc_private.character_status_verifications(
 character_id uuid primary key references public.characters(id) on delete cascade,
 verified_by uuid not null references auth.users(id) on delete restrict,
 verified_at timestamptz not null,
 progress_updated_at timestamptz not null,
 source text not null check(source='human_ui'),
 research_status text not null check(research_status in ('◯','△','✕','対象外')),
 build_status text not null check(build_status in ('◯','△','✕','対象外'))
);
alter table gucc_private.character_status_verifications enable row level security;
revoke all on gucc_private.character_status_verifications from public,anon,authenticated;
-- Existing states intentionally get no verification rows.
create function gucc_private.character_verifications() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('character_id',cp.character_id,'updated_at',cp.updated_at,
   'verified_at',case when v.progress_updated_at=cp.updated_at and (v.research_status,v.build_status)=(cp.research_status,cp.build_status) then v.verified_at end,
   'source',case when v.progress_updated_at=cp.updated_at and (v.research_status,v.build_status)=(cp.research_status,cp.build_status) then v.source end)),'[]'::jsonb)
 from public.character_progress cp left join gucc_private.character_status_verifications v using(character_id)
 where auth.uid() is not null and exists(select 1 from public.app_users where user_id=auth.uid() and is_active);
$$;
revoke all on function gucc_private.character_verifications() from public,anon;
grant execute on function gucc_private.character_verifications() to authenticated;
create function public.character_status_verifications() returns jsonb language sql stable security invoker set search_path='' as $$
 select gucc_private.character_verifications();
$$;
revoke all on function public.character_status_verifications() from public,anon;
grant execute on function public.character_status_verifications() to authenticated;

CREATE OR REPLACE FUNCTION public.creator_os_portal_dashboard()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with allowed as (
    select auth.uid() as uid
    where auth.uid() is not null
      and exists (
        select 1 from public.app_users u
        where u.user_id=auth.uid() and u.is_active
      )
  ),
  joined as (
    select p.project_id,p.name as root_name,p.game as root_game,p.current_state as root_state,
      p.source_workspace_version,
      s.project_data as d,s.revision,s.updated_at as snapshot_updated,p.updated_at as root_updated
    from public.creator_projects p
    join allowed a on p.owner_user_id=a.uid
    left join public.creator_os_workspace_snapshots s
      on s.project_id=p.project_id and s.owner_user_id=p.owner_user_id
    order by greatest(p.updated_at,coalesce(s.updated_at,p.updated_at)) desc
    limit 500
  ),
  outlined as (
    select j.*,
      case
        when j.d is null then 'legacy'
        else public.creator_os_lifecycle(j.d)
      end as life,
      case when jsonb_typeof(j.d->'promptFlow')='array'
        then j.d->'promptFlow' else '[]'::jsonb end as nodes
    from joined j
  ),
  summary as (
    select x.*,
       jsonb_array_length(x.nodes) as total_nodes,
       (select count(*) from jsonb_array_elements(x.nodes) n
        where n->>'status' in ('DONE','SKIPPED')) as done_nodes,
       (select jsonb_build_object('name',n->>'name','id',n->>'promptId','status',n->>'status','executor',n->>'executor')
        from jsonb_array_elements(x.nodes) with ordinality a(n,pos)
        where coalesce(n->>'status','PENDING') not in ('DONE','SKIPPED','CANCELLED')
        order by pos limit 1) as next_node
    from outlined x
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'projectId',project_id,
    'name',coalesce(nullif(d->>'name',''),root_name),
    'game',coalesce(nullif(d->>'game',''),root_game),
    'version',coalesce(d->>'version',''),
    'topic',coalesce(d->>'idea',''),
    'status',coalesce(d->>'status','LEGACY'),
    'lifecycle',life,
    'currentState',root_state,
    'sourceVersion',source_workspace_version,
    'revision',coalesce(revision,0),
    'updatedAt',greatest(root_updated,coalesce(snapshot_updated,root_updated)),
    'completedAt',d->>'completedAt',
    'archivedAt',d->>'archivedAt',
    'deletedAt',d->>'deletedAt',
    'projectCode',d->>'projectCode',
    'videoCount',(select count(*) from public.creator_video_workspaces v where v.project_id=summary.project_id and v.owner_user_id=auth.uid()),
    'totalDeliverables',6*(select count(*) from public.creator_video_workspaces v where v.project_id=summary.project_id and v.owner_user_id=auth.uid()),
    'confirmedDeliverables',(select count(*) from public.creator_deliverable_records r where r.project_id=summary.project_id and r.owner_user_id=auth.uid() and r.status='confirmed'),
    'doneNodes',done_nodes,
    'totalNodes',total_nodes,
    'nextNode',next_node
  ) order by greatest(root_updated,coalesce(snapshot_updated,root_updated)) desc), '[]'::jsonb)
  from summary;
$function$;

CREATE OR REPLACE FUNCTION public.app_update_character_status(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_id uuid;
  v_research text;
  v_build text;
  v_result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.app_users
    where user_id = auth.uid() and is_active = true
  ) then
    raise exception 'GUCC authorization required' using errcode = '42501';
  end if;

  v_id := (p_payload->>'id')::uuid;
  v_research := trim(coalesce(p_payload->>'research_status',''));
  v_build := trim(coalesce(p_payload->>'build_status',''));
  if v_id is null or v_research not in ('◯','△','✕','対象外')
      or v_build not in ('◯','△','✕','対象外') then
    raise exception 'Character status requires id and two valid values';
  end if;
  if not exists (select 1 from public.characters where id = v_id) then
    raise exception 'Character not found';
  end if;
  perform 1 from public.characters where id=v_id for update;
  if p_payload ? 'expected_updated_at' and (select updated_at from public.character_progress where character_id=v_id) is distinct from (p_payload->>'expected_updated_at')::timestamptz then
    raise exception 'CHARACTER_STATUS_REVISION_CONFLICT' using errcode='40001';
  end if;
  insert into public.character_progress (character_id,research_status,build_status)
  values(v_id,v_research,v_build)
  on conflict(character_id) do update
  set research_status = excluded.research_status,
      build_status = excluded.build_status,
      updated_at = now();
  if p_payload->>'verification_source'='human_ui' then
    insert into gucc_private.character_status_verifications(character_id,verified_by,verified_at,progress_updated_at,source,research_status,build_status)
    values(v_id,auth.uid(),now(),(select updated_at from public.character_progress where character_id=v_id),'human_ui',v_research,v_build)
    on conflict(character_id) do update set verified_by=excluded.verified_by,verified_at=excluded.verified_at,progress_updated_at=excluded.progress_updated_at,
      source=excluded.source,research_status=excluded.research_status,build_status=excluded.build_status;
  end if;
  select jsonb_build_object(
    'id', c.id, 'research_status', cp.research_status,
    'build_status', cp.build_status, 'updated_at', cp.updated_at,
    'verification',(select to_jsonb(v)-'verified_by' from gucc_private.character_status_verifications v where v.character_id=c.id)
  ) into v_result
  from public.characters c
  join public.character_progress cp on cp.character_id=c.id
  where c.id = v_id;
  return v_result;
end $function$;
