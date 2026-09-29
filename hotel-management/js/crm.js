/* Customers (corporate, agencies, partners), Staff, Promotions */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;
  const isMgr = () => ['Administrator', 'General Manager', 'Front Office Manager'].includes(HMS.app.user.role);

  /* =========================== Customers =========================== */
  function custStats(c) {
    const res = D().reservations.filter((r) => r.customerId === c.id && !['Cancelled', 'No-show'].includes(r.status));
    const inv = D().invoices.filter((i) => i.customerId === c.id);
    const open = inv.filter((i) => i.status === 'Unpaid');
    return { res, nights: U.sum(res, (r) => H.nights(r.checkIn, r.checkOut)), revenue: U.sum(res, (r) => r.rate * H.nights(r.checkIn, r.checkOut)), outstanding: U.sum(open, (i) => i.total), overdue: open.filter((i) => i.dueDate < U.today()).length };
  }

  function renderCustomers(el) {
    const d = D();
    let table;
    const corp = d.customers.filter((c) => c.type === 'Corporate');
    const out = U.sum(d.customers, (c) => custStats(c).outstanding);
    el.innerHTML = `${UI.pageHead({ title: 'Customers', sub: 'Corporate accounts, travel agencies and OTA partners', crumbs: [{ label: 'Customers' }], actions: isMgr() ? `<button class="btn btn-primary" data-a="add">${icon('plus')}Add customer</button>` : '' })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Accounts', value: d.customers.length, meta: `${corp.length} corporate` })}
        ${UI.kpi({ label: 'Active contracts', value: d.customers.filter((c) => c.contractEnd >= U.today()).length })}
        ${UI.kpi({ label: 'Outstanding (city ledger)', value: U.moneyShort(out), unit: 'VND', link: '#/finance/receivable' })}
        ${UI.kpi({ label: 'Contracts ending in 60 days', value: d.customers.filter((c) => c.contractEnd >= U.today() && c.contractEnd <= U.addDays(U.today(), 60)).length })}
      </div><div id="c-table"></div>`;
    const add = el.querySelector('[data-a=add]');
    if (add) add.onclick = () => custForm(null, () => table.refresh());
    table = UI.dataTable(el.querySelector('#c-table'), {
      rows: () => d.customers, exportName: 'customers', sort: 'name',
      searchText: (c) => `${c.id} ${c.name} ${c.contact} ${c.email} ${c.taxId}`,
      filters: [{ key: 'type', label: 'Type', options: ['Corporate', 'Travel Agency', 'Partner', 'Individual'] }, { key: 'status', label: 'Status', options: ['Active', 'Inactive'] }],
      columns: [
        { key: 'name', label: 'Customer', render: (c) => `<div class="cell-main">${U.esc(c.name)}</div><div class="cell-sub">${c.id} · MST ${U.esc(c.taxId || '—')}</div>` },
        { key: 'type', label: 'Type', render: (c) => U.badge(c.type, c.type === 'Corporate' ? 'teal' : c.type === 'Travel Agency' ? 'lantern' : 'info') },
        { key: 'contact', label: 'Contact', render: (c) => `<div>${U.esc(c.contact)}</div><div class="cell-sub">${U.esc(c.phone)} · ${U.esc(c.email)}</div>` },
        { key: 'contract', label: 'Contract', render: (c) => c.contract ? `<span class="small">${U.esc(c.contract)}</span>` : '<span class="muted">—</span>' },
        { key: 'terms', label: 'Payment terms' },
        { key: 'creditLimit', label: 'Credit limit', align: 'right', render: (c) => c.creditLimit ? U.money(c.creditLimit) : '—' },
        { key: 'outstanding', label: 'Outstanding', align: 'right', render: (c) => { const s = custStats(c); return s.outstanding ? `<span class="strong">${U.money(s.outstanding)}</span>${s.overdue ? ' <span class="badge tone-danger plain">Overdue</span>' : ''}` : '<span class="muted">—</span>'; }, sortValue: (c) => custStats(c).outstanding, csv: (c) => custStats(c).outstanding },
        { key: 'contractEnd', label: 'Contract end', render: (c) => c.contractEnd ? `${U.fmtDate(c.contractEnd)}${c.contractEnd < U.today() ? ' <span class="badge tone-danger plain">Expired</span>' : ''}` : '<span class="muted">—</span>' }
      ],
      onRowClick: (c) => custDetail(c.id, () => table.refresh()),
      rowActions: () => `<button class="btn btn-xs" data-act="view">View</button>`,
      onAction: (a, c) => custDetail(c.id, () => table.refresh())
    });
  }

  function custDetail(id, after) {
    const c = H.customer(id);
    const s = custStats(c);
    const inv = D().invoices.filter((i) => i.customerId === id).slice().reverse();
    UI.modal({
      title: c.name, size: 'lg',
      body: `<div class="row-between mb-2"><div class="small muted">${c.id} · ${U.esc(c.type)} · ${U.esc(c.address)}</div>${U.badge(c.status)}</div>
        <div class="grid grid-4 mb-2">${UI.kpi({ label: 'Bookings', value: s.res.length })}${UI.kpi({ label: 'Room nights', value: s.nights })}${UI.kpi({ label: 'Room revenue', value: U.moneyShort(s.revenue), unit: 'VND' })}${UI.kpi({ label: 'Outstanding', value: U.moneyShort(s.outstanding), unit: 'VND' })}</div>
        <div class="grid grid-2">
          <dl class="dl"><dt>Contact</dt><dd>${U.esc(c.contact)}<br>${U.esc(c.phone)} · ${U.esc(c.email)}</dd><dt>Tax code</dt><dd>${U.esc(c.taxId || '—')}</dd><dt>Contract</dt><dd>${c.contract ? `${U.esc(c.contract)} · until ${U.fmtDate(c.contractEnd)}` : 'No contract'}${c.type === 'Corporate' ? '<div class="small muted">Corporate rate plan (−15% on BAR)</div>' : ''}</dd><dt>Terms</dt><dd>${U.esc(c.terms)}</dd><dt>Credit limit</dt><dd>${c.creditLimit ? U.money(c.creditLimit) : '—'}${c.creditLimit ? ` · ${U.pct((s.outstanding / c.creditLimit) * 100, 0)} used` : ''}</dd><dt>Notes</dt><dd>${U.esc(c.notes || '—')}</dd></dl>
          <div><h3 class="small strong mb-1">Recent bookings</h3><div class="list">${s.res.slice(-6).reverse().map((r) => `<div class="list-item"><div class="grow"><div class="title">${U.esc(H.guestName(r.guestId))}</div><div class="sub">${r.id} · ${U.fmtDate(r.checkIn)} → ${U.fmtDate(r.checkOut)}</div></div>${U.badge(r.status)}</div>`).join('') || '<p class="small muted">No bookings yet.</p>'}</div>
          ${inv.length ? `<h3 class="small strong mb-1 mt-2">Invoices</h3><div class="list">${inv.slice(0, 5).map((i) => `<div class="list-item"><div class="grow"><div class="title">${i.id}</div><div class="sub">${U.fmtDate(i.date)} · due ${U.fmtDate(i.dueDate)}</div></div><div class="right"><div class="strong small">${U.money(i.total)}</div>${U.badge(i.status)}</div></div>`).join('')}</div>` : ''}</div>
        </div>`,
      actions: [...(isMgr() ? [{ label: 'Edit', onClick: () => setTimeout(() => custForm(id, after), 30) }] : []), { spacer: true }, { label: 'New booking', kind: 'primary', onClick: () => setTimeout(() => HMS.modules.reservations.openForm(null, { customerId: c.id, source: c.type === 'Corporate' ? 'Corporate' : c.type === 'Travel Agency' ? 'Travel Agent' : ['Booking.com', 'Agoda', 'Expedia'].find((x) => c.name.startsWith(x.split('.')[0])) || 'Direct', ratePlan: c.type === 'Corporate' ? 'CORP' : 'BAR' }), 30) }]
    });
  }

  function custForm(id, after) {
    const c = id ? H.customer(id) : null;
    UI.modal({
      title: c ? `Edit ${c.name}` : 'Add customer', size: 'lg',
      body: UI.form([
        { name: 'name', label: 'Company / agency name', required: true, span: 2 },
        { name: 'type', label: 'Type', type: 'select', options: ['Corporate', 'Travel Agency', 'Partner', 'Individual'] },
        { name: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
        { name: 'taxId', label: 'Tax code (MST)', pattern: '[0-9\\-]{10,14}', title: '10–14 digits' },
        { name: 'contact', label: 'Contact person', required: true },
        { name: 'phone', label: 'Phone', type: 'tel', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'address', label: 'Address', span: 2 },
        { name: 'contract', label: 'Contract number', placeholder: 'CORP-2026-023' },
        { name: 'terms', label: 'Payment terms', type: 'select', options: ['On departure', 'Net 15', 'Net 30', 'Net 45', 'Monthly commission'] },
        { name: 'creditLimit', label: 'Credit limit (VND)', type: 'number', min: 0, step: 1000000 },
        { name: 'contractEnd', label: 'Contract end', type: 'date' },
        { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 2 }
      ], c || { type: 'Corporate', status: 'Active', terms: 'Net 30', contractEnd: U.addDays(U.today(), 365) }),
      actions: [{ label: 'Cancel' }, { label: c ? 'Save' : 'Add customer', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        if (c) { Object.assign(c, x); HMS.store.commit(); } else HMS.store.add('customers', Object.assign({ id: HMS.store.nextId('customer', 'CUS', 3), since: U.today() }, x));
        UI.toast(c ? 'Customer saved' : `${x.name} added`); after && after();
      } }]
    });
  }
  HMS.modules.customers = { title: 'Customers', render: renderCustomers };

  /* =========================== Staff =========================== */
  const DEPTS = ['Front Office', 'Housekeeping', 'Food & Beverage', 'Maintenance', 'Sales & Marketing', 'Finance', 'Security', 'Management', 'Spa'];
  function renderStaff(el) {
    const d = D();
    let table;
    const active = d.staff.filter((s) => s.status === 'Active');
    const shifts = U.groupBy(active, (s) => s.shift);
    el.innerHTML = `${UI.pageHead({ title: 'Staff', sub: `${active.length} active employees across ${new Set(d.staff.map((s) => s.department)).size} departments`, crumbs: [{ label: 'Staff' }], actions: isMgr() ? `<button class="btn btn-primary" data-a="add">${icon('plus')}Add employee</button>` : '' })}
      <div class="grid grid-2-1 mb-2">
        <div class="kpi-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">
          ${['Morning', 'Afternoon', 'Night'].map((s) => UI.kpi({ label: `${s} shift`, value: (shifts[s] || []).length, meta: { Morning: '06:00–14:00', Afternoon: '14:00–22:00', Night: '22:00–06:00' }[s] })).join('')}
        </div>
        <div class="card"><div class="card-head"><h2>By department</h2></div><div class="card-body">${HMS.chart.hbars(Object.entries(U.groupBy(active, (s) => s.department)).map(([k, v]) => ({ label: k, value: v.length })).sort((a, b) => b.value - a.value))}</div></div>
      </div><div id="s-table"></div>`;
    const add = el.querySelector('[data-a=add]');
    if (add) add.onclick = () => staffForm(null, () => HMS.app.refresh());
    table = UI.dataTable(el.querySelector('#s-table'), {
      rows: () => d.staff, exportName: 'staff', sort: 'department',
      searchText: (s) => `${s.id} ${s.name} ${s.position} ${s.phone} ${s.email}`,
      filters: [{ key: 'department', label: 'Department', options: DEPTS }, { key: 'shift', label: 'Shift', options: ['Morning', 'Afternoon', 'Night', 'Office'] }, { key: 'status', label: 'Status', options: ['Active', 'On Leave', 'Inactive'] }],
      columns: [
        { key: 'name', label: 'Employee', render: (s) => `<div class="cell-person"><span class="avatar sm">${U.initials(s.name)}</span><div><div class="cell-main">${U.esc(s.name)}</div><div class="cell-sub">${s.id}</div></div></div>` },
        { key: 'position', label: 'Position' },
        { key: 'department', label: 'Department' },
        { key: 'shift', label: 'Shift', render: (s) => U.badge(s.shift, { Morning: 'lantern', Afternoon: 'info', Night: 'violet', Office: 'neutral' }[s.shift]) },
        { key: 'phone', label: 'Phone' },
        { key: 'joined', label: 'Joined', render: (s) => U.fmtDate(s.joined) },
        { key: 'status', label: 'Status', render: (s) => U.badge(s.status) }
      ],
      rowActions: () => isMgr() ? `<button class="icon-btn sm" data-act="edit" aria-label="Edit">${icon('edit')}</button>` : '',
      onAction: (a, s) => staffForm(s.id, () => table.refresh()),
      onRowClick: (s) => isMgr() && staffForm(s.id, () => table.refresh())
    });
  }
  function staffForm(id, after) {
    const s = id ? D().staff.find((x) => x.id === id) : null;
    UI.modal({
      title: s ? `Edit ${s.name}` : 'Add employee', size: 'lg',
      body: UI.form([
        { name: 'name', label: 'Full name', required: true, span: 2 },
        { name: 'position', label: 'Position', required: true }, { name: 'department', label: 'Department', type: 'select', options: DEPTS },
        { name: 'phone', label: 'Phone', type: 'tel', required: true }, { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Afternoon', 'Night', 'Office'] }, { name: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave', 'Inactive'] },
        { name: 'joined', label: 'Start date', type: 'date', required: true }, { name: 'salary', label: 'Monthly salary (VND)', type: 'number', min: 0, step: 100000 }
      ], s || { department: 'Front Office', shift: 'Morning', status: 'Active', joined: U.today() }),
      actions: [{ label: 'Cancel' }, { label: s ? 'Save' : 'Add employee', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        if (D().staff.some((o) => o.email === x.email && (!s || o.id !== s.id))) { UI.toast('Another employee uses this email.', 'error'); return false; }
        if (s) { Object.assign(s, x); HMS.store.commit(); } else HMS.store.add('staff', Object.assign({ id: HMS.store.nextId('staff', 'EMP', 3) }, x));
        UI.toast(s ? 'Employee saved' : `${x.name} added`); after && after();
      } }]
    });
  }
  HMS.modules.staff = { title: 'Staff', render: renderStaff };

  /* =========================== Promotions =========================== */
  function renderPromos(el) {
    const d = D();
    let table;
    const used = (p) => d.reservations.filter((r) => r.promoCode === p.code && !['Cancelled'].includes(r.status));
    const act = d.promotions.filter((p) => H.promoStatus(p) === 'Active');
    el.innerHTML = `${UI.pageHead({ title: 'Promotions', sub: 'Discount codes, packages and seasonal offers', crumbs: [{ label: 'Promotions' }], actions: isMgr() ? `<button class="btn btn-primary" data-a="add">${icon('plus')}New promotion</button>` : '' })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Active promotions', value: act.length })}
        ${UI.kpi({ label: 'Scheduled', value: d.promotions.filter((p) => H.promoStatus(p) === 'Scheduled').length })}
        ${UI.kpi({ label: 'Bookings with a code', value: d.reservations.filter((r) => r.promoCode && r.status !== 'Cancelled').length })}
        ${UI.kpi({ label: 'Discount given', value: U.moneyShort(U.sum(d.reservations.filter((r) => r.promoCode && r.status !== 'Cancelled'), (r) => r.discount)), unit: 'VND' })}
      </div><div id="p-table"></div>`;
    const add = el.querySelector('[data-a=add]');
    if (add) add.onclick = () => promoForm(null, () => HMS.app.refresh());
    table = UI.dataTable(el.querySelector('#p-table'), {
      rows: () => d.promotions, exportName: 'promotions', sort: 'start', dir: 'desc',
      searchText: (p) => `${p.code} ${p.name}`,
      filters: [{ key: 'st', label: 'Status', options: ['Active', 'Scheduled', 'Expired', 'Paused'], match: (p, v) => H.promoStatus(p) === v }, { key: 'type', label: 'Type', options: ['Early booking', 'Long stay', 'Weekend promotion', 'Seasonal promotion', 'Corporate rate', 'Fixed discount', 'Coupon code'] }],
      columns: [
        { key: 'code', label: 'Code', render: (p) => `<span class="kbd" style="font-size:.8rem">${U.esc(p.code)}</span>` },
        { key: 'name', label: 'Promotion', render: (p) => `<div class="cell-main">${U.esc(p.name)}</div><div class="cell-sub">${U.esc(p.type)}${p.minNights > 1 ? ` · min ${p.minNights} nights` : ''}${p.roomTypes.length ? ' · ' + p.roomTypes.map(H.typeName).join(', ') : ''}</div>` },
        { key: 'value', label: 'Discount', align: 'right', render: (p) => p.discountType === 'percent' ? `${p.value}%${p.maxDiscount ? `<div class="cell-sub">max ${U.moneyShort(p.maxDiscount)}</div>` : ''}` : U.money(p.value) },
        { key: 'start', label: 'Valid', render: (p) => `${U.fmtDate(p.start)} → ${U.fmtDate(p.end)}` },
        { key: 'uses', label: 'Used', align: 'right', render: (p) => used(p).length, sortValue: (p) => used(p).length, csv: (p) => used(p).length },
        { key: 'st', label: 'Status', render: (p) => U.badge(H.promoStatus(p)), sortValue: (p) => H.promoStatus(p), csv: (p) => H.promoStatus(p) }
      ],
      rowActions: (p) => isMgr() ? `<button class="btn btn-xs" data-act="toggle">${p.enabled ? 'Pause' : 'Enable'}</button><button class="icon-btn sm" data-act="edit" aria-label="Edit">${icon('edit')}</button>` : '',
      onAction: (a, p) => { if (a === 'toggle') { p.enabled = !p.enabled; HMS.store.commit(); UI.toast(`${p.code} ${p.enabled ? 'enabled' : 'paused'}`); table.refresh(); } else promoForm(p.id, () => table.refresh()); }
    });
  }
  function promoForm(id, after) {
    const p = id ? D().promotions.find((x) => x.id === id) : null;
    UI.modal({
      title: p ? `Edit ${p.code}` : 'New promotion', size: 'lg',
      body: UI.form([
        { name: 'code', label: 'Code', required: true, pattern: '[A-Za-z0-9]{3,15}', title: '3–15 letters or digits', readonly: !!p },
        { name: 'name', label: 'Name', required: true },
        { name: 'type', label: 'Type', type: 'select', options: ['Early booking', 'Long stay', 'Weekend promotion', 'Seasonal promotion', 'Corporate rate', 'Fixed discount', 'Coupon code'] },
        { name: 'discountType', label: 'Discount type', type: 'select', options: [{ value: 'percent', label: 'Percentage of room charge' }, { value: 'fixed', label: 'Fixed amount (VND)' }] },
        { name: 'value', label: 'Value', type: 'number', min: 1, required: true },
        { name: 'maxDiscount', label: 'Maximum discount (VND)', type: 'number', min: 0, step: 10000 },
        { name: 'description', label: 'Conditions', span: 2 },
        { name: 'start', label: 'Start date', type: 'date', required: true },
        { name: 'end', label: 'End date', type: 'date', required: true },
        { name: 'minNights', label: 'Minimum nights', type: 'number', min: 1, max: 30 },
        { name: 'enabled', label: 'Enabled', type: 'checkbox' },
        { type: 'section', label: 'Applies to room types (none = all)' },
        { type: 'html', span: 2, html: `<div class="row" id="pf-types">${D().roomTypes.map((t) => `<label class="check"><input type="checkbox" value="${t.id}" ${p && p.roomTypes.includes(t.id) ? 'checked' : ''}>${U.esc(t.name)}</label>`).join('')}</div>` }
      ], p || { type: 'Coupon code', discountType: 'percent', start: U.today(), end: U.addDays(U.today(), 30), minNights: 1, enabled: true }),
      actions: [{ label: 'Cancel' }, { label: p ? 'Save' : 'Create promotion', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        x.code = x.code.toUpperCase();
        x.roomTypes = U.qsa('#pf-types input:checked', ctx.body).map((i) => i.value);
        if (x.end < x.start) { UI.toast('End date must be after the start date.', 'error'); return false; }
        if (x.discountType === 'percent' && x.value > 90) { UI.toast('Percentage discount cannot exceed 90%.', 'error'); return false; }
        if (!p && D().promotions.some((o) => o.code === x.code)) { UI.toast(`Code ${x.code} already exists.`, 'error'); return false; }
        if (p) { Object.assign(p, x); HMS.store.commit(); } else HMS.store.add('promotions', Object.assign({ id: HMS.store.nextId('promotion', 'PRM', 3) }, x));
        UI.toast(p ? 'Promotion saved' : `${x.code} created`); after && after();
      } }]
    });
  }
  HMS.modules.promotions = { title: 'Promotions', render: renderPromos };
})();
