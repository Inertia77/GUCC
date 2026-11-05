# GUCC 查询与 SQL 维护手册

> **生产核验：2026-11-05（JST）**。依据生产 Supabase `rubjeqnuxuvupjwyksmo` 的只读结构核验，并对照 `gameup-api` 与 Creator OS v4。本文适合排查与定点维护，不是首次部署脚本。
> **日常操作优先使用 GUCC 数据库及 Creator OS 的页面。** Supabase SQL Editor 权限较高，写入前必须确认目标行和约束；不得把本手册当作自动批量执行脚本。

## 1. 先认清三套不同状态

| 领域 | 字段 / 表 | 当前合法语义 |
| --- | --- | --- |
| 游戏创作关注度 | `game_status.content_tier` | 创作级 / 兴趣级 / 观察级 / 浅尝级 / 抛弃级 |
| 游戏游玩优先级 | `game_play_policies.play_tier` | 1 = T1 核心玩；2 = T2 次要玩；3 = T3 有余力再玩 |
| 游戏剧情关注 | `game_play_policies.story_focus` | 独立布尔标记，**与游玩优先级交叉** |
| 角色研究 | `character_progress.research_status` | ◯ / △ / ✕ / 対象外 |
| 角色养成 | `character_progress.build_status` | ◯ / △ / ✕ / 対象外 |
| 角色喜好度 / 强度评价 | `character_evaluations.like_level` / `power_rank` | 喜好度与角色进度分表存储 |
| 视频成果 | `creator_deliverable_records` | 按 `project_id + video_id + deliverable_key` 独立存储，需人工确认 |
| 发布草稿与实绩 | `creator_os_publish_drafts` / `creator_publications` | 草稿不等于已发布；真实发布需人工确认 |

旧说明中的 `character_progress.like_level`、`research_note`、`已完成`、`未养成` 与卡池 `上半`、`限定角色` 等示例不适配现有字段或枚举，请勿沿用。

## 2. 只读巡检：可以直接在 SQL Editor 执行

### 2.1 列出当前六游与创作关注状态

~~~sql
select g.id, g.short_code, g.title,
       gs.content_tier, gs.output_enabled, gs.research_depth,
       gs.login_frequency, gs.info_attention
from public.games g
left join public.game_status gs on gs.game_id = g.id
order by g.short_code;
~~~

**注意**：`games.short_code` 为数据库内的短代码，现行数据主要使用 `崩 / 绝 / 鸣 / 终 / 异 / 阴`，不能假设等于 `ZZZ` 或 `HSR`。筛选时可使用准确的 `games.title` 或主键 `id`。

### 2.2 游玩 T1/T2/T3 + 剧情重点

~~~sql
select game_key, game_name, game_id, play_tier,
       story_focus, game_kind, routine_policy,
       limited_event_policy, sort_order, effective_on
from public.game_play_policies
order by play_tier, sort_order, game_name;
~~~

`game_play_policies` 和 `game_status` 是两条独立维度，不要在 SQL 中把 T1/T2/T3 写回 `content_tier`。

### 2.3 按游戏查角色（按上线日期倒序）

~~~sql
select g.title as game, c.id as character_id,
       c.name, c.full_name, c.release_date,
       c.element, c.profession, c.rarity,
       cp.research_status, cp.build_status, cp.progress_note
from public.characters c
join public.games g on g.id = c.game_id
left join public.character_progress cp on cp.character_id = c.id
where g.title = '绝区零'
order by c.release_date desc nulls last, c.name;
~~~

### 2.4 按角色名字 / 多语言别名检索

~~~sql
select distinct c.id, g.title as game,
       c.name, c.full_name, c.release_date
from public.characters c
join public.games g on g.id = c.game_id
left join public.character_names cn on cn.character_id = c.id
where c.name ilike '%关键字%'
   or c.full_name ilike '%关键字%'
   or cn.name ilike '%关键字%'
order by c.release_date desc nulls last, c.name;
~~~

多语言 `character_names.lang` 当前约束为 `zh / en / jp / kr`，日文是 `jp`，不是 `ja`。

### 2.5 查尚未完成研究或养成的角色

~~~sql
select g.title as game, c.name, c.release_date,
       cp.research_status, cp.build_status
from public.characters c
join public.games g on g.id = c.game_id
join public.character_progress cp on cp.character_id = c.id
where cp.research_status in ('△', '✕')
   or cp.build_status in ('△', '✕')
order by g.title, c.release_date desc nulls last;
~~~

`対象外` 并非待办；它表示明确不纳入该项追踪。是否需要过滤 `△` 应按个人实际含义判断。

### 2.6 查角色强度与喜好度

~~~sql
select g.title as game, c.name, ce.context, ce.role_type,
       ce.power_rank, ce.like_level, ce.note, ce.updated_at
from public.character_evaluations ce
join public.characters c on c.id = ce.character_id
join public.games g on g.id = c.game_id
where g.title = '绝区零'
order by ce.updated_at desc;
~~~

### 2.7 查配队及角色成员

~~~sql
select g.title as game, p.id as party_id, p.summary,
       p.status, p.hold_status, p.party_type,
       string_agg(pm.slot_no::text || '. ' ||
         coalesce(c.name, pm.member_name_raw), ' / '
         order by pm.slot_no) as members
from public.parties p
join public.games g on g.id = p.game_id
left join public.party_members pm on pm.party_id = p.id
left join public.characters c on c.id = pm.character_id
where g.title = '绝区零'
group by g.title, p.id, p.summary, p.status, p.hold_status, p.party_type
order by p.summary;
~~~

`parties.hold_status` 目前是 `YES / NO`，不是旧手册的 `已持有` 或 `未确认`。

### 2.8 查版本、卡池和其他获取方式

~~~sql
select g.title as game, v.version_no, v.version_name,
       v.start_date, v.end_date,
       b.phase, b.banner_type, b.pool_type, b.entry_role,
       b.character_name_raw, b.start_at, b.end_at
from public.game_versions v
join public.games g on g.id = v.game_id
left join public.version_banners b on b.version_id = v.id
where g.title = '绝区零'
order by v.start_date desc nulls last, b.start_at desc nulls last;
~~~

~~~sql
select g.title as game, v.version_no, a.acquisition_type,
       a.character_name_raw, a.start_at, a.end_at, a.note
from public.version_acquisitions a
join public.game_versions v on v.id = a.version_id
join public.games g on g.id = v.game_id
where g.title = '绝区零'
order by a.start_at desc nulls last;
~~~

日期未知时保持 `NULL`；不得将“版本开始日期”当成“卡池结束时刻”。

### 2.9 查资料来源及关联

~~~sql
select r.id, r.title, r.url, r.resource_type,
       r.source_host, r.source_authority, r.ingested_via,
       rr.entity_type, rr.entity_id, rr.relation_type
from public.resources r
left join public.resource_relations rr on rr.resource_id = r.id
where r.title ilike '%关键字%'
order by r.updated_at desc nulls last;
~~~

### 2.10 查项目、视频与六项成果

~~~sql
select project_id, name, game, topic, current_state,
       target_publish_date, archived_at, revision, updated_at
from public.creator_projects
order by updated_at desc;
~~~

~~~sql
select v.project_id, v.video_id, v.title,
       d.deliverable_key, d.status, d.revision,
       d.reviewed_at, d.review_note
from public.creator_video_workspaces v
left join public.creator_deliverable_records d
  on d.project_id = v.project_id and d.video_id = v.video_id
order by v.updated_at desc, v.video_id, d.deliverable_key;
~~~

**注意**：项目 `archived_at` 与实际视频成果的完成状态是不同概念；项目首页只展示进行中的项目，但历史记录仍可维护。

### 2.11 发布草稿、已登记发布与复盘

~~~sql
select project_id, video_id, revision, updated_at
from public.creator_os_publish_drafts
order by updated_at desc;
~~~

~~~sql
select project_id, video_id, publication_id,
       channel_id, status, post_url, published_at,
       final_publish_confirmed_at
from public.creator_publications
order by updated_at desc;
~~~

`creator_publish_packages` 是发布包与 QA 边界；`creator_publications` 是发布实例，`creator_publication_metric_snapshots` 是表现快照。不能把有草稿或发布包当作已发布。

## 3. 定点修改（高风险：默认回滚）

以下唯一写入示例仅用于说明 **先校验目标 ID → 单行更新 → 回读 → 人工确认提交**。默认 `ROLLBACK`，不会保留修改。要保存请在验证后主动把最后一行改为 `COMMIT`。绝不要先删除或全表覆盖。

### 3.1 校准一位角色的四档状态

~~~sql
begin;

-- 先在 2.3/2.4 查到准确的 character_id。
update public.character_progress
set research_status = '✕',
    build_status = '✕',
    updated_at = now()
where character_id = 'REPLACE_WITH_CHARACTER_UUID'::uuid
returning character_id, research_status, build_status,
          progress_note, updated_at;

rollback;
~~~

未命中任何记录时返回零行：不要直接改为无条件 `INSERT`；先核查角色主键及进度记录。新增角色的默认研究与养成状态按当前业务规则为 `✕ / ✕`，通过现行 GUCC 创建流程处理。

### 3.2 只改单条备注，不碰评价/研究状态

~~~sql
begin;

update public.character_progress
set progress_note = '需要核对的新备注',
    updated_at = now()
where character_id = 'REPLACE_WITH_CHARACTER_UUID'::uuid
returning character_id, research_status, build_status, progress_note;

rollback;
~~~

## 4. 检查真实 Schema（不要用 8 月导出替代）

~~~sql
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
~~~

~~~sql
select table_name
from information_schema.views
where table_schema = 'public'
order by table_name;
~~~

当前生产核验：**46 张 public 基础表、4 个 public 视图**（包含历史备份表）。确切结构以当前生产只读检查和 `supabase/migrations/` 为准。

## 5. 文档与 API 边界

- **正常 GUCC 数据库功能**：`apps/command-center/` → Supabase Auth → `gameup-api` → PostgreSQL `app_*` RPC。真实 `action` 与映射见 `supabase/functions/gameup-api/index.ts`。
- **Creator OS**：`apps/video-workspace/production-system/`，涉及 `creator-project-api`、项目/视频/发布/素材/复盘多张表；不要绕开版本号和人工确认直接改表推进业务状态。
- **数据库变更**：优先新增可审查的 `supabase/migrations/`，与前端/API 同步测试。不要直接复制过期的安装与清重脚本到生产。
- **系统部署和排错**：[系统指南](../../docs/supabase-setup.html)；**全表结构**：[数据结构说明](../../data/schema.md)。

最后校准：2026-11-05 JST；资料来源为当日生产 Schema 只读查询及当前 GitHub `main`。