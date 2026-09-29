/* Reservation calendar: rooms × dates timeline.
   Drag a booking to another room/date to move it; click a
   block for details; click an empty cell to book. */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;
  const st = { start: null, days: 14, type: '', status: '', floor: '', q: '' };
  let drag = null;

  function render(el) {
    if (!st.start) st.start = U.addDays(U.today(), -2);
    const d = D();
    el.innerHTML = `${UI.pageHead({ title: 'Reservation calendar', sub: 'Drag a booking to move it to another room or date. Click an empty night to book it.', crumbs: [{ label: 'Calendar' }],
      actions: `<button class="btn btn-primary" data-a="new">${icon('plus')}New reservation</button>` })}
      <div class="card">
        <div class="cal-toolbar">
          <div class="row">
            <button class="icon-btn" data-nav="-7" aria-label="Previous week">${icon('chevron-left')}</button>
            <button class="btn btn-sm" data-nav="today">Today</button>
            <button class="icon-btn" data-nav="7" aria-label="Next week">${icon('chevron')}</button>
            <input type="date" class="input-sm" id="cal-start" value="${st.start}" aria-label="Start date" style="width:150px">
            <select class="select-sm" id="cal-days" aria-label="Days shown">${[7, 14, 21, 30].map((n) => `<option value="${n}" ${n === st.days ? 'selected' : ''}>${n} days</option>`).join('')}</select>
          </div>
          <div class="row">
            <select class="select-sm" id="cal-type" aria-label="Room type"><option value="">All room types</option>${d.roomTypes.map((t) => `<option value="${t.id}" ${st.type === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select>
            <select class="select-sm" id="cal-floor" aria-label="Floor"><option value="">All floors</option>${[...new Set(d.rooms.map((r) => r.floor))].map((f) => `<option ${String(st.floor) === String(f) ? 'selected' : ''}>${f}</option>`).join('')}</select>
            <select class="select-sm" id="cal-status" aria-label="Booking status"><option value="">All bookings</option>${['Pending', 'Confirmed', 'Checked-in', 'Checked-out'].map((s) => `<option ${st.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
          </div>
        </div>
        <div class="row small muted" style="padding:8px 14px;gap:14px;border-bottom:1px solid var(--line-2)">
          ${[['Pending', 'var(--warn)'], ['Confirmed', 'var(--info)'], ['Checked-in', 'var(--violet)'], ['Checked-out', 'var(--neutral)']].map((x) => `<span class="row" style="gap:6px"><i style="width:12px;height:12px;border-radius:3px;background:${x[1]};display:inline-block"></i>${x[0]}</span>`).join('')}
          <span class="row" style="gap:6px"><i style="width:12px;height:12px;border-radius:3px;background:repeating-linear-gradient(135deg,transparent,transparent 3px,var(--line) 3px,var(--line) 5px);display:inline-block;border:1px solid var(--line)"></i>Out of inventory</span>
          <span id="cal-occ" style="margin-left:auto"></span>
        </div>
        <div class="cal-scroll" id="cal-scroll"></div>
      </div>`;
    const $ = (s) => el.querySelector(s);
    el.onclick = (e) => {
      const n = e.target.closest('[data-nav]');
      if (n) { st.start = n.dataset.nav === 'today' ? U.addDays(U.today(), -2) : U.addDays(st.start, Number(n.dataset.nav)); $('#cal-start').value = st.start; draw(); }
      if (e.target.closest('[data-a=new]')) HMS.modules.reservations.openForm();
    };
    $('#cal-start').onchange = (e) => { if (e.target.value) { st.start = e.target.value; draw(); } };
    $('#cal-days').onchange = (e) => { st.days = Number(e.target.value); draw(); };
    $('#cal-type').onchange = (e) => { st.type = e.target.value; draw(); };
    $('#cal-floor').onchange = (e) => { st.floor = e.target.value; draw(); };
    $('#cal-status').onchange = (e) => { st.status = e.target.value; draw(); };
    draw();
  }

  function draw() {
    const box = document.getElementById('cal-scroll');
    if (!box) return;
    const d = D();
    const today = U.today();
    const dates = Array.from({ length: st.days }, (_, i) => U.addDays(st.start, i));
    const end = U.addDays(st.start, st.days);
    const rooms = d.rooms.filter((r) => (!st.type || r.typeId === st.type) && (!st.floor || String(r.floor) === String(st.floor)));
    const res = d.reservations.filter((r) => r.roomId && !['Cancelled', 'No-show'].includes(r.status) && r.checkIn < end && r.checkOut > st.start && (!st.status || r.status === st.status));
    const byRoom = U.groupBy(res, (r) => r.roomId);
    const sold = H.nightStats(today, true).sold;
    document.getElementById('cal-occ').textContent = `${rooms.length} rooms · tonight ${sold}/${d.rooms.length} sold`;
    const unassigned = d.reservations.filter((r) => !r.roomId && ['Confirmed', 'Pending'].includes(r.status) && r.checkIn < end && r.checkOut > st.start);

    const block = (r) => {
      const ci = U.diffDays(st.start, r.checkIn), co = U.diffDays(st.start, r.checkOut);
      let a = ci + 0.5, b = co + 0.5;
      const clipL = a < 0, clipR = b > st.days;
      a = Math.max(0, a); b = Math.min(st.days, b);
      if (b <= a) return '';
      const g = H.guest(r.guestId) || {};
      const movable = ['Pending', 'Confirmed', 'Checked-in'].includes(r.status);
      return `<button type="button" class="cal-block ${clipL ? 'clip-l' : ''} ${clipR ? 'clip-r' : ''}" data-res="${r.id}" data-status="${r.status}" ${movable ? 'draggable="true"' : ''}
        style="left:calc(var(--room-w) + var(--day-w) * ${a} + 2px);width:calc(var(--day-w) * ${b - a} - 4px)"
        title="${U.esc(g.name)} · ${r.id} · ${U.fmtDate(r.checkIn)} → ${U.fmtDate(r.checkOut)} · ${r.status}">
        ${g.vip ? '★ ' : ''}<span>${U.esc(g.name)}</span><small>${H.nights(r.checkIn, r.checkOut)}n</small></button>`;
    };

    box.innerHTML = `<div class="cal-grid" style="--days:${st.days}">
      <div class="cal-head"><div>Room</div>${dates.map((x) => `<div class="${U.isWeekend(x) ? 'is-weekend' : ''} ${x === today ? 'is-today' : ''}">${U.weekday(x)}<span class="d-num">${U.dayLabel(x)}</span></div>`).join('')}</div>
      ${rooms.map((room) => {
        const blocked = H.isBlocked(room);
        return `<div class="cal-row ${blocked ? 'blocked' : ''}" data-room="${room.id}">
          <div class="cal-room"><strong><i class="st-dot" style="background:var(--st-${{ 'Out of Order': 'ooo', 'Out of Service': 'oos' }[room.status] || room.status.toLowerCase()})"></i>${room.number}</strong><small>${H.typeName(room.typeId)}${blocked ? ' · ' + room.status : ''}</small></div>
          ${dates.map((x) => `<div class="cal-cell ${U.isWeekend(x) ? 'is-weekend' : ''} ${x === today ? 'is-today' : ''}" data-date="${x}"></div>`).join('')}
          ${(byRoom[room.id] || []).map(block).join('')}
        </div>`;
      }).join('') || `<div style="padding:30px">${UI.empty('No rooms match these filters', '')}</div>`}
    </div>
    ${unassigned.length ? `<div class="alert warn" style="margin:12px">${icon('alert')}<p><strong>${unassigned.length} bookings</strong> in this period have no room yet: ${unassigned.slice(0, 6).map((r) => `<button class="link-btn" data-assign="${r.id}">${r.id} (${H.typeName(r.roomTypeId)}, ${U.fmtDate(r.checkIn)})</button>`).join(', ')}${unassigned.length > 6 ? '…' : ''}</p></div>` : ''}`;
    bind(box, dates);
  }

  function bind(box, dates) {
    const dayW = () => { const c = box.querySelector('.cal-cell'); return c ? c.getBoundingClientRect().width : 96; };
    box.onclick = (e) => {
      const as = e.target.closest('[data-assign]');
      if (as) return HMS.modules.frontdesk.assignRoomDialog(as.dataset.assign);
      const b = e.target.closest('.cal-block');
      if (b) return blockPopup(b.dataset.res);
      const cell = e.target.closest('.cal-cell');
      if (cell) {
        const room = H.room(cell.closest('.cal-row').dataset.room);
        const date = cell.dataset.date;
        if (date < U.today()) return UI.toast('Past nights cannot be booked.', 'warn');
        if (H.isBlocked(room)) return UI.toast(`Room ${room.number} is ${room.status} and cannot be reserved.`, 'warn');
        if (!H.isFree(room.id, date, U.addDays(date, 1))) return;
        HMS.modules.reservations.openForm(null, { roomId: room.id, roomTypeId: room.typeId, checkIn: date, checkOut: U.addDays(date, 2) });
      }
    };
    box.ondragstart = (e) => {
      const b = e.target.closest('.cal-block');
      if (!b) return;
      const r = H.res(b.dataset.res);
      const rect = b.getBoundingClientRect();
      const startFrac = U.diffDays(st.start, r.checkIn) + 0.5 < 0 ? -(U.diffDays(st.start, r.checkIn) + 0.5) : 0;
      const rel = Math.floor(0.5 + startFrac + (e.clientX - rect.left) / dayW());
      drag = { id: r.id, rel, nights: H.nights(r.checkIn, r.checkOut), key: '' };
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', r.id); } catch (err) { /* old browsers */ }
      setTimeout(() => b.classList.add('dragging'), 0);
    };
    box.ondragend = () => { drag = null; U.qsa('.drop-ok, .drop-bad, .dragging', box).forEach((x) => x.classList.remove('drop-ok', 'drop-bad', 'dragging')); };
    const target = (cell) => {
      const room = cell.closest('.cal-row').dataset.room;
      const r = H.res(drag.id);
      const ci = r.status === 'Checked-in' ? r.checkIn : U.addDays(cell.dataset.date, -drag.rel);
      return { room, ci, co: U.addDays(ci, drag.nights), r };
    };
    box.ondragover = (e) => {
      const cell = e.target.closest('.cal-cell') || (e.target.closest('.cal-block') && null);
      if (!drag || !cell) return;
      e.preventDefault();
      const t = target(cell);
      const key = t.room + t.ci;
      if (key === drag.key) return;
      drag.key = key;
      U.qsa('.drop-ok, .drop-bad', box).forEach((x) => x.classList.remove('drop-ok', 'drop-bad'));
      const ok = (t.r.status === 'Checked-in' || t.ci >= U.today()) && H.isFree(t.room, t.r.status === 'Checked-in' ? U.today() : t.ci, t.co, t.r.id);
      const row = cell.closest('.cal-row');
      U.qsa('.cal-cell', row).forEach((c) => { if (c.dataset.date >= t.ci && c.dataset.date < t.co) c.classList.add(ok ? 'drop-ok' : 'drop-bad'); });
      drag.ok = ok;
    };
    box.ondrop = async (e) => {
      const cell = e.target.closest('.cal-cell');
      if (!drag || !cell) return;
      e.preventDefault();
      const t = target(cell);
      const info = drag;
      box.ondragend();
      if (t.room === t.r.roomId && t.ci === t.r.checkIn) return;
      const room = H.room(t.room);
      const typeChange = room.typeId !== t.r.roomTypeId;
      const ok = await UI.confirm({ title: 'Move reservation?', confirmLabel: 'Move booking',
        message: `Move <strong>${t.r.id}</strong> (${U.esc(H.guestName(t.r.guestId))}) to room <strong>${room.number}</strong>, ${U.fmtDate(t.ci)} → ${U.fmtDate(t.co)}?${typeChange ? `<br><br>Room type changes to ${H.typeName(room.typeId)}; ${t.r.status === 'Checked-in' ? 'rate is kept (complimentary).' : 'the rate will be recalculated.'}` : ''}` });
      if (!ok) return;
      try { H.moveReservation(info.id, t.room, t.ci); UI.toast(`${t.r.id} moved to room ${room.number}`); draw(); }
      catch (err) { UI.toast(err.message, 'error'); }
    };
  }

  function blockPopup(id) {
    const r = H.res(id);
    const g = H.guest(r.guestId);
    const f = H.folio(r);
    const movable = ['Pending', 'Confirmed', 'Checked-in'].includes(r.status);
    UI.modal({
      title: `${g.name} · ${r.id}`, size: 'sm',
      body: `<div class="row mb-2">${U.badge(r.status)}${U.badge(H.paymentStatus(r))}</div>
        <dl class="dl"><dt>Room</dt><dd>${r.roomId} · ${H.typeName(r.roomTypeId)}</dd><dt>Stay</dt><dd>${U.fmtDate(r.checkIn)} → ${U.fmtDate(r.checkOut)} (${H.nights(r.checkIn, r.checkOut)}n)</dd><dt>Pax</dt><dd>${r.adults}A${r.children ? ' ' + r.children + 'C' : ''}</dd><dt>Source</dt><dd>${r.source}</dd><dt>Balance</dt><dd>${U.money(f.balance)}</dd>${r.specialRequests ? `<dt>Requests</dt><dd>${U.esc(r.specialRequests)}</dd>` : ''}</dl>`,
      actions: [
        { label: 'Details', onClick: () => setTimeout(() => HMS.modules.reservations.detail(r.id), 30) },
        ...(movable ? [{ label: 'Transfer room', onClick: () => setTimeout(() => HMS.modules.frontdesk.transferDialog(r.id), 30) }, { label: 'Extend stay', kind: 'primary', onClick: () => setTimeout(() => HMS.modules.frontdesk.extendDialog(r.id), 30) }] : [])
      ]
    });
  }

  HMS.modules.calendar = { title: 'Calendar', render };
})();
