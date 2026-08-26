# GUCC Creator OS｜Unified Production Pipeline

这份文档记录 GUCC Creator OS 在 **Phase 1.2 — Simplify Creator Model** 之后的正式模型，以及后续 Local-first Foundation 必须遵守的边界。

## 一句话原则

**一个 Creator Project + 一条 Production Workflow + 少量可选 Capability。**

用户不需要先判断视频属于攻略、机制、音乐、剧情、实战还是未来某一种内容类型。内容形式可以无限扩展，但正式制作状态机保持稳定。

长期存储职责固定为：

- **Local-first Production**：真实视频、音频、录屏、剪辑工程和大型素材在本地制作与使用。
- **Supabase Cloud State / History**：项目状态、Revision、Locks、Artifact Metadata、Publish State 与历史。
- **Google Drive Lightweight Project Archive**：后续只归档 Markdown / JSON / SRT 等小型项目知识文件。
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

## 6. Supabase：Cloud State / History

Creator Project 云端层继续使用：

- `creator_projects`：项目索引、完整 `project_data`、Revision、当前状态。
- `creator_project_files`：Artifact Metadata / provider pointer。
- `creator_project_events`：项目创建、状态变化、Lock 变化、同步历史。
- `creator_project_releases`：发布状态、作品 URL / ID 与数据快照。

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

Phase 1.2 不改变这些安全语义。

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

## 9. 当前 Source of Truth

| 内容 | 当前 Source of Truth |
|---|---|
| GUCC 程序、Prompt、Creator Constitution | GitHub |
| Project State、Locks、Revision、结构化 JSON | Supabase `creator_projects` |
| Artifact Metadata | Supabase `creator_project_files` |
| State / Lock History | Supabase `creator_project_events` |
| Publish State / URL / Metrics Snapshot | Supabase `creator_project_releases` |
| 真实视频、音频、录屏、剪辑工程、大型素材 | 本地 |
| Studio / Production 离线工作缓存 | 浏览器 localStorage |

Google Drive Lightweight Project Archive 尚未在 Phase 1.2 实现；它属于后续阶段。

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

## 11. Phase 2A 之后的方向

Phase 1.2 只负责把 Creator Project Model 简化稳定，不实现 Local Agent、Filesystem Watcher、ffprobe、Google Drive Archive 或 Analytics Automation。

Phase 2A 应在此基础上建立 Local-first Foundation：

1. Device Identity / Workspace Root。
2. Logical Artifact 与 Physical File Location 分离。
3. 本地 Production Asset Registry。
4. Supabase 只同步状态、历史和 Artifact Metadata，不上传大型真实文件。
5. 后续再增加 Google Drive 小型知识归档。

最终原则不变：

> 用户负责创作判断。GUCC 负责记忆、流程、状态与机械劳动。系统应该越来越简单，而不是越来越像 ERP。
