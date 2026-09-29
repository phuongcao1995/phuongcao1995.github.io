/* ==========================================================
   NovaMart – notifications.js
   Notification store + header dropdown.
   ========================================================== */
(function (NM) {
  'use strict';

  const { $, store, escapeHTML } = NM;

  const timeAgo = (ts) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'Vừa xong';
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    return `${Math.floor(h / 24)} ngày trước`;
  };

  const Notifications = {
    all() { return store.get('notifications', null) || (store.set('notifications', NM.DEFAULT_NOTIFICATIONS), NM.DEFAULT_NOTIFICATIONS); },
    unread() { return Notifications.all().filter((n) => !n.read).length; },
    push(n) {
      const list = Notifications.all();
      list.unshift({ id: 'n' + Date.now(), time: Date.now(), read: false, ...n });
      store.set('notifications', list.slice(0, 30));
      Notifications.render();
    },
    markAll() {
      store.set('notifications', Notifications.all().map((n) => ({ ...n, read: true })));
      Notifications.render();
    },
    markRead(id) {
      store.set('notifications', Notifications.all().map((n) => (n.id === id ? { ...n, read: true } : n)));
      Notifications.render();
    },

    render() {
      const badge = $('.notif-toggle .badge');
      const count = Notifications.unread();
      if (badge) { badge.textContent = count > 9 ? '9+' : count; badge.hidden = count === 0; }
      const panel = $('#notifPanel');
      if (!panel) return;
      const list = Notifications.all();
      panel.innerHTML = `
        <div class="dropdown__head">
          <strong>Thông báo</strong>
          <button class="link-btn" type="button" data-notif="read-all" ${count ? '' : 'disabled'}>Đánh dấu đã đọc</button>
        </div>
        ${list.length ? `<ul class="notif-list">${list.map((n) => `
          <li><a class="notif ${n.read ? '' : 'is-unread'}" href="${n.link || '#'}" data-notif-id="${n.id}">
            <span class="notif__icon" aria-hidden="true">${n.icon}</span>
            <span class="notif__body"><strong>${escapeHTML(n.title)}</strong><span>${escapeHTML(n.text)}</span><small>${timeAgo(n.time)}</small></span>
          </a></li>`).join('')}</ul>` : '<p class="dropdown__empty">Chưa có thông báo nào.</p>'}`;
    },

    init() {
      const toggle = $('.notif-toggle');
      const panel = $('#notifPanel');
      if (!toggle || !panel) return;
      Notifications.render();
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = panel.hidden;
        NM.closeDropdowns();
        panel.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
      });
      panel.addEventListener('click', (e) => {
        e.stopPropagation();
        if (e.target.closest('[data-notif="read-all"]')) Notifications.markAll();
        const link = e.target.closest('[data-notif-id]');
        if (link) Notifications.markRead(link.dataset.notifId);
      });
    }
  };

  NM.Notifications = Notifications;
})(window.NM);
