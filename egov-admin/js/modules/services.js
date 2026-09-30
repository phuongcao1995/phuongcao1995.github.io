/* Public service portal: applications (list, detail, workflow), service catalog, online appointments, submission wizard. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;
  const STATUSES = ['Draft', 'Submitted', 'Under Review', 'Additional Information Required', 'Approved', 'Rejected', 'Completed'];
  const LOCS = ['PASC Counter area A (civil status & residence)', 'PASC Counter area B (land & construction)', 'PASC Counter area C (enterprise & investment)', "Hải Châu Ward People's Committee, one-stop desk"];
  const SLOTS = ['07:30', '08:30', '09:30', '10:30', '13:30', '14:30', '15:30', '16:30'];
  const svcOf = (a) => S.find('services', a.serviceId) || {};

  /* ---------- Status transitions ---------- */
  function transition(a, status, note, extra) {
    const by = GA.app.user.name;
    a.history.push({ time: U.nowIso(), status, by, note: note || '' });
    S.update('applications', a.id, Object.assign({ status, history: a.history }, extra || {}));
    S.log('Updated application status', a.id, status);
    const msgs = { 'Under Review': 'Your application is being reviewed', 'Additional Information Required': 'Additional documents required', Approved: 'Your application was approved', Rejected: 'Your application was not approved', Completed: 'Your result is ready' };
    if (msgs[status] && !GA.app.portal) S.notify({ audience: a.applicantId, title: msgs[status], body: `${a.code}: ${a.serviceName}${note ? '. ' + note : ''}`, type: status === 'Rejected' ? 'error' : status === 'Additional Information Required' ? 'warning' : 'success', link: '#/services/' + a.id });
    if (GA.app.portal && (status === 'Submitted' || status === 'Under Review')) S.notify({ audience: 'staff', title: status === 'Submitted' ? 'New online application' : 'Applicant provided additional information', body: `${a.code}: ${a.serviceName} (${a.applicantName})`, type: 'info', link: '#/services/' + a.id });
  }

  /* ---------- Submission wizard ---------- */
  function startApplication(serviceId, draft) {
    const app = GA.app, portal = app.portal;
    const biz = app.user.businessId ? S.find('businesses', app.user.businessId) : null;
    const st = { step: serviceId ? 1 : 0, serviceId: serviceId || '', applicantId: '', files: {}, delivery: 'Online (electronic result)', pay: 'Online payment (VNPay-style gateway)', note: '', q: '' };
    if (draft) { st.serviceId = draft.serviceId; st.step = 1; st.applicantId = draft.applicantId; draft.documents.forEach((d, i) => { if (d.status !== 'Missing') st.files[i] = d.file; }); }
    if (portal) st.applicantId = (svcOf({ serviceId: st.serviceId }).business && biz) ? biz.id : app.user.subjectId;
    const steps = ['Choose service', 'Applicant and documents', 'Review and submit'];
    let m;
    const avail = () => S.all('services').filter((s) => !portal || !s.business || biz);
    const applicant = () => S.find('citizens', st.applicantId) || S.find('businesses', st.applicantId);

    function body() {
      const s = S.find('services', st.serviceId);
      const head = `<div class="wizard-steps">${steps.map((x, i) => `<div class="${i === st.step ? 'on' : i < st.step ? 'done' : ''}">${i + 1}. ${t(x)}</div>`).join('')}</div>`;
      if (st.step === 0) {
        const q = U.norm(st.q);
        const list = avail().filter((x) => !q || U.norm(x.name + ' ' + x.vi + ' ' + x.field + ' ' + x.code).includes(q));
        return head + `<div class="dt-search mb-1" style="max-width:none">${icon('search')}<input type="search" id="wz-q" value="${esc(st.q)}" placeholder="${t('Search services')}" aria-label="${t('Search services')}"></div>
          <div class="svc-pick" role="radiogroup" aria-label="${t('Choose service')}">${list.map((x) => `<label><input type="radio" name="svc" value="${x.id}" ${x.id === st.serviceId ? 'checked' : ''}><span><span class="strong">${esc(t(x.name))}</span><span class="xs muted" style="display:block">${esc(x.vi)} · ${t(x.field)} · ${x.days} ${t('working days')} · ${x.fee ? U.vnd(x.fee) : t('Free of charge')}</span></span></label>`).join('') || ui.empty('No services match your search.')}</div><div class="err" id="wz-err" style="display:none;color:var(--bad)">${t('Choose a service to continue.')}</div>`;
      }
      if (st.step === 1) {
        const who = applicant();
        const pick = portal ? `<div class="review-box mb-2">${ui.dl([['Applicant', `<strong>${esc(who ? who.fullName || who.name : '')}</strong>`], [who && who.cid ? 'Citizen ID' : 'Enterprise code', `<span class="code">${esc(who ? who.cid || who.code : '')}</span>`], ['Address', esc(U.address(who))]])}<div class="xs muted mt-1">${t('Details are filled in from your e-ID and the national population database.')}</div></div>`
          : `<div class="field mb-2"><label for="wz-app">${t('Applicant')}<span class="req">*</span></label><select id="wz-app"><option value="">${t('Select…')}</option>${(s.business ? S.all('businesses').map((b) => ({ value: b.id, label: b.name + ' · ' + b.code })) : S.all('citizens').filter((c) => c.status !== 'Deceased').map((c) => ({ value: c.id, label: c.fullName + ' · ' + c.cid }))).map((o) => `<option value="${o.value}" ${o.value === st.applicantId ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select><div class="help">${t('Receiving at the counter on behalf of the applicant.')}</div></div>`;
        return head + `<div class="callout mb-2">${icon('info')}<div><strong>${esc(t(s.name))}</strong> · ${t('Procedure code')} ${esc(s.code)}<div class="small">${t('Processing time')}: ${s.days} ${t('working days')} · ${t('Fee')}: ${s.fee ? U.vnd(s.fee) : t('Free of charge')} · ${esc(GA.ui.dept(s.dept).name)}</div></div></div>${pick}
          <div class="form-section-title">${t('Required documents')}</div>
          ${s.docs.map((d, i) => `<div class="doc-check"><span class="l-ic ${st.files[i] ? 'ok' : ''}">${icon(st.files[i] ? 'check' : 'file', 'i-sm')}</span><span class="dc-name">${esc(t(d))}${st.files[i] ? `<span class="xs muted" style="display:block">${esc(st.files[i])}</span>` : ''}</span>
            <label class="btn btn-sm">${icon('upload', 'i-sm')}${t(st.files[i] ? 'Replace' : 'Attach')}<input type="file" data-doc="${i}" accept=".pdf,.jpg,.jpeg,.png" class="sr-only"></label>
            <button class="btn btn-sm btn-ghost" data-sample="${i}" type="button">${t('Use sample file')}</button></div>`).join('')}
          <div class="xs muted mt-1">${t('Accepted: PDF, JPG, PNG up to 10 MB. Files stay in this browser (demo).')}</div>
          <div class="err" id="wz-err" style="display:none;color:var(--bad)"></div>`;
      }
      const who = applicant();
      return head + `<div class="review-box">${ui.dl([['Service', `<strong>${esc(t(s.name))}</strong>`], ['Applicant', esc(who.fullName || who.name)], ['Handling unit', esc(GA.ui.dept(s.dept).name)], ['Documents attached', `${Object.keys(st.files).length} / ${s.docs.length}`], ['Expected result by', U.date(U.addDays(U.today(), Math.ceil(s.days * 1.4)))], ['Fee', s.fee ? U.vnd(s.fee) : t('Free of charge')]])}</div>
        <div class="form-grid mt-2"><div class="field"><label for="wz-del">${t('Result delivery')}</label><select id="wz-del">${M.selectOpts(['Online (electronic result)', 'Collect at the counter', 'Postal delivery (VNPost)'], st.delivery)}</select></div>
        ${s.fee ? `<div class="field"><label for="wz-pay">${t('Payment method')}</label><select id="wz-pay">${M.selectOpts(['Online payment (VNPay-style gateway)', 'Bank transfer', 'Pay at the counter'], st.pay)}</select></div>` : ''}
        <div class="field full"><label for="wz-note">${t('Note to the processing officer')}</label><textarea id="wz-note" rows="2">${esc(st.note)}</textarea></div>
        <label class="check full"><input type="checkbox" id="wz-ok"><span>${t('I declare that the information provided is accurate and take responsibility under the law.')}</span></label></div>
        <div class="err" id="wz-err" style="display:none;color:var(--bad)">${t('Confirm the declaration to submit.')}</div>`;
    }
    function actions() {
      const a = [{ label: t('Cancel') }];
      if (st.step > 0) a.push({ label: t('Back'), left: true, icon: 'chevL', onClick: () => { st.step--; draw(); } });
      if (st.step >= 1 && portal) a.push({ label: t('Save draft'), onClick: () => save('Draft') });
      a.push(st.step < 2 ? { label: t('Continue'), variant: 'primary', onClick: next } : { label: t('Submit application'), variant: 'primary', icon: 'send', onClick: () => { if (!U.$('#wz-ok', m.el).checked) { U.$('#wz-err', m.el).style.display = 'block'; return; } collect(); save('Submitted'); } });
      return a;
    }
    function collect() {
      const d = U.$('#wz-del', m.el), p = U.$('#wz-pay', m.el), n = U.$('#wz-note', m.el);
      if (d) st.delivery = d.value; if (p) st.pay = p.value; if (n) st.note = n.value.trim();
    }
    function next() {
      if (st.step === 0) {
        const r = U.$('input[name=svc]:checked', m.el);
        if (!r) { U.$('#wz-err', m.el).style.display = 'block'; return; }
        st.serviceId = r.value;
        if (portal) st.applicantId = S.find('services', st.serviceId).business && biz ? biz.id : app.user.subjectId;
      } else if (st.step === 1) {
        const sel = U.$('#wz-app', m.el); if (sel) st.applicantId = sel.value;
        const s = S.find('services', st.serviceId), err = U.$('#wz-err', m.el);
        if (!st.applicantId) { err.textContent = t('Select the applicant.'); err.style.display = 'block'; return; }
        const missing = s.docs.filter((_, i) => !st.files[i]);
        if (missing.length) { err.textContent = t('Attach all required documents. Missing: {list}', { list: missing.map((x) => t(x)).join('; ') }); err.style.display = 'block'; return; }
      }
      st.step++; draw();
    }
    function save(status) {
      const sel = m && U.$('#wz-app', m.el); if (sel) st.applicantId = sel.value;
      const s = S.find('services', st.serviceId), who = applicant();
      if (!who) { ui.toast(t('Select the applicant.'), 'error'); return; }
      const now = U.nowIso();
      const documents = s.docs.map((d, i) => ({ name: d, file: st.files[i] || '', status: st.files[i] ? (status === 'Draft' ? 'Uploaded' : 'Received') : 'Missing' }));
      if (draft) {
        draft.documents = documents; S.update('applications', draft.id, { documents, submittedAt: now, deadline: U.addDays(U.today(), Math.ceil(s.days * 1.4)), note: st.note, delivery: st.delivery });
        if (status === 'Submitted') transition(draft, 'Submitted', t('Application submitted online.'));
        m.close(); ui.toast(t('Application {code} submitted.', { code: draft.code }), 'success'); app.refresh(); return;
      }
      const d = new Date();
      const code = `000.00.${String(10 + (+s.dept.slice(1))).padStart(2, '0')}.H17-${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(S.all('applications').length + 1).padStart(4, '0')}`;
      const rec = { id: S.nextId('applications', 'APP-'), code, serviceId: s.id, serviceName: s.name, field: s.field, dept: s.dept, applicantId: who.id, applicantName: who.fullName || who.name, applicantType: who.cid ? 'Citizen' : 'Business',
        submittedAt: now, deadline: U.addDays(U.today(), Math.ceil(s.days * 1.4)), status: 'Draft', officerId: '', channel: portal ? 'Online' : 'Counter', fee: s.fee, paid: !s.fee || st.pay !== 'Pay at the counter', documents, history: [], note: st.note, delivery: st.delivery, resultNo: '', createdAt: now };
      rec.history.push({ time: now, status: 'Draft', by: app.user.name, note: portal ? 'Draft saved by the applicant.' : 'Received at the counter.' });
      S.insert('applications', rec);
      if (status === 'Submitted') transition(rec, 'Submitted', portal ? 'Application received via the online public service portal.' : 'Application received at the one-stop counter.');
      else S.log('Saved application draft', rec.id, s.name);
      m.close();
      ui.toast(status === 'Draft' ? t('Draft saved. You can continue later from My applications.') : t('Application {code} submitted. Expected result by {date}.', { code, date: U.date(rec.deadline) }), 'success');
      app.go('#/services/' + rec.id);
    }
    function draw() {
      if (!m) m = ui.modal({ title: t('New application'), subtitle: t('Online public service'), size: 'lg', body: body(), actions: actions(), sticky: true });
      else {
        m.body.innerHTML = body();
        const acts = actions();
        const foot = m.el.querySelector('.modal-foot');
        foot.innerHTML = acts.map((a, i) => `<button class="btn ${a.variant ? 'btn-' + a.variant : ''} ${a.left ? 'left' : ''}" data-act="${i}">${a.icon ? icon(a.icon) : ''}${a.label}</button>`).join('');
        U.$$('[data-act]', foot).forEach((b) => { b.onclick = () => { const x = acts[+b.dataset.act]; if (x.onClick) x.onClick(m); else m.close(); }; });
      }
      const q = U.$('#wz-q', m.el);
      if (q) { q.oninput = U.debounce(() => { const r = U.$('input[name=svc]:checked', m.el); if (r) st.serviceId = r.value; st.q = q.value; draw(); const nq = U.$('#wz-q', m.el); nq.focus(); nq.setSelectionRange(nq.value.length, nq.value.length); }, 200); }
      U.$$('[data-doc]', m.el).forEach((inp) => inp.onchange = () => { if (inp.files[0]) { if (inp.files[0].size > 10485760) { ui.toast(t('File is larger than 10 MB.'), 'error'); return; } keepApplicant(); st.files[inp.dataset.doc] = inp.files[0].name; draw(); } });
      U.$$('[data-sample]', m.el).forEach((b) => b.onclick = () => { keepApplicant(); const s = S.find('services', st.serviceId); st.files[b.dataset.sample] = s.docs[b.dataset.sample].replace(/[^A-Za-z]+/g, '_').slice(0, 28).toLowerCase() + '.pdf'; draw(); });
    }
    function keepApplicant() { const sel = U.$('#wz-app', m.el); if (sel) st.applicantId = sel.value; }
    draw();
  }

  /* ---------- Appointment booking ---------- */
  function book(done, appId) {
    const app = GA.app, portal = app.portal;
    const mine = portal ? M.scoped('applications') : S.all('applications');
    const days = []; let d = U.today();
    while (days.length < 10) { d = U.addDays(d, 1); const w = new Date(d).getDay(); if (w !== 0 && w !== 6) days.push(d); }
    const state = { date: days[0], loc: LOCS[0] };
    const taken = () => S.where('appointments', (a) => a.date === state.date && a.location === state.loc && a.status === 'Booked').map((a) => a.slot);
    const slotHTML = () => `<div class="slot-grid" role="radiogroup" aria-label="${t('Time slot')}">${SLOTS.map((s) => { const full = taken().includes(s); return `<label class="${full ? 'full' : ''}"><input type="radio" name="slot" value="${s}" ${full ? 'disabled' : ''}><span>${s}</span></label>`; }).join('')}</div>`;
    const m = ui.modal({ title: t('Book an appointment'), subtitle: t('Public Administrative Service Center'), size: 'lg',
      body: `<form class="form-grid" novalidate>
        ${portal ? '' : `<div class="field full"><label for="ap-who">${t('Citizen')}<span class="req">*</span></label><select id="ap-who"><option value="">${t('Select…')}</option>${S.all('citizens').map((c) => `<option value="${c.id}">${esc(c.fullName)} · ${esc(c.cid)}</option>`).join('')}</select><div class="err"></div></div>`}
        <div class="field full"><label for="ap-app">${t('Related application')}</label><select id="ap-app"><option value="">${t('None (general enquiry)')}</option>${mine.filter((a) => a.status !== 'Draft').map((a) => `<option value="${a.id}" ${a.id === appId ? 'selected' : ''}>${esc(a.code)} · ${esc(t(a.serviceName))}</option>`).join('')}</select></div>
        <div class="field"><label for="ap-purpose">${t('Purpose')}</label><select id="ap-purpose">${M.selectOpts(['Submit original documents', 'Receive result', 'Consultation on procedure', 'Supplement dossier'])}</select></div>
        <div class="field"><label for="ap-loc">${t('Location')}</label><select id="ap-loc">${M.selectOpts(LOCS, state.loc)}</select></div>
        <div class="field full"><label>${t('Date')}</label><div class="flex flex-wrap" id="ap-days">${days.map((x, i) => `<button type="button" class="chip" data-day="${x}" aria-pressed="${i === 0}">${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(x).getDay()]} ${U.date(x).slice(0, 5)}</button>`).join('')}</div></div>
        <div class="field full" data-field="slot"><label>${t('Time slot')}<span class="req">*</span></label><div id="ap-slots">${slotHTML()}</div><div class="err">${t('Choose an available time slot.')}</div></div>
      </form>`,
      actions: [{ label: t('Cancel') }, { label: t('Confirm booking'), variant: 'primary', icon: 'calendar', onClick: (mm) => {
        const f = mm.el.querySelector('form'), slot = U.$('input[name=slot]:checked', f);
        const who = portal ? app.me() : S.find('citizens', U.$('#ap-who', f).value);
        if (!portal && !who) { U.$('#ap-who', f).closest('.field').classList.add('invalid'); U.$('#ap-who', f).closest('.field').querySelector('.err').textContent = t('This field is required.'); return; }
        if (!slot) { f.querySelector('[data-field=slot]').classList.add('invalid'); return; }
        const rel = S.find('applications', U.$('#ap-app', f).value);
        const rec = { id: S.nextId('appointments', 'APT-'), applicantId: rel ? rel.applicantId : who.id, applicantName: rel ? rel.applicantName : who.fullName, purpose: t(U.$('#ap-purpose', f).value) + (rel ? ': ' + rel.serviceName : ''), appId: rel ? rel.id : '', location: state.loc, date: state.date, slot: slot.value, status: 'Booked', ticket: 'B' + String(S.all('appointments').length + 101).padStart(3, '0') };
        S.insert('appointments', rec); S.log('Booked appointment', rec.id, rec.ticket);
        S.notify({ audience: rec.applicantId, title: 'Appointment confirmed', body: `Ticket ${rec.ticket} on ${U.date(rec.date)} at ${rec.slot}, ${rec.location}.`, type: 'success', link: '#/services?tab=appointments' });
        mm.close(); ui.toast(t('Appointment booked. Ticket {n} on {d} at {s}.', { n: rec.ticket, d: U.date(rec.date), s: rec.slot }), 'success'); if (done) done();
      } }] });
    const redraw = () => { U.$('#ap-slots', m.el).innerHTML = slotHTML(); };
    U.$$('[data-day]', m.el).forEach((b) => b.onclick = () => { U.$$('[data-day]', m.el).forEach((x) => x.setAttribute('aria-pressed', x === b)); state.date = b.dataset.day; redraw(); });
    U.$('#ap-loc', m.el).onchange = (e) => { state.loc = e.target.value; redraw(); };
  }

  /* ---------- List page ---------- */
  function list(el, q) {
    const app = GA.app, portal = app.portal, canEdit = app.can('edit', 'services');
    const apps = M.scoped('applications');
    const open = apps.filter((a) => M.OPEN_APP.includes(a.status));
    const overdue = open.filter((a) => a.deadline < U.today());
    const done = apps.filter((a) => a.status === 'Completed');
    const onTime = done.filter((a) => { const h = a.history.find((x) => x.status === 'Completed'); return h && h.time.slice(0, 10) <= a.deadline; }).length;
    const active = q.tab || 'apps';
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t(portal ? 'My applications' : 'Public services') }], title: t(portal ? 'My applications' : 'Public service portal'), subtitle: portal ? t('Track applications, provide documents and book appointments.') : t('Applications received online and at one-stop counters, service catalog and appointments.'),
      actions: `<button class="btn" id="bk">${icon('calendar')}${t('Book appointment')}</button>${portal || canEdit ? `<button class="btn btn-primary" id="new-app">${icon('plus')}${t(portal ? 'Submit new application' : 'Receive application')}</button>` : ''}` })}
      ${ui.kpis(portal ? [
        { label: 'Total applications', value: apps.length, icon: 'file' },
        { label: 'In progress', value: open.length, icon: 'clock', color: 'var(--gold)' },
        { label: 'Needs your action', value: apps.filter((a) => a.status === 'Additional Information Required' || a.status === 'Draft').length, icon: 'alert', color: 'var(--red)' },
        { label: 'Completed', value: done.length, icon: 'checkcircle', color: 'var(--ok)' },
      ] : [
        { label: 'Received (register)', value: apps.filter((a) => a.status !== 'Draft').length, meta: `${apps.filter((a) => a.submittedAt.slice(0, 7) === U.today().slice(0, 7) && a.status !== 'Draft').length} ${t('this month')}`, icon: 'file' },
        { label: 'Being processed', value: open.length, meta: `${apps.filter((a) => a.status === 'Additional Information Required').length} ${t('awaiting applicant')}`, icon: 'clock', color: 'var(--gold)' },
        { label: 'Overdue', value: overdue.length, meta: t('Past the processing deadline'), icon: 'alert', color: 'var(--red)' },
        { label: 'Completed on time', value: done.length ? U.pct(onTime, done.length) + '%' : '—', meta: `${onTime} / ${done.length} ${t('completed')}`, icon: 'checkcircle', color: 'var(--ok)' },
      ], 'compact')}
      ${ui.tabs([
        { id: 'apps', label: portal ? 'My applications' : 'Applications', icon: 'file', count: apps.length, content: '<div class="panel"><div class="panel-body flush" id="app-table"></div></div>' },
        { id: 'catalog', label: 'Service catalog', icon: 'layers', count: S.all('services').length, content: '<div id="catalog"></div>' },
        { id: 'appointments', label: 'Appointments', icon: 'calendar', count: M.scoped('appointments').filter((a) => a.status === 'Booked').length, content: '<div class="panel"><div class="panel-body flush" id="apt-table"></div></div>' },
      ], { cls: 'page-tabs', active, id: 'svc' })}`;

    const dt = ui.table(U.$('#app-table', el), {
      rows: () => M.scoped('applications'), exportName: 'applications', caption: t('Applications'),
      searchKeys: ['code', 'applicantName', 'serviceName', (a) => t(a.serviceName)], searchPlaceholder: t('Search by application code, applicant or service'),
      filters: [
        { key: 'status', label: 'Status', all: 'All statuses', options: STATUSES },
        { key: 'field', label: 'Field', all: 'All fields', options: () => U.uniq(S.all('services').map((s) => s.field)) },
        portal ? null : { key: 'dept', label: 'Department', all: 'All departments', options: () => U.uniq(S.all('applications').map((a) => a.dept)).map((d) => ({ value: d, label: ui.dept(d).short })) },
        portal ? null : { key: 'due', label: 'Deadline', all: 'Any deadline', options: [{ value: 'overdue', label: t('Overdue') }, { value: 'soon', label: t('Due within 2 days') }], match: (a, v) => M.OPEN_APP.includes(a.status) && (v === 'overdue' ? a.deadline < U.today() : a.deadline >= U.today() && U.daysBetween(U.today(), a.deadline) <= 2) },
      ].filter(Boolean),
      initialFilters: q.status ? { status: q.status } : undefined,
      dateKey: 'submittedAt', dateLabel: 'Submitted from', defaultSort: 'submittedAt',
      columns: [
        { key: 'code', label: 'Application code', render: (a) => `<a class="strong code" href="#/services/${a.id}">${esc(a.code)}</a><span class="sub">${t(a.channel)}</span>`, csv: (a) => a.code },
        { key: 'serviceName', label: 'Service', render: (a) => `${esc(t(a.serviceName))}<span class="sub">${t(a.field)}</span>` },
        portal ? null : { key: 'applicantName', label: 'Applicant', render: (a) => `${esc(a.applicantName)}<span class="sub">${t(a.applicantType)}</span>` },
        { key: 'submittedAt', label: 'Submitted', render: (a) => (a.status === 'Draft' ? `<span class="muted">${t('Not submitted')}</span>` : U.dateTime(a.submittedAt)), csv: (a) => U.dateTime(a.submittedAt) },
        { key: 'deadline', label: 'Deadline', render: (a) => (a.status === 'Draft' ? '—' : U.deadline(a.deadline, M.DONE_APP.includes(a.status))), csv: (a) => U.date(a.deadline) },
        portal ? null : { key: 'officerId', label: 'Processing officer', render: (a) => `${ui.officerName(a.officerId)}<span class="sub">${esc(ui.dept(a.dept).short)}</span>`, sort: (a) => (ui.officer(a.officerId) || {}).name || 'zz', csv: (a) => (ui.officer(a.officerId) || {}).name || '' },
        { key: 'status', label: 'Status', render: (a) => ui.badge(a.status) + (a.awaitingApproval && a.status === 'Under Review' ? `<span class="sub">${t('Awaiting approval')}</span>` : '') },
      ].filter(Boolean),
      rowActions: () => [{ id: 'view', label: 'Open', icon: 'eye' }],
      onRowClick: (a) => app.go('#/services/' + a.id), onAction: (id, a) => app.go('#/services/' + a.id),
    });

    /* Catalog */
    const cat = U.$('#catalog', el); let field = '';
    const drawCat = () => {
      const svcs = S.all('services').filter((s) => !field || s.field === field);
      const fields = U.uniq(S.all('services').map((s) => s.field));
      cat.innerHTML = `<div class="catalog-filters" role="group" aria-label="${t('Filter by field')}"><button class="chip" data-field="" aria-pressed="${!field}">${t('All fields')}</button>${fields.map((f) => `<button class="chip" data-field="${esc(f)}" aria-pressed="${f === field}">${t(f)}</button>`).join('')}</div>
        <div class="catalog">${svcs.map((s) => `<article class="svc"><div class="svc-field">${t(s.field)} · ${esc(s.code)}</div><div class="svc-name">${esc(t(s.name))}</div><div class="svc-vi">${esc(s.vi)}</div>
          <div class="svc-facts"><span>${icon('clock', 'i-sm')}${s.days} ${t('working days')}</span><span>${icon('coins', 'i-sm')}${s.fee ? U.vnd(s.fee) : t('Free of charge')}</span><span>${icon('file', 'i-sm')}${s.docs.length} ${t('documents')}</span></div>
          <div>${ui.badge(s.level === 'Full online' ? 'Online' : 'Online & counter', s.level)} <span class="tag">${esc(ui.dept(s.dept).short)}</span></div>
          <div class="svc-foot">${portal || canEdit ? `<button class="btn btn-primary btn-sm" data-apply="${s.id}">${t(portal ? 'Apply online' : 'Receive')}</button>` : ''}<button class="btn btn-sm" data-info="${s.id}">${t('Requirements')}</button></div></article>`).join('')}</div>`;
      U.$$('[data-field]', cat).forEach((b) => b.onclick = () => { field = b.dataset.field; drawCat(); });
      U.$$('[data-apply]', cat).forEach((b) => b.onclick = () => startApplication(b.dataset.apply));
      U.$$('[data-info]', cat).forEach((b) => b.onclick = () => {
        const s = S.find('services', b.dataset.info), pr = S.all('procedures').find((p) => p.serviceId === s.id);
        ui.modal({ title: esc(t(s.name)), subtitle: esc(s.vi) + ' · ' + esc(s.code), size: 'lg', body: ui.dl([['Field', t(s.field)], ['Handling unit', esc(ui.dept(s.dept).name)], ['Processing time', s.days + ' ' + t('working days')], ['Fee', s.fee ? U.vnd(s.fee) : t('Free of charge')], ['Service level', t(s.level)], ['Legal basis', pr ? esc(t(pr.legal)) : '—']]) + `<div class="form-section-title">${t('Required documents')}</div><ol class="small">${s.docs.map((d) => `<li>${esc(t(d))}</li>`).join('')}</ol>`,
          actions: [{ label: t('Close') }].concat(pr && app.canView('procedures') ? [{ label: t('View procedure'), onClick: (mm) => { mm.close(); app.go('#/procedures?code=' + pr.code); } }] : []).concat(portal || canEdit ? [{ label: t(portal ? 'Apply online' : 'Receive'), variant: 'primary', onClick: (mm) => { mm.close(); startApplication(s.id); } }] : []) });
      });
    };
    drawCat();

    /* Appointments */
    const at = ui.table(U.$('#apt-table', el), {
      rows: () => M.scoped('appointments'), exportName: 'appointments', caption: t('Appointments'),
      searchKeys: ['ticket', 'applicantName', 'purpose', 'location'], searchPlaceholder: t('Search by ticket, citizen or purpose'),
      filters: [{ key: 'status', label: 'Status', all: 'All statuses', options: ['Booked', 'Completed', 'Cancelled', 'No-show'] }, { key: 'location', label: 'Location', all: 'All locations', options: LOCS }],
      dateKey: 'date', dateLabel: 'Date from', defaultSort: 'date', defaultDir: 'desc',
      columns: [
        { key: 'ticket', label: 'Ticket', render: (a) => `<span class="strong code">${esc(a.ticket)}</span>` },
        { key: 'date', label: 'Date and time', render: (a) => `${U.date(a.date)}<span class="sub">${esc(a.slot)}</span>`, sort: (a) => a.date + a.slot },
        portal ? null : { key: 'applicantName', label: 'Citizen' },
        { key: 'purpose', label: 'Purpose', render: (a) => `${esc(a.purpose)}${a.appId ? `<span class="sub"><a href="#/services/${a.appId}">${t('Open application')}</a></span>` : ''}` },
        { key: 'location', label: 'Location', render: (a) => `<span class="small">${esc(t(a.location))}</span>` },
        { key: 'status', label: 'Status', render: (a) => ui.badge(a.status === 'Completed' ? 'Checked in' : a.status, a.status) },
      ].filter(Boolean),
      rowActions: (a) => (a.status !== 'Booked' ? [] : (portal ? [] : [{ id: 'in', label: 'Check in', icon: 'check' }, { id: 'ns', label: 'Mark no-show', icon: 'x' }]).concat([{ id: 'cancel', label: 'Cancel appointment', icon: 'trash', danger: true }])),
      onAction: async (id, a, d) => {
        if (id === 'cancel') { const ok = await ui.confirm({ title: t('Cancel appointment'), message: t('Cancel ticket {n} on {d} at {s}?', { n: a.ticket, d: U.date(a.date), s: a.slot }), danger: true, confirmLabel: t('Cancel appointment') }); if (!ok) return; S.update('appointments', a.id, { status: 'Cancelled' }); ui.toast(t('Appointment cancelled.'), 'success'); }
        if (id === 'in') { S.update('appointments', a.id, { status: 'Completed' }); ui.toast(t('Checked in. Ticket {n} is in the queue.', { n: a.ticket }), 'success'); }
        if (id === 'ns') { S.update('appointments', a.id, { status: 'No-show' }); ui.toast(t('Marked as no-show.'), 'info'); }
        S.log('Updated appointment', a.id, id); d.refresh();
      },
    });
    const na = U.$('#new-app', el); if (na) na.onclick = () => startApplication();
    U.$('#bk', el).onclick = () => book(() => { at.refresh(); const b = U.$('[data-tab=appointments]', el); if (b) b.click(); });
    ui.bindTabs(el); void dt;
  }

  /* ---------- Detail page ---------- */
  function stepsFor(a) {
    const h = (s) => a.history.find((x) => x.status === s);
    const st = a.status;
    const idx = { Draft: 0, Submitted: 1, 'Under Review': 2, 'Additional Information Required': 2, Approved: 3, Rejected: 3, Completed: 4 }[st];
    const when = (s) => (h(s) ? U.date(h(s).time) : '');
    return [
      { label: 'Submitted', sub: when('Submitted'), state: idx >= 1 ? 'done' : 'current' },
      { label: st === 'Additional Information Required' ? 'Additional information' : 'Under Review', sub: when('Under Review'), state: st === 'Additional Information Required' ? 'warn' : idx > 2 ? 'done' : idx === 2 ? 'current' : '' },
      { label: st === 'Rejected' ? 'Rejected' : 'Decision', sub: when('Approved') || when('Rejected'), state: st === 'Rejected' ? 'failed' : idx > 3 || st === 'Approved' ? 'done' : '' },
      { label: 'Result returned', sub: when('Completed'), state: st === 'Completed' ? 'done' : st === 'Approved' ? 'current' : '' },
    ];
  }

  function detail(el, id) {
    const a = S.find('applications', id);
    const app = GA.app, portal = app.portal;
    if (!a || (portal && !app.owns(a.applicantId))) { el.innerHTML = ui.pageHeader({ crumbs: [{ label: t('Public services'), href: '#/services' }], title: t('Application not found') }) + ui.empty('This application does not exist or you do not have access to it.', `<a class="btn mt-1" href="#/services">${t('Back to list')}</a>`); return; }
    const s = svcOf(a), canEdit = app.can('edit', 'services'), canApprove = app.can('approve', 'services');
    const re = () => detail(el, id);
    const off = ui.officer(a.officerId);
    const applicant = S.find('citizens', a.applicantId) || S.find('businesses', a.applicantId);

    /* Available actions */
    const acts = [];
    if (portal) {
      if (a.status === 'Draft') acts.push(['continue', 'Continue and submit', 'primary', 'send'], ['deldraft', 'Delete draft', 'danger', 'trash']);
      if (a.status === 'Additional Information Required') acts.push(['provide', 'Provide additional documents', 'primary', 'upload']);
      if (a.status === 'Submitted') acts.push(['withdraw', 'Withdraw application', '', 'x']);
      if (!['Draft', 'Rejected'].includes(a.status)) acts.push(['book', 'Book appointment', '', 'calendar']);
      if (a.status === 'Completed') acts.push(['result', 'Download result', '', 'download'], ['rate', 'Rate this service', '', 'star']);
    } else if (canEdit || canApprove) {
      if (a.status === 'Submitted') acts.push(['receive', 'Receive and start review', 'primary', 'check']);
      if (a.status === 'Under Review') {
        if (canApprove) acts.push(['approve', 'Approve', 'success', 'checkcircle'], ['reject', 'Reject', 'danger', 'x']);
        if (!a.awaitingApproval && canEdit && !canApprove) acts.push(['forward', 'Forward for approval', 'primary', 'send']);
        if (a.awaitingApproval && canApprove) acts.push(['return', 'Return to officer', '', 'chevL']);
        acts.push(['request', 'Request additional information', '', 'alert']);
      }
      if (a.status === 'Additional Information Required') acts.push(['resume', 'Information received, resume review', 'primary', 'refresh']);
      if (a.status === 'Approved') acts.push(['complete', 'Issue result and complete', 'primary', 'checkcircle']);
      if (!M.DONE_APP.includes(a.status) && a.status !== 'Draft') acts.push(['assign', off ? 'Reassign officer' : 'Assign officer', '', 'user']);
      acts.push(['print', 'Print receipt', '', 'printer']);
    }
    const actHTML = acts.map(([k, l, v, ic]) => `<button class="btn ${v ? 'btn-' + v : ''}" data-act="${k}">${icon(ic)}${t(l)}</button>`).join('');

    const docs = a.documents.map((d, i) => `<div class="doc-check"><span class="l-ic ${d.status === 'Missing' ? 'warn' : d.status === 'Valid' ? 'ok' : ''}">${icon(d.status === 'Missing' ? 'alert' : 'file', 'i-sm')}</span><span class="dc-name">${esc(t(d.name))}${d.file ? `<span class="xs muted" style="display:block">${esc(d.file)}</span>` : ''}</span>${ui.badge(d.status)}${!portal && canEdit && ['Received', 'Uploaded'].includes(d.status) ? `<button class="btn btn-sm" data-valid="${i}">${t('Mark valid')}</button>` : ''}</div>`).join('');
    const hist = ui.timeline(a.history.slice().reverse().map((h) => ({ title: ui.badge(h.status) + (h.status === 'Under Review' && a.awaitingApproval ? '' : ''), meta: `${U.dateTime(h.time)} · ${esc(h.by)}`, note: h.note ? esc(t(h.note)) : '', tone: ['Completed', 'Approved'].includes(h.status) ? 'ok' : h.status === 'Rejected' ? 'bad' : h.status === 'Additional Information Required' ? 'warn' : '' })));
    const apt = S.where('appointments', (x) => x.appId === a.id && x.status === 'Booked');

    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t(portal ? 'My applications' : 'Public services'), href: '#/services' }, { label: a.code }], title: esc(t(a.serviceName)), subtitle: `${t('Application code')} <span class="code">${esc(a.code)}</span>` })}
      ${M.detailHead({ title: `${esc(t(a.serviceName))} ${ui.badge(a.status)}${a.awaitingApproval && a.status === 'Under Review' ? ` <span class="badge b-blue">${t('Awaiting approval')}</span>` : ''}`, meta: [`${icon('user', 'i-sm')}${esc(a.applicantName)}`, `${icon('calendar', 'i-sm')}${t('Submitted')} ${a.status === 'Draft' ? '—' : U.dateTime(a.submittedAt)}`, `${icon('clock', 'i-sm')}${t('Deadline')} ${U.date(a.deadline)}`, `${icon('building', 'i-sm')}${esc(ui.dept(a.dept).short)}`], actions: actHTML,
        foot: a.status === 'Draft' ? '' : `<div style="padding:0 18px 18px">${ui.stepper(stepsFor(a))}</div>` })}
      ${a.status === 'Additional Information Required' ? `<div class="callout warn mt-2">${icon('alert')}<div><strong>${t('Additional information required')}</strong><div>${esc(t((a.history.slice().reverse().find((h) => h.status === 'Additional Information Required') || {}).note || ''))}</div></div></div>` : ''}
      ${a.status === 'Rejected' ? `<div class="callout bad mt-2">${icon('x')}<div><strong>${t('Reason for rejection')}</strong><div>${esc(t((a.history.slice().reverse().find((h) => h.status === 'Rejected') || {}).note || ''))}</div></div></div>` : ''}
      <div class="grid g-main mt-2"><div>
        ${ui.panel({ title: t('Application details'), body: ui.dl([['Service', `${esc(t(a.serviceName))} <span class="xs muted">(${esc(s.vi || '')})</span>`], ['Procedure code', `<span class="code">${esc(s.code || '')}</span>`], ['Field', t(a.field)], ['Channel', t(a.channel)], ['Result delivery', t(a.delivery || 'Online (electronic result)')], ['Fee', a.fee ? `${U.vnd(a.fee)} ${a.paid ? ui.badge('Paid') : ui.badge('Pending')}` : t('Free of charge')], ['Result number', a.resultNo ? `<span class="code">${esc(a.resultNo)}</span>` : '—'], ['Applicant note', esc(a.note)]], 'cols-2') })}
        ${ui.panel({ title: t('Submitted documents'), sub: `${a.documents.filter((d) => d.status !== 'Missing').length} / ${a.documents.length} ${t('provided')}`, body: docs })}
      </div><div>
        ${ui.panel({ title: t('Applicant'), body: ui.dl([['Name', applicant ? (applicant.cid ? `<a href="#/citizens/${applicant.id}">${esc(applicant.fullName)}</a>` : esc(applicant.name)) : esc(a.applicantName)], [applicant && applicant.cid ? 'Citizen ID' : 'Enterprise code', `<span class="code">${esc(applicant ? applicant.cid || applicant.code : '')}</span>`], ['Phone', esc(applicant ? applicant.phone : '')], ['Address', esc(U.address(applicant))]].map((r) => (portal && r[0] === 'Name' ? [r[0], esc(a.applicantName)] : r))) })}
        ${ui.panel({ title: t('Processing'), body: ui.dl([['Handling unit', esc(ui.dept(a.dept).name)], ['Processing officer', off ? `${esc(off.name)}<span class="sub xs muted" style="display:block">${esc(off.title)}</span>` : `<span class="muted">${t('Not yet assigned')}</span>`], ['Deadline', U.deadline(a.deadline, M.DONE_APP.includes(a.status))], ['Processing time', (s.days || '—') + ' ' + t('working days')]]) + (apt.length ? `<div class="callout mt-1">${icon('calendar')}<div>${t('Appointment')}: ${U.date(apt[0].date)} ${esc(apt[0].slot)} · ${t('Ticket')} <strong>${esc(apt[0].ticket)}</strong></div></div>` : '') })}
        ${ui.panel({ title: t('Application history'), body: hist })}
      </div></div>`;

    U.$$('[data-valid]', el).forEach((b) => b.onclick = () => { a.documents[+b.dataset.valid].status = 'Valid'; S.update('applications', a.id, { documents: a.documents }); S.log('Verified document', a.id, a.documents[+b.dataset.valid].name); re(); });
    U.$$('.dh-actions [data-act]', el).forEach((b) => b.onclick = () => act(b.dataset.act));

    async function act(k) {
      const officers = S.all('officers');
      if (k === 'receive') {
        ui.formModal({ title: t('Receive application'), subtitle: esc(a.code), size: '', fields: [{ key: 'officerId', label: 'Processing officer', type: 'select', required: true, options: officers.filter((o) => o.dept === a.dept).concat(officers.filter((o) => o.dept !== a.dept)).map((o) => ({ value: o.id, label: `${o.name} (${ui.dept(o.dept).short})` })), default: (officers.find((o) => o.dept === a.dept) || {}).id }, { key: 'note', label: 'Note', type: 'textarea', full: true, default: 'Dossier complete. Assigned for appraisal.' }],
          submitLabel: t('Receive and assign'), onSubmit: (v) => { a.documents.forEach((d) => { if (d.status === 'Received' || d.status === 'Uploaded') d.status = 'Valid'; }); transition(a, 'Under Review', v.note, { officerId: v.officerId, documents: a.documents }); ui.toast(t('Application received and assigned.'), 'success'); re(); } });
      }
      if (k === 'assign') ui.formModal({ title: t('Assign processing officer'), subtitle: esc(a.code), size: '', fields: [{ key: 'officerId', label: 'Processing officer', type: 'select', required: true, options: officers.map((o) => ({ value: o.id, label: `${o.name} (${ui.dept(o.dept).short})` })), default: a.officerId }],
        submitLabel: t('Assign'), onSubmit: (v) => { const o = ui.officer(v.officerId); a.history.push({ time: U.nowIso(), status: a.status, by: app.user.name, note: 'Assigned to ' + o.name }); S.update('applications', a.id, { officerId: v.officerId, history: a.history }); S.log('Assigned application', a.id, o.name); S.notify({ title: 'Application assigned to you', body: `${a.code}: ${a.serviceName}`, link: '#/services/' + a.id }); ui.toast(t('Assigned to {n}.', { n: esc(o.name) }), 'success'); re(); } });
      if (k === 'request') { const r = await ui.confirm({ title: t('Request additional information'), message: t('The applicant will be notified and the processing clock paused until they respond.'), input: t('What is needed?'), required: true, confirmLabel: t('Send request') }); if (r) { a.documents.push({ name: String(r).slice(0, 80), file: '', status: 'Missing' }); transition(a, 'Additional Information Required', r, { documents: a.documents }); ui.toast(t('Request sent to the applicant.'), 'success'); re(); } }
      if (k === 'forward') { const r = await ui.confirm({ title: t('Forward for approval'), message: t('Send the appraised dossier to the department leadership for approval.'), input: t('Appraisal opinion'), required: true, confirmLabel: t('Forward') }); if (r) { a.history.push({ time: U.nowIso(), status: 'Under Review', by: app.user.name, note: 'Forwarded for approval: ' + r }); S.update('applications', a.id, { awaitingApproval: true, history: a.history }); S.log('Forwarded application for approval', a.id); S.notify({ title: 'Application awaiting your approval', body: `${a.code}: ${a.serviceName}`, type: 'info', link: '#/services/' + a.id }); ui.toast(t('Forwarded for approval.'), 'success'); re(); } }
      if (k === 'return') { const r = await ui.confirm({ title: t('Return to officer'), message: t('Return the dossier to the processing officer for further appraisal.'), input: t('Instructions'), required: true, confirmLabel: t('Return') }); if (r) { a.history.push({ time: U.nowIso(), status: 'Under Review', by: app.user.name, note: 'Returned: ' + r }); S.update('applications', a.id, { awaitingApproval: false, history: a.history }); ui.toast(t('Returned to officer.'), 'success'); re(); } }
      if (k === 'approve') { const r = await ui.confirm({ title: t('Approve application'), message: t('Approve {code}? A result number will be issued and the applicant notified.', { code: a.code }), input: t('Approval note'), confirmLabel: t('Approve') }); if (r) { transition(a, 'Approved', r === true ? 'Approved by department leadership.' : r, { awaitingApproval: false, resultNo: `${100 + S.all('applications').filter((x) => x.resultNo).length}/${a.field === 'Land' ? 'GCN' : 'KQ'}-${String(new Date().getFullYear()).slice(2)}` }); ui.toast(t('Application approved.'), 'success'); re(); } }
      if (k === 'reject') { const r = await ui.confirm({ title: t('Reject application'), message: t('The applicant will receive the reason in writing.'), input: t('Reason for rejection'), required: true, danger: true, confirmLabel: t('Reject') }); if (r) { transition(a, 'Rejected', r, { awaitingApproval: false }); ui.toast(t('Application rejected.'), 'success'); re(); } }
      if (k === 'resume') { a.documents.forEach((d) => { if (d.status === 'Missing') { d.status = 'Received'; d.file = d.file || 'supplement.pdf'; } }); transition(a, 'Under Review', 'Additional documents received. Review resumed.', { documents: a.documents }); ui.toast(t('Review resumed.'), 'success'); re(); }
      if (k === 'complete') { const r = await ui.confirm({ title: t('Issue result'), message: t('Confirm the result {no} has been issued to the applicant ({d}).', { no: a.resultNo || '', d: t(a.delivery || 'Online (electronic result)') }), confirmLabel: t('Complete') }); if (r) { transition(a, 'Completed', 'Result returned to the applicant.'); ui.toast(t('Application completed.'), 'success'); re(); } }
      if (k === 'print') window.print();
      if (k === 'continue') startApplication(a.serviceId, a);
      if (k === 'deldraft') { const ok = await ui.confirm({ title: t('Delete draft'), message: t('Delete this draft application?'), danger: true, confirmLabel: t('Delete') }); if (ok) { S.remove('applications', a.id); ui.toast(t('Draft deleted.'), 'success'); app.go('#/services'); } }
      if (k === 'withdraw') { const r = await ui.confirm({ title: t('Withdraw application'), message: t('Withdraw {code}? Processing will stop.', { code: a.code }), input: t('Reason'), required: true, danger: true, confirmLabel: t('Withdraw') }); if (r) { transition(a, 'Rejected', 'Withdrawn by applicant: ' + r); ui.toast(t('Application withdrawn.'), 'success'); re(); } }
      if (k === 'book') book(re, a.id);
      if (k === 'result') { U.download(`result-${a.code}.txt`, `${S.setting('orgVi')}\n${t('Electronic result (demo)')}\n\n${t('Application code')}: ${a.code}\n${t('Service')}: ${a.serviceName}\n${t('Applicant')}: ${a.applicantName}\n${t('Result number')}: ${a.resultNo}\n${t('Issued')}: ${U.date(U.nowIso())}\n\n${t('Fictional document generated by a demo system.')}`); ui.toast(t('Result downloaded.'), 'success'); }
      if (k === 'rate') ratingModal(a);
      if (k === 'provide') {
        const miss = a.documents.map((d, i) => [d, i]).filter(([d]) => d.status === 'Missing');
        const files = {};
        const m = ui.modal({ title: t('Provide additional documents'), subtitle: esc(a.code), size: 'lg', body: `<p class="small">${t('Attach the requested documents. The officer will be notified and review will resume.')}</p>${miss.map(([d, i]) => `<div class="doc-check"><span class="l-ic warn">${icon('alert', 'i-sm')}</span><span class="dc-name">${esc(t(d.name))}<span class="xs muted" style="display:block" id="pf-${i}">${t('Not attached')}</span></span><label class="btn btn-sm">${icon('upload', 'i-sm')}${t('Attach')}<input type="file" class="sr-only" data-pf="${i}"></label><button class="btn btn-sm btn-ghost" data-pfs="${i}">${t('Use sample file')}</button></div>`).join('')}<div class="err" id="pf-err" style="display:none;color:var(--bad)">${t('Attach every requested document.')}</div>`,
          actions: [{ label: t('Cancel') }, { label: t('Send documents'), variant: 'primary', icon: 'send', onClick: (mm) => { if (miss.some(([, i]) => !files[i])) { U.$('#pf-err', mm.el).style.display = 'block'; return; } miss.forEach(([d, i]) => { d.status = 'Uploaded'; d.file = files[i]; }); transition(a, 'Under Review', 'Applicant provided the additional documents.', { documents: a.documents }); mm.close(); ui.toast(t('Documents sent. Review will resume.'), 'success'); re(); } }] });
        const setF = (i, n) => { files[i] = n; U.$('#pf-' + i, m.el).textContent = n; };
        U.$$('[data-pf]', m.el).forEach((inp) => inp.onchange = () => inp.files[0] && setF(inp.dataset.pf, inp.files[0].name));
        U.$$('[data-pfs]', m.el).forEach((b) => b.onclick = () => setF(b.dataset.pfs, 'supplement_' + b.dataset.pfs + '.pdf'));
      }
    }
  }

  function ratingModal(a) {
    let n = a.rating || 0;
    const stars = () => [1, 2, 3, 4, 5].map((i) => `<button type="button" class="${i <= n ? 'on' : ''}" data-star="${i}" aria-label="${i} ${t('stars')}">${icon('star')}</button>`).join('');
    const m = ui.modal({ title: t('Rate this service'), subtitle: esc(t(a.serviceName)), body: `<div class="star-input" id="rs">${stars()}</div><div class="field mt-2"><label for="rs-c">${t('Comment')}</label><textarea id="rs-c" rows="3"></textarea></div>`,
      actions: [{ label: t('Cancel') }, { label: t('Send rating'), variant: 'primary', onClick: (mm) => { if (!n) { ui.toast(t('Choose a rating.'), 'error'); return; } S.update('applications', a.id, { rating: n, ratingComment: U.$('#rs-c', mm.el).value }); mm.close(); ui.toast(t('Thank you for your feedback.'), 'success'); } }] });
    const bind = () => U.$$('[data-star]', m.el).forEach((b) => b.onclick = () => { n = +b.dataset.star; U.$('#rs', m.el).innerHTML = stars(); bind(); });
    bind();
  }

  GA.modules.services = {
    render(el, params, q) { if (params[0]) detail(el, params[0]); else list(el, q || {}); },
    startApplication, book,
  };
})(window.GA);
