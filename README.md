# GUCC

GUCC 是我的 GameUp Creator Command Center：一个放在 GitHub Pages 上的个人游戏内容工作台，包含数据管理、视频项目工作台、封面生成器、资料库、Prompt 库和剧情资料库。

## 快速启动

本地统一使用 `localhost:8000`。Command Center 的 Supabase CORS 默认允许 `http://localhost:8000`，不要用 `127.0.0.1:8000` 测后端。

```powershell
cd C:\Users\miket\Git管理下\GUCC
python -m http.server 8000
```

打开：

```text
http://localhost:8000/
```

也可以直接用：

```powershell
.\scripts\serve-windows.bat
```

线上入口：

```text
https://inertia77.github.io/GUCC/
```

## Access Key

Portal 和主要 HTML 页面都接入了前端 Access Key 门禁。

- 当前口令：`GUCC-2026`
- 保存位置：浏览器 `localStorage`，key 为 `gucc_access_hash_v2`
- 行为：同一个浏览器输入一次后会长期记住，点击 Portal 右上角锁定入口会清除
- 修改口令：改 `assets/access-guard.js` 里的 `ACCESS_HASH`

生成新 hash 的 PowerShell 示例：

```powershell
[BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes('NEW_PASS'))).Replace('-','').ToLower()
```

注意：这是 GitHub Pages 静态站点的前端门禁，能挡住日常误入和直接打开 HTML app，但不是服务器级私有权限。真正的数据安全仍然依赖 Supabase Auth、Edge Function 和数据库权限。

## Portal 入口

| 页面 | 路径 | 用途 |
|---|---|---|
| GameUp Command Center | `apps/command-center/` | 查询和维护角色、配队、版本、资源链接 |
| GUCC WorkSpace | `apps/video-workspace/` | 视频项目模板、WIP/DONE Markdown 与 JSON |
| Cover Generator | `apps/cover-generator/` | 多比例视频封面生成 |
| AI Prompt Library | `reference/ai-prompts.html` | 公告整理、兑换码、前瞻、SQL、剧情资料维护 Prompt |
| Story Library | `reference/story-library.html` | 网页阅读剧情资料库 Markdown |
| Resource Library | `reference/resource-library.html` | 游戏 Wiki、官方资料、攻略参考入口 |
| Setup Guide | `docs/supabase-setup.html` | Command Center 部署说明 |

## 项目结构

```text
GUCC/
├─ apps/                         # 可直接打开的应用
│  ├─ command-center/             # Supabase 数据管理前端
│  ├─ video-workspace/            # 视频项目工作台
│  └─ cover-generator/            # 封面生成器
├─ assets/                        # 图标、素材、封面背景、PSD 模板、门禁脚本
├─ automation/                    # 本地辅助批处理和资料工作流
├─ data/                          # 数据库结构、导入 CSV、备份说明
├─ docs/                          # 部署和操作文档
├─ reference/                     # Prompt、资料库、剧情库、查询手册
├─ scripts/                       # 本地启动、项目检查、Edge Function 测试
├─ supabase/                      # Supabase SQL 和 Edge Function
└─ index.html                     # GUCC Portal
```

## Command Center

Command Center 的数据路径：

```text
GitHub Pages / local static page
  -> Supabase Auth
  -> Supabase Edge Function: gameup-api
  -> PostgreSQL JSONB RPC
```

前端公开配置只放：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
EDGE_FUNCTION_NAME
```

不要把 `service_role`、数据库密码、JWT secret 放进仓库。部署细节见 [docs/supabase-setup.html](docs/supabase-setup.html)。

## 常用命令

```powershell
python -m http.server 8000
node scripts/check-project.mjs
.\scripts\test-edge-function.ps1
```

## 维护规则

1. 入口路径保持稳定，页面刷新用 query string 管缓存，不改目录名。
2. 新的 HTML 入口要加 `assets/access-guard.js`。
3. Prompt 和资料型内容优先放 `reference/`。
4. Supabase SQL 统一放 `supabase/sql/`，不要散落在根目录。
5. 新增图标或素材放 `assets/`，大文件只放真正复用的版本。
6. 改完前端入口后运行 `node scripts/check-project.mjs`。
