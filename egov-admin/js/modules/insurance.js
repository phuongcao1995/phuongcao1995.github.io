/* Social insurance: participants, employment and contribution history, benefit claims, employer contributions, reports. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;
  const CLAIM_ST = ['Submitted', 'Under Review', 'Approved', 'Paid', 'Rejected'];

  function claimSteps(c) {
    const i = CLAIM_ST.indexOf(c.status);
    return [['Submitted', 0], ['Under Review', 1], ['Approved', 2], ['Paid', 3]].map(([l, k]) => ({ label: l, state: c.status === 'Rejected' && k === 2 ? 'failed' : i > k || c.status === 'Paid' ? 'done' : i === k ? 'current' : '' })).map((s, k) => (c.status === 'Rejected' && k === 2 ? Object.assign(s, { label: 'Rejected' }) : s));
  }

  function participantModal(p, refresh) {
    const app = GA.app, canEdit = app.can('edit', 'insurance');
    const claims = S.where('insClaims', (c) => c.participantId === p.id);
    const years = Math.floor(p.months / 12), rest = p.months % 12;
    const est = Math.round(p.salary * 0.105 * p.months);
    const acts = [{ label: t('Close') }];
    if (canEdit) {
      acts.push({ label: t('Change status'), left: true, icon: 'refresh', onClick: (m) => { m.close(); ui.formModal({ title: t('Change insurance status'), subtitle: esc(p.name) + ' · ' + esc(p.insNo), size: '', fields: [{ key: 'status', label: 'New status', type: 'select', required: true, options: ['Active', 'Suspended', 'Reserved', 'Receiving pension'].filter((s) => s !== p.status) }, { key: 'note', label: 'Reason', type: 'textarea', required: true, full: true }], submitLabel: t('Update'), onSubmit: (v) => { S.update('insParticipants', p.id, { status: v.status }); S.log('Changed insurance status', p.id, v.status); ui.toast(t('Status updated.'), 'success'); refresh(); } }); } });
      acts.push({ label: t('Renew health insurance card'), icon: 'heart', onClick: (m) => { const exp = U.addDays(p.healthCardExpiry > U.today() ? p.healthCardExpiry : U.today(), 365); S.update('insParticipants', p.id, { healthCardExpiry: exp }); S.log('Renewed health insurance card', p.id, exp); m.close(); ui.toast(t('Health insurance card valid until {d}.', { d: U.date(exp) }), 'success'); refresh(); } });
      acts.push({ label: t('New benefit claim'), variant: 'primary', icon: 'plus', onClick: (m) => { m.close(); newClaim(p, refresh); } });
    }
    ui.modal({ title: esc(p.name), subtitle: `${t('Social insurance no.')} <span class="code">${esc(p.insNo)}</span>`, size: 'xl', actions: acts,
      body: `<div class="grid g-2"><div>${ui.dl([['Social insurance no.', `<span class="code">${esc(p.insNo)}</span>`], ['Citizen ID', `<span class="code">${esc(p.cid)}</span>`], ['Date of birth', U.date(p.dob)], ['Gender', t(p.gender)], ['Status', ui.badge(p.status)], ['Current employer', esc(p.employerName)], ['Contribution salary', U.vnd(p.salary)], ['Participation since', U.date(p.startDate)]])}</div>
        <div>${ui.kpis([{ label: 'Contribution period', value: `${years}<small> ${t('yrs')}</small> ${rest}<small> ${t('mo')}</small>`, meta: `${p.months} ${t('months in total')}`, icon: 'clock' }, { label: 'Employee contributions (est.)', value: U.vndShort(est), meta: t('10.5% of salary: pension, sickness, unemployment, health'), icon: 'coins', color: 'var(--ok)' }], 'compact')}
          <div class="sig-box">${'<span class="l-ic ' + (p.healthCardExpiry < U.today() ? 'bad' : 'ok') + '">' + icon('heart') + '</span>'}<div><div class="strong">${t('Health insurance card')} <span class="code">${esc(p.healthCard)}</span></div><div class="small muted">${t('Registered hospital')}: ${esc(p.hospital)}</div><div class="small">${t('Valid until')} ${U.date(p.healthCardExpiry)} ${p.healthCardExpiry < U.today() ? ui.badge('Expired') : ''}</div></div></div></div></div>
        ${ui.tabs([
          { id: 'e', label: 'Employment history', count: p.employment.length, content: ui.simpleTable([{ label: 'From', key: 'from' }, { label: 'To', render: (e) => e.to || `<span class="badge b-ok">${t('Current')}</span>` }, { label: 'Employer', render: (e) => esc(e.employer) }, { label: 'Position', render: (e) => t(e.position) }, { label: 'Contribution salary', cls: 'right', render: (e) => U.vnd(e.salary) }], p.employment.slice().reverse(), 'No employment recorded.') },
          { id: 'c', label: 'Benefit claims', count: claims.length, content: ui.simpleTable([{ label: 'Claim code', cls: 'code', key: 'code' }, { label: 'Type', render: (c) => t(c.type) }, { label: 'Submitted', render: (c) => U.date(c.submittedAt) }, { label: 'Amount', cls: 'right', render: (c) => U.vnd(c.amount) }, { label: 'Status', render: (c) => ui.badge(c.status) }], claims, 'No benefit claims.') },
        ], { cls: 'mt-2' })}`,
      onOpen: (m) => ui.bindTabs(m.el) });
  }

  function newClaim(p, refresh) {
    ui.formModal({ title: t('New benefit claim'), subtitle: esc(p.name) + ' · ' + esc(p.insNo), size: '',
      fields: [{ key: 'type', label: 'Benefit type', type: 'select', required: true, options: ['Sickness', 'Maternity', 'Unemployment', 'Pension', 'One-time withdrawal', 'Occupational accident', 'Funeral allowance'].filter((x) => x !== 'Maternity' || p.gender === 'Female') }, { key: 'amount', label: 'Claimed amount (₫)', type: 'number', required: true, min: 100000 }, { key: 'note', label: 'Supporting documents', type: 'textarea', full: true, placeholder: 'e.g. Hospital discharge certificate, sick leave certificate' }],
      submitLabel: t('Create claim'), onSubmit: (v) => { const rec = { id: S.nextId('insClaims', 'CL-'), code: 'BHXH-' + String(new Date().getMonth() + 1).padStart(2, '0') + Date.now().toString().slice(-6), participantId: p.id, name: p.name, insNo: p.insNo, type: v.type, submittedAt: U.today(), amount: v.amount, status: 'Submitted', officerId: '', paidAt: '', note: v.note }; S.insert('insClaims', rec); S.log('Created benefit claim', rec.id, v.type); ui.toast(t('Claim {c} created.', { c: rec.code }), 'success'); refresh(); } });
  }

  function claimModal(c, refresh) {
    const app = GA.app, can = app.can('edit', 'insurance'), p = S.find('insParticipants', c.participantId);
    const step = async (status, label, needNote) => {
      let note = c.note;
      if (needNote) { const r = await ui.confirm({ title: t(label), message: t('Claim {c}: {t} for {n}.', { c: c.code, t: t(c.type), n: esc(c.name) }), input: t('Reason'), required: true, danger: status === 'Rejected', confirmLabel: t(label) }); if (!r) return; note = r; }
      S.update('insClaims', c.id, { status, officerId: c.officerId || app.officerId(), note, paidAt: status === 'Paid' ? U.today() : c.paidAt });
      S.log(status === 'Approved' ? 'Approved benefit claim' : 'Updated benefit claim', c.id, status);
      if (p) S.notify({ audience: p.citizenId, title: 'Benefit claim ' + status.toLowerCase(), body: `${c.code}: ${c.type}, ${U.vnd(c.amount)}`, type: status === 'Rejected' ? 'error' : 'success', link: '#/dashboard' });
      ui.toast(t('Claim {c} is now {s}.', { c: c.code, s: t(status) }), 'success'); refresh();
    };
    const acts = [{ label: t('Close') }];
    if (can) {
      if (c.status === 'Submitted') acts.push({ label: t('Start review'), variant: 'primary', onClick: (m) => { m.close(); step('Under Review'); } });
      if (c.status === 'Under Review') acts.push({ label: t('Reject'), variant: 'danger', onClick: (m) => { m.close(); step('Rejected', 'Reject', true); } }, { label: t('Approve'), variant: 'success', icon: 'check', onClick: (m) => { m.close(); step('Approved'); } });
      if (c.status === 'Approved') acts.push({ label: t('Confirm payment'), variant: 'primary', icon: 'coins', onClick: (m) => { m.close(); step('Paid'); } });
    }
    ui.modal({ title: t(c.type) + ' · ' + esc(c.code), subtitle: esc(c.name), size: 'lg', actions: acts,
      body: ui.stepper(claimSteps(c)) + `<div class="mt-2">${ui.dl([['Claim code', `<span class="code">${esc(c.code)}</span>`], ['Participant', esc(c.name)], ['Social insurance no.', `<span class="code">${esc(c.insNo)}</span>`], ['Benefit type', t(c.type)], ['Submitted', U.date(c.submittedAt)], ['Amount', `<strong>${U.vnd(c.amount)}</strong>`], ['Processing officer', ui.officerName(c.officerId)], ['Paid on', U.date(c.paidAt)], ['Contribution period', p ? `${p.months} ${t('months')}` : '—'], ['Note', esc(c.note)]])}</div>` });
  }

  function render(el, params, q) {
    const app = GA.app, can = app.can('edit', 'insurance');
    const parts = S.all('insParticipants'), claims = S.all('insClaims'), contr = S.all('insContributions');
    let tab = q.tab || 'part';
    const refresh = () => render(el, params, { tab });
    const lastPeriod = contr.length ? contr[contr.length - 1].period : '';
    const cur = contr.filter((c) => c.period === lastPeriod);
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('Social insurance') }], title: t('Social insurance'), subtitle: t('City Social Insurance · participants, contributions and benefit settlement'), actions: '' })}
      ${ui.kpis([
        { label: 'Participants in register view', value: parts.length, meta: `${parts.filter((p) => p.status === 'Active').length} ${t('actively contributing')}`, icon: 'users' },
        { label: 'Claims awaiting processing', value: claims.filter((c) => ['Submitted', 'Under Review'].includes(c.status)).length, meta: `${claims.filter((c) => c.status === 'Approved').length} ${t('approved, awaiting payment')}`, icon: 'file', color: 'var(--gold)' },
        { label: 'Benefits paid (register)', value: U.vndShort(U.sum(claims.filter((c) => c.status === 'Paid'), 'amount')), icon: 'coins', color: 'var(--ok)' },
        { label: 'Collection rate ' + lastPeriod, value: U.pct(U.sum(cur, 'paid'), U.sum(cur, 'due')) + '%', meta: `${cur.filter((c) => c.status === 'Overdue').length} ${t('employers overdue')}`, icon: 'building', color: 'var(--red)' },
      ], 'compact')}
      ${ui.tabs([
        { id: 'part', label: 'Participants', icon: 'users', count: parts.length, content: '<div class="panel"><div class="panel-body flush" id="si-p"></div></div>' },
        { id: 'claims', label: 'Benefit claims', icon: 'file', count: claims.length, content: '<div class="panel"><div class="panel-body flush" id="si-c"></div></div>' },
        { id: 'contr', label: 'Employer contributions', icon: 'building', count: contr.length, content: '<div class="panel"><div class="panel-body flush" id="si-k"></div></div>' },
        { id: 'rep', label: 'Reports', icon: 'chart', content: `<div class="grid g-3">${ui.panel({ title: t('Participants by status'), body: '<div id="si-c1"></div>' })}${ui.panel({ title: t('Claims by benefit type'), body: '<div id="si-c2"></div>' })}${ui.panel({ title: t('Contribution collection by month'), sub: t('Due vs paid, million ₫'), body: '<div id="si-c3"></div>' })}</div>` },
      ], { cls: 'page-tabs', active: tab, id: 'si' })}`;

    ui.table(U.$('#si-p', el), { rows: () => S.all('insParticipants'), exportName: 'si-participants', searchKeys: ['name', 'insNo', 'cid', 'employerName'], searchPlaceholder: t('Search by name, insurance number, citizen ID or employer'),
      filters: [{ key: 'status', label: 'Status', all: 'All statuses', options: ['Active', 'Suspended', 'Reserved', 'Receiving pension'] }, { key: 'card', label: 'Health card', all: 'Any health card', options: [{ value: 'exp', label: t('Expired') }, { value: 'soon', label: t('Expires within 30 days') }], match: (p, v) => (v === 'exp' ? p.healthCardExpiry < U.today() : p.healthCardExpiry >= U.today() && p.healthCardExpiry <= U.addDays(U.today(), 30)) }],
      defaultSort: 'name', defaultDir: 'asc',
      columns: [{ key: 'name', label: 'Participant', render: (p) => `<span class="strong">${esc(p.name)}</span><span class="sub">${U.date(p.dob)} · ${t(p.gender)}</span>` }, { key: 'insNo', label: 'Insurance no.', cls: 'code', csv: (p) => "'" + p.insNo }, { key: 'employerName', label: 'Employer', render: (p) => `<span class="small">${esc(p.employerName)}</span>` }, { key: 'salary', label: 'Contribution salary', cls: 'right', render: (p) => U.vnd(p.salary), csv: (p) => p.salary }, { key: 'months', label: 'Months', cls: 'right' }, { key: 'healthCardExpiry', label: 'Health card', render: (p) => `${U.date(p.healthCardExpiry)}${p.healthCardExpiry < U.today() ? `<span class="sub overdue">${t('Expired')}</span>` : ''}` }, { key: 'status', label: 'Status', render: (p) => ui.badge(p.status) }],
      onRowClick: (p) => participantModal(p, refresh) });

    ui.table(U.$('#si-c', el), { rows: () => S.all('insClaims'), exportName: 'si-claims', searchKeys: ['code', 'name', 'insNo', 'type'], searchPlaceholder: t('Search by claim code, participant or type'),
      filters: [{ key: 'status', label: 'Status', all: 'All statuses', options: CLAIM_ST }, { key: 'type', label: 'Benefit type', all: 'All benefit types', options: () => U.uniq(S.all('insClaims').map((c) => c.type)) }],
      dateKey: 'submittedAt', dateLabel: 'Submitted from', defaultSort: 'submittedAt',
      columns: [{ key: 'code', label: 'Claim code', render: (c) => `<span class="strong code">${esc(c.code)}</span>` }, { key: 'name', label: 'Participant', render: (c) => `${esc(c.name)}<span class="sub code">${esc(c.insNo)}</span>` }, { key: 'type', label: 'Benefit type', render: (c) => t(c.type) }, { key: 'submittedAt', label: 'Submitted', render: (c) => U.date(c.submittedAt) }, { key: 'amount', label: 'Amount', cls: 'right', render: (c) => U.vnd(c.amount), csv: (c) => c.amount }, { key: 'officerId', label: 'Officer', render: (c) => ui.officerName(c.officerId), csv: (c) => (ui.officer(c.officerId) || {}).name || '' }, { key: 'status', label: 'Status', render: (c) => ui.badge(c.status) }],
      onRowClick: (c) => claimModal(c, refresh), rowActions: () => [{ id: 'o', label: 'Open claim', icon: 'eye' }], onAction: (id, c) => claimModal(c, refresh) });

    ui.table(U.$('#si-k', el), { rows: () => S.all('insContributions'), exportName: 'si-contributions', searchKeys: ['employerName', 'unitCode', 'period'], searchPlaceholder: t('Search by employer or unit code'),
      filters: [{ key: 'period', label: 'Period', all: 'All periods', options: () => U.uniq(S.all('insContributions').map((c) => c.period)) }, { key: 'status', label: 'Status', all: 'All statuses', options: ['Paid', 'Partially paid', 'Pending', 'Overdue'] }],
      defaultSort: 'period',
      columns: [{ key: 'employerName', label: 'Employer', render: (c) => `<span class="strong">${esc(c.employerName)}</span><span class="sub code">${esc(c.unitCode)}</span>` }, { key: 'period', label: 'Period', sort: (c) => c.period.slice(3) + c.period.slice(0, 2) }, { key: 'employees', label: 'Employees', cls: 'right' }, { key: 'payroll', label: 'Payroll', cls: 'right', render: (c) => U.vnd(c.payroll), csv: (c) => c.payroll }, { key: 'due', label: 'Due (32%)', cls: 'right', render: (c) => U.vnd(c.due), csv: (c) => c.due }, { key: 'paid', label: 'Paid', cls: 'right', render: (c) => U.vnd(c.paid), csv: (c) => c.paid }, { key: 'status', label: 'Status', render: (c) => ui.badge(c.status) }],
      rowActions: (c) => (can && c.status !== 'Paid' ? [{ id: 'pay', label: 'Record payment', icon: 'coins' }, { id: 'rem', label: 'Send reminder', icon: 'send' }] : []),
      onAction: (id, c, dt) => {
        if (id === 'pay') ui.formModal({ title: t('Record contribution payment'), subtitle: esc(c.employerName) + ' · ' + c.period, size: '', fields: [{ key: 'amount', label: 'Amount (₫)', type: 'number', required: true, min: 1000, default: c.due - c.paid }], submitLabel: t('Record payment'), onSubmit: (v) => { const paid = Math.min(c.due, c.paid + v.amount); S.update('insContributions', c.id, { paid, status: paid >= c.due ? 'Paid' : 'Partially paid' }); S.log('Recorded contribution payment', c.id, U.vnd(v.amount)); ui.toast(t('Payment recorded.'), 'success'); dt.refresh(); } });
        if (id === 'rem') { S.log('Sent contribution reminder', c.id, c.employerName); ui.toast(t('Reminder sent to {n}.', { n: esc(c.employerName) }), 'success'); }
      } });

    const sc = U.groupCount(parts, 'status');
    ui.chart.donut(U.$('#si-c1', el), { items: Object.keys(sc).map((k, i) => ({ label: k, value: sc[k], color: ['#15703F', '#E8A900', '#8A94A6', '#0B5CAD'][i % 4] })), centerLabel: 'Participants' });
    const ct = U.groupCount(claims, 'type');
    ui.chart.hbar(U.$('#si-c2', el), { items: Object.keys(ct).sort((a, b) => ct[b] - ct[a]).map((k) => ({ label: k, value: ct[k] })) });
    const periods = U.uniq(contr.map((c) => c.period));
    ui.chart.bar(U.$('#si-c3', el), { labels: periods, series: [{ name: 'Due', values: periods.map((p) => Math.round(U.sum(contr.filter((c) => c.period === p), 'due') / 1e6)), color: '#D3E4F7' }, { name: 'Paid', values: periods.map((p) => Math.round(U.sum(contr.filter((c) => c.period === p), 'paid') / 1e6)), color: '#15703F' }], fmt: U.num, height: 220 });
    ui.bindTabs(el, (id) => { tab = id; });
    M.openFromQuery(q, 'insParticipants', (p) => participantModal(p, refresh));
  }

  GA.modules.insurance = { render };
})(window.GA);
