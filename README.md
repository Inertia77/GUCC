# GUCC

GUCC（GameUp Creator Command Center）是一个运行在 GitHub Pages + 本地工具 + Supabase 上的个人游戏内容创作系统。仓库同时保存浏览器应用、Creator OS、发布工具、数据/参考资料和开发脚本。

> 日常使用看 UI 与用户手册；开发看 Repository Map；历史设计只看 `archive/`，不要把历史文档当成当前 Production reality。

## 我现在要去哪里？

| 目标 | 入口 |
|---|---|
| 打开 GUCC | <https://inertia77.github.io/GUCC/> |
| 开始 / 继续制作视频 | [`docs/creator-os-user-guide.md`](docs/creator-os-user-guide.md) |
| 了解当前 Creator OS 架构 | [`docs/architecture/creator-os-overview.md`](docs/architecture/creator-os-overview.md) |
| 查看完整仓库结构与 Source of Truth | [`docs/repository-map.md`](docs/repository-map.md) |
| 配置 / 排查 Command Center | [`docs/supabase-setup.html`](docs/supabase-setup.html) |
| 查看历史设计与审计记录 | [`archive/README.md`](archive/README.md) |

## Repository Structure

```text
GUCC/
├─ apps/          # 浏览器应用；稳定 GitHub Pages URL
├─ assets/        # 共享 runtime 资产、Creator OS 模块与创作素材
├─ automation/    # 本地自动化 / 批处理工作流
├─ data/          # 导入源、数据快照与 schema 说明
├─ docs/          # 当前用户、架构、运维与参考文档
├─ reference/     # Prompt / Resource / Story 等可浏览资料库
├─ scripts/       # 检查、测试、Local Agent、Publisher Assistant 等
├─ supabase/      # Functions、migrations、SQL；Production 基础设施
├─ archive/       # 退出 current source-of-truth 的历史文档
├─ index.html     # GUCC Portal
├─ manifest.webmanifest
├─ offline.html
└─ sw.js          # PWA / cache contract
```

详细分类、删除边界和 Source of Truth 见 [`docs/repository-map.md`](docs/repository-map.md)。

## Active Applications

| 应用 | 稳定路径 | 作用 |
|---|---|---|
| Command Center | `apps/command-center/` | 游戏资料与结构化数据管理 |
| GUCC WorkSpace / Studio | `apps/video-workspace/` | 选题、草稿与 Creator 项目入口 |
| Production System / Creator OS | `apps/video-workspace/production-system/` | Production、Global Production、Files 等 |
| Cover Generator | `apps/cover-generator/` | 多比例封面生成 |
| Publish Console | `apps/publishing-console/` | 发布准备、执行记录与数据复盘 |

### Compatibility / Legacy Routes

`apps/gameup-command-center/` 是旧公开 URL 的 **Compatibility Route**，只负责跳转到 `apps/command-center/`。它不是第二套 Command Center，也不是新的 source of truth。旧 URL 是否仍被书签或外部链接使用无法完全证明，因此该薄层继续保留。

## Current Source of Truth

- **日常操作**：current main UI + [`docs/creator-os-user-guide.md`](docs/creator-os-user-guide.md)。
- **Creator OS 当前架构**：[`docs/architecture/creator-os-overview.md`](docs/architecture/creator-os-overview.md) 与 [`docs/architecture/creator-global-production-v1.md`](docs/architecture/creator-global-production-v1.md)。
- **创作 / Human Gate 规则**：[`docs/architecture/creator-constitution.md`](docs/architecture/creator-constitution.md)。
- **程序、Prompt、测试与基础设施定义**：GitHub current main。
- **Content Project Root 状态、History、Identity、Metadata**：Supabase。
- **真实视频、音频、录屏、剪辑工程与大型素材**：Local machine。
- **Google Drive Lightweight Project Archive is implemented.** 它只保存轻量项目知识文件，不接管大型媒体。
- **Platform ≠ Channel**：Platform 是产品字典，Channel 是具体账号 / 市场 / 语言策略。
- **历史实现说明**：`archive/`，仅用于追溯，不覆盖 current reality。

## 本地开发

统一使用 `localhost:8000`：

```powershell
cd C:\path\to\GUCC
python -m http.server 8000
```

或：

```powershell
.\scripts\serve-windows.bat
```

常用检查：

```powershell
npm ci
npm test
node scripts/test-creator-ux-browser.cjs
node scripts/test-creator-global-browser.cjs
```

Creator 本地工具：

```powershell
npm run publisher:assistant
npm.cmd run creator:agent -- --bootstrap-project <projectId>
npm run creator:archive
```

## Repository Safety Rules

1. GitHub Pages 的现有 public URL 是兼容合同；不要为目录美观随意改 app 路径。
2. Runtime 文件移动必须同步检查 HTML `href/src`、JS imports、Service Worker precache、测试和文档引用。
3. Supabase migration history 是基础设施历史，不等于 repository archive；不要重排或重写 migration。
4. `archive/` 不参与 active runtime，不应成为 current docs 的 source of truth。
5. 新增用户操作说明时，优先更新 `docs/creator-os-user-guide.md`，不要再创建一份“final/new/v2”用户手册。
6. 修改前端入口后至少运行 `npm test` 和对应 browser regressions。
