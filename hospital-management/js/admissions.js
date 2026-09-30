/* Admissions: inpatient list, admit/transfer/discharge, nursing notes */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;
  const ROOM_RATE = 550000;

  function render(el, params) {
    const d = D();
    const active = d.admissions.filter((a) => a.status === 'Admitted');
    el.innerHTML = `${UI.pageHead({ title: 'Admissions', sub: 'Inpatient admissions across all wards', crumbs: [{ label: 'Admissions' }], actions: `<button class="btn btn-primary" data-a="admit">${icon('plus')}Admit patient</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Currently admitted', value: active.length })}
        ${UI.kpi({ label: 'Admitted today', value: d.admissions.filter((a) => a.admissionDate === U.today()).length })}
        ${UI.kpi({ label: 'Discharges today', value: d.admissions.filter((a) => a.actualDischarge === U.today()).length })}
        ${UI.kpi({ label: 'Avg. expected stay', value: `${Math.round(U.sum(active, (a) => U.diffDays(a.admissionDate, a.expectedDischarge)) / (active.length || 1))}d` })}
      </div><div id="ad-table"></div>`;
    el.querySelector('[data-a=admit]').onclick = () => admitDialog();
    UI.dataTable(el.querySelector('#ad-table'), {
      rows: () => d.admissions.slice().sort((a, b) => b.admissionDate.localeCompare(a.admissionDate)), exportName: 'admissions', sort: 'admissionDate', dir: 'desc',
      searchPlaceholder: 'Patient, bed, reason',
      searchText: (a) => `${a.id} ${K.patientName(a.patientId)} ${K.bedLabel(a.bedId)} ${a.reason}`,
      filters: [{ key: 'status', label: 'Status', options: ['Admitted', 'Discharged'] }, { key: 'departmentId', label: 'Department', options: d.departments.filter((x) => x.inpatient).map((x) => ({ value: x.id, label: x.name })) }],
      columns: [
        { key: 'patientId', label: 'Patient', render: (a) => `<div class="cell-main">${U.esc(K.patientName(a.patientId))}</div><div class="cell-sub">${a.id}</div>`, csv: (a) => K.patientName(a.patientId) },
        { key: 'bedId', label: 'Bed', render: (a) => K.bedLabel(a.bedId), csv: (a) => K.bedLabel(a.bedId) },
        { key: 'departmentId', label: 'Department', render: (a) => K.departmentName(a.departmentId), csv: (a) => K.departmentName(a.departmentId) },
        { key: 'doctorId', label: 'Doctor', render: (a) => K.doctorName(a.doctorId), csv: (a) => K.doctorName(a.doctorId) },
        { key: 'admissionDate', label: 'Admitted', render: (a) => U.fmtDate(a.admissionDate) },
        { key: 'expectedDischarge', label: 'Expected discharge', render: (a) => U.fmtDate(a.status === 'Admitted' ? a.expectedDischarge : a.actualDischarge) },
        { key: 'status', label: 'Status', render: (a) => U.badge(a.status) }
      ],
      rowActions: () => `<button class="btn btn-xs" data-act="open">Open</button>`, onAction: (act, a) => detail(a.id), onRowClick: (a) => detail(a.id)
    });
    if (params[0]) setTimeout(() => detail(params[0]), 0);
  }

  function detail(id) {
    const draw = () => {
      const a = K.admission(id);
      const p = K.patient(a.patientId);
      ctx.setTitle(`Admission ${a.id}`);
      ctx.setActions(actionsFor(a));
      ctx.body.innerHTML = `<div class="row-between mb-1"><div><a class="strong" href="#/patients/${p.id}">${U.esc(p.name)}</a><div class="small muted">${U.age(p.dob)}y · ${U.esc(p.gender)}</div></div>${U.badge(a.status)}</div>
        <dl class="dl mb-2"><dt>Bed</dt><dd>${K.bedLabel(a.bedId)} · ${K.departmentName(a.departmentId)}</dd><dt>Attending doctor</dt><dd>${U.esc(K.doctorName(a.doctorId))}</dd>
        <dt>Admitted</dt><dd>${U.fmtDate(a.admissionDate)}</dd><dt>${a.status === 'Admitted' ? 'Expected discharge' : 'Discharged'}</dt><dd>${U.fmtDate(a.status === 'Admitted' ? a.expectedDischarge : a.actualDischarge)}</dd>
        <dt>Reason</dt><dd>${U.esc(a.reason)}</dd>${a.invoiceId ? `<dt>Invoice</dt><dd><a href="#/billing/${a.invoiceId}">${a.invoiceId}</a></dd>` : ''}</dl>
        ${UI.tabs([{ id: 'notes', label: 'Nursing notes', count: a.nursingNotes.length }, { id: 'treat', label: 'Daily treatment', count: a.dailyTreatments.length }, { id: 'meds', label: 'Medication', count: a.medications.length }], 'notes')}
        <div id="ad-tabs"></div>`;
      const tb = ctx.body.querySelector('#ad-tabs');
      const drawTab = (t) => {
        if (t === 'notes') tb.innerHTML = `<div class="timeline mb-2">${a.nursingNotes.slice().reverse().map((n) => `<div class="tl-item">${U.esc(n.note)}<small>${U.fmtDateTime(n.at)} · ${U.esc(n.by)}</small></div>`).join('') || '<p class="tiny muted">No notes yet</p>'}</div>${a.status === 'Admitted' ? `<div class="field"><textarea id="ad-note" rows="2" placeholder="Add a nursing note…"></textarea></div><button class="btn btn-sm mt-1" id="ad-add-note">Add note</button>` : ''}`;
        if (t === 'treat') tb.innerHTML = `<div class="timeline mb-2">${a.dailyTreatments.slice().reverse().map((n) => `<div class="tl-item">${U.esc(n.note)}<small>${U.fmtDateTime(n.at)} · ${U.esc(n.by)}</small></div>`).join('') || '<p class="tiny muted">No treatment logged</p>'}</div>${a.status === 'Admitted' ? `<div class="field"><textarea id="ad-treat" rows="2" placeholder="Log today's treatment…"></textarea></div><button class="btn btn-sm mt-1" id="ad-add-treat">Log treatment</button>` : ''}`;
        if (t === 'meds') tb.innerHTML = `<div class="list mb-2">${a.medications.slice().reverse().map((m) => `<div class="list-item"><div class="grow"><div class="title">${U.esc(m.medicine)}</div><div class="sub">${U.esc(m.dose)} · ${U.esc(m.route)} · ${U.fmtDateTime(m.at)} · ${U.esc(m.by)}</div></div></div>`).join('') || '<p class="tiny muted">No medication administered yet</p>'}</div>${a.status === 'Admitted' ? `<button class="btn btn-sm" id="ad-add-med">${icon('plus')}Log medication</button>` : ''}`;
        if (tb.querySelector('#ad-add-note')) tb.querySelector('#ad-add-note').onclick = () => { const v = tb.querySelector('#ad-note').value.trim(); if (v) { K.addNursingNote(a.id, v); draw(); } };
        if (tb.querySelector('#ad-add-treat')) tb.querySelector('#ad-add-treat').onclick = () => { const v = tb.querySelector('#ad-treat').value.trim(); if (v) { K.addDailyTreatment(a.id, { note: v }); draw(); } };
        if (tb.querySelector('#ad-add-med')) tb.querySelector('#ad-add-med').onclick = () => medDialog(a, draw);
      };
      UI.bindTabs(ctx.body, drawTab);
      drawTab('notes');
    };
    function actionsFor(a) {
      const list = [{ label: 'Close' }];
      if (a.status === 'Admitted') {
        list.push({ label: 'Transfer bed', onClick: () => { transferDialog(a, draw); return false; } });
        list.push({ label: 'Discharge', kind: 'primary', onClick: () => { dischargeDialog(a, () => { ctx.close(); HIS.app.refresh(); }); return false; } });
      }
      return list;
    }
    const ctx = UI.modal({ title: 'Admission', size: 'lg', body: '' });
    draw();
  }

  function medDialog(a, after) {
    UI.modal({ title: 'Log medication administration', size: 'sm',
      body: UI.form([{ name: 'medicine', label: 'Medicine', placeholder: 'e.g. Amoxicillin 500mg' }, { name: 'dose', label: 'Dose', placeholder: '1 dose' }, { name: 'route', label: 'Route', type: 'select', options: ['Oral', 'IV', 'IM', 'Topical'] }]),
      actions: [{ label: 'Cancel' }, { label: 'Log', kind: 'primary', onClick: (ctx) => { const v = UI.readForm(ctx.body); if (!v.medicine) return false; K.addMedicationAdmin(a.id, v); UI.toast('Medication logged'); after(); } }] });
  }
  function transferDialog(a, after) {
    const beds = K.availableBeds();
    UI.modal({ title: 'Transfer bed', size: 'sm',
      body: UI.form([{ name: 'bedId', label: 'New bed', type: 'select', options: beds.map((b) => ({ value: b.id, label: `${K.bedLabel(b.id)} · ${K.departmentName(b.departmentId)}` })) }]),
      actions: [{ label: 'Cancel' }, { label: 'Transfer', kind: 'primary', onClick: (ctx) => { try { K.transferAdmission(a.id, UI.readForm(ctx.body).bedId); UI.toast('Patient transferred'); after(); } catch (e) { UI.toast(e.message, 'error'); return false; } } }] });
  }
  function dischargeDialog(a, done) {
    UI.modal({ title: 'Discharge patient', size: 'sm',
      body: `<div class="field"><label for="dc-notes">Discharge summary</label><textarea id="dc-notes" rows="3" placeholder="Condition at discharge, follow-up instructions…"></textarea></div>`,
      actions: [{ label: 'Cancel' }, { label: 'Discharge & generate invoice', kind: 'primary', onClick: (ctx) => {
        const notes = ctx.body.querySelector('#dc-notes').value.trim();
        try {
          const nights = Math.max(1, U.diffDays(a.admissionDate, U.today()));
          const items = [{ category: 'Room', description: `Inpatient room — ${K.departmentName(a.departmentId)}`, qty: nights, unitPrice: ROOM_RATE }, { category: 'Procedure', description: 'Nursing care and daily monitoring', qty: 1, unitPrice: 400000 }];
          const inv = K.generateInvoice({ patientId: a.patientId, admissionId: a.id, items });
          a.invoiceId = inv.id;
          K.dischargeAdmission(a.id, notes);
          UI.toast('Patient discharged and invoice generated'); done();
        } catch (e) { UI.toast(e.message, 'error'); return false; }
      } }] });
  }
  function admitDialog() {
    const d = D();
    const patientLabel = (p) => `${p.name} · ${p.phone} (${p.id})`;
    UI.modal({
      title: 'Admit patient', size: 'md',
      body: `<datalist id="adm-pt-dl">${d.patients.map((p) => `<option value="${U.esc(patientLabel(p))}">`).join('')}</datalist>
        <div class="field mb-1"><label for="adm-pt">Patient <span class="req">*</span></label><input id="adm-pt" list="adm-pt-dl" autocomplete="off"></div>
        ${UI.form([
          { name: 'departmentId', label: 'Department', type: 'select', options: d.departments.filter((x) => x.inpatient).map((x) => ({ value: x.id, label: x.name })) },
          { name: 'doctorId', label: 'Attending doctor', type: 'select', options: [] },
          { name: 'bedId', label: 'Bed', type: 'select', options: [] },
          { name: 'expectedDischarge', label: 'Expected discharge', type: 'date', value: U.addDays(U.today(), 3) },
          { name: 'reason', label: 'Reason for admission', span: 2 }
        ])}<p class="form-error mt-1" id="adm-err" hidden></p>`,
      actions: [{ label: 'Cancel' }, { label: 'Admit patient', kind: 'primary', onClick: (ctx) => {
        const err = ctx.body.querySelector('#adm-err');
        const val = ctx.body.querySelector('#adm-pt').value;
        const mm = val.match(/\((PT-\d+)\)\s*$/);
        const p = mm ? K.patient(mm[1]) : d.patients.find((pp) => pp.name.toLowerCase() === val.trim().toLowerCase());
        if (!p) { err.textContent = 'Select a patient from the list.'; err.hidden = false; return false; }
        const x = UI.readForm(ctx.body);
        try { K.admit({ patientId: p.id, doctorId: x.doctorId, departmentId: x.departmentId, bedId: x.bedId, expectedDischarge: x.expectedDischarge, reason: x.reason }); UI.toast(`${p.name} admitted`); HIS.app.refresh(); }
        catch (e) { err.textContent = e.message; err.hidden = false; return false; }
      } }],
      onMount: (ctx) => {
        const dsel = ctx.body.querySelector('[name=departmentId]'), docsel = ctx.body.querySelector('[name=doctorId]'), bedsel = ctx.body.querySelector('[name=bedId]');
        const refresh = () => { docsel.innerHTML = d.doctors.filter((x) => x.departmentId === dsel.value).map((x) => `<option value="${x.id}">Dr. ${x.name}</option>`).join(''); bedsel.innerHTML = K.availableBeds(dsel.value).map((b) => `<option value="${b.id}">${K.bedLabel(b.id)}</option>`).join('') || '<option value="">No beds available</option>'; };
        dsel.addEventListener('change', refresh); refresh();
      }
    });
  }

  HIS.modules.admissions = { title: 'Admissions', render, detail, admitDialog };
})();
