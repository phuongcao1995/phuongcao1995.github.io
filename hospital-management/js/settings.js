/* Settings: hospital, branches, insurance defaults, users, roles, notifications, regional, system */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;
  const SECTIONS = [['hospital', 'Hospital information', 'building'], ['branches', 'Branches', 'building'], ['insurance', 'Insurance defaults', 'insurance'], ['users', 'Users', 'staff'], ['roles', 'Roles & permissions', 'lock'], ['notif', 'Notifications', 'bell'], ['regional', 'Regional & language', 'globe'], ['system', 'System', 'settings']];
  let sec = 'hospital';

  const MODULES = ['Dashboard', 'Patients', 'Appointments', 'Visits', 'Medical Records', 'Doctors', 'Departments', 'Staff', 'Admissions', 'Beds & Rooms', 'Emergency', 'Laboratory', 'Medical Imaging', 'Pharmacy', 'Prescriptions', 'Billing', 'Insurance', 'Reports', 'Settings'];
  const ROLES = ['Administrator', 'Doctor', 'Nurse', 'Pharmacist', 'Receptionist', 'Accountant'];
  const defaultPerms = () => {
    const p = {};
    const doc = ['Dashboard', 'Patients', 'Appointments', 'Visits', 'Medical Records', 'Admissions', 'Emergency', 'Laboratory', 'Medical Imaging', 'Prescriptions'];
    const nur = ['Dashboard', 'Patients', 'Visits', 'Admissions', 'Beds & Rooms', 'Emergency'];
    const phar = ['Dashboard', 'Pharmacy', 'Prescriptions'];
    const rec = ['Dashboard', 'Patients', 'Appointments', 'Visits', 'Billing'];
    const acc = ['Dashboard', 'Billing', 'Insurance', 'Reports'];
    ROLES.forEach((r) => { p[r] = {}; MODULES.forEach((m) => { const view = r === 'Administrator' || (r === 'Doctor' && doc.includes(m)) || (r === 'Nurse' && nur.includes(m)) || (r === 'Pharmacist' && phar.includes(m)) || (r === 'Receptionist' && rec.includes(m)) || (r === 'Accountant' && acc.includes(m)); p[r][m] = { view, edit: view && m !== 'Settings', del: view && r === 'Administrator' }; }); });
    return p;
  };

  function render(el, params) {
    if (params[0]) sec = params[0];
    el.innerHTML = `${UI.pageHead({ title: 'Settings', sub: 'Configuration for MediPlus HIS', crumbs: [{ label: 'Settings' }] })}
      <div class="settings-layout"><nav class="settings-nav" aria-label="Settings sections">${SECTIONS.map((s) => `<button type="button" class="${s[0] === sec ? 'active' : ''}" data-sec="${s[0]}">${icon(s[2])}${s[1]}</button>`).join('')}</nav><div id="set-body"></div></div>`;
    el.querySelector('.settings-nav').onclick = (e) => { const b = e.target.closest('[data-sec]'); if (!b) return; sec = b.dataset.sec; history.replaceState(null, '', `#/settings/${sec}`); HIS.app.params = [sec]; U.qsa('[data-sec]', el).forEach((x) => x.classList.toggle('active', x === b)); draw(); };
    draw();
  }

  const card = (title, sub, inner, foot = '') => `<div class="card"><div class="card-head"><div><h2>${title}</h2>${sub ? `<p class="small muted" style="margin-top:2px">${sub}</p>` : ''}</div></div><div class="card-body">${inner}</div>${foot ? `<div class="card-foot">${foot}</div>` : ''}</div>`;
  const saveBtn = (label = 'Save changes') => `<button class="btn btn-primary" data-save>${label}</button>`;

  function draw() {
    const body = document.getElementById('set-body');
    const s = D().settings;
    const d = D();
    const bindSave = (fn) => { const b = body.querySelector('[data-save]'); if (b) b.onclick = () => { if (!UI.validate(body)) return; fn(UI.readForm(body)); HIS.store.commit(); UI.toast('Settings saved'); }; };

    if (sec === 'hospital') {
      body.innerHTML = card('Hospital information', 'Shown on invoices, prescriptions and reports.', UI.form([
        { name: 'hospitalName', label: 'Hospital name', required: true }, { name: 'legalName', label: 'Legal company name', required: true },
        { name: 'taxId', label: 'Tax code (MST)', required: true }, { name: 'address', label: 'Address', span: 2, required: true },
        { name: 'phone', label: 'Phone', required: true }, { name: 'hotline', label: 'Hotline' },
        { name: 'email', label: 'Contact email', type: 'email' }, { name: 'website', label: 'Website' },
        { name: 'openHours', label: 'Opening hours', span: 2 }
      ], s), saveBtn());
      bindSave((v) => Object.assign(s, v));
    }
    if (sec === 'branches') {
      body.innerHTML = card('Branches', 'Hospitals and clinics managed in this system. Switch branch from the top bar.', `<div class="table-wrap"><table class="table"><thead><tr><th>Branch</th><th>City</th><th>Director</th><th>Phone</th><th>Status</th><th></th></tr></thead><tbody>${d.branches.map((b) => `<tr><td class="cell-main">${U.esc(b.name)}<div class="cell-sub">${U.esc(b.address)}</div></td><td>${U.esc(b.city)}</td><td>${U.esc(b.director)}</td><td>${U.esc(b.phone)}</td><td>${U.badge(b.status)}</td><td class="actions"><button class="icon-btn sm" data-br="${b.id}" aria-label="Edit">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>`);
      body.onclick = (e) => { const b = e.target.closest('[data-br]'); if (b) branchForm(b.dataset.br); };
    }
    if (sec === 'insurance') {
      body.innerHTML = card('Insurance defaults', 'Applied when creating a new patient or invoice.', UI.form([
        { name: 'defaultCoveragePct', label: 'Default BHYT coverage %', type: 'number', min: 0, max: 100 },
        { name: 'invoiceSymbol', label: 'Invoice symbol', required: true }
      ], s) + `<div class="alert info mt-2">${icon('info')}<p>Insurance providers accepted: ${HIS.REF.INSURANCE_PROVIDERS.map(U.esc).join(', ')}. This is demo/mock data only — no government API is used.</p></div>`, saveBtn());
      bindSave((v) => { s.defaultCoveragePct = Number(v.defaultCoveragePct); s.invoiceSymbol = v.invoiceSymbol; });
    }
    if (sec === 'users') {
      body.innerHTML = card('Users', 'Accounts that can sign in to the system.', `<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Username</th><th>Role</th><th>Email</th><th></th></tr></thead><tbody>${d.users.map((u) => `<tr><td><div class="cell-person"><span class="avatar sm">${U.initials(u.name)}</span><span class="cell-main">${U.esc(u.name)}</span></div></td><td><span class="kbd">${U.esc(u.username)}</span></td><td>${U.esc(u.role)}</td><td>${U.esc(u.email)}</td><td class="actions"><button class="icon-btn sm" data-u="${u.username}" aria-label="Edit">${icon('edit')}</button></td></tr>`).join('')}</tbody></table></div>`, `<button class="btn" data-u="">${icon('plus')}Add user</button>`);
      body.onclick = (e) => { const b = e.target.closest('[data-u]'); if (b) userForm(b.dataset.u); };
    }
    if (sec === 'roles') {
      if (!d.permissions) d.permissions = defaultPerms();
      const role = body.dataset.role || 'Doctor';
      const P = d.permissions[role];
      body.innerHTML = card('Roles & permissions', 'What each role can see and change. Administrator always has full access.', `<div class="row mb-2"><label class="small muted" for="role-sel">Role</label><select id="role-sel" class="select-sm">${ROLES.map((r) => `<option ${r === role ? 'selected' : ''}>${r}</option>`).join('')}</select><span class="small muted">${d.users.filter((u) => u.role === role).length} user(s)</span></div>
        <div class="table-wrap"><table class="table compact perm-table"><thead><tr><th>Module</th><th class="center">View</th><th class="center">Create / edit</th><th class="center">Delete</th></tr></thead><tbody>${MODULES.map((m) => `<tr><td>${m}</td>${['view', 'edit', 'del'].map((k) => `<td class="center"><input type="checkbox" class="check" data-perm="${m}|${k}" ${P[m][k] ? 'checked' : ''} ${role === 'Administrator' ? 'disabled' : ''} aria-label="${m} ${k}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="tiny muted mt-1">Sidebar access follows the built-in role map; this matrix is stored for reference.</p>`, role === 'Administrator' ? '' : saveBtn('Save permissions'));
      body.querySelector('#role-sel').onchange = (e) => { body.dataset.role = e.target.value; draw(); };
      const sb = body.querySelector('[data-save]');
      if (sb) sb.onclick = () => { U.qsa('[data-perm]', body).forEach((c) => { const [m, k] = c.dataset.perm.split('|'); P[m][k] = c.checked; if (k === 'view' && !c.checked) { P[m].edit = false; P[m].del = false; } }); HIS.store.commit(); UI.toast(`Permissions saved for ${role}`); draw(); };
    }
    if (sec === 'notif') {
      const N = [['appointments', 'Appointments waiting to check in'], ['queue', 'Outpatient queue updates'], ['lab', 'Lab results ready'], ['prescription', 'Prescriptions ready for dispensing'], ['pharmacy', 'Low medicine stock'], ['beds', 'Bed availability'], ['emergency', 'Active emergency cases'], ['billing', 'Unpaid invoices'], ['email', 'Also send by email (simulated)']];
      body.innerHTML = card('Notifications', 'Choose which alerts appear in the bell menu.', `<div class="stack">${N.map((n) => `<label class="switch"><input type="checkbox" data-n="${n[0]}" ${s.notif[n[0]] ? 'checked' : ''}><span class="track"></span><span>${n[1]}</span></label>`).join('')}</div>`, saveBtn());
      body.querySelector('[data-save]').onclick = () => { U.qsa('[data-n]', body).forEach((c) => { s.notif[c.dataset.n] = c.checked; }); HIS.store.commit(); UI.toast('Notification settings saved'); };
    }
    if (sec === 'regional') {
      body.innerHTML = card('Regional & language', '', UI.form([
        { name: 'currency', label: 'Currency', type: 'select', options: [{ value: 'VND', label: 'VND — Vietnamese dong (₫)' }] },
        { name: 'language', label: 'Interface language', type: 'select', options: ['English', 'Tiếng Việt (coming soon)'] },
        { name: 'timezone', label: 'Time zone', type: 'select', options: [{ value: 'Asia/Ho_Chi_Minh', label: '(GMT+7) Ho Chi Minh City' }] },
        { name: 'dateFormat', label: 'Date format', type: 'select', options: ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY'] }
      ], s), saveBtn());
      bindSave((v) => { if (v.language !== 'English') { UI.toast('Vietnamese is coming soon. Keeping English.', 'info'); v.language = 'English'; } Object.assign(s, v); setTimeout(draw, 10); });
    }
    if (sec === 'system') {
      const size = (() => { try { return (localStorage.getItem('mediplus-his-data') || '').length; } catch (e) { return 0; } })();
      body.innerHTML = card('System', 'Data is stored in this browser (localStorage). Nothing is sent to a server.', `<dl class="dl"><dt>Version</dt><dd>MediPlus HIS 1.0 · data schema v${d.version}</dd><dt>Storage</dt><dd>${HIS.store.storageOk ? `${(size / 1024).toFixed(0)} KB used in localStorage` : 'Unavailable — changes are kept in memory only'}</dd><dt>Records</dt><dd>${d.patients.length} patients · ${d.doctors.length} doctors · ${d.appointments.length} appointments · ${d.invoices.length} invoices</dd><dt>Demo dates</dt><dd>Anchored to ${U.fmtDate(d.anchorDate)}; data shifts forward automatically each day.</dd></dl>
        <div class="row mt-2"><button class="btn" data-sys="export">${icon('download')}Export all data (JSON)</button><button class="btn btn-danger" data-sys="reset">${icon('refresh')}Reset demo data</button></div>`);
      body.onclick = async (e) => {
        const b = e.target.closest('[data-sys]');
        if (!b) return;
        if (b.dataset.sys === 'export') { if (U.download(`mediplus-his-backup-${U.today()}.json`, JSON.stringify(d, null, 1), 'application/json')) UI.toast('Backup downloaded'); }
        if (b.dataset.sys === 'reset' && await UI.confirm({ title: 'Reset all demo data?', message: 'All patients, appointments, records and settings you changed will be replaced with fresh sample data.', confirmLabel: 'Reset data', danger: true })) { HIS.store.reset(); UI.toast('Demo data reset'); HIS.app.go('#/dashboard'); }
      };
    }
  }

  function branchForm(id) {
    const b = id ? D().branches.find((x) => x.id === id) : null;
    UI.modal({ title: b ? `Edit ${b.name}` : 'Add branch', size: 'md', body: UI.form([{ name: 'name', label: 'Name', required: true, span: 2 }, { name: 'city', label: 'City', required: true }, { name: 'beds', label: 'Beds', type: 'number', min: 0 }, { name: 'address', label: 'Address', span: 2 }, { name: 'director', label: 'Director' }, { name: 'phone', label: 'Phone' }, { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Opening Soon', 'Inactive'] }], b || { status: 'Opening Soon' }),
      actions: [{ label: 'Cancel' }, { label: 'Save branch', kind: 'primary', onClick: (ctx) => { if (!UI.validate(ctx.body)) return false; const v = UI.readForm(ctx.body); if (b) Object.assign(b, v); else D().branches.push(Object.assign({ id: 'BR' + String(D().branches.length + 1).padStart(2, '0') }, v)); HIS.store.commit(); UI.toast('Branch saved'); draw(); } }] });
  }
  function userForm(username) {
    const u = username ? D().users.find((x) => x.username === username) : null;
    UI.modal({ title: u ? `Edit ${u.name}` : 'Add user', size: 'md', body: UI.form([{ name: 'name', label: 'Full name', required: true, span: 2 }, { name: 'username', label: 'Username', required: true, pattern: '[a-z0-9._]{3,20}', readonly: !!u }, { name: 'password', label: 'Password', type: 'password', required: !u, placeholder: u ? 'Leave blank to keep' : '', pattern: '.{6,}' }, { name: 'role', label: 'Role', type: 'select', options: ROLES }, { name: 'email', label: 'Email', type: 'email', required: true }], u ? Object.assign({}, u, { password: '' }) : { role: 'Doctor' }),
      actions: [{ label: 'Cancel' }, { label: 'Save user', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const v = UI.readForm(ctx.body);
        const d = D();
        if (!u && d.users.some((x) => x.username === v.username)) { UI.toast('Username already exists.', 'error'); return false; }
        if (u && u.username === HIS.app.user.username && v.role !== u.role) { UI.toast('You cannot change your own role.', 'error'); return false; }
        if (u) { if (!v.password) delete v.password; Object.assign(u, v); } else d.users.push(v);
        HIS.store.commit(); UI.toast('User saved'); draw();
      } }] });
  }

  HIS.modules.settings = { title: 'Settings', render };
})();
