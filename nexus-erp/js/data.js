/* ==========================================================================
   NEXUS ERP — data.js
   Deterministic seed-data generator. Builds a realistic, fully related data
   set (customers → quotations → orders → deliveries → invoices → payments →
   journals; suppliers → POs → receipts → bills → payments; projects → tasks →
   expenses → revenue). Documents are replayed in date order through the same
   business services the UI uses, so stock and the ledger stay consistent.
   ========================================================================== */
'use strict';

const DATA_VERSION = 7;

const Seed = (() => {
  let s = 1;
  const rnd = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const chance = (p) => rnd() < p;
  const pad = (n, w = 3) => String(n).padStart(w, '0');
  const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  const CUSTOMERS = [
    ['ABC Corporation', 'USA', '455 Madison Ave, New York, NY 10022', 'Net 30', 40000, 'Active'],
    ['Brightline Logistics', 'USA', '2100 Harbor Blvd, Long Beach, CA 90802', 'Net 30', 80000, 'Active'],
    ['Cedar Health Partners', 'USA', '870 Cedar St, Seattle, WA 98104', 'Net 45', 120000, 'Active'],
    ['Delta Manufacturing Co.', 'USA', '3301 Industrial Pkwy, Detroit, MI 48210', 'Net 30', 150000, 'Active'],
    ['Evergreen Retail Group', 'Canada', '88 King St W, Toronto, ON M5H 1A1', 'Net 30', 90000, 'Active'],
    ['Fusion Media Labs', 'United Kingdom', '14 Shoreditch High St, London E1 6JE', 'Net 15', 50000, 'Active'],
    ['Granite Construction LLC', 'USA', '1200 Quarry Rd, Denver, CO 80216', 'Net 45', 100000, 'Active'],
    ['Harbor Financial Services', 'USA', '1 Financial Plaza, Boston, MA 02110', 'Net 30', 200000, 'Active'],
    ['Ironwood Energy', 'Canada', '500 Centre St SE, Calgary, AB T2G 1A6', 'Net 60', 150000, 'Active'],
    ['Juniper Hospitality', 'Australia', '200 George St, Sydney NSW 2000', 'Net 30', 60000, 'Active'],
    ['Keystone Education Trust', 'USA', '75 College Ave, Philadelphia, PA 19104', 'Net 45', 90000, 'Active'],
    ['Lumen Architects', 'Germany', 'Friedrichstraße 68, 10117 Berlin', 'Net 30', 70000, 'Active'],
    ['Meridian Pharma', 'Singapore', '10 Marina Blvd, Singapore 018983', 'Net 60', 180000, 'Active'],
    ['Northstar Telecom', 'USA', '600 Congress Ave, Austin, TX 78701', 'Net 30', 120000, 'Active'],
    ['Orion Aerospace', 'USA', '4400 Aviation Way, Phoenix, AZ 85034', 'Net 45', 160000, 'Active'],
    ['Pinnacle Consulting', 'United Kingdom', '30 St Mary Axe, London EC3A 8BF', 'Net 30', 60000, 'Active'],
    ['Quantum Analytics', 'USA', '350 Mission St, San Francisco, CA 94105', 'Net 30', 100000, 'Active'],
    ['Redwood Legal LLP', 'USA', '101 California St, San Francisco, CA 94111', 'Net 15', 40000, 'Inactive'],
    ['Summit Foods Inc.', 'Australia', '120 Collins St, Melbourne VIC 3000', 'Net 30', 80000, 'Active'],
    ['Titan Automotive', 'Germany', 'Mercedesstraße 120, 70372 Stuttgart', 'Net 30', 100000, 'Lead'],
  ];
  const SUPPLIERS = [
    ['TechSource Distribution', 'Net 30', 'Electronics', 'USA'], ['Global Components Ltd.', 'Net 45', 'Electronics', 'Taiwan'],
    ['Paperline Office Supply', 'Net 15', 'Office Supplies', 'USA'], ['Prime Electronics Supply', 'Net 30', 'Electronics', 'USA'],
    ['CloudSoft Licensing', 'Net 30', 'Software', 'Ireland'], ['Atlas Industrial Equipment', 'Net 45', 'Equipment', 'USA'],
    ['Vertex Networking', 'Net 30', 'Electronics', 'USA'], ['BlueRiver Furniture', 'Net 30', 'Equipment', 'Canada'],
    ['Sterling Logistics', 'Net 15', 'Services', 'USA'], ['NovaChip Semiconductors', 'Net 60', 'Electronics', 'South Korea'],
    ['Keystone Tools Co.', 'Net 30', 'Equipment', 'USA'], ['Pacific Print & Media', 'Net 30', 'Office Supplies', 'USA'],
    ['Apex Safety Gear', 'Net 30', 'Equipment', 'Mexico'], ['Metro Cleaning Supplies', 'Net 15', 'Office Supplies', 'USA'],
    ['Horizon Telecom Hardware', 'Net 45', 'Electronics', 'Japan'],
  ];
  // [name, category, brand, unit, cost, price]
  const PRODUCTS = [
    ['Business Laptop 14"', 'Electronics', 'Voltix', 'pcs', 780, 1149], ['Workstation Laptop 16"', 'Electronics', 'Voltix', 'pcs', 1320, 1899],
    ['27" 4K Monitor', 'Electronics', 'Clarion', 'pcs', 245, 389], ['24" Full HD Monitor', 'Electronics', 'Clarion', 'pcs', 118, 189],
    ['Wireless Keyboard & Mouse Set', 'Electronics', 'Keyra', 'set', 28, 59], ['USB-C Docking Station', 'Electronics', 'Corelink', 'pcs', 96, 169],
    ['Noise-Cancelling Headset', 'Electronics', 'Sonora', 'pcs', 64, 129], ['HD Conference Webcam', 'Electronics', 'Clarion', 'pcs', 52, 99],
    ['Tablet 11" 128GB', 'Electronics', 'Voltix', 'pcs', 290, 449], ['Smartphone Pro 256GB', 'Electronics', 'Nexa', 'pcs', 610, 899],
    ['Portable SSD 1TB', 'Electronics', 'Datavault', 'pcs', 58, 109], ['Network Switch 24-Port', 'Electronics', 'Corelink', 'pcs', 210, 349],
    ['Wi-Fi 6 Access Point', 'Electronics', 'Corelink', 'pcs', 95, 179], ['Laser Printer Mono', 'Electronics', 'Printa', 'pcs', 145, 249],
    ['Office Suite Annual License', 'Software', 'Nexa Software', 'license', 60, 129], ['Accounting Pro Subscription', 'Software', 'Ledgerly', 'license', 180, 349],
    ['Endpoint Security Seat', 'Software', 'Shieldware', 'seat', 18, 39], ['CRM Cloud Business Seat', 'Software', 'Salesgrid', 'seat', 45, 89],
    ['Project Planner Pro License', 'Software', 'Taskline', 'license', 70, 149], ['Cloud Backup 1TB / year', 'Software', 'Datavault', 'license', 40, 99],
    ['Design Studio License', 'Software', 'Artisan', 'license', 210, 399], ['Database Server License', 'Software', 'Corelink', 'license', 950, 1690],
    ['On-site Installation', 'Services', 'Nexus Services', 'hr', 45, 95], ['IT Consulting', 'Services', 'Nexus Services', 'hr', 70, 150],
    ['Network Setup Package', 'Services', 'Nexus Services', 'package', 400, 950], ['Annual Support Plan', 'Services', 'Nexus Services', 'plan', 600, 1400],
    ['Staff Training Session', 'Services', 'Nexus Services', 'session', 250, 600], ['Data Migration Service', 'Services', 'Nexus Services', 'package', 800, 1850],
    ['Managed IT (monthly)', 'Services', 'Nexus Services', 'month', 900, 2100], ['Hardware Maintenance Visit', 'Services', 'Nexus Services', 'visit', 80, 180],
    ['Ergonomic Office Chair', 'Equipment', 'Contour', 'pcs', 145, 279], ['Electric Standing Desk', 'Equipment', 'Contour', 'pcs', 290, 549],
    ['Server Rack 42U', 'Equipment', 'Corelink', 'pcs', 610, 1090], ['UPS 1500VA', 'Equipment', 'Powerline', 'pcs', 165, 289],
    ['Rack Server 2U', 'Equipment', 'Voltix', 'pcs', 2450, 3890], ['4K Projector', 'Equipment', 'Clarion', 'pcs', 690, 1190],
    ['Conference Table 8-Seat', 'Equipment', 'Contour', 'pcs', 520, 980], ['Filing Cabinet 4-Drawer', 'Equipment', 'Steelform', 'pcs', 120, 229],
    ['Barcode Scanner', 'Equipment', 'Scanix', 'pcs', 58, 119], ['Industrial Label Printer', 'Equipment', 'Printa', 'pcs', 240, 419],
    ['A4 Copy Paper (5 reams)', 'Office Supplies', 'Paperline', 'box', 18, 34], ['Toner Cartridge Black', 'Office Supplies', 'Printa', 'pcs', 42, 79],
    ['Ballpoint Pens (box of 50)', 'Office Supplies', 'Scriptor', 'box', 7, 15], ['Sticky Notes (12 pack)', 'Office Supplies', 'Scriptor', 'pack', 6, 13],
    ['Whiteboard 120×90 cm', 'Office Supplies', 'Steelform', 'pcs', 48, 95], ['Desk Organizer Set', 'Office Supplies', 'Contour', 'set', 12, 26],
    ['Heavy-Duty Stapler', 'Office Supplies', 'Steelform', 'pcs', 11, 24], ['Binder Clips Assorted', 'Office Supplies', 'Scriptor', 'pack', 4, 9],
    ['Notebook A5 (10 pack)', 'Office Supplies', 'Paperline', 'pack', 14, 29], ['Shipping Boxes (25 bundle)', 'Office Supplies', 'Paperline', 'bundle', 19, 38],
  ];
  const EMPLOYEES = [
    ['Alex Carter', 'Management', 'Chief Operating Officer', null], ['Sarah Mitchell', 'Sales', 'Sales Manager', 1], ['James Rodriguez', 'Sales', 'Account Executive', 2],
    ['Emily Chen', 'Sales', 'Account Executive', 2], ['Michael Brooks', 'Sales', 'Sales Representative', 2], ['Olivia Nguyen', 'Sales', 'Sales Representative', 2],
    ['Daniel Kim', 'Finance', 'Finance Manager', 1], ['Rachel Adams', 'Finance', 'Senior Accountant', 7], ['Thomas Wright', 'Finance', 'Accountant', 7],
    ['Priya Patel', 'Projects', 'Project Manager', 1], ['Marcus Johnson', 'Projects', 'Project Manager', 1], ['Laura Bennett', 'Projects', 'Project Manager', 1],
    ['Kevin O\'Brien', 'Operations', 'Inventory Manager', 1], ['Sofia Martinez', 'Operations', 'Warehouse Supervisor', 13], ['David Lee', 'Purchasing', 'Purchasing Manager', 1],
    ['Hannah Scott', 'Purchasing', 'Buyer', 15], ['Ryan Cooper', 'IT', 'Systems Engineer', 10], ['Grace Liu', 'IT', 'Solutions Consultant', 10],
    ['Ethan Walker', 'IT', 'Field Technician', 11], ['Natalie Evans', 'HR', 'HR Specialist', 1],
  ];
  const FIRST = ['James', 'Maria', 'Robert', 'Linda', 'David', 'Susan', 'Daniel', 'Karen', 'Paul', 'Nancy', 'Mark', 'Lisa', 'George', 'Hiroshi', 'Steven', 'Helen', 'Andrew', 'Sandra', 'Joshua', 'Anika', 'Brian', 'Carol', 'Mateo', 'Ruth', 'Jason', 'Sharon', 'Jeff', 'Michelle'];
  const LAST = ['Anderson', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Lewis', 'Walker', 'Hall', 'Young', 'Allen', 'King', 'Wright', 'Hill', 'Green', 'Baker', 'Nelson', 'Tanaka', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Schmidt', 'Campbell', 'Parker', 'Evans', 'Okafor', 'Collins'];

  const ACCOUNTS = [
    ['1000', 'Assets', 'Asset', true], ['1010', 'Cash', 'Asset'], ['1020', 'Bank — Operating Account', 'Asset'], ['1100', 'Accounts Receivable', 'Asset'], ['1200', 'Inventory', 'Asset'],
    ['1500', 'Equipment & Fixed Assets', 'Asset'], ['1510', 'Accumulated Depreciation', 'Asset'],
    ['2000', 'Liabilities', 'Liability', true], ['2010', 'Accounts Payable', 'Liability'], ['2100', 'Taxes Payable', 'Liability'], ['2200', 'Accrued Liabilities', 'Liability'], ['2500', 'Long-term Loan', 'Liability'],
    ['3000', 'Equity', 'Equity', true], ['3010', 'Owner Equity', 'Equity'], ['3100', 'Retained Earnings', 'Equity'],
    ['4000', 'Revenue', 'Revenue', true], ['4010', 'Product Sales', 'Revenue'], ['4020', 'Service Revenue', 'Revenue'], ['4090', 'Other Income', 'Revenue'],
    ['5000', 'Cost of Goods Sold', 'COGS', true], ['5010', 'Cost of Goods Sold', 'COGS'],
    ['6000', 'Operating Expenses', 'Expense', true], ['6010', 'Salaries', 'Expense'], ['6020', 'Rent', 'Expense'], ['6030', 'Utilities', 'Expense'], ['6040', 'Marketing', 'Expense'],
    ['6050', 'Software', 'Expense'], ['6060', 'Travel', 'Expense'], ['6070', 'Office Supplies', 'Expense'], ['6080', 'Equipment Expense', 'Expense'], ['6090', 'Other Expenses', 'Expense'],
    ['6100', 'Depreciation', 'Expense'], ['6110', 'Bank Fees', 'Expense'],
  ];

  const ROLE_DEFS = [
    ['Administrator', 'Full access to every module and setting.', ['*'], [1, 1, 1, 1, 1, 1]],
    ['Finance Manager', 'Finance, billing, accounting and reporting.', ['dashboard', 'customers', 'suppliers', 'orders', 'billing', 'payments', 'expenses', 'finance', 'accounts', 'journals', 'ledger', 'ar', 'ap', 'finreports', 'projects', 'reports', 'notifications'], [1, 1, 1, 1, 1, 1]],
    ['Sales Manager', 'Customers, sales pipeline, orders and invoicing.', ['dashboard', 'customers', 'sales', 'orders', 'products', 'inventory', 'billing', 'payments', 'ar', 'projects', 'reports', 'notifications'], [1, 1, 1, 1, 1, 1]],
    ['Sales Representative', 'Own customers, quotations and orders.', ['dashboard', 'customers', 'sales', 'orders', 'products', 'notifications'], [1, 1, 1, 0, 0, 0]],
    ['Inventory Manager', 'Products, warehouses and stock movements.', ['dashboard', 'products', 'inventory', 'suppliers', 'purchasing', 'reports', 'notifications'], [1, 1, 1, 1, 1, 1]],
    ['Purchasing Manager', 'Suppliers, purchase orders and payables.', ['dashboard', 'suppliers', 'purchasing', 'products', 'inventory', 'ap', 'payments', 'reports', 'notifications'], [1, 1, 1, 1, 1, 1]],
    ['Project Manager', 'Projects, tasks, teams and project costs.', ['dashboard', 'customers', 'projects', 'tasks', 'employees', 'expenses', 'notifications'], [1, 1, 1, 0, 1, 1]],
    ['Accountant', 'Journals, ledger and financial statements.', ['dashboard', 'billing', 'payments', 'expenses', 'finance', 'accounts', 'journals', 'ledger', 'ar', 'ap', 'finreports', 'reports', 'notifications'], [1, 1, 1, 0, 0, 1]],
    ['Viewer', 'Read-only access to business data.', ['dashboard', 'customers', 'sales', 'orders', 'products', 'inventory', 'suppliers', 'purchasing', 'billing', 'finance', 'projects', 'tasks', 'reports', 'notifications'], [1, 0, 0, 0, 0, 0]],
  ];

  function generate(D) {
    s = 20260925;
    COLLECTIONS.forEach((c) => { D[c] = []; });
    const T = today();
    const START = periodStart();
    const SPAN = daysBetween(START, T);
    const at = (offset) => { const d = addDays(START, offset); return d > T ? T : d; };
    const clipPast = (d, back = 1) => (d >= T ? addDays(T, -back) : d);
    const TAX = 10;

    /* ----- settings, roles, users ----- */
    D.settings = {
      company: { name: 'Nexus Holdings Inc.', address: '1200 Market Street, Suite 400, San Francisco, CA 94103', phone: '+1 (415) 555-0100', email: 'accounts@nexusholdings.com', website: 'www.nexusholdings.com', taxNumber: 'US-94-7712345', currency: 'USD', fiscalYear: 'January – December' },
      companies: ['Nexus Holdings Inc.', 'Nexus Europe GmbH', 'Nexus Asia Pte. Ltd.'], activeCompany: 0,
      currency: 'USD', taxRate: TAX,
      taxes: [{ name: 'Standard sales tax', rate: 10 }, { name: 'Reduced rate', rate: 5 }, { name: 'Zero-rated', rate: 0 }],
      paymentTerms: [{ name: 'Due on Receipt', days: 0 }, { name: 'Net 15', days: 15 }, { name: 'Net 30', days: 30 }, { name: 'Net 45', days: 45 }, { name: 'Net 60', days: 60 }],
      invoice: { prefix: 'INV', terms: 'Payment is due within the agreed payment terms. Late payments may incur interest of 1.5% per month.', footer: 'Thank you for your business.', bank: 'First Pacific Bank · Account 4410 2281 993 · SWIFT FPBKUS66' },
      salesTarget: 70000,
      notify: { overdue: true, lowStock: true, credit: true, deadlines: true, email: false, digest: true },
      appearance: { density: 'comfortable' },
    };
    D.roles = ROLE_DEFS.map(([name, description, modules, p], i) => ({ id: 'ROLE-' + (i + 1), name, description, modules, perms: Object.fromEntries(PERMISSIONS.map((k, j) => [k, !!p[j]])) }));
    D.users = [
      ['Alex Carter', 'admin@nexuserp.com', 'admin123', 'Administrator'], ['Daniel Kim', 'finance@nexuserp.com', 'finance123', 'Finance Manager'],
      ['Sarah Mitchell', 'sales@nexuserp.com', 'sales123', 'Sales Manager'], ['Kevin O\'Brien', 'inventory@nexuserp.com', 'inventory123', 'Inventory Manager'],
      ['Rachel Adams', 'accountant@nexuserp.com', 'account123', 'Accountant'], ['Priya Patel', 'projects@nexuserp.com', 'project123', 'Project Manager'],
      ['Guest Viewer', 'viewer@nexuserp.com', 'viewer123', 'Viewer'],
    ].map(([name, email, password, role], i) => ({ id: 'USR-' + pad(i + 1), name, email, password, role, status: 'Active', lastLogin: null }));

    D.warehouses = [
      { id: 'WH-MAIN', name: 'Main Warehouse', location: 'Oakland, CA', manager: 'EMP-013', capacity: 12000 },
      { id: 'WH-NORTH', name: 'North Warehouse', location: 'Portland, OR', manager: 'EMP-014', capacity: 5000 },
      { id: 'WH-SOUTH', name: 'South Warehouse', location: 'Austin, TX', manager: 'EMP-014', capacity: 5000 },
      { id: 'WH-RETAIL', name: 'Retail Store', location: 'San Francisco, CA', manager: 'EMP-013', capacity: 800 },
    ];
    D.accounts = ACCOUNTS.map(([code, name, type, header]) => ({ id: code, code, name, type, header: !!header, parent: header ? null : code[0] + '000', description: '', system: true }));

    /* ----- employees ----- */
    D.employees = EMPLOYEES.map(([name, department, position, mgr], i) => ({
      id: 'EMP-' + pad(i + 1), name, department, position, email: name.toLowerCase().replace(/[^a-z ]/g, '').replace(' ', '.') + '@nexusholdings.com',
      phone: `+1 (415) 555-${pad(1100 + i * 37, 4)}`, manager: mgr ? 'EMP-' + pad(mgr) : '', status: i === 19 ? 'On Leave' : 'Active', hireDate: addDays(T, -ri(200, 2400)),
    }));
    const salesReps = ['EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006'];
    const finStaff = ['Rachel Adams', 'Thomas Wright', 'Daniel Kim'];

    /* ----- customers & suppliers ----- */
    D.customers = CUSTOMERS.map(([company, country, address, terms, limit, status], i) => {
      const fn = FIRST[i % FIRST.length]; const ln = LAST[(i * 7) % LAST.length];
      const domain = company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '.com';
      return {
        id: 'CUS-' + pad(i + 1), name: `${fn} ${ln}`, company, email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${domain}`, phone: `+1 (${ri(201, 989)}) 555-${pad(ri(100, 9999), 4)}`,
        country, billingAddress: address, shippingAddress: address, paymentTerms: terms, creditLimit: limit, status, industry: pick(['Technology', 'Healthcare', 'Manufacturing', 'Retail', 'Finance', 'Education', 'Energy', 'Hospitality']),
        website: 'www.' + domain, taxId: `TX-${ri(100000, 999999)}`, createdAt: addDays(START, -ri(60, 900)),
        contacts: [{ id: uid(), name: `${fn} ${ln}`, title: pick(['Procurement Lead', 'IT Director', 'Office Manager', 'CFO', 'Operations Manager']), email: `${fn.toLowerCase()}.${ln.toLowerCase()}@${domain}`, phone: `+1 555-${pad(ri(1000, 9999), 4)}`, primary: true },
          { id: uid(), name: `${FIRST[(i + 11) % FIRST.length]} ${LAST[(i + 5) % LAST.length]}`, title: 'Accounts Payable', email: `ap@${domain}`, phone: `+1 555-${pad(ri(1000, 9999), 4)}`, primary: false }],
        notes: i === 0 ? [{ id: uid(), date: addDays(T, -12), user: 'Sarah Mitchell', text: 'Requested extended terms for the Q4 hardware refresh. Pending finance review of outstanding balance.' }] : [],
      };
    });
    D.suppliers = SUPPLIERS.map(([company, terms, category, country], i) => {
      const fn = FIRST[(i * 3 + 5) % FIRST.length]; const ln = LAST[(i * 5 + 3) % LAST.length];
      const domain = company.toLowerCase().replace(/[^a-z]/g, '').slice(0, 14) + '.com';
      return { id: 'SUP-' + pad(i + 1), company, contact: `${fn} ${ln}`, email: `orders@${domain}`, phone: `+1 (${ri(201, 989)}) 555-${pad(ri(100, 9999), 4)}`,
        paymentTerms: terms, category, country, address: `${ri(10, 9800)} ${pick(['Commerce Way', 'Supply Ave', 'Industrial Dr', 'Harbor Rd', 'Enterprise Blvd'])}`, status: i === 14 ? 'Inactive' : 'Active', taxId: `VAT-${ri(1000000, 9999999)}`, website: 'www.' + domain };
    });
    const supByCat = groupBy(D.suppliers.filter((x) => x.status === 'Active'), (x) => x.category);

    /* ----- products ----- */
    D.products = PRODUCTS.map(([name, category, brand, unit, cost, price], i) => {
      const type = category === 'Services' ? 'service' : category === 'Software' ? 'digital' : 'stock';
      const sup = supByCat[category] ? supByCat[category][i % supByCat[category].length].id : '';
      return { id: 'SKU-' + (101 + i), name, category, brand, unit, cost, price, type, reorder: type !== 'stock' ? 0 : category === 'Office Supplies' ? ri(30, 60) : category === 'Equipment' ? ri(4, 10) : ri(8, 20),
        supplierId: sup, status: i === 21 ? 'Inactive' : 'Active', barcode: String(4006381000000 + i * 7919), stock: {}, description: `${brand} ${name}` };
    });
    const P = (id) => D.products.find((p) => p.id === id);
    const stockProducts = D.products.filter((p) => p.type === 'stock');
    const qtyFor = (p) => ({ Electronics: ri(4, 26), Software: ri(10, 60), Services: p.unit === 'hr' ? ri(20, 90) : ri(1, 4), Equipment: ri(2, 12), 'Office Supplies': ri(20, 100) })[p.category];
    const randomItems = (n, opts = {}) => {
      const pool = D.products.filter((p) => p.status === 'Active' && (!opts.stockOnly || p.type === 'stock') && (!opts.services || p.type === 'service'));
      return shuffle(pool).slice(0, n).map((p) => ({ productId: p.id, description: p.name, qty: qtyFor(p), price: p.price, discount: chance(0.3) ? pick([2, 5, 10]) : 0, tax: TAX }));
    };

    /* ----- actions replayed in chronological order ----- */
    const actions = [];
    const act = (date, fn, prio = 5) => actions.push({ date, fn, prio, n: actions.length });
    const plannedMoves = []; // {date, productId, wh, qty} used to size opening stock

    /* ----- sales orders & invoices ----- */
    const orderStatus = (i) => (i === 9 ? 'Cancelled' : i <= 13 ? 'Completed' : i <= 19 ? 'Delivered' : i <= 21 ? 'Shipped' : i <= 23 ? 'Ready' : i <= 25 ? 'Processing' : i <= 27 ? 'Confirmed' : 'Draft');
    const activeCustomers = D.customers.filter((c) => c.status === 'Active');
    const invoicesPlanned = [];
    for (let i = 0; i < 30; i++) {
      const c = activeCustomers[(i * 7 + 3) % activeCustomers.length];
      const date = clipPast(at(4 + Math.round(i * (SPAN - 8) / 29) + ri(-2, 2)), 2);
      const status = orderStatus(i);
      const items = randomItems(ri(1, 4));
      if (!items.some((it) => P(it.productId).type === 'stock')) items.push(...randomItems(1, { stockOnly: true }));
      const o = { id: 'ORD-' + (10001 + i), customerId: c.id, date, salesperson: pick(salesReps), warehouse: 'WH-MAIN', paymentTerms: c.paymentTerms,
        billingAddress: c.billingAddress, shippingAddress: c.shippingAddress, items, shipping: pick([0, 45, 85, 120]), status, invoiceId: null, quotationId: null,
        notes: pick(['', 'Deliver to loading dock B.', 'Call contact 30 minutes before delivery.', 'Split shipment accepted.', '']), createdAt: date + 'T10:00:00Z' };
      if (['Shipped', 'Delivered', 'Completed'].includes(status)) {
        o.shippedDate = clipPast(addDays(date, ri(2, 5)), 1);
        o.items.forEach((it) => plannedMoves.push({ date: o.shippedDate, productId: it.productId, wh: 'WH-MAIN', qty: -it.qty }));
        act(o.shippedDate, () => o.items.forEach((it) => Inventory.move({ date: o.shippedDate, ref: o.id, productId: it.productId, warehouse: 'WH-MAIN', type: 'Sales Delivery', qty: -it.qty, user: 'Sofia Martinez' })), 3);
        if (status !== 'Shipped') o.deliveredDate = clipPast(addDays(o.shippedDate, ri(1, 3)), 0);
        invoicesPlanned.push({ order: o, date: o.shippedDate, idx: i });
      }
      D.orders.push(o);
    }

    /* ----- projects, tasks ----- */
    const PROJECTS = [
      ['ERP Rollout — Phase 1', 'CUS-004', 'EMP-010', 'Completed', -250, 110, 95000], ['Network Infrastructure Upgrade', 'CUS-003', 'EMP-011', 'Completed', -215, 120, 72000],
      ['Cloud Migration', 'CUS-008', 'EMP-012', 'Active', -150, 190, 140000], ['Retail POS Deployment', 'CUS-005', 'EMP-010', 'Active', -95, 105, 68000],
      ['Security Compliance Audit', 'CUS-013', 'EMP-011', 'Active', -60, 72, 45000], ['Data Warehouse Build', 'CUS-017', 'EMP-012', 'Active', -120, 180, 120000],
      ['Managed IT Onboarding', 'CUS-001', 'EMP-010', 'Active', -40, 50, 38000], ['Conference Room AV Fit-out', 'CUS-016', 'EMP-011', 'On Hold', -100, 140, 32000],
      ['Campus Wi-Fi Expansion', 'CUS-011', 'EMP-012', 'Planning', 12, 110, 85000], ['Office Relocation IT Setup', 'CUS-012', 'EMP-010', 'Cancelled', -190, 70, 28000],
    ];
    const PHASES = ['Requirements workshop', 'Site survey', 'Solution design', 'Hardware procurement', 'Installation & configuration', 'Data migration', 'User acceptance testing', 'Staff training', 'Go-live & handover'];
    const techPool = ['EMP-017', 'EMP-018', 'EMP-019', 'EMP-003', 'EMP-008', 'EMP-016'];
    PROJECTS.forEach(([name, customerId, manager, status, startOff, dur, budget], i) => {
      const startDate = addDays(T, startOff); const endDate = addDays(startDate, dur);
      const team = [manager, ...shuffle(techPool).slice(0, ri(2, 4))];
      D.projects.push({ id: 'PRJ-' + pad(i + 1), name, customerId, manager, startDate, endDate, budget, status, team,
        description: `${name} for ${D.customers.find((c) => c.id === customerId).company}. Scope covers planning, delivery and handover with weekly status reporting.`, documents: i < 6 ? [{ id: uid(), name: 'Statement_of_Work.pdf', size: '284 KB', date: startDate, user: Lookup.employeeName(manager) || 'Priya Patel' }] : [], progress: 0 });
      const phases = shuffle(PHASES.map((p, k) => k)).slice(0, 5).sort((a, b) => a - b).map((k) => PHASES[k]);
      const slice = dur / 5;
      phases.forEach((ph, k) => {
        const ts = addDays(startDate, Math.round(k * slice)); const te = addDays(startDate, Math.round((k + 1) * slice) - 1);
        let st; let pr;
        if (status === 'Completed') { st = 'Completed'; pr = 100; } else if (status === 'Planning') { st = k === 0 ? 'In Progress' : 'To Do'; pr = k === 0 ? 10 : 0; } else if (te < T) { st = status === 'Active' && k === 4 ? 'Review' : 'Completed'; pr = st === 'Review' ? 90 : 100; } else if (ts <= T) { st = status === 'On Hold' ? 'Blocked' : status === 'Cancelled' ? 'To Do' : (chance(0.2) ? 'Review' : 'In Progress'); pr = st === 'To Do' ? 0 : ri(20, 80); } else { st = 'To Do'; pr = 0; }
        D.tasks.push({ id: 'TSK-' + pad(D.tasks.length + 1, 4), title: ph, projectId: 'PRJ-' + pad(i + 1), assignedTo: team[(k + 1) % team.length], priority: pick(['Low', 'Medium', 'Medium', 'High', 'High', 'Critical']), startDate: ts, dueDate: te, progress: pr, status: st, description: `${ph} for ${name}.` });
      });
      // project invoices
      if (['Completed', 'Active', 'On Hold'].includes(status)) {
        const n = status === 'Completed' ? 2 : status === 'On Hold' ? 0 : 1;
        for (let k = 0; k < n; k++) {
          const d = clipPast(addDays(startDate, Math.round(dur * (k + 1) / (n + 1))), 3);
          invoicesPlanned.push({ project: D.projects[i], date: d, items: [
            { productId: 'SKU-124', description: 'IT Consulting — ' + name, qty: ri(90, 240), price: 150, discount: 0, tax: TAX },
            { productId: pick(['SKU-125', 'SKU-128', 'SKU-127']), description: '', qty: 1, price: 0, discount: 0, tax: TAX },
          ] });
        }
      }
      // project expenses
      if (status !== 'Planning') {
        const cats = [['Other', 'Subcontractor labor', 3000, 12000, 'Brightpath Contractors'], ['Travel', 'Site visit travel & lodging', 400, 1800, 'SkyWays Travel'], ['Equipment', 'Project hardware & cabling', 1500, 6000, 'Vertex Networking'], ['Software', 'Project tooling licenses', 300, 1500, 'CloudSoft Licensing']];
        shuffle(cats).slice(0, status === 'Cancelled' ? 1 : ri(1, 2) + (status === 'Completed' ? 1 : 0)).forEach((c) => {
          const d = clipPast(addDays(startDate, ri(5, Math.max(6, Math.min(dur, daysBetween(startDate, T)) - 2))), 2);
          D.expenses.push({ _date: d, category: c[0], vendor: c[4], description: `${c[1]} — ${name}`, amount: ri(c[2], c[3]), projectId: 'PRJ-' + pad(i + 1), employeeId: manager });
        });
      }
    });
    // fill project invoice line 2 prices
    invoicesPlanned.forEach((pl) => { if (pl.items) pl.items.forEach((it) => { if (!it.price) { const p = P(it.productId); it.price = p.price; it.description = p.name; } }); });
    // one extra project invoice left as draft (most recent)
    invoicesPlanned.push({ project: D.projects[2], date: addDays(T, -1), draft: true, items: [{ productId: 'SKU-124', description: 'IT Consulting — Cloud Migration (milestone 3)', qty: 64, price: 150, discount: 0, tax: TAX }] });

    // Assign invoice numbers in date order
    invoicesPlanned.sort((a, b) => (a.date < b.date ? -1 : 1));
    const invPrefix = Billing.prefix();
    const paidPattern = { 14: 0.5, 15: 0, 16: 0.4, 17: 0, 18: 0, 19: 0.3 };
    invoicesPlanned.forEach((pl, k) => {
      const c = pl.order ? D.customers.find((x) => x.id === pl.order.customerId) : D.customers.find((x) => x.id === pl.project.customerId);
      const inv = { kind: 'invoice', id: invPrefix + pad(101 + k, 5), customerId: c.id, orderId: pl.order?.id || null, projectId: pl.project?.id || null, date: pl.date,
        paymentTerms: c.paymentTerms, dueDate: addDays(pl.date, Lookup.termsDays(c.paymentTerms)), items: pl.order ? deepClone(pl.order.items) : pl.items, shipping: pl.order?.shipping || 0,
        notes: pl.order ? `Sales order ${pl.order.id}` : `Project ${pl.project.id} — ${pl.project.name}`, terms: D.settings.invoice.terms, billingAddress: c.billingAddress, shippingAddress: c.shippingAddress,
        paid: 0, status: pl.draft ? 'Draft' : 'Sent', posted: false, createdAt: pl.date + 'T09:00:00Z', sentAt: pl.draft ? null : pl.date + 'T11:00:00Z' };
      D.invoices.push(inv);
      if (pl.order) pl.order.invoiceId = inv.id;
      if (!pl.draft) act(pl.date, () => Accounting.postInvoice(inv, pl.date), 4);
      // payments
      let share = 0;
      if (pl.draft) share = 0;
      else if (pl.order) share = pl.order.status === 'Completed' ? 1 : pl.order.status === 'Shipped' ? 0 : (paidPattern[pl.idx] ?? 0);
      else share = daysBetween(pl.date, T) > 50 ? 1 : daysBetween(pl.date, T) > 20 ? 0.5 : 0;
      if (share > 0) {
        const total = Calc.doc(inv).total;
        const days = Lookup.termsDays(inv.paymentTerms);
        const pd = clipPast(addDays(pl.date, ri(Math.min(5, days), Math.max(6, days - 2))), 1);
        const amount = share === 1 ? total : round2(total * share);
        act(pd, () => Payments.create({ type: 'Invoice Payment', partyId: c.id, invoiceId: inv.id, date: pd, method: pick(['Bank Transfer', 'Bank Transfer', 'Check', 'Credit Card']), account: ACCT.BANK, amount, reference: `REM-${ri(100000, 999999)}` }, { silent: true, user: pick(finStaff) }), 6);
      }
    });

    /* ----- quotations ----- */
    const convOrders = D.orders.filter((o) => ['Confirmed', 'Processing', 'Ready'].includes(o.status)).slice(0, 6);
    convOrders.forEach((o) => {
      const date = addDays(o.date, -ri(3, 9));
      const q = { id: 'QT-' + pad(2001 + D.quotations.length, 4), customerId: o.customerId, date, expiryDate: addDays(date, 30), salesperson: o.salesperson, items: deepClone(o.items), notes: 'Pricing valid for 30 days.', terms: 'Prices exclude shipping unless stated. Delivery 5–10 business days after order confirmation.', status: 'Converted', orderId: o.id, createdAt: date + 'T08:00:00Z' };
      o.quotationId = q.id; D.quotations.push(q);
    });
    [['Sent', -6], ['Sent', -3], ['Accepted', -8], ['Draft', -1], ['Rejected', -50], ['Sent', -45]].forEach(([st, off]) => {
      const c = pick(activeCustomers); const date = addDays(T, off);
      D.quotations.push({ id: 'QT-' + pad(2001 + D.quotations.length, 4), customerId: c.id, date, expiryDate: addDays(date, 30), salesperson: pick(salesReps), items: randomItems(ri(2, 4)), notes: 'Pricing valid for 30 days.', terms: 'Prices exclude shipping unless stated. Delivery 5–10 business days after order confirmation.', status: st, orderId: null, createdAt: date + 'T08:00:00Z' });
    });
    D.quotations.sort((a, b) => (a.id < b.id ? -1 : 1));

    /* ----- purchase orders, receipts, bills ----- */
    const poStatus = (i) => (i <= 9 ? 'Received' : i <= 11 ? 'Partially Received' : i <= 14 ? 'Ordered' : i <= 16 ? 'Approved' : i === 17 ? 'Pending Approval' : i === 18 ? 'Draft' : 'Cancelled');
    const poSuppliers = D.suppliers.filter((x) => x.status === 'Active' && stockProducts.some((p) => p.supplierId === x.id));
    for (let i = 0; i < 20; i++) {
      const sup = poSuppliers[(i * 5 + 2) % poSuppliers.length];
      const date = clipPast(i <= 11 ? at(2 + Math.round(i * (SPAN - 24) / 11) + ri(-2, 2)) : at(SPAN - 46 + (i - 12) * 5 + ri(0, 2)), 3);
      const prods = shuffle(stockProducts.filter((p) => p.supplierId === sup.id)).slice(0, ri(1, 4));
      const wh = i % 6 === 4 ? 'WH-NORTH' : i % 6 === 5 ? 'WH-SOUTH' : 'WH-MAIN';
      const items = prods.map((p) => ({ productId: p.id, description: p.name, qty: p.category === 'Office Supplies' ? ri(6, 20) * 10 : p.category === 'Equipment' ? ri(4, 16) : ri(10, 40), price: p.cost, discount: chance(0.2) ? 3 : 0, tax: TAX, received: 0, rejected: 0, billed: 0 }));
      const status = poStatus(i);
      const po = { id: 'PO-' + (1001 + i), supplierId: sup.id, date, expectedDate: addDays(date, ri(7, 21)), warehouse: wh, paymentTerms: sup.paymentTerms, items, notes: pick(['', 'Ship complete; no backorders.', 'Include packing list with serial numbers.', 'Deliver between 8 AM and 3 PM.']), status: ['Received', 'Partially Received'].includes(status) ? 'Ordered' : status, createdAt: date + 'T09:30:00Z', requestId: null };
      D.purchaseOrders.push(po);
      if (['Received', 'Partially Received'].includes(status)) {
        const rd = clipPast(addDays(date, ri(5, 12)), 2);
        const lines = items.map((it, idx) => {
          const rej = status === 'Received' && chance(0.2) ? ri(1, 2) : 0;
          const q = status === 'Received' ? it.qty - rej : (idx === 0 ? Math.ceil(it.qty / 2) : 0);
          if (q > 0) plannedMoves.push({ date: rd, productId: it.productId, wh, qty: q });
          return { index: idx, qty: q, rejected: rej };
        });
        if (status === 'Partially Received' && !lines.some((l) => l.qty > 0)) lines[0].qty = 1;
        act(rd, () => Purchasing.receive(po, { date: rd, warehouse: wh, lines, user: pick(['Sofia Martinez', 'Kevin O\'Brien']), notes: 'Checked against packing list.' }), 2);
        const bd = clipPast(addDays(rd, ri(0, 3)), 1);
        act(bd, () => {
          const r = Purchasing.createBill(po, { number: `${sup.company.replace(/[^A-Z]/g, '').slice(0, 3)}-${ri(20000, 89999)}`, date: bd, silent: true });
          const b = r.bill; if (!b) return;
          const age = daysBetween(bd, T); const total = Calc.doc(b).total; const days = Lookup.termsDays(b.paymentTerms);
          const share = age > 80 ? 1 : age > 40 ? (chance(0.5) ? 0.5 : 0) : 0;
          if (share > 0) {
            const pd = clipPast(addDays(bd, ri(Math.min(10, days), Math.max(11, days))), 1);
            act(pd, () => Payments.create({ type: 'Supplier Payment', partyId: sup.id, billId: b.id, date: pd, method: 'Bank Transfer', account: ACCT.BANK, amount: share === 1 ? total : round2(total * share), reference: `WIRE-${ri(10000, 99999)}` }, { silent: true, user: pick(finStaff) }), 6);
          }
        }, 5);
      }
    }

    /* ----- purchase requests ----- */
    [['EMP-017', 'IT', 'Replacement laptops for new engineering hires', 'Approved'], ['EMP-014', 'Operations', 'Restock warehouse packing supplies', 'Converted'],
      ['EMP-020', 'HR', 'Ergonomic chairs for onboarding cohort', 'Submitted'], ['EMP-018', 'IT', 'Access points for the Portland office', 'Submitted'],
      ['EMP-008', 'Finance', 'Label printer for document archiving', 'Draft'], ['EMP-005', 'Sales', 'Demo tablets for trade show', 'Rejected'],
      ['EMP-013', 'Operations', 'Barcode scanners for cycle counting', 'Approved'], ['EMP-019', 'IT', 'UPS units for the server room', 'Converted']].forEach(([emp, dept, reason, st], i) => {
      const date = addDays(T, -ri(3, 60) - (st === 'Converted' ? 20 : 0));
      const items = randomItems(ri(1, 2), { stockOnly: true }).map((it) => ({ ...it, price: P(it.productId).cost, discount: 0 }));
      const pr = { id: 'PR-' + (301 + i), requester: emp, department: dept, date, items, reason, status: st, poId: null, createdAt: date + 'T08:00:00Z' };
      if (st === 'Converted') { const po = D.purchaseOrders[17 + (i === 1 ? 0 : 1)]; pr.poId = po.id; po.requestId = pr.id; }
      D.purchaseRequests.push(pr);
    });

    /* ----- operating expenses ----- */
    const months = lastMonths(9);
    months.forEach((m, k) => {
      const isCurrent = k === months.length - 1;
      const salaryDay = addDays(m.start, 24);
      if (salaryDay <= T) D.expenses.push({ _date: salaryDay, category: 'Salary', vendor: 'Payroll — Nexus Holdings', description: `Staff salaries ${m.label}`, amount: 16800 + ri(0, 1500), employeeId: 'EMP-020', noTax: true });
      D.expenses.push({ _date: addDays(m.start, 0), category: 'Rent', vendor: 'Market Street Properties', description: `Office rent ${m.label}`, amount: 4800, employeeId: 'EMP-007', noTax: true });
      const ud = addDays(m.start, 14);
      if (ud <= T) D.expenses.push({ _date: ud, category: 'Utilities', vendor: pick(['Pacific Gas & Power', 'Bay Area Water Co.', 'MetroNet Fiber']), description: `Utilities ${m.label}`, amount: ri(620, 980), employeeId: 'EMP-008', status: isCurrent ? 'Approved' : undefined });
    });
    [['Marketing', 'LinkedIn Ads', 'Q-campaign: enterprise IT buyers', 1800, 4200], ['Marketing', 'Expo Events Ltd.', 'Trade show booth — CloudExpo', 4500, 7800], ['Marketing', 'Brightside Creative', 'Brochure design & print', 900, 2200],
      ['Software', 'CloudSoft Licensing', 'Office suite renewal — internal', 1200, 2400], ['Software', 'Ledgerly', 'Accounting platform subscription', 380, 520], ['Travel', 'SkyWays Travel', 'Sales trip — customer visits', 900, 2600],
      ['Travel', 'Metro Hotels', 'Regional sales conference lodging', 700, 1600], ['Office', 'Paperline Office Supply', 'Office consumables', 180, 520], ['Office', 'BlueRiver Furniture', 'Meeting room chairs', 900, 1900],
      ['Equipment', 'TechSource Distribution', 'Replacement laptops (internal)', 2200, 4800], ['Other', 'Grant & Co. CPAs', 'Quarterly advisory fees', 1500, 2500], ['Marketing', 'Search Boost Agency', 'Search advertising', 1200, 2600]].forEach(([cat, vendor, desc, a, b], k) => {
      D.expenses.push({ _date: clipPast(at(Math.round((k + 0.5) * SPAN / 12)), 1), category: cat, vendor, description: desc, amount: ri(a, b), employeeId: pick(['EMP-002', 'EMP-007', 'EMP-008', 'EMP-015']) });
    });
    D.expenses.sort((a, b) => (a._date < b._date ? -1 : 1));
    D.expenses = D.expenses.map((e, k) => {
      const age = daysBetween(e._date, T);
      const status = e.status || (age > 20 ? 'Paid' : age > 8 ? (chance(0.6) ? 'Paid' : 'Approved') : pick(['Pending', 'Approved', 'Pending']));
      const rec = { id: 'EXP-' + (4001 + k), date: e._date, _paid: status === 'Paid', category: e.category, vendor: e.vendor, description: e.description, amount: e.amount, tax: e.noTax ? 0 : round2(e.amount * 0.1),
        method: e.category === 'Salary' ? 'Bank Transfer' : pick(['Bank Transfer', 'Credit Card', 'Credit Card', 'Check']), account: ACCT.BANK, projectId: e.projectId || '', employeeId: e.employeeId || '', status, receipt: e.category !== 'Salary' ? 'receipt_' + (4001 + k) + '.pdf' : '', paidDate: null };
      if (rec._paid) { rec.status = 'Approved'; act(e._date, () => Expenses.markPaid(rec, { date: e._date }), 7); }
      delete rec._paid;
      return rec;
    });
    // one rejected expense
    const rej = D.expenses.find((e) => e.status === 'Pending' && e.category !== 'Salary');
    if (rej) rej.status = 'Rejected';

    /* ----- transfers, adjustments, returns, other ledger activity ----- */
    const transferPlan = [[25, 'SKU-131', 'WH-NORTH', 12], [70, 'SKU-103', 'WH-SOUTH', 8], [120, 'SKU-141', 'WH-RETAIL', 40], [160, 'SKU-105', 'WH-RETAIL', 20], [200, 'SKU-132', 'WH-NORTH', 5], [SPAN - 10, 'SKU-107', 'WH-SOUTH', 10]];
    transferPlan.forEach(([off, pid, to, qty]) => {
      const d = clipPast(at(off), 2);
      plannedMoves.push({ date: d, productId: pid, wh: 'WH-MAIN', qty: -qty }, { date: d, productId: pid, wh: to, qty });
      act(d, () => { const ref = 'TRF-' + (1001 + transferPlan.findIndex((x) => x[1] === pid)); Inventory.move({ date: d, ref, productId: pid, warehouse: 'WH-MAIN', type: 'Transfer', qty: -qty, user: 'Kevin O\'Brien', note: 'Rebalance stock' }); Inventory.move({ date: d, ref, productId: pid, warehouse: to, type: 'Transfer', qty, user: 'Kevin O\'Brien', note: 'Rebalance stock' }); }, 2);
    });
    // customer return + refund
    const retDate = clipPast(at(SPAN - 30), 2);
    plannedMoves.push({ date: retDate, productId: 'SKU-107', wh: 'WH-MAIN', qty: 2 });
    act(retDate, () => Inventory.move({ date: retDate, ref: 'RMA-2041', productId: 'SKU-107', warehouse: 'WH-MAIN', type: 'Return', qty: 2, user: 'Sofia Martinez', note: 'Customer return — Fusion Media Labs' }), 3);
    act(addDays(retDate, 2), () => Payments.create({ type: 'Refund', partyId: 'CUS-006', date: addDays(retDate, 2), method: 'Bank Transfer', account: ACCT.BANK, amount: 283.8, reference: 'RMA-2041', notes: 'Refund for 2 returned headsets' }, { silent: true, user: 'Rachel Adams' }), 6);
    act(addDays(T, -4), () => Payments.create({ type: 'Advance Payment', partyId: 'CUS-014', date: addDays(T, -4), method: 'Bank Transfer', account: ACCT.BANK, amount: 5000, reference: 'ADV-7781', notes: 'Advance for upcoming network hardware order' }, { silent: true, user: 'Rachel Adams' }), 6);
    act(at(40), () => Accounting.post({ date: at(40), ref: 'LOAN-01', description: 'Term loan drawdown — First Pacific Bank', source: 'Manual', lines: [{ account: ACCT.BANK, debit: 60000 }, { account: ACCT.LOAN, credit: 60000 }] }), 1);
    act(at(55), () => Accounting.post({ date: at(55), ref: 'FA-0012', description: 'Purchase of warehouse racking and forklift', source: 'Manual', lines: [{ account: ACCT.FA, debit: 24500 }, { account: ACCT.BANK, credit: 24500 }] }), 1);
    act(at(150), () => Accounting.post({ date: at(150), ref: 'LOAN-01', description: 'Loan principal repayment', source: 'Manual', lines: [{ account: ACCT.LOAN, debit: 7500 }, { account: ACCT.BANK, credit: 7500 }] }), 1);
    months.forEach((m) => {
      const end = m.end > T ? null : m.end;
      if (!end) return;
      act(end, () => Accounting.post({ date: end, ref: 'DEP-' + m.key, description: `Monthly depreciation ${m.label}`, source: 'Manual', lines: [{ account: '6100', debit: 520 }, { account: '1510', credit: 520 }] }), 8);
      act(end, () => Accounting.post({ date: end, ref: 'BANK-' + m.key, description: `Bank service charges ${m.label}`, source: 'Manual', lines: [{ account: '6110', debit: 42.5 }, { account: ACCT.BANK, credit: 42.5 }] }), 8);
    });

    /* ----- opening stock: sized so stock never goes negative ----- */
    const lowTargets = { 'SKU-104': 6, 'SKU-111': 0, 'SKU-136': 3, 'SKU-142': 18, 'SKU-146': 0, 'SKU-113': 7 };
    const openings = [];
    stockProducts.forEach((p) => {
      ['WH-MAIN', 'WH-NORTH', 'WH-SOUTH', 'WH-RETAIL'].forEach((wh) => {
        const ev = plannedMoves.filter((m) => m.productId === p.id && m.wh === wh).sort((a, b) => (a.date < b.date ? -1 : 1));
        let cum = 0; let min = 0; ev.forEach((m) => { cum += m.qty; min = Math.min(min, cum); });
        let target;
        if (wh === 'WH-MAIN') target = lowTargets[p.id] ?? (p.category === 'Office Supplies' ? ri(70, 220) : p.category === 'Equipment' ? (p.cost > 1000 ? ri(4, 9) : ri(8, 24)) : (p.cost > 500 ? ri(10, 24) : ri(18, 55)));
        else target = chance(0.35) ? (p.category === 'Office Supplies' ? ri(15, 60) : ri(2, 10)) : 0;
        const opening = Math.max(target - cum, -min, 0);
        if (opening > 0) openings.push({ productId: p.id, wh, qty: opening });
      });
    });
    // opening journal placeholder (amounts finalised after replay)
    const opening = { lines: null };
    act(START, () => {
      openings.forEach((o) => Inventory.move({ date: START, ref: 'OPEN-BAL', productId: o.productId, warehouse: o.wh, type: 'Opening Balance', qty: o.qty, user: 'Kevin O\'Brien' }));
      opening.je = Accounting.post({ date: START, ref: 'OPEN-BAL', description: 'Opening balances', source: 'Opening', lines: [{ account: ACCT.CASH, debit: 1 }, { account: ACCT.EQUITY, credit: 1 }] });
    }, 0);

    /* ----- replay everything in date order ----- */
    actions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.prio - b.prio || a.n - b.n));
    for (let i = 0; i < actions.length; i++) actions[i].fn();
    // bills scheduled their payments inside actions → run any appended late actions
    const extra = actions.splice(0, actions.length).length;
    void extra;

    // Lower selected products to their low-stock targets via a recent cycle count
    Object.entries(lowTargets).forEach(([pid, target]) => {
      const p = P(pid); const cur = p.stock['WH-MAIN'] || 0;
      if (cur > target) Inventory.adjust({ productId: pid, warehouse: 'WH-MAIN', qty: target - cur, reason: 'Cycle count — damaged / missing units', date: addDays(T, -ri(2, 6)) });
    });

    // Finalise opening journal: inventory = current stock value − net inventory flows
    const invFlow = sum(D.journals.filter((j) => j !== opening.je), (j) => sum(j.lines.filter((l) => l.account === ACCT.INV), (l) => l.debit - l.credit));
    const invOpen = round2(Inventory.totalValue() - invFlow);
    const cashOpen = 18500; const bankOpen = 245000; const re = 96000;
    opening.je.lines = [
      { account: ACCT.CASH, description: 'Opening cash on hand', debit: cashOpen, credit: 0 }, { account: ACCT.BANK, description: 'Opening bank balance', debit: bankOpen, credit: 0 },
      { account: ACCT.INV, description: 'Opening inventory valuation', debit: invOpen, credit: 0 },
      { account: ACCT.RE, description: 'Retained earnings brought forward', debit: 0, credit: re }, { account: ACCT.EQUITY, description: 'Owner equity', debit: 0, credit: round2(cashOpen + bankOpen + invOpen - re) },
    ];

    // Journals: sort by date & renumber so ids read chronologically
    D.journals.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    D.journals.forEach((j, k) => { j.id = 'JE-' + pad(k + 1, 5); j.createdBy = j.source === 'Sales' ? 'System' : pick(finStaff); j.createdAt = j.date + 'T' + pad(ri(8, 17), 2) + ':' + pad(ri(0, 59), 2) + ':00Z'; });
    D.movements.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    D.movements.forEach((m, k) => { m.id = 'MV-' + pad(k + 1, 5); });
    D.payments.forEach((p) => { p.createdAt = p.date + 'T14:00:00Z'; });
    // status corrections for POs that were received during replay
    D.purchaseOrders.forEach((po, i) => { if (poStatus(i) === 'Cancelled') po.status = 'Cancelled'; });

    /* ----- activity log from documents ----- */
    D.activity = [];
    const logAt = (date, user, action, ref) => D.activity.push({ id: uid(), ts: date + 'T' + pad(ri(8, 18), 2) + ':' + pad(ri(0, 59), 2) + ':00Z', user, action, ref });
    D.orders.forEach((o) => { logAt(o.date, Lookup.employeeName(o.salesperson), `Created sales order ${o.id} for ${Lookup.customerName(o.customerId)}`, o.id); if (o.shippedDate) logAt(o.shippedDate, 'Sofia Martinez', `Shipped order ${o.id}`, o.id); });
    D.invoices.forEach((inv) => logAt(inv.date, 'Rachel Adams', `Created invoice ${inv.id} for ${Lookup.customerName(inv.customerId)}`, inv.id));
    D.payments.forEach((p) => logAt(p.date, p.createdBy, `Recorded ${p.type.toLowerCase()} ${p.id} of ${formatCurrency(p.amount)}`, p.id));
    D.purchaseOrders.forEach((po) => logAt(po.date, 'David Lee', `Created purchase order ${po.id} for ${Lookup.supplierName(po.supplierId)}`, po.id));
    D.receipts.forEach((r) => logAt(r.date, r.user, `Received goods ${r.id} against ${r.poId}`, r.poId));
    D.quotations.forEach((q) => logAt(q.date, Lookup.employeeName(q.salesperson), `Created quotation ${q.id}`, q.id));
    D.projects.forEach((p) => logAt(p.startDate > T ? addDays(T, -2) : p.startDate, Lookup.employeeName(p.manager), `Created project ${p.id} — ${p.name}`, p.id));
    D.tasks.filter((t) => t.status === 'Completed').forEach((t) => logAt(t.dueDate > T ? T : t.dueDate, Lookup.employeeName(t.assignedTo), `Completed task "${t.title}"`, t.projectId));
    D.activity.sort((a, b) => (a.ts < b.ts ? 1 : -1));

    /* ----- stored notifications (events) ----- */
    const lastPO = D.purchaseOrders.filter((p) => p.status === 'Received').pop();
    D.notifications = [
      { id: uid(), key: 'ev1', dynamic: false, date: addDays(T, -1) + 'T09:12:00Z', read: false, type: 'success', title: 'Goods received', text: `Purchase Order ${lastPO.id} has been received into ${Lookup.warehouseName(lastPO.warehouse)}.`, link: 'po/' + lastPO.id },
      { id: uid(), key: 'ev2', dynamic: false, date: addDays(T, -2) + 'T15:40:00Z', read: false, type: 'info', title: 'Purchase approval needed', text: `Purchase Order ${D.purchaseOrders[17].id} is waiting for approval.`, link: 'po/' + D.purchaseOrders[17].id },
      { id: uid(), key: 'ev3', dynamic: false, date: addDays(T, -4) + 'T10:05:00Z', read: true, type: 'success', title: 'Advance received', text: 'Northstar Telecom paid an advance of $5,000.00.', link: 'customer/CUS-014' },
      { id: uid(), key: 'ev4', dynamic: false, date: addDays(T, -6) + 'T08:30:00Z', read: true, type: 'info', title: 'Quotation accepted', text: `Quotation ${D.quotations.find((q) => q.status === 'Accepted')?.id} was accepted and is ready to convert.`, link: 'quotations' },
    ];
  }

  return { generate };
})();
