/* FinBank — Cards page */
(function () {
  const { $, $$, esc, fmt } = FB;
  const card = FB.db.card;
  if (card.txLimit == null) card.txLimit = 20000000;
  if (card.pin == null) card.pin = '1234';
  let revealed = false, revealTimer = null;

  // Extra mock activity that is not part of the ledger.
  const MOCK_TX = [
    { desc: 'Apple Services — iCloud+ 200GB', cat: 'entertainment', amount: 69000, date: '2026-09-24 03:10' },
    { desc: 'Lazada order #LZ-55021', cat: 'shopping', amount: 845000, date: '2026-09-22 20:42' },
    { desc: 'Be Group ride — District 2', cat: 'transport', amount: 92000, date: '2026-09-21 08:55' }
  ];

  const daysLeft = () => Math.ceil((FB.parseDate(card.dueDate) - Date.now()) / 864e5);
  const numText = () => (revealed && !card.lost ? card.number : '**** **** **** ' + card.number.slice(-4));
  const statusOf = () => (card.lost ? ['Blocked', 'danger'] : card.frozen ? ['Frozen', 'warn'] : ['Active', 'success']);

  /* ---------- Visual & overview ---------- */
  function renderTop() {
    const [label, tone] = statusOf();
    $('#visual').innerHTML =
      (card.frozen || card.lost ? '<span class="frozen-tag">' + (card.lost ? '⛔ BLOCKED' : '❄️ FROZEN') + '</span>' : '') +
      '<div class="credit-card ' + (card.frozen || card.lost ? 'frozen' : '') + '" role="img" aria-label="Credit card ending ' + card.number.slice(-4) + '">' +
      '<div class="top"><b>FinBank</b><span>Platinum</span></div>' +
      '<div class="chip-ic"></div>' +
      '<div class="cnum mono" id="cnum">' + numText() + '</div>' +
      '<div class="row-bottom"><div><small>Card holder</small><b>' + esc(card.holder) + '</b></div><div><small>Expires</small><b>' + esc(card.expiry) + '</b></div><span class="brand-v">VISA</span></div></div>';
    $('#cName').textContent = card.name;
    const b = $('#cStatus'); b.textContent = label; b.className = 'badge ' + tone;
    $('#revealBtn').textContent = revealed ? '🙈 Hide card number' : '👁 Show card number';
    $('#revealBtn').disabled = !!card.lost;
    $('#pinBtn').disabled = !!card.lost;
    $('#payBtn').disabled = false;
    $('#lostBtn').disabled = !!card.lost;

    const avail = card.limit - card.balance, util = Math.min(100, (card.balance / card.limit) * 100);
    $('#utilPct').textContent = util.toFixed(1) + '%';
    const bar = $('#utilBar'); bar.className = 'progress ' + (util >= 90 ? 'danger' : util >= 60 ? 'warn' : 'ok'); $('i', bar).style.width = util + '%';

    const dl = daysLeft();
    $('#overview').innerHTML = [
      ['Available credit', fmt.vnd(avail), 'pos'], ['Credit limit', fmt.vnd(card.limit)], ['Current balance', fmt.vnd(card.balance)],
      ['Minimum payment', fmt.vnd(card.minPayment), card.minPayment ? '' : 'pos'],
      ['Payment due date', fmt.date(card.dueDate) + (card.balance > 0 && card.minPayment > 0 ? (dl >= 0 ? ' · in ' + dl + ' days' : ' · overdue') : ''), card.minPayment > 0 && dl <= 5 ? 'neg' : ''],
      ['Statement date', fmt.date(card.statementDate)], ['Reward points', fmt.num(card.rewardPoints) + ' pts'], ['Interest rate', '24% per year']
    ].map((r) => '<div class="stat"><span class="lbl">' + r[0] + '</span><span class="val ' + (r[2] || '') + '">' + esc(r[1]) + '</span></div>').join('');

    $('#frozenAlert').innerHTML = card.lost
      ? '<div class="alert danger mb-2"><span>⛔</span><div><b>This card is blocked.</b> A replacement card' + (card.replacementRef ? ' (ref. ' + esc(card.replacementRef) + ')' : '') + ' will be delivered in 3–5 working days.</div></div>'
      : card.frozen ? '<div class="alert warn mb-2"><span>❄️</span><div><b>Your card is frozen.</b> All new card payments are declined until you unfreeze it.</div></div>' : '';
  }

  function renderTx() {
    const real = FB.db.transactions.filter((t) => t.channel === 'Card' || t.channel === 'Card Payment').map((t) => ({ real: true, t, date: t.date }));
    const mock = MOCK_TX.map((m) => ({ real: false, m, date: m.date }));
    const all = real.concat(mock).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
    $('#cardTx').innerHTML = all.length ? all.map((x) => {
      if (x.real) return FB.txRow(x.t);
      const c = FB.cat(x.m.cat);
      return '<div class="row-item"><div class="row-icon" style="background:' + c.color + '22">' + c.icon + '</div><div class="row-main"><span class="t">' + esc(x.m.desc) + '</span><small>' + fmt.datetime(x.m.date) + ' · ' + esc(c.name) + '</small></div><div class="row-amt">−' + fmt.num(x.m.amount) + '<small class="muted">VND</small></div></div>';
    }).join('') : FB.empty('💳', 'No card transactions yet', 'Purchases made with this card will show up here.');
  }

  /* ---------- Controls ---------- */
  const CONTROLS = [
    ['frozen', '❄️ Freeze card', 'Temporarily block all card payments.'],
    ['online', '🌐 Online payments', 'Allow e-commerce and in-app purchases.'],
    ['international', '✈️ International payments', 'Allow use abroad and on foreign merchants.'],
    ['contactless', '📶 Contactless payments', 'Tap-to-pay at terminals (up to 1,000,000 VND).']
  ];
  function renderControls() {
    $('#controls').innerHTML = CONTROLS.map((c) => '<div class="setting-row"><div><b>' + c[1] + '</b><p>' + c[2] + '</p></div><label class="switch"><input type="checkbox" data-ctl="' + c[0] + '" ' + (card[c[0]] ? 'checked' : '') + ' ' + (card.lost || (c[0] !== 'frozen' && card.frozen) ? 'disabled' : '') + ' aria-label="' + esc(c[1]) + '"><span></span></label></div>').join('');
    $$('[data-ctl]').forEach((inp) => (inp.onchange = () => toggleControl(inp)));
    const range = $('#limRange');
    range.value = card.txLimit; range.disabled = !!card.lost;
    $('#limVal').textContent = fmt.vnd(card.txLimit);
    $('#limSave').disabled = true;
  }

  function toggleControl(inp) {
    const k = inp.dataset.ctl, want = inp.checked;
    inp.checked = !want; // revert until confirmed
    const apply = () => { card[k] = want; FB.save(); FB.notify('card', 'Card setting changed', CONTROLS.find((c) => c[0] === k)[1].replace(/^\S+\s/, '') + (want ? ' enabled.' : ' disabled.')); renderAll(); };
    if (k === 'frozen') {
      FB.confirm({ title: want ? 'Freeze card' : 'Unfreeze card', icon: want ? '❄️' : '🔓', message: want ? 'While frozen, all card payments will be declined. Recurring subscriptions may fail.' : 'Your card will be usable again immediately.', confirmLabel: want ? 'Freeze card' : 'Unfreeze card', onConfirm: () => { apply(); FB.toast('Card ' + (want ? 'frozen.' : 'unfrozen.'), want ? 'warn' : 'success'); } });
    } else if (k === 'international' && want) {
      FB.confirm({ title: 'Enable international payments', icon: '✈️', message: 'Foreign transactions carry a 2.5% currency conversion fee. Only enable this while you need it.', confirmLabel: 'Enable', onConfirm: () => { apply(); FB.toast('International payments enabled.', 'success'); } });
    } else { apply(); FB.toast(CONTROLS.find((c) => c[0] === k)[1].replace(/^\S+\s/, '') + (want ? ' enabled.' : ' disabled.'), 'success'); }
  }

  $('#limRange').oninput = (e) => { $('#limVal').textContent = fmt.vnd(+e.target.value); $('#limSave').disabled = +e.target.value === card.txLimit; };
  $('#limSave').onclick = () => {
    const v = +$('#limRange').value, save = () => { card.txLimit = v; FB.save(); FB.toast('Per-transaction limit set to ' + fmt.vnd(v) + '.', 'success'); renderControls(); };
    if (v > card.txLimit) FB.otp({ title: 'Confirm higher limit', onSuccess: save }); else save();
  };

  /* ---------- Show / hide number ---------- */
  $('#revealBtn').onclick = () => {
    if (revealed) { revealed = false; clearTimeout(revealTimer); renderTop(); return; }
    FB.otp({ title: 'Verify to show card number', onSuccess: () => {
      revealed = true; renderTop(); FB.toast('Card number will be hidden again in 30 seconds.', 'info');
      revealTimer = setTimeout(() => { revealed = false; renderTop(); }, 30000);
    } });
  };

  /* ---------- Change PIN ---------- */
  $('#pinBtn').onclick = () => {
    const m = FB.modal({
      title: 'Change card PIN',
      body: '<div class="field"><label for="pOld">Current PIN</label><input class="input" id="pOld" type="password" inputmode="numeric" maxlength="4" autocomplete="off"><div class="hint">Demo PIN: 1234</div></div>' +
        '<div class="field"><label for="pNew">New PIN (4 digits)</label><input class="input" id="pNew" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div>' +
        '<div class="field"><label for="pCon">Confirm new PIN</label><input class="input" id="pCon" type="password" inputmode="numeric" maxlength="4" autocomplete="off"></div>',
      actions: [{ label: 'Cancel' }, { label: 'Continue', keepOpen: true, onClick: (api) => {
        const o = $('#pOld', api.el), n = $('#pNew', api.el), c = $('#pCon', api.el);
        const weak = (v) => /^(\d)\1{3}$/.test(v) || '0123456789'.includes(v) || '9876543210'.includes(v);
        const r = [
          FB.field(o, { required: 'Enter your current PIN.', pattern: /^\d{4}$/, msg: 'PIN must be 4 digits.', custom: (v) => (v !== card.pin ? 'Current PIN is incorrect.' : '') }),
          FB.field(n, { required: 'Enter a new PIN.', pattern: /^\d{4}$/, msg: 'PIN must be 4 digits.', custom: (v) => (weak(v) ? 'PIN is too easy to guess (e.g. 1111 or 1234).' : v === card.pin ? 'New PIN must differ from the current PIN.' : '') }),
          FB.field(c, { required: 'Confirm your new PIN.', custom: (v) => (v !== n.value.trim() ? 'PINs do not match.' : '') })
        ];
        if (r.includes(false)) return false;
        const pin = n.value.trim();
        FB.otp({ title: 'Confirm PIN change', onSuccess: () => { card.pin = pin; FB.save(); FB.notify('security', 'Card PIN changed', 'The PIN of your card ending ' + card.number.slice(-4) + ' was changed.'); api.close(); FB.toast('Your card PIN has been updated.', 'success'); } });
        return false;
      } }]
    });
    return m;
  };

  /* ---------- Pay bill ---------- */
  $('#payBtn').onclick = () => {
    if (card.balance <= 0) { FB.toast('Your card has no outstanding balance.', 'info'); return; }
    let mode = 'min';
    const opts = [['min', 'Minimum payment', card.minPayment], ['stmt', 'Statement balance', card.balance], ['custom', 'Other amount', null]];
    const m = FB.modal({
      title: 'Pay card bill',
      body: '<div class="grid" style="gap:10px">' + opts.map((o) => '<button type="button" class="selectable' + (o[0] === 'min' ? ' selected' : '') + '" data-mode="' + o[0] + '"><div class="flex between"><b>' + o[1] + '</b><b>' + (o[2] == null ? '' : fmt.vnd(o[2])) + '</b></div></button>').join('') + '</div>' +
        '<div class="field mt-2 hidden" id="cWrap"><label for="cAmt">Amount (VND)</label><input class="input" id="cAmt" inputmode="numeric" placeholder="Enter amount"></div>' +
        '<div class="field mt-2"><label for="cSrc">Pay from</label><select class="select" id="cSrc">' + FB.accountOptions('acc1') + '</select></div>' +
        '<div class="alert" id="cInfo">Outstanding balance: <b>' + fmt.vnd(card.balance) + '</b>. Due ' + fmt.date(card.dueDate) + '.</div>',
      actions: [{ label: 'Cancel' }, { label: 'Pay now', keepOpen: true, onClick: (api, btn) => {
        const amt = mode === 'min' ? card.minPayment : mode === 'stmt' ? card.balance : FB.parseAmount($('#cAmt', api.el).value), src = $('#cSrc', api.el).value;
        if (mode === 'custom') {
          if (!FB.field($('#cAmt', api.el), { required: 'Enter an amount.', min: 10000, max: card.balance, custom: () => '' })) return false;
        }
        if (amt <= 0) { FB.toast('Nothing to pay for this option.', 'warn'); return false; }
        const err = FB.checkFunds(src, amt);
        if (err) { FB.toast(err, 'error', 'Cannot pay'); return false; }
        FB.otp({ title: 'Confirm card payment', onSuccess: () => FB.busy(btn, 800, () => {
          card.balance = Math.max(0, card.balance - amt);
          card.minPayment = card.balance === 0 ? 0 : amt >= card.minPayment ? 0 : Math.min(card.balance, card.minPayment - amt);
          const tx = FB.addTx({ desc: 'Credit card payment — ' + card.name, cat: 'bills', type: 'out', amount: amt, acc: src, channel: 'Card Payment', counterparty: 'FinBank Cards', notify: false });
          FB.notify('card', 'Card payment received', 'We received ' + fmt.vnd(amt) + ' towards your credit card bill.');
          api.close(); renderAll();
          FB.receipt({ title: 'Card payment successful', amount: amt, ref: tx.id, rows: [['Reference', tx.id], ['Paid from', FB.accLabel(FB.acc(src))], ['Card', '**** ' + card.number.slice(-4)], ['Remaining balance', fmt.vnd(card.balance)], ['Date & time', fmt.datetime(tx.date)]] });
        }) });
        return false;
      } }]
    });
    FB.amountInput($('#cAmt', m.el));
    $$('[data-mode]', m.el).forEach((b) => (b.onclick = () => {
      mode = b.dataset.mode; $$('[data-mode]', m.el).forEach((x) => x.classList.toggle('selected', x === b));
      $('#cWrap', m.el).classList.toggle('hidden', mode !== 'custom'); if (mode === 'custom') $('#cAmt', m.el).focus();
    }));
  };

  /* ---------- Report lost ---------- */
  $('#lostBtn').onclick = () => {
    const m = FB.modal({
      title: 'Report lost or stolen card',
      body: '<div class="alert danger mb-2"><span>⚠️</span><div>Your card will be <b>blocked immediately</b> and cannot be unblocked. We will issue a replacement.</div></div>' +
        '<div class="field"><label for="lReason">What happened?</label><select class="select" id="lReason"><option value="">Select a reason…</option><option>Card lost</option><option>Card stolen</option><option>Suspicious transactions</option><option>Card retained by ATM</option></select></div>' +
        '<div class="field"><label for="lNote">Details (optional)</label><textarea class="input textarea" id="lNote" rows="3" maxlength="300" placeholder="When and where did you last use the card?"></textarea></div>' +
        '<div class="field"><label for="lAddr">Deliver replacement to</label><select class="select" id="lAddr"><option>Home — ' + esc(FB.db.user.address) + '</option><option>FinBank District 1 Branch (pick up)</option></select></div>' +
        '<label class="check"><input type="checkbox" id="lOk"> I confirm the information above is correct</label><div class="err neg mt-1" id="lErr" style="font-size:12.5px"></div>',
      actions: [{ label: 'Cancel' }, { label: 'Block card', class: 'btn-danger', keepOpen: true, onClick: (api) => {
        const reason = $('#lReason', api.el).value;
        if (!FB.field($('#lReason', api.el), { required: 'Please select a reason.' })) return false;
        if (!$('#lOk', api.el).checked) { $('#lErr', api.el).textContent = 'Please confirm to continue.'; return false; }
        FB.otp({ title: 'Confirm blocking card', onSuccess: () => {
          card.lost = true; card.frozen = true; card.lostReason = reason; card.replacementRef = FB.uid('RPL');
          FB.save(); FB.notify('alert', 'Card blocked', 'Card ending ' + card.number.slice(-4) + ' was blocked. Replacement ref ' + card.replacementRef + '.');
          revealed = false; api.close(); renderAll();
          FB.receipt({ title: 'Card blocked', ok: true, modalTitle: 'Card blocked', rows: [['Reason', reason], ['Replacement ref.', card.replacementRef], ['Delivery', '3–5 working days'], ['Hotline', '1900 5555']] });
        } });
        return false;
      } }]
    });
    return m;
  };

  function renderAll() { renderTop(); renderTx(); renderControls(); }

  $('#overview').innerHTML = '<div class="skeleton sk-box" style="grid-column:1/-1"></div>';
  $('#cardTx').innerHTML = '<div class="skeleton sk-line"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line"></div>';
  setTimeout(renderAll, 400);
})();
