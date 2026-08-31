-- WP_GLOB_001 follow-up: cover foreign-key leading columns reported by the
-- Supabase performance advisor. This changes no identity/cardinality semantics.

create index if not exists creator_channels_platform_fk_idx
  on public.creator_channels (platform_id);

create index if not exists creator_publications_project_owner_fk_idx
  on public.creator_publications (project_id, owner_user_id);

create index if not exists creator_publications_variant_project_owner_fk_idx
  on public.creator_publications (variant_id, project_id, owner_user_id);

create index if not exists creator_publications_channel_owner_fk_idx
  on public.creator_publications (channel_id, owner_user_id);
