/* =========================================================
   Storage: in-memory store persisted to localStorage.
   The demo timeline is anchored to "today": if the saved data
   was created on an earlier day, every date is shifted forward
   so today's appointments, queues and admissions stay current.
   ========================================================= */
(function () {
  'use strict';
  const HIS = window.HIS;
  const U = HIS.util;
  const KEY = 'mediplus-his-data';
  const SESSION_KEY = 'mediplus-his-session';
  const PREFS_KEY = 'mediplus-his-prefs';

  /* ---------- Tiny event bus ---------- */
  HIS.bus = {
    handlers: {},
    on(evt, fn) { (this.handlers[evt] = this.handlers[evt] || []).push(fn); },
    emit(evt, payload) { (this.handlers[evt] || []).forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } }); }
  };

  const safeGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const safeSet = (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const safeDel = (k) => { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } };

  /* Keys holding real-world dates that must not move with the demo timeline */
  const FIXED_KEYS = new Set(['dob', 'joined', 'contractEnd', 'month', 'manufacturedDate']);
  const DATE_RE = /^\d{4}-\d{2}-\d{2}/;
  function shiftDates(node, days) {
    if (Array.isArray(node)) { node.forEach((n, i) => { if (typeof n === 'string' && DATE_RE.test(n)) node[i] = U.addDays(n.slice(0, 10), days) + n.slice(10); else if (n && typeof n === 'object') shiftDates(n, days); }); return; }
    Object.keys(node).forEach((k) => {
      const v = node[k];
      if (typeof v === 'string' && DATE_RE.test(v) && !FIXED_KEYS.has(k)) node[k] = U.addDays(v.slice(0, 10), days) + v.slice(10);
      else if (v && typeof v === 'object') shiftDates(v, days);
    });
  }

  const S = (HIS.store = {
    data: null,
    storageOk: true,

    load() {
      const raw = safeGet(KEY);
      if (raw) {
        try {
          const d = JSON.parse(raw);
          if (d && d.version === HIS.DATA_VERSION) {
            const delta = U.diffDays(d.anchorDate, U.today());
            if (delta > 0) { shiftDates(d, delta); d.anchorDate = U.today(); }
            this.data = d;
            this.saveNow();
            return;
          }
        } catch (e) { /* corrupted: fall through to fresh seed */ }
      }
      this.data = HIS.seed();
      this.saveNow();
    },
    saveNow() { this.storageOk = safeSet(KEY, JSON.stringify(this.data)); },
    save: null,
    reset() { safeDel(KEY); this.data = HIS.seed(); this.saveNow(); HIS.bus.emit('change'); },

    all(col) { return this.data[col] || (this.data[col] = []); },
    get(col, id) { return this.all(col).find((x) => x.id === id); },
    add(col, obj) { this.all(col).push(obj); this.commit(); return obj; },
    update(col, id, patch) { const x = this.get(col, id); if (x) Object.assign(x, patch); this.commit(); return x; },
    remove(col, id) { this.data[col] = this.all(col).filter((x) => x.id !== id); this.commit(); },
    /** Sequential, human-friendly IDs, e.g. PT-000123 */
    nextId(counter, prefix, pad = 4) {
      const c = this.data.counters;
      c[counter] = (c[counter] || 0) + 1;
      return prefix + String(c[counter]).padStart(pad, '0');
    },
    commit() { this.save(); HIS.bus.emit('change'); },

    /* Session & preferences (separate keys so resetting data keeps you signed in) */
    session() { try { return JSON.parse(safeGet(SESSION_KEY) || 'null'); } catch (e) { return null; } },
    setSession(s) { if (s) safeSet(SESSION_KEY, JSON.stringify(s)); else safeDel(SESSION_KEY); },
    prefs() { try { return JSON.parse(safeGet(PREFS_KEY) || '{}'); } catch (e) { return {}; } },
    setPref(k, v) { const p = this.prefs(); p[k] = v; safeSet(PREFS_KEY, JSON.stringify(p)); }
  });
  S.save = U.debounce(() => S.saveNow(), 250);
})();
