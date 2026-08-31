import { API } from './api.js';
import { isLoggedIn, signIn, signOut } from './auth.js';
import { getConfigState } from './config-state.js';
import { initCharacters, searchCharacters } from './features/characters.js';
import { initParties, searchParties } from './features/parties.js';
import { initMechanisms, searchMechanisms } from './features/mechanisms.js';
import { initResources } from './features/resources.js';
import { initVersions, searchVersions } from './features/versions.js';
import {
  getSelectedGameScope,
  initGameHub,
  refreshGameHub,
  resetGameHub
} from './features/game-hub.js';
import { $, $$, closeActiveDrawer, log, setHidden, withBusy } from './ui.js';
import { getSavedTab, saveTab } from './ux-state.js';
import { hydrateFixedFieldFilters } from './fixed-field-options.js';

const FINAL_STYLE_SHEETS = [
  ['gucc-game-themes-final', '../styles/game-themes.css?v=7'],
  ['gucc-game-os-final', '../styles/game-os.css?v=1']
];
const TAB_LOADERS = {
  characters: searchCharacters,
  parties: searchParties,
  mechanisms: searchMechanisms,
  versions: searchVersions
};
const GAME_FILTERS = ['#charGame', '#partyGame', '#mechanismGame', '#versionGame'];

function ensureFinalStyleSheets() {
  FINAL_STYLE_SHEETS.forEach(([id, relativePath]) => {
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = new URL(relativePath, import.meta.url).href;
    document.head.appendChild(link);
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

function setGameFilters(gameCode) {
  GAME_FILTERS.forEach((selector) => {
    const select = $(selector);
    if (!select) return;
    const nextValue = [...select.options].some((option) => option.value === gameCode) ? gameCode : '';
    select.value = nextValue;
    const custom = select.closest('[data-game-filter]')?.querySelector('input');
    if (custom) {
      custom.hidden = true;
      custom.disabled = true;
      if (nextValue !== '__custom') custom.value = '';
    }
  });
}

async function applyGlobalGameScope(gameCode, { reload = true } = {}) {
  setGameFilters(gameCode || '');
  if (!reload || !featuresReady || !isLoggedIn()) return;
  const activeTab = $('.tabs [role="tab"].active')?.dataset.tab;
  const load = TAB_LOADERS[activeTab];
  if (!load) return;
  loadedTabs.add(activeTab);
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
        await applyGlobalGameScope(getSelectedGameScope(), { reload: false });
        void refreshGameHub({ force: true });
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
      resetGameHub();
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
  initGameHub({ onSelect: (gameCode) => applyGlobalGameScope(gameCode) });
  applyGlobalGameScope(getSelectedGameScope(), { reload: false });
  initTabs();
  initAuth();
  initDashboard();
  initCharacters();
  initParties();
  initVersions();
  initResources();
  featuresReady = true;

  if (syncView()) {
    void refreshGameHub({ force: true });
    void ensureTabLoaded($('.tabs [role="tab"].active')?.dataset.tab);
  }
});
