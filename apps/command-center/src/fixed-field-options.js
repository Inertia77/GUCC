const FIXED_FIELD_OPTIONS = Object.freeze({
  characterResearchStatus: Object.freeze(['◯', '△', '✕', '対象外']),
  characterBuildStatus: Object.freeze(['◯', '△', '✕', '対象外']),
  partyStatus: Object.freeze(['待研究', 'OK']),
  partyHoldStatus: Object.freeze(['YES', 'NO'])
});

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getOptions(field) {
  const options = FIXED_FIELD_OPTIONS[field];
  if (!options) throw new Error(`未知固定字段：${field}`);
  return options;
}

export function renderFixedFieldOptions(field, value, {
  emptyLabel = ''
} = {}) {
  const options = getOptions(field);
  const current = String(value || '').trim();
  const isValidCurrent = options.includes(current);
  const selectedValue = isValidCurrent ? current : '';
  const rendered = [];

  if (emptyLabel) {
    rendered.push(`<option value=""${selectedValue ? '' : ' selected'}>${escapeHtml(emptyLabel)}</option>`);
  } else if (current && !isValidCurrent) {
    rendered.push(`<option value="" selected disabled>旧状态待核实，请选择新分类</option>`);
  } else if (!selectedValue) {
    rendered.push('<option value="" selected disabled>请选择</option>');
  }

  rendered.push(...options.map((option) => (
    `<option value="${escapeHtml(option)}"${option === selectedValue ? ' selected' : ''}>${escapeHtml(option)}</option>`
  )));
  return rendered.join('');
}

export function hydrateFixedFieldFilters(root = document) {
  root.querySelectorAll('select[data-fixed-field]').forEach((select) => {
    select.innerHTML = renderFixedFieldOptions(select.dataset.fixedField, select.value, {
      emptyLabel: select.dataset.emptyLabel || ''
    });
  });
}

export const isCanonicalCharacterStatus = (value) => FIXED_FIELD_OPTIONS.characterResearchStatus.includes(value);
export const displayCharacterStatus = (value) => isCanonicalCharacterStatus(value) ? value : '待核实';

export { FIXED_FIELD_OPTIONS };
