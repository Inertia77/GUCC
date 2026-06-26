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

let partyRows = new Map();

function includesKeyword(value, keyword) {
  return String(value || '').toLowerCase().includes(keyword);
}

function partyMatchesKeyword(row, keyword) {
  if (!keyword) return true;
  return [
    row.summary,
    row.description,
    row.party_type,
    row.status,
    row.hold_status,
    row.game_code,
    ...(row.members || []).map((member) => member.name || member.member_name_raw)
  ].some((value) => includesKeyword(value, keyword));
}

function openEditor(data = {}) {
  const members = data.members || [];
  const editor = $('#partyEditor');
  editor.innerHTML = `
    <div class="editor-header">
      <div>
        <p class="kicker">PARTY RECORD</p>
        <h2 id="partyEditorTitle">${data.id ? '编辑配队' : '新增配队'}</h2>
      </div>
      <button type="button" id="closePartyEditor" class="icon-button" aria-label="关闭配队编辑器">×</button>
    </div>
    <form id="partyForm" class="editor-body form-grid">
      <input type="hidden" name="id" value="${escapeHtml(data.id || '')}" />
      <label>游戏 code <input name="game_code" data-autofocus required value="${escapeHtml(data.game_code || '')}" /></label>
      <label class="wide">简要描述 <input name="summary" required value="${escapeHtml(data.summary || '')}" /></label>
      <label>类型 <input name="party_type" value="${escapeHtml(data.party_type || '')}" /></label>
      <label>状态 <input name="status" value="${escapeHtml(data.status || '')}" /></label>
      <label>持有状态 <input name="hold_status" value="${escapeHtml(data.hold_status || '')}" /></label>
      ${[0, 1, 2, 3].map((index) => `<label>成员 ${index + 1} <input name="m${index + 1}" value="${escapeHtml(members[index]?.name || members[index]?.member_name_raw || '')}" /></label>`).join('')}
      <label class="wide">说明 <textarea name="description">${escapeHtml(data.description || '')}</textarea></label>
      <div class="button-row wide">
        <button type="submit">保存配队</button>
        <button type="button" id="cancelPartyEdit" class="ghost">取消</button>
      </div>
      <pre id="partySaveLog" class="log wide" aria-live="polite"></pre>
    </form>
  `;

  editor.setAttribute('role', 'dialog');
  editor.setAttribute('aria-modal', 'true');
  editor.setAttribute('aria-labelledby', 'partyEditorTitle');
  $('#closePartyEditor').addEventListener('click', () => closeDrawer(editor));
  $('#cancelPartyEdit').addEventListener('click', () => closeDrawer(editor));
  openDrawer(editor);
  $('#partyForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('[type="submit"]');

    await withBusy(submitButton, '保存中...', async () => {
      try {
        const form = readForm(event.currentTarget);
        const membersPayload = [form.m1, form.m2, form.m3, form.m4]
          .filter(Boolean)
          .map((name, index) => ({ slot_no: index + 1, name }));
        const result = await API.saveParty({
          id: form.id || null,
          game_code: form.game_code,
          summary: form.summary,
          party_type: form.party_type,
          status: form.status,
          hold_status: form.hold_status,
          description: form.description,
          members: membersPayload
        });
        log($('#partySaveLog'), result);
        await searchParties();
      } catch (error) {
        log($('#partySaveLog'), error.message);
      }
    });
  });
}

export async function searchParties() {
  const container = $('#partyResults');
  renderListState(container, '查询中...');

  try {
    const keyword = $('#partyKeyword').value.trim();
    const gameCode = $('#partyGame').value.trim();
    const rows = await API.searchParties({
      keyword,
      game_code: gameCode,
      limit: 80
    });
    let list = normalizeRows(rows);
    if (keyword && !list.length) {
      const fallbackRows = await API.searchParties({
        keyword: '',
        game_code: gameCode,
        limit: 200
      });
      const normalizedKeyword = keyword.toLowerCase();
      list = normalizeRows(fallbackRows).filter((row) => partyMatchesKeyword(row, normalizedKeyword));
    }
    partyRows = new Map(list.map((row) => [String(row.id), row]));
    if (!list.length) {
      renderListState(container, '没有结果。');
      return;
    }

    container.innerHTML = list.map((row) => `
      <article class="item">
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHtml(row.summary)}</div>
            ${renderMeta([row.game_code, row.party_type, row.status, row.hold_status])}
          </div>
          <div class="actions">
            <button type="button" data-edit-party="${escapeHtml(row.id)}" class="secondary">编辑</button>
            <button type="button" data-delete-party="${escapeHtml(row.id)}" class="danger">删除</button>
          </div>
        </div>
        <div class="hint">成员：${escapeHtml((row.members || []).map((member) => member.name || member.member_name_raw).join(' / '))}</div>
        <div>${escapeHtml(row.description || '')}</div>
      </article>`).join('');
  } catch (error) {
    renderListState(container, error.message, 'error');
  }
}

export function initParties() {
  const searchButton = $('#searchPartyBtn');
  searchButton.addEventListener('click', () => withBusy(searchButton, '搜索中...', searchParties));
  bindEnterSearch(searchButton.closest('.toolbar'), searchButton, '搜索中...', searchParties);
  $('#newPartyBtn').addEventListener('click', () => openEditor({ members: [] }));
  $('#partyResults').addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-party]');
    const deleteButton = event.target.closest('[data-delete-party]');

    if (editButton) openEditor(partyRows.get(editButton.dataset.editParty) || {});

    if (deleteButton && window.confirm('确定删除这个配队？')) {
      await withBusy(deleteButton, '删除中...', async () => {
        try {
          await API.deleteParty({ id: deleteButton.dataset.deleteParty });
          await searchParties();
        } catch (error) {
          renderListState($('#partyResults'), error.message, 'error');
        }
      });
    }
  });
}
