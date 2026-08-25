-- GUCC objective status cleanup, applied to production on 2026-08-25.
-- These mappings were explicitly confirmed by the owner.

update public.character_progress cp
set build_status = '待养成',
    updated_at = now()
from public.characters c
join public.games g on g.id = c.game_id
where cp.character_id = c.id
  and g.code = 'WW'
  and c.name = '穗穗'
  and cp.build_status = '养成中';

update public.parties p
set hold_status = 'YES',
    updated_at = now()
from public.games g
where g.id = p.game_id
  and g.code = 'ZZZ'
  and p.summary = '叶琉千'
  and p.hold_status = 'あり';

update public.parties p
set hold_status = 'YES',
    updated_at = now()
from public.games g
where g.id = p.game_id
  and g.code = 'HSR'
  and p.summary in (
    'Archer+远坂凛（Fate联动）',
    'Saber+吉尔伽美什（Fate联动）',
    '姬子・启行阵容',
    '欢愉阵容',
    '白厄阵容',
    '记忆阵容'
  )
  and p.hold_status is distinct from 'YES';
