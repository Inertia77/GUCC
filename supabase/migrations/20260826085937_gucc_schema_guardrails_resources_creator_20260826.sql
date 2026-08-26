-- Production migration: 20260826085937 gucc_schema_guardrails_resources_creator_20260826
-- Database guardrails and compatibility-preserving metadata improvements.

alter table public.character_progress
  alter column research_status set not null,
  alter column build_status set not null;
alter table public.character_progress
  add constraint character_progress_research_status_chk check (research_status in ('待研究','查攻略','OK')),
  add constraint character_progress_build_status_chk check (build_status in ('待养成','DONE','NOT'));

alter table public.character_evaluations
  add constraint character_evaluations_power_rank_chk check (power_rank is null or power_rank in ('T0','T1','T2','T3','T4')),
  add constraint character_evaluations_like_level_chk check (like_level is null or like_level in ('极','优','良','中','差'));

alter table public.character_names
  add constraint character_names_lang_chk check (lang in ('zh','en','jp','kr'));

alter table public.characters
  add constraint characters_sex_chk check (sex is null or sex in ('男','女','未定')),
  add constraint characters_rarity_chk check (rarity is null or rarity in ('4星','5星','6星','A级','S级'));

alter table public.game_status
  alter column content_tier set not null,
  alter column output_enabled set not null,
  alter column research_depth set not null,
  alter column login_frequency set not null,
  alter column spending_level set not null,
  alter column info_attention set not null;
alter table public.game_status
  add constraint game_status_content_tier_chk check (content_tier in ('创作级','兴趣级','观察级','浅尝级','抛弃级')),
  add constraint game_status_research_depth_chk check (research_depth in ('深','中','微','无')),
  add constraint game_status_login_frequency_chk check (login_frequency in ('每日','偶尔','从不')),
  add constraint game_status_spending_level_chk check (spending_level in ('中','微','无')),
  add constraint game_status_info_attention_chk check (info_attention in ('深','中','微','无'));

alter table public.parties alter column hold_status set not null;
alter table public.parties
  add constraint parties_hold_status_chk check (hold_status in ('YES','NO')),
  add constraint parties_status_chk check (status is null or status in ('待研究','OK'));

alter table public.version_banners
  add constraint version_banners_phase_chk check (phase in ('first_half','second_half','other','standard','unknown')),
  add constraint version_banners_type_chk check (banner_type in ('new_limited','pickup','rerun','collab','standard_addition','unknown'));

alter table public.creator_projects
  add constraint creator_projects_type_chk check (project_type in ('A_FULL_GUIDE','B_SUNO_VIDEO','C_GAME_SYSTEM','D_MUSIC_RELEASE')),
  add constraint creator_projects_state_chk check (current_state in (
    'IDEA','PLANNING','RESEARCHING','RESEARCH_LOCKED','CONTENT_LOCKED','SCRIPTING','SCRIPT_LOCKED',
    'PRE_ASSET_PREPARATION','MUSIC_DRAFT','MUSIC_LOCKED','AUDIO_PRODUCTION','AUDIO_LOCKED',
    'TIMELINE_GENERATION','TIMELINE_LOCKED','STORYBOARDING','ASSET_COMPLETION','PRODUCTION_READY',
    'CODEX_BUILD','REVIEW','REVISION','FINE_EDIT','PICTURE_LOCKED','RELEASE_READY','PUBLISHED','ARCHIVED'
  ));
alter table public.creator_project_files
  add constraint creator_project_files_status_chk check (status in ('Missing','Planned','Ready','Used','Rejected'));

update public.resources r
set resource_type = 'character_profile'
where r.resource_type = 'party_member_profile'
  and exists (
    select 1 from public.resource_relations rr
    where rr.resource_id = r.id
      and rr.entity_type = 'character'
      and rr.relation_type = 'official_profile'
  );

alter table public.resources
  add column if not exists source_host text,
  add column if not exists source_authority text not null default 'unknown',
  add column if not exists ingested_via text not null default 'unknown';

update public.resources
set source_host = case
      when url is null then null
      else lower(substring(url from '^[A-Za-z][A-Za-z0-9+.-]*://([^/:?#]+)'))
    end,
    ingested_via = case
      when source = 'frontend' then 'frontend'
      when url is null then 'manual'
      else 'legacy_import'
    end,
    source_authority = case
      when source = 'official' then 'official'
      when lower(coalesce(substring(url from '^[A-Za-z][A-Za-z0-9+.-]*://([^/:?#]+)'),'')) in
           ('baike.mihoyo.com','wiki.kurobbs.com','wiki.skland.com') then 'official_wiki'
      when lower(coalesce(substring(url from '^[A-Za-z][A-Za-z0-9+.-]*://([^/:?#]+)'),'')) in
           ('bbs.mihoyo.com','www.hoyolab.com','www.kurobbs.com') then 'official_community'
      when source = '米游社' then 'official_community'
      when source = '森空岛' then 'official_wiki'
      else 'unknown'
    end;

alter table public.resources
  add constraint resources_source_authority_chk check (source_authority in ('official','official_wiki','official_community','community','personal','unknown')),
  add constraint resources_ingested_via_chk check (ingested_via in ('frontend','legacy_import','manual','ai','migration','unknown'));

create or replace function public.app_sync_resource_metadata()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_host text;
begin
  v_host := case
    when new.url is null then null
    else lower(substring(new.url from '^[A-Za-z][A-Za-z0-9+.-]*://([^/:?#]+)'))
  end;
  new.source_host := v_host;
  if new.ingested_via is null or new.ingested_via = 'unknown' then
    new.ingested_via := case
      when new.source = 'frontend' then 'frontend'
      when new.url is null then 'manual'
      else 'unknown'
    end;
  end if;
  if new.source_authority is null or new.source_authority = 'unknown' then
    new.source_authority := case
      when new.source = 'official' then 'official'
      when v_host in ('baike.mihoyo.com','wiki.kurobbs.com','wiki.skland.com') then 'official_wiki'
      when v_host in ('bbs.mihoyo.com','www.hoyolab.com','www.kurobbs.com') then 'official_community'
      when new.source = '米游社' then 'official_community'
      when new.source = '森空岛' then 'official_wiki'
      else 'unknown'
    end;
  end if;
  return new;
end;
$$;
revoke all on function public.app_sync_resource_metadata() from public, anon, authenticated;
grant execute on function public.app_sync_resource_metadata() to service_role;
drop trigger if exists trg_resources_sync_metadata on public.resources;
create trigger trg_resources_sync_metadata
before insert or update of url, source, source_host, source_authority, ingested_via
on public.resources
for each row execute function public.app_sync_resource_metadata();

alter table public.creator_projects
  add column if not exists game_id uuid references public.games(id) on delete set null;
alter table public.creator_project_releases
  add column if not exists platform_id uuid references public.platforms(id) on delete set null;

update public.creator_projects cp
set game_id = g.id
from public.games g
where cp.game_id is null
  and nullif(trim(cp.game),'') is not null
  and (lower(trim(cp.game)) = lower(g.title)
       or lower(trim(cp.game)) = lower(coalesce(g.code,''))
       or lower(trim(cp.game)) = lower(coalesce(g.short_code,'')));

update public.creator_project_releases cr
set platform_id = p.id
from public.platforms p
where cr.platform_id is null
  and lower(trim(cr.platform)) = lower(p.name);

alter table public.creator_projects
  add constraint creator_projects_project_owner_key unique (project_id, owner_user_id);
alter table public.creator_project_files drop constraint if exists creator_project_files_project_id_fkey;
alter table public.creator_project_events drop constraint if exists creator_project_events_project_id_fkey;
alter table public.creator_project_releases drop constraint if exists creator_project_releases_project_id_fkey;
alter table public.creator_project_files
  add constraint creator_project_files_project_owner_fkey foreign key (project_id, owner_user_id)
  references public.creator_projects(project_id, owner_user_id) on delete cascade;
alter table public.creator_project_events
  add constraint creator_project_events_project_owner_fkey foreign key (project_id, owner_user_id)
  references public.creator_projects(project_id, owner_user_id) on delete cascade;
alter table public.creator_project_releases
  add constraint creator_project_releases_project_owner_fkey foreign key (project_id, owner_user_id)
  references public.creator_projects(project_id, owner_user_id) on delete cascade;
create index if not exists creator_projects_game_id_idx on public.creator_projects(game_id);
create index if not exists creator_project_releases_platform_id_idx on public.creator_project_releases(platform_id);

alter table public.character_names add column if not exists updated_at timestamptz;
alter table public.character_evaluations add column if not exists updated_at timestamptz;
alter table public.party_members add column if not exists updated_at timestamptz;
alter table public.game_versions add column if not exists updated_at timestamptz;
alter table public.version_banners add column if not exists updated_at timestamptz;
alter table public.platforms add column if not exists updated_at timestamptz;
alter table public.resources add column if not exists updated_at timestamptz;
alter table public.resource_relations add column if not exists updated_at timestamptz;
alter table public.app_users add column if not exists updated_at timestamptz;

update public.character_names set updated_at = coalesce(updated_at, created_at, now());
update public.character_evaluations set updated_at = coalesce(updated_at, created_at, now());
update public.party_members set updated_at = coalesce(updated_at, created_at, now());
update public.game_versions set updated_at = coalesce(updated_at, created_at, now());
update public.version_banners set updated_at = coalesce(updated_at, created_at, now());
update public.platforms set updated_at = coalesce(updated_at, created_at, now());
update public.resources set updated_at = coalesce(updated_at, created_at, now());
update public.resource_relations set updated_at = coalesce(updated_at, created_at, now());
update public.app_users set updated_at = coalesce(updated_at, created_at, now());

alter table public.character_names alter column updated_at set default now(), alter column updated_at set not null;
alter table public.character_evaluations alter column updated_at set default now(), alter column updated_at set not null;
alter table public.party_members alter column updated_at set default now(), alter column updated_at set not null;
alter table public.game_versions alter column updated_at set default now(), alter column updated_at set not null;
alter table public.version_banners alter column updated_at set default now(), alter column updated_at set not null;
alter table public.platforms alter column updated_at set default now(), alter column updated_at set not null;
alter table public.resources alter column updated_at set default now(), alter column updated_at set not null;
alter table public.resource_relations alter column updated_at set default now(), alter column updated_at set not null;
alter table public.app_users alter column updated_at set default now(), alter column updated_at set not null;

create or replace function public.app_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.app_touch_updated_at() from public, anon, authenticated;
grant execute on function public.app_touch_updated_at() to service_role;

do $$
declare t text;
begin
  foreach t in array array[
    'games','game_status','characters','character_names','character_progress','character_evaluations',
    'parties','party_members','game_versions','version_banners','platforms','mechanisms','resources',
    'resource_relations','app_users','creator_projects','creator_project_files','creator_project_releases'
  ] loop
    execute format('drop trigger if exists trg_%I_touch_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_touch_updated_at before update on public.%I for each row execute function public.app_touch_updated_at()', t, t);
  end loop;
end $$;

alter table public.mechanisms alter column game_id set not null;
alter table public.mechanisms
  add column if not exists source_url text,
  add column if not exists source_kind text not null default 'official',
  add column if not exists verified_at date;
alter table public.mechanisms
  add constraint mechanisms_type_chk check (mechanism_type is null or mechanism_type in ('core_combat','resource','switch','break','reaction','equipment','action','team','system')),
  add constraint mechanisms_source_kind_chk check (source_kind in ('official','official_wiki','official_community','community','guide')),
  add constraint mechanisms_game_title_key unique (game_id, title);

drop index if exists public.idx_characters_game_name;
drop index if exists public.idx_games_code;
drop index if exists public.idx_games_short_code;

revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;
