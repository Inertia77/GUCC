begin;

-- ============================================================
-- HSR: normalize legacy party metadata and restore known cores.
-- ============================================================
update public.parties p set
  status='待研究',
  party_type=case p.summary
    when 'Archer+远坂凛（Fate联动）' then '联动'
    when 'Saber+吉尔伽美什（Fate联动）' then '联动'
    when '姬子・启行阵容' then '主C'
    when '欢愉阵容' then '欢愉'
    when '白厄阵容' then '主C'
    when '记忆阵容' then '记忆'
    else p.party_type end,
  description=coalesce(p.description, case p.summary
    when 'Archer+远坂凛（Fate联动）' then 'Fate/stay night [Unlimited Blade Works] 联动核心组合；已确认持有两名核心角色，其余两席按具体环境补辅助/生存位。'
    when 'Saber+吉尔伽美什（Fate联动）' then 'Fate/stay night [Unlimited Blade Works] 联动核心组合；已确认持有两名核心角色，其余两席按具体环境补辅助/生存位。'
    when '姬子・启行阵容' then '以姬子•启行为核心的主C阵容记录；当前数据库只确认核心位，其他三席等待具体实战队伍确认后再绑定。'
    when '欢愉阵容' then '当前已记录火花 / 银狼LV.999 / 爻光 / 藿藿四人核心欢愉阵容；保留待研究状态，待完成排轴与实战复核。'
    when '白厄阵容' then '当前已记录白厄 / 刻律德菈 / 昔涟 / 丹恒•腾荒四人阵容；保留待研究状态，待实战复核。'
    else null end),
  updated_at=now()
from public.games g
where p.game_id=g.id and g.code='HSR' and p.status is null;

with g as (select id from public.games where code='HSR' limit 1),
p as (
  select id,summary from public.parties
  where game_id=(select id from g)
    and summary in ('Archer+远坂凛（Fate联动）','Saber+吉尔伽美什（Fate联动）')
),
c as (select id,name from public.characters where game_id=(select id from g)),
m(summary,slot_no,name,role) as (values
  ('Archer+远坂凛（Fate联动）',1,'Archer','核心'),
  ('Archer+远坂凛（Fate联动）',2,'远坂凛','核心'),
  ('Saber+吉尔伽美什（Fate联动）',1,'Saber','核心'),
  ('Saber+吉尔伽美什（Fate联动）',2,'吉尔伽美什','核心')
)
insert into public.party_members(id,party_id,slot_no,character_id,member_name_raw,member_role)
select gen_random_uuid(),p.id,m.slot_no,c.id,m.name,m.role
from m join p using(summary)
left join c on c.name=m.name
on conflict(party_id,slot_no) do update set
  character_id=excluded.character_id,
  member_name_raw=excluded.member_name_raw,
  member_role=excluded.member_role,
  updated_at=now();

update public.party_members pm set member_role='主C',updated_at=now()
from public.parties p, public.games g
where pm.party_id=p.id and p.game_id=g.id and g.code='HSR'
  and p.summary='姬子・启行阵容' and pm.slot_no=1 and pm.member_role is null;

-- ============================================================
-- ZZZ: announced 3.2 characters + official preview anchor.
-- ============================================================
with g as (select id from public.games where code='ZZZ' limit 1),
n(char_name,lang,localized) as (values
  ('克拉蕾','en','Claret Flint'),
  ('克拉蕾','jp','クラレッタ・フリンツ'),
  ('洛克茜','en','Roxy Ifrita Pryce'),
  ('洛克茜','jp','ロクシー・イフリータ・プライス')
)
insert into public.character_names(id,character_id,lang,name)
select gen_random_uuid(),c.id,n.lang,n.localized
from n join public.characters c on c.name=n.char_name
join g on g.id=c.game_id
on conflict(character_id,lang) do update set name=excluded.name,updated_at=now();

insert into public.resources(id,resource_type,title,url,note,source,source_host,source_authority,ingested_via)
values
  (gen_random_uuid(),'character_profile','洛克茜 官方资料','https://zenless.hoyoverse.com/zh-cn/news/165574?catchSpider=1','绝区零官网角色档案。','绝区零官网','zenless.hoyoverse.com','official','migration'),
  (gen_random_uuid(),'character_profile','克拉蕾 官方资料','https://zenless.hoyoverse.com/zh-cn/main?catchSpider=1','绝区零官网当前角色目录/3.2前瞻入口；在独立角色深链稳定确认前作为官方资料入口。','绝区零官网','zenless.hoyoverse.com','official','migration'),
  (gen_random_uuid(),'game_phase_reference','绝区零 3.2「她与她的隐秘往事」前瞻特别节目公告','https://zenless.hoyoverse.com/en-us/news/165865?catchSpider=1','官方确认3.2前瞻于2026-08-28 19:30（UTC+8）播出，并点名克拉蕾与洛克茜参与。','绝区零官网','zenless.hoyoverse.com','official','migration')
on conflict(url) where url is not null do update set
  resource_type=excluded.resource_type,
  title=excluded.title,
  note=excluded.note,
  source=excluded.source,
  source_host=excluded.source_host,
  source_authority=excluded.source_authority,
  updated_at=now();

with g as (select id from public.games where code='ZZZ' limit 1),
pairs(name,url) as (values
  ('洛克茜','https://zenless.hoyoverse.com/zh-cn/news/165574?catchSpider=1'),
  ('克拉蕾','https://zenless.hoyoverse.com/zh-cn/main?catchSpider=1')
)
insert into public.resource_relations(id,resource_id,entity_type,entity_id,relation_type)
select gen_random_uuid(),r.id,'character',c.id,'official_profile'
from pairs p
join public.characters c on c.name=p.name and c.game_id=(select id from g)
join public.resources r on r.url=p.url
where not exists(
  select 1 from public.resource_relations rr
  where rr.entity_type='character' and rr.entity_id=c.id and rr.relation_type='official_profile'
)
on conflict do nothing;

with g as (select id from public.games where code='ZZZ' limit 1)
insert into public.game_versions(game_id,version_no,version_name,start_date,end_date,note)
select g.id,'3.2','她与她的隐秘往事',null,null,
  '官方已宣布3.2版本前瞻特别节目将于2026-08-28 19:30（UTC+8）播出；克拉蕾与洛克茜将参与前瞻。版本上线日期、卡池、稀有度与战斗定位尚未在当前官方公告中确认，保持空值等待前瞻。'
from g
on conflict(game_id,version_no) do update set
  version_name=excluded.version_name,
  note=excluded.note,
  updated_at=now();

with g as (select id from public.games where code='ZZZ' limit 1),
v as (select id from public.game_versions where game_id=(select id from g) and version_no='3.2'),
r as (select id from public.resources where url='https://zenless.hoyoverse.com/en-us/news/165865?catchSpider=1')
insert into public.resource_relations(id,resource_id,entity_type,entity_id,relation_type)
select gen_random_uuid(),r.id,'version',v.id,'reference'
from v cross join r
where not exists(
  select 1 from public.resource_relations rr
  where rr.resource_id=r.id and rr.entity_type='version' and rr.entity_id=v.id and rr.relation_type='reference'
)
on conflict do nothing;

update public.parties p set party_type='异常体系',updated_at=now()
from public.games g
where p.game_id=g.id and g.code='ZZZ' and p.summary='雅南柚'
  and (p.party_type is null or p.party_type='类型');

update public.parties p set
  party_type='异常-紊乱',
  description='普罗米娅 / 南宫羽 / 浮波柚叶的异常紊乱候选队；当前保留为待研究，具体循环、配装与高难适配继续实战验证。',
  updated_at=now()
from public.games g
where p.game_id=g.id and g.code='ZZZ' and p.summary='普南柚'
  and (p.description is null or btrim(p.description) in ('','测试'));

-- ============================================================
-- WW: announced Heart record stays intentionally incomplete.
-- ============================================================
update public.characters c set
  note=coalesce(c.note,'官方已公开岁主「心」的角色设定/档案；当前仅确认角色身份与世界观能力。稀有度、武器类型与正式战斗定位尚未由当前正式资料确认，保持空值等待后续官方玩法信息。'),
  updated_at=now()
from public.games g
where c.game_id=g.id and g.code='WW' and c.name='心';

insert into public.resources(id,resource_type,title,url,note,source,source_host,source_authority,ingested_via)
values(
  gen_random_uuid(),'character_profile','心 官方角色资讯',
  'https://www.taptap.cn/app/234280/topic?type=official',
  '鸣潮官方社区角色资讯入口；库街区正式角色Wiki上线后再替换为标准official_profile。',
  '鸣潮官方社区','www.taptap.cn','official_community','migration'
)
on conflict(url) where url is not null do update set
  title=excluded.title,note=excluded.note,source=excluded.source,
  source_host=excluded.source_host,source_authority=excluded.source_authority,updated_at=now();

with g as (select id from public.games where code='WW' limit 1),
c as (select id from public.characters where game_id=(select id from g) and name='心'),
r as (select id from public.resources where url='https://www.taptap.cn/app/234280/topic?type=official')
insert into public.resource_relations(id,resource_id,entity_type,entity_id,relation_type)
select gen_random_uuid(),r.id,'character',c.id,'reference'
from c cross join r
where not exists(
  select 1 from public.resource_relations rr
  where rr.resource_id=r.id and rr.entity_type='character' and rr.entity_id=c.id and rr.relation_type='reference'
)
on conflict do nothing;

-- ============================================================
-- NTE: official teaser refs; official_profile remains empty by policy.
-- ============================================================
update public.characters c set
  note=case c.name
    when '黑羽' then '官方已于2026-08下旬发布「海特洛特别资讯 | 黑羽」角色资讯；当前仅确认后续登场角色身份，稀有度/异能属性/战斗定位等待正式角色玩法公告。'
    when '明音凛' then '官方已于2026-08下旬发布「海特洛特别资讯 | 明音凛」角色资讯；当前仅确认后续登场角色身份，稀有度/异能属性/战斗定位等待正式角色玩法公告。'
    else c.note end,
  updated_at=now()
from public.games g
where c.game_id=g.id and g.code='NTE' and c.name in ('黑羽','明音凛');

insert into public.resources(id,resource_type,title,url,note,source,source_host,source_authority,ingested_via)
values
  (gen_random_uuid(),'character_preview','黑羽 官方角色资讯','https://www.taptap.cn/moment/839530534957746922?group_id=805079','异环官方「海特洛特别资讯 | 黑羽」；仅证明角色已开始官方宣发，不推断战斗数据。','异环官方','www.taptap.cn','official_community','migration'),
  (gen_random_uuid(),'character_preview','明音凛 官方角色资讯','https://www.taptap.cn/moment/840900395969546736?group_id=805079','异环官方「海特洛特别资讯 | 明音凛」；仅证明角色已开始官方宣发，不推断战斗数据。','异环官方','www.taptap.cn','official_community','migration')
on conflict(url) where url is not null do update set
  title=excluded.title,note=excluded.note,source=excluded.source,
  source_host=excluded.source_host,source_authority=excluded.source_authority,updated_at=now();

with g as (select id from public.games where code='NTE' limit 1),
pairs(name,url) as (values
  ('黑羽','https://www.taptap.cn/moment/839530534957746922?group_id=805079'),
  ('明音凛','https://www.taptap.cn/moment/840900395969546736?group_id=805079')
)
insert into public.resource_relations(id,resource_id,entity_type,entity_id,relation_type)
select gen_random_uuid(),r.id,'character',c.id,'reference'
from pairs p
join public.characters c on c.name=p.name and c.game_id=(select id from g)
join public.resources r on r.url=p.url
where not exists(
  select 1 from public.resource_relations rr
  where rr.resource_id=r.id and rr.entity_type='character' and rr.entity_id=c.id and rr.relation_type='reference'
)
on conflict do nothing;

-- ============================================================
-- YYS: mechanisms only contain game mechanics, not GUCC governance.
-- ============================================================
delete from public.mechanisms m
using public.games g
where m.game_id=g.id and g.code='YYS'
  and m.title in ('式神目录与账号持有分离','式神稀有度体系');

update public.version_banners vb set
  start_at='2026-08-19 11:00:00+08',
  end_at='2026-08-30 23:59:00+08',
  updated_at=now()
from public.game_versions gv, public.games g
where vb.version_id=gv.id and gv.game_id=g.id
  and g.code='YYS' and gv.version_no='2.8.80' and vb.banner_type='collab';

update public.game_versions gv set end_date='2026-09-15',updated_at=now()
from public.games g
where gv.game_id=g.id and g.code='YYS' and gv.version_no='SUMMER-SIGNIN-2026';

commit;
