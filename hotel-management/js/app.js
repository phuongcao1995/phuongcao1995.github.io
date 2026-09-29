/* =========================================================
   App shell: demo login, role-based navigation, hash router,
   top bar (branch, search, clock, theme, notifications).
   ========================================================= */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const $ = (id) => document.getElementById(id);

  const NAV = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { group: 'Front office', items: [
      { id: 'frontdesk', label: 'Front Desk', icon: 'frontdesk', badge: () => H.kpis().arrivalsPending || '' },
      { id: 'reservations', label: 'Reservations', icon: 'reservations' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar' },
      { id: 'rooms', label: 'Rooms', icon: 'rooms' },
      { id: 'guests', label: 'Guests', icon: 'guests' }] },
    { group: 'Rooms division', items: [
      { id: 'housekeeping', label: 'Housekeeping', icon: 'housekeeping', badge: () => HMS.store.data.rooms.filter((r) => r.status === 'Dirty').length || '' },
      { id: 'maintenance', label: 'Maintenance', icon: 'maintenance' }] },
    { group: 'Services & F&B', items: [
      { id: 'services', label: 'Services', icon: 'services' },
      { id: 'restaurant', label: 'Restaurant', icon: 'restaurant' }] },
    { group: 'Money', items: [
      { id: 'billing', label: 'Billing', icon: 'billing' },
      { id: 'payments', label: 'Payments', icon: 'payments' },
      { id: 'finance', label: 'Finance', icon: 'finance' }] },
    { group: 'People & sales', items: [
      { id: 'customers', label: 'Customers', icon: 'customers' },
      { id: 'staff', label: 'Staff', icon: 'staff' },
      { id: 'promotions', label: 'Promotions', icon: 'promotions' }] },
    { group: 'Purchasing', items: [
      { id: 'inventory', label: 'Inventory', icon: 'inventory', badge: () => HMS.store.data.inventory.filter((i) => i.stock <= i.min).length || '' },
      { id: 'suppliers', label: 'Suppliers', icon: 'suppliers' }] },
    { group: 'Insights', items: [{ id: 'reports', label: 'Reports', icon: 'reports' }] },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];
  const ALL = NAV.flatMap((n) => n.items || [n]);

  /* Role → visible modules */
  const ACCESS = {
    Administrator: '*',
    'General Manager': '*',
    'Front Office Manager': ALL.map((x) => x.id).filter((id) => id !== 'settings'),
    Receptionist: ['dashboard', 'frontdesk', 'reservations', 'calendar', 'rooms', 'guests', 'services', 'restaurant', 'billing', 'payments', 'customers', 'promotions'],
    Housekeeper: ['dashboard', 'housekeeping', 'maintenance', 'rooms', 'inventory']
  };
  const can = (mod) => { const a = ACCESS[app.user && app.user.role] || []; return a === '*' || a.includes(mod); };

  const app = (HMS.app = { user: null, current: null, params: [], can });

  /* ---------------- Login ---------------- */
  function showLogin() {
    $('app').hidden = true;
    $('login-screen').hidden = false;
    const users = HMS.store.data.users;
    $('demo-accounts').innerHTML = users.map((u) => `<button type="button" class="demo-acc" data-u="${u.username}" data-p="${u.password}"><strong>${u.username}</strong><span>${U.esc(u.role)}</span></button>`).join('');
    $('login-user').focus();
  }
  function login(username, password) {
    const u = HMS.store.data.users.find((x) => x.username === username && x.password === password);
    if (!u) return false;
    HMS.store.setSession({ username: u.username, at: U.nowStamp() });
    start(u);
    return true;
  }
  function logout() {
    HMS.store.setSession(null);
    UI.closeAllModals();
    app.user = null;
    location.hash = '';
    showLogin();
  }
  app.logout = logout;

  $('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('login-error');
    const u = $('login-user').value.trim(), p = $('login-pass').value;
    if (!u || !p) { err.textContent = 'Enter your username and password.'; err.hidden = false; return; }
    if (!login(u, p)) { err.textContent = 'Username or password is incorrect. Try one of the demo accounts.'; err.hidden = false; }
    else err.hidden = true;
  });
  $('demo-accounts').addEventListener('click', (e) => {
    const b = e.target.closest('[data-u]');
    if (!b) return;
    $('login-user').value = b.dataset.u;
    $('login-pass').value = b.dataset.p;
    login(b.dataset.u, b.dataset.p);
  });

  /* ---------------- Sidebar ---------------- */
  function renderNav() {
    const collapsed = HMS.store.prefs().navCollapsed || [];
    const link = (it) => {
      const b = it.badge ? it.badge() : '';
      return `<a class="nav-link" href="#/${it.id}" data-nav="${it.id}" title="${U.esc(it.label)}"><span class="nav-ico">${icon(it.icon)}</span><span class="nav-label">${U.esc(it.label)}</span>${b ? `<span class="nav-badge">${b}</span>` : ''}</a>`;
    };
    $('nav').innerHTML = NAV.map((n) => {
      if (!n.items) return can(n.id) ? link(n) : '';
      const items = n.items.filter((it) => can(it.id));
      if (!items.length) return '';
      return `<div class="nav-group ${collapsed.includes(n.group) ? 'collapsed' : ''}" data-group="${U.esc(n.group)}">
        <button type="button" class="nav-group-head" aria-expanded="${!collapsed.includes(n.group)}"><span>${U.esc(n.group)}</span>${icon('chevron-down')}</button>
        <div class="nav-items">${items.map(link).join('')}</div></div>`;
    }).join('');
    highlightNav();
    const quick = ['dashboard', 'frontdesk', 'reservations', 'calendar', 'housekeeping', 'rooms'].filter(can).slice(0, 4);
    $('bottom-nav').innerHTML = quick.map((id) => { const it = ALL.find((x) => x.id === id); return `<a href="#/${id}" data-nav="${id}">${icon(it.icon)}<span>${it.label.replace('Front Desk', 'Desk')}</span></a>`; }).join('') + `<button type="button" id="bottom-more">${icon('menu')}<span>More</span></button>`;
  }
  function highlightNav() {
    U.qsa('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === app.current));
  }
  $('nav').addEventListener('click', (e) => {
    const g = e.target.closest('.nav-group-head');
    if (!g) return;
    const grp = g.parentElement;
    grp.classList.toggle('collapsed');
    g.setAttribute('aria-expanded', !grp.classList.contains('collapsed'));
    const list = U.qsa('.nav-group.collapsed').map((x) => x.dataset.group);
    HMS.store.setPref('navCollapsed', list);
  });
  const appEl = $('app');
  $('menu-btn').innerHTML = icon('menu');
  $('collapse-btn').innerHTML = icon('sidebar');
  $('menu-btn').addEventListener('click', () => appEl.classList.add('drawer-open'));
  $('sidebar-overlay').addEventListener('click', () => appEl.classList.remove('drawer-open'));
  $('collapse-btn').addEventListener('click', () => {
    if (window.matchMedia('(max-width: 1180px)').matches) { appEl.classList.toggle('side-expanded'); return; }
    appEl.classList.toggle('side-mini');
    HMS.store.setPref('sideMini', appEl.classList.contains('side-mini'));
  });
  document.addEventListener('click', (e) => { if (e.target.closest('#bottom-more')) appEl.classList.add('drawer-open'); });
  $('logout-side').addEventListener('click', logout);
  U.qsa('[data-icon]').forEach((el) => { el.outerHTML = icon(el.dataset.icon); });

  /* ---------------- Top bar ---------------- */
  function renderTop() {
    const d = HMS.store.data;
    const cur = HMS.store.prefs().branch || 'BR01';
    $('branch-select').innerHTML = d.branches.map((b) => `<option value="${b.id}" ${b.id === cur ? 'selected' : ''} ${b.status !== 'Active' ? 'disabled' : ''}>${U.esc(b.name)}${b.status !== 'Active' ? ' (opening soon)' : ''}</option>`).join('');
    const br = d.branches.find((b) => b.id === cur) || d.branches[0];
    $('brand-branch').textContent = br.name.replace('Sunrise ', '');
    const u = app.user;
    $('user-avatar').textContent = U.initials(u.name);
    $('user-name').textContent = u.name;
    $('user-role').textContent = u.role;
    $('user-menu').innerHTML = `<div class="dd-head"><strong style="color:var(--ink)">${U.esc(u.name)}</strong><br>${U.esc(u.role)} · ${U.esc(u.email)}</div><div class="dd-sep"></div>
      ${can('staff') ? `<a class="dd-item" href="#/staff">${icon('user')}My profile</a>` : ''}
      ${can('settings') ? `<a class="dd-item" href="#/settings">${icon('settings')}Settings</a>` : ''}
      <button type="button" class="dd-item" data-shortcuts>${icon('info')}Keyboard shortcuts</button>
      <div class="dd-sep"></div><button type="button" class="dd-item danger" data-logout>${icon('logout')}Log out</button>`;
    renderTheme();
    renderNotifications();
  }
  $('user-menu').addEventListener('click', (e) => {
    if (e.target.closest('[data-logout]')) logout();
    if (e.target.closest('[data-shortcuts]')) UI.modal({ title: 'Keyboard shortcuts', size: 'sm', body: `<dl class="dl"><dt><span class="kbd">/</span></dt><dd>Focus global search</dd><dt><span class="kbd">Esc</span></dt><dd>Close dialog</dd><dt><span class="kbd">N</span></dt><dd>New reservation</dd><dt><span class="kbd">C</span></dt><dd>Open calendar</dd></dl>` });
    $('user-dd').classList.remove('open');
  });
  $('branch-select').addEventListener('change', (e) => {
    const b = HMS.store.data.branches.find((x) => x.id === e.target.value);
    HMS.store.setPref('branch', b.id);
    renderTop();
    UI.toast(`Switched to ${b.name}. Demo data is shared across branches.`, 'info');
  });
  $('lang-select').addEventListener('change', (e) => {
    if (e.target.value === 'vi') { UI.toast('Tiếng Việt is coming in the next release. Showing English.', 'info'); e.target.value = 'en'; }
  });
  function renderTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    $('theme-btn').innerHTML = icon(dark ? 'sun' : 'moon');
    $('theme-btn').setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  $('theme-btn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    HMS.store.setPref('theme', next);
    renderTheme();
  });
  function tick() {
    const p = U.vnParts();
    $('clock-date').textContent = `${U.weekday(U.today())}, ${U.fmtDate(U.today())}`;
    $('clock-time').textContent = `${p.hour}:${p.minute}:${p.second}`;
  }

  /* ---------------- Notifications ---------------- */
  const NTONE = { checkin: ['info', 'checkin'], checkout: ['violet', 'logout'], housekeeping: ['danger', 'housekeeping'], maintenance: ['neutral', 'maintenance'], inventory: ['warn', 'inventory'], payment: ['success', 'payments'], reservation: ['info', 'reservations'], vip: ['lantern', 'star'], frontdesk: ['teal', 'frontdesk'] };
  function renderNotifications() {
    const list = H.notifications();
    const unread = list.filter((n) => !n.read).length;
    $('notif-count').hidden = !unread;
    $('notif-count').textContent = unread > 9 ? '9+' : unread;
    $('notif-menu').innerHTML = `<div class="notif-head"><strong>Notifications</strong>${unread ? '<button type="button" class="link-btn small" data-read-all>Mark all as read</button>' : '<span class="small muted">All caught up</span>'}</div>
      <div class="notif-list">${list.length ? list.map((n) => { const t = NTONE[n.type] || ['neutral', 'info']; return `<div class="notif-item ${n.read ? '' : 'unread'}" data-nid="${n.id}" data-link="${n.link || ''}"><span class="notif-ico tone-${t[0]}">${icon(t[1])}</span><div><p>${U.esc(n.text)}</p><small>${U.relTime(n.time)}</small></div></div>`; }).join('') : UI.empty('No notifications', '')}</div>`;
  }
  $('notif-menu').addEventListener('click', (e) => {
    const d = HMS.store.data;
    if (e.target.closest('[data-read-all]')) {
      H.notifications().forEach((n) => { if (!d.readNotifs.includes(n.id)) d.readNotifs.push(n.id); });
      d.notifications.forEach((n) => { n.read = true; });
      HMS.store.commit();
      e.stopPropagation();
      return;
    }
    const it = e.target.closest('.notif-item');
    if (it) {
      if (!d.readNotifs.includes(it.dataset.nid)) d.readNotifs.push(it.dataset.nid);
      HMS.store.commit();
      $('notif-dd').classList.remove('open');
      if (it.dataset.link) location.hash = it.dataset.link;
    }
  });

  /* ---------------- Global search ---------------- */
  const sInput = $('global-search-input'), sBox = $('search-results');
  function doSearch() {
    const q = sInput.value.trim().toLowerCase();
    if (q.length < 2) { sBox.hidden = true; return; }
    const d = HMS.store.data;
    const gs = d.guests.filter((g) => `${g.name} ${g.phone} ${g.email} ${g.idNumber}`.toLowerCase().includes(q)).slice(0, 5);
    const rs = d.reservations.filter((r) => `${r.id} ${H.guestName(r.guestId)} ${r.otaRef || ''}`.toLowerCase().includes(q)).slice(-5).reverse();
    const rm = d.rooms.filter((r) => r.number.includes(q) || (r.name || '').toLowerCase().includes(q)).slice(0, 4);
    const sec = (title, items) => items.length ? `<div class="search-group">${title}</div>${items.join('')}` : '';
    const html = sec('Guests', can('guests') ? gs.map((g) => `<a class="search-item" href="#/guests/${g.id}"><span class="avatar sm">${U.initials(g.name)}</span><span>${U.esc(g.name)}${U.vip(g)}<small>${U.esc(g.phone)} · ${U.esc(g.nationality)}</small></span></a>`) : [])
      + sec('Reservations', can('reservations') ? rs.map((r) => `<a class="search-item" href="#/reservations/${r.id}"><span class="avatar sm">${icon('reservations')}</span><span>${r.id} · ${U.esc(H.guestName(r.guestId))}<small>${U.fmtDate(r.checkIn)} → ${U.fmtDate(r.checkOut)} · ${r.status}</small></span></a>`) : [])
      + sec('Rooms', can('rooms') ? rm.map((r) => `<a class="search-item" href="#/rooms/${r.id}"><span class="avatar sm">${icon('rooms')}</span><span>Room ${r.number}${r.name ? ' · ' + U.esc(r.name) : ''}<small>${H.typeName(r.typeId)} · ${r.status}</small></span></a>`) : []);
    sBox.innerHTML = html || `<div class="empty" style="padding:20px">No matches for “${U.esc(sInput.value)}”</div>`;
    sBox.hidden = false;
  }
  sInput.addEventListener('input', U.debounce(doSearch, 150));
  sInput.addEventListener('focus', doSearch);
  sBox.addEventListener('click', (e) => { if (e.target.closest('a')) { sBox.hidden = true; sInput.value = ''; } });
  document.addEventListener('click', (e) => { if (!e.target.closest('#global-search')) sBox.hidden = true; });
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea, select') || e.metaKey || e.ctrlKey || document.body.classList.contains('modal-open') || !app.user) return;
    if (e.key === '/') { e.preventDefault(); sInput.focus(); }
    if (e.key.toLowerCase() === 'n' && can('reservations')) { e.preventDefault(); HMS.modules.reservations.openForm(); }
    if (e.key.toLowerCase() === 'c' && can('calendar')) location.hash = '#/calendar';
  });

  /* ---------------- Router ---------------- */
  function route(evt) {
    if (!app.user) return;
    const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const mod = parts[0] || 'dashboard';
    const view = $('view');
    appEl.classList.remove('drawer-open', 'side-expanded');
    if (evt !== false) UI.closeAllModals();
    app.current = mod;
    app.params = parts.slice(1);
    highlightNav();
    const m = HMS.modules[mod];
    if (!m) { view.innerHTML = UI.pageHead({ title: 'Page not found' }) + `<div class="card">${UI.empty('This page does not exist', 'Pick a module from the menu.', '<a class="btn btn-primary" href="#/dashboard">Go to dashboard</a>')}</div>`; return; }
    if (!can(mod)) { view.innerHTML = UI.pageHead({ title: m.title }) + `<div class="card"><div class="empty"><div class="empty-ico">${icon('lock')}</div><h3>No access</h3><p>Your role (${U.esc(app.user.role)}) cannot open ${U.esc(m.title)}. Ask an administrator for access.</p><a class="btn btn-primary" href="#/dashboard">Go to dashboard</a></div></div>`; return; }
    document.title = `${m.title} · Sunrise HMS`;
    view.onclick = view.onchange = view.oninput = null;
    try { m.render(view, app.params); }
    catch (err) { console.error(err); view.innerHTML = `<div class="card">${UI.empty('Something went wrong loading this page', err.message)}</div>`; }
    if (evt !== false) window.scrollTo(0, 0);
  }
  app.refresh = () => { const y = window.scrollY; route(false); window.scrollTo(0, y); };
  app.go = (hash) => { if (location.hash === hash) route(); else location.hash = hash; };
  window.addEventListener('hashchange', route);

  /* Keep chrome in sync with data changes */
  HMS.bus.on('change', U.debounce(() => { if (app.user) { renderNotifications(); renderNav(); } }, 60));

  /* KPI tiles act as links */
  document.addEventListener('click', (e) => { const k = e.target.closest('.kpi[data-link]'); if (k) location.hash = k.dataset.link; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const k = e.target.closest && e.target.closest('.kpi[data-link]'); if (k) location.hash = k.dataset.link; } });

  /* ---------------- Boot ---------------- */
  function start(u) {
    app.user = u;
    $('login-screen').hidden = true;
    appEl.hidden = false;
    renderNav();
    renderTop();
    tick();
    if (!app.timer) app.timer = setInterval(tick, 1000);
    if (!location.hash || !location.hash.startsWith('#/')) location.hash = '#/dashboard';
    else route();
    if (!HMS.store.storageOk) UI.toast('Browser storage is unavailable. Changes will not be saved after reload.', 'warn');
  }

  HMS.store.load();
  const p = HMS.store.prefs();
  const theme = p.theme || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  if (p.sideMini) appEl.classList.add('side-mini');
  const sess = HMS.store.session();
  const u = sess && HMS.store.data.users.find((x) => x.username === sess.username);
  if (u) start(u); else showLogin();
})();
