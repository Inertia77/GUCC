# Story Library

剧情研究资料区，用于长期整理二游/内容型游戏的世界观、主线剧情、阵营关系、人物关系、伏笔谜团和视频选题素材。

这里不是最终视频脚本区。脚本、标题、封面文案、发布包和复盘应继续在 `apps/video-workspace/` 或具体视频项目中加工。

## 当前结构

```text
reference/story-library/
├─ README.md
├─ 00-index.md
├─ games/                         # 单文件版游戏资料
└─ story-library/                  # 拆分版剧情资料库
   ├─ 00-index.md
   ├─ 90-maintenance-guide.md
   ├─ 99-source-log.md
   └─ games/
```

## 使用建议

1. 先看 `00-index.md` 判断当前整理状态。
2. 如果要快速找一个游戏的剧情总览，看 `games/*.md`。
3. 如果要深入维护版本、阵营、人物和伏笔，看 `story-library/games/<game>/`。
4. 视频选题优先看对应游戏的 `05-video-hooks.md`。

## 命名说明

- `neverness-to-everness` = 《异环》/ NTE / Neverness to Everness。
- `ananta` = 《无限大》/ ANANTA。
- 两者不是同一个游戏，不要混写。

## 维护原则

- 已实装、官方公开、测试/前瞻、社区推测、个人解读必须分开。
- 版本更新后先更新索引和时间线，再补具体版本文件。
- 旧推测不要直接删除，建议移到“已证伪推测”小节。
- 文件名用英文小写和短横线，中文标题写在正文里。
