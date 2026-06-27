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
  renderLinks,
  renderListState,
  renderMeta,
  withBusy
} from '../ui.js';

function normalizeLinks(links) {
  return Array.isArray(links) && links.length ? links : [{ title: '', url: '', relation_type: '', source: '', note: '' }];
}

function renderLinkRow(link = {}) {
  return `
    <div class="structured-row" data-link-row>
      <label>链接标题 <input data-link-field="title" value="${escapeHtml(link.title || link.resource_title || '')}" placeholder="官方资料 / 先行研究" /></label>
      <label>URL <input data-link-field="url" value="${escapeHtml(link.url || link.resource_url || '')}" placeholder="https://..." /></label>
      <label>关系类型 <input data-link-field="relation_type" value="${escapeHtml(link.relation_type || '')}" placeholder="official / research / guide" /></label>
      <label>来源 <input data-link-field="source" value="${escapeHtml(link.source || '')}" placeholder="wiki / bbs / docs" /></label>
      <label class="row-wide">备注 <input data-link-field="note" value="${escapeHtml(link.note || '')}" placeholder="可留空" /></label>
      <button type="button" class="ghost remove-row" data-remove-link>删除</button>
    </div>`;
}

function renderLinkEditor(links) {
  return `
    <section class="structured-editor wide" aria-label="角色链接">
      <div class="structured-head">
        <div>
          <strong>角色链接</strong>
          <span>按字段填写，保存时自动转换成 links JSON 数组。</span>
        </div>
        <button type="button" id="addCharLink" class="secondary add-row">添加链接</button>
      </div>
      <div id="charLinkRows" class="structured-list">
        ${normalizeLinks(links).map(renderLinkRow).join('')}
      </div>
    </section>`;
}

function emptyLinkRow(row) {
  row.querySelectorAll('[data-link-field]').forEach((input) => {
    input.value = '';
  });
}

function bindLinkEditor(form) {
  const list = form.querySelector('#charLinkRows');
  form.querySelector('#addCharLink').addEventListener('click', () => {
    list.insertAdjacentHTML('beforeend', renderLinkRow());
  });
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-link]');
    if (!button) return;
    const row = button.closest('[data-link-row]');
    if (list.querySelectorAll('[data-link-row]').length <= 1) emptyLinkRow(row);
    else row.remove();
  });
}

function collectLinks(form) {
  return [...form.querySelectorAll('[data-link-row]')].map((row, index) => {
    const value = (field) => row.querySelector(`[data-link-field="${field}"]`)?.value.trim() || '';
    const link = {
      title: value('title'),
      url: value('url'),
      relation_type: value('relation_type'),
      source: value('source'),
      note: value('note')
    };
    const hasAnyValue = Object.values(link).some(Boolean);
    if (hasAnyValue && !link.url) throw new Error(`第 ${index + 1} 条链接需要填写 URL。`);
    return hasAnyValue ? link : null;
  }).filter(Boolean);
}

function openEditor(data = {}) {
  const names = data.names || data.localized_names || {};
  const links = data.links || data.resources || [];
  const editor = $('#characterEditor');

  editor.innerHTML = `
    <div class="editor-header">
      <div>
        <p class="kicker">CHARACTER RECORD</p>
        <h2 id="characterEditorTitle">${data.id ? '编辑角色' : '新增角色'}</h2>
      </div>
      <button type="button" id="closeCharEditor" class="icon-button" aria-label="关闭角色编辑器">×</button>
    </div>
    <form id="charForm" class="editor-body form-grid">
      <input type="hidden" name="id" value="${escapeHtml(data.id || '')}" />
      <label>游戏 code / short_code <input name="game_code" data-autofocus required value="${escapeHtml(data.game_code || '')}" placeholder="绝 / 鸣 / 崩" /></label>
      <label>角色名 <input name="name" required value="${escapeHtml(data.name || data.character_name || '')}" /></label>
      <label>属性 <input name="element" value="${escapeHtml(data.element || '')}" /></label>
      <label>职业 <input name="profession" value="${escapeHtml(data.profession || '')}" /></label>
      <label>性别 <input name="sex" value="${escapeHtml(data.sex || '')}" /></label>
      <label>稀有度 <input name="rarity" value="${escapeHtml(data.rarity || '')}" /></label>
      <label>研究状态 <input name="research_status" value="${escapeHtml(data.research_status || '')}" /></label>
      <label>养成状态 <input name="build_status" value="${escapeHtml(data.build_status || '')}" /></label>
      <label>LIKE 度 <input name="like_level" value="${escapeHtml(data.like_level || '')}" /></label>
      <label>定位 <input name="role_type" value="${escapeHtml(data.role_type || '')}" /></label>
      <label>战力度 <input name="power_rank" value="${escapeHtml(data.power_rank || '')}" /></label>
      <label class="wide">角色备注 <textarea name="note">${escapeHtml(data.note || data.character_note || '')}</textarea></label>
      <label class="wide">研究/养成备注 <textarea name="research_note">${escapeHtml(data.research_note || '')}</textarea></label>
      <label class="wide">当前评价备注 <textarea name="evaluation_note">${escapeHtml(data.evaluation_note || '')}</textarea></label>
      <label>JP 名 <input name="jp_name" value="${escapeHtml(names.jp || data.jp_name || '')}" /></label>
      <label>EN 名 <input name="en_name" value="${escapeHtml(names.en || data.en_name || '')}" /></label>
      <label>KR 名 <input name="kr_name" value="${escapeHtml(names.kr || data.kr_name || '')}" /></label>
      <label class="wide">链接 JSON（必须是数组，可留空）
        <textarea name="links" placeholder='[{"title":"先行研究","url":"https://...","relation_type":"research"}]'>${escapeHtml(JSON.stringify(links, null, 2))}</textarea>
      </label>
      <div class="button-row wide">
        <button type="submit">保存角色</button>
        <button type="button" id="cancelCharEdit" class="ghost">取消</button>
      </div>
      <pre id="charSaveLog" class="log wide" aria-live="polite"></pre>
    </form>
  `;

  const legacyLinksLabel = editor.querySelector('textarea[name="links"]')?.closest('label');
  if (legacyLinksLabel) {
    legacyLinksLabel.insertAdjacentHTML('afterend', renderLinkEditor(links));
    legacyLinksLabel.remove();
  }

  editor.setAttribute('role', 'dialog');
  editor.setAttribute('aria-modal', 'true');
  editor.setAttribute('aria-labelledby', 'characterEditorTitle');
  $('#closeCharEditor').addEventListener('click', () => closeDrawer(editor));
  $('#cancelCharEdit').addEventListener('click', () => closeDrawer(editor));
  bindLinkEditor($('#charForm'));
  openDrawer(editor);
  $('#charForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('[type="submit"]');

    await withBusy(submitButton, '保存中...', async () => {
      try {
        const form = readForm(event.currentTarget);
        const result = await API.saveCharacter({
          id: form.id || null,
          game_code: form.game_code,
          name: form.name,
          element: form.element,
          profession: form.profession,
          sex: form.sex,
          rarity: form.rarity,
          note: form.note,
          research_status: form.research_status,
          build_status: form.build_status,
          like_level: form.like_level,
          research_note: form.research_note,
          role_type: form.role_type,
          power_rank: form.power_rank,
          evaluation_note: form.evaluation_note,
          names: { jp: form.jp_name, en: form.en_name, kr: form.kr_name },
          links: collectLinks(event.currentTarget)
        });
        log($('#charSaveLog'), result);
        await searchCharacters();
      } catch (error) {
        log($('#charSaveLog'), error.message);
      }
    });
  });
}

export async function searchCharacters() {
  const container = $('#characterResults');
  renderListState(container, '查询中...');

  try {
    const rows = await API.searchCharacters({
      keyword: $('#charKeyword').value.trim(),
      game_code: $('#charGame').value.trim(),
      limit: 80
    });
    const list = normalizeRows(rows);
    if (!list.length) {
      renderListState(container, '没有结果。');
      return;
    }

    container.innerHTML = list.map((row) => `
      <article class="item">
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHtml(row.character_name || row.name)}</div>
            ${renderMeta([row.game_code || row.game_title, row.element, row.profession, row.research_status, row.build_status, row.like_level, row.role_type, row.power_rank])}
          </div>
          <div class="actions">
            <button type="button" data-detail-char="${escapeHtml(row.id)}" class="secondary">详情/编辑</button>
            <button type="button" data-delete-char="${escapeHtml(row.id)}" class="danger">删除</button>
          </div>
        </div>
        <div class="hint">${escapeHtml(row.research_note || row.evaluation_note || row.note || '')}</div>
        ${renderLinks(row.links || row.resources)}
      </article>`).join('');
  } catch (error) {
    renderListState(container, error.message, 'error');
  }
}

export function initCharacters() {
  const searchButton = $('#searchCharBtn');
  searchButton.addEventListener('click', () => withBusy(searchButton, '搜索中...', searchCharacters));
  bindEnterSearch(searchButton.closest('.toolbar'), searchButton, '搜索中...', searchCharacters);
  $('#newCharBtn').addEventListener('click', () => openEditor({ links: [] }));
  $('#characterResults').addEventListener('click', async (event) => {
    const detailButton = event.target.closest('[data-detail-char]');
    const deleteButton = event.target.closest('[data-delete-char]');

    if (detailButton) {
      await withBusy(detailButton, '加载中...', async () => {
        try {
          openEditor(await API.getCharacterDetail({ id: detailButton.dataset.detailChar }));
        } catch (error) {
          const editor = $('#characterEditor');
          editor.innerHTML = `
            <div class="editor-header">
              <div>
                <p class="kicker">LOAD ERROR</p>
                <h2 id="characterEditorTitle">角色详情加载失败</h2>
              </div>
              <button type="button" id="closeCharEditor" class="icon-button" aria-label="关闭角色编辑器">×</button>
            </div>
            <div class="editor-body"><div class="card state error">${escapeHtml(error.message)}</div></div>`;
          editor.setAttribute('role', 'dialog');
          editor.setAttribute('aria-modal', 'true');
          editor.setAttribute('aria-labelledby', 'characterEditorTitle');
          $('#closeCharEditor').addEventListener('click', () => closeDrawer(editor));
          openDrawer(editor);
        }
      });
    }

    if (deleteButton && window.confirm('确定删除这个角色？相关进度、名称和评价会一并删除。')) {
      await withBusy(deleteButton, '删除中...', async () => {
        try {
          await API.deleteCharacter({ id: deleteButton.dataset.deleteChar });
          await searchCharacters();
        } catch (error) {
          renderListState($('#characterResults'), error.message, 'error');
        }
      });
    }
  });
}
