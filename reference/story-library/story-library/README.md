# GUCC Story Library

> 状态：v1 全目录包  
> 生成日：2026-06-26  
> 目的：把二游/开放世界游戏剧情资料从“聊天记录”升级为可长期维护的项目资料库。

这里是 GUCC 的剧情研究区，用于沉淀世界观、主线版本、阵营关系、人物关系、伏笔谜团和视频选题。  
它不是最终视频脚本区，而是后续选题、脚本、封面文案、复盘的“母资料库”。

## 目录结构

```text
story-library/
│  README.md
│  00-index.md
│  90-maintenance-guide.md
│  99-source-log.md
│
└─games/
   ├─wuthering-waves/
   ├─zenless-zone-zero/
   ├─honkai-star-rail/
   ├─arknights-endfield/
   ├─neverness-to-everness/
   └─ananta/
```

## 游戏目录标准结构

每个游戏文件夹都尽量保持同一套结构：

```text
游戏名/
│  README.md              # 游戏剧情资料入口
│  00-overview.md         # 世界观与主线总览
│  01-timeline.md         # 时间线
│  02-factions.md         # 阵营/势力
│  03-characters.md       # 人物关系
│  04-mysteries.md        # 伏笔与未解谜团
│  05-video-hooks.md      # 视频选题钩子
│
└─versions/
        版本或篇章.md
```

## 写作原则

1. **已实装、官方公开、社区推测、个人解读必须分开。**  
   不要把推测写成定论，不要把 PV 氛围写成剧情事实。

2. **先总览，再拆版本。**  
   `00-overview.md` 管大逻辑，`versions/` 管具体版本剧情。

3. **每次大版本更新，先更新 README 和 01-timeline，再补版本文件。**  
   这样不会出现某个版本剧情写了，但总览还是旧的情况。

4. **视频选题和剧情正文分开。**  
   剧情正文负责准确，视频钩子负责表达和传播。

5. **文件名使用英文小写和短横线。**  
   中文标题写在文件里面，文件名保持稳定，方便 Git、脚本和网页链接。

## 游戏名纠错规则

- `neverness-to-everness` = 《异环》/ NTE / Neverness to Everness。
- `ananta` = 《无限大》/ ANANTA。
- 两者不是同一个游戏，不能混写。

## 使用建议

先把整个 `story-library/` 目录复制到 GUCC 的：

```text
reference/story-library/
```

之后每次做视频选题时，不要从零开始查，先从这里找：

1. 对应游戏 `README.md`
2. `00-overview.md`
3. 对应版本 `versions/*.md`
4. `05-video-hooks.md`

项目管理的老规矩：入口立住，后面再长都不怕。
