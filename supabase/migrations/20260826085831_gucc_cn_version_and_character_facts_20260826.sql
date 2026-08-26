-- Production migration: 20260826085831 gucc_cn_version_and_character_facts_20260826
-- Objective fact corrections verified against CN-server / current character data.
-- NTE version dates use the China server's official launch/update dates.

update public.game_versions gv
set start_date = case gv.version_no
    when '1.0' then date '2026-04-29'
    when '1.1' then date '2026-06-03'
    when '1.2' then date '2026-07-08'
    when '1.3' then date '2026-08-19'
    else gv.start_date
  end,
  note = case
    when gv.version_no = '1.2' and gv.note is not null
      then replace(gv.note, '2026-07-02', '2026-07-08')
    when gv.version_no = '1.3' and gv.note is not null
      then replace(gv.note, '2026-08-13', '2026-08-19')
    else gv.note
  end
from public.games g
where g.id = gv.game_id
  and g.code = 'NTE'
  and gv.version_no in ('1.0','1.1','1.2','1.3');

update public.characters c
set rarity = case
    when g.code = 'ENF' and c.name = '噗切娜' then '5星'
    when g.code = 'ENF' and c.name = '提弗洛斯' then '6星'
    when g.code = 'NTE' and c.name in ('残虹','灵可') then 'S级'
    else c.rarity
  end,
  sex = case
    when g.code = 'WW' and c.name = '景燃' then '男'
    when g.code = 'WW' and c.name = '漂泊者·导电' then '未定'
    else c.sex
  end,
  profession = case
    when g.code = 'WW' and c.name = '漂泊者·导电' then '迅刀'
    else c.profession
  end,
  updated_at = now()
from public.games g
where g.id = c.game_id
  and (
    (g.code = 'ENF' and c.name in ('噗切娜','提弗洛斯'))
    or (g.code = 'NTE' and c.name in ('残虹','灵可'))
    or (g.code = 'WW' and c.name in ('景燃','漂泊者·导电'))
  );
