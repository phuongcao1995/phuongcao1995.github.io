/* FinBank — Transfers: recipient → amount → review → OTP → result */
(function () {
  'use strict';
  const $ = FB.$, $$ = FB.$$, esc = FB.esc, F = FB.fmt, db = FB.db;
  db.scheduled = db.scheduled || [];
  const FX = { USD: { r: 25400 }, EUR: { r: 27600 }, JPY: { r: 168 }, SGD: { r: 19000 } };
  const NAMES = ['NGUYEN VAN AN', 'TRAN THI BICH', 'LE HOANG PHUC', 'PHAM THU HA', 'VU DUC MINH', 'DO THANH TAM', 'BUI KHANH LY', 'HOANG GIA BAO', 'NGO MINH CHAU', 'DANG QUYNH ANH'];
  const COUNTRIES = ['United States', 'Singapore', 'Japan', 'Germany', 'France', 'Australia', 'United Kingdom', 'Korea'];
  const hash = (s) => Array.from(s).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const digits = (s) => String(s).replace(/\s/g, '');
  const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return F.iso(d).slice(0, 10); };
  const STEPS = ['Recipient', 'Amount', 'Review', 'OTP', 'Result'];
  let S, pending = null, bq = '', showTab;

  /* ---------- Amount in words (Vietnamese) ---------- */
  const D = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
  function read3(n, full) {
    const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10; let s = '';
    if (h || full) s += D[h] + ' trăm ';
    if (t > 1) { s += D[t] + ' mươi '; if (u === 1) s += 'mốt '; else if (u === 5) s += 'lăm '; else if (u) s += D[u] + ' '; }
    else if (t === 1) { s += 'mười '; if (u === 5) s += 'lăm '; else if (u) s += D[u] + ' '; }
    else if (u) { if (h || full) s += 'lẻ '; s += D[u] + ' '; }
    return s;
  }
  function words(n) {
    if (!n) return '';
    const U = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'], g = [];
    while (n > 0) { g.unshift(n % 1000); n = Math.floor(n / 1000); }
    let s = '';
    g.forEach((v, i) => { if (v) s += read3(v, i > 0) + U[Math.min(5, g.length - 1 - i)] + ' '; });
    s = s.trim(); return s.charAt(0).toUpperCase() + s.slice(1) + ' đồng';
  }

  /* ---------- Money maths ---------- */
  const rate = () => (S.type === 'intl' ? FX[S.cur].r : 1);
  const vnd = () => Math.round(S.amount * rate());
  const fee = () => S.type === 'intl' ? Math.max(150000, Math.round(vnd() * 0.003 / 1000) * 1000) + 90000 : S.type === 'other' && S.amount > 20e6 ? 7700 : 0;
  const whenText = () => S.when === 'now' ? 'Immediately' : S.when === 'later' ? 'On ' + F.date(S.date) : 'Monthly from ' + F.date(S.date) + ' (day ' + +S.date.slice(8, 10) + ')';

  function fresh(type, pre) {
    S = Object.assign({ type, step: 1, acc: 'acc1', bank: type === 'fb' ? 'FinBank' : '', no: '', name: '', verified: false, amount: 0, cur: 'USD', note: '', when: 'now', date: tomorrow(), save: false, intl: { name: '', bank: '', swift: '', country: COUNTRIES[0], purpose: 'Family support' }, result: null }, pre || {});
    render();
  }
  function render() {
    $('#steps').innerHTML = STEPS.map((s, i) => '<div class="step ' + (i + 1 < S.step ? 'done' : i + 1 === S.step ? 'current' : '') + '" data-n="' + (i + 1) + '">' + s + '</div>').join('');
    $('#wiz').innerHTML = '';
    [null, stepRecipient, stepAmount, stepReview, stepReview, stepResult][S.step]();
  }
  const go = (n) => { S.step = n; render(); };
  const summary = () => '<div class="row-item" style="border:1px solid var(--border);border-radius:12px;padding:10px 12px;margin-bottom:18px"><div class="row-icon">' + (S.type === 'intl' ? '🌍' : '👤') + '</div><div class="row-main"><b>' + esc(S.name) + '</b><small>' + esc(S.bank) + ' · ' + esc(S.no) + '</small></div><button class="btn btn-ghost btn-sm" id="chg">Change</button></div>';
  const opts = (arr, sel) => arr.map((c) => '<option' + (c === sel ? ' selected' : '') + '>' + c + '</option>').join('');

  /* ---------- Step 1: recipient ---------- */
  function stepRecipient() {
    const w = $('#wiz'), intl = S.type === 'intl';
    const src = '<div class="field"><label for="f-acc">From account</label><select class="select" id="f-acc">' + FB.accountOptions(S.acc) + '</select></div>';
    if (intl) {
      w.innerHTML = src + '<div class="alert warn" style="margin-bottom:16px"><span>🌍</span><div>International transfers are simulated. Rates are indicative and a fee applies.</div></div>' +
        '<div class="field"><label for="i-name">Beneficiary full name</label><input class="input" id="i-name" maxlength="60" value="' + esc(S.intl.name) + '" placeholder="e.g. JOHN A SMITH"></div>' +
        '<div class="row2"><div class="field"><label for="i-bank">Beneficiary bank</label><input class="input" id="i-bank" maxlength="60" value="' + esc(S.intl.bank) + '" placeholder="e.g. DBS Bank Ltd"></div>' +
        '<div class="field"><label for="i-swift">SWIFT / BIC</label><input class="input" id="i-swift" maxlength="11" value="' + esc(S.intl.swift) + '" placeholder="DBSSSGSG"></div></div>' +
        '<div class="field"><label for="i-iban">IBAN / Account number</label><input class="input" id="i-iban" maxlength="34" value="' + esc(S.no) + '" placeholder="e.g. SG12DBSS0123456789"></div>' +
        '<div class="row2"><div class="field"><label for="i-country">Country</label><select class="select" id="i-country">' + opts(COUNTRIES, S.intl.country) + '</select></div>' +
        '<div class="field"><label for="i-purpose">Purpose</label><select class="select" id="i-purpose">' + opts(['Family support', 'Tuition & education', 'Travel expenses', 'Goods & services', 'Investment'], S.intl.purpose) + '</select></div></div>' +
        '<button class="btn btn-block btn-lg" id="next">Continue</button>';
      $('#f-acc').onchange = (e) => (S.acc = e.target.value);
      $('#i-swift').oninput = (e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
      $('#i-iban').oninput = (e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ''));
      $('#next').onclick = () => {
        const ok = [
          FB.field($('#i-name'), { required: true, pattern: /^[A-Za-z .'-]{3,}$/, msg: 'Use Latin letters only (min 3 characters).' }),
          FB.field($('#i-bank'), { required: true }),
          FB.field($('#i-swift'), { required: true, pattern: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, msg: 'SWIFT/BIC must be 8 or 11 characters, e.g. DBSSSGSG.' }),
          FB.field($('#i-iban'), { required: true, custom: (v) => (/^[A-Z0-9]{8,34}$/.test(digits(v)) ? '' : 'Enter a valid IBAN / account number (8–34 characters).') })
        ].every(Boolean);
        if (!ok) return;
        Object.assign(S.intl, { name: $('#i-name').value.trim().toUpperCase(), bank: $('#i-bank').value.trim(), swift: $('#i-swift').value, country: $('#i-country').value, purpose: $('#i-purpose').value });
        S.name = S.intl.name; S.bank = S.intl.bank + ' (' + S.intl.swift + ')'; S.no = digits($('#i-iban').value); go(2);
      };
      return;
    }
    const own = db.accounts.filter((a) => a.id !== S.acc);
    w.innerHTML = src +
      '<div class="field"><label for="f-bank">Recipient bank</label>' + (S.type === 'fb' ? '<input class="input" id="f-bank" value="FinBank" disabled>' : '<select class="select" id="f-bank"><option value="">Select a bank…</option>' + opts(db.banks.filter((b) => b.code !== 'FINBANK').map((b) => b.name), S.bank) + '</select>') + '</div>' +
      '<div class="field"><label for="f-no">Recipient account number</label><div class="flex gap-1"><input class="input" id="f-no" inputmode="numeric" maxlength="19" placeholder="e.g. 1903 5544 3322" value="' + esc(S.no) + '" autocomplete="off"><button class="btn btn-outline" id="verify" style="white-space:nowrap">Verify recipient</button></div></div>' +
      (S.type === 'fb' ? '<div class="chips" style="margin:-6px 0 14px"><span class="muted" style="font-size:13px;align-self:center">My accounts:</span>' + own.map((a) => '<button class="chip" data-own="' + a.number + '">' + esc(a.type) + '</button>').join('') + '</div>' : '') +
      '<div id="vres" aria-live="polite"></div><button class="btn btn-block btn-lg" id="next" ' + (S.verified ? '' : 'disabled') + '>Continue</button>';
    const vres = $('#vres'), noEl = $('#f-no');
    const showRes = (ok, msg) => (vres.innerHTML = msg ? '<div class="alert ' + (ok ? 'success' : 'danger') + '" style="margin-bottom:16px"><span>' + (ok ? '✅' : '⛔') + '</span><div>' + msg + '</div></div>' : '');
    const reset = () => { S.verified = false; S.name = ''; $('#next').disabled = true; showRes(0, ''); };
    if (S.verified) showRes(true, 'Recipient verified: <b>' + esc(S.name) + '</b><br><small class="muted">' + esc(S.bank) + '</small>');
    $('#f-acc').onchange = (e) => { S.acc = e.target.value; reset(); };
    noEl.oninput = () => { noEl.value = noEl.value.replace(/[^\d ]/g, ''); S.no = noEl.value; reset(); };
    if (S.type === 'other') $('#f-bank').onchange = (e) => { S.bank = e.target.value; reset(); };
    $$('[data-own]').forEach((c) => (c.onclick = () => { noEl.value = S.no = c.dataset.own; reset(); }));
    $('#verify').onclick = (e) => {
      const d = digits(noEl.value), bank = S.type === 'fb' ? 'FinBank' : S.bank;
      if (!bank) return FB.field($('#f-bank'), { required: 'Please choose a bank.' });
      if (!FB.field(noEl, { required: true, custom: (v) => (FB.rx.account.test(digits(v)) ? '' : 'Enter a valid account number (6–16 digits).') })) return;
      showRes(0, '');
      FB.busy(e.currentTarget, 1000, () => {
        if (d.endsWith('0000')) return showRes(false, '<b>Account not found.</b> We could not find this account at ' + esc(bank) + '. Please check the number and try again.');
        if (db.accounts.some((a) => digits(a.number) === d && a.id === S.acc)) return showRes(false, '<b>Same account.</b> You cannot transfer to the account you are paying from.');
        const b = db.beneficiaries.find((x) => digits(x.account) === d && x.bank === bank), mine = db.accounts.find((a) => digits(a.number) === d);
        S.bank = bank; S.no = noEl.value.trim(); S.name = mine ? mine.name : b ? b.name : NAMES[hash(d) % NAMES.length]; S.verified = true;
        $('#next').disabled = false; showRes(true, 'Recipient verified: <b>' + esc(S.name) + '</b><br><small class="muted">' + esc(bank) + '</small>');
      });
    };
    $('#next').onclick = () => (S.verified ? go(2) : FB.toast('Please verify the recipient first.', 'warn'));
  }

  /* ---------- Step 2: amount ---------- */
  function stepAmount() {
    const intl = S.type === 'intl', a = FB.acc(S.acc);
    const known = db.beneficiaries.some((b) => digits(b.account) === digits(S.no) && b.bank === S.bank);
    const chips = intl ? [100, 500, 1000, 2000, 5000] : [500000, 1000000, 2000000, 5000000, 10000000, 20000000];
    $('#wiz').innerHTML = summary() +
      '<div class="field"><label for="f-amt">Amount' + (intl ? '' : ' (VND)') + '</label><div class="flex gap-1">' +
      (intl ? '<select class="select" id="f-cur" style="width:110px">' + opts(Object.keys(FX), S.cur) + '</select>' : '') +
      '<input class="input amount-input" id="f-amt" inputmode="numeric" placeholder="0" autocomplete="off" value="' + (S.amount ? F.num(S.amount) : '') + '"></div><div class="hint" id="words"></div></div>' +
      '<div class="chips" style="margin-bottom:16px">' + chips.map((c) => '<button class="chip" data-amt="' + c + '">' + F.num(c) + '</button>').join('') + '</div>' +
      '<div class="alert" id="calc" style="flex-direction:column;gap:4px;margin-bottom:16px"></div>' +
      '<div class="field"><label for="f-note">Note <span class="muted">(optional)</span></label><input class="input" id="f-note" maxlength="140" value="' + esc(S.note) + '" placeholder="e.g. Rent October"><div class="hint"><span id="cnt">0</span>/140</div></div>' +
      (intl ? '' : '<div class="field"><label>When to send</label><div class="chips">' + [['now', 'Send now'], ['later', 'Schedule for later'], ['monthly', 'Repeat monthly']].map((x) => '<button class="chip ' + (S.when === x[0] ? 'active' : '') + '" data-when="' + x[0] + '">' + x[1] + '</button>').join('') + '</div></div>' +
        '<div class="field ' + (S.when === 'now' ? 'hidden' : '') + '"><label for="f-date">' + (S.when === 'monthly' ? 'First payment date' : 'Transfer date') + '</label><input type="date" class="input" id="f-date" min="' + tomorrow() + '" value="' + S.date + '"></div>') +
      (!intl && !known ? '<label class="check" style="margin-bottom:16px"><input type="checkbox" id="f-save" ' + (S.save ? 'checked' : '') + '> Save ' + esc(S.name) + ' as a beneficiary</label>' : '') +
      '<div class="flex gap-1"><button class="btn btn-outline" id="back">Back</button><button class="btn grow" id="next">Review transfer</button></div>';
    const amt = $('#f-amt'), note = $('#f-note');
    const calc = () => {
      S.amount = FB.parseAmount(amt.value); $('#words').textContent = intl ? '' : words(S.amount);
      const f = fee(), row = (k, v) => '<div class="flex between"><span>' + k + '</span><b>' + v + '</b></div>';
      $('#calc').innerHTML = intl
        ? row('Exchange rate', '1 ' + S.cur + ' = ' + F.num(rate()) + ' VND') + row('Equivalent', F.vnd(vnd())) + row('Fee (incl. correspondent bank)', F.vnd(f)) + row('Total debited', F.vnd(vnd() + f)) + row('Estimated arrival', '1–3 business days')
        : row('Available balance', F.vnd(a.available)) + row('Fee', f ? F.vnd(f) : 'Free') + row('Total debited', F.vnd(S.amount + f));
    };
    const keep = () => { S.note = note.value; S.save = !!($('#f-save') && $('#f-save').checked); };
    FB.amountInput(amt); amt.addEventListener('input', calc);
    note.oninput = () => ($('#cnt').textContent = note.value.length); note.oninput();
    $$('[data-amt]').forEach((c) => (c.onclick = () => { amt.value = F.num(c.dataset.amt); calc(); }));
    if (intl) $('#f-cur').onchange = (e) => { S.cur = e.target.value; calc(); };
    $$('[data-when]').forEach((c) => (c.onclick = () => { keep(); S.when = c.dataset.when; stepAmount(); }));
    $('#chg').onclick = () => go(1); $('#back').onclick = () => go(1); calc();
    $('#next').onclick = () => {
      const min = intl ? 10 : 10000, max = intl ? 1000000 : FB.prefs.limitTx;
      let ok = FB.field(amt, { required: 'Please enter an amount.', custom: () => (S.amount < min ? 'Minimum is ' + F.num(min) + ' ' + (intl ? S.cur : 'VND') + '.' : S.amount > max ? 'Maximum is ' + F.num(max) + ' ' + (intl ? S.cur : 'VND') + ' per transfer.' : '') });
      if (S.when !== 'now' && !FB.field($('#f-date'), { required: 'Choose a date.', custom: (v) => (v < tomorrow() ? 'Date must be in the future.' : '') })) ok = false;
      if (!ok) return;
      keep(); S.note = S.note.trim(); if (S.when !== 'now') S.date = $('#f-date').value;
      go(3);
    };
  }

  /* ---------- Step 3/4: review ---------- */
  function stepReview() {
    const lock = S.step === 4, a = FB.acc(S.acc), f = fee();
    const rows = [['From', FB.accLabel(a)], ['To', S.name], ['Bank', S.bank], ['Account', S.no]];
    if (S.type === 'intl') rows.push(['Country', S.intl.country], ['Purpose', S.intl.purpose], ['Amount', F.num(S.amount) + ' ' + S.cur], ['Exchange rate', '1 ' + S.cur + ' = ' + F.num(rate()) + ' VND'], ['Equivalent', F.vnd(vnd())], ['Estimated arrival', '1–3 business days']);
    else rows.push(['Amount', F.vnd(S.amount)], ['Schedule', whenText()]);
    rows.push(['Fee', f ? F.vnd(f) : 'Free'], ['Note', S.note || '—']);
    $('#wiz').innerHTML = '<h3 style="margin-bottom:12px">Review your transfer</h3><div class="receipt">' + rows.map((r) => '<div class="r-row"><span>' + r[0] + '</span><span>' + esc(r[1]) + '</span></div>').join('') + '<div class="r-row r-total"><span>Total</span><span>' + F.vnd(vnd() + f) + '</span></div></div>' +
      '<div class="alert warn" style="margin:16px 0"><span>⚠️</span><div>Please double-check the recipient. Transfers cannot be reversed once completed. Never transfer to people you do not know.</div></div>' +
      '<div class="flex gap-1"><button class="btn btn-outline" id="back" ' + (lock ? 'disabled' : '') + '>Back</button><button class="btn grow" id="ok" ' + (lock ? 'disabled' : '') + '>' + (S.when === 'now' ? 'Confirm & send' : 'Confirm & schedule') + '</button></div>';
    if (lock) return;
    $('#back').onclick = () => go(2);
    $('#ok').onclick = () => {
      const today = F.iso().slice(0, 10), sent = db.transactions.filter((t) => t.type === 'out' && t.cat === 'transfer' && t.status === 'Completed' && t.date.slice(0, 10) === today).reduce((s, t) => s + t.amount, 0);
      const err = FB.checkFunds(S.acc, vnd() + f) || (S.when === 'now' && sent + vnd() > FB.prefs.limitDay ? 'This transfer would exceed your daily limit of ' + F.vnd(FB.prefs.limitDay) + '.' : '');
      if (err) { S.result = { ok: false, reason: err }; return go(5); }
      S.step = 4; render();
      FB.otp({ title: 'Confirm transfer', onSuccess: process, onCancel: () => go(3), onFail: () => { S.result = { ok: false, reason: 'Too many incorrect OTP attempts. For your safety the transfer was cancelled.' }; go(5); } });
    };
  }
  function process() {
    $('#wiz').innerHTML = '<div class="center" style="padding:20px 0"><div class="skeleton sk-line" style="width:60%;margin:0 auto 12px"></div><div class="skeleton sk-box"></div><p class="muted mt-2">Processing your transfer securely…</p></div>';
    setTimeout(() => {
      const f = fee(), ref = FB.uid('FT'), a = FB.acc(S.acc), now = S.when === 'now';
      if (now) {
        FB.addTx({ desc: 'Transfer to ' + S.name + (S.note ? ' — ' + S.note : ''), cat: 'transfer', type: 'out', amount: vnd(), acc: S.acc, counterparty: S.name, channel: 'Interbank' });
        if (f) FB.addTx({ desc: 'Transfer fee — ' + S.name, cat: 'other', type: 'out', amount: f, acc: S.acc, counterparty: 'FinBank', channel: 'Internal', notify: false });
      } else {
        db.scheduled.unshift({ id: ref, acc: S.acc, name: S.name, bank: S.bank, no: S.no, amount: vnd(), fee: f, note: S.note, when: S.when, date: S.date });
        FB.notify('money', 'Transfer scheduled', F.vnd(vnd()) + ' to ' + S.name + ' — ' + whenText().toLowerCase() + '.');
      }
      if (S.save && S.type !== 'intl') db.beneficiaries.push({ id: 'b' + Date.now(), name: S.name, bank: S.bank, account: S.no, alias: S.name.split(' ').slice(-1)[0], fav: false });
      FB.save();
      const rows = [['Reference', ref], ['Date & time', F.datetime(F.iso())], ['From', FB.accLabel(a)], ['To', S.name], ['Bank', S.bank], ['Account', S.no], ['Fee', f ? F.vnd(f) : 'Free'], ['Schedule', whenText()], ['Note', S.note || '—']];
      if (S.type === 'intl') rows.splice(6, 0, ['Original amount', F.num(S.amount) + ' ' + S.cur], ['Exchange rate', '1 ' + S.cur + ' = ' + F.num(rate()) + ' VND'], ['Estimated arrival', '1–3 business days']);
      S.result = { ok: true, ref, title: now ? (S.type === 'intl' ? 'International transfer submitted' : 'Transfer successful') : S.when === 'later' ? 'Transfer scheduled' : 'Monthly transfer set up', amount: vnd(), rows };
      go(5); renderSide(); renderBene();
    }, 1300);
  }

  /* ---------- Step 5: result ---------- */
  function stepResult() {
    const r = S.result;
    if (!r.ok) {
      $('#wiz').innerHTML = FB.receiptHTML({ ok: false, title: 'Transfer failed', amount: vnd(), rows: [['To', S.name], ['Bank', S.bank]] }) +
        '<div class="alert danger" style="margin:16px 0"><span>⛔</span><div><b>Transaction could not be completed</b><br>' + esc(r.reason) + ' No money has been deducted.</div></div>' +
        '<div class="flex gap-1"><button class="btn btn-outline" id="edit">Edit amount</button><button class="btn grow" id="again">New transfer</button></div>';
      $('#edit').onclick = () => go(2); $('#again').onclick = () => fresh(S.type); return;
    }
    $('#wiz').innerHTML = FB.receiptHTML(r) + '<div class="flex gap-1" style="margin-top:16px"><button class="btn btn-outline" id="rc">View / download receipt</button><button class="btn grow" id="again">Make another transfer</button></div>';
    $('#rc').onclick = () => FB.receipt(r); $('#again').onclick = () => fresh(S.type);
  }

  /* ---------- Side panels ---------- */
  function renderSide() {
    const rec = db.transactions.filter((t) => t.type === 'out' && (t.cat === 'transfer' || /^Transfer to/.test(t.desc))).slice(0, 5);
    $('#recent').innerHTML = rec.length ? rec.map((t) => FB.txRow(t)).join('') : FB.empty('💸', 'No transfers yet', 'Your recent transfers will show up here.');
    const sc = db.scheduled; $('#schedCount').textContent = sc.length;
    $('#sched').innerHTML = sc.length ? sc.map((s) => '<div class="row-item"><div class="row-icon">' + (s.when === 'monthly' ? '🔁' : '🗓️') + '</div><div class="row-main"><b>' + esc(s.name) + '</b><small>' + F.num(s.amount) + ' VND · ' + (s.when === 'monthly' ? 'Monthly from ' : '') + F.date(s.date) + '</small></div><button class="btn btn-ghost btn-sm" data-cancel="' + s.id + '">Cancel</button></div>').join('') : FB.empty('🗓️', 'Nothing scheduled', 'Schedule a transfer for later or monthly.');
    $$('[data-cancel]', $('#sched')).forEach((b) => (b.onclick = () => FB.confirm({ title: 'Cancel scheduled transfer', message: 'Cancel this scheduled transfer? It will not be sent.', confirmLabel: 'Yes, cancel', danger: true, onConfirm: () => { db.scheduled = db.scheduled.filter((x) => x.id !== b.dataset.cancel); FB.save(); renderSide(); FB.toast('Scheduled transfer cancelled.', 'success'); } })));
  }

  /* ---------- Beneficiaries ---------- */
  function renderBene(skel) {
    const el = $('#beneList');
    const draw = () => {
      const list = db.beneficiaries.filter((b) => (b.name + b.alias + b.bank + b.account).toLowerCase().includes(bq)).sort((a, b) => b.fav - a.fav);
      el.innerHTML = list.length ? list.map((b) => '<div class="row-item" data-id="' + b.id + '"><div class="row-icon">' + esc(b.name.split(' ').slice(-1)[0][0]) + '</div><div class="row-main"><b>' + esc(b.alias || b.name) + '</b><small>' + esc(b.name) + ' · ' + esc(b.bank) + ' · ' + esc(b.account) + '</small></div><button class="btn btn-ghost btn-sm" data-fav aria-label="Toggle favourite" aria-pressed="' + !!b.fav + '">' + (b.fav ? '★' : '☆') + '</button><button class="btn btn-sm" data-use>Transfer</button><button class="btn btn-ghost btn-sm" data-del aria-label="Delete">🗑️</button></div>').join('') : FB.empty('👥', bq ? 'No matches' : 'No beneficiaries', bq ? 'Try a different search.' : 'Add someone you transfer to often.');
    };
    skel ? FB.skeleton(el, draw, 450) : draw();
  }
  $('#beneList').addEventListener('click', (e) => {
    const row = e.target.closest('[data-id]'); if (!row) return;
    const b = db.beneficiaries.find((x) => x.id === row.dataset.id);
    if (e.target.closest('[data-fav]')) { b.fav = !b.fav; FB.save(); renderBene(); }
    else if (e.target.closest('[data-del]')) FB.confirm({ title: 'Delete beneficiary', message: 'Remove ' + b.name + ' from your saved beneficiaries?', confirmLabel: 'Delete', danger: true, onConfirm: () => { db.beneficiaries = db.beneficiaries.filter((x) => x.id !== b.id); FB.save(); renderBene(); FB.toast('Beneficiary deleted.', 'success'); } });
    else if (e.target.closest('[data-use]')) { pending = { bank: b.bank, no: b.account, name: b.name, verified: true, step: 2 }; showTab(b.bank === 'FinBank' ? 'fb' : 'other'); }
  });
  $('#beneQ').oninput = FB.debounce((e) => { bq = e.target.value.trim().toLowerCase(); renderBene(); }, 200);
  $('#addBene').onclick = () => FB.modal({
    title: 'Add beneficiary',
    body: '<div class="field"><label>Full name</label><input class="input" id="m-name" maxlength="60" placeholder="NGUYEN VAN A"></div><div class="field"><label>Bank</label><select class="select" id="m-bank">' + opts(db.banks.map((b) => b.name)) + '</select></div><div class="field"><label>Account number</label><input class="input" id="m-no" inputmode="numeric" maxlength="19"></div><div class="field"><label>Alias <span class="muted">(optional)</span></label><input class="input" id="m-alias" maxlength="30"></div>',
    actions: [{ label: 'Cancel' }, { label: 'Save', keepOpen: true, onClick: (api) => {
      const q = (s) => $(s, api.body);
      const ok = [FB.field(q('#m-name'), { required: true, pattern: /^[A-Za-z .'-]{3,}$/, msg: 'Use Latin letters without accents.' }), FB.field(q('#m-no'), { required: true, custom: (v) => (FB.rx.account.test(digits(v)) ? '' : 'Enter a valid account number (6–16 digits).') })].every(Boolean);
      if (!ok) return false;
      if (db.beneficiaries.some((b) => digits(b.account) === digits(q('#m-no').value) && b.bank === q('#m-bank').value)) { FB.field(q('#m-no'), { custom: () => 'This beneficiary is already saved.' }); return false; }
      db.beneficiaries.push({ id: 'b' + Date.now(), name: q('#m-name').value.trim().toUpperCase(), bank: q('#m-bank').value, account: q('#m-no').value.trim(), alias: q('#m-alias').value.trim(), fav: false });
      FB.save(); renderBene(); FB.toast('Beneficiary added.', 'success'); api.close();
    } }]
  });

  /* ---------- Init ---------- */
  renderSide(); renderBene(true);
  showTab = FB.tabs(document, (id) => {
    $('#wizCard').classList.toggle('hidden', id === 'bene');
    if (id !== 'bene' && (!S || S.type !== id || pending)) { fresh(id, pending); pending = null; }
  });
})();
