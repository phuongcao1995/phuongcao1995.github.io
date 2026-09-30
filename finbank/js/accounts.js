/* FinBank — Accounts page */
(function () {
  const { $, $$, esc, fmt } = FB;
  const PAGE_SIZE = 8;
  const TYPE_COLOR = { 'Current Account': 'blue', 'Salary Account': 'green', 'Savings Account': 'purple', 'Business Account': 'orange' };
  const revealed = new Set();
  const st = { sel: null, q: '', type: '', status: '', from: '', to: '', sort: 'date-desc', page: 1 };

  const hashAcc = location.hash.slice(1);
  st.sel = FB.acc(hashAcc) ? hashAcc : FB.db.accounts[0].id;

  const numText = (a) => (revealed.has(a.id) ? a.number : FB.mask(a.number));

  /* ---------- Account cards ---------- */
  function renderCards() {
    $('#cards').innerHTML = FB.db.accounts.map((a) =>
      '<div class="acct-card ' + a.color + (a.id === st.sel ? ' selected' : '') + '" data-acc="' + a.id + '" tabindex="0" role="button" aria-pressed="' + (a.id === st.sel) + '" aria-label="' + esc(a.type) + '">' +
      '<div class="flex between items-center"><small>' + esc(a.type) + '</small><button class="btn btn-sm" data-eye="' + a.id + '" style="background:rgba(255,255,255,.2);padding:3px 9px" aria-label="Show or hide account number">' + (revealed.has(a.id) ? '🙈' : '👁') + '</button></div>' +
      '<div class="num mono">' + numText(a) + '</div>' +
      '<div><small>Available balance</small><div class="bal">' + fmt.vnd(a.available) + '</div></div></div>').join('');
    $$('.acct-card', $('#cards')).forEach((c) => {
      const pick = () => { st.sel = c.dataset.acc; st.page = 1; history.replaceState(null, '', '#' + st.sel); renderAll(); };
      c.onclick = (e) => { if (e.target.closest('[data-eye]')) return; pick(); };
      c.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
    });
    $$('[data-eye]', $('#cards')).forEach((b) => (b.onclick = () => { toggleReveal(b.dataset.eye); }));
  }

  function toggleReveal(id) {
    if (revealed.has(id)) { revealed.delete(id); renderCards(); renderDetail(); return; }
    revealed.add(id); renderCards(); renderDetail();
  }

  /* ---------- Detail ---------- */
  function monthTotals(a) {
    const ym = fmt.iso().slice(0, 7);
    let inn = 0, out = 0;
    FB.db.transactions.forEach((t) => { if (t.acc === a.id && t.status === 'Completed' && t.date.slice(0, 7) === ym) { if (t.type === 'in') inn += t.amount; else out += t.amount; } });
    return { inn, out };
  }

  function renderDetail() {
    const a = FB.acc(st.sel);
    const holds = a.balance - a.available;
    $('#detail').innerHTML =
      '<div class="card-head"><h3>' + esc(a.type) + ' details</h3><span class="badge ' + (a.status === 'Active' ? 'success' : 'warn') + '">' + esc(a.status) + '</span></div>' +
      '<dl class="kv">' +
      '<dt>Account number</dt><dd><span class="mono">' + numText(a) + '</span> <button class="btn btn-ghost btn-sm" id="dEye">' + (revealed.has(a.id) ? 'Hide' : 'Show') + '</button> <button class="btn btn-ghost btn-sm" id="dCopy">Copy</button></dd>' +
      '<dt>Account name</dt><dd>' + esc(a.name) + '</dd>' +
      '<dt>Available balance</dt><dd class="pos">' + fmt.vnd(a.available) + '</dd>' +
      '<dt>Current balance</dt><dd>' + fmt.vnd(a.balance) + '</dd>' +
      '<dt>Held / pending</dt><dd>' + fmt.vnd(holds) + '</dd>' +
      '<dt>Status</dt><dd>' + esc(a.status) + '</dd>' +
      '<dt>Opened</dt><dd>' + fmt.date(a.opened) + '</dd>' +
      '<dt>Branch</dt><dd>' + esc(a.branch) + '</dd>' +
      '<dt>Interest rate</dt><dd>' + esc(a.rate) + ' per year</dd>' +
      '<dt>Currency</dt><dd>VND — Vietnamese dong</dd>' +
      '<dt>Bank / SWIFT</dt><dd>FinBank · FNBKVNVX</dd>' +
      '<dt>Daily limit</dt><dd>' + fmt.vnd(FB.prefs.limitDay) + '</dd>' +
      '<dt>Overdraft</dt><dd>Not enabled</dd></dl>';
    $('#dEye').onclick = () => toggleReveal(a.id);
    $('#dCopy').onclick = () => {
      const txt = a.number.replace(/\s/g, '');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => FB.toast('Account number copied.', 'success'), () => FB.toast('Copy is not available in this browser.', 'warn'));
      else FB.toast('Copy is not available in this browser.', 'warn');
    };
    const m = monthTotals(a);
    $('#side').innerHTML =
      '<div class="card-head"><h3>This month</h3></div>' +
      '<div class="stat"><span class="lbl">Money in</span><span class="val pos">+' + fmt.vnd(m.inn) + '</span></div>' +
      '<div class="stat mt-2"><span class="lbl">Money out</span><span class="val neg">−' + fmt.vnd(m.out) + '</span></div>' +
      '<div class="stat mt-2"><span class="lbl">Net</span><span class="val">' + (m.inn - m.out >= 0 ? '+' : '−') + fmt.vnd(Math.abs(m.inn - m.out)) + '</span></div>' +
      '<hr style="border:0;border-top:1px solid var(--border);margin:18px 0">' +
      '<div class="flex" style="flex-direction:column;gap:10px"><button class="btn btn-block" id="stmtBtn">⬇️ Download statement</button>' +
      '<a class="btn btn-outline btn-block" href="transfers.html">💸 Transfer money</a>' +
      '<a class="btn btn-outline btn-block" href="transactions.html">📊 All transactions</a></div>';
    $('#stmtBtn').onclick = statementModal;
    $('#histAcc').textContent = a.type + ' · ' + FB.mask(a.number);
  }

  /* ---------- History ---------- */
  function filtered() {
    const q = st.q.trim().toLowerCase();
    const list = FB.db.transactions.filter((t) => {
      if (t.acc !== st.sel) return false;
      if (st.type && t.type !== st.type) return false;
      if (st.status && t.status !== st.status) return false;
      if (st.from && t.date.slice(0, 10) < st.from) return false;
      if (st.to && t.date.slice(0, 10) > st.to) return false;
      if (q && ![t.desc, t.id, t.counterparty, FB.cat(t.cat).name].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
    const s = st.sort;
    list.sort((x, y) => s === 'date-desc' ? y.date.localeCompare(x.date) : s === 'date-asc' ? x.date.localeCompare(y.date) : s === 'amt-desc' ? y.amount - x.amount : x.amount - y.amount);
    return list;
  }

  function renderHistory() {
    const list = filtered(), host = $('#hist');
    if (!list.length) {
      host.innerHTML = FB.empty('🗂️', 'No transactions found', 'Try changing your search or filters.');
      $('#pager').innerHTML = ''; return;
    }
    const page = FB.pager({ el: $('#pager'), total: list.length, pageSize: PAGE_SIZE, page: st.page, onChange: (p) => { st.page = p; renderHistory(); } });
    st.page = page;
    const rows = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    host.innerHTML = '<div class="table-wrap"><table class="table stack"><thead><tr><th>Date</th><th>Description</th><th>Reference</th><th>Status</th><th class="right">Amount</th></tr></thead><tbody>' +
      rows.map((t) => '<tr class="clickable" data-tx="' + t.id + '"><td data-label="Date">' + fmt.datetime(t.date) + '</td><td data-label="Description"><b>' + esc(t.desc) + '</b><br><small class="muted">' + esc(FB.cat(t.cat).name) + '</small></td><td data-label="Reference" class="mono">' + t.id + '</td><td data-label="Status">' + FB.statusBadge(t.status) + '</td><td data-label="Amount" class="right ' + (t.type === 'in' ? 'pos' : '') + '"><b>' + (t.type === 'in' ? '+' : '−') + fmt.num(t.amount) + ' VND</b></td></tr>').join('') +
      '</tbody></table></div>';
  }

  /* ---------- Statement ---------- */
  function periodRange(p, from, to) {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    const iso = (d) => fmt.iso(d).slice(0, 10);
    if (p === 'month') return [iso(new Date(y, m, 1)), iso(now)];
    if (p === 'last') return [iso(new Date(y, m - 1, 1)), iso(new Date(y, m, 0))];
    if (p === '90') return [iso(new Date(now.getTime() - 90 * 864e5)), iso(now)];
    if (p === 'year') return [iso(new Date(y, 0, 1)), iso(now)];
    return [from, to];
  }

  function statementModal() {
    const a = FB.acc(st.sel);
    const m = FB.modal({
      title: 'Download statement',
      body: '<p class="text-2 mb-2">' + esc(a.type) + ' · ' + FB.mask(a.number) + '</p>' +
        '<div class="field"><label for="sPeriod">Period</label><select class="select" id="sPeriod"><option value="month">This month</option><option value="last">Last month</option><option value="90">Last 90 days</option><option value="year">This year</option><option value="custom">Custom range</option></select></div>' +
        '<div class="row2 hidden" id="sCustom"><div class="field"><label for="sFrom">From</label><input class="input" type="date" id="sFrom"></div><div class="field"><label for="sTo">To</label><input class="input" type="date" id="sTo"></div></div>' +
        '<div class="field"><span class="label">Format</span><div class="chips" id="sFmt"><button type="button" class="chip active" data-f="pdf">PDF</button><button type="button" class="chip" data-f="csv">CSV</button><button type="button" class="chip" data-f="xlsx">Excel</button></div></div>' +
        '<div class="alert" id="sErr" style="display:none"></div>',
      actions: [{ label: 'Cancel' }, {
        label: 'Download', keepOpen: true, onClick: (api, btn) => {
          const p = $('#sPeriod', api.el).value, [f, t] = periodRange(p, $('#sFrom', api.el).value, $('#sTo', api.el).value);
          const err = $('#sErr', api.el), fmtSel = $('#sFmt .active', api.el).dataset.f;
          if (!f || !t) { err.className = 'alert danger'; err.style.display = 'flex'; err.textContent = 'Please choose both start and end dates.'; return; }
          if (f > t) { err.className = 'alert danger'; err.style.display = 'flex'; err.textContent = 'Start date must be before end date.'; return; }
          err.style.display = 'none';
          const list = FB.db.transactions.filter((x) => x.acc === a.id && x.date.slice(0, 10) >= f && x.date.slice(0, 10) <= t).sort((x, y) => x.date.localeCompare(y.date));
          FB.busy(btn, 900, () => {
            if (!list.length) { err.className = 'alert warn'; err.style.display = 'flex'; err.textContent = 'No transactions in this period.'; return; }
            const name = 'statement-' + a.number.replace(/\s/g, '').slice(-4) + '-' + f + '_' + t;
            if (fmtSel === 'csv') {
              const rows = [['Date', 'Reference', 'Description', 'Category', 'Type', 'Status', 'Amount (VND)']].concat(list.map((x) => [fmt.datetime(x.date), x.id, x.desc, FB.cat(x.cat).name, x.type === 'in' ? 'Credit' : 'Debit', x.status, (x.type === 'in' ? '' : '-') + x.amount]));
              FB.download(name + '.csv', '﻿' + FB.csv(rows), 'text/csv;charset=utf-8');
            } else FB.toast((fmtSel === 'pdf' ? 'PDF' : 'Excel') + ' statement for ' + list.length + ' transactions is ready (demo — no file generated).', 'success', 'Statement generated');
            api.close();
          });
          return false;
        }
      }]
    });
    $('#sPeriod', m.el).onchange = (e) => $('#sCustom', m.el).classList.toggle('hidden', e.target.value !== 'custom');
    $$('#sFmt .chip', m.el).forEach((c) => (c.onclick = () => { $$('#sFmt .chip', m.el).forEach((x) => x.classList.remove('active')); c.classList.add('active'); }));
  }

  /* ---------- Open new account ---------- */
  function openAccountModal() {
    const types = [
      ['Current Account', '💼', 'Everyday spending, cards and transfers. 0.1%/yr.', '0.1%'],
      ['Salary Account', '💵', 'Receive salary and enjoy free transfers. 0.3%/yr.', '0.3%'],
      ['Savings Account', '🐖', 'Flexible savings with higher interest. 5.4%/yr.', '5.4%'],
      ['Business Account', '🏢', 'For freelancers and small businesses. 0.2%/yr.', '0.2%']
    ];
    let type = '';
    const m = FB.modal({
      title: 'Open a new account', size: 'lg',
      body: '<div class="steps"><div class="step current" data-n="1">Type</div><div class="step" data-n="2">Details</div><div class="step" data-n="3">Confirm</div></div>' +
        '<div data-s="1"><div class="grid g2">' + types.map((t) => '<button type="button" class="selectable" data-type="' + t[0] + '"><div style="font-size:24px">' + t[1] + '</div><b>' + t[0] + '</b><div class="muted" style="font-size:13px">' + t[2] + '</div></button>').join('') + '</div><div class="err neg mt-1" data-e1></div></div>' +
        '<div data-s="2" class="hidden">' +
        '<div class="field"><label for="nName">Account nickname</label><input class="input" id="nName" maxlength="30" placeholder="e.g. Travel fund"></div>' +
        '<div class="field"><label for="nSrc">Fund from</label><select class="select" id="nSrc">' + FB.accountOptions() + '</select></div>' +
        '<div class="field"><label for="nAmt">Initial deposit (VND)</label><input class="input" id="nAmt" inputmode="numeric" placeholder="Minimum 100,000"><div class="hint">Minimum initial deposit is 100,000 VND.</div></div>' +
        '<label class="check"><input type="checkbox" id="nTerms"> I agree to the FinBank account terms and conditions</label><div class="err neg mt-1" data-e2></div></div>' +
        '<div data-s="3" class="hidden" id="nReview"></div>',
      actions: []
    });
    const foot = document.createElement('div'); foot.className = 'modal-foot';
    foot.innerHTML = '<button class="btn btn-outline" data-back>Cancel</button><button class="btn" data-next disabled>Continue</button>';
    m.el.querySelector('.modal').appendChild(foot);
    FB.amountInput($('#nAmt', m.el));
    let step = 1;
    const go = (n) => {
      step = n;
      $$('[data-s]', m.el).forEach((s) => s.classList.toggle('hidden', +s.dataset.s !== n));
      $$('.step', m.el).forEach((s, i) => { s.classList.toggle('done', i + 1 < n); s.classList.toggle('current', i + 1 === n); });
      $('[data-back]', m.el).textContent = n === 1 ? 'Cancel' : 'Back';
      $('[data-next]', m.el).textContent = n === 3 ? 'Confirm & open' : 'Continue';
    };
    $$('[data-type]', m.el).forEach((b) => (b.onclick = () => {
      type = b.dataset.type; $$('[data-type]', m.el).forEach((x) => x.classList.toggle('selected', x === b)); $('[data-next]', m.el).disabled = false;
    }));
    $('[data-back]', m.el).onclick = () => (step === 1 ? m.close() : go(step - 1));
    $('[data-next]', m.el).onclick = (e) => {
      if (step === 1) { go(2); return; }
      const amt = FB.parseAmount($('#nAmt', m.el).value), src = $('#nSrc', m.el).value;
      if (step === 2) {
        const okA = FB.field($('#nAmt', m.el), { required: 'Enter an initial deposit.', min: 100000, custom: () => (amt > FB.acc(src).available ? 'Insufficient balance in the source account.' : '') });
        const okT = $('#nTerms', m.el).checked; $('[data-e2]', m.el).textContent = okT ? '' : 'Please accept the terms to continue.';
        if (!okA || !okT) return;
        const info = types.find((t) => t[0] === type), nick = $('#nName', m.el).value.trim();
        $('#nReview', m.el).innerHTML = '<div class="receipt">' + [['Account type', type], ['Nickname', nick || '—'], ['Interest rate', info[3] + ' per year'], ['Funding source', FB.accLabel(FB.acc(src))], ['Initial deposit', fmt.vnd(amt)], ['Fee', 'Free']].map((r) => '<div class="r-row"><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>').join('') + '</div>';
        go(3); return;
      }
      FB.otp({
        title: 'Confirm new account', onSuccess: () => {
          FB.setBtnLoading(e.target, true);
          setTimeout(() => {
            const info = types.find((t) => t[0] === type), nick = $('#nName', m.el).value.trim();
            let num; do { num = '1903 ' + String(1000 + Math.floor(Math.random() * 9000)) + ' ' + String(1000 + Math.floor(Math.random() * 9000)); } while (FB.db.accounts.some((x) => x.number === num));
            const acc = { id: 'acc' + Date.now(), type, name: type === 'Business Account' ? 'MINH ANH DESIGN STUDIO' : FB.db.user.name.toUpperCase(), number: num, balance: 0, available: 0, status: 'Active', opened: fmt.iso().slice(0, 10), branch: 'FinBank District 1', color: TYPE_COLOR[type], rate: info[3], nickname: nick };
            FB.db.accounts.push(acc);
            FB.addTx({ desc: 'Initial deposit to new ' + type + (nick ? ' (' + nick + ')' : ''), cat: 'transfer', type: 'out', amount: amt, acc: src, channel: 'Internal', counterparty: 'Own account', notify: false });
            FB.addTx({ desc: 'Initial deposit from ' + FB.acc(src).type, cat: 'transfer', type: 'in', amount: amt, acc: acc.id, channel: 'Internal', counterparty: 'Own account', notify: false });
            FB.notify('money', 'New account opened', type + ' ' + FB.mask(num) + ' is ready to use.');
            st.sel = acc.id; st.page = 1; m.close(); renderAll();
            FB.receipt({ title: 'Account opened', modalTitle: 'Account opened', amount: amt, rows: [['Account type', type], ['Account number', num], ['Interest rate', info[3] + ' per year'], ['Opened on', fmt.date(acc.opened)]] });
          }, 800);
        }
      });
    };
  }

  /* ---------- Wire up ---------- */
  function renderAll() { renderCards(); renderDetail(); renderHistory(); }

  const rerun = () => { st.page = 1; renderHistory(); };
  $('#q').oninput = FB.debounce((e) => { st.q = e.target.value; rerun(); }, 200);
  $('#fType').onchange = (e) => { st.type = e.target.value; rerun(); };
  $('#fStatus').onchange = (e) => { st.status = e.target.value; rerun(); };
  $('#fSort').onchange = (e) => { st.sort = e.target.value; rerun(); };
  $('#fFrom').onchange = (e) => { st.from = e.target.value; rerun(); };
  $('#fTo').onchange = (e) => { st.to = e.target.value; rerun(); };
  $('#fClear').onclick = () => {
    Object.assign(st, { q: '', type: '', status: '', from: '', to: '', sort: 'date-desc', page: 1 });
    ['q', 'fType', 'fStatus', 'fFrom', 'fTo'].forEach((id) => ($('#' + id).value = ''));
    $('#fSort').value = 'date-desc'; renderHistory();
  };
  $('#toggleAll').onclick = (e) => {
    const all = FB.db.accounts.every((a) => revealed.has(a.id));
    FB.db.accounts.forEach((a) => (all ? revealed.delete(a.id) : revealed.add(a.id)));
    e.target.textContent = all ? '👁 Show numbers' : '🙈 Hide numbers'; renderCards(); renderDetail();
  };
  $('#openAcc').onclick = openAccountModal;

  renderCards(); renderDetail();
  FB.skeleton($('#hist'), renderHistory, 450);
})();
