# Supabase migrations

这里保存已经进入生产或准备进入生产的版本化数据库变更。

## 基本规则

1. 数据库结构、RPC、权限、索引等变更必须有 migration 文件。
2. 与 Command Center 有关的 RPC 名称、JSON payload、返回结构属于稳定契约；兼容性变化必须同步前端与测试。
3. 先备份/验证，再应用生产；应用后跑 Supabase Advisor、数据完整性查询和 `npm test`。
4. 不把个人偏好、喜欢度等主观数据混进结构迁移；客观数据修正应注明依据。
5. 已经应用到生产的 migration **不可原地修改**；出现问题必须追加 corrective migration（纠正迁移）。

## 历史阶段（2026-08-25 ～ 2026-08-26 08:57 JST）

早期生产维护曾采用“生产拆分 migration + 仓库 rollup（汇总迁移）”模式，因此该阶段的 Supabase production history 与仓库文件不是严格 1:1。仓库中的 `20260826_gucc_metadata_maintenance_rollup.sql` 等文件用于重放历史最终状态，旧 history 不再重写。

## 严格 1:1 checkpoint

从生产 migration：

`20260826085831_gucc_cn_version_and_character_facts_20260826`

开始，进入严格同步阶段：

- 每一次生产 migration 都必须在本目录存在一份**完全对应**的 SQL 文件。
- 文件名格式固定为 `<14位生产version>_<production_name>.sql`。
- production version 和 migration name 必须直接取自 Supabase `list_migrations` 的实际结果，不自行猜时间戳。
- DB 与 GitHub 必须在同一维护批次完成：生产应用 → 回读 version → 写入仓库 → CI → 合并 main → 再次回读验证。
- 不再新增新的 rollup 代替生产 history。

当前严格同步起点后的第一批文件：

- `20260826085831_gucc_cn_version_and_character_facts_20260826.sql`
- `20260826085937_gucc_schema_guardrails_resources_creator_20260826.sql`
- `20260826090148_gucc_core_game_mechanisms_seed_20260826.sql`
- `20260826090225_gucc_creator_project_sync_triggers_20260826.sql`
- `20260826090950_gucc_creator_owner_fk_indexes_20260826.sql`

其中 `20260826090950...` 是 Advisor 发现复合外键覆盖索引不足后追加的纠正迁移，示范“已应用 migration 不改写，只追加修复”的规则。

2026-08-25 起，生产库不再依赖“只在 SQL Editor 手工改、仓库无记录”的维护方式；2026-08-26 08:58:31 起进一步升级为 production history 与 GitHub migration 严格 1:1。
