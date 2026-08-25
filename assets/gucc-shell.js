(() => {
  const currentScript = document.currentScript;
  const rootValue = currentScript?.dataset.root || './';
  const rootUrl = new URL(rootValue, window.location.href);
  const normalizedRoot = rootUrl.href.endsWith('/') ? rootUrl.href : `${rootUrl.href}/`;
  const path = window.location.pathname.replace(/\/index\.html$/, '/');
  const isActive = (needle) => path.includes(needle);

  const ensureStyles = () => {
    if (document.querySelector('link[data-gucc-shell-nav-v2]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${normalizedRoot}assets/gucc-shell-nav-v2.css?v=1`;
    link.dataset.guccShellNavV2 = 'true';
    document.head.appendChild(link);
  };

  const childRoutes = {
    workspace: {
      icon: 'WS', label: 'WorkSpace', note: '视频项目与策划',
      href: `${normalizedRoot}apps/video-workspace/`,
      active: isActive('/apps/video-workspace/')
    },
    cover: {
      icon: 'CG', label: '封面', note: 'Cover Generator',
      href: `${normalizedRoot}apps/cover-generator/`,
      active: isActive('/apps/cover-generator/')
    },
    publish: {
      icon: 'PUB', label: '发布', note: '发布与复盘',
      href: `${normalizedRoot}apps/publishing-console/`,
      active: isActive('/apps/publishing-console/')
    },
    prompt: {
      icon: 'AI', label: 'AI Prompt', note: '常用提示词',
      href: `${normalizedRoot}reference/ai-prompts.html`,
      active: isActive('/reference/ai-prompts')
    },
    story: {
      icon: 'ST', label: '剧情库', note: 'Story Library',
      href: `${normalizedRoot}reference/story-library.html`,
      active: isActive('/reference/story-library')
    },
    resource: {
      icon: 'LIB', label: '资料库', note: 'Wiki 与研究入口',
      href: `${normalizedRoot}reference/resource-library.html`,
      active: isActive('/reference/resource-library')
    },
    query: {
      icon: 'SQL', label: '查询手册', note: '低频维护资料',
      href: `${normalizedRoot}reference/query-guides/query-manual.md`,
      active: isActive('/reference/query-guides/')
    },
    schema: {
      icon: 'DBS', label: '数据结构', note: 'Schema 说明',
      href: `${normalizedRoot}data/schema.md`,
      active: isActive('/data/schema')
    },
    setup: {
      icon: 'SYS', label: '系统指南', note: '部署与维护',
      href: `${normalizedRoot}docs/supabase-setup.html`,
      active: isActive('/docs/supabase-setup')
    }
  };

  const groups = {
    create: {
      title: '创作工具',
      hint: '写 · 做 · 发',
      items: [childRoutes.workspace, childRoutes.cover, childRoutes.publish]
    },
    library: {
      title: '资料与研究',
      hint: 'Prompt · 剧情 · 资料',
      items: [childRoutes.prompt, childRoutes.story, childRoutes.resource]
    },
    more: {
      title: '系统与维护',
      hint: '低频入口',
      items: [childRoutes.query, childRoutes.schema, childRoutes.setup]
    }
  };

  const homeActive = path.endsWith('/GUCC/') || (
    path.endsWith('/') &&
    !path.includes('/apps/') &&
    !path.includes('/reference/') &&
    !path.includes('/docs/') &&
    !path.includes('/data/')
  );
  const dbActive = isActive('/apps/command-center/') || isActive('/apps/gameup-command-center/');

  const navItems = [
    { type: 'link', key: 'home', label: '首页', icon: '⌂', href: normalizedRoot, active: homeActive },
    { type: 'link', key: 'db', label: 'DB', icon: 'DB', href: `${normalizedRoot}apps/command-center/`, active: dbActive },
    { type: 'group', key: 'create', label: '创作', icon: 'OPS', active: groups.create.items.some((item) => item.active) },
    { type: 'group', key: 'library', label: '资料', icon: 'LIB', active: groups.library.items.some((item) => item.active) },
    { type: 'group', key: 'more', label: '更多', icon: '•••', active: groups.more.items.some((item) => item.active) }
  ];

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const normalizeDbPresentation = () => {
    if (!dbActive) return;
    document.title = 'GUCC DB';
    document.querySelectorAll('.topbar h1').forEach((heading) => {
      if (heading.textContent.trim() === 'GameUp Command Center') heading.textContent = 'GUCC DB';
    });
  };

  const enhance = () => {
    if (!document.body) return;
    ensureStyles();
    document.body.classList.add('gucc-enhanced');
    normalizeDbPresentation();
    if (document.querySelector('.gucc-shell-dock')) return;

    const dock = document.createElement('nav');
    dock.className = 'gucc-shell-dock';
    dock.setAttribute('aria-label', 'GUCC 全局导航');

    dock.innerHTML = navItems.map((item) => {
      if (item.type === 'link') {
        return `
          <a class="gucc-shell-link${item.active ? ' is-active' : ''}" href="${item.href}" title="${escapeHtml(item.label)}"${item.active ? ' aria-current="page"' : ''}>
            <b aria-hidden="true">${escapeHtml(item.icon)}</b><span>${escapeHtml(item.label)}</span>
          </a>`;
      }
      return `
        <button class="gucc-shell-trigger${item.active ? ' is-active' : ''}" type="button" data-shell-menu="${item.key}" aria-haspopup="true" aria-expanded="false" aria-controls="guccShellMenu">
          <b aria-hidden="true">${escapeHtml(item.icon)}</b><span>${escapeHtml(item.label)}</span>
        </button>`;
    }).join('');

    const menu = document.createElement('div');
    menu.id = 'guccShellMenu';
    menu.className = 'gucc-shell-menu';
    menu.hidden = true;
    dock.appendChild(menu);
    document.body.appendChild(dock);

    let openKey = '';

    const closeMenu = () => {
      openKey = '';
      menu.hidden = true;
      dock.querySelectorAll('.gucc-shell-trigger').forEach((trigger) => trigger.setAttribute('aria-expanded', 'false'));
    };

    const openMenu = (key, trigger) => {
      const group = groups[key];
      if (!group) return;
      if (openKey === key && !menu.hidden) {
        closeMenu();
        return;
      }
      openKey = key;
      menu.innerHTML = `
        <div class="gucc-shell-menu-head">
          <strong>${escapeHtml(group.title)}</strong>
          <span>${escapeHtml(group.hint)}</span>
        </div>
        <div class="gucc-shell-menu-grid">
          ${group.items.map((item) => `
            <a class="gucc-shell-menu-item${item.active ? ' is-active' : ''}" href="${item.href}"${item.active ? ' aria-current="page"' : ''}>
              <b aria-hidden="true">${escapeHtml(item.icon)}</b>
              <span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.note)}</small></span>
            </a>`).join('')}
        </div>`;
      menu.hidden = false;
      dock.querySelectorAll('.gucc-shell-trigger').forEach((button) => button.setAttribute('aria-expanded', String(button === trigger)));
    };

    dock.addEventListener('click', (event) => {
      const trigger = event.target.closest('.gucc-shell-trigger');
      if (!trigger) return;
      openMenu(trigger.dataset.shellMenu, trigger);
    });

    document.addEventListener('click', (event) => {
      if (!dock.contains(event.target)) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', closeMenu, { passive: true });
  };

  ensureStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance, { once: true });
  } else {
    enhance();
  }
})();
