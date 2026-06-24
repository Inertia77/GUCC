import { CONFIG } from './config.js';
import { signIn, signUp, signOut, isLoggedIn, getSession } from './auth.js';
import { API } from './api.js';
import { $, $$, escapeHtml, log, setHidden, renderMeta, renderLinks, readForm, parseLooseJson } from './ui.js';

function showMain() {
  const logged = isLoggedIn();
  setHidden($('#loginView'), logged);
  setHidden($('#mainView'), !logged);
  $('#sessionStatus').textContent = logged ? '已登录' : '未登录';
  $('#sessionStatus').className = logged ? 'badge ok' : 'badge muted';
  setHidden($('#logoutBtn'), !logged);
  $('#configView') && log($('#configView'), {
    SUPABASE_URL: CONFIG.SUPABASE_URL,
    EDGE_FUNCTION_NAME: CONFIG.EDGE_FUNCTION_NAME,
    ANON_KEY_SET: CONFIG.SUPABASE_ANON_KEY && !CONFIG.SUPABASE_ANON_KEY.includes('YOUR_')
  });
}

function initTabs() {
  $$('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tabs button').forEach(b => b.classList.remove('active'));
      $$('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $(`#${btn.dataset.tab}`).classList.add('active');
    });
  });
}

function bindAuth() {
  $('#loginBtn').addEventListener('click', async () => {
    try {
      log($('#loginLog'), '登录中...');
      await signIn($('#emailInput').value.trim(), $('#passwordInput').value);
      log($('#loginLog'), '登录成功。');
      showMain();
    } catch (e) { log($('#loginLog'), e.message); }
  });
  $('#signupBtn').addEventListener('click', async () => {
    try {
      log($('#loginLog'), '注册中...');
      const res = await signUp($('#emailInput').value.trim(), $('#passwordInput').value);
      log($('#loginLog'), { message: 'Auth 用户创建请求已发送。如果开启邮箱确认，请先确认邮件。随后记得在 app_users 登记。', result: res });
    } catch (e) { log($('#loginLog'), e.message); }
  });
  $('#logoutBtn').addEventListener('click', async () => {
    await signOut();
    showMain();
  });
}

async function handlePing() {
  try { log($('#pingResult'), await API.ping()); }
  catch (e) { log($('#pingResult'), e.message); }
}

function characterEditor(data = {}) {
  const names = data.names || data.localized_names || {};
  const links = data.links || data.resources || [];
  $('#characterEditor').innerHTML = `
    <h2>${data.id ? '编辑角色' : '新增角色'}</h2>
    <form id="charForm" class="form-grid">
      <input type="hidden" name="id" value="${escapeHtml(data.id || '')}" />
      <label>游戏 code / short_code <input name="game_code" value="${escapeHtml(data.game_code || '')}" placeholder="绝 / 鸣 / 崩" /></label>
      <label>角色名 <input name="name" value="${escapeHtml(data.name || data.character_name || '')}" /></label>
      <label>属性 <input name="element" value="${escapeHtml(data.element || '')}" /></label>
      <label>职业 <input name="profession" value="${escapeHtml(data.profession || '')}" /></label>
      <label>性别 <input name="sex" value="${escapeHtml(data.sex || '')}" /></label>
      <label>稀有度 <input name="rarity" value="${escapeHtml(data.rarity || '')}" /></label>
      <label>研究状态 <input name="research_status" value="${escapeHtml(data.research_status || '')}" /></label>
      <label>养成状态 <input name="build_status" value="${escapeHtml(data.build_status || '')}" /></label>
      <label>LIKE度 <input name="like_level" value="${escapeHtml(data.like_level || '')}" /></label>
      <label>定位 <input name="role_type" value="${escapeHtml(data.role_type || '')}" /></label>
      <label>战力度 <input name="power_rank" value="${escapeHtml(data.power_rank || '')}" /></label>
      <label class="wide">角色备注 <textarea name="note">${escapeHtml(data.note || data.character_note || '')}</textarea></label>
      <label class="wide">研究/养成备注 <textarea name="research_note">${escapeHtml(data.research_note || '')}</textarea></label>
      <label>JP 名 <input name="jp_name" value="${escapeHtml(names.jp || data.jp_name || '')}" /></label>
      <label>EN 名 <input name="en_name" value="${escapeHtml(names.en || data.en_name || '')}" /></label>
      <label>KR 名 <input name="kr_name" value="${escapeHtml(names.kr || data.kr_name || '')}" /></label>
      <label class="wide">链接 JSON（可留空）
        <textarea name="links" placeholder='[{"title":"先行研究","url":"https://...","relation_type":"research"}]'>${escapeHtml(JSON.stringify(links, null, 2))}</textarea>
      </label>
      <div class="button-row wide">
        <button type="submit">保存角色</button>
        <button type="button" id="cancelCharEdit" class="ghost">取消</button>
      </div>
    </form>
    <pre id="charSaveLog" class="log"></pre>`;
  setHidden($('#characterEditor'), false);
  $('#cancelCharEdit').addEventListener('click', () => setHidden($('#characterEditor'), true));
  $('#charForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      const f = readForm(ev.currentTarget);
      const payload = {
        id: f.id || null,
        game_code: f.game_code,
        name: f.name,
        element: f.element,
        profession: f.profession,
        sex: f.sex,
        rarity: f.rarity,
        note: f.note,
        research_status: f.research_status,
        build_status: f.build_status,
        like_level: f.like_level,
        research_note: f.research_note,
        role_type: f.role_type,
        power_rank: f.power_rank,
        names: { jp: f.jp_name, en: f.en_name, kr: f.kr_name },
        links: parseLooseJson(f.links, [])
      };
      log($('#charSaveLog'), '保存中...');
      const res = await API.saveCharacter(payload);
      log($('#charSaveLog'), res);
      await searchCharacters();
    } catch (e) { log($('#charSaveLog'), e.message); }
  });
}

async function searchCharacters() {
  const container = $('#characterResults');
  container.innerHTML = '<div class="card">查询中...</div>';
  try {
    const rows = await API.searchCharacters({ keyword: $('#charKeyword').value.trim(), game_code: $('#charGame').value.trim(), limit: 80 });
    const list = Array.isArray(rows) ? rows : (rows.rows || []);
    if (!list.length) { container.innerHTML = '<div class="card">没有结果。</div>'; return; }
    container.innerHTML = list.map(r => `
      <article class="item">
        <div class="item-head">
          <div>
            <div class="item-title">${escapeHtml(r.character_name || r.name)}</div>
            ${renderMeta([r.game_code || r.game_title, r.element, r.profession, r.research_status, r.build_status, r.like_level, r.role_type, r.power_rank])}
          </div>
          <div class="actions">
            <button data-detail-char="${escapeHtml(r.id)}" class="secondary">详情/编辑</button>
            <button data-delete-char="${escapeHtml(r.id)}" class="danger">删除</button>
          </div>
        </div>
        <div class="hint">${escapeHtml(r.research_note || r.note || '')}</div>
        ${renderLinks(r.links || r.resources)}
      </article>`).join('');
    container.querySelectorAll('[data-detail-char]').forEach(btn => btn.addEventListener('click', async () => {
      const detail = await API.getCharacterDetail({ id: btn.dataset.detailChar });
      characterEditor(detail);
    }));
    container.querySelectorAll('[data-delete-char]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('确定删除这个角色？会级联删除相关进度/名称/评价关系。')) return;
      await API.deleteCharacter({ id: btn.dataset.deleteChar });
      await searchCharacters();
    }));
  } catch (e) { container.innerHTML = `<div class="card"><pre class="log">${escapeHtml(e.message)}</pre></div>`; }
}

function partyEditor(data = {}) {
  const members = data.members || [];
  $('#partyEditor').innerHTML = `
    <h2>${data.id ? '编辑配队' : '新增配队'}</h2>
    <form id="partyForm" class="form-grid">
      <input type="hidden" name="id" value="${escapeHtml(data.id || '')}" />
      <label>游戏 code <input name="game_code" value="${escapeHtml(data.game_code || '')}" /></label>
      <label class="wide">简要描述 <input name="summary" value="${escapeHtml(data.summary || '')}" /></label>
      <label>类型 <input name="party_type" value="${escapeHtml(data.party_type || '')}" /></label>
      <label>状态 <input name="status" value="${escapeHtml(data.status || '')}" /></label>
      <label>持有状态 <input name="hold_status" value="${escapeHtml(data.hold_status || '')}" /></label>
      <label>成员1 <input name="m1" value="${escapeHtml(members[0]?.name || members[0]?.member_name_raw || '')}" /></label>
      <label>成员2 <input name="m2" value="${escapeHtml(members[1]?.name || members[1]?.member_name_raw || '')}" /></label>
      <label>成员3 <input name="m3" value="${escapeHtml(members[2]?.name || members[2]?.member_name_raw || '')}" /></label>
      <label>成员4 <input name="m4" value="${escapeHtml(members[3]?.name || members[3]?.member_name_raw || '')}" /></label>
      <label class="wide">说明 <textarea name="description">${escapeHtml(data.description || '')}</textarea></label>
      <div class="button-row wide"><button type="submit">保存配队</button><button type="button" id="cancelPartyEdit" class="ghost">取消</button></div>
    </form><pre id="partySaveLog" class="log"></pre>`;
  setHidden($('#partyEditor'), false);
  $('#cancelPartyEdit').addEventListener('click', () => setHidden($('#partyEditor'), true));
  $('#partyForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      const f = readForm(ev.currentTarget);
      const members = [f.m1, f.m2, f.m3, f.m4].filter(Boolean).map((name, i) => ({ slot_no: i + 1, name }));
      const res = await API.saveParty({ id: f.id || null, game_code: f.game_code, summary: f.summary, party_type: f.party_type, status: f.status, hold_status: f.hold_status, description: f.description, members });
      log($('#partySaveLog'), res); await searchParties();
    } catch (e) { log($('#partySaveLog'), e.message); }
  });
}

async function searchParties() {
  const container = $('#partyResults'); container.innerHTML = '<div class="card">查询中...</div>';
  try {
    const rows = await API.searchParties({ keyword: $('#partyKeyword').value.trim(), game_code: $('#partyGame').value.trim(), limit: 80 });
    const list = Array.isArray(rows) ? rows : (rows.rows || []);
    if (!list.length) { container.innerHTML = '<div class="card">没有结果。</div>'; return; }
    container.innerHTML = list.map(r => `
      <article class="item"><div class="item-head"><div><div class="item-title">${escapeHtml(r.summary)}</div>${renderMeta([r.game_code, r.party_type, r.status, r.hold_status])}</div><div class="actions"><button data-edit-party="${escapeHtml(r.id)}" class="secondary">编辑</button><button data-delete-party="${escapeHtml(r.id)}" class="danger">删除</button></div></div><div class="hint">成员：${escapeHtml((r.members || []).map(m => m.name || m.member_name_raw).join(' / '))}</div><div>${escapeHtml(r.description || '')}</div></article>`).join('');
    container.querySelectorAll('[data-edit-party]').forEach(btn => btn.addEventListener('click', () => partyEditor(list.find(x => String(x.id) === String(btn.dataset.editParty)) || {})));
    container.querySelectorAll('[data-delete-party]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('确定删除配队？')) return; await API.deleteParty({ id: btn.dataset.deleteParty }); await searchParties(); }));
  } catch (e) { container.innerHTML = `<div class="card"><pre class="log">${escapeHtml(e.message)}</pre></div>`; }
}

function versionEditor(data = {}) {
  $('#versionEditor').innerHTML = `
    <h2>${data.id ? '编辑版本' : '新增版本'}</h2>
    <form id="versionForm" class="form-grid">
      <input type="hidden" name="id" value="${escapeHtml(data.id || '')}" />
      <label>游戏 code <input name="game_code" value="${escapeHtml(data.game_code || '')}" /></label>
      <label>版本号 <input name="version_no" value="${escapeHtml(data.version_no || '')}" /></label>
      <label>版本名 <input name="version_name" value="${escapeHtml(data.version_name || '')}" /></label>
      <label>开始日期 <input name="start_date" type="date" value="${escapeHtml(data.start_date || '')}" /></label>
      <label class="wide">卡池 JSON（可留空）<textarea name="banners" placeholder='[{"phase":"first_half","banner_type":"new_limited","character_name":"角色名"}]'>${escapeHtml(JSON.stringify(data.banners || [], null, 2))}</textarea></label>
      <label class="wide">备注 <textarea name="note">${escapeHtml(data.note || '')}</textarea></label>
      <div class="button-row wide"><button type="submit">保存版本</button><button type="button" id="cancelVersionEdit" class="ghost">取消</button></div>
    </form><pre id="versionSaveLog" class="log"></pre>`;
  setHidden($('#versionEditor'), false);
  $('#cancelVersionEdit').addEventListener('click', () => setHidden($('#versionEditor'), true));
  $('#versionForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      const f = readForm(ev.currentTarget);
      const res = await API.saveVersion({ id: f.id || null, game_code: f.game_code, version_no: f.version_no, version_name: f.version_name, start_date: f.start_date, note: f.note, banners: parseLooseJson(f.banners, []) });
      log($('#versionSaveLog'), res); await searchVersions();
    } catch (e) { log($('#versionSaveLog'), e.message); }
  });
}

async function searchVersions() {
  const container = $('#versionResults'); container.innerHTML = '<div class="card">查询中...</div>';
  try {
    const rows = await API.searchVersions({ keyword: $('#versionKeyword').value.trim(), game_code: $('#versionGame').value.trim(), limit: 80 });
    const list = Array.isArray(rows) ? rows : (rows.rows || []);
    if (!list.length) { container.innerHTML = '<div class="card">没有结果。</div>'; return; }
    container.innerHTML = list.map(r => `
      <article class="item"><div class="item-head"><div><div class="item-title">${escapeHtml(r.version_no || '')} ${escapeHtml(r.version_name || '')}</div>${renderMeta([r.game_code, r.start_date])}</div><div class="actions"><button data-edit-version="${escapeHtml(r.id)}" class="secondary">编辑</button><button data-delete-version="${escapeHtml(r.id)}" class="danger">删除</button></div></div><div class="hint">${escapeHtml(r.note || '')}</div><div>${escapeHtml((r.banners || []).map(b => `${b.phase}:${b.banner_type}:${b.character_name || b.character_name_raw}`).join(' / '))}</div></article>`).join('');
    container.querySelectorAll('[data-edit-version]').forEach(btn => btn.addEventListener('click', () => versionEditor(list.find(x => String(x.id) === String(btn.dataset.editVersion)) || {})));
    container.querySelectorAll('[data-delete-version]').forEach(btn => btn.addEventListener('click', async () => { if (!confirm('确定删除版本？')) return; await API.deleteVersion({ id: btn.dataset.deleteVersion }); await searchVersions(); }));
  } catch (e) { container.innerHTML = `<div class="card"><pre class="log">${escapeHtml(e.message)}</pre></div>`; }
}

async function searchResources() {
  const container = $('#resourceResults'); container.innerHTML = '<div class="card">查询中...</div>';
  try {
    const rows = await API.searchResources({ keyword: $('#resourceKeyword').value.trim(), limit: 100 });
    const list = Array.isArray(rows) ? rows : (rows.rows || []);
    if (!list.length) { container.innerHTML = '<div class="card">没有结果。</div>'; return; }
    container.innerHTML = list.map(r => `<article class="item"><div class="item-title">${escapeHtml(r.title || r.url)}</div>${renderLinks([r])}${renderMeta([r.resource_type, r.source, r.relation_type])}<div class="hint">${escapeHtml(r.note || '')}</div></article>`).join('');
  } catch (e) { container.innerHTML = `<div class="card"><pre class="log">${escapeHtml(e.message)}</pre></div>`; }
}

function bindEvents() {
  $('#pingBtn').addEventListener('click', handlePing);
  $('#runSmokeTestBtn').addEventListener('click', async () => {
    try {
      const result = { ping: await API.ping(), chars: await API.searchCharacters({ keyword: '', limit: 3 }) };
      log($('#smokeResult'), result);
    } catch (e) { log($('#smokeResult'), e.message); }
  });
  $('#searchCharBtn').addEventListener('click', searchCharacters);
  $('#newCharBtn').addEventListener('click', () => characterEditor({ links: [] }));
  $('#searchPartyBtn').addEventListener('click', searchParties);
  $('#newPartyBtn').addEventListener('click', () => partyEditor({ members: [] }));
  $('#searchVersionBtn').addEventListener('click', searchVersions);
  $('#newVersionBtn').addEventListener('click', () => versionEditor({ banners: [] }));
  $('#searchResourceBtn').addEventListener('click', searchResources);
}

document.addEventListener('DOMContentLoaded', () => {
  initTabs(); bindAuth(); bindEvents(); showMain();
});
