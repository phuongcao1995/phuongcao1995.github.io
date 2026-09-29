/* ==========================================================================
   NEXUS ERP — script.js
   Application shell: hash router (SPA navigation with back/forward), sidebar
   & permission-based menu, header (breadcrumb, global search, notifications,
   user menu, company selector, theme), demo login and app bootstrap.
   ========================================================================== */
'use strict';

/* ---------- Sidebar structure ---------- */
const NAV = [
  { route: 'dashboard', label: 'Dashboard', icon: 'dashboard', module: 'dashboard' },
  { section: 'Business' },
  { route: 'customers', label: 'Customers', icon: 'users', module: 'customers' },
  { label: 'Sales', icon: 'trending', module: 'sales', children: [
    { route: 'sales', label: 'Sales Dashboard' }, { route: 'quotations', label: 'Quotations' }] },
  { route: 'orders', label: 'Orders', icon: 'cart', module: 'orders' },
  { route: 'products', label: 'Products', icon: 'box', module: 'products' },
  { label: 'Inventory', icon: 'warehouse', module: 'inventory', children: [
    { route: 'inventory', label: 'Stock Overview', match: { tab: ['', 'stock'] } }, { route: 'inventory?tab=warehouses', label: 'Warehouses' },
    { route: 'inventory?tab=movements', label: 'Stock Movements' }, { route: 'inventory?tab=transfers', label: 'Stock Transfers' }] },
  { route: 'suppliers', label: 'Suppliers', icon: 'truck', module: 'suppliers' },
  { label: 'Purchasing', icon: 'clipboard', module: 'purchasing', children: [
    { route: 'purchasing?tab=requests', label: 'Purchase Requests' }, { route: 'purchasing', label: 'Purchase Orders', match: { tab: ['', 'orders'] } },
    { route: 'purchasing?tab=receipts', label: 'Goods Receipts' }, { route: 'purchasing?tab=bills', label: 'Supplier Invoices' }] },
  { section: 'Finance' },
  { route: 'billing', label: 'Billing', icon: 'file', module: 'billing' },
  { route: 'payments', label: 'Payments', icon: 'card', module: 'payments' },
  { route: 'expenses', label: 'Expenses', icon: 'receipt', module: 'expenses' },
  { route: 'finance', label: 'Finance', icon: 'dollar', module: 'finance' },
  { section: 'Accounting' },
  { route: 'accounts', label: 'Chart of Accounts', icon: 'list', module: 'accounts' },
  { route: 'journals', label: 'Journal Entries', icon: 'book', module: 'journals' },
  { route: 'ledger', label: 'General Ledger', icon: 'layers', module: 'ledger' },
  { route: 'ar', label: 'Accounts Receivable', icon: 'arrowIn', module: 'ar' },
  { route: 'ap', label: 'Accounts Payable', icon: 'arrowOut', module: 'ap' },
  { route: 'finreports', label: 'Financial Reports', icon: 'pie', module: 'finreports' },
  { section: 'Operations' },
  { route: 'projects', label: 'Projects', icon: 'briefcase', module: 'projects' },
  { route: 'tasks', label: 'Tasks', icon: 'tasks', module: 'tasks' },
  { route: 'employees', label: 'Employees', icon: 'user', module: 'employees' },
  { section: 'Reports' },
  { route: 'reports?cat=sales', label: 'Sales Reports', icon: 'chart', module: 'reports', match: { cat: ['', 'sales'] } },
  { route: 'reports?cat=inventory', label: 'Inventory Reports', icon: 'box', module: 'reports' },
  { route: 'reports?cat=purchasing', label: 'Purchasing Reports', icon: 'clipboard', module: 'reports' },
  { route: 'reports?cat=finance', label: 'Financial Reports', icon: 'dollar', module: 'reports' },
  { route: 'reports?cat=accounting', label: 'Accounting Reports', icon: 'book', module: 'reports' },
  { section: 'System' },
  { route: 'notifications', label: 'Notifications', icon: 'bell', module: 'notifications', badge: true },
  { route: 'settings', label: 'Settings', icon: 'settings', module: 'settings' },
];

/* ---------- Routes ---------- */
const ROUTES = {
  dashboard: { title: 'Dashboard', module: 'dashboard' },
  customers: { title: 'Customers', module: 'customers', section: 'Business' },
  customer: { title: 'Customer', module: 'customers', parent: 'customers' },
  'customer-statement': { title: 'Customer Statement', module: 'customers', parent: 'customers' },
  sales: { title: 'Sales Dashboard', module: 'sales', section: 'Sales' },
  quotations: { title: 'Quotations', module: 'sales', section: 'Sales' },
  quotation: { title: 'Quotation', module: 'sales', parent: 'quotations' },
  orders: { title: 'Orders', module: 'orders', section: 'Business' },
  order: { title: 'Order', module: 'orders', parent: 'orders' },
  products: { title: 'Products', module: 'products', section: 'Business' },
  product: { title: 'Product', module: 'products', parent: 'products' },
  inventory: { title: 'Inventory', module: 'inventory', section: 'Business' },
  suppliers: { title: 'Suppliers', module: 'suppliers', section: 'Business' },
  supplier: { title: 'Supplier', module: 'suppliers', parent: 'suppliers' },
  'supplier-statement': { title: 'Supplier Statement', module: 'suppliers', parent: 'suppliers' },
  purchasing: { title: 'Purchasing', module: 'purchasing', section: 'Business' },
  po: { title: 'Purchase Order', module: 'purchasing', parent: 'purchasing' },
  bill: { title: 'Supplier Invoice', module: 'purchasing', parent: 'purchasing' },
  billing: { title: 'Billing & Invoices', module: 'billing', section: 'Finance' },
  invoice: { title: 'Invoice', module: 'billing', parent: 'billing' },
  payments: { title: 'Payments', module: 'payments', section: 'Finance' },
  expenses: { title: 'Expenses', module: 'expenses', section: 'Finance' },
  finance: { title: 'Finance Dashboard', module: 'finance', section: 'Finance' },
  accounts: { title: 'Chart of Accounts', module: 'accounts', section: 'Accounting' },
  journals: { title: 'Journal Entries', module: 'journals', section: 'Accounting' },
  ledger: { title: 'General Ledger', module: 'ledger', section: 'Accounting' },
  ar: { title: 'Accounts Receivable', module: 'ar', section: 'Accounting' },
  ap: { title: 'Accounts Payable', module: 'ap', section: 'Accounting' },
  finreports: { title: 'Financial Reports', module: 'finreports', section: 'Accounting' },
  projects: { title: 'Projects', module: 'projects', section: 'Operations' },
  project: { title: 'Project', module: 'projects', parent: 'projects' },
  tasks: { title: 'Tasks', module: 'tasks', section: 'Operations' },
  employees: { title: 'Employees', module: 'employees', section: 'Operations' },
  reports: { title: 'Reports', module: 'reports', section: 'Reports' },
  notifications: { title: 'Notifications', module: 'notifications', section: 'System' },
  settings: { title: 'Settings', module: 'settings', section: 'System' },
  search: { title: 'Search Results', module: 'dashboard' },
};

function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [path, qs = ''] = h.split('?');
  const [route, ...rest] = path.split('/');
  const query = Object.fromEntries(new URLSearchParams(qs));
  return { route: route || 'dashboard', id: rest.join('/') || null, query };
}
/** SPA navigation: navigateTo('customers'), navigateTo('invoice/INV-2026-00125'), navigateTo('billing?status=open') */
function navigateTo(route, { replace = false } = {}) {
  const target = '#/' + String(route).replace(/^#?\/?/, '');
  if (location.hash === target) { App.render(); return; }
  if (replace) { history.replaceState(null, '', target); App.render(); } else location.hash = target;
}

/* ---------- Application ---------- */
const App = {
  params: { route: 'dashboard', id: null, query: {} },
  renderToken: 0,
  crumb: null,

  init() {
    DB.init();
    this.applyTheme(loadData('theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'), false);
    if (loadData('sidebar_collapsed')) document.body.classList.add('sidebar-collapsed');
    document.documentElement.classList.remove('pre-collapsed');
    if (DB.data.settings.appearance?.density === 'compact') document.body.classList.add('density-compact');
    this.bindShell();
    window.addEventListener('hashchange', () => this.render());
    this.boot();
  },
  boot() {
    if (!Auth.user()) { this.showLogin(); return; }
    $('#login-screen').hidden = true;
    $('#app').hidden = false;
    this.renderShell();
    if (!location.hash) history.replaceState(null, '', '#/dashboard');
    this.render();
  },

  /* ----- login ----- */
  showLogin() {
    $('#app').hidden = true;
    const ls = $('#login-screen');
    ls.hidden = false;
    const users = DB.all('users');
    $('#demo-accounts').innerHTML = users.map((u) => `<button type="button" class="demo-acct" data-email="${esc(u.email)}" data-pw="${esc(u.password)}"><span class="avatar sm">${initials(u.name)}</span><span><strong>${esc(u.role)}</strong><small>${esc(u.email)}</small></span></button>`).join('');
    $('#login-email').focus();
  },
  doLogin(e) {
    e.preventDefault();
    const email = $('#login-email').value; const pw = $('#login-password').value;
    const err = $('#login-error');
    if (!email.trim() || !pw) { err.textContent = 'Enter your email and password.'; return; }
    if (!EMAIL_RE.test(email.trim())) { err.textContent = 'Enter a valid email address.'; return; }
    const r = Auth.login(email, pw);
    if (r.error) { err.textContent = r.error; $('#login-password').select(); return; }
    err.textContent = '';
    $('#login-password').value = '';
    this.boot();
    showToast(`Welcome back, ${r.user.name.split(' ')[0]}`);
    DB.log('Signed in', r.user.email);
  },
  logout() {
    DB.log('Signed out', Auth.user()?.email || '');
    Auth.logout(); Modal.closeAll(); closeMenu();
    history.replaceState(null, '', '#/dashboard');
    this.showLogin();
  },

  /* ----- shell ----- */
  renderShell() {
    const u = Auth.user();
    $('#user-name').textContent = u.name;
    $('#user-role').textContent = u.role;
    $('#user-avatar').textContent = initials(u.name);
    const s = DB.data.settings;
    $('#company-select').innerHTML = s.companies.map((c, i) => `<option value="${i}"${i === s.activeCompany ? ' selected' : ''}>${esc(c)}</option>`).join('');
    this.renderNav();
    this.updateBadge();
  },
  navVisible(item) { return !item.module || Auth.canView(item.module); },
  renderNav() {
    const items = NAV.filter((it) => it.section || this.navVisible(it));
    // drop section headers with no visible items after them
    const clean = items.filter((it, i) => !it.section || (items[i + 1] && !items[i + 1].section));
    const openGroups = loadData('nav_open') || {};
    $('#nav').innerHTML = clean.map((it) => {
      if (it.section) return `<li class="nav-section" role="presentation"><span>${esc(it.section)}</span></li>`;
      if (it.children) {
        const open = openGroups[it.label] !== false;
        return `<li class="nav-group ${open ? 'open' : ''}" data-group="${esc(it.label)}"><button type="button" class="nav-link nav-parent" aria-expanded="${open}" data-tip="${esc(it.label)}" data-first="${it.children[0].route}">${icon(it.icon)}<span class="nav-text">${esc(it.label)}</span><span class="nav-caret">${icon('chevDown', 14)}</span></button><ul class="nav-sub">${it.children.map((c) => `<li><a class="nav-link nav-child" href="#/${c.route}" data-route="${c.route}">${esc(c.label)}</a></li>`).join('')}</ul></li>`;
      }
      return `<li><a class="nav-link" href="#/${it.route}" data-route="${it.route}" data-tip="${esc(it.label)}">${icon(it.icon)}<span class="nav-text">${esc(it.label)}</span>${it.badge ? '<span class="nav-badge" data-badge hidden></span>' : ''}</a></li>`;
    }).join('');
    // bottom navigation (mobile)
    const bn = [['dashboard', 'Home', 'dashboard', 'dashboard'], ['orders', 'Orders', 'cart', 'orders'], ['billing', 'Invoices', 'file', 'billing'], ['inventory', 'Stock', 'warehouse', 'inventory']].filter((b) => Auth.canView(b[3]));
    $('#bottom-nav').innerHTML = bn.map(([r, l, ic]) => `<a href="#/${r}" data-route="${r}">${icon(ic, 20)}<span>${l}</span></a>`).join('') + `<button type="button" data-action="drawer">${icon('menu', 20)}<span>More</span></button>`;
  },
  setActiveNav() {
    const { route, query } = this.params;
    const parent = ROUTES[route]?.parent;
    const matches = (href) => {
      const [r, qs = ''] = href.split('?');
      if (r !== route && r !== parent) return false;
      const def = NAV.flatMap((n) => [n, ...(n.children || [])]).find((n) => n.route === href);
      if (def?.match) return Object.entries(def.match).every(([k, vals]) => vals.includes(query[k] || ''));
      return Object.entries(Object.fromEntries(new URLSearchParams(qs))).every(([k, v]) => query[k] === v);
    };
    const setOn = (a, on) => { a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); };
    const links = $$('#nav a.nav-link');
    const hit = links.find((a) => matches(a.dataset.route));
    links.forEach((a) => setOn(a, a === hit));
    $$('#bottom-nav a').forEach((a) => setOn(a, matches(a.dataset.route)));
    $$('#nav .nav-group').forEach((g) => {
      const has = !!$('.nav-child.active', g);
      g.classList.toggle('has-active', has);
      if (has && !g.classList.contains('open')) { g.classList.add('open'); $('.nav-parent', g).setAttribute('aria-expanded', 'true'); }
    });
  },
  setBreadcrumb() {
    const { route } = this.params;
    const def = ROUTES[route] || { title: 'Not found' };
    const parts = [['dashboard', 'Home']];
    if (def.parent) { const p = ROUTES[def.parent]; if (p.section) parts.push([null, p.section]); parts.push([def.parent, p.title]); } else if (def.section && route !== 'dashboard') parts.push([null, def.section]);
    if (route !== 'dashboard') parts.push([null, this.crumb || def.title]);
    $('#breadcrumb').innerHTML = `<ol>${parts.map(([r, l], i) => `<li>${r && i < parts.length - 1 ? `<a href="#/${r}">${esc(l)}</a>` : `<span ${i === parts.length - 1 ? 'aria-current="page"' : ''}>${esc(l)}</span>`}</li>`).join('')}</ol>`;
    document.title = `${this.crumb || def.title} · NEXUS ERP`;
  },
  /** Detail pages call this to show the record name in the breadcrumb. */
  setCrumb(label) { this.crumb = label; this.setBreadcrumb(); },

  /* ----- rendering ----- */
  render(opts = {}) {
    if (!Auth.user()) { this.showLogin(); return; }
    closeMenu(); this.closeDropdowns();
    if (!opts.keepModals) Modal.closeAll();
    const prev = this.params;
    this.params = parseHash();
    const { route } = this.params;
    const def = ROUTES[route];
    // Fresh page container on every render so page-level event listeners never accumulate.
    const old = $('#page'); const el = old.cloneNode(false); old.replaceWith(el);
    this.crumb = null;
    document.body.classList.remove('drawer-open');
    const token = ++this.renderToken;
    if (!def || !Pages[route]) {
      el.innerHTML = `<div class="state-page">${emptyState('Page not found', `The page “${esc(route)}” does not exist.`, 'alert', '<a class="btn btn-primary" href="#/dashboard">Go to dashboard</a>')}</div>`;
      this.setBreadcrumb(); this.setActiveNav(); return;
    }
    this.setActiveNav(); this.setBreadcrumb();
    if (!Auth.canView(def.module)) { el.innerHTML = noPermission(MODULES.find((m) => m.key === def.module)?.label); return; }
    const sameView = opts.silent || (prev.route === route && prev.id === this.params.id);
    const draw = () => {
      if (token !== this.renderToken) return;
      try {
        Notify.sync(); this.updateBadge();
        el.innerHTML = '';
        Pages[route](el, this.params);
        this.setBreadcrumb();
        if (!sameView) { window.scrollTo(0, 0); $('#main').focus({ preventScroll: true }); }
      } catch (err) {
        console.error(err);
        el.innerHTML = errorState(err.message);
      }
    };
    if (sameView) draw();
    else { el.innerHTML = skeleton(); API.request(() => true, 140).then(draw); }
  },
  /** Re-renders the current page in place after data changes. */
  refresh() { const y = window.scrollY; this.render({ silent: true, keepModals: true }); window.scrollTo(0, y); },
  updateBadge() {
    const n = Notify.unread();
    $$('[data-badge]').forEach((b) => { b.textContent = n > 99 ? '99+' : n; b.hidden = !n; });
    const bell = $('#notif-btn');
    if (bell) bell.setAttribute('aria-label', `Notifications${n ? ` (${n} unread)` : ''}`);
  },

  /* ----- theme ----- */
  applyTheme(theme, save = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (save) saveData('theme', theme);
    const b = $('#theme-btn');
    if (b) { b.innerHTML = icon(theme === 'dark' ? 'sun' : 'moon'); b.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'); b.title = b.getAttribute('aria-label'); }
  },
  toggleTheme() { this.applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); },

  /* ----- header dropdowns ----- */
  closeDropdowns() { $$('.dropdown-panel').forEach((p) => { p.hidden = true; }); $$('[aria-controls][aria-expanded="true"]').forEach((b) => b.setAttribute('aria-expanded', 'false')); },
  toggleNotifications() {
    const p = $('#notif-panel'); const open = p.hidden;
    this.closeDropdowns();
    if (!open) return;
    Notify.sync();
    const list = DB.all('notifications').slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 7);
    p.innerHTML = `<div class="dp-head"><strong>Notifications</strong><button type="button" class="btn btn-ghost btn-sm" data-action="read-all">Mark all read</button></div>
      <ul class="notif-list">${list.length ? list.map((n) => `<li class="${n.read ? '' : 'unread'}"><a href="#/${esc(n.link || 'notifications')}" data-notif="${n.id}"><span class="notif-dot tone-${n.type}">${icon(n.type === 'danger' ? 'alert' : n.type === 'warning' ? 'alert' : n.type === 'success' ? 'check' : 'info', 14)}</span><span><strong>${esc(n.title)}</strong><span class="notif-text">${esc(n.text)}</span><small>${timeAgo(n.date)}</small></span></a></li>`).join('') : `<li>${emptyState('You’re all caught up', '', 'bell', '', true)}</li>`}</ul>
      <a class="dp-foot" href="#/notifications">View all notifications</a>`;
    p.hidden = false; $('#notif-btn').setAttribute('aria-expanded', 'true');
  },
  userMenu(anchor) {
    openMenu(anchor, [
      { label: 'My settings', icon: 'settings', onClick: () => navigateTo('settings'), perm: null },
      { label: 'Switch demo user', icon: 'users', onClick: () => this.switchUser() },
      { label: 'Keyboard shortcuts & help', icon: 'help', onClick: () => this.help() },
      { divider: true },
      { label: 'Sign out', icon: 'logout', onClick: () => this.logout(), danger: true },
    ]);
  },
  switchUser() {
    const cur = Auth.user();
    const m = Modal.open({ title: 'Switch demo user', size: 'sm', body: `<p class="muted">Sign in as another demo role to see permission-based menus and actions.</p><div class="demo-list">${DB.all('users').map((u) => `<button type="button" class="demo-acct ${u.id === cur.id ? 'current' : ''}" data-uid="${u.id}"><span class="avatar sm">${initials(u.name)}</span><span><strong>${esc(u.name)}</strong><small>${esc(u.role)}</small></span>${u.id === cur.id ? badge('Current', 'success') : ''}</button>`).join('')}</div>` });
    m.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-uid]'); if (!b) return;
      const u = DB.get('users', b.dataset.uid);
      if (u.status !== 'Active') { showToast('That user is inactive.', 'error'); return; }
      saveData('session', { userId: u.id, ts: Date.now() });
      m.close(); this.renderShell(); this.render();
      showToast(`Signed in as ${u.name} (${u.role})`, 'info');
    });
  },
  help() {
    Modal.open({ title: 'Help & keyboard shortcuts', size: 'md', body: `
      <h3 class="h-sm">Keyboard shortcuts</h3>
      <table class="kbd-table"><tr><td><kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd></td><td>Focus global search</td></tr><tr><td><kbd>↑</kbd> <kbd>↓</kbd> <kbd>Enter</kbd></td><td>Navigate search results</td></tr><tr><td><kbd>Esc</kbd></td><td>Close dialogs, menus and search</td></tr><tr><td><kbd>Alt</kbd>+<kbd>N</kbd></td><td>Open notifications</td></tr></table>
      <h3 class="h-sm">End-to-end workflows</h3>
      <ol class="help-list"><li><strong>Sales:</strong> Customers → New quotation → Send → Mark accepted → Convert to order → Confirm (reserves stock) → Ship (deducts stock) → Deliver → Create invoice → Record payment → journals post automatically.</li>
      <li><strong>Purchasing:</strong> Suppliers → New purchase order → Submit → Approve → Mark ordered → Receive goods (increases stock) → Record supplier invoice → Pay supplier.</li>
      <li><strong>Projects:</strong> New project for a customer → add tasks and assign employees → record project expenses → invoice project revenue → profit updates on the project.</li></ol>
      <h3 class="h-sm">About this demo</h3><p class="muted">NEXUS ERP runs entirely in your browser. Data is stored in localStorage; use <em>Settings → Data</em> to reset or back up the demo data.</p>` });
  },

  /* ----- global search ----- */
  searchIndex(q) {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const hit = (...vals) => vals.some((v) => String(v ?? '').toLowerCase().includes(s));
    const groups = [];
    const add = (label, module, rows, map) => { if (!Auth.canView(module)) return; const items = rows.slice(0, 5).map(map); if (items.length) groups.push({ label, items, total: rows.length }); };
    add('Customers', 'customers', DB.all('customers').filter((c) => hit(c.id, c.company, c.name, c.email, c.phone)), (c) => ({ title: c.company, sub: `${c.id} · ${c.name}`, route: 'customer/' + c.id, icon: 'users' }));
    add('Suppliers', 'suppliers', DB.all('suppliers').filter((c) => hit(c.id, c.company, c.contact, c.email)), (c) => ({ title: c.company, sub: `${c.id} · ${c.contact}`, route: 'supplier/' + c.id, icon: 'truck' }));
    add('Products', 'products', DB.all('products').filter((p) => hit(p.id, p.name, p.brand, p.category, p.barcode)), (p) => ({ title: p.name, sub: `${p.id} · ${p.category}`, route: 'product/' + p.id, icon: 'box' }));
    add('Orders', 'orders', DB.all('orders').filter((o) => hit(o.id, Lookup.customerName(o.customerId))), (o) => ({ title: o.id, sub: `${Lookup.customerName(o.customerId)} · ${formatCurrency(Calc.doc(o).total)}`, route: 'order/' + o.id, icon: 'cart' }));
    add('Quotations', 'sales', DB.all('quotations').filter((o) => hit(o.id, Lookup.customerName(o.customerId))), (o) => ({ title: o.id, sub: `${Lookup.customerName(o.customerId)} · ${Sales.quoteStatus(o)}`, route: 'quotation/' + o.id, icon: 'file' }));
    add('Invoices', 'billing', DB.all('invoices').filter((i) => hit(i.id, Lookup.customerName(i.customerId), i.orderId)), (i) => ({ title: i.id, sub: `${Lookup.customerName(i.customerId)} · ${Docs.status(i)}`, route: 'invoice/' + i.id, icon: 'file' }));
    add('Purchase Orders', 'purchasing', DB.all('purchaseOrders').filter((p) => hit(p.id, Lookup.supplierName(p.supplierId))), (p) => ({ title: p.id, sub: `${Lookup.supplierName(p.supplierId)} · ${p.status}`, route: 'po/' + p.id, icon: 'clipboard' }));
    add('Projects', 'projects', DB.all('projects').filter((p) => hit(p.id, p.name, Lookup.customerName(p.customerId))), (p) => ({ title: p.name, sub: `${p.id} · ${Lookup.customerName(p.customerId)}`, route: 'project/' + p.id, icon: 'briefcase' }));
    add('Employees', 'employees', DB.all('employees').filter((e) => hit(e.id, e.name, e.email, e.position, e.department)), (e) => ({ title: e.name, sub: `${e.id} · ${e.position}`, route: 'employees?emp=' + e.id, icon: 'user' }));
    const txns = [...DB.all('payments').filter((p) => hit(p.id, p.reference, p.invoiceId, p.billId, p.partyType === 'supplier' ? Lookup.supplierName(p.partyId) : Lookup.customerName(p.partyId))).map((p) => ({ title: p.id, sub: `${p.type} · ${formatCurrency(p.amount)}`, route: 'payments?pay=' + p.id, icon: 'card', module: 'payments' })),
      ...DB.all('journals').filter((j) => hit(j.id, j.ref, j.description)).map((j) => ({ title: j.id, sub: j.description, route: 'journals?je=' + j.id, icon: 'book', module: 'journals' }))].filter((t) => Auth.canView(t.module));
    if (txns.length) groups.push({ label: 'Transactions', items: txns.slice(0, 5), total: txns.length });
    return groups;
  },
  renderSearch(q) {
    const panel = $('#search-panel');
    if (q.trim().length < 2) { panel.hidden = true; $('#global-search').setAttribute('aria-expanded', 'false'); return; }
    const groups = this.searchIndex(q);
    let i = 0;
    panel.innerHTML = groups.length ? groups.map((g) => `<div class="sr-group"><div class="sr-label">${esc(g.label)}<span>${g.total}</span></div>${g.items.map((it) => `<a class="sr-item" role="option" id="sr-${i}" data-idx="${i++}" href="#/${esc(it.route)}">${icon(it.icon, 16)}<span><strong>${esc(it.title)}</strong><small>${esc(it.sub)}</small></span></a>`).join('')}</div>`).join('') + `<a class="dp-foot" href="#/search?q=${encodeURIComponent(q)}">See all results for “${esc(q)}”</a>`
      : `<div class="sr-empty">${emptyState(`No results for “${q}”`, 'Try a customer name, order number, SKU or invoice number.', 'search', '', true)}</div>`;
    panel.hidden = false; $('#global-search').setAttribute('aria-expanded', 'true');
    this.searchSel = -1;
  },

  /* ----- event wiring ----- */
  bindShell() {
    $('#login-form').addEventListener('submit', (e) => this.doLogin(e));
    $('#demo-accounts').addEventListener('click', (e) => { const b = e.target.closest('[data-email]'); if (!b) return; $('#login-email').value = b.dataset.email; $('#login-password').value = b.dataset.pw; $('#login-error').textContent = ''; $('#login-form').requestSubmit ? $('#login-form').requestSubmit() : this.doLogin(new Event('submit')); });
    $('#theme-btn').addEventListener('click', () => this.toggleTheme());
    $('#login-theme').addEventListener('click', () => this.toggleTheme());
    $('#help-btn').addEventListener('click', () => this.help());
    $('#notif-btn').addEventListener('click', (e) => { e.stopPropagation(); this.toggleNotifications(); });
    $('#user-btn').addEventListener('click', (e) => this.userMenu(e.currentTarget));
    $('#company-select').addEventListener('change', (e) => {
      const s = DB.data.settings; s.activeCompany = +e.target.value; s.company.name = s.companies[s.activeCompany]; DB.save('settings');
      showToast(`Switched to ${s.company.name}`, 'info'); DB.log(`Switched company to ${s.company.name}`); this.refresh();
    });
    $('#menu-btn').addEventListener('click', () => {
      if (window.innerWidth <= 1024) document.body.classList.toggle('drawer-open');
      else { document.body.classList.toggle('sidebar-collapsed'); saveData('sidebar_collapsed', document.body.classList.contains('sidebar-collapsed')); }
      $('#menu-btn').setAttribute('aria-expanded', String(document.body.classList.contains('drawer-open') || !document.body.classList.contains('sidebar-collapsed')));
    });
    $('#collapse-btn').addEventListener('click', () => { document.body.classList.toggle('sidebar-collapsed'); saveData('sidebar_collapsed', document.body.classList.contains('sidebar-collapsed')); });
    $('#drawer-backdrop').addEventListener('click', () => document.body.classList.remove('drawer-open'));
    $('#nav').addEventListener('click', (e) => {
      const p = e.target.closest('.nav-parent');
      if (!p) return;
      if (document.body.classList.contains('sidebar-collapsed') && window.innerWidth > 1024) { navigateTo(p.dataset.first); return; }
      const g = p.closest('.nav-group'); g.classList.toggle('open');
      p.setAttribute('aria-expanded', String(g.classList.contains('open')));
      const st = loadData('nav_open') || {}; st[g.dataset.group] = g.classList.contains('open'); saveData('nav_open', st);
    });
    // global search
    const input = $('#global-search');
    input.addEventListener('input', debounce(() => this.renderSearch(input.value), 120));
    input.addEventListener('focus', () => { if (input.value.trim().length >= 2) this.renderSearch(input.value); });
    input.addEventListener('keydown', (e) => {
      const items = $$('#search-panel .sr-item');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!items.length) return;
        this.searchSel = (this.searchSel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((a, i) => a.classList.toggle('focused', i === this.searchSel));
        input.setAttribute('aria-activedescendant', items[this.searchSel].id);
        items[this.searchSel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const it = items[this.searchSel];
        const q = input.value.trim();
        if (it) navigateTo(it.getAttribute('href').slice(2)); else if (q) navigateTo('search?q=' + encodeURIComponent(q));
        $('#search-panel').hidden = true; input.blur();
      } else if (e.key === 'Escape') { $('#search-panel').hidden = true; input.blur(); }
    });
    $('#search-panel').addEventListener('click', (e) => { if (e.target.closest('a')) { $('#search-panel').hidden = true; } });
    $('#search-toggle').addEventListener('click', () => { document.body.classList.toggle('search-open'); if (document.body.classList.contains('search-open')) input.focus(); });
    // notifications panel actions
    $('#notif-panel').addEventListener('click', (e) => {
      if (e.target.closest('[data-action="read-all"]')) { DB.all('notifications').forEach((n) => { n.read = true; }); DB.save('notifications'); this.updateBadge(); this.closeDropdowns(); showToast('All notifications marked as read'); if (this.params.route === 'notifications') this.refresh(); return; }
      const a = e.target.closest('[data-notif]');
      if (a) { const n = DB.all('notifications').find((x) => x.id === a.dataset.notif); if (n) { n.read = true; DB.save('notifications'); this.updateBadge(); } }
      if (e.target.closest('a')) this.closeDropdowns();
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrap')) $('#search-panel').hidden = true;
      if (!e.target.closest('#notif-panel') && !e.target.closest('#notif-btn')) { $('#notif-panel').hidden = true; $('#notif-btn').setAttribute('aria-expanded', 'false'); }
      const nav = e.target.closest('[data-nav]');
      if (nav && !e.target.closest('a[href], button:not([data-nav]), input, select')) { e.preventDefault(); navigateTo(nav.dataset.nav); }
      const act = e.target.closest('[data-action]');
      if (act?.dataset.action === 'drawer') document.body.classList.toggle('drawer-open');
      if (act?.dataset.action === 'retry') this.render();
      if (act?.dataset.action === 'print') window.print();
    });
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if (e.key === 'Enter' && e.target.matches?.('[data-nav][tabindex]')) { e.preventDefault(); navigateTo(e.target.dataset.nav); }
      if (!Auth.user() || Modal.top()) return;
      if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); document.body.classList.add('search-open'); input.focus(); input.select(); }
      if (e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); this.toggleNotifications(); }
      if (e.key === 'Escape') { this.closeDropdowns(); document.body.classList.remove('drawer-open', 'search-open'); }
    });
    window.addEventListener('resize', debounce(() => { if (window.innerWidth > 1024) document.body.classList.remove('drawer-open'); }, 150));
    window.addEventListener('storage', (e) => { if (e.key && e.key.startsWith(STORAGE_PREFIX) && e.key !== STORAGE_PREFIX + 'theme') { DB.init(); if (Auth.user()) this.refresh(); } });
    window.addEventListener('error', (e) => console.error('Unhandled error:', e.message));
  },
};

/* ---------- Global search results page ---------- */
Pages.search = (el, { query }) => {
  const q = query.q || '';
  const groups = App.searchIndex(q);
  App.setCrumb(`Search: “${q}”`);
  el.innerHTML = pageHeader({ title: `Search results`, subtitle: q ? `${sum(groups, (g) => g.total)} matches for “${esc(q)}”` : 'Type at least two characters in the search bar.' }) +
    (groups.length ? `<div class="grid-2">${groups.map((g) => card(`${esc(g.label)} <span class="count-pill">${g.total}</span>`, `<ul class="result-list">${g.items.map((it) => `<li><a href="#/${esc(it.route)}">${icon(it.icon, 16)}<span><strong>${esc(it.title)}</strong><small>${esc(it.sub)}</small></span></a></li>`).join('')}</ul>${g.total > g.items.length ? `<p class="muted small">Showing ${g.items.length} of ${g.total}. Refine your search to narrow results.</p>` : ''}`)).join('')}</div>`
      : card('', emptyState(q ? `No results for “${q}”` : 'Start searching', 'Search across customers, suppliers, products, orders, invoices, projects, employees and transactions.', 'search')));
};

document.addEventListener('DOMContentLoaded', () => App.init());
