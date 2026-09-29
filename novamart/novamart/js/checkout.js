/* ==========================================================
   NovaMart – checkout.js
   Vouchers, order storage and the checkout flow (mock payment).
   ========================================================== */
(function (NM) {
  'use strict';

  const { $, $$, store, formatVND, formatDate, escapeHTML, toast, openModal } = NM;

  /* ---------- Vouchers ---------- */
  const Vouchers = {
    collected() { return store.get('vouchers', []); },
    used() { return store.get('usedVouchers', []); },
    isCollected(code) { return Vouchers.collected().includes(code); },
    isUsed(code) { return Vouchers.used().includes(code); },
    available() { const u = Vouchers.used(); return Vouchers.collected().filter((c) => !u.includes(c)); },
    collect(code, silent) {
      const v = NM.VOUCHERS.find((x) => x.code === code);
      if (!v) return false;
      if (Vouchers.isCollected(code)) { if (!silent) toast('Bạn đã lưu voucher này rồi', 'info'); return true; }
      store.set('vouchers', [...Vouchers.collected(), code]);
      if (!silent) toast(`Đã lưu voucher ${v.title}`);
      NM.Notifications.push({ icon: '🎁', title: `Đã lưu voucher ${v.title}`, text: `${v.desc}. Dùng khi thanh toán trước ${v.expires}.`, link: 'account.html#vouchers' });
      document.dispatchEvent(new CustomEvent('nm:vouchers'));
      return true;
    },
    markUsed(code) { if (code) store.set('usedVouchers', [...Vouchers.used(), code]); },
    evaluate(code, subtotal, shipping) {
      const v = NM.VOUCHERS.find((x) => x.code === code);
      const res = { valid: false, discount: 0, shipDiscount: 0, error: '', voucher: v };
      if (!v) { res.error = 'Mã voucher không tồn tại.'; return res; }
      if (subtotal < v.min) { res.error = `Cần mua thêm ${formatVND(v.min - subtotal)} để dùng voucher này.`; return res; }
      res.valid = true;
      if (v.type === 'fixed') res.discount = Math.min(v.value, subtotal);
      if (v.type === 'percent') res.discount = Math.min(Math.round(subtotal * v.value / 100), v.max);
      if (v.type === 'ship') res.shipDiscount = Math.min(v.value, shipping);
      return res;
    }
  };
  NM.Vouchers = Vouchers;

  /* ---------- User ---------- */
  NM.getUser = () => ({ ...NM.DEFAULT_USER, ...store.get('user', {}) });
  NM.saveUser = (u) => store.set('user', u);

  /* ---------- Orders ---------- */
  const STATUS = {
    pending: 'Chờ thanh toán',
    to_ship: 'Chờ lấy hàng',
    shipping: 'Đang giao',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy'
  };

  const PAYMENTS = {
    cod: { label: 'Thanh toán khi nhận hàng (COD)', icon: '💵' },
    bank: { label: 'Chuyển khoản ngân hàng', icon: '🏦' },
    card: { label: 'Thẻ Visa / Mastercard', icon: '💳' },
    ewallet: { label: 'Ví điện tử', icon: '📱' }
  };

  const seedOrders = () => {
    const day = 86400000, now = Date.now();
    const mk = (id, status, ago, items, method, payment, extra = {}) => {
      const lines = items.map(([pid, qty]) => ({ product: NM.productById[pid], qty }));
      const t = NM.calcTotals(lines, null, method);
      const created = now - ago;
      const history = [{ status: 'placed', time: created }];
      if (status !== 'cancelled') history.push({ status: 'paid', time: created + 600000 });
      if (['shipping', 'completed'].includes(status)) history.push({ status: 'prepared', time: created + day / 2 }, { status: 'shipping', time: created + day });
      if (status === 'completed') history.push({ status: 'delivered', time: created + 2.5 * day });
      if (status === 'cancelled') history.push({ status: 'cancelled', time: created + 3600000 });
      return {
        id, status, createdAt: created,
        items: items.map(([pid, qty]) => ({ id: pid, qty, variant: NM.Cart.defaultVariant(NM.productById[pid]), price: NM.priceOf(NM.productById[pid]) })),
        address: NM.DEFAULT_USER.address,
        shippingMethod: { id: t.method.id, name: t.method.name },
        payment: payment, subtotal: t.subtotal, shipping: t.shipping, discount: 0, total: t.total,
        history, carrier: 'NovaExpress', tracking: 'NVX' + id.slice(-6), ...extra
      };
    };
    return [
      mk('NM2409180021', 'shipping', 1.2 * day, [['p039', 1], ['p014', 2]], 'fast', 'card'),
      mk('NM2409050007', 'completed', 12 * day, [['p048', 1], ['p049', 1], ['p031', 2]], 'standard', 'cod'),
      mk('NM2408220013', 'cancelled', 30 * day, [['p024', 2]], 'standard', 'ewallet', { cancelReason: 'Thay đổi phương thức thanh toán' })
    ];
  };

  const Orders = {
    STATUS, PAYMENTS,
    all() {
      let list = store.get('orders', null);
      if (!list) { list = seedOrders(); store.set('orders', list); }
      return list;
    },
    get(id) { return Orders.all().find((o) => o.id === id); },
    save(list) { store.set('orders', list); },
    add(order) { Orders.save([order, ...Orders.all()]); },
    update(id, fn) {
      const list = Orders.all();
      const o = list.find((x) => x.id === id);
      if (o) { fn(o); Orders.save(list); }
      return o;
    },
    newId() {
      const d = new Date(), pad = (n) => String(n).padStart(2, '0');
      return `NM${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}${String(Math.floor(Math.random() * 9000) + 1000)}`;
    },
    counts() {
      const c = { pending: 0, to_ship: 0, shipping: 0, completed: 0, cancelled: 0 };
      Orders.all().forEach((o) => { c[o.status] += 1; });
      return c;
    }
  };
  NM.Orders = Orders;

  /* ---------- Checkout page ---------- */
  const addressText = (a) => `${escapeHTML(a.street)}, ${escapeHTML(a.ward)}, ${escapeHTML(a.district)}, ${escapeHTML(a.city)}`;
  NM.addressText = addressText;

  const initCheckout = () => {
    const root = $('#checkoutRoot');
    if (!root) return;
    const session = store.get('checkout', null);
    const items = session && session.items ? session.items.filter((i) => NM.productById[i.id]) : [];

    if (!items.length) {
      root.innerHTML = `<div class="empty-state card"><div class="empty-state__art" aria-hidden="true">🧾</div>
        <h2>Chưa có sản phẩm để thanh toán</h2><p>Chọn sản phẩm trong giỏ hàng rồi nhấn “Mua hàng” để tiếp tục.</p>
        <a class="btn btn--primary" href="cart.html">Đến giỏ hàng</a></div>`;
      return;
    }

    const lines = items.map((i) => ({ ...i, product: NM.productById[i.id] }));
    const state = {
      method: 'standard',
      payment: 'cod',
      wallet: 'momo',
      card: { ccNumber: '', ccName: '', ccExp: '', ccCvv: '' },
      voucher: session.voucher && Vouchers.available().includes(session.voucher) ? session.voucher : '',
      note: ''
    };

    const render = () => {
      const user = NM.getUser();
      const a = user.address;
      const t = NM.calcTotals(lines, state.voucher, state.method);
      if (state.voucher && !t.voucher.valid) state.voucher = '';

      root.innerHTML = `
        <div class="checkout-layout">
          <div class="checkout-main">
            <section class="card co-block co-address" aria-labelledby="coAddr">
              <div class="co-block__head"><h2 id="coAddr"><span aria-hidden="true">📍</span> Địa chỉ nhận hàng</h2>
                <button type="button" class="link-btn" data-co="edit-address">Thay đổi</button></div>
              <address><strong>${escapeHTML(a.name)}</strong> <span class="muted">(${escapeHTML(a.phone)})</span><br>${addressText(a)}</address>
            </section>

            <section class="card co-block" aria-labelledby="coItems">
              <div class="co-block__head"><h2 id="coItems">Sản phẩm (${lines.reduce((s, l) => s + l.qty, 0)})</h2></div>
              <ul class="co-items">
                ${lines.map((l) => `
                  <li class="co-item">
                    <img src="${l.product.image}" alt="" width="64" height="64">
                    <div class="co-item__info"><strong>${escapeHTML(l.product.name)}</strong>
                      ${Object.keys(l.variant || {}).length ? `<small>${escapeHTML(Object.values(l.variant).join(' / '))}</small>` : ''}</div>
                    <span class="co-item__qty">x${l.qty}</span>
                    <span class="co-item__price">${formatVND(NM.priceOf(l.product) * l.qty)}</span>
                  </li>`).join('')}
              </ul>
              <label class="co-note">Lời nhắn cho người bán
                <input type="text" class="input" id="coNote" maxlength="120" placeholder="Ví dụ: Giao giờ hành chính" value="${escapeHTML(state.note)}"></label>
            </section>

            <section class="card co-block" aria-labelledby="coShip">
              <div class="co-block__head"><h2 id="coShip"><span aria-hidden="true">🚚</span> Phương thức vận chuyển</h2></div>
              <div class="option-list" role="radiogroup" aria-labelledby="coShip">
                ${NM.SHIPPING_METHODS.map((m) => {
                  const fee = NM.calcTotals(lines, null, m.id).shipping;
                  return `<label class="option ${state.method === m.id ? 'is-active' : ''}">
                    <input type="radio" name="coMethod" value="${m.id}" ${state.method === m.id ? 'checked' : ''}>
                    <span class="option__main"><strong>${m.name}</strong><small>${m.eta}</small></span>
                    <span class="option__price">${fee ? formatVND(fee) : '<span class="success">Miễn phí</span>'}</span>
                  </label>`;
                }).join('')}
              </div>
            </section>

            <section class="card co-block" aria-labelledby="coPay">
              <div class="co-block__head"><h2 id="coPay"><span aria-hidden="true">💳</span> Phương thức thanh toán</h2></div>
              <div class="option-list option-list--grid" role="radiogroup" aria-labelledby="coPay">
                ${Object.entries(PAYMENTS).map(([id, pm]) => `
                  <label class="option ${state.payment === id ? 'is-active' : ''}">
                    <input type="radio" name="coPayment" value="${id}" ${state.payment === id ? 'checked' : ''}>
                    <span class="option__icon" aria-hidden="true">${pm.icon}</span>
                    <span class="option__main"><strong>${pm.label}</strong></span>
                  </label>`).join('')}
              </div>
              <div class="pay-detail">${paymentDetail(state)}</div>
            </section>

            <section class="card co-block" aria-labelledby="coVoucher">
              <div class="co-block__head"><h2 id="coVoucher"><span aria-hidden="true">🎟️</span> Voucher NovaMart</h2></div>
              ${NM.voucherSelect(state.voucher, t.subtotal, 'coVoucherSelect')}
              <div class="code-entry">
                <input type="text" class="input" id="coCode" placeholder="Nhập mã voucher (ví dụ NOVA50K)" aria-label="Mã voucher">
                <button type="button" class="btn btn--outline" data-co="apply-code">Áp dụng</button>
              </div>
              ${state.voucher && t.voucher.valid ? `<p class="field-hint success">✓ Đã áp dụng ${t.voucher.voucher.title} – tiết kiệm ${formatVND(t.voucher.discount + t.voucher.shipDiscount)}</p>` : ''}
            </section>
          </div>

          <aside class="card co-summary" aria-label="Chi tiết thanh toán">
            <h2>Chi tiết thanh toán</h2>
            <dl class="summary">
              <div><dt>Tổng tiền hàng</dt><dd>${formatVND(t.subtotal)}</dd></div>
              <div><dt>Phí vận chuyển</dt><dd>${t.shipping ? formatVND(t.shipping) : '<span class="success">Miễn phí</span>'}</dd></div>
              ${t.voucher.shipDiscount ? `<div><dt>Giảm phí vận chuyển</dt><dd class="success">−${formatVND(t.voucher.shipDiscount)}</dd></div>` : ''}
              <div><dt>Voucher giảm giá</dt><dd class="success">−${formatVND(t.voucher.discount)}</dd></div>
              <div class="summary__total"><dt>Tổng thanh toán</dt><dd>${formatVND(t.total)}</dd></div>
            </dl>
            <p class="summary__note">Bạn tiết kiệm ${formatVND(t.saved + t.voucher.discount + t.voucher.shipDiscount)} cho đơn hàng này.</p>
            <button type="button" class="btn btn--primary btn--block btn--lg" data-co="place">Đặt hàng</button>
            <p class="fine">Nhấn “Đặt hàng” đồng nghĩa với việc bạn đồng ý với Điều khoản NovaMart. Đây là bản demo – không có giao dịch thật.</p>
          </aside>
        </div>`;
    };

    const paymentDetail = (s) => {
      if (s.payment === 'bank') return `<div class="pay-box"><p>Chuyển khoản sau khi đặt hàng tới:</p>
        <dl class="kv"><div><dt>Ngân hàng</dt><dd>NovaBank (demo)</dd></div><div><dt>Số tài khoản</dt><dd>0123 4567 8910</dd></div>
        <div><dt>Chủ tài khoản</dt><dd>CÔNG TY TNHH NOVAMART</dd></div><div><dt>Nội dung</dt><dd>Mã đơn hàng của bạn</dd></div></dl></div>`;
      if (s.payment === 'card') return `<div class="pay-box card-form">
        <label>Số thẻ<input class="input" id="ccNumber" value="${escapeHTML(s.card.ccNumber)}" inputmode="numeric" autocomplete="cc-number" placeholder="4111 1111 1111 1111" maxlength="19"></label>
        <label>Tên in trên thẻ<input class="input" id="ccName" value="${escapeHTML(s.card.ccName)}" autocomplete="cc-name" placeholder="NGUYEN VAN A"></label>
        <div class="card-form__row"><label>Hết hạn<input class="input" id="ccExp" value="${escapeHTML(s.card.ccExp)}" autocomplete="cc-exp" placeholder="MM/YY" maxlength="5"></label>
        <label>CVV<input class="input" id="ccCvv" value="${escapeHTML(s.card.ccCvv)}" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4"></label></div>
        <p class="field-hint">Thanh toán mô phỏng – không nhập thông tin thẻ thật.</p></div>`;
      if (s.payment === 'ewallet') return `<div class="pay-box"><div class="chip-row" role="radiogroup" aria-label="Chọn ví">
        ${[['momo', 'MoMo'], ['zalopay', 'ZaloPay'], ['vnpay', 'VNPay'], ['novapay', 'NovaPay']].map(([id, n]) =>
          `<button type="button" class="chip ${s.wallet === id ? 'is-active' : ''}" role="radio" aria-checked="${s.wallet === id}" data-wallet="${id}">${n}</button>`).join('')}
        </div><p class="field-hint">Bạn sẽ xác nhận thanh toán trên ví sau khi đặt hàng (mô phỏng).</p></div>`;
      return '<div class="pay-box"><p>Thanh toán bằng tiền mặt khi nhận hàng. Vui lòng chuẩn bị đúng số tiền.</p></div>';
    };

    const editAddress = () => {
      const u = NM.getUser(), a = u.address;
      const field = (id, label, val, extra = '') => `<label class="field">${label}<input class="input" id="${id}" value="${escapeHTML(val)}" required ${extra}></label>`;
      openModal({
        title: 'Địa chỉ nhận hàng',
        body: `<form class="form-grid" id="addrForm" novalidate>
          ${field('aName', 'Họ và tên', a.name, 'autocomplete="name"')}
          ${field('aPhone', 'Số điện thoại', a.phone, 'autocomplete="tel" inputmode="tel"')}
          ${field('aStreet', 'Số nhà, tên đường', a.street, 'autocomplete="street-address"')}
          ${field('aWard', 'Phường/Xã', a.ward)}
          ${field('aDistrict', 'Quận/Huyện', a.district)}
          ${field('aCity', 'Tỉnh/Thành phố', a.city)}
          <p class="field-hint danger" id="addrErr" hidden></p></form>`,
        actions: [{ label: 'Hủy', value: false }, { label: 'Lưu địa chỉ', variant: 'btn--primary', value: true }],
        onAction: (ok, modal) => {
          if (!ok) return;
          const val = (id) => $('#' + id, modal).value.trim();
          const next = { name: val('aName'), phone: val('aPhone'), street: val('aStreet'), ward: val('aWard'), district: val('aDistrict'), city: val('aCity') };
          if (Object.values(next).some((x) => !x)) { const e = $('#addrErr', modal); e.textContent = 'Vui lòng điền đầy đủ thông tin.'; e.hidden = false; return false; }
          if (!/^0\d[\d\s]{7,11}$/.test(next.phone)) { const e = $('#addrErr', modal); e.textContent = 'Số điện thoại không hợp lệ (ví dụ 0901 234 567).'; e.hidden = false; return false; }
          NM.saveUser({ ...store.get('user', {}), address: next });
          toast('Đã cập nhật địa chỉ nhận hàng');
          render();
        }
      });
    };

    const validateCard = () => {
      const num = ($('#ccNumber').value || '').replace(/\s/g, '');
      const name = ($('#ccName').value || '').trim();
      const exp = ($('#ccExp').value || '').trim();
      const cvv = ($('#ccCvv').value || '').trim();
      if (!/^\d{16}$/.test(num)) return 'Số thẻ cần đủ 16 chữ số.';
      if (!name) return 'Vui lòng nhập tên in trên thẻ.';
      const m = exp.match(/^(\d{2})\/(\d{2})$/);
      if (!m || +m[1] < 1 || +m[1] > 12) return 'Ngày hết hạn có dạng MM/YY.';
      const expDate = new Date(2000 + +m[2], +m[1], 0, 23, 59);
      if (expDate < new Date()) return 'Thẻ đã hết hạn.';
      if (!/^\d{3,4}$/.test(cvv)) return 'Mã CVV gồm 3 hoặc 4 chữ số.';
      return '';
    };

    const placeOrder = () => {
      if (state.payment === 'card') {
        const err = validateCard();
        if (err) { toast(err, 'error'); $('#ccNumber').focus(); return; }
      }
      const t = NM.calcTotals(lines, state.voucher, state.method);
      const user = NM.getUser();
      const id = Orders.newId();
      const now = Date.now();
      const paidInstantly = state.payment === 'card' || state.payment === 'ewallet' || state.payment === 'cod';
      const order = {
        id, createdAt: now,
        status: state.payment === 'bank' ? 'pending' : 'to_ship',
        items: lines.map((l) => ({ id: l.id, qty: l.qty, variant: l.variant, price: NM.priceOf(l.product) })),
        address: user.address,
        shippingMethod: { id: t.method.id, name: t.method.name },
        payment: state.payment, wallet: state.payment === 'ewallet' ? state.wallet : undefined,
        subtotal: t.subtotal, shipping: t.shipping, discount: t.voucher.discount + t.voucher.shipDiscount, total: t.total,
        voucher: state.voucher || null, note: state.note,
        history: [{ status: 'placed', time: now }].concat(paidInstantly ? [{ status: 'paid', time: now + 1000 }] : []),
        carrier: 'NovaExpress', tracking: 'NVX' + id.slice(-6)
      };

      NM.loading(true, state.payment === 'card' || state.payment === 'ewallet' ? 'Đang xác thực thanh toán...' : 'Đang tạo đơn hàng...');
      setTimeout(() => {
        Orders.add(order);
        if (state.voucher) Vouchers.markUsed(state.voucher);
        if (session.source === 'cart') NM.Cart.remove(items.map((i) => i.key));
        store.remove('checkout');
        store.remove('cartVoucher');
        NM.Notifications.push({ icon: '🧾', title: 'Đặt hàng thành công', text: `Đơn ${id} trị giá ${formatVND(t.total)} đã được ghi nhận.`, link: `orders.html?id=${id}` });
        NM.loading(false);
        toast('Đặt hàng thành công');
        renderSuccess(order);
      }, 1400);
    };

    const renderSuccess = (o) => {
      const eta = new Date(o.createdAt + ({ standard: 4, fast: 2, sameday: 0 }[o.shippingMethod.id]) * 86400000);
      root.innerHTML = `
        <section class="card success-card" aria-labelledby="okTitle">
          <div class="success-card__mark" aria-hidden="true">✓</div>
          <h1 id="okTitle">Đặt hàng thành công</h1>
          <p>Cảm ơn bạn đã mua sắm tại NovaMart. Chúng tôi đã gửi xác nhận tới ${escapeHTML(NM.getUser().email)}.</p>
          <dl class="kv kv--center">
            <div><dt>Mã đơn hàng</dt><dd><strong>${o.id}</strong></dd></div>
            <div><dt>Tổng thanh toán</dt><dd><strong class="price-now">${formatVND(o.total)}</strong></dd></div>
            <div><dt>Thanh toán</dt><dd>${PAYMENTS[o.payment].label}</dd></div>
            <div><dt>Dự kiến giao</dt><dd>${formatDate(eta, false)}</dd></div>
          </dl>
          ${o.payment === 'bank' ? `<div class="pay-box"><p>Vui lòng chuyển <strong>${formatVND(o.total)}</strong> tới STK <strong>0123 4567 8910</strong> (NovaBank) với nội dung <strong>${o.id}</strong>. Đơn sẽ được xử lý sau khi nhận tiền.</p></div>` : ''}
          <div class="success-card__cta">
            <a class="btn btn--primary" href="orders.html?id=${o.id}">Xem đơn hàng</a>
            <a class="btn btn--ghost" href="index.html">Tiếp tục mua sắm</a>
          </div>
        </section>`;
      $('.checkout-steps') && $$('.checkout-steps li').forEach((li) => li.classList.add('is-done'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    root.addEventListener('change', (e) => {
      const el = e.target;
      if (el.name === 'coMethod') { state.method = el.value; render(); }
      if (el.name === 'coPayment') { state.payment = el.value; render(); }
      if (el.id === 'coVoucherSelect') { state.voucher = el.value; render(); }
      if (el.id === 'coNote') state.note = el.value;
    });
    root.addEventListener('input', (e) => {
      if (e.target.id === 'ccNumber') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
      if (e.target.id === 'ccExp') e.target.value = e.target.value.replace(/[^\d]/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
      if (e.target.id === 'coNote') state.note = e.target.value;
      if (e.target.id in state.card) state.card[e.target.id] = e.target.value;
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-co]');
      const w = e.target.closest('[data-wallet]');
      if (w) { state.wallet = w.dataset.wallet; render(); return; }
      if (!b) return;
      if (b.dataset.co === 'edit-address') editAddress();
      if (b.dataset.co === 'place') placeOrder();
      if (b.dataset.co === 'apply-code') {
        const code = $('#coCode').value.trim().toUpperCase();
        if (!code) return toast('Nhập mã voucher trước khi áp dụng', 'info');
        if (!NM.VOUCHERS.find((v) => v.code === code)) return toast('Mã voucher không tồn tại', 'error');
        if (Vouchers.isUsed(code)) return toast('Voucher này đã được sử dụng', 'error');
        const res = Vouchers.evaluate(code, NM.calcTotals(lines, null, state.method).subtotal, 0);
        if (!res.valid) return toast(res.error, 'error');
        Vouchers.collect(code, true);
        state.voucher = code;
        toast('Đã áp dụng voucher');
        render();
      }
    });

    render();
  };

  NM.initCheckout = initCheckout;
})(window.NM);
