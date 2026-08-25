(() => {
  const currentScript = document.currentScript;
  const rootValue = currentScript?.dataset.root || './';
  const rootUrl = new URL(rootValue, window.location.href);
  const normalizedRoot = rootUrl.href.endsWith('/') ? rootUrl.href : `${rootUrl.href}/`;
  const path = window.location.pathname.replace(/\/index\.html$/, '/');
  const isActive = (needle) => path.includes(needle);

  const ensureStylesheet = (selector, href, dataKey) => {
    const desiredHref = new URL(href, normalizedRoot).href;
    const existing = document.querySelector(selector);
    if (existing) {
      if (existing.href !== desiredHref) existing.href = desiredHref;
      return existing;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = desiredHref;
    if (dataKey) link.dataset[dataKey] = 'true';
    document.head.appendChild(link);
    return link;
  };

  const ensureStyles = () => {
    ensureStylesheet(
      'link[data-gucc-shell-nav-v2]',
      'assets/gucc-shell-nav-v2.css?v=2',
      'guccShellNavV2'
    );
    ensureStylesheet(
      'link[data-gucc-uiux-v1]',
      'assets/gucc-uiux-v1.css?v=1',
      'guccUiuxV1'
    );
  };

  const ensureViewportFit = () => {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1, viewport-fit=cover';
      document.head.appendChild(meta);
      return;
    }
    if (!/viewport-fit\s*=/.test(meta.content || '')) {
      meta.content = `${meta.content || 'width=device-width, initial-scale=1'}, viewport-fit=cover`;
    }
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

  const applyPageClasses = () => {
    const body = document.body;
    if (!body) return;
    if (dbActive) body.classList.add('command-center-page');
    if (isActive('/apps/video-workspace/')) body.classList.add('workspace-page');
    if (isActive('/apps/cover-generator/')) body.classList.add('cover-generator-page');
    if (isActive('/apps/publishing-console/')) body.classList.add('publishing-console-page');
    if (isActive('/reference/ai-prompts')) body.classList.add('gucc-reference', 'prompt-page');
    if (isActive('/reference/story-library')) body.classList.add('gucc-reference', 'story-page');
    if (isActive('/reference/resource-library')) body.classList.add('gucc-reference', 'resource-page');
  };

  const normalizeDbPresentation = () => {
    if (!dbActive) return;
    document.title = 'GUCC DB';
    document.querySelectorAll('.topbar h1').forEach((heading) => {
      if (heading.textContent.trim() === 'GameUp Command Center') heading.textContent = 'GUCC DB';
    });
  };

  const enhanceCommandCenterFilters = () => {
    if (!dbActive) return;
    document.querySelectorAll('.filter-grid').forEach((grid, index) => {
      if (grid.classList.contains('filters-mobile-ready')) return;
      grid.classList.add('filters-mobile-ready');
      if (!grid.id) grid.id = `guccFilterGrid${index + 1}`;

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'secondary filter-mobile-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', grid.id);

      const keyword = grid.querySelector('.filter-keyword');
      if (keyword) keyword.insertAdjacentElement('afterend', toggle);
      else grid.prepend(toggle);

      const activeFilterCount = () => {
        let count = 0;
        grid.querySelectorAll('.game-filter select, .filter-select').forEach((field) => {
          if (field.value && field.value !== '__custom') count += 1;
        });
        const custom = grid.querySelector('.game-filter input:not([disabled])');
        if (custom?.value?.trim()) count += 1;
        return count;
      };

      const sync = () => {
        const expanded = grid.classList.contains('filters-expanded');
        const count = activeFilterCount();
        toggle.textContent = `${expanded ? '收起筛选' : '筛选'}${count ? ` · ${count}` : ''}`;
        toggle.setAttribute('aria-expanded', String(expanded));
      };

      toggle.addEventListener('click', () => {
        grid.classList.toggle('filters-expanded');
        sync();
      });

      grid.addEventListener('input', sync);
      grid.addEventListener('change', sync);
      grid.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button || button === toggle) return;
        if (button.classList.contains('filter-clear')) window.setTimeout(sync, 0);
        if (/^search/i.test(button.id || '') && window.matchMedia('(max-width: 760px)').matches) {
          grid.classList.remove('filters-expanded');
          window.setTimeout(sync, 0);
        }
      });
      sync();
    });
  };

  const isTextEntry = (target) => {
    if (!(target instanceof Element)) return false;
    if (target.matches('textarea, [contenteditable="true"]')) return true;
    if (!target.matches('input')) return false;
    const type = String(target.getAttribute('type') || 'text').toLowerCase();
    return !['button', 'checkbox', 'radio', 'range', 'file', 'color', 'submit', 'reset', 'image', 'hidden'].includes(type);
  };

  const bindKeyboardAwareNav = (closeMenu) => {
    if (document.documentElement.dataset.guccShellKeyboardBound === 'true') return;
    document.documentElement.dataset.guccShellKeyboardBound = 'true';

    const sync = () => {
      const mobile = window.matchMedia('(max-width: 900px)').matches;
      document.body?.classList.toggle('gucc-shell-keyboard', mobile && isTextEntry(document.activeElement));
    };

    document.addEventListener('focusin', (event) => {
      if (window.matchMedia('(max-width: 900px)').matches && isTextEntry(event.target)) {
        document.body?.classList.add('gucc-shell-keyboard');
        closeMenu();
      }
    });
    document.addEventListener('focusout', () => window.setTimeout(sync, 0));
    window.addEventListener('resize', sync, { passive: true });
    window.visualViewport?.addEventListener('resize', sync, { passive: true });
  };

  const enhance = () => {
    if (!document.body) return;
    ensureStyles();
    ensureViewportFit();
    document.body.classList.add('gucc-enhanced');
    applyPageClasses();
    normalizeDbPresentation();
    enhanceCommandCenterFilters();

    const existingDock = document.querySelector('.gucc-shell-dock');
    if (existingDock?.dataset.shellVersion === '3') return;
    if (existingDock) existingDock.remove();

    const dock = document.createElement('nav');
    dock.className = 'gucc-shell-dock';
    dock.dataset.shellVersion = '3';
    dock.setAttribute('aria-label', 'GUCC 全局导航');

    dock.innerHTML = navItems.map((item) => {
      if (item.type === 'link') {
        return `
          <a class="gucc-shell-link${item.active ? ' is-active' : ''}" href="${item.href}" title="${escapeHtml(item.label)}"${item.active ? ' aria-current="page"' : ''}>
            <b aria-hidden="true">${escapeHtml(item.icon)}</b><span>${escapeHtml(item.label)}</span>
          </a>`;
      }
      return `
        <a class="gucc-shell-trigger${item.active ? ' is-active' : ''}" href="#guccShellMenu" role="button" data-shell-menu="${item.key}" aria-haspopup="true" aria-expanded="false" aria-controls="guccShellMenu">
          <b aria-hidden="true">${escapeHtml(item.icon)}</b><span>${escapeHtml(item.label)}</span>
        </a>`;
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
      dock.querySelectorAll('.gucc-shell-trigger').forEach((item) => item.setAttribute('aria-expanded', String(item === trigger)));
    };

    dock.addEventListener('click', (event) => {
      const trigger = event.target.closest('.gucc-shell-trigger');
      if (!trigger) return;
      event.preventDefault();
      openMenu(trigger.dataset.shellMenu, trigger);
    });

    document.addEventListener('click', (event) => {
      if (!dock.contains(event.target)) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });

    window.addEventListener('resize', closeMenu, { passive: true });
    bindKeyboardAwareNav(closeMenu);
  };

  ensureStyles();
  ensureViewportFit();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance, { once: true });
  } else {
    enhance();
  }
})();
