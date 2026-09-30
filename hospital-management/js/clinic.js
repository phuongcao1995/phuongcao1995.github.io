/* =========================================================
   Clinical & business rules. All modules mutate data through
   here so bed status, queues, billing maths and workflow
   stages stay consistent across the app.
   ========================================================= */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util;
  const D = () => HIS.store.data;
  const K = (HIS.clinic = {});

  K.VISIT_STAGES = ['Waiting', 'In Consultation', 'Labs/Imaging', 'Billing', 'Completed'];
  K.APPT_STATUSES = ['Scheduled', 'Checked In', 'Waiting', 'In Consultation', 'Completed', 'Cancelled', 'No Show'];
  K.APPT_TYPES = ['General Consultation', 'Follow-up', 'Specialist Consultation', 'Health Check', 'Vaccination', 'Laboratory', 'Imaging', 'Surgery Consultation'];
  K.BED_STATUSES = ['Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance'];
  K.TRIAGE_LEVELS = ['Critical', 'Urgent', 'Moderate', 'Non-Urgent'];
  K.ER_STATUSES = ['Arrived', 'Triage', 'Assessment', 'Treatment', 'Admitted', 'Discharged', 'Transferred'];
  K.LAB_STATUSES = ['Ordered', 'Collected', 'Processing', 'Completed', 'Approved'];
  K.IMAGING_STATUSES = ['Ordered', 'Scheduled', 'Performed', 'Reported'];
  K.IMAGING_TYPES = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography'];
  K.RX_STATUSES = ['Pending', 'Dispensed', 'Cancelled'];
  K.INV_STATUSES = ['Unpaid', 'Partially Paid', 'Paid', 'Refunded'];
  K.BILL_CATS = ['Consultation', 'Laboratory', 'Imaging', 'Medicine', 'Room', 'Procedure', 'Surgery', 'Other'];

  /* ---------------- Lookups ---------------- */
  K.patient = (id) => D().patients.find((p) => p.id === id);
  K.patientName = (id) => (K.patient(id) || {}).name || '—';
  K.doctor = (id) => D().doctors.find((x) => x.id === id);
  K.doctorName = (id) => { const x = K.doctor(id); return x ? `Dr. ${x.name}` : '—'; };
  K.department = (id) => D().departments.find((x) => x.id === id);
  K.departmentName = (id) => (K.department(id) || {}).name || '—';
  K.bed = (id) => D().beds.find((b) => b.id === id);
  K.bedLabel = (id) => { const b = K.bed(id); return b ? `${b.room}-${b.bedNumber}` : 'Unassigned'; };
  K.staffMember = (id) => D().staff.find((s) => s.id === id);
  K.appt = (id) => D().appointments.find((a) => a.id === id);
  K.visit = (id) => D().visits.find((v) => v.id === id);
  K.admission = (id) => D().admissions.find((a) => a.id === id);
  K.medicine = (id) => D().medicines.find((m) => m.id === id);
  K.invoice = (id) => D().invoices.find((i) => i.id === id);
  K.rx = (id) => D().prescriptions.find((p) => p.id === id);
  K.labOrder = (id) => D().labOrders.find((l) => l.id === id);
  K.imagingOrder = (id) => D().imagingOrders.find((l) => l.id === id);
  K.erCase = (id) => D().emergencyCases.find((e) => e.id === id);
  K.user = () => (HIS.app && HIS.app.user && HIS.app.user.name) || 'System';

  K.doctorsInDept = (deptId) => D().doctors.filter((d) => d.departmentId === deptId && d.status !== 'Inactive');
  K.activeDoctors = () => D().doctors.filter((d) => d.status !== 'Inactive');

  /* ---------------- Notifications log ---------------- */
  K.notify = (type, text, link = '') => {
    const d = D();
    d.notifications.unshift({ id: 'N' + (++d.counters.notif), type, text, time: U.nowStamp(), link, read: false });
    d.notifications = d.notifications.slice(0, 40);
  };

  /* ---------------- Appointments ---------------- */
  K.conflictingAppt = (doctorId, date, time, excludeId) => D().appointments.find((a) =>
    a.id !== excludeId && a.doctorId === doctorId && a.date === date && a.time === time && !['Cancelled', 'No Show'].includes(a.status));
  K.createAppointment = (x) => {
    if (!x.patientId) throw new Error('Select a patient.');
    if (!x.doctorId) throw new Error('Select a doctor.');
    if (!x.date || !x.time) throw new Error('Choose a date and time.');
    if (K.conflictingAppt(x.doctorId, x.date, x.time, x.id)) throw new Error(`${K.doctorName(x.doctorId)} already has an appointment at ${x.time} on ${U.fmtDate(x.date)}.`);
    const d = D();
    const a = {
      id: HIS.store.nextId('appt', 'AP-', 6), patientId: x.patientId, doctorId: x.doctorId, departmentId: x.departmentId || K.doctor(x.doctorId).departmentId,
      date: x.date, time: x.time, type: x.type || 'General Consultation', reason: x.reason || '', status: 'Scheduled', notes: x.notes || '',
      createdAt: U.nowStamp(), createdBy: K.user()
    };
    d.appointments.push(a);
    K.notify('appointment', `New appointment ${a.id}: ${K.patientName(a.patientId)} with ${K.doctorName(a.doctorId)} · ${U.fmtDate(a.date)} ${a.time}`, `#/appointments`);
    HIS.store.commit();
    return a;
  };
  K.updateAppointment = (id, x) => {
    const a = K.appt(id);
    if (!a) throw new Error('Appointment not found.');
    if (['Completed', 'Cancelled'].includes(a.status)) throw new Error(`A ${a.status.toLowerCase()} appointment cannot be edited.`);
    const merged = Object.assign({}, a, x);
    if (K.conflictingAppt(merged.doctorId, merged.date, merged.time, id)) throw new Error(`${K.doctorName(merged.doctorId)} already has an appointment at ${merged.time} on ${U.fmtDate(merged.date)}.`);
    Object.assign(a, x);
    HIS.store.commit();
    return a;
  };
  K.setApptStatus = (id, status, reason = '') => {
    const a = K.appt(id);
    if (!a) throw new Error('Appointment not found.');
    a.status = status;
    if (status === 'Cancelled') a.cancelReason = reason;
    HIS.store.commit();
    return a;
  };

  /* ---------------- Outpatient queue / visits ---------------- */
  K.queueToday = (deptId) => D().visits.filter((v) => v.date === U.today() && (!deptId || v.departmentId === deptId) && v.stage !== 'Completed' && v.stage !== 'Cancelled');
  K.nextQueueNumber = (deptId, date) => D().visits.filter((v) => v.departmentId === deptId && v.date === date).length + 1;

  /** Check a patient in — from an existing appointment or as a walk-in. */
  K.checkIn = ({ appointmentId, patientId, doctorId, departmentId, reason = '' }) => {
    const d = D();
    let appt = appointmentId ? K.appt(appointmentId) : null;
    if (appt) { patientId = appt.patientId; doctorId = appt.doctorId; departmentId = appt.departmentId; }
    if (!patientId || !doctorId) throw new Error('Select a patient and doctor.');
    departmentId = departmentId || K.doctor(doctorId).departmentId;
    const today = U.today();
    const v = {
      id: HIS.store.nextId('visit', 'VS-', 6), appointmentId: appt ? appt.id : '', patientId, doctorId, departmentId,
      date: today, queueNumber: K.nextQueueNumber(departmentId, today), checkinTime: U.nowStamp(), stage: 'Waiting',
      type: appt ? appt.type : 'Walk-in', reason: reason || (appt ? appt.reason : ''), vitals: {}, chiefComplaint: '', symptoms: '',
      diagnosis: '', icd10: '', diagnosisType: 'Primary', treatmentPlan: '', doctorNotes: '', followUpDate: '',
      labOrderIds: [], imagingOrderIds: [], prescriptionId: '', invoiceId: ''
    };
    d.visits.push(v);
    if (appt) appt.status = 'Checked In';
    K.notify('visit', `${K.patientName(patientId)} checked in for ${K.doctorName(doctorId)} · queue #${v.queueNumber}`, '#/visits');
    HIS.store.commit();
    return v;
  };
  const VISIT_FLOW = { Waiting: ['In Consultation', 'Cancelled'], 'In Consultation': ['Labs/Imaging', 'Billing'], 'Labs/Imaging': ['In Consultation', 'Billing'], Billing: ['Completed'], Completed: [], Cancelled: [] };
  K.visitNextStages = (v) => VISIT_FLOW[v.stage] || [];
  K.setVisitStage = (id, stage) => {
    const v = K.visit(id);
    if (!v) throw new Error('Visit not found.');
    if (!(VISIT_FLOW[v.stage] || []).includes(stage) && stage !== v.stage) throw new Error(`Visit cannot move from ${v.stage} to ${stage}.`);
    v.stage = stage;
    if (stage === 'In Consultation' && !v.consultStartedAt) v.consultStartedAt = U.nowStamp();
    if (stage === 'Completed') {
      v.completedAt = U.nowStamp();
      if (v.appointmentId) K.setApptStatus(v.appointmentId, 'Completed');
      const p = K.patient(v.patientId);
      if (p) p.lastVisit = v.date;
    }
    if (stage === 'Cancelled' && v.appointmentId) K.setApptStatus(v.appointmentId, 'Cancelled', 'Visit cancelled at front desk');
    HIS.store.commit();
    return v;
  };
  K.saveEncounter = (id, fields) => {
    const v = K.visit(id);
    if (!v) throw new Error('Visit not found.');
    Object.assign(v, fields);
    HIS.store.commit();
    return v;
  };

  /* ---------------- Beds & admissions ---------------- */
  const BED_FLOW = { Available: ['Reserved', 'Occupied', 'Maintenance'], Reserved: ['Occupied', 'Available'], Occupied: ['Cleaning'], Cleaning: ['Available', 'Maintenance'], Maintenance: ['Available'] };
  K.bedNextStatuses = (b) => BED_FLOW[b.status] || [];
  K.setBedStatus = (bedId, status) => {
    const b = K.bed(bedId);
    if (!b) throw new Error('Bed not found.');
    if (b.status === 'Occupied' && status !== 'Cleaning') throw new Error(`Bed ${K.bedLabel(bedId)} is occupied. Discharge the patient first.`);
    if (!(BED_FLOW[b.status] || []).includes(status)) throw new Error(`Bed cannot move from ${b.status} to ${status}.`);
    b.status = status;
    if (status !== 'Occupied') b.patientId = '';
    HIS.store.commit();
    return b;
  };
  K.availableBeds = (deptId) => D().beds.filter((b) => b.status === 'Available' && (!deptId || b.departmentId === deptId));
  K.bedStats = () => {
    const beds = D().beds;
    const count = (s) => beds.filter((b) => b.status === s).length;
    return { total: beds.length, available: count('Available'), occupied: count('Occupied'), reserved: count('Reserved'), cleaning: count('Cleaning'), maintenance: count('Maintenance') };
  };

  K.admit = (x) => {
    if (!x.patientId) throw new Error('Select a patient.');
    if (!x.bedId) throw new Error('Assign a bed.');
    const bed = K.bed(x.bedId);
    if (!bed || bed.status !== 'Available') throw new Error(`Bed ${bed ? K.bedLabel(x.bedId) : ''} is not available.`);
    const d = D();
    const a = {
      id: HIS.store.nextId('admission', 'AD-', 5), patientId: x.patientId, doctorId: x.doctorId, departmentId: x.departmentId || bed.departmentId,
      bedId: x.bedId, admissionDate: U.today(), expectedDischarge: x.expectedDischarge || U.addDays(U.today(), 3), actualDischarge: '',
      reason: x.reason || '', status: 'Admitted', nursingNotes: [], dailyTreatments: [], medications: [], invoiceId: ''
    };
    d.admissions.push(a);
    bed.status = 'Occupied';
    bed.patientId = x.patientId;
    K.notify('admission', `${K.patientName(x.patientId)} admitted to ${K.bedLabel(x.bedId)}`, '#/admissions');
    HIS.store.commit();
    return a;
  };
  K.dischargeAdmission = (id, notes = '') => {
    const a = K.admission(id);
    if (!a || a.status !== 'Admitted') throw new Error('This admission cannot be discharged.');
    a.status = 'Discharged';
    a.actualDischarge = U.today();
    if (notes) a.nursingNotes.push({ at: U.nowStamp(), by: K.user(), note: `Discharge summary: ${notes}` });
    const bed = K.bed(a.bedId);
    if (bed) { bed.status = 'Cleaning'; bed.patientId = ''; }
    K.notify('admission', `${K.patientName(a.patientId)} discharged from ${K.bedLabel(a.bedId)}`, '#/admissions');
    HIS.store.commit();
    return a;
  };
  K.transferAdmission = (id, newBedId) => {
    const a = K.admission(id);
    if (!a || a.status !== 'Admitted') throw new Error('Only an admitted patient can be transferred.');
    const bed = K.bed(newBedId);
    if (!bed || bed.status !== 'Available') throw new Error(`Bed ${bed ? K.bedLabel(newBedId) : ''} is not available.`);
    const old = K.bed(a.bedId);
    if (old) { old.status = 'Cleaning'; old.patientId = ''; }
    bed.status = 'Occupied'; bed.patientId = a.patientId;
    a.bedId = newBedId;
    a.nursingNotes.push({ at: U.nowStamp(), by: K.user(), note: `Transferred to ${K.bedLabel(newBedId)}` });
    HIS.store.commit();
    return a;
  };
  K.addNursingNote = (id, note) => { const a = K.admission(id); a.nursingNotes.push({ at: U.nowStamp(), by: K.user(), note }); HIS.store.commit(); };
  K.addDailyTreatment = (id, entry) => { const a = K.admission(id); a.dailyTreatments.push(Object.assign({ at: U.nowStamp(), by: K.user() }, entry)); HIS.store.commit(); };
  K.addMedicationAdmin = (id, entry) => { const a = K.admission(id); a.medications.push(Object.assign({ at: U.nowStamp(), by: K.user() }, entry)); HIS.store.commit(); };

  /* ---------------- Emergency ---------------- */
  const ER_FLOW = { Arrived: ['Triage'], Triage: ['Assessment'], Assessment: ['Treatment'], Treatment: ['Admitted', 'Discharged', 'Transferred'], Admitted: [], Discharged: [], Transferred: [] };
  K.erNextStatuses = (c) => ER_FLOW[c.status] || [];
  K.registerEmergency = (x) => {
    if (!x.patientId) throw new Error('Select or register a patient.');
    const d = D();
    const c = {
      id: HIS.store.nextId('er', 'ER-', 5), patientId: x.patientId, arrivalTime: U.nowStamp(), triageLevel: x.triageLevel || 'Moderate',
      chiefComplaint: x.chiefComplaint || '', assignedDoctorId: x.assignedDoctorId || '', assignedRoom: x.assignedRoom || '', status: 'Arrived', notes: ''
    };
    d.emergencyCases.push(c);
    K.notify('emergency', `Emergency arrival: ${K.patientName(x.patientId)} · ${c.triageLevel}`, '#/emergency');
    HIS.store.commit();
    return c;
  };
  K.setErStatus = (id, status, patch = {}) => {
    const c = K.erCase(id);
    if (!c) throw new Error('Case not found.');
    if (!(ER_FLOW[c.status] || []).includes(status)) throw new Error(`Case cannot move from ${c.status} to ${status}.`);
    Object.assign(c, patch);
    c.status = status;
    if (status === 'Admitted' && patch.bedId) { K.admit({ patientId: c.patientId, doctorId: c.assignedDoctorId, bedId: patch.bedId, reason: c.chiefComplaint }); }
    HIS.store.commit();
    return c;
  };
  K.waitingMinutes = (c) => { const now = U.nowStamp(); const a = c.arrivalTime; const days = U.diffDays(a.slice(0, 10), now.slice(0, 10)); return days * 1440 + (Number(now.slice(11, 13)) * 60 + Number(now.slice(14, 16))) - (Number(a.slice(11, 13)) * 60 + Number(a.slice(14, 16))); };

  /* ---------------- Laboratory ---------------- */
  const LAB_FLOW = { Ordered: ['Collected'], Collected: ['Processing'], Processing: ['Completed'], Completed: ['Approved'], Approved: [] };
  K.labNextStatuses = (o) => LAB_FLOW[o.status] || [];
  K.orderLabTest = (x) => {
    const d = D();
    const o = { id: HIS.store.nextId('lab', 'LB-', 6), patientId: x.patientId, doctorId: x.doctorId, visitId: x.visitId || '', testName: x.testName, category: x.category || 'General', orderedAt: U.nowStamp(), status: 'Ordered', result: '', unit: x.unit || '', referenceRange: x.referenceRange || '', flag: '', collectedAt: '', completedAt: '', approvedBy: '' };
    d.labOrders.push(o);
    if (x.visitId) { const v = K.visit(x.visitId); if (v) v.labOrderIds.push(o.id); }
    K.notify('lab', `Lab test ordered: ${o.testName} for ${K.patientName(x.patientId)}`, '#/lab');
    HIS.store.commit();
    return o;
  };
  K.setLabStatus = (id, status) => {
    const o = K.labOrder(id);
    if (!(LAB_FLOW[o.status] || []).includes(status)) throw new Error(`Cannot move from ${o.status} to ${status}.`);
    o.status = status;
    if (status === 'Collected') o.collectedAt = U.nowStamp();
    HIS.store.commit();
    return o;
  };
  K.enterLabResult = (id, { result, flag, unit, referenceRange }) => {
    const o = K.labOrder(id);
    Object.assign(o, { result, flag: flag || 'Normal', unit: unit || o.unit, referenceRange: referenceRange || o.referenceRange, status: 'Completed', completedAt: U.nowStamp() });
    K.notify('lab', `Result ready: ${o.testName} for ${K.patientName(o.patientId)}`, '#/lab');
    HIS.store.commit();
    return o;
  };
  K.approveLabResult = (id) => { const o = K.labOrder(id); o.status = 'Approved'; o.approvedBy = K.user(); HIS.store.commit(); return o; };

  /* ---------------- Medical imaging ---------------- */
  const IMG_FLOW = { Ordered: ['Scheduled'], Scheduled: ['Performed'], Performed: ['Reported'], Reported: [] };
  K.imagingNextStatuses = (o) => IMG_FLOW[o.status] || [];
  K.orderImaging = (x) => {
    const d = D();
    const o = { id: HIS.store.nextId('img', 'IM-', 6), patientId: x.patientId, doctorId: x.doctorId, visitId: x.visitId || '', studyType: x.studyType, bodyPart: x.bodyPart || '', orderedAt: U.nowStamp(), scheduledAt: '', performedAt: '', status: 'Ordered', radiologist: '', result: '', reportText: '' };
    d.imagingOrders.push(o);
    if (x.visitId) { const v = K.visit(x.visitId); if (v) v.imagingOrderIds.push(o.id); }
    K.notify('imaging', `Imaging ordered: ${o.studyType} for ${K.patientName(x.patientId)}`, '#/imaging');
    HIS.store.commit();
    return o;
  };
  K.scheduleImaging = (id, scheduledAt) => { const o = K.imagingOrder(id); o.status = 'Scheduled'; o.scheduledAt = scheduledAt; HIS.store.commit(); return o; };
  K.performImaging = (id) => { const o = K.imagingOrder(id); o.status = 'Performed'; o.performedAt = U.nowStamp(); HIS.store.commit(); return o; };
  K.reportImaging = (id, { radiologist, result, reportText }) => {
    const o = K.imagingOrder(id);
    Object.assign(o, { radiologist, result, reportText, status: 'Reported' });
    K.notify('imaging', `Imaging report ready: ${o.studyType} for ${K.patientName(o.patientId)}`, '#/imaging');
    HIS.store.commit();
    return o;
  };

  /* ---------------- Pharmacy & prescriptions ---------------- */
  K.medStockStatus = (m) => (m.quantity <= 0 ? 'Out of Stock' : m.quantity <= m.reorderLevel ? 'Low Stock' : 'In Stock');
  K.medExpiryStatus = (m) => { const days = U.diffDays(U.today(), m.expirationDate); return days < 0 ? 'Expired' : days <= 60 ? 'Expiring Soon' : ''; };
  K.createPrescription = (x) => {
    if (!x.items || !x.items.length) throw new Error('Add at least one medicine.');
    const d = D();
    const p = { id: HIS.store.nextId('rx', 'RX-', 6), patientId: x.patientId, doctorId: x.doctorId, visitId: x.visitId || '', diagnosis: x.diagnosis || '', items: x.items, status: 'Pending', createdAt: U.nowStamp(), dispensedAt: '' };
    d.prescriptions.push(p);
    if (x.visitId) { const v = K.visit(x.visitId); if (v) v.prescriptionId = p.id; }
    K.notify('prescription', `Prescription ${p.id} created for ${K.patientName(x.patientId)}`, '#/prescriptions');
    HIS.store.commit();
    return p;
  };
  K.dispensePrescription = (id) => {
    const p = K.rx(id);
    if (!p || p.status !== 'Pending') throw new Error('Only a pending prescription can be dispensed.');
    for (const it of p.items) {
      const m = K.medicine(it.medicineId);
      if (!m) throw new Error(`Medicine not found for ${it.medicineName || it.medicineId}.`);
      if (m.quantity < it.qty) throw new Error(`Insufficient stock for ${m.name}: ${m.quantity} ${m.unit} available, ${it.qty} needed.`);
    }
    p.items.forEach((it) => { K.medicine(it.medicineId).quantity -= it.qty; });
    p.status = 'Dispensed';
    p.dispensedAt = U.nowStamp();
    K.notify('prescription', `Prescription ${p.id} dispensed for ${K.patientName(p.patientId)}`, '#/prescriptions');
    HIS.store.commit();
    return p;
  };
  K.cancelPrescription = (id) => { const p = K.rx(id); if (p.status !== 'Pending') throw new Error('Only a pending prescription can be cancelled.'); p.status = 'Cancelled'; HIS.store.commit(); return p; };

  /* ---------------- Billing & insurance ---------------- */
  K.activeInsurance = (patientId) => { const p = K.patient(patientId); const ins = p && p.insurance; return ins && ins.number && ins.validTo >= U.today() ? ins : null; };
  K.computeInvoiceTotals = (items, coveragePct = 0, discount = 0) => {
    const subtotal = U.sum(items, (i) => Math.round(i.qty * i.unitPrice));
    const insuranceCovered = Math.round(subtotal * (coveragePct || 0) / 100);
    const patientPayable = Math.max(0, subtotal - insuranceCovered - (discount || 0));
    return { subtotal, insuranceCovered, patientPayable };
  };
  K.generateInvoice = (x) => {
    const d = D();
    const ins = K.activeInsurance(x.patientId);
    const coveragePct = x.coveragePct != null ? x.coveragePct : ins ? ins.coveragePct : 0;
    const totals = K.computeInvoiceTotals(x.items, coveragePct, x.discount || 0);
    const inv = {
      id: HIS.store.nextId('invoice', 'INV-', 6), patientId: x.patientId, visitId: x.visitId || '', admissionId: x.admissionId || '',
      date: U.today(), items: x.items, discount: x.discount || 0, coveragePct, insuranceProvider: ins ? ins.provider : '',
      subtotal: totals.subtotal, insuranceCovered: totals.insuranceCovered, patientPayable: totals.patientPayable,
      payments: [], status: totals.patientPayable <= 0 ? 'Paid' : 'Unpaid', issuedBy: K.user()
    };
    d.invoices.push(inv);
    if (x.visitId) { const v = K.visit(x.visitId); if (v) v.invoiceId = inv.id; }
    if (x.admissionId) { const a = K.admission(x.admissionId); if (a) a.invoiceId = inv.id; }
    HIS.store.commit();
    return inv;
  };
  K.invoicePaid = (inv) => U.sum(inv.payments.filter((p) => p.status !== 'Refunded'), (p) => p.amount);
  K.invoiceBalance = (inv) => inv.patientPayable - K.invoicePaid(inv);
  K.recordInvoicePayment = (id, { amount, method, reference = '' }) => {
    const inv = K.invoice(id);
    if (!inv) throw new Error('Invoice not found.');
    if (!(amount > 0)) throw new Error('Enter a valid amount.');
    const bal = K.invoiceBalance(inv);
    if (amount > bal) throw new Error(`Amount exceeds the balance due (${U.money(bal)}).`);
    inv.payments.push({ id: HIS.store.nextId('payment', 'PMT-', 6), amount: Math.round(amount), method, date: U.nowStamp(), reference, status: 'Paid', cashier: K.user() });
    inv.status = K.invoiceBalance(inv) <= 0 ? 'Paid' : 'Partially Paid';
    HIS.store.commit();
    return inv;
  };
  K.refundInvoice = (id, amount, reason) => {
    const inv = K.invoice(id);
    const paid = K.invoicePaid(inv);
    if (amount <= 0 || amount > paid) throw new Error(`Refund must be between 1 and ${U.money(paid)}.`);
    inv.payments.push({ id: HIS.store.nextId('payment', 'PMT-', 6), amount: -amount, method: 'Refund', date: U.nowStamp(), reference: reason || 'Refund', status: 'Refunded', cashier: K.user() });
    inv.status = 'Refunded';
    HIS.store.commit();
    return inv;
  };

  /* ---------------- Patients ---------------- */
  K.createPatient = (x) => {
    if (!x.name) throw new Error('Patient name is required.');
    const p = Object.assign({
      gender: 'Male', dob: '', phone: '', email: '', address: '', nationality: 'Vietnamese', emergencyContact: '',
      bloodType: '', allergies: [], chronicConditions: [], surgeries: [], medications: [], insurance: { provider: '', number: '', validFrom: '', validTo: '', coveragePct: 0, referralHospital: '' },
      status: 'Active', notes: '', lastVisit: ''
    }, x, { id: HIS.store.nextId('patient', 'PT-', 5), createdAt: U.today() });
    D().patients.push(p);
    HIS.store.commit();
    return p;
  };

  /* ---------------- KPIs (dashboard) ---------------- */
  K.kpis = () => {
    const d = D(), today = U.today();
    const bs = K.bedStats();
    const apptsToday = d.appointments.filter((a) => a.date === today);
    const waiting = d.visits.filter((v) => v.date === today && ['Waiting', 'Labs/Imaging'].includes(v.stage)).length;
    const admitted = d.admissions.filter((a) => a.status === 'Admitted').length;
    const erActive = d.emergencyCases.filter((c) => !['Discharged', 'Transferred'].includes(c.status)).length;
    const pendingLab = d.labOrders.filter((l) => ['Ordered', 'Collected', 'Processing'].includes(l.status)).length;
    const revenueToday = U.sum(d.invoices.filter((i) => i.date === today), (i) => K.invoicePaid(i));
    return {
      totalPatients: d.patients.length, apptsToday: apptsToday.length, apptsPending: apptsToday.filter((a) => ['Scheduled', 'Checked In'].includes(a.status)).length,
      waiting, admitted, availableBeds: bs.available, totalBeds: bs.total, occupancy: bs.total ? (bs.occupied / bs.total) * 100 : 0,
      erActive, pendingLab, revenueToday
    };
  };

  K.notifications = () => {
    const d = D(), n = d.settings.notif, k = K.kpis(), out = [];
    const today = U.today();
    if (n.appointments && k.apptsPending) out.push({ id: 'live-appt', type: 'appointment', text: `${k.apptsPending} appointments waiting to check in today`, link: '#/appointments', time: `${today}T06:00` });
    if (n.queue && k.waiting) out.push({ id: 'live-queue', type: 'visit', text: `${k.waiting} patients waiting in the outpatient queue`, link: '#/visits', time: `${today}T06:05` });
    if (n.lab) d.labOrders.filter((l) => l.status === 'Completed').slice(0, 3).forEach((l) => out.push({ id: 'live-lab-' + l.id, type: 'lab', text: `Lab result ready: ${l.testName} — ${K.patientName(l.patientId)}`, link: '#/lab', time: l.completedAt || today }));
    if (n.prescription) d.prescriptions.filter((p) => p.status === 'Pending').slice(0, 3).forEach((p) => out.push({ id: 'live-rx-' + p.id, type: 'prescription', text: `Prescription ${p.id} ready for dispensing — ${K.patientName(p.patientId)}`, link: '#/prescriptions', time: p.createdAt }));
    if (n.pharmacy) d.medicines.filter((m) => K.medStockStatus(m) !== 'In Stock').slice(0, 3).forEach((m) => out.push({ id: 'live-stock-' + m.id, type: 'pharmacy', text: `${K.medStockStatus(m)}: ${m.name} (${m.quantity} ${m.unit} left)`, link: '#/pharmacy', time: `${today}T05:00` }));
    if (n.beds && k.availableBeds) out.push({ id: 'live-bed', type: 'bed', text: `${k.availableBeds} beds available across the hospital`, link: '#/beds', time: `${today}T05:10` });
    if (n.emergency && k.erActive) out.push({ id: 'live-er', type: 'emergency', text: `${k.erActive} active emergency cases`, link: '#/emergency', time: `${today}T05:20` });
    if (n.billing) { const unpaid = d.invoices.filter((i) => i.status === 'Unpaid').length; if (unpaid) out.push({ id: 'live-bill', type: 'billing', text: `${unpaid} unpaid invoices`, link: '#/billing', time: `${today}T05:30` }); }
    const log = d.notifications;
    return log.concat(out).map((x) => Object.assign({}, x, { read: x.read || d.readNotifs.includes(x.id) })).sort((a, b) => (b.time || '').localeCompare(a.time || ''));
  };
})();
