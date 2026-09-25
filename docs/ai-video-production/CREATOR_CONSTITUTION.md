# GUCC Creator Constitution

本文件是 AI Video Production System 的**统一长期规则来源（Canonical Creator Constitution）**。项目 Stage Prompt、AI Task Prompt、Codex Build、人工 Review 都必须服从这里；项目状态、Lock 和当前正式 Artifact 决定某一条视频此刻能做什么。

## Workflow Authority

1. AI 只执行当前被允许的任务，不得为了“顺手完成”擅自跨阶段、推进状态、设置 Human Lock 或触发 Final Publish。
2. Human Lock 是真实决策边界。未明确重新打开（Reopen）的 Lock，AI 不得修改其所保护的正式内容。
3. 当前项目最新正式输入优先于聊天历史、旧稿、旧 Prompt 和旧导出；发现冲突时先指出冲突，不得自行选旧版本继续。
4. 已完成稿件的修改默认是**局部修改**：只改用户点名的句子、镜头、时间段或 Review Note。除非用户明确要求，不得自动全文重写或重新导演整条视频。
5. Codex 默认是**执行者，不是导演**：严格执行锁定脚本、真实时间轴、Storyboard / Edit Plan、素材约束和 Review Notes；不得凭自己的审美重构已确认方案。

## 事实、版本与证据

1. 最新可验证版本优先，禁止混用不同测试版本、服务器或语言版本的数据。
2. 游戏资料默认以项目指定区服 / 版本为准；其他服务器资料可用于交叉验证，但必须标注版本差异。
3. 数值、机制、官方表述和争议事实必须保留来源；无法验证时明确标记未知，不得猜测成事实。
4. 缺资料时必须报告缺口，不得用“合理推测”、AI 生成画面或旧版本资料伪装成证据。
5. 如果正式写稿前存在官方直播、PV、角色展示或实机演示，研究必须优先解析**视频本身**：声音 + 画面 + UI / 状态变化 + 时间戳。只读字幕不等于完成视频证据解析。
6. 官方视频解析至少记录：时间戳、官方说了什么、画面发生什么、UI / 状态变化、可以确认什么、证据等级；随后再进入机制研究和脚本。
7. Content / Evidence Lock 后不得因“画面更好做”或“新 Chat 不知道上下文”而改变已经锁定的结论。

## 真实素材与角色身份

1. 不得捏造游戏 UI、角色立绘、技能图标、伤害数字或不存在的录屏。
2. 素材不足时登记为 Missing，并输出 / 更新缺失素材清单；不得用伪造素材遮盖缺口。
3. 每个素材都应说明它证明、展示或解释什么。随机 Gameplay 只能作为 C 级氛围画面，不能替代机制证据。
4. 官方角色参考图用于**锁定角色身份、服装、发型、武器、关键识别特征和官方视觉事实**，不只是“画风参考”。AI 不得把角色改成相似但不同的人物。
5. 文件名必须使用可维护的语义命名；禁止使用“录屏1”“最终最终”等不可维护名称。

## 音频、字幕与时间线

1. Audio Lock 后，最终真实 `AUDIO_MASTER` 是绝对主时间轴。WHEN（何时出现）只能来自真实音频 / ASR / 已验证字幕时间码。
2. 锁定的 Script / Master Script / VOICE_MASTER 决定 WHAT（字幕应该显示什么、术语如何写）；真实朗读与锁定文本有差异时必须显式记录。
3. `SUBTITLE_MASTER` 是字幕正式时间源；**绝对禁止按文稿长度、字数、平均语速或句子长度猜 / 均分时间码。**
4. `EDIT_BLUEPRINT` / 当前正式 Edit Plan 是剪辑结构基准。画面优先级始终为 A（AV Anchor）> B（Evidence Visual）> C（Ambient Gameplay）。
5. Language Timeline 与 Visual Master Timeline 是不同身份；视觉语义可以复用，但每个语言版本必须投影到自己的真实音频时间。
6. Timeline / Alignment 显示 REVIEW_REQUIRED 时必须停下人工检查；不得用强制覆盖来伪造“已对齐”。

## 像素机制动画

1. 像素动画的目的首先是**解释机制**，不是装饰、转场或填空镜头。
2. 关闭声音时，观众仍应大致看懂“谁做了什么 → 哪个资源 / 状态变化 → 触发了什么结果”。
3. 优先使用角色、动作、资源条、状态、Buff / Debuff、敌人标记、技能触发、因果箭头和时间顺序表达机制变化。
4. 不得把像素包做成静态 PPT；需要用时间上的动作、触发、变化和反馈表达机制。
5. 机制需要真实游戏证据时，不得用 AI 假游戏画面替代。像素动画只能做抽象解释 / 教学可视化，必须与证据画面职责分开。

## Build 与 Review

1. V0 只做 Structural Cut，先确认内容、镜头、时间、字幕和 AV Anchor 正确。
2. Revision 只处理带时间码的 `REVIEW_NOTES.md` 或用户明确指出的局部范围，不得擅自打开已经锁定的 Content、Script、Audio、Visual 或 Picture。
3. Fine Edit 才处理字幕强调、信息动效、SFX、BGM 与节奏细化；视觉效果保持克制，避免无信息装饰和廉价 AI 感。
4. Picture / Master Render Lock 后只允许 QC、编码、导出和发布打包；要改画面必须先由人明确 Reopen 对应 Gate。

## Audience-facing Clean Output

1. 最终给观众看到的脚本、字幕、动画、成片和发布文案中，不得出现内部制作信息，例如：`LOCK`、`TODO`、`AI`、`Codex`、Prompt、内部审核、Review Note、修改记录、文件路径、状态机、待办或调试标记。
2. 内部字段可以存在于 Build Report / QC / Handoff 等制作文件，但必须与 Audience-facing Output 分离。
3. AI 在生成最终稿时必须主动检查并清除上述内部制作痕迹。

## 交接规则

1. AI 必须先读取当前 Video Contract / Project 状态和必要正式输入，再执行任务；聊天历史不能替代项目状态。
2. 每次 AI 交接必须列出：实际使用的 Source of Truth、实际输出、未解决问题、是否触碰 Lock、下一责任方。
3. 聊天里的“已经完成”不构成阶段完成；只有项目正式 Artifact / 状态更新后才算真正交接。
4. 缺失输入时 Fail Closed：列出确切需要补什么，不得自动跨阶段生成一个“看起来完成”的结果。

## 发布表达

标题、封面和平台 metadata 必须兑现成片内容，不得夸大结论、伪造福利、诱导互动或堆砌关键词。各平台硬限制以当前发布页为准，真实外部发布与 Final Publish Confirmation 必须由用户确认。
