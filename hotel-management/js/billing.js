/* Billing: guest folios, posting charges, discounts, invoices (VAT) */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;

  /** Decorative VietQR-style code (deterministic pattern from the amount) */
  function qrSvg(amount, size = 120) {
    const n = 25, cell = 100 / n;
    const rnd = U.rng(Math.round(amount || 1) % 2147483647);
    let rects = '';
    const finder = (x, y) => `<rect x="${x * cell}" y="${y * cell}" width="${7 * cell}" height="${7 * cell}" fill="#0C373C"/><rect x="${(x + 1) * cell}" y="${(y + 1) * cell}" width="${5 * cell}" height="${5 * cell}" fill="#fff"/><rect x="${(x + 2) * cell}" y="${(y + 2) * cell}" width="${3 * cell}" height="${3 * cell}" fill="#0C373C"/>`;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!inF && rnd() > 0.52) rects += `<rect x="${(x * cell).toFixed(2)}" y="${(y * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#0C373C"/>`;
    }
    return `<svg class="qr-box" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="Payment QR code">${rects}${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}<rect x="41" y="41" width="18" height="18" rx="3" fill="#fff"/><text x="50" y="54" text-anchor="middle" font-size="9" font-weight="700" fill="#BE3F28" font-family="Arial">QR</text></svg>`;
  }

  function folioLinesHTML(r, f) {
    const cats = Object.keys(f.byCat).map((c) => `<div class="folio-line"><span>${U.esc(c)}</span><span>${U.money(f.byCat[c])}</span></div>`).join('');
    return `<div class="folio-line"><span>Room charge · ${f.nights} × ${U.money(r.rate)}</span><span>${U.money(f.roomCharge)}</span></div>${cats}
      <div class="folio-line rule total"><span>Subtotal</span><span>${U.money(f.subtotal)}</span></div>
      ${f.service ? `<div class="folio-line"><span>Service charge</span><span>${U.money(f.service)}</span></div>` : ''}
      <div class="folio-line"><span>VAT ${D().settings.vatRate}%</span><span>${U.money(f.vat)}</span></div>
      <div class="folio-line"><span>Discount</span><span class="neg">-${U.money(f.discount)}</span></div>
      <div class="folio-line rule total"><span>Total</span><span>${U.money(f.total)}</span></div>
      <div class="folio-line"><span>Paid${f.deposit ? ` (incl. deposit ${U.money(f.deposit)})` : ''}</span><span class="neg">-${U.money(f.paid)}</span></div>
      ${f.ledger ? `<div class="folio-line"><span>City ledger</span><span>-${U.money(f.ledger)}</span></div>` : ''}
      <div class="folio-line grand"><span>Balance</span><span>${U.money(f.balance)}</span></div>`;
  }

  function folioDialog(resId) {
    const r = H.res(resId);
    if (!r) return;
    const g = H.guest(r.guestId);
    const open = r.status === 'Checked-in';
    const m = UI.modal({ title: `Folio · ${g.name} · ${r.roomId ? 'Room ' + r.roomId : r.id}`, size: 'xl', body: '<div id="folio"></div>' });
    function draw() {
      const f = H.folio(r);
      const pays = H.payments(r.id);
      m.body.querySelector('#folio').innerHTML = `
        <div class="row-between mb-2"><div class="small muted">${r.id} · ${U.fmtDate(r.checkIn)} → ${U.fmtDate(r.checkOut)} · ${H.typeName(r.roomTypeId)} · ${H.plan(r.ratePlan).name} · ${r.source}</div>${U.badge(r.status)} ${U.badge(H.paymentStatus(r))}</div>
        <div class="grid grid-2-1">
          <div class="stack">
            <div class="table-card"><div class="table-toolbar"><strong>Charges</strong><div class="tt-right" style="width:auto">${open ? `<button class="btn btn-sm" data-f="charge">${icon('plus')}Post charge</button><button class="btn btn-sm" data-f="minibar">Minibar</button>` : ''}</div></div>
              <div class="table-wrap"><table class="table compact"><thead><tr><th>Date</th><th>Category</th><th>Description</th><th class="right">Qty</th><th class="right">Amount</th>${open ? '<th></th>' : ''}</tr></thead><tbody>
                <tr><td>${U.fmtDate(r.checkIn)}</td><td>Room</td><td>Accommodation · ${f.nights} night(s) × ${U.money(r.rate)}</td><td class="right num">${f.nights}</td><td class="right money">${U.money(f.roomCharge)}</td>${open ? '<td></td>' : ''}</tr>
                ${f.charges.slice().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((c) => `<tr><td>${U.fmtDate(c.date)} <span class="cell-sub">${c.time || ''}</span></td><td>${U.esc(c.category)}</td><td>${U.esc(c.description)}</td><td class="right num">${c.qty}</td><td class="right money">${U.money(c.amount)}</td>${open ? `<td class="actions"><button class="icon-btn sm" data-void="${c.id}" aria-label="Void charge">${icon('trash')}</button></td>` : ''}</tr>`).join('')}
              </tbody></table></div></div>
            <div class="table-card"><div class="table-toolbar"><strong>Payments</strong><div class="tt-right" style="width:auto"><button class="btn btn-sm" data-f="pay">${icon('plus')}Record payment</button></div></div>
              <div class="table-wrap"><table class="table compact"><thead><tr><th>Payment</th><th>Date</th><th>Method</th><th>Reference</th><th>Status</th><th class="right">Amount</th></tr></thead><tbody>
              ${pays.length ? pays.map((p) => `<tr><td class="cell-main">${p.id}<div class="cell-sub">${p.type}</div></td><td>${U.fmtDateTime(p.date)}</td><td>${U.esc(p.method)}</td><td class="small">${U.esc(p.reference || '—')}</td><td>${U.badge(p.status)}</td><td class="right money">${U.money(p.amount)}</td></tr>`).join('') : `<tr><td colspan="6">${UI.empty('No payments yet', '')}</td></tr>`}
              </tbody></table></div></div>
          </div>
          <div class="card"><div class="card-body folio">${folioLinesHTML(r, f)}
            ${open ? `<div class="divider"></div><div class="field"><label for="f-disc">Discount (VND)</label><div class="row" style="flex-wrap:nowrap"><input type="number" id="f-disc" min="0" step="10000" value="${r.discount || 0}"><button class="btn btn-sm" data-f="disc">Apply</button></div></div>` : ''}
          </div></div>
        </div>`;
    }
    const actions = [{ label: 'Print folio', icon: 'print', onClick: () => { UI.printModal(); return false; }, keepOpen: true }, { spacer: true }];
    if (open) actions.push({ label: 'Check out', kind: 'primary', onClick: () => setTimeout(() => HMS.modules.frontdesk.checkOutDialog(r.id), 30) });
    else { const inv = D().invoices.find((i) => i.reservationId === r.id); if (inv) actions.push({ label: 'View invoice', kind: 'primary', onClick: () => setTimeout(() => invoiceDialog(inv.id), 30) }); }
    m.setActions(actions);
    m.body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-f]');
      const v = e.target.closest('[data-void]');
      if (v) {
        const c = D().charges.find((x) => x.id === v.dataset.void);
        if (await UI.confirm({ title: 'Void charge?', message: `Remove <strong>${U.esc(c.description)}</strong> (${U.money(c.amount)}) from the folio? This is logged.`, confirmLabel: 'Void charge', danger: true })) {
          D().charges = D().charges.filter((x) => x.id !== c.id);
          HMS.store.commit(); UI.toast('Charge voided'); draw();
        }
      }
      if (!b) return;
      if (b.dataset.f === 'charge') postChargeDialog(r.id, draw);
      if (b.dataset.f === 'minibar') minibarDialog(r.id, draw);
      if (b.dataset.f === 'pay') HMS.modules.payments.recordDialog({ reservationId: r.id }, draw);
      if (b.dataset.f === 'disc') {
        const val = Math.max(0, Number(m.body.querySelector('#f-disc').value) || 0);
        if (val > H.folio(r).subtotal) return UI.toast('Discount cannot exceed the subtotal.', 'error');
        r.discount = val; HMS.store.commit(); UI.toast(`Discount of ${U.money(val)} applied`); draw();
      }
    });
    draw();
  }

  function postChargeDialog(resId, after) {
    const r = H.res(resId);
    const svc = D().services.filter((s) => s.availability !== 'Unavailable');
    UI.modal({
      title: `Post charge · Room ${r.roomId}`, size: 'md',
      body: UI.form([
        { name: 'service', label: 'From service catalog', type: 'select', placeholder: 'Custom charge', options: svc.map((s) => ({ value: s.id, label: `${s.name} · ${U.money(s.price)} ${s.unit}` })), span: 2 },
        { name: 'category', label: 'Category', type: 'select', options: H.CHARGE_CATS, required: true },
        { name: 'date', label: 'Date', type: 'date', value: U.today(), min: r.checkIn, max: U.today(), required: true },
        { name: 'description', label: 'Description', required: true, span: 2 },
        { name: 'qty', label: 'Quantity', type: 'number', min: 1, value: 1, required: true },
        { name: 'unitPrice', label: 'Unit price (VND)', type: 'number', min: 0, step: 1000, required: true }
      ]),
      onMount: (ctx) => {
        ctx.body.querySelector('[name=service]').addEventListener('change', (e) => {
          const s = svc.find((x) => x.id === e.target.value);
          if (!s) return;
          ctx.body.querySelector('[name=description]').value = s.name;
          ctx.body.querySelector('[name=unitPrice]').value = s.price;
          const cat = ctx.body.querySelector('[name=category]');
          cat.value = H.CHARGE_CATS.includes(s.category) ? s.category : 'Other';
        });
      },
      actions: [{ label: 'Cancel' }, { label: 'Post to folio', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        try { const c = H.postCharge(r.id, v); UI.toast(`${U.money(c.amount)} posted to room ${r.roomId}`); after && after(); }
        catch (err) { UI.toast(err.message, 'error'); return false; }
      } }]
    });
  }

  function minibarDialog(resId, after) {
    const r = H.res(resId);
    const PRICES = { 'Aquafina water 500ml': 25000, 'Coca-Cola 330ml': 35000, 'Larue beer 330ml': 45000, 'Tiger beer 330ml': 55000, 'Roasted cashew nuts': 85000, 'Dried mango': 65000, 'Pringles 110g': 75000 };
    const items = D().inventory.filter((i) => i.category === 'Minibar');
    UI.modal({
      title: `Minibar · Room ${r.roomId}`, size: 'md',
      body: `<p class="small muted">Enter consumed quantities. Stock is deducted from the F&B store.</p><table class="table compact"><thead><tr><th>Item</th><th class="right">Price</th><th class="right">Qty</th></tr></thead><tbody>${items.map((i) => `<tr><td>${U.esc(i.name)}<div class="cell-sub">${i.stock} in stock</div></td><td class="right money">${U.money(PRICES[i.name] || i.cost * 3)}</td><td class="right"><input type="number" class="qty-input" min="0" max="10" value="0" data-mb="${i.id}" aria-label="Quantity ${U.esc(i.name)}"></td></tr>`).join('')}</tbody></table>`,
      actions: [{ label: 'Cancel' }, { label: 'Post minibar', kind: 'primary', onClick: (ctx) => {
        let total = 0;
        try {
          U.qsa('[data-mb]', ctx.body).forEach((inp) => {
            const q = Number(inp.value) || 0;
            if (q <= 0) return;
            const it = items.find((x) => x.id === inp.dataset.mb);
            const price = PRICES[it.name] || it.cost * 3;
            H.postCharge(r.id, { category: 'Minibar', description: it.name, qty: q, unitPrice: price });
            it.stock = Math.max(0, it.stock - q);
            D().movements.push({ id: HMS.store.nextId('movement', 'MV', 5), itemId: it.id, type: 'Stock out', qty: q, date: U.nowStamp(), note: `Minibar room ${r.roomId}`, by: H.user() });
            total += q * price;
          });
        } catch (err) { UI.toast(err.message, 'error'); return false; }
        if (!total) { UI.toast('Enter at least one quantity.', 'warn'); return false; }
        HMS.store.commit();
        UI.toast(`Minibar ${U.money(total)} posted to room ${r.roomId}`);
        after && after();
      } }]
    });
  }

  /* ---------- Invoice (Vietnamese VAT e-invoice layout) ---------- */
  function invoiceDialog(invId) {
    const inv = D().invoices.find((i) => i.id === invId);
    if (!inv) return UI.toast('Invoice not found', 'error');
    const r = H.res(inv.reservationId), g = H.guest(inv.guestId), s = D().settings;
    const f = H.folio(r);
    const pays = H.payments(r.id);
    UI.modal({
      title: `Invoice ${inv.id}`, size: 'lg',
      body: `<article class="invoice-doc">
        <header class="invoice-head"><div><div class="row"><div class="brand-mark">S</div><div><h3>${U.esc(s.hotelName)}</h3><div class="small muted">${U.esc(s.legalName)}</div></div></div>
          <div class="small mt-1">${U.esc(s.address)}<br>Tax code (MST): ${U.esc(s.taxId)} · ${U.esc(s.phone)}</div></div>
          <div class="invoice-meta"><div class="strong" style="font-size:1.05rem">VAT INVOICE</div><div class="muted">Hóa đơn giá trị gia tăng</div><div class="mt-1">Symbol: ${U.esc(s.invoiceSymbol)} · No. ${inv.id.split('-').pop()}</div><div>Date: ${U.fmtDate(inv.date)}</div>${U.badge(inv.status)}</div></header>
        <section class="invoice-parties">
          <div><h4>Guest</h4><div class="strong">${U.esc(g.name)}</div><div>${U.esc(g.address)}</div><div>${U.esc(g.idType)}: ${U.esc(g.idNumber)}</div></div>
          <div><h4>Buyer (company)</h4>${inv.buyerCompany ? `<div class="strong">${U.esc(inv.buyerCompany)}</div><div>Tax code: ${U.esc(inv.buyerTaxId)}</div>` : '<div class="muted">Individual — no company invoice requested</div>'}<div class="mt-1">Stay: ${U.fmtDate(r.checkIn)} → ${U.fmtDate(r.checkOut)} · Room ${r.roomId}</div><div>Booking: ${r.id}</div></div>
        </section>
        <table class="table compact"><thead><tr><th>#</th><th>Description</th><th class="right">Qty</th><th class="right">Unit price</th><th class="right">Amount</th></tr></thead><tbody>
          <tr><td>1</td><td>Accommodation — ${H.typeName(r.roomTypeId)}</td><td class="right num">${f.nights}</td><td class="right money">${U.money(r.rate)}</td><td class="right money">${U.money(f.roomCharge)}</td></tr>
          ${f.charges.map((c, i) => `<tr><td>${i + 2}</td><td>${U.esc(c.category)} — ${U.esc(c.description)}</td><td class="right num">${c.qty}</td><td class="right money">${U.money(c.unitPrice)}</td><td class="right money">${U.money(c.amount)}</td></tr>`).join('')}
        </tbody></table>
        <div class="invoice-totals folio">
          <div class="folio-line"><span>Subtotal (before VAT)</span><span>${U.money(f.subtotal)}</span></div>
          <div class="folio-line"><span>VAT ${s.vatRate}%</span><span>${U.money(f.vat)}</span></div>
          <div class="folio-line"><span>Discount</span><span>-${U.money(f.discount)}</span></div>
          <div class="folio-line grand"><span>Total payment</span><span>${U.money(f.total)}</span></div>
        </div>
        <div class="row-between mt-2" style="align-items:flex-start">
          <div class="small"><strong>Payments</strong><br>${pays.map((p) => `${U.fmtDate(p.date)} · ${U.esc(p.method)} · ${U.money(p.amount)}${p.reference ? ' · ' + U.esc(p.reference) : ''}`).join('<br>') || '—'}</div>
          <div class="small right">${inv.status === 'Unpaid' ? `Due ${U.fmtDate(inv.dueDate)} · transfer to<br>${U.esc(s.bankName)}<br>A/C ${U.esc(s.bankAccount)}` : 'Paid in full. Thank you for staying with us.'}</div>
        </div>
        <p class="tiny muted mt-2">Demo document. Legal e-invoices in Vietnam are issued through a certified provider under Decree 123/2020/ND-CP.</p>
      </article>`,
      actions: [
        { label: 'Email to guest', onClick: () => { UI.toast(`Invoice sent to ${g.email || 'guest'} (simulated)`, 'info'); return false; }, keepOpen: true },
        { label: 'Download CSV', icon: 'download', onClick: () => { UI.exportDialog(inv.id, [['Description', 'Qty', 'Unit price', 'Amount']].concat([[`Accommodation ${H.typeName(r.roomTypeId)}`, f.nights, r.rate, f.roomCharge]], f.charges.map((c) => [c.description, c.qty, c.unitPrice, c.amount]), [['Subtotal', '', '', f.subtotal], ['VAT', '', '', f.vat], ['Discount', '', '', -f.discount], ['Total', '', '', f.total]])); return false; }, keepOpen: true },
        { label: 'Print', kind: 'primary', icon: 'print', onClick: () => { UI.printModal(); return false; }, keepOpen: true }
      ]
    });
  }

  /* ---------- Module page ---------- */
  function render(el, params) {
    const tab = params[0] || 'folios';
    const inHouse = H.inHouse();
    const openBal = U.sum(inHouse, (r) => H.folio(r).balance);
    const invs = D().invoices;
    const unpaid = invs.filter((i) => i.status === 'Unpaid');
    const today = U.today();
    el.innerHTML = `${UI.pageHead({ title: 'Billing', sub: 'Guest folios, charges and VAT invoices in VND', crumbs: [{ label: 'Billing' }] })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Open folios', value: inHouse.length })}
        ${UI.kpi({ label: 'Open balance (in-house)', value: U.moneyShort(openBal), unit: 'VND' })}
        ${UI.kpi({ label: 'Invoices issued today', value: invs.filter((i) => i.date === today).length })}
        ${UI.kpi({ label: 'Unpaid company invoices', value: U.moneyShort(U.sum(unpaid, (i) => i.total)), unit: 'VND', meta: `${unpaid.length} invoices`, link: '#/finance/receivable' })}
      </div>
      ${UI.tabs([{ id: 'folios', label: 'Open folios', count: inHouse.length }, { id: 'invoices', label: 'Invoices', count: invs.length }, { id: 'charges', label: 'Charge journal' }], tab)}
      <div id="bl-body"></div>`;
    UI.bindTabs(el, (t) => { history.replaceState(null, '', `#/billing/${t}`); drawTab(t); });
    drawTab(tab);
  }
  function drawTab(tab) {
    const body = document.getElementById('bl-body');
    if (tab === 'folios') {
      UI.dataTable(body, {
        rows: () => H.inHouse().map((r) => Object.assign({ _f: H.folio(r) }, r)),
        searchText: (r) => `${H.guestName(r.guestId)} ${r.id} ${r.roomId}`, exportName: 'open-folios', sort: 'roomId',
        filters: [{ key: 'pst', label: 'Payment', options: ['Paid', 'Partially Paid', 'Unpaid'], match: (r, v) => H.paymentStatus(r) === v }],
        columns: [
          { key: 'roomId', label: 'Room', render: (r) => `<span class="cell-main">${r.roomId}</span>` },
          { key: 'guest', label: 'Guest', render: (r) => `<div class="cell-main">${U.esc(H.guestName(r.guestId))}</div><div class="cell-sub">${r.id}</div>`, sortValue: (r) => H.guestName(r.guestId), csv: (r) => H.guestName(r.guestId) },
          { key: 'checkOut', label: 'Departure', render: (r) => U.fmtDate(r.checkOut) },
          { key: 'total', label: 'Total', align: 'right', render: (r) => U.money(r._f.total), sortValue: (r) => r._f.total, csv: (r) => r._f.total },
          { key: 'paid', label: 'Paid', align: 'right', render: (r) => U.money(r._f.paid), sortValue: (r) => r._f.paid, csv: (r) => r._f.paid },
          { key: 'balance', label: 'Balance', align: 'right', render: (r) => `<strong>${U.money(r._f.balance)}</strong>`, sortValue: (r) => r._f.balance, csv: (r) => r._f.balance },
          { key: 'pst', label: 'Status', render: (r) => U.badge(H.paymentStatus(r)), sort: false }
        ],
        rowActions: () => `<button class="btn btn-xs" data-act="charge">Post charge</button><button class="btn btn-xs btn-primary" data-act="folio">Open folio</button>`,
        onAction: (a, r) => { if (a === 'folio') folioDialog(r.id); if (a === 'charge') postChargeDialog(r.id, () => drawTab('folios')); },
        onRowClick: (r) => folioDialog(r.id)
      });
    } else if (tab === 'invoices') {
      UI.dataTable(body, {
        rows: () => D().invoices.slice().reverse(),
        searchText: (i) => `${i.id} ${H.guestName(i.guestId)} ${i.reservationId} ${i.buyerCompany}`, exportName: 'invoices',
        filters: [{ key: 'status', label: 'Status', options: ['Paid', 'Unpaid'] }], dateRange: { key: 'date', label: 'Invoice date' }, sort: 'date', dir: 'desc',
        columns: [
          { key: 'id', label: 'Invoice', render: (i) => `<span class="cell-main">${i.id}</span>` },
          { key: 'date', label: 'Date', render: (i) => U.fmtDate(i.date) },
          { key: 'guest', label: 'Guest / buyer', render: (i) => `<div class="cell-main">${U.esc(H.guestName(i.guestId))}</div><div class="cell-sub">${U.esc(i.buyerCompany || 'Individual')}</div>`, sortValue: (i) => H.guestName(i.guestId), csv: (i) => H.guestName(i.guestId) },
          { key: 'reservationId', label: 'Booking' },
          { key: 'nights', label: 'Nights', align: 'right' },
          { key: 'total', label: 'Total', align: 'right', render: (i) => U.money(i.total) },
          { key: 'status', label: 'Status', render: (i) => `${U.badge(i.status)}${i.status === 'Unpaid' && i.dueDate < U.today() ? ' <span class="badge tone-danger plain">Overdue</span>' : ''}` }
        ],
        rowActions: () => `<button class="btn btn-xs" data-act="view">${icon('eye')}View</button>`,
        onAction: (a, i) => invoiceDialog(i.id), onRowClick: (i) => invoiceDialog(i.id)
      });
    } else {
      UI.dataTable(body, {
        rows: () => D().charges.slice().reverse(),
        searchText: (c) => `${c.description} ${c.category} ${c.reservationId} ${(H.res(c.reservationId) || {}).roomId}`, exportName: 'charges',
        filters: [{ key: 'category', label: 'Category', options: H.CHARGE_CATS }], dateRange: { key: 'date' }, sort: 'date', dir: 'desc', compact: true,
        columns: [
          { key: 'date', label: 'Date', render: (c) => `${U.fmtDate(c.date)} <span class="cell-sub">${c.time || ''}</span>`, sortValue: (c) => c.date + c.time },
          { key: 'room', label: 'Room', render: (c) => (H.res(c.reservationId) || {}).roomId || '—', csv: (c) => (H.res(c.reservationId) || {}).roomId },
          { key: 'category', label: 'Category' },
          { key: 'description', label: 'Description' },
          { key: 'qty', label: 'Qty', align: 'right' },
          { key: 'amount', label: 'Amount', align: 'right', render: (c) => U.money(c.amount) },
          { key: 'postedBy', label: 'Posted by' }
        ]
      });
    }
  }

  HMS.modules.billing = { title: 'Billing', render, folioDialog, postChargeDialog, invoiceDialog, minibarDialog, qrSvg };
})();
