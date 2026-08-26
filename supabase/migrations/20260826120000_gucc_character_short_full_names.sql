begin;

alter table public.characters
  add column if not exists full_name text;

comment on column public.characters.name is '中文主显示名 / 简称';
comment on column public.characters.full_name is '中文全名；若无独立全名，则与 name 相同';

update public.characters
set full_name = name,
    updated_at = now()
where full_name is null or btrim(full_name) = '';

update public.characters
set name = '克拉蕾',
    full_name = '克拉蕾·弗林特',
    updated_at = now()
where id = '62aa6293-118f-4d3f-bb65-7b669567167e'::uuid;

update public.character_names
set name = '克拉蕾', updated_at = now()
where character_id = '62aa6293-118f-4d3f-bb65-7b669567167e'::uuid and lang = 'zh';

update public.characters
set name = '洛克茜',
    full_name = '洛克茜·伊芙莉塔·普莱斯',
    updated_at = now()
where id = '2ee0c329-c6de-42b7-8c8c-aad0683f85b4'::uuid;

update public.character_names
set name = '洛克茜', updated_at = now()
where character_id = '2ee0c329-c6de-42b7-8c8c-aad0683f85b4'::uuid and lang = 'zh';

create or replace function public.app_get_character_detail(p_payload jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_id uuid := (p_payload->>'id')::uuid;
  v_result jsonb;
begin
  select to_jsonb(x) into v_result
  from (
    select
      c.id,
      c.name,
      c.name as character_name,
      c.full_name,
      g.short_code as game_code,
      coalesce(g.title, g.code, g.short_code) as game_title,
      c.element, c.profession, c.sex, c.rarity, c.note,
      cp.research_status, cp.build_status, cp.progress_note as research_note,
      ce.like_level, ce.role_type, ce.power_rank, ce.note as evaluation_note,
      coalesce((select jsonb_object_agg(cn.lang, cn.name) from public.character_names cn where cn.character_id = c.id), '{}'::jsonb) as names,
      coalesce((
        select jsonb_agg(jsonb_build_object('title', r.title, 'url', r.url, 'relation_type', rr.relation_type, 'note', r.note))
        from public.resource_relations rr join public.resources r on r.id = rr.resource_id
        where rr.entity_type = 'character' and rr.entity_id = c.id
      ), '[]'::jsonb) as links
    from public.characters c
    left join public.games g on g.id = c.game_id
    left join public.character_progress cp on cp.character_id = c.id
    left join lateral (
      select * from public.character_evaluations ce0
      where ce0.character_id = c.id
      order by case when ce0.context = 'current' then 0 else 1 end, ce0.created_at desc nulls last limit 1
    ) ce on true
    where c.id = v_id
  ) x;

  if v_result is null then raise exception 'Character not found: %', v_id; end if;
  return v_result;
end $function$;

create or replace function public.app_save_character(p_payload jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_id uuid := nullif(p_payload->>'id', '')::uuid;
  v_game_id uuid := public.app_game_id(p_payload->>'game_code');
  v_name text := nullif(trim(coalesce(p_payload->>'name', p_payload->>'character_name')), '');
  v_full_name text;
  v_character_id uuid;
  v_existing_id uuid;
  rec record;
  v_resource_id uuid;
begin
  if v_game_id is null then raise exception 'Game not found: %', p_payload->>'game_code'; end if;
  if v_name is null then raise exception 'Character name is required'; end if;
  v_full_name := coalesce(nullif(trim(p_payload->>'full_name'), ''), v_name);

  if v_id is null then
    select c.id into v_existing_id
    from public.characters c
    where c.game_id = v_game_id and c.name = v_name
    limit 1;
    if v_existing_id is not null then
      raise exception 'Character already exists: %. Edit the existing record instead of creating a duplicate.', v_name;
    end if;

    insert into public.characters(id, game_id, name, full_name, element, profession, sex, rarity, note)
    values (gen_random_uuid(), v_game_id, v_name, v_full_name, nullif(p_payload->>'element',''), nullif(p_payload->>'profession',''), nullif(p_payload->>'sex',''), nullif(p_payload->>'rarity',''), nullif(p_payload->>'note',''))
    returning id into v_character_id;
  else
    if exists (select 1 from public.characters c where c.game_id=v_game_id and c.name=v_name and c.id<>v_id) then
      raise exception 'Another character already uses this name in the same game: %', v_name;
    end if;
    update public.characters set
      game_id = v_game_id,
      name = v_name,
      full_name = v_full_name,
      element = nullif(p_payload->>'element',''),
      profession = nullif(p_payload->>'profession',''),
      sex = nullif(p_payload->>'sex',''),
      rarity = nullif(p_payload->>'rarity',''),
      note = nullif(p_payload->>'note',''),
      updated_at = now()
    where id = v_id
    returning id into v_character_id;
  end if;

  if v_character_id is null then raise exception 'Character not found: %', v_id; end if;

  insert into public.character_progress(character_id, research_status, build_status, progress_note)
  values (v_character_id, public.app_strip_sort_prefix(p_payload->>'research_status'), public.app_strip_sort_prefix(p_payload->>'build_status'), nullif(coalesce(p_payload->>'research_note', p_payload->>'progress_note'),''))
  on conflict (character_id) do update set research_status=excluded.research_status, build_status=excluded.build_status, progress_note=excluded.progress_note, updated_at=now();

  insert into public.character_evaluations(id, character_id, context, role_type, power_rank, like_level, note)
  values (gen_random_uuid(), v_character_id, 'current', nullif(p_payload->>'role_type',''), nullif(p_payload->>'power_rank',''), public.app_strip_sort_prefix(p_payload->>'like_level'), nullif(p_payload->>'evaluation_note',''))
  on conflict (character_id, context) do update set role_type=excluded.role_type, power_rank=excluded.power_rank, like_level=excluded.like_level, note=excluded.note;

  insert into public.character_names(id, character_id, lang, name)
  values (gen_random_uuid(), v_character_id, 'zh', v_name)
  on conflict (character_id, lang) do update set name=excluded.name;

  if p_payload ? 'names' then
    delete from public.character_names where character_id=v_character_id and lang<>'zh';
  end if;

  for rec in select * from jsonb_each_text(coalesce(p_payload->'names','{}'::jsonb)) loop
    if nullif(trim(rec.value),'') is not null then
      insert into public.character_names(id, character_id, lang, name)
      values (gen_random_uuid(), v_character_id, lower(trim(rec.key)), trim(rec.value))
      on conflict (character_id, lang) do update set name=excluded.name;
    end if;
  end loop;

  if p_payload ? 'links' then
    delete from public.resource_relations rr
    using public.resources r
    where rr.resource_id=r.id
      and rr.entity_type='character'
      and rr.entity_id=v_character_id
      and rr.source_sheet is null
      and rr.source_field is null
      and not exists (
        select 1
        from jsonb_to_recordset(coalesce(p_payload->'links','[]'::jsonb)) as x(title text, url text, relation_type text, source text, note text)
        where nullif(trim(coalesce(x.url,'')),'') is not null
          and trim(x.url)=r.url
          and coalesce(nullif(x.relation_type,''),'research')=rr.relation_type
      );
  end if;

  for rec in select * from jsonb_to_recordset(coalesce(p_payload->'links','[]'::jsonb)) as x(title text, url text, relation_type text, source text, note text) loop
    if nullif(trim(coalesce(rec.url,'')),'') is not null then
      insert into public.resources(id, resource_type, title, url, source, note)
      values (gen_random_uuid(), 'link', nullif(rec.title,''), trim(rec.url), coalesce(nullif(rec.source,''),'frontend'), nullif(rec.note,''))
      on conflict (url) where url is not null do update set
        title=coalesce(excluded.title, public.resources.title),
        source=coalesce(public.resources.source, excluded.source),
        note=coalesce(excluded.note, public.resources.note)
      returning id into v_resource_id;

      insert into public.resource_relations(id, resource_id, entity_type, entity_id, relation_type)
      values (gen_random_uuid(), v_resource_id, 'character', v_character_id, coalesce(nullif(rec.relation_type,''),'research'))
      on conflict do nothing;
    end if;
  end loop;

  return jsonb_build_object('id',v_character_id,'saved',true);
end $function$;

create or replace function public.app_search_characters(p_payload jsonb default '{}'::jsonb)
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
    select
      c.id,
      c.name as character_name,
      c.full_name,
      g.short_code as game_code,
      coalesce(g.title, g.code, g.short_code) as game_title,
      c.element, c.profession, c.sex, c.rarity, c.note,
      cp.research_status, cp.build_status, cp.progress_note as research_note,
      ce.like_level, ce.role_type, ce.power_rank, ce.note as evaluation_note,
      coalesce((
        select jsonb_object_agg(cn.lang, cn.name order by cn.lang)
        from public.character_names cn
        where cn.character_id = c.id
          and cn.lang in ('en', 'jp', 'kr')
      ), '{}'::jsonb) as names,
      coalesce((
        select jsonb_agg(jsonb_build_object('title', r.title, 'url', r.url, 'relation_type', rr.relation_type))
        from public.resource_relations rr
        join public.resources r on r.id = rr.resource_id
        where rr.entity_type = 'character' and rr.entity_id = c.id
      ), '[]'::jsonb) as links
    from public.characters c
    left join public.games g on g.id = c.game_id
    left join public.character_progress cp on cp.character_id = c.id
    left join lateral (
      select * from public.character_evaluations ce0
      where ce0.character_id = c.id
      order by case when ce0.context = 'current' then 0 else 1 end, ce0.created_at desc nulls last
      limit 1
    ) ce on true
    where (v_game_code is null or g.short_code = v_game_code or g.code = v_game_code or g.title = v_game_code)
      and (
        v_keyword is null
        or c.name ilike '%' || v_keyword || '%'
        or coalesce(c.full_name, '') ilike '%' || v_keyword || '%'
        or coalesce(g.title, '') ilike '%' || v_keyword || '%'
        or coalesce(cp.research_status, '') ilike '%' || v_keyword || '%'
        or coalesce(cp.build_status, '') ilike '%' || v_keyword || '%'
        or exists (
          select 1
          from public.character_names cn_search
          where cn_search.character_id = c.id
            and cn_search.name ilike '%' || v_keyword || '%'
        )
      )
    order by c.name
    limit v_limit
  ) x;
  return v_result;
end $function$;

create or replace view public.v_character_overview as
select
  c.id as character_id,
  g.title as game_title,
  g.short_code as game_short_code,
  c.name as character_name,
  c.element,
  c.profession,
  c.sex,
  c.rarity,
  c.note as character_note,
  cp.research_status,
  cp.build_status,
  cp.progress_note as research_note,
  ce.like_level,
  ce.role_type,
  ce.power_rank,
  ce.note as evaluation_note,
  c.created_at,
  c.updated_at,
  c.full_name as character_full_name
from public.characters c
join public.games g on g.id = c.game_id
left join public.character_progress cp on cp.character_id = c.id
left join public.character_evaluations ce on ce.character_id = c.id and ce.context = 'current';

create or replace view public.v_character_progress_overview as
with character_resource_links as (
  select rr.entity_id as character_id,
    string_agg(distinct r.url, E'\n') filter (where rr.relation_type = 'official_profile' or r.resource_type = 'character_profile' or rr.source_field = 'CHARACTER') as official_profile_urls,
    string_agg(distinct r.url, E'\n') filter (where rr.relation_type = 'research' or r.resource_type = 'character_research' or rr.source_field = '先行研究') as research_urls
  from public.resource_relations rr
  join public.resources r on r.id = rr.resource_id
  where rr.entity_type = 'character'
  group by rr.entity_id
)
select
  g.title as game_title,
  c.name as character_name,
  cp.research_status,
  cp.build_status,
  cp.progress_note,
  crl.official_profile_urls,
  crl.research_urls,
  c.element,
  c.profession,
  c.full_name as character_full_name
from public.characters c
join public.games g on g.id = c.game_id
left join public.character_progress cp on cp.character_id = c.id
left join character_resource_links crl on crl.character_id = c.id;

commit;
