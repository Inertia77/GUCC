-- GUCC Onmyoji integration foundation, 2026-08-27

-- Extend character rarity vocabulary for Onmyoji.
alter table public.characters drop constraint if exists characters_rarity_chk;
alter table public.characters
  add constraint characters_rarity_chk
  check (
    rarity is null or rarity = any (
      array['4星'::text,'5星'::text,'6星'::text,'A级'::text,'S级'::text,
            'UR'::text,'SP'::text,'SSR'::text,'SR'::text,'R'::text,'N'::text]
    )
  );

-- Activate the existing Onmyoji catalog row.
update public.games
set short_code = '阴', code = 'YYS', updated_at = now()
where title = '阴阳师';

update public.game_status gs
set content_tier = '兴趣级',
    output_enabled = false,
    research_depth = '中',
    login_frequency = '每日',
    spending_level = '无',
    info_attention = '中',
    updated_at = now()
from public.games g
where gs.game_id = g.id and g.title = '阴阳师';

-- Seed currently relevant Onmyoji characters.
with game as (
  select id from public.games where code = 'YYS'
)
insert into public.characters (game_id, name, full_name, profession, rarity, note)
select game.id, v.name, v.name, '式神', v.rarity, v.note
from game
cross join (values
  ('天照','SSR','用户已确认持有两只；回坑阶段继续承担短线 PVE 生产，实际技能/御魂状态待后续账号体检校准。'),
  ('雪御前','SSR','2026-08-27 回归召唤获得；现代 PVE 输出核心之一，十周年前暂缓无脑投入全部黑蛋。'),
  ('神无月','SSR','回归自选目标；当前距离自选保底约二十余抽，获得后作为现代 PVE 辅助骨架维护。'),
  ('神酿星熊童子','SP','2026-08-27 回归召唤获得；当前优先视作 PVP 控制/对策储备，不优先投入黑蛋。'),
  ('石长姬','SSR','十周年官方确认 2026-09-09 登录赠送；正式服技能、御魂与就业待实装后复核。'),
  ('洛天依','SSR','2026-08 Vsinger 联动式神；当前联动召唤截至 2026-08-30 23:59。'),
  ('言和','SSR','2026-08 Vsinger 联动式神；当前联动召唤截至 2026-08-30 23:59。')
) as v(name, rarity, note)
on conflict (game_id, name) do update
set full_name = excluded.full_name,
    profession = excluded.profession,
    rarity = excluded.rarity,
    note = excluded.note,
    updated_at = now();

-- Add current-role evaluations without unstable tier assertions.
with chars as (
  select c.id, c.name
  from public.characters c join public.games g on g.id=c.game_id
  where g.code='YYS' and c.name in ('天照','雪御前','神无月','神酿星熊童子','石长姬')
), evals(name, role_type, note) as (
  values
    ('天照','短线 PVE 输出','双天照可继续承担活动小怪、部分御魂与普通短线生产；不因新输出加入而直接退役。'),
    ('雪御前','泛用 PVE 输出','用于活动、御魂与部分长线 Boss；技能与黑蛋投入应结合十周年环境再最终确定。'),
    ('神无月','PVE 核心辅助','供火/减耗/增伤等辅助价值高，适合作为回坑后补齐现代 PVE 骨架的优先目标。'),
    ('神酿星熊童子','PVP 控制 / 对策','当前不作为恢复日常周常生产力的资源优先项。'),
    ('石长姬','十周年新式神·待实装验证','2026-09-09 免费获得后再根据正式服测试更新角色定位。')
)
insert into public.character_evaluations (character_id, context, role_type, note)
select chars.id, 'current', evals.role_type, evals.note
from chars join evals using(name)
on conflict (character_id, context) do update
set role_type=excluded.role_type,
    note=excluded.note,
    updated_at=now();

-- Seed current and anniversary version/event anchors.
with game as (select id from public.games where code='YYS')
insert into public.game_versions (game_id, version_no, version_name, start_date, note)
select game.id, v.version_no, v.version_name, v.start_date, v.note
from game
cross join (values
  ('2026-08-VSINGER','云华依言歌','2026-08-19'::date,'Vsinger 联动版本。联动召唤至 2026-08-30 23:59；云华依言歌与幸运抓抓乐主体至 2026-09-01 23:59；抓抓乐商店延续至 2026-09-08 23:59。'),
  ('10TH-2026','一瞬刹那·拾光永恒','2026-09-09'::date,'十周年永恒庆典。官方已确认 9/9 登录赠送 SSR 石长姬，并有百次召唤、典藏礼券、限定晴明外观与免费庭院等庆典福利；正式规则以 9/9 游戏内公告为准。')
) as v(version_no,version_name,start_date,note)
on conflict (game_id,version_no) do update
set version_name=excluded.version_name,
    start_date=excluded.start_date,
    note=excluded.note,
    updated_at=now();

with version as (
  select gv.id
  from public.game_versions gv join public.games g on g.id=gv.game_id
  where g.code='YYS' and gv.version_no='2026-08-VSINGER'
), chars as (
  select c.id,c.name from public.characters c join public.games g on g.id=c.game_id
  where g.code='YYS' and c.name in ('洛天依','言和')
)
insert into public.version_banners (version_id,phase,banner_type,character_id,character_name_raw,note)
select version.id,'other','collab',chars.id,chars.name,'音符织录·异世奇遇；2026-08-19 维护后至 2026-08-30 23:59。'
from version cross join chars
on conflict (version_id,phase,banner_type,character_name_raw) do update
set character_id=excluded.character_id,
    note=excluded.note,
    updated_at=now();

-- Seed durable system-level mechanics.
with game as (select id from public.games where code='YYS')
insert into public.mechanisms (game_id,title,mechanism_type,description,note,source_url,source_kind,verified_at)
select game.id, m.title,m.mechanism_type,m.description,m.note,m.source_url,m.source_kind,'2026-08-27'::date
from game
cross join (values
  ('鬼火与技能消耗','resource','鬼火是队伍共享的核心战斗资源，多数式神技能会消耗鬼火；供火、减耗和鬼火节奏直接影响队伍循环。','回坑组队时优先保证自动战斗不会断火。',null,'guide'),
  ('速度与行动条','core_combat','速度决定单位行动频率与行动条顺序；拉条、推条、行动提前/延后是 PVE 速刷与 PVP 排序的基础。','配速应按具体副本单独保存，不用追求一套御魂通吃。',null,'guide'),
  ('御魂与套装','equipment','式神通过六个御魂位置获得主副属性及套装效果；首领御魂等特殊组件会进一步改变输出与辅助配置。','老号回归不要大规模一键奉纳高速、暴击爆伤和特殊功能胚子。',null,'guide'),
  ('效果命中与效果抵抗','core_combat','控制、减益等效果受效果命中、目标效果抵抗及技能基础概率等因素影响，是控制/对策体系的重要属性。','主要在控制、减益与 PVP 对策式神上重点管理。',null,'guide'),
  ('式神升星与技能升级','system','式神等级、星级和技能等级共同构成基础养成；御行达摩是高稀有度式神技能升级的重要稀缺资源。','十周年前保留黑蛋大头，避免为尚未确定的体系提前耗尽。',null,'guide'),
  ('阴阳寮协作与周常','system','阴阳寮承载狩猎战、阴界之门、狭间暗域、宴会、道馆等稳定周常资源，是回坑恢复生产力的重要设施。','老寮不活跃时优先加入活跃寮，不为历史寮名牺牲资源效率。',null,'guide'),
  ('胧车探索','system','满足条件后可离线自动探索御魂与觉醒副本，离开游戏后仍可继续完成机械刷取。','官方说明：单人 30 秒内通关八岐大蛇·神罚或累计签到满 365 天，并拥有任意 1 只契灵即可开启。','https://www.taptap.cn/moment/729823710776659959','official_community')
) as m(title,mechanism_type,description,note,source_url,source_kind)
on conflict (game_id,title) do update
set mechanism_type=excluded.mechanism_type,
    description=excluded.description,
    note=excluded.note,
    source_url=excluded.source_url,
    source_kind=excluded.source_kind,
    verified_at=excluded.verified_at,
    updated_at=now();

-- Seed reusable production party skeletons. Generic slots intentionally remain unbound.
with game as (select id from public.games where code='YYS')
insert into public.parties (game_id,summary,party_type,status,hold_status,description)
select game.id,p.summary,p.party_type,p.status,p.hold_status,p.description
from game
cross join (values
  ('双天照短线生产队','日常短线','OK','YES','回坑立即可用的短线骨架：双天照承担主输出，其余位置按副本放供火、增伤和功能位。稳定自动优先于极限秒数。'),
  ('雪御前 + 神无月长线 PVE 骨架','长线PVE','待研究','YES','获得神无月后重点发展的现代 PVE 骨架。其余三席按逢魔、麒麟、狭间或活动 Boss 需求配置增伤/供火/功能辅助。')
) as p(summary,party_type,status,hold_status,description)
on conflict (game_id,summary,party_type) do update
set status=excluded.status,
    hold_status=excluded.hold_status,
    description=excluded.description,
    updated_at=now();

delete from public.party_members pm
using public.parties p, public.games g
where pm.party_id=p.id and p.game_id=g.id and g.code='YYS'
  and p.summary in ('双天照短线生产队','雪御前 + 神无月长线 PVE 骨架');

with yys as (select id from public.games where code='YYS'),
char as (
  select c.id,c.name from public.characters c join yys on yys.id=c.game_id
),
p as (
  select p.id,p.summary from public.parties p join yys on yys.id=p.game_id
  where p.summary in ('双天照短线生产队','雪御前 + 神无月长线 PVE 骨架')
), members(summary,slot_no,name,role) as (
  values
    ('双天照短线生产队',1,'天照','主输出'),
    ('双天照短线生产队',2,'天照','补刀 / 第二输出'),
    ('双天照短线生产队',3,'供火 / 增伤位','辅助'),
    ('双天照短线生产队',4,'增伤位','辅助'),
    ('双天照短线生产队',5,'功能位','辅助'),
    ('雪御前 + 神无月长线 PVE 骨架',1,'神无月','核心辅助'),
    ('雪御前 + 神无月长线 PVE 骨架',2,'雪御前','主输出'),
    ('雪御前 + 神无月长线 PVE 骨架',3,'增伤位','辅助'),
    ('雪御前 + 神无月长线 PVE 骨架',4,'供火 / 辅助位','辅助'),
    ('雪御前 + 神无月长线 PVE 骨架',5,'功能位','辅助')
)
insert into public.party_members (party_id,slot_no,character_id,member_name_raw,member_role)
select p.id,m.slot_no,c.id,m.name,m.role
from members m join p on p.summary=m.summary
left join char c on c.name=m.name;

-- Register current official-community references at game level.
insert into public.resources (resource_type,title,url,note,source,source_authority,ingested_via)
values
  ('game_homepage','阴阳师官方社区公告','https://www.taptap.cn/app/12492/topic?type=official','用于版本、活动、召唤与福利公告核验。','TapTap 阴阳师官方社区','official_community','ai'),
  ('game_phase_reference','阴阳师 2026-08 云华依言歌版本公告','https://www.taptap.cn/moment/838897937026122777','当前版本活动、礼包码与时间节点参考。','TapTap 阴阳师官方','official_community','ai'),
  ('game_phase_reference','阴阳师 Vsinger 联动召唤公告','https://www.taptap.cn/moment/836993567002988173','洛天依/言和联动召唤规则与 8/30 截止时间参考。','TapTap 阴阳师官方','official_community','ai'),
  ('game_phase_reference','阴阳师 胧车探索官方说明','https://www.taptap.cn/moment/729823710776659959','离线御魂/觉醒探索开启条件与减负规则参考。','TapTap 阴阳师官方','official_community','ai'),
  ('game_phase_reference','阴阳师十周年「拾光永恒」官方专题','https://www.taptap.cn/hashtag/%E9%98%B4%E9%98%B3%E5%B8%88%E6%8B%BE%E5%85%89%E6%B0%B8%E6%81%92','十周年 9/9 福利与后续官方公告聚合参考。','TapTap 阴阳师官方社区','official_community','ai')
on conflict (url) do update
set resource_type=excluded.resource_type,
    title=excluded.title,
    note=excluded.note,
    source=excluded.source,
    source_authority=excluded.source_authority,
    ingested_via=excluded.ingested_via,
    updated_at=now();

with game as (select id from public.games where code='YYS'), refs as (
  select id from public.resources where url in (
    'https://www.taptap.cn/app/12492/topic?type=official',
    'https://www.taptap.cn/moment/838897937026122777',
    'https://www.taptap.cn/moment/836993567002988173',
    'https://www.taptap.cn/moment/729823710776659959',
    'https://www.taptap.cn/hashtag/%E9%98%B4%E9%98%B3%E5%B8%88%E6%8B%BE%E5%85%89%E6%B0%B8%E6%81%92'
  )
)
insert into public.resource_relations (resource_id,entity_type,entity_id,relation_type)
select refs.id,'game',game.id,'reference'
from refs cross join game
where not exists (
  select 1 from public.resource_relations rr
  where rr.resource_id=refs.id and rr.entity_type='game' and rr.entity_id=game.id and rr.relation_type='reference'
);
