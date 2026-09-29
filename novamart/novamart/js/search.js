/* ==========================================================
   NovaMart – search.js
   Accent-insensitive partial matching + live suggestions.
   ========================================================== */
(function (NM) {
  'use strict';

  const { $, $$, normalize, escapeHTML, formatVND, store, debounce } = NM;

  const POPULAR = ['iPhone', 'laptop', 'giày', 'tai nghe', 'áo sơ mi', 'máy giặt', 'kem chống nắng', 'nồi chiên'];

  const haystack = new Map();
  const indexOf = (p) => {
    if (!haystack.has(p.id)) {
      haystack.set(p.id, normalize([p.name, p.brand, NM.catById[p.category].name, p.tags.join(' ')].join(' ')));
    }
    return haystack.get(p.id);
  };

  /** Returns products where every word of the query appears (partial, accent-insensitive). */
  const searchProducts = (query, list = NM.PRODUCTS) => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return list.slice();
    const q = tokens.join(' ');
    return list
      .filter((p) => tokens.every((t) => indexOf(p).includes(t)))
      .map((p) => {
        const name = normalize(p.name);
        const score = (name.startsWith(q) ? 3 : 0) + (name.includes(q) ? 2 : 0) + p.sold / 100000;
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((x) => x.p);
  };

  /** Wraps the matching part of the (accented) text in <mark>. */
  const highlight = (text, query) => {
    const nText = normalize(text), nQ = normalize(query);
    const i = nQ ? nText.indexOf(nQ) : -1;
    if (i < 0) return escapeHTML(text);
    return escapeHTML(text.slice(0, i)) + '<mark>' + escapeHTML(text.slice(i, i + nQ.length)) + '</mark>' + escapeHTML(text.slice(i + nQ.length));
  };

  const recentSearches = () => store.get('searches', []);
  const saveSearch = (q) => {
    if (!q) return;
    const list = recentSearches().filter((x) => normalize(x) !== normalize(q));
    list.unshift(q);
    store.set('searches', list.slice(0, 6));
  };

  const goSearch = (q) => {
    q = q.trim();
    if (!q) return;
    saveSearch(q);
    location.href = 'products.html?q=' + encodeURIComponent(q);
  };

  const init = () => {
    const form = $('#searchForm');
    const input = $('#searchInput');
    const box = $('#searchSuggest');
    if (!form || !input || !box) return;

    const current = NM.getParam('q');
    if (current) input.value = current;

    let activeIndex = -1;

    const render = () => {
      const q = input.value.trim();
      activeIndex = -1;
      if (!q) {
        const rec = recentSearches();
        box.innerHTML = `
          ${rec.length ? `<div class="suggest__group"><div class="suggest__label">Tìm kiếm gần đây <button type="button" class="link-btn" data-clear-searches>Xóa</button></div>
            <div class="chip-row">${rec.map((r) => `<button type="button" class="chip" data-suggest="${escapeHTML(r)}">${escapeHTML(r)}</button>`).join('')}</div></div>` : ''}
          <div class="suggest__group"><div class="suggest__label">Từ khóa phổ biến</div>
            <div class="chip-row">${POPULAR.map((r) => `<button type="button" class="chip" data-suggest="${r}">${r}</button>`).join('')}</div></div>`;
      } else {
        const results = searchProducts(q);
        const cats = NM.CATEGORIES.filter((c) => normalize(c.name).includes(normalize(q))).slice(0, 2);
        box.innerHTML = `
          <a class="suggest__item suggest__all" href="products.html?q=${encodeURIComponent(q)}" data-suggest-link>
            <span aria-hidden="true">🔍</span> Tìm “<strong>${escapeHTML(q)}</strong>” <small>${results.length} kết quả</small></a>
          ${cats.map((c) => `<a class="suggest__item" href="products.html?cat=${c.id}" data-suggest-link><span aria-hidden="true">${c.icon}</span> Danh mục: ${highlight(c.name, q)}</a>`).join('')}
          ${results.slice(0, 6).map((p) => `
            <a class="suggest__item suggest__product" href="product-detail.html?id=${p.id}" data-suggest-link>
              <img src="${p.image}" alt="" width="40" height="40">
              <span class="suggest__name">${highlight(p.name, q)}</span>
              <span class="suggest__price">${formatVND(NM.priceOf(p))}</span>
            </a>`).join('')}
          ${!results.length ? '<p class="dropdown__empty">Không tìm thấy sản phẩm phù hợp</p>' : ''}`;
      }
      box.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    };

    const close = () => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); };

    input.addEventListener('focus', render);
    input.addEventListener('input', debounce(render, 120));
    input.addEventListener('keydown', (e) => {
      const items = $$('[data-suggest-link]', box);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) return;
        e.preventDefault();
        activeIndex = (activeIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((el, i) => el.classList.toggle('is-active', i === activeIndex));
      } else if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        saveSearch(input.value.trim());
        location.href = items[activeIndex].href;
      } else if (e.key === 'Escape') close();
    });

    form.addEventListener('submit', (e) => { e.preventDefault(); goSearch(input.value); });

    box.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus while clicking
    box.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-suggest]');
      if (chip) goSearch(chip.dataset.suggest);
      if (e.target.closest('[data-clear-searches]')) { store.set('searches', []); render(); }
      if (e.target.closest('[data-suggest-link]')) saveSearch(input.value.trim());
    });
    input.addEventListener('blur', () => setTimeout(close, 120));
  };

  NM.Search = { init, searchProducts, highlight, saveSearch, POPULAR };
})(window.NM);
