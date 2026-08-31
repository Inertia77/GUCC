-- WP_GLOB_001 Production acceptance probe
-- Safe by design: every fixture is created inside this transaction and rolled back.
-- Run only after 20260831043241_creator_distribution_identity_foundation.sql.

begin;

create temporary table wp_glob_ctx on commit drop as
select
  cp.project_id,
  cp.owner_user_id,
  yt.id as youtube_platform_id,
  tt.id as tiktok_platform_id,
  (select count(*) from public.creator_project_releases) as legacy_release_rows_before,
  (select count(*) from public.creator_project_files) as logical_file_rows_before,
  (select count(*) from public.creator_file_locations) as file_location_rows_before
from public.creator_projects cp
cross join lateral (select id from public.platforms where name = 'YouTube' limit 1) yt
cross join lateral (select id from public.platforms where name = 'TikTok' limit 1) tt
order by cp.created_at
limit 1;

do $$
begin
  if not exists (select 1 from wp_glob_ctx) then
    raise exception 'WP_GLOB_001 requires one existing Creator Project plus YouTube and TikTok Platform Dictionary rows';
  end if;
end $$;

insert into public.creator_variants (project_id, owner_user_id, variant_key, label, status, metadata)
select project_id, owner_user_id, v.variant_key, v.label, 'draft', v.metadata
from wp_glob_ctx
cross join (values
  ('YOUTUBE_GLOBAL_LONG', 'YouTube Global Long', '{"format":"long","languageStrategy":"multi_audio","supportedLanguages":["ZH","JA","EN"]}'::jsonb),
  ('TIKTOK_JA_SHORT', 'TikTok JA Short', '{"format":"short","primaryLanguage":"JA"}'::jsonb),
  ('TIKTOK_EN_SHORT', 'TikTok EN Short', '{"format":"short","primaryLanguage":"EN"}'::jsonb),
  ('BILIBILI_ZH_LONG', 'Bilibili ZH Long', '{"format":"long","primaryLanguage":"ZH"}'::jsonb)
) as v(variant_key, label, metadata);

insert into public.creator_channels (
  owner_user_id, platform_id, channel_key, name, account_label, market,
  primary_language, language_mode, supported_languages, metadata
)
select owner_user_id, youtube_platform_id, 'YOUTUBE_MAIN', 'YouTube Main', 'Main', 'Global',
       null, 'multi_audio', array['ZH','JA','EN']::text[], '{"case":"A"}'::jsonb
from wp_glob_ctx
union all
select owner_user_id, tiktok_platform_id, 'TIKTOK_JP', 'TikTok JP', 'JP', 'Japan',
       'JA', 'single_language', array['JA']::text[], '{"case":"B"}'::jsonb
from wp_glob_ctx
union all
select owner_user_id, tiktok_platform_id, 'TIKTOK_GLOBAL', 'TikTok Global', 'Global', 'Global',
       'EN', 'single_language', array['EN']::text[], '{"case":"B"}'::jsonb
from wp_glob_ctx;

-- Case A: one global YouTube Variant → YouTube Main → one Publication.
insert into public.creator_publications (
  project_id, owner_user_id, variant_id, channel_id, status, publish_package_snapshot, metadata
)
select c.project_id, c.owner_user_id, v.variant_id, ch.channel_id, 'draft',
       '{"multiAudioReady":true,"languages":["ZH","JA","EN"]}'::jsonb,
       '{"case":"A"}'::jsonb
from wp_glob_ctx c
join public.creator_variants v
  on v.project_id = c.project_id and v.owner_user_id = c.owner_user_id and v.variant_key = 'YOUTUBE_GLOBAL_LONG'
join public.creator_channels ch
  on ch.owner_user_id = c.owner_user_id and ch.channel_key = 'YOUTUBE_MAIN';

-- Case B: two Variants on two Channels that share the same TikTok platform_id.
insert into public.creator_publications (
  project_id, owner_user_id, variant_id, channel_id, status, metadata
)
select c.project_id, c.owner_user_id, v.variant_id, ch.channel_id, 'draft', jsonb_build_object('case', 'B', 'variant', v.variant_key)
from wp_glob_ctx c
join public.creator_variants v
  on v.project_id = c.project_id and v.owner_user_id = c.owner_user_id
 and v.variant_key in ('TIKTOK_JA_SHORT','TIKTOK_EN_SHORT')
join public.creator_channels ch
  on ch.owner_user_id = c.owner_user_id
 and ch.channel_key = case v.variant_key when 'TIKTOK_JA_SHORT' then 'TIKTOK_JP' else 'TIKTOK_GLOBAL' end;

-- Case C: same Variant → same Channel can produce another Publication (repost/retry).
insert into public.creator_publications (
  project_id, owner_user_id, variant_id, channel_id, status, metadata
)
select c.project_id, c.owner_user_id, v.variant_id, ch.channel_id, 'draft', '{"case":"C","attempt":2}'::jsonb
from wp_glob_ctx c
join public.creator_variants v
  on v.project_id = c.project_id and v.owner_user_id = c.owner_user_id and v.variant_key = 'TIKTOK_JA_SHORT'
join public.creator_channels ch
  on ch.owner_user_id = c.owner_user_id and ch.channel_key = 'TIKTOK_JP';

do $$
declare
  ctx record;
  n integer;
  tik_platforms integer;
  tik_channels integer;
  reposts integer;
  tik_variant_count integer;
begin
  select * into ctx from wp_glob_ctx limit 1;

  select count(*) into n
  from public.creator_variants
  where project_id = ctx.project_id and owner_user_id = ctx.owner_user_id
    and variant_key in ('YOUTUBE_GLOBAL_LONG','TIKTOK_JA_SHORT','TIKTOK_EN_SHORT','BILIBILI_ZH_LONG');
  if n <> 4 then raise exception 'CASE variants failed: expected 4, got %', n; end if;

  select count(*), count(distinct platform_id)
    into tik_channels, tik_platforms
  from public.creator_channels
  where owner_user_id = ctx.owner_user_id
    and channel_key in ('TIKTOK_JP','TIKTOK_GLOBAL');
  if tik_channels <> 2 or tik_platforms <> 1 then
    raise exception 'CASE B failed: TikTok channels %, platform identities %', tik_channels, tik_platforms;
  end if;

  if not exists (
    select 1 from public.creator_channels
    where owner_user_id = ctx.owner_user_id
      and channel_key = 'YOUTUBE_MAIN'
      and platform_id = ctx.youtube_platform_id
      and market = 'Global'
      and language_mode = 'multi_audio'
      and supported_languages @> array['ZH','JA','EN']::text[]
  ) then raise exception 'CASE A failed: YouTube Main multi-audio metadata'; end if;

  select count(*) into reposts
  from public.creator_publications p
  join public.creator_variants v on v.variant_id = p.variant_id
  join public.creator_channels ch on ch.channel_id = p.channel_id
  where p.project_id = ctx.project_id and p.owner_user_id = ctx.owner_user_id
    and v.variant_key = 'TIKTOK_JA_SHORT' and ch.channel_key = 'TIKTOK_JP';
  if reposts <> 2 then raise exception 'CASE C failed: expected 2 publication instances, got %', reposts; end if;

  select count(distinct p.variant_id) into tik_variant_count
  from public.creator_publications p
  join public.creator_channels ch on ch.channel_id = p.channel_id
  where p.project_id = ctx.project_id and p.owner_user_id = ctx.owner_user_id
    and ch.platform_id = ctx.tiktok_platform_id;
  if tik_variant_count <> 2 then
    raise exception 'Different Variants on same Platform failed: expected 2, got %', tik_variant_count;
  end if;

  if (select count(*) from public.creator_project_releases) <> ctx.legacy_release_rows_before then
    raise exception 'Legacy creator_project_releases changed during WP_GLOB_001 probe';
  end if;
  if (select count(*) from public.creator_project_files) <> ctx.logical_file_rows_before then
    raise exception 'creator_project_files changed during WP_GLOB_001 probe';
  end if;
  if (select count(*) from public.creator_file_locations) <> ctx.file_location_rows_before then
    raise exception 'creator_file_locations changed during WP_GLOB_001 probe';
  end if;
end $$;

-- Security contract: RLS remains enabled and direct browser/authenticated CRUD remains revoked.
do $$
declare
  t text;
  policy_count integer;
begin
  foreach t in array array['creator_variants','creator_channels','creator_publications'] loop
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = t and c.relrowsecurity
    ) then raise exception 'RLS not enabled on %', t; end if;

    select count(*) into policy_count
    from pg_policies
    where schemaname = 'public' and tablename = t
      and policyname in (t || '_owner_select', t || '_owner_insert', t || '_owner_update', t || '_owner_delete');
    if policy_count <> 4 then raise exception 'Owner RLS policy set incomplete on %: %', t, policy_count; end if;

    if has_table_privilege('authenticated', format('public.%I', t), 'SELECT')
       or has_table_privilege('authenticated', format('public.%I', t), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I', t), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I', t), 'DELETE') then
      raise exception 'Authenticated direct CRUD unexpectedly granted on %', t;
    end if;
  end loop;
end $$;

-- Cloud identity tables must not become binary/media stores.
do $$
declare
  n integer;
begin
  select count(*) into n
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('creator_variants','creator_channels','creator_publications')
    and data_type = 'bytea';
  if n <> 0 then raise exception 'Media/binary bytea column found in distribution identity tables'; end if;
end $$;

select
  'WP_GLOB_001_ACCEPTANCE_OK' as result,
  (select count(*) from public.creator_variants where variant_key like 'YOUTUBE_GLOBAL_LONG' or variant_key like 'TIKTOK_%_SHORT') as fixture_variants_visible_inside_tx,
  (select count(*) from public.creator_channels where channel_key in ('YOUTUBE_MAIN','TIKTOK_JP','TIKTOK_GLOBAL')) as fixture_channels_visible_inside_tx,
  (select count(*) from public.creator_publications p join public.creator_variants v on v.variant_id=p.variant_id where v.variant_key in ('YOUTUBE_GLOBAL_LONG','TIKTOK_JA_SHORT','TIKTOK_EN_SHORT')) as fixture_publications_visible_inside_tx;

rollback;
