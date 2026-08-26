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
let activeDrawerContext = null;

export function openDrawer(editor) {
  if (!editor) return;
  if (activeDrawer && activeDrawer !== editor) {
    setHidden(activeDrawer, true);
  }
  activeDrawer = editor;
  activeDrawerContext = {
    opener: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };
  setHidden(editor, false);
  setHidden($('#drawerBackdrop'), false);
  document.body.classList.add('editor-open');
  editor.scrollTop = 0;
  requestAnimationFrame(() => {
    editor.querySelector('[data-autofocus], input:not([type="hidden"]), textarea, select')?.focus({ preventScroll: true });
  });
}

export function closeDrawer(editor = activeDrawer, { restoreFocus = true } = {}) {
  if (!editor) return;
  const context = activeDrawerContext;
  setHidden(editor, true);
  if (activeDrawer === editor) {
    activeDrawer = null;
    activeDrawerContext = null;
  }
  setHidden($('#drawerBackdrop'), true);
  document.body.classList.remove('editor-open');
  requestAnimationFrame(() => {
    if (context) window.scrollTo(context.scrollX, context.scrollY);
    if (restoreFocus && context?.opener?.isConnected) {
      context.opener.focus({ preventScroll: true });
    }
  });
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
  const badges = items.map((item) => {
    if (item && typeof item === 'object') {
      const value = item.value;
      if (!value) return '';
      const toneClass = item.tone === 'progress'
        ? ' status-highlight status-progress'
        : item.tone === 'state'
          ? ' status-highlight status-state'
          : '';
      return `<span class="badge${toneClass}">${escapeHtml(value)}</span>`;
    }
    return item ? `<span class="badge">${escapeHtml(item)}</span>` : '';
  }).join('');
  return `<div class="meta">${badges}</div>`;
}

export function renderCollapseButton(label = '卡片内容') {
  return `<button type="button" class="secondary collapse-toggle" data-card-toggle aria-expanded="true" aria-label="收起${escapeHtml(label)}">收起</button>`;
}

const COLLAPSE_STORAGE_KEY = 'gucc-command-center-collapse-v1';

function readCollapseState() {
  try {
    return JSON.parse(sessionStorage.getItem(COLLAPSE_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeCollapseState(state) {
  try {
    sessionStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Collapsing still works when storage is unavailable.
  }
}

function setCardCollapsed(card, collapsed) {
  const content = card?.querySelector('[data-card-content]');
  const button = card?.querySelector('[data-card-toggle]');
  if (!card || !content || !button) return;

  content.hidden = collapsed;
  card.classList.toggle('is-collapsed', collapsed);
  button.setAttribute('aria-expanded', String(!collapsed));
  button.setAttribute('aria-label', `${collapsed ? '展开' : '收起'}${card.querySelector('.item-title')?.textContent?.trim() || '卡片内容'}`);
  button.textContent = collapsed ? '展开' : '收起';
}

export function applySavedCardState(container, storageKey) {
  if (!container || !storageKey) return;
  const state = readCollapseState()[storageKey] || {};
  container.querySelectorAll('.item').forEach((card) => {
    const itemId = card.dataset.itemId;
    const collapsed = itemId && Object.hasOwn(state.items || {}, itemId)
      ? state.items[itemId]
      : Boolean(state.all);
    setCardCollapsed(card, collapsed);
  });
}

export function bindCollapsibleCards(container, storageKey = '') {
  if (!container) return;
  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-card-toggle]');
    if (!button) return;

    const card = button.closest('.item');
    const content = card?.querySelector('[data-card-content]');
    if (!card || !content) return;
    const collapsed = !content.hidden;
    setCardCollapsed(card, collapsed);
    if (storageKey && card.dataset.itemId) {
      const state = readCollapseState();
      state[storageKey] = state[storageKey] || { all: false, items: {} };
      state[storageKey].items = state[storageKey].items || {};
      state[storageKey].items[card.dataset.itemId] = collapsed;
      writeCollapseState(state);
    }
  });
}

export function bindCollapseAllControls(controls, container, storageKey = '') {
  if (!controls || !container) return;
  controls.querySelectorAll('[data-card-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const collapsed = button.dataset.cardAction === 'collapse';
      container.querySelectorAll('.item').forEach((card) => setCardCollapsed(card, collapsed));
      if (storageKey) {
        const state = readCollapseState();
        state[storageKey] = { all: collapsed, items: {} };
        writeCollapseState(state);
      }
    });
  });
}

const progressiveState = new WeakMap();

export function getVisibleResultCount(container) {
  return progressiveState.get(container)?.visible || 0;
}

export function renderProgressiveList(container, rows, renderItem, {
  pageSize = 24,
  visibleCount = 0,
  revealId = '',
  itemLabel = '条结果',
  afterRender = null
} = {}) {
  if (!container) return;
  const targetIndex = revealId
    ? rows.findIndex((row) => String(row.id) === String(revealId))
    : -1;
  let visible = Math.min(
    rows.length,
    Math.max(pageSize, visibleCount, targetIndex >= 0 ? targetIndex + 1 : 0)
  );

  container.innerHTML = rows.slice(0, visible).map(renderItem).join('');
  const footer = document.createElement('div');
  footer.className = 'list-progress';
  footer.dataset.listProgress = '';
  container.append(footer);

  const updateFooter = () => {
    const remaining = rows.length - visible;
    footer.innerHTML = `
      <span aria-live="polite">已显示 ${visible} / ${rows.length} ${escapeHtml(itemLabel)}</span>
      ${remaining > 0 ? `<button type="button" class="secondary" data-load-more>继续显示 ${Math.min(pageSize, remaining)} 条</button>` : ''}`;
    progressiveState.set(container, { visible, total: rows.length });
    afterRender?.();
  };

  footer.addEventListener('click', (event) => {
    const button = event.target.closest('[data-load-more]');
    if (!button) return;
    const nextVisible = Math.min(rows.length, visible + pageSize);
    footer.insertAdjacentHTML('beforebegin', rows.slice(visible, nextVisible).map(renderItem).join(''));
    visible = nextVisible;
    updateFooter();
  });

  updateFooter();
}

export function captureListContext(container, preferredId = '') {
  const cards = [...(container?.querySelectorAll('.item') || [])];
  const preferred = preferredId
    ? cards.find((card) => card.dataset.itemId === String(preferredId))
    : null;
  const anchor = preferred || cards.find((card) => card.getBoundingClientRect().bottom > 90) || cards[0];
  return {
    itemId: anchor?.dataset.itemId || '',
    top: anchor?.getBoundingClientRect().top ?? 0,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    visibleCount: getVisibleResultCount(container)
  };
}

export function restoreListContext(container, context, { focusId = '', highlight = false } = {}) {
  requestAnimationFrame(() => {
    const anchor = context?.itemId
      ? container?.querySelector(`.item[data-item-id="${CSS.escape(String(context.itemId))}"]`)
      : null;
    if (anchor && Number.isFinite(context?.top)) {
      window.scrollBy(0, anchor.getBoundingClientRect().top - context.top);
    } else if (context) {
      window.scrollTo(context.scrollX, context.scrollY);
    }

    const focusTarget = focusId
      ? container?.querySelector(`.item[data-item-id="${CSS.escape(String(focusId))}"]`)
      : anchor;
    if (focusTarget) {
      focusTarget.focus({ preventScroll: true });
      if (!isElementInViewport(focusTarget)) focusTarget.scrollIntoView({ block: 'nearest' });
      if (highlight) {
        focusTarget.classList.add('is-recently-updated');
        window.setTimeout(() => focusTarget.classList.remove('is-recently-updated'), 2200);
      }
    }
  });
}

function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= window.innerHeight;
}

export function showToast(message, type = 'success') {
  let toast = $('#uxToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'uxToast';
    toast.className = 'ux-toast';
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    document.body.append(toast);
  }
  toast.className = `ux-toast ${type}`;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 2400);
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

export function renderMultilineText(value) {
  const text = String(value ?? '');
  if (!text.trim()) return '';
  return `<div class="preserved-text">${escapeHtml(text)}</div>`;
}

function splitUrlTail(value) {
  let url = String(value || '');
  let tail = '';
  while (/[.,!?;:，。！？；：、)\]}>】）》」』]$/.test(url)) {
    tail = url.slice(-1) + tail;
    url = url.slice(0, -1);
  }
  return { url, tail };
}

export function renderRichText(value) {
  const text = String(value ?? '');
  if (!text.trim()) return '';

  const pattern = /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)/gi;
  let cursor = 0;
  let html = '';

  for (const match of text.matchAll(pattern)) {
    html += escapeHtml(text.slice(cursor, match.index));

    const isMarkdownLink = Boolean(match[2]);
    const normalized = isMarkdownLink
      ? { url: match[2], tail: '' }
      : splitUrlTail(match[3]);
    const safeUrl = safeExternalUrl(normalized.url);

    if (!safeUrl) {
      html += escapeHtml(match[0]);
    } else {
      const label = isMarkdownLink ? match[1] : normalized.url;
      html += `<a class="inline-link" href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}<span aria-hidden="true">↗</span></a>${escapeHtml(normalized.tail)}`;
    }
    cursor = match.index + match[0].length;
  }

  html += escapeHtml(text.slice(cursor));
  return `<div class="rich-text">${html}</div>`;
}

export function renderLinks(links, { highlightRelationType = '' } = {}) {
  if (!Array.isArray(links) || !links.length) return '';
  return `<div class="meta">${links.map((link) => {
    const url = safeExternalUrl(link.url || link.resource_url);
    if (!url) return '';
    const title = link.title || link.resource_title || url;
    const relationType = String(link.relation_type || '');
    const relationClass = relationType === 'chatgpt_research'
      ? 'chatgpt-research-link'
      : relationType === 'chatgpt_build'
        ? 'chatgpt-build-link'
        : '';
    const isHighlighted = highlightRelationType && relationType === highlightRelationType;
    const className = `link-btn${relationClass ? ` ${relationClass}` : isHighlighted ? ' primary-reference-link' : ''}`;
    return `<a class="${className}" data-relation-type="${escapeHtml(relationType)}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">↗ ${escapeHtml(title)}</a>`;
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
