/* Medical Imaging: order, schedule, perform, radiologist report */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  function render(el) {
    const d = D();
    el.innerHTML = `${UI.pageHead({ title: 'Medical Imaging', sub: 'X-Ray, CT, MRI, Ultrasound and Mammography studies', crumbs: [{ label: 'Medical Imaging' }], actions: `<button class="btn btn-primary" data-a="new">${icon('plus')}New imaging order</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${K.IMAGING_STATUSES.map((s) => UI.kpi({ label: s, value: d.imagingOrders.filter((l) => l.status === s).length })).join('')}
      </div><div id="im-table"></div>`;
    el.querySelector('[data-a=new]').onclick = () => orderDialog();
    UI.dataTable(el.querySelector('#im-table'), {
      rows: () => d.imagingOrders.slice().sort((a, b) => b.orderedAt.localeCompare(a.orderedAt)), exportName: 'imaging-orders', sort: 'orderedAt', dir: 'desc',
      searchPlaceholder: 'Patient, study, order ID',
      searchText: (l) => `${l.id} ${K.patientName(l.patientId)} ${l.studyType} ${l.bodyPart}`,
      filters: [{ key: 'status', label: 'Status', options: K.IMAGING_STATUSES }, { key: 'studyType', label: 'Modality', options: K.IMAGING_TYPES }],
      columns: [
        { key: 'id', label: 'Order' }, { key: 'patientId', label: 'Patient', render: (l) => K.patientName(l.patientId), csv: (l) => K.patientName(l.patientId) },
        { key: 'studyType', label: 'Modality' }, { key: 'bodyPart', label: 'Body part' },
        { key: 'doctorId', label: 'Ordering doctor', render: (l) => K.doctorName(l.doctorId), csv: (l) => K.doctorName(l.doctorId) },
        { key: 'orderedAt', label: 'Ordered', render: (l) => U.fmtDateTime(l.orderedAt) },
        { key: 'status', label: 'Status', render: (l) => U.badge(l.status) }
      ],
      rowActions: () => `<button class="btn btn-xs" data-act="open">Open</button>`, onAction: (a, l) => detail(l.id), onRowClick: (l) => detail(l.id)
    });
  }

  function detail(id) {
    const draw = () => {
      const l = K.imagingOrder(id);
      ctx.setTitle(`Imaging order ${l.id}`);
      const next = K.imagingNextStatuses(l);
      ctx.body.innerHTML = `<dl class="dl mb-2"><dt>Patient</dt><dd><a href="#/patients/${l.patientId}">${U.esc(K.patientName(l.patientId))}</a></dd><dt>Ordering doctor</dt><dd>${U.esc(K.doctorName(l.doctorId))}</dd>
        <dt>Study</dt><dd>${U.esc(l.studyType)} — ${U.esc(l.bodyPart)}</dd><dt>Ordered</dt><dd>${U.fmtDateTime(l.orderedAt)}</dd>
        ${l.scheduledAt ? `<dt>Scheduled</dt><dd>${U.fmtDateTime(l.scheduledAt)}</dd>` : ''}${l.performedAt ? `<dt>Performed</dt><dd>${U.fmtDateTime(l.performedAt)}</dd>` : ''}<dt>Status</dt><dd>${U.badge(l.status)}</dd></dl>
        ${l.status === 'Reported' ? `<div class="card mb-2"><div class="card-body"><strong>Radiologist:</strong> ${U.esc(l.radiologist)}<p class="mt-1 mb-0">${U.esc(l.reportText)}</p></div></div>` : ''}
        <div class="row" id="im-acts">${next.map((s) => `<button class="btn btn-sm ${s === 'Reported' ? 'btn-primary' : ''}" data-next="${s}">${s === 'Scheduled' ? 'Schedule' : s === 'Performed' ? 'Mark performed' : 'Write report'}</button>`).join('')}${l.status === 'Reported' ? `<button class="btn btn-sm" data-print>${icon('print')}Print report</button>` : ''}</div>`;
      ctx.body.querySelector('#im-acts').onclick = (e) => {
        const b = e.target.closest('[data-next]');
        if (b) {
          const s = b.dataset.next;
          if (s === 'Scheduled') return scheduleDialog(l, draw);
          if (s === 'Reported') return reportDialog(l, draw);
          try { K.performImaging(l.id); UI.toast('Marked performed'); draw(); } catch (err) { UI.toast(err.message, 'error'); }
          return;
        }
        if (e.target.closest('[data-print]')) UI.printModal();
      };
    };
    const ctx = UI.modal({ title: 'Imaging order', size: 'md', body: '' });
    draw();
  }
  function scheduleDialog(l, after) {
    UI.modal({ title: 'Schedule imaging', size: 'sm', body: UI.form([{ name: 'scheduledAt', label: 'Scheduled date & time', type: 'datetime-local', required: true, value: U.nowStamp() }]),
      actions: [{ label: 'Cancel' }, { label: 'Schedule', kind: 'primary', onClick: (ctx) => { if (!UI.validate(ctx.body)) return false; K.scheduleImaging(l.id, UI.readForm(ctx.body).scheduledAt); UI.toast('Imaging scheduled'); after(); } }] });
  }
  function reportDialog(l, after) {
    const d = D();
    UI.modal({ title: 'Radiologist report', size: 'md',
      body: UI.form([{ name: 'radiologist', label: 'Radiologist', type: 'select', options: d.doctors.filter((x) => x.departmentId === 'DPT13').map((x) => x.name).concat(d.doctors.map((x) => x.name)).filter((v, i, a) => a.indexOf(v) === i) }, { name: 'result', label: 'Finding summary', required: true }, { name: 'reportText', label: 'Full report', type: 'textarea', rows: 4, span: 2 }]),
      actions: [{ label: 'Cancel' }, { label: 'Save report', kind: 'primary', onClick: (ctx) => { if (!UI.validate(ctx.body)) return false; K.reportImaging(l.id, UI.readForm(ctx.body)); UI.toast('Report saved'); after(); } }] });
  }
  function orderDialog() {
    const d = D();
    const patientLabel = (p) => `${p.name} · ${p.phone} (${p.id})`;
    UI.modal({
      title: 'New imaging order', size: 'md',
      body: `<datalist id="im-pt-dl">${d.patients.map((p) => `<option value="${U.esc(patientLabel(p))}">`).join('')}</datalist>
        <div class="field mb-1"><label for="im-pt">Patient <span class="req">*</span></label><input id="im-pt" list="im-pt-dl" autocomplete="off"></div>
        ${UI.form([{ name: 'doctorId', label: 'Ordering doctor', type: 'select', options: d.doctors.map((x) => ({ value: x.id, label: 'Dr. ' + x.name })) }, { name: 'studyType', label: 'Study type', type: 'select', options: HIS.clinic.IMAGING_TYPES }, { name: 'bodyPart', label: 'Body part / area', placeholder: 'Chest' }])}
        <p class="form-error mt-1" id="im-err" hidden></p>`,
      actions: [{ label: 'Cancel' }, { label: 'Order imaging', kind: 'primary', onClick: (ctx) => {
        const err = ctx.body.querySelector('#im-err');
        const val = ctx.body.querySelector('#im-pt').value;
        const mm = val.match(/\((PT-\d+)\)\s*$/);
        const p = mm ? K.patient(mm[1]) : d.patients.find((pp) => pp.name.toLowerCase() === val.trim().toLowerCase());
        if (!p) { err.textContent = 'Select a patient from the list.'; err.hidden = false; return false; }
        const x = UI.readForm(ctx.body);
        K.orderImaging({ patientId: p.id, doctorId: x.doctorId, studyType: x.studyType, bodyPart: x.bodyPart });
        UI.toast('Imaging ordered'); HIS.app.refresh();
      } }]
    });
  }

  HIS.modules.imaging = { title: 'Medical Imaging', render, detail, orderDialog };
})();
