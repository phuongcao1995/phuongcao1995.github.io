/* Services: catalog (airport transfer, laundry, spa, tours…) and posting to guest bills */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;
  const CATS = ['Transport', 'Laundry', 'Spa', 'Room', 'F&B', 'Leisure', 'Tours', 'Events'];
  let table;

  function render(el) {
    const d = D();
    const since = U.addDays(U.today(), -30);
    const sold = d.charges.filter((c) => c.date >= since && !['Restaurant', 'Minibar'].includes(c.category));
    const top = Object.entries(U.groupBy(sold, (c) => c.description)).map(([k, v]) => ({ label: k, value: U.sum(v, (c) => c.amount) })).sort((a, b) => b.value - a.value).slice(0, 6);
    el.innerHTML = `${UI.pageHead({ title: 'Services', sub: 'Guest services that can be posted directly to a room folio', crumbs: [{ label: 'Services' }], actions: `<button class="btn" data-a="post">${icon('billing')}Post service to room</button><button class="btn btn-primary" data-a="add">${icon('plus')}Add service</button>` })}
      <div class="grid grid-2-1 mb-2">
        <div class="kpi-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
          ${UI.kpi({ label: 'Services in catalog', value: d.services.length, meta: `${d.services.filter((s) => s.availability === 'Available').length} available now` })}
          ${UI.kpi({ label: 'Service revenue, 30 days', value: U.moneyShort(U.sum(sold, (c) => c.amount)), unit: 'VND' })}
          ${UI.kpi({ label: 'Airport transfers, 30 days', value: sold.filter((c) => c.description.startsWith('Airport')).length })}
          ${UI.kpi({ label: 'Spa sessions, 30 days', value: sold.filter((c) => c.category === 'Spa').length })}
        </div>
        <div class="card"><div class="card-head"><h2>Top services <span class="sub">· 30 days</span></h2></div><div class="card-body">${HMS.chart.hbars(top, { format: U.moneyShort })}</div></div>
      </div><div id="svc-table"></div>`;
    el.onclick = (e) => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'add') openForm(); if (a.dataset.a === 'post') postDialog(); };
    table = UI.dataTable(el.querySelector('#svc-table'), {
      rows: () => d.services, exportName: 'services', sort: 'category',
      searchText: (s) => `${s.name} ${s.category} ${s.description}`,
      filters: [{ key: 'category', label: 'Category', options: CATS }, { key: 'availability', label: 'Availability', options: ['Available', 'On request', 'Unavailable'] }],
      columns: [
        { key: 'name', label: 'Service', render: (s) => `<div class="cell-main">${U.esc(s.name)}</div><div class="cell-sub">${U.esc(s.description)}</div>` },
        { key: 'category', label: 'Category' },
        { key: 'price', label: 'Price', align: 'right', render: (s) => s.price ? U.money(s.price) : '<span class="badge tone-success plain">Free</span>' },
        { key: 'unit', label: 'Unit' },
        { key: 'tax', label: 'VAT', align: 'right', render: (s) => `${s.tax}%` },
        { key: 'availability', label: 'Availability', render: (s) => U.badge(s.availability) }
      ],
      rowActions: (s) => `${s.availability !== 'Unavailable' ? '<button class="btn btn-xs btn-soft" data-act="post">Add to bill</button>' : ''}<button class="icon-btn sm" data-act="edit" aria-label="Edit">${icon('edit')}</button><button class="icon-btn sm" data-act="del" aria-label="Delete">${icon('trash')}</button>`,
      onAction: async (a, s) => {
        if (a === 'edit') openForm(s.id);
        if (a === 'post') postDialog(s.id);
        if (a === 'del' && await UI.confirm({ title: 'Delete service?', message: `Remove <strong>${U.esc(s.name)}</strong> from the catalog? Posted charges are kept.`, confirmLabel: 'Delete', danger: true })) { HMS.store.remove('services', s.id); UI.toast('Service deleted'); table.refresh(); }
      }
    });
  }

  function openForm(id) {
    const s = id ? D().services.find((x) => x.id === id) : null;
    UI.modal({
      title: s ? `Edit ${s.name}` : 'Add service', size: 'md',
      body: UI.form([
        { name: 'name', label: 'Service name', required: true, span: 2 },
        { name: 'category', label: 'Category', type: 'select', options: CATS },
        { name: 'availability', label: 'Availability', type: 'select', options: ['Available', 'On request', 'Unavailable'] },
        { name: 'price', label: 'Price (VND)', type: 'number', min: 0, step: 1000, required: true },
        { name: 'unit', label: 'Unit', type: 'select', options: ['per trip', 'per person', 'per night', 'per stay', 'per session', 'per kg', 'per item', 'per day', 'per order'] },
        { name: 'tax', label: 'VAT %', type: 'select', options: ['0', '8', '10'] },
        { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 2 }
      ], s || { category: 'Transport', availability: 'Available', unit: 'per trip', tax: 10 }),
      actions: [{ label: 'Cancel' }, { label: s ? 'Save service' : 'Add service', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body); x.tax = Number(x.tax);
        if (s) { Object.assign(s, x); HMS.store.commit(); } else HMS.store.add('services', Object.assign({ id: HMS.store.nextId('service', 'SVC', 3) }, x));
        UI.toast(s ? 'Service saved' : `${x.name} added`); table && table.refresh();
      } }]
    });
  }

  function postDialog(serviceId) {
    const inHouse = H.inHouse().sort((a, b) => a.roomId.localeCompare(b.roomId));
    const svc = D().services.filter((s) => s.availability !== 'Unavailable');
    const s0 = svc.find((s) => s.id === serviceId) || svc[0];
    UI.modal({
      title: 'Add service to guest bill', size: 'md',
      body: UI.form([
        { name: 'resId', label: 'In-house guest', type: 'select', required: true, placeholder: 'Select room', span: 2, options: inHouse.map((r) => ({ value: r.id, label: `Room ${r.roomId} · ${H.guestName(r.guestId)}` })) },
        { name: 'serviceId', label: 'Service', type: 'select', span: 2, options: svc.map((s) => ({ value: s.id, label: `${s.name} · ${U.money(s.price)} ${s.unit}` })) },
        { name: 'qty', label: 'Quantity', type: 'number', min: 1, max: 50, value: 1, required: true },
        { name: 'price', label: 'Unit price (VND)', type: 'number', min: 0, step: 1000, required: true }
      ], { serviceId: s0.id, price: s0.price }),
      onMount: (ctx) => { const sel = ctx.body.querySelector('[name=serviceId]'); sel.onchange = () => { ctx.body.querySelector('[name=price]').value = svc.find((x) => x.id === sel.value).price; }; },
      actions: [{ label: 'Cancel' }, { label: 'Post to folio', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        const s = svc.find((x) => x.id === v.serviceId);
        try { const c = H.postCharge(v.resId, { category: H.CHARGE_CATS.includes(s.category) ? s.category : 'Other', description: s.name, qty: v.qty, unitPrice: v.price }); UI.toast(`${s.name} · ${U.money(c.amount)} posted to room ${H.res(v.resId).roomId}`); }
        catch (err) { UI.toast(err.message, 'error'); return false; }
      } }]
    });
  }

  HMS.modules.services = { title: 'Services', render, postDialog };
})();
