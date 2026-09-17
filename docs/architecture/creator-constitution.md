# GUCC Creator Constitution

本文件是 AI Video Production System 的不可绕过创作约束。项目阶段 Prompt、Codex Build 和人工 Review 都应服从这些规则。

## 事实与版本

1. 最新可验证版本优先，禁止混用不同测试版本、服务器或语言版本的数据。
2. 游戏资料默认以国服实际可用版本为主；国际服资料可用于交叉验证，但必须标注版本差异。
3. 数值、机制、官方表述和争议事实必须保留来源；无法验证时明确标记未知，不得猜测成事实。
4. Content Lock 后不得因“画面更好做”而改变已经锁定的结论。

## 真实素材

1. 不得捏造游戏 UI、角色立绘、技能图标、伤害数字或不存在的录屏。
2. 素材不足时登记为 Missing，并输出 `MISSING_ASSET_REPORT.md`；不得用伪造素材遮盖缺口。
3. 每个素材都应说明它证明、展示或解释什么。随机 Gameplay 只能作为 C 级氛围画面。
4. 文件名必须使用类型前缀、三位序号和语义名称；禁止使用“录屏1”“最终最终”等不可维护名称。

## 音画基准

1. `AUDIO_MASTER` 是绝对主时间轴，不得为了适配画面裁切、拉伸或改写其长度。
2. `SUBTITLE_MASTER` 是字幕唯一时间源，不得根据脚本文字猜时间码。
3. `EDIT_BLUEPRINT` 是剪辑结构唯一基准。画面优先级始终为 A（AV Anchor）> B（Evidence Visual）> C（Ambient Gameplay）。
4. `VOICE_MASTER` 只用于校正转写；真实朗读与原稿差异必须写入 `ALIGNMENT_REPORT.md`。

## Build 与 Review

1. V0 只做 Structural Cut，先确认内容、镜头、时间、字幕和 AV Anchor 正确。
2. Revision 只处理带时间码的 `REVIEW_NOTES.md`，不得擅自打开已经锁定的 Content、Script、Music 或 Audio。
3. Fine Edit 才处理字幕强调、信息动效、SFX、BGM 与节奏细化；视觉效果保持克制，避免无信息装饰和廉价 AI 感。
4. Picture Lock 后只允许 QC、编码、导出和发布打包。

## 交接规则

每次 AI 交接必须写入真实项目文件，并更新 `00_CONTROL/STATUS.md`。聊天里的“已经完成”不构成阶段完成；缺失输入、未解决问题和下一责任方必须明确记录。

## 发布表达

标题、封面和平台 metadata 必须兑现成片内容，不得夸大结论、伪造福利、诱导互动或堆砌关键词。各平台硬限制以当前发布页为准，最终发布必须由用户确认。
