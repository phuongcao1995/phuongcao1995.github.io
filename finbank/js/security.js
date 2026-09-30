/* FinBank — Security Center */
(function () {
  const db = FB.db, P = FB.prefs, $ = FB.$, $$ = FB.$$, f = FB.fmt, esc = FB.esc;
  const MAX_TX = 500000000, MAX_DAY = 1000000000;
  Object.assign(P, { twoFAMethod: P.twoFAMethod || 'sms', pin: P.pin || '123456', pwdChanged: P.pwdChanged || '2026-03-02' });
  P.secAlerts = Object.assign({ login: true, tx: true, device: true, limit: true }, P.secAlerts);
  P.privacy = Object.assign({ hideBalance: false, share: false, marketing: false }, P.privacy);
  db.sessions = db.sessions || [
    { id: 's1', device: 'Windows PC — Chrome', location: 'Ho Chi Minh City', ip: '113.161.xx.xx', started: '2026-09-30 08:00', current: true },
    { id: 's2', device: 'iPhone 15 Pro — FinBank App', location: 'Ho Chi Minh City', ip: '27.65.xx.xx', started: '2026-09-30 07:41', current: false },
    { id: 's3', device: 'MacBook Air — Safari', location: 'Ho Chi Minh City', ip: '113.161.xx.xx', started: '2026-09-29 21:05', current: false }
  ];
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); };
  const save = () => { FB.savePrefs(); FB.save(); score(); };
  const sw = (id, t, d, on) => '<div class="setting-row"><div><b>' + t + '</b><p>' + d + '</p></div><label class="switch"><input type="checkbox" id="' + id + '" ' + (on ? 'checked' : '') + ' aria-label="' + t + '"><span></span></label></div>';
  const st = document.createElement('style');
  st.textContent = '.meter{height:8px;border-radius:4px;background:var(--surface-2);border:1px solid var(--border);overflow:hidden;margin:8px 0 4px}.meter i{display:block;height:100%;width:0;transition:width .3s,background .3s}' +
    '.rules{list-style:none;padding:0;margin:10px 0 0;display:grid;gap:4px;font-size:13px;color:var(--text-3)}.rules li.ok{color:var(--accent)}.rules li::before{content:"○ "}.rules li.ok::before{content:"✔ "}' +
    '.pin-in{letter-spacing:.5em;text-align:center;font-size:20px;font-weight:700}.bio{width:110px;height:110px;border-radius:50%;margin:8px auto 14px;display:grid;place-items:center;font-size:54px;background:var(--primary-50);position:relative}' +
    '.bio.scan::after{content:"";position:absolute;inset:-6px;border-radius:50%;border:3px solid var(--primary);animation:pulse 1s infinite}.bio.done{background:var(--accent-50)}@keyframes pulse{from{transform:scale(.9);opacity:1}to{transform:scale(1.25);opacity:0}}' +
    'tr.failed td{background:var(--danger-50)}.danger-zone{border-color:var(--danger)}.range-val{font-size:26px;font-weight:800}';
  document.head.appendChild(st);

  /* ---------- Score ---------- */
  function score() {
    const days = Math.round((FB.parseDate('2026-09-30') - FB.parseDate(P.pwdChanged)) / 864e5);
    const checks = [
      [P.twoFA, 25, 'Two-factor authentication', 'Enable 2FA in Authentication'], [P.biometric, 15, 'Biometric login', 'Turn on fingerprint / Face ID'],
      [days < 180, 15, 'Password updated recently', 'Change your password (last changed ' + days + ' days ago)'], [P.pin !== '123456', 10, 'Custom PIN', 'Replace the default PIN'],
      [!db.devices.some((d) => !d.trusted), 15, 'No untrusted devices', 'Remove unknown devices'], [P.secAlerts.login && P.secAlerts.tx, 10, 'Security alerts on', 'Enable login and transaction alerts'],
      [P.limitDay <= 500000000, 10, 'Reasonable daily limit', 'Lower your daily limit to 500M or less']];
    const total = checks.filter((c) => c[0]).reduce((s, c) => s + c[1], 0), todo = checks.filter((c) => !c[0]);
    $('#scoreCard').innerHTML = '<div class="flex items-center gap-2 wrap"><div id="scRing" style="width:150px"></div><div class="grow" style="min-width:220px"><h3>Your security score: ' + total + '/100 — ' + (total >= 85 ? 'Strong' : total >= 60 ? 'Fair' : 'Weak') + '</h3>' +
      (todo.length ? '<p class="text-2 mt-1">Recommended actions</p><ul style="margin:6px 0 0;padding-left:18px;font-size:13.5px">' + todo.map((c) => '<li>' + esc(c[3]) + ' <span class="muted">(+' + c[1] + ')</span></li>').join('') + '</ul>' : '<p class="text-2 mt-1">🎉 Everything looks great. Keep your devices and contact details up to date.</p>') +
      '<div class="flex gap-1 wrap mt-2"><a class="btn btn-outline btn-sm" href="cards.html">💳 Card controls</a><button class="btn btn-outline btn-sm" id="idleBtn">⏱ Simulate idle timeout</button></div></div></div>';
    FB.chart.ring($('#scRing'), total, total >= 85 ? 'var(--accent)' : total >= 60 ? 'var(--warn)' : 'var(--danger)', total, 'of 100');
    $('#idleBtn').onclick = FB.demoTimeout;
  }

  /* ---------- Password ---------- */
  const RULES = [['At least 8 characters', (v) => v.length >= 8], ['One uppercase letter', (v) => /[A-Z]/.test(v)], ['One lowercase letter', (v) => /[a-z]/.test(v)], ['One number', (v) => /\d/.test(v)], ['One special character', (v) => /[^A-Za-z0-9]/.test(v)]];
  function password() {
    $('#pPassword').innerHTML = '<div class="grid g2"><div class="card"><div class="card-head"><h3>Change password</h3></div><p class="muted mb-2" style="font-size:13px">Last changed ' + f.date(P.pwdChanged) + '</p><form id="pwF" novalidate>' +
      ['cur|Current password|current-password', 'nw|New password|new-password', 'cf|Confirm new password|new-password'].map((s) => { const a = s.split('|'); return '<div class="field"><label for="pw-' + a[0] + '">' + a[1] + '</label><div class="input-group"><input class="input" type="password" id="pw-' + a[0] + '" autocomplete="' + a[2] + '"><button type="button" class="toggle" data-eye="pw-' + a[0] + '" aria-label="Show or hide">👁</button></div>' + (a[0] === 'nw' ? '<div class="meter"><i id="meter"></i></div><small id="meterTxt" class="muted">Enter a new password</small>' : '') + '</div>'; }).join('') +
      '<button class="btn btn-block" id="pwSave" type="submit">Update password</button></form></div><div class="card"><h3 class="mb-2">Password requirements</h3><ul class="rules" id="rules">' + RULES.map((r) => '<li>' + r[0] + '</li>').join('') + '<li id="ruleDiff">Different from current password</li></ul><div class="alert mt-2"><span>💡</span><span>Use a passphrase you do not use anywhere else. FinBank will never ask for your password by phone or SMS. Demo current password: <b>Demo@1234</b></span></div></div></div>';
    $$('[data-eye]').forEach((b) => (b.onclick = () => { const i = $('#' + b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; }));
    const nw = $('#pw-nw'), cur = $('#pw-cur');
    const upd = () => {
      const v = nw.value, ok = RULES.map((r) => r[1](v)), n = ok.filter(Boolean).length + (v.length >= 12 ? 1 : 0);
      $$('#rules li').forEach((li, i) => li.classList.toggle('ok', i < RULES.length ? ok[i] : !!v && v !== cur.value));
      const m = $('#meter'), lvl = !v ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : n === 5 ? 3 : 4;
      m.style.width = lvl * 25 + '%'; m.style.background = ['', 'var(--danger)', 'var(--warn)', 'var(--info)', 'var(--accent)'][lvl];
      $('#meterTxt').textContent = ['Enter a new password', 'Weak', 'Fair', 'Good', 'Strong'][lvl];
    };
    nw.addEventListener('input', upd); cur.addEventListener('input', upd);
    $('#pwF').onsubmit = (e) => {
      e.preventDefault();
      const curHash = P.pwHash || hash(FB.DEMO_USER.password);
      const ok = [FB.field(cur, { required: 'Enter your current password.', custom: (v) => (hash(v) === curHash ? '' : 'Current password is incorrect.') }),
        FB.field(nw, { required: 'Enter a new password.', custom: (v) => (RULES.some((r) => !r[1](v)) ? 'Password does not meet all requirements.' : v === cur.value ? 'New password must differ from current.' : '') }),
        FB.field($('#pw-cf'), { required: 'Confirm your new password.', custom: (v) => (v !== nw.value ? 'Passwords do not match.' : '') })];
      if (ok.includes(false)) return;
      FB.confirm({ title: 'Change password', message: 'You will need the new password next time you sign in. Continue?', confirmLabel: 'Continue', onConfirm: () => FB.otp({ title: 'Verify password change', onSuccess: () => FB.busy($('#pwSave'), 800, () => {
        P.pwHash = hash(nw.value); P.pwdChanged = '2026-09-30'; save(); FB.notify('security', 'Password changed', 'Your password was changed on this device.');
        password(); FB.toast('Password updated successfully.', 'success');
      }) }) });
    };
  }

  /* ---------- PIN ---------- */
  function pin() {
    $('#pPin').innerHTML = '<div class="card" style="max-width:460px"><div class="card-head"><h3>Change 6-digit PIN</h3></div><p class="text-2 mb-2" style="font-size:13px">Your PIN authorises payments and card actions. Demo current PIN: <b>123456</b></p><form id="pinF" novalidate>' +
      [['cur', 'Current PIN'], ['nw', 'New PIN'], ['cf', 'Confirm new PIN']].map((a) => '<div class="field"><label for="pin-' + a[0] + '">' + a[1] + '</label><input class="input pin-in" type="password" inputmode="numeric" maxlength="6" id="pin-' + a[0] + '" autocomplete="off" placeholder="••••••"></div>').join('') + '<button class="btn btn-block" id="pinSave" type="submit">Update PIN</button></form></div>';
    $$('.pin-in').forEach((i) => i.addEventListener('input', () => (i.value = i.value.replace(/\D/g, ''))));
    const weak = (v) => /^(\d)\1{5}$/.test(v) || '0123456789012'.includes(v) || '9876543210987'.includes(v);
    $('#pinF').onsubmit = (e) => {
      e.preventDefault();
      const nw = $('#pin-nw'), ok = [FB.field($('#pin-cur'), { required: 'Enter your current PIN.', custom: (v) => (v === P.pin ? '' : 'Current PIN is incorrect.') }),
        FB.field(nw, { required: 'Enter a new PIN.', pattern: /^\d{6}$/, msg: 'PIN must be exactly 6 digits.', custom: (v) => (weak(v) ? 'PIN is too easy to guess (repeated or sequential digits).' : v === P.pin ? 'New PIN must differ from current PIN.' : '') }),
        FB.field($('#pin-cf'), { required: 'Confirm your new PIN.', custom: (v) => (v !== nw.value ? 'PINs do not match.' : '') })];
      if (ok.includes(false)) return;
      FB.otp({ title: 'Verify PIN change', onSuccess: () => FB.busy($('#pinSave'), 700, () => { P.pin = nw.value; save(); FB.notify('security', 'PIN changed', 'Your transaction PIN was updated.'); pin(); FB.toast('PIN updated successfully.', 'success'); }) });
    };
  }

  /* ---------- Authentication ---------- */
  const METHODS = [['sms', '📱', 'SMS OTP', 'Code sent to 0912 *** 678'], ['app', '🔐', 'Authenticator app', 'Time-based codes from Google/Microsoft Authenticator'], ['smart', '🧠', 'Smart OTP', 'Approve in the FinBank mobile app']];
  function auth() {
    $('#pAuth').innerHTML = '<div class="grid g2"><div class="card"><h3>Two-factor authentication</h3>' + sw('twoSw', 'Require 2FA for sign-in and transfers', P.twoFA ? 'Enabled — recommended.' : 'Disabled — your account is more vulnerable.', P.twoFA) +
      '<div class="mt-2 grid" style="gap:8px;' + (P.twoFA ? '' : 'opacity:.5;pointer-events:none') + '" id="methods">' + METHODS.map((m) => '<button class="selectable ' + (P.twoFAMethod === m[0] ? 'selected' : '') + '" data-m="' + m[0] + '"><b>' + m[1] + ' ' + m[2] + '</b><br><small class="muted">' + m[3] + '</small></button>').join('') + '</div></div>' +
      '<div class="card"><h3>Biometric login</h3>' + sw('bioSw', 'Fingerprint / Face ID', 'Sign in and approve small payments with your fingerprint or face. Biometric data never leaves your device.', P.biometric) +
      '<div class="alert mt-2"><span>ℹ️</span><span>Biometrics are used only on trusted devices. Payments above 10,000,000 VND always require OTP.</span></div><button class="btn btn-outline btn-sm mt-2" id="bioTest" ' + (P.biometric ? '' : 'disabled') + '>Test biometric prompt</button></div></div>';
    $('#twoSw').onchange = (e) => {
      const on = e.target.checked; e.target.checked = !on;
      if (on) return FB.otp({ title: 'Enable 2FA', onSuccess: () => { P.twoFA = true; save(); auth(); FB.toast('Two-factor authentication enabled.', 'success'); } });
      FB.confirm({ title: 'Turn off 2FA?', icon: '⚠️', danger: true, confirmLabel: 'Turn off', message: 'Without 2FA, anyone with your password can move money. We strongly advise keeping it on.', onConfirm: () => FB.otp({ title: 'Verify to disable 2FA', onSuccess: () => { P.twoFA = false; save(); FB.notify('security', '2FA disabled', 'Two-factor authentication was turned off.'); auth(); FB.toast('2FA disabled. Your account is less secure.', 'warn'); } }) });
    };
    $$('[data-m]').forEach((b) => (b.onclick = () => { if (b.dataset.m === P.twoFAMethod) return; FB.otp({ title: 'Change 2FA method', onSuccess: () => { P.twoFAMethod = b.dataset.m; save(); auth(); FB.toast('Method set to ' + METHODS.find((m) => m[0] === b.dataset.m)[2] + '.', 'success'); } }); }));
    $('#bioSw').onchange = (e) => {
      const on = e.target.checked; e.target.checked = !on;
      if (on) return bioPrompt('Enable biometric login', () => { P.biometric = true; save(); auth(); FB.toast('Biometric login enabled.', 'success'); });
      FB.confirm({ title: 'Turn off biometric login?', message: 'You will sign in with your password and OTP instead.', confirmLabel: 'Turn off', onConfirm: () => { P.biometric = false; save(); auth(); FB.toast('Biometric login disabled.', 'info'); } });
    };
    $('#bioTest').onclick = () => bioPrompt('Biometric test', () => FB.toast('Biometric verified on this device.', 'success'));
  }
  function bioPrompt(title, done) {
    const m = FB.modal({ title, size: 'sm', dismissable: false, body: '<div class="center"><div class="bio scan" id="bio">👆</div><b id="bioTxt">Touch the sensor or look at the camera…</b><p class="muted mt-1" style="font-size:13px">Simulated prompt — no biometric data is collected.</p></div>', actions: [{ label: 'Cancel', onClick: () => clearTimeout(tm) }] });
    const tm = setTimeout(() => { const b = $('#bio', m.el); b.className = 'bio done'; b.textContent = '✅'; $('#bioTxt', m.el).textContent = 'Recognised'; setTimeout(() => { m.close(); done(); }, 700); }, 1800);
  }

  /* ---------- Devices ---------- */
  function devices() {
    const el = $('#pDevices');
    el.innerHTML = '<div class="grid g2"><div class="card"><div class="card-head"><h3>Trusted devices</h3><span class="badge">' + db.devices.length + '</span></div><div class="list">' + (db.devices.length ? db.devices.map((d) =>
      '<div class="row-item"><div class="row-icon">' + (/iPhone|Android/.test(d.name) ? '📱' : '💻') + '</div><div class="row-main"><b>' + esc(d.name) + '</b><small>' + esc(d.location) + ' · last active ' + f.datetime(d.last) + '</small><div class="mt-1">' + (d.current ? '<span class="badge primary">This device</span> ' : '') + '<span class="badge ' + (d.trusted ? 'success' : 'danger') + '">' + (d.trusted ? 'Trusted' : 'Not trusted') + '</span></div></div>' +
      (d.current ? '' : '<div class="flex" style="flex-direction:column;gap:6px"><button class="btn btn-outline btn-sm" data-trust="' + d.id + '">' + (d.trusted ? 'Untrust' : 'Trust') + '</button><button class="btn btn-ghost btn-sm" style="color:var(--danger)" data-rm="' + d.id + '">Remove</button></div>') + '</div>').join('') : FB.empty('💻', 'No devices')) + '</div></div>' +
      '<div class="card"><div class="card-head"><h3>Active sessions</h3><button class="btn btn-danger btn-sm" id="outAll" ' + (db.sessions.length > 1 ? '' : 'disabled') + '>Log out all other sessions</button></div><div class="list">' + db.sessions.map((s) =>
        '<div class="row-item"><div class="row-icon">🟢</div><div class="row-main"><b>' + esc(s.device) + '</b><small>' + esc(s.location) + ' · ' + esc(s.ip) + ' · since ' + f.datetime(s.started) + '</small></div>' + (s.current ? '<span class="badge primary">Current</span>' : '<button class="btn btn-outline btn-sm" data-out="' + s.id + '">Log out</button>') + '</div>').join('') + '</div></div></div>' +
      '<h3 class="mt-3 mb-2">Login history</h3><div class="table-wrap"><table class="table stack"><thead><tr><th>Time</th><th>Device</th><th>Location</th><th>IP</th><th>Result</th></tr></thead><tbody>' + db.loginHistory.map((l) =>
        '<tr class="' + (l.ok ? '' : 'failed') + '"><td data-label="Time">' + f.datetime(l.time) + '</td><td data-label="Device">' + esc(l.device) + '</td><td data-label="Location">' + esc(l.location) + '</td><td data-label="IP" class="mono">' + esc(l.ip) + '</td><td data-label="Result"><span class="badge ' + (l.ok ? 'success' : 'danger') + '">' + (l.ok ? 'Successful' : '⚠ Failed attempt') + '</span></td></tr>').join('') + '</tbody></table></div>';
    $$('[data-trust]', el).forEach((b) => (b.onclick = () => {
      const d = db.devices.find((x) => x.id === b.dataset.trust);
      if (!d.trusted) { d.trusted = true; save(); devices(); return FB.toast(d.name + ' is now trusted.', 'success'); }
      FB.confirm({ title: 'Untrust device', message: 'Untrust “' + d.name + '”? It will require OTP on the next sign-in.', confirmLabel: 'Untrust', onConfirm: () => { d.trusted = false; save(); devices(); FB.toast('Device untrusted.', 'warn'); } });
    }));
    $$('[data-rm]', el).forEach((b) => (b.onclick = () => { const d = db.devices.find((x) => x.id === b.dataset.rm); FB.confirm({ title: 'Remove device', danger: true, message: 'Remove “' + d.name + '” and sign it out?', confirmLabel: 'Remove', onConfirm: () => { db.devices = db.devices.filter((x) => x !== d); save(); devices(); FB.toast('Device removed.', 'success'); } }); }));
    $$('[data-out]', el).forEach((b) => (b.onclick = () => FB.confirm({ title: 'Log out session', message: 'End this session?', confirmLabel: 'Log out', onConfirm: () => { db.sessions = db.sessions.filter((s) => s.id !== b.dataset.out); save(); devices(); FB.toast('Session ended.', 'success'); } })));
    $('#outAll').onclick = () => FB.confirm({ title: 'Log out other sessions', message: 'All sessions except this one will be ended.', confirmLabel: 'Continue', danger: true, onConfirm: () => FB.otp({ title: 'Verify', onSuccess: () => { db.sessions = db.sessions.filter((s) => s.current); save(); devices(); FB.notify('security', 'Sessions ended', 'All other sessions were logged out.'); FB.toast('Logged out of all other sessions.', 'success'); } }) });
  }

  /* ---------- Limits ---------- */
  function limits() {
    $('#pLimits').innerHTML = '<div class="card" style="max-width:640px"><div class="card-head"><h3>Transfer limits</h3></div><p class="text-2 mb-2" style="font-size:13px">Lower limits reduce risk if your account is compromised. Increasing a limit requires OTP.</p>' +
      [['Tx', 'Per transaction', MAX_TX, P.limitTx], ['Day', 'Per day', MAX_DAY, P.limitDay]].map((a) => '<div class="field"><label for="lim' + a[0] + '">' + a[1] + ' limit</label><div class="range-val mono" id="val' + a[0] + '">' + f.vnd(a[3]) + '</div><input type="range" id="lim' + a[0] + '" min="1000000" max="' + a[2] + '" step="1000000" value="' + a[3] + '"><div class="flex between muted" style="font-size:12px"><span>1M</span><span>Max ' + f.short(a[2]) + '</span></div></div>').join('') +
      '<div class="chips mb-2"><span class="muted" style="font-size:13px;align-self:center">Presets:</span>' + [['Conservative', 20e6, 50e6], ['Standard', 100e6, 500e6], ['High', 300e6, 1e9]].map((p) => '<button type="button" class="chip" data-pre="' + p[1] + ',' + p[2] + '">' + p[0] + '</button>').join('') + '</div>' +
      '<button class="btn" id="limSave">Save limits</button></div>';
    const tx = $('#limTx'), day = $('#limDay'), sync = () => { $('#valTx').textContent = f.vnd(+tx.value); $('#valDay').textContent = f.vnd(+day.value); };
    tx.oninput = () => { if (+tx.value > +day.value) day.value = tx.value; sync(); }; day.oninput = () => { if (+day.value < +tx.value) tx.value = day.value; sync(); };
    $$('[data-pre]').forEach((b) => (b.onclick = () => { const [a, d] = b.dataset.pre.split(',').map(Number); tx.value = a; day.value = d; sync(); }));
    $('#limSave').onclick = () => {
      const nt = +tx.value, nd = +day.value;
      if (nt === P.limitTx && nd === P.limitDay) return FB.toast('No changes to save.', 'info');
      const apply = () => FB.busy($('#limSave'), 700, () => { P.limitTx = nt; P.limitDay = nd; save(); if (P.secAlerts.limit) FB.notify('security', 'Transfer limits updated', 'Per transaction ' + f.vnd(nt) + ', per day ' + f.vnd(nd) + '.'); FB.toast('Limits saved.', 'success'); });
      nt > P.limitTx || nd > P.limitDay ? FB.otp({ title: 'Verify limit increase', onSuccess: apply }) : apply();
    };
  }

  /* ---------- Alerts & privacy ---------- */
  function privacy() {
    const A = P.secAlerts, V = P.privacy;
    $('#pPrivacy').innerHTML = '<div class="grid g2"><div class="card"><h3>Security alerts</h3>' + sw('aLogin', 'New login alerts', 'When your account is accessed from a new device.', A.login) + sw('aTx', 'Large transaction alerts', 'For payments above 10,000,000 VND.', A.tx) + sw('aDev', 'Device changes', 'When a device is added or removed.', A.device) + sw('aLim', 'Limit changes', 'When transfer limits are modified.', A.limit) + '</div>' +
      '<div class="card"><h3>Privacy</h3>' + sw('vHide', 'Hide balances by default', 'Balances are masked until you tap the eye icon.', V.hideBalance) + sw('vShare', 'Share data with partners', 'Allow trusted partners to personalise offers.', V.share) + sw('vMkt', 'Marketing consent', 'Receive product offers by SMS and email.', V.marketing) +
      '<div class="flex gap-1 wrap mt-2"><button class="btn btn-outline btn-sm" id="dlData">⬇ Download my data</button></div></div></div>' +
      '<div class="card danger-zone mt-2"><h3 class="neg">Danger zone</h3><div class="setting-row"><div><b>Delete account</b><p>Permanently close your FinBank profile. This cannot be undone. Accounts must have zero balance in real life.</p></div><button class="btn btn-danger" id="delAcc">Delete account</button></div></div>';
    [['aLogin', A, 'login'], ['aTx', A, 'tx'], ['aDev', A, 'device'], ['aLim', A, 'limit'], ['vHide', V, 'hideBalance'], ['vShare', V, 'share'], ['vMkt', V, 'marketing']].forEach(([id, o, k]) => ($('#' + id).onchange = (e) => { o[k] = e.target.checked; save(); FB.toast('Setting saved.', 'success'); }));
    $('#dlData').onclick = () => FB.confirm({ title: 'Download my data', message: 'Export your profile, accounts and settings as a JSON file?', confirmLabel: 'Download', onConfirm: () => FB.download('finbank-my-data.json', JSON.stringify({ exportedAt: FB.fmt.iso(), profile: { name: db.user.name, email: db.user.email, phone: db.user.phone }, accounts: db.accounts.map((a) => ({ type: a.type, number: FB.mask(a.number), balance: a.balance })), settings: P }, null, 2), 'application/json') });
    $('#delAcc').onclick = () => {
      const m = FB.modal({ title: 'Delete your account?', body: '<div class="center"><div class="big-ico" style="background:var(--danger-50)">⚠️</div></div><p class="text-2 mb-2">This will permanently remove your profile, cards and history after 30 days. To confirm, type <b>DELETE</b> below.</p><div class="field"><input class="input" id="delTxt" autocomplete="off" placeholder="Type DELETE" aria-label="Type DELETE to confirm"></div>',
        actions: [{ label: 'Keep my account' }, { label: 'Delete account', class: 'btn-danger', onClick: () => {
          if (!FB.field($('#delTxt', m.el), { required: 'Type DELETE to continue.', custom: (v) => (v === 'DELETE' ? '' : 'You must type DELETE in capital letters.') })) return false;
          setTimeout(() => FB.otp({ title: 'Final verification', onSuccess: () => { FB.toast('Your account is scheduled for deletion. Signing out…', 'warn'); setTimeout(() => FB.logout('deleted'), 1800); } }), 150);
        } }] });
    };
  }

  score(); password(); pin(); auth(); devices(); limits(); privacy();
  FB.tabs(document);
})();
