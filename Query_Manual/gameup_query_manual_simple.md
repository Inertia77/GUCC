# GameUp Command Center 简化 Query 手册

> 适用数据库：你当前这套表结构。  
> 原则：不建新表、不建视图、不加索引、不搞高级封装。  
> 用法：复制 SQL 到 Supabase SQL Editor，把注释里的参数改掉再执行。

---

## 0. 表关系速记

| 事务 | 主表 | 相关表 |
|---|---|---|
| 游戏 | `games` | `game_status` |
| 角色 | `characters` | `character_names` / `character_progress` / `character_evaluations` |
| 配队 | `parties` | `party_members` |
| 版本 | `game_versions` | `version_banners` |
| 平台 | `platforms` | `resources` / `resource_relations` |
| 机制 | `mechanisms` | `resources` / `resource_relations` |
| 链接资料 | `resources` | `resource_relations` |

常用 `resource_relations.entity_type`：

| entity_type | 含义 |
|---|---|
| `game` | 游戏 |
| `character` | 角色 |
| `party` | 配队 |
| `version` | 版本 |
| `banner` | 卡池 |
| `platform` | 平台 |
| `mechanism` | 机制 |

常用 `resources.resource_type`：

| resource_type | 含义 |
|---|---|
| `official` | 官方链接 |
| `wiki` | Wiki / 图鉴 |
| `guide` | 攻略 |
| `research` | 先行研究 |
| `video` | 视频 |
| `note` | 个人笔记 |
| `other` | 其他 |

---

# 1. 游戏相关

## 1.1 查询所有游戏

```sql
select
  id,
  short_code,
  code,
  title,
  created_at,
  updated_at
from games
order by short_code, title;
```

## 1.2 按简称查询游戏

```sql
select *
from games
where short_code = 'ZZZ'; -- 改这里
```

## 1.3 新增游戏

```sql
insert into games (
  id,
  short_code,
  code,
  title,
  created_at,
  updated_at
)
values (
  gen_random_uuid(),
  'ZZZ',
  'zenless-zone-zero',
  '绝区零',
  now(),
  now()
);
```

## 1.4 查询游戏状态

```sql
select
  g.short_code,
  g.title,
  gs.content_tier,
  gs.output_enabled,
  gs.research_depth,
  gs.login_frequency,
  gs.spending_level,
  gs.info_attention,
  gs.updated_at
from games g
left join game_status gs
  on gs.game_id = g.id
where g.short_code = 'ZZZ'; -- 改这里
```

## 1.5 新增或更新游戏状态

```sql
insert into game_status (
  game_id,
  content_tier,
  output_enabled,
  research_depth,
  login_frequency,
  spending_level,
  info_attention,
  created_at,
  updated_at
)
select
  g.id,
  'P0',
  true,
  '深度研究',
  '每日登录',
  '月卡',
  '高关注',
  now(),
  now()
from games g
where g.short_code = 'ZZZ'
on conflict (game_id)
do update set
  content_tier = excluded.content_tier,
  output_enabled = excluded.output_enabled,
  research_depth = excluded.research_depth,
  login_frequency = excluded.login_frequency,
  spending_level = excluded.spending_level,
  info_attention = excluded.info_attention,
  updated_at = now();
```

---

# 2. 角色查询 / 状态修改

## 2.1 查询某个游戏的全部角色

```sql
select
  g.short_code,
  c.id,
  c.name,
  c.element,
  c.profession,
  c.sex,
  c.rarity,
  cp.research_status,
  cp.build_status,
  cp.like_level,
  c.note,
  cp.research_note
from characters c
join games g
  on g.id = c.game_id
left join character_progress cp
  on cp.character_id = c.id
where g.short_code = 'ZZZ'
order by c.name;
```

## 2.2 按角色名模糊查询角色

同时查 `characters.name` 和 `character_names.name`。

```sql
select distinct
  g.short_code,
  c.id,
  c.name,
  c.element,
  c.profession,
  c.sex,
  c.rarity,
  cp.research_status,
  cp.build_status,
  cp.like_level,
  c.note,
  cp.research_note
from characters c
join games g
  on g.id = c.game_id
left join character_progress cp
  on cp.character_id = c.id
left join character_names cn
  on cn.character_id = c.id
where g.short_code = 'ZZZ'
  and (
    c.name ilike '%维琳娜%'
    or cn.name ilike '%维琳娜%'
  )
order by c.name;
```

## 2.3 查询研究 / 养成未完成的角色

```sql
select
  g.short_code,
  c.name,
  c.element,
  c.profession,
  c.rarity,
  cp.research_status,
  cp.build_status,
  cp.like_level,
  cp.research_note
from characters c
join games g
  on g.id = c.game_id
left join character_progress cp
  on cp.character_id = c.id
where g.short_code = 'ZZZ'
  and (
    cp.research_status is null
    or cp.research_status <> '已完成'
    or cp.build_status is null
    or cp.build_status <> '已完成'
  )
order by c.name;
```

## 2.4 新增或更新角色研究 / 养成状态

```sql
insert into character_progress (
  character_id,
  research_status,
  build_status,
  like_level,
  research_note,
  created_at,
  updated_at
)
select
  c.id,
  '研究中',
  '未养成',
  '喜欢',
  '需要补机制测试',
  now(),
  now()
from characters c
join games g
  on g.id = c.game_id
where g.short_code = 'ZZZ'
  and c.name = '维琳娜'
on conflict (character_id)
do update set
  research_status = excluded.research_status,
  build_status = excluded.build_status,
  like_level = excluded.like_level,
  research_note = excluded.research_note,
  updated_at = now();
```

## 2.5 修改角色基础信息

```sql
update characters c
set
  element = '风',
  profession = '支援',
  sex = '女',
  rarity = 'S',
  note = '3.0 新角色',
  updated_at = now()
from games g
where g.id = c.game_id
  and g.short_code = 'ZZZ'
  and c.name = '维琳娜';
```

## 2.6 查询角色评价

```sql
select
  g.short_code,
  c.name,
  ce.context,
  ce.role_type,
  ce.power_rank,
  ce.note,
  ce.created_at
from character_evaluations ce
join characters c
  on c.id = ce.character_id
join games g
  on g.id = c.game_id
where g.short_code = 'ZZZ'
  and c.name = '维琳娜'
order by ce.created_at desc;
```

## 2.7 新增角色评价

```sql
insert into character_evaluations (
  id,
  character_id,
  context,
  role_type,
  power_rank,
  note,
  created_at
)
select
  gen_random_uuid(),
  c.id,
  '深渊 / 高难',
  '核心辅助',
  'T0.5',
  '依赖队伍和版本环境判断',
  now()
from characters c
join games g
  on g.id = c.game_id
where g.short_code = 'ZZZ'
  and c.name = '维琳娜';
```

---

# 3. 新增角色完整流程

## 3.1 新增角色基础信息 + 初始进度

```sql
with target_game as (
  select id
  from games
  where short_code = 'ZZZ'
),
new_character as (
  insert into characters (
    id,
    game_id,
    name,
    element,
    profession,
    sex,
    rarity,
    note,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    target_game.id,
    '维琳娜',
    '风',
    '支援',
    '女',
    'S',
    '3.0 新角色',
    now(),
    now()
  from target_game
  returning id
)
insert into character_progress (
  character_id,
  research_status,
  build_status,
  like_level,
  research_note,
  created_at,
  updated_at
)
select
  id,
  '未开始',
  '未养成',
  null,
  null,
  now(),
  now()
from new_character;
```

## 3.2 给角色追加多语言名 / 别名

```sql
insert into character_names (
  id,
  character_id,
  lang,
  name,
  created_at
)
select
  gen_random_uuid(),
  c.id,
  'ja',
  'ヴィリーナ',
  now()
from characters c
join games g
  on g.id = c.game_id
where g.short_code = 'ZZZ'
  and c.name = '维琳娜';
```

## 3.3 给角色追加官方链接 / 攻略 / 先行研究链接

```sql
with target_character as (
  select c.id
  from characters c
  join games g
    on g.id = c.game_id
  where g.short_code = 'ZZZ'
    and c.name = '维琳娜'
),
new_resource as (
  insert into resources (
    id,
    resource_type,
    title,
    url,
    note,
    source,
    created_at
  )
  values (
    gen_random_uuid(),
    'official',
    '维琳娜官方角色介绍',
    'https://example.com',
    '官方页面',
    'official website',
    now()
  )
  returning id
)
insert into resource_relations (
  id,
  resource_id,
  entity_type,
  entity_id,
  relation_type,
  source_sheet,
  source_field,
  created_at
)
select
  gen_random_uuid(),
  new_resource.id,
  'character',
  target_character.id,
  'official_page',
  null,
  null,
  now()
from new_resource
cross join target_character;
```

## 3.4 查询角色相关全部资料链接

```sql
select
  g.short_code,
  c.name as character_name,
  r.resource_type,
  r.title,
  r.url,
  r.source,
  r.note,
  rr.relation_type,
  rr.created_at
from characters c
join games g
  on g.id = c.game_id
join resource_relations rr
  on rr.entity_type = 'character'
 and rr.entity_id = c.id
join resources r
  on r.id = rr.resource_id
where g.short_code = 'ZZZ'
  and c.name = '维琳娜'
order by rr.created_at desc;
```

---

# 4. 游戏版本 / 卡池

## 4.1 查询某个游戏全部版本

```sql
select
  g.short_code,
  gv.id,
  gv.version_no,
  gv.version_name,
  gv.start_date,
  gv.note,
  gv.created_at
from game_versions gv
join games g
  on g.id = gv.game_id
where g.short_code = 'ZZZ'
order by gv.start_date desc nulls last, gv.version_no desc;
```

## 4.2 新增游戏版本

```sql
insert into game_versions (
  id,
  game_id,
  version_no,
  version_name,
  start_date,
  note,
  created_at
)
select
  gen_random_uuid(),
  g.id,
  '3.0',
  '某个梦游者的自白',
  '2026-06-17',
  '新增风属性相关内容',
  now()
from games g
where g.short_code = 'ZZZ';
```

## 4.3 查询某个版本的卡池

```sql
select
  g.short_code,
  gv.version_no,
  gv.version_name,
  vb.phase,
  vb.banner_type,
  coalesce(c.name, vb.character_name_raw) as character_name,
  vb.note,
  vb.created_at
from version_banners vb
join game_versions gv
  on gv.id = vb.version_id
join games g
  on g.id = gv.game_id
left join characters c
  on c.id = vb.character_id
where g.short_code = 'ZZZ'
  and gv.version_no = '3.0'
order by vb.phase, vb.banner_type, character_name;
```

## 4.4 新增版本卡池角色

```sql
insert into version_banners (
  id,
  version_id,
  phase,
  banner_type,
  character_id,
  character_name_raw,
  note,
  created_at
)
select
  gen_random_uuid(),
  gv.id,
  '上半',
  '限定角色',
  c.id,
  '维琳娜',
  '新限定 S',
  now()
from game_versions gv
join games g
  on g.id = gv.game_id
left join characters c
  on c.game_id = g.id
 and c.name = '维琳娜'
where g.short_code = 'ZZZ'
  and gv.version_no = '3.0';
```

## 4.5 修改卡池备注 / 阶段 / 类型

```sql
update version_banners vb
set
  phase = '下半',
  banner_type = '复刻角色',
  note = '复刻确认',
  character_name_raw = '维琳娜'
from game_versions gv
join games g
  on g.id = gv.game_id
where vb.version_id = gv.id
  and g.short_code = 'ZZZ'
  and gv.version_no = '3.0'
  and vb.character_name_raw = '维琳娜';
```

---

# 5. 配队

## 5.1 查询某个游戏全部配队

```sql
select
  g.short_code,
  p.id,
  p.summary,
  p.party_type,
  p.status,
  p.hold_status,
  p.description,
  string_agg(
    pm.slot_no::text || '. ' || coalesce(c.name, pm.member_name_raw) ||
    coalesce('（' || pm.member_role || '）', ''),
    ' / '
    order by pm.slot_no
  ) as members
from parties p
join games g
  on g.id = p.game_id
left join party_members pm
  on pm.party_id = p.id
left join characters c
  on c.id = pm.character_id
where g.short_code = 'ZZZ'
group by
  g.short_code,
  p.id,
  p.summary,
  p.party_type,
  p.status,
  p.hold_status,
  p.description
order by p.updated_at desc;
```

## 5.2 按角色查询相关配队

```sql
select
  g.short_code,
  p.id,
  p.summary,
  p.party_type,
  p.status,
  p.hold_status,
  string_agg(
    pm.slot_no::text || '. ' || coalesce(c2.name, pm.member_name_raw) ||
    coalesce('（' || pm.member_role || '）', ''),
    ' / '
    order by pm.slot_no
  ) as members
from parties p
join games g
  on g.id = p.game_id
join party_members pm_target
  on pm_target.party_id = p.id
left join characters c_target
  on c_target.id = pm_target.character_id
left join party_members pm
  on pm.party_id = p.id
left join characters c2
  on c2.id = pm.character_id
where g.short_code = 'ZZZ'
  and (
    c_target.name = '维琳娜'
    or pm_target.member_name_raw = '维琳娜'
  )
group by
  g.short_code,
  p.id,
  p.summary,
  p.party_type,
  p.status,
  p.hold_status
order by p.updated_at desc;
```

## 5.3 新增配队 + 配队成员

```sql
with target_game as (
  select id
  from games
  where short_code = 'ZZZ'
),
new_party as (
  insert into parties (
    id,
    game_id,
    summary,
    party_type,
    status,
    hold_status,
    description,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    target_game.id,
    '维琳娜风队',
    '深渊队',
    '研究中',
    '未确认',
    '围绕维琳娜展开的风属性队伍',
    now(),
    now()
  from target_game
  returning id
),
members(slot_no, member_name_raw, member_role) as (
  values
    (1, '维琳娜', '核心'),
    (2, '角色B', '副C'),
    (3, '角色C', '辅助')
)
insert into party_members (
  id,
  party_id,
  slot_no,
  character_id,
  member_name_raw,
  member_role,
  created_at
)
select
  gen_random_uuid(),
  new_party.id,
  members.slot_no,
  c.id,
  members.member_name_raw,
  members.member_role,
  now()
from new_party
cross join members
cross join target_game
left join characters c
  on c.game_id = target_game.id
 and c.name = members.member_name_raw;
```

## 5.4 修改配队基础信息

```sql
update parties p
set
  summary = '维琳娜风队改良版',
  party_type = '高难队',
  status = '可用',
  hold_status = '已持有',
  description = '实测后确认可用',
  updated_at = now()
from games g
where g.id = p.game_id
  and g.short_code = 'ZZZ'
  and p.summary = '维琳娜风队';
```

## 5.5 修改配队中的某个成员

```sql
update party_members pm
set
  member_name_raw = '新角色名',
  member_role = '辅助',
  character_id = (
    select c.id
    from characters c
    join games g
      on g.id = c.game_id
    where g.short_code = 'ZZZ'
      and c.name = '新角色名'
    limit 1
  )
where pm.party_id = (
  select p.id
  from parties p
  join games g
    on g.id = p.game_id
  where g.short_code = 'ZZZ'
    and p.summary = '维琳娜风队改良版'
  limit 1
)
and pm.slot_no = 2;
```

## 5.6 给已有配队追加一个成员

```sql
insert into party_members (
  id,
  party_id,
  slot_no,
  character_id,
  member_name_raw,
  member_role,
  created_at
)
select
  gen_random_uuid(),
  p.id,
  4,
  c.id,
  '角色D',
  '替补',
  now()
from parties p
join games g
  on g.id = p.game_id
left join characters c
  on c.game_id = g.id
 and c.name = '角色D'
where g.short_code = 'ZZZ'
  and p.summary = '维琳娜风队改良版';
```

## 5.7 删除配队中的一个成员

```sql
delete from party_members pm
where pm.party_id = (
  select p.id
  from parties p
  join games g
    on g.id = p.game_id
  where g.short_code = 'ZZZ'
    and p.summary = '维琳娜风队改良版'
  limit 1
)
and pm.slot_no = 4;
```

## 5.8 删除整个配队

先删成员，再删配队。

```sql
delete from party_members pm
where pm.party_id = (
  select p.id
  from parties p
  join games g
    on g.id = p.game_id
  where g.short_code = 'ZZZ'
    and p.summary = '维琳娜风队改良版'
  limit 1
);

delete from parties p
using games g
where g.id = p.game_id
  and g.short_code = 'ZZZ'
  and p.summary = '维琳娜风队改良版';
```

---

# 6. 资源链接

## 6.1 查询全部资源

```sql
select
  id,
  resource_type,
  title,
  url,
  source,
  note,
  created_at
from resources
order by created_at desc;
```

## 6.2 按关键词查资源

```sql
select
  id,
  resource_type,
  title,
  url,
  source,
  note,
  created_at
from resources
where
  title ilike '%维琳娜%'
  or note ilike '%维琳娜%'
  or source ilike '%维琳娜%'
order by created_at desc;
```

## 6.3 查询资源被关联到了哪里

```sql
select
  r.title,
  r.url,
  r.resource_type,
  rr.entity_type,
  rr.entity_id,
  rr.relation_type,
  rr.source_sheet,
  rr.source_field,
  rr.created_at
from resources r
join resource_relations rr
  on r.id = rr.resource_id
where r.title ilike '%维琳娜%'
order by rr.created_at desc;
```

## 6.4 删除某个资源及其关系

先删关系，再删资源本体。

```sql
delete from resource_relations rr
using resources r
where rr.resource_id = r.id
  and r.title = '维琳娜官方角色介绍';

delete from resources
where title = '维琳娜官方角色介绍';
```

---

# 7. 平台

## 7.1 查询所有平台

```sql
select
  id,
  name,
  created_at
from platforms
order by name;
```

## 7.2 新增平台

```sql
insert into platforms (
  id,
  name,
  created_at
)
values (
  gen_random_uuid(),
  'Bilibili',
  now()
);
```

## 7.3 查询平台相关资源

注意：表名是 `resources`，不是 `resource`。

```sql
select
  p.name as platform_name,
  r.resource_type,
  r.title,
  r.url,
  r.source,
  r.note,
  rr.relation_type,
  rr.created_at
from platforms p
join resource_relations rr
  on rr.entity_type = 'platform'
 and rr.entity_id = p.id
join resources r
  on r.id = rr.resource_id
where p.name = 'Bilibili'
order by rr.created_at desc;
```

## 7.4 给平台追加资源链接

```sql
with target_platform as (
  select id
  from platforms
  where name = 'Bilibili'
),
new_resource as (
  insert into resources (
    id,
    resource_type,
    title,
    url,
    note,
    source,
    created_at
  )
  values (
    gen_random_uuid(),
    'platform',
    'Bilibili 主页',
    'https://example.com',
    '平台主页',
    'Bilibili',
    now()
  )
  returning id
)
insert into resource_relations (
  id,
  resource_id,
  entity_type,
  entity_id,
  relation_type,
  source_sheet,
  source_field,
  created_at
)
select
  gen_random_uuid(),
  new_resource.id,
  'platform',
  target_platform.id,
  'homepage',
  null,
  null,
  now()
from new_resource
cross join target_platform;
```

---

# 8. 机制

## 8.1 查询某个游戏的机制

```sql
select
  g.short_code,
  m.id,
  m.title,
  m.mechanism_type,
  m.description,
  m.note,
  m.updated_at
from mechanisms m
left join games g
  on g.id = m.game_id
where g.short_code = 'ZZZ'
order by m.updated_at desc;
```

## 8.2 新增机制

```sql
insert into mechanisms (
  id,
  game_id,
  title,
  mechanism_type,
  description,
  note,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  g.id,
  '乱流机制',
  '战斗机制',
  '版本环境中的特殊战斗规则',
  '需要结合实测确认',
  now(),
  now()
from games g
where g.short_code = 'ZZZ';
```

## 8.3 修改机制说明

```sql
update mechanisms m
set
  mechanism_type = '战斗机制',
  description = '更新后的机制说明',
  note = '补充测试结论',
  updated_at = now()
from games g
where g.id = m.game_id
  and g.short_code = 'ZZZ'
  and m.title = '乱流机制';
```

## 8.4 给机制追加资料链接

```sql
with target_mechanism as (
  select m.id
  from mechanisms m
  join games g
    on g.id = m.game_id
  where g.short_code = 'ZZZ'
    and m.title = '乱流机制'
),
new_resource as (
  insert into resources (
    id,
    resource_type,
    title,
    url,
    note,
    source,
    created_at
  )
  values (
    gen_random_uuid(),
    'research',
    '乱流机制先行研究',
    'https://example.com',
    '先行研究资料',
    'Bilibili',
    now()
  )
  returning id
)
insert into resource_relations (
  id,
  resource_id,
  entity_type,
  entity_id,
  relation_type,
  source_sheet,
  source_field,
  created_at
)
select
  gen_random_uuid(),
  new_resource.id,
  'mechanism',
  target_mechanism.id,
  'pre_research',
  null,
  null,
  now()
from new_resource
cross join target_mechanism;
```

---

# 9. 常用检查 / 修复

## 9.1 查没有进度记录的角色

```sql
select
  g.short_code,
  c.id,
  c.name
from characters c
join games g
  on g.id = c.game_id
left join character_progress cp
  on cp.character_id = c.id
where cp.character_id is null
order by g.short_code, c.name;
```

## 9.2 查没有绑定角色 ID 的配队成员

```sql
select
  g.short_code,
  p.summary,
  pm.slot_no,
  pm.member_name_raw,
  pm.member_role
from party_members pm
join parties p
  on p.id = pm.party_id
join games g
  on g.id = p.game_id
where pm.character_id is null
order by g.short_code, p.summary, pm.slot_no;
```

## 9.3 自动修复配队成员的 character_id

根据 `member_name_raw = characters.name` 自动补 `character_id`。

```sql
update party_members pm
set character_id = c.id
from parties p
join games g
  on g.id = p.game_id
join characters c
  on c.game_id = g.id
where pm.party_id = p.id
  and pm.character_id is null
  and pm.member_name_raw = c.name;
```

## 9.4 查没有绑定角色 ID 的卡池记录

```sql
select
  g.short_code,
  gv.version_no,
  vb.phase,
  vb.banner_type,
  vb.character_name_raw,
  vb.note
from version_banners vb
join game_versions gv
  on gv.id = vb.version_id
join games g
  on g.id = gv.game_id
where vb.character_id is null
order by g.short_code, gv.version_no, vb.phase;
```

## 9.5 自动修复卡池角色的 character_id

```sql
update version_banners vb
set character_id = c.id
from game_versions gv
join games g
  on g.id = gv.game_id
join characters c
  on c.game_id = g.id
where vb.version_id = gv.id
  and vb.character_id is null
  and vb.character_name_raw = c.name;
```

---

# 10. 最常用速查版

## 查角色

```sql
select
  g.short_code,
  c.name,
  c.element,
  c.profession,
  c.rarity,
  cp.research_status,
  cp.build_status,
  cp.like_level
from characters c
join games g on g.id = c.game_id
left join character_progress cp on cp.character_id = c.id
where g.short_code = 'ZZZ'
  and c.name ilike '%维琳娜%';
```

## 改角色进度

```sql
insert into character_progress (
  character_id,
  research_status,
  build_status,
  like_level,
  research_note,
  created_at,
  updated_at
)
select
  c.id,
  '研究中',
  '未养成',
  '喜欢',
  '备注',
  now(),
  now()
from characters c
join games g on g.id = c.game_id
where g.short_code = 'ZZZ'
  and c.name = '维琳娜'
on conflict (character_id)
do update set
  research_status = excluded.research_status,
  build_status = excluded.build_status,
  like_level = excluded.like_level,
  research_note = excluded.research_note,
  updated_at = now();
```

## 查配队

```sql
select
  p.summary,
  p.party_type,
  p.status,
  string_agg(
    pm.slot_no::text || '. ' || coalesce(c.name, pm.member_name_raw),
    ' / '
    order by pm.slot_no
  ) as members
from parties p
join games g on g.id = p.game_id
left join party_members pm on pm.party_id = p.id
left join characters c on c.id = pm.character_id
where g.short_code = 'ZZZ'
group by p.id, p.summary, p.party_type, p.status
order by p.updated_at desc;
```

## 查版本卡池

```sql
select
  gv.version_no,
  gv.version_name,
  vb.phase,
  vb.banner_type,
  coalesce(c.name, vb.character_name_raw) as character_name,
  vb.note
from version_banners vb
join game_versions gv on gv.id = vb.version_id
join games g on g.id = gv.game_id
left join characters c on c.id = vb.character_id
where g.short_code = 'ZZZ'
  and gv.version_no = '3.0'
order by vb.phase, vb.banner_type;
```

## 查角色资源链接

```sql
select
  c.name,
  r.resource_type,
  r.title,
  r.url,
  rr.relation_type
from characters c
join games g on g.id = c.game_id
join resource_relations rr
  on rr.entity_type = 'character'
 and rr.entity_id = c.id
join resources r
  on r.id = rr.resource_id
where g.short_code = 'ZZZ'
  and c.name = '维琳娜'
order by rr.created_at desc;
```

---

# 11. 删除角色的安全顺序

如果真要删除角色，建议按这个顺序来。

## 11.1 删除角色资源关系

```sql
delete from resource_relations rr
using characters c, games g
where rr.entity_type = 'character'
  and rr.entity_id = c.id
  and g.id = c.game_id
  and g.short_code = 'ZZZ'
  and c.name = '维琳娜';
```

## 11.2 删除角色进度

```sql
delete from character_progress cp
using characters c, games g
where cp.character_id = c.id
  and g.id = c.game_id
  and g.short_code = 'ZZZ'
  and c.name = '维琳娜';
```

## 11.3 删除角色别名

```sql
delete from character_names cn
using characters c, games g
where cn.character_id = c.id
  and g.id = c.game_id
  and g.short_code = 'ZZZ'
  and c.name = '维琳娜';
```

## 11.4 删除角色评价

```sql
delete from character_evaluations ce
using characters c, games g
where ce.character_id = c.id
  and g.id = c.game_id
  and g.short_code = 'ZZZ'
  and c.name = '维琳娜';
```

## 11.5 最后删除角色本体

```sql
delete from characters c
using games g
where g.id = c.game_id
  and g.short_code = 'ZZZ'
  and c.name = '维琳娜';
```

---

# 12. 最小心法

1. 查东西：从主表开始，比如角色从 `characters` 开始。  
2. 查状态：再 `left join` 状态表，比如 `character_progress`。  
3. 查链接：走 `resources` + `resource_relations`。  
4. 新增复杂对象：先建本体，再建状态，再建资源关系。  
5. 删除复杂对象：先删周边，再删本体。  

这版就是朴素工具箱，不玩数据库杂技。
