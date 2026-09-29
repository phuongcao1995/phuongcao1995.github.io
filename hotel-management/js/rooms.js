/* Rooms: inventory list/grid, details, add/edit/disable */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;
  let view = 'grid', table, filt = { type: '', status: '', floor: '' };
  const canEdit = () => ['Administrator', 'General Manager', 'Front Office Manager'].includes(HMS.app.user.role);

  function render(el, params) {
    const d = D();
    el.innerHTML = `${UI.pageHead({ title: 'Rooms', sub: `${d.rooms.length} rooms · ${d.roomTypes.length} room types · 2 wings`, crumbs: [{ label: 'Rooms' }],
      actions: `<div class="btn-group"><button class="${view === 'grid' ? 'active' : ''}" data-v="grid">${icon('grid')}Grid</button><button class="${view === 'list' ? 'active' : ''}" data-v="list">${icon('list')}List</button></div>${canEdit() ? `<button class="btn btn-primary" data-a="add">${icon('plus')}Add room</button>` : ''}` })}
      <div class="grid grid-4 mb-2">${d.roomTypes.slice(0, 4).map((t) => typeCard(t)).join('')}</div>
      <div id="rooms-body"></div>`;
    el.onclick = (e) => {
      const v = e.target.closest('[data-v]');
      if (v) { view = v.dataset.v; render(el, []); }
      if (e.target.closest('[data-a=add]')) openForm();
    };
    draw();
    if (params[0]) { const id = params[0]; history.replaceState(null, '', '#/rooms'); HMS.app.params = []; setTimeout(() => detail(id), 0); }
  }
  function typeCard(t) {
    const rooms = D().rooms.filter((r) => r.typeId === t.id);
    const occ = rooms.filter((r) => r.status === 'Occupied').length;
    return `<div class="kpi"><span class="kpi-label">${U.esc(t.name)}</span><span class="kpi-value">${occ}<small>/ ${rooms.length} occupied</small></span><span class="kpi-meta">from ${U.money(t.rate)} · ${t.size} m²</span></div>`;
  }

  function draw() {
    const body = document.getElementById('rooms-body');
    const d = D();
    if (view === 'list') {
      table = UI.dataTable(body, {
        rows: () => d.rooms,
        searchText: (r) => `${r.number} ${r.name} ${H.typeName(r.typeId)} ${r.view} ${r.building}`, exportName: 'rooms', sort: 'number',
        filters: [{ key: 'typeId', label: 'Type', options: d.roomTypes.map((t) => ({ value: t.id, label: t.name })) }, { key: 'status', label: 'Status', options: H.ROOM_STATUSES }, { key: 'floor', label: 'Floor', options: [...new Set(d.rooms.map((r) => String(r.floor)))] }, { key: 'building', label: 'Wing', options: ['Ocean Wing', 'City Wing'] }],
        columns: [
          { key: 'number', label: 'Room', render: (r) => `<div class="cell-main">${r.number}${r.disabled ? ' <span class="badge tone-dark plain">Disabled</span>' : ''}</div><div class="cell-sub">${U.esc(r.name || r.view)}</div>` },
          { key: 'typeId', label: 'Type', render: (r) => H.typeName(r.typeId), csv: (r) => H.typeName(r.typeId) },
          { key: 'floor', label: 'Floor', align: 'right' },
          { key: 'building', label: 'Wing' },
          { key: 'bed', label: 'Bed' },
          { key: 'capacity', label: 'Sleeps', align: 'right' },
          { key: 'rate', label: 'Rack rate', align: 'right', render: (r) => U.money(r.rate) },
          { key: 'status', label: 'Status', render: (r) => U.badge(r.status) },
          { key: 'guest', label: 'Guest', render: (r) => { const o = H.occupant(r.id); return o ? U.esc(H.guestName(o.guestId)) : '<span class="muted">—</span>'; }, sort: false, csv: (r) => { const o = H.occupant(r.id); return o ? H.guestName(o.guestId) : ''; } }
        ],
        rowActions: () => `<button class="btn btn-xs" data-act="view">Details</button>`,
        onAction: (a, r) => detail(r.id), onRowClick: (r) => detail(r.id)
      });
      return;
    }
    const rooms = d.rooms.filter((r) => (!filt.type || r.typeId === filt.type) && (!filt.status || r.status === filt.status) && (!filt.floor || String(r.floor) === filt.floor));
    body.innerHTML = `<div class="card"><div class="table-toolbar"><div class="tt-left">
        <select class="select-sm" data-g="type" aria-label="Room type"><option value="">Type: All</option>${d.roomTypes.map((t) => `<option value="${t.id}" ${filt.type === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select>
        <select class="select-sm" data-g="status" aria-label="Status"><option value="">Status: All</option>${H.ROOM_STATUSES.map((s) => `<option ${filt.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <select class="select-sm" data-g="floor" aria-label="Floor"><option value="">Floor: All</option>${[...new Set(d.rooms.map((r) => String(r.floor)))].map((f) => `<option ${filt.floor === f ? 'selected' : ''}>${f}</option>`).join('')}</select>
      </div><div class="tt-right small muted">${rooms.length} rooms</div></div>
      <div class="card-body"><div class="room-tiles" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))">${rooms.map((r) => { const o = H.occupant(r.id); return `<button type="button" class="room-tile" data-status="${r.status}" data-room="${r.id}" style="min-height:86px"><span class="rt-num">${r.number}</span><span class="rt-type">${H.typeName(r.typeId)} · ${r.view.replace(' view', '')}</span><span class="rt-type">${U.moneyShort(r.rate)} · ${r.bed}</span><span class="rt-guest">${o ? U.esc(H.guestName(o.guestId)) : r.disabled ? 'Disabled' : r.status}</span></button>`; }).join('') || UI.empty('No rooms match', '')}</div></div></div>`;
    body.onchange = (e) => { const g = e.target.closest('[data-g]'); if (g) { filt[g.dataset.g] = g.value; draw(); } };
    body.onclick = (e) => { const t = e.target.closest('[data-room]'); if (t) detail(t.dataset.room); };
  }

  function detail(id) {
    const r = H.room(id);
    if (!r) return UI.toast(`Room ${id} not found`, 'error');
    const t = H.type(r.typeId);
    const today = U.today();
    const upcoming = D().reservations.filter((x) => x.roomId === id && x.checkOut >= today && !['Cancelled', 'No-show', 'Checked-out'].includes(x.status)).sort((a, b) => a.checkIn.localeCompare(b.checkIn)).slice(0, 6);
    const past = D().reservations.filter((x) => x.roomId === id && x.status === 'Checked-out').slice(-5).reverse();
    const mt = D().maintenance.filter((m) => m.roomId === id).slice(-5).reverse();
    const nights30 = D().reservations.filter((x) => x.roomId === id && ['Checked-in', 'Checked-out'].includes(x.status) && x.checkOut > U.addDays(today, -30)).reduce((s, x) => s + H.nights(x.checkIn < U.addDays(today, -30) ? U.addDays(today, -30) : x.checkIn, x.checkOut > today ? today : x.checkOut), 0);
    UI.modal({
      title: `Room ${r.number}${r.name ? ' · ' + r.name : ''}`, size: 'lg',
      body: `<div class="row-between mb-2"><div><div class="strong">${t.name} · ${r.bed} bed · ${t.size} m² · sleeps ${r.capacity}</div><div class="small muted">Floor ${r.floor} · ${r.building} · ${r.view} · ${r.smoking ? 'Smoking' : 'Non-smoking'}</div></div><div class="row">${U.badge(r.status)}${r.disabled ? U.badge('Disabled') : ''}</div></div>
        <div class="grid grid-3 mb-2">${UI.kpi({ label: 'Rack rate', value: U.moneyShort(r.rate), unit: 'VND' })}${UI.kpi({ label: 'Occupancy, 30 days', value: U.pct((nights30 / 30) * 100, 0) })}${UI.kpi({ label: 'Last cleaned', value: `<span style="font-size:1rem">${U.fmtDateTime(r.lastCleaned)}</span>`, meta: r.attendant ? `Attendant: ${U.esc(r.attendant)}` : '' })}</div>
        <div class="mb-2">${r.amenities.map((a) => `<span class="tag">${U.esc(a)}</span>`).join('')}</div>
        <div class="grid grid-2">
          <div><h3 class="small strong mb-1">Current & upcoming</h3><div class="list">${upcoming.map((x) => `<div class="list-item"><div class="grow"><div class="title">${U.esc(H.guestName(x.guestId))}</div><div class="sub">${x.id} · ${U.fmtDate(x.checkIn)} → ${U.fmtDate(x.checkOut)}</div></div>${U.badge(x.status)}</div>`).join('') || '<p class="small muted">No upcoming bookings.</p>'}</div>
            <h3 class="small strong mb-1 mt-2">Recent stays</h3><div class="list">${past.map((x) => `<div class="list-item"><div class="grow"><div class="title">${U.esc(H.guestName(x.guestId))}</div><div class="sub">${U.fmtDate(x.checkIn)} → ${U.fmtDate(x.checkOut)} · ${U.money(x.rate)}</div></div></div>`).join('') || '<p class="small muted">No stays yet.</p>'}</div></div>
          <div><h3 class="small strong mb-1">Maintenance history</h3><div class="list">${mt.map((m) => `<div class="list-item"><div class="grow"><div class="title">${U.esc(m.title)}</div><div class="sub">${m.id} · ${U.fmtDate(m.reportedAt)} · ${U.money(m.cost)}</div></div>${U.badge(m.status)}</div>`).join('') || '<p class="small muted">No maintenance records.</p>'}</div>
            ${r.hkNote ? `<div class="alert warn mt-2">${icon('note')}<p>${U.esc(r.hkNote)}</p></div>` : ''}</div>
        </div>`,
      actions: [
        ...(canEdit() ? [{ label: r.disabled ? 'Enable room' : 'Disable room', kind: r.disabled ? '' : 'danger', onClick: () => { toggleDisable(r); } }, { label: 'Edit room', onClick: () => setTimeout(() => openForm(r.id), 30) }] : []),
        { spacer: true },
        { label: 'Room actions', kind: 'primary', onClick: () => setTimeout(() => HMS.modules.frontdesk.roomActions(r.id, () => HMS.app.refresh()), 30) }
      ]
    });
  }

  async function toggleDisable(r) {
    if (!r.disabled) {
      const future = D().reservations.filter((x) => x.roomId === r.id && x.checkOut > U.today() && ['Confirmed', 'Pending', 'Checked-in'].includes(x.status));
      if (future.length) return UI.toast(`Room ${r.number} has ${future.length} active booking(s). Move them before disabling.`, 'error');
      if (!(await UI.confirm({ title: `Disable room ${r.number}?`, message: 'Disabled rooms are removed from inventory and cannot be sold.', confirmLabel: 'Disable room', danger: true }))) return;
    }
    r.disabled = !r.disabled;
    HMS.store.commit();
    UI.toast(`Room ${r.number} ${r.disabled ? 'disabled' : 'enabled'}`);
    HMS.app.refresh();
  }

  function openForm(id) {
    const d = D();
    const r = id ? H.room(id) : null;
    const v = r ? Object.assign({}, r, { amenities: r.amenities.join(', ') }) : { typeId: 'DLX', floor: 5, building: 'City Wing', view: 'City view', status: 'Available' };
    UI.modal({
      title: r ? `Edit room ${r.number}` : 'Add room', size: 'lg',
      body: UI.form([
        { name: 'number', label: 'Room number', required: true, pattern: '[0-9]{3,4}[A-Za-z]?', title: '3–4 digits, e.g. 916', readonly: !!r },
        { name: 'name', label: 'Room name (suites)', placeholder: 'e.g. My Khe Suite' },
        { name: 'typeId', label: 'Room type', type: 'select', options: d.roomTypes.map((t) => ({ value: t.id, label: t.name })) },
        { name: 'floor', label: 'Floor', type: 'number', min: 1, max: 40, required: true },
        { name: 'building', label: 'Wing / building', type: 'select', options: ['Ocean Wing', 'City Wing'] },
        { name: 'view', label: 'View', type: 'select', options: ['Sea view', 'Han River view', 'City view', 'Garden view'] },
        { name: 'bed', label: 'Bed type', type: 'select', options: ['Single', 'Double', 'Queen', 'King', 'Twin', '2 Queen'] },
        { name: 'capacity', label: 'Capacity', type: 'number', min: 1, max: 8, required: true },
        { name: 'rate', label: 'Rack rate (VND / night)', type: 'number', min: 100000, step: 10000, required: true },
        ...(r ? [] : [{ name: 'status', label: 'Initial status', type: 'select', options: ['Available', 'Dirty', 'Maintenance', 'Out of Service'] }]),
        { name: 'amenities', label: 'Amenities (comma separated)', type: 'textarea', span: 2, rows: 2 },
        { name: 'smoking', label: 'Smoking room', type: 'checkbox' }
      ], v),
      onMount: (ctx) => {
        const ty = ctx.body.querySelector('[name=typeId]');
        const fill = () => { if (r) return; const t = H.type(ty.value); ctx.body.querySelector('[name=bed]').value = t.bed; ctx.body.querySelector('[name=capacity]').value = t.capacity; ctx.body.querySelector('[name=rate]').value = t.rate; ctx.body.querySelector('[name=amenities]').value = t.amenities.join(', '); };
        ty.addEventListener('change', fill); fill();
      },
      actions: [{ label: 'Cancel' }, { label: r ? 'Save room' : 'Add room', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        x.amenities = x.amenities.split(',').map((s) => s.trim()).filter(Boolean);
        if (!r && H.room(x.number)) { UI.toast(`Room ${x.number} already exists.`, 'error'); return false; }
        if (r) { Object.assign(r, x); HMS.store.commit(); UI.toast(`Room ${r.number} saved`); }
        else { HMS.store.add('rooms', Object.assign({ id: x.number, disabled: false, attendant: '', hkPriority: 'Normal', hkNote: '', lastCleaned: '' }, x)); UI.toast(`Room ${x.number} added`); }
        HMS.app.refresh();
      } }]
    });
  }

  HMS.modules.rooms = { title: 'Rooms', render, detail, openForm };
})();
