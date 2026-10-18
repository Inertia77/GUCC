-- Status is explicitly confirmed by the owner. Optional attachments remain honest metadata.
-- Existing file-backed records satisfy the legacy branch without any data rewrite.
alter table public.creator_deliverable_records drop constraint creator_deliverable_records_check;
alter table public.creator_deliverable_records add constraint creator_deliverable_records_check check (
 status <> 'confirmed' or (
  reviewed_at is not null and coalesce(evidence->>'humanConfirmed','')='true'
  and (
   (coalesce(evidence->>'confirmationMethod','')='manual' and coalesce(evidence->>'confirmationSource','')='human_ui')
   or (length(coalesce(evidence->>'fileName',''))>0 and coalesce((evidence->>'sizeBytes')::bigint,0)>0)
  )
 )
);

create or replace function gucc_private.creator_workspace_save_deliverable(
 p_project_id text,p_video_id text,p_key text,p_status text,p_evidence jsonb,p_note text,p_expected_revision bigint
) returns public.creator_deliverable_records language plpgsql security definer set search_path='' as $$
declare r public.creator_deliverable_records; uid uuid:=auth.uid(); a jsonb;
begin
 if uid is null or not exists(select 1 from public.app_users where user_id=uid and is_active) then
  raise exception 'OWNER_ACCESS_REQUIRED' using errcode='42501'; end if;
 perform 1 from public.creator_video_workspaces v join public.creator_projects p using(project_id)
  where v.project_id=p_project_id and v.video_id=p_video_id and v.owner_user_id=uid and p.owner_user_id=uid for update of v;
 if not found then raise exception 'VIDEO_NOT_AVAILABLE' using errcode='42501'; end if;
 if p_expected_revision is null or p_expected_revision<0 or p_key is null or p_key not in ('script','subtitle','visual','sound','cover','publish')
  or p_status is null or p_status not in ('not_started','in_progress','review','confirmed','blocked')
  or coalesce(jsonb_typeof(p_evidence),'')<>'object' or octet_length(p_evidence::text)>2097152 then
  raise exception 'INVALID_DELIVERABLE' using errcode='22023'; end if;
 select * into r from public.creator_deliverable_records where project_id=p_project_id and video_id=p_video_id and deliverable_key=p_key;
 if nullif(p_evidence->>'requestId','') is not null and r.evidence->>'requestId'=p_evidence->>'requestId' then return r; end if;
 if coalesce(r.revision,0)<>p_expected_revision then raise exception 'DELIVERABLE_REVISION_CONFLICT: refresh and reconcile your retained draft' using errcode='40001'; end if;
 if r.evidence->>'locked'='true' and not (p_status='review' and p_evidence->>'locked'='false' and p_evidence->>'humanReopened'='true' and length(btrim(coalesce(p_note,'')))>0) then
  raise exception 'DELIVERABLE_LOCKED: explicitly reopen before changing' using errcode='42501'; end if;
 -- Manual status confirmation records human judgment, never a claim of observed bytes.
 -- Legacy file-backed callers keep their existing validation.
 if p_status='confirmed' then
  if p_evidence->>'humanConfirmed' is distinct from 'true' then
   raise exception 'CONFIRM_REQUIRES_HUMAN_REVIEW'; end if;
  if not (coalesce(p_evidence->>'confirmationMethod','')='manual' and coalesce(p_evidence->>'confirmationSource','')='human_ui') then
  if coalesce(jsonb_array_length(p_evidence->'artifacts'),0)=0 then
   raise exception 'CONFIRM_REQUIRES_OBSERVED_FILE_AND_HUMAN_REVIEW'; end if;
  for a in select value from jsonb_array_elements(p_evidence->'artifacts') loop
   if coalesce(a->>'observation','') not in ('browser_file','generated_bytes') or coalesce((a->>'sizeBytes')::bigint,0)<=0
    or coalesce(a->>'sha256','')!~'^[a-f0-9]{64}$' or coalesce(a->>'fileName','')='' or (a->>'fileName')~'[/\\]' then
    raise exception 'INVALID_FILE_OBSERVATION'; end if;
  end loop;
  if p_key='subtitle' and (coalesce((p_evidence->'recording'->>'sizeBytes')::bigint,0)<=0 or p_evidence->>'subtitleTimingReviewed' is distinct from 'true') then
   raise exception 'SUBTITLE_REQUIRES_REAL_RECORDING_AND_TIMING_REVIEW'; end if;
  end if;
  if p_evidence->>'locked' is distinct from 'true' then raise exception 'CONFIRMED_OUTPUT_MUST_BE_LOCKED'; end if;
 end if;
 insert into public.creator_deliverable_records(project_id,video_id,deliverable_key,owner_user_id,status,evidence,review_note,reviewed_at,revision)
 values(p_project_id,p_video_id,p_key,uid,p_status,p_evidence,left(coalesce(p_note,''),2000),case when p_status='confirmed' then now() end,coalesce(r.revision,0)+1)
 on conflict(project_id,video_id,deliverable_key) do update set status=excluded.status,evidence=excluded.evidence,review_note=excluded.review_note,
 reviewed_at=excluded.reviewed_at,revision=excluded.revision,updated_at=now() returning * into r;
 for a in select value from jsonb_array_elements(coalesce(p_evidence->'artifacts','[]')) loop
  if coalesce(a->>'observation','') in ('browser_file','generated_bytes') and coalesce(a->>'sha256','')~'^[a-f0-9]{64}$' and coalesce((a->>'sizeBytes')::bigint,0)>0 then
   insert into public.creator_project_files(project_id,owner_user_id,file_key,relative_path,filename,mime_type,size_bytes,checksum,kind,status,storage_provider,artifact_scope_type,artifact_scope_id,metadata)
   values(p_project_id,uid,'VIDEO:'||p_video_id||':'||p_key||':'||(a->>'sha256'),'',a->>'fileName',a->>'mimeType',(a->>'sizeBytes')::bigint,a->>'sha256',p_key,'Ready','local','project',p_project_id,
    jsonb_build_object('videoId',p_video_id,'deliverableKey',p_key,'observation',a,'availability','local_only','qualityConfirmed',p_status='confirmed')) on conflict do nothing;
  end if;
 end loop;
 return r;
end $$;
revoke all on function gucc_private.creator_workspace_save_deliverable(text,text,text,text,jsonb,text,bigint) from public,anon;
grant execute on function gucc_private.creator_workspace_save_deliverable(text,text,text,text,jsonb,text,bigint) to authenticated;
