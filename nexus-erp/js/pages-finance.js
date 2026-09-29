/* ==========================================================================
   NEXUS ERP — pages-finance.js
   Billing & invoices, Payments, Expenses, Finance dashboard, AR and AP.
   ========================================================================== */
'use strict';

const INVOICE_STATUSES = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled'];

/* ---------- Invoices service ---------- */
const Invoices = {
  create(prefill = {}) {
    if (!Auth.can('create')) { showToast('Your role does not allow creating records.', 'error'); return; }
    DocEditor.openNew({ kind: 'invoice', title: 'New invoice', submitText: 'Save draft', altText: 'Save & send', onSave: (d, { alt }) => {
      const inv = Billing.save(d, alt);
      showToast(alt ? `Invoice ${inv.id} created and sent` : `Invoice ${inv.id} saved as draft`);
      navigateTo('invoice/' + inv.id);
    } }, prefill);
  },
  edit(inv) {
    if (inv.status !== 'Draft') { showToast('Only draft invoices can be edited. Cancel and re-issue posted invoices.', 'error'); return; }
    DocEditor.open({ kind: 'invoice', doc: inv, title: `Edit ${inv.id}`, submitText: 'Save changes', altText: 'Save & send', onSave: (d, { alt }) => { Billing.save(d, alt); showToast(alt ? 'Invoice saved and sent' : 'Invoice updated successfully'); App.refresh(); } });
  },
  duplicate(inv) { const n = Billing.save({ ...deepClone(inv), id: null, paid: 0, date: today(), dueDate: addDays(today(), Lookup.termsDays(inv.paymentTerms)), orderId: null, sentAt: null }, false); showToast(`Duplicated as draft ${n.id}`); navigateTo('invoice/' + n.id); },
  send(inv) {
    const c = DB.get('customers', inv.customerId);
    sendDialog({ title: `Send invoice ${inv.id}`, to: c?.email || '', subject: `Invoice ${inv.id} from ${DB.data.settings.company.name}`, message: `Dear ${c?.name || 'customer'},\n\nPlease find attached invoice ${inv.id} for ${formatCurrency(Calc.doc(inv).total)}, due ${formatDate(inv.dueDate)}.\n\n${DB.data.settings.invoice.bank}\n\nThank you for your business,\n${Auth.userName()}`,
      onSend: () => { Billing.send(inv); App.refresh(); } });
  },
  cancel(inv) { confirmDialog({ title: `Cancel invoice ${inv.id}?`, message: 'Posted journal entries will be reversed.', confirmText: 'Cancel invoice' }).then((ok) => { if (!ok) return; const r = Billing.cancel(inv); if (r.error) showToast(r.error, 'error'); else { showToast(`Invoice ${inv.id} cancelled`, 'info'); App.refresh(); } }); },
  remove(inv) { if (inv.status !== 'Draft') return { error: 'Only draft invoices can be deleted. Cancel posted invoices instead.' }; DB.remove('invoices', inv.id); const o = inv.orderId && DB.get('orders', inv.orderId); if (o) { o.invoiceId = null; DB.save('orders'); } DB.log(`Deleted draft invoice ${inv.id}`, inv.id); return null; },
  pay(inv) { PaymentsUI.record({ type: 'Invoice Payment', partyId: inv.customerId, invoiceId: inv.id }); },
  actions(inv) {
    const st = Docs.status(inv);
    return crudActions({ view: () => navigateTo('invoice/' + inv.id), edit: inv.status === 'Draft' ? () => this.edit(inv) : null, duplicate: () => this.duplicate(inv), print: () => printRoute('invoice/' + inv.id), del: inv.status === 'Draft' ? () => confirmDelete('Invoice', () => this.remove(inv)) : null,
      extra: [!['Cancelled', 'Paid'].includes(st) && { label: inv.status === 'Draft' ? 'Send invoice' : 'Resend', icon: 'send', perm: 'edit', onClick: () => this.send(inv) }, Docs.isOpen(inv) && Auth.canView('payments') && { label: 'Record payment', icon: 'card', perm: 'create', onClick: () => this.pay(inv) }, !['Cancelled', 'Draft'].includes(inv.status) && !(inv.paid > 0) && { label: 'Cancel invoice', icon: 'x', perm: 'edit', danger: true, onClick: () => this.cancel(inv) }].filter(Boolean) });
  },
};

Pages.billing = (el, { query }) => {
  const invs = DB.all('invoices');
  const w = rolling(30);
  const open = invs.filter(Docs.isOpen); const overdue = invs.filter((i) => Docs.status(i) === 'Overdue');
  const collected = sum(DB.all('payments').filter((p) => p.invoiceId && p.status !== 'Voided' && p.date >= w.from), (p) => p.amount);
  el.innerHTML = pageHeader({ title: 'Billing & Invoices', subtitle: `${invs.length} invoices`, actions: btn('New invoice', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' }) }) +
    statTiles([{ label: 'Invoiced (last 30 days)', value: formatCurrency(sum(invs.filter((i) => !['Draft', 'Cancelled'].includes(i.status) && i.date >= w.from), (i) => Calc.doc(i).total), true) }, { label: 'Outstanding', value: formatCurrency(sum(open, Docs.balance), true), sub: `${open.length} invoices`, nav: 'billing?status=open' }, { label: 'Overdue', value: formatCurrency(sum(overdue, Docs.balance), true), sub: `${overdue.length} invoices`, nav: 'billing?status=Overdue', tone: 'danger' }, { label: 'Collected (last 30 days)', value: formatCurrency(collected, true), nav: 'payments' }, { label: 'Drafts', value: invs.filter((i) => i.status === 'Draft').length, nav: 'billing?status=Draft' }]) +
    '<div class="card"><div class="card-body" id="bl"></div></div>';
  listView($('#bl', el), {
    key: 'invoices', entity: 'invoices', searchPlaceholder: 'Search by invoice #, customer, order…', rows: () => DB.all('invoices'),
    searchFields: [(i) => i.id, (i) => Lookup.customerName(i.customerId), (i) => i.orderId, (i) => i.projectId],
    filters: [{ key: 'status', label: 'Status', options: [{ value: 'open', label: 'Outstanding' }, ...INVOICE_STATUSES], test: (i, v) => (v === 'open' ? Docs.isOpen(i) : Docs.status(i) === v) }, { key: 'customerId', label: 'Customer', options: () => DB.all('customers').map((c) => ({ value: c.id, label: c.company })) }],
    preset: query.status || query.customer ? { ...(query.status ? { status: query.status } : {}), ...(query.customer ? { customerId: query.customer } : {}) } : null,
    dateField: (i) => i.date, defaultSort: { key: 'id', dir: 'desc' },
    columns: [
      { key: 'id', label: 'Invoice #', render: (i) => `<strong>${esc(i.id)}</strong>` },
      { key: 'customer', label: 'Customer', value: (i) => Lookup.customerName(i.customerId), render: (i) => link('customer/' + i.customerId, Lookup.customerName(i.customerId)) },
      { key: 'date', label: 'Invoice Date', value: (i) => i.date, render: (i) => formatDate(i.date) }, { key: 'dueDate', label: 'Due Date', value: (i) => i.dueDate, render: (i) => `${formatDate(i.dueDate)}${Docs.daysOverdue(i) ? `<div class="text-danger small">${Docs.daysOverdue(i)} days overdue</div>` : ''}` },
      { key: 'amount', label: 'Amount', align: 'right', value: (i) => Calc.doc(i).total, render: (i) => money(Calc.doc(i).total) }, { key: 'paid', label: 'Paid', align: 'right', value: (i) => i.paid || 0, render: (i) => money(i.paid || 0) },
      { key: 'balance', label: 'Balance', align: 'right', value: (i) => Docs.balance(i), render: (i) => `<strong>${formatCurrency(Docs.balance(i))}</strong>` },
      { key: 'status', label: 'Status', value: (i) => Docs.status(i), render: (i) => badge(Docs.status(i)) },
    ],
    rowClass: (i) => (Docs.status(i) === 'Overdue' ? 'row-danger' : ''),
    onView: (i) => navigateTo('invoice/' + i.id), actions: (i) => Invoices.actions(i),
    onDelete: (rows) => { let ok = 0; rows.forEach((i) => { if (!Invoices.remove(i)) ok++; }); showToast(`${ok} of ${rows.length} invoices deleted${ok < rows.length ? ' — only drafts can be deleted' : ''}`, ok < rows.length ? 'warning' : 'success'); },
    exportName: 'invoices',
  });
  $('[data-act="add"]', el)?.addEventListener('click', () => Invoices.create());
};

Pages.invoice = (el, { id }) => {
  const inv = DB.get('invoices', id);
  if (!inv) { el.innerHTML = errorState(`Invoice ${id} was not found.`, false); return; }
  App.setCrumb(inv.id);
  const c = DB.get('customers', inv.customerId); const st = Docs.status(inv);
  const pays = DB.all('payments').filter((p) => p.invoiceId === inv.id);
  const E = Auth.can('edit');
  el.innerHTML = pageHeader({ back: 'billing', title: `Invoice ${esc(inv.id)} ${badge(st)}`, subtitle: `${esc(Lookup.customerName(inv.customerId))} · ${formatCurrency(Calc.doc(inv).total)}${Docs.daysOverdue(inv) ? ` · <span class="text-danger">${Docs.daysOverdue(inv)} days overdue</span>` : ''}`,
    actions: `${btn('Print', { icon: 'printer', attrs: 'data-action="print"' })}${btn('Download', { icon: 'download', attrs: 'data-act="dl"' })}${btn('Duplicate', { icon: 'copy', attrs: 'data-act="dup"', perm: 'create' })}
      ${inv.status === 'Draft' && E ? btn('Edit', { icon: 'edit', attrs: 'data-act="edit"' }) : ''}
      ${!['Cancelled', 'Draft'].includes(inv.status) && !(inv.paid > 0) && E ? btn('Cancel', { icon: 'x', attrs: 'data-act="cancel"' }) : ''}
      ${!['Cancelled', 'Paid'].includes(st) && E ? btn(inv.status === 'Draft' ? 'Send' : 'Send reminder', { icon: 'send', attrs: 'data-act="send"', cls: inv.status === 'Draft' ? 'btn-primary' : '' }) : ''}
      ${Docs.isOpen(inv) && Auth.canView('payments') && Auth.can('create') ? btn('Record payment', { icon: 'card', cls: 'btn-primary', attrs: 'data-act="pay"' }) : ''}` }) +
    `<div class="grid-detail"><div class="print-area">${docViewHtml({ title: 'INVOICE', number: inv.id, status: st, doc: inv, items: inv.items, showPaid: true, notes: inv.notes, terms: inv.terms, bank: DB.data.settings.invoice.bank,
      parties: [{ label: 'Bill to', html: `<strong>${esc(c?.company)}</strong><br>${esc(c?.name)}<br>${esc(inv.billingAddress || c?.billingAddress)}<br>${esc(c?.email)}` }],
      meta: [['Invoice date', formatDate(inv.date)], ['Due date', formatDate(inv.dueDate)], ['Payment terms', esc(inv.paymentTerms)], ['Reference', esc(inv.orderId || inv.projectId || '—')]] })}</div>
    <aside class="side-stack no-print">
      ${card('Payment summary', `<dl class="summary"><div><dt>Invoice total</dt><dd>${formatCurrency(Calc.doc(inv).total)}</dd></div><div><dt>Paid</dt><dd>${formatCurrency(inv.paid || 0)}</dd></div><div class="due"><dt>Balance due</dt><dd>${formatCurrency(Docs.balance(inv))}</dd></div></dl>${progressBar(((inv.paid || 0) / Math.max(1, Calc.doc(inv).total)) * 100, 'success')}`)}
      ${card('Payment history', renderTable([{ label: 'Payment', render: (p) => link('payments?pay=' + p.id, p.id) }, { label: 'Date', render: (p) => formatDate(p.date) }, { label: 'Method', render: (p) => esc(p.method) }, { label: 'Amount', align: 'right', render: (p) => money(p.amount) }, { label: 'Status', render: (p) => badge(p.status) }], pays, { cls: 'compact', empty: 'No payments received yet.' }))}
      ${card('Related', detailList([['Customer', link('customer/' + inv.customerId, Lookup.customerName(inv.customerId))], ['Sales order', inv.orderId ? link('order/' + inv.orderId, inv.orderId) : '—'], ['Project', inv.projectId ? link('project/' + inv.projectId, Lookup.projectName(inv.projectId)) : '—'], ['Sent', inv.sentAt ? formatDateTime(inv.sentAt) : 'Not sent']], 1))}
      ${card('Journal entries', journalLinks(inv.id))}
    </aside></div>`;
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'dl') downloadDocument(`Invoice-${inv.id}`, $('.paper', el));
    if (a === 'dup') Invoices.duplicate(inv);
    if (a === 'edit') Invoices.edit(inv);
    if (a === 'cancel') Invoices.cancel(inv);
    if (a === 'send') Invoices.send(inv);
    if (a === 'pay') Invoices.pay(inv);
  });
};

/* ---------- Payments ---------- */
const PaymentsUI = {
  /** Payment modal. The fields shown adapt to the payment type. */
  record(prefill = {}) {
    if (!Auth.can('create')) { showToast('Your role does not allow recording payments.', 'error'); return; }
    const custOpts = () => DB.all('customers').filter((c) => c.status !== 'Inactive').map((c) => ({ value: c.id, label: c.company }));
    const supOpts = () => DB.all('suppliers').map((s) => ({ value: s.id, label: s.company }));
    const v0 = { type: 'Invoice Payment', date: today(), method: 'Bank Transfer', account: ACCT.BANK, ...prefill };
    if (prefill.type === 'Supplier Payment') v0.supplierId = prefill.partyId; else v0.customerId = prefill.partyId;
    const doc = prefill.invoiceId ? DB.get('invoices', prefill.invoiceId) : prefill.billId ? DB.get('bills', prefill.billId) : null;
    if (doc && !v0.amount) v0.amount = Docs.balance(doc) || Calc.doc(doc).total;
    const fields = [
      { name: 'type', label: 'Payment type', type: 'select', required: true, noEmpty: true, options: PAYMENT_TYPES },
      { name: 'date', label: 'Payment date', type: 'date', required: true, validate: (v) => (v > today() ? 'Payment date cannot be in the future.' : '') },
      { name: 'customerId', label: 'Customer', type: 'select', options: custOpts }, { name: 'supplierId', label: 'Supplier', type: 'select', options: supOpts },
      { name: 'invoiceId', label: 'Invoice', type: 'select', options: [], emptyLabel: 'Unapplied (no invoice)' }, { name: 'billId', label: 'Supplier invoice', type: 'select', options: [], emptyLabel: 'Select invoice…' },
      { name: 'amount', label: 'Amount', type: 'currency', required: true, min: 0.01 }, { name: 'method', label: 'Payment method', type: 'select', required: true, noEmpty: true, options: PAYMENT_METHODS },
      { name: 'account', label: 'Paid into / from', type: 'select', required: true, noEmpty: true, options: Lookup.options.cashAccounts }, { name: 'reference', label: 'Reference', placeholder: 'Remittance / check / wire #' },
      { name: 'notes', label: 'Notes', type: 'textarea', rows: 2, full: true }, { type: 'html', full: true, html: '<div class="pay-hint notice info" aria-live="polite" hidden></div>' },
    ];
    let lastType = null; let lastParty = null;
    formModal({ title: 'Record payment', size: 'lg', fields, values: v0, submitText: 'Record payment',
      onInput: (form, e) => {
        const type = $('[name=type]', form).value; const sup = type === 'Supplier Payment';
        const show = (n, on) => { $(`.field[data-field="${n}"]`, form).hidden = !on; };
        show('customerId', !sup); show('supplierId', sup); show('invoiceId', ['Invoice Payment', 'Customer Payment'].includes(type)); show('billId', sup);
        const party = sup ? $('[name=supplierId]', form).value : $('[name=customerId]', form).value;
        if (type !== lastType || party !== lastParty) {
          const sel = $(sup ? '[name=billId]' : '[name=invoiceId]', form); const keep = sel.value || (sup ? prefill.billId : prefill.invoiceId);
          const docs = sup ? DB.all('bills').filter((b) => b.supplierId === party && Docs.isOpen(b)) : DB.all('invoices').filter((i) => i.customerId === party && (Docs.isOpen(i) || i.status === 'Draft'));
          sel.innerHTML = `<option value="">${sup ? 'Select invoice…' : 'Unapplied (no invoice)'}</option>` + docs.map((d) => `<option value="${d.id}"${d.id === keep ? ' selected' : ''}>${d.id}${d.number ? ' (' + esc(d.number) + ')' : ''} — balance ${formatCurrency(Docs.balance(d) || Calc.doc(d).total)}</option>`).join('');
          lastType = type; lastParty = party;
        }
        const dsel = $(sup ? '[name=billId]' : '[name=invoiceId]', form);
        const d = dsel.value ? DB.get(sup ? 'bills' : 'invoices', dsel.value) : null;
        if (e && (e.target.name === 'invoiceId' || e.target.name === 'billId') && d) $('[name=amount]', form).value = Docs.balance(d) || Calc.doc(d).total;
        const hint = $('.pay-hint', form);
        const txt = { 'Invoice Payment': 'Applies the payment to the selected invoice and credits Accounts Receivable.', 'Customer Payment': 'Receipt from a customer; optionally apply it to an open invoice.', 'Supplier Payment': 'Pays a supplier invoice and debits Accounts Payable.', Refund: 'Refunds money to a customer (debits Sales, credits cash/bank).', 'Advance Payment': 'Customer prepayment held as a credit on their account.' }[type];
        hint.hidden = false; hint.textContent = txt + (d ? ` Outstanding on ${d.id}: ${formatCurrency(Docs.balance(d) || Calc.doc(d).total)}.` : '');
      },
      onSubmit: (v) => {
        const sup = v.type === 'Supplier Payment';
        const partyId = sup ? v.supplierId : v.customerId;
        if (!partyId) return { error: `Select a ${sup ? 'supplier' : 'customer'}.` };
        if (v.type === 'Invoice Payment' && !v.invoiceId) return { error: 'Select the invoice being paid.' };
        if (sup && !v.billId) return { error: 'Select the supplier invoice being paid.' };
        const r = Payments.create({ type: v.type, partyId, invoiceId: ['Invoice Payment', 'Customer Payment'].includes(v.type) ? v.invoiceId || null : null, billId: sup ? v.billId : null, date: v.date, amount: v.amount, method: v.method, account: v.account, reference: v.reference, notes: v.notes });
        if (r.error) return r;
        showToast(`Payment ${r.payment.id} of ${formatCurrency(r.payment.amount)} recorded`);
        if (r.payment.invoiceId && Docs.status(DB.get('invoices', r.payment.invoiceId)) === 'Paid') Notify.push('success', 'Invoice paid', `Invoice ${r.payment.invoiceId} has been paid in full.`, 'invoice/' + r.payment.invoiceId);
        App.refresh();
      } });
  },
  view(p) {
    const m = Modal.open({ title: `Payment ${p.id}`, size: 'md', body: `<div class="receipt"><div class="receipt-amount ${p.type === 'Supplier Payment' || p.type === 'Refund' ? 'out' : 'in'}">${formatCurrency(p.amount)}</div><p class="center">${badge(p.type, 'info')} ${badge(p.status)}</p>
      ${detailList([['Date', formatDate(p.date)], [p.partyType === 'supplier' ? 'Supplier' : 'Customer', partyLink(p)], ['Applied to', p.invoiceId ? link('invoice/' + p.invoiceId, p.invoiceId) : p.billId ? link('bill/' + p.billId, p.billId) : 'Unapplied'], ['Method', esc(p.method)], ['Account', esc(Lookup.accountName(p.account))], ['Reference', esc(p.reference)], ['Recorded by', esc(p.createdBy)], ['Notes', esc(p.notes)]], 2)}
      <h3 class="h-sm">Journal entries</h3>${journalLinks(p.id)}</div>`,
    footer: `<button type="button" class="btn" data-close>Close</button><button type="button" class="btn" data-print>${icon('printer', 16)} Print receipt</button>${p.status !== 'Voided' && Auth.can('approve') ? `<button type="button" class="btn btn-danger" data-void>Void payment</button>` : ''}` });
    m.body.addEventListener('click', (e) => { if (e.target.closest('a')) m.close(); });
    m.dialog.querySelector('[data-print]').addEventListener('click', () => { document.body.classList.add('print-modal'); window.print(); setTimeout(() => document.body.classList.remove('print-modal'), 500); });
    m.dialog.querySelector('[data-void]')?.addEventListener('click', async () => { if (!(await confirmDialog({ title: `Void ${p.id}?`, message: 'The linked invoice balance is restored and a reversing journal is posted.', confirmText: 'Void payment' }))) return; const r = Payments.void(p); if (r.error) showToast(r.error, 'error'); else { m.close(); showToast(`Payment ${p.id} voided`, 'info'); App.refresh(); } });
  },
};

Pages.payments = (el, { query }) => {
  const w = rolling(30);
  const ps = DB.all('payments').filter((p) => p.status !== 'Voided');
  const inflow = ps.filter((p) => !['Supplier Payment', 'Refund'].includes(p.type));
  el.innerHTML = pageHeader({ title: 'Payments', subtitle: 'Customer receipts, supplier payments, refunds and advances', actions: btn('Record payment', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' }) }) +
    statTiles([{ label: 'Received (30 days)', value: formatCurrency(sum(inflow.filter((p) => p.date >= w.from), (p) => p.amount), true), tone: 'ok' }, { label: 'Paid to suppliers (30 days)', value: formatCurrency(sum(ps.filter((p) => p.type === 'Supplier Payment' && p.date >= w.from), (p) => p.amount), true) }, { label: 'Refunds (all)', value: formatCurrency(sum(ps.filter((p) => p.type === 'Refund'), (p) => p.amount), true) }, { label: 'Customer advances', value: formatCurrency(sum(ps.filter((p) => p.type === 'Advance Payment'), (p) => p.amount), true) }]) +
    '<div class="card"><div class="card-body" id="pl"></div></div>';
  listView($('#pl', el), {
    key: 'payments', entity: 'payments', searchPlaceholder: 'Search by payment #, party, invoice, reference…', rows: () => DB.all('payments'),
    searchFields: [(p) => p.id, partyName, (p) => p.invoiceId, (p) => p.billId, (p) => p.reference],
    filters: [{ key: 'type', label: 'Type', options: PAYMENT_TYPES }, { key: 'method', label: 'Method', options: PAYMENT_METHODS }, { key: 'status', label: 'Status', options: ['Cleared', 'Voided'] }],
    preset: query.type ? { type: query.type } : null, dateField: (p) => p.date, defaultSort: { key: 'id', dir: 'desc' },
    columns: [
      { key: 'id', label: 'Payment #', render: (p) => `<strong>${esc(p.id)}</strong>` }, { key: 'date', label: 'Date', value: (p) => p.date, render: (p) => formatDate(p.date) },
      { key: 'type', label: 'Type', render: (p) => badge(p.type, p.type === 'Supplier Payment' ? 'neutral' : p.type === 'Refund' ? 'danger' : 'info') },
      { key: 'party', label: 'Customer / Supplier', value: partyName, render: partyLink },
      { key: 'doc', label: 'Invoice', value: (p) => p.invoiceId || p.billId || '', render: (p) => (p.invoiceId ? link('invoice/' + p.invoiceId, p.invoiceId) : p.billId ? link('bill/' + p.billId, p.billId) : '<span class="muted">—</span>') },
      { key: 'method', label: 'Method' },
      { key: 'amount', label: 'Amount', align: 'right', value: (p) => (['Supplier Payment', 'Refund'].includes(p.type) ? -p.amount : p.amount), render: (p) => money(['Supplier Payment', 'Refund'].includes(p.type) ? -p.amount : p.amount) },
      { key: 'status', label: 'Status', render: (p) => badge(p.status) },
    ],
    onView: (p) => PaymentsUI.view(p),
    actions: (p) => [{ label: 'View', icon: 'eye', onClick: () => PaymentsUI.view(p) }, p.status !== 'Voided' && { label: 'Void payment', icon: 'x', perm: 'approve', danger: true, onClick: async () => { if (!(await confirmDialog({ title: `Void ${p.id}?`, confirmText: 'Void payment' }))) return; const r = Payments.void(p); if (r.error) showToast(r.error, 'error'); else { showToast(`Payment ${p.id} voided`, 'info'); App.refresh(); } } }].filter(Boolean),
    exportName: 'payments',
  });
  $('[data-act="add"]', el)?.addEventListener('click', () => PaymentsUI.record());
  if (query.pay) { const p = DB.get('payments', query.pay); if (p) setTimeout(() => PaymentsUI.view(p), 0); }
};

/* ---------- Expenses ---------- */
const ExpensesUI = {
  fields() {
    return [
      { name: 'date', label: 'Expense date', type: 'date', required: true, validate: (v) => (v > today() ? 'Expense date cannot be in the future.' : '') }, { name: 'category', label: 'Category', type: 'select', required: true, options: EXPENSE_CATEGORIES },
      { name: 'vendor', label: 'Vendor', required: true }, { name: 'employeeId', label: 'Submitted by', type: 'select', required: true, options: () => Lookup.options.employees() },
      { name: 'description', label: 'Description', required: true, full: true },
      { name: 'amount', label: 'Amount (excl. tax)', type: 'currency', required: true, min: 0.01 }, { name: 'tax', label: 'Tax', type: 'currency' },
      { name: 'method', label: 'Payment method', type: 'select', required: true, noEmpty: true, options: PAYMENT_METHODS }, { name: 'account', label: 'Pay from account', type: 'select', noEmpty: true, options: Lookup.options.cashAccounts },
      { name: 'projectId', label: 'Project (optional)', type: 'select', options: Lookup.options.projects, emptyLabel: 'No project' }, { name: 'receipt', label: 'Receipt', type: 'file', accept: 'PDF or image of the receipt' },
    ];
  },
  edit(x, dup, prefill = {}) {
    const isEdit = x && !dup;
    if (isEdit && x.status === 'Paid') { showToast('Paid expenses cannot be edited.', 'error'); return; }
    const me = DB.all('employees').find((e) => e.name === Auth.userName());
    formModal({ title: isEdit ? `Edit expense ${x.id}` : 'New expense', size: 'lg', fields: this.fields(), values: x ? { ...x, date: dup ? today() : x.date } : { date: today(), method: 'Credit Card', account: ACCT.BANK, employeeId: me?.id, ...prefill },
      submitText: isEdit ? 'Save changes' : 'Submit expense',
      onInput: (form, e) => { if (e && e.target.name === 'amount') { const t = $('[name=tax]', form); if (!t.value || t.dataset.auto) { t.value = round2((Number(e.target.value) || 0) * DB.data.settings.taxRate / 100); t.dataset.auto = '1'; } } },
      onSubmit: (v) => {
        v.tax = v.tax || 0; v.projectId = v.projectId || '';
        if (isEdit) { DB.update('expenses', x.id, v); DB.log(`Updated expense ${x.id}`, x.id); showToast('Expense updated successfully'); } else { const id = DB.nextId('expenses', 'EXP-', 4); DB.insert('expenses', { ...v, id, status: 'Pending', paidDate: null }); DB.log(`Submitted expense ${id} (${formatCurrency(v.amount)})`, id); showToast(`Expense ${id} submitted for approval`); }
        App.refresh();
      } });
  },
  approve(x, ok = true) { if (!Auth.can('approve')) { showToast('Your role cannot approve expenses.', 'error'); return; } x.status = ok ? 'Approved' : 'Rejected'; DB.save('expenses'); DB.log(`${ok ? 'Approved' : 'Rejected'} expense ${x.id}`, x.id); showToast(`Expense ${x.id} ${ok ? 'approved' : 'rejected'}`, ok ? 'success' : 'info'); App.refresh(); },
  pay(x) {
    formModal({ title: `Pay expense ${x.id}`, size: 'sm', intro: `<p>Amount due: <strong>${formatCurrency(x.amount + (x.tax || 0))}</strong> to ${esc(x.vendor)}</p>`, fields: [{ name: 'date', label: 'Payment date', type: 'date', required: true }, { name: 'account', label: 'Pay from', type: 'select', noEmpty: true, options: Lookup.options.cashAccounts }, { name: 'method', label: 'Method', type: 'select', noEmpty: true, options: PAYMENT_METHODS }],
      values: { date: today(), account: x.account || ACCT.BANK, method: x.method }, submitText: 'Mark as paid', onSubmit: (v) => { const r = Expenses.markPaid(x, v); if (r.error) return r; showToast(`Expense ${x.id} paid and posted`); App.refresh(); } });
  },
  remove(x) { if (x.status === 'Paid') return { error: 'Paid expenses are posted to the ledger and cannot be deleted.' }; DB.remove('expenses', x.id); DB.log(`Deleted expense ${x.id}`, x.id); return null; },
};
Pages.expenses = (el, { query }) => {
  const xs = DB.all('expenses').filter((x) => x.status !== 'Rejected');
  const w = rolling(30);
  const byCat = EXPENSE_CATEGORIES.map((c) => ({ label: c, value: round2(sum(xs.filter((x) => x.category === c && x.date >= periodStart()), (x) => x.amount)), nav: 'expenses?category=' + c })).filter((x) => x.value).sort((a, b) => b.value - a.value);
  el.innerHTML = pageHeader({ title: 'Expenses', subtitle: 'Submit, approve and pay business expenses', actions: btn('New expense', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' }) }) +
    `<div class="grid-2 top">${statTiles([{ label: 'Spent (last 30 days)', value: formatCurrency(sum(xs.filter((x) => x.date >= w.from), (x) => x.amount), true) }, { label: 'Pending approval', value: DB.all('expenses').filter((x) => x.status === 'Pending').length, nav: 'expenses?status=Pending', tone: 'warn' }, { label: 'Approved, unpaid', value: formatCurrency(sum(DB.all('expenses').filter((x) => x.status === 'Approved'), (x) => x.amount + (x.tax || 0)), true), nav: 'expenses?status=Approved' }, { label: 'Year to date', value: formatCurrency(sum(xs.filter((x) => x.date >= today().slice(0, 4) + '-01-01'), (x) => x.amount), true) }])}
    ${card('By category — last 9 months', Charts.hbars({ items: byCat, color: 'var(--c3)' }))}</div><div class="card"><div class="card-body" id="xl"></div></div>`;
  listView($('#xl', el), {
    key: 'expenses', entity: 'expenses', searchPlaceholder: 'Search expenses…', rows: () => DB.all('expenses'),
    searchFields: [(x) => x.id, (x) => x.vendor, (x) => x.description, (x) => x.category, (x) => Lookup.employeeName(x.employeeId)],
    filters: [{ key: 'category', label: 'Category', options: EXPENSE_CATEGORIES }, { key: 'status', label: 'Status', options: ['Pending', 'Approved', 'Paid', 'Rejected'] }, { key: 'projectId', label: 'Project', options: Lookup.options.projects }],
    preset: query.status || query.category ? { ...(query.status ? { status: query.status } : {}), ...(query.category ? { category: query.category } : {}) } : null,
    dateField: (x) => x.date, defaultSort: { key: 'id', dir: 'desc' },
    columns: [
      { key: 'id', label: 'Expense #', render: (x) => `<strong>${esc(x.id)}</strong>` }, { key: 'date', label: 'Date', value: (x) => x.date, render: (x) => formatDate(x.date) },
      { key: 'category', label: 'Category', render: (x) => badge(x.category, 'neutral') }, { key: 'vendor', label: 'Vendor' }, { key: 'description', label: 'Description' },
      { key: 'employee', label: 'Submitted by', value: (x) => Lookup.employeeName(x.employeeId) }, { key: 'project', label: 'Project', value: (x) => x.projectId, render: (x) => (x.projectId ? link('project/' + x.projectId, x.projectId) : '—') },
      { key: 'amount', label: 'Amount', align: 'right', render: (x) => money(x.amount) }, { key: 'receipt', label: 'Receipt', render: (x) => (x.receipt ? `<span title="${esc(x.receipt)}">${icon('paperclip', 14)}</span>` : '—'), value: (x) => x.receipt },
      { key: 'status', label: 'Status', render: (x) => badge(x.status) },
    ],
    onView: (x) => ExpensesUI.edit(x),
    actions: (x) => crudActions({ edit: x.status !== 'Paid' ? () => ExpensesUI.edit(x) : null, duplicate: () => ExpensesUI.edit(x, true), del: x.status !== 'Paid' ? () => confirmDelete('Expense', () => ExpensesUI.remove(x)) : null,
      extra: [x.status === 'Pending' && { label: 'Approve', icon: 'check', perm: 'approve', onClick: () => ExpensesUI.approve(x) }, x.status === 'Pending' && { label: 'Reject', icon: 'x', perm: 'approve', onClick: () => ExpensesUI.approve(x, false) }, x.status === 'Approved' && { label: 'Mark as paid', icon: 'card', perm: 'approve', onClick: () => ExpensesUI.pay(x) }, x.status === 'Paid' && Auth.canView('journals') && { label: 'View journal', icon: 'book', onClick: () => navigateTo('journals?q=' + x.id) }].filter(Boolean) }),
    onDelete: (rows) => { let ok = 0; rows.forEach((x) => { if (!ExpensesUI.remove(x)) ok++; }); showToast(`${ok} of ${rows.length} expenses deleted${ok < rows.length ? ' — paid expenses were kept' : ''}`, ok < rows.length ? 'warning' : 'success'); },
    exportName: 'expenses',
  });
  $('[data-act="add"]', el)?.addEventListener('click', () => ExpensesUI.edit(null));
};

/* ---------- Aging helpers ---------- */
function agingSummary(docs) { const out = Object.fromEntries(AGING_BUCKETS.map((b) => [b, 0])); docs.filter(Docs.isOpen).forEach((d) => { out[Docs.bucket(d)] += Docs.balance(d); }); return AGING_BUCKETS.map((b) => ({ label: b, value: round2(out[b]) })); }
function agingByParty(docs, key, nameFn) {
  const g = groupBy(docs.filter(Docs.isOpen), (d) => d[key]);
  return Object.entries(g).map(([id, ds]) => { const r = { id, name: nameFn(id), total: 0 }; AGING_BUCKETS.forEach((b) => { r[b] = 0; }); ds.forEach((d) => { r[Docs.bucket(d)] += Docs.balance(d); r.total += Docs.balance(d); }); AGING_BUCKETS.forEach((b) => { r[b] = round2(r[b]); }); r.total = round2(r.total); return r; }).sort((a, b) => b.total - a.total);
}

/* ---------- Finance dashboard ---------- */
Pages.finance = (el) => {
  const w = rolling(30);
  const b = Accounting.balances(null, today());
  const cash = Accounting.balance(ACCT.CASH, null, null, b); const bank = Accounting.balance(ACCT.BANK, null, null, b);
  const p = Accounting.pnl(w.from, w.to); const cf = Accounting.cashFlow(w.from, w.to);
  const months = Accounting.monthly(9);
  const due = DB.all('bills').filter(Docs.isOpen).sort((x, y) => (x.dueDate < y.dueDate ? -1 : 1)).slice(0, 5);
  const col = DB.all('invoices').filter(Docs.isOpen).sort((x, y) => Docs.balance(y) - Docs.balance(x)).slice(0, 5);
  el.innerHTML = pageHeader({ title: 'Finance Dashboard', subtitle: 'Liquidity, cash flow, receivables and payables', actions: `${Auth.canView('finreports') ? `<a class="btn" href="#/finreports">${icon('pie', 16)} Financial reports</a>` : ''}${Auth.canView('journals') ? btn('New journal entry', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="je"', perm: 'create' }) : ''}` }) +
    `<div class="ledger-strip">
      ${kpiCard({ label: 'Cash balance', value: formatCurrency(cash, true), sub: 'Account 1010', icon: 'dollar', nav: 'ledger?account=1010' })}
      ${kpiCard({ label: 'Bank balance', value: formatCurrency(bank, true), sub: 'Account 1020', icon: 'building', nav: 'ledger?account=1020' })}
      ${kpiCard({ label: 'Accounts receivable', value: formatCurrency(Stats.arTotal(), true), sub: 'customer balances', icon: 'arrowIn', nav: 'ar' })}
      ${kpiCard({ label: 'Accounts payable', value: formatCurrency(Stats.apTotal(), true), sub: 'supplier balances', icon: 'arrowOut', nav: 'ap' })}
      ${kpiCard({ label: 'Revenue (30 days)', value: formatCurrency(p.totalRevenue, true), icon: 'trending', nav: 'finreports?tab=pnl' })}
      ${kpiCard({ label: 'Expenses (30 days)', value: formatCurrency(p.totalCogs + p.totalOpex, true), sub: 'incl. cost of goods sold', icon: 'receipt', nav: 'expenses' })}
      ${kpiCard({ label: 'Net profit (30 days)', value: formatCurrency(p.netProfit, true), icon: 'pie', nav: 'finreports?tab=pnl', tone: p.netProfit < 0 ? 'neg' : '' })}
      ${kpiCard({ label: 'Net cash flow (30 days)', value: formatCurrency(cf.net, true), sub: `in ${formatCurrency(cf.inflow, true)} · out ${formatCurrency(cf.outflow, true)}`, icon: 'activity', nav: 'finreports?tab=cf', tone: cf.net < 0 ? 'neg' : '' })}
    </div>
    <div class="grid-dash">
      ${card('Cash flow', Charts.combo({ labels: months.map((m) => m.label), bars: [{ name: 'Cash in', values: months.map((m) => m.cashIn), color: 'var(--c1)' }, { name: 'Cash out', values: months.map((m) => m.cashOut), color: 'var(--c5)' }], lines: [{ name: 'Net', values: months.map((m) => m.net), color: 'var(--c2)' }] }), { cls: 'span-2', sub: 'Cash and bank movements by month' })}
      ${card('Revenue vs expenses', Charts.combo({ labels: months.map((m) => m.label.slice(0, 3)), bars: [{ name: 'Revenue', values: months.map((m) => m.revenue), color: 'var(--c1)' }, { name: 'Expenses', values: months.map((m) => m.expenses), color: 'var(--c3)' }], height: 240 }))}
      ${card('Receivables aging', Charts.columns({ items: agingSummary(DB.all('invoices')).map((x) => ({ ...x, nav: 'ar?bucket=' + encodeURIComponent(x.label) })), colors: AGING_COLORS }), { actions: `<a class="btn btn-ghost btn-sm" href="#/ar">Details ${icon('arrowRight', 14)}</a>` })}
      ${card('Payables aging', Charts.columns({ items: agingSummary(DB.all('bills')).map((x) => ({ ...x, nav: 'ap?bucket=' + encodeURIComponent(x.label) })), colors: AGING_COLORS }), { actions: `<a class="btn btn-ghost btn-sm" href="#/ap">Details ${icon('arrowRight', 14)}</a>` })}
      ${card('Largest receivables', renderTable([{ label: 'Invoice', render: (i) => link('invoice/' + i.id, i.id) }, { label: 'Customer', render: (i) => esc(Lookup.customerName(i.customerId)) }, { label: 'Due', render: (i) => formatDate(i.dueDate) }, { label: 'Balance', align: 'right', render: (i) => money(Docs.balance(i)) }, { label: 'Status', render: (i) => badge(Docs.status(i)) }], col, { cls: 'compact', empty: 'No open receivables.' }))}
      ${card('Upcoming supplier payments', renderTable([{ label: 'Invoice', render: (x) => link('bill/' + x.id, x.id) }, { label: 'Supplier', render: (x) => esc(Lookup.supplierName(x.supplierId)) }, { label: 'Due', render: (x) => formatDate(x.dueDate) }, { label: 'Balance', align: 'right', render: (x) => money(Docs.balance(x)) }, { label: 'Status', render: (x) => badge(Docs.status(x)) }], due, { cls: 'compact', empty: 'Nothing due to suppliers.' }), { cls: 'span-2' })}
    </div>`;
  $('[data-act="je"]', el)?.addEventListener('click', () => JournalUI.create());
};

/* ---------- AR / AP ---------- */
function agingPage(el, { kind, query }) {
  const ar = kind === 'ar';
  const docs = DB.all(ar ? 'invoices' : 'bills');
  const sumry = agingSummary(docs);
  const total = sum(sumry, (x) => x.value);
  const parties = agingByParty(docs, ar ? 'customerId' : 'supplierId', ar ? Lookup.customerName : Lookup.supplierName);
  el.innerHTML = pageHeader({ title: ar ? 'Accounts Receivable' : 'Accounts Payable', subtitle: `${formatCurrency(total)} outstanding across ${parties.length} ${ar ? 'customers' : 'suppliers'} · ledger account ${ar ? '1100' : '2010'}: ${formatCurrency(Accounting.balance(ar ? ACCT.AR : ACCT.AP))}`,
    actions: `${btn('Print', { icon: 'printer', attrs: 'data-action="print"' })}${Auth.canView('payments') ? btn(ar ? 'Record receipt' : 'Pay supplier', { icon: 'card', cls: 'btn-primary', attrs: 'data-act="pay"', perm: 'create' }) : ''}` }) +
    `<div class="aging-strip">${sumry.map((s, i) => `<a class="aging-tile ${query.bucket === s.label ? 'active' : ''}" href="#/${kind}?bucket=${encodeURIComponent(s.label)}" style="--tone:${AGING_COLORS[i]}"><span>${esc(s.label)}</span><strong>${formatCurrency(s.value, true)}</strong><small>${total ? ((s.value / total) * 100).toFixed(0) : 0}%</small></a>`).join('')}<a class="aging-tile total" href="#/${kind}"><span>Total</span><strong>${formatCurrency(total, true)}</strong><small>100%</small></a></div>
    ${card(`Aging by ${ar ? 'customer' : 'supplier'}`, renderTable([{ label: ar ? 'Customer' : 'Supplier', render: (r) => link(`${ar ? 'customer' : 'supplier'}/${r.id}`, r.name) }, ...AGING_BUCKETS.map((b) => ({ label: b, align: 'right', render: (r) => (r[b] ? formatCurrency(r[b]) : '<span class="muted">—</span>') })), { label: 'Total', align: 'right', render: (r) => `<strong>${formatCurrency(r.total)}</strong>` }, { label: '', render: (r) => `<a class="btn btn-sm btn-ghost no-print" href="#/${ar ? 'customer' : 'supplier'}-statement/${r.id}">Statement</a>` }], parties,
      { empty: ar ? 'No outstanding receivables.' : 'No outstanding payables.', footer: `<tr><th>Total</th>${sumry.map((s) => `<th class="num">${formatCurrency(s.value)}</th>`).join('')}<th class="num">${formatCurrency(total)}</th><th></th></tr>` }), { actions: Auth.can('export') ? btn('Export', { icon: 'download', cls: 'btn-sm', attrs: 'data-act="exp"' }) : '' })}
    <div class="card"><div class="card-body" id="al"></div></div>`;
  listView($('#al', el), {
    key: kind + '-docs', entity: 'open documents', rows: () => DB.all(ar ? 'invoices' : 'bills').filter(Docs.isOpen),
    searchFields: [(d) => d.id, (d) => d.number, (d) => (ar ? Lookup.customerName(d.customerId) : Lookup.supplierName(d.supplierId))],
    filters: [{ key: 'bucket', label: 'Aging', options: AGING_BUCKETS, test: (d, v) => Docs.bucket(d) === v }], preset: query.bucket ? { bucket: query.bucket } : null, defaultSort: { key: 'days', dir: 'desc' },
    columns: [
      { key: 'id', label: ar ? 'Invoice #' : 'Supplier invoice', render: (d) => link(`${ar ? 'invoice' : 'bill'}/${d.id}`, d.id) },
      { key: 'party', label: ar ? 'Customer' : 'Supplier', value: (d) => (ar ? Lookup.customerName(d.customerId) : Lookup.supplierName(d.supplierId)) },
      { key: 'date', label: 'Date', value: (d) => d.date, render: (d) => formatDate(d.date) }, { key: 'dueDate', label: 'Due', value: (d) => d.dueDate, render: (d) => formatDate(d.dueDate) },
      { key: 'days', label: 'Days overdue', align: 'right', value: (d) => Docs.daysOverdue(d), render: (d) => (Docs.daysOverdue(d) ? `<span class="text-danger">${Docs.daysOverdue(d)}</span>` : '—') },
      { key: 'bucket', label: 'Aging', value: (d) => Docs.bucket(d), render: (d) => badge(Docs.bucket(d)) },
      { key: 'total', label: 'Amount', align: 'right', value: (d) => Calc.doc(d).total, render: (d) => money(Calc.doc(d).total) },
      { key: 'balance', label: 'Balance', align: 'right', value: (d) => Docs.balance(d), render: (d) => `<strong>${formatCurrency(Docs.balance(d))}</strong>` },
    ],
    onView: (d) => navigateTo(`${ar ? 'invoice' : 'bill'}/${d.id}`),
    actions: (d) => [{ label: 'View', icon: 'eye', onClick: () => navigateTo(`${ar ? 'invoice' : 'bill'}/${d.id}`) }, Auth.canView('payments') && { label: ar ? 'Record payment' : 'Pay supplier', icon: 'card', perm: 'create', onClick: () => PaymentsUI.record(ar ? { type: 'Invoice Payment', partyId: d.customerId, invoiceId: d.id } : { type: 'Supplier Payment', partyId: d.supplierId, billId: d.id }) }, ar && Auth.can('edit') && { label: 'Send reminder', icon: 'send', onClick: () => Invoices.send(d) }].filter(Boolean),
    exportName: kind + '-open-documents',
  });
  $('[data-act="pay"]', el)?.addEventListener('click', () => PaymentsUI.record({ type: ar ? 'Invoice Payment' : 'Supplier Payment' }));
  $('[data-act="exp"]', el)?.addEventListener('click', () => exportCSV(kind + '-aging', [{ label: ar ? 'Customer' : 'Supplier', value: (r) => r.name }, ...AGING_BUCKETS.map((b) => ({ label: b, value: (r) => r[b] })), { label: 'Total', value: (r) => r.total }], parties));
}
Pages.ar = (el, p) => agingPage(el, { kind: 'ar', query: p.query });
Pages.ap = (el, p) => agingPage(el, { kind: 'ap', query: p.query });
