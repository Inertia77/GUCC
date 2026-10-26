# GameUp Creator OS v2

正式入口保持 `apps/video-workspace/`，现在会直接进入 AI-first Project System：

`apps/video-workspace/production-system/`

新版不再要求用户在几十条 Prompt 里手动找固定编号。核心操作改为：

- Create Project
- Current Projects
- Current Task
- Build Project Prompt Flow
- Update Project Prompt Flow
- Capability Library

01～07 继续作为 Human-facing Production Map；真实执行由 Project Workflow / Project Prompt Flow 动态编排。

旧 v6 Prompt Studio 仍保留：

`apps/video-workspace/legacy-prompt-studio-v6.html`

旧 `notion-prompts.json` 与 `ai-prompts.js` 不删除，作为成熟 Prompt DNA 与历史兼容来源；新版迁移映射位于 `production-system/legacy-prompt-migration.json`。

## 新版文件

- `production-system/core-rules.js`：Evidence / Script / Timeline / Asset / Visual / Codex / Publish / Autonomy 规则。
- `production-system/failure-prevention.js`：历史踩坑与 Failure Prevention。
- `production-system/capability-library.js`：Research / Source / Writing / Audio / Visual / Edit / Publish 能力模块。
- `production-system/orchestrator.js`：Project Builder、Workflow、Prompt Flow、Current Task、DIFF Update。
- `production-system/creator-os-app.js` / `creator-os.css`：AI-first Project System UI。
- `production-system/fixtures/ZZZ_3.3_FIONI_SEVERIAN_PREVIEW/`：结构测试项目。
- `production-system/legacy-v1.html`：旧固定 Production System。
- `legacy-prompt-studio-v6.html`：旧 Prompt Studio。

## 数据

新版复用现有 Creator 数据模型，不新建重复数据库表。Project Workflow / Prompt Flow / Current Task 属于 project-scope logical artifacts；媒体继续 local-first，不上传 Git。

## 剧情人物解析：2026-10-26 制作反馈（通用规则，非项目状态）

本轮把人物解析视频制作中实际发生的返工，沉淀到可复用的失败防范与六项成果生成提示中；不修改任何单视频锁稿、素材库或项目进度。

- **封面发布兑现**：生成前检查正文能否回答标题/封面问题，以及反差是否符合常识因果；若只解释触发机制或部分线索，不能承诺能力起源或完整真相。角色须先对照官方参考、生成后再核脸型/发型/服饰/饰物/武器与可读文字，三个比例独立审查。
- **剪映AI朗读**：默认每cue不超过当前实际UI允许字数，提供500字符安全版并按需提供300字符兼容版；按自然意群减少朗读段数、不强凑字数；在TTS专用SRT中安排清楚的大间隔时间槽。发音安全化需记录每项替换，校验段序、漏重字及SCRIPT_LOCK一致性；占位时间不得用作FINAL.srt。
- **视觉预制**：用户不愿补录实机且官方PV/剧情等已有素材足够时，可跳过补录；取得SCRIPT_LOCK即可并行生成可播放的剧情关系、档案、HUD与像素解释资产，保留语义锚点，正式音画时码等待真实音频/字幕。
- **六平台发布**：每平台默认一套可直接复制的首选稿，备选仅在策略确有差异时添加；B站/YouTube章节依据真实时间线，弹幕投票不凑数，按实时官方投稿规则处理AI语音声明与版权信息。
- **验证**：`scripts/test-creator-os-v2.cjs` 加入上述基础回归断言，避免后续模板更新又恢复“至少5个标题”等冲突要求。

## 维护与验证

`node scripts/test-creator-os-v2.cjs` 校验 Core Rules、Capability、旧 Prompt 映射、测试项目 Prompt Flow 与 Current Task。该测试已加入 `npm test`。

下面保留 v6 Prompt Studio 的历史变更记录，供迁移/回归参考。

## v6.1.0

- 空的“本轮补充”不再生成“未提供；不猜”；同一 Chat 默认继承已确认上下文，只有真正缺关键输入才补充。
- 「朗读与录音准备」新增真人录音 / 剪映 AI 朗读切换。AI 模式生成 `TTS_TEMP.srt`（每 cue ≤500 可见字符，目标 430–490）、`TTS_PRONUNCIATION_MAP.md` 与 `TTS_README.md`。
- `TTS_TEMP.srt` 仅用于剪映 AI 朗读，时间码是导入占位，不进入最终时间真值；最终 `FINAL.srt` 仍显示 SCRIPT_LOCK 原文，时间由生成后的 `AUDIO_MASTER` 决定。


## v6.1.1

- Chat 备用子步骤现在各自显示真正需要的输入与本步正式产物，不再重复显示任务级总输入/输出。
- 工作台自动生成稳定 `PROJECT_ID`：`游戏代码-JST日期-内容类型-4位短哈希`；立项通过后 `VIDEO_CONTRACT.md` 直接沿用，不要求用户手工命名。
- 已导入的 `VIDEO_CONTRACT.md` 若已有 PROJECT_ID，则优先保留该 ID。


## v6.1.2

- 对所有 Chat 分步/备用任务逐项校正“需要提供 / 正式产物”，每一步只显示本步真实依赖和本步能交付的结果。
- 切换任务时自动回到该任务推荐执行环境，避免上一个任务的 Chat / Work / Codex 状态误带到新任务。
- 本地文件型任务收紧环境：下载与 Proxy、动态视觉渲染、声音资产制作、本地整理、最终渲染以 Codex 为首选，不再把 Work 当成本地执行器。
- 区分“Chat 分步”（Chat 本身是主环境）与“Chat 备用”（首选 Work/Codex，额度不足时用 Chat）。单一子步骤不再显示无意义的备用流程。
- 自动 PROJECT_ID 的短哈希现在同时考虑游戏、区服、版本、内容类型与主题，降低同日项目碰撞。
- 剪映四件套任务不再把尚未导出的 `FINAL_MASTER.mp4` 写成 AI 正式产物。


## v6.1.3

- Hotfix：修复 v6.1.2 子步骤 I/O 改造后 `renderPrompt()` 未绑定当前 part，导致 Prompt 文本框及输入/产物区域停止渲染的问题。
- 当前子步骤现在显式绑定 `p = ps[state.part] || ps[0]`；所有任务继续按 v6.1.2 的独立 I/O 规则工作。


## v6.1.4

- 工作台不再自动生成、显示或维护 PROJECT_ID；修改标题 / 游戏 / 版本不会触发 ID 变化。
- PROJECT_ID 回归「项目约定 / VIDEO_CONTRACT」Prompt：AI 根据已通过的立项信息自动提出人类可读 ID，例如 `ZZZ-3.3-菲欧妮前瞻`，用户无需手工命名。
- 已有 VIDEO_CONTRACT 中的 PROJECT_ID 必须原样沿用；ID 一旦被接受，标题措辞变化不自动改名，只有明确新建项目或要求改 ID 时才重新生成。
