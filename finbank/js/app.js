/* FinBank — core: shell, helpers, modal/toast/otp, charts, persistence. Demo only. */
(function () {
  const FB = (window.FB = {});
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  FB.$ = $; FB.$$ = $$;
  FB.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  FB.DEMO_OTP = '123456';
  FB.DEMO_USER = { username: 'minhanh', password: 'Demo@1234', phone: '0912345678' };

  /* ---------- Safe storage ---------- */
  const ls = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v == null ? fb : JSON.parse(v); } catch (e) { return fb; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };
  FB.ls = ls;

  /* ---------- Mutable DB (persisted copy of window.DB) ---------- */
  const DB_KEY = 'fb_db_v1';
  const stored = ls.get(DB_KEY, null);
  FB.db = stored && stored.__v === 1 ? stored : Object.assign(JSON.parse(JSON.stringify(window.DB)), { __v: 1 });
  FB.save = () => ls.set(DB_KEY, FB.db);
  FB.resetDemo = () => { ls.del(DB_KEY); ls.del('fb_prefs'); location.reload(); };
  FB.prefs = Object.assign({ biometric: true, twoFA: true, alerts: true, limitTx: 100000000, limitDay: 500000000, lang: 'en', timeoutMin: 5 }, ls.get('fb_prefs', {}));
  FB.savePrefs = () => ls.set('fb_prefs', FB.prefs);

  /* ---------- Formatting ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const parseDate = (s) => { if (s instanceof Date) return s; const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/); return m ? new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) : new Date(s); };
  FB.fmt = {
    num: (n) => Math.round(Number(n) || 0).toLocaleString('en-US'),
    vnd: (n) => FB.fmt.num(n) + ' VND',
    short: (n) => { const a = Math.abs(n); return a >= 1e9 ? (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B' : a >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : a >= 1e3 ? Math.round(n / 1e3) + 'K' : String(n); },
    date: (s) => { const d = parseDate(s); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); },
    time: (s) => { const d = parseDate(s); return pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    datetime: (s) => FB.fmt.date(s) + ' ' + FB.fmt.time(s),
    iso: (d) => { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); },
    ago: (s) => { const m = Math.max(1, Math.round((Date.now() - parseDate(s)) / 60000)); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; },
    pct: (n, d) => (d == null ? 1 : d) === 0 ? Math.round(n) + '%' : n.toFixed(d == null ? 1 : d) + '%'
  };
  FB.parseDate = parseDate;
  FB.parseAmount = (s) => Number(String(s).replace(/[^\d]/g, '')) || 0;
  FB.mask = (num) => '**** **** ' + String(num).replace(/\s/g, '').slice(-4);
  FB.cat = (id) => FB.db.categories.find((c) => c.id === id) || FB.db.categories[FB.db.categories.length - 1];
  FB.acc = (id) => FB.db.accounts.find((a) => a.id === id);
  FB.accLabel = (a) => a.type + ' · ' + FB.mask(a.number);
  FB.statusBadge = (s) => '<span class="badge ' + ({ Completed: 'success', Pending: 'warn', Failed: 'danger', Cancelled: '' }[s] || '') + '">' + FB.esc(s) + '</span>';
  FB.totalBalance = () => FB.db.accounts.reduce((s, a) => s + a.balance, 0);
  FB.uid = (p) => (p || 'FB') + new Date().toISOString().slice(2, 10).replace(/-/g, '') + Math.floor(1000 + Math.random() * 9000);

  /* ---------- Session ---------- */
  FB.getSession = () => { try { return JSON.parse(sessionStorage.getItem('fb_session') || 'null') || ls.get('fb_session', null); } catch (e) { return ls.get('fb_session', null); } };
  FB.login = (remember) => { const s = { user: FB.db.user.id, ts: Date.now(), remember: !!remember }; if (remember) ls.set('fb_session', s); else { try { sessionStorage.setItem('fb_session', JSON.stringify(s)); } catch (e) { ls.set('fb_session', s); } } };
  FB.logout = (reason) => { ls.del('fb_session'); try { sessionStorage.removeItem('fb_session'); } catch (e) { /* ignore */ } location.href = 'index.html' + (reason ? '?msg=' + reason : ''); };

  /* ---------- Theme ---------- */
  FB.setTheme = (t) => { document.documentElement.setAttribute('data-theme', t); ls.set('fb_theme', t); };
  FB.setTheme(ls.get('fb_theme', matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  FB.toggleTheme = () => FB.setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

  /* ---------- Toast ---------- */
  let toastBox;
  FB.toast = (msg, type, title) => {
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('aria-live', 'polite'); document.body.appendChild(toastBox); }
    const t = document.createElement('div');
    t.className = 'toast ' + (type || 'info');
    const ico = { success: '✅', error: '⛔', warn: '⚠️', info: 'ℹ️' }[type || 'info'];
    t.innerHTML = '<div>' + ico + '</div><div><b>' + FB.esc(title || ({ success: 'Success', error: 'Error', warn: 'Warning', info: 'Notice' }[type || 'info'])) + '</b><span>' + FB.esc(msg) + '</span></div>';
    toastBox.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = 0; setTimeout(() => t.remove(), 300); }, 3800);
  };

  /* ---------- Modal ---------- */
  FB.modal = (o) => {
    const back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML = '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true" aria-label="' + FB.esc(o.title || 'Dialog') + '">' +
      (o.title !== false ? '<div class="modal-head"><h3>' + FB.esc(o.title || '') + '</h3><button class="modal-close" aria-label="Close">✕</button></div>' : '') +
      '<div class="modal-body"></div>' + (o.actions && o.actions.length ? '<div class="modal-foot"></div>' : '') + '</div>';
    const body = $('.modal-body', back);
    if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.appendChild(o.body);
    const api = { el: back, body, close() { back.remove(); document.removeEventListener('keydown', esc); if (o.onClose) o.onClose(); } };
    const esc = (e) => { if (e.key === 'Escape' && o.dismissable !== false) api.close(); };
    document.addEventListener('keydown', esc);
    const x = $('.modal-close', back); if (x) x.onclick = api.close;
    back.addEventListener('mousedown', (e) => { if (e.target === back && o.dismissable !== false) api.close(); });
    const foot = $('.modal-foot', back);
    (o.actions || []).forEach((a) => {
      const b = document.createElement('button');
      b.className = 'btn ' + (a.class || 'btn-outline'); b.textContent = a.label;
      b.onclick = () => { if (a.onClick) { const r = a.onClick(api, b); if (r === false) return; } if (!a.keepOpen) api.close(); };
      foot.appendChild(b);
    });
    document.body.appendChild(back);
    const f = $('input, select, textarea, .btn:last-child', back); if (f && o.autofocus !== false) setTimeout(() => f.focus(), 30);
    return api;
  };
  FB.confirm = (o) => FB.modal({
    title: o.title || 'Please confirm', size: 'sm',
    body: '<div class="center"><div class="big-ico" style="background:var(' + (o.danger ? '--danger-50' : '--warn-50') + ')">' + (o.icon || (o.danger ? '⚠️' : '❓')) + '</div><p class="text-2">' + (o.html ? o.message : FB.esc(o.message)) + '</p></div>',
    actions: [{ label: o.cancelLabel || 'Cancel' }, { label: o.confirmLabel || 'Confirm', class: o.danger ? 'btn-danger' : '', onClick: () => { if (o.onConfirm) o.onConfirm(); } }]
  });

  /* ---------- OTP (demo code 123456) ---------- */
  FB.otp = (o) => {
    let left = 60, tries = 0, timer;
    const m = FB.modal({
      title: o.title || 'Enter OTP', size: 'sm', dismissable: false, onClose: () => clearInterval(timer),
      body: '<p class="text-2 center">We sent a 6-digit code to <b>' + FB.esc(o.phone || '0912 *** 678') + '</b>.<br><small class="muted">Demo code: <b>' + FB.DEMO_OTP + '</b></small></p>' +
        '<div class="otp-row">' + '<input inputmode="numeric" maxlength="1" aria-label="Digit">'.repeat(6) + '</div>' +
        '<p class="center neg" data-err style="min-height:20px;font-size:13px"></p><p class="center muted" data-timer style="font-size:13px"></p>',
      actions: [{ label: 'Cancel', onClick: () => { if (o.onCancel) o.onCancel(); } }, { label: o.confirmLabel || 'Verify', keepOpen: true, onClick: (api, btn) => verify(api, btn) }]
    });
    const ins = $$('.otp-row input', m.el), row = $('.otp-row', m.el), err = $('[data-err]', m.el), tm = $('[data-timer]', m.el);
    const tick = () => { tm.innerHTML = left > 0 ? 'Code expires in <b>' + left + 's</b>' : '<a href="#" data-resend>Resend code</a>'; const r = $('[data-resend]', tm); if (r) r.onclick = (e) => { e.preventDefault(); left = 60; ins.forEach((i) => (i.value = '')); ins[0].focus(); err.textContent = ''; FB.toast('A new OTP has been sent.', 'info'); }; };
    tick(); timer = setInterval(() => { if (left > 0) left--; tick(); }, 1000);
    ins.forEach((inp, i) => {
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, ''); if (inp.value && ins[i + 1]) ins[i + 1].focus(); if (ins.every((x) => x.value)) verify(m, null); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); });
      inp.addEventListener('paste', (e) => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6); if (t) { e.preventDefault(); t.split('').forEach((c, k) => (ins[k].value = c)); ins[Math.min(t.length, 5)].focus(); if (t.length === 6) verify(m, null); } });
    });
    function verify(api) {
      const code = ins.map((i) => i.value).join('');
      if (code.length < 6) { err.textContent = 'Please enter all 6 digits.'; return; }
      if (left <= 0) { err.textContent = 'Code expired. Please request a new one.'; return; }
      if (code === FB.DEMO_OTP) { api.close(); if (o.onSuccess) o.onSuccess(); return; }
      tries++; row.classList.remove('err'); void row.offsetWidth; row.classList.add('err');
      err.textContent = tries >= 3 ? 'Too many attempts.' : 'Incorrect OTP. ' + (3 - tries) + ' attempt(s) left.';
      ins.forEach((i) => (i.value = '')); ins[0].focus();
      if (tries >= 3) { api.close(); if (o.onFail) o.onFail(); else FB.toast('Too many wrong OTP attempts. Transaction cancelled.', 'error'); }
    }
    return m;
  };

  /* ---------- Receipt ---------- */
  FB.receiptHTML = (o) => '<div class="center"><div class="success-anim ' + (o.ok === false ? 'fail' : '') + '">' + (o.ok === false ? '✕' : '✓') + '</div><h3>' + FB.esc(o.title || 'Transaction successful') + '</h3>' +
    (o.amount != null ? '<div style="font-size:28px;font-weight:800;margin:6px 0 16px">' + FB.fmt.vnd(o.amount) + '</div>' : '') + '</div>' +
    '<div class="receipt">' + (o.rows || []).map((r) => '<div class="r-row"><span>' + FB.esc(r[0]) + '</span><span>' + FB.esc(r[1]) + '</span></div>').join('') + '</div>';
  FB.receipt = (o) => FB.modal({
    title: o.modalTitle || 'Receipt', body: FB.receiptHTML(o),
    actions: [{ label: '🖨️ Print', keepOpen: true, onClick: () => window.print() },
      { label: '⬇️ Download', keepOpen: true, onClick: () => FB.download('receipt-' + (o.ref || Date.now()) + '.txt', (o.title || 'Receipt') + '\n' + (o.amount != null ? FB.fmt.vnd(o.amount) + '\n' : '') + (o.rows || []).map((r) => r[0] + ': ' + r[1]).join('\n') + '\n\nFinBank — demo receipt (not a real transaction)') },
      { label: 'Done', class: '', onClick: o.onDone }]
  });
  FB.download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); FB.toast('Downloaded ' + name, 'success'); };
  FB.csv = (rows) => rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');

  /* ---------- Data mutations ---------- */
  FB.notify = (type, title, body) => { FB.db.notifications.unshift({ id: 'n' + Date.now(), type, title, body, time: FB.fmt.iso(), read: false }); FB.save(); FB.refreshBell && FB.refreshBell(); };
  // o: {desc, cat, type:'in'|'out', amount, acc, status?, counterparty?, channel?, notify?:false}
  FB.addTx = (o) => {
    const tx = Object.assign({ id: FB.uid('FB'), date: FB.fmt.iso(), status: 'Completed', channel: 'Interbank', counterparty: '', acc: 'acc1', cat: 'other' }, o);
    const a = FB.acc(tx.acc);
    if (a && tx.status === 'Completed') { const s = tx.type === 'out' ? -1 : 1; a.balance += s * tx.amount; a.available += s * tx.amount; }
    FB.db.transactions.unshift(tx);
    if (o.notify !== false) FB.notify('money', tx.type === 'out' ? 'Payment successful' : 'Money received', (tx.type === 'out' ? 'You paid ' : 'You received ') + FB.fmt.vnd(tx.amount) + ' — ' + tx.desc);
    FB.save(); return tx;
  };
  FB.checkFunds = (accId, amount) => { const a = FB.acc(accId); if (!a) return 'Please select an account.'; if (amount > a.available) return 'Insufficient balance. Available: ' + FB.fmt.vnd(a.available); if (amount > FB.prefs.limitTx) return 'Amount exceeds your per-transaction limit (' + FB.fmt.vnd(FB.prefs.limitTx) + ').'; return ''; };
  FB.accountOptions = (sel) => FB.db.accounts.map((a) => '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' + FB.esc(FB.accLabel(a)) + ' — ' + FB.fmt.vnd(a.available) + '</option>').join('');

  /* ---------- UI helpers ---------- */
  FB.txRow = (t, opts) => {
    const c = FB.cat(t.cat), o = opts || {};
    return '<div class="row-item clickable" data-tx="' + t.id + '"><div class="row-icon" style="background:' + c.color + '22">' + c.icon + '</div>' +
      '<div class="row-main"><span class="t">' + FB.esc(t.desc) + '</span><small>' + FB.fmt.datetime(t.date) + ' · ' + FB.esc(c.name) + (o.status !== false && t.status !== 'Completed' ? ' · ' + t.status : '') + '</small></div>' +
      '<div class="row-amt ' + (t.type === 'in' ? 'pos' : '') + '">' + (t.type === 'in' ? '+' : '−') + FB.fmt.num(t.amount) + '<small class="muted">VND</small></div></div>';
  };
  FB.txDetail = (id) => {
    const t = FB.db.transactions.find((x) => x.id === id); if (!t) return;
    const a = FB.acc(t.acc), c = FB.cat(t.cat);
    FB.receipt({ modalTitle: 'Transaction details', ok: t.status !== 'Failed' && t.status !== 'Cancelled', title: t.status === 'Completed' ? (t.type === 'in' ? 'Money received' : 'Payment successful') : 'Transaction ' + t.status.toLowerCase(), amount: t.amount, ref: t.id,
      rows: [['Reference', t.id], ['Status', t.status], ['Date & time', FB.fmt.datetime(t.date)], ['Description', t.desc], ['Counterparty', t.counterparty || '—'], ['Category', c.name], ['Channel', t.channel || '—'], ['Account', a ? FB.accLabel(a) : '—'], ['Fee', '0 VND']] });
  };
  FB.delegateTx = (root) => (root || document).addEventListener('click', (e) => { const r = e.target.closest('[data-tx]'); if (r) FB.txDetail(r.dataset.tx); });
  FB.skeleton = (el, render, ms) => { el.innerHTML = '<div class="skeleton sk-line" style="width:40%"></div><div class="skeleton sk-box"></div><div class="skeleton sk-line"></div><div class="skeleton sk-line" style="width:70%"></div>'; setTimeout(() => { el.innerHTML = ''; render(el); }, ms == null ? 500 : ms); };
  FB.empty = (icon, title, sub) => '<div class="empty"><div class="ei">' + icon + '</div><b>' + FB.esc(title) + '</b><p>' + FB.esc(sub || '') + '</p></div>';
  FB.setBtnLoading = (btn, on) => { btn.classList.toggle('loading', on); btn.disabled = on; };
  // Fake async: shows spinner on button then calls cb
  FB.busy = (btn, ms, cb) => { FB.setBtnLoading(btn, true); setTimeout(() => { FB.setBtnLoading(btn, false); cb(); }, ms || 800); };

  FB.tabs = (root, onChange) => {
    root = root || document;
    const tabs = $$('[data-tab]', root), panels = $$('[data-panel]', root);
    const show = (id) => { tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === id)); panels.forEach((p) => p.classList.toggle('active', p.dataset.panel === id)); if (onChange) onChange(id); };
    tabs.forEach((t) => t.addEventListener('click', () => { show(t.dataset.tab); if (t.dataset.hash !== undefined) history.replaceState(null, '', '#' + t.dataset.tab); }));
    const h = location.hash.slice(1); show(tabs.some((t) => t.dataset.tab === h) ? h : (tabs.find((t) => t.classList.contains('active')) || tabs[0]).dataset.tab);
    return show;
  };

  // Form validation. rules: {required, min, max, pattern, msg, custom(v)->string}
  FB.field = (input, rules) => {
    const wrap = input.closest('.field') || input.parentElement; let err = $('.err', wrap);
    if (!err) { err = document.createElement('div'); err.className = 'err'; wrap.appendChild(err); }
    const v = input.value.trim(); let msg = '';
    if (rules.required && !v) msg = rules.required === true ? 'This field is required.' : rules.required;
    else if (v && rules.pattern && !rules.pattern.test(v)) msg = rules.msg || 'Invalid format.';
    else if (v && rules.min != null && FB.parseAmount(v) < rules.min) msg = 'Minimum is ' + FB.fmt.num(rules.min) + '.';
    else if (v && rules.max != null && FB.parseAmount(v) > rules.max) msg = 'Maximum is ' + FB.fmt.num(rules.max) + '.';
    else if (rules.custom) msg = rules.custom(v) || '';
    wrap.classList.toggle('error', !!msg); err.textContent = msg; return !msg;
  };
  FB.rx = { phone: /^0(3|5|7|8|9)\d{8}$/, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, account: /^\d{6,16}$/ };
  // Live thousand-separator on amount inputs
  FB.amountInput = (input) => input.addEventListener('input', () => { const n = FB.parseAmount(input.value); input.value = n ? FB.fmt.num(n) : ''; });

  FB.pager = (o) => { // {el,total,pageSize,page,onChange}
    const pages = Math.max(1, Math.ceil(o.total / o.pageSize)), p = Math.min(o.page, pages);
    const from = o.total ? (p - 1) * o.pageSize + 1 : 0, to = Math.min(o.total, p * o.pageSize);
    let btns = ''; for (let i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - p) <= 1) btns += '<button data-p="' + i + '" class="' + (i === p ? 'active' : '') + '">' + i + '</button>'; else if (Math.abs(i - p) === 2) btns += '<span>…</span>';
    o.el.innerHTML = '<div class="pager"><span>Showing ' + from + '–' + to + ' of ' + o.total + '</span><div class="pages"><button data-p="' + (p - 1) + '" ' + (p <= 1 ? 'disabled' : '') + '>‹</button>' + btns + '<button data-p="' + (p + 1) + '" ' + (p >= pages ? 'disabled' : '') + '>›</button></div></div>';
    $$('button[data-p]', o.el).forEach((b) => (b.onclick = () => o.onChange(+b.dataset.p)));
    return p;
  };
  FB.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms || 250); }; };
  FB.pmt = (P, annualPct, n) => { const r = annualPct / 1200; return r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n)); };

  /* ---------- Charts (inline SVG) ---------- */
  const tipFor = (el) => { let t = $('.chart-tip', el); if (!t) { t = document.createElement('div'); t.className = 'chart-tip'; el.appendChild(t); } return t; };
  const niceMax = (v) => { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; };
  const showTip = (el, e, html) => { const t = tipFor(el), r = el.getBoundingClientRect(); t.innerHTML = html; t.style.display = 'block'; t.style.left = e.clientX - r.left + 'px'; t.style.top = e.clientY - r.top + 'px'; };
  const hideTip = (el) => { tipFor(el).style.display = 'none'; };
  const axes = (labels, max, W, H, L, B, fmt) => {
    let s = ''; for (let i = 0; i <= 4; i++) { const y = H - B - ((H - B - 10) * i) / 4; s += '<line class="grid-l" x1="' + L + '" x2="' + W + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + (fmt || FB.fmt.short)((max * i) / 4) + '</text>'; }
    return s;
  };
  FB.chart = {
    // {el, labels, series:[{name,data,color,area?}], height?}
    line(o) {
      const W = 640, H = o.height || 260, L = 46, B = 26, all = o.series.flatMap((s) => s.data), max = niceMax(Math.max.apply(null, all)), n = o.labels.length;
      const x = (i) => L + ((W - L - 10) * i) / Math.max(1, n - 1), y = (v) => H - B - ((H - B - 10) * v) / max;
      let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + FB.esc(o.title || 'Line chart') + '">' + axes(o.labels, max, W, H, L, B, o.fmt);
      o.labels.forEach((l, i) => (svg += '<text x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + l + '</text>'));
      o.series.forEach((s, k) => {
        const pts = s.data.map((v, i) => [x(i), y(v)]);
        const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
        if (s.area !== false) svg += '<defs><linearGradient id="lg' + k + o.el.id + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + s.color + '" stop-opacity=".25"/><stop offset="1" stop-color="' + s.color + '" stop-opacity="0"/></linearGradient></defs><path d="' + d + ' L' + x(n - 1) + ' ' + (H - B) + ' L' + L + ' ' + (H - B) + 'Z" fill="url(#lg' + k + o.el.id + ')"/>';
        svg += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
        pts.forEach((p) => (svg += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.5" fill="var(--surface)" stroke="' + s.color + '" stroke-width="2"/>'));
      });
      o.labels.forEach((l, i) => (svg += '<rect data-i="' + i + '" x="' + (x(i) - (W - L) / n / 2) + '" y="0" width="' + (W - L) / n + '" height="' + (H - B) + '" fill="transparent"/>'));
      o.el.classList.add('chart'); o.el.innerHTML = svg + '</svg>' + FB.chart.legend(o.series);
      $$('rect[data-i]', o.el).forEach((r) => { r.onmousemove = (e) => { const i = +r.dataset.i; showTip(o.el, e, '<b>' + o.labels[i] + '</b><br>' + o.series.map((s) => s.name + ': ' + (o.fmtTip || FB.fmt.vnd)(s.data[i])).join('<br>')); }; r.onmouseleave = () => hideTip(o.el); });
    },
    bar(o) {
      const W = 640, H = o.height || 260, L = 46, B = 26, all = o.series.flatMap((s) => s.data), max = niceMax(Math.max.apply(null, all)), n = o.labels.length, k = o.series.length;
      const band = (W - L - 10) / n, bw = Math.min(26, (band * 0.7) / k), y = (v) => H - B - ((H - B - 10) * v) / max;
      let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + FB.esc(o.title || 'Bar chart') + '">' + axes(o.labels, max, W, H, L, B, o.fmt);
      o.labels.forEach((l, i) => {
        const cx = L + band * i + band / 2; svg += '<text x="' + cx + '" y="' + (H - 6) + '" text-anchor="middle">' + l + '</text>';
        o.series.forEach((s, j) => { const bx = cx - (bw * k) / 2 + bw * j; svg += '<rect data-i="' + i + '" x="' + bx + '" y="' + y(s.data[i]) + '" width="' + (bw - 2) + '" height="' + (H - B - y(s.data[i])) + '" rx="4" fill="' + s.color + '"/>'; });
      });
      o.el.classList.add('chart'); o.el.innerHTML = svg + '</svg>' + FB.chart.legend(o.series);
      $$('rect[data-i]', o.el).forEach((r) => { r.onmousemove = (e) => { const i = +r.dataset.i; showTip(o.el, e, '<b>' + o.labels[i] + '</b><br>' + o.series.map((s) => s.name + ': ' + (o.fmtTip || FB.fmt.vnd)(s.data[i])).join('<br>')); }; r.onmouseleave = () => hideTip(o.el); });
    },
    // {el, items:[{label,value,color}], center:{title,value}}
    donut(o) {
      const total = o.items.reduce((s, i) => s + i.value, 0) || 1, R = 70, C = 2 * Math.PI * R; let off = 0, arcs = '';
      o.items.forEach((it, i) => { const len = (it.value / total) * C; arcs += '<circle data-i="' + i + '" r="' + R + '" cx="90" cy="90" fill="none" stroke="' + it.color + '" stroke-width="26" stroke-dasharray="' + Math.max(0, len - 2) + ' ' + C + '" stroke-dashoffset="' + -off + '" transform="rotate(-90 90 90)"/>'; off += len; });
      const cen = o.center ? '<text x="90" y="86" text-anchor="middle" style="font-size:11px">' + FB.esc(o.center.title) + '</text><text x="90" y="106" text-anchor="middle" style="font-size:15px;font-weight:700;fill:var(--text)">' + FB.esc(o.center.value) + '</text>' : '';
      o.el.innerHTML = '<div class="donut-wrap"><div class="chart"><svg viewBox="0 0 180 180" role="img" aria-label="' + FB.esc(o.title || 'Donut chart') + '">' + arcs + cen + '</svg></div><div class="donut-legend">' + o.items.map((it) => '<div><i style="background:' + it.color + '"></i><span>' + FB.esc(it.label) + '</span><span>' + Math.round((it.value / total) * 100) + '%</span></div>').join('') + '</div></div>';
      const ch = $('.chart', o.el);
      $$('circle[data-i]', o.el).forEach((c) => { c.onmousemove = (e) => { const it = o.items[+c.dataset.i]; showTip(ch, e, '<b>' + FB.esc(it.label) + '</b><br>' + FB.fmt.vnd(it.value)); }; c.onmouseleave = () => hideTip(ch); });
    },
    spark(data, color, w, h) {
      w = w || 100; h = h || 32; const mx = Math.max.apply(null, data), mn = Math.min.apply(null, data), r = mx - mn || 1;
      return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '"><path d="' + data.map((v, i) => (i ? 'L' : 'M') + ((w * i) / (data.length - 1)).toFixed(1) + ' ' + (h - 3 - ((h - 6) * (v - mn)) / r).toFixed(1)).join(' ') + '" fill="none" stroke="' + (color || 'var(--accent)') + '" stroke-width="2" stroke-linecap="round"/></svg>';
    },
    ring(el, pct, color, label, sub) {
      const R = 62, C = 2 * Math.PI * R;
      el.innerHTML = '<div class="score-ring"><svg viewBox="0 0 150 150"><circle cx="75" cy="75" r="' + R + '" fill="none" stroke="var(--surface-2)" stroke-width="14"/><circle cx="75" cy="75" r="' + R + '" fill="none" stroke="' + color + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + (C * pct) / 100 + ' ' + C + '" transform="rotate(-90 75 75)"/></svg><div class="n"><div>' + label + '<small>' + (sub || '') + '</small></div></div></div>';
    },
    legend: (series) => '<div class="legend">' + series.map((s) => '<span><i style="background:' + s.color + '"></i>' + FB.esc(s.name) + '</span>').join('') + '</div>'
  };

  /* ---------- App shell ---------- */
  const NAV = [
    ['Main', [['dashboard', '🏠', 'Dashboard'], ['accounts', '💼', 'Accounts'], ['transfers', '💸', 'Transfers'], ['payments', '🧾', 'Payments & QR'], ['transactions', '📊', 'Transactions']]],
    ['Products', [['savings', '🏦', 'Savings'], ['loans', '📑', 'Loans'], ['cards', '💳', 'Cards'], ['finance', '📈', 'Personal Finance']]],
    ['Account', [['notifications', '🔔', 'Notifications'], ['locator', '📍', 'Branches & ATMs'], ['support', '💬', 'Help & Support'], ['security', '🛡️', 'Security'], ['profile', '👤', 'Profile']]]
  ];
  const BOTTOM = [['dashboard', '🏠', 'Home', 'dashboard.html'], ['accounts', '💼', 'Accounts', 'accounts.html'], ['qr', '▦', 'QR Pay', 'payments.html#qr'], ['transfers', '💸', 'Transfer', 'transfers.html'], ['more', '☰', 'More', '#']];

  FB.refreshBell = () => {
    const n = FB.db.notifications.filter((x) => !x.read).length;
    $$('[data-bell]').forEach((b) => { b.textContent = n; b.style.display = n ? '' : 'none'; });
    $$('[data-nav-count]').forEach((b) => { b.textContent = n; b.style.display = n ? '' : 'none'; });
    const list = $('#bellList');
    if (list) list.innerHTML = FB.db.notifications.slice(0, 5).map((x) => '<div class="n-item ' + (x.read ? '' : 'unread') + '"><b>' + FB.esc(x.title) + '</b>' + FB.esc(x.body.slice(0, 80)) + '</div>').join('') || FB.empty('🔔', 'No notifications');
  };

  function buildShell() {
    const page = document.body.dataset.page, title = document.body.dataset.title || 'FinBank', u = FB.db.user;
    const content = document.getElementById('page');
    const app = document.createElement('div'); app.className = 'app';
    app.innerHTML =
      '<aside class="sidebar"><a class="brand" href="dashboard.html"><span class="brand-mark">F</span>FinBank</a><nav class="nav" aria-label="Main">' +
      NAV.map((g) => '<div class="nav-label">' + g[0] + '</div>' + g[1].map((n) => '<a href="' + n[0] + '.html" class="' + (n[0] === page ? 'active' : '') + '"' + (n[0] === page ? ' aria-current="page"' : '') + '><span class="ico">' + n[1] + '</span>' + n[2] + (n[0] === 'notifications' ? '<span class="badge-count" data-nav-count></span>' : '') + '</a>').join('')).join('') +
      '</nav><div class="sidebar-foot"><strong>Hotline 1900 5555</strong>24/7 support · Demo project, no real money</div></aside>' +
      '<div class="main-wrap"><header class="topbar"><span class="page-title">' + FB.esc(title) + '</span><div class="spacer"></div>' +
      '<form class="search-box" id="globalSearch" role="search"><input type="search" placeholder="Search transactions…" aria-label="Search transactions"></form>' +
      '<button class="icon-btn" id="themeBtn" aria-label="Toggle theme" title="Toggle theme">🌓</button>' +
      '<div class="menu-wrap"><button class="icon-btn" id="bellBtn" aria-label="Notifications">🔔<span class="dot" data-bell></span></button><div class="dropdown" id="bellMenu" style="min-width:320px"><div class="flex between items-center" style="padding:8px 12px"><b>Notifications</b><a href="notifications.html">View all</a></div><div class="notif-list" id="bellList"></div></div></div>' +
      '<div class="menu-wrap"><button class="profile-btn" id="profBtn" aria-label="Account menu"><span class="avatar">' + u.initials + '</span><span class="who"><b>' + FB.esc(u.short) + '</b><small>' + u.tier + ' member</small></span></button>' +
      '<div class="dropdown" id="profMenu"><div style="padding:10px 12px"><b>' + FB.esc(u.name) + '</b><div class="muted" style="font-size:12.5px">' + FB.esc(u.email) + '</div></div><hr><a href="profile.html">👤 My profile</a><a href="security.html">🛡️ Security center</a><a href="support.html">💬 Help & support</a><button id="resetBtn">♻️ Reset demo data</button><hr><button id="logoutBtn" style="color:var(--danger)">↩ Log out</button></div></div>' +
      '</header><main class="content" id="content" tabindex="-1"></main></div>' +
      '<nav class="bottomnav" aria-label="Mobile">' + BOTTOM.map((b) => '<a href="' + b[3] + '" class="' + (b[0] === page || (b[0] === 'qr' && page === 'payments' && location.hash === '#qr') ? 'active' : '') + (b[0] === 'qr' ? ' qr' : '') + '" data-b="' + b[0] + '"><span class="ico">' + b[1] + '</span>' + b[2] + '</a>').join('') + '</nav>' +
      '<div class="more-sheet" id="moreSheet"><div class="sheet"><div class="flex between items-center"><h3>All services</h3><button class="modal-close" id="moreClose" aria-label="Close">✕</button></div><div class="more-grid">' + NAV.flatMap((g) => g[1]).map((n) => '<a href="' + n[0] + '.html"><span class="ico">' + n[1] + '</span>' + n[2] + '</a>').join('') + '<a href="#" id="moreTheme"><span class="ico">🌓</span>Theme</a><a href="#" id="moreLogout"><span class="ico">↩</span>Log out</a></div></div></div>';
    document.body.insertBefore(app, document.body.firstChild);
    $('#content').appendChild(content);

    const closeMenus = () => $$('.dropdown.open').forEach((d) => d.classList.remove('open'));
    [['bellBtn', 'bellMenu'], ['profBtn', 'profMenu']].forEach(([b, m]) => $('#' + b).addEventListener('click', (e) => { e.stopPropagation(); const open = $('#' + m).classList.contains('open'); closeMenus(); if (!open) $('#' + m).classList.add('open'); }));
    document.addEventListener('click', (e) => { if (!e.target.closest('.dropdown')) closeMenus(); });
    $('#themeBtn').onclick = FB.toggleTheme;
    const doLogout = () => FB.confirm({ title: 'Log out', message: 'Are you sure you want to log out of FinBank?', confirmLabel: 'Log out', onConfirm: () => FB.logout() });
    $('#logoutBtn').onclick = doLogout; $('#moreLogout').onclick = (e) => { e.preventDefault(); doLogout(); };
    $('#moreTheme').onclick = (e) => { e.preventDefault(); FB.toggleTheme(); };
    $('#resetBtn').onclick = () => FB.confirm({ title: 'Reset demo data', message: 'This restores all mock data and settings to their defaults.', confirmLabel: 'Reset', onConfirm: FB.resetDemo });
    $('[data-b="more"]').onclick = (e) => { e.preventDefault(); $('#moreSheet').classList.add('open'); };
    $('#moreClose').onclick = () => $('#moreSheet').classList.remove('open');
    $('#moreSheet').addEventListener('click', (e) => { if (e.target.id === 'moreSheet') $('#moreSheet').classList.remove('open'); });
    $('#globalSearch').onsubmit = (e) => { e.preventDefault(); location.href = 'transactions.html?q=' + encodeURIComponent($('input', e.target).value); };
    window.addEventListener('hashchange', () => $$('.bottomnav a').forEach((a) => a.classList.toggle('active', a.dataset.b === (page === 'payments' && location.hash === '#qr' ? 'qr' : page))));
    FB.refreshBell();
  }

  /* ---------- Idle timeout simulation ---------- */
  function idleWatch() {
    let last = Date.now(), warned = false;
    ['click', 'keydown', 'mousemove', 'touchstart'].forEach((ev) => document.addEventListener(ev, () => { if (!warned) last = Date.now(); }, { passive: true }));
    setInterval(() => {
      const lim = FB.prefs.timeoutMin * 60000;
      if (warned || Date.now() - last < lim - 30000) return;
      warned = true; let left = 30;
      const m = FB.modal({ title: 'Are you still there?', size: 'sm', dismissable: false, body: '<div class="center"><div class="big-ico" style="background:var(--warn-50)">⏱️</div><p>For your security you will be logged out in <b id="idleLeft">30</b>s due to inactivity.</p></div>',
        actions: [{ label: 'Log out', onClick: () => FB.logout() }, { label: 'Stay signed in', onClick: () => { warned = false; last = Date.now(); clearInterval(t); } }] });
      const t = setInterval(() => { left--; const s = $('#idleLeft'); if (s) s.textContent = left; if (left <= 0) { clearInterval(t); FB.logout('timeout'); } }, 1000);
    }, 5000);
  }
  FB.demoTimeout = () => { FB.prefs.timeoutMin = 0.6; FB.savePrefs(); FB.toast('Idle timeout set to ~36s. Stay idle to see the warning.', 'info'); };

  /* ---------- Init ---------- */
  FB.init = () => {
    const shell = document.body.dataset.shell;
    if (shell === 'none') return; // login / admin build their own
    if (!FB.getSession()) { location.replace('index.html?msg=login'); return; }
    if (document.getElementById('page')) { buildShell(); idleWatch(); FB.delegateTx(document); }
  };
  FB.init();
})();
