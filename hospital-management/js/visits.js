/* Visits: outpatient queue board and the encounter (EMR) workflow */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  const LAB_PRICE = { Hematology: 150000, Biochemistry: 180000, Urine: 120000, General: 150000 };
  const IMAGING_PRICE = { 'X-Ray': 200000, 'CT Scan': 1400000, MRI: 2500000, Ultrasound: 300000, Mammography: 650000 };
  const COMMON_TESTS = [['CBC', 'Hematology', '4.0-10.0', '10^9/L'], ['Blood glucose (fasting)', 'Biochemistry', '70-100', 'mg/dL'], ['HbA1c', 'Biochemistry', '4.0-5.6', '%'], ['Liver function (ALT/AST)', 'Biochemistry', '7-56', 'U/L'], ['Kidney function (Creatinine)', 'Biochemistry', '0.6-1.3', 'mg/dL'], ['Lipid profile', 'Biochemistry', '<200', 'mg/dL'], ['Urinalysis', 'Urine', 'Negative', ''], ['Electrolytes (Na/K/Cl)', 'Biochemistry', '135-145', 'mmol/L']];

  function render(el) {
    const d = D();
    const today = U.today();
    const todays = d.visits.filter((v) => v.date === today);
    el.innerHTML = `${UI.pageHead({ title: 'Visits', sub: 'Live outpatient queue — registration to completed visit', crumbs: [{ label: 'Visits' }],
      actions: `<label class="row"><span class="small muted">Department</span><select class="select-sm" id="vq-dept"><option value="">All</option>${d.departments.filter((x) => HIS.REF.CLINICAL_DEPTS.includes(x.id)).map((x) => `<option value="${x.id}">${x.name}</option>`).join('')}</select></label><button class="btn btn-primary" data-a="walkin">${icon('plus')}Check in patient</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(5,minmax(0,1fr))">
        ${UI.kpi({ label: "Today's visits", value: todays.length })}
        ${UI.kpi({ label: 'Waiting', value: todays.filter((v) => v.stage === 'Waiting').length, dot: 'var(--warn)' })}
        ${UI.kpi({ label: 'In consultation', value: todays.filter((v) => v.stage === 'In Consultation').length, dot: 'var(--violet)' })}
        ${UI.kpi({ label: 'Labs / Imaging', value: todays.filter((v) => v.stage === 'Labs/Imaging').length, dot: 'var(--info)' })}
        ${UI.kpi({ label: 'Completed today', value: todays.filter((v) => v.stage === 'Completed').length, dot: 'var(--success)' })}
      </div>
      <div id="vq-board"></div>`;
    el.querySelector('[data-a=walkin]').onclick = () => checkInDialog();
    const deptSel = el.querySelector('#vq-dept');
    deptSel.onchange = () => drawBoard(el.querySelector('#vq-board'), deptSel.value);
    drawBoard(el.querySelector('#vq-board'), '');
  }

  function drawBoard(host, deptId) {
    const today = U.today();
    const list = D().visits.filter((v) => v.date === today && (!deptId || v.departmentId === deptId));
    const cols = K.VISIT_STAGES;
    host.innerHTML = `<div class="queue-board">${cols.map((stage) => {
      const items = list.filter((v) => v.stage === stage);
      return `<div class="queue-col"><div class="queue-col-head"><span>${stage}</span><span class="count">${items.length}</span></div>
        <div class="queue-col-body">${items.length ? items.map((v) => `<button type="button" class="queue-card" data-v="${v.id}"><div class="qc-top"><span class="qc-num">#${v.queueNumber}</span></div><div class="qc-name">${U.esc(K.patientName(v.patientId))}</div><div class="qc-meta">${U.esc(K.doctorName(v.doctorId))}</div><div class="qc-meta">${U.esc(K.departmentName(v.departmentId))}</div></button>`).join('') : `<p class="tiny muted" style="padding:8px">No patients</p>`}</div></div>`;
    }).join('')}</div>`;
    host.onclick = (e) => { const c = e.target.closest('[data-v]'); if (c) openVisit(c.dataset.v); };
  }

  function checkInDialog() {
    const d = D();
    const patientLabel = (p) => `${p.name} · ${p.phone} (${p.id})`;
    const today = U.today();
    const apptToday = d.appointments.filter((a) => a.date === today && a.status === 'Scheduled');
    UI.modal({
      title: 'Check in patient', size: 'md',
      body: `<datalist id="ci-pt-dl">${d.patients.map((p) => `<option value="${U.esc(patientLabel(p))}">`).join('')}</datalist>
        ${apptToday.length ? `<div class="field mb-2"><label for="ci-appt">From today's appointment</label><select id="ci-appt"><option value="">— Walk-in (no appointment) —</option>${apptToday.map((a) => `<option value="${a.id}">${a.time} · ${K.patientName(a.patientId)} · ${K.doctorName(a.doctorId)}</option>`).join('')}</select></div>` : ''}
        <div id="ci-walkin">${UI.form([
          { name: 'pt', label: 'Patient', placeholder: 'Type a name or phone number' },
          { name: 'departmentId', label: 'Department', type: 'select', options: d.departments.filter((x) => HIS.REF.CLINICAL_DEPTS.includes(x.id)).map((x) => ({ value: x.id, label: x.name })) },
          { name: 'doctorId', label: 'Doctor', type: 'select', options: [] },
          { name: 'reason', label: 'Reason for visit', span: 2 }
        ])}</div>
        <p class="form-error mt-1" id="ci-err" hidden></p>`,
      actions: [{ label: 'Cancel' }, { label: 'Check in', kind: 'primary', onClick: (ctx) => {
        const err = ctx.body.querySelector('#ci-err');
        const apptSel = ctx.body.querySelector('#ci-appt');
        if (apptSel && apptSel.value) { try { const v = K.checkIn({ appointmentId: apptSel.value }); UI.toast(`Checked in · queue #${v.queueNumber}`); HIS.app.refresh(); } catch (e) { err.textContent = e.message; err.hidden = false; return false; } return; }
        const ptInput = ctx.body.querySelector('[name=pt]').value;
        const mm = ptInput.match(/\((PT-\d+)\)\s*$/);
        const p = mm ? K.patient(mm[1]) : d.patients.find((pp) => pp.name.toLowerCase() === ptInput.trim().toLowerCase());
        const doctorId = ctx.body.querySelector('[name=doctorId]').value;
        if (!p) { err.textContent = 'Select a patient from the list.'; err.hidden = false; return false; }
        if (!doctorId) { err.textContent = 'Select a doctor.'; err.hidden = false; return false; }
        try { const v = K.checkIn({ patientId: p.id, doctorId, departmentId: ctx.body.querySelector('[name=departmentId]').value, reason: ctx.body.querySelector('[name=reason]').value }); UI.toast(`${p.name} checked in · queue #${v.queueNumber}`); HIS.app.refresh(); }
        catch (e) { err.textContent = e.message; err.hidden = false; return false; }
      } }],
      onMount: (ctx) => {
        const dsel = ctx.body.querySelector('[name=departmentId]'), docsel = ctx.body.querySelector('[name=doctorId]');
        const refresh = () => { docsel.innerHTML = d.doctors.filter((x) => x.departmentId === dsel.value).map((x) => `<option value="${x.id}">Dr. ${x.name}</option>`).join(''); };
        dsel.addEventListener('change', refresh); refresh();
        const apptSel = ctx.body.querySelector('#ci-appt');
        const walkinBox = ctx.body.querySelector('#ci-walkin');
        ctx.body.querySelector('[name=pt]').setAttribute('list', 'ci-pt-dl');
        if (apptSel) apptSel.addEventListener('change', () => { walkinBox.style.display = apptSel.value ? 'none' : ''; });
      }
    });
  }

  function flowStrip(v) {
    const order = ['Waiting', 'In Consultation', 'Labs/Imaging', 'Billing', 'Completed'];
    const idx = order.indexOf(v.stage);
    return `<div class="flow-strip">${order.map((s, i) => `<span class="flow-step ${i < idx ? 'done' : i === idx ? 'current' : ''}">${i < idx ? icon('check', 'ico-sm') : ''}${s}</span>${i < order.length - 1 ? `<span class="flow-arrow">${icon('chevron')}</span>` : ''}`).join('')}</div>`;
  }

  function openVisit(id) {
    let v = K.visit(id);
    if (!v) return;
    const draw = () => {
      v = K.visit(id);
      const p = K.patient(v.patientId);
      const labs = v.labOrderIds.map(K.labOrder);
      const imgs = v.imagingOrderIds.map(K.imagingOrder);
      const rx = v.prescriptionId ? K.rx(v.prescriptionId) : null;
      const inv = v.invoiceId ? K.invoice(v.invoiceId) : null;
      const vt = v.vitals || {};
      const acts = [];
      const nextStages = K.visitNextStages(v);
      if (nextStages.includes('In Consultation')) acts.push(['In Consultation', 'Start consultation', 'primary']);
      if (nextStages.includes('Labs/Imaging')) acts.push(['Labs/Imaging', 'Send for labs / imaging', '']);
      if (nextStages.includes('Billing')) acts.push(['Billing', 'Proceed to billing', '']);
      if (nextStages.includes('Completed')) acts.push(['Completed', inv ? 'Complete visit' : 'Generate invoice & complete', 'primary']);
      if (nextStages.includes('Cancelled')) acts.push(['Cancelled', 'Cancel visit', 'danger']);
      ctx.setTitle(`Visit ${v.id} · Queue #${v.queueNumber}`);
      ctx.body.innerHTML = `
        <div class="row-between mb-1"><div class="row"><a class="strong" href="#/patients/${p.id}">${U.esc(p.name)}</a><span class="small muted">${U.age(p.dob)}y · ${p.gender}</span></div>${U.badge(v.stage)}</div>
        <p class="small muted mb-2">${U.esc(K.doctorName(v.doctorId))} · ${U.esc(K.departmentName(v.departmentId))} · Checked in ${U.fmtDateTime(v.checkinTime)}</p>
        ${flowStrip(v)}
        ${p.allergies.length ? `<div class="alert danger mb-2">${icon('alert')}<p><strong>Allergies:</strong> ${p.allergies.map(U.esc).join(', ')}</p></div>` : ''}
        <h3 class="form-section">Vital signs</h3>
        <div class="vitals-grid mb-2" id="vs-vitals">
          ${['bp:BP', 'hr:HR (bpm)', 'temp:Temp (°C)', 'rr:RR', 'spo2:SpO2 (%)', 'height:Height (cm)', 'weight:Weight (kg)'].map((f) => { const [k, l] = f.split(':'); return `<label class="vital-tile"><span>${l}</span><input data-vit="${k}" value="${U.esc(vt[k] || '')}" style="border:0;background:none;text-align:center;font-weight:700;padding:0;height:auto"></label>`; }).join('')}
          <div class="vital-tile"><span>BMI</span><strong id="vs-bmi">${vt.bmi || '—'}</strong></div>
        </div>
        <h3 class="form-section">Encounter</h3>
        ${UI.form([
          { name: 'chiefComplaint', label: 'Chief complaint', span: 2 },
          { name: 'symptoms', label: 'Symptoms', type: 'textarea', span: 2, rows: 2 },
          { name: 'diagnosis', label: 'Diagnosis' }, { name: 'icd10', label: 'ICD-10 code' },
          { name: 'diagnosisType', label: 'Diagnosis type', type: 'select', options: ['Primary', 'Secondary'] },
          { name: 'followUpDate', label: 'Follow-up date', type: 'date' },
          { name: 'treatmentPlan', label: 'Treatment plan', type: 'textarea', span: 2, rows: 2 },
          { name: 'doctorNotes', label: "Doctor's notes", type: 'textarea', span: 2, rows: 2 }
        ], v)}
        <button class="btn btn-sm mt-1" id="vs-save-enc">${icon('check')}Save encounter</button>
        <h3 class="form-section mt-2">Laboratory & imaging</h3>
        <div class="list mb-1">${labs.concat(imgs).length ? labs.map((l) => `<div class="list-item"><span class="avatar sm">${icon('lab')}</span><div class="grow"><div class="title">${U.esc(l.testName)}</div><div class="sub">${l.category}</div></div>${U.badge(l.status)}</div>`).join('') + imgs.map((im) => `<div class="list-item"><span class="avatar sm">${icon('imaging')}</span><div class="grow"><div class="title">${U.esc(im.studyType)} — ${U.esc(im.bodyPart)}</div></div>${U.badge(im.status)}</div>`).join('') : '<p class="tiny muted">No orders yet</p>'}</div>
        <div class="row"><button class="btn btn-sm" id="vs-order-lab">${icon('plus')}Order lab test</button><button class="btn btn-sm" id="vs-order-img">${icon('plus')}Order imaging</button></div>
        <h3 class="form-section mt-2">Prescription</h3>
        ${rx ? `<div class="rx-lines mb-1">${rx.items.map((it) => `<div class="rx-line"><span>${U.esc(it.medicineName)} — ${it.dosage}, ${it.frequency}, ${it.duration}</span><span>${U.badge(rx.status)}</span></div>`).join('')}</div><a class="small" href="#/prescriptions/${rx.id}">Open prescription ${rx.id}</a>` : `<button class="btn btn-sm" id="vs-order-rx">${icon('plus')}Create prescription</button>`}
        <h3 class="form-section mt-2">Billing</h3>
        ${inv ? `<div class="folio"><div class="folio-line"><span>Subtotal</span><span>${U.money(inv.subtotal)}</span></div><div class="folio-line"><span>Insurance covered</span><span class="neg">-${U.money(inv.insuranceCovered)}</span></div><div class="folio-line rule total"><span>Patient payable</span><span>${U.money(inv.patientPayable)}</span></div></div><a class="small" href="#/billing/${inv.id}">Open invoice ${inv.id}</a>` : `<p class="tiny muted">Invoice will be generated when the visit is completed.</p>`}
        <div class="row mt-2" id="vs-stage-acts">${acts.map((a) => `<button class="btn btn-sm ${a[2] ? 'btn-' + a[2] : ''}" data-stage="${a[0]}">${a[1]}</button>`).join('')}</div>`;
      const bmiCalc = () => { const h = Number(ctx.body.querySelector('[data-vit=height]').value), w = Number(ctx.body.querySelector('[data-vit=weight]').value); ctx.body.querySelector('#vs-bmi').textContent = h && w ? (w / ((h / 100) ** 2)).toFixed(1) : '—'; };
      U.qsa('[data-vit]', ctx.body).forEach((inp) => inp.addEventListener('input', bmiCalc));
      ctx.body.querySelector('#vs-save-enc').onclick = () => {
        const vits = {}; U.qsa('[data-vit]', ctx.body).forEach((inp) => { vits[inp.dataset.vit] = inp.value; });
        vits.bmi = ctx.body.querySelector('#vs-bmi').textContent === '—' ? '' : ctx.body.querySelector('#vs-bmi').textContent;
        const fields = UI.readForm(ctx.body);
        try { K.saveEncounter(v.id, { vitals: vits, chiefComplaint: fields.chiefComplaint, symptoms: fields.symptoms, diagnosis: fields.diagnosis, icd10: fields.icd10, diagnosisType: fields.diagnosisType, followUpDate: fields.followUpDate, treatmentPlan: fields.treatmentPlan, doctorNotes: fields.doctorNotes }); UI.toast('Encounter saved'); draw(); }
        catch (e) { UI.toast(e.message, 'error'); }
      };
      ctx.body.querySelector('#vs-order-lab').onclick = () => orderLabDialog(v, draw);
      ctx.body.querySelector('#vs-order-img').onclick = () => orderImagingDialog(v, draw);
      const rxBtn = ctx.body.querySelector('#vs-order-rx');
      if (rxBtn) rxBtn.onclick = () => HIS.modules.prescriptions.openForm(null, { patientId: v.patientId, doctorId: v.doctorId, visitId: v.id, diagnosis: v.diagnosis }, draw);
      ctx.body.querySelector('#vs-stage-acts').onclick = (e) => {
        const b = e.target.closest('[data-stage]');
        if (!b) return;
        const stage = b.dataset.stage;
        try {
          if (stage === 'Completed' && !v.invoiceId) {
            const items = buildInvoiceItems(v);
            const invx = K.generateInvoice({ patientId: v.patientId, visitId: v.id, items });
            v.invoiceId = invx.id;
          }
          K.setVisitStage(v.id, stage);
          UI.toast(`Visit moved to ${stage}`);
          if (stage === 'Completed' || stage === 'Cancelled') { ctx.close(); HIS.app.refresh(); } else draw();
        } catch (e2) { UI.toast(e2.message, 'error'); }
      };
    };
    const ctx = UI.modal({ title: `Visit ${v.id}`, size: 'lg', body: '' });
    draw();
  }

  function buildInvoiceItems(v) {
    const items = [];
    const doc = K.doctor(v.doctorId);
    if (doc) items.push({ category: 'Consultation', description: `Consultation — ${doc.specialty}`, qty: 1, unitPrice: doc.consultationFee });
    v.labOrderIds.map(K.labOrder).forEach((l) => items.push({ category: 'Laboratory', description: l.testName, qty: 1, unitPrice: LAB_PRICE[l.category] || 150000 }));
    v.imagingOrderIds.map(K.imagingOrder).forEach((im) => items.push({ category: 'Imaging', description: `${im.studyType} — ${im.bodyPart}`, qty: 1, unitPrice: IMAGING_PRICE[im.studyType] || 300000 }));
    if (v.prescriptionId) { const rx = K.rx(v.prescriptionId); if (rx) rx.items.forEach((it) => items.push({ category: 'Medicine', description: it.medicineName, qty: it.qty, unitPrice: it.unitPrice })); }
    return items;
  }

  function orderLabDialog(v, after) {
    UI.modal({
      title: 'Order laboratory test', size: 'sm',
      body: `<div class="field"><label for="ol-test">Test</label><select id="ol-test">${COMMON_TESTS.map((t) => `<option value="${t[0]}">${t[0]}</option>`).join('')}<option value="__custom">Other (type below)</option></select></div>
        <div class="field mt-1" id="ol-custom-box" hidden><label for="ol-custom">Custom test name</label><input id="ol-custom"></div>`,
      actions: [{ label: 'Cancel' }, { label: 'Order test', kind: 'primary', onClick: (ctx) => {
        const sel = ctx.body.querySelector('#ol-test').value;
        const t = COMMON_TESTS.find((x) => x[0] === sel);
        const name = sel === '__custom' ? ctx.body.querySelector('#ol-custom').value.trim() : sel;
        if (!name) return false;
        K.orderLabTest({ patientId: v.patientId, doctorId: v.doctorId, visitId: v.id, testName: name, category: t ? t[1] : 'General', unit: t ? t[3] : '', referenceRange: t ? t[2] : '' });
        UI.toast('Lab test ordered'); after();
      } }],
      onMount: (ctx) => { ctx.body.querySelector('#ol-test').addEventListener('change', (e) => { ctx.body.querySelector('#ol-custom-box').hidden = e.target.value !== '__custom'; }); }
    });
  }
  function orderImagingDialog(v, after) {
    UI.modal({
      title: 'Order medical imaging', size: 'sm',
      body: UI.form([{ name: 'studyType', label: 'Study type', type: 'select', options: K.IMAGING_TYPES }, { name: 'bodyPart', label: 'Body part / area', placeholder: 'Chest' }]),
      actions: [{ label: 'Cancel' }, { label: 'Order imaging', kind: 'primary', onClick: (ctx) => { const x = UI.readForm(ctx.body); K.orderImaging({ patientId: v.patientId, doctorId: v.doctorId, visitId: v.id, studyType: x.studyType, bodyPart: x.bodyPart }); UI.toast('Imaging ordered'); after(); } }]
    });
  }

  HIS.modules.visits = { title: 'Visits', render, openVisit, checkInDialog, buildInvoiceItems };
})();
