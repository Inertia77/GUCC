-- Correct an over-broad HSR hold-status update from the same day.
-- The owner confirmed only six named HSR parties are YES; 超击破体系 remains NO.

update public.parties p
set hold_status = 'NO',
    updated_at = now()
from public.games g
where g.id = p.game_id
  and g.code = 'HSR'
  and p.summary = '超击破体系'
  and p.hold_status is distinct from 'NO';
