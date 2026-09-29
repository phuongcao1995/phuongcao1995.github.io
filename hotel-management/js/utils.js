/* =========================================================
   Sunrise HMS — utilities & reusable UI components
   Everything lives under the single global namespace `HMS`.
   ========================================================= */
(function () {
  'use strict';
  const HMS = (window.HMS = window.HMS || {});
  HMS.modules = HMS.modules || {};

  /* ---------------- Formatting & helpers ---------------- */
  const U = (HMS.util = {});
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  U.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  const nf = new Intl.NumberFormat('en-US');
  U.num = (n) => nf.format(Math.round(Number(n) || 0));
  U.money = (n) => { n = Math.round(Number(n) || 0); return (n < 0 ? '-' : '') + nf.format(Math.abs(n)) + ' VND'; };
  U.moneyShort = (n) => {
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return Math.round(n / 1e3) + 'K';
    return String(Math.round(n));
  };
  U.pct = (n, d = 1) => (isFinite(n) ? Number(n).toFixed(d) : '0') + '%';
  U.round = (n, step = 1000) => Math.round(n / step) * step;
  U.sum = (arr, fn) => arr.reduce((s, x) => s + (fn ? fn(x) : x), 0);
  U.groupBy = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); (m[k] = m[k] || []).push(x); return m; }, {});
  U.initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).slice(-2).map((p) => p[0]).join('').toUpperCase();
  U.debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.qs = (sel, root = document) => root.querySelector(sel);
  U.qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  U.uid = (p = 'ID') => p + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.stripHtml = (s) => String(s == null ? '' : s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

  /* Seeded PRNG so demo data is identical on every reset */
  U.rng = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ---------------- Dates (ISO YYYY-MM-DD, hotel timezone) ---------------- */
  const TZ = 'Asia/Ho_Chi_Minh';
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function vnParts(d = new Date()) {
    try {
      const p = {};
      new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
        .formatToParts(d).forEach((x) => { p[x.type] = x.value; });
      if (p.hour === '24') p.hour = '00';
      return p;
    } catch (e) {
      return { year: d.getFullYear(), month: String(d.getMonth() + 1).padStart(2, '0'), day: String(d.getDate()).padStart(2, '0'), hour: String(d.getHours()).padStart(2, '0'), minute: String(d.getMinutes()).padStart(2, '0'), second: String(d.getSeconds()).padStart(2, '0') };
    }
  }
  U.vnParts = vnParts;
  U.iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  U.parse = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  U.today = () => { const p = vnParts(); return `${p.year}-${p.month}-${p.day}`; };
  U.nowStamp = () => { const p = vnParts(); return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`; };
  U.addDays = (s, n) => { const d = U.parse(s); d.setDate(d.getDate() + n); return U.iso(d); };
  U.diffDays = (a, b) => Math.round((U.parse(b) - U.parse(a)) / 86400000);
  U.isWeekend = (s) => { const w = U.parse(s).getDay(); return w === 0 || w === 6; };
  U.weekday = (s) => WD[U.parse(s).getDay()];
  U.dayLabel = (s) => { const d = U.parse(s); return `${MON[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`; };
  U.monthLabel = (ym) => { const [y, m] = ym.split('-'); return `${MON[Number(m) - 1]} ${y}`; };
  U.fmtDate = (s) => {
    if (!s) return '—';
    const [y, m, d] = String(s).slice(0, 10).split('-');
    const f = (HMS.store && HMS.store.data && HMS.store.data.settings.dateFormat) || 'DD/MM/YYYY';
    if (f === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
    if (f === 'YYYY-MM-DD') return `${y}-${m}-${d}`;
    return `${d}/${m}/${y}`;
  };
  U.fmtDateTime = (s) => (s ? `${U.fmtDate(s)} ${String(s).slice(11, 16)}` : '—');
  U.relTime = (stamp) => {
    if (!stamp) return '';
    const now = U.nowStamp();
    const days = U.diffDays(stamp.slice(0, 10), now.slice(0, 10));
    if (days > 1) return `${days} days ago`;
    if (days === 1) return 'Yesterday';
    const mins = (Number(now.slice(11, 13)) * 60 + Number(now.slice(14, 16))) - (Number(stamp.slice(11, 13)) * 60 + Number(stamp.slice(14, 16)));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    return `${Math.floor(mins / 60)} h ago`;
  };

  /* ---------------- CSV & download ---------------- */
  U.toCSV = (rows) => rows.map((r) => r.map((v) => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
  U.download = (filename, text, mime = 'text/csv;charset=utf-8') => {
    try {
      const blob = new Blob(['\ufeff' + text], { type: mime });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      return true;
    } catch (e) { return false; }
  };

  /* ---------------- Icons (inline SVG, stroke-based) ---------------- */
  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    frontdesk: '<path d="M3 18h18"/><path d="M5 18a7 7 0 0 1 14 0"/><path d="M12 11V8.5"/><path d="M10 8h4"/><path d="M4 21h16"/>',
    reservations: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><path d="M9 10h6M9 14h6M9 18h3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M7 14h4M13 17h4"/>',
    rooms: '<path d="M3 19V7"/><path d="M3 14h18v5"/><path d="M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="1.6"/>',
    guests: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.5a6 6 0 0 1 3.5 5.5"/>',
    housekeeping: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M18.5 15l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/><path d="M5 16.5l.6 1.2 1.2.6-1.2.6L5 20.1l-.6-1.2-1.2-.6 1.2-.6z"/>',
    maintenance: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a1.8 1.8 0 0 0 2.5 2.5l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.3-.3-.3-2.3z"/>',
    services: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8S10.5 3.5 8 4.3 8.5 8 12 8zM12 8s1.5-4.5 4-3.7S15.5 8 12 8z"/>',
    restaurant: '<path d="M5 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M7 12v9"/><path d="M17 21V3c-2.2 1.2-3.2 3.8-3.2 7.5V13H17"/>',
    billing: '<path d="M5 3h14v18l-2.3-1.4L14.3 21 12 19.6 9.7 21l-2.4-1.4L5 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    payments: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
    customers: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18M11 13v2h2v-2"/>',
    staff: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M8 17.5a4 4 0 0 1 8 0"/>',
    inventory: '<path d="M3 7.5l9-4.5 9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
    suppliers: '<path d="M2 6h11v10H2zM13 9h4l4 4v3h-8"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    promotions: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    reports: '<path d="M4 20V11M10 20V5M16 20v-8M21 20H3"/>',
    finance: '<path d="M4 7.5V6a2 2 0 0 1 2-2h11v3.5"/><rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M16 13.5h2"/>',
    settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    'chevron-left': '<path d="M15 6l-6 6 6 6"/>',
    'chevron-down': '<path d="M6 9l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
    checkin: '<path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M14 17l5-5-5-5M19 12H8"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
    alert: '<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5v.5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.5"/>',
    building: '<path d="M4 21V5l8-2v18M12 8h8v13M8 8v.5M8 12v.5M8 16v.5M16 12v.5M16 16v.5M2 21h20"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    swap: '<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',
    note: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h5"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.5M14 20h.5M17.5 17.5H21V21h-3.5z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
    box: '<path d="M4 8h16v12H4zM3 4h18v4H3zM10 12h4"/>',
    arrowIn: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
    arrowOut: '<path d="M12 20V8M7 13l5-5 5 5M5 4h14"/>',
    filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.5M3.5 12h.5M3.5 18h.5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    bed: '<path d="M3 18V6M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'
  };
  HMS.icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.info}</svg>`;
  const icon = HMS.icon;

  /* ---------------- Status → badge tone ---------------- */
  const TONES = {
    Available: 'success', Clean: 'success', Inspected: 'teal', Reserved: 'info', Occupied: 'violet', Dirty: 'danger', Cleaning: 'warn',
    Maintenance: 'neutral', 'Out of Order': 'dark', 'Out of Service': 'neutral', Disabled: 'dark',
    Pending: 'warn', Confirmed: 'info', 'Checked-in': 'violet', 'Checked-out': 'neutral', Cancelled: 'danger', 'No-show': 'dark',
    Paid: 'success', 'Partially Paid': 'warn', Refunded: 'neutral', Unpaid: 'danger', Overdue: 'danger', 'City Ledger': 'info',
    Open: 'danger', Assigned: 'info', 'In Progress': 'warn', 'Waiting Parts': 'violet', Completed: 'success',
    New: 'info', Preparing: 'warn', Ready: 'teal', Served: 'violet',
    Active: 'success', Inactive: 'neutral', 'On Leave': 'warn', Scheduled: 'info', Expired: 'neutral', Paused: 'neutral', 'Opening Soon': 'info',
    Urgent: 'danger', High: 'danger', Medium: 'warn', Low: 'neutral', Normal: 'neutral',
    VIP: 'lantern', Free: 'success', 'In Stock': 'success', 'Low Stock': 'warn', 'Out of Stock': 'danger',
    Found: 'warn', Returned: 'success', Stored: 'info', Discarded: 'neutral', Issued: 'info',
    'On request': 'warn', Unavailable: 'neutral', Deposit: 'info', Payment: 'success', Refund: 'neutral'
  };
  U.tone = (s) => TONES[s] || 'neutral';
  U.badge = (s, tone) => `<span class="badge tone-${tone || U.tone(s)}">${U.esc(s)}</span>`;
  U.vip = (g) => (g && g.vip ? '<span class="vip-mark" title="VIP guest">VIP</span>' : '');

  /* =========================================================
     UI components
     ========================================================= */
  const UI = (HMS.ui = {});

  UI.pageHead = ({ title, sub, crumbs, actions }) => `
    <div class="page-head">
      <div>
        ${crumbs ? `<nav class="crumbs" aria-label="Breadcrumb"><a href="#/dashboard">Home</a>${crumbs.map((c) => `<span class="sep">/</span>${c.href ? `<a href="${c.href}">${U.esc(c.label)}</a>` : `<span>${U.esc(c.label)}</span>`}`).join('')}</nav>` : ''}
        <h1>${U.esc(title)}</h1>
        ${sub ? `<p>${sub}</p>` : ''}
      </div>
      ${actions ? `<div class="page-actions">${actions}</div>` : ''}
    </div>`;

  UI.empty = (title, text, action = '') => `
    <div class="empty"><div class="empty-ico">${icon('search')}</div><h3>${U.esc(title)}</h3>${text ? `<p>${U.esc(text)}</p>` : ''}${action}</div>`;

  UI.kpi = ({ label, value, unit, meta, dot, link, feature }) => `
    <div class="kpi ${link ? 'is-link' : ''} ${feature ? 'feature' : ''}" ${link ? `data-link="${link}" role="link" tabindex="0"` : ''}>
      <span class="kpi-label">${dot ? `<i class="dot" style="background:${dot}"></i>` : ''}${U.esc(label)}</span>
      <span class="kpi-value">${value}${unit ? `<small>${unit}</small>` : ''}</span>
      ${meta ? `<span class="kpi-meta">${meta}</span>` : ''}
    </div>`;

  UI.tabs = (tabs, active, cls = '') => `<div class="tabs ${cls}" role="tablist">${tabs.map((t) =>
    `<button type="button" role="tab" aria-selected="${t.id === active}" class="tab ${t.id === active ? 'active' : ''}" data-tab="${t.id}">${U.esc(t.label)}${t.count != null ? `<span class="tab-count">${t.count}</span>` : ''}</button>`).join('')}</div>`;

  /** Wire tab clicks inside `root`; calls onChange(id). */
  UI.bindTabs = (root, onChange) => {
    root.addEventListener('click', (e) => {
      const t = e.target.closest('.tab[data-tab]');
      if (!t || !root.contains(t)) return;
      U.qsa('.tab', t.parentElement).forEach((b) => { b.classList.toggle('active', b === t); b.setAttribute('aria-selected', b === t); });
      onChange(t.dataset.tab);
    });
  };

  /* ---------- Toast ---------- */
  UI.toast = (msg, type = 'success') => {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `${icon(type === 'error' ? 'alert' : type === 'warn' ? 'alert' : type === 'info' ? 'info' : 'check')}<span>${U.esc(msg)}</span>`;
    root.appendChild(el);
    setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 220); }, type === 'error' ? 4800 : 3200);
  };

  /* ---------- Modal (stackable) ---------- */
  const stack = [];
  UI.modal = ({ title, body = '', size = 'md', actions = [], onMount, onClose, className = '' }) => {
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal modal-${size} ${className}" role="dialog" aria-modal="true" aria-label="${U.esc(title)}">
        <header class="modal-head"><h2>${U.esc(title)}</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon('x')}</button></header>
        <div class="modal-body">${body}</div>
        <footer class="modal-foot"></footer>
      </div>`;
    const ctx = {
      el: wrap,
      body: wrap.querySelector('.modal-body'),
      foot: wrap.querySelector('.modal-foot'),
      closed: false,
      close() {
        if (ctx.closed) return;
        ctx.closed = true;
        wrap.remove();
        const i = stack.indexOf(ctx);
        if (i >= 0) stack.splice(i, 1);
        if (!stack.length) document.body.classList.remove('modal-open', 'print-modal');
        if (onClose) onClose(ctx);
      },
      setTitle(t) { wrap.querySelector('.modal-head h2').textContent = t; },
      setActions(list) {
        ctx.actions = list;
        ctx.foot.innerHTML = list.map((a, i) => a.spacer ? '<span class="spacer"></span>' :
          `<button type="button" class="btn ${a.kind ? 'btn-' + a.kind : ''}" data-idx="${i}" ${a.disabled ? 'disabled' : ''}>${a.icon ? icon(a.icon) : ''}${U.esc(a.label)}</button>`).join('');
      }
    };
    ctx.setActions(actions);
    let downOnBackdrop = false;
    wrap.addEventListener('mousedown', (e) => { downOnBackdrop = e.target === wrap; });
    wrap.addEventListener('click', (e) => {
      if ((e.target === wrap && downOnBackdrop) || e.target.closest('[data-close]')) { ctx.close(); return; }
      const b = e.target.closest('.modal-foot [data-idx]');
      if (b && ctx.foot.contains(b)) {
        const a = ctx.actions[Number(b.dataset.idx)];
        if (a && a.onClick) { if (a.onClick(ctx) === false) return; }
        if (!a || !a.keepOpen) ctx.close();
      }
    });
    root.appendChild(wrap);
    stack.push(ctx);
    document.body.classList.add('modal-open');
    if (onMount) onMount(ctx);
    const first = wrap.querySelector('.modal-body input:not([type=hidden]):not([readonly]), .modal-body select, .modal-body textarea');
    (first || wrap.querySelector('.modal')).focus && setTimeout(() => (first || wrap.querySelector('[data-close]')).focus(), 30);
    return ctx;
  };
  UI.closeAllModals = () => { while (stack.length) stack[stack.length - 1].close(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && stack.length) stack[stack.length - 1].close(); });

  UI.confirm = ({ title = 'Please confirm', message = '', confirmLabel = 'Confirm', danger = false }) => new Promise((resolve) => {
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    UI.modal({
      title, size: 'sm', body: `<p class="mb-0">${message}</p>`,
      actions: [{ label: 'Cancel', onClick: () => finish(false) }, { label: confirmLabel, kind: danger ? 'danger' : 'primary', onClick: () => finish(true) }],
      onClose: () => finish(false)
    });
  });

  /** Print only the contents of the top-most modal. */
  UI.printModal = () => { document.body.classList.add('print-modal'); window.print(); setTimeout(() => document.body.classList.remove('print-modal'), 400); };

  /* ---------- Forms ---------- */
  let fieldSeq = 0;
  function fieldHTML(f, v) {
    if (f.type === 'section') return `<h3 class="form-section span-2">${U.esc(f.label)}</h3>`;
    if (f.type === 'html') return `<div class="${f.span === 1 ? '' : 'span-2'}">${f.html}</div>`;
    const id = `f-${f.name}-${++fieldSeq}`;
    const val = v != null ? v : f.value != null ? f.value : '';
    const attrs = [
      `id="${id}"`, `name="${f.name}"`,
      f.required ? 'required' : '', f.readonly ? 'readonly' : '', f.disabled ? 'disabled' : '',
      f.min != null ? `min="${f.min}"` : '', f.max != null ? `max="${f.max}"` : '', f.step != null ? `step="${f.step}"` : '',
      f.pattern ? `pattern="${f.pattern}"` : '', f.placeholder ? `placeholder="${U.esc(f.placeholder)}"` : '',
      f.maxlength ? `maxlength="${f.maxlength}"` : '', f.title ? `title="${U.esc(f.title)}"` : ''
    ].filter(Boolean).join(' ');
    if (f.type === 'checkbox') {
      return `<div class="field ${f.span === 2 ? 'span-2' : ''}"><label class="switch"><input type="checkbox" ${attrs} ${val ? 'checked' : ''}><span class="track"></span><span>${U.esc(f.label)}</span></label>${f.help ? `<small class="help">${U.esc(f.help)}</small>` : ''}</div>`;
    }
    let input;
    if (f.type === 'select') {
      const opts = (typeof f.options === 'function' ? f.options() : f.options) || [];
      input = `<select ${attrs}>${f.placeholder != null ? `<option value="">${U.esc(f.placeholder)}</option>` : ''}${opts.map((o) => {
        const ov = typeof o === 'object' ? o.value : o;
        const ol = typeof o === 'object' ? o.label : o;
        return `<option value="${U.esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${U.esc(ol)}</option>`;
      }).join('')}</select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea ${attrs} rows="${f.rows || 3}">${U.esc(val)}</textarea>`;
    } else {
      input = `<input type="${f.type || 'text'}" ${attrs} value="${U.esc(val)}">`;
    }
    return `<div class="field ${f.span === 2 ? 'span-2' : ''}"><label for="${id}">${U.esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>${input}${f.help ? `<small class="help">${U.esc(f.help)}</small>` : ''}</div>`;
  }
  UI.form = (fields, values = {}, cls = '') => `<div class="form-grid ${cls}">${fields.map((f) => fieldHTML(f, values[f.name])).join('')}</div>`;
  UI.readForm = (root) => {
    const o = {};
    U.qsa('input[name], select[name], textarea[name]', root).forEach((el) => {
      if (el.type === 'checkbox') o[el.name] = el.checked;
      else if (el.type === 'number') o[el.name] = el.value === '' ? '' : Number(el.value);
      else o[el.name] = el.value.trim();
    });
    return o;
  };
  /** Native constraint validation; focuses the first invalid control. */
  UI.validate = (root) => {
    for (const el of U.qsa('input, select, textarea', root)) {
      if (el.willValidate && !el.checkValidity()) { el.reportValidity(); el.focus(); return false; }
    }
    return true;
  };

  /* ---------- Dropdown (generic [data-dd-toggle]) ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-dd-toggle]');
    U.qsa('.dropdown.open').forEach((d) => { if (!t || !d.contains(t)) { if (!d.contains(e.target)) d.classList.remove('open'); } });
    if (t) t.closest('.dropdown').classList.toggle('open');
  });

  /* ---------- CSV export dialog ("export simulation") ---------- */
  UI.exportDialog = (name, rows) => {
    const csv = U.toCSV(rows);
    const preview = csv.split('\n').slice(0, 9).join('\n');
    const file = `${name}-${U.today()}.csv`;
    UI.modal({
      title: 'Export CSV', size: 'lg',
      body: `<p class="muted small">${rows.length - 1} rows ready as <strong>${U.esc(file)}</strong>. Preview of the first lines:</p>
             <pre style="background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:12px;overflow:auto;font-size:12px;max-height:260px;margin:0">${U.esc(preview)}${rows.length > 9 ? '\n…' : ''}</pre>`,
      actions: [
        { label: 'Copy to clipboard', onClick: () => { try { navigator.clipboard.writeText(csv).then(() => UI.toast('CSV copied to clipboard')); } catch (e) { UI.toast('Copy is not available in this browser', 'warn'); } } },
        { label: 'Download CSV', kind: 'primary', icon: 'download', onClick: () => { if (U.download(file, csv)) UI.toast(`Exported ${rows.length - 1} rows`); else UI.toast('Download is blocked here. Use Copy instead.', 'warn'); return false; }, keepOpen: true }
      ]
    });
  };

  /* ---------- Data table: search, filters, date range, sort, pagination, export ---------- */
  UI.dataTable = (el, o) => {
    const st = { q: '', f: {}, from: '', to: '', sort: o.sort || null, dir: o.dir || 'asc', page: 1, size: o.pageSize || 10 };
    (o.filters || []).forEach((f) => { st.f[f.key] = f.value || ''; });
    const idKey = o.idKey || 'id';
    el.innerHTML = `
      <div class="table-card">
        <div class="table-toolbar">
          <div class="tt-left">
            ${o.search === false ? '' : `<label class="search-input">${icon('search')}<span class="sr-only">Search</span><input type="search" data-q placeholder="${U.esc(o.searchPlaceholder || 'Search…')}"></label>`}
            ${(o.filters || []).map((f) => `<select class="select-sm" data-filter="${f.key}" aria-label="${U.esc(f.label)}"><option value="">${U.esc(f.label)}: All</option>${(typeof f.options === 'function' ? f.options() : f.options).map((op) => { const v = typeof op === 'object' ? op.value : op; const l = typeof op === 'object' ? op.label : op; return `<option value="${U.esc(v)}" ${v === f.value ? 'selected' : ''}>${U.esc(l)}</option>`; }).join('')}</select>`).join('')}
            ${o.dateRange ? `<div class="date-range"><input type="date" data-from aria-label="${U.esc(o.dateRange.label || 'Date')} from"><span>to</span><input type="date" data-to aria-label="${U.esc(o.dateRange.label || 'Date')} to"></div>` : ''}
          </div>
          <div class="tt-right">${o.toolbar || ''}${o.exportName ? `<button type="button" class="btn btn-sm" data-export>${icon('download')}Export</button>` : ''}</div>
        </div>
        <div class="table-wrap"><table class="table ${o.compact ? 'compact' : ''}"><thead></thead><tbody></tbody></table></div>
        <div class="table-foot"><span data-info></span><div class="pager" data-pager></div>
          <label class="row small">Rows <select class="select-sm" data-size>${[10, 25, 50, 100].map((n) => `<option ${n === st.size ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        </div>
      </div>`;
    const thead = U.qs('thead', el), tbody = U.qs('tbody', el);
    const cols = o.columns;
    const text = (r) => (o.searchText ? o.searchText(r) : cols.map((c) => (c.key ? r[c.key] : '')).join(' ')).toLowerCase();

    function rows() {
      let list = o.rows();
      if (st.q) { const q = st.q.toLowerCase(); list = list.filter((r) => text(r).includes(q)); }
      (o.filters || []).forEach((f) => {
        const v = st.f[f.key];
        if (v) list = list.filter((r) => (f.match ? f.match(r, v) : String(r[f.key]) === v));
      });
      if (o.dateRange && (st.from || st.to)) {
        const k = o.dateRange.key;
        list = list.filter((r) => { const d = String(r[k] || '').slice(0, 10); return (!st.from || d >= st.from) && (!st.to || d <= st.to); });
      }
      if (st.sort) {
        const c = cols.find((x) => x.key === st.sort || x.id === st.sort);
        if (c) {
          const val = c.sortValue || ((r) => r[c.key]);
          const dir = st.dir === 'asc' ? 1 : -1;
          list = list.slice().sort((a, b) => {
            const x = val(a), y = val(b);
            if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
            return String(x == null ? '' : x).localeCompare(String(y == null ? '' : y), 'en', { numeric: true }) * dir;
          });
        }
      }
      return list;
    }

    function render() {
      const list = rows();
      const pages = Math.max(1, Math.ceil(list.length / st.size));
      if (st.page > pages) st.page = pages;
      const start = (st.page - 1) * st.size;
      const pageRows = list.slice(start, start + st.size);
      thead.innerHTML = `<tr>${cols.map((c) => {
        const k = c.key || c.id;
        const sortable = c.sort !== false && k;
        const ind = st.sort === k ? (st.dir === 'asc' ? '▲' : '▼') : '';
        return `<th class="${sortable ? 'sortable' : ''} ${c.align === 'right' ? 'right' : ''}" ${sortable ? `data-sort="${k}"` : ''} scope="col">${U.esc(c.label)}${sortable ? `<span class="sort-ind">${ind}</span>` : ''}</th>`;
      }).join('')}${o.rowActions ? '<th class="right" scope="col"><span class="sr-only">Actions</span></th>' : ''}</tr>`;
      if (!pageRows.length) {
        tbody.innerHTML = `<tr><td colspan="${cols.length + (o.rowActions ? 1 : 0)}">${UI.empty(o.emptyTitle || 'Nothing to show', o.emptyText || 'Try clearing the search or filters.')}</td></tr>`;
      } else {
        tbody.innerHTML = pageRows.map((r) => `<tr data-id="${U.esc(r[idKey])}" class="${o.onRowClick ? 'clickable' : ''}">${cols.map((c) =>
          `<td class="${c.align === 'right' ? 'right' : ''} ${c.cls || ''}">${c.render ? c.render(r) : U.esc(r[c.key])}</td>`).join('')}${o.rowActions ? `<td class="actions">${o.rowActions(r)}</td>` : ''}</tr>`).join('');
      }
      U.qs('[data-info]', el).textContent = list.length ? `Showing ${start + 1}–${Math.min(start + st.size, list.length)} of ${list.length}` : '0 results';
      const pg = U.qs('[data-pager]', el);
      const btns = [];
      const add = (p, label, dis, act) => btns.push(`<button type="button" data-page="${p}" ${dis ? 'disabled' : ''} class="${act ? 'active' : ''}" aria-label="Page ${p}">${label}</button>`);
      add(st.page - 1, '‹', st.page === 1);
      const win = [];
      for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - st.page) <= 1) win.push(p);
      win.forEach((p, i) => { if (i && p - win[i - 1] > 1) btns.push('<span class="gap">…</span>'); add(p, p, false, p === st.page); });
      add(st.page + 1, '›', st.page === pages);
      pg.innerHTML = btns.join('');
      if (o.onRender) o.onRender(list);
    }

    const q = U.qs('[data-q]', el);
    if (q) q.addEventListener('input', U.debounce(() => { st.q = q.value.trim(); st.page = 1; render(); }, 180));
    el.addEventListener('change', (e) => {
      const t = e.target;
      if (t.matches('[data-filter]')) { st.f[t.dataset.filter] = t.value; st.page = 1; render(); }
      else if (t.matches('[data-from]')) { st.from = t.value; st.page = 1; render(); }
      else if (t.matches('[data-to]')) { st.to = t.value; st.page = 1; render(); }
      else if (t.matches('[data-size]')) { st.size = Number(t.value); st.page = 1; render(); }
    });
    el.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (th) { const k = th.dataset.sort; if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = k; st.dir = 'asc'; } render(); return; }
      const pb = e.target.closest('[data-pager] button[data-page]');
      if (pb && !pb.disabled) { st.page = Number(pb.dataset.page); render(); return; }
      if (e.target.closest('[data-export]')) {
        const list = rows();
        const ec = cols.filter((c) => c.export !== false && (c.key || c.csv));
        const data = [ec.map((c) => c.label)].concat(list.map((r) => ec.map((c) => (c.csv ? c.csv(r) : r[c.key]))));
        UI.exportDialog(o.exportName, data);
        return;
      }
      const act = e.target.closest('[data-act]');
      const tr = e.target.closest('tbody tr[data-id]');
      if (act && tr && o.onAction) {
        const row = o.rows().find((r) => String(r[idKey]) === tr.dataset.id);
        if (row) o.onAction(act.dataset.act, row, act);
        return;
      }
      if (tr && o.onRowClick && !e.target.closest('button, a, input, select')) {
        const row = o.rows().find((r) => String(r[idKey]) === tr.dataset.id);
        if (row) o.onRowClick(row);
      }
    });
    render();
    return { refresh: render, state: st, el, rows };
  };

  /* =========================================================
     Charts — pure SVG, themed through CSS variables
     ========================================================= */
  const C = (HMS.chart = {});
  C.colors = ['var(--primary)', 'var(--lantern)', 'var(--info)', 'var(--violet)', 'var(--teal)', 'var(--danger)', 'var(--neutral)', 'var(--success)', 'var(--warn)'];
  const niceMax = (v) => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const n = v / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };

  function axes(W, H, pl, pr, pt, pb, max, fmt) {
    let s = '';
    for (let i = 0; i <= 4; i++) {
      const y = pt + (H - pt - pb) * (1 - i / 4);
      s += `<line class="grid-line" x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}"/><text x="${pl - 8}" y="${y + 4}" text-anchor="end">${fmt((max * i) / 4)}</text>`;
    }
    return s;
  }

  /** Vertical bars. data: [{label, value, color?, title?}] (stacked when value is an array) */
  C.bar = (data, opt = {}) => {
    const W = 640, H = opt.height || 230, pl = 52, pr = 8, pt = 10, pb = 28;
    const fmt = opt.format || U.moneyShort;
    const stacked = Array.isArray(data[0] && data[0].value);
    const total = (d) => (stacked ? U.sum(d.value) : d.value);
    const max = opt.max || niceMax(Math.max(...data.map(total), 0));
    const bw = (W - pl - pr) / Math.max(1, data.length);
    const every = Math.ceil(data.length / (opt.maxLabels || 10));
    const ih = H - pt - pb;
    let bars = '';
    data.forEach((d, i) => {
      const x = pl + i * bw + bw * 0.18, w = Math.max(2, bw * 0.64);
      const vals = stacked ? d.value : [d.value];
      let yCursor = pt + ih;
      vals.forEach((v, j) => {
        const h = (v / max) * ih;
        yCursor -= h;
        const col = stacked ? (opt.colors || C.colors)[j] : d.color || opt.color || 'var(--primary)';
        bars += `<rect class="bar" x="${x.toFixed(1)}" y="${yCursor.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0, h).toFixed(1)}" rx="3" style="fill:${col}"><title>${U.esc(d.title || d.label)}: ${U.esc(opt.tip ? opt.tip(v) : fmt(v))}${stacked && opt.series ? ' · ' + U.esc(opt.series[j]) : ''}</title></rect>`;
      });
      if (i % every === 0) bars += `<text x="${(x + w / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${U.esc(d.label)}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${U.esc(opt.label || 'Bar chart')}">${axes(W, H, pl, pr, pt, pb, max, fmt)}${bars}</svg>`;
  };

  /** Line chart. series: [{name, values:[], color?}] */
  C.line = (labels, series, opt = {}) => {
    const W = 640, H = opt.height || 230, pl = 52, pr = 12, pt = 10, pb = 28;
    const fmt = opt.format || ((v) => v);
    const max = opt.max || niceMax(Math.max(...series.flatMap((s) => s.values), 0));
    const n = labels.length;
    const xs = (i) => pl + (n <= 1 ? 0 : (i * (W - pl - pr)) / (n - 1));
    const ys = (v) => pt + (H - pt - pb) * (1 - v / max);
    const every = Math.ceil(n / (opt.maxLabels || 10));
    let out = axes(W, H, pl, pr, pt, pb, max, fmt);
    series.forEach((s, si) => {
      const col = s.color || C.colors[si];
      const o0 = s.start || 0;
      const pts = s.values.map((v, i) => `${xs(i + o0).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
      if (si === 0 && opt.area !== false) out += `<polygon points="${xs(o0)},${H - pb} ${pts} ${xs(o0 + s.values.length - 1)},${H - pb}" style="fill:${col};opacity:.09"/>`;
      out += `<polyline points="${pts}" style="fill:none;stroke:${col};stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round;${s.dash ? 'stroke-dasharray:5 4' : ''}"/>`;
      s.values.forEach((v, i) => { out += `<circle cx="${xs(i + o0).toFixed(1)}" cy="${ys(v).toFixed(1)}" r="${n > 20 ? 0 : 3}" style="fill:var(--surface);stroke:${col};stroke-width:2"><title>${U.esc(labels[i + o0])}: ${U.esc(fmt(v))}</title></circle>`; });
    });
    labels.forEach((l, i) => { if (i % every === 0 || i === n - 1) out += `<text x="${xs(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${U.esc(l)}</text>`; });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${U.esc(opt.label || 'Line chart')}">${out}</svg>`;
  };

  /** Donut with legend. data: [{label, value, color?}] */
  C.donut = (data, opt = {}) => {
    const total = U.sum(data, (d) => d.value) || 1;
    const r = 52, c = 2 * Math.PI * r;
    let off = 0, arcs = '';
    data.forEach((d, i) => {
      const len = (d.value / total) * c;
      if (len > 0) arcs += `<circle cx="70" cy="70" r="${r}" style="fill:none;stroke:${d.color || C.colors[i % C.colors.length]};stroke-width:18" stroke-dasharray="${len.toFixed(2)} ${(c - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 70 70)"><title>${U.esc(d.label)}: ${d.value}</title></circle>`;
      off += len;
    });
    const fmt = opt.format || ((v) => U.num(v));
    return `<div class="donut-wrap"><svg viewBox="0 0 140 140" role="img" aria-label="${U.esc(opt.label || 'Donut chart')}"><circle cx="70" cy="70" r="${r}" style="fill:none;stroke:var(--surface-3);stroke-width:18"/>${arcs}
      <text x="70" y="68" text-anchor="middle" style="font-size:20px;font-weight:700;fill:var(--ink);font-family:var(--font)">${U.esc(opt.center != null ? opt.center : U.num(total))}</text>
      <text x="70" y="86" text-anchor="middle" style="font-size:10px;fill:var(--muted);font-family:var(--font)">${U.esc(opt.sub || 'total')}</text></svg>
      <div class="donut-legend">${data.map((d, i) => `<div><i style="background:${d.color || C.colors[i % C.colors.length]}"></i><span>${U.esc(d.label)}</span><b>${fmt(d.value)}</b></div>`).join('')}</div></div>`;
  };

  /** Horizontal bars (HTML). data: [{label, value, color?}] */
  C.hbars = (data, opt = {}) => {
    const max = Math.max(...data.map((d) => d.value), 1);
    const fmt = opt.format || U.num;
    return `<div class="hbars">${data.map((d, i) => `<div class="hbar-row"><span title="${U.esc(d.label)}">${U.esc(d.label)}</span><div class="hbar-track"><div class="hbar-fill" style="width:${((d.value / max) * 100).toFixed(1)}%;background:${d.color || opt.color || C.colors[i % C.colors.length]}"></div></div><b>${fmt(d.value)}</b></div>`).join('')}</div>`;
  };

  C.legend = (items) => `<div class="chart-legend">${items.map((it, i) => `<span><i style="background:${it.color || C.colors[i]}"></i>${U.esc(it.label)}</span>`).join('')}</div>`;
})();
