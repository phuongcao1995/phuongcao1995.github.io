/* Land management: parcel register, static cadastral map, certificates, transfers, mortgages and disputes. */
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon, ui = GA.ui, S = GA.store, M = GA.mod;

  /* Land-use purpose codes (Land Law 2024 classification, simplified) with map colours. */
  const PURPOSES = {
    ODT: ['Urban residential land', '#F6C9E4'], ONT: ['Rural residential land', '#F9DDEB'], TMD: ['Commercial and service land', '#F4A7A0'],
    SKC: ['Non-agricultural production land', '#E6B8A2'], DGD: ['Education facility land', '#C9B8F0'], CLN: ['Perennial crop land', '#D8E8A8'], LUC: ['Paddy land', '#F5EE9B'],
  };
  const STATUSES = ['Registered', 'Mortgaged', 'Pending registration', 'Pending transfer', 'Disputed'];
  const TRANSFER_TYPES = ['Sale', 'Gift', 'Inheritance', 'Capital contribution'];
  const BANKS = ['Commercial Bank A (fictional)', 'Commercial Bank B (fictional)', 'Commercial Bank C (fictional)', 'Development Bank D (fictional)'];

  const ownerLink = (p) => (p.ownerType === 'Organisation' || String(p.ownerId).startsWith('BUS') ? GA.mod && GA.app.canView('business') ? `<a href="#/business?id=${p.ownerId}">${esc(p.ownerName)}</a>` : esc(p.ownerName) : GA.app.canView('citizens') ? `<a href="#/citizens/${p.ownerId}">${esc(p.ownerName)}</a>` : esc(p.ownerName));
  const area = (a) => `${U.num(a)}${a % 1 ? ',' + String(a).split('.')[1] : ''} m²`;
  const certNo = () => { const L = 'ABCDĐEGH'; return L[Math.floor(Math.random() * L.length)] + 'Đ ' + String(Math.floor(100000 + Math.random() * 899999)); };

  /* ---------- Cadastral map (deterministic static SVG) ---------- */
  function mapSVG(prov, parcels, selId, purposeFilter) {
    const W = 820, H = 520;
    const isDN = prov === 'Da Nang City' || prov === 'Quang Nam Province';
    const pinfo = GA.data.PROVINCES.find((p) => p.name === prov) || GA.data.PROVINCES[0];
    const right = isDN ? 650 : W - 20;
    const cols = [[20, 230], [250, 450], [470, right]], rows = [[20, 165], [185, 335], [355, H - 20]];
    const rnd = (seed) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };
    let g = `<rect width="${W}" height="${H}" fill="#EEF1E6"/>`;
    if (isDN) g += `<path class="map-water" d="M${W} 0 L700 0 C 672 90, 690 170, 676 250 C 664 330, 690 420, 700 ${H} L${W} ${H} Z"/><text class="map-road-label" x="${W - 72}" y="${H / 2}" transform="rotate(-84 ${W - 72} ${H / 2})">${prov === 'Da Nang City' ? 'Sông Hàn' : 'Sông Thu Bồn'}</text>`;
    g += `<rect class="map-road" x="0" y="165" width="${isDN ? 668 : W}" height="20"/><rect class="map-road" x="0" y="335" width="${isDN ? 680 : W}" height="20"/><rect class="map-road" x="230" y="0" width="20" height="${H}"/><rect class="map-road" x="450" y="0" width="20" height="${H}"/>`;
    if (isDN) g += `<rect class="map-road" x="652" y="0" width="16" height="${H}"/>`;
    const st = pinfo.streets;
    g += `<text class="map-road-label" x="30" y="179">${esc(st[0])}</text><text class="map-road-label" x="30" y="349">${esc(st[1])}</text><text class="map-road-label" x="244" y="${H - 30}" transform="rotate(-90 244 ${H - 30})">${esc(st[2])}</text><text class="map-road-label" x="464" y="${H - 30}" transform="rotate(-90 464 ${H - 30})">${esc(st[3] || st[0])}</text>`;
    if (isDN) g += `<text class="map-road-label" x="664" y="120" transform="rotate(-90 664 120)">${esc(st[0])}</text>`;
    /* 9 blocks x 6 lots = 54 lots; register parcels are spread across them, the rest are neighbouring lots. */
    const lots = [];
    rows.forEach((r, ri) => cols.forEach((c, ci) => {
      const bw = (c[1] - c[0]) / 3, bh = (r[1] - r[0]) / 2;
      for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) lots.push({ x0: c[0] + x * bw, y0: r[0] + y * bh, w: bw, h: bh, k: lots.length, block: ri * 3 + ci });
    }));
    const step = parcels.length ? Math.max(1, Math.floor(lots.length / parcels.length)) : 1;
    const assign = {};
    parcels.forEach((p, i) => { assign[(i * step + (i % 2)) % lots.length] = p; });
    lots.forEach((l) => {
      const j = (n) => (rnd(l.k * 7 + n) - 0.5) * 8;
      const pad = 2.5;
      const pts = [[l.x0 + pad + j(1), l.y0 + pad + j(2)], [l.x0 + l.w - pad + j(3), l.y0 + pad + j(4)], [l.x0 + l.w - pad + j(5), l.y0 + l.h - pad + j(6)], [l.x0 + pad + j(7), l.y0 + l.h - pad + j(8)]]
        .map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ');
      const p = assign[l.k];
      const cx = (l.x0 + l.w / 2).toFixed(0), cy = (l.y0 + l.h / 2).toFixed(0);
      if (p) {
        const col = (PURPOSES[p.purpose] || ['', '#DDD'])[1];
        const dim = purposeFilter && p.purpose !== purposeFilter;
        g += `<polygon class="parcel ${p.id === selId ? 'sel' : ''} ${dim ? 'dim' : ''}" points="${pts}" fill="${col}" data-parcel="${p.id}" tabindex="0" role="button" aria-label="${esc(t('Parcel'))} ${esc(p.parcelNo)}, ${esc(t('sheet'))} ${esc(p.sheetNo)}, ${esc(p.ownerName)}" data-tip="${esc(t('Parcel'))} ${esc(p.parcelNo)} · ${esc(p.purpose)} · ${area(p.area)}"/>`;
        g += `<text class="parcel-label" x="${cx}" y="${+cy - 2}" text-anchor="middle">${esc(p.parcelNo)}</text><text class="parcel-label" x="${cx}" y="${+cy + 9}" text-anchor="middle" style="font-weight:400">${esc(p.purpose)}</text>`;
        if (p.status === 'Disputed' || p.status === 'Mortgaged') g += `<circle cx="${+cx + l.w / 2 - 12}" cy="${l.y0 + 12}" r="4" fill="${p.status === 'Disputed' ? '#C62828' : '#E8A900'}"/>`;
      } else {
        const n = 100 + l.k * 3;
        g += `<polygon points="${pts}" fill="#F8F8F3" stroke="#B9BFB0" stroke-width=".8"/><text class="parcel-label" x="${cx}" y="${+cy + 3}" text-anchor="middle" style="fill:#9AA092;font-weight:400">${n}</text>`;
      }
    });
    return `<svg viewBox="0 0 ${W} ${H}" role="group" aria-label="${esc(t('Cadastral map'))} ${esc(prov)}">${g}</svg>`;
  }

  function sidePanel(p) {
    if (!p) return `<div class="muted small">${icon('info', 'i-sm')} ${t('Select a parcel on the map to see its register entry.')}</div>
      <div class="mt-2"><div class="form-section-title">${t('Legend')}</div>${Object.keys(PURPOSES).map((k) => `<div class="flex small mb-1"><span style="width:18px;height:12px;border:1px solid #54606E;background:${PURPOSES[k][1]};display:inline-block"></span><span class="code">${k}</span> ${esc(t(PURPOSES[k][0]))}</div>`).join('')}
      <div class="flex small mb-1"><span style="width:10px;height:10px;border-radius:50%;background:#C62828;display:inline-block"></span>${t('Disputed')}</div><div class="flex small"><span style="width:10px;height:10px;border-radius:50%;background:#E8A900;display:inline-block"></span>${t('Mortgaged')}</div></div>`;
    return `<div class="xs muted">${t('Map sheet')} ${esc(p.sheetNo)} · ${t('Parcel')} ${esc(p.parcelNo)}</div>
      <h3 class="mt-0" style="margin:4px 0 8px">${esc(p.street)}</h3>${ui.badge(p.status)}
      ${ui.dl([['Owner / land user', ownerLink(p)], ['Area', area(p.area)], ['Land use purpose', `<span class="code">${esc(p.purpose)}</span> ${esc(t(p.purposeName))}`], ['Certificate no.', `<span class="code">${esc(p.certNo || '—')}</span>`], ['Ward / commune', esc(p.ward)], ['Estimated value', U.vndShort(p.value)]], 'mt-2')}
      <button class="btn btn-primary mt-2" data-open="${p.id}" style="width:100%">${icon('eye')}${t('Open parcel record')}</button>`;
  }

  /* ---------- Parcel record modal ---------- */
  function parcelModal(p, refresh) {
    const app = GA.app, can = app.can('edit', 'land'), canApprove = app.can('approve', 'land');
    const pt = p.pendingTransfer;
    const acts = [{ label: t('Close') }];
    if (can) {
      if (p.status === 'Registered') {
        acts.push({ label: t('Register mortgage'), icon: 'lock', left: true, onClick: (m) => { m.close(); mortgage(p, refresh); } });
        acts.push({ label: t('Register transfer'), icon: 'swap', variant: 'primary', onClick: (m) => { m.close(); transfer(p, refresh); } });
      }
      if (p.status === 'Mortgaged') acts.push({ label: t('Release mortgage'), icon: 'unlock', variant: 'primary', onClick: async (m) => { m.close(); if (await ui.confirm({ title: t('Release mortgage'), message: t('Confirm that {bank} has confirmed full repayment and the mortgage can be removed from certificate {c}.', { bank: esc(p.mortgagee), c: esc(p.certNo) }) })) { S.update('parcels', p.id, { status: 'Registered', mortgagee: '' }); S.log('Released land mortgage', p.id, p.mortgagee); ui.toast(t('Mortgage released.'), 'success'); refresh(); } } });
      if (p.status === 'Pending transfer' && canApprove) {
        acts.push({ label: t('Reject transfer'), variant: 'danger', left: true, onClick: async (m) => { m.close(); const r = await ui.confirm({ title: t('Reject transfer'), message: t('The transfer dossier will be returned to the applicant.'), input: t('Reason'), required: true, danger: true, confirmLabel: t('Reject') }); if (r) { S.update('parcels', p.id, { status: 'Registered', pendingTransfer: null }); S.log('Rejected land transfer', p.id, r); ui.toast(t('Transfer rejected.'), 'success'); refresh(); } } });
        acts.push({ label: t('Approve transfer'), icon: 'check', variant: 'primary', onClick: (m) => { m.close(); approveTransfer(p, refresh); } });
      }
      if (p.status === 'Pending registration' && canApprove) acts.push({ label: t('Approve registration and issue certificate'), icon: 'check', variant: 'primary', onClick: (m) => { m.close(); const c = certNo(); S.update('parcels', p.id, { status: 'Registered', certNo: c, certIssued: U.today(), certBook: 'CS ' + (30000 + Math.floor(Math.random() * 9999)) }); S.log('Issued land-use right certificate', p.id, c); ui.toast(t('Certificate {c} issued.', { c }), 'success'); refresh(); } });
      if (p.status === 'Disputed') acts.push({ label: t('Record dispute resolution'), icon: 'check', variant: 'primary', onClick: (m) => { m.close(); ui.formModal({ title: t('Record dispute resolution'), size: '', fields: [{ key: 'outcome', label: 'Outcome', type: 'select', required: true, options: ['Reconciled at ward level', 'Decided by the People\'s Committee', 'Court judgment in effect'] }, { key: 'ref', label: 'Decision / minutes reference', required: true, placeholder: 'e.g. QĐ 1234/QĐ-UBND' }], submitLabel: t('Save resolution'), onSubmit: (v) => { S.update('parcels', p.id, { status: 'Registered', transfers: p.transfers.concat([{ date: U.today(), type: 'Dispute resolved: ' + v.outcome, from: '', to: p.ownerName, ref: v.ref, value: 0 }]) }); S.log('Resolved land dispute', p.id, v.ref); ui.toast(t('Dispute resolution recorded.'), 'success'); refresh(); } }); } });
      acts.splice(1, 0, { label: t('Edit'), icon: 'edit', left: true, onClick: (m) => { m.close(); edit(p, refresh); } });
    }
    const tl = p.transfers.slice().reverse().map((x) => ({ title: `${t(x.type)}${x.value ? ' · ' + U.vndShort(x.value) : ''}`, meta: `${U.date(x.date)} · ${esc(x.ref)}`, note: x.from ? `${esc(x.from)} → ${esc(x.to)}`.replace('→', t('to')) : esc(x.to), tone: 'ok' }));
    ui.modal({ title: `${t('Parcel')} ${esc(p.parcelNo)}, ${t('map sheet')} ${esc(p.sheetNo)}`, subtitle: `${esc(U.address(p))}`, size: 'xl', actions: acts,
      body: `${pt ? `<div class="callout warn mb-2">${icon('swap')}<div><strong>${t('Transfer in progress')}</strong>: ${t(pt.type)} ${t('to')} ${esc(pt.to)}, ${U.vndShort(pt.value)} · ${t('Contract')} ${esc(pt.ref)} (${U.date(pt.date)})</div></div>` : ''}
      ${p.status === 'Disputed' ? `<div class="callout bad mb-2">${icon('alert')}<div>${t('A land dispute is recorded on this parcel. Transfers and mortgages are blocked until it is resolved.')}</div></div>` : ''}
      ${ui.tabs([
        { id: 'info', label: 'Parcel information', content: `<div class="grid g-2"><div>${ui.dl([['Parcel no.', esc(p.parcelNo)], ['Map sheet no.', esc(p.sheetNo)], ['Area', area(p.area)], ['Land use purpose', `<span class="code">${esc(p.purpose)}</span> ${esc(t(p.purposeName))}`], ['Term of use', t(p.term)], ['Origin of use', t(p.origin)], ['Address', esc(U.address(p))], ['Status', ui.badge(p.status)]])}</div>
          <div>${ui.dl([['Owner / land user', ownerLink(p)], ['Owner type', t(p.ownerType)], ['Certificate no.', `<span class="code">${esc(p.certNo || '—')}</span>`], ['Certificate book', esc(p.certBook || '—')], ['Issued on', U.date(p.certIssued)], ['Mortgagee', esc(p.mortgagee || '—')], ['Estimated value', U.vnd(p.value)], ['Record updated', U.dateTime(p.updatedAt || p.createdAt)]])}</div></div>` },
        { id: 'hist', label: 'Transfer history', count: p.transfers.length, content: ui.timeline(tl) },
        { id: 'cert', label: 'Certificate', content: `<div class="doc-canvas" style="border:0;border-radius:8px"><div class="doc-paper" style="max-width:520px;padding:32px 36px">
            <div style="text-align:center;font-weight:700;font-size:13px">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div><div style="text-align:center;font-weight:700">Độc lập - Tự do - Hạnh phúc</div><div class="doc-top"><div></div><div></div></div>
            <div style="text-align:center;font-weight:700;margin-top:16px;color:#B01E1E">GIẤY CHỨNG NHẬN QUYỀN SỬ DỤNG ĐẤT,<br>QUYỀN SỞ HỮU TÀI SẢN GẮN LIỀN VỚI ĐẤT</div>
            <p style="margin-top:14px"><b>1. Người sử dụng đất:</b> ${esc(p.ownerName)}</p>
            <p><b>2. Thửa đất số:</b> ${esc(p.parcelNo)} &nbsp; <b>Tờ bản đồ số:</b> ${esc(p.sheetNo)}</p>
            <p><b>Địa chỉ:</b> ${esc(U.address(p))}</p><p><b>Diện tích:</b> ${esc(String(p.area).replace('.', ','))} m² &nbsp; <b>Mục đích sử dụng:</b> ${esc(p.purpose)}</p>
            <p><b>Thời hạn sử dụng:</b> ${p.term === 'Long-term' ? 'Lâu dài' : esc(p.term)}</p>
            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:18px"><div class="xs">${t('Serial')}: <b>${esc(p.certNo || '—')}</b><br>${t('Book')}: ${esc(p.certBook || '—')}</div><div class="sig-stamp">${t('Specimen, demo only')}<br>${U.date(p.certIssued)}</div></div>
          </div></div>` },
      ], { id: 'lp' })}`,
      onOpen: (m) => ui.bindTabs(m.el) });
  }

  function transfer(p, refresh) {
    ui.formModal({ title: t('Register land-use right transfer'), subtitle: `${t('Parcel')} ${esc(p.parcelNo)}, ${t('sheet')} ${esc(p.sheetNo)} · ${esc(p.ownerName)}`,
      intro: `<div class="callout mb-2">${icon('info')}<div>${t('The transfer is recorded as pending until a land officer with approval rights appraises the notarised contract and updates the certificate.')}</div></div>`,
      fields: [
        { key: 'type', label: 'Transfer type', type: 'select', required: true, options: TRANSFER_TYPES },
        { key: 'toId', label: 'Transferee', type: 'select', required: true, options: GA.store.all('citizens').filter((c) => c.status !== 'Deceased' && c.id !== p.ownerId).map((c) => ({ value: c.id, label: `${c.fullName} (${c.cid})` })) },
        { key: 'value', label: 'Contract value (₫)', type: 'number', required: true, min: 0, default: p.value },
        { key: 'ref', label: 'Notarised contract no.', required: true, placeholder: 'e.g. 1234/2026/HĐCN' },
        { key: 'date', label: 'Contract date', type: 'date', required: true, default: U.today(), max: U.today() },
      ], submitLabel: t('Record pending transfer'),
      onSubmit: (v) => {
        const c = S.find('citizens', v.toId);
        S.update('parcels', p.id, { status: 'Pending transfer', pendingTransfer: { type: v.type, toId: c.id, to: c.fullName, value: v.value, ref: v.ref, date: v.date } });
        S.log('Registered pending land transfer', p.id, `${p.ownerName} to ${c.fullName}`);
        S.notify({ audience: 'staff', title: 'Land transfer awaiting approval', body: `Parcel ${p.parcelNo}/${p.sheetNo}: ${p.ownerName} to ${c.fullName}`, type: 'info', link: '#/land?id=' + p.id });
        ui.toast(t('Transfer recorded and sent for approval.'), 'success'); refresh();
      } });
  }
  function approveTransfer(p, refresh) {
    const pt = p.pendingTransfer || { type: 'Sale', to: '—', toId: '', value: 0, ref: '', date: U.today() };
    ui.confirm({ title: t('Approve transfer'), message: t('Update the register so that {to} becomes the land user of parcel {n}, and issue certificate changes. This cannot be undone in the demo.', { to: `<strong>${esc(pt.to)}</strong>`, n: esc(p.parcelNo) }), confirmLabel: t('Approve and update certificate') }).then((ok) => {
      if (!ok) return;
      const tr = { date: U.today(), type: pt.type, from: p.ownerName, to: pt.to, ref: pt.ref, value: pt.value };
      S.update('parcels', p.id, { status: 'Registered', ownerId: pt.toId || p.ownerId, ownerName: pt.to, ownerType: 'Individual', transfers: p.transfers.concat([tr]), pendingTransfer: null, value: pt.value || p.value });
      S.log('Approved land transfer', p.id, `${tr.from} to ${tr.to}`);
      if (pt.toId) S.notify({ audience: pt.toId, title: 'Land transfer registered', body: `You are now the registered land user of parcel ${p.parcelNo}, sheet ${p.sheetNo}.`, type: 'success', link: '#/dashboard' });
      ui.toast(t('Transfer approved. Register updated.'), 'success'); refresh();
    });
  }
  function mortgage(p, refresh) {
    ui.formModal({ title: t('Register mortgage'), subtitle: `${t('Parcel')} ${esc(p.parcelNo)} · ${esc(p.certNo)}`, size: '',
      fields: [{ key: 'bank', label: 'Mortgagee (credit institution)', type: 'select', required: true, options: BANKS }, { key: 'ref', label: 'Mortgage contract no.', required: true }, { key: 'amount', label: 'Secured amount (₫)', type: 'number', required: true, min: 1000000 }],
      submitLabel: t('Register mortgage'),
      onSubmit: (v) => { S.update('parcels', p.id, { status: 'Mortgaged', mortgagee: v.bank, transfers: p.transfers.concat([{ date: U.today(), type: 'Mortgage registered', from: p.ownerName, to: v.bank, ref: v.ref, value: v.amount }]) }); S.log('Registered land mortgage', p.id, v.bank); ui.toast(t('Mortgage registered.'), 'success'); refresh(); } });
  }
  function fields() {
    return [
      { type: 'section', label: 'Parcel' },
      { key: 'parcelNo', label: 'Parcel no.', required: true, pattern: '^\\d{1,4}$', patternMsg: 'Use 1 to 4 digits.' },
      { key: 'sheetNo', label: 'Map sheet no.', required: true, pattern: '^\\d{1,3}$', patternMsg: 'Use 1 to 3 digits.' },
      { key: 'area', label: 'Area (m²)', type: 'number', required: true, min: 1, step: '0.1' },
      { key: 'purpose', label: 'Land use purpose', type: 'select', required: true, options: Object.keys(PURPOSES).map((k) => ({ value: k, label: `${k} ${t(PURPOSES[k][0])}` })) },
      { key: 'term', label: 'Term of use', type: 'select', required: true, noBlank: true, options: ['Long-term', '50 years', '70 years'] },
      { key: 'origin', label: 'Origin of use', type: 'select', required: true, options: ['Recognised land-use rights', 'State allocation with land levy', 'State lease, annual payment', 'Transfer of land-use rights'] },
      { key: 'ownerId', label: 'Land user', type: 'select', required: true, full: true, options: () => GA.store.all('citizens').filter((c) => c.status !== 'Deceased').map((c) => ({ value: c.id, label: `${c.fullName} (${c.cid})` })).concat(GA.store.all('businesses').map((b) => ({ value: b.id, label: `${b.name} (${b.code})` }))) },
      { key: 'value', label: 'Estimated value (₫)', type: 'number', min: 0 },
      { type: 'section', label: 'Location' },
    ].concat(M.addressFields());
  }
  function edit(p, refresh) {
    const isNew = !p;
    ui.formModal({ title: isNew ? t('Register new parcel') : t('Edit parcel record'), subtitle: isNew ? t('First-time registration. The record starts as pending until approved.') : `${t('Parcel')} ${esc(p.parcelNo)}`, fields: fields(), values: p || { province: 'Da Nang City', term: 'Long-term' },
      submitLabel: isNew ? t('Submit registration') : t('Save changes'),
      onSubmit: (v) => {
        const dup = S.all('parcels').find((x) => x.parcelNo === v.parcelNo && x.sheetNo === v.sheetNo && x.ward === v.ward && (!p || x.id !== p.id));
        if (dup) { ui.toast(t('Parcel {n} on sheet {s} already exists in {w}.', { n: esc(v.parcelNo), s: esc(v.sheetNo), w: esc(v.ward) }), 'error'); return false; }
        const own = S.find('citizens', v.ownerId) || S.find('businesses', v.ownerId);
        const rec = Object.assign({}, v, { purposeName: PURPOSES[v.purpose][0], ownerName: own ? own.fullName || own.name : '', ownerType: String(v.ownerId).startsWith('BUS') ? 'Organisation' : 'Individual', value: v.value || 0 });
        if (!rec.district) rec.district = (GA.data.PROVINCES.find((x) => x.name === v.province).units.find((u) => u[1].includes(v.ward)) || [''])[0];
        if (isNew) {
          Object.assign(rec, { id: S.nextId('parcels', 'LP-'), status: 'Pending registration', certNo: '', certBook: '', certIssued: '', mortgagee: '', transfers: [{ date: U.today(), type: 'Application for first issuance', from: '', to: rec.ownerName, ref: 'Dossier received', value: 0 }], createdAt: U.nowIso() });
          S.insert('parcels', rec); S.log('Registered new parcel', rec.id, `${rec.parcelNo}/${rec.sheetNo}`); ui.toast(t('Parcel registered as pending.'), 'success');
        } else { S.update('parcels', p.id, rec); S.log('Updated parcel record', p.id, ''); ui.toast(t('Parcel record updated.'), 'success'); }
        refresh();
      } });
  }

  /* ---------- Page ---------- */
  function render(el, params, q) {
    q = q || {};
    const app = GA.app, can = app.can('edit', 'land');
    const parcels = S.all('parcels');
    let tab = q.tab || 'map', prov = q.prov || 'Da Nang City', sel = q.id || '', pf = '';
    const selParcel = sel && S.find('parcels', sel);
    if (selParcel) prov = selParcel.province;
    const refresh = () => render(el, params, { tab, prov, id: '' });
    const provs = U.uniq(parcels.map((p) => p.province));
    const pending = parcels.filter((p) => ['Pending registration', 'Pending transfer'].includes(p.status));
    el.innerHTML = `${ui.pageHeader({ crumbs: [{ label: t('Home'), href: '#/dashboard' }, { label: t('Land management') }], title: t('Land management'), subtitle: t('Cadastral register, land-use right certificates, transfers and mortgages'),
      actions: can ? `<button class="btn btn-primary" id="lp-new">${icon('plus')}${t('Register parcel')}</button>` : '' })}
      ${ui.kpis([
        { label: 'Land records (city-wide)', value: U.num(S.state.stats.parcels), meta: `${parcels.length} ${t('in this register view')}`, icon: 'map' },
        { label: 'Total area in view', value: `${U.num(U.sum(parcels, 'area'))} <small>m²</small>`, icon: 'layers', color: 'var(--ok)' },
        { label: 'Pending registration / transfer', value: pending.length, meta: t('Awaiting appraisal'), icon: 'clock', color: 'var(--gold)' },
        { label: 'Mortgaged', value: parcels.filter((p) => p.status === 'Mortgaged').length, icon: 'lock', color: '#6B4FBB' },
        { label: 'Disputed', value: parcels.filter((p) => p.status === 'Disputed').length, meta: t('Transactions blocked'), icon: 'alert', color: 'var(--red)' },
      ], 'compact')}
      ${ui.tabs([
        { id: 'map', label: 'Cadastral map', icon: 'map', content: `<div class="panel"><div class="map-layout"><div class="map-canvas" id="lp-map-wrap"><div id="lp-map"></div>
            <div class="map-tools"><select id="lp-prov" aria-label="${t('Province / city')}">${provs.map((p) => `<option ${p === prov ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select><select id="lp-pf" aria-label="${t('Highlight land use')}"><option value="">${t('All land uses')}</option>${Object.keys(PURPOSES).map((k) => `<option value="${k}">${k} ${esc(t(PURPOSES[k][0]))}</option>`).join('')}</select></div>
            <div class="map-compass" aria-hidden="true">N ↑</div><div class="map-scale">0 — 50 m · ${t('Illustrative map, not to scale')}</div></div>
          <div class="map-side" id="lp-side" aria-live="polite"></div></div></div>` },
        { id: 'reg', label: 'Parcel register', icon: 'list', count: parcels.length, content: '<div class="panel"><div class="panel-body flush" id="lp-t"></div></div>' },
        { id: 'tr', label: 'Transfers', icon: 'swap', content: '<div class="panel"><div class="panel-body flush" id="lp-tr"></div></div>' },
        { id: 'rep', label: 'Reports', icon: 'chart', content: `<div class="grid g-3">${ui.panel({ title: t('Parcels by land use'), body: '<div id="lp-c1"></div>' })}${ui.panel({ title: t('Registration status'), body: '<div id="lp-c2"></div>' })}${ui.panel({ title: t('Transactions by year'), sub: t('Transfers, gifts, inheritance and mortgages'), body: '<div id="lp-c3"></div>' })}</div>` },
      ], { cls: 'page-tabs', active: tab, id: 'lndtabs' })}`;

    const drawMap = () => {
      const list = parcels.filter((p) => p.province === prov);
      U.$('#lp-map', el).innerHTML = mapSVG(prov, list, sel, pf);
      U.$('#lp-side', el).innerHTML = `<div class="xs muted mb-1">${esc(prov)} · ${list.length} ${t('registered parcels shown')}</div>` + sidePanel(sel && list.find((p) => p.id === sel));
      const ob = U.$('[data-open]', el); if (ob) ob.onclick = () => parcelModal(S.find('parcels', ob.dataset.open), refresh);
    };
    drawMap();
    const wrap = U.$('#lp-map-wrap', el);
    const pick = (e) => { const pg = e.target.closest('[data-parcel]'); if (!pg) return; sel = pg.dataset.parcel; drawMap(); const f = U.$(`[data-parcel="${sel}"]`, el); if (f && e.type === 'keydown') f.focus(); };
    wrap.addEventListener('click', pick);
    wrap.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-parcel]')) { e.preventDefault(); pick(e); } });
    U.$('#lp-prov', el).onchange = (e) => { prov = e.target.value; sel = ''; drawMap(); };
    U.$('#lp-pf', el).onchange = (e) => { pf = e.target.value; drawMap(); };

    ui.table(U.$('#lp-t', el), { rows: () => S.all('parcels'), exportName: 'land-parcels', searchKeys: ['parcelNo', 'certNo', 'ownerName', 'street', 'ward', (p) => `${p.parcelNo}/${p.sheetNo}`], searchPlaceholder: t('Search by parcel no., certificate, owner or address'),
      filters: [{ key: 'province', label: 'Province', all: 'All provinces', options: provs }, { key: 'purpose', label: 'Land use', all: 'All land uses', options: Object.keys(PURPOSES).map((k) => ({ value: k, label: `${k} ${t(PURPOSES[k][0])}` })) }, { key: 'status', label: 'Status', all: 'All statuses', options: STATUSES }],
      defaultSort: 'parcelNo', defaultDir: 'asc',
      columns: [
        { key: 'parcelNo', label: 'Parcel / sheet', render: (p) => `<span class="strong">${esc(p.parcelNo)} / ${esc(p.sheetNo)}</span><span class="sub code">${esc(p.certNo || t('No certificate yet'))}</span>`, sort: (p) => +p.parcelNo, csv: (p) => `${p.parcelNo}/${p.sheetNo}` },
        { key: 'street', label: 'Location', render: (p) => `${esc(p.street)}<span class="sub">${esc(U.address({ ward: p.ward, district: p.district, province: p.province }))}</span>`, csv: (p) => U.address(p) },
        { key: 'area', label: 'Area', cls: 'right', render: (p) => area(p.area), csv: (p) => p.area },
        { key: 'purpose', label: 'Purpose', render: (p) => `<span class="tag" style="background:${(PURPOSES[p.purpose] || ['', '#fff'])[1]}">${esc(p.purpose)}</span><span class="sub">${esc(t(p.purposeName))}</span>`, csv: (p) => p.purpose },
        { key: 'ownerName', label: 'Owner / land user', render: (p) => `${esc(p.ownerName)}<span class="sub">${t(p.ownerType)}</span>` },
        { key: 'value', label: 'Est. value', cls: 'right', render: (p) => U.vndShort(p.value), csv: (p) => p.value },
        { key: 'status', label: 'Status', render: (p) => ui.badge(p.status) },
      ],
      onRowClick: (p) => parcelModal(p, refresh),
      rowActions: () => [{ id: 'map', label: 'Show on map', icon: 'map' }, { id: 'o', label: 'Open record', icon: 'eye' }],
      onAction: (id, p) => { if (id === 'o') parcelModal(p, refresh); else { tab = 'map'; prov = p.province; sel = p.id; render(el, params, { tab, prov, id: p.id, nomodal: 1 }); } } });

    const trs = [];
    parcels.forEach((p) => {
      p.transfers.forEach((x, i) => trs.push(Object.assign({ id: p.id + '-' + i, parcelId: p.id, parcel: `${p.parcelNo}/${p.sheetNo}`, ward: p.ward, status: 'Registered' }, x)));
      if (p.pendingTransfer) trs.push(Object.assign({ id: p.id + '-p', parcelId: p.id, parcel: `${p.parcelNo}/${p.sheetNo}`, ward: p.ward, from: p.ownerName, status: 'Pending transfer' }, p.pendingTransfer));
    });
    ui.table(U.$('#lp-tr', el), { rows: () => trs, exportName: 'land-transfers', searchKeys: ['from', 'to', 'ref', 'parcel'], searchPlaceholder: t('Search by party, contract or parcel'),
      filters: [{ key: 'type', label: 'Type', all: 'All types', options: () => U.uniq(trs.map((x) => x.type)) }, { key: 'status', label: 'Status', all: 'All statuses', options: ['Registered', 'Pending transfer'] }],
      dateKey: 'date', defaultSort: 'date',
      columns: [
        { key: 'date', label: 'Date', render: (x) => U.date(x.date) },
        { key: 'parcel', label: 'Parcel / sheet', render: (x) => `<span class="strong">${esc(x.parcel)}</span><span class="sub">${esc(x.ward)}</span>` },
        { key: 'type', label: 'Type', render: (x) => esc(t(x.type)) },
        { key: 'from', label: 'From', render: (x) => esc(x.from || '—') }, { key: 'to', label: 'To', render: (x) => esc(x.to) },
        { key: 'value', label: 'Value', cls: 'right', render: (x) => (x.value ? U.vndShort(x.value) : '—'), csv: (x) => x.value },
        { key: 'ref', label: 'Reference', cls: 'code' }, { key: 'status', label: 'Status', render: (x) => ui.badge(x.status) },
      ], onRowClick: (x) => parcelModal(S.find('parcels', x.parcelId), refresh) });

    const pc = U.groupCount(parcels, 'purpose');
    ui.chart.donut(U.$('#lp-c1', el), { items: Object.keys(pc).map((k) => ({ label: k + ' ' + t(PURPOSES[k][0]), value: pc[k], color: ['#0B5CAD', '#5AA3E8', '#E8A900', '#15703F', '#6B4FBB', '#C62828', '#0A8C8C'][Object.keys(PURPOSES).indexOf(k)] })), centerLabel: 'Parcels' });
    const sc = U.groupCount(parcels, 'status');
    ui.chart.hbar(U.$('#lp-c2', el), { items: STATUSES.map((s) => ({ label: s, value: sc[s] || 0, color: { Registered: '#15703F', Mortgaged: '#6B4FBB', Disputed: '#C62828' }[s] || '#E8A900' })) });
    const years = []; for (let y = new Date().getFullYear() - 7; y <= new Date().getFullYear(); y++) years.push(y);
    ui.chart.bar(U.$('#lp-c3', el), { labels: years.map(String), series: [{ name: 'Transfers', values: years.map((y) => trs.filter((x) => String(x.date).startsWith(y) && !/Mortgage|issuance|Application|Dispute/.test(x.type)).length) }, { name: 'Other transactions', values: years.map((y) => trs.filter((x) => String(x.date).startsWith(y) && /Mortgage|issuance|Application|Dispute/.test(x.type)).length), color: '#E8A900' }], stacked: true, fmt: U.num, height: 220 });

    const nb = U.$('#lp-new', el); if (nb) nb.onclick = () => edit(null, refresh);
    ui.bindTabs(el, (id) => { tab = id; });
    if (q.id && !q.nomodal) M.openFromQuery(q, 'parcels', (p) => parcelModal(p, refresh));
  }

  GA.modules.land = { render };
})(window.GA);
