/* EnglishUp — AI speaking practice (conversation scenarios) */
'use strict';


Pages.speaking = () => {
  const s = App.state, SC = DATA.scenarios;
  let cat = 'All', sc = SC.find(x => x.id === params().get('scenario')) || null;
  let turn = 0, log = [], showVi = false, corrections = 0, userWords = 0, busy = false, startedAt = 0;
  const root = $('#speaking-app');

  root.innerHTML = `
    <div class="speak-layout">
      <aside class="speak-side card" aria-label="Scenarios">
        <div class="card-head"><h2>Situations</h2><span class="muted small">${SC.length} scenarios</span></div>
        <div class="chip-row" id="scenario-cats" role="tablist" aria-label="Scenario categories"></div>
        <ul class="scenario-list" id="scenario-list"></ul>
      </aside>
      <section class="chat-panel card" id="chat-panel" aria-label="Conversation"></section>
    </div>`;

  const renderCats = () => {
    $('#scenario-cats').innerHTML = DATA.speakingCategories.map(c => `<button class="chip ${c === cat ? 'active' : ''}" role="tab" aria-selected="${c === cat}" data-c="${c}">${c}</button>`).join('');
    $$('#scenario-cats .chip').forEach(b => b.addEventListener('click', () => { cat = b.dataset.c; renderCats(); renderList(); }));
  };
  const renderList = () => {
    const list = SC.filter(x => cat === 'All' || x.category === cat);
    $('#scenario-list').innerHTML = list.map(x => `<li><button class="scenario-item ${sc && sc.id === x.id ? 'active' : ''}" data-id="${x.id}">
      <span class="scenario-emoji" aria-hidden="true">${x.emoji}</span><span class="grow"><strong>${esc(x.title)}</strong><span class="muted small">${esc(x.desc)}</span></span>
      <span class="badge badge-soft">${x.level}</span></button></li>`).join('');
    $$('.scenario-item').forEach(b => b.addEventListener('click', () => start(SC.find(x => x.id === b.dataset.id))));
  };

  const renderIntro = () => {
    $('#chat-panel').innerHTML = `<div class="speak-intro">
      <div class="ai-avatar ai-avatar-xl" aria-hidden="true">🤖</div>
      <h2>Practice real conversations</h2>
      <p class="muted">Pick a situation, speak or type your answers, and get instant feedback on your English.</p>
      <p class="vi-hint">Chọn một tình huống bên trái. Bạn có thể nói vào micro, gõ câu trả lời hoặc chọn câu gợi ý.</p>
      <button class="btn btn-primary btn-lg" id="quick-start">${icon('mic', 18)} Start: Ordering Coffee</button></div>`;
    $('#quick-start').addEventListener('click', () => start(SC[0]));
  };

  const start = x => {
    sc = x; turn = 0; log = []; corrections = 0; userWords = 0; busy = false; startedAt = Date.now();
    history.replaceState(null, '', `?scenario=${x.id}`);
    renderList();
    $('#chat-panel').innerHTML = `
      <div class="chat-head">
        <span class="ai-avatar" aria-hidden="true">${x.emoji}</span>
        <div class="grow"><strong>${esc(x.title)}</strong><span class="muted small">AI ${esc(x.role)} · ${x.level} ${DATA.levels[x.level]}</span></div>
        <label class="toggle-label"><span>Translation</span><button class="toggle" id="vi-toggle" role="switch" aria-checked="${showVi}" aria-label="Show Vietnamese translation"></button></label>
        <button class="icon-btn" id="restart" aria-label="Restart conversation" title="Restart">${icon('replay')}</button>
      </div>
      <div class="chat-progress">${progressBar(0)}<span class="muted small" id="turn-count"></span></div>
      <div class="chat-log" id="chat-log" aria-live="polite"></div>
      <div class="chat-helpers">
        <div><span class="helper-label">Suggested phrases</span><div class="chip-row" id="suggestions"></div></div>
        <div><span class="helper-label">Vocabulary hints</span><div class="chip-row" id="vocab-hints"></div></div>
      </div>
      <form class="chat-input" id="chat-form" autocomplete="off">
        <button type="button" class="mic-btn" id="mic-btn" aria-label="Speak your answer">${icon('mic', 22)}</button>
        <label class="sr-only" for="chat-input">Your answer</label>
        <input id="chat-input" class="input" placeholder="Type or tap the mic to speak…">
        <button class="btn btn-primary" id="chat-send" aria-label="Send">${icon('send', 18)}</button>
      </form>`;
    $('#vi-toggle').addEventListener('click', e => { showVi = !showVi; e.currentTarget.setAttribute('aria-checked', showVi); $('#chat-log').classList.toggle('show-vi', showVi); });
    $('#restart').addEventListener('click', () => start(sc));
    $('#chat-form').addEventListener('submit', e => { e.preventDefault(); const v = $('#chat-input').value.trim(); if (v) send(v); });
    $('#mic-btn').addEventListener('click', mic);
    aiTurn();
  };

  const addMsg = (who, html, vi = '') => {
    const el = document.createElement('div');
    el.className = `msg msg-${who}`;
    el.innerHTML = who === 'ai' ? `<span class="ai-avatar sm" aria-hidden="true">${sc.emoji}</span><div class="bubble">${html}${vi ? `<span class="msg-vi">${esc(vi)}</span>` : ''}</div>` : `<div class="bubble">${html}</div>`;
    $('#chat-log').appendChild(el); el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return el;
  };
  const typing = async () => { const t = addMsg('ai', '<span class="typing"><i></i><i></i><i></i></span>'); t.classList.add('is-typing'); await sleep(700); t.remove(); };

  const updateHelpers = () => {
    const t = sc.turns[turn];
    $('#turn-count').textContent = `Turn ${Math.min(turn + 1, sc.turns.length)} of ${sc.turns.length}`;
    $('.chat-progress .progress span').style.width = (turn / sc.turns.length * 100) + '%';
    $('#suggestions').innerHTML = t ? t.suggestions.map(x => `<button type="button" class="chip chip-suggest">${esc(x)}</button>`).join('') : '';
    $('#vocab-hints').innerHTML = t ? t.hints.map(([w, v]) => `<button type="button" class="chip chip-hint" data-w="${esc(w)}" title="${esc(v)}"><strong>${esc(w)}</strong> <span class="vi-inline">${esc(v)}</span></button>`).join('') : '';
    $$('.chip-suggest').forEach(b => b.addEventListener('click', () => send(b.textContent)));
    $$('.chip-hint').forEach(b => b.addEventListener('click', () => speak(b.dataset.w, { rate: 0.8 })));
  };

  const aiTurn = async () => {
    busy = true;
    const t = sc.turns[turn];
    await typing();
    addMsg('ai', `${esc(t.ai)} <button class="icon-btn sm say-btn" aria-label="Listen">${icon('volume', 16)}</button>`, t.vi);
    const last = $$('#chat-log .say-btn').pop(); last.addEventListener('click', () => speak(t.ai));
    speak(t.ai);
    updateHelpers(); busy = false;
    const inp = $('#chat-input'); if (inp) inp.focus({ preventScroll: true });
  };

  const send = async text => {
    if (busy || !sc) return;
    busy = true; $('#chat-input').value = '';
    userWords += text.split(/\s+/).length;
    addMsg('user', esc(text));
    log.push(text);
    const { fixed, issues } = checkGrammar(text);
    if (issues.length) {
      corrections += issues.length;
      await sleep(300);
      addMsg('ai', `<div class="fb-card"><strong>💡 Quick correction</strong><p><s>${esc(text)}</s></p><p class="text-success">✓ ${esc(fixed)}</p>${issues.map(i => `<p class="small">${esc(i.en)} <span class="vi-hint">${esc(i.vi)}</span></p>`).join('')}</div>`);
    } else if (text.split(/\s+/).length <= 2) {
      addMsg('ai', `<div class="fb-card soft">👍 Good! Try a full sentence next time, e.g. “${esc(sc.turns[turn].suggestions[0])}” <span class="vi-hint">Hãy thử trả lời bằng câu đầy đủ.</span></div>`);
    }
    turn++;
    if (turn < sc.turns.length) { await aiTurn(); }
    else { await finish(); }
  };

  const finish = async () => {
    await typing();
    addMsg('ai', 'Great conversation! Here is your feedback. 🎉', 'Cuộc hội thoại tuyệt vời! Đây là nhận xét của bạn.');
    const mins = Math.max(2, Math.round((Date.now() - startedAt) / 60000));
    const score = clamp(92 - corrections * 6 + Math.min(userWords, 40) / 8, 55, 98) | 0;
    s.stats.speaking++; s.stats.speakingScores.push(score); s.stats.speakingScores = s.stats.speakingScores.slice(-12);
    if (score >= 80) s.skills.Speaking = Math.min(100, s.skills.Speaking + 1);
    App.bumpChallenge('speak', mins); App.markToday('speaking'); App.logMinutes(mins); App.save();
    App.addXP(30, 'Conversation completed');
    const el = document.createElement('div'); el.className = 'summary-card';
    el.innerHTML = `<div class="summary-top">${ring(score, { size: 96, color: score >= 80 ? 'var(--success)' : 'var(--warning)', label: score, sub: 'score' })}
      <div><h3>${esc(sc.title)} — completed</h3><p class="muted small">${sc.turns.length} turns · ${userWords} words spoken · ${corrections} correction${corrections === 1 ? '' : 's'}</p>
      <p class="vi-hint small">${corrections ? 'Xem lại các lỗi được sửa ở trên và thử lại để đạt điểm cao hơn.' : 'Không có lỗi ngữ pháp. Rất tốt!'}</p></div></div>
      <div class="btn-row"><button class="btn btn-primary" id="again">${icon('replay', 16)} Practice again</button><button class="btn btn-secondary" id="next-sc">Next scenario</button><a class="btn btn-ghost" href="pronunciation.html">Work on pronunciation</a></div>`;
    $('#chat-log').appendChild(el); el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    $('#again').addEventListener('click', () => start(sc));
    $('#next-sc').addEventListener('click', () => start(SC[(SC.indexOf(sc) + 1) % SC.length]));
    $('#suggestions').innerHTML = ''; $('#vocab-hints').innerHTML = '<span class="muted small">Conversation finished.</span>';
    $('.chat-progress .progress span').style.width = '100%';
    busy = false;
  };

  /* Microphone: real speech recognition when available, otherwise simulated */
  const mic = () => {
    if (busy || !sc || turn >= sc.turns.length) return;
    const btn = $('#mic-btn'), input = $('#chat-input');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const simulate = () => {
      btn.classList.add('listening'); input.placeholder = 'Listening… (simulated)';
      const target = sc.turns[turn].suggestions[rand(0, sc.turns[turn].suggestions.length - 1)];
      let i = 0; const words = target.split(' ');
      const iv = setInterval(() => { input.value = words.slice(0, ++i).join(' '); if (i >= words.length) { clearInterval(iv); btn.classList.remove('listening'); input.placeholder = 'Type or tap the mic to speak…'; setTimeout(() => send(input.value), 400); } }, 260);
    };
    if (!SR || location.protocol === 'file:') { stopSpeaking(); simulate(); return; }
    try {
      const rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true;
      let got = false;
      btn.classList.add('listening'); input.placeholder = 'Listening… speak now';
      rec.onresult = e => { got = true; input.value = Array.from(e.results).map(r => r[0].transcript).join(' '); };
      rec.onerror = () => { btn.classList.remove('listening'); if (!got) { toast('Microphone unavailable — using a simulated answer.', 'info'); simulate(); } };
      rec.onend = () => { btn.classList.remove('listening'); input.placeholder = 'Type or tap the mic to speak…'; if (got && input.value.trim()) send(input.value.trim()); };
      stopSpeaking(); rec.start();
    } catch (e) { simulate(); }
  };

  renderCats(); renderList();
  if (sc) start(sc); else renderIntro();
};
