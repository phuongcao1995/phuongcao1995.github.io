/* ==========================================================================
   NEXUS ERP — components.js
   Reusable UI building blocks: toasts, modals, confirm dialogs, forms with
   validation, action menus, list views (tables), tabs, KPI cards, SVG charts,
   the line-item document editor and printable document layouts.
   ========================================================================== */
'use strict';

/** Page renderers register themselves here: Pages.customers = (el, params) => {...} */
const Pages = {};

/* ---------- Toasts ---------- */
function showToast(message, type = 'success', timeout = 3600) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const icons = { success: 'check', error: 'x', warning: 'alert', info: 'info' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.setAttribute('role', type === 'error' ? 'alert' : 'status');
  t.innerHTML = `<span class="toast-ico">${icon(icons[type] || 'info', 16)}</span><span class="toast-msg">${esc(message)}</span><button class="toast-close" aria-label="Dismiss notification">${icon('x', 14)}</button>`;
  const remove = () => { t.classList.add('leaving'); setTimeout(() => t.remove(), 200); };
  t.querySelector('.toast-close').addEventListener('click', remove);
  root.appendChild(t);
  while (root.children.length > 4) root.firstElementChild.remove();
  setTimeout(remove, timeout);
}

/* ---------- Modal system (stacked, focus-trapped, Esc to close) ---------- */
const Modal = {
  stack: [],
  open({ title, body = '', footer = '', size = 'md', onClose, className = '' }) {
    const root = document.getElementById('modal-root');
    const id = 'm' + uid();
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `<div class="modal modal-${size} ${className}" role="dialog" aria-modal="true" aria-labelledby="${id}-t" tabindex="-1">
      <header class="modal-head"><h2 id="${id}-t">${esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close dialog">${icon('x')}</button></header>
      <div class="modal-body">${body}</div>${footer ? `<footer class="modal-foot">${footer}</footer>` : ''}</div>`;
    const m = { el: wrap, dialog: wrap.firstElementChild, prevFocus: document.activeElement, onClose };
    m.body = m.dialog.querySelector('.modal-body');
    m.close = () => this.close(m);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) m.close(); });
    wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) { e.preventDefault(); m.close(); } });
    root.appendChild(wrap);
    this.stack.push(m);
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      wrap.classList.add('open');
      const f = m.dialog.querySelector('[autofocus], .modal-body input:not([type=hidden]):not([disabled]), .modal-body select, .modal-body textarea, .modal-body button, .modal-foot .btn-primary');
      (f || m.dialog).focus();
    });
    return m;
  },
  close(m) {
    const i = this.stack.indexOf(m);
    if (i < 0) return;
    this.stack.splice(i, 1);
    m.el.remove();
    if (!this.stack.length) document.body.classList.remove('modal-open');
    if (m.prevFocus && document.contains(m.prevFocus)) m.prevFocus.focus();
    if (m.onClose) m.onClose();
  },
  closeAll() { [...this.stack].reverse().forEach((m) => this.close(m)); },
  top() { return this.stack[this.stack.length - 1]; },
};
document.addEventListener('keydown', (e) => {
  const m = Modal.top();
  if (!m) return;
  if (e.key === 'Escape') { e.preventDefault(); m.close(); return; }
  if (e.key === 'Tab') {
    const f = $$('a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', m.dialog).filter((x) => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const first = f[0]; const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
/** Generic modal renderer (alias used across modules). */
function renderModal(opts) { return Modal.open(opts); }

/** Promise-based confirmation dialog — replaces window.confirm(). */
function confirmDialog({ title = 'Are you sure?', message = '', confirmText = 'Confirm', cancelText = 'Cancel', tone = 'danger' } = {}) {
  return new Promise((resolve) => {
    let done = false;
    const m = Modal.open({ title, size: 'sm', className: 'confirm',
      body: `<div class="confirm-body"><span class="confirm-ico tone-${tone}">${icon(tone === 'danger' ? 'alert' : 'info', 22)}</span><p>${message}</p></div>`,
      footer: `<button type="button" class="btn" data-close>${esc(cancelText)}</button><button type="button" class="btn btn-${tone === 'danger' ? 'danger' : 'primary'}" data-ok autofocus>${esc(confirmText)}</button>`,
      onClose: () => { if (!done) resolve(false); } });
    m.dialog.querySelector('[data-ok]').addEventListener('click', () => { done = true; m.close(); resolve(true); });
  });
}

/* ---------- Forms ---------- */
const normOptions = (opts) => (typeof opts === 'function' ? opts() : opts || []).map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
let _fieldSeq = 0;
function renderField(f, value) {
  if (f.type === 'section') return `<div class="form-section full"><h3>${esc(f.label)}</h3>${f.help ? `<p>${esc(f.help)}</p>` : ''}</div>`;
  if (f.type === 'html') return `<div class="field ${f.full ? 'full' : ''}">${f.html}</div>`;
  const id = `fld-${f.name}-${++_fieldSeq}`;
  const v = value ?? f.value ?? (f.type === 'multiselect' ? [] : '');
  const req = f.required ? ' required aria-required="true"' : '';
  const common = `id="${id}" name="${f.name}"${req}${f.disabled ? ' disabled' : ''} aria-describedby="${id}-err"${f.placeholder ? ` placeholder="${esc(f.placeholder)}"` : ''}`;
  let control;
  switch (f.type) {
    case 'textarea': control = `<textarea ${common} rows="${f.rows || 3}">${esc(v)}</textarea>`; break;
    case 'select': {
      const opts = normOptions(f.options);
      control = `<select ${common}>${f.noEmpty ? '' : `<option value="">${esc(f.emptyLabel || 'Select…')}</option>`}${opts.map((o) => `<option value="${esc(o.value)}"${String(o.value) === String(v) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`; break;
    }
    case 'multiselect': {
      const sel = Array.isArray(v) ? v.map(String) : [];
      control = `<div class="multi" role="group" aria-labelledby="${id}-l" id="${id}">${normOptions(f.options).map((o) => `<label class="check"><input type="checkbox" name="${f.name}" value="${esc(o.value)}"${sel.includes(String(o.value)) ? ' checked' : ''}> <span>${esc(o.label)}</span></label>`).join('')}</div>`; break;
    }
    case 'radio':
      control = `<div class="radio-group" role="radiogroup" aria-labelledby="${id}-l" id="${id}">${normOptions(f.options).map((o) => `<label class="check"><input type="radio" name="${f.name}" value="${esc(o.value)}"${String(o.value) === String(v) ? ' checked' : ''}> <span>${esc(o.label)}</span></label>`).join('')}</div>`; break;
    case 'checkbox':
      return `<div class="field field-check ${f.full ? 'full' : ''}" data-field="${f.name}"><label class="check"><input type="checkbox" ${common}${v ? ' checked' : ''}> <span>${esc(f.label)}</span></label>${f.help ? `<div class="field-help">${esc(f.help)}</div>` : ''}<div class="field-error" id="${id}-err"></div></div>`;
    case 'file':
      control = `<label class="dropzone" for="${id}">${icon('upload', 20)}<span class="dz-text">${v ? esc(v) : 'Click to choose a file'}</span><small>${esc(f.accept || 'PDF, PNG or JPG up to 10 MB')}</small></label><input type="file" class="sr-only" ${common} data-current="${esc(v)}"${f.accept ? ` accept="${esc(f.accept)}"` : ''}>`; break;
    case 'currency':
      control = `<div class="input-group"><span class="input-addon">${esc(currencySymbol())}</span><input type="number" inputmode="decimal" step="0.01" ${common} value="${esc(v)}"></div>`; break;
    case 'number':
      control = `<input type="number" inputmode="decimal" step="${f.step || 'any'}" ${common} value="${esc(v)}">`; break;
    default:
      control = `<input type="${f.type || 'text'}" ${common} value="${esc(v)}"${f.type === 'email' ? ' autocomplete="email"' : ''}>`;
  }
  return `<div class="field ${f.full ? 'full' : ''}" data-field="${f.name}"><label id="${id}-l" for="${id}">${esc(f.label)}${f.required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>${control}${f.help ? `<div class="field-help">${esc(f.help)}</div>` : ''}<div class="field-error" id="${id}-err" aria-live="polite"></div></div>`;
}
function readFields(form, fields) {
  const out = {};
  fields.forEach((f) => {
    if (!f.name || ['section', 'html'].includes(f.type)) return;
    const els = $$(`[name="${f.name}"]`, form);
    if (!els.length) return;
    if (f.type === 'multiselect') out[f.name] = els.filter((e) => e.checked).map((e) => e.value);
    else if (f.type === 'radio') out[f.name] = (els.find((e) => e.checked) || {}).value || '';
    else if (f.type === 'checkbox') out[f.name] = els[0].checked;
    else if (f.type === 'file') out[f.name] = els[0].files?.[0]?.name || els[0].dataset.current || '';
    else if (f.type === 'number' || f.type === 'currency') { const s = els[0].value.trim(); out[f.name] = s === '' ? null : Number(s); out['_raw_' + f.name] = s; } else out[f.name] = els[0].value.trim();
  });
  return out;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
function validateFields(fields, values) {
  const errors = {};
  fields.forEach((f) => {
    if (!f.name || ['section', 'html'].includes(f.type)) return;
    const v = values[f.name];
    const empty = v === '' || v === null || v === undefined || (Array.isArray(v) && !v.length) || (f.type === 'checkbox' && f.required && !v);
    if (empty) { if (f.required) errors[f.name] = `${f.label} is required.`; return; }
    if (f.type === 'email' && !EMAIL_RE.test(v)) errors[f.name] = 'Enter a valid email address.';
    if (f.type === 'number' || f.type === 'currency') {
      if (!Number.isFinite(v)) errors[f.name] = 'Enter a valid number.';
      else if (v < (f.min ?? 0)) errors[f.name] = (f.min ?? 0) === 0 ? 'Value cannot be negative.' : `Value must be at least ${f.min}.`;
      else if (f.max !== undefined && v > f.max) errors[f.name] = `Value must be ${f.max} or less.`;
      else if (f.integer && !Number.isInteger(v)) errors[f.name] = 'Enter a whole number.';
    }
    if (f.type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(parseISO(v))) errors[f.name] = 'Enter a valid date.';
      else if (f.after && values[f.after] && v < values[f.after]) errors[f.name] = `Must be on or after ${formatDate(values[f.after])}.`;
    }
    if (f.unique && !errors[f.name]) {
      const key = f.unique.field || f.name;
      if (DB.all(f.unique.collection).some((r) => String(r[key]).toLowerCase() === String(v).toLowerCase() && r.id !== f.unique.exceptId)) errors[f.name] = `${f.label} "${v}" already exists.`;
    }
    if (f.validate && !errors[f.name]) { const msg = f.validate(v, values); if (msg) errors[f.name] = msg; }
  });
  return errors;
}
function showErrors(form, errors) {
  $$('.field', form).forEach((w) => { w.classList.remove('has-error'); const e = $('.field-error', w); if (e) e.textContent = ''; $$('input,select,textarea', w).forEach((i) => i.removeAttribute('aria-invalid')); });
  let first = null;
  Object.entries(errors).forEach(([name, msg]) => {
    const w = $(`.field[data-field="${name}"]`, form);
    if (!w) return;
    w.classList.add('has-error');
    $('.field-error', w).textContent = msg;
    $$('input,select,textarea', w).forEach((i) => i.setAttribute('aria-invalid', 'true'));
    if (!first) first = $('input,select,textarea', w);
  });
  if (first) first.focus();
  return !first;
}
/**
 * Form modal: renders fields, validates and calls onSubmit(values, {alt}).
 * onSubmit may return {error:'…'} to keep the dialog open.
 */
function formModal({ title, fields, values = {}, submitText = 'Save', altText, size = 'md', onSubmit, onInput, intro = '' }) {
  const body = `${intro}<div class="form-grid">${fields.map((f) => renderField(f, values[f.name])).join('')}</div>`;
  const m = Modal.open({ title, size, body: `<form novalidate class="modal-form" id="mf-${uid()}">${body}<button type="submit" hidden></button></form>`,
    footer: `<button type="button" class="btn" data-close>Cancel</button>${altText ? `<button type="button" class="btn" data-alt>${esc(altText)}</button>` : ''}<button type="button" class="btn btn-primary" data-submit>${esc(submitText)}</button>` });
  const form = $('form', m.dialog);
  $$('input[type=file]', form).forEach((inp) => inp.addEventListener('change', () => { const t = inp.previousElementSibling?.querySelector('.dz-text'); if (t) t.textContent = inp.files[0]?.name || 'Click to choose a file'; }));
  if (onInput) { form.addEventListener('change', (e) => onInput(form, e)); onInput(form, null); }
  const submit = (alt) => {
    const vals = readFields(form, fields);
    fields.forEach((f) => { if ((f.type === 'number' || f.type === 'currency') && vals['_raw_' + f.name] !== '' && !Number.isFinite(vals[f.name])) vals[f.name] = NaN; delete vals['_raw_' + f.name]; });
    const errs = validateFields(fields, vals);
    if (!showErrors(form, errs)) { showToast('Please fix the highlighted fields.', 'error'); return; }
    let res;
    try { res = onSubmit(vals, { alt, modal: m }); } catch (err) { console.error(err); showToast(err.message || 'Unable to save record', 'error'); return; }
    if (res && res.error) { showToast(res.error, 'error'); return; }
    if (res !== false) m.close();
  };
  form.addEventListener('submit', (e) => { e.preventDefault(); submit(false); });
  m.dialog.querySelector('[data-submit]').addEventListener('click', () => submit(false));
  m.dialog.querySelector('[data-alt]')?.addEventListener('click', () => submit(true));
  return m;
}

/* ---------- Floating action menu ---------- */
let _openMenu = null;
function closeMenu() { if (_openMenu) { _openMenu.el.remove(); _openMenu.anchor.setAttribute('aria-expanded', 'false'); _openMenu = null; } }
function openMenu(anchor, items) {
  if (_openMenu && _openMenu.anchor === anchor) { closeMenu(); return; }
  closeMenu();
  const list = items.filter((x) => x && (!x.perm || Auth.can(x.perm)));
  if (!list.length) return;
  const el = document.createElement('div');
  el.className = 'menu'; el.setAttribute('role', 'menu');
  el.innerHTML = list.map((it, i) => (it.divider ? '<div class="menu-sep" role="separator"></div>' : `<button type="button" role="menuitem" class="menu-item ${it.danger ? 'danger' : ''}" data-i="${i}">${icon(it.icon || 'chevRight', 16)}<span>${esc(it.label)}</span></button>`)).join('');
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  const w = el.offsetWidth; const h = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  el.style.top = (r.bottom + h + 8 > window.innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + window.scrollY + 'px';
  anchor.setAttribute('aria-expanded', 'true');
  _openMenu = { el, anchor };
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (!b) return; const it = list[+b.dataset.i]; closeMenu(); it.onClick && it.onClick(); });
  el.addEventListener('keydown', (e) => {
    const btns = $$('.menu-item', el); const i = btns.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
    if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); anchor.focus(); }
  });
  $('.menu-item', el)?.focus();
}
document.addEventListener('mousedown', (e) => { if (_openMenu && !_openMenu.el.contains(e.target) && !_openMenu.anchor.contains(e.target)) closeMenu(); });
window.addEventListener('resize', closeMenu);
document.addEventListener('scroll', () => closeMenu(), true);

/* ---------- Reusable list view (search, filters, sort, selection, pagination, export) ---------- */
const PageState = {};
/**
 * cfg: { key, columns:[{key,label,render(r),value(r),align,sortable,cls}], rows(), searchFields:[fn],
 *        filters:[{key,label,options,test(r,v)}], dateField(r), defaultSort:{key,dir}, preset:{filterKey:value},
 *        onView(r), actions(r)→items, exportName, onDelete(rows), emptyTitle, emptyText, toolbarHtml, selectable, pageSize, onRender(el) }
 */
function listView(el, cfg) {
  const st = PageState[cfg.key] || (PageState[cfg.key] = { q: '', filters: {}, from: '', to: '', sort: cfg.defaultSort?.key || null, dir: cfg.defaultSort?.dir || 'asc', page: 1, size: cfg.pageSize || 10, selected: new Set(), presetSig: null });
  const sig = JSON.stringify(cfg.preset || {});
  if (cfg.preset && st.presetSig !== sig) { st.filters = { ...st.filters, ...cfg.preset }; st.page = 1; st.q = ''; }
  st.presetSig = sig;
  const selectable = cfg.selectable !== false;
  const filters = cfg.filters || [];
  const hasFilter = () => st.q || st.from || st.to || Object.values(st.filters).some((v) => v);
  el.innerHTML = `<div class="list-view">
    <div class="toolbar" role="search">
      <div class="search-box">${icon('search', 16)}<input type="search" class="lv-search" placeholder="${esc(cfg.searchPlaceholder || 'Search…')}" aria-label="${esc(cfg.searchPlaceholder || 'Search')}" value="${esc(st.q)}"></div>
      ${filters.map((f) => `<label class="sr-only" for="lvf-${cfg.key}-${f.key}">${esc(f.label)}</label><select id="lvf-${cfg.key}-${f.key}" class="lv-filter" data-key="${f.key}"><option value="">${esc(f.label)}: All</option>${normOptions(f.options).map((o) => `<option value="${esc(o.value)}"${String(st.filters[f.key] || '') === String(o.value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`).join('')}
      ${cfg.dateField ? `<div class="date-range"><label class="sr-only" for="lvd1-${cfg.key}">From date</label><input type="date" id="lvd1-${cfg.key}" class="lv-from" value="${st.from}" title="From date"><span aria-hidden="true">–</span><label class="sr-only" for="lvd2-${cfg.key}">To date</label><input type="date" id="lvd2-${cfg.key}" class="lv-to" value="${st.to}" title="To date"></div>` : ''}
      <button type="button" class="btn btn-ghost btn-sm lv-reset" ${hasFilter() ? '' : 'hidden'}>${icon('x', 14)} Clear</button>
      <div class="toolbar-spacer"></div>
      ${cfg.toolbarHtml || ''}
      ${cfg.exportName && Auth.can('export') ? `<button type="button" class="btn btn-sm lv-export">${icon('download', 16)} Export</button>` : ''}
    </div>
    <div class="bulk-bar" hidden><span class="bulk-count"></span><div class="toolbar-spacer"></div>${cfg.exportName && Auth.can('export') ? `<button type="button" class="btn btn-sm lv-bulk-export">${icon('download', 14)} Export selected</button>` : ''}${cfg.onDelete && Auth.can('delete') ? `<button type="button" class="btn btn-sm btn-danger-ghost lv-bulk-delete">${icon('trash', 14)} Delete selected</button>` : ''}<button type="button" class="btn btn-sm btn-ghost lv-bulk-clear">Clear selection</button></div>
    <div class="table-wrap"><table class="data-table ${cfg.compact ? 'compact' : ''}"><thead></thead><tbody></tbody></table></div>
    <div class="table-foot"></div></div>`;
  const tbl = $('table', el);

  const computed = () => {
    let rows = cfg.rows();
    if (st.q) rows = filterData(rows, st.q, cfg.searchFields || cfg.columns.map((c) => (r) => (c.value ? c.value(r) : r[c.key])));
    filters.forEach((f) => { const v = st.filters[f.key]; if (v) rows = rows.filter((r) => (f.test ? f.test(r, v) : String(r[f.key]) === String(v))); });
    if (cfg.dateField && (st.from || st.to)) rows = rows.filter((r) => { const d = cfg.dateField(r); return (!st.from || d >= st.from) && (!st.to || d <= st.to); });
    if (st.sort) { const col = cfg.columns.find((c) => c.key === st.sort); if (col) rows = sortData(rows, col.sortValue || col.value || ((r) => r[col.key]), st.dir); }
    return rows;
  };
  let current = [];
  const render = () => {
    const all = computed();
    current = all;
    const pg = paginate(all, st.page, st.size);
    st.page = pg.page;
    const ids = new Set(all.map((r) => r.id));
    [...st.selected].forEach((id) => { if (!ids.has(id)) st.selected.delete(id); });
    const pageAllSel = pg.items.length && pg.items.every((r) => st.selected.has(r.id));
    tbl.tHead.innerHTML = `<tr>${selectable ? `<th class="col-check"><input type="checkbox" class="lv-all" aria-label="Select all rows on this page"${pageAllSel ? ' checked' : ''}></th>` : ''}${cfg.columns.map((c) => {
      const sortable = c.sortable !== false;
      const dir = st.sort === c.key ? st.dir : null;
      return `<th class="${c.align === 'right' ? 'num' : ''} ${c.cls || ''}" ${dir ? `aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : ''}>${sortable ? `<button type="button" class="th-sort" data-sort="${c.key}">${esc(c.label)}<span class="sort-ind ${dir || ''}" aria-hidden="true"></span></button>` : esc(c.label)}</th>`;
    }).join('')}${cfg.actions ? '<th class="col-actions"><span class="sr-only">Actions</span></th>' : ''}</tr>`;
    const colCount = cfg.columns.length + (selectable ? 1 : 0) + (cfg.actions ? 1 : 0);
    if (!pg.items.length) {
      const filtered = hasFilter();
      tbl.tBodies[0].innerHTML = `<tr class="empty-row"><td colspan="${colCount}">${emptyState(filtered ? `No ${cfg.entity || 'records'} found.` : (cfg.emptyTitle || `No ${cfg.entity || 'records'} yet.`), filtered ? 'Try changing your search or filters.' : (cfg.emptyText || ''), filtered ? 'search' : 'inbox')}</td></tr>`;
    } else {
      tbl.tBodies[0].innerHTML = pg.items.map((r, i) => `<tr data-i="${i}" class="${cfg.onView ? 'clickable' : ''} ${st.selected.has(r.id) ? 'selected' : ''} ${cfg.rowClass ? cfg.rowClass(r) : ''}">${selectable ? `<td class="col-check"><input type="checkbox" class="lv-row" aria-label="Select ${esc(r.id)}"${st.selected.has(r.id) ? ' checked' : ''}></td>` : ''}${cfg.columns.map((c, ci) => `<td class="${c.align === 'right' ? 'num' : ''} ${c.cls || ''} ${ci === 0 ? 'cell-primary' : ''}" data-label="${esc(c.label)}">${c.render ? c.render(r) : esc(c.value ? c.value(r) : r[c.key])}</td>`).join('')}${cfg.actions ? `<td class="col-actions"><button type="button" class="icon-btn lv-act" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ${esc(r.id)}">${icon('more')}</button></td>` : ''}</tr>`).join('');
    }
    tbl._items = pg.items;
    const nums = [];
    for (let p = 1; p <= pg.pages; p++) if (p === 1 || p === pg.pages || Math.abs(p - pg.page) <= 1) nums.push(p); else if (nums[nums.length - 1] !== '…') nums.push('…');
    $('.table-foot', el).innerHTML = `<div class="page-info">${pg.total ? `Showing <b>${pg.start}–${pg.end}</b> of <b>${pg.total}</b>` : '0 results'}</div>
      <label class="page-size">Rows <select class="lv-size" aria-label="Rows per page">${[10, 25, 50, 100].map((n) => `<option${n === st.size ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <nav class="pager" aria-label="Pagination"><button type="button" class="icon-btn" data-page="${pg.page - 1}" ${pg.page <= 1 ? 'disabled' : ''} aria-label="Previous page">${icon('chevLeft', 16)}</button>${nums.map((n) => (n === '…' ? '<span class="pager-gap">…</span>' : `<button type="button" class="pager-num ${n === pg.page ? 'active' : ''}" data-page="${n}" ${n === pg.page ? 'aria-current="page"' : ''}>${n}</button>`)).join('')}<button type="button" class="icon-btn" data-page="${pg.page + 1}" ${pg.page >= pg.pages ? 'disabled' : ''} aria-label="Next page">${icon('chevRight', 16)}</button></nav>`;
    const n = st.selected.size;
    $('.bulk-bar', el).hidden = !n || !selectable;
    $('.bulk-count', el).textContent = `${n} selected`;
    $('.lv-reset', el).hidden = !hasFilter();
    if (cfg.onRender) cfg.onRender(all);
  };
  const exportRows = (rows) => exportCSV(cfg.exportName, (cfg.exportColumns || cfg.columns.filter((c) => c.export !== false)).map((c) => ({ label: c.label, value: c.exportValue || c.value || ((r) => (c.render ? stripHtml(c.render(r)) : r[c.key])) })), rows);

  $('.lv-search', el).addEventListener('input', debounce((e) => { st.q = e.target.value; st.page = 1; render(); }, 180));
  $$('.lv-filter', el).forEach((s) => s.addEventListener('change', () => { st.filters[s.dataset.key] = s.value; st.page = 1; render(); }));
  $('.lv-from', el)?.addEventListener('change', (e) => { st.from = e.target.value; st.page = 1; render(); });
  $('.lv-to', el)?.addEventListener('change', (e) => { st.to = e.target.value; st.page = 1; render(); });
  $('.lv-reset', el).addEventListener('click', () => { st.q = ''; st.filters = {}; st.from = ''; st.to = ''; st.page = 1; listView(el, { ...cfg, preset: null }); });
  $('.lv-export', el)?.addEventListener('click', () => exportRows(current));
  $('.lv-bulk-export', el)?.addEventListener('click', () => exportRows(current.filter((r) => st.selected.has(r.id))));
  $('.lv-bulk-clear', el).addEventListener('click', () => { st.selected.clear(); render(); });
  $('.lv-bulk-delete', el)?.addEventListener('click', async () => {
    const rows = current.filter((r) => st.selected.has(r.id));
    if (!(await confirmDialog({ title: `Delete ${rows.length} record${rows.length > 1 ? 's' : ''}?`, message: 'This action cannot be undone.', confirmText: 'Delete' }))) return;
    const n = cfg.onDelete(rows);
    st.selected.clear();
    if (n !== false) App.refresh();
  });
  el.addEventListener('click', (e) => {
    const sortBtn = e.target.closest('.th-sort');
    if (sortBtn) { const k = sortBtn.dataset.sort; if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = k; st.dir = 'asc'; } render(); return; }
    const pb = e.target.closest('[data-page]');
    if (pb && !pb.disabled) { st.page = +pb.dataset.page; render(); el.querySelector('.table-wrap').scrollTop = 0; return; }
    const tr = e.target.closest('tbody tr[data-i]');
    if (!tr) return;
    const row = tbl._items[+tr.dataset.i];
    if (e.target.closest('.lv-act')) { openMenu(e.target.closest('.lv-act'), cfg.actions(row)); return; }
    if (e.target.closest('.col-check, a, button, input, select, label')) return;
    if (cfg.onView) cfg.onView(row);
  });
  el.addEventListener('change', (e) => {
    if (e.target.classList.contains('lv-size')) { st.size = +e.target.value; st.page = 1; render(); }
    if (e.target.classList.contains('lv-all')) { tbl._items.forEach((r) => (e.target.checked ? st.selected.add(r.id) : st.selected.delete(r.id))); render(); }
    if (e.target.classList.contains('lv-row')) { const r = tbl._items[+e.target.closest('tr').dataset.i]; if (e.target.checked) st.selected.add(r.id); else st.selected.delete(r.id); render(); }
  });
  el.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !cfg.onView) return;
    const tr = e.target.closest('tbody tr[data-i]');
    if (tr && e.target === tr) cfg.onView(tbl._items[+tr.dataset.i]);
  });
  render();
  $$('tbody tr.clickable', el).forEach((tr) => tr.setAttribute('tabindex', '0'));
  new MutationObserver(() => $$('tbody tr.clickable:not([tabindex])', el).forEach((tr) => tr.setAttribute('tabindex', '0'))).observe(tbl.tBodies[0], { childList: true });
  return { render, state: st, rows: () => current };
}
/** Simple static table (no toolbar) for detail tabs and widgets. */
function renderTable(columns, rows, { empty = 'No records found.', footer = '', cls = '', onRowNav } = {}) {
  if (!rows.length) return `<div class="table-empty">${emptyState(empty, '', 'inbox', '', true)}</div>`;
  return `<div class="table-wrap"><table class="data-table ${cls}"><thead><tr>${columns.map((c) => `<th class="${c.align === 'right' ? 'num' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr${onRowNav ? ` class="clickable" tabindex="0" data-nav="${esc(onRowNav(r))}"` : ''}>${columns.map((c, i) => `<td class="${c.align === 'right' ? 'num' : ''} ${i === 0 ? 'cell-primary' : ''}" data-label="${esc(c.label)}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody>${footer ? `<tfoot>${footer}</tfoot>` : ''}</table></div>`;
}

/* ---------- Layout snippets ---------- */
function pageHeader({ title, subtitle = '', actions = '', back = '' }) {
  return `<div class="page-head">${back ? `<a class="back-link no-print" href="#/${back}">${icon('chevLeft', 16)} Back</a>` : ''}<div class="page-head-row"><div><h1 class="page-title">${title}</h1>${subtitle ? `<p class="page-sub">${subtitle}</p>` : ''}</div><div class="page-actions no-print">${actions}</div></div></div>`;
}
const btn = (label, { icon: ic, cls = '', attrs = '', perm } = {}) => (perm && !Auth.can(perm) ? '' : `<button type="button" class="btn ${cls}" ${attrs}>${ic ? icon(ic, 16) : ''}<span>${esc(label)}</span></button>`);
function tabsHtml(tabs, active, base) {
  return `<div class="tabs no-print" role="tablist">${tabs.map((t) => { const k = t.key || t; const label = t.label || t; return `<a role="tab" class="tab ${k === active ? 'active' : ''}" aria-selected="${k === active}" href="#/${base}${base.includes('?') ? '&' : '?'}tab=${k}">${esc(label)}${t.count !== undefined ? `<span class="tab-count">${t.count}</span>` : ''}</a>`; }).join('')}</div>`;
}
function card(title, body, { actions = '', cls = '', sub = '' } = {}) {
  return `<section class="card ${cls}">${title ? `<header class="card-head"><div><h2 class="card-title">${title}</h2>${sub ? `<p class="card-sub">${sub}</p>` : ''}</div>${actions ? `<div class="card-actions no-print">${actions}</div>` : ''}</header>` : ''}<div class="card-body">${body}</div></section>`;
}
function detailList(pairs, cols = 2) {
  return `<dl class="detail-list cols-${cols}">${pairs.filter(Boolean).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v === '' || v == null ? '—' : v}</dd></div>`).join('')}</dl>`;
}
function kpiCard({ label, value, delta, deltaLabel = 'vs previous month', sub = '', nav = '', icon: ic = 'chart', invert = false, tone = '' }) {
  let d = '';
  if (delta !== undefined && delta !== null && Number.isFinite(delta)) {
    const good = invert ? delta <= 0 : delta >= 0;
    d = `<span class="kpi-delta ${good ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}%</span><span class="kpi-dl">${esc(deltaLabel)}</span>`;
  }
  const tag = nav ? 'a' : 'div';
  return `<${tag} class="kpi ${tone}" ${nav ? `href="#/${nav}"` : ''}><div class="kpi-top"><span class="kpi-label">${esc(label)}</span><span class="kpi-ico">${icon(ic, 16)}</span></div><div class="kpi-value">${value}</div><div class="kpi-foot">${d}${sub ? `<span class="kpi-dl">${sub}</span>` : ''}</div></${tag}>`;
}
const pctChange = (cur, prev) => (prev ? ((cur - prev) / Math.abs(prev)) * 100 : null);
function statTiles(items) {
  return `<div class="stat-tiles">${items.map((s) => `<${s.nav ? 'a' : 'div'} class="stat-tile ${s.tone || ''}" ${s.nav ? `href="#/${s.nav}"` : ''}><span class="stat-label">${esc(s.label)}</span><span class="stat-value">${s.value}</span>${s.sub ? `<span class="stat-sub">${s.sub}</span>` : ''}</${s.nav ? 'a' : 'div'}>`).join('')}</div>`;
}

/* ---------- UI states ---------- */
function emptyState(title, text = '', ic = 'inbox', action = '', small = false) {
  return `<div class="empty-state ${small ? 'small' : ''}"><span class="empty-ico">${icon(ic, small ? 22 : 30)}</span><p class="empty-title">${esc(title)}</p>${text ? `<p class="empty-text">${esc(text)}</p>` : ''}${action}</div>`;
}
function skeleton() {
  return `<div class="skeleton" aria-busy="true" aria-label="Loading"><div class="sk sk-title"></div><div class="sk-row">${'<div class="sk sk-card"></div>'.repeat(4)}</div><div class="sk sk-block"></div><div class="sk sk-block short"></div></div>`;
}
function noPermission(module) {
  return `<div class="state-page">${emptyState('You don’t have access to this page', `Your role (${Auth.user()?.role || 'Guest'}) does not include the ${module || 'requested'} module. Ask an administrator to update your role permissions.`, 'lock', `<a class="btn btn-primary" href="#/dashboard">Go to dashboard</a>`)}</div>`;
}
function errorState(msg, retry = true) {
  return `<div class="state-page">${emptyState('Something went wrong', msg || 'The page could not be loaded.', 'alert', retry ? '<button type="button" class="btn btn-primary" data-action="retry">Try again</button>' : '')}</div>`;
}

/* ---------- SVG charts (no libraries) ---------- */
function niceRange(min, max, ticks = 4) {
  if (max === min) { max = max || 1; min = Math.min(0, min); }
  const raw = (max - min) / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const n = raw / mag;
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step };
}
const Charts = {
  palette: ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'],
  legend(series) { return `<div class="chart-legend">${series.map((s) => `<span><i style="background:${s.color}" class="${s.type === 'line' ? 'line' : ''}"></i>${esc(s.name)}</span>`).join('')}</div>`; },
  /** Grouped bars + optional lines on a shared axis. */
  combo({ labels, bars = [], lines = [], height = 240, format = formatCompact }) {
    const W = 640; const H = height; const L = 56; const R = 12; const T = 12; const B = 28;
    const all = [...bars, ...lines].flatMap((s) => s.values);
    const rng = niceRange(Math.min(0, ...all), Math.max(0, ...all));
    const y = (v) => T + (H - T - B) * (1 - (v - rng.min) / (rng.max - rng.min));
    const gw = (W - L - R) / labels.length;
    let g = '';
    for (let v = rng.min; v <= rng.max + 1e-9; v += rng.step) g += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" class="grid ${Math.abs(v) < 1e-9 ? 'zero' : ''}"/><text x="${L - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${format(v)}</text>`;
    const bw = Math.min(22, (gw * 0.7) / Math.max(1, bars.length));
    labels.forEach((lab, i) => {
      const x0 = L + i * gw + (gw - bw * bars.length) / 2;
      bars.forEach((s, k) => { const v = s.values[i]; const y1 = y(Math.max(0, v)); const y2 = y(Math.min(0, v)); g += `<rect x="${x0 + k * bw + 1}" y="${y1}" width="${bw - 2}" height="${Math.max(1, y2 - y1)}" rx="2" fill="${s.color}"/>`; });
      g += `<text x="${L + i * gw + gw / 2}" y="${H - 8}" class="axis" text-anchor="middle">${esc(lab)}</text>`;
    });
    lines.forEach((s) => {
      const pts = s.values.map((v, i) => `${L + i * gw + gw / 2},${y(v)}`);
      g += `<polyline points="${pts.join(' ')}" fill="none" stroke="${s.color}" stroke-width="2.25" stroke-linejoin="round"/>${s.values.map((v, i) => `<circle cx="${L + i * gw + gw / 2}" cy="${y(v)}" r="3.5" fill="var(--surface)" stroke="${s.color}" stroke-width="2"/>`).join('')}`;
    });
    labels.forEach((lab, i) => { g += `<rect x="${L + i * gw}" y="${T}" width="${gw}" height="${H - T - B}" class="hover-col"><title>${esc(lab)}\n${[...bars, ...lines].map((s) => `${s.name}: ${formatCurrency(s.values[i])}`).join('\n')}</title></rect>`; });
    const series = [...bars.map((s) => ({ ...s, type: 'bar' })), ...lines.map((s) => ({ ...s, type: 'line' }))];
    const summary = labels.map((lab, i) => `${lab}: ${series.map((s) => `${s.name} ${formatCurrency(s.values[i])}`).join(', ')}`).join('; ');
    return `<div class="chart">${this.legend(series)}<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="${esc(summary)}">${g}</svg></div>`;
  },
  donut({ items, centerLabel = 'Total', format = formatCompact, navFn }) {
    const total = sum(items, (i) => i.value);
    const R = 60; const C = 2 * Math.PI * R;
    let off = 0; let arcs = '';
    items.forEach((it, i) => {
      const frac = total ? it.value / total : 0;
      const color = it.color || this.palette[i % 6];
      arcs += `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${color}" stroke-width="22" stroke-dasharray="${Math.max(0, frac * C - 1.5)} ${C}" stroke-dashoffset="${-off * C}" transform="rotate(-90 80 80)"><title>${esc(it.label)}: ${formatCurrency(it.value)} (${(frac * 100).toFixed(1)}%)</title></circle>`;
      off += frac;
    });
    return `<div class="donut-wrap"><svg viewBox="0 0 160 160" class="donut" role="img" aria-label="${esc(items.map((i) => `${i.label} ${formatCurrency(i.value)}`).join(', '))}"><circle cx="80" cy="80" r="${R}" fill="none" stroke="var(--border)" stroke-width="22"/>${arcs}<text x="80" y="76" text-anchor="middle" class="donut-label">${esc(centerLabel)}</text><text x="80" y="96" text-anchor="middle" class="donut-value">${esc(format(total))}</text></svg>
      <ul class="donut-legend">${items.map((it, i) => `<li${navFn ? ` class="clickable" data-nav="${esc(navFn(it))}" tabindex="0"` : ''}><i style="background:${it.color || this.palette[i % 6]}"></i><span class="dl-name">${esc(it.label)}</span><span class="dl-val">${formatCurrency(it.value, true)}</span><span class="dl-pct">${total ? ((it.value / total) * 100).toFixed(1) : 0}%</span></li>`).join('')}</ul></div>`;
  },
  hbars({ items, format = (v) => formatCurrency(v, true), color = 'var(--c1)' }) {
    const max = Math.max(1, ...items.map((i) => Math.abs(i.value)));
    if (!items.length) return emptyState('No data for this period.', '', 'chart', '', true);
    return `<ul class="hbars">${items.map((it) => `<li${it.nav ? ` class="clickable" data-nav="${esc(it.nav)}" tabindex="0"` : ''}><span class="hb-label" title="${esc(it.label)}">${esc(it.label)}</span><span class="hb-track"><span class="hb-bar" style="width:${(Math.abs(it.value) / max) * 100}%;background:${it.color || color}"></span></span><span class="hb-val">${format(it.value)}</span></li>`).join('')}</ul>`;
  },
  pipeline(stages) {
    const max = Math.max(1, ...stages.map((s) => s.count));
    return `<ol class="pipeline">${stages.map((s, i) => `<li${s.nav ? ` class="clickable" data-nav="${esc(s.nav)}" tabindex="0"` : ''}><div class="pl-head"><span class="pl-step">${i + 1}</span><span class="pl-name">${esc(s.label)}</span><span class="pl-count">${s.count}</span></div><div class="pl-track"><span style="width:${Math.max(4, (s.count / max) * 100)}%"></span></div><div class="pl-val">${formatCurrency(s.value, true)}${s.note ? ` · ${esc(s.note)}` : ''}</div></li>`).join('')}</ol>`;
  },
  /** Aging buckets as vertical columns. */
  columns({ items, height = 180, colors }) {
    const max = Math.max(1, ...items.map((i) => i.value));
    return `<div class="columns" style="--h:${height}px">${items.map((it, i) => `<div class="col-item${it.nav ? ' clickable' : ''}" ${it.nav ? `data-nav="${esc(it.nav)}" tabindex="0"` : ''} title="${esc(it.label)}: ${formatCurrency(it.value)}"><span class="col-val">${formatCurrency(it.value, true)}</span><span class="col-bar" style="height:${(it.value / max) * 100}%;background:${(colors || [])[i] || 'var(--c2)'}"></span><span class="col-label">${esc(it.label)}</span></div>`).join('')}</div>`;
  },
};
const AGING_COLORS = ['var(--success)', 'var(--c4)', 'var(--warning)', 'var(--c5)', 'var(--danger)'];

/* ---------- Line-item document editor (quotation / order / invoice / PO / purchase request) ---------- */
const DocEditor = {
  headerFields(kind, d) {
    const custOpts = Lookup.options.customers; const supOpts = Lookup.options.suppliers;
    const F = {
      quotation: [
        { name: 'customerId', label: 'Customer', type: 'select', required: true, options: custOpts },
        { name: 'salesperson', label: 'Salesperson', type: 'select', required: true, options: () => Lookup.options.employees('Sales') },
        { name: 'date', label: 'Quotation date', type: 'date', required: true },
        { name: 'expiryDate', label: 'Expiration date', type: 'date', required: true, after: 'date' },
      ],
      order: [
        { name: 'customerId', label: 'Customer', type: 'select', required: true, options: custOpts },
        { name: 'salesperson', label: 'Salesperson', type: 'select', required: true, options: () => Lookup.options.employees('Sales') },
        { name: 'date', label: 'Order date', type: 'date', required: true },
        { name: 'paymentTerms', label: 'Payment terms', type: 'select', required: true, options: Lookup.options.terms },
        { name: 'warehouse', label: 'Ship from warehouse', type: 'select', required: true, options: Lookup.options.warehouses },
        { name: 'shipping', label: 'Shipping charge', type: 'currency' },
        { name: 'billingAddress', label: 'Billing address', type: 'textarea', rows: 2 },
        { name: 'shippingAddress', label: 'Shipping address', type: 'textarea', rows: 2 },
      ],
      invoice: [
        { name: 'customerId', label: 'Customer', type: 'select', required: true, options: custOpts },
        { name: 'projectId', label: 'Project (optional)', type: 'select', options: Lookup.options.projects, emptyLabel: 'No project' },
        { name: 'date', label: 'Invoice date', type: 'date', required: true },
        { name: 'paymentTerms', label: 'Payment terms', type: 'select', required: true, options: Lookup.options.terms },
        { name: 'dueDate', label: 'Due date', type: 'date', required: true, after: 'date' },
        { name: 'shipping', label: 'Shipping charge', type: 'currency' },
      ],
      po: [
        { name: 'supplierId', label: 'Supplier', type: 'select', required: true, options: supOpts },
        { name: 'warehouse', label: 'Deliver to warehouse', type: 'select', required: true, options: Lookup.options.warehouses },
        { name: 'date', label: 'Order date', type: 'date', required: true },
        { name: 'expectedDate', label: 'Expected delivery', type: 'date', required: true, after: 'date' },
        { name: 'paymentTerms', label: 'Payment terms', type: 'select', required: true, options: Lookup.options.terms },
        { name: 'shipping', label: 'Freight charge', type: 'currency' },
      ],
      pr: [
        { name: 'requester', label: 'Requester', type: 'select', required: true, options: () => Lookup.options.employees() },
        { name: 'department', label: 'Department', type: 'select', required: true, options: ['Management', 'Sales', 'Finance', 'Projects', 'Operations', 'Purchasing', 'IT', 'HR'] },
        { name: 'date', label: 'Request date', type: 'date', required: true },
        { name: 'reason', label: 'Reason / justification', type: 'text', required: true },
      ],
    }[kind];
    const tail = kind === 'pr' ? [] : [{ name: 'notes', label: 'Notes', type: 'textarea', rows: 2, full: kind !== 'order' }];
    if (['quotation', 'invoice'].includes(kind)) tail.push({ name: 'terms', label: 'Terms & conditions', type: 'textarea', rows: 2, full: true });
    if (kind === 'order') tail[0].full = true;
    return [...F, ...tail];
  },
  /**
   * Opens the editor. onSave(data, {alt}) returns the saved document or {error}.
   * opts: { kind, doc, title, submitText, altText }
   */
  open({ kind, doc, title, submitText = 'Save', altText, onSave }) {
    const buy = kind === 'po' || kind === 'pr';
    const T = today();
    const d = doc ? deepClone(doc) : {};
    if (!doc) {
      d.date = T;
      if (kind === 'quotation') { d.expiryDate = addDays(T, 30); d.terms = 'Prices exclude shipping unless stated. Delivery 5–10 business days after order confirmation.'; d.notes = 'Pricing valid for 30 days.'; }
      if (kind === 'invoice') { d.paymentTerms = 'Net 30'; d.dueDate = addDays(T, 30); d.terms = DB.data.settings.invoice.terms; }
      if (kind === 'order') { d.warehouse = 'WH-MAIN'; d.paymentTerms = 'Net 30'; d.shipping = 0; }
      if (kind === 'po') { d.warehouse = 'WH-MAIN'; d.expectedDate = addDays(T, 14); d.paymentTerms = 'Net 30'; d.shipping = 0; }
      const me = DB.all('employees').find((e) => e.name === Auth.userName());
      if (me && kind !== 'po') { if (kind === 'pr') { d.requester = me.id; d.department = me.department; } else if (me.department === 'Sales') d.salesperson = me.id; }
      Object.assign(d, doc === null ? {} : {}, this._prefill || {});
      this._prefill = null;
    }
    const items = (d.items && d.items.length ? d.items : [{ productId: '', description: '', qty: 1, price: 0, discount: 0, tax: DB.data.settings.taxRate }]).map((i) => ({ ...i }));
    const fields = this.headerFields(kind, d);
    const prodOpts = DB.all('products').filter((p) => p.status === 'Active' || items.some((i) => i.productId === p.id)).filter((p) => !buy || p.type === 'stock' || kind === 'pr' || p.type !== 'service');
    const body = `<form novalidate class="doc-editor"><div class="form-grid">${fields.map((f) => renderField(f, d[f.name])).join('')}</div>
      <div class="form-section full"><h3>Line items</h3></div>
      <div class="line-items-wrap"><table class="line-items"><thead><tr><th>Product / service</th><th>Description</th><th class="num">Qty</th><th class="num">${buy ? 'Unit cost' : 'Unit price'}</th><th class="num">Disc %</th><th class="num">Tax %</th><th class="num">Total</th><th><span class="sr-only">Remove</span></th></tr></thead><tbody></tbody></table></div>
      <div class="li-foot"><button type="button" class="btn btn-sm" data-add-line>${icon('plus', 14)} Add line</button><div class="li-error field-error" role="alert"></div></div>
      <div class="doc-totals"></div><button type="submit" hidden></button></form>`;
    const m = Modal.open({ title: title || 'Document', size: 'xl', body, footer: `<button type="button" class="btn" data-close>Cancel</button>${altText ? `<button type="button" class="btn" data-alt>${esc(altText)}</button>` : ''}<button type="button" class="btn btn-primary" data-submit>${esc(submitText)}</button>` });
    const form = $('form', m.dialog); const tbody = $('tbody', form);
    const rowHtml = (it, i) => `<tr data-i="${i}">
      <td data-label="Product"><select class="li-product" aria-label="Product for line ${i + 1}"><option value="">Custom item…</option>${prodOpts.map((p) => `<option value="${p.id}"${p.id === it.productId ? ' selected' : ''}>${esc(p.id)} · ${esc(p.name)}</option>`).join('')}</select></td>
      <td data-label="Description"><input class="li-desc" value="${esc(it.description || '')}" aria-label="Description for line ${i + 1}"></td>
      <td class="num" data-label="Qty"><input type="number" class="li-qty" min="0" step="1" value="${esc(it.qty)}" aria-label="Quantity for line ${i + 1}"></td>
      <td class="num" data-label="Price"><input type="number" class="li-price" min="0" step="0.01" value="${esc(it.price)}" aria-label="Unit price for line ${i + 1}"></td>
      <td class="num" data-label="Disc %"><input type="number" class="li-disc" min="0" max="100" step="0.5" value="${esc(it.discount || 0)}" aria-label="Discount percent for line ${i + 1}"></td>
      <td class="num" data-label="Tax %"><input type="number" class="li-tax" min="0" max="100" step="0.5" value="${esc(it.tax ?? 0)}" aria-label="Tax percent for line ${i + 1}"></td>
      <td class="num li-total" data-label="Total">${formatCurrency(Calc.line(it).total)}</td>
      <td><button type="button" class="icon-btn li-remove" aria-label="Remove line ${i + 1}">${icon('trash', 16)}</button></td></tr>`;
    const draw = () => { tbody.innerHTML = items.map(rowHtml).join(''); totals(); };
    const totals = () => {
      const ship = Number($('[name=shipping]', form)?.value) || 0;
      const t = Calc.doc({ items, shipping: ship });
      $$('tr', tbody).forEach((tr) => { const it = items[+tr.dataset.i]; $('.li-total', tr).textContent = formatCurrency(Calc.line(it).total); });
      $('.doc-totals', form).innerHTML = `<dl><div><dt>Subtotal</dt><dd>${formatCurrency(t.subtotal)}</dd></div><div><dt>Discount</dt><dd>−${formatCurrency(t.discount)}</dd></div><div><dt>Tax</dt><dd>${formatCurrency(t.tax)}</dd></div>${kind === 'pr' || kind === 'quotation' ? '' : `<div><dt>Shipping</dt><dd>${formatCurrency(t.shipping)}</dd></div>`}<div class="grand"><dt>Grand total</dt><dd>${formatCurrency(t.total)}</dd></div></dl>`;
    };
    tbody.addEventListener('input', (e) => {
      const tr = e.target.closest('tr'); if (!tr) return; const it = items[+tr.dataset.i];
      if (e.target.classList.contains('li-qty')) it.qty = e.target.value === '' ? '' : Number(e.target.value);
      if (e.target.classList.contains('li-price')) it.price = e.target.value === '' ? '' : Number(e.target.value);
      if (e.target.classList.contains('li-disc')) it.discount = Number(e.target.value) || 0;
      if (e.target.classList.contains('li-tax')) it.tax = Number(e.target.value) || 0;
      if (e.target.classList.contains('li-desc')) it.description = e.target.value;
      totals();
    });
    tbody.addEventListener('change', (e) => {
      if (!e.target.classList.contains('li-product')) return;
      const tr = e.target.closest('tr'); const it = items[+tr.dataset.i]; const p = DB.get('products', e.target.value);
      it.productId = e.target.value;
      if (p) { it.description = p.name; it.price = buy ? p.cost : p.price; }
      draw();
    });
    tbody.addEventListener('click', (e) => { const b = e.target.closest('.li-remove'); if (!b) return; if (items.length === 1) { showToast('A document needs at least one line item.', 'warning'); return; } items.splice(+b.closest('tr').dataset.i, 1); draw(); });
    $('[data-add-line]', form).addEventListener('click', () => { items.push({ productId: '', description: '', qty: 1, price: 0, discount: 0, tax: DB.data.settings.taxRate }); draw(); $$('.li-product', tbody).pop().focus(); });
    form.addEventListener('input', (e) => { if (e.target.name === 'shipping') totals(); });
    form.addEventListener('change', (e) => {
      const n = e.target.name;
      if (n === 'customerId') {
        const c = DB.get('customers', e.target.value); if (!c) return;
        const set = (k, v) => { const el = $(`[name=${k}]`, form); if (el) el.value = v; };
        set('paymentTerms', c.paymentTerms); set('billingAddress', c.billingAddress); set('shippingAddress', c.shippingAddress || c.billingAddress);
        if (kind === 'invoice') set('dueDate', addDays($('[name=date]', form).value || T, Lookup.termsDays(c.paymentTerms)));
      }
      if (n === 'supplierId') { const s = DB.get('suppliers', e.target.value); if (s) $('[name=paymentTerms]', form).value = s.paymentTerms; }
      if (kind === 'invoice' && (n === 'paymentTerms' || n === 'date')) { const dt = $('[name=date]', form).value; if (dt) $('[name=dueDate]', form).value = addDays(dt, Lookup.termsDays($('[name=paymentTerms]', form).value)); }
      if (kind === 'quotation' && n === 'date') { const dt = $('[name=date]', form).value; if (dt) $('[name=expiryDate]', form).value = addDays(dt, 30); }
    });
    const submit = (alt) => {
      const vals = readFields(form, fields);
      fields.forEach((f) => delete vals['_raw_' + f.name]);
      const errs = validateFields(fields, vals);
      let liErr = '';
      items.forEach((it, i) => {
        if (!it.productId && !String(it.description || '').trim()) liErr = liErr || `Line ${i + 1}: choose a product or enter a description.`;
        else if (!(Number(it.qty) > 0)) liErr = liErr || `Line ${i + 1}: quantity must be greater than zero.`;
        else if (it.price === '' || !(Number(it.price) >= 0)) liErr = liErr || `Line ${i + 1}: price cannot be negative.`;
        else if (it.discount < 0 || it.discount > 100 || it.tax < 0 || it.tax > 100) liErr = liErr || `Line ${i + 1}: discount and tax must be between 0 and 100%.`;
      });
      $('.li-error', form).textContent = liErr;
      if (!showErrors(form, errs) || liErr) { showToast(liErr || 'Please fix the highlighted fields.', 'error'); return; }
      const data = { ...d, ...vals, shipping: Number(vals.shipping) || 0, items: items.map((it) => ({ productId: it.productId, description: it.description || Lookup.productName(it.productId), qty: Number(it.qty), price: round2(it.price), discount: Number(it.discount) || 0, tax: Number(it.tax) || 0, ...(buy ? { received: it.received || 0, rejected: it.rejected || 0, billed: it.billed || 0 } : {}) })) };
      if (kind === 'invoice' && !data.projectId) data.projectId = null;
      let res;
      try { res = onSave(data, { alt }); } catch (err) { console.error(err); showToast(err.message || 'Unable to save record', 'error'); return; }
      if (res && res.error) { showToast(res.error, 'error'); return; }
      m.close();
    };
    form.addEventListener('submit', (e) => { e.preventDefault(); submit(false); });
    m.dialog.querySelector('[data-submit]').addEventListener('click', () => submit(false));
    m.dialog.querySelector('[data-alt]')?.addEventListener('click', () => submit(true));
    draw();
    return m;
  },
  /** Opens a new document with some fields prefilled (e.g. customer from customer page). */
  openNew(opts, prefill) { this._prefill = prefill; return this.open(opts); },
};

/* ---------- Printable document (invoice, quotation, order, PO, statements) ---------- */
function companyBlock() {
  const c = DB.data.settings.company;
  return `<div class="paper-brand"><span class="paper-logo">${LOGO_SVG}</span><div><div class="paper-company">NEXUS ERP</div><div class="paper-tag">Business Management &amp; Finance</div></div></div><div class="paper-from"><strong>${esc(c.name)}</strong><br>${esc(c.address)}<br>${esc(c.phone)} · ${esc(c.email)}<br>Tax No. ${esc(c.taxNumber)}</div>`;
}
/**
 * docViewHtml({ title, number, status, parties:[{label, html}], meta:[[k,v]], items, doc, showPaid, notes, terms, footer, extraTotals })
 */
function docViewHtml(o) {
  const t = o.doc ? Calc.doc(o.doc) : null;
  const rows = (o.items || []).map((it) => { const l = Calc.line(it); const p = DB.get('products', it.productId); return `<tr><td><div class="pi-desc">${esc(it.description || Lookup.productName(it.productId))}</div>${p ? `<div class="pi-sku">${esc(p.id)}</div>` : ''}</td><td class="num">${formatNumber(it.qty, Number.isInteger(Number(it.qty)) ? 0 : 2)}</td><td class="num">${formatCurrency(it.price)}</td><td class="num">${it.discount ? it.discount + '%' : '—'}</td><td class="num">${it.tax ? it.tax + '%' : '—'}</td><td class="num">${formatCurrency(l.total)}</td></tr>`; }).join('');
  const paid = o.showPaid ? (o.doc.paid || 0) : null;
  return `<article class="paper" aria-label="${esc(o.title)} ${esc(o.number)}">
    <header class="paper-head">${companyBlock()}</header>
    <div class="paper-title-row"><div><h2 class="paper-title">${esc(o.title)}</h2><div class="paper-number">#${esc(o.number)}</div></div>${o.status ? `<div>${badge(o.status)}</div>` : ''}</div>
    <div class="paper-parties">${(o.parties || []).map((p) => `<div><div class="paper-label">${esc(p.label)}</div>${p.html}</div>`).join('')}<div class="paper-meta">${(o.meta || []).map(([k, v]) => `<div><span>${esc(k)}</span><strong>${v}</strong></div>`).join('')}</div></div>
    ${o.itemsHtml || `<table class="paper-table"><thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit Price</th><th class="num">Discount</th><th class="num">Tax</th><th class="num">Total</th></tr></thead><tbody>${rows}</tbody></table>`}
    ${t ? `<div class="paper-bottom"><div class="paper-notes">${o.notes ? `<div class="paper-label">Notes</div><p>${esc(o.notes)}</p>` : ''}${o.terms ? `<div class="paper-label">Terms</div><p>${esc(o.terms)}</p>` : ''}${o.bank ? `<div class="paper-label">Payment details</div><p>${esc(o.bank)}</p>` : ''}</div>
      <dl class="paper-totals"><div><dt>Subtotal</dt><dd>${formatCurrency(t.subtotal)}</dd></div><div><dt>Discount</dt><dd>−${formatCurrency(t.discount)}</dd></div><div><dt>Tax</dt><dd>${formatCurrency(t.tax)}</dd></div>${t.shipping ? `<div><dt>Shipping</dt><dd>${formatCurrency(t.shipping)}</dd></div>` : ''}<div class="grand"><dt>Grand Total</dt><dd>${formatCurrency(t.total)}</dd></div>${paid !== null ? `<div><dt>Paid</dt><dd>${formatCurrency(paid)}</dd></div><div class="due"><dt>Balance Due</dt><dd>${formatCurrency(Docs.balance(o.doc) || (['Draft'].includes(o.doc.status) ? t.total - paid : 0))}</dd></div>` : ''}</dl></div>` : (o.bottomHtml || '')}
    <footer class="paper-foot">${esc(o.footer || DB.data.settings.invoice.footer)}</footer></article>`;
}
/** Downloads a standalone HTML copy of a printable document. */
function downloadDocument(name, paperEl) {
  const css = `body{font:14px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d2433;background:#f3f4f6;margin:0;padding:24px}.paper{background:#fff;max-width:820px;margin:auto;padding:40px;border:1px solid #e3e6ea}.paper-head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #0b7a5e;padding-bottom:16px}.paper-brand{display:flex;gap:10px;align-items:center}.paper-logo svg{width:36px;height:36px;color:#0b7a5e}.paper-company{font-weight:700;font-size:18px}.paper-tag,.paper-from,.pi-sku{color:#667085;font-size:12px}.paper-from{text-align:right}.paper-title-row{display:flex;justify-content:space-between;align-items:center;margin:20px 0}.paper-title{margin:0;letter-spacing:.08em}.paper-number{color:#667085}.paper-parties{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px}.paper-label{text-transform:uppercase;font-size:11px;color:#667085;letter-spacing:.06em;margin-bottom:4px}.paper-meta div{display:flex;justify-content:space-between;gap:8px}.paper-meta span{color:#667085}table{width:100%;border-collapse:collapse}th{background:#f3f5f7;text-align:left;font-size:12px;padding:8px}td{padding:8px;border-bottom:1px solid #eef0f3}.num{text-align:right}.paper-bottom{display:flex;justify-content:space-between;gap:24px;margin-top:20px}.paper-totals{min-width:260px;margin:0}.paper-totals div{display:flex;justify-content:space-between;padding:4px 0}.paper-totals dd{margin:0}.grand,.due{font-weight:700;border-top:1px solid #d0d5dd}.paper-foot{margin-top:32px;text-align:center;color:#667085;font-size:12px}.badge{padding:2px 8px;border-radius:10px;background:#eef0f3;font-size:12px}`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(name)}</title><style>${css}</style></head><body>${paperEl.outerHTML}</body></html>`;
  downloadFile(`${name}.html`, html, 'text/html;charset=utf-8');
  showToast(`${name} downloaded`);
}
/** "Send by email" simulation used by invoices, quotations and POs. */
function sendDialog({ title, to, subject, message, onSend }) {
  formModal({ title, submitText: 'Send', fields: [
    { name: 'to', label: 'To', type: 'email', required: true, full: true }, { name: 'subject', label: 'Subject', type: 'text', required: true, full: true },
    { name: 'message', label: 'Message', type: 'textarea', rows: 5, full: true }, { name: 'attach', label: 'Attach PDF copy', type: 'checkbox', full: true },
  ], values: { to, subject, message, attach: true }, onSubmit: (v) => { onSend(v); showToast(`Email sent to ${v.to}`); } });
}
