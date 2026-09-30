/* Prescriptions: create, dispense, cancel, print */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  function render(el, params) {
    const d = D();
    el.innerHTML = `${UI.pageHead({ title: 'Prescriptions', sub: 'Prescribed medicines and dispensing status', crumbs: [{ label: 'Prescriptions' }], actions: `<button class="btn btn-primary" data-a="new">${icon('plus')}New prescription</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(3,minmax(0,1fr))">
        ${UI.kpi({ label: 'Pending', value: d.prescriptions.filter((p) => p.status === 'Pending').length, dot: 'var(--warn)' })}
        ${UI.kpi({ label: 'Dispensed', value: d.prescriptions.filter((p) => p.status === 'Dispensed').length, dot: 'var(--success)' })}
        ${UI.kpi({ label: 'Cancelled', value: d.prescriptions.filter((p) => p.status === 'Cancelled').length, dot: 'var(--danger)' })}
      </div><div id="rx-table"></div>`;
    el.querySelector('[data-a=new]').onclick = () => openForm();
    UI.dataTable(el.querySelector('#rx-table'), {
      rows: () => d.prescriptions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)), exportName: 'prescriptions', sort: 'createdAt', dir: 'desc',
      searchPlaceholder: 'Patient, doctor, prescription ID',
      searchText: (p) => `${p.id} ${K.patientName(p.patientId)} ${K.doctorName(p.doctorId)}`,
      filters: [{ key: 'status', label: 'Status', options: K.RX_STATUSES }],
      columns: [
        { key: 'id', label: 'ID' }, { key: 'patientId', label: 'Patient', render: (p) => K.patientName(p.patientId), csv: (p) => K.patientName(p.patientId) },
        { key: 'doctorId', label: 'Doctor', render: (p) => K.doctorName(p.doctorId), csv: (p) => K.doctorName(p.doctorId) },
        { key: 'diagnosis', label: 'Diagnosis' },
        { key: 'items', label: 'Medicines', render: (p) => p.items.map((i) => U.esc(i.medicineName)).join(', '), sort: false, csv: (p) => p.items.map((i) => i.medicineName).join('; ') },
        { key: 'createdAt', label: 'Created', render: (p) => U.fmtDateTime(p.createdAt) },
        { key: 'status', label: 'Status', render: (p) => U.badge(p.status) }
      ],
      rowActions: () => `<button class="btn btn-xs" data-act="open">Open</button>`, onAction: (a, p) => detail(p.id), onRowClick: (p) => detail(p.id)
    });
    if (params[0]) setTimeout(() => detail(params[0]), 0);
  }

  function detail(id) {
    const rx = K.rx(id);
    if (!rx) return UI.toast('Prescription not found', 'error');
    const acts = [{ label: 'Close' }];
    if (rx.status === 'Pending') { acts.push({ label: 'Cancel', kind: 'danger', onClick: () => { try { K.cancelPrescription(rx.id); UI.toast('Prescription cancelled'); HIS.app.refresh(); } catch (e) { UI.toast(e.message, 'error'); return false; } } }); acts.push({ label: 'Dispense', kind: 'primary', onClick: () => { try { K.dispensePrescription(rx.id); UI.toast('Prescription dispensed'); HIS.app.refresh(); } catch (e) { UI.toast(e.message, 'error'); return false; } } }); }
    acts.push({ label: 'Print', icon: 'print', onClick: () => { UI.printModal(); return false; } });
    UI.modal({
      title: `Prescription ${rx.id}`, size: 'md', className: 'invoice-doc',
      body: `<div class="invoice-head"><div><h3>${U.esc(K.patientName(rx.patientId))}</h3><p class="small muted">${U.esc(K.doctorName(rx.doctorId))} · ${U.fmtDateTime(rx.createdAt)}</p></div><div class="invoice-meta">${U.badge(rx.status)}<br>${U.esc(rx.diagnosis || '')}</div></div>
        <div class="rx-lines">${rx.items.map((it) => `<div class="rx-line"><span><strong>${U.esc(it.medicineName)}</strong><div class="rl-meta">${it.dosage} · ${it.frequency} · ${it.duration} · ${it.route} · ${U.esc(it.instructions)} · Qty ${it.qty}</div></span><span class="small">${U.money(it.qty * it.unitPrice)}</span></div>`).join('')}</div>`,
      actions: acts
    });
  }

  function openForm(id, preset = {}, after) {
    const d = D();
    const patientLabel = (p) => `${p.name} · ${p.phone} (${p.id})`;
    const addRow = (host, val = {}) => {
      const row = document.createElement('div');
      row.className = 'rx-line';
      row.innerHTML = `<div class="form-grid" style="grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;flex:1">
          <select class="rx-med" style="grid-column:span 2">${d.medicines.map((m) => `<option value="${m.id}" ${val.medicineId === m.id ? 'selected' : ''}>${U.esc(m.name)}</option>`).join('')}</select>
          <input class="rx-dose" placeholder="Dosage" value="${U.esc(val.dosage || '1 tablet')}">
          <select class="rx-freq"><option>Once daily</option><option>Twice daily</option><option>3 times daily</option><option>Every 8 hours</option></select>
          <select class="rx-dur"><option>3 days</option><option>5 days</option><option>7 days</option><option>10 days</option><option>14 days</option></select>
          <input class="rx-qty" type="number" min="1" value="${val.qty || 10}" placeholder="Qty">
        </div><button type="button" class="icon-btn sm" data-rm>${icon('x')}</button>`;
      row.querySelector('[data-rm]').onclick = () => row.remove();
      host.appendChild(row);
      return row;
    };
    const m = UI.modal({
      title: 'New prescription', size: 'lg',
      body: `<datalist id="rx-pt-dl">${d.patients.map((p) => `<option value="${U.esc(patientLabel(p))}">`).join('')}</datalist>
        <div class="form-grid mb-2">
          <div class="field"><label for="rx-pt">Patient <span class="req">*</span></label><input id="rx-pt" list="rx-pt-dl" autocomplete="off" value="${preset.patientId ? U.esc(patientLabel(K.patient(preset.patientId))) : ''}"></div>
          <div class="field"><label for="rx-doc">Doctor</label><select id="rx-doc">${d.doctors.map((x) => `<option value="${x.id}" ${preset.doctorId === x.id ? 'selected' : ''}>Dr. ${x.name}</option>`).join('')}</select></div>
          <div class="field span-2"><label for="rx-dx">Diagnosis</label><input id="rx-dx" value="${U.esc(preset.diagnosis || '')}"></div>
        </div>
        <h3 class="form-section">Medicines</h3>
        <div id="rx-rows" class="stack" style="gap:8px"></div>
        <button type="button" class="btn btn-sm mt-1" id="rx-add">${icon('plus')}Add medicine</button>
        <p class="form-error mt-1" id="rx-err" hidden></p>`,
      actions: [{ label: 'Cancel' }, { label: 'Create prescription', kind: 'primary', onClick: (ctx) => {
        const err = ctx.body.querySelector('#rx-err');
        const val = ctx.body.querySelector('#rx-pt').value;
        const mm = val.match(/\((PT-\d+)\)\s*$/);
        const p = preset.patientId ? K.patient(preset.patientId) : (mm ? K.patient(mm[1]) : d.patients.find((pp) => pp.name.toLowerCase() === val.trim().toLowerCase()));
        if (!p) { err.textContent = 'Select a patient from the list.'; err.hidden = false; return false; }
        const items = [];
        U.qsa('#rx-rows > .rx-line', ctx.body).forEach((row) => {
          const med = d.medicines.find((mm2) => mm2.id === row.querySelector('.rx-med').value);
          items.push({ medicineId: med.id, medicineName: med.name, dosage: row.querySelector('.rx-dose').value, frequency: row.querySelector('.rx-freq').value, duration: row.querySelector('.rx-dur').value, route: 'Oral', instructions: 'After meals', qty: Number(row.querySelector('.rx-qty').value) || 1, unitPrice: med.sellingPrice });
        });
        if (!items.length) { err.textContent = 'Add at least one medicine.'; err.hidden = false; return false; }
        try {
          const n = K.createPrescription({ patientId: p.id, doctorId: ctx.body.querySelector('#rx-doc').value, visitId: preset.visitId || '', diagnosis: ctx.body.querySelector('#rx-dx').value, items });
          UI.toast(`Prescription ${n.id} created`);
          if (after) after(); else HIS.app.refresh();
        } catch (e) { err.textContent = e.message; err.hidden = false; return false; }
      } }]
    });
    addRow(m.body.querySelector('#rx-rows'));
    m.body.querySelector('#rx-add').onclick = () => addRow(m.body.querySelector('#rx-rows'));
  }

  HIS.modules.prescriptions = { title: 'Prescriptions', render, detail, openForm };
})();
