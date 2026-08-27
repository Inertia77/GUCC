const STORAGE_KEY = 'gucc-command-center-ux-v1';

function readState() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeState(next) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // State persistence is an enhancement; the tools still work without storage.
  }
}

function updateUrl(values) {
  const url = new URL(window.location.href);
  Object.entries(values).forEach(([key, value]) => {
    const normalized = String(value || '').trim();
    if (normalized) url.searchParams.set(key, normalized);
    else url.searchParams.delete(key);
  });
  history.replaceState(history.state, '', url);
}

function selectHasValue(input, value) {
  return [...(input?.options || [])].some((option) => option.value === value);
}

export function getSavedTab(fallback = 'characters') {
  const fromUrl = new URLSearchParams(window.location.search).get('tab');
  return fromUrl || readState().tab || fallback;
}

export function saveTab(tab) {
  const state = readState();
  state.tab = tab;
  writeState(state);
  updateUrl({ tab: tab === 'characters' ? '' : tab });
}

export function applyPendingFilterValue(input) {
  if (!input || input.tagName !== 'SELECT') return;
  const pending = input.dataset.pendingPersistentValue;
  if (pending == null) return;
  if (selectHasValue(input, pending)) input.value = pending;
  delete input.dataset.pendingPersistentValue;
}

export function bindPersistentFilters(scope, fields) {
  const state = readState();
  const storedFilters = state.filters?.[scope] || {};
  const params = new URLSearchParams(window.location.search);

  Object.entries(fields).forEach(([selector, param]) => {
    const input = document.querySelector(selector);
    if (!input) return;
    const restored = params.has(param) ? params.get(param) : storedFilters[selector];
    if (restored != null) {
      if (input.tagName === 'SELECT' && !selectHasValue(input, restored)) {
        input.dataset.pendingPersistentValue = restored;
      } else {
        input.value = restored;
      }
    }

    const persist = () => {
      delete input.dataset.pendingPersistentValue;
      const next = readState();
      next.filters = next.filters || {};
      next.filters[scope] = next.filters[scope] || {};
      next.filters[scope][selector] = input.value;
      writeState(next);
      updateUrl({ [param]: input.value });
    };
    input.addEventListener('change', persist);
    input.addEventListener('search', persist);
  });
}

export function persistFilters(scope, fields) {
  const state = readState();
  state.filters = state.filters || {};
  state.filters[scope] = state.filters[scope] || {};
  const urlValues = {};

  Object.entries(fields).forEach(([selector, param]) => {
    const value = document.querySelector(selector)?.value || '';
    state.filters[scope][selector] = value;
    urlValues[param] = value;
  });
  writeState(state);
  updateUrl(urlValues);
}
