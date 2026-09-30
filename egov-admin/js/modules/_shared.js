/* Helpers shared by feature modules. */
window.GA = window.GA || {};
GA.modules = GA.modules || {};
(function (GA) {
  'use strict';
  const U = GA.util, t = GA.t, esc = U.esc, icon = U.icon;
  const M = {};

  M.ml = (key) => U.monthLabel(+key.slice(0, 4), +key.slice(5, 7) - 1);
  M.OPEN_APP = ['Submitted', 'Under Review', 'Additional Information Required'];
  M.DONE_APP = ['Approved', 'Rejected', 'Completed'];
  M.OPEN_CP = ['Received', 'Assigned', 'Investigating', 'Waiting for Information'];

  /* Collections scoped to the signed-in portal user; staff see everything. */
  M.scoped = (c) => {
    const all = GA.store.all(c), app = GA.app;
    if (!app.portal) return all;
    const own = (id) => app.owns(id);
    switch (c) {
      case 'applications': case 'appointments': return all.filter((x) => own(x.applicantId));
      case 'complaints': return all.filter((x) => own(x.citizenId));
      case 'identities': return all.filter((x) => own(x.citizenId));
      case 'businesses': return all.filter((x) => own(x.id) || own(x.repCitizenId));
      case 'taxpayers': return all.filter((x) => own(x.refId));
      case 'declarations': case 'taxPayments': { const ids = M.scoped('taxpayers').map((x) => x.id); return all.filter((x) => ids.includes(x.taxpayerId)); }
      default: return all;
    }
  };

  /* Standard detail header block. */
  M.detailHead = (o) => `<div class="panel"><div class="detail-head">${o.lead || ''}<div class="dh-main"><div class="dh-title">${o.title}</div><div class="dh-meta">${(o.meta || []).filter(Boolean).map((m) => `<span>${m}</span>`).join('')}</div></div>${o.actions ? `<div class="dh-actions">${o.actions}</div>` : ''}</div>${o.foot || ''}</div>`;

  M.selectOpts = (arr, cur) => arr.map((o) => { const v = typeof o === 'object' ? o.value : o, l = typeof o === 'object' ? o.label : t(o); return `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`; }).join('');

  /* Address fields with dependent province → district → ward selects. */
  M.addressFields = (prefix) => {
    const P = GA.data.PROVINCES;
    const two = GA.store.setting('addressModel') === '2-level';
    const prov = (v) => P.find((p) => p.name === v);
    const f = [
      { key: 'province', label: 'Province/City', type: 'select', required: true, options: P.map((p) => ({ value: p.name, label: p.name })) },
      { key: 'district', label: 'District', type: 'select', required: !two, dependsOn: 'province', optionsFn: (v) => { const p = prov(v.province); return p ? p.units.map((u) => ({ value: u[0], label: u[0] })) : []; } },
      { key: 'ward', label: 'Ward/Commune', type: 'select', required: true, dependsOn: 'district', optionsFn: (v) => { const p = prov(v.province); if (!p) return []; const u = p.units.find((x) => x[0] === v.district); return (u ? u[1] : two ? p.units.flatMap((x) => x[1]) : []).map((w) => ({ value: w, label: w })); } },
      { key: 'street', label: 'House number, street', required: true, placeholder: 'e.g. 25 Bạch Đằng' },
    ];
    if (two) { f[1].help = '2-level model: district is kept for reference only.'; }
    return prefix ? f.map((x) => Object.assign({}, x, { key: x.key })) : f;
  };

  M.fileChip = (name) => `<span class="tag">${icon('clip', 'i-sm')}${esc(name)}</span>`;
  M.kv = (label, value) => `<div><div class="xs muted">${esc(t(label))}</div><div class="strong">${value}</div></div>`;

  /* Mini meter row */
  M.meter = (label, val, max, color, fmt) => `<div class="mb-1"><div class="meter-row"><span>${esc(t(label))}</span><span class="strong">${(fmt || U.num)(val)}</span></div><div class="progress"><span style="width:${Math.min(100, max ? (val / max) * 100 : 0)}%;background:${color || 'var(--blue)'}"></span></div></div>`;

  /* Parse ?id= from query and open a record modal after render. */
  /* Drop ?id=… from the URL once handled, so later re-renders do not reopen the record. */
  M.clearQuery = () => { const h = location.hash, i = h.indexOf('?'); if (i < 0) return; try { history.replaceState(null, '', location.pathname + location.search + h.slice(0, i)); } catch (e) { /* file:// restrictions: keep hash */ } };
  M.openFromQuery = (q, collection, open) => { if (q && q.id) { const r = GA.store.find(collection, q.id); if (r) setTimeout(() => { M.clearQuery(); open(r); }, 40); } };

  GA.mod = M;
})(window.GA);
