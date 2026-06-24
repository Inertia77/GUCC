import { API } from '../api.js';
import {
  $,
  escapeHtml,
  log,
  normalizeRows,
  parseJsonArray,
  readForm,
  renderListState,
  renderMeta,
  setHidden,
  withBusy
} from '../ui.js';

let versionRows = new Map();

function openEditor(data = {}) {
  const editor = $('#versionEditor');
  editor.innerHTML = `
    <h2>${data.id ? '编辑版本' : '新增版本'}</h2>
    <form id="versionForm" class="form-grid">
      <input type="hidden" name="id" value="${escapeHtml(data.id || '')}" />
      <label>游戏 code <input name="game_code" required value="${escapeHtml(data.game_code || '')}" /></label>
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
    </form>
    <pre id="versionSaveLog" class="log" aria-live="polite"></pre>`;

  setHidden(editor, false);
  $('#cancelVersionEdit').addEventListener('click', () => setHidden(editor, true));
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
          banners: parseJsonArray(form.banners)
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
      <article class="item">
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHtml(row.version_no || '')} ${escapeHtml(row.version_name || '')}</div>
            ${renderMeta([row.game_code, row.start_date])}
          </div>
          <div class="actions">
            <button type="button" data-edit-version="${escapeHtml(row.id)}" class="secondary">编辑</button>
            <button type="button" data-delete-version="${escapeHtml(row.id)}" class="danger">删除</button>
          </div>
        </div>
        <div class="hint">${escapeHtml(row.note || '')}</div>
        <div>${escapeHtml((row.banners || []).map((banner) => `${banner.phase}:${banner.banner_type}:${banner.character_name || banner.character_name_raw}`).join(' / '))}</div>
      </article>`).join('');
  } catch (error) {
    renderListState(container, error.message, 'error');
  }
}

export function initVersions() {
  $('#searchVersionBtn').addEventListener('click', () => withBusy($('#searchVersionBtn'), '搜索中...', searchVersions));
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
