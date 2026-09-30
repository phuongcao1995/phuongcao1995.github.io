/* EnglishUp — AI English Tutor and AI Writing Checker (rule-based mock AI) */
'use strict';

/* Find grammar issues as character ranges in raw text */
function findIssues(text) {
  const out = [];
  DATA.grammarRules.forEach(r => {
    const re = new RegExp(r.re.source, r.re.flags.includes('g') ? r.re.flags : r.re.flags + 'g');
    let m;
    while ((m = re.exec(text))) {
      if (!m[0].length) { re.lastIndex++; continue; }
      const single = new RegExp(r.re.source, r.re.flags.replace('g', ''));
      let rep = m[0].replace(single, r.fix), str = m[0], start = m.index;
      const lead = str.match(/^\s*/)[0].length; // drop leading whitespace/punctuation captured by the rule
      const pre = str.match(/^([.!?]?\s*)/)[0].length;
      const cut = Math.max(lead, pre);
      if (cut && rep.startsWith(str.slice(0, cut))) { rep = rep.slice(cut); str = str.slice(cut); start += cut; }
      if (str !== rep) out.push({ start, end: start + str.length, wrong: str, right: rep, en: r.en, vi: r.vi });
    }
  });
  out.sort((a, b) => a.start - b.start || b.end - a.end);
  const clean = []; let last = -1;
  out.forEach(i => { if (i.start >= last) { clean.push(i); last = i.end; } });
  return clean;
}
function applyIssues(text, issues) {
  let t = text;
  issues.slice().sort((a, b) => b.start - a.start).forEach(i => { t = t.slice(0, i.start) + i.right + t.slice(i.end); });
  return t;
}
/* Replace phrases from a dictionary (whole words, case-preserving first letter) */
function replacePhrases(text, dict) {
  const changes = [];
  let t = text;
  Object.keys(dict).sort((a, b) => b.length - a.length).forEach(k => {
    const re = new RegExp(`(^|[^A-Za-z'])(${k.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?=$|[^A-Za-z'])`, k === k.toLowerCase() ? 'gi' : 'g');
    t = t.replace(re, (m, p, w) => {
      let rep = dict[k].trim();
      if (/^[A-Z]/.test(w) && /^[a-z]/.test(rep)) rep = rep[0].toUpperCase() + rep.slice(1);
      changes.push({ from: w, to: rep });
      return p + rep;
    });
  });
  return { text: t, changes };
}
/* Known English → Vietnamese sentence pairs from all demo content */
function knownPairs() {
  if (knownPairs.cache) return knownPairs.cache;
  const map = new Map(), add = (en, vi) => { if (en && vi) map.set(en.trim().toLowerCase().replace(/[.!?]+$/, ''), vi); };
  DATA.vocab.forEach(w => add(w.example, w.exVi));
  DATA.grammar.forEach(g => { add(g.example, g.exampleVi); g.examples.forEach(([e, v]) => add(e, v)); });
  DATA.lessons.forEach(l => (l.examples || []).forEach(([e, v]) => add(e, v)));
  DATA.scenarios.forEach(s => s.turns.forEach(t => add(t.ai, t.vi)));
  WRITING_SAMPLES.forEach(s => s.pairs.forEach(([e, v]) => add(e, v)));
  Object.entries(TUTOR_PAIRS).forEach(([e, v]) => add(e, v));
  return (knownPairs.cache = map);
}
const TUTOR_PAIRS = {
  'I really like this movie': 'Tôi thực sự thích bộ phim này.',
  'I have been working here for three years': 'Tôi đã làm việc ở đây được ba năm.',
  'She goes to work every day': 'Cô ấy đi làm mỗi ngày.',
  'I want to improve my English': 'Tôi muốn cải thiện tiếng Anh của mình.',
  'Could you explain it to me': 'Bạn có thể giải thích cho tôi được không?'
};
const WRITING_SAMPLES = [
  { label: 'Email to manager', text: 'Hi John, i want to discuss about the project deadline. My team need more time because we have a lot of informations to check. I am agree that the report is very important. Can we meet in the weekend? Thank you very much.',
    pairs: [['Hi John, I want to discuss the project deadline', 'Chào anh John, em muốn trao đổi về hạn chót của dự án.'], ['My team needs more time because we have a lot of information to check', 'Nhóm em cần thêm thời gian vì chúng em có nhiều thông tin cần kiểm tra.'], ['I agree that the report is crucial', 'Em đồng ý rằng báo cáo này rất quan trọng.'], ['Can we meet on the weekend', 'Chúng ta có thể gặp nhau vào cuối tuần không?'], ['Thank you very much', 'Cảm ơn anh rất nhiều.']] },
  { label: 'About my weekend', text: 'Last weekend i didn\'t went out. I stayed home and listen music. It was very good but i am boring now. My friend have a new car and he want to drive to Da Lat.',
    pairs: [['Last weekend I didn\'t go out', 'Cuối tuần trước tôi không ra ngoài.'], ['I stayed home and listened to music', 'Tôi ở nhà và nghe nhạc.'], ['It was excellent but I\'m bored now', 'Rất tuyệt nhưng bây giờ tôi thấy chán.'], ['My friend has a new car and he wants to drive to Da Lat', 'Bạn tôi có xe mới và anh ấy muốn lái xe đi Đà Lạt.']] },
  { label: 'IELTS opinion', text: 'In my opinion, I think technology is very important for students. It help them to find informations quickly. However, people is spending too much time on phones, so it is a very big problem.',
    pairs: [['I think technology is crucial for students', 'Tôi nghĩ công nghệ rất quan trọng đối với học sinh, sinh viên.'], ['It helps them to find information quickly', 'Nó giúp họ tìm kiếm thông tin nhanh chóng.'], ['However, people are spending too much time on phones, so it\'s a huge problem', 'Tuy nhiên, mọi người đang dành quá nhiều thời gian cho điện thoại, vì vậy đó là một vấn đề lớn.']] }
];

/* ---------------- AI Tutor ---------------- */
Pages['ai-tutor'] = () => {
  const root = $('#tutor-app');
  let mode = 'chat', interviewIdx = 0, busy = false;
  const ACTIONS = [
    { id: 'speaking', label: 'Practice speaking', emoji: '🗣' },
    { id: 'grammar', label: 'Correct my grammar', emoji: '✍️' },
    { id: 'vocab', label: 'Improve my vocabulary', emoji: '📚' },
    { id: 'interview', label: 'Practice interview', emoji: '💼' },
    { id: 'conversation', label: 'Practice conversation', emoji: '💬' },
    { id: 'explain', label: 'Explain this sentence', emoji: '🔍' }
  ];
  const INTERVIEW = ['Can you tell me a little about yourself?', 'Why do you want to work for our company?', 'What is your biggest strength?', 'Tell me about a challenge you faced at work and how you solved it.', 'Where do you see yourself in five years?', 'Do you have any questions for us?'];
  const TOPICS = [
    { k: /\b(work|job|office|company|boss|colleague)/i, q: 'That sounds interesting! What do you enjoy most about your job?', vi: 'Nghe thú vị đấy! Bạn thích điều gì nhất ở công việc của mình?' },
    { k: /\b(movie|film|series|netflix)/i, q: 'Nice! What kind of movies do you usually watch?', vi: 'Hay quá! Bạn thường xem thể loại phim nào?' },
    { k: /\b(travel|trip|holiday|vacation|beach|da lat|hoi an|da nang)/i, q: 'Lovely! Where would you like to travel next, and why?', vi: 'Tuyệt! Bạn muốn đi du lịch ở đâu tiếp theo, và tại sao?' },
    { k: /\b(food|eat|pho|coffee|cook|restaurant)/i, q: 'Yum! What is your favourite Vietnamese dish to recommend to foreigners?', vi: 'Ngon quá! Món Việt nào bạn muốn giới thiệu cho người nước ngoài?' },
    { k: /\b(weekend|saturday|sunday)/i, q: 'What did you do last weekend? Try to use the past simple.', vi: 'Cuối tuần trước bạn làm gì? Hãy dùng thì quá khứ đơn.' },
    { k: /\b(study|learn|english|school|university|ielts)/i, q: 'Great goal! How many minutes a day do you practise English?', vi: 'Mục tiêu tuyệt vời! Mỗi ngày bạn luyện tiếng Anh bao nhiêu phút?' },
    { k: /\b(family|mother|father|brother|sister|kids)/i, q: 'Tell me more about your family. Who are you closest to?', vi: 'Kể thêm về gia đình bạn nhé. Bạn thân với ai nhất?' }
  ];
  const INTRO = {
    chat: ['Hi! I\'m your English tutor. What would you like to practice today?', 'Chào bạn! Mình là gia sư tiếng Anh của bạn. Hôm nay bạn muốn luyện gì?'],
    speaking: ['Let\'s practise speaking! Tell me about your day in 2–3 sentences. You can tap 🎙 to speak.', 'Hãy kể về một ngày của bạn bằng 2–3 câu.'],
    grammar: ['Send me any sentence and I\'ll correct it. Try: “I very like this movie.”', 'Gửi câu bất kỳ, mình sẽ sửa lỗi ngữ pháp cho bạn.'],
    vocab: ['Send me a sentence or a word and I\'ll suggest stronger vocabulary. Try: “The meeting was very good.”', 'Mình sẽ gợi ý từ vựng hay hơn cho câu của bạn.'],
    interview: ['Let\'s do a mock interview. I\'m the interviewer. First question: ' + INTERVIEW[0], 'Phỏng vấn thử. Hãy trả lời như đang phỏng vấn thật.'],
    conversation: ['Let\'s chat! What do you usually do after work or school?', 'Cùng trò chuyện nhé! Bạn thường làm gì sau giờ làm hoặc giờ học?'],
    explain: ['Paste an English sentence and I\'ll explain its grammar and meaning in Vietnamese.', 'Dán một câu tiếng Anh, mình sẽ giải thích cấu trúc và nghĩa.']
  };

  root.innerHTML = `
    <div class="tutor-layout">
      <section class="chat-panel card" aria-label="AI tutor chat">
        <div class="chat-head"><span class="ai-avatar" aria-hidden="true">✨</span><div class="grow"><strong>EnglishUp AI Tutor</strong><span class="muted small"><span class="online-dot"></span> Online · replies instantly</span></div>
          <span class="badge badge-soft" id="mode-badge">Free chat</span><button class="icon-btn" id="clear-chat" aria-label="New chat" title="New chat">${icon('plus')}</button></div>
        <div class="quick-actions" id="quick-actions">${ACTIONS.map(a => `<button class="chip" data-mode="${a.id}"><span aria-hidden="true">${a.emoji}</span> ${a.label}</button>`).join('')}</div>
        <div class="chat-log" id="tutor-log" aria-live="polite"></div>
        <form class="chat-input" id="tutor-form" autocomplete="off">
          <button type="button" class="mic-btn" id="tutor-mic" aria-label="Speak (simulated)">${icon('mic', 22)}</button>
          <label class="sr-only" for="tutor-input">Message</label>
          <input id="tutor-input" class="input" placeholder="Write a message in English…">
          <button class="btn btn-primary" aria-label="Send">${icon('send', 18)}</button>
        </form>
      </section>
      <aside class="tutor-side">
        <section class="card"><h2 class="h-sm">Try these</h2><ul class="try-list" id="try-list">${['I very like this movie.', 'She go to work every day.', 'I have went to Da Nang last year.', 'The presentation was very good.', 'I have been working here for three years.', 'Can you explain me this word?'].map(x => `<li><button class="link-btn" data-try="${esc(x)}">“${esc(x)}”</button></li>`).join('')}</ul></section>
        <section class="card"><h2 class="h-sm">How it works</h2><p class="small muted">Every message gets an English reply, a grammar check, a better sentence and a Vietnamese explanation.</p><p class="small vi-hint">Mỗi tin nhắn đều được kiểm tra ngữ pháp và giải thích bằng tiếng Việt.</p><div class="kpi-grid" id="tutor-stats"></div></section>
      </aside>
    </div>`;

  const s = App.state; s.tutor = s.tutor || { messages: 0, fixes: 0 };
  const stats = () => { $('#tutor-stats').innerHTML = `<div class="kpi"><strong>${s.tutor.messages}</strong><span>Messages</span></div><div class="kpi"><strong>${s.tutor.fixes}</strong><span>Corrections</span></div>`; };
  const log = $('#tutor-log');
  const add = (who, html) => { const el = document.createElement('div'); el.className = `msg msg-${who}`; el.innerHTML = who === 'ai' ? `<span class="ai-avatar sm" aria-hidden="true">✨</span><div class="bubble">${html}</div>` : `<div class="bubble">${html}</div>`; log.appendChild(el); log.scrollTop = log.scrollHeight; return el; };
  const aiSay = (en, vi, extra = '') => {
    const el = add('ai', `<p>${esc(en)} <button class="icon-btn sm say-btn" aria-label="Listen">${icon('volume', 16)}</button></p>${vi ? `<p class="vi-hint small">${esc(vi)}</p>` : ''}${extra}`);
    $('.say-btn', el).addEventListener('click', () => speak(en));
  };
  const setMode = m => {
    mode = m; interviewIdx = 0;
    $$('#quick-actions .chip').forEach(c => c.classList.toggle('active', c.dataset.mode === m));
    $('#mode-badge').textContent = m === 'chat' ? 'Free chat' : ACTIONS.find(a => a.id === m).label;
    aiSay(...INTRO[m]);
    $('#tutor-input').focus();
  };

  const correctionBlock = (text, issues, fixed) => `<div class="fb-card">
      <p class="fb-line bad">❌ “${esc(text)}”</p><p class="fb-line good"><strong>Better:</strong> ✅ “${esc(fixed)}”</p>
      <p class="small"><strong>Explanation:</strong> ${issues.map(i => esc(i.en)).join(' ')}</p>
      <p class="small vi-hint">${issues.map(i => esc(i.vi)).join(' ')}</p></div>`;

  const detectTense = t => {
    const l = t.toLowerCase();
    if (/\b(have|has) been \w+ing\b/.test(l)) return ['Present perfect continuous', 'S + have/has been + V-ing', 'Diễn tả hành động bắt đầu trong quá khứ, kéo dài đến hiện tại và nhấn mạnh quá trình.'];
    if (/\b(have|has|'ve|'s) (\w+ed|been|gone|done|seen|made|had|taken|written|known)\b/.test(l)) return ['Present perfect', 'S + have/has + V3', 'Hành động đã xảy ra và còn liên quan đến hiện tại.'];
    if (/\b(was|were) \w+ing\b/.test(l)) return ['Past continuous', 'S + was/were + V-ing', 'Hành động đang diễn ra tại một thời điểm trong quá khứ.'];
    if (/\b(will|'ll)\b/.test(l)) return ['Future simple', 'S + will + V', 'Dự đoán, quyết định tức thời hoặc lời hứa trong tương lai.'];
    if (/\bif\b/.test(l) && /\bwould\b/.test(l)) return ['Second conditional', 'If + S + V2, S + would + V', 'Điều kiện không có thật ở hiện tại.'];
    if (/\b(am|is|are|'m|'re) \w+ing\b/.test(l)) return ['Present continuous', 'S + am/is/are + V-ing', 'Hành động đang diễn ra ngay lúc nói hoặc kế hoạch gần.'];
    if (/\b(is|are|was|were) \w+ed\b/.test(l) || /\b(is|are|was|were) (made|built|written|done|given)\b/.test(l)) return ['Passive voice', 'S + be + V3', 'Câu bị động: nhấn mạnh đối tượng chịu tác động.'];
    if (/\b(yesterday|last|ago)\b/.test(l) || /\b\w+ed\b/.test(l)) return ['Past simple', 'S + V2/V-ed', 'Hành động đã kết thúc trong quá khứ.'];
    if (/\b(can|could|should|must|might|may)\b/.test(l)) return ['Modal verb', 'S + modal + V (base form)', 'Động từ khuyết thiếu diễn tả khả năng, lời khuyên, sự bắt buộc.'];
    return ['Present simple', 'S + V(s/es)', 'Thói quen, sự thật hiển nhiên hoặc trạng thái hiện tại.'];
  };
  const translate = t => knownPairs().get(t.trim().toLowerCase().replace(/[.!?]+$/, ''));

  const respond = text => {
    const { fixed, issues } = checkGrammar(text);
    const words = text.split(/\s+/).length;
    s.tutor.messages++; if (issues.length) s.tutor.fixes += issues.length; App.save(); stats();
    const corr = issues.length ? correctionBlock(text, issues, fixed) : '';
    const clean = issues.length ? fixed : text;

    if (/^(hi|hello|hey|chào|xin chào)\b/i.test(text) && words <= 3) return aiSay('Hello! Nice to meet you. Choose a quick action above, or just tell me about your day.', 'Xin chào! Hãy chọn một chức năng ở trên hoặc kể về ngày của bạn.');
    if (/^(thanks|thank you|cảm ơn)/i.test(text)) return aiSay('You\'re welcome! Keep practising a little every day. 💪', 'Không có gì! Hãy luyện tập mỗi ngày nhé.');

    if (mode === 'explain') {
      const [name, form, vi] = detectTense(clean);
      const tr = translate(clean);
      return aiSay(`Here is how this sentence works.`, '', `${corr}<div class="explain-card"><p><strong>Sentence:</strong> “${esc(clean)}”</p><p><strong>Grammar:</strong> ${name} — <code>${form}</code></p><p class="vi-hint"><strong>Giải thích:</strong> ${vi}</p><p><strong>Meaning:</strong> ${tr ? esc(tr) : '<span class="muted">Bản dịch đầy đủ chỉ hỗ trợ các câu mẫu trong bản demo — hãy thử “I have been working here for three years.”</span>'}</p></div>`);
    }
    if (mode === 'vocab' || (mode === 'chat' && /\bvery (good|bad|big|small|important|tired|happy|difficult|interesting)\b/i.test(text))) {
      const single = text.trim().toLowerCase().replace(/[^a-z\s-]/g, '');
      const w = DATA.vocab.find(v => v.word === single);
      if (w) return aiSay(`“${w.word}” ${w.ipa} (${w.pos}) means “${w.vi}”. Example: ${w.example}`, w.exVi, `<p class="small"><a href="vocabulary.html?word=${w.id}">Open in Vocabulary Builder →</a></p>`);
      const { text: up, changes } = replacePhrases(clean, DATA.betterWords);
      if (changes.length) return aiSay('Nice sentence! Here is a more expressive version:', 'Đây là phiên bản dùng từ vựng phong phú hơn:', `${corr}<div class="fb-card soft"><p class="fb-line good">✨ “${esc(up)}”</p><ul class="small">${changes.map(c => `<li><s>${esc(c.from)}</s> → <strong>${esc(c.to)}</strong></li>`).join('')}</ul></div>`);
      return aiSay('Your vocabulary looks good here! Try adding a linking word like “however”, “as a result” or “in addition” to sound more advanced.', 'Thử thêm từ nối như “however”, “as a result” để câu văn tự nhiên hơn.', corr);
    }
    if (mode === 'interview') {
      interviewIdx++;
      const tip = words < 12 ? ['Good start, but your answer is a bit short. Interviewers like specific examples.', 'Câu trả lời hơi ngắn. Hãy thêm ví dụ cụ thể (phương pháp STAR).'] : ['Great answer — clear and well-structured!', 'Câu trả lời rõ ràng và có cấu trúc tốt!'];
      if (interviewIdx >= INTERVIEW.length) { App.addXP(25, 'Mock interview completed'); return aiSay(`${tip[0]} That's the end of our mock interview. Well done! 🎉`, tip[1] + ' Bạn đã hoàn thành buổi phỏng vấn thử!', corr); }
      return aiSay(`${tip[0]} Next question: ${INTERVIEW[interviewIdx]}`, tip[1], corr);
    }
    if (mode === 'grammar') {
      if (!issues.length) return aiSay('Perfect! I couldn\'t find any grammar mistakes. ✅', 'Câu của bạn đúng ngữ pháp!', `<div class="fb-card soft"><p class="fb-line good">✅ “${esc(clean)}”</p></div>`);
      return aiSay('I found something to fix:', '', corr);
    }
    // speaking / conversation / chat
    const topic = TOPICS.find(t => t.k.test(text));
    const follow = topic || { q: words < 5 ? 'Can you tell me more? Try to answer in a full sentence.' : 'That\'s great! Why do you think so?', vi: words < 5 ? 'Bạn kể thêm được không? Hãy trả lời bằng câu đầy đủ.' : 'Tuyệt! Tại sao bạn nghĩ vậy?' };
    const praise = issues.length ? 'Thanks for sharing! One small correction first.' : ['Nice sentence!', 'Well said!', 'Great English!'][rand(0, 2)];
    return aiSay(`${praise} ${follow.q}`, follow.vi, corr);
  };

  const send = async text => {
    if (busy || !text.trim()) return;
    busy = true; $('#tutor-input').value = '';
    add('user', esc(text));
    const t = add('ai', '<span class="typing"><i></i><i></i><i></i></span>');
    await sleep(600 + Math.min(text.length * 8, 700));
    t.remove(); respond(text.trim());
    if (s.tutor.messages % 5 === 0) App.addXP(10, 'Tutor practice');
    App.logMinutes(1); busy = false;
  };

  $('#tutor-form').addEventListener('submit', e => { e.preventDefault(); send($('#tutor-input').value); });
  $$('#quick-actions .chip').forEach(c => c.addEventListener('click', () => setMode(c.dataset.mode)));
  $$('[data-try]').forEach(b => b.addEventListener('click', () => { if (/^I have been|Can you explain/.test(b.dataset.try) && mode !== 'explain' && b.dataset.try.startsWith('I have been')) setMode('explain'); send(b.dataset.try); }));
  $('#clear-chat').addEventListener('click', () => { log.innerHTML = ''; setMode('chat'); });
  $('#tutor-mic').addEventListener('click', () => {
    const inp = $('#tutor-input'), btn = $('#tutor-mic');
    const sample = mode === 'interview' ? 'I am a software developer with three years of experience in web development.' : 'I very like learning English with my friends.';
    btn.classList.add('listening'); inp.placeholder = 'Listening… (simulated)';
    let i = 0; const ws = sample.split(' ');
    const iv = setInterval(() => { inp.value = ws.slice(0, ++i).join(' '); if (i >= ws.length) { clearInterval(iv); btn.classList.remove('listening'); inp.placeholder = 'Write a message in English…'; } }, 180);
  });
  stats();
  const q = params().get('mode'); setMode(ACTIONS.some(a => a.id === q) ? q : 'chat');
  const pre = params().get('q'); if (pre) send(pre);
};

/* ---------------- Writing Checker ---------------- */
Pages['writing-checker'] = () => {
  const root = $('#writing-app');
  let issues = [], lastAction = null;
  root.innerHTML = `
    <div class="writing-layout">
      <section class="card writing-editor">
        <div class="card-head"><h2>Your text</h2><div class="chip-row">${WRITING_SAMPLES.map((s, i) => `<button class="chip" data-sample="${i}">${esc(s.label)}</button>`).join('')}</div></div>
        <label class="sr-only" for="w-text">Write something in English</label>
        <textarea id="w-text" class="input writing-area" rows="10" placeholder="Write something in English..." maxlength="3000"></textarea>
        <div class="writing-foot"><span class="muted small" id="w-count">0 words</span><button class="link-btn" id="w-clear">Clear</button></div>
        <div class="btn-row writing-actions">
          <button class="btn btn-primary" data-act="grammar">${icon('check', 18)} Check Grammar</button>
          <button class="btn btn-secondary" data-act="improve">${icon('sparkles', 18)} Improve Writing</button>
          <button class="btn btn-secondary" data-act="natural">${icon('chat', 18)} Make It More Natural</button>
          <button class="btn btn-secondary" data-act="translate">${icon('translate', 18)} Translate to Vietnamese</button>
        </div>
      </section>
      <section class="card writing-result" id="w-result" aria-live="polite">${emptyState('📝', 'Your feedback will appear here', 'Write a few sentences (or pick a sample above) and click “Check Grammar”.', '<p class="vi-hint small">Viết vài câu tiếng Anh, AI sẽ chấm điểm và gợi ý sửa lỗi.</p>')}</section>
    </div>`;
  const ta = $('#w-text'), out = $('#w-result');
  const count = () => { const n = (ta.value.trim().match(/\S+/g) || []).length; $('#w-count').textContent = `${n} word${n === 1 ? '' : 's'} · ${ta.value.length}/3000`; };
  ta.addEventListener('input', count);
  $$('[data-sample]').forEach(b => b.addEventListener('click', () => { ta.value = WRITING_SAMPLES[+b.dataset.sample].text; count(); run('grammar'); }));
  $('#w-clear').addEventListener('click', () => { ta.value = ''; count(); ta.focus(); });

  const scores = (text, iss) => {
    const ws = text.toLowerCase().match(/[a-z']+/g) || [];
    const uniq = new Set(ws).size / Math.max(ws.length, 1);
    const basic = replacePhrases(text, DATA.betterWords).changes.length;
    const formal = replacePhrases(text, DATA.naturalWords).changes.length;
    const avgLen = ws.reduce((a, w) => a + w.length, 0) / Math.max(ws.length, 1);
    const grammar = clamp(Math.round(100 - iss.length * 60 / Math.max(ws.length / 6, 4)), 35, 99);
    const vocab = clamp(Math.round(60 + uniq * 25 + (avgLen - 4) * 6 - basic * 4), 40, 97);
    const natural = clamp(Math.round(92 - formal * 5 - iss.length * 2), 45, 98);
    return { grammar, vocab, natural };
  };
  const scoreRow = sc => `<div class="score-trio">${[['Grammar', sc.grammar], ['Vocabulary', sc.vocab], ['Naturalness', sc.natural]].map(([k, v]) => ring(v, { size: 96, stroke: 9, color: v >= 85 ? 'var(--success)' : v >= 70 ? 'var(--warning)' : 'var(--error)', label: v, sub: k })).join('')}</div>`;
  const highlighted = (text, iss) => {
    let h = '', p = 0;
    iss.forEach((i, n) => { h += esc(text.slice(p, i.start)) + `<mark class="err" title="${esc(i.right)}">${esc(i.wrong)}<sup>${n + 1}</sup></mark>`; p = i.end; });
    return h + esc(text.slice(p));
  };

  const run = act => {
    const text = ta.value.trim();
    if (text.split(/\s+/).length < 3) { toast('Please write at least one full sentence. Hãy viết ít nhất một câu hoàn chỉnh.', 'error'); ta.focus(); return; }
    lastAction = act;
    out.innerHTML = `<div class="center-block"><div class="spinner"></div><p class="muted">${{ grammar: 'Checking grammar…', improve: 'Improving your writing…', natural: 'Making it sound natural…', translate: 'Translating…' }[act]}</p></div>`;
    setTimeout(() => { try { render(act, text); } catch (e) { console.error(e); out.innerHTML = emptyState('⚠️', 'Something went wrong', 'Please try again.'); } }, 700);
  };

  const render = (act, text) => {
    issues = findIssues(text);
    const fixed = applyIssues(text, issues), sc = scores(text, issues);
    const s = App.state; s.stats.writing = (s.stats.writing || 0) + 1; App.save();
    if (act === 'grammar') {
      out.innerHTML = `<div class="card-head"><h2>Feedback</h2><span class="badge ${issues.length ? 'badge-warning' : 'badge-success'}">${issues.length ? `${issues.length} suggestion${issues.length > 1 ? 's' : ''}` : 'No errors'}</span></div>
        ${scoreRow(sc)}
        <div class="marked-text">${highlighted(text, issues)}</div>
        ${issues.length ? `<ol class="suggestion-list">${issues.map((i, n) => `<li><div class="grow"><p><s>${esc(i.wrong)}</s> → <strong class="text-success">${esc(i.right)}</strong></p><p class="small">${esc(i.en)}</p><p class="small vi-hint">${esc(i.vi)}</p></div><button class="btn btn-sm btn-secondary" data-apply="${n}">Apply</button></li>`).join('')}</ol>
          <div class="btn-row"><button class="btn btn-primary" id="apply-all">${icon('check', 16)} Apply all</button><button class="btn btn-ghost" id="copy-fixed">Copy corrected text</button></div>`
          : '<div class="tip-box ok">✓ Great job! No grammar mistakes found. <span class="vi-hint">Không phát hiện lỗi ngữ pháp.</span></div>'}`;
      $$('[data-apply]').forEach(b => b.addEventListener('click', () => { const i = issues[+b.dataset.apply]; ta.value = applyIssues(ta.value, findIssues(ta.value).filter(x => x.wrong === i.wrong && x.start === i.start).length ? [i] : []); count(); toast('Suggestion applied.', 'success'); run('grammar'); }));
      const aa = $('#apply-all'); if (aa) aa.addEventListener('click', () => { ta.value = applyIssues(ta.value, findIssues(ta.value)); count(); toast(`Applied ${issues.length} fixes.`, 'success'); App.addXP(10, 'Writing corrected'); run('grammar'); });
      const cf = $('#copy-fixed'); if (cf) cf.addEventListener('click', () => copy(fixed));
    } else if (act === 'improve' || act === 'natural') {
      const dict = act === 'improve' ? DATA.betterWords : DATA.naturalWords;
      const { text: res, changes } = replacePhrases(fixed, dict);
      const sc2 = scores(res, []);
      out.innerHTML = `<div class="card-head"><h2>${act === 'improve' ? 'Improved version' : 'More natural version'}</h2><span class="badge badge-soft">${changes.length + issues.length} change${changes.length + issues.length === 1 ? '' : 's'}</span></div>
        ${scoreRow(sc2)}
        <div class="marked-text better">${esc(res)}</div>
        ${changes.length || issues.length ? `<ul class="suggestion-list">${issues.map(i => `<li><p><s>${esc(i.wrong)}</s> → <strong>${esc(i.right)}</strong> <span class="badge badge-soft">grammar</span></p></li>`).join('')}${changes.map(c => `<li><p><s>${esc(c.from)}</s> → <strong>${esc(c.to)}</strong> <span class="badge badge-soft">${act === 'improve' ? 'vocabulary' : 'natural'}</span></p></li>`).join('')}</ul>`
          : `<p class="muted">Your text already sounds ${act === 'improve' ? 'strong' : 'natural'}. Try adding linking words such as “however” or “as a result”.</p>`}
        <p class="small vi-hint">${act === 'improve' ? 'Thay các từ đơn giản bằng từ vựng mạnh hơn giúp bài viết ấn tượng hơn (ví dụ IELTS).' : 'Người bản xứ thường dùng dạng rút gọn (I\'m, don\'t) và từ đơn giản trong giao tiếp hằng ngày.'}</p>
        <div class="btn-row"><button class="btn btn-primary" id="use-ver">Use this version</button><button class="btn btn-ghost" id="copy-ver">Copy</button></div>`;
      $('#use-ver').addEventListener('click', () => { ta.value = res; count(); toast('Text updated.', 'success'); App.addXP(10, 'Writing improved'); });
      $('#copy-ver').addEventListener('click', () => copy(res));
    } else {
      const sentences = fixed.match(/[^.!?]+[.!?]*/g) || [fixed];
      const bank = knownPairs();
      const natural = replacePhrases(fixed, DATA.betterWords).text;
      const natSent = natural.match(/[^.!?]+[.!?]*/g) || [];
      const sampleHit = WRITING_SAMPLES.find(x => x.text.trim() === text.trim() || applyIssues(x.text, findIssues(x.text)).trim() === fixed.trim());
      const rows = sampleHit ? sampleHit.pairs.map(([en, vi]) => ({ en, vi })) : sentences.map((en, i) => {
        const k = en.trim().toLowerCase().replace(/[.!?]+$/, '');
        const k2 = (natSent[i] || '').trim().toLowerCase().replace(/[.!?]+$/, '');
        const vi = bank.get(k) || bank.get(k2) || bank.get(replacePhrases(k, DATA.naturalWords).text.toLowerCase());
        return { en: en.trim(), vi };
      });
      const missing = rows.filter(r => !r.vi).length;
      out.innerHTML = `<div class="card-head"><h2>🇻🇳 Vietnamese translation</h2></div>
        <ul class="translate-list">${rows.map(r => `<li><p class="small muted">${esc(r.en)}</p><p>${r.vi ? esc(r.vi) : '<span class="muted">— Bản dịch tự động chỉ hỗ trợ câu mẫu trong bản demo.</span>'}</p></li>`).join('')}</ul>
        ${missing ? '<p class="small muted">Tip: pick one of the samples above to see a full translation in this demo.</p>' : ''}
        ${issues.length ? `<p class="small">Translated from the corrected text (${issues.length} grammar fix${issues.length > 1 ? 'es' : ''}).</p>` : ''}`;
    }
  };
  const copy = t => { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Copied to clipboard.', 'success')).catch(() => toast('Copy not available in this browser.', 'error')); };
  $$('[data-act]', root).forEach(b => b.addEventListener('click', () => run(b.dataset.act)));
  count();
};
