-- Preserve canonical VIDEO_ID separately from the old prompt-flow FOLDER / branch.
alter table public.creator_video_workspaces add column if not exists legacy_branch text;
create or replace function gucc_private.creator_workspace_snapshot_videos() returns trigger language plpgsql security definer set search_path='' as $$
declare v jsonb; merged jsonb;
begin
 for v in select value from jsonb_array_elements(coalesce(new.project_data->'videos','[]')) loop
  if coalesce(v->>'videoId','')='' or length(v->>'videoId')>120 then raise exception 'INVALID_VIDEO_ID'; end if;
  insert into public.creator_video_workspaces(project_id,video_id,owner_user_id,title,legacy_branch)
   values(new.project_id,v->>'videoId',new.owner_user_id,left(coalesce(nullif(v->>'name',''),nullif(v->>'title',''),v->>'videoId'),240),coalesce(v->>'branch',v->>'videoId')) on conflict do nothing;
 end loop;
 select coalesce(jsonb_agg(coalesce((select x from jsonb_array_elements(coalesce(new.project_data->'videos','[]')) x where x->>'videoId'=w.video_id limit 1),
  jsonb_build_object('videoId',w.video_id,'branch',coalesce(w.legacy_branch,w.video_id),'name',w.title)) order by w.created_at,w.video_id),'[]') into merged
  from public.creator_video_workspaces w where w.project_id=new.project_id and w.owner_user_id=new.owner_user_id;
 new.project_data=jsonb_set(new.project_data,'{videos}',merged);
 return new;
end $$;

-- Safe deterministic recovery only from an explicit original contract AND a matching
-- existing flow branch. Names alone are never used. No files or Locks are altered.
do $$
declare s record; v jsonb; vs jsonb; id text; branch text;
begin
 for s in select * from public.creator_os_workspace_snapshots where coalesce(jsonb_array_length(project_data->'videos'),0)=0 loop
  vs='[]';
  for v in select value from jsonb_array_elements(coalesce(s.project_data->'rawVideoContract'->'VIDEO_TRACKS','[]')) loop
   id=coalesce(v->>'VIDEO_ID',v->>'videoId');branch=coalesce(v->>'FOLDER',v->>'branch');
   if id is not null and id~'^[A-Za-z][A-Za-z0-9_-]{0,119}$' and branch is not null
    and exists(select 1 from jsonb_array_elements(coalesce(s.project_data->'promptFlow','[]')) n where n->>'branch'=branch)
    and not exists(select 1 from public.creator_video_workspaces where project_id=s.project_id and (video_id=branch or legacy_branch=branch))
    and not exists(select 1 from public.creator_os_publish_drafts where project_id=s.project_id and video_id=branch) then
     insert into public.creator_video_workspaces(project_id,video_id,owner_user_id,title,legacy_branch)
      values(s.project_id,id,s.owner_user_id,coalesce(v->>'CHARACTER',v->>'VIDEO_NAME',id),branch) on conflict do nothing;
     vs=vs||jsonb_build_array(jsonb_build_object('videoId',id,'branch',branch,'name',coalesce(v->>'CHARACTER',v->>'VIDEO_NAME',id),'identitySource','original_VIDEO_TRACKS'));
   end if;
  end loop;
  if jsonb_array_length(vs)>0 then
   update public.creator_os_workspace_snapshots set project_data=jsonb_set(project_data,'{videos}',vs),revision=revision+1,updated_at=now()
    where project_id=s.project_id and owner_user_id=s.owner_user_id;
  end if;
 end loop;
end $$;
