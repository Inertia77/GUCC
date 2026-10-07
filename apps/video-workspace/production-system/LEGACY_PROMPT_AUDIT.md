# Legacy Prompt Full Scan｜Creator OS v2 Migration Audit

Source: `apps/video-workspace/notion-prompts.json`（31条，逐条读取正文，不只看标题）。

目的：保留旧 Prompt 中经过实战积累的输入检查、禁止事项、失败条件、输出格式、Lock/QC/时间线/写入真实性规则，并映射到 Core Rules / Capability / Failure Prevention。

## 10｜CONVERT_TO_CAPABILITY

- Chars: 624
- Capability: READING_SCRIPT
- Migration: 真人/AI朗读准备。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步必要输入：已确认的最终口播文本；未给锁定稿时仅能做草稿拆分，不称正式录音版。
  - 本轮只做**已确认最终稿的录音准备**。请先确认我实际提供了当前 SCRIPT_LOCK 稿件（或明确指定可读取的文件）；没有就提示 `NEED_INPUT: SCRIPT_LOCK_TEXT`，不要用早期草稿替代。
  - 如果是多人配音，再输出声音分配、每人的独立台词稿和最终重组顺序。

## 11｜CONVERT_TO_CAPABILITY

- Chars: 1566
- Capability: PRECISE_SRT_ALIGNMENT, TIMELINE_MASTER
- Migration: 真实音频时间真值保留。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步必要输入：真人最终音频 + 已确认的锁定文案；缺音频不能臆测时间戳。
  - 请使用**本轮实际提供 / 可访问**的最终音频和 SCRIPT_LOCK 文本生成。若缺任意一个，指出缺失文件，不能推算或虚构真实语音时间戳：
  - **WHEN = 最终真实音频**
  - **WHAT = SCRIPT_LOCK 文本**
  - LOCKED 文本决定字幕显示什么。
  - 禁止：
  - - 按文字长度平均分配时间
  - - 根据稿件猜时间
  - 真实 ASR → 获取时间信息 → 与 LOCKED 文本对齐 → 用 LOCKED 文本纠正术语 → 按自然意群生成 cue。
  - 共同使用的**统一叙事时间轴**。
  - - LOCKED_TEXT
  - 但**此阶段不要提前决定具体画面或具体 SFX**。
  - ### 时间规则
  - - 所有 START / END 都来自真实音频。
  - - TIMELINE_MASTER 与 FINAL.srt 必须使用同一时间原点。
  - - 音频 00:00 = Timeline 00:00 = 后续 Codex 输出 00:00。
  - - 不允许后续任意阶段私自重新定义时间原点。

## 12｜CONVERT_TO_CAPABILITY

- Chars: 1222
- Capability: VISUAL_DIRECTION, DATA_VISUALIZATION
- Migration: 画面语言按内容类型变化。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：最终旁白、`FINAL.srt` 与 `TIMELINE_MASTER.md` 及已知素材；若不能看到大文件，优先使用已提供的分析 MD。
  - 本轮仅在用户提供或可读取 `AUDIO_MASTER`、`FINAL.srt`、`TIMELINE_MASTER.md` 时执行精确逐段视觉规划；不能因为文字写了 AUDIO_LOCK / TIMELINE_LOCK 就当作文件已经存在。
  - 但不要把画面设计限制成“官方素材 + 实战 + Pixel”三种固定答案。
  - - 时间轴 / 轨道 / 流程动画
  - - 是否必须使用真实游戏证据
  - AI 生成的解释视觉不能替代需要真实实机 / 官方画面证明的内容。
  - ### 输出
  - 2. 每个时间段的推荐画面类型与职责
  - 这一步是**导演层面的画面设计**，不要直接进入 Codex 执行。

## 13｜MERGE

- Chars: 1526
- Capability: ASSET_GAP_AND_INDEX
- Migration: 素材缺口与索引合并。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：视觉方案、最终时间线与已有素材索引；找缺口，不自行拍摄/下载/渲染。
  - 逐项输出：
  - - 时间段
  - - 建议使用的 Source Time
  - **获取 / 录制 Master → 单独生成 Proxy 转码指令并执行 → 单独解析 Proxy 的声音 / 画面 / UI → 留下带 Master 时间戳的 Evidence 与 Edit Anchor 描述 MD。**
  - ### 输出
  - 任何新增外部素材进入最终剪辑设计前，必须有 `RIGHTS_STATUS` / `EDIT_USE_ALLOWED`；没有明确使用许可的素材不能默认当作正式剪辑片源。

## 14｜CONDITIONAL

- Chars: 1125
- Capability: GAMEPLAY_RECORDING_PLAN
- Migration: 只在成片/证据确有缺口时补拍。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：明确的缺镜头清单、Final Timeline 与用户可实际操作的游戏环境；只做补拍计划。
  - 这一步只处理 TIMELINE_LOCK 之后，为了最终成片**仍然缺少的真实画面**。
  - - 其他最终剪辑缺少的真实画面
  - - 对应最终时间段
  - - 必须看清的状态 / 数值 / UI
  - - RIGHTS_STATUS：默认 SELF_RECORDED
  - - EDIT_USE_ALLOWED：默认 YES
  - 角色 → 具体技能 → 状态变化 → 切谁 → 下一动作 → 资源变化 → 输出窗口
  - 需要 AI 精准选用新增镜头时，由用户后续单独发起：**补拍 Master → 新 Proxy 转码 → 视听解析 / Edit Anchor MD → 精细剪辑蓝图**。本轮只输出录屏计划，不擅自继续其他任务。
  - 输出建议保存为 `FINAL_RECORDING_PLAN.md`。
  - 输出：

## 15｜CONDITIONAL

- Chars: 6988
- Capability: DYNAMIC_MECHANIC_VISUAL, DATA_VISUALIZATION
- Migration: Pixel不固定，按需调用。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 优先复用本 Chat 已研究的机制、已给的角色参考、最终 SRT / Timeline。缺主角色官方身份参考时优先从**经核验的官方原图地址**获取；工具无法实际取得时再要求参考图。未得到官方身份参考不得凭空生成高还原角色。
  - 请根据当前 Chat **已经确认且真实可读取**的最终旁白、`FINAL.srt`、`TIMELINE_MASTER.md`、机制研究和官方角色参考，实际制作可用于剪辑的动态解释视觉素材包。若参考图已经在前面的素材搜集环节下载，不要求用户重复截图或上传；能通过官方已验证 URL 获取时直接获取。
  - 这一步不要求所有内容都必须做成 Pixel。
  - - 资源回路 / 时间轴动画
  - 如果某一段使用 Pixel，则下面所有 Pixel 角色身份、非主角色禁止乱生成、非 PPT 化、艺术复杂度、克制配色等规则全部继续严格生效。
  - 视觉设计必须服务于：
  - **现有官方素材 + 我的录屏 + 最终旁白 / 时间线**
  - ### 0｜输出形态硬锁：禁止“只生成图片冒充动画包”
  - - **不要把“制作动态解释素材包”理解成只生成一张像素风图片。**
  - - **不要给我一张概念图 / 效果图 / 海报 / 九宫格 / 大画布就结束任务。**
  - - **不要把多个机制场景塞在一张 16:9 静态图里冒充素材包。**
  - - **不要只交付静态关键帧、设计稿或“看起来像动画”的图片。**
  - 最终交付必须以真正可播放 / 可继续合成的动态资产为主体，例如：
  - - 或序列帧 + 可复现动画脚本 / 时间参数
  - **不要退化成“那我给你生成一张图”。**
  - - 完整动画时间线
  - - 其他真实素材

## 16｜CONVERT_TO_CAPABILITY

- Chars: 2389
- Capability: SOUND_DESIGN_BLUEPRINT
- Migration: 声音设计保留。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：最终 SRT / 时间线、核心情绪/角色气质、视觉方案（有则附）；只设计声音语言与具体 Cue。
  - **AUDIO_LOCK + FINAL SRT + TIMELINE_LOCK**
  - 请围绕最终口播时间线设计整条视频的**声音语言**。
  - 声音设计必须服务：
  - 不要滥用效果音。
  - 每个 Cue 都必须有理由。
  - - 可长时间循环
  - - 不要持续嗡鸣式环境噪声
  - - 不要靠大量高频和鼓点制造廉价“燃”
  - ### 输出
  - 必须默认生成可保存的 Markdown 描述文件：
  - 精确到 `FINAL.srt` / `TIMELINE_MASTER.md` 时间点，至少记录：
  - - 是否必须与画面某动作对齐
  - - 最适合使用的时间 / 场景
  - - RIGHTS_STATUS
  - - EDIT_USE_ALLOWED
  - 不要在这里同时承担“设计”和“最终资产生产”两套职责。

## 17｜CONVERT_TO_CAPABILITY

- Chars: 4349
- Capability: COVER_DESIGN
- Migration: 三比例Canonical封面保留。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步使用当前 Chat 已确认的命题、封面卖点、官方角色参考或已验证的官方原图 URL。先尝试直接获取官方参考；只有真实无法读取时才请求用户补图，不要重复要已有立绘。
  - 请为当前视频设计并生成正式封面。优先复用本 Chat 里已有的官方角色立绘 / 参考资产，或从经核验的官方来源直接获取高质量原图；不能默认要求用户再截图或手动搜图。确实无法取得身份参考时才提出最小的补图请求，不得凭空设计不符合官方特征的角色。
  - 各平台的正式发布标题可以之后单独设计；本轮不要假设平台标题已经锁定。封面文字应表达核心命题，并为后续标题留出互补空间。
  - 但必须同时满足：
  - 观众应在极短时间内看懂：
  - ### 2｜固定输出比例
  - 必须生成 **3 个 Canonical 正式比例版本**：
  - 这三个版本是 Creator OS 的基础封面资产，都必须能独立作为正式封面使用。
  - 禁止：
  - 4:3 / 3:4 / 16:9 是固定基础资产，但**不假定它们永远覆盖所有平台的未来真实要求**。
  - - 如果当前平台明确要求其他比例 / 安全区 / 尺寸，输出：
  - 平台特版必须保持：
  - **IDENTITY SOURCE / 角色身份真值**
  - 封面中的角色主体必须明显依据当前 Chat 可读取的官方参考图（包含前面已下载的官方原图），并尽可能保持：
  - ### 4｜人物主体不要像素化
  - **角色主体本身不要做成像素小人，也不要整体套重度像素滤镜。**
  - 不要做成典型“AI 风封面”。

## 19｜CONVERT_TO_CAPABILITY

- Chars: 2781
- Capability: CODEX_BUILD
- Migration: Codex只执行蓝图。
- Detected mature rules:
  - 【任务：19｜Codex 严格执行蓝图｜画面 + BGM/SFX 分轨输出】
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步必要输入：`CODEX_EDIT_BLUEPRINT.md` 与蓝图实际引用的本地素材路径；不靠猜测选素材或填不存在的文件。
  - - `AUDIO_MASTER`（**只用于时间线和口播响度参考，绝不能混入输出的 BGM/SFX 轨**）
  - - SOURCE_IN / SOURCE_OUT
  - **不要重新分析整套素材，不要重新做导演判断。**
  - - 时间线位置
  - - Source In / Out
  - 禁止：
  - 不要自行找“差不多的”素材。
  - 蓝图中的 Anchor 必须优先保证。
  - ### 时间线真值
  - - `AUDIO_MASTER` = 时间轴真值
  - - `TIMELINE_MASTER.md` = 统一语义 / 时间锚点
  - - 素材真实时间码 = 取片依据
  - ### 最终必须输出两个独立文件
  - 必须：
  - 不同分辨率素材保持正确比例，禁止拉伸。

## 20｜CONDITIONAL

- Chars: 912
- Capability: FINAL_VIDEO_QC
- Migration: 全片AI QC默认可跳过，重大项目/疑点时启用。
- Detected mature rules:
  - 【任务：20｜可选 / Future｜最终成片 QC】
  - **【独立执行约定】** 本条是可选的独立最终检查；仅在用户明确要求 QC 且提供实际成片时执行。不假定已阅读其他编号 Prompt，也不要求用户必须跑完此前所有阶段。
  - > **当前默认制作方式不强制执行整片 QC；仅在用户明确发出本条 QC Prompt 时执行这一检查。**
  - 请对已经完成旁白、字幕、声音与画面最终组装的 `FINAL_MASTER.mp4` 执行最终 QC。
  - 本轮只允许：
  - 不要重新设计整条视频。
  - - PUBLIC BOUNDARY：不得出现内部制作痕迹
  - 不要因为：
  - 输出：
  - - P0：发布前必须修
  - - PASS：可以发布
  - 当前 QC 如未启用，用户可自行使用独立的**六平台发布文案包制作 Prompt**；此处不自动执行发布任务。

## 21｜CONVERT_TO_CAPABILITY

- Chars: 4935
- Capability: PLATFORM_RULE_VERIFICATION, SIX_PLATFORM_PUBLISH_PACKAGE
- Migration: 平台规则实时核验+发布包。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：`FINAL_MASTER.mp4` 或已确认的最终 SRT/时间线、正式内容命题、封面索引（有则附）；平台投稿规则必须实时核实。
  - 请基于用户本轮提供或可读取的**最终成片 ****`FINAL_MASTER.mp4`****、最终字幕 / 时间线和封面资产**制作六个平台发布包。若成片文件暂时不可直接读取，但最终时长和字幕等足以完成发布文案，可以先完成能准确产出的部分，明确缺少的字段；不得虚构成片时长或画面。
  - 当前主流程不强制做耗时的**最终成片完整 QC**；如用户主动启用此审核任务，则发布包只引用实际通过 QC 的版本，不假设 QC 自动发生。
  - 除非我明确要求，否则不要改变以上语言轨。
  - ### 第一步：必须先实时核实平台当前投稿规则
  - 在生成发布包之前，必须联网核实六个平台**当前真实投稿页 / 官方帮助 / 官方创作规范**，不要凭历史记忆填写限制。
  - - 章节 / 时间戳功能规则
  - 禁止把经验数字写成官方限制。
  - 不要编造数字。
  - 如果某个平台当前真实封面规格不适配现有 4:3 / 3:4 / 16:9：
  - 不要机械裁切。
  - 输出：
  - 生成标题前必须先读取 `COVER_PACKAGE_INDEX.md` 中的：
  - 标题必须以提高点击率为目标，同时保证正文能够兑现。
  - **标题与封面要互补，不要机械重复同一句话。**
  - 禁止：
  - 不要给标题打分或机械排名，我自己选。

## 22｜CONVERT_TO_CAPABILITY

- Chars: 670
- Capability: ANALYTICS_REVIEW
- Migration: 真实数据复盘。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：真实发布平台、视频标题/链接及曝光、点击率、观看时长、互动数据；没有数据不得编造复盘结论。
  - 请根据当前视频真实发布数据执行复盘。
  - 输出：
  - 不要只用播放量高低下结论。

## 23｜CONVERT_TO_CAPABILITY

- Chars: 1747
- Capability: PROMPT_FLOW_COMPILER, PROMPT_FLOW_UPDATER
- Migration: 升级为Project System一级核心能力：首次编译完整Flow，执行中按DIFF更新。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：用户当前自然语言需求、可读取的正式文件与任务边界；只编译当前可执行 Prompt，不执行它。
  - 先检查本轮可访问输入里是否确实有 `VIDEO_CONTRACT.md`。若有，读取确认事实、LOCK 与当前任务；若没有，不假设其他 Chat 的文件可读，使用本轮描述编译独立 Prompt。仅在影响当前任务正确性的关键内容缺失时标记 `NEED_INPUT`。
  - - SOURCE_OF_TRUTH
  - - LOCKS
  - `PRODUCTION_NEEDS` / 早期 WORKFLOW_ROUTE 属于初步资源规划。用户现在明确要求某步骤时，按本轮任务与真实前提判断能否完成；不能因初始规划标记 `NOT_PLANNED` 就阻止生成 Prompt。
  - - LOCKED
  - 2. 是否覆盖 LOCK
  - 3. 是否混淆 Source of Truth
  - 10. 是否使用 EDIT_USE_ALLOWED != YES 的素材进入最终成片
  - ### 输出原则
  - 不要机械套长模板。
  - - `SOURCE_ANALYSIS_*.md`
  - - 现有 LOCKED Artifact
  - 不要重复把已经存在的规则全文复制一遍。

## 01｜CONVERT_TO_CAPABILITY

- Chars: 798
- Capability: PROJECT_BUILDER, PLAYER_DEMAND_RESEARCH, COMPETITOR_RESEARCH
- Migration: 立项判断保留，项目字段由AI主动补全。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：游戏/版本或创意、目标观众与目前已知热点；尚不需要上传成片素材。
  - 2. 看完能解决什么真实问题？
  - 产品类型必须从以下选择最贴近的一种：
  - 输出：
  - 如果只有热点，没有内容增量，直接否决成长视频。

## 01A｜MERGE

- Chars: 2274
- Capability: PROJECT_BUILDER
- Migration: 并入项目构建；VIDEO_CONTRACT仍保留。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：本次已确认的立项结论、题材/区服/版本、现有事实与限制；没有资料的字段填 UNKNOWN，不需要未来阶段的 Prompt。
  - **不要假设你已经读过本页之后的任何 Prompt。** 本轮也不需要提前了解后续有哪些编号。
  - ### 输出文件
  - - CURRENT_STAGE / LOCKED_ARTIFACTS
  - - SOURCE_OF_TRUTH / VERIFIED_FACTS / REASONED_ANALYSIS / UNKNOWNS / DO_NOT_USE
  - - AVAILABLE_ARTIFACTS（仅列**实际已提供或确认存在**的文件；路径未知写 UNKNOWN）
  - - OFFICIAL_SOURCE_ACQUISITION
  - **这些状态只是立项时的资源规划，不是 LOCK，也不是后续 AI 的自动执行或禁止执行命令。** 随资料与制作进度变化可以调整；未来的具体 Prompt 会自行判断实际前提。
  - - 前瞻：重视官方公开证据与未知边界。
  - - 你只能**生成 ****`VIDEO_CONTRACT.md`**** 的内容**。除非本轮真的有可用写入工具并成功回读，否则不要声称保存到了用户的 Notion / 本地 / GUCC。
  - - 任何未验证的技能细节、未来资料或不存在的素材路径必须标记 UNKNOWN。
  - - 后续确认 CORE THESIS、完成锁稿、录音、最终时间线、蓝图等关键节点时，可以更新已提供的 Contract；如无法直接写文件，仅输出`CONTRACT_PATCH`，不能声称已更新。
  - 只输出：
  - 不要展开后续其他步骤的详细 Prompt，也不要替用户自动进入下一阶段。

## 02｜CONVERT_TO_CAPABILITY

- Chars: 866
- Capability: PLAYER_DEMAND_RESEARCH, COMPETITOR_RESEARCH
- Migration: 社区需求/竞品拆为可复用研究能力。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：游戏、服务器/版本、研究主题及你最关注的玩家问题；已有资料可附，没有 Contract 也可调查。
  - `PRODUCTION_NEEDS` 只是初步建议，不要因文件缺失或此前标记 `NOT_PLANNED` 而直接终止本次明确要求的调查。只研究当前视频需要的内容。
  - 输出：社区问题池、Top 5 高价值问题、常见误解、讲烂的内容、竞品缺口、下一步研究重点。
  - 本轮不要写完整稿。

## 03｜CONVERT_TO_CAPABILITY

- Chars: 2695
- Capability: OFFICIAL_SOURCE_RESEARCH
- Migration: 官方来源核验保留。
- Detected mature rules:
  - **【推荐执行环境】** Work（优先：批量浏览官网 / YouTube / 官方图文并交叉核验）；可联网的 Chat 也可执行。若本轮已在当前 Chat 找到并验证资料，直接复用，不要求重搜；下载到 Windows 本地需要后续本地执行命令。
  - **【连续执行与独立执行兼容】** 同一 Chat 已获取的游戏 / 版本 / 区服 / 选题 / URL / 来源证据默认继承，不要求重复上传或粘贴。仅针对来源不确定、前后冲突或涉及新版本变化的信息补查。跨 Chat 仅使用真实可读记录，不假装已访问其他会话。
  - 4. 合规可引用的正式服玩家实测（必须标记第三方版权和测试边界）。
  - 3. 若官方根本没有相关图片，但存在**可核验的官方简中文本**，可以制作**准确的文字可视化说明图**，而不是让用户自己找图或截图。原创示意图必须标明 GENERATED_EXPLANATION，禁止伪装官方截图 / 实机，也不能凭空画没有身份参考的角色。
  - ### 二、严格防止视频找错：SOURCE_VERIFY
  - - GAME、SERVER / REGION、VERSION 与主题是否一致；不要把旧版、新版、别的角色、不同服务器、PV/攻略混为一谈。
  - - 页面标题 / 简介 / 官方公告或官方播放列表必须能支持视频身份；可以实际访问视频时，还要核对片头、角色、关键画面或片段。
  - - 严禁伪造 video ID、URL、上传日期、视频时长、游戏版本或给出不存在的链接。不能确认就写 NEED_VERIFY / NOT_FOUND 并解释缺项。
  - - 影画 / 升级 / 数值类资料以当前游戏、区服、正式版本的**官方简中原文、层数、数值和前置条件**为真值。不同版本术语不得混用。
  - - 如果只有经过验证的文字、缺少干净图片：本轮环境有图像生成能力时直接生成清晰的**非实机机制说明图**；否则输出足够精确的中文文字、布局、尺寸和配色方案，供本地程序 / 后续图像工具一次生成。不能假装已生成图片。
  - ASSET_ID、ASSET_TYPE（OFFICIAL_VIDEO / OFFICIAL_IMAGE / OFFICIAL_TEXT / USER_RECORDING / GENERATED_EXPLANATION / COMMUNITY_REFERENCE）、GAME、SERVER、VERSION、CHARACTER、TITLE、SOURCE_OWNER、OFFICIAL_VERIFIED、SOURCE_PAGE_URL、DIRECT_MEDIA_URL（已核验才填）、VIDEO_ID / IMAGE_ID、LANGUAGE、DURATION / RESOLUTION（可获得时）、CONTENT_DESCRIPTION、RESEARCH_PURPOSE、RIGHTS_STATUS、EDIT_USE_ALLOWED、ATTRIBUTION_REQUIRED、DOWNLOAD_STATUS、STATUS=VERIFIED / NEED_VERIFY / NOT_FOUND。
  - ### 正式输出
  - 1. `SOURCE_VERIFICATION.md`：视频身份核验表，包含被排除的错误候选及原因。
  - 2. `SOURCE_DOWNLOAD_MANIFEST.md`：已核验 URL、可下载原始素材、对应 ASSET_ID、视频 / 图片 / 图文区分、文件名及版权边界，供一次性本地批量下载。
  - 3. `IMAGE_REQUIREMENTS.md`：所有必须图片的取得情况；仅缺官方图片但有正确文字的项列成 TO_RENDER_TEXT_VISUAL（有工具时直接生成，并记录真实文件名）。
  - 4. 确实找不到的素材注明缺口及最低成本替代；不要把用户重新截图当成默认方案。
  - 不得宣称“下载完成”或“生成了文件”，除非确实执行并验证；不要自动开始文案。

## 03A｜MERGE

- Chars: 2170
- Capability: ACQUIRE_REGISTER_OFFICIAL_SOURCE
- Migration: 下载+metadata+字幕+探测+注册合并。
- Detected mature rules:
  - **【推荐执行环境】** Chat 负责生成已核验清单对应的 PowerShell / yt-dlp / HTTP 下载脚本；**本地 PowerShell 或 Codex（有真实本地文件权限时）执行**。Work 可以协助处理复杂网页和来源核验，但不要假定云端 Work 自动拥有 Windows 本地路径的访问权。
  - **【连续执行与独立执行兼容】** 直接使用当前 Chat 之前已经确认的 SOURCE_DOWNLOAD_MANIFEST、URL、文件夹路径；仅缺关键输入时才询问。不要求每次贴 tree /f；第一次通常只有一个目标文件夹。跨 Chat 则需要重新提供或连接可读取的清单。
  - - 已核验 `SOURCE_DOWNLOAD_MANIFEST.md` / SOURCE_VERIFICATION.md：【同一 Chat 已存在则直接沿用】
  - 4. 如果清单标有 VERIFIED_TEXT_ONLY + TO_RENDER_TEXT_VISUAL：优先用当前工具生成真实说明图片，或在本地脚本中根据已经核验的简中文字输出可直接渲染的 SVG / PNG。**不能伪造官方截图、改写官方数值或冒充已获得官方原图**。
  - - 视频使用 yt-dlp / FFmpeg 的合法可行方式；图片可用 Invoke-WebRequest / curl 或对应正式下载地址。每个来源用与该格式相适配的方法；不要把 HTML 登录页错误保存为 .png。
  - - 下载前识别重复 ASSET_ID / VIDEO_ID / 文件哈希 / 现有文件，避免重下；**严禁覆盖已有 Master / 其他原件**。
  - - 保存 SOURCE_PAGE_URL、DIRECT_MEDIA_URL、VIDEO_ID、频道 / 权利人、校验状态、使用边界；稳定文件名同时便于后续 Master / Proxy 对应。
  - ### 输出
  - 2. 最小目标目录结构：VIDEO_MASTER / IMAGES_OFFICIAL / TEXT_OFFICIAL / GENERATED_EXPLANATION / METADATA（根据真实需要建，不空建）。
  - 3. `SOURCE_DOWNLOAD_MANIFEST.md` 的更新草案，记录 ASSET_ID / 类型 / 精确源 URL / 文件名 / 已验证可下载性 / 版权与使用标记 / 待下载状态。**没有真实执行前不得把状态填成 DOWNLOADED_VERIFIED**。
  - 5. 简短 NEXT_HANDOFF：真实视频 Master 如需 AI 解析，另行做低码率 Proxy；静态官方图片和自制说明图直接作为资产索引条目使用，无须一律转 Proxy。

## 03B｜CONDITIONAL

- Chars: 1349
- Capability: GAMEPLAY_RECORDING_PLAN, ROTATION_RESEARCH
- Migration: 仅有证据/实战缺口时调用。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：具体待验证问题、游戏/区服/版本、已有证据与可使用队伍；未知设备/角色不能自行编造。
  - - 哪些 UI / 数值 / 状态必须看清
  - `ASSET_ID` 后续必须沿用到 `PROXY_MAP.md`、`SOURCE_ANALYSIS_<ASSET_ID>.md` 和 `ASSET_INDEX.md`。
  - 角色 → 具体技能 → 状态变化 → 切谁 → 下一动作 → 资源变化 → 输出窗口
  - **不要直接进入文案，也不要直接进入最终剪辑。**
  - 不要写“随便打一局多录一点”。
  - 输出建议保存为 `RESEARCH_RECORDING_PLAN.md`。
  - 直接输出：

## 03C｜CONDITIONAL

- Chars: 2937
- Capability: PROXY_MEDIA
- Migration: Proxy不再固定步骤。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步必要输入：Master 文件位置或 tree /f；若尚无媒体参数，先给用户**批量 ffprobe 探测命令**，再根据真实参数制定转码方案。
  - **不要猜。** 先给批量获取媒体参数的 PowerShell / ffprobe 指令；等用户提供真实结果后，再生成有依据的转码命令。
  - 先给我一段可以批量扫描当前 Master 文件夹并输出上述参数的 PowerShell + ffprobe 指令，我执行后再把结果贴回来。
  - 单文件 Proxy 模式下必须保证：
  - **Proxy 与 Master 的叙事时间轴 1:1 对应。**
  - - 不制造起止时间偏移
  - 如果因为上传限制必须分段，则每一段内部保持原速、原顺序，并用 PART → MASTER 映射恢复 Master 绝对时间。
  - 但不能破坏时间对应关系。
  - 但不要把输出做在 511～512 MB 的理论边缘。
  - 如果以后平台真实上传限制发生变化，以当时实际上传 UI / 官方限制为准，再重新计算。
  - **不要固定死 720p / 固定 CRF / 固定码率。**
  - 源素材低于目标规格时，不要无意义升分辨率或升帧。
  - 如果需要按目标大小控制输出：
  - 必须预留容器和编码波动余量，不要算到 512 MB 理论极限。
  - **必须保留原视频语音信息。**
  - **声音 + 画面 + UI + 时间线。**
  - 不要硬压成一个低质量文件。

## 04｜CONVERT_TO_CAPABILITY

- Chars: 2937
- Capability: VIDEO_SOURCE_ANALYSIS
- Migration: 强化连续画面/UI/音频/时间戳。
- Detected mature rules:
  - **【推荐执行环境】** Work 或确实支持视频多模态解析的 Chat；若不能看到真实视频则不得冒充解析。选择基于本轮是否需要浏览器操作、批量素材管理或本地渲染；切换到 Work / Codex 前先确认其实际可读取输入，不假定同一 Chat 的附件会自动跨工具同步。
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 使用本 Chat 已上传且仍可实际读取的 Proxy 视频及对应 Master 映射，不重复要求上传。换 Chat / Work 后如无法读取视频才提示重新提供；分段时必须有 PART → MASTER 时间映射，不能猜。
  - 请结合**本次对话中已实际可读取的 Proxy 视频**和已经提供的 `PROXY_MAP.md`（或包含 Master 起始时间的可靠映射信息）解析声音、画面、UI 和事件，并把时间戳对应回 Master。若素材尚未实际提供，不得假装看过视频；若分段映射缺失，暂停需要 Master 绝对时间的部分并请求映射。
  - 优先使用与 Master 时间轴 1:1 对应的单文件 Proxy。
  - 如果因为 ChatGPT 单文件上传限制而使用了**分段 Proxy**，必须读取 PART → MASTER 时间映射，并把所有分析结果统一换算回 Master 的绝对时间。
  - 优先读取当前 Chat 已有的 `SOURCE_VERIFICATION.md` / `SOURCE_DOWNLOAD_MANIFEST.md`；对每个 ASSET_ID 核对 MASTER_FILE、VIDEO_ID、官方主体、游戏、角色、区服、版本和上传资料。若 Proxy 与此前官方验证的视频不匹配，立即标记 `SOURCE_MISMATCH`，暂停由该视频推导机制，不得为了完成任务硬解读错误的视频。
  - 必须结合：
  - **声音 + 画面 + UI + 时间戳 + 角色动作 + 前后状态变化**
  - **不要猜。**
  - 标记该时间点需要回看 Master，或让我补高清截图。
  - 【目前未知】
  - 【未公开资料，不得进入正式稿】
  - - 输出窗口
  - ### 时间戳要求
  - 所有时间戳必须以视频真实时间为准。
  - 禁止：
  - - 根据字幕长度猜时间

## 05｜CONVERT_TO_CAPABILITY

- Chars: 1542
- Capability: MECHANIC_RESEARCH, FORMAL_SERVER_VALIDATION, TEAM_RESEARCH, ROTATION_RESEARCH, PULL_DECISION_RESEARCH, RERUN_REEVALUATION, CHARACTER_LORE_RESEARCH
- Migration: 按内容类型动态选择。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：研究问题、正式资料/证据视频或其分析 MD；机制结论必须可追溯，缺资料时只报告已知与证据缺口。
  - 当前任务是根据**我实际提供的证据**研究这期视频所需事实 / 机制。可以读取已提供的 `VIDEO_CONTRACT.md` 确认产品类型与事实边界；未提供时依据本轮主题继续，关键事实缺失必须标注，不猜测。
  - 根据视频类型选择研究深度，不机械做角色攻略；不要根据先前计划里写过的 `NOT_PLANNED` 自动拒绝执行。
  - **为了当前视频的核心命题，我们还必须真正研究明白什么？**
  - - 当前未知
  - - 禁止进入正式稿的未公开资料
  - - 输出窗口
  - 复刻重评必须额外强调：
  - 不要为了完整而强行扩成角色攻略。
  - 不要研究和最终决策无关的细枝末节。
  - 不要为了走流程而写完整机制论文。
  - 只研究回答当前单一问题所必须的证据链。
  - ### 输出
  - 根据产品类型输出最小但充分的：
  - 不要直接写成视频稿。

## 06｜CONVERT_TO_CAPABILITY

- Chars: 1236
- Capability: CORE_THESIS, CONTENT_STRUCTURE
- Migration: 核心命题与结构继续保留高价值认知检查点。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：选题、已有玩家问题和研究结论；产出本期核心命题与内容结构，不直接写全文。
  - 本轮独立完成**本期核心命题与内容结构**。请以用户提供的研究材料和核心问题为依据；可访问 `VIDEO_CONTRACT.md` 时读取，否则先使用本轮明确事实，不假定已有完整项目记录。不要默认所有项目都是长篇角色攻略。
  - ### 输出
  - 3. 必须讲的内容
  - - 长攻略：允许完整章节，但每章必须服务 CORE THESIS。
  - - 短内容：不要硬凑章节，围绕一个问题快速完成。
  - - 复刻重评：当前版本变化必须是结构中心之一。
  - - 实战 / 排轴：操作与状态变化优先，不要花大量篇幅重复角色基础介绍。
  - 不要为了“完整”把所有资料塞进去。
  - 在用户明确确认前标记为 PROPOSED，不凭当前 AI 单方面宣告 STRUCTURE_LOCK。
  - 本轮输出中附一段可直接写回 `VIDEO_CONTRACT.md` 的 `CONTRACT_PATCH`（CORE_THESIS / CURRENT_STAGE / NEXT_TASK）。只有实际调用写入工具并回读成功，才可以报告文件已更新；否则由用户保存，不要声称已同步。

## 07｜CONVERT_TO_CAPABILITY

- Chars: 2609
- Capability: SCRIPT_DRAFT
- Migration: 完整口播稿。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步必要输入：当前已确认 CORE THESIS、主要事实证据、内容结构；缺关键证据时先提出 NEED_INPUT，不凭空补机制。
  - 根据**本轮提供或实际可读取**的 CORE THESIS、内容结构、研究资料，撰写当前产品类型所需的完整真人口播稿。如果用户提供 `VIDEO_CONTRACT.md`，必须遵守已确认事实与 LOCK；没有提供时不假装读过，也不要因早期规划中的 `NOT_PLANNED` 自动拒绝明确的写稿任务。
  - 如果缺少足以写出可信稿件的关键研究证据，先明确列出 `NEED_INPUT`；不要把推测写成官方事实。
  - 不要重新研究主题，不要改变已锁核心命题。
  - - LONG：按章节组织，但不要为了完整硬塞内容。
  - - CREATIVE：优先服从形式、节奏和观看体验；事实骨架必须准确，但不要套攻略模板。
  - - 事实 / 推断 / 未知严格分开
  - - 句子长短要有变化，不要整篇都是同一种节奏
  - - 优先用直接判断 + 证据 + 结果来表达，不要靠“漂亮句式”制造深度
  - - 能一句说清楚就不要故意拆成三句
  - - 能直接说结论就不要先铺一层空泛转折
  - 以下句式**默认禁用**。只有确实存在强对立、重大争议、逻辑反转，而且这样表达明显比直接说更准确时，才允许偶尔使用一次。
  - 默认不要写：
  - 不要写：
  - 默认不要用“反而”制造转折感，例如：
  - 只有前后真的存在明确逆预期关系时才使用。
  - 章节之间优先靠真实内容因果自然衔接。

## 08｜CONVERT_TO_CAPABILITY

- Chars: 778
- Capability: SCRIPT_FACT_QC
- Migration: 事实/机制/术语独立QC。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步必要输入：当前完整稿 + 对应官方/实机研究资料；未实际核实的事实不能判 PASS。
  - - 是否违反 `VIDEO_CONTRACT.md` 中的 DO_NOT_USE / SOURCE_OF_TRUTH
  - 不要主动全文重写。
  - - P0：明确事实错误 / 版本错误 / 证据边界错误，必须修
  - 最后必须单独给：
  - - **PASS**：没有未解决的 P0，也没有仍需核实的事实型 P1
  - 不要把“有 P1”同时又写成 PASS。

## 08B｜CONVERT_TO_CAPABILITY

- Chars: 1303
- Capability: SCRIPT_VALUE_QC
- Migration: 内容价值/逻辑独立QC。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步必要输入：当前完整稿 + 核心命题、受众/标题方向；只做内容与逻辑审核。
  - ### 必须检查
  - - 实战 / 排轴有没有花大量时间讲角色档案
  - ### 输出
  - 只输出：
  - 最后必须单独给：
  - - **PASS**：没有未解决的 P0 / P1，核心命题已经被完整兑现
  - 不要全文重写。

## 09｜CONVERT_TO_CAPABILITY

- Chars: 2251
- Capability: SCRIPT_NATURALNESS_QC, SCRIPT_DIFF_REVISION
- Migration: 去AI味/留存与最低成本修订。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步必要输入：待审的当前完整口播稿；其他审核结果若未提供，不得擅自判定 SCRIPT_LOCK。
  - 不要重新写一篇稿。
  - 只有社区里真的存在这个高频问题时才保留。
  - **更直接、更具体、更像真实判断。**
  - 不要为了去 AI 味：
  - ### 输出
  - 只输出：
  - - **P0 必须修**
  - **PASS / NEEDS_MINOR_FIX / NEEDS_FIX**
  - ### SCRIPT_LOCK Gate
  - 这是对**实际审核证据**的判断，不是本轮自动宣告锁稿。只有已实际提供或可读取三项审核结果、且均来自同一份当前稿件，才允许进入 SCRIPT_LOCK：
  - - **事实、机制、术语审核**的真实结果为 PASS
  - - **内容价值、逻辑、核心命题兑现审核**的真实结果为 PASS
  - - **去 AI 味、留存审核**的真实结果为 PASS
  - 把具体修改意见交给**文案修订任务**按 DIFF MODE 修复，之后基于修订后的正式文稿重新执行必要的事实审核、内容逻辑审核与去 AI 味审核。当前 AI 不得因为知道这些步骤编号就假装其他审核已经完成。
  - 不要因为“已经改过一轮”就默认锁稿。
  - 不要全文重写。

## 16A｜MERGE

- Chars: 1815
- Capability: BGM_SFX_ASSET_PRODUCTION
- Migration: 声音资产实际制作并入能力。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步输入：`SOUND_DIRECTION.md`、`SOUND_CUE_MAP.md` 与待生成音频资产要求；只实际制作音频或给可执行制作指令。
  - 不要只给“声音应该怎么样”的说明。
  - 要得到真实存在的：
  - 不要为了“流程完整”生成大量无用音效。
  - 每个声音资产必须：
  - - 能长时间循环
  - ### 输出
  - 必须输出完整可保存的 `SOUND_PACKAGE_INDEX.md` 更新内容；仅在具备可用文件写入工具并成功回读时，才可声称已更新现有文件。
  - - RIGHTS_STATUS
  - - EDIT_USE_ALLOWED
  - `SOUND_CUE_MAP.md` 中所有被标记为 MUST_USE 的声音资产都必须满足：
  - 输出 `MISSING_AUDIO_ASSET`
  - 不要把缺失声音留给 Codex 临时发挥。

## 18A｜CONDITIONAL

- Chars: 2442
- Capability: ASSET_GAP_AND_INDEX
- Migration: 素材复杂时整理；简单项目可跳过。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 本步必要输入：**当前本地 tree /f** 或文件清单；本轮只设计安全整理脚本及路径映射，不假装已经运行。
  - 仅有目录树而缺少真实根目录时，不能猜测 Windows 绝对路径；先要求路径或输出相对路径执行方案。
  - 先判断现有结构，不要机械套新模板。
  - - 不破坏已经 LOCK 的正式文件
  - 只有确实混乱时才新建必要目录。
  - 但这只是参考，不要求机械照搬。
  - 禁止：
  - - 随意改 LOCK 文件内容
  - - 使用 Windows PowerShell，必须先提供**Dry Run / ****`-WhatIf`**** 预览模式**，以及确认后可直接执行的正式模式。预览阶段只展示将移动的路径，不真正修改文件。
  - - 遇到同名冲突时停止，不要覆盖
  - - 大视频优先同盘 Move，不要无意义复制
  - - 文件名能看懂时不要为了统一而大规模重命名
  - ### MD 描述文件必须跟着素材走
  - 后续蓝图 AI 会主要依赖这些 MD，所以整理时必须保护它们。
  - - `SOURCE_ANALYSIS_*.md`
  - - `SOURCE_ANALYSIS_INDEX.md`
  - - `SOURCE_DOWNLOAD_MANIFEST.md`

## 18B｜CONVERT_TO_CAPABILITY

- Chars: 4715
- Capability: EDITING_BLUEPRINT
- Migration: 精细蓝图是Codex执行前关键认知检查点。
- Detected mature rules:
  - **【连续执行与独立执行兼容】** 本条只完成当前任务。同一 Chat 中已实际获得的研究结果、消息、附件、已生成文本与已确认结论，默认直接沿用；不要让用户重复粘贴、重新上传或重跑已完成的内容。跨 Chat / 跨执行环境时，只有本次确实可读取的文件或连接器记录才可复用，缺关键输入才提示 NEED_INPUT。步骤编号只用于人类查找，不代表当前 AI 已阅读未来 Prompt；不得自动执行下一步骤。
  - **【输入检查】** 优先复用同一 Chat 已有的 `tree /f`、素材说明 MD、官方图片索引、`FINAL.srt` 与 `TIMELINE_MASTER.md`；只有这些信息不足以决定某个镜头时才请求局部 Proxy / 截图，不重复上传大文件。
  - - `AUDIO_MASTER`（必要时只用于时间参考）
  - - `SOURCE_ANALYSIS_INDEX.md`
  - - 各 `SOURCE_ANALYSIS_<ASSET_ID>.md`
  - - `SOURCE_DOWNLOAD_MANIFEST.md` / `IMAGE_REQUIREMENTS.md`（如本期使用静态官方图与说明图）
  - - 可用官方 / 自制静态图的对应索引 MD（ASSET_ID、真实路径、画面内容与来源权限）
  - 大视频 / 大音频**不要求全部上传给蓝图 AI**。
  - - `ASSET_INDEX.md` / `PATH_REMAP.md` 决定当前真实路径
  - 只有当某个关键素材的 MD 描述不足以做出导演判断时，才额外上传对应 Proxy / 小片段 / 关键截图，不要重新塞整套大素材。
  - 不要写模糊指令，例如：
  - 只要现有描述足够，就应该在蓝图阶段把具体素材、时间段、声音事件和锚点选出来。
  - ### 时间线真值
  - - `AUDIO_MASTER` = 叙事时间轴真值
  - - `TIMELINE_MASTER.md` = 后续统一语义与时间锚点
  - - SOURCE_ANALYSIS_\*.md = 官方 / 实机素材定位依据
  - - `SOURCE_DOWNLOAD_MANIFEST.md` / `IMAGE_REQUIREMENTS.md` = 官网上下载的图片、影画说明图和本地生成的非官方解释性静态图；需记录真正的文件路径、来源、文本核验依据及使用边界。
  - 蓝图可以直接使用 MD 中的 MASTER_TS / SOURCE_IN / SOURCE_OUT。

## 19A｜KEEP_AS_CORE

- Chars: 1080
- Capability: FINAL_ASSEMBLY
- Migration: 剪映四件套与人类最终听感确认保留。
- Detected mature rules:
  - - 根据真实口播听感，微调 FINAL_BGM_SFX.wav 总音量
  - 不要重新：
  - 如果需要 AI 帮我生成最终组装清单，只需要基于上述四件套给最短步骤，不要重新分析整条视频。

