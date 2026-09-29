/* ==========================================================
   NovaMart – orders.js
   Order history, order detail & tracking timeline.
   ========================================================== */
(function (NM) {
  'use strict';

  const { $, $$, formatVND, formatDate, escapeHTML, toast, confirmDialog, openModal, store } = NM;

  const TABS = [
    ['all', 'Tất cả'], ['pending', 'Chờ thanh toán'], ['to_ship', 'Chờ lấy hàng'],
    ['shipping', 'Đang giao'], ['completed', 'Hoàn thành'], ['cancelled', 'Đã hủy']
  ];

  const STEPS = [
    { key: 'placed', label: 'Đơn hàng đã đặt' },
    { key: 'paid', label: 'Đã xác nhận thanh toán' },
    { key: 'prepared', label: 'Đang chuẩn bị hàng' },
    { key: 'shipping', label: 'Đang giao hàng' },
    { key: 'delivered', label: 'Giao hàng thành công' }
  ];
  const LEVEL = { pending: 1, to_ship: 2, shipping: 3, completed: 5 };

  const statusBadge = (s) => `<span class="status status--${s}">${NM.Orders.STATUS[s]}</span>`;

  const orderActions = (o) => {
    const a = [];
    if (o.status === 'pending') a.push(['paid', 'Tôi đã chuyển khoản', 'btn--primary'], ['cancel', 'Hủy đơn', 'btn--ghost']);
    if (o.status === 'to_ship') a.push(['ship', 'Mô phỏng giao cho vận chuyển', 'btn--outline'], ['cancel', 'Hủy đơn', 'btn--ghost']);
    if (o.status === 'shipping') a.push(['received', 'Đã nhận được hàng', 'btn--primary']);
    if (o.status === 'completed') a.push([o.reviewed ? 'reviewed' : 'review', o.reviewed ? 'Đã đánh giá' : 'Đánh giá', o.reviewed ? 'btn--ghost' : 'btn--outline'], ['rebuy', 'Mua lại', 'btn--primary']);
    if (o.status === 'cancelled') a.push(['rebuy', 'Mua lại', 'btn--primary']);
    return a.map(([act, label, cls]) => `<button type="button" class="btn ${cls} btn--sm" data-order="${act}" data-id="${o.id}" ${act === 'reviewed' ? 'disabled' : ''}>${label}</button>`).join('');
  };

  const orderCard = (o) => {
    const first = NM.productById[o.items[0].id];
    const more = o.items.length - 1;
    return `
      <article class="card order-card">
        <header class="order-card__head">
          <span><strong>${o.id}</strong> <small class="muted">${formatDate(o.createdAt)}</small></span>
          ${statusBadge(o.status)}
        </header>
        <a class="order-card__body" href="orders.html?id=${o.id}">
          <img src="${first.image}" alt="" width="72" height="72">
          <div><strong>${escapeHTML(first.name)}</strong>
            <small>x${o.items[0].qty}${more > 0 ? ` và ${more} sản phẩm khác` : ''}</small></div>
          <span class="order-card__total">${formatVND(o.total)}</span>
        </a>
        <footer class="order-card__foot">
          <a class="link-btn" href="orders.html?id=${o.id}">Xem chi tiết</a>
          <div class="order-card__actions">${orderActions(o)}</div>
        </footer>
      </article>`;
  };
  NM.orderCard = orderCard;

  const tracking = (o) => {
    if (o.status === 'cancelled') {
      const c = o.history.find((h) => h.status === 'cancelled');
      return `<div class="track-cancel"><strong>Đơn hàng đã hủy</strong> lúc ${formatDate(c ? c.time : o.createdAt)}${o.cancelReason ? `<br>Lý do: ${escapeHTML(o.cancelReason)}` : ''}</div>`;
    }
    const level = LEVEL[o.status];
    const timeOf = (key) => { const h = o.history.find((x) => x.status === key); return h ? formatDate(h.time) : ''; };
    return `<ol class="tracker" aria-label="Trạng thái đơn hàng">
      ${STEPS.map((s, i) => {
        const state = i < level ? 'done' : i === level ? 'current' : 'todo';
        const label = state === 'done' ? 'Hoàn tất' : state === 'current' ? 'Đang thực hiện' : 'Chưa thực hiện';
        return `<li class="tracker__step is-${state}">
          <span class="tracker__dot" aria-hidden="true">${state === 'done' ? '✓' : ''}</span>
          <div><strong>${s.label}</strong><small>${state === 'done' ? timeOf(s.key) : state === 'current' ? (o.status === 'pending' ? 'Đang chờ bạn thanh toán' : 'Đang xử lý') : ''}</small>
          <span class="sr-only">${label}</span></div>
        </li>`;
      }).join('')}
    </ol>`;
  };

  const detailView = (o) => {
    const lines = o.items.map((i) => ({ ...i, product: NM.productById[i.id] }));
    return `
      <a class="link-btn back-link" href="orders.html">‹ Quay lại danh sách đơn</a>
      <div class="order-detail">
        <section class="card co-block">
          <div class="co-block__head"><h1 class="h2">Đơn hàng ${o.id}</h1>${statusBadge(o.status)}</div>
          <p class="muted">Đặt lúc ${formatDate(o.createdAt)} | Vận chuyển: ${o.carrier} – mã vận đơn ${o.tracking}</p>
          ${tracking(o)}
          <div class="order-card__actions order-detail__actions">${orderActions(o)}</div>
        </section>
        <div class="order-detail__grid">
          <section class="card co-block">
            <h2 class="h3">Địa chỉ nhận hàng</h2>
            <address><strong>${escapeHTML(o.address.name)}</strong> (${escapeHTML(o.address.phone)})<br>${NM.addressText(o.address)}</address>
          </section>
          <section class="card co-block">
            <h2 class="h3">Thanh toán & vận chuyển</h2>
            <p>${NM.Orders.PAYMENTS[o.payment].icon} ${NM.Orders.PAYMENTS[o.payment].label}${o.wallet ? ` (${o.wallet.toUpperCase()})` : ''}</p>
            <p>🚚 ${o.shippingMethod.name}</p>
            ${o.note ? `<p>📝 ${escapeHTML(o.note)}</p>` : ''}
          </section>
        </div>
        <section class="card co-block">
          <h2 class="h3">Sản phẩm</h2>
          <ul class="co-items">
            ${lines.map((l) => `<li class="co-item">
              <img src="${l.product.image}" alt="" width="64" height="64">
              <div class="co-item__info"><a href="product-detail.html?id=${l.id}"><strong>${escapeHTML(l.product.name)}</strong></a>
                ${Object.keys(l.variant || {}).length ? `<small>${escapeHTML(Object.values(l.variant).join(' / '))}</small>` : ''}</div>
              <span class="co-item__qty">x${l.qty}</span><span class="co-item__price">${formatVND(l.price * l.qty)}</span></li>`).join('')}
          </ul>
          <dl class="summary summary--inline">
            <div><dt>Tổng tiền hàng</dt><dd>${formatVND(o.subtotal)}</dd></div>
            <div><dt>Phí vận chuyển</dt><dd>${o.shipping ? formatVND(o.shipping) : 'Miễn phí'}</dd></div>
            <div><dt>Voucher</dt><dd class="success">−${formatVND(o.discount || 0)}</dd></div>
            <div class="summary__total"><dt>Thành tiền</dt><dd>${formatVND(o.total)}</dd></div>
          </dl>
        </section>
      </div>`;
  };

  /* ---------- Actions (shared with account page) ---------- */
  const handleAction = async (act, id, rerender) => {
    const O = NM.Orders;
    if (act === 'cancel') {
      const reasons = ['Muốn thay đổi địa chỉ', 'Muốn đổi sản phẩm/phân loại', 'Tìm thấy giá tốt hơn', 'Không còn nhu cầu'];
      openModal({
        title: 'Hủy đơn hàng',
        size: 'modal--sm',
        body: `<p class="modal__text">Chọn lý do hủy đơn ${id}:</p>${reasons.map((r, i) => `<label class="radio"><input type="radio" name="cReason" value="${r}" ${i === 0 ? 'checked' : ''}><span>${r}</span></label>`).join('')}`,
        actions: [{ label: 'Giữ đơn', value: false }, { label: 'Hủy đơn', variant: 'btn--danger', value: true }],
        onAction: (ok, modal) => {
          if (!ok) return;
          const reason = $('input[name="cReason"]:checked', modal).value;
          O.update(id, (o) => { o.status = 'cancelled'; o.cancelReason = reason; o.history.push({ status: 'cancelled', time: Date.now() }); });
          toast('Đã hủy đơn hàng', 'info');
          NM.Notifications.push({ icon: '❌', title: 'Đơn hàng đã hủy', text: `Đơn ${id} đã được hủy theo yêu cầu của bạn.`, link: `orders.html?id=${id}` });
          rerender();
        }
      });
    }
    if (act === 'paid') {
      O.update(id, (o) => { o.status = 'to_ship'; o.history.push({ status: 'paid', time: Date.now() }); });
      toast('Đã xác nhận thanh toán');
      rerender();
    }
    if (act === 'ship') {
      O.update(id, (o) => { o.status = 'shipping'; o.history.push({ status: 'prepared', time: Date.now() }, { status: 'shipping', time: Date.now() + 1000 }); });
      NM.Notifications.push({ icon: '🎉', title: 'Đơn hàng đang được giao', text: `Đơn ${id} đã được giao cho NovaExpress.`, link: `orders.html?id=${id}` });
      toast('Đơn hàng đã chuyển sang Đang giao');
      rerender();
    }
    if (act === 'received') {
      const ok = await confirmDialog('Xác nhận bạn đã nhận được hàng và sản phẩm không có vấn đề?', { okLabel: 'Đã nhận hàng' });
      if (!ok) return;
      O.update(id, (o) => { o.status = 'completed'; o.history.push({ status: 'delivered', time: Date.now() }); });
      NM.Notifications.push({ icon: '📦', title: 'Giao hàng thành công', text: `Đơn ${id} đã hoàn thành. Đánh giá để nhận 200 xu.`, link: `orders.html?id=${id}` });
      toast('Đơn hàng đã hoàn thành');
      rerender();
    }
    if (act === 'rebuy') {
      const o = O.get(id);
      o.items.forEach((i) => { if (NM.productById[i.id]) NM.Cart.add(i.id, i.qty, i.variant, true); });
      location.href = 'cart.html';
    }
    if (act === 'review') {
      let rating = 5;
      openModal({
        title: 'Đánh giá sản phẩm',
        body: `<div class="rate-input" role="radiogroup" aria-label="Chọn số sao">${[1, 2, 3, 4, 5].map((s) => `<button type="button" class="rate-star is-on" data-star="${s}" role="radio" aria-checked="${s === 5}" aria-label="${s} sao">★</button>`).join('')}</div>
          <label class="field">Nhận xét của bạn<textarea class="input" id="rvText" rows="4" placeholder="Chia sẻ trải nghiệm về sản phẩm (tối thiểu 10 ký tự)"></textarea></label>
          <p class="field-hint danger" id="rvErr" hidden></p>`,
        actions: [{ label: 'Để sau', value: false }, { label: 'Gửi đánh giá', variant: 'btn--primary', value: true }],
        onAction: (ok, modal) => {
          if (!ok) return;
          const text = $('#rvText', modal).value.trim();
          if (text.length < 10) { const e = $('#rvErr', modal); e.textContent = 'Nhận xét cần tối thiểu 10 ký tự.'; e.hidden = false; return false; }
          O.update(id, (o) => { o.reviewed = { rating, text, time: Date.now() }; });
          const u = NM.getUser();
          NM.saveUser({ ...store.get('user', {}), xu: (u.xu || 0) + 200 });
          toast('Cảm ơn bạn đã đánh giá – +200 xu');
          rerender();
        }
      });
      const m = $('.modal');
      m.addEventListener('click', (e) => {
        const st = e.target.closest('[data-star]');
        if (!st) return;
        rating = Number(st.dataset.star);
        $$('.rate-star', m).forEach((b, i) => { b.classList.toggle('is-on', i < rating); b.setAttribute('aria-checked', String(i + 1 === rating)); });
      });
    }
  };
  NM.handleOrderAction = handleAction;

  NM.initOrdersPage = () => {
    const root = $('#ordersRoot');
    if (!root) return;
    let tab = NM.getParam('tab') || 'all';

    const render = () => {
      const id = NM.getParam('id');
      const all = NM.Orders.all();
      if (id) {
        const o = NM.Orders.get(id);
        root.innerHTML = o ? detailView(o) : `<div class="empty-state card"><div class="empty-state__art" aria-hidden="true">🔎</div><h2>Không tìm thấy đơn hàng</h2><p>Mã đơn ${escapeHTML(id)} không tồn tại.</p><a class="btn btn--primary" href="orders.html">Xem tất cả đơn</a></div>`;
        return;
      }
      const counts = NM.Orders.counts();
      const list = tab === 'all' ? all : all.filter((o) => o.status === tab);
      root.innerHTML = `
        <h1 class="page-title">Đơn mua</h1>
        <div class="order-tabs" role="tablist" aria-label="Trạng thái đơn hàng">
          ${TABS.map(([k, l]) => `<button type="button" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}${k !== 'all' && counts[k] ? ` <span class="count">${counts[k]}</span>` : ''}</button>`).join('')}
        </div>
        <div class="order-list">
          ${list.length ? list.map(orderCard).join('') : `<div class="empty-state card"><div class="empty-state__art" aria-hidden="true">📭</div><h2>Chưa có đơn hàng</h2><p>Các đơn hàng ở trạng thái này sẽ xuất hiện tại đây.</p><a class="btn btn--primary" href="products.html">Mua sắm ngay</a></div>`}
        </div>`;
    };

    root.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]');
      if (t) {
        tab = t.dataset.tab;
        history.replaceState(null, '', tab === 'all' ? 'orders.html' : `orders.html?tab=${tab}`);
        render();
      }
      const b = e.target.closest('[data-order]');
      if (b) handleAction(b.dataset.order, b.dataset.id, render);
    });
    render();
  };
})(window.NM);
