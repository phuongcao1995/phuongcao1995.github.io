/* Inventory (stock, low-stock alerts, movements) and Suppliers (purchases, payables) */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;
  const CATS = ['Linen', 'Guest amenities', 'Beverages', 'Minibar', 'Cleaning supplies', 'Restaurant ingredients', 'Office supplies'];
  const LOCS = ['Housekeeping store B1', 'F&B store B1', 'Kitchen cold store', 'Front office store', 'Pool area', 'Floor pantries'];
  let tab = 'items';
  const level = (i) => (i.stock <= 0 ? 'Out of stock' : i.stock <= i.min ? 'Low stock' : 'In stock');
  const canEdit = () => HMS.app.user.role !== 'Receptionist';

  function render(el, params) {
    if (params[0]) tab = params[0];
    const d = D();
    const low = d.inventory.filter((i) => i.stock <= i.min);
    const value = U.sum(d.inventory, (i) => i.stock * i.cost);
    el.innerHTML = `${UI.pageHead({ title: 'Inventory', sub: 'Linen, amenities, minibar, F&B ingredients and supplies', crumbs: [{ label: 'Inventory' }],
      actions: canEdit() ? `<button class="btn" data-a="move">${icon('swap')}Stock movement</button><button class="btn btn-primary" data-a="add">${icon('plus')}Add item</button>` : '' })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Items tracked', value: d.inventory.length, meta: `${CATS.length} categories` })}
        ${UI.kpi({ label: 'Low stock alerts', value: low.length, dot: low.length ? 'var(--danger)' : 'var(--success)' })}
        ${UI.kpi({ label: 'Stock value', value: U.moneyShort(value), unit: 'VND', meta: 'At purchase cost' })}
        ${UI.kpi({ label: 'Movements, 7 days', value: d.movements.filter((m) => m.date >= U.addDays(U.today(), -7)).length })}
      </div>
      ${low.length ? `<div class="alert warn mb-2">${icon('alert')}<p><strong>Reorder needed:</strong> ${low.slice(0, 8).map((i) => `${U.esc(i.name)} (${i.stock}/${i.min} ${i.unit})`).join(', ')}${low.length > 8 ? '…' : ''}</p></div>` : ''}
      ${UI.tabs([{ id: 'items', label: 'Stock items' }, { id: 'moves', label: 'Movements', count: d.movements.length }], tab)}
      <div id="inv-body"></div>`;
    UI.bindTabs(el, (t) => { tab = t; draw(); });
    el.onclick = (e) => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'add') itemForm(); if (a.dataset.a === 'move') moveDialog(); };
    draw();
  }

  function draw() {
    const body = document.getElementById('inv-body');
    if (!body) return;
    const d = D();
    if (tab === 'items') {
      UI.dataTable(body, {
        rows: () => d.inventory, exportName: 'inventory', sort: 'category',
        searchText: (i) => `${i.id} ${i.name} ${i.category} ${i.location}`,
        filters: [{ key: 'category', label: 'Category', options: CATS }, { key: 'lvl', label: 'Level', options: ['In stock', 'Low stock', 'Out of stock'], match: (i, v) => level(i) === v }, { key: 'location', label: 'Location', options: LOCS }],
        columns: [
          { key: 'name', label: 'Item', render: (i) => `<div class="cell-main">${U.esc(i.name)}</div><div class="cell-sub">${i.id}</div>` },
          { key: 'category', label: 'Category' },
          { key: 'stock', label: 'On hand', align: 'right', render: (i) => `<strong>${U.num(i.stock)}</strong> <span class="cell-sub" style="display:inline">${i.unit}</span>` },
          { key: 'min', label: 'Minimum', align: 'right' },
          { key: 'bar', label: 'Level', sort: false, render: (i) => `<div class="progress ${i.stock <= i.min ? 'danger' : ''}" style="width:110px"><i style="width:${Math.min(100, (i.stock / (i.min * 2 || 1)) * 100).toFixed(0)}%"></i></div>`, csv: level },
          { key: 'cost', label: 'Unit cost', align: 'right', render: (i) => U.money(i.cost) },
          { key: 'location', label: 'Location' },
          { key: 'supplier', label: 'Supplier', render: (i) => U.esc((D().suppliers.find((s) => s.id === i.supplierId) || {}).name || '—'), csv: (i) => (D().suppliers.find((s) => s.id === i.supplierId) || {}).name },
          { key: 'lvl', label: 'Status', render: (i) => U.badge(level(i), level(i) === 'In stock' ? 'success' : 'danger'), sortValue: level, csv: level }
        ],
        rowActions: () => canEdit() ? `<button class="btn btn-xs" data-act="in">Stock in</button><button class="btn btn-xs" data-act="out">Stock out</button><button class="icon-btn sm" data-act="edit" aria-label="Edit">${icon('edit')}</button>` : '',
        onAction: (a, i) => { if (a === 'edit') itemForm(i.id); else moveDialog(i.id, a === 'in' ? 'Stock in' : 'Stock out'); }
      });
    } else {
      UI.dataTable(body, {
        rows: () => d.movements.slice().reverse(), exportName: 'stock-movements', sort: 'date', dir: 'desc',
        searchText: (m) => { const it = d.inventory.find((x) => x.id === m.itemId) || {}; return `${m.id} ${it.name} ${m.note} ${m.by}`; },
        filters: [{ key: 'type', label: 'Type', options: ['Stock in', 'Stock out', 'Transfer', 'Adjustment'] }], dateRange: { key: 'date' },
        columns: [
          { key: 'date', label: 'Date', render: (m) => U.fmtDateTime(m.date) },
          { key: 'item', label: 'Item', render: (m) => U.esc((d.inventory.find((x) => x.id === m.itemId) || {}).name || m.itemId), csv: (m) => (d.inventory.find((x) => x.id === m.itemId) || {}).name },
          { key: 'type', label: 'Type', render: (m) => U.badge(m.type, { 'Stock in': 'success', 'Stock out': 'info', Transfer: 'violet', Adjustment: 'warn' }[m.type]) },
          { key: 'qty', label: 'Qty', align: 'right', render: (m) => `${m.type === 'Stock out' ? '−' : m.qty > 0 && m.type !== 'Transfer' ? '+' : ''}${U.num(Math.abs(m.qty))}` },
          { key: 'note', label: 'Note' },
          { key: 'by', label: 'By' }
        ]
      });
    }
  }

  function itemForm(id) {
    const it = id ? D().inventory.find((x) => x.id === id) : null;
    UI.modal({
      title: it ? `Edit ${it.name}` : 'Add inventory item', size: 'md',
      body: UI.form([
        { name: 'name', label: 'Item name', required: true, span: 2 },
        { name: 'category', label: 'Category', type: 'select', options: CATS },
        { name: 'unit', label: 'Unit', required: true, placeholder: 'pcs, kg, bottle' },
        { name: 'stock', label: 'On hand', type: 'number', min: 0, required: true, readonly: !!it, help: it ? 'Use a stock movement to change quantity.' : '' },
        { name: 'min', label: 'Minimum level', type: 'number', min: 0, required: true },
        { name: 'cost', label: 'Unit cost (VND)', type: 'number', min: 0, step: 500, required: true },
        { name: 'location', label: 'Location', type: 'select', options: LOCS },
        { name: 'supplierId', label: 'Supplier', type: 'select', placeholder: 'None', options: D().suppliers.map((s) => ({ value: s.id, label: s.name })), span: 2 }
      ], it || { category: 'Linen', location: LOCS[0], stock: 0, min: 10 }),
      actions: [{ label: 'Cancel' }, { label: it ? 'Save item' : 'Add item', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        if (it) { delete x.stock; Object.assign(it, x); HMS.store.commit(); } else HMS.store.add('inventory', Object.assign({ id: HMS.store.nextId('item', 'SKU', 4) }, x));
        UI.toast(it ? 'Item saved' : `${x.name} added`); HMS.app.refresh();
      } }]
    });
  }

  function moveDialog(itemId, type = 'Stock in') {
    const d = D();
    UI.modal({
      title: 'Stock movement', size: 'md',
      body: UI.form([
        { name: 'itemId', label: 'Item', type: 'select', required: true, placeholder: 'Select item', span: 2, options: d.inventory.map((i) => ({ value: i.id, label: `${i.name} · ${i.stock} ${i.unit}` })) },
        { name: 'type', label: 'Movement', type: 'select', options: ['Stock in', 'Stock out', 'Transfer', 'Adjustment'] },
        { name: 'qty', label: 'Quantity', type: 'number', required: true, help: 'For adjustments use a negative number to reduce stock.' },
        { name: 'to', label: 'Transfer to', type: 'select', options: LOCS, span: 2 },
        { name: 'note', label: 'Note', span: 2, placeholder: 'e.g. Delivery PO-3312, floor 6 replenishment' }
      ], { itemId: itemId || '', type }),
      onMount: (ctx) => { const t = ctx.body.querySelector('[name=type]'); const upd = () => { ctx.body.querySelector('[name=to]').closest('.field').hidden = t.value !== 'Transfer'; }; t.onchange = upd; upd(); },
      actions: [{ label: 'Cancel' }, { label: 'Save movement', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        const it = d.inventory.find((i) => i.id === v.itemId);
        const q = Number(v.qty);
        if (!q || (v.type !== 'Adjustment' && q < 0)) { UI.toast('Enter a positive quantity.', 'error'); return false; }
        if (v.type === 'Stock out' && q > it.stock) { UI.toast(`Only ${it.stock} ${it.unit} on hand.`, 'error'); return false; }
        if (v.type === 'Adjustment' && it.stock + q < 0) { UI.toast('Stock cannot go below zero.', 'error'); return false; }
        if (v.type === 'Stock in') it.stock += q;
        if (v.type === 'Stock out') it.stock -= q;
        if (v.type === 'Adjustment') it.stock += q;
        d.movements.push({ id: HMS.store.nextId('movement', 'MV', 5), itemId: it.id, type: v.type, qty: q, date: U.nowStamp(), note: v.type === 'Transfer' ? `${it.location} → ${v.to}${v.note ? ' · ' + v.note : ''}` : v.note, by: H.user() });
        if (it.stock <= it.min) H.notify('inventory', `Low inventory: ${it.name} (${it.stock} ${it.unit} left)`, '#/inventory');
        HMS.store.commit();
        UI.toast(`${v.type}: ${it.name} · now ${it.stock} ${it.unit}`);
        if (HMS.app.current === 'inventory') HMS.app.refresh();
      } }]
    });
  }
  HMS.modules.inventory = { title: 'Inventory', render };

  /* =========================== Suppliers =========================== */
  function renderSuppliers(el) {
    const d = D();
    const payable = d.purchases.filter((p) => p.status !== 'Paid');
    el.innerHTML = `${UI.pageHead({ title: 'Suppliers', sub: 'Vendors, purchase orders and payment status', crumbs: [{ label: 'Suppliers' }], actions: `<button class="btn" data-a="po">${icon('plus')}New purchase</button><button class="btn btn-primary" data-a="add">${icon('plus')}Add supplier</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Active suppliers', value: d.suppliers.filter((s) => s.status === 'Active').length })}
        ${UI.kpi({ label: 'Purchases, 30 days', value: U.moneyShort(U.sum(d.purchases.filter((p) => p.date >= U.addDays(U.today(), -30)), (p) => p.amount)), unit: 'VND' })}
        ${UI.kpi({ label: 'Accounts payable', value: U.moneyShort(U.sum(payable, (p) => p.amount - p.paid)), unit: 'VND', link: '#/finance/payable' })}
        ${UI.kpi({ label: 'Overdue POs', value: payable.filter((p) => p.dueDate < U.today()).length })}
      </div>
      ${UI.tabs([{ id: 'list', label: 'Suppliers' }, { id: 'po', label: 'Purchase orders', count: d.purchases.length }], 'list')}
      <div id="sup-body"></div>`;
    el.onclick = (e) => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'add') supForm(); if (a.dataset.a === 'po') poForm(); };
    const drawSup = (t) => {
      const body = el.querySelector('#sup-body');
      if (t === 'list') UI.dataTable(body, {
        rows: () => d.suppliers, exportName: 'suppliers', sort: 'name',
        searchText: (s) => `${s.name} ${s.contact} ${s.products} ${s.taxId}`,
        filters: [{ key: 'category', label: 'Category', options: [...new Set(d.suppliers.map((s) => s.category))] }],
        columns: [
          { key: 'name', label: 'Supplier', render: (s) => `<div class="cell-main">${U.esc(s.name)}</div><div class="cell-sub">${s.id} · MST ${U.esc(s.taxId)}</div>` },
          { key: 'contact', label: 'Contact', render: (s) => `<div>${U.esc(s.contact)}</div><div class="cell-sub">${U.esc(s.phone)} · ${U.esc(s.email)}</div>` },
          { key: 'products', label: 'Products' },
          { key: 'terms', label: 'Terms' },
          { key: 'total', label: 'Purchases', align: 'right', render: (s) => U.money(U.sum(d.purchases.filter((p) => p.supplierId === s.id), (p) => p.amount)), sortValue: (s) => U.sum(d.purchases.filter((p) => p.supplierId === s.id), (p) => p.amount), csv: (s) => U.sum(d.purchases.filter((p) => p.supplierId === s.id), (p) => p.amount) },
          { key: 'due', label: 'Payable', align: 'right', render: (s) => { const v = U.sum(d.purchases.filter((p) => p.supplierId === s.id && p.status !== 'Paid'), (p) => p.amount - p.paid); return v ? `<strong>${U.money(v)}</strong>` : '<span class="muted">—</span>'; }, sort: false },
          { key: 'status', label: 'Status', render: (s) => U.badge(s.status) }
        ],
        rowActions: () => `<button class="btn btn-xs" data-act="po">New PO</button><button class="icon-btn sm" data-act="edit" aria-label="Edit">${icon('edit')}</button>`,
        onAction: (a, s) => (a === 'po' ? poForm(s.id) : supForm(s.id))
      });
      else UI.dataTable(body, {
        rows: () => d.purchases.slice().reverse(), exportName: 'purchase-orders', sort: 'date', dir: 'desc',
        searchText: (p) => `${p.id} ${(d.suppliers.find((s) => s.id === p.supplierId) || {}).name} ${p.items}`,
        filters: [{ key: 'status', label: 'Payment', options: ['Paid', 'Partially Paid', 'Unpaid'] }, { key: 'supplierId', label: 'Supplier', options: d.suppliers.map((s) => ({ value: s.id, label: s.name })) }], dateRange: { key: 'date' },
        columns: [
          { key: 'id', label: 'PO', render: (p) => `<span class="cell-main">${p.id}</span>` },
          { key: 'date', label: 'Date', render: (p) => U.fmtDate(p.date) },
          { key: 'supplier', label: 'Supplier', render: (p) => U.esc((d.suppliers.find((s) => s.id === p.supplierId) || {}).name), csv: (p) => (d.suppliers.find((s) => s.id === p.supplierId) || {}).name },
          { key: 'items', label: 'Items', render: (p) => `<span class="small">${U.esc(p.items)}</span>` },
          { key: 'amount', label: 'Amount', align: 'right', render: (p) => U.money(p.amount) },
          { key: 'paid', label: 'Paid', align: 'right', render: (p) => U.money(p.paid) },
          { key: 'dueDate', label: 'Due', render: (p) => `${U.fmtDate(p.dueDate)}${p.status !== 'Paid' && p.dueDate < U.today() ? ' <span class="badge tone-danger plain">Overdue</span>' : ''}` },
          { key: 'status', label: 'Status', render: (p) => U.badge(p.status) }
        ],
        rowActions: (p) => p.status !== 'Paid' ? '<button class="btn btn-xs btn-soft" data-act="pay">Pay</button>' : '',
        onAction: (a, p) => payPO(p, () => drawSup('po'))
      });
    };
    UI.bindTabs(el, drawSup);
    drawSup('list');
  }

  function payPO(p, after) {
    const due = p.amount - p.paid;
    UI.modal({ title: `Pay ${p.id}`, size: 'sm', body: UI.form([{ name: 'amount', label: 'Amount (VND)', type: 'number', min: 1000, max: due, step: 1000, value: due, required: true, span: 2 }, { name: 'method', label: 'Method', type: 'select', options: ['Bank Transfer', 'Cash'], span: 2 }]),
      actions: [{ label: 'Cancel' }, { label: 'Record payment', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        p.paid += Number(v.amount);
        p.status = p.paid >= p.amount ? 'Paid' : 'Partially Paid';
        const exp = D().expenses.find((e) => e.description.endsWith(p.id));
        if (exp && p.status === 'Paid') exp.status = 'Paid';
        HMS.store.commit(); UI.toast(`${U.money(v.amount)} paid to supplier`); after && after();
      } }] });
  }

  function supForm(id) {
    const s = id ? D().suppliers.find((x) => x.id === id) : null;
    UI.modal({ title: s ? `Edit ${s.name}` : 'Add supplier', size: 'md', body: UI.form([
      { name: 'name', label: 'Company name', required: true, span: 2 }, { name: 'taxId', label: 'Tax code (MST)', required: true, pattern: '[0-9\\-]{10,14}', title: '10–14 digits' },
      { name: 'category', label: 'Category', type: 'select', options: CATS.concat('Maintenance') }, { name: 'contact', label: 'Contact person', required: true }, { name: 'phone', label: 'Phone', type: 'tel', required: true },
      { name: 'email', label: 'Email', type: 'email' }, { name: 'terms', label: 'Payment terms', type: 'select', options: ['COD', 'Net 15', 'Net 30', 'Net 45'] },
      { name: 'address', label: 'Address', span: 2 }, { name: 'products', label: 'Products supplied', span: 2 }, { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }], s || { status: 'Active', terms: 'Net 30' }),
      actions: [{ label: 'Cancel' }, { label: 'Save supplier', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        if (s) { Object.assign(s, x); HMS.store.commit(); } else HMS.store.add('suppliers', Object.assign({ id: HMS.store.nextId('supplier', 'SUP', 3) }, x));
        UI.toast('Supplier saved'); HMS.app.refresh();
      } }] });
  }

  /** A purchase creates a PO, an expense (accounts payable) and optionally receives stock */
  function poForm(supplierId) {
    const d = D();
    UI.modal({ title: 'New purchase order', size: 'md', body: UI.form([
      { name: 'supplierId', label: 'Supplier', type: 'select', required: true, placeholder: 'Select supplier', span: 2, options: d.suppliers.filter((s) => s.status === 'Active').map((s) => ({ value: s.id, label: s.name })) },
      { name: 'items', label: 'Items / description', required: true, span: 2 },
      { name: 'amount', label: 'Amount incl. VAT (VND)', type: 'number', min: 10000, step: 10000, required: true },
      { name: 'date', label: 'Date', type: 'date', value: U.today(), required: true },
      { name: 'receiveItem', label: 'Receive into stock (optional)', type: 'select', placeholder: 'Do not receive now', options: d.inventory.map((i) => ({ value: i.id, label: i.name })) },
      { name: 'receiveQty', label: 'Quantity received', type: 'number', min: 1 }], { supplierId: supplierId || '' }),
      actions: [{ label: 'Cancel' }, { label: 'Create PO', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        const sup = d.suppliers.find((s) => s.id === v.supplierId);
        const po = { id: HMS.store.nextId('purchase', 'PO-', 4), supplierId: sup.id, date: v.date, amount: Number(v.amount), paid: 0, status: 'Unpaid', dueDate: U.addDays(v.date, sup.terms === 'COD' ? 0 : Number((sup.terms.match(/\d+/) || [30])[0])), items: v.items };
        d.purchases.push(po);
        d.expenses.push({ id: HMS.store.nextId('expense', 'EXP-', 4), date: v.date, category: 'Purchases', description: `${sup.name} · ${po.id}`, amount: po.amount, method: 'Bank Transfer', supplierId: sup.id, status: 'Pending' });
        if (v.receiveItem && Number(v.receiveQty) > 0) {
          const it = d.inventory.find((i) => i.id === v.receiveItem);
          it.stock += Number(v.receiveQty);
          d.movements.push({ id: HMS.store.nextId('movement', 'MV', 5), itemId: it.id, type: 'Stock in', qty: Number(v.receiveQty), date: U.nowStamp(), note: `Delivery ${po.id}`, by: H.user() });
        }
        HMS.store.commit(); UI.toast(`${po.id} created · ${U.money(po.amount)} added to payables`); HMS.app.refresh();
      } }] });
  }
  HMS.modules.suppliers = { title: 'Suppliers', render: renderSuppliers };
})();
