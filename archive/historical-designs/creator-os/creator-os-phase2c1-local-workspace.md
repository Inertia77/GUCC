# Creator Project Local Workspace

Phase 2C.1 把 Creator Project 的真实制作目录固定为 **Project ID 驱动的 Local-first Workspace**。Supabase 仍保存项目状态、历史、Revision、Lock 与逻辑 Artifact；视频、音频、封面和其他大文件留在本机。

## 日常使用

### Production 页面

打开一个 Creator Project 后点击：

```text
创建 / 同步本地 Workspace
```

浏览器会要求你选择已经登记的 Creator Workspace Root。选择权限仍由浏览器 `showDirectoryPicker()` 控制，GUCC 不会绕过浏览器权限。

新项目目录名使用统一规则：

```text
<SafeProjectName>_<ShortProjectId>
```

例如：

```text
克拉蕾完整攻略_a1b2c3
```

中文标题会保留；Windows 非法字符会被安全替换；即使两个项目同名，只要 Project ID 不同，目录也不会冲突。

如果 Workspace Root 中已经存在旧目录，GUCC 会先读取：

```text
00_CONTROL/PROJECT_DATA.json
```

只要其中的 `projectId` 与当前 Creator Project 一致，就继续复用旧目录，不自动改名、不搬家、不复制第二份。

## Local Agent fallback

如果浏览器不支持 File System Access，或你希望从终端明确创建某一个项目，可运行：

```powershell
npm.cmd run creator:agent -- --bootstrap-project <projectId>
```

这个命令只处理你明确指定的 Project ID。它复用正式 Creator Agent 配置与现有 Creator user session，不创建 Auth User，也不使用 `service_role`。

原有命令继续有效：

```powershell
npm.cmd run creator:agent -- --setup
npm.cmd run creator:agent -- --once
npm.cmd run creator:agent -- --watch
```

`--bootstrap-project` 是独立操作，不能与 `--setup / --once / --watch` 混用。

## 目录与 Projection

Bootstrap 复用 Production Engine 的正式 `DIRECTORY_STRUCTURE`，并生成真实轻量 Projection，包括：

```text
00_CONTROL/PROJECT_DATA.json
00_CONTROL/PROJECT_MANIFEST.md
00_CONTROL/STATUS.md
```

以及当前项目在 `projectFileTree()` 中已经存在的真实文本内容。

GUCC 会在：

```text
00_CONTROL/.gucc-projections.json
```

记录自己上一次生成的文本 hash。再次同步时：

- 文件不存在：创建。
- 文件与目标完全一致：保持不变。
- 文件仍是 GUCC 上一次生成的版本：可以更新到新 Projection。
- 本机文件被人工修改：报告 Conflict，**不覆盖人工内容**。

路径 traversal、Workspace Root 外 realpath、symlink / junction escape 都会被拒绝。Local Agent 使用临时文件 + rename 完成 Projection 写入。

## Publish 自动找成片

Publish Console 与 Publisher Assistant 使用 `state.source.creatorProjectId` 定位同一个本机项目，不按标题、不按 Downloads、不按最近修改时间猜。

Final Video 发现顺序：

```text
09_FINAL/VIDEO_V1.mp4
↓
唯一 VIDEO_V1.mov / .webm / .mkv
↓
09_FINAL 中唯一视频文件
```

结果规则：

- 0 个：`Missing`，继续使用“选择成片”。
- 1 个：自动填入本机 runtime path。
- 多个：`Ambiguous`，显示候选但不自动选择；必须人工确认。

人工选择优先于自动发现：如果当前已经存在人工填写 / 选择的本机路径，自动 discovery 只显示找到的候选，不覆盖人工选择。GUCC 会用独立的本机 `localStorage` provenance 记录“哪些值是自动填入的”，因此页面刷新后如果候选后来变成 `Missing / Ambiguous`，只会清掉过期的自动路径，不会误删人工选择。该 provenance 不属于 Publish state，也不会发送到 Supabase 或 Drive。

## Cover discovery

Cover 是可选项，不进入 Production 状态机，不是 Release gate，也不会上传到 Supabase / Drive。

推荐本机命名：

```text
10_RELEASE/COVER_16_9.png
10_RELEASE/COVER_4_3.png
10_RELEASE/COVER_3_4.png
10_RELEASE/COVER_9_16.png
```

也兼容现有 Cover Generator 导出的比例命名，例如：

```text
*_16x9_1920x1080.*
*_4x3_1600x1200.*
*_3x4_1200x1600.*
*_9x16_1080x1920.*
```

多个匹配候选同样返回 `Ambiguous`，不会按 mtime 猜。

## 本机路径安全边界

`videoPath` / `coverPath` 只属于当前机器的发布 runtime。它们可以发送给：

```text
http://127.0.0.1:17877
```

用于 Publisher Assistant 选择本机文件，但在 `creator-project-api` 的 `saveRelease` 网络请求发出前会被剥离，因此绝对本机路径不会进入 Supabase payload，也不会进入 Drive Archive。

平台最终“发布 / 提交 / 定时发布”动作仍然必须由用户本人确认。
