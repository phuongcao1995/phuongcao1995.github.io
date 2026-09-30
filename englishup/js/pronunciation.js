/* EnglishUp — AI Pronunciation Coach (recording and analysis are simulated) */
'use strict';

Pages.pronunciation = () => {
  const s = App.state, P = DATA.pronunciation;
  let cur = P.find(x => x.id === params().get('s')) || P[0];
  let phase = 'idle', last = null, timer = null;
  const attempts = {}; // id -> number of tries this session
  const clean = w => w.toLowerCase().replace(/[^a-z']/g, '');
  const root = $('#pron-app');

  root.innerHTML = `
    <div class="pron-layout">
      <section class="card pron-stage" aria-labelledby="pron-title">
        <div class="card-head"><h2 id="pron-title">Repeat the sentence</h2><span class="badge badge-soft" id="pron-level"></span></div>
        <p class="muted small" id="pron-focus"></p>
        <blockquote class="pron-sentence" id="pron-sentence" aria-live="polite"></blockquote>
        <div class="btn-row center">
          <button class="btn btn-secondary" id="pron-listen">${icon('volume', 18)} Listen</button>
          <button class="btn btn-secondary" id="pron-slow">${icon('slow', 18)} Slow</button>
        </div>
        <div class="rec-zone" id="rec-zone"></div>
        <div id="pron-result" aria-live="polite"></div>
      </section>
      <aside class="pron-side">
        <section class="card"><div class="card-head"><h2>Your stats</h2></div><div class="kpi-grid" id="pron-stats"></div></section>
        <section class="card"><div class="card-head"><h2>Sentences</h2><span class="muted small">${P.length} exercises</span></div><ul class="pron-list" id="pron-list"></ul></section>
        <section class="card"><div class="card-head"><h2>Recent attempts</h2></div><ul class="history-list" id="pron-history"></ul></section>
      </aside>
    </div>`;

  const renderSentence = (res) => {
    $('#pron-level').textContent = `${cur.level} ${DATA.levels[cur.level]}`;
    $('#pron-focus').innerHTML = `Focus: <strong>${esc(cur.focus)}</strong> <span class="vi-hint">— Nghe mẫu trước, sau đó nhấn ghi âm và đọc to câu này.</span>`;
    const words = cur.text.split(' ');
    $('#pron-sentence').innerHTML = words.map((w, i) => {
      const st = res ? res.words[i].status : '';
      const mark = st === 'ok' ? '✓' : st === 'warn' ? '⚠' : st === 'bad' ? '✕' : '';
      return `<button class="word-chip ${st}" data-i="${i}" aria-label="${esc(w)}${st ? ', ' + ({ ok: 'good', warn: 'needs work', bad: 'incorrect' }[st]) : ''}. Tap to hear.">${esc(w)}${mark ? `<span class="wc-mark" aria-hidden="true">${mark}</span>` : ''}</button>`;
    }).join(' ');
    $$('#pron-sentence .word-chip').forEach(b => b.addEventListener('click', () => {
      const w = words[+b.dataset.i]; speak(w.replace(/[.,!?]/g, ''), { rate: 0.7 });
      const tip = cur.tips[clean(w)];
      if (tip) toast(`<strong>${esc(w)}</strong>: ${esc(tip)}`, 'info', 4500);
    }));
  };

  const renderRec = () => {
    const z = $('#rec-zone');
    if (phase === 'idle') {
      z.innerHTML = `<button class="rec-btn" id="rec-start" aria-label="Start recording">${icon('mic', 34)}</button><p class="rec-label">🎙 Start Recording</p><p class="muted small vi-hint">Nhấn để bắt đầu. Mô phỏng ghi âm trong phiên bản demo.</p>`;
      $('#rec-start').addEventListener('click', startRec);
    } else if (phase === 'recording') {
      z.innerHTML = `<button class="rec-btn recording" id="rec-stop" aria-label="Stop recording">${icon('pause', 30)}</button>
        <div class="waveform" aria-hidden="true">${Array.from({ length: 28 }, (_, i) => `<i style="animation-delay:${(i * 57) % 700}ms"></i>`).join('')}</div>
        <p class="rec-label"><span class="rec-dot"></span> Recording… <span id="rec-time">0.0s</span></p><p class="muted small">Tap to stop when you finish speaking.</p>`;
      $('#rec-stop').addEventListener('click', stopRec);
    } else if (phase === 'analyzing') {
      z.innerHTML = `<div class="spinner" aria-hidden="true"></div><p class="rec-label">Analyzing your pronunciation…</p><p class="muted small vi-hint">AI đang phân tích từng âm.</p>`;
    } else {
      z.innerHTML = '';
    }
  };

  let started = 0;
  const startRec = () => {
    stopSpeaking(); phase = 'recording'; started = Date.now(); renderRec(); $('#pron-result').innerHTML = '';
    renderSentence(null);
    timer = setInterval(() => {
      const t = (Date.now() - started) / 1000; const el = $('#rec-time'); if (el) el.textContent = t.toFixed(1) + 's';
      if (t > 8) stopRec();
    }, 100);
    $('#rec-stop').focus();
  };
  const stopRec = async () => {
    if (phase !== 'recording') return;
    clearInterval(timer);
    const dur = (Date.now() - started) / 1000;
    if (dur < 0.8) { phase = 'idle'; renderRec(); toast('Recording was too short. Hãy đọc cả câu rồi mới dừng.', 'warning'); return; }
    phase = 'analyzing'; renderRec();
    await sleep(1400);
    analyze();
  };

  const analyze = () => {
    const n = (attempts[cur.id] = (attempts[cur.id] || 0) + 1);
    let acc, flu, into, warnSet;
    const prev = s.pronHistory.filter(h => h.id === cur.id).slice(-1)[0];
    if (cur.id === 'p1' && n === 1) { acc = 92; flu = 81; into = 88; warnSet = ['to']; }
    else {
      const base = prev ? Math.min(prev.score + rand(1, 6), 97) : rand(72, 90);
      acc = clamp(base + rand(-3, 5), 60, 99); flu = clamp(base + rand(-8, 3), 55, 98); into = clamp(base + rand(-4, 4), 58, 98);
      warnSet = cur.hard.filter(() => Math.random() < (base > 90 ? 0.25 : 0.6));
    }
    const score = Math.floor(acc * 0.4 + flu * 0.3 + into * 0.3);
    const words = cur.text.split(' ').map(w => {
      const k = clean(w);
      let status = warnSet.includes(k) ? 'warn' : 'ok';
      if (status === 'warn' && score < 75 && Math.random() < 0.4) status = 'bad';
      return { w, k, status };
    });
    last = { acc, flu, into, score, words };
    // Save progress
    s.stats.pronunciation++; s.stats.pronBest = Math.max(s.stats.pronBest, score);
    s.pronHistory.push({ id: cur.id, text: cur.text, score, date: dateKey(), t: Date.now() });
    s.pronHistory = s.pronHistory.slice(-40);
    if (score >= 85) s.skills.Pronunciation = Math.min(100, s.skills.Pronunciation + 1);
    App.bumpChallenge('pron'); App.markToday('pronunciation'); App.logMinutes(1);
    App.save();
    App.addXP(score >= 90 ? 15 : 10, 'Pronunciation practice');
    phase = 'done'; renderRec(); renderSentence(last); renderResult(); renderSide();
  };

  const renderResult = () => {
    const r = last, col = r.score >= 85 ? 'var(--success)' : r.score >= 70 ? 'var(--warning)' : 'var(--error)';
    const issues = r.words.filter(w => w.status !== 'ok');
    const verdict = r.score >= 90 ? ['Excellent! 🎉', 'Phát âm rất tự nhiên.'] : r.score >= 80 ? ['Great job! 👏', 'Rất tốt, chỉ cần chỉnh một vài âm.'] : r.score >= 70 ? ['Good effort 💪', 'Khá tốt, hãy luyện thêm các từ được đánh dấu.'] : ['Keep practicing', 'Hãy nghe mẫu chậm và thử lại.'];
    $('#pron-result').innerHTML = `
      <div class="pron-scores">
        ${ring(r.score, { size: 132, stroke: 12, color: col, label: r.score, sub: 'Pronunciation' })}
        <div class="score-bars">
          <p class="verdict"><strong>${verdict[0]}</strong> <span class="vi-hint">${verdict[1]}</span></p>
          ${[['Accuracy', r.acc], ['Fluency', r.flu], ['Intonation', r.into]].map(([k, v]) => `<div class="skill-row"><span>${k}</span>${progressBar(v, v >= 85 ? 'ok' : v >= 70 ? 'mid' : 'low')}<strong>${v}%</strong></div>`).join('')}
        </div>
      </div>
      ${issues.length ? `<div class="tip-box"><strong>${icon('sparkles', 16)} Tips from your coach</strong><ul>${issues.map(w => `<li><button class="link-btn" data-say="${esc(w.k)}">“${esc(w.w.replace(/[.,!?]/g, ''))}”</button> ${esc(cur.tips[w.k] || 'Nghe lại từ này ở tốc độ chậm và nhấn rõ âm cuối.')}</li>`).join('')}</ul></div>`
        : `<div class="tip-box ok">✓ All words sounded clear. <span class="vi-hint">Tất cả các từ đều rõ ràng!</span></div>`}
      <div class="btn-row">
        <button class="btn btn-secondary" id="r-listen">${icon('volume', 18)} Listen</button>
        <button class="btn btn-primary" id="r-again">${icon('mic', 18)} Record again</button>
        <button class="btn btn-secondary" id="r-slow">${icon('slow', 18)} Slow pronunciation</button>
        <button class="btn btn-secondary" id="r-compare">${icon('compare', 18)} Compare</button>
        <button class="btn btn-ghost" id="r-next">Next sentence ${icon('chevR', 16)}</button>
      </div>`;
    $$('[data-say]').forEach(b => b.addEventListener('click', () => speak(b.dataset.say, { rate: 0.65 })));
    $('#r-listen').addEventListener('click', () => speak(cur.text));
    $('#r-slow').addEventListener('click', () => speak(cur.text, { rate: 0.6 }));
    $('#r-again').addEventListener('click', startRec);
    $('#r-next').addEventListener('click', () => select(P[(P.indexOf(cur) + 1) % P.length]));
    $('#r-compare').addEventListener('click', compare);
  };

  const compare = () => {
    const bars = (seed, warn) => cur.text.split(' ').map((w, i) => { const h = 30 + ((i * 37 + seed) % 55); const k = clean(w); return `<i class="${warn && last.words[i].status !== 'ok' ? 'warn' : ''}" style="height:${h}%" title="${esc(w)}"></i>`; }).join('');
    openModal({
      title: 'Compare with native speaker', size: 'modal-lg',
      body: `<p class="muted">Listen to the model, then compare the stress pattern with your attempt. <span class="vi-hint">Các cột màu cam là từ cần luyện thêm.</span></p>
        <div class="compare-row"><span class="compare-label">🇺🇸 Native</span><div class="mini-wave">${bars(11)}</div><button class="btn btn-sm btn-secondary" data-play="native">${icon('play', 14)} Play</button></div>
        <div class="compare-row"><span class="compare-label">🙋 You · ${last.score}</span><div class="mini-wave you">${bars(23, true)}</div><button class="btn btn-sm btn-secondary" data-play="you">${icon('play', 14)} Play</button></div>
        <p class="small muted">Your recording is simulated in this demo, so “You” replays a slower approximation.</p>`,
      actions: [{ label: 'Record again', cls: 'btn-primary', onClick: () => { startRec(); } }, { label: 'Close' }],
      onOpen(el) { $$('[data-play]', el).forEach(b => b.addEventListener('click', () => speak(cur.text, { rate: b.dataset.play === 'native' ? 1 : 0.8 }))); }
    });
  };

  const renderSide = () => {
    const mine = s.pronHistory, avg = mine.length ? Math.round(mine.reduce((a, b) => a + b.score, 0) / mine.length) : 0;
    const c = s.challenge;
    $('#pron-stats').innerHTML = `
      <div class="kpi"><strong>${s.stats.pronBest}</strong><span>Best score</span></div>
      <div class="kpi"><strong>${avg || '—'}</strong><span>Average</span></div>
      <div class="kpi"><strong>${s.stats.pronunciation}</strong><span>Exercises</span></div>
      <div class="kpi"><strong>${Math.min(c.pron, 5)}/5</strong><span>Today's challenge</span></div>`;
    $('#pron-list').innerHTML = P.map(p => {
      const best = Math.max(0, ...mine.filter(h => h.id === p.id).map(h => h.score));
      return `<li><button class="pron-item ${p.id === cur.id ? 'active' : ''}" data-id="${p.id}" ${p.id === cur.id ? 'aria-current="true"' : ''}><span class="pron-text">${esc(p.text)}</span><span class="pron-meta"><span class="badge badge-soft">${p.level}</span>${best ? `<span class="badge ${best >= 85 ? 'badge-success' : 'badge-warning'}">${best}</span>` : ''}</span></button></li>`;
    }).join('');
    $$('.pron-item').forEach(b => b.addEventListener('click', () => select(P.find(p => p.id === b.dataset.id))));
    const hist = mine.slice(-6).reverse();
    $('#pron-history').innerHTML = hist.length ? hist.map(h => `<li><span class="grow">${esc(h.text)}</span><strong class="${h.score >= 85 ? 'text-success' : 'text-warning'}">${h.score}</strong></li>`).join('')
      : `<li>${emptyState('🎙', 'No attempts yet', 'Record your first sentence to see your scores here.')}</li>`;
  };

  const select = p => {
    clearInterval(timer); stopSpeaking(); cur = p; phase = 'idle'; last = null;
    history.replaceState(null, '', `?s=${p.id}`);
    renderSentence(null); renderRec(); $('#pron-result').innerHTML = ''; renderSide();
    root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  $('#pron-listen').addEventListener('click', () => speak(cur.text));
  $('#pron-slow').addEventListener('click', () => speak(cur.text, { rate: 0.6 }));
  renderSentence(null); renderRec(); renderSide();
};
