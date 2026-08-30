const path = window.location.pathname;
const isProduction = path.includes('/apps/video-workspace/production-system/');
const isStudio = !isProduction && path.includes('/apps/video-workspace/');
const isPublish = path.includes('/apps/publishing-console/');

function injectStyles() {
  if (document.getElementById('guccCreatorPipelineUxStyles')) return;
  const style = document.createElement('style');
  style.id = 'guccCreatorPipelineUxStyles';
  style.textContent = `
    .gcb-integrated-host {
      position: relative;
      z-index: 14;
      min-width: 0;
    }

    .gcb-integrated-host:empty {
      display: none !important;
    }

    .gcb-integrated-host .gucc-creator-bridge.gcb-inline {
      position: relative !important;
      inset: auto !important;
      right: auto !important;
      bottom: auto !important;
      transform: none !important;
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
      padding: 10px 12px !important;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: auto auto;
      column-gap: 16px;
      row-gap: 3px;
      border-radius: 14px !important;
      z-index: 14 !important;
      box-shadow: 0 10px 28px rgba(0,0,0,.18) !important;
    }

    .gcb-integrated-host .gcb-inline > strong {
      grid-column: 1;
      grid-row: 1;
      min-width: 0;
      padding-right: 30px;
      font-size: 13px !important;
    }

    .gcb-integrated-host .gcb-inline .gcb-status {
      grid-column: 1;
      grid-row: 2;
      min-width: 0;
      margin-top: 2px;
      color: #aeb8cb;
    }

    .gcb-integrated-host .gcb-inline p {
      display: none !important;
    }

    .gcb-integrated-host .gcb-inline .gcb-row {
      grid-column: 2;
      grid-row: 1 / 3;
      align-self: center;
      justify-content: flex-end;
      margin: 0 !important;
      padding-right: 30px;
      flex-wrap: nowrap !important;
    }

    .gcb-integrated-host .gcb-inline .gcb-row > :is(button, a) {
      min-height: 38px;
      white-space: nowrap;
    }

    .gcb-integrated-host .gcb-inline .gcb-close {
      position: absolute;
      top: 6px;
      right: 6px;
      float: none !important;
      min-width: 30px;
      min-height: 30px;
      display: grid;
      place-items: center;
      padding: 0 !important;
    }

    body.workspace-page .gcb-studio-host {
      margin: 10px 0 12px;
    }

    body.production-system-page .gcb-production-host {
      margin: 10px clamp(12px, 2.5vw, 36px) 0;
    }

    body.publishing-console-page .gcb-publish-host {
      margin: 10px 0 0;
    }

    body.gucc-shell-keyboard .gcb-integrated-host {
      display: none !important;
    }

    @media (max-width: 760px) {
      .gcb-integrated-host .gucc-creator-bridge.gcb-inline {
        grid-template-columns: minmax(0, 1fr) !important;
        grid-template-rows: auto auto auto !important;
        gap: 3px !important;
        padding: 9px 9px 8px !important;
        border-radius: 12px !important;
      }

      .gcb-integrated-host .gcb-inline > strong {
        grid-column: 1;
        grid-row: 1;
        font-size: 12px !important;
      }

      .gcb-integrated-host .gcb-inline .gcb-status {
        grid-column: 1;
        grid-row: 2;
        max-width: calc(100% - 26px);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 10px !important;
      }

      .gcb-integrated-host .gcb-inline .gcb-row {
        grid-column: 1;
        grid-row: 3;
        width: 100%;
        max-width: 100%;
        justify-content: flex-start;
        gap: 6px !important;
        margin-top: 5px !important;
        padding: 0 0 1px !important;
        overflow-x: auto;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
      }

      .gcb-integrated-host .gcb-inline .gcb-row::-webkit-scrollbar {
        display: none;
      }

      .gcb-integrated-host .gcb-inline .gcb-row > :is(button, a) {
        flex: 0 0 auto;
        min-height: 42px;
        padding: 7px 10px !important;
        font-size: 11px !important;
      }

      body.production-system-page .gcb-production-host {
        margin: 8px 10px 0;
      }

      body.publishing-console-page .gcb-publish-host {
        margin-top: 7px;
      }
    }
  `;
  document.head.appendChild(style);
}

function ensureHost(anchor, className) {
  if (!anchor?.parentElement) return null;
  const existing = document.querySelector(`.${className}`);
  if (existing) return existing;
  const host = document.createElement('section');
  host.className = `gcb-integrated-host ${className}`;
  host.setAttribute('aria-label', 'GUCC 创作流程状态');
  host.setAttribute('aria-live', 'polite');
  anchor.insertAdjacentElement('afterend', host);
  return host;
}

function setTextIfChanged(element, desired) {
  if (element && element.textContent !== desired) element.textContent = desired;
}

function updateCopy() {
  if (isStudio) {
    const productionLink = document.querySelector('a[href="./production-system/"]');
    setTextIfChanged(productionLink, '正式制作 Production');
  }

  if (isPublish) {
    const importButton = document.getElementById('importWorkspaceButton');
    if (importButton) {
      setTextIfChanged(importButton, '兼容导入旧 JSON');
      const desiredTitle = '新流程优先从 Production 直接交接；此按钮保留给旧 WorkSpace / 历史 JSON。';
      if (importButton.title !== desiredTitle) importButton.title = desiredTitle;
    }
    const heroText = document.querySelector('.hero > div > p:last-child');
    setTextIfChanged(heroText, '优先接收 Production 的正式发布交接，自动拆分六平台字段、预检、执行与记录；旧 WorkSpace JSON 仅作为兼容入口。');
  }
}

function integratePanel() {
  const panel = document.getElementById('guccCreatorBridge');
  if (!panel || panel.classList.contains('gcb-inline')) return Boolean(panel);

  let host = null;
  if (isStudio) host = ensureHost(document.querySelector('.studio-header'), 'gcb-studio-host');
  if (isProduction) host = ensureHost(document.querySelector('.topbar'), 'gcb-production-host');
  if (isPublish) host = ensureHost(document.querySelector('.flow-nav'), 'gcb-publish-host');
  if (!host) return false;

  panel.classList.add('gcb-inline');
  const close = panel.querySelector('.gcb-close');
  if (close) close.title = '隐藏流程状态条，刷新页面后恢复';
  host.appendChild(panel);
  return true;
}

function init() {
  if (!isStudio && !isProduction && !isPublish) return;
  injectStyles();
  updateCopy();
  if (integratePanel()) return;

  const observer = new MutationObserver(() => {
    if (integratePanel()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 12000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
