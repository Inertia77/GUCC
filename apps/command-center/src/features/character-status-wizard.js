import { API } from '../api.js';
import { $, escapeHtml, closeDrawer, openDrawer, showToast } from '../ui.js';
import { isCanonicalCharacterStatus, displayCharacterStatus } from '../fixed-field-options.js';

const OPTIONS = [
  { value: '◯', label: '完成', explanation: '已经完成' },
  { value: '△', label: '进行中', explanation: '已经进行一部分' },
  { value: '✕', label: '未开始', explanation: '目前尚未进行' },
  { value: '対象外', label: '对象外', explanation: '不纳入这项工作的范围' }
];
const GAMES = [
  ['绝', '绝区零'], ['异', '异环'], ['鸣', '鸣潮'],
  ['崩', '崩坏：星穹铁道'], ['阴', '阴阳师'], ['终', '明日方舟：终末地']
];
const state = {
  game: '绝',
  includeReviewed: false,
  characters: [],
  index: 0,
  step: 'research',
  research: '',
  working: false,
  error: ''
};
let refreshList = () => {};

function pending(row) {
  return !isCanonicalCharacterStatus(row.research_status)
    || !isCanonicalCharacterStatus(row.build_status);
}

function current() {
  return state.characters[state.index] || null;
}

function resetChoice() {
  const row = current();
  state.research = isCanonicalCharacterStatus(row?.research_status)
    ? row.research_status : '';
  state.step = 'research';
  state.error = '';
}

function render() {
  const editor = $('#characterStatusWizard');
  const row = current();
  const count = state.characters.length;
  const stepLabel = state.step === 'research' ? '研究状态' : '养成状态';
  const gameOptions = GAMES.map(([code, label]) =>
    '<option value="' + escapeHtml(code) + '"' + (state.game === code ? ' selected' : '') + '>' +
      escapeHtml(label) + '</option>').join('');
  const top = [
    '<div class="editor-header status-wizard-header">',
      '<div><p class="kicker">CHARACTER STATUS / REVIEW</p>',
      '<h2 id="wizardTitle">角色状态 · 逐个校准</h2></div>',
      '<button id="closeStatusWizard" class="icon-button" type="button" aria-label="关闭状态校准">×</button>',
    '</div>',
    '<div class="status-wizard-content">',
      '<div class="status-wizard-controls">',
        '<label>游戏<select id="wizardGame">' + gameOptions + '</select></label>',
        '<label class="wizard-checkbox"><input id="wizardIncludeReviewed" type="checkbox"' +
           (state.includeReviewed ? ' checked' : '') + '>包含已校准角色（用于复查）</label>',
      '</div>'
  ];
  if (!row) {
    top.push('<div class="status-wizard-finish"><span class="wizard-mark">✓</span>',
      '<h3>' + (state.working ? '正在加载…' : '当前范围已全部处理') + '</h3>',
      '<p>' + (state.error ? escapeHtml(state.error) : '可以切换游戏，或勾选「包含已校准角色」复查已有选择。') + '</p></div>');
  } else {
    const percent = count ? Math.floor((state.index / count) * 100) : 0;
    top.push(
      '<div class="status-wizard-progressline"><span>第 ' + (state.index + 1) +
        ' / ' + count + ' 位角色</span><span>第 ' + (state.step === 'research' ? '1' : '2') + ' / 2 项</span></div>',
      '<div class="status-wizard-track"><span style="width:' + percent + '%"></span></div>',
      '<div class="status-wizard-character">',
        '<span class="status-wizard-overline">' + escapeHtml(row.game_title || '') + ' · ' +
          escapeHtml(row.rarity || '角色') + '</span>',
        '<h3>' + escapeHtml(row.character_name || row.name || '') + '</h3>',
        row.full_name && row.full_name !== row.character_name
          ? '<p>' + escapeHtml(row.full_name) + '</p>' : '',
        '<div class="status-wizard-original">数据库原记录 · 研究 ' +
          escapeHtml(displayCharacterStatus(row.research_status)) + ' / 养成 ' +
          escapeHtml(displayCharacterStatus(row.build_status)) + '</div>',
      '</div>',
      '<p class="status-wizard-question">请选择这位角色的<strong>' + stepLabel + '</strong></p>',
      '<div class="status-wizard-choices" role="group" aria-label="' + stepLabel + '">'
    );
    OPTIONS.forEach((option, i) => {
      const selected = state.step === 'research'
        ? state.research === option.value : row.build_status === option.value;
      top.push('<button type="button" class="status-wizard-choice' +
        (selected ? ' is-selected' : '') + '" data-wizard-choice="' + i + '"' +
        (state.working ? ' disabled' : '') + '>',
        '<span class="wizard-choice-symbol">' + option.value + '</span>',
        '<span class="wizard-choice-copy"><strong>' + option.label +
        '</strong><small>' + option.explanation + '</small></span>',
        '<span class="wizard-choice-key">' + (i + 1) + '</span></button>');
    });
    top.push('</div>');
    if (state.working) top.push('<p role="status" class="status-wizard-feedback">保存并校验中，请稍候…</p>');
    if (state.error) top.push('<p role="alert" class="status-wizard-feedback is-error">' + escapeHtml(state.error) + '</p>');
  }
  top.push('</div>',
    '<div class="status-wizard-footer editor-footer">',
      '<button id="wizardBack" type="button" class="secondary"' +
         (state.working || !row || (state.index === 0 && state.step === 'research') ? ' disabled' : '') + '>← 上一步</button>',
      '<button id="wizardSkip" type="button" class="ghost"' +
         (state.working || !row ? ' disabled' : '') + '>跳过当前角色 →</button>',
    '</div>');
  editor.innerHTML = top.join('');
  editor.querySelector('#closeStatusWizard')?.addEventListener('click', () => closeDrawer(editor));
  editor.querySelector('#wizardGame')?.addEventListener('change', (event) => {
    state.game = event.target.value;
    void load();
  });
  editor.querySelector('#wizardIncludeReviewed')?.addEventListener('change', (event) => {
    state.includeReviewed = event.target.checked;
    void load();
  });
  editor.querySelectorAll('[data-wizard-choice]').forEach((button) => {
    button.addEventListener('click', () => void choose(OPTIONS[Number(button.dataset.wizardChoice)].value));
  });
  editor.querySelector('#wizardBack')?.addEventListener('click', () => {
    if (state.step === 'build') state.step = 'research';
    else if (state.index > 0) { state.index--; resetChoice(); }
    state.error = ''; render();
  });
  editor.querySelector('#wizardSkip')?.addEventListener('click', () => {
    state.index++;
    resetChoice();
    render();
  });
}

async function choose(value) {
  const row = current();
  if (!row || state.working) return;
  if (state.step === 'research') {
    state.research = value;
    state.step = 'build';
    state.error = '';
    render();
    return;
  }
  state.working = true;
  state.error = '';
  render();
  try {
    await API.updateCharacterStatus({
      id: row.id,
      research_status: state.research,
      build_status: value
    });
    // Backend returned the committed row; verify detail read so "next" never hides failed writes.
    const detail = await API.getCharacterDetail({ id: row.id });
    if (detail?.research_status !== state.research || detail?.build_status !== value) {
      throw new Error('角色详情回读不一致，请再次确认后重试。');
    }
    row.research_status = state.research;
    row.build_status = value;
    state.index++;
    resetChoice();
    showToast('已保存并核实：' + (row.character_name || row.name));
    void Promise.resolve(refreshList()).catch(() => {});
  } catch (error) {
    state.error = error?.message || '保存失败，请重试。';
  } finally {
    state.working = false;
    render();
  }
}

async function load() {
  if (state.working) return;
  state.working = true;
  state.characters = [];
  state.index = 0;
  state.error = '';
  render();
  try {
    const data = await API.searchCharacters({ keyword: '', game_code: state.game, limit: 1000 });
    const rows = Array.isArray(data) ? data : (data?.rows || []);
    state.characters = state.includeReviewed ? rows : rows.filter(pending);
    resetChoice();
  } catch (error) {
    state.error = error?.message || '加载角色失败。';
  } finally {
    state.working = false;
    render();
  }
}

export function initCharacterStatusWizard({ onSaved } = {}) {
  refreshList = onSaved || (() => {});
  $('#startCharacterStatusWizard').addEventListener('click', () => {
    state.game = $('#charGame').value && GAMES.some(([code]) => code === $('#charGame').value)
      ? $('#charGame').value : '绝';
    state.includeReviewed = false;
    state.characters = [];
    state.index = 0;
    state.error = '';
    state.working = true;
    render();
    openDrawer($('#characterStatusWizard'));
    state.working = false;
    void load();
  });
  $('#characterStatusWizard').addEventListener('keydown', (event) => {
    if (state.working || !current()) return;
    if (/^[1-4]$/.test(event.key) && !['SELECT', 'INPUT'].includes(document.activeElement?.tagName)) {
      event.preventDefault();
      void choose(OPTIONS[Number(event.key) - 1].value);
    }
  });
}
