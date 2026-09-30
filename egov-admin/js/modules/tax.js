/* Tax administration: taxpayers, declarations, payments, debt/obligations and reports. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;
  const CHANNELS = ['Online banking', 'Tax e-portal', 'State Treasury counter', 'Mobile payment'];
  const FORMS = { Business: [['01/GTGT', 'VAT return'], ['03/TNDN', 'Corporate income tax finalisation'], ['05/KK-TNCN', 'PIT withholding return']], Household: [['01/CNKD', 'Household business tax return']], Individual: [['02/QTT-TNCN', 'Personal income tax finalisation']] };
  const debtBadge = (x) => (x.debt ? `${ui.badge(x.debtDays > 90 ? 'Overdue' : 'In debt', x.debtDays > 90 ? 'Over 90 days' : 'In debt')}<span class="sub">${U.vnd(x.debt)} · ${x.debtDays} ${t('days')}</span>` : ui.badge('Paid', 'No debt'));

  function recordPayment(tp, done) {
    const app = GA.app;
    ui.formModal({ title: app.portal ? t('Pay tax online') : t('Record tax payment'), subtitle: esc(tp.name) + ' · ' + t('Tax code') + ' ' + esc(tp.mst), size: '',
      intro: tp.debt ? `<div class="callout warn mb-2">${icon('alert')}<div>${t('Outstanding debt')}: <strong>${U.vnd(tp.debt)}</strong> (${tp.debtDays} ${t('days')}). ${t('Late payment interest of 0.03% per day applies.')}</div></div>` : '',
      fields: [
        { key: 'taxType', label: 'Tax type', type: 'select', required: true, options: ['Value added tax', 'Corporate income tax', 'Personal income tax', 'Household business tax', 'Licence fee', 'Late payment interest'], default: tp.type === 'Individual' ? 'Personal income tax' : tp.type === 'Household' ? 'Household business tax' : 'Value added tax' },
        { key: 'amount', label: 'Amount (₫)', type: 'number', required: true, min: 1000, default: tp.debt || '' },
        { key: 'channel', label: 'Payment channel', type: 'select', required: true, noBlank: true, options: app.portal ? ['Online banking', 'Mobile payment'] : CHANNELS },
        { key: 'date', label: 'Payment date', type: 'date', required: true, default: U.today(), max: U.today() },
      ],
      submitLabel: app.portal ? t('Pay now') : t('Record payment'),
      onSubmit: (v) => {
        const rec = { id: S.nextId('taxPayments', 'PM-', 5), taxpayerId: tp.id, taxpayerName: tp.name, mst: tp.mst, date: v.date, amount: v.amount, taxType: v.taxType, channel: v.channel, ref: 'GNT' + Date.now().toString().slice(-10), status: 'Completed' };
        S.insert('taxPayments', rec);
        const debt = Math.max(0, tp.debt - v.amount);
        S.update('taxpayers', tp.id, { debt, debtDays: debt ? tp.debtDays : 0 });
        S.log('Recorded tax payment', rec.id, `${tp.mst} ${U.vnd(v.amount)}`);
        if (!app.portal) S.notify({ audience: tp.refId, title: 'Tax payment received', body: `${U.vnd(v.amount)} (${v.taxType}), reference ${rec.ref}.`, type: 'success', link: '#/tax' });
        ui.toast(t('Payment {ref} recorded.', { ref: rec.ref }) + (debt ? ' ' + t('Remaining debt: {d}', { d: U.vnd(debt) }) : ''), 'success');
        if (done) done();
      } });
  }

  function declare(tp, done) {
    const forms = FORMS[tp.type] || FORMS.Business;
    ui.formModal({ title: t('Submit tax declaration'), subtitle: esc(tp.name) + ' · ' + esc(tp.mst), size: '',
      fields: [
        { key: 'form', label: 'Declaration form', type: 'select', required: true, options: forms.map((f) => ({ value: f[0], label: `${f[0]} ${t(f[1])}` })) },
        { key: 'period', label: 'Tax period', required: true, placeholder: 'e.g. 08/2026 or Q3/2026', pattern: '^(\\d{2}/\\d{4}|Q[1-4]/\\d{4}|\\d{4})$', patternMsg: 'Use MM/YYYY, Q1/YYYY or YYYY.' },
        { key: 'amount', label: 'Tax payable (₫)', type: 'number', required: true, min: 0 },
        { key: 'sign', label: 'Sign with digital certificate (USB token / remote signing)', type: 'checkbox', required: true, full: true, validate: (v) => (v ? '' : t('The declaration must be digitally signed.')) },
      ],
      submitLabel: t('Sign and submit'),
      onSubmit: (v) => {
        if (!v.sign) { ui.toast(t('The declaration must be digitally signed.'), 'error'); return false; }
        const f = forms.find((x) => x[0] === v.form);
        const rec = { id: S.nextId('declarations', 'DC-', 5), taxpayerId: tp.id, taxpayerName: tp.name, mst: tp.mst, form: f[0], formName: f[1], period: v.period, dueDate: U.addDays(U.today(), 5), submittedAt: U.today(), amount: v.amount, status: 'Pending review' };
        S.insert('declarations', rec); S.log('Submitted tax declaration', rec.id, f[0] + ' ' + v.period);
        if (v.amount) S.update('taxpayers', tp.id, { debt: tp.debt + v.amount, debtDays: tp.debtDays || 1 });
        S.notify({ audience: 'staff', title: 'New tax declaration', body: `${tp.name}: ${f[0]} ${v.period}`, link: '#/tax?tab=decl' });
        ui.toast(t('Declaration {f} for {p} submitted. Acknowledgement sent by email.', { f: f[0], p: v.period }), 'success');
        if (done) done();
      } });
  }

  function taxpayerModal(tp, refresh) {
    const app = GA.app, canEdit = app.can('edit', 'tax') || app.portal;
    const decl = S.where('declarations', (d) => d.taxpayerId === tp.id);
    const pay = S.where('taxPayments', (p) => p.taxpayerId === tp.id);
    const link = tp.type === 'Individual' ? (app.canView('citizens') ? `<a href="#/citizens/${tp.refId}">${t('Open citizen profile')}</a>` : '') : (app.canView('business') ? `<a href="#/business?id=${tp.refId}">${t('Open business registration')}</a>` : '');
    const acts = [{ label: t('Close') }];
    if (canEdit && tp.status !== 'Closed') {
      acts.push({ label: t('Submit declaration'), icon: 'file', onClick: (m) => { m.close(); declare(tp, refresh); } });
      acts.push({ label: t(app.portal ? 'Pay tax' : 'Record payment'), variant: 'primary', icon: 'coins', onClick: (m) => { m.close(); recordPayment(tp, refresh); } });
      if (!app.portal && tp.debt) acts.splice(1, 0, { label: t('Send debt reminder'), icon: 'send', left: true, onClick: (m) => { S.notify({ audience: tp.refId, title: 'Tax debt reminder', body: `Outstanding ${U.vnd(tp.debt)} for ${tp.debtDays} days. Please pay to avoid enforcement.`, type: 'warning', link: '#/tax' }); S.log('Sent tax debt reminder', tp.id, U.vnd(tp.debt)); m.close(); ui.toast(t('Reminder sent to {n}.', { n: esc(tp.name) }), 'success'); } });
    }
    ui.modal({ title: esc(tp.name), subtitle: `${t('Tax code')} <span class="code">${esc(tp.mst)}</span> · ${t(tp.type)}`, size: 'xl', actions: acts,
      body: `<div class="grid g-2"><div>${ui.dl([['Tax code', `<span class="code">${esc(tp.mst)}</span>`], ['Taxpayer type', ui.badge(tp.type)], ['Status', ui.badge(tp.status)], ['Managing tax office', esc(tp.taxOffice)], ['Tax method', t(tp.method)], ['Industry / occupation', esc(t(tp.industry))], ['Registered', U.date(tp.registeredAt)], ['Address', esc(tp.address)], ['Linked record', link]])}</div>
        <div>${ui.kpis([{ label: 'Outstanding debt', value: U.vndShort(tp.debt), meta: tp.debt ? `${tp.debtDays} ${t('days overdue')}` : t('No debt'), icon: 'alert', color: tp.debt ? 'var(--red)' : 'var(--ok)' }, { label: 'Paid (register)', value: U.vndShort(U.sum(pay, 'amount')), meta: `${pay.length} ${t('payments')}`, icon: 'coins', color: 'var(--ok)' }], 'compact')}
          ${tp.debtDays > 90 ? `<div class="callout bad">${icon('alert')}<div>${t('Debt over 90 days. Enforcement measures may be applied under the Law on Tax Administration.')}</div></div>` : ''}</div></div>
        ${ui.tabs([
          { id: 'd', label: 'Declarations', count: decl.length, content: ui.simpleTable([{ label: 'Form', render: (d) => `<strong>${esc(d.form)}</strong><span class="sub">${esc(t(d.formName))}</span>` }, { label: 'Period', key: 'period' }, { label: 'Due date', render: (d) => U.date(d.dueDate) }, { label: 'Submitted', render: (d) => U.date(d.submittedAt) }, { label: 'Amount', cls: 'right', render: (d) => U.vnd(d.amount) }, { label: 'Status', render: (d) => ui.badge(d.status) }], decl, 'No declarations.') },
          { id: 'p', label: 'Payment history', count: pay.length, content: ui.simpleTable([{ label: 'Date', render: (p) => U.date(p.date) }, { label: 'Tax type', render: (p) => t(p.taxType) }, { label: 'Channel', render: (p) => t(p.channel) }, { label: 'Reference', cls: 'code', key: 'ref' }, { label: 'Amount', cls: 'right', render: (p) => U.vnd(p.amount) }, { label: 'Status', render: (p) => ui.badge(p.status) }], pay, 'No payments recorded.') },
        ], { cls: 'mt-2' })}`,
      onOpen: (m) => ui.bindTabs(m.el) });
  }

  const next20 = () => { const d = new Date(); if (d.getDate() > 20) d.setMonth(d.getMonth() + 1); d.setDate(20); return U.isoDate(d); };

  function render(el, params, q) {
    const app = GA.app, portal = app.portal, canEdit = app.can('edit', 'tax');
    const tps = M.scoped('taxpayers'), decl = M.scoped('declarations'), pays = M.scoped('taxPayments');
    const trend = S.state.taxTrend;
    const ytd = U.sum(trend.filter((x) => x.key.slice(0, 4) === U.today().slice(0, 4)), 'collected');
    const debtors = tps.filter((x) => x.debt > 0);
    const refresh = () => render(el, params, Object.assign({}, q, { tab: currentTab, id: '' }));
    let currentTab = q.tab || 'tp';
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t(portal ? 'My tax account' : 'Tax administration') }], title: t(portal ? 'My tax account' : 'Tax administration'), subtitle: portal ? t('Declarations, obligations and payments for your enterprise') : t('Da Nang City Tax Department · taxpayer register, declarations, payments and debt'),
      actions: portal && tps[0] ? `<button class="btn" id="tx-decl">${icon('file')}${t('Submit declaration')}</button><button class="btn btn-primary" id="tx-pay">${icon('coins')}${t('Pay tax')}</button>` : canEdit ? `<button class="btn btn-primary" id="tx-pay">${icon('coins')}${t('Record payment')}</button>` : '' })}
      ${ui.kpis(portal ? [
        { label: 'Tax payable', value: U.vnd(U.sum(tps, 'debt')), icon: 'alert', color: 'var(--red)' },
        { label: 'Declarations submitted', value: decl.length, icon: 'file' },
        { label: 'Paid this year', value: U.vndShort(U.sum(pays.filter((p) => p.date.slice(0, 4) === U.today().slice(0, 4)), 'amount')), icon: 'coins', color: 'var(--ok)' },
        { label: 'Next due date', value: U.date(next20()), meta: t('Monthly VAT return'), icon: 'calendar', color: 'var(--gold)' },
      ] : [
        { label: 'Taxpayers (city)', value: U.num(S.state.stats.taxpayers), meta: `${tps.length} ${t('in register view')}`, icon: 'users' },
        { label: 'Collected this year', value: U.vndShort(ytd), meta: `${U.pct(ytd, trend[0].target * trend.filter((x) => x.key.slice(0, 4) === U.today().slice(0, 4)).length)}% ${t('of target to date')}`, icon: 'coins', color: 'var(--ok)' },
        { label: 'Outstanding tax debt', value: U.vndShort(U.sum(debtors, 'debt')), meta: `${debtors.length} ${t('taxpayers')} · ${debtors.filter((x) => x.debtDays > 90).length} ${t('over 90 days')}`, icon: 'alert', color: 'var(--red)' },
        { label: 'Declarations to review', value: decl.filter((d) => d.status === 'Pending review').length, meta: `${decl.filter((d) => d.status === 'Late').length} ${t('filed late')}`, icon: 'file', color: 'var(--gold)' },
      ], 'compact')}
      ${ui.tabs([
        { id: 'tp', label: portal ? 'Tax registration' : 'Taxpayers', icon: 'users', count: tps.length, content: '<div class="panel"><div class="panel-body flush" id="tx-tp"></div></div>' },
        { id: 'decl', label: 'Declarations', icon: 'file', count: decl.length, content: '<div class="panel"><div class="panel-body flush" id="tx-decl-t"></div></div>' },
        { id: 'pay', label: 'Payments', icon: 'coins', count: pays.length, content: '<div class="panel"><div class="panel-body flush" id="tx-pay-t"></div></div>' },
        { id: 'debt', label: 'Obligations and debt', icon: 'alert', count: debtors.length, content: '<div class="panel"><div class="panel-body flush" id="tx-debt"></div></div>' },
        portal ? null : { id: 'rep', label: 'Tax reports', icon: 'chart', content: `<div class="grid g-main">${ui.panel({ title: t('Monthly budget revenue'), sub: t('Collected vs target, billion ₫'), body: '<div id="tx-c1"></div>' })}${ui.panel({ title: t('Debt by taxpayer type'), body: '<div id="tx-c2"></div>' })}</div><div class="grid g-2 mt-2">${ui.panel({ title: t('Largest debtors'), body: '<div id="tx-c3"></div>' })}${ui.panel({ title: t('Payments by channel'), body: '<div id="tx-c4"></div>' })}</div>` },
      ].filter(Boolean), { cls: 'page-tabs', active: currentTab, id: 'txtabs' })}`;

    const tpCols = [
      { key: 'name', label: 'Taxpayer', render: (x) => `<span class="strong">${esc(x.name)}</span><span class="sub">${esc(t(x.industry))}</span>` },
      { key: 'mst', label: 'Tax code', cls: 'code', csv: (x) => "'" + x.mst },
      { key: 'type', label: 'Type', render: (x) => ui.badge(x.type) },
      { key: 'taxOffice', label: 'Tax office', render: (x) => `<span class="small">${esc(x.taxOffice)}</span>` },
      { key: 'debt', label: 'Debt status', render: debtBadge, csv: (x) => x.debt },
      { key: 'status', label: 'Status', render: (x) => ui.badge(x.status) },
    ];
    ui.table(U.$('#tx-tp', el), { rows: () => M.scoped('taxpayers'), columns: tpCols, exportName: 'taxpayers', searchKeys: ['name', 'mst', 'address', 'industry'], searchPlaceholder: t('Search by name, tax code or address'),
      filters: [{ key: 'type', label: 'Type', all: 'All types', options: ['Business', 'Household', 'Individual'] }, { key: 'status', label: 'Status', all: 'All statuses', options: ['Active', 'Suspended', 'Closed'] }, { key: 'debt', label: 'Debt', all: 'Any debt status', options: [{ value: 'yes', label: t('In debt') }, { value: 'no', label: t('No debt') }, { value: '90', label: t('Over 90 days') }], match: (x, v) => (v === 'yes' ? x.debt > 0 : v === 'no' ? !x.debt : x.debtDays > 90) }],
      defaultSort: 'debt', onRowClick: (x) => taxpayerModal(x, refresh), rowActions: (x) => [{ id: 'v', label: 'View', icon: 'eye' }].concat((canEdit || portal) && x.status !== 'Closed' ? [{ id: 'p', label: portal ? 'Pay tax' : 'Record payment', icon: 'coins' }] : []),
      onAction: (id, x) => (id === 'v' ? taxpayerModal(x, refresh) : recordPayment(x, refresh)) });

    ui.table(U.$('#tx-decl-t', el), { rows: () => M.scoped('declarations'), exportName: 'tax-declarations', searchKeys: ['taxpayerName', 'mst', 'form', 'period'], searchPlaceholder: t('Search by taxpayer, tax code or form'),
      filters: [{ key: 'status', label: 'Status', all: 'All statuses', options: ['Accepted', 'Pending review', 'Amended', 'Late'] }, { key: 'form', label: 'Form', all: 'All forms', options: () => U.uniq(S.all('declarations').map((d) => d.form)) }],
      dateKey: 'submittedAt', dateLabel: 'Submitted from', defaultSort: 'submittedAt',
      columns: [{ key: 'taxpayerName', label: 'Taxpayer', render: (d) => `<span class="strong">${esc(d.taxpayerName)}</span><span class="sub code">${esc(d.mst)}</span>` }, { key: 'form', label: 'Form', render: (d) => `${esc(d.form)}<span class="sub">${esc(t(d.formName))}</span>` }, { key: 'period', label: 'Period' }, { key: 'dueDate', label: 'Due date', render: (d) => U.date(d.dueDate) }, { key: 'submittedAt', label: 'Submitted', render: (d) => U.date(d.submittedAt) }, { key: 'amount', label: 'Tax payable', cls: 'right', render: (d) => U.vnd(d.amount), csv: (d) => d.amount }, { key: 'status', label: 'Status', render: (d) => ui.badge(d.status) }],
      rowActions: (d) => (canEdit && d.status === 'Pending review' ? [{ id: 'ok', label: 'Accept declaration', icon: 'check' }, { id: 'am', label: 'Request amendment', icon: 'edit' }] : []),
      onAction: async (id, d, dt) => {
        if (id === 'ok') { S.update('declarations', d.id, { status: 'Accepted' }); S.log('Accepted tax declaration', d.id); ui.toast(t('Declaration accepted.'), 'success'); }
        if (id === 'am') { const r = await ui.confirm({ title: t('Request amendment'), message: t('Ask {n} to file a supplementary declaration.', { n: esc(d.taxpayerName) }), input: t('Reason'), required: true, confirmLabel: t('Send request') }); if (!r) return; S.update('declarations', d.id, { status: 'Amended' }); const tp = S.find('taxpayers', d.taxpayerId); if (tp) S.notify({ audience: tp.refId, title: 'Supplementary declaration requested', body: `${d.form} ${d.period}: ${r}`, type: 'warning', link: '#/tax' }); ui.toast(t('Amendment requested.'), 'success'); }
        dt.refresh();
      } });

    ui.table(U.$('#tx-pay-t', el), { rows: () => M.scoped('taxPayments'), exportName: 'tax-payments', searchKeys: ['taxpayerName', 'mst', 'ref'], searchPlaceholder: t('Search by taxpayer, tax code or reference'),
      filters: [{ key: 'channel', label: 'Channel', all: 'All channels', options: CHANNELS }, { key: 'status', label: 'Status', all: 'All statuses', options: ['Completed', 'Pending'] }], dateKey: 'date', dateLabel: 'Paid from', defaultSort: 'date',
      columns: [{ key: 'date', label: 'Date', render: (p) => U.date(p.date) }, { key: 'taxpayerName', label: 'Taxpayer', render: (p) => `${esc(p.taxpayerName)}<span class="sub code">${esc(p.mst)}</span>` }, { key: 'taxType', label: 'Tax type', render: (p) => t(p.taxType) }, { key: 'channel', label: 'Channel', render: (p) => t(p.channel) }, { key: 'ref', label: 'Payment reference', cls: 'code' }, { key: 'amount', label: 'Amount', cls: 'right', render: (p) => U.vnd(p.amount), csv: (p) => p.amount }, { key: 'status', label: 'Status', render: (p) => ui.badge(p.status) }] });

    ui.table(U.$('#tx-debt', el), { rows: () => M.scoped('taxpayers').filter((x) => x.debt > 0), exportName: 'tax-debt', searchKeys: ['name', 'mst'], searchPlaceholder: t('Search debtors'), defaultSort: 'debtDays',
      filters: [{ key: 'age', label: 'Debt age', all: 'Any age', options: [{ value: '30', label: t('Up to 30 days') }, { value: '90', label: t('31 to 90 days') }, { value: '91', label: t('Over 90 days') }], match: (x, v) => (v === '30' ? x.debtDays <= 30 : v === '90' ? x.debtDays > 30 && x.debtDays <= 90 : x.debtDays > 90) }],
      columns: [{ key: 'name', label: 'Taxpayer', render: (x) => `<span class="strong">${esc(x.name)}</span><span class="sub code">${esc(x.mst)}</span>` }, { key: 'type', label: 'Type', render: (x) => t(x.type) }, { key: 'debt', label: 'Outstanding', cls: 'right', render: (x) => `<strong>${U.vnd(x.debt)}</strong>`, csv: (x) => x.debt }, { key: 'debtDays', label: 'Days overdue', cls: 'right', render: (x) => `<span class="${x.debtDays > 90 ? 'overdue' : ''}">${x.debtDays}</span>` }, { key: 'interest', label: 'Est. late interest', cls: 'right', sort: (x) => x.debt * x.debtDays, render: (x) => U.vnd(x.debt * 0.0003 * x.debtDays), csv: (x) => Math.round(x.debt * 0.0003 * x.debtDays) }, { key: 'stage', label: 'Enforcement stage', sort: 'debtDays', render: (x) => ui.badge(x.debtDays > 90 ? 'Overdue' : x.debtDays > 30 ? 'Due soon' : 'Pending', x.debtDays > 90 ? 'Enforcement notice' : x.debtDays > 30 ? 'Reminder sent' : 'Monitoring') }],
      onRowClick: (x) => taxpayerModal(x, refresh) });

    if (!portal) {
      ui.chart.bar(U.$('#tx-c1', el), { labels: trend.map((x) => M.ml(x.key)), series: [{ name: 'Collected', values: trend.map((x) => Math.round(x.collected / 1e9)), color: '#0B5CAD' }, { name: 'Monthly target', values: trend.map((x) => Math.round(x.target / 1e9)), color: '#D3E4F7' }], fmt: U.num, tipFmt: (v) => U.num(v) + ' tỷ ₫' });
      ui.chart.donut(U.$('#tx-c2', el), { items: ['Business', 'Household', 'Individual'].map((k, i) => ({ label: k, value: Math.round(U.sum(tps.filter((x) => x.type === k), 'debt') / 1e6), color: ['#0B5CAD', '#E8A900', '#0A8C8C'][i] })), centerLabel: 'million ₫' });
      ui.chart.hbar(U.$('#tx-c3', el), { items: debtors.slice().sort((a, b) => b.debt - a.debt).slice(0, 8).map((x) => ({ label: x.name, value: x.debt, color: x.debtDays > 90 ? '#C62828' : '#0B5CAD' })), fmt: U.vndShort });
      const byCh = U.groupCount(pays, 'channel');
      ui.chart.hbar(U.$('#tx-c4', el), { items: Object.keys(byCh).map((k) => ({ label: k, value: U.sum(pays.filter((p) => p.channel === k), 'amount') })), fmt: U.vndShort });
    }
    const tp0 = tps.find((x) => x.status !== 'Closed');
    const pb = U.$('#tx-pay', el);
    if (pb) pb.onclick = () => {
      if (portal) return recordPayment(tp0, refresh);
      ui.formModal({ title: t('Record tax payment'), subtitle: t('Choose the taxpayer'), size: '', fields: [{ key: 'tp', label: 'Taxpayer', type: 'select', required: true, options: S.all('taxpayers').filter((x) => x.status !== 'Closed').map((x) => ({ value: x.id, label: `${x.name} · ${x.mst}${x.debt ? ' · ' + U.vnd(x.debt) : ''}` })) }], submitLabel: t('Continue'), onSubmit: (v) => { setTimeout(() => recordPayment(S.find('taxpayers', v.tp), refresh), 0); } });
    };
    const db = U.$('#tx-decl', el); if (db) db.onclick = () => declare(tp0, refresh);
    ui.bindTabs(el, (id) => { currentTab = id; });
    M.openFromQuery(q, 'taxpayers', (x) => taxpayerModal(x, refresh));
  }

  GA.modules.tax = { render };
})(window.GA);
