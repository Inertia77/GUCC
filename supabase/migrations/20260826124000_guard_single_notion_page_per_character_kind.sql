create or replace function public.app_get_character_notion_target(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_game_input text := nullif(trim(coalesce(p_payload->>'game_code', p_payload->>'game')), '');
  v_character_input text := nullif(trim(coalesce(p_payload->>'character_name', p_payload->>'name')), '');
  v_kind_raw text := lower(nullif(trim(coalesce(p_payload->>'kind', p_payload->>'type')), ''));
  v_kind text;
  v_game_id uuid;
  v_character_id uuid;
  v_character_name text;
  v_full_name text;
  v_relation_type text;
  v_resource_id uuid;
  v_url text;
begin
  if v_game_input is null then raise exception 'game_code/game is required'; end if;
  if v_character_input is null then raise exception 'character_name/name is required'; end if;

  v_kind := case
    when v_kind_raw in ('analysis', 'research', 'combat', '解析') then 'analysis'
    when v_kind_raw in ('persona', 'character', 'lore', '人物') then 'persona'
    when v_kind_raw in ('build', 'growth', '养成') then 'build'
    else null
  end;
  if v_kind is null then raise exception 'kind must be analysis, persona, or build'; end if;

  v_game_id := public.app_game_id(v_game_input);
  if v_game_id is null then raise exception 'Game not found: %', v_game_input; end if;

  select c.id, c.name, c.full_name
    into v_character_id, v_character_name, v_full_name
  from public.characters c
  where c.game_id = v_game_id
    and (
      lower(trim(c.name)) = lower(v_character_input)
      or lower(trim(coalesce(c.full_name, ''))) = lower(v_character_input)
    )
  order by case when lower(trim(c.name)) = lower(v_character_input) then 0 else 1 end
  limit 1;

  if v_character_id is null then
    return jsonb_build_object('found', false, 'game_code', v_game_input, 'character_input', v_character_input, 'kind', v_kind);
  end if;

  v_relation_type := case v_kind
    when 'analysis' then 'notion_analysis'
    when 'persona' then 'notion_persona'
    when 'build' then 'notion_build'
  end;

  select rr.resource_id, r.url
    into v_resource_id, v_url
  from public.resource_relations rr
  join public.resources r on r.id = rr.resource_id
  where rr.entity_type = 'character'
    and rr.entity_id = v_character_id
    and rr.relation_type = v_relation_type
    and rr.source_sheet = 'notion_ai_archive'
  order by rr.updated_at desc
  limit 1;

  return jsonb_build_object(
    'found', true,
    'character_id', v_character_id,
    'canonical_name', v_character_name,
    'full_name', v_full_name,
    'kind', v_kind,
    'relation_type', v_relation_type,
    'has_existing_page', v_resource_id is not null and v_url is not null,
    'resource_id', v_resource_id,
    'notion_url', v_url
  );
end
$function$;

revoke all on function public.app_get_character_notion_target(jsonb) from public;
grant execute on function public.app_get_character_notion_target(jsonb) to service_role;

create or replace function public.app_attach_character_notion(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_game_input text := nullif(trim(coalesce(p_payload->>'game_code', p_payload->>'game')), '');
  v_character_input text := nullif(trim(coalesce(p_payload->>'character_name', p_payload->>'name')), '');
  v_kind_raw text := lower(nullif(trim(coalesce(p_payload->>'kind', p_payload->>'type')), ''));
  v_kind text;
  v_url text := nullif(trim(coalesce(p_payload->>'notion_url', p_payload->>'url')), '');
  v_title text := nullif(trim(p_payload->>'title'), '');
  v_note text := nullif(trim(p_payload->>'note'), '');
  v_allow_replace boolean := coalesce((p_payload->>'allow_replace')::boolean, false);
  v_game_id uuid;
  v_character_id uuid;
  v_character_name text;
  v_full_name text;
  v_resource_id uuid;
  v_existing_url text;
  v_relation_type text;
  v_resource_type text;
  v_game_title text;
begin
  if v_game_input is null then raise exception 'game_code/game is required'; end if;
  if v_character_input is null then raise exception 'character_name/name is required'; end if;

  v_kind := case
    when v_kind_raw in ('analysis', 'research', 'combat', '解析') then 'analysis'
    when v_kind_raw in ('persona', 'character', 'lore', '人物') then 'persona'
    when v_kind_raw in ('build', 'growth', '养成') then 'build'
    else null
  end;
  if v_kind is null then raise exception 'kind must be analysis, persona, or build'; end if;

  if v_url is null then raise exception 'notion_url/url is required'; end if;
  if v_url !~* '^https://([a-z0-9-]+\.)?(notion\.so|notion\.site|notion\.com)/' then
    raise exception 'notion_url must be a Notion URL';
  end if;

  v_game_id := public.app_game_id(v_game_input);
  if v_game_id is null then raise exception 'Game not found: %', v_game_input; end if;

  select c.id, c.name, c.full_name, coalesce(g.title, g.code, g.short_code)
    into v_character_id, v_character_name, v_full_name, v_game_title
  from public.characters c
  join public.games g on g.id = c.game_id
  where c.game_id = v_game_id
    and (
      lower(trim(c.name)) = lower(v_character_input)
      or lower(trim(coalesce(c.full_name, ''))) = lower(v_character_input)
    )
  order by case when lower(trim(c.name)) = lower(v_character_input) then 0 else 1 end
  limit 1;

  if v_character_id is null then
    raise exception 'Character not found in %: %', v_game_input, v_character_input;
  end if;

  case v_kind
    when 'analysis' then
      v_relation_type := 'notion_analysis';
      v_resource_type := 'character_analysis';
      v_title := coalesce(v_title, format('AI解析｜%s｜%s', v_game_title, v_character_name));
    when 'persona' then
      v_relation_type := 'notion_persona';
      v_resource_type := 'character_persona';
      v_title := coalesce(v_title, format('AI人物｜%s｜%s', v_game_title, v_character_name));
    when 'build' then
      v_relation_type := 'notion_build';
      v_resource_type := 'character_build';
      v_title := coalesce(v_title, format('AI养成｜%s｜%s', v_game_title, v_character_name));
  end case;

  select rr.resource_id, r.url
    into v_resource_id, v_existing_url
  from public.resource_relations rr
  join public.resources r on r.id = rr.resource_id
  where rr.entity_type = 'character'
    and rr.entity_id = v_character_id
    and rr.relation_type = v_relation_type
    and rr.source_sheet = 'notion_ai_archive'
  order by rr.updated_at desc
  limit 1;

  if v_resource_id is not null then
    if v_existing_url is distinct from v_url and not v_allow_replace then
      raise exception 'Existing Notion main page already attached for % / % / %: %. Update that page instead, or pass allow_replace=true only for an intentional replacement.',
        v_game_input, v_character_name, v_kind, v_existing_url;
    end if;

    update public.resources
    set resource_type = v_resource_type,
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
      gen_random_uuid(), v_resource_type, v_title, v_url, v_note,
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
    gen_random_uuid(), v_resource_id, 'character', v_character_id, v_relation_type,
    'notion_ai_archive', v_kind, now()
  )
  on conflict (entity_type, entity_id, relation_type, source_sheet)
    where entity_type = 'character' and source_sheet = 'notion_ai_archive'
  do update set
    resource_id = excluded.resource_id,
    source_field = excluded.source_field,
    updated_at = now();

  return jsonb_build_object(
    'saved', true,
    'character_id', v_character_id,
    'canonical_name', v_character_name,
    'full_name', v_full_name,
    'resource_id', v_resource_id,
    'kind', v_kind,
    'relation_type', v_relation_type,
    'resource_type', v_resource_type,
    'title', v_title,
    'url', case when v_resource_id is not null and not v_allow_replace then coalesce(v_existing_url, v_url) else v_url end
  );
end
$function$;

revoke all on function public.app_attach_character_notion(jsonb) from public;
grant execute on function public.app_attach_character_notion(jsonb) to service_role;
