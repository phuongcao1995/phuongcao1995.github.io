/* Utilities: DOM helpers, formatting, dates, text normalisation, icons. */
window.GA = window.GA || {};
(function (GA) {
  'use strict';

  const ICONS = {
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    home: 'M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5',
    receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6M9 16h4',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    map: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16',
    car: 'M5 17h14M3 17v-5l2-5h14l2 5v5h-2M3 17h2M3 12h18M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    briefcase: 'M3 7h18v13H3zM9 7V4h6v3M3 13h18',
    inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
    list: 'M10 6h11M10 12h11M10 18h11M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17',
    idcard: 'M3 5h18v14H3zM7 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0M6 16c.5-1.4 1.7-2 3-2s2.5.6 3 2M14 10h4M14 14h4',
    message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 9h8M8 13h5',
    chart: 'M3 3v18h18M7 16v-4M12 16V8M17 16v-7',
    usercog: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 9-5.2M18 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM18 12.5V15M18 19v2.5M21.5 17H20M16 17h-1.5',
    settings: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
    plus: 'M12 5v14M5 12h14',
    edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z',
    trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
    eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    eyeoff: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22M14.12 14.12a3 3 0 1 1-4.24-4.24',
    x: 'M18 6 6 18M6 6l12 12',
    chevL: 'M15 18l-6-6 6-6',
    chevR: 'M9 18l6-6-6-6',
    chevD: 'M6 9l6 6 6-6',
    logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
    upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
    check: 'M20 6 9 17l-5-5',
    checkcircle: 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
    alert: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
    info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    menu: 'M3 12h18M3 6h18M3 18h18',
    globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
    unlock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.9-1',
    calendar: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
    pen: 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.59 7.59M11 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    send: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z',
    refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
    building: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 10h.01M15 10h.01M12 10h.01',
    star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
    more: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    swap: 'M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16',
    clip: 'M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48',
    coins: 'M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4M16.71 13.88l.7.71-2.82 2.82',
    heart: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z',
    layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    phone: 'M5 2h14v20H5zM11 18h2',
    device: 'M2 4h20v12H2zM8 20h8M12 16v4',
    database: 'M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3zM21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5',
  };

  const U = {};
  U.icon = (name, cls) => `<svg class="i ${cls || ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ICONS.info}"/></svg>`;
  U.starMark = () => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.8l2.9 7.1 7.6.5-5.9 4.9 1.9 7.4L12 17.6l-6.5 4.1 1.9-7.4-5.9-4.9 7.6-.5z"/></svg>';

  U.$ = (s, r) => (r || document).querySelector(s);
  U.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  U.esc = (s) => String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.attr = U.esc;

  /* Vietnamese-aware search normalisation: strips diacritics and đ. */
  U.norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

  /* ----- Numbers & money (Vietnamese conventions: 1.250.000 ₫) ----- */
  const nf = new Intl.NumberFormat('vi-VN');
  U.num = (n) => (n === undefined || n === null || isNaN(n) ? '—' : nf.format(Math.round(n)));
  U.vnd = (n) => (n === undefined || n === null ? '—' : nf.format(Math.round(n)) + ' ₫');
  U.vndShort = (n) => {
    const a = Math.abs(n);
    if (a >= 1e12) return (n / 1e12).toFixed(2).replace('.', ',') + ' nghìn tỷ ₫';
    if (a >= 1e9) return (n / 1e9).toFixed(1).replace('.', ',') + ' tỷ ₫';
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' triệu ₫';
    return U.vnd(n);
  };
  U.short = (n) => {
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(Math.round(n * 10) / 10);
  };
  U.pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

  /* ----- Dates (stored as ISO strings) ----- */
  const pad = (n) => String(n).padStart(2, '0');
  U.isoDate = (d) => { d = d instanceof Date ? d : new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  U.today = () => U.isoDate(new Date());
  U.nowIso = () => new Date().toISOString();
  U.addDays = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() + n); return U.isoDate(d); };
  U.daysBetween = (a, b) => Math.round((new Date(U.isoDate(b)) - new Date(U.isoDate(a))) / 86400000);
  U.date = (iso) => { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d)) return '—'; return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
  U.dateTime = (iso) => { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d)) return '—'; return `${U.date(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  U.age = (dob) => { const b = new Date(dob), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; };
  U.ago = (iso) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return GA.t('just now');
    if (s < 3600) return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 86400 * 30) return Math.floor(s / 86400) + ' d ago';
    return U.date(iso);
  };
  U.monthLabel = (y, m) => ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] + (y !== undefined ? ' ' + String(y).slice(2) : '');
  U.lastMonths = (n) => {
    const out = [], d = new Date(); d.setDate(1);
    for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push({ y: x.getFullYear(), m: x.getMonth(), key: `${x.getFullYear()}-${pad(x.getMonth() + 1)}` }); }
    return out;
  };
  /* Deadline cell: shows overdue / due soon */
  U.deadline = (iso, done) => {
    if (!iso) return '—';
    if (done) return `<span class="nowrap">${U.date(iso)}</span>`;
    const left = U.daysBetween(U.today(), iso);
    if (left < 0) return `<span class="nowrap overdue">${U.date(iso)}</span><span class="sub overdue">${-left} ${GA.t('days overdue')}</span>`;
    if (left <= 2) return `<span class="nowrap due-soon">${U.date(iso)}</span><span class="sub due-soon">${left === 0 ? GA.t('Due today') : left + ' ' + GA.t('days left')}</span>`;
    return `<span class="nowrap">${U.date(iso)}</span><span class="sub">${left} ${GA.t('days left')}</span>`;
  };

  U.initials = (name) => { const p = String(name || '?').trim().split(/\s+/); return ((p.length > 1 ? p[p.length - 2][0] : '') + p[p.length - 1][0]).toUpperCase(); };
  U.debounce = (fn, ms) => { let t; return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms || 200); }; };
  U.uid = (p) => (p || 'id') + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  U.clone = (o) => JSON.parse(JSON.stringify(o));
  U.groupCount = (arr, fn) => arr.reduce((m, x) => { const k = typeof fn === 'function' ? fn(x) : x[fn]; m[k] = (m[k] || 0) + 1; return m; }, {});
  U.sum = (arr, fn) => arr.reduce((s, x) => s + (typeof fn === 'function' ? fn(x) : x[fn] || 0), 0);
  U.uniq = (arr) => Array.from(new Set(arr)).filter((x) => x !== undefined && x !== null && x !== '');

  U.download = (filename, content, mime) => {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
  };
  U.toCSV = (rows, cols) => {
    const q = (v) => { const s = String(v === undefined || v === null ? '' : v).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const head = cols.map((c) => q(c.label)).join(',');
    const body = rows.map((r) => cols.map((c) => q(c.csv ? c.csv(r) : r[c.key])).join(',')).join('\n');
    return '\uFEFF' + head + '\n' + body;
  };

  /* Address builder honours the configured address model (3-level or 2-level after the 2025 reform). */
  U.address = (o, opts) => {
    if (!o) return '—';
    const two = GA.store && GA.store.setting('addressModel') === '2-level';
    const parts = [o.street, o.ward, two ? null : o.district, (opts && opts.noProvince) ? null : o.province];
    return parts.filter(Boolean).join(', ');
  };

  GA.util = U;
})(window.GA);
