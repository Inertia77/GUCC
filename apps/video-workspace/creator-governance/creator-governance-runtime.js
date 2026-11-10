(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.GuccCreatorCoreRules=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const AUTONOMY_LEVELS=Object.freeze({
    L0:{label:"Manual",summary:"几乎所有重要动作由人工确认。"},
    L1:{label:"Conservative",summary:"AI 可执行，但重要中间结论较多请求审核。"},
    L2:{label:"High Autonomy",summary:"默认。AI 主动研究、规划、生成、QC 与小范围调整；只在重大方向、LOCK、必须人类输入或最终产物处请求审核。"},
    L3:{label:"Maximum Autonomy",summary:"除必须用户输入、最终成片与发布外尽量不打扰。"}
  });

  const QC_LEVELS=Object.freeze({
    Q0:{label:"Basic Auto Check",human:false,description:"格式、字段、文件命名、基本一致性与机器可验证项。"},
    Q1:{label:"AI Self-QC",human:false,description:"执行任务内部自检；普通步骤默认至少到 Q1。"},
    Q2:{label:"Independent AI QC",human:false,description:"独立 Prompt / Agent 复核事实、机制、内容价值、时间线或关键资产。"},
    Q3:{label:"Human Review",human:true,description:"只用于重大方向、LOCK、最终成片与正式发布等真正需要人的节点。"}
  });

  const HUMAN_PRODUCTION_MAP=Object.freeze([
    {id:"01",name:"选题 / 立项",meaning:"为什么做、做不做、做成长还是做短"},
    {id:"02",name:"研究 / 证据",meaning:"玩家需求、官方资料、实机、来源与事实边界"},
    {id:"03",name:"结构 / 文案",meaning:"核心命题、结构、稿件与锁稿"},
    {id:"04",name:"声音 / 时间线",meaning:"录音、AUDIO_MASTER、SRT、Timeline"},
    {id:"05",name:"视觉 / 素材",meaning:"官方素材、录屏、解释动画、声音与封面资产"},
    {id:"06",name:"剪辑 / 成片",meaning:"蓝图、Codex执行、四件套合成与成片确认"},
    {id:"07",name:"发布 / 复盘",meaning:"六平台发布、数据复盘与 Learning"}
  ]);

  const EVIDENCE_LEVELS=Object.freeze([
    "OFFICIAL_CONFIRMED",
    "FORMAL_SERVER_OR_VISUAL_CONFIRMED",
    "REASONED_ANALYSIS",
    "UNKNOWN",
    "UNPUBLISHED"
  ]);

  const HARD_STOP_RULES=Object.freeze([
    {
      id:"HS_REAL_TIMELINE_WITHOUT_AUDIO",
      when:"要求真实精确 Timeline / SRT 时间，但最终 AUDIO_MASTER 不存在或不可访问",
      action:"NEED_INPUT",
      reason:"继续会制造虚假时间真值"
    },
    {
      id:"HS_VIDEO_VISUAL_INACCESSIBLE",
      when:"要求确认某视频具体画面 / UI / 动作，但视频或对应帧根本不可访问",
      action:"NEED_INPUT",
      reason:"不能用字幕或搜索摘要冒充看过画面"
    },
    {
      id:"HS_FORMAL_SERVER_CLAIM_NO_EVIDENCE",
      when:"要声称正式服实测 / 正式服机制，但没有任何正式服证据",
      action:"NEED_INPUT",
      reason:"会把分析或旧版本包装成事实"
    },
    {
      id:"HS_WRITE_NOT_CONFIRMED",
      when:"任务要求声称已写入 Notion / 本地 / GitHub / 数据库，但真实工具写入失败或未回读",
      action:"NEED_INPUT",
      reason:"不能虚构写操作成功"
    },
    {
      id:"HS_LOCKED_CHANGE",
      when:"需要修改已 LOCK 的正式内容，但没有新正式证据、严重事实错误或明确 Reopen",
      action:"NEED_INPUT",
      reason:"LOCK 是真实边界"
    }
  ]);

  const SOFT_UNCERTAINTY_POLICY=Object.freeze([
    "机制尚未正式验证 → 标 REASONED_ANALYSIS / UNKNOWN，继续能完成的部分。",
    "配队或价值判断仍是公开信息推断 → 标 CONDITIONAL，不升级成 HARD STOP。",
    "资料不完整 / 社区不统一 → 保留分歧与置信度，继续构建可验证部分。",
    "普通字段未由用户亲自确认 → AI 合理补全，允许 UNKNOWN，不频繁打断。",
    "缺可选素材 / 可选视觉 → 标 OPTIONAL / REVIEW_REQUIRED，继续主线。",
    "版权状态待核 → 允许研究与索引，最终成片使用前必须 EDIT_USE_ALLOWED=YES。"
  ]);

  const CORE_RULES=Object.freeze({
    contentStrategy:Object.freeze({
      title:"Channel Strategy / Author Value",
      hard:[
        "先区分 ACQUISITION（版本获客）、CONVERSION（作者转粉）、GOLDEN（增长与高作者价值）；未确定写 UNCONFIRMED。",
        "获客快线重真实需求、时效、事实可靠和制作ROI，允许低成本短内容，不自动套旗舰流程。",
        "作者深度/黄金内容必须有明确 AUTHOR_QUESTION 和真实、可验证的 AUTHOR_CONTRIBUTION（个人观察/实测/反例/解释模型/独特表达）。",
        "AI 归纳不能伪装成作者亲测或第一人称经验；只有真实来源或用户确认后才写作亲历。",
        "标题、封面、开场与正文必须兑现同一个价值命题；已有素材和已完成流程不能成为硬做长视频的理由。"
      ],
      best:[
        "模七余三：模负责提问与判断，七负责解释，余三负责验证或反例；只在单片实际启用时采用多角色。",
        "写作先问：观众解决什么，作者发现了什么，证据是什么；信息密度决定篇幅。",
        "复盘将获客、每千播放涨粉、作者独特贡献、制作工时、可复用成果分开评估。"
      ]
    }),
    evidence:Object.freeze({
      title:"Evidence Rules",
      hard:[
        "严格区分【官方确认】【正式服实机 / 画面确认】【基于公开资料分析】【目前未知】【未公开资料】。",
        "测试服、泄露、拆包、二手传闻不得包装成官方事实。",
        "官方视频的重要机制必须结合音频、连续画面、UI、动作、状态变化与时间戳；不能只靠字幕猜机制。",
        "来源不足时明确 UNKNOWN；不得补造机制、数值、版本、区服、操作或引用。",
        "最新可验证版本优先，不用旧版本覆盖已确认新版本事实。"
      ],
      best:[
        "关键结论尽量保留 Source URL、日期、版本语境与证据等级。",
        "社区热度、争议与搜索需求分开判断，不把单个帖子当社区共识。"
      ]
    }),
    script:Object.freeze({
      title:"Script Rules",
      hard:[
        "SCRIPT_LOCK 保护最终文字真值；修改已确认稿默认 DIFF MODE。",
        "没有真实完成事实 / 机制 / 术语审核、内容逻辑 / 信息价值审核、去 AI 味 / 留存审核，不得假装已通过。",
        "不得为方便视觉或新 Chat 不知道上下文而擅自改变已锁结论。"
      ],
      best:[
        "真人口播优先：答案前置、高信息密度、因果清楚，不写公告腔与百科堆砌。",
        "不为完整硬拉时长；没有信息增量就删。",
        "默认规避“不是A而是B”“你以为A其实B”“反而才是”“接下来我们来看”“一句话总结”等模板句。",
        "标题前半明确作品/对象/内容类型，后半抓有剧情证据的冲突或人物疑问；点击承诺必须在正文得到解释。",
        "剧情人物口播以具体事件、行为和因果推动段落；默认删去“更让我在意的是”“真正改变的是”等自指、空泛的强调或模板转场。",
        "尊重事实边界，但不要在正式口播里堆砌“目前不知道/仍需验证”等空悬念；核心结论缺证据时收窄命题，无关未知直接删除，必要审核说明留在稿外。",
        "数字、象征、意象只有产生实质人物解读或可验证信息增量才展开；不要对普通镜头和数字强行赋予深意，也不反复标注“这是人物解读”。",
        "按信息密度和自然口播语速决定字数/时长，允许短于原计划；除非用户要求，结尾不要自报UP主名称。",
        "封面问句通过双重检查：正文必须有针对问题的真实答案，前提与结果之间的所谓反差也必须符合常识因果；仅知道触发条件不等于揭开能力来源。"
      ]
    }),
    audioTimeline:Object.freeze({
      title:"Audio / Timeline Rules",
      hard:[
        "AUDIO_MASTER = WHEN；SCRIPT_LOCK = WHAT。",
        "最终真实音频是唯一叙事时间真值；禁止按字数、平均语速或稿件长度猜 / 均分时间。",
        "FINAL.srt 使用正式锁定文字，时间来自真实音频；ASR 只提供时间信息，不能覆盖官方术语。",
        "TIMELINE_MASTER.md 与 FINAL.srt 使用同一 00:00；AUDIO_LOCK / TIMELINE_LOCK 后不得私自重定义时间原点。"
      ],
      best:[
        "AI 朗读临时 SRT 只负责 TTS 发音，不进入最终时间真值。",
        "时间线锁后，画面与声音围绕相同语义锚点并行设计。",
        "剪映AI朗读可按实际可用上限制作500字符安全版/300字符备用版；尽量减少片段数，但不强迫填满上限。临时SRT应留大间隔占位、清楚区分发音替换与正式原文，校验段序、漏重字。",
        "录音模式是每期可变选择，真人录音和AI朗读均以最终连续AUDIO_MASTER确定字幕时间。"
      ]
    }),
    asset:Object.freeze({
      title:"Asset Rules",
      hard:[
        "每个素材需要稳定 ASSET_ID；研究身份与最终剪辑路径不能只靠文件名猜。",
        "至少记录 path / basename、duration 或尺寸、SOURCE_URL、OWNER、RIGHTS_STATUS、EDIT_USE_ALLOWED、ATTRIBUTION、AI_GENERATED_OR_ASSISTED、许可备注。",
        "官方公开 ≠ 无限使用权；社区素材未授权默认只研究。",
        "研究参考不等于可直接进成片；最终蓝图只能默认使用 EDIT_USE_ALLOWED=YES 的外部素材。"
      ],
      best:[
        "视频记录 Source In / Out 与 Master / Proxy 映射；静态图记录来源页面与分辨率。",
        "大文件留本地，用 tree /f + ASSET_INDEX + 描述 MD 服务蓝图。"
      ]
    }),
    visual:Object.freeze({
      title:"Visual Rules",
      hard:[
        "真实机制证据必须用真实资料；解释动画不得冒充实机。",
        "人物主图 / 像素角色 / 高还原生成角色必须依据真实可读官方参考。",
        "不能用 AI 假游戏 UI、假伤害数字、假技能图标冒充正式画面。"
      ],
      best:[
        "Pixel 只是手段之一；UI / HUD / Timeline / 数据图 / 几何 / 关系图等按解释效率选择。",
        "解释动画应表现现象 → 原因 → 操作 → 结果，而不是静态 PPT。",
        "剧情人物类默认先评估官方PV/角色展示/实机公开资料与原创动态解释素材，不把专门录游戏实机作为必经步骤；需要确证但来源不充分时单独指出证据缺口。",
        "有锁稿即可预制不依赖时码的独立解释动画；正式字幕/音频到位后才进行剪辑时间对齐。封面生成后要对照官方角色参考再次核验识别特征。"
      ]
    }),
    codex:Object.freeze({
      title:"Codex Rules",
      hard:[
        "Codex 是执行器，不是导演：详细视觉、剪辑和声音判断应在蓝图阶段完成。",
        "Codex 只使用真实可访问的本地文件；路径不存在时报告缺失，不能自造替代文件。",
        "默认画面输出 FINAL_VIDEO_SILENT.mp4：1080p / 30fps / H.264 / 无音轨 / 无字幕。",
        "用户只要求纯画面且已有 BGM/SFX 时，只制作静音视频；禁止重新生成背景音轨，不添加空白音轨或字幕流。",
        "锁定音频实际长度决定每支视频总时长，合法 FINAL.srt 决定镜头语义时间锚点；缺独立 TIMELINE_MASTER 时允许从 SRT 直接建立 Shot Map，同一 00:00 且不得挪动已锁时间。",
        "用户要求素材互斥时采用单画面轨：官方源/Pixel 各占独立连续 Shot，不叠画、不画中画、不交叉溶解；指定全用的本地动画必须逐项真实入片。",
        "默认声音输出 FINAL_BGM_SFX.wav：48kHz，仅 BGM / SFX，从 00:00 与旁白同时间原点；口播不混入背景轨。"
      ],
      best:[
        "本地文件、视频、音频、图片、FFmpeg、批处理、动画资产、蓝图执行与成片适合 Codex。",
        "在用户直接授权 Codex 剪辑而尚无单独蓝图时，允许根据实际可读 SRT、最终音频、素材索引和源视频先自动构建带 Source In/Out 的 Shot Map，再渲染；属同一项任务，不强制回到固定流程。",
        "官方片源必须结合索引与连续视频核验真实时码；同一源不同非重叠区间可重复取用，但同一原画面时间段不得重复；按语义交替使用官方片段与解释动画，避免一种画面连续独占过久。",
        "质量门槛包括：每条输出无黑/空帧、首尾完整、SRT/录音/画面同原点、覆盖要求的所有资产，并由 ffprobe 确认 1080p/30fps/CFR/H.264/yuv420p/Rec.709 SDR 且无音轨或字幕流。",
        "减少中间产物和自由导演判断以降低 Token 与返工。"
      ]
    }),
    publish:Object.freeze({
      title:"Publish Rules",
      hard:[
        "投稿前实时核验平台真实字段、长度、封面比例、版权、AI 披露和字幕 / 章节规则；不能凭旧记忆编限制。",
        "标题与封面必须由正文兑现；不能用虚假官方结论、福利或无关热词。",
        "需要署名或 AI 披露的资产必须在发布前处理。"
      ],
      best:[
        "Bilibili / 抖音 / 小红书 / 微信视频号使用简体中文；YouTube / TikTok 使用繁体中文，除非项目覆盖。",
        "Bilibili / YouTube 仅根据真实已对齐SRT生成有信息增量的章节，数量服从内容；B站弹幕投票按内容需要提供，不凑数。",
        "每个平台优先一套可直接粘贴的首选稿，差异明确才附备选；封面与标题需通过答案兑现和常识因果检查。"
      ]
    }),
    autonomy:Object.freeze({
      title:"AI-FIRST / HUMAN-REVIEW",
      hard:[
        "默认 AUTONOMY_LEVEL=L2。",
        "HARD STOP 只用于继续会导致产物虚假、伪造或根本无法成立的关键缺失。",
        "REVIEW_OPTIONAL 不阻塞；APPROVAL_REQUIRED 只用于 GO/CANCEL、LONG↔SHORT重大改变、SCRIPT_LOCK、修改LOCK、必须人类输入、最终成片与发布。"
      ],
      best:[
        "能查就查、能做就做、能合理推断就先做；普通未知使用 UNKNOWN / CONDITIONAL / REVIEW_REQUIRED。",
        "普通 QC、文件命名、Asset Index、是否需要 Proxy / Pixel 等由 AI 自己判断，不频繁打断用户。"
      ]
    })
  });

  function ruleText(keys){
    const selected=(keys||Object.keys(CORE_RULES)).map(k=>CORE_RULES[k]).filter(Boolean);
    return selected.flatMap(section=>[section.title,...section.hard,...section.best]).join("\n");
  }

  return {
    VERSION:"2.0.1",
    AUTONOMY_LEVELS,
    QC_LEVELS,
    HUMAN_PRODUCTION_MAP,
    EVIDENCE_LEVELS,
    HARD_STOP_RULES,
    SOFT_UNCERTAINTY_POLICY,
    CORE_RULES,
    ruleText
  };
});


/* ===== GUCC CENTRALIZED GOVERNANCE MODULE ===== */

(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports) module.exports=api;
  root.GuccCreatorFailurePrevention=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";

  const LIBRARY=Object.freeze({
    projectManagement:Object.freeze([
      {id:"PM_NO_PHANTOM_CONTEXT",level:"HARD_CONSTRAINT",rule:"不假设看过其他 Chat、未连接的 Notion、GUCC 本地路径或未来 Prompt。只有当前实际可读内容算输入。"},
      {id:"PM_NO_AUTO_NEXT",level:"FAILURE_WARNING",rule:"完成当前任务后不得自动执行下一条 Prompt；可以给 NEXT，但由用户决定是否继续。"},
      {id:"PM_OPTIONAL_MISSING_NOT_BLOCK",level:"FAILURE_WARNING",rule:"缺可选资料不能升级成 NEED_INPUT；先完成能确定的部分。"},
      {id:"PM_USER_NOW_OVERRIDES_OLD_PLAN",level:"HARD_CONSTRAINT",rule:"用户当前明确要求优先于旧 PRODUCTION_NEEDS / NOT_PLANNED；早期计划不是永久禁止。"},
      {id:"PM_WRITE_TRUTH",level:"HARD_CONSTRAINT",rule:"没有真实写入和回读就不能声称已保存、更新或同步。"},
      {id:"PM_CONTINUOUS_CHAT_REUSE",level:"BEST_PRACTICE",rule:"同一 Chat 已经获得的文件、研究结果、锁稿与时间线直接复用，不让用户重复上传。"}
    ]),
    research:Object.freeze([
      {id:"RS_NO_LEAK_AS_OFFICIAL",level:"HARD_CONSTRAINT",rule:"测试服、泄露、拆包、二手传闻不得包装成官方事实。"},
      {id:"RS_NO_FAKE_HEAT",level:"HARD_CONSTRAINT",rule:"不能编造热度、排名、搜索量、玩家共识或竞品表现。"},
      {id:"RS_NO_FAKE_SOURCE",level:"HARD_CONSTRAINT",rule:"不能编造来源 URL、视频 ID、发布时间、数值、角色术语。"},
      {id:"RS_VERSION_BOUNDARY",level:"HARD_CONSTRAINT",rule:"不能把旧版本、其他区服或不同测试阶段资料覆盖当前项目已确认版本事实。"},
      {id:"RS_UNKNOWN_CONTINUE",level:"BEST_PRACTICE",rule:"普通未知标 UNKNOWN / REASONED_ANALYSIS / CONDITIONAL，继续构建可验证部分。"}
    ]),
    sourceAnalysis:Object.freeze([
      {id:"SA_NOT_SUBTITLE_ONLY",level:"FAILURE_WARNING",rule:"不能只读字幕猜动作、UI、资源变化或镜头事实。"},
      {id:"SA_CONTINUOUS_VISUAL",level:"BEST_PRACTICE",rule:"机制分析优先看连续画面、UI、音频、动作前后关系与真实时间戳。"},
      {id:"SA_PROXY_MASTER_MAPPING",level:"HARD_CONSTRAINT",rule:"Proxy / 分段时间不能直接当 Master 时间；必须保留绝对偏移映射。"},
      {id:"SA_SOURCE_IDENTITY_CHECK",level:"HARD_CONSTRAINT",rule:"分析前核对游戏、角色、版本、区服、官方主体、VIDEO_ID；来源不匹配立即 SOURCE_MISMATCH。"},
      {id:"SA_MASTER_PREFERRED_LOCAL",level:"BEST_PRACTICE",rule:"Codex 能直接本地读取 Master 时不机械生成 Proxy；Proxy 仅在上传/读取条件需要时使用。"}
    ]),
    script:Object.freeze([
      {id:"SC_NO_LENGTH_PADDING",level:"FAILURE_WARNING",rule:"不为了凑 10 分钟或完整攻略而重复信息、硬塞百科内容。"},
      {id:"SC_NO_ANNOUNCEMENT_TONE",level:"BEST_PRACTICE",rule:"避免公告腔、百科堆砌、机械转场、连续总结与 AI 模板句。"},
      {id:"SC_LOCK_PROTECTION",level:"HARD_CONSTRAINT",rule:"未 Reopen 或无充分新证据时不得修改 SCRIPT_LOCK。"},
      {id:"SC_DIFF_MODE",level:"BEST_PRACTICE",rule:"已确认稿件默认 DIFF MODE，只改事实错误、新正式资料或严重逻辑问题。"},
      {id:"SC_THESIS_DELIVERY",level:"BEST_PRACTICE",rule:"标题/封面承诺、开场问题和正文核心结论必须互相兑现。"},
      {id:"SC_QUESTION_MUST_BE_ANSWERED",level:"FAILURE_WARNING",rule:"悬念式标题要指出正文具体哪一段给出可验证答案；若只提供关联线索/触发条件而没有原因或真相，不得用“为什么/真相揭秘”暗示已完整回答。"},
      {id:"SC_FALSE_CONTRAST",level:"FAILURE_WARNING",rule:"检查标题对立关系是否符合常识因果；若“前提A本就容易导致B”，不要硬写成“明明A却B”的伪反差。"},
      {id:"SC_QC_BEFORE_LOCK",level:"BEST_PRACTICE",rule:"AI先独立核对事实/术语、内容逻辑/信息价值、去AI味/留存；能自行修复的先修订再复审，未真实验证的事实项不能宣称PASS或锁稿。"}
    ]),
    timeline:Object.freeze([
      {id:"TL_NO_ESTIMATE",level:"HARD_CONSTRAINT",rule:"禁止按字数、平均语速、脚本长度或句长猜时间。"},
      {id:"TL_ASR_NOT_TEXT_TRUTH",level:"HARD_CONSTRAINT",rule:"ASR 只提供时间参考，不能覆盖锁定角色名、术语与正式字幕文字。"},
      {id:"TL_AUDIO_MASTER_TRUTH",level:"HARD_CONSTRAINT",rule:"最终真实 AUDIO_MASTER 决定 WHEN；未有最终音频不能生成真实 FINAL.srt / TIMELINE_MASTER。"},
      {id:"TL_TTS_TEMP_NOT_FINAL",level:"FAILURE_WARNING",rule:"TTS_TEMP.srt 只用于 AI 朗读，临时时码不能污染最终时间线。"},
      {id:"TL_TTS_LIMIT_GAP",level:"BEST_PRACTICE",rule:"剪映AI朗读按所用客户端实际字数上限分段；可选500字符安全版与300字符兼容版，优先减少段数而不强行凑满。临时SRT各段时间槽之间留足明显空档，避免生成音频相互挤占；占位时间不得进入最终字幕。"},
      {id:"TL_TTS_LOCKED_TEXT_QC",level:"HARD_CONSTRAINT",rule:"发音安全化只调整多音字、角色/组织专名、英文、数字和符号读法；逐段比对锁稿，所有有意替换登记发音映射，禁止漏字、重字、段落错序和偷偷改写剧情结论。"},
      {id:"TL_ZERO_ORIGIN",level:"BEST_PRACTICE",rule:"AUDIO_MASTER / FINAL.srt / TIMELINE_MASTER / Codex 输出统一 00:00。"}
    ]),
    visual:Object.freeze([
      {id:"VS_NO_FAKE_GAMEPLAY",level:"HARD_CONSTRAINT",rule:"AI 解释动画、生成图不能冒充真实游戏画面或正式机制证据。"},
      {id:"VS_PIXEL_NOT_PPT",level:"FAILURE_WARNING",rule:"Pixel / HUD 动画要有动作、状态、资源与触发变化，不能退化成静态 PPT。"},
      {id:"VS_IDENTITY_REFERENCE",level:"HARD_CONSTRAINT",rule:"角色形象必须依据真实可读官方参考；缺参考不能凭空高还原。"},
      {id:"VS_IDENTITY_AFTER_RENDER",level:"FAILURE_WARNING",rule:"封面生成后再次对照上传的官方参考检查脸、发型、眼睛、服饰、配饰和武器；角色明显不符即不交付，不能仅靠写过参考提示词判定通过。"},
      {id:"VS_PREBUILD_WITHOUT_FAKE_TIMELINE",level:"BEST_PRACTICE",rule:"已锁稿但尚无最终配音时，允许提前实做独立的剧情关系/HUD/档案/像素动画与素材索引；仅保留语义锚点，不能编造最终SRT或成片精确镜头时间。"},
      {id:"VS_FUNCTION_OVER_DECOR",level:"BEST_PRACTICE",rule:"视觉服务理解、证据与节奏；不靠满屏光效或无信息装饰充数。"},
      {id:"VS_OPTIONAL_STYLE",level:"OPTIONAL_ENHANCEMENT",rule:"Pixel、几何、HUD、数据图、关系图按项目需要选择，不是固定步骤。"}
    ]),
    toolWrite:Object.freeze([
      {id:"TW_LOCAL_NOT_GIT",level:"HARD_CONSTRAINT",rule:"不得擅自把本地制作素材、大视频、音频或项目工作目录推到 Git。"},
      {id:"TW_CODEX_EXECUTOR",level:"BEST_PRACTICE",rule:"Codex 适合本地文件、FFmpeg、批处理、动画、音频和蓝图执行；导演判断前移。"},
      {id:"TW_MEDIA_EXCLUSIVE_TIMELINE",level:"HARD_CONSTRAINT",rule:"用户明确要求 Pixel 与官方素材各自独占时间线时，不得叠加、画中画或交叉溶解；每个 Shot 必须有唯一素材和连续不重叠的成片区间。"},
      {id:"TW_REQUIRED_PIXEL_COVERAGE",level:"HARD_CONSTRAINT",rule:"用户明确要求全部生成动画必须入片时，要逐项核对 ASSET_ID、真实展示时长和片中镜头；闪现一帧不算使用。"},
      {id:"TW_NO_REUSED_SOURCE_INTERVAL",level:"FAILURE_WARNING",rule:"官方视频可取同源的不同段落，但不得重复利用相同 Source In/Out 或用镜像、裁切、变速伪装重复镜头；只能在真实语义或气质匹配时选用。"},
      {id:"TW_SILENT_ONLY_NO_AUDIO",level:"HARD_CONSTRAINT",rule:"用户已完成 BGM/SFX 且仅要纯画面时，最终 MP4 不能含任何音轨或字幕流，也不得擅自重制已完成的声音。"},
      {id:"TW_NO_FAKE_RENDER",level:"HARD_CONSTRAINT",rule:"没有真实渲染结果和探测验证，不能声称 FINAL_VIDEO_SILENT / FINAL_BGM_SFX 已完成。"},
      {id:"TW_NO_OVERWRITE_MASTER",level:"HARD_CONSTRAINT",rule:"批处理默认不覆盖 Master / 原始素材；移动前 Dry Run，冲突时停止。"},
      {id:"TW_WORK_NOT_LOCAL_FS",level:"FAILURE_WARNING",rule:"Work 擅长浏览器和多资料研究，不假设它自动拥有 Windows 本地路径访问权。"}
    ]),
    publish:Object.freeze([
      {id:"PB_LIVE_RULE_CHECK",level:"HARD_CONSTRAINT",rule:"平台投稿字段、字数、封面、版权、AI披露规则必须实时核验。"},
      {id:"PB_LANGUAGE_TRACK",level:"BEST_PRACTICE",rule:"B站/抖音/小红书/视频号简体；YouTube/TikTok繁体，除非项目覆盖。"},
      {id:"PB_TITLE_COVER_PROMISE",level:"HARD_CONSTRAINT",rule:"标题与封面不能夸大到正文无法兑现。"},
      {id:"PB_HEADLINE_CAUSAL_CHECK",level:"FAILURE_WARNING",rule:"投稿前检查封面问句的前提、常识因果、正文回答位置；避免逻辑自相抵消的伪反差，以及只有线索没有答案的假揭秘。"},
      {id:"PB_ONE_PRIMARY_COPY",level:"BEST_PRACTICE",rule:"每平台默认只交一套最优的可复制投稿稿；有实质不同策略才提供少量备选，不强凑五标题、多投票或固定章节数量。"},
      {id:"PB_ATTRIBUTION",level:"HARD_CONSTRAINT",rule:"ATTRIBUTION_REQUIRED / AI disclosure 在发布前必须处理。"}
    ])
  });

  const OPTIONAL_ENHANCEMENTS=Object.freeze([
    "Pixel Mechanic Animation",
    "额外备用对比镜头",
    "额外视觉强化",
    "更多平台特版封面",
    "额外社区案例",
    "可选代理视频",
    "可选最终全片 AI QC"
  ]);

  function all(){
    return Object.entries(LIBRARY).flatMap(([category,items])=>items.map(item=>({...item,category})));
  }
  function byIds(ids){
    const set=new Set(ids||[]);
    return all().filter(item=>set.has(item.id));
  }
  function render(ids){
    return byIds(ids).map(x=>`[${x.level}] ${x.rule}`).join("\n");
  }

  return {
    VERSION:"2.0.1",
    LIBRARY,
    OPTIONAL_ENHANCEMENTS,
    all,
    byIds,
    render
  };
});


/* ===== GUCC CENTRALIZED GOVERNANCE MODULE ===== */

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
      coreMethod:["先按 CURRENT 频道战略判定 ACQUISITION / CONVERSION / GOLDEN；获客核需求与ROI，作者型核本人愿看、AUTHOR_QUESTION、可验证贡献。",
        "先判断玩家为什么点、看完解决什么、竞品饱和与信息增量。",
        "给 GO/HOLD/SHORT/MERGE/CANCEL，不因普通字段未知停止。",
        "AI 自动提出人类可读 PROJECT_ID；已有 Contract ID 原样沿用。",
        "VIDEO_CONTRACT 写 VERIFIED_FACTS / REASONED_ANALYSIS / UNKNOWNS / DO_NOT_USE / OFFICIAL_TERMINOLOGY / AVAILABLE_ARTIFACTS / LOCKED_ARTIFACTS / AUTONOMY_LEVEL / NEXT_HANDOFF。",
        "PRODUCTION_NEEDS 只做初步资源计划，不把 NOT_PLANNED 当永久禁止。"
      ],
      mandatoryGuardrails:["默认 AUTONOMY_LEVEL=L2。","未知普通字段写 UNKNOWN，不为填满表格阻塞。"],
      failureRefs:["PM_OPTIONAL_MISSING_NOT_BLOCK","PM_USER_NOW_OVERRIDES_OLD_PLAN","RS_NO_LEAK_AS_OFFICIAL"],
      qualityGate:["不得把 AI 总结称作作者亲测；作者贡献缺证据要标 UNCONFIRMED。","立项结论与信息增量明确","Contract 不把推断写成事实","重大方向变化才需要 Q3"],
      outputSchema:["PROJECT_BRIEF.md","VIDEO_CONTRACT.md"],
      defaultExecutor:"Work",
      alternativeExecutor:["Chat"],
      chatFallback:"同一 Chat 分两轮：先立项/研究，再生成 Contract；直接沿用上一轮结果。",
      projectInjection:["GAME","SERVER","VERSION","PRODUCT_TYPE","FORMAT","PLATFORMS","AUTONOMY_LEVEL"],
      qcLevel:"Q2",
      reviewMode:"APPROVAL_REQUIRED",
      legacyPromptIds:["01","01A"]
    }),

    cap("PROMPT_FLOW_COMPILER","Control","Build Project Prompt Flow",{
      purpose:"根据 Project Brief / Contract、Core Rules、Capability Library、Failure Prevention、已有素材与当前工具能力编译项目专属 Workflow 与完整 Prompt Flow。",
      whenToUse:["项目定义完成后","需要首次生成项目执行流"],
      requiredInput:["PROJECT_BRIEF","VIDEO_CONTRACT"],
      optionalInput:["已有素材索引","当前工具能力","时间/发布约束"],
      coreMethod:["按内容路线分配预算：获客快线压缩研究与视觉成本；作者线优先一手研究与独立结论。合并同工具/同上下文的低风险连续操作，不把每个 Capability 都做成人工节点。","优先复用成熟 Capability，不从零现场发明操作方法。","减少低价值人工中转；保留核心机制判断、核心命题、Script/Lock、真实Timeline、重大格式Gate与Final Review。","为Work/Codex节点准备Chat Fallback；Proxy/Pixel/补拍/Final AI QC按条件。"],
      failureRefs:["PM_OPTIONAL_MISSING_NOT_BLOCK","PM_USER_NOW_OVERRIDES_OLD_PLAN","PM_NO_AUTO_NEXT"],
      qualityGate:["每次独立交接能说明不可合并的理由。","每个Node有完整Prompt与Executor/依赖/输入/输出/QC/Hard Stop/Skip/Next","流程符合当前产品类型，不机械复制固定编号"],
      outputSchema:["PROJECT_WORKFLOW.md","PROJECT_PROMPT_FLOW.md","CURRENT_TASK.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q2",reviewMode:"APPROVAL_REQUIRED",legacyPromptIds:["23"]
    }),

    cap("PROMPT_FLOW_UPDATER","Control","Update Project Prompt Flow",{
      purpose:"执行中根据新资料、格式变化、工具失败或用户新要求对现有 Prompt Flow 做最小 DIFF 更新。",
      whenToUse:["新官方资料","LONG→SHORT/CANCEL","某步骤不再需要","Capability失败","Work/Codex不可用","用户改变要求"],
      requiredInput:["当前PROJECT_PROMPT_FLOW","VIDEO_CONTRACT","新变化"],
      coreMethod:["仅在内容路线、关键新证据或执行环境真正变化时改动节点；小幅文字修订不重新编译整套流程。","只允许 ADD / REMOVE / MERGE / SKIP / REORDER / REPLACE。","保留已完成Node、Lock与成熟Capability Guardrail。","普通变化AI自动调整，重大方向改变才请求Human Approval。"],
      failureRefs:["PM_USER_NOW_OVERRIDES_OLD_PLAN","SC_LOCK_PROTECTION","PM_NO_AUTO_NEXT"],
      qualityGate:["不会因局部改稿重新开启已经完成的整个流程。","变更范围最小","不重写整个Flow","已完成产物引用不丢失"],
      outputSchema:["PROJECT_PROMPT_FLOW.md DIFF","PROJECT_WORKFLOW.md PATCH","CURRENT_TASK.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q1",reviewMode:"REVIEW_OPTIONAL",legacyPromptIds:["23"]
    }),

    cap("PLAYER_DEMAND_RESEARCH","Research","Player Demand Research",{
      purpose:"找到真实玩家问题、误解、争议、搜索意图与值得点击的入口。",
      whenToUse:["新题材","前瞻/复刻/决策/机制专题","流量方向不确定"],
      whenNotToUse:["纯个人创作且无需玩家需求验证"],
      requiredInput:["游戏/版本/主题"],
      optionalInput:["已有社区链接","频道受众线索"],
      coreMethod:["把搜索需求、竞品缺口与作者本人关注的问题分开，避免把高热度直接当作长视频价值。","扫描 B站/NGA/贴吧/米游社/Reddit/YouTube 等实际可访问社区。","记录原帖 URL、日期、可见指标和语境；热度、价值、争议、误解、搜索需求分开判断。","输出 Top 问题、已讲烂内容、竞品空白与本期最值得解决的问题。"],
      failureRefs:["RS_NO_FAKE_HEAT","RS_NO_FAKE_SOURCE","PM_OPTIONAL_MISSING_NOT_BLOCK"],
      qualityGate:["需求结论不能代替作者的真实兴趣与贡献。","问题可追溯到真实讨论","不以单帖冒充社区共识"],
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
      coreMethod:["识别已经被重复讲解的机制套路，并提出需要新证据或作者独立模型才能成立的内容增量。","找当前相关视频/文章并记录发布日期、定位、覆盖范围、可见表现。","区分‘流量大’和‘解决问题更好’；找缺失证据、过时版本、重复内容和表达空位。"],
      failureRefs:["RS_NO_FAKE_HEAT","RS_NO_FAKE_SOURCE"],
      qualityGate:["竞品数量与播放量不能代替作者贡献判断。","竞品结论有链接与时间语境","明确本期不重复什么"],
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
      coreMethod:["优先研究具体异常现象/触发→状态与资源变化→边界反例→操作收益；不展开无关的技能百科。","先列现象→触发→状态/资源→结果→边界。","把官方确认、实机确认、分析、未知分层。","遇到冲突优先核对版本与条件，不强行统一。"],
      failureRefs:["RS_NO_LEAK_AS_OFFICIAL","SA_NOT_SUBTITLE_ONLY","RS_VERSION_BOUNDARY"],
      qualityGate:["每个核心因果链能指向真实画面或明确的不确定性。","核心结论来源清楚","没有把相关性写成因果"],
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
      coreMethod:["同时给 AUDIENCE_QUESTION、AUTHOR_QUESTION、可验证 AUTHOR_CONTRIBUTION 和内容路线；获客快线允许明确需求带来的价值。","一句话回答：观众看完真正知道/会做什么。","列必须讲、可删、不能讲与标题/封面承诺边界。","长短形式由信息密度决定，不默认10分钟。"],
      failureRefs:["SC_NO_LENGTH_PADDING","SC_THESIS_DELIVERY"],
      qualityGate:["高投入长视频的作者贡献必须具体、可验证，未成立时可建议轻量或取消。","命题可被证据支撑","LONG/SHORT/CANCEL判断可解释"],
      outputSchema:["CORE_THESIS.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q2",reviewMode:"REVIEW_OPTIONAL",legacyPromptIds:["06"]
    }),

    cap("CONTENT_STRUCTURE","Writing","Content Structure",{
      purpose:"为当前产品类型安排信息顺序、章节、钩子与证据位置。",
      whenToUse:["核心命题确定后"],
      requiredInput:["CORE_THESIS","研究结论"],
      coreMethod:["作者线从具体观察/问题切入，按证据→因果→反例→结果组织；剧情/创意保留适合题材的叙事形式。","开头15–30秒直击问题。","章节只服务命题；短内容不强制章节。","把证据、判断、操作与收益按因果排列。"],
      failureRefs:["SC_NO_LENGTH_PADDING","SC_THESIS_DELIVERY"],
      qualityGate:["章节和开场兑现真实问题，不生成模板化背景百科。","删掉任一章节会损失明确价值","没有百科式填充"],
      outputSchema:["CONTENT_OUTLINE.md"],
      defaultExecutor:"Chat",alternativeExecutor:[],
      qcLevel:"Q1",legacyPromptIds:["06"]
    }),

    cap("SCRIPT_DRAFT","Writing","Script",{
      purpose:"生成自然、准确、高信息密度的真人口播稿。",
      whenToUse:["结构和证据足够"],
      requiredInput:["CORE_THESIS","CONTENT_OUTLINE","研究材料"],
      coreMethod:["不要捏造作者亲历。每段推进新事实、观察、因果、实战动作或反例；写成自然可口播的具体解释。","直接判断→证据→因果→操作/决策。","重要答案前置；每段有新信息。","产品类型决定语言：机制更重UI/状态因果，剧情更重事件/主题/人物关系，决策更重条件与机会成本。","人物向先按剧情证据决定叙事深度与目标字数，不用空悬念和重复概念撑时长；首尾兑现同一个人物问题。"],
      failureRefs:["SC_NO_LENGTH_PADDING","SC_NO_ANNOUNCEMENT_TONE","SC_THESIS_DELIVERY"],
      qualityGate:["作者型稿件的独到结论在正文中得到证据支撑，不只是结尾自称独特。","正文兑现命题","没有把分析写成官方事实"],
      outputSchema:["SCRIPT_DRAFT.md"],
      defaultExecutor:"Chat",alternativeExecutor:[],
      qcLevel:"Q1",legacyPromptIds:["07"]
    }),

    cap("SCRIPT_FACT_QC","Writing","Fact / Mechanic / Terminology QC",{
      purpose:"独立检查术语、数值、机制、版本、配队、排轴与证据边界。",
      whenToUse:["完整稿形成后","锁稿前"],
      requiredInput:["当前稿","证据/正式术语真值"],
      coreMethod:["审查第一人称实测、视频/数值引用是否真有来源，防止 AI 编造作者的测试与发现。","逐问题给位置/问题/正确依据/最低成本改法。","事实型 P1 未核实不能 PASS。"],
      failureRefs:["SC_LOCK_PROTECTION","RS_VERSION_BOUNDARY","RS_NO_FAKE_SOURCE"],
      qualityGate:["没有证据的亲测断言不得 PASS。","无未解决P0/事实型P1才PASS"],
      outputSchema:["SCRIPT_REVIEW_FACT.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      qcLevel:"Q2",legacyPromptIds:["08"]
    }),

    cap("SCRIPT_VALUE_QC","Writing","Content Value / Logic QC",{
      purpose:"检查核心命题兑现、逻辑链、信息增量、产品类型与收藏分享价值。",
      whenToUse:["完整稿形成后","锁稿前"],
      requiredInput:["当前稿","CORE_THESIS","产品类型"],
      coreMethod:["ACQUISITION 核实观众需求和制作ROI；CONVERSION/GOLDEN 必须检查作者发现、反例、信息增量和转粉价值。","逐段判断新认识/机制/因果/操作/误区/决策价值。","标 DELETE/KEEP/P0/P1。","检查标题/封面承诺是否由正文支撑。"],
      failureRefs:["SC_NO_LENGTH_PADDING","SC_THESIS_DELIVERY"],
      qualityGate:["全文删除泛泛复述后仍能保留独特结论。","核心命题完整兑现且无影响价值/逻辑P0/P1"],
      outputSchema:["SCRIPT_REVIEW_VALUE.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      qcLevel:"Q2",legacyPromptIds:["08B"]
    }),

    cap("SCRIPT_NATURALNESS_QC","Writing","Anti-AI / Retention QC",{
      purpose:"去模板化语言并检查前30秒与中段留存。",
      whenToUse:["完整稿形成后","锁稿前"],
      requiredInput:["当前稿"],
      coreMethod:["把禁句表当风险提示而非绝对禁词；检查逻辑是否具体、有明确动作主体、说话节奏像真人，保留原本自然的好句子。","扫描否定再肯定、反而、模板转场、空泛强调、重复总结、假互动和过度工整。","排查“更让我在意/真正改变的是”等自指式转场、无意义数字解读、反复自证推测、未解悬念堆积与未经要求的UP主自报姓名。","只给DIFF建议，不为了自然故意说乱。"],
      failureRefs:["SC_NO_ANNOUNCEMENT_TONE","SC_DIFF_MODE"],
      qualityGate:["自然度提升不能破坏事实、论证或原有表达个性。","真人可念、节奏有变化、没有明显AI模板堆叠"],
      outputSchema:["SCRIPT_REVIEW_NATURALNESS.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q2",legacyPromptIds:["09"]
    }),

    cap("SCRIPT_DIFF_REVISION","Writing","DIFF Revision",{
      purpose:"合并审核结果，对当前稿做最低成本修订并保留已确认部分。",
      whenToUse:["审核发现问题","新正式资料到达"],
      requiredInput:["当前稿","审核结果"],
      coreMethod:["同稿一次汇总事实、价值和自然度意见；只修有定位的缺陷，必要时整体连贯复核。","只改对应位置。","事实错误优先；新资料只影响相关段落。","修后再次检查受影响的事实/逻辑/自然度。"],
      failureRefs:["SC_DIFF_MODE","SC_LOCK_PROTECTION"],
      qualityGate:["不为了生成修改版本而改动已合格内容。","没有顺手全文重写","受影响审核项关闭"],
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
      coreMethod:["先确认本期采用真人录音还是剪映/其他AI朗读，不替用户强制切换。真人模式保持正式文本并按自然语义分块。","AI模式基于所选客户端实际上限分段，默认交每cue≤500可见字符的安全版；若适配需要另交≤300字符兼容版；按语义断句并优先减少朗读音频数量，不强行接近上限。","只在AI朗读副本处理多音字、生僻字、角色/组织名、英文、数字与易误读符号；将全部改写记入Pronunciation Map，正式SCRIPT_LOCK原文不动。","TTS_TEMP.srt每条安排可容纳朗读的临时时间槽，相邻cue故意留明显空档便于在剪映生成/挪动/拼接；间隔和槽长是导入占位而非音频真值，最终FINAL.srt重新依据AUDIO_MASTER对齐。","导出前检查每cue长度、排序、无时码重叠、锁稿全文片段映射、无漏字重字及改动范围；交付主版、按需兼容版与简明使用说明。"],
      failureRefs:["TL_TTS_TEMP_NOT_FINAL","TL_TTS_LIMIT_GAP","TL_TTS_LOCKED_TEXT_QC","SC_LOCK_PROTECTION"],
      qualityGate:["源SCRIPT_LOCK原文未变且可追溯","朗读文本仅含有记录的发音安全替换，段序/完整性核验通过","主版各cue不超过所选上限，相邻cue留有明确占位空档","临时时码明确不进入FINAL.srt"],
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
      whenToUse:["SCRIPT_LOCK后可以预制独立素材","TIMELINE_LOCK后可以做精确对齐视觉方向"],
      requiredInput:["本期已确认命题或文案","已有素材或官方参考（如涉及人物身份）"],
      optionalInput:["FINAL.srt与TIMELINE_MASTER（需要精确音画时）","已有素材描述"],
      coreMethod:["先明确画面服务真实证据、机制理解、情绪还是节奏；剧情人物类优先官方PV/剧情片段/角色展示和原创动态档案、关系图与意象。","用户不想录实机且公开官方素材可支持时跳过补录计划；必须靠正式实机证明的内容仍需可信证据，不用AI伪造。","已锁稿但无最终音频时，可以实际交独立MP4/可运行素材与语义段落标签，不阻塞视觉预制，也不猜成片精确时码。","TIMELINE_LOCK后再逐段建立证明/展示/对比/解释/氛围的真实音画锚点。"],
      failureRefs:["VS_NO_FAKE_GAMEPLAY","VS_FUNCTION_OVER_DECOR","VS_OPTIONAL_STYLE"],
      qualityGate:["视觉方案不会强迫同一视频每段都添加动效。","关闭声音仍能大致理解关键段落","视觉类型匹配内容类型"],
      outputSchema:["VISUAL_DIRECTION.md"],
      defaultExecutor:"Chat",qcLevel:"Q1",legacyPromptIds:["12"]
    }),

    cap("GAMEPLAY_RECORDING_PLAN","Visual","Gameplay Recording Plan",{
      purpose:"只为无法由现有资料替代的证据或成片镜头安排补录。",
      whenToUse:["缺正式服验证","缺关键游戏镜头","需要排轴实测"],
      whenNotToUse:["官方素材/现有录屏已足够","纯剧情/资料解析无需新实机"],
      requiredInput:["明确缺口/待证明问题"],
      coreMethod:["先查官方PV、剧情影像、档案与现有素材；用户明确不想录实机且资料足够时直接SKIP，不把补录作为标准必选项。","确有无法替代的正式服证据缺口时才说明需要哪一段实机；每项写证明什么、操作/状态、所需镜头、成功标准与备份。","减少‘随便打一局多录点’，优先明确最小证据需求。"],
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
      coreMethod:["先定义观众看完要理解的具体问题，再选关系图、时间线、HUD、档案或角色身份对照，不做纯装饰PPT。","明确剧情事实与象征性动画的界线和数据来源；无音频时允许提前制作独立可播放片段，先记录语义锚点，待真实时间线到位才定最终Shot。"],
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
      coreMethod:["生成前先写明COVER_MESSAGE与正文中回答该卖点的具体位置，检查问句前提和结果在常识因果上是否真正矛盾；若正文只讲不死的触发而没解释来源，封面不可宣称“为什么死不了/不死真相”。","角色封面必须先读取用户提供的官方立绘/视频截图，锁定面容、发色发型、眼睛、服饰、饰物和武器特征；缺真实参考先获取，不得靠陌生角色猜画。","4:3/3:4/16:9独立构图，不机械裁切；主图保持角色识别度，克制使用像素背景、HUD与光效。","生成后逐比例复查人物是否像官方角色、文字是否准确、主要卖点缩略图是否一眼可读；失败版本不要当成成品，必要时重做。","输出COVER_MESSAGE及其在正文中的兑现依据与TITLE_COMPLEMENT_RULE。"],
      failureRefs:["VS_IDENTITY_REFERENCE","VS_IDENTITY_AFTER_RENDER","SC_QUESTION_MUST_BE_ANSWERED","SC_FALSE_CONTRAST","PB_HEADLINE_CAUSAL_CHECK","PB_TITLE_COVER_PROMISE"],
      qualityGate:["正式参考下角色面容/发型/服装/武器可识别","正文明确回答封面问题且不存在伪反差","文字正确且缩略图可读","三比例各自构图且与真实已交付文件对应","没有廉价特效喧宾夺主"],
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
      whenToUse:["蓝图确实需要BGM/SFX","用户已有AUDIO_MASTER和最终字幕，希望直接得到独立混音轨"],
      requiredInput:["本期内容或声音命题","精确混音时必须可访问最终AUDIO_MASTER（或具备可靠完整时长的正式音频）"],
      optionalInput:["SOUND_DIRECTION.md","SOUND_CUE_MAP.md","FINAL.srt","已有可用BGM/SFX素材"],
      coreMethod:["SOUND_DIRECTION/CUE_MAP已存在则严格复用；若用户授权直接混音且只有AUDIO_MASTER和FINAL.srt，在本任务内先完成必要Cue设计，不因缺可选中间MD而阻塞。","音乐性需要经过实际试听：有明确旋律/和声/主题动机、自然起伏和情绪变化；禁止长时间嗡鸣、廉价鼓点或把音量合格当好听。","已有最终连续旁白且用户要完成品时优先真实渲染FINAL_BGM_SFX.wav：48kHz双声道、优先24-bit PCM、00:00同原点、总长与AUDIO_MASTER逐采样精确一致；只含BGM/SFX，绝不混入口播。","人声优先，按真实时间锚点留白、淡入淡出和音效，不要持续填满；默认保守响度、足够headroom，必要时参考-24 LUFS及不高于-6dBTP，最终由人耳微调。","无最终音频或用户要分轨时交分立素材并记录Cue和循环点；实际文件完成后更新FILE_EXISTS、Rights及使用建议。"],
      failureRefs:["TW_NO_FAKE_RENDER","PM_WRITE_TRUTH"],
      qualityGate:["Must Use声音FILE_EXISTS=YES或明确MISSING","最终预混不混入口播，00:00和总时长与AUDIO_MASTER一致","实际试听音乐的旋律/和声/情绪质量，技术数据不能替代听感","ffprobe确认48kHz立体声、24-bit（如可用）、安全峰值"],
      outputSchema:["FINAL_BGM_SFX.wav（最终AUDIO_MASTER已具备并要求独立混音时）","BGM/SFX分立文件（需要时）","SOUND_CUE_MAP.md","SOUND_PACKAGE_INDEX.md"],
      defaultExecutor:"Codex",alternativeExecutor:["Chat"],
      chatFallback:"Chat交精确生成/本地脚本；没有实际文件时不能标完成。",
      qcLevel:"Q1",legacyPromptIds:["16A"]
    }),

    cap("EDITING_BLUEPRINT","Edit","Editing Blueprint",{
      purpose:"在Codex执行前完成导演判断，让每个Shot/音频Cue可直接执行。",
      whenToUse:["Timeline与素材索引基本就绪"],
      requiredInput:["FINAL.srt","TIMELINE_MASTER","ASSET_INDEX","视觉/声音设计"],
      coreMethod:["核心机制镜头精确到真实时码，普通氛围镜头可使用轻量可执行描述；不为形式完整把低价值镜头逐帧规格化。","逐Shot写时间、旁白语义、素材ASSET_ID/真实路径、Source In/Out、构图、转场、动效、字幕/视觉锚点。","按真实 SRT 的每句语义锚点安排独立 Shot，使用最终 WAV 的真实总时长；当用户只给 FINAL.srt 和 WAV 时可在当前任务生成轻量 Shot Map，不因缺独立 Timeline MD 强制中断。","当用户指定单画面轨时，让官方视频和 Pixel 各占互斥镜头，不做叠加/画中画/重叠转场；指定必用的 Pixel 全部实质展示，官方片段依据真实 Source In/Out 非重叠选取，优先错落交替。","声音写BGM/SFX/Cue/Gain/Fade/Ducking（仅声音制作属于本轮时）；已有声音且只需画面时不重做音频。","素材不存在写MISSING，不把寻找/导演留给Codex。"],
      failureRefs:["TW_CODEX_EXECUTOR","VS_NO_FAKE_GAMEPLAY","TL_ZERO_ORIGIN"],
      qualityGate:["制作预算匹配内容等级，必要的音画锚点不丢。","Codex无需重新导演","所有引用路径/权限/时间真实可执行"],
      outputSchema:["CODEX_EDIT_BLUEPRINT.md"],
      defaultExecutor:"Chat",alternativeExecutor:["Work"],
      qcLevel:"Q2",legacyPromptIds:["18B"]
    }),

    cap("CODEX_BUILD","Edit","Codex Build",{
      purpose:"按既有蓝图执行，或在用户明确授权时以锁定音频、SRT、真实素材直接生成 Shot Map 并完成本地无声视频剪辑。",
      whenToUse:["CODEX_EDIT_BLUEPRINT通过预检","用户明确提供已锁真实音频/SRT和本地视觉素材并授权直接剪辑"],
      requiredInput:["CODEX_EDIT_BLUEPRINT，或可读取的最终录音+FINAL.srt+本地视频素材"],
      coreMethod:["先预检路径、锁定音频时长、SRT、视频内容和使用权限；无现成蓝图但用户授权直接剪辑时，自动生成包含 Source In/Out 的 Shot Map，完成后再渲染。","用户要求指定素材全用、官方片源尽量多用、同一片段不重复、两类素材互斥并交替时，分别作覆盖与区间检查；仅在语义或气质契合时选官方源，不能只凭帧索引猜画面。","纯画面任务只输出 FINAL_VIDEO_SILENT.mp4，不重新生成已有背景音；有声音制作要求时才输出 FINAL_BGM_SFX.wav。","遵守导出参数 1920x1080 / CFR 30 / H.264 / yuv420p / Rec.709 SDR；无声视频剔除音频/字幕/数据流，实际时长与最终 WAV 对齐，不加入静态封面或字幕。","每支视频检查全片 Shot 无重叠、无空档、无重复 Source 区间；逐项验收必用资产、无黑帧并用 ffprobe/解码确认渲染成功。","不覆盖原文件、不上传本地素材到 Git；先报告具体缺项，不临场篡改 LOCK 文案。"],
      failureRefs:["TW_CODEX_EXECUTOR","TW_NO_FAKE_RENDER","TW_LOCAL_NOT_GIT","TW_NO_OVERWRITE_MASTER"],
      qualityGate:["ffprobe 证明视频尺寸/编码/CFR/SDR/无音轨无字幕","音频与 SRT 共用 00:00 且成片与最终 WAV 时长匹配","必用素材已全部实质展示","相同官方 Source 时间区间不得重复","没有空白/重叠 Shot"],
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
      whenToUse:["正式锁稿完成后即可先做六平台文案","最终成片和真实字幕可用后补全章节与发布检查"],
      requiredInput:["经确认的正式锁稿或可核验成片内容"],
      optionalInput:["FINAL.srt/Timeline（只在精确章节时必需）","COVER_PACKAGE_INDEX（用来核对标题和封面）","PLATFORM_RULES_CHECK（投稿前实时核验）"],
      coreMethod:["先区分脚本版与发布终检版：SCRIPT_LOCK已确认即可生成六平台标题/简介/标签；缺真实SRT时章节留空且不可猜时码，缺成片时不自称看过正式成片。","每个平台先交一套经标题/封面/正文兑现检查的首选正式稿；只有切入角度实质不同且确有用处时才附少量备选，不强凑五个标题。","B站/抖音/小红书/微信视频号简中，YouTube/TikTok繁中；结合平台真实字段分别写，不只繁简转换。","B站和YouTube从已真实对齐的FINAL.srt或Timeline选择有内容价值的章节，精确使用原始开始时刻；无可靠时间锚点不虚构章节。B站弹幕投票按实际可用性和讨论价值建议，不凑两到四项。","发布前根据当期官方投稿规则核对标题字数、简介、封面比例、AI语音披露、素材许可及归属；动态限制无法核实就标投稿时以UI为准。","交付六份可直接复制的MD和必要的规则核验说明，不声称已投稿或后台已登记。"],
      failureRefs:["PB_LANGUAGE_TRACK","PB_TITLE_COVER_PROMISE","PB_HEADLINE_CAUSAL_CHECK","PB_ONE_PRIMARY_COPY","PB_ATTRIBUTION"],
      qualityGate:["锁稿阶段已完成可定案文案，真实章节/成片披露未验证时明确为待补的投稿检查，不伪造时间","终检阶段成片内容和文案一致","字段按最新平台规则核对","标题/封面/正文一致"],
      outputSchema:["PUBLISH_PACKAGE.md"],
      defaultExecutor:"Work",alternativeExecutor:["Chat"],
      qcLevel:"Q2",reviewMode:"APPROVAL_REQUIRED",legacyPromptIds:["21"]
    }),

    cap("ANALYTICS_REVIEW","Publish","Analytics / Review",{
      purpose:"基于真实发布数据判断点击、留存、收藏分享、转粉与下期Learning。",
      whenToUse:["发布后有真实数据"],
      requiredInput:["真实后台指标/截图/导出"],
      coreMethod:["按获客/转粉/黄金路线分别解释成绩；加入每千播放涨粉、评论是否记住作者结论、制作工时与可复用成果。","先整理METRICS_SNAPSHOT，不补造缺项。","区分选题/包装/内容/节奏/平台因素。","Learning只写可复用规则，不把单条偶然数据升级成永久原则。"],
      failureRefs:["RS_NO_FAKE_HEAT","PM_WRITE_TRUTH"],
      qualityGate:["复盘不会因为播放少直接否定有长期积累价值的作品。","结论可追溯到真实指标","Learning有适用范围"],
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

  return {VERSION:"2.0.1",CAPABILITIES:Object.freeze(C),BY_ID,DOMAINS,get,list,compact};
});


/* ===== GUCC CENTRALIZED GOVERNANCE MODULE ===== */

/* Six outcome-first creator prompts; shared by fixed Studio and dynamic Creator OS. */
(function(root,factory){
  const api=factory();
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.GuccCreatorSix=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  const VERSION="1.0.2";
  const ITEMS=Object.freeze([
    {id:"script",no:"01",name:"高质量文案",tag:"创作与审核一次完成",executor:"Work / Chat",needs:"游戏/区服/版本、主题、已确认的观点或素材（如有）",output:"SCRIPT_FINAL.md 或经用户确认的 SCRIPT_LOCK",goal:`请自行完成必要的官方资料与社区核实、选题判断、机制或人物研究、结构设计、完整稿写作、事实/价值/自然度审核及修订。用户不需要在中间逐项选择。先理解这期想解决的具体问题，围绕有证据的信息增量组织内容；第一手发现由用户确认，不虚构实测。内容路线按当前价值自由选择，热点获客内容可以短而精；高投入深度内容要有足够独到之处。
口播稿要直接、自然、有具体画面与实际行为，有节奏、可朗读。优先用肯定陈述写角色在干什么、为什么有效、怎么操作、怎样影响当期队伍与抽取，不写“我先看一件事”“补金怎么排？”等提纲式句头、空转折与生硬受众分类。机制解释融入叙述：现象→条件/资源→动作→结果/边界；必要术语给简短准确的对照。避免所有段落长度和转折完全对称；通过停顿、补充限定和自然纠正语序塑造真人口语，不故意编造口误或假装实测。长度由价值决定，不为了标准时长灌水。
复刻重评需要把版本环境、已实装队友与替代方案、账号持有情况、零本体/专武/关键命座的增量和机会成本贯穿全篇，并给出有依据的推荐顺序；不要用“因人而异”回避有根据的明确判断。如果与新角色同池或同期，必须综合比较两人都缺、只缺其一、只能抽一人、角色已齐后补专武或影画等具体情形；优先解释谁提供不可替代的机制、谁提高既有队伍上限、谁跨队可复用。可明确说“更推荐优先补X”，不滥用“我会把／我倾向／我反倒建议”做虚词缓冲；但“必须抽”限定在明确的账号目标下，不包装成所有人的刚需。版本尚未上线的部分可以提出清晰的机制推断，但不能伪称已经正式服实测。
若用户提供批注或自己改写的句子，以其文字和局部修改意图为准做 DIFF 修订；将明确要求同步应用到同批其余文章。自然开场简述视频要解决的问题，标题默认“【游戏】角色复刻攻略｜具体收益点”，结尾自然提醒点赞/关注，不机械复述全文关键词。用户对画面和素材的批注单独记录为可交付的视觉需求；未取得最终录音时只做独立动画片段与语义锚点，不虚构正式剪辑时间。
可自主合并研究与修订，自选结构和标题，不要先交大量策划报告。输出可直接录制的完整稿、必要且能核实的事实来源、关键未知或需用户定夺的核心观点。未批准不得自称 SCRIPT_LOCK。`},
    {id:"subtitle",no:"02",name:"声音对齐字幕",tag:"真实录音是时间依据",executor:"Work / Codex",needs:"本期真实最终音频 + 对应已确认文案（若有）",output:"FINAL.srt、术语核对摘要",goal:`请读取用户提供、确实可访问的最终录音，对声音进行真实识别与逐句/逐词时间对齐。真实音频决定每个时间戳；用户已确认的锁文决定字幕字形，必要时将实际口误/增删与锁文的差异标注并请求处理，不擅自改已锁定稿。校对游戏当前区服官方简体中文术语、角色和技能名称、标点、切分与必要停顿。
输出可直接导入剪辑软件的合法 SRT，序号连续、时间递增且不重叠，首尾与音频真实对应；提供有限的疑难词与差异列表。没有真实音频或工具无法处理时明确 NEED_AUDIO/NEED_TOOL，不得按字数估算时间或假装完成。`},
    {id:"visual",no:"03",name:"视觉素材包",tag:"直接交可用素材",executor:"Codex / Work",needs:"本期文案或已确认 SRT、可用的官方参考/实机、需要重点解释的内容",output:"可播放素材文件、素材索引与必要源文件；用户明确要求剪辑时可输出静音成片",goal:`自主理解本期要让观众看懂的机制、过程、人物或情绪，设计并尽可能实际制作精致、清晰、具有艺术感的视觉素材包。AI 可自行决定像素风、HUD、原生画面、简洁关系动画、UI切换或其他表现；无需用户先审批十份画面设计表。保留已提供角色的真实身份、官方轮廓与主要外观，不拿空泛 AI 人物替代。
优先检索并利用能够支持这期观点的官方PV、角色展示、正式剧情影像及已有素材；除非确有无法替代的实机证据需求，不把用户亲自录制游戏作为必经步骤。能取用的真实素材先核来源、许可与文件；缺的部分自主设计有明确解释价值的原创动画。动态需求交真实可播放短片/帧序列或可运行的本地工程，不以静态图片假冒动画；静态证据或封面素材可用静态文件。若用户要求每期至少N段动画，须实际逐期满足数量，保留上一轮已验证可用的素材，补足缺口并按机制、操作、配队、补金分配，不用只改标题的重复片段凑数。尽量直接生成本地可用于剪辑的文件并验证可播放性、分辨率、比例、时长和路径。锁稿后即可提前制作不依赖最终录音的独立动态素材、关系/档案/HUD片段并附语义锚点，最终音画对齐必须等待真实AUDIO_MASTER或已验证SRT；不因缺精确时码阻塞可独立完成的素材。按已有录音/字幕锚点规划，不要猜未取得的精确时间。素材文件只在真实生成并验证后标 FILE_EXISTS。若用户明确要求利用已有最终录音、FINAL.srt和本地真实视频素材直接剪辑，允许本轮自动制作含真实Source In/Out的Shot Map后渲染FINAL_VIDEO_SILENT.mp4；必须复用已有FINAL_BGM_SFX.wav而不重制，输出H.264/1080p/30fps、无音轨无字幕且与录音同长。影视风格以本视频明确给出的视觉/剪辑风格为准，不把电影感理解成随机乱剪PV。`},
    {id:"sound",no:"04",name:"BGM 与音效包",tag:"声音情绪与时间点",executor:"Codex / Work",needs:"真实录音或 SRT/Timeline、视频气质、现有可用音乐素材（如有）",output:"FINAL_BGM_SFX.wav（有最终录音时）或分立 BGM/SFX 素材、Cue 索引",goal:`根据视频内容、节奏、人物气质及真实录音自行设计并制作可用的背景音乐与音效素材包。优先保证人声清晰、情绪变化自然、转场有意义且有呼吸感。自行选择音乐段落、关键提示音、必要留白和淡入淡出，避免连续噪音与到处堆特效。
音乐需要有可听的主题动机、旋律/和声变化与自然的段落起伏；避免单一持续嗡鸣、廉价高频鼓点和密集无意义音效。制作后要试听实际听感，不以采样率或响度参数合格代替“好听”。最终连续 AUDIO_MASTER 已可访问时，本任务优先生成可直接导入剪映的 FINAL_BGM_SFX.wav：48 kHz Stereo WAV、优先24-bit PCM、与最终旁白从00:00同原点同总时长、只含BGM/SFX绝不混入口播；预混保守并留足headroom，依据真实SRT设置Cue、Fade、留白与Ducking。只有希望后续独立混音或尚无最终音频时才交分立音频资产。必须实测输出文件的时长、声道、峰值与听感，可附方便剪辑的 Cue/时间点与各素材来源/版权状态。需要精确对齐时以真实 AUDIO_MASTER 或合法 SRT 为时间依据；只有概念时给有价值的预制素材，不伪造锁定时码。工具无法生成时给最小可执行方案并标 PENDING_RENDER，不把文字蓝图当成完成的音效包。`},
    {id:"cover",no:"05",name:"正式封面",tag:"角色身份与缩略图表现",executor:"Image / Work",needs:"锁定命题/真实视频内容、角色官方形象参考、需要的发布比例",output:"16:9、4:3、3:4 图片（按需增加 9:16）",goal:`先提炼这一期最有吸引力且由内容兑现的一个观点或冲突，检查标题问句是否在正文找到实质答案，也检查所谓反差是否逻辑成立；只有触发原理和相关线索时，不用“为何会获得能力/真相揭晓”引人期待完整来源。独立构图设计高完成度封面，必须先实际查看本次给到的官方角色参考，锁定面容、发色发型、眼睛、服装配饰与武器；生成之后再逐比例复核身份，不匹配直接返工，不把错误角色当正式成果。审美上兼顾高级感、独特性、适度游戏/像素气质与缩略图易读性，避免廉价 AI 泛光、无意义粒子和花哨字体。
默认交 16:9、4:3、3:4 三种**分别适配构图**的成品；仅实际需要时增加 9:16。不强制五套文字候选，选一套最有力的主案，必要时给少量有明确差异的备选。图片文字需要真实可读，预览、比例与最终导出必须一致。未实际生成独立图片不得称三个比例均已交付。`},
    {id:"publish",no:"06",name:"六平台发布包",tag:"一套可发布的最终稿",executor:"Work / Chat",needs:"已确认的正式锁稿或可核验成片；真实 SRT 仅在生成章节时间时需要",output:"B站、抖音、小红书、视频号、YouTube、TikTok 可用发布文案",goal:`正式锁稿确认后即可先依据其实际内容生成六个平台可复制的标题、简介和标签发布草稿，不能因成片、封面或最终SRT尚未完成而整体阻塞；此时注明尚未核成片，所有精确时间章节留空。成片和已对齐SRT可访问后，仅局部补齐真实章节/音视频属性/版权及披露检查，不强制重写已确认文案。B站、抖音、小红书、微信视频号用简体中文；YouTube、TikTok 用繁体中文。各平台按观众习惯适配标题/简介/标签/必要的章节，不简单机翻与全平台一字不改。
默认每个平台一套首选成品；备选只有真正有价值才附，不凑五套标题或投票。投稿标题与封面逐一检验正文是否真有对应答案、问句因果是否合理，避免“看似矛盾实际理所当然”或只提供线索却承诺彻底揭秘。B站和YouTube章节只从真实对齐SRT/Timeline中选取有信息增量的语义节点，不要求硬凑固定章节数。针对发布时需要的字段、许可、AI披露和视频尺寸等规则，联网核实实际平台并区分确认与待确认。章节时间只能来自真实对齐过的时间线，不虚构。可生成发布草稿，但不得自行声称已上传/发布或擅自进行真实投稿。`}
  ]);
  const COMMON=`【创作自主权】你可以自主决定研究深度、结构、风格、工具选择、视觉设计及必要中间处理；通常一次完成本交付物范围内的研究/制作/QC/修订。不必先生成策划报告或向用户逐个询问普通技术问题。本轮只交当前一项正式成果，不自动执行其余五项。
【少量硬性边界】
- 以本次游戏、区服、版本及真实正式公开资料为准，区分官方确认、可观察实机、公开资料分析、未知与未公开资料。无法核验时标明，不编造具体数值/亲自实测或角色身份。
- 已有核心命题、SCRIPT_LOCK、AUDIO_LOCK、TIMELINE_LOCK 和正式产物不可擅自覆盖。真实录音是时间真值，锁定稿是文字真值。缺关键文件时只停受影响部分。
- 明确避免常见 AI 口播套话与结构：“大家可能以为”“不是A而是B”“真正/其实/所以/值得注意的是”作空转折、“接下来我们来看”“简单来说”“总而言之”“从某种意义上说”，以及无内容的重复总结。不是逐字词汇黑名单：当具体含义、自然语气或原稿引用确实需要时可以使用；关键是不用套路代替清楚解释。
- 输出面向观众的内容不要混入内部 Prompt、TODO、工作日志、AI 自夸。只有实际创建并核验的文件才写已完成；未生成的列出精确缺项。所有提供下载的实体文件名、压缩包名和文件夹路径优先使用ASCII英文、数字、下划线或连字符，中文用于文件内容和展示标题，避免浏览器下载时显示百分号编码。
【交付方式】优先直接交一个完整、可用的正式成果；仅附必要的证据说明、真正影响下一步的缺口与最短 NEXT_HANDOFF。不要强制多份重复 MD、JSON、全阶段计划。`;
  function get(id){return ITEMS.find(x=>x.id===id)||ITEMS[0];}
  function build(id,context={}){
    const item=get(id),routes={mechanism:"机制专题",preview:"前瞻解析",guide:"正式攻略",rerun:"复刻重评",decision:"抽卡决策",rotation:"实战排轴",story:"剧情人物",creative:"创意内容"};const r=routes[context.route]||String(context.route||"机制专题"),shape=String(context.format||"long")==="short"?"短内容：按照真实信息密度精简。":"长内容：允许深入，但不为时长或章节数量灌水。";
    const field=[["项目",context.title],["游戏",context.game],["区服",context.server],["版本／资料截止",context.version],["内容形式",shape],["观众问题",context.audienceQuestion],["作者问题",context.authorQuestion],["作者贡献（必须可核实）",context.authorContribution],["核心命题",context.coreThesis],["本视频视觉与剪辑风格",context.visualStyle],["用户补充",context.notes]].filter(([,v])=>typeof v==="string"&&v.trim()).map(([k,v])=>k+"："+v.trim()).join("\n");
    return `【GUCC 六项创作成果 · ${item.no}／06 · ${item.name}】
【本轮目标】${item.goal}
【内容类型】${r}（按照实际题材选择适合的表达形式）
【项目已知信息】
${field||"沿用本 Chat 已确实获得的真实上下文；没有必要请用户重填空白字段。"}
【必要输入】${item.needs}
【正式交付】${item.output}

${COMMON}
【最终结果】只报告本项实际交付及必要的未完成条件，不要输出全流程再设计。`;
  }
  return {VERSION,ITEMS,COMMON,get,build};
});

/* ===== GUCC CENTRALIZED GOVERNANCE MODULE ===== */

/* Canonical prompt catalog. Pure builders; no network or implicit project writes. */
(function(root){'use strict';
const VERSION='6.2.0';
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
通过立项才整理 Contract：PROJECT_ID/NAME、GAME/SERVER/VERSION/DATA_CUTOFF、PRODUCT_TYPE/FORMAT/PLATFORMS、CORE_PLAYER_QUESTION/CONTENT_INCREMENT、CORE_THESIS（未确认UNCONFIRMED）、CURRENT_STAGE、VERIFIED_FACTS/REASONED_ANALYSIS/UNKNOWNS/DO_NOT_USE、OFFICIAL_TERMINOLOGY、AVAILABLE_ARTIFACTS、LOCKED_ARTIFACTS、PRODUCTION_NEEDS与NEXT_HANDOFF。各资源需求标REQUIRED/CONDITIONAL/NOT_PLANNED和原因，只是可调整计划。未知字段UNKNOWN，不提前写正文或宣告LOCK。\nPROJECT_ID 由本步骤自动提出，不要求用户预先填写：优先采用“游戏短码-版本或日期-简短中文主题”的人类可读格式，例如 ZZZ-3.3-菲欧妮前瞻；不要加随机哈希，不为了机器唯一性生成难读字符串。若当前输入或已提供的 VIDEO_CONTRACT 已经有 PROJECT_ID，则原样沿用。一旦该项目的 PROJECT_ID 被用户接受，后续即使标题措辞调整也不自动改名；只有用户明确建立新项目或要求改 ID 时才重新生成。`,[['立项判断','只完成需求、竞品、信息增量与立项结论，交PROJECT_BRIEF.md，不先写正文。'],['项目约定','沿用真实立项结果，交VIDEO_CONTRACT.md。未通过时只记录当前状态与等待项，不默认GO。']]],
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
taskExtra('brief', '遵守频道 CURRENT 战略：先分类 ACQUISITION / CONVERSION / GOLDEN。获客快线验证版本需求、时间窗口、事实可靠及制作ROI；CONVERSION/GOLDEN 必须明确作者本人会不会看、AUTHOR_QUESTION、可验证 AUTHOR_CONTRIBUTION。作者贡献没有证据时标 UNCONFIRMED，不虚构亲测；不能成立高成本长视频则建议 SHORT/HOLD/CANCEL。');
taskExtra('discovery', '区分社区高热度问题和作者本人实际好奇/想验证的问题；研究优先提供能够改变结论的证据与反例，不重复铺满竞品百科。');
taskExtra('outline', '除 CORE_THESIS 外明确观众价值与作者可验证贡献。版本获客快线只保证可靠且高效解决需求；作者深度线说明本片独有发现、论证链和反例。未有一手证据时禁止捏造作者试验。');
taskExtra('script', '按内容路线写：ACQUISITION 简短清楚解决高频问题，CONVERSION/GOLDEN 围绕真实作者问题与可证实发现组织论证。每段有新信息、具体动作或反例；用户没有亲自实测时不要写“我实测发现”。自然口播优先于规则化句式规避。');
taskExtra('audit', '对同一正式稿件版本核三维标准，避免跨版本来回修改；必要问题一次合并修订，保留已经自然且正确的原句。CONVERSION/GOLDEN 核作者贡献与一手证据，ACQUISITION 核实内容ROI。');
taskExtra('publish', '默认每平台1套推荐成品文案及最多2套有明确差异的备选，更多标题仅用户明确要求时提供；不要凑章节和投票。优先交能直接复制发布的最终稿。');
taskExtra('retrospective', '获客内容对照成本与有效新增观众；作者型内容重点看每千播放涨粉、观众能否记住独有论证、作者是否仍愿完整看一遍与可复用的研究资产。');
const PART_IO={
brief:[
 {inputs:'游戏 / 区服 / 版本 / 视频想法；同一Chat已有热点、观众问题与限制直接沿用',outputs:'PROJECT_BRIEF.md（立项结论、信息增量、风险、建议形式）'},
 {inputs:'刚完成的PROJECT_BRIEF.md或同一Chat中的真实立项结论；若已有旧VIDEO_CONTRACT则沿用其中PROJECT_ID',outputs:'VIDEO_CONTRACT.md（AI自动提出/沿用人类可读PROJECT_ID；未通过立项则只记录状态与等待项）'}
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
const COMMON=`【频道战略｜当前正式目标】先区分 ACQUISITION 获客快线、CONVERSION 作者转粉、GOLDEN 高价值作品；未确认就给候选和依据，不把 AI 的归纳写成用户亲自发现或亲测。获客内容核需求、时效和制作ROI，轻量完成；作者型内容必须明确 AUTHOR_QUESTION 与可验证的 AUTHOR_CONTRIBUTION，并允许没有好题时停止高成本长视频。用户当前决定的单片命题与锁定成果高于通用模板。\n【单步约定】只完成本条明确工作；合并的子工作属于本轮范围，不自动执行下游。编号仅查找。同一Chat已实际取得的文件/结论直接复用，跨环境只继承真实可读输入；Contract可用则读，缺可选资料先完成能确定部分，缺关键事实/时间/身份才NEED_INPUT。
【真值与LOCK】使用当前游戏/区服官方简中术语；区分官方确认、真实画面/实机、公开分析、未知、未公开资料。不能把传闻/拆包当官方。修订默认DIFF MODE，不改已确认LOCK；最终录音是时间真值，锁文是字幕文字真值，时间锁后同00:00。用户当前要求优先于早期资源计划。
【真实交付】实际工具写入并回读才称已保存/更新；无工具交完整可保存内容/可运行脚本并标待执行，文件存在且验证才FILE_EXISTS=YES。不把制作文件推Git，大素材留本地。只交正式产物、真实完成/缺项与短NEXT_HANDOFF，不展开下游。
【素材】保持ASSET_ID、路径/basename、时长、真实时间、对应旁白、用途/限制与描述MD；记SOURCE_URL/OWNER、RIGHTS_STATUS、EDIT_USE_ALLOWED、ATTRIBUTION_REQUIRED/TEXT、AI_GENERATED_OR_ASSISTED/GENERATOR_TOOL及许可备注。官方公开≠无限制许可，社区未授权只研究。观众产物不夹LOCK/TODO/Prompt/工作日志。`;
function route(id){return ROUTES.find(x=>x.id===id)||ROUTES[0];}
function task(id){return tasks.find(x=>x.id===id)||tasks[0];}
function parts(id,mode){const t=task(id);if(mode==='Chat'&&t.fallback?.length){const io=PART_IO[id]||[];return t.fallback.map(([name,body],index)=>({name,body,index,inputs:io[index]?.inputs||t.inputs,outputs:io[index]?.outputs||t.outputs}));}return[{name:t.name,body:'',index:0,inputs:t.inputs,outputs:t.outputs}];}
function build(id,c={},mode='Chat',partIndex=0){
 const t=task(id),r=route(c.route),ps=parts(id,mode),p=ps[partIndex]||ps[0],split=mode==='Chat'&&Boolean(t.fallback?.length);
 const ctxLines=[['项目',c.title],['游戏',c.game],['区服',c.server],['版本/截止',c.version],['内容定位',c.contentLane],['作者问题',c.authorQuestion],['作者贡献（需有证据）',c.authorContribution],['核心命题',c.coreThesis],['目标时长',c.duration],['本轮补充（可选覆盖）',c.notes]].filter(([,v])=>String(v||'').trim()).map(([k,v])=>`${k}：${String(v).trim()}`);
 const ctx=ctxLines.length?`【项目上下文｜仅列工作台已填写项】\n${ctxLines.join('\n')}\n未填写项直接沿用同一Chat已经确认的上下文；不要为了模板完整逐项追问。\n`:'【项目上下文】直接沿用同一Chat已确认的项目与文件；没有新的补充项，不要要求用户逐项填写。\n';
 const lens=t.lens?`【${r.name}分支】\n${r[t.lens]}\n${['brief','analysis','outline','script','audit'].includes(id)?r.research:''}\n`:'';
 const format=c.format==='short'?'短内容：只解一个问题，减非必要证据/章节/流程，开场按实际时长缩短，不硬扩长攻略。':'长内容：解释深度与章节服务命题，不为完整而拉长。';
 const voice=id==='read'?(c.voiceMode==='ai'?`【朗读方式】剪映AI朗读。必须输出TTS_TEMP.srt与TTS_PRONUNCIATION_MAP.md；临时SRT每cue≤500可见字符，优先完整语义与自然停顿，专为正确发音改写，绝不作为最终字幕/真实时间线。\n`:`【朗读方式】真人录音。输出自然朗读稿，不生成虚构时间戳。\n`):''; const scope=split?`【Chat备用 ${p.index+1}/${ps.length}：${p.name}】\n本条只执行这个子任务；以下总规格仅约束，不授权提前执行其余子任务。同一Chat沿用上轮结果，换Chat需提供已完成产物。\n${p.body}\n`:'';
 const capability=['ingest','organise','render','visualpack','sound'].includes(id)?'检查真实文件/执行工具；Chat无本地执行能力时给脚本与回读步骤，不称已渲染。':id==='align'?'必须真实音频/对齐工具；纯文字不能推精确时间。':id==='analysis'||id==='qc'?'先确认实际看/听能力，不能以字幕冒充画面确认。':id==='cover'?'成图需图像生成/编辑工具，无工具明确待成图。':'使用实际可用工具。';
 return `【任务：${t.name}${split?'／'+p.name:''}】\n【环境】${mode}。${capability}\n\n${ctx}内容类型：${r.name}\n${format}\n${voice}\n${COMMON}\n\n【所需输入】${p.inputs||t.inputs}\n\n${lens}\n${scope}\n${split?'【本轮专项质量底线】'+({align:'真实音频决定时间，锁文决定字幕字形；无法真实对齐就如实标记未完成。',audit:'同一个当前稿件版本分别审核事实、内容价值与自然度，保留合格段落，只对定位问题给出差异修订。',publish:'标题和封面必须兑现正文；平台规则要有实时官方来源；每平台默认一套推荐正式文案和至多两套实质不同的备选，只有需要才提供更多。',visualpack:'实际生成动态成品、验证文件与角色官方身份，不用静态PPT冒充动态视觉；无本地执行条件明确交付状态。',render:'严格遵守LOCK与蓝图，无真实渲染不得称文件已生成；音画时间从00:00对齐。',analysis:'必须区分真实音画证据与推论；不能把只读字幕当成已看过视频。',ingest:'文件真值由实际下载探测决定；保留Master/Proxy时间映射，不得虚构路径或文件。'}[id]||'当前子任务必须保留原任务的事实边界、正式LOCK和交付真实性，不提前执行其余步骤。')+'\n':'【执行要求】\n'+t.body+'\n'}\n\n【正式输出${split?'：本轮仅交子任务对应产物':''}】${p.outputs||t.outputs}\n【NEXT_HANDOFF】简短说明实际产物、关键缺项、以后需提交的真实文件，不自动执行下一条。`;
}
const api={VERSION,STAGES,ROUTES,tasks,COMMON,route,task,parts,build};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.CreatorPrompts=api;
})(typeof window==='undefined'?globalThis:window);


/* ===== GUCC CENTRALIZED GOVERNANCE MODULE ===== */

;(()=>{const g=typeof window!=="undefined"?window:globalThis;const api={core:g.GuccCreatorCoreRules,fail:g.GuccCreatorFailurePrevention,caps:g.GuccCreatorCapabilities,six:g.GuccCreatorSix,prompts:g.CreatorPrompts,VERSION:"2026-11-10"};g.GuccCreatorGovernance=api;if(typeof module==="object"&&module.exports)module.exports=api;})();
/* Every generated prompt carries the canonical governance entrypoint. */
;(()=>{
 const g=typeof window!=="undefined"?window:globalThis;
 const entry="【GUCC Creator OS 完整规范】https://github.com/Inertia77/GUCC/blob/main/apps/video-workspace/creator-governance/CREATOR_RULEBOOK.md\n【相关能力细则】同目录 CAPABILITY_RULES.md / TASK_RULES.md。只能在确实读取后声称已读取；执行仍须遵守本 Prompt 的完整专项要求。";
 for(const key of ["six","prompts"]){const obj=g.GuccCreatorGovernance&&g.GuccCreatorGovernance[key];if(!obj||typeof obj.build!=="function")continue;const original=obj.build;obj.build=function(...args){return entry+"\n\n"+original.apply(this,args);};}
})();
