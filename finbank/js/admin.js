/* FinBank Admin Portal — demo only. No real security; all data is fictional. */
(function () {
  const FB = window.FB, DB = window.DB, $ = FB.$, $$ = FB.$$, esc = FB.esc;
  const ROOT = $('#admin-root');
  const ADMIN = { user: 'admin', pass: 'Admin@1234', name: 'Admin Tran Van Long', role: 'Risk & Ops', initials: 'TL' };
  const KEY = 'fb_admin_v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));

  /* ---------- Session (sessionStorage key fb_admin) ---------- */
  let memSession = false;
  const isAuthed = () => { try { return sessionStorage.getItem('fb_admin') === '1'; } catch (e) { return memSession; } };
  const setAuthed = (on) => { memSession = on; try { if (on) sessionStorage.setItem('fb_admin', '1'); else sessionStorage.removeItem('fb_admin'); } catch (e) { /* ignore */ } };

  /* ---------- Persistent overlay state ---------- */
  const S = Object.assign({ cust: {}, tx: {}, alerts: {}, log: [] }, FB.ls.get(KEY, {}));
  if (!S.savings) S.savings = DB.savingsProducts.map((p) => Object.assign(clone(p), { active: true }));
  if (!S.loans) S.loans = DB.loanProducts.map((p) => Object.assign(clone(p), { active: true }));
  if (!S.cards) S.cards = [
    { id: 'c1', name: 'Standard', annualFee: 200000, limitMin: 10000000, limitMax: 50000000, cashback: 0.5, active: true },
    { id: 'c2', name: 'Gold', annualFee: 500000, limitMin: 30000000, limitMax: 150000000, cashback: 1, active: true },
    { id: 'c3', name: 'Platinum', annualFee: 990000, limitMin: 100000000, limitMax: 500000000, cashback: 2, active: true },
    { id: 'c4', name: 'Business', annualFee: 1500000, limitMin: 200000000, limitMax: 2000000000, cashback: 1.5, active: true }
  ];
  if (!S.fees) S.fees = clone(DB.fees);
  const persist = () => FB.ls.set(KEY, S);
  const logAct = (msg) => { S.log.unshift({ t: FB.fmt.iso(), msg }); S.log = S.log.slice(0, 30); persist(); };

  /* ---------- Helpers ---------- */
  const seed = (s) => { let h = 2166136261; String(s).split('').forEach((c) => { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }); return h >>> 0; };
  const rnd = (s, a, b) => a + (seed(s) % (b - a + 1));
  const big = (n) => n >= 1e12 ? (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + ' tn' : n >= 1e9 ? (n / 1e9).toFixed(1).replace(/\.0$/, '') + ' bn' : FB.fmt.short(n);
  const badge = (txt, kind) => '<span class="badge ' + (kind || '') + '">' + esc(txt) + '</span>';
  const KYC_K = { Verified: 'success', Pending: 'warn', Rejected: 'danger' };
  const ACC_K = { Active: 'success', Locked: 'danger', Suspended: 'warn' };
  const RISK_K = { Low: 'success', Medium: 'warn', High: 'danger' };
  const TIER_K = { Standard: '', Silver: 'info', Gold: 'warn', Platinum: 'primary' };
  const TX_K = { Completed: 'success', Pending: 'warn', Failed: 'danger' };
  const custEff = (c) => Object.assign({}, c, S.cust[c.id] || {});
  const txEff = (t) => Object.assign({}, t, S.tx[t.id] || {});
  const allCust = () => DB.adminCustomers.map(custEff);
  const allTx = () => DB.adminTransactions.map(txEff);
  const dl = (name, rows) => FB.download(name, '﻿' + FB.csv(rows), 'text/csv;charset=utf-8');
  const stopBubble = (root, sel) => $$(sel, root).forEach((b) => b.addEventListener('click', (e) => e.stopPropagation()));

  /* Generic form modal. fields: [{k,label,kind:'text'|'rate'|'money'|'int'|'area',req,min,max,hint}] */
  function formModal(o) {
    const v = o.values || {};
    const html = o.fields.map((f) => '<div class="field" data-k="' + f.k + '"><label>' + esc(f.label) + '</label>' +
      (f.kind === 'area' ? '<textarea class="textarea" rows="3"></textarea>' : '<input class="input" ' + (f.kind === 'money' ? 'inputmode="numeric"' : f.kind === 'rate' ? 'inputmode="decimal"' : f.kind === 'int' ? 'inputmode="numeric"' : '') + ' autocomplete="off">') +
      (f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '') + '<div class="err"></div></div>').join('');
    const m = FB.modal({
      title: o.title, body: '<form novalidate>' + html + '</form>',
      actions: [{ label: 'Cancel' }, { label: o.saveLabel || 'Save', keepOpen: true, onClick: (api) => save(api) }]
    });
    const inp = (f) => $('[data-k="' + f.k + '"] .input, [data-k="' + f.k + '"] .textarea', m.el);
    o.fields.forEach((f) => {
      const i = inp(f), val = v[f.k];
      i.value = val == null ? '' : f.kind === 'money' ? FB.fmt.num(val) : val;
      if (f.kind === 'money') FB.amountInput(i);
    });
    $('form', m.el).onsubmit = (e) => { e.preventDefault(); save(m); };
    function check(f) {
      const i = inp(f);
      return FB.field(i, {
        required: f.req === false ? false : (f.label + ' is required.'),
        custom: (s) => {
          if (f.kind === 'text' || f.kind === 'area') return f.min && s.length < f.min ? 'Enter at least ' + f.min + ' characters.' : '';
          const n = f.kind === 'money' ? FB.parseAmount(s) : Number(s);
          if (f.kind === 'rate' && (!/^\d+(\.\d{1,2})?$/.test(s))) return 'Enter a number with up to 2 decimals.';
          if (f.kind === 'int' && !/^\d+$/.test(s)) return 'Enter a whole number.';
          if (f.min != null && n < f.min) return 'Minimum is ' + FB.fmt.num(f.min) + '.';
          if (f.max != null && n > f.max) return 'Maximum is ' + FB.fmt.num(f.max) + '.';
          return '';
        }
      });
    }
    function save(api) {
      const ok = o.fields.map(check).every(Boolean);
      if (!ok) { FB.toast('Please fix the highlighted fields.', 'error', 'Validation'); return; }
      const out = {};
      o.fields.forEach((f) => { const s = inp(f).value.trim(); out[f.k] = f.kind === 'money' ? FB.parseAmount(s) : (f.kind === 'rate' || f.kind === 'int') ? Number(s) : s; });
      const err = o.validate ? o.validate(out) : '';
      if (err) { FB.toast(err, 'error', 'Validation'); return; }
      api.close(); o.onSave(out);
    }
    return m;
  }

  /* ---------- Routing / shell ---------- */
  const SECTIONS = [
    ['dashboard', '📊', 'Dashboard'], ['customers', '👥', 'Customers'], ['transactions', '💸', 'Transactions'],
    ['products', '🏦', 'Products'], ['reports', '📑', 'Reports']
  ];
  let curSection = '';

  function showLogin() {
    ROOT.innerHTML = '<div class="admin-login"><div class="card"><div class="brand"><span class="brand-mark">F</span>FinBank Admin</div>' +
      '<h2>Staff sign in</h2><p class="muted mb-2" style="margin-top:4px">Restricted area. Use your operations credentials.</p>' +
      '<form id="lgForm" novalidate><div class="field"><label for="au">Username</label><input class="input" id="au" autocomplete="username" autofocus><div class="err"></div></div>' +
      '<div class="field"><label for="ap">Password</label><div class="input-group"><input class="input" id="ap" type="password" autocomplete="current-password"><button type="button" class="toggle" id="apt" aria-label="Show password">👁</button></div><div class="err"></div></div>' +
      '<button class="btn btn-block btn-lg" type="submit">Sign in</button></form>' +
      '<div class="demo-box"><b>Demo credentials</b><br>Username: <b>admin</b> · Password: <b>Admin@1234</b><br><small>Front-end demo only, not real security.</small></div>' +
      '<p class="center mt-2"><a href="dashboard.html">← Customer app</a></p></div></div>';
    $('#apt').onclick = () => { const p = $('#ap'); p.type = p.type === 'password' ? 'text' : 'password'; };
    $('#lgForm').onsubmit = (e) => {
      e.preventDefault();
      const u = $('#au'), p = $('#ap');
      const a = FB.field(u, { required: 'Enter your username.' }), b = FB.field(p, { required: 'Enter your password.' });
      if (!a || !b) return;
      const btn = $('button[type=submit]', e.target);
      FB.busy(btn, 700, () => {
        if (u.value.trim() === ADMIN.user && p.value === ADMIN.pass) { setAuthed(true); FB.toast('Welcome back, ' + ADMIN.name + '.', 'success', 'Signed in'); buildShell(); }
        else { FB.field(p, { custom: () => 'Incorrect username or password.' }); FB.toast('Invalid credentials. Use the demo hint below.', 'error', 'Sign in failed'); }
      });
    };
  }

  function buildShell() {
    ROOT.innerHTML =
      '<div class="app"><aside class="sidebar" aria-label="Admin"><a class="brand" href="#dashboard"><span class="brand-mark">F</span>FinBank Admin</a><nav class="nav">' +
      '<div class="nav-label">Operations</div>' + SECTIONS.map((s) => '<a href="#' + s[0] + '" data-nav="' + s[0] + '"><span class="ico">' + s[1] + '</span>' + s[2] + '</a>').join('') +
      '<div class="nav-label">Links</div><a href="dashboard.html"><span class="ico">↗</span>Customer app</a></nav>' +
      '<div class="sidebar-foot"><strong>Demo admin console</strong>All data is fictional. Changes are stored only in this browser.</div></aside>' +
      '<div class="main-wrap"><header class="topbar"><span class="page-title" id="pgTitle">Dashboard</span><div class="spacer"></div>' +
      '<a class="btn btn-outline btn-sm cust-link no-print" href="dashboard.html">Customer app →</a>' +
      '<button class="icon-btn" id="themeBtn" aria-label="Toggle theme" title="Toggle theme">🌓</button>' +
      '<div class="profile-btn" title="' + esc(ADMIN.name) + '"><span class="avatar">' + ADMIN.initials + '</span><span class="who"><b>' + esc(ADMIN.name) + '</b><small>' + esc(ADMIN.role) + '</small></span></div>' +
      '<button class="icon-btn" id="outBtn" aria-label="Sign out" title="Sign out">↩</button></header>' +
      '<main class="content" id="content" tabindex="-1"><nav class="admin-chips no-print" aria-label="Sections">' +
      SECTIONS.map((s) => '<a class="chip" href="#' + s[0] + '" data-nav="' + s[0] + '">' + s[1] + ' ' + s[2] + '</a>').join('') +
      '<a class="chip" href="dashboard.html">Customer app →</a></nav><div id="view"></div></main></div></div>';
    $('#themeBtn').onclick = FB.toggleTheme;
    $('#outBtn').onclick = () => FB.confirm({ title: 'Sign out', message: 'Sign out of the FinBank Admin Portal?', confirmLabel: 'Sign out', onConfirm: () => { setAuthed(false); FB.toast('You have been signed out.', 'info'); showLogin(); } });
    curSection = '';
    route();
  }

  function route() {
    if (!isAuthed()) return;
    let h = location.hash.slice(1).split('?')[0];
    if (!SECTIONS.some((s) => s[0] === h)) h = 'dashboard';
    if (!$('#view')) return;
    $$('[data-nav]').forEach((a) => { const on = a.dataset.nav === h; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    const title = SECTIONS.find((s) => s[0] === h)[2];
    $('#pgTitle').textContent = title; document.title = title + ' · FinBank Admin';
    const act = $('.admin-chips .chip.active'); if (act && act.scrollIntoView) { try { act.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* ignore */ } }
    curSection = h;
    const view = $('#view');
    FB.skeleton(view, (el) => { if (curSection === h) ({ dashboard, customers, transactions, products, reports })[h](el); }, 350);
  }
  window.addEventListener('hashchange', route);

  /* =====================================================================
     DASHBOARD
     ===================================================================== */
  const ALERTS_BASE = () => {
    const list = DB.adminTransactions.filter((t) => t.risk === 'High').map((t) => ({
      id: 'AL-' + t.id, kind: 'tx', txId: t.id, sev: 'High', time: t.time,
      title: 'High-risk transfer ' + FB.fmt.vnd(t.amount), sub: t.from + ' → ' + t.to + ' · ' + t.id
    }));
    list.push({ id: 'AL-9001', kind: 'cust', custId: 'CUS-0006', sev: 'Medium', time: '2026-09-30 06:48', title: '12 failed logins in 10 minutes', sub: 'Vu Anh Tuan · CUS-0006 · IP 45.77.xx.xx (Singapore)' });
    list.push({ id: 'AL-9002', kind: 'cust', custId: 'CUS-0005', sev: 'High', time: '2026-09-30 05:20', title: 'Card used in 3 countries within 1 hour', sub: 'Hoang Thi Mai · CUS-0005 · VN, SG, TH' });
    return list.sort((a, b) => (a.time < b.time ? 1 : -1));
  };

  function dashboard(el) {
    const K = DB.adminKpis;
    const resolved = Object.keys(S.alerts).length;
    const fraudOpen = Math.max(0, K.fraud - resolved);
    const trend = (base, k) => Array.from({ length: 12 }, (_, i) => Math.round(base * (0.9 + 0.1 * (i / 11)) * (1 + ((seed(k + i) % 60) - 30) / 1000)));
    const cards = [
      ['Total customers', FB.fmt.num(K.customers), '+1.8% MoM', 'pos', trend(K.customers, 'c'), '#1652f0'],
      ['Total deposits', big(K.deposits), '+2.4% MoM', 'pos', trend(K.deposits, 'd'), '#0fb981'],
      ['Total loans', big(K.loans), '+1.1% MoM', 'pos', trend(K.loans, 'l'), '#8b5cf6'],
      ['Daily transactions', FB.fmt.num(K.dailyTx), '+2.0% vs last week', 'pos', DB.adminMonthlyTx, '#0ea5e9'],
      ['Revenue (month)', big(K.revenue), '+2.9% MoM', 'pos', DB.adminMonthlyRevenue, '#f59e0b'],
      ['Failed transactions', FB.fmt.num(K.failed), '0.31% failure rate', 'neg', trend(K.failed, 'f').reverse(), '#e5484d'],
      ['Open fraud alerts', String(fraudOpen), resolved ? resolved + ' handled today' : 'Needs review', fraudOpen ? 'neg' : 'pos', trend(K.fraud * 4, 'a'), '#e5484d']
    ];
    el.innerHTML = '<div class="page-head"><div><h1>Operations dashboard</h1><p>Live overview · 30 Sep 2026 (demo data)</p></div></div>' +
      '<div class="kpis">' + cards.map((c) => '<div class="card kpi"><span class="lbl">' + c[0] + '</span><span class="val">' + c[1] + '</span><div class="foot"><small class="' + c[3] + '">' + c[2] + '</small>' + FB.chart.spark(c[4], c[5], 84, 28) + '</div></div>').join('') + '</div>' +
      '<div class="split"><div class="card"><div class="card-head"><h3>Revenue trend (bn VND)</h3></div><div id="chRev"></div></div>' +
      '<div class="card"><div class="card-head"><h3>Monthly transactions (K / day)</h3></div><div id="chTx"></div></div></div>' +
      '<div class="split main"><div class="card"><div class="card-head"><h3>Fraud alerts</h3><span id="alCount" class="badge danger"></span></div><div id="alerts"></div></div>' +
      '<div style="display:grid;gap:18px;align-content:start"><div class="card"><div class="card-head"><h3>Transaction status today</h3></div><div id="chSt"></div></div>' +
      '<div class="card"><div class="card-head"><h3>Recent activity</h3></div><div class="act-log" id="acts"></div></div></div></div>';
    const M = DB.months;
    FB.chart.line({ el: $('#chRev'), labels: M, series: [{ name: 'Revenue', data: DB.adminMonthlyRevenue, color: '#1652f0' }], fmt: (v) => Math.round(v), fmtTip: (v) => v + ' bn VND', title: 'Revenue trend', height: 240 });
    FB.chart.bar({ el: $('#chTx'), labels: M, series: [{ name: 'Tx per day', data: DB.adminMonthlyTx, color: '#0fb981' }], fmt: (v) => Math.round(v), fmtTip: (v) => v + 'K', title: 'Monthly transactions', height: 240 });
    const pend = 8670, blocked = 312 + Object.values(S.alerts).filter((v) => v === 'blocked').length;
    FB.chart.donut({ el: $('#chSt'), title: 'Transaction status', center: { title: 'Today', value: FB.fmt.short(K.dailyTx) },
      items: [{ label: 'Completed', value: K.dailyTx - K.failed - pend - blocked, color: '#0fb981' }, { label: 'Pending', value: pend, color: '#f59e0b' }, { label: 'Failed', value: K.failed, color: '#e5484d' }, { label: 'Blocked', value: blocked, color: '#8b5cf6' }] });
    renderAlerts(); renderActs();
  }

  function renderAlerts() {
    const box = $('#alerts'); if (!box) return;
    const list = ALERTS_BASE();
    const open = list.filter((a) => !S.alerts[a.id]).length;
    $('#alCount').textContent = open + ' open';
    box.innerHTML = list.map((a) => {
      const st = S.alerts[a.id];
      return '<div class="alert-row" data-al="' + a.id + '"><div class="row-icon">' + (a.sev === 'High' ? '🚨' : '⚠️') + '</div><div class="grow"><b>' + esc(a.title) + '</b><small>' + esc(a.sub) + ' · ' + FB.fmt.datetime(a.time) + '</small></div>' +
        (st ? badge(st === 'blocked' ? 'Blocked' : 'In review', st === 'blocked' ? 'danger' : 'info')
          : '<div class="acts">' + badge(a.sev, RISK_K[a.sev]) + '<button class="btn btn-outline btn-sm" data-do="review">Review</button><button class="btn btn-danger btn-sm" data-do="block">Block</button></div>') + '</div>';
    }).join('') || FB.empty('✅', 'No alerts', 'All clear.');
    $$('[data-do]', box).forEach((b) => (b.onclick = () => {
      const a = list.find((x) => x.id === b.closest('[data-al]').dataset.al), block = b.dataset.do === 'block';
      FB.confirm({
        title: block ? 'Block this activity?' : 'Start review?', danger: block, confirmLabel: block ? 'Block' : 'Start review',
        message: block ? (a.kind === 'tx' ? 'The transaction ' + a.txId + ' will be rejected and funds returned to the sender.' : 'The customer account ' + a.custId + ' will be locked immediately.') : 'The alert will be assigned to you and marked as in review.',
        onConfirm: () => {
          S.alerts[a.id] = block ? 'blocked' : 'review';
          if (block && a.kind === 'tx') S.tx[a.txId] = Object.assign(S.tx[a.txId] || {}, { status: 'Failed', note: 'Blocked by fraud team' });
          if (block && a.kind === 'cust') S.cust[a.custId] = Object.assign(S.cust[a.custId] || {}, { status: 'Locked' });
          logAct((block ? 'Blocked alert ' : 'Reviewing alert ') + a.id);
          FB.toast(block ? 'Alert ' + a.id + ' blocked.' : 'Alert ' + a.id + ' moved to review.', block ? 'warn' : 'success');
          dashboard($('#view'));
        }
      });
    }));
  }

  function renderActs() {
    const box = $('#acts'); if (!box) return;
    const base = [
      { t: '2026-09-30 09:14', msg: 'Transfer TX-889120 completed automatically' }, { t: '2026-09-30 08:50', msg: 'Nightly reconciliation finished (0 mismatches)' },
      { t: '2026-09-30 08:05', msg: 'KYC batch: 2 new applications received' }, { t: '2026-09-29 17:30', msg: 'Interest rate table published by Treasury' }
    ];
    const rows = S.log.concat(base).slice(0, 7);
    box.innerHTML = rows.map((r) => '<div>' + esc(r.msg) + '<small>' + FB.fmt.datetime(r.t) + '</small></div>').join('');
  }

  /* =====================================================================
     CUSTOMERS
     ===================================================================== */
  const cs = { q: '', kyc: '', status: '', tier: '', sort: 'joined', dir: 'desc', page: 1 };
  const TIER_ORDER = { Standard: 0, Silver: 1, Gold: 2, Platinum: 3 };

  function customers(el) {
    el.innerHTML = '<div class="page-head"><div><h1>Customer management</h1><p>Search, review KYC and manage account status.</p></div><button class="btn btn-outline no-print" id="cExport">⬇ Export CSV</button></div>' +
      '<div class="toolbar no-print"><input class="input grow" id="cQ" type="search" placeholder="Search by name, ID or phone…" aria-label="Search customers">' +
      '<select class="select" id="cKyc" aria-label="KYC status"><option value="">All KYC</option><option>Verified</option><option>Pending</option><option>Rejected</option></select>' +
      '<select class="select" id="cSt" aria-label="Account status"><option value="">All accounts</option><option>Active</option><option>Locked</option><option>Suspended</option></select>' +
      '<select class="select" id="cTier" aria-label="Tier"><option value="">All tiers</option><option>Standard</option><option>Silver</option><option>Gold</option><option>Platinum</option></select></div>' +
      '<div id="cTable"></div><div id="cPager"></div>';
    $('#cQ').value = cs.q; $('#cKyc').value = cs.kyc; $('#cSt').value = cs.status; $('#cTier').value = cs.tier;
    $('#cQ').oninput = FB.debounce((e) => { cs.q = e.target.value; cs.page = 1; paintCust(); }, 200);
    [['cKyc', 'kyc'], ['cSt', 'status'], ['cTier', 'tier']].forEach(([id, k]) => ($('#' + id).onchange = (e) => { cs[k] = e.target.value; cs.page = 1; paintCust(); }));
    $('#cExport').onclick = () => { const r = filteredCust(); if (!r.length) return FB.toast('No customers to export.', 'warn'); dl('customers.csv', [['ID', 'Name', 'Phone', 'Tier', 'Balance', 'KYC', 'Status', 'Joined']].concat(r.map((c) => [c.id, c.name, c.phone, c.tier, c.balance, c.kyc, c.status, c.joined]))); };
    paintCust();
  }

  function filteredCust() {
    const q = cs.q.trim().toLowerCase().replace(/\s/g, '');
    let r = allCust().filter((c) => (!q || (c.name + c.id + c.phone).toLowerCase().replace(/\s/g, '').includes(q)) && (!cs.kyc || c.kyc === cs.kyc) && (!cs.status || c.status === cs.status) && (!cs.tier || c.tier === cs.tier));
    const d = cs.dir === 'asc' ? 1 : -1;
    r.sort((a, b) => { const x = cs.sort === 'tier' ? TIER_ORDER[a.tier] : a[cs.sort], y = cs.sort === 'tier' ? TIER_ORDER[b.tier] : b[cs.sort]; return (x > y ? 1 : x < y ? -1 : 0) * d; });
    return r;
  }

  function paintCust() {
    const r = filteredCust(), PS = 6, box = $('#cTable'); if (!box) return;
    const pages = Math.max(1, Math.ceil(r.length / PS)); cs.page = Math.min(cs.page, pages);
    const rows = r.slice((cs.page - 1) * PS, cs.page * PS);
    const th = (k, label, cls) => '<th class="sortable ' + (cls || '') + '" data-s="' + k + '" aria-sort="' + (cs.sort === k ? (cs.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '">' + label + (cs.sort === k ? (cs.dir === 'asc' ? ' ▲' : ' ▼') : '') + '</th>';
    box.innerHTML = r.length ? '<div class="table-wrap"><table class="table stack"><thead><tr>' + th('id', 'ID') + th('name', 'Customer') + '<th>Phone</th>' + th('tier', 'Tier') + th('balance', 'Balance', 'num') + '<th>KYC</th><th>Status</th>' + th('joined', 'Joined') + '</tr></thead><tbody>' +
      rows.map((c) => '<tr class="clickable" data-id="' + c.id + '" tabindex="0"><td data-label="ID">' + c.id + '</td><td data-label="Customer"><b>' + esc(c.name) + '</b></td><td data-label="Phone">' + esc(c.phone) + '</td><td data-label="Tier">' + badge(c.tier, TIER_K[c.tier]) + '</td><td class="num mono" data-label="Balance">' + FB.fmt.num(c.balance) + '</td><td data-label="KYC">' + badge(c.kyc, KYC_K[c.kyc]) + '</td><td data-label="Status">' + badge(c.status, ACC_K[c.status]) + '</td><td data-label="Joined">' + FB.fmt.date(c.joined) + '</td></tr>').join('') + '</tbody></table></div>'
      : FB.empty('🔍', 'No customers found', 'Try clearing filters or a different search term.');
    $$('th[data-s]', box).forEach((h) => (h.onclick = () => { const k = h.dataset.s; cs.dir = cs.sort === k && cs.dir === 'asc' ? 'desc' : 'asc'; cs.sort = k; paintCust(); }));
    $$('tr[data-id]', box).forEach((tr) => { tr.onclick = () => custDetail(tr.dataset.id); tr.onkeydown = (e) => { if (e.key === 'Enter') custDetail(tr.dataset.id); }; });
    FB.pager({ el: $('#cPager'), total: r.length, pageSize: PS, page: cs.page, onChange: (p) => { cs.page = p; paintCust(); } });
  }

  function custDetail(id) {
    const m = FB.modal({ title: 'Customer details', size: 'lg', body: '', actions: [{ label: 'Close' }] });
    const paint = () => {
      const base = DB.adminCustomers.find((c) => c.id === id), c = custEff(base), locked = c.status !== 'Active';
      const cur = c.balance > 50000000 ? Math.round(c.balance * 0.7) : c.balance, sav = c.balance - cur;
      const num = (k) => '1903 ' + String(rnd(id + k, 1000, 9999)) + ' ' + String(rnd(id + k + 'b', 1000, 9999));
      const accts = [['Current Account', num('a'), cur]].concat(sav > 0 ? [['Savings Account', num('s'), sav]] : []);
      const docs = [['National ID (front & back)', c.kyc === 'Verified' ? 'Verified' : c.kyc === 'Pending' ? 'Submitted' : 'Rejected'], ['Selfie / liveness check', c.kyc === 'Verified' ? 'Verified' : c.kyc === 'Pending' ? 'Pending' : 'Verified'], ['Proof of address', c.kyc === 'Verified' ? 'Verified' : c.kyc === 'Pending' ? 'Missing' : 'Missing']];
      const dk = { Verified: 'success', Submitted: 'info', Pending: 'warn', Missing: 'warn', Rejected: 'danger' };
      const acts = (c.log || []).map((l) => [l.t, l.msg]).concat(DB.adminTransactions.filter((t) => t.from === c.name || t.to === c.name).map((t) => [t.time, (t.from === c.name ? 'Sent ' : 'Received ') + FB.fmt.vnd(t.amount) + ' · ' + t.id]), [['2026-09-29 20:14', 'Logged in from Chrome · Ho Chi Minh City'], ['2026-09-20 11:02', 'Updated notification settings']]);
      acts.sort((a, b) => (a[0] < b[0] ? 1 : -1));
      m.body.innerHTML = '<div class="flex gap-2 items-center wrap"><span class="avatar lg">' + esc(c.name.split(' ').slice(-2).map((w) => w[0]).join('')) + '</span><div class="grow"><h3 style="font-size:19px">' + esc(c.name) + '</h3><div class="text-2">' + c.id + ' · ' + esc(c.phone) + '</div><div class="chips mt-1">' + badge(c.tier, TIER_K[c.tier]) + badge('KYC ' + c.kyc, KYC_K[c.kyc]) + badge(c.status, ACC_K[c.status]) + '</div></div></div>' +
        '<dl class="kv detail-sec"><dt>Total balance</dt><dd>' + FB.fmt.vnd(c.balance) + '</dd><dt>Customer since</dt><dd>' + FB.fmt.date(c.joined) + '</dd><dt>Email</dt><dd>' + esc(c.name.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.')) + '@example.vn</dd>' + (c.kycReason ? '<dt>KYC rejection reason</dt><dd>' + esc(c.kycReason) + '</dd>' : '') + '</dl>' +
        '<div class="detail-sec"><h4>Accounts</h4>' + accts.map((a) => '<div class="doc-row"><span><b>' + a[0] + '</b><br><small class="muted">' + a[1] + '</small></span><span class="mono"><b>' + FB.fmt.num(a[2]) + '</b> VND<br>' + badge(locked ? c.status : 'Active', ACC_K[locked ? c.status : 'Active']) + '</span></div>').join('') + '</div>' +
        '<div class="detail-sec"><h4>KYC documents</h4>' + docs.map((d) => '<div class="doc-row"><span>' + d[0] + '</span>' + badge(d[1], dk[d[1]]) + '</div>').join('') + '</div>' +
        '<div class="detail-sec"><h4>Recent activity</h4><div class="act-log">' + acts.slice(0, 5).map((a) => '<div>' + esc(a[1]) + '<small>' + FB.fmt.datetime(a[0]) + '</small></div>').join('') + '</div></div>' +
        '<div class="detail-sec"><h4>Actions</h4><div class="chips">' +
        (c.kyc !== 'Verified' ? '<button class="btn btn-success btn-sm" data-a="approve">✓ Approve KYC</button>' : '') + (c.kyc !== 'Rejected' ? '<button class="btn btn-outline btn-sm" data-a="reject">✕ Reject KYC</button>' : '') +
        '<button class="btn ' + (locked ? 'btn-outline' : 'btn-danger') + ' btn-sm" data-a="lock">' + (locked ? '🔓 Unlock account' : '🔒 Lock account') + '</button><button class="btn btn-outline btn-sm" data-a="reset">🔑 Reset password</button></div></div>';
      const upd = (patch, msg, type) => { S.cust[id] = Object.assign(S.cust[id] || {}, patch); S.cust[id].log = [{ t: FB.fmt.iso(), msg }].concat(S.cust[id].log || []).slice(0, 8); logAct(msg + ' — ' + c.name); FB.toast(msg + '.', type || 'success'); paint(); if ($('#cTable')) paintCust(); };
      $$('[data-a]', m.body).forEach((b) => (b.onclick = () => {
        const a = b.dataset.a;
        if (a === 'approve') FB.confirm({ title: 'Approve KYC', message: 'Approve identity verification for ' + c.name + '?', confirmLabel: 'Approve', onConfirm: () => upd({ kyc: 'Verified', kycReason: '' }, 'KYC approved') });
        if (a === 'reject') formModal({ title: 'Reject KYC — ' + c.name, saveLabel: 'Reject KYC', fields: [{ k: 'reason', label: 'Reason', kind: 'area', min: 5, hint: 'Shown to the customer. Minimum 5 characters.' }], onSave: (v) => upd({ kyc: 'Rejected', kycReason: v.reason }, 'KYC rejected', 'warn') });
        if (a === 'lock') FB.confirm({ danger: !locked, title: locked ? 'Unlock account' : 'Lock account', message: locked ? 'Restore access for ' + c.name + '?' : 'Lock all accounts of ' + c.name + '? They will not be able to transact.', confirmLabel: locked ? 'Unlock' : 'Lock', onConfirm: () => upd({ status: locked ? 'Active' : 'Locked' }, locked ? 'Account unlocked' : 'Account locked', locked ? 'success' : 'warn') });
        if (a === 'reset') FB.confirm({ title: 'Reset password', message: 'Send a one-time password reset link to ' + c.phone + '?', confirmLabel: 'Send link', onConfirm: () => upd({}, 'Password reset link sent to ' + c.phone, 'success') });
      }));
    };
    paint();
  }

  /* =====================================================================
     TRANSACTIONS
     ===================================================================== */
  const ts = { tab: 'all', q: '', risk: '', page: 1 };
  const TABS = [['all', 'All'], ['pending', 'Pending'], ['failed', 'Failed'], ['suspicious', 'Suspicious']];
  const tabMatch = (t, tab) => tab === 'all' || (tab === 'pending' && t.status === 'Pending') || (tab === 'failed' && t.status === 'Failed') || (tab === 'suspicious' && t.risk === 'High');

  function transactions(el) {
    el.innerHTML = '<div class="page-head"><div><h1>Transaction management</h1><p>Monitor, approve or reject transfers and flag suspicious activity.</p></div><button class="btn btn-outline no-print" id="tExport">⬇ Export CSV</button></div>' +
      '<div class="tabs no-print" id="tTabs" role="tablist"></div>' +
      '<div class="toolbar no-print"><input class="input grow" id="tQ" type="search" placeholder="Search by ID, sender or receiver…" aria-label="Search transactions"><select class="select" id="tRisk" aria-label="Risk"><option value="">All risk levels</option><option>Low</option><option>Medium</option><option>High</option></select></div>' +
      '<div id="tTable"></div><div id="tPager"></div>';
    $('#tQ').value = ts.q; $('#tRisk').value = ts.risk;
    $('#tQ').oninput = FB.debounce((e) => { ts.q = e.target.value; ts.page = 1; paintTx(); }, 200);
    $('#tRisk').onchange = (e) => { ts.risk = e.target.value; ts.page = 1; paintTx(); };
    $('#tExport').onclick = () => { const r = filteredTx(); if (!r.length) return FB.toast('No transactions to export.', 'warn'); dl('transactions.csv', [['ID', 'Time', 'From', 'To', 'Amount', 'Status', 'Risk']].concat(r.map((t) => [t.id, t.time, t.from, t.to, t.amount, t.status, t.risk]))); };
    paintTx();
  }

  function filteredTx() {
    const q = ts.q.trim().toLowerCase();
    return allTx().filter((t) => tabMatch(t, ts.tab) && (!ts.risk || t.risk === ts.risk) && (!q || (t.id + t.from + t.to).toLowerCase().includes(q)));
  }

  function txActions(t, size) {
    const s = size || 'btn-sm';
    return (t.status === 'Pending' ? '<button class="btn btn-success ' + s + '" data-ta="approve">Approve</button><button class="btn btn-danger ' + s + '" data-ta="reject">Reject</button>' : '') +
      (t.risk !== 'High' ? '<button class="btn btn-outline ' + s + '" data-ta="flag">⚑ Flag</button>' : '');
  }

  function txAction(id, a, done) {
    const t = txEff(DB.adminTransactions.find((x) => x.id === id));
    const set = (patch, msg, type) => { S.tx[id] = Object.assign(S.tx[id] || {}, patch); logAct(msg + ' · ' + id); FB.toast(id + ': ' + msg + '.', type || 'success'); if ($('#tTable')) paintTx(); if (done) done(); };
    if (a === 'approve') FB.confirm({ title: 'Approve transaction', message: (t.risk === 'High' ? 'This transfer is rated HIGH risk. ' : '') + 'Release ' + FB.fmt.vnd(t.amount) + ' from ' + t.from + ' to ' + t.to + '?', danger: t.risk === 'High', confirmLabel: 'Approve', onConfirm: () => set({ status: 'Completed' }, 'Approved') });
    if (a === 'reject') FB.confirm({ title: 'Reject transaction', danger: true, message: 'Reject ' + id + '? Funds will be returned to ' + t.from + '.', confirmLabel: 'Reject', onConfirm: () => set({ status: 'Failed', note: 'Rejected by ' + ADMIN.name }, 'Rejected', 'warn') });
    if (a === 'flag') FB.confirm({ title: 'Flag as suspicious', message: 'Mark ' + id + ' as high risk and send it to the fraud team?', confirmLabel: 'Flag', onConfirm: () => set({ risk: 'High', flagged: true }, 'Flagged as suspicious', 'warn') });
  }

  function paintTx() {
    const box = $('#tTable'); if (!box) return;
    const all = allTx();
    $('#tTabs').innerHTML = TABS.map((x) => '<button class="tab ' + (ts.tab === x[0] ? 'active' : '') + '" data-t="' + x[0] + '" role="tab" aria-selected="' + (ts.tab === x[0]) + '">' + x[1] + ' (' + all.filter((t) => tabMatch(t, x[0])).length + ')</button>').join('');
    $$('#tTabs .tab').forEach((b) => (b.onclick = () => { ts.tab = b.dataset.t; ts.page = 1; paintTx(); }));
    const r = filteredTx(), PS = 6, pages = Math.max(1, Math.ceil(r.length / PS)); ts.page = Math.min(ts.page, pages);
    const rows = r.slice((ts.page - 1) * PS, ts.page * PS);
    box.innerHTML = r.length ? '<div class="table-wrap"><table class="table stack"><thead><tr><th>ID</th><th>Time</th><th>From → To</th><th class="num">Amount (VND)</th><th>Status</th><th>Risk</th><th class="no-print">Actions</th></tr></thead><tbody>' +
      rows.map((t) => '<tr class="clickable" data-id="' + t.id + '" tabindex="0"><td data-label="ID"><b>' + t.id + '</b></td><td data-label="Time">' + FB.fmt.datetime(t.time) + '</td><td data-label="Route">' + esc(t.from) + ' → ' + esc(t.to) + '</td><td class="num mono" data-label="Amount">' + FB.fmt.num(t.amount) + '</td><td data-label="Status">' + badge(t.status, TX_K[t.status]) + '</td><td data-label="Risk">' + badge(t.risk + (t.flagged ? ' ⚑' : ''), RISK_K[t.risk]) + '</td><td class="no-print"><div class="acts">' + txActions(t) + '</div></td></tr>').join('') + '</tbody></table></div>'
      : FB.empty('📭', 'No transactions in this view', 'Change the tab, risk filter or search term.');
    stopBubble(box, '[data-ta]');
    $$('tr[data-id]', box).forEach((tr) => {
      const open = () => txDetail(tr.dataset.id);
      tr.onclick = open; tr.onkeydown = (e) => { if (e.key === 'Enter') open(); };
      $$('[data-ta]', tr).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); txAction(tr.dataset.id, b.dataset.ta); }));
    });
    FB.pager({ el: $('#tPager'), total: r.length, pageSize: PS, page: ts.page, onChange: (p) => { ts.page = p; paintTx(); } });
  }

  function txDetail(id) {
    const m = FB.modal({ title: 'Transaction ' + id, body: '', actions: [{ label: 'Close' }] });
    const paint = () => {
      const t = txEff(DB.adminTransactions.find((x) => x.id === id));
      m.body.innerHTML = '<div class="center"><div style="font-size:26px;font-weight:800;margin-bottom:8px">' + FB.fmt.vnd(t.amount) + '</div>' + badge(t.status, TX_K[t.status]) + ' ' + badge('Risk ' + t.risk, RISK_K[t.risk]) + '</div>' +
        '<div class="receipt mt-2">' + [['Reference', t.id], ['Time', FB.fmt.datetime(t.time)], ['Sender', t.from], ['Receiver', t.to], ['Channel', 'Interbank / Napas 247'], ['Fee', '0 VND'], ['Note', t.note || (t.risk === 'High' ? 'Flagged by rule engine: unusual amount / destination' : '—')]].map((r) => '<div class="r-row"><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>').join('') + '</div>' +
        '<div class="chips mt-2">' + txActions(t, 'btn-sm') + '</div>';
      $$('[data-ta]', m.body).forEach((b) => (b.onclick = () => txAction(id, b.dataset.ta, paint)));
    };
    paint();
  }

  /* =====================================================================
     PRODUCTS
     ===================================================================== */
  let ptab = 'savings';
  const PT = [['savings', 'Savings products'], ['loans', 'Loan products'], ['cards', 'Credit cards'], ['fees', 'Fees']];

  function products(el) {
    el.innerHTML = '<div class="page-head"><div><h1>Product management</h1><p>Edit rates, limits and fees. Changes are saved locally in this demo.</p></div><button class="btn no-print" id="pAdd">+ Add new</button></div>' +
      '<div class="tabs" id="pTabs" role="tablist">' + PT.map((x) => '<button class="tab" data-t="' + x[0] + '" role="tab">' + x[1] + '</button>').join('') + '</div><div id="pBody"></div>';
    $$('#pTabs .tab').forEach((b) => (b.onclick = () => { ptab = b.dataset.t; paintProducts(); }));
    $('#pAdd').onclick = () => prodModal(ptab, null);
    paintProducts();
  }

  function activeSwitch(kind, id, on) { return '<label class="switch" title="Toggle active"><input type="checkbox" data-sw="' + kind + ':' + id + '" ' + (on ? 'checked' : '') + ' aria-label="Active"><span></span></label>'; }

  function paintProducts() {
    const box = $('#pBody'); if (!box) return;
    $$('#pTabs .tab').forEach((b) => { const on = b.dataset.t === ptab; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    $('#pAdd').textContent = ptab === 'fees' ? '+ Add fee' : '+ Add product';
    let html = '';
    const wrap = (head, rows) => '<div class="table-wrap"><table class="table stack"><thead><tr>' + head + '<th class="no-print">Actions</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    if (ptab === 'savings') html = wrap('<th>Product</th><th>Term</th><th class="num">Rate (%/yr)</th><th class="num">Min deposit</th><th>Active</th>', S.savings.map((p) => '<tr><td data-label="Product"><b>' + esc(p.name) + '</b><br><small class="muted">' + esc(p.desc || '') + '</small></td><td data-label="Term">' + (p.term ? p.term + ' months' : 'No term') + '</td><td class="num" data-label="Rate">' + p.rate.toFixed(2) + '</td><td class="num mono" data-label="Min">' + FB.fmt.num(p.min) + '</td><td data-label="Active">' + activeSwitch('savings', p.id, p.active) + '</td><td class="no-print"><div class="acts"><button class="btn btn-outline btn-sm" data-ed="savings:' + p.id + '">Edit</button>' + (p.custom ? '<button class="btn btn-ghost btn-sm" data-del="savings:' + p.id + '">Delete</button>' : '') + '</div></td></tr>').join(''));
    if (ptab === 'loans') html = wrap('<th>Product</th><th class="num">Rate (%/yr)</th><th class="num">Max amount</th><th>Max term</th><th>Active</th>', S.loans.map((p) => '<tr><td data-label="Product"><b>' + esc(p.name) + '</b><br><small class="muted">' + esc(p.desc || '') + '</small></td><td class="num" data-label="Rate">' + p.rate.toFixed(2) + '</td><td class="num mono" data-label="Max">' + FB.fmt.num(p.max) + '</td><td data-label="Term">' + p.maxTerm + ' months</td><td data-label="Active">' + activeSwitch('loans', p.id, p.active) + '</td><td class="no-print"><div class="acts"><button class="btn btn-outline btn-sm" data-ed="loans:' + p.id + '">Edit</button>' + (p.custom ? '<button class="btn btn-ghost btn-sm" data-del="loans:' + p.id + '">Delete</button>' : '') + '</div></td></tr>').join(''));
    if (ptab === 'cards') html = wrap('<th>Card</th><th class="num">Annual fee</th><th class="num">Credit limit</th><th class="num">Cashback</th><th>Active</th>', S.cards.map((p) => '<tr><td data-label="Card"><b>💳 ' + esc(p.name) + '</b></td><td class="num mono" data-label="Fee">' + FB.fmt.num(p.annualFee) + '</td><td class="num mono" data-label="Limit">' + FB.fmt.short(p.limitMin) + ' – ' + FB.fmt.short(p.limitMax) + '</td><td class="num" data-label="Cashback">' + p.cashback + '%</td><td data-label="Active">' + activeSwitch('cards', p.id, p.active) + '</td><td class="no-print"><div class="acts"><button class="btn btn-outline btn-sm" data-ed="cards:' + p.id + '">Edit</button>' + (p.custom ? '<button class="btn btn-ghost btn-sm" data-del="cards:' + p.id + '">Delete</button>' : '') + '</div></td></tr>').join(''));
    if (ptab === 'fees') html = wrap('<th>Fee</th><th>Value</th>', S.fees.map((f, i) => '<tr><td data-label="Fee"><b>' + esc(f.name) + '</b></td><td data-label="Value">' + esc(f.value) + '</td><td class="no-print"><div class="acts"><button class="btn btn-outline btn-sm" data-ed="fees:' + i + '">Edit</button><button class="btn btn-ghost btn-sm" data-del="fees:' + i + '">Delete</button></div></td></tr>').join(''));
    box.innerHTML = html || FB.empty('📦', 'No products', 'Add one with the button above.');
    $$('[data-sw]', box).forEach((c) => (c.onchange = () => { const [k, id] = c.dataset.sw.split(':'), p = S[k].find((x) => x.id === id); p.active = c.checked; persist(); logAct((c.checked ? 'Activated ' : 'Deactivated ') + p.name); FB.toast(p.name + (c.checked ? ' is now active.' : ' has been deactivated.'), c.checked ? 'success' : 'warn'); }));
    $$('[data-ed]', box).forEach((b) => (b.onclick = () => { const [k, id] = b.dataset.ed.split(':'); prodModal(k, k === 'fees' ? +id : id); }));
    $$('[data-del]', box).forEach((b) => (b.onclick = () => {
      const [k, id] = b.dataset.del.split(':'), item = k === 'fees' ? S.fees[+id] : S[k].find((x) => x.id === id);
      FB.confirm({ title: 'Delete', danger: true, message: 'Delete "' + item.name + '"? This cannot be undone.', confirmLabel: 'Delete', onConfirm: () => { if (k === 'fees') S.fees.splice(+id, 1); else S[k] = S[k].filter((x) => x.id !== id); persist(); logAct('Deleted ' + item.name); FB.toast('"' + item.name + '" deleted.', 'success'); paintProducts(); } });
    }));
  }

  function prodModal(kind, id) {
    const isNew = id == null;
    const item = isNew ? {} : kind === 'fees' ? S.fees[id] : S[kind].find((x) => x.id === id);
    const dupName = (name) => (kind === 'fees' ? S.fees.map((f, i) => [f.name, i]) : S[kind].map((p) => [p.name, p.id])).some((x) => x[0].toLowerCase() === name.toLowerCase() && x[1] !== id);
    const F = {
      savings: [{ k: 'name', label: 'Product name', kind: 'text', min: 3 }, { k: 'term', label: 'Term (months, 0 = no term)', kind: 'int', min: 0, max: 120 }, { k: 'rate', label: 'Interest rate (% / year)', kind: 'rate', min: 0.01, max: 15 }, { k: 'min', label: 'Minimum deposit (VND)', kind: 'money', min: 1 }, { k: 'desc', label: 'Description', kind: 'area', req: false }],
      loans: [{ k: 'name', label: 'Product name', kind: 'text', min: 3 }, { k: 'rate', label: 'Interest rate (% / year)', kind: 'rate', min: 0, max: 30 }, { k: 'max', label: 'Maximum amount (VND)', kind: 'money', min: 1000000 }, { k: 'maxTerm', label: 'Maximum term (months)', kind: 'int', min: 1, max: 360 }, { k: 'desc', label: 'Description', kind: 'area', req: false }],
      cards: [{ k: 'name', label: 'Card name', kind: 'text', min: 3 }, { k: 'annualFee', label: 'Annual fee (VND)', kind: 'money', min: 0 }, { k: 'limitMin', label: 'Minimum credit limit (VND)', kind: 'money', min: 1000000 }, { k: 'limitMax', label: 'Maximum credit limit (VND)', kind: 'money', min: 1000000 }, { k: 'cashback', label: 'Cashback (%)', kind: 'rate', min: 0, max: 10 }],
      fees: [{ k: 'name', label: 'Fee name', kind: 'text', min: 3 }, { k: 'value', label: 'Value / description', kind: 'text', min: 1 }]
    }[kind];
    const fixMin = { annualFee: 0 }; // allow 0 for money fields (parseAmount('0') => 0 is falsy but custom runs on non-empty text)
    formModal({
      title: (isNew ? 'Add ' : 'Edit ') + ({ savings: 'savings product', loans: 'loan product', cards: 'credit card', fees: 'fee' }[kind]), fields: F, values: item, saveLabel: isNew ? 'Create' : 'Save changes',
      validate: (v) => dupName(v.name) ? 'A ' + (kind === 'fees' ? 'fee' : 'product') + ' with this name already exists.' : (kind === 'cards' && v.limitMax < v.limitMin) ? 'Maximum limit must be at least the minimum limit.' : '',
      onSave: (v) => {
        void fixMin;
        if (kind === 'fees') { if (isNew) S.fees.push(v); else Object.assign(S.fees[id], v); }
        else if (isNew) S[kind].push(Object.assign({ id: kind[0] + 'x' + Date.now().toString(36), active: true, custom: true, label: kind === 'savings' ? (v.term ? v.term + ' months' : 'No term') : undefined }, v));
        else { Object.assign(item, v); if (kind === 'savings') item.label = v.term ? v.term + ' months' : 'No term'; }
        persist(); logAct((isNew ? 'Created ' : 'Updated ') + v.name);
        FB.toast('"' + v.name + '" ' + (isNew ? 'created.' : 'updated.'), 'success'); paintProducts();
      }
    });
  }

  /* =====================================================================
     REPORTS
     ===================================================================== */
  const rs = { type: 'transaction', period: '6' };
  const RTYPES = [['transaction', 'Transaction report'], ['customer', 'Customer report'], ['revenue', 'Revenue report'], ['loan', 'Loan report'], ['deposit', 'Deposit report']];

  function reports(el) {
    el.innerHTML = '<div class="page-head"><div><h1>Reports</h1><p>Generated from mock data, deterministic per period.</p></div>' +
      '<div class="chips no-print"><button class="btn btn-outline" id="rCsv">⬇ Export CSV</button><button class="btn btn-outline" id="rPdf">🖨 Export PDF</button></div></div>' +
      '<div class="toolbar no-print"><select class="select" id="rType" aria-label="Report type">' + RTYPES.map((t) => '<option value="' + t[0] + '">' + t[1] + '</option>').join('') + '</select>' +
      '<select class="select" id="rPer" aria-label="Period"><option value="3">Last 3 months</option><option value="6">Last 6 months</option><option value="12">Last 12 months</option></select></div><div id="rBody"></div>';
    $('#rType').value = rs.type; $('#rPer').value = rs.period;
    const go = () => { rs.type = $('#rType').value; rs.period = $('#rPer').value; const b = $('#rBody'); FB.skeleton(b, paintReport, 300); };
    $('#rType').onchange = go; $('#rPer').onchange = go;
    $('#rPdf').onclick = () => { FB.toast('Opening print dialog — choose "Save as PDF".', 'info'); setTimeout(() => window.print(), 300); };
    $('#rCsv').onclick = () => { const d = buildReport(); dl('report-' + rs.type + '-' + rs.period + 'm.csv', [[d.title + ' · last ' + rs.period + ' months'], d.head].concat(d.rows.map((r) => r.map((c) => String(c).replace(/,/g, ''))))); };
    paintReport($('#rBody'));
  }

  function buildReport() {
    const N = +rs.period, M = DB.months.slice(-N), rev = DB.adminMonthlyRevenue.slice(-N), tx = DB.adminMonthlyTx.slice(-N), K = DB.adminKpis;
    const n = FB.fmt.num, r1 = (v) => Math.round(v * 10) / 10;
    const t = rs.type, yr = (i) => M[i] + (M[i] === 'Oct' || M[i] === 'Nov' || M[i] === 'Dec' ? ' 25' : ' 26');
    const lab = M.map((_, i) => M[i]);
    const D = { type: t, labels: lab, sum: [] };
    if (t === 'transaction') {
      const succ = M.map((m, i) => 97.6 + (seed('s' + m + i) % 20) / 10), tot = tx.map((v) => v * 30), failed = tx.map((v, i) => Math.round(v * 30 * (100 - succ[i]) / 100));
      Object.assign(D, { title: 'Transaction report', head: ['Month', 'Avg daily tx (K)', 'Total tx (K)', 'Success rate %', 'Failed (K)'], rows: M.map((m, i) => [yr(i), tx[i], n(tot[i]), succ[i].toFixed(1), n(failed[i])]),
        sum: [['Avg daily (K)', r1(tx.reduce((a, b) => a + b, 0) / N)], ['Total (M)', r1(tot.reduce((a, b) => a + b, 0) / 1000)], ['Avg success', r1(succ.reduce((a, b) => a + b, 0) / N) + '%']],
        charts: (a, b) => { FB.chart.bar({ el: a, labels: lab, series: [{ name: 'Avg daily tx (K)', data: tx, color: '#1652f0' }], fmt: Math.round, fmtTip: (v) => v + 'K', height: 240 }); FB.chart.donut({ el: b, center: { title: 'Channels', value: '100%' }, items: [{ label: 'Interbank', value: 38, color: '#1652f0' }, { label: 'QR payment', value: 27, color: '#0fb981' }, { label: 'Card', value: 20, color: '#f59e0b' }, { label: 'Bill payment', value: 10, color: '#8b5cf6' }, { label: 'Top-up', value: 5, color: '#0ea5e9' }] }); }, t1: 'Average daily transactions (K)', t2: 'Volume by channel' });
    } else if (t === 'customer') {
      const nw = M.map((m, i) => 8200 + seed('n' + m + i) % 3400), cl = M.map((m, i) => 900 + seed('c' + m + i) % 700), tot = []; let run = K.customers;
      for (let i = N - 1; i >= 0; i--) { tot[i] = run; run -= nw[i] - cl[i]; }
      Object.assign(D, { title: 'Customer report', head: ['Month', 'New', 'Closed', 'Net', 'Total customers'], rows: M.map((m, i) => [yr(i), n(nw[i]), n(cl[i]), n(nw[i] - cl[i]), n(tot[i])]),
        sum: [['New customers', n(nw.reduce((a, b) => a + b, 0))], ['Closed', n(cl.reduce((a, b) => a + b, 0))], ['Total now', n(K.customers)]],
        charts: (a, b) => { FB.chart.line({ el: a, labels: lab, series: [{ name: 'New', data: nw, color: '#0fb981' }, { name: 'Closed', data: cl, color: '#e5484d', area: false }], fmt: FB.fmt.short, fmtTip: n, height: 240 }); FB.chart.donut({ el: b, center: { title: 'By tier', value: FB.fmt.short(K.customers) }, items: [{ label: 'Standard', value: 58, color: '#94a3b8' }, { label: 'Silver', value: 24, color: '#0ea5e9' }, { label: 'Gold', value: 14, color: '#f59e0b' }, { label: 'Platinum', value: 4, color: '#8b5cf6' }] }); }, t1: 'New vs closed accounts', t2: 'Customers by tier' });
    } else if (t === 'revenue') {
      const ni = rev.map((v) => r1(v * 0.58)), fee = rev.map((v) => r1(v * 0.28)), oth = rev.map((v, i) => r1(v - ni[i] - fee[i]));
      Object.assign(D, { title: 'Revenue report', head: ['Month', 'Revenue (bn VND)', 'Net interest', 'Fees', 'Other'], rows: M.map((m, i) => [yr(i), rev[i], ni[i], fee[i], oth[i]]),
        sum: [['Total (bn)', rev.reduce((a, b) => a + b, 0)], ['Best month', yr(rev.indexOf(Math.max.apply(null, rev)))], ['Growth', r1((rev[N - 1] / rev[0] - 1) * 100) + '%']],
        charts: (a, b) => { FB.chart.line({ el: a, labels: lab, series: [{ name: 'Revenue', data: rev, color: '#1652f0' }], fmt: Math.round, fmtTip: (v) => v + ' bn', height: 240 }); FB.chart.donut({ el: b, center: { title: 'Mix', value: rev[N - 1] + ' bn' }, items: [{ label: 'Net interest', value: 58, color: '#1652f0' }, { label: 'Fees', value: 28, color: '#0fb981' }, { label: 'Other', value: 14, color: '#f59e0b' }] }); }, t1: 'Revenue (bn VND)', t2: 'Revenue mix' });
    } else if (t === 'loan') {
      const out = M.map((m, i) => K.loans * (1 - (N - 1 - i) * 0.009) / 1e9), dis = M.map((m, i) => 900 + seed('d' + m + i) % 400), rep = M.map((m, i) => 700 + seed('r' + m + i) % 350), npl = M.map((m, i) => 1.4 + (seed('p' + m + i) % 8) / 10);
      Object.assign(D, { title: 'Loan report', head: ['Month', 'Disbursed (bn)', 'Repaid (bn)', 'Outstanding (bn)', 'NPL %'], rows: M.map((m, i) => [yr(i), n(dis[i]), n(rep[i]), n(out[i]), npl[i].toFixed(1)]),
        sum: [['Disbursed (bn)', n(dis.reduce((a, b) => a + b, 0))], ['Repaid (bn)', n(rep.reduce((a, b) => a + b, 0))], ['Outstanding', big(K.loans)]],
        charts: (a, b) => { FB.chart.bar({ el: a, labels: lab, series: [{ name: 'Disbursed', data: dis, color: '#8b5cf6' }, { name: 'Repaid', data: rep, color: '#0fb981' }], fmt: Math.round, fmtTip: (v) => v + ' bn', height: 240 }); FB.chart.donut({ el: b, center: { title: 'Loan book', value: big(K.loans) }, items: [{ label: 'Home', value: 41, color: '#1652f0' }, { label: 'Personal', value: 22, color: '#0fb981' }, { label: 'Business', value: 20, color: '#f59e0b' }, { label: 'Auto', value: 15, color: '#8b5cf6' }, { label: 'Card instalment', value: 2, color: '#0ea5e9' }] }); }, t1: 'Disbursed vs repaid (bn VND)', t2: 'Loan book by product' });
    } else {
      const dep = M.map((m, i) => K.deposits * (1 - (N - 1 - i) * 0.011) / 1e9), inflow = M.map((m, i) => 3200 + seed('i' + m + i) % 1500), outflow = M.map((m, i) => 2600 + seed('o' + m + i) % 1400);
      Object.assign(D, { title: 'Deposit report', head: ['Month', 'Total deposits (bn)', 'Inflow (bn)', 'Outflow (bn)', 'Term share %'], rows: M.map((m, i) => [yr(i), n(dep[i]), n(inflow[i]), n(outflow[i]), (62 + (seed('t' + m + i) % 50) / 10).toFixed(1)]),
        sum: [['Total now', big(K.deposits)], ['Inflow (bn)', n(inflow.reduce((a, b) => a + b, 0))], ['Outflow (bn)', n(outflow.reduce((a, b) => a + b, 0))]],
        charts: (a, b) => { FB.chart.line({ el: a, labels: lab, series: [{ name: 'Total deposits', data: dep.map((v) => Math.round(v)), color: '#0fb981' }], fmt: (v) => Math.round(v / 1000) + 'k', fmtTip: (v) => n(v) + ' bn', height: 240 }); FB.chart.donut({ el: b, center: { title: 'Tenor', value: big(K.deposits) }, items: [{ label: 'Demand (CASA)', value: 34, color: '#0ea5e9' }, { label: '1-6 months', value: 22, color: '#f59e0b' }, { label: '12 months', value: 30, color: '#1652f0' }, { label: '24 months+', value: 14, color: '#8b5cf6' }] }); }, t1: 'Total deposits (bn VND)', t2: 'Deposits by tenor' });
    }
    return D;
  }

  function paintReport(box) {
    if (!box || !box.isConnected) return;
    const d = buildReport();
    box.innerHTML = '<div class="sum-row">' + d.sum.map((s) => '<div class="card"><b>' + esc(s[1]) + '</b><span>' + esc(s[0]) + '</span></div>').join('') + '</div>' +
      '<div class="split"><div class="card"><div class="card-head"><h3>' + esc(d.t1) + '</h3></div><div id="rc1"></div></div><div class="card"><div class="card-head"><h3>' + esc(d.t2) + '</h3></div><div id="rc2"></div></div></div>' +
      '<div class="card"><div class="card-head"><h3>' + esc(d.title) + ' — last ' + rs.period + ' months</h3></div><div class="table-wrap"><table class="table"><thead><tr>' + d.head.map((h, i) => '<th class="' + (i ? 'num' : '') + '">' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      d.rows.map((r) => '<tr>' + r.map((c, i) => '<td class="' + (i ? 'num mono' : '') + '">' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div></div>';
    d.charts($('#rc1'), $('#rc2'));
  }

  /* ---------- Boot ---------- */
  if (isAuthed()) buildShell(); else showLogin();
})();
