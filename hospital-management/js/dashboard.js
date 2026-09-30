/* Dashboard: live KPIs, bed occupancy, queue, charts */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, C = HIS.chart, icon = HIS.icon;

  function render(el) {
    const d = HIS.store.data;
    const k = K.kpis();
    const today = U.today();
    const days = Array.from({ length: 14 }, (_, i) => U.addDays(today, i - 13));
    const visitsByDay = days.map((dt) => d.visits.filter((v) => v.date === dt && v.stage === 'Completed').length);
    const revByDay = days.map((dt) => U.sum(d.invoices.filter((i) => i.date === dt), (i) => i.subtotal));
    const bs = K.bedStats();
    const ring = 2 * Math.PI * 56;
    const apptStatusToday = K.APPT_STATUSES.map((s) => ({ label: s, value: d.appointments.filter((a) => a.date === today && a.status === s).length })).filter((x) => x.value);
    const deptVisits = d.departments.filter((x) => HIS.REF.CLINICAL_DEPTS.includes(x.id)).map((x) => ({ label: x.name, value: d.visits.filter((v) => v.departmentId === x.id && v.date >= U.addDays(today, -13) && v.stage === 'Completed').length })).filter((x) => x.value).sort((a, b) => b.value - a.value).slice(0, 8);
    const todaysAppts = d.appointments.filter((a) => a.date === today).sort((a, b) => a.time.localeCompare(b.time));
    const queue = d.visits.filter((v) => v.date === today && ['Waiting', 'In Consultation', 'Labs/Imaging'].includes(v.stage)).sort((a, b) => a.queueNumber - b.queueNumber);
    const hour = Number(U.vnParts().hour);

    el.innerHTML = `
      ${UI.pageHead({ title: `Good ${hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'}, ${HIS.app.user.name.split(' ').pop()}`, sub: `${U.esc(d.settings.hospitalName)} · ${U.weekday(today)} ${U.fmtDate(today)}`,
        actions: `${HIS.app.can('appointments') ? `<button class="btn" data-go="new-appt">${icon('plus')}New appointment</button>` : ''}${HIS.app.can('visits') ? `<button class="btn btn-primary" data-go="checkin">${icon('checkin')}Check in patient</button>` : ''}` })}

      <section class="dash-hero">
        <div class="card occ-card">
          <div class="occ-ring">
            <svg viewBox="0 0 132 132"><circle class="ring-bg" cx="66" cy="66" r="56" fill="none" stroke-width="12"/><circle class="ring-fg" cx="66" cy="66" r="56" fill="none" stroke-width="12" stroke-dasharray="${(ring * k.occupancy / 100).toFixed(1)} ${ring.toFixed(1)}"/></svg>
            <div class="occ-ring-label"><strong>${U.pct(k.occupancy)}</strong><span>bed occupancy</span></div>
          </div>
          <div class="occ-stats">
            <div class="occ-stat"><span>Beds occupied</span><strong>${bs.occupied} <small class="muted">/ ${bs.total}</small></strong></div>
            <div class="occ-stat"><span>Available beds</span><strong>${bs.available}</strong></div>
            <div class="occ-stat"><span>Admitted patients</span><strong>${k.admitted}</strong></div>
            <div class="occ-stat"><span>Active emergency cases</span><strong>${k.erActive}</strong></div>
          </div>
        </div>
        <div class="card">
          <div class="today-strip">
            <div><span>Today's appointments</span><strong>${k.apptsToday}</strong><a href="#/appointments">${k.apptsPending} pending</a></div>
            <div><span>Waiting patients</span><strong>${k.waiting}</strong><a href="#/visits">View queue</a></div>
            <div><span>Pending lab tests</span><strong>${k.pendingLab}</strong><a href="#/lab">View lab</a></div>
          </div>
          <div class="today-revenue"><span class="muted small">Revenue today</span><strong>${U.money(k.revenueToday)}</strong></div>
        </div>
      </section>

      <section class="kpi-grid mb-2" style="grid-template-columns:repeat(4,minmax(0,1fr))">
        ${UI.kpi({ label: 'Total patients', value: U.num(k.totalPatients), link: '#/patients' })}
        ${UI.kpi({ label: "Today's appointments", value: k.apptsToday, link: '#/appointments' })}
        ${UI.kpi({ label: 'Waiting patients', value: k.waiting, dot: 'var(--warn)', link: '#/visits' })}
        ${UI.kpi({ label: 'Admitted patients', value: k.admitted, dot: 'var(--violet)', link: '#/admissions' })}
        ${UI.kpi({ label: 'Available beds', value: k.availableBeds, dot: 'var(--st-available)', link: '#/beds' })}
        ${UI.kpi({ label: 'Emergency cases', value: k.erActive, dot: 'var(--danger)', link: '#/emergency' })}
        ${UI.kpi({ label: 'Pending lab tests', value: k.pendingLab, dot: 'var(--info)', link: '#/lab' })}
        ${UI.kpi({ label: 'Revenue today', value: U.moneyShort(k.revenueToday), link: '#/billing' })}
      </section>

      <section class="grid grid-2-1 mb-2">
        <div class="card"><div class="card-head"><h2>Patient visits <span class="sub">· last 14 days</span></h2></div><div class="card-body">${C.line(days.map(U.dayLabel), [{ name: 'Visits', values: visitsByDay }], { maxLabels: 7, format: (v) => Math.round(v), label: 'Patient visits by day' })}</div></div>
        <div class="card"><div class="card-head"><h2>Today's appointments</h2></div><div class="card-body">${apptStatusToday.length ? C.donut(apptStatusToday, { center: todaysAppts.length, sub: 'appts', label: 'Appointment status' }) : UI.empty('No appointments today', '')}</div></div>
      </section>

      <section class="grid grid-2-1 mb-2">
        <div class="card"><div class="card-head"><h2>Revenue <span class="sub">· last 14 days</span></h2></div><div class="card-body">${C.bar(days.map((dt, i) => ({ label: U.dayLabel(dt), value: revByDay[i] })), { maxLabels: 7, label: 'Revenue by day' })}</div></div>
        <div class="card"><div class="card-head"><h2>Visits by department <span class="sub">· 14 days</span></h2></div><div class="card-body">${deptVisits.length ? C.hbars(deptVisits) : UI.empty('No visits in range', '')}</div></div>
      </section>

      <section class="grid grid-2">
        <div class="card">
          <div class="card-head"><h2>Today's appointments</h2><a class="small" href="#/appointments">View all</a></div>
          <div class="table-wrap"><table class="table compact"><thead><tr><th>Patient</th><th>Doctor</th><th>Time</th><th>Status</th></tr></thead><tbody>${todaysAppts.length ? todaysAppts.slice(0, 8).map((a) => `<tr class="clickable" data-appt="${a.id}"><td class="cell-main">${U.esc(K.patientName(a.patientId))}</td><td>${U.esc(K.doctorName(a.doctorId))}</td><td>${a.time}</td><td>${U.badge(a.status)}</td></tr>`).join('') : `<tr><td colspan="4">${UI.empty('No appointments today', '')}</td></tr>`}</tbody></table></div>
        </div>
        <div class="card">
          <div class="card-head"><h2>Patient queue</h2><a class="small" href="#/visits">Open queue board</a></div>
          <div class="table-wrap"><table class="table compact"><thead><tr><th>#</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead><tbody>${queue.length ? queue.slice(0, 8).map((v) => `<tr class="clickable" data-visit="${v.id}"><td class="num">${v.queueNumber}</td><td class="cell-main">${U.esc(K.patientName(v.patientId))}</td><td>${U.esc(K.doctorName(v.doctorId))}</td><td>${U.badge(v.stage)}</td></tr>`).join('') : `<tr><td colspan="4">${UI.empty('No patients waiting', '')}</td></tr>`}</tbody></table></div>
        </div>
      </section>`;

    el.onclick = (e) => {
      const go = e.target.closest('[data-go]');
      if (go && go.dataset.go === 'new-appt') HIS.modules.appointments.openForm();
      if (go && go.dataset.go === 'checkin') HIS.modules.visits.checkInDialog();
      const ap = e.target.closest('[data-appt]');
      if (ap) HIS.modules.appointments.detail(ap.dataset.appt);
      const v = e.target.closest('[data-visit]');
      if (v) HIS.modules.visits.openVisit(v.dataset.visit);
    };
  }

  HIS.modules.dashboard = { title: 'Dashboard', render };
})();
