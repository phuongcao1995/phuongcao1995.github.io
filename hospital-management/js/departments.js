/* Departments: hospital department directory */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  function stats(dept) {
    const d = D(), today = U.today();
    const doctors = d.doctors.filter((x) => x.departmentId === dept.id);
    const nurses = d.staff.filter((s) => s.department && K.departmentName(dept.id).includes(s.department.replace('Nursing', '').trim()) && s.role === 'Nurse');
    const patientsToday = d.visits.filter((v) => v.departmentId === dept.id && v.date === today).length;
    const beds = d.beds.filter((b) => b.departmentId === dept.id);
    const rooms = new Set(beds.map((b) => b.room)).size;
    return { doctors, nurseCount: nurses.length, patientsToday, rooms, beds: beds.length, available: beds.filter((b) => b.status === 'Available').length };
  }

  function render(el) {
    const d = D();
    el.innerHTML = `${UI.pageHead({ title: 'Departments', sub: 'Clinical and support departments across the hospital', crumbs: [{ label: 'Departments' }] })}
      <div class="grid grid-3" id="dept-grid"></div>`;
    el.querySelector('#dept-grid').innerHTML = d.departments.map((dept) => {
      const s = stats(dept);
      const head = K.doctor(dept.headDoctorId);
      return `<div class="card" data-dept="${dept.id}" style="cursor:pointer">
        <div class="card-head"><h2>${U.esc(dept.name)}</h2>${dept.inpatient ? '<span class="badge tone-info plain">Inpatient</span>' : '<span class="badge tone-neutral plain">Outpatient</span>'}</div>
        <div class="card-body">
          <p class="small muted mb-1">${U.esc(dept.location)}</p>
          <dl class="dl">
            <dt>Head doctor</dt><dd>${head ? `Dr. ${U.esc(head.name)}` : '—'}</dd>
            <dt>Doctors</dt><dd>${s.doctors.length}</dd>
            <dt>Nurses</dt><dd>${s.nurseCount}</dd>
            <dt>Patients today</dt><dd>${s.patientsToday}</dd>
            ${dept.inpatient ? `<dt>Beds</dt><dd>${s.available} available / ${s.beds}</dd>` : ''}
            <dt>Contact</dt><dd>${U.esc(dept.phone)}</dd>
          </dl>
        </div>
      </div>`;
    }).join('');
    el.querySelector('#dept-grid').onclick = (e) => {
      const c = e.target.closest('[data-dept]');
      if (c) detail(c.dataset.dept);
    };
  }

  function detail(id) {
    const dept = K.department(id);
    const s = stats(dept);
    const head = K.doctor(dept.headDoctorId);
    UI.modal({
      title: dept.name, size: 'lg',
      body: `<dl class="dl mb-2">
          <dt>Location</dt><dd>${U.esc(dept.location)}</dd><dt>Head doctor</dt><dd>${head ? `Dr. ${U.esc(head.name)}` : '—'}</dd>
          <dt>Phone</dt><dd>${U.esc(dept.phone)}</dd><dt>Type</dt><dd>${dept.inpatient ? 'Inpatient department' : 'Outpatient / support department'}</dd>
          ${dept.inpatient ? `<dt>Beds</dt><dd>${s.available} available of ${s.beds} across ${s.rooms} rooms</dd>` : ''}
        </dl>
        <h3 class="form-section">Doctors (${s.doctors.length})</h3>
        <div class="list">${s.doctors.map((x) => `<div class="list-item"><span class="avatar sm">${U.initials(x.name)}</span><div class="grow"><div class="title">Dr. ${U.esc(x.name)}</div><div class="sub">${x.experience} yrs experience</div></div>${U.badge(x.status)}</div>`).join('') || UI.empty('No doctors assigned', '')}</div>`,
      actions: [{ label: 'Close' }, { label: 'Edit department', kind: 'primary', onClick: () => { form(dept.id); return false; } }]
    });
  }

  function form(id) {
    const dept = K.department(id);
    const d = D();
    UI.modal({
      title: `Edit ${dept.name}`, size: 'md',
      body: UI.form([
        { name: 'headDoctorId', label: 'Head doctor', type: 'select', placeholder: 'None', options: d.doctors.filter((x) => x.departmentId === dept.id).map((x) => ({ value: x.id, label: 'Dr. ' + x.name })) },
        { name: 'location', label: 'Location', span: 2 },
        { name: 'phone', label: 'Contact phone' }
      ], dept),
      actions: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: (ctx) => { Object.assign(dept, UI.readForm(ctx.body)); HIS.store.commit(); UI.toast('Department saved'); HIS.app.refresh(); } }]
    });
  }

  HIS.modules.departments = { title: 'Departments', render, detail };
})();
