# GUCC

GUCC 是个人游戏内容创作与资料管理仓库。它把视频项目工作台、数据库管理、封面生成、资料入口、自动化脚本和 Supabase 后端放在一个稳定结构里。

## 快速开始

本地调试推荐统一使用 `localhost:8000`。Command Center 的 Supabase CORS 已允许 `http://localhost:8000`；不要用 `127.0.0.1:8000` 测数据库功能，否则可能出现 `Failed to fetch`。

```powershell
cd C:\Users\miket\Git管理下\GUCC
python -m http.server 8000
```

打开：

```text
http://localhost:8000/
```

也可以直接运行：

```powershell
.\scripts\serve-windows.bat
```

线上入口：

```text
https://inertia77.github.io/GUCC/
```

## Portal

`index.html` 是 GUCC Portal。第一屏只放高频入口：

- `apps/command-center/`：GameUp Command Center，管理 Supabase 数据。
- `apps/video-workspace/`：GUCC WorkSpace，视频项目工作台。
- `apps/cover-generator/`：Cover Generator，封面生成器。

Portal 里还有一个可收起的“备用资料库”，里面放：

- `reference/resource-library.html`：游戏 Wiki、官方资料、攻略入口。
- `reference/query-guides/query-manual.md`：查询手册。
- `data/schema.md`：数据库结构说明。
- `docs/supabase-setup.html`：Command Center 部署指南。

Portal 有前端门禁。它只用于防止路人随手打开页面，不是严肃安全边界；真正的数据安全仍靠 Supabase Auth 和 Edge Function。门禁 hash 写在 `index.html` 的 `ACCESS_HASH`。

## 目录结构

```text
GUCC/
├─ apps/                         # 可直接在浏览器运行的应用
│  ├─ command-center/            # Supabase 数据管理前端
│  ├─ video-workspace/           # 视频项目模板工作台
│  └─ cover-generator/           # 多比例封面生成器
├─ assets/                       # 图标、封面素材、参考图、PSD 模板
├─ automation/                   # Windows 批处理：平台巡检与资料打开
├─ data/                         # 数据库结构、导入 CSV、Supabase 导出备份
├─ docs/                         # 部署与操作文档
├─ reference/                    # 资料库、查询指南、剧情研究资料
├─ scripts/                      # 启动、检查、Edge Function 测试脚本
├─ supabase/                     # Supabase CLI、SQL、Edge Function
├─ index.html                    # GUCC Portal
└─ README.md
```

## 应用入口

| 应用 | 本地路径 | 用途 |
|---|---|---|
| GameUp Command Center | `http://localhost:8000/apps/command-center/` | 查询和维护角色、配队、版本、资源 |
| GUCC WorkSpace | `http://localhost:8000/apps/video-workspace/` | 视频项目草稿、脚本、发布与复盘 |
| Cover Generator | `http://localhost:8000/apps/cover-generator/` | 多比例封面生成 |
| GUCC 资料库 | `http://localhost:8000/reference/resource-library.html` | 游戏资料入口导航 |

## Command Center 后端

Command Center 的调用链：

```text
GitHub Pages / local static page
  -> Supabase Auth
  -> Supabase Edge Function: gameup-api
  -> PostgreSQL JSONB RPC
```

前端公开配置位于：

```text
apps/command-center/src/config.js
```

这里只能放：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
EDGE_FUNCTION_NAME
```

不要把 `service_role`、数据库密码、JWT secret 放进仓库。部署细节见 [docs/supabase-setup.html](docs/supabase-setup.html)。

## 常用命令

本地服务：

```powershell
python -m http.server 8000
```

项目检查：

```powershell
node scripts/check-project.mjs
```

Edge Function 测试示例：

```powershell
.\scripts\test-edge-function.ps1
```

## 维护规则

1. 根目录只放仓库级入口和一级功能区。
2. 可运行页面放 `apps/`，共享素材放 `assets/`，长期资料放 `reference/`。
3. Supabase SQL 统一放 `supabase/sql/`，不要散落到根目录。
4. 应用入口路径保持稳定，版本号写在页面内部或 query string，不改目录名。
5. 新文件和目录优先使用小写 kebab-case；中文内容写在文件正文里。
6. WIP / DONE 导出文件不要提交到仓库，放同步盘或本地项目目录。
