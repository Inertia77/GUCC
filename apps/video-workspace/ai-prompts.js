/* Canonical prompt catalog. Pure builders; no network or implicit project writes. */
(function(root){'use strict';
const VERSION='6.1.3';
const STAGES=[['research','01','选题与证据'],['script','02','结构与文案'],['timeline','03','录音与时间线'],['assets','04','画面与声音'],['blueprint','05','剪辑蓝图'],['assembly','06','执行与合成'],['publish','07','发布与复盘']].map(([id,no,name])=>({id,no,name}));
const ROUTES=[
{id:'mechanism',name:'机制专题',hint:'规则、触发、状态与资源',source:'正式技能与系统文本、官方演示、当前区服真实实机。看清关键 UI、状态、数值与连续过程。',research:'规则→触发条件→状态/资源变化→边界条件→操作结果；分别核实共存、覆盖、延迟、离场生效与例外。只研究核心问题，不扩成养成百科。',structure:'从真实现象建立因果模型，用具体操作及边界反例验证；配队养成只留会改变该模型的部分。',analysis:'同步看动作、听音频、读 UI，记录 STATE_BEFORE / TRIGGER / STATE_AFTER 与资源增减；单帧不能证明触发顺序。',recording:'设计能区分两种解释的控制变量测试，明确起手资源、可用配置、输入、可见 UI 与成功标准，必要时重复。',visual:'真实镜头承担 PROOF；资源回路、状态与时间轴动画承担 EXPLAIN。图形运动对应含义，不生成假实机。',audit:'核对触发顺序、状态归属、伤害标签、边界反例和因果，看不清的数字不能猜。',sound:'资源满足、状态切换、关键触发设少量提示；解释密集处降低背景声。',promise:'兑现一个系统关系与操作收益，不承诺未验证数值。'},
{id:'guide',name:'正式攻略',hint:'养成、队伍与操作收益',source:'当前正式服技能、配置规则、面板、可复现实测与真实操作。',research:'按核心问题选择机制、资源循环、配装、投资、队伍和排轴。明确测试条件、适用范围、低成本替代和常见失误。',structure:'先给适用对象与实战判断，再解释决定结果的机制、配置和操作，不逐条复述技能。',analysis:'对应动作、资源、队伍增益和输出窗口，保留配置/场景，不从一次录像推普遍排名。',recording:'安排可复现配置与操作对比，写起手状态、场景、控制变量和成功标准。',visual:'真实操作/UI证明，循环动画解释，配装和替代方案用清晰对照。',audit:'核对技能、词条、配装、队伍、资源收支、收益依据，不用高配置代表全体玩家。',sound:'操作点少量准确提示，讲解保证口播清楚，展示段落适当加强节奏。',promise:'说明谁能用、如何用、得到什么有证据的收益。'},
{id:'preview',name:'前瞻解析',hint:'官方公开与未知边界',source:'官方公开直播、原始 PV、官网图文，核对频道、版本、区服、发布日期，未公开资料禁入正文。',research:'分清官方说法、公开画面现象、条件分析和未知。未正式验证的数值、最优配队和抽取排名不写死。',structure:'围绕公开信息的新认识组织，说明证据边界，未知集中表达，不伪造完整攻略。',analysis:'官方原话与同刻画面/UI分栏，演示无法确定的条件标未知，不只靠字幕推机制。',recording:'未上线内容不安排不存在的正式服测试；只列上线后会改变结论的验证问题。',visual:'用官方原画面作证据，分析视觉明确标分析，不制作假正式服 UI。',audit:'排查把演示外推完整机制、把分析写成官方确认、把未知强度写成排名。',sound:'随公开画面和信息揭示设置节奏，未知部分保持克制。',promise:'标题不能暗示正式服已实测，说明公开信息能判断到哪一步。'},
{id:'rerun',name:'复刻重评',hint:'首发到当前的变化',source:'首发与当前正式服资料分开，当前队友、装备、环境与实测优先。',research:'建立首发→当前变化表：调整、队友/装备、环境、替代和成本。旧结论重验，未变化的基础介绍压缩。',structure:'当前结论前置，以变化变量为中心，说明哪些旧判断仍成立。',analysis:'每段标版本/配置，不能拼不同时期录像伪装同条件比较。',recording:'只测试会改变当前评价的变量；同条件比较旧/新方案，写控制变量。',visual:'版本对照、同条件实战与队伍关系展示重评依据，不复刻首发百科。',audit:'检查旧资料继承、当前适用性、变化到收益的因果和投入回报。',sound:'变化与新收益处设锚点，基础项不反复强调。',promise:'回答现在为什么重评、哪些账号值得投资。'},
{id:'decision',name:'抽卡／决策',hint:'账号条件、替代与成本',source:'已公开正式机制、实际配置收益、用户真实角色库与资源约束；缺账号信息则分条件。',research:'只研究改变决策的本体、专武/投资、队伍占用、替代、预算与机会成本。未来兼容性只用已公开证据。',structure:'账号条件结论→关键变量→替代与成本，不给所有观众同一个抽取结论。',analysis:'提取配置/场景、操作难度、队友占用与收益，展示伤害不能代替投资判断。',recording:'只做改变选择的同条件配置/替代对比，没有配置不编测试结果。',visual:'账号条件矩阵、投资分层、替代对照与必要真实演示，不堆无关机制动画。',audit:'核对条件、预算、基准、收益和未来推断，不以未知队友逼抽。',sound:'结论和选择清楚，避免连续刺激、夸张中奖感。',promise:'标题明确适用条件，正文兑现投资依据。'},
{id:'rotation',name:'实战／排轴',hint:'动作、资源与窗口',source:'连续正式服录像、配置、输入与起手资源，不能只靠技能文本拼理论轴。',research:'核实启动轴/循环轴/爆发轴和资源回流，区分固定轴/条件轴/资源轴/状态轴，列中断与场景变招。',structure:'结果与配置→逐动作资源/状态→调整和失败分支，减少基础档案。',analysis:'角色→具体技能→状态变化→切谁→下一动作→资源与窗口；保留连续衔接和取消证据。',recording:'写起手、每步输入、切人时机、观察项、成功和失败分支，不要求用户没有的配置。',visual:'真实完整实战、局部慢放、输入/资源轨道与窗口轴为主，不让动画冒充操作。',audit:'检查起手假设、资源收支、顺序、衔接、窗口和可执行性；未经录像验证不写死帧级结论。',sound:'关键切换/窗口少量提示，必要时保留能证明操作的游戏原声。',promise:'说明配置、场景和起手条件，承诺可执行收益。'},
{id:'story',name:'人物志／剧情',hint:'原文、动机与叙事证据',source:'正式剧情、对话、档案、角色故事与官方角色 PV；记章节、说话者、原文、先后与剧透范围，优先叙事资料。',research:'人物事件年表、关系、动机、选择、后果与意象；区分主观看法、叙述事实、作者解读。招式演出不能自动证明世界观，强度不能证明性格。',structure:'围绕人物核心矛盾/关键选择，可按年代或主题推进，用原文支撑解读，避免档案流水账与强悬念。',analysis:'核对说话者、语气、上下文、事件先后、镜头/表情/环境意象与选择，保留引用原文和 Master 时间，解读标分析。',recording:'只补剧情/档案/场景/对话、身份细节与氛围。写章节、剧透、镜头主体、原文和干净画面要求；无需则不录。',visual:'正式剧情切片、PV、原文引用、事件年表、人物关系与意象镜头；不套战斗资源条，不伪造剧情。',audit:'核对身份、年代、事件、关系、说话者、引用语境、剧透和解读边界，不凭台词断言诊断/作者意图。',sound:'围绕情绪弧、停顿、原台词与叙事转折，为原声/引文留空间，避免战斗提示音串。',promise:'兑现人物/剧情认识，明确剧透范围，不虚构角色事实。'},
{id:'creative',name:'创意／整活',hint:'事实骨架、形式与回收',source:'正式角色/世界观事实、已确认形式参考与官方身份图；原设定和创作改编分开。',research:'建立最小准确事实骨架，核对梗来源与语境，虚构仅限明确创作约定，不冒充官方。',structure:'服从铺垫、回收、笑点/情绪弧；正史/纪传体保持真正史书语法和叙事逻辑，不改成现代口播攻略。',analysis:'提取识别点、台词、动作、情绪、可改编段落与梗上下文，不硬解战斗资源或编设定。',recording:'只拍服务笑点/情绪/形式的动作和场景，写构图、身份和用途，不安排完整机制测试。',visual:'表演、视觉回收、物件/场景意象和角色动作，创作不能冒充官方剧情；不默认Pixel/HUD。',audit:'核对事实骨架、身份、改编边界、语境、形式与效果。史书等文体不机械套口播去书面语。',sound:'声音服务铺垫、回收、停顿和情绪，保留有意义静默，不堆无关搞笑音效。',promise:'标题准确表达主题与形式，创作不能冒充官方结论。'}
];
const defs=[
['brief','research','立项与项目约定',['01','01A'],['Work','Chat'],'游戏/区服/版本/想法、观众与限制','PROJECT_BRIEF.md、VIDEO_CONTRACT.md','structure',`调查玩家为什么点、看完解决什么、竞品饱和/缺口、信息增量、最硬内容、转粉理由、风险。记录真实链接/日期/可见指标，不编热度；不能联网则给条件判断。GO/HOLD/SHORT/MERGE/CANCEL；仅热点无增量不推荐长视频。
通过立项才整理 Contract：PROJECT_ID/NAME、GAME/SERVER/VERSION/DATA_CUTOFF、PRODUCT_TYPE/FORMAT/PLATFORMS、CORE_PLAYER_QUESTION/CONTENT_INCREMENT、CORE_THESIS（未确认UNCONFIRMED）、CURRENT_STAGE、VERIFIED_FACTS/REASONED_ANALYSIS/UNKNOWNS/DO_NOT_USE、OFFICIAL_TERMINOLOGY、AVAILABLE_ARTIFACTS、LOCKED_ARTIFACTS、PRODUCTION_NEEDS与NEXT_HANDOFF。各资源需求标REQUIRED/CONDITIONAL/NOT_PLANNED和原因，只是可调整计划。未知字段UNKNOWN，不提前写正文或宣告LOCK。若工作台上下文已有PROJECT_ID，VIDEO_CONTRACT必须直接沿用该ID，不再要求用户命名，也不要自行另造第二套ID。`,[['立项判断','只完成需求、竞品、信息增量与立项结论，交PROJECT_BRIEF.md，不先写正文。'],['项目约定','沿用真实立项结果，交VIDEO_CONTRACT.md。未通过时只记录当前状态与等待项，不默认GO。']]],
['discovery','research','社区需求与官方资料',['02','03'],['Work','Chat'],'游戏/版本/区服、主题、已有来源（可选）','COMMUNITY_QUESTIONS.md、SOURCE_VERIFICATION.md、SOURCE_DOWNLOAD_MANIFEST.md','source',`调查B站/NGA/贴吧/官方社区/Reddit/YouTube等实际可访问社区，记原帖URL、发布/观察日期、可见指标与语境；热度/价值/争议/误解/搜索/传播分别判断，不编排名。输出Top5、竞品缺口、讲烂内容与研究重点。
按问题找官网图文、原图与YouTube官方原始视频，逐项核对官方身份、频道ID/VIDEO_ID、游戏/角色/区服/版本/内容，排除搬运/同名/旧版。页面地址和可下载源分开。清单给稳定ASSET_ID、主体、用途、取得状态、日期、文件名/类型与权限。官方公开不自动等于许可，社区未授权只作研究。只交研究和源清单，不写稿或下载本地大文件。`,[['社区与竞品','联网核实问题/真实讨论/竞品，交COMMUNITY_QUESTIONS.md；无法联网则用用户给的原帖，不编数据。'],['官方来源','沿用问题池，逐项核验官方视频/图片/图文，交来源验证与下载清单，保持稳定ASSET_ID。']]],
['ingest','research','下载与自适应 Proxy',['03A','03C'],['Codex','Chat'],'已验证下载清单、真实根目录/Master、媒体参数（可探测）','DOWNLOAD_REPORT.md、MEDIA_PROBE.json、PROXY_MAP.md','source',`有本地权限就下载需要的已核实源和字幕，复用现有文件，不覆盖大素材；不绕过登录/DRM，失败逐项报告。云端访问不了Windows路径则给PowerShell，不称已执行。
下载后用真实ffprobe自动探测，依时长、运动、小字/UI及当前真实上传限制反推Proxy参数。Master/Proxy分离，不裁切/变速/换序/删片，保留语音，不无意义升级分辨率/帧率。先压码率，再尺寸，再帧率；不固定套720p/CRF。450MB仅历史工作目标，当前限制必须核实。目标总码率≈目标字节×8/时长，扣音频/容器余量，必要两遍编码；语音AAC96–128kbps可作起点。
关键细节不清时分段，每段原速并记绝对起点，MASTER_TS=PART_MASTER_START+PART_LOCAL_TS。验证实际大小、时长、尺寸、帧率、音轨和原点，明显时长不一致失败。PROXY_MAP记ASSET_ID、Master/Proxy路径、时长、参数、分段偏移与真实验证状态。不分析内容。`,[['下载与探测','交可本地运行的PowerShell下载+ffprobe脚本与MEDIA_PROBE.json输出；根目录用显式参数。无参数时停此步等用户结果。'],['转码方案','按回传真实探测计算参数，交批量FFmpeg脚本、命名、分段映射和验证命令，不猜参数。'],['回读验证','按用户返回的真实探测与日志完成PROXY_MAP；未回传的文件标UNVERIFIED。']]],
['recording','research','必要研究录屏',['03B'],['Chat'],'研究问题、证据、可操作环境与配置','RESEARCH_RECORDING_PLAN.md','recording',`逐项写要证明什么、界面/章节/关卡、主体与可用配置、起手/上下文、具体操作、观察项、成功标准、是否重复、ASSET_ID和文件名。不写“随便打一局”。充分则NO_ADDITIONAL_RECORDING_REQUIRED。录屏为Master，后续确需分析再转Proxy。当前只交计划，不假装操作游戏。`],
['analysis','research','视听解析与证据结论',['04','05'],['Work','Chat'],'实际可读Proxy/原文/截图、来源验证与Master映射、研究问题','SOURCE_ANALYSIS_<ASSET_ID>.md、SOURCE_ANALYSIS_INDEX.md、RESEARCH_CONCLUSIONS.md','analysis',`先核对ASSET_ID、文件、VIDEO_ID、官方身份、游戏/版本/区服。错源SOURCE_MISMATCH并停其推论。实际听音频/看画面/上下文，不只读字幕。看不清NEED_MASTER_RECHECK；工具看不了视频则只分析给出的原文/截图/真实标记，不宣告看过全片。
每源MD记文件/来源/时长/映射/权限、摘要、EVIDENCE_TIMELINE、EDIT_ANCHORS、HIGH_VALUE_SOURCE_RANGES和限制。证据行给Master START/END、实际声音/原文、画面事件、关键前后变化、证据等级与SUPPORTED_CONCLUSION；叙事资料用说话者/事件上下文替代战斗字段。时间来自真实媒体，分段换算Master。锚点给职责PROOF/EXPLAIN/SHOW、适合旁白与限制。
汇总索引及已确认事实/公开分析/未知、因果或叙事链、操作/决策结果（相关时）、矛盾与缺口，不写完整稿。只提供文本时不要捏造剪辑时间。`,[['逐源解析（可重复）','每轮少量真实素材，交每源MD，稳定ASSET_ID/Master原点；不能看视频时取得关键片段/高清截图/原文及真实时间，不假装画面验证。'],['证据索引','仅汇总已完成分析MD，不重扫大视频，交SOURCE_ANALYSIS_INDEX.md、矛盾与缺口。'],['研究结论','依据真实分析与正式资料形成RESEARCH_CONCLUSIONS.md，按本题材建立因果/叙事链，不写正文。']]],
['outline','script','核心命题与结构',['06'],['Chat'],'问题池、研究结论、形式/时长','CONTENT_OUTLINE.md、CONTRACT_PATCH','structure',`给CORE_THESIS、信息增量、必讲/可删项、15–30秒开场、标题方向、封面信息、推荐时长、章节/内容结构和证据/视觉重点。每章服务命题，正确但无关就删。用户未确认标PROPOSED，不宣告STRUCTURE_LOCK，不写正文。附Contract状态/命题/下一任务补丁，真实写入回读才称同步。`],
['script','script','完整文案',['07'],['Chat'],'已确认命题/结构、事实证据与官方术语','SCRIPT_DRAFT.md','structure',`不改变已确认命题/事实。写完整连续稿，直接判断+证据+因果+结果，每段有新认识，重要答案前置。开头15–30秒入问题；句长变化与自然停顿；创意文体服从已确认形式，不硬套现代口播。
默认避“不是A而是B”“你以为A其实B”“反而才是”“接下来我们来看”“值得注意的是”“一句话总结”、假互动、机械排比、换词重复总结。真实逻辑需要才偶尔自然用，不加口癖/乱梗。使用官方简中术语与排轴/循环轴/启动轴/爆发轴/资源循环，不用“怎么转/转起来”含混说法。缺关键事实NEED_INPUT，不补造。观众稿不夹LOCK/TODO/日志，不附写作分析。此轮仅草稿，内部自检不能替代真实三项审核。`],
['audit','script','三项审核与差异修订',['08','08B','09'],['Work','Chat'],'同一当前完整稿、命题/证据/术语、修改边界','SCRIPT_REVIEW.md、SCRIPT_REVISED.md','audit',`分别执行①事实/术语/证据边界②价值/逻辑/命题兑现/定位③去AI味/留存/作品形式，每项单独状态、位置、P0/P1、依据和最小改法。未核事实P1不能PASS；价值P0/P1未修不能PASS；NEEDS_MINOR_FIX不等于PASS。
按本轮授权DIFF MODE修必要问题，保留通过段落、结构与指定名句；需打开LOCK/改变命题标NEED_INPUT。对修订后同一版本核查受影响事实并完成三个最终复核，报告稿件版本与未解决项。三项真实PASS、无未解决证据问题且符合当前命题时具备SCRIPT_LOCK条件；本轮明确要求锁稿可登记，否则READY_FOR_SCRIPT_LOCK。不能知道编号就假装他Chat审核完成。`,[['事实审核','只做①事实/术语/版本/引用/机制/证据，给P0/P1、依据、替换与PASS/NEEDS_FIX，不写全文。'],['价值与表达审核','对同一当前稿分别做②内容逻辑与③表达留存/作品形式，独立状态，不宣告锁稿。'],['修订与最终复核','汇总真实意见按差异修稿；再对同一最终版本三维复核，交稿与SCRIPT_REVIEW。未知仍NEEDS_FIX；三项PASS后READY_FOR_SCRIPT_LOCK，本轮明确要求锁稿才登记。']]],
['read','timeline','朗读与录音准备',['10'],['Chat'],'用户已确认SCRIPT_LOCK正文；朗读方式由工作台选择（真人 / 剪映AI朗读）','真人：SCRIPT_READ.md；AI：TTS_TEMP.srt、TTS_PRONUNCIATION_MAP.md、TTS_README.md',null,`始终以当前Chat已经确认的SCRIPT_LOCK正文为内容真值；同一Chat已有锁稿就直接复用，不要求再次粘贴。未锁稿才NEED_INPUT，不拿草稿冒充。\n【真人录音】输出连续朗读稿与自然语义拆分稿；不改正文、不打断名字/句意，保留合理标点；专名读音提示放正文外，不生成伪时间戳。多人配音时给独立台词、分配和重组顺序。\n【剪映AI朗读】生成仅供TTS导入的临时字幕，不作为最终公开字幕：\n1. 建立TTS_PRONUNCIATION_MAP.md：逐项记录原文→TTS安全写法→目标读音→原因。处理多音字、生僻字、游戏专名、外文缩写、数字/百分比/版本号、0+1等符号表达；优先用不改变目标发音的中文同音/拆写、数字口语化和标点停顿。不得改事实、语义、信息顺序或专名身份。\n2. 生成TTS_TEMP.srt：每个cue可见字符绝不超过500，目标430–490字；以自然语义边界为先，不为凑字数填充、重复，也不拆开角色名、术语或紧密因果。短尾段可更短。\n3. TTS_TEMP.srt文本允许为发音安全版，因此可与正式字幕字形不同；它只用于让剪映AI正确朗读，绝不能覆盖SCRIPT_LOCK。\n4. 因尚未有最终语音，SRT时间码只能是合法、连续、不重叠的TTS导入占位时码；明确标记TTS_PLACEHOLDER_TIMING，不能称为真实旁白时间线，也不能直接当FINAL.srt / TIMELINE_MASTER。若当前Chat已有用户验证过的剪映临时SRT时码规则则沿用。\n5. TTS_README.md写明：导入剪映→生成AI朗读→导出连续最终音频AUDIO_MASTER→再用真实音频与原SCRIPT_LOCK生成FINAL.srt/TIMELINE_MASTER。\n最终公开字幕仍使用SCRIPT_LOCK原文；AI朗读后的真实AUDIO_MASTER决定最终时间。`],
['align','timeline','精确字幕与主时间线',['11'],['Work','Codex','Chat'],'最终真实录音AUDIO_MASTER与SCRIPT_LOCK正文；AI朗读时附TTS_PRONUNCIATION_MAP.md（如有）','FINAL.srt、TIMELINE_MASTER.md',null,`WHEN=真实录音，WHAT=锁定文本。AI朗读模式下，TTS_TEMP.srt只是生成语音的临时输入，不能当最终字幕或时间真值；TTS_PRONUNCIATION_MAP中已登记的同音替写、数字口语化等预期差异不算擅改稿。FINAL.srt显示SCRIPT_LOCK原文，时间仍完全取真实AUDIO_MASTER。缺一NEED_INPUT。实际ASR/语音对齐→真实时间→锁文对应→纠术语→自然意群cue，ASR错字不覆盖正式文本。录音/稿件实质差异列位置等用户判断，不隐瞒。禁止字数/平均语速/均分推时间。
检查顺序、意群、漏句/重句、覆盖、持续时间。TIMELINE_MASTER每Segment记ID、START/END、LOCKED_TEXT、SPEAKER、CHAPTER、SEMANTIC_PURPOSE、KEY_TERMS、IMPORTANT_BEAT、PAUSE_AFTER、NOTES，适合加ANCHOR_CANDIDATE/REASON；不提前决定镜头/SFX，可附CSV。音频=字幕=Timeline=后续输出同00:00，不能重定义原点。实际完成核对后登记TIMELINE_LOCK，不能只有标签。`,[['真实语音对齐','确有音频能力直接对齐；否则给真实本地/剪映识别与SRT导出步骤，取得实际时间结果。无工具明确未完成，不猜时间，不默认付费服务或未授权上传。'],['纠文与语义轴','用最终音频、锁稿和真实对齐结果纠术语，保留原点/真实时间。实质差异报告，交FINAL.srt和TIMELINE_MASTER；无法回听明确验证限制，不宣告完整复核。']]],
['visualplan','assets','画面总纲与素材缺口',['12','13','14'],['Chat','Work'],'最终SRT/时间线、旁白、现有素材索引/描述','VISUAL_DIRECTION.md、EDIT_ASSET_REQUIREMENTS.md、FINAL_RECORDING_PLAN.md（按需）','visual',`围绕统一旁白时间逐段写需要看什么、PROOF/EXPLAIN/SHOW/BREATH、语言、真实证据、已有Master/Source Range、动态需求、缺口与音画锚点。无真实时间不猜Source In/Out。Pixel可选，题材可用HUD/几何/关系/意象等；理解→证据→节奏→美感。
复用已验证素材，不重拍重下。缺口给必要性、已有替代和最小补齐。确需补拍才写最终段落、主体/界面、起手/上下文、具体操作、可见信息、成功标准、ASSET_ID/文件名、备份与权限；无需求NO_FINAL_RECORDING_REQUIRED。新增视频以后只补其获取/Proxy/映射/解析MD，不全部重跑。此轮不下载/转码/制作/最终Shot判断。`,[['逐段画面方向','用真实SRT/时间线与MD交VISUAL_DIRECTION.md，职责和锚点明确，不渲染。'],['缺口与补拍','核对现有索引，交需求/缺口；仅必要时生成FINAL_RECORDING_PLAN.md。']]],
['visualpack','assets','动态视觉素材制作',['15'],['Codex','Chat'],'明确视觉设计、最终时间线、核实事实与官方身份参考','ANIMATION_CLIPS/、PACKAGE_INDEX.md、PREVIEW.mp4、可复现脚本','visual',`按已明确设计制作，Codex不能临时导演；关键设计缺失先交待确认规格。OUTPUT_MODE=ANIMATION_ASSET_PACKAGE；STATIC_ONLY_DELIVERY=FORBIDDEN。主要交可播放短片或序列帧+脚本/时间参数，静态组件只是组成部分。默认16:9/1080p/30fps或项目规格，按真实旁白区间，考虑字幕安全区；默认CUT/CUTAWAY，仅蓝图明确才OVERLAY。
具体人物须当前可读官方身份参考，保持发型/服装/武器/饰品/颜色；无参考用抽象职能，不乱补人物。Pixel整数放大/最近邻，其他风格不套滤镜。动作、状态与空间关系必须解释含义，灵动、有前中后层次和细节，克制配色，不做几个文字框/纯线框/静态PPT。生成视觉只解释，不伪造实机UI、数值或剧情。
PACKAGE_INDEX逐资产记ID、真实路径/basename、时长、主时间区间与本地映射、内容/动作时间、锚点、职责、使用方式、规格/限制/权限。验证实际可播放和时长，交预览；无渲染工具交完整代码/依赖/命令/组件，标RENDER_PENDING，不能只给概念图。`,[['动画规格','逐段确定构图/动作/组件/本地时间/主时间映射/输出参数，不把概念图当成品。'],['代码与组件','按规格分批交完整可运行脚本、真实参考组件、依赖与本地渲染命令；无渲染工具RENDER_PENDING。'],['回读与索引','按实际文件探测/预览核对身份、动作、时长、锚点与可播放，交PACKAGE_INDEX；没结果不标FILE_EXISTS=YES。']]],
['sound','assets','声音设计与资产制作',['16','16A'],['Codex','Chat'],'最终时间线/旁白、视觉锚点/参考；Codex需明确声音方案','SOUND_DIRECTION.md、SOUND_CUE_MAP.md、BGM/SFX文件、SOUND_PACKAGE_INDEX.md','sound',`Work可设计→生产连续完成；Codex只按明确声音方案执行，缺方案先交待确认规格。逐段定BGM情绪/音乐结构、留白、提示、Cue、Gain/Fade/Ducking和音画锚点，口播始终清楚。
BGM有音乐性、可循环，不做持续嗡鸣/满高频；SFX短准且有联想，只产必要资产。使用合法素材/专业工具/可运行MIDI或脚本，不冒充已授权音乐，不克隆未授权声音；无法高质量生产MANUAL_REQUIRED，不用噪声充数。
原始资产稳定ASSET_ID/CUE_ID，48kHz WAV优先、不含口播、有headroom，不提前混最终总轨。索引给实际文件/TYPE/时长/采样/声道、描述、Loop In/Out、适用区间、Gain/Fade、叠加限制、Cue与许可/生成方式。真实存在并验证FILE_EXISTS=YES，否则PLANNED；MUST_USE未齐MISSING_AUDIO_ASSET，不留执行器临时找音乐。`,[['声音方向与Cue','交声音结构、真实时间、留白、提示、Gain/Fade/Ducking与声画锚点。'],['资产生产','按Cue给专业工具精确提示词/参数、合法获取或完整本地MIDI/音频脚本。能生成则实际生产；无工具标PLANNED/MANUAL_REQUIRED。'],['试听与索引','据实际音频/探测验音乐性、Loop、48kHz、无口播、headroom/时长/许可，交索引；缺文件保留MISSING_AUDIO_ASSET。']]],
['cover','assets','三比例正式封面',['17'],['Chat'],'最终命题/正文、卖点、当前可读官方身份参考','4:3/3:4/16:9三成图、COVER_PACKAGE_INDEX.md','promise',`明确可兑现的一条点击信息，主大字3–5候选，短辅助文案按需，标题与封面互补。角色真实官方身份锁，不改脸/发型/服装/武器，主体不做像素小人；背景可轻像素/HUD，避免霓虹粒子堆砌。
实际生成4:3、3:4、16:9三种独立构图，分别适配人物/文字/焦点/留白，不机械裁切。投稿时核实平台尺寸，必要COVER_VARIANT_REQUIRED。成图检查身份、文字、比例、缩略图可读。
索引写COVER_MESSAGE、CORE_THESIS、SELECTED/ALT_COVER_TEXT、TITLE_COMPLEMENT_RULE、每比例实际文件名/构图、Identity Source、特版保持点与权限。无图像工具只交方案并标IMAGE_GENERATION_REQUIRED，不能称已生成。`,[['卖点与三构图','确定可兑现文案/点击逻辑、官方身份锁、三种独立构图，不改正文结论。'],['成图与索引','使用有图像能力Chat实际生成并验三张，交索引；无工具IMAGE_GENERATION_REQUIRED。']]],
['organise','blueprint','本地素材整理与索引',['18A'],['Codex','Chat'],'真实根目录/tree /f、描述MD与LOCK文件','ASSET_INDEX.md、PATH_MAP.md、脚本/日志',null,`检查现有结构，复用目录、不建空目录、不重复大视频、不删除源、不改变LOCK内容。未知根目录用显式参数/相对方案，不猜C盘。Master/Proxy、自录/官方/生成、音频/字幕/时间线分清；二进制与MD一起移动或同步改路径，保持ASSET_ID、basename、时间映射/权限。冲突不覆盖、未识别留原位。
交可检查路径映射及DryRun；具备权限且用户要求执行则按安全映射实际整理回读，否则给PowerShell。脚本支持预览、执行日志、反向映射。真实索引列ID、路径、类型、时长、描述MD、区间、权限与缺项，不推到Git。`,[['计划与脚本','据真实树/根目录给路径映射和DryRun/Execute PowerShell，不覆盖删除，同步描述路径。'],['回读与索引','用户运行后返回tree/日志，核对映射/冲突/描述，完成索引；没执行不称已整理。']]],
['blueprint','blueprint','精细剪辑与声音蓝图',['18B'],['Chat'],'最终SRT/时间线、tree/索引/各素材MD、画面方案/Cue与实际声音','EDITING_BLUEPRINT.md、SHOTS.csv/AUDIO_CUES.csv（按需）','visual',`优先MD与索引，文字不足才要局部Proxy/截图，不重扫大文件。逐Shot给SHOT_ID、Timeline In/Out、旁白/职责、实际素材路径、Source In/Out、速度、构图/裁切、动作/转场、视觉锚点、安全区、缺口处理。Source无依据NEED_INPUT不猜时间。
逐Cue给ID、实际文件、Source In/Out、放置时间、Loop、Gain/Fade/Ducking与锚点。MUST_USE声音真实存在，EDIT_USE_ALLOWED!=YES默认禁入成片。缺口标BLOCKED和最小替代，不擅自把黑屏/占位当完成。
EDITOR_AUTONOMY=EXECUTION_ONLY，导演/选片/音乐决定都在蓝图。默认1080p/30fps/H.264，FINAL_VIDEO_SILENT.mp4无音轨无字幕；FINAL_BGM_SFX.wav48kHz只含背景声，与旁白同00:00/主时长。此轮只设计，不渲染、不改锁定稿/录音/字幕。`],
['render','assembly','严格执行蓝图／双输出',['19'],['Codex','Chat'],'可执行蓝图、明确引用的真实文件、AUDIO_MASTER主时长/原点','FINAL_VIDEO_SILENT.mp4、FINAL_BGM_SFX.wav、BUILD_REPORT.md',null,`先逐Shot/Cue检查真实路径/权限/范围/时长/参数。只读蓝图与明确素材执行，不重新研究/写稿/导演/找素材/加特效。用高清Master，不用Proxy偷换；不动LOCK、旁白/时间原点。
按蓝图FFmpeg/动画脚本渲染静音视频1920×1080/30fps/H.264、无音轨无烧录字幕（允许蓝图说明标签）；背景WAV48kHz仅BGM/SFX，按Gain/Fade/Loop/Ducking/Cue，不混口播。两项与旁白同00:00与主时长，不能拉伸旁白。
缺失报告确切Shot/Cue与项，先完成能确定检查，不宣告成片完成。验证文件/轨道/时长/首尾/关键锚点，不强制全片AI重分析。BUILD_REPORT记实际命令/输出/探测/失败与未执行项。无工具/权限交完整脚本/命令标EXECUTION_PENDING，不以计划冒充视频。`,[['蓝图预检','据蓝图检查输入；云端看不了本地文件则给PowerShell/ffprobe预检等真实结果，不编存在性。'],['完整执行脚本','按已通过预检的真实Shot/Cue给完整代码、依赖、路径参数、日志/验证，长脚本分批后合一入口，不留导演判断。'],['回读渲染','用户运行回传探测/日志/关键预览，验静音无音轨无字幕、背景48kHz无口播、同原点/时长，完成报告；无结果EXECUTION_PENDING。']]],
['assemble','assembly','剪映四件套组装',['19A'],['Chat'],'静音视频、背景WAV、AUDIO_MASTER、FINAL.srt','ASSEMBLY_CHECKLIST.md；最终目标文件 FINAL_MASTER.mp4 由用户在剪映实际导出',null,`给最短操作清单：四件套分别导入从00:00对齐；旁白不变速/变长，字幕不平均重定时。用户调整字幕样式/安全区和背景总音量，人耳核口播清晰、锚点/首尾后导出。镜头错回蓝图/画面，背景响调背景轨，术语错核锁文，时间错回真实对齐。只交清单，不假装替用户导出。`],
['qc','assembly','可选：成片定点检查',['20'],['Work','Chat'],'实际成片/指定区间、SRT与蓝图','FINAL_QC_REPORT.md','audit',`全片重分析非默认必经。按本轮指定范围与真实可读媒体检查，说明覆盖；核事实/素材对应、锚点、字幕、旁白、轨道/时长和内部痕迹。给真实问题时间、现象、依据和最低改法；不能看/听则UNVERIFIED，不判PASS，不自动重剪或改LOCK。`,[['定点检查','只检查指定问题/区间，基于真实媒体给时间/依据/修法，能力不足项目UNVERIFIED。']]],
['publish','publish','六平台发布包',['21'],['Work','Chat'],'最终命题/SRT/真实时间线、封面索引、成片规格及署名许可','PLATFORM_RULES_CHECK.md、六平台发布文案.md','promise',`先实时联网核实六平台官方帮助/规范或可访问投稿页：真实字段/必填、标题/简介限制、标签、封面/安全区、视频格式/时长/大小、字幕/SRT、分区/合集、可见性/时间、原创/转载、商业/AI合成声明、受众/年龄、章节/互动与版权。逐规则给URL/核验日期和官方确认/投稿页确认/可靠文档/无法确认；UI与文档差异按实时UI，不把经验当上限，查不到标投稿时按实时UI确认。无权限不要求登录。
B站/抖音/小红书/视频号简中，YouTube/TikTok繁中。每平台≥5标题或Caption与短点击逻辑，不打分；读封面COVER_MESSAGE/SELECTED_COVER_TEXT/TITLE_COMPLEMENT_RULE互补并兑现正文。
每平台字段名｜必填/选填｜限制/依据｜本期填值，含文件、标题、简介/正文、封面、标签、分区/合集、字幕语言、可见性/时间、互动、原创/商业/AI/受众等实际字段，未确认存在不装必填。给完整可复制文案、标签、封面方案/特版需求、置顶与设置。
B站/YouTube据真实SRT/Timeline给3–9章节首章00:00，不均分，核YouTube当前识别要求；短内容不适合则说明，不凑章。B站2–4投票给真实时间、问题/2–4选项、原因/剧透；不适合或不支持如实说明。
各平台核标题承诺、虚假官方/无关热词/诱导、素材权限/署名、商业/AI披露与外链规则，给最低成本修法。缺成片不猜画面/时长，文字时间够可先完成文案。只交发布包，不上传发布或强加成片QC。`,[['投稿规则','只核当前官方/可访问投稿页，交规则MD，未知标实时UI确认，不编上限。'],['B站与YouTube','按规则/正式内容给完整字段/≥5标题/简介/标签/封面/真实章与B站投票，YouTube繁中。'],['其余四平台与全包核对','给抖音/小红书/视频号简中、TikTok繁中字段/≥5标题或Caption/正文，合并六平台，核一致性/署名/披露/兑现。']]],
['retrospective','publish','真实数据复盘',['22'],['Chat','Work'],'真实链接/标题/发布时间、曝光/CTR/留存/互动/涨粉','PERFORMANCE_REVIEW.md、新增问题池/候选经验','promise',`仅真实可得指标，没后台权限用截图/导出，不声称取得后台。区分曝光/CTR、前30秒/中段、平均观看/完播、收藏/分享/转粉、搜索/推荐和新问题；缺指标MISSING不填零。输出WHAT_WORKED/FAILED/WHY/NEXT_ACTION、证据/限制、新问题、可复用经验/候选规则。小样本/相关性/可测试推断分开，不只看播放量，不自动写库。`,[['真实指标','只整理实际数据/经授权报表和缺项，不编后台。'],['复盘动作','用真实指标解释具体掉点/点击/转粉，给下一次可测试改法和候选经验。']]],
['compiler','utility','自定义需求转 Prompt',['23'],['Chat'],'自然语言需求、真实文件、修改边界','独立可执行Prompt',null,`只编译当前需求：目标/输入/事实来源/LOCK/可改/保持/自主权限/禁项/输出/验收/NEXT_HANDOFF。可读Contract才继承，早期NOT_PLANNED不禁止当前任务。检查跨阶段、改LOCK、旧版本、导演权、权限、内部痕迹、无用文件和重复读大素材。能引正式MD不复制整库，只交Prompt，不执行。`]
];
const tasks=defs.map(([id,stage,name,old,modes,inputs,outputs,lens,body,fallback])=>({id,stage,name,old,modes,inputs,outputs,lens,body,fallback,optional:id==='qc'}));
// Preserve source contracts that matter to the existing local production handoff.
for(const t of tasks){t.body=t.body.replaceAll('EDITING_BLUEPRINT.md','CODEX_EDIT_BLUEPRINT.md').replaceAll('PATH_MAP.md','PATH_REMAP.md');t.outputs=t.outputs.replaceAll('EDITING_BLUEPRINT.md','CODEX_EDIT_BLUEPRINT.md').replaceAll('PATH_MAP.md','PATH_REMAP.md');}
taskExtra('discovery', '图片与图文也要主动获取，不只找视频。额外交 IMAGE_REQUIREMENTS.md，记官方原图实际尺寸/语言和取得状态；缺干净图但有核实官方文本时标 TO_RENDER_TEXT_VISUAL，准备明确的非官方说明图规格，不默认让用户自行截图。视频记准确标题/语言/字幕轨/真实时长，静态图不必转 Proxy。');
taskExtra('ingest', '图片下载核对 Content-Type、magic bytes 与可读尺寸，不能把登录HTML存成.png；图文保留核实原文和来源。仅正式文字时可按清单渲染 GENERATED_EXPLANATION 图，不冒充官方原图。脚本正确处理中文/空格/特殊字符，尽量幂等，单项失败继续其他项。');
taskExtra('sound', 'SOUND_CUE_MAP逐行包含 TIMELINE_IN/OUT、VOICE_ANCHOR、VISUAL_ANCHOR、TYPE、音色/动作、设计原因、强度、Fade/Ducking及是否精确对齐；无声也是Cue。必要音乐情绪变化与角色气质写入方向，不把音乐做成持续环境噪声。');
taskExtra('blueprint', '最新 ASSET_INDEX.md / PATH_REMAP.md 决定当前路径，描述MD的旧路径不能覆盖它。蓝图按 GLOBAL_RULES / VISUAL_TRACK / AUDIO_DESIGN_TRACK / OUTPUT_SPECS / MISSING_ASSET / MISSING_AUDIO_ASSET / RIGHTS_REVIEW_REQUIRED 组织；Shot加SHOT_TYPE、EDIT_ACTION、QC_CHECK，音频加PAN、PURPOSE、QC_CHECK。保留实际静音段，不把声音前移。背景预混默认约-24 LUFS Integrated、True Peak≤-6 dBTP、足够Headroom，不做响度最大化；蓝图具体Gain/Ducking优先。');
taskExtra('render', '视频 yuv420p、CRF18–20或等效高质量、合理preset、Fast Start、正确比例不拉伸；背景WAV Stereo/优先PCM24-bit，默认约-24 LUFS Integrated/True Peak≤-6 dBTP，具体蓝图优先，不响度最大化。无声区保留静音。主素材缺失仅用蓝图已明确fallback，没有则报告，不临时替换。');
function taskExtra(id,extra){const t=tasks.find(x=>x.id===id);t.body+='\n'+extra;}
const PART_IO={
brief:[
 {inputs:'游戏 / 区服 / 版本 / 视频想法；同一Chat已有热点、观众问题与限制直接沿用',outputs:'PROJECT_BRIEF.md（立项结论、信息增量、风险、建议形式）'},
 {inputs:'刚完成的PROJECT_BRIEF.md或同一Chat中的真实立项结论；工作台自动PROJECT_ID',outputs:'VIDEO_CONTRACT.md（沿用自动PROJECT_ID；未通过立项则只记录状态与等待项）'}
],
discovery:[
 {inputs:'游戏 / 版本 / 区服 / 当前主题；同一Chat已有玩家问题直接沿用',outputs:'COMMUNITY_QUESTIONS.md（真实需求、争议、竞品缺口）'},
 {inputs:'COMMUNITY_QUESTIONS.md / 当前核心问题；已有官方线索可沿用',outputs:'SOURCE_VERIFICATION.md、SOURCE_DOWNLOAD_MANIFEST.md、IMAGE_REQUIREMENTS.md'}
],
ingest:[
 {inputs:'已验证下载清单 + Windows项目根目录；同一Chat已有Master清单直接沿用',outputs:'下载/探测脚本 + DOWNLOAD_REPORT.md草案；只有实际执行后才产生真实MEDIA_PROBE / ffprobe结果'},
 {inputs:'沿用本Chat刚取得的真实MEDIA_PROBE / Master参数；当前上传限制需核实',outputs:'逐Master Proxy配置、PowerShell/FFmpeg命令、PROXY_MAP.md草案（尚未执行项标PENDING）'},
 {inputs:'本地实际执行后的日志 / 文件清单 / ffprobe与大小结果；同一Chat直接沿用',outputs:'已验证PROXY_MAP.md；未验证项保留UNVERIFIED，并给失败项最小修复命令'}
],
analysis:[
 {inputs:'一个或一组实际可读Proxy / 截图 / 原文 + Master映射 + 研究问题',outputs:'SOURCE_ANALYSIS_<ASSET_ID>.md；可对多个来源重复本子步骤'},
 {inputs:'沿用本Chat刚完成的SOURCE_ANALYSIS_*.md；无需重新上传同一批Proxy',outputs:'SOURCE_ANALYSIS_INDEX.md（只索引真实已分析来源）'},
 {inputs:'沿用本Chat的SOURCE_ANALYSIS_INDEX / 关键分析结论 + 当前核心研究问题',outputs:'RESEARCH_CONCLUSIONS.md（结论、因果链、未知与证据缺口；不重复扫描大视频）'}
],
audit:[
 {inputs:'当前完整稿 + 对应证据 / 术语真值',outputs:'SCRIPT_REVIEW_FACT.md（事实/机制/术语审核）'},
 {inputs:'同一当前稿 + CORE THESIS + 玩家问题 / 作品形式',outputs:'SCRIPT_REVIEW_VALUE_STYLE.md（价值/逻辑 + 去AI味/留存）'},
 {inputs:'沿用本Chat前两项审核结果 + 同一当前稿 + 修改边界',outputs:'SCRIPT_REVISED.md、合并SCRIPT_REVIEW.md、最终复核状态；三项未真PASS则不宣告LOCK'}
],
align:[
 {inputs:'真实AUDIO_MASTER + SCRIPT_LOCK正文；有TTS发音映射则一起提供',outputs:'真实语音对齐结果 / 初始SRT时间；无音频工具则给取得真实对齐结果的方法'},
 {inputs:'沿用本Chat真实对齐结果 + SCRIPT_LOCK正文 + 可回听AUDIO_MASTER',outputs:'FINAL.srt、TIMELINE_MASTER.md（真实音频时间；不沿用TTS占位时码）'}
],
visualplan:[
 {inputs:'FINAL.srt + TIMELINE_MASTER.md + 旁白 + 已有素材描述',outputs:'VISUAL_DIRECTION.md'},
 {inputs:'沿用本Chat刚完成的VISUAL_DIRECTION.md + 当前ASSET_INDEX / 素材描述',outputs:'EDIT_ASSET_REQUIREMENTS.md；只有确需用户补拍时才输出FINAL_RECORDING_PLAN.md'}
],
visualpack:[
 {inputs:'VISUAL_DIRECTION / 明确视觉需求 + FINAL.srt / Timeline + 事实与身份参考',outputs:'ANIMATION_SPEC.md（逐片段构图、动作、时间、组件、规格）'},
 {inputs:'沿用本Chat ANIMATION_SPEC.md + 官方参考；如需实际渲染则必须有可执行本地环境',outputs:'完整动画代码 / 组件 / 渲染命令；具备执行权限时才交实际ANIMATION_CLIPS/'},
 {inputs:'实际渲染后的文件 / 探测 / 预览；没有真实结果则不能跳到本步验收',outputs:'PACKAGE_INDEX.md、已真实生成的PREVIEW.mp4（如有）、缺陷与修复项'}
],
sound:[
 {inputs:'FINAL.srt / Timeline + AUDIO_MASTER语义 + 视觉锚点',outputs:'SOUND_DIRECTION.md、SOUND_CUE_MAP.md'},
 {inputs:'沿用本Chat已确认SOUND_DIRECTION / SOUND_CUE_MAP；实际制作需可执行音频环境',outputs:'完整可运行制作脚本；具备执行能力时才交BGM / SFX实际文件'},
 {inputs:'真实生成的音频文件 + 探测 / 试听结果；无文件不能假装试听',outputs:'SOUND_PACKAGE_INDEX.md、缺陷与修复项；不存在文件继续标MISSING_AUDIO_ASSET'}
],
cover:[
 {inputs:'最终命题 / 正文 + 封面卖点 + 可读官方角色参考',outputs:'COVER_DIRECTION.md（三比例构图与文案策略）'},
 {inputs:'沿用本Chat已确认COVER_DIRECTION + 官方身份参考 + 实际图像生成能力',outputs:'4:3 / 3:4 / 16:9正式成图；COVER_PACKAGE_INDEX.md内容在成图前先确定，成图后以实际文件名回填'}
],
organise:[
 {inputs:'真实项目根目录 + 当前tree /f + 描述MD / LOCK文件',outputs:'整理方案、Dry Run PowerShell / Codex指令、目标目录结构'},
 {inputs:'本地实际执行后的最新tree /f与日志；仅Dry Run时只做预检查',outputs:'正式执行后生成ASSET_INDEX.md、PATH_REMAP.md；仅Dry Run时输出待执行映射与冲突报告'}
],
render:[
 {inputs:'CODEX_EDIT_BLUEPRINT.md + 最新ASSET_INDEX / PATH_REMAP + 被引用真实文件',outputs:'蓝图预检报告：路径、时长、权限、缺失资产、可执行性'},
 {inputs:'沿用本Chat已通过的蓝图预检结果 + 真实素材路径',outputs:'完整可执行渲染 / 合成脚本；Codex有本地权限时直接执行，不再把脚本丢回用户手动跑'},
 {inputs:'真实渲染产物 + ffprobe / loudness等验证结果；Codex刚执行完成则直接沿用',outputs:'验证通过的FINAL_VIDEO_SILENT.mp4、FINAL_BGM_SFX.wav、BUILD_REPORT.md；失败则不给假成品'}
],
qc:[
 {inputs:'实际成片或指定区间 + SRT / 蓝图 + 具体检查目标',outputs:'FINAL_QC_REPORT.md（仅本次定点问题）'}
],
publish:[
 {inputs:'最终平台清单 + 当前联网能力',outputs:'PLATFORM_RULES_CHECK.md（六平台当前真实字段 / 限制 / 披露）'},
 {inputs:'PLATFORM_RULES_CHECK.md + 最终命题 / SRT / Timeline + COVER_PACKAGE_INDEX',outputs:'Bilibili + YouTube完整发布包'},
 {inputs:'沿用本Chat前两步结果 + 最终命题 / SRT / 封面 / 权限信息',outputs:'抖音 / TikTok / 小红书 / 视频号发布包 + 合并六平台最终一致性核对'}
],
retrospective:[
 {inputs:'真实发布链接 / 发布时间 / 标题 + 实际后台截图或导出指标',outputs:'METRICS_SNAPSHOT.md（只整理真实指标与缺项）'},
 {inputs:'沿用本Chat刚整理的METRICS_SNAPSHOT.md + 本期命题 / 发布包',outputs:'PERFORMANCE_REVIEW.md、新问题池、下一期可测试改法'}
]
};
const COMMON=`【单步约定】只完成本条明确工作；合并的子工作属于本轮范围，不自动执行下游。编号仅查找。同一Chat已实际取得的文件/结论直接复用，跨环境只继承真实可读输入；Contract可用则读，缺可选资料先完成能确定部分，缺关键事实/时间/身份才NEED_INPUT。
【真值与LOCK】使用当前游戏/区服官方简中术语；区分官方确认、真实画面/实机、公开分析、未知、未公开资料。不能把传闻/拆包当官方。修订默认DIFF MODE，不改已确认LOCK；最终录音是时间真值，锁文是字幕文字真值，时间锁后同00:00。用户当前要求优先于早期资源计划。
【真实交付】实际工具写入并回读才称已保存/更新；无工具交完整可保存内容/可运行脚本并标待执行，文件存在且验证才FILE_EXISTS=YES。不把制作文件推Git，大素材留本地。只交正式产物、真实完成/缺项与短NEXT_HANDOFF，不展开下游。
【素材】保持ASSET_ID、路径/basename、时长、真实时间、对应旁白、用途/限制与描述MD；记SOURCE_URL/OWNER、RIGHTS_STATUS、EDIT_USE_ALLOWED、ATTRIBUTION_REQUIRED/TEXT、AI_GENERATED_OR_ASSISTED/GENERATOR_TOOL及许可备注。官方公开≠无限制许可，社区未授权只研究。观众产物不夹LOCK/TODO/Prompt/工作日志。`;
function route(id){return ROUTES.find(x=>x.id===id)||ROUTES[0];}
function task(id){return tasks.find(x=>x.id===id)||tasks[0];}
function parts(id,mode){const t=task(id);if(mode==='Chat'&&t.fallback&&t.fallback.length>1){const io=PART_IO[id]||[];return t.fallback.map(([name,body],index)=>({name,body,index,inputs:io[index]?.inputs||t.inputs,outputs:io[index]?.outputs||t.outputs}));}return[{name:t.name,body:'',index:0,inputs:t.inputs,outputs:t.outputs}];}
function build(id,c={},mode='Chat',partIndex=0){
 const t=task(id),r=route(c.route),ps=parts(id,mode),p=ps[partIndex]||ps[0],split=mode==='Chat'&&Boolean(t.fallback)&&t.fallback.length>1;
 const ctxLines=[['PROJECT_ID',c.projectId],['项目',c.title],['游戏',c.game],['区服',c.server],['版本/截止',c.version],['目标时长',c.duration],['本轮补充（可选覆盖）',c.notes]].filter(([,v])=>String(v||'').trim()).map(([k,v])=>`${k}：${String(v).trim()}`);
 const ctx=ctxLines.length?`【项目上下文｜仅列工作台已填写项】\n${ctxLines.join('\n')}\n未填写项直接沿用同一Chat已经确认的上下文；不要为了模板完整逐项追问。\n`:'【项目上下文】直接沿用同一Chat已确认的项目与文件；没有新的补充项，不要要求用户逐项填写。\n';
 const lens=t.lens?`【${r.name}分支】\n${r[t.lens]}\n${['brief','analysis','outline','script','audit'].includes(id)?r.research:''}\n`:'';
 const format=c.format==='short'?'短内容：只解一个问题，减非必要证据/章节/流程，开场按实际时长缩短，不硬扩长攻略。':'长内容：解释深度与章节服务命题，不为完整而拉长。';
 const voice=id==='read'?(c.voiceMode==='ai'?`【朗读方式】剪映AI朗读。必须输出TTS_TEMP.srt与TTS_PRONUNCIATION_MAP.md；临时SRT每cue≤500可见字符、尽量430–490，专为正确发音改写，绝不作为最终字幕/真实时间线。\n`:`【朗读方式】真人录音。输出自然朗读稿，不生成虚构时间戳。\n`):''; const scope=split?`【Chat备用 ${p.index+1}/${ps.length}：${p.name}】\n本条只执行这个子任务；以下总规格仅约束，不授权提前执行其余子任务。同一Chat沿用上轮结果，换Chat需提供已完成产物。\n${p.body}\n`:'';
 const capability=['ingest','organise','render','visualpack','sound'].includes(id)?'检查真实文件/执行工具；Chat无本地执行能力时给脚本与回读步骤，不称已渲染。':id==='align'?'必须真实音频/对齐工具；纯文字不能推精确时间。':id==='analysis'||id==='qc'?'先确认实际看/听能力，不能以字幕冒充画面确认。':id==='cover'?'成图需图像生成/编辑工具，无工具明确待成图。':'使用实际可用工具。';
 return `【任务：${t.name}${split?'／'+p.name:''}】\n【环境】${mode}。${capability}\n\n${ctx}内容类型：${r.name}\n${format}\n${voice}\n${COMMON}\n\n【所需输入】${p.inputs||t.inputs}\n\n${lens}\n${scope}\n【${split?'任务总规格（本轮范围以上述子任务为准）':'执行要求'}】\n${t.body}\n\n【正式输出${split?'：本轮仅交子任务对应产物':''}】${p.outputs||t.outputs}\n【NEXT_HANDOFF】简短说明实际产物、关键缺项、以后需提交的真实文件，不自动执行下一条。`;
}
const api={VERSION,STAGES,ROUTES,tasks,COMMON,route,task,parts,build};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.CreatorPrompts=api;
})(typeof window==='undefined'?globalThis:window);
