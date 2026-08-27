import {
  escapeHtml,
  renderLinks,
  renderMultilineText,
  safeExternalUrl
} from './ui.js';

export const STANDARD_RESOURCE_RELATIONS = [
  'official_reference',
  'guide',
  'research',
  'demo',
  'reference'
];

const RELATION_LABELS = {
  official_reference: '官方资料',
  guide: '攻略',
  research: '深度研究',
  demo: '实战演示',
  reference: '参考资料'
};

export function resourceRelationLabel(value) {
  const key = String(value || 'reference').trim() || 'reference';
  return RELATION_LABELS[key] || key;
}

export function createEmptyResourceLink(defaultRelationType = 'reference') {
  return {
    title: '',
    url: '',
    relation_type: defaultRelationType,
    source: '',
    note: ''
  };
}

function normalizeResourceLinks(links, defaultRelationType) {
  return Array.isArray(links) && links.length
    ? links
    : [createEmptyResourceLink(defaultRelationType)];
}

function renderRelationDatalist(id, suggestions) {
  const values = [...new Set([...STANDARD_RESOURCE_RELATIONS, ...(suggestions || [])].filter(Boolean))];
  return `<datalist id="${escapeHtml(id)}">${values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join('')}</datalist>`;
}

function renderResourceLinkRow(link, { prefix, defaultRelationType, relationListId }) {
  const value = link || createEmptyResourceLink(defaultRelationType);
  return `
    <div class="structured-row resource-edit-row" data-resource-link-row>
      <label>资源标题
        <input data-resource-link-field="title" value="${escapeHtml(value.title || value.resource_title || '')}" placeholder="官方说明 / 机制攻略 / 深度研究" />
      </label>
      <label>URL
        <input data-resource-link-field="url" type="url" inputmode="url" value="${escapeHtml(value.url || value.resource_url || '')}" placeholder="https://..." />
      </label>
      <label>关系类型
        <input data-resource-link-field="relation_type" list="${escapeHtml(relationListId)}" value="${escapeHtml(value.relation_type || defaultRelationType)}" placeholder="official_reference / guide / research / demo" />
      </label>
      <label>来源
        <input data-resource-link-field="source" value="${escapeHtml(value.source || '')}" placeholder="官网 / Wiki / 作者 / 平台" />
      </label>
      <label class="row-wide">备注
        <input data-resource-link-field="note" value="${escapeHtml(value.note || '')}" placeholder="可留空" />
      </label>
      <button type="button" class="ghost remove-row" data-remove-resource-link>删除</button>
    </div>`;
}

export function renderStructuredResourceEditor({
  links = [],
  prefix = 'resource',
  title = '资料链接',
  help = '按字段填写；保存时会同步到统一 Resources / Resource Relations。',
  defaultRelationType = 'reference',
  relationSuggestions = []
} = {}) {
  const relationListId = `${prefix}RelationTypes`;
  return `
    <section class="structured-editor wide" data-resource-editor data-resource-prefix="${escapeHtml(prefix)}" data-default-relation="${escapeHtml(defaultRelationType)}" aria-label="${escapeHtml(title)}">
      <div class="structured-head">
        <div>
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(help)}</span>
        </div>
        <button type="button" class="secondary add-row" data-add-resource-link>添加资源</button>
      </div>
      ${renderRelationDatalist(relationListId, relationSuggestions)}
      <div class="structured-list" data-resource-link-list>
        ${normalizeResourceLinks(links, defaultRelationType).map((link) => renderResourceLinkRow(link, {
          prefix,
          defaultRelationType,
          relationListId
        })).join('')}
      </div>
    </section>`;
}

function clearResourceRow(row, defaultRelationType) {
  row.querySelectorAll('[data-resource-link-field]').forEach((input) => {
    input.value = input.dataset.resourceLinkField === 'relation_type' ? defaultRelationType : '';
  });
}

export function bindStructuredResourceEditor(form) {
  form.querySelectorAll('[data-resource-editor]').forEach((editor) => {
    const list = editor.querySelector('[data-resource-link-list]');
    const defaultRelationType = editor.dataset.defaultRelation || 'reference';
    const relationListId = editor.querySelector('datalist')?.id || '';
    const prefix = editor.dataset.resourcePrefix || 'resource';

    editor.querySelector('[data-add-resource-link]')?.addEventListener('click', () => {
      list.insertAdjacentHTML('beforeend', renderResourceLinkRow(createEmptyResourceLink(defaultRelationType), {
        prefix,
        defaultRelationType,
        relationListId
      }));
    });

    list?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-resource-link]');
      if (!button) return;
      const row = button.closest('[data-resource-link-row]');
      if (!row) return;
      if (list.querySelectorAll('[data-resource-link-row]').length <= 1) {
        clearResourceRow(row, defaultRelationType);
      } else {
        row.remove();
      }
    });
  });
}

export function collectStructuredResourceLinks(form) {
  return [...form.querySelectorAll('[data-resource-link-row]')].map((row, index) => {
    const get = (field) => row.querySelector(`[data-resource-link-field="${field}"]`)?.value.trim() || '';
    const link = {
      title: get('title'),
      url: get('url'),
      relation_type: get('relation_type') || 'reference',
      source: get('source'),
      note: get('note')
    };
    const hasAnyValue = [link.title, link.url, link.source, link.note].some(Boolean);

    if (!hasAnyValue) return null;
    if (!link.url) throw new Error(`第 ${index + 1} 条资源需要填写 URL。`);
    if (!/^https?:\/\//i.test(link.url) || !safeExternalUrl(link.url)) {
      throw new Error(`第 ${index + 1} 条资源 URL 无效，请使用 http:// 或 https://。`);
    }
    return link;
  }).filter(Boolean);
}

export function renderResourceList(links) {
  if (!Array.isArray(links) || !links.length) {
    return '<div class="resource-empty">暂无关联资料。</div>';
  }

  return `<div class="resource-list">${links.map((link) => {
    const relationType = String(link.relation_type || 'reference').trim() || 'reference';
    const url = safeExternalUrl(link.url || link.resource_url);
    const source = String(link.source || '').trim();
    const title = link.title || link.resource_title || url || '未命名资源';
    return `
      <article class="resource-card" data-resource-relation="${escapeHtml(relationType)}">
        <div class="resource-card-head">
          <div class="resource-card-title">${escapeHtml(title)}</div>
          <div class="resource-card-meta">
            <span class="resource-relation-chip">${escapeHtml(resourceRelationLabel(relationType))} · ${escapeHtml(relationType)}</span>
            ${source ? `<span class="badge">${escapeHtml(source)}</span>` : ''}
          </div>
        </div>
        ${url ? renderLinks([{ ...link, title }]) : ''}
        ${url ? `<a class="resource-url" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>` : ''}
        ${String(link.note || '').trim() ? `<div class="resource-note">${renderMultilineText(link.note)}</div>` : ''}
      </article>`;
  }).join('')}</div>`;
}
