/* Insurance: patient coverage records and insurance claims on invoices */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  function render(el, params) {
    const tab = (params && params[0]) || 'patients';
    const d = D();
    const insured = d.patients.filter((p) => p.insurance && p.insurance.number);
    const claims = d.invoices.filter((i) => i.insuranceCovered > 0);
    el.innerHTML = `${UI.pageHead({ title: 'Insurance', sub: 'Vietnamese health insurance (BHYT) and private coverage', crumbs: [{ label: 'Insurance' }] })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Insured patients', value: insured.length })}
        ${UI.kpi({ label: 'Active coverage', value: insured.filter((p) => p.insurance.validTo >= U.today()).length })}
        ${UI.kpi({ label: 'Expired coverage', value: insured.filter((p) => p.insurance.validTo < U.today()).length, dot: 'var(--danger)' })}
        ${UI.kpi({ label: 'Total covered (all claims)', value: U.moneyShort(U.sum(claims, (i) => i.insuranceCovered)) })}
      </div>
      ${UI.tabs([{ id: 'patients', label: 'Patient coverage', count: insured.length }, { id: 'claims', label: 'Claims on invoices', count: claims.length }], tab)}
      <div id="ins-body"></div>`;
    const body = el.querySelector('#ins-body');
    const draw = (t) => {
      if (t === 'patients') UI.dataTable(body, {
        rows: () => insured, exportName: 'insurance-patients', sort: 'validTo',
        searchPlaceholder: 'Patient name, insurance number',
        searchText: (p) => `${p.name} ${p.insurance.number}`,
        filters: [{ key: 'provider', label: 'Provider', options: HIS.REF.INSURANCE_PROVIDERS }, { key: 'status', label: 'Status', options: ['Active', 'Expired'], match: (p, v) => (p.insurance.validTo >= U.today() ? 'Active' : 'Expired') === v }],
        columns: [
          { key: 'name', label: 'Patient', render: (p) => `<a href="#/patients/${p.id}">${U.esc(p.name)}</a>` },
          { key: 'insurance', label: 'Provider', render: (p) => U.esc(p.insurance.provider), sortValue: (p) => p.insurance.provider, csv: (p) => p.insurance.provider },
          { key: 'number', label: 'Insurance number', render: (p) => U.esc(p.insurance.number), sort: false, csv: (p) => p.insurance.number },
          { key: 'validTo', label: 'Valid until', render: (p) => U.fmtDate(p.insurance.validTo), sortValue: (p) => p.insurance.validTo },
          { key: 'coveragePct', label: 'Coverage', align: 'right', render: (p) => `${p.insurance.coveragePct}%`, sortValue: (p) => p.insurance.coveragePct },
          { key: 'status', label: 'Status', render: (p) => U.badge(p.insurance.validTo >= U.today() ? 'Active' : 'Expired'), sort: false, csv: (p) => (p.insurance.validTo >= U.today() ? 'Active' : 'Expired') }
        ],
        rowActions: () => `<button class="btn btn-xs" data-act="open">Edit</button>`, onAction: (a, p) => HIS.modules.patients.openForm(p.id), onRowClick: (p) => HIS.modules.patients.openForm(p.id)
      });
      if (t === 'claims') UI.dataTable(body, {
        rows: () => claims.slice().sort((a, b) => b.date.localeCompare(a.date)), exportName: 'insurance-claims', sort: 'date', dir: 'desc',
        searchPlaceholder: 'Patient, invoice ID',
        searchText: (i) => `${i.id} ${K.patientName(i.patientId)} ${i.insuranceProvider}`,
        filters: [{ key: 'insuranceProvider', label: 'Provider', options: HIS.REF.INSURANCE_PROVIDERS }],
        columns: [
          { key: 'id', label: 'Invoice' }, { key: 'patientId', label: 'Patient', render: (i) => K.patientName(i.patientId), csv: (i) => K.patientName(i.patientId) },
          { key: 'date', label: 'Date', render: (i) => U.fmtDate(i.date) }, { key: 'insuranceProvider', label: 'Provider' },
          { key: 'subtotal', label: 'Bill total', align: 'right', render: (i) => U.money(i.subtotal) },
          { key: 'insuranceCovered', label: 'Insurance covered', align: 'right', render: (i) => U.money(i.insuranceCovered) },
          { key: 'patientPayable', label: 'Co-payment', align: 'right', render: (i) => U.money(i.patientPayable) }
        ],
        rowActions: () => `<button class="btn btn-xs" data-act="open">Open</button>`, onAction: (a, i) => HIS.modules.billing.detail(i.id), onRowClick: (i) => HIS.modules.billing.detail(i.id)
      });
    };
    UI.bindTabs(el, draw);
    draw(tab);
  }

  HIS.modules.insurance = { title: 'Insurance', render };
})();
