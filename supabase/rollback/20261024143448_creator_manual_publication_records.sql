-- Restore legacy publication guard. Keep additive identities and recorded history.
CREATE OR REPLACE FUNCTION public.app_guard_creator_publication()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_package public.creator_publish_packages%rowtype;
begin
  if (
    (tg_op = 'INSERT' and (new.final_publish_confirmed_at is not null or new.final_publish_confirmed_by is not null))
    or (tg_op = 'UPDATE' and (
      new.final_publish_confirmed_at is distinct from old.final_publish_confirmed_at
      or new.final_publish_confirmed_by is distinct from old.final_publish_confirmed_by
    ))
  ) and not public.app_creator_human_action_active() then
    raise exception 'Final Publish Confirmation is a human-only gate';
  end if;

  if new.status in ('SCHEDULED','PUBLISHING','PUBLISHED') then
    if new.publish_package_id is null then raise exception 'Distribution requires a Publish Package'; end if;
    select * into v_package from public.creator_publish_packages where publish_package_id = new.publish_package_id;
    if not found or v_package.project_id <> new.project_id or v_package.owner_user_id <> new.owner_user_id then
      raise exception 'Publication package ownership mismatch';
    end if;
    if v_package.platform_locked_at is null or v_package.qa_status <> 'PASS'
       or v_package.qa_package_revision <> v_package.package_revision
       or v_package.human_reviewed_at is null or v_package.release_locked_at is null then
      raise exception 'Distribution blocked: Platform Lock, current QA PASS, Human Review and Release Lock are required';
    end if;
    if new.final_publish_confirmed_at is null then
      raise exception 'Distribution blocked: Final Publish Confirmation is required';
    end if;
    if new.publish_package_snapshot = '{}'::jsonb then new.publish_package_snapshot := v_package.release_snapshot; end if;
  end if;
  if new.status = 'PUBLISHED' and (nullif(btrim(new.post_id), '') is null or nullif(btrim(new.post_url), '') is null or new.published_at is null) then
    raise exception 'Published Publication requires post_id, post_url and published_at';
  end if;
  if tg_op = 'UPDATE' then new.revision := old.revision + 1; end if;
  return new;
end;
$function$;
revoke execute on function public.creator_record_publication(text,text,jsonb) from authenticated;
revoke execute on function public.creator_record_performance(text,text,uuid,jsonb) from authenticated;
-- Roll forward is preferred: do not delete append-only publication or report records.
