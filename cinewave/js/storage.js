/* CineWave — storage.js
   Thin, failure-safe wrapper around localStorage. Global keys are shared by every profile;
   "p:" keys are namespaced per profile (list, history/continue-watching). */
const Store = (() => {
  const NS = "cw:";
  const mem = {};
  const raw = {
    get(k) { try { return localStorage.getItem(NS + k); } catch (e) { return mem[k] ?? null; } },
    set(k, v) { try { localStorage.setItem(NS + k, v); } catch (e) { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(NS + k); } catch (e) { delete mem[k]; } },
  };
  const get = (k, d) => { const v = raw.get(k); if (v == null) return d; try { return JSON.parse(v); } catch (e) { return d; } };
  const set = (k, v) => raw.set(k, JSON.stringify(v));

  /* ---------- profiles ---------- */
  const DEFAULT_PROFILES = [
    { id: "personal", name: "Personal", kids: false, hue: 265 },
    { id: "kids", name: "Kids", kids: true, hue: 40 },
    { id: "guest", name: "Guest", kids: false, hue: 190 },
  ];
  const profiles = () => get("profiles", DEFAULT_PROFILES);
  const activeProfile = () => profiles().find((p) => p.id === get("profile", "personal")) || profiles()[0];
  const setProfile = (id) => set("profile", id);
  const renameProfile = (id, name) => set("profiles", profiles().map((p) => (p.id === id ? { ...p, name } : p)));

  const pkey = (k) => `p:${activeProfile().id}:${k}`;
  const pget = (k, d) => get(pkey(k), d);
  const pset = (k, v) => set(pkey(k), v);

  /* ---------- My List ---------- */
  const getList = () => pget("list", []);
  const inList = (id) => getList().some((x) => x.id === id);
  function toggleList(id) {
    const list = getList();
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list.splice(i, 1); else list.unshift({ id, at: Date.now() });
    pset("list", list);
    return i < 0;
  }

  /* ---------- Watch history == continue watching (one source of truth) ---------- */
  const getHistory = () => pget("history", []);
  const hKey = (h) => `${h.id}:${h.s || 0}:${h.e || 0}`;
  function saveProgress(id, s, e, pct) {
    const list = getHistory();
    const entry = { id, s: s || 0, e: e || 0, pct: Math.max(0, Math.min(1, pct)), at: Date.now() };
    const i = list.findIndex((h) => hKey(h) === hKey(entry));
    if (i >= 0) list.splice(i, 1);
    list.unshift(entry);
    pset("history", list.slice(0, 100));
  }
  const removeHistory = (key) => pset("history", getHistory().filter((h) => hKey(h) !== key));
  const clearHistory = () => pset("history", []);
  const getProgress = (id, s, e) => getHistory().find((h) => h.id === id && h.s === (s || 0) && h.e === (e || 0));
  /* latest unfinished entry per title */
  function continueWatching() {
    const seen = new Set();
    return getHistory().filter((h) => {
      if (seen.has(h.id)) return false;
      seen.add(h.id);
      return h.pct > 0.01 && h.pct < 0.95;
    });
  }

  /* ---------- Recent searches ---------- */
  const getSearches = () => get("searches", []);
  function addSearch(q) {
    q = q.trim();
    if (!q) return;
    set("searches", [q, ...getSearches().filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8));
  }
  const clearSearches = () => set("searches", []);

  /* ---------- Settings / plan / notifications ---------- */
  const DEFAULT_SETTINGS = { autoNext: true, subtitle: "Off", quality: "Auto", reduceMotion: false };
  const settings = () => ({ ...DEFAULT_SETTINGS, ...get("settings", {}) });
  const setSetting = (k, v) => set("settings", { ...settings(), [k]: v });
  const plan = () => get("plan", "standard");
  const setPlan = (p) => set("plan", p);

  const notifications = () => get("notifs", []);
  const saveNotifications = (n) => set("notifs", n);

  /* ---------- Demo seed: makes a fresh visit look "lived in" ---------- */
  function seed() {
    if (get("seeded", false)) return;
    const H = 3600e3, now = Date.now();
    set("p:personal:list", [1, 18, 32, 6, 27].map((id, i) => ({ id, at: now - i * H })));
    set("p:personal:history", [
      { id: 1, s: 0, e: 0, pct: 0.72, at: now - 2 * H },
      { id: 3, s: 1, e: 2, pct: 0.4, at: now - 20 * H },
      { id: 7, s: 1, e: 1, pct: 0.65, at: now - 30 * H },
      { id: 24, s: 1, e: 2, pct: 0.55, at: now - 50 * H },
      { id: 2, s: 0, e: 0, pct: 1, at: now - 96 * H },
      { id: 25, s: 0, e: 0, pct: 1, at: now - 140 * H },
    ]);
    set("notifs", [
      { id: 1, icon: "tv", text: "New episode available: Monsoon Hearts S1 · E3", at: now - 1 * H, read: false },
      { id: 2, icon: "film", text: "The Last Journey is now available in 4K", at: now - 5 * H, read: false },
      { id: 3, icon: "plus", text: "12 new movies added this week", at: now - 26 * H, read: false },
      { id: 4, icon: "check", text: "Your watchlist has been updated", at: now - 70 * H, read: true },
    ]);
    set("seeded", true);
  }

  function resetAll() {
    try { Object.keys(localStorage).filter((k) => k.startsWith(NS)).forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    try { sessionStorage.removeItem(NS + "session"); } catch (e) {}
  }

  seed();
  return {
    get, set, profiles, activeProfile, setProfile, renameProfile, pget, pset,
    getList, inList, toggleList, getHistory, hKey, saveProgress, removeHistory, clearHistory, getProgress, continueWatching,
    getSearches, addSearch, clearSearches, settings, setSetting, plan, setPlan, notifications, saveNotifications, resetAll,
  };
})();
