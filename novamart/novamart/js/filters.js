/* ==========================================================
   NovaMart – filters.js
   Client-side filtering, sorting and the listing page.
   ========================================================== */
(function (NM) {
  'use strict';

  const { $, $$, escapeHTML, formatVND } = NM;
  const PAGE_SIZE = 20;

  const SECTIONS = {
    flash: { title: 'Flash Sale', icon: '⚡' },
    best: { title: 'Bán chạy nhất', icon: '🏆' },
    new: { title: 'Hàng mới về', icon: '✨' },
    mall: { title: 'NovaMall – Chính hãng', icon: '🏬' },
    deal: { title: 'Siêu giảm giá từ 30%', icon: '🏷️' }
  };

  const SORTS = [
    { id: 'popular', label: 'Phổ biến' },
    { id: 'best', label: 'Bán chạy' },
    { id: 'newest', label: 'Mới nhất' },
    { id: 'rating', label: 'Đánh giá cao' }
  ];

  const PRICE_PRESETS = [
    { label: 'Dưới ₫500K', min: 0, max: 500000 },
    { label: '₫500K – ₫2tr', min: 500000, max: 2000000 },
    { label: '₫2tr – ₫10tr', min: 2000000, max: 10000000 },
    { label: 'Trên ₫10tr', min: 10000000, max: 0 }
  ];

  const readState = () => {
    const u = new URLSearchParams(location.search);
    const section = u.get('section') || '';
    return {
      q: u.get('q') || '',
      cat: u.get('cat') || '',
      section,
      min: Number(u.get('min')) || 0,
      max: Number(u.get('max')) || 0,
      rating: Number(u.get('rating')) || 0,
      brands: u.get('brands') ? u.get('brands').split(',') : [],
      discount: Number(u.get('discount')) || 0,
      freeShip: u.get('freeship') === '1',
      mall: u.get('mall') === '1' || section === 'mall',
      sort: u.get('sort') || (section === 'best' ? 'best' : section === 'new' ? 'newest' : 'popular'),
      page: 1
    };
  };

  const writeState = (s) => {
    const u = new URLSearchParams();
    if (s.q) u.set('q', s.q);
    if (s.cat) u.set('cat', s.cat);
    if (s.section) u.set('section', s.section);
    if (s.min) u.set('min', s.min);
    if (s.max) u.set('max', s.max);
    if (s.rating) u.set('rating', s.rating);
    if (s.brands.length) u.set('brands', s.brands.join(','));
    if (s.discount) u.set('discount', s.discount);
    if (s.freeShip) u.set('freeship', '1');
    if (s.mall && s.section !== 'mall') u.set('mall', '1');
    if (s.sort !== 'popular') u.set('sort', s.sort);
    const qs = u.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  };

  /** Base set = search + category + section (brands are derived from this). */
  const baseSet = (s) => {
    let list = s.q ? NM.Search.searchProducts(s.q) : NM.PRODUCTS.slice();
    if (s.cat) list = list.filter((p) => p.category === s.cat);
    if (s.section === 'flash') list = list.filter((p) => NM.flashById[p.id]);
    if (s.section === 'deal') list = list.filter((p) => p.discount >= 30);
    return list;
  };

  const applyFilters = (list, s) => list.filter((p) => {
    const price = NM.priceOf(p);
    if (s.min && price < s.min) return false;
    if (s.max && price > s.max) return false;
    if (s.rating && p.rating < s.rating) return false;
    if (s.brands.length && !s.brands.includes(p.brand)) return false;
    if (s.discount && p.discount < s.discount) return false;
    if (s.freeShip && !p.freeShipping) return false;
    if (s.mall && !p.mall) return false;
    return true;
  });

  const sortList = (list, sort, keepSearchOrder) => {
    const by = {
      popular: (a, b) => (b.rating * Math.log10(b.reviewCount + 10) + b.sold / 20000) - (a.rating * Math.log10(a.reviewCount + 10) + a.sold / 20000),
      best: (a, b) => b.sold - a.sold,
      newest: (a, b) => b.addedAt - a.addedAt,
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      'price-asc': (a, b) => NM.priceOf(a) - NM.priceOf(b),
      'price-desc': (a, b) => NM.priceOf(b) - NM.priceOf(a)
    };
    if (sort === 'popular' && keepSearchOrder) return list;
    return list.slice().sort(by[sort] || by.popular);
  };

  /* ---------- Rendering ---------- */
  const sidebarHTML = (s, base) => {
    const catCounts = {};
    (s.q ? NM.Search.searchProducts(s.q) : NM.PRODUCTS).forEach((p) => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });
    const brandCounts = {};
    base.forEach((p) => { brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1; });
    const brands = Object.keys(brandCounts).sort((a, b) => brandCounts[b] - brandCounts[a]);

    return `
      <div class="filter-head">
        <h2>Bộ lọc</h2>
        <button type="button" class="icon-btn filter-close" data-filter="close" aria-label="Đóng bộ lọc">✕</button>
      </div>
      <fieldset class="filter-group">
        <legend>Danh mục</legend>
        <ul class="filter-cats">
          <li><button type="button" class="${!s.cat ? 'is-active' : ''}" data-filter="cat" data-value="">Tất cả danh mục</button></li>
          ${NM.CATEGORIES.map((c) => `<li><button type="button" class="${s.cat === c.id ? 'is-active' : ''}" data-filter="cat" data-value="${c.id}">
            <span aria-hidden="true">${c.icon}</span> ${c.name}<small>${catCounts[c.id] || 0}</small></button></li>`).join('')}
        </ul>
      </fieldset>
      <fieldset class="filter-group">
        <legend>Khoảng giá</legend>
        <div class="price-inputs">
          <input type="number" min="0" step="10000" placeholder="₫ Từ" value="${s.min || ''}" id="fMin" aria-label="Giá từ">
          <span aria-hidden="true">–</span>
          <input type="number" min="0" step="10000" placeholder="₫ Đến" value="${s.max || ''}" id="fMax" aria-label="Giá đến">
        </div>
        <button type="button" class="btn btn--outline btn--block btn--sm" data-filter="price">Áp dụng</button>
        <div class="chip-row">${PRICE_PRESETS.map((pr) => `<button type="button" class="chip ${s.min === pr.min && s.max === pr.max ? 'is-active' : ''}" data-filter="preset" data-min="${pr.min}" data-max="${pr.max}">${pr.label}</button>`).join('')}</div>
      </fieldset>
      <fieldset class="filter-group">
        <legend>Đánh giá</legend>
        ${[4.5, 4, 3].map((r) => `<label class="radio"><input type="radio" name="fRating" value="${r}" ${s.rating === r ? 'checked' : ''} data-filter="rating"><span>${NM.stars(r)} từ ${String(r).replace('.', ',')} sao</span></label>`).join('')}
      </fieldset>
      <fieldset class="filter-group">
        <legend>Thương hiệu</legend>
        <div class="brand-list">
        ${brands.length ? brands.map((b, i) => `<label class="check ${i >= 8 ? 'is-extra' : ''}"><input type="checkbox" value="${escapeHTML(b)}" ${s.brands.includes(b) ? 'checked' : ''} data-filter="brand"><span>${escapeHTML(b)} <small>(${brandCounts[b]})</small></span></label>`).join('') : '<p class="field-hint">Không có thương hiệu</p>'}
        </div>
        ${brands.length > 8 ? '<button type="button" class="link-btn" data-filter="more-brands">Xem thêm</button>' : ''}
      </fieldset>
      <fieldset class="filter-group">
        <legend>Mức giảm giá</legend>
        ${[10, 20, 30, 40].map((d) => `<label class="radio"><input type="radio" name="fDiscount" value="${d}" ${s.discount === d ? 'checked' : ''} data-filter="discount"><span>Giảm từ ${d}%</span></label>`).join('')}
      </fieldset>
      <fieldset class="filter-group">
        <legend>Dịch vụ</legend>
        <label class="check"><input type="checkbox" ${s.freeShip ? 'checked' : ''} data-filter="freeship"><span>Miễn phí vận chuyển</span></label>
        <label class="check"><input type="checkbox" ${s.mall ? 'checked' : ''} data-filter="mall"><span>NovaMall chính hãng</span></label>
      </fieldset>
      <button type="button" class="btn btn--ghost btn--block" data-filter="reset">Xóa tất cả bộ lọc</button>`;
  };

  const activeChips = (s) => {
    const chips = [];
    if (s.q) chips.push(['q', `“${s.q}”`]);
    if (s.cat) chips.push(['cat', NM.catById[s.cat].name]);
    if (s.min || s.max) chips.push(['price', `${s.min ? formatVND(s.min) : '₫0'} – ${s.max ? formatVND(s.max) : 'không giới hạn'}`]);
    if (s.rating) chips.push(['rating', `Từ ${String(s.rating).replace('.', ',')} sao`]);
    s.brands.forEach((b) => chips.push(['brand:' + b, b]));
    if (s.discount) chips.push(['discount', `Giảm từ ${s.discount}%`]);
    if (s.freeShip) chips.push(['freeship', 'Freeship']);
    if (s.mall && s.section !== 'mall') chips.push(['mall', 'NovaMall']);
    return chips.length ? `<div class="active-filters" aria-label="Bộ lọc đang áp dụng">${chips.map(([k, l]) =>
      `<button type="button" class="chip chip--removable" data-remove="${escapeHTML(k)}" aria-label="Bỏ lọc ${escapeHTML(l)}">${escapeHTML(l)} <span aria-hidden="true">✕</span></button>`).join('')}</div>` : '';
  };

  const initListingPage = () => {
    const root = $('#listingRoot');
    if (!root) return;
    let s = readState();

    const titleEl = $('#listingTitle');
    const sidebar = $('#filterSidebar');
    const toolbar = $('#listingToolbar');
    const grid = $('#listingGrid');
    const more = $('#listingMore');

    const update = ({ skeleton = false } = {}) => {
      writeState(s);
      const base = baseSet(s);
      const filtered = sortList(applyFilters(base, s), s.sort, !!s.q);

      // Title
      let title = 'Tất cả sản phẩm', icon = '🛍️';
      if (s.section && SECTIONS[s.section]) ({ title, icon } = SECTIONS[s.section]);
      if (s.cat) { title = NM.catById[s.cat].name; icon = NM.catById[s.cat].icon; }
      if (s.q) { title = `Kết quả tìm kiếm cho “${escapeHTML(s.q)}”`; icon = '🔍'; }
      titleEl.innerHTML = `<span aria-hidden="true">${icon}</span> ${title}`;
      document.title = `${s.q ? s.q : title.replace(/<[^>]+>/g, '')} | NovaMart`;
      $('#crumbCurrent').textContent = s.q ? 'Tìm kiếm' : title;

      sidebar.innerHTML = sidebarHTML(s, base);

      toolbar.innerHTML = `
        <div class="toolbar__row">
          <p class="result-count" aria-live="polite"><strong>${filtered.length}</strong> sản phẩm</p>
          <button type="button" class="btn btn--outline btn--sm filter-open" data-filter="open" aria-controls="filterSidebar">⚙ Bộ lọc</button>
        </div>
        <div class="sort-bar" role="group" aria-label="Sắp xếp">
          <span class="sort-bar__label">Sắp xếp theo</span>
          ${SORTS.map((o) => `<button type="button" class="sort-btn ${s.sort === o.id ? 'is-active' : ''}" data-sort="${o.id}" aria-pressed="${s.sort === o.id}">${o.label}</button>`).join('')}
          <select class="select sort-select" data-sort-select aria-label="Sắp xếp theo giá">
            <option value="">Giá</option>
            <option value="price-asc" ${s.sort === 'price-asc' ? 'selected' : ''}>Giá: Thấp → Cao</option>
            <option value="price-desc" ${s.sort === 'price-desc' ? 'selected' : ''}>Giá: Cao → Thấp</option>
          </select>
        </div>
        ${activeChips(s)}`;

      const renderGrid = () => {
        if (!filtered.length) {
          grid.innerHTML = `<div class="empty-state card grid-span">
            <div class="empty-state__art" aria-hidden="true">🔎</div>
            <h2>Không tìm thấy sản phẩm</h2>
            <p>Thử từ khóa khác, bỏ bớt bộ lọc hoặc xem các từ khóa phổ biến bên dưới.</p>
            <div class="chip-row chip-row--center">${NM.Search.POPULAR.slice(0, 6).map((k) => `<a class="chip" href="products.html?q=${encodeURIComponent(k)}">${k}</a>`).join('')}</div>
            <button type="button" class="btn btn--primary" data-filter="reset">Xóa bộ lọc</button>
          </div>`;
          more.hidden = true;
          return;
        }
        const shown = filtered.slice(0, s.page * PAGE_SIZE);
        grid.innerHTML = shown.map((p) => NM.productCard(p, { query: s.q })).join('');
        more.hidden = shown.length >= filtered.length;
        more.textContent = `Xem thêm ${Math.min(PAGE_SIZE, filtered.length - shown.length)} sản phẩm`;
        NM.Wishlist.sync();
      };

      if (skeleton) {
        grid.innerHTML = NM.skeletonCards(10);
        setTimeout(renderGrid, 380);
      } else renderGrid();
    };

    const closeDrawer = () => { sidebar.classList.remove('open'); document.body.classList.remove('no-scroll'); $('.filter-scrim').classList.remove('show'); };

    root.addEventListener('click', (e) => {
      const f = e.target.closest('[data-filter]');
      const sortBtn = e.target.closest('[data-sort]');
      const rm = e.target.closest('[data-remove]');
      if (sortBtn) { s.sort = sortBtn.dataset.sort; s.page = 1; return update(); }
      if (rm) {
        const k = rm.dataset.remove;
        if (k === 'q') s.q = '';
        else if (k === 'cat') s.cat = '';
        else if (k === 'price') { s.min = 0; s.max = 0; }
        else if (k.startsWith('brand:')) s.brands = s.brands.filter((b) => b !== k.slice(6));
        else if (k === 'freeship') s.freeShip = false;
        else s[k] = k === 'mall' ? false : 0;
        s.page = 1;
        return update();
      }
      if (!f) return;
      const type = f.dataset.filter;
      if (type === 'cat') { s.cat = f.dataset.value; s.brands = []; s.page = 1; update(); closeDrawer(); }
      if (type === 'preset') { s.min = Number(f.dataset.min); s.max = Number(f.dataset.max); s.page = 1; update(); }
      if (type === 'price') {
        let min = Number($('#fMin').value) || 0, max = Number($('#fMax').value) || 0;
        if (max && min > max) [min, max] = [max, min];
        s.min = min; s.max = max; s.page = 1; update();
      }
      if (type === 'reset') {
        s = { ...readState(), q: '', cat: '', section: '', min: 0, max: 0, rating: 0, brands: [], discount: 0, freeShip: false, mall: false, sort: 'popular' };
        const input = $('#searchInput'); if (input) input.value = '';
        update(); closeDrawer();
      }
      if (type === 'more-brands') { $('.brand-list').classList.add('show-all'); f.remove(); }
      if (type === 'open') { sidebar.classList.add('open'); document.body.classList.add('no-scroll'); $('.filter-scrim').classList.add('show'); }
      if (type === 'close') closeDrawer();
    });

    root.addEventListener('change', (e) => {
      const el = e.target;
      if (el.matches('[data-sort-select]')) { if (el.value) { s.sort = el.value; update(); } return; }
      const type = el.dataset.filter;
      if (type === 'rating') s.rating = Number(el.value);
      if (type === 'discount') s.discount = Number(el.value);
      if (type === 'brand') s.brands = $$('[data-filter="brand"]:checked', sidebar).map((x) => x.value);
      if (type === 'freeship') s.freeShip = el.checked;
      if (type === 'mall') s.mall = el.checked;
      if (type) { s.page = 1; update(); }
    });

    $('.filter-scrim').addEventListener('click', closeDrawer);
    more.addEventListener('click', () => { s.page += 1; update(); });

    update({ skeleton: true });
  };

  NM.Filters = { applyFilters, sortList, baseSet };
  NM.initListingPage = initListingPage;
})(window.NM);
