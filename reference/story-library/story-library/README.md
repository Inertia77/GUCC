# GUCC Story Library

拆分后的剧情资料库，用来维护多游戏的世界观、主线版本、阵营关系、人物关系、伏笔和视频选题。

网页阅读入口：

```text
../../story-library.html
```

## 目录

```text
story-library/
├─ README.md
├─ 00-index.md
├─ 90-maintenance-guide.md
├─ 99-source-log.md
├─ FILE_MANIFEST.md
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
games/<game>/
├─ README.md
├─ 00-overview.md
├─ 01-timeline.md
├─ 02-factions.md
├─ 03-characters.md
├─ 04-mysteries.md
├─ 05-video-hooks.md
└─ versions/
```

## 写作规则

1. 官方事实、剧情解读、社区推测分开写。
2. 版本内容优先写到 `versions/`，长期线索再沉淀到专题文件。
3. 视频选题角度写到 `05-video-hooks.md`。
4. 不要直接删除旧判断，过时内容移动到归档或标注“已过期”。
5. 新增 Markdown 文件后同步更新 `../../story-library.html` 的文件 manifest。
