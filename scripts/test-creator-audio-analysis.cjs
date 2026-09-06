"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
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

function chunk(id, payload) {
  const header = Buffer.alloc(8); header.write(id, 0, "ascii"); header.writeUInt32LE(payload.length, 4);
  return Buffer.concat([header, payload, Buffer.alloc(payload.length % 2)]);
}
function riff(...chunks) {
  const body = Buffer.concat([Buffer.from("WAVE"), ...chunks]);
  return chunk("RIFF", body);
}
function format({ tag = 1, channels = 1, bits = 16, sampleRate = 8000, extensible = false, validBits = bits } = {}) {
  const result = Buffer.alloc(extensible ? 40 : 16); const align = channels * bits / 8;
  result.writeUInt16LE(extensible ? 0xfffe : tag, 0); result.writeUInt16LE(channels, 2); result.writeUInt32LE(sampleRate, 4);
  result.writeUInt32LE(sampleRate * align, 8); result.writeUInt16LE(align, 12); result.writeUInt16LE(bits, 14);
  if (extensible) {
    result.writeUInt16LE(22, 16); result.writeUInt16LE(validBits, 18); result.writeUInt32LE(tag, 24);
    Buffer.from("00001000800000aa00389b71", "hex").copy(result, 28);
  }
  return chunk("fmt ", result);
}
function corrupt(buffer, edit) { const copy = Buffer.from(buffer); edit(copy); return copy; }

assert.equal(Audio.wavDurationMs(riff(chunk("JUNK", Buffer.from("odd")), format(), chunk("data", Buffer.alloc(16000)))), 1000, "Odd metadata chunk padding is not audio");
assert.equal(Audio.wavDurationMs(riff(chunk("data", Buffer.alloc(16000)), format())), 1000, "fmt/data chunk order is independent");
assert.equal(Audio.wavDurationMs(riff(format({ channels: 2, bits: 24, extensible: true, validBits: 20 }), chunk("data", Buffer.alloc(48000)))), 1000, "Extensible 20-in-24-bit stereo duration uses container frames");
assert.equal(Audio.wavDurationMs(riff(format({ tag: 3, bits: 32 }), chunk("data", Buffer.alloc(32000)))), 1000, "IEEE float master duration");
assert.equal(Audio.wavDurationMs(riff(format({ bits: 8 }), chunk("data", Buffer.alloc(8001)))), 1000, "Data padding is not an extra audio sample");
assert.equal(Audio.wavDurationMs(Buffer.concat([wav, Buffer.from("trailing non-RIFF metadata")])), 4000, "Only data inside the declared RIFF container contributes to duration");
assert.throws(() => Audio.wavDurationMs(wav.subarray(0, wav.length - 16)), /truncated.*RIFF/, "Truncated audio must never be accepted as a shorter master");
assert.throws(() => Audio.wavDurationMs(corrupt(wav, (b) => b.writeUInt32LE(b.length + 200, 40))), /truncated data/);
assert.throws(() => Audio.wavDurationMs(corrupt(wav, (b) => b.writeUInt32LE(12, 4))), /truncated fmt/);
assert.throws(() => Audio.wavDurationMs(riff(format(), chunk("data", Buffer.alloc(16000)), Buffer.from("tail"))), /truncated chunk header/);
assert.throws(() => Audio.wavDurationMs(riff(format(), chunk("data", Buffer.alloc(3)))), /incomplete audio frame/);
assert.throws(() => Audio.wavDurationMs(riff(format(), chunk("data", Buffer.alloc(0)))), /no audio frames/);
assert.throws(() => Audio.wavDurationMs(riff(format(), format(), chunk("data", Buffer.alloc(8)))), /duplicate.*fmt/);
assert.throws(() => Audio.wavDurationMs(riff(format(), chunk("data", Buffer.alloc(8)), chunk("data", Buffer.alloc(8)))), /multiple data/);
assert.throws(() => Audio.wavDurationMs(riff(format(), chunk("LIST", Buffer.from("wavl")), chunk("data", Buffer.alloc(8)))), /segmented wavl/);
assert.throws(() => Audio.wavDurationMs(riff(format({ tag: 2 }), chunk("data", Buffer.alloc(8)))), /not PCM\/IEEE/);
assert.throws(() => Audio.wavDurationMs(corrupt(wav, (b) => b.writeUInt32LE(123, 28))), /inconsistent/);
assert.throws(() => Audio.wavDurationMs(corrupt(wav, (b) => b.writeUInt16LE(4, 32))), /inconsistent/);
assert.throws(() => Audio.wavDurationMs(riff(format({ extensible: true, validBits: 24 }), chunk("data", Buffer.alloc(8)))), /valid-bits/);
assert.throws(() => Audio.wavDurationMs(riff(chunk("fmt ", Buffer.alloc(8)), chunk("data", Buffer.alloc(8)))), /incomplete fmt/);
const extensible = riff(format({ extensible: true }), chunk("data", Buffer.alloc(8)));
assert.throws(() => Audio.wavDurationMs(corrupt(extensible, (b) => b.writeUInt16LE(32, 36))), /incomplete extensible/);
assert.throws(() => Audio.wavDurationMs(corrupt(extensible, (b) => { b[59] ^= 1; })), /not PCM\/IEEE/);

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

for (const value of [null, undefined, true, false, "0", "", NaN, Infinity, -0.4]) {
  assert.throws(() => Audio.normalizeSegments([{ startMs: value, endMs: 100, text: "invalid" }]), /numeric timestamp/,
    `Invalid startMs ${String(value)} must not silently coerce to a valid timeline timestamp`);
}
assert.throws(() => Audio.normalizeSegments([{ start: 0, end: null, text: "invalid" }]), /numeric timestamp/);
assert.throws(() => Audio.normalizeSegments([{ startMs: null, endMs: null, start: 0, end: 1, text: "ambiguous" }]), /numeric timestamp/);
assert.throws(() => Audio.normalizeSegments([null]), /must be an object/);
assert.throws(() => Audio.normalizeSegments([{ id: {}, start: 0, end: 1 }]), /invalid identity/);
assert.throws(() => Audio.normalizeSegments([{ id: "", start: 0, end: 1 }]), /empty or duplicate identity/);
assert.throws(() => Audio.normalizeSegments([{ id: "same", start: 0, end: 1, text: "first" }, { id: "same", start: 1, end: 2, text: "second" }]), /duplicate identity/);
assert.throws(() => Audio.normalizeSegments([{ start: 0, end: 1, text: { toString: () => "fabricated" } }]), /text must be a string/);
assert.equal(Audio.normalizeSegments([{ id: 0, start: 0, end: 1, text: "zero" }])[0].id, "0", "Whisper's first numeric segment ID must be preserved");

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "gucc-audio-analysis-"));
try {
  const written = Audio.writeTimelineFiles(outputDir, bundle.files);
  assert.equal(written.length, 4);
  for (const filename of Object.values(Audio.OUTPUT_NAMES)) assert.equal(fs.existsSync(path.join(outputDir, filename)), true, `${filename} must be written on the first pass`);
  assert.throws(() => Audio.writeTimelineFiles(outputDir, bundle.files), /TIMELINE_OUTPUT_EXISTS.*--force/, "Existing formal Timeline outputs must fail closed");
  const forced = { ...bundle.files, ALIGNMENT_REPORT: `${bundle.files.ALIGNMENT_REPORT}\nforced revision\n` };
  Audio.writeTimelineFiles(outputDir, forced, { force: true });
  assert.match(fs.readFileSync(path.join(outputDir, Audio.OUTPUT_NAMES.ALIGNMENT_REPORT), "utf8"), /forced revision/);

  // Full CLI boundary: these are generated test bytes, never a real production master.
  const audioPath = path.join(outputDir, "fixture.wav");
  const asrPath = path.join(outputDir, "fixture-asr.json");
  const scriptPath = path.join(outputDir, "fixture-script.txt");
  const cliOutput = path.join(outputDir, "cli-output");
  fs.writeFileSync(audioPath, wav);
  fs.writeFileSync(asrPath, JSON.stringify({ segments: [{ id: 0, start: 0, end: 3.9, text: "Isolated audio fixture" }] }));
  fs.writeFileSync(scriptPath, "Isolated audio fixture");
  const args = [path.join(__dirname, "creator-audio-analysis.cjs"), "--audio", audioPath, "--asr", asrPath, "--script", scriptPath, "--output", cliOutput];
  const run = () => spawnSync(process.execPath, args, { encoding: "utf8" });
  let result = run();
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.equal(JSON.parse(result.stdout).duration_ms, 4000);
  assert.equal(JSON.parse(fs.readFileSync(path.join(cliOutput, Audio.OUTPUT_NAMES.TRANSCRIPT_ALIGNED), "utf8")).segments[0].id, "0");
  const originals = Object.values(Audio.OUTPUT_NAMES).map((name) => [name, fs.readFileSync(path.join(cliOutput, name))]);
  fs.writeFileSync(audioPath, wav.subarray(0, wav.length - 16));
  const damagedChecksum = Audio.audioChecksum(fs.readFileSync(audioPath));
  result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /truncated.*RIFF/);
  for (const [name, bytes] of originals) assert.deepEqual(fs.readFileSync(path.join(cliOutput, name)), bytes, "Rejected audio must leave existing Timeline outputs untouched");
  assert.equal(Audio.audioChecksum(fs.readFileSync(audioPath)), damagedChecksum, "Analysis must never repair, trim or retime its input");
  fs.writeFileSync(audioPath, wav);
  if (process.env.GUCC_AUDIO_FFPROBE_SMOKE === "1") {
    assert.equal(Audio.ffprobeDurationMs(audioPath), Audio.wavDurationMs(wav), "Independent ffprobe agrees with RIFF duration");
    console.log("Optional independent ffprobe duration smoke passed.");
  }
} finally {
  fs.rmSync(outputDir, { recursive: true, force: true });
}

console.log("Creator real-audio analysis tests passed: duration/checksum provenance, timestamped bundle, alignment, pause output and fail-closed cases are verified.");
