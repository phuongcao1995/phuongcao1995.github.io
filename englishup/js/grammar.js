/* EnglishUp — grammar lessons with instant-feedback practice */
'use strict';

Pages.grammar = () => {
  const s = App.state, G = DATA.grammar;
  s.grammarBest = s.grammarBest || {};
  let topic = G.find(g => g.id === params().get('topic')) || G[0];
  let qi = 0, correct = 0, answered = false, mode = 'lesson';
  const root = $('#grammar-app');
  const L = ['A', 'B', 'C', 'D'];

  root.innerHTML = `
    <div class="chip-row topic-tabs" id="grammar-topics" role="tablist" aria-label="Grammar topics"></div>
    <div class="grammar-layout">
      <section class="card" id="grammar-lesson"></section>
      <section class="card" id="grammar-practice" aria-live="polite"></section>
    </div>`;

  const renderTopics = () => {
    $('#grammar-topics').innerHTML = G.map(g => {
      const best = s.grammarBest[g.id];
      return `<button class="topic-tab ${g.id === topic.id ? 'active' : ''}" role="tab" aria-selected="${g.id === topic.id}" data-id="${g.id}">
        <span aria-hidden="true">${g.emoji}</span> ${g.name}${best !== undefined ? ` <span class="badge ${best === g.questions.length ? 'badge-success' : 'badge-soft'}">${best}/${g.questions.length}</span>` : ''}</button>`;
    }).join('');
    $$('.topic-tab').forEach(b => b.addEventListener('click', () => { topic = G.find(g => g.id === b.dataset.id); history.replaceState(null, '', `?topic=${topic.id}`); qi = 0; correct = 0; answered = false; renderAll(); }));
  };

  const renderLesson = () => {
    const g = topic;
    $('#grammar-lesson').innerHTML = `
      <span class="muted small">${g.emoji} ${g.name}</span>
      <h2 class="lesson-title">${esc(g.title)}</h2>
      <div class="formula"><span class="muted small">Structure</span><code>${esc(g.formula)}</code></div>
      <div class="example-hero">
        <p class="ex-en">“${esc(g.example)}” <button class="icon-btn sm" data-say="${esc(g.example)}" aria-label="Listen to example">${icon('volume', 16)}</button></p>
        <p class="vi-hint">${esc(g.exampleVi)}</p>
      </div>
      <p>${esc(g.en)}</p>
      <div class="vi-box"><span class="vi-flag" aria-hidden="true">🇻🇳</span><p>${esc(g.vi)}</p></div>
      <div class="tip-box"><strong>${icon('sparkles', 16)} Tip</strong><p>${esc(g.tip)}</p></div>
      <h3 class="h-sm">More examples</h3>
      <ul class="example-list">${g.examples.map(([en, vi]) => `<li><button class="icon-btn sm" data-say="${esc(en)}" aria-label="Listen">${icon('volume', 16)}</button><div><strong>${esc(en)}</strong><span class="vi-hint">${esc(vi)}</span></div></li>`).join('')}</ul>`;
    $$('#grammar-lesson [data-say]').forEach(b => b.addEventListener('click', () => speak(b.dataset.say)));
  };

  const renderQ = () => {
    const box = $('#grammar-practice'), qs = topic.questions;
    if (qi >= qs.length) return renderDone();
    const q = qs[qi];
    box.innerHTML = `
      <div class="card-head"><h2>Practice</h2><span class="muted small">Question ${qi + 1} of ${qs.length}</span></div>
      ${progressBar(qi / qs.length * 100)}
      <p class="q-text">${esc(q.q).replace(/_{2,}/, '<span class="blank">____</span>')}</p>
      <div class="options" role="group" aria-label="Answer options">${q.options.map((o, i) => `<button class="option" data-i="${i}"><span class="opt-key">${L[i]}</span>${esc(o)}</button>`).join('')}</div>
      <div id="g-fb"></div>
      <div class="btn-row end"><button class="btn btn-primary" id="g-next" hidden>${qi + 1 === qs.length ? 'See result' : 'Next question'}</button></div>`;
    answered = false;
    $$('#grammar-practice .option').forEach(b => b.addEventListener('click', () => answer(+b.dataset.i)));
    $('#g-next').addEventListener('click', () => { qi++; renderQ(); });
  };

  const answer = i => {
    if (answered) return; answered = true;
    const q = topic.questions[qi], ok = i === q.answer;
    if (ok) correct++;
    $$('#grammar-practice .option').forEach((b, j) => { b.disabled = true; if (j === q.answer) b.classList.add('correct'); else if (j === i) b.classList.add('wrong'); });
    $('#g-fb').innerHTML = `<div class="fb ${ok ? 'fb-ok' : 'fb-bad'}"><strong>${ok ? '✓ Correct!' : `✕ Not quite. The answer is ${L[q.answer]}: “${esc(q.options[q.answer])}”`}</strong><p class="vi-hint">${esc(q.vi)}</p></div>`;
    const nb = $('#g-next'); nb.hidden = false; nb.focus();
    if (ok) App.addXP(5, 'Correct answer');
  };

  const renderDone = () => {
    const n = topic.questions.length, pct = Math.round(correct / n * 100);
    const prev = s.grammarBest[topic.id];
    s.grammarBest[topic.id] = Math.max(prev ?? 0, correct);
    s.stats.grammar++;
    if (pct >= 80) s.skills.Grammar = Math.min(100, s.skills.Grammar + 1);
    App.markToday('grammar'); App.logMinutes(4); App.save();
    App.addXP(20, 'Grammar practice');
    const next = G[(G.indexOf(topic) + 1) % G.length];
    $('#grammar-practice').innerHTML = `<div class="center-block">
      ${ring(pct, { size: 128, color: pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--error)', label: `${correct}/${n}`, sub: 'correct' })}
      <h2>${pct >= 80 ? 'Excellent work! 🎉' : pct >= 50 ? 'Good job! Keep going 💪' : 'Let’s review this topic 📖'}</h2>
      <p class="vi-hint">${pct >= 80 ? 'Bạn đã nắm vững chủ điểm này.' : 'Đọc lại phần giải thích bên cạnh rồi làm lại nhé.'}</p>
      <div class="btn-row center"><button class="btn btn-secondary" id="g-retry">${icon('replay', 16)} Try again</button><button class="btn btn-primary" id="g-nextt">Next: ${next.name}</button></div></div>`;
    $('#g-retry').addEventListener('click', () => { qi = 0; correct = 0; renderQ(); });
    $('#g-nextt').addEventListener('click', () => { topic = next; history.replaceState(null, '', `?topic=${topic.id}`); qi = 0; correct = 0; renderAll(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    renderTopics();
  };

  const renderAll = () => { renderTopics(); renderLesson(); renderQ(); };
  renderAll();
};
