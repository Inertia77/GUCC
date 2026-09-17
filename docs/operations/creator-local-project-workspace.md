# Creator Project Local Workspace

Status: **ACTIVE / current runtime operations**

Creator Project 的真实制作目录采用 **Project ID 驱动的 Local-first Workspace**。Supabase 保存状态、History、Revision、Human Locks、Identity 与 Logical Artifact Metadata；真实视频、音频、录屏、剪辑工程和大型素材留在本机。

## Daily path

通常直接在 Production 中使用：

```text
创建 / 同步本地 Workspace
```

如果浏览器文件系统能力不可用，或需要从终端明确处理一个 Project：

```powershell
npm.cmd run creator:agent -- --bootstrap-project <projectId>
```

项目目录身份以 Project ID 为准，不按标题或修改时间猜测。

新目录使用：

```text
<SafeProjectName>_<ShortProjectId>
```

如果已有目录的 `00_CONTROL/PROJECT_DATA.json.projectId` 与当前 Project 匹配，继续复用；不会为了新命名规则自动复制第二份目录。

## Project identity and projection

Workspace 的核心控制文件包括：

```text
00_CONTROL/PROJECT_DATA.json
00_CONTROL/PROJECT_MANIFEST.md
00_CONTROL/STATUS.md
00_CONTROL/.gucc-projections.json
```

Projection 更新遵循保守策略：

- 文件不存在：创建。
- 文件与目标一致：保持。
- 文件仍等于 GUCC 上一次生成版本：允许更新。
- 文件被人工修改：报告 conflict，不静默覆盖。

path traversal、Workspace Root 外 realpath、symlink / junction escape 必须拒绝。

## Current scoped directories

Legacy/default Project artifacts 仍保持兼容；Global Production 额外按 child identity 生成动态目录，例如：

```text
02_SCRIPT/LANG/{TRACK_KEY}
03_AUDIO/LANG/{TRACK_KEY}
04_SUBTITLES/LANG/{TRACK_KEY}
06_EDIT_PLAN/VISUAL_MASTER/{VISUAL_MASTER_KEY}
10_RELEASE/VARIANTS/{VARIANT_KEY}
```

不要用 `AUDIO_MASTER_JA` / `SUBTITLE_MASTER_EN` 一类文件名后缀模拟 scope。

## Final video discovery

Publish Console / Publisher Assistant 通过同一个 `creatorProjectId` 找本机 Project。

Legacy/default final video discovery 保持保守：

```text
09_FINAL/VIDEO_V1.mp4
↓
唯一兼容视频候选
↓
否则 Missing / Ambiguous
```

多个候选时不按 mtime 猜，必须人工确认。人工选择优先于自动 discovery。

Global Variant / Package output 以 current Global Production scope / package identity 为准，不把一个 `VIDEO_V1` 当成整个 Content Project Root 的唯一输出。

## Cover discovery

Cover 是本机发布资产，不因为文件存在自动满足 Release / Publish gate。推荐比例命名继续兼容：

```text
10_RELEASE/COVER_16_9.png
10_RELEASE/COVER_4_3.png
10_RELEASE/COVER_3_4.png
10_RELEASE/COVER_9_16.png
```

多个匹配候选返回 Ambiguous，不静默选择。

## Local path boundary

本机 `videoPath` / `coverPath` 可以交给本机 Publisher Assistant，例如：

```text
http://127.0.0.1:17877
```

但绝对本机路径不会进入 Supabase / Google Drive Archive payload。

## Related docs

- [`creator-local-agent.md`](./creator-local-agent.md)
- [`creator-archive-runtime-setup.md`](./creator-archive-runtime-setup.md)
- [`../architecture/creator-os-overview.md`](../architecture/creator-os-overview.md)
- [`../creator-os-user-guide.md`](../creator-os-user-guide.md)

最终公开发布仍由用户确认。
