-- Production migration: 20260826095502 gucc_restore_nte_cn_dates_20260826
-- Corrects the prior 20260826085831 NTE date change.
-- China-server dates verified against the official Bilibili account `异环`:
-- 1.0 = 2026-04-23, 1.1 = 2026-05-28, 1.2 = 2026-07-02, 1.3 = 2026-08-13.
-- Do not use international/other-region Chinese-language notices as the CN-server source of truth.

update public.game_versions gv
set start_date = case gv.version_no
    when '1.0' then date '2026-04-23'
    when '1.1' then date '2026-05-28'
    when '1.2' then date '2026-07-02'
    when '1.3' then date '2026-08-13'
    else gv.start_date
  end,
  note = case
    when gv.version_no = '1.2' and gv.note is not null
      then replace(gv.note, '2026-07-08', '2026-07-02')
    when gv.version_no = '1.3' and gv.note is not null
      then replace(gv.note, '2026-08-19', '2026-08-13')
    else gv.note
  end
from public.games g
where g.id = gv.game_id
  and g.code = 'NTE'
  and gv.version_no in ('1.0','1.1','1.2','1.3');
