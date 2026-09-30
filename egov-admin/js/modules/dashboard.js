/* Dashboard: city-wide administration overview for staff; personal portal home for citizens and businesses. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;

  function staff(el) {
    const app = GA.app, st = S.state.stats;
    const apps = S.all('applications'), cps = S.all('complaints'), docs = S.all('documents');
    const pending = apps.filter((a) => M.OPEN_APP.includes(a.status));
    const overdue = pending.filter((a) => a.deadline < U.today());
    const openCp = cps.filter((c) => M.OPEN_CP.includes(c.status));
    const incoming = docs.filter((d) => d.direction === 'incoming');
    const month = st.svcMonthly[st.svcMonthly.length - 1], prev = st.svcMonthly[st.svcMonthly.length - 2];
    const growth = U.pct(month.online + month.counter - prev.online - prev.counter, prev.online + prev.counter);
    const link = (m, h) => (app.canView(m) ? h : undefined);
    const kpis = [
      { label: 'Total citizens', value: U.num(st.citizens), meta: t('Residents on the population register'), icon: 'users', href: link('citizens', '#/citizens') },
      { label: 'Online service applications', value: U.num(st.applicationsYtd), meta: `<span class="${growth >= 0 ? 'up' : 'down'}">${growth >= 0 ? '+' : ''}${growth}%</span> ${t('vs last month')}`, icon: 'file', href: link('services', '#/services') },
      { label: 'Pending applications', value: U.num(pending.length), meta: overdue.length ? `<span class="down">${overdue.length} ${t('overdue')}</span>` : t('None overdue'), icon: 'clock', color: 'var(--gold)', href: link('services', '#/services') },
      { label: 'Completed applications', value: U.num(Math.round(st.applicationsYtd * 0.93) + apps.filter((a) => a.status === 'Completed').length), meta: `${st.onTimeRate}% ${t('on time')}`, icon: 'checkcircle', color: 'var(--ok)', href: link('services', '#/services') },
      { label: 'Taxpayers', value: U.num(st.taxpayers), meta: `${S.all('taxpayers').filter((x) => x.debt > 0).length} ${t('with debt in sample')}`, icon: 'receipt', href: link('tax', '#/tax') },
      { label: 'Registered businesses', value: U.num(st.businesses), meta: `${S.all('businesses').filter((b) => b.status === 'Operating').length} ${t('operating in register view')}`, icon: 'briefcase', href: link('business', '#/business') },
      { label: 'Land records', value: U.num(st.parcels), meta: `${S.all('parcels').filter((p) => p.status === 'Pending registration' || p.status === 'Pending transfer').length} ${t('pending registration or transfer')}`, icon: 'map', color: '#15703F', href: link('land', '#/land') },
      { label: 'Registered vehicles', value: U.num(st.vehicles), meta: `${S.all('vehicles').filter((v) => v.inspection.status === 'Expired').length} ${t('inspections expired')}`, icon: 'car', href: link('vehicles', '#/vehicles') },
      { label: 'Incoming documents', value: U.num(st.docsIncomingYtd), meta: `${incoming.filter((d) => ['Awaiting receipt', 'Processing'].includes(d.status)).length} ${t('in progress')}`, icon: 'inbox', href: link('documents', '#/documents') },
      { label: 'Pending complaints', value: U.num(openCp.length), meta: `${openCp.filter((c) => c.priority === 'Urgent').length} ${t('urgent')}`, icon: 'message', color: 'var(--red)', href: link('complaints', '#/complaints') },
    ];

    /* Needs attention */
    const att = [];
    overdue.slice(0, 3).forEach((a) => att.push({ ic: 'clock', tone: 'bad', title: `${a.serviceName}: ${a.applicantName}`, sub: `${a.code} · ${-U.daysBetween(U.today(), a.deadline)} ${t('days overdue')}`, href: '#/services/' + a.id, mod: 'services' }));
    apps.filter((a) => a.status === 'Submitted').slice(0, 2).forEach((a) => att.push({ ic: 'file', tone: '', title: t('New application awaiting reception'), sub: `${a.code} · ${a.serviceName}`, href: '#/services/' + a.id, mod: 'services' }));
    docs.filter((d) => d.priority === 'Very urgent' && !['Completed', 'Archived', 'Issued'].includes(d.status)).slice(0, 2).forEach((d) => att.push({ ic: 'alert', tone: 'bad', title: `${t('Very urgent')}: ${d.number}`, sub: d.summary, href: '#/documents?id=' + d.id, mod: 'documents' }));
    docs.filter((d) => d.status === 'Awaiting signature').slice(0, 2).forEach((d) => att.push({ ic: 'pen', tone: 'warn', title: `${t('Awaiting signature')}: ${d.number}`, sub: d.summary, href: '#/documents?id=' + d.id, mod: 'documents' }));
    openCp.filter((c) => c.priority === 'Urgent' || c.deadline <= U.addDays(U.today(), 2)).slice(0, 3).forEach((c) => att.push({ ic: 'message', tone: 'warn', title: c.title, sub: `${c.code} · ${t('Response due')} ${U.date(c.deadline)}`, href: '#/complaints/' + c.id, mod: 'complaints' }));
    S.all('taxpayers').filter((x) => x.debtDays > 90).slice(0, 2).forEach((x) => att.push({ ic: 'coins', tone: 'bad', title: `${t('Tax debt over 90 days')}: ${x.name}`, sub: U.vnd(x.debt), href: '#/tax?id=' + x.id, mod: 'tax' }));
    S.all('insClaims').filter((c) => c.status === 'Submitted').slice(0, 2).forEach((c) => att.push({ ic: 'shield', tone: '', title: `${t('Benefit claim awaiting review')}: ${t(c.type)}`, sub: `${c.code} · ${c.name}`, href: '#/insurance?tab=claims', mod: 'insurance' }));
    S.all('parcels').filter((p) => p.status === 'Pending transfer' || p.status === 'Disputed').slice(0, 2).forEach((p) => att.push({ ic: 'map', tone: p.status === 'Disputed' ? 'bad' : 'warn', title: `${t(p.status)}: ${t('Parcel')} ${p.parcelNo}, ${t('sheet')} ${p.sheetNo}`, sub: `${p.ownerName} · ${p.ward}`, href: '#/land?id=' + p.id, mod: 'land' }));
    const attention = att.filter((a) => app.canView(a.mod)).slice(0, 8);

    const audit = S.all('audit').slice(0, 8);
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home') }], title: t('Government administration dashboard'), subtitle: `${esc(S.setting('orgName'))} · ${t('Updated')} ${U.dateTime(U.nowIso())}`, actions: app.canView('reports') ? `<a class="btn" href="#/reports">${icon('chart')}${t('Reports & statistics')}</a>` : '' })}
      ${ui.kpis(kpis, 'k-5')}
      <div class="grid g-main mt-2">
        ${ui.panel({ title: t('Public service applications by month'), sub: t('Online and counter submissions, last 12 months'), body: '<div id="ch-month"></div>' })}
        ${ui.panel({ title: t('Application processing status'), sub: t('Applications in the current register'), body: '<div id="ch-status"></div>' })}
      </div>
      <div class="grid g-3 mt-2">
        ${ui.panel({ title: t('Complaints by category'), sub: t('All feedback received'), body: '<div id="ch-cat"></div>' })}
        ${ui.panel({ title: t('Tax collection trend'), sub: t('Monthly state budget revenue vs target (billion ₫)'), body: '<div id="ch-tax"></div>' })}
        ${ui.panel({ title: t('Administrative workload by department'), sub: t('Open items per department'), body: '<div id="ch-dept"></div>' })}
      </div>
      <div class="grid g-2 mt-2">
        ${ui.panel({ title: t('Needs attention'), sub: t('Overdue, urgent and awaiting action'), flush: true, body: attention.length ? `<ul class="list">${attention.map((a) => `<li><span class="l-ic ${a.tone}">${icon(a.ic, 'i-sm')}</span><div class="l-main"><a class="l-title" href="${a.href}">${esc(a.title)}</a><div class="l-sub">${esc(a.sub)}</div></div></li>`).join('')}</ul>` : ui.empty('Nothing needs attention right now.') })}
        ${ui.panel({ title: t('Recent activity'), sub: t('Latest actions in the system'), flush: true, body: `<ul class="list">${audit.map((a) => `<li>${ui.avatar(a.user)}<div class="l-main"><div class="l-title">${esc(t(a.action))}${a.target ? ` <span class="code">${esc(a.target)}</span>` : ''}</div><div class="l-sub">${esc(a.user)} · ${esc(GA.app.roleLabel(a.role))} · ${U.ago(a.time)}</div></div></li>`).join('')}</ul>` })}
      </div>`;

    ui.chart.bar(U.$('#ch-month', el), { labels: st.svcMonthly.map((m) => M.ml(m.key)), series: [{ name: 'Online', values: st.svcMonthly.map((m) => m.online), color: '#0B5CAD' }, { name: 'At the counter', values: st.svcMonthly.map((m) => m.counter), color: '#E8A900' }], stacked: true, aria: t('Public service applications by month') });
    const order = ['Draft', 'Submitted', 'Under Review', 'Additional Information Required', 'Approved', 'Rejected', 'Completed'];
    const colors = ['#8A94A6', '#5AA3E8', '#0B5CAD', '#E8A900', '#0A8C8C', '#C62828', '#15703F'];
    const gc = U.groupCount(apps, 'status');
    ui.chart.donut(U.$('#ch-status', el), { items: order.map((s, i) => ({ label: s, value: gc[s] || 0, color: colors[i] })), centerLabel: 'Applications' });
    const cc = U.groupCount(cps, 'category');
    ui.chart.hbar(U.$('#ch-cat', el), { items: Object.keys(cc).sort((a, b) => cc[b] - cc[a]).map((k) => ({ label: k, value: cc[k] })), color: '#0B5CAD' });
    const tt = S.state.taxTrend;
    ui.chart.line(U.$('#ch-tax', el), { labels: tt.map((x) => M.ml(x.key)), series: [{ name: 'Collected', values: tt.map((x) => x.collected / 1e9), area: true, color: '#0B5CAD' }, { name: 'Monthly target', values: tt.map((x) => x.target / 1e9), dash: true, color: '#C62828' }], fmt: (v) => U.num(v), tipFmt: (v) => U.num(v) + ' tỷ ₫', height: 220 });
    const depts = S.all('departments');
    const load = depts.map((d) => ({ label: d.short, parts: [apps.filter((a) => a.dept === d.id && M.OPEN_APP.includes(a.status)).length, openCp.filter((c) => c.dept === d.id).length, docs.filter((x) => x.handlerId && (ui.officer(x.handlerId) || {}).dept === d.id && ['Processing', 'Drafting', 'Awaiting signature', 'Awaiting receipt'].includes(x.status)).length] })).filter((d) => d.parts.some(Boolean)).sort((a, b) => U.sum(b.parts, (x) => x) - U.sum(a.parts, (x) => x)).slice(0, 8);
    ui.chart.hbar(U.$('#ch-dept', el), { items: load, partNames: ['Applications', 'Complaints', 'Documents'], colors: ['#0B5CAD', '#C62828', '#E8A900'] });
  }

  function portal(el) {
    const app = GA.app, me = app.me(), biz = app.user.businessId ? S.find('businesses', app.user.businessId) : null;
    const ident = S.all('identities').find((i) => i.citizenId === app.user.subjectId);
    const apps = M.scoped('applications'), apts = M.scoped('appointments').filter((a) => a.status === 'Booked' && a.date >= U.today()).sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
    const action = apps.filter((a) => a.status === 'Additional Information Required' || a.status === 'Draft');
    const cps = M.scoped('complaints');
    const services = S.all('services').filter((s) => (biz ? s.business || s.field === 'Enterprise registration' || s.field === 'Tax' : !s.business)).slice(0, 8);
    const tps = M.scoped('taxpayers'), decl = M.scoped('declarations');
    const notif = S.all('notifications').filter((n) => app.owns(n.audience)).slice(0, 4);

    el.innerHTML = `<h1 class="sr-only" tabindex="-1" data-page-title>${t('My dashboard')}</h1>
      <div class="welcome"><div><h1 style="font-size:1.4rem">${t('Hello, {name}', { name: esc(me ? me.fullName : app.user.name) })}</h1><p>${biz ? esc(biz.name) + ' · ' + t('Enterprise code') + ' ' + esc(biz.code) : t('Manage your applications, appointments and feedback in one place.')}</p></div>
        <div class="w-id"><span class="xs">${t('Personal identification number')}</span><strong class="code">${esc(me ? me.cid : '—')}</strong><span class="xs">${ident ? ui.badge(ident.level) + ' ' + ui.badge(ident.status) : ''}</span></div></div>
      ${action.length ? `<div class="callout warn mb-2">${icon('alert')}<div><strong>${t('{n} application(s) need your action', { n: action.length })}</strong><div class="small">${action.map((a) => `<a href="#/services/${a.id}">${esc(a.code)}</a> ${esc(a.serviceName)}: ${ui.badge(a.status)}`).join('<br>')}</div></div></div>` : ''}
      ${ui.kpis([
        { label: 'My applications', value: apps.length, meta: t('All time'), icon: 'file', href: '#/services' },
        { label: 'In progress', value: apps.filter((a) => M.OPEN_APP.includes(a.status)).length, meta: t('Being processed'), icon: 'clock', color: 'var(--gold)', href: '#/services' },
        { label: 'Completed', value: apps.filter((a) => a.status === 'Completed' || a.status === 'Approved').length, meta: t('Results issued'), icon: 'checkcircle', color: 'var(--ok)', href: '#/services' },
        biz ? { label: 'Tax payable', value: U.vndShort(U.sum(tps, 'debt')), meta: `${decl.filter((d) => d.status === 'Pending review').length} ${t('declarations in review')}`, icon: 'receipt', color: 'var(--red)', href: '#/tax' } : { label: 'My feedback', value: cps.length, meta: `${cps.filter((c) => M.OPEN_CP.includes(c.status)).length} ${t('open')}`, icon: 'message', color: 'var(--red)', href: '#/complaints' },
      ])}
      <div class="grid g-main mt-2">
        <div>
          ${ui.panel({ title: t('Popular online services'), sub: t('Start an application in a few steps'), actions: `<a class="btn btn-sm" href="#/services?tab=catalog">${t('All services')}</a>`, body: `<div class="quick-grid">${services.map((s) => `<button class="quick" data-start="${s.id}">${icon(s.field === 'Land' ? 'map' : s.field === 'Transport' ? 'car' : s.field === 'Enterprise registration' ? 'briefcase' : s.field === 'Social insurance' ? 'shield' : 'file')}<span>${esc(t(s.name))}</span><em class="xs muted">${t(s.level)} · ${s.days} ${t('days')}</em></button>`).join('')}</div>` })}
          ${ui.panel({ title: t('My recent applications'), flush: true, actions: `<a class="btn btn-sm" href="#/services">${t('View all')}</a>`, body: ui.simpleTable([
            { label: 'Application', render: (a) => `<a href="#/services/${a.id}" class="strong">${esc(a.serviceName)}</a><span class="sub code">${esc(a.code)}</span>` },
            { label: 'Submitted', render: (a) => U.date(a.submittedAt) },
            { label: 'Status', render: (a) => ui.badge(a.status) },
          ], apps.slice(0, 6), 'You have not submitted any applications yet.') })}
        </div>
        <div>
          ${ui.panel({ title: t('Upcoming appointments'), flush: true, body: apts.length ? `<ul class="list">${apts.slice(0, 3).map((a) => `<li><span class="l-ic">${icon('calendar', 'i-sm')}</span><div class="l-main"><div class="l-title">${U.date(a.date)} · ${esc(a.slot)} <span class="code">${esc(a.ticket)}</span></div><div class="l-sub">${esc(a.purpose)}<br>${esc(a.location)}</div></div></li>`).join('')}</ul>` : ui.empty('No upcoming appointments.', `<a class="btn btn-sm mt-1" href="#/services?tab=appointments">${t('Book an appointment')}</a>`) })}
          ${biz ? ui.panel({ title: t('My enterprise'), body: ui.dl([['Enterprise code', `<span class="code">${esc(biz.code)}</span>`], ['Type', esc(t(biz.type))], ['Status', ui.badge(biz.status)], ['Registered', U.date(biz.regDate)], ['Head office', esc(U.address(biz))]]) + `<a class="btn btn-sm mt-1" href="#/business">${t('View registration details')}</a>` }) : ''}
          ${ui.panel({ title: t('Notifications'), flush: true, body: notif.length ? `<ul class="list">${notif.map((n) => `<li><span class="l-ic ${n.type === 'warning' ? 'warn' : n.type === 'success' ? 'ok' : ''}">${icon(n.type === 'success' ? 'checkcircle' : n.type === 'warning' ? 'alert' : 'info', 'i-sm')}</span><div class="l-main"><a class="l-title" href="${n.link || '#/dashboard'}">${esc(t(n.title))}</a><div class="l-sub">${esc(n.body)} · ${U.ago(n.time)}</div></div></li>`).join('')}</ul>` : ui.empty('You have no notifications.') })}
        </div>
      </div>`;
    U.$$('[data-start]', el).forEach((b) => b.onclick = () => GA.modules.services.startApplication(b.dataset.start));
  }

  GA.modules.dashboard = { render(el) { if (GA.app.portal) portal(el); else staff(el); } };
})(window.GA);
