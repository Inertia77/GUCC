-- User-requested correction to GUCC research-state change.
-- Only PARTY STATUS options exclude 対象外; party members may have any character state.
-- Do not hide or reject any party based on a member's character status.
-- Deliberately supersedes the mistaken filter/guard introduced in migration 20261106033947.
begin;

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
    order by p.updated_at desc nulls last, p.created_at desc nulls last
    limit v_limit
  ) x;
  return v_result;
end
$function$;

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


  return jsonb_build_object('id',v_party_id,'saved',true);
end $function$;

commit;
