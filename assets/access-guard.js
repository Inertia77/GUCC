(() => {
  const ACCESS_HASH = 'fa730fc17620bb57e6f247329e9aff57d22eab704420c047eddebde8a00cf5a3';
  const STORAGE_KEY = 'gucc_access_hash_v2';
  const LEGACY_KEYS = ['gucc_portal_access_v1'];
  const script = document.currentScript;
  const rootHref = new URL(script?.dataset.root || './', window.location.href).href;

  function storageGet(storage, key) {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  function storageSet(storage, key, value) {
    try {
      storage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  function storageRemove(storage, key) {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be unavailable in strict privacy modes.
    }
  }

  function readStoredHash() {
    const keys = [STORAGE_KEY, ...LEGACY_KEYS];
    for (const storage of [localStorage, sessionStorage]) {
      for (const key of keys) {
        const value = storageGet(storage, key);
        if (value === ACCESS_HASH) {
          if (key !== STORAGE_KEY) storageSet(localStorage, STORAGE_KEY, value);
          return value;
        }
      }
    }
    return '';
  }

  function hasAccess() {
    return readStoredHash() === ACCESS_HASH;
  }

  function writeAccess(hash) {
    if (!storageSet(localStorage, STORAGE_KEY, hash)) {
      storageSet(sessionStorage, STORAGE_KEY, hash);
    }
  }

  function clearAccess() {
    for (const storage of [localStorage, sessionStorage]) {
      storageRemove(storage, STORAGE_KEY);
      LEGACY_KEYS.forEach((key) => storageRemove(storage, key));
    }
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function verifyAndStore(passcode) {
    const digest = await sha256(String(passcode || '').trim());
    if (digest !== ACCESS_HASH) return false;
    writeAccess(digest);
    return true;
  }

  function currentRedirectValue() {
    const root = new URL(rootHref);
    const current = new URL(window.location.href);
    if (current.origin === root.origin && current.pathname.startsWith(root.pathname)) {
      const relative = current.href.slice(root.href.length);
      return relative || './';
    }
    return `${current.pathname}${current.search}${current.hash}`;
  }

  function portalUrlWithRedirect() {
    const url = new URL(rootHref);
    const redirect = currentRedirectValue();
    if (redirect && redirect !== './') url.searchParams.set('redirect', redirect);
    return url.href;
  }

  function redirectTarget() {
    const raw = new URLSearchParams(window.location.search).get('redirect');
    if (!raw) return '';
    const root = new URL(rootHref);
    const target = new URL(raw, root);
    if (target.origin !== root.origin || !target.pathname.startsWith(root.pathname)) return '';
    return target.href;
  }

  function guardPage() {
    if (hasAccess()) return true;
    window.location.replace(portalUrlWithRedirect());
    return false;
  }

  function bootstrapGlobalShell() {
    if (document.querySelector('script[data-gucc-shell-bootstrap]')) return;
    const shell = document.createElement('script');
    shell.src = new URL('assets/gucc-shell.js?v=10', rootHref).href;
    shell.dataset.root = rootHref;
    shell.dataset.guccShellBootstrap = 'true';
    document.head.appendChild(shell);
  }

  function bootstrapCreatorPipeline() {
    const pathname = window.location.pathname;
    const eligible = pathname.includes('/apps/video-workspace/') || pathname.includes('/apps/publishing-console/');
    if (!eligible) return;

    if (!document.querySelector('script[data-gucc-creator-pipeline]')) {
      const bridge = document.createElement('script');
      bridge.type = 'module';
      bridge.src = new URL('assets/creator-pipeline-bridge.mjs?v=3', rootHref).href;
      bridge.dataset.guccCreatorPipeline = 'true';
      document.head.appendChild(bridge);
    }

    if (!document.querySelector('script[data-gucc-creator-pipeline-ux]')) {
      const ux = document.createElement('script');
      ux.type = 'module';
      ux.src = new URL('assets/creator-pipeline-ux.mjs?v=1', rootHref).href;
      ux.dataset.guccCreatorPipelineUx = 'true';
      document.head.appendChild(ux);
    }

    const isStudio = pathname.includes('/apps/video-workspace/') && !pathname.includes('/production-system/');
    if (isStudio && !document.querySelector('script[data-gucc-studio-workspace-identity]')) {
      const identity = document.createElement('script');
      identity.type = 'module';
      identity.src = new URL('assets/studio-workspace-identity.mjs?v=1', rootHref).href;
      identity.dataset.guccStudioWorkspaceIdentity = 'true';
      document.head.appendChild(identity);
    }
  }

  window.GuccAccess = {
    hasAccess,
    verifyAndStore,
    clearAccess,
    redirectTarget,
    guardPage
  };

  const guardEnabled = script?.dataset.guard === 'true';
  const mayRender = guardEnabled ? guardPage() : true;
  if (mayRender) {
    bootstrapGlobalShell();
    bootstrapCreatorPipeline();
  }
})();