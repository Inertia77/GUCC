-- GUCC Unified Creative Workspace: strictly additive, zero historic row rewriting.
-- A video is a stable child of creator_projects. A deliverable is scoped to that
-- video; no binary files, absolute local paths or signed URLs are stored here.
create table if not exists public.creator_video_workspaces (
 project_id text not null references public.creator_projects(project_id) on delete restrict,
 video_id text not null check (length(video_id) between 1 and 120),
 owner_user_id uuid not null default auth.uid(),
 title text not null check (length(btrim(title)) between 1 and 240),
 kind text not null default 'video',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (project_id,video_id)
);
create index if not exists creator_video_workspaces_owner_updated_idx on public.creator_video_workspaces(owner_user_id,updated_at desc);
alter table public.creator_video_workspaces enable row level security;
drop policy if exists creator_video_workspaces_owner_select on public.creator_video_workspaces;
create policy creator_video_workspaces_owner_select on public.creator_video_workspaces for select to authenticated
 using ((select auth.uid())=owner_user_id and exists
 (select 1 from public.creator_projects p where p.project_id=creator_video_workspaces.project_id and p.owner_user_id=creator_video_workspaces.owner_user_id));
drop policy if exists creator_video_workspaces_owner_insert on public.creator_video_workspaces;
create policy creator_video_workspaces_owner_insert on public.creator_video_workspaces for insert to authenticated
 with check ((select auth.uid())=owner_user_id and exists
 (select 1 from public.creator_projects p where p.project_id=creator_video_workspaces.project_id and p.owner_user_id=creator_video_workspaces.owner_user_id));
drop policy if exists creator_video_workspaces_owner_update on public.creator_video_workspaces;
create policy creator_video_workspaces_owner_update on public.creator_video_workspaces for update to authenticated
 using ((select auth.uid())=owner_user_id) with check ((select auth.uid())=owner_user_id and exists
 (select 1 from public.creator_projects p where p.project_id=creator_video_workspaces.project_id and p.owner_user_id=creator_video_workspaces.owner_user_id));
create table if not exists public.creator_deliverable_records (
 project_id text not null,
 video_id text not null,
 deliverable_key text not null check (deliverable_key in ('script','subtitle','visual','sound','cover','publish')),
 owner_user_id uuid not null default auth.uid(),
 status text not null default 'not_started' check (status in ('not_started','in_progress','review','confirmed','blocked')),
 evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
 review_note text not null default '',
 reviewed_at timestamptz,
 revision bigint not null default 1 check (revision>=1),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(project_id,video_id,deliverable_key),
 foreign key (project_id,video_id) references public.creator_video_workspaces(project_id,video_id) on delete restrict,
 check (status<>'confirmed' or (reviewed_at is not null and length(coalesce(evidence->>'fileName',''))>0 and coalesce((evidence->>'sizeBytes')::bigint,0)>0 and evidence->>'humanConfirmed'='true'))
);
create index if not exists creator_deliverable_records_owner_updated_idx on public.creator_deliverable_records(owner_user_id,updated_at desc);
alter table public.creator_deliverable_records enable row level security;
drop policy if exists creator_deliverable_records_owner_select on public.creator_deliverable_records;
create policy creator_deliverable_records_owner_select on public.creator_deliverable_records for select to authenticated
 using ((select auth.uid())=owner_user_id and exists
 (select 1 from public.creator_video_workspaces v where v.project_id=creator_deliverable_records.project_id and v.video_id=creator_deliverable_records.video_id and v.owner_user_id=creator_deliverable_records.owner_user_id));
drop policy if exists creator_deliverable_records_owner_insert on public.creator_deliverable_records;
create policy creator_deliverable_records_owner_insert on public.creator_deliverable_records for insert to authenticated
 with check ((select auth.uid())=owner_user_id and exists
 (select 1 from public.creator_video_workspaces v where v.project_id=creator_deliverable_records.project_id and v.video_id=creator_deliverable_records.video_id and v.owner_user_id=creator_deliverable_records.owner_user_id));
drop policy if exists creator_deliverable_records_owner_update on public.creator_deliverable_records;
create policy creator_deliverable_records_owner_update on public.creator_deliverable_records for update to authenticated
 using ((select auth.uid())=owner_user_id) with check ((select auth.uid())=owner_user_id and exists
 (select 1 from public.creator_video_workspaces v where v.project_id=creator_deliverable_records.project_id and v.video_id=creator_deliverable_records.video_id and v.owner_user_id=creator_deliverable_records.owner_user_id));
-- CAS updates via a SECURITY INVOKER function; no bypass of RLS.
create or replace function public.creator_workspace_save_deliverable(
 p_project_id text,p_video_id text,p_key text,p_status text,p_evidence jsonb,
 p_note text,p_expected_revision bigint
) returns public.creator_deliverable_records language plpgsql security invoker
 set search_path = pg_catalog,public
as $$
declare result_row public.creator_deliverable_records;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 if p_key not in ('script','subtitle','visual','sound','cover','publish')
 or p_status not in ('not_started','in_progress','review','confirmed','blocked')
 or jsonb_typeof(p_evidence) <> 'object' or p_expected_revision < 0 then raise exception 'Invalid deliverable payload'; end if;
 if p_status='confirmed' and (
    coalesce(p_evidence->>'humanConfirmed','') <> 'true' or
    coalesce(p_evidence->>'fileName','')='' or
    coalesce((p_evidence->>'sizeBytes')::bigint,0)<=0
 ) then raise exception 'Confirmed requires an observed file and human QC'; end if;
 if p_expected_revision=0 then
  insert into public.creator_deliverable_records
    (project_id,video_id,deliverable_key,owner_user_id,status,evidence,review_note,reviewed_at)
  values(p_project_id,p_video_id,p_key,auth.uid(),p_status,p_evidence,left(coalesce(p_note,''),2000),
    case when p_status='confirmed' then now() else null end)
  on conflict do nothing returning * into result_row;
 else
  update public.creator_deliverable_records set
   status=p_status,evidence=p_evidence,review_note=left(coalesce(p_note,''),2000),
   reviewed_at=case when p_status='confirmed' then now() else null end,
   revision=revision+1,updated_at=now()
  where project_id=p_project_id and video_id=p_video_id and deliverable_key=p_key
   and revision=p_expected_revision and owner_user_id=auth.uid()
  returning * into result_row;
 end if;
 if result_row.project_id is null then raise exception 'Revision conflict or video inaccessible: refresh before saving'; end if;
 return result_row;
end $$;
revoke all on function public.creator_workspace_save_deliverable(text,text,text,text,jsonb,text,bigint) from public,anon;
grant execute on function public.creator_workspace_save_deliverable(text,text,text,text,jsonb,text,bigint) to authenticated;
grant select,insert,update on public.creator_video_workspaces to authenticated;
grant select,insert,update on public.creator_deliverable_records to authenticated;
revoke all on public.creator_video_workspaces from anon;
revoke all on public.creator_deliverable_records from anon;
