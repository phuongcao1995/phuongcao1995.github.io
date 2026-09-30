/* Citizen management: population register list, profile detail, add/edit, family, administrative history. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;
  const STATUSES = ['Active', 'Temporarily absent', 'Moved out', 'Deceased'];

  const phoneOk = (v) => (/^0\d{9}$/.test(String(v).replace(/[\s.]/g, '')) ? '' : t('Enter a 10-digit Vietnamese phone number starting with 0.'));
  const fmtPhone = (v) => { const d = String(v).replace(/\D/g, ''); return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : v; };

  function fields(existing) {
    return [
      { type: 'section', label: 'Identity' },
      { key: 'fullName', label: 'Full name', required: true, placeholder: 'e.g. Nguyễn Văn An', validate: (v) => (v.split(/\s+/).length < 2 ? t('Enter the full name with family name and given name.') : '') },
      { key: 'cid', label: 'Personal identification number', required: true, pattern: '^\\d{12}$', patternMsg: 'The citizen ID has exactly 12 digits.', inputmode: 'numeric', help: '12 digits: province code, century/gender, birth year, serial.',
        validate: (v) => (S.all('citizens').some((c) => c.cid === v && (!existing || c.id !== existing.id)) ? t('This ID number is already on the register.') : '') },
      { key: 'dob', label: 'Date of birth', type: 'date', required: true, max: U.today(), validate: (v) => (v > U.today() ? t('Date of birth cannot be in the future.') : '') },
      { key: 'gender', label: 'Gender', type: 'select', required: true, options: ['Male', 'Female'] },
      { key: 'ethnicity', label: 'Ethnicity', default: 'Kinh' },
      { key: 'religion', label: 'Religion', type: 'select', noBlank: true, options: ['None', 'Buddhism', 'Catholicism', 'Protestantism', 'Cao Đài', 'Hòa Hảo'] },
      { key: 'nationality', label: 'Nationality', default: 'Vietnamese' },
      { key: 'hometown', label: 'Place of origin', placeholder: 'e.g. Quảng Nam' },
      { key: 'occupation', label: 'Occupation' },
      { key: 'maritalStatus', label: 'Marital status', type: 'select', noBlank: true, options: ['Single', 'Married', 'Divorced', 'Widowed'] },
      { key: 'idIssued', label: 'ID card issue date', type: 'date', max: U.today() },
      { key: 'status', label: 'Register status', type: 'select', noBlank: true, options: STATUSES },
      { type: 'section', label: 'Contact' },
      { key: 'phone', label: 'Phone number', type: 'tel', required: true, placeholder: '0905 123 456', validate: phoneOk },
      { key: 'email', label: 'Email', type: 'email' },
      { type: 'section', label: 'Residence' },
      { key: 'residenceType', label: 'Residence type', type: 'select', noBlank: true, options: ['Permanent', 'Temporary'] },
      { key: 'household', label: 'Household book / household head', placeholder: 'e.g. Household head: Nguyễn Văn Bình' },
    ].concat(M.addressFields());
  }

  function edit(c, done) {
    const isNew = !c;
    const v = c ? U.clone(c) : { province: 'Da Nang City', status: 'Active', residenceType: 'Permanent', nationality: 'Vietnamese', ethnicity: 'Kinh', religion: 'None', maritalStatus: 'Single' };
    ui.formModal({
      title: isNew ? t('Add citizen to register') : t('Edit citizen profile'), subtitle: isNew ? t('Record a new resident in the population register') : esc(c.fullName) + ' · ' + esc(c.cid), size: 'xl',
      fields: fields(c), values: v, submitLabel: isNew ? t('Add citizen') : t('Save changes'),
      onSubmit: (val) => {
        val.phone = fmtPhone(val.phone);
        if (isNew) {
          const rec = Object.assign({ id: S.nextId('citizens', 'CT-'), family: [], history: [{ date: U.today(), action: 'Record created in population register', unit: GA.ui.dept(GA.app.user.dept).name, ref: 'NK-' + Date.now().toString().slice(-6) }], idExpiry: '', createdAt: U.nowIso(), updatedAt: U.nowIso() }, val);
          S.insert('citizens', rec); S.log('Added citizen', rec.id, rec.fullName);
          ui.toast(t('{name} was added to the register.', { name: esc(rec.fullName) }), 'success');
          if (done) done(rec);
        } else {
          const changes = Object.keys(val).filter((k) => String(val[k]) !== String(c[k]));
          if (!changes.length) { ui.toast(t('No changes to save.'), 'info'); return; }
          const hist = c.history.slice();
          if (changes.some((k) => ['street', 'ward', 'district', 'province'].includes(k))) hist.push({ date: U.today(), action: 'Residence address updated', unit: 'Ward Police', ref: 'CT01-' + Date.now().toString().slice(-5) });
          if (changes.includes('status')) hist.push({ date: U.today(), action: 'Register status changed to ' + val.status, unit: GA.ui.dept(GA.app.user.dept).name, ref: '' });
          S.update('citizens', c.id, Object.assign(val, { history: hist }));
          S.log('Updated citizen profile', c.id, changes.join(', '));
          ui.toast(t('Profile updated.'), 'success');
          if (done) done(c);
        }
      },
    });
  }

  function list(el) {
    const app = GA.app, canEdit = app.can('edit', 'citizens');
    const all = S.all('citizens');
    const gc = U.groupCount(all, 'status');
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('Citizens') }], title: t('Citizen management'), subtitle: t('Population register for residents under the administration of {org}', { org: esc(S.setting('orgName')) }),
      actions: canEdit ? `<button class="btn btn-primary" id="add-ct">${icon('plus')}${t('Add citizen')}</button>` : '' })}
      ${ui.kpis([
        { label: 'Citizens in register view', value: U.num(all.length), icon: 'users' },
        { label: 'Permanent residents', value: U.num(all.filter((c) => c.residenceType === 'Permanent').length), icon: 'home', color: 'var(--ok)' },
        { label: 'Temporarily absent', value: U.num(gc['Temporarily absent'] || 0), icon: 'clock', color: 'var(--gold)' },
        { label: 'Moved out or deceased', value: U.num((gc['Moved out'] || 0) + (gc.Deceased || 0)), icon: 'user', color: 'var(--neu)' },
      ], 'compact')}
      <div class="panel"><div class="panel-body flush" id="ct-table"></div></div>`;
    const dt = ui.table(U.$('#ct-table', el), {
      rows: () => S.all('citizens'), caption: t('Citizens'), exportName: 'citizens',
      searchKeys: ['fullName', 'cid', 'phone', 'street', 'ward', 'household'], searchPlaceholder: t('Search by name, ID number, phone or address'),
      filters: [
        { key: 'province', label: 'Province/City', all: 'All provinces', options: GA.data.PROVINCES.map((p) => p.name) },
        { key: 'gender', label: 'Gender', all: 'All genders', options: ['Male', 'Female'] },
        { key: 'residenceType', label: 'Residence type', all: 'All residence types', options: ['Permanent', 'Temporary'] },
        { key: 'status', label: 'Status', all: 'All statuses', options: STATUSES },
      ],
      defaultSort: 'updatedAt', defaultDir: 'desc',
      columns: [
        { key: 'fullName', label: 'Full name', render: (c) => `<div class="flex">${ui.avatar(c.fullName)}<div><a class="strong" href="#/citizens/${c.id}">${esc(c.fullName)}</a><span class="sub code">${esc(c.cid)}</span></div></div>`, csv: (c) => c.fullName },
        { key: 'cid', label: 'Citizen ID', cls: 'code', render: (c) => esc(c.cid), csv: (c) => "'" + c.cid },
        { key: 'dob', label: 'Date of birth', render: (c) => `${U.date(c.dob)}<span class="sub">${U.age(c.dob)} ${t('years')}</span>`, csv: (c) => U.date(c.dob) },
        { key: 'gender', label: 'Gender', render: (c) => t(c.gender) },
        { key: 'ward', label: 'Address', render: (c) => `${esc(c.ward)}<span class="sub">${esc(U.address({ district: c.district, province: c.province }))}</span>`, csv: (c) => U.address(c) },
        { key: 'phone', label: 'Phone', cls: 'nowrap', render: (c) => esc(c.phone) },
        { key: 'status', label: 'Status', render: (c) => ui.badge(c.status) + `<span class="sub">${t(c.residenceType)}</span>` },
        { key: 'updatedAt', label: 'Updated', render: (c) => U.date(c.updatedAt || c.createdAt) },
      ],
      rowActions: () => [{ id: 'view', label: 'View profile', icon: 'eye' }].concat(canEdit ? [{ id: 'edit', label: 'Edit', icon: 'edit' }] : []).concat(app.can('admin') ? [{ id: 'del', label: 'Delete record', icon: 'trash', danger: true }] : []),
      onRowClick: (c) => app.go('#/citizens/' + c.id),
      onAction: async (id, c, d) => {
        if (id === 'view') app.go('#/citizens/' + c.id);
        if (id === 'edit') edit(c, () => d.refresh());
        if (id === 'del') {
          const ok = await ui.confirm({ title: t('Delete citizen record'), message: t('Delete the record of {name} ({cid})? In a real register records are archived, not deleted. This demo removes it from this browser.', { name: esc(c.fullName), cid: c.cid }), danger: true, confirmLabel: t('Delete') });
          if (ok) { S.remove('citizens', c.id); S.log('Deleted citizen record', c.id, c.fullName); ui.toast(t('Record deleted.'), 'success'); d.refresh(); }
        }
      },
    });
    const add = U.$('#add-ct', el); if (add) add.onclick = () => edit(null, (rec) => { dt.refresh(); app.go('#/citizens/' + rec.id); });
  }

  function linked(c) {
    const apps = S.where('applications', (a) => a.applicantId === c.id);
    const tax = S.where('taxpayers', (x) => x.refId === c.id);
    const ins = S.where('insParticipants', (x) => x.citizenId === c.id);
    const land = S.where('parcels', (x) => x.ownerId === c.id);
    const veh = S.where('vehicles', (x) => x.ownerId === c.id);
    const biz = S.where('businesses', (x) => x.repCitizenId === c.id);
    const idn = S.where('identities', (x) => x.citizenId === c.id);
    const cps = S.where('complaints', (x) => x.citizenId === c.id);
    const app = GA.app;
    const row = (mod, ic, title, sub, href, badge) => (app.canView(mod) ? `<li><span class="l-ic">${icon(ic, 'i-sm')}</span><div class="l-main">${href ? `<a class="l-title" href="${href}">${title}</a>` : `<div class="l-title">${title}</div>`}<div class="l-sub">${sub}</div></div>${badge || ''}</li>` : `<li><span class="l-ic">${icon('lock', 'i-sm')}</span><div class="l-main"><div class="l-title">${title}</div><div class="l-sub">${t('Restricted for your role')}</div></div></li>`);
    const items = []
      .concat(apps.map((a) => row('services', 'file', esc(a.serviceName), `${esc(a.code)} · ${U.date(a.submittedAt)}`, '#/services/' + a.id, ui.badge(a.status))))
      .concat(tax.map((x) => row('tax', 'receipt', t('Personal tax code') + ' ' + esc(x.mst), esc(x.taxOffice) + (x.debt ? ' · ' + t('Debt') + ' ' + U.vnd(x.debt) : ''), '#/tax?id=' + x.id, ui.badge(x.debt ? 'In debt' : x.status))))
      .concat(ins.map((x) => row('insurance', 'shield', t('Social insurance no.') + ' ' + esc(x.insNo), `${esc(x.employerName)} · ${x.months} ${t('months contributed')}`, '#/insurance?id=' + x.id, ui.badge(x.status))))
      .concat(land.map((x) => row('land', 'map', `${t('Parcel')} ${esc(x.parcelNo)}, ${t('sheet')} ${esc(x.sheetNo)} · ${U.num(x.area)} m²`, esc(x.certNo) + ' · ' + esc(x.ward), '#/land?id=' + x.id, ui.badge(x.status))))
      .concat(veh.map((x) => row('vehicles', 'car', `<span class="plate ${x.ownerType === 'Business' ? 'yellow' : ''}">${esc(x.plate)}</span> ${esc(x.brand)} ${esc(x.model)}`, `${t(x.type)} · ${t('registered')} ${U.date(x.regDate)}`, '#/vehicles?id=' + x.id, ui.badge(x.status))))
      .concat(biz.map((x) => row('business', 'briefcase', esc(x.name), `${t('Legal representative')} · ${esc(x.code)}`, '#/business?id=' + x.id, ui.badge(x.status))))
      .concat(idn.map((x) => row('identity', 'idcard', t('e-ID account') + ' ' + esc(x.account), t(x.level), '#/identity?id=' + x.id, ui.badge(x.status))))
      .concat(cps.map((x) => row('complaints', 'message', esc(x.title), esc(x.code), '#/complaints/' + x.id, ui.badge(x.status))));
    return items.length ? `<ul class="list">${items.join('')}</ul>` : ui.empty('No linked records in other registers.');
  }

  function detail(el, id) {
    const c = S.find('citizens', id);
    if (!c) { el.innerHTML = ui.pageHeader({ crumbs: [{ label: t('Citizens'), href: '#/citizens' }], title: t('Citizen not found') }) + ui.empty('This record does not exist or was deleted.', `<a class="btn mt-1" href="#/citizens">${t('Back to list')}</a>`); return; }
    const app = GA.app, canEdit = app.can('edit', 'citizens');
    const idExpiry = c.idExpiry || '';
    const overview = `<div class="grid g-2">
      ${ui.panel({ title: t('Personal information'), body: ui.dl([['Full name', `<strong>${esc(c.fullName)}</strong>`], ['Personal identification number', `<span class="code">${esc(c.cid)}</span>`], ['Date of birth', `${U.date(c.dob)} (${U.age(c.dob)} ${t('years')})`], ['Gender', t(c.gender)], ['Ethnicity', esc(c.ethnicity)], ['Religion', t(c.religion)], ['Nationality', t(c.nationality)], ['Place of origin', esc(c.hometown)], ['Occupation', t(c.occupation)], ['Marital status', t(c.maritalStatus)]]) })}
      <div>
        ${ui.panel({ title: t('Residence and contact'), body: ui.dl([['Permanent address', esc(U.address(c))], ['Ward/Commune', esc(c.ward)], ['District', esc(c.district) + (S.setting('addressModel') === '2-level' ? ` <span class="xs muted">(${t('former unit')})</span>` : '')], ['Province/City', esc(c.province)], ['Residence type', t(c.residenceType)], ['Household', esc(c.household)], ['Phone', esc(c.phone)], ['Email', esc(c.email)]]) })}
        ${ui.panel({ title: t('Chip-based ID card'), body: ui.dl([['Card number', `<span class="code">${esc(c.cid)}</span>`], ['Issued on', U.date(c.idIssued)], ['Valid until', idExpiry ? U.date(idExpiry) : t('See card')], ['Issuing authority', t('Department of Police for Administrative Management of Social Order')]]) })}
      </div></div>`;
    const family = ui.panel({ title: t('Family members'), sub: t('As recorded in the household'), flush: true, actions: canEdit ? `<button class="btn btn-sm" id="add-fam">${icon('plus', 'i-sm')}${t('Add member')}</button>` : '', body: ui.simpleTable([
      { label: 'Relationship', render: (f) => t(f.relation) }, { label: 'Full name', render: (f) => `<strong>${esc(f.name)}</strong>` },
      { label: 'Date of birth', render: (f) => U.date(f.dob) }, { label: 'Citizen ID', cls: 'code', render: (f) => esc(f.cid || '—') },
      { label: 'On register', render: (f) => { const r = S.all('citizens').find((x) => x.cid === f.cid); return r ? `<a href="#/citizens/${r.id}">${t('View profile')}</a>` : '<span class="muted">—</span>'; } },
    ], c.family, 'No family members recorded.') });
    const hist = ui.panel({ title: t('Administrative history'), sub: t('Civil status and residence events'), actions: canEdit ? `<button class="btn btn-sm" id="add-hist">${icon('plus', 'i-sm')}${t('Record event')}</button>` : '', body: ui.timeline(c.history.slice().reverse().map((h) => ({ title: esc(t(h.action)), meta: `${U.date(h.date)} · ${esc(h.unit)}`, note: h.ref ? `${t('Reference')} <span class="code">${esc(h.ref)}</span>` : '' }))) });

    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('Citizens'), href: '#/citizens' }, { label: c.fullName }], title: esc(c.fullName), subtitle: t('Citizen profile') })}
      ${M.detailHead({ lead: ui.avatar(c.fullName, 'avatar-lg'), title: `${esc(c.fullName)} ${ui.badge(c.status)}`, meta: [`${icon('idcard', 'i-sm')}<span class="code">${esc(c.cid)}</span>`, `${icon('calendar', 'i-sm')}${U.date(c.dob)}`, `${icon('phone', 'i-sm')}${esc(c.phone)}`, `${icon('home', 'i-sm')}${esc(c.ward)}, ${esc(c.province)}`],
        actions: `${canEdit ? `<button class="btn" id="st-ct">${icon('refresh')}${t('Change status')}</button><button class="btn btn-primary" id="ed-ct">${icon('edit')}${t('Edit profile')}</button>` : ''}<button class="btn" onclick="window.print()">${icon('printer')}${t('Print')}</button>` })}
      <div class="mt-2">${ui.tabs([
        { id: 'ov', label: 'Overview', icon: 'user', content: overview },
        { id: 'fam', label: 'Family', icon: 'users', count: c.family.length, content: family },
        { id: 'hist', label: 'Administrative history', icon: 'clock', count: c.history.length, content: hist },
        { id: 'link', label: 'Linked records', icon: 'layers', content: ui.panel({ title: t('Records in other registers'), sub: t('Connected through the personal identification number'), flush: true, body: linked(c) }) },
      ], { cls: 'page-tabs' })}</div>`;
    const re = () => detail(el, id);
    const ed = U.$('#ed-ct', el); if (ed) ed.onclick = () => edit(c, re);
    const st = U.$('#st-ct', el);
    if (st) st.onclick = () => ui.formModal({ title: t('Change register status'), subtitle: esc(c.fullName), size: '', fields: [{ key: 'status', label: 'New status', type: 'select', required: true, options: STATUSES.filter((s) => s !== c.status) }, { key: 'note', label: 'Reason / legal basis', type: 'textarea', required: true, full: true }],
      submitLabel: t('Update status'), onSubmit: (v) => { c.history.push({ date: U.today(), action: `Register status changed to ${v.status}`, unit: GA.ui.dept(GA.app.user.dept).name, ref: v.note.slice(0, 40) }); S.update('citizens', c.id, { status: v.status, history: c.history }); S.log('Changed citizen status', c.id, v.status); ui.toast(t('Status updated.'), 'success'); re(); } });
    const af = U.$('#add-fam', el);
    if (af) af.onclick = () => ui.formModal({ title: t('Add family member'), subtitle: esc(c.fullName), fields: [{ key: 'relation', label: 'Relationship', type: 'select', required: true, options: ['Wife', 'Husband', 'Son', 'Daughter', 'Father', 'Mother', 'Sibling', 'Grandparent'] }, { key: 'name', label: 'Full name', required: true }, { key: 'dob', label: 'Date of birth', type: 'date', required: true, max: U.today() }, { key: 'cid', label: 'Citizen ID', pattern: '^\\d{12}$', patternMsg: 'The citizen ID has exactly 12 digits.', help: 'Leave blank for children without an ID yet.' }],
      submitLabel: t('Add member'), onSubmit: (v) => { c.family.push(v); S.update('citizens', c.id, { family: c.family }); S.log('Added family member', c.id, v.name); ui.toast(t('Family member added.'), 'success'); re(); setTimeout(() => { const b = U.$('[data-tab=fam]', el); if (b) b.click(); }, 0); } });
    const ah = U.$('#add-hist', el);
    if (ah) ah.onclick = () => ui.formModal({ title: t('Record administrative event'), subtitle: esc(c.fullName), fields: [{ key: 'action', label: 'Event', type: 'select', required: true, options: ['Birth registration', 'Marriage registration', 'Divorce recorded', 'Permanent residence updated', 'Temporary residence registered', 'Chip-based ID card issued', 'Name change registration', 'Death registration'] }, { key: 'date', label: 'Date', type: 'date', required: true, max: U.today(), default: U.today() }, { key: 'unit', label: 'Handling unit', required: true, default: GA.ui.dept(GA.app.user.dept).name }, { key: 'ref', label: 'Reference number' }],
      submitLabel: t('Record event'), onSubmit: (v) => { c.history.push(v); c.history.sort((a, b) => a.date.localeCompare(b.date)); S.update('citizens', c.id, { history: c.history }); S.log('Recorded civil status event', c.id, v.action); ui.toast(t('Event recorded.'), 'success'); re(); setTimeout(() => { const b = U.$('[data-tab=hist]', el); if (b) b.click(); }, 0); } });
  }

  GA.modules.citizens = { render(el, params) { if (params[0]) detail(el, params[0]); else list(el); }, edit };
})(window.GA);
