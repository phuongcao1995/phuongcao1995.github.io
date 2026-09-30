/* Laboratory: test orders, sample collection, processing, results, approval */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;
  const COMMON_TESTS = [['CBC', 'Hematology', '4.0-10.0', '10^9/L'], ['Blood glucose (fasting)', 'Biochemistry', '70-100', 'mg/dL'], ['HbA1c', 'Biochemistry', '4.0-5.6', '%'], ['Liver function (ALT/AST)', 'Biochemistry', '7-56', 'U/L'], ['Kidney function (Creatinine)', 'Biochemistry', '0.6-1.3', 'mg/dL'], ['Lipid profile', 'Biochemistry', '<200', 'mg/dL'], ['Urinalysis', 'Urine', 'Negative', ''], ['Electrolytes (Na/K/Cl)', 'Biochemistry', '135-145', 'mmol/L']];

  function render(el) {
    const d = D();
    el.innerHTML = `${UI.pageHead({ title: 'Laboratory', sub: 'Test orders, sample collection and results', crumbs: [{ label: 'Laboratory' }], actions: `<button class="btn btn-primary" data-a="new">${icon('plus')}New test order</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(5,minmax(0,1fr))">
        ${K.LAB_STATUSES.map((s) => UI.kpi({ label: s, value: d.labOrders.filter((l) => l.status === s).length })).join('')}
      </div><div id="lb-table"></div>`;
    el.querySelector('[data-a=new]').onclick = () => orderDialog();
    UI.dataTable(el.querySelector('#lb-table'), {
      rows: () => d.labOrders.slice().sort((a, b) => b.orderedAt.localeCompare(a.orderedAt)), exportName: 'lab-orders', sort: 'orderedAt', dir: 'desc',
      searchPlaceholder: 'Patient, test name, order ID',
      searchText: (l) => `${l.id} ${K.patientName(l.patientId)} ${l.testName}`,
      filters: [{ key: 'status', label: 'Status', options: K.LAB_STATUSES }, { key: 'category', label: 'Category', options: ['Hematology', 'Biochemistry', 'Urine', 'General'] }],
      columns: [
        { key: 'id', label: 'Order' }, { key: 'patientId', label: 'Patient', render: (l) => K.patientName(l.patientId), csv: (l) => K.patientName(l.patientId) },
        { key: 'testName', label: 'Test' }, { key: 'category', label: 'Category' },
        { key: 'orderedAt', label: 'Ordered', render: (l) => U.fmtDateTime(l.orderedAt) },
        { key: 'result', label: 'Result', render: (l) => l.result ? `${U.esc(l.result)} ${U.esc(l.unit)} ${l.flag && l.flag !== 'Normal' ? U.badge(l.flag) : ''}` : '<span class="muted">—</span>' },
        { key: 'status', label: 'Status', render: (l) => U.badge(l.status) }
      ],
      rowActions: () => `<button class="btn btn-xs" data-act="open">Open</button>`, onAction: (a, l) => detail(l.id), onRowClick: (l) => detail(l.id)
    });
  }

  function detail(id) {
    const draw = () => {
      const l = K.labOrder(id);
      ctx.setTitle(`Lab order ${l.id}`);
      const next = K.labNextStatuses(l);
      ctx.body.innerHTML = `<dl class="dl mb-2"><dt>Patient</dt><dd><a href="#/patients/${l.patientId}">${U.esc(K.patientName(l.patientId))}</a></dd><dt>Ordered by</dt><dd>${U.esc(K.doctorName(l.doctorId))}</dd>
        <dt>Test</dt><dd>${U.esc(l.testName)} (${l.category})</dd><dt>Ordered</dt><dd>${U.fmtDateTime(l.orderedAt)}</dd><dt>Status</dt><dd>${U.badge(l.status)}</dd></dl>
        ${['Completed', 'Approved'].includes(l.status) ? `<div class="table-wrap mb-2"><table class="table compact"><thead><tr><th>Result</th><th>Unit</th><th>Reference range</th><th>Flag</th></tr></thead><tbody><tr><td>${U.esc(l.result)}</td><td>${U.esc(l.unit)}</td><td>${U.esc(l.referenceRange)}</td><td>${U.badge(l.flag)}</td></tr></tbody></table></div>${l.approvedBy ? `<p class="small muted">Approved by ${U.esc(l.approvedBy)}</p>` : ''}` : ''}
        <div class="row" id="lb-acts">${next.map((s) => `<button class="btn btn-sm ${s === 'Completed' ? 'btn-primary' : ''}" data-next="${s}">${s === 'Collected' ? 'Mark collected' : s === 'Processing' ? 'Start processing' : s === 'Completed' ? 'Enter result' : 'Approve result'}</button>`).join('')}${l.status === 'Approved' ? `<button class="btn btn-sm" data-print>${icon('print')}Print report</button>` : ''}</div>`;
      ctx.body.querySelector('#lb-acts').onclick = (e) => {
        const b = e.target.closest('[data-next]');
        if (b) {
          const s = b.dataset.next;
          if (s === 'Completed') return resultDialog(l, draw);
          try { K.setLabStatus(l.id, s); UI.toast(`Marked ${s}`); draw(); } catch (err) { UI.toast(err.message, 'error'); }
          return;
        }
        if (e.target.closest('[data-print]')) UI.printModal();
      };
    };
    const ctx = UI.modal({ title: 'Lab order', size: 'md', body: '' });
    draw();
  }
  function resultDialog(l, after) {
    UI.modal({ title: `Result — ${l.testName}`, size: 'sm',
      body: UI.form([{ name: 'result', label: 'Result', required: true }, { name: 'unit', label: 'Unit', value: l.unit }, { name: 'referenceRange', label: 'Reference range', value: l.referenceRange }, { name: 'flag', label: 'Flag', type: 'select', options: ['Normal', 'High', 'Low', 'Critical'] }]),
      actions: [{ label: 'Cancel' }, { label: 'Save result', kind: 'primary', onClick: (ctx) => { if (!UI.validate(ctx.body)) return false; K.enterLabResult(l.id, UI.readForm(ctx.body)); UI.toast('Result saved'); after(); } }] });
  }
  function orderDialog() {
    const d = D();
    const patientLabel = (p) => `${p.name} · ${p.phone} (${p.id})`;
    UI.modal({
      title: 'New laboratory test order', size: 'md',
      body: `<datalist id="lb-pt-dl">${d.patients.map((p) => `<option value="${U.esc(patientLabel(p))}">`).join('')}</datalist>
        <div class="field mb-1"><label for="lb-pt">Patient <span class="req">*</span></label><input id="lb-pt" list="lb-pt-dl" autocomplete="off"></div>
        ${UI.form([{ name: 'doctorId', label: 'Ordering doctor', type: 'select', options: d.doctors.map((x) => ({ value: x.id, label: 'Dr. ' + x.name })) },
          { name: 'testName', label: 'Test', type: 'select', options: COMMON_TESTS.map((t) => t[0]).concat('Other') }])}
        <p class="form-error mt-1" id="lb-err" hidden></p>`,
      actions: [{ label: 'Cancel' }, { label: 'Order test', kind: 'primary', onClick: (ctx) => {
        const err = ctx.body.querySelector('#lb-err');
        const val = ctx.body.querySelector('#lb-pt').value;
        const mm = val.match(/\((PT-\d+)\)\s*$/);
        const p = mm ? K.patient(mm[1]) : d.patients.find((pp) => pp.name.toLowerCase() === val.trim().toLowerCase());
        if (!p) { err.textContent = 'Select a patient from the list.'; err.hidden = false; return false; }
        const x = UI.readForm(ctx.body);
        const t = COMMON_TESTS.find((tt) => tt[0] === x.testName);
        K.orderLabTest({ patientId: p.id, doctorId: x.doctorId, testName: x.testName, category: t ? t[1] : 'General', unit: t ? t[3] : '', referenceRange: t ? t[2] : '' });
        UI.toast('Test ordered'); HIS.app.refresh();
      } }]
    });
  }

  HIS.modules.lab = { title: 'Laboratory', render, detail, orderDialog };
})();
