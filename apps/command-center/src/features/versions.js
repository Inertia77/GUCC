import { API } from '../api.js';
import {
  $,
  applySavedCardState,
  bindCollapseAllControls,
  bindCollapsibleCards,
  bindEnterSearch,
  captureListContext,
  escapeHtml,
  log,
  normalizeRows,
  closeDrawer,
  openDrawer,
  readForm,
  renderListState,
  renderMeta,
  renderCollapseButton,
  renderProgressiveList,
  restoreListContext,
  showToast,
  withBusy
} from '../ui.js';
import { bindPersistentFilters, persistFilters } from '../ux-state.js';
import { assertNewVersionUnique } from '../record-guards.mjs';
import {
  bindClearFilters,
  bindGameFilter,
  bindSelectAutoSearch,
  readGameFilter
} from '../search-filters.js';

let versionRows = new Map();
const FILTERS = {
  '#versionKeyword': 'vq',
  '#versionGame': 'vg',
  '#versionGameCustom': 'vgx'
};
const COLLAPSE_KEY = 'versions';

function normalizeToken(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function phaseKey(value) {
  const token = normalizeToken(value);
  if (!token) return 'other';
  if (token.includes('first') || token.includes('phase_1') || token.includes('上半')) return 'first_half';
  if (token.includes('second') || token.includes('phase_2') || token.includes('下半')) return 'second_half';
  if (token.includes('standard') || token.includes('permanent') || token.includes('常驻') || token.includes('非限定')) return 'standard';
  return 'other';
}

function phaseLabel(key, raw) {
  return {
    first_half: '上半',
    second_half: '下半',
    standard: '常驻 / 其他池',
    other: raw || '未分组'
  }[key] || raw || '未分组';
}

function bannerTypeLabel(value) {
  const token = normalizeToken(value);
  if (token.includes('rerun') || token.includes('复刻')) return '复刻';
  if (token.includes('standard_addition') || token.includes('常驻追加')) return '常驻追加';
  if (token.includes('standard') || token.includes('permanent') || token.includes('常驻')) return '常驻';
  if (token.includes('new_limited')) return '新限定';
  if (token.includes('pickup') || token.includes('up')) return '新出 / UP';
  if (token.includes('collab') || token.includes('联动')) return '联动';
  return value || '未标注';
}

function bannerTypeClass(value) {
  const token = normalizeToken(value);
  if (token.includes('rerun') || token.includes('复刻')) return 'rerun';
  if (token.includes('standard') || token.includes('permanent') || token.includes('常驻')) return 'standard';
  if (token.includes('new') || token.includes('pickup') || token.includes('up') || token.includes('限定')) return 'new';
  return 'other';
}

function formatWindow(start, end) {
  const from = String(start || '').trim();
  const to = String(end || '').trim();
  if (!from && !to) return '';
  if (from && to) return `${from} → ${to}`;
  return from ? `开始 ${from}` : `结束 ${to}`;
}

function renderVersionNote(note) {
  if (!note) return '';
  return `
    <div class="version-note">
      <span>备注</span>
      <p>${escapeHtml(note)}</p>
    </div>`;
}

function renderBannerChip(banner) {
  const character = banner.character_name || banner.character_name_raw || banner.name || '未命名角色';
  const windowText = formatWindow(banner.start_at, banner.end_at);
  const window = windowText ? `<small>时间：${escapeHtml(windowText)}</small>` : '';
  const note = banner.note ? `<small>${escapeHtml(banner.note)}</small>` : '';
  return `
    <div class="banner-chip ${bannerTypeClass(banner.banner_type)}">
      <span class="banner-character">${escapeHtml(character)}</span>
      <span class="banner-type">${escapeHtml(bannerTypeLabel(banner.banner_type))}</span>
      ${window}
      ${note}
    </div>`;
}

function renderBannerGroups(banners = []) {
  if (!Array.isArray(banners) || !banners.length) {
    return '<div class="banner-empty">暂无卡池记录</div>';
  }

  const grouped = banners.reduce((acc, banner) => {
    const key = phaseKey(banner.phase);
    acc[key] = acc[key] || [];
    acc[key].push(banner);
    return acc;
  }, {});

  const order = ['first_half', 'second_half', 'standard', 'other'];
  return `
    <div class="version-banners">
      ${order.filter((key) => grouped[key]?.length).map((key) => `
        <section class="banner-phase ${key}">
          <div class="phase-head">
            <span>${escapeHtml(phaseLabel(key, grouped[key][0]?.phase))}</span>
            <small>${grouped[key].length} entries</small>
          </div>
          <div class="banner-list">${grouped[key].map(renderBannerChip).join('')}</div>
        </section>
      `).join('')}
    </div>`;
}

const PHASE_OPTIONS = [
  ['first_half', '上半'],
  ['second_half', '下半'],
  ['standard', '常驻 / 其他池'],
  ['other', '其他']
];

const BANNER_TYPE_OPTIONS = [
  ['new_limited', '新限定'],
  ['pickup', '新出 / UP'],
  ['rerun', '复刻'],
  ['standard_addition', '常驻追加'],
  ['standard', '常驻'],
  ['collab', '联动'],
  ['other', '其他']
];

function optionList(options, value) {
  const current = String(value || '');
  const hasCurrent = options.some(([optionValue]) => optionValue === current);
  const normalizedOptions = current && !hasCurrent ? [[current, current], ...options] : options;
  return normalizedOptions.map(([optionValue, label]) => (
    `<option value="${escapeHtml(optionValue)}"${optionValue === current ? ' selected' : ''}>${escapeHtml(label)}</option>`
  )).join('');
}

function normalizeBanners(banners) {
  return Array.isArray(banners) && banners.length
    ? banners
    : [{ phase: 'first_half', banner_type: 'new_limited', character_name: '', start_at: '', end_at: '', note: '' }];
}

function renderBannerRow(banner = {}) {
  const character = banner.character_name || banner.character_name_raw || banner.name || '';
  return `
    <div class="structured-row banner-edit-row" data-banner-row>
      <label>阶段 <select data-banner-field="phase">${optionList(PHASE_OPTIONS, banner.phase || 'first_half')}</select></label>
      <label>类型 <select data-banner-field="banner_type">${optionList(BANNER_TYPE_OPTIONS, banner.banner_type || 'new_limited')}</select></label>
      <label>角色/对象 <input data-banner-field="character_name" value="${escapeHtml(character)}" placeholder="角色名 / 武器 / 卡池对象" /></label>
      <label>开始时间 <input data-banner-field="start_at" value="${escapeHtml(banner.start_at || '')}" placeholder="2026-08-28T19:30:00+08:00" /></label>
      <label>结束时间 <input data-banner-field="end_at" value="${escapeHtml(banner.end_at || '')}" placeholder="2026-09-10T11:59:00+08:00" /></label>
      <label class="row-wide">备注 <input data-banner-field="note" value="${escapeHtml(banner.note || '')}" placeholder="免费送 / 伴生皮肤 / 限定规则等" /></label>
      <button type="button" class="ghost remove-row" data-remove-banner>删除</button>
    </div>`;
}

function renderBannerEditor(banners) {
  return `
    <section class="structured-editor wide" aria-label="版本卡池">
      <div class="structured-head">
        <div>
          <strong>卡池信息</strong>
          <span>时间请使用带时区的 ISO 8601，未知时留空；不要从版本周期猜结束时间。</span>
        </div>
        <button type="button" id="addVersionBanner" class="secondary add-row">添加卡池</button>
      </div>
      <div id="versionBannerRows" class="structured-list">
        ${normalizeBanners(banners).map(renderBannerRow).join('')}
      </div>
    </section>`;
}

function emptyBannerRow(row) {
  row.querySelectorAll('[data-banner-field]').forEach((input) => {
    input.value = input.dataset.bannerField === 'phase' ? 'first_half' : input.dataset.bannerField === 'banner_type' ? 'new_limited' : '';
  });
}

function bindBannerEditor(form) {
  const list = form.querySelector('#versionBannerRows');
  form.querySelector('#addVersionBanner').addEventListener('click', () => {
    list.insertAdjacentHTML('beforeend', renderBannerRow());
  });
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-banner]');
    if (!button) return;
    const row = button.closest('[data-banner-row]');
    if (list.querySelectorAll('[data-banner-row]').length <= 1) emptyBannerRow(row);
    else row.remove();
  });
}

function collectBanners(form) {
  return [...form.querySelectorAll('[data-banner-row]')].map((row) => {
    const value = (field) => row.querySelector(`[data-banner-field="${field}"]`)?.value.trim() || '';
    const banner = {
      phase: value('phase'),
      banner_type: value('banner_type'),
      character_name: value('character_name'),
      start_at: value('start_at'),
      end_at: value('end_at'),
      note: value('note')
    };
    return banner.character_name || banner.note ? banner : null;
  }).filter(Boolean);
}

function openEditor(data = {}) {
  const editor = $('#versionEditor');
  editor.innerHTML = `
    <div class="editor-header">
      <div>
        <p class="kicker">VERSION RECORD</p>
        <h2 id="versionEditorTitle">${data.id ? '编辑版本' : '新增版本'}</h2>
      </div>
      <button type="button" id="closeVersionEditor" class="icon-button" aria-label="关闭版本编辑器">×</button>
    </div>
    <form id="versionForm" class="editor-form">
      <div class="editor-body form-grid">
        <input type="hidden" name="id" value="${escapeHtml(data.id || '')}" />
        <label>游戏 code <input name="game_code" data-autofocus required value="${escapeHtml(data.game_code || '')}" /></label>
        <label>版本号 <input name="version_no" required value="${escapeHtml(data.version_no || '')}" /></label>
        <label>版本名 <input name="version_name" value="${escapeHtml(data.version_name || '')}" /></label>
        <label>开始日期 <input name="start_date" type="date" value="${escapeHtml(data.start_date || '')}" /></label>
        <label>结束日期 <input name="end_date" type="date" value="${escapeHtml(data.end_date || '')}" /></label>
        <label class="wide">卡池 JSON（必须是数组，可留空）
          <textarea name="banners" placeholder='[{"phase":"first_half","banner_type":"new_limited","character_name":"角色名"}]'>${escapeHtml(JSON.stringify(data.banners || [], null, 2))}</textarea>
        </label>
        <label class="wide">备注 <textarea name="note">${escapeHtml(data.note || '')}</textarea></label>
        <pre id="versionSaveLog" class="log wide" aria-live="polite"></pre>
      </div>
      <div class="button-row editor-footer">
        <button type="submit">保存版本</button>
        <button type="button" id="cancelVersionEdit" class="ghost">取消</button>
      </div>
    </form>
  `;

  const legacyBannersLabel = editor.querySelector('textarea[name="banners"]')?.closest('label');
  if (legacyBannersLabel) {
    legacyBannersLabel.insertAdjacentHTML('afterend', renderBannerEditor(data.banners || []));
    legacyBannersLabel.remove();
  }

  editor.setAttribute('role', 'dialog');
  editor.setAttribute('aria-modal', 'true');
  editor.setAttribute('aria-labelledby', 'versionEditorTitle');
  $('#closeVersionEditor').addEventListener('click', () => closeDrawer(editor));
  $('#cancelVersionEdit').addEventListener('click', () => closeDrawer(editor));
  bindBannerEditor($('#versionForm'));
  openDrawer(editor);
  $('#versionForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('[type="submit"]');

    await withBusy(submitButton, '保存中...', async () => {
      try {
        const listContext = captureListContext($('#versionResults'));
        const form = readForm(event.currentTarget);
        const payload = {
          id: form.id || null,
          game_code: form.game_code,
          version_no: form.version_no,
          version_name: form.version_name,
          start_date: form.start_date,
          end_date: form.end_date,
          note: form.note,
          banners: collectBanners(event.currentTarget)
        };

        if (!payload.id) {
          const existing = await API.searchVersions({
            keyword: payload.version_no,
            game_code: payload.game_code,
            limit: 200
          });
          assertNewVersionUnique(normalizeRows(existing), payload);
        }

        const result = await API.saveVersion(payload);
        await searchVersions({ visibleCount: listContext.visibleCount, revealId: result.id });
        closeDrawer(editor, { restoreFocus: false });
        restoreListContext($('#versionResults'), listContext, { focusId: result.id, highlight: true });
        showToast(data.id ? '版本已保存，已回到原列表位置。' : '版本已新增并定位。');
      } catch (error) {
        log($('#versionSaveLog'), error.message);
      }
    });
  });
}

export async function searchVersions({ visibleCount = 0, revealId = '' } = {}) {
  const container = $('#versionResults');
  const controls = $('#versionResultControls');
  persistFilters('versions', FILTERS);
  controls.hidden = true;
  renderListState(container, '查询中...');

  try {
    const rows = await API.searchVersions({
      keyword: $('#versionKeyword').value.trim(),
      game_code: readGameFilter('#versionGame', '#versionGameCustom'),
      limit: 200
    });
    const list = normalizeRows(rows);
    versionRows = new Map(list.map((row) => [String(row.id), row]));
    if (!list.length) {
      renderListState(container, '没有结果。');
      return;
    }

    renderProgressiveList(container, list, (row) => `
      <article class="item version-card" data-item-id="${escapeHtml(row.id)}" data-game-code="${escapeHtml(row.game_code || '')}" tabindex="-1">
        <div class="item-head version-head">
          <div class="item-summary">
            <div class="item-title version-title">
              <span class="version-no">${escapeHtml(row.version_no || '')}</span>
              <span>${escapeHtml(row.version_name || '未命名版本')}</span>
            </div>
            ${renderMeta([row.game_code, formatWindow(row.start_date, row.end_date)])}
          </div>
          <div class="actions collapsible-actions">
            ${renderCollapseButton(`${row.version_no || ''} ${row.version_name || ''}`.trim() || '版本详情')}
            <button type="button" data-edit-version="${escapeHtml(row.id)}" class="secondary">编辑</button>
            <button type="button" data-delete-version="${escapeHtml(row.id)}" class="danger">删除</button>
          </div>
        </div>
        <div class="item-content" data-card-content>
          <div class="item-content-title">版本详情</div>
          ${renderVersionNote(row.note)}
          ${renderBannerGroups(row.banners || [])}
        </div>
      </article>`, {
      visibleCount,
      revealId,
      itemLabel: '个版本',
      afterRender: () => applySavedCardState(container, COLLAPSE_KEY)
    });
    controls.hidden = false;
  } catch (error) {
    renderListState(container, error.message, 'error');
  }
}

export function initVersions() {
  const searchButton = $('#searchVersionBtn');
  const runSearch = () => {
    if (searchButton.disabled) return;
    return withBusy(searchButton, '搜索中...', searchVersions);
  };
  bindPersistentFilters('versions', FILTERS);
  bindGameFilter('#versionGame', '#versionGameCustom');
  bindSelectAutoSearch(['#versionGame'], runSearch);
  bindClearFilters('#clearVersionFilters', Object.keys(FILTERS), runSearch);
  bindCollapsibleCards($('#versionResults'), COLLAPSE_KEY);
  bindCollapseAllControls($('#versionResultControls'), $('#versionResults'), COLLAPSE_KEY);
  searchButton.addEventListener('click', runSearch);
  bindEnterSearch(searchButton.closest('.toolbar'), searchButton, '搜索中...', searchVersions);
  $('#newVersionBtn').addEventListener('click', () => openEditor({ banners: [] }));
  $('#versionResults').addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-version]');
    const deleteButton = event.target.closest('[data-delete-version]');

    if (editButton) openEditor(versionRows.get(editButton.dataset.editVersion) || {});

    if (deleteButton && window.confirm('确定删除这个版本？')) {
      await withBusy(deleteButton, '删除中...', async () => {
        try {
          const card = deleteButton.closest('.item');
          const neighborId = card?.nextElementSibling?.dataset.itemId || card?.previousElementSibling?.dataset.itemId || '';
          const listContext = captureListContext($('#versionResults'), neighborId);
          await API.deleteVersion({ id: deleteButton.dataset.deleteVersion });
          await searchVersions({ visibleCount: listContext.visibleCount, revealId: neighborId });
          restoreListContext($('#versionResults'), listContext, { focusId: neighborId });
          showToast('版本已删除，列表位置已保留。');
        } catch (error) {
          renderListState($('#versionResults'), error.message, 'error');
        }
      });
    }
  });
}
