/* Beds & Rooms: visual bed management board */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  function render(el) {
    const d = D();
    const s = K.bedStats();
    el.innerHTML = `${UI.pageHead({ title: 'Beds & Rooms', sub: 'Live bed status across buildings and departments', crumbs: [{ label: 'Beds & Rooms' }] })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(5,minmax(0,1fr))">
        ${UI.kpi({ label: 'Total beds', value: s.total })}
        ${UI.kpi({ label: 'Available', value: s.available, dot: 'var(--st-available)' })}
        ${UI.kpi({ label: 'Occupied', value: s.occupied, dot: 'var(--st-occupied)' })}
        ${UI.kpi({ label: 'Reserved', value: s.reserved, dot: 'var(--st-reserved)' })}
        ${UI.kpi({ label: 'Cleaning / Maintenance', value: s.cleaning + s.maintenance, dot: 'var(--st-cleaning)' })}
      </div>
      <div class="card mb-2"><div class="card-body row-between">
        <div class="status-legend">${K.BED_STATUSES.map((st) => `<span class="chip"><span class="swatch" data-status="${st}" style="width:10px;height:10px;border-radius:3px;display:inline-block;margin-right:6px"></span>${st}</span>`).join('')}</div>
        <label class="row"><span class="small muted">Department</span><select class="select-sm" id="bd-dept"><option value="">All</option>${d.departments.filter((x) => x.inpatient).map((x) => `<option value="${x.id}">${x.name}</option>`).join('')}</select></label>
      </div></div>
      <div id="bd-board"></div>`;
    const sel = el.querySelector('#bd-dept');
    sel.onchange = () => drawBoard(el.querySelector('#bd-board'), sel.value);
    drawBoard(el.querySelector('#bd-board'), '');
  }

  function drawBoard(host, deptId) {
    const beds = D().beds.filter((b) => !deptId || b.departmentId === deptId);
    const byBuilding = U.groupBy(beds, (b) => `${b.building}|${b.floor}|${b.departmentId}`);
    const rows = Object.keys(byBuilding).sort().map((k) => {
      const [building, floor, dept] = k.split('|');
      const list = byBuilding[k].sort((a, b) => a.room.localeCompare(b.room) || a.bedNumber - b.bedNumber);
      return `<div class="floor-row"><div class="floor-label">${U.esc(building)}<small>Floor ${floor} · ${K.departmentName(dept)}</small></div>
        <div class="bed-tiles">${list.map((b) => `<button type="button" class="bed-tile" data-status="${b.status}" data-bed="${b.id}"><span class="bt-num">${b.room}-${b.bedNumber}</span><span class="bt-dept">${b.status}</span>${b.patientId ? `<span class="bt-patient">${U.esc(K.patientName(b.patientId))}</span>` : ''}</button>`).join('')}</div></div>`;
    }).join('');
    host.innerHTML = `<div class="card"><div class="card-body"><div class="bed-board">${rows || UI.empty('No beds in this department', '')}</div></div></div>`;
    host.onclick = (e) => { const t = e.target.closest('[data-bed]'); if (t) bedDialog(t.dataset.bed); };
  }

  function bedDialog(id) {
    const b = K.bed(id);
    const patient = b.patientId ? K.patient(b.patientId) : null;
    const admission = patient ? D().admissions.find((a) => a.bedId === b.id && a.status === 'Admitted') : null;
    const next = K.bedNextStatuses(b);
    UI.modal({
      title: `Bed ${K.bedLabel(b.id)}`, size: 'sm',
      body: `<dl class="dl mb-2"><dt>Department</dt><dd>${K.departmentName(b.departmentId)}</dd><dt>Location</dt><dd>${U.esc(b.building)} · Floor ${b.floor} · Room ${b.room}</dd><dt>Status</dt><dd>${U.badge(b.status)}</dd></dl>
        ${patient ? `<div class="card"><div class="card-body"><a class="strong" href="#/patients/${patient.id}">${U.esc(patient.name)}</a><div class="small muted">${U.age(patient.dob)}y · ${U.esc(patient.gender)}</div>${admission ? `<a class="small" href="#/admissions/${admission.id}">Open admission ${admission.id}</a>` : ''}</div></div>` : ''}
        ${next.length ? `<div class="row mt-2">${next.map((s) => `<button class="btn btn-sm" data-set="${s}">Mark ${s}</button>`).join('')}</div>` : ''}
        ${!patient && b.status === 'Available' ? `<button class="btn btn-primary btn-block mt-2" id="bd-admit">Admit patient to this bed</button>` : ''}`,
      onMount: (ctx) => {
        ctx.body.addEventListener('click', (e) => {
          const s = e.target.closest('[data-set]');
          if (s) { try { K.setBedStatus(b.id, s.dataset.set); UI.toast(`Bed ${K.bedLabel(b.id)} marked ${s.dataset.set}`); ctx.close(); HIS.app.refresh(); } catch (err) { UI.toast(err.message, 'error'); } }
        });
        const admitBtn = ctx.body.querySelector('#bd-admit');
        if (admitBtn) admitBtn.onclick = () => { ctx.close(); HIS.modules.admissions.admitDialog(); };
      }
    });
  }

  HIS.modules.beds = { title: 'Beds & Rooms', render, bedDialog };
})();
