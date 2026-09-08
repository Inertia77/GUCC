# Creator Local Agent

Status: **ACTIVE / current runtime operations**

Local Agent 为 Creator OS 提供本机 Workspace 与 Logical Artifact 的真实文件观察。它只处理用户已经拥有的 Creator Project，不创建 Auth User，不使用 `service_role`，也不上传大型媒体。

## Start

```powershell
npm.cmd run creator:agent -- --setup
npm.cmd run creator:agent -- --once
npm.cmd run creator:agent -- --watch
```

为明确的 Creator Project 创建 / 同步本地 Workspace：

```powershell
npm.cmd run creator:agent -- --bootstrap-project <projectId>
```

`--bootstrap-project` 与 `--setup / --once / --watch` 是不同操作，不混用。

## What it observes

Local Agent 使用 Project ID 和 scoped Logical Artifact identity，不按标题或“最近文件”猜项目。

基础 identity：

```text
project_id
+ artifact_scope_type
+ artifact_scope_id
+ file_key
```

当前 scope 包括：

- `project`
- `language_track`
- `visual_master`
- `variant`

Agent 读取已登记的 canonical relative path，记录 `present / missing / unknown / stale` 等 observation metadata。文件是否存在与 Logical Artifact status / Human Lock 是两回事；物理文件出现不会自动完成 Audio Lock、Timeline Lock、Picture Lock 或 Publish。

## Local-first boundary

上传到 Creator API 的 observation 只包含：

- logical artifact / scope identity
- device identity
- project-relative path
- filename
- availability
- MIME / size / mtime
- checksum（按当前 hash 策略）
- observation time / small metadata

不会发送：

- file bytes / Blob / base64
- absolute local path
- password
- `service_role`
- Human Lock approval

Large media 始终留在本机。

## Discovery and safety

Workspace project identity 来自：

```text
00_CONTROL/PROJECT_DATA.json
```

Local Agent 会拒绝或保守处理：

- 缺失 / 无效 Project ID
- path traversal
- Workspace Root 外 realpath
- symlink / junction escape
- 重复 project identity
- 无法读取的目录
- 不属于注册 Logical Artifact 的任意大范围磁盘扫描

Watch mode 使用事件合并与周期 reconciliation，目标是恢复错过的文件事件，而不是高频扫描整块磁盘。

## Cloud relationship

```text
Local Agent
→ user-authenticated creator-project-api
→ creator_file_locations / event history
```

`creator_project_files` 仍是 Logical Artifact registry；`creator_file_locations` 是某个设备对物理文件的 observation。

Production → Files 与 Creator Dashboard 会显示 Expected / Observed 状态。Owner session、Project identity 与 scope 必须匹配，旧异步响应不能覆盖另一个项目的 UI。

## Workspace bootstrap

当前 Global Production 会按 child scope 生成动态目录，例如：

```text
02_SCRIPT/LANG/{TRACK_KEY}
03_AUDIO/LANG/{TRACK_KEY}
04_SUBTITLES/LANG/{TRACK_KEY}
06_EDIT_PLAN/VISUAL_MASTER/{VISUAL_MASTER_KEY}
10_RELEASE/VARIANTS/{VARIANT_KEY}
```

完整 Workspace 规则见 [`creator-local-project-workspace.md`](./creator-local-project-workspace.md)。

## Drive archive

Google Drive Lightweight Project Archive 已经实现，但它是独立的轻量知识归档能力，不是 Local Agent 的媒体同步层。设置见 [`creator-archive-runtime-setup.md`](./creator-archive-runtime-setup.md)。

大型视频、音频、录屏、剪辑工程继续保持 Local-first。
