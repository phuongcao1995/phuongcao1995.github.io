/* EnglishUp — core app: state, shell, gamification */
'use strict';
window.Pages = window.Pages || {};

const STATE_KEY = 'englishup_state';
const USERS_KEY = 'englishup_users';
const PUBLIC_PAGES = ['landing', 'login', 'register', 'level-test'];

const NAV_GROUPS = [
  { label: 'Learn', items: [
    { id: 'dashboard', label: 'Dashboard', icon: 'home', href: 'dashboard.html' },
    { id: 'lesson', label: 'Learn', icon: 'book', href: 'lesson.html' },
    { id: 'courses', label: 'Courses', icon: 'grid', href: 'courses.html' }] },
  { label: 'Skills', items: [
    { id: 'speaking', label: 'Speaking', icon: 'mic', href: 'speaking.html' },
    { id: 'pronunciation', label: 'Pronunciation', icon: 'wave', href: 'pronunciation.html' },
    { id: 'vocabulary', label: 'Vocabulary', icon: 'cards', href: 'vocabulary.html' },
    { id: 'grammar', label: 'Grammar', icon: 'pen', href: 'grammar.html' },
    { id: 'listening', label: 'Listening', icon: 'headphones', href: 'listening.html' }] },
  { label: 'Practice', items: [
    { id: 'live-classes', label: 'Live Classes', icon: 'video', href: 'live-classes.html' },
    { id: 'practice', label: 'Practice', icon: 'target', href: 'practice.html' },
    { id: 'ai-tutor', label: 'AI Tutor', icon: 'sparkles', href: 'ai-tutor.html' },
    { id: 'writing-checker', label: 'Writing Checker', icon: 'file', href: 'writing-checker.html' }] },
  { label: 'You', items: [
    { id: 'progress', label: 'Progress', icon: 'chart', href: 'progress.html' },
    { id: 'achievements', label: 'Achievements', icon: 'trophy', href: 'achievements.html' },
    { id: 'subscription', label: 'Subscription', icon: 'crown', href: 'profile.html#subscription' },
    { id: 'settings', label: 'Settings', icon: 'settings', href: 'profile.html#settings' }] }
];
const BOTTOM_NAV = [
  { id: 'dashboard', label: 'Home', icon: 'home', href: 'dashboard.html', match: ['dashboard'] },
  { id: 'learn', label: 'Learn', icon: 'book', href: 'courses.html', match: ['courses', 'course-detail', 'lesson', 'grammar', 'vocabulary', 'listening'] },
  { id: 'practice', label: 'Practice', icon: 'mic', href: 'practice.html', match: ['practice', 'speaking', 'pronunciation', 'ai-tutor', 'writing-checker', 'live-classes', 'teacher'] },
  { id: 'progress', label: 'Progress', icon: 'chart', href: 'progress.html', match: ['progress', 'achievements'] },
  { id: 'profile', label: 'Profile', icon: 'user', href: 'profile.html', match: ['profile'] }
];
const ACTIVE_ALIAS = { 'course-detail': 'courses', teacher: 'live-classes' };

function defaultState() {
  return {
    user: null, xp: 1240, streak: 12, lastActive: dateKey(), todayDate: dateKey(),
    todayMinutes: 20, dailyGoal: 30, weekly: [25, 35, 20, 45, 30, 40, 15], totalMinutes: 2840,
    stats: { lessons: 47, speaking: 34, pronunciation: 58, wordsBase: 386, grammar: 12, classes: 0, pronBest: 87, challenges: 3,
      speakingScores: [62, 65, 70, 68, 74, 78, 81], vocabGrowth: [120, 165, 210, 248, 290, 331, 386] },
    skills: { Speaking: 72, Listening: 65, Vocabulary: 81, Grammar: 70, Pronunciation: 76 },
    enrolled: ['c3', 'c5', 'c11'], completed: { c3: ['c3-1', 'c3-2', 'c3-3', 'c3-4'], c5: ['c5-1', 'c5-2'] },
    lastLesson: { course: 'c3', lesson: 'c3-5' },
    todayDone: [], favorites: [], srs: {}, notes: {},
    settings: { dark: false, sound: true, speed: 1, notifications: true, hints: 'vi', privacy: 'public', reminder: '20:00' },
    notifications: DATA.notifications.map(n => ({ ...n, read: false })),
    bookings: [], challenge: { date: dateKey(), words: 0, pron: 0, speak: 0, claimed: false },
    plan: 'free', unlocked: [], levelTest: null, pronHistory: [], history: []
  };
}

const App = {
  state: null,
  page: document.body ? document.body.dataset.page : '',

  load() {
    const saved = Store.get(STATE_KEY, null);
    const def = defaultState();
    this.state = saved ? { ...def, ...saved, stats: { ...def.stats, ...(saved.stats || {}) }, settings: { ...def.settings, ...(saved.settings || {}) }, challenge: { ...def.challenge, ...(saved.challenge || {}) } } : def;
    this.rollDay();
  },
  save() { Store.set(STATE_KEY, this.state); },

  /* New day: reset daily counters and check streak */
  rollDay() {
    const s = this.state, today = dateKey();
    if (s.todayDate !== today) {
      s.todayDate = today; s.todayMinutes = 0; s.todayDone = [];
      s.challenge = { date: today, words: 0, pron: 0, speak: 0, claimed: false };
    }
    const yesterday = dateKey(addDays(new Date(), -1));
    if (s.lastActive !== today && s.lastActive !== yesterday) s.streak = 0;
    this.save();
  },

  /* ---------- Auth ---------- */
  users() { return Store.get(USERS_KEY, [{ name: 'Nguyen Thi Phuong', email: 'phuong@englishup.vn', password: 'demo123', level: 'B1' }]); },
  saveUsers(list) { Store.set(USERS_KEY, list); },
  login(user) {
    this.state.user = { name: user.name, email: user.email, level: user.level || 'B1', goal: user.goal || 'Speak confidently at work', hue: user.hue ?? 235 };
    this.save();
  },
  logout() {
    this.state.user = null; this.save(); stopSpeaking();
    location.href = 'login.html';
  },
  get level() { const u = this.state.user; return (u && u.level) || 'B1'; },

  /* ---------- Gamification ---------- */
  levelInfo(xp = this.state.xp) {
    const L = DATA.xpLevels;
    let i = L.length - 1; while (i > 0 && xp < L[i].min) i--;
    const cur = L[i], next = L[i + 1];
    const pct = next ? (xp - cur.min) / (next.min - cur.min) * 100 : 100;
    return { ...cur, next, pct, toNext: next ? next.min - xp : 0 };
  },
  addXP(amount, reason = '') {
    const before = this.levelInfo().n;
    this.state.xp += amount;
    this.touch();
    this.save();
    toast(`<strong>+${amount} XP</strong> ${esc(reason)}`, 'xp');
    const after = this.levelInfo();
    if (after.n > before) {
      this.notify('🎉', `Level up! You are now Level ${after.n} — ${after.name}.`);
      setTimeout(() => openModal({ title: 'Level up! 🎉', body: `<div class="center-block"><div class="big-emoji">🚀</div><p class="lead">You reached <strong>Level ${after.n} — ${after.name}</strong>.</p><p class="muted">Tuyệt vời! Hãy tiếp tục duy trì thói quen học mỗi ngày.</p></div>`, actions: [{ label: 'Keep learning', cls: 'btn-primary' }] }), 600);
    }
    this.checkAchievements();
    this.refreshShell();
  },
  /* Log study minutes (updates daily goal, weekly chart, streak) */
  logMinutes(min) {
    const s = this.state;
    const wasBelow = s.todayMinutes < s.dailyGoal;
    s.todayMinutes += min; s.totalMinutes += min;
    const idx = (new Date().getDay() + 6) % 7; // Monday = 0
    s.weekly[idx] = (s.weekly[idx] || 0) + min;
    this.touch(); this.save();
    if (wasBelow && s.todayMinutes >= s.dailyGoal) {
      this.notify('✅', 'Daily goal complete! Great job today.');
      toast('🎯 Daily goal complete! Hoàn thành mục tiêu hôm nay.', 'success');
    }
  },
  touch() {
    const s = this.state, today = dateKey();
    if (s.lastActive !== today) {
      s.streak = s.lastActive === dateKey(addDays(new Date(), -1)) ? s.streak + 1 : 1;
      s.lastActive = today;
      toast(`🔥 ${s.streak}-day streak!`, 'success');
    }
  },
  markToday(key) { if (!this.state.todayDone.includes(key)) { this.state.todayDone.push(key); this.save(); } },
  bumpChallenge(key, n = 1) {
    const c = this.state.challenge; c[key] = (c[key] || 0) + n; this.save();
  },
  challengeTasks() {
    const c = this.state.challenge;
    return [
      { key: 'words', label: 'Learn 10 new words', vi: 'Học 10 từ mới', have: Math.min(c.words, 10), need: 10, href: 'vocabulary.html', icon: '📚' },
      { key: 'pron', label: 'Complete 5 pronunciation exercises', vi: 'Hoàn thành 5 bài phát âm', have: Math.min(c.pron, 5), need: 5, href: 'pronunciation.html', icon: '🎙' },
      { key: 'speak', label: 'Speak for 5 minutes', vi: 'Nói tiếng Anh 5 phút', have: Math.min(c.speak, 5), need: 5, href: 'speaking.html', icon: '🗣' }
    ];
  },
  wordsLearned() { return this.state.stats.wordsBase + Object.values(this.state.srs).filter(x => x.box > 0).length; },
  metric(m) {
    const s = this.state;
    return { lessons: s.stats.lessons, streak: s.streak, speaking: s.stats.speaking, words: this.wordsLearned(), pronBest: s.stats.pronBest, grammar: s.stats.grammar, classes: s.stats.classes, xp: s.xp }[m] || 0;
  },
  checkAchievements() {
    const s = this.state;
    DATA.achievements.forEach(a => {
      if (!s.unlocked.includes(a.id) && this.metric(a.metric) >= a.target) {
        s.unlocked.push(a.id);
        if (this._booted) { toast(`${a.icon} Badge unlocked: <strong>${esc(a.name)}</strong>`, 'success', 4000); this.notify(a.icon, `Badge unlocked: ${a.name}`); }
      }
    });
    this.save();
  },
  notify(iconEmoji, text) {
    this.state.notifications.unshift({ id: 'n' + Date.now(), icon: iconEmoji, text, time: 'Just now', read: false });
    this.state.notifications = this.state.notifications.slice(0, 30);
    this.save(); this.renderNotifications();
  },

  /* ---------- Courses helpers ---------- */
  course(id) { return DATA.courses.find(c => c.id === id); },
  courseLessons(c) {
    if (typeof c === 'string') c = this.course(c);
    if (!c) return [];
    const real = DATA.lessons.filter(l => l.course === c.id);
    if (real.length) return real;
    return (c.syllabus || []).map((t, i) => ({ id: `${c.id}-${i + 1}`, course: c.id, n: i + 1, title: t, duration: `${8 + (i * 3) % 7} min`, generated: true }));
  },
  courseProgress(id) {
    const total = this.courseLessons(id).length || 1;
    return Math.round(((this.state.completed[id] || []).length / total) * 100);
  },
  courseCard(c) {
    const enrolled = this.state.enrolled.includes(c.id);
    const pct = this.courseProgress(c.id);
    const n = this.courseLessons(c).length;
    return `<article class="course-card">
      <a href="course-detail.html?id=${c.id}" class="course-link" aria-label="${esc(c.title)}">
        <div class="thumb" style="--h:${c.hue}"><span class="thumb-emoji" aria-hidden="true">${c.emoji}</span><span class="thumb-level">${c.level} ${DATA.levels[c.level]}</span></div>
        <div class="course-body">
          <span class="course-cat">${esc(c.category)}</span>
          <h3>${esc(c.title)}</h3>
          <div class="course-meta"><span>${icon('book', 14)} ${n} lessons</span><span>${icon('clock', 14)} ${c.duration}</span></div>
          <div class="course-meta"><span class="rating">★ ${c.rating}</span><span>${icon('users', 14)} ${fmtNum(c.students)}</span></div>
          ${enrolled ? `<div class="course-progress">${progressBar(pct)}<span>${pct}% complete</span></div>` : ''}
          <div class="course-foot"><strong class="price">${c.price ? fmtVND(c.price) : 'Free'}</strong>${enrolled ? '<span class="badge badge-success">Enrolled</span>' : ''}</div>
        </div>
      </a></article>`;
  },

  /* ---------- Theme ---------- */
  applyTheme() {
    document.documentElement.dataset.theme = this.state.settings.dark ? 'dark' : 'light';
    document.documentElement.dataset.hints = this.state.settings.hints;
  },
  toggleDark(force) {
    this.state.settings.dark = force ?? !this.state.settings.dark;
    this.save(); this.applyTheme();
    const t = $('#dark-toggle-menu'); if (t) t.setAttribute('aria-checked', this.state.settings.dark);
  },

  /* ---------- Shell ---------- */
  renderShell() {
    const page = this.page, active = ACTIVE_ALIAS[page] || page;
    const u = this.state.user, lvl = this.level;
    const hash = location.hash.slice(1);
    const header = document.createElement('header');
    header.className = 'topbar';
    header.innerHTML = `
      <button class="icon-btn sidebar-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button>
      <a href="dashboard.html" class="logo" aria-label="EnglishUp home">${LOGO_SVG}<span>English<b>Up</b></span></a>
      <div class="search" role="search">
        ${icon('search', 18, 'search-ic')}
        <input type="search" id="global-search" placeholder="Search courses, words, grammar…" aria-label="Search" autocomplete="off">
        <div class="search-results" id="search-results" role="listbox" hidden></div>
      </div>
      <div class="topbar-actions">
        <a href="achievements.html" class="pill pill-level" title="Your English level">${lvl} ${DATA.levels[lvl]}</a>
        <a href="progress.html" class="pill pill-streak" title="Learning streak"><span aria-hidden="true">🔥</span> <span id="streak-count">${this.state.streak}</span></a>
        <label class="lang-select" title="Explanation language">
          <span class="sr-only">Explanation language</span>
          <select id="hint-lang" aria-label="Explanation language">
            <option value="vi" ${this.state.settings.hints === 'vi' ? 'selected' : ''}>🇻🇳 VI</option>
            <option value="en" ${this.state.settings.hints === 'en' ? 'selected' : ''}>🇬🇧 EN</option>
          </select>
        </label>
        <div class="dropdown" id="notif-dd">
          <button class="icon-btn" id="notif-btn" aria-label="Notifications" aria-haspopup="true" aria-expanded="false">${icon('bell')}<span class="dot-badge" id="notif-count" hidden></span></button>
          <div class="dropdown-panel notif-panel" role="menu" hidden>
            <div class="dd-head"><strong>Notifications</strong><button class="link-btn" id="mark-all">Mark all as read</button></div>
            <ul class="notif-list" id="notif-list"></ul>
          </div>
        </div>
        <div class="dropdown" id="user-dd">
          <button class="avatar-btn" aria-label="Account menu" aria-haspopup="true" aria-expanded="false"><span class="avatar" style="--h:${u.hue}">${initials(u.name)}</span></button>
          <div class="dropdown-panel user-panel" role="menu" hidden>
            <div class="user-head"><span class="avatar avatar-lg" style="--h:${u.hue}">${initials(u.name)}</span><div><strong>${esc(u.name)}</strong><span class="muted small">${esc(u.email)}</span></div></div>
            <a role="menuitem" href="profile.html">${icon('user', 18)} Profile</a>
            <a role="menuitem" href="profile.html#settings">${icon('settings', 18)} Settings</a>
            <a role="menuitem" href="profile.html#subscription">${icon('crown', 18)} Subscription <span class="badge badge-soft">${this.state.plan}</span></a>
            <button role="menuitemcheckbox" id="dark-toggle-menu" aria-checked="${this.state.settings.dark}">${icon('moon', 18)} Dark mode <span class="mini-switch" aria-hidden="true"></span></button>
            <button role="menuitem" id="logout-btn" class="danger-text">${icon('logout', 18)} Log out</button>
          </div>
        </div>
      </div>`;
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar'; sidebar.id = 'sidebar'; sidebar.setAttribute('aria-label', 'Main navigation');
    sidebar.innerHTML = `<nav>${NAV_GROUPS.map(g => `
      <div class="nav-group"><span class="nav-group-label">${g.label}</span>
      ${g.items.map(i => {
        const on = i.id === active || (page === 'profile' && i.id === hash);
        return `<a href="${i.href}" class="nav-item ${on ? 'active' : ''}" ${on ? 'aria-current="page"' : ''} title="${i.label}">${icon(i.icon)}<span>${i.label}</span></a>`;
      }).join('')}</div>`).join('')}</nav>
      ${this.state.plan === 'free' ? `<div class="upgrade-card"><strong>Go Premium</strong><p>AI coach, all scenarios and unlimited lessons.</p><a class="btn btn-sm btn-primary btn-block" href="profile.html#subscription">Try 7 days free</a></div>` : ''}`;
    const bottom = document.createElement('nav');
    bottom.className = 'bottom-nav'; bottom.setAttribute('aria-label', 'Mobile navigation');
    bottom.innerHTML = BOTTOM_NAV.map(b => { const on = b.match.includes(page); return `<a href="${b.href}" class="${on ? 'active' : ''}" ${on ? 'aria-current="page"' : ''}>${icon(b.icon, 22)}<span>${b.label}</span></a>`; }).join('');
    const backdrop = document.createElement('div'); backdrop.className = 'sidebar-backdrop';
    const skip = document.createElement('a'); skip.href = '#main'; skip.className = 'skip-link'; skip.textContent = 'Skip to content';
    document.body.prepend(skip, header, sidebar, backdrop);
    document.body.appendChild(bottom);
    document.body.classList.add('app-layout');
    if (Store.get('englishup_collapsed', false)) document.body.classList.add('sidebar-collapsed');
    this.bindShell();
    this.renderNotifications();
  },
  refreshShell() {
    const sc = $('#streak-count'); if (sc) sc.textContent = this.state.streak;
  },
  bindShell() {
    const toggle = $('.sidebar-toggle'), body = document.body;
    toggle.addEventListener('click', () => {
      if (window.innerWidth <= 768) { const open = body.classList.toggle('sidebar-open'); toggle.setAttribute('aria-expanded', open); }
      else { const c = body.classList.toggle('sidebar-collapsed'); Store.set('englishup_collapsed', c); toggle.setAttribute('aria-expanded', !c); }
    });
    $('.sidebar-backdrop').addEventListener('click', () => body.classList.remove('sidebar-open'));
    // Dropdowns
    $$('.dropdown').forEach(dd => {
      const btn = $('button', dd), panel = $('.dropdown-panel', dd);
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const willOpen = panel.hidden;
        this.closeDropdowns();
        panel.hidden = !willOpen; btn.setAttribute('aria-expanded', willOpen);
      });
      panel.addEventListener('click', e => e.stopPropagation());
    });
    document.addEventListener('click', () => { this.closeDropdowns(); $('#search-results').hidden = true; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { this.closeDropdowns(); body.classList.remove('sidebar-open'); } });
    $('#mark-all').addEventListener('click', () => { this.state.notifications.forEach(n => n.read = true); this.save(); this.renderNotifications(); });
    $('#logout-btn').addEventListener('click', () => this.logout());
    $('#dark-toggle-menu').addEventListener('click', () => this.toggleDark());
    $('#hint-lang').addEventListener('change', e => {
      this.state.settings.hints = e.target.value; this.save(); this.applyTheme();
      toast(e.target.value === 'vi' ? 'Hiển thị giải thích tiếng Việt' : 'Vietnamese hints hidden', 'info');
    });
    this.bindSearch();
  },
  closeDropdowns() { $$('.dropdown-panel').forEach(p => p.hidden = true); $$('.dropdown > button').forEach(b => b.setAttribute('aria-expanded', 'false')); },
  renderNotifications() {
    const list = $('#notif-list'); if (!list) return;
    const ns = this.state.notifications, unread = ns.filter(n => !n.read).length;
    const badge = $('#notif-count'); badge.hidden = !unread; badge.textContent = unread > 9 ? '9+' : unread;
    list.innerHTML = ns.length ? ns.map(n => `<li><button class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}"><span class="notif-ic" aria-hidden="true">${n.icon}</span><span><span class="notif-text">${esc(n.text)}</span><span class="notif-time">${esc(n.time)}</span></span></button></li>`).join('')
      : `<li>${emptyState('🔕', 'You are all caught up', 'New updates about your learning will appear here.')}</li>`;
    $$('.notif-item', list).forEach(b => b.addEventListener('click', () => {
      const n = ns.find(x => x.id === b.dataset.id); if (n) { n.read = true; this.save(); b.classList.remove('unread'); this.renderNotifications(); }
    }));
  },
  bindSearch() {
    const input = $('#global-search'), box = $('#search-results');
    const pages = NAV_GROUPS.flatMap(g => g.items).map(i => ({ type: 'Page', title: i.label, href: i.href }));
    const run = () => {
      const q = input.value.trim().toLowerCase();
      if (q.length < 2) { box.hidden = true; return; }
      const res = [
        ...pages.filter(p => p.title.toLowerCase().includes(q)),
        ...DATA.courses.filter(c => (c.title + c.category).toLowerCase().includes(q)).map(c => ({ type: 'Course', title: c.title, sub: c.level, href: `course-detail.html?id=${c.id}` })),
        ...DATA.vocab.filter(w => w.word.includes(q) || w.vi.toLowerCase().includes(q)).map(w => ({ type: 'Word', title: w.word, sub: w.vi, href: `vocabulary.html?word=${w.id}` })),
        ...DATA.grammar.filter(g => (g.name + g.title).toLowerCase().includes(q)).map(g => ({ type: 'Grammar', title: g.title, sub: g.name, href: `grammar.html?topic=${g.id}` })),
        ...DATA.teachers.filter(t => (t.name + t.spec).toLowerCase().includes(q)).map(t => ({ type: 'Teacher', title: t.name, sub: t.spec, href: `teacher.html?id=${t.id}` }))
      ].slice(0, 8);
      box.innerHTML = res.length ? res.map(r => `<a role="option" href="${r.href}" class="search-item"><span class="badge badge-soft">${r.type}</span><span><strong>${esc(r.title)}</strong>${r.sub ? ` <span class="muted">${esc(r.sub)}</span>` : ''}</span></a>`).join('')
        : `<div class="search-empty">No results for “${esc(q)}”. Try “improve”, “IELTS” or “present perfect”.</div>`;
      box.hidden = false;
    };
    input.addEventListener('input', debounce(run, 150));
    input.addEventListener('focus', run);
    input.addEventListener('click', e => e.stopPropagation());
    input.addEventListener('keydown', e => {
      const items = $$('.search-item', box);
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); items[0].focus(); }
      if (e.key === 'Enter' && items.length) { location.href = items[0].getAttribute('href'); }
    });
    box.addEventListener('keydown', e => {
      const items = $$('.search-item', box), i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || input).focus(); }
    });
  },

  init() {
    this.load();
    this.applyTheme();
    this.page = document.body.dataset.page;
    const isPublic = PUBLIC_PAGES.includes(this.page);
    if (!isPublic && !this.state.user) { location.replace('login.html?next=' + encodeURIComponent(location.pathname.split('/').pop() + location.search + location.hash)); return; }
    if (!isPublic) this.renderShell();
    this.checkAchievements();
    this._booted = true;
    const fn = Pages[this.page];
    if (fn) { try { fn(); } catch (err) { console.error(err); toast('Something went wrong on this page. Please reload.', 'error'); } }
  }
};
window.App = App;

const LOGO_SVG = `<svg class="logo-mark" width="32" height="32" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--primary)"/><path d="M9 21.5V11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-8.5z" fill="#fff"/><path d="M13 16.5 16 13.5l3 3M16 13.8V19" stroke="var(--primary)" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ---------------- Landing page ---------------- */
Pages.landing = () => {
  const logged = !!App.state.user;
  if (logged) $$('[data-auth-cta]').forEach(a => { a.href = 'dashboard.html'; if (a.dataset.authCta === 'label') a.textContent = 'Go to dashboard'; });
  // Mobile nav
  const nt = $('#nav-toggle'), nav = $('#site-nav');
  if (nt) nt.addEventListener('click', () => { const o = nav.classList.toggle('open'); nt.setAttribute('aria-expanded', o); });
  $$('#site-nav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  // Pricing
  const grid = $('#pricing-grid');
  const renderPricing = yearly => {
    grid.innerHTML = DATA.plans.map(p => {
      const price = yearly ? Math.round(p.monthly * 0.7 / 1000) * 1000 : p.monthly;
      return `<article class="plan ${p.popular ? 'plan-popular' : ''}">
        ${p.popular ? '<span class="plan-flag">Most popular</span>' : ''}
        <h3>${p.name}</h3><p class="muted">${p.desc}</p>
        <div class="plan-price"><strong>${fmtVND(price)}</strong>${p.monthly ? '<span>/month</span>' : ''}</div>
        <p class="plan-bill">${p.monthly ? (yearly ? `Billed ${fmtVND(price * 12)} yearly` : 'Billed monthly') : 'Free forever'}</p>
        <ul>${p.features.map(f => `<li>${icon('check', 16)} ${f}</li>`).join('')}</ul>
        <a href="${logged ? 'profile.html#subscription' : 'register.html?plan=' + p.id}" class="btn ${p.popular ? 'btn-primary' : 'btn-secondary'} btn-block">${p.monthly ? 'Start 7-day free trial' : 'Start for free'}</a>
      </article>`;
    }).join('');
  };
  const sw = $('#billing-switch');
  renderPricing(false);
  sw.addEventListener('click', () => { const y = sw.getAttribute('aria-checked') !== 'true'; sw.setAttribute('aria-checked', y); renderPricing(y); });
  // Hero demo: animate word feedback
  const words = $$('.hero-word');
  let i = 0;
  const reveal = () => { if (i < words.length) { words[i].classList.add('shown'); i++; setTimeout(reveal, 260); } else { const t = $('.hero-tip'); if (t) t.classList.add('shown'); } };
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setTimeout(reveal, 500); else { words.forEach(w => w.classList.add('shown')); const t = $('.hero-tip'); if (t) t.classList.add('shown'); }
  const hl = $('#hero-listen'); if (hl) hl.addEventListener('click', () => speak('I would like to improve my English.'));
  const ny = $('#footer-year'); if (ny) ny.textContent = new Date().getFullYear();
  $$('[data-soon]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); toast(`${esc(a.textContent.trim())} page is coming soon in this demo.`, 'info'); }));
  const nl = $('#newsletter'); if (nl) nl.addEventListener('submit', e => { e.preventDefault(); const v = $('input', nl).value; if (!/^\S+@\S+\.\S+$/.test(v)) { toast('Please enter a valid email. Email không hợp lệ.', 'error'); return; } nl.reset(); toast('Subscribed! Bạn sẽ nhận mẹo học tiếng Anh mỗi tuần.', 'success'); });
};

/* Shared grammar checker used by speaking, AI tutor and writing checker */
function checkGrammar(text) {
  let fixed = text; const issues = [];
  DATA.grammarRules.forEach(r => {
    r.re.lastIndex = 0;
    const found = text.match(r.re);
    if (found) {
      found.forEach(m => { r.re.lastIndex = 0; issues.push({ wrong: m.trim(), right: m.replace(new RegExp(r.re.source, r.re.flags.replace('g', '')), r.fix).trim(), en: r.en, vi: r.vi }); });
      r.re.lastIndex = 0;
      fixed = fixed.replace(r.re, r.fix);
    }
  });
  // Capitalise first letter and add end punctuation
  fixed = fixed.trim();
  if (fixed && /^[a-z]/.test(fixed)) { fixed = fixed[0].toUpperCase() + fixed.slice(1); }
  if (fixed && !/[.!?]$/.test(fixed)) fixed += '.';
  // drop duplicate / overlapping issues
  const kept = [];
  issues.sort((x, y) => y.wrong.length - x.wrong.length).forEach(i => {
    const w = i.wrong.toLowerCase();
    if (i.wrong === i.right || kept.some(k => k.wrong.toLowerCase().includes(w) || w.includes(k.wrong.toLowerCase()))) return;
    kept.push(i);
  });
  return { fixed, issues: kept };
}
window.checkGrammar = checkGrammar;

document.addEventListener('DOMContentLoaded', () => App.init());
