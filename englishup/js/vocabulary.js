/* EnglishUp — vocabulary builder with spaced repetition */
'use strict';

const SRS_DAYS = [0, 1, 3, 7, 14, 30]; // Leitner box intervals

Pages.vocabulary = () => {
  const s = App.state;
  let mode = 'flashcards', topic = 'all', favOnly = false, queue = [], qi = 0, flipped = false;
  const V = DATA.vocab;
  const srs = id => s.srs[id] || { box: 0, due: null };
  const isDue = id => { const r = s.srs[id]; return !r || r.box === 0 || r.due <= dateKey(); };
  const pool = () => V.filter(w => (topic === 'all' || w.topic === topic) && (!favOnly || s.favorites.includes(w.id)));

  $('#topic-filter').innerHTML = Object.entries(DATA.vocabTopics).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  $('#mode-tabs').innerHTML = [['flashcards', 'Flashcards'], ['choice', 'Multiple Choice'], ['blank', 'Fill in the Blank'], ['matching', 'Matching'], ['listening', 'Listening']]
    .map(([k, v]) => `<button class="tab ${k === mode ? 'active' : ''}" role="tab" aria-selected="${k === mode}" data-mode="${k}">${v}</button>`).join('');

  const renderStats = () => {
    const learned = V.filter(w => srs(w.id).box > 0).length, due = V.filter(w => s.srs[w.id] && s.srs[w.id].box > 0 && s.srs[w.id].due <= dateKey()).length;
    $('#vocab-stats').innerHTML = `
      <div class="kpi"><strong>${fmtNum(App.wordsLearned())}</strong><span>Words learned</span></div>
      <div class="kpi"><strong>${learned}/${V.length}</strong><span>In this deck</span></div>
      <div class="kpi"><strong>${due}</strong><span>Due for review</span></div>
      <div class="kpi"><strong>${s.favorites.length}</strong><span>Favorites ⭐</span></div>`;
  };

  const renderList = () => {
    const q = ($('#word-search').value || '').trim().toLowerCase();
    const list = pool().filter(w => !q || w.word.includes(q) || w.vi.toLowerCase().includes(q));
    $('#word-list').innerHTML = list.length ? list.map(w => {
      const r = srs(w.id);
      return `<li><button class="word-row" data-id="${w.id}"><span><strong>${w.word}</strong> <span class="muted small">${w.pos}</span></span><span class="muted small">${esc(w.vi)}</span>
        <span class="box-dots" aria-label="Memory level ${r.box} of 5">${[1, 2, 3, 4, 5].map(b => `<i class="${r.box >= b ? 'on' : ''}"></i>`).join('')}</span>${s.favorites.includes(w.id) ? '<span aria-label="favorite">⭐</span>' : ''}</button></li>`;
    }).join('') : `<li>${emptyState(favOnly ? '⭐' : '🔍', favOnly ? 'No favorites yet' : 'No words found', favOnly ? 'Tap ⭐ on a flashcard to save words here.' : 'Try another word or topic.')}</li>`;
    $$('.word-row').forEach(b => b.addEventListener('click', () => { const w = V.find(x => x.id === b.dataset.id); mode = 'flashcards'; syncTabs(); queue = [w, ...queue.filter(x => x.id !== w.id)]; qi = 0; flipped = false; renderMode(); $('#vocab-stage').scrollIntoView({ behavior: 'smooth' }); }));
  };

  const buildQueue = () => {
    const p = pool();
    const due = p.filter(w => isDue(w.id)).sort((a, b) => srs(a.id).box - srs(b.id).box);
    queue = due.length ? due : p.slice(); qi = 0; flipped = false;
  };

  const stage = () => $('#vocab-stage');

  /* ---- Flashcards ---- */
  const renderFlash = () => {
    if (!queue.length) { stage().innerHTML = emptyState('🎉', 'All caught up!', 'No words are due right now. Đã ôn xong! Come back tomorrow or pick another topic.', '<button class="btn btn-secondary" id="study-all">Study all words anyway</button>'); $('#study-all').addEventListener('click', () => { queue = shuffle(pool()); qi = 0; renderFlash(); }); return; }
    if (qi >= queue.length) { stage().innerHTML = emptyState('✅', 'Session complete', `You reviewed ${queue.length} words. Great work!`, '<button class="btn btn-primary" id="again">Review again</button>'); $('#again').addEventListener('click', () => { buildQueue(); renderFlash(); }); return; }
    const w = queue[qi], fav = s.favorites.includes(w.id), r = srs(w.id);
    stage().innerHTML = `
      <div class="flash-meta"><span class="muted small">Card ${qi + 1} of ${queue.length}</span>${progressBar((qi) / queue.length * 100, 'thin')}</div>
      <div class="flashcard ${flipped ? 'flipped' : ''}" id="flashcard" tabindex="0" role="button" aria-label="Flashcard: ${w.word}. Press Space to flip.">
        <div class="flash-face flash-front">
          <span class="badge badge-soft">${DATA.vocabTopics[w.topic]} — ${w.level}</span>
          <h2 class="flash-word">${w.word}</h2><p class="ipa">${w.ipa}</p><p class="muted">${w.pos}</p>
          <p class="flip-hint muted small">Tap to see meaning — Chạm để xem nghĩa</p>
        </div>
        <div class="flash-face flash-back">
          <p class="muted small">Meaning</p><h2 class="flash-meaning">${esc(w.vi)}</h2>
          <p class="flash-example">“${esc(w.example)}”</p><p class="muted small">${esc(w.exVi)}</p>
          <p class="muted small">Next review: ${r.box ? `in ${SRS_DAYS[Math.min(r.box + 1, 5)]} days if you know it` : 'tomorrow if you know it'}</p>
        </div>
      </div>
      <div class="flash-actions">
        <button class="btn btn-secondary" id="fc-listen">${icon('volume', 18)} Listen</button>
        <button class="btn btn-secondary ${fav ? 'is-fav' : ''}" id="fc-fav" aria-pressed="${fav}">${fav ? '★' : '☆'} Favorite</button>
        <button class="btn btn-warning-soft" id="fc-review">${icon('replay', 18)} Review</button>
        <button class="btn btn-success" id="fc-know">${icon('check', 18)} I know</button>
      </div>
      <p class="muted small center">Keyboard: Space flip, ← review, → I know, L listen</p>`;
    const card = $('#flashcard');
    const flip = () => { flipped = !flipped; card.classList.toggle('flipped', flipped); };
    card.addEventListener('click', flip);
    card.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
    $('#fc-listen').addEventListener('click', () => speak(`${w.word}. ${w.example}`));
    $('#fc-fav').addEventListener('click', () => {
      const i = s.favorites.indexOf(w.id); if (i >= 0) s.favorites.splice(i, 1); else s.favorites.push(w.id);
      App.save(); toast(i >= 0 ? 'Removed from favorites' : '⭐ Added to favorites', 'success', 1600); renderFlash(); renderList(); renderStats();
    });
    $('#fc-know').addEventListener('click', () => grade(w, true));
    $('#fc-review').addEventListener('click', () => grade(w, false));
  };
  const grade = (w, known) => {
    const r = { ...srs(w.id) }, wasNew = r.box === 0;
    if (known) { r.box = Math.min(r.box + 1, 5); r.due = dateKey(addDays(new Date(), SRS_DAYS[r.box])); }
    else { r.box = 0; r.due = dateKey(); queue.push(w); }
    s.srs[w.id] = r;
    if (known && wasNew) { App.bumpChallenge('words'); App.addXP(5, `Learned “${w.word}”`); App.markToday('vocabulary'); }
    else App.save();
    if (qi % 5 === 4) App.logMinutes(2);
    qi++; flipped = false; renderFlash(); renderList(); renderStats();
  };

  /* ---- Multiple choice / Listening / Fill blank share a quiz runner ---- */
  let quiz = null;
  const startQuiz = type => {
    const p = pool().length >= 4 ? pool() : V;
    quiz = { type, items: sample(p, Math.min(8, p.length)), i: 0, score: 0 };
    renderQuiz();
  };
  const renderQuiz = () => {
    const { type, items, i } = quiz;
    if (i >= items.length) {
      const pct = Math.round(quiz.score / items.length * 100);
      stage().innerHTML = `<div class="center-block quiz-done">${ring(pct, { size: 130, label: `${quiz.score}/${items.length}`, sub: 'correct', color: pct >= 70 ? 'var(--success)' : 'var(--warning)' })}
        <h2>${pct >= 80 ? 'Excellent! Xuất sắc!' : pct >= 50 ? 'Good job! Làm tốt lắm!' : 'Keep practising! Cố lên!'}</h2><p class="muted">You earned ${quiz.score * 3} XP.</p>
        <button class="btn btn-primary" id="quiz-again">Try another round</button></div>`;
      $('#quiz-again').addEventListener('click', () => startQuiz(type));
      App.logMinutes(3); App.markToday('vocabulary');
      if (quiz.score) App.addXP(quiz.score * 3, 'Vocabulary quiz');
      return;
    }
    const w = items[i];
    const head = `<div class="flash-meta"><span class="muted small">Question ${i + 1} of ${items.length}</span>${progressBar(i / items.length * 100, 'thin')}</div>`;
    if (type === 'choice') {
      const opts = shuffle([w, ...sample(V.filter(x => x.id !== w.id), 3)]);
      stage().innerHTML = `${head}<div class="quiz-card"><p class="muted">What does this word mean?</p><h2 class="flash-word">${w.word}</h2><p class="ipa">${w.ipa}</p>
        <div class="options">${opts.map((o, k) => `<button class="option" data-id="${o.id}"><span class="opt-key">${'ABCD'[k]}</span>${esc(o.vi)}</button>`).join('')}</div><div class="feedback" aria-live="polite"></div></div>`;
      $$('.option', stage()).forEach(b => b.addEventListener('click', () => answer(b, b.dataset.id === w.id, w, $$('.option', stage()).find(x => x.dataset.id === w.id))));
    } else if (type === 'blank' || type === 'listening') {
      const re = new RegExp(`\\b${w.word}\\w*`, 'i'), m = w.example.match(re), target = m ? m[0] : w.word;
      const prompt = type === 'blank'
        ? `<p class="muted">Fill in the blank — Điền từ còn thiếu</p><p class="blank-sentence">${esc(w.example.replace(re, '_____'))}</p><p class="muted small">Hint: ${esc(w.vi)} (starts with “${w.word[0]}”)</p>`
        : `<p class="muted">Listen and type the word — Nghe và gõ lại từ</p><div class="btn-row center"><button class="btn btn-primary btn-lg" id="ls-play">${icon('volume', 20)} Play word</button><button class="btn btn-secondary" id="ls-slow">${icon('slow', 18)} Slow</button></div><p class="muted small">Hint: ${esc(w.vi)}</p>`;
      stage().innerHTML = `${head}<div class="quiz-card">${prompt}
        <form class="blank-form" id="blank-form"><label for="blank-input" class="sr-only">Your answer</label><input id="blank-input" class="input input-lg" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type your answer"><button class="btn btn-primary" type="submit">Check</button></form>
        <div class="feedback" aria-live="polite"></div><button class="link-btn" id="skip-q">Skip</button></div>`;
      if (type === 'listening') { const play = r => speak(w.word, { rate: r }); $('#ls-play').addEventListener('click', () => play()); $('#ls-slow').addEventListener('click', () => play(0.6)); setTimeout(() => play(), 300); }
      $('#blank-input').focus();
      $('#blank-form').addEventListener('submit', e => {
        e.preventDefault();
        const v = $('#blank-input').value.trim().toLowerCase(); if (!v) return;
        const ok = v === w.word.toLowerCase() || v === target.toLowerCase();
        $('#blank-input').disabled = true; $('button[type=submit]', e.target).disabled = true;
        $('#blank-input').classList.add(ok ? 'is-ok' : 'is-bad');
        feedback(ok, w);
      });
      $('#skip-q').addEventListener('click', () => { quiz.i++; renderQuiz(); });
    }
  };
  const answer = (btn, ok, w, correctBtn) => {
    const box = btn.closest('.quiz-card'); if (box.classList.contains('answered')) return; box.classList.add('answered');
    btn.classList.add(ok ? 'correct' : 'wrong'); if (correctBtn) correctBtn.classList.add('correct');
    feedback(ok, w);
  };
  const feedback = (ok, w) => {
    if (ok) quiz.score++;
    $('.feedback', stage()).innerHTML = `<div class="fb ${ok ? 'fb-ok' : 'fb-bad'}"><strong>${ok ? 'Correct!' : `Answer: ${w.word}`}</strong> <span>${w.word} ${w.ipa} — ${esc(w.vi)}</span></div><button class="btn btn-primary" id="next-q">Next</button>`;
    $('#next-q').focus();
    $('#next-q').addEventListener('click', () => { quiz.i++; renderQuiz(); });
    if (ok) speak(w.word);
  };

  /* ---- Matching ---- */
  const renderMatching = () => {
    const p = pool().length >= 5 ? pool() : V;
    const items = sample(p, 5); let sel = null, matched = 0, mistakes = 0; const t0 = Date.now();
    stage().innerHTML = `<p class="muted center">Match each word with its Vietnamese meaning — Nối từ với nghĩa</p>
      <div class="match-grid"><div class="match-col">${shuffle(items).map(w => `<button class="match-item" data-side="en" data-id="${w.id}">${w.word}</button>`).join('')}</div>
      <div class="match-col">${shuffle(items).map(w => `<button class="match-item" data-side="vi" data-id="${w.id}">${esc(w.vi)}</button>`).join('')}</div></div>
      <div class="feedback" aria-live="polite"></div>`;
    $$('.match-item', stage()).forEach(b => b.addEventListener('click', () => {
      if (b.classList.contains('matched')) return;
      if (!sel || sel.dataset.side === b.dataset.side) { $$('.match-item.selected', stage()).forEach(x => x.classList.remove('selected')); sel = b; b.classList.add('selected'); return; }
      if (sel.dataset.id === b.dataset.id) {
        [sel, b].forEach(x => { x.classList.remove('selected'); x.classList.add('matched'); x.disabled = true; });
        matched++; speak(items.find(w => w.id === b.dataset.id).word);
        if (matched === items.length) {
          const sec = Math.round((Date.now() - t0) / 1000);
          $('.feedback', stage()).innerHTML = `<div class="fb fb-ok"><strong>All matched in ${sec}s!</strong> ${mistakes} mistake${mistakes === 1 ? '' : 's'}.</div><button class="btn btn-primary" id="match-again">Play again</button>`;
          $('#match-again').addEventListener('click', renderMatching);
          App.logMinutes(2); App.markToday('vocabulary'); App.addXP(Math.max(5, 15 - mistakes * 2), 'Matching game');
        }
      } else {
        mistakes++; [sel, b].forEach(x => { x.classList.add('shake'); setTimeout(() => x.classList.remove('shake', 'selected'), 450); });
      }
      sel = null;
    }));
  };

  const renderMode = () => {
    if (mode === 'flashcards') renderFlash();
    else if (mode === 'matching') renderMatching();
    else startQuiz(mode);
  };
  const syncTabs = () => $$('#mode-tabs .tab').forEach(t => { const on = t.dataset.mode === mode; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); });

  $$('#mode-tabs .tab').forEach(t => t.addEventListener('click', () => { mode = t.dataset.mode; syncTabs(); if (mode === 'flashcards') buildQueue(); renderMode(); }));
  $('#topic-filter').addEventListener('change', e => { topic = e.target.value; buildQueue(); renderMode(); renderList(); });
  $('#fav-toggle').addEventListener('click', e => { favOnly = !favOnly; e.currentTarget.setAttribute('aria-pressed', favOnly); if (favOnly && !s.favorites.length) toast('No favorites yet. Nhấn ☆ trên thẻ để lưu từ.', 'info'); buildQueue(); renderMode(); renderList(); });
  $('#word-search').addEventListener('input', debounce(renderList, 150));
  document.addEventListener('keydown', e => {
    if (mode !== 'flashcards' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || !queue[qi]) return;
    if (e.key === 'ArrowRight') grade(queue[qi], true);
    else if (e.key === 'ArrowLeft') grade(queue[qi], false);
    else if (e.key.toLowerCase() === 'l') speak(queue[qi].word);
    else if (e.key === ' ' && document.activeElement.id !== 'flashcard') { e.preventDefault(); const c = $('#flashcard'); if (c) c.click(); }
  });

  buildQueue();
  const wid = params().get('word');
  if (wid) { const w = V.find(x => x.id === wid); if (w) queue = [w, ...queue.filter(x => x.id !== wid)]; }
  renderStats(); renderList(); renderMode();
};
