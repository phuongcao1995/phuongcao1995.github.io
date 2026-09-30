/* CineWave — social.js
   Ratings & reviews and the Watch Party UI.
   Reviews: a few generated community reviews per title + reviews written in this browser (stored in localStorage).
   Watch Party: a simulated room with chat, reactions and synced play/pause/seek. Two tabs of the same browser that
   join the same room code really do sync through BroadcastChannel; demo guests fill the room so it looks alive. */
const Social = (() => {
  const { $, $$, esc, icon } = CW;
  const DAY = 864e5;
  const POOL = ["Linh N.", "Minh T.", "Hana K.", "Jordan B.", "Thảo P.", "Wei L.", "Sam R.", "Yuki S.", "Đức A.", "Priya M.", "Alex C.", "Mai V."];
  const TEXT = {
    5: ["Absolutely loved it — the pacing and the score are perfect.", "One of the best things I've watched this year. Already rewatching.", "Beautiful, moving and surprisingly funny. Highly recommend."],
    4: ["Really strong, a couple of slow stretches but the ending lands.", "Great cast and looks gorgeous. Would watch again.", "Solid and confident. Worth your evening."],
    3: ["Decent. Good ideas, but it never quite commits.", "Enjoyable enough — I wanted a little more from the second half.", "Fine for a lazy night, not a standout."],
    2: ["Started well and lost me by the middle.", "Nice visuals, thin story."],
    1: ["Couldn't get into it at all.", "Not for me — the plot never clicked."],
  };

  /* ---------- reviews ---------- */
  function synthetic(m) {
    const n = 3 + (DATA.hash(m.title) % 4);
    return Array.from({ length: n }, (_, i) => {
      const h = DATA.hash(m.title + "r" + i), rating = Math.max(1, Math.min(5, Math.round(m.rating / 2 + ((h % 7) - 3) * 0.4)));
      const txt = TEXT[rating];
      return { id: `s${m.id}-${i}`, titleId: m.id, name: POOL[h % POOL.length], rating, text: txt[h % txt.length], at: Date.now() - (1 + (h % 60)) * DAY, helpful: h % 23, synthetic: true };
    });
  }
  const removed = () => new Set(Store.get("modRemoved", []));
  const votes = () => Store.get("votes", {});
  function allFor(m, { includeRemoved = false } = {}) {
    const gone = removed(), v = votes();
    return [...synthetic(m), ...Store.get("reviews", []).filter((r) => r.titleId === m.id)]
      .map((r) => ({ ...r, helpful: (r.helpful || 0) + (v[r.id] || 0), removed: gone.has(r.id), flagged: Store.get("flags", []).includes(r.id) }))
      .filter((r) => includeRemoved || !r.removed);
  }
  function summary(m) {
    const rs = allFor(m), dist = [0, 0, 0, 0, 0, 0];
    rs.forEach((r) => dist[r.rating]++);
    return { count: rs.length, avg: rs.length ? rs.reduce((n, r) => n + r.rating, 0) / rs.length : 0, dist };
  }
  const myName = () => (CW.user() ? CW.user().name : CW.profile.name);

  function mountReviews(el, m) {
    let sort = "helpful", draft = 0;
    const draw = () => {
      const s = summary(m), mine = Store.get("reviews", []).find((r) => r.titleId === m.id && r.profile === CW.profile.id && !removed().has(r.id));
      const helpedSet = new Set(Store.pget("helpful", []));
      const list = allFor(m).sort((a, b) => (sort === "new" ? b.at - a.at : sort === "high" ? b.rating - a.rating : sort === "low" ? a.rating - b.rating : b.helpful - a.helpful));
      const cur = draft || (mine ? mine.rating : 0);
      el.innerHTML = `<div class="block-head"><h2 id="rev-h">Ratings &amp; reviews</h2><label class="field inline"><span class="sr-only">Sort reviews</span><select id="rev-sort" aria-label="Sort reviews">${[["helpful", "Most helpful"], ["new", "Newest"], ["high", "Highest rated"], ["low", "Lowest rated"]].map(([v, l]) => `<option value="${v}" ${v === sort ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
        <div class="rev-top"><div class="rev-score"><b>${s.count ? s.avg.toFixed(1) : "–"}</b>${CW.stars(s.avg, "lg")}<small>${s.count} review${s.count === 1 ? "" : "s"}</small></div>
          <ul class="rev-dist" aria-label="Rating distribution">${[5, 4, 3, 2, 1].map((n) => `<li><span>${n}★</span><i><b style="width:${s.count ? (s.dist[n] / s.count) * 100 : 0}%"></b></i><span>${s.dist[n]}</span></li>`).join("")}</ul>
          <form class="rev-form" id="rev-form"><p class="rev-label" id="rev-l">${mine ? "Your review" : "Rate this title"}</p>
            <div class="star-input" role="radiogroup" aria-labelledby="rev-l">${[1, 2, 3, 4, 5].map((i) => `<button type="button" role="radio" aria-checked="${cur === i}" aria-label="${i} star${i > 1 ? "s" : ""}" data-star="${i}" class="${cur >= i ? "on" : ""}">★</button>`).join("")}</div>
            <label class="sr-only" for="rev-text">Your review</label><textarea id="rev-text" maxlength="500" rows="3" placeholder="Share what you thought (optional)">${mine ? esc(mine.text) : ""}</textarea>
            <div class="btn-row"><button class="btn btn-primary btn-sm" type="submit">${mine ? "Update review" : "Post review"}</button>${mine ? '<button class="btn btn-ghost btn-sm" type="button" data-del-mine>Delete</button>' : ""}</div></form></div>
        <ul class="rev-list">${list.map((r) => `<li class="rev"><div class="rev-head"><span class="avatar" style="--h:${DATA.hash(r.name) % 360}">${esc(r.name.charAt(0))}</span><div><b>${esc(r.name)}${r.profile ? ' <em class="pill">You</em>' : ""}</b><small class="muted">${CW.ago(r.at)}</small></div>${CW.stars(r.rating)}</div>
          ${r.text ? `<p>${esc(r.text)}</p>` : ""}<div class="rev-actions"><button type="button" class="link-btn" data-helpful="${r.id}" aria-pressed="${helpedSet.has(r.id)}">👍 Helpful (${r.helpful})</button>${r.profile ? "" : `<button type="button" class="link-btn" data-flag="${r.id}" ${r.flagged ? "disabled" : ""}>${r.flagged ? "Reported" : "Report"}</button>`}</div></li>`).join("") || '<li class="muted">No reviews yet — be the first.</li>'}</ul>`;
    };
    el.addEventListener("click", (e) => {
      const st = e.target.closest("[data-star]"), h = e.target.closest("[data-helpful]"), f = e.target.closest("[data-flag]");
      if (st) { draft = Number(st.dataset.star); const text = $("#rev-text", el).value; draw(); $("#rev-text", el).value = text; $(`[data-star="${draft}"]`, el).focus(); }
      if (h) {
        const set = new Set(Store.pget("helpful", [])), v = votes(), id = h.dataset.helpful;
        if (set.has(id)) { set.delete(id); v[id] = (v[id] || 0) - 1; } else { set.add(id); v[id] = (v[id] || 0) + 1; }
        Store.pset("helpful", [...set]); Store.set("votes", v); draw();
      }
      if (f) { Store.set("flags", [...new Set([...Store.get("flags", []), f.dataset.flag])]); CW.toast("Thanks — the review was reported to moderators", "success"); draw(); }
      if (e.target.closest("[data-del-mine]")) {
        Store.set("reviews", Store.get("reviews", []).filter((r) => !(r.titleId === m.id && r.profile === CW.profile.id)));
        const rt = Store.pget("ratings", {}); delete rt[m.id]; Store.pset("ratings", rt); draft = 0; CW.toast("Review deleted", "info"); draw();
      }
    });
    el.addEventListener("change", (e) => { if (e.target.id === "rev-sort") { sort = e.target.value; draw(); } });
    el.addEventListener("submit", (e) => {
      e.preventDefault();
      const mine = Store.get("reviews", []).find((r) => r.titleId === m.id && r.profile === CW.profile.id), rating = draft || (mine && mine.rating);
      if (!rating) return CW.toast("Pick a star rating first", "error");
      const entry = { id: mine ? mine.id : "u" + Date.now().toString(36), titleId: m.id, profile: CW.profile.id, name: myName(), rating, text: $("#rev-text", el).value.trim(), at: Date.now() };
      Store.set("reviews", [...Store.get("reviews", []).filter((r) => r.id !== entry.id), entry]);
      const rt = Store.pget("ratings", {}); rt[m.id] = rating; Store.pset("ratings", rt);
      draft = 0; CW.toast(mine ? "Review updated" : "Thanks for your review! It now shapes your recommendations.", "success"); draw();
    });
    draw();
  }

  /* ---------- watch party ---------- */
  const BOT_NAMES = [["Mai", 330], ["Kenji", 190], ["Sofia", 40]];
  const BOT_CHAT = ["This opening is gorgeous", "Wait, did you see that?", "No spoilers please!", "I'm making popcorn 🍿", "The soundtrack though…", "Okay that was unexpected", "Rewind a bit?", "Best scene so far"];
  const BOT_REPLY = ["Haha same!", "Totally agree 😄", "Right?! I noticed that too", "Ooh good point", "Let's keep watching"];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  function party(ctx) {
    const me = { id: Math.random().toString(36).slice(2, 8), name: myName(), hue: CW.profile.hue };
    let code = null, chan = null, members = new Map(), msgs = [], follow = true, timers = [], open = false, lastSync = null;
    const slot = ctx.slot;
    const newCode = () => Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
    const say = (m) => { msgs.push({ at: Date.now(), ...m }); msgs = msgs.slice(-60); if (open) drawChat(); };
    const send = (o) => chan && chan.postMessage({ ...o, from: me });
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    function join(c) {
      leave(true); code = c.toUpperCase(); members = new Map([[me.id, { ...me, you: true }]]); msgs = [];
      if ("BroadcastChannel" in window) {
        chan = new BroadcastChannel("cw-party-" + code);
        chan.onmessage = ({ data: d }) => {
          if (!d || !d.from || d.from.id === me.id) return;
          if (d.t === "hello") { members.set(d.from.id, d.from); send({ t: "here" }); say({ sys: true, text: `${d.from.name} joined the party` }); }
          if (d.t === "here") members.set(d.from.id, d.from);
          if (d.t === "bye") { members.delete(d.from.id); say({ sys: true, text: `${d.from.name} left` }); }
          if (d.t === "chat") say({ from: d.from, text: d.text });
          if (d.t === "react") ctx.react(d.e);
          if (d.t === "ctrl" && follow) { lastSync = Date.now(); ctx.apply(d.a, d.pos); say({ sys: true, text: `${d.from.name} ${d.a === "seek" ? "jumped to " + Math.floor(d.pos / 60) + ":" + String(Math.floor(d.pos % 60)).padStart(2, "0") : d.a === "play" ? "pressed play" : "paused"}` }); }
          drawMembers();
        };
        send({ t: "hello" });
      }
      say({ sys: true, text: `Party ${code} is open. Share the invite link — friends who join will see the same playback.` });
      BOT_NAMES.forEach(([name, hue], i) => later(() => { members.set("bot" + i, { id: "bot" + i, name, hue, bot: true }); say({ sys: true, text: `${name} joined the party` }); drawMembers(); }, 1800 + i * 3200));
      const chatter = () => { if (!code) return; if (ctx.isPlaying()) { const b = [...members.values()].filter((x) => x.bot); if (b.length) say({ from: pick(b), text: pick(BOT_CHAT) }); } later(chatter, 12000 + Math.random() * 12000); };
      const reacts = () => { if (!code) return; if (ctx.isPlaying() && Math.random() < 0.6) ctx.react(pick(["😂", "😮", "❤️", "👏", "🔥"])); later(reacts, 9000 + Math.random() * 9000); };
      later(chatter, 9000); later(reacts, 7000);
      render();
    }
    function leave(silent) {
      if (chan) { send({ t: "bye" }); chan.close(); chan = null; }
      timers.forEach(clearTimeout); timers = []; const had = code; code = null;
      if (!silent && had) { CW.toast("You left the watch party", "info"); render(); }
    }
    const inviteUrl = () => ctx.invite(code);

    function drawMembers() {
      const el = $("#pt-members", slot); if (!el) return;
      el.innerHTML = [...members.values()].map((x) => `<li title="${esc(x.name)}${x.bot ? " (demo guest)" : ""}"><span class="avatar" style="--h:${x.hue}">${esc(x.name.charAt(0))}</span><span class="dotlive"></span><small>${esc(x.you ? "You" : x.name)}</small></li>`).join("");
      $("#pt-count", slot).textContent = `${members.size} watching`;
      $("#pt-sync", slot).textContent = lastSync ? `In sync · last update ${CW.ago(lastSync)}` : "In sync";
    }
    function drawChat() {
      const el = $("#pt-log", slot); if (!el) return;
      el.innerHTML = msgs.map((x) => x.sys ? `<li class="sys">${esc(x.text)}</li>` : `<li class="${x.from.id === me.id ? "me" : ""}"><b style="color:hsl(${x.from.hue} 80% 68%)">${esc(x.from.id === me.id ? "You" : x.from.name)}</b> ${esc(x.text)}</li>`).join("");
      el.scrollTop = el.scrollHeight;
    }
    function render() {
      if (!open) { slot.innerHTML = ""; return; }
      slot.innerHTML = `<section class="party" aria-label="Watch Party"><div class="side-head"><h2>Watch Party</h2><button type="button" class="icon-btn" data-pt="close" aria-label="Close watch party">${icon("x")}</button></div>
        ${!code ? `<div class="party-lobby"><p class="muted">Watch together: everyone's play, pause and seek stay in sync, with live chat and reactions.</p>
          <button type="button" class="btn btn-primary btn-block" data-pt="create">Start a party</button><p class="center muted small">or join with a code</p>
          <form class="join-row" data-pt-form="join"><label class="sr-only" for="pt-code">Party code</label><input id="pt-code" maxlength="6" placeholder="ABC123" autocomplete="off" style="text-transform:uppercase"><button class="btn btn-ghost" type="submit">Join</button></form>
          <p class="muted small">Demo: open this page in a second tab and join with the same code to see real syncing.</p></div>`
        : `<div class="party-room"><div class="code-row"><div><small class="muted">Room code</small><b class="code">${code}</b></div><button type="button" class="btn btn-ghost btn-sm" data-pt="copy">Copy invite link</button></div>
          <div class="pt-meta"><span id="pt-count"></span><span id="pt-sync" class="ok"></span></div><ul class="members" id="pt-members" aria-label="Members"></ul>
          <label class="check"><input type="checkbox" id="pt-follow" ${follow ? "checked" : ""}> Sync my player with the party</label>
          <ul class="chat-log" id="pt-log" aria-live="polite" aria-label="Chat"></ul>
          <div class="react-bar" role="group" aria-label="Send reaction">${["😂", "😮", "❤️", "👏", "🔥"].map((e) => `<button type="button" data-react="${e}" aria-label="React ${e}">${e}</button>`).join("")}</div>
          <form class="chat-form" data-pt-form="chat"><label class="sr-only" for="pt-msg">Message</label><input id="pt-msg" maxlength="140" placeholder="Say something…" autocomplete="off"><button class="btn btn-primary btn-sm" type="submit">Send</button></form>
          <button type="button" class="link-btn" data-pt="leave">Leave party</button></div>`}</section>`;
      if (code) { drawMembers(); drawChat(); }
    }
    slot.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pt]"), r = e.target.closest("[data-react]");
      if (r) { ctx.react(r.dataset.react); send({ t: "react", e: r.dataset.react }); }
      if (!b) return;
      const a = b.dataset.pt;
      if (a === "close") { open = false; render(); }
      if (a === "create") join(newCode());
      if (a === "leave") leave();
      if (a === "copy") { const u = inviteUrl(); (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => CW.toast("Invite link copied", "success"), () => CW.toast(u, "info")); }
    });
    slot.addEventListener("change", (e) => { if (e.target.id === "pt-follow") { follow = e.target.checked; CW.toast(follow ? "Your player follows the party" : "You're watching independently", "info"); } });
    slot.addEventListener("submit", (e) => {
      e.preventDefault(); const kind = e.target.dataset.ptForm;
      if (kind === "join") { const c = $("#pt-code", slot).value.trim(); if (c.length < 4) return CW.toast("Enter the room code", "error"); join(c); }
      if (kind === "chat") {
        const inp = $("#pt-msg", slot), text = inp.value.trim(); if (!text) return; inp.value = "";
        say({ from: me, text }); send({ t: "chat", text });
        const bots = [...members.values()].filter((x) => x.bot); if (bots.length) later(() => say({ from: pick(bots), text: pick(BOT_REPLY) }), 1500 + Math.random() * 1500);
      }
    });
    return {
      toggle() { open = !open; render(); if (open && !code) $("[data-pt=create]", slot)?.focus(); return open; },
      joinFromLink(c) { open = true; join(c); },
      /* called by the player for local play / pause / seek */
      notify(a, pos) { if (code && follow) send({ t: "ctrl", a, pos }); },
      active: () => !!code,
    };
  }

  return { mountReviews, summary, allFor, party };
})();
