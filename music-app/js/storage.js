/* =========================================================
   storage.js
   Small, failure-tolerant wrapper around localStorage.
   Private browsing, full quotas or disabled storage never break
   the app: reads fall back to defaults and writes return false.
   Exposed as window.AppStorage
   ========================================================= */
(function () {
  'use strict';

  const PREFIX = 'song:';

  const KEYS = Object.freeze({
    theme: 'theme',
    favorites: 'favorites',
    playlists: 'playlists',
    recent: 'recent',
    player: 'player',
    durations: 'durations',
  });

  function get(key, fallback) {
    try {
      const raw = window.localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('[storage] Could not save', key, err);
      return false;
    }
  }

  function remove(key) {
    try {
      window.localStorage.removeItem(PREFIX + key);
    } catch (err) { /* ignore */ }
  }

  function clearAll() {
    Object.values(KEYS).forEach(remove);
  }

  window.AppStorage = { KEYS, get, set, remove, clearAll };
})();
