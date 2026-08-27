begin;

alter table public.game_versions
  add column if not exists end_date date;

alter table public.version_banners
  add column if not exists start_at timestamptz,
  add column if not exists end_at timestamptz;

comment on column public.game_versions.end_date is '版本/活动锚点结束日期；未知时留空，不从版本周期猜测';
comment on column public.version_banners.start_at is '卡池/获取窗口开始时间（带时区）；未知时留空';
comment on column public.version_banners.end_at is '卡池/获取窗口结束时间（带时区）；未知时留空';

alter table public.version_banners drop constraint if exists version_banners_type_chk;
alter table public.version_banners
  add constraint version_banners_type_chk
  check (banner_type = any (array[
    'new_limited','pickup','rerun','collab','standard_addition','standard','other','unknown'
  ]::text[]));

alter table public.game_versions drop constraint if exists game_versions_date_window_chk;
alter table public.game_versions
  add constraint game_versions_date_window_chk
  check (end_date is null or start_date is null or end_date >= start_date);

alter table public.version_banners drop constraint if exists version_banners_time_window_chk;
alter table public.version_banners
  add constraint version_banners_time_window_chk
  check (end_at is null or start_at is null or end_at >= start_at);

create or replace function public.app_search_versions(p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_keyword text := nullif(trim(p_payload->>'keyword'), '');
  v_game_code text := nullif(trim(p_payload->>'game_code'), '');
  v_limit int := least(greatest(coalesce((p_payload->>'limit')::int, 80), 1), 200);
  v_result jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_result
  from (
    select gv.*, g.short_code as game_code,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'phase', vb.phase,
          'banner_type', vb.banner_type,
          'character_name', coalesce(c.name, vb.character_name_raw),
          'start_at', vb.start_at,
          'end_at', vb.end_at,
          'note', vb.note
        ) order by vb.start_at nulls last, vb.created_at)
        from public.version_banners vb
        left join public.characters c on c.id = vb.character_id
        where vb.version_id = gv.id
      ), '[]'::jsonb) as banners
    from public.game_versions gv
    left join public.games g on g.id = gv.game_id
    where (v_game_code is null or g.short_code = v_game_code or g.code = v_game_code or g.title = v_game_code)
      and (
        v_keyword is null
        or gv.version_no ilike '%'||v_keyword||'%'
        or gv.version_name ilike '%'||v_keyword||'%'
        or gv.note ilike '%'||v_keyword||'%'
        or exists (
          select 1
          from public.version_banners vb
          left join public.characters c on c.id = vb.character_id
          where vb.version_id = gv.id
            and coalesce(c.name, vb.character_name_raw, '') ilike '%'||v_keyword||'%'
        )
      )
    order by gv.start_date desc nulls last, gv.created_at desc
    limit v_limit
  ) x;
  return v_result;
end $function$;

create or replace function public.app_save_version(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
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
    select id into v_existing_id
    from public.game_versions
    where game_id=v_game_id and version_no=v_version_no
    limit 1;
    if v_existing_id is not null then
      raise exception 'Version already exists: %. Edit the existing record instead.', v_version_no;
    end if;
    insert into public.game_versions(id,game_id,version_no,version_name,start_date,end_date,note)
    values (
      gen_random_uuid(),v_game_id,v_version_no,
      nullif(p_payload->>'version_name',''),
      nullif(p_payload->>'start_date','')::date,
      nullif(p_payload->>'end_date','')::date,
      nullif(p_payload->>'note','')
    ) returning id into v_version_id;
  else
    if exists (
      select 1 from public.game_versions
      where game_id=v_game_id and version_no=v_version_no and id<>v_id
    ) then
      raise exception 'Another record already uses this version number in the same game: %', v_version_no;
    end if;
    update public.game_versions set
      game_id=v_game_id,
      version_no=v_version_no,
      version_name=nullif(p_payload->>'version_name',''),
      start_date=nullif(p_payload->>'start_date','')::date,
      end_date=nullif(p_payload->>'end_date','')::date,
      note=nullif(p_payload->>'note',''),
      updated_at=now()
    where id=v_id
    returning id into v_version_id;
  end if;

  if v_version_id is null then raise exception 'Version not found: %', v_id; end if;

  if p_payload ? 'banners' then
    delete from public.version_banners where version_id=v_version_id;
    for rec in
      select * from jsonb_to_recordset(coalesce(p_payload->'banners','[]'::jsonb))
      as x(phase text,banner_type text,character_name text,start_at text,end_at text,note text)
    loop
      if nullif(trim(coalesce(rec.character_name,'')),'') is not null then
        v_char_id := public.app_resolve_character_id(v_game_id,rec.character_name);
        insert into public.version_banners(
          id,version_id,phase,banner_type,character_id,character_name_raw,start_at,end_at,note
        ) values (
          gen_random_uuid(),v_version_id,
          coalesce(nullif(rec.phase,''),'unknown'),
          coalesce(nullif(rec.banner_type,''),'unknown'),
          v_char_id,trim(rec.character_name),
          nullif(rec.start_at,'')::timestamptz,
          nullif(rec.end_at,'')::timestamptz,
          rec.note
        );
      end if;
    end loop;
  end if;

  return jsonb_build_object('id',v_version_id,'saved',true);
end $function$;

commit;
