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
  renderRichText,
  renderLinks,
  restoreListContext,
  safeExternalUrl,
  showToast,
  withBusy
} from '../ui.js';
import { bindPersistentFilters, persistFilters } from '../ux-state.js';
import { renderFixedFieldOptions } from '../fixed-field-options.js';
import {
  bindClearFilters,
  bindGameFilter,
  bindSelectAutoSearch,
  matchesStatus,
  readGameFilter
} from '../search-filters.js';

let partyRows = new Map();
const PARTY_MARKDOWN_LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi;
const PARTY_MEMBER_SLOT_COUNT = 5;
const FILTERS = {
  '#partyKeyword': 'pq',
  '#partyGame': 'pg',
  '#partyGameCustom': 'pgx',
  '#partyStatus': 'ps',
  '#partyHoldStatus': 'phs'
};
const COLLAPSE_KEY = 'parties';

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

export function parsePartyDescription(value) {
  const links = [];
  const body = String(value || '')
    .replace(PARTY_MARKDOWN_LINK, (_match, title, url) => {
      links.push({ title: title.trim(), url: url.trim() });
      return '';
    })
    .replace(/^[ \t]*[\[\]]+[ \t]*$/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return { body, links };
}

function normalizeLinkTitle(value) {
  return String(value || '').trim().replaceAll('[', '［').replaceAll(']', '］');
}

function normalizePartyUrl(value) {
  const raw = String(value || '').trim();
  if (!/^https?:\/\//i.test(raw)) return '';
  return safeExternalUrl(raw);
}

export function composePartyDescription(body, links) {
  const text = String(body || '').trim();
  const markdownLinks = links.map((link, index) => {
    const title = normalizeLinkTitle(link.title);
    const url = normalizePartyUrl(link.url);
    if (!title || !url) throw new Error(`第 ${index + 1} 条说明链接需要完整填写标题和网址。`);
    const markdownUrl = url.replaceAll('(', '%28').replaceAll(')', '%29');
    return `[${title}](${markdownUrl})`;
  });
  return [text, markdownLinks.join('\n')].filter(Boolean).join('\n\n');
}

function normalizePartyLinks(links) {
  return Array.isArray(links) && links.length ? links : [{ title: '', url: '' }];
}

function renderPartyLinkRow(link = {}) {
  return `
    <div class="structured-row party-link-row" data-party-link-row>
      <label>链接标题 <input data-party-link-field="title" value="${escapeHtml(link.title || '')}" placeholder="例如：霜新阵容演示" /></label>
      <label>链接网址 <input data-party-link-field="url" type="url" inputmode="url" value="${escapeHtml(link.url || '')}" placeholder="https://..." /></label>
      <button type="button" class="ghost remove-row" data-remove-party-link>删除</button>
    </div>`;
}

export function renderPartyLinkEditor(links) {
  return `
    <section class="structured-editor wide" aria-label="阵容说明链接">
      <div class="structured-head">
        <div>
          <strong>说明链接</strong>
          <span>只需填写标题和网址；保存时会自动转换成文本格式写入说明字段。</span>
        </div>
        <button type="button" id="addPartyLink" class="secondary add-row">添加链接</button>
      </div>
      <div id="partyLinkRows" class="structured-list">
        ${normalizePartyLinks(links).map(renderPartyLinkRow).join('')}
      </div>
    </section>`;
}

function clearPartyLinkRow(row) {
  row.querySelectorAll('[data-party-link-field]').forEach((input) => {
    input.value = '';
  });
}

export function bindPartyLinkEditor(form) {
  const list = form.querySelector('#partyLinkRows');
  form.querySelector('#addPartyLink').addEventListener('click', () => {
    list.insertAdjacentHTML('beforeend', renderPartyLinkRow());
  });
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-party-link]');
    if (!button) return;
    const row = button.closest('[data-party-link-row]');
    if (list.querySelectorAll('[data-party-link-row]').length <= 1) clearPartyLinkRow(row);
    else row.remove();
  });
}

export function collectPartyLinks(form) {
  return [...form.querySelectorAll('[data-party-link-row]')].map((row, index) => {
    const title = row.querySelector('[data-party-link-field="title"]')?.value.trim() || '';
    const url = row.querySelector('[data-party-link-field="url"]')?.value.trim() || '';
    if (!title && !url) return null;
    if (!title || !url) throw new Error(`第 ${index + 1} 条说明链接需要完整填写标题和网址。`);
    if (!normalizePartyUrl(url)) throw new Error(`第 ${index + 1} 条说明链接的网址无效，请使用 http:// 或 https://。`);
    return { title, url };
  }).filter(Boolean);
}

function openEditor(data = {}) {
  const members = data.members || [];
  const description = parsePartyDescription(data.description);
  const editor = $('#partyEditor');
  editor.innerHTML = `
    <div class="editor-header">
      <div>
        <p class="kicker">PARTY RECORD</p>
        <h2 id="partyEditorTitle">${data.id ? '编辑阵容' : '新增阵容'}</h2>
      </div>
      <button type="button" id="closePartyEditor" class="icon-button" aria-label="关闭阵容编辑器">×</button>
    </div>
    <form id="partyForm" class="editor-form">
      <div class="editor-body form-grid">
        <input type="hidden" name="id" value="${escapeHtml(data.id || '')}" />
        <label>游戏 code <input name="game_code" data-autofocus required value="${escapeHtml(data.game_code || '')}" /></label>
        <label class="wide">简要描述 <input name="summary" required value="${escapeHtml(data.summary || '')}" /></label>
        <label>类型 <input name="party_type" value="${escapeHtml(data.party_type || '')}" /></label>
        <label>状态
          <select name="status" required>${renderFixedFieldOptions('partyStatus', data.status)}</select>
        </label>
        <label>持有状态
          <select name="hold_status" required>${renderFixedFieldOptions('partyHoldStatus', data.hold_status)}</select>
        </label>
        ${Array.from({ length: PARTY_MEMBER_SLOT_COUNT }, (_, index) => `<label>成员 ${index + 1} <input name="m${index + 1}" value="${escapeHtml(members[index]?.name || members[index]?.member_name_raw || '')}" /></label>`).join('')}
        <label class="wide">
          说明正文
          <span class="field-help">正文支持自由换行；需要添加链接时使用下方的链接表单。</span>
          <textarea name="description" placeholder="填写阵容思路、操作顺序或注意事项……">${escapeHtml(description.body)}</textarea>
        </label>
        ${renderPartyLinkEditor(description.links)}
        <pre id="partySaveLog" class="log wide" aria-live="polite"></pre>
      </div>
      <div class="button-row editor-footer">
        <button type="submit">保存阵容</button>
        <button type="button" id="cancelPartyEdit" class="ghost">取消</button>
      </div>
    </form>
  `;

  editor.setAttribute('role', 'dialog');
  editor.setAttribute('aria-modal', 'true');
  editor.setAttribute('aria-labelledby', 'partyEditorTitle');
  $('#closePartyEditor').addEventListener('click', () => closeDrawer(editor));
  $('#cancelPartyEdit').addEventListener('click', () => closeDrawer(editor));
  bindPartyLinkEditor($('#partyForm'));
  openDrawer(editor);
  $('#partyForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('[type="submit"]');

    await withBusy(submitButton, '保存中...', async () => {
      try {
        const listContext = captureListContext($('#partyResults'));
        const form = readForm(event.currentTarget);
        const membersPayload = Array.from({ length: PARTY_MEMBER_SLOT_COUNT }, (_, index) => ({
          slot_no: index + 1,
          name: form[`m${index + 1}`]
        })).filter((member) => member.name);
        const result = await API.saveParty({
          id: form.id || null,
          game_code: form.game_code,
          summary: form.summary,
          party_type: form.party_type,
          status: form.status,
          hold_status: form.hold_status,
          description: composePartyDescription(form.description, collectPartyLinks(event.currentTarget)),
          members: membersPayload
        });
        await searchParties({ visibleCount: listContext.visibleCount, revealId: result.id });
        closeDrawer(editor, { restoreFocus: false });
        restoreListContext($('#partyResults'), listContext, { focusId: result.id, highlight: true });
        showToast(data.id ? '阵容已保存，已回到原列表位置。' : '阵容已新增并定位。');
      } catch (error) {
        log($('#partySaveLog'), error.message);
      }
    });
  });
}

export async function searchParties({ visibleCount = 0, revealId = '' } = {}) {
  const container = $('#partyResults');
  const controls = $('#partyResultControls');
  persistFilters('parties', FILTERS);
  controls.hidden = true;
  renderListState(container, '查询中...');

  try {
    const keyword = $('#partyKeyword').value.trim();
    const gameCode = readGameFilter('#partyGame', '#partyGameCustom');
    const rows = await API.searchParties({
      keyword,
      game_code: gameCode,
      limit: 200
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
    list = list.filter((row) => (
      matchesStatus(row.status, $('#partyStatus').value)
      && matchesStatus(row.hold_status, $('#partyHoldStatus').value)
    ));
    partyRows = new Map(list.map((row) => [String(row.id), row]));
    if (!list.length) {
      renderListState(container, '没有结果。');
      return;
    }

    renderProgressiveList(container, list, (row) => `
      <article class="item" data-item-id="${escapeHtml(row.id)}" data-game-code="${escapeHtml(row.game_code || '')}" tabindex="-1">
        <div class="item-head">
          <div class="item-summary">
            <div class="item-title">${escapeHtml(row.summary)}</div>
            ${renderMeta([
              row.game_code,
              row.party_type,
              { value: row.status, tone: 'progress' },
              { value: row.hold_status, tone: 'state' }
            ])}
          </div>
          <div class="actions collapsible-actions">
            ${renderCollapseButton(row.summary)}
            <button type="button" data-edit-party="${escapeHtml(row.id)}" class="secondary">编辑</button>
            <button type="button" data-delete-party="${escapeHtml(row.id)}" class="danger">删除</button>
          </div>
        </div>
        <div class="item-content" data-card-content>
          <div class="item-content-title">阵容详情</div>
          <div class="hint">成员：${escapeHtml((row.members || []).map((member) => member.name || member.member_name_raw).join(' / '))}</div>
          ${renderRichText(row.description || '')}
          ${renderLinks(row.links || row.resources)}
        </div>
      </article>`, {
      visibleCount,
      revealId,
      itemLabel: '个阵容',
      afterRender: () => applySavedCardState(container, COLLAPSE_KEY)
    });
    controls.hidden = false;
  } catch (error) {
    renderListState(container, error.message, 'error');
  }
}

export function initParties() {
  const searchButton = $('#searchPartyBtn');
  const runSearch = () => {
    if (searchButton.disabled) return;
    return withBusy(searchButton, '搜索中...', searchParties);
  };
  bindPersistentFilters('parties', FILTERS);
  bindGameFilter('#partyGame', '#partyGameCustom');
  bindSelectAutoSearch(
    ['#partyGame', '#partyStatus', '#partyHoldStatus'],
    runSearch
  );
  bindClearFilters('#clearPartyFilters', Object.keys(FILTERS), runSearch);
  bindCollapsibleCards($('#partyResults'), COLLAPSE_KEY);
  bindCollapseAllControls($('#partyResultControls'), $('#partyResults'), COLLAPSE_KEY);
  searchButton.addEventListener('click', runSearch);
  bindEnterSearch(searchButton.closest('.toolbar'), searchButton, '搜索中...', searchParties);
  $('#newPartyBtn').addEventListener('click', () => openEditor({ members: [] }));
  $('#partyResults').addEventListener('click', async (event) => {
    const editButton = event.target.closest('[data-edit-party]');
    const deleteButton = event.target.closest('[data-delete-party]');

    if (editButton) openEditor(partyRows.get(editButton.dataset.editParty) || {});

    if (deleteButton && window.confirm('确定删除这个阵容？')) {
      await withBusy(deleteButton, '删除中...', async () => {
        try {
          const card = deleteButton.closest('.item');
          const neighborId = card?.nextElementSibling?.dataset.itemId || card?.previousElementSibling?.dataset.itemId || '';
          const listContext = captureListContext($('#partyResults'), neighborId);
          await API.deleteParty({ id: deleteButton.dataset.deleteParty });
          await searchParties({ visibleCount: listContext.visibleCount, revealId: neighborId });
          restoreListContext($('#partyResults'), listContext, { focusId: neighborId });
          showToast('阵容已删除，列表位置已保留。');
        } catch (error) {
          renderListState($('#partyResults'), error.message, 'error');
        }
      });
    }
  });
}
