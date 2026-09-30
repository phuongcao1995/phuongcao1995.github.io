/* EnglishUp — authentication (simulated with localStorage) and level test */
'use strict';

const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function fieldError(input, msg) {
  const f = input.closest('.field'); const e = $('.field-error', f);
  f.classList.toggle('has-error', !!msg); e.textContent = msg || '';
  input.setAttribute('aria-invalid', !!msg);
  return !msg;
}
function setLoading(btn, on, label) {
  btn.disabled = on; btn.classList.toggle('loading', on);
  if (label) btn.querySelector('.btn-label').textContent = label;
}
function goNext() {
  const next = params().get('next');
  location.href = next && /^[\w-]+\.html/.test(next) ? next : 'dashboard.html';
}
function googleLogin() {
  const accounts = [{ name: 'Nguyen Thi Phuong', email: 'phuong.nguyen@gmail.com' }, { name: 'Tran Minh Quan', email: 'quan.tran@gmail.com' }];
  openModal({
    title: 'Continue with Google',
    body: `<p class="muted small">Demo mode: choose an account to sign in (simulated).</p>
      <div class="account-list">${accounts.map((a, i) => `<button class="account-item" data-i="${i}"><span class="avatar" style="--h:${200 + i * 60}">${initials(a.name)}</span><span><strong>${a.name}</strong><span class="muted small">${a.email}</span></span></button>`).join('')}</div>`,
    onOpen(el, close) {
      $$('.account-item', el).forEach(b => b.addEventListener('click', () => {
        const a = accounts[+b.dataset.i];
        App.login({ ...a, level: (App.state.levelTest && App.state.levelTest.level) || 'B1' });
        close(); toast(`Welcome, ${esc(givenName(a.name))}!`, 'success'); setTimeout(goNext, 500);
      }));
    }
  });
}
function togglePw() {
  $$('[data-toggle-pw]').forEach(b => b.addEventListener('click', () => {
    const inp = $('#' + b.dataset.togglePw); const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password'; b.textContent = show ? 'Hide' : 'Show'; b.setAttribute('aria-pressed', show);
  }));
}

Pages.login = () => {
  if (App.state.user) { location.replace('dashboard.html'); return; }
  togglePw();
  const form = $('#login-form'), email = $('#login-email'), pw = $('#login-password');
  const remembered = Store.get('englishup_remember', '');
  if (remembered) { email.value = remembered; $('#remember').checked = true; }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const ok1 = fieldError(email, !email.value ? 'Please enter your email. Vui lòng nhập email.' : !emailOk(email.value) ? 'Email is not valid. Email không hợp lệ.' : '');
    const ok2 = fieldError(pw, pw.value.length < 6 ? 'Password must be at least 6 characters. Mật khẩu tối thiểu 6 ký tự.' : '');
    if (!ok1 || !ok2) return;
    const btn = $('button[type=submit]', form); setLoading(btn, true, 'Logging in…');
    await sleep(700);
    const user = App.users().find(u => u.email.toLowerCase() === email.value.trim().toLowerCase());
    if (!user || user.password !== pw.value) {
      setLoading(btn, false, 'Log in');
      $('#login-alert').hidden = false;
      $('#login-alert').innerHTML = `Email or password is incorrect. <span class="vi-hint">Email hoặc mật khẩu không đúng.</span> Try the demo account below.`;
      return;
    }
    if ($('#remember').checked) Store.set('englishup_remember', user.email); else Store.remove('englishup_remember');
    App.login(user); toast(`Welcome back, ${esc(givenName(user.name))}!`, 'success'); goNext();
  });
  $('#demo-login').addEventListener('click', () => { email.value = 'phuong@englishup.vn'; pw.value = 'demo123'; form.requestSubmit(); });
  $('#google-btn').addEventListener('click', googleLogin);
  // Forgot password
  const showForgot = on => { $('#login-view').hidden = on; $('#forgot-view').hidden = !on; (on ? $('#forgot-email') : email).focus(); };
  $('#forgot-link').addEventListener('click', e => { e.preventDefault(); showForgot(true); });
  $('#back-login').addEventListener('click', e => { e.preventDefault(); showForgot(false); $('#forgot-sent').hidden = true; $('#forgot-form').hidden = false; });
  $('#forgot-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fe = $('#forgot-email');
    if (!fieldError(fe, emailOk(fe.value) ? '' : 'Email is not valid. Email không hợp lệ.')) return;
    const btn = $('button[type=submit]', e.target); setLoading(btn, true, 'Sending…'); await sleep(800); setLoading(btn, false, 'Send reset link');
    $('#forgot-form').hidden = true; $('#forgot-sent').hidden = false; $('#sent-email').textContent = fe.value;
  });
  if (location.hash === '#forgot') showForgot(true);
};

Pages.register = () => {
  if (App.state.user) { location.replace('dashboard.html'); return; }
  togglePw();
  const lt = App.state.levelTest;
  if (lt) { $('#reg-level').value = lt.level; $('#level-note').hidden = false; $('#level-note').textContent = `Based on your level test result: ${lt.level} ${DATA.levels[lt.level]}`; }
  const pw = $('#reg-password'), meter = $('#pw-meter');
  pw.addEventListener('input', () => {
    const v = pw.value; let s = 0;
    if (v.length >= 6) s++; if (v.length >= 10) s++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++; if (/\d/.test(v) && /[^\w]/.test(v)) s++;
    meter.dataset.strength = s; meter.querySelector('span').textContent = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][s];
  });
  $('#register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#reg-name'), email = $('#reg-email'), cpw = $('#reg-confirm'), lvl = $('#reg-level'), terms = $('#terms');
    const users = App.users();
    const checks = [
      fieldError(name, name.value.trim().length < 2 ? 'Please enter your full name. Vui lòng nhập họ tên.' : ''),
      fieldError(email, !emailOk(email.value) ? 'Email is not valid. Email không hợp lệ.' : users.some(u => u.email.toLowerCase() === email.value.toLowerCase()) ? 'This email is already registered. Email này đã được đăng ký.' : ''),
      fieldError(pw, pw.value.length < 6 ? 'Password must be at least 6 characters. Mật khẩu tối thiểu 6 ký tự.' : ''),
      fieldError(cpw, cpw.value !== pw.value || !cpw.value ? 'Passwords do not match. Mật khẩu không khớp.' : ''),
      fieldError(lvl, !lvl.value ? 'Please choose your level. Hãy chọn trình độ.' : ''),
      fieldError(terms, !terms.checked ? 'Please accept the Terms to continue.' : '')
    ];
    if (checks.includes(false)) { $('.has-error input, .has-error select').focus(); return; }
    const btn = $('button[type=submit]', e.target); setLoading(btn, true, 'Creating account…'); await sleep(800);
    const user = { name: name.value.trim(), email: email.value.trim(), password: pw.value, level: lvl.value, goal: $('#reg-goal').value, hue: rand(180, 300) };
    users.push(user); App.saveUsers(users);
    // Fresh learner stats for new accounts
    const fresh = defaultState();
    Object.assign(App.state, { xp: 50, streak: 1, lastActive: dateKey(), todayMinutes: 0, weekly: [0, 0, 0, 0, 0, 0, 0], totalMinutes: 0, enrolled: [], completed: {}, lastLesson: null, notifications: [{ id: 'nw', icon: '🎉', text: 'Welcome to EnglishUp! Start with a 10-minute lesson today.', time: 'Just now', read: false }], unlocked: [], stats: { ...fresh.stats, lessons: 0, speaking: 0, pronunciation: 0, wordsBase: 0, grammar: 0, pronBest: 0, challenges: 0, speakingScores: [0], vocabGrowth: [0] }, skills: { Speaking: 10, Listening: 10, Vocabulary: 10, Grammar: 10, Pronunciation: 10 } });
    const plan = params().get('plan'); if (plan && plan !== 'free') App.state.plan = plan + '-trial';
    App.login(user);
    toast(`Account created! Chào mừng ${esc(givenName(user.name))} 🎉`, 'success');
    setTimeout(() => location.href = 'dashboard.html', 600);
  });
  $('#google-btn').addEventListener('click', googleLogin);
};

/* ---------------- Level test ---------------- */
Pages['level-test'] = () => {
  const Q = DATA.levelTest;
  let idx = 0; const answers = new Array(Q.length).fill(null);
  const startView = $('#test-start'), qView = $('#test-question'), rView = $('#test-result');
  $('#start-test').addEventListener('click', () => { startView.hidden = true; qView.hidden = false; render(); });
  const render = () => {
    const q = Q[idx];
    $('#q-num').textContent = `Question ${idx + 1} of ${Q.length}`;
    $('#q-cat').textContent = q.cat;
    $('#q-progress').innerHTML = progressBar((idx + 1) / Q.length * 100);
    $('#q-body').innerHTML = `
      ${q.audio ? `<div class="audio-q"><button class="btn btn-secondary" id="q-play">${icon('volume', 18)} Play audio</button><span class="muted small">You can replay it. Có thể nghe lại.</span></div>` : ''}
      ${q.passage ? `<blockquote class="passage">${esc(q.passage)}</blockquote>` : ''}
      <h2 class="q-text" id="q-text">${esc(q.q)}</h2>
      <div class="options" role="radiogroup" aria-labelledby="q-text">
        ${q.options.map((o, i) => `<button role="radio" aria-checked="${answers[idx] === i}" class="option ${answers[idx] === i ? 'selected' : ''}" data-i="${i}"><span class="opt-key">${'ABCD'[i]}</span>${esc(o)}</button>`).join('')}
      </div>`;
    if (q.audio) $('#q-play').addEventListener('click', () => speak(q.audio, { rate: 0.95 }));
    $$('.option', qView).forEach(b => b.addEventListener('click', () => {
      answers[idx] = +b.dataset.i;
      $$('.option', qView).forEach(o => { o.classList.toggle('selected', o === b); o.setAttribute('aria-checked', o === b); });
      $('#q-next').disabled = false;
    }));
    $('#q-prev').disabled = idx === 0;
    $('#q-next').hidden = idx === Q.length - 1;
    $('#q-submit').hidden = idx !== Q.length - 1;
    $('#q-next').disabled = answers[idx] === null;
  };
  $('#q-prev').addEventListener('click', () => { if (idx > 0) { idx--; render(); } });
  $('#q-next').addEventListener('click', () => { if (idx < Q.length - 1) { idx++; render(); } });
  qView.addEventListener('keydown', e => { if (/^[1-4a-dA-D]$/.test(e.key)) { const i = isNaN(e.key) ? 'abcd'.indexOf(e.key.toLowerCase()) : +e.key - 1; const b = $$('.option', qView)[i]; if (b) b.click(); } });
  $('#q-submit').addEventListener('click', async () => {
    const missing = answers.findIndex(a => a === null);
    if (missing >= 0) { toast(`Please answer question ${missing + 1}. Bạn chưa trả lời câu ${missing + 1}.`, 'warning'); idx = missing; render(); return; }
    stopSpeaking();
    qView.hidden = true; rView.hidden = false;
    rView.innerHTML = `<div class="loading-block"><div class="spinner"></div><p>Analysing your answers…</p></div>`;
    await sleep(1100);
    const total = Q.reduce((a, q) => a + q.w, 0);
    const got = Q.reduce((a, q, i) => a + (answers[i] === q.answer ? q.w : 0), 0);
    const pct = Math.round(got / total * 100);
    const level = pct < 20 ? 'A1' : pct < 38 ? 'A2' : pct < 58 ? 'B1' : pct < 75 ? 'B2' : pct < 90 ? 'C1' : 'C2';
    const cats = ['Vocabulary', 'Grammar', 'Listening', 'Reading'].map(c => {
      const qs = Q.map((q, i) => ({ q, i })).filter(x => x.q.cat === c);
      return { c, pct: Math.round(qs.filter(x => answers[x.i] === x.q.answer).length / qs.length * 100) };
    });
    const R = DATA.levelResults[level];
    App.state.levelTest = { level, score: pct, date: dateKey() };
    if (App.state.user) { App.state.user.level = level; }
    App.save();
    const order = Object.keys(DATA.levels);
    rView.innerHTML = `
      <div class="result-card">
        <p class="muted">Your result</p>
        <div class="result-level"><span class="level-badge">${level}</span><div><h2>${DATA.levels[level]}</h2><p class="muted">Score ${pct}/100</p></div></div>
        <div class="level-scale" aria-label="CEFR scale">${order.map(l => `<span class="${l === level ? 'on' : order.indexOf(l) < order.indexOf(level) ? 'past' : ''}">${l}</span>`).join('')}</div>
        <p class="lead">${R.desc}</p>
        <div class="cat-scores">${cats.map(x => `<div><span>${x.c}</span>${progressBar(x.pct)}<strong>${x.pct}%</strong></div>`).join('')}</div>
        <h3>Recommended learning path</h3>
        <ol class="path-list">${R.skills.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
        <div class="btn-row">
          <a class="btn btn-primary btn-lg" href="${App.state.user ? `course-detail.html?id=${R.path[0]}` : 'register.html'}">${App.state.user ? 'Start recommended course' : 'Create free account'}</a>
          <button class="btn btn-secondary btn-lg" id="retake">Retake test</button>
        </div>
      </div>`;
    $('#retake').addEventListener('click', () => { answers.fill(null); idx = 0; rView.hidden = true; qView.hidden = false; render(); });
    if (App.state.user) App.addXP(30, 'Level test completed');
  });
};
