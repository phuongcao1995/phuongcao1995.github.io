/* Dashboard: live KPIs, occupancy, revenue and booking mix */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, C = HMS.chart, icon = HMS.icon;

  function render(el) {
    const d = HMS.store.data;
    const k = H.kpis();
    const today = U.today();
    const days = Array.from({ length: 14 }, (_, i) => U.addDays(today, i - 13));
    const rev = days.map((x) => ({ date: x, ...H.revenueOn(x) }));
    const occ = days.map((x) => (H.nightStats(x).sold / d.rooms.length) * 100);
    const fwd = Array.from({ length: 14 }, (_, i) => U.addDays(today, i + 1));
    const occFwd = fwd.map((x) => (H.nightStats(x, true).sold / d.rooms.length) * 100);
    const yRev = H.revenueOn(U.addDays(today, -1)).total;
    const delta = yRev ? ((k.revenue - yRev) / yRev) * 100 : 0;

    const statusCounts = H.ROOM_STATUSES.map((s) => ({ label: s, value: d.rooms.filter((r) => r.status === s).length, color: `var(--st-${{ 'Out of Order': 'ooo', 'Out of Service': 'oos' }[s] || s.toLowerCase()})` })).filter((x) => x.value);
    const window30 = d.reservations.filter((r) => r.createdAt >= U.addDays(today, -30) && r.status !== 'Cancelled');
    const sources = HMS.REF.SOURCES.map((s) => ({ label: s, value: window30.filter((r) => r.source === s).length })).sort((a, b) => b.value - a.value);
    const dept = [
      { label: 'Rooms', value: U.sum(rev, (x) => x.room) },
      { label: 'Food & beverage', value: U.sum(rev, (x) => x.fnb) },
      { label: 'Spa, transport & other', value: U.sum(rev, (x) => x.other) }
    ];
    const typePerf = d.roomTypes.map((t) => {
      const rooms = d.rooms.filter((r) => r.typeId === t.id).length;
      let sold = 0, revenue = 0;
      days.forEach((x) => { const n = H.nightStats(x).list.filter((r) => r.roomTypeId === t.id); sold += n.length; revenue += U.sum(n, (r) => r.rate); });
      return { t, rooms, sold, revenue, occ: rooms ? (sold / (rooms * days.length)) * 100 : 0, adr: sold ? revenue / sold : 0 };
    });
    const arrivals = H.arrivals().filter((r) => r.status !== 'Checked-in').slice(0, 6);
    const departures = H.departures().filter((r) => r.status === 'Checked-in').slice(0, 6);
    const ring = 2 * Math.PI * 56;

    el.innerHTML = `
      ${UI.pageHead({ title: `Good ${Number(U.vnParts().hour) < 12 ? 'morning' : Number(U.vnParts().hour) < 18 ? 'afternoon' : 'evening'}, ${HMS.app.user.name.split(' ').pop()}`, sub: `${U.esc(d.settings.hotelName)} · ${U.weekday(today)} ${U.fmtDate(today)} · ${k.inHouseGuests} guests in house`,
        actions: `${HMS.app.can('reservations') ? `<button class="btn" data-go="new-res">${icon('plus')}New reservation</button>` : ''}${HMS.app.can('frontdesk') ? `<button class="btn btn-primary" data-go="walkin">${icon('checkin')}Walk-in check-in</button>` : ''}` })}

      <section class="dash-hero">
        <div class="card occ-card">
          <div class="occ-ring">
            <svg viewBox="0 0 132 132"><circle class="ring-bg" cx="66" cy="66" r="56" fill="none" stroke-width="12"/><circle class="ring-fg" cx="66" cy="66" r="56" fill="none" stroke-width="12" stroke-dasharray="${(ring * k.occupancy / 100).toFixed(1)} ${ring.toFixed(1)}"/></svg>
            <div class="occ-ring-label"><strong>${U.pct(k.occupancy)}</strong><span>occupancy tonight</span></div>
          </div>
          <div class="occ-stats">
            <div class="occ-stat"><span>ADR</span><strong>${U.money(k.adr)}</strong></div>
            <div class="occ-stat"><span>RevPAR</span><strong>${U.money(k.revpar)}</strong></div>
            <div class="occ-stat"><span>Rooms occupied</span><strong>${k.occupied} <small class="muted">/ ${k.total}</small></strong></div>
            <div class="occ-stat"><span>Next 7 nights (forecast)</span><strong>${U.pct(U.sum(occFwd.slice(0, 7)) / 7)}</strong></div>
          </div>
        </div>
        <div class="card">
          <div class="today-strip">
            <div><span>Arrivals today</span><strong>${k.arrivals}</strong><a href="#/frontdesk">${k.arrivalsPending} to check in</a></div>
            <div><span>Departures today</span><strong>${k.departures}</strong><a href="#/frontdesk/departures">${k.departuresPending} to check out</a></div>
            <div><span>New bookings today</span><strong>${k.bookingsToday}</strong><a href="#/reservations">View list</a></div>
          </div>
          <div class="today-revenue"><span class="muted small">Today's revenue</span><strong>${U.money(k.revenue)}</strong><span class="small ${delta >= 0 ? 'muted' : 'muted'}">${delta >= 0 ? '▲' : '▼'} ${U.pct(Math.abs(delta))} vs yesterday</span></div>
        </div>
      </section>

      <section class="kpi-grid mb-2">
        ${UI.kpi({ label: 'Total rooms', value: k.total, link: '#/rooms' })}
        ${UI.kpi({ label: 'Available', value: k.available, dot: 'var(--st-available)', link: '#/frontdesk/board' })}
        ${UI.kpi({ label: 'Occupied', value: k.occupied, dot: 'var(--st-occupied)', link: '#/frontdesk/inhouse' })}
        ${UI.kpi({ label: 'Reserved', value: k.reserved, dot: 'var(--st-reserved)', link: '#/frontdesk' })}
        ${UI.kpi({ label: 'Dirty / cleaning', value: k.dirty, dot: 'var(--st-dirty)', link: '#/housekeeping' })}
        ${UI.kpi({ label: 'Maintenance / OOO', value: k.maintenance, dot: 'var(--st-maintenance)', link: '#/maintenance' })}
      </section>

      <section class="grid grid-2-1 mb-2">
        <div class="card">
          <div class="card-head"><h2>Revenue by day <span class="sub">· last 14 days</span></h2>${C.legend([{ label: 'Rooms' }, { label: 'F&B' }, { label: 'Other' }])}</div>
          <div class="card-body">${C.bar(rev.map((x) => ({ label: U.dayLabel(x.date), value: [x.room, x.fnb, x.other], title: U.dayLabel(x.date) })), { series: ['Rooms', 'F&B', 'Other'], tip: U.money, maxLabels: 7, label: 'Revenue by day' })}</div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Room status</h2><a class="small" href="#/frontdesk/board">Open board</a></div>
          <div class="card-body">${C.donut(statusCounts, { center: k.total, sub: 'rooms', label: 'Room status' })}</div>
        </div>
      </section>

      <section class="grid grid-2-1 mb-2">
        <div class="card">
          <div class="card-head"><h2>Occupancy trend</h2>${C.legend([{ label: 'Actual, last 14 nights', color: 'var(--primary)' }, { label: 'On the books, next 14', color: 'var(--lantern)' }])}</div>
          <div class="card-body">${C.line(days.concat(fwd).map(U.dayLabel), [
            { name: 'Actual', values: occ, color: 'var(--primary)' },
            { name: 'Forecast', values: [occ[13]].concat(occFwd), start: 13, color: 'var(--lantern)', dash: true }
          ], { max: 100, format: (v) => Math.round(v) + '%', maxLabels: 7, label: 'Occupancy trend' })}</div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Revenue by department <span class="sub">· 14 days</span></h2></div>
          <div class="card-body">${C.donut(dept.map((x, i) => ({ ...x, color: C.colors[i] })), { center: U.moneyShort(U.sum(dept, (x) => x.value)), sub: 'VND', format: U.moneyShort, label: 'Revenue by department' })}</div>
        </div>
      </section>

      <section class="grid grid-3 mb-2">
        <div class="card">
          <div class="card-head"><h2>Booking sources <span class="sub">· 30 days</span></h2></div>
          <div class="card-body">${C.hbars(sources.map((s) => ({ ...s, color: ['Booking.com', 'Agoda', 'Expedia'].includes(s.label) ? 'var(--info)' : ['Direct', 'Website', 'Phone', 'Walk-in'].includes(s.label) ? 'var(--primary)' : 'var(--lantern)' })))}</div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Arriving today</h2><a class="small" href="#/frontdesk">All arrivals</a></div>
          <div class="card-body"><div class="list">${arrivals.length ? arrivals.map((r) => { const g = H.guest(r.guestId); return `<div class="list-item"><span class="avatar sm">${U.initials(g.name)}</span><div class="grow"><div class="title">${U.esc(g.name)}${U.vip(g)}</div><div class="sub">${r.roomId ? 'Room ' + r.roomId : 'Unassigned'} · ${H.typeName(r.roomTypeId)} · ETA ${r.eta || '—'}</div></div>${HMS.app.can('frontdesk') ? `<button class="btn btn-xs btn-soft" data-ci="${r.id}">Check in</button>` : ''}</div>`; }).join('') : UI.empty('Everyone has arrived', '')}</div></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Departing today</h2><a class="small" href="#/frontdesk/departures">All departures</a></div>
          <div class="card-body"><div class="list">${departures.length ? departures.map((r) => { const g = H.guest(r.guestId); const f = H.folio(r); return `<div class="list-item"><span class="avatar sm">${U.initials(g.name)}</span><div class="grow"><div class="title">${U.esc(g.name)}</div><div class="sub">Room ${r.roomId} · balance ${U.money(f.balance)}</div></div>${HMS.app.can('frontdesk') ? `<button class="btn btn-xs" data-co="${r.id}">Check out</button>` : ''}</div>`; }).join('') : UI.empty('No pending departures', '')}</div></div>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h2>Room type performance <span class="sub">· last 14 nights</span></h2></div>
        <div class="table-wrap mt-1"><table class="table">
          <thead><tr><th>Room type</th><th class="right">Rooms</th><th class="right">Room nights</th><th style="min-width:160px">Occupancy</th><th class="right">ADR</th><th class="right">Revenue</th></tr></thead>
          <tbody>${typePerf.map((x) => `<tr><td class="cell-main">${U.esc(x.t.name)}</td><td class="right num">${x.rooms}</td><td class="right num">${x.sold}</td><td><div class="row" style="flex-wrap:nowrap"><div class="progress" style="flex:1"><i style="width:${x.occ.toFixed(0)}%"></i></div><span class="small num" style="width:44px;text-align:right">${U.pct(x.occ, 0)}</span></div></td><td class="right money">${U.money(x.adr)}</td><td class="right money strong">${U.money(x.revenue)}</td></tr>`).join('')}</tbody>
        </table></div>
      </section>`;

    el.onclick = (e) => {
      const go = e.target.closest('[data-go]');
      if (go && go.dataset.go === 'new-res') HMS.modules.reservations.openForm();
      if (go && go.dataset.go === 'walkin') HMS.modules.frontdesk.checkInWizard(null);
      const ci = e.target.closest('[data-ci]');
      if (ci) HMS.modules.frontdesk.checkInWizard(ci.dataset.ci);
      const co = e.target.closest('[data-co]');
      if (co) HMS.modules.frontdesk.checkOutDialog(co.dataset.co);
    };
  }

  HMS.modules.dashboard = { title: 'Dashboard', render };
})();
