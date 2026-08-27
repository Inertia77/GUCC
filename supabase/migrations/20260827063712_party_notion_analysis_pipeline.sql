create unique index if not exists resource_relations_notion_party_kind_uidx
on public.resource_relations(entity_type, entity_id, relation_type, source_sheet)
where entity_type = 'party' and source_sheet = 'notion_ai_archive';

create or replace function public.app_get_or_create_party_analysis_target(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_game_input text := nullif(trim(coalesce(p_payload->>'game_code', p_payload->>'game')), '');
  v_game_id uuid;
  v_game_code text;
  v_game_title text;
  v_members jsonb := coalesce(p_payload->'members', '[]'::jsonb);
  v_member_count int;
  v_target_key text[] := '{}'::text[];
  v_target_names text[] := '{}'::text[];
  v_members_out jsonb := '[]'::jsonb;
  v_party_id uuid := nullif(p_payload->>'party_id', '')::uuid;
  v_summary text := nullif(trim(p_payload->>'summary'), '');
  v_party_type text := nullif(trim(p_payload->>'party_type'), '');
  v_status text := nullif(trim(p_payload->>'status'), '');
  v_hold_status text := nullif(trim(p_payload->>'hold_status'), '');
  v_description text := nullif(trim(p_payload->>'description'), '');
  v_create_if_missing boolean := coalesce((p_payload->>'create_if_missing')::boolean, true);
  v_created boolean := false;
  v_existing_summary text;
  v_existing_party_type text;
  v_existing_status text;
  v_existing_hold_status text;
  v_existing_description text;
  v_resource_id uuid;
  v_notion_url text;
  v_canonical_name text;
  v_char_id uuid;
  v_sorted_key text[];
  rec record;
begin
  if v_game_input is null then raise exception 'game_code/game is required'; end if;
  if jsonb_typeof(v_members) <> 'array' then raise exception 'members must be a JSON array of character names'; end if;

  v_member_count := jsonb_array_length(v_members);
  if v_member_count < 1 then raise exception 'members must contain at least one character name'; end if;

  v_game_id := public.app_game_id(v_game_input);
  if v_game_id is null then raise exception 'Game not found: %', v_game_input; end if;

  select g.short_code, coalesce(g.title, g.code, g.short_code)
    into v_game_code, v_game_title
  from public.games g
  where g.id = v_game_id;

  for rec in
    select ordinality::int as slot_no, trim(value) as raw_name
    from jsonb_array_elements_text(v_members) with ordinality
  loop
    if nullif(rec.raw_name, '') is null then raise exception 'members cannot contain empty character names'; end if;
    v_char_id := public.app_resolve_character_id(v_game_id, rec.raw_name);
    select c.name into v_canonical_name from public.characters c where c.id = v_char_id;
    v_canonical_name := coalesce(v_canonical_name, rec.raw_name);
    v_target_names := array_append(v_target_names, v_canonical_name);
    v_target_key := array_append(v_target_key, lower(trim(v_canonical_name)));
    v_members_out := v_members_out || jsonb_build_array(jsonb_build_object(
      'slot_no', rec.slot_no,
      'input_name', rec.raw_name,
      'name', v_canonical_name,
      'character_id', v_char_id
    ));
  end loop;

  select array_agg(x order by x) into v_sorted_key from unnest(v_target_key) as x;

  if v_party_id is not null then
    select p.summary, p.party_type, p.status, p.hold_status, p.description
      into v_existing_summary, v_existing_party_type, v_existing_status, v_existing_hold_status, v_existing_description
    from public.parties p
    where p.id = v_party_id and p.game_id = v_game_id;
    if not found then raise exception 'Party not found in game: %', v_party_id; end if;
  else
    select q.party_id, q.summary, q.party_type, q.status, q.hold_status, q.description
      into v_party_id, v_existing_summary, v_existing_party_type, v_existing_status, v_existing_hold_status, v_existing_description
    from (
      select
        p.id as party_id,
        p.summary,
        p.party_type,
        p.status,
        p.hold_status,
        p.description,
        p.updated_at,
        count(pm.id)::int as member_count,
        array_agg(lower(trim(coalesce(c.name, pm.member_name_raw))) order by lower(trim(coalesce(c.name, pm.member_name_raw)))) as member_key
      from public.parties p
      join public.party_members pm on pm.party_id = p.id
      left join public.characters c on c.id = pm.character_id
      where p.game_id = v_game_id
      group by p.id, p.summary, p.party_type, p.status, p.hold_status, p.description, p.updated_at
    ) q
    where q.member_count = v_member_count and q.member_key = v_sorted_key
    order by
      case when v_summary is not null and lower(trim(q.summary)) = lower(v_summary) then 0 else 1 end,
      q.updated_at desc nulls last
    limit 1;
  end if;

  if v_party_id is null then
    if not v_create_if_missing then
      return jsonb_build_object(
        'found', false,
        'created', false,
        'game_code', coalesce(v_game_code, v_game_input),
        'game_title', v_game_title,
        'members', v_members_out,
        'relation_type', 'notion_analysis',
        'has_existing_page', false
      );
    end if;

    v_summary := coalesce(v_summary, array_to_string(v_target_names, ' + '));
    v_status := coalesce(v_status, 'OK');
    v_hold_status := coalesce(v_hold_status, 'NO');

    insert into public.parties(id, game_id, summary, party_type, status, hold_status, description)
    values (gen_random_uuid(), v_game_id, v_summary, v_party_type, v_status, v_hold_status, v_description)
    returning id, summary, party_type, status, hold_status, description
      into v_party_id, v_existing_summary, v_existing_party_type, v_existing_status, v_existing_hold_status, v_existing_description;

    for rec in
      select ordinality::int as slot_no, trim(value) as raw_name
      from jsonb_array_elements_text(v_members) with ordinality
    loop
      v_char_id := public.app_resolve_character_id(v_game_id, rec.raw_name);
      insert into public.party_members(id, party_id, slot_no, character_id, member_name_raw)
      values (gen_random_uuid(), v_party_id, rec.slot_no, v_char_id, rec.raw_name);
    end loop;

    v_created := true;
  end if;

  select rr.resource_id, r.url
    into v_resource_id, v_notion_url
  from public.resource_relations rr
  join public.resources r on r.id = rr.resource_id
  where rr.entity_type = 'party'
    and rr.entity_id = v_party_id
    and rr.relation_type = 'notion_analysis'
    and rr.source_sheet = 'notion_ai_archive'
  order by rr.updated_at desc nulls last
  limit 1;

  return jsonb_build_object(
    'found', true,
    'created', v_created,
    'party_id', v_party_id,
    'game_code', coalesce(v_game_code, v_game_input),
    'game_title', v_game_title,
    'summary', v_existing_summary,
    'party_type', v_existing_party_type,
    'status', v_existing_status,
    'hold_status', v_existing_hold_status,
    'description', v_existing_description,
    'members', v_members_out,
    'relation_type', 'notion_analysis',
    'resource_type', 'party_analysis',
    'has_existing_page', v_resource_id is not null and v_notion_url is not null,
    'resource_id', v_resource_id,
    'notion_url', v_notion_url
  );
end
$function$;

comment on function public.app_get_or_create_party_analysis_target(jsonb) is
'Resolve an exact party by game plus order-insensitive member multiset; optionally create it; return the canonical Notion analysis target.';

revoke all on function public.app_get_or_create_party_analysis_target(jsonb) from public, anon, authenticated;
grant execute on function public.app_get_or_create_party_analysis_target(jsonb) to service_role, postgres;

create or replace function public.app_attach_party_notion(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_party_id uuid := nullif(p_payload->>'party_id', '')::uuid;
  v_url text := nullif(trim(coalesce(p_payload->>'notion_url', p_payload->>'url')), '');
  v_title text := nullif(trim(p_payload->>'title'), '');
  v_note text := nullif(trim(p_payload->>'note'), '');
  v_allow_replace boolean := coalesce((p_payload->>'allow_replace')::boolean, false);
  v_resource_id uuid;
  v_existing_url text;
  v_summary text;
  v_game_title text;
begin
  if v_party_id is null then raise exception 'party_id is required'; end if;
  if v_url is null then raise exception 'notion_url/url is required'; end if;
  if v_url !~* '^https://([a-z0-9-]+\.)?(notion\.so|notion\.site|notion\.com)/' then
    raise exception 'notion_url must be a Notion URL';
  end if;

  select p.summary, coalesce(g.title, g.code, g.short_code)
    into v_summary, v_game_title
  from public.parties p
  join public.games g on g.id = p.game_id
  where p.id = v_party_id;

  if v_summary is null then raise exception 'Party not found: %', v_party_id; end if;
  v_title := coalesce(v_title, format('AI阵容解析｜%s｜%s', v_game_title, v_summary));

  select rr.resource_id, r.url
    into v_resource_id, v_existing_url
  from public.resource_relations rr
  join public.resources r on r.id = rr.resource_id
  where rr.entity_type = 'party'
    and rr.entity_id = v_party_id
    and rr.relation_type = 'notion_analysis'
    and rr.source_sheet = 'notion_ai_archive'
  order by rr.updated_at desc nulls last
  limit 1;

  if v_resource_id is not null then
    if v_existing_url is distinct from v_url and not v_allow_replace then
      raise exception 'Existing Notion main page already attached for party %: %. Update that page instead, or pass allow_replace=true only for an intentional replacement.',
        v_party_id, v_existing_url;
    end if;

    update public.resources
    set resource_type = 'party_analysis',
        title = v_title,
        url = case when v_allow_replace then v_url else coalesce(v_existing_url, v_url) end,
        note = coalesce(v_note, note),
        source = 'notion_ai_archive',
        source_host = 'notion.so',
        source_authority = 'personal',
        ingested_via = 'ai',
        updated_at = now()
    where id = v_resource_id;
  else
    insert into public.resources(
      id, resource_type, title, url, note, source, source_host, source_authority, ingested_via, updated_at
    ) values (
      gen_random_uuid(), 'party_analysis', v_title, v_url, v_note,
      'notion_ai_archive', 'notion.so', 'personal', 'ai', now()
    )
    on conflict (url) where url is not null do update set
      resource_type = excluded.resource_type,
      title = excluded.title,
      note = coalesce(excluded.note, public.resources.note),
      source = 'notion_ai_archive',
      source_host = 'notion.so',
      source_authority = 'personal',
      ingested_via = 'ai',
      updated_at = now()
    returning id into v_resource_id;
  end if;

  insert into public.resource_relations(
    id, resource_id, entity_type, entity_id, relation_type, source_sheet, source_field, updated_at
  ) values (
    gen_random_uuid(), v_resource_id, 'party', v_party_id, 'notion_analysis',
    'notion_ai_archive', 'analysis', now()
  )
  on conflict (entity_type, entity_id, relation_type, source_sheet)
    where entity_type = 'party' and source_sheet = 'notion_ai_archive'
  do update set
    resource_id = excluded.resource_id,
    source_field = excluded.source_field,
    updated_at = now();

  return jsonb_build_object(
    'saved', true,
    'party_id', v_party_id,
    'resource_id', v_resource_id,
    'relation_type', 'notion_analysis',
    'resource_type', 'party_analysis',
    'title', v_title,
    'url', case when v_resource_id is not null and not v_allow_replace then coalesce(v_existing_url, v_url) else v_url end
  );
end
$function$;

comment on function public.app_attach_party_notion(jsonb) is
'Attach or update the single canonical Notion analysis page for a party.';

revoke all on function public.app_attach_party_notion(jsonb) from public, anon, authenticated;
grant execute on function public.app_attach_party_notion(jsonb) to service_role, postgres;

create or replace function public.app_search_parties(p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_keyword text := nullif(trim(p_payload->>'keyword'), '');
  v_game_code text := nullif(trim(p_payload->>'game_code'), '');
  v_limit int := least(greatest(coalesce((p_payload->>'limit')::int, 80), 1), 200);
  v_result jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_result
  from (
    select p.*, g.short_code as game_code,
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
    order by p.updated_at desc nulls last, p.created_at desc nulls last
    limit v_limit
  ) x;
  return v_result;
end
$function$;

revoke all on function public.app_search_parties(jsonb) from public, anon, authenticated;
grant execute on function public.app_search_parties(jsonb) to service_role, postgres;
