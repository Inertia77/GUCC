# Story Library 维护指南

## 每次大版本更新怎么做

1. 先更新 `00-index.md` 的状态。
2. 进入对应游戏文件夹。
3. 更新 `README.md` 的“当前版本”和“重点问题”。
4. 更新 `01-timeline.md`。
5. 在 `versions/` 下新增版本文件，例如：

```text
versions/3.1-new-chapter-title.md
```

6. 最后补 `04-mysteries.md` 和 `05-video-hooks.md`。

## 单个版本剧情文件推荐模板

```md
# 版本号 / 篇章名

> 游戏：  
> 状态：  
> 资料范围：  
> 剧透等级：全剧透

## 1. 快速结论

## 2. 剧情发生前的局势

## 3. 主线流程

## 4. 核心人物关系

## 5. 阵营变化

## 6. 关键伏笔

## 7. 主题解读

## 8. 视频选题钩子

## 9. 待补资料
```

## 什么时候拆得更细

如果某个游戏的 `versions/` 单文件超过 20,000 字，就可以继续拆：

```text
versions/3.0-amphoreus/
│  README.md
│  01-main-plot.md
│  02-characters.md
│  03-lore.md
│  04-video-hooks.md
```

前期不要过度拆。先让资料能用，再追求完美。别一上来修皇宫，结果地基还没打。🏯
