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
