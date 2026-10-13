// All character-status answers stay in this browser until the owner exports the
// completed review and explicitly asks for a database update. No mutation RPC is called.
import { API } from '../api.js';
import { $, escapeHtml, closeDrawer, openDrawer, normalizeRows, showToast } from '../ui.js';
import { isCanonicalCharacterStatus, displayCharacterStatus } from '../fixed-field-options.js?v=2';

const KEY = 'gucc-character-status-review-draft-v2';
const OPTIONS = [
  { value: '◯', label: '已完成', detail: '已经完成这项工作' },
  { value: '△', label: '进行中', detail: '完成了一部分，仍需继续' },
  { value: '✕', label: '未开始', detail: '目前还没有进行' },
  { value: '対象外', label: '对象外', detail: '无需进行这项工作' }
];
const GAMES = [
  ['绝', '绝区零'], ['异', '异环'], ['鸣', '鸣潮'],
  ['崩', '崩坏：星穹铁道'], ['阴', '阴阳师'], ['终', '明日方舟：终末地']
];
const valid = (v) => isCanonicalCharacterStatus(v);
const state = {
  rows: {},
  answers: {},
  seen: new Set(),
  game: '绝',
  position: 0,
  step: 'research',
  research: '',
  includeAnswered: false,
  loading: false,
  summary: false,
  error: '',
  notice: '',
  saving: false
};

function readDraft() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '{}');
    const result = {};
    for (const [id, value] of Object.entries(parsed.answers || {})) {
      if (/^[a-f0-9-]{36}$/i.test(id) && valid(value?.research_status) && valid(value?.build_status)) {
        result[id] = { research_status: value.research_status, build_status: value.build_status };
      }
    }
    return result;
  } catch {
    return {};
  }
}
function persistDraft() {
  // A failed browser storage write must never be misrepresented as saved progress.
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, savedAt: new Date().toISOString(), answers: state.answers }));
    return true;
  } catch {
    return false;
  }
}
function allRows() {
  return GAMES.flatMap(([code]) => state.rows[code] || []);
}
function countDone() {
  return allRows().filter(row => isAnswered(row)).length;
}
function isAnswered(row) {
  const value = row && state.answers[row.id];
  return Boolean(value && valid(value.research_status) && valid(value.build_status));
}
function currentRows() {
  return state.rows[state.game] || [];
}
function current() {
  return currentRows()[state.position] || null;
}
function completedInGame(game) {
  return (state.rows[game] || []).filter(isAnswered).length;
}
function resetStep() {
  const row = current();
  state.research = state.answers[row?.id]?.research_status || '';
  state.step = 'research';
  state.error = '';
}
function toNextWithinGame(from = -1) {
  const rows = currentRows();
  for (let i = from + 1; i < rows.length; i++) {
    if (state.includeAnswered || (!isAnswered(rows[i]) && !state.seen.has(rows[i].id))) {
      return i;
    }
  }
  return -1;
}
function nextPendingGame() {
  const index = GAMES.findIndex(([code]) => code === state.game);
  const ordered = [...GAMES.slice(index + 1), ...GAMES.slice(0, index + 1)];
  const match = ordered.find(([code]) => (state.rows[code] || []).some(row => !isAnswered(row) && !state.seen.has(row.id)));
  return match?.[0] || '';
}
function advance() {
  let next = toNextWithinGame(state.position);
  if (next !== -1) {
    state.position = next;
    resetStep();
    return;
  }
  const nextGame = nextPendingGame();
  if (nextGame && !state.includeAnswered) {
    state.game = nextGame;
    state.position = toNextWithinGame(-1);
  } else {
    state.position = currentRows().length;
  }
  resetStep();
}
function selectGame(game) {
  // Revisit intentionally skipped rows when the owner selects that game again.
  (state.rows[game] || []).forEach(row => state.seen.delete(row.id));
  state.game = game;
  state.summary = false;
  state.position = toNextWithinGame(-1);
  resetStep();
  render();
}
function saveLocalAnswer(buildStatus) {
  const row = current();
  if (!row) return;
  const next = { ...state.answers, [row.id]: { research_status: state.research, build_status: buildStatus } };
  const previous = state.answers;
  state.answers = next;
  if (!persistDraft()) {
    state.answers = previous;
    state.error = '本地草稿保存失败，请检查浏览器存储空间或隐私设置。未进入下一位角色。';
    render();
    return;
  }
  state.notice = '已暂存 ' + (row.character_name || row.name) + '，尚未写入数据库';
  state.seen.delete(row.id);
  advance();
  render();
}
function choose(value) {
  if (!current() || state.loading) return;
  if (state.step === 'research') {
    state.research = value;
    state.step = 'build';
    state.error = '';
    render();
    return;
  }
  saveLocalAnswer(value);
}
function selectedExport() {
  const rows = allRows();
  const items = rows.filter(isAnswered).map(row => ({
    id: row.id,
    game_code: row.game_code,
    name: row.character_name || row.name,
    research_status: state.answers[row.id].research_status,
    build_status: state.answers[row.id].build_status
  }));
  return {
    format: 'gucc-character-status-review',
    version: 2,
    exported_at: new Date().toISOString(),
    total_characters: rows.length,
    selected_characters: items.length,
    selections: items
  };
}
async function copyResults() {
  const text = JSON.stringify(selectedExport(), null, 2);
  try {
    await navigator.clipboard.writeText(text);
    state.notice = '已复制完整校准结果，可以粘贴到 ChatGPT，请助手统一写入数据库。';
  } catch (error) {
    state.error = '复制失败，请使用下载 JSON 功能：' + (error?.message || String(error));
  }
  render();
}
function downloadResults() {
  const content = JSON.stringify(selectedExport(), null, 2);
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'GUCC_角色状态校准_待提交.json';
  anchor.click();
  URL.revokeObjectURL(url);
  state.notice = '已导出选择结果；数据库仍未修改。把 JSON 文件上传到 ChatGPT 后，我会统一写入并核验。';
  render();
}
function renderSummary() {
  const total = allRows().length;
  const finished = countDone();
  const complete = total > 0 && finished === total;
  return `
    <section class="status-wizard-summary">
      <div class="status-wizard-summary-numbers">
        <div><small>草稿已完成</small><strong>${finished}</strong></div>
        <div><small>总角色数</small><strong>${total}</strong></div>
        <div><small>尚未选择</small><strong>${total - finished}</strong></div>
      </div>
      <div class="status-wizard-game-progress">
        ${GAMES.map(([code, label]) => {
          const count = (state.rows[code] || []).length;
          return '<button type="button" class="status-wizard-game-row" data-jump-game="' + code + '">' +
            '<span>' + escapeHtml(label) + '</span><strong>' + completedInGame(code) + ' / ' + count + '</strong></button>';
        }).join('')}
      </div>
      ${complete
        ? '<div class="status-wizard-finish"><span class="wizard-mark">✓</span><h3>全部角色已选择完毕</h3>' +
          '<p>所有选择都还在本地草稿中。请导出结果交给 ChatGPT，由助手核对后统一更新 Supabase。</p></div>' +
          '<div class="status-wizard-export-actions">' +
          '<button type="button" id="wizardDownload">下载完整 JSON</button>' +
          '<button type="button" id="wizardCopy" class="secondary">复制完整结果</button></div>'
        : '<p class="status-wizard-feedback">还差 ' + (total - finished) + ' 位角色。可点击任意游戏继续选择；未完成前不会生成最终提交文件。</p>'}
      <p class="status-wizard-no-write">数据库写入：未执行 · 草稿仅保存于当前浏览器</p>
    </section>`;
}
function render() {
  const editor = $('#characterStatusWizard');
  if (!editor) return;
  const row = current();
  const total = allRows().length;
  const finished = countDone();
  const gameOptions = GAMES.map(([code, label]) =>
    '<option value="' + escapeHtml(code) + '"' + (state.game === code ? ' selected' : '') + '>' +
      escapeHtml(label) + ' · ' + completedInGame(code) + '/' + (state.rows[code] || []).length + '</option>').join('');
  const body = [
    '<div class="editor-header status-wizard-header">',
      '<div><p class="kicker">CHARACTER STATUS / LOCAL DRAFT</p>',
      '<h2 id="wizardTitle">角色状态 · 全量校准</h2></div>',
      '<button id="closeStatusWizard" type="button" class="icon-button" aria-label="关闭校准界面">×</button>',
    '</div>',
    '<div class="status-wizard-content">',
      '<p class="status-wizard-no-write">草稿模式 · 所有角色选完后，再统一提交给助手修改数据库</p>',
      '<div class="status-wizard-controls">',
        '<label>游戏<select id="wizardGame"' + (state.loading ? ' disabled' : '') + '>' + gameOptions + '</select></label>',
        '<label class="wizard-checkbox"><input id="wizardIncludeReviewed" type="checkbox"' +
          (state.includeAnswered ? ' checked' : '') + '>复查已选角色</label>',
        '<button type="button" id="wizardShowSummary" class="secondary">' + (state.summary ? '继续选择' : '查看总进度') + '</button>',
      '</div>',
      '<div class="status-wizard-progressline"><span>草稿：' + finished + ' / ' + total +
       '</span><span>尚余 ' + Math.max(0, total - finished) + '</span></div>',
      '<div class="status-wizard-track"><span style="width:' + (total ? Math.floor(finished / total * 100) : 0) + '%"></span></div>'
  ];
  if (state.loading) {
    body.push('<div class="status-wizard-finish" role="status"><h3>正在读取六款游戏的角色资料…</h3></div>');
  } else if (state.summary) {
    body.push(renderSummary());
  } else if (!row) {
    const nextGame = nextPendingGame();
    body.push('<div class="status-wizard-finish"><h3>' +
      (finished === total && total ? '全部角色已选择完毕' : '当前队列已浏览完') + '</h3>' +
      '<p>跳过的角色不会标记为已完成。可以查看总进度，或者切换游戏继续。</p>' +
      (nextGame ? '<button id="wizardNextGame" type="button" class="secondary">前往下一款游戏 →</button>' : '') +
      '</div>');
  } else {
    const choiceLabel = state.step === 'research' ? '研究状态' : '养成状态';
    const localAnswer = state.answers[row.id];
    body.push(
      '<div class="status-wizard-progressline"><span>本游戏第 ' + (state.position + 1) +
        ' / ' + currentRows().length + ' 位</span><span>第 ' +
        (state.step === 'research' ? '1' : '2') + ' / 2 项</span></div>',
      '<div class="status-wizard-character"><span class="status-wizard-overline">' +
        escapeHtml(row.game_title || state.game) + ' · ' + escapeHtml(row.rarity || '角色') + '</span>',
        '<h3>' + escapeHtml(row.character_name || row.name || '') + '</h3>',
        (row.full_name && row.full_name !== row.character_name ? '<p>' + escapeHtml(row.full_name) + '</p>' : ''),
        '<div class="status-wizard-original">数据库目前：研究 ' +
           escapeHtml(displayCharacterStatus(row.research_status)) + ' / 养成 ' +
           escapeHtml(displayCharacterStatus(row.build_status)) + '</div>',
        (localAnswer ? '<div class="status-wizard-original">本地草稿：研究 ' +
          escapeHtml(localAnswer.research_status) + ' / 养成 ' +
          escapeHtml(localAnswer.build_status) + '</div>' : ''),
      '</div>',
      '<p class="status-wizard-question">请选择这位角色的 <strong>' + choiceLabel + '</strong></p>',
      '<div class="status-wizard-choices" role="group" aria-label="' + choiceLabel + '">'
    );
    for (let i = 0; i < OPTIONS.length; i++) {
      const opt = OPTIONS[i];
      const selected = state.step === 'research'
        ? state.research === opt.value
        : localAnswer?.build_status === opt.value;
      body.push('<button type="button" class="status-wizard-choice' +
        (selected ? ' is-selected' : '') + '" data-wizard-choice="' + i + '">' +
        '<span class="wizard-choice-symbol">' + opt.value + '</span>' +
        '<span class="wizard-choice-copy"><strong>' + opt.label + '</strong><small>' +
        opt.detail + '</small></span><span class="wizard-choice-key">' + (i + 1) + '</span></button>');
    }
    body.push('</div>');
    if (state.step === 'build') body.push('<p class="status-wizard-feedback">已选研究状态：' + escapeHtml(state.research) + '</p>');
  }
  if (state.error) body.push('<p class="status-wizard-feedback is-error" role="alert">' + escapeHtml(state.error) + '</p>');
  if (state.notice) body.push('<p class="status-wizard-feedback" role="status">' + escapeHtml(state.notice) + '</p>');
  body.push('</div>',
    '<div class="status-wizard-footer editor-footer">',
      '<button type="button" id="wizardBack" class="secondary"' +
        (state.loading || state.summary || (!row || (state.step === 'research' && state.position === 0)) ? ' disabled' : '') +
        '>← 上一步</button>',
      '<button type="button" id="wizardSkip" class="ghost"' +
        (state.loading || state.summary || !row ? ' disabled' : '') + '>跳过这位 →</button>',
    '</div>');
  editor.innerHTML = body.join('');
  editor.querySelector('#closeStatusWizard')?.addEventListener('click', () => closeDrawer(editor));
  editor.querySelector('#wizardGame')?.addEventListener('change', (e) => selectGame(e.target.value));
  editor.querySelector('#wizardIncludeReviewed')?.addEventListener('change', (e) => {
    state.includeAnswered = e.target.checked;
    state.summary = false;
    state.position = toNextWithinGame(-1);
    resetStep();
    render();
  });
  editor.querySelector('#wizardShowSummary')?.addEventListener('click', () => {
    state.summary = !state.summary;
    if (!state.summary) state.position = toNextWithinGame(-1);
    resetStep();
    render();
  });
  editor.querySelector('#wizardBack')?.addEventListener('click', () => {
    if (state.step === 'build') state.step = 'research';
    else if (state.position > 0) { state.position -= 1; resetStep(); }
    state.error = ''; render();
  });
  editor.querySelector('#wizardSkip')?.addEventListener('click', () => {
    if (current()) state.seen.add(current().id);
    advance(); render();
  });
  editor.querySelectorAll('[data-wizard-choice]').forEach(btn =>
    btn.addEventListener('click', () => choose(OPTIONS[Number(btn.dataset.wizardChoice)].value)));
  editor.querySelectorAll('[data-jump-game]').forEach(btn =>
    btn.addEventListener('click', () => selectGame(btn.dataset.jumpGame)));
  editor.querySelector('#wizardNextGame')?.addEventListener('click', () => {
    const game = nextPendingGame(); if (game) selectGame(game);
  });
  editor.querySelector('#wizardCopy')?.addEventListener('click', () => void copyResults());
  editor.querySelector('#wizardDownload')?.addEventListener('click', downloadResults);
}
async function load() {
  state.loading = true;
  state.error = '';
  render();
  try {
    const batches = await Promise.all(GAMES.map(async ([code]) => {
      const result = await API.searchCharacters({ keyword: '', game_code: code, limit: 1000 });
      return [code, normalizeRows(result)];
    }));
    state.rows = Object.fromEntries(batches);
    state.answers = readDraft();
    state.seen.clear();
    state.position = toNextWithinGame(-1);
    resetStep();
  } catch (error) {
    state.rows = {};
    state.error = '读取角色清单失败，没有修改数据库：' + (error?.message || String(error));
  } finally {
    state.loading = false;
    render();
  }
}
export function initCharacterStatusWizard() {
  $('#startCharacterStatusWizard')?.addEventListener('click', () => {
    const filter = $('#charGame')?.value;
    state.game = GAMES.some(([code]) => code === filter) ? filter : '绝';
    state.rows = {};
    state.answers = readDraft();
    state.position = 0;
    state.includeAnswered = false;
    state.summary = false;
    state.step = 'research';
    state.seen.clear();
    state.error = '';
    state.notice = '';
    openDrawer($('#characterStatusWizard'));
    void load();
  });
  $('#characterStatusWizard')?.addEventListener('keydown', (event) => {
    if (state.loading || state.summary || !current()) return;
    if (/^[1-4]$/.test(event.key) && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      choose(OPTIONS[Number(event.key) - 1].value);
    }
  });
}
