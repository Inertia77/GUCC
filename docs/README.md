# Docs

部署、操作与系统说明文档区。

## Creator OS

**如果只是想“开始做视频”，先读：[`creator-os-user-guide.md`](./creator-os-user-guide.md)。**

| 文档 | 用途 |
|---|---|
| [`creator-os-user-guide.md`](./creator-os-user-guide.md) | **面向日常使用者，优先阅读。** 从第一次打开 GUCC、新建项目、脚本、音频、字幕、素材、剪辑，到发布与复盘的实际操作手册 |
| [`ai-video-production/UNIFIED_PIPELINE.md`](./ai-video-production/UNIFIED_PIPELINE.md) | Creator OS 工作流 / 架构参考；日常操作以用户指南和 current main UI 为准 |
| [`creator-global-production-v1.md`](./creator-global-production-v1.md) | Global Production 技术说明：Language Track、Visual Master、Variant、Package、Publication、Analytics / Learning 等 |
| [`creator-local-agent.md`](./creator-local-agent.md) | Local Agent 详细说明：本地文件观察、设备身份、扫描与安全边界 |
| [`creator-local-project-workspace.md`](./creator-local-project-workspace.md) | 本地 Workspace 说明：项目目录、bootstrap、Projection、Final Video / Cover discovery |
| [`ai-video-production/CREATOR_CONSTITUTION.md`](./ai-video-production/CREATOR_CONSTITUTION.md) | Creator OS 的创作规则、Human Gate 与安全边界 |

用户手册回答“**我现在点哪里、填什么、接下来做什么**”；其余文档主要用于理解工作流、技术边界和排查细节。

## 部署与系统操作

| 文件 | 用途 |
|---|---|
| `supabase-setup.html` | Command Center 的 Supabase、GitHub Pages、本地测试部署指南 |

`supabase-setup.html` 已接入 GUCC Access Key，直接打开也会先检查门禁。

## 维护规则

- 文档文件名使用描述性 kebab-case。
- 旧文档由 Git 历史保留，不要复制 `final`、`new`、`copy` 这类版本名。
- 新增 HTML 文档时同步加入 `scripts/check-project.mjs` 的入口检查。
- Creator OS 日常操作说明必须以 current main 的真实 UI / runtime 为准；架构文档和历史实现说明不能覆盖 Production reality。
