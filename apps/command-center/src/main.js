import { API } from './api.js';
import { isLoggedIn, signIn, signOut, signUp } from './auth.js';
import { getConfigState } from './config-state.js';
import { initCharacters, searchCharacters } from './features/characters-v3.js';
import { initParties, searchParties } from './features/parties-v3.js';
import { initResources } from './features/resources-v2.js';
import { initVersions, searchVersions } from './features/versions-v3.js';
import { $, $$, closeActiveDrawer, log, setHidden, withBusy } from './ui-v3.js';
import { getSavedTab, saveTab } from './ux-state-v1.js';
import { hydrateFixedFieldFilters } from './fixed-field-options-v1.js';

const loadedTabs = new Set();
let featuresReady = false;

async function ensureTabLoaded(tab) {
  if (!featuresReady || !isLoggedIn() || loadedTabs.has(tab)) return;
  const loaders = {
    characters: searchCharacters,
    parties: searchParties,
    versions: searchVersions
  };
  const load = loaders[tab];
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
  $('#signupBtn').disabled = !config.ready;
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

  $('#signupBtn').addEventListener('click', async () => {
    await withBusy($('#signupBtn'), '注册中...', async () => {
      try {
        await signUp($('#emailInput').value.trim(), $('#passwordInput').value);
        log($('#loginLog'), '注册请求已发送。如果启用了邮箱确认，请先确认邮件；之后还要在 app_users 中登记该用户。');
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
        characters: await API.searchCharacters({ keyword: '', limit: 3 })
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
  initTabs();
  initAuth();
  initDashboard();
  initCharacters();
  initParties();
  initVersions();
  initResources();
  featuresReady = true;
  if (syncView()) void ensureTabLoaded($('.tabs [role="tab"].active')?.dataset.tab);
});
