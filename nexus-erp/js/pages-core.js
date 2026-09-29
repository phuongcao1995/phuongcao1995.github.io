/* ==========================================================================
   NEXUS ERP — pages-core.js
   Shared page helpers + Dashboard, Notifications, Employees and Settings.
   ========================================================================== */
'use strict';

/* ---------- Shared page helpers ---------- */
/** Standard row action menu: View / Edit / Duplicate / Print / Delete (gated by permissions). */
function crudActions({ view, edit, duplicate, print, del, extra = [] }) {
  return [
    view && { label: 'View', icon: 'eye', onClick: view },
    edit && { label: 'Edit', icon: 'edit', onClick: edit, perm: 'edit' },
    duplicate && { label: 'Duplicate', icon: 'copy', onClick: duplicate, perm: 'create' },
    print && { label: 'Print', icon: 'printer', onClick: print },
    ...extra,
    del && { divider: true },
    del && { label: 'Delete', icon: 'trash', onClick: del, perm: 'delete', danger: true },
  ].filter(Boolean);
}
/** Confirm + delete + toast + refresh. fn returns {error} to abort. */
async function confirmDelete(what, fn, message = 'This action cannot be undone.') {
  if (!Auth.can('delete')) { showToast('Your role does not allow deleting records.', 'error'); return; }
  if (!(await confirmDialog({ title: `Delete ${what}?`, message, confirmText: 'Delete' }))) return;
  const r = fn();
  if (r && r.error) { showToast(r.error, 'error'); return; }
  showToast(`${what} deleted successfully`);
  App.refresh();
}
/** Navigates to a document page and triggers print once rendered. */
function printRoute(route) { navigateTo(route); setTimeout(() => window.print(), 450); }
const guard = (perm, fn) => (...a) => { if (!Auth.can(perm)) { showToast(`Your role does not allow this action (${perm}).`, 'error'); return; } return fn(...a); };
const partyName = (p) => (p.partyType === 'supplier' ? Lookup.supplierName(p.partyId) : Lookup.customerName(p.partyId));
const partyLink = (p) => (p.partyType === 'supplier' ? link('supplier/' + p.partyId, Lookup.supplierName(p.partyId)) : link('customer/' + p.partyId, Lookup.customerName(p.partyId)));
const empLink = (id) => (id ? link('employees?emp=' + id, Lookup.employeeName(id)) : '—');
/** Rolling window helper: last n days vs the n days before. */
function rolling(n = 30) { const to = today(); const from = addDays(to, -(n - 1)); return { from, to, pfrom: addDays(from, -n), pto: addDays(from, -1) }; }
/** Inline settings-style form rendered in a card (not a modal). */
function inlineForm(el, { fields, values, submitText = 'Save changes', onSave, disabled }) {
  el.innerHTML = `<form novalidate class="inline-form"><div class="form-grid">${fields.map((f) => renderField({ ...f, disabled: disabled || f.disabled }, values[f.name])).join('')}</div>${disabled ? '' : `<div class="form-actions"><button type="submit" class="btn btn-primary">${esc(submitText)}</button></div>`}</form>`;
  const form = $('form', el);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = readFields(form, fields);
    fields.forEach((f) => { if ((f.type === 'number' || f.type === 'currency') && v['_raw_' + f.name] !== '' && !Number.isFinite(v[f.name])) v[f.name] = NaN; delete v['_raw_' + f.name]; });
    if (!showErrors(form, validateFields(fields, v))) { showToast('Please fix the highlighted fields.', 'error'); return; }
    const r = onSave(v);
    if (r && r.error) showToast(r.error, 'error');
  });
}

/* ==========================================================================
   Dashboard
   ========================================================================== */
Pages.dashboard = (el) => {
  const w = rolling(30);
  const cur = Accounting.pnl(w.from, w.to); const prev = Accounting.pnl(w.pfrom, w.pto);
  const curExp = cur.totalCogs + cur.totalOpex; const prevExp = prev.totalCogs + prev.totalOpex;
  const openInv = DB.all('invoices').filter(Docs.isOpen);
  const cash = Accounting.cashBalance(); const cashPrev = Accounting.cashBalance(w.pto);
  const months = Accounting.monthly(9);
  const u = Auth.user();
  const hour = new Date().getHours();

  // sales by category (invoiced, net of discounts, last 9 months)
  const since = periodStart();
  const cats = { Electronics: 0, Software: 0, Services: 0, Equipment: 0, 'Office Supplies': 0 };
  DB.all('invoices').filter((i) => !['Draft', 'Cancelled'].includes(i.status) && i.date >= since).forEach((i) => i.items.forEach((it) => { const p = DB.get('products', it.productId); const c = p ? p.category : 'Services'; cats[c] = (cats[c] || 0) + Calc.line(it).net; }));

  // pipeline
  const q = DB.all('quotations'); const o = DB.all('orders'); const inv = DB.all('invoices');
  const tot = (arr) => sum(arr, (d) => Calc.doc(d).total);
  const leads = DB.all('customers').filter((c) => c.status === 'Lead'); const draftQ = q.filter((x) => x.status === 'Draft');
  const openQ = q.filter((x) => ['Sent', 'Accepted'].includes(Sales.quoteStatus(x)));
  const openO = o.filter((x) => ['Draft', 'Confirmed', 'Processing', 'Ready'].includes(x.status));
  const delivering = o.filter((x) => ['Shipped', 'Delivered'].includes(x.status) || (x.status === 'Completed' && !x.invoiceId));
  const paid90 = inv.filter((x) => Docs.status(x) === 'Paid' && x.date >= addDays(today(), -90));

  const payRows = DB.all('payments').slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id.localeCompare(a.id))).slice(0, 6);
  const orderRows = o.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);
  const low = Inventory.lowStock().sort((a, b) => Inventory.total(a) / (a.reorder || 1) - Inventory.total(b) / (b.reorder || 1)).slice(0, 6);

  el.innerHTML = `${pageHeader({ title: `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${esc(u.name.split(' ')[0])}`, subtitle: `Here’s how ${esc(DB.data.settings.company.name)} is performing · ${formatDate(today())}`,
    actions: `${Auth.canView('orders') ? btn('New order', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="new-order"', perm: 'create' }) : ''}${Auth.canView('billing') ? btn('New invoice', { icon: 'file', attrs: 'data-act="new-invoice"', perm: 'create' }) : ''}` })}
    <div class="ledger-strip">
      ${kpiCard({ label: 'Revenue', value: formatCurrency(cur.totalRevenue, true), delta: pctChange(cur.totalRevenue, prev.totalRevenue), deltaLabel: 'vs previous 30 days', nav: 'reports?cat=sales&report=sales-month', icon: 'trending' })}
      ${kpiCard({ label: 'Expenses', value: formatCurrency(curExp, true), delta: pctChange(curExp, prevExp), deltaLabel: 'vs previous 30 days', invert: true, nav: 'expenses', icon: 'receipt' })}
      ${kpiCard({ label: 'Net Profit', value: formatCurrency(cur.netProfit, true), delta: pctChange(cur.netProfit, prev.netProfit), deltaLabel: 'vs previous 30 days', nav: 'finreports', icon: 'pie', tone: cur.netProfit < 0 ? 'neg' : '' })}
      ${kpiCard({ label: 'Cash Balance', value: formatCurrency(cash, true), delta: pctChange(cash, cashPrev), deltaLabel: 'vs 30 days ago', nav: 'finance', icon: 'dollar' })}
      ${kpiCard({ label: 'Accounts Receivable', value: formatCurrency(Stats.arTotal(), true), sub: `${DB.all('invoices').filter((i) => Docs.status(i) === 'Overdue').length} overdue invoices`, nav: 'ar', icon: 'arrowIn' })}
      ${kpiCard({ label: 'Accounts Payable', value: formatCurrency(Stats.apTotal(), true), sub: `${DB.all('bills').filter(Docs.isOpen).length} open supplier invoices`, nav: 'ap', icon: 'arrowOut' })}
      ${kpiCard({ label: 'Inventory Value', value: formatCurrency(Inventory.totalValue(), true), sub: `${Inventory.stockProducts().length} stocked products`, nav: 'inventory', icon: 'box' })}
      ${kpiCard({ label: 'Outstanding Invoices', value: formatNumber(openInv.length), sub: formatCurrency(sum(openInv, Docs.balance), true) + ' to collect', nav: 'billing?status=open', icon: 'file' })}
    </div>
    <div class="grid-dash">
      ${card('Revenue vs Expenses', Charts.combo({ labels: months.map((m) => m.label), bars: [{ name: 'Revenue', values: months.map((m) => m.revenue), color: 'var(--c1)' }, { name: 'Expenses', values: months.map((m) => m.expenses), color: 'var(--c3)' }], lines: [{ name: 'Profit', values: months.map((m) => m.profit), color: 'var(--c2)' }] }), { cls: 'span-2', sub: 'Monthly, from posted journal entries', actions: Auth.canView('finreports') ? `<a class="btn btn-ghost btn-sm" href="#/finreports">P&amp;L ${icon('arrowRight', 14)}</a>` : '' })}
      ${card('Sales by Category', Charts.donut({ items: Object.entries(cats).map(([label, value]) => ({ label, value: round2(value) })), centerLabel: 'Net sales', navFn: (it) => `reports?cat=sales&report=sales-product&category=${encodeURIComponent(it.label)}` }), { sub: 'Invoiced, last 9 months' })}
      ${card('Sales Pipeline', Charts.pipeline([
        { label: 'Leads', count: leads.length + draftQ.length, value: tot(draftQ), note: `${leads.length} lead accounts`, nav: 'customers?status=Lead' },
        { label: 'Quotation', count: openQ.length, value: tot(openQ), nav: 'quotations?status=open' },
        { label: 'Order', count: openO.length, value: tot(openO), nav: 'orders?status=open' },
        { label: 'Delivery', count: delivering.filter((x) => x.status !== 'Completed').length, value: tot(delivering.filter((x) => x.status !== 'Completed')), nav: 'orders?status=delivery' },
        { label: 'Invoice', count: openInv.length, value: sum(openInv, Docs.balance), nav: 'billing?status=open' },
        { label: 'Paid', count: paid90.length, value: tot(paid90), note: 'last 90 days', nav: 'billing?status=Paid' },
      ]))}
      ${card('Recent Transactions', renderTable([
        { label: 'Transaction', render: (p) => link('payments?pay=' + p.id, p.id) }, { label: 'Customer / Supplier', render: partyName },
        { label: 'Type', render: (p) => esc(p.type) }, { label: 'Amount', align: 'right', render: (p) => money(p.type === 'Supplier Payment' || p.type === 'Refund' ? -p.amount : p.amount) },
        { label: 'Date', render: (p) => formatDate(p.date) }, { label: 'Status', render: (p) => badge(p.status) }], payRows, { empty: 'No transactions yet.', cls: 'compact' }), { cls: 'span-2', actions: Auth.canView('payments') ? `<a class="btn btn-ghost btn-sm" href="#/payments">View all ${icon('arrowRight', 14)}</a>` : '' })}
      ${card('Recent Orders', renderTable([
        { label: 'Order #', render: (x) => link('order/' + x.id, x.id) }, { label: 'Customer', render: (x) => esc(Lookup.customerName(x.customerId)) },
        { label: 'Date', render: (x) => formatDate(x.date) }, { label: 'Amount', align: 'right', render: (x) => money(Calc.doc(x).total) }, { label: 'Status', render: (x) => badge(x.status) }], orderRows, { cls: 'compact' }), { cls: 'span-2', actions: Auth.canView('orders') ? `<a class="btn btn-ghost btn-sm" href="#/orders">View all ${icon('arrowRight', 14)}</a>` : '' })}
      ${card('Low Stock', low.length ? `<ul class="stock-list">${low.map((p) => { const t = Inventory.total(p); return `<li class="clickable" data-nav="product/${p.id}" tabindex="0"><div><strong>${esc(p.name)}</strong><small>${esc(p.id)} · reorder at ${p.reorder}</small></div><div class="stock-qty">${badge(Inventory.level(p))}<span>${t} ${esc(p.unit)}</span></div>${progressBar((t / Math.max(1, p.reorder * 2)) * 100, t <= 0 ? 'danger' : 'warning')}</li>`; }).join('')}</ul>` : emptyState('All products are above reorder level.', '', 'check', '', true), { actions: `<a class="btn btn-ghost btn-sm" href="#/inventory?filter=low">View all ${icon('arrowRight', 14)}</a>` })}
    </div>`;
  el.querySelector('[data-act="new-order"]')?.addEventListener('click', () => Orders.create());
  el.querySelector('[data-act="new-invoice"]')?.addEventListener('click', () => Invoices.create());
};

/* ==========================================================================
   Notifications
   ========================================================================== */
Pages.notifications = (el, { query }) => {
  const types = { danger: 'Critical', warning: 'Warning', info: 'Information', success: 'Success' };
  el.innerHTML = pageHeader({ title: 'Notifications', subtitle: `${Notify.unread()} unread · alerts are generated from live business data`, actions: `${btn('Mark all as read', { icon: 'check', attrs: 'data-act="all"' })}${Auth.canView('settings') ? `<a class="btn" href="#/settings?tab=notifications">${icon('settings', 16)} Preferences</a>` : ''}` }) + '<div class="card"><div class="card-body" id="nl"></div></div>';
  listView($('#nl', el), {
    key: 'notifications', entity: 'notifications', searchPlaceholder: 'Search notifications…', rows: () => DB.all('notifications').slice().sort((a, b) => (a.date < b.date ? 1 : -1)),
    filters: [{ key: 'type', label: 'Type', options: Object.entries(types).map(([value, label]) => ({ value, label })) }, { key: 'read', label: 'Status', options: [{ value: 'unread', label: 'Unread' }, { value: 'read', label: 'Read' }], test: (r, v) => (v === 'read' ? r.read : !r.read) }],
    preset: query.filter ? { read: query.filter } : null,
    rowClass: (r) => (r.read ? '' : 'unread'),
    columns: [
      { key: 'title', label: 'Notification', render: (n) => `<div class="notif-row"><span class="notif-dot tone-${n.type}">${icon(n.type === 'success' ? 'check' : n.type === 'info' ? 'info' : 'alert', 14)}</span><div><strong>${esc(n.title)}</strong><div class="muted">${esc(n.text)}</div></div></div>`, value: (n) => n.title + ' ' + n.text },
      { key: 'type', label: 'Type', render: (n) => badge(types[n.type], n.type === 'danger' ? 'danger' : n.type), value: (n) => types[n.type] },
      { key: 'date', label: 'Date', render: (n) => `<span title="${formatDateTime(n.date)}">${timeAgo(n.date)}</span>`, value: (n) => n.date },
      { key: 'read', label: 'Status', render: (n) => (n.read ? badge('Read', 'neutral') : badge('Unread', 'info')), value: (n) => (n.read ? 'Read' : 'Unread') },
    ],
    onView: (n) => { n.read = true; DB.save('notifications'); App.updateBadge(); navigateTo(n.link || 'notifications'); },
    actions: (n) => [
      { label: 'Open', icon: 'eye', onClick: () => { n.read = true; DB.save('notifications'); navigateTo(n.link || 'notifications'); } },
      { label: n.read ? 'Mark as unread' : 'Mark as read', icon: 'check', onClick: () => { n.read = !n.read; DB.save('notifications'); App.updateBadge(); App.refresh(); } },
      { label: 'Dismiss', icon: 'trash', danger: true, onClick: () => { DB.data.notifications = DB.all('notifications').filter((x) => x !== n); if (n.dynamic) { n.read = true; } DB.save('notifications'); App.updateBadge(); showToast('Notification dismissed'); App.refresh(); } },
    ],
    onDelete: (rows) => { const ids = new Set(rows.map((r) => r.id)); DB.data.notifications = DB.all('notifications').filter((n) => !ids.has(n.id)); DB.save('notifications'); App.updateBadge(); showToast(`${rows.length} notifications dismissed`); },
    exportName: 'notifications',
  });
  $('[data-act="all"]', el).addEventListener('click', () => { DB.all('notifications').forEach((n) => { n.read = true; }); DB.save('notifications'); App.updateBadge(); showToast('All notifications marked as read'); App.refresh(); });
};

/* ==========================================================================
   Employees
   ========================================================================== */
const DEPARTMENTS = ['Management', 'Sales', 'Finance', 'Projects', 'Operations', 'Purchasing', 'IT', 'HR'];
const Employees = {
  fields(e) {
    return [
      { name: 'name', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true, unique: { collection: 'employees', exceptId: e?.id } },
      { name: 'department', label: 'Department', type: 'select', required: true, options: DEPARTMENTS }, { name: 'position', label: 'Position', required: true },
      { name: 'phone', label: 'Phone', type: 'tel' }, { name: 'manager', label: 'Manager', type: 'select', options: () => DB.all('employees').filter((x) => x.id !== e?.id).map((x) => ({ value: x.id, label: x.name })), emptyLabel: 'No manager' },
      { name: 'hireDate', label: 'Hire date', type: 'date', required: true }, { name: 'status', label: 'Status', type: 'radio', options: ['Active', 'On Leave', 'Inactive'] },
    ];
  },
  edit(e, dup) {
    formModal({ title: e && !dup ? `Edit ${e.name}` : 'Add employee', fields: this.fields(dup ? null : e), values: e ? { ...e, email: dup ? '' : e.email } : { status: 'Active', hireDate: today() }, submitText: e && !dup ? 'Save changes' : 'Add employee',
      onSubmit: (v) => {
        if (e && !dup) { DB.update('employees', e.id, v); DB.log(`Updated employee ${e.id}`, e.id); showToast('Employee updated successfully'); } else { const id = DB.nextId('employees', 'EMP-', 3); DB.insert('employees', { ...v, id }); DB.log(`Added employee ${v.name}`, id); showToast('Employee created successfully'); }
        App.refresh();
      } });
  },
  assignments(e) {
    return { orders: DB.all('orders').filter((o) => o.salesperson === e.id), projects: DB.all('projects').filter((p) => p.manager === e.id || (p.team || []).includes(e.id)), tasks: DB.all('tasks').filter((t) => t.assignedTo === e.id), expenses: DB.all('expenses').filter((x) => x.employeeId === e.id), quotations: DB.all('quotations').filter((q) => q.salesperson === e.id) };
  },
  view(e) {
    const a = this.assignments(e);
    const m = Modal.open({ title: e.name, size: 'lg', body: `<div class="profile-head"><span class="avatar lg">${initials(e.name)}</span><div><h3>${esc(e.name)}</h3><p class="muted">${esc(e.position)} · ${esc(e.department)}</p>${badge(e.status)}</div></div>
      ${detailList([['Employee ID', esc(e.id)], ['Email', `<a class="link" href="mailto:${esc(e.email)}">${esc(e.email)}</a>`], ['Phone', esc(e.phone)], ['Manager', e.manager ? esc(Lookup.employeeName(e.manager)) : '—'], ['Hire date', formatDate(e.hireDate)], ['Direct reports', String(DB.all('employees').filter((x) => x.manager === e.id).length)]], 3)}
      ${statTiles([{ label: 'Sales orders', value: a.orders.length, sub: formatCurrency(sum(a.orders.filter((o) => o.status !== 'Cancelled'), (o) => Calc.doc(o).total), true) }, { label: 'Projects', value: a.projects.length }, { label: 'Open tasks', value: a.tasks.filter((t) => t.status !== 'Completed').length }, { label: 'Expenses', value: formatCurrency(sum(a.expenses, (x) => x.amount), true) }])}
      <h3 class="h-sm">Assigned tasks</h3>${renderTable([{ label: 'Task', render: (t) => esc(t.title) }, { label: 'Project', render: (t) => link('project/' + t.projectId, t.projectId) }, { label: 'Due', render: (t) => formatDate(t.dueDate) }, { label: 'Status', render: (t) => badge(t.status) }], a.tasks.slice(0, 8), { empty: 'No tasks assigned.', cls: 'compact' })}
      ${a.orders.length ? `<h3 class="h-sm">Recent sales orders</h3>${renderTable([{ label: 'Order', render: (o) => link('order/' + o.id, o.id) }, { label: 'Customer', render: (o) => esc(Lookup.customerName(o.customerId)) }, { label: 'Total', align: 'right', render: (o) => money(Calc.doc(o).total) }, { label: 'Status', render: (o) => badge(o.status) }], a.orders.slice(-6).reverse(), { cls: 'compact' })}` : ''}`,
    footer: `<button type="button" class="btn" data-close>Close</button>${Auth.can('edit') ? '<button type="button" class="btn btn-primary" data-edit>Edit employee</button>' : ''}` });
    m.dialog.querySelector('[data-edit]')?.addEventListener('click', () => { m.close(); this.edit(e); });
    m.body.addEventListener('click', (ev) => { if (ev.target.closest('a[href^="#/"]')) m.close(); });
  },
  remove(e) {
    const a = this.assignments(e);
    if (a.orders.length || a.projects.length || a.tasks.length) return { error: `${e.name} is assigned to orders, projects or tasks. Set the status to Inactive instead.` };
    DB.remove('employees', e.id); DB.log(`Deleted employee ${e.id}`, e.id);
  },
};
Pages.employees = (el, { query }) => {
  el.innerHTML = pageHeader({ title: 'Employees', subtitle: `${DB.all('employees').length} people across ${DEPARTMENTS.length} departments`, actions: btn('Add employee', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' }) }) +
    statTiles(DEPARTMENTS.map((d) => ({ label: d, value: DB.all('employees').filter((e) => e.department === d).length }))) + '<div class="card"><div class="card-body" id="el"></div></div>';
  listView($('#el', el), {
    key: 'employees', entity: 'employees', searchPlaceholder: 'Search employees…', rows: () => DB.all('employees'),
    filters: [{ key: 'department', label: 'Department', options: DEPARTMENTS }, { key: 'status', label: 'Status', options: ['Active', 'On Leave', 'Inactive'] }],
    columns: [
      { key: 'id', label: 'Employee ID', render: (e) => `<strong>${esc(e.id)}</strong>` },
      { key: 'name', label: 'Name', render: (e) => `<div class="cell-person"><span class="avatar sm">${initials(e.name)}</span>${esc(e.name)}</div>` },
      { key: 'department', label: 'Department' }, { key: 'position', label: 'Position' },
      { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
      { key: 'manager', label: 'Manager', value: (e) => (e.manager ? Lookup.employeeName(e.manager) : '') },
      { key: 'status', label: 'Status', render: (e) => badge(e.status) },
    ],
    onView: (e) => Employees.view(e),
    actions: (e) => crudActions({ view: () => Employees.view(e), edit: () => Employees.edit(e), duplicate: () => Employees.edit(e, true), del: () => confirmDelete('Employee', () => Employees.remove(e)) }),
    onDelete: (rows) => { let n = 0; rows.forEach((e) => { if (!Employees.remove(e)) n++; }); showToast(`${n} of ${rows.length} employees deleted${n < rows.length ? ' (assigned employees were kept)' : ''}`, n < rows.length ? 'warning' : 'success'); },
    exportName: 'employees',
  });
  $('[data-act="add"]', el)?.addEventListener('click', () => Employees.edit(null));
  if (query.emp) { const e = DB.get('employees', query.emp); if (e) setTimeout(() => Employees.view(e), 0); }
};

/* ==========================================================================
   Settings
   ========================================================================== */
const CURRENCIES = [['USD', 'US Dollar'], ['EUR', 'Euro'], ['GBP', 'British Pound'], ['CAD', 'Canadian Dollar'], ['AUD', 'Australian Dollar'], ['SGD', 'Singapore Dollar'], ['JPY', 'Japanese Yen'], ['VND', 'Vietnamese Dong']];
Pages.settings = (el, { query }) => {
  const S = DB.data.settings;
  const tabs = [['company', 'Company'], ['users', 'Users'], ['roles', 'Roles'], ['currency', 'Currency'], ['tax', 'Tax'], ['terms', 'Payment Terms'], ['warehouses', 'Warehouses'], ['invoice', 'Invoice Settings'], ['notifications', 'Notifications'], ['appearance', 'Appearance'], ['data', 'Data & Backup']];
  const tab = tabs.some((t) => t[0] === query.tab) ? query.tab : 'company';
  const isAdmin = Auth.user().role === 'Administrator';
  el.innerHTML = pageHeader({ title: 'Settings', subtitle: 'Company profile, users, roles, finance defaults and preferences' }) +
    `<div class="settings-layout"><nav class="settings-nav" aria-label="Settings sections">${tabs.map(([k, l]) => `<a href="#/settings?tab=${k}" class="${k === tab ? 'active' : ''}" ${k === tab ? 'aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</nav><div class="settings-body" id="sb"></div></div>`;
  const body = $('#sb', el);
  const saved = (msg = 'Settings saved successfully') => { DB.save('settings'); showToast(msg); DB.log(msg); };
  const canEdit = Auth.can('edit');
  const ro = !canEdit ? `<p class="notice">${icon('lock', 16)} Your role can view settings but not change them.</p>` : '';

  if (tab === 'company') {
    body.innerHTML = card('Company information', ro + '<div id="f"></div>', { sub: 'Shown on invoices, quotations, purchase orders and statements' });
    inlineForm($('#f', body), { disabled: !canEdit, values: S.company, fields: [
      { name: 'name', label: 'Company name', required: true }, { name: 'taxNumber', label: 'Tax number', required: true }, { name: 'address', label: 'Address', full: true, required: true },
      { name: 'phone', label: 'Phone', type: 'tel' }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'website', label: 'Website' },
      { name: 'currency', label: 'Base currency', type: 'select', noEmpty: true, options: CURRENCIES.map(([c, n]) => ({ value: c, label: `${c} — ${n}` })) },
      { name: 'fiscalYear', label: 'Fiscal year', type: 'select', noEmpty: true, options: ['January – December', 'April – March', 'July – June', 'October – September'] },
      { name: 'logo', label: 'Company logo', type: 'file', accept: 'SVG or PNG, max 2 MB', full: true }] ,
      onSave: (v) => { Object.assign(S.company, v); S.currency = v.currency; S.companies[S.activeCompany] = v.name; App.renderShell(); saved('Company information saved'); } });
  }
  if (tab === 'users') {
    body.innerHTML = card('Users', '<div id="ul"></div>', { sub: 'Demo accounts — sign in as any user to see role-based access', actions: isAdmin ? btn('Invite user', { icon: 'plus', cls: 'btn-primary btn-sm', attrs: 'data-act="add"' }) : '' });
    const editUser = (u) => formModal({ title: u ? `Edit ${u.name}` : 'Invite user', fields: [
      { name: 'name', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true, unique: { collection: 'users', exceptId: u?.id } },
      { name: 'role', label: 'Role', type: 'select', required: true, options: DB.all('roles').map((r) => r.name) }, { name: 'password', label: 'Password', type: 'text', required: true, validate: (v) => (v.length < 6 ? 'Password must be at least 6 characters.' : '') },
      { name: 'status', label: 'Status', type: 'radio', options: ['Active', 'Inactive'] }], values: u || { status: 'Active', role: 'Viewer', password: 'demo1234' },
      onSubmit: (v) => {
        if (u && u.id === Auth.user().id && (v.role !== 'Administrator' || v.status !== 'Active')) return { error: 'You cannot remove your own administrator access.' };
        if (u) { DB.update('users', u.id, v); showToast('User updated successfully'); } else { DB.insert('users', { ...v, id: DB.nextId('users', 'USR-', 3), lastLogin: null }); showToast('User invited successfully'); }
        DB.log(`${u ? 'Updated' : 'Invited'} user ${v.email}`); App.refresh();
      } });
    listView($('#ul', body), { key: 'users', entity: 'users', rows: () => DB.all('users'), selectable: false,
      filters: [{ key: 'role', label: 'Role', options: DB.all('roles').map((r) => r.name) }, { key: 'status', label: 'Status', options: ['Active', 'Inactive'] }],
      columns: [{ key: 'name', label: 'User', render: (u) => `<div class="cell-person"><span class="avatar sm">${initials(u.name)}</span><div><strong>${esc(u.name)}</strong><div class="muted small">${esc(u.email)}</div></div></div>`, value: (u) => u.name + ' ' + u.email },
        { key: 'role', label: 'Role', render: (u) => badge(u.role, 'neutral') }, { key: 'status', label: 'Status', render: (u) => badge(u.status) },
        { key: 'lastLogin', label: 'Last sign-in', render: (u) => (u.lastLogin ? timeAgo(u.lastLogin) : 'Never'), value: (u) => u.lastLogin || '' }],
      actions: (u) => (isAdmin ? [{ label: 'Edit', icon: 'edit', onClick: () => editUser(u) }, { label: 'Sign in as this user', icon: 'user', onClick: () => { saveData('session', { userId: u.id, ts: Date.now() }); App.renderShell(); navigateTo('dashboard'); showToast(`Signed in as ${u.name}`, 'info'); } }, { divider: true }, { label: 'Delete', icon: 'trash', danger: true, onClick: () => confirmDelete('User', () => (u.id === Auth.user().id ? { error: 'You cannot delete your own account.' } : DB.remove('users', u.id) && undefined)) }] : [{ label: 'View role', icon: 'shield', onClick: () => navigateTo('settings?tab=roles') }]),
      exportName: 'users' });
    $('[data-act="add"]', body)?.addEventListener('click', () => editUser(null));
  }
  if (tab === 'roles') {
    const roles = DB.all('roles');
    body.innerHTML = card('Roles & permissions', `<p class="muted">Permissions control which actions a role can perform; modules control which menu items are visible. Changes apply immediately to everyone with that role.</p>
      <div class="table-wrap"><table class="data-table matrix"><thead><tr><th>Role</th>${PERMISSIONS.map((p) => `<th class="center">${p[0].toUpperCase() + p.slice(1)}</th>`).join('')}<th>Modules</th><th class="center">Users</th>${isAdmin ? '<th><span class="sr-only">Actions</span></th>' : ''}</tr></thead><tbody>${roles.map((r) => `<tr><td data-label="Role"><strong>${esc(r.name)}</strong><div class="muted small">${esc(r.description)}</div></td>${PERMISSIONS.map((p) => `<td class="center" data-label="${p}">${isAdmin ? `<input type="checkbox" data-role="${r.id}" data-perm="${p}" ${r.perms[p] ? 'checked' : ''} ${r.name === 'Administrator' ? 'disabled' : ''} aria-label="${esc(r.name)} can ${p}">` : (r.perms[p] ? icon('check', 16, 'ok') : '<span class="muted">—</span>')}</td>`).join('')}<td data-label="Modules">${r.modules.includes('*') ? badge('All modules', 'success') : `<span class="muted">${r.modules.length} modules</span>`}</td><td class="center" data-label="Users">${DB.all('users').filter((u) => u.role === r.name).length}</td>${isAdmin ? `<td><button type="button" class="btn btn-sm" data-edit-role="${r.id}" ${r.name === 'Administrator' ? 'disabled' : ''}>Edit modules</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`, { sub: '9 predefined roles · View / Create / Edit / Delete / Approve / Export' }) +
      card('Menu visibility preview', `<div class="role-preview"><label for="rp">Preview role</label><select id="rp">${roles.map((r) => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select><div id="rp-out"></div></div>`);
    const preview = () => { const r = DB.get('roles', $('#rp', body).value); $('#rp-out', body).innerHTML = `<ul class="module-chips">${MODULES.map((m) => { const on = r.modules.includes('*') || r.modules.includes(m.key); return `<li class="${on ? 'on' : 'off'}">${icon(on ? 'check' : 'x', 14)} ${esc(m.label)}</li>`; }).join('')}</ul>`; };
    $('#rp', body).addEventListener('change', preview); preview();
    body.addEventListener('change', (e) => { const c = e.target.closest('[data-perm]'); if (!c) return; const r = DB.get('roles', c.dataset.role); r.perms[c.dataset.perm] = c.checked; DB.save('roles'); DB.log(`Updated ${r.name} permission: ${c.dataset.perm} = ${c.checked}`); showToast(`${r.name}: ${c.dataset.perm} ${c.checked ? 'granted' : 'revoked'}`); App.renderShell(); });
    body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-edit-role]'); if (!b) return; const r = DB.get('roles', b.dataset.editRole);
      formModal({ title: `Edit role — ${r.name}`, size: 'lg', fields: [{ name: 'description', label: 'Description', full: true, required: true }, { name: 'modules', label: 'Visible modules', type: 'multiselect', full: true, required: true, options: MODULES.map((m) => ({ value: m.key, label: m.label })) }],
        values: { description: r.description, modules: r.modules }, onSubmit: (v) => { r.description = v.description; r.modules = v.modules; DB.save('roles'); DB.log(`Updated role ${r.name}`); showToast('Role updated successfully'); App.renderShell(); App.refresh(); } });
    });
  }
  if (tab === 'currency') {
    body.innerHTML = card('Currency', ro + '<div id="f"></div><div class="notice info">' + icon('info', 16) + ' Changing the display currency re-formats all amounts. Amounts are not converted (single-currency ledger).</div>', { sub: `Preview: ${formatCurrency(1234567.89)}` });
    inlineForm($('#f', body), { disabled: !canEdit, values: { currency: S.currency }, fields: [{ name: 'currency', label: 'Display currency', type: 'radio', options: CURRENCIES.map(([c, n]) => ({ value: c, label: `${c} — ${n}` })), full: true }], onSave: (v) => { S.currency = v.currency; S.company.currency = v.currency; Object.keys(_fmtCache).forEach((k) => delete _fmtCache[k]); saved('Currency updated'); App.refresh(); } });
  }
  if (tab === 'tax') {
    body.innerHTML = card('Tax rates', ro + `<div id="f"></div><h3 class="h-sm">Tax codes</h3>${renderTable([{ label: 'Name', render: (t) => esc(t.name) }, { label: 'Rate', align: 'right', render: (t) => t.rate + '%' }, { label: '', render: (t) => (canEdit ? `<button type="button" class="btn btn-sm btn-ghost" data-del-tax="${esc(t.name)}">Remove</button>` : '') }], S.taxes)}${canEdit ? btn('Add tax code', { icon: 'plus', cls: 'btn-sm', attrs: 'data-act="add-tax"' }) : ''}`);
    inlineForm($('#f', body), { disabled: !canEdit, values: { taxRate: S.taxRate }, fields: [{ name: 'taxRate', label: 'Default sales tax rate (%)', type: 'number', required: true, max: 100, help: 'Applied to new document lines' }], onSave: (v) => { S.taxRate = v.taxRate; saved('Default tax rate updated'); } });
    body.addEventListener('click', (e) => {
      const d = e.target.closest('[data-del-tax]'); if (d) { S.taxes = S.taxes.filter((t) => t.name !== d.dataset.delTax); saved('Tax code removed'); App.refresh(); }
      if (e.target.closest('[data-act="add-tax"]')) formModal({ title: 'Add tax code', size: 'sm', fields: [{ name: 'name', label: 'Name', required: true, validate: (v) => (S.taxes.some((t) => t.name.toLowerCase() === v.toLowerCase()) ? 'A tax code with this name already exists.' : '') }, { name: 'rate', label: 'Rate (%)', type: 'number', required: true, max: 100 }], onSubmit: (v) => { S.taxes.push(v); saved('Tax code added'); App.refresh(); } });
    });
  }
  if (tab === 'terms') {
    body.innerHTML = card('Payment terms', ro + renderTable([{ label: 'Name', render: (t) => `<strong>${esc(t.name)}</strong>` }, { label: 'Days until due', align: 'right', render: (t) => t.days }, { label: 'Customers', align: 'right', render: (t) => DB.all('customers').filter((c) => c.paymentTerms === t.name).length }, { label: '', render: (t) => (canEdit ? `<button type="button" class="btn btn-sm btn-ghost" data-del-term="${esc(t.name)}">Remove</button>` : '') }], S.paymentTerms) + (canEdit ? btn('Add payment term', { icon: 'plus', cls: 'btn-sm', attrs: 'data-act="add-term"' }) : ''), { sub: 'Used to calculate due dates on invoices and supplier invoices' });
    body.addEventListener('click', (e) => {
      const d = e.target.closest('[data-del-term]');
      if (d) { if (DB.all('customers').some((c) => c.paymentTerms === d.dataset.delTerm) || DB.all('suppliers').some((c) => c.paymentTerms === d.dataset.delTerm)) { showToast('This payment term is in use and cannot be removed.', 'error'); return; } S.paymentTerms = S.paymentTerms.filter((t) => t.name !== d.dataset.delTerm); saved('Payment term removed'); App.refresh(); }
      if (e.target.closest('[data-act="add-term"]')) formModal({ title: 'Add payment term', size: 'sm', fields: [{ name: 'name', label: 'Name', required: true, validate: (v) => (S.paymentTerms.some((t) => t.name.toLowerCase() === v.toLowerCase()) ? 'This payment term already exists.' : '') }, { name: 'days', label: 'Days until due', type: 'number', integer: true, required: true, max: 365 }], onSubmit: (v) => { S.paymentTerms.push(v); S.paymentTerms.sort((a, b) => a.days - b.days); saved('Payment term added'); App.refresh(); } });
    });
  }
  if (tab === 'warehouses') {
    body.innerHTML = card('Warehouses', '<div id="wl"></div>', { actions: btn('Add warehouse', { icon: 'plus', cls: 'btn-primary btn-sm', attrs: 'data-act="add"', perm: 'create' }) });
    const editWh = (w) => formModal({ title: w ? `Edit ${w.name}` : 'Add warehouse', fields: [
      { name: 'id', label: 'Warehouse code', required: true, disabled: !!w, unique: { collection: 'warehouses', exceptId: w?.id }, validate: (v) => (/^[A-Z0-9-]{3,12}$/.test(v) ? '' : 'Use 3–12 uppercase letters, digits or dashes.'), placeholder: 'WH-EAST' },
      { name: 'name', label: 'Name', required: true }, { name: 'location', label: 'Location', required: true },
      { name: 'manager', label: 'Manager', type: 'select', options: () => Lookup.options.employees() }, { name: 'capacity', label: 'Capacity (units)', type: 'number', integer: true }],
    values: w || {}, onSubmit: (v) => { if (w) { delete v.id; DB.update('warehouses', w.id, v); } else DB.insert('warehouses', v); showToast(`Warehouse ${w ? 'updated' : 'created'} successfully`); App.refresh(); } });
    listView($('#wl', body), { key: 'warehouses', entity: 'warehouses', rows: () => DB.all('warehouses'), selectable: false,
      columns: [{ key: 'id', label: 'Code', render: (w) => `<strong>${esc(w.id)}</strong>` }, { key: 'name', label: 'Name' }, { key: 'location', label: 'Location' }, { key: 'manager', label: 'Manager', value: (w) => Lookup.employeeName(w.manager) },
        { key: 'units', label: 'Units on hand', align: 'right', value: (w) => sum(Inventory.stockProducts(), (p) => p.stock?.[w.id] || 0), render: (w) => formatNumber(sum(Inventory.stockProducts(), (p) => p.stock?.[w.id] || 0)) },
        { key: 'value', label: 'Stock value', align: 'right', value: (w) => Inventory.warehouseValue(w.id), render: (w) => money(Inventory.warehouseValue(w.id)) }],
      onView: (w) => navigateTo('inventory?tab=warehouses&wh=' + w.id),
      actions: (w) => crudActions({ view: () => navigateTo('inventory?tab=stock&wh=' + w.id), edit: () => editWh(w), del: () => confirmDelete('Warehouse', () => (Inventory.stockProducts().some((p) => (p.stock?.[w.id] || 0) > 0) ? { error: 'Warehouses holding stock cannot be deleted. Transfer the stock first.' } : (DB.remove('warehouses', w.id), undefined))) }),
      exportName: 'warehouses' });
    $('[data-act="add"]', body)?.addEventListener('click', () => editWh(null));
  }
  if (tab === 'invoice') {
    body.innerHTML = card('Invoice settings', ro + '<div id="f"></div>', { sub: `Next invoice number: ${DB.nextId('invoices', Billing.prefix(), 5)}` });
    inlineForm($('#f', body), { disabled: !canEdit, values: S.invoice, fields: [
      { name: 'prefix', label: 'Number prefix', required: true, help: 'Invoices are numbered PREFIX-YEAR-00000', disabled: true }, { name: 'bank', label: 'Bank / payment details', full: true },
      { name: 'terms', label: 'Default terms & conditions', type: 'textarea', rows: 3, full: true }, { name: 'footer', label: 'Invoice footer', full: true }],
    onSave: (v) => { Object.assign(S.invoice, v, { prefix: S.invoice.prefix }); saved('Invoice settings saved'); } });
  }
  if (tab === 'notifications') {
    body.innerHTML = card('Notification preferences', ro + '<div id="f"></div>');
    inlineForm($('#f', body), { disabled: !canEdit, values: S.notify, fields: [
      { type: 'section', label: 'In-app alerts' }, { name: 'overdue', label: 'Overdue customer invoices', type: 'checkbox', full: true }, { name: 'lowStock', label: 'Products below reorder level', type: 'checkbox', full: true },
      { name: 'credit', label: 'Customers exceeding credit limit', type: 'checkbox', full: true }, { name: 'deadlines', label: 'Project deadlines within 21 days', type: 'checkbox', full: true },
      { type: 'section', label: 'Delivery' }, { name: 'email', label: 'Also send alerts by email (simulated)', type: 'checkbox', full: true }, { name: 'digest', label: 'Daily digest summary', type: 'checkbox', full: true }],
    onSave: (v) => { Object.assign(S.notify, v); saved('Notification preferences saved'); Notify.sync(); App.updateBadge(); } });
  }
  if (tab === 'appearance') {
    body.innerHTML = card('Appearance', '<div id="f"></div>', { sub: 'Stored in this browser' });
    inlineForm($('#f', body), { values: { theme: document.documentElement.getAttribute('data-theme'), density: S.appearance?.density || 'comfortable', collapsed: document.body.classList.contains('sidebar-collapsed') }, fields: [
      { name: 'theme', label: 'Theme', type: 'radio', options: [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }], full: true },
      { name: 'density', label: 'Table density', type: 'radio', options: [{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }], full: true },
      { name: 'collapsed', label: 'Collapse sidebar on desktop', type: 'checkbox', full: true }],
    submitText: 'Apply', onSave: (v) => { App.applyTheme(v.theme); S.appearance = { density: v.density }; DB.save('settings'); document.body.classList.toggle('density-compact', v.density === 'compact'); document.body.classList.toggle('sidebar-collapsed', v.collapsed); saveData('sidebar_collapsed', v.collapsed); showToast('Appearance updated'); } });
  }
  if (tab === 'data') {
    const size = Math.round(COLLECTIONS.reduce((a, c) => a + JSON.stringify(DB.data[c]).length, 0) / 1024);
    body.innerHTML = card('Data & backup', `<p class="muted">All data is stored locally in this browser (≈${size} KB in localStorage).</p>
      ${statTiles(['customers', 'orders', 'invoices', 'payments', 'journals', 'movements'].map((c) => ({ label: c[0].toUpperCase() + c.slice(1), value: DB.all(c).length })))}
      <div class="btn-row">${btn('Download JSON backup', { icon: 'download', attrs: 'data-act="backup"' })}${isAdmin ? `<label class="btn" tabindex="0">${icon('upload', 16)}<span>Restore from backup</span><input type="file" accept="application/json" class="sr-only" data-act="restore"></label>${btn('Reset demo data', { icon: 'refresh', cls: 'btn-danger', attrs: 'data-act="reset"' })}` : ''}</div>`) +
      card('Activity log', renderTable([{ label: 'When', render: (a) => `<span title="${formatDateTime(a.ts)}">${timeAgo(a.ts)}</span>` }, { label: 'User', render: (a) => esc(a.user) }, { label: 'Action', render: (a) => esc(a.action) }, { label: 'Reference', render: (a) => esc(a.ref) }], DB.all('activity').slice(0, 15), { cls: 'compact' }), { sub: 'Latest 15 events' });
    body.addEventListener('click', async (e) => {
      const a = e.target.closest('[data-act]')?.dataset.act;
      if (a === 'backup') { downloadFile(`nexus-erp-backup-${today()}.json`, JSON.stringify({ version: DATA_VERSION, exportedAt: new Date().toISOString(), data: DB.data }, null, 1), 'application/json'); showToast('Backup downloaded'); }
      if (a === 'reset' && await confirmDialog({ title: 'Reset all demo data?', message: 'All changes will be discarded and the original sample data restored. You will stay signed in.', confirmText: 'Reset data' })) {
        const sess = loadData('session'); const theme = loadData('theme'); clearData(); DB.reset(); saveData('session', sess); if (theme) saveData('theme', theme);
        Object.keys(PageState).forEach((k) => delete PageState[k]); App.renderShell(); navigateTo('dashboard'); showToast('Demo data has been reset');
      }
    });
    body.addEventListener('change', (e) => {
      if (e.target.dataset.act !== 'restore' || !e.target.files[0]) return;
      const r = new FileReader();
      r.onload = () => { try { const j = JSON.parse(r.result); if (!j.data || !COLLECTIONS.every((c) => Array.isArray(j.data[c]) || c === 'settings')) throw new Error('Invalid backup file'); COLLECTIONS.forEach((c) => { DB.data[c] = j.data[c]; }); DB.saveAll(); App.renderShell(); App.refresh(); showToast('Backup restored successfully'); } catch (err) { showToast('Unable to restore: ' + err.message, 'error'); } };
      r.readAsText(e.target.files[0]);
    });
  }
};
