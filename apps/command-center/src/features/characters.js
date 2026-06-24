import { API } from '../api.js';
import {
  $,
  escapeHtml,
  log,
  normalizeRows,
  parseJsonArray,
  readForm,
  renderLinks,
  renderListState,
  renderMeta,
  setHidden,
  withBusy
} from '../ui.js';

function openEditor(data = {}) {
  const names = data.names || data.localized_names || {};
  const links = data.links || data.resources || [];
  const editor = $('#characterEditor');

  editor.innerHTML = `
    <h2>${data.id ? '编辑角色' : '新增角色'}</h2>
    <form id="charForm" class="form-grid">
      <input type="hidden" name="id" value="${escapeHtml(data.id || '')}" />
      <label>游戏 code / short_code <input name="game_code" required value="${escapeHtml(data.game_code || '')}" placeholder="绝 / 鸣 / 崩" /></label>
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
    </form>
    <pre id="charSaveLog" class="log" aria-live="polite"></pre>`;

  setHidden(editor, false);
  $('#cancelCharEdit').addEventListener('click', () => setHidden(editor, true));
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
          links: parseJsonArray(form.links)
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
  $('#searchCharBtn').addEventListener('click', () => withBusy($('#searchCharBtn'), '搜索中...', searchCharacters));
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
          setHidden(editor, false);
          renderListState(editor, error.message, 'error');
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
