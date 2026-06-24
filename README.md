# GUCC

GUCC 是一个个人游戏内容创作与资料管理仓库，包含视频项目工作台、Supabase 数据管理前端、封面生成器、创作自动化脚本、源数据和参考资料。

## 快速入口

本地启动：

```powershell
python -m http.server 8000
```

然后打开：

```text
http://localhost:8000/
```

GitHub Pages：

```text
https://inertia77.github.io/GUCC/
```

## 目录结构

```text
GUCC/
├─ apps/                         # 可直接在浏览器运行的应用
│  ├─ video-workspace/           # 视频项目模板、自动保存与项目导入导出
│  ├─ command-center/            # Supabase 数据管理前端
│  └─ cover-generator/           # 多比例封面生成器
│
├─ assets/                       # 跨应用共享的创作素材
│  └─ creative/
│     ├─ cover-backgrounds/
│     ├─ reference-images/
│     └─ photoshop-templates/
│
├─ automation/                   # Windows 一键打开网页的批处理
│  ├─ creator-platforms/
│  └─ game-research/
│
├─ data/                         # 数据库结构说明与原始导入数据
│  ├─ schema.md
│  └─ imports/
│
├─ docs/                         # 当前有效的部署与操作文档
│  └─ supabase-setup.html
│
├─ reference/                    # 不参与运行的知识与查询参考
│  ├─ knowledge-base/
│  └─ query-guides/
│
├─ scripts/                      # 仓库级检查、启动和测试脚本
├─ supabase/                     # Supabase CLI、Edge Function 与 SQL
│  ├─ functions/
│  └─ sql/
│
├─ index.html                    # GUCC Portal
└─ README.md
```

## 应用

### Video WorkSpace

```text
http://localhost:8000/apps/video-workspace/
```

- 视频选题、资料、结构、脚本、发布和复盘工作台
- 编辑后自动保存到当前浏览器
- 导出和导入 WIP / DONE Markdown、JSON
- 正式入口不带版本号；版本记录见应用内 `CHANGELOG.md`

### Command Center

```text
http://localhost:8000/apps/command-center/
```

- Supabase Auth 登录
- 角色、配队、版本和资源管理
- 前端只调用 Edge Function，不直接持有管理密钥

部署前按照 [Supabase 设置指南](docs/supabase-setup.html) 完成 SQL、Auth、Secrets 和 Edge Function 部署。

### Cover Generator

```text
http://localhost:8000/apps/cover-generator/
```

用于生成多种比例的视频封面。共享图片和 Photoshop 模板统一放在 `assets/creative/`。

## 数据与后端

- 数据结构：[data/schema.md](data/schema.md)
- CSV 导入源：`data/imports/`
- Supabase SQL：`supabase/sql/`
- Edge Function：`supabase/functions/gameup-api/`
- 前端公开配置：`apps/command-center/src/config.js`

前端配置只允许包含：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

`service_role`、数据库密码和 JWT secret 只能保存在 Supabase Secrets 中。

## 自动化与仓库脚本

创作者平台：

```text
automation/creator-platforms/
```

游戏资料巡检：

```text
automation/game-research/
```

Windows 启动本地站点：

```text
scripts/serve-windows.bat
```

macOS 启动本地站点：

```text
scripts/serve-macos.command
```

项目检查：

```powershell
node scripts/check-project.mjs
```

## 维护规则

1. 根目录只放仓库级文件和一级功能区。
2. 可运行页面放 `apps/`，共享素材放 `assets/`。
3. Supabase 相关 SQL 不再散落到根目录，统一放 `supabase/sql/`。
4. 只有运行兼容确实需要时才保留 `legacy/`；普通旧版本交给 Git 历史，不保留重复副本。
5. 新目录和代码文件使用小写 kebab-case。
6. 视频工作台正式路径保持稳定，升级只修改内部版本号和 changelog。
7. 项目导出的 WIP / DONE 文件存放在 Google Drive 或本地项目目录，不提交到仓库。
