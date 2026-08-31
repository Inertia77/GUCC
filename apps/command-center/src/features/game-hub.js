import { API } from '../api.js';
import { escapeHtml, normalizeRows } from '../ui.js';

const GAME_SCOPE_KEY = 'gucc-command-center-game-scope-v1';
const GAME_ORDER = [
  { code: '崩', apiCode: '崩', label: '崩铁', title: '崩坏：星穹铁道' },
  { code: '绝', apiCode: '绝', label: '绝区零', title: '绝区零' },
  { code: '鸣', apiCode: '鸣', label: '鸣潮', title: '鸣潮' },
  { code: '终', apiCode: '终', label: '终末地', title: '明日方舟：终末地' },
  { code: '异', apiCode: '异', label: '异环', title: '异环 Neverness to Everness' },
  { code: '阴', apiCode: '阴', label: '阴阳师', title: '阴阳师' }
];

let selectedGame = '';
let onSelectGame = null;
let summaryByGame = new Map();
let hubRoot = null;
let loading = false;

function readSavedGame() {
  try {
    const value = localStorage.getItem(GAME_SCOPE_KEY) || '';
    return GAME_ORDER.some((game) => game.code === value) ? value : '';
  } catch {
    return '';
  }
}

function saveGame(value) {
  try {
    localStorage.setItem(GAME_SCOPE_KEY, value || '');
  } catch {
    // Global switching still works when storage is unavailable.
  }
}

function parseDateOnly(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
}

function parseInstant(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(date, { withTime = false } = {}) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '未记录';
  return new Intl.DateTimeFormat('zh-CN', withTime
    ? { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }
    : { month: '2-digit', day: '2-digit' }).format(date);
}

function daysUntil(date, now = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  return Math.ceil((date.getTime() - now.getTime()) / 86400000);
}

function isActive(start, end, now) {
  const from = start || null;
  const to = end || null;
  if (!from && !to) return false;
  if (from && now < from) return false;
  if (to && now > to) return false;
  return true;
}

function selectCurrentVersion(versions, now) {
  const today = dayStart(now);
  const prepared = versions.map((version) => ({
    ...version,
    _start: parseDateOnly(version.start_date),
    _end: parseDateOnly(version.end_date)
  }));
  const active = prepared
    .filter((version) => version._start && version._start <= today && (!version._end || version._end >= today))
    .sort((a, b) => b._start - a._start);
  if (active.length) return { ...active[0], _state: 'current' };

  const past = prepared
    .filter((version) => version._start && version._start <= today)
    .sort((a, b) => b._start - a._start);
  const future = prepared
    .filter((version) => version._start && version._start > today)
    .sort((a, b) => a._start - b._start);

  if (future[0] && (!past[0] || daysUntil(future[0]._start, now) <= 7)) {
    return { ...future[0], _state: 'upcoming' };
  }
  if (past[0]) return { ...past[0], _state: 'latest-known' };
  if (future[0]) return { ...future[0], _state: 'upcoming' };
  return null;
}

function phaseLabel(value) {
  const token = String(value || '').toLowerCase();
  if (token.includes('whole')) return '整版本';
  if (token.includes('first')) return '上半';
  if (token.includes('second')) return '下半';
  if (token.includes('independent')) return '独立时段';
  if (token.includes('standard')) return '常驻';
  return value || '';
}

function eventName(entry, kind) {
  const character = entry.character_name || entry.character_name_raw || entry.name || '';
  const pool = entry.pool_name || '';
  if (kind === 'banner') return pool ? `${pool}｜${character}` : `${character}卡池`;
  return character ? `${character}获取` : '非卡池获取';
}

function buildSummary(game, versions, now = new Date()) {
  const current = selectCurrentVersion(versions, now);
  const todayKey = dayKey(now);
  const banners = Array.isArray(current?.banners) ? current.banners : [];
  const acquisitions = Array.isArray(current?.acquisitions) ? current.acquisitions : [];
  const timeline = [];
  const activeEntries = [];

  if (current?._end) {
    timeline.push({
      label: `${current.version_no || ''} ${current.version_name || '版本'}`.trim(),
      date: current._end,
      kind: 'version-end'
    });
  }

  banners.forEach((entry) => {
    const start = parseInstant(entry.start_at);
    const end = parseInstant(entry.end_at);
    if (start) timeline.push({ label: eventName(entry, 'banner'), date: start, kind: 'start' });
    if (end) timeline.push({ label: eventName(entry, 'banner'), date: end, kind: 'deadline' });
    if (isActive(start, end, now)) activeEntries.push({ ...entry, _kind: 'banner' });
  });

  acquisitions.forEach((entry) => {
    const start = parseInstant(entry.start_at);
    const end = parseInstant(entry.end_at);
    if (start) timeline.push({ label: eventName(entry, 'acquisition'), date: start, kind: 'start' });
    if (end) timeline.push({ label: eventName(entry, 'acquisition'), date: end, kind: 'deadline' });
    if (isActive(start, end, now)) activeEntries.push({ ...entry, _kind: 'acquisition' });
  });

  const todayEvents = timeline.filter((event) => dayKey(event.date) === todayKey);
  const deadlines = timeline
    .filter((event) => (event.kind === 'deadline' || event.kind === 'version-end') && event.date >= now)
    .sort((a, b) => a.date - b.date);
  const starts = timeline
    .filter((event) => event.kind === 'start' && event.date >= now)
    .sort((a, b) => a.date - b.date);

  const phases = [...new Set(activeEntries
    .filter((entry) => entry._kind === 'banner')
    .map((entry) => phaseLabel(entry.phase))
    .filter(Boolean))];

  let stage = current?._state === 'upcoming' ? '即将开始' : '版本进行中';
  if (phases.length) stage = phases.join(' / ');
  if (!current) stage = '暂无版本锚点';

  let todayText = '无已记录的今日起止事件';
  if (todayEvents.length) {
    const first = todayEvents[0];
    const verb = first.kind === 'start' ? '开始' : '截止';
    todayText = `${first.label} ${verb}${todayEvents.length > 1 ? `（另有 ${todayEvents.length - 1} 项）` : ''}`;
  } else if (activeEntries.length) {
    todayText = `${activeEntries.length} 项有明确时间窗的内容正在进行`;
  }

  const deadline = deadlines[0] || null;
  const deadlineText = deadline
    ? `${deadline.label}｜${formatDate(deadline.date, { withTime: deadline.kind === 'deadline' })}`
    : '暂无已记录截止时间';

  let nextAction = '暂无可由现有结构化数据推导的行动';
  if (deadline) {
    const remain = daysUntil(deadline.date, now);
    if (remain !== null && remain <= 3) nextAction = `优先确认：${deadline.label} 即将截止`;
  }
  if (nextAction.startsWith('暂无') && starts[0] && daysUntil(starts[0].date, now) <= 3) {
    nextAction = `准备：${starts[0].label} 即将开始`;
  }
  if (nextAction.startsWith('暂无') && current) {
    nextAction = `查看 ${current.version_no || ''} ${current.version_name || '当前版本'} 的当前内容`.replace(/\s+/g, ' ').trim();
  }

  const activeBannerNames = activeEntries
    .filter((entry) => entry._kind === 'banner')
    .map((entry) => entry.character_name || entry.character_name_raw)
    .filter(Boolean)
    .slice(0, 4);

  return {
    game,
    current,
    stage,
    todayText,
    deadlineText,
    nextAction,
    activeBannerText: activeBannerNames.length ? activeBannerNames.join(' / ') : '暂无可判定的当前卡池时间窗'
  };
}

function renderSwitcher() {
  return `
    <div class="game-switcher" role="group" aria-label="全局游戏切换">
      <button type="button" class="game-switch-button game-switch-all${selectedGame ? '' : ' is-active'}" data-game-select="" aria-pressed="${selectedGame ? 'false' : 'true'}">全部</button>
      ${GAME_ORDER.map((game) => `
        <button type="button" class="game-switch-button${selectedGame === game.code ? ' is-active' : ''}" data-game-code="${game.code}" data-game-select="${game.code}" aria-pressed="${selectedGame === game.code ? 'true' : 'false'}">
          <span class="game-switch-mark" aria-hidden="true">${game.code}</span>
          <span>${escapeHtml(game.label)}</span>
        </button>`).join('')}
    </div>`;
}

function renderStatusBlock(label, value, icon) {
  return `
    <div class="game-status-block">
      <div class="game-status-label"><span aria-hidden="true">${icon}</span>${escapeHtml(label)}</div>
      <div class="game-status-value">${escapeHtml(value)}</div>
    </div>`;
}

function renderOverviewCard(summary) {
  const { game, current } = summary;
  const version = current
    ? `${current.version_no || ''} ${current.version_name || '未命名版本'}`.replace(/\s+/g, ' ').trim()
    : '暂无结构化版本';
  return `
    <article class="game-overview-card" data-game-code="${game.code}">
      <div class="game-overview-head">
        <div>
          <div class="game-kicker">${game.code} · ${escapeHtml(game.label)}</div>
          <h2>${escapeHtml(game.title)}</h2>
        </div>
        <button type="button" class="game-enter-button" data-game-select="${game.code}" aria-label="进入${escapeHtml(game.title)}">进入</button>
      </div>
      <div class="game-version-line">
        <span>当前版本</span>
        <strong>${escapeHtml(version)}</strong>
        <small>${escapeHtml(summary.stage)}</small>
      </div>
      <div class="game-overview-status">
        ${renderStatusBlock('TODAY', summary.todayText, '●')}
        ${renderStatusBlock('Deadline', summary.deadlineText, '⚠')}
        ${renderStatusBlock('Next Action', summary.nextAction, '→')}
      </div>
    </article>`;
}

function renderFocus(summary) {
  const { game, current } = summary;
  const version = current
    ? `${current.version_no || ''} ${current.version_name || '未命名版本'}`.replace(/\s+/g, ' ').trim()
    : '暂无结构化版本';
  return `
    <section class="game-focus-card" data-game-code="${game.code}" aria-label="${escapeHtml(game.title)} 当前状态">
      <div class="game-focus-identity">
        <div class="game-kicker">当前游戏 · ${game.code}</div>
        <h2>${escapeHtml(game.title)}</h2>
        <div class="game-focus-version">
          <span>当前版本</span>
          <strong>${escapeHtml(version)}</strong>
          <small>${escapeHtml(summary.stage)}</small>
        </div>
        <div class="game-focus-banner"><span>当前卡池</span><strong>${escapeHtml(summary.activeBannerText)}</strong></div>
      </div>
      <div class="game-focus-status">
        ${renderStatusBlock('TODAY', summary.todayText, '●')}
        ${renderStatusBlock('Deadline', summary.deadlineText, '⚠')}
        ${renderStatusBlock('Next Action', summary.nextAction, '→')}
      </div>
    </section>`;
}

function renderHub() {
  if (!hubRoot) return;
  const loaded = summaryByGame.size > 0;
  const body = !loaded
    ? '<div class="game-hub-state">登录后读取六游版本、卡池和获取信息。</div>'
    : selectedGame
      ? renderFocus(summaryByGame.get(selectedGame) || buildSummary(GAME_ORDER.find((game) => game.code === selectedGame), []))
      : `<div class="game-overview-grid">${GAME_ORDER.map((game) => renderOverviewCard(summaryByGame.get(game.code) || buildSummary(game, []))).join('')}</div>`;

  hubRoot.innerHTML = `
    <section class="game-hub-shell" aria-label="六游控制总览">
      <div class="game-hub-heading">
        <div>
          <p class="game-hub-eyebrow">GAME OPERATIONS</p>
          <h2>${selectedGame ? '单游戏上下文' : '六游总览'}</h2>
        </div>
        <p>信息来自现有版本、卡池与非卡池获取数据；没有任务实体的内容不会被猜测。</p>
      </div>
      ${renderSwitcher()}
      ${body}
    </section>`;
}

async function selectGame(value, { notify = true } = {}) {
  selectedGame = GAME_ORDER.some((game) => game.code === value) ? value : '';
  saveGame(selectedGame);
  renderHub();
  if (notify && typeof onSelectGame === 'function') await onSelectGame(selectedGame);
}

export function getSelectedGameScope() {
  return selectedGame;
}

export async function setSelectedGameScope(value, options = {}) {
  await selectGame(value, options);
}

export function initGameHub({ onSelect } = {}) {
  onSelectGame = onSelect || null;
  selectedGame = readSavedGame();
  const mainView = document.querySelector('#mainView');
  const tabs = mainView?.querySelector('.tabs');
  if (!mainView || !tabs) return;

  hubRoot = document.createElement('div');
  hubRoot.id = 'gameHub';
  hubRoot.className = 'game-hub';
  tabs.insertAdjacentElement('beforebegin', hubRoot);
  hubRoot.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-game-select]');
    if (!button) return;
    await selectGame(button.dataset.gameSelect || '');
  });
  renderHub();
}

export async function refreshGameHub({ force = false } = {}) {
  if (loading && !force) return;
  loading = true;
  if (hubRoot) hubRoot.classList.add('is-loading');
  try {
    const results = await Promise.all(GAME_ORDER.map(async (game) => {
      const rows = normalizeRows(await API.searchVersions({ keyword: '', game_code: game.apiCode, limit: 160 }));
      return [game.code, buildSummary(game, rows)];
    }));
    summaryByGame = new Map(results);
    renderHub();
  } catch (error) {
    if (hubRoot) {
      hubRoot.innerHTML = `
        <section class="game-hub-shell">
          <div class="game-hub-heading"><div><p class="game-hub-eyebrow">GAME OPERATIONS</p><h2>六游总览</h2></div></div>
          ${renderSwitcher()}
          <div class="game-hub-state is-error">六游状态读取失败：${escapeHtml(error.message)}</div>
        </section>`;
    }
  } finally {
    loading = false;
    if (hubRoot) hubRoot.classList.remove('is-loading');
  }
}

export function resetGameHub() {
  summaryByGame = new Map();
  renderHub();
}
