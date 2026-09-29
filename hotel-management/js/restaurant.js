/* Restaurant / POS: tables, orders, menu, charge to room */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util, UI = HMS.ui, H = HMS.hotel, icon = HMS.icon;
  const D = () => HMS.store.data;
  const ACTIVE = ['New', 'Preparing', 'Ready', 'Served'];
  const FLOW = { New: 'Preparing', Preparing: 'Ready', Ready: 'Served' };
  let tab = 'floor';
  const orderTotal = (o) => U.sum(o.items, (i) => i.price * i.qty);
  const vatRate = () => D().settings.vatRate / 100;

  function render(el, params) {
    if (params[0]) tab = params[0];
    const d = D();
    const today = U.today();
    const todayOrders = d.orders.filter((o) => o.createdAt.startsWith(today) && o.status !== 'Cancelled');
    const active = d.orders.filter((o) => ACTIVE.includes(o.status));
    el.innerHTML = `${UI.pageHead({ title: 'Restaurant', sub: 'Han River Kitchen · Sky Lounge Bar · Room service', crumbs: [{ label: 'Restaurant' }], actions: `<button class="btn btn-primary" data-a="new">${icon('plus')}New order</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Open orders', value: active.length, meta: `${active.filter((o) => o.status === 'Ready').length} ready to serve` })}
        ${UI.kpi({ label: 'Covers today', value: U.sum(todayOrders, (o) => o.guests || 1) })}
        ${UI.kpi({ label: 'Sales today (net)', value: U.moneyShort(U.sum(todayOrders, orderTotal)), unit: 'VND' })}
        ${UI.kpi({ label: 'Charged to rooms today', value: U.moneyShort(U.sum(todayOrders.filter((o) => o.reservationId), orderTotal)), unit: 'VND' })}
      </div>
      ${UI.tabs([{ id: 'floor', label: 'Tables & open orders', count: active.length }, { id: 'history', label: 'Order history' }, { id: 'menu', label: 'Menu', count: d.menu.length }], tab)}
      <div id="rs-body"></div>`;
    UI.bindTabs(el, (t) => { tab = t; draw(); });
    el.querySelector('[data-a=new]').onclick = () => pos();
    draw();
  }

  function draw() {
    const body = document.getElementById('rs-body');
    if (!body) return;
    const d = D();
    if (tab === 'floor') {
      const active = d.orders.filter((o) => ACTIVE.includes(o.status));
      const byTable = {};
      active.forEach((o) => { if (o.tableId) byTable[o.tableId] = o; });
      const areas = U.groupBy(d.tables, (t) => t.area);
      body.innerHTML = `<div class="grid grid-2-1">
        <div class="card"><div class="card-body">${Object.keys(areas).map((a) => `<div class="hk-group-title">${a}</div><div class="table-map">${areas[a].map((t) => { const o = byTable[t.id]; return `<button type="button" class="pos-table ${o ? (o.status === 'Ready' ? 'ready' : 'busy') : ''}" data-table="${t.id}"><strong>${t.name.replace('Table ', 'T')}</strong><span class="small muted">${t.seats} seats</span>${o ? `<span class="small">${U.badge(o.status)}</span><span class="small strong">${U.money(orderTotal(o))}</span>` : '<span class="small" style="color:var(--success)">Free</span>'}</button>`; }).join('')}</div>`).join('')}</div></div>
        <div class="card"><div class="card-head"><h2>Open orders</h2></div><div class="card-body"><div class="list">${active.map((o) => `<div class="list-item"><div class="grow"><div class="title">${o.id} · ${o.tableId ? U.esc((d.tables.find((t) => t.id === o.tableId) || {}).name) : 'Room ' + o.roomId + ' (room service)'}</div><div class="sub">${o.items.map((i) => `${i.qty}× ${U.esc(i.name.split(' (')[0])}`).join(', ')}</div><div class="sub">${o.createdAt.slice(11)} · ${U.esc(o.waiter)}</div></div><div style="text-align:right">${U.badge(o.status)}<div class="small strong mt-1">${U.money(orderTotal(o))}</div><button class="btn btn-xs mt-1" data-order="${o.id}">Open</button></div></div>`).join('') || UI.empty('No open orders', 'Start one from a table.')}</div></div></div>
      </div>`;
      body.onclick = (e) => {
        const t = e.target.closest('[data-table]');
        if (t) { const o = byTable[t.dataset.table]; return o ? orderDialog(o.id) : pos({ tableId: t.dataset.table }); }
        const o = e.target.closest('[data-order]');
        if (o) orderDialog(o.dataset.order);
      };
    } else if (tab === 'history') {
      UI.dataTable(body, {
        rows: () => d.orders.slice().reverse(), exportName: 'restaurant-orders', sort: 'createdAt', dir: 'desc',
        searchText: (o) => `${o.id} ${o.roomId} ${o.waiter} ${o.items.map((i) => i.name).join(' ')}`,
        filters: [{ key: 'status', label: 'Status', options: ['New', 'Preparing', 'Ready', 'Served', 'Paid', 'Cancelled'] }, { key: 'outlet', label: 'Outlet', options: ['Han River Kitchen', 'Sky Lounge Bar'] }, { key: 'payment', label: 'Payment', options: ['Room charge', 'Cash', 'QR Payment', 'Credit Card', 'E-wallet', 'Bank Transfer'] }],
        dateRange: { key: 'createdAt', label: 'Order date' },
        columns: [
          { key: 'id', label: 'Order', render: (o) => `<div class="cell-main">${o.id}</div><div class="cell-sub">${U.esc(o.outlet)}</div>` },
          { key: 'createdAt', label: 'Time', render: (o) => U.fmtDateTime(o.createdAt) },
          { key: 'where', label: 'Table / room', render: (o) => o.tableId ? U.esc((d.tables.find((t) => t.id === o.tableId) || {}).name) : `Room ${o.roomId}`, sort: false, csv: (o) => o.tableId || 'Room ' + o.roomId },
          { key: 'items', label: 'Items', render: (o) => `<span class="small">${o.items.map((i) => `${i.qty}× ${U.esc(i.name.split(' (')[0])}`).join(', ')}</span>`, sort: false, csv: (o) => o.items.map((i) => `${i.qty}x ${i.name}`).join('; ') },
          { key: 'total', label: 'Net total', align: 'right', render: (o) => U.money(orderTotal(o)), sortValue: orderTotal, csv: orderTotal },
          { key: 'payment', label: 'Payment', render: (o) => U.esc(o.payment || '—') },
          { key: 'status', label: 'Status', render: (o) => U.badge(o.status) }
        ],
        onRowClick: (o) => orderDialog(o.id)
      });
    } else {
      UI.dataTable(body, {
        rows: () => d.menu, exportName: 'menu', sort: 'category',
        searchText: (m) => `${m.name} ${m.category}`,
        filters: [{ key: 'category', label: 'Category', options: [...new Set(d.menu.map((m) => m.category))] }],
        toolbar: `<button class="btn btn-sm btn-primary" data-add-menu>${icon('plus')}Add item</button>`,
        columns: [
          { key: 'name', label: 'Item', render: (m) => `<span class="cell-main">${U.esc(m.name)}</span>` },
          { key: 'category', label: 'Category' },
          { key: 'price', label: 'Price (before VAT)', align: 'right', render: (m) => U.money(m.price) },
          { key: 'available', label: 'Availability', render: (m) => U.badge(m.available ? 'Available' : 'Unavailable') }
        ],
        rowActions: (m) => `<button class="btn btn-xs" data-act="toggle">${m.available ? 'Mark sold out' : 'Mark available'}</button><button class="icon-btn sm" data-act="edit" aria-label="Edit">${icon('edit')}</button>`,
        onAction: (a, m) => { if (a === 'toggle') { m.available = !m.available; HMS.store.commit(); UI.toast(`${m.name}: ${m.available ? 'available' : 'sold out'}`); draw(); } else menuForm(m.id); }
      });
      body.querySelector('[data-add-menu]').onclick = () => menuForm();
    }
  }

  function menuForm(id) {
    const m = id ? D().menu.find((x) => x.id === id) : null;
    UI.modal({ title: m ? `Edit ${m.name}` : 'Add menu item', size: 'sm', body: UI.form([
      { name: 'name', label: 'Name', required: true, span: 2 }, { name: 'category', label: 'Category', type: 'select', options: [...new Set(D().menu.map((x) => x.category))], span: 2 },
      { name: 'price', label: 'Price (VND, before VAT)', type: 'number', min: 1000, step: 1000, required: true, span: 2 }, { name: 'available', label: 'Available', type: 'checkbox', span: 2 }], m || { available: true }),
      actions: [{ label: 'Cancel' }, { label: 'Save item', kind: 'primary', onClick: (ctx) => {
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        if (m) Object.assign(m, x); else D().menu.push(Object.assign({ id: 'MNU' + String(D().menu.length + 1).padStart(3, '0') + Date.now().toString(36).slice(-2) }, x));
        HMS.store.commit(); UI.toast('Menu saved'); draw();
      } }] });
  }

  /* ---------- POS: build a new order ---------- */
  function pos(pre = {}) {
    const d = D();
    const lines = {};
    let cat = 'All';
    const inHouse = H.inHouse().sort((a, b) => a.roomId.localeCompare(b.roomId));
    const cats = ['All', ...new Set(d.menu.map((m) => m.category))];
    const m = UI.modal({
      title: 'New order', size: 'xl',
      body: `<div class="pos"><div>
          <div class="row mb-1" id="pos-cats">${cats.map((c) => `<button type="button" class="chip ${c === cat ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
          <div class="menu-grid" id="pos-menu"></div></div>
        <div class="card"><div class="card-body">
          <div class="form-grid mb-2">
            <div class="field"><label for="pos-where">Serve to</label><select id="pos-where"><option value="table">Table</option><option value="room">Room service</option></select></div>
            <div class="field" id="pos-t"><label for="pos-table">Table</label><select id="pos-table">${d.tables.map((t) => `<option value="${t.id}" ${pre.tableId === t.id ? 'selected' : ''}>${t.name} · ${t.area}</option>`).join('')}</select></div>
            <div class="field" id="pos-r" hidden><label for="pos-room">Room</label><select id="pos-room">${inHouse.map((r) => `<option value="${r.id}">${r.roomId} · ${U.esc(H.guestName(r.guestId))}</option>`).join('')}</select></div>
            <div class="field"><label for="pos-outlet">Outlet</label><select id="pos-outlet"><option>Han River Kitchen</option><option>Sky Lounge Bar</option></select></div>
            <div class="field"><label for="pos-pax">Covers</label><input type="number" id="pos-pax" min="1" max="30" value="2"></div>
          </div>
          <div class="order-lines" id="pos-lines"></div>
          <div class="folio mt-2" id="pos-total"></div>
        </div></div></div>`,
      actions: [{ label: 'Cancel' }, { label: 'Send to kitchen', kind: 'primary', onClick: () => save() }]
    });
    const b = m.body;
    const drawMenu = () => { b.querySelector('#pos-menu').innerHTML = d.menu.filter((x) => cat === 'All' || x.category === cat).map((x) => `<button type="button" class="menu-item" data-add="${x.id}" ${x.available ? '' : 'disabled style="opacity:.45"'}><strong>${U.esc(x.name)}</strong><span>${U.money(x.price)}${x.available ? '' : ' · sold out'}</span></button>`).join(''); };
    const drawLines = () => {
      const ids = Object.keys(lines);
      b.querySelector('#pos-lines').innerHTML = ids.length ? ids.map((id) => { const x = d.menu.find((mm) => mm.id === id); return `<div class="order-line"><span>${U.esc(x.name)}</span><span class="qty-ctl"><button type="button" data-dec="${id}" aria-label="Less">−</button><span>${lines[id]}</span><button type="button" data-add="${id}" aria-label="More">+</button></span><span class="num strong" style="min-width:90px;text-align:right">${U.money(x.price * lines[id])}</span></div>`; }).join('') : '<p class="small muted">Tap menu items to add them.</p>';
      const sub = U.sum(ids, (id) => d.menu.find((x) => x.id === id).price * lines[id]);
      b.querySelector('#pos-total').innerHTML = `<div class="folio-line"><span>Subtotal</span><span>${U.money(sub)}</span></div><div class="folio-line"><span>VAT ${d.settings.vatRate}%</span><span>${U.money(sub * vatRate())}</span></div><div class="folio-line grand"><span>Total</span><span>${U.money(sub * (1 + vatRate()))}</span></div>`;
    };
    b.addEventListener('click', (e) => {
      const c = e.target.closest('[data-cat]');
      if (c) { cat = c.dataset.cat; U.qsa('[data-cat]', b).forEach((x) => x.classList.toggle('active', x === c)); drawMenu(); }
      const a = e.target.closest('[data-add]');
      if (a) { lines[a.dataset.add] = (lines[a.dataset.add] || 0) + 1; drawLines(); }
      const dd = e.target.closest('[data-dec]');
      if (dd) { lines[dd.dataset.dec]--; if (lines[dd.dataset.dec] <= 0) delete lines[dd.dataset.dec]; drawLines(); }
    });
    b.querySelector('#pos-where').onchange = (e) => { const room = e.target.value === 'room'; b.querySelector('#pos-t').hidden = room; b.querySelector('#pos-r').hidden = !room; if (room && !inHouse.length) UI.toast('No in-house guests for room service.', 'warn'); };
    drawMenu(); drawLines();
    function save() {
      const ids = Object.keys(lines);
      if (!ids.length) { UI.toast('Add at least one item.', 'warn'); return false; }
      const room = b.querySelector('#pos-where').value === 'room';
      const tableId = room ? '' : b.querySelector('#pos-table').value;
      if (tableId && d.orders.some((o) => o.tableId === tableId && ACTIVE.includes(o.status))) { UI.toast('That table already has an open order. Open it to add items.', 'error'); return false; }
      const res = room ? H.res(b.querySelector('#pos-room').value) : null;
      if (room && !res) { UI.toast('Select a room.', 'error'); return false; }
      const o = { id: HMS.store.nextId('order', 'ORD-', 4), tableId, roomId: res ? res.roomId : '', reservationId: res ? res.id : '', items: ids.map((id) => { const x = d.menu.find((mm) => mm.id === id); return { menuId: id, name: x.name, price: x.price, qty: lines[id] }; }), status: 'New', createdAt: U.nowStamp(), waiter: H.user(), payment: '', outlet: b.querySelector('#pos-outlet').value, guests: Number(b.querySelector('#pos-pax').value) || 1 };
      o.total = orderTotal(o);
      HMS.store.add('orders', o);
      UI.toast(`${o.id} sent to kitchen`);
      draw();
    }
  }

  function orderDialog(id) {
    const o = D().orders.find((x) => x.id === id);
    const sub = orderTotal(o);
    const open = ACTIVE.includes(o.status);
    const inHouse = H.inHouse().sort((a, b) => a.roomId.localeCompare(b.roomId));
    UI.modal({
      title: `${o.id} · ${o.tableId ? (D().tables.find((t) => t.id === o.tableId) || {}).name : 'Room ' + o.roomId}`, size: 'md',
      body: `<div class="row-between mb-2"><span class="small muted">${U.esc(o.outlet)} · ${U.fmtDateTime(o.createdAt)} · ${U.esc(o.waiter)}</span>${U.badge(o.status)}</div>
        <table class="table compact"><tbody>${o.items.map((i) => `<tr><td>${i.qty}×</td><td>${U.esc(i.name)}</td><td class="right money">${U.money(i.price * i.qty)}</td></tr>`).join('')}</tbody></table>
        <div class="folio mt-2"><div class="folio-line"><span>Subtotal</span><span>${U.money(sub)}</span></div><div class="folio-line"><span>VAT</span><span>${U.money(sub * vatRate())}</span></div><div class="folio-line grand"><span>Total</span><span>${U.money(sub * (1 + vatRate()))}</span></div></div>
        ${open ? `<div class="divider"></div><div class="form-grid"><div class="field"><label for="od-pay">Settle by</label><select id="od-pay"><option value="room">Charge to room</option>${H.PAY_METHODS().map((mm) => `<option>${mm}</option>`).join('')}</select></div>
          <div class="field" id="od-room-f"><label for="od-room">Room</label><select id="od-room">${inHouse.map((r) => `<option value="${r.id}" ${r.id === o.reservationId ? 'selected' : ''}>${r.roomId} · ${U.esc(H.guestName(r.guestId))}</option>`).join('')}</select></div></div>` : `<p class="small muted mt-1">Paid by ${U.esc(o.payment || '—')}</p>`}`,
      onMount: (ctx) => { const p = ctx.body.querySelector('#od-pay'); if (p) { if (!o.reservationId) p.value = 'Cash'; const upd = () => { ctx.body.querySelector('#od-room-f').hidden = p.value !== 'room'; }; p.onchange = upd; upd(); } },
      actions: open ? [
        { label: 'Cancel order', kind: 'danger', onClick: () => { o.status = 'Cancelled'; HMS.store.commit(); UI.toast(`${o.id} cancelled`); draw(); } },
        { spacer: true },
        ...(FLOW[o.status] ? [{ label: `Mark ${FLOW[o.status].toLowerCase()}`, onClick: () => { o.status = FLOW[o.status]; HMS.store.commit(); UI.toast(`${o.id} is ${o.status.toLowerCase()}`); draw(); } }] : []),
        { label: 'Settle bill', kind: 'primary', onClick: (ctx) => {
          const how = ctx.body.querySelector('#od-pay').value;
          try {
            if (how === 'room') {
              const rid = ctx.body.querySelector('#od-room').value;
              if (!rid) throw new Error('No in-house guest selected.');
              const c = H.postCharge(rid, { category: 'Restaurant', description: `${o.outlet} · ${o.id}`, qty: 1, unitPrice: sub });
              Object.assign(o, { reservationId: rid, roomId: H.res(rid).roomId, payment: 'Room charge', chargeId: c.id });
            } else {
              H.recordPayment({ amount: Math.round(sub * (1 + vatRate())), method: how, type: 'Payment', notes: `${o.outlet} ${o.id}` });
              o.payment = how;
            }
            o.status = 'Paid'; o.paidAt = U.nowStamp();
            HMS.store.commit();
            UI.toast(how === 'room' ? `${o.id} charged to room ${o.roomId}` : `${o.id} paid by ${how}`);
            draw();
          } catch (err) { UI.toast(err.message, 'error'); return false; }
        } }
      ] : [{ label: 'Close' }]
    });
  }

  HMS.modules.restaurant = { title: 'Restaurant', render };
})();
