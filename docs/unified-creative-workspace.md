# GUCC 统一创作工作台｜Project → Video → 六项成果

## 原则

- 项目唯一身份：Supabase `public.creator_projects.project_id`。已完成/归档项目仍可被所有创作工具选中；管理状态不等于正式作品发布状态。
- 一项内容项目可包含多条独立视频。视频身份使用 `public.creator_video_workspaces.(project_id,video_id)`，不重新创建同名 Project。
- 六项成果分别存储在 `public.creator_deliverable_records`：`script/subtitle/visual/sound/cover/publish`。项目/视频状态为独立、低频的元数据，不依赖技术 Prompt Flow 节点数。
- 本地实际声音/视频/封面/工程文件不上传 Supabase；云端只保存由浏览器明确选择的文件身份与人工检查声明（文件名、大小、修改时间）。**云端元数据不是随时可下载或重新校验的文件**。
- 已有 SCRIPT_LOCK、AUDIO_LOCK、TIMELINE_LOCK、旧项目快照、历史数据与七阶段 Prompt 完整保留；新表只追加身份与进度，不对历史记录做静默回填。

## 用户使用

1. 从动态 Creator OS 创建项目，或从统一项目栏选择已有项目（完成/归档也可选）。
2. 选择项目下已经登记的视频，或者点击“＋新视频”添加独立身份。对旧双视频项目，**先对照真实素材/锁稿确认名称后再创建**，不能凭旧空 `videos` 数组自动误关联。
3. 在 Studio、Creator OS、封面、发布工具的顶部统一项目栏切换。跳转时 URL 保留 `?project=<id>&video=<id>`，跨工具不重新生成项目。
4. Studio 浏览器草稿以项目+视频分桶保存；封面画布也按相同身份独立保存；发布草稿按 `creatorProjectId + videoId` 恢复、保留本机专属素材登记。
5. 六项成果状态支持未开始、制作中、待审核、已确认、待处理。复制 Studio Prompt / 手动保存封面 / 发布草稿会将没有正式结果的项记为“制作中”。不会因为 AI 声称 DONE 就自动确认为完成。
6. 点击某项成果登记结果。**已确认**必须现场选择对应文件并勾选人工内容检查，其他状态可以仅保存说明。后续可继续调整进度；云端只记录文件证明信息，不保存文件内容。
7. 云端写入使用 `creator_workspace_save_deliverable` 的 revision 比较更新；冲突时明确报错并要求刷新，不覆盖另一设备成果。

## 与历史入口的边界

- 固定 Studio 原浏览器草稿 `gucc_creator_prompt_v6` 不删除。**只有**带明确 project 和 video 的页面地址使用新的分桶键。旧草稿可通过导出/导入继续使用，避免自动套到错误视频。
- 封面旧画布 `gameCoverGeneratorProject` 不删除；新项目地址使用独立分桶键。旧画布不会被自动无证据迁移到当前选中视频。
- 发布控制台原发布数据保留，并继续采用已有的独立云端草稿 `creator_os_publish_drafts`；若选中以前未建立发布单的视频，创建独立空白发布草稿，不覆盖原视频草稿。
- 过去使用 `creator_projects.current_state` 或 `creator_os_workspace_snapshots` 的客户端继续兼容；新记录不改变这些表中的任何值。
- 项目栏负责身份和各成果记录，并不意味着浏览器工具可自动获取其他本机音频、封面文件；实际文件访问需要本机授权。

## 生产迁移与回读

1. 新增 SQL：`supabase/sql/14-unified-creative-workspace.sql`；先验证 RLS/字段与当前生产 API。
2. 变更为 additive：新视频表与成果表 + SECURITY INVOKER CAS RPC；绝不迁移历史原始成果。
3. 用 SQL 回读确认新表结构/策略/RPC、旧项目数和快照数不变、新表为空（直至用户显式创建）。
4. 自动测试覆盖模块引入、视频范围的浏览器草稿、跨页面身份传递、乐观锁与真实文件人工确认条件。
