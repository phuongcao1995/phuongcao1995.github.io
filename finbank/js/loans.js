/* FinBank — Loans page */
(function () {
  const { $, $$, esc, fmt } = FB;
  const TERMS = [3, 6, 12, 24, 36, 48, 60, 84, 96, 120, 180, 240, 300];
  const STEPS = ['Submitted', 'Under review', 'Approved', 'Disbursed'];
  const EARLY_FEE = 0.01;
  const termText = (m) => (m % 12 === 0 && m >= 12 ? m + ' months (' + m / 12 + ' yr' + (m > 12 ? 's' : '') + ')' : m + ' months');
  const today = () => fmt.iso().slice(0, 10);
  const isoD = (d) => fmt.iso(d).slice(0, 10);
  const addM = (s, n) => {
    const d = FB.parseDate(s), day = d.getDate(), r = new Date(d.getFullYear(), d.getMonth() + n, 1);
    r.setDate(Math.min(day, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate())); return r;
  };
  const product = (name) => FB.db.loanProducts.find((p) => p.name === name || p.id === name);
  const activeLoans = () => FB.db.loans.filter((l) => l.status !== 'Closed');

  const showTab = FB.tabs(document);

  /* ---------- Amortization ---------- */
  function schedule(P, rate, n, method, startISO) {
    const rows = [], r = rate / 1200;
    if (method === 'flat') {
      const totalInt = (P * rate / 100 * n) / 12, pay = (P + totalInt) / n;
      let bal = P;
      for (let i = 1; i <= n; i++) { bal = Math.max(0, bal - P / n); rows.push({ i, date: isoD(addM(startISO, i)), pay, principal: P / n, interest: totalInt / n, balance: bal }); }
      return rows;
    }
    const pay = FB.pmt(P, rate, n); let bal = P;
    for (let i = 1; i <= n; i++) {
      const interest = bal * r, principal = i === n ? bal : pay - interest;
      bal = Math.max(0, bal - principal);
      rows.push({ i, date: isoD(addM(startISO, i)), pay: principal + interest, principal, interest, balance: bal });
    }
    return rows;
  }

  /* ---------- Products ---------- */
  function renderProducts() {
    $('#products').innerHTML = FB.db.loanProducts.map((p) =>
      '<div class="card"><div class="flex between items-center"><span class="row-icon">' + p.icon + '</span><span class="badge primary">' + esc(p.tag) + '</span></div>' +
      '<h3 class="mt-1">' + esc(p.name) + '</h3><p class="text-2" style="min-height:42px">' + esc(p.desc) + '</p>' +
      '<dl class="kv mt-1" style="grid-template-columns:100px 1fr;gap:6px 10px;font-size:13.5px"><dt>Rate from</dt><dd>' + p.rate.toFixed(1) + '% / year</dd><dt>Up to</dt><dd>' + fmt.vnd(p.max) + '</dd><dt>Max term</dt><dd>' + termText(p.maxTerm) + '</dd></dl>' +
      '<div class="flex gap-1 mt-2"><button class="btn grow" data-apply="' + p.id + '">Apply</button><button class="btn btn-outline" data-calc="' + p.id + '">Calculate</button></div></div>').join('');
    $$('[data-apply]').forEach((b) => (b.onclick = () => { setApplyProduct(b.dataset.apply); showTab('apply'); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
    $$('[data-calc]').forEach((b) => (b.onclick = () => { kPreset.value = b.dataset.calc; presetChanged(); showTab('calc'); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  }

  /* ---------- Calculator ---------- */
  const kPreset = $('#kPreset'), kAmt = $('#kAmt'), kRange = $('#kRange'), kTerm = $('#kTerm'), kRate = $('#kRate');
  const k = { method: 'reducing', page: 1, rows: [] };
  kPreset.innerHTML = '<option value="custom">Custom</option>' + FB.db.loanProducts.map((p) => '<option value="' + p.id + '">' + esc(p.name) + ' — from ' + p.rate.toFixed(1) + '%</option>').join('');
  kAmt.value = fmt.num(200000000); kRange.value = 200000000; kRate.value = 9.9;
  FB.amountInput(kAmt);

  function fillTerms(sel, max, keep) {
    const list = TERMS.filter((t) => t <= max);
    sel.innerHTML = list.map((t) => '<option value="' + t + '">' + termText(t) + '</option>').join('');
    sel.value = list.includes(keep) ? keep : list[list.length - 1];
  }
  fillTerms(kTerm, 300, 60);

  function presetChanged() {
    const p = product(kPreset.value);
    fillTerms(kTerm, p ? p.maxTerm : 300, +kTerm.value);
    if (p) { kRate.value = p.rate; if (FB.parseAmount(kAmt.value) > p.max) { kAmt.value = fmt.num(p.max); kRange.value = p.max; } }
    k.page = 1; calc();
  }

  function calc() {
    const P = FB.parseAmount(kAmt.value), n = +kTerm.value, rate = parseFloat(kRate.value);
    const p = product(kPreset.value), maxAmt = p ? p.max : 15000000000;
    const okA = FB.field(kAmt, { required: 'Enter a loan amount.', min: 1000000, max: maxAmt });
    const okR = FB.field(kRate, { custom: () => (isNaN(rate) || rate < 0 || rate > 30 ? 'Enter a rate between 0% and 30%.' : '') });
    const box = $('#kResult');
    if (!okA || !okR) { box.innerHTML = FB.empty('🧮', 'Check your inputs', 'Enter a valid amount and interest rate to see the repayment plan.'); k.rows = []; $('#kTable').innerHTML = ''; $('#kPager').innerHTML = ''; return; }
    kRange.value = Math.min(P, +kRange.max);
    const rows = schedule(P, rate, n, k.method, today());
    k.rows = rows;
    const interest = rows.reduce((s, r) => s + r.interest, 0), total = P + interest, monthly = rows[0].pay;
    box.innerHTML = '<div class="card-head"><h3>Repayment summary</h3><span class="badge">' + (k.method === 'flat' ? 'Flat rate' : 'Reducing balance') + '</span></div>' +
      '<div class="muted" style="font-size:13px">' + (k.method === 'flat' ? 'Monthly payment' : 'Monthly payment (first month)') + '</div><div class="big-num">' + fmt.vnd(monthly) + '</div>' +
      '<div class="grid g2 mt-2"><div class="stat"><span class="lbl">Total interest</span><span class="val neg">' + fmt.vnd(interest) + '</span></div><div class="stat"><span class="lbl">Total payable</span><span class="val">' + fmt.vnd(total) + '</span></div></div>' +
      '<div id="kDonut" class="mt-2"></div>';
    FB.chart.donut({ el: $('#kDonut'), title: 'Principal versus interest', items: [{ label: 'Principal', value: P, color: 'var(--primary)' }, { label: 'Interest', value: interest || 0.001, color: 'var(--warn)' }], center: { title: 'Interest share', value: total ? (interest / total * 100).toFixed(1) + '%' : '0%' } });
    renderTable();
  }

  function renderTable() {
    const rows = k.rows, size = 12;
    if (!rows.length) return;
    const page = FB.pager({ el: $('#kPager'), total: rows.length, pageSize: size, page: k.page, onChange: (p) => { k.page = p; renderTable(); } });
    k.page = page;
    $('#kTable').innerHTML = '<div class="table-wrap"><table class="table stack"><thead><tr><th>#</th><th>Due date</th><th class="right">Payment</th><th class="right">Principal</th><th class="right">Interest</th><th class="right">Balance</th></tr></thead><tbody>' +
      rows.slice((page - 1) * size, page * size).map((r) => '<tr><td data-label="Instalment">' + r.i + '</td><td data-label="Due date">' + fmt.date(r.date) + '</td><td data-label="Payment" class="right">' + fmt.num(r.pay) + '</td><td data-label="Principal" class="right">' + fmt.num(r.principal) + '</td><td data-label="Interest" class="right">' + fmt.num(r.interest) + '</td><td data-label="Balance" class="right">' + fmt.num(r.balance) + '</td></tr>').join('') + '</tbody></table></div>';
  }

  kPreset.onchange = presetChanged;
  kAmt.addEventListener('input', () => { k.page = 1; calc(); });
  kRange.addEventListener('input', () => { kAmt.value = fmt.num(+kRange.value); k.page = 1; calc(); });
  kTerm.onchange = () => { k.page = 1; calc(); };
  kRate.addEventListener('input', () => { kPreset.value = 'custom'; k.page = 1; calc(); });
  $$('[data-method]').forEach((b) => (b.onclick = () => { k.method = b.dataset.method; $$('[data-method]').forEach((x) => x.classList.toggle('selected', x === b)); k.page = 1; calc(); }));
  $('#kCsv').onclick = () => {
    if (!k.rows.length) { FB.toast('Enter valid loan details first.', 'warn'); return; }
    FB.download('loan-schedule.csv', '﻿' + FB.csv([['#', 'Due date', 'Payment', 'Principal', 'Interest', 'Balance']].concat(k.rows.map((r) => [r.i, fmt.date(r.date), Math.round(r.pay), Math.round(r.principal), Math.round(r.interest), Math.round(r.balance)]))), 'text/csv;charset=utf-8');
  };

  /* ---------- Apply ---------- */
  const aProd = $('#aProd'), aAmt = $('#aAmt'), aTerm = $('#aTerm');
  let aStep = 1;
  aProd.innerHTML = FB.db.loanProducts.map((p) => '<option value="' + p.id + '">' + p.icon + ' ' + esc(p.name) + ' — ' + p.rate.toFixed(1) + '%/yr</option>').join('');
  FB.amountInput(aAmt); FB.amountInput($('#aIncome'));
  const u = FB.db.user;
  $('#aName').value = u.name; $('#aPhone').value = u.phone; $('#aEmployer').value = u.employer; $('#aJob').value = u.job; $('#aIncome').value = fmt.num(u.income);
  const minAmt = (p) => (p.id === 'l5' ? 1000000 : 5000000);

  function setApplyProduct(id) { aProd.value = id; fillTerms(aTerm, product(id).maxTerm, +aTerm.value || 24); aAmt.value = ''; updateEst(); }
  function updateEst() {
    const p = product(aProd.value), amt = FB.parseAmount(aAmt.value), n = +aTerm.value;
    $('#aAmtHint').textContent = 'Between ' + fmt.vnd(minAmt(p)) + ' and ' + fmt.vnd(p.max) + '.';
    $('#aEst').innerHTML = amt >= minAmt(p) && amt <= p.max ? '<span>💡</span><div>Estimated monthly payment: <b>' + fmt.vnd(FB.pmt(amt, p.rate, n)) + '</b> at ' + p.rate.toFixed(1) + '%/year over ' + termText(n) + '.</div>' : '<span>💡</span><div>Enter an amount to see your estimated monthly payment.</div>';
  }
  const monthlyDebt = () => activeLoans().reduce((s, l) => s + l.monthly, 0);
  function updateDti() {
    const p = product(aProd.value), amt = FB.parseAmount(aAmt.value), inc = FB.parseAmount($('#aIncome').value), box = $('#aDti');
    if (!inc) { box.className = 'alert'; box.innerHTML = '<span>ℹ️</span><div>Enter your monthly income to check affordability.</div>'; return 0; }
    const dti = (monthlyDebt() + FB.pmt(amt, p.rate, +aTerm.value)) / inc * 100;
    box.className = 'alert ' + (dti <= 50 ? 'success' : dti <= 70 ? 'warn' : 'danger');
    box.innerHTML = '<span>' + (dti <= 50 ? '✅' : dti <= 70 ? '⚠️' : '⛔') + '</span><div>Debt-to-income ratio after this loan: <b>' + dti.toFixed(0) + '%</b>. ' + (dti <= 50 ? 'Looks healthy.' : dti <= 70 ? 'High — approval may need extra review.' : 'Above 70% — we cannot process this request. Lower the amount or extend the term.') + '</div>';
    return dti;
  }
  aProd.onchange = () => setApplyProduct(aProd.value);
  aAmt.addEventListener('input', updateEst); aTerm.onchange = updateEst; $('#aIncome').addEventListener('input', updateDti);

  function gotoStep(n) {
    aStep = n;
    $$('[data-a]').forEach((s) => s.classList.toggle('hidden', +s.dataset.a !== n));
    $$('#aSteps .step').forEach((s, i) => { s.classList.toggle('done', i + 1 < n); s.classList.toggle('current', i + 1 === n); });
    $('#aBack').disabled = n === 1; $('#aNext').textContent = n === 3 ? 'Submit application' : 'Continue';
    if (n === 2) updateDti();
  }
  $('#aBack').onclick = () => gotoStep(aStep - 1);
  $('#aNext').onclick = (e) => {
    const p = product(aProd.value), amt = FB.parseAmount(aAmt.value), n = +aTerm.value;
    if (aStep === 1) {
      const ok = [FB.field(aAmt, { required: 'Enter the amount you want to borrow.', min: minAmt(p), max: p.max }), FB.field($('#aPurpose'), { required: 'Select a purpose.' })];
      if (ok.includes(false)) return;
      gotoStep(2); return;
    }
    if (aStep === 2) {
      const inc = $('#aIncome');
      const ok = [FB.field($('#aEmployer'), { required: 'Enter your employer.' }), FB.field($('#aJob'), { required: 'Enter your job title.' }), FB.field(inc, { required: 'Enter your monthly income.', min: 5000000 })];
      if (ok.includes(false)) return;
      if (updateDti() > 70) { FB.toast('Debt-to-income ratio is above 70%. Adjust the amount or term.', 'error', 'Cannot continue'); return; }
      $('#aReview').innerHTML = '<div class="receipt">' + [['Product', p.name], ['Amount', fmt.vnd(amt)], ['Term', termText(n)], ['Interest rate', p.rate.toFixed(1) + '% per year'], ['Est. monthly payment', fmt.vnd(FB.pmt(amt, p.rate, n))], ['Purpose', $('#aPurpose').value], ['Employer', $('#aEmployer').value.trim()], ['Job title', $('#aJob').value.trim()], ['Monthly income', fmt.vnd(FB.parseAmount(inc.value))]].map((r) => '<div class="r-row"><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>').join('') + '</div>';
      gotoStep(3); return;
    }
    if (!$('#aC1').checked || !$('#aC2').checked) { $('#aErr').textContent = 'Please accept both statements to submit.'; return; }
    $('#aErr').textContent = '';
    FB.otp({ title: 'Confirm loan application', onSuccess: () => FB.busy(e.target, 900, () => {
      const id = 'APP-' + fmt.iso().slice(2, 10).replace(/-/g, '') + '-' + Math.floor(10 + Math.random() * 90);
      FB.db.loanApplications.unshift({ id, product: p.name, amount: amt, term: n, submitted: today(), status: 'Submitted', step: 1, purpose: $('#aPurpose').value, employer: $('#aEmployer').value.trim(), income: FB.parseAmount($('#aIncome').value) });
      FB.save(); FB.notify('money', 'Loan application submitted', id + ' for ' + fmt.vnd(amt) + ' is being processed.');
      aAmt.value = ''; $('#aPurpose').value = ''; $('#aC1').checked = $('#aC2').checked = false; gotoStep(1); updateEst();
      renderApps();
      FB.receipt({ title: 'Application submitted', modalTitle: 'Application received', amount: amt, ref: id, rows: [['Application ID', id], ['Product', p.name], ['Term', termText(n)], ['Status', 'Submitted'], ['Decision time', 'Within 24 hours']], onDone: () => showTab('apps') });
    }) });
  };
  $('#quickApply').onclick = () => showTab('apply');

  /* ---------- Applications ---------- */
  function renderApps() {
    const list = FB.db.loanApplications;
    if (!list.length) { $('#apps').innerHTML = FB.empty('📄', 'No applications', 'Start a new application from the Apply tab.'); return; }
    $('#apps').innerHTML = list.map((a) => {
      const cancelled = a.status === 'Cancelled', final = a.step >= 4;
      return '<div class="card app-card"><div class="card-head"><div><h3>' + esc(a.product) + ' — ' + fmt.vnd(a.amount) + '</h3><small class="muted">' + esc(a.id) + ' · ' + termText(a.term) + ' · submitted ' + fmt.date(a.submitted) + '</small></div><span class="badge ' + (cancelled ? 'danger' : final ? 'success' : 'info') + '">' + esc(a.status) + '</span></div>' +
        (cancelled ? '<div class="alert warn"><span>🚫</span><div>This application was withdrawn.</div></div>' :
          '<div class="steps" style="margin-bottom:8px">' + STEPS.map((s, i) => '<div class="step ' + (i + 1 < a.step || (final && i + 1 === a.step) ? 'done' : i + 1 === a.step ? 'current' : '') + '" data-n="' + (i + 1) + '">' + s + '</div>').join('') + '</div>' +
          (final ? '<div class="alert success"><span>🎉</span><div>Funds were disbursed to your Current Account. Track repayments in <a href="#mine" data-goto="mine">My loans</a>.</div></div>' : '<div class="flex gap-1 wrap"><button class="btn btn-outline btn-sm" data-sim="' + a.id + '">⏩ Simulate progress</button><button class="btn btn-ghost btn-sm" data-cancel="' + a.id + '" style="color:var(--danger)">Withdraw application</button></div>')) + '</div>';
    }).join('');
    $$('[data-sim]').forEach((b) => (b.onclick = () => advance(b.dataset.sim, b)));
    $$('[data-cancel]').forEach((b) => (b.onclick = () => {
      const a = FB.db.loanApplications.find((x) => x.id === b.dataset.cancel);
      FB.confirm({ title: 'Withdraw application', danger: true, message: 'Withdraw application ' + a.id + '? You can submit a new one at any time.', confirmLabel: 'Withdraw', cancelLabel: 'Keep', onConfirm: () => { a.status = 'Cancelled'; FB.save(); renderApps(); FB.toast('Application withdrawn.', 'success'); } });
    }));
    $$('[data-goto]').forEach((l) => (l.onclick = (e) => { e.preventDefault(); showTab(l.dataset.goto); }));
  }

  function advance(id, btn) {
    const a = FB.db.loanApplications.find((x) => x.id === id);
    FB.busy(btn, 900, () => {
      a.step = Math.min(4, a.step + 1); a.status = STEPS[a.step - 1];
      if (a.step === 3) FB.notify('money', 'Loan approved', a.id + ' for ' + fmt.vnd(a.amount) + ' has been approved.');
      if (a.step === 4) disburse(a);
      FB.save(); renderApps(); renderMine();
      FB.toast(a.id + ': ' + a.status + '.', a.step === 4 ? 'success' : 'info', 'Application update');
    });
  }

  function disburse(a) {
    const p = product(a.product) || { rate: 9.9 }, monthly = Math.round(FB.pmt(a.amount, p.rate, a.term));
    const loan = { id: 'LN-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000), product: a.product, principal: a.amount, outstanding: a.amount, rate: p.rate, term: a.term, term0: a.term, paid: 0, baseline: 0, monthly, nextDue: isoD(addM(today(), 1)), status: 'Active', start: today(), payments: [] };
    FB.db.loans.push(loan);
    FB.addTx({ desc: 'Loan disbursement — ' + a.product + ' ' + loan.id, cat: 'income', type: 'in', amount: a.amount, acc: 'acc1', channel: 'Loan', counterparty: 'FinBank Loans' });
    mineSel = loan.id;
  }

  /* ---------- My loans ---------- */
  let mineSel = null, schedPage = null, histPage = 1;

  function prepLoan(l) {
    if (l.payments == null) l.payments = [];
    if (l.baseline == null) l.baseline = l.paid;
    if (l.term0 == null) l.term0 = l.term;
  }
  function projection(l) {
    const r = l.rate / 1200, rows = []; let bal = l.outstanding;
    while (bal > 0.5 && rows.length < 600) {
      const interest = Math.round(bal * r); let principal = Math.round(Math.min(bal, l.monthly - interest)); if (principal <= 0) principal = Math.round(bal);
      bal -= principal;
      rows.push({ i: l.paid + rows.length + 1, date: isoD(addM(l.nextDue, rows.length)), pay: principal + interest, principal, interest, status: rows.length === 0 ? (l.nextDue < today() ? 'Overdue' : 'Due next') : 'Upcoming' });
    }
    return rows;
  }
  function fullSchedule(l) {
    const orig = schedule(l.principal, l.rate, l.term0, 'reducing', l.start);
    const paid = [];
    for (let i = 1; i <= l.paid; i++) { const o = orig[i - 1] || orig[orig.length - 1]; paid.push({ i, date: o.date, pay: l.monthly, principal: Math.max(0, l.monthly - Math.round(o.interest)), interest: Math.round(o.interest), status: 'Paid' }); }
    return paid.concat(projection(l));
  }
  function history(l) {
    const base = [], orig = schedule(l.principal, l.rate, l.term0, 'reducing', l.start);
    for (let i = l.baseline; i >= 1; i--) { const o = orig[i - 1]; if (o) base.push({ date: o.date, type: 'Instalment #' + i, amount: l.monthly, principal: l.monthly - Math.round(o.interest), interest: Math.round(o.interest), ref: 'LP' + l.id.slice(-4) + String(i).padStart(3, '0') }); }
    return l.payments.slice().reverse().concat(base);
  }

  function renderMine() {
    const box = $('#mine'), loans = FB.db.loans;
    if (!loans.length) { box.innerHTML = FB.empty('📑', 'You have no loans', 'Apply for a loan to see your repayment plan here.') + '<div class="center"><button class="btn" id="mineApply">Apply for a loan</button></div>'; $('#mineApply').onclick = () => showTab('apply'); return; }
    loans.forEach(prepLoan);
    if (!loans.some((l) => l.id === mineSel)) mineSel = (activeLoans()[0] || loans[0]).id;
    const l = loans.find((x) => x.id === mineSel), closed = l.status === 'Closed';
    const sched = fullSchedule(l), remaining = sched.filter((r) => r.status !== 'Paid').length;
    const repaidPct = Math.min(100, ((l.principal - l.outstanding) / l.principal) * 100);
    const daysTo = Math.ceil((FB.parseDate(l.nextDue) - Date.now()) / 864e5);
    box.innerHTML =
      (loans.length > 1 ? '<div class="chips mb-2">' + loans.map((x) => '<button class="chip ' + (x.id === mineSel ? 'active' : '') + '" data-loan="' + x.id + '">' + esc(x.id) + '</button>').join('') + '</div>' : '') +
      '<section class="card mb-2"><div class="card-head"><div><h3>' + esc(l.product) + ' · ' + esc(l.id) + '</h3><small class="muted">Started ' + fmt.date(l.start) + ' · ' + l.rate + '% per year · ' + termText(l.term) + '</small></div><span class="badge ' + (closed ? '' : 'success') + '">' + esc(l.status) + '</span></div>' +
      '<div class="grid g4 keep2"><div class="stat"><span class="lbl">Outstanding</span><span class="val">' + fmt.vnd(l.outstanding) + '</span></div><div class="stat"><span class="lbl">Monthly payment</span><span class="val">' + fmt.vnd(l.monthly) + '</span></div><div class="stat"><span class="lbl">Next due</span><span class="val ' + (!closed && daysTo <= 5 ? 'neg' : '') + '">' + (closed ? '—' : fmt.date(l.nextDue)) + '</span>' + (closed ? '' : '<span class="delta muted">' + (daysTo >= 0 ? 'in ' + daysTo + ' days' : 'overdue by ' + -daysTo + ' days') + '</span>') + '</div><div class="stat"><span class="lbl">Instalments</span><span class="val">' + l.paid + ' / ' + l.term + '</span><span class="delta muted">' + remaining + ' remaining</span></div></div>' +
      '<div class="mt-2"><div class="flex between" style="font-size:13px"><span class="muted">Principal repaid</span><b>' + repaidPct.toFixed(1) + '% of ' + fmt.vnd(l.principal) + '</b></div><div class="progress ok mt-1"><i style="width:' + repaidPct + '%"></i></div></div>' +
      (closed ? '<div class="alert success mt-2"><span>🎉</span><div>This loan is fully repaid. Thank you!</div></div>' : '<div class="flex gap-1 wrap mt-2"><button class="btn" id="payNow">💳 Pay now / early repay</button></div>') + '</section>' +
      '<section class="card mb-2"><div class="card-head"><h3>Repayment schedule</h3></div><div id="sTable"></div><div id="sPager"></div></section>' +
      '<section class="card"><div class="card-head"><h3>Payment history</h3></div><div id="hTable"></div><div id="hPager"></div></section>';
    $$('[data-loan]').forEach((b) => (b.onclick = () => { mineSel = b.dataset.loan; schedPage = null; histPage = 1; renderMine(); }));
    if (!closed) $('#payNow').onclick = () => payModal(l);

    const size = 10;
    if (schedPage == null) schedPage = Math.max(1, Math.ceil((l.paid + 1) / size));
    const drawSched = () => {
      if (!sched.length) { $('#sTable').innerHTML = FB.empty('📅', 'Nothing left to pay'); $('#sPager').innerHTML = ''; return; }
      schedPage = FB.pager({ el: $('#sPager'), total: sched.length, pageSize: size, page: schedPage, onChange: (p) => { schedPage = p; drawSched(); } });
      $('#sTable').innerHTML = '<div class="table-wrap"><table class="table stack"><thead><tr><th>#</th><th>Due date</th><th class="right">Payment</th><th class="right">Principal</th><th class="right">Interest</th><th>Status</th></tr></thead><tbody>' +
        sched.slice((schedPage - 1) * size, schedPage * size).map((r) => '<tr><td data-label="Instalment">' + r.i + '</td><td data-label="Due date">' + fmt.date(r.date) + '</td><td data-label="Payment" class="right">' + fmt.num(r.pay) + '</td><td data-label="Principal" class="right">' + fmt.num(r.principal) + '</td><td data-label="Interest" class="right">' + fmt.num(r.interest) + '</td><td data-label="Status"><span class="badge ' + ({ Paid: 'success', 'Due next': 'warn', Overdue: 'danger' }[r.status] || '') + '">' + r.status + '</span></td></tr>').join('') + '</tbody></table></div>';
    };
    drawSched();
    const hist = history(l), hs = 6;
    if (!hist.length) { $('#hTable').innerHTML = FB.empty('🧾', 'No payments yet', 'Your repayments will be listed here.'); return; }
    const drawHist = () => {
      histPage = FB.pager({ el: $('#hPager'), total: hist.length, pageSize: hs, page: histPage, onChange: (p) => { histPage = p; drawHist(); } });
      $('#hTable').innerHTML = '<div class="table-wrap"><table class="table stack"><thead><tr><th>Date</th><th>Type</th><th class="right">Amount</th><th class="right">Principal</th><th class="right">Interest</th><th>Reference</th></tr></thead><tbody>' +
        hist.slice((histPage - 1) * hs, histPage * hs).map((h) => '<tr><td data-label="Date">' + fmt.date(h.date) + '</td><td data-label="Type">' + esc(h.type) + '</td><td data-label="Amount" class="right"><b>' + fmt.num(h.amount) + '</b></td><td data-label="Principal" class="right">' + fmt.num(h.principal) + '</td><td data-label="Interest" class="right">' + fmt.num(h.interest) + '</td><td data-label="Reference" class="mono">' + esc(h.ref) + '</td></tr>').join('') + '</tbody></table></div>';
    };
    drawHist();
  }

  function payModal(l) {
    const proj = projection(l), next = proj[0], fee = Math.round(l.outstanding * EARLY_FEE);
    let mode = 'inst';
    const opts = [
      ['inst', 'Pay next instalment', fmt.vnd(next.pay), 'Instalment #' + next.i + ' due ' + fmt.date(next.date) + '.'],
      ['part', 'Partial early repayment', '', 'Reduce your principal and finish sooner. ' + EARLY_FEE * 100 + '% fee applies.'],
      ['full', 'Settle loan in full', fmt.vnd(l.outstanding + fee), 'Outstanding ' + fmt.vnd(l.outstanding) + ' + ' + EARLY_FEE * 100 + '% fee (' + fmt.vnd(fee) + ').']
    ];
    const m = FB.modal({
      title: 'Repay ' + l.id,
      body: '<div class="grid" style="gap:10px">' + opts.map((o) => '<button type="button" class="selectable' + (o[0] === 'inst' ? ' selected' : '') + '" data-mode="' + o[0] + '"><div class="flex between"><b>' + o[1] + '</b><b>' + o[2] + '</b></div><div class="muted" style="font-size:12.5px">' + o[3] + '</div></button>').join('') + '</div>' +
        '<div class="field mt-2 hidden" id="pWrap"><label for="pAmt">Principal to repay (VND)</label><input class="input" id="pAmt" inputmode="numeric" placeholder="Min 5,000,000"><div class="hint" id="pFee"></div></div>' +
        '<div class="field mt-2"><label for="pSrc">Pay from</label><select class="select" id="pSrc">' + FB.accountOptions('acc1') + '</select></div>',
      actions: [{ label: 'Cancel' }, { label: 'Continue', keepOpen: true, onClick: (api, btn) => {
        const src = $('#pSrc', api.el).value; let principal, interest = 0, charge, type;
        if (mode === 'inst') { principal = next.principal; interest = next.interest; charge = next.pay; type = 'Instalment #' + next.i; }
        else if (mode === 'part') {
          const inp = $('#pAmt', api.el), v = FB.parseAmount(inp.value);
          if (!FB.field(inp, { required: 'Enter an amount.', min: 5000000, custom: () => (v >= l.outstanding ? 'Use “Settle loan in full” to close the loan.' : '') })) return false;
          principal = v; charge = v + Math.round(v * EARLY_FEE); type = 'Partial early repayment';
        } else { principal = l.outstanding; charge = l.outstanding + fee; type = 'Early settlement'; }
        const err = FB.checkFunds(src, charge);
        if (err) { FB.toast(err, 'error', 'Cannot pay'); return false; }
        FB.otp({ title: 'Confirm loan repayment', onSuccess: () => FB.busy(btn, 900, () => {
          const tx = FB.addTx({ desc: 'Loan repayment — ' + l.id + ' (' + type + ')', cat: 'bills', type: 'out', amount: charge, acc: src, channel: 'Loan Payment', counterparty: 'FinBank Loans', notify: false });
          l.outstanding = Math.max(0, l.outstanding - principal);
          if (mode === 'inst') { l.paid++; l.nextDue = isoD(addM(l.nextDue, 1)); }
          l.payments.push({ date: today(), type, amount: charge, principal, interest, ref: tx.id });
          if (mode === 'part') l.term = l.paid + projection(l).length;
          if (l.outstanding <= 0) { l.status = 'Closed'; l.outstanding = 0; l.term = l.paid; }
          FB.save(); FB.notify('money', 'Loan repayment received', fmt.vnd(charge) + ' paid towards ' + l.id + '.');
          api.close(); schedPage = null; histPage = 1; renderMine();
          FB.receipt({ title: l.status === 'Closed' ? 'Loan fully repaid' : 'Repayment successful', amount: charge, ref: tx.id, rows: [['Reference', tx.id], ['Loan', l.id], ['Payment type', type], ['Paid from', FB.accLabel(FB.acc(src))], ['Outstanding after', fmt.vnd(l.outstanding)]] });
        }) });
        return false;
      } }]
    });
    FB.amountInput($('#pAmt', m.el));
    $('#pAmt', m.el).addEventListener('input', () => { const v = FB.parseAmount($('#pAmt', m.el).value); $('#pFee', m.el).textContent = v ? 'Fee ' + fmt.vnd(Math.round(v * EARLY_FEE)) + ' · total charged ' + fmt.vnd(v + Math.round(v * EARLY_FEE)) : ''; });
    $$('[data-mode]', m.el).forEach((b) => (b.onclick = () => {
      mode = b.dataset.mode; $$('[data-mode]', m.el).forEach((x) => x.classList.toggle('selected', x === b));
      $('#pWrap', m.el).classList.toggle('hidden', mode !== 'part'); if (mode === 'part') $('#pAmt', m.el).focus();
    }));
  }

  /* ---------- Init ---------- */
  renderProducts(); setApplyProduct('l1'); calc();
  $('#mine').innerHTML = '<div class="card"><div class="skeleton sk-box"></div><div class="skeleton sk-line"></div></div>';
  $('#apps').innerHTML = '<div class="card"><div class="skeleton sk-box"></div></div>';
  setTimeout(() => { renderMine(); renderApps(); }, 450);
})();
