import { API } from '../api.js';
import {
  $,
  bindCollapseAllControls,
  bindCollapsibleCards,
  bindEnterSearch,
  escapeHtml,
  log,
  normalizeRows,
  closeDrawer,
  openDrawer,
  readForm,
  renderListState,
  renderMeta,
  renderCollapseButton,
  renderRichText,
  safeExternalUrl,
  withBusy
} from '../ui.js';

let partyRows = new Map();
const PARTY_MARKDOWN_LINK = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/gi;

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
      <label>链接标题 <input data-party-link-field="title" value="${escapeHtml(link.title || '')}" placeholder="例如：霜新配队演示" /></label>
      <label>链接网址 <input data-party-link-field="url" type="url" inputmode="url" value="${escapeHtml(link.url || '')}" placeholder="https://..." /></label>
      <button type="button" class="ghost remove-row" data-remove-party-link>删除</button>
    </div>`;
}

export function renderPartyLinkEditor(links) {
  return `
    <section class="structured-editor wide" aria-label="配队说明链接">
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
      <label class="wide">
        说明正文
        <span class="field-help">正文支持自由换行；需要添加链接时使用下方的链接表单。</span>
        <textarea name="description" placeholder="填写配队思路、操作顺序或注意事项……">${escapeHtml(description.body)}</textarea>
      </label>
      ${renderPartyLinkEditor(description.links)}
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
  bindPartyLinkEditor($('#partyForm'));
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
          description: composePartyDescription(form.description, collectPartyLinks(event.currentTarget)),
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
  const controls = $('#partyResultControls');
  controls.hidden = true;
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
          <div class="actions collapsible-actions">
            ${renderCollapseButton(row.summary)}
            <button type="button" data-edit-party="${escapeHtml(row.id)}" class="secondary">编辑</button>
            <button type="button" data-delete-party="${escapeHtml(row.id)}" class="danger">删除</button>
          </div>
        </div>
        <div class="item-content" data-card-content>
          <div class="hint">成员：${escapeHtml((row.members || []).map((member) => member.name || member.member_name_raw).join(' / '))}</div>
          ${renderRichText(row.description || '')}
        </div>
      </article>`).join('');
    controls.hidden = false;
  } catch (error) {
    renderListState(container, error.message, 'error');
  }
}

export function initParties() {
  const searchButton = $('#searchPartyBtn');
  bindCollapsibleCards($('#partyResults'));
  bindCollapseAllControls($('#partyResultControls'), $('#partyResults'));
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
