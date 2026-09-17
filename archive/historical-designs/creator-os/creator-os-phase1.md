# GUCC Creator OS · Phase 1

## 目标

Phase 1 不增加新的独立工作流页面。它把已有 Creator Pipeline 汇总到 Portal，让日常入口先回答四个问题：

1. 现在最应该推进哪个项目？
2. 项目做到哪里？
3. 缺什么、为什么阻塞？
4. 点击后应该进入哪个模块和哪个项目？

## 真实基线

Phase 1 开始前已经存在：

- Production 项目状态机、唯一下一步、Locks 与标准文件合同；
- `creator_projects`、`creator_project_files`、`creator_project_events`、`creator_project_releases`；
- `creator-project-api` 的项目读写和发布记录同步；
- Production / Publish 的本地草稿与 Supabase 自动同步；
- Production → Publish 的同一 `project_id` 交接。

Phase 1 开始前不存在：

- Portal 跨项目 Dashboard；
- Today / Action Queue；
- 跨项目健康状态；
- 服务端 revision 并发保护；
- 冲突差异、保留一侧和保守三方合并；
- 从 Portal 深链到指定 Production / Publish 项目。

## Portal 数据流

Portal 登录后调用 `creator-project-api` 的 `dashboard` action，一次读取当前用户的项目、文件元数据和发布记录。浏览器使用纯函数 `creator-dashboard-core.mjs` 计算展示模型，不把健康状态和优先级重复写回数据库。

每个 Active Project 显示：

- 名称、游戏、Topic、类型；
- 当前状态和进度；
- Content / Script / Audio / Picture Locks；
- 目标发布日期、最近更新时间；
- revision；
- 健康状态、阻塞原因、缺失文件；
- 唯一下一步。

## Project Health

健康计算为只读、可测试的派生状态：

- `Ready`：状态合法，没有关键缺口；
- `Missing File`：当前输入、输出或发布资料缺失；
- `Blocked`：非法状态、越过未确认 Lock、本机与云端冲突；
- `Awaiting Review`：项目处于人工 Review 阶段。

另外保留警告而不擅自阻塞：目标日期临近或已过、十四天以上未更新、本机存在待同步修改。

## Action Queue

Action Queue 每个项目只给一个当前动作，按下列优先级排序：

1. 并发冲突或状态非法；
2. 已到 T+1 / T+3 / T+7 / T+30 且缺少数据快照；
3. 等待人工 Review；
4. 目标发布日期两天内或已经逾期；
5. 当前状态机的唯一下一步。

项目动作进入指定 Production Project；复盘动作进入指定 Publish Project。

## Revision / Conflict Protection

`creator_projects` 新增：

- `revision bigint not null default 1`；
- `last_device_id text`。

保存请求必须携带 `baseRevision`。数据库函数 `save_creator_project_revision` 在短事务内锁定项目行，只有 `baseRevision = revision` 才更新并将 revision 加一。项目 JSON 与对应文件元数据在同一事务提交。

如果服务器 revision 更新，Production 后台同步停止，不再静默覆盖。用户可以：

- 查看顶层差异；
- 保留云端；
- 明确保留本地并基于最新 revision 重试；
- 对非重叠修改执行三方合并。

双方同时修改同一区域时，自动合并拒绝继续，避免“看似成功、实际丢内容”。

## 兼容性

- 旧 Supabase 项目从 revision 1 开始，不改原项目 JSON；
- 旧 localStorage 项目第一次拉取云端时只补 cloud revision 元数据；
- 本机有未同步修改且云端 revision 已前进时进入冲突，不按时间戳覆盖；
- Google Drive ID、URL 与大文件边界保持不变；
- Publish Console 原数据结构保持兼容，并支持从 Portal 读取指定项目及发布记录；
- PWA 缓存升级到 v9，新 Dashboard 模块加入 App Shell；
- Portal 手机端保持单列项目卡和触控尺寸。

## 人工确认边界

Phase 1 不改变以下边界：Content Lock、Script Lock、Audio Lock、Picture Lock 和最终 Publish 仍必须由用户确认。
