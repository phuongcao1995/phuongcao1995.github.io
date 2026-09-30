/* FinBank — dashboard */
(function () {
  const { $, fmt } = FB, db = FB.db;
  const h = new Date().getHours();
  $('#greet').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') + ', ' + db.user.short + ' 👋';
  $('#dateLine').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) + ' · Ho Chi Minh City (GMT+7)';

  // Suspicious activity banner
  const sus = db.notifications.find((n) => n.type === 'alert' && !n.read);
  if (sus) {
    $('#alertSlot').innerHTML = '<div class="alert danger mb-2"><span>🚨</span><div class="grow"><b>' + FB.esc(sus.title) + '</b><br>' + FB.esc(sus.body) + '</div><div class="flex gap-1 wrap"><button class="btn btn-sm btn-outline" id="itsMe">It was me</button><button class="btn btn-sm btn-danger" id="notMe">Not me</button></div></div>';
    const clear = () => { sus.read = true; FB.save(); FB.refreshBell(); $('#alertSlot').innerHTML = ''; };
    $('#itsMe').onclick = () => { clear(); FB.toast('Thanks for confirming.', 'success'); };
    $('#notMe').onclick = () => FB.confirm({ title: 'Block card?', danger: true, message: 'We will freeze your card and open a fraud case. You can request a new card in Cards.', confirmLabel: 'Freeze card', onConfirm: () => { db.card.frozen = true; clear(); FB.toast('Card frozen. A specialist will call you within 30 minutes.', 'warn', 'Fraud case opened'); } });
  }

  // Skeleton then render
  const sections = ['#heroCard', '#statRow', '#recent'];
  sections.forEach((s) => ($(s).innerHTML = '<div class="skeleton sk-box" style="opacity:.6"></div>'));
  setTimeout(render, 450);

  function render() {
    const total = FB.totalBalance(), sav = db.accounts.filter((a) => a.type === 'Savings Account').reduce((s, a) => s + a.balance, 0) + db.deposits.reduce((s, d) => s + d.amount, 0);
    const avail = db.accounts.reduce((s, a) => s + a.available, 0), loan = db.loans.reduce((s, l) => s + l.outstanding, 0);
    const inc = db.income[11], exp = db.expenses[11];
    let hidden = false;
    const hero = $('#heroCard');
    const drawHero = () => {
      hero.innerHTML = '<button class="eye" id="eye" aria-label="Toggle balance visibility">' + (hidden ? '🙈 Show' : '👁️ Hide') + '</button><div class="lbl">Total balance</div><div class="big">' + (hidden ? '•••••••••• VND' : fmt.vnd(total)) + '</div>' +
        '<div class="sub-row"><div><span class="lbl">Available</span><b>' + (hidden ? '••••••' : fmt.vnd(avail)) + '</b></div><div><span class="lbl">Savings & deposits</span><b>' + (hidden ? '••••••' : fmt.vnd(sav)) + '</b></div><div><span class="lbl">Monthly income</span><b>' + (hidden ? '••••••' : fmt.vnd(inc)) + '</b></div></div>';
      $('#eye').onclick = () => { hidden = !hidden; drawHero(); };
    };
    drawHero();

    const cc = db.card;
    const stats = [
      ['💼', 'Current balance', db.accounts[0].balance, db.balanceHistory.slice(6), 'var(--primary)', '+3.4% vs last month', 'pos', 'accounts.html'],
      ['🏦', 'Savings balance', sav, [90, 96, 101, 108, 114, 120].map((x) => x * 1e6), 'var(--accent)', '+1.2% vs last month', 'pos', 'savings.html'],
      ['💳', 'Credit card', cc.balance, [9, 11, 8, 14, 10, 12.6].map((x) => x * 1e6), 'var(--warn)', 'Limit ' + fmt.short(cc.limit) + ' · due ' + fmt.date(cc.dueDate), '', 'cards.html'],
      ['📑', 'Loan balance', loan, [420, 410, 396, 380, 366, 352].map((x) => x * 1e6), 'var(--danger)', 'Next payment ' + fmt.date(db.loans[0].nextDue), '', 'loans.html'],
      ['⬇️', 'Monthly income', inc, db.income.slice(6), 'var(--accent)', '+32% vs August', 'pos', 'finance.html'],
      ['⬆️', 'Monthly expenses', exp, db.expenses.slice(6), 'var(--danger)', '−11.5% vs August', 'pos', 'finance.html'],
      ['🎯', 'Savings rate', Math.round(((inc - exp) / inc) * 100) + '%', [28, 31, 25, 30, 34, 43], 'var(--primary)', 'Excellent · target 30%', 'pos', 'finance.html'],
      ['📆', 'Avg. daily spend', Math.round(exp / 30), db.expenses.slice(6).map((x) => x / 30), 'var(--info)', 'Under budget', 'pos', 'finance.html']
    ];
    $('#statRow').innerHTML = stats.map((s) => '<a class="card stat" href="' + s[7] + '" style="color:inherit;text-decoration:none"><span class="lbl">' + s[0] + ' ' + s[1] + '</span><span class="val">' + (typeof s[2] === 'string' ? s[2] : fmt.vnd(s[2])) + '</span><div class="flex between items-center"><span class="delta ' + s[6] + '">' + s[5] + '</span>' + FB.chart.spark(s[3], s[4], 70, 26) + '</div></a>').join('');

    $('#recent').innerHTML = db.transactions.slice(0, 7).map((t) => FB.txRow(t)).join('') || FB.empty('🧾', 'No transactions yet');
  }

  const quick = [['💸', 'Transfer', 'transfers.html'], ['🧾', 'Pay bills', 'payments.html#bills'], ['⬇️', 'Deposit', null, 'deposit'], ['⬆️', 'Withdraw', null, 'withdraw'], ['📱', 'Top up', 'payments.html#topup'], ['▦', 'Scan QR', 'payments.html#qr'], ['🤝', 'Send money', 'transfers.html'], ['🏦', 'Open savings', 'savings.html#open'], ['📑', 'Apply loan', 'loans.html#apply']];
  $('#quick').innerHTML = quick.map((q) => '<a href="' + (q[2] || '#') + '"' + (q[3] ? ' data-act="' + q[3] + '"' : '') + '><span class="qi">' + q[0] + '</span>' + q[1] + '</a>').join('');
  $('#quick').addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]'); if (!a) return; e.preventDefault();
    const dep = a.dataset.act === 'deposit';
    const m = FB.modal({ title: dep ? 'Cash deposit at ATM/branch' : 'Cardless ATM withdrawal', body: dep
      ? '<p class="text-2 mb-2">Generate a deposit code and present it at any FinBank ATM or branch.</p><div class="field"><label>Deposit into</label><select class="select" id="qAcc">' + FB.accountOptions('acc1') + '</select></div><div class="field"><label>Amount (VND)</label><input class="input" id="qAmt" inputmode="numeric" placeholder="e.g. 5,000,000"><div class="err"></div></div>'
      : '<p class="text-2 mb-2">Withdraw cash without a card. The code is valid for 15 minutes.</p><div class="field"><label>From account</label><select class="select" id="qAcc">' + FB.accountOptions('acc1') + '</select></div><div class="field"><label>Amount (VND)</label><input class="input" id="qAmt" inputmode="numeric" placeholder="Multiples of 50,000"><div class="err"></div></div>',
      actions: [{ label: 'Cancel' }, { label: 'Generate code', keepOpen: true, onClick: () => {
        const inp = $('#qAmt', m.el), amt = FB.parseAmount(inp.value);
        if (!FB.field(inp, { required: true, custom: () => (amt < 50000 || amt % 50000 ? 'Enter a multiple of 50,000 VND.' : !dep ? FB.checkFunds($('#qAcc', m.el).value, amt) : '') })) return;
        const code = String(Math.floor(100000 + Math.random() * 900000));
        m.body.innerHTML = '<div class="center"><div class="success-anim">✓</div><p class="text-2">Your ' + (dep ? 'deposit' : 'withdrawal') + ' code for <b>' + fmt.vnd(amt) + '</b></p><div style="font-size:36px;font-weight:800;letter-spacing:.2em;margin:10px 0">' + code + '</div><small class="muted">Valid for 15 minutes. Demo only — no money moves.</small></div>';
        $('.modal-foot', m.el).innerHTML = '<button class="btn" id="qDone">Done</button>'; $('#qDone', m.el).onclick = m.close;
      } }] });
    FB.amountInput($('#qAmt', m.el));
  });

  // Charts
  FB.chart.bar({ el: $('#chIncExp'), title: 'Income vs expenses', labels: db.months, series: [{ name: 'Income', data: db.income, color: 'var(--accent)' }, { name: 'Expenses', data: db.expenses, color: 'var(--danger)' }] });
  FB.chart.donut({ el: $('#chCat'), title: 'Spending by category', items: db.spendingByCategory.slice(0, 7).map((s) => ({ label: FB.cat(s.cat).name, value: s.amount, color: FB.cat(s.cat).color })), center: { title: 'Total', value: fmt.short(db.spendingByCategory.reduce((s, x) => s + x.amount, 0)) } });
  FB.chart.line({ el: $('#chBal'), title: 'Balance history', height: 200, labels: db.months, series: [{ name: 'Total balance', data: db.balanceHistory, color: 'var(--primary)' }] });
  FB.chart.line({ el: $('#chSpend'), title: 'Monthly spending', height: 200, labels: db.months, series: [{ name: 'Spending', data: db.expenses, color: 'var(--warn)' }] });
  $('#goals').innerHTML = db.goals.slice(0, 3).map((g) => { const p = Math.round((g.saved / g.target) * 100); return '<div style="margin-bottom:14px"><div class="flex between"><b>' + g.icon + ' ' + FB.esc(g.name) + '</b><span class="muted">' + p + '%</span></div><div class="progress ok mt-1"><i style="width:' + p + '%"></i></div><small class="muted">' + fmt.short(g.saved) + ' / ' + fmt.short(g.target) + ' VND</small></div>'; }).join('');

  // Health score
  const rate = (db.income[11] - db.expenses[11]) / db.income[11];
  const score = Math.min(100, Math.round(40 + rate * 60 + 10));
  $('#healthCard').innerHTML = '<div class="card-head"><h3>Financial health</h3><a href="finance.html#insights">Details</a></div><div id="ring"></div><p class="center text-2 mt-1" style="font-size:13px">' + (score >= 80 ? 'Excellent — you are saving consistently.' : 'Good — room to improve.') + '</p>';
  FB.chart.ring($('#ring'), score, 'var(--accent)', score, '/ 100');

  $('#insights').innerHTML = db.insights.map((i) => '<div class="insight ' + i.tone + '"><span class="i-ico">' + i.icon + '</span><div><b>' + FB.esc(i.title) + '</b><p>' + FB.esc(i.body) + '</p></div></div>').join('');
  $('#recs').innerHTML = db.recommendations.map((r) => '<a class="row-item clickable" href="' + r.cta + '" style="color:inherit;text-decoration:none"><div class="row-icon">' + r.icon + '</div><div class="row-main"><b>' + FB.esc(r.title) + '</b><small>' + FB.esc(r.body) + '</small></div><span class="muted">›</span></a>').join('');
})();
