/* FinBank — authentication simulation (no real credentials or backend) */
(function () {
  const { $, $$ } = FB;
  const views = { login: $('#loginForm'), register: $('#regForm'), forgot: $('#forgotForm'), locked: $('#lockedView') };
  const go = (v) => { Object.keys(views).forEach((k) => views[k].classList.toggle('hidden', k !== v)); if (v === 'locked') startLockTimer(); };
  $$('[data-go]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); go(a.dataset.go); }));
  $('#themeBtn').onclick = FB.toggleTheme;
  $$('[data-eye]').forEach((b) => b.addEventListener('click', () => { const i = $('#' + b.dataset.eye); i.type = i.type === 'password' ? 'text' : 'password'; }));
  $('[data-terms]').addEventListener('click', (e) => { e.preventDefault(); FB.modal({ title: 'Terms & Privacy (demo)', body: '<p class="text-2">This is a portfolio demo. No real personal data is collected or stored anywhere except in your own browser\'s localStorage. Do not enter real banking credentials.</p>', actions: [{ label: 'Got it', class: '' }] }); });

  // Already signed in
  if (FB.getSession() && !/msg=/.test(location.search)) { location.replace('dashboard.html'); return; }

  // Banners
  const msg = new URLSearchParams(location.search).get('msg');
  const banners = { timeout: ['warn', '⏱️', 'You were logged out due to inactivity. Please log in again.'], login: ['info', 'ℹ️', 'Please log in to continue.'] };
  if (banners[msg]) $('#banner').innerHTML = '<div class="alert ' + banners[msg][0] + ' mb-2"><span>' + banners[msg][1] + '</span><span>' + banners[msg][2] + '</span></div>';

  /* Login */
  const LOCK_KEY = 'fb_lock', MAX = 3;
  let fails = 0;
  const lockState = () => FB.ls.get(LOCK_KEY, { until: 0 });
  const isLocked = () => lockState().until > Date.now();
  function startLockTimer() {
    const el = $('#lockTime'); clearInterval(startLockTimer.t);
    const tick = () => { const s = Math.max(0, Math.ceil((lockState().until - Date.now()) / 1000)); el.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); if (!s) { clearInterval(startLockTimer.t); go('login'); fails = 0; } };
    tick(); startLockTimer.t = setInterval(tick, 1000);
  }
  const finish = () => {
    FB.login($('#lRemember').checked);
    FB.notify('security', 'New login detected', 'Login from ' + (navigator.userAgent.includes('Mobile') ? 'mobile browser' : 'desktop browser') + ' in Ho Chi Minh City.');
    FB.toast('Welcome back, ' + FB.db.user.short + '!', 'success');
    setTimeout(() => (location.href = 'dashboard.html'), 500);
  };
  const afterAuth = () => { if (FB.prefs.twoFA) FB.otp({ title: 'Two-factor verification', onSuccess: finish, onFail: () => FB.toast('Verification failed. Please log in again.', 'error') }); else finish(); };

  $('#fillDemo').onclick = () => { $('#lUser').value = FB.DEMO_USER.username; $('#lPass').value = FB.DEMO_USER.password; };
  views.login.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isLocked()) { go('locked'); return; }
    const okU = FB.field($('#lUser'), { required: 'Enter your username or phone number.' }), okP = FB.field($('#lPass'), { required: 'Enter your password.' });
    if (!okU || !okP) return;
    const u = $('#lUser').value.trim().replace(/\s/g, ''), p = $('#lPass').value;
    FB.busy($('#loginBtn'), 900, () => {
      if ((u === FB.DEMO_USER.username || u === FB.DEMO_USER.phone) && p === FB.DEMO_USER.password) { fails = 0; afterAuth(); return; }
      fails++;
      const left = MAX - fails;
      if (left <= 0) { FB.ls.set(LOCK_KEY, { until: Date.now() + 5 * 60000 }); FB.toast('Account locked for 5 minutes.', 'error', 'Security lock'); go('locked'); return; }
      FB.field($('#lPass'), { custom: () => 'Incorrect username or password. ' + left + ' attempt' + (left > 1 ? 's' : '') + ' remaining.' });
      FB.toast('Login failed. Check your credentials.', 'error');
    });
  });
  $('#unlockBtn').onclick = () => FB.otp({ title: 'Verify to unlock', onSuccess: () => { FB.ls.del(LOCK_KEY); fails = 0; FB.toast('Account unlocked. Please log in.', 'success'); go('login'); } });
  if (isLocked()) go('locked');

  // Biometric concept
  $('#bioBtn').onclick = () => {
    if (!FB.prefs.biometric) { FB.toast('Biometric login is turned off. Enable it in Security settings.', 'warn'); return; }
    const m = FB.modal({ title: 'Biometric login', size: 'sm', dismissable: false, body: '<div class="center"><div class="big-ico" id="bioIco" style="background:var(--primary-50);width:88px;height:88px;font-size:44px">🫆</div><p class="text-2" id="bioTxt">Touch the fingerprint sensor or look at the camera to verify it\'s you.</p></div>', actions: [{ label: 'Cancel' }] });
    setTimeout(() => { if (!document.body.contains(m.el)) return; $('#bioIco').style.background = 'var(--accent-50)'; $('#bioIco').textContent = '✅'; $('#bioTxt').textContent = 'Identity confirmed.'; setTimeout(() => { m.close(); finish(); }, 700); }, 1800);
  };

  /* Register */
  const score = (p) => [/.{8,}/, /[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
  $('#rPass').addEventListener('input', (e) => {
    const s = score(e.target.value), bar = $('#strength');
    bar.className = 'progress mt-1 ' + (s <= 2 ? 'danger' : s <= 3 ? 'warn' : 'ok'); $('i', bar).style.width = (s / 5) * 100 + '%';
    $('#strengthTxt').textContent = e.target.value ? ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'][s] : 'Use 8+ characters with upper, lower, number and symbol.';
  });
  views.register.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = [FB.field($('#rName'), { required: true, pattern: /^[A-Za-zÀ-ỹ ]{4,}$/, msg: 'Enter your full name (letters only).' }),
      FB.field($('#rPhone'), { required: true, pattern: FB.rx.phone, msg: 'Enter a valid Vietnamese mobile number (10 digits).', custom: null }),
      FB.field($('#rEmail'), { required: true, pattern: FB.rx.email, msg: 'Enter a valid email address.' }),
      FB.field($('#rPass'), { required: true, custom: (v) => (score(v) < 4 ? 'Password is too weak.' : '') })];
    const agree = $('#rAgree').checked; $('#rAgreeErr').classList.toggle('hidden', agree);
    if (r.includes(false) || !agree) return;
    FB.otp({ title: 'Verify your phone', phone: $('#rPhone').value, onSuccess: () => {
      FB.modal({ title: 'Account created 🎉', size: 'sm', body: '<div class="center"><div class="success-anim">✓</div><p class="text-2">Welcome to FinBank, <b>' + FB.esc($('#rName').value) + '</b>! In this demo, log in with the sample credentials to explore.</p></div>', actions: [{ label: 'Go to log in', class: '', onClick: () => go('login') }] });
    } });
  });

  /* Forgot */
  let fStep = 1;
  views.forgot.addEventListener('submit', (e) => {
    e.preventDefault();
    if (fStep === 1) {
      if (!FB.field($('#fPhone'), { required: true, pattern: FB.rx.phone, msg: 'Enter a valid mobile number.' })) return;
      FB.otp({ title: 'Verify your identity', phone: $('#fPhone').value, onSuccess: () => { fStep = 2; $('#fStep1').classList.add('hidden'); $('#fStep2').classList.remove('hidden'); } });
    } else {
      const a = FB.field($('#fNew'), { required: true, custom: (v) => (score(v) < 4 ? 'Use 8+ chars with upper, lower, number & symbol.' : '') });
      const b = FB.field($('#fNew2'), { required: true, custom: (v) => (v !== $('#fNew').value ? 'Passwords do not match.' : '') });
      if (!a || !b) return;
      FB.toast('Password updated (demo). You can log in now.', 'success'); fStep = 1; $('#fStep1').classList.remove('hidden'); $('#fStep2').classList.add('hidden'); views.forgot.reset(); go('login');
    }
  });
})();
