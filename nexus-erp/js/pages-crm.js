/* ==========================================================================
   NEXUS ERP — pages-crm.js
   Customers (list, detail, statement) and Suppliers (list, detail, statement).
   ========================================================================== */
'use strict';

const COUNTRIES = ['USA', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia', 'Singapore', 'Japan', 'South Korea', 'Taiwan', 'Ireland', 'Mexico', 'Vietnam', 'India', 'Netherlands'];
const INDUSTRIES = ['Technology', 'Healthcare', 'Manufacturing', 'Retail', 'Finance', 'Education', 'Energy', 'Hospitality', 'Government', 'Other'];

/* ---------- Customers service (CRUD) ---------- */
const Customers = {
  fields(c) {
    return [
      { type: 'section', label: 'Account' },
      { name: 'id', label: 'Customer ID', required: true, disabled: !!c, unique: { collection: 'customers', exceptId: c?.id }, validate: (v) => (/^[A-Z]{2,4}-\d{3,5}$/.test(v) ? '' : 'Use the format CUS-021.') },
      { name: 'company', label: 'Company', required: true, unique: { collection: 'customers', exceptId: c?.id } },
      { name: 'name', label: 'Primary contact', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone', type: 'tel', required: true }, { name: 'website', label: 'Website' },
      { name: 'country', label: 'Country', type: 'select', required: true, options: COUNTRIES }, { name: 'industry', label: 'Industry', type: 'select', options: INDUSTRIES },
      { type: 'section', label: 'Billing & credit' },
      { name: 'paymentTerms', label: 'Payment terms', type: 'select', required: true, options: Lookup.options.terms }, { name: 'creditLimit', label: 'Credit limit', type: 'currency', required: true },
      { name: 'taxId', label: 'Tax ID' }, { name: 'status', label: 'Status', type: 'radio', options: ['Active', 'Lead', 'Inactive'] },
      { name: 'billingAddress', label: 'Billing address', type: 'textarea', rows: 2, required: true }, { name: 'shippingAddress', label: 'Shipping address', type: 'textarea', rows: 2, help: 'Leave blank to use the billing address' },
    ];
  },
  edit(c, dup = false) {
    const isEdit = c && !dup;
    const vals = c ? { ...c } : { status: 'Active', paymentTerms: 'Net 30', creditLimit: 50000, country: 'USA' };
    if (!isEdit) { vals.id = DB.nextId('customers', 'CUS-', 3); if (dup) { vals.company = c.company + ' (Copy)'; vals.email = ''; } }
    formModal({ title: isEdit ? `Edit ${c.company}` : 'Add customer', size: 'lg', fields: this.fields(isEdit ? c : null), values: vals, submitText: isEdit ? 'Save changes' : 'Create customer',
      onSubmit: (v) => { if (isEdit) updateCustomer(c.id, v); else addCustomer(v, dup ? c : null); App.refresh(); } });
  },
  canDelete(c) { const n = DB.all('orders').filter((o) => o.customerId === c.id).length + DB.all('invoices').filter((i) => i.customerId === c.id).length + DB.all('projects').filter((p) => p.customerId === c.id).length; return n ? { error: `${c.company} has ${n} related orders, invoices or projects. Set the customer to Inactive instead.` } : null; },
};
/** CRUD functions (spec §31) */
function addCustomer(v, copyFrom) {
  const c = { ...v, shippingAddress: v.shippingAddress || v.billingAddress, contacts: copyFrom ? deepClone(copyFrom.contacts || []) : [{ id: uid(), name: v.name, title: 'Primary contact', email: v.email, phone: v.phone, primary: true }], notes: [], createdAt: today() };
  DB.insert('customers', c); DB.log(`Created customer ${c.company}`, c.id); showToast('Customer created successfully');
  return c;
}
function updateCustomer(id, v) { delete v.id; v.shippingAddress = v.shippingAddress || v.billingAddress; DB.update('customers', id, v); DB.log(`Updated customer ${id}`, id); showToast('Customer updated successfully'); }
function deleteCustomer(c) { const e = Customers.canDelete(c); if (e) return e; DB.remove('customers', c.id); DB.log(`Deleted customer ${c.company}`, c.id); return null; }
const searchCustomers = (q) => filterData(DB.all('customers'), q, [(c) => c.id, (c) => c.company, (c) => c.name, (c) => c.email]);
const filterCustomers = (status) => DB.all('customers').filter((c) => !status || c.status === status);

Pages.customers = (el, { query }) => {
  const all = DB.all('customers');
  const stats = Object.fromEntries(all.map((c) => [c.id, Stats.customer(c.id)]));
  el.innerHTML = pageHeader({ title: 'Customers', subtitle: `${all.length} accounts · ${all.filter((c) => c.status === 'Active').length} active`, actions: btn('Add customer', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' }) }) +
    statTiles([{ label: 'Total customers', value: all.length }, { label: 'Lifetime sales', value: formatCurrency(sum(all, (c) => stats[c.id].sales), true) }, { label: 'Outstanding', value: formatCurrency(sum(all, (c) => stats[c.id].outstanding), true), nav: 'ar' }, { label: 'Over credit limit', value: all.filter((c) => stats[c.id].outstanding > c.creditLimit).length, tone: 'warn' }]) +
    '<div class="card"><div class="card-body" id="cl"></div></div>';
  listView($('#cl', el), {
    key: 'customers', entity: 'customers', searchPlaceholder: 'Search by name, company, email, ID…', rows: () => DB.all('customers'),
    filters: [{ key: 'status', label: 'Status', options: ['Active', 'Lead', 'Inactive'] }, { key: 'country', label: 'Country', options: [...new Set(all.map((c) => c.country))].sort() }, { key: 'balance', label: 'Balance', options: [{ value: 'outstanding', label: 'Has outstanding' }, { value: 'over', label: 'Over credit limit' }], test: (c, v) => (v === 'over' ? Stats.customer(c.id).outstanding > c.creditLimit : Stats.customer(c.id).outstanding > 0) }],
    preset: query.status ? { status: query.status } : null,
    defaultSort: { key: 'id', dir: 'asc' },
    columns: [
      { key: 'id', label: 'Customer ID', render: (c) => `<strong>${esc(c.id)}</strong>` },
      { key: 'name', label: 'Customer', render: (c) => `<div class="cell-person"><span class="avatar sm">${initials(c.name)}</span>${esc(c.name)}</div>` },
      { key: 'company', label: 'Company', render: (c) => link('customer/' + c.id, c.company) },
      { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' }, { key: 'country', label: 'Country' },
      { key: 'sales', label: 'Sales', align: 'right', value: (c) => Stats.customer(c.id).sales, render: (c) => money(Stats.customer(c.id).sales) },
      { key: 'outstanding', label: 'Outstanding', align: 'right', value: (c) => Stats.customer(c.id).outstanding, render: (c) => { const s = Stats.customer(c.id); return `<span class="${s.outstanding > c.creditLimit ? 'text-danger' : ''}">${formatCurrency(s.outstanding)}</span>`; } },
      { key: 'status', label: 'Status', render: (c) => badge(c.status) },
    ],
    onView: (c) => navigateTo('customer/' + c.id),
    actions: (c) => crudActions({ view: () => navigateTo('customer/' + c.id), edit: () => Customers.edit(c), duplicate: () => Customers.edit(c, true), print: () => printRoute('customer-statement/' + c.id), del: () => confirmDelete('Customer', () => deleteCustomer(c)),
      extra: [{ label: 'Statement', icon: 'file', onClick: () => navigateTo('customer-statement/' + c.id) }] }),
    onDelete: (rows) => { let ok = 0; rows.forEach((c) => { if (!deleteCustomer(c)) ok++; }); showToast(`${ok} of ${rows.length} customers deleted${ok < rows.length ? ' — customers with transactions were kept' : ''}`, ok < rows.length ? 'warning' : 'success'); },
    exportName: 'customers',
    exportColumns: [{ label: 'Customer ID', value: (c) => c.id }, { label: 'Company', value: (c) => c.company }, { label: 'Contact', value: (c) => c.name }, { label: 'Email', value: (c) => c.email }, { label: 'Phone', value: (c) => c.phone }, { label: 'Country', value: (c) => c.country }, { label: 'Payment Terms', value: (c) => c.paymentTerms }, { label: 'Credit Limit', value: (c) => c.creditLimit }, { label: 'Sales', value: (c) => Stats.customer(c.id).sales }, { label: 'Outstanding', value: (c) => Stats.customer(c.id).outstanding }, { label: 'Status', value: (c) => c.status }],
  });
  $('[data-act="add"]', el)?.addEventListener('click', () => Customers.edit(null));
};

/** Statement lines for a customer (invoices = debit, receipts = credit). */
function customerLedger(cid) {
  const ev = [];
  DB.all('invoices').filter((i) => i.customerId === cid && !['Draft', 'Cancelled'].includes(i.status)).forEach((i) => ev.push({ date: i.date, ref: i.id, route: 'invoice/' + i.id, description: `Invoice${i.orderId ? ' — order ' + i.orderId : i.projectId ? ' — project ' + i.projectId : ''}`, debit: Calc.doc(i).total, credit: 0 }));
  DB.all('payments').filter((p) => p.partyType === 'customer' && p.partyId === cid && p.status !== 'Voided').forEach((p) => ev.push({ date: p.date, ref: p.id, route: 'payments?pay=' + p.id, description: `${p.type}${p.invoiceId ? ' — ' + p.invoiceId : ''} (${p.method})`, debit: p.type === 'Refund' ? p.amount : 0, credit: p.type === 'Refund' ? 0 : p.amount }));
  ev.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.debit - a.debit));
  return ev;
}
function withRunning(ev, opening = 0) { let bal = opening; return ev.map((e) => { bal = round2(bal + e.debit - e.credit); return { ...e, balance: bal }; }); }
const ledgerColumns = (label = 'Reference') => [
  { label: 'Date', render: (e) => formatDate(e.date) }, { label, render: (e) => (e.route ? link(e.route, e.ref) : esc(e.ref)) }, { label: 'Description', render: (e) => esc(e.description) },
  { label: 'Debit', align: 'right', render: (e) => (e.debit ? formatCurrency(e.debit) : '') }, { label: 'Credit', align: 'right', render: (e) => (e.credit ? formatCurrency(e.credit) : '') }, { label: 'Balance', align: 'right', render: (e) => `<strong>${formatCurrency(e.balance)}</strong>` }];

Pages.customer = (el, { id, query }) => {
  const c = DB.get('customers', id);
  if (!c) { el.innerHTML = errorState(`Customer ${id} was not found.`, false); return; }
  App.setCrumb(c.company);
  const st = Stats.customer(c.id);
  const orders = DB.all('orders').filter((o) => o.customerId === c.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const invoices = DB.all('invoices').filter((i) => i.customerId === c.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const payments = DB.all('payments').filter((p) => p.partyType === 'customer' && p.partyId === c.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const projects = DB.all('projects').filter((p) => p.customerId === c.id);
  const tab = query.tab || 'overview';
  const tabs = [{ key: 'overview', label: 'Overview' }, { key: 'contacts', label: 'Contacts', count: (c.contacts || []).length }, { key: 'orders', label: 'Orders', count: orders.length }, { key: 'invoices', label: 'Invoices', count: invoices.length }, { key: 'payments', label: 'Payments', count: payments.length }, { key: 'projects', label: 'Projects', count: projects.length }, { key: 'transactions', label: 'Transactions' }, { key: 'notes', label: 'Notes', count: (c.notes || []).length }];
  const util = c.creditLimit ? (st.outstanding / c.creditLimit) * 100 : 0;
  const can = (m) => Auth.canView(m) && Auth.can('create');
  el.innerHTML = pageHeader({ back: 'customers', title: `${esc(c.company)} ${badge(c.status)}`, subtitle: `${esc(c.id)} · ${esc(c.industry || '')} · ${esc(c.country)}`,
    actions: `${btn('Edit', { icon: 'edit', attrs: 'data-act="edit"', perm: 'edit' })}<a class="btn" href="#/customer-statement/${c.id}">${icon('file', 16)} Statement</a>${can('sales') ? btn('New quotation', { attrs: 'data-act="quote"' }) : ''}${can('orders') ? btn('New order', { icon: 'cart', attrs: 'data-act="order"' }) : ''}${can('billing') ? btn('New invoice', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="invoice"' }) : ''}` }) +
    statTiles([{ label: 'Total sales', value: formatCurrency(st.sales) }, { label: 'Outstanding balance', value: formatCurrency(st.outstanding), tone: st.outstanding > c.creditLimit ? 'danger' : '' }, { label: 'Last order', value: st.lastOrder ? formatDate(st.lastOrder) : '—' }, { label: 'Credit limit', value: formatCurrency(c.creditLimit), sub: `${util.toFixed(0)}% used` }, { label: 'Payment terms', value: esc(c.paymentTerms) }]) +
    tabsHtml(tabs, tab, 'customer/' + c.id) + '<div id="tab" class="tab-panel" role="tabpanel"></div>';
  const T = $('#tab', el);
  const invCols = [{ label: 'Invoice #', render: (i) => link('invoice/' + i.id, i.id) }, { label: 'Date', render: (i) => formatDate(i.date) }, { label: 'Due', render: (i) => formatDate(i.dueDate) }, { label: 'Amount', align: 'right', render: (i) => money(Calc.doc(i).total) }, { label: 'Paid', align: 'right', render: (i) => money(i.paid || 0) }, { label: 'Balance', align: 'right', render: (i) => money(Docs.balance(i)) }, { label: 'Status', render: (i) => badge(Docs.status(i)) }];
  if (tab === 'overview') {
    const months = lastMonths(6).map((m) => ({ ...m, v: sum(invoices.filter((i) => !['Draft', 'Cancelled'].includes(i.status) && monthKey(i.date) === m.key), (i) => Calc.doc(i).total) }));
    T.innerHTML = `<div class="grid-2">${card('Customer information', detailList([['Company', esc(c.company)], ['Primary contact', esc(c.name)], ['Email', `<a class="link" href="mailto:${esc(c.email)}">${esc(c.email)}</a>`], ['Phone', esc(c.phone)], ['Website', esc(c.website)], ['Tax ID', esc(c.taxId)], ['Billing address', esc(c.billingAddress)], ['Shipping address', esc(c.shippingAddress)], ['Payment terms', esc(c.paymentTerms)], ['Customer since', formatDate(c.createdAt)]]))}
      <div>${card('Credit utilisation', `<div class="credit-meter"><div class="cm-row"><span>${formatCurrency(st.outstanding)} of ${formatCurrency(c.creditLimit)}</span><strong>${util.toFixed(0)}%</strong></div>${progressBar(util, util > 100 ? 'danger' : util > 80 ? 'warning' : '')}${util > 100 ? `<p class="text-danger small">${icon('alert', 14)} Credit limit exceeded by ${formatCurrency(st.outstanding - c.creditLimit)}.</p>` : ''}</div>`)}
      ${card('Invoiced — last 6 months', Charts.combo({ labels: months.map((m) => m.label), bars: [{ name: 'Invoiced', values: months.map((m) => m.v), color: 'var(--c2)' }], height: 180 }))}</div></div>
      ${card('Open invoices', renderTable(invCols, invoices.filter(Docs.isOpen), { empty: 'No open invoices — the account is fully paid.' }))}`;
  }
  if (tab === 'contacts') {
    T.innerHTML = card('Contacts', renderTable([{ label: 'Name', render: (x) => `<strong>${esc(x.name)}</strong>${x.primary ? ' ' + badge('Primary', 'success') : ''}` }, { label: 'Title', render: (x) => esc(x.title) }, { label: 'Email', render: (x) => `<a class="link" href="mailto:${esc(x.email)}">${esc(x.email)}</a>` }, { label: 'Phone', render: (x) => esc(x.phone) }, { label: '', render: (x) => (Auth.can('edit') ? `<div class="row-btns"><button type="button" class="btn btn-sm btn-ghost" data-edit-contact="${x.id}">Edit</button><button type="button" class="btn btn-sm btn-ghost" data-del-contact="${x.id}">Remove</button></div>` : '') }], c.contacts || [], { empty: 'No contacts yet.' }), { actions: btn('Add contact', { icon: 'plus', cls: 'btn-sm', attrs: 'data-act="contact"', perm: 'edit' }) });
    const editContact = (x) => formModal({ title: x ? 'Edit contact' : 'Add contact', fields: [{ name: 'name', label: 'Name', required: true }, { name: 'title', label: 'Job title' }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'phone', label: 'Phone', type: 'tel' }, { name: 'primary', label: 'Primary contact', type: 'checkbox' }], values: x || {},
      onSubmit: (v) => { c.contacts = c.contacts || []; if (v.primary) c.contacts.forEach((k) => { k.primary = false; }); if (x) Object.assign(x, v); else c.contacts.push({ id: uid(), ...v }); DB.save('customers'); showToast(`Contact ${x ? 'updated' : 'added'} successfully`); App.refresh(); } });
    T.addEventListener('click', async (e) => {
      if (e.target.closest('[data-act="contact"]')) editContact(null);
      const ed = e.target.closest('[data-edit-contact]'); if (ed) editContact(c.contacts.find((k) => k.id === ed.dataset.editContact));
      const d = e.target.closest('[data-del-contact]'); if (d && await confirmDialog({ title: 'Remove contact?', confirmText: 'Remove' })) { c.contacts = c.contacts.filter((k) => k.id !== d.dataset.delContact); DB.save('customers'); showToast('Contact removed'); App.refresh(); }
    });
  }
  if (tab === 'orders') T.innerHTML = card('Sales orders', renderTable([{ label: 'Order #', render: (o) => link('order/' + o.id, o.id) }, { label: 'Date', render: (o) => formatDate(o.date) }, { label: 'Items', align: 'right', render: (o) => o.items.length }, { label: 'Total', align: 'right', render: (o) => money(Calc.doc(o).total) }, { label: 'Payment', render: (o) => badge(Sales.paymentStatus(o)) }, { label: 'Status', render: (o) => badge(o.status) }], orders, { empty: 'No orders for this customer yet.' }));
  if (tab === 'invoices') T.innerHTML = card('Invoices', renderTable(invCols, invoices, { empty: 'No invoices for this customer yet.' }));
  if (tab === 'payments') T.innerHTML = card('Payments', renderTable([{ label: 'Payment #', render: (p) => link('payments?pay=' + p.id, p.id) }, { label: 'Date', render: (p) => formatDate(p.date) }, { label: 'Type', render: (p) => esc(p.type) }, { label: 'Invoice', render: (p) => (p.invoiceId ? link('invoice/' + p.invoiceId, p.invoiceId) : '—') }, { label: 'Method', render: (p) => esc(p.method) }, { label: 'Amount', align: 'right', render: (p) => money(p.amount) }, { label: 'Status', render: (p) => badge(p.status) }], payments, { empty: 'No payments received yet.' }), { actions: Auth.canView('payments') ? btn('Record payment', { icon: 'plus', cls: 'btn-sm', attrs: 'data-act="pay"', perm: 'create' }) : '' });
  if (tab === 'projects') T.innerHTML = card('Projects', renderTable([{ label: 'Project', render: (p) => link('project/' + p.id, `${p.id} · ${p.name}`) }, { label: 'Manager', render: (p) => esc(Lookup.employeeName(p.manager)) }, { label: 'End date', render: (p) => formatDate(p.endDate) }, { label: 'Budget', align: 'right', render: (p) => money(p.budget) }, { label: 'Revenue', align: 'right', render: (p) => money(Projects.revenue(p)) }, { label: 'Progress', render: (p) => progressBar(Projects.progress(p)) }, { label: 'Status', render: (p) => badge(p.status) }], projects, { empty: 'No projects for this customer.' }));
  if (tab === 'transactions') {
    const rows = withRunning(customerLedger(c.id));
    T.innerHTML = card('Account transactions', renderTable(ledgerColumns(), rows.slice().reverse(), { empty: 'No posted transactions.' }), { sub: 'Invoices increase the balance; payments reduce it', actions: `<a class="btn btn-sm" href="#/customer-statement/${c.id}">${icon('file', 14)} Full statement</a>` });
  }
  if (tab === 'notes') {
    T.innerHTML = card('Notes', `${Auth.can('edit') ? `<form class="note-form" novalidate><label for="note-text" class="sr-only">New note</label><textarea id="note-text" rows="3" placeholder="Add a note about this customer…"></textarea><div class="field-error" id="note-err"></div><button type="submit" class="btn btn-primary btn-sm">Add note</button></form>` : ''}
      <ul class="timeline">${(c.notes || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((n) => `<li><div class="tl-head"><strong>${esc(n.user)}</strong><span class="muted">${formatDate(n.date)}</span>${Auth.can('delete') ? `<button type="button" class="icon-btn sm" data-del-note="${n.id}" aria-label="Delete note">${icon('trash', 14)}</button>` : ''}</div><p>${esc(n.text)}</p></li>`).join('') || `<li class="empty">${emptyState('No notes yet.', 'Notes are visible to everyone with access to this customer.', 'edit', '', true)}</li>`}</ul>`);
    $('.note-form', T)?.addEventListener('submit', (e) => { e.preventDefault(); const t = $('#note-text', T).value.trim(); if (!t) { $('#note-err', T).textContent = 'Write a note before saving.'; return; } c.notes = c.notes || []; c.notes.push({ id: uid(), date: today(), user: Auth.userName(), text: t }); DB.save('customers'); DB.log(`Added note to ${c.company}`, c.id); showToast('Note added'); App.refresh(); });
    T.addEventListener('click', (e) => { const d = e.target.closest('[data-del-note]'); if (d) { c.notes = c.notes.filter((n) => n.id !== d.dataset.delNote); DB.save('customers'); showToast('Note deleted'); App.refresh(); } });
  }
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'edit') Customers.edit(c);
    if (a === 'quote') Quotations.create({ customerId: c.id });
    if (a === 'order') Orders.create({ customerId: c.id, paymentTerms: c.paymentTerms, billingAddress: c.billingAddress, shippingAddress: c.shippingAddress });
    if (a === 'invoice') Invoices.create({ customerId: c.id, paymentTerms: c.paymentTerms, dueDate: addDays(today(), Lookup.termsDays(c.paymentTerms)) });
    if (a === 'pay') PaymentsUI.record({ type: 'Customer Payment', partyId: c.id });
  });
};

/* ---------- Statements ---------- */
function statementPage(el, { kind, party, events, from, to, route }) {
  const before = events.filter((e) => e.date < from);
  const opening = round2(sum(before, (e) => e.debit - e.credit) * (kind === 'supplier' ? -1 : 1));
  const inRange = events.filter((e) => e.date >= from && e.date <= to);
  const sign = kind === 'supplier' ? -1 : 1;
  let bal = opening;
  const rows = inRange.map((e) => { bal = round2(bal + sign * (e.debit - e.credit)); return { ...e, balance: bal }; });
  const debits = round2(sum(inRange, (e) => e.debit)); const credits = round2(sum(inRange, (e) => e.credit));
  const name = kind === 'supplier' ? party.company : party.company;
  const summary = kind === 'supplier'
    ? [['Opening balance', opening], ['Purchases', credits], ['Payments', -sum(inRange.filter((e) => e.kind === 'payment'), (e) => e.debit)], ['Credits', -sum(inRange.filter((e) => e.kind === 'credit'), (e) => e.debit)], ['Outstanding balance', bal]]
    : [['Opening balance', opening], ['Total invoiced', debits], ['Total paid', -credits], ['Outstanding balance', bal]];
  el.innerHTML = pageHeader({ back: `${kind}/${party.id}`, title: `${kind === 'supplier' ? 'Supplier' : 'Customer'} statement`, subtitle: esc(name),
    actions: `<div class="date-range"><label class="sr-only" for="st-from">From</label><input type="date" id="st-from" value="${from}"><span>–</span><label class="sr-only" for="st-to">To</label><input type="date" id="st-to" value="${to}"></div>${btn('Print', { icon: 'printer', attrs: 'data-action="print"' })}${btn('Download', { icon: 'download', attrs: 'data-act="dl"' })}${kind === 'customer' ? btn('Send', { icon: 'send', cls: 'btn-primary', attrs: 'data-act="send"' }) : ''}` }) +
    `<div class="paper-wrap">${docViewHtml({ title: 'STATEMENT OF ACCOUNT', number: `${party.id}-${to.replace(/-/g, '')}`, parties: [{ label: kind === 'supplier' ? 'Supplier' : 'Customer', html: `<strong>${esc(name)}</strong><br>${esc(kind === 'supplier' ? party.contact : party.name)}<br>${esc(kind === 'supplier' ? party.address : party.billingAddress)}` }],
      meta: [['Statement date', formatDate(to)], ['Period', `${formatDate(from)} – ${formatDate(to)}`], ['Payment terms', esc(party.paymentTerms)], ['Opening balance', formatCurrency(opening)]],
      itemsHtml: `<table class="paper-table"><thead><tr><th>Date</th><th>Reference</th><th>Description</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead><tbody><tr class="muted-row"><td>${formatDate(from)}</td><td>—</td><td>Opening balance</td><td></td><td></td><td class="num">${formatCurrency(opening)}</td></tr>${rows.map((e) => `<tr><td>${formatDate(e.date)}</td><td>${esc(e.ref)}</td><td>${esc(e.description)}</td><td class="num">${e.debit ? formatCurrency(e.debit) : ''}</td><td class="num">${e.credit ? formatCurrency(e.credit) : ''}</td><td class="num">${formatCurrency(e.balance)}</td></tr>`).join('') || '<tr><td colspan="6" class="center muted">No transactions in this period.</td></tr>'}</tbody></table>`,
      bottomHtml: `<div class="paper-bottom"><div class="paper-notes"><div class="paper-label">Remittance</div><p>${esc(DB.data.settings.invoice.bank)}</p></div><dl class="paper-totals">${summary.map(([k, v], i) => `<div class="${i === summary.length - 1 ? 'grand' : ''}"><dt>${k}</dt><dd>${formatCurrency(v)}</dd></div>`).join('')}</dl></div>` })}</div>`;
  const go = () => navigateTo(`${route}/${party.id}?from=${$('#st-from', el).value || from}&to=${$('#st-to', el).value || to}`, { replace: true });
  $('#st-from', el).addEventListener('change', go); $('#st-to', el).addEventListener('change', go);
  $('[data-act="dl"]', el).addEventListener('click', () => downloadDocument(`Statement-${party.id}-${to}`, $('.paper', el)));
  $('[data-act="send"]', el)?.addEventListener('click', () => sendDialog({ title: 'Send statement', to: party.email, subject: `Statement of account — ${DB.data.settings.company.name}`, message: `Dear ${party.name},\n\nPlease find attached your statement for ${formatDate(from)} – ${formatDate(to)}. Outstanding balance: ${formatCurrency(bal)}.\n\nKind regards,\n${Auth.userName()}`, onSend: () => DB.log(`Sent statement to ${party.company}`, party.id) }));
}
Pages['customer-statement'] = (el, { id, query }) => {
  const c = DB.get('customers', id);
  if (!c) { el.innerHTML = errorState(`Customer ${id} was not found.`, false); return; }
  App.setCrumb(`Statement — ${c.company}`);
  statementPage(el, { kind: 'customer', party: c, events: customerLedger(c.id), from: query.from || periodStart(), to: query.to || today(), route: 'customer-statement' });
};

/* ---------- Suppliers ---------- */
const SUPPLIER_CATEGORIES = ['Electronics', 'Software', 'Equipment', 'Office Supplies', 'Services'];
const Suppliers = {
  fields(s) {
    return [
      { name: 'id', label: 'Supplier ID', required: true, disabled: !!s, unique: { collection: 'suppliers', exceptId: s?.id }, validate: (v) => (/^[A-Z]{2,4}-\d{3,5}$/.test(v) ? '' : 'Use the format SUP-016.') },
      { name: 'company', label: 'Company', required: true, unique: { collection: 'suppliers', exceptId: s?.id } }, { name: 'contact', label: 'Contact person', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'phone', label: 'Phone', type: 'tel', required: true },
      { name: 'category', label: 'Category', type: 'select', required: true, options: SUPPLIER_CATEGORIES }, { name: 'country', label: 'Country', type: 'select', required: true, options: COUNTRIES },
      { name: 'paymentTerms', label: 'Payment terms', type: 'select', required: true, options: Lookup.options.terms }, { name: 'taxId', label: 'Tax / VAT ID' },
      { name: 'website', label: 'Website' }, { name: 'status', label: 'Status', type: 'radio', options: ['Active', 'Inactive'] }, { name: 'address', label: 'Address', type: 'textarea', rows: 2, full: true },
    ];
  },
  edit(s, dup) {
    const isEdit = s && !dup;
    const vals = s ? { ...s } : { status: 'Active', paymentTerms: 'Net 30', country: 'USA' };
    if (!isEdit) { vals.id = DB.nextId('suppliers', 'SUP-', 3); if (dup) vals.company = s.company + ' (Copy)'; }
    formModal({ title: isEdit ? `Edit ${s.company}` : 'Add supplier', size: 'lg', fields: this.fields(isEdit ? s : null), values: vals, submitText: isEdit ? 'Save changes' : 'Create supplier',
      onSubmit: (v) => { if (isEdit) { delete v.id; DB.update('suppliers', s.id, v); DB.log(`Updated supplier ${s.id}`, s.id); showToast('Supplier updated successfully'); } else { DB.insert('suppliers', v); DB.log(`Created supplier ${v.company}`, v.id); showToast('Supplier created successfully'); } App.refresh(); } });
  },
  remove(s) {
    const n = DB.all('purchaseOrders').filter((p) => p.supplierId === s.id).length + DB.all('bills').filter((b) => b.supplierId === s.id).length;
    if (n) return { error: `${s.company} has ${n} purchase orders or invoices. Set the supplier to Inactive instead.` };
    DB.remove('suppliers', s.id); DB.log(`Deleted supplier ${s.company}`, s.id); return null;
  },
};
Pages.suppliers = (el) => {
  const all = DB.all('suppliers');
  el.innerHTML = pageHeader({ title: 'Suppliers', subtitle: `${all.length} vendors`, actions: btn('Add supplier', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' }) }) +
    statTiles([{ label: 'Active suppliers', value: all.filter((s) => s.status === 'Active').length }, { label: 'Purchases (all time)', value: formatCurrency(sum(all, (s) => Stats.supplier(s.id).purchases), true) }, { label: 'Outstanding payables', value: formatCurrency(Stats.apTotal(), true), nav: 'ap' }, { label: 'Open purchase orders', value: DB.all('purchaseOrders').filter((p) => ['Approved', 'Ordered', 'Partially Received', 'Pending Approval'].includes(p.status)).length, nav: 'purchasing' }]) +
    '<div class="card"><div class="card-body" id="sl"></div></div>';
  listView($('#sl', el), {
    key: 'suppliers', entity: 'suppliers', searchPlaceholder: 'Search suppliers…', rows: () => DB.all('suppliers'),
    filters: [{ key: 'category', label: 'Category', options: SUPPLIER_CATEGORIES }, { key: 'status', label: 'Status', options: ['Active', 'Inactive'] }, { key: 'paymentTerms', label: 'Terms', options: Lookup.options.terms }],
    columns: [
      { key: 'id', label: 'Supplier ID', render: (s) => `<strong>${esc(s.id)}</strong>` }, { key: 'company', label: 'Company', render: (s) => link('supplier/' + s.id, s.company) },
      { key: 'contact', label: 'Contact' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Phone' },
      { key: 'purchases', label: 'Total Purchases', align: 'right', value: (s) => Stats.supplier(s.id).purchases, render: (s) => money(Stats.supplier(s.id).purchases) },
      { key: 'outstanding', label: 'Outstanding', align: 'right', value: (s) => Stats.supplier(s.id).outstanding, render: (s) => money(Stats.supplier(s.id).outstanding) },
      { key: 'paymentTerms', label: 'Payment Terms' }, { key: 'status', label: 'Status', render: (s) => badge(s.status) },
    ],
    onView: (s) => navigateTo('supplier/' + s.id),
    actions: (s) => crudActions({ view: () => navigateTo('supplier/' + s.id), edit: () => Suppliers.edit(s), duplicate: () => Suppliers.edit(s, true), print: () => printRoute('supplier-statement/' + s.id), del: () => confirmDelete('Supplier', () => Suppliers.remove(s)),
      extra: [{ label: 'New purchase order', icon: 'clipboard', perm: 'create', onClick: () => PurchaseOrders.create({ supplierId: s.id, paymentTerms: s.paymentTerms }) }] }),
    onDelete: (rows) => { let ok = 0; rows.forEach((s) => { if (!Suppliers.remove(s)) ok++; }); showToast(`${ok} of ${rows.length} suppliers deleted`, ok < rows.length ? 'warning' : 'success'); },
    exportName: 'suppliers',
  });
  $('[data-act="add"]', el)?.addEventListener('click', () => Suppliers.edit(null));
};
function supplierLedger(sid) {
  const ev = [];
  DB.all('bills').filter((b) => b.supplierId === sid).forEach((b) => {
    ev.push({ date: b.date, ref: b.id, route: 'bill/' + b.id, description: `Supplier invoice ${b.number}${b.poId ? ' — ' + b.poId : ''}`, debit: 0, credit: Calc.doc(b).total, kind: 'bill' });
    if (b.status === 'Voided') ev.push({ date: b.voidedDate || b.date, ref: b.id, route: 'bill/' + b.id, description: 'Invoice voided (credit)', debit: Calc.doc(b).total, credit: 0, kind: 'credit' });
  });
  DB.all('payments').filter((p) => p.partyType === 'supplier' && p.partyId === sid && p.status !== 'Voided').forEach((p) => ev.push({ date: p.date, ref: p.id, route: 'payments?pay=' + p.id, description: `Payment${p.billId ? ' — ' + p.billId : ''} (${p.method})`, debit: p.amount, credit: 0, kind: 'payment' }));
  return ev.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : b.credit - a.credit));
}
Pages.supplier = (el, { id, query }) => {
  const s = DB.get('suppliers', id);
  if (!s) { el.innerHTML = errorState(`Supplier ${id} was not found.`, false); return; }
  App.setCrumb(s.company);
  const st = Stats.supplier(s.id);
  const pos = DB.all('purchaseOrders').filter((p) => p.supplierId === s.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const bills = DB.all('bills').filter((b) => b.supplierId === s.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const pays = DB.all('payments').filter((p) => p.partyType === 'supplier' && p.partyId === s.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  const prods = DB.all('products').filter((p) => p.supplierId === s.id);
  const tab = query.tab || 'overview';
  el.innerHTML = pageHeader({ back: 'suppliers', title: `${esc(s.company)} ${badge(s.status)}`, subtitle: `${esc(s.id)} · ${esc(s.category)} · ${esc(s.country)}`,
    actions: `${btn('Edit', { icon: 'edit', attrs: 'data-act="edit"', perm: 'edit' })}<a class="btn" href="#/supplier-statement/${s.id}">${icon('file', 16)} Statement</a>${Auth.canView('payments') ? btn('Pay supplier', { icon: 'card', attrs: 'data-act="pay"', perm: 'create' }) : ''}${Auth.canView('purchasing') ? btn('New purchase order', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="po"', perm: 'create' }) : ''}` }) +
    statTiles([{ label: 'Total purchases', value: formatCurrency(st.purchases) }, { label: 'Invoiced', value: formatCurrency(st.billed) }, { label: 'Outstanding', value: formatCurrency(st.outstanding), tone: st.outstanding ? 'warn' : '' }, { label: 'Purchase orders', value: st.poCount }, { label: 'Payment terms', value: esc(s.paymentTerms) }]) +
    tabsHtml([{ key: 'overview', label: 'Overview' }, { key: 'pos', label: 'Purchase Orders', count: pos.length }, { key: 'invoices', label: 'Invoices', count: bills.length }, { key: 'payments', label: 'Payments', count: pays.length }, { key: 'products', label: 'Products', count: prods.length }, { key: 'transactions', label: 'Transactions' }], tab, 'supplier/' + s.id) + '<div id="tab" class="tab-panel"></div>';
  const T = $('#tab', el);
  const billCols = [{ label: 'Invoice', render: (b) => link('bill/' + b.id, b.id) }, { label: 'Supplier ref', render: (b) => esc(b.number) }, { label: 'Date', render: (b) => formatDate(b.date) }, { label: 'Due', render: (b) => formatDate(b.dueDate) }, { label: 'Amount', align: 'right', render: (b) => money(Calc.doc(b).total) }, { label: 'Balance', align: 'right', render: (b) => money(Docs.balance(b)) }, { label: 'Status', render: (b) => badge(Docs.status(b)) }];
  const poCols = [{ label: 'PO #', render: (p) => link('po/' + p.id, p.id) }, { label: 'Date', render: (p) => formatDate(p.date) }, { label: 'Expected', render: (p) => formatDate(p.expectedDate) }, { label: 'Warehouse', render: (p) => esc(Lookup.warehouseName(p.warehouse)) }, { label: 'Total', align: 'right', render: (p) => money(Calc.doc(p).total) }, { label: 'Received', render: (p) => progressBar(Purchasing.receivedPct(p)) }, { label: 'Status', render: (p) => badge(p.status) }];
  if (tab === 'overview') T.innerHTML = `<div class="grid-2">${card('Supplier information', detailList([['Company', esc(s.company)], ['Contact', esc(s.contact)], ['Email', `<a class="link" href="mailto:${esc(s.email)}">${esc(s.email)}</a>`], ['Phone', esc(s.phone)], ['Address', esc(s.address)], ['Country', esc(s.country)], ['Tax / VAT ID', esc(s.taxId)], ['Website', esc(s.website)]]))}${card('Open supplier invoices', renderTable(billCols.slice(0, 1).concat(billCols.slice(3)), bills.filter(Docs.isOpen), { empty: 'Nothing owed to this supplier.' }))}</div>${card('Recent purchase orders', renderTable(poCols, pos.slice(0, 5), { empty: 'No purchase orders yet.' }))}`;
  if (tab === 'pos') T.innerHTML = card('Purchase orders', renderTable(poCols, pos, { empty: 'No purchase orders yet.' }));
  if (tab === 'invoices') T.innerHTML = card('Supplier invoices', renderTable(billCols, bills, { empty: 'No supplier invoices yet.' }));
  if (tab === 'payments') T.innerHTML = card('Payments', renderTable([{ label: 'Payment #', render: (p) => link('payments?pay=' + p.id, p.id) }, { label: 'Date', render: (p) => formatDate(p.date) }, { label: 'Invoice', render: (p) => (p.billId ? link('bill/' + p.billId, p.billId) : '—') }, { label: 'Method', render: (p) => esc(p.method) }, { label: 'Reference', render: (p) => esc(p.reference) }, { label: 'Amount', align: 'right', render: (p) => money(p.amount) }, { label: 'Status', render: (p) => badge(p.status) }], pays, { empty: 'No payments made yet.' }));
  if (tab === 'products') T.innerHTML = card('Products supplied', renderTable([{ label: 'SKU', render: (p) => link('product/' + p.id, p.id) }, { label: 'Product', render: (p) => esc(p.name) }, { label: 'Unit cost', align: 'right', render: (p) => money(p.cost) }, { label: 'On hand', align: 'right', render: (p) => formatNumber(Inventory.total(p)) }, { label: 'Stock', render: (p) => badge(Inventory.level(p)) }], prods, { empty: 'No products linked to this supplier.' }));
  if (tab === 'transactions') { let bal = 0; const rows = supplierLedger(s.id).map((e) => { bal = round2(bal + e.credit - e.debit); return { ...e, balance: bal }; }); T.innerHTML = card('Account transactions', renderTable(ledgerColumns(), rows.reverse(), { empty: 'No transactions.' }), { sub: 'Invoices increase what we owe; payments reduce it' }); }
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'edit') Suppliers.edit(s);
    if (a === 'po') PurchaseOrders.create({ supplierId: s.id, paymentTerms: s.paymentTerms });
    if (a === 'pay') PaymentsUI.record({ type: 'Supplier Payment', partyId: s.id });
  });
};
Pages['supplier-statement'] = (el, { id, query }) => {
  const s = DB.get('suppliers', id);
  if (!s) { el.innerHTML = errorState(`Supplier ${id} was not found.`, false); return; }
  App.setCrumb(`Statement — ${s.company}`);
  statementPage(el, { kind: 'supplier', party: { ...s, name: s.contact, billingAddress: s.address }, events: supplierLedger(s.id), from: query.from || periodStart(), to: query.to || today(), route: 'supplier-statement' });
};
