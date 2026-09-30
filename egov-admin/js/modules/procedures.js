/* Administrative procedures catalogue: codes, handling units, documents, time limits, fees, workflow, availability. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;
  const AVAIL = ['Online', 'Online & counter', 'Counter only'];

  function detail(p, refresh) {
    const app = GA.app, can = app.can('edit', 'procedures');
    const svc = p.serviceId ? S.find('services', p.serviceId) : null;
    const total = U.sum(p.workflow || [], 'days');
    const acts = [{ label: t('Close') }];
    if (can) acts.push({ label: t(p.status === 'Active' ? 'Suspend procedure' : 'Reactivate'), left: true, onClick: (m) => { const st = p.status === 'Active' ? 'Suspended' : 'Active'; S.update('procedures', p.id, { status: st }); S.log('Changed procedure status', p.code, st); m.close(); ui.toast(t('Procedure status: {s}.', { s: t(st) }), 'success'); refresh(); } }, { label: t('Edit'), icon: 'edit', onClick: (m) => { m.close(); edit(p, refresh); } });
    if (svc && (app.portal || app.can('edit', 'services')) && p.status === 'Active' && p.availability !== 'Counter only') acts.push({ label: t(app.portal ? 'Apply online' : 'Receive application'), variant: 'primary', icon: 'send', onClick: (m) => { m.close(); GA.modules.services.startApplication(svc.id); } });
    ui.modal({ title: esc(t(p.name)), subtitle: `${t('Procedure code')} <span class="code">${esc(p.code)}</span> · ${esc(p.vi)}`, size: 'xl', actions: acts,
      body: `<div class="grid g-2"><div>${ui.dl([['Procedure code', `<span class="code">${esc(p.code)}</span>`], ['Field', t(p.field)], ['Handling unit', esc(ui.dept(p.dept).name)], ['Processing time', `${p.days} ${t('working days')}`], ['Fees and charges', p.fee ? U.vnd(p.fee) : t('Free of charge')], ['Availability', ui.badge(p.availability)], ['Service level', t(p.level)], ['Status', ui.badge(p.status)]])}</div>
        <div>${ui.dl([['Result', t(p.result)], ['Legal basis', esc(t(p.legal))], ['Applicants', t('Vietnamese citizens, foreigners residing in Viet Nam, organisations (as applicable)')], ['Submission channels', p.availability === 'Counter only' ? t('Public Administrative Service Center counter') : t('National Public Service Portal, provincial portal, counter, postal service')]])}</div></div>
        <div class="form-section-title">${t('Required documents')} (${(p.docs || []).length})</div>
        <ol class="small">${(p.docs || []).map((d) => `<li>${esc(t(d))} <span class="xs muted">(${t('1 original or certified copy')})</span></li>`).join('')}</ol>
        <div class="form-section-title">${t('Processing workflow')} · ${t('total')} ${U.num(total)} ${t('working days')}</div>
        ${ui.simpleTable([{ label: 'Step', render: (w) => `<strong>${(p.workflow.indexOf(w) + 1)}.</strong> ${esc(t(w.step))}` }, { label: 'Responsible unit', render: (w) => esc(ui.dept(w.dept).short || t('Handling unit')) }, { label: 'Time', cls: 'right', render: (w) => `${U.num(w.days)} ${t('days')}` }, { label: 'Share', render: (w) => `<div class="progress" style="min-width:90px"><span style="width:${total ? (w.days / total) * 100 : 0}%"></span></div>` }], p.workflow || [])}` });
  }

  function edit(p, refresh) {
    const isNew = !p;
    const fields = [
      { key: 'code', label: 'Procedure code', required: true, pattern: '^\\d\\.\\d{6}(\\.\\d{3}\\.\\d{2}\\.\\d{2}\\.H\\d{2})?$', patternMsg: 'Use the national format, e.g. 1.004194 or 1.004194.000.00.00.H17.', validate: (v) => (S.all('procedures').some((x) => x.code === v && (!p || x.id !== p.id)) ? t('This code is already used.') : ''), readonly: !isNew },
      { key: 'name', label: 'Procedure name (English)', required: true, full: true },
      { key: 'vi', label: 'Tên thủ tục (Vietnamese)', required: true, full: true },
      { key: 'field', label: 'Field', type: 'select', required: true, options: U.uniq(S.all('procedures').map((x) => x.field)) },
      { key: 'dept', label: 'Handling unit', type: 'select', required: true, options: S.all('departments').map((d) => ({ value: d.id, label: d.name })) },
      { key: 'days', label: 'Processing time (working days)', type: 'number', required: true, min: 1 },
      { key: 'fee', label: 'Fee (₫)', type: 'number', min: 0, default: 0 },
      { key: 'availability', label: 'Availability', type: 'select', required: true, noBlank: true, options: AVAIL },
      { key: 'level', label: 'Service level', type: 'select', required: true, noBlank: true, options: ['Full online', 'Partial online', 'Information only'] },
      { key: 'legal', label: 'Legal basis', full: true },
      { key: 'docsText', label: 'Required documents (one per line)', type: 'textarea', required: true, full: true, rows: 4 },
    ];
    const v = p ? Object.assign(U.clone(p), { docsText: (p.docs || []).join('\n') }) : { availability: 'Online & counter', level: 'Partial online', dept: 'D01' };
    ui.formModal({ title: isNew ? t('Add administrative procedure') : t('Edit procedure'), subtitle: p ? esc(p.code) : t('Published after approval by the Office of the People\'s Committee'), size: 'xl', fields, values: v, submitLabel: isNew ? t('Add procedure') : t('Save changes'),
      onSubmit: (x) => {
        const docs = x.docsText.split('\n').map((s) => s.trim()).filter(Boolean); delete x.docsText;
        const wf = [{ step: 'Receive and check application', days: Math.max(0.5, Math.round(x.days * 0.1 * 2) / 2), dept: 'D01' }, { step: 'Appraise dossier', days: Math.max(1, Math.round(x.days * 0.6)), dept: x.dept }, { step: 'Approve and sign result', days: Math.max(0.5, Math.round(x.days * 0.2 * 2) / 2), dept: x.dept }, { step: 'Return result', days: 0.5, dept: 'D01' }];
        if (isNew) { const rec = Object.assign({ id: S.nextId('procedures', 'PR-', 3), status: 'Active', serviceId: '', result: 'Administrative decision / certificate', docs, workflow: wf }, x); S.insert('procedures', rec); S.log('Added procedure', rec.code, rec.name); ui.toast(t('Procedure added.'), 'success'); }
        else { S.update('procedures', p.id, Object.assign(x, { docs, workflow: x.days !== p.days ? wf : p.workflow })); S.log('Updated procedure', p.code, p.name); ui.toast(t('Procedure updated.'), 'success'); }
        refresh();
      } });
  }

  function render(el, params, q) {
    const app = GA.app, can = app.can('edit', 'procedures');
    const all = S.all('procedures');
    const refresh = () => render(el, params, {});
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('Administrative procedures') }], title: t('Administrative procedures'), subtitle: t('Procedures published under the jurisdiction of {org}', { org: esc(S.setting('orgName')) }), actions: can ? `<button class="btn btn-primary" id="pr-new">${icon('plus')}${t('Add procedure')}</button>` : '' })}
      ${ui.kpis([
        { label: 'Published procedures', value: all.length, meta: `${all.filter((p) => p.status === 'Active').length} ${t('active')}`, icon: 'list' },
        { label: 'Fully online', value: all.filter((p) => p.level === 'Full online').length, meta: U.pct(all.filter((p) => p.level === 'Full online').length, all.length) + '% ' + t('of catalogue'), icon: 'globe', color: 'var(--ok)' },
        { label: 'Counter only', value: all.filter((p) => p.availability === 'Counter only').length, icon: 'building', color: 'var(--gold)' },
        { label: 'Average processing time', value: (U.sum(all, 'days') / Math.max(1, all.length)).toFixed(1).replace('.', ',') + '<small> ' + t('days') + '</small>', icon: 'clock' },
      ], 'compact')}
      <div class="panel"><div class="panel-body flush" id="pr-t"></div></div>`;
    ui.table(U.$('#pr-t', el), { rows: () => S.all('procedures'), exportName: 'procedures', searchKeys: ['code', 'name', 'vi', 'field', (p) => t(p.name)], searchPlaceholder: t('Search by code or procedure name'),
      filters: [{ key: 'field', label: 'Field', all: 'All fields', options: () => U.uniq(S.all('procedures').map((p) => p.field)) }, { key: 'dept', label: 'Handling unit', all: 'All units', options: () => U.uniq(S.all('procedures').map((p) => p.dept)).map((d) => ({ value: d, label: ui.dept(d).short })) }, { key: 'availability', label: 'Availability', all: 'Any availability', options: AVAIL }, { key: 'status', label: 'Status', all: 'All statuses', options: ['Active', 'Under amendment', 'Suspended'] }],
      defaultSort: 'code', defaultDir: 'asc',
      columns: [
        { key: 'code', label: 'Code', cls: 'code', render: (p) => `<span class="strong">${esc(p.code)}</span>` },
        { key: 'name', label: 'Procedure', render: (p) => `${esc(t(p.name))}<span class="sub">${esc(p.vi)}</span>` },
        { key: 'field', label: 'Field', render: (p) => t(p.field) },
        { key: 'dept', label: 'Handling unit', render: (p) => `<span class="small">${esc(ui.dept(p.dept).short)}</span>`, csv: (p) => ui.dept(p.dept).name },
        { key: 'days', label: 'Time', cls: 'right', render: (p) => `${p.days} ${t('days')}` },
        { key: 'fee', label: 'Fee', cls: 'right', render: (p) => (p.fee ? U.vnd(p.fee) : t('Free')), csv: (p) => p.fee },
        { key: 'availability', label: 'Availability', render: (p) => ui.badge(p.availability) },
        { key: 'status', label: 'Status', render: (p) => ui.badge(p.status) },
      ],
      onRowClick: (p) => detail(p, refresh), rowActions: () => [{ id: 'v', label: 'View', icon: 'eye' }].concat(can ? [{ id: 'e', label: 'Edit', icon: 'edit' }] : []), onAction: (id, p) => (id === 'v' ? detail(p, refresh) : edit(p, refresh)) });
    const nb = U.$('#pr-new', el); if (nb) nb.onclick = () => edit(null, refresh);
    if (q.code) { const p = all.find((x) => x.code === q.code); if (p) setTimeout(() => { M.clearQuery(); detail(p, refresh); }, 40); }
  }

  GA.modules.procedures = { render };
})(window.GA);
