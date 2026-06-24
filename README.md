# GUCC - GameUp Command Center

GUCC 是一个个人用的游戏资料、创作资料、数据库管理、静态工具集合项目。

当前项目采用“旧工具保留 + 新数据库管理系统独立接入”的结构：

- 旧版静态工具继续保持原路径，避免破坏已有功能。
- 新版 GameUp Command Center 数据库管理前端放在 `apps/gameup-command-center/`。
- Supabase Edge Function 后端源码放在 `supabase/functions/gameup-api/`。
- SQL / RPC / 权限相关脚本放在 `sql/`。
- 部署和操作指南放在 `docs/`。

---

## 1. 项目入口

本地启动后，优先打开：

```text
http://localhost:8000/
```

GitHub Pages 部署后，优先打开：

```text
https://Inertia77.github.io/GUCC/
```

根目录的 `index.html` 是 GUCC 总入口页，用来跳转到各个功能区。

---

## 2. 当前目录结构

```text
GUCC/
├─ index.html
├─ CUCC_index_v3.8.7.html
├─ .gitignore
├─ .nojekyll
├─ README.md
│
├─ apps/
│  └─ gameup-command-center/
│     ├─ index.html
│     ├─ README.md
│     ├─ src/
│     │  ├─ api.js
│     │  ├─ auth.js
│     │  ├─ config.example.js
│     │  ├─ config.js
│     │  ├─ main.js
│     │  └─ ui.js
│     └─ styles/
│        └─ app.css
│
├─ supabase/
│  ├─ config.toml
│  └─ functions/
│     └─ gameup-api/
│        └─ index.ts
│
├─ sql/
│  ├─ 01_check_schema.sql
│  ├─ 02_app_backend_jsonb_rpc.sql
│  └─ 03_register_owner_template.sql
│
├─ docs/
│  ├─ setup_guide_v5.html
│  └─ setup_guide_v5_original.html
│
├─ tools/
│  └─ gameup-command-center/
│     ├─ run_local_server.bat
│     ├─ run_local_server.command
│     └─ test_edge_function_curl.txt
│
├─ Data/
│  ├─ DB_Structure.md
│  ├─ INERTIA【３】Game＆Create - DB_Character.csv
│  ├─ INERTIA【３】Game＆Create - DB_Party.csv
│  ├─ INERTIA【３】Game＆Create - DB_Info_version.csv
│  ├─ INERTIA【３】Game＆Create - DB_Info_wiki.csv
│  ├─ INERTIA【３】Game＆Create - DB_Info_status.csv
│  ├─ INERTIA【３】Game＆Create - DB_Mechanism.csv
│  └─ INERTIA【３】Game＆Create - DB_-Platforms-.csv
│
├─ Query_Manual/
│  ├─ gameup_query_library_forFuture.md
│  └─ gameup_query_manual_simple.md
│
├─ BackupFromOld/
├─ Batches_Games_Info/
└─ Batches_GameUp_Creator/
```

---

## 3. 主要功能区

### 3.1 GUCC Portal

位置：

```text
index.html
```

用途：

- GUCC 总入口
- 跳转到新版数据库管理系统
- 跳转到旧版 CUCC 页面
- 跳转到封面生成工具
- 跳转到文档和数据资料

---

### 3.2 旧版 CUCC 静态页面

位置：

```text
CUCC_index_v3.8.7.html
```

用途：

- 保留旧版静态工具入口
- 当前不重构、不移动、不破坏路径

---

### 3.3 新版 GameUp Command Center

位置：

```text
apps/gameup-command-center/
```

用途：

- 连接 Supabase
- 登录 / 注册
- 查询角色
- 管理角色资料
- 管理配队资料
- 管理版本资料
- 管理资源链接

本地访问：

```text
http://localhost:8000/apps/gameup-command-center/
```

GitHub Pages 访问：

```text
https://Inertia77.github.io/GUCC/apps/gameup-command-center/
```

---

### 3.4 Supabase Edge Function 后端

位置：

```text
supabase/functions/gameup-api/index.ts
```

用途：

- 作为前端和 Supabase 数据库之间的 API 层
- 校验登录用户
- 检查 `app_users` 权限
- 调用 PostgreSQL JSONB RPC
- 避免前端直接管理十几张数据库表

注意：

这个目录只是源码位置，不会被 GitHub Pages 直接运行。  
真正运行时，需要通过 Supabase CLI 部署到 Supabase。

---

### 3.5 SQL 脚本

位置：

```text
sql/
```

当前文件：

```text
01_check_schema.sql
02_app_backend_jsonb_rpc.sql
03_register_owner_template.sql
```

用途：

- 检查当前数据库结构
- 创建后端 RPC / View / 权限辅助函数
- 注册自己的 Supabase Auth 用户为系统 owner

---

### 3.6 原始数据

位置：

```text
Data/
```

用途：

- 保留从 Google Sheets / Excel 导出的 DB_ 开头 CSV
- 保留数据库结构说明
- 当前作为资料源和备份，不作为前端直接读取的数据源

---

### 3.7 查询手册

位置：

```text
Query_Manual/
```

用途：

- 保存常用 SQL 查询
- 保存未来查询模板
- 保存数据库操作说明

---

### 3.8 旧静态素材和工具

位置：

```text
BackupFromOld/
```

用途：

- 保留旧版静态资源
- 保留封面生成工具
- 保留百科资料
- 保留 PS 模板

当前阶段不要移动这里面的文件，否则旧工具可能出现图片路径失效。

---

## 4. 本地启动方式

在 GUCC 根目录执行：

```powershell
cd "C:\Users\daixin.tan\GitHub\GUCC"
python -m http.server 8000
```

然后打开：

```text
http://localhost:8000/
```

推荐测试顺序：

```text
http://localhost:8000/
http://localhost:8000/CUCC_index_v3.8.7.html
http://localhost:8000/apps/gameup-command-center/
http://localhost:8000/BackupFromOld/Tool_Covers/CoverGenerator.html
http://localhost:8000/docs/setup_guide_v5.html
```

---

## 5. GitHub Pages 部署方式

GitHub 仓库设置：

```text
Settings
→ Pages
→ Build and deployment
→ Source: Deploy from a branch
→ Branch: main
→ Folder: /root
→ Save
```

部署后入口：

```text
https://Inertia77.github.io/GUCC/
```

新版数据库管理前端：

```text
https://Inertia77.github.io/GUCC/apps/gameup-command-center/
```

---

## 6. Supabase 前端配置

配置文件位置：

```text
apps/gameup-command-center/src/config.js
```

示例：

```javascript
export const CONFIG = {
  SUPABASE_URL: "https://your-project-ref.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key",
  EDGE_FUNCTION_NAME: "gameup-api"
};
```

可以放在前端 / GitHub 的内容：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

绝对不要放在前端 / GitHub 的内容：

```text
database password
service_role key
JWT secret
.env
```

---

## 7. Supabase Edge Function 设置

Edge Function 源码：

```text
supabase/functions/gameup-api/index.ts
```

Supabase 后台 / CLI 需要设置 Secrets：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ALLOWED_ORIGINS
```

`ALLOWED_ORIGINS` 示例：

```text
http://localhost:8000,https://inertia77.github.io
```

注意：

GitHub Pages 的 origin 是：

```text
https://inertia77.github.io
```

不是：

```text
https://inertia77.github.io/GUCC
```

---

## 8. Git 操作

查看变更：

```powershell
git status
```

添加全部文件：

```powershell
git add .
```

提交：

```powershell
git commit -m "Add GUCC portal and integrated project structure"
```

推送：

```powershell
git push origin main
```

---

## 9. 当前阶段的原则

当前阶段只做整合，不做大规模重构。

保留不动：

```text
BackupFromOld
Batches_Games_Info
Batches_GameUp_Creator
Data
Query_Manual
CUCC_index_v3.8.7.html
```

新增并独立管理：

```text
apps/gameup-command-center
supabase/functions/gameup-api
sql
docs
tools/gameup-command-center
```

这样可以保证旧工具不受影响，新功能也可以继续推进。

---

## 10. 后续计划

### Phase 1：本地结构整合

- [x] 新增 GUCC Portal
- [x] 新增新版数据库管理前端目录
- [x] 新增 Supabase Edge Function 源码目录
- [x] 新增 SQL / docs / tools 目录
- [ ] 本地静态页面测试

### Phase 2：Supabase 后端打通

- [ ] 运行 `sql/01_check_schema.sql`
- [ ] 运行 `sql/02_app_backend_jsonb_rpc.sql`
- [ ] 在 Supabase Auth 创建用户
- [ ] 修改并运行 `sql/03_register_owner_template.sql`
- [ ] 部署 `gameup-api` Edge Function
- [ ] 设置 Supabase Secrets

### Phase 3：GitHub Pages 发布

- [ ] 配置 `apps/gameup-command-center/src/config.js`
- [ ] 本地测试
- [ ] push 到 GitHub
- [ ] 开启 GitHub Pages
- [ ] 线上测试

### Phase 4：旧功能整理

- [ ] 检查旧封面工具路径
- [ ] 检查旧 CUCC 页面路径
- [ ] 检查 BAT 文件路径
- [ ] 再决定是否把旧目录移动到 `assets/`、`tools/`、`docs/`

---

## 11. 安全提醒

不要提交任何密钥文件。

尤其不要提交：

```text
.env
service_role key
database password
JWT secret
```

前端只允许出现：

```text
SUPABASE_URL
SUPABASE_ANON_KEY
```

service role key 只能放在 Supabase Edge Function 的 Secrets 里。

---

## 12. 维护原则

这个项目现在是一个综合工作台，不再是单个 HTML 文件。

核心原则：

```text
旧功能稳定优先
新功能独立接入
数据库统一管理
前端只做交互
后端负责权限和写库
SQL 负责结构和数据逻辑
```

简单说：不要把所有东西塞进一个 HTML，也不要动不该动的旧路径。  
先稳住，再进化。
