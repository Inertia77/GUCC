-- WP_GLOB_001 | Distribution Identity Foundation v0.1
--
-- Purpose: allow one Content Project Root to produce many Distribution Variants,
-- target multiple account/market Channels on the same Platform, and record each
-- concrete Publication as an independent event/instance.
--
-- This migration intentionally does NOT implement multilingual artifact tracks,
-- rendering, upload, auto-publish, or media storage. Existing Creator Production
-- and creator_project_releases remain compatibility paths.

comment on table public.creator_projects is
  'Content Project Root. Stores coarse global Creator project state; child workflows such as language tracks, visual masters, variants and publications must own their own state/status/locks instead of expanding creator_projects.current_state.';

comment on table public.platforms is
  'Platform Dictionary only (for example YouTube or TikTok). Account, market and language strategy belong to creator_channels; do not create market-specific platform rows such as TikTok JP.';

comment on table public.creator_project_releases is
  'Legacy Project Release Compatibility Model used by the current Publish Console. New distribution identity must use creator_variants + creator_channels + creator_publications rather than adding globalization fields here.';

create table public.creator_variants (
  variant_id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  variant_key text not null,
  label text not null default '',
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_variants_project_owner_fkey
    foreign key (project_id, owner_user_id)
    references public.creator_projects(project_id, owner_user_id)
    on delete cascade,
  constraint creator_variants_variant_project_owner_key
    unique (variant_id, project_id, owner_user_id),
  constraint creator_variants_project_variant_key
    unique (project_id, owner_user_id, variant_key),
  constraint creator_variants_variant_key_nonempty
    check (length(btrim(variant_key)) between 1 and 160),
  constraint creator_variants_status_nonempty
    check (length(btrim(status)) between 1 and 80)
);

comment on table public.creator_variants is
  'Distribution Variant identity under one Content Project Root. A Variant is a distribution/rendering target, not a Language Track; one Variant may later reference multiple language/audio tracks.';
comment on column public.creator_variants.variant_key is
  'Stable project-local identity such as YOUTUBE_GLOBAL_LONG or TIKTOK_JA_SHORT. Naming may describe intent but must not be treated as a Language Track identity.';
comment on column public.creator_variants.metadata is
  'Extensible distribution metadata. May describe intended format/language strategy, but does not replace future explicit language_track or visual_master identities.';

create table public.creator_channels (
  channel_id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  platform_id uuid not null references public.platforms(id) on delete restrict,
  channel_key text not null,
  name text not null,
  account_label text not null default '',
  market text not null default 'Global',
  primary_language text,
  language_mode text not null default 'single_language',
  supported_languages text[] not null default '{}'::text[],
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_channels_channel_owner_key
    unique (channel_id, owner_user_id),
  constraint creator_channels_owner_channel_key
    unique (owner_user_id, channel_key),
  constraint creator_channels_channel_key_nonempty
    check (length(btrim(channel_key)) between 1 and 160),
  constraint creator_channels_name_nonempty
    check (length(btrim(name)) between 1 and 240),
  constraint creator_channels_market_nonempty
    check (length(btrim(market)) between 1 and 120),
  constraint creator_channels_language_mode_nonempty
    check (length(btrim(language_mode)) between 1 and 80),
  constraint creator_channels_status_nonempty
    check (length(btrim(status)) between 1 and 80)
);

comment on table public.creator_channels is
  'Owner-scoped publication Channel = Platform + Account + Market + Language Strategy. Multiple Channels may point to the same platform_id, enabling cases such as TikTok JP and TikTok Global without duplicating the Platform Dictionary.';
comment on column public.creator_channels.platform_id is
  'Foreign-key identity to platforms. Business logic must join by platform_id rather than platform name strings.';
comment on column public.creator_channels.account_label is
  'Non-secret account identity/label for the Channel. Credentials and login tokens do not belong in this table.';
comment on column public.creator_channels.language_mode is
  'Channel language strategy such as single_language or multi_audio. This is strategy metadata, not a Language Track implementation.';
comment on column public.creator_channels.supported_languages is
  'Language capability metadata for routing/planning only. It does not create or identify future Language Track artifacts.';

create table public.creator_publications (
  publication_id uuid primary key default gen_random_uuid(),
  project_id text not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null,
  channel_id uuid not null,
  status text not null default 'draft',
  post_id text,
  post_url text,
  scheduled_at timestamptz,
  published_at timestamptz,
  failure_reason text,
  publish_package_snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_publications_project_owner_fkey
    foreign key (project_id, owner_user_id)
    references public.creator_projects(project_id, owner_user_id)
    on delete cascade,
  constraint creator_publications_variant_project_owner_fkey
    foreign key (variant_id, project_id, owner_user_id)
    references public.creator_variants(variant_id, project_id, owner_user_id)
    on delete cascade,
  constraint creator_publications_channel_owner_fkey
    foreign key (channel_id, owner_user_id)
    references public.creator_channels(channel_id, owner_user_id)
    on delete restrict,
  constraint creator_publications_status_nonempty
    check (length(btrim(status)) between 1 and 80)
);

comment on table public.creator_publications is
  'Concrete Publication event/instance: one Variant published or scheduled to one Channel. Repost, retry and repeated publications are first-class; there is intentionally no uniqueness constraint on project/variant/channel/platform combinations.';
comment on column public.creator_publications.publish_package_snapshot is
  'Metadata/text snapshot of the publish package used for this publication instance. Media bytes and absolute local file paths must not be stored here.';

create index creator_variants_project_idx
  on public.creator_variants (owner_user_id, project_id, updated_at desc);
create index creator_channels_platform_idx
  on public.creator_channels (owner_user_id, platform_id, updated_at desc);
create index creator_publications_project_idx
  on public.creator_publications (owner_user_id, project_id, created_at desc);
create index creator_publications_variant_idx
  on public.creator_publications (variant_id, created_at desc);
create index creator_publications_channel_idx
  on public.creator_publications (channel_id, created_at desc);
create index creator_publications_status_idx
  on public.creator_publications (owner_user_id, status, created_at desc);

alter table public.creator_variants enable row level security;
alter table public.creator_channels enable row level security;
alter table public.creator_publications enable row level security;

-- Mirror the established Creator Local-first security posture:
-- owner-scoped RLS exists as defense in depth, but browser/authenticated direct
-- CRUD stays revoked. Supported writes remain behind authenticated GUCC service
-- logic rather than exposing service_role or opening direct table access.
create policy creator_variants_owner_select
  on public.creator_variants for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy creator_variants_owner_insert
  on public.creator_variants for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy creator_variants_owner_update
  on public.creator_variants for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy creator_variants_owner_delete
  on public.creator_variants for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy creator_channels_owner_select
  on public.creator_channels for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy creator_channels_owner_insert
  on public.creator_channels for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy creator_channels_owner_update
  on public.creator_channels for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy creator_channels_owner_delete
  on public.creator_channels for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy creator_publications_owner_select
  on public.creator_publications for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy creator_publications_owner_insert
  on public.creator_publications for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy creator_publications_owner_update
  on public.creator_publications for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy creator_publications_owner_delete
  on public.creator_publications for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

revoke all on table public.creator_variants from anon, authenticated;
revoke all on table public.creator_channels from anon, authenticated;
revoke all on table public.creator_publications from anon, authenticated;
grant select, insert, update, delete on table public.creator_variants to service_role;
grant select, insert, update, delete on table public.creator_channels to service_role;
grant select, insert, update, delete on table public.creator_publications to service_role;

drop trigger if exists trg_creator_variants_touch_updated_at on public.creator_variants;
create trigger trg_creator_variants_touch_updated_at
before update on public.creator_variants
for each row execute function public.app_touch_updated_at();

drop trigger if exists trg_creator_channels_touch_updated_at on public.creator_channels;
create trigger trg_creator_channels_touch_updated_at
before update on public.creator_channels
for each row execute function public.app_touch_updated_at();

drop trigger if exists trg_creator_publications_touch_updated_at on public.creator_publications;
create trigger trg_creator_publications_touch_updated_at
before update on public.creator_publications
for each row execute function public.app_touch_updated_at();

-- No backfill by design. Existing Creator Projects continue to work without
-- Variant/Channel/Publication rows, and current Publish Console continues using
-- creator_project_releases until a later explicitly approved compatibility WP.

notify pgrst, 'reload schema';
