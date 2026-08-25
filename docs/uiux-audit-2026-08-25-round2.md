# GUCC UI/UX 第二轮审核 — 统一创作流程结构

日期：2026-08-25

本轮审核基于最新统一创作结构：

`Studio → Production → Supabase / Drive → Publish Console`

重点不是重新改视觉风格，而是检查结构变化后是否出现新的入口冲突、固定层遮挡、移动端屏幕争夺、旧文案误导和正式流程层级不清。

## 总结

新的信息架构方向是正确的：Studio 和 Production 的职责终于被明确拆开，Publish Console 也不再必须绕回旧 WorkSpace。真正的问题来自“新流程被加到了旧 UI 上面”，尤其 creator pipeline bridge 原先作为独立 fixed 浮层存在，和全局 Dock、页面 sticky actions、Toast、手机软键盘同时抢屏幕。

本轮把新流程从“额外悬浮工具”调整成“页面自身的一部分”。

## 本轮发现与处理

| 级别 | 区域 | 问题 | 处理 |
| --- | --- | --- | --- |
| P0 | Production | `access-guard.js` 缺少正确 `data-root` / `data-guard`，Production 子目录可能无法正确启动全局 Shell 与 Creator Pipeline | 已修复：Guard 移到 head，明确 `data-root="../../../" data-guard="true"` |
| P0 | 手机 / Creator Pipeline | 新制作总线使用超高 z-index 固定在底部，与 GUCC 全局底栏、Sticky Actions、Toast、软键盘重叠 | 已修复：新增 inline UX bridge，把流程状态和操作嵌入 Studio / Production / Publish 页面正文；加载瞬间的 fallback 也避开全局 Dock |
| P1 | Production 手机端 | 顶部标题 + 4 个操作按钮 + 项目条占用大量首屏 | 已修复：压缩 Header；操作按钮 2×2；项目改为横向 snap 列表 |
| P1 | Production 手机端 | 正式流程页面的 Lock、Hero、阶段控制和 Tabs 太密 | 已修复：面板缩距、两列主操作、窄屏 Lock 单列、Tabs 触摸高度统一 |
| P1 | Production 手机端 | 表单字号小于 16px 时 iOS 浏览器可能自动缩放 | 已修复：移动端 input/select/textarea/editor 固定至少 16px |
| P1 | Production | 原文案仍像独立实验工具，没有突出它已经是正式制作唯一状态机 | 已修复：强调“看唯一下一步、按锁推进”，并重写空状态和 Lock 说明 |
| P1 | Publish | 顶部仍写“导入 WorkSpace JSON”，与新的 Production 直连结构冲突 | 已优化：新流程语义改为 Production 直接交接；旧按钮改成“兼容导入旧 JSON” |
| P2 | Pipeline 状态 | 云同步状态、Drive、发布交接作为浮层会持续遮挡内容，即使并非用户当前任务 | 已优化：改成窄状态条；桌面左状态右操作，手机操作横向滑动；输入时自动隐藏 |
| P2 | Story Library | v3 深档案明显变长，桌面大屏段落行长过长 | 已优化：正文段落、列表、引用约束到 86ch；表格仍保留全宽 |
| P2 | PWA | 新增 creator pipeline 模块若未进入 App Shell，手机旧缓存可能出现结构更新但 UI helper 缺失 | 已修复：PWA cache 升至 v6，并加入 creator pipeline core / bridge / UX 模块 |

## 新 Creator Pipeline 状态条

现在流程总线不再默认盖在屏幕右下 / 底部。

### Studio

状态条位于 Studio Header 之后，主要动作：

- 转入正式制作
- Drive 项目库

### Production

状态条位于 Production Header 之后，主要动作：

- 立即云同步
- 拉取云端
- 复制发布 Prompt
- 送去 Publish Console
- Drive 项目库

这些是跨系统操作，因此保留在独立流程条中；真正的制作阶段推进仍由页面内部的“唯一下一步”和状态机负责。

### Publish Console

状态条位于四步发布流程导航之后，主要动作：

- 同步发布状态
- Drive 项目库

这样不会把云端同步和真正发布操作混在一个按钮组里。

## 手机端原则

本轮统一采用：

1. 固定底部只留 GUCC 全局导航。
2. Creator Pipeline 不再抢占第二层 fixed bottom。
3. 键盘出现时隐藏辅助流程层。
4. 高频主要按钮至少 44px。
5. 多个低频操作优先横向滚动，不把页面垂直撑高。
6. 正式 Production 首屏优先显示当前项目、当前阶段和唯一下一步。

## 桌面端原则

Production 不再按“展示型产品页”处理，而按“高频工作台”处理：

- Header 减高。
- 项目列表保留侧栏。
- 工作区更早进入视野。
- Creator Pipeline 变成细状态条，而不是悬浮卡片。
- Story 长文约束阅读行长，但数据表仍利用宽屏。

## 本轮暂不继续大改的部分

### 1. 全局“创作”二级菜单

目前 WorkSpace 和 Production 是父子关系，Production 仍从 Studio 进入。短期这样比把全局导航再加一个一级入口更稳定。

后续如果 Production 成为每天更高频入口，可以考虑把“创作”二级菜单明确列为：

- Studio / 策划
- Production / 正式制作
- Cover / 封面
- Publish / 发布

而不是新增第六个全局底栏按钮。

### 2. WorkSpace 与 Cover 的历史 CSS

两处仍有较多旧版本 override。当前共享 UIUX 层能稳定覆盖，但长期维护成本仍然高。建议后续做 CSS consolidation，而不是继续叠补丁。

### 3. 自动视觉回归

当前 CI 能证明代码契约通过，但不能证明 360 / 390 / 768 / 1366 / 1440 的真实页面没有视觉偏移。下一步最值得投入的是 Playwright 截图基线，特别是：

- Studio
- Production（项目存在 / 空状态 / Dialog）
- Publish Console
- DB 编辑抽屉
- Story Library 长文和宽表

## 本轮涉及文件

- `apps/video-workspace/production-system/index.html`
- `assets/access-guard.js`
- `assets/creator-pipeline-ux.mjs`
- `assets/gucc-uiux-v1.css`
- `sw.js`

本轮没有改变 Production 状态机、Lock 业务规则、Supabase 数据结构或发布逻辑；修改集中在可达性、响应式布局、流程表达与跨页面交互层。