/* ==========================================================================
   NEXUS ERP — services.js
   Business logic: authentication & permissions, document calculations,
   double-entry accounting, inventory, sales, billing, purchasing, payments,
   expenses, projects and notifications. UI code calls into these services.
   ========================================================================== */
'use strict';

/* ---------- Modules & permissions ---------- */
const MODULES = [
  { key: 'dashboard', label: 'Dashboard' }, { key: 'customers', label: 'Customers' }, { key: 'sales', label: 'Sales & Quotations' },
  { key: 'orders', label: 'Orders' }, { key: 'products', label: 'Products' }, { key: 'inventory', label: 'Inventory' },
  { key: 'suppliers', label: 'Suppliers' }, { key: 'purchasing', label: 'Purchasing' }, { key: 'billing', label: 'Billing' },
  { key: 'payments', label: 'Payments' }, { key: 'expenses', label: 'Expenses' }, { key: 'finance', label: 'Finance' },
  { key: 'accounts', label: 'Chart of Accounts' }, { key: 'journals', label: 'Journal Entries' }, { key: 'ledger', label: 'General Ledger' },
  { key: 'ar', label: 'Accounts Receivable' }, { key: 'ap', label: 'Accounts Payable' }, { key: 'finreports', label: 'Financial Reports' },
  { key: 'projects', label: 'Projects' }, { key: 'tasks', label: 'Tasks' }, { key: 'employees', label: 'Employees' },
  { key: 'reports', label: 'Reports' }, { key: 'notifications', label: 'Notifications' }, { key: 'settings', label: 'Settings' },
];
const PERMISSIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

const Auth = {
  session() { return loadData('session'); },
  user() { const s = this.session(); return s ? DB.all('users').find((u) => u.id === s.userId) || null : null; },
  userName() { return this.user()?.name || 'System'; },
  role() { const u = this.user(); return u ? DB.all('roles').find((r) => r.name === u.role) || null : null; },
  login(email, password) {
    const u = DB.all('users').find((x) => x.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!u || u.password !== password) return { error: 'The email or password is incorrect.' };
    if (u.status !== 'Active') return { error: 'This user account is inactive. Ask an administrator to activate it.' };
    saveData('session', { userId: u.id, ts: Date.now() });
    u.lastLogin = new Date().toISOString(); DB.save('users');
    return { user: u };
  },
  logout() { removeData('session'); },
  canView(module) {
    const r = this.role();
    if (!r || !r.perms.view) return false;
    return r.modules.includes('*') || r.modules.includes(module);
  },
  can(action) { const r = this.role(); return !!(r && r.perms[action]); },
};

/* ---------- Lookups ---------- */
const Lookup = {
  customerName: (id) => DB.get('customers', id)?.company || '—',
  supplierName: (id) => DB.get('suppliers', id)?.company || '—',
  employeeName: (id) => DB.get('employees', id)?.name || '—',
  productName: (id) => DB.get('products', id)?.name || id || '—',
  warehouseName: (id) => DB.get('warehouses', id)?.name || id || '—',
  projectName: (id) => DB.get('projects', id)?.name || '—',
  accountName: (code) => { const a = DB.get('accounts', code); return a ? `${a.code} · ${a.name}` : code; },
  termsDays: (name) => (DB.data.settings.paymentTerms.find((t) => t.name === name) || { days: 30 }).days,
  employees: (dept) => DB.all('employees').filter((e) => e.status === 'Active' && (!dept || e.department === dept)),
  options: {
    customers: () => DB.all('customers').filter((c) => c.status !== 'Inactive').map((c) => ({ value: c.id, label: `${c.company} (${c.id})` })),
    suppliers: () => DB.all('suppliers').filter((s) => s.status !== 'Inactive').map((s) => ({ value: s.id, label: `${s.company} (${s.id})` })),
    employees: (dept) => Lookup.employees(dept).map((e) => ({ value: e.id, label: `${e.name} — ${e.position}` })),
    warehouses: () => DB.all('warehouses').map((w) => ({ value: w.id, label: w.name })),
    projects: () => DB.all('projects').filter((p) => p.status !== 'Cancelled').map((p) => ({ value: p.id, label: `${p.id} · ${p.name}` })),
    terms: () => DB.data.settings.paymentTerms.map((t) => t.name),
    cashAccounts: () => DB.all('accounts').filter((a) => ['1010', '1020'].includes(a.code)).map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` })),
    accounts: () => DB.all('accounts').filter((a) => !a.header).map((a) => ({ value: a.code, label: `${a.code} · ${a.name}` })),
  },
};

/* ---------- Document calculations ---------- */
const Calc = {
  /** Line: gross = qty × unit price; discount = gross × disc%; tax = (gross − discount) × tax% */
  line(it) {
    const gross = (Number(it.qty) || 0) * (Number(it.price) || 0);
    const disc = gross * (Number(it.discount) || 0) / 100;
    const tax = (gross - disc) * (Number(it.tax) || 0) / 100;
    return { gross, disc, tax, net: gross - disc, total: gross - disc + tax };
  },
  /** Document totals: Grand Total = Subtotal − Discount + Tax + Shipping */
  doc(d) {
    let s = 0; let di = 0; let t = 0;
    (d.items || []).forEach((it) => { const l = Calc.line(it); s += l.gross; di += l.disc; t += l.tax; });
    const sh = Number(d.shipping) || 0;
    return { subtotal: round2(s), discount: round2(di), tax: round2(t), shipping: round2(sh), net: round2(s - di), total: round2(s - di + t + sh) };
  },
};

/** Shared helpers for receivable/payable documents (invoices and supplier bills). */
const Docs = {
  total: (d) => Calc.doc(d).total,
  balance: (d) => (['Cancelled', 'Voided', 'Draft'].includes(d.status) ? 0 : round2(Calc.doc(d).total - (d.paid || 0))),
  status(d) {
    if (['Draft', 'Cancelled', 'Voided'].includes(d.status)) return d.status;
    const bal = round2(Calc.doc(d).total - (d.paid || 0));
    if (bal <= 0.009) return 'Paid';
    if (d.dueDate < today()) return 'Overdue';
    if ((d.paid || 0) > 0) return 'Partially Paid';
    return d.kind === 'bill' ? 'Open' : 'Sent';
  },
  isOpen: (d) => !['Draft', 'Cancelled', 'Voided'].includes(d.status) && Docs.balance(d) > 0.009,
  daysOverdue: (d) => { const n = daysBetween(d.dueDate, today()); return n > 0 && Docs.isOpen(d) ? n : 0; },
  bucket(d) {
    const n = Docs.daysOverdue(d);
    if (n <= 0) return 'Current';
    if (n <= 30) return '1–30 Days';
    if (n <= 60) return '31–60 Days';
    if (n <= 90) return '61–90 Days';
    return '90+ Days';
  },
};
const AGING_BUCKETS = ['Current', '1–30 Days', '31–60 Days', '61–90 Days', '90+ Days'];

/* ---------- Accounting (double entry) ---------- */
const ACCT = { CASH: '1010', BANK: '1020', AR: '1100', INV: '1200', FA: '1500', AP: '2010', TAX: '2100', LOAN: '2500', EQUITY: '3010', RE: '3100', SALES: '4010', SERVICE: '4020', COGS: '5010' };
const EXPENSE_ACCOUNTS = { Office: '6070', Travel: '6060', Marketing: '6040', Utilities: '6030', Salary: '6010', Software: '6050', Equipment: '6080', Rent: '6020', Other: '6090' };
const ACCOUNT_TYPES = ['Asset', 'Liability', 'Equity', 'Revenue', 'COGS', 'Expense'];

const Accounting = {
  type(code) { const a = DB.get('accounts', code); return a ? a.type : ({ 1: 'Asset', 2: 'Liability', 3: 'Equity', 4: 'Revenue', 5: 'COGS', 6: 'Expense' })[String(code)[0]]; },
  normalDebit(code) { return ['Asset', 'COGS', 'Expense'].includes(this.type(code)); },

  /** Posts a balanced journal entry. Throws if debits ≠ credits. */
  post({ date, ref = '', description = '', source = 'Manual', lines, createdAt }) {
    const clean = lines.map((l) => ({ account: l.account, description: l.description || '', debit: round2(l.debit || 0), credit: round2(l.credit || 0) }))
      .filter((l) => l.debit || l.credit);
    if (!clean.length) return null;
    const d = round2(sum(clean, (l) => l.debit)); const c = round2(sum(clean, (l) => l.credit));
    if (Math.abs(d - c) > 0.009) throw new Error(`Journal is not balanced (debit ${d} vs credit ${c}).`);
    const je = { id: DB.nextId('journals', 'JE-', 5), date, ref, description, source, status: 'Posted', lines: clean, createdBy: Auth.userName(), createdAt: createdAt || new Date().toISOString() };
    DB.insert('journals', je);
    return je;
  },
  /** Posts reversing entries for every journal attached to a reference. */
  reverse(ref, date = today(), reason = 'Reversal') {
    const js = DB.all('journals').filter((j) => j.ref === ref && !j.reversed && j.source !== 'Reversal');
    js.forEach((j) => {
      this.post({ date, ref, description: `${reason}: ${j.description}`, source: 'Reversal', lines: j.lines.map((l) => ({ account: l.account, description: l.description, debit: l.credit, credit: l.debit })) });
      j.reversed = true;
    });
    DB.save('journals');
    return js.length;
  },
  /** Aggregated debit/credit per account over a date range (inclusive). */
  balances(from, to) {
    const out = {};
    for (const j of DB.all('journals')) {
      if ((from && j.date < from) || (to && j.date > to)) continue;
      for (const l of j.lines) {
        const b = out[l.account] || (out[l.account] = { debit: 0, credit: 0 });
        b.debit += l.debit; b.credit += l.credit;
      }
    }
    return out;
  },
  /** Signed balance in the account's normal direction. */
  balance(code, from, to, cache) {
    const b = (cache || this.balances(from, to))[code] || { debit: 0, credit: 0 };
    return round2(this.normalDebit(code) ? b.debit - b.credit : b.credit - b.debit);
  },
  cashBalance(to) { const b = this.balances(null, to); return round2(this.balance(ACCT.CASH, null, null, b) + this.balance(ACCT.BANK, null, null, b)); },

  pnl(from, to) {
    const b = this.balances(from, to);
    const accts = DB.all('accounts').filter((a) => !a.header);
    const pick = (type) => accts.filter((a) => a.type === type).map((a) => ({ code: a.code, name: a.name, amount: this.balance(a.code, null, null, b) })).filter((x) => Math.abs(x.amount) > 0.004);
    const revenue = pick('Revenue'); const cogs = pick('COGS'); const opex = pick('Expense');
    const totalRevenue = round2(sum(revenue, (x) => x.amount)); const totalCogs = round2(sum(cogs, (x) => x.amount)); const totalOpex = round2(sum(opex, (x) => x.amount));
    const grossProfit = round2(totalRevenue - totalCogs);
    return { revenue, cogs, opex, totalRevenue, totalCogs, grossProfit, totalOpex, netProfit: round2(grossProfit - totalOpex) };
  },
  balanceSheet(asOf = today()) {
    const b = this.balances(null, asOf);
    const accts = DB.all('accounts').filter((a) => !a.header);
    const pick = (type) => accts.filter((a) => a.type === type).map((a) => ({ code: a.code, name: a.name, amount: this.balance(a.code, null, null, b) })).filter((x) => Math.abs(x.amount) > 0.004);
    const assets = pick('Asset'); const liabilities = pick('Liability'); const equity = pick('Equity');
    const earnings = round2(sum(pick('Revenue'), (x) => x.amount) - sum(pick('COGS'), (x) => x.amount) - sum(pick('Expense'), (x) => x.amount));
    equity.push({ code: '', name: 'Current Year Earnings', amount: earnings });
    const totalAssets = round2(sum(assets, (x) => x.amount)); const totalLiabilities = round2(sum(liabilities, (x) => x.amount)); const totalEquity = round2(sum(equity, (x) => x.amount));
    return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balanced: Math.abs(totalAssets - totalLiabilities - totalEquity) < 0.01 };
  },
  /** Direct-method cash flow: classifies every cash movement by its counter account. */
  cashFlow(from, to) {
    const isCash = (a) => a === ACCT.CASH || a === ACCT.BANK;
    const sections = { Operating: {}, Investing: {}, Financing: {} };
    let inflow = 0; let outflow = 0;
    for (const j of DB.all('journals')) {
      if (j.source === 'Opening' || (from && j.date < from) || (to && j.date > to)) continue;
      const delta = sum(j.lines.filter((l) => isCash(l.account)), (l) => l.debit - l.credit);
      if (Math.abs(delta) < 0.005) continue;
      const counter = j.lines.filter((l) => !isCash(l.account)).sort((a, b) => Math.abs(b.debit - b.credit) - Math.abs(a.debit - a.credit))[0];
      const code = counter ? counter.account : '';
      const cat = code.startsWith('15') ? 'Investing' : (code.startsWith('25') || code.startsWith('3')) ? 'Financing' : 'Operating';
      const label = this.cashLabel(code, delta);
      sections[cat][label] = (sections[cat][label] || 0) + delta;
      if (delta > 0) inflow += delta; else outflow -= delta;
    }
    const toList = (o) => Object.entries(o).map(([name, amount]) => ({ name, amount: round2(amount) })).sort((a, b) => b.amount - a.amount);
    const out = { operating: toList(sections.Operating), investing: toList(sections.Investing), financing: toList(sections.Financing), inflow: round2(inflow), outflow: round2(outflow) };
    out.totalOperating = round2(sum(out.operating, (x) => x.amount)); out.totalInvesting = round2(sum(out.investing, (x) => x.amount)); out.totalFinancing = round2(sum(out.financing, (x) => x.amount));
    out.net = round2(out.totalOperating + out.totalInvesting + out.totalFinancing);
    out.opening = from ? this.cashBalance(addDays(from, -1)) : 0;
    out.closing = round2(out.opening + out.net);
    return out;
  },
  cashLabel(code, delta) {
    const map = { 1100: 'Receipts from customers', 2010: 'Payments to suppliers', 2100: 'Sales tax (net)', 4010: 'Refunds to customers', 4020: 'Service receipts', 1500: 'Purchase of equipment', 2500: delta > 0 ? 'Loan proceeds' : 'Loan repayments', 3010: 'Owner contributions', 3100: 'Dividends' };
    if (map[code]) return map[code];
    if (String(code).startsWith('6')) return 'Operating expenses — ' + (DB.get('accounts', code)?.name || code);
    return DB.get('accounts', code)?.name || 'Other';
  },
  trialBalance(from, to) {
    const b = this.balances(from, to);
    return DB.all('accounts').filter((a) => !a.header && b[a.code]).map((a) => {
      const net = b[a.code].debit - b[a.code].credit;
      return { code: a.code, name: a.name, type: a.type, debit: net > 0 ? round2(net) : 0, credit: net < 0 ? round2(-net) : 0 };
    });
  },
  /** Monthly revenue / expense / profit and cash in/out for the last n months. */
  monthly(n = 9) {
    const months = lastMonths(n);
    const idx = Object.fromEntries(months.map((m, i) => [m.key, i]));
    const rows = months.map((m) => ({ ...m, revenue: 0, expenses: 0, cashIn: 0, cashOut: 0 }));
    for (const j of DB.all('journals')) {
      const i = idx[monthKey(j.date)];
      if (i === undefined) continue;
      for (const l of j.lines) {
        const t = this.type(l.account);
        if (t === 'Revenue') rows[i].revenue += l.credit - l.debit;
        else if (t === 'COGS' || t === 'Expense') rows[i].expenses += l.debit - l.credit;
        if (j.source !== 'Opening' && (l.account === ACCT.CASH || l.account === ACCT.BANK)) { rows[i].cashIn += l.debit; rows[i].cashOut += l.credit; }
      }
      // exclude pure internal cash transfers from in/out
    }
    rows.forEach((r) => { r.revenue = round2(r.revenue); r.expenses = round2(r.expenses); r.profit = round2(r.revenue - r.expenses); r.cashIn = round2(r.cashIn); r.cashOut = round2(r.cashOut); r.net = round2(r.cashIn - r.cashOut); });
    return rows;
  },

  /* ----- posting rules for business documents ----- */
  postInvoice(inv, date) {
    if (inv.posted) return;
    const t = Calc.doc(inv);
    let prod = 0; let serv = 0; let cogs = 0;
    inv.items.forEach((it) => {
      const l = Calc.line(it); const p = DB.get('products', it.productId);
      if ((p && p.type === 'service') || (!p && inv.projectId)) serv += l.net; else prod += l.net;
      if (p && p.type === 'stock') cogs += (Number(it.qty) || 0) * p.cost;
    });
    prod += t.shipping;
    const cust = Lookup.customerName(inv.customerId);
    const pr = round2(prod); const sv = round2(serv);
    const diff = round2(t.total - pr - sv - t.tax);
    this.post({ date: date || inv.date, ref: inv.id, description: `Invoice ${inv.id} — ${cust}`, source: 'Sales', lines: [
      { account: ACCT.AR, debit: t.total, description: cust }, { account: ACCT.SALES, credit: round2(pr + diff) }, { account: ACCT.SERVICE, credit: sv }, { account: ACCT.TAX, credit: t.tax },
    ] });
    if (cogs > 0) this.post({ date: date || inv.date, ref: inv.id, description: `Cost of goods sold — ${inv.id}`, source: 'Sales', lines: [{ account: ACCT.COGS, debit: round2(cogs) }, { account: ACCT.INV, credit: round2(cogs) }] });
    inv.posted = true;
  },
  postPayment(p) {
    const party = p.partyType === 'supplier' ? Lookup.supplierName(p.partyId) : Lookup.customerName(p.partyId);
    const desc = `${p.type} ${p.id} — ${party}${p.invoiceId ? ' (' + p.invoiceId + ')' : ''}${p.billId ? ' (' + p.billId + ')' : ''}`;
    let lines;
    if (p.type === 'Supplier Payment') lines = [{ account: ACCT.AP, debit: p.amount }, { account: p.account, credit: p.amount }];
    else if (p.type === 'Refund') lines = [{ account: ACCT.SALES, debit: p.amount, description: 'Customer refund' }, { account: p.account, credit: p.amount }];
    else lines = [{ account: p.account, debit: p.amount }, { account: ACCT.AR, credit: p.amount }];
    this.post({ date: p.date, ref: p.id, description: desc, source: 'Payments', lines });
  },
  postBill(b) {
    const t = Calc.doc(b);
    let stock = 0; let other = 0;
    b.items.forEach((it) => { const p = DB.get('products', it.productId); const l = Calc.line(it); if (p && p.type === 'stock') stock += l.net; else other += l.net; });
    const sup = Lookup.supplierName(b.supplierId);
    const diff = round2(t.total - round2(stock) - round2(other) - t.tax);
    this.post({ date: b.date, ref: b.id, description: `Supplier invoice ${b.id} — ${sup}`, source: 'Purchasing', lines: [
      { account: ACCT.INV, debit: round2(stock + diff) }, { account: '6090', debit: round2(other) }, { account: ACCT.TAX, debit: t.tax, description: 'Input tax' }, { account: ACCT.AP, credit: t.total, description: sup },
    ] });
    b.posted = true;
  },
  postExpense(e) {
    const amt = round2(e.amount); const tax = round2(e.tax || 0);
    this.post({ date: e.paidDate || e.date, ref: e.id, description: `${e.category} expense ${e.id} — ${e.vendor}`, source: 'Expenses', lines: [
      { account: EXPENSE_ACCOUNTS[e.category] || '6090', debit: amt, description: e.description }, { account: ACCT.TAX, debit: tax, description: 'Input tax' }, { account: e.account || ACCT.BANK, credit: round2(amt + tax) },
    ] });
    e.posted = true;
  },
};

/* ---------- Inventory ---------- */
const OPEN_ORDER_STATUSES = ['Confirmed', 'Processing', 'Ready'];
const Inventory = {
  total(p) { return p && p.type === 'stock' ? sum(Object.values(p.stock || {})) : 0; },
  reserved(pid, wh) {
    let n = 0;
    for (const o of DB.all('orders')) {
      if (!OPEN_ORDER_STATUSES.includes(o.status) || (wh && (o.warehouse || 'WH-MAIN') !== wh)) continue;
      for (const i of o.items) if (i.productId === pid) n += Number(i.qty) || 0;
    }
    return n;
  },
  available(p) { return this.total(p) - this.reserved(p.id); },
  value(p) { return this.total(p) * p.cost; },
  level(p) {
    if (p.type !== 'stock') return 'Non-stock';
    const t = this.total(p);
    if (t <= 0) return 'Out of Stock';
    if (t <= p.reorder) return 'Low Stock';
    return 'In Stock';
  },
  stockProducts() { return DB.all('products').filter((p) => p.type === 'stock'); },
  totalValue() { return round2(sum(this.stockProducts(), (p) => this.value(p))); },
  warehouseValue(wh) { return round2(sum(this.stockProducts(), (p) => (p.stock?.[wh] || 0) * p.cost)); },
  lowStock() { return this.stockProducts().filter((p) => p.status === 'Active' && this.total(p) <= p.reorder); },

  /** Records a stock movement and updates the product's per-warehouse quantity. */
  move({ date = today(), ref = '', productId, warehouse = 'WH-MAIN', type, qty, user, note = '' }) {
    const p = DB.get('products', productId);
    if (!p || p.type !== 'stock' || !qty) return null;
    p.stock = p.stock || {};
    const before = p.stock[warehouse] || 0;
    const after = before + qty;
    p.stock[warehouse] = after;
    const m = { id: DB.nextId('movements', 'MV-', 5), date, ref, productId, warehouse, type, qty, before, after, user: user || Auth.userName(), note };
    DB.data.movements.push(m);
    DB.save('movements'); DB.save('products');
    return m;
  },
  transfer({ from, to, productId, qty, reason = '', date = today() }) {
    const p = DB.get('products', productId);
    if (!p) return { error: 'Select a product.' };
    if (from === to) return { error: 'Source and destination warehouses must be different.' };
    if (!(qty > 0)) return { error: 'Quantity must be greater than zero.' };
    if ((p.stock?.[from] || 0) < qty) return { error: `Only ${p.stock?.[from] || 0} units available in ${Lookup.warehouseName(from)}.` };
    const ref = 'TRF-' + String(DB.all('movements').filter((m) => m.type === 'Transfer').length / 2 + 1001).split('.')[0];
    this.move({ date, ref, productId, warehouse: from, type: 'Transfer', qty: -qty, note: reason });
    this.move({ date, ref, productId, warehouse: to, type: 'Transfer', qty, note: reason });
    DB.log(`Transferred ${qty} × ${p.name} from ${Lookup.warehouseName(from)} to ${Lookup.warehouseName(to)}`, ref);
    return { ref };
  },
  adjust({ productId, warehouse, qty, reason = 'Stock count', date = today() }) {
    const p = DB.get('products', productId);
    if (!p) return { error: 'Select a product.' };
    if (!qty) return { error: 'Adjustment quantity cannot be zero.' };
    if ((p.stock?.[warehouse] || 0) + qty < 0) return { error: 'Adjustment would make stock negative.' };
    const ref = 'ADJ-' + (DB.all('movements').filter((m) => m.type === 'Stock Adjustment').length + 1001);
    this.move({ date, ref, productId, warehouse, type: 'Stock Adjustment', qty, note: reason });
    const val = round2(Math.abs(qty) * p.cost);
    Accounting.post({ date, ref, description: `Stock adjustment ${ref} — ${p.name} (${reason})`, source: 'Inventory',
      lines: qty < 0 ? [{ account: ACCT.COGS, debit: val }, { account: ACCT.INV, credit: val }] : [{ account: ACCT.INV, debit: val }, { account: ACCT.COGS, credit: val }] });
    DB.log(`Adjusted stock of ${p.name} by ${qty} (${reason})`, ref);
    return { ref };
  },
  /** Inventory turnover for a period = COGS ÷ current inventory value */
  turnover(from, to) { const v = this.totalValue(); const cogs = Accounting.pnl(from, to).totalCogs; return v ? cogs / v : 0; },
};

/* ---------- Sales: quotations & orders ---------- */
const ORDER_FLOW = { Draft: 'Confirmed', Confirmed: 'Processing', Processing: 'Ready', Ready: 'Shipped', Shipped: 'Delivered' };
const ORDER_FLOW_LABEL = { Draft: 'Confirm order', Confirmed: 'Start processing', Processing: 'Mark ready to ship', Ready: 'Ship order', Shipped: 'Mark delivered' };
const Sales = {
  quoteStatus(q) { return q.status === 'Sent' && q.expiryDate < today() ? 'Expired' : q.status; },
  saveQuotation(data) {
    if (data.id && DB.get('quotations', data.id)) { DB.update('quotations', data.id, data); DB.log(`Updated quotation ${data.id}`, data.id); return DB.get('quotations', data.id); }
    const q = { ...data, id: DB.nextId('quotations', 'QT-', 4), status: data.status || 'Draft', createdAt: new Date().toISOString() };
    DB.insert('quotations', q); DB.log(`Created quotation ${q.id} for ${Lookup.customerName(q.customerId)}`, q.id);
    return q;
  },
  setQuoteStatus(q, status) { q.status = status; DB.save('quotations'); DB.log(`Quotation ${q.id} marked ${status}`, q.id); },
  convertQuotation(q) {
    const c = DB.get('customers', q.customerId);
    const o = this.saveOrder({ customerId: q.customerId, date: today(), salesperson: q.salesperson, warehouse: 'WH-MAIN', paymentTerms: c?.paymentTerms || 'Net 30',
      billingAddress: c?.billingAddress || '', shippingAddress: c?.shippingAddress || c?.billingAddress || '', items: deepClone(q.items), shipping: 0, notes: q.notes || '', status: 'Confirmed', quotationId: q.id });
    q.status = 'Converted'; q.orderId = o.id; DB.save('quotations');
    DB.log(`Converted quotation ${q.id} to order ${o.id}`, q.id);
    return o;
  },
  saveOrder(data) {
    if (data.id && DB.get('orders', data.id)) { DB.update('orders', data.id, data); DB.log(`Updated order ${data.id}`, data.id); return DB.get('orders', data.id); }
    const o = { ...data, id: DB.nextId('orders', 'ORD-', 5), status: data.status || 'Draft', invoiceId: null, createdAt: new Date().toISOString() };
    DB.insert('orders', o); DB.log(`Created sales order ${o.id} for ${Lookup.customerName(o.customerId)}`, o.id);
    return o;
  },
  paymentStatus(o) {
    const inv = o.invoiceId && DB.get('invoices', o.invoiceId);
    if (!inv || inv.status === 'Cancelled') return 'Not Invoiced';
    const st = Docs.status(inv);
    if (st === 'Paid') return 'Paid';
    return (inv.paid || 0) > 0 ? 'Partial' : 'Unpaid';
  },
  fulfillment(o) {
    return ({ Draft: 'Unfulfilled', Confirmed: 'Reserved', Processing: 'Reserved', Ready: 'Packed', Shipped: 'Shipped', Delivered: 'Delivered', Completed: 'Delivered', Cancelled: 'Cancelled' })[o.status] || '—';
  },
  /** Advances an order along its lifecycle, applying stock and accounting side effects. */
  advance(o, date = today()) {
    const next = ORDER_FLOW[o.status];
    if (!next) return { error: 'This order cannot be advanced further.' };
    if (next === 'Confirmed') {
      const c = DB.get('customers', o.customerId);
      const st = c ? Stats.customer(c.id) : null;
      if (c && st.outstanding + Calc.doc(o).total > c.creditLimit) Notify.push('warning', 'Credit limit exceeded', `${c.company} would exceed its credit limit of ${formatCurrency(c.creditLimit)} with order ${o.id}.`, 'customer/' + c.id);
    }
    if (next === 'Shipped') {
      const wh = o.warehouse || 'WH-MAIN';
      const short = o.items.filter((i) => { const p = DB.get('products', i.productId); return p && p.type === 'stock' && (p.stock?.[wh] || 0) < i.qty; });
      if (short.length) return { error: `Insufficient stock in ${Lookup.warehouseName(wh)} for: ${short.map((i) => Lookup.productName(i.productId)).join(', ')}.` };
      o.items.forEach((i) => Inventory.move({ date, ref: o.id, productId: i.productId, warehouse: wh, type: 'Sales Delivery', qty: -i.qty }));
      o.shippedDate = date;
      Inventory.lowStock().forEach((p) => { if (o.items.some((i) => i.productId === p.id)) Notify.push('warning', 'Low stock', `Product ${p.id} (${p.name}) is below its reorder level after shipping ${o.id}.`, 'product/' + p.id); });
    }
    if (next === 'Delivered') o.deliveredDate = date;
    o.status = next;
    if (next === 'Delivered' && this.paymentStatus(o) === 'Paid') o.status = 'Completed';
    DB.save('orders');
    DB.log(`Order ${o.id} moved to ${o.status}`, o.id);
    return { ok: true, status: o.status };
  },
  cancelOrder(o) {
    if (['Shipped', 'Delivered', 'Completed'].includes(o.status)) return { error: 'Shipped orders cannot be cancelled. Create a return instead.' };
    o.status = 'Cancelled'; DB.save('orders'); DB.log(`Cancelled order ${o.id}`, o.id);
    return { ok: true };
  },
  createInvoiceFromOrder(o, send = true) {
    if (o.invoiceId && DB.get('invoices', o.invoiceId)?.status !== 'Cancelled') return { error: `Order already invoiced as ${o.invoiceId}.` };
    const c = DB.get('customers', o.customerId);
    const date = today();
    const inv = Billing.save({ customerId: o.customerId, orderId: o.id, projectId: null, date, paymentTerms: o.paymentTerms || c?.paymentTerms || 'Net 30',
      dueDate: addDays(date, Lookup.termsDays(o.paymentTerms || c?.paymentTerms)), items: deepClone(o.items), shipping: o.shipping || 0,
      notes: `Sales order ${o.id}`, terms: DB.data.settings.invoice.terms, billingAddress: o.billingAddress, shippingAddress: o.shippingAddress }, send);
    o.invoiceId = inv.id; DB.save('orders');
    return { invoice: inv };
  },
};

/* ---------- Billing (customer invoices) ---------- */
const Billing = {
  prefix() { return `INV-${new Date().getFullYear()}-`; },
  save(data, send = false) {
    if (data.id && DB.get('invoices', data.id)) {
      const inv = DB.update('invoices', data.id, data);
      if (send && inv.status === 'Draft') this.send(inv); else DB.log(`Updated invoice ${inv.id}`, inv.id);
      return inv;
    }
    const inv = { kind: 'invoice', paid: 0, ...data, id: DB.nextId('invoices', this.prefix(), 5), status: 'Draft', posted: false, createdAt: new Date().toISOString() };
    DB.insert('invoices', inv);
    DB.log(`Created invoice ${inv.id} for ${Lookup.customerName(inv.customerId)}`, inv.id);
    if (send) this.send(inv);
    return inv;
  },
  send(inv) {
    if (inv.status === 'Draft') { inv.status = 'Sent'; Accounting.postInvoice(inv); }
    inv.sentAt = new Date().toISOString();
    DB.save('invoices'); DB.log(`Invoice ${inv.id} sent to ${Lookup.customerName(inv.customerId)}`, inv.id);
  },
  cancel(inv) {
    if ((inv.paid || 0) > 0) return { error: 'Invoices with payments cannot be cancelled. Void the payments first.' };
    if (inv.posted) Accounting.reverse(inv.id, today(), 'Cancelled invoice');
    inv.status = 'Cancelled'; DB.save('invoices'); DB.log(`Cancelled invoice ${inv.id}`, inv.id);
    return { ok: true };
  },
};

/* ---------- Payments ---------- */
const PAYMENT_TYPES = ['Customer Payment', 'Invoice Payment', 'Supplier Payment', 'Refund', 'Advance Payment'];
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Check', 'Other'];
const Payments = {
  /** Records a payment, updates the linked invoice/bill and posts the journal entry. */
  create(p, opts = {}) {
    const amount = round2(p.amount);
    if (!(amount > 0)) return { error: 'Amount must be greater than zero.' };
    let doc = null;
    if (p.invoiceId) {
      doc = DB.get('invoices', p.invoiceId);
      if (!doc) return { error: 'Invoice not found.' };
      if (doc.status === 'Draft') Billing.send(doc);
      if (amount > Docs.balance(doc) + 0.009) return { error: `Amount exceeds the invoice balance of ${formatCurrency(Docs.balance(doc))}.` };
    }
    if (p.billId) {
      doc = DB.get('bills', p.billId);
      if (!doc) return { error: 'Supplier invoice not found.' };
      if (amount > Docs.balance(doc) + 0.009) return { error: `Amount exceeds the supplier invoice balance of ${formatCurrency(Docs.balance(doc))}.` };
    }
    const rec = { status: 'Cleared', notes: '', reference: '', ...p, amount, id: DB.nextId('payments', 'PAY-', 4), createdBy: opts.user || Auth.userName(), createdAt: new Date().toISOString() };
    rec.partyType = rec.type === 'Supplier Payment' ? 'supplier' : 'customer';
    if (doc) { doc.paid = round2((doc.paid || 0) + amount); DB.save(p.invoiceId ? 'invoices' : 'bills'); }
    DB.insert('payments', rec);
    Accounting.postPayment(rec);
    if (p.invoiceId && Docs.status(doc) === 'Paid' && doc.orderId) {
      const o = DB.get('orders', doc.orderId);
      if (o && o.status === 'Delivered') { o.status = 'Completed'; DB.save('orders'); }
    }
    if (!opts.silent) DB.log(`Recorded ${rec.type.toLowerCase()} ${rec.id} of ${formatCurrency(amount)}${p.invoiceId ? ' for ' + p.invoiceId : ''}${p.billId ? ' for ' + p.billId : ''}`, rec.id);
    return { payment: rec };
  },
  void(p) {
    if (p.status === 'Voided') return { error: 'Payment is already voided.' };
    const doc = p.invoiceId ? DB.get('invoices', p.invoiceId) : p.billId ? DB.get('bills', p.billId) : null;
    if (doc) { doc.paid = round2(Math.max(0, (doc.paid || 0) - p.amount)); DB.save(p.invoiceId ? 'invoices' : 'bills'); }
    Accounting.reverse(p.id, today(), 'Voided payment');
    p.status = 'Voided'; DB.save('payments'); DB.log(`Voided payment ${p.id}`, p.id);
    return { ok: true };
  },
};

/* ---------- Purchasing ---------- */
const Purchasing = {
  savePO(data) {
    if (data.id && DB.get('purchaseOrders', data.id)) { DB.update('purchaseOrders', data.id, data); DB.log(`Updated purchase order ${data.id}`, data.id); return DB.get('purchaseOrders', data.id); }
    const po = { ...data, id: DB.nextId('purchaseOrders', 'PO-', 4), status: data.status || 'Draft', createdAt: new Date().toISOString() };
    po.items.forEach((i) => { i.received = i.received || 0; i.rejected = i.rejected || 0; i.billed = i.billed || 0; });
    DB.insert('purchaseOrders', po); DB.log(`Created purchase order ${po.id} for ${Lookup.supplierName(po.supplierId)}`, po.id);
    return po;
  },
  setStatus(po, status) { po.status = status; DB.save('purchaseOrders'); DB.log(`Purchase order ${po.id} marked ${status}`, po.id); },
  remaining(item) { return Math.max(0, item.qty - (item.received || 0) - (item.rejected || 0)); },
  receivedPct(po) { const q = sum(po.items, (i) => i.qty); return q ? Math.round(sum(po.items, (i) => (i.received || 0) + (i.rejected || 0)) / q * 100) : 0; },
  /** Goods receipt: increases stock in the receiving warehouse and updates PO status. */
  receive(po, { date = today(), warehouse, lines, user, notes = '' }) {
    const used = lines.filter((l) => l.qty > 0 || l.rejected > 0);
    if (!used.length) return { error: 'Enter a received or rejected quantity for at least one line.' };
    for (const l of used) {
      const it = po.items[l.index];
      if (l.qty < 0 || l.rejected < 0) return { error: 'Quantities cannot be negative.' };
      if (l.qty + l.rejected > this.remaining(it)) return { error: `Line ${l.index + 1}: only ${this.remaining(it)} units remain to be received.` };
    }
    const gr = { id: DB.nextId('receipts', 'GR-', 4), poId: po.id, supplierId: po.supplierId, warehouse: warehouse || po.warehouse, date, notes, user: user || Auth.userName(), lines: [] };
    used.forEach((l) => {
      const it = po.items[l.index];
      gr.lines.push({ productId: it.productId, ordered: it.qty, received: l.qty, rejected: l.rejected });
      it.received = (it.received || 0) + l.qty; it.rejected = (it.rejected || 0) + l.rejected;
      if (l.qty > 0) Inventory.move({ date, ref: gr.id, productId: it.productId, warehouse: gr.warehouse, type: 'Purchase Receipt', qty: l.qty, user: gr.user, note: po.id });
    });
    po.status = po.items.every((i) => this.remaining(i) === 0) ? 'Received' : 'Partially Received';
    if (po.status === 'Received') po.receivedDate = date;
    DB.insert('receipts', gr); DB.save('purchaseOrders');
    if (!user) {
      DB.log(`Received goods ${gr.id} against ${po.id}`, po.id);
      Notify.push('success', 'Goods received', `Purchase Order ${po.id} has been ${po.status === 'Received' ? 'fully' : 'partially'} received (${gr.id}).`, 'po/' + po.id);
    }
    return { receipt: gr };
  },
  /** Creates a supplier invoice for received-but-unbilled quantities. */
  createBill(po, { number, date = today(), silent = false } = {}) {
    const items = po.items.filter((i) => (i.received || 0) - (i.billed || 0) > 0).map((i) => ({ productId: i.productId, description: Lookup.productName(i.productId), qty: (i.received || 0) - (i.billed || 0), price: i.price, discount: i.discount || 0, tax: i.tax || 0 }));
    if (!items.length) return { error: 'There are no received, unbilled quantities on this purchase order.' };
    po.items.forEach((i) => { i.billed = i.received || 0; });
    const b = { kind: 'bill', id: DB.nextId('bills', 'BILL-', 4), number: number || `${(DB.get('suppliers', po.supplierId)?.company || 'SUP').slice(0, 3).toUpperCase()}-${Math.floor(10000 + Math.random() * 89999)}`,
      supplierId: po.supplierId, poId: po.id, date, dueDate: addDays(date, Lookup.termsDays(po.paymentTerms)), paymentTerms: po.paymentTerms, items, paid: 0, status: 'Open', posted: false, createdAt: new Date().toISOString() };
    DB.insert('bills', b); DB.save('purchaseOrders');
    Accounting.postBill(b); DB.save('bills');
    if (!silent) DB.log(`Recorded supplier invoice ${b.id} for ${po.id}`, b.id);
    return { bill: b };
  },
  convertRequest(pr, supplierId) {
    const s = DB.get('suppliers', supplierId);
    const po = this.savePO({ supplierId, date: today(), expectedDate: addDays(today(), 14), warehouse: 'WH-MAIN', paymentTerms: s?.paymentTerms || 'Net 30',
      items: pr.items.map((i) => ({ ...deepClone(i), received: 0, rejected: 0, billed: 0 })), notes: `From purchase request ${pr.id}: ${pr.reason}`, requestId: pr.id });
    pr.status = 'Converted'; pr.poId = po.id; DB.save('purchaseRequests');
    return po;
  },
  voidBill(b) {
    if ((b.paid || 0) > 0) return { error: 'Supplier invoices with payments cannot be voided.' };
    Accounting.reverse(b.id, today(), 'Voided supplier invoice');
    const po = DB.get('purchaseOrders', b.poId);
    if (po) { b.items.forEach((bi) => { const it = po.items.find((i) => i.productId === bi.productId); if (it) it.billed = Math.max(0, (it.billed || 0) - bi.qty); }); DB.save('purchaseOrders'); }
    b.status = 'Voided'; DB.save('bills'); DB.log(`Voided supplier invoice ${b.id}`, b.id);
    return { ok: true };
  },
};

/* ---------- Expenses ---------- */
const EXPENSE_CATEGORIES = ['Office', 'Travel', 'Marketing', 'Utilities', 'Salary', 'Software', 'Equipment', 'Rent', 'Other'];
const Expenses = {
  markPaid(e, { date = today(), account, method } = {}) {
    if (e.status === 'Paid') return { error: 'Expense is already paid.' };
    if (e.status === 'Rejected') return { error: 'Rejected expenses cannot be paid.' };
    e.status = 'Paid'; e.paidDate = date; if (account) e.account = account; if (method) e.method = method;
    Accounting.postExpense(e); DB.save('expenses');
    DB.log(`Paid expense ${e.id} (${formatCurrency(e.amount + (e.tax || 0))})`, e.id);
    return { ok: true };
  },
};

/* ---------- Projects ---------- */
const Projects = {
  expenses(p) { return DB.all('expenses').filter((e) => e.projectId === p.id && e.status !== 'Rejected'); },
  invoices(p) { return DB.all('invoices').filter((i) => i.projectId === p.id && !['Draft', 'Cancelled'].includes(i.status)); },
  tasks(p) { return DB.all('tasks').filter((t) => t.projectId === p.id); },
  cost(p) { return round2(sum(this.expenses(p), (e) => e.amount)); },
  revenue(p) { return round2(sum(this.invoices(p), (i) => Calc.doc(i).net)); },
  profit(p) { return round2(this.revenue(p) - this.cost(p)); },
  progress(p) { const t = this.tasks(p); return t.length ? Math.round(sum(t, (x) => x.progress) / t.length) : (p.progress || 0); },
};

/* ---------- Aggregated statistics ---------- */
const Stats = {
  customer(cid) {
    const invs = DB.all('invoices').filter((i) => i.customerId === cid && !['Draft', 'Cancelled'].includes(i.status));
    const orders = DB.all('orders').filter((o) => o.customerId === cid && o.status !== 'Cancelled');
    return {
      sales: round2(sum(invs, (i) => Calc.doc(i).total)), outstanding: round2(sum(invs, (i) => Docs.balance(i))),
      lastOrder: orders.map((o) => o.date).sort().pop() || null, orderCount: orders.length, invoiceCount: invs.length,
    };
  },
  supplier(sid) {
    const bills = DB.all('bills').filter((b) => b.supplierId === sid && b.status !== 'Voided');
    const pos = DB.all('purchaseOrders').filter((p) => p.supplierId === sid && !['Draft', 'Cancelled'].includes(p.status));
    return { purchases: round2(sum(pos, (p) => Calc.doc(p).total)), billed: round2(sum(bills, (b) => Calc.doc(b).total)), outstanding: round2(sum(bills, (b) => Docs.balance(b))), poCount: pos.length };
  },
  arTotal() { return round2(sum(DB.all('invoices'), (i) => Docs.balance(i))); },
  apTotal() { return round2(sum(DB.all('bills'), (b) => Docs.balance(b))); },
};

/* ---------- Notifications ---------- */
const Notify = {
  /** Rebuilds data-driven alerts (overdue, low stock, credit limit, deadlines) and merges them with stored events. */
  sync() {
    const s = DB.data.settings.notify || {};
    const alerts = [];
    if (s.overdue) DB.all('invoices').filter((i) => Docs.status(i) === 'Overdue').forEach((i) => alerts.push({ key: 'overdue-' + i.id, type: 'danger', title: 'Invoice overdue', text: `Invoice ${i.id} for ${Lookup.customerName(i.customerId)} is ${Docs.daysOverdue(i)} days overdue (${formatCurrency(Docs.balance(i))} due).`, link: 'invoice/' + i.id }));
    if (s.lowStock) Inventory.lowStock().forEach((p) => alerts.push({ key: 'low-' + p.id, type: 'warning', title: Inventory.total(p) <= 0 ? 'Out of stock' : 'Low stock', text: `Product ${p.id} (${p.name}) is below reorder level — ${Inventory.total(p)} on hand, reorder at ${p.reorder}.`, link: 'product/' + p.id }));
    if (s.credit) DB.all('customers').forEach((c) => { const st = Stats.customer(c.id); if (st.outstanding > c.creditLimit) alerts.push({ key: 'credit-' + c.id, type: 'warning', title: 'Credit limit exceeded', text: `Customer ${c.company} has exceeded the credit limit (${formatCurrency(st.outstanding)} of ${formatCurrency(c.creditLimit)}).`, link: 'customer/' + c.id }); });
    if (s.deadlines) DB.all('projects').filter((p) => p.status === 'Active').forEach((p) => { const d = daysBetween(today(), p.endDate); if (d <= 21) alerts.push({ key: 'deadline-' + p.id, type: d < 0 ? 'danger' : 'info', title: d < 0 ? 'Project past deadline' : 'Project deadline approaching', text: `Project ${p.id} (${p.name}) ${d < 0 ? 'passed its deadline ' + (-d) + ' days ago' : 'is due in ' + d + ' days'}.`, link: 'project/' + p.id }); });
    const keys = new Set(alerts.map((a) => a.key));
    const list = DB.data.notifications.filter((n) => !n.dynamic || keys.has(n.key));
    alerts.forEach((a) => {
      const ex = list.find((n) => n.key === a.key);
      if (ex) Object.assign(ex, { text: a.text, title: a.title, type: a.type });
      else list.unshift({ id: uid(), dynamic: true, date: new Date().toISOString(), read: false, ...a });
    });
    DB.data.notifications = list;
    DB.save('notifications');
  },
  push(type, title, text, link = '') {
    DB.data.notifications.unshift({ id: uid(), key: uid(), dynamic: false, date: new Date().toISOString(), read: false, type, title, text, link });
    DB.save('notifications');
    if (typeof App !== 'undefined' && App.updateBadge) App.updateBadge();
  },
  unread() { return DB.all('notifications').filter((n) => !n.read).length; },
};
