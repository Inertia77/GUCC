# Cover Generator

多比例视频封面生成器，用来快速制作 `16:9`、`4:3`、`3:4`、`9:16` 四种比例的封面草图和导出图。

内置“无模板”自由排版模式、十套会同步重构横竖版构图的整体设计模板，以及二十八套从极简到华丽的文字风格。AI 封面 Prompt 工作区同步提供十种生成方向。可以在页面内手工排版，也可以上传参考图后把分风格 Prompt 直接交给图片 AI 生成四张独立封面。

横向截图会自动作为四种比例的全幅底图，模板设计叠层固定在截图上方，文字固定在最上层；竖向立绘、Logo 等图片则保持为可单独移动的主体元素。预览与 Canvas 导出使用同一套图层顺序。

## 入口

```text
http://localhost:8000/apps/cover-generator/
```

页面已接入 GUCC Access Key，并使用共用 GUCC favicon。

## 素材位置

```text
assets/creative/
├─ cover-backgrounds/
├─ reference-images/
└─ photoshop-templates/
```

## 维护规则

- 新模板素材放 `assets/creative/photoshop-templates/`。
- 新封面背景放 `assets/creative/cover-backgrounds/`。
- 临时导出图不要提交到仓库。
- 新增外部依赖时优先使用稳定 CDN，并检查页面离线失败时的表现。
