# GUCC Unified AI Creator Pipeline

这份文档描述 GUCC 在 Studio、AI Video Production System、Supabase、Google Drive 与 Publish Console 之间的统一创作主线。

## 一句话原则

**一个视频只有一个 `project_id`，Production 的项目 JSON 是结构化主状态，Supabase 是云端状态源，Google Drive / 本地同步目录保存大型真实文件，GitHub 保存系统代码与创作规则。**

不要再为同一个视频分别维护一套 Studio JSON、一套 Production JSON 和一套 Publish JSON 当作三个独立项目。

## 四层职责

### 1. GUCC Studio：想清楚

Studio 负责仍然可能变化的创作工作：

- 选题与观众
- 事前学习
- 官方资料与社区问题
- AI 分析
- 结构草稿
- 早期脚本和素材方向

当一个项目确定要正式制作时，点击右下角 **“转入正式制作”**。

系统会：

1. 为项目生成唯一 `project_id`。
2. 把 Studio 已有资料打包为 handoff。
3. 打开 Production System。
4. 用同一个 `project_id` 创建正式项目。
5. 把研究、已有脚本、素材计划和已有发布包带过去。
6. **不会自动打开 Content / Script / Audio 等 Lock。** 所有 Lock 仍需人工确认。

### 2. Production System：严格生产

Production 是正式制作的唯一状态机：

```text
IDEA
→ PLANNING
→ RESEARCHING
→ RESEARCH_LOCKED
→ CONTENT_LOCKED
→ SCRIPTING
→ SCRIPT_LOCKED
→ PRE_ASSET_PREPARATION
→ AUDIO_PRODUCTION
→ AUDIO_LOCKED
→ TIMELINE_GENERATION
→ TIMELINE_LOCKED
→ STORYBOARDING
→ ASSET_COMPLETION
→ PRODUCTION_READY
→ CODEX_BUILD
→ REVIEW
→ REVISION
→ FINE_EDIT
→ PICTURE_LOCKED
→ RELEASE_READY
→ PUBLISHED
→ ARCHIVED
```

Production 页面右下角新增统一制作总线：

- **立即云同步**：把当前项目完整 JSON 与文件元数据推到 Supabase。
- **拉取云端**：恢复其他设备上更新过的项目。
- **复制发布 Prompt**：为 `RELEASE_PACK.md` 追加 Publish Console 可稳定解析的固定输出合同。
- **送去 Publish Console**：不再绕回旧 WorkSpace，直接交接发布项目。
- **Drive 项目库**：打开统一 Google Drive 根目录。

登录过 Command Center 后，Production 会复用 `gameup_session_v5`，不要求重复登录；未登录时仍可以完整使用本地模式。

### 3. Supabase：云端状态源

新增四张表：

- `creator_projects`：项目索引与完整 `project_data`。
- `creator_project_files`：标准文件和大型文件的元数据 / provider pointer。
- `creator_project_events`：建项、阶段变化、Lock 变化和人工同步事件。
- `creator_project_releases`：六平台发布状态、作品链接、作品 ID 和数据快照。

浏览器不直接获得这些表的 CRUD grant。前端统一调用：

```text
supabase/functions/creator-project-api
```

该 Edge Function：

1. 校验 Supabase Auth access token。
2. 校验 `app_users.is_active`。
3. 强制把所有写入绑定到当前登录用户。
4. 使用服务端 key 访问项目表。
5. 检查 `project_id` 所有权，避免跨用户覆盖。

`service_role` 不会进入浏览器。

### 4. Google Drive：真实文件仓库

统一根目录：

```text
GUCC Creator Projects/
├─ 01_ACTIVE/
├─ 02_ARCHIVE/
└─ 03_SHARED_ASSETS/
```

- `01_ACTIVE`：正在制作的项目目录。
- `02_ARCHIVE`：已完成 / 暂停的完整项目。
- `03_SHARED_ASSETS`：跨项目复用的 BGM、SFX、图形、模板、通用片头等。

Production 的项目目录结构继续使用：

```text
项目名/
├─ 00_CONTROL/
├─ 01_RESEARCH/
├─ 02_SCRIPT/TTS_CHUNKS/
├─ 03_AUDIO/
├─ 04_SUBTITLES/
├─ 05_ASSETS/{GAMEPLAY,UI,CHARACTER,BUILD,GRAPHICS,MUSIC,SFX}/
├─ 06_EDIT_PLAN/
├─ 07_CODEX_BUILD/
├─ 08_REVIEW/
├─ 09_FINAL/
└─ 10_RELEASE/
```

最省事的方式是在 Windows 安装 Google Drive for Desktop，然后把 Production 的“同步到目录”目标直接选到：

```text
Google Drive/GUCC Creator Projects/01_ACTIVE
```

这样网页仍使用 File System Access API 写真实目录，Google Drive Desktop 负责云端同步。

> ChatGPT 的 Google Drive 连接权限和静态 GitHub Pages 网页不是同一个 OAuth 环境。GUCC 前端不会偷用 ChatGPT 的 Drive token。需要真正的网页端 Drive API 时，应另做 Google OAuth，而不是把 token 写进仓库。

## Publish Console 直连

Production 点击 **“送去 Publish Console”** 后：

1. 保存同一个 `project_id`。
2. 读取 `10_RELEASE/RELEASE_PACK.md`。
3. 直接打开 Publish Console。
4. 按固定标题拆成六个平台字段。
5. 发布控制台的 `source.creatorProjectId` 继续指向同一个项目。
6. 发布状态、作品 URL / ID、数据快照会回写 Supabase `creator_project_releases`。

Publish Console 仍然不会点击平台最终公开发布按钮。最终发布 / 定时发布由用户检查后确认。

## 发布包固定合同

为保证自动解析，Production 的发布 Prompt 使用以下固定标题：

```text
## B站
### 最终标题
### 最终简介
### 普通标签
### 置顶评论

## 抖音
### 最终发布文案
### 置顶评论

## 小红书视频
### 最终标题
### 最终正文
### 话题
### 置顶评论

## 微信视频号
### 最终完整描述
### 话题
### 置顶评论

## YouTube 简体中文
### 最终标题
### 最终简介
### Hashtags
### 后台 Tags

## TikTok 简体中文
### 最终 Caption
### 置顶评论
```

这些字段与 `apps/publishing-console/platform-rules.js` 的解析器一一对应。

## 日常使用

### 新视频

```text
GUCC Studio
→ 填选题 / 资料 / AI 分析
→ 转入正式制作
→ Production 按“唯一下一步”推进
→ Content Lock
→ Script Lock
→ 做 AUDIO_MASTER
→ Audio Lock
→ Codex 对齐字幕 / 时间轴
→ ChatGPT Timed Storyboard
→ 补 Must 素材
→ Codex V0
→ 带时间码 Review
→ Codex Revision
→ Fine Edit
→ Picture Lock
→ 复制发布 Prompt，生成 RELEASE_PACK
→ 送去 Publish Console
→ 一键准备六平台
→ 人工最终确认发布
→ 回填链接 / 数据
→ Supabase 自动留档
→ 项目目录从 01_ACTIVE 移到 02_ARCHIVE
```

### 另一台电脑继续

1. 用同一个浏览器账号在 Command Center 登录一次。
2. 打开 Production System。
3. 点击“拉取云端”。
4. 项目结构状态从 Supabase 恢复。
5. 大型音视频从 Google Drive Desktop 同步到本机。
6. Production 的“读取项目目录”仍可从 `00_CONTROL/PROJECT_DATA.json` 做磁盘级恢复。

## Source of Truth

| 内容 | Source of Truth |
|---|---|
| GUCC 程序、Prompt、Creator Constitution | GitHub |
| 项目状态、Locks、结构化 JSON | Supabase `creator_projects` |
| 项目标准文件元数据 | Supabase `creator_project_files` |
| 阶段 / Lock 历史 | Supabase `creator_project_events` |
| 大型音频、视频、录屏、素材 | Google Drive / 本地同步目录 |
| 发布执行、作品链接、数据快照 | Supabase `creator_project_releases` |
| 临时防误关缓存 | 浏览器 localStorage |

## 故障时怎么判断

- 页面右下角显示 **本地模式**：不会影响本地制作；先去 Command Center 登录一次即可恢复云同步。
- 云端同步失败：本地 Production JSON 与磁盘目录不会被删除；修复连接后重新“立即云同步”。
- 换电脑没有大视频：Supabase 只保存状态和元数据；等待 Google Drive Desktop 把真实文件同步下来。
- Publish Console 字段为空：先检查 `RELEASE_PACK.md` 是否使用固定二级 / 三级标题，再重新送去 Publish Console。
- 平台改版：本机发布助手会停在“未自动定位字段”，不会把失败伪装成成功，也不会替用户点击最终发布。
