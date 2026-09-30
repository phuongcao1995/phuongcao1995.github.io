/* EnglishUp — profile, subscription & settings */
'use strict';

Pages.profile = () => {
  const s = App.state, root = $('#profile-app');
  const GOALS = ['Speak confidently at work', 'Pass IELTS 6.5+', 'Prepare for job interviews', 'Travel abroad', 'Daily conversation', 'English for developers'];
  let yearly = false;

  const render = () => {
    const u = s.user, li = App.levelInfo(), plan = DATA.plans.find(p => p.id === s.plan) || DATA.plans[0];
    const unlocked = DATA.achievements.filter(a => s.unlocked.includes(a.id));
    root.innerHTML = `
      <div class="profile-layout">
        <section class="card profile-card">
          <span class="avatar avatar-xxl" style="--h:${u.hue}">${initials(u.name)}</span>
          <h2>${esc(u.name)}</h2><p class="muted">${esc(u.email)}</p>
          <div class="chip-row center"><span class="pill pill-level">${App.level} ${DATA.levels[App.level]}</span><span class="pill">Level ${li.n} ${li.name}</span><span class="badge badge-soft">${plan.name}</span></div>
          <div class="kpi-grid">
            <div class="kpi"><strong>🔥 ${s.streak}</strong><span>Day streak</span></div>
            <div class="kpi"><strong>⚡ ${fmtNum(s.xp)}</strong><span>XP</span></div>
            <div class="kpi"><strong>${s.dailyGoal} min</strong><span>Daily target</span></div>
            <div class="kpi"><strong>${unlocked.length}</strong><span>Badges</span></div>
          </div>
          <div class="profile-badges" aria-label="Achievements">${unlocked.slice(0, 8).map(a => `<span title="${esc(a.name)}">${a.icon}</span>`).join('') || '<span class="muted small">No badges yet</span>'}</div>
          <a class="link-btn" href="achievements.html">View all achievements</a>
        </section>
        <div class="profile-main">
          <section class="card" aria-labelledby="pf-title"><h2 id="pf-title">Personal information</h2>
            <form id="profile-form" class="form-grid" novalidate>
              <div class="field"><label for="pf-name">Full name</label><input id="pf-name" class="input" value="${esc(u.name)}" required><span class="field-error"></span></div>
              <div class="field"><label for="pf-email">Email</label><input id="pf-email" class="input" type="email" value="${esc(u.email)}" required><span class="field-error"></span></div>
              <div class="field"><label for="pf-level">English level</label><select id="pf-level" class="input">${Object.entries(DATA.levels).map(([k, v]) => `<option value="${k}" ${k === App.level ? 'selected' : ''}>${k} — ${v}</option>`).join('')}</select><span class="field-hint small muted"><a href="level-test.html">Not sure? Take the level test</a></span></div>
              <div class="field"><label for="pf-goal">Learning goal</label><select id="pf-goal" class="input">${GOALS.map(g => `<option ${g === u.goal ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
              <div class="field"><label for="pf-target">Daily target</label><select id="pf-target" class="input">${[10, 15, 20, 30, 45, 60].map(m => `<option value="${m}" ${m === s.dailyGoal ? 'selected' : ''}>${m} minutes / day</option>`).join('')}</select></div>
              <div class="field"><span class="label">Avatar color</span><div class="hue-row" role="radiogroup" aria-label="Avatar color">${[235, 265, 160, 200, 30, 340].map(h => `<button type="button" class="hue-dot ${h === u.hue ? 'active' : ''}" style="--h:${h}" data-hue="${h}" role="radio" aria-checked="${h === u.hue}" aria-label="Color ${h}"></button>`).join('')}</div></div>
              <div class="form-actions"><button class="btn btn-primary" type="submit"><span class="btn-label">Save changes</span></button></div>
            </form></section>

          <section class="card" id="subscription" aria-labelledby="sub-title">
            <div class="card-head"><h2 id="sub-title">Subscription</h2>
              <div class="billing-toggle"><span>Monthly</span><button class="toggle" id="p-billing" role="switch" aria-checked="${yearly}" aria-label="Yearly billing"></button><span>Yearly <span class="badge badge-success">-30%</span></span></div></div>
            <div class="current-plan"><div><span class="muted small">Current plan</span><strong>${plan.name}</strong>${s.planTrialEnds ? `<span class="muted small">Free trial until ${s.planTrialEnds}</span>` : ''}</div>
              ${s.plan !== 'free' ? '<button class="btn btn-sm btn-ghost" id="cancel-plan">Cancel subscription</button>' : '<span class="muted small vi-hint">Dùng thử miễn phí 7 ngày các gói trả phí.</span>'}</div>
            <div class="plan-grid compact">${DATA.plans.map(p => {
              const price = yearly ? Math.round(p.monthly * 0.7 / 1000) * 1000 : p.monthly, cur = p.id === s.plan;
              return `<article class="plan ${p.popular ? 'plan-popular' : ''} ${cur ? 'plan-current' : ''}">${p.popular ? '<span class="plan-flag">Most popular</span>' : ''}
                <h3>${p.name}</h3><div class="plan-price"><strong>${fmtVND(price)}</strong>${p.monthly ? '<span>/month</span>' : ''}</div>
                <ul>${p.features.map(f => `<li>${icon('check', 14)} ${f}</li>`).join('')}</ul>
                <button class="btn btn-block ${cur ? 'btn-secondary' : p.popular ? 'btn-primary' : 'btn-secondary'}" data-plan="${p.id}" ${cur ? 'disabled' : ''}>${cur ? 'Current plan' : p.monthly ? (s.plan === 'free' ? 'Start 7-day free trial' : 'Switch plan') : 'Downgrade to Free'}</button></article>`;
            }).join('')}</div></section>

          <section class="card" id="settings" aria-labelledby="set-title"><h2 id="set-title">Settings</h2>
            <ul class="settings-list">
              <li><div><strong>Explanation language</strong><span class="muted small">Show Vietnamese hints next to English content</span></div>
                <select id="set-hints" class="input input-sm" aria-label="Explanation language"><option value="vi" ${s.settings.hints === 'vi' ? 'selected' : ''}>Tiếng Việt + English</option><option value="en" ${s.settings.hints === 'en' ? 'selected' : ''}>English only</option></select></li>
              <li><div><strong>Notifications</strong><span class="muted small">Streak reminders, new lessons and class alerts</span></div><button class="toggle" data-set="notifications" role="switch" aria-checked="${s.settings.notifications}" aria-label="Notifications"></button></li>
              <li><div><strong>Daily reminder</strong><span class="muted small">We will remind you to practise</span></div><input type="time" id="set-reminder" class="input input-sm" value="${s.settings.reminder}" aria-label="Reminder time" ${s.settings.notifications ? '' : 'disabled'}></li>
              <li><div><strong>Dark mode</strong><span class="muted small">Easier on the eyes at night</span></div><button class="toggle" data-set="dark" role="switch" aria-checked="${s.settings.dark}" aria-label="Dark mode"></button></li>
              <li><div><strong>Sound</strong><span class="muted small">Audio for words, sentences and conversations</span></div><button class="toggle" data-set="sound" role="switch" aria-checked="${s.settings.sound}" aria-label="Sound"></button></li>
              <li><div><strong>Playback speed</strong><span class="muted small">Default speed for listening audio</span></div>
                <div class="chip-row" role="radiogroup" aria-label="Playback speed">${[0.75, 1, 1.25].map(r => `<button class="chip ${s.settings.speed === r ? 'active' : ''}" data-speed="${r}" role="radio" aria-checked="${s.settings.speed === r}">${r}x</button>`).join('')}<button class="btn btn-sm btn-ghost" id="test-sound">${icon('volume', 14)} Test</button></div></li>
              <li><div><strong>Privacy</strong><span class="muted small">Who can see you on the leaderboard</span></div>
                <select id="set-privacy" class="input input-sm" aria-label="Privacy">${[['public', 'Everyone'], ['friends', 'Friends only'], ['private', 'Only me']].map(([k, v]) => `<option value="${k}" ${s.settings.privacy === k ? 'selected' : ''}>${v}</option>`).join('')}</select></li>
            </ul>
            <div class="danger-zone"><div><strong>Reset demo data</strong><span class="muted small">Restore XP, streak, courses and progress to the demo defaults.</span></div><button class="btn btn-sm btn-secondary" id="reset-data">Reset</button></div>
            <div class="danger-zone"><div><strong>Log out</strong><span class="muted small">You can log back in with your email.</span></div><button class="btn btn-sm btn-danger" id="logout2">${icon('logout', 14)} Log out</button></div>
          </section>
        </div>
      </div>`;
    bind();
  };

  const bind = () => {
    let hue = s.user.hue;
    $$('.hue-dot').forEach(b => b.addEventListener('click', () => { hue = +b.dataset.hue; $$('.hue-dot').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', x === b); }); }));
    $('#profile-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('#pf-name'), email = $('#pf-email');
      $$('.field', e.target).forEach(f => f.classList.remove('has-error'));
      let ok = true;
      if (name.value.trim().length < 2) { name.closest('.field').classList.add('has-error'); $('.field-error', name.closest('.field')).textContent = 'Please enter your name. Vui lòng nhập họ tên.'; ok = false; }
      if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { email.closest('.field').classList.add('has-error'); $('.field-error', email.closest('.field')).textContent = 'Invalid email. Email không hợp lệ.'; ok = false; }
      if (!ok) return;
      const oldEmail = s.user.email;
      Object.assign(s.user, { name: name.value.trim(), email: email.value.trim(), level: $('#pf-level').value, goal: $('#pf-goal').value, hue });
      s.dailyGoal = +$('#pf-target').value;
      const users = App.users(), acc = users.find(x => x.email === oldEmail);
      if (acc) { Object.assign(acc, { name: s.user.name, email: s.user.email, level: s.user.level }); App.saveUsers(users); }
      App.save(); toast('Profile saved. Đã lưu thông tin.', 'success');
      $$('.topbar .avatar').forEach(a => { a.textContent = initials(s.user.name); a.style.setProperty('--h', hue); });
      render();
    });
    $('#p-billing').addEventListener('click', () => { yearly = !yearly; render(); $('#p-billing').focus(); });
    $$('[data-plan]').forEach(b => b.addEventListener('click', () => upgrade(DATA.plans.find(p => p.id === b.dataset.plan))));
    const cp = $('#cancel-plan'); if (cp) cp.addEventListener('click', () => openModal({ title: 'Cancel subscription?', body: '<p>You will keep premium features until the end of the current period, then move to the Free plan.</p><p class="vi-hint">Bạn vẫn dùng được các tính năng cho đến hết chu kỳ.</p>', actions: [{ label: 'Keep plan', cls: 'btn-primary' }, { label: 'Cancel subscription', cls: 'btn-danger', onClick: () => { s.plan = 'free'; s.planTrialEnds = null; App.save(); toast('Subscription cancelled.', 'info'); render(); } }] }));
    $('#set-hints').addEventListener('change', e => { s.settings.hints = e.target.value; App.save(); App.applyTheme(); const h = $('#hint-lang'); if (h) h.value = e.target.value; toast('Saved.', 'success'); });
    $$('[data-set]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.set, v = !s.settings[k];
      if (k === 'dark') App.toggleDark(v); else { s.settings[k] = v; App.save(); }
      b.setAttribute('aria-checked', v);
      if (k === 'notifications') $('#set-reminder').disabled = !v;
      toast(`${b.getAttribute('aria-label')} ${v ? 'on' : 'off'}.`, 'info');
    }));
    $('#set-reminder').addEventListener('change', e => { s.settings.reminder = e.target.value; App.save(); toast(`Reminder set for ${e.target.value}.`, 'success'); });
    $$('[data-speed]').forEach(b => b.addEventListener('click', () => { s.settings.speed = +b.dataset.speed; App.save(); $$('[data-speed]').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', x === b); }); toast(`Playback speed: ${b.dataset.speed}x`, 'info'); }));
    $('#test-sound').addEventListener('click', () => speak('This is your English Up playback speed.'));
    $('#set-privacy').addEventListener('change', e => { s.settings.privacy = e.target.value; App.save(); toast('Privacy updated.', 'success'); });
    $('#reset-data').addEventListener('click', () => openModal({ title: 'Reset demo data?', body: '<p>This restores the demo progress. Your account stays logged in.</p><p class="vi-hint">Dữ liệu học tập sẽ trở về mặc định.</p>', actions: [{ label: 'Cancel' }, { label: 'Reset', cls: 'btn-danger', onClick: () => { const user = s.user; App.state = defaultState(); App.state.user = user; App.save(); toast('Demo data reset.', 'success'); setTimeout(() => location.reload(), 600); } }] }));
    $('#logout2').addEventListener('click', () => App.logout());
  };

  const upgrade = p => {
    if (!p.monthly) { s.plan = 'free'; s.planTrialEnds = null; App.save(); toast('You are now on the Free plan.', 'info'); render(); return; }
    const price = yearly ? Math.round(p.monthly * 0.7 / 1000) * 1000 : p.monthly;
    const trial = s.plan === 'free';
    openModal({
      title: `${trial ? 'Start your free trial' : 'Switch'} — ${p.name}`,
      body: `<div class="summary-line"><span>${p.name} · ${yearly ? 'yearly' : 'monthly'}</span><strong>${fmtVND(yearly ? price * 12 : price)}${yearly ? '/year' : '/month'}</strong></div>
        ${trial ? `<p class="muted small">You pay <strong>0đ today</strong>. Cancel anytime during the 7-day trial. <span class="vi-hint">Không mất phí trong 7 ngày đầu.</span></p>` : ''}
        <fieldset class="pay-methods"><legend>Payment method</legend>${[['momo', '🟣 MoMo'], ['zalopay', '🔵 ZaloPay'], ['card', '💳 Visa / Mastercard'], ['bank', '🏦 Bank transfer (VietQR)']].map(([k, v], i) => `<label class="pay-opt"><input type="radio" name="pay" value="${k}" ${i === 0 ? 'checked' : ''}> ${v}</label>`).join('')}</fieldset>
        <p class="small muted">Demo only — no real payment is made.</p>`,
      actions: [{ label: 'Cancel' }, { label: trial ? 'Start 7-day free trial' : 'Confirm', cls: 'btn-primary', onClick: () => {
        s.plan = p.id; s.planTrialEnds = trial ? dateKey(addDays(new Date(), 7)).split('-').reverse().join('/') : s.planTrialEnds;
        App.save(); App.notify('👑', `Welcome to ${p.name}! Enjoy all premium features.`);
        toast(`🎉 You are now on ${p.name}.`, 'success'); render();
        const up = $('.upgrade-card'); if (up) up.remove();
      } }]
    });
  };

  render();
  if (location.hash) setTimeout(() => { const t = $(location.hash); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
  window.addEventListener('hashchange', () => { const t = $(location.hash); if (t) t.scrollIntoView({ behavior: 'smooth' }); });
};
