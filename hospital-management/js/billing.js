/* Billing: invoices, payments, refunds, printable invoice */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  function render(el, params) {
    const d = D();
    const today = U.today();
    const revToday = U.sum(d.invoices.filter((i) => i.date === today), K.invoicePaid);
    el.innerHTML = `${UI.pageHead({ title: 'Billing', sub: 'Invoices, payments and insurance coverage', crumbs: [{ label: 'Billing' }], actions: `<button class="btn btn-primary" data-a="new">${icon('plus')}Create invoice</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Unpaid invoices', value: d.invoices.filter((i) => i.status === 'Unpaid').length, dot: 'var(--danger)' })}
        ${UI.kpi({ label: 'Partially paid', value: d.invoices.filter((i) => i.status === 'Partially Paid').length, dot: 'var(--warn)' })}
        ${UI.kpi({ label: 'Revenue today', value: U.moneyShort(revToday) })}
        ${UI.kpi({ label: 'Outstanding balance', value: U.moneyShort(U.sum(d.invoices, K.invoiceBalance)) })}
      </div><div id="bi-table"></div>`;
    el.querySelector('[data-a=new]').onclick = () => createDialog();
    UI.dataTable(el.querySelector('#bi-table'), {
      rows: () => d.invoices.slice().sort((a, b) => b.date.localeCompare(a.date)), exportName: 'invoices', sort: 'date', dir: 'desc',
      searchPlaceholder: 'Patient, invoice ID',
      searchText: (i) => `${i.id} ${K.patientName(i.patientId)}`,
      filters: [{ key: 'status', label: 'Status', options: K.INV_STATUSES }],
      dateRange: { key: 'date', label: 'Date' },
      columns: [
        { key: 'id', label: 'Invoice' }, { key: 'patientId', label: 'Patient', render: (i) => K.patientName(i.patientId), csv: (i) => K.patientName(i.patientId) },
        { key: 'date', label: 'Date', render: (i) => U.fmtDate(i.date) },
        { key: 'subtotal', label: 'Subtotal', align: 'right', render: (i) => U.money(i.subtotal) },
        { key: 'insuranceCovered', label: 'Insurance', align: 'right', render: (i) => i.insuranceCovered ? U.money(i.insuranceCovered) : '—' },
        { key: 'patientPayable', label: 'Patient pays', align: 'right', render: (i) => U.money(i.patientPayable) },
        { key: 'balance', label: 'Balance', align: 'right', render: (i) => U.money(K.invoiceBalance(i)), sortValue: K.invoiceBalance, csv: K.invoiceBalance },
        { key: 'status', label: 'Status', render: (i) => U.badge(i.status) }
      ],
      rowActions: () => `<button class="btn btn-xs" data-act="open">Open</button>`, onAction: (a, i) => detail(i.id), onRowClick: (i) => detail(i.id)
    });
    if (params[0]) setTimeout(() => detail(params[0]), 0);
  }

  function detail(id) {
    const draw = () => {
      const inv = K.invoice(id);
      if (!inv) return;
      const balance = K.invoiceBalance(inv);
      ctx.setTitle(`Invoice ${inv.id}`);
      ctx.setActions([{ label: 'Close' }, ...(balance > 0 ? [{ label: 'Record payment', kind: 'primary', onClick: () => { paymentDialog(inv, draw); return false; } }] : []), ...(K.invoicePaid(inv) > 0 && inv.status !== 'Refunded' ? [{ label: 'Refund', onClick: () => { refundDialog(inv, draw); return false; } }] : []), { label: 'Print', icon: 'print', onClick: () => { UI.printModal(); return false; } }]);
      ctx.body.innerHTML = `<div class="invoice-doc">
        <div class="invoice-head"><div><h3>MediPlus General Hospital</h3><p class="small muted">${U.esc(D().settings.address)}<br>${U.esc(D().settings.phone)}</p></div><div class="invoice-meta"><strong>${inv.id}</strong><br>${U.fmtDate(inv.date)}<br>${U.badge(inv.status)}</div></div>
        <div class="invoice-parties"><div><h4>Patient</h4><strong>${U.esc(K.patientName(inv.patientId))}</strong><br>${inv.patientId}</div>${inv.insuranceProvider ? `<div><h4>Insurance</h4><strong>${U.esc(inv.insuranceProvider)}</strong><br>Coverage ${inv.coveragePct}%</div>` : ''}</div>
        <div class="table-wrap mb-2"><table class="table compact"><thead><tr><th>Category</th><th>Description</th><th class="right">Qty</th><th class="right">Unit price</th><th class="right">Amount</th></tr></thead><tbody>${inv.items.map((it) => `<tr><td>${it.category}</td><td>${U.esc(it.description)}</td><td class="right">${it.qty}</td><td class="right">${U.money(it.unitPrice)}</td><td class="right">${U.money(it.qty * it.unitPrice)}</td></tr>`).join('')}</tbody></table></div>
        <div class="invoice-totals folio">
          <div class="folio-line"><span>Subtotal</span><span>${U.money(inv.subtotal)}</span></div>
          <div class="folio-line"><span>Insurance covered</span><span class="neg">-${U.money(inv.insuranceCovered)}</span></div>
          <div class="folio-line"><span>Discount</span><span class="neg">-${U.money(inv.discount)}</span></div>
          <div class="folio-line rule total"><span>Patient payable</span><span>${U.money(inv.patientPayable)}</span></div>
          <div class="folio-line"><span>Paid</span><span class="neg">-${U.money(K.invoicePaid(inv))}</span></div>
          <div class="folio-line grand"><span>Balance due</span><span>${U.money(balance)}</span></div>
        </div>
        ${inv.payments.length ? `<h3 class="form-section">Payments</h3><div class="table-wrap"><table class="table compact"><thead><tr><th>Date</th><th>Method</th><th class="right">Amount</th><th>Status</th></tr></thead><tbody>${inv.payments.map((p) => `<tr><td>${U.fmtDateTime(p.date)}</td><td>${p.method}</td><td class="right">${U.money(p.amount)}</td><td>${U.badge(p.status)}</td></tr>`).join('')}</tbody></table></div>` : ''}
      </div>`;
    };
    const ctx = UI.modal({ title: 'Invoice', size: 'lg', body: '', className: 'invoice-doc' });
    draw();
  }
  function paymentDialog(inv, after) {
    UI.modal({ title: 'Record payment', size: 'sm', body: UI.form([{ name: 'amount', label: 'Amount (VND)', type: 'number', min: 1, required: true, value: K.invoiceBalance(inv) }, { name: 'method', label: 'Method', type: 'select', options: ['Cash', 'Bank Transfer', 'Credit Card', 'QR Payment'] }]),
      actions: [{ label: 'Cancel' }, { label: 'Record payment', kind: 'primary', onClick: (ctx) => { if (!UI.validate(ctx.body)) return false; try { K.recordInvoicePayment(inv.id, UI.readForm(ctx.body)); UI.toast('Payment recorded'); after(); } catch (e) { UI.toast(e.message, 'error'); return false; } } }] });
  }
  function refundDialog(inv, after) {
    UI.modal({ title: 'Refund payment', size: 'sm', body: UI.form([{ name: 'amount', label: 'Refund amount (VND)', type: 'number', min: 1, required: true, value: K.invoicePaid(inv) }, { name: 'reason', label: 'Reason' }]),
      actions: [{ label: 'Cancel' }, { label: 'Refund', kind: 'danger', onClick: (ctx) => { if (!UI.validate(ctx.body)) return false; const v = UI.readForm(ctx.body); try { K.refundInvoice(inv.id, v.amount, v.reason); UI.toast('Refund recorded'); after(); } catch (e) { UI.toast(e.message, 'error'); return false; } } }] });
  }
  function createDialog() {
    const d = D();
    const patientLabel = (p) => `${p.name} · ${p.phone} (${p.id})`;
    const addRow = (host) => {
      const row = document.createElement('div');
      row.className = 'rx-line';
      row.innerHTML = `<div class="form-grid" style="grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;flex:1">
        <select class="bi-cat">${HIS.clinic.BILL_CATS.map((c) => `<option>${c}</option>`).join('')}</select>
        <input class="bi-desc" placeholder="Description">
        <input class="bi-qty" type="number" min="1" value="1" placeholder="Qty">
        <input class="bi-price" type="number" min="0" step="1000" placeholder="Unit price">
        </div><button type="button" class="icon-btn sm" data-rm>${icon('x')}</button>`;
      row.querySelector('[data-rm]').onclick = () => row.remove();
      host.appendChild(row);
    };
    const m = UI.modal({
      title: 'Create invoice', size: 'lg',
      body: `<datalist id="bi-pt-dl">${d.patients.map((p) => `<option value="${U.esc(patientLabel(p))}">`).join('')}</datalist>
        <div class="field mb-2"><label for="bi-pt">Patient <span class="req">*</span></label><input id="bi-pt" list="bi-pt-dl" autocomplete="off"></div>
        <h3 class="form-section">Line items</h3><div id="bi-rows" class="stack" style="gap:8px"></div>
        <button type="button" class="btn btn-sm mt-1" id="bi-add">${icon('plus')}Add line</button>
        <p class="form-error mt-1" id="bi-err" hidden></p>`,
      actions: [{ label: 'Cancel' }, { label: 'Create invoice', kind: 'primary', onClick: (ctx) => {
        const err = ctx.body.querySelector('#bi-err');
        const val = ctx.body.querySelector('#bi-pt').value;
        const mm = val.match(/\((PT-\d+)\)\s*$/);
        const p = mm ? K.patient(mm[1]) : d.patients.find((pp) => pp.name.toLowerCase() === val.trim().toLowerCase());
        if (!p) { err.textContent = 'Select a patient from the list.'; err.hidden = false; return false; }
        const items = [];
        U.qsa('#bi-rows > .rx-line', ctx.body).forEach((row) => { const desc = row.querySelector('.bi-desc').value.trim(); if (desc) items.push({ category: row.querySelector('.bi-cat').value, description: desc, qty: Number(row.querySelector('.bi-qty').value) || 1, unitPrice: Number(row.querySelector('.bi-price').value) || 0 }); });
        if (!items.length) { err.textContent = 'Add at least one line item.'; err.hidden = false; return false; }
        const inv = K.generateInvoice({ patientId: p.id, items });
        UI.toast(`Invoice ${inv.id} created`); HIS.app.refresh();
      } }]
    });
    addRow(m.body.querySelector('#bi-rows'));
    m.body.querySelector('#bi-add').onclick = () => addRow(m.body.querySelector('#bi-rows'));
  }

  HIS.modules.billing = { title: 'Billing', render, detail, createDialog };
})();
