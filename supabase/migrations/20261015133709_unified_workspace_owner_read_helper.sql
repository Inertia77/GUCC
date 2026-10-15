-- Existing root/app_users tables are deliberately API-private. RLS must not query
-- them as the browser role. Keep that authorization lookup inside the private schema.
create function gucc_private.creator_workspace_owns_project(p_project_id text,p_owner uuid)
 returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and auth.uid()=p_owner
  and exists(select 1 from public.app_users where user_id=auth.uid() and is_active)
  and exists(select 1 from public.creator_projects where project_id=p_project_id and owner_user_id=auth.uid());
$$;
revoke all on function gucc_private.creator_workspace_owns_project(text,uuid) from public,anon;
grant execute on function gucc_private.creator_workspace_owns_project(text,uuid) to authenticated;
