(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GuccTimelineContract = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const SCHEMA_VERSION = "gucc-timeline-v1";
  const TIMING_SOURCE = "SUBTITLE_MASTER";

  function normalizeNewlines(value) {
    return String(value == null ? "" : value).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  }

  function parseTimecode(value) {
    const match = String(value || "").trim().match(/^(\d{1,3}):([0-5]\d):([0-5]\d)[,.](\d{3})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    const millis = Number(match[4]);
    return (((hours * 60) + minutes) * 60 + seconds) * 1000 + millis;
  }

  function formatSrtTime(ms) {
    const value = Math.max(0, Math.round(Number(ms) || 0));
    const hours = Math.floor(value / 3600000);
    const minutes = Math.floor((value % 3600000) / 60000);
    const seconds = Math.floor((value % 60000) / 1000);
    const millis = value % 1000;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
  }

  function formatTimelineTime(ms) {
    return formatSrtTime(ms).replace(",", ".");
  }

  function parseSrt(input) {
    const text = normalizeNewlines(input).trim();
    const cues = [];
    const errors = [];
    const warnings = [];
    if (!text) return { cues, errors: ["SUBTITLE_MASTER.srt 为空"], warnings, stats: timelineStats(cues) };

    const blocks = text.split(/\n{2,}/);
    blocks.forEach((rawBlock, blockIndex) => {
      const lines = rawBlock.split("\n").map((line) => line.trimEnd());
      if (!lines.some((line) => line.trim())) return;
      const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeLineIndex < 0) {
        errors.push(`第 ${blockIndex + 1} 个字幕块缺少时间码`);
        return;
      }
      const timeMatch = lines[timeLineIndex].match(/^\s*(\d{1,3}:[0-5]\d:[0-5]\d[,.]\d{3})\s*-->\s*(\d{1,3}:[0-5]\d:[0-5]\d[,.]\d{3})(?:\s+.*)?$/);
      if (!timeMatch) {
        errors.push(`第 ${blockIndex + 1} 个字幕块时间码格式无效：${lines[timeLineIndex]}`);
        return;
      }
      const startMs = parseTimecode(timeMatch[1]);
      const endMs = parseTimecode(timeMatch[2]);
      if (startMs == null || endMs == null) {
        errors.push(`第 ${blockIndex + 1} 个字幕块时间码无法解析`);
        return;
      }
      if (endMs <= startMs) {
        errors.push(`第 ${blockIndex + 1} 个字幕块结束时间必须晚于开始时间`);
        return;
      }
      const textLines = lines.slice(timeLineIndex + 1).map((line) => line.trim()).filter(Boolean);
      const cueText = textLines.join("\n").trim();
      if (!cueText) {
        errors.push(`第 ${blockIndex + 1} 个字幕块没有文字`);
        return;
      }
      const declaredIndex = timeLineIndex > 0 && /^\d+$/.test(lines[timeLineIndex - 1].trim())
        ? Number(lines[timeLineIndex - 1].trim())
        : null;
      cues.push({
        index: cues.length + 1,
        declaredIndex,
        startMs,
        endMs,
        start: formatSrtTime(startMs),
        end: formatSrtTime(endMs),
        text: cueText,
      });
    });

    for (let index = 1; index < cues.length; index += 1) {
      const previous = cues[index - 1];
      const current = cues[index];
      if (current.startMs < previous.startMs) errors.push(`字幕 ${current.index} 的开始时间早于前一条开始时间`);
      if (current.startMs < previous.endMs) warnings.push(`字幕 ${previous.index} 与 ${current.index} 时间有重叠，请确认是否为真实需要`);
    }
    const declared = cues.map((cue) => cue.declaredIndex).filter((value) => value != null);
    if (declared.length && declared.some((value, index) => value !== index + 1)) warnings.push("原 SRT 序号不连续；规范化输出会重新编号");
    return { cues, errors, warnings, stats: timelineStats(cues) };
  }

  function timelineStats(cues) {
    const list = Array.isArray(cues) ? cues : [];
    const durationMs = list.length ? Math.max(...list.map((cue) => cue.endMs)) : 0;
    const spokenMs = list.reduce((sum, cue) => sum + Math.max(0, cue.endMs - cue.startMs), 0);
    const textChars = [...list.map((cue) => cue.text).join("")].length;
    return { cueCount: list.length, durationMs, spokenMs, textChars };
  }

  function normalizeSrt(cues) {
    return (cues || []).map((cue, index) => `${index + 1}\n${formatSrtTime(cue.startMs)} --> ${formatSrtTime(cue.endMs)}\n${String(cue.text || "").trim()}`).join("\n\n") + ((cues || []).length ? "\n" : "");
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function timelineSentenceCsv(cues) {
    const rows = [["INDEX", "START", "END", "START_MS", "END_MS", "DURATION_MS", "TEXT"]];
    (cues || []).forEach((cue, index) => {
      rows.push([
        index + 1,
        formatTimelineTime(cue.startMs),
        formatTimelineTime(cue.endMs),
        cue.startMs,
        cue.endMs,
        cue.endMs - cue.startMs,
        String(cue.text || "").replace(/\n+/g, " ").trim(),
      ]);
    });
    return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
  }

  function stripVoiceMarkup(value) {
    return normalizeNewlines(value)
      .replace(/^#{1,6}\s+.*$/gm, "")
      .replace(/\[AV:(?:ACTION|UI|NUMBER|COMPARE|CAUSE_EFFECT|SEQUENCE|ERROR|CORRECT|DIAGRAM|TEXT)\]/gi, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[*_`~]/g, "")
      .replace(/<[^>]+>/g, "")
      .trim();
  }

  function normalizeComparisonText(value) {
    return stripVoiceMarkup(value).normalize("NFKC").replace(/[\s\p{P}\p{S}]+/gu, "");
  }

  function compareTranscript(voiceMaster, transcriptText) {
    const script = normalizeComparisonText(voiceMaster);
    const actual = normalizeComparisonText(transcriptText);
    let prefix = 0;
    const maxPrefix = Math.min(script.length, actual.length);
    while (prefix < maxPrefix && script[prefix] === actual[prefix]) prefix += 1;
    let suffix = 0;
    const maxSuffix = Math.min(script.length - prefix, actual.length - prefix);
    while (suffix < maxSuffix && script[script.length - 1 - suffix] === actual[actual.length - 1 - suffix]) suffix += 1;
    const equal = script === actual && script.length > 0;
    const contextStart = Math.max(0, prefix - 24);
    const scriptEnd = Math.min(script.length, prefix + 48);
    const actualEnd = Math.min(actual.length, prefix + 48);
    return {
      status: equal ? "MATCH" : "REVIEW",
      exactNormalizedMatch: equal,
      scriptChars: script.length,
      transcriptChars: actual.length,
      charDelta: actual.length - script.length,
      commonPrefixChars: prefix,
      commonSuffixChars: suffix,
      firstDifferenceIndex: equal ? -1 : prefix,
      scriptContext: equal ? "" : script.slice(contextStart, scriptEnd),
      transcriptContext: equal ? "" : actual.slice(contextStart, actualEnd),
    };
  }

  function alignedTranscriptJson({ projectId = "", projectName = "", cues = [], comparison } = {}) {
    const stats = timelineStats(cues);
    return `${JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      projectId: String(projectId || ""),
      projectName: String(projectName || ""),
      timingSource: TIMING_SOURCE,
      stats,
      scriptComparison: comparison || null,
      cues: cues.map((cue, index) => ({
        index: index + 1,
        start: formatTimelineTime(cue.startMs),
        end: formatTimelineTime(cue.endMs),
        startMs: cue.startMs,
        endMs: cue.endMs,
        durationMs: cue.endMs - cue.startMs,
        text: cue.text,
        timingSource: TIMING_SOURCE,
      })),
    }, null, 2)}\n`;
  }

  function alignmentReportMarkdown({ projectId = "", projectName = "", cues = [], comparison } = {}) {
    const stats = timelineStats(cues);
    const status = comparison?.status || "REVIEW";
    const mismatch = status === "MATCH" ? "标准化后与 VOICE_MASTER 一致。" : [
      "实际字幕文本与 VOICE_MASTER 不完全一致，需要人工确认差异是否来自真实口播。",
      `- first_difference_index: ${comparison?.firstDifferenceIndex ?? "unknown"}`,
      `- script_chars: ${comparison?.scriptChars ?? 0}`,
      `- transcript_chars: ${comparison?.transcriptChars ?? 0}`,
      `- char_delta: ${comparison?.charDelta ?? 0}`,
      `- script_context: ${comparison?.scriptContext || "（空）"}`,
      `- transcript_context: ${comparison?.transcriptContext || "（空）"}`,
    ].join("\n");
    return `# ALIGNMENT REPORT｜${projectName || projectId || "Creator Project"}\n\n## Identity\n- project_id: ${projectId || "unknown"}\n- timing_source: ${TIMING_SOURCE}\n- cue_count: ${stats.cueCount}\n- timeline_end_ms: ${stats.durationMs}\n\n## Script Comparison\n- status: ${status}\n${mismatch}\n\n## Safety Boundary\n- 时间码只来自 SUBTITLE_MASTER.srt。\n- VOICE_MASTER 只用于文本差异检查，绝不用于推断、补齐或重算时间码。\n- 本报告不证明 ASR / 转写模型正确；若实际听感与字幕不一致，必须修改 SRT 后重新生成。\n- GUCC 不会修改 AUDIO_MASTER，也不会为了匹配脚本而拉伸、裁切或重定时音频。\n`;
  }

  function inspectSrt(input) {
    return parseSrt(input);
  }

  function buildTimelineArtifacts({ projectId = "", projectName = "", voiceMaster = "", srtText = "" } = {}) {
    const inspection = inspectSrt(srtText);
    if (inspection.errors.length) {
      const error = new Error(`SUBTITLE_MASTER.srt 校验失败：${inspection.errors.join("；")}`);
      error.validation = inspection;
      throw error;
    }
    const subtitleMaster = normalizeSrt(inspection.cues);
    const transcriptText = inspection.cues.map((cue) => cue.text).join("\n");
    const comparison = compareTranscript(voiceMaster, transcriptText);
    return {
      validation: { ...inspection, comparison },
      artifacts: {
        SUBTITLE_MASTER: subtitleMaster,
        TIMELINE_SENTENCE: timelineSentenceCsv(inspection.cues),
        TRANSCRIPT_ALIGNED: alignedTranscriptJson({ projectId, projectName, cues: inspection.cues, comparison }),
        ALIGNMENT_REPORT: alignmentReportMarkdown({ projectId, projectName, cues: inspection.cues, comparison }),
      },
    };
  }

  function timelineHandoffPrompt(project = {}) {
    const projectId = String(project.projectId || "unknown");
    const projectName = String(project.name || "Creator Project");
    return `# GUCC Timeline Handoff｜生成 SUBTITLE_MASTER.srt\n\n你正在处理 Creator Project：${projectName}（${projectId}）。\n\n## Input\n- 03_AUDIO/AUDIO_MASTER.wav：唯一真实时间轴。\n- 02_SCRIPT/VOICE_MASTER.md：只用于核对文字，不是时间码来源。\n\n## Task\n1. 必须实际读取 / 听取 AUDIO_MASTER。\n2. 按真实口播生成精确 SRT，保留实际说出口的内容。\n3. 不得因为 VOICE_MASTER 写了某句话就假设音频中也说了；实际口播与脚本不同，以音频为准。\n4. 不得裁切、拉伸、重定时或修改 AUDIO_MASTER。\n5. 若无法可靠读取音频，明确返回 BLOCKED，不得估算时间码。\n\n## Output\n只需要交付 SUBTITLE_MASTER.srt。GUCC 会在导入后确定性生成 TIMELINE_SENTENCE.csv、TRANSCRIPT_ALIGNED.json 与 ALIGNMENT_REPORT.md。\n\n## SRT Requirements\n- UTF-8。\n- 时间格式 HH:MM:SS,mmm --> HH:MM:SS,mmm。\n- 每条字幕结束时间必须晚于开始时间。\n- 按时间升序。\n- 不要把解释、Markdown 说明或代码围栏写进 SRT。\n`;
  }

  return {
    SCHEMA_VERSION,
    TIMING_SOURCE,
    normalizeNewlines,
    parseTimecode,
    formatSrtTime,
    formatTimelineTime,
    parseSrt,
    inspectSrt,
    timelineStats,
    normalizeSrt,
    timelineSentenceCsv,
    stripVoiceMarkup,
    normalizeComparisonText,
    compareTranscript,
    alignedTranscriptJson,
    alignmentReportMarkdown,
    buildTimelineArtifacts,
    timelineHandoffPrompt,
  };
});
