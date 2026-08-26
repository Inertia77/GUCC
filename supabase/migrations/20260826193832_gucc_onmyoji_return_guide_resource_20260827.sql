insert into public.resources (resource_type,title,url,note,source,source_authority,ingested_via)
values (
  'game_phase_reference',
  '《阴阳师》十周年回坑全面攻略（2026-08-27～09-09）',
  'https://github.com/Inertia77/GUCC/blob/main/reference/game-guides/onmyoji-return-2026-08-27-to-2026-09-09.md',
  'GUCC 内部回坑执行指南：活动截止、日常周常、双天照/雪御前/神无月发展路线、十周年前资源策略。',
  'GUCC',
  'personal',
  'ai'
)
on conflict (url) do update
set title=excluded.title,
    note=excluded.note,
    source=excluded.source,
    source_authority=excluded.source_authority,
    ingested_via=excluded.ingested_via,
    updated_at=now();

with game as (select id from public.games where code='YYS'),
res as (
  select id from public.resources
  where url='https://github.com/Inertia77/GUCC/blob/main/reference/game-guides/onmyoji-return-2026-08-27-to-2026-09-09.md'
)
insert into public.resource_relations (resource_id,entity_type,entity_id,relation_type)
select res.id,'game',game.id,'reference'
from res cross join game
where not exists (
  select 1 from public.resource_relations rr
  where rr.resource_id=res.id
    and rr.entity_type='game'
    and rr.entity_id=game.id
    and rr.relation_type='reference'
);
