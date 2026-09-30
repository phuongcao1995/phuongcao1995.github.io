/* EnglishUp — courses listing & detail */
'use strict';

Pages.courses = () => {
  const s = App.state;
  let cat = params().get('cat') || 'All', level = 'all', sort = 'popular', q = '', mine = false;
  const cats = ['All', ...DATA.categories];
  $('#cat-tabs').innerHTML = cats.map(c => `<button class="tab ${c === cat ? 'active' : ''}" role="tab" aria-selected="${c === cat}" data-cat="${esc(c)}">${c}</button>`).join('');
  const grid = $('#course-grid');
  const render = () => {
    let list = DATA.courses.filter(c =>
      (cat === 'All' || c.category === cat) && (level === 'all' || c.level === level) &&
      (!mine || s.enrolled.includes(c.id)) && (!q || (c.title + ' ' + c.desc + ' ' + c.category).toLowerCase().includes(q)));
    list = list.slice().sort((a, b) => sort === 'rating' ? b.rating - a.rating : sort === 'price' ? a.price - b.price : sort === 'level' ? a.level.localeCompare(b.level) : b.students - a.students);
    $('#result-count').textContent = `${list.length} course${list.length === 1 ? '' : 's'}`;
    if (!list.length) { grid.innerHTML = emptyState('🔍', 'No courses match your filters', 'Try another level or clear the search to see all courses.', '<button class="btn btn-secondary" id="clear-filters">Clear filters</button>'); $('#clear-filters').addEventListener('click', reset); return; }
    if (cat === 'All' && !q && level === 'all' && !mine && sort === 'popular') {
      grid.innerHTML = DATA.categories.map(cn => `<section class="course-section"><div class="section-head"><h2>${cn}</h2><button class="link-btn" data-jump="${esc(cn)}">View all</button></div><div class="course-grid">${list.filter(c => c.category === cn).map(c => App.courseCard(c)).join('')}</div></section>`).join('');
      $$('[data-jump]', grid).forEach(b => b.addEventListener('click', () => { cat = b.dataset.jump; syncTabs(); render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
    } else grid.innerHTML = `<div class="course-grid">${list.map(c => App.courseCard(c)).join('')}</div>`;
  };
  const syncTabs = () => $$('#cat-tabs .tab').forEach(t => { const on = t.dataset.cat === cat; t.classList.toggle('active', on); t.setAttribute('aria-selected', on); });
  const reset = () => { cat = 'All'; level = 'all'; q = ''; mine = false; sort = 'popular'; $('#course-search').value = ''; $('#level-filter').value = 'all'; $('#sort-select').value = 'popular'; $('#mine-toggle').setAttribute('aria-pressed', 'false'); syncTabs(); render(); };
  $$('#cat-tabs .tab').forEach(t => t.addEventListener('click', () => { cat = t.dataset.cat; syncTabs(); render(); }));
  $('#course-search').addEventListener('input', debounce(e => { q = e.target.value.trim().toLowerCase(); render(); }, 150));
  $('#level-filter').addEventListener('change', e => { level = e.target.value; render(); });
  $('#sort-select').addEventListener('change', e => { sort = e.target.value; render(); });
  $('#mine-toggle').addEventListener('click', e => { mine = !mine; e.currentTarget.setAttribute('aria-pressed', mine); render(); });
  // Recommended strip based on level
  const rec = DATA.courses.filter(c => c.level === App.level && !s.enrolled.includes(c.id)).slice(0, 3);
  $('#rec-note').innerHTML = rec.length ? `Recommended for your level (${App.level}): ${rec.map(c => `<a href="course-detail.html?id=${c.id}">${esc(c.title)}</a>`).join(', ')}` : '';
  render();
};

Pages['course-detail'] = () => {
  const s = App.state, id = params().get('id') || 'c3', c = App.course(id);
  const root = $('#course-detail');
  if (!c) { root.innerHTML = emptyState('🤔', 'Course not found', 'This course may have been moved.', '<a class="btn btn-primary" href="courses.html">Browse courses</a>'); return; }
  document.title = `${c.title} — EnglishUp`;
  const teacher = DATA.teachers.find(t => t.id === c.teacher);
  const render = () => {
    const enrolled = s.enrolled.includes(c.id), lessons = App.courseLessons(c), done = s.completed[c.id] || [], pct = App.courseProgress(c.id);
    const next = lessons.find(l => !done.includes(l.id)) || lessons[0];
    root.innerHTML = `
      <nav class="breadcrumb" aria-label="Breadcrumb"><a href="courses.html">Courses</a> <span aria-hidden="true">/</span> <a href="courses.html?cat=${encodeURIComponent(c.category)}">${esc(c.category)}</a> <span aria-hidden="true">/</span> <span>${esc(c.title)}</span></nav>
      <section class="course-hero card">
        <div class="thumb course-hero-thumb" style="--h:${c.hue}"><span class="thumb-emoji">${c.emoji}</span><span class="thumb-level">${c.level} ${DATA.levels[c.level]}</span></div>
        <div class="course-hero-body">
          <h1>${esc(c.title)}</h1>
          <p class="lead">${esc(c.desc)}</p>
          <div class="course-meta big"><span class="rating">★ ${c.rating}</span><span>${icon('users', 16)} ${fmtNum(c.students)} students</span><span>${icon('book', 16)} ${lessons.length} lessons</span><span>${icon('clock', 16)} ${c.duration}</span></div>
          ${enrolled ? `<div class="course-progress">${progressBar(pct)}<span>${pct}% complete (${done.length}/${lessons.length} lessons)</span></div>` : ''}
          <div class="btn-row">
            ${enrolled ? `<a class="btn btn-primary btn-lg" href="lesson.html?course=${c.id}&lesson=${next.id}">${icon('play', 16)} ${done.length ? 'Continue Learning' : 'Start first lesson'}</a>`
              : `<button class="btn btn-primary btn-lg" id="enroll-btn">${c.price ? `Enroll for ${fmtVND(c.price)}` : 'Enroll for free'}</button>`}
            <button class="btn btn-secondary btn-lg" id="preview-btn">${icon('play', 16)} Preview lesson 1</button>
          </div>
          ${!enrolled && c.price ? '<p class="muted small">Included in Premium. 7-day free trial, cancel anytime.</p>' : ''}
        </div>
      </section>
      <div class="detail-grid">
        <div class="stack">
          <section class="card"><h2>What you will learn</h2><ul class="check-list two-col">${c.outcomes.map(o => `<li>${icon('check', 16)} ${esc(o)}</li>`).join('')}</ul></section>
          <section class="card"><div class="card-head"><h2>Curriculum</h2><span class="muted small">${lessons.length} lessons</span></div>
            <ol class="curriculum">${lessons.map(l => {
              const isDone = done.includes(l.id), locked = !enrolled && l.n > 1;
              return `<li class="${isDone ? 'done' : ''}">
                <span class="cur-num" aria-hidden="true">${isDone ? '✓' : l.n}</span>
                <span class="grow"><strong>${esc(l.title)}</strong><span class="muted small">${l.duration} — Video, vocabulary and practice</span></span>
                ${locked ? `<span class="muted" aria-label="Locked">${icon('lock', 16)}</span>` : `<a class="btn btn-sm ${isDone ? 'btn-ghost' : 'btn-secondary'}" href="lesson.html?course=${c.id}&lesson=${l.id}">${isDone ? 'Review' : 'Start'}</a>`}
              </li>`; }).join('')}</ol></section>
          <section class="card"><h2>Student reviews</h2>
            ${[['Nguyen Hoai An', 5, 'Bài học ngắn, dễ theo. I finally use these phrases at work every day.'], ['Tran Duc Minh', 5, 'The Vietnamese explanations help a lot when I get stuck.'], ['Le Thu Thao', 4, 'Great practice exercises. I want even more speaking drills!']].map(r => `<div class="review"><span class="avatar avatar-sm" style="--h:${r[0].length * 17}">${initials(r[0])}</span><div><strong>${r[0]}</strong> <span class="rating">${'★'.repeat(r[1])}</span><p>${r[2]}</p></div></div>`).join('')}
          </section>
        </div>
        <aside class="stack">
          <section class="card"><h2>Your teacher</h2>
            <a class="teacher-mini" href="teacher.html?id=${teacher.id}"><span class="avatar avatar-lg" style="--h:${teacher.hue}">${initials(teacher.name)}</span><div><strong>${esc(teacher.name)}</strong><p class="muted small">${teacher.flag} ${teacher.country}</p><p class="small">★ ${teacher.rating} — ${fmtNum(teacher.classes)} classes</p></div></a>
            <a class="btn btn-sm btn-secondary btn-block" href="teacher.html?id=${teacher.id}">Book a live class</a>
          </section>
          <section class="card"><h2>This course includes</h2><ul class="plain-list">
            <li>🎬 ${lessons.length} short video lessons</li><li>🧠 ${lessons.length * 2} practice questions</li><li>📚 ${lessons.length * 3} key vocabulary words</li><li>🇻🇳 Vietnamese explanations</li><li>🏅 Certificate of completion</li></ul></section>
        </aside>
      </div>`;
    const eb = $('#enroll-btn');
    if (eb) eb.addEventListener('click', () => {
      const doEnroll = () => {
        s.enrolled.push(c.id);
        if (!s.lastLesson) s.lastLesson = { course: c.id, lesson: lessons[0].id };
        App.save(); App.addXP(10, 'Course enrolled'); App.notify('📚', `You enrolled in ${c.title}.`); render();
      };
      if (!c.price || s.plan !== 'free') { doEnroll(); return; }
      openModal({ title: 'Enroll in this course', body: `<p><strong>${esc(c.title)}</strong></p><div class="choice-list">
        <label class="choice"><input type="radio" name="buy" value="trial" checked><span><strong>Start Premium free trial</strong><span class="muted small">7 days free, then 199,000đ/month. Access every course.</span></span></label>
        <label class="choice"><input type="radio" name="buy" value="once"><span><strong>Buy this course</strong><span class="muted small">One-time payment of ${fmtVND(c.price)}. Demo — no payment is taken.</span></span></label></div>`,
        actions: [{ label: 'Cancel', cls: 'btn-ghost' }, { label: 'Confirm', cls: 'btn-primary', onClick(close, el) { if ($('input[name=buy]:checked', el).value === 'trial') { s.plan = 'premium'; s.planTrialEnds = dateKey(addDays(new Date(), 7)).split('-').reverse().join('/'); } doEnroll(); toast('Enrolled! Chúc bạn học tốt.', 'success'); } }] });
    });
    $('#preview-btn').addEventListener('click', () => {
      const l = lessons[0];
      openModal({ title: `Preview: ${esc(l.title)}`, size: 'modal-lg', body: `<div class="video-box small-video"><button class="play-big" id="pv-play" aria-label="Play preview">${icon('play', 28)}</button><p class="video-caption" id="pv-cap">${esc(l.script || c.desc)}</p></div><p class="muted small">Preview uses your browser's text-to-speech voice.</p>`,
        onOpen(el) { $('#pv-play', el).addEventListener('click', () => speak(l.script || c.desc)); } });
    });
  };
  render();
};
