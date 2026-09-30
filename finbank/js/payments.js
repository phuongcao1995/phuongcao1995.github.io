/* FinBank — Payments: QR pay, bills, top-up, history */
(function () {
  'use strict';
  const $ = FB.$, $$ = FB.$$, esc = FB.esc, F = FB.fmt, db = FB.db;
  const OTP_MIN = 5000000;
  const hash = (s) => Array.from(String(s)).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const digits = (s) => String(s).replace(/\s/g, '');
  const catOf = (id) => db.billCategories.find((c) => c.id === id);
  const MERCHANTS = [
    { name: 'Highlands Coffee', addr: '80 Nguyen Hue, District 1', icon: '☕', cat: 'food', amount: 89000, note: 'Order #HL-2031' },
    { name: 'Phuc Long Coffee & Tea', addr: '42 Le Loi, District 1', icon: '🍵', cat: 'food', amount: 75000, note: 'Order #PL-8842' },
    { name: 'WinMart+ Le Thanh Ton', addr: '15 Le Thanh Ton, District 1', icon: '🛒', cat: 'shopping', amount: 0, note: '' },
    { name: 'EVN HCMC', addr: 'Electricity bill payment', icon: '⚡', cat: 'bills', amount: 1245000, note: 'Bill PE05010123456' },
    { name: 'CGV Cinemas Vincom', addr: '72 Le Thanh Ton, District 1', icon: '🎬', cat: 'entertainment', amount: 250000, note: '2 tickets' },
    { name: 'Petrolimex Station 12', addr: '128 Dien Bien Phu, Binh Thanh', icon: '⛽', cat: 'transport', amount: 0, note: '' },
    { name: 'Nguyen Kim Electronics', addr: '63 Tran Hung Dao, District 1', icon: '📺', cat: 'shopping', amount: 8900000, note: 'Invoice NK-77120' }
  ];

  /* ---------- Shared: PIN / OTP authorisation ---------- */
  function pinPrompt(onOk, onCancel) {
    const m = FB.modal({
      title: 'Enter your PIN', size: 'sm', dismissable: false,
      body: '<p class="text-2 center">Enter your 6-digit payment PIN to confirm.<br><small class="muted">Demo PIN: <b>123456</b> (any 6 digits work)</small></p><div class="field" style="margin-top:14px"><input class="input amount-input" id="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" style="letter-spacing:.4em" aria-label="PIN"></div>',
      actions: [{ label: 'Cancel', onClick: () => onCancel && onCancel() }, { label: 'Confirm', keepOpen: true, onClick: (api) => submit(api) }]
    });
    const pin = $('#pin', m.el);
    const submit = (api) => { if (!FB.field(pin, { required: 'Please enter your PIN.', pattern: /^\d{6}$/, msg: 'PIN must be exactly 6 digits.' })) return false; api.close(); onOk(); };
    pin.oninput = () => (pin.value = pin.value.replace(/\D/g, ''));
    pin.onkeydown = (e) => { if (e.key === 'Enter') submit(m); };
  }
  const authorize = (amount, mode, onOk, onCancel) => (mode === 'otp' || amount >= OTP_MIN ? FB.otp({ title: 'Confirm payment', onSuccess: onOk, onCancel }) : pinPrompt(onOk, onCancel));
  const accSelect = (id, sel) => '<div class="field"><label for="' + id + '">Pay from</label><select class="select" id="' + id + '">' + FB.accountOptions(sel || 'acc1') + '</select></div>';
  const alertBox = (type, html) => '<div class="alert ' + type + '" style="margin-bottom:14px"><span>' + (type === 'danger' ? '⛔' : 'ℹ️') + '</span><div>' + html + '</div></div>';

  /* ======================= QR ======================= */
  const Q = { mode: 'scan', view: 'scan', m: null, done: null, fail: '', acc: 'acc1', gen: { acc: 'acc1', amount: '', note: '' } };
  const qb = $('#qrBody');

  function qrSVG(seed, n) {
    n = n || 29; let h = hash(seed) || 1;
    const rnd = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
    const g = Array.from({ length: n }, () => Array(n).fill(0));
    const res = (r, c) => (r < 8 && (c < 8 || c >= n - 8)) || (r >= n - 8 && c < 8);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!res(r, c) && !(Math.abs(r - n / 2 + .5) < 3.5 && Math.abs(c - n / 2 + .5) < 3.5)) g[r][c] = rnd() > 0.52 ? 1 : 0;
    [[0, 0], [0, n - 7], [n - 7, 0]].forEach(([r, c]) => { for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) g[r + i][c + j] = i === 0 || j === 0 || i === 6 || j === 6 || (i > 1 && i < 5 && j > 1 && j < 5) ? 1 : 0; });
    let d = ''; g.forEach((row, r) => row.forEach((v, c) => { if (v) d += 'M' + (c + 2) + ' ' + (r + 2) + 'h1v1h-1z'; }));
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + (n + 4) + ' ' + (n + 4) + '" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="' + d + '" fill="#0b1533"/></svg>';
  }

  function renderQR() {
    $$('#qrModes .chip').forEach((c) => c.classList.toggle('active', c.dataset.mode === Q.mode));
    $('#qrModes').classList.toggle('hidden', Q.view === 'confirm' || Q.view === 'processing');
    if (Q.mode === 'gen') return viewGen();
    ({ scan: viewScan, confirm: viewConfirm, processing: viewProcessing, done: viewDone, fail: viewFail })[Q.view]();
  }
  $('#qrModes').addEventListener('click', (e) => { const c = e.target.closest('[data-mode]'); if (!c) return; Q.mode = c.dataset.mode; Q.view = 'scan'; renderQR(); });

  function viewScan() {
    qb.innerHTML = '<div class="vf" id="vf"><i class="corner c1"></i><i class="corner c2"></i><i class="corner c3"></i><i class="corner c4"></i><div class="line"></div><div class="msg">Point your camera at a VietQR code<br><small>Camera access is simulated in this demo</small></div></div>' +
      '<div class="flex gap-1 wrap" style="justify-content:center;margin-top:18px"><button class="btn btn-lg" id="sim">📷 Simulate scan</button><button class="btn btn-outline btn-lg" id="torch" aria-pressed="false">🔦 Torch</button></div>';
    $('#torch').onclick = (e) => { const on = $('#vf').classList.toggle('torch'); e.currentTarget.setAttribute('aria-pressed', on); };
    $('#sim').onclick = (e) => {
      $('#vf').classList.add('scanning');
      FB.busy(e.currentTarget, 1100, () => { Q.m = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)]; Q.view = 'confirm'; FB.toast('QR code detected: ' + Q.m.name, 'success', 'Scan complete'); renderQR(); });
    };
  }

  function viewConfirm() {
    const m = Q.m;
    qb.innerHTML = '<div style="max-width:520px;margin:0 auto"><div class="m-head"><div class="row-icon">' + m.icon + '</div><div class="grow"><b>' + esc(m.name) + '</b><div class="muted" style="font-size:13px">' + esc(m.addr) + '</div><span class="badge success" style="margin-top:6px">✔ Verified VietQR merchant</span></div></div>' +
      '<div class="field"><label for="q-amt">Amount (VND)</label>' + (m.amount ? '<div style="font-size:30px;font-weight:800">' + F.vnd(m.amount) + '</div><div class="hint">Set by the merchant</div>' : '<input class="input amount-input" id="q-amt" inputmode="numeric" placeholder="0" autocomplete="off">') + '</div>' +
      '<div class="field"><label for="q-note">Note</label><input class="input" id="q-note" maxlength="100" value="' + esc(m.note) + '" placeholder="Add a note (optional)"></div>' + accSelect('q-acc', Q.acc) +
      '<div id="qerr"></div><div class="flex gap-1"><button class="btn btn-outline" id="q-cancel">Cancel</button><button class="btn grow" id="q-pay">Pay now</button></div></div>';
    if (!m.amount) FB.amountInput($('#q-amt'));
    $('#q-acc').onchange = (e) => (Q.acc = e.target.value);
    $('#q-cancel').onclick = () => { Q.view = 'scan'; renderQR(); };
    $('#q-pay').onclick = () => {
      const amt = m.amount || FB.parseAmount($('#q-amt').value);
      if (!m.amount && !FB.field($('#q-amt'), { required: 'Enter the amount to pay.', custom: () => (amt < 1000 ? 'Minimum is 1,000.' : '') })) return;
      const err = FB.checkFunds(Q.acc, amt);
      if (err) { Q.fail = err; Q.view = 'fail'; Q.amt = amt; return renderQR(); }
      const note = $('#q-note').value.trim();
      authorize(amt, 'auto', () => {
        Q.view = 'processing'; renderQR();
        setTimeout(() => {
          const tx = FB.addTx({ desc: m.name + (note ? ' — ' + note : ''), cat: m.cat, type: 'out', amount: amt, acc: Q.acc, channel: 'QR Payment', counterparty: m.name });
          Q.done = { ref: tx.id, title: 'Payment successful', amount: amt, rows: [['Reference', tx.id], ['Date & time', F.datetime(tx.date)], ['Merchant', m.name], ['Method', 'VietQR · ' + (amt >= OTP_MIN ? 'OTP' : 'PIN')], ['From', FB.accLabel(FB.acc(Q.acc))], ['Note', note || '—'], ['Fee', 'Free']] };
          Q.view = 'done'; renderQR(); renderHistory();
        }, 1200);
      });
    };
  }
  function viewProcessing() { qb.innerHTML = '<div class="center" style="padding:30px 0"><div class="skeleton sk-line" style="width:50%;margin:0 auto 12px"></div><div class="skeleton sk-box"></div><p class="muted mt-2">Processing payment…</p></div>'; }
  function viewDone() {
    qb.innerHTML = '<div style="max-width:520px;margin:0 auto">' + FB.receiptHTML(Q.done) + '<div class="flex gap-1" style="margin-top:16px"><button class="btn btn-outline" id="rc">View / download receipt</button><button class="btn grow" id="again">Scan another QR</button></div></div>';
    $('#rc').onclick = () => FB.receipt(Q.done); $('#again').onclick = () => { Q.view = 'scan'; renderQR(); };
  }
  function viewFail() {
    qb.innerHTML = '<div style="max-width:520px;margin:0 auto">' + FB.receiptHTML({ ok: false, title: 'Payment failed', amount: Q.amt, rows: [['Merchant', Q.m.name]] }) + alertBox('danger', '<b>Payment could not be completed</b><br>' + esc(Q.fail) + ' No money has been deducted.') +
      '<div class="flex gap-1"><button class="btn btn-outline" id="retry">Choose another account</button><button class="btn grow" id="again">Scan again</button></div></div>';
    $('#retry').onclick = () => { Q.view = 'confirm'; renderQR(); }; $('#again').onclick = () => { Q.view = 'scan'; renderQR(); };
  }

  function viewGen() {
    const g = Q.gen;
    qb.innerHTML = '<div class="grid g2" style="align-items:start"><div>' + accSelect('g-acc', g.acc).replace('Pay from', 'Receive to') +
      '<div class="field"><label for="g-amt">Amount <span class="muted">(optional)</span></label><div class="input-group has-suffix"><input class="input" id="g-amt" inputmode="numeric" placeholder="Payer enters amount" value="' + esc(g.amount) + '"><span class="suffix">VND</span></div></div>' +
      '<div class="field"><label for="g-note">Note <span class="muted">(optional)</span></label><input class="input" id="g-note" maxlength="60" value="' + esc(g.note) + '" placeholder="e.g. Dinner split"></div></div>' +
      '<div class="center"><div class="qr-box" id="qrBox"></div><p class="muted mt-1" id="qrCap" style="font-size:13px"></p>' +
      '<div class="flex gap-1 wrap mt-2" style="justify-content:center"><button class="btn btn-sm" id="g-dl">⬇️ Download</button><button class="btn btn-outline btn-sm" id="g-share">📤 Share</button><button class="btn btn-outline btn-sm" id="g-copy">📋 Copy code</button></div></div></div>';
    const amt = $('#g-amt'), note = $('#g-note'), acc = $('#g-acc');
    let payload = '';
    const draw = () => {
      Object.assign(g, { acc: acc.value, amount: amt.value, note: note.value });
      const a = FB.acc(g.acc), n = FB.parseAmount(amt.value);
      payload = ['FINBANK', digits(a.number), n || '', note.value.trim()].join('|');
      $('#qrBox').innerHTML = qrSVG(payload) + '<div class="qr-logo"><b>F</b></div>';
      $('#qrCap').innerHTML = '<b>' + esc(a.name) + '</b><br>' + esc(a.number) + (n ? ' · ' + F.vnd(n) : ' · any amount');
    };
    FB.amountInput(amt); amt.addEventListener('input', () => { FB.field(amt, { custom: (v) => (v && FB.parseAmount(v) < 1000 ? 'Minimum is 1,000 VND.' : '') }); draw(); });
    note.oninput = acc.onchange = draw; draw();
    $('#g-dl').onclick = () => FB.download('finbank-qr-' + digits(FB.acc(g.acc).number).slice(-4) + '.svg', qrSVG(payload), 'image/svg+xml');
    $('#g-copy').onclick = () => (navigator.clipboard ? navigator.clipboard.writeText(payload).then(() => FB.toast('QR code data copied.', 'success'), () => FB.toast('Could not copy.', 'error')) : FB.toast('Clipboard is not available.', 'warn'));
    $('#g-share').onclick = () => (navigator.share ? navigator.share({ title: 'Pay me via FinBank', text: 'Pay ' + FB.acc(g.acc).name + ' — ' + payload }).catch(() => {}) : FB.toast('Sharing is not supported here. Use Download or Copy instead.', 'info'));
  }

  /* ======================= BILLS ======================= */
  const B = { cat: null, bill: null };
  const NAMES = ['NGUYEN VAN AN', 'TRAN THI BICH', 'LE HOANG PHUC', 'PHAM THU HA', 'VU DUC MINH', 'DO THANH TAM'];

  function genBill(cat, prov, cid, force) {
    const h = hash(cid + prov), d = new Date(), p = new Date(d.getFullYear(), d.getMonth() - 1, 1), due = new Date(d.getTime() + 10 * 864e5);
    const R = (n) => Math.round(n / 1000) * 1000; let items = [], usage = '—', vat = 0.08;
    if (cat === 'electricity') { const k = 120 + (h % 380); usage = k + ' kWh'; items = [['Energy charge (' + k + ' kWh × ~2,100)', R(k * 2100)]]; }
    else if (cat === 'water') { const m = 8 + (h % 30); usage = m + ' m³'; items = [['Water charge (' + m + ' m³ × 9,500)', m * 9500], ['Environmental fee (10%)', R(m * 950)]]; vat = 0.05; }
    else if (['internet', 'tv', 'postpaid'].includes(cat)) { usage = 'Monthly plan'; items = [['Plan fee', 150000 + (h % 25) * 10000]]; vat = 0.1; }
    else if (cat === 'insurance') { usage = 'Premium'; items = [['Insurance premium', 850000 + (h % 40) * 50000]]; vat = 0; }
    else if (cat === 'tuition') { usage = 'Semester'; items = [['Tuition fee', 5000000 + (h % 30) * 500000], ['Facility fee', 350000]]; vat = 0; }
    else if (cat === 'tax') { usage = 'Assessment'; items = [['Tax assessed', 300000 + (h % 50) * 20000]]; vat = 0; }
    else { usage = 'Monthly'; items = [['Service fee', 200000 + (h % 20) * 40000]]; vat = 0; }
    if (force) { const base = R(force / 1.1); items = [['Charges', base]]; items.push(['VAT (10%)', force - base]); }
    else if (vat) items.push(['VAT (' + vat * 100 + '%)', R(items.reduce((s, i) => s + i[1], 0) * vat)]);
    return { cat, prov, cid, name: force ? FB.db.user.name.toUpperCase() : NAMES[h % NAMES.length], period: String(p.getMonth() + 1).padStart(2, '0') + '/' + p.getFullYear(), usage, due: F.iso(due).slice(0, 10), items, total: items.reduce((s, i) => s + i[1], 0) };
  }

  function renderCats() {
    $('#catGrid').innerHTML = db.billCategories.map((c) => '<button class="selectable ' + (B.cat === c.id ? 'selected' : '') + '" data-cat="' + c.id + '"><span>' + c.icon + '</span>' + c.name + '</button>').join('');
  }
  function setCat(id, prov, cid) {
    B.cat = id; B.bill = null; renderCats(); $('#billForm').classList.remove('hidden'); $('#billOut').innerHTML = '';
    $('#b-prov').innerHTML = db.providersByCat[id].map((p) => '<option' + (p === prov ? ' selected' : '') + '>' + p + '</option>').join('');
    $('#b-cid').value = cid || ''; FB.field($('#b-cid'), {});
  }
  $('#catGrid').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (b) { setCat(b.dataset.cat); $('#b-cid').focus(); } });
  $('#b-cid').oninput = (e) => { e.target.value = e.target.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase(); B.bill = null; $('#billOut').innerHTML = ''; };
  $('#b-prov').onchange = () => { B.bill = null; $('#billOut').innerHTML = ''; };
  $('#b-get').onclick = (e) => {
    const cid = $('#b-cid');
    if (!FB.field(cid, { required: 'Enter your customer ID.', pattern: /^[A-Z0-9-]{6,20}$/, msg: 'Customer ID must be 6–20 letters, digits or dashes.' })) return;
    $('#billOut').innerHTML = '';
    FB.busy(e.currentTarget, 1000, () => showBill(0));
  };

  function showBill(force) {
    const cid = $('#b-cid').value, prov = $('#b-prov').value, out = $('#billOut');
    if (/0000$/.test(cid)) { B.bill = null; out.innerHTML = FB.empty('🔍', 'No bill found', 'There is no outstanding bill for "' + cid + '" at ' + prov + '. Check the customer ID or try again later.'); return; }
    const b = (B.bill = genBill(B.cat, prov, cid, force)), saved = db.billers.some((x) => x.customerId === cid && x.provider === prov);
    out.innerHTML = '<div class="card flat" style="margin-top:18px;background:var(--surface-2)"><div class="card-head"><h3>' + catOf(b.cat).icon + ' ' + esc(b.prov) + '</h3><span class="badge warn">Unpaid</span></div>' +
      '<dl class="kv" style="margin-bottom:14px"><dt>Customer</dt><dd>' + esc(b.name) + '</dd><dt>Customer ID</dt><dd>' + esc(b.cid) + '</dd><dt>Billing period</dt><dd>' + b.period + '</dd><dt>Usage</dt><dd>' + esc(b.usage) + '</dd><dt>Due date</dt><dd>' + F.date(b.due) + '</dd></dl>' +
      '<div class="receipt">' + b.items.map((i) => '<div class="r-row"><span>' + esc(i[0]) + '</span><span>' + F.vnd(i[1]) + '</span></div>').join('') + '<div class="r-row r-total"><span>Total due</span><span>' + F.vnd(b.total) + '</span></div></div></div>' +
      '<div style="margin-top:18px">' + accSelect('b-acc') + (saved ? '' : '<label class="check" style="margin-bottom:16px"><input type="checkbox" id="b-save"> Save this biller for quick payment</label>') + '<div id="berr"></div><button class="btn btn-block btn-lg" id="b-pay">Pay ' + F.vnd(b.total) + '</button></div>';
    $('#b-pay').onclick = payBill;
  }

  function payBill() {
    const b = B.bill, acc = $('#b-acc').value, err = FB.checkFunds(acc, b.total), save = $('#b-save') && $('#b-save').checked;
    if (err) { $('#berr').innerHTML = alertBox('danger', '<b>Payment cannot be made</b><br>' + esc(err)); return; }
    $('#berr').innerHTML = '';
    authorize(b.total, 'otp', () => {
      const btn = $('#b-pay'); FB.setBtnLoading(btn, true);
      setTimeout(() => {
        const c = catOf(b.cat), tx = FB.addTx({ desc: c.name + ' bill ' + b.prov + ' — ' + b.cid, cat: 'bills', type: 'out', amount: b.total, acc, channel: 'Bill Payment', counterparty: b.prov });
        const mine = db.billers.find((x) => x.customerId === b.cid && x.provider === b.prov);
        if (mine) { mine.amount = b.total; mine.paidOn = tx.date; } else if (save) db.billers.push({ id: 'bl' + Date.now(), cat: b.cat, provider: b.prov, customerId: b.cid, label: c.name + ' — ' + b.cid, amount: b.total, due: b.due, saved: true, autopay: false });
        FB.save(); renderBillers(); renderHistory();
        FB.toast(F.vnd(b.total) + ' paid to ' + b.prov + '.', 'success', 'Bill paid');
        const done = () => { B.bill = null; $('#billOut').innerHTML = FB.empty('✅', 'Bill paid', 'Thank you. Your payment to ' + b.prov + ' is complete.'); };
        FB.receipt({ title: 'Bill payment successful', amount: b.total, ref: tx.id, onDone: done, rows: [['Reference', tx.id], ['Date & time', F.datetime(tx.date)], ['Provider', b.prov], ['Customer ID', b.cid], ['Period', b.period], ['From', FB.accLabel(FB.acc(acc))], ['Fee', 'Free']] });
        done();
      }, 1100);
    });
  }

  function renderBillers() {
    const list = db.billers; $('#billerCount').textContent = list.length;
    $('#billers').innerHTML = list.length ? list.map((b) => {
      const c = catOf(b.cat) || { icon: '🧾' };
      return '<div class="row-item" data-bl="' + b.id + '" style="flex-wrap:wrap"><div class="row-icon">' + c.icon + '</div><div class="row-main"><b>' + esc(b.label || b.provider) + '</b><small>' + esc(b.provider) + ' · ' + esc(b.customerId) + '</small></div><div class="row-amt">' + F.num(b.amount) + '<small class="muted">Due ' + F.date(b.due) + '</small></div>' +
        '<div class="flex items-center between gap-1" style="flex-basis:100%"><label class="flex items-center gap-1" style="font-size:12.5px;color:var(--text-2)"><span class="switch"><input type="checkbox" data-auto ' + (b.autopay ? 'checked' : '') + ' aria-label="Auto-pay"><span></span></span>Auto-pay</label><div class="flex gap-1"><button class="btn btn-sm" data-pay>Pay now</button><button class="btn btn-ghost btn-sm" data-del aria-label="Delete biller">🗑️</button></div></div></div>';
    }).join('') : FB.empty('🧾', 'No saved billers', 'Tick "Save this biller" when paying a bill.');
  }
  $('#billers').addEventListener('click', (e) => {
    const row = e.target.closest('[data-bl]'); if (!row) return;
    const b = db.billers.find((x) => x.id === row.dataset.bl);
    if (e.target.closest('[data-pay]')) {
      setCat(b.cat, b.provider, b.customerId); $('#billOut').scrollIntoView({ behavior: 'smooth', block: 'center' });
      FB.skeleton($('#billOut'), () => showBill(b.amount), 700);
    } else if (e.target.closest('[data-del]')) FB.confirm({ title: 'Delete biller', message: 'Remove "' + (b.label || b.provider) + '" from saved billers?', confirmLabel: 'Delete', danger: true, onConfirm: () => { db.billers = db.billers.filter((x) => x.id !== b.id); FB.save(); renderBillers(); FB.toast('Biller removed.', 'success'); } });
  });
  $('#billers').addEventListener('change', (e) => {
    const t = e.target.closest('[data-auto]'); if (!t) return;
    const b = db.billers.find((x) => x.id === t.closest('[data-bl]').dataset.bl);
    if (!t.checked) { b.autopay = false; FB.save(); return FB.toast('Auto-pay turned off for ' + b.provider + '.', 'info'); }
    t.checked = false;
    FB.modal({ title: 'Turn on auto-pay', size: 'sm', body: '<div class="center"><div class="big-ico" style="background:var(--info-50)">🔁</div></div><p class="text-2">With auto-pay, FinBank will pay <b>' + esc(b.provider) + '</b> from your Current Account on the due date each month, up to the billed amount.</p><ul class="text-2" style="padding-left:18px"><li>You get a notification before every payment.</li><li>Payments are skipped if your balance is insufficient.</li><li>You can turn it off at any time.</li></ul><p class="muted" style="font-size:12.5px;margin-top:8px">Concept demo: no automatic payments are actually executed.</p>',
      actions: [{ label: 'Not now' }, { label: 'Enable auto-pay', onClick: () => { b.autopay = true; FB.save(); renderBillers(); FB.toast('Auto-pay enabled for ' + b.provider + '.', 'success'); } }] });
  });

  /* ======================= TOP-UP ======================= */
  const T = { carrier: '', amount: 0 };
  const PREFIX = { viettel: /^(03[2-9]|086|096|097|098)/, vinaphone: /^(08[1-5]|088|091|094)/, mobifone: /^(070|07[6-9]|089|090|093)/ };
  const detect = (p) => Object.keys(PREFIX).find((k) => PREFIX[k].test(p)) || '';

  function renderTopup() {
    $('#topupBody').innerHTML = '<div class="card-head"><h3>Mobile top-up</h3></div><div id="tuForm">' +
      '<div class="field"><span class="label">Carrier</span><div class="chips" id="carriers">' + db.carriers.map((c) => '<button class="chip" data-car="' + c.id + '"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + c.color + ';margin-right:6px"></span>' + c.name + '</button>').join('') + '</div></div>' +
      '<div class="field"><label for="t-phone">Phone number</label><input class="input" id="t-phone" inputmode="numeric" maxlength="10" placeholder="09xx xxx xxx" autocomplete="off"><div class="hint" id="t-hint"><a href="#" id="t-me">Use my number (' + esc(db.user.phone) + ')</a></div></div>' +
      '<div class="field"><span class="label">Amount</span><div class="amt-grid" id="t-amts">' + db.topupAmounts.map((a) => '<button class="selectable" data-a="' + a + '">' + F.num(a) + '</button>').join('') + '</div><div class="err" id="t-amt-err" style="color:var(--danger);font-size:12.5px;margin-top:5px"></div></div>' +
      accSelect('t-acc') + '<div id="t-err"></div><button class="btn btn-block btn-lg" id="t-go">Continue</button></div>';
    const ph = $('#t-phone'), hint = $('#t-hint');
    const setCar = (id) => { T.carrier = id; $$('#carriers .chip').forEach((c) => c.classList.toggle('active', c.dataset.car === id)); };
    const onPhone = () => {
      ph.value = ph.value.replace(/\D/g, ''); const d = ph.value.length >= 3 ? detect(ph.value) : '';
      if (d) { setCar(d); hint.innerHTML = 'Detected carrier: <b>' + db.carriers.find((c) => c.id === d).name + '</b>'; }
      else if (ph.value.length >= 3) hint.textContent = 'Carrier not recognised — please pick one above.';
    };
    ph.oninput = onPhone;
    $('#t-me').onclick = (e) => { e.preventDefault(); ph.value = digits(db.user.phone); onPhone(); };
    $('#carriers').onclick = (e) => { const c = e.target.closest('[data-car]'); if (c) setCar(c.dataset.car); };
    $('#t-amts').onclick = (e) => { const a = e.target.closest('[data-a]'); if (!a) return; T.amount = +a.dataset.a; $$('#t-amts .selectable').forEach((x) => x.classList.toggle('selected', x === a)); $('#t-amt-err').textContent = ''; };
    T.carrier = ''; T.amount = 0;
    $('#t-go').onclick = () => {
      const car = db.carriers.find((c) => c.id === T.carrier);
      let ok = FB.field(ph, { required: 'Enter the phone number.', custom: (v) => (!FB.rx.phone.test(v) ? 'Enter a valid Vietnamese mobile number (10 digits).' : car && detect(v) && detect(v) !== car.id ? 'This number belongs to ' + db.carriers.find((c) => c.id === detect(v)).name + ', not ' + car.name + '.' : '') });
      if (!car) { $('#t-err').innerHTML = alertBox('danger', 'Please select a carrier.'); ok = false; } else $('#t-err').innerHTML = '';
      if (!T.amount) { $('#t-amt-err').textContent = 'Please choose an amount.'; ok = false; }
      if (!ok) return;
      const acc = $('#t-acc').value, err = FB.checkFunds(acc, T.amount);
      if (err) { $('#t-err').innerHTML = alertBox('danger', '<b>Top-up cannot be made</b><br>' + esc(err)); return; }
      const phone = ph.value, amount = T.amount;
      FB.confirm({ title: 'Confirm top-up', icon: '📱', html: true, confirmLabel: 'Confirm', message: 'Top up <b>' + F.vnd(amount) + '</b> to <b>' + phone + '</b> (' + esc(car.name) + ') from ' + esc(FB.accLabel(FB.acc(acc))) + '?',
        onConfirm: () => authorize(amount, 'otp', () => {
          FB.setBtnLoading($('#t-go'), true);
          setTimeout(() => {
            const tx = FB.addTx({ desc: 'Top-up ' + car.name + ' ' + phone, cat: 'bills', type: 'out', amount, acc, channel: 'Top-up', counterparty: car.name });
            renderHistory(); FB.toast('Topped up ' + F.vnd(amount) + ' to ' + phone + '.', 'success');
            FB.receipt({ title: 'Top-up successful', amount, ref: tx.id, onDone: renderTopup, rows: [['Reference', tx.id], ['Date & time', F.datetime(tx.date)], ['Phone number', phone], ['Carrier', car.name], ['From', FB.accLabel(FB.acc(acc))], ['Fee', 'Free']] });
            renderTopup();
          }, 1000);
        }) });
    };
  }

  /* ======================= HISTORY ======================= */
  const H = { f: 'all', page: 1 }, CH = ['Bill Payment', 'Top-up', 'QR Payment'];
  function renderHistory() {
    const all = db.transactions.filter((t) => CH.includes(t.channel)), list = all.filter((t) => H.f === 'all' || t.channel === H.f);
    $('#histChips').innerHTML = [['all', 'All']].concat(CH.map((c) => [c, c])).map((c) => '<button class="chip ' + (H.f === c[0] ? 'active' : '') + '" data-f="' + c[0] + '">' + c[1] + ' (' + (c[0] === 'all' ? all.length : all.filter((t) => t.channel === c[0]).length) + ')</button>').join('');
    $('#histSum').textContent = 'Total paid: ' + F.vnd(list.filter((t) => t.status === 'Completed').reduce((s, t) => s + t.amount, 0));
    const pageSize = 8, p = FB.pager({ el: $('#histPager'), total: list.length, pageSize, page: H.page, onChange: (n) => { H.page = n; renderHistory(); } });
    $('#histList').innerHTML = list.length ? list.slice((p - 1) * pageSize, p * pageSize).map((t) => FB.txRow(t)).join('') : FB.empty('🧾', 'No payments yet', 'Bill, top-up and QR payments will appear here.');
    if (!list.length) $('#histPager').innerHTML = '';
  }
  $('#histChips').addEventListener('click', (e) => { const c = e.target.closest('[data-f]'); if (c) { H.f = c.dataset.f; H.page = 1; renderHistory(); } });

  /* ---------- Init ---------- */
  renderQR(); renderCats(); renderBillers(); renderTopup(); renderHistory();
  FB.skeleton($('#histList'), () => renderHistory(), 400);
  const show = FB.tabs(document);
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if ($('[data-tab="' + h + '"]')) show(h); });
})();
