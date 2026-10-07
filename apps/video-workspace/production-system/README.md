# GameUp Creator OS v2｜AI-first Project System

入口：

~~~text
https://inertia77.github.io/GUCC/apps/video-workspace/production-system/
~~~

Legacy 固定 23-state 页面保留：

~~~text
/apps/video-workspace/production-system/legacy-v1.html
~~~

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