/* FinBank — Transactions page */
(function () {
  const { $, $$, esc, fmt } = FB;
  const PAGE_SIZE = 10;
  const params = new URLSearchParams(location.search);
  const st = { q: params.get('q') || '', from: '', to: '', cat: '', type: '', acc: '', status: '', sort: 'date-desc', page: 1 };

  /* ---------- Controls ---------- */
  $('#fCat').innerHTML = '<option value="">All categories</option>' + FB.db.categories.map((c) => '<option value="' + c.id + '">' + c.icon + ' ' + esc(c.name) + '</option>').join('');
  $('#fAcc').innerHTML = '<option value="">All accounts</option>' + FB.db.accounts.map((a) => '<option value="' + a.id + '">' + esc(FB.accLabel(a)) + '</option>').join('');
  $('#q').value = st.q;

  /* ---------- Data ---------- */
  function filtered() {
    const q = st.q.trim().toLowerCase();
    const list = FB.db.transactions.filter((t) => {
      const d = t.date.slice(0, 10);
      if (st.from && d < st.from) return false;
      if (st.to && d > st.to) return false;
      if (st.cat && t.cat !== st.cat) return false;
      if (st.type && t.type !== st.type) return false;
      if (st.acc && t.acc !== st.acc) return false;
      if (st.status && t.status !== st.status) return false;
      if (q) {
        const a = FB.acc(t.acc);
        if (![t.desc, t.id, t.counterparty, t.channel, FB.cat(t.cat).name, a ? a.type : '', String(t.amount)].join(' ').toLowerCase().includes(q)) return false;
      }
      return true;
    });
    const s = st.sort;
    list.sort((x, y) => s === 'date-desc' ? y.date.localeCompare(x.date) : s === 'date-asc' ? x.date.localeCompare(y.date) : s === 'amt-desc' ? y.amount - x.amount : x.amount - y.amount);
    return list;
  }

  /* ---------- Rendering ---------- */
  function renderSummary(list) {
    let inn = 0, out = 0;
    list.forEach((t) => { if (t.status === 'Failed' || t.status === 'Cancelled') return; if (t.type === 'in') inn += t.amount; else out += t.amount; });
    const net = inn - out;
    $('#summary').innerHTML =
      '<div class="card stat"><span class="lbl">💰 Income</span><span class="val pos">+' + fmt.vnd(inn) + '</span><span class="delta muted">' + list.filter((t) => t.type === 'in').length + ' transactions</span></div>' +
      '<div class="card stat"><span class="lbl">💸 Expenses</span><span class="val neg">−' + fmt.vnd(out) + '</span><span class="delta muted">' + list.filter((t) => t.type === 'out').length + ' transactions</span></div>' +
      '<div class="card stat"><span class="lbl">⚖️ Net</span><span class="val ' + (net >= 0 ? 'pos' : 'neg') + '">' + (net >= 0 ? '+' : '−') + fmt.vnd(Math.abs(net)) + '</span><span class="delta muted">Excludes failed &amp; cancelled</span></div>';
  }

  function renderChips() {
    const chips = [];
    if (st.q.trim()) chips.push(['q', 'Search: “' + st.q.trim() + '”']);
    if (st.from) chips.push(['from', 'From ' + fmt.date(st.from)]);
    if (st.to) chips.push(['to', 'To ' + fmt.date(st.to)]);
    if (st.cat) chips.push(['cat', FB.cat(st.cat).name]);
    if (st.type) chips.push(['type', st.type === 'in' ? 'Money in' : 'Money out']);
    if (st.acc) chips.push(['acc', FB.accLabel(FB.acc(st.acc))]);
    if (st.status) chips.push(['status', st.status]);
    const box = $('#chips');
    if (!chips.length) { box.innerHTML = '<span class="muted" style="font-size:13px">No filters applied.</span>'; return; }
    box.innerHTML = chips.map((c) => '<button class="chip active" data-k="' + c[0] + '" aria-label="Remove filter ' + esc(c[1]) + '">' + esc(c[1]) + ' ✕</button>').join('') + '<button class="btn btn-ghost btn-sm" id="clearAll">Clear all</button>';
    $$('[data-k]', box).forEach((b) => (b.onclick = () => { setFilter(b.dataset.k, ''); }));
    $('#clearAll').onclick = clearAll;
  }

  const ctlId = { q: 'q', from: 'fFrom', to: 'fTo', cat: 'fCat', type: 'fType', acc: 'fAcc', status: 'fStatus' };
  function setFilter(k, v) { st[k] = v; $('#' + ctlId[k]).value = v; st.page = 1; render(); syncUrl(); }
  function clearAll() { Object.keys(ctlId).forEach((k) => { st[k] = ''; $('#' + ctlId[k]).value = ''; }); st.page = 1; render(); syncUrl(); }
  function syncUrl() { try { history.replaceState(null, '', st.q.trim() ? '?q=' + encodeURIComponent(st.q.trim()) : location.pathname); } catch (e) { /* ignore */ } }

  function pendingButtons(t) {
    return t.status === 'Pending'
      ? '<button class="btn btn-success btn-sm" data-act="complete" data-id="' + t.id + '">Simulate complete</button><button class="btn btn-outline btn-sm" data-act="fail" data-id="' + t.id + '">Simulate fail</button><button class="btn btn-outline btn-sm" data-act="cancel" data-id="' + t.id + '" style="color:var(--danger)">Cancel</button>'
      : '';
  }

  function render() {
    const list = filtered();
    renderSummary(list); renderChips();
    const host = $('#results'), pager = $('#pager');
    if (!list.length) {
      host.innerHTML = FB.empty('🔎', 'No transactions match your filters', 'Try a different keyword or widen the date range.') + '<div class="center"><button class="btn btn-outline" id="emptyClear">Clear all filters</button></div>';
      pager.innerHTML = ''; $('#emptyClear').onclick = clearAll; return;
    }
    const page = FB.pager({ el: pager, total: list.length, pageSize: PAGE_SIZE, page: st.page, onChange: (p) => { st.page = p; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
    st.page = page;
    const rows = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const arrow = (k) => (st.sort.indexOf(k) === 0 ? '<span class="arr">' + (st.sort.endsWith('asc') ? '▲' : '▼') + '</span>' : '');
    const table = '<div class="table-wrap tx-table"><table class="table"><thead><tr><th class="sortable" data-sort="date">Date ' + arrow('date') + '</th><th>Description</th><th>Account</th><th>Status</th><th class="sortable right" data-sort="amt">Amount ' + arrow('amt') + '</th><th></th></tr></thead><tbody>' +
      rows.map((t) => {
        const c = FB.cat(t.cat), a = FB.acc(t.acc);
        return '<tr class="clickable" data-tx="' + t.id + '"><td style="white-space:nowrap">' + fmt.datetime(t.date) + '</td>' +
          '<td><div class="flex items-center gap-1"><span class="row-icon" style="width:34px;height:34px;font-size:16px;background:' + c.color + '22">' + c.icon + '</span><div style="min-width:0"><b style="display:block;max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(t.desc) + '</b><small class="muted">' + esc(c.name) + ' · ' + esc(t.channel || '') + '</small></div></div></td>' +
          '<td>' + (a ? esc(a.type) : '—') + '</td><td>' + FB.statusBadge(t.status) + '</td>' +
          '<td class="right ' + (t.type === 'in' ? 'pos' : '') + '" style="white-space:nowrap"><b>' + (t.type === 'in' ? '+' : '−') + fmt.num(t.amount) + '</b> <small class="muted">VND</small></td>' +
          '<td><div class="tx-actions">' + pendingButtons(t) + '</div></td></tr>';
      }).join('') + '</tbody></table></div>';
    const mobile = '<div class="list tx-list">' + rows.map((t) => FB.txRow(t) + (t.status === 'Pending' ? '<div class="tx-pending-bar">' + pendingButtons(t) + '</div>' : '')).join('') + '</div>';
    host.innerHTML = table + mobile;
    $$('[data-sort]', host).forEach((th) => (th.onclick = () => {
      const k = th.dataset.sort; st.sort = st.sort === k + '-desc' ? k + '-asc' : k + '-desc'; $('#fSort').value = st.sort; st.page = 1; render();
    }));
    $$('[data-act]', host).forEach((b) => (b.onclick = (e) => { e.stopPropagation(); act(b.dataset.act, b.dataset.id, b); }));
  }

  /* ---------- Status simulation ---------- */
  function act(kind, id, btn) {
    const t = FB.db.transactions.find((x) => x.id === id);
    if (!t || t.status !== 'Pending') return;
    if (kind === 'cancel') {
      FB.confirm({ title: 'Cancel transaction', message: 'Cancel pending transaction ' + t.id + ' (' + fmt.vnd(t.amount) + ')? No funds will be moved.', confirmLabel: 'Cancel transaction', cancelLabel: 'Keep it', danger: true,
        onConfirm: () => { t.status = 'Cancelled'; FB.save(); FB.notify('alert', 'Transaction cancelled', t.desc); FB.toast('Transaction ' + t.id + ' was cancelled.', 'success'); render(); } });
      return;
    }
    FB.busy(btn, 700, () => {
      if (kind === 'fail') {
        t.status = 'Failed'; FB.save(); FB.notify('alert', 'Transaction failed', t.desc); FB.toast('Transaction ' + t.id + ' failed.', 'error'); render(); return;
      }
      const a = FB.acc(t.acc);
      if (t.type === 'out' && a && a.available < t.amount) {
        t.status = 'Failed'; FB.save(); FB.toast('Insufficient balance — the transaction failed.', 'error'); render(); return;
      }
      if (a) { const s = t.type === 'out' ? -1 : 1; a.balance += s * t.amount; a.available += s * t.amount; }
      t.status = 'Completed'; FB.save();
      FB.notify('money', 'Transaction completed', t.desc);
      FB.toast('Transaction ' + t.id + ' completed.', 'success'); render();
    });
  }

  /* ---------- Export ---------- */
  $('#exCsv').onclick = (e) => {
    const list = filtered();
    if (!list.length) { FB.toast('There are no transactions to export.', 'warn'); return; }
    FB.busy(e.currentTarget, 600, () => {
      const rows = [['Date', 'Reference', 'Description', 'Category', 'Account', 'Channel', 'Counterparty', 'Type', 'Status', 'Amount (VND)']].concat(list.map((t) => {
        const a = FB.acc(t.acc);
        return [fmt.datetime(t.date), t.id, t.desc, FB.cat(t.cat).name, a ? a.type : '', t.channel || '', t.counterparty || '', t.type === 'in' ? 'Credit' : 'Debit', t.status, (t.type === 'in' ? '' : '-') + t.amount];
      }));
      FB.download('finbank-transactions-' + fmt.iso().slice(0, 10) + '.csv', '﻿' + FB.csv(rows), 'text/csv;charset=utf-8');
    });
  };
  $('#exPdf').onclick = (e) => {
    const n = filtered().length;
    if (!n) { FB.toast('There are no transactions to export.', 'warn'); return; }
    FB.busy(e.currentTarget, 900, () => FB.toast('PDF report of ' + n + ' transactions generated (demo — no file created).', 'success', 'Export ready'));
  };

  /* ---------- Events ---------- */
  $('#q').oninput = FB.debounce((e) => { st.q = e.target.value; st.page = 1; render(); syncUrl(); }, 220);
  $('#fSort').onchange = (e) => { st.sort = e.target.value; st.page = 1; render(); };
  [['fFrom', 'from'], ['fTo', 'to'], ['fCat', 'cat'], ['fType', 'type'], ['fAcc', 'acc'], ['fStatus', 'status']].forEach(([id, k]) => {
    $('#' + id).onchange = (e) => {
      st[k] = e.target.value;
      if (st.from && st.to && st.from > st.to) { FB.toast('The start date is after the end date.', 'warn', 'Check date range'); }
      st.page = 1; render();
    };
  });

  FB.skeleton($('#results'), render, 600);
  $('#summary').innerHTML = '<div class="card"><div class="skeleton sk-line"></div></div>'.repeat(3);
  $('#chips').innerHTML = '';
})();
