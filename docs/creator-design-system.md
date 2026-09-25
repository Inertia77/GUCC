# GUCC Creator Workstation 视觉规则

正式入口是 `apps/video-workspace/` 的创作总览；正式制作是 `production-system/`；Publish Console 负责真实发布交接；Cover Generator 负责封面。旧 Studio 仅供历史草稿兼容。

共享样式源：`assets/creator-theme.css`。品牌颜色 `--cr-bg` / `--cr-surface` / `--cr-line` / `--cr-ink`；状态语义为青（当前 / AI）、绿（Ready）、黄（人工判断）、洋红（视觉创作）、红（阻塞）。`.cr-panel`、`.cr-button`、`.cr-section-title` 是可复用的 HUD 基元。Creator 页面使用独立背景、局部切角和轨道，控件最小高度 44px。中文字体随 Creator Theme 本地加载 Noto Sans SC（OFL 许可见 `assets/fonts/noto-sc/LICENSE`），离线页面不会因系统缺少中文字体而变方框。

七阶段只读投影：`assets/creator-workflow-map.js`。阶段与 Legacy / Global 状态映射在此维护；不得写入数据库或用投影状态推进锁。Hub 的任务名称读取 `assets/creator-ai-task-core.js`，带 Project 的指令通过 Production Prompt 面板生成现有 Video Contract，不能在 Hub 存另一份 Prompt。

纵向是单视频流程，横向轨道是每条视频共享的规则、AI Task、资产与历史学习。Production 默认突出当前动作，完整技术状态 / Stage Prompt 藏在折叠详情；人工 Gate 仍使用现有真实按钮。移动端以纵向阶段列表取代桌面轨道。
