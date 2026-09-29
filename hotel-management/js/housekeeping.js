/* Housekeeping (cleaning board, assignment, inspection, lost & found)
   and Maintenance (requests, technicians, out-of-order control). */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;
  const HK = ['Dirty', 'Cleaning', 'Clean', 'Inspected'];
  const st = { by: 'floor', status: '', stayover: false, tab: 'board' };
  const PRI = { Urgent: 0, High: 1, Normal: 2, Low: 3 };
  const attendants = () => D().staff.filter((s) => s.department === 'Housekeeping' && s.status === 'Active').map((s) => s.name);
  const NEXT_LABEL = { Dirty: ['Cleaning', 'Start cleaning'], Cleaning: ['Clean', 'Mark clean'], Clean: ['Inspected', 'Pass inspection'], Inspected: ['Available', 'Release to sale'] };

  function render(el, params) {
    if (params[0]) st.tab = params[0];
    const d = D();
    const count = (s) => d.rooms.filter((r) => r.status === s).length;
    el.innerHTML = `${UI.pageHead({ title: 'Housekeeping', sub: `${U.fmtDate(U.today())} · ${attendants().length} room attendants on duty`, crumbs: [{ label: 'Housekeeping' }],
      actions: `<button class="btn" data-a="auto">${icon('refresh')}Auto-assign rooms</button><button class="btn" data-a="lf">${icon('plus')}Log lost item</button>` })}
      <div class="hk-summary">${HK.concat(['Maintenance']).map((s) => { const n = s === 'Maintenance' ? d.rooms.filter((r) => H.BLOCKED.includes(r.status)).length : count(s); return `<button type="button" class="kpi is-link ${st.status === s ? 'feature' : ''}" data-s="${s}"><span class="kpi-label"><i class="dot" style="background:var(--st-${s.toLowerCase()})"></i>${s === 'Maintenance' ? 'Maintenance / OOO' : s}</span><span class="kpi-value">${n}</span></button>`; }).join('')}</div>
      ${UI.tabs([{ id: 'board', label: 'Cleaning board' }, { id: 'lost', label: 'Lost & found', count: d.lostFound.filter((x) => x.status !== 'Returned' && x.status !== 'Discarded').length }], st.tab)}
      <div id="hk-body"></div>`;
    UI.bindTabs(el, (t) => { st.tab = t; draw(); });
    el.onclick = (e) => {
      const s = e.target.closest('[data-s]');
      if (s) { st.status = st.status === s.dataset.s ? '' : s.dataset.s; st.tab = 'board'; render(el, []); return; }
      const a = e.target.closest('[data-a]');
      if (a && a.dataset.a === 'auto') autoAssign();
      if (a && a.dataset.a === 'lf') lostForm();
    };
    draw();
  }

  function rooms() {
    const d = D();
    return d.rooms.filter((r) => {
      if (st.status === 'Maintenance') return H.BLOCKED.includes(r.status);
      if (st.status) return r.status === st.status;
      return HK.includes(r.status) || (st.stayover && r.status === 'Occupied');
    }).sort((a, b) => (PRI[a.hkPriority] ?? 2) - (PRI[b.hkPriority] ?? 2) || a.number.localeCompare(b.number));
  }

  function card(r) {
    const occ = r.status === 'Occupied' ? H.occupant(r.id) : null;
    const arr = H.arrivalFor(r.id);
    const nx = NEXT_LABEL[r.status];
    const blocked = H.BLOCKED.includes(r.status);
    return `<div class="hk-card" data-status="${r.status}">
      <div class="hk-top"><span class="hk-num">${r.number}</span><div class="row" style="gap:4px">${r.hkPriority && r.hkPriority !== 'Normal' ? U.badge(r.hkPriority) : ''}${U.badge(r.status)}</div></div>
      <div class="hk-meta"><span>${H.typeName(r.typeId)} · floor ${r.floor}</span>
        <span>${icon('user', 'ico-sm')} ${r.attendant ? U.esc(r.attendant) : '<em>Unassigned</em>'}</span>
        ${arr ? `<span style="color:var(--info)">Arrival today · ETA ${arr.eta || '—'}</span>` : ''}
        ${occ ? `<span>Stay-over · ${U.esc(H.guestName(occ.guestId))} until ${U.fmtDate(occ.checkOut)}</span>` : ''}
        ${r.status === 'Cleaning' && r.hkStarted ? `<span>Started ${r.hkStarted.slice(11)}</span>` : ''}
        ${r.hkNote ? `<span style="color:var(--warn)">${icon('note', 'ico-sm')} ${U.esc(r.hkNote)}</span>` : ''}</div>
      <div class="hk-actions">
        ${nx && !blocked ? `<button class="btn btn-xs btn-primary" data-next="${r.id}">${nx[1]}</button>` : ''}
        ${r.status === 'Dirty' ? `<button class="btn btn-xs" data-to="${r.id}:Clean" title="Skip straight to clean">Clean</button>` : ''}
        ${r.status === 'Clean' || r.status === 'Inspected' ? `<button class="btn btn-xs" data-to="${r.id}:Dirty">Fail — re-clean</button>` : ''}
        <button class="btn btn-xs" data-assign="${r.id}">Assign</button>
        <button class="icon-btn sm" data-note="${r.id}" aria-label="Note">${icon('note')}</button>
      </div></div>`;
  }

  function draw() {
    const body = document.getElementById('hk-body');
    if (!body) return;
    if (st.tab === 'lost') return drawLost(body);
    const list = rooms();
    const groups = st.by === 'floor' ? U.groupBy(list, (r) => `Floor ${r.floor}`) : st.by === 'staff' ? U.groupBy(list, (r) => r.attendant || 'Unassigned') : st.by === 'priority' ? U.groupBy(list, (r) => r.hkPriority || 'Normal') : { 'All rooms': list };
    let keys = Object.keys(groups);
    if (st.by === 'floor') keys.sort((a, b) => Number(a.split(' ')[1]) - Number(b.split(' ')[1]));
    if (st.by === 'priority') keys.sort((a, b) => (PRI[a] ?? 2) - (PRI[b] ?? 2));
    if (st.by === 'staff') keys.sort((a, b) => (a === 'Unassigned' ? -1 : b === 'Unassigned' ? 1 : a.localeCompare(b)));
    body.innerHTML = `<div class="row-between mb-2">
        <div class="btn-group">${[['floor', 'By floor'], ['staff', 'By attendant'], ['priority', 'By priority'], ['room', 'By room']].map((x) => `<button class="${st.by === x[0] ? 'active' : ''}" data-by="${x[0]}">${x[1]}</button>`).join('')}</div>
        <label class="switch"><input type="checkbox" id="hk-so" ${st.stayover ? 'checked' : ''}><span class="track"></span><span class="small">Include stay-over rooms</span></label>
      </div>
      ${list.length ? keys.map((k) => `<div class="hk-group-title">${U.esc(k)} <span class="tab-count">${groups[k].length}</span></div><div class="hk-grid">${groups[k].map(card).join('')}</div>`).join('') : `<div class="card">${UI.empty('Nothing to clean', 'All rooms are clean and released. Nice work.')}</div>`}`;
    body.onclick = (e) => {
      const by = e.target.closest('[data-by]');
      if (by) { st.by = by.dataset.by; draw(); return; }
      const nx = e.target.closest('[data-next]');
      if (nx) return change(nx.dataset.next, NEXT_LABEL[H.room(nx.dataset.next).status][0]);
      const to = e.target.closest('[data-to]');
      if (to) { const [id, s] = to.dataset.to.split(':'); return change(id, s); }
      const as = e.target.closest('[data-assign]');
      if (as) return assignDialog([as.dataset.assign]);
      const nt = e.target.closest('[data-note]');
      if (nt) return noteDialog(nt.dataset.note);
    };
    body.querySelector('#hk-so').onchange = (e) => { st.stayover = e.target.checked; draw(); };
  }

  function change(id, status) {
    try {
      if (status === 'Clean' && H.room(id).status === 'Dirty') { H.setRoomStatus(id, 'Cleaning'); }
      H.setRoomStatus(id, status);
      UI.toast(`Room ${id}: ${status === 'Available' ? 'released for sale' : status}`);
      refresh();
    } catch (err) { UI.toast(err.message, 'error'); }
  }
  function refresh() { if (HMS.app.current === 'housekeeping') render(document.getElementById('view'), []); }

  function assignDialog(ids) {
    const r = H.room(ids[0]);
    UI.modal({
      title: `Assign room ${ids.join(', ')}`, size: 'sm',
      body: UI.form([
        { name: 'attendant', label: 'Room attendant', type: 'select', options: attendants(), span: 2 },
        { name: 'priority', label: 'Priority', type: 'select', options: ['Urgent', 'High', 'Normal', 'Low'], span: 2 }
      ], { attendant: r.attendant, priority: r.hkPriority || 'Normal' }),
      actions: [{ label: 'Cancel' }, { label: 'Assign', kind: 'primary', onClick: (ctx) => {
        const v = UI.readForm(ctx.body);
        ids.forEach((id) => { const x = H.room(id); x.attendant = v.attendant; x.hkPriority = v.priority; });
        HMS.store.commit(); UI.toast(`Assigned to ${v.attendant}`); refresh();
      } }]
    });
  }
  function noteDialog(id) {
    const r = H.room(id);
    UI.modal({ title: `Housekeeping note · Room ${r.number}`, size: 'sm', body: UI.form([{ name: 'hkNote', label: 'Note', type: 'textarea', span: 2, placeholder: 'e.g. Extra towels requested, stain on carpet' }], r),
      actions: [{ label: 'Cancel' }, { label: 'Save note', kind: 'primary', onClick: (ctx) => { r.hkNote = UI.readForm(ctx.body).hkNote; HMS.store.commit(); UI.toast('Note saved'); refresh(); } }] });
  }
  /** Balance dirty rooms across attendants, keeping each on as few floors as possible */
  function autoAssign() {
    const list = D().rooms.filter((r) => ['Dirty', 'Cleaning'].includes(r.status) && !r.attendant).sort((a, b) => a.floor - b.floor || a.number.localeCompare(b.number));
    const staff = attendants();
    if (!list.length) return UI.toast('Every dirty room already has an attendant.', 'info');
    const load = {};
    staff.forEach((s) => { load[s] = D().rooms.filter((r) => r.attendant === s && ['Dirty', 'Cleaning'].includes(r.status)).length; });
    list.forEach((r) => { const s = staff.slice().sort((a, b) => load[a] - load[b])[0]; r.attendant = s; load[s]++; if (H.arrivalFor(r.id)) r.hkPriority = 'High'; });
    HMS.store.commit();
    UI.toast(`${list.length} rooms assigned across ${staff.length} attendants`);
    refresh();
  }

  function drawLost(body) {
    UI.dataTable(body, {
      rows: () => D().lostFound.slice().reverse(), exportName: 'lost-and-found',
      searchText: (x) => `${x.item} ${x.location} ${x.foundBy}`,
      filters: [{ key: 'status', label: 'Status', options: ['Found', 'Stored', 'Returned', 'Discarded'] }],
      toolbar: `<button class="btn btn-sm btn-primary" data-lf>${icon('plus')}Log item</button>`,
      columns: [
        { key: 'id', label: 'Ref', render: (x) => `<span class="cell-main">${x.id}</span>` },
        { key: 'item', label: 'Item' }, { key: 'location', label: 'Where found' }, { key: 'date', label: 'Date', render: (x) => U.fmtDate(x.date) },
        { key: 'foundBy', label: 'Found by' }, { key: 'status', label: 'Status', render: (x) => U.badge(x.status) }, { key: 'notes', label: 'Notes' }
      ],
      rowActions: (x) => ['Found', 'Stored'].includes(x.status) ? `<button class="btn btn-xs" data-act="stored">Stored</button><button class="btn btn-xs btn-soft" data-act="returned">Returned to guest</button>` : '',
      onAction: (a, x) => { x.status = a === 'stored' ? 'Stored' : 'Returned'; if (a === 'returned') x.notes = `Returned ${U.fmtDate(U.today())} by ${H.user()}`; HMS.store.commit(); UI.toast(`${x.item}: ${x.status}`); drawLost(body); }
    });
    body.querySelector('[data-lf]').onclick = lostForm;
  }
  function lostForm() {
    UI.modal({ title: 'Log lost & found item', size: 'md', body: UI.form([
      { name: 'item', label: 'Item description', required: true, span: 2 }, { name: 'location', label: 'Room / area', required: true, placeholder: 'e.g. 512 or Pool area' },
      { name: 'foundBy', label: 'Found by', type: 'select', options: D().staff.filter((s) => s.status === 'Active').map((s) => s.name) }, { name: 'notes', label: 'Notes', type: 'textarea', span: 2 }]),
      actions: [{ label: 'Cancel' }, { label: 'Log item', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        D().lostFound.push(Object.assign({ id: HMS.store.nextId('lf', 'LF-', 3), status: 'Found', date: U.today() }, x));
        HMS.store.commit(); UI.toast(`Logged: ${x.item}`); st.tab = 'lost'; refresh();
      } }] });
  }

  HMS.modules.housekeeping = { title: 'Housekeeping', render };

  /* =========================================================
     Maintenance
     ========================================================= */
  let mTable;
  const MT_STATUS = ['Open', 'Assigned', 'In Progress', 'Waiting Parts', 'Completed', 'Cancelled'];
  const techs = () => D().staff.filter((s) => s.department === 'Maintenance' && s.status === 'Active').map((s) => s.name);

  function renderMaint(el) {
    const d = D();
    const open = d.maintenance.filter((m) => !['Completed', 'Cancelled'].includes(m.status));
    const monthCost = U.sum(d.maintenance.filter((m) => m.reportedAt >= U.addDays(U.today(), -30)), (m) => m.cost);
    el.innerHTML = `${UI.pageHead({ title: 'Maintenance', sub: 'Room, equipment and preventive maintenance', crumbs: [{ label: 'Maintenance' }], actions: `<button class="btn btn-primary" data-a="new">${icon('plus')}New request</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Open requests', value: open.length, meta: `${open.filter((m) => ['High', 'Urgent'].includes(m.priority)).length} high priority` })}
        ${UI.kpi({ label: 'Rooms out of inventory', value: d.rooms.filter((r) => H.BLOCKED.includes(r.status)).length, dot: 'var(--st-maintenance)', link: '#/frontdesk/board' })}
        ${UI.kpi({ label: 'Waiting for parts', value: open.filter((m) => m.status === 'Waiting Parts').length })}
        ${UI.kpi({ label: 'Cost, last 30 days', value: U.moneyShort(monthCost), unit: 'VND' })}
      </div><div id="mt-table"></div>`;
    el.querySelector('[data-a=new]').onclick = () => openForm();
    mTable = UI.dataTable(el.querySelector('#mt-table'), {
      rows: () => d.maintenance.slice().reverse(), exportName: 'maintenance',
      searchText: (m) => `${m.id} ${m.title} ${m.roomId} ${m.technician} ${m.notes}`,
      filters: [{ key: 'status', label: 'Status', options: MT_STATUS }, { key: 'priority', label: 'Priority', options: ['Urgent', 'High', 'Medium', 'Low'] }, { key: 'type', label: 'Type', options: ['Room', 'Equipment', 'Preventive'] }, { key: 'technician', label: 'Technician', options: techs() }],
      dateRange: { key: 'reportedAt', label: 'Reported' },
      columns: [
        { key: 'id', label: 'Request', render: (m) => `<div class="cell-main">${m.id}</div><div class="cell-sub">${m.type}</div>` },
        { key: 'title', label: 'Issue', render: (m) => `<div class="cell-main">${U.esc(m.title)}</div>${m.notes ? `<div class="cell-sub">${U.esc(m.notes)}</div>` : ''}` },
        { key: 'roomId', label: 'Room', render: (m) => m.roomId ? `${m.roomId}${m.outOfOrder ? ' <span class="badge tone-dark plain">OOO</span>' : ''}` : '<span class="muted">—</span>' },
        { key: 'priority', label: 'Priority', render: (m) => U.badge(m.priority), sortValue: (m) => ({ Urgent: 0, High: 1, Medium: 2, Low: 3 })[m.priority] },
        { key: 'technician', label: 'Technician', render: (m) => U.esc(m.technician || '—') },
        { key: 'reportedAt', label: 'Reported', render: (m) => `${U.fmtDate(m.reportedAt)}<div class="cell-sub">${U.esc(m.reportedBy)}</div>` },
        { key: 'cost', label: 'Cost', align: 'right', render: (m) => m.cost ? U.money(m.cost) : '<span class="muted">—</span>' },
        { key: 'status', label: 'Status', render: (m) => U.badge(m.status) }
      ],
      rowActions: (m) => `${!['Completed', 'Cancelled'].includes(m.status) ? `<button class="btn btn-xs btn-soft" data-act="complete">Complete</button>` : ''}<button class="icon-btn sm" data-act="edit" aria-label="Edit">${icon('edit')}</button>`,
      onAction: (a, m) => { if (a === 'edit') openForm(m.id); if (a === 'complete') complete(m); },
      onRowClick: (m) => openForm(m.id)
    });
  }

  /** Completing a room job returns the room to Dirty so housekeeping cleans it before sale */
  function complete(m) {
    UI.modal({ title: `Complete ${m.id}`, size: 'sm', body: UI.form([{ name: 'cost', label: 'Final cost (VND)', type: 'number', min: 0, step: 10000, span: 2 }, { name: 'notes', label: 'Work done', type: 'textarea', span: 2 }], m),
      actions: [{ label: 'Cancel' }, { label: 'Mark completed', kind: 'primary', onClick: (ctx) => {
        const v = UI.readForm(ctx.body);
        Object.assign(m, v, { status: 'Completed', completedAt: U.nowStamp() });
        const room = m.roomId && H.room(m.roomId);
        const otherOpen = room && D().maintenance.some((x) => x.id !== m.id && x.roomId === room.id && x.outOfOrder && !['Completed', 'Cancelled'].includes(x.status));
        if (room && H.BLOCKED.includes(room.status) && !otherOpen) { room.status = 'Dirty'; room.hkPriority = 'High'; H.notify('housekeeping', `Room ${room.number} back from maintenance — needs cleaning`, '#/housekeeping'); }
        HMS.store.commit();
        UI.toast(`${m.id} completed${room && room.status === 'Dirty' ? ` · room ${room.number} sent to housekeeping` : ''}`);
        if (mTable) HMS.app.refresh();
      } }] });
  }

  function openForm(id, preset = {}) {
    const m = id ? D().maintenance.find((x) => x.id === id) : null;
    const v = m || Object.assign({ type: 'Room', priority: 'Medium', status: 'Open', dueDate: U.addDays(U.today(), 2), cost: 0 }, preset);
    UI.modal({
      title: m ? `Maintenance ${m.id}` : 'New maintenance request', size: 'lg',
      body: UI.form([
        { name: 'title', label: 'Issue', required: true, span: 2, placeholder: 'e.g. Air conditioner leaking water' },
        { name: 'type', label: 'Type', type: 'select', options: ['Room', 'Equipment', 'Preventive'] },
        { name: 'roomId', label: 'Room', type: 'select', placeholder: 'Not room-specific', options: D().rooms.map((r) => ({ value: r.id, label: `${r.number} · ${r.status}` })) },
        { name: 'priority', label: 'Priority', type: 'select', options: ['Urgent', 'High', 'Medium', 'Low'] },
        { name: 'status', label: 'Status', type: 'select', options: MT_STATUS },
        { name: 'technician', label: 'Technician', type: 'select', placeholder: 'Unassigned', options: techs() },
        { name: 'dueDate', label: 'Due date', type: 'date' },
        { name: 'cost', label: 'Estimated cost (VND)', type: 'number', min: 0, step: 10000 },
        { name: 'outOfOrder', label: 'Take room out of order until fixed', type: 'checkbox' },
        { name: 'notes', label: 'Notes', type: 'textarea', span: 2 }
      ], v),
      actions: [{ label: 'Cancel' }, { label: m ? 'Save request' : 'Create request', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        if (x.technician && x.status === 'Open') x.status = 'Assigned';
        const room = x.roomId && H.room(x.roomId);
        if (x.outOfOrder && room && !H.BLOCKED.includes(room.status)) {
          if (room.status === 'Occupied') { UI.toast(`Room ${room.number} is occupied. Transfer the guest before taking it out of order.`, 'error'); return false; }
          try { H.setRoomStatus(room.id, 'Maintenance', { force: !H.arrivalFor(room.id) }); } catch (err) { UI.toast(err.message, 'error'); return false; }
        }
        if (m) { Object.assign(m, x); if (x.status === 'Completed' && !m.completedAt) m.completedAt = U.nowStamp(); }
        else D().maintenance.push(Object.assign({ id: HMS.store.nextId('maintenance', 'MT-', 4), reportedAt: U.nowStamp(), reportedBy: H.user(), completedAt: '' }, x));
        if (!m) H.notify('maintenance', `New maintenance request: ${x.title}${room ? ' (room ' + room.number + ')' : ''}`, '#/maintenance');
        HMS.store.commit();
        UI.toast(m ? 'Request saved' : `Request created${x.outOfOrder && room ? ` · room ${room.number} is now under maintenance` : ''}`);
        if (HMS.app.current === 'maintenance') HMS.app.refresh();
      } }]
    });
  }

  HMS.modules.maintenance = { title: 'Maintenance', render: renderMaint, openForm };
})();
