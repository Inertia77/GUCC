# GUCC UI/UX 第三轮迭代审核

日期：2026-08-25

本轮按“优化 → 复审 → 发现问题继续修 → 再复审”的方式执行，重点检查上一轮统一创作结构落地后，手机与电脑是否仍有信息架构、固定层、导航一致性、编辑器触摸体验和历史 CSS 覆盖问题。

## 最终结论

本轮完成后，没有再发现需要立刻处理的 P0 / P1 UI/UX 阻断问题。

这次真正暴露出来的核心问题有三类：

1. **Production 已经是正式制作主流程，但信息架构仍把它当低频高级入口。**
2. **新版全局导航是 5 个一级入口，但 Workspace / Cover 的历史 override 仍有 6 栏 Dock 规则。**
3. **复杂编辑器在手机上仍存在底部多层控件、iOS 输入放大以及 Cover“画布和属性面板距离太远”等摩擦。**

这些问题已在本轮修复，并新增 CI 级 UI/UX 结构契约，防止之后的旧样式再次把这些问题带回来。

## 第一阶段：继续优化

### 1. Production 正式升级为核心创作入口

全局“创作”二级菜单现在明确按照正式流程排列：

- Studio：策划、研究与内容草稿
- Production：正式制作、状态机与 Lock
- Cover：封面
- Publish：发布与复盘

Production 不再藏在“系统与维护”的语义里。

Portal 运行时也会把 Production 提升为第 8 个核心入口，并从低频系统入口移除。这样用户从 Portal、全局 Dock 或 Studio 都能理解同一套流程关系。

### 2. 创作菜单由 3 项改为 4 项后重新排版

“创作”弹层改为 2×2，而不是强行沿用三列布局：

```text
Studio        Production
Cover         Publish
```

手机和桌面都更容易理解，也更接近真实工作流顺序。

弹层新增最大高度与内部滚动，避免横屏手机或小高度窗口中菜单超出视口。

### 3. 清理旧 6 栏全局 Dock 遗留

新版 GUCC 全局一级导航只有 5 项：

```text
首页 / DB / 创作 / 资料 / 更多
```

但 Workspace、Cover 的旧 override 文件仍写着 `repeat(6, ...)`。这会造成手机底栏出现空槽、宽度计算错位或不同页面 Dock 看起来不一样。

本轮把当前实际生效的 Workspace / Cover / Floating Dock 修正规则统一成 5 项。

### 4. Workspace 手机底部空间重新核算

Workspace 手机可能同时存在：

- GUCC 全局底栏
- Workspace 快捷操作
- Structure Floating Nav
- 软键盘

本轮加入状态相关的底部安全空间：Structure Nav 出现时额外增加页面 padding，避免最后几个字段被固定工具层压住。

文本输入时仍继续使用上一轮的“键盘出现 → 辅助固定层退出”规则。

### 5. Workspace 手机输入避免 iOS 自动放大

手机端 `input / select / textarea / richbox` 统一保证至少 16px 字号，避免 iOS Safari 在聚焦小字号输入框时强制放大页面。

### 6. Cover 手机编辑顺序调整

旧顺序：

```text
画布 → 素材 → Inspector
```

新顺序：

```text
画布 → Inspector → 素材
```

选择一个文字或图片对象以后，下一屏立即就是它的属性控制，不再需要先穿过完整素材面板。

Cover 手机输入框也统一到 16px，避免焦点缩放。

## 第二阶段：复审后继续修

第一阶段改完后再次检查桌面导航一致性，发现 Cover Generator 在电脑端仍被历史 Floating Dock CSS 强制成底部导航，而其他工作台已经使用统一右侧 Rail。

这个问题属于 P2 一致性问题，但会增加跨页面认知成本，因此继续修复：

- `< 1024px`：Cover 保持底部 5 项 Dock，适合拇指操作。
- `>= 1024px`：Cover 改回统一右侧 64px 全局导航 Rail。
- 页面同步预留 82px 右侧空间，避免 Rail 压住编辑器。

因此现在桌面端主要工作页面的全局导航方向重新一致。

## UI/UX 结构回归测试

新增：

```text
scripts/test-uiux-contract.cjs
```

并加入 `npm test` / GUCC CI。

当前自动检查至少覆盖：

- Production 必须存在于全局创作菜单。
- 创作顺序必须为 Studio → Production → Cover → Publish。
- Portal 必须能提升 Production 为第 8 个核心入口。
- 全局一级 Dock 必须保持 5 项。
- 历史 Workspace / Cover 修正文件不得重新出现 6 栏 Dock。
- Workspace 手机必须保留 16px 编辑字号和 Structure Nav 安全空间。
- Cover 手机必须保持“画布 → Inspector → 素材”顺序。
- Cover 桌面必须使用统一右侧全局导航 Rail。
- Production 必须继续使用正确的三级 `data-root` 和 Guard。
- Creator Pipeline UX 模块必须被正常 Bootstrap。

这类测试不能代替像素级视觉测试，但可以防止最常见的“旧 CSS 又把新版结构覆盖回去”。

## 最终复审结果

### 手机端

目前没有再发现 P0 / P1 阻断：

- 一级全局导航固定为 5 项。
- 创作四阶段通过二级菜单组织，不增加底栏按钮。
- 输入键盘不会和全局 Dock 长时间争空间。
- Workspace 多层底部工具有安全空间。
- Production 首屏密度已压缩。
- Cover Inspector 更靠近画布。
- Story / Prompt / Resource / DB / Publish 延续前两轮移动优化。

### 电脑端

目前没有再发现 P0 / P1 阻断：

- Production 可从全局创作菜单直接到达。
- Creator Pipeline 保持为页面内状态条，而不是固定遮挡层。
- Cover 与其他桌面工作台恢复统一右侧全局 Rail。
- Story 长文仍使用合理行宽。
- DB / Publish 已保持工作台密度而非展示页密度。

## 仍属于长期技术债，而非当前使用阻断

### Workspace / Cover 历史 CSS

两个页面仍保留多代 inline CSS + override 文件。当前优先级和最终生效结果已被本轮契约测试保护，但维护成本仍高。

后续更适合单独做一次 CSS consolidation，而不是在高频功能仍持续变化时大规模重写。

### Portal 静态 HTML 与运行时增强

Portal 的 Production 提升由新版 Shell 做幂等增强，因此用户实际看到的是 8 个核心入口；静态 HTML 仍保留旧兼容结构。这不会影响正常 GUCC 使用，但以后做 Portal 源码整理时可以把静态结构同步收口，减少双轨维护。

### 像素级视觉回归

本轮新增的是“结构契约”，不是浏览器截图基线。真正的下一阶段可继续补：

- 360 × 800
- 390 × 844
- 768 × 1024
- 1366 × 768
- 1440 × 900

针对 Portal / DB / Studio / Production / Cover / Publish / Story 建立 Playwright 截图基线。

## 本轮主要涉及文件

- `assets/gucc-shell.js`
- `assets/gucc-shell-nav-v2.css`
- `assets/gucc-workspace-fixes-v1.css`
- `assets/gucc-floating-docks-v1.css`
- `assets/gucc-cover-workspace-fixes-v1.css`
- `assets/access-guard.js`
- `scripts/test-uiux-contract.cjs`
- `package.json`
- `sw.js`

本轮没有修改 Production 状态机、Lock 业务规则、Supabase 数据结构、项目数据模型或发布业务逻辑。