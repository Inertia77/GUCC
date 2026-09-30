
create or replace function public.sync_character_release_date_from_banner()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_release_date date;
begin
  if new.character_id is null or new.start_at is null then
    return new;
  end if;

  if coalesce(new.banner_type, '') = 'rerun'
     or coalesce(new.entry_role, '') = 'featured_rerun' then
    return new;
  end if;

  v_release_date := (new.start_at at time zone 'Asia/Shanghai')::date;

  update public.characters c
  set release_date = case
        when c.release_date is null then v_release_date
        when v_release_date < c.release_date then v_release_date
        else c.release_date
      end,
      updated_at = case
        when c.release_date is null or v_release_date < c.release_date then now()
        else c.updated_at
      end
  where c.id = new.character_id;

  return new;
end $$;

drop trigger if exists trg_sync_character_release_date_from_banner
  on public.version_banners;

create trigger trg_sync_character_release_date_from_banner
after insert or update of character_id, start_at, banner_type, entry_role
on public.version_banners
for each row
execute function public.sync_character_release_date_from_banner();

create or replace function public.sync_character_release_date_from_acquisition()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
declare
  v_release_date date;
begin
  if new.character_id is null or new.start_at is null then
    return new;
  end if;

  v_release_date := (new.start_at at time zone 'Asia/Shanghai')::date;

  update public.characters c
  set release_date = case
        when c.release_date is null then v_release_date
        when v_release_date < c.release_date then v_release_date
        else c.release_date
      end,
      updated_at = case
        when c.release_date is null or v_release_date < c.release_date then now()
        else c.updated_at
      end
  where c.id = new.character_id;

  return new;
end $$;

drop trigger if exists trg_sync_character_release_date_from_acquisition
  on public.version_acquisitions;

create trigger trg_sync_character_release_date_from_acquisition
after insert or update of character_id, start_at
on public.version_acquisitions
for each row
execute function public.sync_character_release_date_from_acquisition();
