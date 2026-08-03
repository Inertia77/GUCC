# GUCC WorkSpace Changelog

## 4.1.0

- 将创作链路明确为 `06 正式发布 → 07 后期扩散 → 08 复盘 → 09 规则`。
- 正式发布新增主平台视频链接记录；后期扩散新增目标、复用素材、AI 扩散包和执行结果字段。
- 新增后期扩散 Prompt，并让复盘区分主视频自然表现与扩散增量。
- 状态与完成度新增“扩散中 / 待复盘 / 后期扩散完成”，旧项目的 `8-已归档` 会自动迁移为 `10-已归档`，并视为已完成旧流程对应的扩散步骤。
- Markdown / JSON 导入导出升级到 schema 2，同时保留旧版 07 进度、08 结项反思的无标记 Markdown 兼容读取。

## 4.0.3

- 更名为 GUCC WorkSpace，进入 4.0.x 版本线。
- Markdown 与 JSON 写入工作台版本和导出阶段。
- Markdown 内嵌完整项目数据，可作为可读存档再次导入。
- 支持旧版 INERTIA Project Forge 数据标记和浏览器草稿迁移。
- 改进 Markdown 换行、发布包层级、AI 结构导入和移动端操作。
- 仓库正式入口改为稳定路径 `apps/video-workspace/index.html`。
- 增加编辑后浏览器自动保存；导出文件仍是跨设备和长期归档依据。
- AI Prompt 模板拆到 `ai-prompts.js`，后续迭代 Prompt 不需要修改 `index.html`。
- 增加证据池字段，并把 AI Prompt 升级为证据驱动输出，减少空洞结论、泛素材建议和标题夸大。

## Legacy 3.8.x

- 只保留最后一个 3.x 模板 `legacy/project-forge-v3.8.9.html` 作为兼容入口。
- 更早版本由 Git 历史保存，不在工作树中重复存放。
