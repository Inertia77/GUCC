# CURRENT_TASK

- PROMPT_ID: PF-001
- NAME: 直播前项目基线与需求研究
- EXECUTOR: Work
- WHY_NOW: 依赖已满足，是当前最小可执行任务。
- REQUIRED_INPUT: 游戏/版本/主题
- EXPECTED_OUTPUT: PROJECT_BRIEF.md / PRELIVE_BASELINE.md
- QUALITY_GATE: 问题可追溯到真实讨论 / 不以单帖冒充社区共识
- REVIEW_MODE: REVIEW_OPTIONAL

## PROMPT

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
