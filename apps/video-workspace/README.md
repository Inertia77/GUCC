# GUCC Studio v6.1.1

正式入口保持 `apps/video-workspace/`。当前页面是 GameUp Creator OS 的 Prompt 工作台，依据 2026-10-05 实际读取的 Notion 母库重构。

选择视频类型、长/短形式、阶段、任务与执行环境，复制当前完整独立 Prompt。8 类题材分支贯穿来源、研究、解析、录屏、结构、审核、视觉、声音及发布承诺。Work/Codex 任务全部有 Chat 备用版，长任务分为连续且独立的子 Prompt；需要执行工具的步骤输出脚本并要求实际运行结果，不冒充媒体完成。

## 文件

- `ai-prompts.js`：唯一当前 Prompt 目录与纯函数生成器。
- `studio.js` / `studio.css` / `index.html`：草稿、导入导出、搜索、复制及响应式界面。
- `notion-prompts.json`：原母库 31 条 Prompt 的冻结迁移快照，不用于当前复制。
- `legacy/studio-v5.html` / `legacy/ai-prompts.js`：旧工作区、旧 JSON/Markdown 导入与历史浏览器草稿入口。
- `production-system/`：原有正式制作系统，保持独立入口和现有行为。本工作台不自动写入该系统、不创建项目、不触发正式锁定。

## 草稿

当前页面使用独立 `gucc_creator_prompt_v6` localStorage 键，保留旧版草稿。导出 JSON 可跨设备继续；导入支持新版 JSON、旧版 JSON 和 `VIDEO_CONTRACT.md`。未知旧字段及原始导入文件内容保存在导出 JSON 的 `importedSource` 中，避免新输入表丢失历史项目细节。浏览器草稿不代表其他 Chat 已读取素材，复制时仍需提供真实可访问文件。

## 维护与验证

修改 Prompt 优先改 `ai-prompts.js`，保持每个原编号恰好一个迁移去向。升级版本时同步页面、脚本/CSS query 与 `sw.js` 缓存资源。

`node scripts/test-creator-prompt-catalog.cjs` 检查原编号覆盖、题材分支、所有环境/备用步骤及关键真值约束。`node scripts/test-creator-prompt-browser.cjs` 在隔离浏览器验证分支、输入保存、导入、复制/下载及 1440/768/390/320 宽度；可通过 `GUCC_TEST_EXECUTABLE` 指定已有 Chromium。测试不会接触生产 Supabase。


## v6.1.0

- 空的“本轮补充”不再生成“未提供；不猜”；同一 Chat 默认继承已确认上下文，只有真正缺关键输入才补充。
- 「朗读与录音准备」新增真人录音 / 剪映 AI 朗读切换。AI 模式生成 `TTS_TEMP.srt`（每 cue ≤500 可见字符，目标 430–490）、`TTS_PRONUNCIATION_MAP.md` 与 `TTS_README.md`。
- `TTS_TEMP.srt` 仅用于剪映 AI 朗读，时间码是导入占位，不进入最终时间真值；最终 `FINAL.srt` 仍显示 SCRIPT_LOCK 原文，时间由生成后的 `AUDIO_MASTER` 决定。


## v6.1.1

- Chat 备用子步骤现在各自显示真正需要的输入与本步正式产物，不再重复显示任务级总输入/输出。
- 工作台自动生成稳定 `PROJECT_ID`：`游戏代码-JST日期-内容类型-4位短哈希`；立项通过后 `VIDEO_CONTRACT.md` 直接沿用，不要求用户手工命名。
- 已导入的 `VIDEO_CONTRACT.md` 若已有 PROJECT_ID，则优先保留该 ID。
