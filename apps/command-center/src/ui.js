export const $ = (sel) => document.querySelector(sel);
export const $$ = (sel) => [...document.querySelectorAll(sel)];

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function log(el, value) {
  if (!el) return;
  el.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

export function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle('hidden', Boolean(hidden));
}

let activeDrawer = null;

export function openDrawer(editor) {
  if (!editor) return;
  if (activeDrawer && activeDrawer !== editor) {
    setHidden(activeDrawer, true);
  }
  activeDrawer = editor;
  setHidden(editor, false);
  setHidden($('#drawerBackdrop'), false);
  document.body.classList.add('editor-open');
  editor.scrollTop = 0;
  requestAnimationFrame(() => {
    editor.querySelector('[data-autofocus], input:not([type="hidden"]), textarea, select')?.focus({ preventScroll: true });
  });
}

export function closeDrawer(editor = activeDrawer) {
  if (!editor) return;
  setHidden(editor, true);
  if (activeDrawer === editor) activeDrawer = null;
  setHidden($('#drawerBackdrop'), true);
  document.body.classList.remove('editor-open');
}

export function closeActiveDrawer() {
  closeDrawer(activeDrawer);
}

export function readForm(formEl) {
  const data = {};
  formEl.querySelectorAll('[name]').forEach((input) => {
    data[input.name] = input.value.trim();
  });
  return data;
}

export function renderMeta(items) {
  return `<div class="meta">${items.filter(Boolean).map((item) => `<span class="badge">${escapeHtml(item)}</span>`).join('')}</div>`;
}

export function safeExternalUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value), window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function renderLinks(links) {
  if (!Array.isArray(links) || !links.length) return '';
  return `<div class="meta">${links.map((link) => {
    const url = safeExternalUrl(link.url || link.resource_url);
    if (!url) return '';
    const title = link.title || link.resource_title || url;
    return `<a class="link-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">↗ ${escapeHtml(title)}</a>`;
  }).join('')}</div>`;
}

export function parseLooseJson(text, fallback) {
  const raw = String(text || '').trim();
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`JSON 格式错误：${error.message}`);
  }
}

export function parseJsonArray(text) {
  const value = parseLooseJson(text, []);
  if (!Array.isArray(value)) throw new Error('JSON 必须是数组。');
  return value;
}

export function normalizeRows(value) {
  if (Array.isArray(value)) return value;
  return Array.isArray(value?.rows) ? value.rows : [];
}

export function renderListState(container, message, type = '') {
  container.innerHTML = `<div class="card state ${escapeHtml(type)}">${escapeHtml(message)}</div>`;
}

export function bindEnterSearch(container, button, busyText, task) {
  if (!container || !button) return;
  container.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing) return;
    if (!event.target?.matches?.('input, select')) return;
    event.preventDefault();
    if (button.disabled) return;
    withBusy(button, busyText, task);
  });
}

export async function withBusy(button, busyText, task) {
  const originalText = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = busyText;
  }
  try {
    return await task();
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}
