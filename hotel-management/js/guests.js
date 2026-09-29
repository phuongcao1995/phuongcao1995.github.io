/* Guests: directory, profile (stays, payments, requests, notes) */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;
  let table;

  const stats = (g) => {
    const stays = D().reservations.filter((r) => r.guestId === g.id);
    const done = stays.filter((r) => ['Checked-out', 'Checked-in'].includes(r.status));
    return { stays, done, nights: U.sum(done, (r) => H.nights(r.checkIn, r.checkOut)), spend: U.sum(done, (r) => H.folio(r).total), last: done.map((r) => r.checkIn).sort().pop() || '' };
  };

  const stayCount = (g) => D().reservations.filter((r) => r.guestId === g.id && ['Checked-out', 'Checked-in'].includes(r.status)).length;

  function render(el, params) {
    if (params[0]) return profile(el, params[0]);
    const d = D();
    const inHouseIds = new Set(H.inHouse().map((r) => r.guestId));
    const rep = d.guests.filter((g) => d.reservations.filter((r) => r.guestId === g.id && r.status === 'Checked-out').length > 1).length;
    el.innerHTML = `${UI.pageHead({ title: 'Guests', sub: 'Guest profiles, stay history and preferences', crumbs: [{ label: 'Guests' }], actions: `<button class="btn btn-primary" data-a="add">${icon('plus')}Add guest</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Guest profiles', value: U.num(d.guests.length) })}
        ${UI.kpi({ label: 'In house now', value: inHouseIds.size, link: '#/frontdesk/inhouse' })}
        ${UI.kpi({ label: 'VIP guests', value: d.guests.filter((g) => g.vip).length })}
        ${UI.kpi({ label: 'Repeat guests', value: rep, meta: 'More than one completed stay' })}
      </div><div id="g-table"></div>`;
    el.querySelector('[data-a=add]').onclick = () => openForm();
    const nats = [...new Set(d.guests.map((g) => g.nationality))].sort();
    table = UI.dataTable(el.querySelector('#g-table'), {
      rows: () => d.guests, exportName: 'guests', sort: 'name',
      searchPlaceholder: 'Name, phone, email, ID/passport',
      searchText: (g) => `${g.id} ${g.name} ${g.phone} ${g.email} ${g.idNumber} ${g.company}`,
      filters: [{ key: 'nationality', label: 'Nationality', options: nats }, { key: 'type', label: 'Type', options: ['Individual', 'Couple', 'Family', 'Group', 'Corporate'] }, { key: 'vip', label: 'VIP', options: ['VIP', 'Regular'], match: (g, v) => (v === 'VIP') === !!g.vip }, { key: 'inhouse', label: 'Status', options: ['In house'], match: (g) => inHouseIds.has(g.id) }],
      columns: [
        { key: 'name', label: 'Guest', render: (g) => `<div class="cell-person"><span class="avatar sm">${U.initials(g.name)}</span><div><div class="cell-main">${U.esc(g.name)}${U.vip(g)}</div><div class="cell-sub">${g.id}${inHouseIds.has(g.id) ? ' · <span style="color:var(--violet)">In house</span>' : ''}</div></div></div>` },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email', render: (g) => `<span class="small">${U.esc(g.email)}</span>` },
        { key: 'nationality', label: 'Nationality' },
        { key: 'idNumber', label: 'ID / passport', render: (g) => `<span class="small">${U.esc(g.idType)} ${U.esc(g.idNumber)}</span>` },
        { key: 'type', label: 'Type' },
        { key: 'stays', label: 'Stays', align: 'right', render: (g) => stayCount(g), sortValue: stayCount, csv: stayCount }
      ],
      rowActions: () => `<button class="btn btn-xs" data-act="open">Profile</button>`,
      onAction: (a, g) => HMS.app.go(`#/guests/${g.id}`), onRowClick: (g) => HMS.app.go(`#/guests/${g.id}`)
    });
  }

  function profile(el, id, tab = 'personal') {
    const g = H.guest(id);
    if (!g) { el.innerHTML = UI.pageHead({ title: 'Guest not found', crumbs: [{ label: 'Guests', href: '#/guests' }] }); return; }
    const s = stats(g);
    const current = s.stays.find((r) => ['Checked-in', 'Confirmed', 'Pending'].includes(r.status) && r.checkOut >= U.today());
    const pays = D().payments.filter((p) => p.guestId === g.id).slice().reverse();
    el.innerHTML = `${UI.pageHead({ title: g.name, crumbs: [{ label: 'Guests', href: '#/guests' }, { label: g.name }], actions: `<button class="btn" data-a="vip">${icon('star')}${g.vip ? 'Remove VIP' : 'Mark as VIP'}</button><button class="btn" data-a="edit">${icon('edit')}Edit profile</button><button class="btn btn-primary" data-a="book">${icon('plus')}New booking</button>` })}
      <div class="card mb-2"><div class="profile-head"><span class="avatar lg">${U.initials(g.name)}</span>
        <div class="grow"><h2>${U.esc(g.name)}${U.vip(g)}</h2><div class="muted small">${U.esc(g.type)} guest · ${U.esc(g.nationality)} · since ${U.fmtDate(g.createdAt)}</div><div class="mt-1">${g.preferences.map((p) => `<span class="tag">${U.esc(p)}</span>`).join('')}</div></div>
        <div class="profile-stats"><div><span>Stays</span><strong>${s.done.length}</strong></div><div><span>Nights</span><strong>${s.nights}</strong></div><div><span>Total spend</span><strong>${U.moneyShort(s.spend)}</strong></div><div><span>Last stay</span><strong>${s.last ? U.fmtDate(s.last) : '—'}</strong></div></div>
      </div></div>
      ${UI.tabs([{ id: 'personal', label: 'Personal information' }, { id: 'current', label: 'Current reservation' }, { id: 'stays', label: 'Stay history', count: s.stays.length }, { id: 'payments', label: 'Payments', count: pays.length }, { id: 'requests', label: 'Requests' }, { id: 'notes', label: 'Notes' }], tab)}
      <div id="gp-body"></div>`;
    const body = el.querySelector('#gp-body');
    const draw = (t) => {
      if (t === 'personal') body.innerHTML = `<div class="card"><div class="card-body"><dl class="dl">
        <dt>Guest ID</dt><dd>${g.id}</dd><dt>Full name</dt><dd>${U.esc(g.name)}</dd><dt>Gender</dt><dd>${U.esc(g.gender || '—')}</dd><dt>Date of birth</dt><dd>${U.fmtDate(g.dob)}</dd>
        <dt>Nationality</dt><dd>${U.esc(g.nationality)}</dd><dt>Phone</dt><dd>${U.esc(g.phone)}</dd><dt>Email</dt><dd>${U.esc(g.email || '—')}</dd><dt>Address</dt><dd>${U.esc(g.address || '—')}</dd>
        <dt>${U.esc(g.idType)}</dt><dd>${U.esc(g.idNumber || '—')}</dd><dt>Company</dt><dd>${U.esc(g.company || '—')}</dd><dt>Preferences</dt><dd>${g.preferences.map(U.esc).join(', ') || '—'}</dd></dl></div></div>`;
      if (t === 'current') {
        if (!current) { body.innerHTML = `<div class="card">${UI.empty('No current or upcoming reservation', 'Create a booking for this guest.', '<button class="btn btn-primary" data-a="book">New booking</button>')}</div>`; return; }
        const f = H.folio(current);
        body.innerHTML = `<div class="card"><div class="card-body"><div class="row-between mb-2"><strong>${current.id}</strong>${U.badge(current.status)}</div><dl class="dl"><dt>Stay</dt><dd>${U.fmtDate(current.checkIn)} → ${U.fmtDate(current.checkOut)} (${H.nights(current.checkIn, current.checkOut)} nights)</dd><dt>Room</dt><dd>${current.roomId || 'Unassigned'} · ${H.typeName(current.roomTypeId)}</dd><dt>Rate</dt><dd>${U.money(current.rate)} · ${H.plan(current.ratePlan).name}</dd><dt>Balance</dt><dd>${U.money(f.balance)}</dd></dl>
          <div class="row mt-2"><button class="btn btn-sm" data-r="${current.id}">Reservation details</button>${current.status === 'Checked-in' ? `<button class="btn btn-sm" data-folio="${current.id}">Open folio</button>` : ''}</div></div></div>`;
      }
      if (t === 'stays') body.innerHTML = `<div class="table-card"><div class="table-wrap"><table class="table"><thead><tr><th>Booking</th><th>Dates</th><th>Room</th><th>Source</th><th class="right">Total</th><th>Status</th></tr></thead><tbody>${s.stays.slice().reverse().map((r) => `<tr class="clickable" data-r="${r.id}"><td class="cell-main">${r.id}</td><td>${U.fmtDate(r.checkIn)} → ${U.fmtDate(r.checkOut)}</td><td>${r.roomId || '—'} <span class="cell-sub">${H.typeName(r.roomTypeId)}</span></td><td>${r.source}</td><td class="right money">${U.money(H.folio(r).total)}</td><td>${U.badge(r.status)}</td></tr>`).join('') || `<tr><td colspan="6">${UI.empty('No stays yet', '')}</td></tr>`}</tbody></table></div></div>`;
      if (t === 'payments') body.innerHTML = `<div class="table-card"><div class="table-wrap"><table class="table"><thead><tr><th>Payment</th><th>Date</th><th>Booking</th><th>Method</th><th class="right">Amount</th><th>Status</th></tr></thead><tbody>${pays.map((p) => `<tr><td class="cell-main">${p.id}<div class="cell-sub">${p.type}</div></td><td>${U.fmtDateTime(p.date)}</td><td>${p.reservationId}</td><td>${p.method}</td><td class="right money">${U.money(p.amount)}</td><td>${U.badge(p.status)}</td></tr>`).join('') || `<tr><td colspan="6">${UI.empty('No payments', '')}</td></tr>`}</tbody></table></div></div>`;
      if (t === 'requests') { const reqs = s.stays.filter((r) => r.specialRequests); body.innerHTML = `<div class="card"><div class="card-body">${reqs.length ? `<div class="timeline">${reqs.slice().reverse().map((r) => `<div class="tl-item">${U.esc(r.specialRequests)}<small>${r.id} · ${U.fmtDate(r.checkIn)}</small></div>`).join('')}</div>` : UI.empty('No special requests recorded', '')}</div></div>`; }
      if (t === 'notes') {
        body.innerHTML = `<div class="card"><div class="card-body"><div class="field"><label for="g-notes">Profile notes (visible to all staff at check-in)</label><textarea id="g-notes" rows="5">${U.esc(g.notes)}</textarea></div>
          <div class="field mt-2"><label for="g-prefs">Preferences</label><div class="row" id="g-prefs">${HMS.REF.PREFS.map((p) => `<label class="check"><input type="checkbox" value="${U.esc(p)}" ${g.preferences.includes(p) ? 'checked' : ''}>${U.esc(p)}</label>`).join('')}</div></div>
          <button class="btn btn-primary mt-2" data-a="save-notes">Save notes</button></div></div>`;
      }
    };
    UI.bindTabs(el, (t) => draw(t));
    el.onclick = (e) => {
      const a = e.target.closest('[data-a]');
      const rr = e.target.closest('[data-r]');
      const fo = e.target.closest('[data-folio]');
      if (rr) HMS.modules.reservations.detail(rr.dataset.r);
      if (fo) HMS.modules.billing.folioDialog(fo.dataset.folio);
      if (!a) return;
      if (a.dataset.a === 'edit') openForm(g.id);
      if (a.dataset.a === 'book') HMS.modules.reservations.openForm(null, { guestId: g.id });
      if (a.dataset.a === 'vip') { g.vip = !g.vip; HMS.store.commit(); UI.toast(g.vip ? `${g.name} marked as VIP` : 'VIP status removed'); profile(el, id); }
      if (a.dataset.a === 'save-notes') {
        g.notes = el.querySelector('#g-notes').value.trim();
        g.preferences = U.qsa('#g-prefs input:checked', el).map((x) => x.value);
        HMS.store.commit(); UI.toast('Guest notes saved');
      }
    };
    draw(tab);
  }

  function openForm(id) {
    const g = id ? H.guest(id) : null;
    UI.modal({
      title: g ? `Edit ${g.name}` : 'Add guest', size: 'lg',
      body: UI.form([
        { name: 'name', label: 'Full name', required: true, span: 2, placeholder: 'Tran Thi Mai' },
        { name: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
        { name: 'dob', label: 'Date of birth', type: 'date', max: U.today() },
        { name: 'nationality', label: 'Nationality', type: 'select', options: HMS.modules.frontdesk.NATIONALITIES() },
        { name: 'type', label: 'Guest type', type: 'select', options: ['Individual', 'Couple', 'Family', 'Group', 'Corporate'] },
        { name: 'phone', label: 'Phone', type: 'tel', required: true, pattern: '\\+?[0-9 ]{9,18}', title: 'e.g. 0905 123 456 or +82 10 1234 5678' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'idType', label: 'Document type', type: 'select', options: ['CCCD', 'Passport', 'Driving licence'] },
        { name: 'idNumber', label: 'ID / passport number', pattern: '[A-Za-z0-9]{6,15}', title: '6–15 letters or digits' },
        { name: 'address', label: 'Address', span: 2, placeholder: '12 Bach Dang Street, Hai Chau, Da Nang' },
        { name: 'company', label: 'Company' },
        { name: 'vip', label: 'VIP guest', type: 'checkbox' },
        { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 2 }
      ], g || { nationality: 'Vietnam', idType: 'CCCD', type: 'Individual' }),
      actions: [{ label: 'Cancel' }, { label: g ? 'Save guest' : 'Add guest', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        const dup = D().guests.find((o) => o.idNumber && o.idNumber === x.idNumber && (!g || o.id !== g.id));
        if (dup) { UI.toast(`ID ${x.idNumber} already belongs to ${dup.name} (${dup.id}).`, 'error'); return false; }
        if (g) { Object.assign(g, x); HMS.store.commit(); UI.toast('Guest profile saved'); }
        else { const n = H.createGuest(x); UI.toast(`Guest ${n.name} added`); setTimeout(() => HMS.app.go(`#/guests/${n.id}`), 10); return; }
        HMS.app.refresh();
      } }]
    });
  }

  HMS.modules.guests = { title: 'Guests', render, openForm };
})();
