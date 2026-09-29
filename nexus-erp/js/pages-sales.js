/* ==========================================================================
   NEXUS ERP — pages-sales.js
   Sales dashboard, Quotations (list/detail/convert) and Orders (list/detail/lifecycle).
   ========================================================================== */
'use strict';

const QUOTE_STATUSES = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Converted'];
const ORDER_STATUSES = ['Draft', 'Confirmed', 'Processing', 'Ready', 'Shipped', 'Delivered', 'Completed', 'Cancelled'];

/* ---------- Quotations service ---------- */
const Quotations = {
  create(prefill = {}) {
    if (!Auth.can('create')) { showToast('Your role does not allow creating records.', 'error'); return; }
    DocEditor.openNew({ kind: 'quotation', title: 'New quotation', submitText: 'Save draft', altText: 'Save & send', onSave: (d, { alt }) => {
      const q = Sales.saveQuotation({ ...d, status: alt ? 'Sent' : 'Draft' });
      showToast(alt ? `Quotation ${q.id} created and sent` : `Quotation ${q.id} saved as draft`);
      navigateTo('quotation/' + q.id);
    } }, prefill);
  },
  edit(q) {
    if (!['Draft', 'Sent'].includes(q.status)) { showToast(`${q.status} quotations cannot be edited.`, 'error'); return; }
    DocEditor.open({ kind: 'quotation', doc: q, title: `Edit quotation ${q.id}`, submitText: 'Save changes', onSave: (d) => { Sales.saveQuotation(d); showToast('Quotation updated successfully'); App.refresh(); } });
  },
  duplicate(q) { const n = Sales.saveQuotation({ ...deepClone(q), id: null, orderId: null, status: 'Draft', date: today(), expiryDate: addDays(today(), 30) }); showToast(`Duplicated as ${n.id}`); navigateTo('quotation/' + n.id); },
  send(q) {
    const c = DB.get('customers', q.customerId);
    sendDialog({ title: `Send quotation ${q.id}`, to: c?.email || '', subject: `Quotation ${q.id} from ${DB.data.settings.company.name}`, message: `Dear ${c?.name || 'customer'},\n\nPlease find attached quotation ${q.id} for ${formatCurrency(Calc.doc(q).total)}, valid until ${formatDate(q.expiryDate)}.\n\nKind regards,\n${Auth.userName()}`,
      onSend: () => { if (q.status === 'Draft') Sales.setQuoteStatus(q, 'Sent'); else DB.log(`Resent quotation ${q.id}`, q.id); App.refresh(); } });
  },
  convert(q) {
    if (!Auth.canView('orders')) { showToast('Your role cannot create orders.', 'error'); return; }
    const o = Sales.convertQuotation(q);
    showToast(`Quotation converted to order ${o.id}`);
    navigateTo('order/' + o.id);
  },
  remove(q) { if (q.status === 'Converted') return { error: 'Converted quotations cannot be deleted.' }; DB.remove('quotations', q.id); DB.log(`Deleted quotation ${q.id}`, q.id); return null; },
  actions(q) {
    const st = Sales.quoteStatus(q);
    return crudActions({ view: () => navigateTo('quotation/' + q.id), edit: ['Draft', 'Sent'].includes(q.status) ? () => this.edit(q) : null, duplicate: () => this.duplicate(q), print: () => printRoute('quotation/' + q.id), del: q.status !== 'Converted' ? () => confirmDelete('Quotation', () => this.remove(q)) : null,
      extra: [['Draft', 'Sent'].includes(st) && { label: st === 'Draft' ? 'Send to customer' : 'Resend', icon: 'send', perm: 'edit', onClick: () => this.send(q) },
        st === 'Sent' && { label: 'Mark accepted', icon: 'check', perm: 'edit', onClick: () => { Sales.setQuoteStatus(q, 'Accepted'); showToast('Quotation marked as accepted'); App.refresh(); } },
        st === 'Accepted' && { label: 'Convert to order', icon: 'repeat', perm: 'create', onClick: () => this.convert(q) }].filter(Boolean) });
  },
};

Pages.sales = (el) => {
  const months = lastMonths(9);
  const invs = DB.all('invoices').filter((i) => !['Draft', 'Cancelled'].includes(i.status));
  const byMonth = months.map((m) => round2(sum(invs.filter((i) => monthKey(i.date) === m.key), (i) => Calc.doc(i).net)));
  const cur = byMonth[byMonth.length - 1]; const prev = byMonth[byMonth.length - 2];
  const target = DB.data.settings.salesTarget || 70000;
  const qs = DB.all('quotations'); const decided = qs.filter((q) => ['Converted', 'Accepted', 'Rejected', 'Expired'].includes(Sales.quoteStatus(q)));
  const won = decided.filter((q) => ['Converted', 'Accepted'].includes(q.status));
  const openQ = qs.filter((q) => ['Draft', 'Sent', 'Accepted'].includes(Sales.quoteStatus(q)));
  const orders = DB.all('orders').filter((o) => o.status !== 'Cancelled');
  const since = periodStart();
  const recent = orders.filter((o) => o.date >= since);
  const bySp = groupBy(recent, (o) => o.salesperson);
  const byCust = groupBy(invs.filter((i) => i.date >= since), (i) => i.customerId);
  const prodSales = {};
  invs.filter((i) => i.date >= since).forEach((i) => i.items.forEach((it) => { if (it.productId) prodSales[it.productId] = (prodSales[it.productId] || 0) + Calc.line(it).net; }));
  el.innerHTML = pageHeader({ title: 'Sales Dashboard', subtitle: 'Pipeline, performance and top accounts', actions: `${btn('New quotation', { icon: 'file', attrs: 'data-act="quote"', perm: 'create' })}${Auth.canView('orders') ? btn('New order', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="order"', perm: 'create' }) : ''}` }) +
    `<div class="ledger-strip four">
      ${kpiCard({ label: 'Net sales this month', value: formatCurrency(cur, true), delta: pctChange(cur, prev), deltaLabel: 'vs last month', icon: 'trending', nav: 'reports?cat=sales&report=sales-month' })}
      ${kpiCard({ label: 'Monthly target', value: `${Math.round((cur / target) * 100)}%`, sub: `${formatCurrency(cur, true)} of ${formatCurrency(target, true)}`, icon: 'flag' })}
      ${kpiCard({ label: 'Open quotations', value: formatCurrency(sum(openQ, (q) => Calc.doc(q).total), true), sub: `${openQ.length} quotations`, icon: 'file', nav: 'quotations?status=open' })}
      ${kpiCard({ label: 'Quote win rate', value: decided.length ? `${Math.round((won.length / decided.length) * 100)}%` : '—', sub: `${won.length} won of ${decided.length} decided`, icon: 'check', nav: 'quotations' })}
    </div>
    <div class="grid-dash">
      ${card('Net sales by month', Charts.combo({ labels: months.map((m) => m.label), bars: [{ name: 'Net sales', values: byMonth, color: 'var(--c1)' }], lines: [{ name: 'Target', values: months.map(() => target), color: 'var(--c5)' }] }), { cls: 'span-2', sub: 'Invoiced, excluding tax' })}
      ${card('Sales by salesperson', Charts.hbars({ items: Object.entries(bySp).map(([id, os]) => ({ label: Lookup.employeeName(id), value: round2(sum(os, (o) => Calc.doc(o).net)), nav: 'reports?cat=sales&report=sales-person' })).sort((a, b) => b.value - a.value), color: 'var(--c2)' }), { sub: 'Orders, last 9 months' })}
      ${card('Top customers', Charts.hbars({ items: Object.entries(byCust).map(([id, is]) => ({ label: Lookup.customerName(id), value: round2(sum(is, (i) => Calc.doc(i).net)), nav: 'customer/' + id })).sort((a, b) => b.value - a.value).slice(0, 6) }))}
      ${card('Top products & services', Charts.hbars({ items: Object.entries(prodSales).map(([id, v]) => ({ label: Lookup.productName(id), value: round2(v), nav: 'product/' + id })).sort((a, b) => b.value - a.value).slice(0, 6), color: 'var(--c3)' }))}
      ${card('Orders in progress', renderTable([{ label: 'Order', render: (o) => link('order/' + o.id, o.id) }, { label: 'Customer', render: (o) => esc(Lookup.customerName(o.customerId)) }, { label: 'Total', align: 'right', render: (o) => money(Calc.doc(o).total) }, { label: 'Status', render: (o) => badge(o.status) }], orders.filter((o) => ['Draft', 'Confirmed', 'Processing', 'Ready', 'Shipped'].includes(o.status)).slice(-6).reverse(), { cls: 'compact', empty: 'No orders in progress.' }), { actions: `<a class="btn btn-ghost btn-sm" href="#/orders?status=open">All ${icon('arrowRight', 14)}</a>` })}
      ${card('Latest quotations', renderTable([{ label: 'Quotation', render: (q) => link('quotation/' + q.id, q.id) }, { label: 'Customer', render: (q) => esc(Lookup.customerName(q.customerId)) }, { label: 'Expires', render: (q) => formatDate(q.expiryDate) }, { label: 'Total', align: 'right', render: (q) => money(Calc.doc(q).total) }, { label: 'Status', render: (q) => badge(Sales.quoteStatus(q)) }], qs.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6), { cls: 'compact' }), { cls: 'span-2', actions: `<a class="btn btn-ghost btn-sm" href="#/quotations">All ${icon('arrowRight', 14)}</a>` })}
    </div>`;
  $('[data-act="quote"]', el)?.addEventListener('click', () => Quotations.create());
  $('[data-act="order"]', el)?.addEventListener('click', () => Orders.create());
};

Pages.quotations = (el, { query }) => {
  const qs = DB.all('quotations');
  el.innerHTML = pageHeader({ title: 'Quotations', subtitle: `${qs.length} quotations`, actions: btn('New quotation', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' }) }) +
    statTiles(QUOTE_STATUSES.map((s) => { const r = qs.filter((q) => Sales.quoteStatus(q) === s); return { label: s, value: r.length, sub: formatCurrency(sum(r, (q) => Calc.doc(q).total), true), nav: 'quotations?status=' + s }; })) +
    '<div class="card"><div class="card-body" id="ql"></div></div>';
  listView($('#ql', el), {
    key: 'quotations', entity: 'quotations', searchPlaceholder: 'Search quotations…', rows: () => DB.all('quotations'),
    filters: [{ key: 'status', label: 'Status', options: [{ value: 'open', label: 'Open (Draft/Sent/Accepted)' }, ...QUOTE_STATUSES], test: (q, v) => (v === 'open' ? ['Draft', 'Sent', 'Accepted'].includes(Sales.quoteStatus(q)) : Sales.quoteStatus(q) === v) },
      { key: 'salesperson', label: 'Salesperson', options: () => Lookup.options.employees('Sales') }],
    preset: query.status ? { status: query.status } : null, dateField: (q) => q.date, defaultSort: { key: 'id', dir: 'desc' },
    searchFields: [(q) => q.id, (q) => Lookup.customerName(q.customerId), (q) => Lookup.employeeName(q.salesperson)],
    columns: [
      { key: 'id', label: 'Quotation #', render: (q) => `<strong>${esc(q.id)}</strong>` },
      { key: 'customer', label: 'Customer', value: (q) => Lookup.customerName(q.customerId), render: (q) => link('customer/' + q.customerId, Lookup.customerName(q.customerId)) },
      { key: 'date', label: 'Date', render: (q) => formatDate(q.date), value: (q) => q.date }, { key: 'expiryDate', label: 'Expires', render: (q) => formatDate(q.expiryDate), value: (q) => q.expiryDate },
      { key: 'salesperson', label: 'Salesperson', value: (q) => Lookup.employeeName(q.salesperson) },
      { key: 'total', label: 'Total', align: 'right', value: (q) => Calc.doc(q).total, render: (q) => money(Calc.doc(q).total) },
      { key: 'status', label: 'Status', value: (q) => Sales.quoteStatus(q), render: (q) => badge(Sales.quoteStatus(q)) },
    ],
    onView: (q) => navigateTo('quotation/' + q.id), actions: (q) => Quotations.actions(q),
    onDelete: (rows) => { let ok = 0; rows.forEach((q) => { if (!Quotations.remove(q)) ok++; }); showToast(`${ok} of ${rows.length} quotations deleted`, ok < rows.length ? 'warning' : 'success'); },
    exportName: 'quotations',
  });
  $('[data-act="add"]', el)?.addEventListener('click', () => Quotations.create());
};

Pages.quotation = (el, { id }) => {
  const q = DB.get('quotations', id);
  if (!q) { el.innerHTML = errorState(`Quotation ${id} was not found.`, false); return; }
  App.setCrumb(q.id);
  const st = Sales.quoteStatus(q); const c = DB.get('customers', q.customerId);
  const E = Auth.can('edit');
  el.innerHTML = pageHeader({ back: 'quotations', title: `Quotation ${esc(q.id)} ${badge(st)}`, subtitle: `${esc(Lookup.customerName(q.customerId))} · ${formatCurrency(Calc.doc(q).total)}`,
    actions: `${btn('Print', { icon: 'printer', attrs: 'data-action="print"' })}${btn('Download', { icon: 'download', attrs: 'data-act="dl"' })}${btn('Duplicate', { icon: 'copy', attrs: 'data-act="dup"', perm: 'create' })}
      ${['Draft', 'Sent'].includes(q.status) && E ? btn('Edit', { icon: 'edit', attrs: 'data-act="edit"' }) : ''}
      ${['Draft', 'Sent'].includes(st) && E ? btn(st === 'Draft' ? 'Send' : 'Resend', { icon: 'send', attrs: 'data-act="send"', cls: st === 'Draft' ? 'btn-primary' : '' }) : ''}
      ${st === 'Sent' && E ? btn('Reject', { icon: 'x', attrs: 'data-act="reject"' }) + btn('Mark accepted', { icon: 'check', cls: 'btn-primary', attrs: 'data-act="accept"' }) : ''}
      ${st === 'Accepted' && Auth.can('create') ? btn('Convert to order', { icon: 'repeat', cls: 'btn-primary', attrs: 'data-act="convert"' }) : ''}
      ${q.orderId ? `<a class="btn btn-primary" href="#/order/${q.orderId}">${icon('cart', 16)} View order ${esc(q.orderId)}</a>` : ''}` }) +
    `${st === 'Expired' ? `<div class="notice warn no-print">${icon('alert', 16)} This quotation expired on ${formatDate(q.expiryDate)}. Duplicate it to send updated pricing.</div>` : ''}
    <div class="paper-wrap">${docViewHtml({ title: 'QUOTATION', number: q.id, status: st, doc: q, items: q.items, notes: q.notes, terms: q.terms,
      parties: [{ label: 'Prepared for', html: `<strong>${esc(c?.company)}</strong><br>${esc(c?.name)}<br>${esc(c?.billingAddress)}<br>${esc(c?.email)}` }],
      meta: [['Quotation date', formatDate(q.date)], ['Valid until', formatDate(q.expiryDate)], ['Salesperson', esc(Lookup.employeeName(q.salesperson))], ['Customer ID', esc(q.customerId)]] })}</div>`;
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'dl') downloadDocument(`Quotation-${q.id}`, $('.paper', el));
    if (a === 'dup') Quotations.duplicate(q);
    if (a === 'edit') Quotations.edit(q);
    if (a === 'send') Quotations.send(q);
    if (a === 'accept') { Sales.setQuoteStatus(q, 'Accepted'); showToast('Quotation accepted — ready to convert'); App.refresh(); }
    if (a === 'reject') confirmDialog({ title: 'Mark quotation as rejected?', confirmText: 'Mark rejected' }).then((ok) => { if (ok) { Sales.setQuoteStatus(q, 'Rejected'); showToast('Quotation marked as rejected', 'info'); App.refresh(); } });
    if (a === 'convert') Quotations.convert(q);
  });
};

/* ---------- Orders service ---------- */
const Orders = {
  create(prefill = {}) {
    if (!Auth.can('create')) { showToast('Your role does not allow creating records.', 'error'); return; }
    DocEditor.openNew({ kind: 'order', title: 'New sales order', submitText: 'Save draft', altText: 'Save & confirm', onSave: (d, { alt }) => {
      const o = Sales.saveOrder({ ...d, status: 'Draft' });
      if (alt) Sales.advance(o);
      showToast(`Order ${o.id} ${alt ? 'created and confirmed' : 'saved as draft'}`);
      navigateTo('order/' + o.id);
    } }, prefill);
  },
  edit(o) {
    if (!['Draft', 'Confirmed'].includes(o.status)) { showToast('Only draft or confirmed orders can be edited.', 'error'); return; }
    DocEditor.open({ kind: 'order', doc: o, title: `Edit order ${o.id}`, submitText: 'Save changes', onSave: (d) => { Sales.saveOrder(d); showToast('Order updated successfully'); App.refresh(); } });
  },
  duplicate(o) { const n = Sales.saveOrder({ ...deepClone(o), id: null, status: 'Draft', date: today(), invoiceId: null, quotationId: null, shippedDate: null, deliveredDate: null }); showToast(`Duplicated as ${n.id}`); navigateTo('order/' + n.id); },
  advance(o) {
    const r = Sales.advance(o);
    if (r.error) { showToast(r.error, 'error'); return; }
    showToast(`Order ${o.id} is now ${r.status}`);
    App.refresh();
  },
  cancel(o) { confirmDialog({ title: `Cancel order ${o.id}?`, message: 'Reserved stock will be released.', confirmText: 'Cancel order' }).then((ok) => { if (!ok) return; const r = Sales.cancelOrder(o); if (r.error) showToast(r.error, 'error'); else { showToast('Order cancelled', 'info'); App.refresh(); } }); },
  invoice(o) {
    if (!Auth.canView('billing') || !Auth.can('create')) { showToast('Your role cannot create invoices.', 'error'); return; }
    const r = Sales.createInvoiceFromOrder(o, true);
    if (r.error) { showToast(r.error, 'error'); return; }
    showToast(`Invoice ${r.invoice.id} created and sent`);
    navigateTo('invoice/' + r.invoice.id);
  },
  remove(o) { if (!['Draft', 'Cancelled'].includes(o.status)) return { error: 'Only draft or cancelled orders can be deleted.' }; if (o.invoiceId && DB.get('invoices', o.invoiceId)?.status !== 'Cancelled') return { error: 'This order has an invoice.' }; DB.remove('orders', o.id); DB.log(`Deleted order ${o.id}`, o.id); return null; },
  actions(o) {
    const next = ORDER_FLOW[o.status];
    return crudActions({ view: () => navigateTo('order/' + o.id), edit: ['Draft', 'Confirmed'].includes(o.status) ? () => this.edit(o) : null, duplicate: () => this.duplicate(o), print: () => printRoute('order/' + o.id), del: ['Draft', 'Cancelled'].includes(o.status) ? () => confirmDelete('Order', () => this.remove(o)) : null,
      extra: [next && { label: ORDER_FLOW_LABEL[o.status], icon: 'arrowRight', perm: 'edit', onClick: () => this.advance(o) }, !o.invoiceId && !['Draft', 'Cancelled'].includes(o.status) && { label: 'Create invoice', icon: 'file', perm: 'create', onClick: () => this.invoice(o) }].filter(Boolean) });
  },
};

Pages.orders = (el, { query }) => {
  const os = DB.all('orders');
  const presetMap = { open: 'open', delivery: 'delivery' };
  el.innerHTML = pageHeader({ title: 'Orders', subtitle: `${os.length} sales orders`, actions: btn('New order', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' }) }) +
    statTiles([['Open', (o) => ['Draft', 'Confirmed', 'Processing', 'Ready'].includes(o.status), 'orders?status=open'], ['Shipping / delivered', (o) => ['Shipped', 'Delivered'].includes(o.status), 'orders?status=delivery'], ['Completed', (o) => o.status === 'Completed', 'orders?status=Completed'], ['Awaiting payment', (o) => ['Unpaid', 'Partial'].includes(Sales.paymentStatus(o)), 'orders?payment=Unpaid']].map(([l, f, nav]) => { const r = os.filter(f); return { label: l, value: r.length, sub: formatCurrency(sum(r, (o) => Calc.doc(o).total), true), nav }; })) +
    '<div class="card"><div class="card-body" id="ol"></div></div>';
  listView($('#ol', el), {
    key: 'orders', entity: 'orders', searchPlaceholder: 'Search by order #, customer…', rows: () => DB.all('orders'),
    filters: [
      { key: 'status', label: 'Status', options: [{ value: 'open', label: 'Open (not shipped)' }, { value: 'delivery', label: 'Shipped / delivered' }, ...ORDER_STATUSES], test: (o, v) => (v === 'open' ? ['Draft', 'Confirmed', 'Processing', 'Ready'].includes(o.status) : v === 'delivery' ? ['Shipped', 'Delivered'].includes(o.status) : o.status === v) },
      { key: 'payment', label: 'Payment', options: ['Not Invoiced', 'Unpaid', 'Partial', 'Paid'], test: (o, v) => (v === 'Unpaid' && query.payment === 'Unpaid' ? ['Unpaid', 'Partial'].includes(Sales.paymentStatus(o)) : Sales.paymentStatus(o) === v) },
      { key: 'salesperson', label: 'Salesperson', options: () => Lookup.options.employees('Sales') }],
    preset: query.status || query.payment ? { ...(query.status ? { status: presetMap[query.status] || query.status } : {}), ...(query.payment ? { payment: query.payment } : {}) } : null,
    dateField: (o) => o.date, defaultSort: { key: 'id', dir: 'desc' },
    searchFields: [(o) => o.id, (o) => Lookup.customerName(o.customerId), (o) => Lookup.employeeName(o.salesperson), (o) => o.invoiceId],
    columns: [
      { key: 'id', label: 'Order #', render: (o) => `<strong>${esc(o.id)}</strong>` },
      { key: 'customer', label: 'Customer', value: (o) => Lookup.customerName(o.customerId), render: (o) => link('customer/' + o.customerId, Lookup.customerName(o.customerId)) },
      { key: 'date', label: 'Date', value: (o) => o.date, render: (o) => formatDate(o.date) },
      { key: 'salesperson', label: 'Salesperson', value: (o) => Lookup.employeeName(o.salesperson) },
      { key: 'total', label: 'Total', align: 'right', value: (o) => Calc.doc(o).total, render: (o) => money(Calc.doc(o).total) },
      { key: 'payment', label: 'Payment Status', value: (o) => Sales.paymentStatus(o), render: (o) => badge(Sales.paymentStatus(o)) },
      { key: 'fulfillment', label: 'Fulfillment', value: (o) => Sales.fulfillment(o), render: (o) => badge(Sales.fulfillment(o)) },
      { key: 'status', label: 'Order Status', render: (o) => badge(o.status) },
    ],
    onView: (o) => navigateTo('order/' + o.id), actions: (o) => Orders.actions(o),
    onDelete: (rows) => { let ok = 0; rows.forEach((o) => { if (!Orders.remove(o)) ok++; }); showToast(`${ok} of ${rows.length} orders deleted${ok < rows.length ? ' — only draft/cancelled orders can be deleted' : ''}`, ok < rows.length ? 'warning' : 'success'); },
    exportName: 'orders',
  });
  $('[data-act="add"]', el)?.addEventListener('click', () => Orders.create());
};

function statusStepper(flow, current, cancelled) {
  const idx = flow.indexOf(current);
  return `<ol class="stepper ${cancelled ? 'cancelled' : ''}" aria-label="Status progress">${flow.map((s, i) => `<li class="${i < idx ? 'done' : i === idx ? 'current' : ''}" ${i === idx ? 'aria-current="step"' : ''}><span class="st-dot">${i < idx ? icon('check', 12) : i + 1}</span><span class="st-label">${esc(s)}</span></li>`).join('')}</ol>`;
}
function activityFor(ref, limit = 12) {
  const rows = DB.all('activity').filter((a) => a.ref === ref).slice(0, limit);
  return rows.length ? `<ul class="timeline compact">${rows.map((a) => `<li><div class="tl-head"><strong>${esc(a.user)}</strong><span class="muted">${formatDateTime(a.ts)}</span></div><p>${esc(a.action)}</p></li>`).join('')}</ul>` : emptyState('No activity recorded yet.', '', 'activity', '', true);
}

Pages.order = (el, { id }) => {
  const o = DB.get('orders', id);
  if (!o) { el.innerHTML = errorState(`Order ${id} was not found.`, false); return; }
  App.setCrumb(o.id);
  const c = DB.get('customers', o.customerId); const t = Calc.doc(o);
  const inv = o.invoiceId ? DB.get('invoices', o.invoiceId) : null;
  const next = ORDER_FLOW[o.status]; const E = Auth.can('edit');
  const wh = o.warehouse || 'WH-MAIN';
  const paid = inv && inv.status !== 'Cancelled' ? inv.paid || 0 : 0;
  el.innerHTML = pageHeader({ back: 'orders', title: `Order ${esc(o.id)} ${badge(o.status)}`, subtitle: `${esc(Lookup.customerName(o.customerId))} · placed ${formatDate(o.date)}`,
    actions: `${btn('Print', { icon: 'printer', attrs: 'data-action="print"' })}${btn('Duplicate', { icon: 'copy', attrs: 'data-act="dup"', perm: 'create' })}
      ${['Draft', 'Confirmed'].includes(o.status) && E ? btn('Edit', { icon: 'edit', attrs: 'data-act="edit"' }) : ''}
      ${!['Shipped', 'Delivered', 'Completed', 'Cancelled'].includes(o.status) && E ? btn('Cancel order', { icon: 'x', attrs: 'data-act="cancel"' }) : ''}
      ${!o.invoiceId || inv?.status === 'Cancelled' ? (!['Draft', 'Cancelled'].includes(o.status) && Auth.can('create') && Auth.canView('billing') ? btn('Create invoice', { icon: 'file', attrs: 'data-act="invoice"' }) : '') : `<a class="btn" href="#/invoice/${inv.id}">${icon('file', 16)} Invoice ${esc(inv.id)}</a>`}
      ${inv && Docs.isOpen(inv) && Auth.canView('payments') && Auth.can('create') ? btn('Record payment', { icon: 'card', attrs: 'data-act="pay"' }) : ''}
      ${next && E ? btn(ORDER_FLOW_LABEL[o.status], { icon: 'arrowRight', cls: 'btn-primary', attrs: 'data-act="advance"' }) : ''}` }) +
    `<div class="card no-print">${o.status === 'Cancelled' ? `<div class="notice danger">${icon('x', 16)} This order was cancelled.</div>` : statusStepper(['Draft', 'Confirmed', 'Processing', 'Ready', 'Shipped', 'Delivered', 'Completed'], o.status === 'Ready' ? 'Ready' : o.status)}</div>
    <div class="grid-detail">
      <div class="print-area">${docViewHtml({ title: 'SALES ORDER', number: o.id, status: o.status, doc: o, items: o.items, notes: o.notes,
        parties: [{ label: 'Bill to', html: `<strong>${esc(c?.company)}</strong><br>${esc(o.billingAddress || c?.billingAddress)}` }, { label: 'Ship to', html: `<strong>${esc(c?.company)}</strong><br>${esc(o.shippingAddress || c?.shippingAddress)}` }],
        meta: [['Order date', formatDate(o.date)], ['Payment terms', esc(o.paymentTerms)], ['Salesperson', esc(Lookup.employeeName(o.salesperson))], ['Warehouse', esc(Lookup.warehouseName(wh))]] })}</div>
      <aside class="side-stack no-print">
        ${card('Order summary', `<dl class="summary"><div><dt>Subtotal</dt><dd>${formatCurrency(t.subtotal)}</dd></div><div><dt>Discount</dt><dd>−${formatCurrency(t.discount)}</dd></div><div><dt>Tax</dt><dd>${formatCurrency(t.tax)}</dd></div><div><dt>Shipping</dt><dd>${formatCurrency(t.shipping)}</dd></div><div class="grand"><dt>Grand total</dt><dd>${formatCurrency(t.total)}</dd></div><div><dt>Paid amount</dt><dd>${formatCurrency(paid)}</dd></div><div class="due"><dt>Balance due</dt><dd>${formatCurrency(inv && inv.status !== 'Cancelled' ? Docs.balance(inv) : t.total)}</dd></div></dl>`)}
        ${card('Status', detailList([['Payment status', badge(Sales.paymentStatus(o))], ['Fulfillment', badge(Sales.fulfillment(o))], ['Invoice', inv ? link('invoice/' + inv.id, inv.id) : '—'], ['Quotation', o.quotationId ? link('quotation/' + o.quotationId, o.quotationId) : '—'], ['Shipped', formatDate(o.shippedDate)], ['Delivered', formatDate(o.deliveredDate)]], 1))}
        ${card('Stock availability', renderTable([{ label: 'Item', render: (i) => esc(Lookup.productName(i.productId)) }, { label: 'Qty', align: 'right', render: (i) => i.qty }, { label: `In ${Lookup.warehouseName(wh)}`, align: 'right', render: (i) => { const p = DB.get('products', i.productId); if (!p || p.type !== 'stock') return '<span class="muted">n/a</span>'; const n = p.stock?.[wh] || 0; return `<span class="${n < i.qty && !['Shipped', 'Delivered', 'Completed'].includes(o.status) ? 'text-danger' : ''}">${n}</span>`; } }], o.items, { cls: 'compact' }))}
        ${card('Activity', activityFor(o.id))}
      </aside></div>`;
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'advance') Orders.advance(o);
    if (a === 'edit') Orders.edit(o);
    if (a === 'dup') Orders.duplicate(o);
    if (a === 'cancel') Orders.cancel(o);
    if (a === 'invoice') Orders.invoice(o);
    if (a === 'pay') PaymentsUI.record({ type: 'Invoice Payment', partyId: o.customerId, invoiceId: inv.id });
  });
};
