# GUCC Story Library

这里是 GUCC 项目的剧情资料库，用于长期整理二游/内容型游戏的世界观、主线剧情、阵营关系、人物关系、伏笔谜团和视频选题素材。

本目录不是最终视频脚本区，而是剧情研究与资料沉淀区。视频脚本、标题、封面文案、发布包等内容，应在 `apps/video-workspace/` 或具体视频项目中继续加工。

## 目录结构

```text
story-library/
│  README.md
│  00-index.md
│
└─games/
        wuthering-waves.md
        zenless-zone-zero.md
        honkai-star-rail.md
        arknights-endfield.md
        neverness-to-everness.md
```

## 命名说明

- `neverness-to-everness.md`：对应《异环 / NTE: Neverness to Everness》
- `ananta.md`：对应《无限大 / ANANTA》，不是《异环》

如果当前资料库只管理五款游戏：鸣潮、绝区零、崩铁、终末地、异环，那么不要建立 `ananta.md`。
如果以后也要管理《无限大》，请将它作为第六个游戏单独加入。

## 文件用途

| 文件 | 内容 |
|---|---|
| `00-index.md` | 剧情资料库总索引、更新状态、维护优先级 |
| `games/wuthering-waves.md` | 《鸣潮》剧情总览 |
| `games/zenless-zone-zero.md` | 《绝区零》剧情总览 |
| `games/honkai-star-rail.md` | 《崩坏：星穹铁道》剧情总览 |
| `games/arknights-endfield.md` | 《明日方舟：终末地》剧情总览 |
| `games/neverness-to-everness.md` | 《异环 / NTE: Neverness to Everness》剧情总览 |

## 文档定位

每个游戏剧情文档应尽量包含以下内容：

1. 世界观入口
2. 主线剧情时间线
3. 主要阵营与势力关系
4. 核心人物关系
5. 当前已知谜团
6. 后续剧情关注点
7. 可转化为视频的选题钩子
8. 资料状态与更新记录

## 维护原则

### 1. 已实装与推测分开

剧情整理中必须区分：

- 已实装剧情
- 官方公开资料
- 测试/前瞻/商店页信息
- 社区推测
- 个人解读

不要把推测写成定论。

### 2. 一次更新只做一件事

建议每次更新只处理一个目标，例如：

- 更新某个版本主线
- 补一个角色关系
- 整理一个阵营
- 增加视频选题
- 修正旧结论

这样 Git diff 会比较清楚，后续回溯也方便。

### 3. 版本更新后优先改索引

每次大版本更新后，先更新 `00-index.md`，确认哪些游戏需要补资料，再进入具体游戏文件。

### 4. 大文件再拆分

如果单个游戏文档超过 30,000 字，建议拆成目录：

```text
games/
└─honkai-star-rail/
    │  README.md
    │  00-overview.md
    │  01-timeline.md
    │  02-factions.md
    │  03-characters.md
    │  04-mysteries.md
    │  05-video-hooks.md
```

前期不要过度拆分。先保持一个游戏一个文件，等内容真的变大后再拆。
