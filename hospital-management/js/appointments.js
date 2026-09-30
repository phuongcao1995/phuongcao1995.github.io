/* Appointments: list, calendar, create/reschedule/cancel/check-in */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;
  let table, viewMode = 'list', calMonth = U.today().slice(0, 7);

  function render(el, params) {
    const d = D();
    const today = U.today();
    const todays = d.appointments.filter((a) => a.date === today);
    const upcoming = d.appointments.filter((a) => a.date >= today && a.status === 'Scheduled');
    const cxl30 = d.appointments.filter((a) => a.createdAt >= U.addDays(today, -30) && a.status === 'Cancelled').length;
    el.innerHTML = `${UI.pageHead({ title: 'Appointments', sub: 'Scheduling across all departments', crumbs: [{ label: 'Appointments' }],
      actions: `<div class="btn-group" role="tablist"><button type="button" data-view="list" class="${viewMode === 'list' ? 'active' : ''}">${icon('list')}List</button><button type="button" data-view="cal" class="${viewMode === 'cal' ? 'active' : ''}">${icon('grid')}Calendar</button></div><button class="btn btn-primary" data-a="new">${icon('plus')}New appointment</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: "Today's appointments", value: todays.length })}
        ${UI.kpi({ label: 'Scheduled (upcoming)', value: upcoming.length })}
        ${UI.kpi({ label: 'Checked in today', value: todays.filter((a) => a.status !== 'Scheduled' && a.status !== 'Cancelled' && a.status !== 'No Show').length })}
        ${UI.kpi({ label: 'Cancelled (30 days)', value: cxl30 })}
      </div>
      <div id="ap-view"></div>`;
    el.querySelector('.page-actions').onclick = (e) => {
      const v = e.target.closest('[data-view]');
      if (v) { viewMode = v.dataset.view; render(el, params); return; }
      if (e.target.closest('[data-a=new]')) openForm();
    };
    if (viewMode === 'list') drawList(el.querySelector('#ap-view'));
    else drawCalendar(el.querySelector('#ap-view'));
    if (params[0]) { const id = params[0]; history.replaceState(null, '', '#/appointments'); HIS.app.params = []; setTimeout(() => detail(id), 0); }
  }

  function drawList(host) {
    const d = D();
    table = UI.dataTable(host, {
      rows: () => d.appointments.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
      searchPlaceholder: 'Patient, doctor, appointment ID',
      searchText: (a) => `${a.id} ${K.patientName(a.patientId)} ${K.doctorName(a.doctorId)}`,
      filters: [{ key: 'status', label: 'Status', options: K.APPT_STATUSES }, { key: 'departmentId', label: 'Department', options: d.departments.map((x) => ({ value: x.id, label: x.name })) }, { key: 'type', label: 'Type', options: K.APPT_TYPES }],
      dateRange: { key: 'date', label: 'Date' }, exportName: 'appointments', sort: 'date', dir: 'desc',
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'patientId', label: 'Patient', render: (a) => K.patientName(a.patientId), sortValue: (a) => K.patientName(a.patientId), csv: (a) => K.patientName(a.patientId) },
        { key: 'doctorId', label: 'Doctor', render: (a) => `Dr. ${K.doctorName(a.doctorId).replace('Dr. ', '')}`, csv: (a) => K.doctorName(a.doctorId) },
        { key: 'departmentId', label: 'Department', render: (a) => K.departmentName(a.departmentId), csv: (a) => K.departmentName(a.departmentId) },
        { key: 'date', label: 'Date', render: (a) => U.fmtDate(a.date) },
        { key: 'time', label: 'Time' },
        { key: 'type', label: 'Type' },
        { key: 'status', label: 'Status', render: (a) => U.badge(a.status) }
      ],
      rowActions: (a) => `${a.status === 'Scheduled' ? `<button class="btn btn-xs btn-soft" data-act="checkin">Check in</button>` : ''}<button class="btn btn-xs" data-act="view">View</button>`,
      onAction: (act, a) => { if (act === 'checkin') doCheckIn(a); else detail(a.id); },
      onRowClick: (a) => detail(a.id)
    });
  }

  function drawCalendar(host) {
    const d = D();
    const [y, m] = calMonth.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const startDow = first.getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const byDay = U.groupBy(d.appointments.filter((a) => a.date.startsWith(calMonth)), (a) => a.date);
    let cells = '';
    for (let i = 0; i < startDow; i++) cells += `<div class="cal-day-cell empty"></div>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${calMonth}-${String(day).padStart(2, '0')}`;
      const list = byDay[date] || [];
      const isToday = date === U.today();
      cells += `<button type="button" class="cal-day-cell ${isToday ? 'is-today' : ''} ${date === host.dataset.sel ? 'is-sel' : ''}" data-day="${date}"><span class="cdn">${day}</span>${list.length ? `<span class="cdc">${list.length}</span>` : ''}</button>`;
    }
    host.innerHTML = `<div class="card">
      <div class="row-between" style="padding:14px 16px 0">
        <div class="row"><button class="icon-btn sm" data-nav="-1">${icon('chevron-left')}</button><strong>${monthLabel(calMonth)}</strong><button class="icon-btn sm" data-nav="1">${icon('chevron')}</button></div>
        <button class="btn btn-sm" data-nav="0">Today</button>
      </div>
      <div class="card-body">
        <div class="cal-month-head">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((w) => `<span>${w}</span>`).join('')}</div>
        <div class="cal-month-grid">${cells}</div>
      </div>
    </div>
    <div class="card mt-2" id="cal-day-list"></div>`;
    const sel = host.dataset.sel || U.today();
    drawDayList(host.querySelector('#cal-day-list'), sel);
    host.querySelector('.cal-month-grid').onclick = (e) => {
      const c = e.target.closest('[data-day]');
      if (!c) return;
      host.dataset.sel = c.dataset.day;
      U.qsa('.cal-day-cell', host).forEach((x) => x.classList.toggle('is-sel', x.dataset.day === c.dataset.day));
      drawDayList(host.querySelector('#cal-day-list'), c.dataset.day);
    };
    host.querySelector('.card').addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (!nav) return;
      const delta = Number(nav.dataset.nav);
      if (delta === 0) { calMonth = U.today().slice(0, 7); host.dataset.sel = U.today(); }
      else { const [yy, mm] = calMonth.split('-').map(Number); const nd = new Date(yy, mm - 1 + delta, 1); calMonth = `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`; }
      drawCalendar(host);
    });
  }
  function drawDayList(host, date) {
    const list = D().appointments.filter((a) => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
    host.innerHTML = `<div class="card-head"><h2>${U.weekday(date)} ${U.fmtDate(date)}</h2><span class="sub">${list.length} appointment${list.length === 1 ? '' : 's'}</span></div>
      <div class="card-body"><div class="list">${list.length ? list.map((a) => `<div class="list-item clickable" data-open="${a.id}"><span class="avatar sm">${U.initials(K.patientName(a.patientId))}</span><div class="grow"><div class="title">${a.time} · ${U.esc(K.patientName(a.patientId))}</div><div class="sub">${U.esc(K.doctorName(a.doctorId))} · ${a.type}</div></div>${U.badge(a.status)}</div>`).join('') : UI.empty('No appointments this day', '')}</div></div>`;
    host.onclick = (e) => { const it = e.target.closest('[data-open]'); if (it) detail(it.dataset.open); };
  }
  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function monthLabel(ym) { const [y, m] = ym.split('-'); return `${MONTH_NAMES[Number(m) - 1]} ${y}`; }

  function doCheckIn(a) {
    try { const v = HIS.clinic.checkIn({ appointmentId: a.id }); UI.toast(`${K.patientName(a.patientId)} checked in · queue #${v.queueNumber}`); HIS.app.refresh(); }
    catch (e) { UI.toast(e.message, 'error'); }
  }

  function detail(id) {
    const a = K.appt(id);
    if (!a) return UI.toast('Appointment not found', 'error');
    const acts = [];
    const btn = (k, label, kind) => acts.push(`<button class="btn btn-sm ${kind ? 'btn-' + kind : ''}" data-x="${k}">${label}</button>`);
    if (a.status === 'Scheduled') { btn('edit', 'Reschedule'); btn('checkin', 'Check in', 'primary'); btn('noshow', 'Mark no-show'); btn('cancel', 'Cancel', 'danger'); }
    UI.modal({
      title: `Appointment ${a.id}`, size: 'md',
      body: `<div class="row-between mb-2"><div class="row"><span class="avatar">${U.initials(K.patientName(a.patientId))}</span><div><a class="strong" href="#/patients/${a.patientId}">${U.esc(K.patientName(a.patientId))}</a><div class="small muted">${U.esc(K.doctorName(a.doctorId))} · ${U.esc(K.departmentName(a.departmentId))}</div></div></div>${U.badge(a.status)}</div>
        <dl class="dl"><dt>Date & time</dt><dd>${U.weekday(a.date)} ${U.fmtDate(a.date)} · ${a.time}</dd><dt>Type</dt><dd>${a.type}</dd><dt>Reason</dt><dd>${U.esc(a.reason || '—')}</dd>
        <dt>Booked</dt><dd>${U.fmtDateTime(a.createdAt)}${a.createdBy ? ' by ' + U.esc(a.createdBy) : ''}</dd>${a.notes ? `<dt>Notes</dt><dd>${U.esc(a.notes)}</dd>` : ''}${a.cancelReason ? `<dt>Cancel reason</dt><dd>${U.esc(a.cancelReason)}</dd>` : ''}</dl>
        <div class="row mt-2">${acts.join('')}</div>`,
      onMount: (ctx) => ctx.body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-x]');
        if (!b) return;
        const x = b.dataset.x;
        if (x === 'checkin') { doCheckIn(a); ctx.close(); return; }
        if (x === 'noshow') { try { K.setApptStatus(a.id, 'No Show'); UI.toast('Marked as no-show'); ctx.close(); HIS.app.refresh(); } catch (e2) { UI.toast(e2.message, 'error'); } return; }
        if (x === 'cancel') { cancelDialog(a.id, () => { ctx.close(); HIS.app.refresh(); }); return; }
        ctx.close();
        if (x === 'edit') openForm(a.id);
      })
    });
  }
  function cancelDialog(id, done) {
    const a = K.appt(id);
    UI.modal({ title: `Cancel ${a.id}`, size: 'sm', body: UI.form([{ name: 'reason', label: 'Reason', type: 'select', options: ['Patient request', 'Doctor unavailable', 'Rescheduled', 'Duplicate booking', 'Other'] }]),
      actions: [{ label: 'Keep' }, { label: 'Cancel appointment', kind: 'danger', onClick: (ctx) => { K.setApptStatus(a.id, 'Cancelled', UI.readForm(ctx.body).reason); UI.toast('Appointment cancelled'); done(); } }] });
  }

  function openForm(id, preset = {}) {
    const d = D();
    const a = id ? K.appt(id) : null;
    const today = U.today();
    const v = a ? Object.assign({}, a) : Object.assign({ date: today, time: '09:00', type: 'General Consultation' }, preset);
    const patientLabel = (p) => `${p.name} · ${p.phone} (${p.id})`;
    const doctorsFor = (deptId) => d.doctors.filter((x) => !deptId || x.departmentId === deptId);
    const m = UI.modal({
      title: a ? `Reschedule ${a.id}` : 'New appointment', size: 'md',
      body: `<datalist id="pt-dl">${d.patients.map((p) => `<option value="${U.esc(patientLabel(p))}">`).join('')}</datalist>
        <div class="form-grid">
          <div class="field span-2"><label for="af-pt">Patient <span class="req">*</span></label><input id="af-pt" list="pt-dl" placeholder="Type a name or phone number" autocomplete="off" value="${preset.patientId ? U.esc(patientLabel(K.patient(preset.patientId))) : a ? U.esc(patientLabel(K.patient(a.patientId))) : ''}"></div>
        </div>
        ${UI.form([
          { name: 'departmentId', label: 'Department', type: 'select', options: d.departments.filter((x) => HIS.REF.CLINICAL_DEPTS.includes(x.id)).map((x) => ({ value: x.id, label: x.name })) },
          { name: 'doctorId', label: 'Doctor', type: 'select', options: [] },
          { name: 'date', label: 'Date', type: 'date', required: true, min: today },
          { name: 'time', label: 'Time', type: 'time', required: true },
          { name: 'type', label: 'Type', type: 'select', options: HIS.clinic.APPT_TYPES },
          { name: 'reason', label: 'Reason for visit', span: 2 },
          { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 2 }
        ], v)}
        <p class="form-error mt-1" id="af-err" hidden></p>`,
      actions: [{ label: 'Cancel' }, { label: a ? 'Save changes' : 'Create appointment', kind: 'primary', onClick: () => save() }]
    });
    const b = m.body;
    const $ = (n) => b.querySelector(`[name=${n}]`);
    const deptSel = $('departmentId'), docSel = $('doctorId');
    function refreshDoctors() {
      const keep = docSel.value || v.doctorId || (a ? a.doctorId : '');
      const opts = doctorsFor(deptSel.value);
      docSel.innerHTML = opts.map((x) => `<option value="${x.id}" ${x.id === keep ? 'selected' : ''}>Dr. ${x.name} · ${x.workHours}</option>`).join('');
    }
    if (a) deptSel.value = K.doctor(a.doctorId).departmentId;
    refreshDoctors();
    deptSel.addEventListener('change', refreshDoctors);
    function save() {
      const err = b.querySelector('#af-err');
      err.hidden = true;
      if (!UI.validate(b)) return false;
      const x = UI.readForm(b);
      let patientId = a ? a.patientId : '';
      if (!a) {
        const val = b.querySelector('#af-pt').value;
        const mm = val.match(/\((PT-\d+)\)\s*$/);
        const p = mm ? K.patient(mm[1]) : d.patients.find((pp) => pp.name.toLowerCase() === val.trim().toLowerCase());
        if (!p) { err.textContent = 'Select a patient from the list, or add them first from Patients.'; err.hidden = false; return false; }
        patientId = p.id;
      }
      try {
        if (a) { K.updateAppointment(a.id, { doctorId: x.doctorId, departmentId: x.departmentId, date: x.date, time: x.time, type: x.type, reason: x.reason, notes: x.notes }); UI.toast(`${a.id} updated`); }
        else { const n = K.createAppointment({ patientId, doctorId: x.doctorId, departmentId: x.departmentId, date: x.date, time: x.time, type: x.type, reason: x.reason, notes: x.notes }); UI.toast(`Appointment ${n.id} created for ${K.patientName(n.patientId)}`); }
        HIS.app.refresh();
      } catch (e2) { err.textContent = e2.message; err.hidden = false; return false; }
    }
  }

  HIS.modules.appointments = { title: 'Appointments', render, openForm, detail };
})();
