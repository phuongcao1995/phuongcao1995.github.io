/* ==========================================================================
   NEXUS ERP — storage.js
   localStorage persistence helpers + a tiny in-memory "database" with CRUD
   and a simulated async API layer.
   ========================================================================== */
'use strict';

const STORAGE_PREFIX = 'nexus_erp_';

function saveData(key, value) {
  try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); return true; } catch (e) { console.warn('saveData failed', key, e); return false; }
}
function loadData(key, fallback = null) {
  try { const v = localStorage.getItem(STORAGE_PREFIX + key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
}
function removeData(key) { try { localStorage.removeItem(STORAGE_PREFIX + key); } catch (e) { /* ignore */ } }
function clearData() {
  try { Object.keys(localStorage).filter((k) => k.startsWith(STORAGE_PREFIX)).forEach((k) => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
}

const COLLECTIONS = [
  'settings', 'users', 'roles', 'employees', 'customers', 'suppliers', 'products', 'warehouses',
  'quotations', 'orders', 'invoices', 'payments', 'purchaseRequests', 'purchaseOrders', 'receipts', 'bills',
  'expenses', 'projects', 'tasks', 'movements', 'accounts', 'journals', 'notifications', 'activity',
];

const DB = {
  data: {},
  batching: false, // when true, writes to localStorage are deferred (used while seeding)

  init() {
    const valid = loadData('version') === DATA_VERSION && COLLECTIONS.every((c) => loadData(c) !== null);
    if (valid) COLLECTIONS.forEach((c) => { this.data[c] = loadData(c); });
    else this.reset();
  },
  reset() {
    this.batching = true;
    Seed.generate(this.data);
    this.batching = false;
    this.saveAll();
    saveData('version', DATA_VERSION);
  },
  saveAll() { COLLECTIONS.forEach((c) => this.save(c)); },
  save(c) {
    if (this.batching) return;
    if (!saveData(c, this.data[c]) && typeof showToast === 'function') showToast('Unable to save record — browser storage is full.', 'error');
  },
  all(c) { return this.data[c] || []; },
  get(c, id) { return this.all(c).find((r) => r.id === id) || null; },
  insert(c, rec) { this.data[c].push(rec); this.save(c); return rec; },
  update(c, id, patch) { const r = this.get(c, id); if (!r) return null; Object.assign(r, patch); this.save(c); return r; },
  remove(c, id) {
    const i = this.all(c).findIndex((r) => r.id === id);
    if (i < 0) return false;
    this.data[c].splice(i, 1); this.save(c); return true;
  },
  /** Generates the next sequential id for a prefix, e.g. nextId('customers','CUS-',3) → CUS-021 */
  nextId(c, prefix, width = 3) {
    let max = 0;
    for (const r of this.all(c)) {
      const id = String(r.id);
      if (id.startsWith(prefix)) { const n = parseInt(id.slice(prefix.length), 10); if (n > max) max = n; }
    }
    return prefix + String(max + 1).padStart(width, '0');
  },
  /** Activity log (audit trail) */
  log(action, ref = '', ts) {
    const entry = { id: uid(), ts: ts || new Date().toISOString(), user: (typeof Auth !== 'undefined' && Auth.user()?.name) || 'System', action, ref };
    this.data.activity.unshift(entry);
    if (this.data.activity.length > 400) this.data.activity.length = 400;
    this.save('activity');
  },
};

/** Simulated API: wraps synchronous work in a promise with latency, to drive loading states. */
const API = {
  request(fn, delay = 160) {
    return new Promise((resolve, reject) => setTimeout(() => { try { resolve(fn()); } catch (e) { reject(e); } }, delay));
  },
};
