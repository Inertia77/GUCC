# AI Video Production System v1

现有 23-state Project workflow 是 Legacy/default compatibility layer。同一页面现已加入 additive **Global Production v1** 面板，用于独立 Language Tracks、真实音频 Timeline、统一 Visual Master、Variant composition、Publish Package、QA / Release、Publication、Analytics 与 Learning。完整契约见 [`docs/creator-global-production-v1.md`](../../../docs/creator-global-production-v1.md)。

这是 GUCC Studio 里的模块化生产系统。它不替代原来的自由创作工作区，而是把已经确定要做的视频，按“立案 → 锁内容 → 锁脚本 → 锁音频 → 真实时间轴 → Storyboard → 素材补全 → Build → Review → 发布”推进。

入口：

```text
http://localhost:8000/apps/video-workspace/production-system/
```

## 第一次使用

1. 点击“新建项目”，选择项目类型：
   - A：角色全方位攻略，不含音乐生成阶段。
   - B：Suno 歌曲 / 音乐视频，包含 Music Draft 和 Music Lock。
   - C：游戏底层机制系列，不含音乐生成阶段。
   - D：独立音乐资产与发行。
2. 首页顶部只看“唯一下一步”。缺输入或未满足 Lock 时，系统会显示缺口并禁止前进。
3. 在 Prompt 页复制当前阶段 Prompt 给 ChatGPT、Suno 或 Codex。Prompt 已包含 Role、Goal、State、Inputs、Locks、Task、Rules、Outputs、Handoff 和 Do Not。
4. AI 产出的标准文件在“文件”页登记。Markdown / JSON / CSV / SRT 会写入项目备份；音视频只记录名称和大小，不会塞进 `localStorage`。
5. 完整口播放进“脚本 / TTS”，在强音画绑定处写 `[AV:UI]`、`[AV:NUMBER]`、`[AV:COMPARE]` 等标记，再生成 TTS Chunks。
6. 导入真实 `AUDIO_MASTER.wav` 后才能点 Audio Lock。Audio Lock 之前，系统不允许进入精确时间轴。
7. 登记真实 `SUBTITLE_MASTER.srt`，再制作 Timed Storyboard。所有 Must 素材和生产文件齐备后，才能进入 Production Ready。
8. V0 复盘时用时间码 Review Note，不再截图后手工拼给 AI；Revision Prompt 会直接引用这些记录。

## 一键保存到真实项目目录

点击“同步到目录”，选择一个磁盘父目录。系统会建立：

```text
项目名/
├─ 00_CONTROL/
├─ 01_RESEARCH/
├─ 02_SCRIPT/TTS_CHUNKS/
├─ 03_AUDIO/
├─ 04_SUBTITLES/
├─ 05_ASSETS/{GAMEPLAY,UI,CHARACTER,BUILD,GRAPHICS,MUSIC,SFX}/
├─ 06_EDIT_PLAN/
├─ 07_CODEX_BUILD/
├─ 08_REVIEW/
├─ 09_FINAL/
└─ 10_RELEASE/
```

当前同步会写入系统掌握的文本文件、索引、状态、Prompt 上下文和 TTS 分块。浏览器无法凭文件名复制本地大型音视频，所以音视频需要放进对应目录后再在页面登记。Chrome / Edge 的 File System Access API 支持这项能力；不支持时使用“导出项目”JSON。

“读取项目目录”会读取 `00_CONTROL/PROJECT_DATA.json`，可在另一台设备或清理浏览器数据后恢复项目。

## 数据与备份

- 自动保存键：`gucc_ai_video_production_v1`
- “导出项目”：单项目结构化 JSON。
- “备份系统”：全部项目和 Music Library。
- `PROJECT_DATA.json` 不会递归包含自身内容，反复同步不会无限膨胀。
- 删除浏览器项目不会删除已经同步到磁盘的目录。

## 生产锁

- Content Lock：核心结论、范围和叙事顺序确定。
- Script Lock：必须已有 `VOICE_MASTER.md`。
- Music Lock：B / D 必须已有 `MUSIC_MASTER.wav`。
- Audio Lock：必须已有真实 `AUDIO_MASTER.wav`；它是绝对主时间轴。
- Picture Lock：必须已有 `VIDEO_V1.mp4`。

Lock 可以重新打开，但会写入项目历史。不要用“强制跳阶段”代替缺失文件。

## 目录内文件职责

- `00_CONTROL/STATUS.md`：唯一阶段状态和下一动作。
- `00_CONTROL/PROJECT_DATA.json`：工作台恢复数据。
- `02_SCRIPT/VOICE_MASTER.md`：锁定口播。
- `02_SCRIPT/TTS_MANIFEST.csv`：自然语义分块清单。
- `04_SUBTITLES/SUBTITLE_MASTER.srt`：字幕唯一时间源。
- `06_EDIT_PLAN/ASSET_INDEX.csv`：素材状态与优先级。
- `06_EDIT_PLAN/EDIT_BLUEPRINT.csv`：剪辑结构唯一基准。
- `08_REVIEW/REVIEW_NOTES.md`：带时间码的修订依据。

## 本地验证

在仓库根目录运行：

```bash
npm test
```

生产系统的纯逻辑测试也可单独运行：

```bash
node scripts/test-production-system.cjs
```
