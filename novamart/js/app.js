/* ==========================================================
   NovaMart – app.js
   Shared shell (header, nav, footer, mobile UI), global event
   delegation and per-page initialisation.
   ========================================================== */
(function (NM) {
  'use strict';

  const { $, $$, escapeHTML, store, toast, confirmDialog } = NM;

  const ICON = {
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
    cart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };

  const LOGO = `<svg class="logo__mark" viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="var(--c-primary)"/>
      <path d="M20 7c1.3 7.2 5.8 11.7 13 13-7.2 1.3-11.7 5.8-13 13-1.3-7.2-5.8-11.7-13-13 7.2-1.3 11.7-5.8 13-13z" fill="#fff"/>
      <circle cx="30.5" cy="9.5" r="2.5" fill="var(--c-sun)"/></svg>`;

  /* ---------- Shell ---------- */
  const renderHeader = () => {
    const el = $('#app-header');
    if (!el) return;
    const page = document.body.dataset.page;
    const navLinks = [
      ['products.html?section=flash', '⚡ Flash Sale', 'flash'],
      ['products.html?section=best', 'Bán chạy', 'best'],
      ['products.html?section=new', 'Hàng mới', 'new'],
      ['index.html#vouchers', 'Voucher', 'vouchers'],
      ['products.html?section=mall', 'NovaMall', 'mall'],
      ['products.html?section=deal', 'Giảm từ 30%', 'deal']
    ];
    const section = NM.getParam('section');

    el.innerHTML = `
      <a class="skip-link" href="#main">Bỏ qua đến nội dung chính</a>
      <div class="announce">
        <div class="container announce__row">
          <p>🎁 Nhập <strong>NEWBIE15</strong> giảm 15% cho đơn đầu tiên | Freeship đơn từ ₫500K</p>
          <nav class="announce__links" aria-label="Liên kết nhanh">
            <a href="orders.html">Theo dõi đơn hàng</a><a href="#footer-help">Hỗ trợ 1900 6868</a><a href="#footer-app">Tải ứng dụng</a>
          </nav>
        </div>
      </div>
      <header class="site-header">
        <div class="container header__row">
          <button type="button" class="icon-btn menu-toggle" aria-label="Mở menu" aria-controls="mobileDrawer" aria-expanded="false">${ICON.menu}</button>
          <a class="logo" href="index.html" aria-label="NovaMart – Trang chủ">${LOGO}<span class="logo__text">NovaMart<small>Mua sắm thông minh – Giá tốt mỗi ngày</small></span></a>

          <div class="search-wrap">
            <form class="search" id="searchForm" role="search" autocomplete="off">
              <label for="searchInput" class="sr-only">Tìm kiếm sản phẩm</label>
              <input id="searchInput" type="search" placeholder="Tìm iPhone, laptop, giày, tai nghe..." aria-autocomplete="list" aria-controls="searchSuggest" aria-expanded="false">
              <button type="submit" class="search__btn" aria-label="Tìm kiếm">${ICON.search}<span>Tìm kiếm</span></button>
              <div class="suggest dropdown" id="searchSuggest" hidden></div>
            </form>
            <div class="trending" aria-label="Tìm kiếm phổ biến">
              ${NM.Search.POPULAR.slice(0, 6).map((k) => `<a href="products.html?q=${encodeURIComponent(k)}">${k}</a>`).join('')}
            </div>
          </div>

          <div class="header__actions">
            <div class="dd">
              <button type="button" class="icon-btn notif-toggle" aria-label="Thông báo" aria-haspopup="true" aria-expanded="false" aria-controls="notifPanel">${ICON.bell}<span class="badge" hidden>0</span></button>
              <div class="dropdown dropdown--right notif-panel" id="notifPanel" hidden></div>
            </div>
            <a class="icon-btn cart-link" href="cart.html" aria-label="Giỏ hàng">${ICON.cart}<span class="badge" hidden>0</span></a>
            <div class="dd user-dd">
              <button type="button" class="user-toggle" aria-haspopup="true" aria-expanded="false" aria-controls="userPanel"></button>
              <div class="dropdown dropdown--right user-panel" id="userPanel" hidden></div>
            </div>
          </div>
        </div>

        <nav class="main-nav" aria-label="Điều hướng chính">
          <div class="container main-nav__row">
            <div class="dd cat-dd">
              <button type="button" class="cat-toggle" aria-haspopup="true" aria-expanded="false" aria-controls="catPanel">${ICON.grid} Danh mục</button>
              <div class="dropdown cat-panel" id="catPanel" hidden>
                ${NM.CATEGORIES.map((c) => `<a href="products.html?cat=${c.id}"><span aria-hidden="true">${c.icon}</span>${c.name}</a>`).join('')}
              </div>
            </div>
            <ul class="main-nav__links">
              ${navLinks.map(([href, label, key]) => `<li><a href="${href}" class="${section === key ? 'is-active' : ''}" ${section === key ? 'aria-current="page"' : ''}>${label}</a></li>`).join('')}
            </ul>
            <span class="main-nav__promise">✓ Chính hãng | ↺ Đổi trả 15 ngày | 🚚 Giao 2h nội thành</span>
          </div>
        </nav>
      </header>

      <div class="drawer-scrim" hidden></div>
      <aside class="drawer" id="mobileDrawer" aria-label="Menu" aria-hidden="true">
        <div class="drawer__head">
          <a class="logo" href="index.html">${LOGO}<span class="logo__text">NovaMart</span></a>
          <button type="button" class="icon-btn drawer-close" aria-label="Đóng menu">✕</button>
        </div>
        <nav aria-label="Menu di động">
          <ul class="drawer__links">
            <li><a href="index.html">${ICON.home} Trang chủ</a></li>
            ${navLinks.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('')}
            <li><a href="orders.html">${ICON.orders} Đơn mua</a></li>
            <li><a href="account.html#wishlist">♡ Yêu thích</a></li>
          </ul>
          <h2 class="drawer__title" id="drawerCats">Danh mục sản phẩm</h2>
          <ul class="drawer__cats">
            ${NM.CATEGORIES.map((c) => `<li><a href="products.html?cat=${c.id}"><span aria-hidden="true">${c.icon}</span>${c.name}</a></li>`).join('')}
          </ul>
        </nav>
      </aside>`;

    if (page === 'checkout') el.querySelector('.main-nav').hidden = true;
  };

  const renderFooter = () => {
    const el = $('#app-footer');
    if (!el) return;
    const page = document.body.dataset.page;
    el.innerHTML = `
      <footer class="site-footer" id="footer-help">
        <div class="container footer__grid">
          <div class="footer__brand">
            <a class="logo logo--footer" href="index.html">${LOGO}<span class="logo__text">NovaMart<small>Mua sắm thông minh – Giá tốt mỗi ngày</small></span></a>
            <p>Sàn thương mại điện tử demo dành cho người Việt: hàng chính hãng, giá tốt, giao nhanh.</p>
            <p class="footer__hotline">Hotline <strong>1900 6868</strong> (8:00 – 22:00)</p>
          </div>
          <div><h2>Chăm sóc khách hàng</h2><ul>
            <li><a href="orders.html">Theo dõi đơn hàng</a></li><li><a href="account.html#vouchers">Kho voucher</a></li>
            <li><a href="account.html#profile">Tài khoản</a></li><li><a href="cart.html">Giỏ hàng</a></li></ul></div>
          <div><h2>Về NovaMart</h2><ul>
            <li><a href="products.html?section=mall">NovaMall</a></li><li><a href="products.html?section=flash">Flash Sale</a></li>
            <li><a href="products.html?section=new">Hàng mới về</a></li><li><a href="products.html?section=best">Bán chạy</a></li></ul></div>
          <div><h2>Thanh toán</h2>
            <div class="pay-chips"><span>COD</span><span>VISA</span><span>Mastercard</span><span>MoMo</span><span>ZaloPay</span><span>VNPay</span></div>
            <h2>Vận chuyển</h2><div class="pay-chips"><span>NovaExpress</span><span>Giao nhanh</span><span>Hỏa tốc</span></div></div>
          <div id="footer-app"><h2>Tải ứng dụng</h2>
            <div class="app-badges"><span class="app-badge">▶ Google Play</span><span class="app-badge"> App Store</span></div>
            <p class="muted-light">Ứng dụng demo chưa phát hành.</p></div>
        </div>
        <div class="footer__bottom"><div class="container">
          <p>© ${new Date().getFullYear()} NovaMart. Dự án demo frontend – không phải doanh nghiệp thật.</p>
          <p>Địa chỉ: 123 Nguyễn Văn Linh, Hải Châu, Đà Nẵng</p>
        </div></div>
      </footer>

      <nav class="bottom-nav" aria-label="Điều hướng nhanh">
        <a href="index.html" class="${page === 'home' ? 'is-active' : ''}" ${page === 'home' ? 'aria-current="page"' : ''}>${ICON.home}<span>Trang chủ</span></a>
        <button type="button" data-open-cats class="${page === 'products' ? 'is-active' : ''}">${ICON.grid}<span>Danh mục</span></button>
        <a href="cart.html" class="cart-link ${page === 'cart' ? 'is-active' : ''}" ${page === 'cart' ? 'aria-current="page"' : ''}>${ICON.cart}<span class="badge" hidden>0</span><span>Giỏ hàng</span></a>
        <a href="orders.html" class="${page === 'orders' ? 'is-active' : ''}" ${page === 'orders' ? 'aria-current="page"' : ''}>${ICON.orders}<span>Đơn hàng</span></a>
        <a href="account.html" class="${page === 'account' ? 'is-active' : ''}" ${page === 'account' ? 'aria-current="page"' : ''}>${ICON.user}<span>Tài khoản</span></a>
      </nav>
      <div class="mobile-buy-bar" id="mobileBuyBar" hidden></div>
      <button type="button" class="back-to-top" aria-label="Lên đầu trang" hidden>↑</button>`;
  };

  /* ---------- User menu ---------- */
  NM.renderUserMenu = () => {
    const u = NM.getUser();
    const toggle = $('.user-toggle');
    const panel = $('#userPanel');
    if (!toggle) return;
    toggle.innerHTML = `<img src="${NM.avatarSVG(u.name, 12)}" alt="" width="32" height="32"><span class="user-toggle__name"><small>Xin chào</small>${escapeHTML(u.name)}</span>`;
    toggle.setAttribute('aria-label', `Tài khoản ${u.name}`);
    panel.innerHTML = `
      <div class="dropdown__head"><strong>${escapeHTML(u.name)}</strong><small>${u.tier}</small></div>
      <ul class="menu-list">
        <li><a href="account.html#profile">👤 Tài khoản của tôi</a></li>
        <li><a href="orders.html">🧾 Đơn mua</a></li>
        <li><a href="account.html#vouchers">🎟️ Kho voucher</a></li>
        <li><a href="account.html#wishlist">♡ Yêu thích</a></li>
        <li><a href="account.html#recent">🕘 Đã xem gần đây</a></li>
        <li><button type="button" data-reset-demo>↺ Đặt lại dữ liệu demo</button></li>
      </ul>`;
  };

  NM.closeDropdowns = () => {
    $$('.dd .dropdown').forEach((d) => { if (d.id !== 'searchSuggest') d.hidden = true; });
    $$('.dd [aria-expanded]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  };

  const bindDropdown = (toggleSel, panelSel) => {
    const t = $(toggleSel), p = $(panelSel);
    if (!t || !p) return;
    t.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = p.hidden;
      NM.closeDropdowns();
      p.hidden = !open;
      t.setAttribute('aria-expanded', String(open));
    });
    p.addEventListener('click', (e) => e.stopPropagation());
  };

  /* ---------- Drawer ---------- */
  const drawer = {
    open(focusCats) {
      const d = $('#mobileDrawer');
      d.classList.add('open');
      d.setAttribute('aria-hidden', 'false');
      $('.drawer-scrim').hidden = false;
      requestAnimationFrame(() => $('.drawer-scrim').classList.add('show'));
      $('.menu-toggle').setAttribute('aria-expanded', 'true');
      document.body.classList.add('no-scroll');
      if (focusCats) $('#drawerCats').scrollIntoView({ block: 'start' });
      $('.drawer-close').focus();
    },
    close() {
      const d = $('#mobileDrawer');
      d.classList.remove('open');
      d.setAttribute('aria-hidden', 'true');
      $('.drawer-scrim').classList.remove('show');
      setTimeout(() => { $('.drawer-scrim').hidden = true; }, 200);
      $('.menu-toggle').setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
    }
  };

  /* ---------- Badges ---------- */
  const updateCartBadge = () => {
    const n = NM.Cart.count();
    $$('.cart-link .badge').forEach((b) => { b.textContent = n > 99 ? '99+' : n; b.hidden = n === 0; });
    $$('.cart-link').forEach((a) => a.setAttribute('aria-label', `Giỏ hàng, ${n} sản phẩm`));
  };

  /* ---------- Global delegation ---------- */
  const bindGlobal = () => {
    document.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-action]');
      if (act) {
        const id = act.dataset.id;
        switch (act.dataset.action) {
          case 'add-cart': e.preventDefault(); NM.Cart.add(id, 1); break;
          case 'toggle-wish': e.preventDefault(); NM.Wishlist.toggle(id); break;
          case 'buy-now': e.preventDefault(); NM.buyNow(id, 1); break;
          case 'collect-voucher':
            e.preventDefault();
            NM.Vouchers.collect(act.dataset.code);
            if (NM.renderHomeVouchers) NM.renderHomeVouchers();
            act.classList.add('is-collected');
            break;
          default: break;
        }
      }
      if (e.target.closest('[data-reset-demo]')) {
        const ok = await confirmDialog('Xóa giỏ hàng, đơn hàng, voucher, yêu thích và lịch sử xem trên trình duyệt này?', { title: 'Đặt lại dữ liệu demo', okLabel: 'Đặt lại', danger: true });
        if (ok) {
          Object.keys(localStorage).filter((k) => k.startsWith('nm_')).forEach((k) => localStorage.removeItem(k));
          location.href = 'index.html';
        }
      }
      if (e.target.closest('.menu-toggle')) drawer.open();
      if (e.target.closest('[data-open-cats]')) drawer.open(true);
      if (e.target.closest('.drawer-close') || e.target.closest('.drawer-scrim')) drawer.close();
      if (!e.target.closest('.dd')) NM.closeDropdowns();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        NM.closeDropdowns();
        if ($('#mobileDrawer.open')) drawer.close();
      }
    });

    // Back to top + compact header on scroll
    const btt = $('.back-to-top');
    const header = $('.site-header');
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        btt.hidden = y < 600;
        header.classList.toggle('is-scrolled', y > 40);
        ticking = false;
      });
    }, { passive: true });
    btt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    document.addEventListener('nm:cart', updateCartBadge);
    window.addEventListener('storage', (e) => { if (e.key === 'nm_cart') updateCartBadge(); });
  };

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    renderHeader();
    renderFooter();
    NM.renderUserMenu();
    bindDropdown('.user-toggle', '#userPanel');
    bindDropdown('.cat-toggle', '#catPanel');
    NM.Notifications.init();
    NM.Search.init();
    bindGlobal();
    updateCartBadge();

    const page = document.body.dataset.page;
    const inits = {
      home: NM.initHome,
      products: NM.initListingPage,
      detail: NM.initProductDetail,
      cart: NM.initCartPage,
      checkout: NM.initCheckout,
      orders: NM.initOrdersPage,
      account: NM.initAccount
    };
    if (inits[page]) inits[page]();

    NM.startCountdowns();
    NM.Wishlist.sync();
  });
})(window.NM);
