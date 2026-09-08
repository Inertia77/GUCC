# GUCC Docs

这里放 **当前有效** 的用户、架构、运维和参考文档。历史 Phase / 审计 / 已被替代的设计不再与 current docs 混放；它们统一进入 [`../archive/README.md`](../archive/README.md)。

## 先从这里开始

如果只是想开始或继续制作视频，直接读：

**[`creator-os-user-guide.md`](./creator-os-user-guide.md)**

它是 Creator OS 的日常操作第一入口；实际按钮、流程和可执行步骤以 current main UI + 这份用户手册为准。

## Current Architecture

- [`architecture/creator-os-overview.md`](./architecture/creator-os-overview.md) — 当前 Creator OS 总体结构与 Source of Truth。
- [`architecture/creator-global-production-v1.md`](./architecture/creator-global-production-v1.md) — Global Production v1 技术契约。
- [`architecture/creator-constitution.md`](./architecture/creator-constitution.md) — 创作约束、Human Gate 与安全边界。

## Operations

- [`operations/creator-local-agent.md`](./operations/creator-local-agent.md) — Local Agent。
- [`operations/creator-local-project-workspace.md`](./operations/creator-local-project-workspace.md) — 本地 Workspace / bootstrap / discovery。
- [`operations/creator-archive-runtime-setup.md`](./operations/creator-archive-runtime-setup.md) — Google Drive Lightweight Project Archive runtime setup。
- [`supabase-setup.html`](./supabase-setup.html) — Command Center 的 Supabase / GitHub Pages / 本地测试部署说明。该 URL 保持稳定。

## Reference

- [`reference/onmyoji-integration.md`](./reference/onmyoji-integration.md) — 阴阳师集成记录与参考。
- [`reference/foundation-contracts/`](./reference/foundation-contracts/) — test-pinned historical compatibility contracts；不是 current architecture。
- [`repository-map.md`](./repository-map.md) — 全仓库目录分类、active/compatibility/archive 边界和删除规则。

## Historical Documentation

Creator OS Phase 1 / 2A / 2C2 与 2026-08-25 UI/UX audit 已移至 [`../archive/`](../archive/)。WP_GLOB_001 / WP_GLOB_002 foundation 与旧 Unified Pipeline 仍被回归测试作为兼容契约读取，因此归入 [`reference/foundation-contracts/`](./reference/foundation-contracts/)；它们不是 current architecture。

这些历史内容可以用于追溯“当时为什么这么设计”，但**不能覆盖 current main runtime、当前用户手册或当前架构文档**。

## 文档规则

- Current docs 使用描述性 kebab-case；不要创建 `final`、`new`、`copy`、`v2-final` 一类副本。
- 用户操作的 source of truth：current UI + `creator-os-user-guide.md`。
- 当前技术架构的入口：`architecture/creator-os-overview.md`。
- 历史阶段记录：`archive/`。
- 新增 HTML public page 时，同步检查 Access Guard 与 `scripts/check-project.mjs`。
