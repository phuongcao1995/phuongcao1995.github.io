/* User & role management, audit log, and system settings. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store;

  /* ---------- Users & roles ---------- */
  function userForm(u, refresh) {
    const isNew = !u, R = GA.app.ROLES;
    ui.formModal({ title: isNew ? t('Add user') : t('Edit user'), subtitle: u ? esc(u.username) : t('Accounts sign in with the organisation directory (demo)'), size: 'lg',
      fields: [
        { key: 'name', label: 'Full name', required: true },
        { key: 'username', label: 'Username', required: true, readonly: !isNew, pattern: '^[a-z0-9._]{3,30}$', patternMsg: 'Use 3–30 lowercase letters, digits, dots or underscores.', validate: (v) => (S.all('users').some((x) => x.username === v && (!u || x.id !== u.id)) ? t('This username is taken.') : '') },
        { key: 'email', label: 'Email', type: 'email', required: true },
        { key: 'role', label: 'Role', type: 'select', required: true, options: Object.keys(R).map((k) => ({ value: k, label: t(R[k].label) })) },
        { key: 'dept', label: 'Department', type: 'select', options: S.all('departments').map((d) => ({ value: d.id, label: d.name })) },
        { key: 'title', label: 'Position' },
        { key: 'twoFactor', label: 'Require two-factor authentication', type: 'checkbox', default: true, full: true },
      ], values: u ? U.clone(u) : { role: 'officer', dept: 'D01', twoFactor: true }, submitLabel: isNew ? t('Add user') : t('Save changes'),
      onSubmit: (v) => {
        if (isNew) { const rec = Object.assign({ id: S.nextId('users', 'US-', 3), status: 'Active', lastLogin: '' }, v); S.insert('users', rec); S.log('Created user', rec.id, `${rec.username} (${rec.role})`); ui.toast(t('User {u} created. A temporary password was sent by email.', { u: esc(rec.username) }), 'success'); }
        else { if (u.id === GA.app.user.id && v.role !== 'sysadmin') { ui.toast(t('You cannot remove your own administrator role.'), 'error'); return false; } S.update('users', u.id, v); S.log('Updated user', u.id, v.role); ui.toast(t('User updated.'), 'success'); }
        refresh();
      } });
  }

  function users(el, params, q) {
    const app = GA.app, admin = app.can('admin'), R = app.ROLES;
    let tab = q.tab || 'users';
    const refresh = () => users(el, params, { tab });
    const all = S.all('users');
    const MODS = app.NAV.flatMap((g) => g.items);
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('Users & roles') }], title: t('Users & roles'), subtitle: t('Accounts, role-based permissions and audit trail'), actions: admin ? `<button class="btn btn-primary" id="us-new">${icon('plus')}${t('Add user')}</button>` : '' })}
      ${admin ? '' : `<div class="callout mb-2">${icon('info')}<div>${t('You can view accounts and the audit log. Only the System Administrator can change users and roles.')}</div></div>`}
      ${ui.kpis([{ label: 'User accounts', value: all.length, icon: 'users' }, { label: 'Active', value: all.filter((u) => u.status === 'Active').length, icon: 'checkcircle', color: 'var(--ok)' }, { label: 'Locked', value: all.filter((u) => u.status === 'Locked').length, icon: 'lock', color: 'var(--red)' }, { label: 'Two-factor enabled', value: U.pct(all.filter((u) => u.twoFactor).length, all.length) + '%', icon: 'shield' }], 'compact')}
      ${ui.tabs([
        { id: 'users', label: 'Users', icon: 'users', count: all.length, content: '<div class="panel"><div class="panel-body flush" id="us-t"></div></div>' },
        { id: 'roles', label: 'Roles and permissions', icon: 'shield', count: Object.keys(R).length, content: ui.panel({ title: t('Permission matrix'), sub: t('V = view, E = create and edit, A = approve or sign'), flush: true, body: `<div class="table-wrap"><table class="table simple matrix"><thead><tr><th>${t('Module')}</th>${Object.keys(R).map((k) => `<th title="${esc(t(R[k].label))}">${esc(t(R[k].label))}</th>`).join('')}</tr></thead><tbody>${MODS.map(([m, label]) => `<tr><td>${esc(t(label))}</td>${Object.keys(R).map((k) => { const r = R[k]; const v = r.modules.includes(m); if (!v) return `<td class="no" aria-label="${t('No access')}">—</td>`; const e = r.edit.includes(m) || (r.portal && ['services', 'complaints'].includes(m)); const a = r.approve || (r.edit.includes(m) && ['tax', 'land', 'insurance', 'vehicles', 'business', 'identity'].includes(m)); return `<td class="yes">V${e ? ' E' : ''}${a && e ? ' A' : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div><div class="panel-body xs muted">${t('Citizen and Business User roles only see their own records. Permissions are enforced in the interface of this demo; a production system enforces them on the server.')}</div>` }) },
        { id: 'audit', label: 'Audit log', icon: 'clock', count: S.all('audit').length, content: '<div class="panel"><div class="panel-body flush" id="us-a"></div></div>' },
      ], { cls: 'page-tabs', active: tab, id: 'us' })}`;
    ui.table(U.$('#us-t', el), { rows: () => S.all('users'), exportName: 'users', searchKeys: ['name', 'username', 'email', 'title'], searchPlaceholder: t('Search by name, username or email'),
      filters: [{ key: 'role', label: 'Role', all: 'All roles', options: Object.keys(R).map((k) => ({ value: k, label: t(R[k].label) })) }, { key: 'status', label: 'Status', all: 'All statuses', options: ['Active', 'Locked'] }], defaultSort: 'id', defaultDir: 'asc',
      columns: [{ key: 'name', label: 'User', render: (u) => `<div class="flex">${ui.avatar(u.name)}<div><span class="strong">${esc(u.name)}</span>${u.demo ? ' <span class="tag">demo</span>' : ''}<span class="sub">${esc(u.username)} · ${esc(u.email)}</span></div></div>` }, { key: 'role', label: 'Role', render: (u) => esc(app.roleLabel(u.role)), csv: (u) => app.roleLabel(u.role) }, { key: 'dept', label: 'Department', render: (u) => (u.dept ? `<span class="small">${esc(ui.dept(u.dept).short)}</span><span class="sub">${esc(u.title || '')}</span>` : '—'), csv: (u) => (u.dept ? ui.dept(u.dept).name : '') }, { key: 'twoFactor', label: '2FA', render: (u) => (u.twoFactor ? ui.badge('Active', 'On') : ui.badge('Pending', 'Off')) }, { key: 'lastLogin', label: 'Last sign-in', render: (u) => (u.lastLogin ? U.ago(u.lastLogin) : '—'), csv: (u) => U.dateTime(u.lastLogin) }, { key: 'status', label: 'Status', render: (u) => ui.badge(u.status) }],
      rowActions: (u) => (admin ? [{ id: 'e', label: 'Edit', icon: 'edit' }, { id: 'l', label: u.status === 'Locked' ? 'Unlock' : 'Lock', icon: u.status === 'Locked' ? 'unlock' : 'lock' }, { id: 'p', label: 'Reset password', icon: 'refresh' }].concat(u.demo ? [] : [{ id: 'd', label: 'Delete', icon: 'trash', danger: true }]) : []),
      onAction: async (id, u, dt) => {
        if (id === 'e') userForm(u, refresh);
        if (id === 'l') { if (u.id === app.user.id) { ui.toast(t('You cannot lock your own account.'), 'error'); return; } const st = u.status === 'Locked' ? 'Active' : 'Locked'; S.update('users', u.id, { status: st }); S.log(st === 'Locked' ? 'Locked user' : 'Unlocked user', u.id, u.username); ui.toast(t('Account {s}.', { s: t(st === 'Locked' ? 'locked' : 'unlocked') }), 'success'); dt.refresh(); }
        if (id === 'p') { S.log('Reset user password', u.id, u.username); ui.toast(t('A password reset link was sent to {e}.', { e: esc(u.email) }), 'success'); }
        if (id === 'd') { const ok = await ui.confirm({ title: t('Delete user'), message: t('Delete the account {u}? Its audit history is kept.', { u: esc(u.username) }), danger: true, confirmLabel: t('Delete') }); if (ok) { S.remove('users', u.id); S.log('Deleted user', u.id, u.username); ui.toast(t('User deleted.'), 'success'); dt.refresh(); } }
      } });
    ui.table(U.$('#us-a', el), { rows: () => S.all('audit'), exportName: 'audit-log', searchKeys: ['user', 'action', 'target', 'detail'], searchPlaceholder: t('Search the audit log'),
      filters: [{ key: 'role', label: 'Role', all: 'All roles', options: Object.keys(R).map((k) => ({ value: k, label: t(R[k].label) })) }], dateKey: 'time', dateLabel: 'From', defaultSort: 'time', noExport: !admin,
      columns: [{ key: 'time', label: 'Time', render: (a) => U.dateTime(a.time) }, { key: 'user', label: 'User', render: (a) => `${esc(a.user)}<span class="sub">${esc(app.roleLabel(a.role))}</span>` }, { key: 'action', label: 'Action', render: (a) => esc(t(a.action)) }, { key: 'target', label: 'Record', cls: 'code' }, { key: 'detail', label: 'Detail', render: (a) => `<span class="small">${esc(a.detail)}</span>` }] });
    const nb = U.$('#us-new', el); if (nb) nb.onclick = () => userForm(null, refresh);
    ui.bindTabs(el, (id) => { tab = id; });
  }

  /* ---------- Settings ---------- */
  function settings(el, params, q) {
    const app = GA.app, admin = app.can('admin'), s = S.state.settings;
    const sw = (k, label, help, disabled) => `<div class="doc-check"><div class="dc-name"><div class="strong">${t(label)}</div>${help ? `<div class="xs muted">${t(help)}</div>` : ''}</div><label class="switch"><input type="checkbox" data-set="${k}" ${s[k] ? 'checked' : ''} ${disabled ? 'disabled' : ''} aria-label="${esc(t(label))}"><span class="track"></span></label></div>`;
    const general = ui.panel({ title: t('Display and regional format'), body: `<div class="form-grid">
        <div class="field"><label for="st-lang">${t('Language')}</label><select id="st-lang" data-set="lang"><option value="en" ${s.lang === 'en' ? 'selected' : ''}>English</option><option value="vi" ${s.lang === 'vi' ? 'selected' : ''}>Tiếng Việt</option></select><div class="help">${t('Vietnamese covers navigation and common labels; remaining text falls back to English.')}</div></div>
        <div class="field"><label for="st-ps">${t('Rows per page')}</label><select id="st-ps" data-set="pageSize">${[10, 20, 50].map((n) => `<option ${n === +s.pageSize ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="st-df">${t('Date format')}</label><select id="st-df" disabled><option>dd/mm/yyyy</option></select><div class="help">${t('Vietnamese standard format.')}</div></div>
        <div class="field"><label for="st-am">${t('Administrative address model')}</label><select id="st-am" data-set="addressModel" ${admin ? '' : 'disabled'}><option value="3-level" ${s.addressModel === '3-level' ? 'selected' : ''}>${t('3 levels: province, district, ward')}</option><option value="2-level" ${s.addressModel === '2-level' ? 'selected' : ''}>${t('2 levels: province, ward/commune')}</option></select><div class="help">${t('Viet Nam moved to two-tier local government on 1 July 2025. Choose 2 levels to hide districts in addresses.')}</div></div>
      </div>` });
    const org = ui.panel({ title: t('Organisation profile'), body: `<form class="form-grid" id="st-org" novalidate>${[['orgName', 'Organisation name (English)'], ['orgVi', 'Organisation name (Vietnamese)'], ['orgCode', 'Unit code'], ['hotline', 'Hotline'], ['orgAddress', 'Address']].map(([k, l]) => `<div class="field ${k === 'orgAddress' ? 'full' : ''}" data-field="${k}"><label for="st-${k}">${t(l)}<span class="req">*</span></label><input id="st-${k}" name="${k}" value="${esc(s[k])}" ${admin ? '' : 'readonly'}><div class="err"></div></div>`).join('')}</form>${admin ? `<button class="btn btn-primary mt-2" id="st-org-save">${icon('check')}${t('Save organisation profile')}</button>` : ''}` });
    const notif = ui.panel({ title: t('Notifications'), body: sw('notifyEmail', 'Email notifications', 'Status changes and assignments are sent to your email.') + sw('notifySms', 'SMS notifications', 'Short messages for urgent items and passcodes.') + sw('notifyDeadline', 'Deadline reminders', 'Remind two working days before a processing deadline.') + (admin ? sw('maintenance', 'Maintenance mode banner', 'Show a notice to portal users about planned maintenance.') : '') });
    const security = ui.panel({ title: t('Security'), body: `<div class="form-grid"><div class="field"><label for="st-to">${t('Session timeout (minutes)')}</label><input type="number" id="st-to" data-set="sessionTimeout" min="5" max="240" value="${esc(s.sessionTimeout)}" ${admin ? '' : 'readonly'}></div></div><div class="callout mt-1">${icon('lock')}<div>${t('Demo sign-in uses local accounts. A production deployment integrates VNeID and the government single sign-on.')}</div></div>` });
    const data = ui.panel({ title: t('Demo data'), body: `<p class="small">${t('All data is stored in this browser (localStorage). Export a backup, restore it later, or reset to the original demo data.')}</p><div class="flex flex-wrap mt-1"><button class="btn" id="st-exp">${icon('download')}${t('Export data (JSON)')}</button><label class="btn">${icon('upload')}${t('Import data')}<input type="file" accept="application/json,.json" id="st-imp" class="sr-only"></label><button class="btn btn-danger" id="st-reset">${icon('refresh')}${t('Reset demo data')}</button></div><div class="xs muted mt-1">${t('Storage')}: ${S.persistent ? t('persistent (localStorage)') : t('session only, localStorage unavailable')} · ${U.num(Math.round(JSON.stringify(S.state).length / 1024))} KB</div>` });
    const about = ui.panel({ title: t('About'), body: ui.dl([['Application', t('e-Gov Administration (demo)')], ['Version', '1.0.0 · data v' + GA.data.VERSION], ['Technology', t('HTML, CSS and vanilla JavaScript; no frameworks or server')], ['Data', t('Entirely fictional people, companies and records generated for demonstration')], ['Branding', t('Generic government styling; not affiliated with any real portal or agency')]]) });
    const tabsDef = app.portal ? [{ id: 'gen', label: 'General', content: general + notif }] : [{ id: 'gen', label: 'General', content: general }, { id: 'org', label: 'Organisation', content: org }, { id: 'not', label: 'Notifications', content: notif + security }].concat(admin ? [{ id: 'data', label: 'Data', content: data }] : []).concat([{ id: 'about', label: 'About', content: about }]);
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t(app.portal ? 'Preferences' : 'System settings') }], title: t(app.portal ? 'Preferences' : 'System settings'), subtitle: admin ? t('Configuration applies to everyone using this browser.') : t('Personal preferences. Organisation settings are managed by the System Administrator.') })}
      ${ui.tabs(tabsDef, { cls: 'page-tabs', active: q.tab || 'gen', id: 'sttabs' })}`;
    U.$$('[data-set]', el).forEach((inp) => inp.addEventListener('change', () => {
      const k = inp.dataset.set;
      let v = inp.type === 'checkbox' ? inp.checked : inp.value;
      if (k === 'pageSize' || k === 'sessionTimeout') v = Math.max(+inp.min || 1, Math.min(+inp.max || 999, +v));
      S.setting(k, v); S.log('Changed setting', k, String(v));
      if (k === 'lang') { GA.i18n.set(v); GA.app.rebuild(); }
      ui.toast(t('Setting saved.'), 'success');
    }));
    const os = U.$('#st-org-save', el);
    if (os) os.onclick = () => { const f = U.$('#st-org', el); let ok = true; U.$$('input', f).forEach((i) => { const w = i.closest('.field'); const bad = !i.value.trim(); w.classList.toggle('invalid', bad); w.querySelector('.err').textContent = bad ? t('This field is required.') : ''; if (bad) ok = false; }); if (!ok) return; U.$$('input', f).forEach((i) => S.setting(i.name, i.value.trim())); S.log('Updated organisation profile'); ui.toast(t('Organisation profile saved.'), 'success'); };
    const ex = U.$('#st-exp', el); if (ex) ex.onclick = () => { U.download(`egov-demo-data-${U.today()}.json`, S.exportJSON(), 'application/json'); ui.toast(t('Data exported.'), 'success'); };
    const im = U.$('#st-imp', el);
    if (im) im.onchange = () => { const f = im.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { S.importJSON(r.result); const un = app.user.username; app.user = S.all('users').find((x) => x.username === un) || app.user; ui.toast(t('Data imported.'), 'success'); location.reload(); } catch (e) { ui.toast(esc(e.message || t('Import failed.')), 'error'); } }; r.readAsText(f); };
    const rs = U.$('#st-reset', el); if (rs) rs.onclick = () => { const b = document.querySelector('[data-reset-demo]'); if (b) b.click(); };
    ui.bindTabs(el);
  }

  GA.modules.users = { render: users };
  GA.modules.settings = { render: settings };
})(window.GA);
