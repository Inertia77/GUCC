# Supabase

Command Center 的后端配置、Edge Function、SQL 安装脚本和版本化迁移。

| 路径 | 用途 |
|---|---|
| `config.toml` | Supabase CLI 项目配置 |
| `functions/gameup-api/` | Edge Function，负责鉴权、白名单和 RPC 转发 |
| `sql/01-check-schema.sql` | 检查现有表结构 |
| `sql/02-install-command-center.sql` | 基础安装/更新管理 RPC |
| `sql/03-register-owner.sql` | 注册 owner 用户到 `app_users` |
| `migrations/` | 已进入生产的版本化数据库变更；以后结构/RPC 修改以这里为准 |

## 变更原则

数据库与 GUCC 代码视为一个整体：RPC 名称、JSON payload 和返回结构是前后端契约。修改数据库时必须同时提交对应 migration，并让 `npm test` 的 Supabase contract regression test 通过。禁止只在 SQL Editor 临时改线上而不留版本记录。

当前生产完整性加固基线：`migrations/20260825_gucc_integrity_hardening.sql`。

## 新环境部署顺序

1. 在 Supabase SQL Editor 运行 `sql/01-check-schema.sql`。
2. 运行 `sql/02-install-command-center.sql`。
3. 按时间顺序执行 `migrations/` 中尚未应用的 migration。
4. 创建 Supabase Auth 用户。
5. 修改并运行 `sql/03-register-owner.sql`。
6. 部署 `functions/gameup-api/index.ts`。
7. 设置 Edge Function Secrets。
8. 在前端 `apps/command-center/src/config.js` 填写公开配置。
9. 运行 `npm test` 做联动回归。

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
- 管理 RPC 只授权给 `service_role`，由 Edge Function 统一校验用户和 `app_users` 白名单。
- `SECURITY DEFINER` 管理函数不得直接授权给 `anon` / `authenticated`。
- 公开 schema 新表默认启用 RLS，但不要为了消除 linter 提示而随意给客户端角色开放表级 policy。
