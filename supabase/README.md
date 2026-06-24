# Supabase

- `config.toml`：Supabase CLI 项目配置。
- `functions/gameup-api/`：Command Center 的 Edge Function。
- `sql/`：结构检查、RPC 安装和 owner 注册脚本。

推荐执行顺序：

1. `sql/01-check-schema.sql`
2. `sql/02-install-command-center.sql`
3. 创建 Auth 用户
4. 修改并运行 `sql/03-register-owner.sql`
