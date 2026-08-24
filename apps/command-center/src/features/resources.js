import { API } from '../api.js';
import {
  $,
  bindEnterSearch,
  escapeHtml,
  normalizeRows,
  renderLinks,
  renderListState,
  renderMeta,
  renderProgressiveList,
  withBusy
} from '../ui.js';
import { bindPersistentFilters, persistFilters } from '../ux-state.js';

const FILTERS = { '#resourceKeyword': 'rq' };

export async function searchResources() {
  const container = $('#resourceResults');
  persistFilters('resources', FILTERS);
  renderListState(container, '查询中...');

  try {
    const rows = await API.searchResources({
      keyword: $('#resourceKeyword').value.trim(),
      limit: 300
    });
    const list = normalizeRows(rows);
    if (!list.length) {
      renderListState(container, '没有结果。');
      return;
    }

    renderProgressiveList(container, list, (row) => `
      <article class="item" data-item-id="${escapeHtml(row.id || row.url)}" tabindex="-1">
        <div class="item-title">${escapeHtml(row.title || row.url)}</div>
        ${renderLinks([row])}
        ${renderMeta([row.resource_type, row.source, row.relation_type])}
        <div class="hint">${escapeHtml(row.note || '')}</div>
      </article>`, { pageSize: 30, itemLabel: '条资源' });
  } catch (error) {
    renderListState(container, error.message, 'error');
  }
}

export function initResources() {
  const searchButton = $('#searchResourceBtn');
  bindPersistentFilters('resources', FILTERS);
  searchButton.addEventListener('click', () => withBusy(searchButton, '搜索中...', searchResources));
  bindEnterSearch(searchButton.closest('.toolbar'), searchButton, '搜索中...', searchResources);
}