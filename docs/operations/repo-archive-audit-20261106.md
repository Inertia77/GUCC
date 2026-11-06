# GUCC 仓库未使用文件审计与归档报告

- 审计日期：2026-11-06（JST）
- 基线：`9268dda6fc09a1fb0a34b04582ae48cacfb444bd`
- 基线文件数：647（归档扫描脚本增加后为 648；新增 CI/文档会进一步变化）
- 基线仓库文件约 51 MiB（包括封面原始素材）
- 审计方式：完整 Git 树、全仓静态文本引用、运行入口、SW、package/CI、文档、当前测试与 GitHub 搜索交叉核查

## 实施清单

| 类别 | 文件数 | 处理 | 原因 |
|---|---:|---|---|
| Supabase CSV 旧导出 | 12 | 移至 `archive/supabase-exports/` | 不被运行时读取；旧快照不应当作生产数据 |
| UI/UX 历史审计和视觉验收 | 6 | 移至 `archive/reports/uiux/` | 没有当前程序引用；独立保留历史记录 |
| Creator 历史阶段与 Legacy Prompt 审计 | 6 | 移至 `archive/reports/creator-phases/` | 实现早期留档，不属于正式前端 |
| 合计 | 24 | Git 原始 Blob 无损移动 | 不硬删数据 |

详细逐文件清单及原始 Git SHA 见 [归档 Manifest](../../archive/ARCHIVE_MANIFEST.json)。

## 已确认仍使用/必须保留

- `apps/video-workspace/legacy-prompt-studio-v6.html`：当前固定 Prompt 工作区入口。
- `apps/video-workspace/production-system/legacy-v1.html`：兼容入口，旧 JSON/本机工作流可能需要。
- `apps/video-workspace/legacy/`：历史脚本/页面仍被固定工作区和回归测试引用。
- `apps/video-workspace/production-system/fixtures/`：6 个文件仍被 `scripts/test-creator-os-v2.cjs` 检查，继续参与 CI，不能算闲置文件。
- `data/imports/` 与 `data/schema.md`：研究原始资料 / 当前运行时资料及维护说明，不迁移。
- `reference/story-library/`：完整的六游/其他游戏剧情资料及已整理的原始历史归档，保持现有链接。
- `supabase/migrations/`, `supabase/rollback/`, `supabase/functions/`：数据库与回滚安全边界，严禁清理。
- `assets/creative/`：22 份背景图片、PSD 和创作参考，不能以“JS 没引用”为由认定不用。
- `automation/`：本地 Windows 启动器与流程提醒，用户可能在站点外执行。
- `scripts/`：本地/CI/构建能力，仍在仓库，但不应公开发布为网站资源。

## Pages 构建优化

正式 Pages 只复制运行时网站目录，不再包括 `scripts/`、`automation/`；同时不再输出 Creator QA fixtures。这不会删除这些文件或阻断本地 CLI/Windows 任务。根目录 `archive/` 原本就在构建白名单之外。

## 仍待人工确认的高价值候选

`assets/creative/` 大约 46 MiB，代码级文本扫描没有找到每张图片的显式运行时引用，但这些文件是素材，不等于废弃。没有在本轮移动、压缩或去重，避免误伤封面/PSD 源文件。

旧网页直链、Windows 外部快捷方式、Notion/AI 历史文档中可能保存有链接；仅通过仓库内代码无法证明其不存在。因而兼容页面和本地资产均保留。

## 验收

- `node scripts/audit-repo-files.cjs --check`：完整文件列表与归档 Blob 校验。
- `node scripts/test-repository-archive.cjs`：静态发布内容隔离和关键入口保留。
- `npm test` + 真实浏览器 CI + Pages 正式站身份回读。
