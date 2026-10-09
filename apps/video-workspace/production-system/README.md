# GameUp Creator OS｜统一创作中枢

正式入口：https://inertia77.github.io/GUCC/apps/video-workspace/production-system/

## 当前架构

统一导航只显示一个视频创作中枢。原 Studio 的选题/研究/文案、旧 Production 的编排与审核已在本页合并为一个 Project → Workflow → Prompt Flow → Current Task 流程。真正的封面编辑器（CG）和发布控制台（PUB）作为可选的专业工具保留，尚未自动同步它们各自的工具内部草稿。旧页面源代码和历史数据不删除，但不再显示为 GUCC 主导航入口。

- **Creator Project Root**：`public.creator_projects` 是正式项目身份，其他 GUCC 旧数据关系不被新工作台覆盖。
- **Creator OS Detail**：`public.creator_os_workspace_snapshots` 是每个正式 Project Root 对应的一份 Prompt、Contract、Workflow、进度与本工作台生命周期管理快照。现已建立 owner+project 外键，不再允许孤儿快照。
- **原子保存**：已登录白名单用户调用 `public.creator_os_save_project(p_project, p_expected_revision)`，事务内确认 Root 身份并以 revision 比较更新工作台快照；同 ID 同步冲突不会静默覆盖。
- **稳定身份**：项目数据库 `projectId` 为稳定主键；AI 提议的 PROJECT_ID 保存为 `projectCode`（可读别名），不会擅自变更主键或断开旧数据关系。
- **本地素材**：音视频、录音、真实项目文件、文件夹绝对路径和目录句柄只存在本机。目录雷达扫描文件名与相对层级并复制 Windows PowerShell 整理 Prompt；不上传文件。
- **身份安全**：Supabase Auth + app_users 白名单 + owner-only RLS；Web 客户端无 service_role key。

## 正常工作区与结构测试数据隔离

`ZZZ_3.3_FIONI_SEVERIAN_PREVIEW` 属于 `orchestrator.testFixture()` 的内置 QA 测试，不是正式项目。正常模式不会自动创建此样例，也不会显示在项目下拉框或项目总览中，更不会上传 Supabase。保留测试夹具文件仅供代码回归测试使用。

如果当前云端所有正式项目都已完成、归档或在回收站，制作桌面显示明确的「暂无进行中项目」占位，禁用执行类按钮。通过「项目档案」选择已完成/回收站项目可查看并恢复。测试夹具从旧浏览器缓存中过滤，不会删除任何正式项目。

## 项目生命周期（与制作工作流状态独立）

| 状态 | 条件 | 可见位置 |
|---|---|---|
| 进行中 | 未标记完成/归档/删除 | 默认项目列表 |
| 已完成 | `completedAt` | “已完成” |
| 已归档 | `archivedAt` | “已归档” |
| 回收站 | `deletedAt` | “回收站” |

上述优先级为：回收站 > 已归档 > 已完成 > 进行中。归档和完成均可恢复；“删除项目”使用 DELETE 二次确认，仅把 Creator OS 项目移入回收站，不会直接硬删除 root、锁定、外部发布记录、音视频或文件。**尚未实现永久数据库级删除。** 此设计防止多设备恢复旧副本和误伤旧生产数据。

“已完成”是用户对项目管理的标记，不等于通过所有 Prompt Node 或已经正式发布；系统不可伪造这些状态。

## 实际操作

1. “新建项目”填写自然语言想法；创建本地草稿，复制 Project Builder Prompt。
   - 在制作桌面顶部或右侧 PROJECT DOSSIER 点击「编辑项目 / 编辑资料」，也可从「项目档案」打开「编辑项目资料」。可以修改标题、原始想法、游戏、区服、版本、内容类型；保存后触发云同步。
   - 稳定的项目 `projectId`、既有工作节点、正式稿件与 Lock 不因修改资料被自动更换或重算；立项后改动核心事实时须复查相关内容。已在回收站的项目需先恢复。
2. Chat/Work 研究后返回 PROJECT_BRIEF、VIDEO_CONTRACT 以及对应 JSON；导入当前项目。
3. 复制 AI 流程编排 Prompt，得到项目专属 GUCC_FLOW_RESULT；导入后 Current Task 开始按依赖显示。
4. 每次复制 Current Task 给 Chat/Work/Codex，导入真实 GUCC_NODE_RESULT；重大 Lock 需要用户审核。没有自动调用 AI。
5. 音频、字幕、画面与 BGM/SFX 按锁定稿、真实 AUDIO_MASTER 时间轴、本地素材蓝图制作；CG/PUB 按需打开。
6. 在“项目档案”中搜索、标记完成、归档、移入回收站或恢复。登录后自动跨设备同步项目快照；云端版本冲突交用户决定。

## 实现与限制

主要文件：`creator-os-app.js`（交互/项目状态）、`creator-os-cloud.mjs`（云同步）、`creator-os-local-folder.mjs`（授权文件夹扫描）、`orchestrator.js`（任务编排）、`nte-urban-theme.css`（游戏都市异象风皮肤）、`../../../../assets/gucc-shell.js`（统一导航）。

既有 `creator_projects.current_state`、正式生产 Lock 与其他创作模块的独立内容均不被本工作台生命周期标记重写。已关联的旧正式项目只通过新增工作台快照展示，不冒充旧状态机已经迁移完成。CG/PUB 属于独立工具，不应谎称能自动写回 Prompt Flow。

## QA

- 2026-10：数据库事务测试在回滚环境通过，3 个正式 Root 与 3 个快照全部关联，0 个孤儿，无测试残留。
- 修改后代码检查：脚本语法、导航入口、浏览器 ID、状态按钮、云端 RPC、缓存与关键连接点通过。
- **尚待用户实际浏览器端验收**：Supabase 登录会话、跨设备冲突交互、本地目录权限、封面/投稿工作流跳转及响应式截图。静态测试不等于线上端到端验证。
