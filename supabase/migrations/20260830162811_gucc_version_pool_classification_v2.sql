begin;

alter table public.version_banners
  add column if not exists pool_type text not null default 'unknown',
  add column if not exists entry_role text not null default 'unknown',
  add column if not exists pool_name text,
  add column if not exists is_featured boolean not null default true;

alter table public.version_banners drop constraint if exists version_banners_phase_chk;
alter table public.version_banners add constraint version_banners_phase_chk check (
  phase = any (array['first_half','second_half','whole_version','independent','standard','other','unknown']::text[])
);

alter table public.version_banners add constraint version_banners_pool_type_chk check (
  pool_type = any (array['limited','rerun','collab','standard','restructured','custom','selector','other','unknown']::text[])
);

alter table public.version_banners add constraint version_banners_entry_role_chk check (
  entry_role = any (array['featured_new','featured_rerun','featured','standard_addition','pool_option','other','unknown']::text[])
);

create or replace function public.normalize_version_banner_classification()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if new.pool_type is null or new.pool_type = 'unknown' then
    new.pool_type := case new.banner_type
      when 'new_limited' then 'limited'
      when 'pickup' then 'limited'
      when 'rerun' then 'rerun'
      when 'collab' then 'collab'
      when 'standard_addition' then 'standard'
      when 'standard' then 'standard'
      else 'unknown'
    end;
  end if;

  if new.entry_role is null or new.entry_role = 'unknown' then
    new.entry_role := case new.banner_type
      when 'new_limited' then 'featured_new'
      when 'pickup' then 'featured'
      when 'rerun' then 'featured_rerun'
      when 'collab' then 'featured_new'
      when 'standard_addition' then 'standard_addition'
      when 'standard' then 'featured'
      else 'unknown'
    end;
  end if;

  if new.banner_type is null or new.banner_type = 'unknown' then
    new.banner_type := case
      when new.entry_role = 'standard_addition' then 'standard_addition'
      when new.entry_role = 'featured_rerun' then 'rerun'
      when new.pool_type = 'collab' then 'collab'
      when new.entry_role = 'featured_new' then 'new_limited'
      when new.pool_type = 'standard' then 'standard'
      when new.entry_role in ('featured','pool_option') then 'pickup'
      else 'other'
    end;
  end if;

  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_version_banner_classification on public.version_banners;
create trigger trg_version_banner_classification
before insert or update on public.version_banners
for each row execute function public.normalize_version_banner_classification();

update public.version_banners set pool_type = pool_type where true;

create table if not exists public.version_acquisitions (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.game_versions(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  character_name_raw text not null,
  acquisition_type text not null,
  start_at timestamptz,
  end_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint version_acquisitions_type_chk check (
    acquisition_type = any (array['login_reward','event_reward','mail_reward','selector','shop_exchange','story_reward','other']::text[])
  ),
  constraint version_acquisitions_time_window_chk check (
    end_at is null or start_at is null or end_at >= start_at
  ),
  constraint version_acquisitions_unique unique(version_id, acquisition_type, character_name_raw)
);

create index if not exists idx_version_acquisitions_version_id on public.version_acquisitions(version_id);
alter table public.version_acquisitions enable row level security;

create or replace function public.app_search_versions(p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_keyword text := nullif(trim(p_payload->>'keyword'), '');
  v_game_code text := nullif(trim(p_payload->>'game_code'), '');
  v_limit int := least(greatest(coalesce((p_payload->>'limit')::int, 80), 1), 500);
  v_result jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_result
  from (
    select gv.*, g.short_code as game_code, g.code as game_code_full, g.title as game_title,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'phase', vb.phase,
          'banner_type', vb.banner_type,
          'pool_type', vb.pool_type,
          'entry_role', vb.entry_role,
          'pool_name', vb.pool_name,
          'is_featured', vb.is_featured,
          'character_name', coalesce(c.name, vb.character_name_raw),
          'start_at', vb.start_at,
          'end_at', vb.end_at,
          'note', vb.note
        ) order by vb.start_at nulls last, vb.created_at)
        from public.version_banners vb
        left join public.characters c on c.id = vb.character_id
        where vb.version_id = gv.id
      ), '[]'::jsonb) as banners,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'acquisition_type', va.acquisition_type,
          'character_name', coalesce(ca.name, va.character_name_raw),
          'start_at', va.start_at,
          'end_at', va.end_at,
          'note', va.note
        ) order by va.start_at nulls last, va.created_at)
        from public.version_acquisitions va
        left join public.characters ca on ca.id = va.character_id
        where va.version_id = gv.id
      ), '[]'::jsonb) as acquisitions
    from public.game_versions gv
    left join public.games g on g.id = gv.game_id
    where (v_game_code is null or g.short_code = v_game_code or g.code = v_game_code or g.title = v_game_code)
      and (
        v_keyword is null
        or gv.version_no ilike '%'||v_keyword||'%'
        or gv.version_name ilike '%'||v_keyword||'%'
        or gv.note ilike '%'||v_keyword||'%'
        or exists (
          select 1 from public.version_banners vb
          left join public.characters c on c.id = vb.character_id
          where vb.version_id = gv.id
            and (coalesce(c.name, vb.character_name_raw, '') ilike '%'||v_keyword||'%'
              or coalesce(vb.pool_name,'') ilike '%'||v_keyword||'%'
              or coalesce(vb.pool_type,'') ilike '%'||v_keyword||'%'
              or coalesce(vb.entry_role,'') ilike '%'||v_keyword||'%')
        )
        or exists (
          select 1 from public.version_acquisitions va
          left join public.characters ca on ca.id = va.character_id
          where va.version_id = gv.id
            and (coalesce(ca.name, va.character_name_raw, '') ilike '%'||v_keyword||'%'
              or coalesce(va.acquisition_type,'') ilike '%'||v_keyword||'%')
        )
      )
    order by gv.start_date desc nulls last, gv.created_at desc
    limit v_limit
  ) x;
  return v_result;
end $$;

create or replace function public.app_save_version(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id uuid := nullif(p_payload->>'id','')::uuid;
  v_game_id uuid := public.app_game_id(p_payload->>'game_code');
  v_version_no text := nullif(trim(p_payload->>'version_no'),'');
  v_version_id uuid;
  v_existing_id uuid;
  rec record;
  v_char_id uuid;
begin
  if v_game_id is null then raise exception 'Game not found: %', p_payload->>'game_code'; end if;
  if v_version_no is null then raise exception 'Version number is required'; end if;

  if v_id is null then
    select id into v_existing_id from public.game_versions where game_id=v_game_id and version_no=v_version_no limit 1;
    if v_existing_id is not null then raise exception 'Version already exists: %. Edit the existing record instead.', v_version_no; end if;
    insert into public.game_versions(id, game_id, version_no, version_name, start_date, end_date, note)
    values (gen_random_uuid(), v_game_id, v_version_no, nullif(p_payload->>'version_name',''), nullif(p_payload->>'start_date','')::date, nullif(p_payload->>'end_date','')::date, nullif(p_payload->>'note',''))
    returning id into v_version_id;
  else
    if exists (select 1 from public.game_versions where game_id=v_game_id and version_no=v_version_no and id<>v_id) then
      raise exception 'Another record already uses this version number in the same game: %', v_version_no;
    end if;
    update public.game_versions set game_id=v_game_id, version_no=v_version_no, version_name=nullif(p_payload->>'version_name',''), start_date=nullif(p_payload->>'start_date','')::date, end_date=nullif(p_payload->>'end_date','')::date, note=nullif(p_payload->>'note',''), updated_at=now()
    where id=v_id returning id into v_version_id;
  end if;

  if v_version_id is null then raise exception 'Version not found: %', v_id; end if;

  if p_payload ? 'banners' then
    delete from public.version_banners where version_id=v_version_id;
    for rec in
      select * from jsonb_to_recordset(coalesce(p_payload->'banners','[]'::jsonb))
      as x(phase text, banner_type text, pool_type text, entry_role text, pool_name text, is_featured boolean, character_name text, start_at text, end_at text, note text)
    loop
      if nullif(trim(coalesce(rec.character_name,'')),'') is not null then
        v_char_id := public.app_resolve_character_id(v_game_id,rec.character_name);
        insert into public.version_banners(id, version_id, phase, banner_type, pool_type, entry_role, pool_name, is_featured, character_id, character_name_raw, start_at, end_at, note)
        values (gen_random_uuid(), v_version_id, coalesce(nullif(rec.phase,''),'unknown'), coalesce(nullif(rec.banner_type,''),'unknown'), coalesce(nullif(rec.pool_type,''),'unknown'), coalesce(nullif(rec.entry_role,''),'unknown'), nullif(rec.pool_name,''), coalesce(rec.is_featured,true), v_char_id, trim(rec.character_name), nullif(rec.start_at,'')::timestamptz, nullif(rec.end_at,'')::timestamptz, rec.note);
      end if;
    end loop;
  end if;

  if p_payload ? 'acquisitions' then
    delete from public.version_acquisitions where version_id=v_version_id;
    for rec in
      select * from jsonb_to_recordset(coalesce(p_payload->'acquisitions','[]'::jsonb))
      as x(acquisition_type text, character_name text, start_at text, end_at text, note text)
    loop
      if nullif(trim(coalesce(rec.character_name,'')),'') is not null then
        v_char_id := public.app_resolve_character_id(v_game_id,rec.character_name);
        insert into public.version_acquisitions(id, version_id, acquisition_type, character_id, character_name_raw, start_at, end_at, note)
        values (gen_random_uuid(), v_version_id, coalesce(nullif(rec.acquisition_type,''),'other'), v_char_id, trim(rec.character_name), nullif(rec.start_at,'')::timestamptz, nullif(rec.end_at,'')::timestamptz, rec.note);
      end if;
    end loop;
  end if;

  return jsonb_build_object('id',v_version_id,'saved',true);
end $$;

commit;
