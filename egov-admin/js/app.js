/*
 * App shell: roles, mock login, layout (sidebar, top bar), global search, notifications and hash router.
 * Routes: #/<module>/<param>  e.g. #/citizens/CT-0001
 */
window.GA = window.GA || {};
GA.modules = GA.modules || {};
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon;
  const S = GA.store;

  /* ---------- Navigation catalogue ---------- */
  const NAV = [
    { group: 'Overview', items: [['dashboard', 'Dashboard', 'grid']] },
    { group: 'Citizens & services', items: [['citizens', 'Citizens', 'users'], ['services', 'Public services', 'file'], ['procedures', 'Administrative procedures', 'list'], ['identity', 'Digital identity', 'idcard'], ['complaints', 'Public complaints', 'message']] },
    { group: 'Sector management', items: [['tax', 'Tax administration', 'receipt'], ['insurance', 'Social insurance', 'shield'], ['land', 'Land management', 'map'], ['vehicles', 'Vehicle registration', 'car'], ['business', 'Business registration', 'briefcase']] },
    { group: 'Office', items: [['documents', 'Electronic documents', 'inbox']] },
    { group: 'Analytics & system', items: [['reports', 'Reports & statistics', 'chart'], ['users', 'Users & roles', 'usercog'], ['settings', 'System settings', 'settings']] },
  ];
  const PORTAL_LABELS = { dashboard: 'My dashboard', services: 'My applications', complaints: 'My feedback', identity: 'My e-ID account', business: 'My enterprise', tax: 'My tax account', settings: 'Preferences' };
  const ALL = NAV.flatMap((g) => g.items.map((i) => i[0]));

  const ROLES = {
    sysadmin: { label: 'System Administrator', vi: 'Quản trị hệ thống', modules: ALL, edit: ALL, approve: true },
    officer: { label: 'Government Officer', vi: 'Cán bộ, công chức', modules: ['dashboard', 'citizens', 'services', 'vehicles', 'documents', 'procedures', 'complaints', 'reports', 'settings'], edit: ['citizens', 'services', 'documents', 'complaints', 'vehicles'] },
    manager: { label: 'Department Manager', vi: 'Lãnh đạo đơn vị', modules: ['dashboard', 'services', 'documents', 'procedures', 'complaints', 'reports', 'users', 'settings'], edit: ['services', 'documents', 'procedures', 'complaints'], approve: true },
    psofficer: { label: 'Public Service Officer', vi: 'Cán bộ một cửa', modules: ['dashboard', 'services', 'procedures', 'citizens', 'identity', 'complaints', 'settings'], edit: ['services', 'citizens', 'identity', 'complaints'] },
    tax: { label: 'Tax Officer', vi: 'Cán bộ thuế', modules: ['dashboard', 'tax', 'business', 'reports', 'settings'], edit: ['tax', 'business'] },
    land: { label: 'Land Management Officer', vi: 'Cán bộ địa chính', modules: ['dashboard', 'land', 'citizens', 'services', 'reports', 'settings'], edit: ['land'] },
    insurance: { label: 'Social Insurance Officer', vi: 'Cán bộ BHXH', modules: ['dashboard', 'insurance', 'citizens', 'reports', 'settings'], edit: ['insurance'] },
    citizen: { label: 'Citizen', vi: 'Công dân', portal: true, modules: ['dashboard', 'services', 'procedures', 'complaints', 'identity', 'settings'], edit: [] },
    business: { label: 'Business User', vi: 'Doanh nghiệp', portal: true, modules: ['dashboard', 'services', 'business', 'tax', 'procedures', 'complaints', 'settings'], edit: [] },
  };

  const app = {
    ROLES, NAV, user: null,
    get role() { return this.user ? ROLES[this.user.role] : null; },
    get portal() { return !!(this.role && this.role.portal); },
    roleLabel(r) { const x = ROLES[r]; return x ? t(x.label) : r; },
    canView(m) { return !!this.role && this.role.modules.includes(m); },
    can(action, m) {
      const r = this.role; if (!r) return false;
      if (action === 'approve') return !!r.approve || (r.edit.includes(m) && ['tax', 'land', 'insurance', 'vehicles', 'business', 'identity'].includes(m));
      if (action === 'admin') return this.user.role === 'sysadmin';
      return r.edit.includes(m);
    },
    /* Subject ids a portal user owns (citizen id, business id). */
    subjects() { const u = this.user; return u ? [u.subjectId, u.businessId].filter(Boolean) : []; },
    owns(id) { return this.subjects().includes(id); },
    me() { return this.user && this.user.subjectId ? S.find('citizens', this.user.subjectId) : null; },
    officerId() { return this.user && this.user.officerId; },
    go(hash) { if (location.hash === hash) route(); else location.hash = hash; },
    refresh() { route(); },
    rebuild() { renderShell(); route(); },
  };
  GA.app = app;

  /* ---------- Boot ---------- */
  function boot() {
    S.init();
    GA.i18n.set(S.setting('lang') || 'en');
    const sess = S.session();
    const u = sess && S.find('users', sess.userId);
    if (u && u.status !== 'Locked') { app.user = u; renderShell(); route(); } else renderLogin();
    window.addEventListener('hashchange', () => { if (app.user) route(); });
  }

  /* ---------- Login ---------- */
  const DEMO_ORDER = ['admin', 'officer', 'manager', 'psofficer', 'tax', 'land', 'insurance', 'citizen', 'business'];
  const band = () => `<div class="gov-band"><span class="band-left flex">${U.starMark().replace('<svg', '<svg class="star"')}${t('Socialist Republic of Viet Nam')}</span><span class="band-right"><span class="demo-flag">${t('Demo environment. All records are fictional.')}</span><span>${t('Hotline')} ${esc(S.setting('hotline'))}</span></span></div>`;

  function renderLogin(msg) {
    document.body.classList.remove('nav-open');
    const users = DEMO_ORDER.map((n) => S.all('users').find((u) => u.username === n)).filter(Boolean);
    document.title = t('Sign in') + ' | ' + t('e-Gov Administration');
    document.getElementById('app').innerHTML = `${band()}
    <main class="login" id="main">
      <section class="login-aside" aria-label="${t('About this platform')}">
        <div class="brand"><span class="brand-mark">${U.starMark()}</span><div><div class="brand-name">${t('e-Gov Administration')}</div><div class="brand-org">${esc(S.setting('orgName'))}</div></div></div>
        <h1>${t('One platform for citizens, businesses and public servants')}</h1>
        <p class="lead">${t('Process public service applications, manage registers and handle official documents across every level of local administration.')}</p>
        <div class="login-units">
          <div>${icon('globe')}<span><strong>${t('National level')}</strong>${t('Links to the National Public Service Portal and national population database')}</span></div>
          <div>${icon('building')}<span><strong>${t('Province / City')}</strong>${t('Departments, People\'s Committee office, Public Administrative Service Center')}</span></div>
          <div>${icon('layers')}<span><strong>${t('District level')}</strong>${t('District People\'s Committees and specialised divisions')}</span></div>
          <div>${icon('home')}<span><strong>${t('Ward / Commune')}</strong>${t('One-stop desks for civil status, certification and residence')}</span></div>
        </div>
        <div class="login-foot">${t('Fictional demonstration system. Not affiliated with any government agency.')}</div>
      </section>
      <section class="login-main">
        <div class="login-card">
          <h2>${t('Sign in')}</h2>
          <p class="sub">${t('Use your official account or a VNeID-style e-ID to continue.')}</p>
          ${msg ? `<div class="callout bad mb-1" role="alert">${icon('alert')}<div>${msg}</div></div>` : ''}
          <form id="login-form" novalidate>
            <div class="field" data-field="username"><label for="lg-user">${t('Username')}</label><input id="lg-user" name="username" autocomplete="username" required><div class="err" id="lg-user-err"></div></div>
            <div class="field" data-field="password"><label for="lg-pass">${t('Password')}</label><div class="pw-wrap"><input id="lg-pass" name="password" type="password" autocomplete="current-password" required><button type="button" class="btn btn-icon" id="pw-toggle" aria-label="${t('Show password')}">${icon('eye', 'i-sm')}</button></div><div class="err"></div></div>
            <label class="check"><input type="checkbox" checked><span>${t('Keep me signed in on this device')}</span></label>
            <button class="btn btn-primary" type="submit">${icon('lock')}${t('Sign in')}</button>
          </form>
          <div class="demo-accounts">
            <h3>${t('Demo accounts')}</h3>
            <div class="xs muted">${t('Select a role to sign in instantly. Password for every demo account:')} <span class="code">Demo@2026</span></div>
            <div class="demo-grid">${users.map((u) => `<button type="button" data-demo="${esc(u.username)}"><span class="d-role">${esc(app.roleLabel(u.role))}</span><span class="d-user">${esc(u.username)} · ${esc(u.name)}</span></button>`).join('')}</div>
          </div>
          <div class="flex mt-2 xs">${langToggle()}</div>
        </div>
      </section>
    </main>`;
    const f = document.getElementById('login-form');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const un = f.elements.username.value.trim(), pw = f.elements.password.value;
      U.$$('.field', f).forEach((x) => x.classList.remove('invalid'));
      if (!un) { const w = f.querySelector('[data-field=username]'); w.classList.add('invalid'); w.querySelector('.err').textContent = t('This field is required.'); f.elements.username.focus(); return; }
      if (!pw) { const w = f.querySelector('[data-field=password]'); w.classList.add('invalid'); w.querySelector('.err').textContent = t('This field is required.'); f.elements.password.focus(); return; }
      const u = S.all('users').find((x) => x.username.toLowerCase() === un.toLowerCase());
      if (!u || pw !== 'Demo@2026') return renderLogin(t('The username or password is incorrect. Demo accounts use the password Demo@2026.'));
      if (u.status === 'Locked') return renderLogin(t('This account is locked. Contact the system administrator.'));
      login(u);
    });
    document.getElementById('pw-toggle').onclick = (e) => { const p = f.elements.password; p.type = p.type === 'password' ? 'text' : 'password'; e.currentTarget.innerHTML = icon(p.type === 'password' ? 'eye' : 'eyeoff', 'i-sm'); };
    U.$$('[data-demo]').forEach((b) => b.onclick = () => login(S.all('users').find((u) => u.username === b.dataset.demo)));
    bindLang(document.getElementById('app'), () => renderLogin());
    setTimeout(() => { const i = document.getElementById('lg-user'); if (i) i.focus(); }, 20);
  }

  function login(u, silent) {
    app.user = u;
    S.update('users', u.id, { lastLogin: U.nowIso() });
    S.setSession({ userId: u.id, at: U.nowIso() });
    S.log('Signed in', '', app.roleLabel(u.role));
    renderShell();
    if (location.hash !== '#/dashboard') location.hash = '#/dashboard'; else route();
    if (!silent) GA.ui.toast(t('Signed in as {name} ({role}).', { name: esc(u.name), role: esc(app.roleLabel(u.role)) }), 'success');
  }
  function logout() {
    S.log('Signed out', '', '');
    S.clearSession(); app.user = null;
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { location.hash = ''; }
    renderLogin();
  }
  app.logout = logout;

  /* ---------- Shell ---------- */
  const langToggle = () => `<div class="lang-toggle" role="group" aria-label="${t('Language')}"><button type="button" data-lang="en" aria-pressed="${GA.i18n.lang === 'en'}">EN</button><button type="button" data-lang="vi" aria-pressed="${GA.i18n.lang === 'vi'}">VI</button></div>`;
  function bindLang(root, after) {
    U.$$('[data-lang]', root).forEach((b) => b.onclick = () => { GA.i18n.set(b.dataset.lang); S.setting('lang', b.dataset.lang); after(); });
  }

  function navCounts() {
    const c = {};
    const open = ['Submitted', 'Under Review', 'Additional Information Required'];
    if (app.portal) {
      c.services = S.where('applications', (a) => app.owns(a.applicantId) && a.status === 'Additional Information Required').length;
    } else {
      c.services = S.where('applications', (a) => open.includes(a.status)).length;
      c.complaints = S.where('complaints', (x) => !['Resolved', 'Closed'].includes(x.status)).length;
      c.documents = S.where('documents', (d) => ['Awaiting receipt', 'Awaiting signature'].includes(d.status)).length;
    }
    return c;
  }

  function sidebarHTML() {
    const counts = navCounts();
    return NAV.map((g) => {
      const items = g.items.filter((i) => app.canView(i[0]));
      if (!items.length) return '';
      return `<div class="nav-group"><div class="nav-group-title">${t(g.group)}</div>${items.map(([id, label, ic]) => `<a href="#/${id}" data-nav="${id}">${icon(ic)}<span>${t(app.portal && PORTAL_LABELS[id] ? PORTAL_LABELS[id] : label)}</span>${counts[id] ? `<span class="count" aria-label="${counts[id]} ${t('pending')}">${counts[id]}</span>` : ''}</a>`).join('')}</div>`;
    }).join('');
  }
  app.refreshNav = () => { const n = document.getElementById('nav'); if (n) { n.innerHTML = sidebarHTML(); markActive(); } };

  function renderShell() {
    const u = app.user, r = app.role;
    const demo = DEMO_ORDER.map((n) => S.all('users').find((x) => x.username === n)).filter(Boolean);
    const org = r.portal ? t('Public service portal') : esc(S.setting('orgName'));
    document.getElementById('app').innerHTML = `${band()}
    <div class="shell">
      <aside class="sidebar" id="sidebar" aria-label="${t('Main navigation')}">
        <div class="brand"><span class="brand-mark">${U.starMark()}</span><div><div class="brand-name">${t('e-Gov Administration')}</div><div class="brand-org">${org}</div></div></div>
        <nav class="nav" id="nav">${sidebarHTML()}</nav>
        <div class="sidebar-foot"><strong>${esc(S.setting('orgVi'))}</strong>${t('Unit code')} ${esc(S.setting('orgCode'))} · ${t('Hotline')} ${esc(S.setting('hotline'))}</div>
      </aside>
      <div class="scrim" id="scrim"></div>
      <div class="main-col">
        <header class="topbar">
          <button class="icon-btn menu-btn" id="menu-btn" aria-label="${t('Open menu')}" aria-controls="sidebar" aria-expanded="false">${icon('menu')}</button>
          <div class="global-search" role="search">${icon('search')}
            <input id="gsearch" type="search" autocomplete="off" placeholder="${t(r.portal ? 'Search services and procedures' : 'Search citizens, applications, plates, documents…')}" aria-label="${t('Global search')}" aria-controls="gsearch-results" aria-expanded="false">
            <div class="search-results" id="gsearch-results" hidden></div>
          </div>
          <div class="top-actions">
            ${langToggle()}
            <div class="dd"><button class="role-pill" data-dd-toggle aria-haspopup="true" aria-expanded="false" title="${t('Switch demo role')}">${icon('swap', 'i-sm')}<span class="rp-text">${esc(app.roleLabel(u.role))}</span></button>
              <div class="dd-menu" role="menu"><div class="dd-head">${t('Switch demo role')}</div>${demo.map((d) => `<button class="dd-item ${d.id === u.id ? 'current' : ''}" role="menuitem" data-switch="${d.id}">${GA.ui.avatar(d.name)}<span><span class="strong">${esc(app.roleLabel(d.role))}</span><span class="xs muted" style="display:block">${esc(d.name)}</span></span></button>`).join('')}</div></div>
            <div class="dd"><button class="icon-btn" id="bell" data-dd-toggle aria-haspopup="true" aria-expanded="false" aria-label="${t('Notifications')}">${icon('bell')}<span class="dot" id="bell-dot" hidden></span></button>
              <div class="dd-menu notif-menu" id="notif-menu"></div></div>
            <div class="dd"><button class="user-chip" data-dd-toggle aria-haspopup="true" aria-expanded="false">${GA.ui.avatar(u.name)}<span class="u-text"><span class="u-name" style="display:block">${esc(u.name)}</span><span class="u-role" style="display:block">${esc(u.title || app.roleLabel(u.role))}</span></span>${icon('chevD', 'i-sm')}</button>
              <div class="dd-menu" role="menu">
                <div class="dd-head">${esc(u.email || '')}</div>
                ${r.portal ? `<a class="dd-item" href="#/identity" role="menuitem">${icon('idcard')}${t('My e-ID account')}</a>` : ''}
                <a class="dd-item" href="#/settings" role="menuitem">${icon('settings')}${t(r.portal ? 'Preferences' : 'System settings')}</a>
                <button class="dd-item" data-reset-demo role="menuitem">${icon('refresh')}${t('Reset demo data')}</button>
                <div class="dd-sep"></div>
                <button class="dd-item" id="logout" role="menuitem">${icon('logout')}${t('Sign out')}</button>
              </div></div>
          </div>
        </header>
        <main class="content" id="main" tabindex="-1"></main>
      </div>
    </div>`;
    const root = document.getElementById('app');
    bindLang(root, () => { renderShell(); route(); });
    document.getElementById('logout').onclick = logout;
    U.$$('[data-switch]', root).forEach((b) => b.onclick = () => { const nu = S.find('users', b.dataset.switch); if (nu && nu.id !== app.user.id) login(nu); });
    U.$('[data-reset-demo]', root).onclick = async () => {
      const ok = await GA.ui.confirm({ title: t('Reset demo data'), message: t('All changes made in this browser will be discarded and the original demo data restored.'), danger: true, confirmLabel: t('Reset data') });
      if (!ok) return;
      const uname = app.user.username; S.reset();
      app.user = S.all('users').find((x) => x.username === uname); S.setSession({ userId: app.user.id });
      renderShell(); route(); GA.ui.toast(t('Demo data restored.'), 'success');
    };
    const mb = document.getElementById('menu-btn'), scrim = document.getElementById('scrim');
    const setNav = (open) => { document.body.classList.toggle('nav-open', open); mb.setAttribute('aria-expanded', String(open)); };
    mb.onclick = () => setNav(!document.body.classList.contains('nav-open'));
    scrim.onclick = () => setNav(false);
    document.getElementById('nav').addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
    bindSearch();
    app.refreshBell();
  }

  /* ---------- Notifications ---------- */
  function myNotifs() { const subs = app.subjects(); return S.all('notifications').filter((n) => (app.portal ? subs.includes(n.audience) : n.audience === 'staff')); }
  const NIC = { warning: ['alert', 'warn'], error: ['alert', 'bad'], success: ['checkcircle', 'ok'], info: ['info', ''] };
  app.refreshBell = function () {
    const menu = document.getElementById('notif-menu'); if (!menu || !app.user) return;
    const list = myNotifs(), unread = list.filter((n) => !n.read).length;
    const dot = document.getElementById('bell-dot');
    dot.hidden = !unread; dot.textContent = unread > 9 ? '9+' : unread;
    document.getElementById('bell').setAttribute('aria-label', t('Notifications') + (unread ? ` (${unread} ${t('unread')})` : ''));
    menu.innerHTML = `<div class="dd-head"><span>${t('Notifications')}</span><span class="spacer"></span>${unread ? `<button class="btn btn-ghost btn-sm" data-read-all>${t('Mark all as read')}</button>` : ''}</div>
      <div class="notif-list">${list.length ? list.slice(0, 20).map((n) => { const ic = NIC[n.type] || NIC.info; return `<div class="notif ${n.read ? '' : 'unread'}" data-notif="${n.id}" role="button" tabindex="0"><span class="n-ic l-ic ${ic[1]}">${icon(ic[0], 'i-sm')}</span><div><div class="n-title">${esc(t(n.title))}</div><div class="n-body">${esc(n.body)}</div><div class="n-time">${U.ago(n.time)}</div></div></div>`; }).join('') : `<div class="search-results"><div class="empty">${t('You have no notifications.')}</div></div>`}</div>`;
    const ra = menu.querySelector('[data-read-all]');
    if (ra) ra.onclick = (e) => { e.stopPropagation(); list.forEach((n) => { n.read = true; }); S.save(); app.refreshBell(); };
    U.$$('[data-notif]', menu).forEach((el) => {
      const open = () => { const n = list.find((x) => x.id === el.dataset.notif); n.read = true; S.save(); menu.closest('.dd').classList.remove('open'); app.refreshBell(); if (n.link) app.go(n.link); };
      el.onclick = open; el.onkeydown = (e) => { if (e.key === 'Enter') open(); };
    });
  };

  /* ---------- Global search ---------- */
  function searchIndex(q) {
    const n = U.norm(q); if (n.length < 2) return [];
    const hit = (...vals) => vals.some((v) => U.norm(v).includes(n));
    const groups = [];
    const add = (mod, label, rows) => { if (app.canView(mod) && rows.length) groups.push({ label, rows: rows.slice(0, 5) }); };
    const P = app.portal, own = (id) => !P || app.owns(id);
    if (!P) add('citizens', 'Citizens', S.where('citizens', (c) => hit(c.fullName, c.cid, c.phone)).map((c) => ({ href: '#/citizens/' + c.id, ic: 'user', title: c.fullName, sub: c.cid + ' · ' + U.address(c) })));
    add('services', P ? 'My applications' : 'Applications', S.where('applications', (a) => own(a.applicantId) && hit(a.code, a.applicantName, a.serviceName)).map((a) => ({ href: '#/services/' + a.id, ic: 'file', title: a.serviceName, sub: a.code + ' · ' + a.applicantName })));
    add('services', 'Public services', S.where('services', (s) => hit(s.name, s.vi, s.code)).map((s) => ({ href: '#/services?tab=catalog', ic: 'layers', title: s.name, sub: s.vi })));
    add('procedures', 'Procedures', S.where('procedures', (p) => hit(p.code, p.name, p.vi)).map((p) => ({ href: '#/procedures?code=' + p.code, ic: 'list', title: p.name, sub: p.code })));
    if (!P) add('business', 'Businesses', S.where('businesses', (b) => hit(b.name, b.nameEn, b.code)).map((b) => ({ href: '#/business?id=' + b.id, ic: 'briefcase', title: b.name, sub: t('Enterprise code') + ' ' + b.code })));
    add('land', 'Land parcels', S.where('parcels', (p) => hit(p.certNo, p.ownerName, 'thua ' + p.parcelNo, p.street)).map((p) => ({ href: '#/land?id=' + p.id, ic: 'map', title: `${t('Parcel')} ${p.parcelNo}, ${t('sheet')} ${p.sheetNo}`, sub: p.ownerName + ' · ' + p.ward })));
    add('vehicles', 'Vehicles', S.where('vehicles', (v) => hit(v.plate, v.plate.replace(/[-. ]/g, ''), v.ownerName, v.chassisNo)).map((v) => ({ href: '#/vehicles?id=' + v.id, ic: 'car', title: v.plate + ' · ' + v.brand + ' ' + v.model, sub: v.ownerName })));
    add('documents', 'Documents', S.where('documents', (d) => hit(d.number, d.summary, d.sender)).map((d) => ({ href: '#/documents?id=' + d.id, ic: 'inbox', title: d.number, sub: d.summary })));
    add('complaints', P ? 'My feedback' : 'Complaints', S.where('complaints', (c) => own(c.citizenId) && hit(c.code, c.title, c.citizenName)).map((c) => ({ href: '#/complaints/' + c.id, ic: 'message', title: c.title, sub: c.code })));
    return groups;
  }
  function bindSearch() {
    const inp = document.getElementById('gsearch'), box = document.getElementById('gsearch-results');
    let links = [], hl = -1;
    const close = () => { box.hidden = true; inp.setAttribute('aria-expanded', 'false'); hl = -1; };
    const render = () => {
      const q = inp.value.trim();
      if (q.length < 2) return close();
      const g = searchIndex(q);
      box.innerHTML = g.length ? g.map((gr) => `<div class="sr-group">${t(gr.label)}</div>${gr.rows.map((r) => `<a href="${r.href}">${icon(r.ic, 'i-sm')}<span><span class="strong" style="display:block">${esc(r.title)}</span><span class="xs muted">${esc(r.sub)}</span></span></a>`).join('')}`).join('') : `<div class="empty">${t('No results for “{q}”.', { q: esc(q) })}</div>`;
      box.hidden = false; inp.setAttribute('aria-expanded', 'true');
      links = U.$$('a', box); hl = -1;
    };
    inp.addEventListener('input', U.debounce(render, 120));
    inp.addEventListener('focus', render);
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); return; }
      if (!links.length || box.hidden) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hl = (hl + (e.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length; links.forEach((a, i) => a.classList.toggle('hl', i === hl)); links[hl].scrollIntoView({ block: 'nearest' }); }
      if (e.key === 'Enter') { e.preventDefault(); const a = links[hl >= 0 ? hl : 0]; if (a) { location.hash = a.getAttribute('href'); inp.value = ''; close(); } }
    });
    box.addEventListener('click', (e) => { if (e.target.closest('a')) { inp.value = ''; close(); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('.global-search')) close(); });
  }

  /* ---------- Router ---------- */
  function parseHash() {
    const h = (location.hash || '#/dashboard').slice(2);
    const [path, qs] = h.split('?');
    const seg = path.split('/').filter(Boolean).map(decodeURIComponent);
    const query = {};
    (qs || '').split('&').filter(Boolean).forEach((p) => { const [k, v] = p.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v || ''); });
    return { mod: seg[0] || 'dashboard', params: seg.slice(1), query };
  }
  function markActive() { const { mod } = parseHash(); U.$$('#nav a').forEach((a) => { const on = a.dataset.nav === mod; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }

  function route() {
    const main = document.getElementById('main');
    if (!main || !app.user) return;
    const r = parseHash();
    U.$$('.modal-backdrop').forEach((m) => m.remove()); document.body.style.overflow = '';
    markActive();
    const m = GA.modules[r.mod];
    const navItem = NAV.flatMap((g) => g.items).find((i) => i[0] === r.mod);
    if (!m || !navItem) { main.innerHTML = deny('Page not found', 'The page you requested does not exist or has moved.'); return; }
    if (!app.canView(r.mod)) { main.innerHTML = deny('Access restricted', 'Your role ({role}) does not have access to {page}. Switch to a role with this permission to continue.', { role: app.roleLabel(app.user.role), page: t(navItem[1]) }); return; }
    document.title = t(app.portal && PORTAL_LABELS[r.mod] ? PORTAL_LABELS[r.mod] : navItem[1]) + ' | ' + t('e-Gov Administration');
    try { m.render(main, r.params, r.query); }
    catch (err) { console.error(err); main.innerHTML = deny('Something went wrong', 'This page could not be displayed. Reset the demo data from the user menu if the problem continues.'); }
    GA.ui.bindTabs(main);
    window.scrollTo(0, 0);
    const h1 = main.querySelector('[data-page-title]'); if (h1) h1.focus({ preventScroll: true });
    app.refreshNav();
  }
  function deny(title, msg, params) {
    return `<div class="deny">${icon('lock')}<h1 class="mt-2" tabindex="-1" data-page-title>${t(title)}</h1><p class="muted">${t(msg, params)}</p><a class="btn btn-primary" href="#/dashboard">${icon('home')}${t('Back to dashboard')}</a></div>`;
  }

  document.addEventListener('DOMContentLoaded', boot);
})(window.GA);
