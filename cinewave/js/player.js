/* CineWave — player.js
   Watch page: custom video player (play/pause, seek, volume, speed, quality, demo captions, fullscreen,
   skip intro, prev/next episode, ad + plan gate simulation) with progress saved to localStorage.
   The stream is a short open-licence sample clip, so progress is stored as a fraction of the clip. */
(() => {
  const { $, $$, esc, t, icon, param } = CW;
  const root = $("#watch");
  const m = CW.getM(param("id"));

  if (!m || (CW.profile.kids && !CW.kidSafe(m))) {
    root.innerHTML = m ? CW.empty({ ic: "lock", title: "Not available in Kids Mode", text: "Switch to another profile to watch this title.", action: { href: "index.html", label: "Back to home" } }) : CW.errorState("We couldn't find that title.");
    return;
  }
  const isSeries = m.type === "series";
  const S = isSeries ? Math.min(m.seasons, Math.max(1, Number(param("s")) || 1)) : 0;
  const E = isSeries ? Math.min(m.episodesPerSeason, Math.max(1, Number(param("e")) || 1)) : 0;
  const ep = isSeries ? DATA.episodes(m, S)[E - 1] : null;
  const settings = Store.settings();
  const fmt = (s) => { if (!isFinite(s)) return "0:00"; s = Math.floor(s); const h = Math.floor(s / 3600), mi = Math.floor((s % 3600) / 60), se = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(mi).padStart(2, "0")}:${se}` : `${mi}:${se}`; };
  const epUrl = (s, e, auto) => `watch.html?id=${m.id}&s=${s}&e=${e}${auto ? "&autoplay=1" : ""}`;
  const neighbour = (dir) => {
    if (!isSeries) return null;
    let s = S, e = E + dir;
    if (e < 1) { s--; e = m.episodesPerSeason; if (s < 1) return null; }
    else if (e > m.episodesPerSeason) { s++; e = 1; if (s > m.seasons) return null; }
    return { s, e };
  };
  const prev = neighbour(-1), next = neighbour(1);
  const CUES = {
    English: ["It has been a long road.", "We are closer than you think.", "Stay with me.", "Something is coming.", "Do you hear that?", "Nobody said it would be easy.", "This changes everything.", "Let's finish this."],
    Vietnamese: ["Đó là một chặng đường dài.", "Chúng ta gần hơn bạn nghĩ.", "Ở lại với tôi.", "Có điều gì đó đang đến.", "Bạn có nghe thấy không?", "Không ai nói sẽ dễ dàng.", "Điều này thay đổi tất cả.", "Hãy kết thúc nó."],
  };
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const QUALITIES = ["Auto", "360p", "480p", "720p", "1080p", ...(m.quality.includes("4K") ? ["4K"] : [])];
  const SUBS = ["Off", "Vietnamese", "English"];
  const title = isSeries ? `${m.title} — S${S} · E${E}: ${ep.title}` : m.title;
  document.title = `${title} · CineWave`;

  const menu = (id, label, opts, cur) => `<div class="p-menu" id="menu-${id}" role="menu" aria-label="${label}" hidden>${opts.map((o) => `<button type="button" role="menuitemradio" aria-checked="${String(o) === String(cur)}" data-menu-${id}="${o}">${o}${id === "quality" && o === "4K" && Store.plan() !== "premium" ? ` ${icon("lock")}` : ""}${id === "speed" && o === 1 ? " (Normal)" : ""}</button>`).join("")}</div>`;
  const ctl = (act, ic, label, extra = "") => `<button type="button" class="p-btn" data-p="${act}" aria-label="${label}" data-tip="${label}" ${extra}>${icon(ic)}</button>`;

  const related = CW.sorted(CW.catalog().filter((x) => x.id !== m.id && x.genres.some((g) => m.genres.includes(g))), "rating").slice(0, 14);
  const side = isSeries
    ? `<div class="side-head"><h2>Episodes</h2><select id="side-season" aria-label="Season">${Array.from({ length: m.seasons }, (_, i) => `<option value="${i + 1}" ${i + 1 === S ? "selected" : ""}>Season ${i + 1}</option>`).join("")}</select></div><ul class="side-eps" id="side-eps"></ul>`
    : `<div class="side-head"><h2>More like this</h2></div><ul class="side-eps">${related.slice(0, 6).map((r) => `<li><a class="side-ep" href="movie-detail.html?id=${r.id}"><img src="${DATA.backdrop(r)}" alt="" loading="lazy" width="160" height="90"><span><b>${esc(r.title)}</b><small>${r.year} · ${CW.runtime(r)}</small></span></a></li>`).join("")}</ul>`;

  root.innerHTML = `<div class="watch-layout"><div class="watch-main">
    <div class="player idle" id="player" tabindex="0" role="region" aria-label="Video player for ${esc(title)}">
      <video id="video" playsinline preload="metadata" poster="${DATA.backdrop(m)}"></video>
      <div class="captions" id="captions" hidden></div>
      <div class="p-top"><a class="p-btn" href="movie-detail.html?id=${m.id}" aria-label="Back to details">${icon("chevL")}</a><span class="p-title">${esc(title)}</span><span class="badge q solid" id="q-badge">HD</span></div>
      <button type="button" class="big-play" id="bigplay" aria-label="Play">${icon("play")}</button>
      <div class="p-spinner" id="spinner" hidden aria-label="Buffering"></div>
      <button type="button" class="skip-intro btn btn-ghost" id="skip-intro" hidden>Skip intro ${icon("skipNext")}</button>
      <div class="p-overlay" id="upnext" hidden><p class="muted small">Up next</p><h3 id="upnext-title"></h3><p>Starting in <b id="upnext-sec">5</b>s</p><div class="btn-row"><button type="button" class="btn btn-primary" id="upnext-go">Play now</button><button type="button" class="btn btn-ghost" id="upnext-cancel">Cancel</button></div></div>
      <div class="p-overlay" id="ad" hidden><p class="badge">Ad</p><h3>Upgrade to Standard — no ads, Full HD</h3><p class="muted">Free plan simulation · your video starts in <b id="ad-sec">5</b>s</p><div class="btn-row"><button type="button" class="btn btn-ghost" id="ad-skip" disabled>Skip ad</button><a class="btn btn-primary" href="subscription.html">See plans</a></div></div>
      <div class="p-overlay" id="gate" hidden>${icon("lock", "big")}<h3>${m.tier === "premium" ? "Premium" : "Standard"} plan required</h3><p class="muted">You're on the ${Store.plan()} plan. Upgrade to watch this title. (Demo — no real payment.)</p><div class="btn-row"><a class="btn btn-primary" href="subscription.html">View plans</a><a class="btn btn-ghost" href="movie-detail.html?id=${m.id}">Back</a></div></div>
      <span class="sim-tag" id="sim-tag" hidden>Simulated playback</span><div class="react-layer" id="react-layer" aria-hidden="true"></div>
      <div class="resume-chip" id="resume-chip" hidden><span id="resume-text"></span><button type="button" class="link-btn" id="start-over">Start over</button></div>
      <div class="p-controls">
        <div class="seek-wrap" id="seek-wrap"><div class="chapters" id="chapters" aria-hidden="true"></div><input type="range" class="seek" id="seek" min="0" max="1000" value="0" step="1" aria-label="Seek" aria-valuetext="0:00"><div class="seek-tip" id="seek-tip" hidden></div></div>
        <div class="p-row"><div class="p-left">
            ${ctl("play", "play", "Play")}${prev ? ctl("prev", "skipPrev", "Previous episode") : ""}${ctl("back", "rewind", "Back 10 seconds")}<button type="button" class="p-btn fwd" data-p="fwd" aria-label="Forward 10 seconds" data-tip="Forward 10 seconds">${icon("rewind")}</button>${next ? ctl("next", "skipNext", "Next episode") : ""}
            <span class="vol">${ctl("mute", "volume", "Mute")}<input type="range" id="vol" min="0" max="1" step="0.05" value="1" aria-label="Volume"></span><span class="time" id="time">0:00 / 0:00</span></div>
          <div class="p-right"><button type="button" class="p-btn" data-p-menu="subs" aria-haspopup="true" aria-label="Subtitles" data-tip="Subtitles">${icon("cc")}</button>
            <button type="button" class="p-btn txt" data-p-menu="speed" aria-haspopup="true" aria-label="Playback speed" id="speed-btn">1×</button>
            <button type="button" class="p-btn" data-p-menu="quality" aria-haspopup="true" aria-label="Quality" data-tip="Quality">${icon("sliders")}</button>
            <button type="button" class="p-btn" data-p-menu="audio" aria-haspopup="true" aria-label="Audio track" data-tip="Audio">${icon("globe")}</button>
            <button type="button" class="p-btn" data-p="party" aria-label="Watch Party" data-tip="Watch Party">${icon("users")}</button>
            <button type="button" class="p-btn hide-sm" data-p="pip" id="pip-btn" aria-label="Picture in picture" data-tip="Mini player" ${"pictureInPictureEnabled" in document ? "" : "hidden"}>${icon("pip")}</button>
            <button type="button" class="p-btn hide-sm hide-narrow" data-p="theater" aria-label="Theater mode" data-tip="Theater mode">${icon("theater")}</button>
            ${ctl("full", "full", "Fullscreen")}</div></div>
      </div>
      ${menu("subs", "Subtitles", SUBS, settings.subtitle)}${menu("speed", "Playback speed", SPEEDS, 1)}${menu("quality", "Quality", QUALITIES, settings.quality)}${menu("audio", "Audio track", m.audio, m.audio[0])}
    </div>
    <div class="watch-info"><div><p class="eyebrow">${isSeries ? `Season ${S} · Episode ${E}` : "Movie"}</p><h1>${esc(m.title)}</h1>${isSeries ? `<h2 class="ep-title">${esc(ep.title)}</h2>` : ""}
        <p class="chips">${CW.rate(m)}<span>${m.year}</span><span>${isSeries ? ep.duration : m.duration} min</span><span class="badge q solid">${CW.bestQuality(m)}</span><span class="age">${m.ageRating}</span><span>${esc(m.genres.join(", "))}</span></p>
        <p class="desc">${esc(isSeries ? ep.description + " " + m.description : m.description)}</p><p class="credit"><b>Cast:</b> ${m.cast.map(esc).join(", ")}</p><p class="muted small">Demo: a short open-licence clip stands in for the ${isSeries ? ep.duration : m.duration}-minute runtime.</p></div>
      <div class="btn-row">${CW.listBtn(m, { label: true, cls: "btn btn-ghost" })}<a class="btn btn-ghost" href="movie-detail.html?id=${m.id}">${icon("info")} ${t("More Info")}</a></div></div>
    </div><aside class="watch-side" aria-label="${isSeries ? "Episodes" : "Related"}"><div id="party-slot"></div>${side}</aside></div>
    <section class="block" id="reviews" aria-labelledby="rev-h"></section>${CW.row({ title: "Related Movies", items: related })}`;

  const $p = (s) => $(s, root);
  const player = $p("#player"), videoEl = $p("#video"), seek = $p("#seek"), timeEl = $p("#time"), vol = $p("#vol");
  let video = videoEl; /* swapped for SimMedia when no sample stream is reachable */
  let dur = 0, dragging = false, idleT, adDone = Store.plan() !== "free", savedAt = 0, resumed = !!param("restart");

  /* ---- episodes side list ---- */
  if (isSeries) {
    const drawSide = (s) => {
      $p("#side-eps").innerHTML = DATA.episodes(m, s).map((x) => {
        const h = Store.getProgress(m.id, s, x.n), pct = h ? Math.round(h.pct * 100) : 0, cur = s === S && x.n === E;
        return `<li><a class="side-ep${cur ? " current" : ""}" href="${epUrl(s, x.n)}" ${cur ? 'aria-current="true"' : ""}><span class="side-thumb"><img src="${x.thumb}" alt="" loading="lazy" width="160" height="90">${pct ? `<span class="progress"><i style="width:${pct}%"></i></span>` : ""}</span><span><b>${x.n}. ${esc(x.title)}</b><small>${x.duration} min${pct ? ` · ${pct}%` : ""}</small></span></a></li>`;
      }).join("");
    };
    drawSide(S);
    $p("#side-season").addEventListener("change", (e) => drawSide(Number(e.target.value)));
  }

  /* ---- state helpers ---- */
  const save = (force) => {
    if (!dur || (video.currentTime < 3 && !force)) return;
    Store.saveProgress(m.id, S, E, video.currentTime / dur);
    savedAt = Date.now();
  };
  const setPlayingUI = (p) => {
    player.classList.toggle("playing", p);
    $p('[data-p="play"]').innerHTML = icon(p ? "pause" : "play");
    $p('[data-p="play"]').setAttribute("aria-label", p ? "Pause" : "Play");
    $p("#bigplay").hidden = p;
  };
  const showControls = () => { player.classList.remove("idle"); clearTimeout(idleT); if (!video.paused) idleT = setTimeout(() => player.classList.add("idle"), 3000); };
  const setCaption = () => {
    const c = $p("#captions"), lang = Store.settings().subtitle;
    if (lang === "Off") { c.hidden = true; return; }
    const ti = video.currentTime, on = ti % 5 < 3.6;
    c.hidden = !on; if (on) c.textContent = CUES[lang][Math.floor(ti / 5) % CUES[lang].length];
  };
  const togglePlay = () => {
    if (!adDone) return runAd();
    if (video.paused) video.play().catch(() => {}); else video.pause();
  };
  function runAd() {
    const ad = $p("#ad"), skip = $p("#ad-skip"); let n = 5;
    ad.hidden = false; skip.disabled = true; $p("#ad-sec").textContent = n;
    const done = () => { clearInterval(iv); ad.hidden = true; adDone = true; video.play().catch(() => {}); };
    const iv = setInterval(() => { n--; $p("#ad-sec").textContent = n; if (n <= 2) skip.disabled = false; if (n <= 0) done(); }, 1000);
    skip.onclick = done;
  }
  function paintSeek() { seek.style.setProperty("--val", (seek.value / 10) + "%"); seek.parentElement.style.setProperty("--seek-val", (seek.value / 10) + "%"); }
  function fullscreen() {
    const fs = document.fullscreenElement || document.webkitFullscreenElement;
    if (fs) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const req = player.requestFullscreen || player.webkitRequestFullscreen;
    if (req) { Promise.resolve(req.call(player)).then(() => { try { screen.orientation.lock("landscape"); } catch (e) {} }).catch(() => {}); }
    else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  }
  const go = (d) => { if (d) location.href = epUrl(d.s, d.e, true); };
  const stopMenus = () => $$(".p-menu", player).forEach((x) => (x.hidden = true));

  /* ---- chapters, resume chip, speed, watch party ---- */
  let remote = false;
  const CHAPTERS = [[0, "Opening"], [0.1, "Act I"], [0.38, "Act II"], [0.66, "Act III"], [0.9, "Finale"]];
  const chapterAt = (f) => CHAPTERS.reduce((c, x) => (f >= x[0] ? x : c), CHAPTERS[0])[1];
  $p("#chapters").innerHTML = CHAPTERS.slice(1).map(([f]) => '<i style="left:' + f * 100 + '%"></i>').join("");
  const wrapEl = $p("#seek-wrap"), tip = $p("#seek-tip");
  wrapEl.addEventListener("pointermove", (e) => {
    if (!dur) return; const r = wrapEl.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    tip.hidden = false; tip.textContent = fmt(f * dur) + " · " + chapterAt(f); tip.style.left = Math.max(50, Math.min(r.width - 50, f * r.width)) + "px";
  });
  wrapEl.addEventListener("pointerleave", () => (tip.hidden = true));
  function resumeChip(pos) {
    const chip = $p("#resume-chip"); $p("#resume-text").textContent = "Resumed at " + fmt(pos); chip.hidden = false;
    setTimeout(() => (chip.hidden = true), 8000);
  }
  $p("#start-over").addEventListener("click", () => { video.currentTime = 0; $p("#resume-chip").hidden = true; });
  function setSpeedUI(sp) { $p("#speed-btn").textContent = sp + "×"; $$("#menu-speed button", player).forEach((b) => b.setAttribute("aria-checked", parseFloat(b.textContent) === sp)); }
  function floatReact(e) {
    const el = document.createElement("span"); el.className = "float-react"; el.textContent = e; el.style.left = 10 + Math.random() * 80 + "%";
    $p("#react-layer").append(el); setTimeout(() => el.remove(), 2600);
  }
  const pty = Social.party({
    slot: $p("#party-slot"), react: floatReact, isPlaying: () => !video.paused,
    invite: (code) => new URL("watch.html?id=" + m.id + (isSeries ? "&s=" + S + "&e=" + E : "") + "&party=" + code, location.href).href,
    apply(a, pos) {
      remote = true;
      if (Math.abs(video.currentTime - pos) > 1.5) video.currentTime = pos;
      if (a === "play") { adDone = true; video.play().catch(() => {}); } else if (a === "pause") video.pause();
      setTimeout(() => (remote = false), 500);
    },
  });
  if (param("party")) pty.joinFromLink(param("party"));
  Social.mountReviews($p("#reviews"), m);

  /* ---- video wiring ---- */
  /* Stand-in for <video> when no public sample stream can be reached (offline, blocked host…):
     same tiny API surface the controls use, driven by a timer, so the demo always plays. */
  class SimMedia extends EventTarget {
    constructor(seconds) { super(); this._t = 0; this._v = 1; this._m = false; this.paused = true; this.playbackRate = 1; this.duration = seconds; this._iv = null; }
    get currentTime() { return this._t; }
    set currentTime(v) { this._t = Math.max(0, Math.min(this.duration, v)); this.dispatchEvent(new Event("timeupdate")); this.dispatchEvent(new Event("seeked")); }
    get volume() { return this._v; }
    set volume(v) { this._v = v; this.dispatchEvent(new Event("volumechange")); }
    get muted() { return this._m; }
    set muted(v) { this._m = v; this.dispatchEvent(new Event("volumechange")); }
    play() {
      if (!this.paused) return Promise.resolve();
      this.paused = false;
      this._iv = setInterval(() => {
        this._t += 0.25 * this.playbackRate;
        if (this._t >= this.duration) { this._t = this.duration; this.pause(); this.dispatchEvent(new Event("ended")); return; }
        this.dispatchEvent(new Event("timeupdate"));
      }, 250);
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    }
    pause() { clearInterval(this._iv); if (!this.paused) { this.paused = true; this.dispatchEvent(new Event("pause")); } }
    load() {}
  }
  const sources = [m.video, ...DATA.videos.filter((u) => u !== m.video)];
  let srcIndex = 0, sim = false;

  function wire(v) {
    v.addEventListener("loadedmetadata", () => {
      dur = v.duration; timeEl.textContent = `0:00 / ${fmt(dur)}`;
      const h = Store.getProgress(m.id, S, E);
      if (h && h.pct > 0.01 && h.pct < 0.95 && !resumed) { resumed = true; remote = true; v.currentTime = h.pct * dur; setTimeout(() => (remote = false), 300); resumeChip(h.pct * dur); }
      const sp = Store.get("speed", 1); if (sp !== 1) { v.playbackRate = sp; setSpeedUI(sp); }
      if (param("autoplay")) togglePlay();
    });
    v.addEventListener("timeupdate", () => {
      if (!dur) return;
      if (!dragging) { seek.value = (v.currentTime / dur) * 1000; paintSeek(); }
      seek.setAttribute("aria-valuetext", fmt(v.currentTime));
      timeEl.textContent = `${fmt(v.currentTime)} / ${fmt(dur)} · ${chapterAt(v.currentTime / dur)}`;
      $p("#skip-intro").hidden = !(v.currentTime > 2 && v.currentTime < 15);
      setCaption();
      if (Date.now() - savedAt > 4000) save();
    });
    v.addEventListener("play", () => { setPlayingUI(true); showControls(); if (!remote) pty.notify("play", v.currentTime); });
    v.addEventListener("seeked", () => { if (!remote) pty.notify("seek", v.currentTime); });
    v.addEventListener("pause", () => { setPlayingUI(false); player.classList.remove("idle"); save(); if (!remote) pty.notify("pause", v.currentTime); });
    v.addEventListener("volumechange", () => { const b = $p('[data-p="mute"]'); b.innerHTML = icon(v.muted || v.volume === 0 ? "mute" : "volume"); b.setAttribute("aria-label", v.muted ? "Unmute" : "Mute"); });
    v.addEventListener("ended", () => {
      Store.saveProgress(m.id, S, E, 1); setPlayingUI(false); player.classList.remove("idle");
      if (next && Store.settings().autoNext) {
        const box = $p("#upnext"); let n = 5;
        const nx = DATA.episodes(m, next.s)[next.e - 1];
        $p("#upnext-title").textContent = `S${next.s} · E${next.e} — ${nx.title}`; $p("#upnext-sec").textContent = n; box.hidden = false;
        const iv = setInterval(() => { n--; $p("#upnext-sec").textContent = n; if (n <= 0) { clearInterval(iv); go(next); } }, 1000);
        $p("#upnext-cancel").onclick = () => { clearInterval(iv); box.hidden = true; };
        $p("#upnext-go").onclick = () => { clearInterval(iv); go(next); };
      } else CW.toast("You've reached the end. Enjoy!", "success");
    });
  }

  function useSimulation() {
    sim = true; videoEl.removeAttribute("src"); videoEl.load();
    video = new SimMedia(150 + (m.id % 5) * 30);
    video.volume = Store.get("volume", 1); video.muted = Store.get("muted", false);
    wire(video); player.classList.add("sim"); $p("#sim-tag").hidden = false; $p("#spinner").hidden = true; 
    CW.toast("Demo stream unreachable — using simulated playback", "info");
    setTimeout(() => video.dispatchEvent(new Event("loadedmetadata")), 0);
  }

  if (CW.locked(m)) { $p("#gate").hidden = false; $p("#bigplay").hidden = true; player.classList.remove("idle"); $p(".p-controls").hidden = true; }
  else {
    videoEl.volume = Store.get("volume", 1); videoEl.muted = Store.get("muted", false); vol.value = videoEl.muted ? 0 : videoEl.volume;
    wire(videoEl);
    videoEl.addEventListener("waiting", () => ($p("#spinner").hidden = false));
    ["playing", "canplay"].forEach((ev) => videoEl.addEventListener(ev, () => ($p("#spinner").hidden = true)));
    let wd;
    const fail = () => { clearTimeout(wd); if (sim) return; if (++srcIndex < sources.length) { start(); } else useSimulation(); };
    const start = () => { clearTimeout(wd); videoEl.src = sources[srcIndex]; wd = setTimeout(() => { if (!dur && !sim) fail(); }, 8000); };
    videoEl.addEventListener("error", fail);
    videoEl.addEventListener("loadedmetadata", () => clearTimeout(wd));
    start();
    addEventListener("pagehide", () => save());
  }

  /* ---- controls ---- */
  seek.addEventListener("input", () => { dragging = true; paintSeek(); if (dur) timeEl.textContent = `${fmt((seek.value / 1000) * dur)} / ${fmt(dur)}`; });
  seek.addEventListener("change", () => { if (dur) video.currentTime = (seek.value / 1000) * dur; dragging = false; });
  vol.addEventListener("input", () => { video.volume = vol.value; video.muted = vol.value == 0; Store.set("volume", Number(vol.value) || 0.5); Store.set("muted", video.muted); });
  const acts = {
    play: togglePlay, prev: () => go(prev), next: () => go(next), full: fullscreen,
    back: () => (video.currentTime = Math.max(0, video.currentTime - 10)), fwd: () => (video.currentTime = Math.min(dur, video.currentTime + 10)),
    party: () => pty.toggle(),
    theater: () => { const on = $(".watch-layout", root).classList.toggle("theater"); Store.set("theater", on); },
    pip: () => { if (sim) return CW.toast("Mini player needs the real video stream", "info"); (document.pictureInPictureElement ? document.exitPictureInPicture() : videoEl.requestPictureInPicture()).catch(() => CW.toast("Mini player isn't available here", "error")); },
    mute: () => { video.muted = !video.muted; if (!video.muted && video.volume === 0) video.volume = 0.5; vol.value = video.muted ? 0 : video.volume; Store.set("muted", video.muted); },
  };
  player.addEventListener("click", (e) => {
    const b = e.target.closest("[data-p]"); if (b) { acts[b.dataset.p](); return; }
    const mb = e.target.closest("[data-p-menu]");
    if (mb) { const el = $p("#menu-" + mb.dataset.pMenu), open = el.hidden; stopMenus(); el.hidden = !open; if (open) $("button", el).focus(); return; }
    const sz = e.target.closest("[data-subsize]");
    if (sz) { const order = ["Small", "Medium", "Large"], nx = order[(order.indexOf(Store.settings().subSize || "Medium") + 1) % 3]; Store.setSetting("subSize", nx); applyCapSize(); sz.textContent = "Text size: " + nx; return; }
    const choice = e.target.closest(".p-menu button");
    if (choice) {
      const id = choice.parentElement.id.replace("menu-", ""), val = choice.textContent.replace(" (Normal)", "").trim();
      if (id === "speed") { video.playbackRate = parseFloat(val); Store.set("speed", parseFloat(val)); }
      if (id === "audio") CW.toast("Audio: " + val + " (demo — single track)", "info");
      if (id === "subs") { Store.setSetting("subtitle", val); setCaption(); CW.toast(val === "Off" ? "Subtitles off" : `${val} demo subtitles on`, "info"); }
      if (id === "quality") {
        if (val === "4K" && Store.plan() !== "premium") { CW.toast("4K needs the Premium plan", "error"); return; }
        Store.setSetting("quality", val); $p("#spinner").hidden = false; setTimeout(() => ($p("#spinner").hidden = true), 700);
        $p("#q-badge").textContent = val === "4K" ? "4K" : val === "Auto" ? "HD" : val; CW.toast(`Quality: ${val} (demo — single source)`, "info");
      }
      $$("button", choice.parentElement).forEach((x) => x.setAttribute("aria-checked", x === choice)); stopMenus(); return;
    }
    if (e.target === videoEl || e.target.id === "bigplay" || e.target === player) { stopMenus(); togglePlay(); }
  });
  function applyCapSize() { const z = { Small: 0.8, Medium: 1, Large: 1.4 }[Store.settings().subSize || "Medium"]; $p("#captions").style.setProperty("--cap-scale", z); }
  applyCapSize();
  const subsMenu = $p("#menu-subs"); subsMenu.insertAdjacentHTML("beforeend", '<button type="button" role="menuitem" data-subsize>Text size: ' + (Store.settings().subSize || "Medium") + "</button>");
  if (Store.get("theater", false)) $(".watch-layout", root).classList.add("theater");
  player.addEventListener("dblclick", (e) => {
    if (e.target.closest(".p-controls,.p-menu,.p-top,.p-overlay")) return;
    const r = player.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
    if (x < 0.35) { acts.back(); CW.toast("−10s", "info"); } else if (x > 0.65) { acts.fwd(); CW.toast("+10s", "info"); }
  });
  $p("#skip-intro").addEventListener("click", () => { video.currentTime = 15; CW.toast("Intro skipped", "info"); });
  ["pointermove", "pointerdown", "keydown", "touchstart"].forEach((ev) => player.addEventListener(ev, showControls, { passive: true }));
  document.addEventListener("fullscreenchange", () => player.classList.toggle("is-fs", !!document.fullscreenElement));
  document.addEventListener("keydown", (e) => {
    if (e.target.closest("input:not(.seek):not(#vol),select,textarea") || e.ctrlKey || e.metaKey || e.altKey || CW.locked(m)) return;
    const k = e.key.toLowerCase(), map = { " ": togglePlay, k: togglePlay, j: acts.back, l: acts.fwd, arrowleft: acts.back, arrowright: acts.fwd, m: acts.mute, f: fullscreen, t: acts.theater, p: acts.party, c: () => { const cur = Store.settings().subtitle; Store.setSetting("subtitle", cur === "Off" ? "English" : "Off"); setCaption(); CW.toast(cur === "Off" ? "English demo subtitles on" : "Subtitles off", "info"); },
      arrowup: () => { video.muted = false; video.volume = Math.min(1, video.volume + 0.1); vol.value = video.volume; }, arrowdown: () => { video.volume = Math.max(0, video.volume - 0.1); vol.value = video.volume; } };
    if (map[k] && !(e.target.closest("button,a") && (k === " "))) { e.preventDefault(); map[k](); showControls(); }
  });
  const eff = Store.settings().quality; if (eff !== "Auto") $p("#q-badge").textContent = eff === "4K" && Store.plan() !== "premium" ? "HD" : eff;
})();
