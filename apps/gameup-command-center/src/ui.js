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
  if (typeof value === 'string') el.textContent = value;
  else el.textContent = JSON.stringify(value, null, 2);
}

export function setHidden(el, hidden) {
  if (!el) return;
  el.classList.toggle('hidden', Boolean(hidden));
}

export function readForm(formEl) {
  const data = {};
  formEl.querySelectorAll('[name]').forEach(input => {
    data[input.name] = input.value.trim();
  });
  return data;
}

export function renderMeta(items) {
  return `<div class="meta">${items.filter(Boolean).map(x => `<span class="badge">${escapeHtml(x)}</span>`).join('')}</div>`;
}

export function renderLinks(links) {
  if (!Array.isArray(links) || !links.length) return '';
  return `<div class="meta">${links.map(l => {
    const url = l.url || l.resource_url;
    const title = l.title || l.resource_title || url;
    if (!url) return '';
    return `<a class="link-btn" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">🔗 ${escapeHtml(title)}</a>`;
  }).join('')}</div>`;
}

export function jsonTextareaValue(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

export function parseLooseJson(text, fallback) {
  const raw = String(text || '').trim();
  if (!raw) return fallback;
  try { return JSON.parse(raw); }
  catch (e) { throw new Error(`JSON 格式错误：${e.message}`); }
}
