# Story Library

剧情资料区，用来沉淀游戏世界观、版本主线、阵营关系、人物关系、伏笔和视频选题。

网页阅读入口：

```text
http://localhost:8000/reference/story-library.html
```

`story-library.html` 会读取这里的 Markdown 文件，后续维护内容时主要改 Markdown，不需要改网页结构。

## 目录

```text
reference/story-library/
├─ README.md
├─ 00-index.md
├─ games/                         # 早期单文件游戏资料
└─ story-library/                  # 拆分后的剧情资料库
   ├─ 00-index.md
   ├─ 90-maintenance-guide.md
   ├─ 99-source-log.md
   └─ games/
```

## 使用建议

1. 快速看某个游戏，打开 `reference/story-library.html`。
2. 深入维护某个游戏，改 `story-library/games/<game>/`。
3. 版本剧情写进 `versions/`。
4. 人物、阵营、伏笔和视频选题分别写进对应专题文件。
5. 新增文件后同步更新网页阅读器 manifest。

## 命名说明

- `neverness-to-everness` = 异环 / NTE / Neverness to Everness
- `ananta` = 无限大 / ANANTA

不要把同一个游戏混写到多个命名目录。
