/* EnglishUp — live classes marketplace and teacher profiles (booking is simulated) */
'use strict';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = d => `${DAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

const Classes = {
  teacher: id => DATA.teachers.find(t => t.id === id),
  isBooked: (tid, dk, time) => App.state.bookings.some(b => b.teacher === tid && b.date === dk && b.time === time),
  /* Free slots for a teacher on a given date (skips past times today) */
  slotsFor(t, d) {
    const now = new Date(), today = dateKey(now) === dateKey(d);
    return (t.slots[d.getDay()] || []).filter(time => {
      if (Classes.isBooked(t.id, dateKey(d), time)) return false;
      if (today && +time.slice(0, 2) <= now.getHours()) return false;
      return true;
    });
  },
  nextSlot(t) {
    for (let i = 0; i < 14; i++) { const d = addDays(new Date(), i), sl = Classes.slotsFor(t, d); if (sl.length) return { d, time: sl[0], i }; }
    return null;
  },
  avatar: (t, cls = '') => `<span class="avatar teacher-avatar ${cls}" style="--h:${t.hue}" aria-hidden="true">${initials(t.name)}</span>`,

  book(t, pre = {}, onDone) {
    const days = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i + (pre.offset || 0)));
    let sel = { date: pre.date || null, time: pre.time || null };
    const body = `
      <div class="book-teacher">${Classes.avatar(t)}<div><strong>${esc(t.name)}</strong> ${t.flag}<span class="muted small">${esc(t.spec)} · ${fmtVND(t.price)} / 50 min</span></div></div>
      <h3 class="h-sm">Choose a time</h3>
      <div class="day-slots" id="bk-slots">${days.map(d => {
        const sl = Classes.slotsFor(t, d);
        return `<div class="day-slot-col"><span class="dsc-day">${fmtDay(d)}</span>${sl.length ? sl.map(time => `<button class="slot ${sel.date === dateKey(d) && sel.time === time ? 'active' : ''}" data-d="${dateKey(d)}" data-t="${time}">${time}</button>`).join('') : '<span class="muted small">—</span>'}</div>`;
      }).join('')}</div>
      <div class="field"><label for="bk-topic">Class topic</label><select id="bk-topic" class="input">${t.topics.map(x => `<option>${x}</option>`).join('')}<option>Free conversation</option></select></div>
      <div class="field"><label for="bk-note">Note for the teacher <span class="muted">(optional)</span></label><textarea id="bk-note" class="input" rows="2" placeholder="e.g. I want to practise for a job interview next week."></textarea></div>
      <p class="muted small vi-hint">Bạn có thể hủy miễn phí trước giờ học 12 tiếng.</p>`;
    openModal({
      title: 'Book a class', body, size: 'modal-lg',
      actions: [{ label: 'Cancel' }, {
        label: `Confirm booking · ${fmtVND(t.price)}`, cls: 'btn-primary', onClick: (close, el) => {
          if (!sel.date) { toast('Please choose a time slot. Vui lòng chọn giờ học.', 'error'); return false; }
          const b = { id: 'b' + Date.now(), teacher: t.id, date: sel.date, time: sel.time, topic: $('#bk-topic', el).value, note: $('#bk-note', el).value.trim() };
          App.state.bookings.push(b); App.state.stats.classes++; App.save();
          const d = new Date(sel.date + 'T00:00');
          App.notify('📅', `Class booked with ${t.name} on ${fmtDay(d)} at ${sel.time}.`);
          toast(`Booked! ${esc(t.name)} · ${fmtDay(d)} ${sel.time}`, 'success', 4000);
          App.addXP(10, 'Class booked');
          if (onDone) onDone(b);
        }
      }],
      onOpen(el) {
        $$('.slot', el).forEach(btn => btn.addEventListener('click', () => {
          $$('.slot', el).forEach(x => x.classList.remove('active')); btn.classList.add('active');
          sel = { date: btn.dataset.d, time: btn.dataset.t };
        }));
      }
    });
  },

  bookingsHTML() {
    const list = App.state.bookings.filter(b => b.date >= dateKey()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (!list.length) return emptyState('📅', 'No upcoming classes', 'Book a 50-minute class with a teacher below. Your first class is the best way to break the fear of speaking!');
    return `<ul class="booking-list">${list.map(b => {
      const t = Classes.teacher(b.teacher), d = new Date(b.date + 'T00:00');
      return `<li class="booking">${Classes.avatar(t, 'avatar-sm')}<div class="grow"><strong>${esc(t.name)}</strong><span class="muted small">${fmtDay(d)} · ${b.time} · ${esc(b.topic)}</span></div>
        <button class="btn btn-sm btn-primary" data-join="${b.id}">${icon('video', 14)} Join</button><button class="btn btn-sm btn-ghost" data-cancel="${b.id}">Cancel</button></li>`;
    }).join('')}</ul>`;
  },
  bindBookings(el, rerender) {
    $$('[data-join]', el).forEach(b => b.addEventListener('click', () => {
      const bk = App.state.bookings.find(x => x.id === b.dataset.join), t = Classes.teacher(bk.teacher);
      openModal({ title: 'Classroom', body: `<div class="center-block"><div class="class-room">${Classes.avatar(t, 'avatar-xl')}<span class="live-dot">Waiting room</span></div><p class="lead">Your class with <strong>${esc(t.name)}</strong> starts on ${fmtDay(new Date(bk.date + 'T00:00'))} at ${bk.time}.</p><p class="muted">The classroom opens 10 minutes before the start time. Check your camera and microphone before joining.</p><p class="vi-hint">Phòng học mở trước 10 phút. Hãy kiểm tra camera và micro.</p></div>`,
        actions: [{ label: 'Test my microphone', cls: 'btn-secondary', onClick: () => { toast('Microphone check passed ✓ (simulated)', 'success'); return false; } }, { label: 'OK', cls: 'btn-primary' }] });
    }));
    $$('[data-cancel]', el).forEach(b => b.addEventListener('click', () => {
      openModal({ title: 'Cancel this class?', body: '<p>You will get a full refund because you are cancelling more than 12 hours before the class.</p><p class="vi-hint">Bạn sẽ được hoàn tiền 100%.</p>',
        actions: [{ label: 'Keep class' }, { label: 'Cancel class', cls: 'btn-danger', onClick: () => { App.state.bookings = App.state.bookings.filter(x => x.id !== b.dataset.cancel); App.save(); toast('Class cancelled. Đã hủy lớp học.', 'info'); rerender(); } }] });
    }));
  }
};

Pages['live-classes'] = () => {
  const T = DATA.teachers, root = $('#classes-app');
  const f = { q: '', level: 'all', topic: 'all', price: 'all', rating: 'all', avail: 'all', sort: 'recommended' };
  root.innerHTML = `
    <section class="card" aria-labelledby="up-title"><div class="card-head"><h2 id="up-title">Your upcoming classes</h2></div><div id="my-bookings"></div></section>
    <section class="filter-bar card" aria-label="Filter teachers">
      <div class="field grow"><label for="f-q">Teacher</label><div class="input-icon">${icon('search', 16)}<input id="f-q" class="input" type="search" placeholder="Search by name or specialty"></div></div>
      <div class="field"><label for="f-level">Level</label><select id="f-level" class="input"><option value="all">All levels</option>${Object.keys(DATA.levels).map(l => `<option value="${l}">${l} ${DATA.levels[l]}</option>`).join('')}</select></div>
      <div class="field"><label for="f-topic">Topic</label><select id="f-topic" class="input"><option value="all">All topics</option>${DATA.teacherTopics.map(t => `<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="f-price">Price</label><select id="f-price" class="input"><option value="all">Any price</option><option value="0-200000">Under 200,000đ</option><option value="200000-300000">200,000đ – 300,000đ</option><option value="300000-9999999">Over 300,000đ</option></select></div>
      <div class="field"><label for="f-rating">Rating</label><select id="f-rating" class="input"><option value="all">Any rating</option><option value="4.9">★ 4.9+</option><option value="4.8">★ 4.8+</option><option value="4.7">★ 4.7+</option></select></div>
      <div class="field"><label for="f-avail">Availability</label><select id="f-avail" class="input"><option value="all">Anytime</option><option value="0">Today</option><option value="1">Tomorrow</option><option value="week">This week</option><option value="weekend">Weekend</option><option value="evening">Evenings (after 18:00)</option></select></div>
      <div class="field"><label for="f-sort">Sort by</label><select id="f-sort" class="input"><option value="recommended">Recommended</option><option value="rating">Highest rated</option><option value="price-asc">Lowest price</option><option value="price-desc">Highest price</option><option value="classes">Most classes</option></select></div>
    </section>
    <div class="list-head"><p class="muted" id="t-count" aria-live="polite"></p><button class="link-btn" id="f-reset">Reset filters</button></div>
    <div class="teacher-grid" id="teacher-grid"></div>`;

  const renderBookings = () => { const el = $('#my-bookings'); el.innerHTML = Classes.bookingsHTML(); Classes.bindBookings(el, renderBookings); };

  const availOk = t => {
    if (f.avail === 'all') return true;
    const range = f.avail === 'week' ? [0, 6] : f.avail === 'weekend' || f.avail === 'evening' ? [0, 13] : [+f.avail, +f.avail];
    for (let i = range[0]; i <= range[1]; i++) {
      const d = addDays(new Date(), i), sl = Classes.slotsFor(t, d);
      if (!sl.length) continue;
      if (f.avail === 'weekend' && ![0, 6].includes(d.getDay())) continue;
      if (f.avail === 'evening' && !sl.some(x => +x.slice(0, 2) >= 18)) continue;
      return true;
    }
    return false;
  };

  const render = () => {
    const q = f.q.toLowerCase();
    let list = T.filter(t => (!q || (t.name + t.spec + t.country).toLowerCase().includes(q))
      && (f.level === 'all' || t.levels.includes(f.level))
      && (f.topic === 'all' || t.topics.includes(f.topic))
      && (f.price === 'all' || (() => { const [a, b] = f.price.split('-').map(Number); return t.price >= a && t.price <= b; })())
      && (f.rating === 'all' || t.rating >= +f.rating) && availOk(t));
    const lvl = App.level;
    const sorters = { recommended: (a, b) => (b.levels.includes(lvl) - a.levels.includes(lvl)) || b.rating - a.rating, rating: (a, b) => b.rating - a.rating, 'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, classes: (a, b) => b.classes - a.classes };
    list = list.slice().sort(sorters[f.sort]);
    $('#t-count').textContent = `${list.length} teacher${list.length === 1 ? '' : 's'} available`;
    $('#teacher-grid').innerHTML = list.length ? list.map(t => {
      const n = Classes.nextSlot(t);
      return `<article class="teacher-card card">
        <div class="tc-top">${Classes.avatar(t, 'avatar-lg')}<div class="grow"><h3><a href="teacher.html?id=${t.id}">${esc(t.name)}</a></h3><span class="muted small">${t.flag} ${esc(t.country)}</span></div>${t.levels.includes(lvl) ? '<span class="badge badge-success">Fits your level</span>' : ''}</div>
        <p class="tc-spec">${esc(t.spec)}</p>
        <div class="tc-stats"><span class="rating">★ ${t.rating}</span><span>${fmtNum(t.classes)} classes</span><span>${t.years} yrs</span></div>
        <div class="chip-row">${t.topics.map(x => `<span class="chip chip-static">${x}</span>`).join('')}<span class="chip chip-static">${t.levels.join('–')}</span></div>
        <p class="tc-next muted small">${n ? `${icon('calendar', 14)} Next: ${n.i === 0 ? 'Today' : n.i === 1 ? 'Tomorrow' : fmtDay(n.d)} at ${n.time}` : 'Fully booked this fortnight'}</p>
        <div class="tc-foot"><div><strong class="price">${fmtVND(t.price)}</strong><span class="muted small"> / 50 min</span></div>
          <div class="btn-row"><a class="btn btn-sm btn-ghost" href="teacher.html?id=${t.id}">Profile</a><button class="btn btn-sm btn-primary" data-book="${t.id}" ${n ? '' : 'disabled'}>Book Class</button></div></div>
      </article>`;
    }).join('') : emptyState('🔍', 'No teachers match your filters', 'Try a different price range or availability.', '<button class="btn btn-secondary" id="empty-reset">Reset filters</button>');
    $$('[data-book]').forEach(b => b.addEventListener('click', () => Classes.book(Classes.teacher(b.dataset.book), {}, () => { renderBookings(); render(); })));
    const er = $('#empty-reset'); if (er) er.addEventListener('click', reset);
  };
  const reset = () => { Object.assign(f, { q: '', level: 'all', topic: 'all', price: 'all', rating: 'all', avail: 'all', sort: 'recommended' }); ['q', 'level', 'topic', 'price', 'rating', 'avail', 'sort'].forEach(k => $('#f-' + k).value = f[k]); render(); };
  ['level', 'topic', 'price', 'rating', 'avail', 'sort'].forEach(k => $('#f-' + k).addEventListener('change', e => { f[k] = e.target.value; render(); }));
  $('#f-q').addEventListener('input', debounce(e => { f.q = e.target.value.trim(); render(); }, 150));
  $('#f-reset').addEventListener('click', reset);
  const topicParam = params().get('topic'); if (topicParam && DATA.teacherTopics.includes(topicParam)) { f.topic = topicParam; $('#f-topic').value = topicParam; }
  renderBookings(); render();
};

Pages.teacher = () => {
  const t = Classes.teacher(params().get('id')) || DATA.teachers[0];
  const root = $('#teacher-app');
  let selDay = 0, selTime = null;
  document.title = `${t.name} — EnglishUp`;
  const avgReview = (t.reviews.reduce((a, r) => a + r.rating, 0) / t.reviews.length).toFixed(1);
  root.innerHTML = `
    <a href="live-classes.html" class="back-link">${icon('chevL', 16)} All teachers</a>
    <div class="teacher-layout">
      <div class="teacher-main">
        <section class="card teacher-hero">
          ${Classes.avatar(t, 'avatar-xl')}
          <div class="grow"><h1>${esc(t.name)}</h1><p class="muted">${t.flag} ${esc(t.country)} · ${esc(t.langs)}</p>
            <div class="tc-stats"><span class="rating">★ ${t.rating}</span><span>${fmtNum(t.classes)} classes taught</span><span>${t.years} years experience</span></div>
            <div class="chip-row">${t.topics.map(x => `<span class="chip chip-static">${x}</span>`).join('')}${t.levels.map(l => `<span class="chip chip-static">${l}</span>`).join('')}</div></div>
          <button class="btn btn-secondary" id="t-intro">${icon('play', 16)} Intro</button>
        </section>
        <section class="card"><h2>About me</h2><p>${esc(t.intro)}</p><p class="muted">Specialization: <strong>${esc(t.spec)}</strong>. I teach learners at ${t.levels.join(', ')} level and adapt every class to your goals.</p></section>
        <section class="card"><h2>Experience & certifications</h2>
          <ul class="cert-list"><li>${icon('clock', 18)} <span><strong>${t.years} years</strong> teaching English online, ${fmtNum(t.classes)} classes</span></li>${t.certs.map(c => `<li>${icon('check', 18)} <span>${esc(c)}</span></li>`).join('')}</ul></section>
        <section class="card" aria-labelledby="cal-title"><div class="card-head"><h2 id="cal-title">Available schedule</h2><span class="muted small">Vietnam time (GMT+7)</span></div>
          <div class="calendar" id="calendar" role="listbox" aria-label="Choose a day"></div>
          <div class="slot-row" id="slot-row" aria-live="polite"></div></section>
        <section class="card"><div class="card-head"><h2>Reviews</h2><span class="rating">★ ${avgReview} · ${t.reviews.length} reviews</span></div>
          <ul class="review-list">${t.reviews.map(r => `<li><span class="avatar avatar-sm" style="--h:${(r.name.length * 37) % 360}">${initials(r.name)}</span><div><strong>${esc(r.name)}</strong> <span class="rating small">★ ${r.rating}</span><p>${esc(r.text)}</p></div></li>`).join('')}</ul></section>
      </div>
      <aside class="teacher-side"><div class="card book-card" id="book-card"></div></aside>
    </div>`;

  const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));
  const renderCal = () => {
    $('#calendar').innerHTML = days.map((d, i) => {
      const n = Classes.slotsFor(t, d).length;
      return `<button class="cal-day ${i === selDay ? 'active' : ''} ${n ? '' : 'empty'}" role="option" aria-selected="${i === selDay}" data-i="${i}" ${n ? '' : 'aria-disabled="true"'}>
        <span>${DAY_SHORT[d.getDay()]}</span><strong>${d.getDate()}</strong><small>${n ? `${n} slot${n > 1 ? 's' : ''}` : '—'}</small></button>`;
    }).join('');
    $$('.cal-day').forEach(b => b.addEventListener('click', () => { selDay = +b.dataset.i; selTime = null; renderCal(); renderSlots(); renderBook(); }));
    const sl = Classes.slotsFor(t, days[selDay]);
    $('#slot-row').innerHTML = '';
    renderSlots(sl);
  };
  const renderSlots = () => {
    const sl = Classes.slotsFor(t, days[selDay]);
    $('#slot-row').innerHTML = sl.length ? `<span class="muted small">${fmtDay(days[selDay])}</span>` + sl.map(time => `<button class="slot ${time === selTime ? 'active' : ''}" data-t="${time}">${time}</button>`).join('')
      : `<p class="muted small">No free slots on ${fmtDay(days[selDay])}. Try another day. <span class="vi-hint">Chọn ngày khác nhé.</span></p>`;
    $$('#slot-row .slot').forEach(b => b.addEventListener('click', () => { selTime = b.dataset.t; renderSlots(); renderBook(); }));
  };
  const renderBook = () => {
    $('#book-card').innerHTML = `
      <div class="plan-price"><strong>${fmtVND(t.price)}</strong><span>/ 50 min</span></div>
      <p class="muted small">1-on-1 video class · free cancellation up to 12 hours before</p>
      <div class="book-sel">${selTime ? `${icon('calendar', 16)} <strong>${fmtDay(days[selDay])} at ${selTime}</strong>` : '<span class="muted">Select a time in the schedule</span>'}</div>
      <button class="btn btn-primary btn-block btn-lg" id="book-now">Book lesson</button>
      <button class="btn btn-secondary btn-block" id="msg-teacher">${icon('chat', 16)} Message ${esc(t.name.split(' ')[0])}</button>
      <div id="t-bookings"></div>`;
    $('#book-now').addEventListener('click', () => Classes.book(t, selTime ? { date: dateKey(days[selDay]), time: selTime, offset: selDay } : {}, () => { selTime = null; renderCal(); renderBook(); }));
    $('#msg-teacher').addEventListener('click', () => openModal({ title: `Message ${esc(t.name)}`, body: `<div class="field"><label for="tmsg">Your message</label><textarea id="tmsg" class="input" rows="4">Hi ${esc(t.name.split(' ')[0])}! I'm at ${App.level} level and I want to improve my speaking. Could you help me?</textarea></div>`,
      actions: [{ label: 'Cancel' }, { label: 'Send message', cls: 'btn-primary', onClick: (c, el) => { if (!$('#tmsg', el).value.trim()) { toast('Please write a message.', 'error'); return false; } toast(`Message sent. ${esc(t.name.split(' ')[0])} usually replies within 2 hours.`, 'success'); } }] }));
    const mine = App.state.bookings.filter(b => b.teacher === t.id && b.date >= dateKey());
    $('#t-bookings').innerHTML = mine.length ? `<h3 class="h-sm">Your classes with ${esc(t.name.split(' ')[0])}</h3><ul class="mini-list">${mine.map(b => `<li>${icon('check', 14)} ${fmtDay(new Date(b.date + 'T00:00'))} · ${b.time}</li>`).join('')}</ul>` : '';
  };
  $('#t-intro').addEventListener('click', () => speak(t.intro));
  const first = days.findIndex(d => Classes.slotsFor(t, d).length); if (first > 0) selDay = first;
  renderCal(); renderBook();
};
