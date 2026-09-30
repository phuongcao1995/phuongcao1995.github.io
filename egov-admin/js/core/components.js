/* Reusable UI components. All render HTML strings or bind to host elements. */
window.GA = window.GA || {};
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon;
  const ui = {};

  /* ---------- Lookups ---------- */
  ui.dept = (id) => (GA.store.all('departments').find((d) => d.id === id) || { name: id || '—', short: id || '—' });
  ui.officer = (id) => (GA.store.all('officers').find((o) => o.id === id) || null);
  ui.officerName = (id) => { const o = ui.officer(id); return o ? o.name : '<span class="muted">Unassigned</span>'; };

  /* ---------- Status badges ---------- */
  const TONES = {
    ok: ['Approved', 'Completed', 'Active', 'Operating', 'Paid', 'Registered', 'Valid', 'Resolved', 'Signed', 'Issued', 'Verified', 'Success', 'Accepted', 'Level 2', 'Online', 'Receiving pension', 'Uploaded', 'Checked in'],
    info: ['Submitted', 'Under Review', 'Processing', 'Assigned', 'Investigating', 'Awaiting signature', 'Booked', 'Received', 'Drafting', 'Pending review', 'Amended', 'Online & counter', 'Level 1', 'Individual', 'Business', 'Household'],
    warn: ['Additional Information Required', 'Waiting for Information', 'Due soon', 'Pending', 'Partially paid', 'Temporarily suspended', 'Suspended', 'Mortgaged', 'Pending transfer', 'Pending registration', 'Urgent', 'High', 'Transfer pending', 'Pending verification', 'Under amendment', 'Reserved', 'Missing', 'Awaiting receipt', 'Medium', 'Temporarily absent', 'Under dissolution', 'Late'],
    bad: ['Rejected', 'Expired', 'Overdue', 'Disputed', 'Dissolved', 'Very urgent', 'Failed', 'Locked', 'Deregistered', 'Seized', 'In debt', 'Invalid', 'No-show', 'Deceased', 'Counter only'],
  };
  const toneMap = {};
  Object.keys(TONES).forEach((k) => TONES[k].forEach((s) => { toneMap[s] = k; }));
  ui.tone = (s) => toneMap[s] || 'neu';
  ui.badge = (s, label) => { if (!s) return '—'; const tn = ui.tone(s); return `<span class="badge ${tn === 'neu' ? '' : 'b-' + tn}">${esc(t(label || s))}</span>`; };
  ui.priority = (p) => (p === 'Normal' ? `<span class="badge plain">${t('Normal')}</span>` : ui.badge(p === 'High' ? 'High' : p));

  /* ---------- Toasts ---------- */
  ui.toast = (msg, type) => {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'info');
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `${icon(type === 'success' ? 'checkcircle' : type === 'error' || type === 'warning' ? 'alert' : 'info')}<div>${msg}</div><button class="t-close" aria-label="${t('Close')}">${icon('x', 'i-sm')}</button>`;
    root.appendChild(el);
    const kill = () => el.remove();
    el.querySelector('.t-close').onclick = kill;
    setTimeout(kill, 4800);
  };

  /* ---------- Modal ---------- */
  ui.modal = (o) => {
    const root = document.getElementById('modal-root');
    const prev = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    const id = 'm' + Math.random().toString(36).slice(2, 7);
    wrap.innerHTML = `<div class="modal ${o.size || ''}" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="modal-head"><div><h2 id="${id}">${o.title}</h2>${o.subtitle ? `<div class="m-sub">${o.subtitle}</div>` : ''}</div>
      <button class="icon-btn" data-close aria-label="${t('Close')}">${icon('x')}</button></div>
      <div class="modal-body ${o.flush ? 'flush' : ''}">${o.body || ''}</div>
      ${o.actions && o.actions.length ? `<div class="modal-foot">${o.actions.map((a, i) => `<button class="btn ${a.variant ? 'btn-' + a.variant : ''} ${a.left ? 'left' : ''}" data-act="${i}">${a.icon ? icon(a.icon) : ''}${a.label}</button>`).join('')}</div>` : ''}
    </div>`;
    root.appendChild(wrap);
    document.body.style.overflow = 'hidden';
    const m = { el: wrap.querySelector('.modal'), body: wrap.querySelector('.modal-body') };
    m.close = () => {
      wrap.remove();
      if (!root.children.length) document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey, true);
      if (prev && prev.focus) prev.focus();
      if (o.onClose) o.onClose();
    };
    function onKey(e) {
      if (!root.lastElementChild || root.lastElementChild !== wrap) return;
      if (e.key === 'Escape') { e.stopPropagation(); m.close(); }
      if (e.key === 'Tab') {
        const f = U.$$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', m.el).filter((x) => !x.disabled && x.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener('keydown', onKey, true);
    wrap.addEventListener('mousedown', (e) => { if (e.target === wrap && !o.sticky) m.close(); });
    wrap.querySelector('[data-close]').onclick = m.close;
    U.$$('[data-act]', wrap.querySelector('.modal-foot') || document.createElement('div')).forEach((b) => {
      b.onclick = () => { const a = o.actions[+b.dataset.act]; if (a.onClick) a.onClick(m); else m.close(); };
    });
    if (o.onOpen) o.onOpen(m);
    setTimeout(() => { const f = m.el.querySelector('input:not([type=hidden]):not([readonly]), select, textarea') || m.el.querySelector('[data-close]'); if (f) f.focus(); }, 30);
    return m;
  };

  ui.confirm = (o) => new Promise((resolve) => {
    let done = false;
    ui.modal({
      title: o.title || t('Confirm'), body: `<p>${o.message}</p>${o.input ? `<div class="field mt-2"><label for="cf-in">${o.input}${o.required ? '<span class="req">*</span>' : ''}</label><textarea id="cf-in" rows="3"></textarea><div class="err">${t('This field is required.')}</div></div>` : ''}`,
      actions: [
        { label: t('Cancel') },
        { label: o.confirmLabel || t('Confirm'), variant: o.danger ? 'danger' : 'primary', onClick: (m) => {
          const inp = m.el.querySelector('#cf-in');
          if (inp && o.required && !inp.value.trim()) { inp.closest('.field').classList.add('invalid'); inp.focus(); return; }
          done = true; m.close(); resolve(inp ? inp.value.trim() || true : true);
        } },
      ],
      onClose: () => { if (!done) resolve(false); },
    });
  });

  /* ---------- Layout helpers ---------- */
  ui.pageHeader = (o) => `<div class="page-head"><div>
      ${o.crumbs ? `<nav class="crumbs" aria-label="Breadcrumb">${o.crumbs.map((c, i) => (i ? '<span class="sep">/</span>' : '') + (c.href ? `<a href="${c.href}">${esc(c.label)}</a>` : `<span>${esc(c.label)}</span>`)).join('')}</nav>` : ''}
      <h1 tabindex="-1" data-page-title>${o.title}</h1>${o.subtitle ? `<div class="sub">${o.subtitle}</div>` : ''}</div>
      ${o.actions ? `<div class="head-actions">${o.actions}</div>` : ''}</div>`;

  ui.kpis = (items, cls) => `<div class="kpis ${cls || ''}">${items.map((k) => {
    const tag = k.href ? 'a' : 'div';
    return `<${tag} class="kpi" ${k.href ? `href="${k.href}"` : ''} style="--kc:${k.color || 'var(--blue)'}">
      <div class="k-label">${k.icon ? icon(k.icon, 'i-sm') : ''}${esc(t(k.label))}</div>
      <div class="k-value">${k.value}</div>${k.meta ? `<div class="k-meta">${k.meta}</div>` : ''}</${tag}>`;
  }).join('')}</div>`;

  ui.panel = (o) => `<section class="panel ${o.cls || ''}" ${o.id ? `id="${o.id}"` : ''}>
    ${o.title ? `<div class="panel-head"><div><h2>${o.title}</h2>${o.sub ? `<div class="ph-sub">${o.sub}</div>` : ''}</div>${o.actions ? `<div class="ph-actions">${o.actions}</div>` : ''}</div>` : ''}
    <div class="panel-body ${o.flush ? 'flush' : ''}" ${o.bodyId ? `id="${o.bodyId}"` : ''}>${o.body || ''}</div></section>`;

  ui.dl = (rows, cls) => `<dl class="dl ${cls || ''}">${rows.filter(Boolean).map(([k, v]) => `<dt>${esc(t(k))}</dt><dd>${v === undefined || v === null || v === '' ? '—' : v}</dd>`).join('')}</dl>`;

  ui.timeline = (items) => items.length ? `<ol class="timeline">${items.map((x) => `<li class="${x.tone ? 't-' + x.tone : ''}"><div class="t-title">${x.title}</div><div class="t-meta">${x.meta || ''}</div>${x.note ? `<div class="t-note">${x.note}</div>` : ''}</li>`).join('')}</ol>` : ui.empty('No history recorded yet.');

  ui.stepper = (steps) => `<ol class="stepper">${steps.map((s) => `<li class="${s.state || ''}">${esc(t(s.label))}${s.sub ? `<div class="xs muted">${s.sub}</div>` : ''}</li>`).join('')}</ol>`;

  ui.empty = (msg, action) => `<div class="empty-state">${icon('inbox')}<h3>${esc(t(msg))}</h3>${action || ''}</div>`;

  ui.stars = (n) => `<span class="stars" aria-label="${n} of 5">${[1, 2, 3, 4, 5].map((i) => icon('star', i <= n ? 'on' : '')).join('')}</span>`;

  ui.avatar = (name, cls) => `<span class="avatar ${cls || ''}" aria-hidden="true">${esc(U.initials(name))}</span>`;

  /* ---------- Tabs ---------- */
  ui.tabs = (tabs, o) => {
    o = o || {};
    const id = o.id || 'tb' + Math.random().toString(36).slice(2, 7);
    const active = o.active || tabs[0].id;
    return `<div class="${o.cls || ''}" data-tabs="${id}"><div class="tabs" role="tablist">${tabs.map((tb) => `<button class="tab" role="tab" id="${id}-${tb.id}-tab" aria-controls="${id}-${tb.id}" aria-selected="${tb.id === active}" tabindex="${tb.id === active ? 0 : -1}" data-tab="${tb.id}">${tb.icon ? icon(tb.icon, 'i-sm') : ''}${esc(t(tb.label))}${tb.count !== undefined ? `<span class="t-count">${tb.count}</span>` : ''}</button>`).join('')}</div></div>
      ${o.panels === false ? '' : tabs.map((tb) => `<div class="tab-panel" role="tabpanel" id="${id}-${tb.id}" aria-labelledby="${id}-${tb.id}-tab" ${tb.id === active ? '' : 'hidden'}>${tb.content || ''}</div>`).join('')}`;
  };
  ui.bindTabs = (root, onChange) => {
    U.$$('[data-tabs]', root).forEach((wrap) => {
      if (wrap.dataset.bound) return;
      wrap.dataset.bound = '1';
      const id = wrap.dataset.tabs;
      const btns = U.$$('[data-tab]', wrap);
      const activate = (b, focus) => {
        btns.forEach((x) => { const on = x === b; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; const p = document.getElementById(id + '-' + x.dataset.tab); if (p) p.hidden = !on; });
        if (focus) b.focus();
        if (onChange) onChange(b.dataset.tab, id);
      };
      btns.forEach((b, i) => {
        b.addEventListener('click', () => activate(b));
        b.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowRight') activate(btns[(i + 1) % btns.length], true);
          if (e.key === 'ArrowLeft') activate(btns[(i - 1 + btns.length) % btns.length], true);
        });
      });
    });
  };

  /* ---------- Forms ---------- */
  /* field: {key,label,type,required,options|optionsFn(values),dependsOn,pattern,patternMsg,min,max,full,help,placeholder,readonly,validate(v,values)} */
  const optList = (f, values) => {
    let opts = f.optionsFn ? f.optionsFn(values || {}) : typeof f.options === 'function' ? f.options() : f.options || [];
    return opts.map((o) => (typeof o === 'object' ? o : { value: o, label: t(o) }));
  };
  ui.fieldHTML = (f, values, prefix) => {
    const v = values && values[f.key] !== undefined && values[f.key] !== null ? values[f.key] : f.default !== undefined ? f.default : '';
    const id = (prefix || 'f') + '-' + f.key;
    if (f.type === 'section') return `<div class="form-section-title">${esc(t(f.label))}</div>`;
    let input;
    const common = `id="${id}" name="${f.key}" ${f.required ? 'required aria-required="true"' : ''} ${f.readonly ? 'readonly' : ''} aria-describedby="${id}-err"`;
    if (f.type === 'select') input = `<select ${common}>${f.required && !f.noBlank ? `<option value="">${t('Select…')}</option>` : f.noBlank ? '' : '<option value="">—</option>'}${optList(f, values).map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
    else if (f.type === 'textarea') input = `<textarea ${common} rows="${f.rows || 4}" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
    else if (f.type === 'checkbox') return `<div class="field ${f.full ? 'full' : ''}"><label class="check"><input type="checkbox" ${common} ${v ? 'checked' : ''}><span>${esc(t(f.label))}</span></label></div>`;
    else input = `<input type="${f.type || 'text'}" ${common} value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} ${f.step ? `step="${f.step}"` : ''} ${f.inputmode ? `inputmode="${f.inputmode}"` : ''}>`;
    return `<div class="field ${f.full ? 'full' : ''}" data-field="${f.key}"><label for="${id}">${esc(t(f.label))}${f.required ? '<span class="req" aria-hidden="true">*</span>' : ''}</label>${input}${f.help ? `<div class="help">${esc(t(f.help))}</div>` : ''}<div class="err" id="${id}-err"></div></div>`;
  };
  ui.formHTML = (fields, values, prefix) => `<form class="form-grid" novalidate>${fields.map((f) => ui.fieldHTML(f, values, prefix)).join('')}</form>`;
  ui.formValues = (form, fields) => {
    const out = {};
    fields.forEach((f) => {
      if (f.type === 'section') return;
      const el = form.elements[f.key];
      if (!el) return;
      if (f.type === 'checkbox') out[f.key] = el.checked;
      else if (f.type === 'number') out[f.key] = el.value === '' ? '' : Number(el.value);
      else out[f.key] = el.value.trim();
    });
    return out;
  };
  ui.validate = (form, fields) => {
    const values = ui.formValues(form, fields);
    let first = null;
    fields.forEach((f) => {
      if (f.type === 'section') return;
      const wrap = form.querySelector(`[data-field="${f.key}"]`);
      if (!wrap) return;
      const v = values[f.key];
      let msg = '';
      if (f.required && (v === '' || v === undefined)) msg = t('This field is required.');
      else if (v !== '' && f.pattern && !new RegExp(f.pattern).test(String(v))) msg = t(f.patternMsg || 'Check the format of this field.');
      else if (v !== '' && f.type === 'number' && f.min !== undefined && v < f.min) msg = t('Enter a value of at least {min}.', { min: U.num(f.min) });
      else if (v !== '' && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) msg = t('Enter a valid email address, like name@example.vn.');
      else if (v !== '' && f.validate) msg = f.validate(v, values) || '';
      wrap.classList.toggle('invalid', !!msg);
      const err = wrap.querySelector('.err'); if (err) err.textContent = msg;
      const inp = form.elements[f.key]; if (inp) inp.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (msg && !first) first = inp;
    });
    if (first) first.focus();
    return { ok: !first, values };
  };
  /* Re-render dependent selects (e.g. province -> district -> ward). */
  ui.bindDependents = (form, fields) => {
    form.addEventListener('change', (e) => {
      const key = e.target.name;
      fields.filter((f) => f.dependsOn === key).forEach((f) => {
        const vals = ui.formValues(form, fields);
        const sel = form.elements[f.key];
        sel.innerHTML = `<option value="">${t('Select…')}</option>` + optList(f, vals).map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  };

  /* Open a create/edit form in a modal. */
  ui.formModal = (o) => {
    const m = ui.modal({
      title: o.title, subtitle: o.subtitle, size: o.size || 'lg',
      body: (o.intro || '') + ui.formHTML(o.fields, o.values, 'fm'),
      actions: [{ label: t('Cancel') }, { label: o.submitLabel || t('Save changes'), variant: 'primary', onClick: (mm) => {
        const form = mm.el.querySelector('form');
        const r = ui.validate(form, o.fields);
        if (!r.ok) { ui.toast(t('Some fields need attention. Check the highlighted fields.'), 'error'); return; }
        const res = o.onSubmit(r.values, mm);
        if (res !== false) mm.close();
      } }],
      onOpen: (mm) => { const form = mm.el.querySelector('form'); ui.bindDependents(form, o.fields); form.addEventListener('submit', (e) => e.preventDefault()); if (o.onOpen) o.onOpen(mm); },
    });
    return m;
  };

  /* ---------- Dropdowns (global delegation) ---------- */
  document.addEventListener('click', (e) => {
    const trg = e.target.closest('[data-dd-toggle]');
    U.$$('.dd.open').forEach((d) => { if (!trg || d !== trg.closest('.dd')) { if (!d.contains(e.target) || e.target.closest('.dd-item')) { d.classList.remove('open'); const b = d.querySelector('[data-dd-toggle]'); if (b) b.setAttribute('aria-expanded', 'false'); } } });
    if (trg) { const d = trg.closest('.dd'); const open = !d.classList.contains('open'); d.classList.toggle('open', open); trg.setAttribute('aria-expanded', String(open)); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') U.$$('.dd.open').forEach((d) => { d.classList.remove('open'); const b = d.querySelector('[data-dd-toggle]'); if (b) { b.setAttribute('aria-expanded', 'false'); b.focus(); } }); });

  /* ---------- Data table ---------- */
  class DataTable {
    constructor(host, o) {
      this.host = host;
      this.o = Object.assign({ filters: [], searchKeys: [], actions: '', exportName: 'export', emptyText: 'No records match these filters.', pageSize: GA.store.setting('pageSize') || 10 }, o);
      this.s = { q: '', f: {}, sort: this.o.defaultSort || null, dir: this.o.defaultDir || 'desc', page: 1, from: '', to: '', size: this.o.pageSize };
      if (this.o.initialFilters) Object.assign(this.s.f, this.o.initialFilters);
      this.mount();
    }
    colValue(c, r) { if (typeof c.sort === 'function') return c.sort(r); if (typeof c.sort === 'string') return r[c.sort]; return r[c.key]; }
    filtered() {
      const o = this.o, s = this.s;
      let rows = (typeof o.rows === 'function' ? o.rows() : o.rows).slice();
      if (s.q) {
        const q = U.norm(s.q);
        rows = rows.filter((r) => o.searchKeys.some((k) => U.norm(typeof k === 'function' ? k(r) : r[k]).includes(q)));
      }
      o.filters.forEach((f) => { const v = s.f[f.key]; if (v) rows = rows.filter((r) => (f.match ? f.match(r, v) : String(r[f.key]) === v)); });
      if (o.dateKey && (s.from || s.to)) rows = rows.filter((r) => { const d = String(r[o.dateKey] || '').slice(0, 10); return (!s.from || d >= s.from) && (!s.to || d <= s.to); });
      if (s.sort) {
        const c = o.columns.find((x) => x.key === s.sort);
        if (c) rows.sort((a, b) => { let x = this.colValue(c, a), y = this.colValue(c, b); if (typeof x === 'number' && typeof y === 'number') return s.dir === 'asc' ? x - y : y - x; x = String(x === undefined || x === null ? '' : x); y = String(y === undefined || y === null ? '' : y); return s.dir === 'asc' ? x.localeCompare(y, 'vi') : y.localeCompare(x, 'vi'); });
      }
      return rows;
    }
    mount() {
      const o = this.o;
      const filters = o.filters.map((f) => {
        const opts = (typeof f.options === 'function' ? f.options() : f.options).map((v) => (typeof v === 'object' ? v : { value: v, label: t(v) }));
        return `<select data-f="${f.key}" aria-label="${esc(t(f.label))}"><option value="">${esc(t(f.all || 'All'))}</option>${opts.map((v) => `<option value="${esc(v.value)}" ${this.s.f[f.key] === v.value ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select>`;
      }).join('');
      const dates = o.dateKey ? `<div class="date-range"><label>${t(o.dateLabel || 'From')} <input type="date" data-d="from" aria-label="${t('From date')}"></label><label>${t('To')} <input type="date" data-d="to" aria-label="${t('To date')}"></label></div>` : '';
      this.host.innerHTML = `<div class="dt">
        <div class="dt-toolbar">
          <div class="dt-search">${icon('search')}<input type="search" placeholder="${esc(o.searchPlaceholder || t('Search'))}" aria-label="${esc(o.searchPlaceholder || t('Search'))}"></div>
          <div class="dt-filters">${filters}${dates}</div>
          <div class="dt-actions">${o.actions}${o.noExport ? '' : `<button class="btn btn-sm" data-export>${icon('download', 'i-sm')}${t('Export CSV')}</button>`}</div>
        </div>
        <div class="table-wrap"><table class="table"><caption class="sr-only">${esc(o.caption || '')}</caption><thead></thead><tbody></tbody></table></div>
        <div class="dt-footer"></div></div>`;
      const h = this.host;
      const inp = h.querySelector('.dt-search input');
      inp.addEventListener('input', U.debounce(() => { this.s.q = inp.value; this.s.page = 1; this.refresh(); }, 160));
      U.$$('[data-f]', h).forEach((sel) => sel.addEventListener('change', () => { this.s.f[sel.dataset.f] = sel.value; this.s.page = 1; this.refresh(); }));
      U.$$('[data-d]', h).forEach((d) => d.addEventListener('change', () => { this.s[d.dataset.d] = d.value; this.s.page = 1; this.refresh(); }));
      const ex = h.querySelector('[data-export]');
      if (ex) ex.addEventListener('click', () => { const cols = o.columns.filter((c) => c.label && !c.noExport); U.download(`${o.exportName}-${U.today()}.csv`, U.toCSV(this.filtered(), cols.map((c) => ({ label: t(c.label), csv: c.csv || ((r) => (c.render ? c.render(r) : r[c.key])) }))), 'text/csv;charset=utf-8'); ui.toast(t('CSV exported.'), 'success'); });
      const tbody = h.querySelector('tbody');
      tbody.addEventListener('click', (e) => {
        const b = e.target.closest('[data-row-act]');
        const tr = e.target.closest('tr[data-i]');
        if (!tr) return;
        const row = this.pageRows[+tr.dataset.i];
        if (b) { e.stopPropagation(); if (o.onAction) o.onAction(b.dataset.rowAct, row, this); return; }
        if (e.target.closest('a, button, input, select')) return;
        if (o.onRowClick) o.onRowClick(row, this);
      });
      tbody.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('tr[data-i]') && o.onRowClick) o.onRowClick(this.pageRows[+e.target.dataset.i], this); });
      h.querySelector('thead').addEventListener('click', (e) => {
        const th = e.target.closest('th[data-sort]'); if (!th) return;
        const k = th.dataset.sort;
        if (this.s.sort === k) this.s.dir = this.s.dir === 'asc' ? 'desc' : 'asc'; else { this.s.sort = k; this.s.dir = 'asc'; }
        this.refresh();
      });
      h.querySelector('.dt-footer').addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (b && !b.disabled) { this.s.page = +b.dataset.page; this.refresh(); h.querySelector('.table-wrap').scrollIntoView({ block: 'nearest' }); } });
      h.querySelector('.dt-footer').addEventListener('change', (e) => { if (e.target.matches('[data-size]')) { this.s.size = +e.target.value; this.s.page = 1; this.refresh(); } });
      this.refresh();
    }
    refresh() {
      const o = this.o, s = this.s, h = this.host;
      const cols = o.columns.concat(o.rowActions ? [{ key: '__act', label: '', cls: 'actions-cell' }] : []);
      h.querySelector('thead').innerHTML = '<tr>' + cols.map((c) => {
        const sortable = c.sort !== false && c.key !== '__act' && c.label;
        const ind = s.sort === c.key ? (s.dir === 'asc' ? '▲' : '▼') : '';
        return `<th scope="col" class="${sortable ? 'sortable' : ''} ${c.cls || ''}" ${sortable ? `data-sort="${c.key}" aria-sort="${s.sort === c.key ? (s.dir === 'asc' ? 'ascending' : 'descending') : 'none'}"` : ''} ${c.width ? `style="width:${c.width}"` : ''}>${c.label ? esc(t(c.label)) : '<span class="sr-only">' + t('Actions') + '</span>'}${sortable ? `<span class="sort-ind" aria-hidden="true">${ind}</span>` : ''}</th>`;
      }).join('') + '</tr>';
      const rows = this.filtered();
      const total = rows.length, size = s.size, pages = Math.max(1, Math.ceil(total / size));
      if (s.page > pages) s.page = pages;
      const start = (s.page - 1) * size;
      this.pageRows = rows.slice(start, start + size);
      const tbody = h.querySelector('tbody');
      if (!total) tbody.innerHTML = `<tr><td colspan="${cols.length}"><div class="table-empty">${icon('search')}${esc(t(o.emptyText))}<div class="xs mt-1">${t('Try clearing the search or choosing a different filter.')}</div></div></td></tr>`;
      else tbody.innerHTML = this.pageRows.map((r, i) => `<tr data-i="${i}" ${o.onRowClick ? 'class="clickable" tabindex="0"' : ''}>${o.columns.map((c) => `<td class="${c.cls || ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}${o.rowActions ? `<td class="actions-cell">${o.rowActions(r).map((a) => `<button class="btn btn-icon ${a.danger ? 'danger' : ''}" data-row-act="${a.id}" title="${esc(t(a.label))}" aria-label="${esc(t(a.label))}">${icon(a.icon, 'i-sm')}</button>`).join('')}</td>` : ''}</tr>`).join('');
      const pg = [];
      const add = (p) => pg.push(`<button data-page="${p}" ${p === s.page ? 'aria-current="page"' : ''} aria-label="Page ${p}">${p}</button>`);
      if (pages <= 7) for (let p = 1; p <= pages; p++) add(p);
      else { add(1); if (s.page > 3) pg.push('<span class="gap">…</span>'); for (let p = Math.max(2, s.page - 1); p <= Math.min(pages - 1, s.page + 1); p++) add(p); if (s.page < pages - 2) pg.push('<span class="gap">…</span>'); add(pages); }
      h.querySelector('.dt-footer').innerHTML = `<span>${t('Showing {from}–{to} of {total}', { from: total ? start + 1 : 0, to: Math.min(start + size, total), total })}</span>
        <label class="flex xs">${t('Rows per page')} <select data-size aria-label="${t('Rows per page')}">${[10, 20, 50].map((n) => `<option ${n === size ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <div class="pager"><button data-page="${s.page - 1}" ${s.page <= 1 ? 'disabled' : ''} aria-label="${t('Previous')}">${icon('chevL', 'i-sm')}</button>${pg.join('')}<button data-page="${s.page + 1}" ${s.page >= pages ? 'disabled' : ''} aria-label="${t('Next')}">${icon('chevR', 'i-sm')}</button></div>`;
      if (o.onRefresh) o.onRefresh(rows);
    }
  }
  ui.DataTable = DataTable;
  ui.table = (host, o) => new DataTable(host, o);

  /* Simple static table */
  ui.simpleTable = (cols, rows, empty) => rows.length ? `<div class="table-wrap"><table class="table simple"><thead><tr>${cols.map((c) => `<th class="${c.cls || ''}">${esc(t(c.label))}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.cls || ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : ui.empty(empty || 'No records yet.');

  /* ---------- Charts (SVG, no libraries) ---------- */
  const PALETTE = ['#0B5CAD', '#5AA3E8', '#E8A900', '#15703F', '#C62828', '#6B4FBB', '#0A8C8C', '#8A94A6', '#D9622B', '#123C70'];
  ui.palette = PALETTE;
  const niceMax = (v) => { if (v <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); const f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; };
  const legend = (series) => `<div class="legend">${series.map((s, i) => `<span><i style="background:${s.color || PALETTE[i]}"></i>${esc(t(s.name))}</span>`).join('')}</div>`;

  ui.chart = {
    bar(el, o) {
      const W = 640, H = o.height || 240, pl = 46, pr = 8, pt = 10, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
      const n = o.labels.length, fmt = o.fmt || U.short;
      const totals = o.labels.map((_, i) => (o.stacked ? o.series.reduce((s, se) => s + se.values[i], 0) : Math.max.apply(null, o.series.map((se) => se.values[i]))));
      const max = niceMax(Math.max.apply(null, totals.concat([1])));
      const gw = iw / n, bw = o.stacked ? Math.min(34, gw * 0.58) : Math.min(22, (gw * 0.74) / o.series.length);
      let g = '';
      for (let k = 0; k <= 4; k++) { const y = pt + ih - (ih * k) / 4; g += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text class="lbl" x="${pl - 6}" y="${y + 4}" text-anchor="end">${fmt((max * k) / 4)}</text>`; }
      o.labels.forEach((lb, i) => {
        const cx = pl + gw * i + gw / 2;
        let acc = 0;
        o.series.forEach((se, si) => {
          const v = se.values[i], h = (v / max) * ih, col = se.color || PALETTE[si];
          const x = o.stacked ? cx - bw / 2 : cx - (bw * o.series.length) / 2 + bw * si;
          const y = pt + ih - h - (o.stacked ? acc : 0);
          if (o.stacked) acc += h;
          g += `<rect class="bar" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - (o.stacked ? 0 : 2)).toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="2" fill="${col}" data-tip="${esc(lb)}: ${esc(t(se.name))} ${esc((o.tipFmt || U.num)(v))}"/>`;
        });
        if (n <= 12 || i % Math.ceil(n / 12) === 0) g += `<text class="lbl" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(lb)}</text>`;
      });
      el.innerHTML = `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">${g}</svg>${o.series.length > 1 || o.legend ? legend(o.series) : ''}</div>`;
    },
    line(el, o) {
      const W = 640, H = o.height || 240, pl = 50, pr = 10, pt = 12, pb = 26, iw = W - pl - pr, ih = H - pt - pb;
      const n = o.labels.length, fmt = o.fmt || U.short;
      const max = niceMax(Math.max.apply(null, o.series.flatMap((s) => s.values).concat([1])));
      const min = o.min !== undefined ? o.min : 0;
      const X = (i) => pl + (n === 1 ? iw / 2 : (iw * i) / (n - 1)), Y = (v) => pt + ih - ((v - min) / (max - min)) * ih;
      let g = '';
      for (let k = 0; k <= 4; k++) { const v = min + ((max - min) * k) / 4, y = Y(v); g += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text class="lbl" x="${pl - 6}" y="${y + 4}" text-anchor="end">${fmt(v)}</text>`; }
      o.series.forEach((se, si) => {
        const col = se.color || PALETTE[si];
        const pts = se.values.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
        if (se.area) g += `<path d="M${X(0)},${Y(min)} L${pts.join(' L')} L${X(n - 1)},${Y(min)} Z" fill="${col}" opacity=".1"/>`;
        g += `<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="${se.dash ? 1.6 : 2.4}" ${se.dash ? 'stroke-dasharray="5 4"' : ''} stroke-linejoin="round"/>`;
        if (!se.dash) se.values.forEach((v, i) => { g += `<circle class="pt" cx="${X(i)}" cy="${Y(v)}" r="3.6" fill="#fff" stroke="${col}" stroke-width="2" data-tip="${esc(o.labels[i])}: ${esc(t(se.name))} ${esc((o.tipFmt || U.num)(v))}"/>`; });
      });
      o.labels.forEach((lb, i) => { if (n <= 12 || i % Math.ceil(n / 12) === 0) g += `<text class="lbl" x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(lb)}</text>`; });
      el.innerHTML = `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.aria || '')}">${g}</svg>${legend(o.series)}</div>`;
    },
    donut(el, o) {
      const items = o.items.filter((x) => x.value > 0);
      const total = items.reduce((s, x) => s + x.value, 0) || 1;
      const R = 62, C = 2 * Math.PI * R;
      let off = 0, g = '';
      items.forEach((it, i) => {
        const len = (it.value / total) * C, col = it.color || PALETTE[i % PALETTE.length];
        g += `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${col}" stroke-width="22" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 80 80)" data-tip="${esc(t(it.label))}: ${U.num(it.value)} (${U.pct(it.value, total)}%)" class="bar"/>`;
        off += len;
      });
      el.innerHTML = `<div class="donut-wrap"><svg viewBox="0 0 160 160" role="img" aria-label="${esc(o.aria || '')}"><circle cx="80" cy="80" r="${R}" fill="none" stroke="#EEF2F6" stroke-width="22"/>${g}
        <text x="80" y="78" text-anchor="middle" style="font:700 22px var(--font);fill:var(--ink)">${o.center !== undefined ? o.center : U.num(total)}</text><text x="80" y="96" text-anchor="middle" class="lbl">${esc(t(o.centerLabel || 'Total'))}</text></svg>
        <div class="donut-legend">${items.map((it, i) => `<div><i style="background:${it.color || PALETTE[i % PALETTE.length]}"></i><span>${esc(t(it.label))}</span><b>${U.num(it.value)}</b><em>${U.pct(it.value, total)}%</em></div>`).join('')}</div></div>`;
    },
    hbar(el, o) {
      const max = Math.max.apply(null, o.items.map((x) => (x.parts ? x.parts.reduce((s, p) => s + p, 0) : x.value)).concat([1]));
      el.innerHTML = `<div class="hbars">${o.items.map((it, i) => {
        const tot = it.parts ? it.parts.reduce((s, p) => s + p, 0) : it.value;
        const fills = it.parts ? it.parts.map((p, k) => `<span class="hb-fill" style="width:${(p / max) * 100}%;background:${(o.colors || PALETTE)[k]}" data-tip="${esc(t(it.label))}: ${esc(t((o.partNames || [])[k] || ''))} ${U.num(p)}"></span>`).join('') : `<span class="hb-fill" style="width:${(tot / max) * 100}%;background:${it.color || o.color || PALETTE[0]}" data-tip="${esc(t(it.label))}: ${esc((o.fmt || U.num)(tot))}"></span>`;
        return `<div class="hbar"><span class="hb-label" title="${esc(t(it.label))}">${esc(t(it.label))}</span><span class="hb-track">${fills}</span><span class="hb-val">${(o.fmt || U.num)(tot)}</span></div>`;
      }).join('')}</div>${o.partNames ? legend(o.partNames.map((n, k) => ({ name: n, color: (o.colors || PALETTE)[k] }))) : ''}`;
    },
  };

  /* Chart tooltip */
  let tip;
  document.addEventListener('mouseover', (e) => {
    const trg = e.target.closest && e.target.closest('[data-tip]');
    if (!tip) { tip = document.createElement('div'); tip.className = 'chart-tip'; document.body.appendChild(tip); }
    if (trg) { tip.textContent = trg.getAttribute('data-tip'); tip.style.display = 'block'; } else tip.style.display = 'none';
  });
  document.addEventListener('mousemove', (e) => { if (tip && tip.style.display === 'block') { tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; } });

  GA.ui = ui;
})(window.GA);
