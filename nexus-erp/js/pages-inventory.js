/* ==========================================================================
   NEXUS ERP — pages-inventory.js
   Products (list, CRUD, CSV import/export, detail) and Inventory (stock
   overview, warehouses, stock movements, transfers & adjustments).
   ========================================================================== */
'use strict';

const PRODUCT_CATEGORIES = ['Electronics', 'Software', 'Services', 'Equipment', 'Office Supplies'];
const PRODUCT_TYPES = [{ value: 'stock', label: 'Stock item' }, { value: 'digital', label: 'Digital / licence' }, { value: 'service', label: 'Service' }];
const MOVEMENT_TYPES = ['Purchase Receipt', 'Sales Delivery', 'Stock Adjustment', 'Transfer', 'Return', 'Opening Balance'];
const typeLabel = (t) => (PRODUCT_TYPES.find((x) => x.value === t) || {}).label || t;

const Products = {
  fields(p) {
    return [
      { type: 'section', label: 'Product' },
      { name: 'id', label: 'SKU', required: true, disabled: !!p, unique: { collection: 'products', exceptId: p?.id }, validate: (v) => (/^[A-Z0-9-]{3,20}$/.test(v) ? '' : 'Use uppercase letters, digits and dashes (e.g. SKU-151).') },
      { name: 'name', label: 'Product name', required: true }, { name: 'category', label: 'Category', type: 'select', required: true, options: PRODUCT_CATEGORIES },
      { name: 'brand', label: 'Brand', required: true }, { name: 'type', label: 'Product type', type: 'select', required: true, noEmpty: true, options: PRODUCT_TYPES },
      { name: 'unit', label: 'Unit of measure', required: true, placeholder: 'pcs, box, hr…' }, { name: 'barcode', label: 'Barcode', unique: { collection: 'products', exceptId: p?.id } },
      { type: 'section', label: 'Pricing & stock' },
      { name: 'cost', label: 'Cost price', type: 'currency', required: true }, { name: 'price', label: 'Selling price', type: 'currency', required: true, validate: (v, vals) => (v < vals.cost ? 'Selling price is below cost — check pricing.' : '') },
      { name: 'reorder', label: 'Reorder level', type: 'number', integer: true, required: true }, { name: 'supplierId', label: 'Preferred supplier', type: 'select', options: Lookup.options.suppliers, emptyLabel: 'None' },
      ...(p ? [] : [{ name: 'openingQty', label: 'Opening stock (Main Warehouse)', type: 'number', integer: true, help: 'Stock items only — posts an opening balance movement' }]),
      { name: 'status', label: 'Status', type: 'radio', options: ['Active', 'Inactive'] }, { name: 'description', label: 'Description', type: 'textarea', rows: 2, full: true },
    ];
  },
  edit(p, dup) {
    const isEdit = p && !dup;
    const v = p ? { ...p } : { type: 'stock', status: 'Active', unit: 'pcs', reorder: 10, openingQty: 0 };
    if (!isEdit) { v.id = 'SKU-' + (Math.max(100, ...DB.all('products').map((x) => parseInt(String(x.id).replace(/\D/g, ''), 10) || 0)) + 1); if (dup) { v.name += ' (Copy)'; v.barcode = ''; } }
    formModal({ title: isEdit ? `Edit ${p.name}` : 'Add product', size: 'lg', fields: this.fields(isEdit ? p : null), values: v, submitText: isEdit ? 'Save changes' : 'Create product',
      onSubmit: (x) => {
        if (isEdit) { delete x.id; if (x.type !== 'stock') x.reorder = 0; DB.update('products', p.id, x); DB.log(`Updated product ${p.id}`, p.id); showToast('Product updated successfully'); } else {
          const qty = x.openingQty || 0; delete x.openingQty;
          const rec = DB.insert('products', { ...x, reorder: x.type === 'stock' ? x.reorder : 0, stock: {} });
          if (qty > 0 && rec.type === 'stock') { Inventory.move({ ref: 'OPEN-' + rec.id, productId: rec.id, warehouse: 'WH-MAIN', type: 'Opening Balance', qty }); Accounting.post({ date: today(), ref: 'OPEN-' + rec.id, description: `Opening stock — ${rec.name}`, source: 'Inventory', lines: [{ account: ACCT.INV, debit: round2(qty * rec.cost) }, { account: ACCT.EQUITY, credit: round2(qty * rec.cost) }] }); }
          DB.log(`Created product ${rec.id} — ${rec.name}`, rec.id); showToast('Product created successfully');
        }
        App.refresh();
      } });
  },
  remove(p) {
    const used = DB.all('orders').some((o) => o.items.some((i) => i.productId === p.id)) || DB.all('invoices').some((o) => o.items.some((i) => i.productId === p.id)) || DB.all('purchaseOrders').some((o) => o.items.some((i) => i.productId === p.id)) || DB.all('movements').some((m) => m.productId === p.id);
    if (used) return { error: `${p.name} is used in orders, invoices or stock movements. Set it to Inactive instead.` };
    DB.remove('products', p.id); DB.log(`Deleted product ${p.id}`, p.id); return null;
  },
  importCSV(file) {
    const r = new FileReader();
    r.onload = () => {
      const rows = parseCSV(String(r.result).replace(/^\ufeff/, ''));
      if (rows.length < 2) { showToast('The file has no data rows.', 'error'); return; }
      const head = rows[0].map((h) => h.trim().toLowerCase());
      const col = (n) => head.findIndex((h) => h === n || h.replace(/\s/g, '') === n);
      const need = ['sku', 'name', 'category', 'cost', 'price'];
      const miss = need.filter((n) => col(n) < 0);
      if (miss.length) { showToast(`Missing required columns: ${miss.join(', ')}`, 'error'); return; }
      let added = 0; let updated = 0; const errors = [];
      rows.slice(1).forEach((row, i) => {
        const g = (n) => (col(n) >= 0 ? String(row[col(n)] ?? '').trim() : '');
        const rec = { id: g('sku').toUpperCase(), name: g('name'), category: g('category'), brand: g('brand') || 'Generic', unit: g('unit') || 'pcs', cost: Number(g('cost')), price: Number(g('price')), type: g('type') || 'stock', reorder: Number(g('reorder') || g('reorderlevel') || 0), status: g('status') || 'Active' };
        if (!rec.id || !rec.name) return errors.push(`Row ${i + 2}: SKU and name are required`);
        if (!PRODUCT_CATEGORIES.includes(rec.category)) return errors.push(`Row ${i + 2}: unknown category "${rec.category}"`);
        if (!(rec.cost >= 0) || !(rec.price >= 0)) return errors.push(`Row ${i + 2}: cost and price must be non-negative numbers`);
        const ex = DB.get('products', rec.id);
        if (ex) { Object.assign(ex, rec, { stock: ex.stock }); updated++; } else { DB.data.products.push({ ...rec, stock: {}, supplierId: '', barcode: '', description: '' }); added++; }
      });
      DB.save('products'); DB.log(`Imported products: ${added} added, ${updated} updated`);
      showToast(`Import complete: ${added} added, ${updated} updated${errors.length ? `, ${errors.length} skipped` : ''}`, errors.length ? 'warning' : 'success', 6000);
      if (errors.length) console.warn('Import errors:', errors);
      App.refresh();
    };
    r.readAsText(file);
  },
};

Pages.products = (el, { query }) => {
  const all = DB.all('products');
  el.innerHTML = pageHeader({ title: 'Products', subtitle: `${all.length} products & services`,
    actions: `${Auth.can('create') ? `<label class="btn" tabindex="0" title="CSV columns: SKU, Name, Category, Brand, Unit, Cost, Price, Type, Reorder">${icon('upload', 16)}<span>Import CSV</span><input type="file" accept=".csv,text/csv" class="sr-only" data-act="import"></label>` : ''}${btn('Add product', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' })}` }) +
    statTiles([{ label: 'Active products', value: all.filter((p) => p.status === 'Active').length }, { label: 'Stock items', value: Inventory.stockProducts().length }, { label: 'Inventory value', value: formatCurrency(Inventory.totalValue(), true), nav: 'inventory' }, { label: 'Low / out of stock', value: Inventory.lowStock().length, nav: 'inventory?filter=low', tone: 'warn' }]) +
    '<div class="card"><div class="card-body" id="pl"></div></div>';
  listView($('#pl', el), {
    key: 'products', entity: 'products', searchPlaceholder: 'Search by SKU, name, brand, barcode…', rows: () => DB.all('products'),
    searchFields: [(p) => p.id, (p) => p.name, (p) => p.brand, (p) => p.barcode, (p) => p.category],
    filters: [{ key: 'category', label: 'Category', options: PRODUCT_CATEGORIES }, { key: 'type', label: 'Type', options: PRODUCT_TYPES }, { key: 'level', label: 'Stock', options: ['In Stock', 'Low Stock', 'Out of Stock', 'Non-stock'], test: (p, v) => Inventory.level(p) === v }, { key: 'status', label: 'Status', options: ['Active', 'Inactive'] }],
    preset: query.category ? { category: query.category } : null,
    columns: [
      { key: 'id', label: 'SKU', render: (p) => `<strong>${esc(p.id)}</strong>` }, { key: 'name', label: 'Product Name', render: (p) => link('product/' + p.id, p.name) },
      { key: 'category', label: 'Category' }, { key: 'brand', label: 'Brand' },
      { key: 'cost', label: 'Cost', align: 'right', render: (p) => money(p.cost) }, { key: 'price', label: 'Price', align: 'right', render: (p) => money(p.price) },
      { key: 'stock', label: 'Stock', align: 'right', value: (p) => (p.type === 'stock' ? Inventory.total(p) : -1), render: (p) => (p.type === 'stock' ? formatNumber(Inventory.total(p)) : '<span class="muted">—</span>'), exportValue: (p) => (p.type === 'stock' ? Inventory.total(p) : '') },
      { key: 'reorder', label: 'Reorder Level', align: 'right', render: (p) => (p.type === 'stock' ? p.reorder : '<span class="muted">—</span>') },
      { key: 'status', label: 'Status', value: (p) => (p.status === 'Inactive' ? 'Inactive' : Inventory.level(p)), render: (p) => (p.status === 'Inactive' ? badge('Inactive', 'neutral') : badge(p.type === 'stock' ? Inventory.level(p) : 'Active')) },
    ],
    onView: (p) => navigateTo('product/' + p.id),
    actions: (p) => crudActions({ view: () => navigateTo('product/' + p.id), edit: () => Products.edit(p), duplicate: () => Products.edit(p, true), del: () => confirmDelete('Product', () => Products.remove(p)),
      extra: p.type === 'stock' ? [{ label: 'Adjust stock', icon: 'refresh', perm: 'edit', onClick: () => InventoryUI.adjust(p) }, { label: 'Transfer stock', icon: 'repeat', perm: 'edit', onClick: () => InventoryUI.transfer(p) }] : [] }),
    onDelete: (rows) => { let ok = 0; rows.forEach((p) => { if (!Products.remove(p)) ok++; }); showToast(`${ok} of ${rows.length} products deleted${ok < rows.length ? ' — products with history were kept' : ''}`, ok < rows.length ? 'warning' : 'success'); },
    exportName: 'products',
    exportColumns: ['SKU:id', 'Name:name', 'Category:category', 'Brand:brand', 'Unit:unit', 'Cost:cost', 'Price:price', 'Type:type', 'Reorder:reorder', 'Status:status'].map((s) => { const [label, k] = s.split(':'); return { label, value: (p) => p[k] }; }).concat([{ label: 'Stock', value: (p) => Inventory.total(p) }]),
  });
  $('[data-act="add"]', el)?.addEventListener('click', () => Products.edit(null));
  $('[data-act="import"]', el)?.addEventListener('change', (e) => { if (e.target.files[0]) Products.importCSV(e.target.files[0]); });
};

Pages.product = (el, { id, query }) => {
  const p = DB.get('products', id);
  if (!p) { el.innerHTML = errorState(`Product ${id} was not found.`, false); return; }
  App.setCrumb(p.name);
  const tab = query.tab || 'overview';
  const margin = p.price ? ((p.price - p.cost) / p.price) * 100 : 0;
  const invLines = DB.all('invoices').filter((i) => !['Draft', 'Cancelled'].includes(i.status)).flatMap((i) => i.items.filter((it) => it.productId === p.id).map((it) => ({ ...it, doc: i })));
  const poLines = DB.all('purchaseOrders').filter((o) => o.status !== 'Cancelled').flatMap((o) => o.items.filter((it) => it.productId === p.id).map((it) => ({ ...it, doc: o })));
  const moves = DB.all('movements').filter((m) => m.productId === p.id).slice().reverse();
  const stock = p.type === 'stock';
  el.innerHTML = pageHeader({ back: 'products', title: `${esc(p.name)} ${badge(p.status === 'Inactive' ? 'Inactive' : stock ? Inventory.level(p) : 'Active')}`, subtitle: `${esc(p.id)} · ${esc(p.category)} · ${esc(p.brand)} · ${typeLabel(p.type)}`,
    actions: `${stock ? btn('Adjust stock', { icon: 'refresh', attrs: 'data-act="adjust"', perm: 'edit' }) + btn('Transfer', { icon: 'repeat', attrs: 'data-act="transfer"', perm: 'edit' }) : ''}${stock && Auth.canView('purchasing') ? btn('Reorder', { icon: 'clipboard', attrs: 'data-act="reorder"', perm: 'create' }) : ''}${btn('Edit', { icon: 'edit', cls: 'btn-primary', attrs: 'data-act="edit"', perm: 'edit' })}` }) +
    statTiles([{ label: 'On hand', value: stock ? `${formatNumber(Inventory.total(p))} ${esc(p.unit)}` : '—' }, { label: 'Reserved', value: stock ? formatNumber(Inventory.reserved(p.id)) : '—' }, { label: 'Available', value: stock ? formatNumber(Inventory.available(p)) : '—' }, { label: 'Stock value', value: stock ? formatCurrency(Inventory.value(p)) : '—' }, { label: 'Units sold', value: formatNumber(sum(invLines, (l) => l.qty)), sub: formatCurrency(sum(invLines, (l) => Calc.line(l).net), true) }]) +
    tabsHtml(['overview', 'inventory', 'sales', 'purchases', 'pricing', 'transactions'].map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1) })), tab, 'product/' + p.id) + '<div id="tab" class="tab-panel"></div>';
  const T = $('#tab', el);
  const whRows = DB.all('warehouses').map((w) => ({ w, qty: p.stock?.[w.id] || 0, res: Inventory.reserved(p.id, w.id) }));
  const whTable = renderTable([{ label: 'Warehouse', render: (r) => esc(r.w.name) }, { label: 'On hand', align: 'right', render: (r) => formatNumber(r.qty) }, { label: 'Reserved', align: 'right', render: (r) => formatNumber(r.res) }, { label: 'Available', align: 'right', render: (r) => formatNumber(r.qty - r.res) }, { label: 'Value', align: 'right', render: (r) => money(r.qty * p.cost) }], whRows);
  if (tab === 'overview') T.innerHTML = `<div class="grid-2">${card('Product details', detailList([['SKU', esc(p.id)], ['Name', esc(p.name)], ['Category', esc(p.category)], ['Brand', esc(p.brand)], ['Type', typeLabel(p.type)], ['Unit', esc(p.unit)], ['Barcode', esc(p.barcode)], ['Preferred supplier', p.supplierId ? link('supplier/' + p.supplierId, Lookup.supplierName(p.supplierId)) : '—'], ['Reorder level', stock ? String(p.reorder) : '—'], ['Description', esc(p.description)]]))}
    <div>${card('Pricing', detailList([['Cost price', formatCurrency(p.cost)], ['Selling price', formatCurrency(p.price)], ['Gross margin', `${margin.toFixed(1)}%`], ['Markup', `${p.cost ? (((p.price - p.cost) / p.cost) * 100).toFixed(1) : '—'}%`]]))}${stock ? card('Stock by warehouse', whTable) : ''}</div></div>`;
  if (tab === 'inventory') T.innerHTML = stock ? card('Stock by warehouse', whTable + `<div class="stock-meter"><span>Reorder level: <strong>${p.reorder}</strong></span>${progressBar((Inventory.total(p) / Math.max(1, p.reorder * 3)) * 100, Inventory.level(p) === 'In Stock' ? '' : 'warning')}</div>`) : card('', emptyState('This product is not stock-tracked.', `${typeLabel(p.type)} items have no inventory.`, 'box'));
  if (tab === 'sales') T.innerHTML = card('Sales history', renderTable([{ label: 'Invoice', render: (l) => link('invoice/' + l.doc.id, l.doc.id) }, { label: 'Date', render: (l) => formatDate(l.doc.date) }, { label: 'Customer', render: (l) => esc(Lookup.customerName(l.doc.customerId)) }, { label: 'Qty', align: 'right', render: (l) => l.qty }, { label: 'Unit price', align: 'right', render: (l) => money(l.price) }, { label: 'Net', align: 'right', render: (l) => money(Calc.line(l).net) }], invLines.sort((a, b) => (a.doc.date < b.doc.date ? 1 : -1)), { empty: 'No sales recorded for this product.' }));
  if (tab === 'purchases') T.innerHTML = card('Purchase history', renderTable([{ label: 'PO', render: (l) => link('po/' + l.doc.id, l.doc.id) }, { label: 'Date', render: (l) => formatDate(l.doc.date) }, { label: 'Supplier', render: (l) => esc(Lookup.supplierName(l.doc.supplierId)) }, { label: 'Ordered', align: 'right', render: (l) => l.qty }, { label: 'Received', align: 'right', render: (l) => l.received || 0 }, { label: 'Unit cost', align: 'right', render: (l) => money(l.price) }, { label: 'Status', render: (l) => badge(l.doc.status) }], poLines.sort((a, b) => (a.doc.date < b.doc.date ? 1 : -1)), { empty: 'No purchase orders for this product.' }));
  if (tab === 'pricing') {
    const avgSale = invLines.length ? sum(invLines, (l) => Calc.line(l).net) / sum(invLines, (l) => l.qty) : 0;
    const avgCost = poLines.length ? sum(poLines, (l) => l.qty * l.price) / sum(poLines, (l) => l.qty) : p.cost;
    T.innerHTML = `<div class="grid-2">${card('Update pricing', '<div id="pf"></div>')}${card('Price analysis', detailList([['List price', formatCurrency(p.price)], ['Average realised price', invLines.length ? formatCurrency(avgSale) : '—'], ['Standard cost', formatCurrency(p.cost)], ['Average purchase cost', formatCurrency(avgCost)], ['Margin at list price', `${margin.toFixed(1)}%`], ['Margin at realised price', avgSale ? `${(((avgSale - p.cost) / avgSale) * 100).toFixed(1)}%` : '—']], 1))}</div>`;
    inlineForm($('#pf', T), { disabled: !Auth.can('edit'), values: p, submitText: 'Update prices', fields: [{ name: 'cost', label: 'Cost price', type: 'currency', required: true }, { name: 'price', label: 'Selling price', type: 'currency', required: true, validate: (v, x) => (v < x.cost ? 'Selling price is below cost.' : '') }],
      onSave: (v) => { DB.update('products', p.id, v); DB.log(`Updated pricing for ${p.id}: cost ${formatCurrency(v.cost)}, price ${formatCurrency(v.price)}`, p.id); showToast('Pricing updated'); App.refresh(); } });
  }
  if (tab === 'transactions') T.innerHTML = card('Stock movements', movementTable(moves, false));
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'edit') Products.edit(p);
    if (a === 'adjust') InventoryUI.adjust(p);
    if (a === 'transfer') InventoryUI.transfer(p);
    if (a === 'reorder') PurchaseOrders.create({ supplierId: p.supplierId, paymentTerms: DB.get('suppliers', p.supplierId)?.paymentTerms || 'Net 30', items: [{ productId: p.id, description: p.name, qty: Math.max(p.reorder * 2 - Inventory.total(p), 1), price: p.cost, discount: 0, tax: DB.data.settings.taxRate }] });
  });
};
function movementTable(moves, showProduct = true) {
  return renderTable([{ label: 'Date', render: (m) => formatDate(m.date) }, { label: 'Reference', render: (m) => esc(m.ref) }, ...(showProduct ? [{ label: 'Product', render: (m) => link('product/' + m.productId, Lookup.productName(m.productId)) }] : []), { label: 'Warehouse', render: (m) => esc(Lookup.warehouseName(m.warehouse)) }, { label: 'Type', render: (m) => badge(m.type, m.qty > 0 ? 'success' : 'info') }, { label: 'Qty', align: 'right', render: (m) => `<span class="${m.qty < 0 ? 'text-danger' : 'text-success'}">${m.qty > 0 ? '+' : ''}${m.qty}</span>` }, { label: 'Before', align: 'right', render: (m) => m.before }, { label: 'After', align: 'right', render: (m) => m.after }, { label: 'User', render: (m) => esc(m.user) }], moves, { empty: 'No stock movements yet.' });
}

/* ---------- Inventory actions ---------- */
const InventoryUI = {
  adjust(p) {
    if (!Auth.can('edit')) { showToast('Your role does not allow stock adjustments.', 'error'); return; }
    formModal({ title: 'Stock adjustment', intro: `<p class="muted">Adjustments are posted to the ledger (Inventory ↔ Cost of Goods Sold).</p>`, fields: [
      { name: 'productId', label: 'Product', type: 'select', required: true, options: () => Inventory.stockProducts().map((x) => ({ value: x.id, label: `${x.id} · ${x.name}` })), full: true },
      { name: 'warehouse', label: 'Warehouse', type: 'select', required: true, options: Lookup.options.warehouses }, { name: 'date', label: 'Date', type: 'date', required: true },
      { name: 'qty', label: 'Quantity change (+/−)', type: 'number', integer: true, required: true, min: -1e9, validate: (v) => (v === 0 ? 'Quantity cannot be zero.' : '') },
      { name: 'reason', label: 'Reason', type: 'select', required: true, options: ['Stock count', 'Damaged goods', 'Lost / missing', 'Found stock', 'Expired', 'Other'] }],
    values: { productId: p?.id, warehouse: 'WH-MAIN', date: today(), reason: 'Stock count' }, submitText: 'Post adjustment',
    onSubmit: (v) => { const r = Inventory.adjust(v); if (r.error) return r; showToast(`Adjustment ${r.ref} posted`); App.refresh(); } });
  },
  transfer(p) {
    if (!Auth.can('edit')) { showToast('Your role does not allow stock transfers.', 'error'); return; }
    formModal({ title: 'Stock transfer', fields: [
      { name: 'productId', label: 'Product', type: 'select', required: true, options: () => Inventory.stockProducts().map((x) => ({ value: x.id, label: `${x.id} · ${x.name} (${Inventory.total(x)} on hand)` })), full: true },
      { name: 'from', label: 'From warehouse', type: 'select', required: true, options: Lookup.options.warehouses }, { name: 'to', label: 'To warehouse', type: 'select', required: true, options: Lookup.options.warehouses, validate: (v, x) => (v === x.from ? 'Choose a different destination warehouse.' : '') },
      { name: 'qty', label: 'Quantity', type: 'number', integer: true, required: true, min: 1 }, { name: 'date', label: 'Transfer date', type: 'date', required: true },
      { name: 'reason', label: 'Reason', full: true, placeholder: 'e.g. Rebalance stock for retail demand' }, { type: 'html', full: true, html: '<div class="transfer-hint muted small" aria-live="polite"></div>' }],
    values: { productId: p?.id, from: 'WH-MAIN', to: 'WH-RETAIL', date: today() }, submitText: 'Transfer stock',
    onInput: (form) => { const x = DB.get('products', $('[name=productId]', form).value); const f = $('[name=from]', form).value; $('.transfer-hint', form).textContent = x ? `${x.stock?.[f] || 0} ${x.unit} available in ${Lookup.warehouseName(f)}.` : ''; },
    onSubmit: (v) => { const r = Inventory.transfer(v); if (r.error) return r; showToast(`Transfer ${r.ref} completed`); App.refresh(); } });
  },
};

Pages.inventory = (el, { query }) => {
  const tab = query.tab || 'stock';
  const sp = Inventory.stockProducts();
  const units = sum(sp, (p) => Inventory.total(p));
  const low = Inventory.lowStock();
  el.innerHTML = pageHeader({ title: 'Inventory', subtitle: `${DB.all('warehouses').length} warehouses · ${formatNumber(units)} units on hand`, actions: `${btn('Stock adjustment', { icon: 'refresh', attrs: 'data-act="adjust"', perm: 'edit' })}${btn('Stock transfer', { icon: 'repeat', cls: 'btn-primary', attrs: 'data-act="transfer"', perm: 'edit' })}` }) +
    `<div class="ledger-strip four">${kpiCard({ label: 'Inventory value', value: formatCurrency(Inventory.totalValue(), true), sub: 'at cost', icon: 'dollar', nav: 'reports?cat=inventory&report=inv-valuation' })}${kpiCard({ label: 'Units on hand', value: formatNumber(units), sub: `${sp.length} stock items`, icon: 'box' })}${kpiCard({ label: 'Low stock', value: low.filter((p) => Inventory.total(p) > 0).length, sub: 'at or below reorder level', icon: 'alert', nav: 'inventory?filter=low', tone: 'warn' })}${kpiCard({ label: 'Out of stock', value: sp.filter((p) => Inventory.total(p) <= 0).length, sub: 'need replenishment', icon: 'x', nav: 'inventory?filter=out', tone: 'neg' })}</div>` +
    tabsHtml([{ key: 'stock', label: 'Stock levels' }, { key: 'warehouses', label: 'Warehouses' }, { key: 'movements', label: 'Stock movements', count: DB.all('movements').length }, { key: 'transfers', label: 'Transfers' }], tab, 'inventory') + '<div id="tab" class="tab-panel"></div>';
  const T = $('#tab', el);
  const whs = DB.all('warehouses');
  if (tab === 'stock') {
    T.innerHTML = '<div class="card"><div class="card-body" id="il"></div></div>';
    listView($('#il', T), {
      key: 'inventory', entity: 'stock items', searchPlaceholder: 'Search stock items…', rows: () => Inventory.stockProducts(),
      filters: [{ key: 'filter', label: 'Level', options: [{ value: 'low', label: 'Low & out of stock' }, { value: 'out', label: 'Out of stock' }, { value: 'ok', label: 'In stock' }], test: (p, v) => (v === 'low' ? Inventory.total(p) <= p.reorder : v === 'out' ? Inventory.total(p) <= 0 : Inventory.total(p) > p.reorder) },
        { key: 'wh', label: 'Warehouse', options: Lookup.options.warehouses, test: (p, v) => (p.stock?.[v] || 0) > 0 }, { key: 'category', label: 'Category', options: PRODUCT_CATEGORIES.filter((c) => !['Software', 'Services'].includes(c)) }],
      preset: query.filter || query.wh ? { ...(query.filter ? { filter: query.filter } : {}), ...(query.wh ? { wh: query.wh } : {}) } : null,
      columns: [
        { key: 'id', label: 'SKU', render: (p) => `<strong>${esc(p.id)}</strong>` }, { key: 'name', label: 'Product', render: (p) => link('product/' + p.id, p.name) },
        ...whs.map((w) => ({ key: 'wh-' + w.id, label: w.name.replace(' Warehouse', ''), align: 'right', value: (p) => p.stock?.[w.id] || 0, render: (p) => formatNumber(p.stock?.[w.id] || 0) })),
        { key: 'total', label: 'Total', align: 'right', value: (p) => Inventory.total(p), render: (p) => `<strong>${formatNumber(Inventory.total(p))}</strong>` },
        { key: 'reserved', label: 'Reserved', align: 'right', value: (p) => Inventory.reserved(p.id) }, { key: 'reorder', label: 'Reorder', align: 'right' },
        { key: 'value', label: 'Value', align: 'right', value: (p) => Inventory.value(p), render: (p) => money(Inventory.value(p)) },
        { key: 'level', label: 'Status', value: (p) => Inventory.level(p), render: (p) => badge(Inventory.level(p)) },
      ],
      rowClass: (p) => (Inventory.total(p) <= p.reorder ? 'row-warn' : ''),
      onView: (p) => navigateTo('product/' + p.id, {}),
      actions: (p) => [{ label: 'View product', icon: 'eye', onClick: () => navigateTo('product/' + p.id + '?tab=inventory') }, { label: 'Adjust stock', icon: 'refresh', perm: 'edit', onClick: () => InventoryUI.adjust(p) }, { label: 'Transfer stock', icon: 'repeat', perm: 'edit', onClick: () => InventoryUI.transfer(p) }, Auth.canView('purchasing') && { label: 'Create purchase order', icon: 'clipboard', perm: 'create', onClick: () => PurchaseOrders.create({ supplierId: p.supplierId, items: [{ productId: p.id, description: p.name, qty: Math.max(1, p.reorder * 2 - Inventory.total(p)), price: p.cost, discount: 0, tax: DB.data.settings.taxRate }] }) }].filter(Boolean),
      exportName: 'inventory-stock', selectable: true,
    });
  }
  if (tab === 'warehouses') {
    T.innerHTML = `<div class="wh-grid">${whs.map((w) => {
      const u = sum(sp, (p) => p.stock?.[w.id] || 0); const v = Inventory.warehouseValue(w.id);
      const top = sp.filter((p) => (p.stock?.[w.id] || 0) > 0).sort((a, b) => (b.stock[w.id] * b.cost) - (a.stock[w.id] * a.cost)).slice(0, 4);
      return card(`${icon('warehouse', 18)} ${esc(w.name)}`, `<p class="muted">${esc(w.location)} · Manager: ${esc(Lookup.employeeName(w.manager))}</p>${statTiles([{ label: 'Stock value', value: formatCurrency(v, true) }, { label: 'Units', value: formatNumber(u) }, { label: 'SKUs', value: sp.filter((p) => (p.stock?.[w.id] || 0) > 0).length }])}
        <div class="cap"><div class="cm-row"><span>Capacity used</span><strong>${w.capacity ? Math.round((u / w.capacity) * 100) : 0}%</strong></div>${progressBar(w.capacity ? (u / w.capacity) * 100 : 0)}</div>
        <h3 class="h-sm">Top items by value</h3>${renderTable([{ label: 'Product', render: (p) => link('product/' + p.id, p.name) }, { label: 'Qty', align: 'right', render: (p) => p.stock[w.id] }, { label: 'Value', align: 'right', render: (p) => money(p.stock[w.id] * p.cost) }], top, { cls: 'compact', empty: 'No stock held.' })}
        <a class="btn btn-sm" href="#/inventory?tab=stock&wh=${w.id}">View stock ${icon('arrowRight', 14)}</a>`, { cls: query.wh === w.id ? 'highlight' : '' });
    }).join('')}</div>`;
  }
  if (tab === 'movements') {
    T.innerHTML = '<div class="card"><div class="card-body" id="ml"></div></div>';
    listView($('#ml', T), {
      key: 'movements', entity: 'movements', searchPlaceholder: 'Search by product, reference, user…', rows: () => DB.all('movements'), selectable: false,
      searchFields: [(m) => m.ref, (m) => m.productId, (m) => Lookup.productName(m.productId), (m) => m.user, (m) => m.note],
      filters: [{ key: 'type', label: 'Type', options: MOVEMENT_TYPES }, { key: 'warehouse', label: 'Warehouse', options: Lookup.options.warehouses }, { key: 'dir', label: 'Direction', options: [{ value: 'in', label: 'Stock in' }, { value: 'out', label: 'Stock out' }], test: (m, v) => (v === 'in' ? m.qty > 0 : m.qty < 0) }],
      preset: query.type ? { type: query.type } : null, dateField: (m) => m.date, defaultSort: { key: 'id', dir: 'desc' },
      columns: [
        { key: 'id', label: 'Movement', render: (m) => `<span class="mono">${esc(m.id)}</span>` }, { key: 'date', label: 'Date', render: (m) => formatDate(m.date), value: (m) => m.date },
        { key: 'ref', label: 'Reference', render: (m) => { const r = m.ref; const route = r.startsWith('ORD-') ? 'order/' + r : r.startsWith('GR-') ? 'purchasing?tab=receipts' : null; return route ? link(route, r) : esc(r); } },
        { key: 'product', label: 'Product', value: (m) => Lookup.productName(m.productId), render: (m) => link('product/' + m.productId, Lookup.productName(m.productId)) },
        { key: 'warehouse', label: 'Warehouse', value: (m) => Lookup.warehouseName(m.warehouse) }, { key: 'type', label: 'Type', render: (m) => badge(m.type, m.qty > 0 ? 'success' : 'info') },
        { key: 'qty', label: 'Qty', align: 'right', render: (m) => `<span class="${m.qty < 0 ? 'text-danger' : 'text-success'}">${m.qty > 0 ? '+' : ''}${m.qty}</span>` },
        { key: 'before', label: 'Before', align: 'right' }, { key: 'after', label: 'After', align: 'right' }, { key: 'user', label: 'User' },
      ],
      exportName: 'stock-movements',
    });
  }
  if (tab === 'transfers') {
    const tr = groupBy(DB.all('movements').filter((m) => m.type === 'Transfer'), (m) => m.ref + '|' + m.productId + '|' + m.date);
    const rows = Object.values(tr).map((ms) => { const out = ms.find((m) => m.qty < 0) || ms[0]; const inn = ms.find((m) => m.qty > 0) || ms[0]; return { id: out.ref, date: out.date, productId: out.productId, from: out.warehouse, to: inn.warehouse, qty: Math.abs(out.qty), user: out.user, note: out.note }; }).sort((a, b) => (a.date < b.date ? 1 : -1));
    T.innerHTML = card('Stock transfers', renderTable([{ label: 'Transfer #', render: (r) => `<strong>${esc(r.id)}</strong>` }, { label: 'Date', render: (r) => formatDate(r.date) }, { label: 'Product', render: (r) => link('product/' + r.productId, Lookup.productName(r.productId)) }, { label: 'From', render: (r) => esc(Lookup.warehouseName(r.from)) }, { label: 'To', render: (r) => esc(Lookup.warehouseName(r.to)) }, { label: 'Qty', align: 'right', render: (r) => r.qty }, { label: 'Reason', render: (r) => esc(r.note) }, { label: 'User', render: (r) => esc(r.user) }], rows, { empty: 'No transfers yet.' }), { actions: btn('New transfer', { icon: 'plus', cls: 'btn-sm btn-primary', attrs: 'data-act="transfer"', perm: 'edit' }) });
  }
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (a === 'adjust') InventoryUI.adjust(null);
    if (a === 'transfer') InventoryUI.transfer(null);
  });
};
