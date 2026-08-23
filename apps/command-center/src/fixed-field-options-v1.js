const FIXED_FIELD_OPTIONS = Object.freeze({
  characterResearchStatus: Object.freeze(['待研究', '查攻略', 'OK']),
  characterBuildStatus: Object.freeze(['待养成', 'DONE', 'NOT']),
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
    rendered.push(`<option value="" selected disabled>旧值「${escapeHtml(current)}」不符合当前规则，请重新选择</option>`);
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

export { FIXED_FIELD_OPTIONS };
