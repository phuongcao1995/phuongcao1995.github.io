/* Patients: directory, profile (personal, medical, insurance, timeline) */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  function visitCount(p) { return D().visits.filter((v) => v.patientId === p.id && v.stage === 'Completed').length; }
  function totalSpend(p) { return U.sum(D().invoices.filter((i) => i.patientId === p.id), (i) => K.invoicePaid(i)); }

  function render(el, params) {
    if (params[0]) return profile(el, params[0]);
    const d = D();
    const insured = d.patients.filter((p) => p.insurance && p.insurance.number).length;
    el.innerHTML = `${UI.pageHead({ title: 'Patients', sub: 'Patient directory, medical profiles and visit history', crumbs: [{ label: 'Patients' }], actions: `<button class="btn btn-primary" data-a="add">${icon('plus')}Add patient</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Total patients', value: U.num(d.patients.length) })}
        ${UI.kpi({ label: 'Active', value: d.patients.filter((p) => p.status === 'Active').length })}
        ${UI.kpi({ label: 'With insurance', value: insured, meta: U.pct((insured / (d.patients.length || 1)) * 100) })}
        ${UI.kpi({ label: 'Seen in last 30 days', value: d.patients.filter((p) => p.lastVisit && p.lastVisit >= U.addDays(U.today(), -30)).length })}
      </div><div id="p-table"></div>`;
    el.querySelector('[data-a=add]').onclick = () => openForm();
    UI.dataTable(el.querySelector('#p-table'), {
      rows: () => d.patients, exportName: 'patients', sort: 'name',
      searchPlaceholder: 'Name, phone, email, patient ID',
      searchText: (p) => `${p.id} ${p.name} ${p.phone} ${p.email}`,
      filters: [{ key: 'gender', label: 'Gender', options: ['Male', 'Female'] }, { key: 'status', label: 'Status', options: ['Active', 'Inactive'] }, { key: 'ins', label: 'Insurance', options: ['Insured', 'Uninsured'], match: (p, v) => (v === 'Insured') === !!(p.insurance && p.insurance.number) }],
      columns: [
        { key: 'name', label: 'Patient', render: (p) => `<div class="cell-person"><span class="avatar sm">${U.initials(p.name)}</span><div><div class="cell-main">${U.esc(p.name)}</div><div class="cell-sub">${p.id}</div></div></div>` },
        { key: 'gender', label: 'Gender', render: (p) => U.badge(p.gender) },
        { key: 'dob', label: 'Date of birth', render: (p) => `${U.fmtDate(p.dob)} <span class="cell-sub">(${U.age(p.dob)}y)</span>` },
        { key: 'phone', label: 'Phone' },
        { key: 'nationality', label: 'Nationality' },
        { key: 'ins', label: 'Insurance', render: (p) => p.insurance && p.insurance.number ? U.badge(p.insurance.validTo >= U.today() ? 'Active' : 'Expired') : '<span class="muted small">None</span>', sort: false, csv: (p) => (p.insurance && p.insurance.number) || '' },
        { key: 'lastVisit', label: 'Last visit', render: (p) => U.fmtDate(p.lastVisit) },
        { key: 'status', label: 'Status', render: (p) => U.badge(p.status) }
      ],
      rowActions: () => `<button class="btn btn-xs" data-act="open">Profile</button>`,
      onAction: (a, p) => HIS.app.go(`#/patients/${p.id}`), onRowClick: (p) => HIS.app.go(`#/patients/${p.id}`)
    });
  }

  function profile(el, id, tab = 'personal') {
    const p = K.patient(id);
    if (!p) { el.innerHTML = UI.pageHead({ title: 'Patient not found', crumbs: [{ label: 'Patients', href: '#/patients' }] }); return; }
    const visits = D().visits.filter((v) => v.patientId === p.id).sort((a, b) => b.date.localeCompare(a.date));
    const admissions = D().admissions.filter((a) => a.patientId === p.id);
    const invoices = D().invoices.filter((i) => i.patientId === p.id);
    el.innerHTML = `${UI.pageHead({ title: p.name, crumbs: [{ label: 'Patients', href: '#/patients' }, { label: p.name }], actions: `<button class="btn" data-a="edit">${icon('edit')}Edit profile</button><button class="btn btn-primary" data-a="appt">${icon('plus')}New appointment</button>` })}
      <div class="card mb-2"><div class="profile-head"><span class="avatar lg">${U.initials(p.name)}</span>
        <div class="grow"><h2>${U.esc(p.name)}</h2><div class="muted small">${U.esc(p.gender)} · ${U.age(p.dob)} years old · ${U.esc(p.nationality)} · ${U.badge(p.status)}</div><div class="mt-1">${p.bloodType ? `<span class="tag">Blood type ${U.esc(p.bloodType)}</span>` : ''}${p.allergies.map((a) => `<span class="tag" style="background:var(--danger-soft);color:var(--danger)">Allergy: ${U.esc(a)}</span>`).join('')}${p.chronicConditions.map((c) => `<span class="tag">${U.esc(c)}</span>`).join('')}</div></div>
        <div class="profile-stats"><div><span>Completed visits</span><strong>${visitCount(p)}</strong></div><div><span>Admissions</span><strong>${admissions.length}</strong></div><div><span>Total paid</span><strong>${U.moneyShort(totalSpend(p))}</strong></div><div><span>Last visit</span><strong>${p.lastVisit ? U.fmtDate(p.lastVisit) : '—'}</strong></div></div>
      </div></div>
      ${UI.tabs([{ id: 'personal', label: 'Personal information' }, { id: 'medical', label: 'Medical information' }, { id: 'insurance', label: 'Insurance' }, { id: 'timeline', label: 'Timeline', count: visits.length + admissions.length }], tab)}
      <div id="pp-body"></div>`;
    const body = el.querySelector('#pp-body');
    const draw = (t) => {
      if (t === 'personal') body.innerHTML = `<div class="card"><div class="card-body"><dl class="dl">
        <dt>Patient ID</dt><dd>${p.id}</dd><dt>Full name</dt><dd>${U.esc(p.name)}</dd><dt>Date of birth</dt><dd>${U.fmtDate(p.dob)} (${U.age(p.dob)}y)</dd><dt>Gender</dt><dd>${U.esc(p.gender)}</dd>
        <dt>Phone</dt><dd>${U.esc(p.phone)}</dd><dt>Email</dt><dd>${U.esc(p.email || '—')}</dd><dt>Address</dt><dd>${U.esc(p.address || '—')}</dd><dt>Nationality</dt><dd>${U.esc(p.nationality)}</dd>
        <dt>Emergency contact</dt><dd>${U.esc(p.emergencyContact || '—')}</dd><dt>Notes</dt><dd>${U.esc(p.notes || '—')}</dd></dl></div></div>`;
      if (t === 'medical') body.innerHTML = `<div class="card"><div class="card-body"><dl class="dl">
        <dt>Blood type</dt><dd>${U.esc(p.bloodType || '—')}</dd>
        <dt>Allergies</dt><dd>${p.allergies.length ? p.allergies.map(U.esc).join(', ') : 'None known'}</dd>
        <dt>Chronic conditions</dt><dd>${p.chronicConditions.length ? p.chronicConditions.map(U.esc).join(', ') : 'None'}</dd>
        <dt>Previous surgeries</dt><dd>${p.surgeries.length ? p.surgeries.map(U.esc).join(', ') : 'None'}</dd>
        <dt>Current medications</dt><dd>${p.medications.length ? p.medications.map(U.esc).join(', ') : 'None'}</dd></dl></div></div>`;
      if (t === 'insurance') {
        const ins = p.insurance;
        body.innerHTML = ins && ins.number ? `<div class="card"><div class="card-body"><dl class="dl">
          <dt>Provider</dt><dd>${U.esc(ins.provider)}</dd><dt>Insurance number</dt><dd>${U.esc(ins.number)}</dd>
          <dt>Valid from</dt><dd>${U.fmtDate(ins.validFrom)}</dd><dt>Valid until</dt><dd>${U.fmtDate(ins.validTo)}</dd>
          <dt>Coverage</dt><dd>${ins.coveragePct}% of eligible charges</dd><dt>Status</dt><dd>${U.badge(ins.validTo >= U.today() ? 'Active' : 'Expired')}</dd>
          <dt>Referral hospital</dt><dd>${U.esc(ins.referralHospital || '—')}</dd></dl></div></div>` : `<div class="card">${UI.empty('No insurance on file', 'Add insurance details from Edit profile.')}</div>`;
      }
      if (t === 'timeline') {
        const items = [];
        visits.filter((v) => v.stage === 'Completed').forEach((v) => items.push({ date: v.date, html: `<div class="tl-item"><strong>Visit</strong> — ${U.esc(K.doctorName(v.doctorId))} · ${U.esc(K.departmentName(v.departmentId))}<br>${v.diagnosis ? `Diagnosis: ${U.esc(v.diagnosis)} (${v.icd10})` : 'No diagnosis recorded'}<small>${U.fmtDate(v.date)} · ${v.id}</small></div>` }));
        admissions.forEach((a) => items.push({ date: a.admissionDate, html: `<div class="tl-item"><strong>Admission</strong> — ${U.esc(K.bedLabel(a.bedId))} · ${U.esc(a.reason)}<br>${a.status === 'Discharged' ? `Discharged ${U.fmtDate(a.actualDischarge)}` : 'Currently admitted'}<small>${U.fmtDate(a.admissionDate)} · ${a.id}</small></div>` }));
        items.sort((x, y) => y.date.localeCompare(x.date));
        body.innerHTML = `<div class="card"><div class="card-body">${items.length ? `<div class="timeline">${items.map((i) => i.html).join('')}</div>` : UI.empty('No visits or admissions yet', '')}</div></div>`;
      }
    };
    UI.bindTabs(el, draw);
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]');
      if (!a) return;
      if (a.dataset.a === 'edit') openForm(p.id);
      if (a.dataset.a === 'appt') HIS.modules.appointments.openForm(null, { patientId: p.id });
    };
    draw(tab);
  }

  function openForm(id) {
    const p = id ? K.patient(id) : null;
    const v = p || { gender: 'Male', nationality: 'Vietnamese', status: 'Active' };
    UI.modal({
      title: p ? `Edit ${p.name}` : 'Add patient', size: 'lg',
      body: `<h3 class="form-section">Personal information</h3>${UI.form([
        { name: 'name', label: 'Full name', required: true, span: 2, placeholder: 'Tran Thi Mai' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
        { name: 'dob', label: 'Date of birth', type: 'date', max: U.today() },
        { name: 'phone', label: 'Phone', type: 'tel', required: true, pattern: '\\+?[0-9 ]{9,14}' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'nationality', label: 'Nationality' },
        { name: 'address', label: 'Address', span: 2 },
        { name: 'emergencyContact', label: 'Emergency contact', span: 2, placeholder: 'Name · phone number' },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
      ], v)}
      <h3 class="form-section mt-2">Medical information</h3>${UI.form([
        { name: 'bloodType', label: 'Blood type', type: 'select', placeholder: 'Unknown', options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
        { name: 'allergies', label: 'Allergies (comma separated)', span: 1, value: p ? p.allergies.join(', ') : '' },
        { name: 'chronicConditions', label: 'Chronic conditions (comma separated)', span: 2, value: p ? p.chronicConditions.join(', ') : '' },
        { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 2 }
      ], v)}
      <h3 class="form-section mt-2">Insurance</h3>${UI.form([
        { name: 'insProvider', label: 'Provider', type: 'select', placeholder: 'None', options: HIS.REF.INSURANCE_PROVIDERS, value: p ? p.insurance.provider : '' },
        { name: 'insNumber', label: 'Insurance number', value: p ? p.insurance.number : '' },
        { name: 'insFrom', label: 'Valid from', type: 'date', value: p ? p.insurance.validFrom : '' },
        { name: 'insTo', label: 'Valid until', type: 'date', value: p ? p.insurance.validTo : '' },
        { name: 'insPct', label: 'Coverage %', type: 'number', min: 0, max: 100, value: p ? p.insurance.coveragePct : 80 },
        { name: 'insReferral', label: 'Referral hospital', value: p ? p.insurance.referralHospital : '' }
      ])}`,
      actions: [{ label: 'Cancel' }, { label: p ? 'Save patient' : 'Add patient', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        const data = {
          name: x.name, gender: x.gender, dob: x.dob, phone: x.phone, email: x.email, nationality: x.nationality, address: x.address,
          emergencyContact: x.emergencyContact, status: x.status, bloodType: x.bloodType, notes: x.notes,
          allergies: x.allergies.split(',').map((s) => s.trim()).filter(Boolean), chronicConditions: x.chronicConditions.split(',').map((s) => s.trim()).filter(Boolean),
          insurance: { provider: x.insProvider, number: x.insNumber, validFrom: x.insFrom, validTo: x.insTo, coveragePct: x.insPct || 0, referralHospital: x.insReferral }
        };
        if (p) { p.surgeries = p.surgeries || []; p.medications = p.medications || []; Object.assign(p, data); HIS.store.commit(); UI.toast('Patient profile saved'); HIS.app.refresh(); }
        else { const n = K.createPatient(data); UI.toast(`Patient ${n.name} added (${n.id})`); setTimeout(() => HIS.app.go(`#/patients/${n.id}`), 10); }
      } }]
    });
  }

  HIS.modules.patients = { title: 'Patients', render, openForm };
})();
