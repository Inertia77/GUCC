const CUSTOM_GAME_VALUE = '__custom';

function getElement(selector) {
  return document.querySelector(selector);
}

export function bindGameFilter(selectSelector, customInputSelector) {
  const select = getElement(selectSelector);
  const customInput = getElement(customInputSelector);
  if (!select || !customInput) return;

  const gameFilter = select.closest('[data-game-filter]');
  const sync = ({ clearCustom = false, focus = false } = {}) => {
    const isCustom = select.value === CUSTOM_GAME_VALUE;
    if (clearCustom && !isCustom && customInput.value) {
      customInput.value = '';
      customInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    customInput.hidden = !isCustom;
    customInput.disabled = !isCustom;
    gameFilter?.classList.toggle('is-custom', isCustom);
    if (isCustom && focus) customInput.focus();
  };

  select.addEventListener('change', () => sync({ clearCustom: true, focus: true }));
  sync();
}

export function readGameFilter(selectSelector, customInputSelector) {
  const select = getElement(selectSelector);
  const customInput = getElement(customInputSelector);
  if (!select) return '';
  return select.value === CUSTOM_GAME_VALUE
    ? String(customInput?.value || '').trim()
    : String(select.value || '').trim();
}

export function bindSelectAutoSearch(selectSelectors, task) {
  selectSelectors.forEach((selector) => {
    const select = getElement(selector);
    if (!select) return;
    select.addEventListener('change', () => {
      if (select.value === CUSTOM_GAME_VALUE) return;
      task();
    });
  });
}

export function bindClearFilters(buttonSelector, fieldSelectors, task) {
  const button = getElement(buttonSelector);
  if (!button) return;

  button.addEventListener('click', () => {
    fieldSelectors.forEach((selector) => {
      const field = getElement(selector);
      if (!field) return;
      field.value = '';
      if (field.closest('[data-game-filter]') && field.tagName === 'INPUT') {
        field.hidden = true;
        field.disabled = true;
        field.closest('[data-game-filter]').classList.remove('is-custom');
      }
    });
    task();
  });
}

function normalizeStatus(value) {
  return String(value || '')
    .trim()
    .replace(/^\d+\s*[-_.：:]\s*/, '')
    .toUpperCase();
}

export function matchesStatus(value, selectedValue) {
  const selected = normalizeStatus(selectedValue);
  return !selected || normalizeStatus(value) === selected;
}
