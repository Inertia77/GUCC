-- GUCC Creator OS Phase 2A: Local-first Foundation
--
-- Logical Artifact != Physical File.
-- creator_project_files remains the canonical logical artifact checklist.
-- creator_devices identifies a concrete browser/desktop/agent environment.
-- creator_file_locations records where a logical artifact was actually observed.
--
-- This migration intentionally does NOT infer physical locations from the legacy
-- relative_path/storage_provider columns on creator_project_files. Existing rows
-- are templates/checklist entries and are not proof that a file exists.

create table if not exists public.creator_devices (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null,
  label text not null default '',
  device_kind text not null default 'unknown',
  platform text,
  workspace_root text,
  capabilities jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_devices_owner_device_key unique (owner_user_id, device_id),
  constraint creator_devices_device_id_nonempty check (length(btrim(device_id)) between 1 and 160),
  constraint creator_devices_kind_chk check (device_kind in ('web','desktop','agent','unknown'))
);

comment on table public.creator_devices is
  'Owner-scoped identities for GUCC web/desktop/agent environments. A device may have a local workspace root; no media bytes are stored here.';
comment on column public.creator_devices.workspace_root is
  'Optional local workspace root for this device. Physical files remain local; GUCC stores only the location pointer.';

-- A composite identity lets locations prove that their logical artifact belongs
-- to the same project and owner without trusting duplicated project_id metadata.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'creator_project_files_id_project_owner_key'
      and conrelid = 'public.creator_project_files'::regclass
  ) then
    alter table public.creator_project_files
      add constraint creator_project_files_id_project_owner_key
      unique (id, project_id, owner_user_id);
  end if;
end $$;

create table if not exists public.creator_file_locations (
  id uuid primary key default gen_random_uuid(),
  logical_file_id uuid not null,
  project_id text not null,
  owner_user_id uuid not null,
  device_id text not null,
  storage_provider text not null default 'local',
  relative_path text not null,
  availability text not null default 'unknown',
  provider_file_id text,
  provider_url text,
  filename text,
  mime_type text,
  size_bytes bigint,
  checksum text,
  file_modified_at timestamptz,
  observed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_file_locations_logical_owner_fkey
    foreign key (logical_file_id, project_id, owner_user_id)
    references public.creator_project_files(id, project_id, owner_user_id)
    on delete cascade,
  constraint creator_file_locations_project_owner_fkey
    foreign key (project_id, owner_user_id)
    references public.creator_projects(project_id, owner_user_id)
    on delete cascade,
  constraint creator_file_locations_device_owner_fkey
    foreign key (owner_user_id, device_id)
    references public.creator_devices(owner_user_id, device_id)
    on delete cascade,
  constraint creator_file_locations_file_device_provider_key
    unique (owner_user_id, logical_file_id, device_id, storage_provider),
  constraint creator_file_locations_relative_path_nonempty check (length(btrim(relative_path)) > 0),
  constraint creator_file_locations_size_nonnegative check (size_bytes is null or size_bytes >= 0),
  constraint creator_file_locations_availability_chk check (availability in ('unknown','present','missing','stale'))
);

comment on table public.creator_file_locations is
  'Observed physical/provider locations for logical creator artifacts. Rows are evidence of a location, not the artifact definition itself.';
comment on column public.creator_file_locations.relative_path is
  'Observed path relative to creator_devices.workspace_root when storage_provider=local. Absolute local paths should not be required by cloud state.';
comment on column public.creator_project_files.relative_path is
  'Canonical expected project-relative path for the logical artifact. It is not proof that a physical file exists.';
comment on column public.creator_project_files.storage_provider is
  'Legacy compatibility/cache metadata on the logical artifact. Physical/provider observations belong in creator_file_locations.';

create index if not exists creator_devices_owner_last_seen_idx
  on public.creator_devices (owner_user_id, last_seen_at desc);
create index if not exists creator_file_locations_project_idx
  on public.creator_file_locations (owner_user_id, project_id, updated_at desc);
create index if not exists creator_file_locations_device_idx
  on public.creator_file_locations (owner_user_id, device_id, updated_at desc);
create index if not exists creator_file_locations_logical_file_idx
  on public.creator_file_locations (logical_file_id, updated_at desc);

alter table public.creator_devices enable row level security;
alter table public.creator_file_locations enable row level security;

create policy creator_devices_owner_select
  on public.creator_devices for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy creator_devices_owner_insert
  on public.creator_devices for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy creator_devices_owner_update
  on public.creator_devices for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy creator_devices_owner_delete
  on public.creator_devices for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

create policy creator_file_locations_owner_select
  on public.creator_file_locations for select to authenticated
  using ((select auth.uid()) = owner_user_id);
create policy creator_file_locations_owner_insert
  on public.creator_file_locations for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);
create policy creator_file_locations_owner_update
  on public.creator_file_locations for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
create policy creator_file_locations_owner_delete
  on public.creator_file_locations for delete to authenticated
  using ((select auth.uid()) = owner_user_id);

revoke all on table public.creator_devices from anon;
revoke all on table public.creator_file_locations from anon;
grant select, insert, update, delete on table public.creator_devices to authenticated;
grant select, insert, update, delete on table public.creator_file_locations to authenticated;

-- Reuse the existing updated_at contract used by the other Creator tables.
drop trigger if exists trg_creator_devices_touch_updated_at on public.creator_devices;
create trigger trg_creator_devices_touch_updated_at
before update on public.creator_devices
for each row execute function public.app_touch_updated_at();

drop trigger if exists trg_creator_file_locations_touch_updated_at on public.creator_file_locations;
create trigger trg_creator_file_locations_touch_updated_at
before update on public.creator_file_locations
for each row execute function public.app_touch_updated_at();

-- Existing last_device_id values are trustworthy device identities, but the
-- existing creator_project_files rows are only logical templates. Therefore only
-- devices are backfilled here; zero physical file-location rows are fabricated.
insert into public.creator_devices (
  owner_user_id, device_id, label, device_kind, metadata, first_seen_at, last_seen_at
)
select
  cp.owner_user_id,
  cp.last_device_id,
  'GUCC Web',
  case when cp.last_device_id like 'web_%' then 'web' else 'unknown' end,
  jsonb_build_object('backfilledFrom', 'creator_projects.last_device_id'),
  min(cp.created_at),
  max(cp.updated_at)
from public.creator_projects cp
where nullif(btrim(cp.last_device_id), '') is not null
group by cp.owner_user_id, cp.last_device_id
on conflict (owner_user_id, device_id) do update
  set last_seen_at = greatest(public.creator_devices.last_seen_at, excluded.last_seen_at),
      updated_at = now();

notify pgrst, 'reload schema';
