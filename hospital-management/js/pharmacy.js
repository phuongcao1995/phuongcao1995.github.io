/* Pharmacy: medicine inventory, stock levels, expiration */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;
  const CATS = ['Analgesic', 'Antibiotic', 'Antihistamine', 'Antihypertensive', 'Antidiabetic', 'Vitamin', 'Antacid/GI', 'Respiratory', 'Dermatological', 'Cardiac', 'Antiplatelet', 'Other'];

  function render(el, params) {
    const d = D();
    el.innerHTML = `${UI.pageHead({ title: 'Pharmacy', sub: 'Medicine inventory, stock levels and expiration', crumbs: [{ label: 'Pharmacy' }], actions: `<button class="btn btn-primary" data-a="add">${icon('plus')}Add medicine</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Medicines', value: d.medicines.length })}
        ${UI.kpi({ label: 'Low stock', value: d.medicines.filter((m) => K.medStockStatus(m) === 'Low Stock').length, dot: 'var(--warn)' })}
        ${UI.kpi({ label: 'Out of stock', value: d.medicines.filter((m) => K.medStockStatus(m) === 'Out of Stock').length, dot: 'var(--danger)' })}
        ${UI.kpi({ label: 'Expiring / expired', value: d.medicines.filter((m) => K.medExpiryStatus(m)).length, dot: 'var(--warn)' })}
      </div><div id="ph-table"></div>`;
    el.querySelector('[data-a=add]').onclick = () => openForm();
    UI.dataTable(el.querySelector('#ph-table'), {
      rows: () => d.medicines, exportName: 'medicines', sort: 'name',
      searchPlaceholder: 'Name, generic name, manufacturer',
      searchText: (m) => `${m.id} ${m.name} ${m.genericName} ${m.manufacturer}`,
      filters: [{ key: 'category', label: 'Category', options: CATS }, { key: 'stock', label: 'Stock', options: ['In Stock', 'Low Stock', 'Out of Stock'], match: (m, v) => K.medStockStatus(m) === v }, { key: 'exp', label: 'Expiry', options: ['Expiring Soon', 'Expired'], match: (m, v) => K.medExpiryStatus(m) === v }],
      columns: [
        { key: 'name', label: 'Medicine', render: (m) => `<div class="cell-main">${U.esc(m.name)}</div><div class="cell-sub">${U.esc(m.genericName)} · ${m.id}</div>` },
        { key: 'category', label: 'Category' }, { key: 'manufacturer', label: 'Manufacturer' }, { key: 'batch', label: 'Batch' },
        { key: 'expirationDate', label: 'Expiry', render: (m) => { const es = K.medExpiryStatus(m); return `${U.fmtDate(m.expirationDate)} ${es ? U.badge(es) : ''}`; } },
        { key: 'quantity', label: 'Stock', align: 'right', render: (m) => { const ss = K.medStockStatus(m); const pct = Math.min(100, (m.quantity / (m.reorderLevel * 3 || 1)) * 100); return `<div class="row" style="justify-content:flex-end;flex-wrap:nowrap"><div class="stock-bar"><i style="width:${pct}%;background:${ss === 'Out of Stock' ? 'var(--danger)' : ss === 'Low Stock' ? 'var(--warn)' : 'var(--success)'}"></i></div><span class="num" style="min-width:46px;text-align:right">${m.quantity} ${m.unit}</span></div>`; } },
        { key: 'sellingPrice', label: 'Price', align: 'right', render: (m) => U.money(m.sellingPrice) }
      ],
      rowActions: (m) => `<button class="icon-btn sm" data-act="edit" aria-label="Edit">${icon('edit')}</button>`,
      onAction: (a, m) => openForm(m.id), onRowClick: (m) => openForm(m.id)
    });
    if (params[0]) setTimeout(() => openForm(params[0]), 0);
  }

  function openForm(id) {
    const m = id ? K.medicine(id) : null;
    const d = D();
    UI.modal({
      title: m ? `Edit ${m.name}` : 'Add medicine', size: 'lg',
      body: UI.form([
        { name: 'name', label: 'Medicine name', required: true, span: 2, placeholder: 'Paracetamol 500mg' },
        { name: 'genericName', label: 'Generic name', required: true },
        { name: 'category', label: 'Category', type: 'select', options: CATS },
        { name: 'unit', label: 'Unit', type: 'select', options: ['tablet', 'capsule', 'bottle', 'tube', 'inhaler', 'vial', 'ampoule', 'sachet'] },
        { name: 'manufacturer', label: 'Manufacturer' },
        { name: 'batch', label: 'Batch number' },
        { name: 'expirationDate', label: 'Expiration date', type: 'date', required: true },
        { name: 'quantity', label: 'Quantity in stock', type: 'number', min: 0, required: true },
        { name: 'reorderLevel', label: 'Reorder level', type: 'number', min: 0 },
        { name: 'sellingPrice', label: 'Selling price (VND)', type: 'number', min: 0, step: 500, required: true }
      ], m || { category: 'Analgesic', unit: 'tablet', reorderLevel: 30, quantity: 100, sellingPrice: 5000, expirationDate: U.addDays(U.today(), 365) }),
      actions: [{ label: 'Cancel' }, { label: m ? 'Save medicine' : 'Add medicine', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        if (m) Object.assign(m, v);
        else d.medicines.push(Object.assign({ id: 'MED-' + String(1000 + d.medicines.length + 1) }, v));
        HIS.store.commit(); UI.toast('Medicine saved'); HIS.app.refresh();
      } }]
    });
  }

  HIS.modules.pharmacy = { title: 'Pharmacy', render, openForm };
})();
