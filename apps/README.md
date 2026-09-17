# GUCC Apps

`apps/` 保存 GUCC 的浏览器应用。这里的目录名也是 GitHub Pages / `localhost:8000` 的稳定 URL 合同，因此 active app 不因仓库整理随意改名。

## Active Applications

| 应用 | 入口 | 用途 |
|---|---|---|
| `command-center/` | `index.html` | Supabase 数据管理前端 |
| `video-workspace/` | `index.html` | Studio / 视频项目工作台 |
| `video-workspace/production-system/` | `index.html` | Production System / Creator OS / Global Production |
| `cover-generator/` | `index.html` | 多比例封面生成器 |
| `publishing-console/` | `index.html` | 发布准备、上传填表、执行记录与数据复盘 |

## Compatibility Routes

| 旧路径 | 当前目标 | 状态 |
|---|---|---|
| `gameup-command-center/` | `command-center/` | **Compatibility only** — 保留旧 URL 的最小 redirect stub |

`gameup-command-center/` 不是第二套 Command Center。不要在该目录新增业务代码、assets 或独立产品逻辑；真正实现只存在于 `command-center/`。如果未来能证明旧 URL 已无任何外部依赖，再单独评估删除。

本地入口：

```text
http://localhost:8000/apps/<app-name>/
```

## 门禁与路径安全

主要 HTML 应用加载共享 `assets/access-guard.js`。任何 runtime 路径调整都必须同步检查：

- HTML `href` / `src`
- JS imports / fetch paths
- `sw.js` APP_SHELL
- `scripts/check-project.mjs`
- browser regression tests
- GitHub Pages public links

Command Center 测后端时使用 `localhost:8000`；除非后端允许，否则不要把 `127.0.0.1:8000` 当同一 Origin。
