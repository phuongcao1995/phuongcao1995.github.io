/* Public complaints and feedback: submission, assignment, investigation, resolution and citizen feedback. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;
  const STATUSES = ['Received', 'Assigned', 'Investigating', 'Waiting for Information', 'Resolved', 'Closed'];
  const CATS = { 'Land & housing': 'D04', 'Environment & sanitation': 'D04', 'Urban order & construction': 'D05', 'Traffic & infrastructure': 'D05', 'Public services': 'D01', 'Social welfare': 'D11', 'Officer conduct': 'D09' };

  function step(c, status, note, extra) {
    c.timeline.push({ time: U.nowIso(), status, by: GA.app.user.name, note: note || '' });
    S.update('complaints', c.id, Object.assign({ status, timeline: c.timeline }, extra || {}));
    S.log(status === 'Assigned' ? 'Assigned complaint' : 'Updated complaint', c.id, status);
    if (!GA.app.portal) S.notify({ audience: c.citizenId, title: { Assigned: 'Your feedback was assigned', Investigating: 'Your feedback is being investigated', 'Waiting for Information': 'More information needed', Resolved: 'Your feedback was resolved', Closed: 'Your feedback was closed' }[status] || 'Feedback updated', body: `${c.code}: ${c.title}`, type: status === 'Waiting for Information' ? 'warning' : 'info', link: '#/complaints/' + c.id });
    else S.notify({ title: 'Citizen responded to feedback', body: `${c.code}: ${c.title}`, link: '#/complaints/' + c.id });
  }

  function submit(done) {
    const app = GA.app, me = app.me();
    const fields = [
      app.portal ? null : { key: 'citizenId', label: 'Citizen', type: 'select', required: true, options: S.all('citizens').map((c) => ({ value: c.id, label: c.fullName + ' · ' + c.cid })) },
      { key: 'category', label: 'Category', type: 'select', required: true, options: Object.keys(CATS) },
      { key: 'priority', label: 'Priority', type: 'select', required: true, noBlank: true, options: ['Normal', 'High', 'Urgent'], readonly: false },
      { key: 'title', label: 'Subject', required: true, full: true, validate: (v) => (v.length < 10 ? t('Describe the subject in at least 10 characters.') : '') },
      { key: 'description', label: 'Description', type: 'textarea', required: true, full: true, rows: 5, validate: (v) => (v.length < 20 ? t('Add more detail (at least 20 characters).') : '') },
      { key: 'location', label: 'Location of the issue', full: true, placeholder: 'e.g. Alley 45 Nguyễn Chí Thanh, Hải Châu' },
      { key: 'channel', label: 'Channel', type: 'select', noBlank: true, options: app.portal ? ['Web portal', 'Mobile app'] : ['Hotline 1022', 'Counter', 'Web portal', 'Mobile app', 'Email'] },
    ].filter(Boolean);
    ui.formModal({ title: t(app.portal ? 'Send feedback or complaint' : 'Record complaint'), subtitle: t('Responses are due within 15 days (3 days for urgent matters)'), size: 'lg', fields, submitLabel: t('Submit'),
      onSubmit: (v) => {
        const c = app.portal ? me : S.find('citizens', v.citizenId);
        const now = U.nowIso(), n = S.all('complaints').length + 1;
        const rec = { id: S.nextId('complaints', 'CP-'), code: `PA-${new Date().getFullYear()}-${String(1000 + n).padStart(4, '0')}`, citizenId: c.id, citizenName: c.fullName, phone: c.phone, category: v.category, title: v.title, description: v.description, submittedAt: now, dept: CATS[v.category], priority: v.priority, status: 'Received', officerId: '', deadline: U.addDays(U.today(), v.priority === 'Urgent' ? 3 : v.priority === 'High' ? 7 : 15), channel: v.channel, location: v.location, resolution: '', feedback: null, timeline: [{ time: now, status: 'Received', by: app.portal ? 'Citizen feedback portal' : app.user.name, note: `Submitted by ${c.fullName} via ${v.channel}` }] };
        S.insert('complaints', rec); S.log('Recorded complaint', rec.id, rec.title);
        if (app.portal) S.notify({ title: 'New citizen feedback', body: `${rec.code}: ${rec.title}`, type: v.priority === 'Urgent' ? 'error' : 'info', link: '#/complaints/' + rec.id });
        ui.toast(t('Feedback {c} received. Response due by {d}.', { c: rec.code, d: U.date(rec.deadline) }), 'success'); if (done) done(rec);
      } });
  }

  function list(el, q) {
    const app = GA.app, portal = app.portal, can = app.can('edit', 'complaints');
    const all = M.scoped('complaints');
    const open = all.filter((c) => M.OPEN_CP.includes(c.status));
    const rated = all.filter((c) => c.feedback);
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t(portal ? 'My feedback' : 'Public complaints') }], title: t(portal ? 'My feedback' : 'Public complaints and feedback'), subtitle: portal ? t('Report issues to the authorities and follow how they are handled.') : t('Complaints, denunciations and recommendations from residents and businesses'),
      actions: portal || can ? `<button class="btn btn-primary" id="cp-new">${icon('plus')}${t(portal ? 'Send feedback' : 'Record complaint')}</button>` : '' })}
      ${ui.kpis([
        { label: portal ? 'My submissions' : 'Total received', value: all.length, icon: 'message' },
        { label: 'Open', value: open.length, meta: `${open.filter((c) => c.priority === 'Urgent').length} ${t('urgent')}`, icon: 'clock', color: 'var(--gold)' },
        { label: 'Overdue', value: open.filter((c) => c.deadline < U.today()).length, icon: 'alert', color: 'var(--red)' },
        { label: 'Satisfaction', value: rated.length ? (U.sum(rated, (c) => c.feedback.rating) / rated.length).toFixed(1).replace('.', ',') + '<small> / 5</small>' : '—', meta: `${rated.length} ${t('ratings')}`, icon: 'star', color: 'var(--ok)' },
      ], 'compact')}
      <div class="panel"><div class="panel-body flush" id="cp-t"></div></div>`;
    ui.table(U.$('#cp-t', el), { rows: () => M.scoped('complaints'), exportName: 'complaints', searchKeys: ['code', 'title', 'citizenName', 'description', 'location'], searchPlaceholder: t('Search by code, subject, citizen or location'),
      filters: [{ key: 'status', label: 'Status', all: 'All statuses', options: STATUSES }, { key: 'category', label: 'Category', all: 'All categories', options: Object.keys(CATS) }, { key: 'priority', label: 'Priority', all: 'All priorities', options: ['Normal', 'High', 'Urgent'] }, portal ? null : { key: 'dept', label: 'Department', all: 'All departments', options: () => U.uniq(S.all('complaints').map((c) => c.dept)).map((d) => ({ value: d, label: ui.dept(d).short })) }].filter(Boolean),
      initialFilters: q.status ? { status: q.status } : undefined, dateKey: 'submittedAt', dateLabel: 'Received from', defaultSort: 'submittedAt',
      columns: [
        { key: 'code', label: 'Code', render: (c) => `<a class="strong code" href="#/complaints/${c.id}">${esc(c.code)}</a><span class="sub">${t(c.channel)}</span>` },
        { key: 'title', label: 'Subject', render: (c) => `${esc(t(c.title))}<span class="sub">${t(c.category)}</span>` },
        portal ? null : { key: 'citizenName', label: 'Citizen' },
        { key: 'submittedAt', label: 'Received', render: (c) => U.date(c.submittedAt) },
        { key: 'priority', label: 'Priority', sort: (c) => ['Normal', 'High', 'Urgent'].indexOf(c.priority), render: (c) => ui.priority(c.priority) },
        { key: 'deadline', label: 'Response due', render: (c) => U.deadline(c.deadline, !M.OPEN_CP.includes(c.status)), csv: (c) => U.date(c.deadline) },
        portal ? null : { key: 'officerId', label: 'Officer', render: (c) => `${ui.officerName(c.officerId)}<span class="sub">${esc(ui.dept(c.dept).short)}</span>`, csv: (c) => (ui.officer(c.officerId) || {}).name || '' },
        { key: 'status', label: 'Status', render: (c) => ui.badge(c.status) },
      ].filter(Boolean),
      onRowClick: (c) => app.go('#/complaints/' + c.id) });
    const nb = U.$('#cp-new', el); if (nb) nb.onclick = () => submit((r) => app.go('#/complaints/' + r.id));
  }

  function detail(el, id) {
    const app = GA.app, portal = app.portal, can = app.can('edit', 'complaints');
    const c = S.find('complaints', id);
    if (!c || (portal && !app.owns(c.citizenId))) { el.innerHTML = ui.pageHeader({ title: t('Complaint not found') }) + ui.empty('This record does not exist or you do not have access to it.', `<a class="btn mt-1" href="#/complaints">${t('Back to list')}</a>`); return; }
    const re = () => detail(el, id);
    const i = STATUSES.indexOf(c.status);
    const acts = [];
    if (!portal && can) {
      if (c.status === 'Received') acts.push(['assign', 'Assign', 'primary', 'user']);
      if (c.status === 'Assigned') acts.push(['investigate', 'Start investigation', 'primary', 'search']);
      if (['Assigned', 'Investigating'].includes(c.status)) acts.push(['info', 'Request information', '', 'alert']);
      if (c.status === 'Waiting for Information') acts.push(['resume', 'Information received', 'primary', 'refresh']);
      if (['Investigating', 'Waiting for Information'].includes(c.status)) acts.push(['resolve', 'Record resolution', 'success', 'checkcircle']);
      if (c.status === 'Resolved') acts.push(['close', 'Close case', '', 'check']);
      if (M.OPEN_CP.includes(c.status) && c.status !== 'Received') acts.push(['assign', 'Reassign', '', 'user']);
    }
    if (portal) {
      if (c.status === 'Waiting for Information') acts.push(['reply', 'Provide information', 'primary', 'send']);
      if (c.status === 'Resolved') acts.push(['rate', 'Rate and close', 'primary', 'star']);
    }
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t(portal ? 'My feedback' : 'Public complaints'), href: '#/complaints' }, { label: c.code }], title: esc(t(c.title)), subtitle: `${t('Code')} <span class="code">${esc(c.code)}</span>` })}
      ${M.detailHead({ title: `${esc(t(c.title))} ${ui.badge(c.status)} ${ui.priority(c.priority)}`, meta: [`${icon('user', 'i-sm')}${esc(c.citizenName)}`, `${icon('calendar', 'i-sm')}${U.dateTime(c.submittedAt)}`, `${icon('clock', 'i-sm')}${t('Response due')} ${U.date(c.deadline)}`, `${icon('building', 'i-sm')}${esc(ui.dept(c.dept).short)}`], actions: acts.map(([k, l, v, ic]) => `<button class="btn ${v ? 'btn-' + v : ''}" data-act="${k}">${icon(ic)}${t(l)}</button>`).join(''),
        foot: `<div style="padding:0 18px 18px">${ui.stepper(['Received', 'Assigned', 'Investigating', 'Resolved', 'Closed'].map((s, k) => ({ label: s, state: c.status === 'Waiting for Information' && k === 2 ? 'warn' : i > STATUSES.indexOf(s) || c.status === 'Closed' ? 'done' : c.status === s ? 'current' : '' })))}</div>` })}
      ${c.status === 'Waiting for Information' ? `<div class="callout warn mt-2">${icon('alert')}<div><strong>${t('Information requested')}</strong><div>${esc((c.timeline.slice().reverse().find((x) => x.status === 'Waiting for Information') || {}).note || '')}</div></div></div>` : ''}
      <div class="grid g-main mt-2"><div>
        ${ui.panel({ title: t('Description'), body: `<p>${esc(t(c.description))}</p>${ui.dl([['Category', t(c.category)], ['Location', esc(c.location)], ['Channel', t(c.channel)], portal ? null : ['Contact phone', esc(c.phone)]])}` })}
        ${c.resolution ? ui.panel({ title: t('Resolution'), body: `<div class="callout ok">${icon('checkcircle')}<div>${esc(t(c.resolution))}</div></div>` }) : ''}
        ${c.feedback ? ui.panel({ title: t('Citizen feedback'), body: `${ui.stars(c.feedback.rating)} <strong>${c.feedback.rating}/5</strong><p class="mt-1">${esc(t(c.feedback.comment))}</p>` }) : ''}
      </div><div>
        ${ui.panel({ title: t('Handling'), body: ui.dl([['Department', esc(ui.dept(c.dept).name)], ['Officer', ui.officerName(c.officerId)], ['Response due', U.deadline(c.deadline, !M.OPEN_CP.includes(c.status))]]) })}
        ${ui.panel({ title: t('Progress'), body: ui.timeline(c.timeline.slice().reverse().map((x) => ({ title: ui.badge(x.status), meta: `${U.dateTime(x.time)} · ${esc(x.by)}`, note: esc(t(x.note)), tone: ['Resolved', 'Closed'].includes(x.status) ? 'ok' : x.status === 'Waiting for Information' ? 'warn' : '' }))) })}
      </div></div>`;
    U.$$('.dh-actions [data-act]', el).forEach((b) => b.onclick = async () => {
      const k = b.dataset.act;
      if (k === 'assign') ui.formModal({ title: t('Assign complaint'), subtitle: esc(c.code), size: '', fields: [{ key: 'dept', label: 'Department', type: 'select', required: true, options: S.all('departments').map((d) => ({ value: d.id, label: d.name })), default: c.dept }, { key: 'officerId', label: 'Officer', type: 'select', required: true, dependsOn: 'dept', optionsFn: (v) => S.all('officers').filter((o) => !v.dept || o.dept === v.dept).map((o) => ({ value: o.id, label: `${o.name}, ${o.title}` })), default: c.officerId }], values: { dept: c.dept, officerId: c.officerId || (S.all('officers').find((o) => o.dept === c.dept) || {}).id },
        submitLabel: t('Assign'), onSubmit: (v) => { const o = ui.officer(v.officerId); step(c, c.status === 'Received' ? 'Assigned' : c.status, `Assigned to ${o.name} (${ui.dept(v.dept).short})`, { dept: v.dept, officerId: v.officerId }); ui.toast(t('Assigned to {n}.', { n: esc(o.name) }), 'success'); re(); } });
      if (k === 'investigate') { step(c, 'Investigating', 'Site verification scheduled.'); ui.toast(t('Investigation started.'), 'success'); re(); }
      if (k === 'info') { const r = await ui.confirm({ title: t('Request information'), message: t('Ask the citizen for more details. The response deadline is paused.'), input: t('What is needed?'), required: true, confirmLabel: t('Send request') }); if (r) { step(c, 'Waiting for Information', r); ui.toast(t('Request sent.'), 'success'); re(); } }
      if (k === 'resume') { step(c, 'Investigating', 'Citizen provided the requested information.'); re(); }
      if (k === 'resolve') { const r = await ui.confirm({ title: t('Record resolution'), message: t('Describe how the issue was resolved. The citizen will be asked to rate the response.'), input: t('Resolution'), required: true, confirmLabel: t('Mark resolved') }); if (r) { step(c, 'Resolved', 'Resolution recorded.', { resolution: r }); ui.toast(t('Complaint resolved.'), 'success'); re(); } }
      if (k === 'close') { step(c, 'Closed', 'Case closed.'); ui.toast(t('Case closed.'), 'success'); re(); }
      if (k === 'reply') { const r = await ui.confirm({ title: t('Provide information'), message: t('Your reply will be sent to the handling officer.'), input: t('Your reply'), required: true, confirmLabel: t('Send') }); if (r) { step(c, 'Investigating', 'Citizen reply: ' + r); ui.toast(t('Reply sent.'), 'success'); re(); } }
      if (k === 'rate') {
        let n = 0;
        const stars = () => [1, 2, 3, 4, 5].map((s) => `<button type="button" class="${s <= n ? 'on' : ''}" data-star="${s}" aria-label="${s} ${t('stars')}">${icon('star')}</button>`).join('');
        const m = ui.modal({ title: t('Rate the response'), subtitle: esc(c.code), body: `<p class="small">${t('How satisfied are you with how your feedback was handled?')}</p><div class="star-input" id="cs">${stars()}</div><div class="field mt-2"><label for="cs-c">${t('Comment')}</label><textarea id="cs-c" rows="3"></textarea></div>`,
          actions: [{ label: t('Cancel') }, { label: t('Send and close'), variant: 'primary', onClick: (mm) => { if (!n) { ui.toast(t('Choose a rating.'), 'error'); return; } step(c, 'Closed', `Rated ${n}/5 by citizen.`, { feedback: { rating: n, comment: U.$('#cs-c', mm.el).value.trim() || '—' } }); mm.close(); ui.toast(t('Thank you for your feedback.'), 'success'); re(); } }] });
        const bind = () => U.$$('[data-star]', m.el).forEach((s) => s.onclick = () => { n = +s.dataset.star; U.$('#cs', m.el).innerHTML = stars(); bind(); });
        bind();
      }
    });
  }

  GA.modules.complaints = { render(el, params, q) { if (params[0]) detail(el, params[0]); else list(el, q || {}); } };
})(window.GA);
