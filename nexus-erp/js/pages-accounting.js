/* ==========================================================================
   NEXUS ERP — pages-accounting.js
   Chart of accounts, journal entries (balanced editor), general ledger and
   financial statements (P&L, balance sheet, cash flow, trial balance).
   ========================================================================== */
'use strict';

const TYPE_PREFIX = { Asset: '1', Liability: '2', Equity: '3', Revenue: '4', COGS: '5', Expense: '6' };

/* ---------- Chart of accounts ---------- */
Pages.accounts = (el, { query }) => {
  const b = Accounting.balances(null, today());
  const used = new Set(DB.all('journals').flatMap((j) => j.lines.map((l) => l.account)));
  const editAcct = (a) => formModal({ title: a ? `Edit account ${a.code}` : 'New account', fields: [
    { name: 'type', label: 'Account type', type: 'select', required: true, options: ACCOUNT_TYPES, disabled: !!a },
    { name: 'code', label: 'Account code', required: true, disabled: !!a, unique: { collection: 'accounts', field: 'code', exceptId: a?.id }, validate: (v, x) => (!/^\d{4}$/.test(v) ? 'Use a 4-digit code.' : TYPE_PREFIX[x.type] && v[0] !== TYPE_PREFIX[x.type] ? `${x.type} accounts start with ${TYPE_PREFIX[x.type]}.` : '') },
    { name: 'name', label: 'Account name', required: true, full: true }, { name: 'description', label: 'Description', type: 'textarea', rows: 2, full: true }],
    values: a || { type: 'Expense' }, submitText: a ? 'Save changes' : 'Create account',
    onSubmit: (v) => { if (a) { DB.update('accounts', a.id, { name: v.name, description: v.description }); showToast('Account updated'); } else { DB.insert('accounts', { ...v, id: v.code, header: false, parent: v.code[0] + '000', system: false }); DB.data.accounts.sort((x, y) => x.code.localeCompare(y.code)); DB.save('accounts'); showToast(`Account ${v.code} created`); } DB.log(`${a ? 'Updated' : 'Created'} account ${v.code || a.code}`); App.refresh(); } });
  const totals = ACCOUNT_TYPES.map((t) => ({ label: t === 'COGS' ? 'Cost of sales' : t, value: formatCurrency(sum(DB.all('accounts').filter((a) => a.type === t && !a.header), (a) => Accounting.balance(a.code, null, null, b)), true), nav: 'accounts?type=' + t }));
  el.innerHTML = pageHeader({ title: 'Chart of Accounts', subtitle: `${DB.all('accounts').filter((a) => !a.header).length} posting accounts in ${ACCOUNT_TYPES.length} groups`, actions: btn('New account', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' }) }) + statTiles(totals) + '<div class="card"><div class="card-body" id="al"></div></div>';
  listView($('#al', el), {
    key: 'accounts', entity: 'accounts', searchPlaceholder: 'Search by code or name…', rows: () => DB.all('accounts'), selectable: false, pageSize: 50,
    filters: [{ key: 'type', label: 'Type', options: ACCOUNT_TYPES }], preset: query.type ? { type: query.type } : null,
    rowClass: (a) => (a.header ? 'row-group' : ''),
    columns: [
      { key: 'code', label: 'Code', render: (a) => `<span class="mono ${a.header ? 'strong' : ''}">${esc(a.code)}</span>` },
      { key: 'name', label: 'Account name', render: (a) => (a.header ? `<strong>${esc(a.name)}</strong>` : `<span class="indent">${Auth.canView('ledger') ? link('ledger?account=' + a.code, a.name) : esc(a.name)}</span>`) },
      { key: 'type', label: 'Type', render: (a) => badge(a.type, 'neutral') },
      { key: 'normal', label: 'Normal balance', value: (a) => (Accounting.normalDebit(a.code) ? 'Debit' : 'Credit') },
      { key: 'balance', label: 'Balance', align: 'right', value: (a) => (a.header ? sum(DB.all('accounts').filter((x) => !x.header && x.parent === a.code), (x) => Accounting.balance(x.code, null, null, b)) : Accounting.balance(a.code, null, null, b)), render: (a) => { const v = a.header ? sum(DB.all('accounts').filter((x) => !x.header && x.parent === a.code), (x) => Accounting.balance(x.code, null, null, b)) : Accounting.balance(a.code, null, null, b); return a.header ? `<strong>${formatCurrency(v)}</strong>` : money(v); } },
      { key: 'system', label: 'Source', value: (a) => (a.system ? 'System' : 'Custom'), render: (a) => (a.system ? '<span class="muted small">System</span>' : badge('Custom', 'info')) },
    ],
    onView: (a) => { if (!a.header) navigateTo('ledger?account=' + a.code); },
    actions: (a) => (a.header ? [] : [{ label: 'View ledger', icon: 'layers', onClick: () => navigateTo('ledger?account=' + a.code) }, { label: 'Edit', icon: 'edit', perm: 'edit', onClick: () => editAcct(a) }, { divider: true }, { label: 'Delete', icon: 'trash', danger: true, perm: 'delete', onClick: () => confirmDelete('Account', () => (a.system ? { error: 'System accounts cannot be deleted.' } : used.has(a.code) ? { error: 'This account has posted transactions.' } : (DB.remove('accounts', a.id), undefined))) }]),
    exportName: 'chart-of-accounts',
  });
  $('[data-act="add"]', el)?.addEventListener('click', () => editAcct(null));
};

/* ---------- Journal entries ---------- */
const JOURNAL_SOURCES = ['Manual', 'Sales', 'Purchasing', 'Payments', 'Expenses', 'Inventory', 'Reversal', 'Opening'];
const JournalUI = {
  create(copy) {
    if (!Auth.can('create')) { showToast('Your role does not allow creating journal entries.', 'error'); return; }
    const lines = copy ? copy.lines.map((l) => ({ ...l })) : [{ account: '', description: '', debit: '', credit: '' }, { account: '', description: '', debit: '', credit: '' }];
    const acctOpts = DB.all('accounts').filter((a) => !a.header);
    const head = [{ name: 'date', label: 'Date', type: 'date', required: true }, { name: 'ref', label: 'Reference', placeholder: 'e.g. ACCR-09' }, { name: 'description', label: 'Description', required: true, full: true }];
    const m = Modal.open({ title: copy ? 'Duplicate journal entry' : 'New journal entry', size: 'xl', body: `<form novalidate><div class="form-grid">${head.map((f) => renderField(f, { date: today(), ref: '', description: copy?.description || '' }[f.name])).join('')}</div>
      <div class="line-items-wrap"><table class="line-items je-lines"><thead><tr><th>Account</th><th>Line description</th><th class="num">Debit</th><th class="num">Credit</th><th><span class="sr-only">Remove</span></th></tr></thead><tbody></tbody><tfoot><tr><th colspan="2" class="num">Totals</th><th class="num je-dr"></th><th class="num je-cr"></th><th></th></tr></tfoot></table></div>
      <div class="li-foot"><button type="button" class="btn btn-sm" data-add>${icon('plus', 14)} Add line</button><div class="je-status" aria-live="polite"></div></div></form>`,
      footer: '<button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn btn-primary" data-post>Post journal entry</button>' });
    const f = $('form', m.dialog); const tb = $('tbody', f);
    const draw = () => { tb.innerHTML = lines.map((l, i) => `<tr data-i="${i}"><td data-label="Account"><select class="je-acct" aria-label="Account for line ${i + 1}"><option value="">Select account…</option>${acctOpts.map((a) => `<option value="${a.code}"${a.code === l.account ? ' selected' : ''}>${a.code} · ${esc(a.name)}</option>`).join('')}</select></td><td data-label="Description"><input class="je-desc" value="${esc(l.description)}" aria-label="Description for line ${i + 1}"></td><td class="num" data-label="Debit"><input type="number" min="0" step="0.01" class="je-d" value="${l.debit || ''}" aria-label="Debit for line ${i + 1}"></td><td class="num" data-label="Credit"><input type="number" min="0" step="0.01" class="je-c" value="${l.credit || ''}" aria-label="Credit for line ${i + 1}"></td><td><button type="button" class="icon-btn li-remove" aria-label="Remove line ${i + 1}">${icon('trash', 16)}</button></td></tr>`).join(''); tot(); };
    const tot = () => { const d = round2(sum(lines, (l) => l.debit)); const c = round2(sum(lines, (l) => l.credit)); $('.je-dr', f).textContent = formatCurrency(d); $('.je-cr', f).textContent = formatCurrency(c); const ok = d > 0 && Math.abs(d - c) < 0.005; $('.je-status', f).innerHTML = ok ? badge('Balanced') : d || c ? `${badge('Unbalanced')} <span class="small">Difference ${formatCurrency(Math.abs(d - c))}</span>` : '<span class="muted small">Enter debit and credit amounts. Debits must equal credits.</span>'; };
    tb.addEventListener('input', (e) => { const tr = e.target.closest('tr'); const l = lines[+tr.dataset.i]; if (e.target.classList.contains('je-d')) { l.debit = Number(e.target.value) || 0; if (l.debit) { l.credit = 0; $('.je-c', tr).value = ''; } } if (e.target.classList.contains('je-c')) { l.credit = Number(e.target.value) || 0; if (l.credit) { l.debit = 0; $('.je-d', tr).value = ''; } } if (e.target.classList.contains('je-desc')) l.description = e.target.value; tot(); });
    tb.addEventListener('change', (e) => { if (e.target.classList.contains('je-acct')) lines[+e.target.closest('tr').dataset.i].account = e.target.value; });
    tb.addEventListener('click', (e) => { const b = e.target.closest('.li-remove'); if (!b) return; if (lines.length <= 2) { showToast('A journal entry needs at least two lines.', 'warning'); return; } lines.splice(+b.closest('tr').dataset.i, 1); draw(); });
    $('[data-add]', f).addEventListener('click', () => { lines.push({ account: '', description: '', debit: '', credit: '' }); draw(); });
    m.dialog.querySelector('[data-post]').addEventListener('click', () => {
      const v = readFields(f, head);
      if (!showErrors(f, validateFields(head, v))) return;
      const used = lines.filter((l) => l.debit || l.credit);
      if (used.length < 2) { showToast('Enter at least two lines with amounts.', 'error'); return; }
      if (used.some((l) => !l.account)) { showToast('Every line with an amount needs an account.', 'error'); return; }
      if (used.some((l) => l.debit < 0 || l.credit < 0)) { showToast('Amounts cannot be negative.', 'error'); return; }
      try {
        const je = Accounting.post({ date: v.date, ref: v.ref || 'MAN-' + Date.now().toString().slice(-6), description: v.description, source: 'Manual', lines: used });
        DB.log(`Posted journal entry ${je.id}`, je.id); m.close(); showToast(`Journal entry ${je.id} posted`); App.refresh();
      } catch (err) { showToast(err.message, 'error'); }
    });
    draw();
  },
  view(j) {
    const m = Modal.open({ title: `Journal entry ${j.id}`, size: 'lg', body: `${detailList([['Date', formatDate(j.date)], ['Reference', esc(j.ref)], ['Source', badge(j.source, 'neutral')], ['Status', badge(j.reversed ? 'Reversed' : j.status, j.reversed ? 'warning' : undefined)], ['Created by', esc(j.createdBy)], ['Created', formatDateTime(j.createdAt)]], 3)}<p><strong>${esc(j.description)}</strong></p>
      ${renderTable([{ label: 'Account', render: (l) => (Auth.canView('ledger') ? link('ledger?account=' + l.account, Lookup.accountName(l.account)) : esc(Lookup.accountName(l.account))) }, { label: 'Description', render: (l) => esc(l.description) }, { label: 'Debit', align: 'right', render: (l) => (l.debit ? formatCurrency(l.debit) : '') }, { label: 'Credit', align: 'right', render: (l) => (l.credit ? formatCurrency(l.credit) : '') }], j.lines, { footer: `<tr><th colspan="2">Total</th><th class="num">${formatCurrency(sum(j.lines, (l) => l.debit))}</th><th class="num">${formatCurrency(sum(j.lines, (l) => l.credit))}</th></tr>` })}`,
    footer: `<button type="button" class="btn" data-close>Close</button>${Auth.can('create') ? '<button type="button" class="btn" data-dup>Duplicate</button>' : ''}${j.source === 'Manual' && !j.reversed && Auth.can('approve') ? '<button type="button" class="btn btn-danger" data-rev>Reverse entry</button>' : ''}` });
    m.body.addEventListener('click', (e) => { if (e.target.closest('a')) m.close(); });
    m.dialog.querySelector('[data-dup]')?.addEventListener('click', () => { m.close(); this.create(j); });
    m.dialog.querySelector('[data-rev]')?.addEventListener('click', async () => {
      if (!(await confirmDialog({ title: `Reverse ${j.id}?`, message: 'A reversing entry dated today will be posted.', confirmText: 'Reverse' }))) return;
      const rev = Accounting.post({ date: today(), ref: j.ref, description: `Reversal: ${j.description}`, source: 'Reversal', lines: j.lines.map((l) => ({ account: l.account, description: l.description, debit: l.credit, credit: l.debit })) });
      j.reversed = true; DB.save('journals'); DB.log(`Reversed journal ${j.id} with ${rev.id}`, j.id); m.close(); showToast(`Reversed with ${rev.id}`); App.refresh();
    });
  },
};
Pages.journals = (el, { query }) => {
  const js = DB.all('journals');
  el.innerHTML = pageHeader({ title: 'Journal Entries', subtitle: `${js.length} posted entries · every entry balances (debits = credits)`, actions: btn('New journal entry', { icon: 'plus', cls: 'btn-primary', attrs: 'data-act="add"', perm: 'create' }) }) +
    statTiles(JOURNAL_SOURCES.slice(0, 6).map((s) => ({ label: s, value: js.filter((j) => j.source === s).length, nav: 'journals?source=' + s }))) + '<div class="card"><div class="card-body" id="jl"></div></div>';
  listView($('#jl', el), {
    key: 'journals', entity: 'journal entries', searchPlaceholder: 'Search by entry #, reference, description…', rows: () => DB.all('journals'), selectable: false,
    searchFields: [(j) => j.id, (j) => j.ref, (j) => j.description, (j) => j.lines.map((l) => l.account).join(' ')],
    filters: [{ key: 'source', label: 'Source', options: JOURNAL_SOURCES }, { key: 'account', label: 'Account', options: Lookup.options.accounts, test: (j, v) => j.lines.some((l) => l.account === v) }],
    preset: query.source || query.q ? { ...(query.source ? { source: query.source } : {}) } : null, dateField: (j) => j.date, defaultSort: { key: 'id', dir: 'desc' },
    columns: [
      { key: 'id', label: 'Entry #', render: (j) => `<strong class="mono">${esc(j.id)}</strong>` }, { key: 'date', label: 'Date', value: (j) => j.date, render: (j) => formatDate(j.date) },
      { key: 'ref', label: 'Reference', render: (j) => `<span class="mono">${esc(j.ref)}</span>` }, { key: 'description', label: 'Description' },
      { key: 'accounts', label: 'Accounts', value: (j) => j.lines.map((l) => l.account).join(', '), render: (j) => `<span class="muted small">${j.lines.map((l) => l.account).join(' · ')}</span>` },
      { key: 'source', label: 'Source', render: (j) => badge(j.source, 'neutral') },
      { key: 'amount', label: 'Amount', align: 'right', value: (j) => sum(j.lines, (l) => l.debit), render: (j) => money(sum(j.lines, (l) => l.debit)) },
      { key: 'status', label: 'Status', value: (j) => (j.reversed ? 'Reversed' : 'Posted'), render: (j) => badge(j.reversed ? 'Reversed' : 'Posted', j.reversed ? 'warning' : undefined) },
    ],
    onView: (j) => JournalUI.view(j), actions: (j) => [{ label: 'View', icon: 'eye', onClick: () => JournalUI.view(j) }, { label: 'Duplicate', icon: 'copy', perm: 'create', onClick: () => JournalUI.create(j) }],
    exportName: 'journal-entries',
    exportColumns: [{ label: 'Entry', value: (j) => j.id }, { label: 'Date', value: (j) => j.date }, { label: 'Reference', value: (j) => j.ref }, { label: 'Description', value: (j) => j.description }, { label: 'Source', value: (j) => j.source }, { label: 'Lines', value: (j) => j.lines.map((l) => `${l.account} Dr ${l.debit} Cr ${l.credit}`).join(' | ') }, { label: 'Amount', value: (j) => sum(j.lines, (l) => l.debit) }],
  });
  if (query.q) { const s = $('.lv-search', el); s.value = query.q; s.dispatchEvent(new Event('input')); }
  $('[data-act="add"]', el)?.addEventListener('click', () => JournalUI.create());
  if (query.je) { const j = DB.get('journals', query.je); if (j) setTimeout(() => JournalUI.view(j), 0); }
};

/* ---------- General ledger ---------- */
Pages.ledger = (el, { query }) => {
  const acct = query.account && DB.get('accounts', query.account) && !DB.get('accounts', query.account).header ? query.account : '1020';
  const from = query.from || periodStart(); const to = query.to || today();
  const normal = Accounting.normalDebit(acct) ? 1 : -1;
  const opening = Accounting.balance(acct, null, addDays(from, -1));
  let bal = opening;
  const rows = [];
  DB.all('journals').filter((j) => j.date >= from && j.date <= to).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id.localeCompare(b.id))).forEach((j) => j.lines.forEach((l, k) => {
    if (l.account !== acct) return;
    bal = round2(bal + normal * (l.debit - l.credit));
    rows.push({ id: j.id + '-' + k, je: j, date: j.date, ref: j.ref, description: l.description || j.description, debit: l.debit, credit: l.credit, balance: bal });
  }));
  const a = DB.get('accounts', acct);
  App.setCrumb(`Ledger — ${a.code} ${a.name}`);
  el.innerHTML = pageHeader({ title: 'General Ledger', subtitle: `${esc(a.code)} · ${esc(a.name)} (${a.type}, normal ${normal > 0 ? 'debit' : 'credit'} balance)`, actions: btn('Print', { icon: 'printer', attrs: 'data-action="print"' }) }) +
    `<div class="card no-print"><div class="card-body filter-bar"><label>Account <select id="lg-acct">${DB.all('accounts').filter((x) => !x.header).map((x) => `<option value="${x.code}"${x.code === acct ? ' selected' : ''}>${x.code} · ${esc(x.name)}</option>`).join('')}</select></label><label>From <input type="date" id="lg-from" value="${from}"></label><label>To <input type="date" id="lg-to" value="${to}"></label></div></div>` +
    statTiles([{ label: 'Opening balance', value: formatCurrency(opening) }, { label: 'Total debits', value: formatCurrency(sum(rows, (r) => r.debit)) }, { label: 'Total credits', value: formatCurrency(sum(rows, (r) => r.credit)) }, { label: 'Closing balance', value: formatCurrency(bal) }, { label: 'Transactions', value: rows.length }]) +
    '<div class="card"><div class="card-body" id="gl"></div></div>';
  listView($('#gl', el), {
    key: 'ledger-' + acct, entity: 'ledger lines', searchPlaceholder: 'Search description, reference, entry…', rows: () => rows, selectable: false, pageSize: 25,
    searchFields: [(r) => r.je.id, (r) => r.ref, (r) => r.description],
    columns: [
      { key: 'date', label: 'Date', value: (r) => r.date, render: (r) => formatDate(r.date) }, { key: 'je', label: 'Entry', value: (r) => r.je.id, render: (r) => `<a class="link mono" href="#/journals?je=${r.je.id}">${r.je.id}</a>` },
      { key: 'ref', label: 'Reference', render: (r) => `<span class="mono">${esc(r.ref)}</span>` }, { key: 'description', label: 'Description' },
      { key: 'debit', label: 'Debit', align: 'right', render: (r) => (r.debit ? formatCurrency(r.debit) : '') }, { key: 'credit', label: 'Credit', align: 'right', render: (r) => (r.credit ? formatCurrency(r.credit) : '') },
      { key: 'balance', label: 'Balance', align: 'right', sortable: false, render: (r) => `<strong>${formatCurrency(r.balance)}</strong>` },
    ],
    onView: (r) => JournalUI.view(r.je), exportName: `general-ledger-${acct}`,
  });
  const go = () => navigateTo(`ledger?account=${$('#lg-acct', el).value}&from=${$('#lg-from', el).value || from}&to=${$('#lg-to', el).value || to}`, { replace: true });
  ['#lg-acct', '#lg-from', '#lg-to'].forEach((s) => $(s, el).addEventListener('change', go));
};

/* ---------- Financial reports ---------- */
function stmtRows(rows) { return rows.map((r) => `<tr class="${r.cls || ''}"><td>${r.code ? `<span class="mono muted">${esc(r.code)}</span> ` : ''}${r.nav && Auth.canView('ledger') ? link(r.nav, r.label) : esc(r.label)}</td><td class="num">${r.amount === undefined ? '' : formatCurrency(r.amount)}</td>${r.pct !== undefined ? `<td class="num muted">${r.pct}</td>` : '<td></td>'}</tr>`).join(''); }
const FinStatements = {
  pnl(from, to) {
    const p = Accounting.pnl(from, to); const pct = (v) => (p.totalRevenue ? ((v / p.totalRevenue) * 100).toFixed(1) + '%' : '—');
    const acc = (list) => list.map((x) => ({ code: x.code, label: x.name, amount: x.amount, pct: pct(x.amount), nav: `ledger?account=${x.code}&from=${from}&to=${to}` }));
    return { data: p, rows: [{ label: 'Revenue', cls: 'sec' }, ...acc(p.revenue), { label: 'Total revenue', amount: p.totalRevenue, cls: 'sub', pct: '100%' }, { label: 'Cost of goods sold', cls: 'sec' }, ...acc(p.cogs), { label: 'Total cost of goods sold', amount: p.totalCogs, cls: 'sub', pct: pct(p.totalCogs) }, { label: 'Gross profit', amount: p.grossProfit, cls: 'total', pct: pct(p.grossProfit) }, { label: 'Operating expenses', cls: 'sec' }, ...acc(p.opex), { label: 'Total operating expenses', amount: p.totalOpex, cls: 'sub', pct: pct(p.totalOpex) }, { label: 'Net profit', amount: p.netProfit, cls: 'grand', pct: pct(p.netProfit) }] };
  },
  bs(asOf) {
    const s = Accounting.balanceSheet(asOf);
    const acc = (list) => list.map((x) => ({ code: x.code, label: x.name, amount: x.amount, nav: x.code ? `ledger?account=${x.code}&to=${asOf}` : null }));
    return { data: s, rows: [{ label: 'Assets', cls: 'sec' }, ...acc(s.assets), { label: 'Total assets', amount: s.totalAssets, cls: 'grand' }, { label: 'Liabilities', cls: 'sec' }, ...acc(s.liabilities), { label: 'Total liabilities', amount: s.totalLiabilities, cls: 'sub' }, { label: 'Equity', cls: 'sec' }, ...acc(s.equity), { label: 'Total equity', amount: s.totalEquity, cls: 'sub' }, { label: 'Total liabilities & equity', amount: round2(s.totalLiabilities + s.totalEquity), cls: 'grand' }] };
  },
  cf(from, to) {
    const c = Accounting.cashFlow(from, to);
    const sec = (t, list, total) => [{ label: t, cls: 'sec' }, ...list.map((x) => ({ label: x.name, amount: x.amount })), { label: `Net cash from ${t.toLowerCase()}`, amount: total, cls: 'sub' }];
    return { data: c, rows: [...sec('Operating activities', c.operating, c.totalOperating), ...sec('Investing activities', c.investing, c.totalInvesting), ...sec('Financing activities', c.financing, c.totalFinancing), { label: 'Net change in cash', amount: c.net, cls: 'total' }, { label: 'Cash at beginning of period', amount: c.opening }, { label: 'Cash at end of period', amount: c.closing, cls: 'grand' }] };
  },
};
Pages.finreports = (el, { query }) => {
  const tab = ['pnl', 'bs', 'cf', 'tb'].includes(query.tab) ? query.tab : 'pnl';
  const from = query.from || today().slice(0, 4) + '-01-01'; const to = query.to || today();
  const co = DB.data.settings.company.name;
  const titles = { pnl: 'Profit & Loss Statement', bs: 'Balance Sheet', cf: 'Cash Flow Statement', tb: 'Trial Balance' };
  el.innerHTML = pageHeader({ title: 'Financial Reports', subtitle: 'Generated live from posted journal entries', actions: `${btn('Print', { icon: 'printer', attrs: 'data-action="print"' })}${btn('Export CSV', { icon: 'download', attrs: 'data-act="csv"', perm: 'export' })}` }) +
    tabsHtml([{ key: 'pnl', label: 'Profit & Loss' }, { key: 'bs', label: 'Balance Sheet' }, { key: 'cf', label: 'Cash Flow' }, { key: 'tb', label: 'Trial Balance' }], tab, `finreports?from=${from}&to=${to}`) +
    `<div class="card no-print"><div class="card-body filter-bar">${tab === 'bs' ? '' : `<label>From <input type="date" id="fr-from" value="${from}"></label>`}<label>${tab === 'bs' ? 'As of' : 'To'} <input type="date" id="fr-to" value="${to}"></label><div class="chip-row">${[['This month', startOfMonth(), today()], ['Last 90 days', addDays(today(), -89), today()], ['Year to date', today().slice(0, 4) + '-01-01', today()], ['Last 9 months', periodStart(), today()]].map(([l, f, t]) => `<a class="chip ${f === from && t === to ? 'active' : ''}" href="#/finreports?tab=${tab}&from=${f}&to=${t}">${l}</a>`).join('')}</div></div></div><div id="rep"></div>`;
  const R = $('#rep', el);
  let csvRows = [];
  const head = (sub) => `<div class="report-head"><div><h2>${titles[tab]}</h2><p class="muted">${esc(co)} · ${sub}</p></div><span class="muted small">Generated ${formatDateTime(new Date())}</span></div>`;
  if (tab === 'tb') {
    const tb = Accounting.trialBalance(from, to); const d = round2(sum(tb, (x) => x.debit)); const c = round2(sum(tb, (x) => x.credit));
    csvRows = tb.map((x) => ({ Code: x.code, Account: x.name, Type: x.type, Debit: x.debit, Credit: x.credit }));
    R.innerHTML = card('', head(`${formatDate(from)} – ${formatDate(to)}`) + renderTable([{ label: 'Code', render: (x) => `<span class="mono">${x.code}</span>` }, { label: 'Account', render: (x) => link(`ledger?account=${x.code}&from=${from}&to=${to}`, x.name) }, { label: 'Type', render: (x) => esc(x.type) }, { label: 'Debit', align: 'right', render: (x) => (x.debit ? formatCurrency(x.debit) : '') }, { label: 'Credit', align: 'right', render: (x) => (x.credit ? formatCurrency(x.credit) : '') }], tb, { footer: `<tr><th colspan="3">Totals ${badge(Math.abs(d - c) < 0.01 ? 'Balanced' : 'Unbalanced')}</th><th class="num">${formatCurrency(d)}</th><th class="num">${formatCurrency(c)}</th></tr>` }), { cls: 'report' });
  } else {
    const st = tab === 'pnl' ? FinStatements.pnl(from, to) : tab === 'bs' ? FinStatements.bs(to) : FinStatements.cf(from, to);
    csvRows = st.rows.map((r) => ({ Line: r.label, Code: r.code || '', Amount: r.amount ?? '' }));
    const check = tab === 'bs' ? `<div class="notice ${st.data.balanced ? 'ok' : 'danger'}">${icon(st.data.balanced ? 'check' : 'alert', 16)} Assets (${formatCurrency(st.data.totalAssets)}) ${st.data.balanced ? '=' : '≠'} Liabilities + Equity (${formatCurrency(st.data.totalLiabilities + st.data.totalEquity)})</div>` : '';
    const tiles = tab === 'pnl' ? statTiles([{ label: 'Revenue', value: formatCurrency(st.data.totalRevenue, true) }, { label: 'Gross profit', value: formatCurrency(st.data.grossProfit, true), sub: st.data.totalRevenue ? ((st.data.grossProfit / st.data.totalRevenue) * 100).toFixed(1) + '% margin' : '' }, { label: 'Operating expenses', value: formatCurrency(st.data.totalOpex, true) }, { label: 'Net profit', value: formatCurrency(st.data.netProfit, true), sub: st.data.totalRevenue ? ((st.data.netProfit / st.data.totalRevenue) * 100).toFixed(1) + '% margin' : '', tone: st.data.netProfit < 0 ? 'danger' : 'ok' }])
      : tab === 'cf' ? statTiles([{ label: 'Operating', value: formatCurrency(st.data.totalOperating, true) }, { label: 'Investing', value: formatCurrency(st.data.totalInvesting, true) }, { label: 'Financing', value: formatCurrency(st.data.totalFinancing, true) }, { label: 'Net change', value: formatCurrency(st.data.net, true) }]) : '';
    R.innerHTML = tiles + card('', head(tab === 'bs' ? `As of ${formatDate(to)}` : `${formatDate(from)} – ${formatDate(to)}`) + check + `<div class="table-wrap"><table class="statement"><thead><tr><th>Line</th><th class="num">Amount</th><th class="num">${tab === 'pnl' ? '% of revenue' : ''}</th></tr></thead><tbody>${stmtRows(st.rows)}</tbody></table></div>`, { cls: 'report' });
  }
  const go = () => navigateTo(`finreports?tab=${tab}&from=${$('#fr-from', el)?.value || from}&to=${$('#fr-to', el).value || to}`, { replace: true });
  $('#fr-from', el)?.addEventListener('change', go); $('#fr-to', el).addEventListener('change', go);
  $('[data-act="csv"]', el)?.addEventListener('click', () => exportCSV(titles[tab].toLowerCase().replace(/[^a-z]+/g, '-'), Object.keys(csvRows[0] || { Line: 1 }).map((k) => ({ label: k, value: (r) => r[k] })), csvRows));
};
