/*
 * GUCC / Atelier record identity v2.
 * Presentation only. No database mutations, inferred rank, inventory or progress.
 * Visual context is separated from the actual searchable record fields.
 */
const GAME_SKINS = Object.freeze({
  '崩': ['HSR', '星轨档案', 'STAR RAIL · ARCHIVE'],
  '绝': ['ZZZ', '录像档案', 'NEW ERIDU · RECORD'],
  '鸣': ['WW', '共鸣档案', 'RESONANCE · FREQUENCY'],
  '终': ['ENF', '工程档案', 'FIELD OPS · TERMINAL'],
  '异': ['NTE', '异象档案', 'CITY · ANOMALY'],
  '阴': ['YYS', '平安卷宗', 'HEIAN · ARCHIVE']
});
const ALIAS = Object.freeze({
  HSR: '崩', ZZZ: '绝', WW: '鸣', ENF: '终', '末': '终',
  NTE: '异', YYS: '阴'
});
const RECORD_KINDS = Object.freeze({
  character: '角色', party: '阵容', mechanism: '机制', version: '版本'
});

/**
 * Decorative plate displayed at the top of a real DB result card.
 * It never declares a game state or substitutes for data-backed status badges.
 * Values are internal fixed strings, not user-controlled record data.
 */
export function renderGameCardPlate(gameCode, recordKind) {
  const code = ALIAS[String(gameCode ?? '')] || String(gameCode ?? '');
  const skin = GAME_SKINS[code];
  const kind = RECORD_KINDS[recordKind];
  if (!skin || !kind) return '';
  return `<div class="game-card-plate" aria-hidden="true">
    <span class="game-card-plate__crest"><span class="game-card-plate__glyph"></span></span>
    <span class="game-card-plate__name">${skin[1]}</span>
    <span class="game-card-plate__serial">${skin[2]}</span>
    <span class="game-card-plate__kind">${kind}记录</span>
  </div>`;
}
