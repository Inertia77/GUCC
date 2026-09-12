-- GUCC character-progress consistency refresh — 2026-09-12
-- Keep account/build states conservative; only add missing default rows and refresh stale factual notes.

insert into public.character_progress (character_id, research_status, build_status, progress_note)
select
  c.id,
  '待研究',
  '待养成',
  '官方已完成首轮角色宣发；当前记录五星/冰/欢愉等已确认基础信息，后续等待4.6版本前瞻或正式角色机制资料后继续研究。'
from public.characters c
join public.games g on g.id = c.game_id
where g.short_code = '崩' and c.name = '真珠'
on conflict (character_id) do nothing;

insert into public.character_progress (character_id, research_status, build_status, progress_note)
select
  c.id,
  '待研究',
  '待养成',
  '官方已确认导电属性、迅刀与角色设定；正式版本、完整战斗定位和机制等待后续官方前瞻/实装资料。'
from public.characters c
join public.games g on g.id = c.game_id
where g.short_code = '鸣' and c.name = '锁暝'
on conflict (character_id) do nothing;

update public.character_progress cp set
  progress_note = '官方已确认心为导电属性、音感仪及角色设定；正式版本、完整战斗定位和机制等待后续官方前瞻/实装资料。',
  updated_at = now()
from public.characters c
join public.games g on g.id = c.game_id
where cp.character_id = c.id
  and g.short_code = '鸣'
  and c.name = '心';

update public.character_progress cp set
  progress_note = '3.2已正式实装；S级、电属性、锋御等基础规格已由官方更新公告确认。后续研究聚焦正式技能机制、音擎、养成与实战循环，不再等待属性/职业确认。',
  updated_at = now()
from public.characters c
join public.games g on g.id = c.game_id
where cp.character_id = c.id
  and g.short_code = '绝'
  and c.name = '克拉蕾';

update public.character_progress cp set
  progress_note = '3.2已正式实装；S级、风属性、击破等基础规格已由官方更新公告确认。后续研究聚焦正式技能机制、音擎、养成与实战循环。',
  updated_at = now()
from public.characters c
join public.games g on g.id = c.game_id
where cp.character_id = c.id
  and g.short_code = '绝'
  and c.name = '洛克茜';
