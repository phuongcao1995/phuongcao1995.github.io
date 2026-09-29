/* Reservations: list, create/modify, confirm, cancel, no-show */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;
  let table;

  function render(el, params) {
    const d = D();
    const today = U.today();
    const upcoming = d.reservations.filter((r) => r.checkIn >= today && ['Confirmed', 'Pending'].includes(r.status));
    const pending = d.reservations.filter((r) => r.status === 'Pending' && r.checkIn >= today);
    const last30 = d.reservations.filter((r) => r.createdAt >= U.addDays(today, -30));
    const cxl = last30.filter((r) => r.status === 'Cancelled').length;
    el.innerHTML = `${UI.pageHead({ title: 'Reservations', sub: 'All bookings across direct, OTA, agency and corporate channels', crumbs: [{ label: 'Reservations' }],
      actions: `<a class="btn" href="#/calendar">${icon('calendar')}Calendar</a><button class="btn btn-primary" data-a="new">${icon('plus')}New reservation</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Upcoming bookings', value: upcoming.length, meta: `${U.sum(upcoming, (r) => H.nights(r.checkIn, r.checkOut))} room nights on the books` })}
        ${UI.kpi({ label: 'Awaiting confirmation', value: pending.length, meta: 'Pending status' })}
        ${UI.kpi({ label: 'Booked in last 30 days', value: last30.length, meta: `${U.money(U.sum(last30.filter((r) => r.status !== 'Cancelled'), (r) => r.rate * H.nights(r.checkIn, r.checkOut)))} room revenue` })}
        ${UI.kpi({ label: 'Cancellation rate (30 days)', value: U.pct(last30.length ? (cxl / last30.length) * 100 : 0), meta: `${cxl} cancelled` })}
      </div>
      <div id="res-table"></div>`;
    el.querySelector('[data-a=new]').onclick = () => openForm();
    table = UI.dataTable(el.querySelector('#res-table'), {
      rows: () => d.reservations.slice().reverse(),
      searchPlaceholder: 'Booking no., guest, phone, room, OTA ref',
      searchText: (r) => { const g = H.guest(r.guestId) || {}; return `${r.id} ${g.name} ${g.phone} ${r.roomId} ${r.otaRef || ''} ${r.source} ${r.groupName || ''}`; },
      filters: [
        { key: 'status', label: 'Status', options: H.RES_STATUSES },
        { key: 'source', label: 'Source', options: HMS.REF.SOURCES },
        { key: 'roomTypeId', label: 'Room type', options: d.roomTypes.map((t) => ({ value: t.id, label: t.name })) },
        { key: 'pay', label: 'Payment', options: ['Paid', 'Partially Paid', 'Unpaid', 'City Ledger'], match: (r, v) => H.paymentStatus(r) === v }
      ],
      dateRange: { key: 'checkIn', label: 'Check-in' },
      exportName: 'reservations', sort: 'checkIn', dir: 'desc',
      columns: [
        { key: 'id', label: 'Booking', render: (r) => `<div class="cell-main">${r.id}</div><div class="cell-sub">${U.fmtDate(r.createdAt)}${r.otaRef ? ' · ' + r.otaRef : ''}</div>` },
        { key: 'guest', label: 'Guest', render: (r) => { const g = H.guest(r.guestId) || {}; return `<div class="cell-main">${U.esc(g.name)}${U.vip(g)}</div><div class="cell-sub">${U.esc(g.phone)}</div>`; }, sortValue: (r) => H.guestName(r.guestId), csv: (r) => H.guestName(r.guestId) },
        { key: 'checkIn', label: 'Check-in', render: (r) => U.fmtDate(r.checkIn) },
        { key: 'checkOut', label: 'Check-out', render: (r) => U.fmtDate(r.checkOut) },
        { key: 'nights', label: 'Nights', align: 'right', render: (r) => H.nights(r.checkIn, r.checkOut), sortValue: (r) => H.nights(r.checkIn, r.checkOut), csv: (r) => H.nights(r.checkIn, r.checkOut) },
        { key: 'roomId', label: 'Room', render: (r) => `${r.roomId ? `<span class="cell-main">${r.roomId}</span>` : '<span class="badge tone-warn plain">Unassigned</span>'}<div class="cell-sub">${H.typeName(r.roomTypeId)}</div>`, csv: (r) => r.roomId },
        { key: 'source', label: 'Source' },
        { key: 'amount', label: 'Room total', align: 'right', render: (r) => U.money(r.rate * H.nights(r.checkIn, r.checkOut)), sortValue: (r) => r.rate * H.nights(r.checkIn, r.checkOut), csv: (r) => r.rate * H.nights(r.checkIn, r.checkOut) },
        { key: 'pay', label: 'Payment', render: (r) => { const s = H.paymentStatus(r); return s === '—' ? '<span class="muted">—</span>' : U.badge(s); }, sort: false, csv: (r) => H.paymentStatus(r) },
        { key: 'status', label: 'Status', render: (r) => U.badge(r.status) }
      ],
      rowActions: (r) => `${['Pending', 'Confirmed'].includes(r.status) ? `<button class="icon-btn sm" data-act="edit" aria-label="Edit">${icon('edit')}</button>` : ''}<button class="btn btn-xs" data-act="view">View</button>`,
      onAction: (a, r) => { if (a === 'edit') openForm(r.id); else detail(r.id); },
      onRowClick: (r) => detail(r.id)
    });
    if (params[0]) { const id = params[0]; history.replaceState(null, '', '#/reservations'); HMS.app.params = []; setTimeout(() => detail(id), 0); }
  }

  /* ---------- Detail ---------- */
  function detail(id) {
    const r = H.res(id);
    if (!r) return UI.toast(`Reservation ${id} not found`, 'error');
    const g = H.guest(r.guestId);
    const f = H.folio(r);
    const cust = H.customer(r.customerId);
    const today = U.today();
    const acts = [];
    const btn = (k, label, kind) => acts.push(`<button class="btn btn-sm ${kind ? 'btn-' + kind : ''}" data-x="${k}">${label}</button>`);
    if (['Pending', 'Confirmed'].includes(r.status)) {
      btn('edit', 'Modify');
      if (!r.roomId) btn('assign', 'Assign room');
      if (r.status === 'Pending') btn('confirm', 'Confirm', 'soft');
      if (r.checkIn <= today && HMS.app.can('frontdesk')) btn('checkin', 'Check in', 'primary');
      if (r.checkIn <= today) btn('noshow', 'Mark no-show');
      btn('cancel', 'Cancel booking', 'danger');
    }
    if (r.status === 'Checked-in') { btn('transfer', 'Room transfer'); btn('extend', 'Extend stay'); btn('checkout', 'Check out', 'primary'); }
    UI.modal({
      title: `Reservation ${r.id}`, size: 'lg',
      body: `<div class="row-between mb-2"><div class="row"><span class="avatar">${U.initials(g.name)}</span><div><a class="strong" href="#/guests/${g.id}">${U.esc(g.name)}</a>${U.vip(g)}<div class="small muted">${U.esc(g.phone)} · ${U.esc(g.email)} · ${U.esc(g.nationality)}</div></div></div><div class="row">${U.badge(r.status)}${H.paymentStatus(r) !== '—' ? U.badge(H.paymentStatus(r)) : ''}</div></div>
        <div class="grid grid-2">
          <dl class="dl">
            <dt>Stay</dt><dd>${U.weekday(r.checkIn)} ${U.fmtDate(r.checkIn)} → ${U.weekday(r.checkOut)} ${U.fmtDate(r.checkOut)} · ${H.nights(r.checkIn, r.checkOut)} nights</dd>
            <dt>Room</dt><dd>${r.roomId ? `${r.roomId} · ` : 'Not assigned · '}${H.typeName(r.roomTypeId)}</dd>
            <dt>Guests</dt><dd>${r.adults} adults${r.children ? `, ${r.children} children` : ''}${r.extraGuests ? `<div class="small muted">${U.esc(r.extraGuests).replace(/\n/g, '<br>')}</div>` : ''}</dd>
            <dt>Rate</dt><dd>${U.money(r.rate)} / night · ${H.plan(r.ratePlan).name}</dd>
            <dt>Source</dt><dd>${r.source}${r.otaRef ? ` · ref ${r.otaRef}` : ''}${cust ? `<div class="small muted">${U.esc(cust.name)}</div>` : ''}</dd>
            ${r.groupName ? `<dt>Group</dt><dd>${U.esc(r.groupName)}</dd>` : ''}
            <dt>ETA</dt><dd>${r.eta || '—'}</dd>
            <dt>Requests</dt><dd>${U.esc(r.specialRequests || '—')}</dd>
            ${r.notes ? `<dt>Notes</dt><dd>${U.esc(r.notes)}</dd>` : ''}
            ${r.cancelReason ? `<dt>Cancelled</dt><dd>${U.esc(r.cancelReason)}</dd>` : ''}
          </dl>
          <div class="card"><div class="card-body folio">
            <div class="folio-line"><span>Room · ${f.nights} × ${U.money(r.rate)}</span><span>${U.money(f.roomCharge)}</span></div>
            <div class="folio-line"><span>Extras</span><span>${U.money(f.extras)}</span></div>
            <div class="folio-line"><span>VAT ${D().settings.vatRate}%</span><span>${U.money(f.vat)}</span></div>
            <div class="folio-line"><span>Discount${r.promoCode ? ' · ' + U.esc(r.promoCode) : ''}</span><span class="neg">-${U.money(f.discount)}</span></div>
            <div class="folio-line rule total"><span>Total</span><span>${U.money(f.total)}</span></div>
            <div class="folio-line"><span>Paid</span><span class="neg">-${U.money(f.paid)}</span></div>
            <div class="folio-line grand"><span>Balance</span><span>${U.money(f.balance)}</span></div>
            <button class="btn btn-sm btn-block mt-1" data-x="folio">Open full folio</button>
          </div></div>
        </div>
        <div class="timeline mt-2">
          <div class="tl-item">Created ${U.fmtDateTime(r.createdAt)}${r.createdBy ? ' by ' + U.esc(r.createdBy) : ''}<small>${r.source}</small></div>
          ${r.checkedInAt ? `<div class="tl-item">Checked in ${U.fmtDateTime(r.checkedInAt)}</div>` : ''}
          ${(r.transfers || []).map((t) => `<div class="tl-item">Moved ${t.from} → ${t.to}<small>${U.fmtDateTime(t.at)} · ${U.esc(t.reason || '')}</small></div>`).join('')}
          ${r.checkedOutAt ? `<div class="tl-item">Checked out ${U.fmtDateTime(r.checkedOutAt)}</div>` : ''}
          ${r.cancelledAt ? `<div class="tl-item">Cancelled ${U.fmtDateTime(r.cancelledAt)}</div>` : ''}
        </div>
        <div class="row mt-2">${acts.join('')}</div>`,
      onMount: (ctx) => ctx.body.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-x]');
        if (!b) return;
        const x = b.dataset.x;
        const FD = HMS.modules.frontdesk;
        if (x === 'confirm') { try { H.setReservationStatus(r.id, 'Confirmed'); UI.toast(`${r.id} confirmed`); ctx.close(); after(); } catch (err) { UI.toast(err.message, 'error'); } return; }
        if (x === 'noshow') {
          if (!(await UI.confirm({ title: 'Mark as no-show?', message: `${U.esc(g.name)} did not arrive. The room is released. Deposit is retained per policy.`, confirmLabel: 'Mark no-show', danger: true }))) return;
          try { H.setReservationStatus(r.id, 'No-show'); UI.toast(`${r.id} marked no-show`); ctx.close(); after(); } catch (err) { UI.toast(err.message, 'error'); }
          return;
        }
        if (x === 'cancel') { cancelDialog(r.id, () => { ctx.close(); after(); }); return; }
        ctx.close();
        if (x === 'edit') openForm(r.id);
        if (x === 'assign') FD.assignRoomDialog(r.id);
        if (x === 'checkin') FD.checkInWizard(r.id);
        if (x === 'transfer') FD.transferDialog(r.id);
        if (x === 'extend') FD.extendDialog(r.id);
        if (x === 'checkout') FD.checkOutDialog(r.id);
        if (x === 'folio') HMS.modules.billing.folioDialog(r.id);
      })
    });
  }
  function after() { if (HMS.app.current === 'reservations' && table) table.refresh(); else HMS.modules.frontdesk.refreshView(); }

  function cancelDialog(id, done) {
    const r = H.res(id);
    const paid = H.folio(r).paid;
    UI.modal({
      title: `Cancel ${r.id}`, size: 'sm',
      body: UI.form([
        { name: 'reason', label: 'Reason', type: 'select', options: ['Change of travel plans', 'Flight cancelled', 'Booked elsewhere', 'Illness', 'Duplicate booking', 'Other'], span: 2 },
        { name: 'refund', label: `Refund received deposit (${U.money(paid)})`, type: 'checkbox', value: r.ratePlan !== 'NRF' && paid > 0, span: 2, help: r.ratePlan === 'NRF' ? 'Non-refundable rate: normally no refund.' : '' }
      ]),
      actions: [{ label: 'Keep booking' }, { label: 'Cancel booking', kind: 'danger', onClick: (ctx) => {
        const v = UI.readForm(ctx.body);
        try {
          H.setReservationStatus(r.id, 'Cancelled', v.reason);
          if (v.refund && paid > 0) H.payments(r.id).filter((p) => p.amount > 0 && p.status === 'Paid').forEach((p) => H.refund(p.id, p.amount, 'Cancellation'));
          UI.toast(`${r.id} cancelled${v.refund && paid ? ' and deposit refunded' : ''}`);
          done && done();
        } catch (err) { UI.toast(err.message, 'error'); return false; }
      } }]
    });
  }

  /* ---------- Create / modify ---------- */
  function openForm(id, preset = {}) {
    const d = D();
    const r = id ? H.res(id) : null;
    const today = U.today();
    const v = r ? Object.assign({}, r) : Object.assign({ checkIn: today, checkOut: U.addDays(today, 2), roomTypeId: 'DLX', adults: 2, children: 0, ratePlan: 'BAR', source: 'Direct', status: 'Confirmed', eta: '14:00', depositMethod: 'Bank Transfer' }, preset);
    const guestLabel = (g) => `${g.name} · ${g.phone} (${g.id})`;
    const m = UI.modal({
      title: r ? `Modify ${r.id}` : 'New reservation', size: 'lg',
      body: `<datalist id="guest-dl">${d.guests.map((g) => `<option value="${U.esc(guestLabel(g))}">`).join('')}</datalist>
        <div class="form-grid">
          <h3 class="form-section span-2">Guest</h3>
          ${r ? `<div class="field span-2"><label>Guest</label><input readonly value="${U.esc(guestLabel(H.guest(r.guestId)))}"></div>` : `
          <div class="field span-2"><div class="btn-group" role="tablist"><button type="button" class="active" data-gm="existing">Existing guest</button><button type="button" data-gm="new">New guest</button></div></div>
          <div class="field span-2" data-g="existing"><label for="rf-guest">Search guest <span class="req">*</span></label><input id="rf-guest" list="guest-dl" placeholder="Type a name or phone number" autocomplete="off" value="${preset.guestId ? U.esc(guestLabel(H.guest(preset.guestId))) : ''}"></div>
          <div class="span-2" data-g="new" hidden>${UI.form([
            { name: 'g_name', label: 'Full name', placeholder: 'Nguyen Van An' }, { name: 'g_phone', label: 'Phone', type: 'tel', placeholder: '0905 123 456' },
            { name: 'g_email', label: 'Email', type: 'email' }, { name: 'g_nationality', label: 'Nationality', type: 'select', options: HMS.modules.frontdesk.NATIONALITIES(), value: 'Vietnam' }])}</div>`}
          <h3 class="form-section span-2">Stay</h3>
        </div>
        ${UI.form([
          { name: 'checkIn', label: 'Check-in', type: 'date', required: true, min: r && r.status === 'Checked-in' ? r.checkIn : today, readonly: r && r.status === 'Checked-in' },
          { name: 'checkOut', label: 'Check-out', type: 'date', required: true },
          { name: 'roomTypeId', label: 'Room type', type: 'select', options: d.roomTypes.map((t) => ({ value: t.id, label: `${t.name} · from ${U.moneyShort(t.rate)}` })) },
          { name: 'roomId', label: 'Room', type: 'select', options: [] },
          { name: 'adults', label: 'Adults', type: 'number', min: 1, max: 6, required: true },
          { name: 'children', label: 'Children', type: 'number', min: 0, max: 4 },
          { type: 'section', label: 'Rate & source' },
          { name: 'ratePlan', label: 'Rate plan', type: 'select', options: d.ratePlans.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name })) },
          { name: 'rate', label: 'Nightly rate (VND)', type: 'number', min: 0, step: 10000, required: true },
          { name: 'source', label: 'Booking source', type: 'select', options: HMS.REF.SOURCES },
          { name: 'customerId', label: 'Company / agency', type: 'select', placeholder: 'None', options: d.customers.filter((c) => c.type !== 'Individual').map((c) => ({ value: c.id, label: c.name })) },
          { name: 'promoCode', label: 'Promotion code', placeholder: 'e.g. EARLY30' },
          { name: 'status', label: 'Status', type: 'select', options: ['Confirmed', 'Pending'], disabled: r && r.status === 'Checked-in' },
          { type: 'section', label: 'Deposit & requests' },
          ...(r ? [] : [{ name: 'deposit', label: 'Deposit received (VND)', type: 'number', min: 0, step: 10000 }, { name: 'depositMethod', label: 'Deposit method', type: 'select', options: H.PAY_METHODS() }]),
          { name: 'eta', label: 'Estimated arrival', type: 'time' },
          { name: 'otaRef', label: 'OTA / external reference' },
          { name: 'specialRequests', label: 'Special requests', type: 'textarea', span: 2, rows: 2 },
          { name: 'notes', label: 'Internal notes', type: 'textarea', span: 2, rows: 2 }
        ], v)}
        <div class="form-note mt-2 folio" id="rf-sum"></div>
        <p class="form-error mt-1" id="rf-err" hidden></p>`,
      actions: [{ label: 'Cancel' }, { label: r ? 'Save changes' : 'Create reservation', kind: 'primary', onClick: () => save() }]
    });
    const b = m.body;
    const $ = (n) => b.querySelector(`[name=${n}]`);
    let guestMode = 'existing';
    let rateTouched = !!r;
    b.querySelectorAll('[data-gm]').forEach((btn) => btn.addEventListener('click', () => {
      guestMode = btn.dataset.gm;
      b.querySelectorAll('[data-gm]').forEach((x) => x.classList.toggle('active', x === btn));
      b.querySelector('[data-g=existing]').hidden = guestMode !== 'existing';
      b.querySelector('[data-g=new]').hidden = guestMode !== 'new';
    }));

    function refreshRooms() {
      const ci = $('checkIn').value, co = $('checkOut').value, type = $('roomTypeId').value;
      const sel = $('roomId');
      const keep = sel.value || v.roomId || '';
      let opts = [];
      if (ci && co && co > ci) opts = H.availableRooms(ci, co, type, r && r.id);
      if (r && r.status === 'Checked-in') opts = [H.room(r.roomId)];
      sel.innerHTML = `<option value="">Assign later (${opts.length} free)</option>` + opts.map((x) => `<option value="${x.id}" ${x.id === keep ? 'selected' : ''}>${x.number} · ${x.view} · ${x.status}</option>`).join('');
      if (keep && !opts.find((x) => x.id === keep)) sel.value = '';
    }
    function refreshRate() {
      if (rateTouched) return;
      $('rate').value = H.rateFor($('roomTypeId').value, $('ratePlan').value, $('roomId').value);
    }
    function summary() {
      const ci = $('checkIn').value, co = $('checkOut').value;
      const n = ci && co ? H.nights(ci, co) : 0;
      const rate = Number($('rate').value) || 0;
      const room = rate * n;
      const p = H.applyPromo($('promoCode').value.trim(), { typeId: $('roomTypeId').value, nights: n, roomCharge: room });
      const disc = p.amount || 0;
      const vat = Math.round(room * D().settings.vatRate / 100);
      b.querySelector('#rf-sum').innerHTML = n > 0 ? `
        <div class="folio-line"><span>${n} night${n > 1 ? 's' : ''} × ${U.money(rate)}</span><span>${U.money(room)}</span></div>
        <div class="folio-line"><span>VAT ${D().settings.vatRate}%</span><span>${U.money(vat)}</span></div>
        ${p.error ? `<div class="folio-line"><span style="color:var(--danger)">${U.esc(p.error)}</span><span></span></div>` : disc ? `<div class="folio-line"><span>Promotion ${U.esc(p.promo.code)} · ${U.esc(p.promo.name)}</span><span class="neg">-${U.money(disc)}</span></div>` : ''}
        <div class="folio-line rule total"><span>Estimated total (room only)</span><span>${U.money(room + vat - disc)}</span></div>` : '<span style="color:var(--danger)">Check-out date must be after the check-in date.</span>';
      return { n, disc, p };
    }
    ['checkIn', 'checkOut', 'roomTypeId'].forEach((n) => $(n).addEventListener('change', () => {
      if (n === 'checkIn' && $('checkOut').value <= $('checkIn').value) $('checkOut').value = U.addDays($('checkIn').value, 1);
      if (n === 'roomTypeId') rateTouched = false;
      refreshRooms(); refreshRate(); summary();
    }));
    $('checkOut').min = U.addDays($('checkIn').value || today, 1);
    $('checkIn').addEventListener('change', () => { $('checkOut').min = U.addDays($('checkIn').value, 1); });
    $('ratePlan').addEventListener('change', () => { rateTouched = false; refreshRate(); summary(); });
    $('roomId').addEventListener('change', () => { refreshRate(); summary(); });
    $('rate').addEventListener('input', () => { rateTouched = true; summary(); });
    $('promoCode').addEventListener('input', summary);
    $('source').addEventListener('change', () => { const s = $('source').value; if (s === 'Corporate' && !rateTouched) { $('ratePlan').value = 'CORP'; refreshRate(); } if (['Booking.com', 'Agoda', 'Expedia'].includes(s) && !rateTouched) { $('ratePlan').value = 'OTA'; refreshRate(); } summary(); });
    refreshRooms(); if (!r) refreshRate(); summary();

    function save() {
      const err = b.querySelector('#rf-err');
      err.hidden = true;
      if (!UI.validate(b)) return false;
      const x = UI.readForm(b);
      let guestId = r ? r.guestId : '';
      if (!r) {
        if (guestMode === 'existing') {
          const val = b.querySelector('#rf-guest').value;
          const mm = val.match(/\((G\d+)\)\s*$/);
          const g = mm ? H.guest(mm[1]) : d.guests.find((gg) => gg.name.toLowerCase() === val.trim().toLowerCase());
          if (!g) { err.textContent = 'Select a guest from the list, or switch to New guest.'; err.hidden = false; return false; }
          guestId = g.id;
        } else if (!x.g_name || !x.g_phone) { err.textContent = 'Enter the new guest’s name and phone.'; err.hidden = false; return false; }
        else if (!/^(\+?\d[\d\s]{8,15})$/.test(x.g_phone)) { err.textContent = 'Enter a valid phone number, e.g. 0905 123 456.'; err.hidden = false; return false; }
      }
      const s = summary();
      if (s.p.error) { err.textContent = s.p.error; err.hidden = false; return false; }
      const data = { guestId: guestId || 'PENDING', checkIn: x.checkIn, checkOut: x.checkOut, roomTypeId: x.roomTypeId, roomId: x.roomId, adults: x.adults, children: x.children || 0, ratePlan: x.ratePlan, rate: x.rate, source: x.source, customerId: x.customerId, promoCode: x.promoCode.toUpperCase(), discount: s.disc, eta: x.eta, otaRef: x.otaRef, specialRequests: x.specialRequests, notes: x.notes };
      if (!(r && r.status === 'Checked-in')) data.status = x.status;
      const vErr = H.validateReservation(data, r);
      if (vErr) { err.textContent = vErr; err.hidden = false; return false; }
      try {
        if (!r && guestMode === 'new') data.guestId = H.createGuest({ name: x.g_name, phone: x.g_phone, email: x.g_email, nationality: x.g_nationality }).id;
        if (r) { H.updateReservation(r.id, data); UI.toast(`${r.id} updated`); }
        else {
          data.deposit = x.deposit; data.depositMethod = x.depositMethod;
          const nr = H.createReservation(data);
          UI.toast(`Reservation ${nr.id} created for ${H.guestName(nr.guestId)}${nr.roomId ? ` · room ${nr.roomId}` : ''}`);
        }
        refreshAfterSave();
      } catch (e2) { err.textContent = e2.message; err.hidden = false; return false; }
    }
  }
  function refreshAfterSave() {
    const cur = HMS.app.current;
    if (cur === 'reservations' && table) { HMS.app.refresh(); }
    else if (['calendar', 'dashboard', 'frontdesk', 'rooms', 'guests'].includes(cur)) HMS.modules.frontdesk.refreshView();
  }

  HMS.modules.reservations = { title: 'Reservations', render, openForm, detail, cancelDialog };
})();
