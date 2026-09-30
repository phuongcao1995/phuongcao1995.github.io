/*
 * Mock data — deterministic generator (seeded PRNG) so every fresh install looks the same.
 * All people, companies, numbers and records are fictional. Dates are generated relative to "today".
 *
 * ID formats (modelled on real conventions, values are invented):
 *  - Citizen ID (12 digits): province code (3) + gender/century digit + birth year (2) + serial (6)
 *  - Personal tax code = citizen ID (per current rules); enterprise code = 10-digit tax code
 *  - Social insurance number: 10 digits, first 2 = province
 *  - Plates: cars "43A-123.45", motorbikes "43-B1 234.56"
 */
window.GA = window.GA || {};
(function (GA) {
  'use strict';
  const VERSION = 3;

  const PROVINCES = [
    { name: 'Da Nang City', vi: 'Thành phố Đà Nẵng', code: '048', si: '48', plate: '43', mst: '04',
      units: [['Hải Châu District', ['Thạch Thang Ward', 'Hải Châu I Ward', 'Phước Ninh Ward', 'Hòa Thuận Tây Ward']],
        ['Thanh Khê District', ['Tân Chính Ward', 'Chính Gián Ward', 'Thạc Gián Ward']],
        ['Sơn Trà District', ['An Hải Bắc Ward', 'Phước Mỹ Ward', 'Mân Thái Ward']],
        ['Ngũ Hành Sơn District', ['Mỹ An Ward', 'Khuê Mỹ Ward', 'Hòa Hải Ward']],
        ['Liên Chiểu District', ['Hòa Minh Ward', 'Hòa Khánh Bắc Ward']],
        ['Cẩm Lệ District', ['Khuê Trung Ward', 'Hòa Thọ Đông Ward']],
        ['Hòa Vang District', ['Hòa Phong Commune', 'Hòa Tiến Commune']]],
      streets: ['Bạch Đằng', 'Lê Duẩn', 'Nguyễn Văn Linh', 'Trần Phú', 'Hùng Vương', 'Phan Châu Trinh', 'Võ Nguyên Giáp', 'Ngô Quyền', 'Hoàng Diệu', 'Nguyễn Tri Phương', 'Điện Biên Phủ', 'Tôn Đức Thắng', 'Lê Văn Hiến', 'Núi Thành'] },
    { name: 'Hanoi', vi: 'Thành phố Hà Nội', code: '001', si: '01', plate: '30', mst: '01',
      units: [['Ba Đình District', ['Kim Mã Ward', 'Ngọc Hà Ward']], ['Hoàn Kiếm District', ['Hàng Bạc Ward', 'Tràng Tiền Ward']],
        ['Cầu Giấy District', ['Dịch Vọng Ward', 'Nghĩa Đô Ward']], ['Đống Đa District', ['Láng Hạ Ward', 'Văn Miếu Ward']]],
      streets: ['Kim Mã', 'Đội Cấn', 'Hàng Bạc', 'Tràng Tiền', 'Xuân Thủy', 'Láng Hạ', 'Hoàng Quốc Việt', 'Nguyễn Chí Thanh'] },
    { name: 'Ho Chi Minh City', vi: 'Thành phố Hồ Chí Minh', code: '079', si: '79', plate: '51', mst: '03',
      units: [['District 1', ['Bến Nghé Ward', 'Đa Kao Ward']], ['District 3', ['Võ Thị Sáu Ward']],
        ['Bình Thạnh District', ['Ward 25', 'Ward 22']], ['Thủ Đức City', ['Thảo Điền Ward', 'An Phú Ward']]],
      streets: ['Lê Lợi', 'Nguyễn Huệ', 'Hai Bà Trưng', 'Điện Biên Phủ', 'Xô Viết Nghệ Tĩnh', 'Nguyễn Văn Hưởng', 'Võ Văn Tần'] },
    { name: 'Hai Phong City', vi: 'Thành phố Hải Phòng', code: '031', si: '31', plate: '15', mst: '02',
      units: [['Hồng Bàng District', ['Minh Khai Ward', 'Hoàng Văn Thụ Ward']], ['Lê Chân District', ['An Biên Ward']],
        ['Ngô Quyền District', ['Máy Tơ Ward', 'Lạch Tray Ward']]],
      streets: ['Lạch Tray', 'Điện Biên Phủ', 'Tô Hiệu', 'Lê Thánh Tông', 'Trần Phú'] },
    { name: 'Quang Nam Province', vi: 'Tỉnh Quảng Nam', code: '049', si: '49', plate: '92', mst: '40',
      units: [['Hội An City', ['Minh An Ward', 'Cẩm Phô Ward', 'Cẩm Châu Ward']], ['Tam Kỳ City', ['An Mỹ Ward', 'Tân Thạnh Ward']],
        ['Điện Bàn Town', ['Điện Ngọc Ward', 'Điện Dương Ward']]],
      streets: ['Trần Hưng Đạo', 'Phan Châu Trinh', 'Hùng Vương', 'Nguyễn Duy Hiệu', 'Lý Thường Kiệt', 'Hai Bà Trưng'] },
  ];

  const DEPTS = [
    { id: 'D01', name: 'Public Administrative Service Center', vi: 'Trung tâm Phục vụ hành chính công', short: 'PASC', level: 'Province/City', head: 'OF03' },
    { id: 'D02', name: 'Department of Justice', vi: 'Sở Tư pháp', short: 'Justice', level: 'Province/City' },
    { id: 'D03', name: 'Department of Finance', vi: 'Sở Tài chính', short: 'Finance', level: 'Province/City' },
    { id: 'D04', name: 'Department of Agriculture and Environment', vi: 'Sở Nông nghiệp và Môi trường', short: 'Agri. & Env.', level: 'Province/City' },
    { id: 'D05', name: 'Department of Construction', vi: 'Sở Xây dựng', short: 'Construction', level: 'Province/City' },
    { id: 'D06', name: 'City Police, Administrative Management Division', vi: 'Công an thành phố', short: 'Police', level: 'Ministry-affiliated' },
    { id: 'D07', name: 'City Tax Department', vi: 'Thuế thành phố', short: 'Tax', level: 'Ministry-affiliated' },
    { id: 'D08', name: 'City Social Insurance', vi: 'Bảo hiểm xã hội thành phố', short: 'Social Insurance', level: 'Ministry-affiliated' },
    { id: 'D09', name: 'City Inspectorate', vi: 'Thanh tra thành phố', short: 'Inspectorate', level: 'Province/City' },
    { id: 'D10', name: "Office of the City People's Committee", vi: 'Văn phòng UBND thành phố', short: 'PC Office', level: 'Province/City' },
    { id: 'D11', name: 'Department of Home Affairs', vi: 'Sở Nội vụ', short: 'Home Affairs', level: 'Province/City' },
    { id: 'D12', name: 'Department of Science and Technology', vi: 'Sở Khoa học và Công nghệ', short: 'Sci. & Tech.', level: 'Province/City' },
    { id: 'D13', name: "Hải Châu Ward People's Committee", vi: 'UBND phường Hải Châu', short: 'Hải Châu Ward', level: 'Ward/Commune' },
  ];

  const OFFICERS = [
    ['OF01', 'Trần Quốc Bảo', 'D12', 'Head of Digital Platforms Division'],
    ['OF02', 'Nguyễn Thị Thu Hà', 'D10', 'Senior Specialist'],
    ['OF03', 'Lê Văn Hùng', 'D01', 'Director'],
    ['OF04', 'Phạm Ngọc Lan', 'D01', 'Front-desk Officer'],
    ['OF05', 'Hoàng Minh Tuấn', 'D07', 'Tax Officer'],
    ['OF06', 'Võ Thành Long', 'D04', 'Land Registration Officer'],
    ['OF07', 'Đặng Thị Mai', 'D08', 'Benefits Officer'],
    ['OF08', 'Bùi Anh Dũng', 'D06', 'Captain, Registration Team'],
    ['OF09', 'Huỳnh Thị Kim Ngân', 'D02', 'Civil Status Officer'],
    ['OF10', 'Ngô Đức Thịnh', 'D03', 'Enterprise Registration Specialist'],
    ['OF11', 'Phan Thị Hồng Nhung', 'D05', 'Construction Permit Specialist'],
    ['OF12', 'Đỗ Quang Vinh', 'D09', 'Inspector'],
    ['OF13', 'Trương Thị Yến', 'D13', 'Justice & Civil Status Officer'],
    ['OF14', 'Lý Hoàng Nam', 'D11', 'Employment Services Specialist'],
    ['OF15', 'Dương Minh Châu', 'D10', 'Document Clerk'],
    ['OF16', 'Mai Xuân Phúc', 'D04', 'Deputy Director, Land Registration Office'],
    ['OF17', 'Nguyễn Hữu Tài', 'D07', 'Tax Debt Management Officer'],
    ['OF18', 'Trần Thị Bích Thủy', 'D08', 'Contribution Collection Officer'],
  ].map(([id, name, dept, title]) => ({ id, name, dept, title, email: slug(name) + '@egov-demo.vn', phone: '0236 3' + id.slice(2) + '8 ' + (100 + parseInt(id.slice(2), 10) * 7) }));

  function slug(s) { return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().split(' ').map((w, i, a) => (i === a.length - 1 ? w : w[0])).reverse().join('.'); }

  const SERVICES = [
    { id: 'SV01', code: '1.001193', name: 'Birth registration', vi: 'Đăng ký khai sinh', field: 'Civil status', dept: 'D13', days: 1, fee: 0, level: 'Full online', docs: ['Birth notice issued by the medical facility', 'Identity card of the declarant', "Parents' marriage certificate (if any)"] },
    { id: 'SV02', code: '1.000894', name: 'Marriage registration', vi: 'Đăng ký kết hôn', field: 'Civil status', dept: 'D13', days: 3, fee: 0, level: 'Partial online', docs: ['Marriage registration declaration', 'Identity cards of both parties', 'Certificate of marital status (if registered elsewhere)'] },
    { id: 'SV03', code: '1.004194', name: 'Permanent residence registration', vi: 'Đăng ký thường trú', field: 'Residence', dept: 'D06', days: 7, fee: 20000, level: 'Full online', docs: ['Residence information change declaration (Form CT01)', 'Proof of lawful residence', "Written consent of the owner or household head"] },
    { id: 'SV04', code: '2.000488', name: 'Judicial record certificate', vi: 'Cấp Phiếu lý lịch tư pháp', field: 'Judicial records', dept: 'D02', days: 10, fee: 200000, level: 'Full online', docs: ['Request form for a judicial record certificate', 'Copy of identity card'] },
    { id: 'SV05', code: '2.000815', name: 'Certification of copies from originals', vi: 'Chứng thực bản sao từ bản chính', field: 'Certification', dept: 'D13', days: 1, fee: 2000, level: 'Partial online', docs: ['Original document', 'Copy to be certified'] },
    { id: 'SV06', code: '2.001610', name: 'New enterprise registration', vi: 'Đăng ký thành lập doanh nghiệp', field: 'Enterprise registration', dept: 'D03', days: 3, fee: 50000, level: 'Full online', business: true, docs: ['Enterprise registration application', 'Company charter', 'List of members or founding shareholders', 'Identity documents of the legal representative'] },
    { id: 'SV07', code: '2.000720', name: 'Household business registration', vi: 'Đăng ký thành lập hộ kinh doanh', field: 'Enterprise registration', dept: 'D13', days: 3, fee: 100000, level: 'Full online', docs: ['Household business registration form', 'Identity card of the household representative', 'Minutes of household members (if any)'] },
    { id: 'SV08', code: '1.009974', name: 'Construction permit for individual housing', vi: 'Cấp giấy phép xây dựng nhà ở riêng lẻ', field: 'Construction', dept: 'D05', days: 15, fee: 75000, level: 'Partial online', docs: ['Application for construction permit', 'Certified copy of land-use certificate', 'Two sets of design drawings'] },
    { id: 'SV09', code: '1.012756', name: 'First-time land-use certificate issuance', vi: 'Đăng ký, cấp Giấy chứng nhận lần đầu', field: 'Land', dept: 'D04', days: 20, fee: 100000, level: 'Partial online', docs: ['Land registration application (Form 04/ĐK)', 'Documents proving the origin of land-use rights', 'Cadastral map extract'] },
    { id: 'SV10', code: '1.012790', name: 'Land-use right transfer registration', vi: 'Đăng ký biến động chuyển nhượng quyền sử dụng đất', field: 'Land', dept: 'D04', days: 10, fee: 50000, level: 'Partial online', docs: ['Notarised transfer contract', 'Original land-use certificate', 'Receipts for registration fee and personal income tax'] },
    { id: 'SV11', code: '1.010589', name: 'Vehicle registration and plate issuance', vi: 'Đăng ký, cấp biển số xe', field: 'Transport', dept: 'D06', days: 2, fee: 500000, level: 'Partial online', docs: ['Vehicle registration declaration', 'Sales invoice or proof of origin', 'Registration fee payment receipt'] },
    { id: 'SV12', code: '1.012102', name: "Driver's licence renewal", vi: 'Cấp đổi giấy phép lái xe', field: 'Transport', dept: 'D06', days: 5, fee: 135000, level: 'Full online', docs: ['Application for licence renewal', 'Health certificate for drivers', "Current driver's licence"] },
    { id: 'SV13', code: '1.011807', name: 'Maternity benefit settlement', vi: 'Giải quyết hưởng chế độ thai sản', field: 'Social insurance', dept: 'D08', days: 6, fee: 0, level: 'Full online', docs: ["Child's birth certificate", 'Hospital discharge certificate'] },
    { id: 'SV14', code: '1.001978', name: 'Unemployment benefit application', vi: 'Giải quyết hưởng trợ cấp thất nghiệp', field: 'Employment', dept: 'D11', days: 20, fee: 0, level: 'Partial online', docs: ['Application for unemployment benefit', 'Decision on termination of labour contract', 'Social insurance book'] },
    { id: 'SV15', code: '1.000656', name: 'Death registration', vi: 'Đăng ký khai tử', field: 'Civil status', dept: 'D13', days: 1, fee: 0, level: 'Full online', docs: ['Death notice or equivalent document', 'Identity card of the declarant'] },
    { id: 'SV16', code: '2.001199', name: 'Change of enterprise registration details', vi: 'Đăng ký thay đổi nội dung đăng ký doanh nghiệp', field: 'Enterprise registration', dept: 'D03', days: 3, fee: 50000, level: 'Full online', business: true, docs: ['Notice of change to enterprise registration', 'Decision of the owner or members council'] },
  ];

  const LEGAL = {
    'Civil status': 'Law on Civil Status 2014 and guiding decrees',
    'Residence': 'Law on Residence 2020 and guiding decrees',
    'Judicial records': 'Law on Judicial Records 2009',
    'Certification': 'Decree on certification of copies and signatures',
    'Enterprise registration': 'Law on Enterprises 2020 and the decree on enterprise registration',
    'Construction': 'Law on Construction 2014 (amended) and guiding decrees',
    'Land': 'Land Law 2024 and guiding decrees',
    'Transport': 'Law on Road Traffic Order and Safety 2024',
    'Social insurance': 'Law on Social Insurance 2024',
    'Employment': 'Law on Employment and guiding decrees',
    'Tax': 'Law on Tax Administration 2019',
    'Environment': 'Law on Environmental Protection 2020',
  };

  const SURN = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Trương', 'Đinh'];
  const MID_M = ['Văn', 'Minh', 'Đức', 'Quốc', 'Hữu', 'Thành', 'Công', 'Gia', 'Tấn'];
  const MID_F = ['Thị', 'Ngọc', 'Thu', 'Thanh', 'Mỹ', 'Bảo', 'Kim', 'Hoài', 'Phương'];
  const GIV_M = ['An', 'Bình', 'Cường', 'Dũng', 'Hải', 'Hùng', 'Khoa', 'Long', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Tuấn', 'Việt', 'Hiếu', 'Thắng', 'Trung', 'Lộc'];
  const GIV_F = ['An', 'Chi', 'Hà', 'Hạnh', 'Hoa', 'Lan', 'Linh', 'Mai', 'Nga', 'Ngân', 'Phương', 'Thảo', 'Trang', 'Vy', 'Yến', 'Hương', 'Giang', 'Nhi'];
  const OCC = ['Software engineer', 'Teacher', 'Nurse', 'Accountant', 'Civil servant', 'Small business owner', 'Construction worker', 'Tour guide', 'Fisherman', 'Driver', 'Retired', 'Student', 'Architect', 'Pharmacist', 'Factory worker', 'Hotel staff', 'Farmer', 'Bank officer'];
  const PHONE_PFX = ['0905', '0935', '0914', '0983', '0977', '0868', '0763', '0339', '0912', '0706'];

  function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function generate() {
    const rnd = mulberry32(20260929);
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const digits = (n) => { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(rnd() * 10); return s; };
    const chance = (p) => rnd() < p;
    const pad2 = (n) => String(n).padStart(2, '0');
    const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const now = new Date();
    const daysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return iso(d); };
    const dtAgo = (n, h) => { const d = new Date(now); d.setDate(d.getDate() - n); d.setHours(h === undefined ? int(7, 17) : h, int(0, 59), 0, 0); return d.toISOString(); };
    const addDays = (s, n) => { const d = new Date(s); d.setDate(d.getDate() + n); return iso(d); };
    const provW = () => (chance(0.52) ? PROVINCES[0] : pick(PROVINCES.slice(1)));
    const place = (p) => { p = p || provW(); const u = pick(p.units); return { province: p.name, district: u[0], ward: pick(u[1]), street: int(2, 480) + ' ' + pick(p.streets) }; };
    const phone = () => pick(PHONE_PFX) + ' ' + digits(3) + ' ' + digits(3);
    const provOf = (name) => PROVINCES.find((p) => p.name === name) || PROVINCES[0];
    const cidFor = (p, gender, year) => p.code + (gender === 'Male' ? (year < 2000 ? '0' : '2') : (year < 2000 ? '1' : '3')) + String(year).slice(2) + digits(6);
    const person = (gender) => {
      gender = gender || (chance(0.5) ? 'Male' : 'Female');
      const name = pick(SURN) + ' ' + (gender === 'Male' ? pick(MID_M) : pick(MID_F)) + ' ' + (gender === 'Male' ? pick(GIV_M) : pick(GIV_F));
      return { name, gender };
    };

    /* ---------------- Citizens ---------------- */
    const citizens = [];
    const fixed = [
      { name: 'Nguyễn Minh Khoa', gender: 'Male', dob: '1990-05-14', occ: 'Software engineer', p: PROVINCES[0], pl: { province: 'Da Nang City', district: 'Hải Châu District', ward: 'Thạch Thang Ward', street: '25 Bạch Đằng' } },
      { name: 'Trần Thị Thu Hương', gender: 'Female', dob: '1985-11-02', occ: 'Company director', p: PROVINCES[0], pl: { province: 'Da Nang City', district: 'Sơn Trà District', ward: 'An Hải Bắc Ward', street: '112 Ngô Quyền' } },
    ];
    for (let i = 0; i < 38; i++) {
      let base;
      if (fixed[i]) base = fixed[i];
      else {
        const pp = person(); const p = provW();
        const year = int(1948, 2006);
        base = { name: pp.name, gender: pp.gender, dob: `${year}-${pad2(int(1, 12))}-${pad2(int(1, 28))}`, occ: year < 1964 ? 'Retired' : year > 2004 ? 'Student' : pick(OCC), p, pl: place(p) };
      }
      const year = parseInt(base.dob.slice(0, 4), 10);
      const age = now.getFullYear() - year;
      const married = age > 26 && chance(0.72);
      const family = [];
      if (married) {
        const sp = person(base.gender === 'Male' ? 'Female' : 'Male');
        const sy = year + int(-4, 4);
        family.push({ relation: base.gender === 'Male' ? 'Wife' : 'Husband', name: base.name.split(' ')[0] === sp.name.split(' ')[0] ? sp.name : sp.name, dob: `${sy}-${pad2(int(1, 12))}-${pad2(int(1, 28))}`, cid: cidFor(base.p, sp.gender, sy) });
        const kids = age > 30 ? int(1, 3) : int(0, 1);
        for (let k = 0; k < kids; k++) {
          const g = chance(0.5) ? 'Male' : 'Female';
          const ky = Math.min(now.getFullYear() - 1, year + int(24, 36));
          const nm = base.name.split(' ')[0] + ' ' + (g === 'Male' ? pick(MID_M) : pick(MID_F)) + ' ' + (g === 'Male' ? pick(GIV_M) : pick(GIV_F));
          family.push({ relation: g === 'Male' ? 'Son' : 'Daughter', name: base.gender === 'Male' ? nm : family[0].name.split(' ')[0] + nm.slice(nm.indexOf(' ')), dob: `${ky}-${pad2(int(1, 12))}-${pad2(int(1, 28))}`, cid: cidFor(base.p, g, ky) });
        }
      }
      if (age < 30) {
        family.push({ relation: 'Father', name: base.name.split(' ')[0] + ' ' + pick(MID_M) + ' ' + pick(GIV_M), dob: `${year - int(24, 32)}-${pad2(int(1, 12))}-${pad2(int(1, 28))}`, cid: cidFor(base.p, 'Male', year - 28) });
      }
      const issued = daysAgo(int(200, 1600));
      const status = i < 2 ? 'Active' : pick(['Active', 'Active', 'Active', 'Active', 'Active', 'Active', 'Temporarily absent', 'Moved out', 'Active', 'Deceased']);
      const history = [
        { date: base.dob, action: 'Birth registration', unit: base.pl.ward + ", People's Committee", ref: 'KS-' + year + '-' + digits(4) },
        { date: issued, action: 'Chip-based ID card issued', unit: 'Department of Police for Administrative Management of Social Order', ref: 'CC-' + digits(6) },
      ];
      if (married) history.splice(1, 0, { date: `${year + int(24, 30)}-${pad2(int(1, 12))}-${pad2(int(1, 28))}`, action: 'Marriage registration', unit: base.pl.ward + ", People's Committee", ref: 'KH-' + digits(5) });
      if (chance(0.5)) history.push({ date: daysAgo(int(30, 900)), action: 'Permanent residence updated', unit: 'Ward Police', ref: 'CT01-' + digits(5) });
      if (status === 'Moved out') history.push({ date: daysAgo(int(10, 120)), action: 'Permanent residence de-registered (moved out)', unit: 'Ward Police', ref: 'XT-' + digits(5) });
      if (status === 'Deceased') history.push({ date: daysAgo(int(10, 300)), action: 'Death registration', unit: base.pl.ward + ", People's Committee", ref: 'KT-' + digits(5) });
      history.sort((a, b) => a.date.localeCompare(b.date));
      citizens.push(Object.assign({
        id: 'CT-' + String(i + 1).padStart(4, '0'),
        cid: i === 0 ? '048090012345' : i === 1 ? '048185004521' : cidFor(base.p, base.gender, year),
        fullName: base.name, dob: base.dob, gender: base.gender, ethnicity: chance(0.94) ? 'Kinh' : pick(['Cơ Tu', 'Hoa', 'Tày']),
        religion: pick(['None', 'None', 'None', 'Buddhism', 'Catholicism']), nationality: 'Vietnamese',
        hometown: provW().vi.replace('Thành phố ', '').replace('Tỉnh ', ''),
        occupation: base.occ, maritalStatus: married ? 'Married' : age > 60 && chance(0.4) ? 'Widowed' : 'Single',
        phone: phone(), email: i < 6 || chance(0.5) ? slug(base.name).replace(/\./g, '') + int(1, 99) + '@mail.vn' : '',
        residenceType: chance(0.82) ? 'Permanent' : 'Temporary', status,
        household: 'HK-' + base.p.code + '-' + digits(6), idIssued: issued, idExpiry: addDays(issued, 365 * (age < 25 ? 10 : age < 40 ? 15 : 25)),
        family, history, createdAt: dtAgo(int(1, 400)), updatedAt: dtAgo(int(0, 60)),
      }, base.pl));
    }
    const adults = citizens.filter((c) => now.getFullYear() - parseInt(c.dob, 10) >= 20 && c.status !== 'Deceased');

    /* ---------------- Businesses ---------------- */
    const BIZ_BASE = ['Sông Hàn', 'Ngũ Hành', 'Mỹ Khê', 'Hải Vân', 'Sơn Trà', 'Phố Hội', 'Tràng An', 'Hồng Hà', 'Bến Thành', 'Sài Gòn Xanh', 'Đồ Sơn', 'Cát Bà', 'Kim Long', 'Thiên Phúc', 'Minh Phát', 'An Phát', 'Đại Việt', 'Phương Nam', 'Hoàng Gia', 'Tân Á', 'Việt Tiến', 'Hưng Thịnh', 'Bạch Đằng', 'Trường An'];
    const IND = [
      ['6201', 'Computer programming', 'Công nghệ', 'Technology'], ['5510', 'Short-term accommodation', 'Du lịch Khách sạn', 'Hospitality'],
      ['5610', 'Restaurants and mobile food services', 'Ẩm thực', 'Food Services'], ['4100', 'Construction of buildings', 'Xây dựng', 'Construction'],
      ['4933', 'Freight transport by road', 'Vận tải', 'Logistics'], ['4711', 'Retail sale in non-specialised stores', 'Thương mại', 'Trading'],
      ['7020', 'Management consultancy', 'Tư vấn', 'Consulting'], ['8559', 'Other education', 'Giáo dục', 'Education'],
      ['1410', 'Manufacture of wearing apparel', 'May mặc', 'Garment'], ['1020', 'Processing and preserving of fish', 'Thủy sản', 'Seafood'],
      ['6810', 'Real estate activities', 'Bất động sản', 'Real Estate'], ['4632', 'Wholesale of food', 'Thực phẩm', 'Foods'],
    ];
    const TYPES = [
      ['Single-member LLC', 'Công ty TNHH', 'Co., Ltd.'], ['Multi-member LLC', 'Công ty TNHH', 'Co., Ltd.'], ['Joint stock company', 'Công ty Cổ phần', 'JSC'],
      ['Private enterprise', 'Doanh nghiệp tư nhân', 'Private Enterprise'], ['Household business', 'Hộ kinh doanh', 'Household Business'],
    ];
    const businesses = [];
    for (let i = 0; i < 24; i++) {
      const ind = i === 0 ? IND[0] : pick(IND);
      const ty = i === 0 ? TYPES[0] : pick([TYPES[0], TYPES[1], TYPES[1], TYPES[2], TYPES[2], TYPES[3], TYPES[4]]);
      const p = i === 0 ? PROVINCES[0] : provW();
      const rep = i === 0 ? citizens[1] : pick(adults);
      const pl = i === 0 ? { province: 'Da Nang City', district: 'Hải Châu District', ward: 'Phước Ninh Ward', street: '78 Nguyễn Văn Linh' } : place(p);
      const nameVi = ty[0] === 'Household business' ? `Hộ kinh doanh ${rep.fullName}` : `${ty[1]} ${ind[2]} ${BIZ_BASE[i]}`;
      const nameEn = ty[0] === 'Household business' ? `${rep.fullName} Household Business` : `${slug(BIZ_BASE[i]).split('.').reverse().map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')} ${ind[3]} ${ty[2]}`;
      const regDate = daysAgo(int(60, 4200));
      const status = i === 0 ? 'Operating' : pick(['Operating', 'Operating', 'Operating', 'Operating', 'Operating', 'Temporarily suspended', 'Operating', 'Under dissolution', 'Dissolved', 'Operating']);
      const history = [{ date: regDate, change: 'Initial registration', ref: 'ĐKKD lần đầu', by: 'Business Registration Office' }];
      const nch = int(0, 3);
      for (let k = 0; k < nch; k++) history.push({ date: addDays(regDate, int(90, 1200) * (k + 1) / 2), change: pick(['Change of head office address', 'Increase of charter capital', 'Change of legal representative', 'Addition of business lines', 'Change of company name']), ref: 'Amendment ' + (k + 1), by: 'Business Registration Office' });
      if (status === 'Temporarily suspended') history.push({ date: daysAgo(int(10, 200)), change: 'Notice of temporary business suspension (12 months)', ref: 'TB-TNKD', by: 'Business Registration Office' });
      if (status === 'Dissolved') history.push({ date: daysAgo(int(10, 200)), change: 'Dissolution registered', ref: 'GT-' + digits(4), by: 'Business Registration Office' });
      history.sort((a, b) => a.date.localeCompare(b.date));
      history.forEach((h) => { if (h.date > iso(now)) h.date = daysAgo(int(5, 40)); });
      businesses.push(Object.assign({
        id: 'BUS-' + String(i + 1).padStart(4, '0'),
        code: i === 0 ? '0401798231' : p.mst + digits(8), name: nameVi, nameEn, type: ty[0],
        representative: rep.fullName, repCitizenId: rep.id, industryCode: ind[0], industry: ind[1],
        capital: ty[0] === 'Household business' ? int(1, 9) * 1e8 : int(1, 60) * 1e9 / (chance(0.5) ? 10 : 1),
        employees: ty[0] === 'Household business' ? int(1, 8) : int(5, 420), regDate, status,
        phone: '0236 ' + digits(3) + ' ' + digits(4), email: 'contact@' + slug(BIZ_BASE[i]).replace(/\./g, '') + '.vn',
        history, createdAt: dtAgo(int(10, 600)),
      }, pl));
    }
    businesses.forEach((b) => { b.history.forEach((h) => { if (h.date < b.regDate) h.date = b.regDate; }); });

    /* ---------------- Applications (public services) ---------------- */
    const STATUS_CHAIN = {
      Draft: ['Draft'], Submitted: ['Submitted'], 'Under Review': ['Submitted', 'Under Review'],
      'Additional Information Required': ['Submitted', 'Under Review', 'Additional Information Required'],
      Approved: ['Submitted', 'Under Review', 'Approved'], Rejected: ['Submitted', 'Under Review', 'Rejected'],
      Completed: ['Submitted', 'Under Review', 'Approved', 'Completed'],
    };
    const NOTE = {
      Draft: 'Draft saved by the applicant.', Submitted: 'Application received via the online public service portal.',
      'Under Review': 'Assigned to the processing officer for review.',
      'Additional Information Required': 'Please upload a certified copy of the missing document listed below.',
      Approved: 'Application meets all requirements. Result prepared for signature.',
      Rejected: 'The supporting documents do not meet the requirements of the procedure.',
      Completed: 'Result returned to the applicant (electronic copy and counter pickup).',
    };
    const APP_ST = ['Submitted', 'Under Review', 'Completed', 'Additional Information Required', 'Approved', 'Completed', 'Under Review', 'Completed', 'Rejected', 'Draft', 'Submitted', 'Under Review', 'Completed'];
    const officerFor = (dept) => (OFFICERS.find((o) => o.dept === dept) || OFFICERS[3]).id;
    const applications = [];
    for (let i = 0; i < 28; i++) {
      const svc = SERVICES[(i * 7) % SERVICES.length];
      let applicant, type = 'Citizen';
      if (svc.business) { const b = i % 3 === 0 ? businesses[0] : pick(businesses.slice(0, 18)); applicant = { id: b.id, name: b.name }; type = 'Business'; }
      else { const c = [0, 5, 11, 19].includes(i) ? citizens[0] : pick(adults); applicant = { id: c.id, name: c.fullName, cid: c.cid }; }
      const status = i === 0 ? 'Additional Information Required' : APP_ST[i % APP_ST.length];
      const age = status === 'Completed' ? int(8, 70) : status === 'Draft' ? int(0, 3) : int(0, 25);
      const submitted = dtAgo(age);
      const deadline = addDays(submitted, Math.ceil(svc.days * 1.4) + (svc.days > 5 ? 2 : 0));
      const chain = STATUS_CHAIN[status];
      let t = new Date(submitted);
      const history = chain.map((s, k) => {
        if (k) t = new Date(t.getTime() + int(3, 60) * 3600 * 1000);
        if (t > now) t = new Date(now.getTime() - (chain.length - k) * 3600 * 1000);
        return { time: t.toISOString(), status: s, by: s === 'Submitted' || s === 'Draft' ? applicant.name : OFFICERS.find((o) => o.id === officerFor(svc.dept)).name, note: NOTE[s] };
      });
      const documents = svc.docs.map((d, k) => ({ name: d, file: d.replace(/[^A-Za-z]+/g, '_').slice(0, 28).toLowerCase() + '.pdf', status: status === 'Draft' ? (k ? 'Missing' : 'Uploaded') : status === 'Additional Information Required' && k === svc.docs.length - 1 ? 'Missing' : status === 'Submitted' ? 'Received' : 'Valid' }));
      const yymmdd = submitted.slice(2, 10).replace(/-/g, '');
      const channel = pick(['Online', 'Online', 'Online', 'Counter', 'Postal']);
      applications.push({
        id: 'APP-' + String(i + 1).padStart(4, '0'),
        code: `000.00.${pad2(int(10, 40))}.H17-${yymmdd}-${String(int(1, 9999)).padStart(4, '0')}`,
        serviceId: svc.id, serviceName: svc.name, field: svc.field, dept: svc.dept,
        applicantId: applicant.id, applicantName: applicant.name, applicantType: type,
        submittedAt: submitted, deadline, status, officerId: status === 'Draft' || status === 'Submitted' ? '' : officerFor(svc.dept),
        channel: status === 'Draft' ? 'Online' : channel, fee: svc.fee, paid: svc.fee === 0 || status !== 'Draft',
        documents, history, note: '', resultNo: status === 'Completed' || status === 'Approved' ? `${int(100, 999)}/${svc.field === 'Land' ? 'GCN' : 'KQ'}-${int(1, 9)}` : '',
      });
    }

    const appointments = [];
    const LOCS = ['PASC Counter area A (civil status & residence)', 'PASC Counter area B (land & construction)', 'PASC Counter area C (enterprise & investment)', "Hải Châu Ward People's Committee, one-stop desk"];
    const SLOTS = ['07:30', '08:30', '09:30', '10:30', '13:30', '14:30', '15:30', '16:30'];
    for (let i = 0; i < 14; i++) {
      const app = applications[i * 2 % applications.length];
      const future = i < 9;
      let dd = future ? addDays(iso(now), int(1, 12)) : daysAgo(int(1, 20));
      const wd = new Date(dd).getDay(); if (wd === 0) dd = addDays(dd, 1); if (wd === 6) dd = addDays(dd, 2);
      appointments.push({
        id: 'APT-' + String(i + 1).padStart(4, '0'), applicantId: i === 0 ? citizens[0].id : app.applicantId, applicantName: i === 0 ? citizens[0].fullName : app.applicantName,
        purpose: i === 0 ? 'Submit original documents for ' + applications[0].serviceName : 'Receive result: ' + app.serviceName,
        appId: i === 0 ? applications[0].id : app.id, location: pick(LOCS), date: dd, slot: pick(SLOTS),
        status: future ? (i % 5 === 4 ? 'Cancelled' : 'Booked') : pick(['Completed', 'Completed', 'No-show']),
        ticket: 'B' + String(int(1, 250)).padStart(3, '0'),
      });
    }

    /* ---------------- Procedures ---------------- */
    const WF = {
      default: [['Receive and check application', 0.5, 'D01'], ['Appraise dossier', 0.6, null], ['Approve and sign result', 0.25, null], ['Return result', 0.15, 'D01']],
      Land: [['Receive at one-stop desk', 0.1, 'D01'], ['Verify cadastral records', 0.35, 'D04'], ['Site inspection (if required)', 0.2, 'D04'], ['Tax obligation notice', 0.1, 'D07'], ['Sign certificate', 0.15, 'D04'], ['Return result', 0.1, 'D01']],
    };
    const procedures = SERVICES.map((s, i) => ({
      id: 'PR-' + String(i + 1).padStart(3, '0'), code: s.code + '.000.00.00.H17', name: s.name, vi: s.vi, field: s.field, dept: s.dept,
      days: s.days, fee: s.fee, level: s.level, availability: s.level === 'Full online' ? 'Online' : 'Online & counter',
      docs: s.docs, legal: LEGAL[s.field] || 'Applicable legal documents', status: i === 7 ? 'Under amendment' : 'Active', serviceId: s.id,
      level2: s.level, result: s.field === 'Land' ? 'Land-use right certificate' : s.field === 'Civil status' ? 'Civil status extract' : 'Administrative decision / certificate',
      workflow: (WF[s.field] || WF.default).map(([step, share, dept]) => ({ step, days: Math.max(0.5, Math.round(s.days * share * 2) / 2), dept: dept || s.dept })),
    }));
    [
      ['Temporary residence registration', 'Đăng ký tạm trú', 'Residence', 'D06', 3, 7000, 'Online & counter'],
      ['Tax registration for individuals', 'Đăng ký thuế lần đầu cho cá nhân', 'Tax', 'D07', 3, 0, 'Online'],
      ['Environmental licence issuance', 'Cấp giấy phép môi trường', 'Environment', 'D04', 30, 0, 'Counter only'],
      ['Health insurance card reissue', 'Cấp lại thẻ BHYT', 'Social insurance', 'D08', 3, 0, 'Online'],
      ['Business location registration', 'Đăng ký địa điểm kinh doanh', 'Enterprise registration', 'D03', 3, 0, 'Online'],
      ['Adoption registration', 'Đăng ký việc nuôi con nuôi trong nước', 'Civil status', 'D02', 30, 400000, 'Counter only'],
    ].forEach(([name, vi, field, dept, days, fee, avail], k) => {
      procedures.push({
        id: 'PR-' + String(SERVICES.length + k + 1).padStart(3, '0'), code: '1.00' + (4100 + k * 37) + '.000.00.00.H17', name, vi, field, dept, days, fee,
        level: avail === 'Online' ? 'Full online' : avail === 'Counter only' ? 'Information only' : 'Partial online', availability: avail,
        docs: ['Application form', 'Identity document of the applicant', 'Supporting documents as prescribed'], legal: LEGAL[field] || 'Applicable legal documents',
        status: k === 5 ? 'Suspended' : 'Active', serviceId: '', result: 'Administrative decision / certificate',
        workflow: WF.default.map(([step, share, d]) => ({ step, days: Math.max(0.5, Math.round(days * share * 2) / 2), dept: d || dept })),
      });
    });

    /* ---------------- Tax ---------------- */
    const taxpayers = [];
    businesses.forEach((b, i) => {
      const debt = b.status === 'Dissolved' ? 0 : chance(0.3) ? int(5, 480) * 1e6 : 0;
      taxpayers.push({
        id: 'TP-' + String(i + 1).padStart(4, '0'), mst: b.code, name: b.name, type: b.type === 'Household business' ? 'Household' : 'Business',
        refId: b.id, taxOffice: provOf(b.province).name === 'Da Nang City' ? 'Da Nang City Tax Department' : b.province + ' Tax Department',
        status: b.status === 'Dissolved' ? 'Closed' : b.status === 'Temporarily suspended' ? 'Suspended' : 'Active',
        method: b.type === 'Household business' ? 'Declaration' : 'Credit method (VAT)', industry: b.industry,
        debt, debtDays: debt ? int(12, 210) : 0, address: [b.street, b.ward, b.district, b.province].join(', '), registeredAt: b.regDate,
      });
    });
    adults.slice(0, 14).forEach((c, i) => {
      const debt = chance(0.18) ? int(1, 25) * 1e6 : 0;
      taxpayers.push({
        id: 'TP-' + String(businesses.length + i + 1).padStart(4, '0'), mst: c.cid, name: c.fullName, type: 'Individual', refId: c.id,
        taxOffice: c.province === 'Da Nang City' ? 'Da Nang City Tax Department' : c.province + ' Tax Department', status: 'Active',
        method: 'PIT withholding / finalisation', industry: c.occupation, debt, debtDays: debt ? int(10, 120) : 0,
        address: [c.street, c.ward, c.district, c.province].join(', '), registeredAt: c.idIssued,
      });
    });
    const FORMS = { Business: [['01/GTGT', 'VAT return', 'M'], ['03/TNDN', 'Corporate income tax finalisation', 'Y'], ['05/KK-TNCN', 'PIT withholding return', 'Q']], Household: [['01/CNKD', 'Household business tax return', 'Q']], Individual: [['02/QTT-TNCN', 'Personal income tax finalisation', 'Y']] };
    const declarations = [], taxPayments = [];
    const months = [];
    for (let k = 1; k <= 8; k++) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); months.push({ m: d.getMonth() + 1, y: d.getFullYear() }); }
    taxpayers.forEach((tp) => {
      if (tp.status === 'Closed') return;
      const forms = FORMS[tp.type];
      const n = tp.type === 'Individual' ? 1 : int(2, 3);
      for (let k = 0; k < n; k++) {
        const f = forms[k % forms.length];
        const mo = months[k * 2 % months.length];
        const period = f[2] === 'M' ? `${pad2(mo.m)}/${mo.y}` : f[2] === 'Q' ? `Q${Math.ceil(mo.m / 3)}/${mo.y}` : String(now.getFullYear() - 1);
        const due = f[2] === 'M' ? `${mo.y}-${pad2(mo.m === 12 ? 1 : mo.m + 1)}-20` : f[2] === 'Q' ? addDays(`${mo.y}-${pad2(Math.ceil(mo.m / 3) * 3)}-28`, 34) : `${now.getFullYear()}-04-30`;
        const late = chance(0.14);
        const sub = late ? addDays(due, int(2, 25)) : addDays(due, -int(1, 12));
        const amount = tp.type === 'Individual' ? int(0, 40) * 1e6 : tp.type === 'Household' ? int(3, 30) * 1e6 : int(12, 900) * 1e6;
        const st = late ? 'Late' : pick(['Accepted', 'Accepted', 'Accepted', 'Accepted', 'Pending review', 'Amended']);
        declarations.push({ id: 'DC-' + String(declarations.length + 1).padStart(5, '0'), taxpayerId: tp.id, taxpayerName: tp.name, mst: tp.mst, form: f[0], formName: f[1], period, dueDate: due, submittedAt: sub > iso(now) ? iso(now) : sub, amount, status: st });
        if (st !== 'Pending review' && chance(0.85)) {
          taxPayments.push({ id: 'PM-' + String(taxPayments.length + 1).padStart(5, '0'), taxpayerId: tp.id, taxpayerName: tp.name, mst: tp.mst, date: addDays(sub, int(0, 6)) > iso(now) ? iso(now) : addDays(sub, int(0, 6)), amount, taxType: f[1].replace(' return', '').replace(' finalisation', ''), channel: pick(['Online banking', 'Online banking', 'Tax e-portal', 'State Treasury counter', 'Mobile payment']), ref: 'GNT' + digits(10), status: chance(0.94) ? 'Completed' : 'Pending' });
        }
      }
    });
    const taxMonthly = months.slice().reverse().concat([{ m: now.getMonth() + 1, y: now.getFullYear() }]);
    const baseTax = [2410, 2280, 3050, 2760, 2890, 3320, 2950, 3180, 3460, 2870, 3010, 3240];
    const taxTrend = []; for (let k = 11; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); const v = baseTax[(d.getMonth()) % 12] + int(-120, 160); taxTrend.push({ key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`, collected: v * 1e9, target: 2950e9 }); }

    /* ---------------- Social insurance ---------------- */
    const employers = businesses.filter((b) => b.status !== 'Dissolved' && b.type !== 'Household business');
    const insParticipants = adults.slice(0, 26).map((c, i) => {
      const emp = i === 1 ? businesses[0] : pick(employers);
      const p = provOf(c.province);
      const age = now.getFullYear() - parseInt(c.dob, 10);
      const status = c.occupation === 'Retired' || age >= 61 ? 'Receiving pension' : i === 0 ? 'Active' : pick(['Active', 'Active', 'Active', 'Active', 'Suspended', 'Reserved']);
      const salary = int(52, 320) * 1e5;
      const start = Math.max(1990, parseInt(c.dob, 10) + int(20, 26));
      const empHist = [];
      let y = start;
      while (y < now.getFullYear() - 1 && empHist.length < 3) {
        const to = Math.min(now.getFullYear() - 1, y + int(2, 9));
        empHist.push({ from: `${y}-${pad2(int(1, 12))}`, to: `${to}-${pad2(int(1, 12))}`, employer: pick(businesses).name, position: pick(['Staff', 'Specialist', 'Team leader', 'Technician', 'Accountant', 'Manager']), salary: Math.round(salary * (0.5 + empHist.length * 0.2) / 1e5) * 1e5 });
        y = to;
      }
      if (status === 'Active' || status === 'Suspended') empHist.push({ from: `${y}-${pad2(int(1, 12))}`, to: '', employer: emp.name, position: i === 1 ? 'Director' : pick(['Staff', 'Specialist', 'Senior specialist', 'Engineer', 'Supervisor']), salary });
      const monthsPaid = Math.max(6, (now.getFullYear() - start) * 12 - int(0, 40));
      return {
        id: 'SI-' + String(i + 1).padStart(4, '0'), insNo: p.si + digits(8), citizenId: c.id, name: c.fullName, dob: c.dob, gender: c.gender, cid: c.cid,
        employerId: status === 'Active' || status === 'Suspended' ? emp.id : '', employerName: status === 'Active' || status === 'Suspended' ? emp.name : '—',
        salary, startDate: `${start}-01-01`, months: monthsPaid, status, healthCard: 'DN' + p.si + digits(10), healthCardExpiry: addDays(iso(now), int(-20, 330)),
        hospital: pick(['Da Nang General Hospital', 'Hải Châu District Health Center', 'Sơn Trà District Health Center', 'Da Nang C Hospital', 'Family Hospital (private)']), employment: empHist,
      };
    });
    const CLAIM_TYPES = [['Sickness', 1.5e6, 6e6], ['Maternity', 18e6, 42e6], ['Unemployment', 12e6, 36e6], ['Pension', 6e6, 14e6], ['One-time withdrawal', 40e6, 160e6], ['Occupational accident', 8e6, 60e6], ['Funeral allowance', 23.4e6, 23.4e6]];
    const insClaims = [];
    for (let i = 0; i < 20; i++) {
      const pt = insParticipants[(i * 5) % insParticipants.length];
      const ct = pt.status === 'Receiving pension' ? CLAIM_TYPES[3] : pick(CLAIM_TYPES.filter((c) => c[0] !== 'Pension' && (c[0] !== 'Maternity' || pt.gender === 'Female')));
      const st = pick(['Submitted', 'Under Review', 'Approved', 'Paid', 'Paid', 'Paid', 'Rejected', 'Under Review']);
      insClaims.push({ id: 'CL-' + String(i + 1).padStart(4, '0'), code: 'BHXH-' + pad2(int(1, 12)) + digits(6), participantId: pt.id, name: pt.name, insNo: pt.insNo, type: ct[0], submittedAt: daysAgo(int(1, 90)), amount: Math.round((ct[1] + rnd() * (ct[2] - ct[1])) / 1e5) * 1e5, status: st, officerId: st === 'Submitted' ? '' : pick(['OF07', 'OF18']), paidAt: st === 'Paid' ? daysAgo(int(0, 20)) : '', note: st === 'Rejected' ? 'Contribution period does not meet the minimum requirement.' : '' });
    }
    const insContributions = [];
    const siMonths = []; for (let k = 5; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); siMonths.push(`${pad2(d.getMonth() + 1)}/${d.getFullYear()}`); }
    employers.slice(0, 12).forEach((b, i) => {
      siMonths.slice(-3).forEach((m, k) => {
        const emps = Math.max(3, Math.round(b.employees * 0.8));
        const payroll = emps * int(70, 140) * 1e5;
        const due = Math.round(payroll * 0.32);
        const last = k === 2;
        const st = last ? pick(['Paid', 'Paid', 'Partially paid', 'Overdue', 'Pending']) : chance(0.9) ? 'Paid' : 'Overdue';
        insContributions.push({ id: 'CB-' + String(insContributions.length + 1).padStart(5, '0'), employerId: b.id, employerName: b.name, unitCode: 'YN' + digits(5) + 'A', period: m, employees: emps, payroll, due, paid: st === 'Paid' ? due : st === 'Partially paid' ? Math.round(due * 0.6) : 0, status: st });
      });
    });

    /* ---------------- Land parcels ---------------- */
    const PURPOSE = { ODT: 'Urban residential land', ONT: 'Rural residential land', TMD: 'Commercial and service land', SKC: 'Non-agricultural production land', CLN: 'Perennial crop land', LUC: 'Paddy land', DGD: 'Education facility land' };
    const parcels = [];
    for (let i = 0; i < 26; i++) {
      const p = i < 14 ? PROVINCES[0] : provW();
      const pl = i === 0 ? { province: 'Da Nang City', district: 'Hải Châu District', ward: 'Thạch Thang Ward', street: '25 Bạch Đằng' } : place(p);
      if (i < 14 && i > 0) { pl.district = 'Hải Châu District'; pl.ward = pick(['Thạch Thang Ward', 'Hải Châu I Ward', 'Phước Ninh Ward']); }
      const rural = /Commune/.test(pl.ward);
      const code = i === 0 ? 'ODT' : rural ? pick(['ONT', 'CLN', 'LUC']) : pick(['ODT', 'ODT', 'ODT', 'ODT', 'TMD', 'SKC', 'DGD', 'ODT']);
      const bizOwner = (code === 'TMD' || code === 'SKC') && chance(0.7);
      const owner = i === 0 ? citizens[0] : bizOwner ? null : pick(adults);
      const biz = bizOwner ? pick(businesses) : null;
      const area = code === 'ODT' ? int(48, 260) + int(0, 9) / 10 : code === 'LUC' || code === 'CLN' ? int(600, 4800) : int(180, 2400);
      const issued = daysAgo(int(200, 5200));
      const status = i === 0 ? 'Registered' : pick(['Registered', 'Registered', 'Registered', 'Registered', 'Mortgaged', 'Pending transfer', 'Disputed', 'Pending registration']);
      const ownerName = owner ? owner.fullName : biz.name;
      const transfers = [{ date: issued, type: 'First issuance', from: 'State allocation / recognition', to: ownerName, ref: 'QĐ ' + int(100, 999) + '/QĐ-UBND', value: 0 }];
      if (chance(0.45) && i !== 0) {
        const prev = pick(adults).fullName;
        transfers[0].to = prev;
        transfers.push({ date: addDays(issued, int(200, 2000)) > iso(now) ? daysAgo(int(20, 180)) : addDays(issued, int(200, 2000)), type: pick(['Transfer', 'Transfer', 'Inheritance', 'Gift']), from: prev, to: ownerName, ref: 'HĐ ' + digits(4) + '/CN', value: Math.round(area * int(15, 180) * 1e6 / 1e7) * 1e7 });
      }
      const series = pick(['DA', 'DB', 'DĐ', 'CT', 'CS']);
      parcels.push(Object.assign({
        id: 'LP-' + String(i + 1).padStart(4, '0'), parcelNo: String(int(12, 420)), sheetNo: String(int(3, 48)),
        area, purpose: code, purposeName: PURPOSE[code], term: code === 'ODT' || code === 'ONT' ? 'Long-term' : 'Until ' + (now.getFullYear() + int(10, 45)),
        origin: pick(['State land allocation with land-use levy', 'Recognised land-use rights', 'Transfer of land-use rights', 'State land lease, annual payment']),
        ownerId: owner ? owner.id : biz.id, ownerName, ownerType: owner ? 'Individual' : 'Organisation',
        certNo: series + ' ' + digits(6), certBook: 'CS ' + digits(5), certIssued: issued, status,
        value: Math.round(area * (code === 'ODT' ? int(40, 220) : code === 'TMD' ? int(30, 150) : int(1, 12)) * 1e6 / 1e7) * 1e7,
        mortgagee: status === 'Mortgaged' ? pick(['Joint Stock Commercial Bank A (fictional)', 'Commercial Bank B (fictional)', 'Housing Development Bank C (fictional)']) : '',
        transfers, createdAt: dtAgo(int(10, 500)),
      }, pl));
    }

    /* ---------------- Vehicles ---------------- */
    const MODELS = [['Motorcycle', 'Honda', 'Vision'], ['Motorcycle', 'Honda', 'Air Blade 160'], ['Motorcycle', 'Honda', 'SH 160i'], ['Motorcycle', 'Yamaha', 'Exciter 155'], ['Motorcycle', 'Yamaha', 'Janus'], ['Electric scooter', 'VinFast', 'Evo200'], ['Electric scooter', 'VinFast', 'Feliz S'],
      ['Car', 'Toyota', 'Vios'], ['Car', 'Toyota', 'Corolla Cross'], ['Car', 'Hyundai', 'Accent'], ['Car', 'Kia', 'Seltos'], ['Car', 'Mazda', 'CX-5'], ['Car', 'VinFast', 'VF 5'], ['Car', 'VinFast', 'VF 8'], ['Car', 'Ford', 'Ranger'], ['Truck', 'THACO', 'Ollin 720'], ['Truck', 'Hyundai', 'Mighty EX8']];
    const COLORS = ['White', 'Black', 'Grey', 'Silver', 'Red', 'Blue', 'Brown'];
    const vehicles = [];
    const LETTERS = 'ABCDEFGHKLMNPSTUVXYZ';
    for (let i = 0; i < 26; i++) {
      const m = i === 0 ? MODELS[1] : i === 1 ? MODELS[8] : pick(MODELS);
      const truck = m[0] === 'Truck';
      const owner = i < 2 ? citizens[0] : truck ? null : pick(adults);
      const biz = owner ? null : pick(businesses);
      const p = owner ? provOf(owner.province) : provOf(biz.province);
      const plateCode = p.name === 'Hanoi' ? pick(['29', '30']) : p.name === 'Ho Chi Minh City' ? pick(['51', '59']) : p.plate;
      const two = m[0] === 'Motorcycle' || m[0] === 'Electric scooter';
      const plate = two ? `${plateCode}-${LETTERS[int(0, 19)]}${int(1, 9)} ${digits(3)}.${digits(2)}` : `${plateCode}${truck ? 'C' : pick(['A', 'A', 'K', 'H'])}-${digits(3)}.${digits(2)}`;
      const year = int(2012, now.getFullYear());
      const regDate = `${year}-${pad2(int(1, 12))}-${pad2(int(1, 28))}` > iso(now) ? daysAgo(int(10, 60)) : `${year}-${pad2(int(1, 12))}-${pad2(int(1, 28))}`;
      const inspExp = two ? '' : addDays(iso(now), int(-60, 540));
      const inspStatus = two ? 'Not required' : inspExp < iso(now) ? 'Expired' : inspExp < addDays(iso(now), 30) ? 'Due soon' : 'Valid';
      const status = i < 2 ? 'Active' : pick(['Active', 'Active', 'Active', 'Active', 'Active', 'Transfer pending', 'Deregistered', 'Active', 'Seized']);
      const ownerName = owner ? owner.fullName : biz.name;
      const history = [{ date: regDate, event: 'First registration', owner: chance(0.3) && i > 1 ? pick(adults).fullName : ownerName, ref: 'ĐK-' + digits(6) }];
      if (history[0].owner !== ownerName) history.push({ date: addDays(regDate, int(200, 1400)) > iso(now) ? daysAgo(int(10, 100)) : addDays(regDate, int(200, 1400)), event: 'Ownership transfer', owner: ownerName, ref: 'SC-' + digits(6) });
      if (status === 'Deregistered') history.push({ date: daysAgo(int(5, 200)), event: 'Registration revoked (vehicle scrapped)', owner: ownerName, ref: 'TH-' + digits(6) });
      vehicles.push({
        id: 'VH-' + String(i + 1).padStart(4, '0'), plate, ownerId: owner ? owner.id : biz.id, ownerName, ownerType: owner ? 'Individual' : 'Organisation',
        type: m[0], brand: m[1], model: m[2], year, color: pick(COLORS), capacity: two ? pick(['110 cc', '125 cc', '155 cc', '160 cc', 'Electric 2.5 kW']) : truck ? pick(['3.5 t', '7.2 t', '8 t']) : pick(['5 seats', '7 seats']),
        engineNo: (m[1].slice(0, 2).toUpperCase()) + digits(2) + 'E' + digits(7), chassisNo: 'RL' + (m[1][0]) + digits(3) + LETTERS[int(0, 19)] + digits(9),
        regDate, regOffice: p.name === 'Da Nang City' ? 'Da Nang City Police, Traffic Police Division' : p.name + ' Police', certNo: digits(6),
        inspection: { status: inspStatus, expires: inspExp, center: two ? '' : pick(['Vehicle Inspection Center 43-01D', 'Vehicle Inspection Center 43-02D', 'Vehicle Inspection Center 43-05D']) },
        status, history, province: p.name, createdAt: dtAgo(int(1, 400)),
      });
    }

    /* ---------------- Electronic documents ---------------- */
    const DT = { CV: 'Official letter', QĐ: 'Decision', TB: 'Notice', BC: 'Report', KH: 'Plan', GM: 'Invitation', CT: 'Directive', TTr: 'Submission' };
    const DTVI = { CV: 'CÔNG VĂN', QĐ: 'QUYẾT ĐỊNH', TB: 'THÔNG BÁO', BC: 'BÁO CÁO', KH: 'KẾ HOẠCH', GM: 'GIẤY MỜI', CT: 'CHỈ THỊ', TTr: 'TỜ TRÌNH' };
    const DOCS = [
      ['incoming', 'CV', '4521/BNV-TCBC', 'Ministry of Home Affairs', 'Bộ Nội vụ', 'Guidance on reviewing job positions after the reorganisation of administrative units', 'Về việc hướng dẫn rà soát vị trí việc làm sau sắp xếp đơn vị hành chính'],
      ['incoming', 'CV', '812/VPCP-KSTT', 'Government Office', 'Văn phòng Chính phủ', 'Accelerating the reduction of administrative procedure processing time', 'Về việc đẩy mạnh cắt giảm thời gian giải quyết thủ tục hành chính'],
      ['incoming', 'TB', '1290/TB-BTC', 'Ministry of Finance', 'Bộ Tài chính', 'Notice on the 2026 public asset inventory', 'Thông báo về việc kiểm kê tài sản công năm 2026'],
      ['incoming', 'CV', '3310/BCA-C06', 'Ministry of Public Security', 'Bộ Công an', 'Coordinating the use of population data in public service delivery', 'Về việc phối hợp khai thác dữ liệu dân cư phục vụ giải quyết thủ tục hành chính'],
      ['incoming', 'KH', '215/KH-SKHCN', 'Department of Science and Technology', 'Sở Khoa học và Công nghệ', 'Plan for digital transformation training for ward and commune officers', 'Kế hoạch bồi dưỡng kỹ năng chuyển đổi số cho cán bộ cấp xã'],
      ['incoming', 'BC', '88/BC-UBND', "Hải Châu Ward People's Committee", 'UBND phường Hải Châu', 'Report on public service delivery in the third quarter', 'Báo cáo kết quả giải quyết thủ tục hành chính quý III'],
      ['incoming', 'CV', '1045/BHXH-QLT', 'City Social Insurance', 'Bảo hiểm xã hội thành phố', 'Request to settle overdue social insurance contributions of enterprises', 'Về việc đôn đốc các đơn vị nợ đóng bảo hiểm xã hội'],
      ['incoming', 'GM', '301/GM-VP', "Office of the City People's Committee", 'Văn phòng UBND thành phố', 'Invitation to the monthly administrative reform briefing', 'Giấy mời dự họp giao ban cải cách hành chính tháng'],
      ['incoming', 'CV', '2207/TTP-NVDT', 'City Tax Department', 'Thuế thành phố', 'Coordinating e-invoice compliance checks for household businesses', 'Về việc phối hợp kiểm tra việc sử dụng hóa đơn điện tử của hộ kinh doanh'],
      ['outgoing', 'QĐ', '1587/QĐ-UBND', "City People's Committee", 'UBND thành phố', 'Approving the list of administrative procedures eligible for full online processing', 'Về việc phê duyệt danh mục thủ tục hành chính đủ điều kiện cung cấp dịch vụ công trực tuyến toàn trình'],
      ['outgoing', 'CV', '4102/UBND-KSTT', "City People's Committee", 'UBND thành phố', 'Handling overdue applications at the Public Administrative Service Center', 'Về việc xử lý hồ sơ trễ hạn tại Trung tâm Phục vụ hành chính công'],
      ['outgoing', 'KH', '198/KH-UBND', "City People's Committee", 'UBND thành phố', 'Plan for the 2026 public satisfaction survey', 'Kế hoạch khảo sát mức độ hài lòng của người dân, doanh nghiệp năm 2026'],
      ['outgoing', 'QĐ', '1602/QĐ-UBND', "City People's Committee", 'UBND thành phố', 'Establishing the working group on land records digitisation', 'Về việc thành lập Tổ công tác số hóa hồ sơ địa chính'],
      ['outgoing', 'TB', '355/TB-UBND', "City People's Committee", 'UBND thành phố', "Conclusions of the Chairman at the monthly administrative reform meeting", 'Kết luận của Chủ tịch UBND thành phố tại cuộc họp giao ban cải cách hành chính'],
      ['outgoing', 'CT', '09/CT-UBND', "City People's Committee", 'UBND thành phố', 'Strengthening discipline in public service delivery', 'Về việc tăng cường kỷ luật, kỷ cương trong giải quyết thủ tục hành chính'],
      ['outgoing', 'CV', '4150/UBND-ĐT', "City People's Committee", 'UBND thành phố', 'Response to citizen feedback on drainage along Núi Thành street', 'Về việc trả lời phản ánh của công dân về thoát nước trên đường Núi Thành'],
      ['internal', 'TTr', '112/TTr-TTPVHCC', 'Public Administrative Service Center', 'Trung tâm Phục vụ hành chính công', 'Proposal to open counters on Saturday mornings', 'Về việc đề xuất tổ chức tiếp nhận hồ sơ vào sáng thứ Bảy'],
      ['internal', 'BC', '56/BC-VP', "Office of the City People's Committee", 'Văn phòng UBND thành phố', 'Weekly summary of incoming documents', 'Báo cáo tổng hợp văn bản đến trong tuần'],
      ['internal', 'KH', '41/KH-VP', "Office of the City People's Committee", 'Văn phòng UBND thành phố', 'Plan for archiving records of the previous year', 'Kế hoạch chỉnh lý, nộp lưu hồ sơ năm trước'],
      ['internal', 'TB', '77/TB-VP', "Office of the City People's Committee", 'Văn phòng UBND thành phố', 'Scheduled maintenance of the internal network', 'Thông báo lịch bảo trì hệ thống mạng nội bộ'],
      ['internal', 'CV', '203/VP-HCTC', "Office of the City People's Committee", 'Văn phòng UBND thành phố', 'Staff assignment for the document digitisation project', 'Về việc phân công cán bộ tham gia dự án số hóa tài liệu'],
      ['internal', 'BC', '60/BC-TTPVHCC', 'Public Administrative Service Center', 'Trung tâm Phục vụ hành chính công', 'Report on the on-time processing rate for the past week', 'Báo cáo tỷ lệ giải quyết hồ sơ đúng hạn trong tuần'],
      ['internal', 'TTr', '118/TTr-STC', 'Department of Finance', 'Sở Tài chính', 'Proposal on funding for digital signature certificates', 'Về việc đề xuất kinh phí cấp chứng thư số cho cán bộ'],
      ['internal', 'QĐ', '25/QĐ-VP', "Office of the City People's Committee", 'Văn phòng UBND thành phố', 'Internal rules for handling confidential documents', 'Ban hành Quy chế quản lý văn bản mật trong nội bộ cơ quan'],
    ];
    const SIGNERS = [['Phạm Văn Thành', 'KT. CHỦ TỊCH', 'PHÓ CHỦ TỊCH'], ['Lê Thị Minh Tâm', 'TL. CHỦ TỊCH', 'CHÁNH VĂN PHÒNG'], ['Hồ Quang Huy', 'KT. GIÁM ĐỐC', 'PHÓ GIÁM ĐỐC'], ['Nguyễn Đình Khang', '', 'GIÁM ĐỐC']];
    const documents = DOCS.map(([dir, type, number, sender, senderVi, summary, summaryVi], i) => {
      const dateAgo = int(0, 40);
      const date = daysAgo(dateAgo);
      const priority = i % 7 === 1 ? 'Very urgent' : i % 3 === 0 ? 'Urgent' : 'Normal';
      const stIn = ['Awaiting receipt', 'Processing', 'Processing', 'Completed', 'Archived'];
      const stOut = ['Drafting', 'Awaiting signature', 'Signed', 'Issued', 'Issued', 'Archived'];
      const status = dir === 'incoming' ? pick(stIn) : pick(stOut);
      const signed = dir === 'incoming' ? true : ['Signed', 'Issued', 'Archived'].includes(status);
      const signer = pick(SIGNERS);
      const recipient = dir === 'incoming' ? "City People's Committee" : dir === 'internal' ? pick(['All divisions', 'Administration & HR Division', 'Public Administrative Service Center', 'Department of Finance']) : pick(['Departments, agencies and ward People\'s Committees', 'Public Administrative Service Center', 'Department of Agriculture and Environment', 'Citizen: ' + pick(adults).fullName]);
      const handler = pick(['OF02', 'OF15', 'OF03', 'OF02']);
      const wf = dir === 'incoming'
        ? [['Received and registered', 'OF15'], ['Assigned by leadership', 'OF03'], ['Processed by specialist', handler], ['Filed', 'OF15']]
        : [['Drafted by specialist', handler], ['Reviewed by division head', 'OF02'], ['Signed digitally', null], ['Issued and sent', 'OF15'], ['Filed', 'OF15']];
      const doneCount = dir === 'incoming' ? stIn.indexOf(status) + 1 : Math.max(1, stOut.indexOf(status) + 1);
      return {
        id: 'DOC-' + String(i + 1).padStart(4, '0'), direction: dir, type: DT[type], typeCode: type, typeVi: DTVI[type], number,
        regNo: dir === 'incoming' ? 'Đến số ' + int(1200, 4800) : '', summary, summaryVi, sender, senderVi, recipient,
        date, receivedAt: dir === 'incoming' ? dtAgo(Math.max(0, dateAgo - int(0, 2))) : '', priority, status,
        deadline: ['Completed', 'Archived', 'Issued', 'Signed'].includes(status) ? '' : addDays(date, priority === 'Very urgent' ? 1 : priority === 'Urgent' ? 3 : 10),
        handlerId: handler, pages: int(1, 12), confidential: i === 23 ? 'Restricted' : 'Normal',
        signature: signed ? { status: 'Valid', signer: signer[0], title: signer[2], on: signer[1], time: dtAgo(dateAgo, int(8, 17)), cert: 'CA-' + digits(4) + '-' + digits(8), issuer: 'Government Specialised CA (demo)' } : { status: status === 'Awaiting signature' ? 'Pending' : 'Unsigned', signer: signer[0], title: signer[2], on: signer[1] },
        workflow: wf.map(([step, who], k) => ({ step, actor: who ? (OFFICERS.find((o) => o.id === who) || {}).name : signer[0], time: k < doneCount ? dtAgo(Math.max(0, dateAgo - k), 8 + k * 2) : '', done: k < doneCount })),
        attachments: int(0, 3),
      };
    });

    /* ---------------- Digital identity ---------------- */
    const SERV_LINK = ['National Public Service Portal', 'e-Tax services', 'Social insurance online', 'Health insurance card', "Driver's licence", 'Banking eKYC', 'Electronic health book', 'Residence information'];
    const identities = adults.slice(0, 24).map((c, i) => {
      const level = i === 0 ? 'Level 2' : chance(0.72) ? 'Level 2' : 'Level 1';
      const status = i === 0 ? 'Active' : pick(['Active', 'Active', 'Active', 'Active', 'Active', 'Pending verification', 'Locked']);
      const created = daysAgo(int(60, 900));
      const logins = [];
      for (let k = 0; k < int(4, 9); k++) logins.push({ time: dtAgo(k * int(1, 6), int(6, 22)), device: pick(['Android 15, Chrome', 'iOS 18, Safari', 'Windows 11, Edge', 'macOS, Chrome', 'Android 14, e-ID app']), ip: '113.' + int(160, 190) + '.' + int(0, 255) + '.' + int(1, 254), location: pick(['Da Nang', 'Da Nang', 'Hanoi', 'Ho Chi Minh City', 'Quang Nam']), result: chance(0.9) ? 'Success' : 'Failed' });
      const alerts = [];
      if (logins.some((l) => l.result === 'Failed')) alerts.push({ time: logins.find((l) => l.result === 'Failed').time, type: 'Failed sign-in', detail: 'Incorrect passcode entered 3 times', severity: 'Medium' });
      if (chance(0.25)) alerts.push({ time: dtAgo(int(1, 20)), type: 'New device', detail: 'Sign-in from a device not used before', severity: 'Low' });
      if (status === 'Locked') alerts.push({ time: dtAgo(int(0, 5)), type: 'Account locked', detail: 'Locked after 5 failed attempts. Unlock at the ward police or verify via face match.', severity: 'High' });
      return {
        id: 'ID-' + String(i + 1).padStart(4, '0'), citizenId: c.id, name: c.fullName, cid: c.cid, account: c.phone.replace(/\s/g, ''), level, status,
        createdAt: created, verifiedAt: level === 'Level 2' ? addDays(created, int(0, 30)) : '', method: level === 'Level 2' ? pick(['Chip card read via NFC + face match', 'Counter verification at ward police']) : 'Phone number + citizen ID match',
        linked: SERV_LINK.filter(() => chance(level === 'Level 2' ? 0.6 : 0.25)),
        logins, alerts,
        verifications: [{ time: created + 'T09:15:00.000Z', step: 'Account registered', result: 'Success', by: 'Self-service' }].concat(level === 'Level 2' ? [{ time: addDays(created, 2) + 'T10:05:00.000Z', step: 'Chip data matched with national population database', result: 'Success', by: 'System' }, { time: addDays(created, 2) + 'T10:06:00.000Z', step: 'Face biometrics matched', result: 'Success', by: 'System' }] : status === 'Pending verification' ? [{ time: dtAgo(int(1, 6)), step: 'Level 2 upgrade requested', result: 'Pending', by: 'Self-service' }] : []),
      };
    });

    /* ---------------- Complaints ---------------- */
    const CATS = {
      'Land & housing': ['D04', ['Boundary dispute with neighbouring parcel', 'Delay in issuing land-use certificate', 'Incorrect area recorded on certificate']],
      'Environment & sanitation': ['D04', ['Uncollected household waste for over a week', 'Noise and dust from a nearby workshop', 'Wastewater discharge into canal']],
      'Urban order & construction': ['D05', ['Construction without permit on residential alley', 'Sidewalk occupied by commercial stalls', 'Unsafe scaffolding at a building site']],
      'Traffic & infrastructure': ['D05', ['Street flooding after heavy rain', 'Broken streetlights on main road', 'Large pothole causing accidents']],
      'Public services': ['D01', ['Application processed late without notice', 'Online portal payment failed but money deducted', 'Counter staff requested extra documents not listed']],
      'Social welfare': ['D11', ['Delay in social allowance payment for the elderly', 'Request to review poor household status']],
      'Officer conduct': ['D09', ['Unprofessional conduct at reception desk', 'Request for unofficial payment reported']],
    };
    const CST = ['Received', 'Assigned', 'Investigating', 'Waiting for Information', 'Resolved', 'Closed', 'Investigating', 'Assigned', 'Resolved', 'Received'];
    const complaints = [];
    const catKeys = Object.keys(CATS);
    for (let i = 0; i < 24; i++) {
      const cat = catKeys[i % catKeys.length];
      const [dept, titles] = CATS[cat];
      const c = [0, 8, 17].includes(i) ? citizens[0] : pick(adults);
      const status = CST[i % CST.length];
      const sub = dtAgo(int(0, 45));
      const priority = cat === 'Officer conduct' || cat === 'Traffic & infrastructure' ? pick(['High', 'Urgent']) : pick(['Normal', 'Normal', 'High']);
      const off = status === 'Received' ? '' : (OFFICERS.find((o) => o.dept === dept) || OFFICERS[11]).id;
      const title = titles[i % titles.length];
      const tl = [{ time: sub, status: 'Received', by: 'Citizen feedback portal', note: 'Submitted by ' + c.fullName + ' via ' + (i % 3 ? 'web portal' : 'hotline 1022') }];
      const order = ['Received', 'Assigned', 'Investigating', 'Waiting for Information', 'Resolved', 'Closed'];
      const idx = order.indexOf(status);
      let tacc = new Date(sub).getTime(); for (let k = 1; k <= idx; k++) { if (order[k] === 'Waiting for Information' && status !== 'Waiting for Information') continue; tacc += int(8, 40) * 3600000; tl.push({ time: new Date(Math.min(tacc, Date.now() - 600000)).toISOString(), status: order[k], by: k === 1 ? 'Lê Văn Hùng' : (OFFICERS.find((o) => o.id === off) || {}).name, note: { Assigned: 'Forwarded to the responsible department.', Investigating: 'Field verification scheduled.', 'Waiting for Information': 'Requested photos and exact location from the citizen.', Resolved: 'Issue addressed. Response sent to the citizen.', Closed: 'Case closed after citizen confirmation.' }[order[k]] }); }
      tl.forEach((x) => { if (new Date(x.time) > now) x.time = new Date(now.getTime() - 3600000).toISOString(); });
      complaints.push({
        id: 'CP-' + String(i + 1).padStart(4, '0'), code: 'PA-' + now.getFullYear() + '-' + String(int(1000, 9999)), citizenId: c.id, citizenName: c.fullName, phone: c.phone,
        category: cat, title, description: `${title}. Location: ${c.street}, ${c.ward}. The issue has persisted and affects nearby households. I request the authorities to inspect and resolve it.`,
        submittedAt: sub, dept, priority, status, officerId: off, deadline: addDays(sub, priority === 'Urgent' ? 3 : priority === 'High' ? 7 : 15),
        channel: i % 3 ? 'Web portal' : 'Hotline 1022', location: c.street + ', ' + c.ward,
        resolution: ['Resolved', 'Closed'].includes(status) ? pick(['Ward team inspected the site and cleared the obstruction; ongoing monitoring assigned.', 'Responsible unit completed repairs and confirmed with the citizen by phone.', 'Case reviewed; administrative sanction issued to the violating party.']) : '',
        feedback: status === 'Closed' ? { rating: int(3, 5), comment: pick(['Handled quickly, thank you.', 'Resolved, but took longer than expected.', 'Satisfied with the response.']) } : null,
        timeline: tl,
      });
    }

    /* ---------------- Users ---------------- */
    const DEMO = [
      ['admin', 'sysadmin', 'OF01'], ['officer', 'officer', 'OF02'], ['manager', 'manager', 'OF03'], ['psofficer', 'psofficer', 'OF04'],
      ['tax', 'tax', 'OF05'], ['land', 'land', 'OF06'], ['insurance', 'insurance', 'OF07'],
    ];
    const users = DEMO.map(([u, role, of], i) => {
      const o = OFFICERS.find((x) => x.id === of);
      return { id: 'US-' + String(i + 1).padStart(3, '0'), username: u, name: o.name, role, dept: o.dept, title: o.title, email: o.email, status: 'Active', twoFactor: true, lastLogin: dtAgo(int(0, 3)), officerId: o.id, demo: true };
    });
    users.push({ id: 'US-008', username: 'citizen', name: citizens[0].fullName, role: 'citizen', dept: '', title: 'Citizen', email: citizens[0].email, status: 'Active', twoFactor: true, lastLogin: dtAgo(1), subjectId: citizens[0].id, demo: true });
    users.push({ id: 'US-009', username: 'business', name: citizens[1].fullName, role: 'business', dept: '', title: 'Legal representative, ' + businesses[0].nameEn, email: businesses[0].email, status: 'Active', twoFactor: true, lastLogin: dtAgo(2), subjectId: citizens[1].id, businessId: businesses[0].id, demo: true });
    OFFICERS.slice(7).forEach((o, i) => {
      const role = { D06: 'officer', D02: 'officer', D03: 'officer', D05: 'officer', D09: 'officer', D13: 'psofficer', D11: 'officer', D10: 'officer', D04: 'land', D07: 'tax', D08: 'insurance' }[o.dept] || 'officer';
      users.push({ id: 'US-' + String(10 + i).padStart(3, '0'), username: slug(o.name).replace(/\./g, ''), name: o.name, role, dept: o.dept, title: o.title, email: o.email, status: i === 5 ? 'Locked' : 'Active', twoFactor: chance(0.7), lastLogin: dtAgo(int(0, 30)), officerId: o.id });
    });

    /* ---------------- Notifications & audit ---------------- */
    const notifications = [
      { id: 'NT-1', time: dtAgo(0, 8), title: '3 applications due today', body: 'Review pending applications at the Public Administrative Service Center.', type: 'warning', audience: 'staff', read: false, link: '#/services' },
      { id: 'NT-2', time: dtAgo(0, 9), title: 'Very urgent document received', body: documents.find((d) => d.priority === 'Very urgent').number + ': ' + documents.find((d) => d.priority === 'Very urgent').summary, type: 'error', audience: 'staff', read: false, link: '#/documents' },
      { id: 'NT-3', time: dtAgo(1), title: 'New complaint assigned', body: complaints[1].code + ': ' + complaints[1].title, type: 'info', audience: 'staff', read: false, link: '#/complaints/' + complaints[1].id },
      { id: 'NT-4', time: dtAgo(2), title: 'Tax debt reminder batch sent', body: 'Reminders sent to 7 taxpayers with debts over 90 days.', type: 'info', audience: 'staff', read: true, link: '#/tax' },
      { id: 'NT-5', time: dtAgo(0, 7), title: 'Additional documents required', body: `Application ${applications[0].code} needs one more document before review can continue.`, type: 'warning', audience: citizens[0].id, read: false, link: '#/services/' + applications[0].id },
      { id: 'NT-6', time: dtAgo(2), title: 'Appointment confirmed', body: `Ticket ${appointments[0].ticket} on ${appointments[0].date.split('-').reverse().join('/')} at ${appointments[0].slot}.`, type: 'success', audience: citizens[0].id, read: false, link: '#/services' },
      { id: 'NT-7', time: dtAgo(3), title: 'VAT return due soon', body: 'The VAT return for last month is due on the 20th.', type: 'warning', audience: citizens[1].id, read: false, link: '#/tax' },
      { id: 'NT-8', time: dtAgo(5), title: 'Sign-in from a new device', body: 'Your e-ID account was used on Windows 11, Edge. If this was not you, lock your account.', type: 'warning', audience: citizens[0].id, read: true, link: '#/identity' },
    ];
    const audit = [];
    const ACT = [['Updated application status', 'APP'], ['Signed document digitally', 'DOC'], ['Registered incoming document', 'DOC'], ['Assigned complaint', 'CP'], ['Updated citizen profile', 'CT'], ['Recorded tax payment', 'PM'], ['Approved benefit claim', 'CL'], ['Registered land transfer', 'LP'], ['Signed in', '']];
    for (let i = 0; i < 26; i++) { const a = pick(ACT); const u = pick(users.slice(0, 7)); audit.push({ id: 'AU-' + i, time: dtAgo(Math.floor(i / 4), 17 - (i % 4) * 2), user: u.name, role: u.role, action: a[0], target: a[1] ? a[1] + '-' + String(int(1, 24)).padStart(4, '0') : '', detail: '' }); }

    /* Baselines for city-wide dashboard statistics (register records above are a sample). */
    const svcMonthly = [];
    for (let k = 11; k >= 0; k--) { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); const season = [0.8, 0.62, 1.05, 1.0, 1.06, 1.1, 1.02, 1.08, 1.12, 1.15, 1.1, 1.18][d.getMonth()]; svcMonthly.push({ key: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`, online: Math.round(14800 * season + int(-600, 600)), counter: Math.round(4200 * season + int(-300, 300)) }); }

    const out = {
      version: VERSION, generatedAt: new Date().toISOString(),
      departments: DEPTS, officers: OFFICERS, services: SERVICES, procedures,
      citizens, businesses, applications, appointments,
      taxpayers, declarations, taxPayments, taxTrend,
      insParticipants, insClaims, insContributions,
      parcels, vehicles, documents, identities, complaints,
      users, notifications, audit,
      stats: {
        citizens: 1245380, applicationsYtd: 168420, taxpayers: 142300, businesses: 38760, parcels: 412900, vehicles: 1086500, docsIncomingYtd: 24680,
        onTimeRate: 98.2, satisfaction: 94.6, svcMonthly,
      },
      settings: {
        lang: 'en', addressModel: '3-level', pageSize: 10, dateFormat: 'dd/mm/yyyy',
        orgName: "Da Nang City People's Committee", orgVi: 'Ủy ban nhân dân thành phố Đà Nẵng', orgCode: 'H17', orgAddress: '24 Trần Phú, Hải Châu, Da Nang (demo address)',
        hotline: '1022', notifyEmail: true, notifySms: false, notifyDeadline: true, sessionTimeout: 30, maintenance: false,
      },
    };
    /* No timestamp may lie in the future: pull any such value back to earlier today. */
    const cap = now.getTime() - 5 * 60000;
    (function clamp(o) {
      if (Array.isArray(o)) { o.forEach(clamp); return; }
      if (!o || typeof o !== 'object') return;
      Object.keys(o).forEach((k) => {
        const v = o[k];
        if (typeof v === 'string' && /^\d{4}-\d\d-\d\dT/.test(v) && new Date(v).getTime() > cap) o[k] = new Date(cap - int(1, 240) * 60000).toISOString();
        else if (v && typeof v === 'object') clamp(v);
      });
    })([out.documents, out.identities, out.users, out.audit, out.notifications, out.applications, out.complaints]);
    out.audit.sort((a, b) => (a.time < b.time ? 1 : -1));
    out.identities.forEach((x) => x.logins.sort((a, b) => (a.time < b.time ? 1 : -1)));
    return out;
  }

  GA.data = { VERSION, generate, PROVINCES, DEPTS };
})(window.GA);
