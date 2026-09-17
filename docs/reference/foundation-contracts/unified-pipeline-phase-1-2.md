# GUCC Creator OS｜Unified Production Pipeline

这份文档记录 GUCC Creator OS 在 **Phase 1.2 — Simplify Creator Model** 之后的正式模型，以及后续已经落地的 Local-first / Identity Foundation 必须遵守的边界。

## 一句话原则

**一个 Creator Project + 一条 Production Workflow + 少量可选 Capability。**

用户不需要先判断视频属于攻略、机制、音乐、剧情、实战还是未来某一种内容类型。内容形式可以无限扩展，但正式制作状态机保持稳定。

长期存储职责固定为：

- **Local-first Production**：真实视频、音频、录屏、剪辑工程和大型素材在本地制作与使用。
- **Supabase Cloud State / History / Identity**：项目状态、Revision、Locks、Language Track / Distribution Identity、Artifact Metadata、Publish State 与历史。
- **Google Drive Lightweight Project Archive**：只归档 Markdown / JSON / SRT / CSV / TXT / VTT 等轻量项目知识文件；不归档大型媒体。
- **百度云**：最终需要长期保存的大文件由用户自行归档，GUCC 不开发百度云自动上传。

## 1. Creator Project

新建项目只需要：

- Title / 项目名称
- Game
- Target Publish Date
- Topic / 核心主题
- Notes

用户界面不再显示或要求选择：

- `A_FULL_GUIDE`
- `B_SUNO_VIDEO`
- `C_GAME_SYSTEM`
- `D_MUSIC_RELEASE`

新项目内部使用 `STANDARD_VIDEO`。旧 A/B/C/D 仍可读取，并保留为 Legacy Metadata，但不得再决定 Workflow、Progress、Action Queue 或 Artifact 要求。

## 2. GUCC Studio：想清楚

Studio 负责仍可能变化的创作工作：

- 选题与观众
- 事前学习
- 官方资料与社区问题
- AI 分析
- 结构草稿
- 早期脚本与素材方向

Studio 不再猜测 A/B/C/D Project Type。

### Workspace Identity

每一个真实 Studio Draft 都拥有自己的：

- `workspaceInstanceId`
- `creatorProjectId`

规则：

- 同一个 Draft 继续编辑 → 保持同一个 `creatorProjectId`。
- 同一个 Draft 重复“转入正式制作” → 保持同一个 `creatorProjectId`。
- 真正新建空白 Workspace → 自动生成新的 Workspace / Project Identity。
- 导出后再次导入同一 Workspace → 可恢复原 Identity。
- 旧浏览器 key `gucc_creator_studio_project_id_v1` 仅作为迁移兼容，不再是唯一真相源。
- “复制为新项目”才显式创建新的 Creator Project ID。

Studio → Production 只负责把当前创作项目交给统一 Creator Project，不判断内容类型。

## 3. Production System：唯一正式状态机

所有 Creator Video Project 共用：

```text
IDEA
→ PLANNING
→ RESEARCHING
→ RESEARCH_LOCKED
→ CONTENT_LOCKED
→ SCRIPTING
→ SCRIPT_LOCKED
→ PRE_ASSET_PREPARATION
→ AUDIO_PRODUCTION
→ AUDIO_LOCKED
→ TIMELINE_GENERATION
→ TIMELINE_LOCKED
→ STORYBOARDING
→ ASSET_COMPLETION
→ PRODUCTION_READY
→ CODEX_BUILD
→ REVIEW
→ REVISION
→ FINE_EDIT
→ PICTURE_LOCKED
→ RELEASE_READY
→ PUBLISHED
→ ARCHIVED
```

不再存在按 Project Type 选择的 B Flow / D Flow。

### 人工确认边界

以下 Gate 不能被自动化越过：

- Content Lock
- Script Lock
- Audio Lock
- Picture Lock
- Final Publish

Research Lock 继续保持现有安全边界。

### Globalization Identity Compatibility

WP_GLOB_001 / WP_GLOB_002 只扩展身份层，不扩展这条顶级状态机：

```text
Content Project Root
  ├─ Language Track(s)
  ├─ Distribution Variant(s)
  ├─ Channel / Publication identities
  └─ scoped Logical Artifacts
```

Language Track 不是新的 Creator Project，也不会自动生成新的顶级 `SCRIPTING / AUDIO_LOCKED / TIMELINE_LOCKED` 状态。当前 Project-level Production flow 继续作为 Legacy/default compatibility path。

## 4. Audio Production：Voice + Optional Music + Optional SFX

Music 不再拥有顶级 `MUSIC_DRAFT` / `MUSIC_LOCKED` 状态，也不再拥有顶级 Music Lock。

正式路径：

```text
Voice
+
Optional Music
+
Optional SFX
↓
AUDIO_MASTER
↓
人工确认 Audio Lock
↓
Timeline
```

### Music Mode

#### Skip

完全不使用音乐。

`LYRICS`、`SUNO_PROMPT`、`MUSIC_MASTER`、`INSTRUMENTAL` 不参与缺失判断，也不能让项目 Blocked / Attention。

#### Existing

允许记录已有音乐的：

- Track Name
- Source
- Music Notes
- 本地 `MUSIC_MASTER` 文件信息

真实音乐文件仍属于本地 Production Asset。

#### Generate

展开音乐生成子功能：

- Suno Prompt
- Lyrics（需要时）
- Candidate Versions
- Selected Music / Version
- Music Notes

这些都是 `AUDIO_PRODUCTION` 内部 Capability，不改变顶级状态机。

## 5. Legacy Compatibility

旧项目绝不因为 Phase 1.2 被 reset 到 `IDEA`。

Legacy State Normalize：

```text
MUSIC_DRAFT
→ AUDIO_PRODUCTION

MUSIC_LOCKED
→ AUDIO_PRODUCTION
```

只有同时存在：

- 真实 `AUDIO_MASTER`
- 已确认 `audioLock`

旧 `MUSIC_LOCKED` 才可以安全映射到 `AUDIO_LOCKED`。

旧 Music Lock 本身不能冒充 Audio Lock。

Production Supabase Schema 继续保留 `project_type`，并允许：

```text
A_FULL_GUIDE
B_SUNO_VIDEO
C_GAME_SYSTEM
D_MUSIC_RELEASE
STANDARD_VIDEO
```

旧值不迁移、不删除；新项目可原生保存 `STANDARD_VIDEO`。

## 6. Supabase：Cloud State / History / Identity

Creator Project 云端层继续使用：

- `creator_projects`：Content Project Root、完整 `project_data`、Revision、当前顶级状态。
- `creator_language_tracks`：一个 Content Project 下的 Language Track identity；不是独立 Creator Project。
- `creator_project_files`：Logical Artifact Metadata / provider pointer，并通过 `artifact_scope_type + artifact_scope_id` 区分 Project / Language Track 等 scope。
- `creator_project_events`：项目创建、状态变化、Lock 变化、同步历史。
- `creator_project_releases`：Legacy Publish Console 的发布状态、作品 URL / ID 与数据快照。
- `creator_variants` / `creator_channels` / `creator_publications`：Distribution Identity Foundation；当前 Publish Console 不依赖这些新身份表。

`creator_project_files` 当前兼容规则：

```text
Legacy/default Project artifact
artifact_scope_type = project
artifact_scope_id   = creatorProjectId

Language Track artifact
artifact_scope_type = language_track
artifact_scope_id   = language_track_id
```

同一个 `file_key`（例如 `AUDIO_MASTER` / `SUBTITLE_MASTER`）可以在不同 scope 下共存；不得用 `AUDIO_MASTER_JA`、`SUBTITLE_MASTER_EN` 之类后缀模拟 scope。

前端统一调用：

```text
supabase/functions/creator-project-api
```

Phase 1.1 已建立并继续保留：

- Revision-based optimistic concurrency
- revision=0 Bootstrap Conflict Protection
- Stable / Canonical JSON Equality
- false `LOCKS_CHANGED` suppression
- Project Health 与 Next Requirements 分离
- Project ID deep link

WP_GLOB_002 保持 Legacy API compatibility：当前 Dashboard / file observation 的默认 `files` projection 仍只读取 Project scope；Language Track / child scoped artifacts 作为 additive identity data 暴露，不替换现有 Project files contract。

## 7. Creator Dashboard

Dashboard 卡片面向用户只强调：

- Title
- Game
- Topic
- Current State
- Progress
- Health
- Locks
- Deadline
- Next Action
- Next Requirements

Dashboard 不显示 A/B/C/D Label。

所有 Legacy Project Type 使用同一套 Production Flow 计算 Progress 与 Action Queue。

WP_GLOB_002 不在 Dashboard 增加多语言制作流程 UI；默认 artifact health / observation 继续以 Project scope 为兼容基线。

## 8. Publish Console

Production 与 Publish Console 始终通过同一个 `creatorProjectId` 连接。

Publish Console 继续负责：

1. 读取 `RELEASE_PACK`。
2. 映射六个平台字段。
3. 准备发布资料。
4. 保存发布状态、作品 URL / ID 与数据快照。
5. 把最终公开发布动作留给用户确认。

发布包固定合同保持不变：

```text
## B站
## 抖音
## 小红书视频
## 微信视频号
## YouTube 简体中文
## TikTok 简体中文
```

Distribution Variant / Channel / Publication identity 已存在，但 WP_GLOB_002 不重构当前 Publish Console，也不实现 YouTube Multi-Audio、TikTok 多账号自动发布或新的 Channel routing UI。

## 9. 当前 Source of Truth

| 内容 | 当前 Source of Truth |
|---|---|
| GUCC 程序、Prompt、Creator Constitution | GitHub |
| Content Project State、Locks、Revision、结构化 JSON | Supabase `creator_projects` |
| Language Track Identity | Supabase `creator_language_tracks` |
| Logical Artifact Metadata + Scope | Supabase `creator_project_files` |
| State / Lock History | Supabase `creator_project_events` |
| Distribution Variant / Channel / Publication Identity | Supabase `creator_variants` / `creator_channels` / `creator_publications` |
| Legacy Publish State / URL / Metrics Snapshot | Supabase `creator_project_releases` |
| 真实视频、音频、录屏、剪辑工程、大型素材 | 本地 |
| Studio / Production 离线工作缓存 | 浏览器 localStorage |
| Lightweight Project Archive | Google Drive |

Google Drive Lightweight Project Archive 已实现；它只保存轻量项目知识文件，不接管真实视频、音频、游戏录屏、剪辑工程等大型文件。

## 10. 当前日常使用

```text
Studio 或 Production 新建 Creator Project
→ 填 Title / Game / Date / Topic / Notes
→ 按唯一 Production Workflow 推进
→ Content Lock
→ Script Lock
→ Audio Production
   ├─ Music Skip
   ├─ Existing
   └─ Generate
→ 导出真实 AUDIO_MASTER
→ Audio Lock
→ Timeline / Subtitle Alignment
→ Storyboard
→ Asset Completion
→ Codex Build
→ Review / Revision / Fine Edit
→ Picture Lock
→ Release Ready
→ Publish Console
→ 用户最终确认发布
→ Published / Archived
```

当前 multilingual identity foundation 不改变这套日常操作。除非后续独立 WP 明确实现，否则不要引入 `02_SCRIPT/ZH`、`03_AUDIO/JA`、`04_SUBTITLES/EN` 等语言目录，也不要自动产生 Language Track child locks / child workflow。

## 11. 已落地 Foundation 与后续方向

Local-first Foundation 已建立：

1. Device Identity / Workspace Root。
2. Logical Artifact 与 Physical File Location 分离。
3. 本地 Production Asset Registry / observation。
4. Supabase 只同步状态、历史、Identity 和 Artifact Metadata，不上传大型真实文件。
5. Google Drive Lightweight Project Archive。

Globalization identity foundation 当前已建立：

1. Content Project Root。
2. Distribution Variant / Channel / Publication identity。
3. Language Track identity。
4. Scoped Logical Artifact identity（Project / Language Track 已实现；Visual Master / Variant scope 名称保留给后续独立 WP）。

仍属于后续独立 Work Package 的内容包括：

- multilingual Production UI / child workflow / child locks，
- translation / dubbing / ASR，
- Visual Master identity + timeline，
- Variant rendering，
- YouTube Multi-Audio / TikTok globalization execution，
- analytics / learning loop。

最终原则不变：

> 用户负责创作判断。GUCC 负责记忆、流程、状态与机械劳动。系统应该越来越简单，而不是越来越像 ERP。
