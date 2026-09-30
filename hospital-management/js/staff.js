/* Staff: doctors, nurses, pharmacists, technicians, receptionists, accountants, administrators */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  function allStaff() {
    const d = D();
    const docs = d.doctors.map((x) => ({ id: x.id, name: x.name, role: 'Doctor', department: K.departmentName(x.departmentId), position: x.specialty, phone: x.phone, email: x.email, status: x.status === 'On Leave' ? 'On Leave' : 'Active', isDoctor: true }));
    const others = d.staff.map((s) => ({ id: s.id, name: s.name, role: s.role, department: s.department, position: s.position, phone: s.phone, email: s.email, status: s.status, isDoctor: false }));
    return docs.concat(others);
  }

  function render(el) {
    const list = allStaff();
    el.innerHTML = `${UI.pageHead({ title: 'Staff', sub: 'All hospital personnel', crumbs: [{ label: 'Staff' }], actions: `<button class="btn btn-primary" data-a="add">${icon('plus')}Add staff</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Total staff', value: list.length })}
        ${UI.kpi({ label: 'Doctors', value: list.filter((x) => x.role === 'Doctor').length })}
        ${UI.kpi({ label: 'Nurses', value: list.filter((x) => x.role === 'Nurse').length })}
        ${UI.kpi({ label: 'On leave', value: list.filter((x) => x.status === 'On Leave').length })}
      </div><div id="st-table"></div>`;
    el.querySelector('[data-a=add]').onclick = () => openForm();
    UI.dataTable(el.querySelector('#st-table'), {
      rows: () => list, exportName: 'staff', sort: 'name',
      searchPlaceholder: 'Name, role, department',
      searchText: (x) => `${x.id} ${x.name} ${x.role} ${x.department}`,
      filters: [{ key: 'role', label: 'Role', options: ['Doctor', 'Nurse', 'Pharmacist', 'Technician', 'Receptionist', 'Accountant', 'Administrator'] }, { key: 'status', label: 'Status', options: ['Active', 'On Leave', 'Inactive'] }],
      columns: [
        { key: 'name', label: 'Staff', render: (x) => `<div class="cell-person"><span class="avatar sm">${U.initials(x.name)}</span><div><div class="cell-main">${x.isDoctor ? 'Dr. ' : ''}${U.esc(x.name)}</div><div class="cell-sub">${x.id}</div></div></div>` },
        { key: 'role', label: 'Role', render: (x) => U.badge(x.role, 'info') },
        { key: 'department', label: 'Department' }, { key: 'position', label: 'Position' }, { key: 'phone', label: 'Phone' },
        { key: 'status', label: 'Status', render: (x) => U.badge(x.status) }
      ],
      rowActions: () => `<button class="btn btn-xs" data-act="open">Open</button>`,
      onAction: (a, x) => (x.isDoctor ? HIS.app.go(`#/doctors/${x.id}`) : openForm(x.id)),
      onRowClick: (x) => (x.isDoctor ? HIS.app.go(`#/doctors/${x.id}`) : openForm(x.id))
    });
  }

  function openForm(id) {
    const s = id ? D().staff.find((x) => x.id === id) : null;
    UI.modal({
      title: s ? `Edit ${s.name}` : 'Add staff', size: 'md',
      body: UI.form([
        { name: 'name', label: 'Full name', required: true, span: 2 },
        { name: 'role', label: 'Role', type: 'select', options: ['Nurse', 'Pharmacist', 'Technician', 'Receptionist', 'Accountant', 'Administrator'] },
        { name: 'department', label: 'Department' }, { name: 'position', label: 'Position' },
        { name: 'phone', label: 'Phone', type: 'tel', required: true }, { name: 'email', label: 'Email', type: 'email' },
        { name: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Afternoon', 'Night', 'Office'] },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave', 'Inactive'] }
      ], s || { role: 'Nurse', status: 'Active', shift: 'Morning' }),
      actions: [{ label: 'Cancel' }, { label: s ? 'Save staff' : 'Add staff', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        const d = D();
        if (s) Object.assign(s, v);
        else d.staff.push(Object.assign({ id: 'STF-' + String(200 + d.staff.length + 1), joined: U.today() }, v));
        HIS.store.commit(); UI.toast('Staff record saved'); HIS.app.refresh();
      } }]
    });
  }

  HIS.modules.staff = { title: 'Staff', render, openForm };
})();
