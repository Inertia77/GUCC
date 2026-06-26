import { API } from './api.js';
import { isLoggedIn, signIn, signOut, signUp } from './auth.js';
import { getConfigState } from './config-state.js';
import { initCharacters } from './features/characters.js';
import { initParties } from './features/parties.js';
import { initResources } from './features/resources.js';
import { initVersions } from './features/versions.js';
import { $, $$, closeActiveDrawer, log, setHidden, withBusy } from './ui.js';

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
}

function initTabs() {
  $$('.tabs button').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = $(`#${button.dataset.tab}`);
      if (!panel) return;
      closeActiveDrawer();
      $$('.tabs button').forEach((item) => item.classList.remove('active'));
      $$('.tab-panel').forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      panel.classList.add('active');
    });
  });
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
  syncView();
});
