import { API } from './api.js';
import { isLoggedIn, signIn, signOut } from './auth.js';
import { getConfigState } from './config-state.js';
import { initCharacters, searchCharacters } from './features/characters.js';
import { initParties, searchParties } from './features/parties.js';
import { initMechanisms, searchMechanisms } from './features/mechanisms.js';
import { initResources } from './features/resources.js';
import { initVersions, searchVersions } from './features/versions.js';
import { $, $$, closeActiveDrawer, log, setHidden, withBusy } from './ui.js';
import { getSavedTab, saveTab } from './ux-state.js';
import { hydrateFixedFieldFilters } from './fixed-field-options.js';

const FINAL_STYLE_SHEETS = [
  ['gucc-game-themes-final', '../styles/game-themes.css?v=8'],
  ['gucc-search-ux-final', '../styles/game-os.css?v=2']
];

const TAB_LOADERS = {
  characters: searchCharacters,
  parties: searchParties,
  mechanisms: searchMechanisms,
  versions: searchVersions
};

function ensureFinalStyleSheets({ reorder = false } = {}) {
  FINAL_STYLE_SHEETS.forEach(([id, relativePath]) => {
    let link = document.getElementById(id);
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = new URL(relativePath, import.meta.url).href;
      document.head.appendChild(link);
      return;
    }
    if (reorder) document.head.appendChild(link);
  });
}

ensureFinalStyleSheets();

const loadedTabs = new Set();
let featuresReady = false;

async function ensureTabLoaded(tab) {
  if (!featuresReady || !isLoggedIn() || loadedTabs.has(tab)) return;
  const load = TAB_LOADERS[tab];
  if (!load) return;
  loadedTabs.add(tab);
  await load();
}

function syncView() {
  const config = getConfigState();
  const loggedIn = isLoggedIn();

  setHidden($('#loginView'), loggedIn);
  setHidden($('#mainView'), !loggedIn);
  setHidden($('#logoutBtn'), !loggedIn);
  $('#sessionStatus').textContent = loggedIn ? '已登录' : '未登录';
  $('#sessionStatus').className = loggedIn ? 'badge ok' : 'badge muted';
  log($('#configView'), config.publicConfig);

  const warning = $('#configWarning');
  warning.textContent = config.ready ? '' : `需要先配置：${config.issues.join('；')}`;
  setHidden(warning, config.ready);
  $('#loginBtn').disabled = !config.ready;
  return loggedIn;
}

function activateTab(button, { focus = false } = {}) {
  const panel = $(`#${button?.dataset.tab}`);
  if (!button || !panel) return;

  closeActiveDrawer();
  $$('.tabs [role="tab"]').forEach((item) => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', active ? 'true' : 'false');
    item.tabIndex = active ? 0 : -1;
  });
  $$('.tab-panel').forEach((item) => {
    const active = item === panel;
    item.classList.toggle('active', active);
    item.hidden = !active;
  });
  saveTab(button.dataset.tab);
  void ensureTabLoaded(button.dataset.tab);
  if (focus) button.focus();
}

function initTabs() {
  const buttons = $$('.tabs [role="tab"]');
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => activateTab(button));
    button.addEventListener('keydown', (event) => {
      let nextIndex = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = buttons.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      activateTab(buttons[nextIndex], { focus: true });
    });
  });

  const savedTab = getSavedTab();
  activateTab(buttons.find((button) => button.dataset.tab === savedTab) || buttons[0]);
}

function initAuth() {
  $('#signupBtn')?.remove();

  $('#loginView').addEventListener('submit', async (event) => {
    event.preventDefault();
    await withBusy($('#loginBtn'), '登录中...', async () => {
      try {
        await signIn($('#emailInput').value.trim(), $('#passwordInput').value);
        log($('#loginLog'), '登录成功。');
        $('#passwordInput').value = '';
        syncView();
        void ensureTabLoaded($('.tabs [role="tab"].active')?.dataset.tab);
      } catch (error) {
        log($('#loginLog'), error.message);
      }
    });
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await withBusy($('#logoutBtn'), '退出中...', async () => {
      await signOut();
      loadedTabs.clear();
      syncView();
    });
  });
}

function initDashboard() {
  $('#pingBtn').addEventListener('click', () => withBusy($('#pingBtn'), '连接中...', async () => {
    try {
      log($('#pingResult'), await API.ping());
    } catch (error) {
      log($('#pingResult'), error.message);
      syncView();
    }
  }));

  $('#runSmokeTestBtn').addEventListener('click', () => withBusy($('#runSmokeTestBtn'), '测试中...', async () => {
    try {
      log($('#smokeResult'), {
        ping: await API.ping(),
        characters: await API.searchCharacters({ keyword: '', limit: 3 }),
        mechanisms: await API.searchMechanisms({ keyword: '', limit: 3 })
      });
    } catch (error) {
      log($('#smokeResult'), error.message);
      syncView();
    }
  }));
}

document.addEventListener('DOMContentLoaded', () => {
  hydrateFixedFieldFilters();
  $('#drawerBackdrop')?.addEventListener('click', closeActiveDrawer);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeActiveDrawer();
  });

  initMechanisms();
  initTabs();
  initAuth();
  initDashboard();
  initCharacters();
  initParties();
  initVersions();
  initResources();

  // Some feature styles are injected during initialization. Keep the search-first
  // UX and game identity layers last so old global !important rules cannot win.
  ensureFinalStyleSheets({ reorder: true });
  featuresReady = true;

  if (syncView()) void ensureTabLoaded($('.tabs [role="tab"].active')?.dataset.tab);
});
