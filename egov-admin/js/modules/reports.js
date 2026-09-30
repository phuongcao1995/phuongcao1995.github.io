/* Reports & statistics: periodic reports per sector with charts, summary tables, CSV export and print. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;

  const REPORTS = [
    { id: 'svc', label: 'Public service delivery', icon: 'file', mod: 'services' },
    { id: 'cp', label: 'Complaints and feedback', icon: 'message', mod: 'complaints' },
    { id: 'tax', label: 'Tax revenue', icon: 'receipt', mod: 'tax' },
    { id: 'reg', label: 'Registers overview', icon: 'database', mod: 'dashboard' },
    { id: 'doc', label: 'Document processing', icon: 'inbox', mod: 'documents' },
  ];

  function build(id) {
    const apps = S.all('applications'), cps = S.all('complaints');
    if (id === 'svc') {
      const bySvc = {}; apps.forEach((a) => { const r = bySvc[a.serviceName] || (bySvc[a.serviceName] = { name: a.serviceName, field: a.field, total: 0, open: 0, done: 0, late: 0 }); r.total++; if (M.OPEN_APP.includes(a.status)) { r.open++; if (a.deadline < U.today()) r.late++; } if (M.DONE_APP.includes(a.status)) r.done++; });
      const rows = Object.values(bySvc).sort((a, b) => b.total - a.total);
      const sm = S.state.stats.svcMonthly;
      return { kpis: [{ label: 'Applications this year (city)', value: U.num(S.state.stats.applicationsYtd), icon: 'file' }, { label: 'On-time completion', value: S.state.stats.onTimeRate + '%', icon: 'checkcircle', color: 'var(--ok)' }, { label: 'Online share (last month)', value: U.pct(sm[sm.length - 1].online, sm[sm.length - 1].online + sm[sm.length - 1].counter) + '%', icon: 'globe' }, { label: 'Citizen satisfaction', value: S.state.stats.satisfaction + '%', icon: 'star', color: 'var(--gold)' }],
        charts: [['Monthly volume by channel', (el) => ui.chart.line(el, { labels: sm.map((m) => M.ml(m.key)), series: [{ name: 'Online', values: sm.map((m) => m.online), area: true }, { name: 'At the counter', values: sm.map((m) => m.counter), color: '#E8A900' }] })], ['Applications by field (register)', (el) => { const g = U.groupCount(apps, 'field'); ui.chart.hbar(el, { items: Object.keys(g).sort((a, b) => g[b] - g[a]).map((k) => ({ label: k, value: g[k] })) }); }]],
        cols: [{ label: 'Service', render: (r) => esc(t(r.name)), csv: (r) => r.name }, { label: 'Field', render: (r) => t(r.field), csv: (r) => r.field }, { label: 'Received', key: 'total', cls: 'right' }, { label: 'In progress', key: 'open', cls: 'right' }, { label: 'Overdue', key: 'late', cls: 'right' }, { label: 'Decided', key: 'done', cls: 'right' }], rows };
    }
    if (id === 'cp') {
      const cats = U.uniq(cps.map((c) => c.category));
      const rows = cats.map((k) => { const x = cps.filter((c) => c.category === k); const r = x.filter((c) => c.feedback); return { name: k, total: x.length, open: x.filter((c) => M.OPEN_CP.includes(c.status)).length, done: x.filter((c) => !M.OPEN_CP.includes(c.status)).length, rating: r.length ? (U.sum(r, (c) => c.feedback.rating) / r.length).toFixed(1) : '—' }; });
      return { kpis: [{ label: 'Total received', value: cps.length, icon: 'message' }, { label: 'Resolved or closed', value: U.pct(cps.filter((c) => !M.OPEN_CP.includes(c.status)).length, cps.length) + '%', icon: 'checkcircle', color: 'var(--ok)' }, { label: 'Open and overdue', value: cps.filter((c) => M.OPEN_CP.includes(c.status) && c.deadline < U.today()).length, icon: 'alert', color: 'var(--red)' }, { label: 'Urgent cases', value: cps.filter((c) => c.priority === 'Urgent').length, icon: 'clock', color: 'var(--gold)' }],
        charts: [['By status', (el) => { const g = U.groupCount(cps, 'status'); ui.chart.donut(el, { items: Object.keys(g).map((k) => ({ label: k, value: g[k] })), centerLabel: 'Complaints' }); }], ['Open and closed by category', (el) => ui.chart.hbar(el, { items: rows.map((r) => ({ label: r.name, parts: [r.open, r.done] })), partNames: ['Open', 'Resolved or closed'], colors: ['#E8A900', '#15703F'] })]],
        cols: [{ label: 'Category', render: (r) => t(r.name), csv: (r) => r.name }, { label: 'Received', key: 'total', cls: 'right' }, { label: 'Open', key: 'open', cls: 'right' }, { label: 'Resolved or closed', key: 'done', cls: 'right' }, { label: 'Average rating', key: 'rating', cls: 'right' }], rows };
    }
    if (id === 'tax') {
      const tr = S.state.taxTrend;
      const rows = tr.map((x) => ({ name: M.ml(x.key), collected: x.collected, target: x.target, rate: U.pct(x.collected, x.target) }));
      return { kpis: [{ label: '12-month collection', value: U.vndShort(U.sum(tr, 'collected')), icon: 'coins', color: 'var(--ok)' }, { label: 'Share of target', value: U.pct(U.sum(tr, 'collected'), U.sum(tr, 'target')) + '%', icon: 'chart' }, { label: 'Outstanding debt (register)', value: U.vndShort(U.sum(S.all('taxpayers'), 'debt')), icon: 'alert', color: 'var(--red)' }, { label: 'Late declarations', value: S.all('declarations').filter((d) => d.status === 'Late').length, icon: 'clock', color: 'var(--gold)' }],
        charts: [['Collected vs target (billion ₫)', (el) => ui.chart.bar(el, { labels: rows.map((r) => r.name), series: [{ name: 'Collected', values: tr.map((x) => Math.round(x.collected / 1e9)) }, { name: 'Monthly target', values: tr.map((x) => Math.round(x.target / 1e9)), color: '#D3E4F7' }], fmt: U.num })], ['Declarations by status', (el) => { const g = U.groupCount(S.all('declarations'), 'status'); ui.chart.donut(el, { items: Object.keys(g).map((k) => ({ label: k, value: g[k] })), centerLabel: 'Declarations' }); }]],
        cols: [{ label: 'Month', key: 'name' }, { label: 'Collected', cls: 'right', render: (r) => U.vnd(r.collected), csv: (r) => r.collected }, { label: 'Target', cls: 'right', render: (r) => U.vnd(r.target), csv: (r) => r.target }, { label: 'Achieved', cls: 'right', render: (r) => `<span class="${r.rate >= 100 ? 'strong' : ''}">${r.rate}%</span>`, csv: (r) => r.rate }], rows };
    }
    if (id === 'reg') {
      const st = S.state.stats;
      const rows = [['Citizens', st.citizens, S.all('citizens').length], ['Businesses', st.businesses, S.all('businesses').length], ['Taxpayers', st.taxpayers, S.all('taxpayers').length], ['Land parcels', st.parcels, S.all('parcels').length], ['Vehicles', st.vehicles, S.all('vehicles').length], ['Social insurance participants', null, S.all('insParticipants').length], ['e-ID accounts', null, S.all('identities').length]].map(([name, city, view]) => ({ name, city, view }));
      const prov = U.groupCount(S.all('citizens'), 'province');
      return { kpis: [{ label: 'Total citizens', value: U.num(st.citizens), icon: 'users' }, { label: 'Registered businesses', value: U.num(st.businesses), icon: 'briefcase' }, { label: 'Land records', value: U.num(st.parcels), icon: 'map' }, { label: 'Registered vehicles', value: U.num(st.vehicles), icon: 'car' }],
        charts: [['Sample citizens by province/city', (el) => ui.chart.donut(el, { items: Object.keys(prov).map((k) => ({ label: k, value: prov[k] })), centerLabel: 'Citizens' })], ['Vehicles by type (register)', (el) => { const g = U.groupCount(S.all('vehicles'), 'type'); ui.chart.hbar(el, { items: Object.keys(g).map((k) => ({ label: k, value: g[k] })) }); }]],
        cols: [{ label: 'Register', render: (r) => t(r.name), csv: (r) => r.name }, { label: 'City total', cls: 'right', render: (r) => (r.city ? U.num(r.city) : '—'), csv: (r) => r.city || '' }, { label: 'Records in this demo', cls: 'right', render: (r) => U.num(r.view), csv: (r) => r.view }], rows };
    }
    const docs = S.all('documents');
    const rows = ['incoming', 'outgoing', 'internal'].map((d) => { const x = docs.filter((y) => y.direction === d); return { name: d, total: x.length, open: x.filter((y) => ['Awaiting receipt', 'Processing', 'Drafting', 'Awaiting signature'].includes(y.status)).length, signed: x.filter((y) => (y.signature || {}).status === 'Valid').length, urgent: x.filter((y) => y.priority !== 'Normal').length }; });
    return { kpis: [{ label: 'Documents in register', value: docs.length, icon: 'inbox' }, { label: 'In progress', value: U.sum(rows, 'open'), icon: 'clock', color: 'var(--gold)' }, { label: 'Digitally signed', value: U.pct(U.sum(rows, 'signed'), docs.length) + '%', icon: 'shield', color: 'var(--ok)' }, { label: 'Urgent or very urgent', value: U.sum(rows, 'urgent'), icon: 'alert', color: 'var(--red)' }],
      charts: [['By document type', (el) => { const g = U.groupCount(docs, 'type'); ui.chart.hbar(el, { items: Object.keys(g).map((k) => ({ label: k, value: g[k] })) }); }], ['By status', (el) => { const g = U.groupCount(docs, 'status'); ui.chart.donut(el, { items: Object.keys(g).map((k) => ({ label: k, value: g[k] })), centerLabel: 'Documents' }); }]],
      cols: [{ label: 'Direction', render: (r) => t({ incoming: 'Incoming', outgoing: 'Outgoing', internal: 'Internal' }[r.name]), csv: (r) => r.name }, { label: 'Total', key: 'total', cls: 'right' }, { label: 'In progress', key: 'open', cls: 'right' }, { label: 'Digitally signed', key: 'signed', cls: 'right' }, { label: 'Urgent', key: 'urgent', cls: 'right' }], rows };
  }

  function render(el, params, q) {
    const app = GA.app;
    const avail = REPORTS.filter((r) => app.canView(r.mod));
    let cur = (avail.find((r) => r.id === q.r) || avail[0]).id;
    const draw = () => {
      const R = REPORTS.find((r) => r.id === cur), d = build(cur);
      el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('Reports & statistics') }], title: t('Reports & statistics'), subtitle: `${esc(S.setting('orgName'))} · ${t('Report generated')} ${U.dateTime(U.nowIso())}`,
        actions: `<button class="btn" id="rp-csv">${icon('download')}${t('Export CSV')}</button><button class="btn btn-primary" onclick="window.print()">${icon('printer')}${t('Print report')}</button>` })}
        <div class="catalog-filters" role="group" aria-label="${t('Report')}">${avail.map((r) => `<button class="chip" data-r="${r.id}" aria-pressed="${r.id === cur}">${t(r.label)}</button>`).join('')}</div>
        <h2 class="mb-1">${t(R.label)}</h2>
        ${ui.kpis(d.kpis, 'compact')}
        <div class="grid g-2">${d.charts.map((c, i) => ui.panel({ title: t(c[0]), body: `<div id="rp-c${i}"></div>` })).join('')}</div>
        ${ui.panel({ title: t('Summary table'), flush: true, cls: 'mt-2', body: ui.simpleTable(d.cols, d.rows) })}
        <p class="xs muted mt-2">${t('City totals are demonstration baselines; detail tables are computed from the records stored in this browser.')}</p>`;
      d.charts.forEach((c, i) => c[1](U.$('#rp-c' + i, el)));
      U.$$('[data-r]', el).forEach((b) => b.onclick = () => { cur = b.dataset.r; draw(); });
      U.$('#rp-csv', el).onclick = () => { U.download(`report-${cur}-${U.today()}.csv`, U.toCSV(d.rows, d.cols.map((c) => ({ label: t(c.label), csv: c.csv || ((r) => r[c.key]) }))), 'text/csv;charset=utf-8'); S.log('Exported report', cur); ui.toast(t('CSV exported.'), 'success'); };
    };
    draw();
  }

  GA.modules.reports = { render };
})(window.GA);
