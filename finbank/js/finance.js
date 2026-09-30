/* FinBank — Personal Finance */
(function () {
  const db = FB.db, $ = FB.$, $$ = FB.$$, f = FB.fmt, esc = FB.esc;
  const TODAY = FB.parseDate('2026-09-30');
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const pctOf = (a, b) => (b ? (a / b) * 100 : 0);
  db.fraud = db.fraud || { status: 'open', amount: 15900000, merchant: 'GLOBALMART PTE LTD — Singapore', time: '2026-09-29 23:41' };

  /* ---------- Overview ---------- */
  const RULES = {
    food: ['grabfood', 'shopeefood', 'baemin', 'highlands', 'coffee', 'cafe', 'phuc long', 'circle k', 'lotteria', 'kfc', 'pho ', 'bun bo', 'restaurant', 'pizza', 'bbq', 'milk tea', 'the coffee house', 'starbucks'],
    transport: ['grab ride', 'grabbike', 'grabcar', 'grab', 'be ride', 'gojek', 'xanh sm', 'petrolimex', 'xang', 'taxi', 'vinasun', 'parking', 'bus '],
    shopping: ['shopee', 'lazada', 'tiki', 'winmart', 'vinmart', 'bach hoa xanh', 'uniqlo', 'zara', 'aeon', 'coopmart', 'big c', 'mall'],
    bills: ['evn', 'electric', 'sawaco', 'water', 'fpt', 'viettel', 'vinaphone', 'mobifone', 'internet', 'top-up', 'topup', 'vtvcab'],
    entertainment: ['netflix', 'spotify', 'cgv', 'lotte cinema', 'youtube', 'steam', 'karaoke', 'disney'],
    health: ['pharmacity', 'long chau', 'hospital', 'clinic', 'pharmacy', 'dental', 'gym', 'medic'],
    education: ['udemy', 'coursera', 'tuition', 'school', 'university', 'ielts', 'book'],
    travel: ['vietjet', 'vietnam airlines', 'bamboo', 'agoda', 'booking.com', 'traveloka', 'hotel', 'resort', 'airbnb'],
    housing: ['rent', 'apartment', 'landlord', 'mortgage', 'management fee']
  };
  const categorize = (text) => {
    const t = ' ' + text.toLowerCase() + ' '; let best = null, len = 0;
    Object.keys(RULES).forEach((cat) => RULES[cat].forEach((k) => { if (t.includes(k) && k.length > len) { best = cat; len = k.length; } }));
    return best ? { cat: best, kw: RULES[best].find((k) => k.length === len && t.includes(k)).trim() } : null;
  };

  function renderOverview() {
    const el = $('#pOverview');
    FB.skeleton(el, () => {
      const inc = sum(db.income), exp = sum(db.expenses), rate = pctOf(inc - exp, inc), daily = db.expenses[11] / 30;
      const mi = db.income[11], me = db.expenses[11];
      el.innerHTML =
        '<div class="grid g4 keep2 mb-2">' +
        stat('Total income (12 mo)', f.vnd(inc), '▲ ' + f.pct(pctOf(mi - db.income[10], db.income[10])) + ' vs Aug', 'pos') +
        stat('Total expenses (12 mo)', f.vnd(exp), '▼ ' + f.pct(Math.abs(pctOf(me - db.expenses[10], db.expenses[10]))) + ' vs Aug', 'pos') +
        stat('Savings rate', f.pct(rate), rate >= 20 ? 'Healthy — above 20% target' : 'Below the 20% target', rate >= 20 ? 'pos' : 'neg') +
        stat('Avg. daily spend', f.vnd(daily), 'Based on September', 'muted') + '</div>' +
        '<div class="grid g-main"><div class="card"><div class="card-head"><h3>Income vs expenses</h3><span class="badge">Last 12 months</span></div><div id="chIE"></div></div>' +
        '<div class="card"><div class="card-head"><h3>Spending by category</h3><span class="badge">September</span></div><div id="chDonut"></div></div></div>' +
        '<div class="grid g-main mt-2"><div class="card"><div class="card-head"><h3>Spending trend</h3></div><div id="chTrend"></div></div>' +
        '<div class="card"><div class="card-head"><h3>Auto-categorise an expense</h3><span class="badge primary">AI demo</span></div>' +
        '<p class="text-2 mb-2" style="font-size:13px">Type a merchant or description, e.g. <a href="#" data-ex="GrabFood">GrabFood</a>, <a href="#" data-ex="EVN electricity">EVN electricity</a>, <a href="#" data-ex="Netflix">Netflix</a>.</p>' +
        '<div class="field"><label for="catDesc">Description</label><input class="input" id="catDesc" placeholder="Merchant or description" maxlength="80" autocomplete="off"></div>' +
        '<div id="catOut" class="alert mb-2" style="min-height:52px"><span>Suggested category will appear here.</span></div>' +
        '<div class="field"><label for="catAmt">Amount (VND)</label><input class="input" id="catAmt" inputmode="numeric" placeholder="0"></div>' +
        '<button class="btn btn-block" id="catAdd" disabled>Add as expense</button></div></div>';
      FB.chart.bar({ el: $('#chIE'), title: 'Income vs expenses', labels: db.months, series: [{ name: 'Income', data: db.income, color: 'var(--accent)' }, { name: 'Expenses', data: db.expenses, color: 'var(--danger)' }] });
      FB.chart.line({ el: $('#chTrend'), title: 'Spending trend', height: 220, labels: db.months, series: [{ name: 'Expenses', data: db.expenses, color: 'var(--primary)' }] });
      FB.chart.donut({ el: $('#chDonut'), title: 'Spending by category', items: db.spendingByCategory.map((s) => ({ label: FB.cat(s.cat).name, value: s.amount, color: FB.cat(s.cat).color })), center: { title: 'Total', value: f.short(sum(db.spendingByCategory.map((s) => s.amount))) } });
      bindCategorizer();
    }, 450);
  }
  const stat = (l, v, d, c) => '<div class="card stat"><span class="lbl">' + l + '</span><span class="val">' + v + '</span><span class="delta ' + c + '">' + d + '</span></div>';

  function bindCategorizer() {
    const d = $('#catDesc'), a = $('#catAmt'), out = $('#catOut'), btn = $('#catAdd'); let cur = null;
    FB.amountInput(a);
    const run = () => {
      const v = d.value.trim(); cur = v ? categorize(v) : null;
      if (!v) { out.className = 'alert mb-2'; out.innerHTML = '<span>Suggested category will appear here.</span>'; }
      else if (cur) { const c = FB.cat(cur.cat); out.className = 'alert success mb-2'; out.innerHTML = '<span style="font-size:22px">' + c.icon + '</span><div><b>' + esc(c.name) + '</b><br><small class="text-2">Matched keyword “' + esc(cur.kw) + '”</small></div>'; }
      else { out.className = 'alert warn mb-2'; out.innerHTML = '<span>❔</span><div><b>Other</b><br><small class="text-2">No rule matched — it will be saved as “Other”.</small></div>'; }
      btn.disabled = !v;
    };
    d.addEventListener('input', run);
    $$('[data-ex]', $('#pOverview')).forEach((x) => (x.onclick = (e) => { e.preventDefault(); d.value = x.dataset.ex; run(); a.focus(); }));
    btn.onclick = () => {
      const ok1 = FB.field(d, { required: 'Enter a description.' }), ok2 = FB.field(a, { required: 'Enter an amount.', min: 1000 });
      if (!ok1 || !ok2) return;
      const amount = FB.parseAmount(a.value), cat = cur ? cur.cat : 'other', err = FB.checkFunds('acc1', amount);
      if (err) { FB.field(a, { custom: () => err }); return; }
      FB.confirm({ title: 'Add expense', message: 'Record ' + f.vnd(amount) + ' for “' + d.value.trim() + '” under ' + FB.cat(cat).name + '?', confirmLabel: 'Add expense', onConfirm: () => FB.busy(btn, 700, () => {
        FB.addTx({ desc: d.value.trim(), cat, type: 'out', amount, acc: 'acc1', channel: 'Manual', counterparty: d.value.trim() });
        const b = db.budgets.find((x) => x.cat === cat); if (b) b.spent += amount;
        const sp = db.spendingByCategory.find((x) => x.cat === cat); if (sp) sp.amount += amount; else db.spendingByCategory.push({ cat, amount });
        FB.save(); d.value = ''; a.value = ''; run(); FB.toast('Expense of ' + f.vnd(amount) + ' added to ' + FB.cat(cat).name + '.', 'success'); renderBudget(); renderOverview(); renderInsights();
      }) });
    };
  }

  /* ---------- Budget ---------- */
  function renderBudget() {
    const el = $('#pBudget'), bs = db.budgets, tl = sum(bs.map((b) => b.limit)), ts = sum(bs.map((b) => b.spent));
    const over = bs.filter((b) => b.spent > b.limit), near = bs.filter((b) => b.spent >= b.limit * 0.9 && b.spent <= b.limit);
    el.innerHTML =
      '<div class="grid g-main"><div>' +
      (over.length ? '<div class="alert danger mb-2" role="alert"><span>🚨</span><div><b>' + over.length + ' budget' + (over.length > 1 ? 's' : '') + ' exceeded</b><br>' + over.map((b) => esc(FB.cat(b.cat).name) + ' (+' + f.vnd(b.spent - b.limit) + ')').join(', ') + '</div></div>' : '') +
      (near.length ? '<div class="alert warn mb-2" role="alert"><span>⚠️</span><div><b>' + near.length + ' budget' + (near.length > 1 ? 's' : '') + ' close to the limit</b><br>' + near.map((b) => esc(FB.cat(b.cat).name) + ' (' + Math.round(pctOf(b.spent, b.limit)) + '%)').join(', ') + '</div></div>' : '') +
      '<div class="card"><div class="card-head"><h3>Category budgets — September</h3><button class="btn btn-sm" id="addBudget">+ Add budget</button></div>' +
      (bs.length ? '<div class="list">' + bs.map((b) => {
        const c = FB.cat(b.cat), p = pctOf(b.spent, b.limit), cls = p > 100 ? 'danger' : p >= 90 ? 'warn' : 'ok';
        return '<div class="row-item" style="align-items:flex-start"><div class="row-icon" style="background:' + c.color + '22">' + c.icon + '</div><div class="row-main"><div class="flex between items-center wrap gap-1"><b>' + esc(c.name) + '</b><span class="mono" style="font-size:13px">' + f.num(b.spent) + ' / ' + f.num(b.limit) + '</span></div>' +
          '<div class="progress ' + cls + '" style="margin:8px 0 6px" role="progressbar" aria-valuenow="' + Math.round(p) + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + Math.min(100, p) + '%"></i></div>' +
          '<div class="flex between items-center wrap gap-1"><small class="' + (cls === 'danger' ? 'neg' : 'muted') + '">' + (p > 100 ? 'Over by ' + f.vnd(b.spent - b.limit) + ' (' + Math.round(p) + '%)' : p >= 90 ? 'Only ' + f.vnd(b.limit - b.spent) + ' left (' + Math.round(p) + '%)' : f.vnd(b.limit - b.spent) + ' left (' + Math.round(p) + '%)') + '</small>' +
          '<span><button class="btn btn-ghost btn-sm" data-edit="' + b.cat + '">Edit</button><button class="btn btn-ghost btn-sm" data-del="' + b.cat + '" style="color:var(--danger)">Remove</button></span></div></div></div>';
      }).join('') + '</div>' : FB.empty('🎯', 'No budgets yet', 'Add a category budget to start tracking.')) + '</div></div>' +
      '<div class="card"><h3 class="mb-2">Summary</h3><div class="stat"><span class="lbl">Total budgeted</span><span class="val">' + f.vnd(tl) + '</span></div><div class="stat mt-2"><span class="lbl">Spent so far</span><span class="val">' + f.vnd(ts) + '</span></div>' +
      '<div class="progress ' + (ts > tl ? 'danger' : ts > tl * 0.9 ? 'warn' : 'ok') + ' mt-2"><i style="width:' + Math.min(100, pctOf(ts, tl)) + '%"></i></div><small class="muted">' + Math.round(pctOf(ts, tl)) + '% of total budget used</small>' +
      '<div class="alert mt-2"><span>💡</span><span>Budget alerts trigger at 90% (warning) and above 100% (over budget).</span></div></div></div>';
    $('#addBudget').onclick = () => budgetModal();
    $$('[data-edit]', el).forEach((b) => (b.onclick = () => budgetModal(b.dataset.edit)));
    $$('[data-del]', el).forEach((b) => (b.onclick = () => FB.confirm({ title: 'Remove budget', message: 'Remove the ' + FB.cat(b.dataset.del).name + ' budget? Your transactions are not affected.', confirmLabel: 'Remove', danger: true, onConfirm: () => { db.budgets = db.budgets.filter((x) => x.cat !== b.dataset.del); FB.save(); renderBudget(); renderInsights(); FB.toast('Budget removed.', 'success'); } })));
  }
  function budgetModal(cat) {
    const cur = cat && db.budgets.find((b) => b.cat === cat), free = db.categories.filter((c) => !['income', 'transfer'].includes(c.id) && !db.budgets.some((b) => b.cat === c.id));
    if (!cur && !free.length) { FB.toast('All categories already have a budget.', 'info'); return; }
    const m = FB.modal({
      title: cur ? 'Edit budget — ' + FB.cat(cat).name : 'Add budget',
      body: '<div class="field"><label for="bCat">Category</label><select class="select" id="bCat" ' + (cur ? 'disabled' : '') + '>' + (cur ? '<option>' + esc(FB.cat(cat).name) + '</option>' : free.map((c) => '<option value="' + c.id + '">' + c.icon + ' ' + esc(c.name) + '</option>').join('')) + '</select></div>' +
        '<div class="field"><label for="bLim">Monthly limit (VND)</label><input class="input" id="bLim" inputmode="numeric" value="' + (cur ? f.num(cur.limit) : '') + '" placeholder="e.g. 3,000,000"></div>',
      actions: [{ label: 'Cancel' }, { label: 'Save budget', onClick: () => {
        const inp = $('#bLim', m.el); if (!FB.field(inp, { required: 'Enter a limit.', min: 100000, max: 500000000 })) return false;
        const limit = FB.parseAmount(inp.value);
        if (cur) cur.limit = limit; else { const c = $('#bCat', m.el).value; const sp = db.spendingByCategory.find((s) => s.cat === c); db.budgets.push({ cat: c, limit, spent: sp ? sp.amount : 0 }); }
        FB.save(); renderBudget(); renderInsights(); FB.toast('Budget saved.', 'success');
      } }]
    });
    FB.amountInput($('#bLim', m.el));
  }

  /* ---------- Goals ---------- */
  const monthsLeft = (g) => Math.max(1, Math.ceil((FB.parseDate(g.deadline) - TODAY) / (30.44 * 864e5)));
  const monthlyNeed = (g) => Math.max(0, Math.ceil((g.target - g.saved) / monthsLeft(g) / 1000) * 1000);
  function renderGoals() {
    const el = $('#pGoals'), gs = db.goals, surplus = Math.max(0, db.income[11] - db.expenses[11]), need = sum(gs.filter((g) => g.saved < g.target).map(monthlyNeed));
    el.innerHTML =
      '<div class="flex between items-center wrap gap-1 mb-2"><div><h3>Savings goals</h3><small class="muted">' + gs.length + ' active goal' + (gs.length === 1 ? '' : 's') + '</small></div><button class="btn" id="newGoal">+ Create goal</button></div>' +
      (gs.length ? '<div class="alert ' + (need <= surplus ? 'success' : 'warn') + ' mb-2"><span>🤖</span><div><b>Savings goal recommendation</b><br>To hit all deadlines, set aside <b>' + f.vnd(need) + '</b> per month. Your average monthly surplus is about ' + f.vnd(surplus) + ' — ' + (need <= surplus ? 'you can fund every goal.' : 'consider extending a deadline or lowering a target.') + '</div></div>' : '') +
      (gs.length ? '<div class="grid g2">' + gs.map((g) => {
        const p = Math.min(100, pctOf(g.saved, g.target)), done = g.saved >= g.target, mo = monthlyNeed(g), late = FB.parseDate(g.deadline) < TODAY && !done;
        return '<div class="card"><div class="flex items-center gap-2"><div class="row-icon" style="width:52px;height:52px;font-size:26px">' + g.icon + '</div><div class="grow"><b>' + esc(g.name) + '</b><br><small class="muted">Deadline ' + f.date(g.deadline) + (late ? ' · overdue' : ' · ' + monthsLeft(g) + ' mo left') + '</small></div>' + (done ? '<span class="badge success">Achieved</span>' : '') + '</div>' +
          '<div class="flex between mt-2"><b>' + f.vnd(g.saved) + '</b><span class="muted">of ' + f.vnd(g.target) + '</span></div><div class="progress ' + (done ? 'ok' : '') + '" style="margin:8px 0" role="progressbar" aria-valuenow="' + Math.round(p) + '" aria-valuemin="0" aria-valuemax="100"><i style="width:' + p + '%"></i></div>' +
          '<small class="muted">' + Math.round(p) + '% complete' + (done ? '' : ' · save <b>' + f.vnd(mo) + '</b>/month to finish on time') + '</small>' +
          '<div class="flex gap-1 mt-2"><button class="btn btn-sm grow" data-add="' + g.id + '" ' + (done ? 'disabled' : '') + '>Add contribution</button><button class="btn btn-outline btn-sm" data-gdel="' + g.id + '" aria-label="Delete goal">🗑️</button></div></div>';
      }).join('') + '</div>' : FB.empty('🏁', 'No goals yet', 'Create your first savings goal.'));
    $('#newGoal').onclick = goalModal;
    $$('[data-add]', el).forEach((b) => (b.onclick = () => contribModal(b.dataset.add)));
    $$('[data-gdel]', el).forEach((b) => (b.onclick = () => { const g = gs.find((x) => x.id === b.dataset.gdel); FB.confirm({ title: 'Delete goal', message: 'Delete “' + g.name + '”? Saved progress of ' + f.vnd(g.saved) + ' stays in your accounts.', confirmLabel: 'Delete', danger: true, onConfirm: () => { db.goals = db.goals.filter((x) => x.id !== g.id); FB.save(); renderGoals(); renderInsights(); FB.toast('Goal deleted.', 'success'); } }); }));
  }
  function contribModal(id) {
    const g = db.goals.find((x) => x.id === id), left = g.target - g.saved;
    const m = FB.modal({
      title: 'Add contribution', body: '<p class="text-2 mb-2">' + g.icon + ' <b>' + esc(g.name) + '</b> — ' + f.vnd(left) + ' to go</p><div class="field"><label for="cAcc">From account</label><select class="select" id="cAcc">' + FB.accountOptions('acc1') + '</select></div><div class="field"><label for="cAmt">Amount (VND)</label><input class="input" id="cAmt" inputmode="numeric" placeholder="0"><div class="hint">Suggested: ' + f.vnd(monthlyNeed(g)) + ' this month</div></div>',
      actions: [{ label: 'Cancel' }, { label: 'Contribute', onClick: () => {
        const inp = $('#cAmt', m.el); if (!FB.field(inp, { required: 'Enter an amount.', min: 10000, max: left })) return false;
        const amt = FB.parseAmount(inp.value), acc = $('#cAcc', m.el).value, err = FB.checkFunds(acc, amt);
        if (err) { FB.field(inp, { custom: () => err }); return false; }
        FB.addTx({ desc: 'Goal contribution — ' + g.name, cat: 'transfer', type: 'out', amount: amt, acc, channel: 'Internal', counterparty: 'Savings goal', notify: false });
        g.saved += amt; FB.notify('savings', g.saved >= g.target ? 'Goal achieved 🎉' : 'Goal contribution added', f.vnd(amt) + ' added to “' + g.name + '”.'); FB.save(); renderGoals(); renderInsights();
        FB.toast(g.saved >= g.target ? 'Congratulations! You reached your goal.' : f.vnd(amt) + ' added to your goal.', 'success');
      } }]
    });
    FB.amountInput($('#cAmt', m.el));
  }
  function goalModal() {
    const icons = ['🎯', '✈️', '🏡', '🚗', '💻', '🎓', '💍', '🛟', '🌸'];
    const m = FB.modal({
      title: 'Create savings goal',
      body: '<div class="field"><label for="gName">Goal name</label><input class="input" id="gName" maxlength="40" placeholder="e.g. New motorbike"></div><div class="row2"><div class="field"><label for="gIcon">Icon</label><select class="select" id="gIcon">' + icons.map((i) => '<option>' + i + '</option>').join('') + '</select></div><div class="field"><label for="gDate">Deadline</label><input class="input" type="date" id="gDate" min="2026-10-01"></div></div>' +
        '<div class="row2"><div class="field"><label for="gTarget">Target (VND)</label><input class="input" id="gTarget" inputmode="numeric" placeholder="0"></div><div class="field"><label for="gSaved">Already saved</label><input class="input" id="gSaved" inputmode="numeric" placeholder="0"></div></div><div class="alert" id="gRec"><span>🤖</span><span>Enter a target and deadline to get a monthly recommendation.</span></div>',
      actions: [{ label: 'Cancel' }, { label: 'Create goal', onClick: () => {
        const ok = [FB.field($('#gName', m.el), { required: 'Name your goal.' }), FB.field($('#gTarget', m.el), { required: 'Enter a target.', min: 1000000 }), FB.field($('#gDate', m.el), { required: 'Pick a deadline.', custom: (v) => (FB.parseDate(v) <= TODAY ? 'Deadline must be in the future.' : '') }), FB.field($('#gSaved', m.el), { custom: (v) => (FB.parseAmount(v) >= FB.parseAmount($('#gTarget', m.el).value) ? 'Saved amount must be less than the target.' : '') })];
        if (ok.includes(false)) return false;
        db.goals.push({ id: 'g' + Date.now(), name: $('#gName', m.el).value.trim(), icon: $('#gIcon', m.el).value, target: FB.parseAmount($('#gTarget', m.el).value), saved: FB.parseAmount($('#gSaved', m.el).value), deadline: $('#gDate', m.el).value });
        FB.save(); renderGoals(); renderInsights(); FB.toast('Goal created. Start contributing to stay on track!', 'success');
      } }]
    });
    ['#gTarget', '#gSaved'].forEach((s) => FB.amountInput($(s, m.el)));
    const rec = () => {
      const t = FB.parseAmount($('#gTarget', m.el).value), s = FB.parseAmount($('#gSaved', m.el).value), d = $('#gDate', m.el).value;
      if (!t || !d || FB.parseDate(d) <= TODAY || s >= t) return;
      const g = { target: t, saved: s, deadline: d }; $('#gRec', m.el).innerHTML = '<span>🤖</span><span>Save <b>' + f.vnd(monthlyNeed(g)) + '</b> per month for ' + monthsLeft(g) + ' months to reach ' + f.vnd(t) + '.</span>';
    };
    $$('input', m.el).forEach((i) => i.addEventListener('input', rec));
  }

  /* ---------- Insights ---------- */
  function forecast() {
    const h = db.expenses.slice(-6), n = h.length, avg = sum(h) / n, xm = (n - 1) / 2;
    const slope = sum(h.map((v, i) => (i - xm) * (v - avg))) / sum(h.map((v, i) => (i - xm) * (i - xm)));
    const pred = Math.round((avg * 0.5 + (avg + slope * (n - xm)) * 0.5) / 1e5) * 1e5;
    return { avg, slope, pred, lo: pred * 0.92, hi: pred * 1.08 };
  }
  function predictionSVG(fc) {
    const labels = db.months.slice(-6).concat('Oct*'), act = db.expenses.slice(-6), W = 640, H = 230, L = 46, B = 26, max = Math.ceil(Math.max(fc.hi, ...act) / 1e7) * 1e7 + 1e7, n = labels.length;
    const x = (i) => L + ((W - L - 20) * i) / (n - 1), y = (v) => H - B - ((H - B - 10) * v) / max;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Spending prediction chart">';
    for (let i = 0; i <= 4; i++) { const yy = H - B - ((H - B - 10) * i) / 4; s += '<line class="grid-l" x1="' + L + '" x2="' + W + '" y1="' + yy + '" y2="' + yy + '"/><text x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end">' + f.short((max * i) / 4) + '</text>'; }
    labels.forEach((l, i) => (s += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + l + '</text>'));
    s += '<path d="M' + x(5) + ' ' + y(act[5]) + ' L' + x(6) + ' ' + y(fc.hi) + ' L' + x(6) + ' ' + y(fc.lo) + 'Z" fill="var(--warn)" opacity=".18"/>';
    s += '<path d="' + act.map((v, i) => (i ? 'L' : 'M') + x(i) + ' ' + y(v)).join(' ') + '" fill="none" stroke="var(--primary)" stroke-width="2.5" stroke-linejoin="round"/>';
    s += '<path d="M' + x(5) + ' ' + y(act[5]) + ' L' + x(6) + ' ' + y(fc.pred) + '" fill="none" stroke="var(--warn)" stroke-width="2.5" stroke-dasharray="6 6" stroke-linecap="round"/>';
    act.forEach((v, i) => (s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="3.5" fill="var(--surface)" stroke="var(--primary)" stroke-width="2"><title>' + labels[i] + ': ' + f.vnd(v) + '</title></circle>'));
    s += '<circle cx="' + x(6) + '" cy="' + y(fc.pred) + '" r="5" fill="var(--warn)"><title>Predicted: ' + f.vnd(fc.pred) + '</title></circle>';
    return '<div class="chart">' + s + '</svg><div class="legend"><span><i style="background:var(--primary)"></i>Actual</span><span><i style="background:var(--warn)"></i>Projection (dotted) with ±8% range</span></div></div>';
  }
  function healthScore() {
    const inc = sum(db.income.slice(-6)), exp = sum(db.expenses.slice(-6)), rate = pctOf(inc - exp, inc);
    const okB = db.budgets.filter((b) => b.spent <= b.limit).length, adher = db.budgets.length ? pctOf(okB, db.budgets.length) : 100;
    const debt = sum(db.loans.map((l) => l.monthly)) + (db.card.minPayment || 0), dRatio = pctOf(debt, db.user.income);
    const liquid = sum(db.accounts.filter((a) => a.id !== 'acc4').map((a) => a.balance)), efMonths = liquid / (sum(db.expenses.slice(-6)) / 6);
    const parts = [
      { k: 'Savings rate', w: 30, v: Math.min(100, (rate / 30) * 100), note: f.pct(rate) + ' of income saved (target 30%)' },
      { k: 'Budget adherence', w: 25, v: adher, note: okB + ' of ' + db.budgets.length + ' budgets on track' },
      { k: 'Debt ratio', w: 20, v: Math.max(0, Math.min(100, 100 - Math.max(0, dRatio - 10) * 3.3)), note: 'Debt payments are ' + f.pct(dRatio) + ' of income (keep under 30%)' },
      { k: 'Emergency fund', w: 25, v: Math.min(100, (efMonths / 6) * 100), note: efMonths.toFixed(1) + ' months of expenses covered (target 6)' }
    ];
    return { total: Math.round(sum(parts.map((p) => (p.v * p.w) / 100))), parts };
  }
  function renderInsights() {
    const el = $('#pInsights'), fc = forecast(), hs = healthScore(), fr = db.fraud;
    const top = db.spendingByCategory.slice().sort((a, b) => b.amount - a.amount).filter((s) => s.cat !== 'housing')[0], overB = db.budgets.filter((b) => b.spent > b.limit);
    const smart = [];
    if (overB.length) smart.push(['⚠️', 'warn', 'Trim ' + FB.cat(overB[0].cat).name.toLowerCase(), 'You are ' + f.vnd(overB[0].spent - overB[0].limit) + ' over budget. Cutting 2–3 purchases would bring you back on track.']);
    if (top) smart.push(['🍜', 'info', 'Your biggest flexible spend is ' + FB.cat(top.cat).name, f.vnd(top.amount) + ' this month. A 10% reduction saves ' + f.vnd(top.amount * 0.1) + ' per month.']);
    smart.push(['🔁', 'info', 'Automate savings on payday', 'Schedule a transfer of ' + f.vnd(Math.round((db.income[11] * 0.15) / 1e5) * 1e5) + ' (15%) to Savings as soon as your salary arrives.']);
    smart.push(['📆', 'good', 'Recurring charges', 'Netflix (260,000 VND) and 3 utility bills renew next month. Total fixed bills: ~' + f.vnd(3180000) + '.']);
    const fraudCard = fr.status === 'open'
      ? '<div class="card" style="border-color:var(--danger)"><div class="card-head"><h3>🚨 Fraud detection alert</h3><span class="badge danger">Action needed</span></div><p><b>' + f.vnd(fr.amount) + '</b> card payment at <b>' + esc(fr.merchant) + '</b> on ' + f.datetime(fr.time) + '.</p><p class="text-2 mt-1" style="font-size:13px">Unusual location (Singapore), amount 12× your average card payment, and no recent overseas activity. We temporarily held this payment.</p><div class="flex gap-1 wrap mt-2"><button class="btn btn-success btn-sm" data-fraud="ok">✔ It was me</button><button class="btn btn-danger btn-sm" data-fraud="bad">✖ Not me — block card</button></div></div>'
      : '<div class="card"><div class="card-head"><h3>🛡️ Fraud detection</h3><span class="badge ' + (fr.status === 'ok' ? 'success' : 'warn') + '">' + (fr.status === 'ok' ? 'Verified' : 'Card blocked') + '</span></div><p class="text-2">' + (fr.status === 'ok' ? 'You confirmed the ' + f.vnd(fr.amount) + ' payment. We will remember this merchant.' : 'Your card is frozen and the ' + f.vnd(fr.amount) + ' payment was declined. Call 1900 5555 to order a replacement card.') + '</p><a class="btn btn-outline btn-sm mt-2" href="cards.html">Card controls</a></div>';
    el.innerHTML =
      '<div class="grid g-main"><div class="grid" style="gap:18px">' +
      '<div class="card"><div class="card-head"><h3>Spending prediction — October</h3><span class="badge warn">AI estimate</span></div><div class="flex gap-2 wrap mb-2"><div class="stat"><span class="lbl">Predicted spend</span><span class="val">' + f.vnd(fc.pred) + '</span></div><div class="stat"><span class="lbl">Likely range</span><span class="val" style="font-size:16px">' + f.short(fc.lo) + ' – ' + f.short(fc.hi) + '</span></div><div class="stat"><span class="lbl">Trend</span><span class="val ' + (fc.slope > 0 ? 'neg' : 'pos') + '" style="font-size:16px">' + (fc.slope > 0 ? '▲ +' : '▼ −') + f.short(Math.abs(fc.slope)) + '/mo</span></div></div>' + predictionSVG(fc) + '<small class="muted">Method: 6-month average blended with a linear trend. Demo only.</small></div>' +
      '<div class="card"><div class="card-head"><h3>Insights for you</h3></div><div class="grid" style="gap:10px">' + db.insights.map((i) => '<div class="insight ' + i.tone + '"><span class="i-ico">' + i.icon + '</span><div><b>' + esc(i.title) + '</b><p>' + esc(i.body) + '</p></div></div>').join('') + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Smart spending recommendations</h3></div><div class="grid" style="gap:10px">' + smart.map((s) => '<div class="insight ' + s[1] + '"><span class="i-ico">' + s[0] + '</span><div><b>' + esc(s[2]) + '</b><p>' + esc(s[3]) + '</p></div></div>').join('') + '</div></div></div>' +
      '<div class="grid" style="gap:18px;align-content:start">' + fraudCard +
      '<div class="card"><div class="card-head"><h3>Financial health score</h3></div><div id="ring"></div><p class="center mt-1"><b>' + (hs.total >= 75 ? 'Excellent' : hs.total >= 55 ? 'Good' : 'Needs attention') + '</b></p><div class="grid mt-2" style="gap:12px">' + hs.parts.map((p) => '<div><div class="flex between" style="font-size:13px"><b>' + p.k + '</b><span>' + Math.round(p.v) + '/100</span></div><div class="progress ' + (p.v >= 70 ? 'ok' : p.v >= 45 ? 'warn' : 'danger') + '" style="margin:4px 0"><i style="width:' + p.v + '%"></i></div><small class="muted">' + esc(p.note) + ' · weight ' + p.w + '%</small></div>').join('') + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Recommended for you</h3></div><div class="list">' + db.recommendations.map((r) => '<a class="row-item clickable" href="' + r.cta + '" style="color:inherit"><div class="row-icon">' + r.icon + '</div><div class="row-main"><b>' + esc(r.title) + '</b><small>' + esc(r.body) + '</small></div><span class="muted">›</span></a>').join('') + '</div></div></div></div>';
    FB.chart.ring($('#ring'), hs.total, hs.total >= 75 ? 'var(--accent)' : hs.total >= 55 ? 'var(--warn)' : 'var(--danger)', hs.total, 'out of 100');
    $$('[data-fraud]', el).forEach((b) => (b.onclick = () => fraudAction(b.dataset.fraud)));
  }
  function fraudAction(kind) {
    const ok = kind === 'ok';
    FB.confirm({ title: ok ? 'Confirm transaction' : 'Block your card?', icon: ok ? '✅' : '🚫', danger: !ok, confirmLabel: ok ? 'Yes, it was me' : 'Block card',
      message: ok ? 'You are confirming the ' + f.vnd(db.fraud.amount) + ' payment at ' + db.fraud.merchant + '.' : 'Your Platinum Visa will be frozen immediately and the payment declined. You can request a new card via the hotline.',
      onConfirm: () => {
        db.fraud.status = ok ? 'ok' : 'blocked'; if (!ok) db.card.frozen = true;
        const n = db.notifications.find((x) => x.id === 'n2'); if (n) n.read = true;
        FB.notify('security', ok ? 'Transaction verified' : 'Card blocked', ok ? 'Thanks for confirming the ' + f.vnd(db.fraud.amount) + ' payment.' : 'Your card was frozen after you reported a suspicious payment. Call 1900 5555 for a replacement.');
        FB.save(); renderInsights(); FB.toast(ok ? 'Thanks — the payment is now marked as yours.' : 'Card blocked. We have opened a fraud case.', ok ? 'success' : 'warn');
      } });
  }

  renderOverview(); renderBudget(); renderGoals(); renderInsights();
  FB.tabs(document);
})();
