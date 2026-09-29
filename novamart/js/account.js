/* ==========================================================
   NovaMart – account.js
   Mock account centre (no authentication).
   ========================================================== */
(function (NM) {
  'use strict';

  const { $, $$, escapeHTML, toast, store, formatVND } = NM;

  const SECTIONS = [
    ['profile', '👤', 'Hồ sơ của tôi'],
    ['orders', '🧾', 'Đơn mua'],
    ['vouchers', '🎟️', 'Kho voucher'],
    ['wishlist', '♡', 'Sản phẩm yêu thích'],
    ['recent', '🕘', 'Đã xem gần đây']
  ];

  const profile = () => {
    const u = NM.getUser();
    return `
      <h1 class="h2">Hồ sơ của tôi</h1>
      <p class="muted">Quản lý thông tin để bảo mật tài khoản (dữ liệu demo, lưu trên trình duyệt).</p>
      <form class="form-grid form-grid--2" id="profileForm" novalidate>
        <label class="field">Họ và tên<input class="input" name="name" value="${escapeHTML(u.name)}" required autocomplete="name"></label>
        <label class="field">Email<input class="input" name="email" type="email" value="${escapeHTML(u.email)}" required autocomplete="email"></label>
        <label class="field">Số điện thoại<input class="input" name="phone" value="${escapeHTML(u.phone)}" required autocomplete="tel"></label>
        <label class="field">Ngày sinh<input class="input" name="birthday" type="date" value="${escapeHTML(u.birthday)}"></label>
        <fieldset class="field field--inline"><legend>Giới tính</legend>
          ${['Nam', 'Nữ', 'Khác'].map((g) => `<label class="radio"><input type="radio" name="gender" value="${g}" ${u.gender === g ? 'checked' : ''}><span>${g}</span></label>`).join('')}
        </fieldset>
        <div class="field field--full"><span>Địa chỉ mặc định</span>
          <address class="addr-box"><strong>${escapeHTML(u.address.name)}</strong> (${escapeHTML(u.address.phone)})<br>${NM.addressText(u.address)}</address>
          <small class="field-hint">Đổi địa chỉ tại bước thanh toán.</small></div>
        <p class="field-hint danger field--full" id="pfErr" hidden></p>
        <div class="field--full"><button class="btn btn--primary" type="submit">Lưu thay đổi</button></div>
      </form>`;
  };

  const orders = () => {
    const c = NM.Orders.counts();
    const recent = NM.Orders.all().slice(0, 3);
    const tiles = [['pending', '💳', 'Chờ thanh toán'], ['to_ship', '📦', 'Chờ lấy hàng'], ['shipping', '🚚', 'Đang giao'], ['completed', '✅', 'Hoàn thành'], ['cancelled', '✖', 'Đã hủy']];
    return `
      <div class="acc-head"><h1 class="h2">Đơn mua</h1><a class="link-btn" href="orders.html">Xem tất cả</a></div>
      <div class="status-tiles">
        ${tiles.map(([k, ic, l]) => `<a class="status-tile" href="orders.html?tab=${k}"><span aria-hidden="true">${ic}</span>${l}${c[k] ? `<em class="badge">${c[k]}</em>` : ''}</a>`).join('')}
      </div>
      <h2 class="h3">Đơn gần đây</h2>
      <div class="order-list">${recent.map(NM.orderCard).join('')}</div>`;
  };

  const vouchers = () => {
    const mine = NM.Vouchers.collected();
    const used = NM.Vouchers.used();
    const others = NM.VOUCHERS.filter((v) => !mine.includes(v.code));
    return `
      <h1 class="h2">Kho voucher</h1>
      <p class="muted">Voucher đã lưu sẽ tự hiện khi bạn thanh toán.</p>
      ${mine.length ? `<div class="voucher-grid">${mine.map((code) => {
        const v = NM.VOUCHERS.find((x) => x.code === code);
        const isUsed = used.includes(code);
        return `<article class="voucher is-collected voucher--${v.type} ${isUsed ? 'is-used' : ''}">
          <div class="voucher__stub"><span class="voucher__type">${v.tag}</span><strong>${v.type === 'ship' ? '🚚' : v.type === 'percent' ? v.value + '%' : NM.formatShort(v.value).toUpperCase()}</strong></div>
          <div class="voucher__body"><h3>${v.title}</h3><p>${v.desc}</p><small>HSD: ${v.expires} · Mã ${v.code}</small></div>
          ${isUsed ? '<span class="voucher__state">Đã dùng</span>' : '<a class="btn btn--primary btn--sm voucher__btn" href="cart.html">Dùng ngay</a>'}
        </article>`;
      }).join('')}</div>` : '<div class="empty-inline">Bạn chưa lưu voucher nào.</div>'}
      ${others.length ? `<h2 class="h3">Voucher có thể lưu</h2><div class="voucher-grid">${others.map(NM.voucherCard).join('')}</div>` : ''}`;
  };

  const wishlist = () => {
    const ids = NM.Wishlist.all();
    return `
      <div class="acc-head"><h1 class="h2">Sản phẩm yêu thích (${ids.length})</h1>
        ${ids.length ? '<button type="button" class="btn btn--outline btn--sm" data-acc="all-to-cart">Thêm tất cả vào giỏ</button>' : ''}</div>
      ${ids.length ? `<ul class="wish-list">${ids.map((id) => {
        const p = NM.productById[id];
        return `<li class="wish-item">
          <a href="product-detail.html?id=${p.id}"><img src="${p.image}" alt="" width="80" height="80" loading="lazy"></a>
          <div class="wish-item__info"><a href="product-detail.html?id=${p.id}"><strong>${escapeHTML(p.name)}</strong></a>
            <span class="price-now">${formatVND(NM.priceOf(p))}</span> <del class="muted">${formatVND(p.originalPrice)}</del></div>
          <div class="wish-item__actions">
            <button type="button" class="btn btn--primary btn--sm" data-acc="to-cart" data-id="${p.id}">Chuyển vào giỏ</button>
            <button type="button" class="btn btn--ghost btn--sm" data-acc="unwish" data-id="${p.id}">Xóa</button>
          </div></li>`;
      }).join('')}</ul>` : `<div class="empty-state"><div class="empty-state__art" aria-hidden="true">♡</div><h2>Chưa có sản phẩm yêu thích</h2><p>Nhấn biểu tượng trái tim trên sản phẩm để lưu lại xem sau.</p><a class="btn btn--primary" href="products.html">Khám phá sản phẩm</a></div>`}`;
  };

  const recent = () => {
    const ids = NM.Recent.all();
    return `
      <div class="acc-head"><h1 class="h2">Đã xem gần đây</h1>${ids.length ? '<button type="button" class="link-btn" data-acc="clear-recent">Xóa lịch sử</button>' : ''}</div>
      ${ids.length ? `<div class="product-grid product-grid--account">${ids.map((id) => NM.productCard(NM.productById[id])).join('')}</div>`
        : '<div class="empty-state"><div class="empty-state__art" aria-hidden="true">🕘</div><h2>Chưa xem sản phẩm nào</h2><p>Sản phẩm bạn xem sẽ được lưu tại đây.</p><a class="btn btn--primary" href="products.html">Bắt đầu mua sắm</a></div>'}`;
  };

  const VIEWS = { profile, orders, vouchers, wishlist, recent };

  NM.initAccount = () => {
    const root = $('#accountRoot');
    if (!root) return;
    const nav = $('#accountNav');
    const panel = $('#accountPanel');

    const current = () => (VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'profile');

    const render = () => {
      const u = NM.getUser();
      const sec = current();
      nav.innerHTML = `
        <div class="acc-user">
          <img src="${NM.avatarSVG(u.name, 12)}" alt="" width="56" height="56">
          <div><strong>${escapeHTML(u.name)}</strong><small>${u.tier} | ${u.xu.toLocaleString('vi-VN')} xu</small></div>
        </div>
        <ul>${SECTIONS.map(([k, ic, l]) => `<li><a href="#${k}" class="${k === sec ? 'is-active' : ''}" ${k === sec ? 'aria-current="page"' : ''}><span aria-hidden="true">${ic}</span> ${l}</a></li>`).join('')}</ul>`;
      panel.innerHTML = VIEWS[sec]();
      NM.Wishlist.sync();
    };

    window.addEventListener('hashchange', () => { render(); panel.focus(); });
    document.addEventListener('nm:wishlist', () => { if (current() === 'wishlist') render(); });
    document.addEventListener('nm:vouchers', () => { if (current() === 'vouchers') render(); });

    panel.addEventListener('submit', (e) => {
      if (e.target.id !== 'profileForm') return;
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      const err = $('#pfErr');
      if (!data.name.trim() || !/^\S+@\S+\.\S+$/.test(data.email) || !/^0\d[\d\s]{7,11}$/.test(data.phone)) {
        err.textContent = 'Kiểm tra lại họ tên, email và số điện thoại.'; err.hidden = false; return;
      }
      NM.saveUser({ ...store.get('user', {}), ...data });
      toast('Đã lưu hồ sơ');
      NM.renderUserMenu();
      render();
    });

    panel.addEventListener('click', (e) => {
      const b = e.target.closest('[data-acc]');
      const ob = e.target.closest('[data-order]');
      if (ob) NM.handleOrderAction(ob.dataset.order, ob.dataset.id, render);
      if (!b) return;
      const act = b.dataset.acc;
      if (act === 'to-cart') NM.Wishlist.moveToCart(b.dataset.id);
      if (act === 'unwish') NM.Wishlist.remove(b.dataset.id);
      if (act === 'all-to-cart') { NM.Wishlist.all().forEach((id) => NM.Cart.add(id, 1, null, true)); toast('Đã thêm tất cả vào giỏ hàng'); }
      if (act === 'clear-recent') { NM.Recent.clear(); render(); toast('Đã xóa lịch sử xem', 'info'); }
    });

    render();
  };
})(window.NM);
