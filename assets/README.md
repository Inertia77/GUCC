# Assets

这里放 GUCC 的共用静态资源。

| 路径 | 内容 |
|---|---|
| `icons/` | Portal、各 app、文档页共用图标 |
| `access-guard.js` | GitHub Pages 前端 Access Key 门禁脚本 |
| `creative/cover-backgrounds/` | 封面背景图 |
| `creative/reference-images/` | 角色、UI、视觉参考图 |
| `creative/photoshop-templates/` | PSD 比例模板 |

## 图标

当前主图标是 `icons/gucc-icon.svg`。它是原创的无人物抽象创作者徽记：深色底、冰蓝刀锋、播放三角、雷光和少量粉橙点缀，用于 Portal、Command Center、WorkSpace、Cover Generator 和资料页 favicon。

HTML 里用 `?v=3` 防浏览器图标缓存。

## Access Guard

`access-guard.js` 保存全站前端门禁逻辑：

- `ACCESS_HASH`：Access Key 的 SHA-256 hash
- `gucc_access_hash_v2`：浏览器保存用的 localStorage key
- `data-guard="true"`：子页面直接访问时启用检查
- `data-root`：从当前页面回到 Portal 根目录的相对路径

## 维护规则

- 图标和代码资源优先用小体积文件。
- 复用素材放 `assets/`，临时截图不要放进仓库。
- 修改 Access Key 后同步更新根 README。
