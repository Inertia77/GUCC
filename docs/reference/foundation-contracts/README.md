# Foundation Compatibility Contracts

**Status: ACTIVE_DEV_REFERENCE / HISTORICAL CONTRACT — NOT CURRENT ARCHITECTURE**

这里保留 Creator OS Globalization foundation 阶段的文档，因为当前回归测试仍会读取其中的约束，验证 migration / compatibility contract 没有发生无意漂移。

包含：

- `creator-distribution-identity-v0.1.md` — WP_GLOB_001 / 002 distribution identity foundation。
- `creator-language-track-artifact-scope-v0.1.md` — WP_GLOB_002 language-track / artifact-scope foundation。
- `unified-pipeline-phase-1-2.md` — Phase 1.2 / foundation 时期的 Unified Pipeline。

这些文档中的 “future / not implemented” 描述只代表**当时阶段**。Global Production v1 已经实现 Language Track child workflow、Visual Master、Variant、Package / Publication、Analytics / Learning；当前架构以：

- `../../architecture/creator-os-overview.md`
- `../../architecture/creator-global-production-v1.md`

为准。

它们暂时不进入 `archive/`，原因不是“仍是当前设计”，而是 active test suite 仍把它们当 compatibility contract。等测试不再依赖这些历史文档后，再评估纯归档或依赖 Git history 删除。
