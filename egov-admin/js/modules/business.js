/* Business registration: enterprise register, details, change history, status changes. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;
  const STATUSES = ['Operating', 'Temporarily suspended', 'Under dissolution', 'Dissolved'];
  const TYPES = ['Single-member LLC', 'Multi-member LLC', 'Joint stock company', 'Private enterprise', 'Partnership', 'Household business'];
  const INDUSTRY = [['5510', 'Short-term accommodation'], ['5610', 'Restaurants and mobile food services'], ['6201', 'Computer programming'], ['4659', 'Wholesale of other machinery and equipment'], ['4933', 'Freight transport by road'], ['4100', 'Construction of buildings'], ['1079', 'Manufacture of other food products'], ['7911', 'Travel agency activities'], ['4711', 'Retail sale in non-specialised stores'], ['0322', 'Freshwater aquaculture']];

  function body(b) {
    const app = GA.app;
    const tp = S.all('taxpayers').find((x) => x.refId === b.id);
    const ins = S.where('insContributions', (x) => x.employerId === b.id);
    const apps = S.where('applications', (a) => a.applicantId === b.id);
    return `<div class="grid g-2"><div>${ui.dl([['Enterprise name', `<strong>${esc(b.name)}</strong>`], ['English name', esc(b.nameEn)], ['Enterprise code / tax code', `<span class="code">${esc(b.code)}</span>`], ['Type', t(b.type)], ['Main industry', `<span class="tag">${esc(b.industryCode)}</span> ${esc(t(b.industry))}`], ['Charter capital', U.vnd(b.capital)], ['Employees', U.num(b.employees)], ['First registered', U.date(b.regDate)]])}</div>
      <div>${ui.dl([['Legal representative', app.canView('citizens') && b.repCitizenId ? `<a href="#/citizens/${b.repCitizenId}">${esc(b.representative)}</a>` : esc(b.representative)], ['Head office', esc(U.address(b))], ['Phone', esc(b.phone)], ['Email', esc(b.email)], ['Status', ui.badge(b.status)], ['Tax status', tp ? `${ui.badge(tp.debt ? 'In debt' : tp.status)}${tp.debt ? ' ' + U.vnd(tp.debt) : ''}` : '—'], ['Social insurance', ins.length ? `${ins[ins.length - 1].employees} ${t('insured employees')} · ${ui.badge(ins[ins.length - 1].status)}` : '—']])}</div></div>
      ${ui.tabs([
        { id: 'h', label: 'Registration history', count: b.history.length, content: ui.timeline(b.history.slice().reverse().map((h) => ({ title: esc(t(h.change)), meta: `${U.date(h.date)} · ${esc(t(h.by))}`, note: h.ref ? `${t('Reference')} <span class="code">${esc(h.ref)}</span>` : '' }))) },
        { id: 'a', label: 'Applications', count: apps.length, content: ui.simpleTable([{ label: 'Application', render: (a) => `<a href="#/services/${a.id}">${esc(t(a.serviceName))}</a><span class="sub code">${esc(a.code)}</span>` }, { label: 'Submitted', render: (a) => U.date(a.submittedAt) }, { label: 'Status', render: (a) => ui.badge(a.status) }], apps, 'No applications.') },
      ], { cls: 'mt-2' })}`;
  }

  function changeStatus(b, status, refresh) {
    const labels = { 'Temporarily suspended': 'Register temporary suspension', Operating: 'Register resumption of business', 'Under dissolution': 'Start dissolution', Dissolved: 'Register dissolution' };
    ui.confirm({ title: t(labels[status]), message: t('{n} ({c}) will change to {s}.', { n: esc(b.name), c: b.code, s: t(status) }), input: t('Legal basis / notice number'), required: true, danger: status === 'Dissolved', confirmLabel: t('Confirm') }).then((r) => {
      if (!r) return;
      b.history.push({ date: U.today(), change: labels[status], ref: String(r).slice(0, 40), by: 'Business Registration Office' });
      S.update('businesses', b.id, { status, history: b.history });
      const tp = S.all('taxpayers').find((x) => x.refId === b.id);
      if (tp) S.update('taxpayers', tp.id, { status: status === 'Dissolved' ? 'Closed' : status === 'Operating' ? 'Active' : 'Suspended' });
      S.log('Changed enterprise status', b.id, status); ui.toast(t('Status updated.'), 'success'); refresh();
    });
  }

  function edit(b, refresh) {
    const isNew = !b;
    const fields = [
      { key: 'name', label: 'Enterprise name (Vietnamese)', required: true, full: true, placeholder: 'CÔNG TY TNHH …' },
      { key: 'nameEn', label: 'English name', full: true },
      { key: 'type', label: 'Enterprise type', type: 'select', required: true, options: TYPES },
      { key: 'industryCode', label: 'Main industry (VSIC)', type: 'select', required: true, options: INDUSTRY.map((i) => ({ value: i[0], label: `${i[0]} ${t(i[1])}` })) },
      { key: 'capital', label: 'Charter capital (₫)', type: 'number', required: true, min: 1000000 },
      { key: 'employees', label: 'Employees', type: 'number', min: 0, default: 1 },
      { key: 'repCitizenId', label: 'Legal representative', type: 'select', required: true, options: S.all('citizens').filter((c) => c.status === 'Active' && U.age(c.dob) >= 18).map((c) => ({ value: c.id, label: c.fullName + ' · ' + c.cid })) },
      { key: 'phone', label: 'Phone', required: true, validate: (v) => (/^0\d{9}$/.test(v.replace(/\s/g, '')) ? '' : t('Enter a 10-digit Vietnamese phone number starting with 0.')) },
      { key: 'email', label: 'Email', type: 'email' },
    ].concat(M.addressFields());
    ui.formModal({ title: isNew ? t('Register new enterprise') : t('Register change of details'), subtitle: isNew ? t('Enterprise code is issued automatically') : esc(b.name), size: 'xl', fields, values: b ? U.clone(b) : { province: 'Da Nang City', type: 'Single-member LLC' }, submitLabel: isNew ? t('Register enterprise') : t('Register change'),
      onSubmit: (v) => {
        const rep = S.find('citizens', v.repCitizenId), ind = INDUSTRY.find((i) => i[0] === v.industryCode);
        Object.assign(v, { representative: rep.fullName, industry: ind ? ind[1] : v.industryCode });
        if (isNew) {
          const p = GA.data.PROVINCES.find((x) => x.name === v.province) || GA.data.PROVINCES[0];
          let code; do { code = p.mst + String(Math.floor(Math.random() * 1e8)).padStart(8, '0'); } while (S.all('businesses').some((x) => x.code === code));
          const rec = Object.assign({ id: S.nextId('businesses', 'BUS-'), code, regDate: U.today(), status: 'Operating', history: [{ date: U.today(), change: 'First registration, enterprise registration certificate issued', ref: 'ĐKDN-' + code, by: 'Business Registration Office' }], createdAt: U.nowIso() }, v);
          S.insert('businesses', rec);
          S.insert('taxpayers', { id: S.nextId('taxpayers', 'TP-'), mst: code, name: rec.name, type: rec.type === 'Household business' ? 'Household' : 'Business', refId: rec.id, taxOffice: p.name === 'Da Nang City' ? 'Da Nang City Tax Department' : p.name + ' Tax Department', status: 'Active', method: 'Credit method (VAT)', industry: rec.industry, debt: 0, debtDays: 0, address: U.address(rec), registeredAt: U.today() });
          S.log('Registered enterprise', rec.id, rec.name); ui.toast(t('Enterprise registered. Code {c} also serves as the tax code.', { c: code }), 'success');
        } else {
          const ch = ['name', 'type', 'industryCode', 'capital', 'repCitizenId', 'street', 'ward', 'province'].filter((k) => String(v[k]) !== String(b[k]));
          if (!ch.length) { S.update('businesses', b.id, v); ui.toast(t('Contact details updated.'), 'success'); refresh(); return; }
          b.history.push({ date: U.today(), change: 'Change registered: ' + ch.map((k) => ({ name: 'name', type: 'enterprise type', industryCode: 'main industry', capital: 'charter capital', repCitizenId: 'legal representative', street: 'head office', ward: 'head office', province: 'head office' }[k])).filter((x, i, a) => a.indexOf(x) === i).join(', '), ref: 'TĐ-' + Date.now().toString().slice(-5), by: 'Business Registration Office' });
          S.update('businesses', b.id, Object.assign(v, { history: b.history })); S.log('Registered enterprise change', b.id, ch.join(', ')); ui.toast(t('Change registered.'), 'success');
        }
        refresh();
      } });
  }

  function modal(b, refresh) {
    const can = GA.app.can('edit', 'business');
    const acts = [{ label: t('Close') }];
    if (can && b.status !== 'Dissolved') {
      if (b.status === 'Operating') acts.push({ label: t('Suspend'), left: true, onClick: (m) => { m.close(); changeStatus(b, 'Temporarily suspended', refresh); } }, { label: t('Start dissolution'), left: true, onClick: (m) => { m.close(); changeStatus(b, 'Under dissolution', refresh); } });
      if (b.status === 'Temporarily suspended') acts.push({ label: t('Resume operations'), onClick: (m) => { m.close(); changeStatus(b, 'Operating', refresh); } });
      if (b.status === 'Under dissolution') acts.push({ label: t('Register dissolution'), variant: 'danger', onClick: (m) => { m.close(); changeStatus(b, 'Dissolved', refresh); } });
      acts.push({ label: t('Register change'), variant: 'primary', icon: 'edit', onClick: (m) => { m.close(); edit(b, refresh); } });
    }
    ui.modal({ title: esc(b.name), subtitle: `${t('Enterprise code')} <span class="code">${esc(b.code)}</span> · ${t(b.type)}`, size: 'xl', body: body(b), actions: acts, onOpen: (m) => ui.bindTabs(m.el) });
  }

  function portal(el) {
    const bs = M.scoped('businesses');
    const b = bs.find((x) => x.id === GA.app.user.businessId) || bs[0];
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('My enterprise') }], title: t('My enterprise'), subtitle: t('Registration details from the National Business Registration Portal (demo)'), actions: b ? `<button class="btn btn-primary" id="bz-ch">${icon('edit')}${t('Request change of details')}</button>` : '' })}
      ${b ? M.detailHead({ lead: `<span class="l-ic" style="width:48px;height:48px">${icon('briefcase', 'i-lg')}</span>`, title: `${esc(b.name)} ${ui.badge(b.status)}`, meta: [`${t('Enterprise code')} <span class="code">${esc(b.code)}</span>`, t(b.type), `${t('Registered')} ${U.date(b.regDate)}`] }) + `<div class="panel mt-2"><div class="panel-body">${body(b)}</div></div>` : ui.empty('No enterprise is linked to your account.')}`;
    const ch = U.$('#bz-ch', el); if (ch) ch.onclick = () => GA.modules.services.startApplication('SV16');
  }

  function render(el, params, q) {
    if (GA.app.portal) return portal(el);
    const can = GA.app.can('edit', 'business');
    const all = S.all('businesses');
    const refresh = () => render(el, params, {});
    const gc = U.groupCount(all, 'status');
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('Business registration') }], title: t('Business registration'), subtitle: t('Business Registration Office, Department of Finance · enterprises and household businesses'), actions: can ? `<button class="btn btn-primary" id="bz-new">${icon('plus')}${t('Register enterprise')}</button>` : '' })}
      ${ui.kpis([
        { label: 'Registered businesses (city)', value: U.num(S.state.stats.businesses), meta: `${all.length} ${t('in register view')}`, icon: 'briefcase' },
        { label: 'Operating', value: gc.Operating || 0, icon: 'checkcircle', color: 'var(--ok)' },
        { label: 'Temporarily suspended', value: gc['Temporarily suspended'] || 0, icon: 'clock', color: 'var(--gold)' },
        { label: 'Under dissolution or dissolved', value: (gc['Under dissolution'] || 0) + (gc.Dissolved || 0), icon: 'x', color: 'var(--red)' },
      ], 'compact')}
      <div class="grid g-main"><div class="panel"><div class="panel-body flush" id="bz-t"></div></div>${ui.panel({ title: t('Enterprises by type'), body: '<div id="bz-c1"></div>' })}</div>`;
    ui.table(U.$('#bz-t', el), { rows: () => S.all('businesses'), exportName: 'businesses', searchKeys: ['name', 'nameEn', 'code', 'representative', 'industry'], searchPlaceholder: t('Search by name, enterprise code, representative or industry'),
      filters: [{ key: 'type', label: 'Type', all: 'All types', options: () => U.uniq(S.all('businesses').map((b) => b.type)) }, { key: 'status', label: 'Status', all: 'All statuses', options: STATUSES }, { key: 'province', label: 'Province/City', all: 'All provinces', options: () => U.uniq(S.all('businesses').map((b) => b.province)) }],
      dateKey: 'regDate', dateLabel: 'Registered from', defaultSort: 'regDate',
      columns: [
        { key: 'name', label: 'Enterprise', render: (b) => `<span class="strong">${esc(b.name)}</span><span class="sub">${esc(b.nameEn)}</span>` },
        { key: 'code', label: 'Enterprise code', cls: 'code', csv: (b) => "'" + b.code },
        { key: 'type', label: 'Type', render: (b) => `<span class="small">${t(b.type)}</span>` },
        { key: 'representative', label: 'Legal representative' },
        { key: 'industry', label: 'Industry', render: (b) => `<span class="small">${esc(t(b.industry))}</span><span class="sub">${esc(b.industryCode)}</span>` },
        { key: 'regDate', label: 'Registered', render: (b) => U.date(b.regDate) },
        { key: 'status', label: 'Status', render: (b) => ui.badge(b.status) },
      ],
      onRowClick: (b) => modal(b, refresh), rowActions: () => [{ id: 'v', label: 'View', icon: 'eye' }].concat(can ? [{ id: 'e', label: 'Register change', icon: 'edit' }] : []), onAction: (id, b) => (id === 'v' ? modal(b, refresh) : edit(b, refresh)) });
    const tc = U.groupCount(all, 'type');
    ui.chart.donut(U.$('#bz-c1', el), { items: Object.keys(tc).map((k) => ({ label: k, value: tc[k] })), centerLabel: 'Enterprises' });
    const nb = U.$('#bz-new', el); if (nb) nb.onclick = () => edit(null, refresh);
    M.openFromQuery(q, 'businesses', (b) => modal(b, refresh));
  }

  GA.modules.business = { render };
})(window.GA);
