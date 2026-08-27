-- GUCC Mechanisms first-class entity integration.
-- Preserve all existing mechanism facts; migrate legacy source_url references into the shared Resource system.

alter table public.mechanisms
  drop constraint if exists mechanisms_type_chk;

alter table public.mechanisms
  drop constraint if exists mechanisms_source_kind_chk;

create index if not exists idx_mechanisms_type_source
  on public.mechanisms (mechanism_type, source_kind);

-- Bridge legacy source_url values into the existing shared resources table without rewriting existing resources.
with legacy as (
  select distinct on (btrim(m.source_url))
    btrim(m.source_url) as url,
    m.source_kind
  from public.mechanisms m
  where nullif(btrim(coalesce(m.source_url, '')), '') is not null
  order by btrim(m.source_url), m.created_at, m.id
)
insert into public.resources (id, resource_type, title, url, source)
select
  gen_random_uuid(),
  'link',
  case
    when l.url like '%bbs.mihoyo.com/%' then '米游社机制资料'
    when l.url like '%hoyolab.com/%' then 'HoYoLAB 机制资料'
    when l.url like '%wiki.kurobbs.com/%' then '库街区官方 Wiki'
    when l.url like '%kurobbs.com/%' then '库街区机制资料'
    when l.url like '%endfield.gryphline.com/%' then '终末地官方机制资料'
    when l.url like '%taptap.cn/%' then 'TapTap 机制资料'
    else '机制资料'
  end,
  l.url,
  case
    when l.url like '%bbs.mihoyo.com/%' then '米游社'
    when l.url like '%hoyolab.com/%' then 'HoYoLAB'
    when l.url like '%kurobbs.com/%' then '库街区'
    when l.url like '%endfield.gryphline.com/%' then '终末地官网'
    when l.url like '%taptap.cn/%' then 'TapTap'
    else l.source_kind
  end
from legacy l
on conflict (url) where url is not null do nothing;

insert into public.resource_relations (id, resource_id, entity_type, entity_id, relation_type)
select
  gen_random_uuid(),
  r.id,
  'mechanism',
  m.id,
  case
    when m.source_kind in ('official', 'official_wiki', 'official_community') then 'official_reference'
    when m.source_kind = 'guide' then 'guide'
    else 'reference'
  end
from public.mechanisms m
join public.resources r on r.url = btrim(m.source_url)
where nullif(btrim(coalesce(m.source_url, '')), '') is not null
on conflict do nothing;

create or replace function public.app_search_mechanisms(p_payload jsonb default '{}'::jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $function$
  with params as (
    select
      btrim(coalesce(p_payload->>'keyword', '')) as keyword,
      btrim(coalesce(p_payload->>'game_code', '')) as game_code,
      btrim(coalesce(p_payload->>'mechanism_type', '')) as mechanism_type,
      btrim(coalesce(p_payload->>'source_kind', '')) as source_kind,
      least(greatest(coalesce(nullif(p_payload->>'limit', '')::int, 200), 1), 1000) as row_limit
  ), rows as (
    select
      m.id,
      g.short_code as game_code,
      g.code as game_key,
      g.title as game_title,
      m.title,
      m.mechanism_type,
      m.description,
      m.note,
      m.source_kind,
      m.source_url,
      m.verified_at,
      m.created_at,
      m.updated_at,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'resource_id', r.id,
            'title', r.title,
            'url', r.url,
            'relation_type', rr.relation_type,
            'source', r.source,
            'note', r.note,
            'resource_type', r.resource_type
          )
          order by
            case rr.relation_type
              when 'official_reference' then 1
              when 'guide' then 2
              when 'research' then 3
              when 'demo' then 4
              when 'reference' then 5
              else 6
            end,
            coalesce(r.title, r.url),
            rr.id
        )
        from public.resource_relations rr
        join public.resources r on r.id = rr.resource_id
        where rr.entity_type = 'mechanism'
          and rr.entity_id = m.id
      ), '[]'::jsonb) as links
    from public.mechanisms m
    join public.games g on g.id = m.game_id
    cross join params p
    where (
        p.game_code = ''
        or lower(coalesce(g.short_code, '')) = lower(p.game_code)
        or lower(coalesce(g.code, '')) = lower(p.game_code)
        or lower(coalesce(g.title, '')) = lower(p.game_code)
      )
      and (p.mechanism_type = '' or lower(coalesce(m.mechanism_type, '')) = lower(p.mechanism_type))
      and (p.source_kind = '' or lower(coalesce(m.source_kind, '')) = lower(p.source_kind))
      and (
        p.keyword = ''
        or m.title ilike '%' || p.keyword || '%'
        or coalesce(m.description, '') ilike '%' || p.keyword || '%'
        or coalesce(m.note, '') ilike '%' || p.keyword || '%'
        or coalesce(m.mechanism_type, '') ilike '%' || p.keyword || '%'
        or coalesce(m.source_kind, '') ilike '%' || p.keyword || '%'
        or coalesce(g.short_code, '') ilike '%' || p.keyword || '%'
        or coalesce(g.code, '') ilike '%' || p.keyword || '%'
        or coalesce(g.title, '') ilike '%' || p.keyword || '%'
        or exists (
          select 1
          from public.resource_relations rr2
          join public.resources r2 on r2.id = rr2.resource_id
          where rr2.entity_type = 'mechanism'
            and rr2.entity_id = m.id
            and (
              coalesce(r2.title, '') ilike '%' || p.keyword || '%'
              or coalesce(r2.url, '') ilike '%' || p.keyword || '%'
              or coalesce(r2.source, '') ilike '%' || p.keyword || '%'
              or coalesce(r2.note, '') ilike '%' || p.keyword || '%'
            )
        )
      )
    order by g.title, m.title, m.id
    limit (select row_limit from params)
  )
  select coalesce(jsonb_agg(to_jsonb(rows) order by game_title, title, id), '[]'::jsonb)
  from rows;
$function$;

create or replace function public.app_get_mechanism_detail(p_payload jsonb)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_catalog
as $function$
  select to_jsonb(x)
  from (
    select
      m.id,
      g.short_code as game_code,
      g.code as game_key,
      g.title as game_title,
      m.title,
      m.mechanism_type,
      m.description,
      m.note,
      m.source_kind,
      m.source_url,
      m.verified_at,
      m.created_at,
      m.updated_at,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'resource_id', r.id,
            'title', r.title,
            'url', r.url,
            'relation_type', rr.relation_type,
            'source', r.source,
            'note', r.note,
            'resource_type', r.resource_type
          )
          order by
            case rr.relation_type
              when 'official_reference' then 1
              when 'guide' then 2
              when 'research' then 3
              when 'demo' then 4
              when 'reference' then 5
              else 6
            end,
            coalesce(r.title, r.url),
            rr.id
        )
        from public.resource_relations rr
        join public.resources r on r.id = rr.resource_id
        where rr.entity_type = 'mechanism'
          and rr.entity_id = m.id
      ), '[]'::jsonb) as links
    from public.mechanisms m
    join public.games g on g.id = m.game_id
    where m.id = nullif(p_payload->>'id', '')::uuid
  ) x;
$function$;

create or replace function public.app_save_mechanism(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_id uuid := nullif(p_payload->>'id', '')::uuid;
  v_mechanism public.mechanisms%rowtype;
  v_game_id uuid;
  v_title text;
  v_mechanism_type text;
  v_description text;
  v_note text;
  v_source_kind text;
  v_verified_at date;
  v_saved_id uuid;
  v_resource_id uuid;
  rec record;
begin
  if v_id is not null then
    select * into v_mechanism
    from public.mechanisms
    where id = v_id
    for update;
    if not found then
      raise exception 'Mechanism not found: %', v_id;
    end if;
  end if;

  if p_payload ? 'game_code' then
    v_game_id := public.app_game_id(p_payload->>'game_code');
  else
    v_game_id := v_mechanism.game_id;
  end if;
  if v_game_id is null then
    raise exception 'Game not found: %', p_payload->>'game_code';
  end if;

  if p_payload ? 'title' then
    v_title := nullif(btrim(p_payload->>'title'), '');
  else
    v_title := v_mechanism.title;
  end if;
  if v_title is null then
    raise exception 'Mechanism title is required';
  end if;

  v_mechanism_type := case when p_payload ? 'mechanism_type' then nullif(btrim(p_payload->>'mechanism_type'), '') else v_mechanism.mechanism_type end;
  v_description := case when p_payload ? 'description' then nullif(p_payload->>'description', '') else v_mechanism.description end;
  v_note := case when p_payload ? 'note' then nullif(p_payload->>'note', '') else v_mechanism.note end;
  v_source_kind := case
    when p_payload ? 'source_kind' then nullif(btrim(p_payload->>'source_kind'), '')
    when v_id is null then 'community'
    else v_mechanism.source_kind
  end;
  if v_source_kind is null then
    raise exception 'source_kind is required';
  end if;
  v_verified_at := case
    when p_payload ? 'verified_at' then nullif(btrim(p_payload->>'verified_at'), '')::date
    else v_mechanism.verified_at
  end;

  if exists (
    select 1
    from public.mechanisms m
    where m.game_id = v_game_id
      and m.title = v_title
      and (v_id is null or m.id <> v_id)
  ) then
    raise exception 'Mechanism already exists in this game: %. Edit the existing record instead of creating a duplicate.', v_title;
  end if;

  if v_id is null then
    insert into public.mechanisms (
      id, game_id, title, mechanism_type, description, note, source_kind, verified_at
    ) values (
      gen_random_uuid(), v_game_id, v_title, v_mechanism_type, v_description, v_note, v_source_kind, v_verified_at
    ) returning id into v_saved_id;
  else
    update public.mechanisms
    set game_id = v_game_id,
        title = v_title,
        mechanism_type = v_mechanism_type,
        description = v_description,
        note = v_note,
        source_kind = v_source_kind,
        verified_at = v_verified_at,
        updated_at = now()
    where id = v_id
    returning id into v_saved_id;
  end if;

  if p_payload ? 'links' then
    delete from public.resource_relations rr
    using public.resources r
    where rr.resource_id = r.id
      and rr.entity_type = 'mechanism'
      and rr.entity_id = v_saved_id
      and rr.source_sheet is null
      and rr.source_field is null
      and not exists (
        select 1
        from jsonb_to_recordset(coalesce(p_payload->'links', '[]'::jsonb))
          as x(title text, url text, relation_type text, source text, note text)
        where nullif(btrim(coalesce(x.url, '')), '') is not null
          and btrim(x.url) = r.url
          and coalesce(nullif(btrim(x.relation_type), ''), 'reference') = rr.relation_type
      );

    for rec in
      select *
      from jsonb_to_recordset(coalesce(p_payload->'links', '[]'::jsonb))
        as x(title text, url text, relation_type text, source text, note text)
    loop
      if nullif(btrim(coalesce(rec.url, '')), '') is null then
        if nullif(btrim(coalesce(rec.title, '')), '') is not null
           or nullif(btrim(coalesce(rec.relation_type, '')), '') is not null
           or nullif(btrim(coalesce(rec.source, '')), '') is not null
           or nullif(btrim(coalesce(rec.note, '')), '') is not null then
          raise exception 'Every mechanism resource needs a URL';
        end if;
        continue;
      end if;

      insert into public.resources (id, resource_type, title, url, source, note)
      values (
        gen_random_uuid(),
        'link',
        coalesce(nullif(btrim(rec.title), ''), btrim(rec.url)),
        btrim(rec.url),
        nullif(btrim(rec.source), ''),
        nullif(rec.note, '')
      )
      on conflict (url) where url is not null do update set
        title = coalesce(nullif(excluded.title, ''), public.resources.title),
        source = coalesce(excluded.source, public.resources.source),
        note = excluded.note
      returning id into v_resource_id;

      insert into public.resource_relations (id, resource_id, entity_type, entity_id, relation_type)
      values (
        gen_random_uuid(),
        v_resource_id,
        'mechanism',
        v_saved_id,
        coalesce(nullif(btrim(rec.relation_type), ''), 'reference')
      )
      on conflict do nothing;
    end loop;
  end if;

  return jsonb_build_object('id', v_saved_id, 'saved', true);
end;
$function$;

create or replace function public.app_delete_mechanism(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_id uuid := nullif(p_payload->>'id', '')::uuid;
  v_title text;
begin
  if v_id is null then
    raise exception 'Mechanism id is required';
  end if;

  select title into v_title
  from public.mechanisms
  where id = v_id
  for update;
  if not found then
    raise exception 'Mechanism not found: %', v_id;
  end if;

  delete from public.resource_relations
  where entity_type = 'mechanism'
    and entity_id = v_id;

  delete from public.mechanisms
  where id = v_id;

  return jsonb_build_object('id', v_id, 'title', v_title, 'deleted', true);
end;
$function$;

revoke all on function public.app_search_mechanisms(jsonb) from public, anon, authenticated;
revoke all on function public.app_get_mechanism_detail(jsonb) from public, anon, authenticated;
revoke all on function public.app_save_mechanism(jsonb) from public, anon, authenticated;
revoke all on function public.app_delete_mechanism(jsonb) from public, anon, authenticated;
grant execute on function public.app_search_mechanisms(jsonb) to service_role;
grant execute on function public.app_get_mechanism_detail(jsonb) to service_role;
grant execute on function public.app_save_mechanism(jsonb) to service_role;
grant execute on function public.app_delete_mechanism(jsonb) to service_role;
