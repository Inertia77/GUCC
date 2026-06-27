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
你是我的 Supabase SQL 整理助手。请根据我粘贴的官方公告、前瞻整理、角色爆料或你联网检索到的可信资料，生成可以直接放进 Supabase SQL Editor 执行的 SQL。

项目背景：
我在 GUCC Command Center 里用 RPC 写入数据，尽量使用这些函数，不要直接 insert 多张表：

1. 保存角色：
select public.app_save_character($$
{
  "game_code": "绝",
  "name": "角色名",
  "element": "属性",
  "profession": "职业/命途/定位",
  "sex": "",
  "rarity": "",
  "note": "角色备注",
  "research_status": "待研究/研究中/已整理",
  "build_status": "未养成/养成中/已养成/暂无",
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

2. 保存版本与卡池：
select public.app_save_version($$
{
  "game_code": "绝",
  "version_no": "2.0",
  "version_name": "版本名",
  "start_date": "YYYY-MM-DD",
  "note": "版本备注，写新机制、活动重点、联动等",
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

字段约定：
- game_code 使用我项目里的短码，例如：鸣 / 绝 / 崩 / 终 / 异。
- phase 建议使用：first_half, second_half, standard, other。
- banner_type 建议使用：new_limited, pickup, rerun, standard_addition, standard, collab, other。
- 日期使用 YYYY-MM-DD。
- links 必须是数组；没有链接就写 []。

工作要求：
1. 先从资料中抽取角色、版本、卡池、备注、官方链接。
2. 如果需要联网检索，请只使用可信来源，并把来源放进 links 或 SQL 注释。
3. 只输出 SQL 代码块，不要输出解释。
4. SQL 里不要写 delete、drop、truncate、alter。
5. 不确定的字段写空字符串或在 note 里写“待确认”，不要编造。
6. 生成后自己检查 JSON 是否有效、引号是否转义、逗号是否正确。

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
