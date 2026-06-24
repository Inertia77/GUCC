import { API } from '../api.js';
import {
  $,
  escapeHtml,
  normalizeRows,
  renderLinks,
  renderListState,
  renderMeta,
  withBusy
} from '../ui.js';

export async function searchResources() {
  const container = $('#resourceResults');
  renderListState(container, '查询中...');

  try {
    const rows = await API.searchResources({
      keyword: $('#resourceKeyword').value.trim(),
      limit: 100
    });
    const list = normalizeRows(rows);
    if (!list.length) {
      renderListState(container, '没有结果。');
      return;
    }

    container.innerHTML = list.map((row) => `
      <article class="item">
        <div class="item-title">${escapeHtml(row.title || row.url)}</div>
        ${renderLinks([row])}
        ${renderMeta([row.resource_type, row.source, row.relation_type])}
        <div class="hint">${escapeHtml(row.note || '')}</div>
      </article>`).join('');
  } catch (error) {
    renderListState(container, error.message, 'error');
  }
}

export function initResources() {
  $('#searchResourceBtn').addEventListener('click', () => withBusy($('#searchResourceBtn'), '搜索中...', searchResources));
}
