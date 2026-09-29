/* ==========================================================
   NovaMart – utils.js
   Shared helpers: formatting, storage, DOM, toasts, modals,
   generated SVG product imagery.
   ========================================================== */
(function (global) {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Formatting ---------- */
  const formatVND = (n) => '₫' + Math.round(n).toLocaleString('vi-VN');

  const formatShort = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '').replace('.', ',') + 'tr';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '').replace('.', ',') + 'k';
    return String(n);
  };

  const formatDate = (ts, withTime = true) => {
    const d = new Date(ts);
    const pad = (x) => String(x).padStart(2, '0');
    const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
    return withTime ? `${pad(d.getHours())}:${pad(d.getMinutes())} ${date}` : date;
  };

  const escapeHTML = (str) =>
    String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Remove Vietnamese diacritics so "giay" matches "giày". */
  const normalize = (str) =>
    String(str).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();

  const debounce = (fn, wait = 200) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  const getParam = (key) => new URLSearchParams(location.search).get(key);

  /* ---------- Storage (safe) ---------- */
  const store = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem('nm_' + key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem('nm_' + key, JSON.stringify(value)); } catch (e) { /* storage full / blocked */ }
    },
    remove(key) {
      try { localStorage.removeItem('nm_' + key); } catch (e) { /* ignore */ }
    }
  };

  /* ---------- Seeded random (stable mock reviews) ---------- */
  const seeded = (seed) => {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  };

  /* ---------- Stars ---------- */
  const stars = (rating) => {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5 ? 1 : 0;
    let html = '';
    for (let i = 0; i < 5; i++) {
      const cls = i < full ? 'on' : i === full && half ? 'half' : '';
      html += `<span class="star ${cls}" aria-hidden="true">★</span>`;
    }
    return `<span class="stars" role="img" aria-label="${rating} trên 5 sao">${html}</span>`;
  };

  /* ---------- Generated SVG images ---------- */
  const svgURI = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  /**
   * Builds a product illustration: a soft two-tone backdrop,
   * an emoji "object", a floor shadow and a small brand tag.
   */
  const productSVG = (emoji, hue, brand, variant = 0) => {
    const angles = [135, 45, 200, 320];
    const shifts = [0, 18, -14, 32];
    const h = (hue + shifts[variant % 4] + 360) % 360;
    const a = angles[variant % 4];
    const scale = [1, 0.82, 1.12, 0.9][variant % 4];
    const ex = [200, 212, 196, 188][variant % 4];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
<defs><linearGradient id="g" gradientTransform="rotate(${a} .5 .5)">
<stop offset="0" stop-color="hsl(${h},85%,95%)"/><stop offset="1" stop-color="hsl(${(h + 30) % 360},80%,86%)"/></linearGradient>
<radialGradient id="s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="hsla(${h},40%,30%,.28)"/><stop offset="1" stop-color="hsla(${h},40%,30%,0)"/></radialGradient></defs>
<rect width="400" height="400" fill="url(#g)"/>
<circle cx="${320 - variant * 30}" cy="${80 + variant * 20}" r="${60 + variant * 8}" fill="hsla(${h},90%,99%,.55)"/>
<ellipse cx="${ex}" cy="318" rx="${110 * scale}" ry="18" fill="url(#s)"/>
<text x="${ex}" y="${250 + (scale - 1) * 40}" font-size="${170 * scale}" text-anchor="middle" font-family="Apple Color Emoji,Segoe UI Emoji,Noto Color Emoji,sans-serif">${emoji}</text>
<rect x="20" y="352" rx="12" width="${Math.max(80, brand.length * 11 + 28)}" height="28" fill="hsla(0,0%,100%,.8)"/>
<text x="34" y="371" font-size="15" font-weight="700" fill="hsl(${h},35%,28%)" font-family="Be Vietnam Pro,Segoe UI,sans-serif">${escapeHTML(brand)}</text>
</svg>`;
    return svgURI(svg);
  };

  const avatarSVG = (name, hue) => {
    const initials = name.split(' ').slice(-1)[0].charAt(0).toUpperCase();
    return svgURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="hsl(${hue},70%,88%)"/><text x="40" y="52" font-size="34" font-weight="700" text-anchor="middle" fill="hsl(${hue},45%,32%)" font-family="Be Vietnam Pro,Segoe UI,sans-serif">${escapeHTML(initials)}</text></svg>`);
  };

  /* ---------- Toasts ---------- */
  let toastWrap;
  const toast = (message, type = 'success') => {
    if (!toastWrap) {
      toastWrap = document.createElement('div');
      toastWrap.className = 'toast-wrap';
      toastWrap.setAttribute('role', 'status');
      toastWrap.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastWrap);
    }
    const icons = { success: '✓', error: '!', info: 'i' };
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<span class="toast__icon" aria-hidden="true">${icons[type] || '✓'}</span><span>${escapeHTML(message)}</span>`;
    toastWrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2600);
  };

  /* ---------- Modal ---------- */
  let lastFocus = null;
  const closeModal = () => {
    const m = $('.modal-backdrop');
    if (!m) return;
    m.classList.remove('open');
    document.body.classList.remove('no-scroll');
    setTimeout(() => m.remove(), 200);
    if (lastFocus) lastFocus.focus();
  };

  /**
   * openModal({ title, body (html), actions: [{label, variant, value}], onAction, size })
   * Returns the modal element.
   */
  const openModal = ({ title, body, actions = [], onAction, size = '' }) => {
    closeModal();
    lastFocus = document.activeElement;
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop';
    wrap.innerHTML = `
      <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
        <div class="modal__head">
          <h2 id="modalTitle">${title}</h2>
          <button class="icon-btn modal__close" type="button" aria-label="Đóng">✕</button>
        </div>
        <div class="modal__body">${body}</div>
        ${actions.length ? `<div class="modal__foot">${actions.map((a, i) =>
          `<button type="button" class="btn ${a.variant || 'btn--ghost'}" data-modal-action="${i}">${a.label}</button>`).join('')}</div>` : ''}
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(() => wrap.classList.add('open'));

    wrap.addEventListener('click', (e) => {
      if (e.target === wrap || e.target.closest('.modal__close')) return closeModal();
      const btn = e.target.closest('[data-modal-action]');
      if (btn) {
        const action = actions[Number(btn.dataset.modalAction)];
        const keepOpen = onAction ? onAction(action.value, wrap) === false : false;
        if (!keepOpen) closeModal();
      }
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Tab') { // simple focus trap
        const f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', wrap).filter((x) => !x.disabled);
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });
    setTimeout(() => {
      const first = $('input, select, textarea', wrap) || $('[data-modal-action]:last-child', wrap) || $('.modal__close', wrap);
      if (first) first.focus();
    }, 50);
    return wrap;
  };

  /** Promise-based confirmation dialog. */
  const confirmDialog = (message, { title = 'Xác nhận', okLabel = 'Đồng ý', danger = false } = {}) =>
    new Promise((resolve) => {
      let answered = false;
      const m = openModal({
        title,
        body: `<p class="modal__text">${message}</p>`,
        size: 'modal--sm',
        actions: [
          { label: 'Hủy', variant: 'btn--ghost', value: false },
          { label: okLabel, variant: danger ? 'btn--danger' : 'btn--primary', value: true }
        ],
        onAction: (v) => { answered = true; resolve(v); }
      });
      const obs = new MutationObserver(() => {
        if (!document.body.contains(m)) { obs.disconnect(); if (!answered) resolve(false); }
      });
      obs.observe(document.body, { childList: true });
    });

  /* ---------- Loading overlay ---------- */
  const loading = (show, text = 'Đang xử lý...') => {
    let el = $('.loading-overlay');
    if (show) {
      if (!el) {
        el = document.createElement('div');
        el.className = 'loading-overlay';
        el.setAttribute('role', 'alert');
        el.setAttribute('aria-busy', 'true');
        document.body.appendChild(el);
      }
      el.innerHTML = `<div class="loading-box"><span class="spinner" aria-hidden="true"></span><p>${escapeHTML(text)}</p></div>`;
      requestAnimationFrame(() => el.classList.add('show'));
    } else if (el) {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 200);
    }
  };

  /* ---------- Countdown ---------- */
  /** End of the current 3-hour flash-sale slot. */
  const flashSaleEnd = () => {
    const now = new Date();
    const end = new Date(now);
    end.setMinutes(0, 0, 0);
    end.setHours(Math.floor(now.getHours() / 3) * 3 + 3);
    return end.getTime();
  };

  const splitTime = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((x) => String(x).padStart(2, '0'));
  };

  /** Keeps every [data-countdown] element on the page ticking. */
  const startCountdowns = () => {
    const tick = () => {
      const [h, m, s] = splitTime(flashSaleEnd() - Date.now());
      $$('[data-countdown]').forEach((el) => {
        const boxes = $$('.cd-box', el);
        if (boxes.length === 3) { boxes[0].textContent = h; boxes[1].textContent = m; boxes[2].textContent = s; }
        else el.textContent = `${h}:${m}:${s}`;
        el.setAttribute('aria-label', `Còn ${h} giờ ${m} phút ${s} giây`);
      });
    };
    tick();
    setInterval(tick, 1000);
  };

  const countdownHTML = (extraClass = '') =>
    `<span class="countdown ${extraClass}" data-countdown role="timer"><span class="cd-box">00</span><i>:</i><span class="cd-box">00</span><i>:</i><span class="cd-box">00</span></span>`;

  global.NM = global.NM || {};
  Object.assign(global.NM, {
    $, $$, formatVND, formatShort, formatDate, escapeHTML, normalize, debounce, getParam,
    store, seeded, stars, productSVG, avatarSVG, svgURI, toast, openModal, closeModal,
    confirmDialog, loading, flashSaleEnd, startCountdowns, countdownHTML
  });
})(window);
