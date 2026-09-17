# GUCC Creator OS — Current Architecture

Status: **CURRENT / current-main architecture reference**

这份文档回答“现在 GUCC Creator OS 实际是什么”。日常点击与填写仍以 [`../creator-os-user-guide.md`](../creator-os-user-guide.md) 和 current main UI 为准；历史 Phase / WP 设计不能覆盖 Production reality。

## 1. Source Priority

遇到冲突时按以下顺序判断：

1. current main runtime / tests / Production reality
2. `docs/creator-os-user-guide.md`
3. 本文与 `creator-global-production-v1.md`
4. `docs/reference/foundation-contracts/` 中仍被测试钉住的历史兼容契约
5. `archive/` 中的纯历史设计

历史文档不能把已经实现的能力重新解释成 future scope。

## 2. Identity Model

一个 Creator Project 是一个 **Content Project Root**，不是一份导出视频文件。应避免旧假设：

> One Project = One Video

当前关系可以概括为：

```text
Content Project Root
├─ Language Track(s)
├─ Visual Master(s)
├─ Distribution Variant(s)
├─ Publish Package(s)
└─ Publication instance(s)
   └─ Metrics / Report / Learning
```

`VIDEO_V1` 是 Legacy/default final master artifact；它 **is not equivalent to one Content Project Root**。

Platform 是产品字典，Channel 是具体账号 / 市场 / 语言策略：**Platform ≠ Channel**。

## 3. Artifact Identity

Logical Artifact 的稳定身份是：

```text
project_id
+ artifact_scope_type
+ artifact_scope_id
+ file_key
```

当前 scope：

- `project`
- `language_track`
- `visual_master`
- `variant`

Do not emulate scope with fake suffix keys such as `AUDIO_MASTER_JA` or `SUBTITLE_MASTER_EN`.

`creator_projects.current_state` 保持 Project-level compatibility state；child workflow 使用各自的 child identity / state，不把所有子流程塞回一个顶级状态字段。

## 4. Production Layers

### Legacy/default Project Workflow

现有 23-state Project workflow 继续作为兼容层，旧项目不会因为 Global Production 被重置。新项目不再要求用户选择 A/B/C/D workflow；旧 project type 仅作为 Legacy Metadata / compatibility data。

### Global Production v1

Global Production v1 已经实现，不是 future placeholder。

Language Track child workflow：

```text
DRAFT
→ SCRIPTING
→ SCRIPT_LOCKED
→ AUDIO_PRODUCTION
→ AUDIO_LOCKED
→ TIMELINE_GENERATION
→ TIMELINE_LOCKED
→ READY
```

同时已经存在：

- Language Track scoped artifacts 与 Human Locks
- Visual Master / semantic segment / projection
- Distribution Variant
- Platform Presentation
- Publish Package + QA + Release Lock
- Publication lifecycle
- Analytics / Metrics
- Report / Learning

具体约束见 [`creator-global-production-v1.md`](./creator-global-production-v1.md)。

## 5. Local-first Storage Boundary

```text
Local machine = Large Media
Supabase      = State + History + Identity + Metadata
Google Drive  = Lightweight Project Archive
```

**Google Drive Lightweight Project Archive is implemented.** 它保存 Markdown / JSON / SRT / CSV / TXT / VTT 等轻量知识文件，不接管视频、音频、录屏或剪辑工程大文件。

当前 Global Workspace 会按 scope 建立动态目录，例如：

```text
02_SCRIPT/LANG/{TRACK_KEY}
03_AUDIO/LANG/{TRACK_KEY}
04_SUBTITLES/LANG/{TRACK_KEY}
06_EDIT_PLAN/VISUAL_MASTER/{VISUAL_MASTER_KEY}
10_RELEASE/VARIANTS/{VARIANT_KEY}
```

## 6. Human / AI Boundary

Human Gate 不能由 AI 或普通自动化越过。包括 Project Scope / Evidence / Master Script、Language Script / Voice-Timeline、Visual Master / Edit Plan / Master Render、Platform Variant / Final Review / Release、Final Publish Confirmation 与 Learning acceptance/rejection。

AI 可以生成草稿、分析、验证、提出 QA findings / learnings；最终 Human Lock 和公开发布仍由用户确认。

## 7. Runtime Surfaces

```text
Portal
→ Creator Dashboard
→ Studio / WorkSpace
→ Production
   ├─ Project workflow
   ├─ Global Production
   └─ Files / Local Agent
→ Publish Console
→ Analytics / Learning
```

Publish Console 仍是当前平台执行、最终检查和真实 metrics 录入的主要可操作界面。外部平台 OAuth / upload / publish 不因为 Global Production identity 自动完成。

## 8. Current Documentation Boundary

- 用户操作：`docs/creator-os-user-guide.md`
- 当前总体架构：本文
- Global Production 技术细节：`docs/architecture/creator-global-production-v1.md`
- Human Gate / creative constraints：`docs/architecture/creator-constitution.md`
- Local runtime：`docs/operations/`
- Foundation compatibility contracts：`docs/reference/foundation-contracts/`（test-pinned historical contracts）
- 旧 Phase / audit：`archive/`

任何新文档如果描述“未来能力”，必须先核对 current main，避免再次产生已实现能力被标成 future 的 drift。
