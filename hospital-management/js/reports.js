/* Reports: patient, appointment, doctor, department, revenue, insurance,
   pharmacy, laboratory, bed occupancy and emergency statistics */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util, UI = HIS.ui, K = HIS.clinic, C = HIS.chart, icon = HIS.icon;
  const D = () => HIS.store.data;
  let from = U.addDays(U.today(), -29), to = U.today(), deptFilter = '';

  function render(el) {
    const d = D();
    el.innerHTML = `${UI.pageHead({ title: 'Reports', sub: 'Statistics and performance across the hospital', crumbs: [{ label: 'Reports' }], actions: `<button class="btn btn-sm" id="rp-print">${icon('print')}Print</button>` })}
      <div class="card mb-2"><div class="card-body row">
        <label class="row small">From <input type="date" id="rp-from" value="${from}"></label>
        <label class="row small">To <input type="date" id="rp-to" value="${to}"></label>
        <label class="row small">Department <select class="select-sm" id="rp-dept"><option value="">All</option>${d.departments.map((x) => `<option value="${x.id}" ${x.id === deptFilter ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
      </div></div>
      <div id="rp-body"></div>`;
    el.querySelector('#rp-print').onclick = () => window.print();
    const apply = () => { from = el.querySelector('#rp-from').value; to = el.querySelector('#rp-to').value; deptFilter = el.querySelector('#rp-dept').value; draw(el.querySelector('#rp-body')); };
    el.querySelector('#rp-from').onchange = apply; el.querySelector('#rp-to').onchange = apply; el.querySelector('#rp-dept').onchange = apply;
    draw(el.querySelector('#rp-body'));
  }

  function inRange(dateStr) { return dateStr >= from && dateStr <= to; }
  function card(title, action, inner) { return `<div class="card mb-2"><div class="card-head"><h2>${title}</h2>${action || ''}</div><div class="card-body">${inner}</div></div>`; }

  function draw(host) {
    const d = D();
    const visits = d.visits.filter((v) => inRange(v.date) && (!deptFilter || v.departmentId === deptFilter) && v.stage === 'Completed');
    const appts = d.appointments.filter((a) => inRange(a.date) && (!deptFilter || a.departmentId === deptFilter));
    const invoices = d.invoices.filter((i) => inRange(i.date));
    const newPatients = d.patients.filter((p) => inRange(p.createdAt));
    const days = [];
    for (let dt = from; dt <= to; dt = U.addDays(dt, 1)) days.push(dt);

    const patientsByDay = days.map((dt) => newPatients.filter((p) => p.createdAt === dt).length);
    const visitsByDay = days.map((dt) => visits.filter((v) => v.date === dt).length);
    const revByDay = days.map((dt) => U.sum(invoices.filter((i) => i.date === dt), (i) => i.subtotal));
    const apptStatusData = K.APPT_STATUSES.map((s) => ({ label: s, value: appts.filter((a) => a.status === s).length })).filter((x) => x.value);
    const deptPerf = d.departments.filter((x) => HIS.REF.CLINICAL_DEPTS.includes(x.id)).map((x) => ({ label: x.name, value: visits.filter((v) => v.departmentId === x.id).length })).sort((a, b) => b.value - a.value);
    const docPerf = d.doctors.map((x) => { const vs = visits.filter((v) => v.doctorId === x.id); return { x, count: vs.length, revenue: vs.length * x.consultationFee }; }).filter((r) => r.count).sort((a, b) => b.count - a.count).slice(0, 10);
    const bs = K.bedStats();
    const labInRange = d.labOrders.filter((l) => inRange(l.orderedAt.slice(0, 10)));
    const labByStatus = K.LAB_STATUSES.map((s) => ({ label: s, value: labInRange.filter((l) => l.status === s).length })).filter((x) => x.value);
    const labByCat = U.groupBy(labInRange, (l) => l.category);
    const erInRange = d.emergencyCases.filter((c) => inRange(c.arrivalTime.slice(0, 10)));
    const erByTriage = K.TRIAGE_LEVELS.map((t) => ({ label: t, value: erInRange.filter((c) => c.triageLevel === t).length })).filter((x) => x.value);
    const claims = invoices.filter((i) => i.insuranceCovered > 0);
    const claimsByProvider = U.groupBy(claims, (i) => i.insuranceProvider || 'Other');

    host.innerHTML = `
      <div class="grid grid-2">
        ${card('Patient statistics', `<button class="btn btn-xs" data-exp="patients">${icon('download')}Export</button>`, `
          <div class="kpi-grid mb-2" style="grid-template-columns:repeat(3,1fr)">${UI.kpi({ label: 'New patients', value: newPatients.length })}${UI.kpi({ label: 'Total patients', value: d.patients.length })}${UI.kpi({ label: 'Insured', value: d.patients.filter((p) => p.insurance.number).length })}</div>
          ${C.line(days.map(U.dayLabel), [{ name: 'New patients', values: patientsByDay }], { format: (v) => Math.round(v), maxLabels: 8, label: 'New patients by day' })}`)}
        ${card('Appointment statistics', `<button class="btn btn-xs" data-exp="appts">${icon('download')}Export</button>`, `
          <div class="kpi-grid mb-2" style="grid-template-columns:repeat(2,1fr)">${UI.kpi({ label: 'Total appointments', value: appts.length })}${UI.kpi({ label: 'Completion rate', value: U.pct(appts.length ? (appts.filter((a) => a.status === 'Completed').length / appts.length) * 100 : 0) })}</div>
          ${apptStatusData.length ? C.donut(apptStatusData, { center: appts.length, sub: 'appts', label: 'Appointments by status' }) : UI.empty('No data in range', '')}`)}
      </div>
      <div class="grid grid-2">
        ${card('Doctor performance', '', `<div class="table-wrap"><table class="table compact"><thead><tr><th>Doctor</th><th>Department</th><th class="right">Visits</th><th class="right">Revenue</th></tr></thead><tbody>${docPerf.map((r) => `<tr><td>Dr. ${U.esc(r.x.name)}</td><td>${K.departmentName(r.x.departmentId)}</td><td class="right num">${r.count}</td><td class="right money">${U.money(r.revenue)}</td></tr>`).join('') || `<tr><td colspan="4">${UI.empty('No visits in range', '')}</td></tr>`}</tbody></table></div>`)}
        ${card('Department performance', '', deptPerf.some((x) => x.value) ? C.hbars(deptPerf.slice(0, 10)) : UI.empty('No data in range', ''))}
      </div>
      ${card('Revenue', `<button class="btn btn-xs" data-exp="revenue">${icon('download')}Export</button>`, `
        <div class="kpi-grid mb-2" style="grid-template-columns:repeat(3,1fr)">${UI.kpi({ label: 'Total billed', value: U.moneyShort(U.sum(invoices, (i) => i.subtotal)) })}${UI.kpi({ label: 'Insurance covered', value: U.moneyShort(U.sum(invoices, (i) => i.insuranceCovered)) })}${UI.kpi({ label: 'Collected', value: U.moneyShort(U.sum(invoices, K.invoicePaid)) })}</div>
        ${C.bar(days.map((dt, i) => ({ label: U.dayLabel(dt), value: revByDay[i] })), { maxLabels: 8, label: 'Revenue by day' })}`)}
      <div class="grid grid-2">
        ${card('Insurance', '', claims.length ? C.donut(Object.keys(claimsByProvider).map((k) => ({ label: k, value: U.sum(claimsByProvider[k], (i) => i.insuranceCovered) })), { format: U.moneyShort, center: U.moneyShort(U.sum(claims, (i) => i.insuranceCovered)), sub: 'VND', label: 'Insurance coverage by provider' }) : UI.empty('No claims in range', ''))}
        ${card('Pharmacy inventory', '', `<div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">${UI.kpi({ label: 'Low stock', value: d.medicines.filter((m) => K.medStockStatus(m) === 'Low Stock').length })}${UI.kpi({ label: 'Out of stock', value: d.medicines.filter((m) => K.medStockStatus(m) === 'Out of Stock').length })}${UI.kpi({ label: 'Expiring / expired', value: d.medicines.filter((m) => K.medExpiryStatus(m)).length })}</div>`)}
      </div>
      <div class="grid grid-2">
        ${card('Laboratory workload', '', labByStatus.length ? C.donut(labByStatus, { center: labInRange.length, sub: 'tests', label: 'Lab tests by status' }) : UI.empty('No tests in range', ''))}
        ${card('Bed occupancy', '', C.donut([{ label: 'Occupied', value: bs.occupied, color: 'var(--st-occupied)' }, { label: 'Available', value: bs.available, color: 'var(--st-available)' }, { label: 'Reserved', value: bs.reserved, color: 'var(--st-reserved)' }, { label: 'Cleaning', value: bs.cleaning, color: 'var(--st-cleaning)' }, { label: 'Maintenance', value: bs.maintenance, color: 'var(--st-maintenance)' }], { center: `${U.pct((bs.occupied / (bs.total || 1)) * 100, 0)}`, sub: 'occupied', label: 'Bed occupancy' }))}
      </div>
      ${card('Emergency statistics', '', `<div class="kpi-grid mb-2" style="grid-template-columns:repeat(2,1fr)">${UI.kpi({ label: 'Cases in range', value: erInRange.length })}${UI.kpi({ label: 'Avg. waiting time', value: `${Math.round(U.sum(erInRange, K.waitingMinutes) / (erInRange.length || 1))} min` })}</div>${erByTriage.length ? C.hbars(erByTriage.map((x) => ({ ...x, color: x.label === 'Critical' ? 'var(--tri-critical)' : x.label === 'Urgent' ? 'var(--tri-urgent)' : x.label === 'Moderate' ? 'var(--tri-moderate)' : 'var(--tri-nonurgent)' }))) : UI.empty('No cases in range', '')}`)}`;

    host.onclick = (e) => {
      const b = e.target.closest('[data-exp]');
      if (!b) return;
      if (b.dataset.exp === 'patients') UI.exportDialog('patients', [['Patient ID', 'Name', 'Created'], ...newPatients.map((p) => [p.id, p.name, p.createdAt])]);
      if (b.dataset.exp === 'appts') UI.exportDialog('appointments', [['ID', 'Patient', 'Doctor', 'Date', 'Status'], ...appts.map((a) => [a.id, K.patientName(a.patientId), K.doctorName(a.doctorId), a.date, a.status])]);
      if (b.dataset.exp === 'revenue') UI.exportDialog('revenue', [['Date', 'Revenue'], ...days.map((dt, i) => [dt, revByDay[i]])]);
    };
  }

  HIS.modules.reports = { title: 'Reports', render };
})();
