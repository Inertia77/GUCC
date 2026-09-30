-- Correct canonical character release dates that were previously approximated
-- from game_versions.start_date when version_banners.start_at was missing.
-- release_date must mean the actual first playable/obtainable date.

delete from public.version_banners vb
using public.game_versions gv, public.games g
where vb.version_id=gv.id
  and gv.game_id=g.id
  and (
    (g.code='ENF' and gv.version_no='1.2' and vb.character_name_raw='庄方宜' and vb.phase='second_half')
    or
    (g.code='HSR' and gv.version_no='3.7' and vb.character_name_raw='昔涟' and vb.phase='second_half' and vb.banner_type='pickup')
    or
    (g.code='HSR' and gv.version_no='4.1' and vb.character_name_raw='不死途' and vb.phase='second_half' and vb.banner_type='pickup')
    or
    (g.code='ZZZ' and gv.version_no='1.4' and vb.character_name_raw in ('星见雅','浅羽悠真') and vb.phase='second_half' and vb.banner_type='pickup')
    or
    (g.code='ZZZ' and gv.version_no='2.5' and vb.character_name_raw in ('叶瞬光','照') and vb.phase='second_half' and vb.banner_type='pickup')
  );

update public.version_banners vb
set phase='whole_version', updated_at=now()
from public.game_versions gv, public.games g
where vb.version_id=gv.id
  and gv.game_id=g.id
  and (
    (g.code='HSR' and gv.version_no='4.1' and vb.character_name_raw='不死途' and vb.banner_type='pickup')
    or
    (g.code='ZZZ' and gv.version_no='1.4' and vb.character_name_raw in ('星见雅','浅羽悠真') and vb.banner_type='pickup')
    or
    (g.code='ZZZ' and gv.version_no='2.5' and vb.character_name_raw in ('叶瞬光','照') and vb.banner_type='pickup')
  );

with fixes(name, release_date) as (
  values
    ('朱鸢', date '2024-07-24'), ('简', date '2024-09-04'), ('赛斯', date '2024-09-04'),
    ('柏妮思', date '2024-10-16'), ('莱特', date '2024-11-27'), ('浅羽悠真', date '2024-12-18'),
    ('伊芙琳', date '2025-02-12'), ('扳机', date '2025-04-02'), ('雨果', date '2025-05-14'),
    ('橘福福', date '2025-06-25'), ('爱丽丝', date '2025-08-06'), ('奥菲丝&「鬼火」', date '2025-09-24'),
    ('伊德海莉', date '2025-11-05'), ('般岳', date '2025-12-17'), ('照', date '2025-12-30'),
    ('爱芮', date '2026-03-04'), ('希希芙', date '2026-04-15'), ('星徽·比利', date '2026-05-27'),
    ('诺姆', date '2026-07-08'), ('希格莉德', date '2026-08-19'), ('洛克茜', date '2026-09-30')
)
update public.characters c
set release_date=f.release_date, updated_at=now()
from fixes f, public.games g
where c.game_id=g.id and g.code='ZZZ' and c.name=f.name;

with fixes(name, release_date) as (
  values
    ('吟霖', date '2024-06-06'), ('长离', date '2024-07-22'), ('相里要', date '2024-09-07'),
    ('釉瑚', date '2024-10-24'), ('灯灯', date '2024-12-12'), ('洛可可', date '2025-01-23'),
    ('布兰特', date '2025-03-06'), ('夏空', date '2025-05-22'), ('露帕', date '2025-07-03'),
    ('尤诺', date '2025-09-17'), ('仇远', date '2025-10-30'), ('莫宁', date '2026-01-15'),
    ('陆·赫斯', date '2026-02-26'), ('达妮娅', date '2026-05-21'), ('穗穗', date '2026-07-31'),
    ('景燃', date '2026-09-10'), ('锁暝', date '2026-10-22')
)
update public.characters c
set release_date=f.release_date, updated_at=now()
from fixes f, public.games g
where c.game_id=g.id and g.code='WW' and c.name=f.name;

with fixes(name, release_date) as (
  values
    ('浔', date '2026-05-07'), ('卡厄斯', date '2026-06-18'), ('伊洛伊', date '2026-07-23'),
    ('灵可', date '2026-09-03'), ('明音凛', date '2026-10-15')
)
update public.characters c
set release_date=f.release_date, updated_at=now()
from fixes f, public.games g
where c.game_id=g.id and g.code='NTE' and c.name=f.name;

with fixes(name, release_date) as (
  values
    ('洁尔佩塔', date '2026-02-07'), ('伊冯', date '2026-02-24'), ('洛茜', date '2026-03-29'),
    ('庄方宜', date '2026-04-17'), ('卡缪', date '2026-06-26'), ('梨诺', date '2026-08-09')
)
update public.characters c
set release_date=f.release_date, updated_at=now()
from fixes f, public.games g
where c.game_id=g.id and g.code='ENF' and c.name=f.name;

with fixes(name, release_date) as (
  values
    ('景元', date '2023-05-17'), ('罗刹', date '2023-06-28'), ('卡芙卡', date '2023-08-09'),
    ('符玄', date '2023-09-20'), ('托帕&账账', date '2023-10-27'), ('银枝', date '2023-12-06'),
    ('真理医生', date '2024-01-17'), ('花火', date '2024-02-29'), ('砂金', date '2024-04-17'),
    ('波提欧', date '2024-05-29'), ('翡翠', date '2024-07-10'), ('椒丘', date '2024-08-21'),
    ('灵砂', date '2024-10-02'), ('忘归人', date '2024-12-25'), ('阿格莱雅', date '2025-02-05'),
    ('万敌', date '2025-03-19'), ('那刻夏', date '2025-04-30'), ('赛飞儿', date '2025-06-11'),
    ('刻律德菈', date '2025-09-03'), ('丹恒•腾荒', date '2025-10-15'), ('昔涟', date '2025-11-05'),
    ('火花', date '2026-03-03'), ('不死途', date '2026-03-25'), ('绯英', date '2026-05-13'),
    ('砂金•戏浪', date '2026-09-12')
)
update public.characters c
set release_date=f.release_date, updated_at=now()
from fixes f, public.games g
where c.game_id=g.id and g.code='HSR' and c.name=f.name;
