# GUCC Story Library

拆分版剧情资料库，用于沉淀世界观、主线版本、阵营关系、人物关系、伏笔谜团和视频选题。

## 目录结构

```text
story-library/
├─ README.md
├─ 00-index.md
├─ 90-maintenance-guide.md
├─ 99-source-log.md
└─ games/
   ├─ wuthering-waves/
   ├─ zenless-zone-zero/
   ├─ honkai-star-rail/
   ├─ arknights-endfield/
   ├─ neverness-to-everness/
   └─ ananta/
```

## 游戏目录标准结构

```text
游戏目录/
├─ README.md
├─ 00-overview.md
├─ 01-timeline.md
├─ 02-factions.md
├─ 03-characters.md
├─ 04-mysteries.md
├─ 05-video-hooks.md
└─ versions/
```

## 使用顺序

1. `00-index.md`：看全局状态和维护优先级。
2. `games/<game>/README.md`：看单个游戏入口。
3. `00-overview.md`：快速回忆世界观和主线。
4. `versions/*.md`：看具体版本剧情。
5. `05-video-hooks.md`：找可转成视频的选题。

## 写作原则

1. 已实装、官方公开、社区推测、个人解读必须分开。
2. 先维护总览和时间线，再补版本细节。
3. 视频选题和剧情正文分开：正文负责准确，钩子负责表达。
4. 文件名使用英文小写和短横线。
5. 后续版本推翻旧判断时，保留考据轨迹，不直接抹掉。

## 游戏名纠错

- `neverness-to-everness` = 《异环》/ NTE / Neverness to Everness。
- `ananta` = 《无限大》/ ANANTA。
