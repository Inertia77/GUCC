
-- Complete canonical release-date coverage for characters whose first availability
-- is not represented by a precise non-rerun banner/acquisition row.
-- Only fill NULL values here; exact phase corrections live in the prior migration.

-- ZZZ launch roster.
with fixes(name, release_date) as (
  values
    ('11号', date '2024-07-04'), ('丽娜', date '2024-07-04'), ('可琳', date '2024-07-04'),
    ('妮可', date '2024-07-04'), ('安东', date '2024-07-04'), ('安比', date '2024-07-04'),
    ('本', date '2024-07-04'), ('格莉丝', date '2024-07-04'), ('比利', date '2024-07-04'),
    ('派派', date '2024-07-04'), ('猫又', date '2024-07-04'), ('珂蕾妲', date '2024-07-04'),
    ('苍角', date '2024-07-04'), ('莱卡恩', date '2024-07-04'), ('露西', date '2024-07-04')
)
update public.characters c
set release_date=f.release_date, updated_at=now()
from fixes f, public.games g
where c.game_id=g.id and g.code='ZZZ' and c.name=f.name and c.release_date is null;

-- ENF launch roster not otherwise tied to a precise first banner.
with fixes(name, release_date) as (
  values
    ('余烬', date '2026-01-22'), ('佩丽卡', date '2026-01-22'), ('别礼', date '2026-01-22'),
    ('卡契尔', date '2026-01-22'), ('埃特拉', date '2026-01-22'), ('大潘', date '2026-01-22'),
    ('安塔尔', date '2026-01-22'), ('弧光', date '2026-01-22'), ('昼雪', date '2026-01-22'),
    ('狼卫', date '2026-01-22'), ('秋栗', date '2026-01-22'), ('管理员（女）', date '2026-01-22'),
    ('艾尔黛拉', date '2026-01-22'), ('艾维文娜', date '2026-01-22'), ('萤石', date '2026-01-22'),
    ('赛希', date '2026-01-22'), ('阿列什', date '2026-01-22'), ('陈千语', date '2026-01-22'),
    ('骏卫', date '2026-01-22'), ('黎风', date '2026-01-22')
)
update public.characters c
set release_date=f.release_date, updated_at=now()
from fixes f, public.games g
where c.game_id=g.id and g.code='ENF' and c.name=f.name and c.release_date is null;

-- NTE CN launch roster.
with fixes(name, release_date) as (
  values
    ('九原', date '2026-04-23'), ('哈尼娅', date '2026-04-23'), ('哈索尔', date '2026-04-23'),
    ('埃德嘉', date '2026-04-23'), ('小吱', date '2026-04-23'), ('异能者·零（光）', date '2026-04-23'),
    ('早雾', date '2026-04-23'), ('法帝娅', date '2026-04-23'), ('海月', date '2026-04-23'),
    ('白藏', date '2026-04-23'), ('翳', date '2026-04-23'), ('薄荷', date '2026-04-23'),
    ('达芙蒂尔', date '2026-04-23'), ('阿德勒', date '2026-04-23')
)
update public.characters c
set release_date=f.release_date, updated_at=now()
from fixes f, public.games g
where c.game_id=g.id and g.code='NTE' and c.name=f.name and c.release_date is null;

-- WW launch roster and non-banner form/collab unlocks.
with fixes(name, release_date) as (
  values
    ('丹瑾', date '2024-05-23'), ('凌阳', date '2024-05-23'), ('卡卡罗', date '2024-05-23'),
    ('安可', date '2024-05-23'), ('散华', date '2024-05-23'), ('桃祈', date '2024-05-23'),
    ('渊武', date '2024-05-23'), ('漂泊者·湮灭', date '2024-05-23'), ('漂泊者·衍射', date '2024-05-23'),
    ('炽霞', date '2024-05-23'), ('白芷', date '2024-05-23'), ('秋水', date '2024-05-23'),
    ('秧秧', date '2024-05-23'), ('维里奈', date '2024-05-23'), ('莫特斐', date '2024-05-23'),
    ('鉴心', date '2024-05-23'),
    ('漂泊者·气动', date '2025-03-27'),
    ('丽贝卡', date '2026-06-08'), ('露西', date '2026-06-08'),
    ('漂泊者·导电', date '2026-07-10')
)
update public.characters c
set release_date=f.release_date, updated_at=now()
from fixes f, public.games g
where c.game_id=g.id and g.code='WW' and c.name=f.name and c.release_date is null;

-- HSR launch roster and later non-banner/path/form releases.
with fixes(name, release_date) as (
  values
    ('三月七（存护）', date '2023-04-26'), ('丹恒', date '2023-04-26'), ('佩拉', date '2023-04-26'),
    ('停云', date '2023-04-26'), ('克拉拉', date '2023-04-26'), ('姬子', date '2023-04-26'),
    ('娜塔莎', date '2023-04-26'), ('布洛妮娅', date '2023-04-26'), ('希露瓦', date '2023-04-26'),
    ('开拓者•存护', date '2023-04-26'), ('开拓者•毁灭', date '2023-04-26'), ('彦卿', date '2023-04-26'),
    ('杰帕德', date '2023-04-26'), ('桑博', date '2023-04-26'), ('瓦尔特', date '2023-04-26'),
    ('白露', date '2023-04-26'), ('素裳', date '2023-04-26'), ('艾丝妲', date '2023-04-26'),
    ('虎克', date '2023-04-26'), ('阿兰', date '2023-04-26'), ('青雀', date '2023-04-26'),
    ('黑塔', date '2023-04-26'),
    ('驭空', date '2023-06-28'), ('卢卡', date '2023-08-09'), ('玲可', date '2023-09-20'),
    ('桂乃芬', date '2023-10-27'), ('寒鸦', date '2023-12-06'), ('雪衣', date '2023-12-27'),
    ('米沙', date '2024-02-06'), ('加拉赫', date '2024-03-27'), ('开拓者•同谐', date '2024-05-08'),
    ('三月七（巡猎）', date '2024-07-31'), ('貊泽', date '2024-09-10'), ('开拓者•记忆', date '2025-01-15'),
    ('Saber', date '2025-07-11'), ('Archer', date '2025-07-11'), ('开拓者•欢愉', date '2026-04-22')
)
update public.characters c
set release_date=f.release_date, updated_at=now()
from fixes f, public.games g
where c.game_id=g.id and g.code='HSR' and c.name=f.name and c.release_date is null;

-- YYS original launch roster and later non-version-linked releases.
with fixes(name, release_date) as (
  values
    ('三尾狐', date '2016-09-09'), ('丑时之女', date '2016-09-09'), ('两面佛', date '2016-09-09'),
    ('九命猫', date '2016-09-09'), ('二口女', date '2016-09-09'), ('傀儡师', date '2016-09-09'),
    ('兵俑', date '2016-09-09'), ('凤凰火', date '2016-09-09'), ('判官', date '2016-09-09'),
    ('吸血姬', date '2016-09-09'), ('唐纸伞妖', date '2016-09-09'), ('大天狗', date '2016-09-09'),
    ('天邪鬼绿', date '2016-09-09'), ('天邪鬼赤', date '2016-09-09'), ('天邪鬼青', date '2016-09-09'),
    ('天邪鬼黄', date '2016-09-09'), ('妖狐', date '2016-09-09'), ('妖琴师', date '2016-09-09'),
    ('姑获鸟', date '2016-09-09'), ('孟婆', date '2016-09-09'), ('寄生魂', date '2016-09-09'),
    ('小鹿男', date '2016-09-09'), ('山兔', date '2016-09-09'), ('山童', date '2016-09-09'),
    ('巫蛊师', date '2016-09-09'), ('帚神', date '2016-09-09'), ('座敷童子', date '2016-09-09'),
    ('惠比寿', date '2016-09-09'), ('提灯小僧', date '2016-09-09'), ('桃花妖', date '2016-09-09'),
    ('椒图', date '2016-09-09'), ('武士之灵', date '2016-09-09'), ('河童', date '2016-09-09'),
    ('海坊主', date '2016-09-09'), ('涂壁', date '2016-09-09'), ('清姬', date '2016-09-09'),
    ('灯笼鬼', date '2016-09-09'), ('犬神', date '2016-09-09'), ('独眼小僧', date '2016-09-09'),
    ('狸猫', date '2016-09-09'), ('白狼', date '2016-09-09'), ('盗墓小鬼', date '2016-09-09'),
    ('童女', date '2016-09-09'), ('童男', date '2016-09-09'), ('管狐', date '2016-09-09'),
    ('茨木童子', date '2016-09-09'), ('荒川之主', date '2016-09-09'), ('萤草', date '2016-09-09'),
    ('蝴蝶精', date '2016-09-09'), ('觉', date '2016-09-09'), ('赤舌', date '2016-09-09'),
    ('跳跳哥哥', date '2016-09-09'), ('跳跳妹妹', date '2016-09-09'), ('跳跳弟弟', date '2016-09-09'),
    ('酒吞童子', date '2016-09-09'), ('铁鼠', date '2016-09-09'), ('镰鼬', date '2016-09-09'),
    ('阎魔', date '2016-09-09'), ('雨女', date '2016-09-09'), ('雪女', date '2016-09-09'),
    ('青蛙瓷器', date '2016-09-09'), ('青行灯', date '2016-09-09'), ('食发鬼', date '2016-09-09'),
    ('食梦貘', date '2016-09-09'), ('饿鬼', date '2016-09-09'), ('首无', date '2016-09-09'),
    ('骨女', date '2016-09-09'), ('鬼使白', date '2016-09-09'), ('鬼使黑', date '2016-09-09'),
    ('鬼女红叶', date '2016-09-09'), ('鲤鱼精', date '2016-09-09'), ('鸦天狗', date '2016-09-09'),
    ('瑶音紧那罗', date '2025-01-22'), ('晴思日和坊', date '2025-01-22'),
    ('生剥鬼', date '2026-05-07'), ('百羽凤凰火', date '2026-09-09')
)
update public.characters c
set release_date=f.release_date, updated_at=now()
from fixes f, public.games g
where c.game_id=g.id and g.code='YYS' and c.name=f.name and c.release_date is null;
