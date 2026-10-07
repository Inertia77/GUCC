# PROJECT_PROMPT_FLOW

## PF-001｜直播前项目基线与需求研究

- EXECUTOR: Work
- DEPENDENCIES: NONE
- CAPABILITY: PLAYER_DEMAND_RESEARCH
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: PROJECT_BRIEF.md, PRELIVE_BASELINE.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-001｜直播前项目基线与需求研究】
【Executor】Work
【Capability】PLAYER_DEMAND_RESEARCH / Player Demand Research
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
直播前只做玩家问题、竞品、官方已公开基线与风险，不提前写完整正文。

【Dependencies / Read From Previous】
Dependencies: NONE
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 游戏/版本/主题

【Optional Input】
- 已有社区链接
- 频道受众线索

【CORE METHOD】
- 扫描 B站/NGA/贴吧/米游社/Reddit/YouTube 等实际可访问社区。
- 记录原帖 URL、日期、可见指标和语境；热度、价值、争议、误解、搜索需求分开判断。
- 输出 Top 问题、已讲烂内容、竞品空白与本期最值得解决的问题。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[FAILURE_WARNING] 缺可选资料不能升级成 NEED_INPUT；先完成能确定的部分。
[HARD_CONSTRAINT] 不能编造热度、排名、搜索量、玩家共识或竞品表现。
[HARD_CONSTRAINT] 不能编造来源 URL、视频 ID、发布时间、数值、角色术语。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 问题可追溯到真实讨论
- 不以单帖冒充社区共识

【Skip Condition】
- 无

【Output / Save As】
- PROJECT_BRIEF.md
- PRELIVE_BASELINE.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-001","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

【CHAT_FALLBACK】
联网能力有限时基于用户给的真实帖子做小样本研究，明确覆盖范围。
```

## PF-002｜等待 3.3 Special Program

- EXECUTOR: System
- DEPENDENCIES: PF-001
- CAPABILITY: OFFICIAL_SOURCE_RESEARCH
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: WAITING
- SAVE_AS: CURRENT_TASK.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-002｜等待 3.3 Special Program】
【Executor】System
【Capability】OFFICIAL_SOURCE_RESEARCH / Official Source Research
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
条件节点：等待官方前瞻真正公开；不猜直播内容。

【Dependencies / Read From Previous】
Dependencies: PF-001
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 游戏/版本/角色/研究问题

【Optional Input】
- 无

【CORE METHOD】
- 视频优先 YouTube 官方频道原始上传，其次官网/媒体中心，必要时才用 B站官方号。
- 逐项核对频道主体、CHANNEL_ID、VIDEO_ID、游戏、角色、区服、版本、发布日期、实际内容。
- 图片优先官网/官方公告/Media Kit 原图；影画/技能等只有官方文字时保存文字真值并允许后续做 GENERATED_EXPLANATION。
- 输出来源页面 URL 与直接媒体 URL 分离。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 不能编造来源 URL、视频 ID、发布时间、数值、角色术语。
[HARD_CONSTRAINT] 不能把旧版本、其他区服或不同测试阶段资料覆盖当前项目已确认版本事实。
[HARD_CONSTRAINT] 分析前核对游戏、角色、版本、区服、官方主体、VIDEO_ID；来源不匹配立即 SOURCE_MISMATCH。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT
- 正式直播尚未公开时不得伪造其内容

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 每个 VERIFIED 来源身份可解释
- 错误候选有排除原因

【Skip Condition】
- 无

【Output / Save As】
- CURRENT_TASK.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-002","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

【CHAT_FALLBACK】
无；这是条件等待节点。
```

## PF-003｜核验官方 YouTube Master 与字幕

- EXECUTOR: Work
- DEPENDENCIES: PF-002
- CAPABILITY: OFFICIAL_SOURCE_RESEARCH
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SOURCE_VERIFICATION.md, SOURCE_DOWNLOAD_MANIFEST.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-003｜核验官方 YouTube Master 与字幕】
【Executor】Work
【Capability】OFFICIAL_SOURCE_RESEARCH / Official Source Research
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
定位并核验 3.3 官方 YouTube 原上传与官方字幕，排除搬运/旧版/错误视频。

【Dependencies / Read From Previous】
Dependencies: PF-002
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 游戏/版本/角色/研究问题

【Optional Input】
- 无

【CORE METHOD】
- 视频优先 YouTube 官方频道原始上传，其次官网/媒体中心，必要时才用 B站官方号。
- 逐项核对频道主体、CHANNEL_ID、VIDEO_ID、游戏、角色、区服、版本、发布日期、实际内容。
- 图片优先官网/官方公告/Media Kit 原图；影画/技能等只有官方文字时保存文字真值并允许后续做 GENERATED_EXPLANATION。
- 输出来源页面 URL 与直接媒体 URL 分离。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 不能编造来源 URL、视频 ID、发布时间、数值、角色术语。
[HARD_CONSTRAINT] 不能把旧版本、其他区服或不同测试阶段资料覆盖当前项目已确认版本事实。
[HARD_CONSTRAINT] 分析前核对游戏、角色、版本、区服、官方主体、VIDEO_ID；来源不匹配立即 SOURCE_MISMATCH。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 每个 VERIFIED 来源身份可解释
- 错误候选有排除原因

【Skip Condition】
- 无

【Output / Save As】
- SOURCE_VERIFICATION.md
- SOURCE_DOWNLOAD_MANIFEST.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-003","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

【CHAT_FALLBACK】
逐个少量搜索并核验，宁可 NEED_VERIFY 也不伪造 URL。
```

## PF-004｜Acquire & Register Official Source

- EXECUTOR: Codex
- DEPENDENCIES: PF-003
- CAPABILITY: ACQUIRE_REGISTER_OFFICIAL_SOURCE
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: DOWNLOAD_REPORT.md, MEDIA_PROBE.json, SOURCE_DOWNLOAD_MANIFEST.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-004｜Acquire & Register Official Source】
【Executor】Codex
【Capability】ACQUIRE_REGISTER_OFFICIAL_SOURCE / Acquire & Register Official Source
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
下载共享 Master + 官方字幕 + metadata + ffprobe 并登记；不创建 Proxy。

【Dependencies / Read From Previous】
Dependencies: PF-003
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- SOURCE_DOWNLOAD_MANIFEST
- 本地项目根目录

【Optional Input】
- 已有文件
- yt-dlp/FFmpeg路径

【CORE METHOD】
- 一次完成下载、字幕/metadata、ffprobe/图片验证与 Source 注册；复用现有文件，不覆盖 Master。
- YouTube 官方视频保留高清 Master；图片验证 Content-Type/magic bytes/尺寸。
- 记录 ASSET_ID、来源、路径、媒体参数、RIGHTS_STATUS、EDIT_USE_ALLOWED、ATTRIBUTION。

【MANDATORY GUARDRAILS】
- 不绕过 DRM/付费墙/登录限制。
- 云端无本地权限时只交脚本，不能声称下载完成。
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 批处理默认不覆盖 Master / 原始素材；移动前 Dry Run，冲突时停止。
[FAILURE_WARNING] Work 擅长浏览器和多资料研究，不假设它自动拥有 Windows 本地路径访问权。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 每个 DOWNLOADED_VERIFIED 都有真实文件验证
- 失败项独立报告

【Skip Condition】
- PROXY明确NOT_PLANNED；本节点只获取Master，不执行代理转码

【Output / Save As】
- DOWNLOAD_REPORT.md
- MEDIA_PROBE.json
- SOURCE_DOWNLOAD_MANIFEST.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-004","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

【CHAT_FALLBACK】
生成幂等 PowerShell/yt-dlp/FFmpeg 脚本→用户运行→回传真实结果→Chat登记。
```

## PF-005｜Codex Local Source Analysis

- EXECUTOR: Codex
- DEPENDENCIES: PF-004
- CAPABILITY: VIDEO_SOURCE_ANALYSIS
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SOURCE_ANALYSIS_SHARED_PROGRAM.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-005｜Codex Local Source Analysis】
【Executor】Codex
【Capability】VIDEO_SOURCE_ANALYSIS / Video Source Analysis
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
Codex 直接分析本地 Master 的声音、连续画面、UI、动作与时间戳；PROXY=NOT_PLANNED。

【Dependencies / Read From Previous】
Dependencies: PF-004
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 实际可读视频或片段
- Master映射（如使用Proxy）

【Optional Input】
- 官方字幕
- 研究问题

【CORE METHOD】
- 先复核 SOURCE_IDENTITY。
- 逐证据记录 Master 时间、官方说法、画面动作、UI/状态、可以确认什么、不能确认什么。
- 字幕只辅助定位；必须看连续画面。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[FAILURE_WARNING] 不能只读字幕猜动作、UI、资源变化或镜头事实。
[BEST_PRACTICE] 机制分析优先看连续画面、UI、音频、动作前后关系与真实时间戳。
[HARD_CONSTRAINT] Proxy / 分段时间不能直接当 Master 时间；必须保留绝对偏移映射。
[HARD_CONSTRAINT] 分析前核对游戏、角色、版本、区服、官方主体、VIDEO_ID；来源不匹配立即 SOURCE_MISMATCH。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT
- 要求具体画面结论但视频不可访问

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 高价值结论都有视频证据时间锚点
- 不把解释动画/字幕当实机证据

【Skip Condition】
- 仅当Codex实际无法读取Master且上传条件受限时，才由编译器ADD PROXY_MEDIA

【Output / Save As】
- SOURCE_ANALYSIS_SHARED_PROGRAM.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-005","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

【CHAT_FALLBACK】
若当前Chat确实能看视频则分片分析；否则只处理已有分析MD，不冒充观看。
```

## PF-006｜Shared Program Analysis

- EXECUTOR: Work
- DEPENDENCIES: PF-005
- CAPABILITY: MECHANIC_RESEARCH
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SHARED_PROGRAM_ANALYSIS.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-006｜Shared Program Analysis】
【Executor】Work
【Capability】MECHANIC_RESEARCH / Mechanic Research
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
把共用直播证据整理成两条视频可共享的正式信息、未知边界与角色分流研究问题。

【Dependencies / Read From Previous】
Dependencies: PF-005
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 官方文本/视频分析/实机证据中的至少一种

【Optional Input】
- 无

【CORE METHOD】
- 先列现象→触发→状态/资源→结果→边界。
- 把官方确认、实机确认、分析、未知分层。
- 遇到冲突优先核对版本与条件，不强行统一。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 测试服、泄露、拆包、二手传闻不得包装成官方事实。
[HARD_CONSTRAINT] 不能把旧版本、其他区服或不同测试阶段资料覆盖当前项目已确认版本事实。
[FAILURE_WARNING] 不能只读字幕猜动作、UI、资源变化或镜头事实。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 核心结论来源清楚
- 没有把相关性写成因果

【Skip Condition】
- 无

【Output / Save As】
- SHARED_PROGRAM_ANALYSIS.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-006","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F01｜FIONI Research

- EXECUTOR: Work
- DEPENDENCIES: PF-006
- CAPABILITY: MECHANIC_RESEARCH
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: FIONI_RESEARCH.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F01｜FIONI Research】
【Executor】Work
【Capability】MECHANIC_RESEARCH / Mechanic Research
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
建立规则、触发条件、状态、资源、边界条件与因果链。

【Dependencies / Read From Previous】
Dependencies: PF-006
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 官方文本/视频分析/实机证据中的至少一种

【Optional Input】
- 无

【CORE METHOD】
- 先列现象→触发→状态/资源→结果→边界。
- 把官方确认、实机确认、分析、未知分层。
- 遇到冲突优先核对版本与条件，不强行统一。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 测试服、泄露、拆包、二手传闻不得包装成官方事实。
[HARD_CONSTRAINT] 不能把旧版本、其他区服或不同测试阶段资料覆盖当前项目已确认版本事实。
[FAILURE_WARNING] 不能只读字幕猜动作、UI、资源变化或镜头事实。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 核心结论来源清楚
- 没有把相关性写成因果

【Skip Condition】
- 无

【Output / Save As】
- FIONI_RESEARCH.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F01","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S01｜SEVERIAN Research

- EXECUTOR: Work
- DEPENDENCIES: PF-006
- CAPABILITY: MECHANIC_RESEARCH
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SEVERIAN_RESEARCH.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S01｜SEVERIAN Research】
【Executor】Work
【Capability】MECHANIC_RESEARCH / Mechanic Research
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
建立规则、触发条件、状态、资源、边界条件与因果链。

【Dependencies / Read From Previous】
Dependencies: PF-006
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 官方文本/视频分析/实机证据中的至少一种

【Optional Input】
- 无

【CORE METHOD】
- 先列现象→触发→状态/资源→结果→边界。
- 把官方确认、实机确认、分析、未知分层。
- 遇到冲突优先核对版本与条件，不强行统一。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 测试服、泄露、拆包、二手传闻不得包装成官方事实。
[HARD_CONSTRAINT] 不能把旧版本、其他区服或不同测试阶段资料覆盖当前项目已确认版本事实。
[FAILURE_WARNING] 不能只读字幕猜动作、UI、资源变化或镜头事实。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 核心结论来源清楚
- 没有把相关性写成因果

【Skip Condition】
- 无

【Output / Save As】
- SEVERIAN_RESEARCH.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S01","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F02｜FIONI LONG / SHORT / CANCEL Gate

- EXECUTOR: Chat
- DEPENDENCIES: PF-F01
- CAPABILITY: CORE_THESIS
- QC: Q2
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: FIONI_FORMAT_GATE.md, FIONI_CORE_THESIS.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F02｜FIONI LONG / SHORT / CANCEL Gate】
【Executor】Chat
【Capability】CORE_THESIS / Core Thesis
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
按直播后真实信息量决定菲欧妮做长、短或取消；不为了排期硬做长视频。

【Dependencies / Read From Previous】
Dependencies: PF-F01
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 玩家问题
- 研究结论

【Optional Input】
- 无

【CORE METHOD】
- 一句话回答：观众看完真正知道/会做什么。
- 列必须讲、可删、不能讲与标题/封面承诺边界。
- 长短形式由信息密度决定，不默认10分钟。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[FAILURE_WARNING] 不为了凑 10 分钟或完整攻略而重复信息、硬塞百科内容。
[BEST_PRACTICE] 标题/封面承诺、开场问题和正文核心结论必须互相兑现。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 命题可被证据支撑
- LONG/SHORT/CANCEL判断可解释

【Skip Condition】
- 无

【Output / Save As】
- FIONI_FORMAT_GATE.md
- FIONI_CORE_THESIS.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F02","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

```

## PF-S02｜SEVERIAN LONG / SHORT / CANCEL Gate

- EXECUTOR: Chat
- DEPENDENCIES: PF-S01
- CAPABILITY: CORE_THESIS
- QC: Q2
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: SEVERIAN_FORMAT_GATE.md, SEVERIAN_CORE_THESIS.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S02｜SEVERIAN LONG / SHORT / CANCEL Gate】
【Executor】Chat
【Capability】CORE_THESIS / Core Thesis
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
按直播后真实信息量决定赛维里安做长、短或取消。

【Dependencies / Read From Previous】
Dependencies: PF-S01
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 玩家问题
- 研究结论

【Optional Input】
- 无

【CORE METHOD】
- 一句话回答：观众看完真正知道/会做什么。
- 列必须讲、可删、不能讲与标题/封面承诺边界。
- 长短形式由信息密度决定，不默认10分钟。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[FAILURE_WARNING] 不为了凑 10 分钟或完整攻略而重复信息、硬塞百科内容。
[BEST_PRACTICE] 标题/封面承诺、开场问题和正文核心结论必须互相兑现。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 命题可被证据支撑
- LONG/SHORT/CANCEL判断可解释

【Skip Condition】
- 无

【Output / Save As】
- SEVERIAN_FORMAT_GATE.md
- SEVERIAN_CORE_THESIS.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S02","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

```

## PF-F03｜FIONI · Content Structure

- EXECUTOR: Chat
- DEPENDENCIES: PF-F02
- CAPABILITY: CONTENT_STRUCTURE
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: CONTENT_OUTLINE.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F03｜FIONI · Content Structure】
【Executor】Chat
【Capability】CONTENT_STRUCTURE / Content Structure
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
为当前产品类型安排信息顺序、章节、钩子与证据位置。

【Dependencies / Read From Previous】
Dependencies: PF-F02
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- CORE_THESIS
- 研究结论

【Optional Input】
- 无

【CORE METHOD】
- 开头15–30秒直击问题。
- 章节只服务命题；短内容不强制章节。
- 把证据、判断、操作与收益按因果排列。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[FAILURE_WARNING] 不为了凑 10 分钟或完整攻略而重复信息、硬塞百科内容。
[BEST_PRACTICE] 标题/封面承诺、开场问题和正文核心结论必须互相兑现。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 删掉任一章节会损失明确价值
- 没有百科式填充

【Skip Condition】
- 无

【Output / Save As】
- CONTENT_OUTLINE.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F03","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F04｜FIONI · Script

- EXECUTOR: Chat
- DEPENDENCIES: PF-F03
- CAPABILITY: SCRIPT_DRAFT
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_DRAFT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F04｜FIONI · Script】
【Executor】Chat
【Capability】SCRIPT_DRAFT / Script
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
生成自然、准确、高信息密度的真人口播稿。

【Dependencies / Read From Previous】
Dependencies: PF-F03
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- CORE_THESIS
- CONTENT_OUTLINE
- 研究材料

【Optional Input】
- 无

【CORE METHOD】
- 直接判断→证据→因果→操作/决策。
- 重要答案前置；每段有新信息。
- 产品类型决定语言：机制更重UI/状态因果，剧情更重事件/主题/人物关系，决策更重条件与机会成本。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[FAILURE_WARNING] 不为了凑 10 分钟或完整攻略而重复信息、硬塞百科内容。
[BEST_PRACTICE] 避免公告腔、百科堆砌、机械转场、连续总结与 AI 模板句。
[BEST_PRACTICE] 标题/封面承诺、开场问题和正文核心结论必须互相兑现。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 正文兑现命题
- 没有把分析写成官方事实

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_DRAFT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F04","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F05｜FIONI · Fact / Mechanic / Terminology QC

- EXECUTOR: Work
- DEPENDENCIES: PF-F04
- CAPABILITY: SCRIPT_FACT_QC
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_REVIEW_FACT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F05｜FIONI · Fact / Mechanic / Terminology QC】
【Executor】Work
【Capability】SCRIPT_FACT_QC / Fact / Mechanic / Terminology QC
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
独立检查术语、数值、机制、版本、配队、排轴与证据边界。

【Dependencies / Read From Previous】
Dependencies: PF-F04
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 当前稿
- 证据/正式术语真值

【Optional Input】
- 无

【CORE METHOD】
- 逐问题给位置/问题/正确依据/最低成本改法。
- 事实型 P1 未核实不能 PASS。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 不能编造来源 URL、视频 ID、发布时间、数值、角色术语。
[HARD_CONSTRAINT] 不能把旧版本、其他区服或不同测试阶段资料覆盖当前项目已确认版本事实。
[HARD_CONSTRAINT] 未 Reopen 或无充分新证据时不得修改 SCRIPT_LOCK。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 无未解决P0/事实型P1才PASS

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_REVIEW_FACT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F05","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F06｜FIONI · Content Value / Logic QC

- EXECUTOR: Work
- DEPENDENCIES: PF-F05
- CAPABILITY: SCRIPT_VALUE_QC
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_REVIEW_VALUE.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F06｜FIONI · Content Value / Logic QC】
【Executor】Work
【Capability】SCRIPT_VALUE_QC / Content Value / Logic QC
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
检查核心命题兑现、逻辑链、信息增量、产品类型与收藏分享价值。

【Dependencies / Read From Previous】
Dependencies: PF-F05
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 当前稿
- CORE_THESIS
- 产品类型

【Optional Input】
- 无

【CORE METHOD】
- 逐段判断新认识/机制/因果/操作/误区/决策价值。
- 标 DELETE/KEEP/P0/P1。
- 检查标题/封面承诺是否由正文支撑。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[FAILURE_WARNING] 不为了凑 10 分钟或完整攻略而重复信息、硬塞百科内容。
[BEST_PRACTICE] 标题/封面承诺、开场问题和正文核心结论必须互相兑现。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 核心命题完整兑现且无影响价值/逻辑P0/P1

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_REVIEW_VALUE.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F06","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F07｜FIONI · Anti-AI / Retention QC

- EXECUTOR: Chat
- DEPENDENCIES: PF-F06
- CAPABILITY: SCRIPT_NATURALNESS_QC
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_REVIEW_NATURALNESS.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F07｜FIONI · Anti-AI / Retention QC】
【Executor】Chat
【Capability】SCRIPT_NATURALNESS_QC / Anti-AI / Retention QC
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
去模板化语言并检查前30秒与中段留存。

【Dependencies / Read From Previous】
Dependencies: PF-F06
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 当前稿

【Optional Input】
- 无

【CORE METHOD】
- 扫描否定再肯定、反而、模板转场、空泛强调、重复总结、假互动和过度工整。
- 只给DIFF建议，不为了自然故意说乱。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[BEST_PRACTICE] 避免公告腔、百科堆砌、机械转场、连续总结与 AI 模板句。
[BEST_PRACTICE] 已确认稿件默认 DIFF MODE，只改事实错误、新正式资料或严重逻辑问题。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 真人可念、节奏有变化、没有明显AI模板堆叠

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_REVIEW_NATURALNESS.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F07","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F08｜FIONI · DIFF Revision

- EXECUTOR: Chat
- DEPENDENCIES: PF-F07
- CAPABILITY: SCRIPT_DIFF_REVISION
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_REVISED.md, SCRIPT_REVIEW.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F08｜FIONI · DIFF Revision】
【Executor】Chat
【Capability】SCRIPT_DIFF_REVISION / DIFF Revision
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
合并审核结果，对当前稿做最低成本修订并保留已确认部分。

【Dependencies / Read From Previous】
Dependencies: PF-F07
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 当前稿
- 审核结果

【Optional Input】
- 无

【CORE METHOD】
- 只改对应位置。
- 事实错误优先；新资料只影响相关段落。
- 修后再次检查受影响的事实/逻辑/自然度。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 未 Reopen 或无充分新证据时不得修改 SCRIPT_LOCK。
[BEST_PRACTICE] 已确认稿件默认 DIFF MODE，只改事实错误、新正式资料或严重逻辑问题。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 没有顺手全文重写
- 受影响审核项关闭

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_REVISED.md
- SCRIPT_REVIEW.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F08","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F09｜FIONI · SCRIPT_LOCK Gate

- EXECUTOR: Human
- DEPENDENCIES: PF-F08
- CAPABILITY: SCRIPT_LOCK_GATE
- QC: Q3
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: SCRIPT_LOCK状态/锁定稿引用

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F09｜FIONI · SCRIPT_LOCK Gate】
【Executor】Human
【Capability】SCRIPT_LOCK_GATE / SCRIPT_LOCK Gate
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
把三类真实审核结果与当前稿绑定，只有真正通过时由用户确认 SCRIPT_LOCK。

【Dependencies / Read From Previous】
Dependencies: PF-F08
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 当前稿
- SCRIPT_REVIEW_FACT
- SCRIPT_REVIEW_VALUE
- SCRIPT_REVIEW_NATURALNESS

【Optional Input】
- 无

【CORE METHOD】
- 确认三类审核针对同一当前稿。
- 存在未解决P0/P1时不锁。
- 用户确认后记录锁定稿身份/版本；AI不能自行设置Human Lock。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 没有真实写入和回读就不能声称已保存、更新或同步。
[HARD_CONSTRAINT] 未 Reopen 或无充分新证据时不得修改 SCRIPT_LOCK。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT
- 审核未完成或锁定稿身份不明确

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q3】
- 三类审核真实PASS
- 用户明确确认SCRIPT_LOCK

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_LOCK状态/锁定稿引用

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F09","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

【CHAT_FALLBACK】
Chat只汇总是否满足锁定条件并指出缺口；不能替用户宣告Human Lock。
```

## PF-F10｜FIONI · Reading Script / TTS Prep

- EXECUTOR: Chat
- DEPENDENCIES: PF-F09
- CAPABILITY: READING_SCRIPT
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_READ.md 或 TTS_TEMP.srt, TTS_PRONUNCIATION_MAP.md, TTS_README.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F10｜FIONI · Reading Script / TTS Prep】
【Executor】Chat
【Capability】READING_SCRIPT / Reading Script / TTS Prep
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
把 SCRIPT_LOCK 准备成人类或剪映 AI 可稳定朗读的输入。

【Dependencies / Read From Previous】
Dependencies: PF-F09
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- SCRIPT_LOCK正文

【Optional Input】
- 真人/AI朗读模式
- 多人角色分配

【CORE METHOD】
- 真人模式保持正式文本并按自然语义分块。
- AI模式生成TTS_TEMP.srt，每cue≤500可见字符、尽量430–490；用发音映射处理多音字、生僻字、专名、数字/符号。
- TTS临时时码只为导入，不是真实Timeline。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 未 Reopen 或无充分新证据时不得修改 SCRIPT_LOCK。
[FAILURE_WARNING] TTS_TEMP.srt 只用于 AI 朗读，临时时码不能污染最终时间线。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 不改变事实/语义
- TTS安全写法有Pronunciation Map

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_READ.md 或 TTS_TEMP.srt
- TTS_PRONUNCIATION_MAP.md
- TTS_README.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F10","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F11｜FIONI · AUDIO_MASTER Capture

- EXECUTOR: Human
- DEPENDENCIES: PF-F10
- CAPABILITY: AUDIO_MASTER_CAPTURE
- QC: Q3
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: AUDIO_MASTER, AUDIO_MASTER_METADATA.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F11｜FIONI · AUDIO_MASTER Capture】
【Executor】Human
【Capability】AUDIO_MASTER_CAPTURE / AUDIO_MASTER Capture
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
取得最终连续旁白音频，作为之后时间轴唯一WHEN真值。

【Dependencies / Read From Previous】
Dependencies: PF-F10
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- SCRIPT_LOCK正文
- 朗读/录音方式

【Optional Input】
- TTS_TEMP.srt
- 多人朗读拆分

【CORE METHOD】
- 真人录音或AI朗读均需最终导出连续音频。
- 不把临时TTS字幕时码当真实Timeline。
- 记录最终音频文件名、时长、采样率与版本。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 最终真实 AUDIO_MASTER 决定 WHEN；未有最终音频不能生成真实 FINAL.srt / TIMELINE_MASTER。
[FAILURE_WARNING] TTS_TEMP.srt 只用于 AI 朗读，临时时码不能污染最终时间线。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q3】
- 真实AUDIO_MASTER可访问且完整
- 内容对应当前SCRIPT_LOCK

【Skip Condition】
- 无

【Output / Save As】
- AUDIO_MASTER
- AUDIO_MASTER_METADATA.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F11","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

【CHAT_FALLBACK】
Chat只能准备朗读输入/检查元数据；最终真实音频仍需用户或实际音频工具产生。
```

## PF-F12｜FIONI · AUDIO_LOCK Gate

- EXECUTOR: Human
- DEPENDENCIES: PF-F11
- CAPABILITY: AUDIO_LOCK_GATE
- QC: Q3
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: AUDIO_LOCK状态

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F12｜FIONI · AUDIO_LOCK Gate】
【Executor】Human
【Capability】AUDIO_LOCK_GATE / AUDIO_LOCK Gate
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
确认最终AUDIO_MASTER后冻结叙事时间源，允许进入精确字幕/Timeline。

【Dependencies / Read From Previous】
Dependencies: PF-F11
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- AUDIO_MASTER
- SCRIPT_LOCK引用

【Optional Input】
- 无

【CORE METHOD】
- 检查音频可访问、完整、对应当前锁稿。
- 用户确认AUDIO_LOCK；随后所有真实时间只服从该音频。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 没有真实写入和回读就不能声称已保存、更新或同步。
[HARD_CONSTRAINT] 最终真实 AUDIO_MASTER 决定 WHEN；未有最终音频不能生成真实 FINAL.srt / TIMELINE_MASTER。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT
- 最终AUDIO_MASTER不存在/不可访问

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q3】
- 用户明确确认AUDIO_LOCK
- AUDIO_MASTER身份唯一

【Skip Condition】
- 无

【Output / Save As】
- AUDIO_LOCK状态

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F12","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

【CHAT_FALLBACK】
Chat只报告是否满足锁定前提，不可代替Human Lock。
```

## PF-F13｜FIONI · Precise SRT Alignment

- EXECUTOR: Work
- DEPENDENCIES: PF-F12
- CAPABILITY: PRECISE_SRT_ALIGNMENT
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: FINAL.srt, ALIGNMENT_REPORT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F13｜FIONI · Precise SRT Alignment】
【Executor】Work
【Capability】PRECISE_SRT_ALIGNMENT / Precise SRT Alignment
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
用真实 AUDIO_MASTER 对齐锁定文字，生成最终字幕。

【Dependencies / Read From Previous】
Dependencies: PF-F12
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- AUDIO_MASTER
- SCRIPT_LOCK正文

【Optional Input】
- TTS_PRONUNCIATION_MAP

【CORE METHOD】
- 真实ASR/对齐取WHEN，锁定文本取WHAT。
- 自然意群切cue，ASR错词用锁定文本校正。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 禁止按字数、平均语速、脚本长度或句长猜时间。
[HARD_CONSTRAINT] ASR 只提供时间参考，不能覆盖锁定角色名、术语与正式字幕文字。
[HARD_CONSTRAINT] 最终真实 AUDIO_MASTER 决定 WHEN；未有最终音频不能生成真实 FINAL.srt / TIMELINE_MASTER。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT
- 没有该角色视频最终 AUDIO_MASTER 时 NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 所有时间来自真实音频
- 无重叠/倒序
- 术语与锁稿一致

【Skip Condition】
- 无

【Output / Save As】
- FINAL.srt
- ALIGNMENT_REPORT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F13","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

【CHAT_FALLBACK】
只有当前Chat确实能处理音频对齐时执行；否则提供本地对齐方案，不能猜时间。
```

## PF-F14｜FIONI · TIMELINE_MASTER

- EXECUTOR: Chat
- DEPENDENCIES: PF-F13
- CAPABILITY: TIMELINE_MASTER
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: TIMELINE_MASTER.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F14｜FIONI · TIMELINE_MASTER】
【Executor】Chat
【Capability】TIMELINE_MASTER / TIMELINE_MASTER
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
从真实音频/最终字幕建立后续画面、声音、蓝图共同使用的语义时间锚点。

【Dependencies / Read From Previous】
Dependencies: PF-F13
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- FINAL.srt
- AUDIO_MASTER
- SCRIPT_LOCK

【Optional Input】
- 无

【CORE METHOD】
- 每段记录SEGMENT_ID/START/END/LOCKED_TEXT/SECTION/SEMANTIC_PURPOSE/KEY_TERMS/IMPORTANT_BEAT/PAUSE/ANCHOR_CANDIDATE。
- 不在此阶段提前决定具体视觉或SFX。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 最终真实 AUDIO_MASTER 决定 WHEN；未有最终音频不能生成真实 FINAL.srt / TIMELINE_MASTER。
[BEST_PRACTICE] AUDIO_MASTER / FINAL.srt / TIMELINE_MASTER / Codex 输出统一 00:00。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT
- FINAL.srt不是真实音频对齐结果

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 与FINAL.srt/AUDIO_MASTER同00:00
- 无猜测时间

【Skip Condition】
- 无

【Output / Save As】
- TIMELINE_MASTER.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F14","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F15｜FIONI · Visual Direction

- EXECUTOR: Chat
- DEPENDENCIES: PF-F14
- CAPABILITY: VISUAL_DIRECTION
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: VISUAL_DIRECTION.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F15｜FIONI · Visual Direction】
【Executor】Chat
【Capability】VISUAL_DIRECTION / Visual Direction
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
根据最终旁白/Timeline决定每段最有效的视觉语言与证据职责。

【Dependencies / Read From Previous】
Dependencies: PF-F14
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- FINAL.srt
- TIMELINE_MASTER
- 已有素材描述

【Optional Input】
- 无

【CORE METHOD】
- 逐段定义视觉目的：证明/展示/对比/解释/氛围。
- 真实证据优先真实素材；抽象机制再用HUD/Pixel/图表。
- 剧情/人物类优先官方剧情画面、关系、时间线、意象，不强塞战斗HUD。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] AI 解释动画、生成图不能冒充真实游戏画面或正式机制证据。
[BEST_PRACTICE] 视觉服务理解、证据与节奏；不靠满屏光效或无信息装饰充数。
[OPTIONAL_ENHANCEMENT] Pixel、几何、HUD、数据图、关系图按项目需要选择，不是固定步骤。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 关闭声音仍能大致理解关键段落
- 视觉类型匹配内容类型

【Skip Condition】
- 无

【Output / Save As】
- VISUAL_DIRECTION.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F15","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F16｜FIONI · Sound Design Blueprint

- EXECUTOR: Chat
- DEPENDENCIES: PF-F15
- CAPABILITY: SOUND_DESIGN_BLUEPRINT
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SOUND_DIRECTION.md, SOUND_CUE_MAP.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F16｜FIONI · Sound Design Blueprint】
【Executor】Chat
【Capability】SOUND_DESIGN_BLUEPRINT / Sound Design Blueprint
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
围绕真实口播时间线设计BGM、SFX、提示音、留白、Ducking与音画锚点。

【Dependencies / Read From Previous】
Dependencies: PF-F15
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- AUDIO_MASTER
- TIMELINE_MASTER
- 视觉方向

【Optional Input】
- 无

【CORE METHOD】
- 口播可听性第一。
- 精确到Cue记录时间、声音目的、Gain/Fade/Ducking、是否Must Use。
- 避免持续嗡鸣与无关UI音效堆叠。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[BEST_PRACTICE] AUDIO_MASTER / FINAL.srt / TIMELINE_MASTER / Codex 输出统一 00:00。
[HARD_CONSTRAINT] 没有真实渲染结果和探测验证，不能声称 FINAL_VIDEO_SILENT / FINAL_BGM_SFX 已完成。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 每个声音Cue有叙事/信息目的
- 未存在资产明确PLANNED/MISSING_AUDIO_ASSET

【Skip Condition】
- 无

【Output / Save As】
- SOUND_DIRECTION.md
- SOUND_CUE_MAP.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F16","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F17｜FIONI · Cover

- EXECUTOR: Chat
- DEPENDENCIES: PF-F16
- CAPABILITY: COVER_DESIGN
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: 三比例正式封面, COVER_PACKAGE_INDEX.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F17｜FIONI · Cover】
【Executor】Chat
【Capability】COVER_DESIGN / Cover
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
生成CTR友好、角色身份准确、与标题互补的三比例Canonical封面。

【Dependencies / Read From Previous】
Dependencies: PF-F16
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- CORE_THESIS
- 封面核心表达
- 官方角色参考

【Optional Input】
- 无

【CORE METHOD】
- 4:3/3:4/16:9独立构图，不机械裁切。
- 角色主图不做像素化替代；背景可用克制Pixel/几何。
- 输出COVER_MESSAGE与TITLE_COMPLEMENT_RULE，发布阶段再适配平台特版。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 角色形象必须依据真实可读官方参考；缺参考不能凭空高还原。
[HARD_CONSTRAINT] 标题与封面不能夸大到正文无法兑现。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 角色可识别
- 一眼只有一个主要点击信息
- 正文能兑现

【Skip Condition】
- 无

【Output / Save As】
- 三比例正式封面
- COVER_PACKAGE_INDEX.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F17","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F18｜FIONI · Asset Gap / ASSET_INDEX

- EXECUTOR: Codex
- DEPENDENCIES: PF-F17
- CAPABILITY: ASSET_GAP_AND_INDEX
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: ASSET_INDEX.md, PATH_REMAP.md（如移动）, MISSING_ASSET_REPORT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F18｜FIONI · Asset Gap / ASSET_INDEX】
【Executor】Codex
【Capability】ASSET_GAP_AND_INDEX / Asset Gap / ASSET_INDEX
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
知道现有素材是什么、缺什么、在哪里、能否用于最终成片。

【Dependencies / Read From Previous】
Dependencies: PF-F17
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- tree /f或真实目录索引
- 素材描述MD

【Optional Input】
- 无

【CORE METHOD】
- 稳定ASSET_ID贯穿来源、Master/Proxy、描述、蓝图。
- 区分MISSING_ASSET / RIGHTS_REVIEW_REQUIRED / 已就绪。
- 文件移动用PATH_REMAP，不依赖旧路径覆盖最新索引。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 没有真实写入和回读就不能声称已保存、更新或同步。
[HARD_CONSTRAINT] 批处理默认不覆盖 Master / 原始素材；移动前 Dry Run，冲突时停止。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 所有蓝图候选素材都有真实路径/描述/权限状态

【Skip Condition】
- 无

【Output / Save As】
- ASSET_INDEX.md
- PATH_REMAP.md（如移动）
- MISSING_ASSET_REPORT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F18","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

【CHAT_FALLBACK】
Chat根据tree /f设计Dry Run脚本；用户执行后回传新tree验证。
```

## PF-F19｜FIONI · Editing Blueprint

- EXECUTOR: Chat
- DEPENDENCIES: PF-F18
- CAPABILITY: EDITING_BLUEPRINT
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: CODEX_EDIT_BLUEPRINT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F19｜FIONI · Editing Blueprint】
【Executor】Chat
【Capability】EDITING_BLUEPRINT / Editing Blueprint
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
在Codex执行前完成导演判断，让每个Shot/音频Cue可直接执行。

【Dependencies / Read From Previous】
Dependencies: PF-F18
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- FINAL.srt
- TIMELINE_MASTER
- ASSET_INDEX
- 视觉/声音设计

【Optional Input】
- 无

【CORE METHOD】
- 逐Shot写时间、旁白语义、素材ASSET_ID/真实路径、Source In/Out、构图、转场、动效、字幕/视觉锚点。
- 声音写BGM/SFX/Cue/Gain/Fade/Ducking。
- 素材不存在写MISSING，不把寻找/导演留给Codex。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[BEST_PRACTICE] AUDIO_MASTER / FINAL.srt / TIMELINE_MASTER / Codex 输出统一 00:00。
[HARD_CONSTRAINT] AI 解释动画、生成图不能冒充真实游戏画面或正式机制证据。
[BEST_PRACTICE] Codex 适合本地文件、FFmpeg、批处理、动画、音频和蓝图执行；导演判断前移。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- Codex无需重新导演
- 所有引用路径/权限/时间真实可执行

【Skip Condition】
- 无

【Output / Save As】
- CODEX_EDIT_BLUEPRINT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F19","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F20｜FIONI · Codex Build

- EXECUTOR: Codex
- DEPENDENCIES: PF-F19
- CAPABILITY: CODEX_BUILD
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: FINAL_VIDEO_SILENT.mp4, FINAL_BGM_SFX.wav, BUILD_REPORT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F20｜FIONI · Codex Build】
【Executor】Codex
【Capability】CODEX_BUILD / Codex Build
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
严格按蓝图执行本地视频与背景声构建。

【Dependencies / Read From Previous】
Dependencies: PF-F19
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- CODEX_EDIT_BLUEPRINT
- 实际本地素材

【Optional Input】
- 无

【CORE METHOD】
- 先预检路径/时长/权限/缺失，再执行。
- 画面输出FINAL_VIDEO_SILENT.mp4；背景声输出FINAL_BGM_SFX.wav。
- 不临场换素材/改脚本/重新导演。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 不得擅自把本地制作素材、大视频、音频或项目工作目录推到 Git。
[BEST_PRACTICE] Codex 适合本地文件、FFmpeg、批处理、动画、音频和蓝图执行；导演判断前移。
[HARD_CONSTRAINT] 没有真实渲染结果和探测验证，不能声称 FINAL_VIDEO_SILENT / FINAL_BGM_SFX 已完成。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- ffprobe/音频探测通过
- 同00:00
- 无口播/字幕混入对应输出

【Skip Condition】
- 无

【Output / Save As】
- FINAL_VIDEO_SILENT.mp4
- FINAL_BGM_SFX.wav
- BUILD_REPORT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F20","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

【CHAT_FALLBACK】
Chat生成可执行构建脚本；用户/本地执行器运行并回传验证。
```

## PF-F21｜FIONI · Final Human Assembly

- EXECUTOR: Human
- DEPENDENCIES: PF-F20
- CAPABILITY: FINAL_ASSEMBLY
- QC: Q3
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: ASSEMBLY_CHECKLIST.md, 用户实际导出的FINAL_MASTER.mp4

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F21｜FIONI · Final Human Assembly】
【Executor】Human
【Capability】FINAL_ASSEMBLY / Final Human Assembly
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
在剪映把Codex双输出、AUDIO_MASTER、FINAL.srt四件套对齐并人工调听感。

【Dependencies / Read From Previous】
Dependencies: PF-F20
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- FINAL_VIDEO_SILENT.mp4
- FINAL_BGM_SFX.wav
- AUDIO_MASTER
- FINAL.srt

【Optional Input】
- 无

【CORE METHOD】
- 四件套同00:00。
- 人工调整总背景声与口播听感，不反向改变锁稿/Timeline。
- 导出FINAL_MASTER.mp4。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[BEST_PRACTICE] AUDIO_MASTER / FINAL.srt / TIMELINE_MASTER / Codex 输出统一 00:00。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q3】
- 成片完整播放、字幕同步、口播清楚

【Skip Condition】
- 无

【Output / Save As】
- ASSEMBLY_CHECKLIST.md
- 用户实际导出的FINAL_MASTER.mp4

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F21","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

```

## PF-F22｜FIONI · Platform Rule Verification

- EXECUTOR: Work
- DEPENDENCIES: PF-F21
- CAPABILITY: PLATFORM_RULE_VERIFICATION
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: PLATFORM_RULES_CHECK.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F22｜FIONI · Platform Rule Verification】
【Executor】Work
【Capability】PLATFORM_RULE_VERIFICATION / Platform Rule Verification
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
实时核验六平台当前真实投稿字段、限制、封面、字幕、版权与AI披露规则。

【Dependencies / Read From Previous】
Dependencies: PF-F21
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 目标六平台

【Optional Input】
- 无

【CORE METHOD】
- 优先官方投稿UI/帮助/规范。
- 无法确认数字就写投稿时按实时UI最终确认，不编。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 平台投稿字段、字数、封面、版权、AI披露规则必须实时核验。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 动态规则有当前来源/日期

【Skip Condition】
- 无

【Output / Save As】
- PLATFORM_RULES_CHECK.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F22","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-F23｜FIONI · Six-platform Publish Package

- EXECUTOR: Work
- DEPENDENCIES: PF-F22
- CAPABILITY: SIX_PLATFORM_PUBLISH_PACKAGE
- QC: Q2
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: PUBLISH_PACKAGE.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-F23｜FIONI · Six-platform Publish Package】
【Executor】Work
【Capability】SIX_PLATFORM_PUBLISH_PACKAGE / Six-platform Publish Package
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
生成六平台可直接投稿的标题、简介、标签、章节、封面适配、互动与合规检查。

【Dependencies / Read From Previous】
Dependencies: PF-F22
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- CORE_THESIS/最终稿
- FINAL.srt/Timeline
- COVER_PACKAGE_INDEX
- PLATFORM_RULES_CHECK

【Optional Input】
- 无

【CORE METHOD】
- B站/抖音/小红书/视频号简中；YouTube/TikTok繁中。
- 标题≥5候选且与封面互补。
- B站/YouTube按真实Timeline生成3–9章节；B站给2–4弹幕投票建议。
- 处理署名与AI披露。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[BEST_PRACTICE] B站/抖音/小红书/视频号简体；YouTube/TikTok繁体，除非项目覆盖。
[HARD_CONSTRAINT] 标题与封面不能夸大到正文无法兑现。
[HARD_CONSTRAINT] ATTRIBUTION_REQUIRED / AI disclosure 在发布前必须处理。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 字段符合当前平台规则
- 标题/封面/正文一致

【Skip Condition】
- 无

【Output / Save As】
- PUBLISH_PACKAGE.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-F23","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

```

## PF-S03｜SEVERIAN · Content Structure

- EXECUTOR: Chat
- DEPENDENCIES: PF-S02
- CAPABILITY: CONTENT_STRUCTURE
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: CONTENT_OUTLINE.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S03｜SEVERIAN · Content Structure】
【Executor】Chat
【Capability】CONTENT_STRUCTURE / Content Structure
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
为当前产品类型安排信息顺序、章节、钩子与证据位置。

【Dependencies / Read From Previous】
Dependencies: PF-S02
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- CORE_THESIS
- 研究结论

【Optional Input】
- 无

【CORE METHOD】
- 开头15–30秒直击问题。
- 章节只服务命题；短内容不强制章节。
- 把证据、判断、操作与收益按因果排列。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[FAILURE_WARNING] 不为了凑 10 分钟或完整攻略而重复信息、硬塞百科内容。
[BEST_PRACTICE] 标题/封面承诺、开场问题和正文核心结论必须互相兑现。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 删掉任一章节会损失明确价值
- 没有百科式填充

【Skip Condition】
- 无

【Output / Save As】
- CONTENT_OUTLINE.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S03","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S04｜SEVERIAN · Script

- EXECUTOR: Chat
- DEPENDENCIES: PF-S03
- CAPABILITY: SCRIPT_DRAFT
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_DRAFT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S04｜SEVERIAN · Script】
【Executor】Chat
【Capability】SCRIPT_DRAFT / Script
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
生成自然、准确、高信息密度的真人口播稿。

【Dependencies / Read From Previous】
Dependencies: PF-S03
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- CORE_THESIS
- CONTENT_OUTLINE
- 研究材料

【Optional Input】
- 无

【CORE METHOD】
- 直接判断→证据→因果→操作/决策。
- 重要答案前置；每段有新信息。
- 产品类型决定语言：机制更重UI/状态因果，剧情更重事件/主题/人物关系，决策更重条件与机会成本。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[FAILURE_WARNING] 不为了凑 10 分钟或完整攻略而重复信息、硬塞百科内容。
[BEST_PRACTICE] 避免公告腔、百科堆砌、机械转场、连续总结与 AI 模板句。
[BEST_PRACTICE] 标题/封面承诺、开场问题和正文核心结论必须互相兑现。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 正文兑现命题
- 没有把分析写成官方事实

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_DRAFT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S04","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S05｜SEVERIAN · Fact / Mechanic / Terminology QC

- EXECUTOR: Work
- DEPENDENCIES: PF-S04
- CAPABILITY: SCRIPT_FACT_QC
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_REVIEW_FACT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S05｜SEVERIAN · Fact / Mechanic / Terminology QC】
【Executor】Work
【Capability】SCRIPT_FACT_QC / Fact / Mechanic / Terminology QC
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
独立检查术语、数值、机制、版本、配队、排轴与证据边界。

【Dependencies / Read From Previous】
Dependencies: PF-S04
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 当前稿
- 证据/正式术语真值

【Optional Input】
- 无

【CORE METHOD】
- 逐问题给位置/问题/正确依据/最低成本改法。
- 事实型 P1 未核实不能 PASS。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 不能编造来源 URL、视频 ID、发布时间、数值、角色术语。
[HARD_CONSTRAINT] 不能把旧版本、其他区服或不同测试阶段资料覆盖当前项目已确认版本事实。
[HARD_CONSTRAINT] 未 Reopen 或无充分新证据时不得修改 SCRIPT_LOCK。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 无未解决P0/事实型P1才PASS

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_REVIEW_FACT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S05","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S06｜SEVERIAN · Content Value / Logic QC

- EXECUTOR: Work
- DEPENDENCIES: PF-S05
- CAPABILITY: SCRIPT_VALUE_QC
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_REVIEW_VALUE.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S06｜SEVERIAN · Content Value / Logic QC】
【Executor】Work
【Capability】SCRIPT_VALUE_QC / Content Value / Logic QC
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
检查核心命题兑现、逻辑链、信息增量、产品类型与收藏分享价值。

【Dependencies / Read From Previous】
Dependencies: PF-S05
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 当前稿
- CORE_THESIS
- 产品类型

【Optional Input】
- 无

【CORE METHOD】
- 逐段判断新认识/机制/因果/操作/误区/决策价值。
- 标 DELETE/KEEP/P0/P1。
- 检查标题/封面承诺是否由正文支撑。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[FAILURE_WARNING] 不为了凑 10 分钟或完整攻略而重复信息、硬塞百科内容。
[BEST_PRACTICE] 标题/封面承诺、开场问题和正文核心结论必须互相兑现。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 核心命题完整兑现且无影响价值/逻辑P0/P1

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_REVIEW_VALUE.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S06","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S07｜SEVERIAN · Anti-AI / Retention QC

- EXECUTOR: Chat
- DEPENDENCIES: PF-S06
- CAPABILITY: SCRIPT_NATURALNESS_QC
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_REVIEW_NATURALNESS.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S07｜SEVERIAN · Anti-AI / Retention QC】
【Executor】Chat
【Capability】SCRIPT_NATURALNESS_QC / Anti-AI / Retention QC
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
去模板化语言并检查前30秒与中段留存。

【Dependencies / Read From Previous】
Dependencies: PF-S06
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 当前稿

【Optional Input】
- 无

【CORE METHOD】
- 扫描否定再肯定、反而、模板转场、空泛强调、重复总结、假互动和过度工整。
- 只给DIFF建议，不为了自然故意说乱。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[BEST_PRACTICE] 避免公告腔、百科堆砌、机械转场、连续总结与 AI 模板句。
[BEST_PRACTICE] 已确认稿件默认 DIFF MODE，只改事实错误、新正式资料或严重逻辑问题。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 真人可念、节奏有变化、没有明显AI模板堆叠

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_REVIEW_NATURALNESS.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S07","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S08｜SEVERIAN · DIFF Revision

- EXECUTOR: Chat
- DEPENDENCIES: PF-S07
- CAPABILITY: SCRIPT_DIFF_REVISION
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_REVISED.md, SCRIPT_REVIEW.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S08｜SEVERIAN · DIFF Revision】
【Executor】Chat
【Capability】SCRIPT_DIFF_REVISION / DIFF Revision
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
合并审核结果，对当前稿做最低成本修订并保留已确认部分。

【Dependencies / Read From Previous】
Dependencies: PF-S07
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 当前稿
- 审核结果

【Optional Input】
- 无

【CORE METHOD】
- 只改对应位置。
- 事实错误优先；新资料只影响相关段落。
- 修后再次检查受影响的事实/逻辑/自然度。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 未 Reopen 或无充分新证据时不得修改 SCRIPT_LOCK。
[BEST_PRACTICE] 已确认稿件默认 DIFF MODE，只改事实错误、新正式资料或严重逻辑问题。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 没有顺手全文重写
- 受影响审核项关闭

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_REVISED.md
- SCRIPT_REVIEW.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S08","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S09｜SEVERIAN · SCRIPT_LOCK Gate

- EXECUTOR: Human
- DEPENDENCIES: PF-S08
- CAPABILITY: SCRIPT_LOCK_GATE
- QC: Q3
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: SCRIPT_LOCK状态/锁定稿引用

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S09｜SEVERIAN · SCRIPT_LOCK Gate】
【Executor】Human
【Capability】SCRIPT_LOCK_GATE / SCRIPT_LOCK Gate
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
把三类真实审核结果与当前稿绑定，只有真正通过时由用户确认 SCRIPT_LOCK。

【Dependencies / Read From Previous】
Dependencies: PF-S08
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 当前稿
- SCRIPT_REVIEW_FACT
- SCRIPT_REVIEW_VALUE
- SCRIPT_REVIEW_NATURALNESS

【Optional Input】
- 无

【CORE METHOD】
- 确认三类审核针对同一当前稿。
- 存在未解决P0/P1时不锁。
- 用户确认后记录锁定稿身份/版本；AI不能自行设置Human Lock。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 没有真实写入和回读就不能声称已保存、更新或同步。
[HARD_CONSTRAINT] 未 Reopen 或无充分新证据时不得修改 SCRIPT_LOCK。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT
- 审核未完成或锁定稿身份不明确

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q3】
- 三类审核真实PASS
- 用户明确确认SCRIPT_LOCK

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_LOCK状态/锁定稿引用

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S09","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

【CHAT_FALLBACK】
Chat只汇总是否满足锁定条件并指出缺口；不能替用户宣告Human Lock。
```

## PF-S10｜SEVERIAN · Reading Script / TTS Prep

- EXECUTOR: Chat
- DEPENDENCIES: PF-S09
- CAPABILITY: READING_SCRIPT
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SCRIPT_READ.md 或 TTS_TEMP.srt, TTS_PRONUNCIATION_MAP.md, TTS_README.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S10｜SEVERIAN · Reading Script / TTS Prep】
【Executor】Chat
【Capability】READING_SCRIPT / Reading Script / TTS Prep
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
把 SCRIPT_LOCK 准备成人类或剪映 AI 可稳定朗读的输入。

【Dependencies / Read From Previous】
Dependencies: PF-S09
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- SCRIPT_LOCK正文

【Optional Input】
- 真人/AI朗读模式
- 多人角色分配

【CORE METHOD】
- 真人模式保持正式文本并按自然语义分块。
- AI模式生成TTS_TEMP.srt，每cue≤500可见字符、尽量430–490；用发音映射处理多音字、生僻字、专名、数字/符号。
- TTS临时时码只为导入，不是真实Timeline。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 未 Reopen 或无充分新证据时不得修改 SCRIPT_LOCK。
[FAILURE_WARNING] TTS_TEMP.srt 只用于 AI 朗读，临时时码不能污染最终时间线。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 不改变事实/语义
- TTS安全写法有Pronunciation Map

【Skip Condition】
- 无

【Output / Save As】
- SCRIPT_READ.md 或 TTS_TEMP.srt
- TTS_PRONUNCIATION_MAP.md
- TTS_README.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S10","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S11｜SEVERIAN · AUDIO_MASTER Capture

- EXECUTOR: Human
- DEPENDENCIES: PF-S10
- CAPABILITY: AUDIO_MASTER_CAPTURE
- QC: Q3
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: AUDIO_MASTER, AUDIO_MASTER_METADATA.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S11｜SEVERIAN · AUDIO_MASTER Capture】
【Executor】Human
【Capability】AUDIO_MASTER_CAPTURE / AUDIO_MASTER Capture
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
取得最终连续旁白音频，作为之后时间轴唯一WHEN真值。

【Dependencies / Read From Previous】
Dependencies: PF-S10
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- SCRIPT_LOCK正文
- 朗读/录音方式

【Optional Input】
- TTS_TEMP.srt
- 多人朗读拆分

【CORE METHOD】
- 真人录音或AI朗读均需最终导出连续音频。
- 不把临时TTS字幕时码当真实Timeline。
- 记录最终音频文件名、时长、采样率与版本。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 最终真实 AUDIO_MASTER 决定 WHEN；未有最终音频不能生成真实 FINAL.srt / TIMELINE_MASTER。
[FAILURE_WARNING] TTS_TEMP.srt 只用于 AI 朗读，临时时码不能污染最终时间线。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q3】
- 真实AUDIO_MASTER可访问且完整
- 内容对应当前SCRIPT_LOCK

【Skip Condition】
- 无

【Output / Save As】
- AUDIO_MASTER
- AUDIO_MASTER_METADATA.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S11","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

【CHAT_FALLBACK】
Chat只能准备朗读输入/检查元数据；最终真实音频仍需用户或实际音频工具产生。
```

## PF-S12｜SEVERIAN · AUDIO_LOCK Gate

- EXECUTOR: Human
- DEPENDENCIES: PF-S11
- CAPABILITY: AUDIO_LOCK_GATE
- QC: Q3
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: AUDIO_LOCK状态

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S12｜SEVERIAN · AUDIO_LOCK Gate】
【Executor】Human
【Capability】AUDIO_LOCK_GATE / AUDIO_LOCK Gate
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
确认最终AUDIO_MASTER后冻结叙事时间源，允许进入精确字幕/Timeline。

【Dependencies / Read From Previous】
Dependencies: PF-S11
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- AUDIO_MASTER
- SCRIPT_LOCK引用

【Optional Input】
- 无

【CORE METHOD】
- 检查音频可访问、完整、对应当前锁稿。
- 用户确认AUDIO_LOCK；随后所有真实时间只服从该音频。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 没有真实写入和回读就不能声称已保存、更新或同步。
[HARD_CONSTRAINT] 最终真实 AUDIO_MASTER 决定 WHEN；未有最终音频不能生成真实 FINAL.srt / TIMELINE_MASTER。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT
- 最终AUDIO_MASTER不存在/不可访问

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q3】
- 用户明确确认AUDIO_LOCK
- AUDIO_MASTER身份唯一

【Skip Condition】
- 无

【Output / Save As】
- AUDIO_LOCK状态

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S12","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

【CHAT_FALLBACK】
Chat只报告是否满足锁定前提，不可代替Human Lock。
```

## PF-S13｜SEVERIAN · Precise SRT Alignment

- EXECUTOR: Work
- DEPENDENCIES: PF-S12
- CAPABILITY: PRECISE_SRT_ALIGNMENT
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: FINAL.srt, ALIGNMENT_REPORT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S13｜SEVERIAN · Precise SRT Alignment】
【Executor】Work
【Capability】PRECISE_SRT_ALIGNMENT / Precise SRT Alignment
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
用真实 AUDIO_MASTER 对齐锁定文字，生成最终字幕。

【Dependencies / Read From Previous】
Dependencies: PF-S12
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- AUDIO_MASTER
- SCRIPT_LOCK正文

【Optional Input】
- TTS_PRONUNCIATION_MAP

【CORE METHOD】
- 真实ASR/对齐取WHEN，锁定文本取WHAT。
- 自然意群切cue，ASR错词用锁定文本校正。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 禁止按字数、平均语速、脚本长度或句长猜时间。
[HARD_CONSTRAINT] ASR 只提供时间参考，不能覆盖锁定角色名、术语与正式字幕文字。
[HARD_CONSTRAINT] 最终真实 AUDIO_MASTER 决定 WHEN；未有最终音频不能生成真实 FINAL.srt / TIMELINE_MASTER。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT
- 没有该角色视频最终 AUDIO_MASTER 时 NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 所有时间来自真实音频
- 无重叠/倒序
- 术语与锁稿一致

【Skip Condition】
- 无

【Output / Save As】
- FINAL.srt
- ALIGNMENT_REPORT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S13","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

【CHAT_FALLBACK】
只有当前Chat确实能处理音频对齐时执行；否则提供本地对齐方案，不能猜时间。
```

## PF-S14｜SEVERIAN · TIMELINE_MASTER

- EXECUTOR: Chat
- DEPENDENCIES: PF-S13
- CAPABILITY: TIMELINE_MASTER
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: TIMELINE_MASTER.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S14｜SEVERIAN · TIMELINE_MASTER】
【Executor】Chat
【Capability】TIMELINE_MASTER / TIMELINE_MASTER
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
从真实音频/最终字幕建立后续画面、声音、蓝图共同使用的语义时间锚点。

【Dependencies / Read From Previous】
Dependencies: PF-S13
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- FINAL.srt
- AUDIO_MASTER
- SCRIPT_LOCK

【Optional Input】
- 无

【CORE METHOD】
- 每段记录SEGMENT_ID/START/END/LOCKED_TEXT/SECTION/SEMANTIC_PURPOSE/KEY_TERMS/IMPORTANT_BEAT/PAUSE/ANCHOR_CANDIDATE。
- 不在此阶段提前决定具体视觉或SFX。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 最终真实 AUDIO_MASTER 决定 WHEN；未有最终音频不能生成真实 FINAL.srt / TIMELINE_MASTER。
[BEST_PRACTICE] AUDIO_MASTER / FINAL.srt / TIMELINE_MASTER / Codex 输出统一 00:00。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT
- FINAL.srt不是真实音频对齐结果

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 与FINAL.srt/AUDIO_MASTER同00:00
- 无猜测时间

【Skip Condition】
- 无

【Output / Save As】
- TIMELINE_MASTER.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S14","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S15｜SEVERIAN · Visual Direction

- EXECUTOR: Chat
- DEPENDENCIES: PF-S14
- CAPABILITY: VISUAL_DIRECTION
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: VISUAL_DIRECTION.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S15｜SEVERIAN · Visual Direction】
【Executor】Chat
【Capability】VISUAL_DIRECTION / Visual Direction
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
根据最终旁白/Timeline决定每段最有效的视觉语言与证据职责。

【Dependencies / Read From Previous】
Dependencies: PF-S14
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- FINAL.srt
- TIMELINE_MASTER
- 已有素材描述

【Optional Input】
- 无

【CORE METHOD】
- 逐段定义视觉目的：证明/展示/对比/解释/氛围。
- 真实证据优先真实素材；抽象机制再用HUD/Pixel/图表。
- 剧情/人物类优先官方剧情画面、关系、时间线、意象，不强塞战斗HUD。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] AI 解释动画、生成图不能冒充真实游戏画面或正式机制证据。
[BEST_PRACTICE] 视觉服务理解、证据与节奏；不靠满屏光效或无信息装饰充数。
[OPTIONAL_ENHANCEMENT] Pixel、几何、HUD、数据图、关系图按项目需要选择，不是固定步骤。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 关闭声音仍能大致理解关键段落
- 视觉类型匹配内容类型

【Skip Condition】
- 无

【Output / Save As】
- VISUAL_DIRECTION.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S15","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S16｜SEVERIAN · Sound Design Blueprint

- EXECUTOR: Chat
- DEPENDENCIES: PF-S15
- CAPABILITY: SOUND_DESIGN_BLUEPRINT
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: SOUND_DIRECTION.md, SOUND_CUE_MAP.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S16｜SEVERIAN · Sound Design Blueprint】
【Executor】Chat
【Capability】SOUND_DESIGN_BLUEPRINT / Sound Design Blueprint
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
围绕真实口播时间线设计BGM、SFX、提示音、留白、Ducking与音画锚点。

【Dependencies / Read From Previous】
Dependencies: PF-S15
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- AUDIO_MASTER
- TIMELINE_MASTER
- 视觉方向

【Optional Input】
- 无

【CORE METHOD】
- 口播可听性第一。
- 精确到Cue记录时间、声音目的、Gain/Fade/Ducking、是否Must Use。
- 避免持续嗡鸣与无关UI音效堆叠。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[BEST_PRACTICE] AUDIO_MASTER / FINAL.srt / TIMELINE_MASTER / Codex 输出统一 00:00。
[HARD_CONSTRAINT] 没有真实渲染结果和探测验证，不能声称 FINAL_VIDEO_SILENT / FINAL_BGM_SFX 已完成。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 每个声音Cue有叙事/信息目的
- 未存在资产明确PLANNED/MISSING_AUDIO_ASSET

【Skip Condition】
- 无

【Output / Save As】
- SOUND_DIRECTION.md
- SOUND_CUE_MAP.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S16","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S17｜SEVERIAN · Cover

- EXECUTOR: Chat
- DEPENDENCIES: PF-S16
- CAPABILITY: COVER_DESIGN
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: 三比例正式封面, COVER_PACKAGE_INDEX.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S17｜SEVERIAN · Cover】
【Executor】Chat
【Capability】COVER_DESIGN / Cover
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
生成CTR友好、角色身份准确、与标题互补的三比例Canonical封面。

【Dependencies / Read From Previous】
Dependencies: PF-S16
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- CORE_THESIS
- 封面核心表达
- 官方角色参考

【Optional Input】
- 无

【CORE METHOD】
- 4:3/3:4/16:9独立构图，不机械裁切。
- 角色主图不做像素化替代；背景可用克制Pixel/几何。
- 输出COVER_MESSAGE与TITLE_COMPLEMENT_RULE，发布阶段再适配平台特版。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 角色形象必须依据真实可读官方参考；缺参考不能凭空高还原。
[HARD_CONSTRAINT] 标题与封面不能夸大到正文无法兑现。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 角色可识别
- 一眼只有一个主要点击信息
- 正文能兑现

【Skip Condition】
- 无

【Output / Save As】
- 三比例正式封面
- COVER_PACKAGE_INDEX.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S17","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S18｜SEVERIAN · Asset Gap / ASSET_INDEX

- EXECUTOR: Codex
- DEPENDENCIES: PF-S17
- CAPABILITY: ASSET_GAP_AND_INDEX
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: ASSET_INDEX.md, PATH_REMAP.md（如移动）, MISSING_ASSET_REPORT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S18｜SEVERIAN · Asset Gap / ASSET_INDEX】
【Executor】Codex
【Capability】ASSET_GAP_AND_INDEX / Asset Gap / ASSET_INDEX
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
知道现有素材是什么、缺什么、在哪里、能否用于最终成片。

【Dependencies / Read From Previous】
Dependencies: PF-S17
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- tree /f或真实目录索引
- 素材描述MD

【Optional Input】
- 无

【CORE METHOD】
- 稳定ASSET_ID贯穿来源、Master/Proxy、描述、蓝图。
- 区分MISSING_ASSET / RIGHTS_REVIEW_REQUIRED / 已就绪。
- 文件移动用PATH_REMAP，不依赖旧路径覆盖最新索引。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 没有真实写入和回读就不能声称已保存、更新或同步。
[HARD_CONSTRAINT] 批处理默认不覆盖 Master / 原始素材；移动前 Dry Run，冲突时停止。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 所有蓝图候选素材都有真实路径/描述/权限状态

【Skip Condition】
- 无

【Output / Save As】
- ASSET_INDEX.md
- PATH_REMAP.md（如移动）
- MISSING_ASSET_REPORT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S18","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

【CHAT_FALLBACK】
Chat根据tree /f设计Dry Run脚本；用户执行后回传新tree验证。
```

## PF-S19｜SEVERIAN · Editing Blueprint

- EXECUTOR: Chat
- DEPENDENCIES: PF-S18
- CAPABILITY: EDITING_BLUEPRINT
- QC: Q2
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: CODEX_EDIT_BLUEPRINT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S19｜SEVERIAN · Editing Blueprint】
【Executor】Chat
【Capability】EDITING_BLUEPRINT / Editing Blueprint
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
在Codex执行前完成导演判断，让每个Shot/音频Cue可直接执行。

【Dependencies / Read From Previous】
Dependencies: PF-S18
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- FINAL.srt
- TIMELINE_MASTER
- ASSET_INDEX
- 视觉/声音设计

【Optional Input】
- 无

【CORE METHOD】
- 逐Shot写时间、旁白语义、素材ASSET_ID/真实路径、Source In/Out、构图、转场、动效、字幕/视觉锚点。
- 声音写BGM/SFX/Cue/Gain/Fade/Ducking。
- 素材不存在写MISSING，不把寻找/导演留给Codex。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[BEST_PRACTICE] AUDIO_MASTER / FINAL.srt / TIMELINE_MASTER / Codex 输出统一 00:00。
[HARD_CONSTRAINT] AI 解释动画、生成图不能冒充真实游戏画面或正式机制证据。
[BEST_PRACTICE] Codex 适合本地文件、FFmpeg、批处理、动画、音频和蓝图执行；导演判断前移。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- Codex无需重新导演
- 所有引用路径/权限/时间真实可执行

【Skip Condition】
- 无

【Output / Save As】
- CODEX_EDIT_BLUEPRINT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S19","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S20｜SEVERIAN · Codex Build

- EXECUTOR: Codex
- DEPENDENCIES: PF-S19
- CAPABILITY: CODEX_BUILD
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: FINAL_VIDEO_SILENT.mp4, FINAL_BGM_SFX.wav, BUILD_REPORT.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S20｜SEVERIAN · Codex Build】
【Executor】Codex
【Capability】CODEX_BUILD / Codex Build
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
严格按蓝图执行本地视频与背景声构建。

【Dependencies / Read From Previous】
Dependencies: PF-S19
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- CODEX_EDIT_BLUEPRINT
- 实际本地素材

【Optional Input】
- 无

【CORE METHOD】
- 先预检路径/时长/权限/缺失，再执行。
- 画面输出FINAL_VIDEO_SILENT.mp4；背景声输出FINAL_BGM_SFX.wav。
- 不临场换素材/改脚本/重新导演。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 不得擅自把本地制作素材、大视频、音频或项目工作目录推到 Git。
[BEST_PRACTICE] Codex 适合本地文件、FFmpeg、批处理、动画、音频和蓝图执行；导演判断前移。
[HARD_CONSTRAINT] 没有真实渲染结果和探测验证，不能声称 FINAL_VIDEO_SILENT / FINAL_BGM_SFX 已完成。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- ffprobe/音频探测通过
- 同00:00
- 无口播/字幕混入对应输出

【Skip Condition】
- 无

【Output / Save As】
- FINAL_VIDEO_SILENT.mp4
- FINAL_BGM_SFX.wav
- BUILD_REPORT.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S20","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

【CHAT_FALLBACK】
Chat生成可执行构建脚本；用户/本地执行器运行并回传验证。
```

## PF-S21｜SEVERIAN · Final Human Assembly

- EXECUTOR: Human
- DEPENDENCIES: PF-S20
- CAPABILITY: FINAL_ASSEMBLY
- QC: Q3
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: ASSEMBLY_CHECKLIST.md, 用户实际导出的FINAL_MASTER.mp4

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S21｜SEVERIAN · Final Human Assembly】
【Executor】Human
【Capability】FINAL_ASSEMBLY / Final Human Assembly
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
在剪映把Codex双输出、AUDIO_MASTER、FINAL.srt四件套对齐并人工调听感。

【Dependencies / Read From Previous】
Dependencies: PF-S20
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- FINAL_VIDEO_SILENT.mp4
- FINAL_BGM_SFX.wav
- AUDIO_MASTER
- FINAL.srt

【Optional Input】
- 无

【CORE METHOD】
- 四件套同00:00。
- 人工调整总背景声与口播听感，不反向改变锁稿/Timeline。
- 导出FINAL_MASTER.mp4。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[BEST_PRACTICE] AUDIO_MASTER / FINAL.srt / TIMELINE_MASTER / Codex 输出统一 00:00。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q3】
- 成片完整播放、字幕同步、口播清楚

【Skip Condition】
- 无

【Output / Save As】
- ASSEMBLY_CHECKLIST.md
- 用户实际导出的FINAL_MASTER.mp4

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S21","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

```

## PF-S22｜SEVERIAN · Platform Rule Verification

- EXECUTOR: Work
- DEPENDENCIES: PF-S21
- CAPABILITY: PLATFORM_RULE_VERIFICATION
- QC: Q1
- REVIEW: REVIEW_OPTIONAL
- STATUS: PENDING
- SAVE_AS: PLATFORM_RULES_CHECK.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S22｜SEVERIAN · Platform Rule Verification】
【Executor】Work
【Capability】PLATFORM_RULE_VERIFICATION / Platform Rule Verification
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
实时核验六平台当前真实投稿字段、限制、封面、字幕、版权与AI披露规则。

【Dependencies / Read From Previous】
Dependencies: PF-S21
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- 目标六平台

【Optional Input】
- 无

【CORE METHOD】
- 优先官方投稿UI/帮助/规范。
- 无法确认数字就写投稿时按实时UI最终确认，不编。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[HARD_CONSTRAINT] 平台投稿字段、字数、封面、版权、AI披露规则必须实时核验。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q1】
- 动态规则有当前来源/日期

【Skip Condition】
- 无

【Output / Save As】
- PLATFORM_RULES_CHECK.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S22","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":false}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点为 REVIEW_OPTIONAL；完成即可由编排器继续。

```

## PF-S23｜SEVERIAN · Six-platform Publish Package

- EXECUTOR: Work
- DEPENDENCIES: PF-S22
- CAPABILITY: SIX_PLATFORM_PUBLISH_PACKAGE
- QC: Q2
- REVIEW: APPROVAL_REQUIRED
- STATUS: PENDING
- SAVE_AS: PUBLISH_PACKAGE.md

### PROMPT

```text
【PROJECT PROMPT NODE · PF-S23｜SEVERIAN · Six-platform Publish Package】
【Executor】Work
【Capability】SIX_PLATFORM_PUBLISH_PACKAGE / Six-platform Publish Package
【Autonomy】L2；REVIEW_OPTIONAL 不阻塞，APPROVAL_REQUIRED 才等待用户。

【Project】
PROJECT_ID: ZZZ_3.3_FIONI_SEVERIAN_PREVIEW
GAME: 绝区零
SERVER: 国际服
VERSION: 3.3
PRODUCT_TYPE: preview
AUTONOMY_LEVEL: L2
DO_NOT_USE: 测试服 / 内鬼 / 拆包 / 二手未核实传闻
SHARED_SOURCE: 3.3 官方 Special Program Master / 3.3 官方字幕

【Purpose】
生成六平台可直接投稿的标题、简介、标签、章节、封面适配、互动与合规检查。

【Dependencies / Read From Previous】
Dependencies: PF-S22
Read: 沿用同一执行上下文中实际可读的已完成产物；跨环境只使用真实可访问文件

【Required Input】
- CORE_THESIS/最终稿
- FINAL.srt/Timeline
- COVER_PACKAGE_INDEX
- PLATFORM_RULES_CHECK

【Optional Input】
- 无

【CORE METHOD】
- B站/抖音/小红书/视频号简中；YouTube/TikTok繁中。
- 标题≥5候选且与封面互补。
- B站/YouTube按真实Timeline生成3–9章节；B站给2–4弹幕投票建议。
- 处理署名与AI披露。

【MANDATORY GUARDRAILS】
- 默认 AUTONOMY_LEVEL=L2。
- HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。
- REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。
[BEST_PRACTICE] B站/抖音/小红书/视频号简体；YouTube/TikTok繁体，除非项目覆盖。
[HARD_CONSTRAINT] 标题与封面不能夸大到正文无法兑现。
[HARD_CONSTRAINT] ATTRIBUTION_REQUIRED / AI disclosure 在发布前必须处理。

【HARD STOP】
- HS_REAL_TIMELINE_WITHOUT_AUDIO: 要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问 → NEED_INPUT
- HS_VIDEO_VISUAL_INACCESSIBLE: 要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问 → NEED_INPUT
- HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE: 要声称正式服实测 / 正式服机制，但没有任何正式服证据 → NEED_INPUT
- HS_WRITE_NOT_CONFIRMED: 任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读 → NEED_INPUT
- HS_LOCKED_CHANGE: 需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen → NEED_INPUT

【SOFT UNCERTAINTY】
- 机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。
- 配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。
- 资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。
- 普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。
- 缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。
- 版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。

【QUALITY GATE · Q2】
- 字段符合当前平台规则
- 标题/封面/正文一致

【Skip Condition】
- 无

【Output / Save As】
- PUBLISH_PACKAGE.md

【Task】
只完成当前 Node。默认能查就查、能做就做、普通未知用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED 表达。不要自动执行下一个 Node。
完成后输出：实际使用的真值 / 实际产物 / 未解决问题 / Quality Gate结果 / 是否触碰Lock / NEXT_HANDOFF。
最后额外输出一个 `GUCC_NODE_RESULT` JSON 代码块，至少包含：
{"promptId":"PF-S23","status":"DONE|WAITING|NEED_INPUT","outputs":[],"availableArtifacts":[],"verifiedFacts":[],"reasonedAnalysis":[],"unknowns":[],"contractPatch":{},"flowOps":[],"requiresApproval":true}
只写本次真实完成/确认的内容；不要把计划文件写成已存在。普通未知放 unknowns；确有重大流程变化才给 flowOps。
本节点完成后等待 Human Approval。

```
