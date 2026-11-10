# Docs

部署、操作与系统说明文档区。

## Creator OS

**如果只是想“开始做视频”，先读：[`creator-os-user-guide.md`](./creator-os-user-guide.md)。**

| 文档 | 用途 |
|---|---|
| [`creator-os-user-guide.md`](./creator-os-user-guide.md) | **面向日常使用者，优先阅读。** 从第一次打开 GUCC、新建项目、脚本、音频、字幕、素材、剪辑，到发布与复盘的实际操作手册 |
| [`Creator Governance / 归档清单`](../apps/video-workspace/creator-governance/MIGRATION_MANIFEST.md) | 统一规范迁移清单及旧工作流的无损归档入口 |
| [`creator-global-production-v1.md`](./creator-global-production-v1.md) | Global Production 技术说明：Language Track、Visual Master、Variant、Package、Publication、Analytics / Learning 等 |
| [`creator-local-agent.md`](./creator-local-agent.md) | Local Agent 详细说明：本地文件观察、设备身份、扫描与安全边界 |
| [`creator-local-project-workspace.md`](./creator-local-project-workspace.md) | 本地 Workspace 说明：项目目录、bootstrap、Projection、Final Video / Cover discovery |
| [`CREATOR_RULEBOOK.md`](../apps/video-workspace/creator-governance/CREATOR_RULEBOOK.md) | **唯一现行 AI 创作规范入口**；能力和任务细则在同目录 |

用户手册回答“**我现在点哪里、填什么、接下来做什么**”；其余文档主要用于理解工作流、技术边界和排查细节。

## 部署与系统操作

| 文件 | 用途 |
|---|---|
| `supabase-setup.html` | **当前** GUCC Creator OS v4、Supabase、GitHub Actions 部署与排障指南 |

新版 `maintenance/query-manual.html` 和 `maintenance/db-structure.html` 分别提供 SQL 安全巡检与生产 46 表结构索引，源码在 `reference/query-guides/query-manual.md`、`data/schema.md`。

以上 HTML 页面均已接入 GUCC Access Key，直接打开也会先检查门禁。

## 维护规则

- 文档文件名使用描述性 kebab-case。
- 旧文档由 Git 历史保留，不要复制 `final`、`new`、`copy` 这类版本名。
- 新增 HTML 文档时同步加入 `scripts/check-project.mjs` 的入口检查。
- Creator OS 日常操作说明必须以 current main 的真实 UI / runtime 为准；架构文档和历史实现说明不能覆盖 Production reality。


## 历史审计与阶段设计归档

2026-11-06 已把旧版 UI/UX 审计、Atelier 验收报告、早期 Creator 阶段文档移入仓库根目录 `archive/reports/`，避免误认为当前实现。当前操作以 `creator-os-user-guide.md` 和真实生产代码为准；历史文件与原始 Blob ID 见 `archive/ARCHIVE_MANIFEST.json`。
