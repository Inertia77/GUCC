# GUCC Creator Workflow Hub

`/apps/video-workspace/` 是创作总览：七个 Macro Stage 映射现有 Production / Global 状态，展示当前项目、唯一下一步、纵向制作流程和横向共享能力。它只读项目，不编辑项目数据或设置 Human Lock。

## 入口职责

- **Workflow Hub**：理解完整流程，选择项目，打开已有 AI Task 指令。
- **[Production](./production-system/)**：正式项目执行、文件登记、Timeline、Storyboard、Locks、Global Production。项目状态以现有系统为准。
- **[Publish Console](../publishing-console/)**：平台适配、人工发布交接与复盘。
- **[Cover Generator](../cover-generator/)**：封面制作。
- **[旧 Studio](./legacy/studio-v5.1.html)**：兼容历史草稿的导入、Markdown / JSON 输出与转入 Production；不再是新项目的正式入口。它的 `ai-prompts.js` 只供旧草稿兼容，正式任务来自 `assets/creator-ai-task-core.js`。

## 顺序

立项 → 社区研究、官方音画证据（若有直播 / PV / 展示 / 实机视频，先分析再写正式稿）→ 机制研究与 Evidence → 核心命题 / 规划 → 完整文案、事实审核、去 AI 味 → Script Lock → 录音、Audio Lock → 按真实音频生成 SRT 与 Timeline Lock → 视觉、真实素材、实战录屏、像素动画、BGM、封面 → 剪辑蓝图、Codex Build、Review、Fine Edit、QC、Picture Lock → 发布包、人工发布、Analytics、Accepted Learning。

此七阶段只存在于 UI 投影 `assets/creator-workflow-map.js`，不构成数据库状态机。短指令进入 Production 的同一 AI Task / Video Contract；无项目的通用模板会明确阻塞正式执行。
