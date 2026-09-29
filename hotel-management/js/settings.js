/* Settings: hotel, branches, room types, rates, tax, payments, users, roles, notifications, regional, system */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;
  const SECTIONS = [['hotel', 'Hotel information', 'building'], ['branches', 'Branches', 'rooms'], ['roomtypes', 'Room types', 'bed'], ['rates', 'Rate plans', 'tag'], ['tax', 'Taxes & charges', 'percent'], ['payments', 'Payment methods', 'payments'], ['users', 'Users', 'staff'], ['roles', 'Roles & permissions', 'lock'], ['notif', 'Notifications', 'bell'], ['regional', 'Currency, language & time', 'globe'], ['system', 'System', 'settings']];
  let sec = 'hotel';

  const MODULES = ['Dashboard', 'Front Desk', 'Reservations', 'Calendar', 'Rooms', 'Guests', 'Housekeeping', 'Maintenance', 'Services', 'Restaurant', 'Billing', 'Payments', 'Finance', 'Customers', 'Staff', 'Promotions', 'Inventory', 'Suppliers', 'Reports', 'Settings'];
  const ROLES = ['Administrator', 'General Manager', 'Front Office Manager', 'Receptionist', 'Housekeeper'];
  const defaultPerms = () => {
    const p = {};
    const recep = ['Dashboard', 'Front Desk', 'Reservations', 'Calendar', 'Rooms', 'Guests', 'Services', 'Restaurant', 'Billing', 'Payments', 'Customers', 'Promotions'];
    const hk = ['Dashboard', 'Housekeeping', 'Maintenance', 'Rooms', 'Inventory'];
    ROLES.forEach((r) => { p[r] = {}; MODULES.forEach((m) => { const view = r === 'Administrator' || r === 'General Manager' || (r === 'Front Office Manager' && m !== 'Settings') || (r === 'Receptionist' && recep.includes(m)) || (r === 'Housekeeper' && hk.includes(m)); p[r][m] = { view, edit: view && (r !== 'Receptionist' || !['Promotions', 'Customers', 'Rooms'].includes(m)) && (r !== 'Housekeeper' || m !== 'Rooms'), del: view && ['Administrator', 'General Manager'].includes(r) }; }); });
    return p;
  };

  function render(el, params) {
    if (params[0]) sec = params[0];
    el.innerHTML = `${UI.pageHead({ title: 'Settings', sub: 'Configuration for Sunrise Hospitality properties', crumbs: [{ label: 'Settings' }] })}
      <div class="settings-layout"><nav class="settings-nav" aria-label="Settings sections">${SECTIONS.map((s) => `<button type="button" class="${s[0] === sec ? 'active' : ''}" data-sec="${s[0]}">${icon(s[2])}${s[1]}</button>`).join('')}</nav><div id="set-body"></div></div>`;
    el.querySelector('.settings-nav').onclick = (e) => { const b = e.target.closest('[data-sec]'); if (!b) return; sec = b.dataset.sec; history.replaceState(null, '', `#/settings/${sec}`); HMS.app.params = [sec]; U.qsa('[data-sec]', el).forEach((x) => x.classList.toggle('active', x === b)); draw(); };
    draw();
  }

  const card = (title, sub, inner, foot = '') => `<div class="card"><div class="card-head"><div><h2>${title}</h2>${sub ? `<p class="small muted" style="margin-top:2px">${sub}</p>` : ''}</div></div><div class="card-body">${inner}</div>${foot ? `<div class="card-foot">${foot}</div>` : ''}</div>`;
  const saveBtn = (label = 'Save changes') => `<button class="btn btn-primary" data-save>${label}</button>`;

  function draw() {
    const body = document.getElementById('set-body');
    const s = D().settings;
    const d = D();
    const bindSave = (fn) => { const b = body.querySelector('[data-save]'); if (b) b.onclick = () => { if (!UI.validate(body)) return; fn(UI.readForm(body)); HMS.store.commit(); UI.toast('Settings saved'); }; };

    if (sec === 'hotel') {
      body.innerHTML = card('Hotel information', 'Shown on invoices, registration cards and emails.', UI.form([
        { name: 'hotelName', label: 'Hotel name', required: true }, { name: 'legalName', label: 'Legal company name', required: true },
        { name: 'taxId', label: 'Tax code (MST)', required: true, pattern: '[0-9\\-]{10,14}' }, { name: 'stars', label: 'Star rating', type: 'select', options: ['3', '4', '5'] },
        { name: 'address', label: 'Address', span: 2, required: true }, { name: 'phone', label: 'Phone', required: true }, { name: 'hotline', label: 'Hotline' },
        { name: 'email', label: 'Reservations email', type: 'email' }, { name: 'website', label: 'Website' },
        { name: 'checkInTime', label: 'Standard check-in', type: 'time' }, { name: 'checkOutTime', label: 'Standard check-out', type: 'time' }
      ], s), saveBtn());
      bindSave((v) => { v.stars = Number(v.stars); Object.assign(s, v); });
    }
    if (sec === 'branches') {
      body.innerHTML = card('Branches', 'Properties managed in this system. Switch branch from the top bar.', `<div class="table-wrap"><table class="table"><thead><tr><th>Branch</th><th>City</th><th class="right">Rooms</th><th>General manager</th><th>Phone</th><th>Status</th><th></th></tr></thead><tbody>${d.branches.map((b) => `<tr><td class="cell-main">${U.esc(b.name)}<div class="cell-sub">${U.esc(b.address)}</div></td><td>${U.esc(b.city)}</td><td class="right num">${b.rooms}</td><td>${U.esc(b.manager)}</td><td>${U.esc(b.phone)}</td><td>${U.badge(b.status)}</td><td class="actions"><button class="icon-btn sm" data-br="${b.id}" aria-label="Edit">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>`, `<button class="btn" data-br="">${icon('plus')}Add branch</button>`);
      body.onclick = (e) => { const b = e.target.closest('[data-br]'); if (b) branchForm(b.dataset.br); };
    }
    if (sec === 'roomtypes') {
      body.innerHTML = card('Room types', 'Base rack rate per night in VND. Changing a rate does not affect existing bookings.', `<div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Room type</th><th>Bed</th><th class="right">Size</th><th class="right">Sleeps</th><th class="right">Rooms</th><th class="right">Base rate</th><th></th></tr></thead><tbody>${d.roomTypes.map((t) => `<tr><td><span class="kbd">${t.id}</span></td><td class="cell-main">${U.esc(t.name)}<div class="cell-sub">${t.amenities.slice(0, 4).map(U.esc).join(', ')}…</div></td><td>${t.bed}</td><td class="right">${t.size} m²</td><td class="right">${t.capacity}</td><td class="right">${d.rooms.filter((r) => r.typeId === t.id).length}</td><td class="right money">${U.money(t.rate)}</td><td class="actions"><button class="icon-btn sm" data-rt="${t.id}" aria-label="Edit">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>`);
      body.onclick = (e) => { const b = e.target.closest('[data-rt]'); if (b) roomTypeForm(b.dataset.rt); };
    }
    if (sec === 'rates') {
      body.innerHTML = card('Rate plans', 'Adjustments applied to the room’s rack rate.', `<div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Rate plan</th><th>Adjustment</th><th>Policy</th><th>Status</th><th></th></tr></thead><tbody>${d.ratePlans.map((p) => `<tr><td><span class="kbd">${p.id}</span></td><td class="cell-main">${U.esc(p.name)}</td><td>${p.adjust === 'add' ? `+${U.money(p.value)}/night` : `${p.value > 0 ? '+' : ''}${p.value}%`}</td><td class="small">${U.esc(p.desc)}</td><td><label class="switch"><input type="checkbox" data-rp="${p.id}" ${p.active ? 'checked' : ''} ${p.id === 'BAR' ? 'disabled' : ''} aria-label="Active"><span class="track"></span></label></td><td class="actions"><button class="icon-btn sm" data-rpe="${p.id}" aria-label="Edit">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>`);
      body.onchange = (e) => { const c = e.target.closest('[data-rp]'); if (c) { d.ratePlans.find((p) => p.id === c.dataset.rp).active = c.checked; HMS.store.commit(); UI.toast(`Rate plan ${c.dataset.rp} ${c.checked ? 'activated' : 'deactivated'}`); } };
      body.onclick = (e) => { const b = e.target.closest('[data-rpe]'); if (b) ratePlanForm(b.dataset.rpe); };
    }
    if (sec === 'tax') {
      body.innerHTML = card('Taxes & charges', 'Vietnam standard VAT is 10% (8% during temporary reductions).', UI.form([
        { name: 'vatRate', label: 'VAT rate %', type: 'select', options: ['0', '5', '8', '10'] },
        { name: 'serviceCharge', label: 'Service charge %', type: 'select', options: ['0', '5'] },
        { name: 'invoiceSymbol', label: 'E-invoice symbol', required: true, pattern: '[A-Z0-9]{6}', title: '6 characters, e.g. C26TSD' },
        { name: 'taxId', label: 'Seller tax code', readonly: true }
      ], s) + `<div class="alert info mt-2">${icon('info')}<p>VAT is calculated on the folio subtotal (room + services) before discounts, as required by the spec: Total = Subtotal + Tax − Discount.</p></div>`, saveBtn());
      bindSave((v) => { s.vatRate = Number(v.vatRate); s.serviceCharge = Number(v.serviceCharge); s.invoiceSymbol = v.invoiceSymbol; });
    }
    if (sec === 'payments') {
      body.innerHTML = card('Payment methods', 'Enabled methods appear at check-in, check-out and in the POS.', `<div class="stack">${Object.keys(s.paymentMethods).map((m) => `<label class="switch"><input type="checkbox" data-pm="${U.esc(m)}" ${s.paymentMethods[m] ? 'checked' : ''} ${m === 'Cash' ? 'disabled' : ''}><span class="track"></span><span>${U.esc(m)}${m === 'QR Payment' ? ' <span class="small muted">· VietQR / VNPAY</span>' : m === 'E-wallet' ? ' <span class="small muted">· MoMo, ZaloPay</span>' : ''}</span></label>`).join('')}</div>
        <h3 class="form-section mt-2">Bank account for transfers & VietQR</h3>${UI.form([{ name: 'bankName', label: 'Bank', required: true }, { name: 'bankAccount', label: 'Account number', required: true }, { name: 'bankHolder', label: 'Account holder', span: 2, required: true }], s)}`, saveBtn());
      bindSave((v) => { U.qsa('[data-pm]', body).forEach((c) => { s.paymentMethods[c.dataset.pm] = c.checked; }); s.bankName = v.bankName; s.bankAccount = v.bankAccount; s.bankHolder = v.bankHolder; });
    }
    if (sec === 'users') {
      body.innerHTML = card('Users', 'Accounts that can sign in to the system.', `<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Username</th><th>Role</th><th>Email</th><th></th></tr></thead><tbody>${d.users.map((u) => `<tr><td><div class="cell-person"><span class="avatar sm">${U.initials(u.name)}</span><span class="cell-main">${U.esc(u.name)}</span></div></td><td><span class="kbd">${U.esc(u.username)}</span></td><td>${U.esc(u.role)}</td><td>${U.esc(u.email)}</td><td class="actions"><button class="icon-btn sm" data-u="${u.username}" aria-label="Edit">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>`, `<button class="btn" data-u="">${icon('plus')}Add user</button>`);
      body.onclick = (e) => { const b = e.target.closest('[data-u]'); if (b) userForm(b.dataset.u); };
    }
    if (sec === 'roles') {
      if (!d.permissions) d.permissions = defaultPerms();
      const role = body.dataset.role || 'Receptionist';
      const P = d.permissions[role];
      body.innerHTML = card('Roles & permissions', 'What each role can see and change. Administrator always has full access.', `<div class="row mb-2"><label class="small muted" for="role-sel">Role</label><select id="role-sel" class="select-sm">${ROLES.map((r) => `<option ${r === role ? 'selected' : ''}>${r}</option>`).join('')}</select><span class="small muted">${d.users.filter((u) => u.role === role).length} user(s)</span></div>
        <div class="table-wrap"><table class="table compact perm-table"><thead><tr><th>Module</th><th class="center">View</th><th class="center">Create / edit</th><th class="center">Delete</th></tr></thead><tbody>${MODULES.map((m) => `<tr><td>${m}</td>${['view', 'edit', 'del'].map((k) => `<td class="center"><input type="checkbox" class="check" data-perm="${m}|${k}" ${P[m][k] ? 'checked' : ''} ${role === 'Administrator' ? 'disabled' : ''} aria-label="${m} ${k}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="tiny muted mt-1">In this demo, sidebar access follows the built-in role map; the matrix is stored for reference.</p>`, role === 'Administrator' ? '' : saveBtn('Save permissions'));
      body.querySelector('#role-sel').onchange = (e) => { body.dataset.role = e.target.value; draw(); };
      const sb = body.querySelector('[data-save]');
      if (sb) sb.onclick = () => { U.qsa('[data-perm]', body).forEach((c) => { const [m, k] = c.dataset.perm.split('|'); P[m][k] = c.checked; if (k === 'view' && !c.checked) { P[m].edit = false; P[m].del = false; } }); HMS.store.commit(); UI.toast(`Permissions saved for ${role}`); draw(); };
    }
    if (sec === 'notif') {
      const N = [['arrivals', 'Arrivals & departures due today'], ['reservations', 'New reservations and changes'], ['housekeeping', 'Rooms that need cleaning'], ['maintenance', 'Maintenance and out-of-order rooms'], ['inventory', 'Low inventory'], ['payments', 'Payments and overdue invoices'], ['email', 'Also send by email (simulated)']];
      body.innerHTML = card('Notifications', 'Choose which alerts appear in the bell menu.', `<div class="stack">${N.map((n) => `<label class="switch"><input type="checkbox" data-n="${n[0]}" ${s.notif[n[0]] ? 'checked' : ''}><span class="track"></span><span>${n[1]}</span></label>`).join('')}</div>
        <h3 class="form-section mt-2">Operations rules</h3><div class="stack">
          <label class="switch"><input type="checkbox" data-r="requireInspection" ${s.requireInspection ? 'checked' : ''}><span class="track"></span><span>Require supervisor inspection before a room is released for sale</span></label>
          <label class="switch"><input type="checkbox" data-r="blockDirtyCheckin" ${s.blockDirtyCheckin ? 'checked' : ''}><span class="track"></span><span>Block check-in to rooms that are not clean</span></label></div>`, saveBtn());
      body.querySelector('[data-save]').onclick = () => { U.qsa('[data-n]', body).forEach((c) => { s.notif[c.dataset.n] = c.checked; }); U.qsa('[data-r]', body).forEach((c) => { s[c.dataset.r] = c.checked; }); HMS.store.commit(); UI.toast('Notification settings saved'); };
    }
    if (sec === 'regional') {
      body.innerHTML = card('Currency, language & time', '', UI.form([
        { name: 'currency', label: 'Currency', type: 'select', options: [{ value: 'VND', label: 'VND — Vietnamese dong (₫)' }], help: 'Amounts are stored and shown in VND without decimals.' },
        { name: 'language', label: 'Interface language', type: 'select', options: ['English', 'Tiếng Việt (coming soon)'] },
        { name: 'timezone', label: 'Time zone', type: 'select', options: [{ value: 'Asia/Ho_Chi_Minh', label: '(GMT+7) Ho Chi Minh City' }] },
        { name: 'dateFormat', label: 'Date format', type: 'select', options: ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'] },
        { name: 'timeFormat', label: 'Time format', type: 'select', options: [{ value: '24h', label: '24-hour (14:00)' }] }
      ], s) + `<p class="small muted mt-2">Preview: ${U.fmtDate(U.today())} · ${U.money(1250000)}</p>`, saveBtn());
      bindSave((v) => { if (v.language !== 'English') { UI.toast('Vietnamese is coming soon. Keeping English.', 'info'); v.language = 'English'; } Object.assign(s, v); setTimeout(draw, 10); });
    }
    if (sec === 'system') {
      const size = (() => { try { return (localStorage.getItem('sunrise-hms-data') || '').length; } catch (e) { return 0; } })();
      body.innerHTML = card('System', 'Data is stored in this browser (localStorage). Nothing is sent to a server.', `<dl class="dl"><dt>Version</dt><dd>Sunrise HMS 1.0 · data schema v${D().version}</dd><dt>Storage</dt><dd>${HMS.store.storageOk ? `${(size / 1024).toFixed(0)} KB used in localStorage` : 'Unavailable — changes are kept in memory only'}</dd><dt>Records</dt><dd>${d.rooms.length} rooms · ${d.guests.length} guests · ${d.reservations.length} reservations · ${d.payments.length} payments</dd><dt>Demo dates</dt><dd>Anchored to ${U.fmtDate(d.anchorDate)}; data shifts forward automatically each day.</dd></dl>
        <div class="row mt-2"><button class="btn" data-sys="export">${icon('download')}Export all data (JSON)</button><button class="btn btn-danger" data-sys="reset">${icon('refresh')}Reset demo data</button></div>`);
      body.onclick = async (e) => {
        const b = e.target.closest('[data-sys]');
        if (!b) return;
        if (b.dataset.sys === 'export') { if (U.download(`sunrise-hms-backup-${U.today()}.json`, JSON.stringify(D(), null, 1), 'application/json')) UI.toast('Backup downloaded'); }
        if (b.dataset.sys === 'reset' && await UI.confirm({ title: 'Reset all demo data?', message: 'All reservations, guests, payments and settings you changed will be replaced with fresh sample data.', confirmLabel: 'Reset data', danger: true })) { HMS.store.reset(); UI.toast('Demo data reset'); HMS.app.go('#/dashboard'); }
      };
    }
  }

  function branchForm(id) {
    const b = id ? D().branches.find((x) => x.id === id) : null;
    UI.modal({ title: b ? `Edit ${b.name}` : 'Add branch', size: 'md', body: UI.form([{ name: 'name', label: 'Name', required: true, span: 2 }, { name: 'city', label: 'City', required: true }, { name: 'rooms', label: 'Rooms', type: 'number', min: 1, required: true }, { name: 'address', label: 'Address', span: 2 }, { name: 'manager', label: 'General manager' }, { name: 'phone', label: 'Phone' }, { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Opening soon', 'Inactive'] }], b || { status: 'Opening soon' }),
      actions: [{ label: 'Cancel' }, { label: 'Save branch', kind: 'primary', onClick: (ctx) => { if (!UI.validate(ctx.body)) return false; const v = UI.readForm(ctx.body); if (b) Object.assign(b, v); else D().branches.push(Object.assign({ id: 'BR' + String(D().branches.length + 1).padStart(2, '0') }, v)); HMS.store.commit(); UI.toast('Branch saved'); draw(); } }] });
  }
  function roomTypeForm(id) {
    const t = H.type(id);
    UI.modal({ title: `Edit ${t.name}`, size: 'md', body: UI.form([{ name: 'name', label: 'Name', required: true, span: 2 }, { name: 'rate', label: 'Base rate (VND)', type: 'number', min: 100000, step: 10000, required: true }, { name: 'size', label: 'Size (m²)', type: 'number', min: 8 }, { name: 'bed', label: 'Bed', type: 'select', options: ['Single', 'Double', 'Queen', 'King', 'Twin', '2 Queen'] }, { name: 'capacity', label: 'Sleeps', type: 'number', min: 1, max: 8 }, { name: 'updateRooms', label: 'Also update rack rate of all rooms of this type', type: 'checkbox', span: 2 }], t),
      actions: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: (ctx) => { if (!UI.validate(ctx.body)) return false; const v = UI.readForm(ctx.body); const up = v.updateRooms; delete v.updateRooms; const diff = v.rate - t.rate; Object.assign(t, v); if (up) D().rooms.filter((r) => r.typeId === t.id).forEach((r) => { r.rate += diff; }); HMS.store.commit(); UI.toast(`${t.name} saved`); draw(); } }] });
  }
  function ratePlanForm(id) {
    const p = H.plan(id);
    UI.modal({ title: `Edit ${p.name}`, size: 'md', body: UI.form([{ name: 'name', label: 'Name', required: true, span: 2 }, { name: 'adjust', label: 'Adjustment type', type: 'select', options: [{ value: 'pct', label: 'Percentage of rack rate' }, { value: 'add', label: 'Fixed amount per night' }] }, { name: 'value', label: 'Value (% or VND)', type: 'number', required: true }, { name: 'desc', label: 'Policy', type: 'textarea', span: 2 }], p),
      actions: [{ label: 'Cancel' }, { label: 'Save', kind: 'primary', onClick: (ctx) => { if (!UI.validate(ctx.body)) return false; Object.assign(p, UI.readForm(ctx.body)); HMS.store.commit(); UI.toast('Rate plan saved'); draw(); } }] });
  }
  function userForm(username) {
    const u = username ? D().users.find((x) => x.username === username) : null;
    UI.modal({ title: u ? `Edit ${u.name}` : 'Add user', size: 'md', body: UI.form([{ name: 'name', label: 'Full name', required: true, span: 2 }, { name: 'username', label: 'Username', required: true, pattern: '[a-z0-9._]{3,20}', title: '3–20 lowercase letters, digits, dot or underscore', readonly: !!u }, { name: 'password', label: 'Password', type: 'password', required: !u, placeholder: u ? 'Leave blank to keep' : '', pattern: '.{6,}', title: 'At least 6 characters' }, { name: 'role', label: 'Role', type: 'select', options: ROLES }, { name: 'email', label: 'Email', type: 'email', required: true }], u ? Object.assign({}, u, { password: '' }) : { role: 'Receptionist' }),
      actions: [{ label: 'Cancel' }, { label: 'Save user', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        if (!u && D().users.some((x) => x.username === v.username)) { UI.toast('Username already exists.', 'error'); return false; }
        if (u && u.username === HMS.app.user.username && v.role !== u.role) { UI.toast('You cannot change your own role.', 'error'); return false; }
        if (u) { if (!v.password) delete v.password; Object.assign(u, v); } else D().users.push(v);
        HMS.store.commit(); UI.toast('User saved'); draw();
      } }] });
  }

  HMS.modules.settings = { title: 'Settings', render };
})();
