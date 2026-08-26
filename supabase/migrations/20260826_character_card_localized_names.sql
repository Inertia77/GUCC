-- Add localized EN / JP / KR names to character search results so the
-- Command Center can render them directly on character cards.

create or replace function public.app_search_characters(p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
end $$;
