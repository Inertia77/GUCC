(() => {
  const DATA_URL = '../data/imports/gacha-leak-sources-2026-08-07.json';

  const games = {
    '崩': { name: '崩坏：星穹铁道', short: '星穹铁道' },
    '鸣': { name: '鸣潮', short: '鸣潮' },
    '绝': { name: '绝区零', short: '绝区零' },
    '终': { name: '明日方舟：终末地', short: '终末地' },
    '异': { name: '异环', short: '异环' }
  };
  const GAME_ORDER = ['崩', '鸣', '绝', '终', '异'];
  const gameRank = (key) => {
    const rank = GAME_ORDER.indexOf(key);
    return rank === -1 ? GAME_ORDER.length : rank;
  };

  const officialGroups = [
    {
      key: '崩', description: '米游社官方 Wiki', routes: [
        ['角色', 'https://bbs.mihoyo.com/sr/wiki/channel/map/17/18?bbs_presentation_style=no_header', '角色档案'],
        ['光锥', 'https://bbs.mihoyo.com/sr/wiki/channel/map/17/19?bbs_presentation_style=no_header', '装备图鉴'],
        ['遗器', 'https://bbs.mihoyo.com/sr/wiki/channel/map/17/30?bbs_presentation_style=no_header', '套装与数值'],
        ['敌人', 'https://bbs.mihoyo.com/sr/wiki/channel/map/17/23?bbs_presentation_style=no_header', '机制研究'],
        ['Bilibili 官方图文公告', 'https://space.bilibili.com/1340190821/upload/opus', '官方动态', '公告']
      ]
    },
    {
      key: '终', description: '森空岛 Wiki 与工业参考', routes: [
        ['干员', 'https://wiki.skland.com/endfield/catalog?mainTypeId=1&subTypeId=1', '干员档案'],
        ['武器', 'https://wiki.skland.com/endfield/catalog?typeMainId=1&typeSubId=2', '武器目录'],
        ['装备', 'https://wiki.skland.com/endfield/catalog?typeMainId=1&typeSubId=4', '装备目录'],
        ['武器基质', 'https://wiki.skland.com/endfield/catalog?typeMainId=1&typeSubId=7', '基质目录'],
        ['敌人', 'https://wiki.skland.com/endfield/catalog?typeMainId=1&typeSubId=3', '机制研究'],
        ['攻略合集', 'https://wiki.skland.com/endfield/catalog?typeMainId=2&typeSubId=11', '基础养成'],
        ['工业蓝图参考', 'https://docs.qq.com/sheet/DUEh1aHpCVVd4ZUdh?tab=dl5rqp&nlc=1', '非官方表格', '参考'],
        ['Bilibili 官方图文公告', 'https://space.bilibili.com/1265652806/upload/opus', '官方动态', '公告']
      ]
    },
    {
      key: '绝', description: '米游社官方百科', routes: [
        ['代理人', 'https://baike.mihoyo.com/zzz/wiki/channel/map/2/43?mhy_presentation_style=fullscreen', '角色档案'],
        ['音擎', 'https://baike.mihoyo.com/zzz/wiki/channel/map/2/45?mhy_presentation_style=fullscreen', '装备图鉴'],
        ['驱动盘', 'https://baike.mihoyo.com/zzz/wiki/channel/map/2/46?mhy_presentation_style=fullscreen', '套装与数值'],
        ['邦布', 'https://baike.mihoyo.com/zzz/wiki/channel/map/2/44?mhy_presentation_style=fullscreen', '特殊小队员'],
        ['敌人', 'https://baike.mihoyo.com/zzz/wiki/channel/map/2/65?mhy_presentation_style=fullscreen', '机制研究'],
        ['Bilibili 官方图文公告', 'https://space.bilibili.com/1636034895/upload/opus', '官方动态', '公告']
      ]
    },
    {
      key: '鸣', description: '库街区官方 Wiki', routes: [
        ['共鸣者', 'https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1105', '角色档案'],
        ['武器', 'https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1106', '武器图鉴'],
        ['声骸', 'https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1107', '声骸目录'],
        ['合鸣效果', 'https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1219', '套装效果'],
        ['敌人', 'https://wiki.kurobbs.com/mc/catalogue/list?fid=1099&sid=1158', '机制研究'],
        ['Bilibili 官方图文公告', 'https://space.bilibili.com/1955897084/upload/opus', '官方动态', '公告']
      ]
    },
    {
      key: '异', description: '官方动态入口', routes: [
        ['Bilibili 官方图文公告', 'https://space.bilibili.com/3546636978489848/upload/opus', '官方动态', '公告']
      ]
    }
  ];

  const projectAssistants = [
    {
      key: 'general',
      mark: '总',
      number: '00',
      eyebrow: 'ChatGPT · 综合游戏助理',
      title: 'Game Assistant',
      description: '日常游戏问答、跨类别判断与临时研究的统一入口；不知道该进哪个专用工作区时先从这里开始。',
      tags: ['综合问答', '跨类别', '临时研究'],
      url: 'https://chatgpt.com/g/g-p-6a914917ed548191a8299e3f009aad2f/project'
    },
    {
      key: 'character',
      mark: '角',
      number: '01',
      eyebrow: 'ChatGPT · 角色分析',
      title: '【二游メモ】角色分析（キャラクター）',
      description: '原“二游角色总控”统一改名后的角色专用工作区；继续承接角色解析、人物与养成相关研究。',
      tags: ['角色解析', '人物', '养成'],
      url: 'https://chatgpt.com/g/g-p-6a8ec96a3bb4819196b66af85cbc9695/project'
    },
    {
      key: 'party',
      mark: '阵',
      number: '02',
      eyebrow: 'ChatGPT · 阵容分析',
      title: '【二游メモ】阵容分析（パーティー）',
      description: '用于配队、替代位、阵容逻辑、排轴与实战适配等队伍层面的专项分析。',
      tags: ['阵容解析', '配队', '排轴'],
      url: 'https://chatgpt.com/g/g-p-6a8eef4bc060819197a59cf0a28209be/project'
    },
    {
      key: 'mechanism',
      mark: '机',
      number: '03',
      eyebrow: 'ChatGPT · 游戏机制',
      title: '【二游メモ】游戏机制（メカニズム）',
      description: '用于系统规则、战斗机制、敌人机制与数值逻辑等不属于单一角色或阵容的问题。',
      tags: ['游戏机制', '系统规则', '数值逻辑'],
      url: 'https://chatgpt.com/g/g-p-6a8fd96ffc6c81918d2e5b97c6e86c4a/project'
    }
  ];

  const typeLabels = {
    beta_database: '测试服数据库', datamine: '数据挖掘', changelog_diff: '版本差异',
    endgame_rotation: '未来轮换', community_aggregator: '社区聚合', leak_news: '情报消息',
    beta_change_feed: '改动追踪', live_database: '正式服数据', datamine_database: '挖掘数据库',
    asset_database: '素材库', diff: '差异对比', live_and_pre_release_data: '正式/前瞻数据',
    beta_theorycraft: '前瞻计算', theorycraft: '理论计算', calculations: '计算工具', guides: '攻略',
    theorycraft_companion: '计算参考', pre_release_data: '预发布数据', community_database: '社区数据库',
    news: '新闻', team_builder: '组队工具', rumor_feed: '传闻线索', datamine_discussion: '挖掘讨论',
    quantitative_data: '量化数据', calculators: '计算器', multi_game_portal: '多游戏入口',
    update_feed: '更新订阅', beta_revision_feed: '版本订阅', historical_beta_database: '历史测试服数据'
  };

  const statusLabels = {
    active: '活跃', active_or_recently_active: '近期活跃', banned_or_unavailable: '不可用',
    stopped_or_not_recommended_for_new_data: '已停更', live_data_only_or_restricted: '仅正式服/受限'
  };

  const state = { view: 'official', game: 'all', query: '', queryRaw: '', sites: [] };
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  const normalize = (value) => String(value || '').toLocaleLowerCase('zh-CN');

  function restoreStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const game = params.get('game');
    state.view = ['intel', 'official', 'projects'].includes(view) ? view : 'official';
    state.game = game === 'all' || Object.hasOwn(games, game) ? game : 'all';
    state.queryRaw = params.get('q') || '';
    state.query = normalize(state.queryRaw.trim());
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    if (state.view === 'official') url.searchParams.delete('view');
    else url.searchParams.set('view', state.view);
    if (state.game === 'all') url.searchParams.delete('game');
    else url.searchParams.set('game', state.game);
    if (state.queryRaw) url.searchParams.set('q', state.queryRaw);
    else url.searchParams.delete('q');
    history.replaceState(history.state, '', url);
  }

  function syncControls() {
    $$('.view-switch').forEach((button) => {
      const active = button.dataset.view === state.view;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('.game-filter').forEach((button) => {
      button.classList.toggle('is-active', button.dataset.game === state.game);
    });
    const projectsMode = state.view === 'projects';
    const gameFilters = $('#gameFilters');
    if (gameFilters) gameFilters.hidden = projectsMode;
    $('.atlas-toolbar')?.classList.toggle('is-projects-view', projectsMode);
    const sourceSearch = $('#sourceSearch');
    sourceSearch.value = state.queryRaw;
    sourceSearch.placeholder = projectsMode ? '搜索 AI 分析助手…' : '搜索站点、用途或类型…';
    sourceSearch.setAttribute('aria-label', projectsMode ? '搜索 AI 分析助手' : '搜索资料来源');
  }

  function gameKeys(site) {
    return (site.games || []).map((name) => {
      if (name.includes('星穹铁道')) return '崩';
      if (name.includes('终末地')) return '终';
      if (name.includes('绝区零')) return '绝';
      if (name.includes('鸣潮')) return '鸣';
      if (name.includes('异环') || name.includes('Neverness')) return '异';
      return null;
    }).filter(Boolean);
  }

  function hostOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  }

  function gradeClass(grade) {
    if (String(grade).startsWith('A')) return 'grade-a';
    if (String(grade).startsWith('B')) return 'grade-b';
    if (String(grade).startsWith('C')) return 'grade-c';
    return 'grade-x';
  }

  function isArchived(site) {
    return site.status !== 'active';
  }

  function searchableSite(site) {
    return normalize([site.name, site.notes, ...(site.games || []), ...(site.best_for || []), ...(site.source_type || [])].join(' '));
  }

  function matches(site) {
    const gameMatch = state.game === 'all' || gameKeys(site).includes(state.game);
    const searchMatch = !state.query || searchableSite(site).includes(state.query);
    return gameMatch && searchMatch;
  }

  function renderIntelCard(site, archived = false) {
    const keys = [...new Set(gameKeys(site))].sort((a, b) => gameRank(a) - gameRank(b));
    const reliability = site.reliability || '—';
    const typeTags = (site.source_type || []).slice(0, 2).map((type) => `<span>${escapeHtml(typeLabels[type] || type.replaceAll('_', ' '))}</span>`).join('');
    const useTags = (site.best_for || []).slice(0, 3).map((item) => `<span>${escapeHtml(item)}</span>`).join('');
    const gameTags = keys.map((key) => `<span class="mini-game game-${key}"><i>${key}</i>${games[key].short}</span>`).join('');
    const caution = site.security_note ? `<details class="security-line"><summary>安全提醒</summary><p>${escapeHtml(site.security_note)}</p></details>` : '';
    const archivedClass = archived ? ' is-archived' : '';
    return `
      <article class="intel-card${archivedClass}" data-grade="${escapeHtml(reliability)}">
        <div class="intel-card-top">
          <div class="source-identity">
            <span class="source-monogram" aria-hidden="true">${escapeHtml(site.name.trim().slice(0, 1).toUpperCase())}</span>
            <div><h3>${escapeHtml(site.name)}</h3><a href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(hostOf(site.url))}</a></div>
          </div>
          <span class="grade ${gradeClass(reliability)}" title="可信度 ${escapeHtml(reliability)}">${escapeHtml(reliability)}</span>
        </div>
        <div class="mini-games">${gameTags || '<span class="mini-game">跨游戏</span>'}</div>
        <div class="source-types">${typeTags}</div>
        <p class="source-note">${escapeHtml(site.notes || '暂无说明')}</p>
        <div class="best-for"><small>适合查找</small><div>${useTags}</div></div>
        ${caution}
        <div class="intel-card-footer">
          <span class="source-state state-${escapeHtml(site.status)}"><i></i>${escapeHtml(statusLabels[site.status] || site.status)}</span>
          <span>PRIORITY ${String(site.priority || 99).padStart(2, '0')}</span>
          <a href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" aria-label="打开 ${escapeHtml(site.name)}">访问站点 <b aria-hidden="true">↗</b></a>
        </div>
      </article>`;
  }

  function renderIntel() {
    const active = state.sites.filter((site) => !isArchived(site) && matches(site));
    const archived = state.sites.filter((site) => isArchived(site) && matches(site));
    const compareSites = (a, b) => (gameRank(gameKeys(a)[0]) - gameRank(gameKeys(b)[0]))
      || ((a.priority || 99) - (b.priority || 99))
      || a.name.localeCompare(b.name, 'zh-CN');
    active.sort(compareSites);
    archived.sort(compareSites);
    $('#intelGrid').innerHTML = active.map((site) => renderIntelCard(site)).join('');
    $('#archiveGrid').innerHTML = archived.map((site) => renderIntelCard(site, true)).join('');
    $('#archiveVisibleCount').textContent = archived.length;
    $('#archiveBlock').hidden = archived.length === 0;
    $('#intelEmpty').hidden = active.length + archived.length > 0;
    const gameLabel = state.game === 'all' ? '全部游戏' : games[state.game].name;
    $('#sourceSummary').innerHTML = `<span><b>${active.length}</b> 个可用来源</span><span>${escapeHtml(gameLabel)}</span>${state.query ? `<button type="button" id="clearSearch">清除 “${escapeHtml(state.query)}” ×</button>` : ''}`;
    $('#clearSearch')?.addEventListener('click', () => {
      state.queryRaw = '';
      state.query = '';
      syncControls();
      syncUrl();
      render();
    });
  }

  function renderOfficial() {
    const groups = officialGroups.filter((group) => state.game === 'all' || group.key === state.game).map((group) => ({
      ...group,
      routes: group.routes.filter((route) => !state.query || normalize([games[group.key].name, ...route].join(' ')).includes(state.query))
    })).filter((group) => group.routes.length).sort((a, b) => gameRank(a.key) - gameRank(b.key));

    $('#officialGrid').innerHTML = groups.map((group) => `
      <article class="official-group game-${group.key}">
        <header><span class="official-mark">${group.key}</span><div><p>${escapeHtml(group.description)}</p><h3>${escapeHtml(games[group.key].name)}</h3></div><strong>${String(group.routes.length).padStart(2, '0')}</strong></header>
        <div class="official-routes">
          ${group.routes.map((route, index) => `<a href="${escapeHtml(route[1])}" target="_blank" rel="noopener noreferrer"><span class="route-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${escapeHtml(route[0])}</strong><small>${escapeHtml(route[2])}</small></span>${route[3] ? `<em>${escapeHtml(route[3])}</em>` : ''}<b aria-hidden="true">↗</b></a>`).join('')}
        </div>
      </article>`).join('');
    $('#officialEmpty').hidden = groups.length > 0;
  }

  function renderProjects() {
    const projects = projectAssistants.filter((project) => (
      !state.query || normalize([
        project.title,
        project.eyebrow,
        project.description,
        ...(project.tags || [])
      ].join(' ')).includes(state.query)
    ));

    $('#projectsGrid').innerHTML = projects.map((project) => `
      <article class="official-group ai-project-card ai-project-${escapeHtml(project.key)}">
        <header>
          <span class="official-mark">${escapeHtml(project.mark)}</span>
          <div>
            <p>${escapeHtml(project.eyebrow)}</p>
            <h3>${escapeHtml(project.title)}</h3>
          </div>
          <strong>${escapeHtml(project.number)}</strong>
        </header>
        <p class="ai-project-description">${escapeHtml(project.description)}</p>
        <div class="source-types ai-project-tags">
          ${(project.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}
        </div>
        <a class="ai-project-open" href="${escapeHtml(project.url)}" target="_blank" rel="noopener noreferrer">
          <span>进入 ChatGPT Project</span><b aria-hidden="true">↗</b>
        </a>
      </article>`).join('');
    $('#projectsEmpty').hidden = projects.length > 0;
  }

  function render() {
    $('#intelPanel').hidden = state.view !== 'intel';
    $('#officialPanel').hidden = state.view !== 'official';
    $('#projectsPanel').hidden = state.view !== 'projects';
    renderIntel();
    renderOfficial();
    renderProjects();
  }

  function bindControls() {
    $$('.view-switch').forEach((button) => button.addEventListener('click', () => {
      state.view = button.dataset.view;
      syncControls();
      syncUrl();
      render();
    }));

    $$('.game-filter').forEach((button) => button.addEventListener('click', () => {
      state.game = button.dataset.game;
      syncControls();
      syncUrl();
      render();
    }));

    $('#sourceSearch').addEventListener('input', (event) => {
      state.queryRaw = event.target.value.trim();
      state.query = normalize(state.queryRaw);
      syncUrl();
      render();
    });

    $('#methodButton').addEventListener('click', () => {
      const panel = $('#methodPanel');
      const open = panel.hidden;
      panel.hidden = !open;
      $('#methodButton').setAttribute('aria-expanded', String(open));
      $('#methodButton').textContent = open ? '收起核验方法' : '查看核验方法';
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        $('#sourceSearch').focus();
      }
      if (event.key === 'Escape' && document.activeElement === $('#sourceSearch')) {
        $('#sourceSearch').value = '';
        state.queryRaw = '';
        state.query = '';
        $('#sourceSearch').blur();
        syncUrl();
        render();
      }
    });

    window.addEventListener('popstate', () => {
      restoreStateFromUrl();
      syncControls();
      render();
    });
  }

  async function init() {
    restoreStateFromUrl();
    bindControls();
    syncControls();
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      state.sites = data.sites || [];
      $('#intelCount').textContent = state.sites.length;
      $('#activeCount').textContent = state.sites.filter((site) => site.status === 'active').length;
      if ($('#archiveCount')) $('#archiveCount').textContent = state.sites.filter(isArchived).length;
      render();
    } catch (error) {
      console.error('资料源载入失败', error);
      $('#intelGrid').innerHTML = '<div class="load-error"><strong>资料源暂时无法载入</strong><span>请通过 GUCC 本地服务器打开此页面后重试。</span></div>';
      $('#sourceSummary').textContent = 'SOURCE DATA UNAVAILABLE';
      $('#archiveBlock').hidden = true;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
