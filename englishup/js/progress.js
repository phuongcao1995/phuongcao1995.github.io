/* EnglishUp — progress analytics, achievements & leaderboard, practice hub with daily challenge */
'use strict';

Pages.progress = () => {
  const s = App.state, root = $('#progress-app');
  const hours = Math.floor(s.totalMinutes / 60), mins = s.totalMinutes % 60;
  const weekTotal = s.weekly.reduce((a, b) => a + b, 0), weekGoal = s.dailyGoal * 7;
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  const monthly = [320, 410, 380, 520, 610, Math.max(240, Math.round(weekTotal * 3.2))];
  root.innerHTML = `
    <div class="kpi-row">
      ${[['⏱', `${hours}h ${mins}m`, 'Total learning time'], ['📘', s.stats.lessons, 'Lessons completed'], ['📚', fmtNum(App.wordsLearned()), 'Vocabulary learned'], ['🗣', s.stats.speaking, 'Speaking sessions'], ['🔥', `${s.streak} days`, 'Current streak'], ['🎙', s.stats.pronBest, 'Best pronunciation']]
        .map(([e, v, l]) => `<div class="card kpi-card"><span class="kpi-emoji" aria-hidden="true">${e}</span><strong>${v}</strong><span class="muted small">${l}</span></div>`).join('')}
    </div>
    <div class="grid-2">
      <section class="card"><div class="card-head"><h2>Weekly learning time</h2><span class="muted small">${weekTotal} min</span></div><div id="p-weekly"></div></section>
      <section class="card"><div class="card-head"><h2>Weekly goal</h2><span class="muted small">${s.dailyGoal} min × 7 days</span></div>
        <div class="goal-row">${ring(weekTotal / weekGoal * 100, { size: 140, stroke: 12, label: `${Math.round(weekTotal / weekGoal * 100)}%`, sub: `${weekTotal}/${weekGoal} min`, color: weekTotal >= weekGoal ? 'var(--success)' : 'var(--primary)' })}
        <div><p>${weekTotal >= weekGoal ? 'You reached your weekly goal! 🎉' : `${weekGoal - weekTotal} more minutes to reach this week's goal.`}</p><p class="vi-hint small">${weekTotal >= weekGoal ? 'Bạn đã hoàn thành mục tiêu tuần!' : 'Chỉ cần học đều mỗi ngày là bạn sẽ đạt mục tiêu.'}</p><a class="btn btn-sm btn-primary" href="dashboard.html">See today's plan</a></div></div></section>
      <section class="card"><div class="card-head"><h2>Skill progress</h2><span class="badge badge-soft">${App.level} ${DATA.levels[App.level]}</span></div><div id="p-skills" class="skill-radar"></div></section>
      <section class="card"><div class="card-head"><h2>Monthly progress</h2><span class="muted small">minutes per month</span></div><div id="p-monthly"></div></section>
      <section class="card"><div class="card-head"><h2>Vocabulary growth</h2><span class="muted small">total words</span></div><div id="p-vocab"></div></section>
      <section class="card"><div class="card-head"><h2>Speaking score</h2><span class="muted small">last sessions</span></div><div id="p-speak"></div></section>
    </div>
    <section class="card"><div class="card-head"><h2>Activity in the last 12 weeks</h2><span class="muted small">Each square is one day</span></div><div class="heatmap-wrap"><div class="heatmap" id="p-heat" role="img"></div></div>
      <div class="heat-legend"><span class="muted small">Less</span>${[0, 1, 2, 3, 4].map(l => `<i class="h${l}"></i>`).join('')}<span class="muted small">More</span></div></section>`;

  const idx = (new Date().getDay() + 6) % 7;
  barChart($('#p-weekly'), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => ({ label: d, value: s.weekly[i] || 0 })), { highlight: idx });
  barChart($('#p-monthly'), months.map((m, i) => ({ label: m, value: monthly[i] })), { highlight: 5 });
  const vg = s.stats.vocabGrowth.slice(0, -1).concat(App.wordsLearned());
  lineChart($('#p-vocab'), vg, { labels: months.slice(-vg.length), color: 'var(--success)' });
  const sp = s.stats.speakingScores.slice(-7);
  lineChart($('#p-speak'), sp, { labels: sp.map((_, i) => `#${i + 1}`), color: 'var(--purple)', min: 40, max: 100 });
  $('#p-skills').innerHTML = Object.entries(s.skills).map(([k, v]) => `<div class="skill-ring">${ring(v, { size: 88, stroke: 8, label: `${v}%` })}<span>${k}</span></div>`).join('');
  // Heatmap: deterministic pseudo-history + streak days
  const cells = [], today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = addDays(today, -i), inStreak = i < s.streak || (i === 0 && s.lastActive === dateKey());
    const v = i === 0 ? (s.todayMinutes ? Math.min(4, Math.ceil(s.todayMinutes / 12)) : 0) : inStreak ? 1 + ((i * 7 + 3) % 4) : ((i * 13) % 5 === 0 ? 0 : (i * 5) % 4);
    cells.push(`<i class="h${v}" title="${dateKey(d)}"></i>`);
  }
  $('#p-heat').innerHTML = cells.join('');
  $('#p-heat').setAttribute('aria-label', `Learning activity heatmap, current streak ${s.streak} days`);
};

Pages.achievements = () => {
  const s = App.state, root = $('#achievements-app'), li = App.levelInfo();
  root.innerHTML = `
    <section class="card level-hero">
      <div class="level-badge" aria-hidden="true">${li.n}</div>
      <div class="grow"><span class="muted small">Level ${li.n}</span><h2>${li.name}</h2>
        ${progressBar(li.pct)}
        <p class="muted small">${li.next ? `${fmtNum(s.xp)} XP · ${fmtNum(li.toNext)} XP to Level ${li.next.n} — ${li.next.name}` : `${fmtNum(s.xp)} XP · Maximum level reached!`}</p></div>
      <div class="xp-total"><strong>${fmtNum(s.xp)}</strong><span>total XP</span></div>
    </section>
    <section class="card"><div class="card-head"><h2>Level path</h2></div>
      <ol class="level-path">${DATA.xpLevels.map(l => `<li class="${l.n < li.n ? 'passed' : l.n === li.n ? 'current' : ''}"><span class="lp-dot">${l.n < li.n ? '✓' : l.n}</span><strong>${l.name}</strong><span class="muted small">${fmtNum(l.min)} XP</span></li>`).join('')}</ol>
      <p class="muted small">How to earn XP: lesson +20 · pronunciation +10–15 · conversation +30 · grammar +20 · daily challenge +100.</p></section>
    <section class="card"><div class="card-head"><h2>Badges</h2><span class="muted small">${s.unlocked.length}/${DATA.achievements.length} unlocked</span></div>
      <div class="badge-grid">${DATA.achievements.map(a => {
        const have = App.metric(a.metric), on = s.unlocked.includes(a.id), pct = Math.min(100, have / a.target * 100);
        return `<div class="badge-card ${on ? 'unlocked' : 'locked'}"><span class="badge-icon" aria-hidden="true">${a.icon}</span><strong>${esc(a.name)}</strong><span class="muted small">${esc(a.desc)}</span>
          ${on ? '<span class="badge badge-success">Unlocked</span>' : `${progressBar(pct)}<span class="muted small">${fmtNum(Math.min(have, a.target))}/${fmtNum(a.target)}</span>`}</div>`;
      }).join('')}</div></section>
    <section class="card" id="leaderboard"><div class="card-head"><h2>Leaderboard</h2><div class="chip-row" role="tablist"><button class="chip active" data-lb="week" role="tab" aria-selected="true">This week</button><button class="chip" data-lb="all" role="tab" aria-selected="false">All time</button></div></div>
      <ol class="leader-list big" id="lb-list"></ol></section>`;
  const renderLB = kind => {
    const f = kind === 'week' ? 0.12 : 1;
    const me = { name: s.user.name, xp: Math.round(s.xp * (kind === 'week' ? 0.3 : 1)), hue: s.user.hue, me: true };
    const board = [...DATA.leaderboard.map((p, i) => ({ ...p, xp: Math.round(p.xp * f + (kind === 'week' ? (8 - i) * 15 : 0)) })), me].sort((a, b) => b.xp - a.xp);
    $('#lb-list').innerHTML = board.map((p, i) => `<li class="${p.me ? 'me' : ''}"><span class="rank ${i < 3 ? 'top' + (i + 1) : ''}">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="avatar avatar-sm" style="--h:${p.hue}">${initials(p.name)}</span><span class="grow">${esc(p.me ? `${p.name} (You)` : p.name)}</span><strong>${fmtNum(p.xp)} XP</strong></li>`).join('');
  };
  $$('[data-lb]').forEach(b => b.addEventListener('click', () => { $$('[data-lb]').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-selected', x === b); }); renderLB(b.dataset.lb); }));
  renderLB('week');
  if (location.hash === '#leaderboard') setTimeout(() => $('#leaderboard').scrollIntoView({ behavior: 'smooth' }), 100);
};

Pages.practice = () => {
  const s = App.state, root = $('#practice-app');
  const render = () => {
    const tasks = App.challengeTasks(), done = tasks.filter(t => t.have >= t.need).length, all = done === tasks.length;
    root.innerHTML = `
      <section class="card challenge-card">
        <div class="challenge-head"><div><span class="muted small">${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span><h2>Today's Challenge</h2><p class="vi-hint">Hoàn thành cả 3 nhiệm vụ để nhận thưởng.</p></div>
          <div class="reward"><span aria-hidden="true">🎁</span><strong>+100 XP</strong><span class="muted small">Reward</span></div></div>
        ${progressBar(done / tasks.length * 100, all ? 'ok' : '')}
        <ul class="challenge-tasks">${tasks.map(t => `<li class="${t.have >= t.need ? 'done' : ''}"><span class="ct-icon" aria-hidden="true">${t.have >= t.need ? '✓' : t.icon}</span>
          <div class="grow"><strong>${t.label}</strong><span class="muted small vi-hint">${t.vi}</span>${progressBar(t.have / t.need * 100)}</div>
          <span class="ct-count">${t.have}/${t.need}</span>${t.have >= t.need ? '<span class="badge badge-success">Done</span>' : `<a class="btn btn-sm btn-primary" href="${t.href}">Start</a>`}</li>`).join('')}</ul>
        <div class="btn-row"><button class="btn btn-lg ${all && !s.challenge.claimed ? 'btn-primary' : 'btn-secondary'}" id="claim" ${!all || s.challenge.claimed ? 'disabled' : ''}>${s.challenge.claimed ? '✓ Reward claimed — see you tomorrow!' : all ? '🎁 Claim +100 XP' : `${tasks.length - done} task${tasks.length - done > 1 ? 's' : ''} left`}</button>
          <span class="muted small">${s.stats.challenges} challenges completed so far</span></div>
      </section>
      <h2 class="section-title">Practice tools</h2>
      <div class="tool-grid">${[
        ['pronunciation.html', '🎙', 'AI Pronunciation Coach', 'Get a score for every word you say.', 250],
        ['speaking.html', '🗣', 'Speaking Practice', '10 real-life conversations with an AI partner.', 30],
        ['ai-tutor.html', '✨', 'AI English Tutor', 'Chat, get corrections and explanations.', 280],
        ['writing-checker.html', '📝', 'Writing Checker', 'Grammar, vocabulary and naturalness scores.', 200],
        ['vocabulary.html', '📚', 'Vocabulary Builder', 'Flashcards with spaced repetition.', 160],
        ['grammar.html', '✍️', 'Grammar Training', '7 key topics with instant feedback.', 320],
        ['listening.html', '🎧', 'Listening Practice', 'Real situations at 0.75x – 1.25x speed.', 195],
        ['live-classes.html', '🎥', 'Live Classes', 'Book 1-on-1 classes with teachers.', 350],
        ['level-test.html', '🎯', 'Level Test', 'Check your CEFR level in 10 minutes.', 45]
      ].map(([h, e, t, d, hue]) => `<a class="tool-card" href="${h}" style="--h:${hue}"><span class="tool-emoji" aria-hidden="true">${e}</span><strong>${t}</strong><span class="muted small">${d}</span></a>`).join('')}</div>`;
    const c = $('#claim');
    c.addEventListener('click', () => {
      if (s.challenge.claimed) return;
      s.challenge.claimed = true; s.stats.challenges++; App.save();
      App.addXP(100, 'Daily challenge completed');
      App.notify('🏆', 'Daily challenge completed! +100 XP');
      openModal({ title: 'Challenge complete! 🏆', body: '<div class="center-block"><div class="big-emoji">🎉</div><p class="lead">You earned <strong>+100 XP</strong>.</p><p class="vi-hint">Tuyệt vời! Hẹn gặp lại bạn ở thử thách ngày mai.</p></div>', actions: [{ label: 'Awesome', cls: 'btn-primary' }] });
      render();
    });
  };
  render();
};
