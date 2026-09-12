-- GUCC six-game character catalog refresh — 2026-09-12
-- Scope: facts/data only. No version anchors are created here.
-- Unknown fields remain NULL until officially confirmed.

-- ---------------------------------------------------------------------------
-- HSR: 真珠
-- ---------------------------------------------------------------------------
with game_row as (
  select id from public.games where short_code = '崩' limit 1
)
insert into public.characters (game_id, name, full_name, rarity, element, profession, sex, note)
select
  id,
  '真珠',
  '真珠',
  '5星',
  '冰',
  '欢愉',
  '女',
  '官方已于2026-08-11公开「阿哈时刻｜真珠」角色宣发；真珠为星际和平公司战略投资部艺术品投资专家、二相乐园首席执行官。官方角色宣发已确认其为五星冰属性「欢愉」角色；具体技能数值与完整战斗机制待版本前瞻/正式实装后继续维护。'
from game_row
on conflict (game_id, name) do update set
  full_name = excluded.full_name,
  rarity = excluded.rarity,
  element = excluded.element,
  profession = excluded.profession,
  sex = excluded.sex,
  note = excluded.note,
  updated_at = now();

insert into public.character_names (character_id, lang, name)
select c.id, 'zh', '真珠'
from public.characters c
join public.games g on g.id = c.game_id
where g.short_code = '崩' and c.name = '真珠'
on conflict (character_id, lang) do update set
  name = excluded.name,
  updated_at = now();

insert into public.resources (
  resource_type, title, url, note, source, source_host, source_authority, ingested_via
)
values (
  'character_preview',
  '真珠 官方角色宣发',
  'https://www.taptap.cn/moment/836184116029293065',
  '《崩坏：星穹铁道》官方「阿哈时刻｜真珠」角色宣发。',
  '《崩坏：星穹铁道》官方',
  'www.taptap.cn',
  'official_community',
  'manual'
)
on conflict (url) do update set
  resource_type = excluded.resource_type,
  title = excluded.title,
  note = excluded.note,
  source = excluded.source,
  source_host = excluded.source_host,
  source_authority = excluded.source_authority,
  ingested_via = excluded.ingested_via,
  updated_at = now();

insert into public.resource_relations (resource_id, entity_type, entity_id, relation_type)
select r.id, 'character', c.id, 'reference'
from public.resources r
join public.characters c on c.name = '真珠'
join public.games g on g.id = c.game_id and g.short_code = '崩'
where r.url = 'https://www.taptap.cn/moment/836184116029293065'
on conflict (resource_id, entity_type, entity_id, relation_type) do nothing;

-- ---------------------------------------------------------------------------
-- WW: 心 / 锁暝
-- ---------------------------------------------------------------------------
update public.characters c set
  element = '导电',
  profession = '音感仪',
  note = '官方角色档案已确认：岁主「心」，梦州文明的引导者，异能力为「万相分形」；2026-08-28官方进一步公开共鸣属性为「导电」、武器类型为「音感仪」。稀有度与正式实装版本在官方版本公告明确前不先行推断。',
  updated_at = now()
from public.games g
where c.game_id = g.id and g.short_code = '鸣' and c.name = '心';

update public.resources r set
  resource_type = 'character_preview',
  title = '心 官方角色档案前瞻',
  url = 'https://www.taptap.cn/moment/842076796751973052?group_id=330015',
  note = '鸣潮官方「共鸣者档案前瞻｜心」；确认导电属性与音感仪。',
  source = '鸣潮官方',
  source_host = 'www.taptap.cn',
  source_authority = 'official_community',
  ingested_via = 'manual',
  updated_at = now()
where r.url = 'https://www.taptap.cn/app/234280/topic?type=official'
  and exists (
    select 1
    from public.resource_relations rr
    join public.characters c on c.id = rr.entity_id
    join public.games g on g.id = c.game_id
    where rr.resource_id = r.id
      and rr.entity_type = 'character'
      and g.short_code = '鸣'
      and c.name = '心'
  );

with game_row as (
  select id from public.games where short_code = '鸣' limit 1
)
insert into public.characters (game_id, name, full_name, rarity, element, profession, sex, note)
select
  id,
  '锁暝',
  '锁暝',
  null,
  '导电',
  '迅刀',
  null,
  '官方已公开角色档案：梦州华亭人，为解故乡「恶瘴」之厄创立禁锁十契，后奉岁主之命任职州监、执掌谛天鉴；异能力为「十重契」。2026-08-28官方确认共鸣属性为「导电」、武器类型为「迅刀」。稀有度与正式实装版本在官方版本公告明确前不先行推断。'
from game_row
on conflict (game_id, name) do update set
  full_name = excluded.full_name,
  element = excluded.element,
  profession = excluded.profession,
  note = excluded.note,
  updated_at = now();

insert into public.character_names (character_id, lang, name)
select c.id, 'zh', '锁暝'
from public.characters c
join public.games g on g.id = c.game_id
where g.short_code = '鸣' and c.name = '锁暝'
on conflict (character_id, lang) do update set
  name = excluded.name,
  updated_at = now();

insert into public.resources (
  resource_type, title, url, note, source, source_host, source_authority, ingested_via
)
values (
  'character_preview',
  '锁暝 官方角色档案前瞻',
  'https://www.sina.cn/news/detail/5336858160534111.html',
  '新浪承载的《鸣潮》认证官方微博原帖页面；确认锁暝导电属性与迅刀。',
  '《鸣潮》官方微博（新浪页面）',
  'www.sina.cn',
  'official',
  'manual'
)
on conflict (url) do update set
  resource_type = excluded.resource_type,
  title = excluded.title,
  note = excluded.note,
  source = excluded.source,
  source_host = excluded.source_host,
  source_authority = excluded.source_authority,
  ingested_via = excluded.ingested_via,
  updated_at = now();

insert into public.resource_relations (resource_id, entity_type, entity_id, relation_type)
select r.id, 'character', c.id, 'reference'
from public.resources r
join public.characters c on c.name = '锁暝'
join public.games g on g.id = c.game_id and g.short_code = '鸣'
where r.url = 'https://www.sina.cn/news/detail/5336858160534111.html'
on conflict (resource_id, entity_type, entity_id, relation_type) do nothing;

-- ---------------------------------------------------------------------------
-- ZZZ: 3.2 characters are now live; fill officially confirmed combat specs.
-- ---------------------------------------------------------------------------
update public.characters c set
  rarity = 'S级',
  element = '电',
  profession = '锋御',
  note = '3.2版本「她与她的隐秘往事」已于2026-09-09正式实装。官方更新公告确认克拉蕾为S级代理人，电属性、锋御特性；限定频段「红月初升」可获得。',
  updated_at = now()
from public.games g
where c.game_id = g.id and g.short_code = '绝' and c.name = '克拉蕾';

update public.characters c set
  rarity = 'S级',
  element = '风',
  profession = '击破',
  note = '3.2版本「她与她的隐秘往事」已于2026-09-09正式实装。官方更新公告确认洛克茜为S级代理人，风属性、击破特性；限定频段「烬夜安眠」可获得。',
  updated_at = now()
from public.games g
where c.game_id = g.id and g.short_code = '绝' and c.name = '洛克茜';

insert into public.resources (
  resource_type, title, url, note, source, source_host, source_authority, ingested_via
)
values (
  'version_reference',
  '绝区零3.2版本更新公告',
  'https://zenless.hoyoverse.com/m/zh-cn/news/166000',
  '官方更新公告，确认克拉蕾（电·锋御）与洛克茜（风·击破）的正式可玩规格。',
  '绝区零官网',
  'zenless.hoyoverse.com',
  'official',
  'manual'
)
on conflict (url) do update set
  resource_type = excluded.resource_type,
  title = excluded.title,
  note = excluded.note,
  source = excluded.source,
  source_host = excluded.source_host,
  source_authority = excluded.source_authority,
  ingested_via = excluded.ingested_via,
  updated_at = now();

insert into public.resource_relations (resource_id, entity_type, entity_id, relation_type)
select r.id, 'character', c.id, 'reference'
from public.resources r
join public.characters c on c.name in ('克拉蕾', '洛克茜')
join public.games g on g.id = c.game_id and g.short_code = '绝'
where r.url = 'https://zenless.hoyoverse.com/m/zh-cn/news/166000'
on conflict (resource_id, entity_type, entity_id, relation_type) do nothing;

-- ---------------------------------------------------------------------------
-- YYS: anniversary characters are now live.
-- ---------------------------------------------------------------------------
update public.characters c set
  note = '十周年版本已于2026-09-09正式上线；全新SP阶式神百羽凤凰火已正式降临平安京。具体就业、御魂与技能实战评价另按正式服数据维护。',
  updated_at = now()
from public.games g
where c.game_id = g.id and g.short_code = '阴' and c.name = '百羽凤凰火';

update public.characters c set
  note = '十周年版本已于2026-09-09正式上线；SSR阶式神石长姬为十周年登录赠送角色，9月9日起可通过周年登录福利获取。具体就业、御魂与技能实战评价另按正式服数据维护。',
  updated_at = now()
from public.games g
where c.game_id = g.id and g.short_code = '阴' and c.name = '石长姬';

insert into public.resource_relations (resource_id, entity_type, entity_id, relation_type)
select r.id, 'character', c.id, 'official_profile'
from public.resources r
join public.characters c on c.name = '百羽凤凰火'
join public.games g on g.id = c.game_id and g.short_code = '阴'
where r.url = 'https://yys.163.com/shishen/index.html'
on conflict (resource_id, entity_type, entity_id, relation_type) do nothing;

insert into public.resources (
  resource_type, title, url, note, source, source_host, source_authority, ingested_via
)
values (
  'character_preview',
  '百羽凤凰火 官方传记碎片',
  'https://www.taptap.cn/moment/844724909018974992?group_id=71',
  '《阴阳师》官方社区内容；确认全新SP阶式神百羽凤凰火于2026-09-09降临，并同步说明石长姬登录赠送。',
  '阴阳师官方社区',
  'www.taptap.cn',
  'official_community',
  'manual'
)
on conflict (url) do update set
  resource_type = excluded.resource_type,
  title = excluded.title,
  note = excluded.note,
  source = excluded.source,
  source_host = excluded.source_host,
  source_authority = excluded.source_authority,
  ingested_via = excluded.ingested_via,
  updated_at = now();

insert into public.resource_relations (resource_id, entity_type, entity_id, relation_type)
select r.id, 'character', c.id, 'reference'
from public.resources r
join public.characters c on c.name in ('百羽凤凰火', '石长姬')
join public.games g on g.id = c.game_id and g.short_code = '阴'
where r.url = 'https://www.taptap.cn/moment/844724909018974992?group_id=71'
on conflict (resource_id, entity_type, entity_id, relation_type) do nothing;

-- ENF: current 1.5 character catalog already matches official data; no DML needed.
-- NTE: 黑羽/明音凛 remain announcement-only; pre-1.4-preview gameplay fields stay NULL.
