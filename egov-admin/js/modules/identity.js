/* Digital identity: e-ID accounts, verification levels, linked services, login and verification history, security alerts. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;
  const SERVICES = ['National Public Service Portal', 'e-Tax services', 'Social insurance online', 'Health insurance card', "Driver's licence", 'Banking eKYC', 'Electronic health book', 'Residence information'];
  const SEV = { High: 'bad', Medium: 'warn', Low: '' };

  function tabs(x, portal) {
    return ui.tabs([
      { id: 'svc', label: 'Linked services', count: x.linked.length, content: `<ul class="list">${SERVICES.map((s) => { const on = x.linked.includes(s); return `<li><span class="l-ic ${on ? 'ok' : ''}">${icon(on ? 'check' : 'layers', 'i-sm')}</span><div class="l-main"><div class="l-title">${esc(t(s))}</div><div class="l-sub">${on ? t('Integrated into the e-ID wallet') : t('Not linked')}</div></div>${x.level === 'Level 2' || s === 'National Public Service Portal' ? `<label class="switch"><input type="checkbox" data-link="${esc(s)}" ${on ? 'checked' : ''} aria-label="${esc(t(s))}"><span class="track"></span></label>` : `<span class="xs muted">${t('Requires Level 2')}</span>`}</li>`; }).join('')}</ul>` },
      { id: 'log', label: 'Login history', count: x.logins.length, content: ui.simpleTable([{ label: 'Time', render: (l) => U.dateTime(l.time) }, { label: 'Device', render: (l) => `${icon(/Android|iOS/.test(l.device) ? 'phone' : 'device', 'i-sm')} ${esc(l.device)}` }, { label: 'IP address', cls: 'code', key: 'ip' }, { label: 'Location', render: (l) => esc(t(l.location)) }, { label: 'Result', render: (l) => ui.badge(l.result) }], x.logins) },
      { id: 'ver', label: 'Verification history', count: x.verifications.length, content: ui.timeline(x.verifications.slice().reverse().map((v) => ({ title: esc(t(v.step)), meta: `${U.dateTime(v.time)} · ${esc(t(v.by))}`, tone: v.result === 'Success' ? 'ok' : 'bad', note: ui.badge(v.result) }))) },
      { id: 'sec', label: 'Security notifications', count: x.alerts.length, content: x.alerts.length ? `<ul class="list">${x.alerts.map((a) => `<li><span class="l-ic ${SEV[a.severity]}">${icon('alert', 'i-sm')}</span><div class="l-main"><div class="l-title">${esc(t(a.type))} ${ui.badge(a.severity === 'High' ? 'Urgent' : a.severity === 'Medium' ? 'Medium' : 'Low', a.severity)}</div><div class="l-sub">${esc(t(a.detail))} · ${U.dateTime(a.time)}</div></div></li>`).join('')}</ul>` : ui.empty(portal ? 'No security alerts on your account.' : 'No security alerts.') },
    ], { cls: 'mt-2', id: 'idt' });
  }

  function bindLinks(root, x, after) {
    U.$$('[data-link]', root).forEach((c) => c.onchange = () => {
      const s = c.dataset.link;
      x.linked = c.checked ? U.uniq(x.linked.concat([s])) : x.linked.filter((y) => y !== s);
      S.update('identities', x.id, { linked: x.linked }); S.log(c.checked ? 'Linked e-ID service' : 'Unlinked e-ID service', x.id, s);
      ui.toast(t(c.checked ? '{s} linked.' : '{s} unlinked.', { s: t(s) }), 'success'); if (after) after();
    });
  }

  function summary(x) {
    return ui.dl([['e-ID account', `<span class="code">${esc(x.account)}</span>`], ['Citizen ID', `<span class="code">${esc(x.cid)}</span>`], ['Identification level', ui.badge(x.level) + ` <span class="xs muted">${t(x.level === 'Level 2' ? 'Face and chip data verified in person or via NFC' : 'Basic personal data verified online')}</span>`], ['Account status', ui.badge(x.status)], ['Created', U.date(x.createdAt)], ['Verified', U.date(x.verifiedAt)], ['Verification method', t(x.method)]]);
  }

  function staffModal(x, refresh) {
    const can = GA.app.can('edit', 'identity');
    const acts = [{ label: t('Close') }];
    const verify = (step, patch, msg) => { x.verifications.push({ time: U.nowIso(), step, result: 'Success', by: GA.app.user.name }); S.update('identities', x.id, Object.assign({ verifications: x.verifications }, patch)); S.log(step, x.id, x.name); S.notify({ audience: x.citizenId, title: msg, body: `${t('e-ID account')} ${x.account}`, type: 'success', link: '#/identity' }); ui.toast(t(msg), 'success'); refresh(); };
    if (can) {
      if (x.status === 'Pending verification') acts.push({ label: t('Approve verification'), variant: 'primary', icon: 'check', onClick: (m) => { m.close(); verify('Identity verified by officer', { status: 'Active', verifiedAt: U.today() }, 'e-ID account activated'); } });
      if (x.level === 'Level 1' && x.status === 'Active') acts.push({ label: t('Upgrade to Level 2'), variant: 'primary', icon: 'shield', onClick: (m) => { m.close(); ui.confirm({ title: t('Upgrade to Level 2'), message: t('Confirm the citizen appeared in person, the chip was read and the face matched the national population database.'), confirmLabel: t('Upgrade') }).then((ok) => { if (ok) verify('Upgraded to Level 2 (face and chip match)', { level: 'Level 2', method: 'In person at ward police, chip read + face match' }, 'e-ID upgraded to Level 2'); }); } });
      if (x.status === 'Locked') acts.push({ label: t('Unlock account'), icon: 'unlock', onClick: (m) => { m.close(); verify('Account unlocked after identity check', { status: 'Active' }, 'e-ID account unlocked'); } });
      if (x.status === 'Active') acts.push({ label: t('Lock account'), variant: 'danger', icon: 'lock', left: true, onClick: async (m) => { m.close(); const r = await ui.confirm({ title: t('Lock account'), message: t('Lock the e-ID account of {n}? All linked services will stop accepting sign-ins.', { n: esc(x.name) }), input: t('Reason'), required: true, danger: true, confirmLabel: t('Lock') }); if (r) { x.alerts.unshift({ time: U.nowIso(), type: 'Account locked', detail: 'Locked by officer: ' + r, severity: 'High' }); S.update('identities', x.id, { status: 'Locked', alerts: x.alerts }); S.log('Locked e-ID account', x.id, r); ui.toast(t('Account locked.'), 'success'); refresh(); } } });
    }
    ui.modal({ title: esc(x.name), subtitle: t('e-ID account') + ' ' + esc(x.account), size: 'xl', actions: acts, body: summary(x) + tabs(x), onOpen: (m) => { ui.bindTabs(m.el); if (can) bindLinks(m.el, x); else U.$$('[data-link]', m.el).forEach((c) => { c.disabled = true; }); } });
  }

  function portal(el) {
    const x = M.scoped('identities')[0];
    if (!x) { el.innerHTML = ui.pageHeader({ title: t('My e-ID account') }) + ui.empty('No e-ID account is linked to your profile.'); return; }
    const re = () => portal(el);
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('My e-ID account') }], title: t('My e-ID account'), subtitle: t('Electronic identification issued by the Ministry of Public Security (demo)'),
      actions: x.status === 'Active' ? `<button class="btn btn-danger" id="id-lock">${icon('lock')}${t('Lock my account')}</button>` : '' })}
      <div class="welcome"><span class="l-ic" style="width:56px;height:56px;background:rgba(255,255,255,.1);color:#FFD76A">${icon('idcard', 'i-lg')}</span><div><h2 style="color:#fff;margin:0">${esc(x.name)}</h2><p>${t('Account')} <span class="code">${esc(x.account)}</span> · ${t('Citizen ID')} <span class="code">${esc(x.cid)}</span></p></div><div class="w-id"><span class="xs">${t('Identification level')}</span><strong>${t(x.level)}</strong>${ui.badge(x.status)}</div></div>
      ${x.level !== 'Level 2' ? `<div class="callout warn mb-2">${icon('info')}<div>${t('Upgrade to Level 2 at your ward police station to use banking eKYC, driver\'s licence and health records.')}</div></div>` : ''}
      <div class="panel"><div class="panel-body">${summary(x)}${tabs(x, true)}</div></div>`;
    ui.bindTabs(el); bindLinks(el, x);
    const lk = U.$('#id-lock', el);
    if (lk) lk.onclick = async () => { const ok = await ui.confirm({ title: t('Lock my account'), message: t('Lock your e-ID now if you suspect someone else is using it. You will need to verify your identity to unlock.'), danger: true, confirmLabel: t('Lock my account') }); if (ok) { x.alerts.unshift({ time: U.nowIso(), type: 'Account locked', detail: 'Locked by account holder', severity: 'High' }); S.update('identities', x.id, { status: 'Locked', alerts: x.alerts }); S.log('Locked own e-ID account', x.id); ui.toast(t('Your account is locked.'), 'success'); re(); } };
  }

  function render(el, params, q) {
    if (GA.app.portal) return portal(el);
    const all = S.all('identities');
    const refresh = () => render(el, params, {});
    const alerts = all.flatMap((x) => x.alerts.map((a) => Object.assign({ who: x }, a))).sort((a, b) => b.time.localeCompare(a.time));
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('Digital identity') }], title: t('Digital identity'), subtitle: t('Electronic identification accounts of residents, verification and security monitoring') })}
      ${ui.kpis([
        { label: 'e-ID accounts (view)', value: all.length, meta: `${all.filter((x) => x.status === 'Active').length} ${t('active')}`, icon: 'idcard' },
        { label: 'Level 2 verified', value: U.pct(all.filter((x) => x.level === 'Level 2').length, all.length) + '%', meta: `${all.filter((x) => x.level === 'Level 2').length} ${t('accounts')}`, icon: 'shield', color: 'var(--ok)' },
        { label: 'Pending verification', value: all.filter((x) => x.status === 'Pending verification').length, icon: 'clock', color: 'var(--gold)' },
        { label: 'Locked accounts', value: all.filter((x) => x.status === 'Locked').length, meta: `${alerts.filter((a) => a.severity === 'High').length} ${t('high-severity alerts')}`, icon: 'lock', color: 'var(--red)' },
      ], 'compact')}
      <div class="grid g-main"><div class="panel"><div class="panel-body flush" id="id-t"></div></div>
      ${ui.panel({ title: t('Security notifications'), sub: t('Latest across all accounts'), flush: true, body: `<ul class="list">${alerts.slice(0, 7).map((a) => `<li><span class="l-ic ${SEV[a.severity]}">${icon('alert', 'i-sm')}</span><div class="l-main"><a class="l-title" href="#/identity?id=${a.who.id}">${esc(t(a.type))}: ${esc(a.who.name)}</a><div class="l-sub">${esc(t(a.detail))} · ${U.ago(a.time)}</div></div></li>`).join('')}</ul>` })}</div>`;
    ui.table(U.$('#id-t', el), { rows: () => S.all('identities'), exportName: 'e-id-accounts', searchKeys: ['name', 'cid', 'account'], searchPlaceholder: t('Search by name, citizen ID or account'),
      filters: [{ key: 'level', label: 'Level', all: 'All levels', options: ['Level 1', 'Level 2'] }, { key: 'status', label: 'Status', all: 'All statuses', options: ['Active', 'Pending verification', 'Locked'] }],
      defaultSort: 'name', defaultDir: 'asc',
      columns: [{ key: 'name', label: 'Account holder', render: (x) => `<span class="strong">${esc(x.name)}</span><span class="sub code">${esc(x.cid)}</span>` }, { key: 'account', label: 'Account', cls: 'code' }, { key: 'level', label: 'Level', render: (x) => ui.badge(x.level) }, { key: 'linked', label: 'Linked services', sort: (x) => x.linked.length, render: (x) => `${x.linked.length} / ${SERVICES.length}`, csv: (x) => x.linked.length }, { key: 'last', label: 'Last sign-in', sort: (x) => (x.logins[0] || {}).time || '', render: (x) => (x.logins[0] ? `${U.ago(x.logins[0].time)}<span class="sub">${esc(x.logins[0].device)}</span>` : '—'), csv: (x) => (x.logins[0] ? U.dateTime(x.logins[0].time) : '') }, { key: 'status', label: 'Status', render: (x) => ui.badge(x.status) + (x.alerts.length ? `<span class="sub">${x.alerts.length} ${t('alerts')}</span>` : '') }],
      onRowClick: (x) => staffModal(x, refresh) });
    M.openFromQuery(q, 'identities', (x) => staffModal(x, refresh));
  }

  GA.modules.identity = { render };
})(window.GA);
