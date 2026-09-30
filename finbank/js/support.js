/* FinBank — Help & Support */
(function () {
  const db = FB.db, $ = FB.$, $$ = FB.$$, f = FB.fmt, esc = FB.esc;
  const st = document.createElement('style');
  st.textContent = 'details.faq{border:1px solid var(--border);border-radius:12px;background:var(--surface);margin-bottom:8px;overflow:hidden}details.faq summary{padding:14px 16px;font-weight:600;cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:12px}details.faq summary::-webkit-details-marker{display:none}details.faq summary::after{content:"+";font-size:20px;line-height:1;color:var(--text-3)}details.faq[open] summary::after{content:"−"}details.faq[open]{border-color:var(--primary)}details.faq .a{padding:0 16px 16px;color:var(--text-2)}' +
    'mark{background:var(--warn-50);color:inherit;border-radius:3px;padding:0 2px}.chat-wrap .chat{height:460px}.quick-r{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}.contact-ico{font-size:26px}.thread{display:flex;flex-direction:column;gap:8px;max-height:280px;overflow:auto;padding:10px;background:var(--surface-2);border-radius:12px;margin-bottom:12px}.thread .msg small{display:block;opacity:.7;font-size:11px;margin-top:2px}';
  document.head.appendChild(st);

  /* ---------- FAQ ---------- */
  const EXTRA = [
    ['Cards', 'How do I activate my new card?', 'Open Cards and select "Activate card", then enter the last 6 digits of the card and set your PIN. Activation is instant.'],
    ['Cards', 'How do I enable overseas payments?', 'Go to Cards → Card controls and turn on International payments. You can switch it off again at any time.'],
    ['Accounts', 'How do I download a bank statement?', 'Open Transactions, filter by date, then choose Export. Statements are available as CSV and PDF for the last 24 months.'],
    ['Accounts', 'How do I open an additional account?', 'Visit Accounts → Open new account, choose the account type and confirm with OTP. It is active immediately.'],
    ['Loans', 'Can I repay my loan early?', 'Yes. Early repayment is free after 12 months; before that a fee of 1% of the amount repaid applies.'],
    ['Loans', 'How long does loan approval take?', 'Personal loans are typically approved within 24 hours. Home and auto loans take 3–5 business days.'],
    ['Security', 'What should I do if I receive a suspicious SMS or call?', 'Never share your OTP, PIN or password. Hang up and call 1900 5555 from the number on the back of your card.']
  ];
  const catOf = (q) => /transfer|limit/i.test(q) ? 'Transfers' : /card/i.test(q) ? 'Cards' : /savings|deposit|interest/i.test(q) ? 'Savings' : /safe|password/i.test(q) ? 'Security' : 'General';
  const FAQS = db.faqs.map((x) => ({ c: catOf(x.q), q: x.q, a: x.a })).concat(EXTRA.map((x) => ({ c: x[0], q: x[1], a: x[2] })));
  const CATS = ['All'].concat(Array.from(new Set(FAQS.map((x) => x.c))));
  let faqCat = 'All', faqQ = '';
  const hl = (s) => { const t = esc(s); if (!faqQ) return t; return t.replace(new RegExp('(' + faqQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); };
  function faq() {
    const el = $('#pFaq');
    if (!$('#faqQ')) {
      el.innerHTML = '<div class="grid g-main"><div><div class="toolbar"><input class="input grow" id="faqQ" type="search" placeholder="Search questions, e.g. “limit”, “card”" aria-label="Search FAQ"></div><div class="chips mb-2" id="faqCats"></div><div id="faqList"></div></div>' +
        '<div class="grid" style="gap:18px;align-content:start"><div class="card"><h3>Still need help?</h3><p class="text-2 mt-1">Chat with our assistant or open a ticket and we will reply within 24 hours.</p><div class="flex gap-1 wrap mt-2"><button class="btn btn-sm" data-go="chat">💬 Live chat</button><button class="btn btn-outline btn-sm" data-go="tickets">🎫 New ticket</button></div></div>' +
        '<div class="card"><h3>📍 Find branches &amp; ATMs</h3><p class="text-2 mt-1">Locate the nearest FinBank branch or ATM with cash available.</p><a class="btn btn-outline btn-sm mt-2" href="locator.html">Open locator</a></div></div></div>';
      $('#faqQ').oninput = FB.debounce((e) => { faqQ = e.target.value.trim(); faq(); }, 150);
      $$('[data-go]', el).forEach((b) => (b.onclick = () => $('[data-tab="' + b.dataset.go + '"]').click()));
    }
    $('#faqCats').innerHTML = CATS.map((c) => '<button class="chip ' + (c === faqCat ? 'active' : '') + '" data-c="' + c + '">' + c + '</button>').join('');
    $$('[data-c]').forEach((b) => (b.onclick = () => { faqCat = b.dataset.c; faq(); }));
    const q = faqQ.toLowerCase(), list = FAQS.filter((x) => (faqCat === 'All' || x.c === faqCat) && (!q || (x.q + ' ' + x.a).toLowerCase().includes(q)));
    $('#faqList').innerHTML = list.length ? list.map((x) => '<details class="faq" ' + (q && list.length <= 3 ? 'open' : '') + '><summary>' + hl(x.q) + '</summary><div class="a">' + hl(x.a) + '</div></details>').join('') : FB.empty('🔎', 'No answers found', 'Try different keywords or chat with us.');
  }

  /* ---------- Chat ---------- */
  const money = FB.fmt.vnd;
  const BOT = [
    [/balance|how much|money left|số dư/i, () => 'Your total balance across ' + db.accounts.length + ' accounts is <b>' + money(FB.totalBalance()) + '</b>.<br>' + db.accounts.map((a) => esc(a.type) + ': ' + money(a.balance)).join('<br>')],
    [/lost|stolen|block card|freeze|card.*(lost|stolen)/i, () => '<b>Lost card?</b> Go to Cards → Card controls and turn on <i>Freeze card</i> right away, then call <b>1900 5555</b> to order a replacement. Your card is currently ' + (db.card.frozen ? '<b>frozen</b>.' : 'active.')],
    [/transfer|send money|napas/i, () => 'To transfer, open <a href="transfers.html">Transfers</a>, choose FinBank or another bank, enter the recipient and confirm with OTP. Interbank transfers via Napas 247 arrive in seconds.'],
    [/limit/i, () => 'Your current limits are <b>' + money(FB.prefs.limitTx) + '</b> per transaction and <b>' + money(FB.prefs.limitDay) + '</b> per day. Change them in <a href="security.html#limits">Security → Limits</a>.'],
    [/loan|mortgage|borrow|rate.*loan|lãi suất vay/i, () => 'Loan rates from: ' + db.loanProducts.filter((l) => l.rate).map((l) => l.name + ' ' + l.rate + '%').join(', ') + '. See <a href="loans.html">Loans</a> to calculate a payment.'],
    [/saving|deposit|interest|lãi/i, () => 'Deposit rates: ' + db.savingsProducts.filter((s) => [0, 3, 6, 12].includes(s.term)).map((s) => s.label + ' ' + s.rate + '%').join(', ') + ' per year. Open one in <a href="savings.html">Savings</a>.'],
    [/hotline|phone|call|contact|số điện thoại/i, () => 'Call our 24/7 hotline <b>1900 5555</b> or email support@finbank.example.'],
    [/password|forgot|login|otp/i, () => 'You can reset your password from the login page (“Forgot password”) or change it in <a href="security.html">Security</a>. Never share your OTP with anyone.'],
    [/branch|atm|near/i, () => 'Use the <a href="locator.html">Branches &amp; ATMs locator</a> to find the closest one.'],
    [/hello|\bhi\b|\bhey\b|xin chào|chào/i, () => 'Hello ' + esc(db.user.short) + '! How can I help you today?']
  ];
  const QUICK = ['Check my balance', 'How do I transfer money?', 'My card is lost', 'What are my limits?', 'Loan interest rates', 'Savings rates', 'Hotline'];
  let agent = false;
  function chat() {
    $('#pChat').innerHTML = '<div class="grid g-main chat-wrap"><div class="card"><div class="card-head"><div class="flex items-center gap-1"><span class="avatar">🤖</span><div><b id="chName">FinBot</b><br><small class="pos">● Online</small></div></div><button class="btn btn-outline btn-sm" id="human">🙋 Talk to a human agent</button></div>' +
      '<div class="chat"><div class="chat-log" id="log" aria-live="polite"></div></div><div class="quick-r" id="qr"></div><form class="flex gap-1" id="chatF"><input class="input grow" id="chatIn" placeholder="Type your question…" autocomplete="off" maxlength="200" aria-label="Message"><button class="btn" type="submit">Send</button></form></div>' +
      '<div class="card"><h3>Ask me about</h3><ul class="text-2 mt-1" style="padding-left:18px;font-size:13.5px;line-height:1.9"><li>Balances &amp; accounts</li><li>Transfers &amp; limits</li><li>Lost or stolen cards</li><li>Loan and savings rates</li><li>Hotline &amp; branches</li></ul><div class="alert mt-2"><span>🔒</span><span>FinBot never asks for your OTP, PIN or password.</span></div></div></div>';
    $('#qr').innerHTML = QUICK.map((q) => '<button class="chip" data-q="' + q + '">' + q + '</button>').join('');
    say('bot', 'Hi ' + esc(db.user.short) + '! I am FinBot, your virtual assistant. Pick a topic below or type your question.');
    $$('[data-q]').forEach((b) => (b.onclick = () => ask(b.dataset.q)));
    $('#chatF').onsubmit = (e) => { e.preventDefault(); const i = $('#chatIn'), v = i.value.trim(); if (!v) return; i.value = ''; ask(v); };
    $('#human').onclick = () => {
      if (agent) return FB.toast('You are already chatting with an agent.', 'info');
      FB.confirm({ title: 'Talk to a human agent', icon: '🙋', message: 'We will connect you with the next available agent. Average wait: under 2 minutes.', confirmLabel: 'Connect me', onConfirm: () => {
        say('me', 'I would like to talk to a human agent.'); typing(1200, () => say('bot', 'Connecting you… You are <b>#2</b> in the queue.'));
        setTimeout(() => { agent = true; $('#chName').textContent = 'Linh (Support Agent)'; say('bot', '👩‍💼 <b>Linh</b> from FinBank Support has joined the chat. How can I help you?'); FB.toast('Agent Linh joined the chat.', 'success'); }, 3200);
      } });
    };
  }
  function say(who, html) { const log = $('#log'), m = document.createElement('div'); m.className = 'msg ' + who; m.innerHTML = who === 'me' ? esc(html) : html; log.appendChild(m); log.scrollTop = log.scrollHeight; }
  function typing(ms, cb) {
    const log = $('#log'), t = document.createElement('div'); t.className = 'msg bot'; t.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; log.appendChild(t); log.scrollTop = log.scrollHeight;
    setTimeout(() => { t.remove(); cb(); }, ms);
  }
  function ask(text) {
    say('me', text);
    const hit = BOT.find((b) => b[0].test(text));
    typing(700 + Math.random() * 500, () => say('bot', agent ? 'Thanks for the details. Let me check that for you — ' + (hit ? hit[1]() : 'could you share a bit more information? For your safety, please do not send your OTP or PIN here.') : hit ? hit[1]() : "I'm not sure about that one. Try “balance”, “limits”, “loan rates”, or tap <b>Talk to a human agent</b>."));
  }

  /* ---------- Contact ---------- */
  function contact() {
    const card = (i, t, d, extra) => '<div class="card"><div class="contact-ico">' + i + '</div><h3 class="mt-1">' + t + '</h3><p class="text-2 mt-1">' + d + '</p>' + (extra || '') + '</div>';
    $('#pContact').innerHTML = '<div class="grid g3">' + card('📞', 'Hotline', '<b style="font-size:20px">1900 5555</b><br>24/7 for lost cards &amp; fraud', '<a class="btn btn-sm mt-2" href="tel:19005555">Call now</a>') +
      card('✉️', 'Email', 'support@finbank.example<br>Reply within 24 hours', '<a class="btn btn-outline btn-sm mt-2" href="mailto:support@finbank.example">Send email</a>') +
      card('🕘', 'Working hours', 'Branches: Mon–Fri 08:00–17:00<br>Saturday 08:00–12:00<br>Hotline &amp; chat: 24/7', '<a class="btn btn-outline btn-sm mt-2" href="locator.html">📍 Find branches &amp; ATMs</a>') + '</div>' +
      '<div class="card mt-2"><h3 class="mb-2">Follow FinBank</h3><div class="chips">' + ['Facebook', 'Zalo', 'YouTube', 'LinkedIn', 'TikTok'].map((s) => '<button class="chip" data-soc="' + s + '">' + s + '</button>').join('') + '</div><p class="muted mt-2" style="font-size:12.5px">Head office: 25 Nguyen Hue, Ben Nghe Ward, District 1, Ho Chi Minh City (demo address).</p></div>';
    $$('[data-soc]').forEach((b) => (b.onclick = () => FB.toast('Demo project — no real ' + b.dataset.soc + ' page.', 'info')));
  }

  /* ---------- Tickets ---------- */
  db.tickets = db.tickets || [{ id: 'TCK-260921-118', category: 'Cards', priority: 'Normal', subject: 'Contactless payment declined', created: '2026-09-21 10:12', status: 'In progress', attach: '',
    thread: [{ from: 'me', text: 'My contactless payment at a supermarket was declined twice yesterday.', time: '2026-09-21 10:12' }, { from: 'agent', text: 'Hello Minh Anh, thanks for reaching out. We are checking the terminal logs with the merchant and will update you shortly.', time: '2026-09-21 14:40' }] },
    { id: 'TCK-260803-042', category: 'Accounts', priority: 'Low', subject: 'Request statement for visa application', created: '2026-08-03 09:00', status: 'Resolved', attach: '', thread: [{ from: 'me', text: 'Please send a 6-month statement.', time: '2026-08-03 09:00' }, { from: 'agent', text: 'Your statement has been emailed. Marking this ticket as resolved.', time: '2026-08-03 11:20' }] }];
  const SB = { Open: 'info', 'In progress': 'warn', Resolved: 'success', Closed: '' };
  function tickets() {
    const el = $('#pTickets');
    el.innerHTML = '<div class="grid g-main"><div class="card"><div class="card-head"><h3>My tickets</h3><span class="badge">' + db.tickets.length + '</span></div><div id="tList" class="list"></div></div>' +
      '<div class="card"><h3 class="mb-2">Create a ticket</h3><form id="tF" novalidate><div class="row2"><div class="field"><label for="tCat">Category</label><select class="select" id="tCat">' + ['Accounts', 'Cards', 'Transfers', 'Loans', 'Savings', 'Security', 'Other'].map((c) => '<option>' + c + '</option>').join('') + '</select></div><div class="field"><label for="tPri">Priority</label><select class="select" id="tPri"><option>Low</option><option selected>Normal</option><option>High</option><option>Urgent</option></select></div></div>' +
      '<div class="field"><label for="tSub">Subject</label><input class="input" id="tSub" maxlength="80"></div><div class="field"><label for="tMsg">Message</label><textarea class="textarea input" id="tMsg" rows="4" maxlength="800" placeholder="Describe your issue…"></textarea></div>' +
      '<div class="field"><label for="tFile">Attachment (optional)</label><input class="input" type="file" id="tFile" accept="image/*,.pdf"><div class="hint" id="tFileName">Max 5 MB</div></div><button class="btn btn-block" id="tSend" type="submit">Submit ticket</button></form></div></div>';
    const list = $('#tList');
    list.innerHTML = db.tickets.length ? db.tickets.map((t) => '<div class="row-item clickable" data-t="' + t.id + '" tabindex="0"><div class="row-icon">🎫</div><div class="row-main"><b>' + esc(t.subject) + '</b><small>' + t.id + ' · ' + esc(t.category) + ' · ' + esc(t.priority) + ' · ' + f.date(t.created) + '</small></div><span class="badge ' + SB[t.status] + '">' + t.status + '</span></div>').join('') : FB.empty('🎫', 'No tickets yet', 'Create one and we will get back to you.');
    $$('[data-t]', el).forEach((r) => { r.onclick = () => thread(r.dataset.t); r.onkeydown = (e) => { if (e.key === 'Enter') thread(r.dataset.t); }; });
    $('#tFile').onchange = (e) => { const x = e.target.files[0], o = $('#tFileName'); if (x && x.size > 5 * 1048576) { o.textContent = 'File is larger than 5 MB.'; e.target.value = ''; } else o.textContent = x ? '📎 ' + x.name : 'Max 5 MB'; };
    $('#tF').onsubmit = (e) => {
      e.preventDefault();
      const ok = [FB.field($('#tSub'), { required: 'Enter a subject.', custom: (v) => (v.length < 5 ? 'Subject is too short.' : '') }), FB.field($('#tMsg'), { required: 'Describe your issue.', custom: (v) => (v.length < 15 ? 'Please add a few more details (15+ characters).' : '') })];
      if (ok.includes(false)) return;
      FB.busy($('#tSend'), 900, () => {
        const file = $('#tFile').files[0], now = FB.fmt.iso(), t = { id: FB.uid('TCK-'), category: $('#tCat').value, priority: $('#tPri').value, subject: $('#tSub').value.trim(), created: now, status: 'Open', attach: file ? file.name : '', thread: [{ from: 'me', text: $('#tMsg').value.trim(), time: now }] };
        db.tickets.unshift(t); FB.save(); FB.notify(t.category === "Security" ? "security" : "alert", 'Ticket ' + t.id + ' created', 'We received “' + t.subject + '” and will reply within 24 hours.'); tickets(); FB.toast('Ticket ' + t.id + ' submitted.', 'success');
      });
    };
  }
  function thread(id) {
    const t = db.tickets.find((x) => x.id === id), closed = t.status === 'Closed' || t.status === 'Resolved';
    const draw = () => '<div class="thread" id="th">' + t.thread.map((m) => '<div class="msg ' + (m.from === 'me' ? 'me' : 'bot') + '">' + esc(m.text) + '<small>' + (m.from === 'me' ? 'You' : 'FinBank Support') + ' · ' + f.datetime(m.time) + '</small></div>').join('') + '</div>';
    const m = FB.modal({ title: t.id + ' · ' + t.subject, size: 'lg', autofocus: false,
      body: '<div class="flex gap-1 wrap mb-2"><span class="badge ' + SB[t.status] + '" id="tSt">' + t.status + '</span><span class="badge">' + esc(t.category) + '</span><span class="badge">' + esc(t.priority) + ' priority</span>' + (t.attach ? '<span class="badge">📎 ' + esc(t.attach) + '</span>' : '') + '</div><div id="thWrap">' + draw() + '</div>' +
        (closed ? '<div class="alert success">This ticket is ' + t.status.toLowerCase() + '. Create a new ticket if you need more help.</div>' : '<div class="field"><label for="rp">Your reply</label><textarea class="textarea input" id="rp" rows="2" maxlength="500"></textarea></div>'),
      actions: closed ? [{ label: 'Close' }] : [{ label: 'Close' }, { label: 'Close ticket', onClick: () => { FB.confirm({ title: 'Close ticket', message: 'Mark ' + t.id + ' as closed?', confirmLabel: 'Close ticket', onConfirm: () => { t.status = 'Closed'; FB.save(); tickets(); FB.toast('Ticket closed.', 'success'); } }); } }, { label: 'Send reply', keepOpen: true, onClick: () => {
        const r = $('#rp', m.el); if (!FB.field(r, { required: 'Write a reply first.' })) return false;
        t.thread.push({ from: 'me', text: r.value.trim(), time: FB.fmt.iso() }); r.value = ''; if (t.status === 'Open') t.status = 'In progress'; FB.save(); $('#thWrap', m.el).innerHTML = draw(); const th = $('#th', m.el); th.scrollTop = th.scrollHeight; tickets();
        setTimeout(() => { t.thread.push({ from: 'agent', text: 'Thank you for the update. Our team is looking into this and we will get back to you within one business day.', time: FB.fmt.iso() }); FB.save(); if (document.body.contains(m.el)) { $('#thWrap', m.el).innerHTML = draw(); $('#th', m.el).scrollTop = 9999; } FB.toast('New reply on ' + t.id, 'info', 'Support'); }, 2200);
      } }] });
    const th = $('#th', m.el); th.scrollTop = th.scrollHeight;
  }

  faq(); chat(); contact(); tickets();
  FB.tabs(document);
})();
