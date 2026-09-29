/* =========================================================
   Mock data: a 120-room 4-star hotel in Da Nang.
   Generated deterministically around "today" so every page
   (arrivals, departures, in-house, calendar) is populated.
   ========================================================= */
(function () {
  'use strict';
  const HMS = window.HMS;
  const U = HMS.util;
  HMS.DATA_VERSION = 6;

  /* ---------- Static reference data ---------- */
  const ROOM_TYPES = [
    { id: 'STS', name: 'Standard Single', bed: 'Single', capacity: 1, rate: 750000, size: 20, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Rain shower', 'Work desk'] },
    { id: 'STD', name: 'Standard Double', bed: 'Double', capacity: 2, rate: 900000, size: 24, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Rain shower', 'Minibar'] },
    { id: 'SUP', name: 'Superior', bed: 'Queen', capacity: 2, rate: 1100000, size: 28, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Minibar', 'Safe box', 'Bathtub'] },
    { id: 'DLX', name: 'Deluxe', bed: 'King', capacity: 2, rate: 1450000, size: 32, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Minibar', 'Safe box', 'Bathtub', 'Balcony', 'Coffee machine'] },
    { id: 'FAM', name: 'Family Room', bed: '2 Queen', capacity: 4, rate: 1900000, size: 42, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Minibar', 'Safe box', 'Sofa bed', 'Balcony'] },
    { id: 'SUI', name: 'Suite', bed: 'King', capacity: 3, rate: 2800000, size: 58, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Minibar', 'Safe box', 'Bathtub', 'Living room', 'Balcony', 'Coffee machine', 'Lounge access'] },
    { id: 'PRE', name: 'Presidential Suite', bed: 'King', capacity: 4, rate: 6500000, size: 120, amenities: ['Wi-Fi', 'Air conditioning', 'Smart TV', 'Full bar', 'Safe box', 'Jacuzzi', 'Living & dining room', 'Panoramic sea view', 'Butler service', 'Lounge access'] }
  ];
  const RATE_PLANS = [
    { id: 'BAR', name: 'Best Available Rate', adjust: 'pct', value: 0, desc: 'Flexible. Free cancellation up to 48 hours before arrival.', active: true },
    { id: 'BB', name: 'Bed & Breakfast', adjust: 'add', value: 200000, desc: 'Includes buffet breakfast at Han River Kitchen.', active: true },
    { id: 'NRF', name: 'Non-refundable', adjust: 'pct', value: -10, desc: 'Prepaid at booking. No refund on cancellation.', active: true },
    { id: 'CORP', name: 'Corporate', adjust: 'pct', value: -15, desc: 'Contracted companies. Billed to company account.', active: true },
    { id: 'LS', name: 'Long Stay (7+ nights)', adjust: 'pct', value: -20, desc: 'Minimum 7 nights. Weekly housekeeping schedule.', active: true },
    { id: 'OTA', name: 'OTA Standard', adjust: 'pct', value: 5, desc: 'Rate loaded to Booking.com, Agoda and Expedia.', active: true }
  ];
  const SUITE_NAMES = ['My Khe', 'Son Tra', 'Hai Van', 'Ba Na', 'Ngu Hanh Son', 'Han River', 'Linh Ung', 'Hoi An', 'Cham Island', 'Tien Sa'];
  const SOURCES = [['Direct', 7], ['Website', 12], ['Phone', 6], ['Walk-in', 4], ['Booking.com', 22], ['Agoda', 20], ['Expedia', 8], ['Travel Agent', 11], ['Corporate', 10]];

  const LAST = [['Nguyen', 30], ['Tran', 11], ['Le', 9], ['Pham', 7], ['Hoang', 4], ['Huynh', 4], ['Phan', 4], ['Vu', 3], ['Vo', 4], ['Dang', 3], ['Bui', 3], ['Do', 3], ['Ho', 3], ['Ngo', 2], ['Duong', 2], ['Ly', 1]];
  const MID_M = ['Van', 'Minh', 'Duc', 'Hoang', 'Quoc', 'Thanh', 'Gia', 'Huu', 'Anh', 'Cong'];
  const MID_F = ['Thi', 'Ngoc', 'Thu', 'Thanh', 'Minh', 'Bao', 'Kim', 'Phuong', 'Hong'];
  const GIV_M = ['An', 'Nam', 'Hung', 'Dung', 'Khoa', 'Long', 'Tuan', 'Phuc', 'Bao', 'Huy', 'Quang', 'Son', 'Tien', 'Vinh', 'Dat', 'Khanh', 'Hieu', 'Trung', 'Thinh', 'Kien'];
  const GIV_F = ['Mai', 'Anh', 'Lan', 'Huong', 'Linh', 'Trang', 'Thao', 'Ha', 'Nhung', 'Vy', 'Yen', 'Chau', 'Hanh', 'Ngan', 'My', 'Tam', 'Nhi', 'Hoa', 'Quyen', 'Diep'];
  const FOREIGN = [
    ['South Korea', 'KR', [['Kim Min-jun', 'M'], ['Lee Seo-yeon', 'F'], ['Park Ji-ho', 'M'], ['Choi Yu-na', 'F'], ['Jung Hae-won', 'F'], ['Kang Dong-hyun', 'M'], ['Yoon Ji-woo', 'F'], ['Han Seung-min', 'M']], '+82 10', 'Seoul, South Korea'],
    ['Japan', 'JP', [['Tanaka Hiroshi', 'M'], ['Sato Yuki', 'F'], ['Suzuki Kenji', 'M'], ['Nakamura Aoi', 'F']], '+81 90', 'Tokyo, Japan'],
    ['Australia', 'AU', [['James Wilson', 'M'], ['Olivia Brown', 'F'], ['Jack Taylor', 'M']], '+61 4', 'Sydney, Australia'],
    ['United States', 'US', [['Michael Johnson', 'M'], ['Emily Davis', 'F'], ['Daniel Miller', 'M']], '+1 415', 'San Francisco, USA'],
    ['France', 'FR', [['Lucas Martin', 'M'], ['Camille Bernard', 'F']], '+33 6', 'Lyon, France'],
    ['Germany', 'DE', [['Jonas Schmidt', 'M'], ['Lena Fischer', 'F']], '+49 151', 'Munich, Germany'],
    ['Singapore', 'SG', [['Tan Wei Ling', 'F'], ['Lim Jun Jie', 'M']], '+65 9', 'Singapore'],
    ['China', 'CN', [['Wang Lei', 'M'], ['Li Na', 'F'], ['Zhang Wei', 'M']], '+86 138', 'Shanghai, China'],
    ['Taiwan', 'TW', [['Chen Yi-ting', 'F']], '+886 9', 'Taipei, Taiwan'],
    ['United Kingdom', 'GB', [['Oliver Smith', 'M'], ['Charlotte Evans', 'F']], '+44 7', 'London, United Kingdom'],
    ['Thailand', 'TH', [['Somchai Srisuk', 'M']], '+66 8', 'Bangkok, Thailand']
  ];
  const ADDR = [
    ['Nguyen Van Linh', 'Hai Chau, Da Nang', '048'], ['Bach Dang', 'Hai Chau, Da Nang', '048'], ['Le Duan', 'Thanh Khe, Da Nang', '048'],
    ['Ngo Quyen', 'Son Tra, Da Nang', '048'], ['Tran Hung Dao', 'Hoan Kiem, Hanoi', '001'], ['Kim Ma', 'Ba Dinh, Hanoi', '001'],
    ['Nguyen Trai', 'Thanh Xuan, Hanoi', '001'], ['Le Loi', 'District 1, Ho Chi Minh City', '079'], ['Hai Ba Trung', 'District 3, Ho Chi Minh City', '079'],
    ['Nguyen Thi Minh Khai', 'District 1, Ho Chi Minh City', '079'], ['Hung Vuong', 'Hue', '046'], ['Tran Phu', 'Nha Trang, Khanh Hoa', '056'],
    ['30 Thang 4', 'Ninh Kieu, Can Tho', '092'], ['Lach Tray', 'Ngo Quyen, Hai Phong', '031'], ['Phan Chu Trinh', 'Hoi An, Quang Nam', '049'],
    ['Quang Trung', 'Quy Nhon, Binh Dinh', '052'], ['Tran Hung Dao', 'Da Lat, Lam Dong', '068']
  ];
  const VN_PREFIX = ['090', '091', '093', '094', '096', '097', '098', '086', '088', '032', '033', '035', '070', '077', '079', '081', '083', '085', '089', '0905', '0935'];
  const PREFS = ['High floor', 'Sea view', 'Non-smoking', 'Extra pillows', 'Twin beds', 'Quiet room', 'Late check-out', 'Vegetarian breakfast', 'Airport pickup', 'Near elevator', 'Feather-free bedding', 'Room away from elevator'];
  const REQUESTS = ['Late arrival around 22:00', 'Baby cot please', 'High floor with sea view', 'Celebrating anniversary, flowers in room', 'Airport pickup from Da Nang International Airport', 'Non-smoking room', 'Twin beds', 'Early check-in if possible', 'Quiet room away from the elevator', 'Honeymoon decoration', 'Extra towels for the beach', 'Vegetarian breakfast'];

  HMS.REF = { SOURCES: SOURCES.map((s) => s[0]), PREFS };

  HMS.seed = function () {
    const R = U.rng(20260928);
    const pick = (a) => a[Math.floor(R() * a.length)];
    const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    const chance = (p) => R() < p;
    const wpick = (pairs) => { const t = U.sum(pairs, (p) => p[1]); let x = R() * t; for (const p of pairs) { x -= p[1]; if (x <= 0) return p[0]; } return pairs[0][0]; };
    const today = U.today();
    const r10k = (n) => Math.round(n / 10000) * 10000;
    const stamp = (d, h, m) => `${d}T${String(h).padStart(2, '0')}:${String(m == null ? ri(0, 59) : m).padStart(2, '0')}`;
    const digits = (n) => Array.from({ length: n }, () => ri(0, 9)).join('');
    const vnPhone = () => { const p = pick(VN_PREFIX); const rest = digits(10 - p.length); const all = p + rest; return `${all.slice(0, 4)} ${all.slice(4, 7)} ${all.slice(7)}`; };
    const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '');

    const settings = {
      hotelName: 'Sunrise Da Nang Hotel', legalName: 'Sunrise Hospitality Joint Stock Company',
      address: '268 Vo Nguyen Giap Street, Son Tra, Da Nang, Vietnam', phone: '0236 3888 999', hotline: '0905 888 999',
      email: 'reservations@sunrisedanang.vn', website: 'www.sunrisedanang.vn', taxId: '0401856237', stars: 4,
      checkInTime: '14:00', checkOutTime: '12:00', currency: 'VND', country: 'Vietnam', timezone: 'Asia/Ho_Chi_Minh',
      language: 'English', dateFormat: 'DD/MM/YYYY', timeFormat: '24h',
      vatRate: 10, serviceCharge: 0, invoiceSymbol: 'C26TSD',
      bankName: 'Vietcombank — Da Nang Branch', bankAccount: '0041 000 123 456', bankHolder: 'CONG TY CP SUNRISE HOSPITALITY',
      paymentMethods: { Cash: true, 'Bank Transfer': true, 'Credit Card': true, 'Debit Card': true, 'E-wallet': true, 'QR Payment': true },
      notif: { arrivals: true, housekeeping: true, maintenance: true, inventory: true, payments: true, reservations: true, email: false },
      requireInspection: true, blockDirtyCheckin: true, allowOverbooking: false, autoLogout: 30
    };
    const branches = [
      { id: 'BR01', name: 'Sunrise Da Nang Hotel', city: 'Da Nang', address: '268 Vo Nguyen Giap Street, Son Tra, Da Nang', rooms: 120, phone: '0236 3888 999', manager: 'Nguyen Van An', status: 'Active' },
      { id: 'BR02', name: 'Sunrise Hoi An Riverside Resort', city: 'Hoi An', address: '45 Cua Dai Road, Hoi An, Quang Nam', rooms: 64, phone: '0235 3912 888', manager: 'Tran Thi Thu Ha', status: 'Active' },
      { id: 'BR03', name: 'Sunrise Nha Trang Beach Hotel', city: 'Nha Trang', address: '112 Tran Phu Street, Nha Trang, Khanh Hoa', rooms: 96, phone: '0258 3527 777', manager: 'Le Quoc Vinh', status: 'Active' },
      { id: 'BR04', name: 'Sunrise Saigon Central', city: 'Ho Chi Minh City', address: '21 Le Thanh Ton, District 1, Ho Chi Minh City', rooms: 80, phone: '028 3822 6666', manager: 'Pham Minh Tuan', status: 'Opening Soon' }
    ];

    /* ---------- Staff ---------- */
    const staffList = [
      ['Le Thanh Hai', 'Management', 'System Administrator', 'Administrator', 'Office'],
      ['Doan Minh Chau', 'Management', 'General Manager', 'General Manager', 'Office'],
      ['Nguyen Van An', 'Front Office', 'Front Office Manager', 'Front Office Manager', 'Morning'],
      ['Pham Thu Trang', 'Front Office', 'Receptionist', 'Receptionist', 'Morning'],
      ['Tran Gia Huy', 'Front Office', 'Receptionist', 'Receptionist', 'Afternoon'],
      ['Ho Ngoc Diep', 'Front Office', 'Receptionist', 'Receptionist', 'Night'],
      ['Bui Quoc Khanh', 'Front Office', 'Concierge', 'Receptionist', 'Afternoon'],
      ['Vo Thi Hoa', 'Housekeeping', 'Housekeeping Supervisor', 'Housekeeper', 'Morning'],
      ['Nguyen Thi Lan', 'Housekeeping', 'Room Attendant', 'Housekeeper', 'Morning'],
      ['Tran Thi Nhung', 'Housekeeping', 'Room Attendant', 'Housekeeper', 'Morning'],
      ['Le Thi Yen', 'Housekeeping', 'Room Attendant', 'Housekeeper', 'Morning'],
      ['Phan Thi Hanh', 'Housekeeping', 'Room Attendant', 'Housekeeper', 'Afternoon'],
      ['Dang Thi My', 'Housekeeping', 'Room Attendant', 'Housekeeper', 'Afternoon'],
      ['Huynh Van Tien', 'Housekeeping', 'Public Area Attendant', 'Housekeeper', 'Morning'],
      ['Ngo Thanh Tam', 'Restaurant', 'F&B Supervisor', 'Cashier', 'Morning'],
      ['Duong Ngoc Vy', 'Restaurant', 'Waitress', 'Cashier', 'Afternoon'],
      ['Ly Minh Phuc', 'Restaurant', 'Bartender', 'Cashier', 'Night'],
      ['Vu Duc Thinh', 'Kitchen', 'Executive Chef', 'General Manager', 'Morning'],
      ['Hoang Van Long', 'Kitchen', 'Sous Chef', 'Receptionist', 'Afternoon'],
      ['Pham Van Dung', 'Maintenance', 'Chief Engineer', 'Maintenance Staff', 'Morning'],
      ['Tran Quang Son', 'Maintenance', 'Technician', 'Maintenance Staff', 'Morning'],
      ['Le Cong Dat', 'Maintenance', 'Technician', 'Maintenance Staff', 'Afternoon'],
      ['Nguyen Huu Kien', 'Maintenance', 'Electrician', 'Maintenance Staff', 'Night'],
      ['Mai Thi Quyen', 'Finance', 'Chief Accountant', 'Accountant', 'Office'],
      ['Do Thanh Ha', 'Finance', 'Accountant', 'Accountant', 'Office'],
      ['Cao Minh Anh', 'Finance', 'Night Auditor', 'Cashier', 'Night'],
      ['Truong Bao Ngan', 'Sales', 'Sales Manager', 'Front Office Manager', 'Office'],
      ['Ha Quoc Bao', 'Sales', 'Sales Executive', 'Receptionist', 'Office']
    ];
    const staff = staffList.map((s, i) => ({
      id: 'EMP' + String(101 + i), name: s[0], department: s[1], position: s[2], role: s[3], shift: s[4],
      phone: vnPhone(), email: slug(s[0]).split('.').reverse().join('.') + '@sunrisedanang.vn',
      status: i === 12 ? 'On Leave' : i === 27 ? 'Inactive' : 'Active', joined: `20${ri(16, 25)}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`
    }));
    const attendants = staff.filter((s) => s.department === 'Housekeeping' && s.status === 'Active').map((s) => s.name);
    const technicians = staff.filter((s) => s.department === 'Maintenance').map((s) => s.name);

    /* ---------- Rooms: 8 floors × 15 ---------- */
    const floorPlan = {
      1: [['STS', 6], ['STD', 9]], 2: [['STD', 15]], 3: [['SUP', 15]], 4: [['SUP', 8], ['DLX', 7]],
      5: [['DLX', 15]], 6: [['DLX', 10], ['FAM', 5]], 7: [['FAM', 8], ['SUI', 7]], 8: [['SUI', 8], ['FAM', 5], ['PRE', 2]]
    };
    const rooms = [];
    let suiteIdx = 0;
    Object.keys(floorPlan).forEach((fl) => {
      let n = 1;
      floorPlan[fl].forEach(([typeId, count]) => {
        for (let i = 0; i < count; i++, n++) {
          const t = ROOM_TYPES.find((x) => x.id === typeId);
          const num = `${fl}${String(n).padStart(2, '0')}`;
          const sea = n <= 8;
          rooms.push({
            id: num, number: num, typeId, floor: Number(fl), building: sea ? 'Ocean Wing' : 'City Wing',
            view: sea ? 'Sea view' : Number(fl) >= 5 ? 'Han River view' : 'City view',
            bed: t.bed, capacity: t.capacity, rate: t.rate + (sea && typeId !== 'PRE' ? 100000 : 0),
            name: typeId === 'SUI' || typeId === 'PRE' ? `${SUITE_NAMES[suiteIdx++ % SUITE_NAMES.length]} ${typeId === 'PRE' ? 'Presidential' : 'Suite'}` : '',
            amenities: t.amenities.slice(), status: 'Available', smoking: false, disabled: false,
            attendant: '', hkPriority: 'Normal', hkNote: '', lastCleaned: ''
          });
        }
      });
    });
    const roomById = (id) => rooms.find((r) => r.id === id);

    /* Rooms taken out of inventory for maintenance (10 total) */
    const BLOCKED = { 405: 'Maintenance', 212: 'Maintenance', 309: 'Maintenance', 511: 'Maintenance', 614: 'Maintenance', 107: 'Maintenance', 715: 'Out of Order', 213: 'Out of Order', 110: 'Out of Service', 813: 'Maintenance' };

    /* ---------- Guests ---------- */
    const guests = [];
    const makeVN = (name, gender) => {
      const a = pick(ADDR);
      const dobY = ri(1962, 2004);
      const cent = dobY >= 2000 ? (gender === 'M' ? 2 : 3) : (gender === 'M' ? 0 : 1);
      return {
        name, gender: gender === 'M' ? 'Male' : 'Female', nationality: 'Vietnam',
        dob: `${dobY}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`,
        phone: vnPhone(), email: `${slug(name).replace(/\./g, '')}${ri(1, 99)}@${pick(['gmail.com', 'gmail.com', 'yahoo.com', 'outlook.com'])}`,
        address: `${ri(3, 420)} ${a[0]} Street, ${a[1]}`, idType: 'CCCD', idNumber: `${a[2]}${cent}${String(dobY).slice(2)}${digits(6)}`
      };
    };
    const fixedVN = [['Nguyen Van An', 'M'], ['Tran Thi Mai', 'F'], ['Le Hoang Nam', 'M'], ['Pham Minh Anh', 'F']];
    fixedVN.forEach(([n, g]) => guests.push(makeVN(n, g)));
    const usedNames = new Set(fixedVN.map((x) => x[0]));
    while (guests.length < 270) {
      if (chance(0.27)) {
        const c = pick(FOREIGN.concat([FOREIGN[0], FOREIGN[0], FOREIGN[0]])); // Korea is Da Nang's largest market
        const [nm, g] = pick(c[2]);
        if (usedNames.has(nm)) continue;
        usedNames.add(nm);
        guests.push({
          name: nm, gender: g === 'M' ? 'Male' : 'Female', nationality: c[0],
          dob: `${ri(1960, 2002)}-${String(ri(1, 12)).padStart(2, '0')}-${String(ri(1, 28)).padStart(2, '0')}`,
          phone: `${c[3]} ${digits(4)} ${digits(4)}`, email: `${slug(nm).replace(/\./g, '')}${ri(1, 99)}@${pick(['gmail.com', 'naver.com', 'outlook.com', 'icloud.com'])}`,
          address: c[4], idType: 'Passport', idNumber: `${c[1] === 'KR' ? 'M' : c[1] === 'US' ? '5' : pick(['E', 'P', 'C', 'X'])}${digits(8)}`
        });
      } else {
        const g = chance(0.5) ? 'M' : 'F';
        const nm = `${wpick(LAST)} ${pick(g === 'M' ? MID_M : MID_F)} ${pick(g === 'M' ? GIV_M : GIV_F)}`;
        if (usedNames.has(nm)) continue;
        usedNames.add(nm);
        guests.push(makeVN(nm, g));
      }
    }
    guests.forEach((g, i) => {
      g.id = 'G' + String(i + 1).padStart(5, '0');
      g.vip = i < 4 ? i % 2 === 0 : chance(0.07);
      g.type = wpick([['Individual', 55], ['Couple', 20], ['Family', 14], ['Corporate', 8], ['Group', 3]]);
      g.preferences = chance(0.55) ? [pick(PREFS), pick(PREFS)].filter((v, j, a) => a.indexOf(v) === j) : [];
      g.notes = chance(0.12) ? pick(['Prefers Vietnamese newspaper in the morning', 'Allergic to peanuts', 'Frequent guest, always requests room on floor 5+', 'Travels with a small dog (approved)', 'Likes green tea set on arrival']) : '';
      g.createdAt = U.addDays(today, -ri(30, 900));
      g.company = g.type === 'Corporate' ? pick(['FPT Software Da Nang', 'Viettel Da Nang', 'Samsung Electronics Vietnam', 'Vietnam Airlines']) : '';
    });

    /* ---------- Corporate / travel agency customers ---------- */
    const customers = [
      ['FPT Software Da Nang', 'Corporate', 'Tran Quoc Bao', 'FPT Complex, Ngu Hanh Son, Da Nang', '0101248141-021', 150000000, 'Net 30'],
      ['Viettel Da Nang', 'Corporate', 'Nguyen Thi Hong', '1 Hoang Van Thu, Hai Chau, Da Nang', '0100109106-015', 120000000, 'Net 30'],
      ['Samsung Electronics Vietnam', 'Corporate', 'Park Sung-ho', 'Yen Phong Industrial Park, Bac Ninh', '2300324649', 200000000, 'Net 45'],
      ['Vietnam Airlines — Central Office', 'Corporate', 'Le Minh Duc', 'Da Nang International Airport, Hai Chau', '0100107518-004', 180000000, 'Net 30'],
      ['Saigontourist Travel Service', 'Travel Agency', 'Phan Thanh Tam', '45 Le Thanh Ton, District 1, Ho Chi Minh City', '0300625210', 90000000, 'Net 15'],
      ['Vietravel Da Nang', 'Travel Agency', 'Vo Thi Kim Chau', '58 Pasteur, Hai Chau, Da Nang', '0300465937-006', 80000000, 'Net 15'],
      ['Hanatour Vietnam', 'Travel Agency', 'Kim Ji-hye', '19 Nguyen Van Linh, Hai Chau, Da Nang', '0313928541', 100000000, 'Net 15'],
      ['Booking.com B.V.', 'Partner', 'Partner Services APAC', 'Herengracht 597, Amsterdam, Netherlands', 'NL805734958B01', 0, 'Monthly commission'],
      ['Agoda Company Pte. Ltd.', 'Partner', 'Market Manager Vietnam', '30 Cecil Street, Singapore', '201006379W', 0, 'Monthly commission'],
      ['Expedia Group', 'Partner', 'Lodging Partner Services', '1111 Expedia Group Way, Seattle, USA', '91-1996083', 0, 'Monthly commission'],
      ['Sun World Ba Na Hills', 'Partner', 'Tran Thi Thu', 'Hoa Ninh, Hoa Vang, Da Nang', '0401463722', 0, 'Net 30'],
      ['Le Hoang Nam', 'Individual', 'Le Hoang Nam', '120 Nguyen Van Linh, Hai Chau, Da Nang', '', 20000000, 'On departure']
    ].map((c, i) => ({
      id: 'CUS' + String(i + 1).padStart(3, '0'), name: c[0], type: c[1], contact: c[2], address: c[3], taxId: c[4],
      creditLimit: c[5], terms: c[6], phone: c[1] === 'Partner' && i >= 7 && i <= 9 ? '+65 3158 0000' : vnPhone(),
      email: c[1] === 'Individual' ? 'lehoangnam@gmail.com' : `booking@${slug(c[0].split(' ')[0])}.vn`,
      contract: c[1] === 'Individual' ? '' : `${c[1] === 'Corporate' ? 'CORP' : c[1] === 'Travel Agency' ? 'TA' : 'PTN'}-2026-${String(10 + i).padStart(3, '0')}`,
      contractEnd: c[1] === 'Individual' ? '' : `2026-12-31`, status: 'Active', notes: ''
    }));
    const custBy = (type) => customers.filter((c) => c.type === type);

    /* ---------- Reservations ---------- */
    const reservations = [];
    const charges = [];
    const payments = [];
    const invoices = [];
    let resSeq = 0, payRef = 0;
    const planRate = (rate, planId) => {
      const p = RATE_PLANS.find((x) => x.id === planId);
      return p.adjust === 'add' ? rate + p.value : r10k(rate * (1 + p.value / 100));
    };
    const repeatPool = guests.slice(0, 50);
    const busy = {};
    function addRes(room, ci, co, extra = {}) {
      const nights = U.diffDays(ci, co);
      if (nights < 1) return null;
      let source = wpick(SOURCES);
      if (source === 'Walk-in' && ci > today) source = 'Phone';
      let plan = source === 'Corporate' ? 'CORP' : ['Booking.com', 'Agoda', 'Expedia'].includes(source) ? (chance(0.35) ? 'NRF' : 'OTA') : nights >= 7 ? 'LS' : chance(0.45) ? 'BB' : 'BAR';
      if (extra.plan) plan = extra.plan;
      let g = extra.guestId ? guests.find((x) => x.id === extra.guestId) : null;
      for (let k = 0; !g && k < 12; k++) {
        const c = chance(0.3) ? pick(repeatPool) : pick(guests);
        if (!(busy[c.id] || []).some((b) => ci < b[1] && b[0] < co)) g = c;
      }
      if (!g) g = pick(guests);
      (busy[g.id] = busy[g.id] || []).push([ci, co]);
      const t = ROOM_TYPES.find((x) => x.id === room.typeId);
      const adults = extra.adults || Math.max(1, Math.min(t.capacity, ri(1, t.capacity) + (g.type === 'Couple' ? 1 : 0)));
      const children = t.capacity >= 3 && (g.type === 'Family' || chance(0.2)) ? ri(1, 2) : 0;
      const customer = source === 'Corporate' ? pick(custBy('Corporate')) : source === 'Travel Agent' ? pick(custBy('Travel Agency')) : source === 'Booking.com' ? customers[7] : source === 'Agoda' ? customers[8] : source === 'Expedia' ? customers[9] : null;
      let created = U.addDays(ci, -ri(0, source === 'Walk-in' ? 0 : 45));
      if (created > today || (created === today && ci > today && chance(0.85))) created = U.addDays(today, -ri(1, 25));
      const r = {
        id: 'RSV-' + String(26000 + ++resSeq), guestId: g.id, roomId: room.id, roomTypeId: room.typeId,
        checkIn: ci, checkOut: co, adults, children: Math.min(children, 2), source: extra.source || source, ratePlan: plan,
        rate: planRate(room.rate, plan), status: 'Confirmed', customerId: customer ? customer.id : '',
        specialRequests: chance(0.28) ? pick(REQUESTS) : '', notes: '', discount: 0, promoCode: '',
        createdAt: stamp(created > today ? today : created, ri(7, 22)), groupId: '', otaRef: customer && customer.type === 'Partner' ? `${source.slice(0, 2).toUpperCase()}${digits(9)}` : '',
        eta: `${ri(13, 22)}:${pick(['00', '30'])}`
      };
      Object.assign(r, extra.patch || {});
      if (chance(0.09)) { r.promoCode = pick(['EARLY30', 'WEEKEND10', 'WELCOME500']); r.discount = r.promoCode === 'WELCOME500' ? 500000 : r10k(r.rate * nights * (r.promoCode === 'EARLY30' ? 0.15 : 0.1)); }
      reservations.push(r);
      return r;
    }
    function fillStays(room, from, to) {
      let d = from;
      while (d < to) {
        const ahead = U.diffDays(today, d);
        const gap = ahead > 10 ? (chance(0.55) ? ri(1, 6) : 0) : ahead > 3 ? (chance(0.45) ? ri(1, 4) : 0) : ahead >= 0 ? (chance(0.42) ? ri(1, 3) : 0) : chance(0.3) ? ri(1, 3) : 0;
        const ci = U.addDays(d, gap);
        let co = U.addDays(ci, wpick([[1, 16], [2, 26], [3, 24], [4, 14], [5, 9], [7, 6], [10, 2]]));
        if (ci >= to) break;
        if (co > to) co = to;
        addRes(room, ci, co);
        d = co;
      }
    }
    const start = U.addDays(today, -28), end = U.addDays(today, 35);
    const GROUP_ROOMS = ['301', '302', '303', '304', '305', '306'];
    rooms.forEach((room) => {
      if (BLOCKED[room.id]) {
        fillStays(room, start, U.addDays(today, -3));
        fillStays(room, U.addDays(today, 6), end);
      } else if (GROUP_ROOMS.includes(room.id)) {
        fillStays(room, start, today);
        addRes(room, today, U.addDays(today, 3), { source: 'Corporate', plan: 'CORP', guestId: guests[20 + GROUP_ROOMS.indexOf(room.id)].id, patch: { groupId: 'GRP-FPT-01', groupName: 'FPT Software — Tech Summit', customerId: 'CUS001', specialRequests: 'Group: FPT Software Tech Summit. Master bill to company.' } });
        fillStays(room, U.addDays(today, 3), end);
      } else {
        fillStays(room, start, end);
      }
    });

    /* Status by timeline position */
    const inHouseRoom = {};
    reservations.forEach((r) => {
      if (r.checkOut < today) {
        r.status = chance(0.06) ? 'Cancelled' : chance(0.03) ? 'No-show' : 'Checked-out';
      } else if (r.checkOut === today) {
        r.status = chance(0.42) ? 'Checked-out' : 'Checked-in';
      } else if (r.checkIn < today) {
        r.status = 'Checked-in';
      } else if (r.checkIn === today) {
        r.status = r.groupId ? 'Confirmed' : chance(0.38) ? 'Checked-in' : chance(0.9) ? 'Confirmed' : 'Pending';
      } else {
        r.status = chance(0.05) ? 'Cancelled' : chance(0.07) ? 'Pending' : 'Confirmed';
      }
      if (r.status === 'Checked-in') {
        r.checkedInAt = stamp(r.checkIn, ri(13, 21));
        inHouseRoom[r.roomId] = r;
      }
      if (r.status === 'Checked-out') { r.checkedInAt = stamp(r.checkIn, ri(13, 21)); r.checkedOutAt = stamp(r.checkOut, ri(7, 12)); }
      if (r.status === 'Cancelled') r.cancelReason = pick(['Change of travel plans', 'Flight cancelled', 'Booked elsewhere', 'Illness']);
    });

    /* ---------- Folio charges on stays that have happened ---------- */
    const minibarItems = [['Aquafina water 500ml', 25000], ['Coca-Cola 330ml', 35000], ['Larue beer 330ml', 45000], ['Tiger beer 330ml', 55000], ['Roasted cashew nuts', 85000], ['Dried mango', 65000], ['Pringles', 75000]];
    const addCharge = (r, date, category, description, qty, unitPrice, time) => {
      charges.push({ id: 'CHG' + String(charges.length + 1).padStart(6, '0'), reservationId: r.id, date, time: time || `${String(ri(7, 22)).padStart(2, '0')}:${String(ri(0, 59)).padStart(2, '0')}`, category, description, qty, unitPrice, amount: qty * unitPrice, postedBy: pick(['Pham Thu Trang', 'Tran Gia Huy', 'Ngo Thanh Tam', 'Duong Ngoc Vy']) });
    };
    reservations.forEach((r) => {
      if (!['Checked-in', 'Checked-out'].includes(r.status)) return;
      const lastDay = r.status === 'Checked-in' && r.checkOut > today ? today : U.addDays(r.checkOut, -1);
      for (let d = r.checkIn; d <= lastDay; d = U.addDays(d, 1)) {
        if (chance(0.28)) addCharge(r, d, 'Restaurant', pick(['Dinner — Han River Kitchen', 'Lunch — Han River Kitchen', 'Room service', 'Sky Lounge Bar']), 1, r10k(ri(12, 95) * 10000));
        if (chance(0.16)) { const m = pick(minibarItems); addCharge(r, d, 'Minibar', m[0], ri(1, 3), m[1]); }
        if (chance(0.08)) addCharge(r, d, 'Laundry', 'Laundry — regular', ri(2, 5), 50000);
        if (chance(0.05)) addCharge(r, d, 'Spa', pick(['Aroma massage 60 min', 'Traditional Vietnamese massage 90 min']), 1, pick([650000, 850000]));
      }
      if (chance(0.18)) addCharge(r, r.checkIn, 'Transport', 'Airport transfer — sedan', 1, 350000);
      if (chance(0.06)) addCharge(r, r.checkIn, 'Tours', 'Ba Na Hills day tour', r.adults, 1450000);
    });

    const METHODS = [['Credit Card', 28], ['Cash', 18], ['Bank Transfer', 16], ['QR Payment', 22], ['E-wallet', 9], ['Debit Card', 7]];
    const refFor = (m) => m === 'Cash' ? '' : m === 'Bank Transfer' ? `FT${digits(12)}` : m === 'QR Payment' ? `VNPAY${digits(10)}` : m === 'E-wallet' ? `${pick(['MOMO', 'ZALOPAY', 'SHOPEEPAY'])}${digits(9)}` : `**** ${digits(4)} · APP ${digits(6)}`;
    const addPayment = (r, amount, date, type, method, status = 'Paid', invoiceId = '') => {
      payments.push({ id: 'PAY-' + String(50000 + ++payRef), reservationId: r ? r.id : '', invoiceId, guestId: r ? r.guestId : '', amount, method, date: stamp(date, ri(8, 21)), reference: refFor(method), status, type, notes: type === 'Deposit' ? 'Advance deposit' : '', cashier: pick(['Pham Thu Trang', 'Tran Gia Huy', 'Ho Ngoc Diep', 'Cao Minh Anh']) });
    };

    /* Folio math (same rules used at checkout — see hotel.js) */
    const vat = settings.vatRate / 100;
    const folioTotal = (r) => {
      const n = U.diffDays(r.checkIn, r.checkOut);
      const extras = U.sum(charges.filter((c) => c.reservationId === r.id), (c) => c.amount);
      const subtotal = r.rate * n + extras;
      return Math.round(subtotal + subtotal * vat - (r.discount || 0));
    };
    let invSeq = 0;
    reservations.forEach((r) => {
      const n = U.diffDays(r.checkIn, r.checkOut);
      if (r.status === 'Checked-out') {
        const total = folioTotal(r);
        let paid = 0;
        if (chance(0.55)) { const dep = Math.min(total, r10k(r.rate)); addPayment(r, dep, r.checkIn, 'Deposit', wpick(METHODS)); paid = dep; }
        const invId = `INV-${today.slice(0, 4)}-${String(++invSeq + 1200).padStart(6, '0')}`;
        const cityLedger = r.customerId && customers.find((c) => c.id === r.customerId).type === 'Corporate' && chance(0.35);
        addPayment(r, total - paid, r.checkOut, 'Payment', cityLedger ? 'City Ledger' : wpick(METHODS), cityLedger ? 'Pending' : 'Paid', invId);
        const subtotal = Math.round(total / (1 + vat) + (r.discount || 0) / (1 + vat));
        invoices.push({ id: invId, reservationId: r.id, guestId: r.guestId, customerId: r.customerId, date: r.checkOut, nights: n, total, status: cityLedger ? 'Unpaid' : 'Paid', buyerCompany: cityLedger ? customers.find((c) => c.id === r.customerId).name : '', buyerTaxId: cityLedger ? customers.find((c) => c.id === r.customerId).taxId : '', subtotal, dueDate: cityLedger ? U.addDays(r.checkOut, 30) : r.checkOut });
        payments.filter((p) => p.reservationId === r.id).forEach((p) => { p.invoiceId = invId; });
      } else if (r.status === 'Checked-in') {
        const dep = chance(0.3) ? 1000000 : r10k(r.rate * Math.min(n, 2));
        if (!r.groupId) addPayment(r, dep, r.checkIn, 'Deposit', wpick(METHODS));
      } else if (['Confirmed', 'Pending'].includes(r.status) && r.checkIn >= today) {
        if (r.ratePlan === 'NRF') addPayment(r, folioTotal(r), r.createdAt.slice(0, 10), 'Payment', 'Credit Card');
        else if (r.status === 'Confirmed' && chance(0.4)) addPayment(r, r10k(r.rate), r.createdAt.slice(0, 10), 'Deposit', wpick([['Bank Transfer', 5], ['QR Payment', 4], ['Credit Card', 3]]));
      }
    });
    /* A few refunds and pending transfers for realism */
    /* A room can hold only one in-house stay: a same-day arrival already checked in means the previous guest left */
    Object.values(U.groupBy(reservations, (r) => r.roomId)).forEach((list) => {
      const dep = list.find((r) => r.checkOut === today && r.status === 'Checked-in');
      const arr = list.find((r) => r.checkIn === today && r.status === 'Checked-in');
      if (dep && arr) { dep.status = 'Checked-out'; dep.checkedOutAt = stamp(today, ri(7, 11)); inHouseRoom[arr.roomId] = arr; }
    });
    payments.filter((p) => p.type === 'Deposit').slice(3, 6).forEach((p) => {
      const r = reservations.find((x) => x.id === p.reservationId);
      if (r && r.status === 'Cancelled') { addPayment(r, -p.amount, r.checkIn, 'Refund', p.method, 'Refunded'); }
    });
    reservations.filter((r) => r.status === 'Cancelled').slice(0, 3).forEach((r) => { addPayment(r, 500000, U.addDays(r.checkIn, -5), 'Deposit', 'Bank Transfer'); addPayment(r, -500000, U.addDays(r.checkIn, -2), 'Refund', 'Bank Transfer', 'Refunded'); });
    reservations.filter((r) => r.status === 'Confirmed' && r.checkIn > today).slice(0, 4).forEach((r) => addPayment(r, r10k(r.rate), today, 'Deposit', 'Bank Transfer', 'Pending'));

    /* ---------- Room statuses from the timeline ---------- */
    const arrivalsToday = new Set(reservations.filter((r) => r.checkIn === today && ['Confirmed', 'Pending'].includes(r.status)).map((r) => r.roomId));
    const departedToday = new Set(reservations.filter((r) => r.checkOut === today && r.status === 'Checked-out').map((r) => r.roomId));
    rooms.forEach((room, i) => {
      if (BLOCKED[room.id]) { room.status = BLOCKED[room.id]; return; }
      if (inHouseRoom[room.id]) { room.status = 'Occupied'; room.lastCleaned = stamp(U.addDays(today, -1), ri(9, 15)); return; }
      if (departedToday.has(room.id)) { room.status = wpick([['Dirty', 5], ['Cleaning', 3], ['Clean', 1], ['Inspected', 2]]); }
      else if (arrivalsToday.has(room.id)) room.status = wpick([['Reserved', 8], ['Inspected', 1]]);
      else room.status = wpick([['Available', 12], ['Inspected', 2], ['Dirty', 2], ['Cleaning', 1]]);
      if (arrivalsToday.has(room.id) && ['Dirty', 'Cleaning'].includes(room.status)) room.hkPriority = 'High';
      if (['Dirty', 'Cleaning', 'Clean'].includes(room.status)) room.attendant = attendants[(room.floor + i) % attendants.length];
      if (room.status === 'Cleaning') room.hkStarted = stamp(today, ri(8, 11));
      room.lastCleaned = stamp(U.addDays(today, room.status === 'Dirty' ? -1 : 0), ri(8, 14));
    });
    rooms.find((r) => r.id === '512').hkNote = 'Guest reported slow drain in bathroom — check before release';
    rooms.find((r) => r.id === '801').hkNote = 'VIP amenity: fruit basket + welcome card';

    /* ---------- Maintenance ---------- */
    const mt = [
      ['405', 'Room', 'Air conditioner not cooling', 'High', 'In Progress', 'Tran Quang Son', 1800000, 'Compressor gas refill and filter cleaning.'],
      ['212', 'Room', 'Bathroom water leak under sink', 'High', 'Waiting Parts', 'Le Cong Dat', 650000, 'Waiting for replacement siphon (Inax).'],
      ['309', 'Room', 'Repaint wall after water damage', 'Medium', 'Assigned', 'Le Cong Dat', 2400000, ''],
      ['511', 'Room', 'Smart TV no signal', 'Medium', 'In Progress', 'Nguyen Huu Kien', 0, 'Checking HDMI and IPTV box.'],
      ['614', 'Room', 'Balcony door lock broken', 'High', 'Open', '', 0, 'Security risk — keep room closed.'],
      ['107', 'Room', 'Mattress replacement', 'Low', 'Waiting Parts', 'Pham Van Dung', 7500000, 'Everon mattress ordered.'],
      ['715', 'Room', 'Ceiling water stain — roof inspection', 'Urgent', 'In Progress', 'Pham Van Dung', 12000000, 'Out of order until roof waterproofing done.'],
      ['213', 'Room', 'Full bathroom renovation', 'Medium', 'In Progress', 'Pham Van Dung', 45000000, 'Planned renovation, 10 days.'],
      ['813', 'Room', 'Jacuzzi pump noise', 'Medium', 'Assigned', 'Tran Quang Son', 0, ''],
      ['110', 'Room', 'Used as storage for renovation materials', 'Low', 'Open', '', 0, 'Out of service until renovation ends.'],
      ['', 'Equipment', 'Elevator 2 — annual safety inspection', 'High', 'Assigned', 'Pham Van Dung', 8500000, 'Contractor: Thang May Da Nang.'],
      ['', 'Equipment', 'Pool filtration pump service', 'Medium', 'Completed', 'Tran Quang Son', 1500000, ''],
      ['', 'Preventive', 'Generator monthly load test', 'Low', 'Completed', 'Nguyen Huu Kien', 0, ''],
      ['', 'Preventive', 'Kitchen exhaust hood deep clean', 'Medium', 'Open', '', 3200000, 'Quarterly — schedule after dinner service.'],
      ['', 'Equipment', 'Wi-Fi access point floor 6 unstable', 'Medium', 'In Progress', 'Nguyen Huu Kien', 2100000, ''],
      ['', 'Preventive', 'Fire alarm system quarterly test', 'High', 'Completed', 'Pham Van Dung', 0, 'PCCC inspection passed.'],
      ['502', 'Room', 'Shower head replacement', 'Low', 'Completed', 'Le Cong Dat', 450000, ''],
      ['318', 'Room', 'Key card reader battery low', 'Low', 'Cancelled', '', 0, 'Duplicate request.']
    ].map((m, i) => ({
      id: 'MT-' + String(1041 + i), roomId: m[0], type: m[1], title: m[2], priority: m[3], status: m[4], technician: m[5],
      cost: m[6], notes: m[7], reportedBy: pick(['Vo Thi Hoa', 'Pham Thu Trang', 'Nguyen Van An', 'Nguyen Thi Lan']),
      reportedAt: stamp(U.addDays(today, -ri(0, 9)), ri(7, 20)), dueDate: U.addDays(today, ri(0, 6)), outOfOrder: !!BLOCKED[m[0]],
      completedAt: m[4] === 'Completed' ? stamp(U.addDays(today, -ri(0, 3)), ri(9, 17)) : ''
    }));

    /* ---------- Services catalog ---------- */
    const services = [
      ['Airport transfer — sedan', 'Transport', 350000, 'per trip', 'Available', 'Da Nang International Airport ⇄ hotel, up to 3 guests.'],
      ['Airport transfer — 7-seater', 'Transport', 480000, 'per trip', 'Available', 'For families or groups up to 6 guests with luggage.'],
      ['Hoi An shuttle', 'Transport', 150000, 'per person', 'Available', 'Daily 09:00 and 15:00, return 21:00.'],
      ['Car rental with driver', 'Transport', 1800000, 'per day', 'On request', '10 hours, 150 km included.'],
      ['Laundry — regular', 'Laundry', 50000, 'per kg', 'Available', 'Collected before 10:00, returned by 18:00.'],
      ['Laundry — express', 'Laundry', 90000, 'per kg', 'Available', 'Returned within 4 hours.'],
      ['Dry cleaning', 'Laundry', 120000, 'per item', 'Available', 'Suits, dresses, áo dài.'],
      ['Aroma massage 60 min', 'Spa', 650000, 'per session', 'Available', 'Sen Spa, level 3.'],
      ['Traditional Vietnamese massage 90 min', 'Spa', 850000, 'per session', 'Available', 'Hot herbal compress included.'],
      ['Foot reflexology 45 min', 'Spa', 380000, 'per session', 'Available', ''],
      ['Extra bed', 'Room', 450000, 'per night', 'Available', 'Includes breakfast for one.'],
      ['Baby cot', 'Room', 0, 'per stay', 'Available', 'Free on request.'],
      ['Early check-in (before 11:00)', 'Room', 500000, 'per stay', 'On request', 'Subject to availability.'],
      ['Late check-out (until 18:00)', 'Room', 600000, 'per stay', 'On request', 'Subject to availability.'],
      ['Breakfast buffet', 'F&B', 250000, 'per person', 'Available', '06:00–10:00 at Han River Kitchen.'],
      ['Room service delivery', 'F&B', 30000, 'per order', 'Available', '24 hours.'],
      ['Bicycle rental', 'Leisure', 100000, 'per day', 'Available', ''],
      ['Motorbike rental', 'Leisure', 180000, 'per day', 'Available', 'Valid driving licence required.'],
      ['Ba Na Hills day tour', 'Tours', 1450000, 'per person', 'Available', 'Cable car ticket, lunch buffet, transfer.'],
      ['Marble Mountains & Hoi An tour', 'Tours', 890000, 'per person', 'Available', 'Half-day, English-speaking guide.'],
      ['Meeting room — half day', 'Events', 3500000, 'per session', 'Unavailable', 'Under renovation until next month.']
    ].map((s, i) => ({ id: 'SVC' + String(i + 1).padStart(3, '0'), name: s[0], category: s[1], price: s[2], unit: s[3], availability: s[4], description: s[5], tax: 10 }));

    /* ---------- Restaurant ---------- */
    const menu = [
      ['Mi Quang (Quang-style noodles)', 'Vietnamese', 95000], ['Bun cha ca Da Nang', 'Vietnamese', 85000], ['Banh xeo with fresh herbs', 'Vietnamese', 90000],
      ['Pho bo (beef pho)', 'Vietnamese', 95000], ['Cao lau Hoi An', 'Vietnamese', 90000], ['Com ga Hoi An (chicken rice)', 'Vietnamese', 85000],
      ['Goi cuon (fresh spring rolls)', 'Starters', 75000], ['Nem ran (fried spring rolls)', 'Starters', 80000], ['Green papaya salad', 'Starters', 85000],
      ['Seafood fried rice', 'Mains', 145000], ['Grilled squid with chili salt', 'Mains', 220000], ['Lobster set (Cham Island)', 'Mains', 890000],
      ['Club sandwich', 'International', 160000], ['Caesar salad', 'International', 140000], ['Beef burger', 'International', 190000], ['Spaghetti carbonara', 'International', 175000],
      ['Che ba mau (three-colour dessert)', 'Desserts', 55000], ['Mango sticky rice', 'Desserts', 70000], ['Caramel flan', 'Desserts', 45000],
      ['Ca phe sua da (iced milk coffee)', 'Drinks', 55000], ['Coconut water', 'Drinks', 60000], ['Fresh lime juice', 'Drinks', 50000], ['Lotus tea (pot)', 'Drinks', 80000],
      ['Larue beer', 'Beer & Wine', 45000], ['Tiger beer', 'Beer & Wine', 55000], ['Dalat red wine (glass)', 'Beer & Wine', 140000], ['Mojito', 'Beer & Wine', 150000]
    ].map((m, i) => ({ id: 'MNU' + String(i + 1).padStart(3, '0'), name: m[0], category: m[1], price: m[2], available: i !== 11 || chance(0.5) }));
    const tables = Array.from({ length: 16 }, (_, i) => ({ id: 'T' + String(i + 1).padStart(2, '0'), name: `Table ${i + 1}`, area: i < 8 ? 'Indoor' : i < 13 ? 'Terrace' : 'Bar', seats: i < 8 ? (i % 3 === 0 ? 6 : 4) : i < 13 ? 4 : 2 }));
    const orders = [];
    const inHouseList = reservations.filter((r) => r.status === 'Checked-in');
    const ORDER_ST = ['New', 'Preparing', 'Preparing', 'Ready', 'Served', 'Served', 'Paid', 'Paid', 'Paid', 'Paid', 'Paid', 'Cancelled'];
    for (let i = 0; i < 18; i++) {
      const status = ORDER_ST[i % ORDER_ST.length];
      const toRoom = chance(0.35) && inHouseList.length;
      const res = toRoom ? pick(inHouseList) : null;
      const items = Array.from({ length: ri(1, 4) }, () => { const m = pick(menu); return { menuId: m.id, name: m.name, price: m.price, qty: ri(1, 3) }; });
      const total = U.sum(items, (x) => x.price * x.qty);
      const active = ['New', 'Preparing', 'Ready', 'Served'].includes(status);
      const o = {
        id: 'ORD-' + String(8801 + i), tableId: toRoom && chance(0.5) ? '' : tables[i % tables.length].id, roomId: res ? res.roomId : '', reservationId: res ? res.id : '',
        items, status, createdAt: stamp(active ? today : U.addDays(today, -ri(0, 2)), active ? ri(11, 13) : ri(7, 21)), waiter: pick(['Duong Ngoc Vy', 'Ngo Thanh Tam', 'Ly Minh Phuc']),
        payment: status === 'Paid' ? (res ? 'Room charge' : pick(['Cash', 'QR Payment', 'Credit Card'])) : '', total, outlet: chance(0.75) ? 'Han River Kitchen' : 'Sky Lounge Bar', guests: ri(1, 4)
      };
      if (status === 'Paid' && res) {
        o.chargeId = 'CHG' + String(charges.length + 1).padStart(6, '0');
        addCharge(res, o.createdAt.slice(0, 10), 'Restaurant', `${o.outlet} · ${o.id}`, 1, total, o.createdAt.slice(11, 16));
      }
      if (status === 'Paid') o.paidAt = o.createdAt;
      orders.push(o);
    }

    /* ---------- Inventory ---------- */
    const inv = [
      ['Bath towel', 'Linen', 'pcs', 640, 400, 95000], ['Hand towel', 'Linen', 'pcs', 520, 300, 45000], ['Bed sheet — king', 'Linen', 'pcs', 310, 240, 320000],
      ['Bed sheet — single', 'Linen', 'pcs', 96, 60, 210000], ['Pillowcase', 'Linen', 'pcs', 780, 500, 60000], ['Bathrobe', 'Linen', 'pcs', 118, 120, 380000],
      ['Shampoo 30ml', 'Guest amenities', 'bottle', 1450, 800, 6500], ['Body wash 30ml', 'Guest amenities', 'bottle', 1320, 800, 6500], ['Soap bar 30g', 'Guest amenities', 'pcs', 980, 600, 3500],
      ['Dental kit', 'Guest amenities', 'set', 410, 600, 5000], ['Slippers', 'Guest amenities', 'pair', 690, 400, 12000],
      ['Bottled water Lavie 500ml', 'Beverages', 'bottle', 180, 600, 4200], ['Aquafina water 500ml', 'Minibar', 'bottle', 540, 300, 5000],
      ['Coca-Cola 330ml', 'Minibar', 'can', 260, 200, 9000], ['Larue beer 330ml', 'Minibar', 'can', 310, 240, 13000], ['Tiger beer 330ml', 'Minibar', 'can', 150, 200, 16000],
      ['Roasted cashew nuts', 'Minibar', 'pack', 88, 120, 38000], ['Dried mango', 'Minibar', 'pack', 140, 100, 26000], ['Pringles 110g', 'Minibar', 'can', 64, 60, 32000],
      ['Floor cleaner 4L', 'Cleaning supplies', 'can', 26, 20, 185000], ['Glass cleaner 5L', 'Cleaning supplies', 'can', 8, 10, 160000], ['Disinfectant 5L', 'Cleaning supplies', 'can', 14, 12, 240000], ['Trash bags (roll)', 'Cleaning supplies', 'roll', 220, 150, 18000],
      ['ST25 rice', 'Restaurant ingredients', 'kg', 180, 100, 32000], ['Fresh rice noodles', 'Restaurant ingredients', 'kg', 24, 30, 18000], ['Nam O fish sauce', 'Restaurant ingredients', 'litre', 40, 20, 95000],
      ['Tiger prawns', 'Restaurant ingredients', 'kg', 18, 15, 380000], ['Squid', 'Restaurant ingredients', 'kg', 9, 12, 260000], ['Pork belly', 'Restaurant ingredients', 'kg', 22, 15, 145000],
      ['Arabica coffee beans', 'Restaurant ingredients', 'kg', 16, 10, 420000], ['Chicken eggs (tray 30)', 'Restaurant ingredients', 'tray', 28, 20, 95000],
      ['A4 paper (ream)', 'Office supplies', 'ream', 36, 20, 72000], ['Receipt paper roll', 'Office supplies', 'roll', 45, 40, 15000], ['RFID key cards', 'Office supplies', 'pcs', 180, 200, 18000], ['Printer toner', 'Office supplies', 'pcs', 3, 4, 1250000]
    ].map((x, i) => ({ id: 'SKU' + String(1001 + i), name: x[0], category: x[1], unit: x[2], stock: x[3], min: x[4], cost: x[5], location: ['Linen', 'Guest amenities', 'Cleaning supplies'].includes(x[1]) ? 'Housekeeping store B1' : x[1] === 'Restaurant ingredients' ? 'Kitchen cold store' : x[1] === 'Office supplies' ? 'Front office store' : 'F&B store B1', supplierId: '' }));
    const suppliers = [
      ['Hoa Phat Linen Co., Ltd.', 'Nguyen Thi Thanh', '52 Dien Bien Phu, Thanh Khe, Da Nang', '0401234876', 'Towels, bed linen, bathrobes', 'Linen'],
      ['Da Nang Amenities Trading', 'Le Van Hung', '18 Hoang Dieu, Hai Chau, Da Nang', '0402019384', 'Shampoo, soap, dental kits, slippers', 'Guest amenities'],
      ['La Vie Central Distributor', 'Tran Minh Khoa', 'Hoa Khanh Industrial Park, Lien Chieu, Da Nang', '0400587213', 'Bottled water', 'Beverages'],
      ['Han Market Seafood Supply', 'Vo Thi Be', '119 Tran Phu, Hai Chau, Da Nang', '0401776512', 'Prawns, squid, fish, lobster', 'Restaurant ingredients'],
      ['Mien Trung Fresh Produce', 'Ho Van Nam', '76 Ton Duc Thang, Lien Chieu, Da Nang', '0402345671', 'Vegetables, herbs, rice noodles', 'Restaurant ingredients'],
      ['Sabeco Central — Beverage', 'Bui Anh Tuan', '5 Nguyen Tri Phuong, Thanh Khe, Da Nang', '0300583659-011', 'Beer, soft drinks', 'Minibar'],
      ['Unilever Professional Vietnam', 'Pham Thi Ngoc', '156 Nguyen Luong Bang, Lien Chieu, Da Nang', '0300762150-005', 'Cleaning chemicals, trash bags', 'Cleaning supplies'],
      ['Thien Long Stationery Da Nang', 'Duong Van Phu', '240 Hung Vuong, Hai Chau, Da Nang', '0301464830-012', 'Paper, toner, key cards', 'Office supplies'],
      ['Vinh Phat Engineering', 'Nguyen Van Vinh', '33 Le Van Hien, Ngu Hanh Son, Da Nang', '0401992755', 'HVAC parts, plumbing, electrical', 'Maintenance']
    ].map((s, i) => ({ id: 'SUP' + String(i + 1).padStart(3, '0'), name: s[0], contact: s[1], address: s[2], taxId: s[3], products: s[4], category: s[5], phone: vnPhone(), email: `sales@${slug(s[0].split(' ').slice(0, 2).join(''))}.vn`, terms: pick(['Net 15', 'Net 30', 'COD']), status: 'Active' }));
    inv.forEach((it) => { const s = suppliers.find((x) => x.category === it.category) || suppliers[1]; it.supplierId = s.id; });
    const purchases = [];
    suppliers.forEach((s) => {
      for (let k = 0; k < ri(2, 5); k++) {
        const d = U.addDays(today, -ri(1, 60));
        const amount = r10k(ri(8, 180) * 100000);
        const status = U.diffDays(d, today) > 30 ? 'Paid' : wpick([['Paid', 5], ['Unpaid', 3], ['Partially Paid', 1]]);
        purchases.push({ id: 'PO-' + String(3301 + purchases.length), supplierId: s.id, date: d, amount, paid: status === 'Paid' ? amount : status === 'Partially Paid' ? r10k(amount / 2) : 0, status, dueDate: U.addDays(d, 30), items: s.products });
      }
    });
    const movements = [];
    inv.slice(0, 30).forEach((it, i) => {
      if (i % 3 === 0) movements.push({ id: 'MV' + String(movements.length + 1).padStart(5, '0'), itemId: it.id, type: 'Stock in', qty: ri(20, 200), date: stamp(U.addDays(today, -ri(0, 10)), ri(8, 16)), note: 'Delivery from supplier', by: 'Vo Thi Hoa' });
      if (i % 2 === 0) movements.push({ id: 'MV' + String(movements.length + 1).padStart(5, '0'), itemId: it.id, type: 'Stock out', qty: ri(5, 60), date: stamp(U.addDays(today, -ri(0, 5)), ri(8, 16)), note: pick(['Floor 3–5 room replenishment', 'Kitchen daily issue', 'Minibar refill', 'Front office']), by: pick(['Nguyen Thi Lan', 'Vu Duc Thinh', 'Pham Thu Trang']) });
    });
    movements.push({ id: 'MV' + String(movements.length + 1).padStart(5, '0'), itemId: inv[0].id, type: 'Transfer', qty: 40, date: stamp(U.addDays(today, -2), 10), note: 'Housekeeping store → Pool area', by: 'Vo Thi Hoa' });
    movements.push({ id: 'MV' + String(movements.length + 1).padStart(5, '0'), itemId: inv[5].id, type: 'Adjustment', qty: -4, date: stamp(U.addDays(today, -1), 17), note: 'Stock count: damaged bathrobes', by: 'Mai Thi Quyen' });

    /* ---------- Promotions ---------- */
    const promotions = [
      ['Early Bird 30', 'EARLY30', 'Early booking', 'percent', 15, -60, 120, ['SUP', 'DLX', 'FAM', 'SUI'], 2, 2000000, 'Book at least 30 days before arrival.'],
      ['Stay 4, Pay 3', 'LONGSTAY', 'Long stay', 'percent', 25, -30, 90, ['STD', 'SUP', 'DLX'], 4, 3000000, ''],
      ['Weekend Escape', 'WEEKEND10', 'Weekend promotion', 'percent', 10, -20, 60, [], 1, 1000000, 'Friday to Sunday nights.'],
      ['Welcome Back', 'WELCOME500', 'Fixed discount', 'fixed', 500000, -90, 180, [], 2, 500000, 'Returning guests only.'],
      ['Corporate Partner Rate', 'CORP15', 'Corporate rate', 'percent', 15, -200, 95, [], 1, 5000000, 'Contracted companies.'],
      ['Summer by the Sea', 'SUMMER26', 'Seasonal promotion', 'percent', 20, -150, -30, ['DLX', 'SUI', 'FAM'], 3, 3000000, ''],
      ['Da Nang Fireworks Festival', 'DIFF26', 'Seasonal promotion', 'percent', 12, -120, -60, [], 2, 2000000, ''],
      ['Tet Holiday 2027', 'TET2027', 'Seasonal promotion', 'percent', 12, 100, 140, ['DLX', 'SUI', 'PRE'], 3, 4000000, 'Lunar New Year packages.'],
      ['Honeymoon Package', 'HONEY', 'Coupon code', 'fixed', 800000, -10, 200, ['DLX', 'SUI'], 3, 800000, 'Includes flowers and cake.']
    ].map((p, i) => ({ id: 'PRM' + String(i + 1).padStart(3, '0'), name: p[0], code: p[1], type: p[2], discountType: p[3], value: p[4], start: U.addDays(today, p[5]), end: U.addDays(today, p[6]), roomTypes: p[7], minNights: p[8], maxDiscount: p[9], description: p[10], enabled: i !== 1 || true, uses: ri(0, 90) }));

    /* ---------- Expenses (last ~35 days) ---------- */
    const expenses = [];
    const expCats = [['Payroll', 'Monthly staff salaries', 380000000, 'Bank Transfer'], ['Utilities', 'EVN electricity bill', 92000000, 'Bank Transfer'], ['Utilities', 'Dawaco water bill', 18500000, 'Bank Transfer'], ['OTA commission', 'Booking.com commission', 64000000, 'Bank Transfer'], ['OTA commission', 'Agoda commission', 52000000, 'Bank Transfer'], ['Marketing', 'Facebook & Google ads', 25000000, 'Credit Card'], ['Maintenance', 'HVAC service contract', 15000000, 'Bank Transfer'], ['Insurance', 'Property insurance (monthly)', 12000000, 'Bank Transfer'], ['Internet', 'VNPT leased line', 6800000, 'Bank Transfer']];
    expCats.forEach((c, i) => expenses.push({ id: 'EXP-' + String(7001 + expenses.length), date: U.addDays(today, -ri(1, 28)), category: c[0], description: c[1], amount: c[2], method: c[3], supplierId: '', status: i < 7 ? 'Paid' : 'Pending' }));
    purchases.filter((p) => U.diffDays(p.date, today) <= 30).forEach((p) => expenses.push({ id: 'EXP-' + String(7001 + expenses.length), date: p.date, category: 'Purchases', description: `${suppliers.find((s) => s.id === p.supplierId).name} · ${p.id}`, amount: p.amount, method: 'Bank Transfer', supplierId: p.supplierId, status: p.status === 'Paid' ? 'Paid' : 'Pending' }));
    for (let d = 0; d < 30; d += 3) expenses.push({ id: 'EXP-' + String(7001 + expenses.length), date: U.addDays(today, -d), category: 'Petty cash', description: pick(['Flowers for lobby', 'Taxi for guest documents', 'Emergency plumbing parts', 'Staff meal supplies', 'Printing menus']), amount: r10k(ri(2, 30) * 100000), method: 'Cash', supplierId: '', status: 'Paid' });

    /* ---------- 12 months of history for finance & reports ---------- */
    const history = [];
    const [ty, tm] = today.split('-').map(Number);
    for (let k = 12; k >= 1; k--) {
      const d = new Date(ty, tm - 1 - k, 1);
      const m = d.getMonth() + 1;
      const season = [0.7, 0.78, 0.82, 0.8, 0.86, 0.92, 0.95, 0.93, 0.74, 0.62, 0.58, 0.66][m - 1];
      const occ = Math.min(0.96, season + (R() - 0.5) * 0.06);
      const roomNights = Math.round(occ * 118 * 30);
      const adr = r10k(1150000 + season * 200000 + ri(-40, 40) * 1000);
      const roomRev = roomNights * adr;
      const fnb = Math.round(roomRev * (0.19 + R() * 0.05));
      const other = Math.round(roomRev * (0.07 + R() * 0.03));
      history.push({ month: `${d.getFullYear()}-${String(m).padStart(2, '0')}`, occupancy: occ, roomNights, adr, roomRevenue: roomRev, fnbRevenue: fnb, otherRevenue: other, expenses: Math.round((roomRev + fnb + other) * (0.52 + R() * 0.08)) });
    }

    /* ---------- Lost & found ---------- */
    const lostFound = [
      ['512', 'Black Samsung phone charger', 'Stored', 'Nguyen Thi Lan'], ['Pool area', 'Ray-Ban sunglasses', 'Found', 'Huynh Van Tien'],
      ['708', "Child's teddy bear", 'Returned', 'Tran Thi Nhung'], ['Lobby', 'Envelope with passport copies', 'Stored', 'Bui Quoc Khanh'],
      ['315', 'Silver bracelet', 'Stored', 'Le Thi Yen'], ['Restaurant', 'Blue umbrella', 'Discarded', 'Duong Ngoc Vy']
    ].map((x, i) => ({ id: 'LF-' + String(201 + i), location: x[0], item: x[1], status: x[2], foundBy: x[3], date: U.addDays(today, -ri(0, 20)), notes: '' }));

    /* ---------- Users & permissions ---------- */
    const users = [
      { username: 'admin', password: 'admin123', name: 'Le Thanh Hai', role: 'Administrator', email: 'it@sunrisedanang.vn' },
      { username: 'manager', password: 'manager123', name: 'Nguyen Van An', role: 'Front Office Manager', email: 'an.nguyen@sunrisedanang.vn' },
      { username: 'reception', password: 'reception123', name: 'Pham Thu Trang', role: 'Receptionist', email: 'trang.pham@sunrisedanang.vn' },
      { username: 'housekeeping', password: 'house123', name: 'Vo Thi Hoa', role: 'Housekeeper', email: 'hoa.vo@sunrisedanang.vn' }
    ];

    /* ---------- Notifications log ---------- */
    const firstArr = reservations.find((r) => r.checkIn === today && r.status === 'Confirmed');
    const notifications = [
      { id: 'N1', type: 'reservation', text: `New reservation ${reservations[reservations.length - 3].id} received from Agoda`, time: stamp(today, 7, 42), link: '#/reservations', read: false },
      { id: 'N2', type: 'payment', text: 'Bank transfer from Vietravel Da Nang is awaiting confirmation', time: stamp(today, 8, 15), link: '#/payments', read: false },
      { id: 'N3', type: 'vip', text: firstArr ? `VIP amenity requested for room 801` : 'VIP arrival today', time: stamp(today, 6, 30), link: '#/housekeeping', read: true }
    ];

    return {
      version: HMS.DATA_VERSION, anchorDate: today,
      settings, branches, roomTypes: ROOM_TYPES, ratePlans: RATE_PLANS, rooms, guests, customers, staff,
      reservations, charges, payments, invoices, maintenance: mt, services, menu, tables, orders,
      inventory: inv, movements, suppliers, purchases, promotions, expenses, history, lostFound, users, notifications,
      readNotifs: [],
      counters: { reservation: 26000 + resSeq, payment: 50000 + payRef, invoice: invSeq + 1200, charge: charges.length, guest: guests.length, maintenance: 1041 + mt.length, order: 8801 + orders.length, customer: customers.length, staff: 101 + staff.length, service: services.length, promotion: promotions.length, item: 1001 + inv.length, supplier: suppliers.length, movement: movements.length, expense: 7001 + expenses.length, purchase: 3301 + purchases.length, lf: 201 + lostFound.length, notif: 10, room: 0 }
    };
  };
})();
