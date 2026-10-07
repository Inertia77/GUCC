(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.GuccCreatorCapabilities=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  function cap(id,domain,name,config={}){
    return Object.freeze({
      id,domain,name,
      purpose:config.purpose||"",
      whenToUse:config.whenToUse||[],
      whenNotToUse:config.whenNotToUse||[],
      requiredInput:config.requiredInput||[],
      optionalInput:config.optionalInput||[],
      coreMethod:config.coreMethod||[],
      mandatoryGuardrails:config.mandatoryGuardrails||[],
      failureRefs:config.failureRefs||[],
      bestPractices:config.bestPractices||[],
      knownFailureModes:config.knownFailureModes||[],
      qualityGate:config.qualityGate||[],
      outputSchema:config.outputSchema||[],
      defaultExecutor:config.defaultExecutor||"Chat",
      alternativeExecutor:config.alternativeExecutor||[],
      chatFallback:config.chatFallback||"",
      projectInjection:config.projectInjection||[],
      skipCondition:config.skipCondition||[],
      hardStopCondition:config.hardStopCondition||[],
      qcLevel:config.qcLevel||"Q1",
      reviewMode:config.reviewMode||"REVIEW_OPTIONAL",
      legacyPromptIds:config.legacyPromptIds||[]
    });
  }

  const C=[
    cap("PROJECT_BUILDER","Project","Project Builder",{
      purpose:"把一句自然语言视频想法转成 PROJECT_BRIEF + VIDEO_CONTRACT，并主动补全普通字段。",
      whenToUse:["新项目","重大项目拆分/合并"],
      requiredInput:["自然语言项目想法"],
      optionalInput:["区服/版本/发布时间","已有素材/旧项目","明确禁区"],
      coreMethod:[
        "先判断玩家为什么点、看完解决什么、竞品饱和与信息增量。",
        "给 GO/HOLD/SHORT/MERGE/CANCEL，不因普通字段未知停止。",
        "AI 自动提出人类可读 PROJECT_ID；已有 Contract ID 原样沿用。",
        "VIDEO_CONTRACT 写 VERIFIED_FACTS / REASONED_ANALYSIS / UNKNOWNS / DO_NOT_USE / OFFICIAL_TERMINOLOGY / AVAILABLE_ARTIFACTS / LOCKED_ARTIFACTS / AUTONOMY_LEVEL / NEXT_HANDOFF。",
        "PRODUCTION_NEEDS 只做初步资源计划，不把 NOT_PLANNED 当永久禁止。"
      ],
      mandatoryGuardrails:["默认 AUTONOMY_LEVEL=L2。","未知普通字段写 UNKNOWN，不为填满表格阻塞。"],
      failureRefs:["PM_OPTIONAL_MISSING_NOT_BLOCK","PM_USER_NOW_OVERRIDES_OLD_PLAN","RS_NO_LEAK_AS_OFFICIAL"],
      qualityGate:["立项结论与信息增量明确","Contract 不把推断写成事实","重大方向变化才需要 Q3"],
      outputSchema:["PROJECT_BRIEF.md","VIDEO_CONTRACT.md"],
      defaultExecutor:"Work",
      alternativeExecutor:["Chat"],
      chatFallback:"同一 Chat 分两轮：先立项/研究，再生成 Contract；直接沿用上一轮结果。",
      projectInjection:["GAME","SERVER","VERSION","PRODUCT_TYPE","FORMAT","PLATFORMS","AUTONOMY_LEVEL"],
      qcLevel:"Q2",
      reviewMode:"APPROVAL_REQUIRED",
      legacyPromptIds:["01","01A"]
    }),

    cap("PLAYER_DEMAND_RESEARCH","Research","Player Demand Research",{
      purpose:"找到真实玩家问题、误解、争议、搜索意图与值得点击的入口。",
      whenToUse:["新题材","前瞻/复刻/决策/机制专题","流量方向不确定"],
      whenNotToUse:["纯个人创作且无需玩家需求验证"],
      requiredInput:["游戏/版本/主题"],
      optionalInput:["已有社区链接","频道受众线索"],
      coreMethod:["扫描 B站/NGA/贴吧/米游社/Reddit/YouTube 等实际可访问社区。","记录原帖 URL、日期、可见指标和语境；热度、价值、争议、误解、搜索需求分开判断。","输出 Top 问题、已讲烂内容、竞品空白与本期最值得解决的问题。"],
      failureRefs:["RS_NO_FAKE_HEAT","RS_NO_FAKE_SOURCE","PM_OPTIONAL_MISSING_NOT_BLOCK"],
      qualityGate:["问题可追溯到真实讨论","不以单帖冒充社区共识"],
      outputSchema:["COMMUNITY_QUESTIONS.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      chatFallback:"联网能力有限时基于用户给的真实帖子做小样本研究，明确覆盖范围。",
      projectInjection:["GAME","SERVER","VERSION","PRODUCT_TYPE"],
      qcLevel:"Q1",legacyPromptIds:["02"]
    }),

    cap("COMPETITOR_RESEARCH","Research","Competitor Research",{
      purpose:"判断现有内容饱和度、标题/结构套路与可做信息增量。",
      whenToUse:["立项","热门角色首发","复刻重评","机制专题"],
      requiredInput:["主题/玩家问题"],
      optionalInput:["指定竞品频道"],
      coreMethod:["找当前相关视频/文章并记录发布日期、定位、覆盖范围、可见表现。","区分‘流量大’和‘解决问题更好’；找缺失证据、过时版本、重复内容和表达空位。"],
      failureRefs:["RS_NO_FAKE_HEAT","RS_NO_FAKE_SOURCE"],
      qualityGate:["竞品结论有链接与时间语境","明确本期不重复什么"],
      outputSchema:["COMPETITOR_REVIEW.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      chatFallback:"只分析可实际打开的竞品，不补造播放/互动数据。",
      qcLevel:"Q1",legacyPromptIds:["02","01"]
    }),

    cap("OFFICIAL_SOURCE_RESEARCH","Source","Official Source Research",{
      purpose:"找到并核验官网图文、原图、YouTube 官方视频、字幕与正式公开材料。",
      whenToUse:["需要官方证据/角色参考/官方视频"],
      requiredInput:["游戏/版本/角色/研究问题"],
      coreMethod:[
        "视频优先 YouTube 官方频道原始上传，其次官网/媒体中心，必要时才用 B站官方号。",
        "逐项核对频道主体、CHANNEL_ID、VIDEO_ID、游戏、角色、区服、版本、发布日期、实际内容。",
        "图片优先官网/官方公告/Media Kit 原图；影画/技能等只有官方文字时保存文字真值并允许后续做 GENERATED_EXPLANATION。",
        "输出来源页面 URL 与直接媒体 URL 分离。"
      ],
      failureRefs:["RS_NO_FAKE_SOURCE","SA_SOURCE_IDENTITY_CHECK","RS_VERSION_BOUNDARY"],
      qualityGate:["每个 VERIFIED 来源身份可解释","错误候选有排除原因"],
      outputSchema:["SOURCE_VERIFICATION.md","SOURCE_DOWNLOAD_MANIFEST.md","IMAGE_REQUIREMENTS.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      chatFallback:"逐个少量搜索并核验，宁可 NEED_VERIFY 也不伪造 URL。",
      qcLevel:"Q1",legacyPromptIds:["03"]
    }),

    cap("ACQUIRE_REGISTER_OFFICIAL_SOURCE","Source","Acquire & Register Official Source",{
      purpose:"把已核验视频/图片/字幕/metadata 下载到本地并登记真实媒体参数。",
      whenToUse:["已确认要用/分析官方源","需要 Master 与字幕"],
      requiredInput:["SOURCE_DOWNLOAD_MANIFEST","本地项目根目录"],
      optionalInput:["已有文件","yt-dlp/FFmpeg路径"],
      coreMethod:[
        "一次完成下载、字幕/metadata、ffprobe/图片验证与 Source 注册；复用现有文件，不覆盖 Master。",
        "YouTube 官方视频保留高清 Master；图片验证 Content-Type/magic bytes/尺寸。",
        "记录 ASSET_ID、来源、路径、媒体参数、RIGHTS_STATUS、EDIT_USE_ALLOWED、ATTRIBUTION。"
      ],
      mandatoryGuardrails:["不绕过 DRM/付费墙/登录限制。","云端无本地权限时只交脚本，不能声称下载完成。"],
      failureRefs:["TW_NO_OVERWRITE_MASTER","TW_WRITE_TRUTH","TW_WORK_NOT_LOCAL_FS"],
      qualityGate:["每个 DOWNLOADED_VERIFIED 都有真实文件验证","失败项独立报告"],
      outputSchema:["DOWNLOAD_REPORT.md","MEDIA_PROBE.json","SOURCE_DOWNLOAD_MANIFEST.md 更新"],
      defaultExecutor:"Codex",alternativeExecutor:["Chat"],
      chatFallback:"生成幂等 PowerShell/yt-dlp/FFmpeg 脚本→用户运行→回传真实结果→Chat登记。",
      qcLevel:"Q1",legacyPromptIds:["03A"]
    }),

    cap("PROXY_MEDIA","Source","Proxy / Temporary Analysis Media",{
      purpose:"只有工具无法直接可靠读取 Master 时，创建保持时间映射的分析媒体。",
      whenToUse:["Chat/Work 上传大小受限","只需局部高频视觉分析","远程工具无法读本地Master"],
      whenNotToUse:["Codex可直接本地处理Master","静态官方图片","无需视频解析"],
      requiredInput:["Master真实参数","当前工具上传/解析限制"],
      coreMethod:["先探测再按时长/运动/UI小字自适应算码率。","不裁切、不变速、不换序；分段保留绝对起点。","MASTER_TS=PART_MASTER_START+PART_LOCAL_TS。"],
      failureRefs:["SA_PROXY_MASTER_MAPPING","SA_MASTER_PREFERRED_LOCAL","TL_NO_ESTIMATE"],
      qualityGate:["时长/顺序/音轨/映射验证一致","PROXY_MAP 记录真实状态"],
      outputSchema:["PROXY_MAP.md","Proxy 文件（实际执行时）"],
      defaultExecutor:"Codex",alternativeExecutor:["Chat"],
      chatFallback:"Chat给探测/转码/验证脚本，真实执行后再登记。",
      skipCondition:["本地执行器可直接读取 Master"],
      qcLevel:"Q1",legacyPromptIds:["03C"]
    }),

    cap("VIDEO_SOURCE_ANALYSIS","Source","Video Source Analysis",{
      purpose:"从真实视频的声音+连续画面+UI+动作+时间戳形成可追溯证据。",
      whenToUse:["官方直播/PV/实机演示","自己的实测录屏"],
      requiredInput:["实际可读视频或片段","Master映射（如使用Proxy）"],
      optionalInput:["官方字幕","研究问题"],
      coreMethod:["先复核 SOURCE_IDENTITY。","逐证据记录 Master 时间、官方说法、画面动作、UI/状态、可以确认什么、不能确认什么。","字幕只辅助定位；必须看连续画面。"],
      failureRefs:["SA_NOT_SUBTITLE_ONLY","SA_CONTINUOUS_VISUAL","SA_PROXY_MASTER_MAPPING","SA_SOURCE_IDENTITY_CHECK"],
      qualityGate:["高价值结论都有视频证据时间锚点","不把解释动画/字幕当实机证据"],
      outputSchema:["SOURCE_ANALYSIS_<ASSET_ID>.md","SOURCE_ANALYSIS_INDEX.md"],
      defaultExecutor:"Codex",alternativeExecutor:["Work","Chat"],
      chatFallback:"若当前Chat确实能看视频则分片分析；否则只处理已有分析MD，不冒充观看。",
      hardStopCondition:["要求具体画面结论但视频不可访问"],
      qcLevel:"Q2",legacyPromptIds:["04"]
    }),

    cap("FORMAL_SERVER_VALIDATION","Research","Formal Server Validation",{
      purpose:"验证正式服机制/数值/操作是否真实成立。",
      whenToUse:["正式攻略","实战/排轴","抽卡决策关键结论","前瞻结论转正式服"],
      requiredInput:["正式服文本/实机证据"],
      coreMethod:["明确服务器、版本、测试条件与观察结果。","区分单次观察、可重复机制与推断。"],
      failureRefs:["RS_VERSION_BOUNDARY","RS_NO_LEAK_AS_OFFICIAL"],
      qualityGate:["正式服结论有正式证据","无法验证的仍标 UNKNOWN"],
      outputSchema:["FORMAL_VALIDATION.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work","Codex"],
      hardStopCondition:["必须声称正式服实测但没有任何正式服证据"],
      qcLevel:"Q2",legacyPromptIds:["05"]
    }),

    cap("MECHANIC_RESEARCH","Research","Mechanic Research",{
      purpose:"建立规则、触发条件、状态、资源、边界条件与因果链。",
      whenToUse:["机制专题","角色攻略","前瞻机制解析","排轴"],
      requiredInput:["官方文本/视频分析/实机证据中的至少一种"],
      coreMethod:["先列现象→触发→状态/资源→结果→边界。","把官方确认、实机确认、分析、未知分层。","遇到冲突优先核对版本与条件，不强行统一。"],
      failureRefs:["RS_NO_LEAK_AS_OFFICIAL","SA_NOT_SUBTITLE_ONLY","RS_VERSION_BOUNDARY"],
      qualityGate:["核心结论来源清楚","没有把相关性写成因果"],
      outputSchema:["MECHANIC_RESEARCH.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q2",legacyPromptIds:["05"]
    }),

    cap("TEAM_RESEARCH","Research","Team Research",{
      purpose:"基于当前版本机制、替代角色、资源与实战需求研究可用配队。",
      whenToUse:["攻略","复刻重评","抽卡决策","实战排轴"],
      requiredInput:["角色机制/当前版本/可用队友信息"],
      coreMethod:["先建立队伍成立条件，再比较最优/低配/替代。","避免队友重复时显式处理多队约束。","没有实战证据时标分析而非绝对最强。"],
      failureRefs:["RS_VERSION_BOUNDARY","RS_UNKNOWN_CONTINUE"],
      qualityGate:["每队说明成立原因与限制"],
      outputSchema:["TEAM_RESEARCH.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q1",legacyPromptIds:["05"]
    }),

    cap("ROTATION_RESEARCH","Research","Rotation Research",{
      purpose:"把角色动作、状态、资源与窗口变成固定轴/条件轴/容错轴。",
      whenToUse:["实战/排轴","机制会显著影响操作"],
      requiredInput:["队伍机制","关卡/目标","实战证据或可测试条件"],
      coreMethod:["角色→具体技能→状态变化→切谁→下一动作→资源变化→输出窗口。","标固定轴/条件轴/资源轴/状态轴和失败条件。"],
      failureRefs:["RS_UNKNOWN_CONTINUE","SA_CONTINUOUS_VISUAL"],
      qualityGate:["轴能解释为什么成立","未实测部分明确 CONDITIONAL"],
      outputSchema:["ROTATION_RESEARCH.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Codex","Work"],
      qcLevel:"Q2",legacyPromptIds:["03B","05","14"]
    }),

    cap("PULL_DECISION_RESEARCH","Research","Pull Decision",{
      purpose:"围绕资源成本、替代方案、账号条件、本体/专武/关键命座给实际抽取决策。",
      whenToUse:["抽卡/决策","复刻重评"],
      requiredInput:["当前正式机制/资源成本/替代方案"],
      coreMethod:["按不同账号条件分层，不给所有人同一答案。","本体/专武/关键命座分别给边际收益与机会成本。"],
      failureRefs:["RS_NO_FAKE_SOURCE","RS_UNKNOWN_CONTINUE"],
      qualityGate:["决策条件明确","未知未来环境不包装成确定收益"],
      outputSchema:["PULL_DECISION.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q2",legacyPromptIds:["05"]
    }),

    cap("RERUN_REEVALUATION","Research","Rerun Reevaluation",{
      purpose:"比较首发与当前版本变化，重评现在的角色价值。",
      whenToUse:["复刻重评"],
      requiredInput:["当前版本正式资料","首发基线（仅作比较）"],
      coreMethod:["优先当前版本；首发只用于变化对比。","把新队友/环境/装备/机制改动和角色自身价值分开。"],
      failureRefs:["RS_VERSION_BOUNDARY"],
      qualityGate:["结论回答‘现在值不值’而非重讲首发百科"],
      outputSchema:["RERUN_REEVALUATION.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q2",legacyPromptIds:["05"]
    }),

    cap("CHARACTER_LORE_RESEARCH","Research","Character / Lore Research",{
      purpose:"构建官方剧情时间线、角色动机、关系与主题，不把战斗攻略模板套进剧情解析。",
      whenToUse:["人物志","剧情/世界观解析","创意叙事"],
      requiredInput:["官方剧情/文本/视频"],
      coreMethod:["事实时间线与主题解读分层。","引用剧情必须保留语境；创作改编明确与正史分开。"],
      failureRefs:["RS_NO_FAKE_SOURCE","RS_NO_LEAK_AS_OFFICIAL"],
      qualityGate:["角色关系与事件有官方依据","分析不冒充官方定论"],
      outputSchema:["LORE_RESEARCH.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      qcLevel:"Q2",legacyPromptIds:["05"]
    }),

    cap("CORE_THESIS","Writing","Core Thesis",{
      purpose:"把研究压缩成一个观众真正值得看的核心命题。",
      whenToUse:["研究足以定义内容方向后"],
      requiredInput:["玩家问题","研究结论"],
      coreMethod:["一句话回答：观众看完真正知道/会做什么。","列必须讲、可删、不能讲与标题/封面承诺边界。","长短形式由信息密度决定，不默认10分钟。"],
      failureRefs:["SC_NO_LENGTH_PADDING","SC_THESIS_DELIVERY"],
      qualityGate:["命题可被证据支撑","LONG/SHORT/CANCEL判断可解释"],
      outputSchema:["CORE_THESIS.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q2",reviewMode:"REVIEW_OPTIONAL",legacyPromptIds:["06"]
    }),

    cap("CONTENT_STRUCTURE","Writing","Content Structure",{
      purpose:"为当前产品类型安排信息顺序、章节、钩子与证据位置。",
      whenToUse:["核心命题确定后"],
      requiredInput:["CORE_THESIS","研究结论"],
      coreMethod:["开头15–30秒直击问题。","章节只服务命题；短内容不强制章节。","把证据、判断、操作与收益按因果排列。"],
      failureRefs:["SC_NO_LENGTH_PADDING","SC_THESIS_DELIVERY"],
      qualityGate:["删掉任一章节会损失明确价值","没有百科式填充"],
      outputSchema:["CONTENT_OUTLINE.md"],
      defaultExecutor:"Chat",alternativeExecutor:[],
      qcLevel:"Q1",legacyPromptIds:["06"]
    }),

    cap("SCRIPT_DRAFT","Writing","Script",{
      purpose:"生成自然、准确、高信息密度的真人口播稿。",
      whenToUse:["结构和证据足够"],
      requiredInput:["CORE_THESIS","CONTENT_OUTLINE","研究材料"],
      coreMethod:["直接判断→证据→因果→操作/决策。","重要答案前置；每段有新信息。","产品类型决定语言：机制更重UI/状态因果，剧情更重事件/主题/人物关系，决策更重条件与机会成本。"],
      failureRefs:["SC_NO_LENGTH_PADDING","SC_NO_ANNOUNCEMENT_TONE","SC_THESIS_DELIVERY"],
      qualityGate:["正文兑现命题","没有把分析写成官方事实"],
      outputSchema:["SCRIPT_DRAFT.md"],
      defaultExecutor:"Chat",alternativeExecutor:[],
      qcLevel:"Q1",legacyPromptIds:["07"]
    }),

    cap("SCRIPT_FACT_QC","Writing","Fact / Mechanic / Terminology QC",{
      purpose:"独立检查术语、数值、机制、版本、配队、排轴与证据边界。",
      whenToUse:["完整稿形成后","锁稿前"],
      requiredInput:["当前稿","证据/正式术语真值"],
      coreMethod:["逐问题给位置/问题/正确依据/最低成本改法。","事实型 P1 未核实不能 PASS。"],
      failureRefs:["SC_LOCK_PROTECTION","RS_VERSION_BOUNDARY","RS_NO_FAKE_SOURCE"],
      qualityGate:["无未解决P0/事实型P1才PASS"],
      outputSchema:["SCRIPT_REVIEW_FACT.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      qcLevel:"Q2",legacyPromptIds:["08"]
    }),

    cap("SCRIPT_VALUE_QC","Writing","Content Value / Logic QC",{
      purpose:"检查核心命题兑现、逻辑链、信息增量、产品类型与收藏分享价值。",
      whenToUse:["完整稿形成后","锁稿前"],
      requiredInput:["当前稿","CORE_THESIS","产品类型"],
      coreMethod:["逐段判断新认识/机制/因果/操作/误区/决策价值。","标 DELETE/KEEP/P0/P1。","检查标题/封面承诺是否由正文支撑。"],
      failureRefs:["SC_NO_LENGTH_PADDING","SC_THESIS_DELIVERY"],
      qualityGate:["核心命题完整兑现且无影响价值/逻辑P0/P1"],
      outputSchema:["SCRIPT_REVIEW_VALUE.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      qcLevel:"Q2",legacyPromptIds:["08B"]
    }),

    cap("SCRIPT_NATURALNESS_QC","Writing","Anti-AI / Retention QC",{
      purpose:"去模板化语言并检查前30秒与中段留存。",
      whenToUse:["完整稿形成后","锁稿前"],
      requiredInput:["当前稿"],
      coreMethod:["扫描否定再肯定、反而、模板转场、空泛强调、重复总结、假互动和过度工整。","只给DIFF建议，不为了自然故意说乱。"],
      failureRefs:["SC_NO_ANNOUNCEMENT_TONE","SC_DIFF_MODE"],
      qualityGate:["真人可念、节奏有变化、没有明显AI模板堆叠"],
      outputSchema:["SCRIPT_REVIEW_NATURALNESS.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q2",legacyPromptIds:["09"]
    }),

    cap("SCRIPT_DIFF_REVISION","Writing","DIFF Revision",{
      purpose:"合并审核结果，对当前稿做最低成本修订并保留已确认部分。",
      whenToUse:["审核发现问题","新正式资料到达"],
      requiredInput:["当前稿","审核结果"],
      coreMethod:["只改对应位置。","事实错误优先；新资料只影响相关段落。","修后再次检查受影响的事实/逻辑/自然度。"],
      failureRefs:["SC_DIFF_MODE","SC_LOCK_PROTECTION"],
      qualityGate:["没有顺手全文重写","受影响审核项关闭"],
      outputSchema:["SCRIPT_REVISED.md","SCRIPT_REVIEW.md"],
      defaultExecutor:"Chat",qcLevel:"Q1",legacyPromptIds:["08","08B","09"]
    }),

    cap("SCRIPT_LOCK_GATE","Control","SCRIPT_LOCK Gate",{
      purpose:"把三类真实审核结果与当前稿绑定，只有真正通过时由用户确认 SCRIPT_LOCK。",
      whenToUse:["完整稿和锁稿前审核完成后"],
      requiredInput:["当前稿","SCRIPT_REVIEW_FACT","SCRIPT_REVIEW_VALUE","SCRIPT_REVIEW_NATURALNESS"],
      coreMethod:["确认三类审核针对同一当前稿。","存在未解决P0/P1时不锁。","用户确认后记录锁定稿身份/版本；AI不能自行设置Human Lock。"],
      failureRefs:["SC_LOCK_PROTECTION","PM_WRITE_TRUTH"],
      qualityGate:["三类审核真实PASS","用户明确确认SCRIPT_LOCK"],
      outputSchema:["SCRIPT_LOCK状态/锁定稿引用"],
      defaultExecutor:"Human",alternativeExecutor:["Chat"],
      chatFallback:"Chat只汇总是否满足锁定条件并指出缺口；不能替用户宣告Human Lock。",
      hardStopCondition:["审核未完成或锁定稿身份不明确"],
      qcLevel:"Q3",reviewMode:"APPROVAL_REQUIRED"
    }),

    cap("AUDIO_MASTER_CAPTURE","Audio","AUDIO_MASTER Capture",{
      purpose:"取得最终连续旁白音频，作为之后时间轴唯一WHEN真值。",
      whenToUse:["SCRIPT_LOCK后"],
      requiredInput:["SCRIPT_LOCK正文","朗读/录音方式"],
      optionalInput:["TTS_TEMP.srt","多人朗读拆分"],
      coreMethod:["真人录音或AI朗读均需最终导出连续音频。","不把临时TTS字幕时码当真实Timeline。","记录最终音频文件名、时长、采样率与版本。"],
      failureRefs:["TL_TTS_TEMP_NOT_FINAL","TL_AUDIO_MASTER_TRUTH"],
      qualityGate:["真实AUDIO_MASTER可访问且完整","内容对应当前SCRIPT_LOCK"],
      outputSchema:["AUDIO_MASTER","AUDIO_MASTER_METADATA.md"],
      defaultExecutor:"Human",alternativeExecutor:["Chat"],
      chatFallback:"Chat只能准备朗读输入/检查元数据；最终真实音频仍需用户或实际音频工具产生。",
      qcLevel:"Q3",reviewMode:"APPROVAL_REQUIRED"
    }),

    cap("AUDIO_LOCK_GATE","Control","AUDIO_LOCK Gate",{
      purpose:"确认最终AUDIO_MASTER后冻结叙事时间源，允许进入精确字幕/Timeline。",
      whenToUse:["最终AUDIO_MASTER完成后"],
      requiredInput:["AUDIO_MASTER","SCRIPT_LOCK引用"],
      coreMethod:["检查音频可访问、完整、对应当前锁稿。","用户确认AUDIO_LOCK；随后所有真实时间只服从该音频。"],
      failureRefs:["TL_AUDIO_MASTER_TRUTH","PM_WRITE_TRUTH"],
      qualityGate:["用户明确确认AUDIO_LOCK","AUDIO_MASTER身份唯一"],
      outputSchema:["AUDIO_LOCK状态"],
      defaultExecutor:"Human",alternativeExecutor:["Chat"],
      chatFallback:"Chat只报告是否满足锁定前提，不可代替Human Lock。",
      hardStopCondition:["最终AUDIO_MASTER不存在/不可访问"],
      qcLevel:"Q3",reviewMode:"APPROVAL_REQUIRED"
    }),

    cap("READING_SCRIPT","Audio","Reading Script / TTS Prep",{
      purpose:"把 SCRIPT_LOCK 准备成人类或剪映 AI 可稳定朗读的输入。",
      whenToUse:["SCRIPT_LOCK后","录音前"],
      requiredInput:["SCRIPT_LOCK正文"],
      optionalInput:["真人/AI朗读模式","多人角色分配"],
      coreMethod:["真人模式保持正式文本并按自然语义分块。","AI模式生成TTS_TEMP.srt，每cue≤500可见字符、尽量430–490；用发音映射处理多音字、生僻字、专名、数字/符号。","TTS临时时码只为导入，不是真实Timeline。"],
      failureRefs:["TL_TTS_TEMP_NOT_FINAL","SC_LOCK_PROTECTION"],
      qualityGate:["不改变事实/语义","TTS安全写法有Pronunciation Map"],
      outputSchema:["SCRIPT_READ.md 或 TTS_TEMP.srt","TTS_PRONUNCIATION_MAP.md","TTS_README.md"],
      defaultExecutor:"Chat",qcLevel:"Q1",legacyPromptIds:["10"]
    }),

    cap("PRECISE_SRT_ALIGNMENT","Audio","Precise SRT Alignment",{
      purpose:"用真实 AUDIO_MASTER 对齐锁定文字，生成最终字幕。",
      whenToUse:["最终真实旁白音频已完成"],
      requiredInput:["AUDIO_MASTER","SCRIPT_LOCK正文"],
      optionalInput:["TTS_PRONUNCIATION_MAP"],
      coreMethod:["真实ASR/对齐取WHEN，锁定文本取WHAT。","自然意群切cue，ASR错词用锁定文本校正。"],
      failureRefs:["TL_NO_ESTIMATE","TL_ASR_NOT_TEXT_TRUTH","TL_AUDIO_MASTER_TRUTH"],
      qualityGate:["所有时间来自真实音频","无重叠/倒序","术语与锁稿一致"],
      outputSchema:["FINAL.srt","ALIGNMENT_REPORT.md"],
      defaultExecutor:"Work",alternativeExecutor:["Codex","Chat"],
      chatFallback:"只有当前Chat确实能处理音频对齐时执行；否则提供本地对齐方案，不能猜时间。",
      hardStopCondition:["没有最终AUDIO_MASTER"],
      qcLevel:"Q2",legacyPromptIds:["11"]
    }),

    cap("TIMELINE_MASTER","Audio","TIMELINE_MASTER",{
      purpose:"从真实音频/最终字幕建立后续画面、声音、蓝图共同使用的语义时间锚点。",
      whenToUse:["FINAL.srt已真实对齐"],
      requiredInput:["FINAL.srt","AUDIO_MASTER","SCRIPT_LOCK"],
      coreMethod:["每段记录SEGMENT_ID/START/END/LOCKED_TEXT/SECTION/SEMANTIC_PURPOSE/KEY_TERMS/IMPORTANT_BEAT/PAUSE/ANCHOR_CANDIDATE。","不在此阶段提前决定具体视觉或SFX。"],
      failureRefs:["TL_AUDIO_MASTER_TRUTH","TL_ZERO_ORIGIN"],
      qualityGate:["与FINAL.srt/AUDIO_MASTER同00:00","无猜测时间"],
      outputSchema:["TIMELINE_MASTER.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work","Codex"],
      hardStopCondition:["FINAL.srt不是真实音频对齐结果"],
      qcLevel:"Q2",legacyPromptIds:["11"]
    }),

    cap("VISUAL_DIRECTION","Visual","Visual Direction",{
      purpose:"根据最终旁白/Timeline决定每段最有效的视觉语言与证据职责。",
      whenToUse:["TIMELINE_LOCK后"],
      requiredInput:["FINAL.srt","TIMELINE_MASTER","已有素材描述"],
      coreMethod:["逐段定义视觉目的：证明/展示/对比/解释/氛围。","真实证据优先真实素材；抽象机制再用HUD/Pixel/图表。","剧情/人物类优先官方剧情画面、关系、时间线、意象，不强塞战斗HUD。"],
      failureRefs:["VS_NO_FAKE_GAMEPLAY","VS_FUNCTION_OVER_DECOR","VS_OPTIONAL_STYLE"],
      qualityGate:["关闭声音仍能大致理解关键段落","视觉类型匹配内容类型"],
      outputSchema:["VISUAL_DIRECTION.md"],
      defaultExecutor:"Chat",qcLevel:"Q1",legacyPromptIds:["12"]
    }),

    cap("GAMEPLAY_RECORDING_PLAN","Visual","Gameplay Recording Plan",{
      purpose:"只为无法由现有资料替代的证据或成片镜头安排补录。",
      whenToUse:["缺正式服验证","缺关键游戏镜头","需要排轴实测"],
      whenNotToUse:["官方素材/现有录屏已足够","纯剧情/资料解析无需新实机"],
      requiredInput:["明确缺口/待证明问题"],
      coreMethod:["每项写证明什么、队伍/关卡、起手状态、操作、状态变化、镜头、成功标准与备份。","减少‘随便打一局多录点’。"],
      failureRefs:["PM_OPTIONAL_MISSING_NOT_BLOCK","RS_UNKNOWN_CONTINUE"],
      qualityGate:["每段录屏都有明确证据或剪辑用途"],
      outputSchema:["FINAL_RECORDING_PLAN.md"],
      defaultExecutor:"Chat",skipCondition:["现有素材足够"],
      qcLevel:"Q1",legacyPromptIds:["03B","14"]
    }),

    cap("DYNAMIC_MECHANIC_VISUAL","Visual","Dynamic Mechanic Visual",{
      purpose:"制作真正解释机制的动态视觉资产，不限定Pixel。",
      whenToUse:["机制/状态/资源难靠真实画面解释","需要抽象教学可视化"],
      whenNotToUse:["剧情人物解析没有机制可解释","真实证据镜头已经足够"],
      requiredInput:["机制真值","Timeline","角色官方参考（涉及人物时）"],
      coreMethod:["选择 Pixel/HUD/几何/资源条/Timeline/关系图等最合适语言。","静态组件可以生成，但最终主体必须是真正动态资产或可执行动画代码。","现象→原因→操作→结果。"],
      failureRefs:["VS_NO_FAKE_GAMEPLAY","VS_PIXEL_NOT_PPT","VS_IDENTITY_REFERENCE"],
      qualityGate:["动态变化清楚","不冒充实机","PACKAGE_INDEX可供蓝图直接使用"],
      outputSchema:["ANIMATION_SPEC.md","ANIMATION_CLIPS/ 或可执行代码","PACKAGE_INDEX.md"],
      defaultExecutor:"Codex",alternativeExecutor:["Chat"],
      chatFallback:"Chat完成动画规格与可执行代码；需要本地渲染时交Codex。",
      skipCondition:["没有需要抽象解释的机制"],
      qcLevel:"Q2",legacyPromptIds:["15"]
    }),

    cap("DATA_VISUALIZATION","Visual","Data / Timeline / Relationship Visualization",{
      purpose:"把数值、队伍、角色关系、剧情时间线或版本变化转成清晰图表/动画。",
      whenToUse:["对比/时间线/关系/资源变化适合图形表达"],
      requiredInput:["经过验证的数据/关系/时间顺序"],
      coreMethod:["先定义要回答的问题，再选图形。","明确数据来源，避免漂亮但无信息的装饰。"],
      failureRefs:["VS_FUNCTION_OVER_DECOR","RS_NO_FAKE_SOURCE"],
      qualityGate:["图形能独立回答一个具体问题"],
      outputSchema:["VISUAL_DATA_SPEC.md","图表/动画资产"],
      defaultExecutor:"Chat",alternativeExecutor:["Codex"],
      qcLevel:"Q1",legacyPromptIds:["12","15"]
    }),

    cap("ASSET_GAP_AND_INDEX","Visual","Asset Gap / ASSET_INDEX",{
      purpose:"知道现有素材是什么、缺什么、在哪里、能否用于最终成片。",
      whenToUse:["进入蓝图前","素材数量开始复杂"],
      requiredInput:["tree /f或真实目录索引","素材描述MD"],
      coreMethod:["稳定ASSET_ID贯穿来源、Master/Proxy、描述、蓝图。","区分MISSING_ASSET / RIGHTS_REVIEW_REQUIRED / 已就绪。","文件移动用PATH_REMAP，不依赖旧路径覆盖最新索引。"],
      failureRefs:["TW_NO_OVERWRITE_MASTER","PM_WRITE_TRUTH"],
      qualityGate:["所有蓝图候选素材都有真实路径/描述/权限状态"],
      outputSchema:["ASSET_INDEX.md","PATH_REMAP.md（如移动）","MISSING_ASSET_REPORT.md"],
      defaultExecutor:"Codex",alternativeExecutor:["Chat"],
      chatFallback:"Chat根据tree /f设计Dry Run脚本；用户执行后回传新tree验证。",
      qcLevel:"Q1",legacyPromptIds:["13","18A"]
    }),

    cap("COVER_DESIGN","Visual","Cover",{
      purpose:"生成CTR友好、角色身份准确、与标题互补的三比例Canonical封面。",
      whenToUse:["正式内容命题已稳定"],
      requiredInput:["CORE_THESIS","封面核心表达","官方角色参考"],
      coreMethod:["4:3/3:4/16:9独立构图，不机械裁切。","角色主图不做像素化替代；背景可用克制Pixel/几何。","输出COVER_MESSAGE与TITLE_COMPLEMENT_RULE，发布阶段再适配平台特版。"],
      failureRefs:["VS_IDENTITY_REFERENCE","PB_TITLE_COVER_PROMISE"],
      qualityGate:["角色可识别","一眼只有一个主要点击信息","正文能兑现"],
      outputSchema:["三比例正式封面","COVER_PACKAGE_INDEX.md"],
      defaultExecutor:"Chat",qcLevel:"Q2",legacyPromptIds:["17"]
    }),

    cap("SOUND_DESIGN_BLUEPRINT","Edit","Sound Design Blueprint",{
      purpose:"围绕真实口播时间线设计BGM、SFX、提示音、留白、Ducking与音画锚点。",
      whenToUse:["TIMELINE_LOCK后","需要背景声设计"],
      requiredInput:["AUDIO_MASTER","TIMELINE_MASTER","视觉方向"],
      coreMethod:["口播可听性第一。","精确到Cue记录时间、声音目的、Gain/Fade/Ducking、是否Must Use。","避免持续嗡鸣与无关UI音效堆叠。"],
      failureRefs:["TL_ZERO_ORIGIN","TW_NO_FAKE_RENDER"],
      qualityGate:["每个声音Cue有叙事/信息目的","未存在资产明确PLANNED/MISSING_AUDIO_ASSET"],
      outputSchema:["SOUND_DIRECTION.md","SOUND_CUE_MAP.md"],
      defaultExecutor:"Chat",qcLevel:"Q1",legacyPromptIds:["16"]
    }),

    cap("BGM_SFX_ASSET_PRODUCTION","Edit","BGM / SFX Asset Production",{
      purpose:"把声音蓝图落实成真实可用音频资产。",
      whenToUse:["蓝图确实需要BGM/SFX"],
      requiredInput:["SOUND_DIRECTION","SOUND_CUE_MAP"],
      coreMethod:["只制作最终蓝图会用到的声音。","48kHz优先WAV、留headroom、BGM可循环、SFX短准。","真实文件完成后更新FILE_EXISTS与使用建议。"],
      failureRefs:["TW_NO_FAKE_RENDER","PM_WRITE_TRUTH"],
      qualityGate:["Must Use声音FILE_EXISTS=YES或明确MISSING","不混入口播"],
      outputSchema:["BGM/SFX文件","SOUND_PACKAGE_INDEX.md"],
      defaultExecutor:"Codex",alternativeExecutor:["Chat"],
      chatFallback:"Chat交精确生成/本地脚本；没有实际文件时不能标完成。",
      qcLevel:"Q1",legacyPromptIds:["16A"]
    }),

    cap("EDITING_BLUEPRINT","Edit","Editing Blueprint",{
      purpose:"在Codex执行前完成导演判断，让每个Shot/音频Cue可直接执行。",
      whenToUse:["Timeline与素材索引基本就绪"],
      requiredInput:["FINAL.srt","TIMELINE_MASTER","ASSET_INDEX","视觉/声音设计"],
      coreMethod:["逐Shot写时间、旁白语义、素材ASSET_ID/真实路径、Source In/Out、构图、转场、动效、字幕/视觉锚点。","声音写BGM/SFX/Cue/Gain/Fade/Ducking。","素材不存在写MISSING，不把寻找/导演留给Codex。"],
      failureRefs:["TW_CODEX_EXECUTOR","VS_NO_FAKE_GAMEPLAY","TL_ZERO_ORIGIN"],
      qualityGate:["Codex无需重新导演","所有引用路径/权限/时间真实可执行"],
      outputSchema:["CODEX_EDIT_BLUEPRINT.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q2",legacyPromptIds:["18B"]
    }),

    cap("CODEX_BUILD","Edit","Codex Build",{
      purpose:"严格按蓝图执行本地视频与背景声构建。",
      whenToUse:["CODEX_EDIT_BLUEPRINT通过预检"],
      requiredInput:["CODEX_EDIT_BLUEPRINT","实际本地素材"],
      coreMethod:["先预检路径/时长/权限/缺失，再执行。","画面输出FINAL_VIDEO_SILENT.mp4；背景声输出FINAL_BGM_SFX.wav。","不临场换素材/改脚本/重新导演。"],
      failureRefs:["TW_CODEX_EXECUTOR","TW_NO_FAKE_RENDER","TW_LOCAL_NOT_GIT"],
      qualityGate:["ffprobe/音频探测通过","同00:00","无口播/字幕混入对应输出"],
      outputSchema:["FINAL_VIDEO_SILENT.mp4","FINAL_BGM_SFX.wav","BUILD_REPORT.md"],
      defaultExecutor:"Codex",alternativeExecutor:["Chat"],
      chatFallback:"Chat生成可执行构建脚本；用户/本地执行器运行并回传验证。",
      qcLevel:"Q1",legacyPromptIds:["19"]
    }),

    cap("FINAL_ASSEMBLY","Edit","Final Human Assembly",{
      purpose:"在剪映把Codex双输出、AUDIO_MASTER、FINAL.srt四件套对齐并人工调听感。",
      whenToUse:["双输出与最终口播/字幕齐全"],
      requiredInput:["FINAL_VIDEO_SILENT.mp4","FINAL_BGM_SFX.wav","AUDIO_MASTER","FINAL.srt"],
      coreMethod:["四件套同00:00。","人工调整总背景声与口播听感，不反向改变锁稿/Timeline。","导出FINAL_MASTER.mp4。"],
      failureRefs:["TL_ZERO_ORIGIN"],
      qualityGate:["成片完整播放、字幕同步、口播清楚"],
      outputSchema:["ASSEMBLY_CHECKLIST.md","用户实际导出的FINAL_MASTER.mp4"],
      defaultExecutor:"Human",alternativeExecutor:["Chat"],
      qcLevel:"Q3",reviewMode:"APPROVAL_REQUIRED",legacyPromptIds:["19A"]
    }),

    cap("FINAL_VIDEO_QC","Edit","Final Video QC",{
      purpose:"按需要检查成片事实、同步、字幕、视觉、音频或编码问题。",
      whenToUse:["项目规模/风险值得","用户启用","发布前发现疑点"],
      whenNotToUse:["当前产能阶段明确不做全片AI QC"],
      requiredInput:["实际成片或指定区间"],
      coreMethod:["优先定点问题，不默认全片重分析。","事实问题回到相应上游能力，不偷偷重写LOCK。"],
      failureRefs:["PM_OPTIONAL_MISSING_NOT_BLOCK","SC_LOCK_PROTECTION"],
      qualityGate:["问题有时间码与修复范围"],
      outputSchema:["FINAL_QC_REPORT.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      skipCondition:["当前项目将全片AI QC设为NOT_PLANNED"],
      qcLevel:"Q2",legacyPromptIds:["20"]
    }),

    cap("PLATFORM_RULE_VERIFICATION","Publish","Platform Rule Verification",{
      purpose:"实时核验六平台当前真实投稿字段、限制、封面、字幕、版权与AI披露规则。",
      whenToUse:["生成发布包前"],
      requiredInput:["目标六平台"],
      coreMethod:["优先官方投稿UI/帮助/规范。","无法确认数字就写投稿时按实时UI最终确认，不编。"],
      failureRefs:["PB_LIVE_RULE_CHECK"],
      qualityGate:["动态规则有当前来源/日期"],
      outputSchema:["PLATFORM_RULES_CHECK.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      qcLevel:"Q1",legacyPromptIds:["21"]
    }),

    cap("SIX_PLATFORM_PUBLISH_PACKAGE","Publish","Six-platform Publish Package",{
      purpose:"生成六平台可直接投稿的标题、简介、标签、章节、封面适配、互动与合规检查。",
      whenToUse:["最终内容/字幕/封面基本确定"],
      requiredInput:["CORE_THESIS/最终稿","FINAL.srt/Timeline","COVER_PACKAGE_INDEX","PLATFORM_RULES_CHECK"],
      coreMethod:["B站/抖音/小红书/视频号简中；YouTube/TikTok繁中。","标题≥5候选且与封面互补。","B站/YouTube按真实Timeline生成3–9章节；B站给2–4弹幕投票建议。","处理署名与AI披露。"],
      failureRefs:["PB_LANGUAGE_TRACK","PB_TITLE_COVER_PROMISE","PB_ATTRIBUTION"],
      qualityGate:["字段符合当前平台规则","标题/封面/正文一致"],
      outputSchema:["PUBLISH_PACKAGE.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      qcLevel:"Q2",reviewMode:"APPROVAL_REQUIRED",legacyPromptIds:["21"]
    }),

    cap("ANALYTICS_REVIEW","Publish","Analytics / Review",{
      purpose:"基于真实发布数据判断点击、留存、收藏分享、转粉与下期Learning。",
      whenToUse:["发布后有真实数据"],
      requiredInput:["真实后台指标/截图/导出"],
      coreMethod:["先整理METRICS_SNAPSHOT，不补造缺项。","区分选题/包装/内容/节奏/平台因素。","Learning只写可复用规则，不把单条偶然数据升级成永久原则。"],
      failureRefs:["RS_NO_FAKE_HEAT","PM_WRITE_TRUTH"],
      qualityGate:["结论可追溯到真实指标","Learning有适用范围"],
      outputSchema:["METRICS_SNAPSHOT.md","PERFORMANCE_REVIEW.md","LEARNING_PROPOSAL.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q1",legacyPromptIds:["22"]
    })
  ];

  const BY_ID=Object.freeze(Object.fromEntries(C.map(x=>[x.id,x])));
  const DOMAINS=Object.freeze([...new Set(C.map(x=>x.domain))]);

  function get(id){return BY_ID[id]||null;}
  function list(domain){return domain?C.filter(x=>x.domain===domain):[...C];}
  function compact(capability){
    const c=typeof capability==="string"?get(capability):capability;
    if(!c)return null;
    return {id:c.id,name:c.name,domain:c.domain,defaultExecutor:c.defaultExecutor,qcLevel:c.qcLevel,reviewMode:c.reviewMode,outputs:c.outputSchema};
  }

  return {VERSION:"2.0.0",CAPABILITIES:Object.freeze(C),BY_ID,DOMAINS,get,list,compact};
});
