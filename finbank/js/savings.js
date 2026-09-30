/* FinBank — Savings page */
(function () {
  const { $, $$, esc, fmt } = FB;
  const NON_TERM_RATE = 0.5;
  const RENEWALS = [
    ['Pay out at maturity', 'Principal and interest are paid to your account.'],
    ['Renew principal only', 'Principal renews for the same term; interest is paid out.'],
    ['Renew principal + interest', 'Principal and interest renew together (compound growth).']
  ];
  const day = 864e5;
  const daysBetween = (a, b) => Math.round((FB.parseDate(b) - FB.parseDate(a)) / day);
  const daysLeft = (d) => Math.ceil((FB.parseDate(d.maturity) - Date.now()) / day);
  const addMonths = (date, n) => { const d = new Date(date); d.setMonth(d.getMonth() + n); return d; };
  const isoDate = (d) => fmt.iso(d).slice(0, 10);
  const interest = (p, rate, days) => Math.round((p * rate / 100 * days) / 365);
  const termLabel = (m) => (m ? m + (m === 1 ? ' month' : ' months') : 'No fixed term');
  const productByTerm = (t) => FB.db.savingsProducts.find((p) => p.term === t);
  const productByName = (n) => FB.db.savingsProducts.find((p) => p.name === n);

  const depStatus = (d) => (d.status === 'Closed' ? 'Closed' : d.maturity && daysLeft(d) <= 7 ? 'Maturing soon' : 'Active');
  const statusBadge = (s) => '<span class="badge ' + (s === 'Active' ? 'success' : s === 'Maturing soon' ? 'warn' : '') + '">' + s + '</span>';

  let ready = false;
  const showTab = FB.tabs(document, (id) => { if (!ready) return; if (id === 'calc') calc(); if (id === 'open') updateSummary(); });

  /* ---------- Overview ---------- */
  function renderOverview() {
    const active = FB.db.deposits.filter((d) => d.status !== 'Closed');
    const total = active.reduce((s, d) => s + d.amount, 0);
    const est = active.reduce((s, d) => s + (d.maturity ? interest(d.amount, d.rate, daysBetween(d.opened, d.maturity)) : 0), 0);
    const next = active.filter((d) => d.maturity).sort((a, b) => a.maturity.localeCompare(b.maturity))[0];
    $('#sumStats').innerHTML =
      '<div class="card stat"><span class="lbl">🏦 Total deposits</span><span class="val">' + fmt.vnd(total) + '</span><span class="delta muted">' + active.length + ' active</span></div>' +
      '<div class="card stat"><span class="lbl">📈 Estimated interest at maturity</span><span class="val pos">+' + fmt.vnd(est) + '</span></div>' +
      '<div class="card stat"><span class="lbl">📅 Next maturity</span><span class="val">' + (next ? fmt.date(next.maturity) : '—') + '</span><span class="delta muted">' + (next ? 'In ' + Math.max(0, daysLeft(next)) + ' days · ' + esc(next.product) : 'No upcoming maturities') + '</span></div>';

    const list = FB.db.deposits.slice().sort((a, b) => (a.status === 'Closed') - (b.status === 'Closed'));
    $('#deposits').innerHTML = list.length ? list.map((d) => {
      const st = depStatus(d), closed = st === 'Closed', term = d.maturity;
      const total = term ? daysBetween(d.opened, d.maturity) : 0, elapsed = Math.max(0, daysBetween(d.opened, isoDate(new Date()))), held = term ? Math.min(total, elapsed) : elapsed;
      const pct = term ? Math.min(100, (held / total) * 100) : 0;
      const estI = term ? interest(d.amount, d.rate, total) : interest(d.amount, d.rate, Math.max(1, held));
      return '<div class="card" style="' + (closed ? 'opacity:.7' : '') + '"><div class="card-head" style="margin-bottom:8px"><div><h3>' + esc(d.product) + '</h3><small class="muted">' + esc(d.id.toUpperCase()) + ' · ' + d.rate + '% per year</small></div>' + statusBadge(st) + '</div>' +
        '<div style="font-size:24px;font-weight:800">' + fmt.vnd(d.amount) + '</div>' +
        (term ? '<div class="progress mt-1"><i style="width:' + pct + '%"></i></div>' : '') +
        '<dl class="kv mt-1" style="grid-template-columns:130px 1fr;gap:6px 12px;font-size:13.5px">' +
        '<dt>Opened</dt><dd>' + fmt.date(d.opened) + '</dd>' +
        '<dt>Maturity</dt><dd>' + (term ? fmt.date(d.maturity) + (closed ? '' : ' · ' + Math.max(0, daysLeft(d)) + ' days left') : 'Flexible — no maturity') + '</dd>' +
        '<dt>' + (term ? 'Interest at maturity' : 'Accrued interest') + '</dt><dd class="pos">+' + fmt.vnd(estI) + '</dd>' +
        '<dt>At maturity</dt><dd>' + esc(term ? d.renewal : 'Not applicable') + '</dd>' +
        (closed && d.closedOn ? '<dt>Closed on</dt><dd>' + fmt.date(d.closedOn) + '</dd>' : '') + '</dl>' +
        (closed ? '' : '<div class="flex gap-1 wrap mt-2">' + (term ? '<button class="btn btn-outline btn-sm" data-renew="' + d.id + '">Change renewal</button>' : '') + '<button class="btn btn-outline btn-sm" data-withdraw="' + d.id + '" style="color:var(--danger)">' + (term ? 'Withdraw early' : 'Withdraw') + '</button></div>') + '</div>';
    }).join('') : '<div style="grid-column:1/-1">' + FB.empty('🏦', 'No deposits yet', 'Open your first deposit to start earning interest.') + '</div>';
    $$('[data-renew]').forEach((b) => (b.onclick = () => renewModal(b.dataset.renew)));
    $$('[data-withdraw]').forEach((b) => (b.onclick = () => withdrawModal(b.dataset.withdraw)));
    renderGoals();
  }

  function renewModal(id) {
    const d = FB.db.deposits.find((x) => x.id === id); let val = d.renewal;
    const m = FB.modal({
      title: 'Change renewal setting',
      body: '<p class="text-2 mb-2">' + esc(d.product) + ' · ' + fmt.vnd(d.amount) + ' · matures ' + fmt.date(d.maturity) + '</p><div class="grid" style="gap:10px">' +
        RENEWALS.map((r) => '<button type="button" class="selectable' + (r[0] === val ? ' selected' : '') + '" data-r="' + r[0] + '"><b>' + r[0] + '</b><div class="muted" style="font-size:13px">' + r[1] + '</div></button>').join('') + '</div>',
      actions: [{ label: 'Cancel' }, { label: 'Save', keepOpen: true, onClick: (api) => {
        if (val === d.renewal) { FB.toast('No changes to save.', 'info'); return false; }
        d.renewal = val; FB.save(); api.close(); renderOverview(); FB.toast('Renewal setting updated.', 'success');
        return false;
      } }]
    });
    $$('[data-r]', m.el).forEach((b) => (b.onclick = () => { val = b.dataset.r; $$('[data-r]', m.el).forEach((x) => x.classList.toggle('selected', x === b)); }));
  }

  function withdrawModal(id) {
    const d = FB.db.deposits.find((x) => x.id === id), term = !!d.maturity;
    const held = Math.max(1, daysBetween(d.opened, isoDate(new Date())));
    const rate = term ? NON_TERM_RATE : d.rate, int = interest(d.amount, rate, held);
    const forgone = term ? interest(d.amount, d.rate, daysBetween(d.opened, d.maturity)) - int : 0;
    const m = FB.modal({
      title: term ? 'Early withdrawal' : 'Withdraw deposit',
      body: (term ? '<div class="alert warn mb-2"><span>⚠️</span><div>Withdrawing before <b>' + fmt.date(d.maturity) + '</b> reduces interest to the non-term rate of ' + NON_TERM_RATE + '%/year. You would forgo about <b>' + fmt.vnd(forgone) + '</b>.</div></div>' : '') +
        '<div class="receipt">' + [['Deposit', d.product], ['Principal', fmt.vnd(d.amount)], ['Days held', held + ' days'], ['Interest (' + rate + '%/yr)', fmt.vnd(int)]].map((r) => '<div class="r-row"><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>').join('') +
        '<div class="r-row r-total"><span>You receive</span><span>' + fmt.vnd(d.amount + int) + '</span></div></div>' +
        '<div class="field mt-2"><label for="wDest">Receive into</label><select class="select" id="wDest">' + FB.accountOptions('acc1') + '</select></div>',
      actions: [{ label: 'Keep deposit' }, { label: 'Withdraw', class: 'btn-danger', keepOpen: true, onClick: (api, btn) => {
        const dest = $('#wDest', api.el).value;
        FB.confirm({ title: 'Confirm withdrawal', danger: true, message: 'Close ' + d.product + ' and receive ' + fmt.vnd(d.amount + int) + '? This cannot be undone.', confirmLabel: 'Continue', onConfirm: () => {
          FB.otp({ title: 'Confirm withdrawal', onSuccess: () => FB.busy(btn, 800, () => {
            d.status = 'Closed'; d.closedOn = isoDate(new Date());
            const tx = FB.addTx({ desc: (term ? 'Early withdrawal — ' : 'Withdrawal — ') + d.product, cat: 'transfer', type: 'in', amount: d.amount + int, acc: dest, channel: 'Internal', counterparty: 'FinBank Savings' });
            api.close(); renderOverview();
            FB.receipt({ title: 'Withdrawal successful', amount: d.amount + int, ref: tx.id, rows: [['Reference', tx.id], ['Principal', fmt.vnd(d.amount)], ['Interest', fmt.vnd(int)], ['Credited to', FB.accLabel(FB.acc(dest))]] });
          }) });
        } });
        return false;
      } }]
    });
    return m;
  }

  /* ---------- Goals ---------- */
  function renderGoals() {
    const goals = FB.db.goals;
    $('#goals').innerHTML = goals.length ? goals.map((g) => {
      const pct = Math.min(100, (g.saved / g.target) * 100), done = g.saved >= g.target;
      const monthsLeft = Math.max(1, Math.ceil((FB.parseDate(g.deadline) - Date.now()) / (day * 30.4)));
      const need = Math.max(0, Math.ceil((g.target - g.saved) / monthsLeft));
      return '<div class="card"><div class="flex between items-center"><div class="flex items-center gap-1"><span class="row-icon">' + g.icon + '</span><div><b>' + esc(g.name) + '</b><div class="muted" style="font-size:12.5px">Target date ' + fmt.date(g.deadline) + '</div></div></div><b>' + Math.round(pct) + '%</b></div>' +
        '<div class="progress mt-2 ' + (done ? 'ok' : '') + '"><i style="width:' + pct + '%"></i></div>' +
        '<div class="flex between mt-1" style="font-size:13px"><span>' + fmt.vnd(g.saved) + '</span><span class="muted">of ' + fmt.vnd(g.target) + '</span></div>' +
        '<div class="muted mt-1" style="font-size:12.5px">' + (done ? '🎉 Goal reached!' : 'Save ~' + fmt.vnd(need) + '/month to hit your target.') + '</div>' +
        '<button class="btn btn-outline btn-sm mt-2" data-topup="' + g.id + '">＋ Add money</button></div>';
    }).join('') : '<div style="grid-column:1/-1">' + FB.empty('🎯', 'No goals yet', 'Create a goal and track your progress.') + '</div>';
    $$('[data-topup]').forEach((b) => (b.onclick = () => topupModal(b.dataset.topup)));
  }

  function topupModal(id) {
    const g = FB.db.goals.find((x) => x.id === id);
    FB.modal({
      title: 'Add money to goal',
      body: '<p class="text-2 mb-2">' + g.icon + ' <b>' + esc(g.name) + '</b> — ' + fmt.vnd(g.saved) + ' of ' + fmt.vnd(g.target) + '</p>' +
        '<div class="field"><label for="tAmt">Amount (VND)</label><input class="input" id="tAmt" inputmode="numeric" placeholder="e.g. 2,000,000" autocomplete="off"></div>' +
        '<div class="field"><label for="tSrc">From account</label><select class="select" id="tSrc">' + FB.accountOptions('acc1') + '</select></div>',
      actions: [{ label: 'Cancel' }, { label: 'Add money', keepOpen: true, onClick: (api, btn) => {
        const inp = $('#tAmt', api.el), amt = FB.parseAmount(inp.value), src = $('#tSrc', api.el).value;
        if (!FB.field(inp, { required: 'Enter an amount.', min: 10000, custom: () => FB.checkFunds(src, amt) })) return false;
        const go = () => FB.busy(btn, 700, () => {
          g.saved += amt; FB.addTx({ desc: 'Savings goal top-up — ' + g.name, cat: 'transfer', type: 'out', amount: amt, acc: src, channel: 'Internal', counterparty: 'Savings goal' });
          FB.save(); api.close(); renderOverview();
          FB.toast(g.saved >= g.target ? 'Congratulations, you reached "' + g.name + '"!' : fmt.vnd(amt) + ' added to "' + g.name + '".', 'success');
        });
        if (amt > 10000000) FB.otp({ title: 'Confirm top-up', onSuccess: go }); else go();
        return false;
      } }]
    });
  }

  $('#newGoal').onclick = () => {
    FB.modal({
      title: 'Create savings goal',
      body: '<div class="field"><label for="gName">Goal name</label><input class="input" id="gName" maxlength="40" placeholder="e.g. New motorbike"></div>' +
        '<div class="row2"><div class="field"><label for="gIcon">Icon</label><select class="select" id="gIcon">' + ['🎯', '✈️', '🏡', '🚗', '💻', '🎓', '💍', '🛟'].map((i) => '<option>' + i + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="gDate">Target date</label><input class="input" type="date" id="gDate"></div></div>' +
        '<div class="field"><label for="gTarget">Target amount (VND)</label><input class="input" id="gTarget" inputmode="numeric" placeholder="e.g. 30,000,000"></div>' +
        '<div class="field"><label for="gInit">Starting amount (optional)</label><input class="input" id="gInit" inputmode="numeric" placeholder="0"><div class="hint">Taken from your Current Account.</div></div>',
      actions: [{ label: 'Cancel' }, { label: 'Create goal', keepOpen: true, onClick: (api) => {
        const n = $('#gName', api.el), t = $('#gTarget', api.el), dt = $('#gDate', api.el), i = $('#gInit', api.el), init = FB.parseAmount(i.value);
        const ok = [
          FB.field(n, { required: 'Give your goal a name.', custom: (v) => (v.length < 3 ? 'Name is too short.' : '') }),
          FB.field(t, { required: 'Enter a target amount.', min: 100000 }),
          FB.field(dt, { required: 'Choose a target date.', custom: (v) => (v <= isoDate(new Date()) ? 'Target date must be in the future.' : '') }),
          FB.field(i, { custom: () => (init > FB.parseAmount(t.value) ? 'Starting amount cannot exceed the target.' : init ? FB.checkFunds('acc1', init) : '') })
        ];
        if (ok.includes(false)) return false;
        FB.db.goals.push({ id: 'g' + Date.now(), name: n.value.trim(), icon: $('#gIcon', api.el).value, target: FB.parseAmount(t.value), saved: init, deadline: dt.value });
        if (init) FB.addTx({ desc: 'Savings goal top-up — ' + n.value.trim(), cat: 'transfer', type: 'out', amount: init, acc: 'acc1', channel: 'Internal', counterparty: 'Savings goal', notify: false });
        FB.save(); api.close(); renderOverview(); FB.toast('Goal created.', 'success');
        return false;
      } }]
    });
    ['gTarget', 'gInit'].forEach((id) => FB.amountInput($('#' + id)));
  };

  /* ---------- Products ---------- */
  function renderProducts() {
    $('#products').innerHTML = FB.db.savingsProducts.map((p) =>
      '<div class="card"><div class="flex between items-center"><b>' + esc(p.name) + '</b><span class="badge primary">' + esc(p.label) + '</span></div>' +
      '<div style="font-size:34px;font-weight:800;margin:10px 0 2px;color:var(--primary)">' + p.rate.toFixed(1) + '<small style="font-size:16px">%/yr</small></div>' +
      '<p class="text-2" style="min-height:42px">' + esc(p.desc) + '</p>' +
      '<dl class="kv mt-1" style="grid-template-columns:110px 1fr;gap:6px 10px;font-size:13.5px"><dt>Minimum</dt><dd>' + fmt.vnd(p.min) + '</dd><dt>Term</dt><dd>' + esc(p.label) + '</dd><dt>Early withdrawal</dt><dd>' + esc(p.earlyPenalty) + '</dd></dl>' +
      '<button class="btn btn-block mt-2" data-pick="' + p.id + '">Open this deposit</button></div>').join('');
    $$('[data-pick]').forEach((b) => (b.onclick = () => { pickProduct(b.dataset.pick); showTab('open'); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
  }

  /* ---------- Open deposit ---------- */
  const oProd = $('#oProd'), oTerm = $('#oTerm'), oAmt = $('#oAmt');
  oProd.innerHTML = FB.db.savingsProducts.map((p) => '<option value="' + p.id + '">' + esc(p.name) + ' — ' + p.rate.toFixed(1) + '%/yr</option>').join('');
  oTerm.innerHTML = FB.db.savingsProducts.map((p) => '<option value="' + p.id + '">' + termLabel(p.term) + '</option>').join('');
  $('#oSrc').innerHTML = FB.accountOptions('acc1');
  FB.amountInput(oAmt);
  const curProduct = () => FB.db.savingsProducts.find((p) => p.id === oProd.value);
  function pickProduct(id) { oProd.value = id; oTerm.value = id; updateSummary(); }

  function calcOpen() {
    const p = curProduct(), amt = FB.parseAmount(oAmt.value), opened = new Date();
    const mat = p.term ? addMonths(opened, p.term) : null, days = mat ? Math.round((mat - opened) / day) : 365;
    return { p, amt, opened, mat, days, int: interest(amt, p.rate, days) };
  }

  function updateSummary() {
    const c = calcOpen(), p = c.p;
    $('#oMin').textContent = 'Minimum for this product: ' + fmt.vnd(p.min) + '.';
    $('#oRenew').disabled = !p.term;
    if (!p.term) $('#oRenew').value = 'Pay out at maturity';
    $('#oSummary').innerHTML = '<div class="card-head"><h3>Deposit summary</h3></div>' +
      '<div class="receipt">' + [['Product', p.name], ['Interest rate', p.rate.toFixed(1) + '% per year'], ['Term', termLabel(p.term)], ['Deposit amount', c.amt ? fmt.vnd(c.amt) : '—'], ['Start date', fmt.date(c.opened)], ['Maturity date', c.mat ? fmt.date(c.mat) : 'Anytime'], [p.term ? 'Interest at maturity' : 'Interest per year (est.)', c.amt ? '+' + fmt.vnd(c.int) : '—']].map((r) => '<div class="r-row"><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>').join('') +
      '<div class="r-row r-total"><span>' + (p.term ? 'Total at maturity' : 'Balance after 1 year') + '</span><span>' + (c.amt ? fmt.vnd(c.amt + c.int) : '—') + '</span></div></div>' +
      '<p class="muted mt-1" style="font-size:12.5px">Interest = principal × rate × days / 365' + (p.term ? ' (' + c.days + ' days).' : '.') + ' Estimates only.</p>';
  }
  oProd.onchange = () => { oTerm.value = oProd.value; updateSummary(); };
  oTerm.onchange = () => { oProd.value = oTerm.value; updateSummary(); };
  oAmt.oninput = () => { updateSummary(); };
  $('#quickOpen').onclick = () => showTab('open');

  $('#openForm').onsubmit = (e) => {
    e.preventDefault();
    const c = calcOpen(), src = $('#oSrc').value;
    const okAmt = FB.field(oAmt, { required: 'Enter the deposit amount.', min: c.p.min, custom: () => FB.checkFunds(src, c.amt) });
    const okT = $('#oTerms').checked; $('#oTermsErr').textContent = okT ? '' : 'Please accept the terms to continue.';
    if (!okAmt || !okT) return;
    const btn = $('#oSubmit');
    FB.otp({ title: 'Confirm new deposit', onSuccess: () => FB.busy(btn, 900, () => {
      const dep = { id: 'd' + Date.now(), product: c.p.name, amount: c.amt, rate: c.p.rate, opened: isoDate(c.opened), maturity: c.mat ? isoDate(c.mat) : '', renewal: c.p.term ? $('#oRenew').value : 'Pay out at maturity', status: 'Active' };
      FB.db.deposits.unshift(dep);
      const tx = FB.addTx({ desc: 'Open deposit — ' + c.p.name, cat: 'transfer', type: 'out', amount: c.amt, acc: src, channel: 'Internal', counterparty: 'FinBank Savings' });
      FB.save(); renderOverview();
      oAmt.value = ''; $('#oTerms').checked = false; updateSummary();
      FB.receipt({ title: 'Deposit opened', amount: c.amt, ref: tx.id, rows: [['Reference', tx.id], ['Product', c.p.name], ['Rate', c.p.rate.toFixed(1) + '%/yr'], ['Maturity', c.mat ? fmt.date(c.mat) : 'Anytime'], ['Funded from', FB.accLabel(FB.acc(src))]], onDone: () => showTab('overview') });
    }) });
  };

  /* ---------- Calculator ---------- */
  const cSrc = $('#cRateSrc');
  cSrc.innerHTML = '<option value="auto">Standard rate for the term</option>' + FB.db.savingsProducts.filter((p) => p.term).map((p) => '<option value="' + p.id + '">' + esc(p.name) + ' — ' + p.rate.toFixed(1) + '%</option>').join('') + '<option value="custom">Custom rate…</option>';
  FB.amountInput($('#cPrin'));

  function rateFor(months) {
    if (cSrc.value === 'auto') return (productByTerm(months) || { rate: 0 }).rate;
    if (cSrc.value === 'custom') return parseFloat($('#cCustom').value) || 0;
    return FB.db.savingsProducts.find((p) => p.id === cSrc.value).rate;
  }
  const simple = (P, r, m) => Math.round(P * (r / 100) * Math.round(m * 30.4) / 365);
  const compound = (P, r, m) => Math.round(P * Math.pow(1 + r / 1200, m) - P);

  function calc() {
    $('#cCustomWrap').classList.toggle('hidden', cSrc.value !== 'custom');
    const P = FB.parseAmount($('#cPrin').value), m = +$('#cTerm').value, r = rateFor(m), res = $('#cResult');
    const custom = $('#cCustom');
    let bad = '';
    if (cSrc.value === 'custom' && (!(r > 0) || r > 20)) bad = 'Enter a rate between 0.1% and 20%.';
    FB.field(custom, { custom: () => bad });
    if (P < 1000000) { res.innerHTML = '<div class="alert warn"><span>⚠️</span><div>Enter a principal of at least 1,000,000 VND.</div></div>'; drawChart(0); return; }
    if (bad) { res.innerHTML = ''; drawChart(0); return; }
    const si = simple(P, r, m), ci = compound(P, r, m), days = Math.round(m * 30.4);
    res.innerHTML = '<div class="receipt">' + [['Rate applied', r.toFixed(1) + '% per year'], ['Days (' + m + ' × 30.4)', days + ' days'], ['Simple interest', '+' + fmt.vnd(si)], ['Maturity amount', fmt.vnd(P + si)], ['Monthly compounding interest', '+' + fmt.vnd(ci)], ['Maturity with compounding', fmt.vnd(P + ci)]].map((x) => '<div class="r-row"><span>' + x[0] + '</span><span>' + esc(x[1]) + '</span></div>').join('') +
      '<div class="r-row r-total"><span>Extra from compounding</span><span class="pos">+' + fmt.vnd(ci - si) + '</span></div></div>' +
      '<p class="muted mt-1" style="font-size:12.5px">Simple interest = P × rate × days / 365. Compounding assumes interest is added to principal every month.</p>';
    drawChart(P);
  }
  function drawChart(P) {
    const terms = [1, 3, 6, 12, 24], el = $('#cChart');
    if (!P) { el.innerHTML = FB.empty('📊', 'Enter a principal to compare terms'); return; }
    FB.chart.bar({ el, title: 'Interest by term', labels: terms.map((t) => t + 'M'), height: 280, fmt: FB.fmt.short,
      series: [{ name: 'Simple interest', color: 'var(--primary)', data: terms.map((t) => simple(P, rateFor(t), t)) }, { name: 'Monthly compounding', color: 'var(--accent)', data: terms.map((t) => compound(P, rateFor(t), t)) }] });
  }
  ['cPrin', 'cTerm', 'cRateSrc', 'cCustom'].forEach((id) => { $('#' + id).addEventListener('input', calc); $('#' + id).addEventListener('change', calc); });

  /* ---------- Init ---------- */
  renderProducts(); updateSummary(); calc();
  $('#deposits').innerHTML = '<div class="card" style="grid-column:1/-1"><div class="skeleton sk-box"></div></div>';
  $('#sumStats').innerHTML = '<div class="card"><div class="skeleton sk-line"></div></div>'.repeat(3);
  ready = true;
  setTimeout(renderOverview, 450);
  if (location.hash === '#open') showTab('open');
})();
