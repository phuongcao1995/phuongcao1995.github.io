/* ==========================================================
   NovaMart – products.js
   Product cards, home page sections, product detail page.
   ========================================================== */
(function (NM) {
  'use strict';

  const { $, $$, formatVND, formatShort, escapeHTML, stars, store, toast } = NM;

  /* ---------- Product card ---------- */
  const productCard = (p, opts = {}) => {
    const flash = NM.flashById[p.id];
    const price = NM.priceOf(p);
    const discount = Math.round((1 - price / p.originalPrice) * 100);
    const name = opts.query ? NM.Search.highlight(p.name, opts.query) : escapeHTML(p.name);
    return `
    <article class="product-card">
      <a class="product-card__link" href="product-detail.html?id=${p.id}">
        <div class="product-card__media">
          <img src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy" width="400" height="400">
          ${discount > 0 ? `<span class="discount-tag" aria-label="Giảm ${discount}%">-${discount}%</span>` : ''}
          ${flash ? '<span class="flash-tag">⚡ Flash Sale</span>' : ''}
          ${opts.rank ? `<span class="rank-tag rank-${opts.rank}" aria-label="Hạng ${opts.rank}">${opts.rank}</span>` : ''}
        </div>
        <div class="product-card__body">
          <h3 class="product-card__name">${p.mall ? '<span class="badge-mall">Mall</span>' : ''}${name}</h3>
          <div class="product-card__price">
            <strong>${formatVND(price)}</strong>
            <del>${formatVND(p.originalPrice)}</del>
          </div>
          <div class="product-card__meta">
            <span class="rating-mini"><span class="star on" aria-hidden="true">★</span> ${String(p.rating).replace('.', ',')} <small>(${formatShort(p.reviewCount)} đánh giá)</small></span>
          </div>
          <div class="product-card__foot">
            ${p.freeShipping ? '<span class="tag tag--ship">Freeship</span>' : '<span></span>'}
            <span class="sold">Đã bán ${formatShort(p.sold)}</span>
          </div>
        </div>
      </a>
      <button type="button" class="wish-btn" data-action="toggle-wish" data-id="${p.id}" aria-pressed="false" aria-label="Yêu thích ${escapeHTML(p.name)}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.9 0 6 3.9 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>
      </button>
      <button type="button" class="cart-btn" data-action="add-cart" data-id="${p.id}" aria-label="Thêm ${escapeHTML(p.name)} vào giỏ">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M13 9v5M10.5 11.5h5"/></svg>
      </button>
    </article>`;
  };

  const skeletonCards = (n) => Array.from({ length: n }, () => `
    <div class="product-card skeleton-card" aria-hidden="true">
      <div class="skeleton skeleton--img"></div>
      <div class="product-card__body"><div class="skeleton skeleton--line"></div><div class="skeleton skeleton--line short"></div><div class="skeleton skeleton--line shorter"></div></div>
    </div>`).join('');

  NM.productCard = productCard;
  NM.skeletonCards = skeletonCards;

  /* ---------- Buy now ---------- */
  NM.buyNow = (id, qty = 1, variant) => {
    const p = NM.productById[id];
    variant = variant || NM.Cart.defaultVariant(p);
    store.set('checkout', { source: 'buynow', items: [{ key: NM.Cart.keyOf(id, variant), id, qty, variant }], voucher: '' });
    location.href = 'checkout.html';
  };

  /* ==========================================================
     HOME PAGE
     ========================================================== */
  const initHero = () => {
    const root = $('#hero');
    if (!root) return;
    const slides = NM.BANNERS;
    root.innerHTML = `
      <div class="hero__carousel" aria-roledescription="carousel" aria-label="Khuyến mãi nổi bật">
        <div class="hero__track">
          ${slides.map((b, i) => `
            <div class="hero__slide theme-${b.theme}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${slides.length}" ${i ? 'aria-hidden="true"' : ''}>
              <div class="hero__copy">
                <h2>${b.title}</h2>
                <p>${b.sub}</p>
                <a class="btn btn--light" href="${b.link}" ${i ? 'tabindex="-1"' : ''}>${b.cta}</a>
              </div>
              <div class="hero__art" aria-hidden="true">
                ${b.icons.map((ic, k) => `<span class="hero__orb orb-${k}">${ic}</span>`).join('')}
                <span class="hero__burst"></span>
              </div>
            </div>`).join('')}
        </div>
        <button type="button" class="hero__nav prev" aria-label="Slide trước">‹</button>
        <button type="button" class="hero__nav next" aria-label="Slide tiếp theo">›</button>
        <div class="hero__dots" role="tablist" aria-label="Chọn slide">
          ${slides.map((_, i) => `<button type="button" role="tab" aria-label="Slide ${i + 1}" aria-selected="${i === 0}"></button>`).join('')}
        </div>
      </div>
      <div class="hero__side">
        <a class="side-promo side-promo--a" href="products.html?section=mall"><strong>NovaMall</strong><span>100% chính hãng, đổi trả 30 ngày</span><em aria-hidden="true">🏬</em></a>
        <a class="side-promo side-promo--b" href="index.html#vouchers"><strong>Kho voucher</strong><span>Mã giảm đến ₫300K đang chờ bạn</span><em aria-hidden="true">🎟️</em></a>
      </div>`;

    const track = $('.hero__track', root);
    const dots = $$('.hero__dots button', root);
    const slideEls = $$('.hero__slide', root);
    let idx = 0, timer;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const go = (i) => {
      idx = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${idx * 100}%)`;
      dots.forEach((d, k) => d.setAttribute('aria-selected', String(k === idx)));
      slideEls.forEach((s, k) => {
        s.setAttribute('aria-hidden', String(k !== idx));
        const a = $('a', s); if (a) a.tabIndex = k === idx ? 0 : -1;
      });
    };
    const play = () => { if (reduce) return; clearInterval(timer); timer = setInterval(() => go(idx + 1), 5000); };
    const stop = () => clearInterval(timer);

    $('.prev', root).addEventListener('click', () => { go(idx - 1); play(); });
    $('.next', root).addEventListener('click', () => { go(idx + 1); play(); });
    dots.forEach((d, k) => d.addEventListener('click', () => { go(k); play(); }));
    const car = $('.hero__carousel', root);
    car.addEventListener('mouseenter', stop);
    car.addEventListener('mouseleave', play);
    car.addEventListener('focusin', stop);
    car.addEventListener('focusout', play);

    // swipe
    let startX = null;
    car.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    car.addEventListener('pointerup', (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 50) { go(idx + (dx < 0 ? 1 : -1)); play(); }
      startX = null;
    });
    play();
  };

  const categoryShortcuts = () => {
    const el = $('#categoryGrid');
    if (!el) return;
    el.innerHTML = NM.CATEGORIES.map((c) => `
      <a class="cat-tile" href="products.html?cat=${c.id}" style="--tile-hue:${c.hue}">
        <span class="cat-tile__icon" aria-hidden="true">${c.icon}</span>
        <span class="cat-tile__name">${c.name}</span>
      </a>`).join('');
  };

  const flashCard = (f) => {
    const p = NM.productById[f.id];
    const pct = Math.round((f.sold / f.total) * 100);
    const left = f.total - f.sold;
    return `
      <article class="flash-card">
        <a href="product-detail.html?id=${p.id}" class="flash-card__link">
          <div class="flash-card__media">
            <img src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy" width="400" height="400">
            <span class="discount-tag">-${Math.round((1 - f.price / p.originalPrice) * 100)}%</span>
          </div>
          <h3 class="flash-card__name">${escapeHTML(p.name)}</h3>
          <div class="flash-card__price"><strong>${formatVND(f.price)}</strong><del>${formatVND(p.originalPrice)}</del></div>
        </a>
        <div class="progress ${pct >= 85 ? 'is-hot' : ''}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Đã bán ${pct}%">
          <span style="width:${pct}%"></span>
          <em>${pct >= 85 ? `Sắp hết – còn ${left}` : `Đã bán ${pct}%`}</em>
        </div>
        <p class="flash-card__left">Còn lại ${left} sản phẩm</p>
        <button type="button" class="btn btn--primary btn--block btn--sm" data-action="buy-now" data-id="${p.id}">Mua ngay</button>
      </article>`;
  };

  const flashSale = () => {
    const el = $('#flashSale');
    if (!el) return;
    el.innerHTML = `
      <div class="flash__head">
        <div class="flash__title">
          <h2><span class="flash__bolt" aria-hidden="true">⚡</span> Flash Sale</h2>
          <div class="flash__timer"><span>Kết thúc sau</span>${NM.countdownHTML('countdown--flash')}</div>
        </div>
        <a class="flash__all" href="products.html?section=flash">Xem tất cả</a>
      </div>
      <div class="flash__rail" tabindex="0" aria-label="Sản phẩm Flash Sale">
        ${NM.FLASH_SALE.map(flashCard).join('')}
      </div>`;
  };

  const voucherCard = (v) => {
    const collected = NM.Vouchers.isCollected(v.code);
    const used = NM.Vouchers.isUsed(v.code);
    return `
      <article class="voucher ${collected ? 'is-collected' : ''} voucher--${v.type}">
        <div class="voucher__stub">
          <span class="voucher__type">${v.tag}</span>
          <strong>${v.type === 'ship' ? '🚚' : v.type === 'percent' ? v.value + '%' : formatShort(v.value).toUpperCase()}</strong>
        </div>
        <div class="voucher__body">
          <h3>${v.title}</h3>
          <p>${v.desc}</p>
          <small>HSD: ${v.expires} · Mã ${v.code}</small>
        </div>
        <button type="button" class="btn ${collected ? 'btn--ghost' : 'btn--primary'} btn--sm voucher__btn" data-action="collect-voucher" data-code="${v.code}" ${collected ? 'disabled' : ''}>
          ${used ? 'Đã dùng' : collected ? 'Đã lưu' : 'Lưu mã'}
        </button>
      </article>`;
  };
  NM.voucherCard = voucherCard;

  const vouchers = () => {
    const el = $('#voucherList');
    if (!el) return;
    el.innerHTML = NM.VOUCHERS.map(voucherCard).join('');
  };
  NM.renderHomeVouchers = vouchers;

  const recommended = () => {
    const el = $('#recommendedGrid');
    const btn = $('#recommendedMore');
    if (!el) return;
    // Personalised: favour categories of recently viewed items
    const recentCats = new Set(NM.Recent.all().map((id) => NM.productById[id].category));
    const list = NM.PRODUCTS.slice().sort((a, b) =>
      (recentCats.has(b.category) ? 1 : 0) - (recentCats.has(a.category) ? 1 : 0) || b.rating * b.reviewCount - a.rating * a.reviewCount);
    let shown = 12;
    el.innerHTML = skeletonCards(12);
    const draw = () => {
      el.innerHTML = list.slice(0, shown).map((p) => productCard(p)).join('');
      btn.hidden = shown >= list.length;
      NM.Wishlist.sync();
    };
    setTimeout(draw, 350);
    btn.addEventListener('click', () => { shown += 12; draw(); });
  };

  const bestSellers = () => {
    const el = $('#bestGrid');
    if (!el) return;
    const top = NM.PRODUCTS.slice().sort((a, b) => b.sold - a.sold).slice(0, 12);
    el.innerHTML = top.map((p, i) => productCard(p, { rank: i + 1 })).join('');
  };

  const brands = () => {
    const el = $('#brandGrid');
    if (!el) return;
    el.innerHTML = NM.BRANDS.map((b) => {
      const count = NM.PRODUCTS.filter((p) => p.brand === b.name).length;
      return `<a class="brand-tile" href="products.html?q=${encodeURIComponent(b.name)}" style="--brand-hue:${b.tone}">
        <span class="brand-tile__mark" aria-hidden="true">${escapeHTML(b.name.charAt(0))}</span>
        <span class="brand-tile__name">${escapeHTML(b.name)}</span>
        <small>${count} sản phẩm</small></a>`;
    }).join('');
  };

  const recentSection = () => {
    const wrap = $('#recentSection');
    if (!wrap) return;
    const ids = NM.Recent.all();
    if (!ids.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    $('#recentGrid').innerHTML = ids.slice(0, 6).map((id) => productCard(NM.productById[id])).join('');
    $('#recentClear').onclick = () => { NM.Recent.clear(); recentSection(); toast('Đã xóa lịch sử xem', 'info'); };
  };

  NM.initHome = () => {
    initHero();
    categoryShortcuts();
    flashSale();
    vouchers();
    recommended();
    bestSellers();
    brands();
    recentSection();
  };

  /* ==========================================================
     PRODUCT DETAIL
     ========================================================== */
  NM.initProductDetail = () => {
    const root = $('#detailRoot');
    if (!root) return;
    const p = NM.productById[NM.getParam('id')];
    if (!p) {
      root.innerHTML = `<div class="empty-state card"><div class="empty-state__art" aria-hidden="true">📦</div>
        <h2>Không tìm thấy sản phẩm</h2><p>Sản phẩm có thể đã ngừng kinh doanh hoặc đường dẫn không đúng.</p>
        <a class="btn btn--primary" href="products.html">Xem sản phẩm khác</a></div>`;
      return;
    }
    NM.Recent.track(p.id);
    document.title = `${p.name} | NovaMart`;

    const cat = NM.catById[p.category];
    const flash = NM.flashById[p.id];
    const price = NM.priceOf(p);
    const discount = Math.round((1 - price / p.originalPrice) * 100);
    const user = NM.getUser();
    const selected = NM.Cart.defaultVariant(p);
    let qty = 1;
    const eta = new Date(Date.now() + 3 * 86400000);
    const shipFree = p.freeShipping || price >= 500000;
    const reviews = NM.reviewsFor(p);

    $('#crumbCat').innerHTML = `<a href="products.html?cat=${cat.id}">${cat.name}</a>`;
    $('#crumbCurrent').textContent = p.name;

    root.innerHTML = `
      <section class="detail card">
        <div class="gallery">
          <div class="gallery__main" tabindex="0" aria-label="Ảnh sản phẩm, di chuột để phóng to, nhấn Enter để xem lớn">
            <img id="mainImg" src="${p.images[0]}" alt="${escapeHTML(p.name)}" width="400" height="400">
            ${discount > 0 ? `<span class="discount-tag discount-tag--lg">-${discount}%</span>` : ''}
          </div>
          <div class="gallery__thumbs" role="listbox" aria-label="Chọn ảnh">
            ${p.images.map((src, i) => `<button type="button" class="thumb ${i === 0 ? 'is-active' : ''}" data-img="${i}" role="option" aria-selected="${i === 0}" aria-label="Ảnh ${i + 1}"><img src="${src}" alt=""></button>`).join('')}
          </div>
          <div class="gallery__actions">
            <button type="button" class="btn btn--ghost btn--sm" data-action="share">↗ Chia sẻ</button>
            <button type="button" class="btn btn--ghost btn--sm wish-inline" data-action="toggle-wish" data-id="${p.id}" aria-pressed="false">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.9 0 6 3.9 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>
              Yêu thích
            </button>
          </div>
        </div>

        <div class="detail__info">
          <h1 class="detail__name">${p.mall ? '<span class="badge-mall">Mall</span>' : ''}${escapeHTML(p.name)}</h1>
          <div class="detail__stats">
            <a href="#reviews" class="detail__rating"><strong>${String(p.rating).replace('.', ',')}</strong> ${stars(p.rating)}</a>
            <a href="#reviews">${formatShort(p.reviewCount)} đánh giá</a>
            <span>Đã bán ${formatShort(p.sold)}</span>
          </div>

          ${flash ? `<div class="detail__flash"><span>⚡ Flash Sale</span><span class="detail__flash-time">Kết thúc sau ${NM.countdownHTML('countdown--sm')}</span></div>` : ''}
          <div class="price-box ${flash ? 'is-flash' : ''}">
            <strong class="price-box__now">${formatVND(price)}</strong>
            <del>${formatVND(p.originalPrice)}</del>
            <span class="price-box__off">-${discount}%</span>
          </div>

          <dl class="detail__rows">
            <div><dt>Mã giảm giá</dt><dd class="chip-row">${NM.VOUCHERS.slice(0, 3).map((v) => `<button type="button" class="chip chip--voucher" data-action="collect-voucher" data-code="${v.code}">${v.title}</button>`).join('')}</dd></div>
            <div><dt>Vận chuyển</dt><dd class="ship-info">
              <p>🚚 Giao đến <strong>${escapeHTML(user.address.district)}, ${escapeHTML(user.address.city)}</strong></p>
              <p>Phí vận chuyển: ${shipFree ? '<span class="success">Miễn phí</span>' : formatVND(30000)}</p>
              <p>Dự kiến nhận hàng: ${NM.formatDate(eta, false)}</p>
            </dd></div>
            ${Object.entries(p.variants).map(([name, opts]) => `
              <div><dt>${name}</dt><dd class="variant-group" role="radiogroup" aria-label="${name}" data-variant="${escapeHTML(name)}">
                ${opts.map((o, i) => `<button type="button" class="variant ${i === 0 ? 'is-active' : ''}" role="radio" aria-checked="${i === 0}" data-value="${escapeHTML(o)}" data-index="${i}">${escapeHTML(o)}</button>`).join('')}
              </dd></div>`).join('')}
            <div><dt>Số lượng</dt><dd class="qty-row">
              <div class="qty" role="group" aria-label="Số lượng">
                <button type="button" data-qty="dec" aria-label="Giảm số lượng" disabled>−</button>
                <input type="number" id="detailQty" min="1" max="${p.stock}" value="1" aria-label="Số lượng">
                <button type="button" data-qty="inc" aria-label="Tăng số lượng">+</button>
              </div>
              <span class="stock">Còn ${p.stock} sản phẩm</span>
            </dd></div>
          </dl>

          <div class="detail__cta">
            <button type="button" class="btn btn--outline btn--lg" data-detail="add">🛒 Thêm vào giỏ hàng</button>
            <button type="button" class="btn btn--primary btn--lg" data-detail="buy">Mua ngay</button>
          </div>
          <ul class="assurance">
            <li>✓ Hàng chính hãng 100%</li><li>↺ Đổi trả trong 15 ngày</li><li>🛡 Thanh toán an toàn</li>
          </ul>
        </div>
      </section>

      <div class="detail-lower">
        <section class="card info-tabs">
          <div class="tabs" role="tablist" aria-label="Thông tin sản phẩm">
            ${['Mô tả', 'Thông số kỹ thuật', 'Bảo hành', 'Vận chuyển'].map((t, i) => `<button type="button" role="tab" id="tab-${i}" aria-controls="panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${t}</button>`).join('')}
          </div>
          <div class="tab-panel" role="tabpanel" id="panel-0" aria-labelledby="tab-0">
            <p class="lead">${escapeHTML(p.description)}</p>
            ${p.highlights.length ? `<h3>Điểm nổi bật</h3><ul class="ticks">${p.highlights.map((h) => `<li>${escapeHTML(h)}</li>`).join('')}</ul>` : ''}
            <p>${escapeHTML(p.name)} được phân phối bởi ${p.mall ? 'cửa hàng chính hãng trên NovaMall' : 'người bán uy tín trên NovaMart'}. Sản phẩm được kiểm tra trước khi đóng gói, kèm hóa đơn điện tử theo yêu cầu.</p>
          </div>
          <div class="tab-panel" role="tabpanel" id="panel-1" aria-labelledby="tab-1" hidden>
            <table class="spec-table"><tbody>
              <tr><th scope="row">Danh mục</th><td>${cat.name}</td></tr>
              ${Object.entries(p.specifications).map(([k, v]) => `<tr><th scope="row">${escapeHTML(k)}</th><td>${escapeHTML(v)}</td></tr>`).join('')}
              <tr><th scope="row">Kho hàng</th><td>${p.stock}</td></tr>
            </tbody></table>
          </div>
          <div class="tab-panel" role="tabpanel" id="panel-2" aria-labelledby="tab-2" hidden>
            <p>${escapeHTML(p.warranty)}</p>
            <ul class="ticks"><li>Đổi mới trong 15 ngày nếu có lỗi nhà sản xuất</li><li>Hỗ trợ bảo hành tại hơn 200 điểm trên toàn quốc</li><li>Hotline hỗ trợ 1900 6868 (8:00 – 22:00)</li></ul>
          </div>
          <div class="tab-panel" role="tabpanel" id="panel-3" aria-labelledby="tab-3" hidden>
            <table class="spec-table"><tbody>
              ${NM.SHIPPING_METHODS.map((m) => `<tr><th scope="row">${m.name}</th><td>${m.eta} – ${formatVND(m.fee)}</td></tr>`).join('')}
            </tbody></table>
            <p class="field-hint">Giao tiêu chuẩn miễn phí cho sản phẩm có nhãn Freeship hoặc đơn từ ₫500.000.</p>
          </div>
        </section>

        <aside class="card shop-card">
          <div class="shop-card__head">
            <span class="shop-card__logo" aria-hidden="true">${escapeHTML(p.brand.charAt(0))}</span>
            <div><strong>${escapeHTML(p.brand)} ${p.mall ? 'Official Store' : 'Store'}</strong><small>${p.mall ? 'Cửa hàng chính hãng' : 'Người bán uy tín'} · Đà Nẵng</small></div>
          </div>
          <dl class="shop-card__stats">
            <div><dt>Đánh giá</dt><dd>${formatShort(p.reviewCount * 7)}</dd></div>
            <div><dt>Sản phẩm</dt><dd>${NM.PRODUCTS.filter((x) => x.brand === p.brand).length * 23}</dd></div>
            <div><dt>Phản hồi</dt><dd>98%</dd></div>
          </dl>
          <a class="btn btn--outline btn--block btn--sm" href="products.html?q=${encodeURIComponent(p.brand)}">Xem cửa hàng</a>
        </aside>
      </div>

      <section class="card reviews" id="reviews" aria-labelledby="reviewsTitle">
        <h2 id="reviewsTitle">Đánh giá sản phẩm</h2>
        <div class="reviews__summary">
          <div class="reviews__score"><strong>${String(p.rating).replace('.', ',')}</strong><span>trên 5</span>${stars(p.rating)}<small>${p.reviewCount.toLocaleString('vi-VN')} đánh giá</small></div>
          <ul class="reviews__dist">
            ${[5, 4, 3, 2, 1].map((s) => `<li><span>${s} ★</span><span class="bar"><i style="width:${reviews.dist[s]}%"></i></span><small>${Math.round(p.reviewCount * reviews.dist[s] / 100).toLocaleString('vi-VN')}</small></li>`).join('')}
          </ul>
        </div>
        <div class="chip-row review-filters" role="group" aria-label="Lọc đánh giá">
          <button type="button" class="chip is-active" data-rf="all">Tất cả</button>
          ${[5, 4, 3, 2, 1].map((s) => `<button type="button" class="chip" data-rf="${s}">${s} sao</button>`).join('')}
          <button type="button" class="chip" data-rf="photo">Có hình ảnh</button>
          <button type="button" class="chip" data-rf="verified">Đã mua hàng</button>
        </div>
        <ul class="review-list" id="reviewList"></ul>
      </section>

      <section class="section">
        <div class="section__head"><h2 class="section__title">Sản phẩm tương tự</h2><a class="section__more" href="products.html?cat=${cat.id}">Xem tất cả</a></div>
        <div class="product-grid">${NM.PRODUCTS.filter((x) => x.id !== p.id).sort((a, b) => (b.category === p.category) - (a.category === p.category) || b.sold - a.sold).slice(0, 10).map((x) => productCard(x)).join('')}</div>
      </section>`;

    /* Reviews list with filter */
    const renderReviews = (f) => {
      const list = reviews.list.filter((r) => f === 'all' || (f === 'photo' ? r.photos : f === 'verified' ? r.verified : r.rating === Number(f)));
      $('#reviewList').innerHTML = list.length ? list.map((r, i) => `
        <li class="review">
          <img class="review__avatar" src="${NM.avatarSVG(r.name, r.hue)}" alt="" width="40" height="40">
          <div class="review__body">
            <div class="review__top"><strong>${escapeHTML(r.name)}</strong>${r.verified ? '<span class="verified">✓ Đã mua hàng</span>' : ''}</div>
            ${stars(r.rating)}
            <small class="review__meta">${NM.formatDate(r.date)}${r.variant ? ' | Phân loại: ' + escapeHTML(r.variant) : ''}</small>
            <p>${escapeHTML(r.text)}</p>
            ${r.photos ? `<div class="review__photos">${Array.from({ length: r.photos }, (_, k) => `<button type="button" class="review__photo" data-photo="${(k + i + 1) % 4}" aria-label="Xem ảnh của khách hàng"><img src="${p.images[(k + i + 1) % 4]}" alt="Ảnh khách hàng chụp sản phẩm" loading="lazy"></button>`).join('')}</div>` : ''}
            <button type="button" class="link-btn helpful" data-helpful="${r.helpful}" aria-pressed="false">👍 Hữu ích (${r.helpful})</button>
          </div>
        </li>`).join('') : '<li class="dropdown__empty">Chưa có đánh giá phù hợp với bộ lọc.</li>';
    };
    renderReviews('all');

    /* Interactions */
    const mainImg = $('#mainImg');
    const mainBox = $('.gallery__main');
    const setImage = (i) => {
      mainImg.src = p.images[i];
      $$('.thumb', root).forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', String(k === i)); });
    };
    let currentImg = 0;

    mainBox.addEventListener('mousemove', (e) => {
      const r = mainBox.getBoundingClientRect();
      mainImg.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
      mainBox.classList.add('is-zoom');
    });
    mainBox.addEventListener('mouseleave', () => mainBox.classList.remove('is-zoom'));
    const openLightbox = () => NM.openModal({ title: escapeHTML(p.name), size: 'modal--lg', body: `<img class="lightbox-img" src="${mainImg.src}" alt="${escapeHTML(p.name)}">` });
    mainBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') openLightbox(); });
    mainBox.addEventListener('click', () => { if (window.matchMedia('(hover: none)').matches) openLightbox(); });

    const qtyInput = $('#detailQty');
    const setQty = (n) => {
      qty = Math.max(1, Math.min(p.stock, n || 1));
      qtyInput.value = qty;
      $('[data-qty="dec"]', root).disabled = qty <= 1;
      $('[data-qty="inc"]', root).disabled = qty >= p.stock;
    };
    qtyInput.addEventListener('change', () => setQty(parseInt(qtyInput.value, 10)));

    root.addEventListener('click', (e) => {
      const thumb = e.target.closest('.thumb');
      if (thumb) { currentImg = Number(thumb.dataset.img); setImage(currentImg); }

      const v = e.target.closest('.variant');
      if (v) {
        const group = v.closest('.variant-group');
        $$('.variant', group).forEach((b) => { b.classList.toggle('is-active', b === v); b.setAttribute('aria-checked', String(b === v)); });
        selected[group.dataset.variant] = v.dataset.value;
        if (group.dataset.variant === 'Màu sắc' || group.dataset.variant === 'Màu son') setImage(Number(v.dataset.index) % 4);
      }

      const q = e.target.closest('[data-qty]');
      if (q) setQty(qty + (q.dataset.qty === 'inc' ? 1 : -1));

      const d = e.target.closest('[data-detail]');
      if (d && d.dataset.detail === 'add') NM.Cart.add(p.id, qty, { ...selected });
      if (d && d.dataset.detail === 'buy') NM.buyNow(p.id, qty, { ...selected });

      if (e.target.closest('[data-action="share"]')) {
        const url = location.href;
        if (navigator.share) navigator.share({ title: p.name, url }).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Đã sao chép liên kết sản phẩm')).catch(() => toast('Không thể sao chép liên kết', 'error'));
        else toast('Trình duyệt không hỗ trợ chia sẻ', 'info');
      }

      const rf = e.target.closest('[data-rf]');
      if (rf) {
        $$('[data-rf]', root).forEach((c) => c.classList.toggle('is-active', c === rf));
        renderReviews(rf.dataset.rf);
      }

      const help = e.target.closest('.helpful');
      if (help) {
        const on = help.getAttribute('aria-pressed') !== 'true';
        help.setAttribute('aria-pressed', String(on));
        help.textContent = `👍 Hữu ích (${Number(help.dataset.helpful) + (on ? 1 : 0)})`;
      }

      const photo = e.target.closest('.review__photo');
      if (photo) NM.openModal({ title: 'Ảnh từ khách hàng', size: 'modal--lg', body: `<img class="lightbox-img" src="${p.images[photo.dataset.photo]}" alt="Ảnh khách hàng chụp sản phẩm">` });
    });

    /* Tabs with arrow keys */
    const tabs = $$('[role="tab"]', root);
    const selectTab = (i) => {
      tabs.forEach((t, k) => {
        t.setAttribute('aria-selected', String(k === i));
        t.tabIndex = k === i ? 0 : -1;
        $('#panel-' + k).hidden = k !== i;
      });
      tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => selectTab(i));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') selectTab((i + 1) % tabs.length);
        if (e.key === 'ArrowLeft') selectTab((i - 1 + tabs.length) % tabs.length);
      });
    });

    // Sticky mobile buy bar
    const bar = $('#mobileBuyBar');
    if (bar) {
      bar.hidden = false;
      bar.innerHTML = `
        <button type="button" class="mbb__icon" data-action="toggle-wish" data-id="${p.id}" aria-pressed="false" aria-label="Yêu thích">♡</button>
        <button type="button" class="btn btn--outline" data-mbb="add">Thêm vào giỏ</button>
        <button type="button" class="btn btn--primary" data-mbb="buy">Mua ngay</button>`;
      bar.addEventListener('click', (e) => {
        const b = e.target.closest('[data-mbb]');
        if (!b) return;
        if (b.dataset.mbb === 'add') NM.Cart.add(p.id, qty, { ...selected });
        else NM.buyNow(p.id, qty, { ...selected });
      });
      document.body.classList.add('has-buy-bar');
    }
    NM.Wishlist.sync();
  };
})(window.NM);
