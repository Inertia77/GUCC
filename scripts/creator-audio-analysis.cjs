"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const Global = require("../assets/creator-global-production-core.js");

function wavDurationMs(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("AUDIO_MASTER is not a readable PCM/IEEE WAV file; use ffprobe-backed analysis for other formats");
  }
  let offset = 12; let byteRate = 0; let dataBytes = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4); const size = buffer.readUInt32LE(offset + 4); const body = offset + 8;
    if (id === "fmt " && size >= 16 && body + 16 <= buffer.length) byteRate = buffer.readUInt32LE(body + 8);
    if (id === "data") { dataBytes = Math.min(size, Math.max(0, buffer.length - body)); break; }
    offset = body + size + (size % 2);
  }
  if (!byteRate || !dataBytes) throw new Error("AUDIO_MASTER WAV is missing fmt/data chunks");
  return Math.round(dataBytes / byteRate * 1000);
}

function ffprobeDurationMs(audioPath, ffprobeBin = process.env.FFPROBE_BIN || "ffprobe") {
  const result = spawnSync(ffprobeBin, ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audioPath], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Unable to read AUDIO_MASTER duration with ffprobe: ${String(result.stderr || result.error?.message || "ffprobe unavailable").trim()}`);
  const seconds = Number(String(result.stdout || "").trim());
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error("ffprobe returned an invalid AUDIO_MASTER duration");
  return Math.round(seconds * 1000);
}

function audioDurationMs(audioPath, buffer = fs.readFileSync(audioPath)) {
  return path.extname(audioPath).toLowerCase() === ".wav" ? wavDurationMs(buffer) : ffprobeDurationMs(audioPath);
}

function audioChecksum(buffer) { return `sha256:${crypto.createHash("sha256").update(buffer).digest("hex")}`; }
function timestamp(ms, srt = false) {
  const safe = Math.max(0, Math.round(Number(ms) || 0)); const hours = Math.floor(safe / 3600000); const minutes = Math.floor(safe % 3600000 / 60000); const seconds = Math.floor(safe % 60000 / 1000); const millis = safe % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${srt ? "," : "."}${String(millis).padStart(3, "0")}`;
}
function csvCell(value) { const text = String(value == null ? "" : value); return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text; }
function csv(rows) { return `${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`; }
function normalizeText(value) { return String(value || "").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, ""); }
function alignmentScore(script, transcript) {
  const expected = normalizeText(script); const actual = normalizeText(transcript);
  if (!expected || !actual) return 0;
  const grams = (value) => { const result = new Map(); for (let i = 0; i < Math.max(1, value.length - 1); i += 1) { const gram = value.slice(i, i + 2); result.set(gram, (result.get(gram) || 0) + 1); } return result; };
  const left = grams(expected); const right = grams(actual); let overlap = 0; let total = 0;
  for (const count of left.values()) total += count;
  for (const [gram, count] of left) overlap += Math.min(count, right.get(gram) || 0);
  return total ? overlap / total : 0;
}

function normalizeSegments(raw) {
  const source = Array.isArray(raw) ? raw : Array.isArray(raw?.segments) ? raw.segments : [];
  return source.map((segment, index) => {
    const milliseconds = segment.startMs != null || segment.endMs != null;
    return {
      id: String(segment.id || `SEG_${String(index + 1).padStart(4, "0")}`),
      startMs: Math.round(Number(milliseconds ? segment.startMs : segment.start) * (milliseconds ? 1 : 1000)),
      endMs: Math.round(Number(milliseconds ? segment.endMs : segment.end) * (milliseconds ? 1 : 1000)),
      text: String(segment.text || "").trim(),
      confidence: segment.confidence == null ? null : Number(segment.confidence),
      words: Array.isArray(segment.words) ? segment.words : [],
    };
  });
}

function buildTimelineBundle({ audioPath, audioBuffer, durationMs, provider, languageCode, segments, lockedScript = "" }) {
  const checksum = audioChecksum(audioBuffer); const normalized = normalizeSegments(segments); const transcript = normalized.map((segment) => segment.text).join(" ").trim();
  const validation = Global.validateAudioAnalysis({ durationMs, provider, audioChecksum: checksum, segments: normalized });
  if (!validation.valid) throw new Error(`REAL_AUDIO_ANALYSIS_BLOCKED: ${validation.errors.join("; ")}`);
  const score = alignmentScore(lockedScript, transcript); const alignmentStatus = lockedScript ? (score >= 0.72 ? "VALID" : "REVIEW_REQUIRED") : "REVIEW_REQUIRED";
  const pauses = normalized.slice(1).map((segment, index) => ({ afterSegmentId: normalized[index].id, startMs: normalized[index].endMs, endMs: segment.startMs, durationMs: segment.startMs - normalized[index].endMs })).filter((pause) => pause.durationMs >= 350);
  const provenance = { timing_provenance: "real_audio", provider, language_code: languageCode || "", audio_checksum: checksum, audio_filename: path.basename(audioPath), duration_ms: durationMs, analyzed_at: new Date().toISOString() };
  const subtitleMaster = `${normalized.map((segment, index) => `${index + 1}\n${timestamp(segment.startMs, true)} --> ${timestamp(segment.endMs, true)}\n${segment.text}`).join("\n\n")}\n`;
  const timelineSentence = csv([["ID", "START", "END", "DURATION_MS", "TEXT", "AUDIO_CHECKSUM"], ...normalized.map((segment) => [segment.id, timestamp(segment.startMs), timestamp(segment.endMs), segment.endMs - segment.startMs, segment.text, checksum])]);
  const transcriptAligned = `${JSON.stringify({ schemaVersion: "gucc-real-audio-alignment-v1", provenance, alignment: { status: alignmentStatus, score }, segments: normalized, pauses }, null, 2)}\n`;
  const alignmentReport = `# ALIGNMENT REPORT\n\n- timing_provenance: real_audio\n- provider: ${provider}\n- audio_checksum: ${checksum}\n- duration_ms: ${durationMs}\n- segment_count: ${normalized.length}\n- pause_count: ${pauses.length}\n- locked_script_alignment: ${alignmentStatus}\n- alignment_score: ${score.toFixed(4)}\n\n${alignmentStatus === "VALID" ? "Locked script and real-audio transcript are aligned." : "Human review is required before Voice / Timeline Lock."}\n`;
  return { provenance, alignmentStatus, alignmentScore: score, segments: normalized, pauses, files: { SUBTITLE_MASTER: subtitleMaster, TIMELINE_SENTENCE: timelineSentence, TRANSCRIPT_ALIGNED: transcriptAligned, ALIGNMENT_REPORT: alignmentReport } };
}

function runWhisper(audioPath, outputDir, languageCode, whisperBin = process.env.WHISPER_BIN || "whisper") {
  const args = [audioPath, "--output_dir", outputDir, "--output_format", "json", "--word_timestamps", "True"];
  if (languageCode) args.push("--language", languageCode);
  const result = spawnSync(whisperBin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(`LOCAL_ASR_REQUIRED: Whisper did not produce timestamped transcription (${String(result.stderr || result.error?.message || "unavailable").trim()})`);
  const outputPath = path.join(outputDir, `${path.parse(audioPath).name}.json`);
  if (!fs.existsSync(outputPath)) throw new Error("LOCAL_ASR_REQUIRED: Whisper JSON output was not found");
  return JSON.parse(fs.readFileSync(outputPath, "utf8"));
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith("--")) { const key = argv[i].slice(2); const next = argv[i + 1]; result[key] = next && !next.startsWith("--") ? (i += 1, next) : true; }
  return result;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv); const audioPath = path.resolve(String(args.audio || "")); const outputDir = path.resolve(String(args.output || path.dirname(audioPath)));
  if (!args.audio || !fs.existsSync(audioPath)) throw new Error("--audio must identify the real local AUDIO_MASTER");
  fs.mkdirSync(outputDir, { recursive: true });
  const audioBuffer = fs.readFileSync(audioPath); const durationMs = audioDurationMs(audioPath, audioBuffer);
  const asr = args.asr ? JSON.parse(fs.readFileSync(path.resolve(String(args.asr)), "utf8")) : runWhisper(audioPath, outputDir, String(args.language || ""));
  const lockedScript = args.script ? fs.readFileSync(path.resolve(String(args.script)), "utf8") : "";
  const bundle = buildTimelineBundle({ audioPath, audioBuffer, durationMs, provider: String(args.provider || (args.asr ? "external_timestamped_asr" : "openai_whisper_local")), languageCode: String(args.language || ""), segments: asr, lockedScript });
  for (const [key, content] of Object.entries(bundle.files)) {
    const names = { SUBTITLE_MASTER: "SUBTITLE_MASTER.srt", TIMELINE_SENTENCE: "TIMELINE_SENTENCE.csv", TRANSCRIPT_ALIGNED: "TRANSCRIPT_ALIGNED.json", ALIGNMENT_REPORT: "ALIGNMENT_REPORT.md" };
    fs.writeFileSync(path.join(outputDir, names[key]), content, "utf8");
  }
  process.stdout.write(`${JSON.stringify({ status: bundle.alignmentStatus === "VALID" ? "READY_FOR_HUMAN_TIMELINE_LOCK" : "BLOCKED_REVIEW_REQUIRED", ...bundle.provenance, alignment_score: bundle.alignmentScore }, null, 2)}\n`);
}

if (require.main === module) {
  try { main(); } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}

module.exports = { wavDurationMs, ffprobeDurationMs, audioDurationMs, audioChecksum, timestamp, normalizeSegments, alignmentScore, buildTimelineBundle, runWhisper, main };
