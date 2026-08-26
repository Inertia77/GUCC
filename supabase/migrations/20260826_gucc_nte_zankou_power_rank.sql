-- Production migration: gucc_nte_zankou_power_rank_20260826
-- Prydwen patch 1.3 review (updated 2026-08-21) rates Zankou at T0.
-- Linko and other not-yet-reviewed units remain unset rather than guessed.

update public.character_evaluations ce
set power_rank='T0'
from public.characters c
join public.games g on g.id=c.game_id
where ce.character_id=c.id
  and ce.context='current'
  and g.code='NTE'
  and c.name='残虹'
  and ce.power_rank is distinct from 'T0';
