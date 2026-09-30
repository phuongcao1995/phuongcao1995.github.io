/* EnglishUp — lesson player */
'use strict';

/* Build content for syllabus-only lessons from the shared vocabulary bank */
function generateLesson(l, c) {
  const pool = DATA.vocab.filter(w => c.tags.includes(w.topic));
  const words = pool.length >= 3 ? [0, 1, 2].map(k => pool[(l.n * 3 + k) % pool.length]) : sample(DATA.vocab, 3);
  const opts = w => shuffle([w.vi, ...sample(DATA.vocab.filter(x => x.id !== w.id), 3).map(x => x.vi)]);
  const practice = words.slice(0, 2).map(w => { const o = opts(w); return { q: `What does "${w.word}" mean?`, options: o, answer: o.indexOf(w.vi), vi: `${w.word} ${w.ipa} = ${w.vi}` }; });
  return {
    ...l,
    script: `Welcome to ${l.title}. In this lesson from ${c.title}, you will learn useful words like ${words.map(w => w.word).join(', ')} and practise them in real sentences.`,
    vocab: words.map(w => [w.word, w.ipa, w.vi]),
    explain: { en: `${l.title} is a key part of ${c.title}. Focus on the three key words below, listen to each example, then try the practice questions.`, vi: `Bài "${l.title}": tập trung vào 3 từ vựng chính, nghe câu ví dụ và làm bài luyện tập bên dưới.` },
    examples: words.map(w => [w.example, w.exVi]),
    practice
  };
}

Pages.lesson = () => {
  const s = App.state, p = params();
  let courseId = p.get('course') || (s.lastLesson && s.lastLesson.course) || s.enrolled[0] || 'c3';
  let c = App.course(courseId) || App.course('c3');
  const lessons = App.courseLessons(c);
  let lesson = lessons.find(l => l.id === p.get('lesson')) || lessons.find(l => s.lastLesson && l.id === s.lastLesson.lesson) || lessons[0];
  if (!s.enrolled.includes(c.id)) { s.enrolled.push(c.id); App.save(); }
  let tab = 'vocabulary', playing = null;

  const done = () => s.completed[c.id] || (s.completed[c.id] = []);
  const full = l => l.generated ? generateLesson(l, c) : l;

  const renderNav = () => {
    $('#lesson-nav').innerHTML = `<a href="course-detail.html?id=${c.id}" class="back-link">${icon('chevL', 16)} ${esc(c.title)}</a>
      <div class="nav-progress">${progressBar(App.courseProgress(c.id))}<span class="muted small">${done().length}/${lessons.length} lessons complete</span></div>
      <ol class="lesson-list">${lessons.map(l => `<li><a href="?course=${c.id}&lesson=${l.id}" data-id="${l.id}" class="${l.id === lesson.id ? 'active' : ''} ${done().includes(l.id) ? 'done' : ''}" ${l.id === lesson.id ? 'aria-current="page"' : ''}>
        <span class="ln">${done().includes(l.id) ? '✓' : l.n}</span><span><strong>Lesson ${l.n}</strong><span>${esc(l.title)}</span></span></a></li>`).join('')}</ol>`;
    $$('#lesson-nav .lesson-list a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); go(lessons.find(l => l.id === a.dataset.id)); }));
  };

  const renderMain = () => {
    const L = full(lesson), isDone = done().includes(lesson.id), idx = lessons.indexOf(lesson);
    document.title = `${lesson.title} — EnglishUp`;
    $('#lesson-main').innerHTML = `
      <div class="lesson-title"><span class="muted small">Lesson ${lesson.n} of ${lessons.length} — ${lesson.duration}</span><h1>${esc(lesson.title)}</h1></div>
      <div class="video-box" id="video-box" style="--h:${c.hue}">
        <div class="video-art" aria-hidden="true"><span>${c.emoji}</span></div>
        <button class="play-big" id="play-video" aria-label="Play lesson video">${icon('play', 30)}</button>
        <p class="video-caption" id="video-caption" hidden></p>
        <div class="video-bar"><button class="icon-btn icon-btn-light" id="vid-toggle" aria-label="Play">${icon('play', 18)}</button><div class="video-track"><span id="video-progress"></span></div><span id="video-time">0:00 / ${lesson.duration.replace(' min', ':00')}</span></div>
      </div>
      <div class="tabs" role="tablist">${['vocabulary', 'explanation', 'examples', 'practice'].map(t => `<button role="tab" class="tab ${t === tab ? 'active' : ''}" aria-selected="${t === tab}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
      <div class="tab-panel card" id="tab-panel" role="tabpanel"></div>
      <div class="lesson-actions">
        <button class="btn btn-secondary" id="prev-lesson" ${idx === 0 ? 'disabled' : ''}>${icon('chevL', 16)} Previous</button>
        <button class="btn ${isDone ? 'btn-success' : 'btn-primary'}" id="mark-complete">${isDone ? `${icon('check', 16)} Completed` : 'Mark Complete'}</button>
        <button class="btn btn-secondary" id="next-lesson" ${idx === lessons.length - 1 ? 'disabled' : ''}>Next ${icon('chevR', 16)}</button>
      </div>`;
    $$('#lesson-main .tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; $$('#lesson-main .tab').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b); }); renderTab(L); }));
    renderTab(L);
    const toggleVideo = () => playing ? stopVideo() : playVideo(L);
    $('#play-video').addEventListener('click', toggleVideo);
    $('#vid-toggle').addEventListener('click', toggleVideo);
    $('#prev-lesson').addEventListener('click', () => go(lessons[idx - 1]));
    $('#next-lesson').addEventListener('click', () => go(lessons[idx + 1]));
    $('#mark-complete').addEventListener('click', complete);
  };

  const renderTab = L => {
    const panel = $('#tab-panel');
    if (tab === 'vocabulary') {
      panel.innerHTML = `<h2>Key vocabulary</h2><ul class="vocab-rows">${L.vocab.map(v => `<li><button class="icon-btn" data-say="${esc(v[0])}" aria-label="Listen to ${esc(v[0])}">${icon('volume', 18)}</button><strong>${esc(v[0])}</strong><span class="ipa">${esc(v[1])}</span><span class="vi-text">${esc(v[2])}</span></li>`).join('')}</ul>`;
    } else if (tab === 'explanation') {
      panel.innerHTML = `<h2>Explanation</h2><p>${esc(L.explain.en)}</p><div class="vi-box"><span class="flag" aria-hidden="true">🇻🇳</span><p>${esc(L.explain.vi)}</p></div>`;
    } else if (tab === 'examples') {
      panel.innerHTML = `<h2>Examples</h2><ul class="example-list">${L.examples.map(e => `<li><button class="icon-btn" data-say="${esc(e[0])}" aria-label="Listen">${icon('volume', 18)}</button><div><p class="en">${esc(e[0])}</p><p class="vi-text vi-hint">${esc(e[1])}</p></div></li>`).join('')}</ul>`;
    } else {
      panel.innerHTML = `<h2>Practice</h2>${L.practice.map((q, qi) => `<div class="quiz-q" data-q="${qi}"><p class="q-text">${qi + 1}. ${esc(q.q)}</p><div class="options compact">${q.options.map((o, i) => `<button class="option" data-i="${i}"><span class="opt-key">${'ABCD'[i]}</span>${esc(o)}</button>`).join('')}</div><div class="feedback" aria-live="polite"></div></div>`).join('')}`;
      $$('.quiz-q', panel).forEach(box => {
        const q = L.practice[+box.dataset.q];
        $$('.option', box).forEach(b => b.addEventListener('click', () => {
          if (box.classList.contains('answered')) return;
          box.classList.add('answered');
          const i = +b.dataset.i, ok = i === q.answer;
          b.classList.add(ok ? 'correct' : 'wrong');
          $$('.option', box)[q.answer].classList.add('correct');
          $('.feedback', box).innerHTML = `<div class="fb ${ok ? 'fb-ok' : 'fb-bad'}"><strong>${ok ? 'Correct! Chính xác!' : 'Not quite.'}</strong> <span>${esc(q.vi)}</span></div>`;
          if (ok) App.addXP(5, 'Correct answer');
        }));
      });
    }
    $$('[data-say]', panel).forEach(b => b.addEventListener('click', () => speak(b.dataset.say)));
  };

  const playVideo = L => {
    const cap = $('#video-caption'), bar = $('#video-progress'), time = $('#video-time');
    const totalSec = parseInt(lesson.duration) * 60;
    $('#video-box').classList.add('playing');
    $('#vid-toggle').innerHTML = icon('pause', 18); $('#vid-toggle').setAttribute('aria-label', 'Pause');
    cap.hidden = false; cap.textContent = L.script;
    let t = 0; const dur = 14000;
    playing = setInterval(() => {
      t += 250; const pct = Math.min(t / dur * 100, 100);
      bar.style.width = pct + '%';
      const sec = Math.round(pct / 100 * totalSec); time.textContent = `${Math.floor(sec / 60)}:${pad(sec % 60)} / ${lesson.duration.replace(' min', ':00')}`;
      if (pct >= 100) { stopVideo(); toast('Video finished. Now try the practice questions!', 'info'); tab = 'practice'; renderMain(); }
    }, 250);
    speak(L.script, { rate: 0.95 });
  };
  const stopVideo = () => {
    clearInterval(playing); playing = null; stopSpeaking();
    const vb = $('#video-box'); if (vb) vb.classList.remove('playing');
    const vt = $('#vid-toggle'); if (vt) { vt.innerHTML = icon('play', 18); vt.setAttribute('aria-label', 'Play'); }
  };

  const complete = () => {
    if (done().includes(lesson.id)) { toast('This lesson is already complete. Bài này đã hoàn thành.', 'info'); return; }
    done().push(lesson.id);
    s.stats.lessons++;
    const nextL = lessons[lessons.indexOf(lesson) + 1];
    s.lastLesson = { course: c.id, lesson: (nextL || lesson).id };
    App.logMinutes(parseInt(lesson.duration) || 10);
    App.markToday('lesson');
    App.addXP(20, 'Lesson completed');
    if (done().length === lessons.length) {
      App.addXP(100, 'Course completed');
      App.notify('🏅', `You completed ${c.title}!`);
      openModal({ title: 'Course complete! 🏅', body: `<div class="center-block"><div class="big-emoji">🎓</div><p class="lead">You finished <strong>${esc(c.title)}</strong>.</p><p class="muted">Chúc mừng bạn đã hoàn thành khoá học!</p></div>`, actions: [{ label: 'Browse more courses', cls: 'btn-primary', onClick() { location.href = 'courses.html'; } }] });
    }
    renderNav(); renderMain(); renderSide();
  };

  const renderSide = () => {
    const pct = App.courseProgress(c.id), li = App.levelInfo();
    $('#lesson-side').innerHTML = `
      <section class="card"><h2>Your progress</h2><div class="center-block">${ring(pct, { size: 120, label: pct + '%', sub: 'of course' })}</div>
        <ul class="stat-mini"><li><span>Lessons done</span><strong>${done().length}/${lessons.length}</strong></li><li><span>Today</span><strong>${s.todayMinutes} min</strong></li><li><span>XP</span><strong>${fmtNum(s.xp)}</strong></li><li><span>Level</span><strong>${li.n} ${li.name}</strong></li></ul></section>
      <section class="card"><h2>My notes</h2><label for="lesson-notes" class="sr-only">Notes for this lesson</label>
        <textarea id="lesson-notes" class="input" rows="5" placeholder="Write new words or questions… Ghi chú của bạn">${esc(s.notes[lesson.id] || '')}</textarea>
        <p class="muted small" id="notes-status">Notes save automatically.</p></section>
      <section class="card tip-card"><strong>💡 Tip</strong><p class="small">Say each example out loud twice. Speaking while learning helps you remember 2× longer.</p><a href="pronunciation.html" class="btn btn-sm btn-secondary btn-block">Practise pronunciation</a></section>`;
    $('#lesson-notes').addEventListener('input', debounce(e => { s.notes[lesson.id] = e.target.value; App.save(); $('#notes-status').textContent = 'Saved ✓'; }, 400));
  };

  const go = l => {
    if (!l) return;
    stopVideo(); lesson = l; $('#lesson-nav').classList.remove('open'); tab = 'vocabulary';
    s.lastLesson = { course: c.id, lesson: l.id }; App.save();
    history.replaceState(null, '', `?course=${c.id}&lesson=${l.id}`);
    renderNav(); renderMain(); renderSide();
    $('#lesson-main').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  s.lastLesson = { course: c.id, lesson: lesson.id }; App.save();
  renderNav(); renderMain(); renderSide();
  $('#toggle-lesson-nav').addEventListener('click', e => { const o = $('#lesson-nav').classList.toggle('open'); e.currentTarget.setAttribute('aria-expanded', o); });
};
