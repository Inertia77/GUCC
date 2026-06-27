# Reference

长期资料区，放 Prompt、资料入口、查询手册、剧情资料和知识库。

## 网页入口

| 路径 | 内容 |
|---|---|
| `ai-prompts.html` | 可复制 Prompt 阅读页，读取 `ai-prompts.md` |
| `story-library.html` | 剧情资料库网页阅读器，读取 `story-library/story-library/` 下的 Markdown |
| `resource-library.html` | 游戏 Wiki、官方资料、攻略参考入口 |

这些 HTML 页面都接入了 GUCC Access Key。

## Markdown / 资料目录

| 路径 | 内容 |
|---|---|
| `ai-prompts.md` | Prompt 源文件，之后主要维护这里 |
| `query-guides/` | SQL 查询手册和未来查询库 |
| `knowledge-base/` | 封面、音乐、Photoshop、故事根资料 |
| `story-library/` | 剧情资料库 Markdown 源文件 |

## 维护建议

- Prompt 改 `ai-prompts.md`，网页自动读取。
- 剧情内容改 `story-library/story-library/` 下的 Markdown，网页阅读器自动读取。
- 新增剧情文件后，需要同步更新 `reference/story-library.html` 里的 manifest。
- 不确定是否应该放进应用入口的资料，先放 `reference/`。
