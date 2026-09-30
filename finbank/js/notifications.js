/* FinBank — Notifications */
(function () {
  const db = FB.db, $ = FB.$, $$ = FB.$$, f = FB.fmt, esc = FB.esc;
  db.fraud = db.fraud || { status: 'open', amount: 15900000, merchant: 'GLOBALMART PTE LTD — Singapore', time: '2026-09-29 23:41' };
  const ICON = { money: ['💸', 'var(--accent-50)'], alert: ['🚨', 'var(--danger-50)'], card: ['💳', 'var(--primary-50)'], bill: ['🧾', 'var(--warn-50)'], security: ['🛡️', 'var(--info-50)'], savings: ['🏦', 'var(--accent-50)'], promo: ['🎁', 'var(--surface-2)'] };
  const FILTERS = [['all', 'All'], ['unread', 'Unread'], ['money', 'Money'], ['alerts', 'Alerts'], ['bills', 'Bills'], ['security', 'Security'], ['promo', 'Promotions']];
  const GROUP = { money: ['money', 'savings'], alerts: ['alert', 'card'], bills: ['bill'], security: ['security'], promo: ['promo'] };
  let filter = 'all';
  db.notifications.sort((a, b) => FB.parseDate(b.time) - FB.parseDate(a.time));
  FB.prefs.notif = Object.assign({ push: true, sms: true, email: false, promo: false }, FB.prefs.notif);

  const match = (n) => filter === 'all' ? true : filter === 'unread' ? !n.read : (GROUP[filter] || []).includes(n.type);
  const changed = () => { FB.save(); FB.refreshBell(); render(); };

  function render() {
    const all = db.notifications, unread = all.filter((n) => !n.read).length, list = all.filter(match);
    $('#filters').innerHTML = FILTERS.map((x) => '<button class="chip ' + (x[0] === filter ? 'active' : '') + '" data-f="' + x[0] + '">' + x[1] + (x[0] === 'unread' && unread ? ' (' + unread + ')' : '') + '</button>').join('');
    $('#counts').textContent = all.length + ' total · ' + unread + ' unread';
    $('#headActions').innerHTML = '<button class="btn btn-outline btn-sm" id="markAll" ' + (unread ? '' : 'disabled') + '>✓ Mark all as read</button><button class="btn btn-outline btn-sm" id="clearRead" ' + (all.some((n) => n.read) ? '' : 'disabled') + '>🗑️ Clear read</button>';
    $('#nList').innerHTML = list.length ? list.map(item).join('') : FB.empty('🔔', filter === 'unread' ? "You're all caught up" : 'No notifications', filter === 'all' ? 'New alerts will show up here.' : 'Nothing in this category.');
    $$('[data-f]').forEach((b) => (b.onclick = () => { filter = b.dataset.f; render(); }));
    $('#markAll').onclick = () => { db.notifications.forEach((n) => (n.read = true)); changed(); FB.toast('All notifications marked as read.', 'success'); };
    $('#clearRead').onclick = () => FB.confirm({ title: 'Clear read notifications', message: 'Delete all notifications you have already read?', confirmLabel: 'Clear', danger: true, onConfirm: () => { db.notifications = db.notifications.filter((n) => !n.read); changed(); FB.toast('Read notifications cleared.', 'success'); } });
    $$('[data-n]').forEach((r) => (r.onclick = (e) => {
      const n = db.notifications.find((x) => x.id === r.dataset.n), t = e.target.closest('[data-act]');
      if (t) { e.stopPropagation(); act(n, t.dataset.act); return; }
      if (n && !n.read) { n.read = true; changed(); }
    }));
    $$('[data-n]').forEach((r) => r.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target === r) r.click(); }));
  }

  function item(n) {
    const ic = ICON[n.type] || ICON.promo, isFraud = n.id === 'n2';
    let extra = '';
    if (isFraud) extra = db.fraud.status === 'open'
      ? '<div class="flex gap-1 wrap mt-1"><button class="btn btn-success btn-sm" data-act="ok">✔ It was me</button><button class="btn btn-danger btn-sm" data-act="bad">✖ Not me — block card</button></div>'
      : '<div class="mt-1"><span class="badge ' + (db.fraud.status === 'ok' ? 'success' : 'warn') + '">' + (db.fraud.status === 'ok' ? 'Verified by you' : 'Card blocked') + '</span></div>';
    return '<div class="row-item clickable n-row ' + (n.read ? '' : 'unread') + '" data-n="' + n.id + '" tabindex="0" role="button" aria-label="' + esc(n.title) + (n.read ? '' : ' (unread)') + '" style="align-items:flex-start">' +
      '<div class="row-icon" style="background:' + ic[1] + '">' + ic[0] + '</div><div class="row-main"><div class="flex between gap-1"><b style="white-space:normal">' + (n.read ? '' : '<i class="udot"></i>') + esc(n.title) + '</b><small class="muted" style="white-space:nowrap" title="' + f.datetime(n.time) + '">' + f.ago(n.time) + '</small></div>' +
      '<span class="text-2" style="font-size:13.5px;display:block">' + esc(n.body) + '</span>' + extra + '</div>' +
      '<button class="btn btn-ghost btn-sm" data-act="del" aria-label="Delete notification" style="color:var(--text-3)">✕</button></div>';
  }

  function act(n, a) {
    if (a === 'del') return FB.confirm({ title: 'Delete notification', message: 'Delete “' + n.title + '”?', confirmLabel: 'Delete', danger: true, onConfirm: () => { db.notifications = db.notifications.filter((x) => x.id !== n.id); changed(); FB.toast('Notification deleted.', 'success'); } });
    const ok = a === 'ok';
    FB.confirm({ title: ok ? 'Confirm transaction' : 'Block your card?', icon: ok ? '✅' : '🚫', danger: !ok, confirmLabel: ok ? 'Yes, it was me' : 'Block card',
      message: ok ? 'You are confirming the ' + f.vnd(db.fraud.amount) + ' payment at ' + db.fraud.merchant + '.' : 'Your Platinum Visa will be frozen and the payment declined.',
      onConfirm: () => {
        db.fraud.status = ok ? 'ok' : 'blocked'; if (!ok) db.card.frozen = true; n.read = true;
        FB.notify('security', ok ? 'Transaction verified' : 'Card blocked', ok ? 'Thanks for confirming the ' + f.vnd(db.fraud.amount) + ' payment.' : 'Your card was frozen after you reported a suspicious payment. Call 1900 5555 for a replacement.');
        db.notifications.sort((a, b) => FB.parseDate(b.time) - FB.parseDate(a.time)); changed(); FB.toast(ok ? 'Thanks — payment marked as yours.' : 'Card blocked. We have opened a fraud case.', ok ? 'success' : 'warn');
      } });
  }

  function renderPrefs() {
    const P = FB.prefs.notif, rows = [['push', 'Push notifications', 'Instant alerts on your phone and browser.'], ['sms', 'SMS alerts', 'Transaction and security texts (11,000 VND/month).'], ['email', 'Email notifications', 'Statements and account updates.'], ['promo', 'Promotions & offers', 'Deals, rates and product news.']];
    $('#prefs').innerHTML = '<h3 class="mb-2">Notification preferences</h3>' + rows.map((r) => '<div class="setting-row"><div><b>' + r[1] + '</b><p>' + r[2] + '</p></div><label class="switch"><input type="checkbox" data-p="' + r[0] + '" ' + (P[r[0]] ? 'checked' : '') + ' aria-label="' + r[1] + '"><span></span></label></div>').join('') +
      '<div class="alert mt-2"><span>🔒</span><span>Security alerts are always sent and cannot be turned off.</span></div>';
    $$('[data-p]', $('#prefs')).forEach((c) => (c.onchange = () => { P[c.dataset.p] = c.checked; FB.savePrefs(); FB.toast(rows.find((r) => r[0] === c.dataset.p)[1] + (c.checked ? ' enabled.' : ' disabled.'), 'success', 'Preferences saved'); }));
  }

  const st = document.createElement('style');
  st.textContent = '.n-row.unread{background:var(--primary-50)}.n-row.unread:hover{background:var(--primary-100)}.udot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--primary);margin-right:8px}';
  document.head.appendChild(st);
  render(); renderPrefs();
})();
