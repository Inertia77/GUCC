# GUCC Repository Map

Status: **CURRENT**

本页是 GUCC 仓库结构的总入口。它只描述 repository organization，不替代 Creator OS 用户手册或 Production 数据。

## Root Directory Map

| 路径 | 分类 | 用途 / 谁会用 | 删除边界 |
|---|---|---|---|
| `.github/` | ACTIVE_DEV | CI / GitHub Actions | CI 未迁移前不可删 |
| `.vscode/` | ACTIVE_DEV | 本地开发任务 | 确认无团队/个人任务依赖后才可评估 |
| `apps/` | ACTIVE_RUNTIME | GitHub Pages 浏览器应用 | public URL + runtime contract，不可随意移动 |
| `assets/` | ACTIVE_RUNTIME / SUPPORT | 共享 JS/CSS、PWA、Creator OS modules、创作素材 | 必须先证明无 HTML/JS/SW/test 引用 |
| `automation/` | ACTIVE_DEV / LOCAL_TOOLING | Windows 批处理与资料/创作自动化 | 本地工作流可能依赖路径，不做猜测性清理 |
| `data/` | SUPPORT_DATA | 导入源、Supabase 导出快照、schema 说明 | 部分资料被 reference 页面读取；逐文件验证后才可删 |
| `docs/` | ACTIVE_DOCS | 当前用户、架构、运维、参考文档 | current source-of-truth，不放历史 Phase 副本 |
| `reference/` | ACTIVE_RUNTIME / ACTIVE_REFERENCE | Prompt、Resource Library、Story Library、知识库 | 部分 HTML/JS 为 Pages runtime；剧情目录有自己的 manifest |
| `scripts/` | ACTIVE_DEV / LOCAL_RUNTIME | 检查、测试、Local Agent、Archive、Publisher Assistant | package scripts / CI /本地流程依赖，不可随意移动 |
| `supabase/` | ACTIVE_RUNTIME_INFRA | Functions、migrations、SQL、配置 | Production 基础设施；migration history 不做 repository archive |
| `archive/` | LEGACY_HISTORY | 已退出 current source-of-truth 的历史设计 / 审计 | 不参与 runtime；确认无独立历史价值后可依赖 Git history 删除 |
| `index.html` | ACTIVE_RUNTIME | GUCC Portal | Pages public entry，不可移动 |
| `manifest.webmanifest` | ACTIVE_RUNTIME | PWA manifest | PWA contract |
| `offline.html` | ACTIVE_RUNTIME | PWA offline fallback | Service Worker 依赖 |
| `sw.js` | ACTIVE_RUNTIME | PWA cache / upgrade contract | 任何 runtime path move 都必须同步更新 |

## Current Active Apps

- `apps/command-center/`
- `apps/video-workspace/`
- `apps/video-workspace/production-system/`
- `apps/cover-generator/`
- `apps/publishing-console/`

这些路径保持稳定。结构治理默认不改变它们的 URL。

## Current Compatibility Routes

### `apps/gameup-command-center/` → `apps/command-center/`

分类：**COMPATIBILITY**

当前目录只有最小 redirect stub；旧路径同时仍被 shell active-state、项目检查和部署文档识别。因为无法证明所有旧书签 / 外部链接已消失，本轮保留该 URL。

业务代码不得进入 compatibility route。Command Center 的唯一 source of truth 是 `apps/command-center/`。

## Current Documentation Layout

```text
docs/
├─ README.md
├─ creator-os-user-guide.md
├─ repository-map.md
├─ supabase-setup.html
├─ architecture/
│  ├─ README.md
│  ├─ creator-os-overview.md
│  ├─ creator-global-production-v1.md
│  └─ creator-constitution.md
├─ operations/
│  ├─ README.md
│  ├─ creator-local-agent.md
│  ├─ creator-local-project-workspace.md
│  └─ creator-archive-runtime-setup.md
└─ reference/
   ├─ README.md
   ├─ onmyoji-integration.md
   └─ foundation-contracts/
      ├─ README.md
      ├─ creator-distribution-identity-v0.1.md
      ├─ creator-language-track-artifact-scope-v0.1.md
      └─ unified-pipeline-phase-1-2.md
```

用户第一入口始终是 `docs/creator-os-user-guide.md`。

## Current Source of Truth

| 领域 | Source of Truth |
|---|---|
| 日常 Creator OS 操作 | current main UI + `docs/creator-os-user-guide.md` |
| 当前 Creator OS 架构 | `docs/architecture/creator-os-overview.md` |
| Global Production v1 技术契约 | `docs/architecture/creator-global-production-v1.md` |
| 创作 / Human Gate 规则 | `docs/architecture/creator-constitution.md` |
| Browser runtime | `index.html` / `apps/` / `assets/` / `reference/` / `sw.js` |
| Local tooling | `scripts/` / `automation/` |
| Cloud schema / Functions | `supabase/` + Production Supabase reality |
| Project state / identity / history | Supabase |
| Large media | Local machine |
| Lightweight project archive | Google Drive |
| Test-pinned historical foundation contracts | `docs/reference/foundation-contracts/` |
| Historical design rationale | `archive/` |

## Archive Policy

`archive/` 只接收仍有追溯价值、但已经退出 current source-of-truth 的内容。

Archive 内容必须满足：

- 不参与 active browser runtime；
- 不被 current docs 当成当前架构；
- 不制造第二份 source of truth；
- 文件移动使用真正 move / rename，不复制旧文件长期双存；
- `archive/README.md` 记录原路径、替代项与归档原因。

完全错误、无引用、无独立历史价值且已被正确内容完整替代的文件，可以在证据充分后直接删除；Git history 已承担恢复历史的职责。

## Generated / Temp Policy

这些内容不应长期进入 Git：

- `tmp/`
- `.cache/`
- `downloads/`
- `node_modules/`
- `coverage/`
- `playwright-report/`
- `test-results/`
- logs / local `.env` / OS metadata

测试 fixture 如果是可复现验收合同的一部分，则继续 version control，不按“generated”误删。

## Remaining UNKNOWN / Retained

本轮没有把“不确定”转换成删除。以下类型仍按保守策略保留：

- `assets/creative/` 中看似相近但无法仅靠文件名证明重复的背景图 / PSD / reference images；
- `automation/` 中可能由本机快捷方式或人工流程调用的批处理入口；
- `data/exports from supabase/` 的历史快照保留策略。

它们可以在后续有实际使用证据时再细分；在没有证据前不得删除。

## Change Rule

任何 path move 前都要全仓库检查：

`href` / `src` / imports / fetch / service-worker precache / tests / scripts / docs / CI / Pages links。

Production reality > 文件名猜测。
