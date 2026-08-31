# GUCC Creator OS Phase 2C.2 — Audio → Subtitle → Timeline

## Status

Phase 2C.2 closes the safe handoff between an **Audio-Locked** Creator Project and the deterministic timeline artifacts used by Storyboard / Codex Build.

This phase intentionally does **not** choose or embed a transcription runtime. There is no Whisper daemon, ASR service, OpenAI API call, AI Runner, background process, Windows startup task, or media upload path.

The contract is:

```text
AUDIO_MASTER + Audio Lock
        ↓
Codex / ChatGPT reads the real audio (manual handoff)
        ↓
SUBTITLE_MASTER.srt
        ↓
GUCC validates and deterministically derives
        ├─ TIMELINE_SENTENCE.csv
        ├─ TRANSCRIPT_ALIGNED.json
        └─ ALIGNMENT_REPORT.md
        ↓
complete Timeline Bundle
        ↓
TIMELINE_LOCKED
```

## 1. Core workflow invariant

The formal Timeline Bundle lives in `apps/video-workspace/production-system/engine.js` as the single workflow contract:

- `SUBTITLE_MASTER`
- `TIMELINE_SENTENCE`
- `TRANSCRIPT_ALIGNED`
- `ALIGNMENT_REPORT`

The core exposes the shared helpers used by state gates, reconciliation, import recovery, browser UI, and cloud safety:

- `missingTimelineArtifacts(project)`
- `timelineBundleReady(project)`
- `validateWorkflowInvariants(project)`
- `assertWorkflowInvariants(project)`
- `recoverWorkflowInvariants(project)`

There is no separate Timeline engine monkey patch. `creator-timeline-engine-guard.js` was removed after the invariant moved into the Production Core.

`TIMELINE_LOCKED`, `STORYBOARDING`, and the later nonterminal production states that depend on Timeline Lock cannot be entered or treated as valid while the bundle is incomplete.

`reconcileProject()` only advances `TIMELINE_GENERATION → TIMELINE_LOCKED` after the complete bundle is ready. It does not perform an invalid transition and then roll it back.

## 2. Timing source

`AUDIO_MASTER` remains the absolute audio master. `SUBTITLE_MASTER.srt` is the only accepted subtitle timing source.

`VOICE_MASTER.md` is reference text only. GUCC may compare normalized script text with the actual subtitle transcript, but it never derives, guesses, fills, stretches, or retimes subtitle timestamps from the script.

## 3. Import / normalize safety

All Production project restoration paths already pass through `engine.normalizeProject()`:

- single Project JSON import;
- System JSON import;
- Directory `PROJECT_DATA.json` import;
- local Production store reload;
- cloud project merge.

`normalizeProject()` now applies the same Core workflow invariant. If an imported **nonterminal** state claims `TIMELINE_LOCKED` or a later Timeline-dependent state while the bundle is incomplete, GUCC does not fabricate missing files and does not preserve the invalid lock.

Instead it explicitly reopens the project to:

`TIMELINE_GENERATION`

and records `workflowRecovery.kind = TIMELINE_BUNDLE_INCOMPLETE`, the previous state, source, and missing artifacts. Published/archived history is not reopened by this nonterminal production recovery rule.

## 4. Cloud autosync safety

The Production Bridge reads the current local Project JSON before calling `saveProject`. Before any manual or automatic Creator Project cloud save, it delegates to the same Core:

`engine.validateWorkflowInvariants(project)`

If the invariant is invalid, cloud project sync fails closed and `saveProject` is not called. The Production → Publish handoff is also blocked for an invalid workflow state.

No duplicate Timeline rule is implemented in the Bridge; it only consumes the Core validation result.

No DB trigger, migration, or new Edge Function is required by Phase 2C.2.

## 5. Production UI

Production includes a lightweight **字幕 / 时间线** tab showing:

- `AUDIO_MASTER` readiness;
- Audio Lock state;
- Core Timeline Bundle readiness;
- SRT import/paste;
- deterministic SRT validation;
- cue preview;
- Codex subtitle handoff prompt;
- generation of the canonical Timeline Bundle.

The browser integration uses `E.TIMELINE_BUNDLE_FILES` and `E.timelineBundleReady(project)` from the Core rather than owning another four-file list.

Timeline writes are allowed only in `AUDIO_LOCKED` or `TIMELINE_GENERATION`. If a project is already Timeline Locked or later, the user must explicitly reopen the workflow before retiming subtitles.

## 6. Codex / ChatGPT handoff

The handoff prompt requires:

- `03_AUDIO/AUDIO_MASTER.wav` as the real timing source;
- `02_SCRIPT/VOICE_MASTER.md` only as a text reference.

AI is asked to return only:

`04_SUBTITLES/SUBTITLE_MASTER.srt`

If it cannot reliably inspect the real audio, it must return `BLOCKED` rather than estimate timestamps. GUCC then creates the other three artifacts mechanically.

## 7. Deterministic artifact content

The SRT validator checks malformed/empty cues, invalid ordering, and end time <= start time. Overlap is surfaced as a warning because intentional overlap is technically valid.

The four artifact contents are deterministic for identical `SRT + VOICE_MASTER + project identity` input. In particular, `TRANSCRIPT_ALIGNED.json` no longer embeds a `generatedAt` timestamp.

Generation time belongs in Project/File metadata such as `updatedAt`, not in the deterministic artifact body.

### `SUBTITLE_MASTER.srt`
Normalized canonical SRT. Timing remains exactly the validated SRT timing.

### `TIMELINE_SENTENCE.csv`
One row per cue with index, start/end, start/end milliseconds, duration, and actual subtitle text.

### `TRANSCRIPT_ALIGNED.json`
Machine-readable timed transcript containing project identity, `timingSource = SUBTITLE_MASTER`, statistics, script comparison, and every timed cue.

### `ALIGNMENT_REPORT.md`
Human-readable `VOICE_MASTER` versus actual transcript comparison. A mismatch produces `REVIEW`; it does not rewrite real spoken text.

## 8. Local-first / cloud boundary

The Timeline Bundle is small text production data and can be projected into:

```text
04_SUBTITLES/
  SUBTITLE_MASTER.srt
  TIMELINE_SENTENCE.csv
  TRANSCRIPT_ALIGNED.json
  ALIGNMENT_REPORT.md
```

Phase 2C.2 adds no media cloud upload. `AUDIO_MASTER`, video, gameplay footage, editing project binaries, and other large media remain local. Supabase remains state/history/artifact metadata; Google Drive remains the lightweight archive layer and is not expanded here.

## 9. Acceptance contract

Phase 2C.2 is acceptable when:

1. bare `engine.js` rejects incomplete Timeline Lock without any guard;
2. SRT-only reconciliation stays in `TIMELINE_GENERATION`;
3. complete four-artifact bundle permits Timeline Lock;
4. Storyboarding cannot depend on an incomplete Timeline Bundle;
5. Project/System/Directory/local/cloud restores cannot preserve an invalid nonterminal Timeline Lock;
6. invalid local workflow state cannot be autosynced to Supabase as a valid locked project;
7. an existing complete Timeline project remains unchanged;
8. human Content/Script/Audio/Picture Lock behavior remains unchanged;
9. same timeline input produces byte-stable four-artifact contents;
10. no Whisper/ASR/AI Runner/network media runtime is introduced;
11. full Creator OS CI remains green;
12. Phase 2C.1 remains unmerged until its real Windows field acceptance passes.

## 10. Deferred

Still deferred:

- selecting a local ASR / Whisper implementation;
- fully automatic audio transcription;
- AI Runner / automatic Codex invocation;
- background daemon / heartbeat / Windows startup;
- automatic editing;
- automatic final publish;
- large-media cloud archive;
- Baidu Cloud integration;
- Phase 2C.3.
