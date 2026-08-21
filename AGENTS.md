# GUCC Agent Rules

## TDX Video Editing Rules

These rules apply to work inside an AI Video Production System project directory.

1. Read `00_CONTROL/STATUS.md`, `PROJECT_MANIFEST.md`, and the relevant locked masters before changing production files. Treat `STATUS.md` as the single state source.
2. Never fabricate game UI, character art, icons, footage, damage numbers, facts, or sources. Record missing inputs in `MISSING_ASSET_REPORT.md`.
3. Do not change locked Content, Script, Music, Audio, or Picture unless the user explicitly reopens that lock.
4. `AUDIO_MASTER` is the absolute timeline. Do not trim, stretch, regenerate, or retime it to fit visuals.
5. `SUBTITLE_MASTER` is the only subtitle timing source. Never infer precise timing from `VOICE_MASTER`.
6. `EDIT_BLUEPRINT` is the structural edit contract. Visual priority is AV Anchor, then Evidence Visual, then Ambient Gameplay.
7. Build V0 as a structural cut. Do not spend the first pass on decorative motion, excessive transitions, or style experiments.
8. Apply revisions only from timecoded `REVIEW_NOTES.md`. Preserve IDs, timestamps, asset filenames, and machine-readable CSV columns.
9. When an asset is missing, stop that shot safely, keep the timeline valid, and report the exact required replacement.
10. Update `BUILD_REPORT.md`, `QC_REPORT.md`, `MISSING_ASSET_REPORT.md`, and `STATUS.md` with actual outputs. A chat response alone is not a production handoff.

The full creative constraints live in `docs/ai-video-production/CREATOR_CONSTITUTION.md`.

