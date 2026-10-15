begin;
select set_config('request.jwt.claim.sub',(select owner_user_id::text from public.creator_projects order by project_id limit 1),true);
set local role authenticated;
do $test$
declare p text:='GUCC-TRANSACTIONAL-QA-20261015'; r public.creator_deliverable_records; e jsonb;
begin
 perform public.creator_os_save_project(jsonb_build_object('projectId',p,'name','[QA rollback only]','game','','idea','transactional acceptance','videos',jsonb_build_array(jsonb_build_object('videoId','A','name','A','branch','A'))),null);
 perform public.creator_workspace_register_video(p,'B','B',1);
 if (select count(*) from public.creator_video_workspaces where project_id=p)<>2 then raise exception 'video registration failed';end if;
 e=jsonb_build_object('requestId','qa-1','content','A script','prompt','original prompt');
 r=public.creator_workspace_save_deliverable(p,'A','script','in_progress',e,'',0);
 if r.revision<>1 then raise exception 'wrong initial revision';end if;
 r=public.creator_workspace_save_deliverable(p,'A','script','in_progress',e,'',0);
 if r.revision<>1 then raise exception 'retry not idempotent';end if;
 begin
 perform public.creator_workspace_save_deliverable(p,'A','script','review',jsonb_build_object('requestId','stale'),'',0);
 raise exception 'stale write incorrectly accepted';
 exception when serialization_failure then null; end;
 perform public.creator_workspace_save_deliverable(p,'B','script','in_progress',jsonb_build_object('content','B script'),'',0);
 if (select evidence->>'content' from public.creator_deliverable_records where project_id=p and video_id='A')<>'A script' then raise exception 'cross video overwrite';end if;
 begin
 perform public.creator_workspace_save_deliverable(p,'A','script','confirmed',jsonb_build_object('fileName','C:\fake.md','sizeBytes',123,'humanConfirmed',true,'locked',true),'',1);
 raise exception 'fake path accepted';
 exception when others then if sqlerrm='fake path accepted' then raise;end if;end;
 e=jsonb_build_object('requestId','qa-confirm','content','A script','prompt','original prompt','humanConfirmed',true,'locked',true,'fileName','SCRIPT.md','sizeBytes',8,
 'artifacts',jsonb_build_array(jsonb_build_object('fileName','SCRIPT.md','sizeBytes',8,'mimeType','text/plain','observation','generated_bytes','sha256',repeat('a',64))));
 r=public.creator_workspace_save_deliverable(p,'A','script','confirmed',e,'human approved fixture',1);
 if r.revision<>2 or r.status<>'confirmed' then raise exception 'confirmation failed';end if;
 if (select count(*) from public.creator_deliverable_versions where project_id=p and video_id='A' and deliverable_key='script')<>2 then raise exception 'history missing';end if;
 begin
 perform public.creator_workspace_save_deliverable(p,'A','script','in_progress',jsonb_build_object('requestId','qa-overwrite'),'',2);
 raise exception 'lock overwrite accepted';
 exception when insufficient_privilege then null;end;
 r=public.creator_workspace_save_deliverable(p,'A','script','review',e||jsonb_build_object('requestId','qa-reopen','locked',false,'humanReopened',true),'explicit human reopen',2);
 if r.revision<>3 then raise exception 'reopen failed';end if;
 begin
 perform public.creator_workspace_save_deliverable(p,'B','subtitle','confirmed',e,'no recording',0);
 raise exception 'subtitle accepted without recording';
 exception when others then if sqlerrm='subtitle accepted without recording' then raise;end if;end;
 -- Removing videos from an old snapshot cannot remove the canonical identities.
 perform public.creator_os_save_project(jsonb_build_object('projectId',p,'name','[QA rollback only]','videos','[]'::jsonb),2);
 if (select jsonb_array_length(project_data->'videos') from public.creator_os_workspace_snapshots where project_id=p)<>2 then raise exception 'canonical videos were lost';end if;
 if has_table_privilege('anon','public.creator_deliverable_versions','select') then raise exception 'anonymous history exposure';end if;
 if has_table_privilege('authenticated','public.creator_deliverable_records','update') then raise exception 'CAS bypass exposed';end if;
end $test$;
reset role;
do $verify$begin if (select count(*) from public.creator_project_files where project_id='GUCC-TRANSACTIONAL-QA-20261015' and metadata->>'videoId'='A')<>1 then raise exception 'file association missing';end if;end$verify$;
select 'PASS: two videos, real file guard, metadata association, revisions, idempotency, immutable history, lock/reopen, recording requirement, snapshot preservation, owner privileges. All QA writes rolled back.' acceptance;
rollback;
