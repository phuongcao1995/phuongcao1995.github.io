/* Payments: records, recording new payments, refunds, confirmations */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, C = HMS.chart, icon = HMS.icon;
  const D = () => HMS.store.data;
  let table;

  function recordDialog(pre = {}, after) {
    const openRes = D().reservations.filter((r) => ['Checked-in', 'Confirmed', 'Pending'].includes(r.status));
    const r0 = pre.reservationId && H.res(pre.reservationId);
    const bal = r0 ? Math.max(0, H.folio(r0).balance) : '';
    UI.modal({
      title: 'Record payment', size: 'md',
      body: UI.form([
        { name: 'reservationId', label: 'Reservation', type: 'select', required: true, placeholder: 'Select reservation', span: 2, options: openRes.map((r) => ({ value: r.id, label: `${r.id} · ${H.guestName(r.guestId)} · ${r.roomId ? 'Room ' + r.roomId : H.typeName(r.roomTypeId)} · ${r.status}` })) },
        { name: 'type', label: 'Type', type: 'select', options: ['Payment', 'Deposit'] },
        { name: 'amount', label: 'Amount (VND)', type: 'number', min: 1000, step: 1000, required: true },
        { name: 'method', label: 'Method', type: 'select', options: H.PAY_METHODS() },
        { name: 'reference', label: 'Reference', placeholder: 'Auto-generated if empty' },
        { name: 'notes', label: 'Notes', span: 2 }
      ], { reservationId: pre.reservationId || '', amount: bal || '', type: r0 && r0.status !== 'Checked-in' ? 'Deposit' : 'Payment' }) + '<p class="small muted mt-1" id="pay-bal"></p>',
      onMount: (ctx) => {
        const sel = ctx.body.querySelector('[name=reservationId]');
        const upd = () => { const r = H.res(sel.value); ctx.body.querySelector('#pay-bal').textContent = r ? `Current balance: ${U.money(H.folio(r).balance)}` : ''; };
        sel.addEventListener('change', () => { upd(); const r = H.res(sel.value); if (r) ctx.body.querySelector('[name=amount]').value = Math.max(0, H.folio(r).balance) || ''; });
        upd();
      },
      actions: [{ label: 'Cancel' }, { label: 'Record payment', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        try {
          const p = H.recordPayment(v);
          UI.toast(`${U.money(p.amount)} received by ${p.method} · ${p.id}`);
          if (after) after(); else if (table) table.refresh();
        } catch (err) { UI.toast(err.message, 'error'); return false; }
      } }]
    });
  }

  function refundDialog(p) {
    UI.modal({
      title: `Refund ${p.id}`, size: 'sm',
      body: UI.form([
        { name: 'amount', label: 'Refund amount (VND)', type: 'number', min: 1000, max: p.amount, step: 1000, value: p.amount, required: true, span: 2 },
        { name: 'reason', label: 'Reason', type: 'select', options: ['Cancellation within policy', 'Overcharge', 'Deposit refund', 'Service complaint'], span: 2 }
      ]) + `<p class="small muted mt-1">Refunds go back via ${U.esc(p.method)}.</p>`,
      actions: [{ label: 'Cancel' }, { label: 'Issue refund', kind: 'danger', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        try { H.refund(p.id, v.amount, v.reason); UI.toast(`Refund of ${U.money(v.amount)} issued`); table && table.refresh(); }
        catch (err) { UI.toast(err.message, 'error'); return false; }
      } }]
    });
  }

  function render(el) {
    const d = D();
    const today = U.today();
    const todays = d.payments.filter((p) => p.date.startsWith(today) && p.amount > 0 && p.status === 'Paid');
    const pending = d.payments.filter((p) => p.status === 'Pending');
    const last30 = d.payments.filter((p) => p.date >= U.addDays(today, -30) && p.amount > 0 && p.method !== 'City Ledger');
    const byMethod = Object.keys(d.settings.paymentMethods).map((m) => ({ label: m, value: U.sum(last30.filter((p) => p.method === m), (p) => p.amount) })).sort((a, b) => b.value - a.value);
    el.innerHTML = `${UI.pageHead({ title: 'Payments', sub: 'Cash, card, bank transfer, VietQR and e-wallet receipts', crumbs: [{ label: 'Payments' }], actions: `<button class="btn btn-primary" data-a="new">${icon('plus')}Record payment</button>` })}
      <div class="grid grid-2-1 mb-2">
        <div class="kpi-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          ${UI.kpi({ label: 'Received today', value: U.moneyShort(U.sum(todays, (p) => p.amount)), unit: 'VND', meta: `${todays.length} payments` })}
          ${UI.kpi({ label: 'Pending confirmation', value: pending.filter((p) => p.method !== 'City Ledger').length, meta: 'Bank transfers to verify' })}
          ${UI.kpi({ label: 'City ledger (billed to companies)', value: U.moneyShort(U.sum(pending.filter((p) => p.method === 'City Ledger'), (p) => p.amount)), unit: 'VND' })}
          ${UI.kpi({ label: 'Refunds (30 days)', value: U.moneyShort(-U.sum(d.payments.filter((p) => p.amount < 0 && p.date >= U.addDays(today, -30)), (p) => p.amount)), unit: 'VND' })}
        </div>
        <div class="card"><div class="card-head"><h2>By method <span class="sub">· 30 days</span></h2></div><div class="card-body">${C.hbars(byMethod, { format: U.moneyShort })}</div></div>
      </div>
      <div id="pay-table"></div>`;
    el.querySelector('[data-a=new]').onclick = () => recordDialog();
    table = UI.dataTable(el.querySelector('#pay-table'), {
      rows: () => d.payments.slice().reverse(),
      searchText: (p) => `${p.id} ${p.invoiceId} ${p.reservationId} ${H.guestName(p.guestId)} ${p.reference}`, exportName: 'payments', sort: 'date', dir: 'desc',
      filters: [{ key: 'status', label: 'Status', options: ['Paid', 'Pending', 'Refunded', 'Partially Paid'] }, { key: 'method', label: 'Method', options: Object.keys(d.settings.paymentMethods).concat('City Ledger') }, { key: 'type', label: 'Type', options: ['Payment', 'Deposit', 'Refund'] }],
      dateRange: { key: 'date', label: 'Payment date' },
      columns: [
        { key: 'id', label: 'Payment', render: (p) => `<div class="cell-main">${p.id}</div><div class="cell-sub">${p.type}</div>` },
        { key: 'invoiceId', label: 'Invoice', render: (p) => p.invoiceId ? `<button class="link-btn" data-act="inv">${p.invoiceId}</button>` : '<span class="muted">—</span>' },
        { key: 'guest', label: 'Guest', render: (p) => `<div class="cell-main">${U.esc(H.guestName(p.guestId))}</div><div class="cell-sub">${p.reservationId || 'Outlet sale'}</div>`, sortValue: (p) => H.guestName(p.guestId), csv: (p) => H.guestName(p.guestId) },
        { key: 'date', label: 'Date', render: (p) => U.fmtDateTime(p.date) },
        { key: 'method', label: 'Method' },
        { key: 'reference', label: 'Reference', render: (p) => `<span class="small">${U.esc(p.reference || '—')}</span>` },
        { key: 'amount', label: 'Amount', align: 'right', render: (p) => `<span class="${p.amount < 0 ? 'muted' : 'strong'}">${U.money(p.amount)}</span>` },
        { key: 'status', label: 'Status', render: (p) => U.badge(p.status) },
        { key: 'notes', label: 'Notes', render: (p) => `<span class="small">${U.esc(p.notes || '')}</span>` }
      ],
      rowActions: (p) => `${p.status === 'Pending' && p.method !== 'City Ledger' ? '<button class="btn btn-xs btn-soft" data-act="confirm">Confirm received</button>' : ''}${p.amount > 0 && p.status === 'Paid' ? '<button class="btn btn-xs" data-act="refund">Refund</button>' : ''}`,
      onAction: (a, p) => {
        if (a === 'inv') HMS.modules.billing.invoiceDialog(p.invoiceId);
        if (a === 'refund') refundDialog(p);
        if (a === 'confirm') { p.status = 'Paid'; p.confirmedBy = H.user(); HMS.store.commit(); UI.toast(`${p.id} confirmed`); table.refresh(); }
      }
    });
  }

  HMS.modules.payments = { title: 'Payments', render, recordDialog };
})();
