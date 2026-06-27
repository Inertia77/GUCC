# GameUp Command Center

Supabase 数据管理前端，用来维护角色、配队、版本、卡池和资源链接。

## 入口

```text
http://localhost:8000/apps/command-center/
```

页面会先检查 GUCC Access Key，再进入 Supabase Auth 登录。Access Key 是前端门禁，数据库权限仍由 Supabase Auth + Edge Function 控制。

## 功能

- 角色：搜索、详情/编辑、新增、删除、链接维护
- 配队：按描述、成员、状态、持有状态搜索
- 版本：展示上半/下半/常驻卡池，新出、复刻、常驻追加和备注
- 资源：查询资源链接
- 抽屉编辑：详情/新增都在右侧抽屉打开
- 搜索体验：输入框里按 `Enter` 可直接搜索

## 新增/编辑表单

角色链接和版本卡池已经改成结构化填空：

- 角色链接：标题、URL、关系类型、来源、备注
- 版本卡池：阶段、类型、角色/对象、备注

保存时前端会自动转换为后端 RPC 需要的 `links` 和 `banners` JSON 数组，不需要手写 JSON。

## 文件结构

```text
index.html
styles/app.css
src/
├─ main.js
├─ config.js
├─ config-state.js
├─ auth.js
├─ api.js
├─ ui.js
└─ features/
   ├─ characters.js
   ├─ parties.js
   ├─ versions.js
   └─ resources.js
```

## 部署顺序

1. 执行 `../../supabase/sql/01-check-schema.sql`
2. 执行 `../../supabase/sql/02-install-command-center.sql`
3. 创建 Supabase Auth 用户
4. 修改并执行 `../../supabase/sql/03-register-owner.sql`
5. 部署 `../../supabase/functions/gameup-api/index.ts`
6. 设置 `ALLOWED_ORIGINS` 等 Edge Function Secrets
7. 在 `src/config.js` 填入 Supabase URL 和 anon key
8. 用 `http://localhost:8000/apps/command-center/` 测试

完整说明见 [Supabase 设置指南](../../docs/supabase-setup.html)。
