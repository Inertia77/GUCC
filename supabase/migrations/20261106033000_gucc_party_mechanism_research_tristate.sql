-- GUCC 2026-11-06: research tri-state for party and mechanism records.
-- Legacy ownership/source metadata is retained as historical evidence, not used for active judgments.
-- All old party OK rows mean previously researched; unclassified mechanism rows start at ✕.
begin;

update public.parties
set status = case
  when status = 'OK' then '◯'
  when status = '待研究' or status is null then '✕'
  else status end,
  updated_at = now()
where status is distinct from case
  when status = 'OK' then '◯'
  when status = '待研究' or status is null then '✕'
  else status end;

alter table public.parties drop constraint if exists parties_status_chk;
alter table public.parties add constraint parties_status_chk
  check (status in ('◯', '△', '✕'));
alter table public.parties alter column status set default '✕';
alter table public.parties alter column status set not null;
-- Do not guess ownership for future party rows; keep old YES/NO for forensic reversibility.
alter table public.parties alter column hold_status drop not null;
alter table public.parties alter column hold_status drop default;
comment on column public.parties.hold_status is
  'Legacy ownership flag: historical only; no longer evaluated or written by GUCC UI/API.';

alter table public.mechanisms
  add column if not exists research_status text not null default '✕';
alter table public.mechanisms
  drop constraint if exists mechanisms_research_status_chk;
alter table public.mechanisms
  add constraint mechanisms_research_status_chk
  check (research_status in ('◯', '△', '✕'));
-- New records cannot claim to be official without evidence supplied through resource links.
alter table public.mechanisms alter column source_kind set default 'unspecified';
comment on column public.mechanisms.source_kind is
  'Legacy provenance label: retained for history but not shown or editable in GUCC. Research status is independent.';

-- Updated RPC: app_search_parties
CREATE OR REPLACE FUNCTION public.app_search_parties(p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_keyword text := nullif(trim(p_payload->>'keyword'), '');
  v_game_code text := nullif(trim(p_payload->>'game_code'), '');
  v_limit int := least(greatest(coalesce((p_payload->>'limit')::int, 80), 1), 200);
  v_result jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_result
  from (
    select p.id, p.game_id, p.summary, p.party_type, p.status, p.description, p.created_at, p.updated_at, g.short_code as game_code,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'slot_no', pm.slot_no,
            'name', coalesce(c.name, pm.member_name_raw),
            'member_role', pm.member_role
          ) order by pm.slot_no
        )
        from public.party_members pm
        left join public.characters c on c.id = pm.character_id
        where pm.party_id = p.id
      ), '[]'::jsonb) as members,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'title', r.title,
            'url', r.url,
            'relation_type', rr.relation_type,
            'note', r.note,
            'resource_type', r.resource_type
          ) order by case when rr.relation_type = 'notion_analysis' then 0 else 1 end, rr.updated_at desc nulls last
        )
        from public.resource_relations rr
        join public.resources r on r.id = rr.resource_id
        where rr.entity_type = 'party' and rr.entity_id = p.id
      ), '[]'::jsonb) as links
    from public.parties p
    left join public.games g on g.id = p.game_id
    where (v_game_code is null or g.short_code = v_game_code or g.code = v_game_code or g.title = v_game_code)
      and (
        v_keyword is null
        or p.summary ilike '%'||v_keyword||'%'
        or p.description ilike '%'||v_keyword||'%'
        or exists (
          select 1
          from public.party_members pm
          left join public.characters c on c.id = pm.character_id
          where pm.party_id = p.id
            and coalesce(c.name, pm.member_name_raw, '') ilike '%'||v_keyword||'%'
        )
      )
      and not exists (
        select 1
        from public.party_members pm
        join public.character_progress cp on cp.character_id = pm.character_id
        where pm.party_id = p.id
          and (cp.research_status = '対象外' or cp.build_status = '対象外')
      )
    order by p.updated_at desc nulls last, p.created_at desc nulls last
    limit v_limit
  ) x;
  return v_result;
end
$function$;

-- Updated RPC: app_save_party
CREATE OR REPLACE FUNCTION public.app_save_party(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_id uuid := nullif(p_payload->>'id','')::uuid;
  v_game_id uuid := public.app_game_id(p_payload->>'game_code');
  v_party_id uuid;
  rec record;
  v_char_id uuid;
  v_slots int[] := '{}'::int[];
begin
  if v_game_id is null then raise exception 'Game not found: %', p_payload->>'game_code'; end if;

  if v_id is null then
    insert into public.parties(id, game_id, summary, party_type, status, description)
    values (gen_random_uuid(), v_game_id, nullif(p_payload->>'summary',''), nullif(p_payload->>'party_type',''), coalesce(nullif(p_payload->>'status',''),'✕'), nullif(p_payload->>'description',''))
    returning id into v_party_id;
  else
    update public.parties set game_id=v_game_id, summary=nullif(p_payload->>'summary',''), party_type=nullif(p_payload->>'party_type',''), status=coalesce(nullif(p_payload->>'status',''),status), description=nullif(p_payload->>'description',''), updated_at=now()
    where id=v_id returning id into v_party_id;
  end if;

  if v_party_id is null then raise exception 'Party not found: %', v_id; end if;

  if p_payload ? 'members' then
    for rec in select * from jsonb_to_recordset(coalesce(p_payload->'members','[]'::jsonb)) as x(slot_no int, name text, member_role text) loop
      if nullif(trim(coalesce(rec.name,'')),'') is not null then
        rec.slot_no := coalesce(rec.slot_no,1);
        v_slots := array_append(v_slots,rec.slot_no);
        v_char_id := public.app_resolve_character_id(v_game_id,rec.name);
        insert into public.party_members(id, party_id, slot_no, character_id, member_name_raw, member_role)
        values (gen_random_uuid(), v_party_id, rec.slot_no, v_char_id, trim(rec.name), rec.member_role)
        on conflict (party_id,slot_no) do update set character_id=excluded.character_id, member_name_raw=excluded.member_name_raw, member_role=excluded.member_role;
      end if;
    end loop;

    if cardinality(v_slots)=0 then
      delete from public.party_members where party_id=v_party_id;
    else
      delete from public.party_members where party_id=v_party_id and not (slot_no=any(v_slots));
    end if;
  end if;

  -- Prevent records that would vanish immediately due to out-of-scope members.
  if exists (
    select 1
    from public.party_members pm
    join public.character_progress cp on cp.character_id = pm.character_id
    where pm.party_id = v_party_id
      and (cp.research_status = '対象外' or cp.build_status = '対象外')
  ) then
    raise exception '阵容包含対象外角色，请调整成员或角色状态后保存';
  end if;

  return jsonb_build_object('id',v_party_id,'saved',true);
end $function$;

-- Updated RPC: app_search_mechanisms
CREATE OR REPLACE FUNCTION public.app_search_mechanisms(p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
  with params as (
    select
      btrim(coalesce(p_payload->>'keyword', '')) as keyword,
      btrim(coalesce(p_payload->>'game_code', '')) as game_code,
      btrim(coalesce(p_payload->>'mechanism_type', '')) as mechanism_type,
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
      m.research_status,
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
      and (
        p.keyword = ''
        or m.title ilike '%' || p.keyword || '%'
        or coalesce(m.description, '') ilike '%' || p.keyword || '%'
        or coalesce(m.note, '') ilike '%' || p.keyword || '%'
        or coalesce(m.mechanism_type, '') ilike '%' || p.keyword || '%'
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

-- Updated RPC: app_get_mechanism_detail
CREATE OR REPLACE FUNCTION public.app_get_mechanism_detail(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
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
      m.research_status,
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

-- Updated RPC: app_save_mechanism
CREATE OR REPLACE FUNCTION public.app_save_mechanism(p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
declare
  v_id uuid := nullif(p_payload->>'id', '')::uuid;
  v_mechanism public.mechanisms%rowtype;
  v_game_id uuid;
  v_title text;
  v_mechanism_type text;
  v_description text;
  v_note text;
  v_research_status text;
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
  v_research_status := case
    when p_payload ? 'research_status' then nullif(btrim(p_payload->>'research_status'), '')
    when v_id is null then '✕'
    else v_mechanism.research_status
  end;
  if v_research_status is null or v_research_status not in ('◯', '△', '✕') then
    raise exception 'research_status must be one of ◯ / △ / ✕';
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
      id, game_id, title, mechanism_type, description, note, research_status, verified_at
    ) values (
      gen_random_uuid(), v_game_id, v_title, v_mechanism_type, v_description, v_note, v_research_status, v_verified_at
    ) returning id into v_saved_id;
  else
    update public.mechanisms
    set game_id = v_game_id,
        title = v_title,
        mechanism_type = v_mechanism_type,
        description = v_description,
        note = v_note,
        research_status = v_research_status,
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

commit;
