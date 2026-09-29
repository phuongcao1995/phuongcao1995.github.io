/* ==========================================================================
   NEXUS ERP — pages-purchasing.js
   Purchase requests, purchase orders (approval flow), goods receipts and
   supplier invoices (bills).
   ========================================================================== */
'use strict';

const PO_STATUSES = ['Draft', 'Pending Approval', 'Approved', 'Ordered', 'Partially Received', 'Received', 'Cancelled'];
const PR_STATUSES = ['Draft', 'Submitted', 'Approved', 'Rejected', 'Converted'];

const PurchaseOrders = {
  create(prefill = {}) {
    if (!Auth.can('create')) { showToast('Your role does not allow creating records.', 'error'); return; }
    DocEditor.openNew({ kind: 'po', title: 'New purchase order', submitText: 'Save draft', altText: 'Save & submit for approval', onSave: (d, { alt }) => {
      const po = Purchasing.savePO({ ...d, status: alt ? 'Pending Approval' : 'Draft' });
      if (alt) Notify.push('info', 'Purchase approval needed', `Purchase Order ${po.id} for ${Lookup.supplierName(po.supplierId)} is waiting for approval.`, 'po/' + po.id);
      showToast(`Purchase order ${po.id} ${alt ? 'submitted for approval' : 'saved as draft'}`);
      navigateTo('po/' + po.id);
    } }, prefill);
  },
  edit(po) {
    if (!['Draft', 'Pending Approval'].includes(po.status)) { showToast('Only draft or pending purchase orders can be edited.', 'error'); return; }
    DocEditor.open({ kind: 'po', doc: po, title: `Edit ${po.id}`, submitText: 'Save changes', onSave: (d) => { Purchasing.savePO(d); showToast('Purchase order updated successfully'); App.refresh(); } });
  },
  duplicate(po) { const n = Purchasing.savePO({ ...deepClone(po), id: null, status: 'Draft', date: today(), expectedDate: addDays(today(), 14), requestId: null, items: po.items.map((i) => ({ ...deepClone(i), received: 0, rejected: 0, billed: 0 })) }); showToast(`Duplicated as ${n.id}`); navigateTo('po/' + n.id); },
  setStatus(po, status, msg) { Purchasing.setStatus(po, status); showToast(msg || `Purchase order ${po.id} is now ${status}`); App.refresh(); },
  approve(po) { if (!Auth.can('approve')) { showToast('Your role cannot approve purchase orders.', 'error'); return; } this.setStatus(po, 'Approved', `Purchase order ${po.id} approved`); },
  cancel(po) {
    if (sum(po.items, (i) => i.received || 0) > 0) { showToast('Purchase orders with received goods cannot be cancelled.', 'error'); return; }
    confirmDialog({ title: `Cancel ${po.id}?`, confirmText: 'Cancel purchase order' }).then((ok) => ok && this.setStatus(po, 'Cancelled'));
  },
  receive(po) {
    if (!['Ordered', 'Partially Received', 'Approved'].includes(po.status)) { showToast('Goods can only be received for approved or ordered purchase orders.', 'error'); return; }
    const lines = po.items.map((it, i) => ({ it, i, rem: Purchasing.remaining(it) })).filter((l) => l.rem > 0);
    const m = Modal.open({ title: `Receive goods — ${po.id}`, size: 'lg', body: `<form novalidate class="receive-form"><div class="form-grid">${renderField({ name: 'warehouse', label: 'Receiving warehouse', type: 'select', required: true, options: Lookup.options.warehouses, noEmpty: true }, po.warehouse)}${renderField({ name: 'date', label: 'Receipt date', type: 'date', required: true }, today())}</div>
      <div class="table-wrap"><table class="data-table compact"><thead><tr><th>Product</th><th class="num">Ordered</th><th class="num">Remaining</th><th class="num">Received</th><th class="num">Rejected</th></tr></thead><tbody>${lines.map((l) => `<tr data-i="${l.i}"><td data-label="Product">${esc(Lookup.productName(l.it.productId))}</td><td class="num" data-label="Ordered">${l.it.qty}</td><td class="num" data-label="Remaining">${l.rem}</td><td class="num" data-label="Received"><input type="number" class="rc-qty" min="0" max="${l.rem}" value="${l.rem}" aria-label="Received quantity"></td><td class="num" data-label="Rejected"><input type="number" class="rc-rej" min="0" value="0" aria-label="Rejected quantity"></td></tr>`).join('')}</tbody></table></div>
      ${renderField({ name: 'notes', label: 'Receiving notes', type: 'textarea', rows: 2, full: true }, '')}<div class="field-error rc-err" role="alert"></div></form>`,
      footer: `<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn btn-primary" data-ok>Post goods receipt</button>` });
    m.dialog.querySelector('[data-ok]').addEventListener('click', () => {
      const f = $('form', m.dialog);
      const ls = $$('tbody tr', f).map((tr) => ({ index: +tr.dataset.i, qty: Math.floor(Number($('.rc-qty', tr).value) || 0), rejected: Math.floor(Number($('.rc-rej', tr).value) || 0) }));
      const r = Purchasing.receive(po, { date: $('[name=date]', f).value || today(), warehouse: $('[name=warehouse]', f).value, lines: ls, notes: $('[name=notes]', f).value });
      if (r.error) { $('.rc-err', f).textContent = r.error; showToast(r.error, 'error'); return; }
      m.close(); showToast(`Goods receipt ${r.receipt.id} posted — stock updated`); App.refresh();
    });
  },
  bill(po) {
    const pending = po.items.filter((i) => (i.received || 0) - (i.billed || 0) > 0);
    if (!pending.length) { showToast('There are no received, unbilled quantities on this purchase order.', 'error'); return; }
    formModal({ title: `Record supplier invoice — ${po.id}`, size: 'md', intro: `<p class="muted">Bills received-but-unbilled quantities: ${pending.map((i) => `${(i.received || 0) - (i.billed || 0)} × ${esc(Lookup.productName(i.productId))}`).join(', ')}.</p>`,
      fields: [{ name: 'number', label: 'Supplier invoice number', required: true, validate: (v) => (DB.all('bills').some((b) => b.supplierId === po.supplierId && b.number === v) ? 'This supplier invoice number is already recorded.' : '') }, { name: 'date', label: 'Invoice date', type: 'date', required: true }],
      values: { date: today() }, submitText: 'Record invoice',
      onSubmit: (v) => { const r = Purchasing.createBill(po, v); if (r.error) return r; showToast(`Supplier invoice ${r.bill.id} recorded`); navigateTo('bill/' + r.bill.id); } });
  },
  remove(po) { if (!['Draft', 'Cancelled'].includes(po.status)) return { error: 'Only draft or cancelled purchase orders can be deleted.' }; DB.remove('purchaseOrders', po.id); DB.log(`Deleted purchase order ${po.id}`, po.id); return null; },
  actions(po) {
    const s = po.status;
    return crudActions({ view: () => navigateTo('po/' + po.id), edit: ['Draft', 'Pending Approval'].includes(s) ? () => this.edit(po) : null, duplicate: () => this.duplicate(po), print: () => printRoute('po/' + po.id), del: ['Draft', 'Cancelled'].includes(s) ? () => confirmDelete('Purchase order', () => this.remove(po)) : null,
      extra: [s === 'Draft' && { label: 'Submit for approval', icon: 'send', perm: 'edit', onClick: () => this.setStatus(po, 'Pending Approval') }, s === 'Pending Approval' && { label: 'Approve', icon: 'check', perm: 'approve', onClick: () => this.approve(po) }, s === 'Approved' && { label: 'Mark as ordered', icon: 'send', perm: 'edit', onClick: () => this.setStatus(po, 'Ordered') }, ['Ordered', 'Partially Received'].includes(s) && { label: 'Receive goods', icon: 'inbox', perm: 'edit', onClick: () => this.receive(po) }, po.items.some((i) => (i.received || 0) > (i.billed || 0)) && { label: 'Record supplier invoice', icon: 'file', perm: 'create', onClick: () => this.bill(po) }].filter(Boolean) });
  },
};

const PurchaseRequests = {
  create() {
    if (!Auth.can('create')) { showToast('Your role does not allow creating records.', 'error'); return; }
    DocEditor.open({ kind: 'pr', title: 'New purchase request', submitText: 'Save draft', altText: 'Submit request', onSave: (d, { alt }) => {
      const pr = { ...d, id: DB.nextId('purchaseRequests', 'PR-', 3), status: alt ? 'Submitted' : 'Draft', poId: null, createdAt: new Date().toISOString() };
      DB.insert('purchaseRequests', pr); DB.log(`Created purchase request ${pr.id}`, pr.id); showToast(`Purchase request ${pr.id} ${alt ? 'submitted' : 'saved'}`); App.refresh();
    } });
  },
  edit(pr) { DocEditor.open({ kind: 'pr', doc: pr, title: `Edit ${pr.id}`, submitText: 'Save changes', onSave: (d) => { DB.update('purchaseRequests', pr.id, d); showToast('Purchase request updated'); App.refresh(); } }); },
  set(pr, status) { pr.status = status; DB.save('purchaseRequests'); DB.log(`Purchase request ${pr.id} ${status.toLowerCase()}`, pr.id); showToast(`Purchase request ${pr.id} ${status.toLowerCase()}`); App.refresh(); },
  convert(pr) {
    const suggested = DB.get('products', pr.items[0]?.productId)?.supplierId;
    formModal({ title: `Convert ${pr.id} to purchase order`, size: 'sm', fields: [{ name: 'supplierId', label: 'Supplier', type: 'select', required: true, options: Lookup.options.suppliers }], values: { supplierId: suggested }, submitText: 'Create purchase order',
      onSubmit: (v) => { const po = Purchasing.convertRequest(pr, v.supplierId); showToast(`Created ${po.id} from ${pr.id}`); navigateTo('po/' + po.id); } });
  },
  view(pr) {
    const m = Modal.open({ title: `Purchase request ${pr.id}`, size: 'lg', body: `${detailList([['Requester', esc(Lookup.employeeName(pr.requester))], ['Department', esc(pr.department)], ['Date', formatDate(pr.date)], ['Status', badge(pr.status)], ['Reason', esc(pr.reason)], ['Purchase order', pr.poId ? link('po/' + pr.poId, pr.poId) : '—']], 3)}
      ${renderTable([{ label: 'Product', render: (i) => esc(i.description || Lookup.productName(i.productId)) }, { label: 'Qty', align: 'right', render: (i) => i.qty }, { label: 'Est. unit cost', align: 'right', render: (i) => money(i.price) }, { label: 'Total', align: 'right', render: (i) => money(Calc.line(i).total) }], pr.items)}<p class="right"><strong>Estimated total: ${formatCurrency(Calc.doc(pr).total)}</strong></p>`,
    footer: '<button type="button" class="btn" data-close>Close</button>' });
    m.body.addEventListener('click', (e) => { if (e.target.closest('a')) m.close(); });
  },
};

Pages.purchasing = (el, { query }) => {
  const tab = query.tab || 'orders';
  const pos = DB.all('purchaseOrders'); const bills = DB.all('bills');
  const openVal = sum(pos.filter((p) => ['Approved', 'Ordered', 'Partially Received'].includes(p.status)), (p) => Calc.doc(p).total);
  el.innerHTML = pageHeader({ title: 'Purchasing', subtitle: 'Requests → approval → purchase orders → goods receipt → supplier invoices', actions: `${btn('New request', { icon: 'file', attrs: 'data-act="pr"', perm: 'create' })}${btn('New purchase order', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="po"', perm: 'create' })}` }) +
    statTiles([{ label: 'Awaiting approval', value: pos.filter((p) => p.status === 'Pending Approval').length + DB.all('purchaseRequests').filter((r) => r.status === 'Submitted').length, nav: 'purchasing?tab=orders&status=Pending Approval', tone: 'warn' }, { label: 'Open PO value', value: formatCurrency(openVal, true), nav: 'purchasing?tab=orders&status=open' }, { label: 'To receive', value: pos.filter((p) => ['Ordered', 'Partially Received'].includes(p.status)).length, nav: 'purchasing?tab=orders&status=receive' }, { label: 'Unpaid supplier invoices', value: formatCurrency(Stats.apTotal(), true), nav: 'purchasing?tab=bills&status=open' }]) +
    tabsHtml([{ key: 'requests', label: 'Purchase Requests', count: DB.all('purchaseRequests').length }, { key: 'orders', label: 'Purchase Orders', count: pos.length }, { key: 'receipts', label: 'Goods Receipts', count: DB.all('receipts').length }, { key: 'bills', label: 'Supplier Invoices', count: bills.length }], tab, 'purchasing') + '<div class="card"><div class="card-body" id="tab"></div></div>';
  const T = $('#tab', el);
  if (tab === 'requests') listView(T, {
    key: 'pr', entity: 'purchase requests', rows: () => DB.all('purchaseRequests'), searchFields: [(r) => r.id, (r) => r.reason, (r) => Lookup.employeeName(r.requester), (r) => r.department],
    filters: [{ key: 'status', label: 'Status', options: PR_STATUSES }, { key: 'department', label: 'Department', options: DEPARTMENTS }], dateField: (r) => r.date, defaultSort: { key: 'id', dir: 'desc' },
    columns: [{ key: 'id', label: 'Request #', render: (r) => `<strong>${esc(r.id)}</strong>` }, { key: 'date', label: 'Date', render: (r) => formatDate(r.date), value: (r) => r.date }, { key: 'requester', label: 'Requester', value: (r) => Lookup.employeeName(r.requester) }, { key: 'department', label: 'Department' }, { key: 'reason', label: 'Reason' },
      { key: 'total', label: 'Est. total', align: 'right', value: (r) => Calc.doc(r).total, render: (r) => money(Calc.doc(r).total) }, { key: 'status', label: 'Status', render: (r) => badge(r.status) }, { key: 'poId', label: 'PO', render: (r) => (r.poId ? link('po/' + r.poId, r.poId) : '—') }],
    onView: (r) => PurchaseRequests.view(r),
    actions: (r) => crudActions({ view: () => PurchaseRequests.view(r), edit: ['Draft', 'Submitted'].includes(r.status) ? () => PurchaseRequests.edit(r) : null, del: r.status !== 'Converted' ? () => confirmDelete('Purchase request', () => { DB.remove('purchaseRequests', r.id); }) : null,
      extra: [r.status === 'Draft' && { label: 'Submit', icon: 'send', perm: 'edit', onClick: () => PurchaseRequests.set(r, 'Submitted') }, r.status === 'Submitted' && { label: 'Approve', icon: 'check', perm: 'approve', onClick: () => PurchaseRequests.set(r, 'Approved') }, r.status === 'Submitted' && { label: 'Reject', icon: 'x', perm: 'approve', onClick: () => PurchaseRequests.set(r, 'Rejected') }, r.status === 'Approved' && { label: 'Convert to purchase order', icon: 'repeat', perm: 'create', onClick: () => PurchaseRequests.convert(r) }].filter(Boolean) }),
    exportName: 'purchase-requests',
  });
  if (tab === 'orders') listView(T, {
    key: 'po', entity: 'purchase orders', searchPlaceholder: 'Search by PO #, supplier…', rows: () => DB.all('purchaseOrders'), searchFields: [(p) => p.id, (p) => Lookup.supplierName(p.supplierId), (p) => p.notes],
    filters: [{ key: 'status', label: 'Status', options: [{ value: 'open', label: 'Open' }, { value: 'receive', label: 'To receive' }, ...PO_STATUSES], test: (p, v) => (v === 'open' ? ['Approved', 'Ordered', 'Partially Received'].includes(p.status) : v === 'receive' ? ['Ordered', 'Partially Received'].includes(p.status) : p.status === v) },
      { key: 'supplierId', label: 'Supplier', options: Lookup.options.suppliers }, { key: 'warehouse', label: 'Warehouse', options: Lookup.options.warehouses }],
    preset: query.status ? { status: query.status } : null, dateField: (p) => p.date, defaultSort: { key: 'id', dir: 'desc' },
    columns: [{ key: 'id', label: 'PO #', render: (p) => `<strong>${esc(p.id)}</strong>` }, { key: 'supplier', label: 'Supplier', value: (p) => Lookup.supplierName(p.supplierId), render: (p) => link('supplier/' + p.supplierId, Lookup.supplierName(p.supplierId)) },
      { key: 'date', label: 'Order Date', value: (p) => p.date, render: (p) => formatDate(p.date) }, { key: 'expectedDate', label: 'Expected', value: (p) => p.expectedDate, render: (p) => formatDate(p.expectedDate) },
      { key: 'total', label: 'Total', align: 'right', value: (p) => Calc.doc(p).total, render: (p) => money(Calc.doc(p).total) }, { key: 'received', label: 'Received', value: (p) => Purchasing.receivedPct(p), render: (p) => `<div class="pct-cell">${progressBar(Purchasing.receivedPct(p))}<span>${Purchasing.receivedPct(p)}%</span></div>` },
      { key: 'status', label: 'Status', render: (p) => badge(p.status) }],
    onView: (p) => navigateTo('po/' + p.id), actions: (p) => PurchaseOrders.actions(p),
    onDelete: (rows) => { let ok = 0; rows.forEach((p) => { if (!PurchaseOrders.remove(p)) ok++; }); showToast(`${ok} of ${rows.length} purchase orders deleted`, ok < rows.length ? 'warning' : 'success'); },
    exportName: 'purchase-orders',
  });
  if (tab === 'receipts') listView(T, {
    key: 'gr', entity: 'goods receipts', rows: () => DB.all('receipts'), selectable: false, searchFields: [(r) => r.id, (r) => r.poId, (r) => Lookup.supplierName(r.supplierId), (r) => r.user],
    filters: [{ key: 'warehouse', label: 'Warehouse', options: Lookup.options.warehouses }], dateField: (r) => r.date, defaultSort: { key: 'id', dir: 'desc' },
    columns: [{ key: 'id', label: 'Receipt #', render: (r) => `<strong>${esc(r.id)}</strong>` }, { key: 'poId', label: 'Purchase Order', render: (r) => link('po/' + r.poId, r.poId) }, { key: 'supplier', label: 'Supplier', value: (r) => Lookup.supplierName(r.supplierId) },
      { key: 'date', label: 'Date', value: (r) => r.date, render: (r) => formatDate(r.date) }, { key: 'warehouse', label: 'Warehouse', value: (r) => Lookup.warehouseName(r.warehouse) },
      { key: 'qty', label: 'Received', align: 'right', value: (r) => sum(r.lines, (l) => l.received) }, { key: 'rej', label: 'Rejected', align: 'right', value: (r) => sum(r.lines, (l) => l.rejected), render: (r) => { const n = sum(r.lines, (l) => l.rejected); return n ? `<span class="text-danger">${n}</span>` : '0'; } }, { key: 'user', label: 'Received by' }],
    onView: (r) => navigateTo('po/' + r.poId), exportName: 'goods-receipts',
  });
  if (tab === 'bills') listView(T, {
    key: 'bills', entity: 'supplier invoices', rows: () => DB.all('bills'), searchFields: [(b) => b.id, (b) => b.number, (b) => b.poId, (b) => Lookup.supplierName(b.supplierId)],
    filters: [{ key: 'status', label: 'Status', options: [{ value: 'open', label: 'Unpaid' }, 'Open', 'Partially Paid', 'Paid', 'Overdue', 'Voided'], test: (b, v) => (v === 'open' ? Docs.isOpen(b) : Docs.status(b) === v) }, { key: 'supplierId', label: 'Supplier', options: Lookup.options.suppliers }],
    preset: query.status ? { status: query.status } : null, dateField: (b) => b.date, defaultSort: { key: 'id', dir: 'desc' },
    columns: [{ key: 'id', label: 'Invoice #', render: (b) => `<strong>${esc(b.id)}</strong>` }, { key: 'number', label: 'Supplier Ref' }, { key: 'supplier', label: 'Supplier', value: (b) => Lookup.supplierName(b.supplierId) }, { key: 'poId', label: 'PO', render: (b) => (b.poId ? link('po/' + b.poId, b.poId) : '—') },
      { key: 'date', label: 'Date', value: (b) => b.date, render: (b) => formatDate(b.date) }, { key: 'dueDate', label: 'Due', value: (b) => b.dueDate, render: (b) => formatDate(b.dueDate) },
      { key: 'total', label: 'Amount', align: 'right', value: (b) => Calc.doc(b).total, render: (b) => money(Calc.doc(b).total) }, { key: 'balance', label: 'Balance', align: 'right', value: (b) => Docs.balance(b), render: (b) => money(Docs.balance(b)) }, { key: 'status', label: 'Status', value: (b) => Docs.status(b), render: (b) => badge(Docs.status(b)) }],
    onView: (b) => navigateTo('bill/' + b.id),
    actions: (b) => [{ label: 'View', icon: 'eye', onClick: () => navigateTo('bill/' + b.id) }, Docs.isOpen(b) && Auth.canView('payments') && { label: 'Pay supplier', icon: 'card', perm: 'create', onClick: () => PaymentsUI.record({ type: 'Supplier Payment', partyId: b.supplierId, billId: b.id }) }, { label: 'Print', icon: 'printer', onClick: () => printRoute('bill/' + b.id) }, b.status !== 'Voided' && !(b.paid > 0) && { divider: true }, b.status !== 'Voided' && !(b.paid > 0) && { label: 'Void', icon: 'x', danger: true, perm: 'approve', onClick: () => Bills.void(b) }].filter(Boolean),
    exportName: 'supplier-invoices',
  });
  $('[data-act="po"]', el)?.addEventListener('click', () => PurchaseOrders.create());
  $('[data-act="pr"]', el)?.addEventListener('click', () => PurchaseRequests.create());
};

Pages.po = (el, { id }) => {
  const po = DB.get('purchaseOrders', id);
  if (!po) { el.innerHTML = errorState(`Purchase order ${id} was not found.`, false); return; }
  App.setCrumb(po.id);
  const s = DB.get('suppliers', po.supplierId); const st = po.status; const E = Auth.can('edit');
  const grs = DB.all('receipts').filter((r) => r.poId === po.id); const bills = DB.all('bills').filter((b) => b.poId === po.id);
  const unbilled = po.items.some((i) => (i.received || 0) > (i.billed || 0));
  el.innerHTML = pageHeader({ back: 'purchasing', title: `Purchase Order ${esc(po.id)} ${badge(st)}`, subtitle: `${esc(Lookup.supplierName(po.supplierId))} · ${formatCurrency(Calc.doc(po).total)}`,
    actions: `${btn('Print', { icon: 'printer', attrs: 'data-action="print"' })}${btn('Download', { icon: 'download', attrs: 'data-act="dl"' })}${btn('Duplicate', { icon: 'copy', attrs: 'data-act="dup"', perm: 'create' })}
      ${['Draft', 'Pending Approval'].includes(st) && E ? btn('Edit', { icon: 'edit', attrs: 'data-act="edit"' }) : ''}
      ${!['Received', 'Cancelled', 'Partially Received'].includes(st) && E ? btn('Cancel', { icon: 'x', attrs: 'data-act="cancel"' }) : ''}
      ${st === 'Draft' && E ? btn('Submit for approval', { icon: 'send', cls: 'btn-primary', attrs: 'data-act="submit"' }) : ''}
      ${st === 'Pending Approval' && Auth.can('approve') ? btn('Reject', { icon: 'x', attrs: 'data-act="reject"' }) + btn('Approve', { icon: 'check', cls: 'btn-primary', attrs: 'data-act="approve"' }) : ''}
      ${st === 'Approved' && E ? btn('Send to supplier', { icon: 'send', cls: 'btn-primary', attrs: 'data-act="order"' }) : ''}
      ${['Ordered', 'Partially Received'].includes(st) && E ? btn('Receive goods', { icon: 'inbox', cls: 'btn-primary', attrs: 'data-act="receive"' }) : ''}
      ${unbilled && Auth.can('create') ? btn('Record supplier invoice', { icon: 'file', attrs: 'data-act="bill"' }) : ''}` }) +
    `<div class="card no-print">${st === 'Cancelled' ? `<div class="notice danger">${icon('x', 16)} This purchase order was cancelled.</div>` : statusStepper(['Draft', 'Pending Approval', 'Approved', 'Ordered', 'Received'], st === 'Partially Received' ? 'Ordered' : st)}</div>
    <div class="grid-detail"><div class="print-area">${docViewHtml({ title: 'PURCHASE ORDER', number: po.id, status: st, doc: po, items: po.items, notes: po.notes, footer: 'Please quote the PO number on all invoices and delivery notes.',
      parties: [{ label: 'Supplier', html: `<strong>${esc(s?.company)}</strong><br>${esc(s?.contact)}<br>${esc(s?.address)}<br>${esc(s?.email)}` }, { label: 'Deliver to', html: `<strong>${esc(Lookup.warehouseName(po.warehouse))}</strong><br>${esc(DB.get('warehouses', po.warehouse)?.location || '')}` }],
      meta: [['Order date', formatDate(po.date)], ['Expected delivery', formatDate(po.expectedDate)], ['Payment terms', esc(po.paymentTerms)], ['Request', po.requestId ? esc(po.requestId) : '—']] })}</div>
    <aside class="side-stack no-print">
      ${card('Receiving progress', `${renderTable([{ label: 'Product', render: (i) => esc(Lookup.productName(i.productId)) }, { label: 'Ordered', align: 'right', render: (i) => i.qty }, { label: 'Received', align: 'right', render: (i) => i.received || 0 }, { label: 'Rejected', align: 'right', render: (i) => i.rejected || 0 }, { label: 'Billed', align: 'right', render: (i) => i.billed || 0 }], po.items, { cls: 'compact' })}<div class="cm-row"><span>Overall</span><strong>${Purchasing.receivedPct(po)}%</strong></div>${progressBar(Purchasing.receivedPct(po))}`)}
      ${card('Goods receipts', renderTable([{ label: 'Receipt', render: (r) => `<strong>${esc(r.id)}</strong>` }, { label: 'Date', render: (r) => formatDate(r.date) }, { label: 'Units', align: 'right', render: (r) => sum(r.lines, (l) => l.received) }, { label: 'By', render: (r) => esc(r.user) }], grs, { cls: 'compact', empty: 'Nothing received yet.' }))}
      ${card('Supplier invoices', renderTable([{ label: 'Invoice', render: (b) => link('bill/' + b.id, b.id) }, { label: 'Amount', align: 'right', render: (b) => money(Calc.doc(b).total) }, { label: 'Status', render: (b) => badge(Docs.status(b)) }], bills, { cls: 'compact', empty: 'No invoices recorded.' }))}
      ${card('Activity', activityFor(po.id))}
    </aside></div>`;
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    const P = PurchaseOrders;
    if (a === 'dl') downloadDocument(`PurchaseOrder-${po.id}`, $('.paper', el));
    if (a === 'dup') P.duplicate(po);
    if (a === 'edit') P.edit(po);
    if (a === 'cancel') P.cancel(po);
    if (a === 'submit') { P.setStatus(po, 'Pending Approval', `${po.id} submitted for approval`); Notify.push('info', 'Purchase approval needed', `Purchase Order ${po.id} is waiting for approval.`, 'po/' + po.id); }
    if (a === 'approve') P.approve(po);
    if (a === 'reject') confirmDialog({ title: `Reject ${po.id}?`, message: 'The purchase order will be cancelled.', confirmText: 'Reject' }).then((ok) => ok && P.setStatus(po, 'Cancelled', `${po.id} rejected`));
    if (a === 'order') sendDialog({ title: `Send ${po.id} to supplier`, to: s?.email, subject: `Purchase Order ${po.id} — ${DB.data.settings.company.name}`, message: `Dear ${s?.contact},\n\nPlease find attached purchase order ${po.id}. Requested delivery by ${formatDate(po.expectedDate)} to ${Lookup.warehouseName(po.warehouse)}.\n\nRegards,\n${Auth.userName()}`, onSend: () => P.setStatus(po, 'Ordered', `${po.id} sent to supplier`) });
    if (a === 'receive') P.receive(po);
    if (a === 'bill') P.bill(po);
  });
};

const Bills = {
  void(b) { confirmDialog({ title: `Void ${b.id}?`, message: 'The accounting entries will be reversed and the quantities become billable again.', confirmText: 'Void invoice' }).then((ok) => { if (!ok) return; const r = Purchasing.voidBill(b); if (r.error) showToast(r.error, 'error'); else { b.voidedDate = today(); DB.save('bills'); showToast(`${b.id} voided`, 'info'); App.refresh(); } }); },
};
Pages.bill = (el, { id }) => {
  const b = DB.get('bills', id);
  if (!b) { el.innerHTML = errorState(`Supplier invoice ${id} was not found.`, false); return; }
  App.setCrumb(b.id);
  const s = DB.get('suppliers', b.supplierId); const st = Docs.status(b);
  const pays = DB.all('payments').filter((p) => p.billId === b.id);
  el.innerHTML = pageHeader({ back: 'purchasing?tab=bills', title: `Supplier Invoice ${esc(b.id)} ${badge(st)}`, subtitle: `${esc(Lookup.supplierName(b.supplierId))} · ref ${esc(b.number)}`,
    actions: `${btn('Print', { icon: 'printer', attrs: 'data-action="print"' })}${b.status !== 'Voided' && !(b.paid > 0) && Auth.can('approve') ? btn('Void', { icon: 'x', attrs: 'data-act="void"' }) : ''}${Docs.isOpen(b) && Auth.canView('payments') && Auth.can('create') ? btn('Pay supplier', { icon: 'card', cls: 'btn-primary', attrs: 'data-act="pay"' }) : ''}` }) +
    `<div class="grid-detail"><div class="print-area">${docViewHtml({ title: 'SUPPLIER INVOICE', number: `${b.id} · ${b.number}`, status: st, doc: b, items: b.items, showPaid: true,
      parties: [{ label: 'From supplier', html: `<strong>${esc(s?.company)}</strong><br>${esc(s?.address)}<br>${esc(s?.email)}` }],
      meta: [['Invoice date', formatDate(b.date)], ['Due date', formatDate(b.dueDate)], ['Payment terms', esc(b.paymentTerms)], ['Purchase order', b.poId ? esc(b.poId) : '—']], footer: 'Recorded in Accounts Payable' })}</div>
    <aside class="side-stack no-print">${card('Payments', renderTable([{ label: 'Payment', render: (p) => link('payments?pay=' + p.id, p.id) }, { label: 'Date', render: (p) => formatDate(p.date) }, { label: 'Amount', align: 'right', render: (p) => money(p.amount) }, { label: 'Status', render: (p) => badge(p.status) }], pays, { cls: 'compact', empty: 'No payments yet.' }))}
      ${card('Journal entries', journalLinks(b.id))}</aside></div>`;
  $('[data-act="pay"]', el)?.addEventListener('click', () => PaymentsUI.record({ type: 'Supplier Payment', partyId: b.supplierId, billId: b.id }));
  $('[data-act="void"]', el)?.addEventListener('click', () => Bills.void(b));
};
function journalLinks(ref) {
  const js = DB.all('journals').filter((j) => j.ref === ref);
  return renderTable([{ label: 'Entry', render: (j) => (Auth.canView('journals') ? link('journals?je=' + j.id, j.id) : esc(j.id)) }, { label: 'Date', render: (j) => formatDate(j.date) }, { label: 'Description', render: (j) => esc(j.description) }, { label: 'Amount', align: 'right', render: (j) => money(sum(j.lines, (l) => l.debit)) }], js, { cls: 'compact', empty: 'Not posted to the ledger.' });
}
