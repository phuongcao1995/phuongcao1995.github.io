/* Medical Records: searchable EMR repository (completed visits) with print */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  function render(el, params) {
    const d = D();
    const completed = d.visits.filter((v) => v.stage === 'Completed');
    el.innerHTML = `${UI.pageHead({ title: 'Medical Records', sub: 'Electronic medical records from completed encounters', crumbs: [{ label: 'Medical Records' }] })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Total records', value: completed.length })}
        ${UI.kpi({ label: 'This month', value: completed.filter((v) => v.date.startsWith(U.today().slice(0, 7))).length })}
        ${UI.kpi({ label: 'With follow-up due', value: completed.filter((v) => v.followUpDate && v.followUpDate >= U.today()).length })}
        ${UI.kpi({ label: 'Unique patients', value: new Set(completed.map((v) => v.patientId)).size })}
      </div><div id="rec-table"></div>`;
    UI.dataTable(el.querySelector('#rec-table'), {
      rows: () => completed.slice().sort((a, b) => b.date.localeCompare(a.date)), exportName: 'medical-records', sort: 'date', dir: 'desc',
      searchPlaceholder: 'Patient, doctor, diagnosis, ICD-10',
      searchText: (v) => `${K.patientName(v.patientId)} ${K.doctorName(v.doctorId)} ${v.diagnosis} ${v.icd10} ${v.id}`,
      filters: [{ key: 'departmentId', label: 'Department', options: d.departments.map((x) => ({ value: x.id, label: x.name })) }, { key: 'doctorId', label: 'Doctor', options: d.doctors.map((x) => ({ value: x.id, label: 'Dr. ' + x.name })) }],
      dateRange: { key: 'date', label: 'Date' },
      columns: [
        { key: 'patientId', label: 'Patient', render: (v) => `<div class="cell-main">${U.esc(K.patientName(v.patientId))}</div><div class="cell-sub">${v.patientId}</div>`, sortValue: (v) => K.patientName(v.patientId), csv: (v) => K.patientName(v.patientId) },
        { key: 'date', label: 'Date', render: (v) => U.fmtDate(v.date) },
        { key: 'doctorId', label: 'Doctor', render: (v) => K.doctorName(v.doctorId), csv: (v) => K.doctorName(v.doctorId) },
        { key: 'departmentId', label: 'Department', render: (v) => K.departmentName(v.departmentId), csv: (v) => K.departmentName(v.departmentId) },
        { key: 'diagnosis', label: 'Diagnosis', render: (v) => v.diagnosis ? `${U.esc(v.diagnosis)} <span class="cell-sub">${v.icd10}</span>` : '<span class="muted">—</span>' },
        { key: 'followUpDate', label: 'Follow-up', render: (v) => v.followUpDate ? U.fmtDate(v.followUpDate) : '—' }
      ],
      rowActions: () => `<button class="btn btn-xs" data-act="open">View</button>`,
      onAction: (a, v) => viewRecord(v.id), onRowClick: (v) => viewRecord(v.id)
    });
    if (params[0]) setTimeout(() => viewRecord(params[0]), 0);
  }

  function viewRecord(id) {
    const v = K.visit(id);
    if (!v) return UI.toast('Record not found', 'error');
    const p = K.patient(v.patientId);
    const labs = v.labOrderIds.map(K.labOrder).filter(Boolean);
    const imgs = v.imagingOrderIds.map(K.imagingOrder).filter(Boolean);
    const rx = v.prescriptionId ? K.rx(v.prescriptionId) : null;
    const vt = v.vitals || {};
    UI.modal({
      title: `Medical record — ${p.name}`, size: 'lg', className: 'invoice-doc',
      body: `<div class="invoice-head"><div><h3>${U.esc(p.name)}</h3><p class="small muted">${p.id} · ${U.age(p.dob)}y · ${U.esc(p.gender)} · Blood type ${U.esc(p.bloodType || '—')}</p></div><div class="invoice-meta"><strong>${v.id}</strong><br>${U.fmtDate(v.date)}<br>${U.esc(K.doctorName(v.doctorId))}<br>${U.esc(K.departmentName(v.departmentId))}</div></div>
        <h3 class="form-section">Vital signs</h3>
        <div class="vitals-grid mb-2">${['bp:BP', 'hr:HR', 'temp:Temp', 'rr:RR', 'spo2:SpO2', 'height:Height', 'weight:Weight', 'bmi:BMI'].map((f) => { const [k, l] = f.split(':'); return `<div class="vital-tile"><span>${l}</span><strong>${U.esc(vt[k] || '—')}</strong></div>`; }).join('')}</div>
        <dl class="dl mb-2"><dt>Chief complaint</dt><dd>${U.esc(v.chiefComplaint || '—')}</dd><dt>Symptoms</dt><dd>${U.esc(v.symptoms || '—')}</dd>
        <dt>Diagnosis</dt><dd>${v.diagnosis ? `${U.esc(v.diagnosis)} (ICD-10: ${v.icd10}) — ${v.diagnosisType}` : '—'}</dd>
        <dt>Treatment plan</dt><dd>${U.esc(v.treatmentPlan || '—')}</dd><dt>Doctor's notes</dt><dd>${U.esc(v.doctorNotes || '—')}</dd>
        <dt>Follow-up</dt><dd>${v.followUpDate ? U.fmtDate(v.followUpDate) : 'Not required'}</dd></dl>
        ${labs.length ? `<h3 class="form-section">Laboratory results</h3><div class="table-wrap mb-2"><table class="table compact"><thead><tr><th>Test</th><th>Result</th><th>Reference range</th><th>Flag</th></tr></thead><tbody>${labs.map((l) => `<tr><td>${U.esc(l.testName)}</td><td>${U.esc(l.result || '—')} ${U.esc(l.unit)}</td><td>${U.esc(l.referenceRange)}</td><td>${l.flag ? U.badge(l.flag) : '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}
        ${imgs.length ? `<h3 class="form-section">Imaging</h3><div class="list mb-2">${imgs.map((im) => `<div class="list-item"><div class="grow"><div class="title">${U.esc(im.studyType)} — ${U.esc(im.bodyPart)}</div><div class="sub">${U.esc(im.reportText || im.result || 'Pending report')}</div></div>${U.badge(im.status)}</div>`).join('')}</div>` : ''}
        ${rx ? `<h3 class="form-section">Prescription</h3><div class="rx-lines">${rx.items.map((it) => `<div class="rx-line"><span>${U.esc(it.medicineName)} — ${it.dosage}, ${it.frequency}, ${it.duration}, ${it.route}<div class="rl-meta">${U.esc(it.instructions)}</div></span></div>`).join('')}</div>` : ''}`,
      actions: [{ label: 'Close' }, { label: 'Print', kind: 'primary', icon: 'print', onClick: () => { UI.printModal(); return false; } }]
    });
  }

  HIS.modules.records = { title: 'Medical Records', render, viewRecord };
})();
