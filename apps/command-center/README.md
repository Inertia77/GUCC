# Command Center

GUCC 的 Supabase 数据管理前端。

```text
GitHub Pages
  → Supabase Auth
  → Edge Function: gameup-api
  → PostgreSQL JSONB RPC
```

## 结构

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
7. 在 `src/config.js` 填写 Supabase URL 和 anon/publishable key。
8. 打开 `http://localhost:8000/apps/command-center/` 测试。

完整说明见 [Supabase 设置指南](../../docs/supabase-setup.html)。

项目检查：

```powershell
node scripts/check-project.mjs
```
