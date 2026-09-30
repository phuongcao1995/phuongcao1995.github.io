/* Vehicle registration: plates, owners, inspection, ownership history and registration documents. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;
  const PLATE_RE = /^\d{2}[A-Z]{1,2}-\d{3}\.\d{2}$|^\d{2}-[A-Z]\d \d{3}\.\d{2}$/;
  const STATUSES = ['Active', 'Transfer pending', 'Deregistered', 'Seized'];
  const plate = (v) => `<span class="plate ${v.ownerType === 'Business' || v.type === 'Truck' ? 'yellow' : ''}">${esc(v.plate)}</span>`;
  const two = (type) => /Motorcycle|scooter/.test(type);

  function detail(v, refresh) {
    const app = GA.app, can = app.can('edit', 'vehicles');
    const insp = v.inspection || {};
    const acts = [{ label: t('Close') }];
    if (can && v.status !== 'Deregistered') {
      acts.push({ label: t('Print registration certificate'), left: true, icon: 'printer', onClick: () => window.print() });
      if (!two(v.type)) acts.push({ label: t('Record inspection'), icon: 'check', onClick: (m) => { m.close(); ui.formModal({ title: t('Record periodic inspection'), subtitle: plate(v) + ' ' + esc(v.brand + ' ' + v.model), size: '', fields: [{ key: 'center', label: 'Inspection center', type: 'select', required: true, noBlank: true, options: ['Vehicle Inspection Center 43-01D', 'Vehicle Inspection Center 43-02D', 'Vehicle Inspection Center 43-05D'] }, { key: 'months', label: 'Validity', type: 'select', required: true, noBlank: true, options: [{ value: 12, label: '12 ' + t('months') }, { value: 24, label: '24 ' + t('months') }, { value: 6, label: '6 ' + t('months') }] }, { key: 'result', label: 'Result', type: 'select', required: true, noBlank: true, options: ['Passed', 'Failed'] }], submitLabel: t('Save result'),
        onSubmit: (x) => { const passed = x.result === 'Passed'; const exp = passed ? U.addDays(U.today(), Math.round(+x.months * 30.4)) : insp.expires; v.history.push({ date: U.today(), event: `Periodic inspection ${passed ? 'passed' : 'failed'} (${x.center})`, owner: v.ownerName, ref: 'KĐ-' + Date.now().toString().slice(-6) }); S.update('vehicles', v.id, { inspection: { status: passed ? 'Valid' : 'Failed', expires: exp, center: x.center }, history: v.history }); S.log('Recorded vehicle inspection', v.id, v.plate); ui.toast(passed ? t('Inspection valid until {d}.', { d: U.date(exp) }) : t('Inspection failed. Vehicle must be repaired and re-inspected.'), passed ? 'success' : 'warning'); refresh(); } }); } });
      if (v.status === 'Active') acts.push({ label: t('Transfer ownership'), variant: 'primary', icon: 'swap', onClick: (m) => { m.close(); transfer(v, refresh); } });
      if (v.status === 'Transfer pending') acts.push({ label: t('Complete transfer'), variant: 'primary', icon: 'check', onClick: (m) => { v.history.push({ date: U.today(), event: 'Transfer registration completed', owner: v.ownerName, ref: 'SR-' + Date.now().toString().slice(-6) }); S.update('vehicles', v.id, { status: 'Active', history: v.history }); S.log('Completed vehicle transfer', v.id); m.close(); ui.toast(t('Transfer completed.'), 'success'); refresh(); } });
      if (v.status === 'Seized') acts.push({ label: t('Release vehicle'), icon: 'unlock', onClick: (m) => { v.history.push({ date: U.today(), event: 'Released from seizure', owner: v.ownerName, ref: 'GT-' + Date.now().toString().slice(-5) }); S.update('vehicles', v.id, { status: 'Active', history: v.history }); m.close(); ui.toast(t('Vehicle released.'), 'success'); refresh(); } });
      if (v.status === 'Active') acts.push({ label: t('Revoke registration'), variant: 'danger', icon: 'trash', onClick: async (m) => { m.close(); const r = await ui.confirm({ title: t('Revoke registration'), message: t('Revoke the registration and plate {p}? The plate is returned to the pool.', { p: v.plate }), input: t('Reason (scrapped, exported, lost…)'), required: true, danger: true, confirmLabel: t('Revoke') }); if (r) { v.history.push({ date: U.today(), event: 'Registration revoked: ' + r, owner: v.ownerName, ref: 'TH-' + Date.now().toString().slice(-6) }); S.update('vehicles', v.id, { status: 'Deregistered', history: v.history }); S.log('Revoked vehicle registration', v.id, v.plate); ui.toast(t('Registration revoked.'), 'success'); refresh(); } } });
    }
    const expDays = insp.expires ? U.daysBetween(U.today(), insp.expires) : null;
    ui.modal({ title: `${plate(v)} <span style="margin-left:6px">${esc(v.brand)} ${esc(v.model)}</span>`, subtitle: `${t(v.type)} · ${t('Registration certificate')} <span class="code">${esc(v.certNo)}</span>`, size: 'xl', actions: acts,
      body: `<div class="grid g-2"><div>${ui.dl([['Plate number', plate(v)], ['Vehicle type', t(v.type)], ['Make and model', esc(v.brand + ' ' + v.model)], ['Model year', v.year], ['Color', t(v.color)], ['Capacity / load', esc(v.capacity)], ['Engine number', `<span class="code">${esc(v.engineNo)}</span>`], ['Chassis number', `<span class="code">${esc(v.chassisNo)}</span>`]])}</div>
        <div>${ui.dl([['Registered owner', app.canView('citizens') && v.ownerType !== 'Business' ? `<a href="#/citizens/${v.ownerId}">${esc(v.ownerName)}</a>` : esc(v.ownerName)], ['Owner type', t(v.ownerType)], ['Registration date', U.date(v.regDate)], ['Registration office', esc(v.regOffice)], ['Province/City', esc(v.province)], ['Status', ui.badge(v.status)]])}
          ${two(v.type) ? `<div class="callout mt-1">${icon('info')}<div>${t('Periodic inspection is not required for motorcycles and scooters in this demo.')}</div></div>` : `<div class="sig-box mt-1"><span class="l-ic ${insp.status === 'Valid' && expDays > 30 ? 'ok' : insp.status === 'Valid' ? 'warn' : 'bad'}">${icon('check')}</span><div><div class="strong">${t('Technical safety inspection')} ${ui.badge(insp.status)}</div><div class="small">${t('Valid until')} ${U.date(insp.expires)}${expDays !== null ? ` · ${expDays < 0 ? `<span class="overdue">${-expDays} ${t('days overdue')}</span>` : `${expDays} ${t('days left')}`}` : ''}</div><div class="xs muted">${esc(insp.center || '')}</div></div></div>`}</div></div>
        <div class="form-section-title">${t('Ownership and registration history')}</div>
        ${ui.timeline(v.history.slice().reverse().map((h) => ({ title: esc(t(h.event)), meta: `${U.date(h.date)} · ${esc(h.owner)}`, note: h.ref ? `${t('Reference')} <span class="code">${esc(h.ref)}</span>` : '' })))}
        <div class="form-section-title">${t('Registration documents')}</div>
        <div class="flex flex-wrap">${M.fileChip('dang_ky_xe_' + v.plate.replace(/\W/g, '') + '.pdf')}${M.fileChip('hoa_don_mua_ban.pdf')}${M.fileChip('bien_lai_le_phi_truoc_ba.pdf')}${two(v.type) ? '' : M.fileChip('giay_chung_nhan_kiem_dinh.pdf')}</div>` });
  }

  function transfer(v, refresh) {
    ui.formModal({ title: t('Transfer vehicle ownership'), subtitle: plate(v) + ' · ' + esc(v.ownerName), size: '',
      fields: [{ key: 'to', label: 'New owner', type: 'select', required: true, options: S.all('citizens').filter((c) => c.id !== v.ownerId && c.status === 'Active').map((c) => ({ value: c.id, label: c.fullName + ' · ' + c.cid })) }, { key: 'contract', label: 'Sale contract / invoice no.', required: true }, { key: 'keep', label: 'New owner keeps the plate number (identity-based plates)', type: 'checkbox', default: true, full: true }],
      submitLabel: t('Submit transfer'),
      onSubmit: (x) => { const c = S.find('citizens', x.to); v.history.push({ date: U.today(), event: 'Ownership transferred', owner: c.fullName, ref: x.contract }); S.update('vehicles', v.id, { ownerId: c.id, ownerName: c.fullName, ownerType: 'Individual', status: 'Transfer pending', history: v.history }); S.log('Transferred vehicle ownership', v.id, `${v.plate} to ${c.fullName}`); ui.toast(t('Transfer filed. Status: transfer pending until documents are verified.'), 'success'); refresh(); } });
  }

  function register(refresh) {
    const f = [
      { key: 'plate', label: 'Plate number', required: true, placeholder: '43A-123.45 or 43-B1 234.56', validate: (v) => (!PLATE_RE.test(v) ? t('Use 43A-123.45 (cars) or 43-B1 234.56 (motorcycles).') : S.all('vehicles').some((x) => x.plate === v) ? t('This plate is already registered.') : ''), help: 'Plates are issued to the owner’s identity and can be kept when changing vehicles.' },
      { key: 'type', label: 'Vehicle type', type: 'select', required: true, options: ['Car', 'Motorcycle', 'Electric scooter', 'Truck'] },
      { key: 'brand', label: 'Make', required: true }, { key: 'model', label: 'Model', required: true },
      { key: 'year', label: 'Model year', type: 'number', required: true, min: 1990, max: new Date().getFullYear() + 1 },
      { key: 'color', label: 'Color', type: 'select', required: true, options: ['White', 'Black', 'Grey', 'Silver', 'Red', 'Blue', 'Brown'] },
      { key: 'engineNo', label: 'Engine number', required: true, pattern: '^[A-Z0-9-]{6,20}$', patternMsg: 'Use 6–20 capital letters, digits or hyphens.' },
      { key: 'chassisNo', label: 'Chassis number (VIN)', required: true, pattern: '^[A-HJ-NPR-Z0-9]{17}$', patternMsg: 'A VIN has 17 characters and excludes I, O and Q.' },
      { key: 'ownerId', label: 'Owner', type: 'select', required: true, full: true, options: S.all('citizens').filter((c) => c.status === 'Active').map((c) => ({ value: c.id, label: c.fullName + ' · ' + c.cid })) },
    ];
    ui.formModal({ title: t('Register vehicle'), subtitle: t('First registration and plate issuance'), size: 'lg', fields: f, submitLabel: t('Register vehicle'),
      onSubmit: (x) => { const c = S.find('citizens', x.ownerId); const rec = { id: S.nextId('vehicles', 'VH-'), plate: x.plate, ownerId: c.id, ownerName: c.fullName, ownerType: 'Individual', type: x.type, brand: x.brand, model: x.model, year: x.year, color: x.color, capacity: '', engineNo: x.engineNo, chassisNo: x.chassisNo, regDate: U.today(), regOffice: 'City Police, Traffic Police Division', certNo: String(Date.now()).slice(-6), inspection: two(x.type) ? { status: 'Valid', expires: '', center: '' } : { status: 'Valid', expires: U.addDays(U.today(), 730), center: 'Vehicle Inspection Center 43-01D' }, status: 'Active', history: [{ date: U.today(), event: 'First registration, plate issued', owner: c.fullName, ref: 'ĐK-' + Date.now().toString().slice(-6) }], province: c.province, createdAt: U.nowIso() };
        S.insert('vehicles', rec); S.log('Registered vehicle', rec.id, rec.plate); ui.toast(t('Vehicle {p} registered.', { p: rec.plate }), 'success'); refresh(); } });
  }

  function render(el, params, q) {
    const app = GA.app, can = app.can('edit', 'vehicles');
    const all = S.all('vehicles');
    const refresh = () => render(el, params, {});
    const expSoon = all.filter((v) => !two(v.type) && v.inspection.expires && v.inspection.expires >= U.today() && v.inspection.expires <= U.addDays(U.today(), 30));
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('Vehicle registration') }], title: t('Vehicle registration'), subtitle: t('City Police, Traffic Police Division · registrations, plates and inspection status'), actions: can ? `<button class="btn btn-primary" id="vh-new">${icon('plus')}${t('Register vehicle')}</button>` : '' })}
      ${ui.kpis([
        { label: 'Registered vehicles (city)', value: U.num(S.state.stats.vehicles), meta: `${all.length} ${t('in register view')}`, icon: 'car' },
        { label: 'Cars and trucks', value: all.filter((v) => !two(v.type)).length, meta: `${all.filter((v) => two(v.type)).length} ${t('two-wheelers')}`, icon: 'car', color: 'var(--ok)' },
        { label: 'Inspection expired', value: all.filter((v) => v.inspection.status === 'Expired').length, meta: `${expSoon.length} ${t('expire within 30 days')}`, icon: 'alert', color: 'var(--red)' },
        { label: 'Transfers pending', value: all.filter((v) => v.status === 'Transfer pending').length, meta: `${all.filter((v) => v.status === 'Seized').length} ${t('seized')}`, icon: 'swap', color: 'var(--gold)' },
      ], 'compact')}
      <div class="panel"><div class="panel-body flush" id="vh-t"></div></div>`;
    ui.table(U.$('#vh-t', el), { rows: () => S.all('vehicles'), exportName: 'vehicles', searchKeys: ['plate', (v) => v.plate.replace(/[-. ]/g, ''), 'ownerName', 'brand', 'model', 'chassisNo', 'engineNo'], searchPlaceholder: t('Search by plate, owner, chassis or engine number'),
      filters: [{ key: 'type', label: 'Type', all: 'All types', options: ['Car', 'Motorcycle', 'Electric scooter', 'Truck'] }, { key: 'status', label: 'Status', all: 'All statuses', options: STATUSES }, { key: 'insp', label: 'Inspection', all: 'Any inspection', options: [{ value: 'Expired', label: t('Expired') }, { value: 'soon', label: t('Expires within 30 days') }, { value: 'Valid', label: t('Valid') }], match: (v, x) => (x === 'soon' ? expSoon.includes(v) : !two(v.type) && v.inspection.status === x) }, { key: 'province', label: 'Province/City', all: 'All provinces', options: () => U.uniq(S.all('vehicles').map((v) => v.province)) }],
      dateKey: 'regDate', dateLabel: 'Registered from', defaultSort: 'regDate',
      columns: [
        { key: 'plate', label: 'Plate', render: plate, csv: (v) => v.plate },
        { key: 'brand', label: 'Vehicle', render: (v) => `<span class="strong">${esc(v.brand)} ${esc(v.model)}</span><span class="sub">${t(v.type)} · ${v.year} · ${t(v.color)}</span>`, csv: (v) => `${v.brand} ${v.model}` },
        { key: 'ownerName', label: 'Owner', render: (v) => `${esc(v.ownerName)}<span class="sub">${t(v.ownerType)}</span>` },
        { key: 'regDate', label: 'Registered', render: (v) => U.date(v.regDate) },
        { key: 'insp', label: 'Inspection', sort: (v) => v.inspection.expires || '9999', render: (v) => (two(v.type) ? '<span class="muted">—</span>' : `${ui.badge(v.inspection.status)}<span class="sub">${U.date(v.inspection.expires)}</span>`), csv: (v) => (two(v.type) ? '' : v.inspection.status + ' ' + U.date(v.inspection.expires)) },
        { key: 'status', label: 'Status', render: (v) => ui.badge(v.status) },
      ],
      onRowClick: (v) => detail(v, refresh), rowActions: (v) => [{ id: 'v', label: 'View', icon: 'eye' }].concat(can && v.status === 'Active' ? [{ id: 't', label: 'Transfer ownership', icon: 'swap' }] : []),
      onAction: (id, v) => (id === 'v' ? detail(v, refresh) : transfer(v, refresh)) });
    const nb = U.$('#vh-new', el); if (nb) nb.onclick = () => register(refresh);
    M.openFromQuery(q, 'vehicles', (v) => detail(v, refresh));
  }

  GA.modules.vehicles = { render, PLATE_RE };
})(window.GA);
