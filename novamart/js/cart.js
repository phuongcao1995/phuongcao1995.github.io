/* ==========================================================
   NovaMart – cart.js
   Cart state (localStorage), pricing rules and the cart page.
   ========================================================== */
(function (NM) {
  'use strict';

  const { $, store, formatVND, escapeHTML, toast, confirmDialog } = NM;

  /* ---------- Pricing ---------- */
  /** Effective price: flash-sale price wins while the item is in the sale. */
  NM.priceOf = (p) => (NM.flashById[p.id] ? NM.flashById[p.id].price : p.price);

  NM.SHIPPING_METHODS = [
    { id: 'standard', name: 'Giao tiêu chuẩn', eta: 'Nhận hàng trong 3–5 ngày', fee: 30000 },
    { id: 'fast', name: 'Giao nhanh', eta: 'Nhận hàng trong 1–2 ngày', fee: 50000 },
    { id: 'sameday', name: 'Giao trong ngày', eta: 'Nhận trước 21:00 hôm nay (nội thành)', fee: 80000 }
  ];
  const FREESHIP_THRESHOLD = 500000;

  /**
   * lines: [{product, qty}] ; voucherCode ; methodId
   */
  NM.calcTotals = (lines, voucherCode, methodId = 'standard') => {
    let subtotal = 0, saved = 0;
    lines.forEach(({ product, qty }) => {
      const price = NM.priceOf(product);
      subtotal += price * qty;
      saved += (product.originalPrice - price) * qty;
    });
    const method = NM.SHIPPING_METHODS.find((m) => m.id === methodId) || NM.SHIPPING_METHODS[0];
    const allFree = lines.length > 0 && lines.every((l) => l.product.freeShipping);
    let shipping = lines.length ? method.fee : 0;
    let shippingNote = '';
    if (method.id === 'standard' && (allFree || subtotal >= FREESHIP_THRESHOLD)) {
      shipping = 0;
      shippingNote = allFree ? 'Sản phẩm được miễn phí vận chuyển' : `Miễn phí cho đơn từ ${formatVND(FREESHIP_THRESHOLD)}`;
    }
    const v = voucherCode ? NM.Vouchers.evaluate(voucherCode, subtotal, shipping) : { discount: 0, shipDiscount: 0, valid: false };
    const total = Math.max(0, subtotal + shipping - v.discount - v.shipDiscount);
    return { subtotal, saved, shipping, shippingNote, method, voucher: v, total };
  };

  /* ---------- Cart state ---------- */
  const emit = () => document.dispatchEvent(new CustomEvent('nm:cart'));
  const keyOf = (id, variant) => id + '|' + Object.values(variant || {}).join('/');

  const defaultVariant = (p) => {
    const v = {};
    Object.keys(p.variants).forEach((k) => { v[k] = p.variants[k][0]; });
    return v;
  };

  const Cart = {
    items() {
      return store.get('cart', []).filter((i) => NM.productById[i.id]);
    },
    save(items) { store.set('cart', items); emit(); },
    lines(items = Cart.items()) {
      return items.map((i) => ({ ...i, product: NM.productById[i.id] }));
    },
    count() { return Cart.items().reduce((s, i) => s + i.qty, 0); },
    add(id, qty = 1, variant, silent = false) {
      const p = NM.productById[id];
      if (!p) return;
      variant = variant || defaultVariant(p);
      const items = Cart.items();
      const key = keyOf(id, variant);
      const found = items.find((i) => i.key === key);
      if (found) found.qty = Math.min(p.stock, found.qty + qty);
      else items.unshift({ key, id, qty: Math.min(p.stock, qty), variant, selected: true, addedAt: Date.now() });
      Cart.save(items);
      if (!silent) toast('Đã thêm vào giỏ hàng');
      const badge = $('.cart-link .badge');
      if (badge) { badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); }
    },
    setQty(key, qty) {
      const items = Cart.items();
      const it = items.find((i) => i.key === key);
      if (!it) return;
      const stock = NM.productById[it.id].stock;
      it.qty = Math.max(1, Math.min(stock, qty));
      if (qty > stock) toast(`Chỉ còn ${stock} sản phẩm trong kho`, 'info');
      Cart.save(items);
    },
    remove(keys) {
      const set = new Set([].concat(keys));
      Cart.save(Cart.items().filter((i) => !set.has(i.key)));
    },
    setSelected(key, val) {
      const items = Cart.items();
      items.forEach((i) => { if (key === '*' || i.key === key) i.selected = val; });
      Cart.save(items);
    },
    defaultVariant,
    keyOf
  };
  NM.Cart = Cart;

  /* ---------- Cart page ---------- */
  let cartVoucher = store.get('cartVoucher', '');

  const variantText = (variant) => Object.entries(variant || {}).map(([k, v]) => `${k}: ${v}`).join(' · ');

  const renderCartPage = () => {
    const root = $('#cartRoot');
    if (!root) return;
    const lines = Cart.lines();

    if (!lines.length) {
      root.innerHTML = `
        <div class="empty-state card">
          <div class="empty-state__art" aria-hidden="true">🛒</div>
          <h2>Giỏ hàng đang trống</h2>
          <p>Thêm sản phẩm bạn thích vào giỏ để đặt hàng nhanh hơn.</p>
          <a class="btn btn--primary" href="products.html">Tiếp tục mua sắm</a>
        </div>
        <section class="section"><div class="section__head"><h2 class="section__title">Có thể bạn sẽ thích</h2></div>
        <div class="product-grid">${NM.PRODUCTS.slice(0, 10).map(NM.productCard).join('')}</div></section>`;
      return;
    }

    const selected = lines.filter((l) => l.selected);
    const allSelected = selected.length === lines.length;
    if (cartVoucher && !NM.Vouchers.available().includes(cartVoucher)) cartVoucher = '';
    const t = NM.calcTotals(selected, cartVoucher);

    root.innerHTML = `
      <div class="cart-layout">
        <div class="cart-main">
          <div class="card cart-head">
            <label class="check"><input type="checkbox" data-cart="select-all" ${allSelected ? 'checked' : ''}><span>Chọn tất cả (${lines.length})</span></label>
            <button class="link-btn danger" type="button" data-cart="remove-selected" ${selected.length ? '' : 'disabled'}>Xóa mục đã chọn</button>
          </div>
          <ul class="card cart-list" aria-label="Sản phẩm trong giỏ">
            ${lines.map((l) => {
              const p = l.product, price = NM.priceOf(p);
              return `
              <li class="cart-item ${l.selected ? 'is-selected' : ''}" data-key="${escapeHTML(l.key)}">
                <label class="check"><input type="checkbox" data-cart="select" ${l.selected ? 'checked' : ''} aria-label="Chọn ${escapeHTML(p.name)}"></label>
                <a class="cart-item__img" href="product-detail.html?id=${p.id}"><img src="${p.image}" alt="${escapeHTML(p.name)}" loading="lazy"></a>
                <div class="cart-item__info">
                  <a class="cart-item__name" href="product-detail.html?id=${p.id}">${p.mall ? '<span class="badge-mall">Mall</span>' : ''}${escapeHTML(p.name)}</a>
                  ${l.variant && Object.keys(l.variant).length ? `<span class="cart-item__variant">${escapeHTML(variantText(l.variant))}</span>` : ''}
                  <div class="cart-item__tags">${p.freeShipping ? '<span class="tag tag--ship">Freeship</span>' : ''}${NM.flashById[p.id] ? '<span class="tag tag--flash">Flash Sale</span>' : ''}</div>
                </div>
                <div class="cart-item__price"><strong>${formatVND(price)}</strong><del>${formatVND(p.originalPrice)}</del></div>
                <div class="qty" role="group" aria-label="Số lượng">
                  <button type="button" data-cart="dec" aria-label="Giảm số lượng" ${l.qty <= 1 ? 'disabled' : ''}>−</button>
                  <input type="number" min="1" max="${p.stock}" value="${l.qty}" data-cart="qty" aria-label="Số lượng ${escapeHTML(p.name)}">
                  <button type="button" data-cart="inc" aria-label="Tăng số lượng" ${l.qty >= p.stock ? 'disabled' : ''}>+</button>
                </div>
                <div class="cart-item__total">${formatVND(price * l.qty)}</div>
                <button class="icon-btn cart-item__remove" type="button" data-cart="remove" aria-label="Xóa ${escapeHTML(p.name)}">🗑</button>
              </li>`;
            }).join('')}
          </ul>
        </div>

        <aside class="cart-summary card" aria-label="Tóm tắt đơn hàng">
          <h2>Tóm tắt đơn hàng</h2>
          <div class="voucher-picker">
            <label for="cartVoucher">Voucher NovaMart</label>
            ${voucherSelect(cartVoucher, t.subtotal, 'cartVoucher')}
            ${cartVoucher && !t.voucher.valid ? `<p class="field-hint danger">${t.voucher.error}</p>` : ''}
            <a class="link-btn" href="index.html#vouchers">Thu thập thêm voucher</a>
          </div>
          <dl class="summary">
            <div><dt>Tạm tính (${selected.reduce((s, l) => s + l.qty, 0)} sản phẩm)</dt><dd>${formatVND(t.subtotal)}</dd></div>
            <div><dt>Phí vận chuyển</dt><dd>${selected.length ? (t.shipping ? formatVND(t.shipping) : '<span class="success">Miễn phí</span>') : formatVND(0)}</dd></div>
            ${t.shippingNote && selected.length ? `<p class="summary__note">${t.shippingNote}</p>` : ''}
            <div><dt>Giảm giá sản phẩm</dt><dd class="success">−${formatVND(t.saved)}</dd></div>
            <div><dt>Voucher</dt><dd class="success">−${formatVND(t.voucher.discount + t.voucher.shipDiscount)}</dd></div>
            <div class="summary__total"><dt>Tổng thanh toán</dt><dd>${formatVND(t.total)}</dd></div>
          </dl>
          <button class="btn btn--primary btn--block btn--lg" type="button" data-cart="checkout" ${selected.length ? '' : 'disabled'}>Mua hàng (${selected.length})</button>
          ${selected.length ? '' : '<p class="field-hint">Chọn ít nhất một sản phẩm để thanh toán.</p>'}
        </aside>
      </div>`;
  };

  /** Shared voucher <select> used by cart and checkout. */
  function voucherSelect(current, subtotal, id) {
    const codes = NM.Vouchers.available();
    if (!codes.length) return `<p class="field-hint">Bạn chưa có voucher nào. Thu thập voucher ở trang chủ.</p>`;
    return `<select id="${id}" class="select">
      <option value="">Không dùng voucher</option>
      ${codes.map((c) => {
        const v = NM.VOUCHERS.find((x) => x.code === c);
        const ok = subtotal >= v.min;
        return `<option value="${c}" ${c === current ? 'selected' : ''} ${ok ? '' : 'disabled'}>${v.title} – ${v.desc}${ok ? '' : ' (chưa đủ điều kiện)'}</option>`;
      }).join('')}
    </select>`;
  }
  NM.voucherSelect = voucherSelect;

  const initCartPage = () => {
    const root = $('#cartRoot');
    if (!root) return;
    renderCartPage();
    document.addEventListener('nm:cart', renderCartPage);

    root.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-cart]');
      if (!btn || btn.tagName === 'INPUT' && btn.type === 'number') return;
      const row = btn.closest('.cart-item');
      const key = row && row.dataset.key;
      const action = btn.dataset.cart;
      const item = key && Cart.items().find((i) => i.key === key);

      if (action === 'inc') Cart.setQty(key, item.qty + 1);
      if (action === 'dec') Cart.setQty(key, item.qty - 1);
      if (action === 'remove') {
        const ok = await confirmDialog(`Xóa “${escapeHTML(NM.productById[item.id].name)}” khỏi giỏ hàng?`, { okLabel: 'Xóa', danger: true });
        if (ok) { Cart.remove(key); toast('Đã xóa sản phẩm khỏi giỏ'); }
      }
      if (action === 'remove-selected') {
        const keys = Cart.items().filter((i) => i.selected).map((i) => i.key);
        const ok = await confirmDialog(`Xóa ${keys.length} sản phẩm đã chọn khỏi giỏ hàng?`, { okLabel: 'Xóa', danger: true });
        if (ok) { Cart.remove(keys); toast('Đã xóa các sản phẩm đã chọn'); }
      }
      if (action === 'checkout') {
        const items = Cart.items().filter((i) => i.selected);
        store.set('checkout', { source: 'cart', items: items.map(({ key, id, qty, variant }) => ({ key, id, qty, variant })), voucher: cartVoucher });
        location.href = 'checkout.html';
      }
    });

    root.addEventListener('change', (e) => {
      const el = e.target;
      const row = el.closest('.cart-item');
      if (el.dataset.cart === 'select-all') Cart.setSelected('*', el.checked);
      if (el.dataset.cart === 'select') Cart.setSelected(row.dataset.key, el.checked);
      if (el.dataset.cart === 'qty') Cart.setQty(row.dataset.key, parseInt(el.value, 10) || 1);
      if (el.id === 'cartVoucher') { cartVoucher = el.value; store.set('cartVoucher', cartVoucher); renderCartPage(); }
    });
  };

  NM.initCartPage = initCartPage;
})(window.NM);
