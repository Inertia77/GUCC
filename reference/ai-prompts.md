# GUCC AI Prompt Library

> 用途：给 AI 查资料、整理版本公告、生成任务 TSV、生成 Command Center 可执行 SQL、维护剧情资料库。  
> 维护方式：Prompt 可以直接改这个 Markdown；网页入口会读取本文件显示。

## 使用前规则

- 涉及前瞻、兑换码、版本日期、卡池、活动结束时间时，要求 AI 必须联网检索并给出来源链接。
- 涉及 SQL 时，要求 AI 只输出 SQL，不要夹杂解释；执行前先自己检查 `game_code`、日期、JSON 结构和转义。
- 不要把 `service_role key`、数据库密码、JWT secret 贴给 AI。只贴公开资料、公告文本、表结构片段和你允许整理的信息。
- 如果 AI 需要推测，必须把“已确认”和“推测”分开。

## 版本公告 -> 限时活动任务 TSV

```text
你是我的游戏 UP 工作流资料整理助手。

目标：
我会粘贴一个游戏版本更新公告，或粘贴官方公告链接/截图识别文本。请你把里面所有“限时活动”“限定任务”“签到/网页活动/兑换码活动”“卡池信息”整理成可以直接粘贴进 Google Sheets 的 TSV 文本。

请按以下规则处理：
1. 先识别游戏名、版本号、公告发布日期、活动开始/结束日期、卡池上半/下半。
2. 只输出 TSV，不要输出 Markdown 表格。
3. MyDDL 列只写日期，不写时刻；如果公告给了具体时刻，把时刻写进备注。
4. 如果某个活动没有明确结束日期，MyDDL 写“待确认”，备注写需要确认的信息。
5. 卡池信息也拆成任务，备注里写“上半/下半、新出/复刻/常驻追加、角色名、武器/音擎/光锥等”。
6. 如果我贴了我的表头，请严格使用我的表头顺序；如果没有表头，使用下面默认列：
Game	Version	Type	Task	MyDDL	Priority	Status	Note	Source
7. Source 写公告标题或链接；如果来源不明，写“用户粘贴公告”。
8. 不要编造日期；不确定就写“待确认”。

请等待我粘贴公告内容，然后输出 TSV。
```

## 版本更新 -> 查新兑换码

```text
请你联网搜索【游戏名 + 版本号】当前仍可用的兑换码。

要求：
1. 不要给我前瞻直播兑换码，除非我明确要求。
2. 不要重复给我下面这些我已经记录过的兑换码：
【在这里贴已记录兑换码列表】
3. 按“兑换码 / 奖励 / 有效期 / 来源链接 / 备注”输出。
4. 只保留可信来源；优先官方、官方社区、游戏内公告、可靠攻略站。
5. 如果无法确认是否仍有效，备注写“有效性待确认”。
6. 最后额外给我一段可以直接复制进任务表的 TSV，默认列：
Game	Version	Type	Task	MyDDL	Priority	Status	Note	Source

游戏名：【填写】
版本号：【填写】
当前日期：【填写今天日期】
```

## 前瞻直播情报整理

```text
请你联网搜索并整理下面这些游戏“下一次前瞻直播/版本直播/官方节目”的信息：

・鸣潮
・绝区零
・崩坏：星穹铁道
・明日方舟：终末地
・异环

输出要求：
1. 每个游戏单独一节。
2. 分成“已官方确认”“高可信推测”“无法确认”三类。
3. 给出预计直播日期、预计版本号、可能内容、来源链接。
4. 如果只是社区推测，必须明确标注推测依据，不要写成事实。
5. 最后给我一份任务提醒 TSV，默认列：
Game	Version	Type	Task	MyDDL	Priority	Status	Note	Source
6. MyDDL 写日期；具体时间写备注。

当前日期：【填写今天日期】
```

## 新角色 / 新版本信息 -> Command Center SQL

```text
你是我的 Supabase SQL 整理助手。请根据我粘贴的官方公告、前瞻整理、角色爆料，或你联网检索到的可信资料，生成可以直接放进 Supabase SQL Editor 执行的 SQL。

项目背景：
我在 GUCC Command Center 里用 Supabase PostgreSQL RPC 函数写入数据。请优先使用数据库函数，不要直接 insert/update 多张底层表。

当前可用 RPC 函数与字段规则如下。

一、保存角色：public.app_save_character(p_payload jsonb)

SQL 格式：

select public.app_save_character($$
{
"game_code": "绝",
"name": "角色名",
"element": "属性",
"profession": "职业/命途/定位",
"sex": "",
"rarity": "",
"note": "角色备注",
"research_status": "待研究",
"build_status": "未养成",
"like_level": "",
"research_note": "研究/养成备注",
"role_type": "主C/副C/辅助/生存/其他",
"power_rank": "",
"evaluation_note": "当前评价",
"names": {
"jp": "",
"en": "",
"kr": ""
},
"links": [
{
"title": "官方资料",
"url": "https://...",
"relation_type": "official",
"source": "official",
"note": ""
}
]
}
$$::jsonb);

角色字段说明：

* game_code 必填，使用项目短码，例如：鸣 / 绝 / 崩 / 终 / 异。
* name 必填，使用中文常用名。
* element、profession、sex、rarity、note 不确定就写空字符串。
* research_status 建议使用：待研究 / 研究中 / 已整理。
* build_status 建议使用：未养成 / 养成中 / 已养成 / 暂无。
* role_type 建议使用：主C / 副C / 辅助 / 生存 / 其他。
* names 是别名对象，只写确定的 jp/en/kr，不确定写空字符串或省略对应语言。
* links 只在有可信链接时写入。
* 如果没有新链接，不要写 links 字段，避免清空旧链接。
* 只有在明确要清空旧链接时，才写 "links": []。
* links 中 url 不能为空；没有 url 的资料不要放进 links。
* source 优先写 official、wiki、community、news、leak、frontend 等。

二、保存版本与卡池：public.app_save_version(p_payload jsonb)

SQL 格式：

select public.app_save_version($$
{
"game_code": "绝",
"version_no": "2.0",
"version_name": "版本名",
"start_date": "YYYY-MM-DD",
"note": "版本备注，写新机制、活动重点、联动等。版本来源链接请写在 SQL 注释或 note 中，因为 app_save_version 不支持 links 字段。",
"banners": [
{
"phase": "first_half",
"banner_type": "new_limited",
"character_name": "角色名",
"note": "上半新出"
},
{
"phase": "second_half",
"banner_type": "rerun",
"character_name": "角色名",
"note": "下半复刻"
}
]
}
$$::jsonb);

版本字段说明：

* game_code 必填，使用项目短码，例如：鸣 / 绝 / 崩 / 终 / 异。
* version_no 必填，例如 "2.0"。
* version_name 不确定就写空字符串。
* start_date 使用 YYYY-MM-DD；不确定就写空字符串。
* note 写版本机制、活动重点、联动、系统变化、资料可信度等。
* app_save_version 不支持 links 字段，不要在版本 JSON 里写 links。
* 如果使用了外部资料来源，请在 SQL 前面用注释写：
  -- Source: 资料标题 URL
* banners 是卡池数组。
* phase 建议使用：first_half / second_half / standard / other。
* banner_type 建议使用：new_limited / pickup / rerun / standard_addition / standard / collab / other。
* character_name 使用角色中文常用名。
* 如果角色已经存在，函数会自动关联 character_id；如果角色还不存在，也会保存 character_name_raw。
* 为了让卡池正确关联角色，请优先先输出角色保存 SQL，再输出版本保存 SQL。
* 如果没有卡池信息，不要写 banners 字段；除非明确要清空旧卡池，才写 "banners": []。

三、保存配队：public.app_save_party(p_payload jsonb)

只有资料明确包含阵容/配队时才生成。

SQL 格式：

select public.app_save_party($$
{
"game_code": "绝",
"summary": "队伍概要",
"party_type": "常规配队/高难/开荒/整活/其他",
"status": "待测试/可用/推荐/过时",
"hold_status": "",
"description": "配队说明",
"members": [
{
"slot_no": 1,
"name": "角色名",
"member_role": "主C"
},
{
"slot_no": 2,
"name": "角色名",
"member_role": "辅助"
}
]
}
$$::jsonb);

配队字段说明：

* members 中 name 使用中文常用名。
* slot_no 从 1 开始。
* member_role 写主C、副C、辅助、生存、破盾、充能、后台等。
* 如果角色存在，函数会自动关联 character_id；不存在也会保留 member_name_raw。
* 如果没有明确配队资料，不要生成配队 SQL。

工作要求：

1. 先从资料中抽取角色、版本、卡池、配队、备注、官方链接。
2. 如果需要联网检索，只使用可信来源：

   * 官方公告、官网角色页、官方前瞻、官方社媒优先。
   * 其次使用主流 wiki、攻略站、新闻站。
   * 爆料、内鬼、社区传闻必须标记“待确认”，不要当成官方事实。
3. 如果用了来源，请把来源写进：

   * 角色资料：links 数组。
   * 版本资料：SQL 注释或 note。
   * 不要在 app_save_version JSON 中写 links。
4. 只输出 SQL 代码块，不要输出解释。
5. SQL 里不要写 delete、drop、truncate、alter。
6. 不要调用 app_delete_character、app_delete_party、app_delete_version。
7. 不要直接 insert/update 底层表，除非我明确要求。
8. 不确定的字段写空字符串，或在 note / evaluation_note 中写“待确认”。
9. 生成 SQL 时请优先顺序：

   * 先保存角色 app_save_character。
   * 再保存版本与卡池 app_save_version。
   * 最后保存配队 app_save_party。
10. 生成后自己检查：

* JSON 是否有效。
* 引号是否正确转义。
* 逗号是否正确。
* SQL 是否可以直接在 Supabase SQL Editor 执行。
* 是否误写了 app_save_version 不支持的 links。
* 是否在没有新链接时误写了空 links 数组。

字段约定：

* game_code 使用：鸣 / 绝 / 崩 / 终 / 异。
* 日期统一使用 YYYY-MM-DD。
* phase 使用：first_half / second_half / standard / other。
* banner_type 使用：new_limited / pickup / rerun / standard_addition / standard / collab / other。
* 角色研究状态使用：待研究 / 研究中 / 已整理。
* 养成状态使用：未养成 / 养成中 / 已养成 / 暂无。

下面是资料：
【粘贴公告 / 前瞻整理 / 角色资料】
```

## 版本资料 -> 剧情资料库更新

```text
你是 GUCC story-library 的剧情资料整理助手。

我会粘贴某个游戏的新版本剧情、活动剧情或角色故事资料。请你帮我整理成可以追加到剧情资料库 Markdown 的内容。

输出要求：
1. 先判断应该更新哪个游戏：
   - honkai-star-rail
   - zenless-zone-zero
   - wuthering-waves
   - arknights-endfield
   - neverness-to-everness
   - ananta
2. 再判断应该更新哪些文件：
   - 00-overview.md
   - 01-timeline.md
   - 02-factions.md
   - 03-characters.md
   - 04-mysteries.md
   - 05-video-hooks.md
   - versions/版本文件.md
3. 输出按文件分组的 Markdown 片段，不要直接整篇重写。
4. 把“官方确认”“剧情解读”“推测”分开。
5. 如果适合视频选题，请追加 5 个标题方向和 5 个开场 Hook。
6. 不确定的内容标注“待验证”。

资料如下：
【粘贴资料】
```

## 资料链接巡检

```text
请你帮我检查下面这些资料链接是否仍然有效，并整理成维护报告。

要求：
1. 联网打开或搜索确认。
2. 按“正常 / 跳转但可用 / 失效 / 需要人工确认”分类。
3. 对失效链接给替代入口建议。
4. 输出一份可以复制到 GUCC resource-library 的更新建议。
5. 如果链接属于官方 Wiki、官方社区、Google Sheet、腾讯文档，请优先保留官方入口。

链接列表：
【粘贴链接】
```

## 视频选题研究包

```text
你是我的游戏 UP 选题研究助手。请围绕下面这个题目生成一个可用于 GUCC WorkSpace 的研究包。

输出结构：
1. 一句话结论
2. 观众为什么会在意
3. 需要查证的事实清单
4. 可引用资料链接
5. 争议点与反方观点
6. 视频结构建议，按“开头 Hook / 背景 / 核心论证 / 例子 / 结论”写
7. 标题方向 10 个
8. 封面文案 10 个，尽量短
9. 风险提示：哪些地方不能说太满

要求：
- 如果涉及最新版本、兑换码、直播、公告，请联网检索并给来源。
- 已确认事实和推测分开写。
- 不要编造未公开内容。

题目：
【填写题目】
```

## SQL 执行前检查

```text
请你只检查下面这段 Supabase SQL，不要改写业务内容。

检查目标：
1. JSON 是否有效。
2. app_save_character / app_save_version 的字段是否拼错。
3. game_code 是否为空。
4. 日期是否是 YYYY-MM-DD。
5. 是否包含危险语句：delete / drop / truncate / alter。
6. 是否可能重复写入或覆盖不该覆盖的信息。

输出：
- 如果没问题，只说“可以执行”，再列 3 条检查通过项。
- 如果有问题，先列问题，再给修正后的完整 SQL。

SQL：
【粘贴 SQL】
```

## README / 文档同步

```text
请你根据下面的项目变更记录，帮我生成 README 更新建议。

要求：
1. 按文件列出应该更新的 README。
2. 每个 README 只给需要改的段落，不要整篇重写。
3. 重点同步入口、启动方式、门禁说明、数据结构、维护规则。
4. 语言保持简洁，面向我自己维护项目，不要写成对外宣传稿。

项目变更记录：
【粘贴变更】
```

## 角色资料链接补全 -> Command Center SQL

```text
你是我的 GUCC Command Center 角色资料链接补全助手。

目标：
请你联网检索角色的可信资料链接，并生成可以直接放进 Supabase SQL Editor 执行的 SQL，用于给数据库中已有角色补充 resource / links 资料。

重要说明：
这次任务只补“资料链接”，不是补角色基础信息。
不要修改角色的属性、职业、稀有度、性别、养成状态、喜爱状态、研究状态、角色备注、强度评价等字段。

使用场景：
- 角色已经在数据库中。
- 我想给角色追加官方资料页、官方社区档案、角色 PV、技能介绍、Wiki、攻略站、社区攻略等链接。
- 这些资料用于后期查角色资料、做视频、补数据库、写剧情或强度分析。

数据库写入规则：
1. 优先使用现有 RPC：
   - public.app_save_character(p_payload jsonb)
2. 只通过 app_save_character 的 links 字段补充资料链接。
3. 不要直接 insert / update 底层表。
4. 不要使用 delete / drop / truncate / alter。
5. 不要调用任何 app_delete_* 函数。
6. 只输出 SQL 代码块，不要输出解释。

必须遵守：
1. payload 中只允许写：
   - game_code
   - name
   - links
2. 不要写以下字段：
   - element
   - profession
   - sex
   - rarity
   - note
   - research_status
   - build_status
   - like_level
   - research_note
   - role_type
   - power_rank
   - evaluation_note
   - names
3. 不要用空字符串补字段。
4. 不要写 "links": []，除非我明确要求清空旧链接。
5. 如果没有找到可信新链接，不要生成该角色 SQL。
6. 如果链接可能已经存在，但无法确认是否重复，可以保留，但 note 要写清楚链接用途，避免含义不明。
7. 如果我提供了当前 resource / links 导出 CSV，需要先对照已有链接，避免重复插入相同 URL。
8. 如果我没有提供导出 CSV，不要假设数据库里没有旧链接；只生成可信且有价值的链接。

资料来源优先级：
1. 官方官网角色页
2. 官方公告 / 官方社区 / 官方社媒
3. 游戏内角色档案 / 技能说明页面
4. 官方 PV / 角色演示 / 角色预告视频
5. 主流 Wiki
6. 主流攻略站
7. 社区整理 / 玩家攻略
8. 爆料 / 内鬼只允许作为“待确认资料”，不要当成正式资料

链接分类规则：

官方角色页 / 官方档案：
{
  "relation_type": "official",
  "source": "official"
}

官方 PV / 角色演示 / 前瞻直播：
{
  "relation_type": "official_video",
  "source": "official"
}

官方公告 / 官方社区帖子：
{
  "relation_type": "official_notice",
  "source": "official"
}

Wiki 资料：
{
  "relation_type": "reference",
  "source": "wiki"
}

攻略站 / 社区攻略：
{
  "relation_type": "guide",
  "source": "community"
}

新闻站：
{
  "relation_type": "news",
  "source": "news"
}

爆料 / 未确认资料：
{
  "relation_type": "leak",
  "source": "leak"
}
并且 note 必须写“待确认”。

links 字段格式：

select public.app_save_character($$
{
  "game_code": "绝",
  "name": "角色名",
  "links": [
    {
      "title": "官方角色资料",
      "url": "https://...",
      "relation_type": "official",
      "source": "official",
      "note": "官方角色页"
    },
    {
      "title": "角色演示 PV",
      "url": "https://...",
      "relation_type": "official_video",
      "source": "official",
      "note": "官方角色演示视频"
    }
  ]
}
$$::jsonb);

game_code 规则：
- 鸣潮：鸣
- 绝区零：绝
- 崩坏：星穹铁道：崩
- 明日方舟：终末地：终
- 异环：异

检索要求：
1. 先查官方来源。
2. 官方来源不足时，再补 Wiki / 攻略站。
3. 每个角色优先收集：
   - 官方角色页
   - 官方角色档案
   - 官方技能介绍
   - 官方 PV / 角色演示
   - 官方公告 / 官方社区帖
   - Wiki 资料页
   - 高质量攻略页
4. 不要收录：
   - 空链接
   - 跳转首页
   - 无关页面
   - 纯 SEO 垃圾站
   - 内容明显机器生成的页面
   - 没有角色资料价值的短视频搬运页
5. 如果链接需要登录或权限，note 写“需要人工确认权限”。
6. 如果是不同区服资料，note 中写清楚区服，例如“国服官方社区”“日服官网”“国际服官网”。

输出要求：
1. 只输出 SQL 代码块。
2. 不要输出解释。
3. 不要输出 Markdown 表格。
4. 不要输出资料总结。
5. 每个角色一段 app_save_character SQL。
6. 每段 SQL 前可以写来源注释，但不要写长解释：
   -- Source: 资料标题 URL
7. SQL 必须可以直接复制到 Supabase SQL Editor 执行。
8. 生成后自己检查：
   - JSON 是否有效。
   - 引号是否正确转义。
   - 逗号是否正确。
   - url 是否非空。
   - links 是否不是空数组。
   - 是否只写了 game_code / name / links。
   - 是否误写了角色基础字段。
   - 是否包含 delete / drop / truncate / alter。
   - 是否直接 insert / update 底层表。
   - 是否调用了 app_delete_* 函数。

去重要求：
如果我提供已有 resource / links CSV：
1. 先按 url 去重。
2. 同一个 URL 已存在时，不再生成。
3. 同一个页面如果只是参数不同，例如带 tracking 参数，优先保留干净 URL。
4. 如果标题不同但 URL 相同，视为重复。
5. 如果同一资料有多个区服页面，可以保留多个，但 note 必须标明区服。

我会提供：

角色列表：
【填写角色名，或填写“请你自己查某游戏已有角色”】

游戏：
【鸣潮 / 绝区零 / 崩坏：星穹铁道 / 明日方舟：终末地 / 异环】

已有 resource / links 导出，可选：
【粘贴 resource_relations / links / character_resources CSV。如果没有，就留空】

补全范围：
【例如：只补官方链接 / 官方 + Wiki / 官方 + Wiki + 攻略 / 只补 PV / 只补角色档案】

额外要求：
【例如：只使用官方来源 / 不要攻略站 / 不要爆料 / 国服优先 / 日英韩官网也要 / 跳过已存在 URL】
```

