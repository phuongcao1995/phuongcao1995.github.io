/* Doctors: directory, profile (schedule, fee, assigned patients, performance) */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  function render(el, params) {
    if (params[0]) return profile(el, params[0]);
    const d = D();
    el.innerHTML = `${UI.pageHead({ title: 'Doctors', sub: 'Doctor directory, specialties and working schedules', crumbs: [{ label: 'Doctors' }], actions: `<button class="btn btn-primary" data-a="add">${icon('plus')}Add doctor</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Total doctors', value: d.doctors.length })}
        ${UI.kpi({ label: 'Available now', value: d.doctors.filter((x) => x.status === 'Available').length })}
        ${UI.kpi({ label: 'On leave', value: d.doctors.filter((x) => x.status === 'On Leave').length })}
        ${UI.kpi({ label: 'Specialties', value: new Set(d.doctors.map((x) => x.specialty)).size })}
      </div><div id="dr-table"></div>`;
    el.querySelector('[data-a=add]').onclick = () => openForm();
    UI.dataTable(el.querySelector('#dr-table'), {
      rows: () => d.doctors, exportName: 'doctors', sort: 'name',
      searchPlaceholder: 'Name, specialty, phone',
      searchText: (x) => `${x.id} ${x.name} ${x.specialty} ${x.phone}`,
      filters: [{ key: 'departmentId', label: 'Department', options: d.departments.map((x) => ({ value: x.id, label: x.name })) }, { key: 'status', label: 'Status', options: ['Available', 'Busy', 'On Leave'] }],
      columns: [
        { key: 'name', label: 'Doctor', render: (x) => `<div class="cell-person"><span class="avatar sm">${U.initials(x.name)}</span><div><div class="cell-main">Dr. ${U.esc(x.name)}</div><div class="cell-sub">${x.id}</div></div></div>` },
        { key: 'specialty', label: 'Specialty' },
        { key: 'departmentId', label: 'Department', render: (x) => K.departmentName(x.departmentId), csv: (x) => K.departmentName(x.departmentId) },
        { key: 'experience', label: 'Experience', align: 'right', render: (x) => `${x.experience} yrs` },
        { key: 'phone', label: 'Phone' },
        { key: 'consultationFee', label: 'Fee', align: 'right', render: (x) => U.money(x.consultationFee) },
        { key: 'status', label: 'Status', render: (x) => U.badge(x.status) }
      ],
      rowActions: () => `<button class="btn btn-xs" data-act="open">Profile</button>`,
      onAction: (a, x) => HIS.app.go(`#/doctors/${x.id}`), onRowClick: (x) => HIS.app.go(`#/doctors/${x.id}`)
    });
  }

  function profile(el, id) {
    const x = K.doctor(id);
    if (!x) { el.innerHTML = UI.pageHead({ title: 'Doctor not found', crumbs: [{ label: 'Doctors', href: '#/doctors' }] }); return; }
    const d = D();
    const today = U.today();
    const apptsToday = d.appointments.filter((a) => a.doctorId === id && a.date === today);
    const patientsSeen = new Set(d.visits.filter((v) => v.doctorId === id && v.stage === 'Completed').map((v) => v.patientId)).size;
    const completed30 = d.visits.filter((v) => v.doctorId === id && v.stage === 'Completed' && v.date >= U.addDays(today, -30)).length;
    el.innerHTML = `${UI.pageHead({ title: `Dr. ${x.name}`, crumbs: [{ label: 'Doctors', href: '#/doctors' }, { label: x.name }], actions: `<button class="btn" data-a="edit">${icon('edit')}Edit profile</button>` })}
      <div class="card mb-2"><div class="profile-head"><span class="avatar lg">${U.initials(x.name)}</span>
        <div class="grow"><h2>Dr. ${U.esc(x.name)}</h2><div class="muted small">${U.esc(x.specialty)} · ${K.departmentName(x.departmentId)} · ${x.experience} years experience · ${U.badge(x.status)}</div><div class="mt-1">${x.certifications.map((c) => `<span class="tag">${U.esc(c)}</span>`).join('')}</div></div>
        <div class="profile-stats"><div><span>Patients seen</span><strong>${patientsSeen}</strong></div><div><span>Visits (30d)</span><strong>${completed30}</strong></div><div><span>Today's appointments</span><strong>${apptsToday.length}</strong></div><div><span>Consultation fee</span><strong>${U.moneyShort(x.consultationFee)}</strong></div></div>
      </div></div>
      <div class="grid grid-2">
        <div class="card"><div class="card-head"><h2>Profile</h2></div><div class="card-body"><dl class="dl">
          <dt>Doctor ID</dt><dd>${x.id}</dd><dt>Qualifications</dt><dd>${U.esc(x.qualifications)}</dd><dt>Phone</dt><dd>${U.esc(x.phone)}</dd><dt>Email</dt><dd>${U.esc(x.email)}</dd>
          <dt>Working days</dt><dd>${x.workDays.join(', ')}</dd><dt>Working hours</dt><dd>${x.workHours}</dd><dt>Joined</dt><dd>${U.fmtDate(x.joined)}</dd>
          <dt>Availability</dt><dd><select id="dr-status" class="select-sm">${['Available', 'Busy', 'On Leave'].map((s) => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}</select></dd>
        </dl></div></div>
        <div class="card"><div class="card-head"><h2>Today's appointments</h2></div><div class="card-body"><div class="list">${apptsToday.length ? apptsToday.map((a) => `<div class="list-item"><span class="avatar sm">${U.initials(K.patientName(a.patientId))}</span><div class="grow"><div class="title">${U.esc(K.patientName(a.patientId))}</div><div class="sub">${a.time} · ${a.type}</div></div>${U.badge(a.status)}</div>`).join('') : UI.empty('No appointments today', '')}</div></div></div>
      </div>`;
    el.onclick = (e) => { const a = e.target.closest('[data-a]'); if (a && a.dataset.a === 'edit') openForm(x.id); };
    const sel = el.querySelector('#dr-status');
    if (sel) sel.onchange = () => { x.status = sel.value; HIS.store.commit(); UI.toast(`Dr. ${x.name} marked ${x.status}`); };
  }

  function openForm(id) {
    const x = id ? K.doctor(id) : null;
    const d = D();
    UI.modal({
      title: x ? `Edit Dr. ${x.name}` : 'Add doctor', size: 'lg',
      body: UI.form([
        { name: 'name', label: 'Full name', required: true, span: 2, placeholder: 'Nguyen Minh Anh' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female'] },
        { name: 'departmentId', label: 'Department', type: 'select', options: d.departments.map((dp) => ({ value: dp.id, label: dp.name })) },
        { name: 'specialty', label: 'Specialty', required: true },
        { name: 'experience', label: 'Years of experience', type: 'number', min: 0, max: 50 },
        { name: 'consultationFee', label: 'Consultation fee (VND)', type: 'number', min: 0, step: 10000 },
        { name: 'phone', label: 'Phone', type: 'tel', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'qualifications', label: 'Qualifications', span: 2, placeholder: 'MD, Hanoi Medical University' },
        { name: 'workHours', label: 'Working hours', placeholder: '08:00–11:30, 13:30–16:30' },
        { name: 'status', label: 'Status', type: 'select', options: ['Available', 'Busy', 'On Leave'] }
      ], x || { gender: 'Male', experience: 5, consultationFee: 250000, status: 'Available', workHours: '08:00–11:30, 13:30–16:30' }),
      actions: [{ label: 'Cancel' }, { label: x ? 'Save doctor' : 'Add doctor', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        if (x) { Object.assign(x, v); HIS.store.commit(); UI.toast('Doctor profile saved'); }
        else {
          const n = Object.assign({ id: 'DR-' + String(100 + d.doctors.length + 1), certifications: [], workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], avatar: '', joined: U.today() }, v);
          d.doctors.push(n); HIS.store.commit(); UI.toast(`Dr. ${n.name} added`);
        }
        HIS.app.refresh();
      } }]
    });
  }

  HIS.modules.doctors = { title: 'Doctors', render, openForm };
})();
