# GameUp Command Center Query 库

> 适用数据库：Supabase / PostgreSQL  
> 目的：把日常查询、增删改、研究状态管理、版本管理、配队管理、链接管理集中成一个可复制参考的 SQL 手册。  
> 使用方式：每段 SQL 顶部都有 `params` 或 `input`，先改参数，再在 Supabase SQL Editor 执行。

---

## 0. 总原则

### 0.1 推荐使用方式

多数查询都使用这种结构：

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
)
SELECT ...
```

你只需要改 `params` 里的值。这样比在 SQL 里到处手改条件更安全。

### 0.2 推荐状态值

数据库里这些字段都是 `text`，所以理论上什么都能写。为了以后查询稳定，建议统一成下面这些值。

#### 角色研究状态 `character_progress.research_status`

| 值 | 含义 |
|---|---|
| `未开始` | 还没研究 |
| `资料收集` | 正在找官方/攻略/实测资料 |
| `阅读中` | 正在消化资料 |
| `实测中` | 已经进游戏测试 |
| `待写稿` | 研究完成，等输出 |
| `已完成` | 已经完成研究/视频/笔记 |
| `搁置` | 暂停 |

#### 角色养成状态 `character_progress.build_status`

| 值 | 含义 |
|---|---|
| `未拥有` | 没有角色 |
| `未养成` | 有角色但没养 |
| `养成中` | 正在养 |
| `可用` | 可以上场 |
| `已毕业` | 基本毕业 |
| `暂不培养` | 不准备养 |

#### 喜爱程度 `character_progress.like_level`

| 值 | 含义 |
|---|---|
| `S` | 很喜欢 / 高优先级 |
| `A` | 喜欢 |
| `B` | 一般 |
| `C` | 暂无兴趣 |
| `未知` | 还没判断 |

#### 配队状态 `parties.status`

| 值 | 含义 |
|---|---|
| `候选` | 只是想法 |
| `测试中` | 正在测试 |
| `可用` | 实战可用 |
| `核心` | 常用主力队 |
| `归档` | 过时/不用 |

#### 配队持有状态 `parties.hold_status`

| 值 | 含义 |
|---|---|
| `全员拥有` | 成员都有 |
| `缺角色` | 缺成员 |
| `缺养成` | 有角色但没养 |
| `缺研究` | 机制/手法还没搞懂 |
| `未知` | 未确认 |

#### 资源类型 `resources.resource_type`

| 值 | 含义 |
|---|---|
| `官方链接` | 官网、公告、角色页 |
| `先行研究` | 他人攻略/数据分析 |
| `视频参考` | B站/YouTube 视频 |
| `WIKI` | Wiki 页面 |
| `表格` | Google Sheet / 数据表 |
| `笔记` | 自己的笔记 |
| `其他` | 其他 |

#### 资源关联类型 `resource_relations.relation_type`

| 值 | 含义 |
|---|---|
| `官方资料` | 官方资料链接 |
| `先行研究` | 研究参考 |
| `养成参考` | Build / 装备 / 面板参考 |
| `版本来源` | 版本资料来源 |
| `卡池来源` | 卡池资料来源 |
| `机制来源` | 机制资料来源 |
| `配队参考` | 配队参考 |
| `备注资料` | 其他备注 |

---

## 1. 一次性推荐增强：索引、唯一约束、模糊搜索

> 不是必须，但强烈建议先跑。否则后面的 `ON CONFLICT` upsert 类 SQL 不能稳定使用。老祖宗说「磨刀不误砍柴工」，数据库版就是先建索引。🪓

### 1.1 启用 UUID / 模糊搜索扩展

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### 1.2 推荐唯一索引

```sql
-- 同一个游戏下，角色主名不重复
CREATE UNIQUE INDEX IF NOT EXISTS characters_game_name_uidx
ON characters(game_id, name);

-- 同一个角色，同语言，同名字不重复。允许同语言有多个别名
CREATE UNIQUE INDEX IF NOT EXISTS character_names_character_lang_name_uidx
ON character_names(character_id, lang, name);

-- 同一个游戏下，版本号不重复
CREATE UNIQUE INDEX IF NOT EXISTS game_versions_game_version_no_uidx
ON game_versions(game_id, version_no);

-- 同一个配队里，同一个位置不重复
CREATE UNIQUE INDEX IF NOT EXISTS party_members_party_slot_uidx
ON party_members(party_id, slot_no);

-- URL 不为空时不重复
CREATE UNIQUE INDEX IF NOT EXISTS resources_url_uidx
ON resources(url)
WHERE url IS NOT NULL;

-- 同一个资源不要重复挂到同一个实体的同一种关系上
CREATE UNIQUE INDEX IF NOT EXISTS resource_relations_unique_uidx
ON resource_relations(resource_id, entity_type, entity_id, relation_type);
```

### 1.3 推荐查询索引

```sql
CREATE INDEX IF NOT EXISTS games_short_code_idx
ON games(short_code);

CREATE INDEX IF NOT EXISTS games_code_idx
ON games(code);

CREATE INDEX IF NOT EXISTS characters_game_id_idx
ON characters(game_id);

CREATE INDEX IF NOT EXISTS character_names_character_id_idx
ON character_names(character_id);

CREATE INDEX IF NOT EXISTS character_progress_research_status_idx
ON character_progress(research_status);

CREATE INDEX IF NOT EXISTS character_progress_build_status_idx
ON character_progress(build_status);

CREATE INDEX IF NOT EXISTS parties_game_id_idx
ON parties(game_id);

CREATE INDEX IF NOT EXISTS party_members_party_id_idx
ON party_members(party_id);

CREATE INDEX IF NOT EXISTS party_members_character_id_idx
ON party_members(character_id);

CREATE INDEX IF NOT EXISTS game_versions_game_id_idx
ON game_versions(game_id);

CREATE INDEX IF NOT EXISTS version_banners_version_id_idx
ON version_banners(version_id);

CREATE INDEX IF NOT EXISTS version_banners_character_id_idx
ON version_banners(character_id);

CREATE INDEX IF NOT EXISTS mechanisms_game_id_idx
ON mechanisms(game_id);

CREATE INDEX IF NOT EXISTS resource_relations_entity_idx
ON resource_relations(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS resources_type_idx
ON resources(resource_type);
```

### 1.4 推荐模糊搜索索引

```sql
CREATE INDEX IF NOT EXISTS characters_name_trgm_idx
ON characters USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS character_names_name_trgm_idx
ON character_names USING gin (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS parties_summary_trgm_idx
ON parties USING gin (summary gin_trgm_ops);

CREATE INDEX IF NOT EXISTS mechanisms_title_trgm_idx
ON mechanisms USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS resources_title_trgm_idx
ON resources USING gin (title gin_trgm_ops);
```

---

## 2. 常用视图：先建好，以后查询更轻松

### 2.1 角色总览视图

```sql
CREATE OR REPLACE VIEW v_character_overview AS
SELECT
  g.short_code AS game_short_code,
  g.code AS game_code,
  g.title AS game_title,
  c.id AS character_id,
  c.name AS character_name,
  c.element,
  c.profession,
  c.sex,
  c.rarity,
  c.note AS character_note,
  cp.research_status,
  cp.build_status,
  cp.like_level,
  cp.research_note,
  string_agg(DISTINCT cn.lang || ':' || cn.name, ' / ')
    FILTER (WHERE cn.id IS NOT NULL) AS aliases,
  string_agg(DISTINCT concat_ws(':', ce.context, ce.role_type, ce.power_rank), ' / ')
    FILTER (WHERE ce.id IS NOT NULL) AS evaluations,
  c.created_at,
  c.updated_at
FROM characters c
JOIN games g ON g.id = c.game_id
LEFT JOIN character_progress cp ON cp.character_id = c.id
LEFT JOIN character_names cn ON cn.character_id = c.id
LEFT JOIN character_evaluations ce ON ce.character_id = c.id
GROUP BY
  g.short_code, g.code, g.title,
  c.id, c.name, c.element, c.profession, c.sex, c.rarity, c.note,
  cp.research_status, cp.build_status, cp.like_level, cp.research_note,
  c.created_at, c.updated_at;
```

### 2.2 配队总览视图

```sql
CREATE OR REPLACE VIEW v_party_overview AS
SELECT
  g.short_code AS game_short_code,
  g.code AS game_code,
  g.title AS game_title,
  p.id AS party_id,
  p.summary,
  p.party_type,
  p.status,
  p.hold_status,
  p.description,
  string_agg(
    pm.slot_no::text || '. ' || coalesce(c.name, pm.member_name_raw) ||
    coalesce('[' || pm.member_role || ']', ''),
    ' / ' ORDER BY pm.slot_no
  ) AS members,
  p.created_at,
  p.updated_at
FROM parties p
JOIN games g ON g.id = p.game_id
LEFT JOIN party_members pm ON pm.party_id = p.id
LEFT JOIN characters c ON c.id = pm.character_id
GROUP BY
  g.short_code, g.code, g.title,
  p.id, p.summary, p.party_type, p.status, p.hold_status, p.description,
  p.created_at, p.updated_at;
```

### 2.3 版本卡池总览视图

```sql
CREATE OR REPLACE VIEW v_version_banner_overview AS
SELECT
  g.short_code AS game_short_code,
  g.code AS game_code,
  g.title AS game_title,
  gv.id AS version_id,
  gv.version_no,
  gv.version_name,
  gv.start_date,
  gv.note AS version_note,
  vb.id AS banner_id,
  vb.phase,
  vb.banner_type,
  coalesce(c.name, vb.character_name_raw) AS banner_character_name,
  c.id AS character_id,
  vb.note AS banner_note,
  vb.created_at AS banner_created_at
FROM game_versions gv
JOIN games g ON g.id = gv.game_id
LEFT JOIN version_banners vb ON vb.version_id = gv.id
LEFT JOIN characters c ON c.id = vb.character_id;
```

---

## 3. 游戏管理 Queries

### 3.1 查询所有游戏和游戏运营状态

```sql
SELECT
  g.id,
  g.short_code,
  g.code,
  g.title,
  gs.content_tier,
  gs.output_enabled,
  gs.research_depth,
  gs.login_frequency,
  gs.spending_level,
  gs.info_attention,
  g.created_at,
  g.updated_at
FROM games g
LEFT JOIN game_status gs ON gs.game_id = g.id
ORDER BY g.short_code NULLS LAST, g.title;
```

### 3.2 新增游戏，并初始化游戏状态

```sql
WITH input AS (
  SELECT
    'ZZZ'::text AS short_code,
    'zenless-zone-zero'::text AS code,
    '绝区零'::text AS title,
    'P0'::text AS content_tier,
    true::bool AS output_enabled,
    '深度研究'::text AS research_depth,
    '每日'::text AS login_frequency,
    '月卡/小氪'::text AS spending_level,
    '高'::text AS info_attention
), upsert_game AS (
  INSERT INTO games (id, short_code, code, title, created_at, updated_at)
  SELECT gen_random_uuid(), short_code, code, title, now(), now()
  FROM input
  ON CONFLICT (title) DO UPDATE SET
    short_code = EXCLUDED.short_code,
    code = EXCLUDED.code,
    updated_at = now()
  RETURNING id
)
INSERT INTO game_status (
  game_id, content_tier, output_enabled, research_depth,
  login_frequency, spending_level, info_attention,
  created_at, updated_at
)
SELECT
  ug.id, i.content_tier, i.output_enabled, i.research_depth,
  i.login_frequency, i.spending_level, i.info_attention,
  now(), now()
FROM upsert_game ug
CROSS JOIN input i
ON CONFLICT (game_id) DO UPDATE SET
  content_tier = EXCLUDED.content_tier,
  output_enabled = EXCLUDED.output_enabled,
  research_depth = EXCLUDED.research_depth,
  login_frequency = EXCLUDED.login_frequency,
  spending_level = EXCLUDED.spending_level,
  info_attention = EXCLUDED.info_attention,
  updated_at = now();
```

### 3.3 修改游戏状态

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    'P0'::text AS content_tier,
    true::bool AS output_enabled,
    '深度研究'::text AS research_depth,
    '每日'::text AS login_frequency,
    '月卡/小氪'::text AS spending_level,
    '高'::text AS info_attention
), target_game AS (
  SELECT g.id
  FROM games g
  CROSS JOIN params p
  WHERE g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code
  LIMIT 1
)
UPDATE game_status gs
SET
  content_tier = p.content_tier,
  output_enabled = p.output_enabled,
  research_depth = p.research_depth,
  login_frequency = p.login_frequency,
  spending_level = p.spending_level,
  info_attention = p.info_attention,
  updated_at = now()
FROM params p, target_game tg
WHERE gs.game_id = tg.id
RETURNING gs.*;
```

---

## 4. 角色查询 Queries

### 4.1 按角色名查询角色总览

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS keyword
)
SELECT DISTINCT
  v.*
FROM v_character_overview v
LEFT JOIN character_names cn ON cn.character_id = v.character_id
CROSS JOIN params p
WHERE
  (v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code)
  AND (
    v.character_name ILIKE '%' || p.keyword || '%'
    OR cn.name ILIKE '%' || p.keyword || '%'
  )
ORDER BY v.character_name;
```

### 4.2 查询某游戏全部角色研究/养成状态

```sql
WITH params AS (
  SELECT 'ZZZ'::text AS game_code
)
SELECT
  character_name,
  element,
  profession,
  rarity,
  research_status,
  build_status,
  like_level,
  research_note,
  evaluations,
  aliases
FROM v_character_overview v
CROSS JOIN params p
WHERE v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code
ORDER BY
  CASE research_status
    WHEN '实测中' THEN 1
    WHEN '待写稿' THEN 2
    WHEN '资料收集' THEN 3
    WHEN '阅读中' THEN 4
    WHEN '未开始' THEN 5
    WHEN '已完成' THEN 6
    WHEN '搁置' THEN 7
    ELSE 99
  END,
  character_name;
```

### 4.3 查询「需要研究」的角色

```sql
WITH params AS (
  SELECT 'ZZZ'::text AS game_code
)
SELECT
  character_name,
  element,
  profession,
  rarity,
  research_status,
  build_status,
  like_level,
  research_note
FROM v_character_overview v
CROSS JOIN params p
WHERE
  (v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code)
  AND coalesce(v.research_status, '未开始') IN ('未开始', '资料收集', '阅读中', '实测中', '待写稿')
ORDER BY
  CASE like_level WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 WHEN 'C' THEN 4 ELSE 99 END,
  CASE research_status
    WHEN '实测中' THEN 1
    WHEN '待写稿' THEN 2
    WHEN '资料收集' THEN 3
    WHEN '阅读中' THEN 4
    WHEN '未开始' THEN 5
    ELSE 99
  END,
  character_name;
```

### 4.4 查询「需要养成」的角色

```sql
WITH params AS (
  SELECT 'ZZZ'::text AS game_code
)
SELECT
  character_name,
  element,
  profession,
  rarity,
  research_status,
  build_status,
  like_level,
  research_note
FROM v_character_overview v
CROSS JOIN params p
WHERE
  (v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code)
  AND coalesce(v.build_status, '未养成') IN ('未拥有', '未养成', '养成中', '可用')
ORDER BY
  CASE build_status
    WHEN '养成中' THEN 1
    WHEN '可用' THEN 2
    WHEN '未养成' THEN 3
    WHEN '未拥有' THEN 4
    ELSE 99
  END,
  CASE like_level WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 WHEN 'C' THEN 4 ELSE 99 END,
  character_name;
```

### 4.5 查询高优先级角色

```sql
WITH params AS (
  SELECT 'ZZZ'::text AS game_code
)
SELECT
  character_name,
  element,
  profession,
  rarity,
  research_status,
  build_status,
  like_level,
  evaluations,
  research_note
FROM v_character_overview v
CROSS JOIN params p
WHERE
  (v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code)
  AND like_level IN ('S', 'A')
ORDER BY
  CASE like_level WHEN 'S' THEN 1 WHEN 'A' THEN 2 ELSE 99 END,
  character_name;
```

### 4.6 查询某角色的所有资源链接

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
SELECT
  r.resource_type,
  rr.relation_type,
  r.title,
  r.url,
  r.source,
  r.note,
  r.created_at
FROM resource_relations rr
JOIN resources r ON r.id = rr.resource_id
JOIN target_character tc ON tc.id = rr.entity_id
WHERE rr.entity_type = 'character'
ORDER BY r.resource_type, rr.relation_type, r.created_at DESC;
```

---

## 5. 角色新增 / 修改 Queries

### 5.1 一次性新增或更新角色基础信息、别名、进度、评价

> 适合新增角色时使用。已经存在同名角色时会更新基础信息和进度。

```sql
WITH input AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS name,
    '风'::text AS element,
    '支援'::text AS profession,
    '女'::text AS sex,
    'S'::text AS rarity,
    '3.0 新角色，重点观察风属性/乱流相关机制'::text AS note,
    '资料收集'::text AS research_status,
    '未养成'::text AS build_status,
    'S'::text AS like_level,
    '先收官方机制、卡池公告、社区先行研究，再决定实测角度。'::text AS research_note
), target_game AS (
  SELECT g.id
  FROM games g
  JOIN input i ON g.short_code = i.game_code OR g.code = i.game_code OR g.title = i.game_code
  LIMIT 1
), upsert_character AS (
  INSERT INTO characters (
    id, game_id, name, element, profession, sex, rarity, note, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), tg.id, i.name, i.element, i.profession, i.sex, i.rarity, i.note, now(), now()
  FROM input i
  CROSS JOIN target_game tg
  ON CONFLICT (game_id, name) DO UPDATE SET
    element = EXCLUDED.element,
    profession = EXCLUDED.profession,
    sex = EXCLUDED.sex,
    rarity = EXCLUDED.rarity,
    note = EXCLUDED.note,
    updated_at = now()
  RETURNING id
), upsert_progress AS (
  INSERT INTO character_progress (
    character_id, research_status, build_status, like_level, research_note, created_at, updated_at
  )
  SELECT
    uc.id, i.research_status, i.build_status, i.like_level, i.research_note, now(), now()
  FROM upsert_character uc
  CROSS JOIN input i
  ON CONFLICT (character_id) DO UPDATE SET
    research_status = EXCLUDED.research_status,
    build_status = EXCLUDED.build_status,
    like_level = EXCLUDED.like_level,
    research_note = EXCLUDED.research_note,
    updated_at = now()
  RETURNING character_id
), alias_input AS (
  SELECT * FROM (VALUES
    ('zh-CN'::text, '维琳娜'::text),
    ('ja-JP'::text, 'ヴィリーナ'::text),
    ('en-US'::text, 'Velina'::text)
  ) AS t(lang, name)
), insert_aliases AS (
  INSERT INTO character_names (id, character_id, lang, name, created_at)
  SELECT gen_random_uuid(), uc.id, ai.lang, ai.name, now()
  FROM upsert_character uc
  CROSS JOIN alias_input ai
  WHERE ai.name IS NOT NULL AND ai.name <> ''
  ON CONFLICT (character_id, lang, name) DO NOTHING
  RETURNING id
), evaluation_input AS (
  SELECT * FROM (VALUES
    ('泛用'::text, '支援/辅助'::text, '待核实'::text, '先按官方定位记录，强度等实测。'::text),
    ('乱流环境'::text, '风属性相关'::text, '待核实'::text, '关注 3.0 式舆/乱流增益。'::text)
  ) AS t(context, role_type, power_rank, note)
)
INSERT INTO character_evaluations (
  id, character_id, context, role_type, power_rank, note, created_at
)
SELECT gen_random_uuid(), uc.id, ei.context, ei.role_type, ei.power_rank, ei.note, now()
FROM upsert_character uc
CROSS JOIN evaluation_input ei
WHERE NOT EXISTS (
  SELECT 1
  FROM character_evaluations ce
  WHERE ce.character_id = uc.id
    AND ce.context = ei.context
    AND coalesce(ce.role_type, '') = coalesce(ei.role_type, '')
);
```

### 5.2 新增角色资源链接：官方链接、先行研究、视频参考等

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
), resource_input AS (
  SELECT * FROM (VALUES
    ('官方链接'::text, '维琳娜官方角色页'::text, 'https://example.com/official/velina'::text, '官方资料'::text, '官方'::text, '角色官方页面'::text),
    ('先行研究'::text, '维琳娜机制先行研究'::text, 'https://example.com/research/velina'::text, '先行研究'::text, '社区攻略'::text, '待复核，不能直接当结论'::text),
    ('视频参考'::text, '维琳娜实测视频参考'::text, 'https://example.com/video/velina'::text, '视频参考'::text, 'B站/YouTube'::text, '只记录观点来源'::text)
  ) AS t(resource_type, title, url, relation_type, source, note)
), upsert_resources AS (
  INSERT INTO resources (id, resource_type, title, url, note, source, created_at)
  SELECT gen_random_uuid(), resource_type, title, url, note, source, now()
  FROM resource_input
  ON CONFLICT (url) WHERE url IS NOT NULL DO UPDATE SET
    resource_type = EXCLUDED.resource_type,
    title = EXCLUDED.title,
    note = EXCLUDED.note,
    source = EXCLUDED.source
  RETURNING id, url
)
INSERT INTO resource_relations (
  id, resource_id, entity_type, entity_id, relation_type, source_sheet, source_field, created_at
)
SELECT
  gen_random_uuid(),
  ur.id,
  'character',
  tc.id,
  ri.relation_type,
  NULL,
  NULL,
  now()
FROM upsert_resources ur
JOIN resource_input ri ON ri.url = ur.url
CROSS JOIN target_character tc
ON CONFLICT (resource_id, entity_type, entity_id, relation_type) DO NOTHING;
```

### 5.3 修改角色基础信息

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name,
    '风'::text AS element,
    '支援'::text AS profession,
    '女'::text AS sex,
    'S'::text AS rarity,
    '更新后的备注'::text AS note
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
UPDATE characters c
SET
  element = p.element,
  profession = p.profession,
  sex = p.sex,
  rarity = p.rarity,
  note = p.note,
  updated_at = now()
FROM params p, target_character tc
WHERE c.id = tc.id
RETURNING c.*;
```

### 5.4 修改角色研究/养成/喜爱状态

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name,
    '实测中'::text AS research_status,
    '养成中'::text AS build_status,
    'S'::text AS like_level,
    '开始做乱流环境实测，记录不同配队差异。'::text AS research_note
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
INSERT INTO character_progress (
  character_id, research_status, build_status, like_level, research_note, created_at, updated_at
)
SELECT
  tc.id, p.research_status, p.build_status, p.like_level, p.research_note, now(), now()
FROM target_character tc
CROSS JOIN params p
ON CONFLICT (character_id) DO UPDATE SET
  research_status = EXCLUDED.research_status,
  build_status = EXCLUDED.build_status,
  like_level = EXCLUDED.like_level,
  research_note = EXCLUDED.research_note,
  updated_at = now()
RETURNING *;
```

### 5.5 只修改研究状态，不动其他字段

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name,
    '已完成'::text AS research_status
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
UPDATE character_progress cp
SET
  research_status = p.research_status,
  updated_at = now()
FROM params p, target_character tc
WHERE cp.character_id = tc.id
RETURNING cp.*;
```

### 5.6 追加角色别名/多语言名

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
), alias_input AS (
  SELECT * FROM (VALUES
    ('zh-CN'::text, '维琳娜'::text),
    ('ja-JP'::text, 'ヴィリーナ'::text),
    ('en-US'::text, 'Velina'::text)
  ) AS t(lang, name)
)
INSERT INTO character_names (id, character_id, lang, name, created_at)
SELECT gen_random_uuid(), tc.id, ai.lang, ai.name, now()
FROM target_character tc
CROSS JOIN alias_input ai
ON CONFLICT (character_id, lang, name) DO NOTHING
RETURNING *;
```

### 5.7 追加角色评价记录

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name,
    '泛用'::text AS context,
    '支援/辅助'::text AS role_type,
    '待核实'::text AS power_rank,
    '先记录定位，等正式实测后再更新强度判断。'::text AS note
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
INSERT INTO character_evaluations (
  id, character_id, context, role_type, power_rank, note, created_at
)
SELECT
  gen_random_uuid(), tc.id, p.context, p.role_type, p.power_rank, p.note, now()
FROM target_character tc
CROSS JOIN params p
RETURNING *;
```

### 5.8 删除某条角色评价

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name,
    '泛用'::text AS context
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
DELETE FROM character_evaluations ce
USING target_character tc, params p
WHERE ce.character_id = tc.id
  AND ce.context = p.context
RETURNING ce.*;
```

---

## 6. 游戏版本 / 卡池 Queries

### 6.1 查询某游戏版本列表

```sql
WITH params AS (
  SELECT 'ZZZ'::text AS game_code
)
SELECT
  gv.id,
  gv.version_no,
  gv.version_name,
  gv.start_date,
  gv.note,
  gv.created_at
FROM game_versions gv
JOIN games g ON g.id = gv.game_id
CROSS JOIN params p
WHERE g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code
ORDER BY gv.start_date DESC NULLS LAST, gv.version_no DESC;
```

### 6.2 新增或更新游戏版本

```sql
WITH input AS (
  SELECT
    'ZZZ'::text AS game_code,
    '3.0'::text AS version_no,
    '某个梦游者的自白'::text AS version_name,
    '2026-06-17'::date AS start_date,
    '3.0 版本，重点关注新角色、风属性、乱流、式舆环境。'::text AS note
), target_game AS (
  SELECT g.id
  FROM games g
  JOIN input i ON g.short_code = i.game_code OR g.code = i.game_code OR g.title = i.game_code
  LIMIT 1
)
INSERT INTO game_versions (id, game_id, version_no, version_name, start_date, note, created_at)
SELECT gen_random_uuid(), tg.id, i.version_no, i.version_name, i.start_date, i.note, now()
FROM input i
CROSS JOIN target_game tg
ON CONFLICT (game_id, version_no) DO UPDATE SET
  version_name = EXCLUDED.version_name,
  start_date = EXCLUDED.start_date,
  note = EXCLUDED.note
RETURNING *;
```

### 6.3 查询版本卡池/限定角色

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '3.0'::text AS version_no
)
SELECT
  phase,
  banner_type,
  banner_character_name,
  banner_note,
  version_name,
  start_date
FROM v_version_banner_overview v
CROSS JOIN params p
WHERE
  (v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code)
  AND v.version_no = p.version_no
ORDER BY phase, banner_type, banner_character_name;
```

### 6.4 新增版本卡池角色

```sql
WITH input AS (
  SELECT
    'ZZZ'::text AS game_code,
    '3.0'::text AS version_no,
    '上半'::text AS phase,
    '限定角色'::text AS banner_type,
    '维琳娜'::text AS character_name_raw,
    'S 级限定角色，官方卡池。'::text AS note
), target_version AS (
  SELECT gv.id AS version_id, gv.game_id
  FROM game_versions gv
  JOIN games g ON g.id = gv.game_id
  JOIN input i ON
    (g.short_code = i.game_code OR g.code = i.game_code OR g.title = i.game_code)
    AND gv.version_no = i.version_no
  LIMIT 1
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN target_version tv ON tv.game_id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  JOIN input i ON c.name = i.character_name_raw OR cn.name = i.character_name_raw
  ORDER BY CASE WHEN c.name = (SELECT character_name_raw FROM input) THEN 0 ELSE 1 END
  LIMIT 1
)
INSERT INTO version_banners (
  id, version_id, phase, banner_type, character_id, character_name_raw, note, created_at
)
SELECT
  gen_random_uuid(),
  tv.version_id,
  i.phase,
  i.banner_type,
  tc.id,
  i.character_name_raw,
  i.note,
  now()
FROM input i
CROSS JOIN target_version tv
LEFT JOIN target_character tc ON true
RETURNING *;
```

### 6.5 查询某角色在哪些版本/卡池出现过

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
)
SELECT
  v.version_no,
  v.version_name,
  v.start_date,
  v.phase,
  v.banner_type,
  v.banner_character_name,
  v.banner_note
FROM v_version_banner_overview v
CROSS JOIN params p
WHERE
  (v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code)
  AND v.banner_character_name ILIKE '%' || p.character_name || '%'
ORDER BY v.start_date DESC NULLS LAST, v.version_no DESC, v.phase;
```

### 6.6 给版本挂来源链接

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '3.0'::text AS version_no
), target_version AS (
  SELECT gv.id
  FROM game_versions gv
  JOIN games g ON g.id = gv.game_id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND gv.version_no = p.version_no
  LIMIT 1
), resource_input AS (
  SELECT * FROM (VALUES
    ('官方链接'::text, '3.0 官方更新公告'::text, 'https://example.com/version/3.0'::text, '版本来源'::text, '官方'::text, '版本更新公告')
  ) AS t(resource_type, title, url, relation_type, source, note)
), upsert_resources AS (
  INSERT INTO resources (id, resource_type, title, url, note, source, created_at)
  SELECT gen_random_uuid(), resource_type, title, url, note, source, now()
  FROM resource_input
  ON CONFLICT (url) WHERE url IS NOT NULL DO UPDATE SET
    resource_type = EXCLUDED.resource_type,
    title = EXCLUDED.title,
    note = EXCLUDED.note,
    source = EXCLUDED.source
  RETURNING id, url
)
INSERT INTO resource_relations (
  id, resource_id, entity_type, entity_id, relation_type, source_sheet, source_field, created_at
)
SELECT gen_random_uuid(), ur.id, 'version', tv.id, ri.relation_type, NULL, NULL, now()
FROM upsert_resources ur
JOIN resource_input ri ON ri.url = ur.url
CROSS JOIN target_version tv
ON CONFLICT (resource_id, entity_type, entity_id, relation_type) DO NOTHING;
```

---

## 7. 配队查询 Queries

### 7.1 查询某游戏全部配队

```sql
WITH params AS (
  SELECT 'ZZZ'::text AS game_code
)
SELECT
  summary,
  party_type,
  status,
  hold_status,
  members,
  description,
  updated_at
FROM v_party_overview v
CROSS JOIN params p
WHERE v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code
ORDER BY
  CASE status
    WHEN '核心' THEN 1
    WHEN '可用' THEN 2
    WHEN '测试中' THEN 3
    WHEN '候选' THEN 4
    WHEN '归档' THEN 9
    ELSE 99
  END,
  summary;
```

### 7.2 按关键词搜索配队

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '风'::text AS keyword
)
SELECT
  summary,
  party_type,
  status,
  hold_status,
  members,
  description
FROM v_party_overview v
CROSS JOIN params p
WHERE
  (v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code)
  AND (
    v.summary ILIKE '%' || p.keyword || '%'
    OR v.party_type ILIKE '%' || p.keyword || '%'
    OR v.status ILIKE '%' || p.keyword || '%'
    OR v.hold_status ILIKE '%' || p.keyword || '%'
    OR v.description ILIKE '%' || p.keyword || '%'
    OR v.members ILIKE '%' || p.keyword || '%'
  )
ORDER BY summary;
```

### 7.3 查询包含某角色的配队

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
SELECT
  v.summary,
  v.party_type,
  v.status,
  v.hold_status,
  v.members,
  v.description
FROM v_party_overview v
JOIN party_members pm ON pm.party_id = v.party_id
JOIN target_character tc ON tc.id = pm.character_id
ORDER BY
  CASE v.status
    WHEN '核心' THEN 1
    WHEN '可用' THEN 2
    WHEN '测试中' THEN 3
    WHEN '候选' THEN 4
    WHEN '归档' THEN 9
    ELSE 99
  END,
  v.summary;
```

### 7.4 查询缺角色/缺养成的配队

```sql
WITH params AS (
  SELECT 'ZZZ'::text AS game_code
)
SELECT
  summary,
  party_type,
  status,
  hold_status,
  members,
  description
FROM v_party_overview v
CROSS JOIN params p
WHERE
  (v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code)
  AND hold_status IN ('缺角色', '缺养成', '缺研究', '未知')
ORDER BY
  CASE hold_status
    WHEN '缺角色' THEN 1
    WHEN '缺养成' THEN 2
    WHEN '缺研究' THEN 3
    WHEN '未知' THEN 4
    ELSE 99
  END,
  summary;
```

---

## 8. 配队新增 / 修改 / 删除 Queries

### 8.1 新增配队和成员

> `member_name_raw` 会保留原始名字；如果数据库里能匹配到角色，会同时写入 `character_id`。这很重要，因为以后即使角色名有别名，也能查得准。

```sql
WITH input AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜风队测试'::text AS summary,
    '风属性/乱流'::text AS party_type,
    '候选'::text AS status,
    '缺研究'::text AS hold_status,
    '用于测试 3.0 风属性/乱流环境表现。'::text AS description
), target_game AS (
  SELECT g.id
  FROM games g
  JOIN input i ON g.short_code = i.game_code OR g.code = i.game_code OR g.title = i.game_code
  LIMIT 1
), new_party AS (
  INSERT INTO parties (
    id, game_id, summary, party_type, status, hold_status, description, created_at, updated_at
  )
  SELECT
    gen_random_uuid(), tg.id, i.summary, i.party_type, i.status, i.hold_status, i.description, now(), now()
  FROM input i
  CROSS JOIN target_game tg
  RETURNING id, game_id
), member_input AS (
  SELECT * FROM (VALUES
    (1::int, '维琳娜'::text, '核心/支援'::text),
    (2::int, '角色B'::text, '输出'::text),
    (3::int, '角色C'::text, '辅助/补位'::text)
  ) AS t(slot_no, member_name_raw, member_role)
), matched_members AS (
  SELECT
    mi.slot_no,
    mi.member_name_raw,
    mi.member_role,
    mc.character_id
  FROM member_input mi
  CROSS JOIN new_party np
  LEFT JOIN LATERAL (
    SELECT c.id AS character_id
    FROM characters c
    LEFT JOIN character_names cn ON cn.character_id = c.id
    WHERE c.game_id = np.game_id
      AND (c.name = mi.member_name_raw OR cn.name = mi.member_name_raw)
    ORDER BY CASE WHEN c.name = mi.member_name_raw THEN 0 ELSE 1 END
    LIMIT 1
  ) mc ON true
)
INSERT INTO party_members (
  id, party_id, slot_no, character_id, member_name_raw, member_role, created_at
)
SELECT
  gen_random_uuid(),
  np.id,
  mm.slot_no,
  mm.character_id,
  mm.member_name_raw,
  mm.member_role,
  now()
FROM new_party np
CROSS JOIN matched_members mm
RETURNING *;
```

### 8.2 修改配队状态

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜风队测试'::text AS summary,
    '测试中'::text AS status,
    '缺养成'::text AS hold_status,
    '已开始实测，但成员养成不完整。'::text AS description
), target_party AS (
  SELECT p.id
  FROM parties p
  JOIN games g ON g.id = p.game_id
  CROSS JOIN params x
  WHERE
    (g.short_code = x.game_code OR g.code = x.game_code OR g.title = x.game_code)
    AND p.summary = x.summary
  LIMIT 1
)
UPDATE parties p
SET
  status = x.status,
  hold_status = x.hold_status,
  description = x.description,
  updated_at = now()
FROM params x, target_party tp
WHERE p.id = tp.id
RETURNING p.*;
```

### 8.3 替换配队某个位置的成员

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜风队测试'::text AS summary,
    2::int AS slot_no,
    '新角色B'::text AS new_member_name_raw,
    '输出'::text AS new_member_role
), target_party AS (
  SELECT p.id, p.game_id
  FROM parties p
  JOIN games g ON g.id = p.game_id
  CROSS JOIN params x
  WHERE
    (g.short_code = x.game_code OR g.code = x.game_code OR g.title = x.game_code)
    AND p.summary = x.summary
  LIMIT 1
), matched_character AS (
  SELECT c.id AS character_id
  FROM characters c
  LEFT JOIN character_names cn ON cn.character_id = c.id
  JOIN target_party tp ON tp.game_id = c.game_id
  CROSS JOIN params x
  WHERE c.name = x.new_member_name_raw OR cn.name = x.new_member_name_raw
  ORDER BY CASE WHEN c.name = (SELECT new_member_name_raw FROM params) THEN 0 ELSE 1 END
  LIMIT 1
)
INSERT INTO party_members (
  id, party_id, slot_no, character_id, member_name_raw, member_role, created_at
)
SELECT
  gen_random_uuid(),
  tp.id,
  x.slot_no,
  mc.character_id,
  x.new_member_name_raw,
  x.new_member_role,
  now()
FROM target_party tp
CROSS JOIN params x
LEFT JOIN matched_character mc ON true
ON CONFLICT (party_id, slot_no) DO UPDATE SET
  character_id = EXCLUDED.character_id,
  member_name_raw = EXCLUDED.member_name_raw,
  member_role = EXCLUDED.member_role
RETURNING *;
```

### 8.4 删除配队某个成员

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜风队测试'::text AS summary,
    3::int AS slot_no
), target_party AS (
  SELECT p.id
  FROM parties p
  JOIN games g ON g.id = p.game_id
  CROSS JOIN params x
  WHERE
    (g.short_code = x.game_code OR g.code = x.game_code OR g.title = x.game_code)
    AND p.summary = x.summary
  LIMIT 1
)
DELETE FROM party_members pm
USING target_party tp, params x
WHERE pm.party_id = tp.id
  AND pm.slot_no = x.slot_no
RETURNING pm.*;
```

### 8.5 删除整个配队

> 会删除配队成员和挂在配队上的资源关系，但不会删除资源本体。资源可能还被其他角色/版本使用，别一刀切。数据库也讲武德。

```sql
BEGIN;

WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜风队测试'::text AS summary
), target_party AS (
  SELECT p.id
  FROM parties p
  JOIN games g ON g.id = p.game_id
  CROSS JOIN params x
  WHERE
    (g.short_code = x.game_code OR g.code = x.game_code OR g.title = x.game_code)
    AND p.summary = x.summary
  LIMIT 1
)
DELETE FROM party_members pm
USING target_party tp
WHERE pm.party_id = tp.id;

WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜风队测试'::text AS summary
), target_party AS (
  SELECT p.id
  FROM parties p
  JOIN games g ON g.id = p.game_id
  CROSS JOIN params x
  WHERE
    (g.short_code = x.game_code OR g.code = x.game_code OR g.title = x.game_code)
    AND p.summary = x.summary
  LIMIT 1
)
DELETE FROM resource_relations rr
USING target_party tp
WHERE rr.entity_type = 'party'
  AND rr.entity_id = tp.id;

WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜风队测试'::text AS summary
), target_party AS (
  SELECT p.id
  FROM parties p
  JOIN games g ON g.id = p.game_id
  CROSS JOIN params x
  WHERE
    (g.short_code = x.game_code OR g.code = x.game_code OR g.title = x.game_code)
    AND p.summary = x.summary
  LIMIT 1
)
DELETE FROM parties p
USING target_party tp
WHERE p.id = tp.id;

COMMIT;
```

---

## 9. 机制 / 玩法研究 Queries

### 9.1 查询某游戏机制列表

```sql
WITH params AS (
  SELECT 'ZZZ'::text AS game_code
)
SELECT
  m.id,
  g.short_code,
  m.title,
  m.mechanism_type,
  m.description,
  m.note,
  m.created_at,
  m.updated_at
FROM mechanisms m
LEFT JOIN games g ON g.id = m.game_id
CROSS JOIN params p
WHERE g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code
ORDER BY m.mechanism_type, m.title;
```

### 9.2 新增或更新机制

```sql
WITH input AS (
  SELECT
    'ZZZ'::text AS game_code,
    '乱流'::text AS title,
    '深渊/环境机制'::text AS mechanism_type,
    '版本环境中影响配队和角色评价的特殊增益/规则。'::text AS description,
    '需要按版本记录，不要把单期乱流当成永久结论。'::text AS note
), target_game AS (
  SELECT g.id
  FROM games g
  JOIN input i ON g.short_code = i.game_code OR g.code = i.game_code OR g.title = i.game_code
  LIMIT 1
)
INSERT INTO mechanisms (id, game_id, title, mechanism_type, description, note, created_at, updated_at)
SELECT gen_random_uuid(), tg.id, i.title, i.mechanism_type, i.description, i.note, now(), now()
FROM input i
CROSS JOIN target_game tg
RETURNING *;
```

### 9.3 给机制挂来源链接

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '乱流'::text AS mechanism_title
), target_mechanism AS (
  SELECT m.id
  FROM mechanisms m
  JOIN games g ON g.id = m.game_id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND m.title = p.mechanism_title
  LIMIT 1
), resource_input AS (
  SELECT * FROM (VALUES
    ('官方链接'::text, '3.0 乱流官方说明'::text, 'https://example.com/mechanism/turbulence'::text, '机制来源'::text, '官方'::text, '机制说明来源')
  ) AS t(resource_type, title, url, relation_type, source, note)
), upsert_resources AS (
  INSERT INTO resources (id, resource_type, title, url, note, source, created_at)
  SELECT gen_random_uuid(), resource_type, title, url, note, source, now()
  FROM resource_input
  ON CONFLICT (url) WHERE url IS NOT NULL DO UPDATE SET
    resource_type = EXCLUDED.resource_type,
    title = EXCLUDED.title,
    note = EXCLUDED.note,
    source = EXCLUDED.source
  RETURNING id, url
)
INSERT INTO resource_relations (
  id, resource_id, entity_type, entity_id, relation_type, source_sheet, source_field, created_at
)
SELECT gen_random_uuid(), ur.id, 'mechanism', tm.id, ri.relation_type, NULL, NULL, now()
FROM upsert_resources ur
JOIN resource_input ri ON ri.url = ur.url
CROSS JOIN target_mechanism tm
ON CONFLICT (resource_id, entity_type, entity_id, relation_type) DO NOTHING;
```

---

## 10. 资源库 Queries

### 10.1 查询全部资源

```sql
SELECT
  resource_type,
  title,
  url,
  source,
  note,
  created_at
FROM resources
ORDER BY created_at DESC;
```

### 10.2 按关键词搜索资源

```sql
WITH params AS (
  SELECT '维琳娜'::text AS keyword
)
SELECT
  resource_type,
  title,
  url,
  source,
  note,
  created_at
FROM resources r
CROSS JOIN params p
WHERE
  r.title ILIKE '%' || p.keyword || '%'
  OR r.url ILIKE '%' || p.keyword || '%'
  OR r.note ILIKE '%' || p.keyword || '%'
  OR r.source ILIKE '%' || p.keyword || '%'
ORDER BY created_at DESC;
```

### 10.3 查询某个资源被挂在哪些对象上

```sql
WITH params AS (
  SELECT 'https://example.com/research/velina'::text AS url
)
SELECT
  r.title,
  r.url,
  rr.entity_type,
  rr.entity_id,
  rr.relation_type,
  rr.source_sheet,
  rr.source_field,
  rr.created_at
FROM resources r
JOIN resource_relations rr ON rr.resource_id = r.id
CROSS JOIN params p
WHERE r.url = p.url
ORDER BY rr.entity_type, rr.relation_type;
```

### 10.4 删除某个资源和它的所有关系

> 谨慎使用。确认这个 URL 真的是废弃链接再删。

```sql
BEGIN;

WITH params AS (
  SELECT 'https://example.com/research/velina'::text AS url
), target_resource AS (
  SELECT id FROM resources r CROSS JOIN params p WHERE r.url = p.url
)
DELETE FROM resource_relations rr
USING target_resource tr
WHERE rr.resource_id = tr.id;

WITH params AS (
  SELECT 'https://example.com/research/velina'::text AS url
)
DELETE FROM resources r
USING params p
WHERE r.url = p.url
RETURNING r.*;

COMMIT;
```

---

## 11. Dashboard / 自检 Queries

### 11.1 每个游戏的角色数量、研究完成数量、养成数量

```sql
SELECT
  g.short_code,
  g.title,
  count(c.id) AS character_count,
  count(*) FILTER (WHERE cp.research_status = '已完成') AS research_done_count,
  count(*) FILTER (WHERE cp.research_status IN ('未开始', '资料收集', '阅读中', '实测中', '待写稿')) AS research_todo_count,
  count(*) FILTER (WHERE cp.build_status IN ('可用', '已毕业')) AS build_ready_count,
  count(*) FILTER (WHERE cp.build_status IN ('未拥有', '未养成', '养成中')) AS build_todo_count
FROM games g
LEFT JOIN characters c ON c.game_id = g.id
LEFT JOIN character_progress cp ON cp.character_id = c.id
GROUP BY g.short_code, g.title
ORDER BY g.short_code;
```

### 11.2 每个游戏的配队数量和状态分布

```sql
SELECT
  g.short_code,
  g.title,
  count(p.id) AS party_count,
  count(*) FILTER (WHERE p.status = '核心') AS core_count,
  count(*) FILTER (WHERE p.status = '可用') AS usable_count,
  count(*) FILTER (WHERE p.status = '测试中') AS testing_count,
  count(*) FILTER (WHERE p.status = '候选') AS candidate_count,
  count(*) FILTER (WHERE p.status = '归档') AS archived_count
FROM games g
LEFT JOIN parties p ON p.game_id = g.id
GROUP BY g.short_code, g.title
ORDER BY g.short_code;
```

### 11.3 查询没有进度记录的角色

```sql
SELECT
  g.short_code,
  c.name,
  c.element,
  c.profession,
  c.rarity,
  c.created_at
FROM characters c
JOIN games g ON g.id = c.game_id
LEFT JOIN character_progress cp ON cp.character_id = c.id
WHERE cp.character_id IS NULL
ORDER BY g.short_code, c.name;
```

### 11.4 查询没有任何资源链接的角色

```sql
SELECT
  g.short_code,
  c.name,
  c.element,
  c.profession,
  c.rarity
FROM characters c
JOIN games g ON g.id = c.game_id
LEFT JOIN resource_relations rr
  ON rr.entity_type = 'character'
  AND rr.entity_id = c.id
WHERE rr.id IS NULL
ORDER BY g.short_code, c.name;
```

### 11.5 查询没有匹配到 character_id 的配队成员

```sql
SELECT
  g.short_code,
  p.summary,
  pm.slot_no,
  pm.member_name_raw,
  pm.member_role
FROM party_members pm
JOIN parties p ON p.id = pm.party_id
JOIN games g ON g.id = p.game_id
WHERE pm.character_id IS NULL
ORDER BY g.short_code, p.summary, pm.slot_no;
```

### 11.6 尝试自动修复配队成员 character_id

> 根据 `member_name_raw` 去 `characters.name` 和 `character_names.name` 匹配。适合导入旧数据后跑一遍。

```sql
WITH candidates AS (
  SELECT
    pm.id AS party_member_id,
    c.id AS character_id,
    row_number() OVER (
      PARTITION BY pm.id
      ORDER BY CASE WHEN c.name = pm.member_name_raw THEN 0 ELSE 1 END
    ) AS rn
  FROM party_members pm
  JOIN parties p ON p.id = pm.party_id
  JOIN characters c ON c.game_id = p.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  WHERE pm.character_id IS NULL
    AND (c.name = pm.member_name_raw OR cn.name = pm.member_name_raw)
)
UPDATE party_members pm
SET character_id = c.character_id
FROM candidates c
WHERE pm.id = c.party_member_id
  AND c.rn = 1
RETURNING pm.*;
```

### 11.7 查询疑似重复角色

```sql
SELECT
  g.short_code,
  c.name,
  count(*) AS duplicate_count,
  array_agg(c.id) AS character_ids
FROM characters c
JOIN games g ON g.id = c.game_id
GROUP BY g.short_code, c.name
HAVING count(*) > 1
ORDER BY g.short_code, c.name;
```

### 11.8 查询疑似重复资源 URL

```sql
SELECT
  url,
  count(*) AS duplicate_count,
  array_agg(id) AS resource_ids
FROM resources
WHERE url IS NOT NULL AND url <> ''
GROUP BY url
HAVING count(*) > 1
ORDER BY duplicate_count DESC, url;
```

---

## 12. 删除角色：谨慎操作

> 删除角色会影响：别名、进度、评价、配队成员、卡池、资源关系。一般更推荐把角色备注改成 `归档/误录入`，不要直接删。真要删，用事务。

### 12.1 安全查看角色关联数据

```sql
WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
SELECT 'character_names' AS table_name, count(*) FROM character_names cn JOIN target_character tc ON cn.character_id = tc.id
UNION ALL
SELECT 'character_progress', count(*) FROM character_progress cp JOIN target_character tc ON cp.character_id = tc.id
UNION ALL
SELECT 'character_evaluations', count(*) FROM character_evaluations ce JOIN target_character tc ON ce.character_id = tc.id
UNION ALL
SELECT 'party_members', count(*) FROM party_members pm JOIN target_character tc ON pm.character_id = tc.id
UNION ALL
SELECT 'version_banners', count(*) FROM version_banners vb JOIN target_character tc ON vb.character_id = tc.id
UNION ALL
SELECT 'resource_relations', count(*) FROM resource_relations rr JOIN target_character tc ON rr.entity_type = 'character' AND rr.entity_id = tc.id;
```

### 12.2 删除角色，但保留配队成员原始名

> 这个版本会把 `party_members.character_id` 置空，但保留 `member_name_raw`。这样历史配队不会直接炸。

```sql
BEGIN;

WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
UPDATE party_members pm
SET character_id = NULL
FROM target_character tc
WHERE pm.character_id = tc.id;

WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
UPDATE version_banners vb
SET character_id = NULL
FROM target_character tc
WHERE vb.character_id = tc.id;

WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
DELETE FROM resource_relations rr
USING target_character tc
WHERE rr.entity_type = 'character'
  AND rr.entity_id = tc.id;

WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
DELETE FROM character_evaluations ce
USING target_character tc
WHERE ce.character_id = tc.id;

WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
DELETE FROM character_progress cp
USING target_character tc
WHERE cp.character_id = tc.id;

WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
DELETE FROM character_names cn
USING target_character tc
WHERE cn.character_id = tc.id;

WITH params AS (
  SELECT
    'ZZZ'::text AS game_code,
    '维琳娜'::text AS character_name
), target_character AS (
  SELECT c.id
  FROM characters c
  JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE
    (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  ORDER BY CASE WHEN c.name = p.character_name THEN 0 ELSE 1 END
  LIMIT 1
)
DELETE FROM characters c
USING target_character tc
WHERE c.id = tc.id;

COMMIT;
```

---

## 13. 每周/每次维护推荐流程

### 13.1 新版本来了

建议顺序：

1. 跑 `6.2 新增或更新游戏版本`
2. 跑 `5.1 新增或更新角色`
3. 跑 `5.2 新增角色资源链接`
4. 跑 `6.4 新增版本卡池角色`
5. 跑 `9.2 新增或更新机制`
6. 跑 `11.1 / 11.2 Dashboard` 看整体状态

### 13.2 新角色来了

建议顺序：

1. 跑 `5.1 一次性新增或更新角色基础信息、别名、进度、评价`
2. 跑 `5.2 新增角色资源链接`
3. 如果有版本卡池，跑 `6.4 新增版本卡池角色`
4. 如果要测试配队，跑 `8.1 新增配队和成员`
5. 跑 `4.1 按角色名查询角色总览` 检查结果

### 13.3 新配队想法来了

建议顺序：

1. 确认角色是否都已存在：跑 `4.1`
2. 新增配队：跑 `8.1`
3. 如果成员没匹配到，跑 `11.5` 检查
4. 自动修复：跑 `11.6`
5. 测试后更新状态：跑 `8.2`

### 13.4 想做视频/攻略选题

建议查询：

1. `4.3 查询需要研究的角色`
2. `4.5 查询高优先级角色`
3. `7.4 查询缺角色/缺养成的配队`
4. `6.3 查询版本卡池/限定角色`
5. `10.2 按关键词搜索资源`

---

## 14. 常见问题

### Q1. 为什么很多 SQL 都要写 `game_code`？

因为不同游戏可能有同名角色。只用角色名查，迟早会撞车。现在多写一个游戏条件，未来少掉一堆坑。

### Q2. `character_id` 和 `member_name_raw` 为什么都要存？

`character_id` 是稳定关系，适合 JOIN；`member_name_raw` 是原始输入，适合保留导入痕迹。一个管数据库秩序，一个管人类记忆。两手都要硬。

### Q3. 官方链接和先行研究链接放哪里？

统一放 `resources`，再用 `resource_relations` 挂到角色、版本、配队或机制。不要把 URL 到处塞进各个表，不然后期会很难维护。

### Q4. 如果 `ON CONFLICT` 报错怎么办？

通常是没有对应唯一索引。先跑第 1 章里的推荐唯一索引。尤其是：

- `characters(game_id, name)`
- `game_versions(game_id, version_no)`
- `party_members(party_id, slot_no)`
- `resources(url) WHERE url IS NOT NULL`
- `resource_relations(resource_id, entity_type, entity_id, relation_type)`

### Q5. 能不能直接删除角色？

能，但不推荐。角色被配队、版本卡池、资源链接引用时，直接删很容易制造孤儿数据。除非是误录入，否则更推荐改备注或状态。

---

## 15. 最小速查版

### 查角色

```sql
WITH params AS (SELECT 'ZZZ'::text AS game_code, '维琳娜'::text AS keyword)
SELECT *
FROM v_character_overview v
CROSS JOIN params p
WHERE (v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code)
  AND v.character_name ILIKE '%' || p.keyword || '%';
```

### 改角色进度

```sql
WITH params AS (
  SELECT 'ZZZ'::text AS game_code, '维琳娜'::text AS character_name,
         '实测中'::text AS research_status, '养成中'::text AS build_status,
         'S'::text AS like_level, '开始实测。'::text AS research_note
), target_character AS (
  SELECT c.id
  FROM characters c JOIN games g ON g.id = c.game_id
  LEFT JOIN character_names cn ON cn.character_id = c.id
  CROSS JOIN params p
  WHERE (g.short_code = p.game_code OR g.code = p.game_code OR g.title = p.game_code)
    AND (c.name = p.character_name OR cn.name = p.character_name)
  LIMIT 1
)
INSERT INTO character_progress (character_id, research_status, build_status, like_level, research_note, created_at, updated_at)
SELECT tc.id, p.research_status, p.build_status, p.like_level, p.research_note, now(), now()
FROM target_character tc CROSS JOIN params p
ON CONFLICT (character_id) DO UPDATE SET
  research_status = EXCLUDED.research_status,
  build_status = EXCLUDED.build_status,
  like_level = EXCLUDED.like_level,
  research_note = EXCLUDED.research_note,
  updated_at = now();
```

### 查配队

```sql
WITH params AS (SELECT 'ZZZ'::text AS game_code)
SELECT *
FROM v_party_overview v
CROSS JOIN params p
WHERE v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code
ORDER BY status, summary;
```

### 查版本卡池

```sql
WITH params AS (SELECT 'ZZZ'::text AS game_code, '3.0'::text AS version_no)
SELECT *
FROM v_version_banner_overview v
CROSS JOIN params p
WHERE (v.game_short_code = p.game_code OR v.game_code = p.game_code OR v.game_title = p.game_code)
  AND v.version_no = p.version_no
ORDER BY phase, banner_type;
```

