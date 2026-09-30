/* FinBank — mock data. All names, numbers and accounts are fictional demo data. */
(function () {
  const d = (s) => s; // ISO strings 'YYYY-MM-DD HH:mm'

  const DB = {
    user: {
      id: 'CUS-0001', name: 'Nguyen Minh Anh', short: 'Minh Anh', initials: 'MA',
      phone: '0912 345 678', email: 'minhanh.nguyen@example.vn', dob: '1994-08-17', gender: 'Female',
      address: '25 Nguyen Hue, Ben Nghe Ward, District 1, Ho Chi Minh City',
      idNumber: '079 194 012 345', idIssued: '2021-05-12', idPlace: 'Dept. of Police on Residence Registration',
      employer: 'Saigon Tech Solutions JSC', job: 'Senior Product Designer', income: 45000000,
      tier: 'Gold', since: '2019-03-04', kyc: 'Verified'
    },

    accounts: [
      { id: 'acc1', type: 'Current Account', name: 'NGUYEN MINH ANH', number: '1903 4567 4821', balance: 85250000, available: 84250000, status: 'Active', opened: '2019-03-04', branch: 'FinBank District 1', color: 'blue', rate: '0.1%' },
      { id: 'acc2', type: 'Salary Account', name: 'NGUYEN MINH ANH', number: '1903 8821 7702', balance: 18400000, available: 18400000, status: 'Active', opened: '2021-01-15', branch: 'FinBank District 1', color: 'green', rate: '0.3%' },
      { id: 'acc3', type: 'Savings Account', name: 'NGUYEN MINH ANH', number: '1903 2210 6655', balance: 120000000, available: 120000000, status: 'Active', opened: '2022-06-20', branch: 'FinBank Thu Duc', color: 'purple', rate: '5.4%' },
      { id: 'acc4', type: 'Business Account', name: 'MINH ANH DESIGN STUDIO', number: '1903 7734 9018', balance: 212800000, available: 210800000, status: 'Active', opened: '2023-09-11', branch: 'FinBank District 3', color: 'orange', rate: '0.2%' }
    ],

    card: {
      name: 'FinBank Platinum Visa', number: '4532 8801 2244 9134', holder: 'NGUYEN MINH ANH', expiry: '09/29',
      limit: 50000000, balance: 12640000, minPayment: 1264000, dueDate: '2026-10-15', statementDate: '2026-09-25',
      frozen: false, online: true, international: false, contactless: true, rewardPoints: 18450
    },

    banks: [
      { code: 'FINBANK', name: 'FinBank' },
      { code: 'VCB', name: 'Vietcombank' }, { code: 'BIDV', name: 'BIDV' }, { code: 'CTG', name: 'VietinBank' },
      { code: 'AGR', name: 'Agribank' }, { code: 'TCB', name: 'Techcombank' }, { code: 'MB', name: 'MB Bank' },
      { code: 'VPB', name: 'VPBank' }, { code: 'ACB', name: 'ACB' }, { code: 'TPB', name: 'TPBank' }
    ],

    beneficiaries: [
      { id: 'b1', name: 'TRAN THI HOA', bank: 'Vietcombank', account: '0071 0012 3456', alias: 'Mom', fav: true },
      { id: 'b2', name: 'LE QUOC BAO', bank: 'Techcombank', account: '1903 6677 8899', alias: 'Bao (landlord)', fav: true },
      { id: 'b3', name: 'PHAM HOANG NAM', bank: 'MB Bank', account: '0345 6789 012', alias: 'Nam', fav: false },
      { id: 'b4', name: 'VO THUY LINH', bank: 'ACB', account: '2456 7890 1', alias: 'Linh', fav: true },
      { id: 'b5', name: 'DANG MINH TUAN', bank: 'BIDV', account: '3120 4455 6677', alias: 'Tuan', fav: false },
      { id: 'b6', name: 'NGUYEN THANH SON', bank: 'FinBank', account: '1903 5544 3322', alias: 'Brother', fav: false }
    ],

    billCategories: [
      { id: 'electricity', name: 'Electricity', icon: '⚡' }, { id: 'water', name: 'Water', icon: '💧' },
      { id: 'internet', name: 'Internet', icon: '🌐' }, { id: 'mobile', name: 'Mobile phone', icon: '📱' },
      { id: 'postpaid', name: 'Postpaid mobile', icon: '📞' }, { id: 'tv', name: 'Television', icon: '📺' },
      { id: 'insurance', name: 'Insurance', icon: '🛡️' }, { id: 'tuition', name: 'Tuition', icon: '🎓' },
      { id: 'tax', name: 'Tax', icon: '🏛️' }, { id: 'other', name: 'Other services', icon: '🧾' }
    ],

    billers: [
      { id: 'bl1', cat: 'electricity', provider: 'EVN HCMC', customerId: 'PE05010123456', label: 'Home — District 1', amount: 1245000, due: '2026-10-10', saved: true, autopay: true },
      { id: 'bl2', cat: 'water', provider: 'SAWACO Saigon Water', customerId: 'DN02-118842', label: 'Home water', amount: 186500, due: '2026-10-12', saved: true, autopay: false },
      { id: 'bl3', cat: 'internet', provider: 'FPT Telecom', customerId: 'SGFDN-2231987', label: 'Home fibre 300Mbps', amount: 215000, due: '2026-10-05', saved: true, autopay: true },
      { id: 'bl4', cat: 'tv', provider: 'VTVcab', customerId: 'HCM-77120045', label: 'HD cable TV', amount: 110000, due: '2026-10-20', saved: true, autopay: false },
      { id: 'bl5', cat: 'insurance', provider: 'Bao Viet Life', customerId: 'BV-8830021', label: 'Health insurance', amount: 2850000, due: '2026-11-01', saved: true, autopay: false },
      { id: 'bl6', cat: 'postpaid', provider: 'Viettel Postpaid', customerId: '0912345678', label: 'My postpaid line', amount: 299000, due: '2026-10-08', saved: false, autopay: false }
    ],

    providersByCat: {
      electricity: ['EVN HCMC', 'EVN Hanoi', 'EVN Southern', 'EVN Central'],
      water: ['SAWACO Saigon Water', 'Hanoi Water (HAWACO)', 'Da Nang Water', 'Thu Duc Water'],
      internet: ['FPT Telecom', 'Viettel Internet', 'VNPT Internet', 'CMC Telecom'],
      mobile: ['Viettel', 'Vinaphone', 'Mobifone'],
      postpaid: ['Viettel Postpaid', 'Vinaphone Postpaid', 'Mobifone Postpaid'],
      tv: ['VTVcab', 'K+ (Kplus)', 'MyTV (VNPT)', 'SCTV'],
      insurance: ['Bao Viet Life', 'Prudential Vietnam', 'Manulife Vietnam', 'Dai-ichi Life'],
      tuition: ['RMIT Vietnam', 'FPT University', 'HCMC University of Technology', 'VinSchool'],
      tax: ['Personal Income Tax', 'Land Use Tax', 'Vehicle Registration Fee'],
      other: ['Apartment management fee', 'Parking fee', 'Waste collection service']
    },

    carriers: [
      { id: 'viettel', name: 'Viettel', color: '#e60000' }, { id: 'vinaphone', name: 'Vinaphone', color: '#0071ce' }, { id: 'mobifone', name: 'Mobifone', color: '#00a651' }
    ],
    topupAmounts: [20000, 50000, 100000, 200000, 500000],

    categories: [
      { id: 'food', name: 'Food & Dining', icon: '🍜', color: '#f59e0b' },
      { id: 'shopping', name: 'Shopping', icon: '🛍️', color: '#ec4899' },
      { id: 'transport', name: 'Transportation', icon: '🛵', color: '#3b82f6' },
      { id: 'housing', name: 'Housing', icon: '🏠', color: '#8b5cf6' },
      { id: 'entertainment', name: 'Entertainment', icon: '🎬', color: '#14b8a6' },
      { id: 'health', name: 'Healthcare', icon: '💊', color: '#ef4444' },
      { id: 'education', name: 'Education', icon: '📚', color: '#6366f1' },
      { id: 'bills', name: 'Bills', icon: '🧾', color: '#64748b' },
      { id: 'travel', name: 'Travel', icon: '✈️', color: '#0ea5e9' },
      { id: 'income', name: 'Income', icon: '💰', color: '#16a34a' },
      { id: 'transfer', name: 'Transfer', icon: '🔁', color: '#94a3b8' },
      { id: 'other', name: 'Other', icon: '📦', color: '#a3a3a3' }
    ],

    // type: in | out
    transactions: [
      { id: 'FB2609300001', date: '2026-09-30 08:12', desc: 'Salary September — SAIGON TECH SOLUTIONS JSC', cat: 'income', type: 'in', amount: 45000000, acc: 'acc2', status: 'Completed', counterparty: 'Saigon Tech Solutions JSC', channel: 'Interbank' },
      { id: 'FB2609290002', date: '2026-09-29 19:45', desc: 'Highlands Coffee Nguyen Hue', cat: 'food', type: 'out', amount: 89000, acc: 'acc1', status: 'Completed', counterparty: 'Highlands Coffee', channel: 'QR Payment' },
      { id: 'FB2609290003', date: '2026-09-29 12:30', desc: 'GrabFood order #GF-88213', cat: 'food', type: 'out', amount: 156000, acc: 'acc1', status: 'Completed', counterparty: 'Grab Vietnam', channel: 'Card' },
      { id: 'FB2609280004', date: '2026-09-28 21:10', desc: 'Netflix subscription', cat: 'entertainment', type: 'out', amount: 260000, acc: 'acc1', status: 'Completed', counterparty: 'Netflix', channel: 'Card' },
      { id: 'FB2609280005', date: '2026-09-28 09:05', desc: 'Transfer to LE QUOC BAO — Rent October', cat: 'housing', type: 'out', amount: 12000000, acc: 'acc1', status: 'Completed', counterparty: 'LE QUOC BAO', channel: 'Interbank' },
      { id: 'FB2609270006', date: '2026-09-27 18:20', desc: 'VinMart+ Le Thanh Ton', cat: 'shopping', type: 'out', amount: 342500, acc: 'acc1', status: 'Completed', counterparty: 'WinMart+', channel: 'QR Payment' },
      { id: 'FB2609270007', date: '2026-09-27 08:40', desc: 'Received from PHAM HOANG NAM — lunch split', cat: 'income', type: 'in', amount: 450000, acc: 'acc1', status: 'Completed', counterparty: 'PHAM HOANG NAM', channel: 'Interbank' },
      { id: 'FB2609260008', date: '2026-09-26 14:15', desc: 'Electricity bill EVN HCMC — PE05010123456', cat: 'bills', type: 'out', amount: 1189000, acc: 'acc1', status: 'Completed', counterparty: 'EVN HCMC', channel: 'Bill Payment' },
      { id: 'FB2609250009', date: '2026-09-25 20:00', desc: 'Grab ride to Tan Son Nhat Airport', cat: 'transport', type: 'out', amount: 178000, acc: 'acc1', status: 'Completed', counterparty: 'Grab Vietnam', channel: 'Card' },
      { id: 'FB2609250010', date: '2026-09-25 10:30', desc: 'Vietjet Air SGN–HAN Oct 12', cat: 'travel', type: 'out', amount: 2340000, acc: 'acc1', status: 'Pending', counterparty: 'Vietjet Air', channel: 'Card' },
      { id: 'FB2609240011', date: '2026-09-24 16:45', desc: 'Pharmacity Nguyen Trai', cat: 'health', type: 'out', amount: 415000, acc: 'acc1', status: 'Completed', counterparty: 'Pharmacity', channel: 'QR Payment' },
      { id: 'FB2609230012', date: '2026-09-23 11:00', desc: 'Udemy — UX Research course', cat: 'education', type: 'out', amount: 599000, acc: 'acc1', status: 'Completed', counterparty: 'Udemy', channel: 'Card' },
      { id: 'FB2609220013', date: '2026-09-22 09:20', desc: 'Freelance payment — Lotus Media', cat: 'income', type: 'in', amount: 18500000, acc: 'acc4', status: 'Completed', counterparty: 'Lotus Media Co., Ltd', channel: 'Interbank' },
      { id: 'FB2609210014', date: '2026-09-21 19:10', desc: 'CGV Vincom Dong Khoi — 2 tickets', cat: 'entertainment', type: 'out', amount: 250000, acc: 'acc1', status: 'Completed', counterparty: 'CGV Cinemas', channel: 'QR Payment' },
      { id: 'FB2609200015', date: '2026-09-20 13:00', desc: 'Top-up Viettel 0912345678', cat: 'bills', type: 'out', amount: 100000, acc: 'acc1', status: 'Completed', counterparty: 'Viettel', channel: 'Top-up' },
      { id: 'FB2609190016', date: '2026-09-19 22:30', desc: 'Shopee order #220919XK8', cat: 'shopping', type: 'out', amount: 1290000, acc: 'acc1', status: 'Failed', counterparty: 'Shopee', channel: 'Card' },
      { id: 'FB2609180017', date: '2026-09-18 08:00', desc: 'Internet FPT Telecom — SGFDN-2231987', cat: 'bills', type: 'out', amount: 215000, acc: 'acc1', status: 'Completed', counterparty: 'FPT Telecom', channel: 'Bill Payment' },
      { id: 'FB2609170018', date: '2026-09-17 15:25', desc: 'Transfer to TRAN THI HOA — Monthly support', cat: 'transfer', type: 'out', amount: 5000000, acc: 'acc1', status: 'Completed', counterparty: 'TRAN THI HOA', channel: 'Interbank' },
      { id: 'FB2609160019', date: '2026-09-16 12:10', desc: 'Phuc Long Coffee & Tea', cat: 'food', type: 'out', amount: 75000, acc: 'acc1', status: 'Completed', counterparty: 'Phuc Long', channel: 'QR Payment' },
      { id: 'FB2609150020', date: '2026-09-15 17:00', desc: 'Interest credited — Savings Account', cat: 'income', type: 'in', amount: 540000, acc: 'acc3', status: 'Completed', counterparty: 'FinBank', channel: 'Internal' },
      { id: 'FB2609140021', date: '2026-09-14 10:05', desc: 'Transfer to VO THUY LINH — Birthday gift', cat: 'transfer', type: 'out', amount: 1000000, acc: 'acc1', status: 'Cancelled', counterparty: 'VO THUY LINH', channel: 'Interbank' },
      { id: 'FB2609130022', date: '2026-09-13 07:50', desc: 'Petrolimex Xang RON95', cat: 'transport', type: 'out', amount: 120000, acc: 'acc1', status: 'Completed', counterparty: 'Petrolimex', channel: 'QR Payment' },
      { id: 'FB2609120023', date: '2026-09-12 20:15', desc: 'Circle K Pham Ngu Lao', cat: 'food', type: 'out', amount: 64000, acc: 'acc1', status: 'Completed', counterparty: 'Circle K', channel: 'QR Payment' },
      { id: 'FB2609100024', date: '2026-09-10 09:30', desc: 'Water bill SAWACO — DN02-118842', cat: 'bills', type: 'out', amount: 172000, acc: 'acc1', status: 'Completed', counterparty: 'SAWACO', channel: 'Bill Payment' },
      { id: 'FB2609080025', date: '2026-09-08 18:40', desc: 'Uniqlo Vincom Center', cat: 'shopping', type: 'out', amount: 1780000, acc: 'acc1', status: 'Completed', counterparty: 'Uniqlo Vietnam', channel: 'Card' }
    ],

    // 12-month history (Oct 2025 – Sep 2026)
    months: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'],
    income:   [48000000, 47500000, 62000000, 46000000, 52000000, 47000000, 49500000, 51000000, 47500000, 55000000, 48500000, 64450000],
    expenses: [31500000, 29800000, 42600000, 33200000, 35100000, 30400000, 28900000, 32700000, 29500000, 36800000, 31200000, 27600000],
    balanceHistory: [148000000, 155000000, 172000000, 176000000, 186000000, 198000000, 212000000, 224000000, 236000000, 246000000, 258000000, 267000000],

    spendingByCategory: [
      { cat: 'housing', amount: 12000000 }, { cat: 'food', amount: 6850000 }, { cat: 'shopping', amount: 5420000 },
      { cat: 'bills', amount: 3180000 }, { cat: 'travel', amount: 2340000 }, { cat: 'transport', amount: 1980000 },
      { cat: 'entertainment', amount: 1250000 }, { cat: 'education', amount: 1150000 }, { cat: 'health', amount: 830000 }, { cat: 'other', amount: 420000 }
    ],

    budgets: [
      { cat: 'food', limit: 7000000, spent: 6850000 }, { cat: 'shopping', limit: 5000000, spent: 5420000 },
      { cat: 'transport', limit: 2500000, spent: 1980000 }, { cat: 'housing', limit: 12000000, spent: 12000000 },
      { cat: 'entertainment', limit: 2000000, spent: 1250000 }, { cat: 'health', limit: 1500000, spent: 830000 },
      { cat: 'education', limit: 2000000, spent: 1150000 }, { cat: 'bills', limit: 3500000, spent: 3180000 },
      { cat: 'travel', limit: 3000000, spent: 2340000 }, { cat: 'other', limit: 1000000, spent: 420000 }
    ],

    goals: [
      { id: 'g1', name: 'Emergency fund (6 months)', icon: '🛟', target: 200000000, saved: 120000000, deadline: '2027-06-30' },
      { id: 'g2', name: 'Japan trip — Sakura 2027', icon: '🌸', target: 60000000, saved: 22500000, deadline: '2027-03-15' },
      { id: 'g3', name: 'MacBook Pro', icon: '💻', target: 55000000, saved: 41000000, deadline: '2026-12-20' },
      { id: 'g4', name: 'Home down payment', icon: '🏡', target: 800000000, saved: 205000000, deadline: '2029-12-31' }
    ],

    savingsProducts: [
      { id: 's1', name: 'Flexible Savings', term: 0, label: 'No term', rate: 3.2, min: 100000, desc: 'Withdraw anytime. Interest calculated daily.', earlyPenalty: 'None' },
      { id: 's2', name: 'Term Deposit 1M', term: 1, label: '1 month', rate: 3.6, min: 1000000, desc: 'Short-term parking for idle cash.', earlyPenalty: 'Non-term rate 0.5%/yr' },
      { id: 's3', name: 'Term Deposit 3M', term: 3, label: '3 months', rate: 4.2, min: 1000000, desc: 'Popular quarterly deposit.', earlyPenalty: 'Non-term rate 0.5%/yr' },
      { id: 's4', name: 'Term Deposit 6M', term: 6, label: '6 months', rate: 5.3, min: 2000000, desc: 'Balanced return and liquidity.', earlyPenalty: 'Non-term rate 0.5%/yr' },
      { id: 's5', name: 'Term Deposit 12M', term: 12, label: '12 months', rate: 5.9, min: 5000000, desc: 'Best-value one-year deposit.', earlyPenalty: 'Non-term rate 0.5%/yr' },
      { id: 's6', name: 'Term Deposit 24M', term: 24, label: '24 months', rate: 6.3, min: 10000000, desc: 'Highest rate for long-term saving.', earlyPenalty: 'Non-term rate 0.5%/yr' }
    ],
    deposits: [
      { id: 'd1', product: 'Term Deposit 12M', amount: 80000000, rate: 5.9, opened: '2026-03-10', maturity: '2027-03-10', renewal: 'Renew principal only', status: 'Active' },
      { id: 'd2', product: 'Term Deposit 6M', amount: 40000000, rate: 5.3, opened: '2026-06-05', maturity: '2026-12-05', renewal: 'Renew principal + interest', status: 'Active' },
      { id: 'd3', product: 'Term Deposit 3M', amount: 25000000, rate: 4.2, opened: '2026-07-01', maturity: '2026-10-01', renewal: 'Pay out at maturity', status: 'Maturing soon' }
    ],

    loanProducts: [
      { id: 'l1', name: 'Personal Loan', icon: '👤', rate: 9.9, max: 500000000, maxTerm: 60, desc: 'Unsecured loan for personal needs. Fast approval in 24h.', tag: 'Fast approval' },
      { id: 'l2', name: 'Home Loan', icon: '🏠', rate: 7.9, max: 15000000000, maxTerm: 300, desc: 'Up to 80% of property value, up to 25 years.', tag: 'Best rate' },
      { id: 'l3', name: 'Auto Loan', icon: '🚗', rate: 8.5, max: 2000000000, maxTerm: 96, desc: 'Finance up to 80% of vehicle price.', tag: 'Popular' },
      { id: 'l4', name: 'Business Loan', icon: '💼', rate: 10.5, max: 5000000000, maxTerm: 84, desc: 'Working-capital and expansion financing for SMEs.', tag: 'SME' },
      { id: 'l5', name: 'Credit Card Instalment', icon: '💳', rate: 0, max: 100000000, maxTerm: 24, desc: '0% instalment on purchases from partner merchants.', tag: '0% interest' }
    ],
    loans: [
      { id: 'LN-2024-0387', product: 'Auto Loan', principal: 480000000, outstanding: 352400000, rate: 8.5, term: 60, paid: 17, monthly: 9850000, nextDue: '2026-10-05', status: 'Active', start: '2025-04-05' }
    ],
    loanApplications: [
      { id: 'APP-260912-41', product: 'Personal Loan', amount: 100000000, term: 24, submitted: '2026-09-12', status: 'Under review', step: 2 }
    ],

    notifications: [
      { id: 'n1', type: 'money', title: 'Money received', body: 'You received 45,000,000 VND from SAIGON TECH SOLUTIONS JSC.', time: '2026-09-30 08:12', read: false },
      { id: 'n2', type: 'alert', title: 'Suspicious transaction blocked', body: 'We blocked a 15,900,000 VND card payment at an unfamiliar merchant (Singapore). Was this you?', time: '2026-09-29 23:41', read: false },
      { id: 'n3', type: 'card', title: 'Credit card payment due', body: 'Minimum payment of 1,264,000 VND is due on 15/10/2026.', time: '2026-09-29 09:00', read: false },
      { id: 'n4', type: 'bill', title: 'Bill payment reminder', body: 'Your EVN HCMC bill of 1,245,000 VND is due on 10/10/2026.', time: '2026-09-28 08:00', read: true },
      { id: 'n5', type: 'security', title: 'New login detected', body: 'Login from Chrome on Windows in Ho Chi Minh City at 20:14.', time: '2026-09-27 20:14', read: true },
      { id: 'n6', type: 'savings', title: 'Savings maturity reminder', body: 'Your 3-month term deposit of 25,000,000 VND matures on 01/10/2026.', time: '2026-09-26 08:00', read: false },
      { id: 'n7', type: 'promo', title: 'Get 0.5% extra interest', body: 'Open a 12-month deposit this week and earn an extra 0.5%/year. Limited offer.', time: '2026-09-25 10:00', read: true },
      { id: 'n8', type: 'money', title: 'Transfer successful', body: 'You sent 12,000,000 VND to LE QUOC BAO.', time: '2026-09-28 09:05', read: true }
    ],

    branches: [
      { id: 'br1', kind: 'Branch', name: 'FinBank District 1 Branch', address: '25 Nguyen Hue, Ben Nghe Ward, District 1, HCMC', distance: 0.4, hours: '08:00 – 17:00 (Mon–Fri), 08:00 – 12:00 (Sat)', services: ['Cash deposit', 'Loans', 'Foreign exchange', 'Safe box'], open: true, x: 46, y: 42 },
      { id: 'br2', kind: 'ATM', name: 'ATM — Bitexco Financial Tower', address: '2 Hai Trieu, Ben Nghe Ward, District 1, HCMC', distance: 0.9, hours: '24/7', services: ['Withdraw', 'Deposit', 'Card-less withdrawal'], open: true, x: 60, y: 55 },
      { id: 'br3', kind: 'ATM', name: 'ATM — Vincom Dong Khoi', address: '72 Le Thanh Ton, Ben Nghe Ward, District 1, HCMC', distance: 1.1, hours: '24/7', services: ['Withdraw', 'Balance enquiry'], open: true, x: 35, y: 30, outOfCash: true },
      { id: 'br4', kind: 'Branch', name: 'FinBank District 3 Branch', address: '112 Nam Ky Khoi Nghia, Ward 6, District 3, HCMC', distance: 2.3, hours: '08:00 – 17:00 (Mon–Fri)', services: ['Cash deposit', 'Loans', 'Business banking'], open: true, x: 22, y: 20 },
      { id: 'br5', kind: 'ATM', name: 'ATM — Ben Thanh Market', address: 'Le Lai, Ben Thanh Ward, District 1, HCMC', distance: 0.7, hours: '24/7', services: ['Withdraw', 'Deposit'], open: true, x: 30, y: 62 },
      { id: 'br6', kind: 'Branch', name: 'FinBank Thu Duc Branch', address: '18 Vo Van Ngan, Linh Chieu Ward, Thu Duc City', distance: 8.6, hours: '08:00 – 17:00 (Mon–Fri)', services: ['Cash deposit', 'Loans', 'Foreign exchange'], open: false, x: 78, y: 18 },
      { id: 'br7', kind: 'ATM', name: 'ATM — Landmark 81', address: '720A Dien Bien Phu, Ward 22, Binh Thanh District', distance: 4.8, hours: '24/7', services: ['Withdraw', 'Deposit'], open: true, x: 80, y: 40 },
      { id: 'br8', kind: 'ATM', name: 'ATM — Tan Son Nhat Airport', address: 'Truong Son, Ward 2, Tan Binh District', distance: 7.2, hours: '24/7', services: ['Withdraw', 'Currency exchange'], open: true, x: 12, y: 74, outOfCash: true }
    ],

    faqs: [
      { q: 'How do I transfer money to another bank?', a: 'Go to Transfers → Other bank, choose the bank, enter the account number and confirm with OTP. Transfers via Napas 247 arrive within seconds, 24/7.' },
      { q: 'I forgot my password. What should I do?', a: 'On the login page, select "Forgot password", enter your registered phone number and verify with the OTP we send.' },
      { q: 'How can I lock my card if it is lost?', a: 'Open Cards → Card controls and turn on Freeze card. Then call our hotline 1900 5555 to request a replacement.' },
      { q: 'What are the daily transfer limits?', a: 'The default limit is 500,000,000 VND per day and 100,000,000 VND per transaction. You can adjust them in Security → Transaction limits.' },
      { q: 'How is savings interest calculated?', a: 'Interest = principal × rate × days / 365. It is paid at maturity for term deposits, or daily for flexible savings.' },
      { q: 'What happens if I withdraw a term deposit early?', a: 'Early withdrawals earn the non-term rate of 0.5%/year on the principal. No penalty on principal.' },
      { q: 'How do I pay my credit card bill?', a: 'Go to Cards → Pay card and choose Minimum, Statement balance or another amount from any FinBank account.' },
      { q: 'Is FinBank safe to use?', a: 'Yes. We use OTP, biometric authentication, device binding and real-time fraud monitoring. Never share your OTP with anyone — including FinBank staff.' }
    ],

    devices: [
      { id: 'dv1', name: 'Windows PC — Chrome', location: 'Ho Chi Minh City', last: '2026-09-30 08:00', current: true, trusted: true },
      { id: 'dv2', name: 'iPhone 15 Pro — FinBank App', location: 'Ho Chi Minh City', last: '2026-09-30 07:41', current: false, trusted: true },
      { id: 'dv3', name: 'MacBook Air — Safari', location: 'Ho Chi Minh City', last: '2026-09-22 19:20', current: false, trusted: true },
      { id: 'dv4', name: 'Unknown Android — Chrome', location: 'Hanoi', last: '2026-08-14 02:13', current: false, trusted: false }
    ],
    loginHistory: [
      { time: '2026-09-30 08:00', device: 'Windows PC — Chrome', ip: '113.161.xx.xx', location: 'Ho Chi Minh City', ok: true },
      { time: '2026-09-29 20:14', device: 'iPhone 15 Pro', ip: '27.65.xx.xx', location: 'Ho Chi Minh City', ok: true },
      { time: '2026-09-27 03:22', device: 'Unknown device', ip: '45.77.xx.xx', location: 'Singapore', ok: false },
      { time: '2026-09-25 09:05', device: 'Windows PC — Chrome', ip: '113.161.xx.xx', location: 'Ho Chi Minh City', ok: true },
      { time: '2026-09-22 19:20', device: 'MacBook Air — Safari', ip: '113.161.xx.xx', location: 'Ho Chi Minh City', ok: true }
    ],

    insights: [
      { icon: '📈', tone: 'good', title: 'You saved 43% of income this month', body: 'That is 9 points above your 6-month average. Keep it up!' },
      { icon: '⚠️', tone: 'warn', title: 'Shopping is 8% over budget', body: 'You have spent 5,420,000 of 5,000,000 VND. Consider pausing non-essential purchases.' },
      { icon: '🔮', tone: 'info', title: 'Predicted October spending: 29.4M VND', body: 'Based on your last 6 months, recurring bills and upcoming travel.' },
      { icon: '💡', tone: 'info', title: 'Move 30M idle cash to a 6M deposit', body: 'Your current account holds idle cash. A 6-month deposit would earn ~795,000 VND.' }
    ],
    recommendations: [
      { icon: '🏦', title: 'Term Deposit 12M', body: 'Earn 5.9%/year on your idle 60M VND.', cta: 'savings.html' },
      { icon: '💳', title: 'Platinum Cashback upgrade', body: 'Your spending qualifies for 2% cashback on dining.', cta: 'cards.html' },
      { icon: '🛡️', title: 'Travel insurance', body: 'You booked a flight — add cover from 120,000 VND.', cta: 'payments.html' }
    ],

    // Admin mock data
    adminCustomers: [
      { id: 'CUS-0001', name: 'Nguyen Minh Anh', phone: '0912 345 678', tier: 'Gold', balance: 436450000, kyc: 'Verified', status: 'Active', joined: '2019-03-04' },
      { id: 'CUS-0002', name: 'Tran Quoc Huy', phone: '0903 221 887', tier: 'Standard', balance: 24500000, kyc: 'Verified', status: 'Active', joined: '2020-11-18' },
      { id: 'CUS-0003', name: 'Le Thi Thanh Huong', phone: '0987 654 321', tier: 'Silver', balance: 96700000, kyc: 'Verified', status: 'Active', joined: '2021-02-09' },
      { id: 'CUS-0004', name: 'Pham Van Duc', phone: '0938 112 004', tier: 'Standard', balance: 3200000, kyc: 'Pending', status: 'Active', joined: '2026-09-21' },
      { id: 'CUS-0005', name: 'Hoang Thi Mai', phone: '0977 445 566', tier: 'Platinum', balance: 1280000000, kyc: 'Verified', status: 'Active', joined: '2018-07-30' },
      { id: 'CUS-0006', name: 'Vu Anh Tuan', phone: '0862 990 771', tier: 'Standard', balance: 780000, kyc: 'Rejected', status: 'Locked', joined: '2026-08-02' },
      { id: 'CUS-0007', name: 'Dang Thu Trang', phone: '0918 302 645', tier: 'Gold', balance: 412000000, kyc: 'Verified', status: 'Active', joined: '2019-10-15' },
      { id: 'CUS-0008', name: 'Bui Minh Khoa', phone: '0396 771 200', tier: 'Silver', balance: 58900000, kyc: 'Pending', status: 'Active', joined: '2026-09-25' },
      { id: 'CUS-0009', name: 'Ngo Bao Chau', phone: '0944 100 288', tier: 'Standard', balance: 12100000, kyc: 'Verified', status: 'Suspended', joined: '2022-04-12' },
      { id: 'CUS-0010', name: 'Do Hai Yen', phone: '0355 812 090', tier: 'Gold', balance: 265000000, kyc: 'Verified', status: 'Active', joined: '2020-01-22' }
    ],
    adminTransactions: [
      { id: 'TX-889120', time: '2026-09-30 09:14', from: 'Nguyen Minh Anh', to: 'Le Quoc Bao', amount: 12000000, status: 'Completed', risk: 'Low' },
      { id: 'TX-889121', time: '2026-09-30 09:11', from: 'Vu Anh Tuan', to: 'Unknown (SG)', amount: 480000000, status: 'Pending', risk: 'High' },
      { id: 'TX-889122', time: '2026-09-30 09:02', from: 'Hoang Thi Mai', to: 'Vingroup JSC', amount: 95000000, status: 'Completed', risk: 'Low' },
      { id: 'TX-889123', time: '2026-09-30 08:55', from: 'Tran Quoc Huy', to: 'EVN HCMC', amount: 1450000, status: 'Failed', risk: 'Low' },
      { id: 'TX-889124', time: '2026-09-30 08:40', from: 'Ngo Bao Chau', to: 'Crypto Exchange XYZ', amount: 150000000, status: 'Pending', risk: 'High' },
      { id: 'TX-889125', time: '2026-09-30 08:31', from: 'Dang Thu Trang', to: 'Bui Minh Khoa', amount: 30000000, status: 'Completed', risk: 'Medium' },
      { id: 'TX-889126', time: '2026-09-30 08:12', from: 'Saigon Tech JSC', to: 'Nguyen Minh Anh', amount: 45000000, status: 'Completed', risk: 'Low' },
      { id: 'TX-889127', time: '2026-09-30 07:58', from: 'Do Hai Yen', to: 'Pham Van Duc', amount: 8000000, status: 'Failed', risk: 'Medium' },
      { id: 'TX-889128', time: '2026-09-30 07:41', from: 'Pham Van Duc', to: 'Overseas wallet', amount: 60000000, status: 'Pending', risk: 'High' },
      { id: 'TX-889129', time: '2026-09-30 07:20', from: 'Le Thi Thanh Huong', to: 'RMIT Vietnam', amount: 42000000, status: 'Completed', risk: 'Low' }
    ],
    adminKpis: { customers: 1284560, deposits: 48250000000000, loans: 31780000000000, dailyTx: 412870, revenue: 186400000000, failed: 1284, fraud: 17 },
    adminMonthlyRevenue: [142, 148, 151, 149, 158, 162, 165, 171, 169, 175, 181, 186],
    adminMonthlyTx: [310, 322, 341, 338, 355, 362, 371, 380, 385, 396, 405, 413],

    fees: [
      { name: 'Interbank transfer (Napas 247)', value: 'Free up to 20M, 7,700 VND above' },
      { name: 'Withdraw at other bank ATM', value: '3,300 VND / transaction' },
      { name: 'Card annual fee — Platinum', value: '990,000 VND' },
      { name: 'Account maintenance', value: 'Free (min balance 50,000 VND)' },
      { name: 'SMS banking', value: '11,000 VND / month' }
    ]
  };

  window.DB = DB;
})();
