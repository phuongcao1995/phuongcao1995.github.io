/* EnglishUp — listening practice with a TTS-powered audio player */
'use strict';

Pages.listening = () => {
  const s = App.state, C = DATA.listening;
  s.listenDone = s.listenDone || {};
  let clip = C.find(c => c.id === params().get('clip')) || C[0];
  let rate = 1, playing = false, pos = 0, tick = null, answers = {};
  const root = $('#listening-app');
  const L = ['A', 'B', 'C', 'D'];

  root.innerHTML = `
    <div class="listen-layout">
      <div class="listen-main">
        <section class="card player-card" aria-labelledby="clip-title">
          <div class="player-top"><div class="player-art" id="player-art" aria-hidden="true">🎧</div>
            <div class="grow"><span class="muted small" id="clip-meta"></span><h2 id="clip-title"></h2></div></div>
          <div class="player-bar"><span id="p-time">0:00</span><div class="seek" id="seek">${progressBar(0)}</div><span id="p-dur">0:00</span></div>
          <div class="player-controls">
            <button class="icon-btn lg" id="p-replay" aria-label="Replay from start" title="Replay">${icon('replay', 22)}</button>
            <button class="play-btn" id="p-play" aria-label="Play">${icon('play', 28)}</button>
            <div class="speed-group" role="group" aria-label="Playback speed">${[0.75, 1, 1.25].map(r => `<button class="chip ${r === rate ? 'active' : ''}" data-rate="${r}" aria-pressed="${r === rate}">${r}x</button>`).join('')}</div>
          </div>
          <div class="btn-row">
            <button class="btn btn-sm btn-secondary" id="t-toggle" aria-expanded="false">${icon('file', 16)} Transcript</button>
            <button class="btn btn-sm btn-secondary" id="vi-toggle" aria-expanded="false">${icon('translate', 16)} Vietnamese translation</button>
          </div>
          <div class="transcript" id="transcript" hidden></div>
          <div class="vi-box" id="translation" hidden></div>
        </section>
        <section class="card" id="listen-qs" aria-live="polite"></section>
      </div>
      <aside class="card listen-side"><div class="card-head"><h2>Exercises</h2><span class="muted small">${C.length} clips · ${C.reduce((a, c) => a + c.questions.length, 0)} questions</span></div><ul class="clip-list" id="clip-list"></ul></aside>
    </div>`;

  const words = () => clip.transcript.split(' ');
  const durFor = r => Math.round(words().length / (2.6 * r)); // estimated seconds
  const fmt = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  const setPlayIcon = () => { const b = $('#p-play'); b.innerHTML = icon(playing ? 'pause' : 'play', 28); b.setAttribute('aria-label', playing ? 'Pause' : 'Play'); $('#player-art').classList.toggle('spin', playing); };
  const updateBar = () => {
    const n = words().length, d = durFor(rate);
    $('#seek .progress span').style.width = (pos / n * 100) + '%';
    $('#p-time').textContent = fmt(pos / n * d); $('#p-dur').textContent = fmt(d);
    $$('#transcript .tw').forEach((w, i) => w.classList.toggle('now', playing && i === Math.min(pos, n - 1)));
  };

  const play = () => {
    const ws = words();
    if (pos >= ws.length) pos = 0;
    const startIdx = pos, text = ws.slice(startIdx).join(' ');
    playing = true; setPlayIcon();
    const offsets = []; let acc = 0; ws.slice(startIdx).forEach(w => { offsets.push(acc); acc += w.length + 1; });
    let boundary = false;
    const u = speak(text, { rate, onend: () => { if (!playing) return; playing = false; clearInterval(tick); pos = ws.length; setPlayIcon(); updateBar(); } });
    if (!u) { playing = false; setPlayIcon(); return; }
    u.onboundary = e => { if (e.name && e.name !== 'word') return; boundary = true; let i = offsets.findIndex(o => o > e.charIndex); i = i === -1 ? offsets.length - 1 : i - 1; pos = startIdx + Math.max(0, i); updateBar(); };
    const perWord = 1000 / (2.6 * rate);
    clearInterval(tick);
    tick = setInterval(() => { if (!boundary && pos < ws.length - 1) { pos++; updateBar(); } }, perWord);
  };
  const pause = () => { playing = false; clearInterval(tick); stopSpeaking(); setPlayIcon(); updateBar(); };

  $('#p-play').addEventListener('click', () => playing ? pause() : play());
  $('#p-replay').addEventListener('click', () => { pause(); pos = 0; updateBar(); play(); });
  $$('.speed-group .chip').forEach(b => b.addEventListener('click', () => {
    rate = +b.dataset.rate;
    $$('.speed-group .chip').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-pressed', x === b); });
    if (playing) { pause(); play(); } else updateBar();
  }));
  $('#seek').addEventListener('click', e => {
    const r = e.currentTarget.getBoundingClientRect(), n = words().length;
    const was = playing; pause(); pos = clamp(Math.floor((e.clientX - r.left) / r.width * n), 0, n - 1); updateBar(); if (was) play();
  });
  const toggler = (btnId, boxId, firstMsg) => $(btnId).addEventListener('click', e => {
    const box = $(boxId), open = box.hidden; box.hidden = !open; e.currentTarget.setAttribute('aria-expanded', open);
    e.currentTarget.classList.toggle('active', open);
  });
  toggler('#t-toggle', '#transcript'); toggler('#vi-toggle', '#translation');

  const renderQs = () => {
    const qs = clip.questions, done = Object.keys(answers).length === qs.length;
    const score = qs.filter((q, i) => answers[i] === q.answer).length;
    $('#listen-qs').innerHTML = `<div class="card-head"><h2>Questions</h2><span class="muted small">${Object.keys(answers).length}/${qs.length} answered</span></div>
      <p class="vi-hint small">Nghe đoạn audio rồi chọn đáp án đúng. Bạn có thể nghe lại bao nhiêu lần tùy thích.</p>
      ${qs.map((q, qi) => `<div class="listen-q"><p class="q-text"><span class="q-num">${qi + 1}</span> ${esc(q.q)}</p>
        <div class="options" role="group" aria-label="Question ${qi + 1} options">${q.options.map((o, i) => {
          const a = answers[qi], cls = a === undefined ? '' : i === q.answer ? 'correct' : i === a ? 'wrong' : '';
          return `<button class="option ${cls}" data-q="${qi}" data-i="${i}" ${a !== undefined ? 'disabled' : ''}><span class="opt-key">${L[i]}</span>${esc(o)}</button>`;
        }).join('')}</div>
        ${answers[qi] !== undefined ? `<div class="fb ${answers[qi] === q.answer ? 'fb-ok' : 'fb-bad'}">${answers[qi] === q.answer ? '✓ Correct!' : `✕ The correct answer is ${L[q.answer]}. Try listening again with the transcript.`}</div>` : ''}</div>`).join('')}
      ${done ? `<div class="result-strip"><strong>${score}/${qs.length} correct</strong><span class="vi-hint">${score === qs.length ? 'Tuyệt vời! Bạn nghe hiểu rất tốt.' : 'Mở transcript để xem lại đoạn bạn nghe nhầm.'}</span>
        <button class="btn btn-sm btn-secondary" id="l-retry">${icon('replay', 14)} Retry</button><button class="btn btn-sm btn-primary" id="l-next">Next clip</button></div>` : ''}`;
    $$('#listen-qs .option').forEach(b => b.addEventListener('click', () => {
      const qi = +b.dataset.q; answers[qi] = +b.dataset.i;
      if (answers[qi] === clip.questions[qi].answer) App.addXP(5, 'Correct answer');
      renderQs();
      if (Object.keys(answers).length === clip.questions.length) complete();
    }));
    if (done) {
      $('#l-retry').addEventListener('click', () => { answers = {}; renderQs(); });
      $('#l-next').addEventListener('click', () => select(C[(C.indexOf(clip) + 1) % C.length]));
    }
  };

  const complete = () => {
    const sc = clip.questions.filter((q, i) => answers[i] === q.answer).length;
    s.listenDone[clip.id] = Math.max(s.listenDone[clip.id] || 0, sc);
    if (sc === clip.questions.length) s.skills.Listening = Math.min(100, s.skills.Listening + 1);
    App.markToday('listening'); App.logMinutes(3); App.save(); App.addXP(15, 'Listening exercise');
    renderList();
  };

  const renderList = () => {
    $('#clip-list').innerHTML = C.map(c => {
      const d = s.listenDone[c.id];
      return `<li><button class="clip-item ${c.id === clip.id ? 'active' : ''}" data-id="${c.id}" ${c.id === clip.id ? 'aria-current="true"' : ''}><span class="grow"><strong>${esc(c.title)}</strong><span class="muted small">${esc(c.topic)} · ${c.level}</span></span>${d !== undefined ? `<span class="badge ${d === c.questions.length ? 'badge-success' : 'badge-warning'}">${d}/${c.questions.length}</span>` : ''}</button></li>`;
    }).join('');
    $$('.clip-item').forEach(b => b.addEventListener('click', () => select(C.find(c => c.id === b.dataset.id))));
  };

  const select = c => {
    pause(); clip = c; pos = 0; answers = {};
    history.replaceState(null, '', `?clip=${c.id}`);
    $('#clip-title').textContent = c.title;
    $('#clip-meta').textContent = `${c.topic} · ${c.level} ${DATA.levels[c.level]}`;
    $('#transcript').innerHTML = words().map(w => `<span class="tw">${esc(w)}</span>`).join(' ');
    $('#translation').innerHTML = `<span class="vi-flag" aria-hidden="true">🇻🇳</span><p>${esc(c.vi)}</p>`;
    updateBar(); renderQs(); renderList();
  };
  select(clip);
};
