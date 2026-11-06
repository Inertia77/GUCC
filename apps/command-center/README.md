# GameUp Command Center

Supabase 数据管理前端，用来维护角色、配队、版本、卡池和资源链接。

## 入口

```text
http://localhost:8000/apps/command-center/
```

页面会先检查 GUCC Access Key，再进入 Supabase Auth 登录。Access Key 是前端门禁，数据库权限仍由 Supabase Auth + Edge Function 控制。

## 功能

- 角色：搜索、详情/编辑、新增、删除、链接维护
- 阵容：按描述、成员、阵容研究状态（◯ / △ / ✕）搜索；不再判断账号持有，含「対象外」角色的配队不进入列表
- 机制：中文机制分类、研究状态（◯ / △ / ✕）、详情与参考链接；不再按来源性质分类
- 版本：展示上半/下半/常驻卡池，新出、复刻、常驻追加和备注
- 资源：查询资源链接
- 抽屉编辑：详情/新增都在右侧抽屉打开
- 搜索体验：输入框里按 `Enter` 可直接搜索

## 新增/编辑表单

角色链接和版本卡池已经改成结构化填空。角色保留「対象外」，阵容和机制只允许三种研究状态。老阵容 `OK` 迁为 `◯`，旧机制统一初始化 `✕`（待人工校准）；旧持有字段和旧来源字段保留为历史数据，不再参与保存、检索或展示：

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
   ├─ mechanisms.js
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
