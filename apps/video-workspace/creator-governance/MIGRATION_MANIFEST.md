# Creator Governance｜2026-11-10 归档、无损性与兼容清单

## 统一权威目录
- [CREATOR_RULEBOOK.md](./CREATOR_RULEBOOK.md) 全局硬规则、规范宪章、失败防护、冲突登记
- [CAPABILITY_RULES.md](./CAPABILITY_RULES.md) 全部 44 个能力的完整规格
- [TASK_RULES.md](./TASK_RULES.md) 六成果、固定 Prompt 与所有内容题材分支
- [notion-prompts.json](./notion-prompts.json) 31 条完整分步 Prompt
- [creator-governance-runtime.js](./creator-governance-runtime.js) 统一运行注册表，旧 JS 文件不再单独管理规范

## 原位置与逐字归档
- `apps/video-workspace/production-system/core-rules.js` → `archive/creator-governance/2026-11-10/apps__video-workspace__production-system__core-rules.js`；旧路径仅保留无规则正文的兼容 façade
- `apps/video-workspace/production-system/failure-prevention.js` → `archive/creator-governance/2026-11-10/apps__video-workspace__production-system__failure-prevention.js`；旧路径仅保留无规则正文的兼容 façade
- `apps/video-workspace/production-system/capability-library.js` → `archive/creator-governance/2026-11-10/apps__video-workspace__production-system__capability-library.js`；旧路径仅保留无规则正文的兼容 façade
- `apps/video-workspace/creator-six-deliverables.js` → `archive/creator-governance/2026-11-10/apps__video-workspace__creator-six-deliverables.js`；旧路径仅保留无规则正文的兼容 façade
- `apps/video-workspace/ai-prompts.js` → `archive/creator-governance/2026-11-10/apps__video-workspace__ai-prompts.js`；旧路径仅保留无规则正文的兼容 façade
- `apps/video-workspace/notion-prompts.json` → `archive/creator-governance/2026-11-10/apps__video-workspace__notion-prompts.json`
- `docs/ai-video-production/CREATOR_CONSTITUTION.md` → `archive/creator-governance/2026-11-10/docs__ai-video-production__CREATOR_CONSTITUTION.md`
- `docs/ai-video-production/UNIFIED_PIPELINE.md` → `archive/creator-governance/2026-11-10/docs__ai-video-production__UNIFIED_PIPELINE.md`

## 迁移前后完整性基数
Core 类别 9；Failure 条目 53；Hard Stop 5；Capability 44；六成果 6；题材 8；固定任务 22；Notion Prompt 31。

## 不改变业务数据
本次不重置项目 ID、成果、LOCK、已有视频、云端状态或投稿记录；只改变仓库规则存放与消费位置。历史差异保留供用户后续裁决。Notion 在线页不在本次读取、写入或删除范围。
