import { renderGameCardPlate } from '../game-card-plate.js';
import { API } from '../api.js';
import {
  $,
  applySavedCardState,
  bindCollapseAllControls,
  bindCollapsibleCards,
  bindEnterSearch,
  captureListContext,
  closeDrawer,
  escapeHtml,
  log,
  normalizeRows,
  openDrawer,
  bindEditorSaveFeedback,
  readForm,
  renderCollapseButton,
  renderListState,
  renderMeta,
  renderMultilineText,
  renderProgressiveList,
  restoreListContext,
  showToast,
  withBusy
} from '../ui.js';
import { applyPendingFilterValue, bindPersistentFilters, persistFilters } from '../ux-state.js';
import { bindClearFilters, bindSelectAutoSearch, matchesStatus } from '../search-filters.js';
import { renderFixedFieldOptions, displayCharacterStatus } from '../fixed-field-options.js';
import {
  STANDARD_RESOURCE_RELATIONS,
  bindStructuredResourceEditor,
  collectStructuredResourceLinks,
  renderResourceList,
  renderStructuredResourceEditor
} from '../structured-links.js';

const MECHANISM_SEARCH_LIMIT = 1000;
const COLLAPSE_KEY = 'mechanisms';
const FILTERS = {
  '#mechanismKeyword': 'mk',
  '#mechanismGame': 'mg',
  '#mechanismType': 'mt',
  '#mechanismResearchStatus': 'mr'
};

const MECHANISM_TYPE_LABELS = Object.freeze({
  action: '动作机制',
  break: '削韧／破韧',
  combat: '战斗机制',
  core_combat: '核心战斗',
  equipment: '装备机制',
  reaction: '反应机制',
  resource: '资源机制',
  switch: '切换／换人',
  system: '系统机制',
  team: '队伍机制'
});
const mechanismTypeLabel = (value) => MECHANISM_TYPE_LABELS[value] || value || '未分类';
const mechanismTypeKey = (value) => Object.entries(MECHANISM_TYPE_LABELS)
  .find(([, label]) => label === value)?.[0] || value;
let catalogRows = [];
let catalogLoaded = false;

function ensureMechanismStyles() {
  if (document.querySelector('link[data-mechanism-styles]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'styles/mechanisms.css';
  link.dataset.mechanismStyles = '';
  document.head.append(link);
}

function ensureMechanismShell() {
  if ($('#mechanisms')) return;

  const versionsTab = $('#tab-versions');
  versionsTab?.insertAdjacentHTML('beforebegin', `
    <button id="tab-mechanisms" type="button" data-tab="mechanisms" role="tab" aria-controls="mechanisms" aria-selected="false">机制</button>
  `);

  const versionsPanel = $('#versions');
  versionsPanel?.insertAdjacentHTML('beforebegin', `
    <section id="mechanisms" class="tab-panel" role="tabpanel" aria-labelledby="tab-mechanisms">
      <div class="toolbar card compact filter-toolbar">
        <div class="filter-grid" aria-label="机制搜索条件">
          <input id="mechanismKeyword" class="filter-keyword" aria-label="机制关键字" placeholder="关键字：机制名 / 说明 / 注意事项 / 资源标题" />
          <select id="mechanismGame" class="filter-select mechanism-game-filter" aria-label="机制游戏">
            <option value="">全部游戏</option>
          </select>
          <select id="mechanismType" class="filter-select" aria-label="机制类型">
            <option value="">全部机制类型</option>
          </select>
          <select id="mechanismResearchStatus" class="filter-select" aria-label="机制研究状态" data-fixed-field="mechanismResearchStatus">
            ${renderFixedFieldOptions('mechanismResearchStatus', '', { emptyLabel: '全部研究状态' })}
          </select>
          <button id="searchMechanismBtn" type="button">搜索机制</button>
          <button id="clearMechanismFilters" type="button" class="secondary filter-clear">清空筛选</button>
          <button id="newMechanismBtn" type="button" class="secondary">新增机制</button>
          <div id="mechanismResultControls" class="result-view-controls" hidden>
            <span>结果视图</span>
            <div class="result-view-buttons" aria-label="机制结果显示方式">
              <button type="button" class="secondary" data-card-action="collapse">全部收起</button>
              <button type="button" class="secondary" data-card-action="expand">全部展开</button>
            </div>
          </div>
        </div>
      </div>
      <div id="mechanismResults" class="list"></div>
      <div id="mechanismEditor" class="card editor hidden"></div>
    </section>
  `);
}

function uniqueOptions(rows, key, labelKey = key) {
  const seen = new Map();
  rows.forEach((row) => {
    const value = String(row[key] || '').trim();
    if (!value || seen.has(value)) return;
    seen.set(value, String(row[labelKey] || value).trim() || value);
  });
  return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1], 'zh-CN'));
}

function replaceSelectOptions(select, options, emptyLabel, formatter = (_value, label) => label) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>${options.map(([value, label]) => (
    `<option value="${escapeHtml(value)}">${escapeHtml(formatter(value, label))}</option>`
  )).join('')}`;
  if ([...select.options].some((option) => option.value === current)) select.value = current;
  applyPendingFilterValue(select);
}

function hydrateCatalogControls() {
  const gameOptions = uniqueOptions(catalogRows, 'game_code', 'game_title');
  replaceSelectOptions(
    $('#mechanismGame'),
    gameOptions,
    '全部游戏',
    (value, label) => `${value} · ${label}`
  );
  replaceSelectOptions(
    $('#mechanismType'),
    uniqueOptions(catalogRows, 'mechanism_type'),
    '全部机制类型',
    (value) => mechanismTypeLabel(value)
  );
}

async function ensureCatalog({ force = false } = {}) {
  if (catalogLoaded && !force) return catalogRows;
  catalogRows = normalizeRows(await API.searchMechanisms({ limit: MECHANISM_SEARCH_LIMIT }));
  catalogLoaded = true;
  hydrateCatalogControls();
  return catalogRows;
}

function renderGameEditorOptions(selected) {
  const options = uniqueOptions(catalogRows, 'game_code', 'game_title');
  if (selected && !options.some(([value]) => value === selected)) {
    options.unshift([selected, selected]);
  }
  return options.map(([value, label]) => (
    `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(`${value} · ${label}`)}</option>`
  )).join('');
}

function renderDatalist(id, values) {
  return `<datalist id="${escapeHtml(id)}">${[...new Set(values.filter(Boolean))].map((value) => (
    `<option value="${escapeHtml(value)}"></option>`
  )).join('')}</datalist>`;
}

function renderMechanismDetails(row) {
  return `
    <section class="mechanism-section">
      <div class="item-content-title">机制说明</div>
      ${renderMultilineText(row.description) || '<div class="hint">暂无说明。</div>'}
    </section>
    ${String(row.note || '').trim() ? `
      <section class="mechanism-section">
        <div class="item-content-title">注意 / 补充</div>
        ${renderMultilineText(row.note)}
      </section>` : ''}
    <section class="mechanism-section">
      <div class="item-content-title">资料链接</div>
      ${renderResourceList(row.links || row.resources)}
    </section>`;
}

function openEditor(data = {}) {
  const editor = $('#mechanismEditor');
  const links = data.links || data.resources || [];
  const mechanismTypes = [...new Set([
    ...Object.values(MECHANISM_TYPE_LABELS),
    ...uniqueOptions(catalogRows, 'mechanism_type').map(([value]) => mechanismTypeLabel(value))
  ])];

  editor.innerHTML = `
    <div class="editor-header">
      <div>
        <p class="kicker">MECHANISM RECORD</p>
        <h2 id="mechanismEditorTitle">${data.id ? '编辑机制' : '新增机制'}</h2>
      </div>
      <button type="button" id="closeMechanismEditor" class="icon-button" aria-label="关闭机制编辑器">×</button>
    </div>
    <form id="mechanismForm" class="editor-form">
      <div class="editor-body form-grid">
        <input type="hidden" name="id" value="${escapeHtml(data.id || '')}" />
        <label>游戏
          <select name="game_code" data-autofocus required>
            <option value="">请选择游戏</option>
            ${renderGameEditorOptions(data.game_code || '')}
          </select>
        </label>
        <label>机制名称
          <input name="title" required value="${escapeHtml(data.title || '')}" placeholder="例如：超击破" />
        </label>
        <label>机制类型
          <input name="mechanism_type" list="mechanismTypeSuggestions" value="${escapeHtml(data.mechanism_type ? mechanismTypeLabel(data.mechanism_type) : '')}" placeholder="选择或填写中文机制分类" />
          ${renderDatalist('mechanismTypeSuggestions', mechanismTypes)}
        </label>
        <label>研究状态
          <select name="research_status" required>${renderFixedFieldOptions('mechanismResearchStatus', data.research_status || (data.id ? '' : '✕'))}</select>
        </label>
        <label>已核验日期
          <input name="verified_at" type="date" value="${escapeHtml(data.verified_at || '')}" />
        </label>
        <label class="wide">机制说明
          <textarea name="description" class="mechanism-textarea" placeholder="填写机制核心解释……">${escapeHtml(data.description || '')}</textarea>
        </label>
        <label class="wide">注意 / 补充
          <textarea name="note" class="mechanism-textarea" placeholder="填写边界条件、注意事项或补充……">${escapeHtml(data.note || '')}</textarea>
        </label>
        ${renderStructuredResourceEditor({
          links,
          prefix: 'mechanism',
          title: '机制资料链接',
          help: '统一写入 Resources / Resource Relations；关系类型可自由扩展，不需要手写 JSON。',
          defaultRelationType: 'official_reference',
          relationSuggestions: STANDARD_RESOURCE_RELATIONS
        })}
        <pre id="mechanismSaveLog" class="log wide" aria-live="polite"></pre>
      </div>
      <div class="button-row editor-footer">
        <button type="submit">保存机制</button>
        <button type="button" id="cancelMechanismEdit" class="ghost">取消</button>
      </div>
    </form>
  `;

  editor.setAttribute('role', 'dialog');
  editor.setAttribute('aria-modal', 'true');
  editor.setAttribute('aria-labelledby', 'mechanismEditorTitle');

  $('#closeMechanismEditor').addEventListener('click', () => closeDrawer(editor));
  $('#cancelMechanismEdit').addEventListener('click', () => closeDrawer(editor));
  bindStructuredResourceEditor($('#mechanismForm'));
  const showSaveFeedback = bindEditorSaveFeedback($('#mechanismForm'));
  openDrawer(editor);

  $('#mechanismForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('[type="submit"]');
    showSaveFeedback('正在保存机制…', 'progress');

    await withBusy(submitButton, '保存中...', async () => {
      try {
        const listContext = captureListContext($('#mechanismResults'));
        const form = readForm(event.currentTarget);
        const result = await API.saveMechanism({
          id: form.id || null,
          game_code: form.game_code,
          title: form.title,
          mechanism_type: mechanismTypeKey(form.mechanism_type),
          description: form.description,
          note: form.note,
          research_status: form.research_status,
          verified_at: form.verified_at,
          links: collectStructuredResourceLinks(event.currentTarget)
        });

        await ensureCatalog({ force: true });
        await searchMechanisms({ visibleCount: listContext.visibleCount, revealId: result.id });
        closeDrawer(editor, { restoreFocus: false });
        restoreListContext($('#mechanismResults'), listContext, { focusId: result.id, highlight: true });
        showToast(data.id ? '机制已保存，资源关系已同步。' : '机制已新增并定位。');
      } catch (error) {
        const message = error?.message || String(error);
        log($('#mechanismSaveLog'), message);
        showSaveFeedback(`保存失败：${message}`, 'error');
      }
    });
  });
}

export async function searchMechanisms({ visibleCount = 0, revealId = '' } = {}) {
  const container = $('#mechanismResults');
  const controls = $('#mechanismResultControls');
  controls.hidden = true;
  renderListState(container, '查询中...');

  try {
    await ensureCatalog();
    persistFilters('mechanisms', FILTERS);
    const rows = await API.searchMechanisms({
      keyword: $('#mechanismKeyword').value.trim(),
      game_code: $('#mechanismGame').value,
      mechanism_type: $('#mechanismType').value,
      limit: MECHANISM_SEARCH_LIMIT
    });
    const list = normalizeRows(rows).filter((row) => matchesStatus(row.research_status, $('#mechanismResearchStatus').value));

    if (!list.length) {
      renderListState(container, '没有结果。');
      return;
    }

    renderProgressiveList(container, list, (row) => `
      <article class="item mechanism-card" data-item-id="${escapeHtml(row.id)}" data-game-code="${escapeHtml(row.game_code || '')}" data-card-kind="mechanism" tabindex="-1">
        ${renderGameCardPlate(row.game_code || row.game_title, 'mechanism')}
        <div class="item-head">
          <div class="item-summary">
            <div class="item-title">${escapeHtml(row.title)}</div>
            ${renderMeta([
              row.game_code || row.game_title,
              mechanismTypeLabel(row.mechanism_type),
              { value: '研究 ' + displayCharacterStatus(row.research_status), tone: 'progress' },
              row.verified_at ? `已核验 ${row.verified_at}` : '未标核验日期'
            ])}
          </div>
          <div class="actions collapsible-actions">
            ${renderCollapseButton(row.title)}
            <button type="button" data-detail-mechanism="${escapeHtml(row.id)}" class="secondary">详情/编辑</button>
            <button type="button" data-delete-mechanism="${escapeHtml(row.id)}" class="danger">删除</button>
          </div>
        </div>
        <div class="item-content" data-card-content>
          ${renderMechanismDetails(row)}
        </div>
      </article>`, {
      visibleCount,
      revealId,
      itemLabel: '条机制',
      afterRender: () => applySavedCardState(container, COLLAPSE_KEY)
    });
    controls.hidden = false;
  } catch (error) {
    renderListState(container, error.message, 'error');
  }
}

export function initMechanisms() {
  ensureMechanismStyles();
  ensureMechanismShell();

  const searchButton = $('#searchMechanismBtn');
  const runSearch = () => {
    if (searchButton.disabled) return;
    return withBusy(searchButton, '搜索中...', searchMechanisms);
  };

  bindPersistentFilters('mechanisms', FILTERS);
  bindSelectAutoSearch(
    ['#mechanismGame', '#mechanismType', '#mechanismResearchStatus'],
    runSearch
  );
  bindClearFilters('#clearMechanismFilters', Object.keys(FILTERS), runSearch);
  bindCollapsibleCards($('#mechanismResults'), COLLAPSE_KEY);
  bindCollapseAllControls($('#mechanismResultControls'), $('#mechanismResults'), COLLAPSE_KEY);
  searchButton.addEventListener('click', runSearch);
  bindEnterSearch(searchButton.closest('.toolbar'), searchButton, '搜索中...', searchMechanisms);

  $('#newMechanismBtn').addEventListener('click', async () => {
    try {
      await ensureCatalog();
      openEditor({ links: [] });
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  $('#mechanismResults').addEventListener('click', async (event) => {
    const detailButton = event.target.closest('[data-detail-mechanism]');
    const deleteButton = event.target.closest('[data-delete-mechanism]');

    if (detailButton) {
      await withBusy(detailButton, '加载中...', async () => {
        try {
          await ensureCatalog();
          const detail = await API.getMechanismDetail({ id: detailButton.dataset.detailMechanism });
          if (!detail?.id) throw new Error('机制详情不存在或已被删除。');
          openEditor(detail);
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    }

    if (deleteButton) {
      const card = deleteButton.closest('.item');
      const title = card?.querySelector('.item-title')?.textContent?.trim() || '这条机制';
      if (!window.confirm(`确定删除机制「${title}」？机制的 Resource Relation 会删除，但仍被其他实体引用的共享 Resource 会保留。`)) return;

      await withBusy(deleteButton, '删除中...', async () => {
        try {
          const neighborId = card?.nextElementSibling?.dataset.itemId || card?.previousElementSibling?.dataset.itemId || '';
          const listContext = captureListContext($('#mechanismResults'), neighborId);
          await API.deleteMechanism({ id: deleteButton.dataset.deleteMechanism });
          await ensureCatalog({ force: true });
          await searchMechanisms({ visibleCount: listContext.visibleCount, revealId: neighborId });
          restoreListContext($('#mechanismResults'), listContext, { focusId: neighborId });
          showToast('机制已删除；共享 Resource 未被误删。');
        } catch (error) {
          renderListState($('#mechanismResults'), error.message, 'error');
        }
      });
    }
  });
}
