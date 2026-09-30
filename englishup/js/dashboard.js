/* EnglishUp — student dashboard */
'use strict';

Pages.dashboard = () => {
  const s = App.state, u = s.user, h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const partVi = h < 12 ? 'Chào buổi sáng' : h < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  $('#dash-greeting').textContent = `Good ${part}, ${givenName(u.name)} 👋`;
  $('#dash-sub').innerHTML = `Ready to improve your English today? <span class="vi-hint">${partVi}!</span>`;
  const li = App.levelInfo();
  $('#dash-level').innerHTML = `<span class="pill pill-level">${App.level} ${DATA.levels[App.level]}</span><span class="pill">⚡ ${fmtNum(s.xp)} XP</span><span class="pill">Level ${li.n} ${li.name}</span>`;

  /* Daily goal */
  const goalPct = s.todayMinutes / s.dailyGoal * 100, left = Math.max(0, s.dailyGoal - s.todayMinutes);
  $('#goal-card').innerHTML = `
    <div class="card-head"><h2>Daily goal</h2><button class="link-btn" id="edit-goal">Edit</button></div>
    <div class="goal-row">${ring(goalPct, { size: 112, label: `${s.todayMinutes}/${s.dailyGoal}`, sub: 'minutes', color: goalPct >= 100 ? 'var(--success)' : 'var(--primary)' })}
      <div><p class="goal-left">${left ? `${left} minutes remaining` : 'Goal complete! 🎉'}</p><p class="muted small">${left ? 'Một bài học ngắn là đủ để hoàn thành.' : 'Hôm nay bạn đã làm rất tốt.'}</p>
      ${left ? `<a class="btn btn-sm btn-primary" href="${s.lastLesson ? `lesson.html?course=${s.lastLesson.course}&lesson=${s.lastLesson.lesson}` : 'courses.html'}">Do a ${Math.min(left, 10)}-min lesson</a>` : ''}</div></div>`;
  $('#edit-goal').addEventListener('click', () => {
    openModal({ title: 'Daily goal', body: `<p class="muted">How many minutes do you want to study each day?</p><div class="goal-options">${[10, 15, 20, 30, 45, 60].map(m => `<button class="chip ${m === s.dailyGoal ? 'active' : ''}" data-m="${m}">${m} min</button>`).join('')}</div>`,
      onOpen(el, close) { $$('[data-m]', el).forEach(b => b.addEventListener('click', () => { s.dailyGoal = +b.dataset.m; App.save(); close(); toast(`Daily goal set to ${b.dataset.m} minutes.`, 'success'); Pages.dashboard.rerender(); })); } });
  });

  /* Continue learning */
  const cl = $('#continue-card');
  if (s.lastLesson) {
    const c = App.course(s.lastLesson.course), les = App.courseLessons(c).find(l => l.id === s.lastLesson.lesson) || App.courseLessons(c)[0];
    const pct = App.courseProgress(c.id);
    cl.innerHTML = `<div class="continue-thumb thumb" style="--h:${c.hue}"><span class="thumb-emoji">${c.emoji}</span></div>
      <div class="continue-body"><span class="muted small">Continue learning</span><h2>${esc(c.title)}</h2>
      <p class="muted">Next: Lesson ${les.n} — ${esc(les.title)} (${les.duration})</p>
      <div class="course-progress">${progressBar(pct)}<span>Progress: ${pct}%</span></div>
      <a class="btn btn-primary" href="lesson.html?course=${c.id}&lesson=${les.id}">${icon('play', 16)} Continue Learning</a></div>`;
  } else {
    cl.innerHTML = `<div class="continue-body">${emptyState('📘', 'Pick your first course', 'Choose a course that fits your level and goals — or take the 5-minute level test first.', `<div class="btn-row"><a href="courses.html" class="btn btn-primary">Browse courses</a><a href="level-test.html" class="btn btn-secondary">Take level test</a></div>`)}</div>`;
  }

  /* Today's lessons */
  const today = [
    { key: 'pronunciation', title: 'Pronunciation', desc: 'The /θ/ sound in "think"', min: 10, href: 'pronunciation.html', emoji: '🎙', hue: 250 },
    { key: 'vocabulary', title: 'Vocabulary', desc: '10 words for work', min: 15, href: 'vocabulary.html', emoji: '📚', hue: 160 },
    { key: 'listening', title: 'Listening', desc: 'Stand-up meeting', min: 12, href: 'listening.html?clip=ls4', emoji: '🎧', hue: 200 },
    { key: 'speaking', title: 'Speaking', desc: 'Small talk with a colleague', min: 10, href: 'speaking.html?scenario=s7', emoji: '🗣', hue: 30 }
  ];
  $('#today-lessons').innerHTML = today.map(t => {
    const done = s.todayDone.includes(t.key);
    return `<a href="${t.href}" class="today-card ${done ? 'done' : ''}" style="--h:${t.hue}">
      <span class="today-emoji" aria-hidden="true">${t.emoji}</span>
      <span class="today-text"><strong>${t.title}</strong><span>${t.desc}</span></span>
      <span class="today-meta">${done ? `<span class="badge badge-success">${icon('check', 14)} Done</span>` : `<span class="badge badge-soft">${t.min} min</span>`}</span></a>`;
  }).join('');
  $('#today-count').textContent = `${today.filter(t => s.todayDone.includes(t.key)).length}/${today.length} done`;

  /* Streak */
  const dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'S'], todayIdx = (new Date().getDay() + 6) % 7;
  const doneToday = s.lastActive === dateKey(), start = doneToday ? 0 : 1;
  $('#streak-card').innerHTML = `<div class="streak-top"><span class="streak-flame" aria-hidden="true">🔥</span><div><strong class="streak-num">${s.streak} days</strong><p class="muted small">${doneToday ? 'Streak saved for today. Hẹn gặp lại ngày mai!' : 'Keep your streak alive! Học ít nhất 1 bài hôm nay.'}</p></div></div>
    <div class="week-dots" aria-label="This week">${dayNames.map((d, i) => { const back = todayIdx - i, on = i <= todayIdx && back >= start && back < start + s.streak; return `<span class="${on ? 'on' : ''} ${i === todayIdx ? 'today' : ''}"><i>${on ? '✓' : ''}</i>${d}</span>`; }).join('')}</div>`;

  /* Weekly activity */
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  barChart($('#weekly-chart'), days.map((d, i) => ({ label: d, value: s.weekly[i] || 0 })), { highlight: todayIdx });
  const total = s.weekly.reduce((a, b) => a + b, 0);
  $('#weekly-total').textContent = `${total} min this week`;

  /* Skills */
  $('#skills-list').innerHTML = Object.entries(s.skills).map(([k, v]) => `<div class="skill-row"><span>${k}</span>${progressBar(v)}<strong>${v}%</strong></div>`).join('');

  /* Daily challenge */
  const tasks = App.challengeTasks(), allDone = tasks.every(t => t.have >= t.need);
  $('#challenge-mini').innerHTML = `<div class="card-head"><h2>Today's challenge</h2><span class="badge badge-warning">+100 XP</span></div>
    <ul class="task-list">${tasks.map(t => `<li class="${t.have >= t.need ? 'done' : ''}"><span class="task-check" aria-hidden="true">${t.have >= t.need ? '✓' : ''}</span><a href="${t.href}">${t.label}</a><span class="muted small">${t.have}/${t.need}</span></li>`).join('')}</ul>
    <a href="practice.html" class="btn btn-sm ${allDone && !s.challenge.claimed ? 'btn-primary' : 'btn-secondary'} btn-block">${s.challenge.claimed ? 'Reward claimed ✓' : allDone ? 'Claim reward' : 'Open challenge'}</a>`;

  /* Leaderboard mini */
  const board = [...DATA.leaderboard, { name: u.name, xp: s.xp, hue: u.hue, me: true }].sort((a, b) => b.xp - a.xp);
  const myRank = board.findIndex(x => x.me) + 1;
  $('#leader-mini').innerHTML = `<div class="card-head"><h2>Leaderboard</h2><a class="link-btn" href="achievements.html#leaderboard">See all</a></div>
    <ol class="leader-list">${board.slice(0, 5).map((p, i) => `<li class="${p.me ? 'me' : ''}"><span class="rank">${i + 1}</span><span class="avatar avatar-sm" style="--h:${p.hue}">${initials(p.name)}</span><span class="grow">${esc(p.me ? 'You' : p.name)}</span><strong>${fmtNum(p.xp)} XP</strong></li>`).join('')}</ol>
    ${myRank > 5 ? `<p class="muted small">You are #${myRank}. ${fmtNum(board[myRank - 2].xp - s.xp)} XP to pass ${esc(board[myRank - 2].name)}.</p>` : ''}`;

  /* Upcoming class / level test prompt */
  const up = s.bookings.filter(b => b.date >= dateKey()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  const side = $('#dash-extra');
  if (up) {
    const t = DATA.teachers.find(x => x.id === up.teacher);
    side.innerHTML = `<div class="card-head"><h2>Upcoming class</h2></div><div class="teacher-mini"><span class="avatar" style="--h:${t.hue}">${initials(t.name)}</span><div><strong>${esc(t.name)}</strong><p class="muted small">${new Date(up.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} at ${up.time}</p></div></div><a href="live-classes.html" class="btn btn-sm btn-secondary btn-block">View my classes</a>`;
  } else if (!s.levelTest) {
    side.innerHTML = `<div class="card-head"><h2>Know your level</h2></div><p class="muted">Take the 5-minute test to get a personalised learning path. Kiểm tra trình độ miễn phí.</p><a href="level-test.html" class="btn btn-sm btn-primary btn-block">Take the level test</a>`;
  } else {
    side.innerHTML = `<div class="card-head"><h2>Talk to a teacher</h2></div><p class="muted">Practise with a native teacher for 50 minutes. Classes from 160,000đ.</p><a href="live-classes.html" class="btn btn-sm btn-secondary btn-block">Find a teacher</a>`;
  }
};
Pages.dashboard.rerender = () => Pages.dashboard();
