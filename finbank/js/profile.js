/* FinBank — Profile */
(function () {
  const db = FB.db, u = db.user, $ = FB.$, $$ = FB.$$, f = FB.fmt, esc = FB.esc;
  FB.prefs.notif = Object.assign({ push: true, sms: true, email: false, promo: false }, FB.prefs.notif);
  FB.prefs.statement = FB.prefs.statement || 'email';
  u.empType = u.empType || 'Full-time';
  const initialsOf = (n) => { const w = n.trim().split(/\s+/); return (w.length > 1 ? w[w.length - 2][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase(); };

  function header() {
    $('#head').innerHTML = '<div class="flex items-center gap-2 wrap"><div class="avatar lg">' + esc(u.initials) + '</div><div class="grow"><h2>' + esc(u.name) + '</h2><div class="muted">Customer ID ' + esc(u.id) + '</div>' +
      '<div class="chips mt-1"><span class="badge warn">🥇 ' + esc(u.tier) + ' tier</span><span class="badge success">✔ KYC ' + esc(u.kyc) + '</span><span class="badge">Member since ' + f.date(u.since) + '</span></div></div></div>';
  }
  function syncShell() {
    $$('.topbar .avatar').forEach((a) => (a.textContent = u.initials));
    const w = $('.profile-btn .who b'); if (w) w.textContent = u.short;
    const d = $('#profMenu div b'); if (d) d.textContent = u.name;
    const m = $('#profMenu .muted'); if (m) m.textContent = u.email;
  }

  /* Personal */
  function personal() {
    $('#pPersonal').innerHTML = '<div class="card"><div class="card-head"><h3>Personal information</h3></div><form id="pf" novalidate><div class="row2"><div class="field"><label for="fName">Full name</label><input class="input" id="fName" value="' + esc(u.name) + '" maxlength="60" autocomplete="name"></div>' +
      '<div class="field"><label for="fDob">Date of birth</label><input class="input" type="date" id="fDob" value="' + u.dob + '" max="2008-01-01"></div></div><div class="row2"><div class="field"><label for="fPhone">Phone number</label><input class="input" id="fPhone" inputmode="tel" value="' + esc(u.phone) + '" autocomplete="tel"><div class="hint">Changing your phone or email requires OTP.</div></div>' +
      '<div class="field"><label for="fEmail">Email</label><input class="input" id="fEmail" type="email" value="' + esc(u.email) + '" autocomplete="email"></div></div><div class="field"><label for="fAddr">Residential address</label><textarea class="textarea input" id="fAddr" rows="2" maxlength="160">' + esc(u.address) + '</textarea></div>' +
      '<div class="flex gap-1 wrap"><button class="btn" id="pfSave" type="submit">Save changes</button><button class="btn btn-outline" type="button" id="pfReset">Discard</button></div></form></div>';
    const g = (id) => $('#' + id);
    $('#pfReset').onclick = () => { personal(); FB.toast('Changes discarded.', 'info'); };
    $('#pf').onsubmit = (e) => {
      e.preventDefault();
      const ok = [FB.field(g('fName'), { required: 'Enter your full name.', pattern: /^[A-Za-zÀ-ỹ][A-Za-zÀ-ỹ\s'.-]{2,59}$/, msg: 'Use letters only (min 3 characters).' }),
        FB.field(g('fDob'), { required: true, custom: (v) => (new Date().getFullYear() - +v.slice(0, 4) < 18 ? 'You must be at least 18.' : '') }),
        FB.field(g('fPhone'), { required: 'Enter your phone number.', custom: (v) => (FB.rx.phone.test(v.replace(/\s/g, '')) ? '' : 'Enter a valid Vietnamese mobile number.') }),
        FB.field(g('fEmail'), { required: 'Enter your email.', pattern: FB.rx.email, msg: 'Enter a valid email address.' }),
        FB.field(g('fAddr'), { required: 'Enter your address.', custom: (v) => (v.length < 10 ? 'Address looks too short.' : '') })];
      if (ok.includes(false)) return;
      const nv = { name: g('fName').value.trim().replace(/\s+/g, ' '), dob: g('fDob').value, phone: g('fPhone').value.trim(), email: g('fEmail').value.trim(), address: g('fAddr').value.trim() };
      const sens = nv.phone.replace(/\s/g, '') !== u.phone.replace(/\s/g, '') || nv.email !== u.email;
      const apply = () => FB.busy($('#pfSave'), 800, () => {
        Object.assign(u, nv, { initials: initialsOf(nv.name), short: nv.name.split(' ').slice(-2).join(' ') });
        FB.save(); header(); syncShell(); FB.toast('Your profile has been updated.', 'success', 'Saved');
        if (sens) FB.notify('security', 'Contact details changed', 'Your phone number or email was updated.');
      });
      sens ? FB.otp({ title: 'Verify contact change', onSuccess: apply }) : apply();
    };
  }

  /* Identification */
  function ident() {
    const el = $('#pIdent'), raw = u.idNumber, masked = raw.slice(0, 3) + ' *** *** ' + raw.slice(-3);
    u.idDocs = u.idDocs || {};
    el.innerHTML = '<div class="grid g2"><div class="card"><div class="card-head"><h3>Citizen ID (CCCD)</h3><span class="badge success">Verified</span></div><dl class="kv"><dt>ID number</dt><dd><span id="idNum" class="mono">' + masked + '</span> <button class="btn btn-ghost btn-sm" id="idReveal">👁 Reveal</button></dd><dt>Issue date</dt><dd>' + f.date(u.idIssued) + '</dd><dt>Issued by</dt><dd>' + esc(u.idPlace) + '</dd><dt>Full name</dt><dd>' + esc(u.name.toUpperCase()) + '</dd><dt>Date of birth</dt><dd>' + f.date(u.dob) + '</dd></dl></div>' +
      '<div class="card"><div class="card-head"><h3>Upload documents</h3></div><p class="text-2 mb-2" style="font-size:13px">Upload updated photos of your ID card (JPG, PNG or PDF, max 5 MB). Mock upload — files stay in your browser.</p>' +
      ['front', 'back'].map((s) => '<div class="field"><label for="up-' + s + '">ID card — ' + s + ' side</label><input class="input" type="file" id="up-' + s + '" accept="image/png,image/jpeg,application/pdf"><div class="up-out flex items-center gap-1 mt-1" id="out-' + s + '">' + (u.idDocs[s] ? '<span class="badge success">✔ ' + esc(u.idDocs[s]) + '</span>' : '<small class="muted">No file uploaded</small>') + '</div></div>').join('') + '</div></div>';
    let t;
    $('#idReveal').onclick = () => {
      const n = $('#idNum');
      if (n.dataset.shown) { n.textContent = masked; delete n.dataset.shown; $('#idReveal').textContent = '👁 Reveal'; return; }
      FB.otp({ title: 'Verify to reveal ID', onSuccess: () => { n.textContent = raw; n.dataset.shown = 1; $('#idReveal').textContent = '🙈 Hide'; clearTimeout(t); t = setTimeout(() => { if (n.dataset.shown) $('#idReveal').click(); }, 15000); FB.toast('ID number will be hidden again in 15 seconds.', 'info'); } });
    };
    ['front', 'back'].forEach((s) => ($('#up-' + s).onchange = (e) => {
      const file = e.target.files[0], out = $('#out-' + s); if (!file) return;
      if (!/^(image\/(png|jpeg)|application\/pdf)$/.test(file.type)) { out.innerHTML = '<small class="neg">Unsupported file type.</small>'; e.target.value = ''; return; }
      if (file.size > 5 * 1024 * 1024) { out.innerHTML = '<small class="neg">File is larger than 5 MB.</small>'; e.target.value = ''; return; }
      out.innerHTML = '<div class="skeleton" style="width:100%;height:14px"></div>';
      setTimeout(() => {
        u.idDocs[s] = file.name; FB.save();
        out.innerHTML = (file.type.startsWith('image') ? '<img alt="Preview" style="width:64px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--border)" src="' + URL.createObjectURL(file) + '">' : '<span style="font-size:26px">📄</span>') + '<div><b style="font-size:13px">' + esc(file.name) + '</b><br><small class="muted">' + (file.size / 1024).toFixed(0) + ' KB · uploaded</small></div>';
        FB.toast(file.name + ' uploaded for review.', 'success');
      }, 700);
    }));
  }

  /* Employment */
  function employment() {
    $('#pEmp').innerHTML = '<div class="card"><div class="card-head"><h3>Employment &amp; income</h3></div><form id="ef" novalidate><div class="row2"><div class="field"><label for="eEmp">Employer</label><input class="input" id="eEmp" value="' + esc(u.employer) + '" maxlength="80"></div><div class="field"><label for="eJob">Job title</label><input class="input" id="eJob" value="' + esc(u.job) + '" maxlength="60"></div></div>' +
      '<div class="row2"><div class="field"><label for="eType">Employment type</label><select class="select" id="eType">' + ['Full-time', 'Part-time', 'Self-employed', 'Freelancer', 'Retired'].map((x) => '<option ' + (x === u.empType ? 'selected' : '') + '>' + x + '</option>').join('') + '</select></div><div class="field"><label for="eInc">Monthly income (VND)</label><input class="input" id="eInc" inputmode="numeric" value="' + f.num(u.income) + '"><div class="hint">Used for loan eligibility and financial health scoring.</div></div></div><button class="btn" id="eSave" type="submit">Save employment</button></form></div>';
    FB.amountInput($('#eInc'));
    $('#ef').onsubmit = (e) => {
      e.preventDefault();
      const ok = [FB.field($('#eEmp'), { required: 'Enter your employer.' }), FB.field($('#eJob'), { required: 'Enter your job title.' }), FB.field($('#eInc'), { required: 'Enter your income.', min: 1000000, max: 10000000000 })];
      if (ok.includes(false)) return;
      FB.busy($('#eSave'), 700, () => { Object.assign(u, { employer: $('#eEmp').value.trim(), job: $('#eJob').value.trim(), empType: $('#eType').value, income: FB.parseAmount($('#eInc').value) }); FB.save(); FB.toast('Employment details saved.', 'success'); });
    };
  }

  /* Preferences */
  function prefs() {
    const P = FB.prefs.notif, dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const sw = (id, t, d, on) => '<div class="setting-row"><div><b>' + t + '</b><p>' + d + '</p></div><label class="switch"><input type="checkbox" id="' + id + '" ' + (on ? 'checked' : '') + ' aria-label="' + t + '"><span></span></label></div>';
    $('#pPrefs').innerHTML = '<div class="grid g2"><div class="card"><h3 class="mb-2">Display</h3><div class="field"><label for="lang">Language</label><select class="select" id="lang"><option value="en">English</option><option value="vi">Tiếng Việt</option></select><div class="hint">Language switching is a UI concept in this demo.</div></div>' +
      sw('themeSw', 'Dark theme', 'Easier on the eyes at night.', dark) +
      '<h3 class="mt-3 mb-2">Statement delivery</h3><div class="grid" style="gap:8px">' + [['email', '📧 Email (PDF)', 'Sent on the 1st of every month'], ['app', '📱 In-app only', 'View and download from Transactions'], ['paper', '✉️ Paper statement', '30,000 VND / month, mailed to your address']].map((o) => '<button class="selectable ' + (FB.prefs.statement === o[0] ? 'selected' : '') + '" data-st="' + o[0] + '"><b>' + o[1] + '</b><br><small class="muted">' + o[2] + '</small></button>').join('') + '</div></div>' +
      '<div class="card"><h3 class="mb-2">Notifications</h3>' + sw('nPush', 'Push notifications', 'Instant alerts on your devices.', P.push) + sw('nSms', 'SMS alerts', 'Transaction and security texts.', P.sms) + sw('nEmail', 'Email notifications', 'Statements and updates.', P.email) + sw('nPromo', 'Promotions & offers', 'Deals and product news.', P.promo) + '</div></div>';
    $('#lang').value = FB.prefs.lang || 'en';
    $('#lang').onchange = (e) => { FB.prefs.lang = e.target.value; FB.savePrefs(); FB.toast(e.target.value === 'vi' ? 'Ngôn ngữ Tiếng Việt sẽ sớm được hỗ trợ (demo).' : 'Language set to English.', 'info', 'Language'); };
    $('#themeSw').onchange = (e) => { FB.setTheme(e.target.checked ? 'dark' : 'light'); FB.toast((e.target.checked ? 'Dark' : 'Light') + ' theme applied.', 'success'); };
    [['nPush', 'push'], ['nSms', 'sms'], ['nEmail', 'email'], ['nPromo', 'promo']].forEach(([id, k]) => ($('#' + id).onchange = (e) => { P[k] = e.target.checked; FB.savePrefs(); FB.toast('Notification preference saved.', 'success'); }));
    $$('[data-st]').forEach((b) => (b.onclick = () => { FB.prefs.statement = b.dataset.st; FB.savePrefs(); $$('[data-st]').forEach((x) => x.classList.toggle('selected', x === b)); FB.toast('Statement delivery updated.', 'success'); }));
  }

  /* Security summary */
  function sec() {
    const pr = FB.prefs, row = (ok, t, d) => '<div class="setting-row"><div><b>' + t + '</b><p>' + d + '</p></div><span class="badge ' + (ok ? 'success' : 'warn') + '">' + (ok ? 'On' : 'Off') + '</span></div>';
    $('#pSec').innerHTML = '<div class="card"><div class="card-head"><h3>Security summary</h3><a class="btn btn-sm" href="security.html">Open Security Center</a></div>' +
      row(pr.twoFA, 'Two-factor authentication', 'Extra verification for logins and transfers.') + row(pr.biometric, 'Biometric login', 'Fingerprint or Face ID on trusted devices.') + row(pr.alerts, 'Security alerts', 'Notify me about new logins and large transactions.') +
      '<div class="setting-row"><div><b>Transfer limits</b><p>Per transaction ' + f.vnd(pr.limitTx) + ' · Per day ' + f.vnd(pr.limitDay) + '</p></div><a href="security.html#limits">Manage</a></div>' +
      '<div class="setting-row"><div><b>Trusted devices</b><p>' + db.devices.filter((d) => d.trusted).length + ' trusted of ' + db.devices.length + ' known devices</p></div><a href="security.html#devices">Review</a></div></div>';
  }

  header(); personal(); ident(); employment(); prefs(); sec();
  FB.tabs(document, (id) => { if (id === 'prefs') prefs(); if (id === 'sec') sec(); });
})();
