/*
 * Store — in-memory state persisted to localStorage.
 * All collections live in one JSON document so the demo can be exported, imported or reset.
 */
window.GA = window.GA || {};
(function (GA) {
  'use strict';
  const KEY = 'ga.egov.demo.data';
  const SKEY = 'ga.egov.demo.session';
  let state = null;
  let persistent = true;

  function read(k) { try { return localStorage.getItem(k); } catch (e) { persistent = false; return null; } }
  function write(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { persistent = false; return false; } }
  function del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }

  const S = {
    get persistent() { return persistent; },
    get state() { return state; },

    init() {
      const raw = read(KEY);
      if (raw) {
        try {
          const s = JSON.parse(raw);
          if (s && s.version === GA.data.VERSION) { state = s; return; }
        } catch (e) { /* regenerate below */ }
      }
      state = GA.data.generate();
      this.save();
    },
    save() { write(KEY, JSON.stringify(state)); },

    all(c) { return state[c] || (state[c] = []); },
    find(c, id) { return this.all(c).find((x) => x.id === id) || null; },
    where(c, fn) { return this.all(c).filter(fn); },
    insert(c, item) { this.all(c).unshift(item); this.save(); return item; },
    update(c, id, patch) {
      const it = this.find(c, id);
      if (!it) return null;
      Object.assign(it, typeof patch === 'function' ? patch(it) : patch);
      it.updatedAt = new Date().toISOString();
      this.save();
      return it;
    },
    remove(c, id) {
      const arr = this.all(c), i = arr.findIndex((x) => x.id === id);
      if (i > -1) { arr.splice(i, 1); this.save(); return true; }
      return false;
    },
    nextId(c, prefix, width) {
      const n = this.all(c).reduce((m, x) => Math.max(m, parseInt(String(x.id).replace(/\D/g, ''), 10) || 0), 0) + 1;
      return prefix + String(n).padStart(width || 4, '0');
    },

    setting(k, v) {
      if (!state) return undefined;
      if (v === undefined) return state.settings[k];
      state.settings[k] = v; this.save(); return v;
    },

    /* Audit trail */
    log(action, target, detail) {
      const u = GA.app && GA.app.user;
      this.all('audit').unshift({
        id: GA.util.uid('AU'), time: new Date().toISOString(),
        user: u ? u.name : 'System', role: u ? u.role : 'system', action, target: target || '', detail: detail || '',
      });
      if (state.audit.length > 400) state.audit.length = 400;
      this.save();
    },

    /* Notifications: audience 'staff' or a subject id (citizen / business) */
    notify(n) {
      this.all('notifications').unshift(Object.assign({ id: GA.util.uid('NT'), time: new Date().toISOString(), read: false, audience: 'staff', type: 'info' }, n));
      if (state.notifications.length > 120) state.notifications.length = 120;
      this.save();
      if (GA.app && GA.app.refreshBell) GA.app.refreshBell();
    },

    /* Session */
    session() { try { return JSON.parse(read(SKEY) || 'null'); } catch (e) { return null; } },
    setSession(s) { write(SKEY, JSON.stringify(s)); },
    clearSession() { del(SKEY); },

    reset() { state = GA.data.generate(); this.save(); },
    exportJSON() { return JSON.stringify(state, null, 2); },
    importJSON(text) {
      const s = JSON.parse(text);
      if (!s || !s.citizens || !s.settings) throw new Error('This file is not an e-Gov demo data export.');
      s.version = GA.data.VERSION;
      state = s; this.save();
    },
  };

  GA.store = S;
})(window.GA);
