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
        "默认规避“不是A而是B”“你以为A其实B”“反而才是”“接下来我们来看”“一句话总结”等模板句。"
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
        "时间线锁后，画面与声音围绕相同语义锚点并行设计。"
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
        "解释动画应表现现象 → 原因 → 操作 → 结果，而不是静态 PPT。"
      ]
    }),
    codex:Object.freeze({
      title:"Codex Rules",
      hard:[
        "Codex 是执行器，不是导演：详细视觉、剪辑和声音判断应在蓝图阶段完成。",
        "Codex 只使用真实可访问的本地文件；路径不存在时报告缺失，不能自造替代文件。",
        "默认画面输出 FINAL_VIDEO_SILENT.mp4：1080p / 30fps / H.264 / 无音轨 / 无字幕。",
        "默认声音输出 FINAL_BGM_SFX.wav：48kHz，仅 BGM / SFX，从 00:00 与旁白同时间原点；口播不混入背景轨。"
      ],
      best:[
        "本地文件、视频、音频、图片、FFmpeg、批处理、动画资产、蓝图执行与成片适合 Codex。",
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
        "Bilibili / YouTube 生成真实时间章节；B站按内容准备弹幕投票建议。"
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
    VERSION:"2.0.0",
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
