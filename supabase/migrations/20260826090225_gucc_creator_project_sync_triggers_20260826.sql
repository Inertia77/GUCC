-- Production migration: 20260826090225 gucc_creator_project_sync_triggers_20260826
-- Keep Creator Project relational fields and file rows synchronized at the database boundary.

create or replace function public.app_sync_creator_project_game()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if nullif(trim(new.game),'') is null then
    new.game_id := null;
  else
    select g.id into new.game_id
    from public.games g
    where lower(trim(new.game)) = lower(g.title)
       or lower(trim(new.game)) = lower(coalesce(g.code,''))
       or lower(trim(new.game)) = lower(coalesce(g.short_code,''))
    order by case when lower(trim(new.game)) = lower(g.title) then 0 else 1 end
    limit 1;
  end if;
  return new;
end;
$$;
revoke all on function public.app_sync_creator_project_game() from public, anon, authenticated;
grant execute on function public.app_sync_creator_project_game() to service_role;

drop trigger if exists trg_creator_projects_sync_game on public.creator_projects;
create trigger trg_creator_projects_sync_game
before insert or update of game
on public.creator_projects
for each row execute function public.app_sync_creator_project_game();

create or replace function public.app_sync_creator_release_platform()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if nullif(trim(new.platform),'') is null then
    new.platform_id := null;
  else
    select p.id into new.platform_id
    from public.platforms p
    where lower(trim(new.platform)) = lower(p.name)
    limit 1;
  end if;
  return new;
end;
$$;
revoke all on function public.app_sync_creator_release_platform() from public, anon, authenticated;
grant execute on function public.app_sync_creator_release_platform() to service_role;

drop trigger if exists trg_creator_releases_sync_platform on public.creator_project_releases;
create trigger trg_creator_releases_sync_platform
before insert or update of platform
on public.creator_project_releases
for each row execute function public.app_sync_creator_release_platform();

create or replace function public.app_prune_creator_project_files()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_files jsonb := coalesce(new.project_data->'files', '{}'::jsonb);
begin
  if jsonb_typeof(v_files) <> 'object' then
    v_files := '{}'::jsonb;
  end if;

  delete from public.creator_project_files f
  where f.project_id = new.project_id
    and f.owner_user_id = new.owner_user_id
    and not (v_files ? f.file_key);

  return new;
end;
$$;
revoke all on function public.app_prune_creator_project_files() from public, anon, authenticated;
grant execute on function public.app_prune_creator_project_files() to service_role;

drop trigger if exists trg_creator_projects_prune_files on public.creator_projects;
create trigger trg_creator_projects_prune_files
after insert or update of project_data
on public.creator_projects
for each row execute function public.app_prune_creator_project_files();
