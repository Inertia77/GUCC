# GameUp Creator OS v2｜AI-first Project System

入口：

~~~text
https://inertia77.github.io/GUCC/apps/video-workspace/production-system/
~~~

Legacy 固定 23-state 页面保留：

~~~text
/apps/video-workspace/production-system/legacy-v1.html
~~~


## v2.1｜Studio Edition（界面与执行链修复）

- 首页重构为 **Current Task** 单主操作：现在要做什么、由谁做、输入和产物是什么。完整 Prompt 默认收起，点击「复制当前 Prompt」无需反复查找。
- 52 个测试 Node 不再在首页同时铺开：只展示近期 6 个节点，支持按需展开全部；点击任意节点先预览，再决定是否复制。
- 01～07 宏观地图折叠至「制作生命周期」；Core Rules / Capability / Global Libraries 移到维护页面，避免与日常制作混在一起。
- 视觉改为克制的深空蓝黑、薄荷青、低饱和金与精细线条；面向桌面 / 平板 / 手机独立响应。
- 修复双视频分支：一个分支等待 Q3 或外部条件时，不会阻止另一分支继续执行已有依赖的任务。
- Project Builder 的 VIDEO_CONTRACT JSON 可以直接导入；下一任务自动变成 AI Prompt Flow Compiler；编排 AI 产出 GUCC_FLOW_RESULT 后可导入完整 Prompt Flow。
- AI 生成的外部 Flow 每节点自动补充稳定 Capability DNA / Guardrail；不可借导入把任务伪装成 DONE。导入流程校验未知 Capability、重复 ID、缺失依赖和依赖环。
- 显式区分「AI 编排（推荐）」和「本地结构草案」。后者不会执行研究，且重新编译已有进度前要求确认。
- 将旧 v1 Creator 浮层从 v2 页面隔离，避免旧同步/归档 UI 叠加。旧页面保留原功能。
- LOCK 的人工确认只在浏览器项目分支记录，不声称已经触发正式云端 Human Lock。不能通过普通「标记完成」随意跳过尚未执行的 Node。
- 可选择从旧浏览器 Production 存储只读导入项目基本信息；原项目/历史/锁状态不被修改。
- **目前新版项目状态仅保存在该浏览器 localStorage；没有实现到生产 Supabase 的自动双向写入或实时同步。** 文件/云端写入仍须真实调用并回读，不能因 UI 显示就声称已完成。

### QA

- \`scripts/test-creator-os-v2.cjs\` 已加入离线 DOM 模拟的 Builder → Compiler → Flow → Current Task 功能回归。
- \`scripts/check-project.mjs\`、\`scripts/test-uiux-contract.cjs\` 和 \`scripts/test-creator-workspace-root.cjs\` 已对齐新旧页面的职责。
- \`sw.js\` 更新到缓存 v30；首页 CSS/JS 资源查询版本 v2.1.0。
- 真实浏览器端到端截图/全仓 \`npm test\` 必须在可运行完整仓库的环境再执行；源代码静态检测不能替代视觉验收。

## 定位

v2 不再把视频制作理解成一条固定 Prompt 流水线。

真实执行逻辑：

~~~text
PROJECT
  ↓
PROJECT_WORKFLOW
  ↓
PROJECT_PROMPT_FLOW
  ↓
CURRENT_TASK
  ↓
Capability
~~~

01～07（选题/立项 → 研究/证据 → 结构/文案 → 声音/时间线 → 视觉/素材 → 剪辑/成片 → 发布/复盘）继续保留为 **Human-facing Production Map**，用于理解生命周期，不决定 Prompt 必须按编号执行。

默认 AUTONOMY_LEVEL = L2。

AI 主动研究、规划、生成、QC 与小范围 Workflow 调整；用户主要负责重大方向、LOCK、必须人类输入、真人录音、最终成片与发布。

## Information Architecture

- 00｜Core Rules：Evidence / Script / Audio-Timeline / Asset / Visual / Codex / Publish；HARD STOP / SOFT UNCERTAINTY；Q0～Q3。
- 01｜Project System：Create Project / Current Projects / Current Task / Build Project Prompt Flow / Update Project Prompt Flow。
- 02｜Capability Library：Research / Source / Writing / Audio / Visual / Edit / Publish。
- 03｜Global Libraries：复用现有 creator_research_sources / creator_assets / creator_project_files / Publish / Analytics / Learning。
- 04｜Projects：PROJECT_BRIEF / VIDEO_CONTRACT / PROJECT_WORKFLOW / PROJECT_PROMPT_FLOW / CURRENT_TASK。

## 数据库策略

**本次没有新增重复数据库表。**

现有 Creator 数据模型已经能够承载新版系统：

- creator_projects：Content Project Root
- creator_project_files：逻辑 Artifact Registry
- creator_research_sources：Source Library
- creator_assets：Asset Library
- Language Track / Visual Master / Variant：继续处理音频、时间线、视觉与发布 identity

PROJECT_WORKFLOW.md、PROJECT_PROMPT_FLOW.md、CURRENT_TASK.md、PROJECT_BRIEF.md、VIDEO_CONTRACT.md 属于 **project-scope logical artifacts**，可以继续使用既有 (project_id, artifact_scope_type, artifact_scope_id, file_key) 模型，不需要机械新建表。

媒体仍保留本地；不得把视频、音频和大制作素材上传 Git。

## Capability Library

Capability 不是步骤编号。每个 Capability 保存 PURPOSE、WHEN_TO_USE / WHEN_NOT_TO_USE、REQUIRED_INPUT / OPTIONAL_INPUT、CORE_METHOD、MANDATORY_GUARDRAILS、Failure Prevention refs、QUALITY_GATE、OUTPUT_SCHEMA、DEFAULT_EXECUTOR / ALTERNATIVE_EXECUTOR、CHAT_FALLBACK、PROJECT_INJECTION、SKIP_CONDITION、HARD_STOP_CONDITION、QC_LEVEL / REVIEW_MODE 与 Legacy Prompt 来源。

旧 apps/video-workspace/notion-prompts.json 完整保留；legacy-prompt-migration.json 只做迁移映射，不删除旧经验。

## Prompt Flow

项目定义后可编译完整 PROJECT_PROMPT_FLOW。每个 Node 包含 PROMPT_ID / NAME / PURPOSE / EXECUTOR / WHEN / DEPENDENCIES / REQUIRED_INPUT / OPTIONAL_INPUT / READ_FROM_PREVIOUS / CAPABILITY_USED / 完整 PROMPT / EXPECTED_OUTPUT / SAVE_AS / QUALITY_GATE / HARD_STOP / SOFT_UNCERTAINTY_POLICY / SKIP_CONDITION / NEXT / CHAT_FALLBACK / QC_LEVEL / REVIEW_MODE。

执行过程中只做 DIFF：ADD / REMOVE / MERGE / SKIP / REORDER / REPLACE。

## QC 与 Review

- Q0：Basic Auto Check
- Q1：AI Self-QC
- Q2：Independent AI QC
- Q3：Human Review

REVIEW_OPTIONAL 不阻塞。APPROVAL_REQUIRED 只用于重大方向、LONG/SHORT/CANCEL、SCRIPT_LOCK、修改 LOCK、必须人类输入、最终成片和发布等真正重要节点。

## HARD STOP

只有继续会制造虚假、伪造或无法成立的产物时才 NEED_INPUT，例如：没有最终 AUDIO_MASTER 却要求真实时间线；视频不可访问却要求确认具体画面；没正式服证据却要求声称正式服实测；写入失败却要求声称已保存；未 Reopen / 无充分新证据却要修改 LOCK。

普通缺失使用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED，继续能完成的部分。

## Test Fixture

固定测试项目：ZZZ_3.3_FIONI_SEVERIAN_PREVIEW

位置：fixtures/ZZZ_3.3_FIONI_SEVERIAN_PREVIEW/

验证：双视频共用一个项目；Shared Source；直播前不能写完整正文；等待 Special Program；YouTube 官方 Master + 字幕；Codex 直接本地分析 Master；PROXY = NOT_PLANNED；菲欧妮 / 赛维里安分别 Research；分别 LONG / SHORT / CANCEL Gate；各自 Script / Audio / Timeline / Visual / Edit / Publish。

测试仅验证 Project Builder / Workflow / Prompt Flow / Current Task，不开始制作未来视频内容。

## 文件

- core-rules.js：长期规则、Autonomy、QC、Hard Stop
- failure-prevention.js：历史踩坑规则
- capability-library.js：成熟能力模块
- orchestrator.js：Project / Workflow / Prompt Flow Compiler
- creator-os-app.js：当前 UI
- legacy-prompt-migration.json：旧 Prompt → 新能力映射
- ../notion-prompts.json：旧 Prompt 母库，继续保留
- legacy-v1.html：旧固定 Production System UI

## 测试

~~~bash
node scripts/test-creator-os-v2.cjs
npm test
~~~