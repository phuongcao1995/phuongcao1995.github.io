/* Reports (occupancy, revenue, guests, bookings, financial) and Finance */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, C = HMS.chart, icon = HMS.icon;
  const D = () => HMS.store.data;
  const rs = { tab: 'occupancy', from: null, to: null };
  let lastExport = null;

  const range = () => { const out = []; for (let d = rs.from; d <= rs.to; d = U.addDays(d, 1)) out.push(d); return out; };
  const stayOverlap = (r) => r.checkIn <= rs.to && r.checkOut > rs.from;

  function render(el, params) {
    if (params[0]) rs.tab = params[0];
    if (!rs.from) { rs.to = U.today(); rs.from = U.addDays(rs.to, -29); }
    el.innerHTML = `${UI.pageHead({ title: 'Reports', sub: 'Operational and financial reports · all amounts in VND', crumbs: [{ label: 'Reports' }],
      actions: `<button class="btn" data-a="print">${icon('print')}Print</button><button class="btn btn-primary" data-a="csv">${icon('download')}Export CSV</button>` })}
      <div class="card mb-2"><div class="table-toolbar">
        <div class="tt-left"><label class="small muted" for="rp-from">From</label><input type="date" id="rp-from" class="input-sm" value="${rs.from}" style="width:150px"><label class="small muted" for="rp-to">To</label><input type="date" id="rp-to" class="input-sm" value="${rs.to}" style="width:150px"></div>
        <div class="tt-right">${[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['month', 'This month'], ['next14', 'Next 14 days (forecast)']].map((x) => `<button class="chip" data-p="${x[0]}">${x[1]}</button>`).join('')}</div>
      </div></div>
      ${UI.tabs([{ id: 'occupancy', label: 'Occupancy' }, { id: 'revenue', label: 'Revenue' }, { id: 'guests', label: 'Guests' }, { id: 'bookings', label: 'Bookings' }, { id: 'financial', label: 'Financial (12 months)' }], rs.tab)}
      <div id="rp-body"></div>`;
    UI.bindTabs(el, (t) => { rs.tab = t; draw(); });
    const set = () => { const f = el.querySelector('#rp-from').value, t = el.querySelector('#rp-to').value; if (!f || !t) return; if (t < f) return UI.toast('The end date must be after the start date.', 'warn'); if (U.diffDays(f, t) > 120) return UI.toast('Choose a range of 120 days or less. Use the Financial tab for longer periods.', 'warn'); rs.from = f; rs.to = t; draw(); };
    el.querySelector('#rp-from').onchange = set; el.querySelector('#rp-to').onchange = set;
    el.onclick = (e) => {
      const p = e.target.closest('[data-p]');
      if (p) {
        const t = U.today();
        if (p.dataset.p === '7') { rs.from = U.addDays(t, -6); rs.to = t; }
        if (p.dataset.p === '30') { rs.from = U.addDays(t, -29); rs.to = t; }
        if (p.dataset.p === 'month') { rs.from = t.slice(0, 8) + '01'; rs.to = t; }
        if (p.dataset.p === 'next14') { rs.from = U.addDays(t, 1); rs.to = U.addDays(t, 14); }
        el.querySelector('#rp-from').value = rs.from; el.querySelector('#rp-to').value = rs.to; draw();
      }
      const a = e.target.closest('[data-a]');
      if (a && a.dataset.a === 'print') window.print();
      if (a && a.dataset.a === 'csv' && lastExport) UI.exportDialog(lastExport.name, lastExport.rows);
    };
    draw();
  }

  function table(headers, rows, opt = {}) {
    return `<div class="table-card"><div class="table-wrap"><table class="table ${opt.compact ? 'compact' : ''}"><thead><tr>${headers.map((h, i) => `<th class="${opt.right && opt.right.includes(i) ? 'right' : ''}">${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td class="${opt.right && opt.right.includes(i) ? 'right num' : ''}">${c}</td>`).join('')}</tr>`).join('')}</tbody>
      ${opt.foot ? `<tfoot><tr>${opt.foot.map((c, i) => `<td class="strong ${opt.right && opt.right.includes(i) ? 'right num' : ''}">${c}</td>`).join('')}</tr></tfoot>` : ''}</table></div></div>`;
  }

  function draw() {
    const body = document.getElementById('rp-body');
    if (!body) return;
    const d = D();
    const days = range();
    const total = d.rooms.filter((r) => !r.disabled).length;
    const future = rs.to > U.today();
    const label = `${U.fmtDate(rs.from)} – ${U.fmtDate(rs.to)}`;

    if (rs.tab === 'occupancy') {
      const rows = days.map((x) => { const n = H.nightStats(x, x >= U.today()); return { x, sold: n.sold, rev: n.revenue, occ: (n.sold / total) * 100, adr: n.sold ? n.revenue / n.sold : 0, revpar: n.revenue / total }; });
      const sold = U.sum(rows, (r) => r.sold), rev = U.sum(rows, (r) => r.rev);
      const byType = d.roomTypes.map((t) => { const cnt = d.rooms.filter((r) => r.typeId === t.id).length; let s = 0, rv = 0; days.forEach((x) => { const l = H.nightStats(x, x >= U.today()).list.filter((r) => r.roomTypeId === t.id); s += l.length; rv += U.sum(l, (r) => r.rate); }); return [U.esc(t.name), cnt, s, U.pct(cnt ? (s / (cnt * days.length)) * 100 : 0), U.money(s ? rv / s : 0), U.money(rv)]; });
      body.innerHTML = `<div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">${UI.kpi({ label: 'Average occupancy', value: U.pct((sold / (total * days.length)) * 100) })}${UI.kpi({ label: 'Room nights sold', value: U.num(sold) })}${UI.kpi({ label: 'ADR', value: U.moneyShort(sold ? rev / sold : 0), unit: 'VND' })}${UI.kpi({ label: 'RevPAR', value: U.moneyShort(rev / (total * days.length)), unit: 'VND' })}</div>
        ${future ? `<div class="alert info mb-2">${icon('info')}<p>Future nights show confirmed and pending bookings on the books (forecast).</p></div>` : ''}
        <div class="card mb-2"><div class="card-head"><h2>Daily occupancy <span class="sub">· ${label}</span></h2></div><div class="card-body">${C.line(days.map(U.dayLabel), [{ name: 'Occupancy', values: rows.map((r) => r.occ) }], { max: 100, format: (v) => Math.round(v) + '%', maxLabels: 10, label: 'Daily occupancy' })}</div></div>
        <h3 class="mb-1" style="font-size:.95rem">By room type</h3>${table(['Room type', 'Rooms', 'Nights sold', 'Occupancy', 'ADR', 'Room revenue'], byType, { right: [1, 2, 3, 4, 5] })}
        <h3 class="mb-1 mt-2" style="font-size:.95rem">Daily detail</h3>${table(['Date', 'Available', 'Sold', 'Occupancy', 'ADR', 'RevPAR', 'Room revenue'], rows.map((r) => [`${U.weekday(r.x)} ${U.fmtDate(r.x)}`, total, r.sold, U.pct(r.occ), U.money(r.adr), U.money(r.revpar), U.money(r.rev)]), { right: [1, 2, 3, 4, 5, 6], compact: true, foot: ['Total', total * days.length, sold, U.pct((sold / (total * days.length)) * 100), U.money(sold ? rev / sold : 0), U.money(rev / (total * days.length)), U.money(rev)] })}`;
      lastExport = { name: 'occupancy-report', rows: [['Date', 'Available', 'Sold', 'Occupancy %', 'ADR', 'RevPAR', 'Room revenue']].concat(rows.map((r) => [r.x, total, r.sold, r.occ.toFixed(1), Math.round(r.adr), Math.round(r.revpar), r.rev])) };
    }

    if (rs.tab === 'revenue') {
      const rows = days.map((x) => ({ x, ...H.revenueOn(x) }));
      const tot = { room: U.sum(rows, (r) => r.room), fnb: U.sum(rows, (r) => r.fnb), other: U.sum(rows, (r) => r.other) };
      const all = tot.room + tot.fnb + tot.other;
      const stays = d.reservations.filter((r) => stayOverlap(r) && ['Checked-in', 'Checked-out'].includes(r.status));
      const bySource = HMS.REF.SOURCES.map((s) => ({ label: s, value: U.sum(stays.filter((r) => r.source === s), (r) => r.rate * H.nights(r.checkIn < rs.from ? rs.from : r.checkIn, r.checkOut > U.addDays(rs.to, 1) ? U.addDays(rs.to, 1) : r.checkOut)) })).sort((a, b) => b.value - a.value);
      const cats = U.groupBy(d.charges.filter((c) => c.date >= rs.from && c.date <= rs.to), (c) => c.category);
      body.innerHTML = `<div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">${UI.kpi({ label: 'Total revenue (net)', value: U.moneyShort(all), unit: 'VND' })}${UI.kpi({ label: 'Rooms', value: U.moneyShort(tot.room), unit: 'VND', meta: U.pct(all ? (tot.room / all) * 100 : 0) + ' of total' })}${UI.kpi({ label: 'Food & beverage', value: U.moneyShort(tot.fnb), unit: 'VND' })}${UI.kpi({ label: 'Other departments', value: U.moneyShort(tot.other), unit: 'VND' })}</div>
        <div class="grid grid-2-1 mb-2"><div class="card"><div class="card-head"><h2>Revenue by day</h2>${C.legend([{ label: 'Rooms' }, { label: 'F&B' }, { label: 'Other' }])}</div><div class="card-body">${C.bar(rows.map((r) => ({ label: U.dayLabel(r.x), value: [r.room, r.fnb, r.other] })), { series: ['Rooms', 'F&B', 'Other'], tip: U.money, maxLabels: 10, label: 'Revenue by day' })}</div></div>
        <div class="card"><div class="card-head"><h2>Room revenue by channel</h2></div><div class="card-body">${C.hbars(bySource, { format: U.moneyShort })}</div></div></div>
        <h3 class="mb-1" style="font-size:.95rem">Ancillary revenue by category</h3>${table(['Category', 'Transactions', 'Revenue', 'Share'], Object.keys(cats).map((k) => [U.esc(k), cats[k].length, U.money(U.sum(cats[k], (c) => c.amount)), U.pct(((U.sum(cats[k], (c) => c.amount)) / (tot.fnb + tot.other || 1)) * 100)]).sort((a, b) => b[1] - a[1]), { right: [1, 2, 3] })}
        <h3 class="mb-1 mt-2" style="font-size:.95rem">Daily revenue</h3>${table(['Date', 'Rooms', 'F&B', 'Other', 'Total', 'VAT (10%)'], rows.map((r) => [U.fmtDate(r.x), U.money(r.room), U.money(r.fnb), U.money(r.other), U.money(r.total), U.money(r.total * 0.1)]), { right: [1, 2, 3, 4, 5], compact: true, foot: ['Total', U.money(tot.room), U.money(tot.fnb), U.money(tot.other), U.money(all), U.money(all * 0.1)] })}`;
      lastExport = { name: 'revenue-report', rows: [['Date', 'Rooms', 'F&B', 'Other', 'Total']].concat(rows.map((r) => [r.x, r.room, r.fnb, r.other, r.total])) };
    }

    if (rs.tab === 'guests') {
      const stays = d.reservations.filter((r) => stayOverlap(r) && ['Checked-in', 'Checked-out', 'Confirmed'].includes(r.status));
      const guests = [...new Set(stays.map((r) => r.guestId))].map(H.guest).filter(Boolean);
      const byNat = Object.entries(U.groupBy(guests, (g) => g.nationality)).map(([k, v]) => ({ label: k, value: v.length })).sort((a, b) => b.value - a.value);
      const byType = Object.entries(U.groupBy(guests, (g) => g.type)).map(([k, v], i) => ({ label: k, value: v.length, color: C.colors[i] }));
      const repeat = guests.filter((g) => d.reservations.filter((r) => r.guestId === g.id && r.status === 'Checked-out').length > 1);
      const top = guests.map((g) => ({ g, spend: U.sum(stays.filter((r) => r.guestId === g.id), (r) => H.folio(r).total), n: stays.filter((r) => r.guestId === g.id).length })).sort((a, b) => b.spend - a.spend).slice(0, 12);
      const intl = guests.filter((g) => g.nationality !== 'Vietnam').length;
      const alos = stays.length ? U.sum(stays, (r) => H.nights(r.checkIn, r.checkOut)) / stays.length : 0;
      body.innerHTML = `<div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">${UI.kpi({ label: 'Unique guests', value: guests.length })}${UI.kpi({ label: 'International', value: U.pct(guests.length ? (intl / guests.length) * 100 : 0), meta: `${intl} guests` })}${UI.kpi({ label: 'Repeat guests', value: repeat.length })}${UI.kpi({ label: 'Average length of stay', value: alos.toFixed(1), unit: 'nights' })}</div>
        <div class="grid grid-2 mb-2"><div class="card"><div class="card-head"><h2>Guests by nationality</h2></div><div class="card-body">${C.hbars(byNat.slice(0, 10))}</div></div>
        <div class="card"><div class="card-head"><h2>Guest type</h2></div><div class="card-body">${C.donut(byType, { center: guests.length, sub: 'guests', label: 'Guest type' })}</div></div></div>
        <h3 class="mb-1" style="font-size:.95rem">Top guests by spend</h3>${table(['Guest', 'Nationality', 'Type', 'Stays in period', 'Spend'], top.map((x) => [`<a href="#/guests/${x.g.id}">${U.esc(x.g.name)}</a>${U.vip(x.g)}`, U.esc(x.g.nationality), U.esc(x.g.type), x.n, U.money(x.spend)]), { right: [3, 4] })}`;
      lastExport = { name: 'guest-report', rows: [['Nationality', 'Guests']].concat(byNat.map((x) => [x.label, x.value])) };
    }

    if (rs.tab === 'bookings') {
      const made = d.reservations.filter((r) => r.createdAt.slice(0, 10) >= rs.from && r.createdAt.slice(0, 10) <= rs.to);
      const cxl = made.filter((r) => r.status === 'Cancelled');
      const ns = made.filter((r) => r.status === 'No-show');
      const lead = made.length ? U.sum(made, (r) => Math.max(0, U.diffDays(r.createdAt.slice(0, 10), r.checkIn))) / made.length : 0;
      const bySrc = HMS.REF.SOURCES.map((s) => { const l = made.filter((r) => r.source === s); return { s, n: l.length, nights: U.sum(l, (r) => H.nights(r.checkIn, r.checkOut)), rev: U.sum(l.filter((r) => r.status !== 'Cancelled'), (r) => r.rate * H.nights(r.checkIn, r.checkOut)), cx: l.filter((r) => r.status === 'Cancelled').length }; }).sort((a, b) => b.n - a.n);
      const byStatus = H.RES_STATUSES.map((s, i) => ({ label: s, value: made.filter((r) => r.status === s).length, color: C.colors[i] })).filter((x) => x.value);
      body.innerHTML = `<div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">${UI.kpi({ label: 'Bookings made', value: made.length })}${UI.kpi({ label: 'Cancellation rate', value: U.pct(made.length ? (cxl.length / made.length) * 100 : 0), meta: `${cxl.length} cancelled · ${ns.length} no-show` })}${UI.kpi({ label: 'Average lead time', value: lead.toFixed(0), unit: 'days' })}${UI.kpi({ label: 'Booked room revenue', value: U.moneyShort(U.sum(bySrc, (x) => x.rev)), unit: 'VND' })}</div>
        <div class="grid grid-2 mb-2"><div class="card"><div class="card-head"><h2>Bookings by channel</h2></div><div class="card-body">${C.hbars(bySrc.map((x) => ({ label: x.s, value: x.n })))}</div></div>
        <div class="card"><div class="card-head"><h2>Booking status</h2></div><div class="card-body">${C.donut(byStatus, { center: made.length, sub: 'bookings', label: 'Booking status' })}</div></div></div>
        ${table(['Channel', 'Bookings', 'Room nights', 'Cancelled', 'Room revenue', 'Share'], bySrc.map((x) => [x.s, x.n, x.nights, x.cx, U.money(x.rev), U.pct(made.length ? (x.n / made.length) * 100 : 0)]), { right: [1, 2, 3, 4, 5] })}`;
      lastExport = { name: 'booking-report', rows: [['Booking', 'Created', 'Guest', 'Check-in', 'Check-out', 'Nights', 'Source', 'Status', 'Rate']].concat(made.map((r) => [r.id, r.createdAt, H.guestName(r.guestId), r.checkIn, r.checkOut, H.nights(r.checkIn, r.checkOut), r.source, r.status, r.rate])) };
    }

    if (rs.tab === 'financial') {
      const hist = d.history;
      const rows = hist.map((h) => { const rev = h.roomRevenue + h.fnbRevenue + h.otherRevenue; return { h, rev, gop: rev - h.expenses }; });
      const tr = U.sum(rows, (r) => r.rev), te = U.sum(hist, (h) => h.expenses);
      body.innerHTML = `<div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">${UI.kpi({ label: 'Revenue, 12 months', value: U.moneyShort(tr), unit: 'VND' })}${UI.kpi({ label: 'Operating expenses', value: U.moneyShort(te), unit: 'VND' })}${UI.kpi({ label: 'Gross operating profit', value: U.moneyShort(tr - te), unit: 'VND', meta: `GOP margin ${U.pct(((tr - te) / tr) * 100)}` })}${UI.kpi({ label: 'Average occupancy', value: U.pct(U.sum(hist, (h) => h.occupancy) / hist.length) })}</div>
        <div class="card mb-2"><div class="card-head"><h2>Revenue vs expenses</h2>${C.legend([{ label: 'Revenue', color: 'var(--primary)' }, { label: 'Expenses', color: 'var(--lantern)' }])}</div><div class="card-body">${C.line(hist.map((h) => U.monthLabel(h.month)), [{ name: 'Revenue', values: rows.map((r) => r.rev), color: 'var(--primary)' }, { name: 'Expenses', values: hist.map((h) => h.expenses), color: 'var(--lantern)' }], { format: U.moneyShort, label: 'Revenue vs expenses' })}</div></div>
        ${table(['Month', 'Occupancy', 'ADR', 'Rooms', 'F&B', 'Other', 'Total revenue', 'Expenses', 'GOP'], rows.map((r) => [U.monthLabel(r.h.month), U.pct(r.h.occupancy), U.money(r.h.adr), U.moneyShort(r.h.roomRevenue), U.moneyShort(r.h.fnbRevenue), U.moneyShort(r.h.otherRevenue), U.moneyShort(r.rev), U.moneyShort(r.h.expenses), `<strong>${U.moneyShort(r.gop)}</strong>`]), { right: [1, 2, 3, 4, 5, 6, 7, 8], foot: ['Total', '', '', U.moneyShort(U.sum(hist, (h) => h.roomRevenue)), U.moneyShort(U.sum(hist, (h) => h.fnbRevenue)), U.moneyShort(U.sum(hist, (h) => h.otherRevenue)), U.moneyShort(tr), U.moneyShort(te), U.moneyShort(tr - te)] })}`;
      lastExport = { name: 'financial-report', rows: [['Month', 'Occupancy %', 'ADR', 'Room revenue', 'F&B revenue', 'Other revenue', 'Expenses', 'GOP']].concat(rows.map((r) => [r.h.month, r.h.occupancy, r.h.adr, r.h.roomRevenue, r.h.fnbRevenue, r.h.otherRevenue, r.h.expenses, r.gop])) };
    }
  }
  HMS.modules.reports = { title: 'Reports', render };

  /* =========================== Finance =========================== */
  let ftab = 'overview';
  const EXP_CATS = ['Utilities', 'Payroll', 'Purchases', 'Maintenance', 'Marketing', 'OTA commission', 'Petty cash', 'Rent & leases', 'Other'];
  function renderFinance(el, params) {
    if (params[0]) ftab = params[0];
    el.innerHTML = `${UI.pageHead({ title: 'Finance', sub: 'Revenue, expenses, receivables, payables, cash and VAT', crumbs: [{ label: 'Finance' }], actions: `<button class="btn btn-primary" data-a="exp">${icon('plus')}Add expense</button>` })}
      ${UI.tabs([{ id: 'overview', label: 'Overview' }, { id: 'receivable', label: 'Accounts receivable' }, { id: 'payable', label: 'Accounts payable' }, { id: 'expenses', label: 'Expenses' }, { id: 'cash', label: 'Daily cash' }, { id: 'bank', label: 'Bank' }, { id: 'vat', label: 'VAT' }], ftab)}
      <div id="fn-body"></div>`;
    UI.bindTabs(el, (t) => { ftab = t; history.replaceState(null, '', `#/finance/${t}`); HMS.app.params = [t]; drawF(); });
    el.querySelector('[data-a=exp]').onclick = () => expenseForm();
    drawF();
  }

  function monthNow() {
    const d = D(), t = U.today(), m0 = t.slice(0, 8) + '01';
    let rev = 0;
    for (let x = m0; x <= t; x = U.addDays(x, 1)) rev += H.revenueOn(x).total;
    const exp = U.sum(d.expenses.filter((e) => e.date >= m0), (e) => e.amount);
    return { rev, exp, m0 };
  }

  function drawF() {
    const body = document.getElementById('fn-body');
    if (!body) return;
    const d = D(), t = U.today();
    if (ftab === 'overview') {
      const m = monthNow();
      const ar = d.invoices.filter((i) => i.status === 'Unpaid');
      const ap = d.purchases.filter((p) => p.status !== 'Paid');
      const hist = d.history.slice(-6);
      const cash7 = Array.from({ length: 14 }, (_, i) => U.addDays(t, i - 13)).map((x) => ({ x, inn: U.sum(d.payments.filter((p) => p.date.startsWith(x) && p.amount > 0 && p.status === 'Paid'), (p) => p.amount), out: U.sum(d.expenses.filter((e) => e.date === x && e.status === 'Paid'), (e) => e.amount) + -U.sum(d.payments.filter((p) => p.date.startsWith(x) && p.amount < 0), (p) => p.amount) }));
      const cats = Object.entries(U.groupBy(d.expenses.filter((e) => e.date >= U.addDays(t, -30)), (e) => e.category)).map(([k, v], i) => ({ label: k, value: U.sum(v, (e) => e.amount), color: C.colors[i % C.colors.length] })).sort((a, b) => b.value - a.value);
      body.innerHTML = `<div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
          ${UI.kpi({ label: `Revenue · ${U.monthLabel(t.slice(0, 7))} to date`, value: U.moneyShort(m.rev), unit: 'VND' })}
          ${UI.kpi({ label: 'Expenses · month to date', value: U.moneyShort(m.exp), unit: 'VND' })}
          ${UI.kpi({ label: 'Gross profit · month to date', value: U.moneyShort(m.rev - m.exp), unit: 'VND', meta: `Margin ${U.pct(m.rev ? ((m.rev - m.exp) / m.rev) * 100 : 0)}` })}
          ${UI.kpi({ label: 'Output VAT · month to date', value: U.moneyShort(m.rev * D().settings.vatRate / 100), unit: 'VND', link: '#/finance/vat' })}
          ${UI.kpi({ label: 'Accounts receivable', value: U.moneyShort(U.sum(ar, (i) => i.total)), unit: 'VND', meta: `${ar.length} open invoices`, link: '#/finance/receivable' })}
          ${UI.kpi({ label: 'Accounts payable', value: U.moneyShort(U.sum(ap, (p) => p.amount - p.paid)), unit: 'VND', meta: `${ap.length} open POs`, link: '#/finance/payable' })}
          ${UI.kpi({ label: 'Cash received today', value: U.moneyShort(U.sum(d.payments.filter((p) => p.date.startsWith(t) && p.method === 'Cash' && p.amount > 0), (p) => p.amount)), unit: 'VND', link: '#/finance/cash' })}
          ${UI.kpi({ label: 'Pending bank confirmations', value: d.payments.filter((p) => p.status === 'Pending' && p.method !== 'City Ledger').length, link: '#/finance/bank' })}
        </div>
        <div class="grid grid-2-1 mb-2"><div class="card"><div class="card-head"><h2>Cash flow <span class="sub">· 14 days</span></h2>${C.legend([{ label: 'Cash in', color: 'var(--primary)' }, { label: 'Cash out', color: 'var(--lantern)' }])}</div><div class="card-body">${C.line(cash7.map((c) => U.dayLabel(c.x)), [{ name: 'In', values: cash7.map((c) => c.inn), color: 'var(--primary)' }, { name: 'Out', values: cash7.map((c) => c.out), color: 'var(--lantern)' }], { format: U.moneyShort, maxLabels: 7, label: 'Cash flow' })}</div></div>
        <div class="card"><div class="card-head"><h2>Expenses by category <span class="sub">· 30 days</span></h2></div><div class="card-body">${C.donut(cats, { center: U.moneyShort(U.sum(cats, (c) => c.value)), sub: 'VND', format: U.moneyShort, label: 'Expenses by category' })}</div></div></div>
        <h3 class="mb-1" style="font-size:.95rem">Profit & loss · last 6 months</h3>
        ${table(['Month', 'Revenue', 'Expenses', 'Gross profit', 'Margin'], hist.map((h) => { const r = h.roomRevenue + h.fnbRevenue + h.otherRevenue; return [U.monthLabel(h.month), U.money(r), U.money(h.expenses), `<strong>${U.money(r - h.expenses)}</strong>`, U.pct(((r - h.expenses) / r) * 100)]; }), { right: [1, 2, 3, 4] })}`;
    }
    if (ftab === 'receivable') {
      const inv = d.invoices.filter((i) => i.status === 'Unpaid');
      const age = (i) => { const n = U.diffDays(i.dueDate, t); return n <= 0 ? 'Current' : n <= 30 ? '1–30 days' : n <= 60 ? '31–60 days' : '60+ days'; };
      const buckets = ['Current', '1–30 days', '31–60 days', '60+ days'].map((b) => ({ label: b, value: U.sum(inv.filter((i) => age(i) === b), (i) => i.total) }));
      body.innerHTML = `<div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">${buckets.map((b) => UI.kpi({ label: b, value: U.moneyShort(b.value), unit: 'VND' })).join('')}</div><div id="ar-t"></div>`;
      UI.dataTable(body.querySelector('#ar-t'), {
        rows: () => d.invoices.filter((i) => i.status === 'Unpaid'), exportName: 'accounts-receivable', sort: 'dueDate',
        searchText: (i) => `${i.id} ${(H.customer(i.customerId) || {}).name} ${i.buyerCompany}`,
        filters: [{ key: 'age', label: 'Ageing', options: buckets.map((b) => b.label), match: (i, v) => age(i) === v }],
        columns: [
          { key: 'id', label: 'Invoice', render: (i) => `<button class="link-btn" data-act="inv">${i.id}</button>` },
          { key: 'cust', label: 'Customer', render: (i) => U.esc((H.customer(i.customerId) || {}).name || i.buyerCompany || H.guestName(i.guestId)), csv: (i) => (H.customer(i.customerId) || {}).name || i.buyerCompany },
          { key: 'date', label: 'Issued', render: (i) => U.fmtDate(i.date) },
          { key: 'dueDate', label: 'Due', render: (i) => U.fmtDate(i.dueDate) },
          { key: 'age', label: 'Ageing', render: (i) => U.badge(age(i), age(i) === 'Current' ? 'success' : age(i) === '1–30 days' ? 'warn' : 'danger'), sortValue: (i) => i.dueDate, csv: age },
          { key: 'total', label: 'Amount', align: 'right', render: (i) => U.money(i.total) }
        ],
        rowActions: () => `<button class="btn btn-xs" data-act="remind">Send reminder</button><button class="btn btn-xs btn-soft" data-act="paid">Record payment</button>`,
        onAction: (a, i) => {
          if (a === 'inv') HMS.modules.billing.invoiceDialog(i.id);
          if (a === 'remind') UI.toast(`Payment reminder emailed to ${(H.customer(i.customerId) || {}).email || 'customer'} (simulated)`, 'info');
          if (a === 'paid') UI.confirm({ title: `Record payment for ${i.id}?`, message: `Mark ${U.money(i.total)} as received by bank transfer from ${U.esc((H.customer(i.customerId) || {}).name || 'the company')}.`, confirmLabel: 'Record payment' }).then((ok) => {
            if (!ok) return;
            i.status = 'Paid';
            H.payments(i.reservationId).filter((p) => p.method === 'City Ledger').forEach((p) => { p.status = 'Paid'; });
            H.recordPayment({ reservationId: '', invoiceId: i.id, guestId: i.guestId, amount: i.total, method: 'Bank Transfer', type: 'Payment', notes: `City ledger settlement · ${(H.customer(i.customerId) || {}).name || ''}` });
            HMS.store.commit(); UI.toast(`${i.id} settled`); drawF();
          });
        }
      });
    }
    if (ftab === 'payable') {
      UI.dataTable(body, {
        rows: () => d.purchases.filter((p) => p.status !== 'Paid').map((p) => ({ ...p, kind: 'PO' })).concat(d.expenses.filter((e) => e.status === 'Pending' && e.category !== 'Purchases').map((e) => ({ id: e.id, supplierId: e.supplierId, date: e.date, amount: e.amount, paid: 0, status: 'Unpaid', dueDate: U.addDays(e.date, 15), items: e.description, kind: 'Expense' }))),
        exportName: 'accounts-payable', sort: 'dueDate',
        searchText: (p) => `${p.id} ${p.items} ${(d.suppliers.find((s) => s.id === p.supplierId) || {}).name}`,
        filters: [{ key: 'kind', label: 'Type', options: ['PO', 'Expense'] }],
        columns: [
          { key: 'id', label: 'Document', render: (p) => `<div class="cell-main">${p.id}</div><div class="cell-sub">${p.kind}</div>` },
          { key: 'vendor', label: 'Vendor / description', render: (p) => `<div>${U.esc((d.suppliers.find((s) => s.id === p.supplierId) || {}).name || '—')}</div><div class="cell-sub">${U.esc(p.items)}</div>`, csv: (p) => (d.suppliers.find((s) => s.id === p.supplierId) || {}).name || p.items },
          { key: 'date', label: 'Date', render: (p) => U.fmtDate(p.date) },
          { key: 'dueDate', label: 'Due', render: (p) => `${U.fmtDate(p.dueDate)}${p.dueDate < t ? ' <span class="badge tone-danger plain">Overdue</span>' : ''}` },
          { key: 'bal', label: 'Balance', align: 'right', render: (p) => U.money(p.amount - p.paid), sortValue: (p) => p.amount - p.paid, csv: (p) => p.amount - p.paid },
          { key: 'status', label: 'Status', render: (p) => U.badge(p.status) }
        ],
        rowActions: () => `<button class="btn btn-xs btn-soft" data-act="pay">Mark paid</button>`,
        onAction: (a, p) => {
          if (p.kind === 'PO') { const po = d.purchases.find((x) => x.id === p.id); po.paid = po.amount; po.status = 'Paid'; const e = d.expenses.find((x) => x.description.endsWith(po.id)); if (e) e.status = 'Paid'; }
          else d.expenses.find((x) => x.id === p.id).status = 'Paid';
          HMS.store.commit(); UI.toast(`${p.id} paid`); drawF();
        }
      });
    }
    if (ftab === 'expenses') {
      UI.dataTable(body, {
        rows: () => d.expenses.slice().reverse(), exportName: 'expenses', sort: 'date', dir: 'desc',
        searchText: (e) => `${e.id} ${e.description} ${e.category}`,
        filters: [{ key: 'category', label: 'Category', options: EXP_CATS }, { key: 'status', label: 'Status', options: ['Paid', 'Pending'] }], dateRange: { key: 'date' },
        toolbar: `<button class="btn btn-sm btn-primary" data-new-exp>${icon('plus')}Add expense</button>`,
        columns: [
          { key: 'id', label: 'Expense', render: (e) => `<span class="cell-main">${e.id}</span>` },
          { key: 'date', label: 'Date', render: (e) => U.fmtDate(e.date) },
          { key: 'category', label: 'Category' }, { key: 'description', label: 'Description' }, { key: 'method', label: 'Method' },
          { key: 'amount', label: 'Amount', align: 'right', render: (e) => U.money(e.amount) },
          { key: 'status', label: 'Status', render: (e) => U.badge(e.status) }
        ]
      });
      body.querySelector('[data-new-exp]').onclick = () => expenseForm();
    }
    if (ftab === 'cash') {
      const day = body.dataset.day || t;
      const pays = d.payments.filter((p) => p.date.startsWith(day));
      const methods = Object.keys(d.settings.paymentMethods).concat('City Ledger');
      const rows = methods.map((m) => { const l = pays.filter((p) => p.method === m); return [m, l.filter((p) => p.amount > 0).length, U.money(U.sum(l.filter((p) => p.amount > 0), (p) => p.amount)), U.money(-U.sum(l.filter((p) => p.amount < 0), (p) => p.amount)), `<strong>${U.money(U.sum(l, (p) => p.amount))}</strong>`]; });
      const cashIn = U.sum(pays.filter((p) => p.method === 'Cash' && p.amount > 0), (p) => p.amount);
      const cashOut = -U.sum(pays.filter((p) => p.method === 'Cash' && p.amount < 0), (p) => p.amount) + U.sum(d.expenses.filter((e) => e.date === day && e.method === 'Cash'), (e) => e.amount);
      const float = 10000000;
      body.innerHTML = `<div class="row mb-2"><label class="small muted" for="cash-day">Business date</label><input type="date" id="cash-day" class="input-sm" value="${day}" max="${t}" style="width:160px"></div>
        <div class="grid grid-2-1"><div>${table(['Method', 'Receipts', 'Received', 'Refunded', 'Net'], rows, { right: [1, 2, 3, 4], foot: ['Total', pays.filter((p) => p.amount > 0).length, U.money(U.sum(pays.filter((p) => p.amount > 0), (p) => p.amount)), U.money(-U.sum(pays.filter((p) => p.amount < 0), (p) => p.amount)), U.money(U.sum(pays, (p) => p.amount))] })}</div>
        <div class="card"><div class="card-head"><h2>Cash drawer · ${U.fmtDate(day)}</h2></div><div class="card-body folio">
          <div class="folio-line"><span>Opening float</span><span>${U.money(float)}</span></div><div class="folio-line"><span>Cash received</span><span>${U.money(cashIn)}</span></div><div class="folio-line"><span>Cash paid out & refunds</span><span class="neg">-${U.money(cashOut)}</span></div>
          <div class="folio-line grand"><span>Expected in drawer</span><span>${U.money(float + cashIn - cashOut)}</span></div>
          <button class="btn btn-block mt-2" data-close-day>Close shift & hand over</button></div></div></div>`;
      body.querySelector('#cash-day').onchange = (e) => { body.dataset.day = e.target.value; drawF(); };
      body.querySelector('[data-close-day]').onclick = () => UI.toast(`Shift closed by ${H.user()} · expected cash ${U.money(float + cashIn - cashOut)}`, 'success');
    }
    if (ftab === 'bank') {
      const bankM = ['Bank Transfer', 'QR Payment', 'Credit Card', 'Debit Card', 'E-wallet'];
      UI.dataTable(body, {
        rows: () => d.payments.filter((p) => bankM.includes(p.method)).slice().reverse(), exportName: 'bank-ledger', sort: 'date', dir: 'desc',
        searchText: (p) => `${p.id} ${p.reference} ${H.guestName(p.guestId)}`,
        filters: [{ key: 'method', label: 'Channel', options: bankM }, { key: 'status', label: 'Status', options: ['Paid', 'Pending', 'Refunded'] }], dateRange: { key: 'date' },
        toolbar: `<span class="small muted">${U.esc(d.settings.bankName)} · A/C ${U.esc(d.settings.bankAccount)}</span>`,
        columns: [
          { key: 'date', label: 'Value date', render: (p) => U.fmtDateTime(p.date) }, { key: 'id', label: 'Payment' },
          { key: 'method', label: 'Channel' }, { key: 'reference', label: 'Bank reference', render: (p) => `<span class="small">${U.esc(p.reference)}</span>` },
          { key: 'guest', label: 'Payer', render: (p) => U.esc(H.guestName(p.guestId)), csv: (p) => H.guestName(p.guestId) },
          { key: 'amount', label: 'Amount', align: 'right', render: (p) => U.money(p.amount) },
          { key: 'status', label: 'Reconciled', render: (p) => p.status === 'Pending' ? U.badge('Pending') : U.badge('Reconciled', 'success'), csv: (p) => p.status }
        ],
        rowActions: (p) => p.status === 'Pending' ? '<button class="btn btn-xs btn-soft" data-act="ok">Match statement</button>' : '',
        onAction: (a, p) => { p.status = 'Paid'; HMS.store.commit(); UI.toast(`${p.id} reconciled`); drawF(); }
      });
    }
    if (ftab === 'vat') {
      const hist = d.history.slice(-6);
      const m = monthNow();
      const rows = hist.map((h) => { const rev = h.roomRevenue + h.fnbRevenue + h.otherRevenue; const out = rev * 0.1; const inp = h.expenses * 0.45 * 0.1; return [U.monthLabel(h.month), U.money(rev), U.money(out), U.money(inp), `<strong>${U.money(out - inp)}</strong>`]; });
      const inpNow = U.sum(d.expenses.filter((e) => e.date >= m.m0 && ['Purchases', 'Utilities', 'Maintenance', 'Marketing'].includes(e.category)), (e) => e.amount / 11);
      body.innerHTML = `<div class="kpi-grid mb-2" style="grid-template-columns:repeat(3,minmax(0,1fr))">${UI.kpi({ label: 'Output VAT · month to date', value: U.moneyShort(m.rev * 0.1), unit: 'VND' })}${UI.kpi({ label: 'Input VAT (deductible) · MTD', value: U.moneyShort(inpNow), unit: 'VND' })}${UI.kpi({ label: 'VAT payable · MTD', value: U.moneyShort(m.rev * 0.1 - inpNow), unit: 'VND', meta: 'Declared monthly (form 01/GTGT)' })}</div>
        ${table(['Month', 'Taxable revenue', 'Output VAT 10%', 'Input VAT', 'VAT payable'], rows, { right: [1, 2, 3, 4] })}
        <p class="tiny muted mt-1">Estimates for demonstration. Input VAT assumes 45% of expenses carry deductible VAT invoices.</p>`;
    }
  }

  function expenseForm() {
    UI.modal({ title: 'Add expense', size: 'md', body: UI.form([
      { name: 'date', label: 'Date', type: 'date', value: U.today(), max: U.today(), required: true },
      { name: 'category', label: 'Category', type: 'select', options: EXP_CATS },
      { name: 'description', label: 'Description', required: true, span: 2 },
      { name: 'amount', label: 'Amount (VND)', type: 'number', min: 1000, step: 1000, required: true },
      { name: 'method', label: 'Paid by', type: 'select', options: ['Bank Transfer', 'Cash', 'Credit Card'] },
      { name: 'supplierId', label: 'Supplier', type: 'select', placeholder: 'None', options: D().suppliers.map((s) => ({ value: s.id, label: s.name })) },
      { name: 'status', label: 'Status', type: 'select', options: ['Paid', 'Pending'] }]),
      actions: [{ label: 'Cancel' }, { label: 'Save expense', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        D().expenses.push(Object.assign({ id: HMS.store.nextId('expense', 'EXP-', 4) }, x));
        HMS.store.commit(); UI.toast(`Expense ${U.money(x.amount)} recorded`);
        if (HMS.app.current === 'finance') drawF();
      } }] });
  }
  HMS.modules.finance = { title: 'Finance', render: renderFinance };
})();
