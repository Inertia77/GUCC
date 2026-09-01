"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Audio = require("./creator-audio-analysis.cjs");

function pcmWav(durationMs, sampleRate = 8000) {
  const samples = Math.round(sampleRate * durationMs / 1000); const dataBytes = samples * 2; const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write("RIFF", 0, "ascii"); buffer.writeUInt32LE(36 + dataBytes, 4); buffer.write("WAVE", 8, "ascii"); buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22); buffer.writeUInt32LE(sampleRate, 24); buffer.writeUInt32LE(sampleRate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii"); buffer.writeUInt32LE(dataBytes, 40); return buffer;
}

const wav = pcmWav(4000);
assert.equal(Audio.wavDurationMs(wav), 4000, "WAV duration must be read from the real RIFF data size/byte rate");
assert.equal(Audio.audioChecksum(wav), `sha256:${crypto.createHash("sha256").update(wav).digest("hex")}`);

const segments = [{ start: 0, end: 1.5, text: "真实 音频" }, { start: 1.9, end: 3.9, text: "时间轴" }];
const bundle = Audio.buildTimelineBundle({ audioPath: "AUDIO_MASTER.wav", audioBuffer: wav, durationMs: Audio.wavDurationMs(wav), provider: "timestamped-local-asr", languageCode: "zh-CN", segments, lockedScript: "真实音频时间轴" });
assert.equal(bundle.provenance.timing_provenance, "real_audio");
assert.equal(bundle.alignmentStatus, "VALID");
assert.match(bundle.files.SUBTITLE_MASTER, /00:00:00,000 --> 00:00:01,500/);
assert.match(bundle.files.TIMELINE_SENTENCE, /AUDIO_CHECKSUM/);
assert.match(bundle.files.TRANSCRIPT_ALIGNED, /"pauses"/);
assert.match(bundle.files.ALIGNMENT_REPORT, /timing_provenance: real_audio/);

assert.throws(() => Audio.buildTimelineBundle({ audioPath: "AUDIO_MASTER.wav", audioBuffer: wav, durationMs: 4000, provider: "", languageCode: "zh-CN", segments }), /ASR provider identity is required/);
assert.throws(() => Audio.buildTimelineBundle({ audioPath: "AUDIO_MASTER.wav", audioBuffer: wav, durationMs: 4000, provider: "timestamped-local-asr", languageCode: "zh-CN", segments: [{ startMs: 0, endMs: 3000, text: "one" }, { startMs: 2500, endMs: 3900, text: "overlap" }] }), /overlaps the previous/);
assert.throws(() => Audio.buildTimelineBundle({ audioPath: "AUDIO_MASTER.wav", audioBuffer: wav, durationMs: 4000, provider: "script-estimate", languageCode: "zh-CN", segments }), /not estimated or synthetic timing/);

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "gucc-audio-analysis-"));
try {
  const written = Audio.writeTimelineFiles(outputDir, bundle.files);
  assert.equal(written.length, 4);
  for (const filename of Object.values(Audio.OUTPUT_NAMES)) assert.equal(fs.existsSync(path.join(outputDir, filename)), true, `${filename} must be written on the first pass`);
  assert.throws(() => Audio.writeTimelineFiles(outputDir, bundle.files), /TIMELINE_OUTPUT_EXISTS.*--force/, "Existing formal Timeline outputs must fail closed");
  const forced = { ...bundle.files, ALIGNMENT_REPORT: `${bundle.files.ALIGNMENT_REPORT}\nforced revision\n` };
  Audio.writeTimelineFiles(outputDir, forced, { force: true });
  assert.match(fs.readFileSync(path.join(outputDir, Audio.OUTPUT_NAMES.ALIGNMENT_REPORT), "utf8"), /forced revision/);
} finally {
  fs.rmSync(outputDir, { recursive: true, force: true });
}

console.log("Creator real-audio analysis tests passed: duration/checksum provenance, timestamped bundle, alignment, pause output and fail-closed cases are verified.");
