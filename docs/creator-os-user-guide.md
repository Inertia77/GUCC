# GUCC Creator OS 使用指南

> 这份文档面向真正要开始做视频的人。
>
> 不需要先理解数据库、Revision、API、Migration 或 Artifact Scope。正常使用时，你只需要记住一句话：**打开 GUCC → 看“现在做这个” → 做当前任务 → 遇到人工确认再由你点击。**
>
> 本指南按 2026-09-08 `main` 的真实界面和行为编写。

## 第一次使用，只看这里

1. 打开 GUCC Portal，输入 Access Key，点 **「进入 GUCC」**。
2. 在 Creator Dashboard 看最上面的 **「现在做这个」**。如果还没登录云端，先点 **「登录并读取项目」**，去 Command Center 登录。
3. 第一次没有项目：进 **Production**，在空白页点 **「新建项目」**。已经有项目时，要新建项目：Production 顶部展开 **「更多」** → **「＋ 新建项目」**。
4. 填 **项目名称、游戏、目标发布日期、核心主题、备注**，点 **「保存项目」**。
5. 回到 Portal 或留在 Production，都以唯一的 **「现在做这个」** 为准；不要自己背完整状态机。
6. 想先整理选题、资料和结构，可以去 Studio；想好后在右下 **「AI 制作总线」** 点 **「转入正式制作」**。
7. 进入正式制作后，真实视频、音频、录屏和剪辑工程都放本地；用 **「创建 / 同步本地 Workspace」** 建项目目录。
8. 看到 **「现在需要你确认」** 时再做 Human Gate。没有真正审完，不要为了推进进度去 Lock。
9. 做完 `AUDIO_MASTER.wav` 后确认 Audio Lock，再去 **「字幕 / 时间线」** 导入真实 SRT、校验并生成时间线包。
10. 成片和发布资料 Ready 后点 **「进入发布」**，到 Publish Console 做预检、平台准备和最终人工发布；发布后在 **「数据复盘」** 回填数据。

如果你只想马上开工，到这里已经够了。下面是每一步的详细说明。

---

## 1. 这套系统到底怎么用

Creator OS 不是让你管理数据库的。它做的是：

```text
打开 GUCC
→ 告诉你现在最重要的一件事
→ 你完成需要判断的内容
→ GUCC 处理保存、状态、校验、文件登记等机械工作
→ 到 Human Gate 时停下来等你确认
→ 继续制作
→ 最后由你确认真实发布
```

你只需要知道四个存储位置：

- **GitHub**：GUCC 程序和文档本身。
- **Supabase**：项目状态、历史、Lock、云端身份和轻量元数据。
- **本地磁盘**：真正的视频、音频、录屏、剪辑工程、大型素材。
- **Google Drive**：轻量项目归档，例如 Markdown、JSON、CSV、SRT 等，不是媒体盘。

### 绝对不要把什么传到 Supabase / Drive？

不要把这些大型真实制作文件当成云状态上传：

- 完整视频
- `AUDIO_MASTER.wav`
- 大量游戏录屏
- 剪辑工程
- 大型素材库
- 原始高码率音视频

这些留在本地。GUCC 可以登记“它在哪里、是否存在、大小、时间、校验值”等信息，但不会把媒体字节塞进 Supabase。

---

## 2. 第一次新建真实视频

### 2.1 从哪里进入

最稳妥的直接路径：

```text
GUCC Portal
→ Creator Dashboard
→ 打开 Production
→ 新建项目
```

如果 Production 当前一个项目都没有，页面会显示 **「建立第一个生产项目」**，直接点 **「新建项目」**。

如果已经有项目，Production 顶部的低频工具默认收进 **「更多」**：

```text
更多
→ ＋ 新建项目
```

你也可以先在 Studio 做选题和结构，再通过右下角 **「AI 制作总线」→「转入正式制作」**。这样 Studio Draft 会带着同一个 Project ID 进入 Production，不会另外复制一套项目。

### 2.2 新建项目要填什么

当前真实表单叫 **「新建项目」**，字段是：

| 字段 | 你应该填什么 | 示例 |
|---|---|---|
| 项目名称 | 这条视频在项目里的完整名称 | `绝区零｜克拉蕾 3.x 复刻攻略` |
| 游戏 | 游戏名称 | `绝区零` |
| 目标发布日期 | 你希望哪天发 | `2026-09-12` |
| 核心主题 | 这条视频必须解决什么问题 | `3.x 环境下克拉蕾怎么配队、养成、值不值得抽` |
| 备注 | 观众、版本边界、特殊要求 | `面向回坑玩家；官方中文术语；8–10 分钟` |

填完点 **「保存项目」**。

### 2.3 要不要先选“攻略 / 机制 / 音乐”等 Project Type？

不用。当前新项目统一走 Creator Project 工作流。内容类型不会决定另一套状态机。

---

## 3. 每天打开以后先看什么

### 3.1 只看 Top 1

Portal 的 Creator Dashboard 顶部现在会突出：

**「现在做这个」**

只显示第一优先任务。后面的任务收进：

**「接下来 · N 项」**

所以日常习惯应该是：

```text
打开 Portal
→ 看“现在做这个”
→ 点“继续 →”
→ 做完当前任务
→ 再回来
```

不要自己记 23 个状态，也不要自己猜“是不是该去剪辑了”。

### 3.2 Production 里也只认一个 Next Action

Production 页面会显示当前唯一的主任务。旧的 Legacy Next Action、完整状态机和全部 Lock 仍然存在，但默认放在高级详情里，不和当前任务抢注意力。

你可能看到：

- **「现在做这个」**：系统或 Codex 可以继续的工作。
- **「现在需要你确认」**：当前真正需要 Human Gate。

如果是人工 Gate，主按钮就是原来的真实 Gate，不是假的“下一步”按钮。

### 3.3 什么时候进哪个页面

**Production**：制作本身。脚本、音频、字幕、素材、Storyboard、Review、成片 Ready 都在这里。

**Global Production**：多语言、Visual Master、不同平台/画幅 Variant、Publish Package、QA、Release 等。默认只展开当前阶段，没必要一次看全。

**文件**：看某个标准文件逻辑上是否 Ready，以及 Local Agent 是否真的在本机看到它。

**Studio**：选题、资料整理、结构、早期思考。想清楚后再转正式 Production。

**Publish Console**：真正的平台发布执行、最终字段确认、上传准备、Post URL / ID、发布后数据复盘。

---

## 4. 从 Idea 到 Script

你不需要手动记状态，但了解这段会更安心：

```text
IDEA
→ PLANNING
→ RESEARCHING
→ RESEARCH_LOCKED
→ CONTENT_LOCKED
→ SCRIPTING
→ SCRIPT_LOCKED
```

### IDEA｜选题

**你做什么：**

- 确认要做什么视频。
- 明确观众是谁。
- 明确视频要解决的问题。
- 明确哪些东西这期不讲。

**GUCC / ChatGPT 做什么：**

当前动作会引导你完成立案规划和 Project Manifest。

**完成标准：**

项目范围已经足够清楚，不再只是“我想做个某角色视频”。

### PLANNING｜立案规划

**你做什么：**

确认哪些问题真的值得研究。

**GUCC / ChatGPT 做什么：**

制定研究计划，避免为了“资料多”而无边界地搜。

### RESEARCHING｜资料研究

**你做什么：**

- 核对版本。
- 核对数值与官方规则。
- 解决会改变结论的争议。
- 对不确定内容保留“不确定”。

**什么时候停：**

如果关键事实仍可能改变视频结论，不要继续 Lock。

### RESEARCH_LOCKED｜研究锁定

当前 Legacy flow 会进入研究锁定状态；Global Production 还会有更细的 **Project Scope / Evidence Snapshot / Master Script** 人工 Gate。

日常不要自己找所有 Gate。以 **「现在需要你确认」** 暴露出来的那个为准。

### CONTENT_LOCKED｜Content Lock

Legacy Content Lock 的真实前提是 `01_RESEARCH/CONTENT_LOCK.md` 已登记 Ready。

**你确认的是：**

- 核心结论
- 章节顺序
- 必讲 / 简讲 / 不讲
- 这条视频的范围

**不要 Lock 的情况：**

- 还在改核心结论
- 关键事实没核实
- 章节结构还会大改

Content Lock 不是“进度按钮”。它的意思是：**后面的人可以相信这些结论不会被你随手推翻。**

### SCRIPTING｜脚本制作

Production → **「脚本 / TTS」**。

主要编辑区叫：

**「口播与 AV Anchor」**

你在这里完成 `VOICE_MASTER`。

真实按钮：

- **「扫描 AV Anchor」**
- **「生成 TTS Chunks」**

如果有强音画绑定，可以在脚本里写：

```text
[AV:ACTION]
[AV:UI]
[AV:NUMBER]
[AV:COMPARE]
[AV:CAUSE_EFFECT]
```

它们是告诉后续剪辑“这里必须配正确画面”，不是字幕内容。

### Script Lock

Legacy Script Lock 的真实前提是 `VOICE_MASTER.md` 已 Ready。

**什么时候点：**

你已经愿意让后续录音 / TTS / 时间线以这个脚本为正式口播基准。

**什么时候不要点：**

还会整段重写、改章节、改核心结论时不要 Lock。

---

## 5. Audio Production

状态大致是：

```text
SCRIPT_LOCKED
→ PRE_ASSET_PREPARATION
→ AUDIO_PRODUCTION
→ AUDIO_LOCKED
```

### 5.1 VOICE 和 AUDIO_MASTER 是什么

**VOICE_MASTER**：你准备让人 / AI 读出来的正式口播文字。

**AUDIO_MASTER**：最终真正用于视频时间轴的完整音频。它可以包含：

```text
Voice
+ 可选 Music
+ 可选 SFX
= AUDIO_MASTER.wav
```

一旦 Audio Lock，**真实 `AUDIO_MASTER` 才是绝对时间轴**。不要再用“脚本字数”猜时长。

### 5.2 Music 怎么选

Production → **「音频」**。

当前真实选项：

- **「不使用」**：完全不用音乐。最简单；Lyrics / Suno Prompt / Music Master 不会阻塞流程。
- **「使用已有音乐」**：填写曲名、来源、Music Notes，并在「文件」页登记 `MUSIC_MASTER`。
- **「生成音乐」**：可以填 Suno Prompt、Lyrics、候选版本、Selected Version、Music Notes。

Music 没有独立 Music Lock。最后统一由 Audio Lock 确认。

### 5.3 AUDIO_MASTER 放哪里

默认单语言 / Project-level 路径：

```text
03_AUDIO/AUDIO_MASTER.wav
```

Global Language Track 会有自己的动态目录，例如：

```text
03_AUDIO/LANG/JA/AUDIO_MASTER.wav
```

不要因为有日语版就自己造 `AUDIO_MASTER_JA.wav` 这种逻辑 Key。

### 5.4 在 GUCC 登记音频

Production → **「文件」**。

找到 **「最终主音频」**，点：

**「登记」**

如果已有文件则显示：

**「替换」**

选择媒体文件时，GUCC 只登记必要信息；不会把大音频字节上传进 Supabase。

### 5.5 Expected / Observed 怎么看

Local Agent 启用后，Files 页面会把同一个逻辑文件分成两种事实：

- **Expected**：GUCC 认为这个文件应该在什么相对路径、逻辑状态是什么。
- **Observed**：某台真实电脑上的 Local Agent 有没有看到这个物理文件。

所以：

**文件存在，但 Not Observed / Unknown** 不等于文件不存在。

它通常表示：Local Agent 还没扫到、Workspace Root 不对，或路径不符合标准位置。

### 5.6 什么时候可以 Audio Lock

至少满足：

- 最终 `AUDIO_MASTER.wav` 已经真实存在并登记 Ready。
- 你已经听过，确认口播、音乐、SFX 和长度不需要大改。
- 接下来愿意让字幕和剪辑严格按这个音频走。

不要拿试听版、临时 TTS、还会换时长的音轨去 Audio Lock。

---

## 6. Subtitle / Timeline

默认单语言视频的日常路径：

```text
AUDIO_MASTER
→ Audio Lock
→ 真实 ASR / SRT
→ SUBTITLE_MASTER
→ TIMELINE_SENTENCE
→ TRANSCRIPT_ALIGNED
→ ALIGNMENT_REPORT
```

### 6.1 普通用户应该怎么做

完成 Audio Lock 后，Production 会出现 / 可使用：

**「字幕 / 时间线」**

当前页面真实按钮：

- **「复制 Codex 字幕 Prompt」**
- **「导入 SRT」**
- **「校验」**
- **「生成 / 刷新时间线包」**

推荐第一次按这个顺序：

1. 点 **「复制 Codex 字幕 Prompt」**。
2. 把真实 `AUDIO_MASTER` 和 `VOICE_MASTER` 一起交给 Codex / ChatGPT。
3. 让它基于真实音频返回真实 `SUBTITLE_MASTER.srt`。
4. 回 GUCC 点 **「导入 SRT」**，或把 SRT 粘进编辑框。
5. 点 **「校验」**。
6. 检查字幕时间码和 VOICE_MASTER 差异。
7. 没有阻断错误后点 **「生成 / 刷新时间线包」**。

GUCC 会从真实 SRT **确定性**生成：

- `SUBTITLE_MASTER.srt`
- `TIMELINE_SENTENCE.csv`
- `TRANSCRIPT_ALIGNED.json`
- `ALIGNMENT_REPORT.md`

成功后，Project-level workflow 会从 `AUDIO_LOCKED` 进入 Timeline 生成，并在完整四件套成立时进入 `TIMELINE_LOCKED`。

### 6.2 当前浏览器页面会自动跑 Whisper 吗？

**不会。**

当前 Project-level「字幕 / 时间线」页面明确不内置 Whisper / ASR Runner。它负责：

- 接收真实 SRT
- 校验
- 和 VOICE_MASTER 做文字差异检查
- 生成确定性的 Timeline 四件套

如果你想在本机直接跑高级真实音频分析，当前仓库有 CLI：

```powershell
node scripts/creator-audio-analysis.cjs --audio AUDIO_MASTER.wav --asr whisper-result.json --script VOICE_SCRIPT.md --language ja --output .
```

如果不传 `--asr`，脚本会尝试调用本机 `whisper` CLI。非 WAV 音频还可能需要 `ffprobe`。

这条 CLI 更适合你已经配置本机 ASR、或在做 Global Language Track 时使用。第一次单语言视频不必强行走 CLI。

### 6.3 `REVIEW_REQUIRED` 是什么意思

高级音频分析如果输出：

```text
BLOCKED_REVIEW_REQUIRED
```

或 Alignment Report 显示 `REVIEW_REQUIRED`，意思不是“脚本坏了”，而是：

**实际转写与锁定脚本的有序文字相似度没有达到安全通过标准，必须由人检查。**

你要检查：

- 漏句
- 重复句
- 人名 / 角色名
- 数字
- 实际口误
- ASR 识别错误
- 音频是不是拿错版本

不要用 `--force` 或强行 Lock 来“让进度继续”。`--force` 只用于你已经明确重新打开相应 Timeline / Voice Lock、确认要覆盖已有正式输出的情况。

### 6.4 Timeline 失败先看哪里

先看：

1. `字幕 / 时间线` 的校验结果。
2. `ALIGNMENT_REPORT.md`。
3. Files 里四件套是不是全部 Ready。
4. `AUDIO_MASTER` 是不是正确版本。
5. Audio Lock 是否真的已经确认。

---

## 7. Visual / Asset / Editing

### 7.1 什么是 Visual Master？

人话解释：**一条内容的统一“画面母版方案”**。

它不是一张图片，也不是某个平台成片。它描述“这一段内容应该用什么画面语义、哪些素材、怎么剪”，然后不同语言可以把这些画面意图投影到各自真实音频时间上。

如果你只做一条普通单语言视频，不需要先手工研究 Visual Master 内部 ID。跟当前 Next Action 走即可。

### 7.2 素材页怎么用

Production → **「素材」** → **「素材管理」**。

当前字段：

- 类型
- 优先级
- 描述
- 来源
- 状态
- 标签

按钮：

**「添加素材」**

最重要的是优先级：

- **Must**：没有就不能安全进入 Production Ready。
- **Should**：应该有，但不一定阻断。
- **Optional**：锦上添花。

如果 Must 素材缺失，不要用假 UI、假游戏画面、伪造截图填坑。

### 7.3 Storyboard 怎么用

Timeline 已锁定后，Production → **「Storyboard」**。

页面叫 **「剪辑蓝图」**。

你会填：

- 开始 / 结束时间
- Visual Level
- 旁白
- 画面目的
- 素材 ID
- 画面类型
- 字幕文字
- 备注

按钮：

**「添加镜头段」**

这里的时间必须来自真实字幕 / 时间线，不是从脚本长度猜。

### 7.4 Storyboard / Asset Completion / Production Ready 分别是什么

**Storyboard**：已经知道每个时间段应该展示什么。

**Asset Completion**：根据蓝图去补齐真实缺失素材。

**Production Ready**：正式结构剪辑需要的核心文件已经齐全，而且所有 Must 素材都 Ready / Used。

Production Ready 的关键要求包括最终音频、字幕、编辑蓝图、素材索引、视觉规范、导出规范等。

### 7.5 真实视频 / 图片 / 录屏放哪？

放本地 `05_ASSETS` 对应分类目录或你的本机制作结构中。

Local Agent **不会递归扫描整个 `05_ASSETS` 原始素材池**。这是故意的：它只观察正式登记的标准 Artifact，不把你的素材盘变成云端索引器。

---

## 8. Video Production / Review

后半程大致是：

```text
PRODUCTION_READY
→ CODEX_BUILD
→ REVIEW
→ REVISION
→ FINE_EDIT
→ PICTURE_LOCKED
```

### CODEX_BUILD

Codex 可以帮助：

- 按 `AUDIO_MASTER` 和字幕时间轴组装结构剪辑
- 按 Storyboard / Edit Plan 放真实素材
- 产出 Structural Cut / V0
- 生成 Build / QC / Missing Asset 报告

默认 V0 文件：

```text
07_CODEX_BUILD/VIDEO_V0_REVIEW.mp4
```

Codex 不应该：

- 改掉已锁定的核心结论
- 擅自改变正式音频长度
- 用假的游戏画面补素材缺口
- 自动点 Human Gate

### REVIEW

Production → **「Review」** → **「复盘记录」**。

字段：

- 时间码
- 类型
- 问题

按钮：

**「添加 Review Note」**

把问题写成可执行项，例如：

```text
02:14.300 · Visual · 这里应该换成角色技能 UI，不要继续放战斗 B-roll
```

不要只写“感觉不对”。

### REVISION

Codex 按 Review Notes 修，不应该把没有要求修改的锁定内容一起重做。

### FINE_EDIT

这里做：

- 字幕强调
- 音效
- BGM 微调
- 节奏
- 信息动效
- 最后审美处理

最终正式成片默认：

```text
09_FINAL/VIDEO_V1.mp4
```

### Picture Lock 什么时候点

当你已经确认：

- `VIDEO_V1` 是准备发布的画面版本。
- 不会再换镜头、改字幕布局、重做节奏。
- 后面只做最终 QC、导出和发布准备。

Picture Lock 的真实前提是 `VIDEO_V1.mp4` 已登记 Ready。

Picture Lock 后不要随便改画面。如果真要大改，先明确重新打开相应 Gate，而不是偷偷替换最终文件。

---

## 9. Global Production：多语言、多画面方案、多平台版本

Global Production 现在已经是真实可用功能，但默认采用 Progressive Disclosure：**只展开当前阶段**。

正常不要一进页面就点 **「查看完整 Global Production」**。先看当前任务。

常见阶段顺序是：

```text
项目范围
→ 语言版本
→ 视觉方案
→ 分发版本
→ 发布
→ 复盘
```

### 9.1 第一次看到的 Global Human Gate

新 Cloud Project 很可能先看到：

- `确认 Project Scope`
- `Evidence Snapshot`
- `Master Script`

这些都是真实人工 Gate。

点击时 GUCC 会再次弹确认，并要求你填写这次人工决定的原因。AI 不会替你点。

### 9.2 Language Track

当 Next Action 要求建立语言版本时，展开：

**「建立 / 编排 Global Production」**

默认 UI 让你填写人类真正需要决定的内容，例如：

- Language Code
- 显示 Label
- 是否 Source Track

像 `ZH_SOURCE`、`JA` 这种系统 Identity Key 默认隐藏并由 GUCC 确定性生成。只有确实要做底层兼容修改时才展开：

**「Advanced Identity Settings」**

不要把改 Raw Key 当成日常工作。

Language Track 会有自己的：

- 口播稿
- AUDIO_MASTER
- Subtitle / Timeline 四件套
- Script Lock
- Voice / Timeline Lock

### 9.3 Visual Master

当 Next Action 到视觉阶段时再建立。

当前 Human Gates 包括：

- Visual Master Lock
- Edit Plan Lock
- Master Render Lock

它们分别代表“画面母版方案确定”“编辑计划确定”“母版成片确定”，不是同一个按钮。

### 9.4 Variant

人话解释：**同一内容针对某个市场 / 画幅 / 平台组合的分发版本。**

例如：

- YouTube Global · 16:9
- TikTok Global · 9:16

建立 Variant 时，默认关心：

- Visual Master
- Market
- Format
- 需要包含哪些 Language Tracks

系统 Key 默认自动生成。

---

## 10. Publish

### 10.1 Production 和 Publish Console 各管什么

**Production / Global Production** 管：

- Variant 是否 Ready
- Platform Presentation
- Publish Package
- QA
- Human Final Review
- Release Lock
- “现在是否可以去发布”

**Publish Console** 管：

- 最终平台字段
- 选择本地成片 / 封面
- 预检
- 打开 / 准备各平台
- 实际上传辅助
- 最终人工公开发布
- Post ID / URL
- 发布后数据复盘

因此 Production 的最终主 CTA 是：

**「进入发布」**

不要把 Production 当成第二个 Publish Console。

### 10.2 Publish Package / QA / Review / Release

Global Production 的 Package 阶段有真实动作：

- Platform Lock
- **「运行 AI QA」**
- **「确认最终精修」**
- Release Lock

Release Lock 后，发布候选应该被视为正式快照，不要静默改内容。

如果 Package 的 Revision 变化，旧 QA 不能冒充当前版本的 PASS，需要重新检查。

### 10.3 进入 Publish Console

Publish Console 顶部标题：

**「Publish Console｜发布与复盘控制台」**

它有四步：

1. **准备发布单**
2. **发布前检查**
3. **逐平台执行**
4. **数据复盘**

#### 01 准备发布单

主要动作：

- 选择完整成片
- 选择母版封面（可选）
- 检查项目标题 / 游戏 / 发布时间 / 时区
- 填各平台独立字段

按钮：

**「保存并开始预检 →」**

#### 02 发布前检查

按钮：

- **「运行全部检查」**
- **「下载发布包 Markdown」**
- **「检查通过，生成执行队列 →」**

硬错误先修，不要把 Warning 当成平台官方最终审核结论。

#### 03 逐平台执行

如果本机 Publisher Assistant 已连接，可以使用：

- **「检查连接」**
- **「首次登录 / 检查账号」**
- **「一键准备全部平台」**

`一键准备全部平台` 的含义是：尝试使用专用登录浏览器选择成片、上传封面、填元数据，**然后停在人工检查阶段**。

### 10.4 v1 会不会自动真正发布？

**不会替你做最终公开发布。**

当前 v1 不会在你看不见的情况下自动点击：

- B站发布
- YouTube Publish
- TikTok Publish
- 抖音发布
- 小红书发布
- 视频号发布

Publisher Assistant 可以在支持的情况下帮你打开已登录平台、选文件、上传、填表，但最终平台“公开发布 / 提交 / 定时发布”仍必须由你本人确认。

### 10.5 Final Publish Confirmation 和回填

Global Publication 层存在明确的 **「最终发布确认」** Human Gate；只有 Release / QA / Human Review 等前置条件成立时才应该确认。

真实平台发布完成后，要留下：

- Post ID
- 正式 https URL
- 发布时间

Global Production 的完整高级视图里存在 **「登记已发布」**；当前日常主路径为了避免 Production 变成第二个发布台，优先把平台执行交给 Publish Console。

如果你只做普通第一条视频，先保证 Publish Console 的执行记录和 URL / ID 完整；Global Publication / Analytics 的云闭环需要时再进入完整 Global Production 检查。

---

## 11. Analytics / Learning

发布完不是结束。至少回来做一次复盘。

### 11.1 日常最实用的入口：Publish Console → 数据复盘

第四步叫：

**「数据快照与 AI 复盘」**

你可以填：

- 平台
- 采集时间
- 曝光量
- 播放量
- 平均观看时长
- 完播率
- 点赞 / 评论 / 分享 / 收藏
- 新增关注
- T+1 / T+3 / T+7 / T+30 等数据窗口
- 观察备注

按钮：

- **「保存快照」**
- **「打开所选平台数据页」**
- **「复制 AI 复盘 Prompt」**
- **「下载复盘 Markdown」**

### 11.2 Publication / Metrics / Performance Report / Learning 分别是什么

**Publication**：一次真实发布实例。重试、重发可以是不同实例，不是覆盖掉旧记录。

**Metrics**：某个时间点抓到的表现数据，例如 T+1 天播放量、完播率、点赞等。

**Performance Report**：把多个指标和上下文整理成“为什么这条视频表现这样”的分析报告。

**Learning**：从报告里提炼的“以后可能值得复用的经验”。

### 11.3 Learning 不是 AI 自动写入真理

Global Production 里的 Learning Proposal 如果进入待审核状态，会出现：

- **「接受」**
- **「拒绝」**

只有你人工接受的 Learning 才应该进入后续项目反馈。

AI 生成的“结论”在你审之前只是 proposal。

### 11.4 当前 v1 的真实限制

Publish Console 已有完整、日常可操作的数据快照表单和 AI 复盘 Prompt。

Global Production 的 Analytics / Performance Report / Learning 是更完整的云端闭环模型，但当前 Production 默认主要展示状态、下一步和 Learning 审核；**它不是另一套完整的数据录入后台**。如果当前 Next Action 已经进入 Global Analytics，但你找不到对应的直接录入控件，先在 Publish Console 完成真实数据记录，再把这个情况交给 `80_chat / Codex` 处理，不要自己绕到 Supabase SQL。

---

## 12. Local Agent 使用指南

### 我什么时候需要开 Local Agent？

当你希望 GUCC 知道：

- `AUDIO_MASTER.wav` 是否真的在本机
- `VIDEO_V1.mp4` 是否真的在本机
- 标准字幕 / 报告等文件是否存在
- 换电脑后哪台机器拥有哪份文件

就需要 Local Agent。

如果你只是刚刚建项目、写脚本，还没有本地标准文件，可以晚一点开。

### 第一次怎么配置？

在 Windows PowerShell，进入 GUCC 仓库目录：

```powershell
npm.cmd run creator:agent -- --setup
```

它会询问：

- Device label
- Workspace Root
- GUCC login email
- GUCC password

密码只用于登录，不会保存。配置会保存用户 refresh token，而不是 service-role key。

### 怎么跑一次检查？

```powershell
npm.cmd run creator:agent -- --once
```

正常会看到类似：

```text
GUCC Creator Local Agent
Device: ...
Workspace: ...
Projects found: ...

✓ AUDIO_MASTER
? VIDEO_V1
...

Synced: ... observations
... meaningful file changes
... errors
```

### 想让它持续观察怎么办？

```powershell
npm.cmd run creator:agent -- --watch
```

它会先跑一次 reconciliation，然后观察标准目录；当前实现约 1.5 秒 debounce，并每 15 分钟做一次完整 contract reconciliation。

这不是开机 daemon。你需要时开着终端即可。

### 它会做什么？

- 找到包含 `00_CONTROL/PROJECT_DATA.json` 的 Creator Project。
- 读取 Cloud 里的标准逻辑文件清单。
- 检查对应本机相对路径。
- 回报 present / missing / unknown 等状态。
- 记录大小、mtime、必要时 SHA-256。

### 它不会做什么？

- 不上传媒体字节。
- 不把绝对本地路径写进 Supabase。
- 不自动改 Production State。
- 不自动点 Lock。
- 不递归扫描整个 `05_ASSETS`。
- 不保存密码。
- 不使用 `service_role`。

### 文件明明在本地，但显示 Not Observed 怎么办？

按顺序检查：

1. Workspace Root 是不是项目目录的父目录。
2. 项目目录里有没有 `00_CONTROL/PROJECT_DATA.json`。
3. 这个 JSON 的 `projectId` 是不是当前项目。
4. 文件是不是放在 Expected 显示的**精确相对路径**。
5. 跑一次：

```powershell
npm.cmd run creator:agent -- --once
```

6. 看终端里的 `Projects found`、`✓ / ✗ / ?` 和 errors。
7. 再刷新 Production → 文件。

### Workspace Root 是什么？

就是所有 Creator Project 本地目录的总父目录。

例如：

```text
D:\GUCC_CREATOR_WORKSPACE\
  ├─ 克拉蕾复刻攻略_a1b2c3\
  └─ 异环机制解析_x7y8z9\
```

### 浏览器怎么创建项目 Workspace？

Production 项目顶部展开 **「项目设置」**，点：

**「创建 / 同步本地 Workspace」**

使用桌面 Chrome / Edge 选择已经登记的 Workspace Root。

项目目录采用：

```text
<安全项目名>_<短 Project ID>
```

例如：

```text
克拉蕾完整攻略_a1b2c3
```

### 浏览器不支持怎么办？

可以明确 bootstrap 当前项目：

```powershell
npm.cmd run creator:agent -- --bootstrap-project <projectId>
```

`--bootstrap-project` 是独立操作，不要和 `--setup / --once / --watch` 混用。

### 换电脑怎么办？

新电脑：

1. 安装 / 拉取 GUCC 仓库。
2. 把需要继续制作的本地项目文件带到新机器。
3. 运行 `--setup`，给新机器配置自己的 Device / Workspace Root。
4. 跑 `--once` 确认项目和文件都被识别。
5. 再从 Portal / Production 打开同一个 Project。

不要复制旧电脑的绝对路径去云端。

如果是**同一台设备只是 Workspace Root 真搬家**，Agent 有 `--update-cloud-workspace-root`，但只有你确认真的是同一设备迁移时才用。

---

## 13. 本地文件夹结构

### 13.1 每个普通 Project 一开始就会有的骨架

```text
<ProjectName>_<ShortProjectId>/
├─ 00_CONTROL/
├─ 01_RESEARCH/
├─ 02_SCRIPT/
│  └─ TTS_CHUNKS/
├─ 03_AUDIO/
├─ 04_SUBTITLES/
├─ 05_ASSETS/
│  ├─ GAMEPLAY/
│  ├─ UI/
│  ├─ CHARACTER/
│  ├─ BUILD/
│  ├─ GRAPHICS/
│  ├─ MUSIC/
│  └─ SFX/
├─ 06_EDIT_PLAN/
├─ 07_CODEX_BUILD/
├─ 08_REVIEW/
├─ 09_FINAL/
└─ 10_RELEASE/
```

常见正式文件：

```text
00_CONTROL/PROJECT_DATA.json
00_CONTROL/PROJECT_MANIFEST.md
00_CONTROL/STATUS.md

01_RESEARCH/RESEARCH.md
01_RESEARCH/CONTENT_LOCK.md

02_SCRIPT/VOICE_MASTER.md
02_SCRIPT/TTS_MANIFEST.csv

03_AUDIO/AUDIO_MASTER.wav

04_SUBTITLES/SUBTITLE_MASTER.srt
04_SUBTITLES/TIMELINE_SENTENCE.csv
04_SUBTITLES/TRANSCRIPT_ALIGNED.json
04_SUBTITLES/ALIGNMENT_REPORT.md

06_EDIT_PLAN/PRE_ASSET_GUIDE.md
06_EDIT_PLAN/ASSET_INDEX.csv
06_EDIT_PLAN/EDIT_BLUEPRINT.csv
06_EDIT_PLAN/VISUAL_STYLE.md
06_EDIT_PLAN/EXPORT_SPEC.md

07_CODEX_BUILD/VIDEO_V0_REVIEW.mp4
07_CODEX_BUILD/BUILD_REPORT.md
07_CODEX_BUILD/QC_REPORT.md
07_CODEX_BUILD/MISSING_ASSET_REPORT.md

08_REVIEW/REVIEW_NOTES.md
09_FINAL/VIDEO_V1.mp4
10_RELEASE/RELEASE_PACK.md
```

### 13.2 多语言什么时候会多出目录？

只有当 Global Production 里真的存在 Language Track，并同步 / bootstrap Workspace 后，才会出现类似：

```text
02_SCRIPT/LANG/JA/
03_AUDIO/LANG/JA/
04_SUBTITLES/LANG/JA/
```

里面会有 `TRACK_MANIFEST.json` 和对应语言的 Voice / Audio / Subtitle / Timeline 文件。

不要提前手工创建一堆 ZH / JA / EN 文件夹来猜未来结构。

### 13.3 Visual Master 什么时候出现？

建立 Visual Master 并同步 Workspace 后，会出现：

```text
06_EDIT_PLAN/VISUAL_MASTER/<KEY>/
07_CODEX_BUILD/VISUAL_MASTER/<KEY>/
09_FINAL/VISUAL_MASTER/<KEY>/
```

这些目录承载统一画面母版的 Timeline、Edit Decision、Build 报告和 Master Video 等。

### 13.4 Variant 什么时候出现？

建立分发 Variant 后，会出现：

```text
10_RELEASE/VARIANTS/<KEY>/
```

用于该市场 / 画幅 / 平台组合的 Build Manifest、Export Manifest、Publish Package、QA Report、Performance Report、Release Pack 等。

### 13.5 `.gucc-projections.json` 是什么？

路径：

```text
00_CONTROL/.gucc-projections.json
```

GUCC 用它记住自己上次投影出的轻量文本 hash。

如果你手工改过本地文本，而 GUCC 发现它已经不是自己上次生成的版本，会报告 Conflict，**不会覆盖你的人工内容**。

---

## 14. 常见问题

### Q：我打开 GUCC 不知道下一步干嘛？

回 Portal → Creator Dashboard，看 **「现在做这个」**。不要先打开完整状态机。

### Q：项目为什么不显示？

先确认 Command Center 是否登录。Creator Dashboard 未登录时会显示 **「登录并读取项目」**。如果是纯本地草稿，也检查你是不是在同一个浏览器 / 设备上。

### Q：为什么 Sync 不是绿色？

现在正常界面优先显示友好状态：

- `☁ 已同步`
- `● 本地有修改 · 正在同步`
- `⚠ 冲突需要处理`

详细信息展开 **「同步详情」** 再看。正常情况不要反复手点强制同步。

### Q：为什么 Revision 变了？

Revision 是 Cloud 每次接受有效项目写入后的版本号。正常编辑同步后会增加。**仅仅切换项目 / 标签页不应该让 Revision 增加。** 如果你没改任何内容却看到 Revision 又涨了，停止继续操作并交给 `80_chat / Codex` 排查。

### Q：为什么我不能 Lock？

通常是前提没满足，例如：

- Content Lock 缺 `CONTENT_LOCK.md`
- Script Lock 缺 `VOICE_MASTER.md`
- Audio Lock 缺真实 `AUDIO_MASTER.wav`
- Picture Lock 缺 `VIDEO_V1.mp4`
- Global Gate 的 Revision / QA / 前序 Lock 不成立

不要绕过 Gate。

### Q：文件已经存在为什么还是 Missing？

“逻辑 Ready”和“物理存在”是两件事。先到 Files 看 Expected / Observed，再跑 Local Agent。

### Q：Local Agent 没观察到怎么办？

检查 Workspace Root、Project ID、标准相对路径，然后运行：

```powershell
npm.cmd run creator:agent -- --once
```

### Q：可以直接改本地文件吗？

可以，但要知道哪些是 GUCC 投影文件。`创建 / 同步本地 Workspace` 遇到人工修改过的投影文本会报告 Conflict，不会直接覆盖。修改正式锁定内容前，先重新打开对应 Gate。

### Q：哪些东西绝对不能传 Supabase？

大型媒体字节、base64 视频 / 音频、密码、service-role key、绝对本地路径。

### Q：哪些东西不能传 Drive？

不要把 Drive 当视频素材盘。完整成片、原始录屏、大音频、剪辑工程等大型媒体留本地；Drive 用于轻量项目归档。

### Q：可以跳过某些步骤吗？

可选 Capability 可以跳，例如 Music 可以选 **「不使用」**。但 Human Gate 和真正的工作流依赖不能为了赶进度跳过。

### Q：可以直接去 Publish 吗？

如果项目没有 Release Ready / Publish Package / QA / Human Review 等前提，不应该直接发布。正常跟 **「现在做这个」** 走。

### Q：为什么 Final Publish 不能自动点？

因为这是最后一个不可逆的人类责任边界。GUCC 可以准备，但不能替你决定“现在把这条内容公开给所有人”。

### Q：冲突弹窗 Local / Cloud 怎么选？

真实按钮是：

- **「保留云端」**
- **「保留本地」**
- **「尝试合并」**
- **「暂不处理」**

不确定时先选 **「暂不处理」**。

`尝试合并` 只有存在安全共同基线且双方改动不冲突时才会成功。不要因为“本地更新”就条件反射点保留本地。

### Q：浏览器关了会不会丢东西？

Production 会把本地草稿保存在浏览器 localStorage；登录后还有 Supabase 云状态。但真实媒体本来就应该在本地 Workspace。不要把浏览器缓存当唯一备份，重要项目同时维护 Workspace 和云状态。

### Q：换电脑继续项目怎么办？

在新电脑登录同一 GUCC 账号，配置新的 Local Agent / Workspace Root，把真实本地制作文件带过去，再用 `--once` 验证 Observed。

### Q：多语言视频怎么处理？

等当前 Next Action 进入语言阶段后，在 Global Production 建 Language Track。每条语言有自己的 Voice / Audio / Subtitle / Timeline，不要复制成多个 Creator Project。

### Q：同一视频多个平台版本怎么处理？

用 Variant 表示不同 Market / Format / 组合，例如 16:9 长视频和 9:16 竖版。标题、描述等平台呈现由 Platform Presentation / Publish Package 管，不要复制整个项目。

---

## 15. 故障时怎么处理

普通用户按这个顺序排：

```text
1. 页面不对
   ↓
2. 刷新页面 / 检查 GUCC Access Key 和 Command Center 登录
   ↓
3. 确认当前 Project 是不是你要的那个
   ↓
4. 看顶部友好 Sync 状态
   ↓
5. 文件问题 → Production → 文件 → Expected / Observed
   ↓
6. 本地物理文件问题 → Local Agent --once
   ↓
7. 回到“现在做这个”，确认是不是自己走错阶段
   ↓
8. 仍无法解释 → 展开“同步详情 / Legacy Workflow / 查看完整 Global Production”等高级信息
   ↓
9. 到这里再交给 80_chat / Codex
```

不要一上来就查 Supabase SQL，也不要随便改 Cloud State。

---

## 16. 示例：从零开始做一条真实游戏攻略视频

下面假设你要做：

**《绝区零｜某角色复刻攻略》**

只写你实际会做的动作。

### Step 1｜进入 GUCC

打开 Portal → 输入 Access Key → **「进入 GUCC」**。

如果 Creator Dashboard 提示未登录，点 **「登录并读取项目」**，在 Command Center 登录后回来。

### Step 2｜建项目

Creator Dashboard → **「打开 Production」**。

第一次无项目：点 **「新建项目」**。

已有项目：**「更多」→「＋ 新建项目」**。

填写：

```text
项目名称：绝区零｜某角色复刻攻略
游戏：绝区零
目标发布日期：你的真实计划日期
核心主题：当前版本怎么配队、养成、值不值得抽
备注：面向回坑玩家；只用官方中文术语
```

点 **「保存项目」**。

### Step 3｜建立本地 Workspace

项目顶部展开 **「项目设置」** → **「创建 / 同步本地 Workspace」**。

选择你的 Creator Workspace Root。

如果浏览器不支持，就在 PowerShell：

```powershell
npm.cmd run creator:agent -- --bootstrap-project <projectId>
```

### Step 4｜看唯一 Next Action

不要打开全部状态机。

看 Production 顶部：

**「现在做这个」**

新 Cloud Project 如果先要求 **Project Scope**，就先确认这期到底讲什么 / 不讲什么；没想清楚不要锁。

### Step 5｜研究和 Content Lock

完成版本、数值、机制、争议核验。

把研究结论和内容结构真正审完。

看到 **「现在需要你确认」** 时，确认对应当前 Gate。Content Lock 之前确保 `CONTENT_LOCK.md` 已 Ready。

### Step 6｜写 VOICE_MASTER

Production → **「脚本 / TTS」**。

写完整口播，必要处插 `[AV:UI]`、`[AV:NUMBER]` 等。

点：

- **「扫描 AV Anchor」**
- **「生成 TTS Chunks」**

全文确认后再 Script Lock。

### Step 7｜做音频

Production → **「音频」**。

根据这期需要选：

- 不使用音乐
- 使用已有音乐
- 生成音乐

制作最终 Voice + Music + SFX，导出：

```text
03_AUDIO/AUDIO_MASTER.wav
```

Production → **「文件」** → 最终主音频 → **「登记」**。

完整听一遍，确认不会再改长度后才 Audio Lock。

### Step 8｜做字幕 / 时间线

Production → **「字幕 / 时间线」**。

点 **「复制 Codex 字幕 Prompt」**。

把真实 `AUDIO_MASTER` + `VOICE_MASTER` 交给 Codex / ChatGPT，拿回真实 SRT。

回 GUCC：

**「导入 SRT」→「校验」→「生成 / 刷新时间线包」**。

如果校验有阻断错误，先修；不要强锁。

### Step 9｜Storyboard 和素材

Production → **「Storyboard」**。

按真实时间码建立镜头段。

Production → **「素材」**，先登记 Must 素材。

自己录 / 收集真实画面，把 Must 缺口补齐。

### Step 10｜Codex Build

到 Production Ready 后，把当前标准文件和素材交给 Codex 做 Structural Cut。

产出：

```text
07_CODEX_BUILD/VIDEO_V0_REVIEW.mp4
```

和对应 Build / QC / Missing Asset 报告。

### Step 11｜Review / Revision

Production → **「Review」**。

边看 V0 边按时间码点 **「添加 Review Note」**。

交给 Codex Revision。

重复直到问题关闭。

### Step 12｜Fine Edit / Picture Lock

完成字幕强调、BGM、SFX、节奏、动效。

最终成片：

```text
09_FINAL/VIDEO_V1.mp4
```

登记 Ready，完整人工检查后才 Picture Lock。

### Step 13｜多语言 / 多平台版本（需要时）

如果这条视频有日语 / 英语或多画幅需求，按当前 Global Production Next Action：

- 建 Language Track
- 完成各语言 Voice / Audio / Timeline
- 建 Visual Master
- 做 timing projection / edit plan
- 建 Variant，例如 16:9 / 9:16
- 建 Platform Presentation / Publish Package
- 运行 AI QA
- Human Final Review
- Release Lock

如果只做一个普通中文版本，不要为了“把所有功能用一遍”凭空制造多语言 / Variant。

### Step 14｜进入发布

Production 当前任务进入发布阶段后，点：

**「进入发布」**

Publish Console：

1. 选择完整成片 / 封面。
2. 检查各平台字段。
3. **「保存并开始预检 →」**。
4. **「运行全部检查」**。
5. **「检查通过，生成执行队列 →」**。
6. 需要时 **「一键准备全部平台」**。
7. 最终每个平台由你本人确认公开发布。
8. 保存 Post URL / ID / 发布时间。

### Step 15｜发布后复盘

Publish Console → **「数据复盘」**。

至少保存：

- T+1
- T+3
- T+7

有长期视频再补 T+30。

点 **「复制 AI 复盘 Prompt」** 做复盘。

如果 Global Production 有 Learning Proposal，回去人工看内容，然后选择：

- **「接受」**
- **「拒绝」**

只有你接受的 Learning 才应影响下一条视频。

### Step 16｜结束

确认发布记录、复盘和需要的轻量归档都完成后，再进入 Published / Archived。

大型媒体是否长期归档是另一件事；不要因为项目状态叫 Archived 就把视频上传到 Supabase / Drive。

---

## 17. 最后只记住这五条

1. **不知道做什么，就看「现在做这个」。**
2. **Human Lock 只在你真的确认后点。**
3. **AUDIO_MASTER 是真实时间轴；不要从脚本猜时间。**
4. **视频、音频、录屏、剪辑工程留本地。**
5. **GUCC 可以帮你准备发布，但最终公开发布永远由你本人确认。**
