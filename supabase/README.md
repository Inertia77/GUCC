# Supabase

Command Center 的后端配置、Edge Function 和 SQL 脚本。

| 路径 | 用途 |
|---|---|
| `config.toml` | Supabase CLI 项目配置 |
| `functions/gameup-api/` | Edge Function，负责鉴权、白名单和 RPC 转发 |
| `sql/01-check-schema.sql` | 检查现有表结构 |
| `sql/02-install-command-center.sql` | 安装/更新管理 RPC |
| `sql/03-register-owner.sql` | 注册 owner 用户到 `app_users` |

## 部署顺序

1. 在 Supabase SQL Editor 运行 `sql/01-check-schema.sql`。
2. 运行 `sql/02-install-command-center.sql`。
3. 创建 Supabase Auth 用户。
4. 修改并运行 `sql/03-register-owner.sql`。
5. 部署 `functions/gameup-api/index.ts`。
6. 设置 Edge Function Secrets。
7. 在前端 `apps/command-center/src/config.js` 填写公开配置。

## Edge Function Secrets

至少需要：

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
ALLOWED_ORIGINS
```

`ALLOWED_ORIGINS` 示例：

```text
https://inertia77.github.io,http://localhost:8000
```

本地测试 Command Center 时请用 `http://localhost:8000/apps/command-center/`。如果要用 `127.0.0.1:8000`，必须把 `http://127.0.0.1:8000` 加进 `ALLOWED_ORIGINS`。

## 安全边界

- 前端只放 Supabase URL、anon key 和 Edge Function 名。
- `service_role`、数据库密码、JWT secret 只放 Supabase Secrets。
- RPC 只授权给 `service_role`，由 Edge Function 统一校验用户和 `app_users` 白名单。
