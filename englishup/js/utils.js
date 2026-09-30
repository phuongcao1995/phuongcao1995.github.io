/* EnglishUp — shared utilities */
'use strict';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const Store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } },
  remove(k) { try { localStorage.removeItem(k); } catch (e) { } }
};

const pad = n => String(n).padStart(2, '0');
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtVND = n => n === 0 ? '0đ' : Number(n).toLocaleString('en-US') + 'đ';
const fmtNum = n => Number(n).toLocaleString('en-US');
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (arr, n) => shuffle(arr).slice(0, n);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const params = () => new URLSearchParams(location.search);
const initials = name => (name || 'U').trim().split(/\s+/).map(w => w[0]).slice(-2).join('').toUpperCase();
/* Vietnamese names: given name is the last word ("Nguyen Thi Phuong" -> "Phuong") */
const givenName = name => (name || 'there').trim().split(/\s+/).pop();
const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- Icons (inline SVG, stroke-based) ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
  wave: '<path d="M2 12h1M6 8v8M10 4v16M14 7v10M18 9v6M21 12h1"/>',
  cards: '<rect x="2" y="6" width="14" height="16" rx="2"/><path d="M8 2h12a2 2 0 0 1 2 2v14"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1v-7h3zM3 19a2 2 0 0 0 2 2h1v-7H3z"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  crown: '<path d="m2 7 5 4 5-7 5 7 5-4-2 12H4z"/>',
  settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>',
  replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
  sparkles: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 3.1a4 4 0 0 1 0 7.8M22 21a7 7 0 0 0-4-6.3"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  filter: '<path d="M3 4h18l-7 8.5V19l-4 2v-8.5z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  compare: '<path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4"/>',
  translate: '<path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  slow: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'
};
const icon = (name, size = 20, cls = '') =>
  `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ---------- Toasts ---------- */
function toast(msg, type = 'info', ms = 3000) {
  let wrap = $('#toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    wrap.className = 'toast-wrap';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    document.body.appendChild(wrap);
  }
  const sym = { success: '✓', error: '!', info: 'i', xp: '⚡', warning: '!' }[type] || 'i';
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<span class="toast-icon" aria-hidden="true">${sym}</span><span class="toast-msg">${msg}</span>`;
  wrap.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, ms);
}

/* ---------- Modal ---------- */
let _modalCloser = null;
function openModal({ title = '', body = '', actions = [], size = '', onOpen } = {}) {
  if (_modalCloser) _modalCloser();
  const prevFocus = document.activeElement;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const id = 'modal-title-' + Date.now();
  overlay.innerHTML = `
    <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="${id}">
      <div class="modal-head">
        <h2 class="modal-title" id="${id}">${title}</h2>
        <button class="icon-btn modal-close" aria-label="Close dialog">${icon('x')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${actions.length ? `<div class="modal-foot">${actions.map((a, i) => `<button class="btn ${a.cls || 'btn-secondary'}" data-act="${i}">${a.label}</button>`).join('')}</div>` : ''}
    </div>`;
  document.body.appendChild(overlay);
  document.body.classList.add('no-scroll');
  requestAnimationFrame(() => overlay.classList.add('show'));
  const close = () => {
    overlay.classList.remove('show');
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', onKey);
    setTimeout(() => overlay.remove(), 200);
    _modalCloser = null;
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  };
  const onKey = e => {
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') { // focus trap
      const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', overlay).filter(x => !x.disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener('keydown', onKey);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  $('.modal-close', overlay).addEventListener('click', close);
  actions.forEach((a, i) => {
    $(`[data-act="${i}"]`, overlay).addEventListener('click', () => { if (a.onClick) { if (a.onClick(close, overlay) !== false) close(); } else close(); });
  });
  _modalCloser = close;
  const focusable = $('input, select, textarea', overlay) || $('.modal-foot .btn', overlay) || $('.modal-close', overlay);
  setTimeout(() => focusable && focusable.focus(), 50);
  if (onOpen) onOpen(overlay, close);
  return { el: overlay, close };
}

/* ---------- Text-to-speech (used as the audio engine for this static app) ---------- */
let _voice = null;
function pickVoice() {
  if (_voice || !('speechSynthesis' in window)) return _voice;
  const vs = speechSynthesis.getVoices();
  _voice = vs.find(v => /en-US/i.test(v.lang) && /Google|Samantha|Aria|Jenny/i.test(v.name)) || vs.find(v => /en-US/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
  return _voice;
}
if ('speechSynthesis' in window) { speechSynthesis.onvoiceschanged = () => { _voice = null; pickVoice(); }; }

function speak(text, { rate, onend, onstart } = {}) {
  const st = window.App && App.state;
  if (st && st.settings && !st.settings.sound) {
    toast('Sound is turned off. Bật âm thanh trong Settings.', 'warning');
    if (onend) setTimeout(onend, 200);
    return null;
  }
  if (!('speechSynthesis' in window)) {
    toast('Your browser does not support audio playback. Trình duyệt không hỗ trợ đọc văn bản.', 'error');
    if (onend) setTimeout(onend, 200);
    return null;
  }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate ?? (st && st.settings ? st.settings.speed : 1);
  const v = pickVoice();
  if (v) u.voice = v;
  if (onend) { u.onend = onend; u.onerror = onend; }
  if (onstart) u.onstart = onstart;
  speechSynthesis.speak(u);
  return u;
}
const stopSpeaking = () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); };
window.addEventListener('beforeunload', stopSpeaking);

/* ---------- Charts (pure CSS / SVG) ---------- */
function barChart(el, data, { unit = 'min', highlight = -1 } = {}) {
  const max = Math.max(...data.map(d => d.value), 1) * 1.15;
  const label = data.map(d => `${d.label} ${d.value} ${unit}`).join(', ');
  el.innerHTML = `<div class="bar-chart" role="img" aria-label="${esc(label)}">${data.map((d, i) => `
    <div class="bar-col ${i === highlight ? 'is-today' : ''}">
      <span class="bar-val">${d.value}</span>
      <div class="bar-track"><div class="bar" style="height:${(d.value / max * 100).toFixed(1)}%"></div></div>
      <span class="bar-label">${esc(d.label)}</span>
    </div>`).join('')}</div>`;
}

function lineChart(el, values, { labels = [], suffix = '', color = 'var(--primary)', min, max } = {}) {
  const W = 320, H = 150, P = 18;
  const lo = min ?? Math.min(...values) * 0.9, hi = max ?? Math.max(...values) * 1.05;
  const x = i => P + i * (W - P * 2) / Math.max(values.length - 1, 1);
  const y = v => H - P - (v - lo) / (hi - lo || 1) * (H - P * 2);
  const pts = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `M${x(0)},${H - P} L${pts.split(' ').join(' L')} L${x(values.length - 1)},${H - P} Z`;
  el.innerHTML = `
    <svg class="line-chart" viewBox="0 0 ${W} ${H + 16}" role="img" aria-label="${esc(values.map((v, i) => `${labels[i] || i + 1}: ${v}${suffix}`).join(', '))}">
      ${[0, 1, 2, 3].map(g => `<line x1="${P}" x2="${W - P}" y1="${P + g * (H - P * 2) / 3}" y2="${P + g * (H - P * 2) / 3}" class="grid-line"/>`).join('')}
      <path d="${area}" fill="${color}" opacity=".10"/>
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="var(--surface)" stroke="${color}" stroke-width="2"><title>${labels[i] || ''} ${v}${suffix}</title></circle>`).join('')}
      ${labels.map((l, i) => `<text x="${x(i)}" y="${H + 10}" text-anchor="middle" class="chart-label">${esc(l)}</text>`).join('')}
      <text x="${x(values.length - 1)}" y="${y(values[values.length - 1]) - 9}" text-anchor="end" class="chart-value">${values[values.length - 1]}${suffix}</text>
    </svg>`;
}

function ring(pct, { size = 120, stroke = 10, color = 'var(--primary)', label = '', sub = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(pct, 0, 100) / 100);
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="var(--ring-track)" stroke-width="${stroke}" fill="none"/>
      <circle class="ring-bar" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    </svg>
    <div class="ring-text"><strong>${label}</strong>${sub ? `<span>${sub}</span>` : ''}</div>
  </div>`;
}

const progressBar = (pct, cls = '') => `<div class="progress ${cls}" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${clamp(pct, 0, 100)}%"></span></div>`;

const stars = r => `<span class="stars" aria-label="Rated ${r} out of 5">★ ${r.toFixed(1)}</span>`;

const emptyState = (emoji, title, text, action = '') =>
  `<div class="empty-state"><div class="empty-emoji" aria-hidden="true">${emoji}</div><h3>${title}</h3><p>${text}</p>${action}</div>`;
