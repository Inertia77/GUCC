(() => {
  const currentScript = document.currentScript;
  const root = currentScript?.dataset.root || './';
  const normalizedRoot = root.endsWith('/') ? root : `${root}/`;
  const path = window.location.pathname.replace(/\/index\.html$/, '/');
  const isActive = (needle) => path.includes(needle);

  const links = [
    { key: 'portal', label: 'Portal', icon: '⌂', href: normalizedRoot, active: path.endsWith('/GUCC/') || path.endsWith('/') && !path.includes('/apps/') && !path.includes('/reference/') && !path.includes('/docs/') },
    { key: 'db', label: 'DB', icon: '◆', href: `${normalizedRoot}apps/command-center/`, active: isActive('/apps/command-center/') || isActive('/apps/gameup-command-center/') },
    { key: 'ws', label: 'Work', icon: '✦', href: `${normalizedRoot}apps/video-workspace/`, active: isActive('/apps/video-workspace/') },
    { key: 'cover', label: 'Cover', icon: '▣', href: `${normalizedRoot}apps/cover-generator/`, active: isActive('/apps/cover-generator/') },
    { key: 'prompt', label: 'Prompt', icon: '✎', href: `${normalizedRoot}reference/ai-prompts.html`, active: isActive('/reference/ai-prompts') },
    { key: 'library', label: 'Library', icon: '☰', href: `${normalizedRoot}reference/resource-library.html`, active: isActive('/reference/resource-library') || isActive('/reference/story-library') || isActive('/docs/') },
  ];

  const enhance = () => {
    document.body?.classList.add('gucc-enhanced');
    if (!document.body || document.querySelector('.gucc-shell-dock')) return;

    const dock = document.createElement('nav');
    dock.className = 'gucc-shell-dock';
    dock.setAttribute('aria-label', 'GUCC quick navigation');
    dock.innerHTML = links.map((item) => `
      <a class="gucc-shell-link${item.active ? ' is-active' : ''}" href="${item.href}">
        <b aria-hidden="true">${item.icon}</b><span>${item.label}</span>
      </a>
    `).join('');
    document.body.appendChild(dock);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance, { once: true });
  } else {
    enhance();
  }
})();
