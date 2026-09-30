/* Emergency: arrival, triage, assessment, treatment, disposition */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, icon = HIS.icon;
  const D = () => HIS.store.data;

  function render(el) {
    const d = D();
    const active = d.emergencyCases.filter((c) => !['Discharged', 'Transferred'].includes(c.status));
    el.innerHTML = `${UI.pageHead({ title: 'Emergency', sub: 'Arrival, triage and treatment for emergency patients', crumbs: [{ label: 'Emergency' }], actions: `<button class="btn btn-primary" data-a="new">${icon('plus')}Register arrival</button>` })}
      <div class="kpi-grid mb-2" style="grid-template-columns:repeat(5,minmax(0,1fr))">
        ${UI.kpi({ label: 'Active cases', value: active.length })}
        ${UI.kpi({ label: 'Critical', value: active.filter((c) => c.triageLevel === 'Critical').length, dot: 'var(--tri-critical)' })}
        ${UI.kpi({ label: 'Urgent', value: active.filter((c) => c.triageLevel === 'Urgent').length, dot: 'var(--tri-urgent)' })}
        ${UI.kpi({ label: 'Waiting for triage', value: active.filter((c) => c.status === 'Arrived').length })}
        ${UI.kpi({ label: 'Avg. wait (active)', value: `${Math.round(U.sum(active, K.waitingMinutes) / (active.length || 1))} min` })}
      </div><div id="er-board"></div>`;
    el.querySelector('[data-a=new]').onclick = () => registerDialog();
    drawBoard(el.querySelector('#er-board'));
  }

  const RANK = { Critical: 0, Urgent: 1, Moderate: 2, 'Non-Urgent': 3 };
  function drawBoard(host) {
    const list = D().emergencyCases.slice().sort((a, b) => (RANK[a.triageLevel] - RANK[b.triageLevel]) || (a.arrivalTime < b.arrivalTime ? -1 : 1));
    host.innerHTML = `<div class="er-board">${list.length ? list.map((c) => `
      <button type="button" class="er-card" data-triage="${c.triageLevel}" data-c="${c.id}">
        <div><span class="triage-dot"></span> <strong>${U.esc(K.patientName(c.patientId))}</strong> <span class="badge tone-${U.tone(c.triageLevel)}" style="margin-left:6px">${c.triageLevel}</span>
          <div class="er-meta">${U.esc(c.chiefComplaint)} · ${c.assignedRoom || 'No room'} · ${c.assignedDoctorId ? K.doctorName(c.assignedDoctorId) : 'Unassigned'}</div></div>
        <div class="row" style="justify-content:flex-end"><span class="small muted">${['Discharged', 'Transferred'].includes(c.status) ? U.fmtDateTime(c.arrivalTime) : `${K.waitingMinutes(c)} min waiting`}</span>${U.badge(c.status)}</div>
      </button>`).join('') : UI.empty('No emergency cases', '')}</div>`;
    host.onclick = (e) => { const c = e.target.closest('[data-c]'); if (c) detail(c.dataset.c); };
  }

  function detail(id) {
    const draw = () => {
      const c = K.erCase(id);
      const p = K.patient(c.patientId);
      const next = K.erNextStatuses(c);
      ctx.setTitle(`Emergency — ${p.name}`);
      ctx.body.innerHTML = `<div class="row-between mb-2"><div><a class="strong" href="#/patients/${p.id}">${U.esc(p.name)}</a><div class="small muted">${U.age(p.dob)}y · ${U.esc(p.gender)}${p.allergies.length ? ` · Allergies: ${p.allergies.map(U.esc).join(', ')}` : ''}</div></div><span class="badge tone-${U.tone(c.triageLevel)}">${c.triageLevel}</span></div>
        <dl class="dl mb-2"><dt>Arrival</dt><dd>${U.fmtDateTime(c.arrivalTime)} (${K.waitingMinutes(c)} min ago)</dd><dt>Chief complaint</dt><dd>${U.esc(c.chiefComplaint)}</dd>
        <dt>Assigned doctor</dt><dd>${c.assignedDoctorId ? K.doctorName(c.assignedDoctorId) : '—'}</dd><dt>Room</dt><dd>${U.esc(c.assignedRoom || '—')}</dd><dt>Status</dt><dd>${U.badge(c.status)}</dd></dl>
        <div class="row" id="er-acts">${next.map((s) => `<button class="btn btn-sm ${s === 'Critical' ? 'btn-danger' : ''}" data-next="${s}">Move to ${s}</button>`).join('')}</div>`;
      ctx.body.querySelector('#er-acts').onclick = (e) => {
        const b = e.target.closest('[data-next]');
        if (!b) return;
        const status = b.dataset.next;
        if (status === 'Triage') return triageDialog(c, draw);
        if (status === 'Admitted') return admitFromEr(c, draw, ctx);
        try { K.setErStatus(c.id, status); UI.toast(`Case moved to ${status}`); if (status === 'Discharged' || status === 'Transferred') { ctx.close(); HIS.app.refresh(); } else draw(); }
        catch (e2) { UI.toast(e2.message, 'error'); }
      };
    };
    const ctx = UI.modal({ title: 'Emergency case', size: 'md', body: '' });
    draw();
  }
  function triageDialog(c, after) {
    const d = D();
    UI.modal({ title: 'Triage assessment', size: 'sm',
      body: UI.form([{ name: 'triageLevel', label: 'Triage level', type: 'select', options: HIS.clinic.TRIAGE_LEVELS, value: c.triageLevel }, { name: 'assignedDoctorId', label: 'Assign doctor', type: 'select', options: d.doctors.filter((x) => x.departmentId === 'DPT12').map((x) => ({ value: x.id, label: 'Dr. ' + x.name })), value: c.assignedDoctorId }, { name: 'assignedRoom', label: 'Room', value: c.assignedRoom }]),
      actions: [{ label: 'Cancel' }, { label: 'Confirm triage', kind: 'primary', onClick: (ctx) => { const v = UI.readForm(ctx.body); K.setErStatus(c.id, 'Triage', v); UI.toast('Triage recorded'); after(); } }] });
  }
  function admitFromEr(c, after, parentCtx) {
    const beds = K.availableBeds();
    UI.modal({ title: 'Admit from emergency', size: 'sm',
      body: beds.length ? UI.form([{ name: 'bedId', label: 'Bed', type: 'select', options: beds.map((b) => ({ value: b.id, label: `${K.bedLabel(b.id)} · ${K.departmentName(b.departmentId)}` })) }]) : `<p class="muted">No beds are currently available.</p>`,
      actions: beds.length ? [{ label: 'Cancel' }, { label: 'Admit', kind: 'primary', onClick: (ctx) => { try { K.setErStatus(c.id, 'Admitted', { bedId: UI.readForm(ctx.body).bedId }); UI.toast('Patient admitted from emergency'); parentCtx.close(); HIS.app.refresh(); } catch (e) { UI.toast(e.message, 'error'); return false; } } }] : [{ label: 'Close' }] });
  }

  function registerDialog() {
    const d = D();
    const patientLabel = (p) => `${p.name} · ${p.phone} (${p.id})`;
    UI.modal({
      title: 'Register emergency arrival', size: 'md',
      body: `<datalist id="er-pt-dl">${d.patients.map((p) => `<option value="${U.esc(patientLabel(p))}">`).join('')}</datalist>
        <div class="field mb-1"><label for="er-pt">Patient (existing) <span class="req">*</span></label><input id="er-pt" list="er-pt-dl" autocomplete="off" placeholder="Type a name or phone — or add a new patient first"></div>
        ${UI.form([{ name: 'triageLevel', label: 'Triage level', type: 'select', options: HIS.clinic.TRIAGE_LEVELS, value: 'Moderate' }, { name: 'chiefComplaint', label: 'Chief complaint', span: 2, required: true }])}
        <p class="form-error mt-1" id="er-err" hidden></p>`,
      actions: [{ label: 'Cancel' }, { label: 'Register', kind: 'danger', onClick: (ctx) => {
        const err = ctx.body.querySelector('#er-err');
        const val = ctx.body.querySelector('#er-pt').value;
        const mm = val.match(/\((PT-\d+)\)\s*$/);
        const p = mm ? K.patient(mm[1]) : d.patients.find((pp) => pp.name.toLowerCase() === val.trim().toLowerCase());
        if (!p) { err.textContent = 'Select an existing patient, or add them from Patients first.'; err.hidden = false; return false; }
        if (!UI.validate(ctx.body)) return false;
        const x = UI.readForm(ctx.body);
        const c = K.registerEmergency({ patientId: p.id, triageLevel: x.triageLevel, chiefComplaint: x.chiefComplaint });
        UI.toast(`${p.name} registered · ${c.triageLevel}`); HIS.app.refresh();
      } }]
    });
  }

  HIS.modules.emergency = { title: 'Emergency', render, detail, registerDialog };
})();
