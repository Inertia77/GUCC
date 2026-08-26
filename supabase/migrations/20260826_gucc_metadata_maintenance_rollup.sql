-- GUCC production metadata maintenance rollup, 2026-08-26.
--
-- Production applied these changes as individually tracked Supabase migrations:
--   gucc_core_game_priority_20260826
--   gucc_game_catalog_normalization_20260826
--   gucc_zzz_power_rank_refresh_20260826
--   gucc_nte_names_power_refresh_20260826
--   gucc_resource_relations_cleanup_20260826
--   gucc_zzz_localized_names_20260826
--   gucc_hsr_names_power_refresh_20260826
--   gucc_ww_names_power_refresh_20260826
--   gucc_enf_names_power_refresh_20260826
--   gucc_hsr_jp_kr_names_20260826
--   gucc_ww_jp_kr_names_20260826
--   gucc_verified_enf_localized_names_20260826
--   gucc_verified_nte_localized_names_20260826
--
-- This repository file intentionally rolls the related production data migrations
-- into one idempotent replay file. It is the canonical GUCC-side record for the
-- 2026-08-26 catalog/localization/meta/resource maintenance batch.

-- -----------------------------------------------------------------------------
-- 1. Core-game operating priority
-- -----------------------------------------------------------------------------
update public.game_status gs
set content_tier = case g.code
      when 'ZZZ' then '创作级'
      when 'NTE' then '创作级'
      when 'WW'  then '创作级'
      when 'HSR' then '兴趣级'
      when 'ENF' then '兴趣级'
      else gs.content_tier
    end,
    output_enabled = case g.code
      when 'ZZZ' then true
      when 'NTE' then true
      when 'WW'  then true
      when 'HSR' then false
      when 'ENF' then false
      else gs.output_enabled
    end,
    research_depth = case g.code
      when 'ZZZ' then '深'
      when 'NTE' then '深'
      when 'WW'  then '中'
      when 'HSR' then '微'
      when 'ENF' then '微'
      else gs.research_depth
    end,
    login_frequency = case
      when g.code in ('ZZZ','NTE','WW','HSR','ENF') then '每日'
      else gs.login_frequency
    end,
    info_attention = case g.code
      when 'ZZZ' then '深'
      when 'NTE' then '深'
      when 'WW'  then '中'
      when 'HSR' then '中'
      when 'ENF' then '中'
      else gs.info_attention
    end,
    updated_at = now()
from public.games g
where g.id = gs.game_id
  and g.code in ('ZZZ','NTE','WW','HSR','ENF');

-- -----------------------------------------------------------------------------
-- 2. Objective catalog-name normalization and observation-pool additions
-- -----------------------------------------------------------------------------
update public.games set title='崩坏：星穹铁道', updated_at=now() where code='HSR' and title is distinct from '崩坏：星穹铁道';
update public.games set title='明日方舟：终末地', updated_at=now() where code='ENF' and title is distinct from '明日方舟：终末地';
update public.games set title='重返未来：1999', updated_at=now() where title='1999';
update public.games set title='蔚蓝档案', updated_at=now() where title='ブルアカ';
update public.games set title='闪耀！优俊少女', updated_at=now() where title='ウマ娘';
update public.games set title='崩坏3', updated_at=now() where title='崩壊3rd';
update public.games set title='崩坏：因缘精灵', updated_at=now() where title='崩坏因缘精灵';
update public.games set title='蓝色星原：旅谣', updated_at=now() where title='蓝色星原旅谣';
update public.games set title='只狼：影逝二度', updated_at=now() where title='只狼';
update public.games set title='黑神话：悟空', updated_at=now() where title='黒神話悟空';
update public.games set title='阴阳师', updated_at=now() where title='陰陽師';

with requested(title) as (
  values ('二重螺旋'),('望月'),('尘白禁区')
), inserted as (
  insert into public.games(title)
  select r.title
  from requested r
  where not exists (select 1 from public.games g where g.title=r.title)
  returning id
)
insert into public.game_status(game_id,content_tier,output_enabled,research_depth,login_frequency,spending_level,info_attention)
select id,'观察级',false,'无','从不','无','微' from inserted
on conflict (game_id) do nothing;

-- -----------------------------------------------------------------------------
-- 3. Helper pattern for localized-name upserts
-- -----------------------------------------------------------------------------
-- Each localization section is sourced from official/localized game material where
-- available. Unverified JP/KR values are deliberately left NULL instead of guessed.

-- ZZZ: current missing/newer localized names.
with m(zh,en,jp,kr) as (values
 ('佩洛伊斯','Pyrois','ピュロイス','피로이스'),
 ('南宫羽','Nangong Yu','南宮羽','남궁우'),
 ('希希芙','Cissia','シーシィア','시시아'),
 ('星徽·比利','Starlight - Billy','スターライト・ビリー','스타라이트・빌리'),
 ('普罗米娅','Promeia','プロメイア','프로미아'),
 ('诺姆','Norma','ノルムー','노르마'),
 ('千夏','Sunna','千夏','수나'),
 ('希格莉德','Sigrid','シグリッド','시그리드'),
 ('维琳娜','Velina','ヴェリナ','벨리나'),
 ('蕾米埃尔','Remielle','レミエール','레미엘')
), chars as (
 select c.id,m.en,m.jp,m.kr from m
 join public.characters c on c.name=m.zh
 join public.games g on g.id=c.game_id and g.code='ZZZ'
), vals as (
 select id,'en'::text lang,en name from chars union all
 select id,'jp',jp from chars union all
 select id,'kr',kr from chars
)
insert into public.character_names(character_id,lang,name)
select id,lang,name from vals where name is not null
on conflict (character_id,lang) do update set name=excluded.name;

-- NTE: verified English names.
with m(zh,en) as (values
 ('阿德勒','Adler'),('海月','Aurelia'),('白藏','Baicang'),('卡厄斯','Chaos'),
 ('小吱','Chiz'),('达芙蒂尔','Daffodill'),('埃德嘉','Edgar'),('法帝娅','Fadia'),
 ('哈尼娅','Haniel'),('哈索尔','Hathor'),('浔','Hotori'),('伊洛伊','Iroi'),
 ('九原','Jiuyuan'),('安魂曲','Lacrimosa'),('灵可','Linko'),('薄荷','Mint'),
 ('娜娜莉','Nanally'),('早雾','Sakiri'),('真红','Shinku'),('翳','Skia'),
 ('残虹','Zankou'),('异能者·零（光）','Zero')
), chars as (
 select c.id,m.en from m
 join public.characters c on c.name=m.zh
 join public.games g on g.id=c.game_id and g.code='NTE'
)
insert into public.character_names(character_id,lang,name)
select id,'en',en from chars
on conflict (character_id,lang) do update set name=excluded.name;

-- NTE: JP/KR names explicitly confirmed in official localized material.
with m(zh,jp,kr) as (values
 ('阿德勒','アドレー','아들러'),
 ('卡厄斯','カオス','카오스'),
 ('埃德嘉','エドガー','에드가'),
 ('法帝娅','ファルディーヤ','파디아'),
 ('哈尼娅','ハニア','하니엘'),
 ('哈索尔','ハソール','하토르'),
 ('浔','潯','호토리'),
 ('伊洛伊','イロヒ','일로이'),
 ('九原','九原','구원'),
 ('安魂曲','レクイエム','라크리모사'),
 ('薄荷','ミント','민트'),
 ('娜娜莉','ナナリ','나나리'),
 ('早雾','早霧','사키리'),
 ('真红','真紅','신쿠'),
 ('残虹','残虹','잔홍'),
 ('白藏','白蔵','백장'),
 ('达芙蒂尔','ダフォディール','다포딜'),
 ('海月','海月','우미츠키'),
 ('翳','翳','스키아')
), chars as (
 select c.id,m.jp,m.kr from m
 join public.characters c on c.name=m.zh
 join public.games g on g.id=c.game_id and g.code='NTE'
), vals as (
 select id,'jp'::text lang,jp name from chars union all
 select id,'kr',kr from chars
)
insert into public.character_names(character_id,lang,name)
select id,lang,name from vals where name is not null
on conflict (character_id,lang) do update set name=excluded.name;

-- HSR: missing English names.
with m(zh,en) as (values
 ('不死途','Ashveil'),
 ('千冶•刃','Mortenax Blade'),
 ('开拓者•欢愉','Trailblazer • Elation'),
 ('绯英','Evanescia'),
 ('银狼LV.999','Silver Wolf • Lv. 999')
), chars as (
 select c.id,m.en from m
 join public.characters c on c.name=m.zh
 join public.games g on g.id=c.game_id and g.code='HSR'
)
insert into public.character_names(character_id,lang,name)
select id,'en',en from chars
on conflict (character_id,lang) do update set name=excluded.name;

-- HSR: JP/KR names explicitly verified from current localized game resources.
with m(zh,jp,kr) as (values
 ('不死途','不死途','애쉬베일'),
 ('千冶•刃','千冶・刃','천야•블레이드'),
 ('吉尔伽美什','ギルガメッシュ','길가메시'),
 ('姬子•启行','姫子・旅立ち','히메코•노바'),
 ('开拓者•欢愉','開拓者','개척자'),
 ('知更鸟•晴歌','ロビン・夏空の歌','로빈•서머레토'),
 ('砂金•戏浪','アベンチュリン・波と戯れる夏','어벤츄린•웨이브'),
 ('绯英','緋英','에바네시아'),
 ('远坂凛','遠坂凛','토오사카 린'),
 ('银狼LV.999','銀狼LV.999','은랑 LV.999')
), chars as (
 select c.id,m.jp,m.kr from m
 join public.characters c on c.name=m.zh
 join public.games g on g.id=c.game_id and g.code='HSR'
), vals as (
 select id,'jp'::text lang,jp name from chars union all
 select id,'kr',kr from chars
)
insert into public.character_names(character_id,lang,name)
select id,lang,name from vals
on conflict (character_id,lang) do update set name=excluded.name;

-- WW: missing English names.
with m(zh,en) as (values
 ('丽贝卡','Rebecca'),('景燃','Jingran'),('洛瑟菈','Lucilla'),('清宵','Qingxiao'),
 ('绯雪','Hiyuki'),('西格莉卡','Sigrika'),('达妮娅','Denia'),('露西','Lucy')
), chars as (
 select c.id,m.en from m
 join public.characters c on c.name=m.zh
 join public.games g on g.id=c.game_id and g.code='WW'
)
insert into public.character_names(character_id,lang,name)
select id,'en',en from chars
on conflict (character_id,lang) do update set name=excluded.name;

-- WW: verified JP/KR names.
with m(zh,jp,kr) as (values
 ('丽贝卡','レベッカ','레베카'),
 ('景燃','景燃','경연'),
 ('洛瑟菈','ルシラー','루실라'),
 ('清宵','清宵','청초'),
 ('漂泊者·导电','漂泊者・電導','방랑자 · 전도'),
 ('秧秧·玄翎','秧秧・玄翎','양양・현령'),
 ('穗穗','穂穂','수수'),
 ('绯雪','緋雪','히유키'),
 ('西格莉卡','シグリカ','시그리카'),
 ('达妮娅','ダーニャ','데니아'),
 ('露西','ルーシー','루시')
), chars as (
 select c.id,m.jp,m.kr from m
 join public.characters c on c.name=m.zh
 join public.games g on g.id=c.game_id and g.code='WW'
), vals as (
 select id,'jp'::text lang,jp name from chars union all
 select id,'kr',kr from chars
)
insert into public.character_names(character_id,lang,name)
select id,lang,name from vals where name is not null
on conflict (character_id,lang) do update set name=excluded.name;

-- ENF: English operator names from current official operator catalog.
with m(zh,en) as (values
 ('提弗洛斯','Typhoeus'),('噗切娜','Purrchena'),('管理员（女）','Endministrator'),
 ('佩丽卡','Perlica'),('陈千语','Chen Qianyu'),('诀','Arcane'),('梨诺','Liino'),
 ('弭弗','Mi Fu'),('卡缪','Camille'),('庄方宜','Zhuang Fangyi'),('汤汤','Tangtang'),
 ('洛茜','Rossi'),('莱万汀','Laevatain'),('伊冯','Yvonne'),('洁尔佩塔','Gilberta'),
 ('艾尔黛拉','Ardelia'),('余烬','Ember'),('别礼','Last Rite'),('黎风','Lifeng'),
 ('骏卫','Pogranichnik'),('阿列什','Alesh'),('弧光','Arclight'),('艾维文娜','Avywenna'),
 ('大潘','Da Pan'),('昼雪','Snowshine'),('狼卫','Wulfgard'),('赛希','Xaihi'),
 ('秋栗','Akekuri'),('安塔尔','Antal'),('卡契尔','Catcher'),('埃特拉','Estella'),('萤石','Fluorite')
), chars as (
 select c.id,m.en from m
 join public.characters c on c.name=m.zh
 join public.games g on g.id=c.game_id and g.code='ENF'
)
insert into public.character_names(character_id,lang,name)
select id,'en',en from chars
on conflict (character_id,lang) do update set name=excluded.name;

-- ENF: JP/KR values explicitly confirmed by official localized pages.
with m(zh,jp,kr) as (values
 ('佩丽卡','ペリカ',null),
 ('莱万汀','レーヴァテイン','레바테인'),
 ('伊冯','イヴォンヌ',null),
 ('洁尔佩塔','ギルベルタ','질베르타'),
 ('余烬','エンバー','엠버'),
 ('黎风','リーフォン','여풍'),
 ('艾尔黛拉','アルデリア','아델리아'),
 ('别礼','ラストライト','라스트 라이트'),
 ('骏卫','ポグラニチニク','포그라니치니크'),
 ('汤汤','タンタン','탕탕'),
 ('洛茜','ロッシ','로시'),
 ('大潘','ダパン',null),
 ('艾维文娜','アイビーエナ',null),
 ('安塔尔','アンタル',null),
 ('庄方宜','ゾアン・ファンイ','장방이'),
 ('弭弗','ミ・フ',null),
 ('卡缪','カミーユ',null)
), chars as (
 select c.id,m.jp,m.kr from m
 join public.characters c on c.name=m.zh
 join public.games g on g.id=c.game_id and g.code='ENF'
), vals as (
 select id,'jp'::text lang,jp name from chars union all
 select id,'kr',kr from chars
)
insert into public.character_names(character_id,lang,name)
select id,lang,name from vals where name is not null
on conflict (character_id,lang) do update set name=excluded.name;

-- -----------------------------------------------------------------------------
-- 4. External-meta power-rank refreshes
-- -----------------------------------------------------------------------------
-- GUCC retains its existing T0-T4 field. External finer tiers are collapsed to
-- the nearest GUCC tier. User-owned subjective fields such as like_level are not
-- modified by this migration.

-- ZZZ
update public.character_evaluations ce
set power_rank=x.rank
from public.characters c
join public.games g on g.id=c.game_id
join (values
 ('叶瞬光','T0'),('爱芮','T0'),('普罗米娅','T0'),('蕾米埃尔','T0'),('维琳娜','T0'),('琉音','T0'),('卢西娅','T0'),('南宫羽','T0'),('诺姆','T0'),('千夏','T0'),('浮波柚叶','T0'),
 ('般岳','T0'),('星徽·比利','T0'),('希希芙','T0'),('佩洛伊斯','T0'),('席德','T0'),('伊德海莉','T0'),('仪玄','T0'),('爱丽丝','T0'),('柏妮思','T0'),('星见雅','T0'),('耀嘉音','T0'),('妮可','T0'),('丽娜','T0'),('照','T0'),('希格莉德','T0'),
 ('零号·安比','T1'),('伊芙琳','T1'),('浅羽悠真','T1'),('猫又','T1'),('奥菲丝&「鬼火」','T1'),('11号','T1'),('格莉丝','T1'),('简','T1'),('派派','T1'),('薇薇安','T1'),('月城柳','T1'),('橘福福','T1'),('莱特','T1'),('莱卡恩','T1'),('潘引壶','T1'),('扳机','T1'),('艾莲','T1'),('雨果','T1'),('狛野真斗','T1'),('朱鸢','T1'),('青衣','T1'),('苍角','T1'),
 ('比利','T2'),('可琳','T2'),('凯撒','T2'),('珂蕾妲','T2'),('露西','T2'),('波可娜','T2'),
 ('安东','T3'),('本','T3'),('安比','T3'),('赛斯','T3')
) x(name,rank) on x.name=c.name
where g.code='ZZZ' and ce.character_id=c.id and ce.context='current';

-- NTE mature current rankings; newest characters without a mature current source stay NULL.
update public.character_evaluations ce
set power_rank=x.rank
from public.characters c join public.games g on g.id=c.game_id
join (values
 ('卡厄斯','T0'),('小吱','T0'),('安魂曲','T0'),('娜娜莉','T0'),('真红','T0'),('浔','T0'),
 ('异能者·零（光）','T0'),('伊洛伊','T0'),('早雾','T0'),('哈索尔','T0'),('九原','T0'),('哈尼娅','T0'),
 ('白藏','T1'),('达芙蒂尔','T1'),('法帝娅','T1'),('阿德勒','T1'),('海月','T1'),('翳','T1'),
 ('薄荷','T2'),('埃德嘉','T3')
) x(name,rank) on x.name=c.name
where g.code='NTE' and ce.character_id=c.id and ce.context='current';

-- HSR current mature tier refresh. Current 4.5 units without mature tier evidence remain NULL.
update public.character_evaluations ce
set power_rank=x.rank
from public.characters c join public.games g on g.id=c.game_id
join (values
 ('Archer','T0'),('不死途','T0'),('遐蝶','T0'),('绯英','T0'),('流萤','T0'),('姬子•启行','T0'),('银狼LV.999','T0'),('火花','T0'),('长夜月','T0'),('远坂凛','T0'),('千冶•刃','T0'),('昔涟','T0'),('花火','T0'),('大丽花','T0'),('开拓者•欢愉','T0'),('开拓者•记忆','T0'),('爻光','T0'),('丹恒•腾荒','T0'),('藿藿','T0'),('风堇','T0'),
 ('黄泉','T0'),('那刻夏','T0'),('海瑟音','T0'),('白厄','T0'),('Saber','T0'),('黑天鹅','T0'),('吉尔伽美什','T0'),('卡芙卡','T0'),('刻律德菈','T0'),('赛飞儿','T0'),('星期日','T0'),('忘归人','T0'),('开拓者•同谐','T0'),('缇宝','T0'),('灵砂','T0'),
 ('飞霄','T1'),('万敌','T1'),('阮梅','T1'),('银狼','T1'),('瓦尔特','T1'),('砂金','T1'),('符玄','T1'),('加拉赫','T1'),('阿格莱雅','T1'),('波提欧','T1'),('希儿','T1'),('大黑塔','T1'),('知更鸟','T1'),('罗刹','T1'),
 ('乱破','T2'),('翡翠','T2'),('艾丝妲','T2'),('布洛妮娅','T2'),
 ('刃','T3'),('姬子','T3'),('镜流','T3'),('云璃','T3'),('黑塔','T3'),('三月七（巡猎）','T3'),('貊泽','T3'),('托帕&账账','T3'),('椒丘','T3'),('停云','T3'),('白露','T3'),('玲可','T3'),
 ('克拉拉','T4'),('丹恒•饮月','T4'),('景元','T4'),('银枝','T4'),('希露瓦','T4'),('佩拉','T4'),('杰帕德','T4'),('阿兰','T4'),('丹恒','T4'),('真理医生','T4'),('虎克','T4'),('卢卡','T4'),('米沙','T4'),('青雀','T4'),('素裳','T4'),('开拓者•毁灭','T4'),('雪衣','T4'),('彦卿','T4'),('桑博','T4'),('桂乃芬','T4'),('寒鸦','T4'),('驭空','T4'),('三月七（存护）','T4'),('娜塔莎','T4'),('开拓者•存护','T4')
) x(name,rank) on x.name=c.name
where g.code='HSR' and ce.character_id=c.id and ce.context='current';

-- WW current 3.6-oriented refresh. Jingran is intentionally left without a mature rank.
update public.character_evaluations ce
set power_rank=x.rank
from public.characters c join public.games g on g.id=c.game_id
join (values
 ('穗穗','T0'),('卡提希娅','T0'),('弗洛洛','T0'),('清宵','T0'),('西格莉卡','T0'),('仇远','T0'),('守岸人','T0'),('爱弥斯','T0'),('秧秧·玄翎','T0'),
 ('千咲','T1'),('绯雪','T1'),('达妮娅','T1'),('洛瑟菈','T1'),('珂莱塔','T1'),('漂泊者·气动','T1'),('夏空','T1'),('菲比','T1'),('嘉贝莉娜','T1'),('奥古斯塔','T1'),('布兰特','T1'),('露帕','T1'),('赞妮','T1'),('陆·赫斯','T1'),
 ('忌炎','T2'),('琳奈','T2'),('露西','T2'),('尤诺','T2'),('丽贝卡','T2'),('莫宁','T2'),('维里奈','T2'),('洛可可','T2'),('漂泊者·湮灭','T2'),('相里要','T2'),('椿','T2'),('莫特斐','T2'),('安可','T2'),('今汐','T2'),('坎特蕾拉','T2'),('折枝','T2'),('白芷','T2'),('吟霖','T2'),('漂泊者·衍射','T2'),('卜灵','T2'),
 ('卡卡罗','T3'),('长离','T3'),('散华','T3'),('丹瑾','T3'),('渊武','T3'),('凌阳','T3'),('桃祈','T3'),('鉴心','T3'),('秋水','T3'),('秧秧','T3'),('灯灯','T3'),('釉瑚','T3'),('漂泊者·导电','T3'),('炽霞','T3')
) x(name,rank) on x.name=c.name
where g.code='WW' and ce.character_id=c.id and ce.context='current';

-- ENF current 1.4 mature-ranking refresh. Preview/new units without mature evidence stay NULL.
update public.character_evaluations ce
set power_rank=x.rank
from public.characters c join public.games g on g.id=c.game_id
join (values
 ('诀','T0'),('庄方宜','T0'),('弭弗','T0'),('洛茜','T0'),('莱万汀','T0'),('汤汤','T0'),('骏卫','T0'),
 ('梨诺','T1'),('洁尔佩塔','T1'),('卡缪','T1'),('陈千语','T1'),('管理员（女）','T1'),('佩丽卡','T1'),('别礼','T1'),('赛希','T1'),('伊冯','T1'),('秋栗','T1'),('黎风','T1'),('狼卫','T1'),('安塔尔','T1'),('阿列什','T1'),('艾尔黛拉','T1'),
 ('弧光','T2'),('萤石','T2'),('余烬','T2'),('艾维文娜','T2'),
 ('大潘','T3'),('埃特拉','T3'),('昼雪','T3'),
 ('卡契尔','T4')
) x(name,rank) on x.name=c.name
where g.code='ENF' and ce.character_id=c.id and ce.context='current';

-- -----------------------------------------------------------------------------
-- 5. Resource-link repair and true-duplicate cleanup
-- -----------------------------------------------------------------------------
insert into public.resource_relations(resource_id,entity_type,entity_id,relation_type)
select r.id,'character',c.id,'research'
from public.resources r
join (values
 ('姬子•启行 先行研究','姬子•启行'),
 ('吉尔伽美什 先行研究','吉尔伽美什'),
 ('远坂凛 先行研究','远坂凛'),
 ('小吱 先行研究','小吱'),
 ('早雾 先行研究','早雾'),
 ('卡厄斯 先行研究','卡厄斯')
) x(title,char_name) on x.title=r.title
join public.characters c on c.name=x.char_name
where not exists (
 select 1 from public.resource_relations rr
 where rr.resource_id=r.id and rr.entity_type='character' and rr.entity_id=c.id and rr.relation_type='research'
);

insert into public.resource_relations(resource_id,entity_type,entity_id,relation_type)
select r.id,'character',c.id,x.rel
from public.resources r
join (values
 ('洛茜 官方资料','洛茜','official_profile'),
 ('绝区零官方网站：代理人档案丨维琳娜','维琳娜','official'),
 ('绝区零官方网站：代理人档案 | 简·杜','简','official'),
 ('绝区零官方网站：星徽·比利养成材料预告','星徽·比利','official')
) x(title,char_name,rel) on x.title=r.title
join public.characters c on c.name=x.char_name
where not exists (
 select 1 from public.resource_relations rr
 where rr.resource_id=r.id and rr.entity_type='character' and rr.entity_id=c.id and rr.relation_type=x.rel
);

insert into public.resource_relations(resource_id,entity_type,entity_id,relation_type)
select r.id,'game',g.id,'phase_3.x'
from public.resources r
join (values
 ('3.1版本前瞻特别节目情报总览','ZZZ'),
 ('《鸣潮》版本前瞻｜3.5版本「遗音扶剑，荡梦而歌」','WW')
) x(title,game_code) on x.title=r.title
join public.games g on g.code=x.game_code
where not exists (
 select 1 from public.resource_relations rr
 where rr.resource_id=r.id and rr.entity_type='game' and rr.entity_id=g.id and rr.relation_type='phase_3.x'
);

insert into public.resource_relations(resource_id,entity_type,entity_id,relation_type)
select r.id,'party',p.id,'reference'
from public.resources r
join public.parties p on p.summary='莱万汀火队'
join public.games g on g.id=p.game_id and g.code='ENF'
where r.title='莱万汀 参考资料'
  and not exists (
    select 1 from public.resource_relations rr
    where rr.resource_id=r.id and rr.entity_type='party' and rr.entity_id=p.id and rr.relation_type='reference'
  );

-- Same HSR page; the duplicate had only a presentation query and no relationship.
delete from public.resources r
where r.id='ef35d6fe-e90a-46d0-9ac6-7082c2ef1d8f'
  and not exists (select 1 from public.resource_relations rr where rr.resource_id=r.id);

-- Same Bilibili BV: preserve both semantics on the canonical resource.
insert into public.resource_relations(resource_id,entity_type,entity_id,relation_type,source_sheet,source_field)
select '3b3c9002-b561-5590-b195-e313ecb326de',rr.entity_type,rr.entity_id,rr.relation_type,rr.source_sheet,rr.source_field
from public.resource_relations rr
where rr.resource_id='3b8e90b5-64e7-5837-91c0-f0527f806f85'
on conflict do nothing;
delete from public.resource_relations where resource_id='3b8e90b5-64e7-5837-91c0-f0527f806f85';
delete from public.resources where id='3b8e90b5-64e7-5837-91c0-f0527f806f85';
update public.resources
set title='剑星 1.x / 攻略',url='https://www.bilibili.com/video/BV1QD421J72a/'
where id='3b3c9002-b561-5590-b195-e313ecb326de';

-- Strip only known non-semantic tracking parameters.
update public.resources set url='https://zenless.hoyoverse.com/zh-cn/news/165248' where title='3.1版本前瞻特别节目情报总览';
update public.resources set url='https://www.kurobbs.com/mc/post/1520093838166941696' where title='《鸣潮》版本前瞻｜3.5版本「遗音扶剑，荡梦而歌」';
update public.resources set url='https://www.bilibili.com/video/BV1Mr6qBHERt/' where title='莱万汀 参考资料';
