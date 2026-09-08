# GUCC Repository Archive

这里保存 **有独立追溯价值、但已退出 current source-of-truth 且不再被 active test/runtime 读取** 的仓库历史资料。Git 本身已经保存版本历史，因此 archive 不是“所有旧文件的垃圾桶”。

当前产品 / 操作请回到：

- `docs/creator-os-user-guide.md`
- `docs/architecture/creator-os-overview.md`
- `docs/architecture/creator-global-production-v1.md`

仍被测试读取的旧 foundation contracts 位于 `docs/reference/foundation-contracts/`，不是 current architecture，也暂不属于纯 archive。

## Archive Register

| 原路径 | 当前归档路径 | 最后使用阶段 | 替代项 | 归档原因 | Compatibility requirement |
|---|---|---|---|---|---|
| `docs/creator-os-phase1.md` | `archive/historical-designs/creator-os/creator-os-phase1.md` | Creator OS Phase 1 | Current architecture + user guide | 阶段实施记录，不再是 current architecture | 无 |
| `docs/creator-os-phase2a-local-first.md` | `archive/historical-designs/creator-os/creator-os-phase2a-local-first.md` | Phase 2A | Current architecture + operations docs | 明确描述当时尚未实现 Local Agent 等能力 | 无 |
| `docs/creator-os-phase2a1-workspace-root.md` | `archive/historical-designs/creator-os/creator-os-phase2a1-workspace-root.md` | Phase 2A.1 | Current workspace / Local Agent docs | 阶段实施记录 | 无 |
| `docs/creator-local-agent.md` | `archive/historical-designs/creator-os/creator-os-phase2a2-local-agent.md` | Phase 2A.2 | `docs/operations/creator-local-agent.md` | 原文末尾仍把 Drive Archive 描述为未来 Phase 2B | 无 |
| `docs/creator-local-project-workspace.md` | `archive/historical-designs/creator-os/creator-os-phase2c1-local-workspace.md` | Phase 2C.1 | `docs/operations/creator-local-project-workspace.md` | 原文以固定 Project-level workspace 为主，Current Global scoped directories 已扩展 | 无 |
| `docs/creator-os-phase2c2-timeline.md` | `archive/historical-designs/creator-os/creator-os-phase2c2-timeline.md` | Phase 2C2 | Global Production v1 + user guide | 阶段 Timeline 设计记录 | 无 |
| `docs/uiux-audit-2026-08-25.md` | `archive/legacy-docs/uiux/uiux-audit-2026-08-25.md` | 2026-08-25 audit | current UI + browser regressions | 一次性审计记录 | 无 |
| `docs/uiux-audit-2026-08-25-round2.md` | `archive/legacy-docs/uiux/uiux-audit-2026-08-25-round2.md` | 2026-08-25 audit round 2 | current UI + browser regressions | 一次性审计记录 | 无 |
| `docs/uiux-audit-2026-08-25-round3.md` | `archive/legacy-docs/uiux/uiux-audit-2026-08-25-round3.md` | 2026-08-25 audit round 3 | current UI + browser regressions | 一次性审计记录 | 无 |

## Rules

1. Archive 不参与 active runtime 或 active tests。
2. Current docs 不得把 archive 文档当作当前产品 source of truth。
3. 需要历史设计理由时可以引用 archive，但必须明确“historical”。
4. 已经完全没有独立价值的旧副本不应继续塞进 archive；应依赖 Git history 恢复。
5. Public compatibility routes 不归档；它们留在原 URL，并在 `apps/README.md` 明确标记。
