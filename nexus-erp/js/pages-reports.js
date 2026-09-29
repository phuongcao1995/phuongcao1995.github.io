/* ==========================================================================
   NEXUS ERP — pages-reports.js
   Reports center: sales, inventory, purchasing, finance and accounting
   reports with date range, filters, search, sorting, print and CSV export.
   ========================================================================== */
'use strict';

const cur = (k, label, opts = {}) => ({ key: k, label, align: 'right', value: (r) => r[k], render: (r) => money(r[k]), ...opts });
const num = (k, label) => ({ key: k, label, align: 'right', value: (r) => r[k], render: (r) => formatNumber(r[k], Number.isInteger(r[k]) ? 0 : 2) });
const txt = (k, label, render) => ({ key: k, label, value: (r) => r[k], ...(render ? { render } : {}) });
const postedInvoices = (from, to) => DB.all('invoices').filter((i) => !['Draft', 'Cancelled'].includes(i.status) && i.date >= from && i.date <= to);
const monthsBetween = (from, to) => { const out = []; let d = parseISO(from); d.setDate(1); const end = parseISO(to); while (d <= end) { out.push(isoDate(d).slice(0, 7)); d.setMonth(d.getMonth() + 1); } return out; };
const mLabel = (k) => { const [y, m] = k.split('-'); return `${MONTHS[+m - 1]} ${y}`; };

const REPORTS = {
  sales: { label: 'Sales', icon: 'trending', module: 'sales', reports: [
    { key: 'sales-month', label: 'Sales by month', desc: 'Invoiced sales per month (net, tax and totals).', build(f, t) {
      const inv = postedInvoices(f, t);
      const rows = monthsBetween(f, t).map((k) => { const is = inv.filter((i) => monthKey(i.date) === k); return { id: k, month: mLabel(k), count: is.length, net: round2(sum(is, (i) => Calc.doc(i).net)), tax: round2(sum(is, (i) => Calc.doc(i).tax)), total: round2(sum(is, (i) => Calc.doc(i).total)), collected: round2(sum(is, (i) => i.paid || 0)) }; });
      return { rows, columns: [txt('month', 'Month'), num('count', 'Invoices'), cur('net', 'Net sales'), cur('tax', 'Tax'), cur('total', 'Total'), cur('collected', 'Collected')], chart: Charts.combo({ labels: rows.map((r) => r.month.slice(0, 3)), bars: [{ name: 'Net sales', values: rows.map((r) => r.net), color: 'var(--c1)' }], lines: [{ name: 'Collected', values: rows.map((r) => r.collected), color: 'var(--c2)' }], height: 220 }), totals: ['net', 'tax', 'total', 'collected', 'count'] };
    } },
    { key: 'sales-customer', label: 'Sales by customer', desc: 'Invoiced sales, payments and balances per customer.', build(f, t) {
      const g = groupBy(postedInvoices(f, t), (i) => i.customerId);
      const rows = Object.entries(g).map(([id, is]) => ({ id, customer: Lookup.customerName(id), count: is.length, net: round2(sum(is, (i) => Calc.doc(i).net)), total: round2(sum(is, (i) => Calc.doc(i).total)), paid: round2(sum(is, (i) => i.paid || 0)), balance: round2(sum(is, Docs.balance)) })).sort((a, b) => b.net - a.net);
      return { rows, columns: [txt('customer', 'Customer', (r) => link('customer/' + r.id, r.customer)), num('count', 'Invoices'), cur('net', 'Net sales'), cur('total', 'Total'), cur('paid', 'Paid'), cur('balance', 'Outstanding')], chart: Charts.hbars({ items: rows.slice(0, 8).map((r) => ({ label: r.customer, value: r.net })) }), totals: ['count', 'net', 'total', 'paid', 'balance'] };
    } },
    { key: 'sales-product', label: 'Sales by product', desc: 'Quantity, revenue, cost and margin per product.', filters: [{ key: 'category', label: 'Category', options: PRODUCT_CATEGORIES }], build(f, t, q) {
      const agg = {};
      postedInvoices(f, t).forEach((i) => i.items.forEach((it) => { const p = DB.get('products', it.productId); const k = it.productId || 'custom'; const a = agg[k] || (agg[k] = { id: k, product: p ? p.name : 'Custom items', category: p ? p.category : 'Services', qty: 0, net: 0, cost: 0 }); a.qty += Number(it.qty); a.net += Calc.line(it).net; a.cost += p && p.type !== 'service' ? p.cost * it.qty : 0; }));
      let rows = Object.values(agg).map((a) => ({ ...a, net: round2(a.net), cost: round2(a.cost), margin: round2(a.net - a.cost), pct: a.net ? round2(((a.net - a.cost) / a.net) * 100) : 0 }));
      if (q.category) rows = rows.filter((r) => r.category === q.category);
      rows.sort((a, b) => b.net - a.net);
      return { rows, columns: [txt('product', 'Product', (r) => (DB.get('products', r.id) ? link('product/' + r.id, r.product) : esc(r.product))), txt('category', 'Category'), num('qty', 'Qty sold'), cur('net', 'Net sales'), cur('cost', 'Cost'), cur('margin', 'Gross margin'), { key: 'pct', label: 'Margin %', align: 'right', value: (r) => r.pct, render: (r) => r.pct.toFixed(1) + '%' }], chart: Charts.hbars({ items: rows.slice(0, 8).map((r) => ({ label: r.product, value: r.net })), color: 'var(--c3)' }), totals: ['qty', 'net', 'cost', 'margin'] };
    } },
    { key: 'sales-person', label: 'Sales by salesperson', desc: 'Orders booked per salesperson.', build(f, t) {
      const os = DB.all('orders').filter((o) => o.status !== 'Cancelled' && o.date >= f && o.date <= t);
      const rows = Object.entries(groupBy(os, (o) => o.salesperson)).map(([id, xs]) => ({ id, person: Lookup.employeeName(id), orders: xs.length, net: round2(sum(xs, (o) => Calc.doc(o).net)), total: round2(sum(xs, (o) => Calc.doc(o).total)), avg: round2(sum(xs, (o) => Calc.doc(o).total) / xs.length), quotes: DB.all('quotations').filter((q) => q.salesperson === id && q.date >= f && q.date <= t).length })).sort((a, b) => b.net - a.net);
      return { rows, columns: [txt('person', 'Salesperson'), num('orders', 'Orders'), num('quotes', 'Quotations'), cur('net', 'Net sales'), cur('total', 'Total'), cur('avg', 'Avg order value')], chart: Charts.hbars({ items: rows.map((r) => ({ label: r.person, value: r.net })), color: 'var(--c2)' }), totals: ['orders', 'quotes', 'net', 'total'] };
    } },
  ] },
  inventory: { label: 'Inventory', icon: 'box', module: 'inventory', reports: [
    { key: 'inv-valuation', label: 'Inventory valuation', desc: 'Current stock quantity and value at cost.', noDates: true, filters: [{ key: 'category', label: 'Category', options: ['Electronics', 'Equipment', 'Office Supplies'] }], build(f, t, q) {
      const tv = Inventory.totalValue();
      const rows = Inventory.stockProducts().filter((p) => !q.category || p.category === q.category).map((p) => ({ id: p.id, sku: p.id, product: p.name, category: p.category, qty: Inventory.total(p), cost: p.cost, value: round2(Inventory.value(p)), share: tv ? round2((Inventory.value(p) / tv) * 100) : 0 })).sort((a, b) => b.value - a.value);
      return { rows, columns: [txt('sku', 'SKU'), txt('product', 'Product', (r) => link('product/' + r.id, r.product)), txt('category', 'Category'), num('qty', 'On hand'), cur('cost', 'Unit cost'), cur('value', 'Value'), { key: 'share', label: '% of total', align: 'right', value: (r) => r.share, render: (r) => r.share.toFixed(1) + '%' }], chart: Charts.donut({ items: ['Electronics', 'Equipment', 'Office Supplies'].map((c) => ({ label: c, value: round2(sum(rows.filter((r) => r.category === c), (r) => r.value)) })), centerLabel: 'Stock value' }), totals: ['qty', 'value'] };
    } },
    { key: 'inv-movement', label: 'Inventory movement', desc: 'Units in and out per product for the period.', filters: [{ key: 'warehouse', label: 'Warehouse', options: Lookup.options.warehouses }], build(f, t, q) {
      const ms = DB.all('movements').filter((m) => m.date >= f && m.date <= t && m.type !== 'Opening Balance' && (!q.warehouse || m.warehouse === q.warehouse));
      const rows = Object.entries(groupBy(ms, (m) => m.productId)).map(([id, xs]) => ({ id, product: Lookup.productName(id), in: sum(xs.filter((m) => m.qty > 0), (m) => m.qty), out: -sum(xs.filter((m) => m.qty < 0), (m) => m.qty), net: sum(xs, (m) => m.qty), moves: xs.length, onHand: Inventory.total(DB.get('products', id)) })).sort((a, b) => b.out - a.out);
      return { rows, columns: [txt('product', 'Product', (r) => link('product/' + r.id, r.product)), num('in', 'Units in'), num('out', 'Units out'), num('net', 'Net change'), num('moves', 'Movements'), num('onHand', 'On hand now')], totals: ['in', 'out', 'net', 'moves'] };
    } },
    { key: 'inv-low', label: 'Low stock report', desc: 'Stock items at or below reorder level.', noDates: true, build() {
      const rows = Inventory.lowStock().map((p) => ({ id: p.id, product: p.name, qty: Inventory.total(p), reorder: p.reorder, shortfall: Math.max(0, p.reorder * 2 - Inventory.total(p)), supplier: Lookup.supplierName(p.supplierId), cost: round2(Math.max(0, p.reorder * 2 - Inventory.total(p)) * p.cost), level: Inventory.level(p) }));
      return { rows, columns: [txt('id', 'SKU'), txt('product', 'Product', (r) => link('product/' + r.id, r.product)), num('qty', 'On hand'), num('reorder', 'Reorder level'), num('shortfall', 'Suggested order'), cur('cost', 'Est. cost'), txt('supplier', 'Preferred supplier'), txt('level', 'Status', (r) => badge(r.level))], totals: ['shortfall', 'cost'] };
    } },
    { key: 'inv-turnover', label: 'Inventory turnover', desc: 'Cost of goods sold ÷ inventory value and days on hand.', build(f, t) {
      const days = Math.max(1, daysBetween(f, t) + 1);
      const sold = {};
      DB.all('movements').filter((m) => m.type === 'Sales Delivery' && m.date >= f && m.date <= t).forEach((m) => { sold[m.productId] = (sold[m.productId] || 0) - m.qty; });
      const rows = Inventory.stockProducts().map((p) => { const cogs = round2((sold[p.id] || 0) * p.cost); const val = Inventory.value(p); const turn = val ? cogs / val : 0; return { id: p.id, product: p.name, sold: sold[p.id] || 0, cogs, value: round2(val), turnover: round2(turn), doh: turn ? Math.round(days / turn) : null }; }).sort((a, b) => b.turnover - a.turnover);
      return { rows, columns: [txt('product', 'Product', (r) => link('product/' + r.id, r.product)), num('sold', 'Units sold'), cur('cogs', 'COGS'), cur('value', 'Inventory value'), { key: 'turnover', label: 'Turnover', align: 'right', value: (r) => r.turnover, render: (r) => r.turnover.toFixed(2) + '×' }, { key: 'doh', label: 'Days on hand', align: 'right', value: (r) => r.doh ?? 1e9, render: (r) => (r.doh === null ? '—' : formatNumber(r.doh)) }], summary: `Overall turnover: ${Inventory.turnover(f, t).toFixed(2)}× for the period`, totals: ['sold', 'cogs', 'value'] };
    } },
  ] },
  purchasing: { label: 'Purchasing', icon: 'clipboard', module: 'purchasing', reports: [
    { key: 'pur-supplier', label: 'Purchases by supplier', desc: 'Ordered, received and billed values per supplier.', build(f, t) {
      const pos = DB.all('purchaseOrders').filter((p) => !['Draft', 'Cancelled'].includes(p.status) && p.date >= f && p.date <= t);
      const rows = Object.entries(groupBy(pos, (p) => p.supplierId)).map(([id, xs]) => ({ id, supplier: Lookup.supplierName(id), pos: xs.length, ordered: round2(sum(xs, (p) => Calc.doc(p).total)), received: round2(sum(xs, (p) => sum(p.items, (i) => (i.received || 0) * i.price))), billed: round2(sum(DB.all('bills').filter((b) => b.status !== 'Voided' && xs.some((p) => p.id === b.poId)), (b) => Calc.doc(b).total)), outstanding: Stats.supplier(id).outstanding })).sort((a, b) => b.ordered - a.ordered);
      return { rows, columns: [txt('supplier', 'Supplier', (r) => link('supplier/' + r.id, r.supplier)), num('pos', 'POs'), cur('ordered', 'Ordered'), cur('received', 'Received (net)'), cur('billed', 'Billed'), cur('outstanding', 'Outstanding')], chart: Charts.hbars({ items: rows.slice(0, 8).map((r) => ({ label: r.supplier, value: r.ordered })), color: 'var(--c4)' }), totals: ['pos', 'ordered', 'received', 'billed', 'outstanding'] };
    } },
    { key: 'pur-product', label: 'Purchases by product', desc: 'Quantities ordered and received per product.', build(f, t) {
      const agg = {};
      DB.all('purchaseOrders').filter((p) => !['Draft', 'Cancelled'].includes(p.status) && p.date >= f && p.date <= t).forEach((p) => p.items.forEach((i) => { const a = agg[i.productId] || (agg[i.productId] = { id: i.productId, product: Lookup.productName(i.productId), ordered: 0, received: 0, rejected: 0, spend: 0 }); a.ordered += i.qty; a.received += i.received || 0; a.rejected += i.rejected || 0; a.spend += Calc.line(i).total; }));
      const rows = Object.values(agg).map((a) => ({ ...a, spend: round2(a.spend), avg: round2(a.spend / a.ordered) })).sort((a, b) => b.spend - a.spend);
      return { rows, columns: [txt('product', 'Product', (r) => link('product/' + r.id, r.product)), num('ordered', 'Ordered'), num('received', 'Received'), num('rejected', 'Rejected'), cur('avg', 'Avg unit cost'), cur('spend', 'Spend')], totals: ['ordered', 'received', 'rejected', 'spend'] };
    } },
    { key: 'pur-spending', label: 'Purchase spending', desc: 'Monthly purchase order and expense spending.', build(f, t) {
      const pos = DB.all('purchaseOrders').filter((p) => !['Draft', 'Cancelled'].includes(p.status));
      const xs = DB.all('expenses').filter((x) => x.status !== 'Rejected');
      const rows = monthsBetween(f, t).map((k) => { const p = pos.filter((x) => monthKey(x.date) === k); const e = xs.filter((x) => monthKey(x.date) === k); return { id: k, month: mLabel(k), pos: p.length, po: round2(sum(p, (x) => Calc.doc(x).total)), exp: round2(sum(e, (x) => x.amount + (x.tax || 0))), total: round2(sum(p, (x) => Calc.doc(x).total) + sum(e, (x) => x.amount + (x.tax || 0))) }; });
      return { rows, columns: [txt('month', 'Month'), num('pos', 'Purchase orders'), cur('po', 'PO spend'), cur('exp', 'Expenses'), cur('total', 'Total spend')], chart: Charts.combo({ labels: rows.map((r) => r.month.slice(0, 3)), bars: [{ name: 'PO spend', values: rows.map((r) => r.po), color: 'var(--c4)' }, { name: 'Expenses', values: rows.map((r) => r.exp), color: 'var(--c3)' }], height: 220 }), totals: ['pos', 'po', 'exp', 'total'] };
    } },
  ] },
  finance: { label: 'Finance', icon: 'dollar', module: 'finance', reports: [
    { key: 'fin-cashflow', label: 'Cash flow report', desc: 'Cash in, cash out and net cash flow by month.', build(f, t) {
      const cash = new Set([ACCT.CASH, ACCT.BANK]);
      const js = DB.all('journals').filter((j) => j.source !== 'Opening');
      let running = Accounting.cashBalance(addDays(f, -1));
      const rows = monthsBetween(f, t).map((k) => { const ls = js.filter((j) => monthKey(j.date) === k && j.date >= f && j.date <= t).flatMap((j) => j.lines.filter((l) => cash.has(l.account))); const inn = round2(sum(ls, (l) => l.debit)); const out = round2(sum(ls, (l) => l.credit)); running = round2(running + inn - out); return { id: k, month: mLabel(k), in: inn, out, net: round2(inn - out), closing: running }; });
      return { rows, columns: [txt('month', 'Month'), cur('in', 'Cash in'), cur('out', 'Cash out'), cur('net', 'Net cash flow'), cur('closing', 'Closing cash')], chart: Charts.combo({ labels: rows.map((r) => r.month.slice(0, 3)), bars: [{ name: 'Cash in', values: rows.map((r) => r.in), color: 'var(--c1)' }, { name: 'Cash out', values: rows.map((r) => r.out), color: 'var(--c5)' }], lines: [{ name: 'Net', values: rows.map((r) => r.net), color: 'var(--c2)' }], height: 220 }), totals: ['in', 'out', 'net'] };
    } },
    { key: 'fin-revenue', label: 'Revenue report', desc: 'Revenue by account and month from the ledger.', build(f, t) {
      const accts = DB.all('accounts').filter((a) => a.type === 'Revenue' && !a.header);
      const rows = monthsBetween(f, t).map((k) => { const [y, m] = k.split('-').map(Number); const s = k + '-01'; const e = isoDate(new Date(y, m, 0)); const b = Accounting.balances(s < f ? f : s, e > t ? t : e); const r = { id: k, month: mLabel(k) }; accts.forEach((a) => { r[a.code] = Accounting.balance(a.code, null, null, b); }); r.total = round2(sum(accts, (a) => r[a.code])); return r; });
      return { rows, columns: [txt('month', 'Month'), ...accts.map((a) => cur(a.code, a.name)), cur('total', 'Total revenue')], chart: Charts.combo({ labels: rows.map((r) => r.month.slice(0, 3)), bars: accts.slice(0, 2).map((a, i) => ({ name: a.name, values: rows.map((r) => r[a.code]), color: i ? 'var(--c2)' : 'var(--c1)' })), height: 220 }), totals: [...accts.map((a) => a.code), 'total'] };
    } },
    { key: 'fin-expenses', label: 'Expense report', desc: 'Expenses by category for the period.', filters: [{ key: 'status', label: 'Status', options: ['Pending', 'Approved', 'Paid'] }], build(f, t, q) {
      const xs = DB.all('expenses').filter((x) => x.status !== 'Rejected' && x.date >= f && x.date <= t && (!q.status || x.status === q.status));
      const tot = sum(xs, (x) => x.amount);
      const rows = EXPENSE_CATEGORIES.map((c) => { const e = xs.filter((x) => x.category === c); return { id: c, category: c, count: e.length, amount: round2(sum(e, (x) => x.amount)), tax: round2(sum(e, (x) => x.tax || 0)), share: tot ? round2((sum(e, (x) => x.amount) / tot) * 100) : 0 }; }).filter((r) => r.count).sort((a, b) => b.amount - a.amount);
      return { rows, columns: [txt('category', 'Category', (r) => link('expenses?category=' + r.category, r.category)), num('count', 'Expenses'), cur('amount', 'Amount'), cur('tax', 'Tax'), { key: 'share', label: '% of total', align: 'right', value: (r) => r.share, render: (r) => r.share.toFixed(1) + '%' }], chart: Charts.donut({ items: rows.map((r) => ({ label: r.category, value: r.amount })), centerLabel: 'Expenses' }), totals: ['count', 'amount', 'tax'] };
    } },
    { key: 'fin-ar', label: 'Accounts receivable aging', desc: 'Open customer balances by aging bucket.', noDates: true, build() {
      const rows = agingByParty(DB.all('invoices'), 'customerId', Lookup.customerName);
      return { rows, columns: [txt('name', 'Customer', (r) => link('customer/' + r.id, r.name)), ...AGING_BUCKETS.map((b) => cur(b, b)), cur('total', 'Total')], chart: Charts.columns({ items: agingSummary(DB.all('invoices')), colors: AGING_COLORS, height: 150 }), totals: [...AGING_BUCKETS, 'total'] };
    } },
    { key: 'fin-ap', label: 'Accounts payable aging', desc: 'Open supplier balances by aging bucket.', noDates: true, build() {
      const rows = agingByParty(DB.all('bills'), 'supplierId', Lookup.supplierName);
      return { rows, columns: [txt('name', 'Supplier', (r) => link('supplier/' + r.id, r.name)), ...AGING_BUCKETS.map((b) => cur(b, b)), cur('total', 'Total')], chart: Charts.columns({ items: agingSummary(DB.all('bills')), colors: AGING_COLORS, height: 150 }), totals: [...AGING_BUCKETS, 'total'] };
    } },
  ] },
  accounting: { label: 'Accounting', icon: 'book', module: 'finreports', reports: [
    { key: 'acc-tb', label: 'Trial balance', desc: 'Debit and credit totals per account.', build(f, t) {
      const rows = Accounting.trialBalance(f, t).map((r) => ({ ...r, id: r.code }));
      return { rows, columns: [txt('code', 'Code'), txt('name', 'Account', (r) => link(`ledger?account=${r.code}&from=${f}&to=${t}`, r.name)), txt('type', 'Type'), cur('debit', 'Debit'), cur('credit', 'Credit')], totals: ['debit', 'credit'] };
    } },
    { key: 'acc-gl', label: 'General ledger', desc: 'Every posted journal line in the period.', filters: [{ key: 'account', label: 'Account', options: Lookup.options.accounts }], build(f, t, q) {
      const rows = DB.all('journals').filter((j) => j.date >= f && j.date <= t).flatMap((j) => j.lines.filter((l) => !q.account || l.account === q.account).map((l, k) => ({ id: j.id + '-' + k, date: j.date, je: j.id, ref: j.ref, account: Lookup.accountName(l.account), description: l.description || j.description, debit: l.debit, credit: l.credit })));
      return { rows, columns: [txt('date', 'Date', (r) => formatDate(r.date)), txt('je', 'Entry', (r) => link('journals?je=' + r.je, r.je)), txt('ref', 'Reference'), txt('account', 'Account'), txt('description', 'Description'), cur('debit', 'Debit'), cur('credit', 'Credit')], totals: ['debit', 'credit'] };
    } },
    { key: 'acc-pnl', label: 'Profit & loss', desc: 'Income statement for the period.', build(f, t) { return stmtReport(FinStatements.pnl(f, t).rows); } },
    { key: 'acc-bs', label: 'Balance sheet', desc: 'Assets, liabilities and equity at the end date.', build(f, t) { return stmtReport(FinStatements.bs(t).rows); } },
    { key: 'acc-cf', label: 'Cash flow statement', desc: 'Operating, investing and financing cash flows.', build(f, t) { return stmtReport(FinStatements.cf(f, t).rows); } },
  ] },
};
function stmtReport(lines) {
  const rows = lines.map((r, i) => ({ id: 'l' + i, line: r.label, code: r.code || '', amount: r.amount, cls: r.cls }));
  return { rows, statement: true, columns: [{ key: 'line', label: 'Line', sortable: false, value: (r) => r.line, render: (r) => (['sec', 'sub', 'total', 'grand'].includes(r.cls) ? `<strong>${esc(r.line)}</strong>` : `<span class="indent">${r.code ? `<span class="mono muted">${esc(r.code)}</span> ` : ''}${esc(r.line)}</span>`) }, { key: 'amount', label: 'Amount', align: 'right', sortable: false, value: (r) => r.amount ?? '', render: (r) => (r.amount === undefined ? '' : ['total', 'grand'].includes(r.cls) ? `<strong>${formatCurrency(r.amount)}</strong>` : formatCurrency(r.amount)) }] };
}

Pages.reports = (el, { query }) => {
  const cats = Object.entries(REPORTS).filter(([, c]) => Auth.canView(c.module) || Auth.canView('reports'));
  const catKey = REPORTS[query.cat] ? query.cat : 'sales';
  const cat = REPORTS[catKey];
  const rep = cat.reports.find((r) => r.key === query.report) || cat.reports[0];
  const from = query.from || periodStart(); const to = query.to || today();
  App.setCrumb(`${cat.label} reports`);
  const qs = (o) => new URLSearchParams({ cat: catKey, report: rep.key, from, to, ...Object.fromEntries((rep.filters || []).map((f) => [f.key, query[f.key] || ''])), ...o }).toString();
  const built = rep.build(from, to, query);
  const totalsRow = built.totals && built.rows.length ? `<div class="report-totals">${built.totals.map((k) => { const c = built.columns.find((x) => x.key === k); const v = round2(sum(built.rows, (r) => r[k])); return `<div><span>${esc(c?.label || k)}</span><strong>${c?.render && c.render({ [k]: v }).includes('money') ? formatCurrency(v) : formatNumber(v, Number.isInteger(v) ? 0 : 2)}</strong></div>`; }).join('')}</div>` : '';
  el.innerHTML = pageHeader({ title: 'Reports', subtitle: 'Business reports generated from live data', actions: btn('Print', { icon: 'printer', attrs: 'data-action="print"' }) }) +
    `<div class="reports-layout"><nav class="report-nav no-print" aria-label="Report categories">${cats.map(([k, c]) => `<div class="rn-group"><a class="rn-cat ${k === catKey ? 'active' : ''}" href="#/reports?cat=${k}">${icon(c.icon, 16)} ${esc(c.label)}</a>${k === catKey ? `<ul>${c.reports.map((r) => `<li><a class="${r.key === rep.key ? 'active' : ''}" href="#/reports?cat=${k}&report=${r.key}&from=${from}&to=${to}" ${r.key === rep.key ? 'aria-current="page"' : ''}>${esc(r.label)}</a></li>`).join('')}</ul>` : ''}</div>`).join('')}</nav>
    <div class="report-main">
      <div class="card"><div class="card-body"><div class="report-head"><div><h2>${esc(rep.label)}</h2><p class="muted">${esc(rep.desc)} · ${rep.noDates ? `As of ${formatDate(today())}` : `${formatDate(from)} – ${formatDate(to)}`}</p></div><span class="muted small">${esc(DB.data.settings.company.name)}</span></div>
        <div class="filter-bar no-print">${rep.noDates ? '' : `<label>From <input type="date" id="rp-from" value="${from}"></label><label>To <input type="date" id="rp-to" value="${to}"></label><div class="chip-row">${[['30 days', addDays(today(), -29)], ['90 days', addDays(today(), -89)], ['YTD', today().slice(0, 4) + '-01-01'], ['9 months', periodStart()]].map(([l, f]) => `<a class="chip ${f === from && to === today() ? 'active' : ''}" href="#/reports?${qs({ from: f, to: today() })}">${l}</a>`).join('')}</div>`}
        ${(rep.filters || []).map((f) => `<label>${esc(f.label)} <select data-rf="${f.key}"><option value="">All</option>${normOptions(f.options).map((o) => `<option value="${esc(o.value)}"${String(query[f.key] || '') === String(o.value) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`).join('')}</div>
        ${built.summary ? `<p class="notice info">${icon('info', 16)} ${esc(built.summary)}</p>` : ''}${built.chart ? `<div class="report-chart">${built.chart}</div>` : ''}${totalsRow}</div></div>
      <div class="card"><div class="card-body" id="rt"></div></div></div></div>`;
  listView($('#rt', el), { key: 'report-' + rep.key, entity: 'rows', rows: () => built.rows, columns: built.columns, selectable: false, pageSize: built.statement ? 100 : 25, rowClass: (r) => (r.cls ? 'stmt-' + r.cls : ''), exportName: `report-${rep.key}`, searchPlaceholder: 'Search this report…' });
  const go = (o) => navigateTo('reports?' + qs(o), { replace: true });
  $('#rp-from', el)?.addEventListener('change', (e) => go({ from: e.target.value || from }));
  $('#rp-to', el)?.addEventListener('change', (e) => go({ to: e.target.value || to }));
  $$('[data-rf]', el).forEach((s) => s.addEventListener('change', () => go({ [s.dataset.rf]: s.value })));
};
