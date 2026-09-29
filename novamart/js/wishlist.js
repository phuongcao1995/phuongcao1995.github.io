/* ==========================================================
   NovaMart – wishlist.js
   Wishlist + recently viewed (both persisted in localStorage).
   ========================================================== */
(function (NM) {
  'use strict';

  const { store, toast, $$ } = NM;

  const Wishlist = {
    all() { return store.get('wishlist', []).filter((id) => NM.productById[id]); },
    has(id) { return Wishlist.all().includes(id); },
    toggle(id) {
      const list = Wishlist.all();
      const i = list.indexOf(id);
      if (i >= 0) { list.splice(i, 1); toast('Đã bỏ khỏi danh sách yêu thích', 'info'); }
      else { list.unshift(id); toast('Đã thêm vào danh sách yêu thích'); }
      store.set('wishlist', list);
      Wishlist.sync();
      document.dispatchEvent(new CustomEvent('nm:wishlist'));
      return i < 0;
    },
    remove(id) {
      store.set('wishlist', Wishlist.all().filter((x) => x !== id));
      Wishlist.sync();
      document.dispatchEvent(new CustomEvent('nm:wishlist'));
    },
    moveToCart(id) {
      NM.Cart.add(id, 1);
      Wishlist.remove(id);
    },
    /** Refresh every heart button on the page. */
    sync() {
      const set = new Set(Wishlist.all());
      $$('[data-action="toggle-wish"]').forEach((btn) => {
        const on = set.has(btn.dataset.id);
        btn.classList.toggle('is-on', on);
        btn.setAttribute('aria-pressed', String(on));
      });
    }
  };

  const Recent = {
    MAX: 12,
    all() { return store.get('recent', []).filter((id) => NM.productById[id]); },
    track(id) {
      const list = Recent.all().filter((x) => x !== id);
      list.unshift(id);
      store.set('recent', list.slice(0, Recent.MAX));
    },
    clear() { store.set('recent', []); }
  };

  NM.Wishlist = Wishlist;
  NM.Recent = Recent;
})(window.NM);
