# AI Video Production System / Creator OS

**Status: ACTIVE_RUNTIME**

Production System 是 GUCC Creator OS 的正式制作界面。日常使用请先看 [`docs/creator-os-user-guide.md`](../../../docs/creator-os-user-guide.md)；本 README 只保留开发者需要的 runtime 边界。

入口：

```text
http://localhost:8000/apps/video-workspace/production-system/
```

## Current Model

现有 23-state Project workflow 继续作为 **Legacy/default compatibility layer**。Global Production v1 已作为 additive production layer 落地，包括：

- Language Track child workflow / locks / scoped artifacts
- real-audio Timeline
- Visual Master / semantic projections
- Distribution Variant / Platform Presentation
- Publish Package / QA / Release
- Publication
- Analytics / Learning

当前技术契约：

- [`docs/architecture/creator-os-overview.md`](../../../docs/architecture/creator-os-overview.md)
- [`docs/architecture/creator-global-production-v1.md`](../../../docs/architecture/creator-global-production-v1.md)

新项目不再要求用户选择旧 A/B/C/D workflow；旧值仅作为 Legacy Metadata / compatibility data。不要从旧 Phase README 推导 current UI。

## Production Safety

- Human Gate 不由自动化越过。
- Large media stays local；Supabase 保存 state / history / identity / metadata。
- Google Drive 只做 Lightweight Project Archive。
- `AUDIO_MASTER` / subtitle / timeline 等 scoped artifact 必须遵循 current Global Production contract。
- Publish Console 仍负责真实平台执行、最终检查与 metrics 录入；公开发布需要用户最终确认。

## Local Workspace

Project workspace 的 current 规则见：

- [`docs/operations/creator-local-project-workspace.md`](../../../docs/operations/creator-local-project-workspace.md)
- [`docs/operations/creator-local-agent.md`](../../../docs/operations/creator-local-agent.md)

Global child scopes 会按 Language Track / Visual Master / Variant 创建动态目录；不要再把旧的固定目录示例当成完整 current model。

## Verification

仓库根目录：

```bash
npm test
node scripts/test-creator-ux-browser.cjs
node scripts/test-creator-global-browser.cjs
```

Production System 纯逻辑测试：

```bash
node scripts/test-production-system.cjs
```
