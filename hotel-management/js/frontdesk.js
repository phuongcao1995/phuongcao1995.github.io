/* Front Desk: arrivals, departures, in-house, room board,
   check-in wizard (8 steps), check-out settlement, room moves. */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;
  let tables = {};
  let boardFilter = '';

  const guestCell = (r) => { const g = H.guest(r.guestId) || {}; return `<div class="cell-person"><span class="avatar sm">${U.initials(g.name)}</span><div><div class="cell-main">${U.esc(g.name)}${U.vip(g)}</div><div class="cell-sub">${r.id}${r.groupName ? ' · ' + U.esc(r.groupName) : ''}</div></div></div>`; };
  const roomCell = (r) => r.roomId ? `<div class="cell-main">${r.roomId}</div><div class="cell-sub">${H.typeName(r.roomTypeId)}</div>` : `<span class="badge tone-warn plain">Unassigned</span><div class="cell-sub">${H.typeName(r.roomTypeId)}</div>`;

  function render(el, params) {
    const tab = params[0] || 'arrivals';
    const k = H.kpis();
    el.innerHTML = `${UI.pageHead({ title: 'Front Desk', sub: `${U.fmtDate(U.today())} · check-in from ${D().settings.checkInTime}, check-out by ${D().settings.checkOutTime}`, crumbs: [{ label: 'Front Desk' }],
      actions: `<button class="btn" data-a="walkin">${icon('user')}Walk-in guest</button><button class="btn" data-a="quick-co">${icon('logout')}Quick check-out</button><button class="btn btn-primary" data-a="quick-ci">${icon('checkin')}Quick check-in</button>` })}
      ${UI.tabs([{ id: 'arrivals', label: 'Arrivals', count: k.arrivalsPending }, { id: 'departures', label: 'Departures', count: k.departuresPending }, { id: 'inhouse', label: 'In-house', count: H.inHouse().length }, { id: 'board', label: 'Room status board' }], tab)}
      <div id="fd-body"></div>`;
    UI.bindTabs(el, (t) => { history.replaceState(null, '', `#/frontdesk/${t}`); HMS.app.params = [t]; renderTab(t); });
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]');
      if (!a) return;
      if (a.dataset.a === 'walkin') checkInWizard(null, { walkIn: true });
      if (a.dataset.a === 'quick-ci') checkInWizard(null);
      if (a.dataset.a === 'quick-co') quickCheckOut();
    };
    renderTab(tab);
  }

  function renderTab(tab) {
    const body = document.getElementById('fd-body');
    if (!body) return;
    const today = U.today();
    if (tab === 'board') return renderBoard(body);
    if (tab === 'arrivals') {
      tables.a = UI.dataTable(body, {
        rows: () => H.arrivals(today).concat(D().reservations.filter((r) => r.checkIn < today && ['Confirmed', 'Pending'].includes(r.status) && r.checkOut > today)),
        searchPlaceholder: 'Search guest, booking, room',
        searchText: (r) => `${H.guestName(r.guestId)} ${r.id} ${r.roomId} ${r.source} ${r.groupName || ''}`,
        filters: [{ key: 'status', label: 'Status', options: ['Pending', 'Confirmed', 'Checked-in'] }, { key: 'source', label: 'Source', options: HMS.REF.SOURCES }],
        sort: 'eta', exportName: 'arrivals',
        columns: [
          { key: 'guest', label: 'Guest', render: guestCell, sortValue: (r) => H.guestName(r.guestId), csv: (r) => H.guestName(r.guestId) },
          { key: 'roomId', label: 'Room', render: roomCell },
          { key: 'nights', label: 'Nights', align: 'right', render: (r) => H.nights(r.checkIn, r.checkOut), sortValue: (r) => H.nights(r.checkIn, r.checkOut), csv: (r) => H.nights(r.checkIn, r.checkOut) },
          { key: 'guests', label: 'Pax', render: (r) => `${r.adults}A${r.children ? ' · ' + r.children + 'C' : ''}`, sort: false, csv: (r) => r.adults + r.children },
          { key: 'eta', label: 'ETA', render: (r) => r.checkIn < today ? `<span class="badge tone-danger plain">Due ${U.fmtDate(r.checkIn)}</span>` : U.esc(r.eta || '—') },
          { key: 'source', label: 'Source' },
          { key: 'specialRequests', label: 'Requests', render: (r) => r.specialRequests ? `<span class="small" title="${U.esc(r.specialRequests)}">${U.esc(r.specialRequests.slice(0, 34))}${r.specialRequests.length > 34 ? '…' : ''}</span>` : '<span class="muted">—</span>' },
          { key: 'status', label: 'Status', render: (r) => U.badge(r.status) },
          { key: 'pay', label: 'Deposit', align: 'right', render: (r) => { const f = H.folio(r); return f.paid ? U.money(f.paid) : '<span class="muted">—</span>'; }, sortValue: (r) => H.folio(r).paid, csv: (r) => H.folio(r).paid }
        ],
        rowActions: (r) => r.status === 'Checked-in' ? `<button class="btn btn-xs" data-act="folio">Folio</button>` :
          `${r.groupId ? `<button class="btn btn-xs" data-act="group">Group check-in</button>` : ''}${!r.roomId ? `<button class="btn btn-xs" data-act="assign">Assign room</button>` : ''}<button class="btn btn-xs btn-primary" data-act="checkin">Check in</button>`,
        onAction: (act, r) => {
          if (act === 'checkin') checkInWizard(r.id);
          if (act === 'assign') assignRoomDialog(r.id);
          if (act === 'group') groupCheckIn(r.groupId);
          if (act === 'folio') HMS.modules.billing.folioDialog(r.id);
        },
        emptyTitle: 'No arrivals', emptyText: 'Everyone expected today has checked in.'
      });
    } else if (tab === 'departures') {
      tables.d = UI.dataTable(body, {
        rows: () => H.departures(today).concat(D().reservations.filter((r) => r.status === 'Checked-in' && r.checkOut < today)),
        searchText: (r) => `${H.guestName(r.guestId)} ${r.id} ${r.roomId}`,
        filters: [{ key: 'status', label: 'Status', options: ['Checked-in', 'Checked-out'] }],
        exportName: 'departures', sort: 'roomId',
        columns: [
          { key: 'guest', label: 'Guest', render: guestCell, sortValue: (r) => H.guestName(r.guestId), csv: (r) => H.guestName(r.guestId) },
          { key: 'roomId', label: 'Room', render: roomCell },
          { key: 'checkIn', label: 'Arrived', render: (r) => U.fmtDate(r.checkIn) },
          { key: 'checkOut', label: 'Due out', render: (r) => `${U.fmtDate(r.checkOut)}${r.lateCheckout ? `<div class="cell-sub">Late check-out ${r.lateCheckout}</div>` : ''}` },
          { key: 'total', label: 'Folio total', align: 'right', render: (r) => U.money(H.folio(r).total), sortValue: (r) => H.folio(r).total, csv: (r) => H.folio(r).total },
          { key: 'balance', label: 'Balance', align: 'right', render: (r) => { const b = H.folio(r).balance; return `<span class="${b > 0 ? 'strong' : 'muted'}">${U.money(b)}</span>`; }, sortValue: (r) => H.folio(r).balance, csv: (r) => H.folio(r).balance },
          { key: 'status', label: 'Status', render: (r) => U.badge(r.status) }
        ],
        rowActions: (r) => r.status === 'Checked-in' ? `<button class="btn btn-xs" data-act="late">Late check-out</button><button class="btn btn-xs" data-act="extend">Extend</button><button class="btn btn-xs btn-primary" data-act="checkout">Check out</button>` : `<button class="btn btn-xs" data-act="invoice">Invoice</button>`,
        onAction: (act, r) => {
          if (act === 'checkout') checkOutDialog(r.id);
          if (act === 'late') lateCheckoutDialog(r.id);
          if (act === 'extend') extendDialog(r.id);
          if (act === 'invoice') { const inv = D().invoices.find((i) => i.reservationId === r.id); if (inv) HMS.modules.billing.invoiceDialog(inv.id); }
        },
        emptyTitle: 'No departures today'
      });
    } else {
      tables.i = UI.dataTable(body, {
        rows: () => H.inHouse(),
        searchText: (r) => `${H.guestName(r.guestId)} ${r.id} ${r.roomId} ${(H.guest(r.guestId) || {}).nationality}`,
        filters: [{ key: 'roomTypeId', label: 'Room type', options: D().roomTypes.map((t) => ({ value: t.id, label: t.name })) }, { key: 'vip', label: 'Guest', options: ['VIP'], match: (r) => (H.guest(r.guestId) || {}).vip }],
        exportName: 'in-house', sort: 'roomId',
        columns: [
          { key: 'roomId', label: 'Room', render: roomCell },
          { key: 'guest', label: 'Guest', render: guestCell, sortValue: (r) => H.guestName(r.guestId), csv: (r) => H.guestName(r.guestId) },
          { key: 'nat', label: 'Nationality', render: (r) => U.esc((H.guest(r.guestId) || {}).nationality), csv: (r) => (H.guest(r.guestId) || {}).nationality },
          { key: 'checkIn', label: 'Arrival', render: (r) => U.fmtDate(r.checkIn) },
          { key: 'checkOut', label: 'Departure', render: (r) => `${U.fmtDate(r.checkOut)}${r.checkOut <= today ? ' <span class="badge tone-warn plain">Due</span>' : ''}` },
          { key: 'pax', label: 'Pax', render: (r) => `${r.adults}A${r.children ? ' · ' + r.children + 'C' : ''}`, sort: false },
          { key: 'balance', label: 'Balance', align: 'right', render: (r) => U.money(H.folio(r).balance), sortValue: (r) => H.folio(r).balance, csv: (r) => H.folio(r).balance }
        ],
        rowActions: (r) => `<button class="btn btn-xs" data-act="folio">Folio</button><button class="btn btn-xs" data-act="charge">Post charge</button><button class="icon-btn sm" data-act="more" aria-label="More actions">${icon('more')}</button>`,
        onAction: (act, r) => {
          if (act === 'folio') HMS.modules.billing.folioDialog(r.id);
          if (act === 'charge') HMS.modules.billing.postChargeDialog(r.id);
          if (act === 'more') stayActions(r.id);
        },
        emptyTitle: 'No guests in house'
      });
    }
  }

  /* ---------- Room status board ---------- */
  function renderBoard(body) {
    const d = D();
    const counts = {};
    d.rooms.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
    const floors = U.groupBy(d.rooms, (r) => r.floor);
    body.innerHTML = `<div class="card"><div class="card-body">
      <div class="status-legend mb-2">${['', ...H.ROOM_STATUSES].map((s) => `<button type="button" class="chip ${boardFilter === s ? 'active' : ''}" data-f="${s}">${s ? `<i class="swatch" data-status="${s}"></i>` : ''}${s || 'All rooms'} <span class="count">${s ? counts[s] || 0 : d.rooms.length}</span></button>`).join('')}</div>
      <div class="room-board">${Object.keys(floors).sort((a, b) => b - a).map((f) => {
        const list = floors[f].filter((r) => !boardFilter || r.status === boardFilter);
        if (!list.length) return '';
        return `<div class="floor-row"><div class="floor-label">Floor ${f}<small>${floors[f].filter((r) => r.status === 'Occupied').length}/${floors[f].length} occ.</small></div><div class="room-tiles">${list.map(tile).join('')}</div></div>`;
      }).join('') || UI.empty('No rooms with this status', '')}</div></div></div>`;
    body.onclick = (e) => {
      const f = e.target.closest('[data-f]');
      if (f) { boardFilter = f.dataset.f; renderBoard(body); return; }
      const t = e.target.closest('.room-tile');
      if (t) roomActions(t.dataset.room, () => renderBoard(body));
    };
  }
  function tile(r) {
    const occ = r.status === 'Occupied' ? H.occupant(r.id) : null;
    const arr = H.arrivalFor(r.id);
    const who = occ ? H.guestName(occ.guestId) : arr ? `→ ${H.guestName(arr.guestId)}` : r.status === 'Dirty' || r.status === 'Cleaning' ? (r.attendant || 'Unassigned') : r.status;
    const dueOut = occ && occ.checkOut <= U.today();
    return `<button type="button" class="room-tile" data-room="${r.id}" data-status="${r.status}" title="Room ${r.number} · ${H.typeName(r.typeId)} · ${r.status}${occ ? ' · ' + H.guestName(occ.guestId) : ''}">
      ${dueOut || (arr && r.status !== 'Reserved') ? '<span class="rt-flag" title="' + (dueOut ? 'Due out today' : 'Arrival today, room not ready') + '"></span>' : ''}
      <span class="rt-num">${r.number}</span><span class="rt-type">${H.typeName(r.typeId)}</span><span class="rt-guest">${U.esc(who)}</span></button>`;
  }

  /** Context actions for a room (used by board, rooms and housekeeping) */
  function roomActions(roomId, after) {
    const r = H.room(roomId);
    const occ = H.occupant(roomId);
    const arr = H.arrivalFor(roomId);
    const next = H.nextStatuses(r);
    const can = HMS.app.can;
    const upcoming = D().reservations.filter((x) => x.roomId === roomId && x.checkIn > U.today() && ['Confirmed', 'Pending'].includes(x.status)).sort((a, b) => a.checkIn.localeCompare(b.checkIn))[0];
    const m = UI.modal({
      title: `Room ${r.number}${r.name ? ' · ' + r.name : ''}`, size: 'md',
      body: `<div class="row-between mb-2"><div><div class="strong">${H.typeName(r.typeId)} · ${r.bed} bed · sleeps ${r.capacity}</div><div class="small muted">Floor ${r.floor} · ${r.building} · ${r.view} · ${U.money(r.rate)}/night</div></div>${U.badge(r.status)}</div>
        ${occ ? `<div class="form-note mb-2"><strong>In house:</strong> ${U.esc(H.guestName(occ.guestId))} · ${U.fmtDate(occ.checkIn)} → ${U.fmtDate(occ.checkOut)} · balance ${U.money(H.folio(occ).balance)}</div>` : ''}
        ${arr ? `<div class="form-note mb-2"><strong>Arriving today:</strong> ${U.esc(H.guestName(arr.guestId))} (${arr.id}) · ETA ${arr.eta || '—'}</div>` : ''}
        ${!occ && !arr && upcoming ? `<p class="small muted">Next booking: ${upcoming.id}, ${U.fmtDate(upcoming.checkIn)}</p>` : ''}
        ${r.hkNote ? `<div class="alert warn mb-2">${icon('note')}<p>${U.esc(r.hkNote)}</p></div>` : ''}
        <div class="stack" style="gap:10px">
          ${occ && can('frontdesk') ? `<div class="row"><button class="btn btn-sm" data-x="folio">Folio</button><button class="btn btn-sm" data-x="transfer">${icon('swap')}Transfer</button><button class="btn btn-sm" data-x="extend">Extend stay</button><button class="btn btn-sm btn-primary" data-x="checkout">${icon('logout')}Check out</button></div>` : ''}
          ${arr && can('frontdesk') ? `<div class="row"><button class="btn btn-sm btn-primary" data-x="checkin">${icon('checkin')}Check in ${U.esc(H.guestName(arr.guestId).split(' ').pop())}</button></div>` : ''}
          ${!occ && !arr && !H.isBlocked(r) && can('reservations') ? `<div class="row"><button class="btn btn-sm" data-x="reserve">${icon('plus')}New reservation</button>${H.READY.includes(r.status) && can('frontdesk') ? `<button class="btn btn-sm" data-x="walkin">Walk-in to this room</button>` : ''}</div>` : ''}
          ${next.length ? `<div><div class="small muted mb-1">Change status</div><div class="row">${next.map((s) => `<button class="btn btn-sm" data-st="${s}"><i class="swatch" data-status="${s}" style="width:9px;height:9px;border-radius:3px;display:inline-block"></i>${s}</button>`).join('')}</div></div>` : ''}
          ${can('maintenance') && !H.BLOCKED.includes(r.status) ? `<div><button class="link-btn small" data-x="maint">Report a maintenance issue</button></div>` : ''}
        </div>`,
      onMount: (ctx) => {
        ctx.body.addEventListener('click', (e) => {
          const st = e.target.closest('[data-st]');
          if (st) {
            try { H.setRoomStatus(roomId, st.dataset.st); UI.toast(`Room ${r.number} is now ${st.dataset.st}`); ctx.close(); after && after(); }
            catch (err) { UI.toast(err.message, 'error'); }
            return;
          }
          const x = e.target.closest('[data-x]');
          if (!x) return;
          ctx.close();
          const a = x.dataset.x;
          if (a === 'folio') HMS.modules.billing.folioDialog(occ.id);
          if (a === 'transfer') transferDialog(occ.id);
          if (a === 'extend') extendDialog(occ.id);
          if (a === 'checkout') checkOutDialog(occ.id);
          if (a === 'checkin') checkInWizard(arr.id);
          if (a === 'reserve') HMS.modules.reservations.openForm(null, { roomId, roomTypeId: r.typeId });
          if (a === 'walkin') checkInWizard(null, { walkIn: true, roomId });
          if (a === 'maint') HMS.modules.maintenance.openForm(null, { roomId, type: 'Room' });
        });
      }
    });
    return m;
  }

  function stayActions(resId) {
    const r = H.res(resId);
    UI.modal({
      title: `${H.guestName(r.guestId)} · Room ${r.roomId}`, size: 'sm',
      body: `<div class="stack" style="gap:6px">${[['transfer', 'swap', 'Room transfer'], ['extend', 'calendar', 'Extend stay / change departure'], ['late', 'clock', 'Late check-out'], ['notes', 'note', 'Guest notes & requests'], ['guest', 'user', 'Open guest profile'], ['checkout', 'logout', 'Check out']].map((x) => `<button class="dd-item" data-x="${x[0]}">${icon(x[1])}${x[2]}</button>`).join('')}</div>`,
      onMount: (ctx) => ctx.body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-x]');
        if (!b) return;
        ctx.close();
        ({ transfer: transferDialog, extend: extendDialog, late: lateCheckoutDialog, notes: notesDialog, checkout: checkOutDialog, guest: () => HMS.app.go(`#/guests/${r.guestId}`) })[b.dataset.x](r.id);
      })
    });
  }

  /* =========================================================
     Check-in wizard
     ========================================================= */
  const STEPS = ['Find booking', 'Guest', 'Verify details', 'Room', 'Rate', 'Extras', 'Deposit', 'Confirm'];
  function checkInWizard(resId, opt = {}) {
    const today = U.today();
    const st = { step: resId ? 1 : 0, resId, walkIn: !!opt.walkIn, guestId: '', guest: {}, roomId: opt.roomId || '', typeId: '', checkOut: U.addDays(today, 1), adults: 1, children: 0, plan: 'BAR', rate: 0, promo: '', discount: 0, services: {}, deposit: 0, method: 'Cash', extraGuests: '', requests: '', q: '' };
    const setRes = (id) => {
      const r = H.res(id);
      st.resId = id; st.walkIn = false; st.guestId = r.guestId; st.roomId = r.roomId; st.typeId = r.roomTypeId; st.checkOut = r.checkOut;
      st.adults = r.adults; st.children = r.children; st.plan = r.ratePlan; st.rate = r.rate; st.promo = r.promoCode; st.discount = r.discount; st.requests = r.specialRequests;
      if (st.roomId && !H.READY.includes((H.room(st.roomId) || {}).status)) st.roomId = '';
      if (st.roomId && H.room(st.roomId).status === 'Occupied') st.roomId = '';
      const f = H.folio(r);
      st.deposit = Math.max(0, Math.min(1000000, f.balance) - 0);
      if (f.paid >= r.rate) st.deposit = 0; else st.deposit = U.round(Math.max(1000000, r.rate) - f.paid, 10000);
    };
    if (resId) setRes(resId);
    if (st.walkIn) { st.step = 1; if (opt.roomId) st.typeId = H.room(opt.roomId).typeId; }
    const earlyFee = D().services.find((s) => s.name.startsWith('Early check-in'));
    if (earlyFee && U.nowStamp().slice(11) < D().settings.checkInTime && Number(U.nowStamp().slice(11, 13)) < 11) st.services[earlyFee.id] = 1;

    const m = UI.modal({ title: st.walkIn ? 'Walk-in check-in' : 'Check-in', size: 'lg', body: '<div id="wz"></div>' });
    const box = m.body.querySelector('#wz');

    function draw() {
      const s = st.step;
      box.innerHTML = s === 8 ? '' : `<div class="stepper">${STEPS.map((l, i) => `<div class="step ${i < s ? 'done' : i === s ? 'current' : ''}"><div class="step-bar"></div><div class="step-label"><span class="step-num">${i + 1}</span>${l}</div></div>`).join('')}</div>`;
      box.insertAdjacentHTML('beforeend', `<div id="wz-step">${[stepFind, stepGuest, stepVerify, stepRoom, stepRate, stepExtras, stepDeposit, stepConfirm, stepDone][s]()}</div>`);
      const acts = [];
      if (s === 8) {
        acts.push({ label: 'Print registration card', icon: 'print', onClick: () => { UI.printModal(); return false; }, keepOpen: true });
        acts.push({ label: 'Open folio', onClick: () => setTimeout(() => HMS.modules.billing.folioDialog(st.resId), 50) });
        acts.push({ label: 'Done', kind: 'primary' });
      } else {
        if (s > 0 && !(s === 1 && resId && !st.walkIn && false)) acts.push({ label: 'Back', onClick: () => { st.step = s === 1 && st.walkIn && !resId ? 0 : s - 1; draw(); return false; }, keepOpen: true });
        acts.push({ spacer: true });
        acts.push({ label: 'Cancel' });
        if (s > 0) acts.push({ label: s === 7 ? 'Confirm check-in' : 'Continue', kind: 'primary', icon: s === 7 ? 'check' : null, onClick: () => { next(); return false; }, keepOpen: true });
      }
      m.setActions(acts);
      bind();
    }

    /* Step 1 — search reservation */
    function stepFind() {
      const q = st.q.toLowerCase();
      const list = D().reservations.filter((r) => ['Confirmed', 'Pending'].includes(r.status) && r.checkIn <= U.addDays(today, 0) && r.checkOut > today)
        .filter((r) => !q || `${r.id} ${H.guestName(r.guestId)} ${r.roomId} ${r.otaRef || ''} ${(H.guest(r.guestId) || {}).phone}`.toLowerCase().includes(q))
        .sort((a, b) => (a.eta || '').localeCompare(b.eta || ''));
      return `<label class="search-input mb-2" style="width:100%">${icon('search')}<input type="search" id="wz-q" value="${U.esc(st.q)}" placeholder="Booking number, guest name, phone or OTA reference" style="width:100%;height:40px"></label>
        <div class="select-list">
          <button type="button" class="select-card" data-walkin><span class="avatar sm">${icon('plus')}</span><div class="grow"><div class="strong">Walk-in guest</div><div class="small muted">No reservation — create one and check in now</div></div></button>
          ${list.map((r) => { const g = H.guest(r.guestId); return `<button type="button" class="select-card" data-res="${r.id}"><span class="avatar sm">${U.initials(g.name)}</span><div class="grow"><div class="strong">${U.esc(g.name)}${U.vip(g)} <span class="muted small">· ${r.id}</span></div><div class="small muted">${U.fmtDate(r.checkIn)} → ${U.fmtDate(r.checkOut)} · ${H.typeName(r.roomTypeId)} · ${r.roomId ? 'Room ' + r.roomId : 'no room yet'} · ${r.source}${r.groupName ? ' · ' + U.esc(r.groupName) : ''}</div></div>${U.badge(r.status)}</button>`; }).join('') || UI.empty('No matching arrivals', 'Check the spelling or create a walk-in.')}
        </div>`;
    }
    /* Step 2 — select guest */
    function stepGuest() {
      if (!st.walkIn) {
        const r = H.res(st.resId), g = H.guest(st.guestId);
        return `<p class="muted small">Primary guest on booking ${r.id}. Add accompanying guests (for the police registration list) below.</p>
          <div class="select-card selected mb-2" style="cursor:default"><span class="avatar">${U.initials(g.name)}</span><div class="grow"><div class="strong">${U.esc(g.name)}${U.vip(g)}</div><div class="small muted">${U.esc(g.nationality)} · ${U.esc(g.phone)} · ${U.esc(g.idType)} ${U.esc(g.idNumber)}</div><div class="small muted">${g.preferences.length ? 'Prefers: ' + g.preferences.map(U.esc).join(', ') : ''}</div></div>${U.badge(g.type, 'neutral')}</div>
          <div class="field"><label for="wz-extra">Accompanying guests</label><textarea id="wz-extra" rows="3" placeholder="One per line: full name, nationality, ID/passport number">${U.esc(st.extraGuests)}</textarea><small class="help">${r.adults} adult(s)${r.children ? `, ${r.children} child(ren)` : ''} on this booking.</small></div>`;
      }
      const q = st.q.toLowerCase();
      const list = q.length > 1 ? D().guests.filter((g) => `${g.name} ${g.phone} ${g.idNumber}`.toLowerCase().includes(q)).slice(0, 8) : [];
      return `<p class="muted small">Find a returning guest by name, phone or ID — or register a new guest.</p>
        <label class="search-input mb-2" style="width:100%">${icon('search')}<input type="search" id="wz-gq" value="${U.esc(st.q)}" placeholder="Name, phone or ID number" style="width:100%;height:40px"></label>
        <div class="select-list">
          <button type="button" class="select-card ${st.guestId === 'NEW' ? 'selected' : ''}" data-guest="NEW"><span class="avatar sm">${icon('plus')}</span><div class="grow"><div class="strong">New guest</div><div class="small muted">Enter details in the next step</div></div></button>
          ${list.map((g) => `<button type="button" class="select-card ${st.guestId === g.id ? 'selected' : ''}" data-guest="${g.id}"><span class="avatar sm">${U.initials(g.name)}</span><div class="grow"><div class="strong">${U.esc(g.name)}${U.vip(g)}</div><div class="small muted">${U.esc(g.phone)} · ${U.esc(g.nationality)} · ${U.esc(g.idNumber)}</div></div></button>`).join('')}
        </div>
        <div class="field mt-2"><label for="wz-extra">Accompanying guests</label><textarea id="wz-extra" rows="2" placeholder="One per line">${U.esc(st.extraGuests)}</textarea></div>`;
    }
    /* Step 3 — verify guest info (ID/passport required for registration) */
    function stepVerify() {
      const g = st.guestId && st.guestId !== 'NEW' ? H.guest(st.guestId) : {};
      const v = Object.assign({ nationality: 'Vietnam', idType: 'CCCD', gender: 'Male' }, g, st.guest);
      return `<p class="muted small">Check the ID or passport against the details below. Foreign guests are declared to local police via the residence declaration system.</p>` + UI.form([
        { name: 'name', label: 'Full name', required: true, span: 2 },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
        { name: 'dob', label: 'Date of birth', type: 'date', max: today },
        { name: 'nationality', label: 'Nationality', type: 'select', options: NATIONALITIES() },
        { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '0905 123 456' },
        { name: 'idType', label: 'Document', type: 'select', options: ['CCCD', 'Passport', 'Driving licence'] },
        { name: 'idNumber', label: 'ID / passport number', required: true, pattern: '[A-Za-z0-9]{6,15}', title: '6–15 letters or digits', placeholder: '048095001234' },
        { name: 'email', label: 'Email', type: 'email', span: 2 },
        { name: 'address', label: 'Address', span: 2 }
      ], v);
    }
    /* Step 4 — select room */
    function stepRoom() {
      const types = D().roomTypes;
      if (!st.typeId) st.typeId = st.walkIn ? 'DLX' : H.res(st.resId).roomTypeId;
      const rooms = H.availableRooms(today, st.checkOut, st.typeId, st.resId, { readyNow: true });
      if (st.roomId && !rooms.find((r) => r.id === st.roomId)) { const cur = H.room(st.roomId); if (!(cur && cur.typeId === st.typeId)) st.roomId = ''; }
      return `<div class="form-grid cols-3 mb-2">
          <div class="field"><label for="wz-type">Room type</label><select id="wz-type">${types.map((t) => `<option value="${t.id}" ${t.id === st.typeId ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
          <div class="field"><label for="wz-co">Check-out date</label><input type="date" id="wz-co" value="${st.checkOut}" min="${U.addDays(today, 1)}" ${st.walkIn ? '' : 'readonly'}></div>
          <div class="field"><label>Nights</label><input readonly value="${H.nights(today, st.checkOut)}"></div>
        </div>
        ${!st.walkIn && H.res(st.resId).roomTypeId !== st.typeId ? `<div class="alert info mb-2">${icon('info')}<p>Room type changed from ${H.typeName(H.res(st.resId).roomTypeId)}. The rate will be recalculated.</p></div>` : ''}
        <p class="small muted">${rooms.length} clean rooms free until ${U.fmtDate(st.checkOut)}. Dirty or out-of-order rooms are hidden.</p>
        <div class="room-tiles" style="max-height:300px;overflow:auto;padding:2px">${rooms.map((r) => `<button type="button" class="room-tile ${st.roomId === r.id ? 'selected' : ''}" data-status="${r.status}" data-pick="${r.id}" style="${st.roomId === r.id ? 'outline:2px solid var(--primary);outline-offset:1px' : ''}"><span class="rt-num">${r.number}</span><span class="rt-type">${r.view}</span><span class="rt-guest">${U.moneyShort(r.rate)}</span></button>`).join('') || UI.empty('No clean rooms of this type', 'Try another room type or ask housekeeping to release a room.')}</div>`;
    }
    /* Step 5 — confirm rate */
    function stepRate() {
      const n = H.nights(today, st.checkOut);
      const room = H.room(st.roomId);
      if (!st.rate || st.rateFor !== `${st.roomId}|${st.plan}`) { if (st.walkIn || st.rateFor) st.rate = H.rateFor(room.typeId, st.plan, room.id); st.rateFor = `${st.roomId}|${st.plan}`; }
      const promo = H.applyPromo(st.promo, { typeId: room.typeId, nights: n, roomCharge: st.rate * n });
      return `${UI.form([
        { name: 'plan', label: 'Rate plan', type: 'select', options: D().ratePlans.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name })) },
        { name: 'rate', label: 'Nightly rate (VND)', type: 'number', min: 0, step: 10000, required: true, readonly: !['Administrator', 'General Manager', 'Front Office Manager'].includes(HMS.app.user.role), help: 'Managers can override the rate.' },
        { name: 'adults', label: 'Adults', type: 'number', min: 1, max: room.capacity + 1, required: true },
        { name: 'children', label: 'Children', type: 'number', min: 0, max: 3 },
        { name: 'promo', label: 'Promotion code', placeholder: 'e.g. WEEKEND10' },
        { name: 'requests', label: 'Special requests', type: 'textarea', span: 2, rows: 2 }
      ], { plan: st.plan, rate: st.rate, adults: st.adults, children: st.children, promo: st.promo, requests: st.requests })}
      <div class="form-note mt-2 folio">
        <div class="folio-line"><span>Room ${room.number} · ${n} night${n > 1 ? 's' : ''} × ${U.money(st.rate)}</span><span>${U.money(st.rate * n)}</span></div>
        ${promo.error ? `<div class="folio-line"><span style="color:var(--danger)">${U.esc(promo.error)}</span><span></span></div>` : promo.amount ? `<div class="folio-line"><span>Promotion ${U.esc(promo.promo.code)}</span><span class="neg">-${U.money(promo.amount)}</span></div>` : ''}
        <div class="folio-line sub"><span>${H.plan(st.plan).desc}</span><span></span></div>
      </div>`;
    }
    /* Step 6 — extra services */
    function stepExtras() {
      const svc = D().services.filter((s) => s.availability !== 'Unavailable' && ['Room', 'Transport', 'F&B', 'Spa', 'Leisure'].includes(s.category));
      return `<p class="small muted">Selected services are posted to the guest folio at check-in.${st.services[(D().services.find((s) => s.name.startsWith('Early')) || {}).id] ? ' Arrival is before check-in time, so the early check-in fee is pre-selected.' : ''}</p>
        <div class="table-wrap"><table class="table compact"><thead><tr><th></th><th>Service</th><th>Unit</th><th class="right">Price</th><th class="right">Qty</th></tr></thead><tbody>
        ${svc.map((s) => `<tr><td><input type="checkbox" class="check" data-svc="${s.id}" ${st.services[s.id] ? 'checked' : ''} aria-label="${U.esc(s.name)}"></td><td class="cell-main">${U.esc(s.name)}<div class="cell-sub">${U.esc(s.category)}${s.availability === 'On request' ? ' · on request' : ''}</div></td><td class="small">${s.unit}</td><td class="right money">${U.money(s.price)}</td><td class="right"><input type="number" class="qty-input" min="1" max="20" value="${st.services[s.id] || 1}" data-qty="${s.id}" aria-label="Quantity"></td></tr>`).join('')}
        </tbody></table></div>`;
    }
    /* Step 7 — collect deposit */
    function stepDeposit() {
      const paid = st.resId ? H.folio(H.res(st.resId)).paid : 0;
      return `${paid ? `<div class="alert info mb-2">${icon('info')}<p>${U.money(paid)} already received on this booking.</p></div>` : ''}
        ${UI.form([
          { name: 'deposit', label: 'Deposit amount (VND)', type: 'number', min: 0, step: 10000, help: 'Common practice: one night or 1,000,000 VND. Enter 0 to skip.' },
          { name: 'method', label: 'Payment method', type: 'select', options: H.PAY_METHODS() },
          { name: 'depRef', label: 'Reference (card approval / transfer code)', span: 2 }
        ], { deposit: st.deposit, method: st.method, depRef: st.depRef || '' })}
        ${qrBlock()}`;
    }
    function qrBlock() {
      return `<div class="row mt-2" id="wz-qr" ${st.method === 'QR Payment' || st.method === 'Bank Transfer' ? '' : 'hidden'} style="align-items:flex-start;gap:14px">${HMS.modules.billing.qrSvg(st.deposit)}<div class="small"><strong>VietQR · ${U.esc(D().settings.bankName)}</strong><br>A/C ${U.esc(D().settings.bankAccount)}<br>${U.esc(D().settings.bankHolder)}<br>Amount: ${U.money(st.deposit)}<br><span class="muted">Content: ${st.resId || 'WALKIN'} DEPOSIT</span></div></div>`;
    }
    /* Step 8 — confirm */
    function stepConfirm() {
      const room = H.room(st.roomId);
      const n = H.nights(today, st.checkOut);
      const g = st.guest;
      const svc = Object.keys(st.services).map((id) => ({ s: D().services.find((x) => x.id === id), q: st.services[id] }));
      return `<div class="grid grid-2">
        <dl class="dl"><dt>Guest</dt><dd>${U.esc(g.name)}</dd><dt>${U.esc(g.idType)}</dt><dd>${U.esc(g.idNumber)}</dd><dt>Nationality</dt><dd>${U.esc(g.nationality)}</dd><dt>Phone</dt><dd>${U.esc(g.phone)}</dd>${st.extraGuests ? `<dt>With</dt><dd>${U.esc(st.extraGuests).replace(/\n/g, '<br>')}</dd>` : ''}</dl>
        <dl class="dl"><dt>Room</dt><dd>${room.number} · ${H.typeName(room.typeId)}</dd><dt>Stay</dt><dd>${U.fmtDate(today)} → ${U.fmtDate(st.checkOut)} (${n} nights)</dd><dt>Rate</dt><dd>${U.money(st.rate)} · ${H.plan(st.plan).name}</dd><dt>Pax</dt><dd>${st.adults} adults${st.children ? `, ${st.children} children` : ''}</dd>
        <dt>Extras</dt><dd>${svc.length ? svc.map((x) => `${U.esc(x.s.name)} × ${x.q}`).join('<br>') : 'None'}</dd><dt>Deposit</dt><dd>${st.deposit ? `${U.money(st.deposit)} · ${st.method}` : 'None'}</dd></dl></div>
        ${st.requests ? `<div class="form-note mt-2"><strong>Requests:</strong> ${U.esc(st.requests)}</div>` : ''}`;
    }
    function stepDone() {
      const r = H.res(st.resId), room = H.room(r.roomId), g = H.guest(r.guestId);
      return `<div style="text-align:center;padding:10px 0 18px"><div class="empty-ico" style="width:56px;height:56px;margin:0 auto 12px;border-radius:50%;display:grid;place-items:center;background:var(--success-soft);color:var(--success)">${icon('check')}</div>
        <h3 style="font-size:1.3rem">Checked in to room ${room.number}</h3><p class="muted">${U.esc(g.name)} · ${U.fmtDate(r.checkIn)} → ${U.fmtDate(r.checkOut)} · ${H.nights(r.checkIn, r.checkOut)} nights</p></div>
        <div class="card"><div class="card-body"><h4 class="mb-1">Registration card · ${r.id}</h4><dl class="dl">
          <dt>Guest</dt><dd>${U.esc(g.name)} (${U.esc(g.nationality)})</dd><dt>${U.esc(g.idType)}</dt><dd>${U.esc(g.idNumber)}</dd><dt>Room</dt><dd>${room.number} · ${H.typeName(room.typeId)} · floor ${room.floor}</dd>
          <dt>Rate</dt><dd>${U.money(r.rate)} per night, ${H.plan(r.ratePlan).name}</dd><dt>Wi-Fi</dt><dd>Sunrise_Guest · password ${room.number}sunrise</dd><dt>Breakfast</dt><dd>06:00–10:00, Han River Kitchen, level 2</dd>
          <dt>Check-out</dt><dd>${U.fmtDate(r.checkOut)} by ${D().settings.checkOutTime}</dd><dt>Balance</dt><dd>${U.money(H.folio(r).balance)}</dd></dl>
          <p class="small muted mt-2">Two key cards encoded for room ${room.number}. Signature: ______________________</p></div></div>`;
    }

    function readStep() {
      const root = box.querySelector('#wz-step');
      const s = st.step;
      if (s === 1) { const t = root.querySelector('#wz-extra'); st.extraGuests = t ? t.value.trim() : ''; }
      if (s === 2) st.guest = UI.readForm(root);
      if (s === 4) { const v = UI.readForm(root); st.plan = v.plan; st.rate = Number(v.rate); st.adults = v.adults; st.children = v.children || 0; st.promo = v.promo.toUpperCase(); st.requests = v.requests; }
      if (s === 5) { st.services = {}; U.qsa('[data-svc]', root).forEach((c) => { if (c.checked) st.services[c.dataset.svc] = Math.max(1, Number(root.querySelector(`[data-qty="${c.dataset.svc}"]`).value) || 1); }); }
      if (s === 6) { const v = UI.readForm(root); st.deposit = Number(v.deposit) || 0; st.method = v.method; st.depRef = v.depRef; }
    }
    function next() {
      const root = box.querySelector('#wz-step');
      const s = st.step;
      if (s === 1 && st.walkIn && !st.guestId) return UI.toast('Select a guest or choose New guest.', 'warn');
      if (s === 2 && !UI.validate(root)) return;
      if (s === 3 && !st.roomId) return UI.toast('Select a room to continue.', 'warn');
      if (s === 4) {
        if (!UI.validate(root)) return;
        readStep();
        const room = H.room(st.roomId);
        if (st.adults > room.capacity + 1) return UI.toast(`Room ${room.number} sleeps ${room.capacity} (+1 extra bed).`, 'error');
        const n = H.nights(today, st.checkOut);
        const p = H.applyPromo(st.promo, { typeId: room.typeId, nights: n, roomCharge: st.rate * n });
        if (p.error) { draw(); return UI.toast(p.error, 'error'); }
        st.discount = p.amount || 0;
      } else readStep();
      if (s === 6 && st.deposit < 0) return UI.toast('Deposit cannot be negative.', 'error');
      if (s === 7) return finish();
      st.step = s + 1;
      draw();
    }
    function finish() {
      try {
        const g = st.guest;
        let guestId = st.guestId;
        if (guestId === 'NEW') guestId = H.createGuest(g).id;
        const patch = { name: g.name, gender: g.gender, dob: g.dob, nationality: g.nationality, phone: g.phone, idType: g.idType, idNumber: g.idNumber, email: g.email, address: g.address };
        let resId = st.resId;
        const room = H.room(st.roomId);
        if (st.walkIn) {
          const r = H.createReservation({ guestId, roomId: '', roomTypeId: room.typeId, checkIn: today, checkOut: st.checkOut, adults: st.adults, children: st.children, source: 'Walk-in', ratePlan: st.plan, rate: st.rate, promoCode: st.promo, discount: st.discount, specialRequests: st.requests, status: 'Confirmed' });
          resId = r.id;
        } else {
          const r = H.res(resId);
          const typeChanged = r.roomTypeId !== room.typeId;
          Object.assign(r, { ratePlan: st.plan, rate: st.rate, adults: st.adults, children: st.children, promoCode: st.promo, discount: st.discount });
          if (typeChanged) r.roomTypeId = room.typeId;
        }
        const services = Object.keys(st.services).map((id) => { const s = D().services.find((x) => x.id === id); return { category: s.category === 'F&B' ? 'F&B' : s.category, description: s.name, qty: st.services[id], unitPrice: s.price }; });
        H.checkIn(resId, { roomId: st.roomId, guestPatch: patch, deposit: st.deposit, depositMethod: st.method, services: [], extraGuests: st.extraGuests, requests: st.requests });
        services.forEach((s) => H.postCharge(resId, s));
        if (st.depRef) { const p = D().payments.filter((x) => x.reservationId === resId).pop(); if (p) p.reference = st.depRef; }
        st.resId = resId;
        st.step = 8;
        m.setTitle('Check-in complete');
        draw();
        UI.toast(`${g.name} checked in to room ${room.number}`);
        refreshView();
      } catch (err) { UI.toast(err.message, 'error'); }
    }

    function bind() {
      const root = box.querySelector('#wz-step');
      const q = root.querySelector('#wz-q');
      if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); q.oninput = U.debounce(() => { st.q = q.value; draw(); }, 200); }
      const gq = root.querySelector('#wz-gq');
      if (gq) { gq.oninput = U.debounce(() => { st.q = gq.value; readStep(); draw(); const x = box.querySelector('#wz-gq'); x.focus(); x.setSelectionRange(x.value.length, x.value.length); }, 250); }
      root.onclick = (e) => {
        const rs = e.target.closest('[data-res]');
        if (rs) { setRes(rs.dataset.res); st.q = ''; st.step = 1; draw(); return; }
        if (e.target.closest('[data-walkin]')) { st.walkIn = true; st.resId = null; st.guestId = ''; st.q = ''; st.step = 1; m.setTitle('Walk-in check-in'); draw(); return; }
        const gp = e.target.closest('[data-guest]');
        if (gp) { readStep(); st.guestId = gp.dataset.guest; st.guest = {}; draw(); return; }
        const pk = e.target.closest('[data-pick]');
        if (pk) { st.roomId = pk.dataset.pick; draw(); }
      };
      const ty = root.querySelector('#wz-type');
      if (ty) ty.onchange = () => { st.typeId = ty.value; st.roomId = ''; st.rateFor = 'x'; draw(); };
      const co = root.querySelector('#wz-co');
      if (co) co.onchange = () => { if (co.value > today) { st.checkOut = co.value; draw(); } };
      const plan = root.querySelector('[name=plan]');
      if (plan) plan.onchange = () => { readStep(); st.rateFor = 'x'; draw(); };
      const promo = root.querySelector('[name=promo]');
      if (promo) promo.onchange = () => { readStep(); draw(); };
      const meth = root.querySelector('[name=method]');
      if (meth) { meth.onchange = () => { st.method = meth.value; root.querySelector('#wz-qr').hidden = !['QR Payment', 'Bank Transfer'].includes(meth.value); }; }
    }
    draw();
  }

  function groupCheckIn(groupId) {
    const today = U.today();
    const list = D().reservations.filter((r) => r.groupId === groupId && r.checkIn <= today && ['Confirmed', 'Pending'].includes(r.status));
    if (!list.length) return UI.toast('All rooms in this group are already checked in.', 'info');
    const rows = list.map((r) => { const room = H.room(r.roomId); const ok = room && H.READY.includes(room.status); return { r, room, ok }; });
    UI.modal({
      title: `Group check-in · ${list[0].groupName || groupId}`, size: 'lg',
      body: `<p class="small muted">Rooms that are not clean yet are skipped. Charges go to the master account of ${U.esc((H.customer(list[0].customerId) || {}).name || 'the group')}.</p>
        <div class="table-wrap"><table class="table compact"><thead><tr><th>Guest</th><th>Room</th><th>Room status</th><th>Result</th></tr></thead><tbody>
        ${rows.map((x) => `<tr><td class="cell-main">${U.esc(H.guestName(x.r.guestId))}</td><td>${x.r.roomId || '—'}</td><td>${x.room ? U.badge(x.room.status) : '—'}</td><td>${x.ok ? '<span class="badge tone-success">Ready</span>' : '<span class="badge tone-warn">Skip — not ready</span>'}</td></tr>`).join('')}</tbody></table></div>`,
      actions: [{ label: 'Cancel' }, { label: `Check in ${rows.filter((x) => x.ok).length} rooms`, kind: 'primary', onClick: () => {
        let n = 0;
        rows.filter((x) => x.ok).forEach((x) => { try { H.checkIn(x.r.id, {}); n++; } catch (e) { UI.toast(`${x.r.roomId}: ${e.message}`, 'error'); } });
        UI.toast(`${n} group rooms checked in`);
        refreshView();
      } }]
    });
  }

  function assignRoomDialog(resId) {
    const r = H.res(resId);
    const rooms = H.availableRooms(r.checkIn, r.checkOut, r.roomTypeId, r.id);
    UI.modal({
      title: `Assign room · ${H.guestName(r.guestId)}`, size: 'md',
      body: `<p class="small muted">${H.typeName(r.roomTypeId)} rooms free ${U.fmtDate(r.checkIn)} → ${U.fmtDate(r.checkOut)}.</p><div class="room-tiles">${rooms.map((x) => `<button type="button" class="room-tile" data-status="${x.status}" data-pick="${x.id}"><span class="rt-num">${x.number}</span><span class="rt-type">${x.view}</span><span class="rt-guest">${x.status}</span></button>`).join('') || UI.empty('No free rooms of this type', 'Change the room type on the reservation.')}</div>`,
      onMount: (ctx) => ctx.body.addEventListener('click', (e) => {
        const p = e.target.closest('[data-pick]');
        if (!p) return;
        try { H.updateReservation(r.id, { roomId: p.dataset.pick }); UI.toast(`Room ${p.dataset.pick} assigned to ${r.id}`); ctx.close(); refreshView(); }
        catch (err) { UI.toast(err.message, 'error'); }
      })
    });
  }

  /* =========================================================
     Check-out settlement
     ========================================================= */
  function checkOutDialog(resId) {
    const r = H.res(resId);
    if (!r || r.status !== 'Checked-in') return UI.toast('This guest is not checked in.', 'error');
    const g = H.guest(r.guestId);
    const cust = H.customer(r.customerId);
    const today = U.today();
    const early = r.checkOut > today;
    const coDate = early ? U.addDays(r.checkIn, Math.max(1, H.nights(r.checkIn, today))) : r.checkOut;
    let discount = r.discount || 0;
    const methods = H.PAY_METHODS().concat(cust && ['Corporate', 'Travel Agency'].includes(cust.type) ? ['City Ledger'] : []);
    const m = UI.modal({
      title: `Check-out · Room ${r.roomId}`, size: 'lg',
      body: `<div class="row-between mb-2"><div><div class="strong">${U.esc(g.name)}${U.vip(g)}</div><div class="small muted">${r.id} · ${U.fmtDate(r.checkIn)} → ${U.fmtDate(coDate)}${early ? ` <span class="badge tone-warn plain">Early departure (booked to ${U.fmtDate(r.checkOut)})</span>` : ''}</div></div>${cust ? `<span class="badge tone-info plain">${U.esc(cust.name)}</span>` : ''}</div>
        <div class="grid grid-2"><div class="folio" id="co-folio"></div>
        <div class="stack">
          <div class="field"><label for="co-disc">Discount (VND)</label><input type="number" id="co-disc" min="0" step="10000" value="${discount}"></div>
          <div class="field"><label for="co-method">Settle balance by</label><select id="co-method">${methods.map((x) => `<option>${x}</option>`).join('')}</select><small class="help">City Ledger bills the balance to the company account (accounts receivable).</small></div>
          <div class="field"><label for="co-ref">Reference</label><input id="co-ref" placeholder="Card approval code / transfer code"></div>
          <details><summary class="small strong" style="cursor:pointer">Red VAT invoice (company)</summary><div class="stack mt-1" style="gap:10px">
            <div class="field"><label for="co-co">Company name</label><input id="co-co" value="${cust && cust.type !== 'Partner' ? U.esc(cust.name) : ''}"></div>
            <div class="field"><label for="co-tax">Tax code (MST)</label><input id="co-tax" value="${cust && cust.type !== 'Partner' ? U.esc(cust.taxId) : ''}" pattern="[0-9\\-]{10,14}" title="10–14 digit Vietnamese tax code"></div></div></details>
          <div id="co-qr"></div>
        </div></div>`,
      actions: [{ label: 'Post a charge', onClick: () => { HMS.modules.billing.postChargeDialog(r.id, () => draw()); return false; }, keepOpen: true }, { spacer: true }, { label: 'Cancel' }, { label: 'Settle & check out', kind: 'primary', icon: 'check', onClick: (ctx) => {
        const tax = ctx.body.querySelector('#co-tax');
        if (!tax.checkValidity()) { tax.closest('details').open = true; tax.reportValidity(); return false; }
        try {
          const res = H.checkOut(r.id, { discount, method: ctx.body.querySelector('#co-method').value, reference: ctx.body.querySelector('#co-ref').value, buyerCompany: ctx.body.querySelector('#co-co').value.trim(), buyerTaxId: tax.value.trim() });
          UI.toast(`Room ${r.roomId} checked out · invoice ${res.invoiceId} issued. Room sent to housekeeping.`);
          refreshView();
          setTimeout(() => HMS.modules.billing.invoiceDialog(res.invoiceId), 60);
        } catch (err) { UI.toast(err.message, 'error'); return false; }
      } }]
    });
    function draw() {
      const f = H.folio(r, { checkOut: coDate, discount });
      const lines = Object.keys(f.byCat).map((c) => `<div class="folio-line"><span>${U.esc(c)}</span><span>${U.money(f.byCat[c])}</span></div>`).join('');
      m.body.querySelector('#co-folio').innerHTML = `
        <div class="folio-line"><span>Room charge · ${f.nights} × ${U.money(r.rate)}</span><span>${U.money(f.roomCharge)}</span></div>${lines}
        <div class="folio-line rule total"><span>Subtotal</span><span>${U.money(f.subtotal)}</span></div>
        ${f.service ? `<div class="folio-line"><span>Service charge ${D().settings.serviceCharge}%</span><span>${U.money(f.service)}</span></div>` : ''}
        <div class="folio-line"><span>VAT ${D().settings.vatRate}%</span><span>${U.money(f.vat)}</span></div>
        <div class="folio-line"><span>Discount${r.promoCode ? ' · ' + U.esc(r.promoCode) : ''}</span><span class="neg">-${U.money(f.discount)}</span></div>
        <div class="folio-line rule total"><span>Total</span><span>${U.money(f.total)}</span></div>
        <div class="folio-line"><span>Deposit & payments received</span><span class="neg">-${U.money(f.paid)}</span></div>
        ${f.ledger ? `<div class="folio-line"><span>City ledger</span><span>-${U.money(f.ledger)}</span></div>` : ''}
        <div class="folio-line grand"><span>${f.balance >= 0 ? 'Remaining balance' : 'Refund due to guest'}</span><span>${U.money(Math.abs(f.balance))}</span></div>`;
      const meth = m.body.querySelector('#co-method').value;
      m.body.querySelector('#co-qr').innerHTML = ['QR Payment', 'Bank Transfer'].includes(meth) && f.balance > 0 ? `<div class="row" style="align-items:flex-start;gap:12px">${HMS.modules.billing.qrSvg(f.balance)}<div class="small"><strong>Scan with any Vietnamese banking app</strong><br>${U.esc(D().settings.bankName)}<br>A/C ${U.esc(D().settings.bankAccount)}<br>Content: ${r.id}</div></div>` : '';
    }
    m.body.querySelector('#co-disc').addEventListener('input', (e) => { discount = Math.max(0, Number(e.target.value) || 0); draw(); });
    m.body.querySelector('#co-method').addEventListener('change', draw);
    draw();
  }

  function quickCheckOut() {
    const list = H.inHouse().sort((a, b) => a.checkOut.localeCompare(b.checkOut) || a.roomId.localeCompare(b.roomId));
    UI.modal({
      title: 'Quick check-out', size: 'md',
      body: `<label class="search-input mb-2" style="width:100%">${icon('search')}<input type="search" id="qco" placeholder="Room number or guest name" style="width:100%;height:40px"></label><div class="select-list" id="qco-list"></div>`,
      onMount: (ctx) => {
        const drawList = (q = '') => { ctx.body.querySelector('#qco-list').innerHTML = list.filter((r) => `${r.roomId} ${H.guestName(r.guestId)}`.toLowerCase().includes(q.toLowerCase())).slice(0, 30).map((r) => `<button type="button" class="select-card" data-r="${r.id}"><span class="avatar sm">${r.roomId}</span><div class="grow"><div class="strong">${U.esc(H.guestName(r.guestId))}</div><div class="small muted">Due out ${U.fmtDate(r.checkOut)} · balance ${U.money(H.folio(r).balance)}</div></div></button>`).join('') || UI.empty('No in-house guest found', ''); };
        drawList();
        ctx.body.querySelector('#qco').addEventListener('input', (e) => drawList(e.target.value));
        ctx.body.addEventListener('click', (e) => { const b = e.target.closest('[data-r]'); if (b) { ctx.close(); checkOutDialog(b.dataset.r); } });
      }
    });
  }

  /* ---------- Transfer / extend / late check-out / notes ---------- */
  function transferDialog(resId) {
    const r = H.res(resId);
    const from = r.status === 'Checked-in' ? U.today() : r.checkIn;
    const opts = H.availableRooms(from, r.checkOut, '', r.id, { readyNow: r.status === 'Checked-in' }).filter((x) => x.id !== r.roomId);
    UI.modal({
      title: `Room transfer · ${H.guestName(r.guestId)}`, size: 'md',
      body: `<p class="small muted">Currently in room ${r.roomId} (${H.typeName(r.roomTypeId)}). Showing clean rooms free until ${U.fmtDate(r.checkOut)}.</p>` + UI.form([
        { name: 'roomId', label: 'Move to room', type: 'select', required: true, placeholder: 'Select a room', options: opts.map((x) => ({ value: x.id, label: `${x.number} · ${H.typeName(x.typeId)} · ${x.view} · ${x.status}` })) },
        { name: 'keepRate', label: 'Keep current rate (complimentary upgrade)', type: 'checkbox', value: true },
        { name: 'reason', label: 'Reason', type: 'select', options: ['Guest request', 'Maintenance issue', 'Complimentary upgrade', 'Noise complaint', 'Group consolidation'], span: 2 }
      ]),
      actions: [{ label: 'Cancel' }, { label: 'Transfer guest', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        try {
          H.transferRoom(r.id, v.roomId, v.reason);
          if (!v.keepRate) { r.rate = H.rateFor(H.room(v.roomId).typeId, r.ratePlan, v.roomId); HMS.store.commit(); }
          UI.toast(`Moved to room ${v.roomId}. Room ${r.transfers.slice(-1)[0].from} sent to housekeeping.`);
          refreshView();
        } catch (err) { UI.toast(err.message, 'error'); return false; }
      } }]
    });
  }
  function extendDialog(resId) {
    const r = H.res(resId);
    UI.modal({
      title: `Change departure · Room ${r.roomId || '—'}`, size: 'sm',
      body: UI.form([{ name: 'checkOut', label: 'New check-out date', type: 'date', required: true, min: U.addDays(r.checkIn, 1), value: U.addDays(r.checkOut, 1), span: 2 }]) + `<p class="small muted mt-1">Current: ${U.fmtDate(r.checkOut)} · ${U.money(r.rate)} per night.</p><p class="small" id="ext-info"></p>`,
      onMount: (ctx) => {
        const inp = ctx.body.querySelector('[name=checkOut]');
        const upd = () => { const n = H.nights(r.checkOut, inp.value); const free = !r.roomId || H.conflicts(r.roomId, r.checkIn, inp.value, r.id).length === 0; ctx.body.querySelector('#ext-info').innerHTML = `${n >= 0 ? `+${n} night(s), ${U.money(n * r.rate)}` : `${n} night(s)`} · ${free ? '<span style="color:var(--success)">Room is free</span>' : '<span style="color:var(--danger)">Room is booked on these dates</span>'}`; };
        inp.addEventListener('input', upd); upd();
      },
      actions: [{ label: 'Cancel' }, { label: 'Save new date', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        try { H.extendStay(r.id, UI.readForm(ctx.body).checkOut); UI.toast(`Departure changed to ${U.fmtDate(r.checkOut)}`); refreshView(); }
        catch (err) { UI.toast(err.message, 'error'); return false; }
      } }]
    });
  }
  function lateCheckoutDialog(resId) {
    const r = H.res(resId);
    const svc = D().services.find((s) => s.name.startsWith('Late check-out'));
    const nextRes = r.roomId && H.arrivalFor(r.roomId, r.checkOut);
    UI.modal({
      title: `Late check-out · Room ${r.roomId}`, size: 'sm',
      body: `${nextRes ? `<div class="alert warn mb-2">${icon('alert')}<p>Room ${r.roomId} has an arrival on ${U.fmtDate(r.checkOut)} (${nextRes.id}). Housekeeping will have less time.</p></div>` : ''}` + UI.form([
        { name: 'time', label: 'Leave by', type: 'select', options: ['14:00', '16:00', '18:00'], value: '18:00' },
        { name: 'fee', label: 'Fee (VND)', type: 'number', min: 0, step: 10000, value: svc ? svc.price : 600000 }
      ]),
      actions: [{ label: 'Cancel' }, { label: 'Approve late check-out', kind: 'primary', onClick: (ctx) => {
        const v = UI.readForm(ctx.body);
        try {
          r.lateCheckout = v.time;
          if (v.fee > 0) H.postCharge(r.id, { category: 'Room', description: `Late check-out until ${v.time}`, qty: 1, unitPrice: v.fee });
          else HMS.store.commit();
          UI.toast(`Late check-out until ${v.time} approved`);
          refreshView();
        } catch (err) { UI.toast(err.message, 'error'); return false; }
      } }]
    });
  }
  function notesDialog(resId) {
    const r = H.res(resId), g = H.guest(r.guestId);
    UI.modal({
      title: `Notes · ${g.name}`, size: 'md',
      body: UI.form([
        { name: 'specialRequests', label: 'Special requests (this stay)', type: 'textarea', span: 2 },
        { name: 'notes', label: 'Internal note (this stay)', type: 'textarea', span: 2 },
        { name: 'guestNotes', label: 'Guest profile note (all stays)', type: 'textarea', span: 2 }
      ], { specialRequests: r.specialRequests, notes: r.notes, guestNotes: g.notes }),
      actions: [{ label: 'Cancel' }, { label: 'Save notes', kind: 'primary', onClick: (ctx) => { const v = UI.readForm(ctx.body); r.specialRequests = v.specialRequests; r.notes = v.notes; g.notes = v.guestNotes; HMS.store.commit(); UI.toast('Notes saved'); refreshView(); } }]
    });
  }

  function refreshView() {
    const cur = HMS.app.current;
    if (cur === 'frontdesk') { const t = HMS.app.params[0] || 'arrivals'; render(document.getElementById('view'), [t]); }
    else if (['dashboard', 'calendar', 'rooms', 'reservations', 'housekeeping', 'guests', 'billing'].includes(cur)) HMS.app.refresh();
  }

  let NAT;
  function NATIONALITIES() {
    if (!NAT) NAT = ['Vietnam', 'South Korea', 'Japan', 'China', 'Taiwan', 'Singapore', 'Thailand', 'Malaysia', 'Australia', 'United States', 'United Kingdom', 'France', 'Germany', 'Russia', 'India', 'Canada', 'Other'];
    return NAT;
  }

  HMS.modules.frontdesk = { title: 'Front Desk', render, checkInWizard, checkOutDialog, transferDialog, extendDialog, roomActions, assignRoomDialog, notesDialog, lateCheckoutDialog, refreshView, NATIONALITIES };
})();
