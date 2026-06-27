# Cover Generator

多比例视频封面生成器，用来快速做不同平台比例的封面草图和导出图。

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
