create or replace function public.app_attach_character_chat(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  v_game_input text := nullif(trim(coalesce(p_payload->>'game_code', p_payload->>'game')), '');
  v_character_name text := nullif(trim(coalesce(p_payload->>'character_name', p_payload->>'name')), '');
  v_kind text := lower(nullif(trim(coalesce(p_payload->>'kind', p_payload->>'type')), ''));
  v_url text := nullif(trim(coalesce(p_payload->>'chat_url', p_payload->>'url')), '');
  v_title text := nullif(trim(p_payload->>'title'), '');
  v_note text := nullif(trim(p_payload->>'note'), '');
  v_game_id uuid;
  v_character_id uuid;
  v_resource_id uuid;
  v_relation_type text;
  v_resource_type text;
  v_game_title text;
begin
  if v_game_input is null then raise exception 'game_code/game is required'; end if;
  if v_character_name is null then raise exception 'character_name/name is required'; end if;
  if v_kind not in ('research', 'build') then raise exception 'kind must be research or build'; end if;
  if v_url is null then raise exception 'chat_url/url is required'; end if;
  if v_url !~* '^https://(www\.)?(chatgpt\.com|chat\.openai\.com)/' then
    raise exception 'chat_url must be a ChatGPT URL';
  end if;

  v_game_id := public.app_game_id(v_game_input);
  if v_game_id is null then
    raise exception 'Game not found: %', v_game_input;
  end if;

  select c.id, coalesce(g.title, g.code, g.short_code)
    into v_character_id, v_game_title
  from public.characters c
  join public.games g on g.id = c.game_id
  where c.game_id = v_game_id
    and lower(trim(c.name)) = lower(v_character_name)
  limit 1;

  if v_character_id is null then
    raise exception 'Character not found in %: %', v_game_input, v_character_name;
  end if;

  if v_kind = 'research' then
    v_relation_type := 'chatgpt_research';
    v_resource_type := 'character_research';
    v_title := coalesce(v_title, format('AI研究｜%s｜%s', v_game_title, v_character_name));
  else
    v_relation_type := 'chatgpt_build';
    v_resource_type := 'character_build';
    v_title := coalesce(v_title, format('AI养成｜%s｜%s', v_game_title, v_character_name));
  end if;

  insert into public.resources(
    id, resource_type, title, url, note, source, source_host, source_authority, ingested_via, updated_at
  ) values (
    gen_random_uuid(), v_resource_type, v_title, v_url, v_note,
    'chatgpt_project', 'chatgpt.com', 'personal', 'ai', now()
  )
  on conflict (url) where url is not null do update set
    resource_type = excluded.resource_type,
    title = excluded.title,
    note = coalesce(excluded.note, public.resources.note),
    source = 'chatgpt_project',
    source_host = 'chatgpt.com',
    source_authority = 'personal',
    ingested_via = 'ai',
    updated_at = now()
  returning id into v_resource_id;

  insert into public.resource_relations(
    id, resource_id, entity_type, entity_id, relation_type, source_sheet, source_field, updated_at
  ) values (
    gen_random_uuid(), v_resource_id, 'character', v_character_id, v_relation_type,
    'chatgpt_project', v_kind, now()
  )
  on conflict (resource_id, entity_type, entity_id, relation_type, source_sheet, source_field)
  do update set updated_at = now();

  return jsonb_build_object(
    'saved', true,
    'character_id', v_character_id,
    'resource_id', v_resource_id,
    'relation_type', v_relation_type,
    'resource_type', v_resource_type,
    'title', v_title,
    'url', v_url
  );
end
$function$;

comment on function public.app_attach_character_chat(jsonb) is
'Attach a ChatGPT research/build conversation URL to an existing character as a GUCC resource relation.';
