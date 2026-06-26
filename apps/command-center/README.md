# GameUp Command Center

Supabase 数据管理前端，用来维护角色、配队、版本和资源链接。

## 入口

```text
http://localhost:8000/apps/command-center/
```

线上通过 GUCC Portal 进入。后端测试请使用 `localhost:8000`，不要用 `127.0.0.1:8000`，除非 Supabase Edge Function 的 `ALLOWED_ORIGINS` 已允许它。

## 架构

```text
静态前端
  -> Supabase Auth
  -> Edge Function: gameup-api
  -> PostgreSQL JSONB RPC
```

前端不会直接持有管理密钥，也不直接写十几张表。

## 功能

- 角色：搜索、详情、编辑、新增、删除。
- 配队：按描述、成员、类型、状态、持有状态搜索。
- 版本：按版本和卡池角色搜索；列表按上半/下半/常驻分组显示卡池。
- 资源：搜索资料链接。
- 编辑器：角色、配队、版本都使用右侧抽屉，不再跳到页面底部。
- 搜索栏：输入后按 `Enter` 可直接搜索。

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

1. 运行 `../../supabase/sql/01-check-schema.sql`。
2. 运行 `../../supabase/sql/02-install-command-center.sql`。
3. 创建 Supabase Auth 用户。
4. 修改并运行 `../../supabase/sql/03-register-owner.sql`。
5. 部署 `../../supabase/functions/gameup-api/index.ts`。
6. 设置 `ALLOWED_ORIGINS` 等 Edge Function Secrets。
7. 在 `src/config.js` 填写 Supabase URL 和 anon key。
8. 打开本地入口测试。

完整说明见 [Supabase 设置指南](../../docs/supabase-setup.html)。

## 常见问题

`Failed to fetch` 通常是 CORS、网络或 Edge Function 配置问题。先确认当前页面地址是：

```text
http://localhost:8000/apps/command-center/
```

然后确认 Supabase 的 `ALLOWED_ORIGINS` 包含 `http://localhost:8000`。
