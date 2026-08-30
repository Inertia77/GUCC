begin;

update public.game_versions gv
set end_date = x.end_date, updated_at = now()
from (values
  ('HSR','4.5','2026-09-28'::date),
  ('ZZZ','3.1','2026-09-09'::date),
  ('NTE','1.3','2026-09-24'::date),
  ('YYS','2.8.80','2026-09-01'::date)
) as x(game_code,version_no,end_date)
join public.games g on g.code=x.game_code
where gv.game_id=g.id and gv.version_no=x.version_no;

-- HSR 4.5
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='HSR' and gv.version_no='4.5')
delete from public.version_banners vb using v where vb.version_id=v.version_id;
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='HSR' and gv.version_no='4.5'),
d(character_name,phase,pool_type,entry_role,start_at,end_at,note) as (values
 ('知更鸟•晴歌','first_half','limited','featured_new',null::timestamptz,'2026-09-12T11:59:00+08'::timestamptz,'4.5上半全新限定五星；版本更新后开启。'),
 ('风堇','first_half','rerun','featured_rerun',null::timestamptz,'2026-09-12T11:59:00+08'::timestamptz,'4.5上半复刻；版本更新后开启。'),
 ('砂金•戏浪','second_half','limited','featured_new','2026-09-12T12:00:00+08'::timestamptz,'2026-09-28T03:59:00+08'::timestamptz,'4.5下半全新限定五星。'),
 ('不死途','second_half','rerun','featured_rerun','2026-09-12T12:00:00+08'::timestamptz,'2026-09-28T03:59:00+08'::timestamptz,'4.5下半复刻。'))
insert into public.version_banners(version_id,phase,banner_type,pool_type,entry_role,is_featured,character_id,character_name_raw,start_at,end_at,note)
select v.version_id,d.phase,'unknown',d.pool_type,d.entry_role,true,public.app_resolve_character_id(v.game_id,d.character_name),d.character_name,d.start_at,d.end_at,d.note from v cross join d;

-- HSR 4.4 special timing semantics.
with v as (select gv.id version_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='HSR' and gv.version_no='4.4')
update public.version_banners vb set phase='whole_version',pool_type='limited',entry_role='featured_new',updated_at=now() from v where vb.version_id=v.version_id and vb.character_name_raw='姬子•启行';
with v as (select gv.id version_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='HSR' and gv.version_no='4.4')
update public.version_banners vb set phase='independent',pool_type='collab',entry_role='featured_new',updated_at=now() from v where vb.version_id=v.version_id and vb.character_name_raw in ('吉尔伽美什','远坂凛');

-- WW 3.6
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='WW' and gv.version_no='3.6')
delete from public.version_banners vb using v where vb.version_id=v.version_id;
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='WW' and gv.version_no='3.6'),
d(character_name,phase,pool_type,entry_role,pool_name,start_at,end_at,note) as (values
 ('清宵','first_half','limited','featured_new','仙风玉影水天清','2026-08-20T11:00:00+08'::timestamptz,'2026-09-10T09:59:00+08'::timestamptz,'3.6第一期全新五星共鸣者。'),
 ('达妮娅','first_half','rerun','featured_rerun','予明日以谎言','2026-08-20T11:00:00+08'::timestamptz,'2026-09-10T09:59:00+08'::timestamptz,'3.6第一期复刻。'),
 ('景燃','second_half','limited','featured_new','身赴三途',null::timestamptz,null::timestamptz,'3.6第二期全新五星共鸣者；具体开放时刻以正式第二期唤取公告为准。'),
 ('绯雪','second_half','rerun','featured_rerun','雪色所映千般未来',null::timestamptz,null::timestamptz,'3.6第二期复刻；具体开放时刻以正式第二期唤取公告为准。'),
 ('莫宁','second_half','rerun','featured_rerun','纵使星光于无穷远',null::timestamptz,null::timestamptz,'3.6第二期复刻；具体开放时刻以正式第二期唤取公告为准。'))
insert into public.version_banners(version_id,phase,banner_type,pool_type,entry_role,pool_name,is_featured,character_id,character_name_raw,start_at,end_at,note)
select v.version_id,d.phase,'unknown',d.pool_type,d.entry_role,d.pool_name,true,public.app_resolve_character_id(v.game_id,d.character_name),d.character_name,d.start_at,d.end_at,d.note from v cross join d;

-- ZZZ 3.2 confirmed special-program lineup.
with v as (select gv.id version_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='ZZZ' and gv.version_no='3.2')
delete from public.version_banners vb using v where vb.version_id=v.version_id;
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='ZZZ' and gv.version_no='3.2'),
d(character_name,phase,pool_type,entry_role,note) as (values
 ('克拉蕾','first_half','limited','featured_new','3.2上半全新S级代理人；9月9日版本上线，精确调频时段待正式调频公告。'),
 ('南宫羽','first_half','rerun','featured_rerun','3.2上半复刻；精确调频时段待正式调频公告。'),
 ('洛克茜','second_half','limited','featured_new','3.2下半全新S级代理人；精确调频时段待正式调频公告。'),
 ('普罗米娅','second_half','rerun','featured_rerun','3.2下半复刻；精确调频时段待正式调频公告。'))
insert into public.version_banners(version_id,phase,banner_type,pool_type,entry_role,is_featured,character_id,character_name_raw,note)
select v.version_id,d.phase,'unknown',d.pool_type,d.entry_role,true,public.app_resolve_character_id(v.game_id,d.character_name),d.character_name,d.note from v cross join d;

-- ZZZ 3.1: Remielle is whole-version; Phase II reruns are selectable custom-pool entries.
with v as (select gv.id version_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='ZZZ' and gv.version_no='3.1')
delete from public.version_banners vb using v where vb.version_id=v.version_id;
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='ZZZ' and gv.version_no='3.1'),
d(character_name,phase,pool_type,entry_role,pool_name,start_at,end_at,note) as (values
 ('蕾米埃尔','whole_version','limited','featured_new','失乐园',null::timestamptz,'2026-09-08T14:59:00+08'::timestamptz,'全3.1版本开放，而非仅上半；版本更新后开启。'),
 ('爱芮','first_half','rerun','featured_rerun',null::text,null::timestamptz,'2026-08-19T11:59:00+08'::timestamptz,'3.1上半复刻。'),
 ('希格莉德','second_half','limited','featured_new','直到天涯尽头','2026-08-19T12:00:00+08'::timestamptz,'2026-09-08T14:59:00+08'::timestamptz,'3.1下半全新S级代理人。'),
 ('琉音','second_half','custom','pool_option','独家重映','2026-08-19T12:00:00+08'::timestamptz,'2026-09-08T14:59:00+08'::timestamptz,'3.1下半定制复刻可选角色。'),
 ('浮波柚叶','second_half','custom','pool_option','独家重映','2026-08-19T12:00:00+08'::timestamptz,'2026-09-08T14:59:00+08'::timestamptz,'3.1下半定制复刻可选角色。'),
 ('浅羽悠真','second_half','custom','pool_option','独家重映','2026-08-19T12:00:00+08'::timestamptz,'2026-09-08T14:59:00+08'::timestamptz,'3.1下半定制复刻可选角色。'))
insert into public.version_banners(version_id,phase,banner_type,pool_type,entry_role,pool_name,is_featured,character_id,character_name_raw,start_at,end_at,note)
select v.version_id,d.phase,'unknown',d.pool_type,d.entry_role,d.pool_name,true,public.app_resolve_character_id(v.game_id,d.character_name),d.character_name,d.start_at,d.end_at,d.note from v cross join d;

-- ENF 1.5: two recruitment pools; Puchina is a separate event acquisition under current public information.
with v as (select gv.id version_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='ENF' and gv.version_no='1.5')
delete from public.version_banners vb using v where vb.version_id=v.version_id;
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='ENF' and gv.version_no='1.5'),
d(character_name,phase,pool_type,entry_role,pool_name,start_at,end_at,note) as (values
 ('提弗洛斯','independent','limited','featured_new','冬猎',null::timestamptz,'2026-09-30T11:59:00+08'::timestamptz,'1.5全新六星限定寻访；版本更新后开启。'),
 ('伊冯','independent','restructured','featured_rerun','绚丽异彩','2026-09-24T12:00:00+08'::timestamptz,null::timestamptz,'重构寻访#1；持续至版本更新维护前，保底体系独立于限定寻访。'))
insert into public.version_banners(version_id,phase,banner_type,pool_type,entry_role,pool_name,is_featured,character_id,character_name_raw,start_at,end_at,note)
select v.version_id,d.phase,'unknown',d.pool_type,d.entry_role,d.pool_name,true,public.app_resolve_character_id(v.game_id,d.character_name),d.character_name,d.start_at,d.end_at,d.note from v cross join d;
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='ENF' and gv.version_no='1.5')
delete from public.version_acquisitions va using v where va.version_id=v.version_id;
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='ENF' and gv.version_no='1.5')
insert into public.version_acquisitions(version_id,character_id,character_name_raw,acquisition_type,note)
select v.version_id,public.app_resolve_character_id(v.game_id,'噗切娜'),'噗切娜','event_reward','1.5版本活动免费获取并可完成满潜；当前公开信息不支持将其写为本期寻访或常驻追加，后续若官方明确加入常驻池，再另建标准池追加记录。' from v;

-- NTE 1.3
with v as (select gv.id version_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='NTE' and gv.version_no='1.3')
delete from public.version_banners vb using v where vb.version_id=v.version_id;
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='NTE' and gv.version_no='1.3'),
d(character_name,phase,pool_type,entry_role,end_at,note) as (values
 ('残虹','first_half','limited','featured_new','2026-09-03T05:59:00+08'::timestamptz,'1.3上半全新S级角色；8月13日版本更新后开启。'),
 ('娜娜莉','first_half','rerun','featured_rerun','2026-09-03T05:59:00+08'::timestamptz,'1.3上半复刻；8月13日版本更新后开启。'),
 ('灵可','second_half','limited','featured_new','2026-09-24T05:59:00+08'::timestamptz,'1.3下半全新S级角色；9月3日维护后开启。'),
 ('浔','second_half','rerun','featured_rerun','2026-09-24T05:59:00+08'::timestamptz,'1.3下半复刻；9月3日维护后开启。'))
insert into public.version_banners(version_id,phase,banner_type,pool_type,entry_role,is_featured,character_id,character_name_raw,end_at,note)
select v.version_id,d.phase,'unknown',d.pool_type,d.entry_role,true,public.app_resolve_character_id(v.game_id,d.character_name),d.character_name,d.end_at,d.note from v cross join d;
with v as (select gv.id version_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='NTE' and gv.version_no='1.2')
update public.version_banners vb set end_at=case vb.character_name_raw when '真红' then '2026-07-23T05:59:00+08'::timestamptz when '伊洛伊' then '2026-08-13T05:59:00+08'::timestamptz else vb.end_at end,pool_type='limited',entry_role='featured_new',updated_at=now() from v where vb.version_id=v.version_id and vb.character_name_raw in ('真红','伊洛伊');

-- YYS current collaboration and anniversary free character.
with v as (select gv.id version_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='YYS' and gv.version_no='2.8.80')
update public.version_banners vb set phase='independent',pool_type='collab',entry_role='featured_new',pool_name='音符织录·异世奇遇',updated_at=now() from v where vb.version_id=v.version_id and vb.character_name_raw in ('洛天依','言和');
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='YYS' and gv.version_no='10TH-2026')
delete from public.version_acquisitions va using v where va.version_id=v.version_id and va.character_name_raw='石长姬';
with v as (select gv.id version_id,g.id game_id from public.game_versions gv join public.games g on g.id=gv.game_id where g.code='YYS' and gv.version_no='10TH-2026')
insert into public.version_acquisitions(version_id,character_id,character_name_raw,acquisition_type,note)
select v.version_id,public.app_resolve_character_id(v.game_id,'石长姬'),'石长姬','login_reward','十周年庆典：2026-09-09登录即送全新SSR石长姬；不是依据当前信息写成UP卡池角色。' from v;

commit;
