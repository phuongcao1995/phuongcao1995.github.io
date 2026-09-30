/* =========================================================
   Mock data: MediPlus General Hospital, Da Nang (+ Ha Noi and
   Ho Chi Minh City branches). Generated deterministically
   around "today" so the dashboard, queue and beds are always
   populated with live-looking activity.
   ========================================================= */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util;
  HIS.DATA_VERSION = 1;

  /* ---------------- Static reference data ---------------- */
  const DEPARTMENTS = [
    ['DPT01', 'Internal Medicine', true, '2nd Floor, Building A'],
    ['DPT02', 'Cardiology', true, '3rd Floor, Building A'],
    ['DPT03', 'Pediatrics', true, '1st Floor, Building C'],
    ['DPT04', 'Obstetrics & Gynecology', true, '2nd Floor, Building C'],
    ['DPT05', 'Surgery', true, '4th Floor, Building B'],
    ['DPT06', 'Orthopedics', true, '3rd Floor, Building B'],
    ['DPT07', 'Dermatology', false, '1st Floor, Building A'],
    ['DPT08', 'ENT', false, '1st Floor, Building A'],
    ['DPT09', 'Ophthalmology', false, '1st Floor, Building A'],
    ['DPT10', 'Neurology', true, '4th Floor, Building A'],
    ['DPT11', 'Oncology', true, '5th Floor, Building B'],
    ['DPT12', 'Emergency', false, 'Ground Floor, Building A'],
    ['DPT13', 'Radiology', false, 'Ground Floor, Building B'],
    ['DPT14', 'Laboratory', false, 'Ground Floor, Building B'],
    ['DPT15', 'Pharmacy', false, 'Ground Floor, Building A'],
    ['DPT16', 'Dentistry', false, '2nd Floor, Building B']
  ];
  const CLINICAL_DEPTS = ['DPT01', 'DPT02', 'DPT03', 'DPT04', 'DPT05', 'DPT06', 'DPT07', 'DPT08', 'DPT09', 'DPT10', 'DPT11', 'DPT16'];
  const INPATIENT_DEPTS = ['DPT01', 'DPT02', 'DPT03', 'DPT04', 'DPT05', 'DPT06', 'DPT10', 'DPT11'];

  const DIAGNOSES = {
    DPT01: [['Essential hypertension', 'I10'], ['Type 2 diabetes mellitus', 'E11.9'], ['Acute upper respiratory infection', 'J06.9'], ['Gastritis', 'K29.7'], ['Dyslipidemia', 'E78.5']],
    DPT02: [['Essential hypertension', 'I10'], ['Angina pectoris', 'I20.9'], ['Atrial fibrillation', 'I48.9'], ['Chronic heart failure', 'I50.9']],
    DPT03: [['Acute nasopharyngitis (common cold)', 'J00'], ['Acute bronchitis', 'J20.9'], ['Viral gastroenteritis', 'A08.4'], ['Fever, unspecified', 'R50.9']],
    DPT04: [['Supervision of normal pregnancy', 'Z34.9'], ['Menstrual disorder', 'N92.6'], ['Pelvic inflammatory disease', 'N73.9']],
    DPT05: [['Acute appendicitis', 'K35.80'], ['Inguinal hernia', 'K40.90'], ['Cholelithiasis', 'K80.20']],
    DPT06: [['Low back pain', 'M54.5'], ['Osteoarthritis of knee', 'M17.9'], ['Fracture of forearm', 'S52.9']],
    DPT07: [['Atopic dermatitis', 'L20.9'], ['Acne vulgaris', 'L70.0'], ['Urticaria', 'L50.9']],
    DPT08: [['Acute sinusitis', 'J01.9'], ['Otitis media', 'H66.9'], ['Pharyngitis', 'J02.9']],
    DPT09: [['Conjunctivitis', 'H10.9'], ['Refractive error', 'H52.7'], ['Cataract', 'H25.9']],
    DPT10: [['Migraine', 'G43.9'], ['Tension-type headache', 'G44.2'], ['Epilepsy', 'G40.9']],
    DPT11: [['Malignant neoplasm follow-up', 'Z08'], ['Breast neoplasm screening', 'Z12.31']],
    DPT16: [['Dental caries', 'K02.9'], ['Gingivitis', 'K05.0']]
  };

  const INSURANCE_PROVIDERS = ['BHYT — Vietnam Social Security', 'Bao Viet Insurance', 'PVI Healthcare', 'Manulife Vietnam', 'AIA Vietnam', 'PTI Insurance'];
  const ALLERGY_POOL = ['Penicillin', 'Amoxicillin', 'Aspirin', 'Sulfa drugs', 'Peanuts', 'Seafood', 'Latex', 'Iodine contrast', 'Pollen', 'None known'];
  const CHRONIC_POOL = ['Hypertension', 'Type 2 diabetes', 'Asthma', 'Hyperlipidemia', 'Hypothyroidism', 'Chronic gastritis', 'Osteoarthritis', 'None'];
  const SURGERY_POOL = ['Appendectomy (2018)', 'Cesarean section (2020)', 'Cholecystectomy (2019)', 'Tonsillectomy (2015)', 'ACL reconstruction (2021)', 'Cataract surgery (2022)'];
  HIS.REF = { INSURANCE_PROVIDERS, ALLERGY_POOL, CHRONIC_POOL, SURGERY_POOL, CLINICAL_DEPTS, INPATIENT_DEPTS, DIAGNOSES };

  const LAST = [['Nguyen', 30], ['Tran', 11], ['Le', 9], ['Pham', 7], ['Hoang', 4], ['Huynh', 4], ['Phan', 4], ['Vu', 3], ['Vo', 4], ['Dang', 3], ['Bui', 3], ['Do', 3], ['Ho', 3], ['Ngo', 2], ['Duong', 2], ['Ly', 1]];
  const MID_M = ['Van', 'Minh', 'Duc', 'Hoang', 'Quoc', 'Thanh', 'Gia', 'Huu', 'Anh', 'Cong'];
  const MID_F = ['Thi', 'Ngoc', 'Thu', 'Thanh', 'Minh', 'Bao', 'Kim', 'Phuong', 'Hong'];
  const GIV_M = ['An', 'Nam', 'Hung', 'Dung', 'Khoa', 'Long', 'Tuan', 'Phuc', 'Bao', 'Huy', 'Quang', 'Son', 'Tien', 'Vinh', 'Dat', 'Khanh', 'Hieu', 'Trung', 'Thinh', 'Kien'];
  const GIV_F = ['Mai', 'Anh', 'Lan', 'Huong', 'Linh', 'Trang', 'Thao', 'Ha', 'Nhung', 'Vy', 'Yen', 'Chau', 'Hanh', 'Ngan', 'My', 'Tam', 'Nhi', 'Hoa', 'Quyen', 'Diep'];
  const ADDR = [
    ['Nguyen Van Linh', 'Hai Chau, Da Nang'], ['Bach Dang', 'Hai Chau, Da Nang'], ['Le Duan', 'Thanh Khe, Da Nang'],
    ['Ngo Quyen', 'Son Tra, Da Nang'], ['Tran Hung Dao', 'Hoan Kiem, Ha Noi'], ['Kim Ma', 'Ba Dinh, Ha Noi'],
    ['Nguyen Trai', 'Thanh Xuan, Ha Noi'], ['Le Loi', 'District 1, Ho Chi Minh City'], ['Hai Ba Trung', 'District 3, Ho Chi Minh City'],
    ['Nguyen Thi Minh Khai', 'District 1, Ho Chi Minh City'], ['Hung Vuong', 'Hue'], ['Tran Phu', 'Nha Trang, Khanh Hoa'],
    ['30 Thang 4', 'Ninh Kieu, Can Tho'], ['Lach Tray', 'Ngo Quyen, Hai Phong'], ['Phan Chu Trinh', 'Hoi An, Quang Nam']
  ];
  const VN_PREFIX = ['090', '091', '093', '094', '096', '097', '098', '086', '088', '032', '033', '035', '070', '077', '079', '081', '083', '085', '089'];

  HIS.seed = function () {
    const R = U.rng(20260929);
    const pick = (a) => a[Math.floor(R() * a.length)];
    const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    const chance = (p) => R() < p;
    const wpick = (pairs) => { const t = U.sum(pairs, (p) => p[1]); let x = R() * t; for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; } return pairs[0][0]; };
    const today = U.today();
    const r1k = (n) => Math.round(n / 1000) * 1000;
    const stamp = (d, h, m) => `${d}T${String(h).padStart(2, '0')}:${String(m == null ? ri(0, 59) : m).padStart(2, '0')}`;
    const digits = (n) => Array.from({ length: n }, () => ri(0, 9)).join('');
    const vnPhone = () => { const p = pick(VN_PREFIX); const rest = digits(10 - p.length); const all = p + rest; return `${all.slice(0, 4)} ${all.slice(4, 7)} ${all.slice(7)}`; };
    const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');
    const vnName = (gender) => { const g = gender || (chance(0.5) ? 'M' : 'F'); return { name: `${wpick(LAST)} ${pick(g === 'M' ? MID_M : MID_F)} ${pick(g === 'M' ? GIV_M : GIV_F)}`, gender: g === 'M' ? 'Male' : 'Female' }; };

    const settings = {
      hospitalName: 'MediPlus General Hospital', legalName: 'MediPlus Healthcare Joint Stock Company',
      address: '215 Nguyen Van Linh, Hai Chau, Da Nang, Vietnam', phone: '0236 3777 999', hotline: '1900 2255',
      email: 'contact@mediplus.vn', website: 'www.mediplus.vn', taxId: '0402198765',
      openHours: '06:30 – 20:00 (Emergency: 24/7)', currency: 'VND', country: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh',
      language: 'English', dateFormat: 'DD/MM/YYYY', timeFormat: '24h',
      defaultCoveragePct: 80, invoiceSymbol: 'MP26HIS',
      bankName: 'Vietcombank — Da Nang Branch', bankAccount: '0071 000 998 877', bankHolder: 'CONG TY CP MEDIPLUS',
      notif: { appointments: true, queue: true, lab: true, prescription: true, pharmacy: true, beds: true, emergency: true, billing: true, email: false },
      requireApprovalForLabResults: true, autoLogout: 30
    };
    const branches = [
      { id: 'BR01', name: 'MediPlus General Hospital', city: 'Da Nang', address: '215 Nguyen Van Linh, Hai Chau, Da Nang', beds: 320, phone: '0236 3777 999', director: 'Dr. Nguyen Thanh Long', status: 'Active' },
      { id: 'BR02', name: 'MediPlus Ha Noi Clinic', city: 'Ha Noi', address: '58 Kim Ma, Ba Dinh, Ha Noi', beds: 0, phone: '024 3777 999', director: 'Dr. Tran Thi Kim Anh', status: 'Active' },
      { id: 'BR03', name: 'MediPlus Saigon Medical Center', city: 'Ho Chi Minh City', address: '19 Le Loi, District 1, Ho Chi Minh City', beds: 180, phone: '028 3777 999', director: 'Dr. Pham Quoc Hung', status: 'Opening Soon' }
    ];
    const departments = DEPARTMENTS.map(([id, name, inpatient, loc]) => ({ id, name, inpatient, location: loc, headDoctorId: '', phone: `0236 37${ri(70, 79)} ${digits(3)}` }));

    /* ---------- Doctors ---------- */
    const QUALS = ['MD, Hanoi Medical University', 'MD, University of Medicine and Pharmacy at HCMC', 'MD, Hue University of Medicine and Pharmacy', 'MD, PhD, Da Nang University of Medical Technology and Pharmacy', 'MD, Fellowship in USA'];
    const CERTS = ['Board Certified', 'Vietnam Medical Association member', 'ACLS certified', 'Fellow of the Royal College'];
    const deptDoctorCount = { DPT01: 3, DPT02: 2, DPT03: 3, DPT04: 2, DPT05: 2, DPT06: 2, DPT07: 1, DPT08: 1, DPT09: 1, DPT10: 2, DPT11: 2, DPT12: 2, DPT13: 1, DPT14: 1, DPT16: 1 };
    const doctors = [];
    let dSeq = 0;
    Object.keys(deptDoctorCount).forEach((deptId) => {
      for (let i = 0; i < deptDoctorCount[deptId]; i++) {
        const { name, gender } = vnName();
        dSeq++;
        const dept = departments.find((x) => x.id === deptId);
        const doc = {
          id: 'DR-' + String(100 + dSeq), name, gender, specialty: dept.name, departmentId: deptId,
          experience: ri(3, 26), phone: vnPhone(), email: `${slug(name)}${dSeq}@mediplus.vn`,
          qualifications: pick(QUALS), certifications: [pick(CERTS), pick(CERTS)].filter((v, j, a) => a.indexOf(v) === j),
          consultationFee: pick([200000, 250000, 300000, 350000, 400000, 500000]),
          workDays: pick([['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], ['Mon', 'Wed', 'Fri'], ['Tue', 'Thu', 'Sat'], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']]),
          workHours: pick(['08:00–11:30, 13:30–16:30', '07:30–11:00, 13:00–16:00', '08:30–12:00, 14:00–17:00']),
          status: chance(0.9) ? 'Available' : chance(0.6) ? 'Busy' : 'On Leave', avatar: '', joined: `20${ri(10, 24)}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`
        };
        doctors.push(doc);
        if (!dept.headDoctorId) dept.headDoctorId = doc.id;
      }
    });

    /* ---------- Staff (non-doctor) ---------- */
    const staffList = [
      ['Le Thanh Hai', 'IT', 'System Administrator', 'Administrator'],
      ['Doan Minh Chau', 'Administration', 'Hospital Director', 'Administrator'],
      ['Truong Bao Ngan', 'Administration', 'Deputy Director', 'Administrator'],
      ['Vo Thi Hoa', 'Nursing', 'Head Nurse — Internal Medicine', 'Nurse'],
      ['Nguyen Thi Lan', 'Nursing', 'Staff Nurse — Internal Medicine', 'Nurse'],
      ['Tran Thi Nhung', 'Nursing', 'Staff Nurse — Cardiology', 'Nurse'],
      ['Le Thi Yen', 'Nursing', 'Staff Nurse — Pediatrics', 'Nurse'],
      ['Phan Thi Hanh', 'Nursing', 'Staff Nurse — Surgery', 'Nurse'],
      ['Dang Thi My', 'Nursing', 'Staff Nurse — Orthopedics', 'Nurse'],
      ['Huynh Van Tien', 'Nursing', 'Staff Nurse — Emergency', 'Nurse'],
      ['Ngo Thanh Tam', 'Nursing', 'Staff Nurse — Obstetrics & Gynecology', 'Nurse'],
      ['Duong Ngoc Vy', 'Nursing', 'Staff Nurse — Oncology', 'Nurse'],
      ['Ly Minh Phuc', 'Nursing', 'Staff Nurse — Neurology', 'Nurse'],
      ['Vu Duc Thinh', 'Nursing', 'Staff Nurse — Internal Medicine', 'Nurse'],
      ['Mai Thi Quyen', 'Pharmacy', 'Chief Pharmacist', 'Pharmacist'],
      ['Do Thanh Ha', 'Pharmacy', 'Pharmacist', 'Pharmacist'],
      ['Cao Minh Anh', 'Pharmacy', 'Pharmacist', 'Pharmacist'],
      ['Ha Quoc Bao', 'Pharmacy', 'Pharmacy Assistant', 'Pharmacist'],
      ['Pham Van Dung', 'Laboratory', 'Lab Technician', 'Technician'],
      ['Tran Quang Son', 'Laboratory', 'Lab Technician', 'Technician'],
      ['Le Cong Dat', 'Radiology', 'Imaging Technician', 'Technician'],
      ['Nguyen Huu Kien', 'Radiology', 'Imaging Technician', 'Technician'],
      ['Bui Quoc Khanh', 'Radiology', 'Radiographer', 'Technician'],
      ['Ho Ngoc Diep', 'Front Desk', 'Receptionist', 'Receptionist'],
      ['Pham Thu Trang', 'Front Desk', 'Receptionist', 'Receptionist'],
      ['Tran Gia Huy', 'Front Desk', 'Receptionist', 'Receptionist'],
      ['Nguyen Van An', 'Front Desk', 'Front Desk Supervisor', 'Receptionist'],
      ['Hoang Van Long', 'Front Desk', 'Receptionist', 'Receptionist'],
      ['Mai Thi Quyen', 'Finance', 'Chief Accountant', 'Accountant'],
      ['Phan Thanh Tam', 'Finance', 'Accountant', 'Accountant'],
      ['Vo Thi Kim Chau', 'Finance', 'Billing Clerk', 'Accountant'],
      ['Kim Ji-hye', 'Nursing', 'Staff Nurse — Emergency', 'Nurse'],
      ['Dang Thi Bich', 'Nursing', 'Staff Nurse — Surgery', 'Nurse'],
      ['Nguyen Thi Hong', 'Nursing', 'Head Nurse — Emergency', 'Nurse'],
      ['Truong Van Phat', 'IT', 'IT Support', 'Administrator']
    ];
    const staff = staffList.map((s, i) => ({
      id: 'STF-' + String(200 + i), name: s[0], department: s[1], position: s[2], role: s[3], shift: pick(['Morning', 'Afternoon', 'Night', 'Office']),
      phone: vnPhone(), email: `${slug(s[0])}${i}@mediplus.vn`, status: i === 21 ? 'On Leave' : 'Active',
      joined: `20${ri(15, 25)}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`
    }));

    /* ---------- Patients ---------- */
    const patients = [];
    const fixedVN = [['Nguyen Van An', 'Male'], ['Tran Thi Mai', 'Female'], ['Le Minh Duc', 'Male'], ['Pham Thi Huong', 'Female']];
    const usedNames = new Set();
    fixedVN.forEach(([n, g]) => { patients.push({ name: n, gender: g }); usedNames.add(n); });
    while (patients.length < 150) {
      const { name, gender } = vnName();
      if (usedNames.has(name)) continue;
      usedNames.add(name);
      patients.push({ name, gender });
    }
    patients.forEach((p, i) => {
      const a = pick(ADDR);
      const dobY = ri(1945, 2023);
      p.id = 'PT-' + String(i + 1).padStart(5, '0');
      p.dob = `${dobY}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`;
      p.phone = vnPhone();
      p.email = `${slug(p.name).replace(/\./g, '')}${ri(1, 99)}@${pick(['gmail.com', 'gmail.com', 'yahoo.com', 'outlook.com'])}`;
      p.address = `${ri(3, 420)} ${a[0]} Street, ${a[1]}`;
      p.nationality = 'Vietnamese';
      p.emergencyContact = `${wpick(LAST)} ${pick(MID_F)} ${pick(GIV_F)} · ${vnPhone()}`;
      p.bloodType = pick(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
      p.allergies = chance(0.35) ? [pick(ALLERGY_POOL)].filter((x) => x !== 'None known') : [];
      p.chronicConditions = chance(0.3) ? [pick(CHRONIC_POOL)].filter((x) => x !== 'None') : [];
      p.surgeries = chance(0.18) ? [pick(SURGERY_POOL)] : [];
      p.medications = p.chronicConditions.length ? [pick(['Metformin 500mg', 'Amlodipine 5mg', 'Losartan 50mg', 'Atorvastatin 10mg'])] : [];
      const hasIns = chance(0.72);
      p.insurance = hasIns ? {
        provider: wpick([[INSURANCE_PROVIDERS[0], 60], [INSURANCE_PROVIDERS[1], 10], [INSURANCE_PROVIDERS[2], 8], [INSURANCE_PROVIDERS[3], 8], [INSURANCE_PROVIDERS[4], 8], [INSURANCE_PROVIDERS[5], 6]]),
        number: `${pick(['DN', 'HN', 'SG'])}${ri(1, 5)}${digits(13)}`, validFrom: `20${ri(20, 25)}-01-01`, validTo: `20${ri(26, 27)}-12-31`,
        coveragePct: pick([80, 80, 80, 95, 100, 70]), referralHospital: chance(0.4) ? pick(['Da Nang City Hospital', 'Hoan My Da Nang Hospital', 'Local Commune Health Station']) : ''
      } : { provider: '', number: '', validFrom: '', validTo: '', coveragePct: 0, referralHospital: '' };
      p.status = chance(0.96) ? 'Active' : 'Inactive';
      p.notes = chance(0.1) ? pick(['Prefers Vietnamese-speaking staff', 'Wheelchair access required', 'Anxious about needles — explain procedures calmly', 'Family history of diabetes']) : '';
      p.lastVisit = '';
      p.createdAt = U.addDays(today, -ri(10, 800));
    });

    /* ---------- Beds ---------- */
    const beds = [];
    const buildingOf = { DPT01: 'Building A', DPT02: 'Building A', DPT10: 'Building A', DPT03: 'Building C', DPT04: 'Building C', DPT05: 'Building B', DPT06: 'Building B', DPT11: 'Building B' };
    const floorOf = { DPT01: 2, DPT02: 3, DPT10: 4, DPT03: 1, DPT04: 2, DPT05: 4, DPT06: 3, DPT11: 5 };
    const roomsPer = { DPT01: 5, DPT02: 4, DPT10: 3, DPT03: 4, DPT04: 3, DPT05: 4, DPT06: 4, DPT11: 3 };
    INPATIENT_DEPTS.forEach((deptId) => {
      const rooms = roomsPer[deptId];
      for (let r = 1; r <= rooms; r++) {
        const bedsInRoom = ri(2, 4);
        const roomNo = `${floorOf[deptId]}${String(r).padStart(2, '0')}`;
        for (let b = 1; b <= bedsInRoom; b++) {
          beds.push({ id: `${deptId}-${roomNo}-${b}`, building: buildingOf[deptId], floor: floorOf[deptId], departmentId: deptId, room: roomNo, bedNumber: b, status: 'Available', patientId: '' });
        }
      }
    });

    /* ---------- Appointments (−20 to +12 days) ---------- */
    const appointments = [];
    const busySlots = {};
    const timeSlots = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
    const clinicalDoctors = doctors.filter((d) => CLINICAL_DEPTS.includes(d.departmentId));
    let apSeq = 0;
    for (let off = -20; off <= 12; off++) {
      const date = U.addDays(today, off);
      const wd = U.weekday(date);
      if (wd === 'Sun') continue;
      const count = wd === 'Sat' ? ri(3, 6) : ri(5, 9);
      for (let k = 0; k < count; k++) {
        const doc = pick(clinicalDoctors);
        let time = '';
        for (let tries = 0; tries < 8; tries++) { const t = pick(timeSlots); if (!busySlots[`${doc.id}|${date}|${t}`]) { time = t; break; } }
        if (!time) continue;
        busySlots[`${doc.id}|${date}|${time}`] = true;
        apSeq++;
        const pat = pick(patients);
        let status;
        if (off < 0) status = wpick([['Completed', 78], ['Cancelled', 10], ['No Show', 8], ['Completed', 4]]);
        else if (off === 0) status = wpick([['Completed', 30], ['Checked In', 12], ['In Consultation', 6], ['Waiting', 6], ['Scheduled', 38], ['Cancelled', 8]]);
        else status = wpick([['Scheduled', 88], ['Cancelled', 12]]);
        appointments.push({
          id: 'AP-' + String(300000 + apSeq), patientId: pat.id, doctorId: doc.id, departmentId: doc.departmentId, date, time,
          type: wpick([['General Consultation', 35], ['Follow-up', 22], ['Specialist Consultation', 18], ['Health Check', 12], ['Vaccination', 6], ['Surgery Consultation', 4], ['Laboratory', 2], ['Imaging', 1]]),
          reason: pick(['Routine check-up', 'Follow-up on previous visit', 'New symptoms', 'Annual health screening', 'Referral from GP', 'Persistent discomfort']),
          status, notes: '', createdAt: stamp(U.addDays(date, -ri(0, 10)), ri(8, 18)), createdBy: pick(staff.filter((s) => s.role === 'Receptionist')).name
        });
      }
    }

    /* ---------- Visits (outpatient encounters) derived from non-scheduled appointments ---------- */
    const visits = [];
    const labOrders = [];
    const imagingOrders = [];
    const prescriptions = [];
    const invoices = [];
    const medicines = buildMedicines();
    const queueCounters = {};
    let vSeq = 0, lbSeq = 0, imSeq = 0, rxSeq = 0, invSeq = 0, pmtSeq = 0;

    function invoiceItemsFor({ doctor, labs = [], imgs = [], meds = [] }) {
      const items = [];
      if (doctor) items.push({ category: 'Consultation', description: `Consultation — ${doctor.specialty}`, qty: 1, unitPrice: doctor.consultationFee });
      labs.forEach((l) => items.push({ category: 'Laboratory', description: l.testName, qty: 1, unitPrice: pick([120000, 150000, 180000, 250000, 320000]) }));
      imgs.forEach((im) => items.push({ category: 'Imaging', description: `${im.studyType} — ${im.bodyPart}`, qty: 1, unitPrice: im.studyType === 'MRI' ? pick([2200000, 2800000]) : im.studyType === 'CT Scan' ? pick([1200000, 1600000]) : im.studyType === 'Ultrasound' ? pick([180000, 350000]) : im.studyType === 'Mammography' ? 650000 : pick([150000, 250000]) }));
      meds.forEach((it) => items.push({ category: 'Medicine', description: it.medicineName, qty: it.qty, unitPrice: it.unitPrice }));
      return items;
    }
    function makeInvoice({ patientId, visitId, admissionId, date, items }) {
      invSeq++;
      const pat = patients.find((p) => p.id === patientId);
      const ins = pat.insurance && pat.insurance.number && pat.insurance.validTo >= today ? pat.insurance : null;
      const totals = HIS.clinic.computeInvoiceTotals(items, ins ? ins.coveragePct : 0, 0);
      const inv = {
        id: 'INV-' + String(500000 + invSeq), patientId, visitId: visitId || '', admissionId: admissionId || '', date,
        items, discount: 0, coveragePct: ins ? ins.coveragePct : 0, insuranceProvider: ins ? ins.provider : '',
        subtotal: totals.subtotal, insuranceCovered: totals.insuranceCovered, patientPayable: totals.patientPayable,
        payments: [], status: 'Unpaid', issuedBy: pick(staff.filter((s) => s.role === 'Accountant')).name
      };
      if (totals.patientPayable <= 0) inv.status = 'Paid';
      else {
        const r = R();
        if (date < today ? r < 0.82 : r < 0.4) { inv.payments.push({ id: 'PMT-' + String(700000 + ++pmtSeq), amount: totals.patientPayable, method: pick(['Cash', 'Bank Transfer', 'Credit Card', 'QR Payment']), date: stamp(date, ri(9, 19)), reference: '', status: 'Paid', cashier: pick(staff.filter((s) => s.role === 'Accountant')).name }); inv.status = 'Paid'; }
        else if (date < today && r < 0.94) { const part = r1k(totals.patientPayable * pick([0.3, 0.5, 0.6])); inv.payments.push({ id: 'PMT-' + String(700000 + ++pmtSeq), amount: part, method: pick(['Cash', 'Bank Transfer']), date: stamp(date, ri(9, 19)), reference: '', status: 'Paid', cashier: pick(staff.filter((s) => s.role === 'Accountant')).name }); inv.status = 'Partially Paid'; }
      }
      invoices.push(inv);
      return inv;
    }

    appointments.forEach((ap) => {
      if (['Scheduled', 'Cancelled', 'No Show'].includes(ap.status)) return;
      const doc = doctors.find((d) => d.id === ap.doctorId);
      const pat = patients.find((p) => p.id === ap.patientId);
      const key = `${ap.departmentId}|${ap.date}`;
      queueCounters[key] = (queueCounters[key] || 0) + 1;
      vSeq++;
      const stage = ap.status === 'Completed' ? 'Completed' : ap.status === 'In Consultation' ? 'In Consultation' : ap.status === 'Waiting' ? 'Waiting' : 'Waiting';
      const apMin = Number(ap.time.slice(0, 2)) * 60 + Number(ap.time.slice(3));
      const stampAt = (min) => { const h = Math.floor(min / 60) % 24, m = min % 60; return stamp(ap.date, h, m); };
      const v = {
        id: 'VS-' + String(400000 + vSeq), appointmentId: ap.id, patientId: ap.patientId, doctorId: ap.doctorId, departmentId: ap.departmentId,
        date: ap.date, queueNumber: queueCounters[key], checkinTime: stampAt(apMin),
        stage, type: ap.type, reason: ap.reason, vitals: {}, chiefComplaint: '', symptoms: '', diagnosis: '', icd10: '', diagnosisType: 'Primary',
        treatmentPlan: '', doctorNotes: '', followUpDate: '', labOrderIds: [], imagingOrderIds: [], prescriptionId: '', invoiceId: ''
      };
      if (stage === 'In Consultation') v.consultStartedAt = stampAt(apMin + ri(0, 15));
      if (stage === 'Completed') {
        v.consultStartedAt = stampAt(apMin + ri(0, 15));
        v.completedAt = stampAt(apMin + ri(20, 45));
        const bp = pat.chronicConditions.includes('Hypertension') ? `${ri(135, 165)}/${ri(85, 100)}` : `${ri(105, 128)}/${ri(65, 84)}`;
        v.vitals = { bp, hr: ri(60, 98), temp: (36 + R() * 1.6).toFixed(1), rr: ri(14, 20), spo2: ri(95, 100), height: ri(150, 182), weight: ri(45, 88) };
        v.vitals.bmi = (v.vitals.weight / ((v.vitals.height / 100) ** 2)).toFixed(1);
        v.chiefComplaint = pick(['Fever and fatigue for 2 days', 'Persistent cough', 'Headache and dizziness', 'Abdominal pain', 'Joint pain', 'Skin rash and itching', 'Follow-up for chronic condition', 'Shortness of breath on exertion', 'Routine health screening']);
        v.symptoms = pick(['Mild fever, sore throat, fatigue', 'Dry cough, no fever', 'Intermittent headache, no visual changes', 'Cramping abdominal pain, no vomiting', 'Localized joint swelling and stiffness', 'Itchy red rash on forearms']);
        const dx = pick(DIAGNOSES[ap.departmentId] || DIAGNOSES.DPT01);
        v.diagnosis = dx[0]; v.icd10 = dx[1];
        v.treatmentPlan = pick(['Prescribed medication, advised rest and hydration, follow-up in 1 week if symptoms persist.', 'Lifestyle modification advised: diet, exercise; re-check in 4 weeks.', 'Symptomatic treatment prescribed; return if symptoms worsen.', 'Referred for laboratory work-up to confirm diagnosis.', 'Continue current medication, dosage adjusted.']);
        v.doctorNotes = pick(['Patient responded well to consultation, no red flags.', 'Advised patient on medication adherence.', 'Discussed lifestyle changes with patient.', 'Patient counselled on warning signs to watch for.']);
        if (chance(0.32)) v.followUpDate = U.addDays(ap.date, pick([7, 14, 30]));

        let labs = [], imgs = [];
        if (chance(0.38)) {
          const n = ri(1, 2);
          const TESTS = [['CBC', 'Hematology', '4.0-10.0', '10^9/L'], ['Blood glucose (fasting)', 'Biochemistry', '70-100', 'mg/dL'], ['HbA1c', 'Biochemistry', '4.0-5.6', '%'], ['Liver function (ALT/AST)', 'Biochemistry', '7-56', 'U/L'], ['Kidney function (Creatinine)', 'Biochemistry', '0.6-1.3', 'mg/dL'], ['Lipid profile', 'Biochemistry', '<200', 'mg/dL'], ['Urinalysis', 'Urine', 'Negative', ''], ['Electrolytes (Na/K/Cl)', 'Biochemistry', '135-145', 'mmol/L']];
          for (let i = 0; i < n; i++) {
            lbSeq++;
            const t = pick(TESTS);
            const age = U.diffDays(ap.date, today);
            const status = age > 3 ? 'Approved' : age > 1 ? wpick([['Approved', 60], ['Completed', 40]]) : age === 0 ? wpick([['Ordered', 25], ['Collected', 25], ['Processing', 25], ['Completed', 25]]) : wpick([['Completed', 60], ['Approved', 40]]);
            const flag = chance(0.22) ? pick(['High', 'Low']) : 'Normal';
            const lo = { id: 'LB-' + String(600000 + lbSeq), patientId: pat.id, doctorId: doc.id, visitId: v.id, testName: t[0], category: t[1], orderedAt: stamp(ap.date, ri(8, 12)), status: 'Ordered', result: '', unit: t[3], referenceRange: t[2], flag: '', collectedAt: '', completedAt: '', approvedBy: '' };
            if (['Collected', 'Processing', 'Completed', 'Approved'].includes(status)) lo.collectedAt = stamp(ap.date, ri(8, 13));
            if (['Completed', 'Approved'].includes(status)) { lo.completedAt = stamp(ap.date, ri(13, 18)); lo.result = t[0] === 'Urinalysis' ? pick(['Negative', 'Trace protein']) : String(ri(60, 140)); lo.flag = flag; }
            if (status === 'Approved') lo.approvedBy = pick(staff.filter((s) => s.role === 'Technician')).name;
            lo.status = status;
            labOrders.push(lo);
            labs.push(lo);
            v.labOrderIds.push(lo.id);
          }
        }
        if (chance(0.16)) {
          imSeq++;
          const studyType = pick(HIS.clinic.IMAGING_TYPES);
          const bodyPart = pick(['Chest', 'Abdomen', 'Left knee', 'Right wrist', 'Lumbar spine', 'Head', 'Pelvis']);
          const age = U.diffDays(ap.date, today);
          const status = age > 2 ? 'Reported' : age === 0 ? wpick([['Ordered', 30], ['Scheduled', 30], ['Performed', 20], ['Reported', 20]]) : wpick([['Performed', 30], ['Reported', 70]]);
          const io = { id: 'IM-' + String(650000 + imSeq), patientId: pat.id, doctorId: doc.id, visitId: v.id, studyType, bodyPart, orderedAt: stamp(ap.date, ri(8, 12)), scheduledAt: '', performedAt: '', status: 'Ordered', radiologist: '', result: '', reportText: '' };
          if (['Scheduled', 'Performed', 'Reported'].includes(status)) io.scheduledAt = stamp(ap.date, ri(9, 14));
          if (['Performed', 'Reported'].includes(status)) io.performedAt = stamp(ap.date, ri(10, 16));
          if (status === 'Reported') { io.radiologist = pick(doctors.filter((d) => d.departmentId === 'DPT13')).name; io.result = pick(['No acute abnormality detected.', 'Mild degenerative changes noted.', 'Findings consistent with clinical diagnosis.', 'Recommend clinical correlation.']); io.reportText = `${studyType} of the ${bodyPart.toLowerCase()}: ${io.result}`; }
          io.status = status;
          imagingOrders.push(io);
          imgs.push(io);
          v.imagingOrderIds.push(io.id);
        }
        let meds = [];
        if (chance(0.58)) {
          rxSeq++;
          const n = ri(1, 3);
          const items = [];
          for (let i = 0; i < n; i++) {
            const m = pick(medicines);
            const qty = ['tablet', 'capsule'].includes(m.unit) ? ri(6, 30) : ['bottle', 'sachet'].includes(m.unit) ? ri(1, 5) : ri(1, 2);
            items.push({ medicineId: m.id, medicineName: m.name, dosage: pick(['1 tablet', '2 tablets', '1 capsule', '5 ml', '10 ml']), frequency: pick(['Once daily', 'Twice daily', '3 times daily', 'Every 8 hours']), duration: pick(['3 days', '5 days', '7 days', '10 days', '14 days']), route: pick(['Oral', 'Oral', 'Oral', 'Topical']), instructions: pick(['After meals', 'Before meals', 'With food', 'At bedtime']), qty, unitPrice: m.sellingPrice });
          }
          const rxDate = ap.date;
          const dispensed = rxDate < today || (rxDate === today && chance(0.4));
          const rx = { id: 'RX-' + String(800000 + rxSeq), patientId: pat.id, doctorId: doc.id, visitId: v.id, diagnosis: v.diagnosis, items, status: dispensed ? 'Dispensed' : 'Pending', createdAt: stamp(ap.date, ri(9, 17)), dispensedAt: dispensed ? stamp(ap.date, ri(9, 18)) : '' };
          prescriptions.push(rx);
          v.prescriptionId = rx.id;
          if (dispensed) meds = items;
        }
        const items = invoiceItemsFor({ doctor: doc, labs, imgs, meds });
        const inv = makeInvoice({ patientId: pat.id, visitId: v.id, date: ap.date, items });
        v.invoiceId = inv.id;
        pat.lastVisit = pat.lastVisit && pat.lastVisit > ap.date ? pat.lastVisit : ap.date;
      }
      visits.push(v);
    });

    /* ---------- Admissions & bed occupancy ---------- */
    const admissions = [];
    const REASONS = ['Community-acquired pneumonia', 'Acute appendicitis — post-surgery recovery', 'Uncontrolled diabetes mellitus', 'Congestive heart failure exacerbation', 'Normal delivery — postpartum care', 'Fracture — post-operative recovery', 'Chemotherapy cycle', 'Acute gastroenteritis with dehydration', 'Hypertensive crisis, stabilized', 'Elective surgery recovery'];
    let adSeq = 0;
    const availableForAdmit = () => beds.filter((b) => b.status === 'Available');
    for (let i = 0; i < 13; i++) {
      const pool = availableForAdmit();
      if (!pool.length) break;
      const bed = pick(pool);
      const doc = pick(doctors.filter((d) => d.departmentId === bed.departmentId));
      const pat = pick(patients.filter((p) => !admissions.some((a) => a.patientId === p.id)));
      adSeq++;
      const admDate = U.addDays(today, -ri(0, 6));
      admissions.push({
        id: 'AD-' + String(900000 + adSeq), patientId: pat.id, doctorId: doc ? doc.id : '', departmentId: bed.departmentId, bedId: bed.id,
        admissionDate: admDate, expectedDischarge: U.addDays(admDate, ri(3, 10)), actualDischarge: '', reason: pick(REASONS), status: 'Admitted',
        nursingNotes: [{ at: stamp(admDate, ri(8, 20)), by: pick(staff.filter((s) => s.role === 'Nurse')).name, note: 'Admitted, vitals stable, oriented and comfortable.' }],
        dailyTreatments: [{ at: stamp(admDate, ri(8, 12)), by: doc ? doc.name : '', note: 'IV fluids and medication as charted.' }],
        medications: [{ at: stamp(admDate, ri(8, 20)), by: pick(staff.filter((s) => s.role === 'Nurse')).name, medicine: pick(medicines).name, dose: '1 dose', route: 'IV/Oral' }],
        invoiceId: ''
      });
      bed.status = 'Occupied';
      bed.patientId = pat.id;
    }
    for (let i = 0; i < 12; i++) {
      const deptId = pick(INPATIENT_DEPTS);
      const doc = pick(doctors.filter((d) => d.departmentId === deptId));
      const pat = pick(patients.filter((p) => !admissions.some((a) => a.patientId === p.id)));
      adSeq++;
      const admDate = U.addDays(today, -ri(10, 40));
      const discDate = U.addDays(admDate, ri(3, 9));
      const bedRef = pick(beds.filter((b) => b.departmentId === deptId));
      const nights = U.diffDays(admDate, discDate);
      const items = [{ category: 'Room', description: `Inpatient room — ${K_DEPT_NAME(departments, deptId)}`, qty: nights, unitPrice: pick([400000, 550000, 700000, 900000]) }, { category: 'Procedure', description: 'Nursing care and daily monitoring', qty: 1, unitPrice: pick([300000, 500000]) }];
      const inv = makeInvoice({ patientId: pat.id, admissionId: 'AD-' + String(900000 + adSeq), date: discDate, items });
      admissions.push({
        id: 'AD-' + String(900000 + adSeq), patientId: pat.id, doctorId: doc ? doc.id : '', departmentId: deptId, bedId: bedRef.id,
        admissionDate: admDate, expectedDischarge: U.addDays(admDate, nights), actualDischarge: discDate, status: 'Discharged', reason: pick(REASONS),
        nursingNotes: [{ at: stamp(admDate, ri(8, 20)), by: pick(staff.filter((s) => s.role === 'Nurse')).name, note: 'Admitted, vitals stable.' }, { at: stamp(discDate, ri(9, 12)), by: pick(staff.filter((s) => s.role === 'Nurse')).name, note: `Discharge summary: ${pick(['Recovered well, discharged with medication.', 'Condition improved, follow-up scheduled.', 'Discharged home in stable condition.'])}` }],
        dailyTreatments: [{ at: stamp(admDate, ri(8, 12)), by: doc ? doc.name : '', note: 'Treatment as per care plan.' }],
        medications: [], invoiceId: inv.id
      });
      pat.lastVisit = pat.lastVisit && pat.lastVisit > discDate ? pat.lastVisit : discDate;
    }
    function K_DEPT_NAME(depts, id) { const d = depts.find((x) => x.id === id); return d ? d.name : id; }
    /* a few beds set aside for reservations / cleaning / maintenance for realism */
    availableForAdmit().slice(0, 4).forEach((b) => { b.status = 'Reserved'; });
    availableForAdmit().slice(0, 3).forEach((b) => { b.status = 'Cleaning'; });
    availableForAdmit().slice(0, 2).forEach((b) => { b.status = 'Maintenance'; });

    /* ---------- Emergency cases (today) ---------- */
    const emergencyCases = [];
    const erDoctors = doctors.filter((d) => d.departmentId === 'DPT12');
    const erComplaints = ['Motorbike accident — leg injury', 'Chest pain and shortness of breath', 'High fever with convulsion (child)', 'Severe abdominal pain', 'Fall from height — head injury', 'Allergic reaction — facial swelling', 'Severe burns from kitchen accident', 'Sudden severe headache', 'Difficulty breathing — asthma attack', 'Laceration requiring sutures'];
    for (let i = 0; i < 9; i++) {
      const pat = pick(patients);
      const arrOffsetMin = ri(10, 480);
      const triage = wpick([['Critical', 8], ['Urgent', 27], ['Moderate', 40], ['Non-Urgent', 25]]);
      const statusPool = triage === 'Critical' ? [['Treatment', 40], ['Admitted', 35], ['Assessment', 25]] : [['Arrived', 15], ['Triage', 15], ['Assessment', 20], ['Treatment', 25], ['Discharged', 20], ['Admitted', 5]];
      const status = wpick(statusPool);
      const c = { id: 'ER-' + String(950000 + i + 1), patientId: pat.id, arrivalTime: stamp(today, 5, 60 - (arrOffsetMin % 60)), triageLevel: triage, chiefComplaint: pick(erComplaints), assignedDoctorId: pick(erDoctors).id, assignedRoom: `ER-${ri(1, 6)}`, status, notes: '' };
      c.arrivalTime = U.nowStamp();
      const parts = U.vnParts();
      let mins = Number(parts.hour) * 60 + Number(parts.minute) - arrOffsetMin;
      if (mins < 0) mins += 1440;
      c.arrivalTime = `${today}T${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
      emergencyCases.push(c);
    }

    return {
      version: HIS.DATA_VERSION, anchorDate: today, settings, branches, departments, doctors, staff, patients, beds,
      appointments, visits, labOrders, imagingOrders, medicines, prescriptions, invoices, admissions, emergencyCases,
      notifications: [], readNotifs: [],
      users: [
        { name: 'System Administrator', username: 'admin', password: 'admin123', role: 'Administrator', email: 'admin@mediplus.vn' },
        { name: doctors[0].name, username: 'doctor', password: 'doctor123', role: 'Doctor', email: doctors[0].email, doctorId: doctors[0].id },
        { name: 'Vo Thi Hoa', username: 'nurse', password: 'nurse123', role: 'Nurse', email: 'vo.thi.hoa@mediplus.vn' },
        { name: 'Mai Thi Quyen', username: 'pharmacist', password: 'pharma123', role: 'Pharmacist', email: 'pharmacy@mediplus.vn' },
        { name: 'Ho Ngoc Diep', username: 'reception', password: 'reception123', role: 'Receptionist', email: 'frontdesk@mediplus.vn' },
        { name: 'Phan Thanh Tam', username: 'accountant', password: 'account123', role: 'Accountant', email: 'billing@mediplus.vn' }
      ],
      counters: { patient: patients.length, appt: apSeq, visit: vSeq, lab: lbSeq, img: imSeq, rx: rxSeq, invoice: invSeq, payment: pmtSeq, admission: adSeq, er: emergencyCases.length, notif: 0 }
    };

    function buildMedicines() {
      const CATS = [
        ['Paracetamol 500mg', 'Paracetamol', 'Analgesic', 'tablet', 'Domesco'], ['Panadol Extra', 'Paracetamol/Caffeine', 'Analgesic', 'tablet', 'GSK'],
        ['Ibuprofen 400mg', 'Ibuprofen', 'Analgesic', 'tablet', 'Traphaco'], ['Aspirin 81mg', 'Acetylsalicylic acid', 'Antiplatelet', 'tablet', 'DHG Pharma'],
        ['Amoxicillin 500mg', 'Amoxicillin', 'Antibiotic', 'capsule', 'Imexpharm'], ['Augmentin 625mg', 'Amoxicillin/Clavulanate', 'Antibiotic', 'tablet', 'GSK'],
        ['Azithromycin 250mg', 'Azithromycin', 'Antibiotic', 'tablet', 'Pfizer'], ['Cephalexin 500mg', 'Cephalexin', 'Antibiotic', 'capsule', 'DHG Pharma'],
        ['Cetirizine 10mg', 'Cetirizine', 'Antihistamine', 'tablet', 'Traphaco'], ['Loratadine 10mg', 'Loratadine', 'Antihistamine', 'tablet', 'Domesco'],
        ['Losartan 50mg', 'Losartan', 'Antihypertensive', 'tablet', 'Sanofi'], ['Amlodipine 5mg', 'Amlodipine', 'Antihypertensive', 'tablet', 'Imexpharm'],
        ['Metformin 500mg', 'Metformin', 'Antidiabetic', 'tablet', 'Domesco'], ['Gliclazide 80mg', 'Gliclazide', 'Antidiabetic', 'tablet', 'Servier'],
        ['Omeprazole 20mg', 'Omeprazole', 'Antacid/GI', 'capsule', 'DHG Pharma'], ['Esomeprazole 40mg', 'Esomeprazole', 'Antacid/GI', 'tablet', 'AstraZeneca'],
        ['Salbutamol Inhaler', 'Salbutamol', 'Respiratory', 'inhaler', 'GSK'], ['Dextromethorphan Syrup', 'Dextromethorphan', 'Respiratory', 'bottle', 'Traphaco'],
        ['Vitamin C 1000mg', 'Ascorbic acid', 'Vitamin', 'tablet', 'DHG Pharma'], ['Vitamin B Complex', 'Vitamin B1/B6/B12', 'Vitamin', 'tablet', 'Domesco'],
        ['Calcium + D3', 'Calcium carbonate', 'Vitamin', 'tablet', 'Traphaco'], ['Hydrocortisone Cream 1%', 'Hydrocortisone', 'Dermatological', 'tube', 'Imexpharm'],
        ['Betamethasone Cream', 'Betamethasone', 'Dermatological', 'tube', 'GSK'], ['Atorvastatin 10mg', 'Atorvastatin', 'Cardiac', 'tablet', 'Pfizer'],
        ['Clopidogrel 75mg', 'Clopidogrel', 'Cardiac', 'tablet', 'Sanofi'], ['Furosemide 40mg', 'Furosemide', 'Cardiac', 'tablet', 'DHG Pharma'],
        ['ORS Rehydration Salts', 'Oral rehydration salts', 'Antacid/GI', 'sachet', 'Traphaco'], ['Diclofenac Gel', 'Diclofenac', 'Analgesic', 'tube', 'Novartis'],
        ['Tramadol 50mg', 'Tramadol', 'Analgesic', 'capsule', 'Domesco'], ['Insulin Glargine', 'Insulin glargine', 'Antidiabetic', 'vial', 'Sanofi'],
        ['Levothyroxine 50mcg', 'Levothyroxine', 'Other', 'tablet', 'Merck'], ['Prednisolone 5mg', 'Prednisolone', 'Other', 'tablet', 'DHG Pharma'],
        ['Ciprofloxacin 500mg', 'Ciprofloxacin', 'Antibiotic', 'tablet', 'Imexpharm'], ['Metronidazole 500mg', 'Metronidazole', 'Antibiotic', 'tablet', 'DHG Pharma'],
        ['Ranitidine 150mg', 'Ranitidine', 'Antacid/GI', 'tablet', 'Domesco'], ['Multivitamin Plusssz', 'Multivitamin', 'Vitamin', 'tablet', 'DHG Pharma'],
        ['Iron + Folic Acid', 'Ferrous sulfate/Folic acid', 'Vitamin', 'tablet', 'Traphaco'], ['Oxytocin Injection', 'Oxytocin', 'Other', 'ampoule', 'Sanofi'],
        ['Diazepam 5mg', 'Diazepam', 'Other', 'tablet', 'DHG Pharma'], ['Amoxicillin Syrup 250mg/5ml', 'Amoxicillin', 'Antibiotic', 'bottle', 'Imexpharm'],
        ['Paracetamol Syrup 120mg/5ml', 'Paracetamol', 'Analgesic', 'bottle', 'Domesco'], ['Chlorpheniramine 4mg', 'Chlorpheniramine', 'Antihistamine', 'tablet', 'Traphaco'],
        ['Simvastatin 20mg', 'Simvastatin', 'Cardiac', 'tablet', 'Merck'], ['Warfarin 5mg', 'Warfarin', 'Cardiac', 'tablet', 'DHG Pharma']
      ];
      return CATS.map((m, i) => {
        const expDays = ri(-20, 540);
        const qty = ri(0, 900);
        return {
          id: 'MED-' + String(1000 + i), name: m[0], genericName: m[1], category: m[2], unit: m[3], manufacturer: m[4],
          batch: `B${ri(23, 26)}${String(ri(1, 12)).padStart(2, '0')}${ri(100, 999)}`, expirationDate: U.addDays(today, expDays),
          quantity: qty, reorderLevel: pick([20, 30, 50]), sellingPrice: pick([3000, 5000, 8000, 12000, 15000, 25000, 45000, 60000, 90000, 150000])
        };
      });
    }
  };
})();
