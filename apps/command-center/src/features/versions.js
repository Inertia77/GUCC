import { API } from '../api.js';
import {
  $,
  bindEnterSearch,
  escapeHtml,
  log,
  normalizeRows,
  closeDrawer,
  openDrawer,
  readForm,
  renderListState,
  renderMeta,
  withBusy
} from '../ui.js';

let versionRows = new Map();

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
  const note = banner.note ? `<small>${escapeHtml(banner.note)}</small>` : '';
  return `
    <div class="banner-chip ${bannerTypeClass(banner.banner_type)}">
      <span class="banner-character">${escapeHtml(character)}</span>
      <span class="banner-type">${escapeHtml(bannerTypeLabel(banner.banner_type))}</span>
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
    : [{ phase: 'first_half', banner_type: 'new_limited', character_name: '', note: '' }];
}

function renderBannerRow(banner = {}) {
  const character = banner.character_name || banner.character_name_raw || banner.name || '';
  return `
    <div class="structured-row banner-edit-row" data-banner-row>
      <label>阶段 <select data-banner-field="phase">${optionList(PHASE_OPTIONS, banner.phase || 'first_half')}</select></label>
      <label>类型 <select data-banner-field="banner_type">${optionList(BANNER_TYPE_OPTIONS, banner.banner_type || 'new_limited')}</select></label>
      <label>角色/对象 <input data-banner-field="character_name" value="${escapeHtml(character)}" placeholder="角色名 / 武器 / 卡池对象" /></label>
      <label class="row-wide">备注 <input data-banner-field="note" value="${escapeHtml(banner.note || '')}" placeholder="免费送 / 伴生皮肤 / 结束日期等" /></label>
      <button type="button" class="ghost remove-row" data-remove-banner>删除</button>
    </div>`;
}

function renderBannerEditor(banners) {
  return `
    <section class="structured-editor wide" aria-label="版本卡池">
      <div class="structured-head">
        <div>
          <strong>卡池信息</strong>
          <span>按上半/下半、类型和角色填写，保存时自动转换成 banners JSON 数组。</span>
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
    <form id="versionForm" class="editor-body form-grid">
      <input type="hidden" name="id" value="${escapeHtml(data.id || '')}" />
      <label>游戏 code <input name="game_code" data-autofocus required value="${escapeHtml(data.game_code || '')}" /></label>
      <label>版本号 <input name="version_no" required value="${escapeHtml(data.version_no || '')}" /></label>
      <label>版本名 <input name="version_name" value="${escapeHtml(data.version_name || '')}" /></label>
      <label>开始日期 <input name="start_date" type="date" value="${escapeHtml(data.start_date || '')}" /></label>
      <label class="wide">卡池 JSON（必须是数组，可留空）
        <textarea name="banners" placeholder='[{"phase":"first_half","banner_type":"new_limited","character_name":"角色名"}]'>${escapeHtml(JSON.stringify(data.banners || [], null, 2))}</textarea>
      </label>
      <label class="wide">备注 <textarea name="note">${escapeHtml(data.note || '')}</textarea></label>
      <div class="button-row wide">
        <button type="submit">保存版本</button>
        <button type="button" id="cancelVersionEdit" class="ghost">取消</button>
      </div>
      <pre id="versionSaveLog" class="log wide" aria-live="polite"></pre>
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
        const form = readForm(event.currentTarget);
        const result = await API.saveVersion({
          id: form.id || null,
          game_code: form.game_code,
          version_no: form.version_no,
          version_name: form.version_name,
          start_date: form.start_date,
          note: form.note,
          banners: collectBanners(event.currentTarget)
        });
        log($('#versionSaveLog'), result);
        await searchVersions();
      } catch (error) {
        log($('#versionSaveLog'), error.message);
      }
    });
  });
}

export async function searchVersions() {
  const container = $('#versionResults');
  renderListState(container, '查询中...');

  try {
    const rows = await API.searchVersions({
      keyword: $('#versionKeyword').value.trim(),
      game_code: $('#versionGame').value.trim(),
      limit: 80
    });
    const list = normalizeRows(rows);
    versionRows = new Map(list.map((row) => [String(row.id), row]));
    if (!list.length) {
      renderListState(container, '没有结果。');
      return;
    }

    container.innerHTML = list.map((row) => `
      <article class="item version-card">
        <div class="item-head version-head">
          <div>
            <div class="item-title version-title">
              <span class="version-no">${escapeHtml(row.version_no || '')}</span>
              <span>${escapeHtml(row.version_name || '未命名版本')}</span>
            </div>
            ${renderMeta([row.game_code, row.start_date])}
          </div>
          <div class="actions">
            <button type="button" data-edit-version="${escapeHtml(row.id)}" class="secondary">编辑</button>
            <button type="button" data-delete-version="${escapeHtml(row.id)}" class="danger">删除</button>
          </div>
        </div>
        ${renderVersionNote(row.note)}
        ${renderBannerGroups(row.banners || [])}
      </article>`).join('');
  } catch (error) {
    renderListState(container, error.message, 'error');
  }
}

export function initVersions() {
  const searchButton = $('#searchVersionBtn');
  searchButton.addEventListener('click', () => withBusy(searchButton, '搜索中...', searchVersions));
  bindEnterSearch(searchButton.closest('.toolbar'), searchButton, '搜索中...', searchVersions);
  $('#newVersionBtn').addEventListener('click', () => openEditor({ banners: [] }));
  $('#versionResults').addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-version]');
    const deleteButton = event.target.closest('[data-delete-version]');

    if (editButton) openEditor(versionRows.get(editButton.dataset.editVersion) || {});

    if (deleteButton && window.confirm('确定删除这个版本？')) {
      await withBusy(deleteButton, '删除中...', async () => {
        try {
          await API.deleteVersion({ id: deleteButton.dataset.deleteVersion });
          await searchVersions();
        } catch (error) {
          renderListState($('#versionResults'), error.message, 'error');
        }
      });
    }
  });
}
