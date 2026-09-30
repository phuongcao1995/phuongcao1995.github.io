/* CineWave — movies.js
   Browsing pages: home, movies, series, genres, movie-detail, my-list, history.
   Each page is a small function; the dispatcher at the bottom picks one from <body data-page>. */
(() => {
  const { $, $$, esc, t, icon, param, catalog, sorted, card, row, load, grid, empty, errorState, filterFields, readForm } = CW;
  const kids = CW.profile.kids;
  const fmtDate = (ts) => new Date(ts).toLocaleString(Store.get("lang", "en") === "vi" ? "vi-VN" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const heroMeta = (m) => `<span class="badge q solid">${CW.bestQuality(m)}</span>${CW.rate(m)}<span>${m.year}</span><span>${CW.runtime(m)}</span><span>${m.genres.join(", ")}</span><span class="age">${m.ageRating}</span>`;

  /* ---------- hero carousel (also used by the series page) ---------- */
  function buildHero(el, items) {
    if (!items.length) return el.remove();
    el.innerHTML = items.map((m, i) => `<article class="slide${i ? "" : " active"}" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${items.length}">
        <img class="slide-bg" src="${DATA.backdrop(m)}" alt="" ${i ? 'loading="lazy"' : ""} decoding="async"><div class="slide-shade"></div>
        <div class="container slide-content"><p class="eyebrow">${kids ? "Picked for kids" : i === 0 ? "Featured tonight" : "Featured"} · ${esc(m.country)}</p>
          <h2>${esc(m.title)}</h2><p class="chips">${heroMeta(m)}</p><p class="desc">${esc(m.description)}</p>
          <div class="btn-row"><a class="btn btn-primary btn-lg" href="${CW.playUrl(m)}">${icon("play")} ${t("Watch Now")}</a>${CW.listBtn(m, { label: true, cls: "btn btn-ghost btn-lg" })}<a class="btn btn-ghost btn-lg" href="movie-detail.html?id=${m.id}">${icon("info")} ${t("More Info")}</a></div></div></article>`).join("")
      + `<div class="container hero-ctrl"><div class="dots" role="group" aria-label="Choose featured title">${items.map((m, i) => `<button type="button" class="${i ? "" : "on"}" aria-label="Show ${esc(m.title)}" aria-current="${i === 0}"></button>`).join("")}</div>
        <div class="hero-arrows"><button type="button" class="icon-btn glass" data-hero="-1" aria-label="Previous title">${icon("chevL")}</button><button type="button" class="icon-btn glass" data-hero="1" aria-label="Next title">${icon("chevR")}</button></div></div>`;
    const slides = $$(".slide", el), dots = $$(".dots button", el);
    let cur = 0, timer, hold = false;
    const show = (i) => {
      cur = (i + slides.length) % slides.length;
      slides.forEach((s, k) => { s.classList.toggle("active", k === cur); s.inert = k !== cur; });
      dots.forEach((d, k) => { d.classList.toggle("on", k === cur); d.setAttribute("aria-current", k === cur); });
    };
    slides.forEach((s, k) => (s.inert = k !== 0));
    const start = () => { clearInterval(timer); if (!matchMedia("(prefers-reduced-motion: reduce)").matches && items.length > 1) timer = setInterval(() => !hold && show(cur + 1), 7000); };
    el.addEventListener("click", (e) => { const b = e.target.closest("[data-hero]"); if (b) { show(cur + Number(b.dataset.hero)); start(); } });
    dots.forEach((d, k) => d.addEventListener("click", () => { show(k); start(); }));
    ["mouseenter", "focusin"].forEach((ev) => el.addEventListener(ev, () => (hold = true)));
    ["mouseleave", "focusout"].forEach((ev) => el.addEventListener(ev, () => (hold = false)));
    let x0 = null;
    el.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
    el.addEventListener("touchend", (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) { show(cur + (dx < 0 ? 1 : -1)); start(); } x0 = null; }, { passive: true });
    start();
  }

  /* ---------- home ---------- */
  function home() {
    const cat = catalog();
    const pinned = Store.get("featured", []).map((id) => CW.getM(id)).filter((m) => m && cat.includes(m));
    buildHero($("#hero"), [...pinned, ...sorted(cat, "trending").filter((m) => !pinned.includes(m))].slice(0, 6));
    const q = (fn) => cat.filter(fn);
    const byGenre = (g) => sorted(q((m) => m.genres.includes(g)), "rating").slice(0, 14);
    const byCountry = (c) => sorted(q((m) => m.region === c), "trending").slice(0, 14);
    const cont = Store.continueWatching().filter((h) => CW.getM(h.id));
    load($("#home-rows"), () => {
      let html = "";
      if (kids) {
        html += `<div class="kids-banner"><div>${icon("star")}</div><div><h2>Welcome to Kids Mode</h2><p>Safe, family-friendly picks. Grown-up titles are hidden.</p></div></div>`;
      }
      if (cont.length) html += row({ id: "continue", title: t("Continue Watching"), items: cont, cardFn: CW.cwCard, cls: "wide" });
      html += row({ id: "trending", title: t("Trending Now"), items: sorted(cat, "trending").slice(0, 14), href: "movies.html?sort=trending" });
      if (kids) {
        html += row({ title: "Animation", items: byGenre("Animation"), href: "genres.html?g=Animation" }) + row({ title: "Family", items: byGenre("Family"), href: "genres.html?g=Family" })
          + row({ title: "Educational", items: byGenre("Documentary"), href: "genres.html?g=Documentary" }) + row({ title: t("Popular Series"), items: sorted(q((m) => m.type === "series"), "rating"), href: "series.html" })
          + row({ title: t("New Releases"), items: sorted(cat, "new").slice(0, 14), href: "movies.html?sort=new" });
        return html;
      }
      html += row({ title: t("Popular Movies"), items: sorted(q((m) => m.type === "movie"), "trending").slice(0, 14), href: "movies.html" })
        + row({ id: "new", title: t("New Releases"), items: sorted(cat, "new").slice(0, 14), href: "movies.html?sort=new" })
        + row({ title: t("Top Rated"), items: sorted(cat, "rating").slice(0, 14), href: "movies.html?sort=rating" })
        + row({ id: "picks", title: t("Recommended For You"), items: CW.recommend({ limit: 14 }), cardFn: (x) => card(x.m, { match: x.match, reason: x.reason }) })
        + CW.becauseRows().map((b) => row({ title: "Because you watched " + b.src.title, items: b.items })).join("");
      ["Action", "Comedy", "Romance", "Horror", "Sci-Fi"].forEach((g) => (html += row({ title: t(g), items: byGenre(g), href: `genres.html?g=${encodeURIComponent(g)}` })));
      [["Vietnamese Movies", "Vietnam"], ["Korean Movies", "South Korea"], ["Chinese Movies", "China"], ["US Movies", "US"]].forEach(([title, c]) => (html += row({ title: t(title), items: byCountry(c), href: `movies.html?country=${encodeURIComponent(c)}` })));
      html += row({ title: "European Picks", items: byCountry("Europe") });
      return html + `<section class="row" aria-label="${t("Browse by Genre")}"><div class="row-head"><h2>${t("Browse by Genre")}</h2></div><div class="chip-row">${DATA.GENRES.map((g) => `<a class="chip" href="genres.html?g=${encodeURIComponent(g)}">${t(g)}</a>`).join("")}</div></section>`;
    }, "row");
    if (location.hash) setTimeout(() => { const el = $(location.hash); el && el.scrollIntoView(); }, 400);
  }

  /* ---------- movies / series listing ---------- */
  function listing(type) {
    const fields = ["genre", "country", "year", "quality", "rating", "sort"];
    const form = $("#filters"), out = $("#results"), count = $("#count");
    const init = Object.fromEntries(fields.map((f) => [f, param(f) || ""]));
    form.innerHTML = filterFields(fields, init) + '<button type="reset" class="btn btn-ghost btn-sm" id="reset">Clear</button>';
    const render = (first) => {
      const f = readForm(form);
      const items = CW.applyFilters(sorted(catalog().filter((m) => m.type === type), f.sort || "trending"), f);
      count.textContent = `${items.length} ${type === "movie" ? "movies" : "series"}`;
      const p = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && !(k === "sort" && v === "trending")));
      try { history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "")); } catch (e) {}
      const active = Object.entries(f).some(([k, v]) => v && k !== "sort");
      $("#extra") && ($("#extra").hidden = active);
      if (first) load(out, () => { grid(out, items); }, "grid");
      else grid(out, items, { emptyHtml: empty({ ic: "search", title: "No matches", text: "No titles match these filters. Try widening your search.", action: { href: location.pathname, label: "Reset filters" } }) });
    };
    form.addEventListener("change", () => render(false));
    form.addEventListener("reset", (e) => { e.preventDefault(); $$("select", form).forEach((s) => (s.value = s.name === "sort" ? "trending" : "")); render(false); });
    render(true);
    if (type === "series") {
      const cat = catalog().filter((m) => m.type === "series");
      buildHero($("#series-hero"), sorted(cat, "rating").slice(0, 4));
      const cont = Store.continueWatching().filter((h) => CW.getM(h.id)?.type === "series");
      $("#extra").innerHTML = row({ title: t("Continue Watching"), items: cont, cardFn: CW.cwCard, cls: "wide" }) + row({ title: t("Popular Series"), items: sorted(cat, "trending").slice(0, 12) }) + row({ title: t("New Series"), items: sorted(cat, "new").slice(0, 12) });
      $("#extra").hidden = Object.entries(readForm(form)).some(([k, v]) => v && k !== "sort");
    }
  }

  /* ---------- genres ---------- */
  function genres() {
    const cat = catalog(), g = param("g");
    const list = DATA.GENRES.filter((x) => cat.some((m) => m.genres.includes(x)));
    $("#genre-tiles").innerHTML = list.map((x, i) => `<a class="genre-tile" style="--h:${(i * 47) % 360}" href="genres.html?g=${encodeURIComponent(x)}" ${x === g ? 'aria-current="true"' : ""}><b>${t(x)}</b><span>${cat.filter((m) => m.genres.includes(x)).length} titles</span></a>`).join("");
    const out = $("#results"), head = $("#genre-head");
    if (!g || !list.includes(g)) {
      head.textContent = "Pick a genre to start browsing";
      $("#filters").hidden = true;
      return load(out, () => row({ title: t("Trending Now"), items: sorted(cat, "trending").slice(0, 14) }), "row");
    }
    head.textContent = t(g);
    const form = $("#filters"); form.hidden = false;
    form.innerHTML = filterFields(["type", "country", "year", "sort"], { sort: param("sort") || "trending" });
    const render = () => { const f = readForm(form); grid(out, CW.applyFilters(sorted(cat.filter((m) => m.genres.includes(g)), f.sort), f)); };
    form.addEventListener("change", render);
    load(out, () => { render(); }, "grid");
  }

  /* ---------- movie detail ---------- */
  function detail() {
    const m = CW.getM(param("id")), hero = $("#detail-hero"), body = $("#detail-body");
    if (!m || (kids && !CW.kidSafe(m))) {
      hero.remove();
      body.innerHTML = m ? empty({ ic: "lock", title: "Not available in Kids Mode", text: "Switch to another profile to view this title.", action: { href: "index.html", label: "Back to home" } }) : errorState("We couldn't find that title.");
      return;
    }
    document.title = `${m.title} (${m.year}) · CineWave`;
    const cont = Store.continueWatching().find((h) => h.id === m.id), sum = Social.summary(m);
    const playLabel = cont ? (m.type === "series" ? `Continue S${cont.s}:E${cont.e}` : "Continue Watching") : t("Watch Now");
    const plan = { standard: "Standard", premium: "Premium" }[m.tier];
    hero.innerHTML = `<img class="slide-bg" src="${DATA.backdrop(m)}" alt=""><div class="slide-shade"></div>
      <div class="container detail-grid"><img class="detail-poster" src="${DATA.poster(m)}" alt="Poster of ${esc(m.title)}" width="300" height="450">
        <div class="detail-info"><p class="eyebrow">${m.type === "series" ? `TV Series · ${m.seasons} season${m.seasons > 1 ? "s" : ""}` : "Movie"}</p><h1>${esc(m.title)}</h1>
          <p class="alt-titles"><span><b>Original:</b> ${esc(m.originalTitle)}</span><span><b>Tiếng Việt:</b> ${esc(m.viTitle)}</span></p>
          <p class="chips">${heroMeta(m)}<span>${esc(m.country)}</span>${sum.count ? `<a class="community" href="#reviews" aria-label="Community rating ${sum.avg.toFixed(1)} out of 5 from ${sum.count} reviews">${CW.stars(sum.avg)} ${sum.avg.toFixed(1)} (${sum.count})</a>` : ""}</p>
          ${cont ? `<p class="resume-line"><span class="progress-inline"><i style="width:${Math.round(cont.pct * 100)}%"></i></span> ${Math.round(cont.pct * 100)}% watched${m.type === "series" ? ` · S${cont.s}:E${cont.e}` : ""}</p>` : ""}
          <p class="genre-links">${m.genres.map((g) => `<a class="chip" href="genres.html?g=${encodeURIComponent(g)}">${esc(g)}</a>`).join("")}</p>
          <p class="desc">${esc(m.description)}</p>
          <p class="credit"><b>Director:</b> ${esc(m.director)}</p><p class="credit"><b>Starring:</b> ${m.cast.map(esc).join(", ")}</p>
          <div class="btn-row"><a class="btn btn-primary btn-lg" href="${CW.playUrl(m)}">${icon("play")} ${playLabel}</a>${cont ? `<a class="btn btn-ghost btn-lg" href="${CW.playUrl(m)}&restart=1">${icon("rewind")} Start over</a>` : ""}<button type="button" class="btn btn-ghost btn-lg" data-action-trailer>${icon("film")} ${t("Trailer")}</button>${CW.listBtn(m, { label: true, cls: "btn btn-ghost btn-lg" })}</div>
          ${CW.locked(m) ? `<p class="notice">${icon("lock")} This title needs the <b>${plan}</b> plan. <a href="subscription.html">View plans</a></p>` : ""}</div></div>`;
    $("[data-action-trailer]", hero).addEventListener("click", () => CW.trailer(m));
    const info = [["Country", m.country], ["Year", m.year], ["Genre", m.genres.join(", ")], ["Duration", m.type === "series" ? `${m.duration} minutes per episode` : `${m.duration} minutes`], ["Quality", m.quality.join(", ")], ["Audio", m.audio.join(", ")], ["Subtitle", m.subtitles.join(", ")], ["Age rating", m.ageRating], ["Director", m.director], ["Access", m.tier[0].toUpperCase() + m.tier.slice(1)]];
    const related = sorted(catalog().filter((x) => x.id !== m.id && x.genres.some((g) => m.genres.includes(g))), "rating")
      .sort((a, b) => b.genres.filter((g) => m.genres.includes(g)).length - a.genres.filter((g) => m.genres.includes(g)).length).slice(0, 14);
    body.innerHTML = `${m.type === "series" ? `<section class="block" id="episodes" aria-labelledby="ep-h"><div class="block-head"><h2 id="ep-h">Seasons &amp; Episodes</h2><label class="field inline"><span class="sr-only">Season</span><select id="season" aria-label="Season">${Array.from({ length: m.seasons }, (_, i) => `<option value="${i + 1}">Season ${i + 1}</option>`).join("")}</select></label></div><p class="season-prog" id="season-prog"></p><ul class="ep-list" id="ep-list"></ul></section>` : ""}
      <section class="block" aria-labelledby="info-h"><h2 id="info-h">Movie Information</h2><dl class="info-grid">${info.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl></section>
      <section class="block" aria-labelledby="cast-h"><h2 id="cast-h">Cast</h2><ul class="cast">${[m.director, ...m.cast].map((n, i) => `<li><a href="search.html?q=${encodeURIComponent(n)}" class="cast-card"><span class="avatar lg" style="--h:${(CW.norm(n).length * 37 + i * 61) % 360}">${esc(n.charAt(0))}</span><b>${esc(n)}</b><small>${i ? "Actor" : "Director"}</small></a></li>`).join("")}</ul></section>
      <section class="block" aria-labelledby="tr-h"><h2 id="tr-h">Trailer</h2><button type="button" class="trailer-card" data-action-trailer2 aria-label="Play trailer for ${esc(m.title)}"><img src="${DATA.backdrop(m)}" alt="" loading="lazy" width="1280" height="720"><span class="play-fab lg">${icon("play")}</span><span class="trailer-cap">${esc(m.title)} — Official trailer (simulated)</span></button></section>
      <section class="block" id="reviews" aria-labelledby="rev-h"></section>
      ${row({ title: "Related Movies", items: related })}`;
    Social.mountReviews($("#reviews", body), m);
    $("[data-action-trailer2]", body).addEventListener("click", () => CW.trailer(m));
    if (m.type === "series") {
      let renderEps = (s) => {
        $("#ep-list").innerHTML = DATA.episodes(m, s).map((ep) => {
          const h = Store.getProgress(m.id, s, ep.n), pct = h ? Math.round(h.pct * 100) : 0, url = `watch.html?id=${m.id}&s=${s}&e=${ep.n}`;
          return `<li class="ep"><a class="ep-thumb" href="${url}" aria-label="Play episode ${ep.n}"><img src="${ep.thumb}" alt="" loading="lazy" width="320" height="180">${pct ? `<span class="progress"><i style="width:${pct}%"></i></span>` : ""}</a>
            <div class="ep-info"><h3>Episode ${ep.n} — ${esc(ep.title)}</h3><p class="muted small">${ep.duration} min${pct ? ` · ${pct >= 95 ? "Watched" : pct + "% watched"}` : ""}</p><p class="ep-desc">${esc(ep.description)}</p><button type="button" class="btn btn-ghost btn-sm ep-mark" data-mark="${ep.n}" aria-pressed="${pct >= 95}">${pct >= 95 ? "✓ Watched" : "Mark watched"}</button></div>
            <a class="btn-icon primary" href="${url}" aria-label="Play episode ${ep.n}">${icon("play")}</a></li>`;
        }).join("");
      };
      const renderProg = (s) => {
        const eps = DATA.episodes(m, s), done = eps.filter((ep) => (Store.getProgress(m.id, s, ep.n)?.pct || 0) >= 0.95).length;
        $("#season-prog").innerHTML = `<span class="progress-inline"><i style="width:${(done / eps.length) * 100}%"></i></span> ${done} of ${eps.length} episodes watched`;
      };
      const _render = renderEps; renderEps = (s) => { _render(s); renderProg(s); };
      $("#ep-list").addEventListener("click", (e) => {
        const b = e.target.closest("[data-mark]"); if (!b) return;
        const s = Number($("#season").value), n = Number(b.dataset.mark), done = (Store.getProgress(m.id, s, n)?.pct || 0) >= 0.95;
        if (done) Store.removeHistory(Store.hKey({ id: m.id, s, e: n })); else Store.saveProgress(m.id, s, n, 1);
        renderEps(s); CW.toast(done ? "Marked as unwatched" : "Marked as watched", "info");
      });
      const sel = $("#season"); if (cont) sel.value = cont.s;
      renderEps(Number(sel.value)); sel.addEventListener("change", () => renderEps(Number(sel.value)));
    }
  }

  /* ---------- my list ---------- */
  function myList() {
    const form = $("#filters"), out = $("#results");
    const inList = () => Store.getList().map((x) => ({ ...x, m: CW.getM(x.id) })).filter((x) => x.m && (!kids || CW.kidSafe(x.m)));
    form.innerHTML = filterFields(["type", "genre"], {}) + `<label class="field"><span>Sort by</span><select name="sort"><option value="added">Recently added</option><option value="title">Title A–Z</option><option value="rating">Rating</option><option value="year">Year</option></select></label>`;
    const render = () => {
      const all = inList(), f = readForm(form);
      let items = all.filter((x) => (!f.type || x.m.type === f.type) && (!f.genre || x.m.genres.includes(f.genre)));
      if (f.sort === "title") items.sort((a, b) => CW.SORT.title(a.m, b.m)); else if (f.sort === "rating") items.sort((a, b) => CW.SORT.rating(a.m, b.m)); else if (f.sort === "year") items.sort((a, b) => CW.SORT.year(a.m, b.m));
      $("#count").textContent = `${all.length} saved`;
      form.hidden = !all.length;
      if (!all.length) out.innerHTML = empty({ ic: "plus", title: "Your list is empty", text: "Tap the + on any title to save it here for later.", action: { href: "movies.html", label: "Browse movies" } });
      else grid(out, items.map((x) => x.m), { cardFn: (m) => `<div class="mylist-item">${card(m)}<button type="button" class="btn btn-ghost btn-sm" data-action="toggle-list" data-id="${m.id}">${icon("trash")} Remove</button></div>`, emptyHtml: empty({ ic: "search", title: "Nothing matches these filters", text: "Try a different genre or type." }) });
    };
    form.addEventListener("change", render);
    document.addEventListener("cw:list", render);
    render();
  }

  /* ---------- history ---------- */
  function historyPage() {
    const out = $("#results"), clear = $("#clear");
    const render = () => {
      const items = Store.getHistory().filter((h) => CW.getM(h.id));
      clear.hidden = !items.length;
      if (!items.length) { out.innerHTML = empty({ ic: "clock", title: "No watch history yet", text: "Titles you watch will show up here.", action: { href: "index.html", label: "Find something to watch" } }); return; }
      out.innerHTML = `<ul class="hist-list">${items.map((h) => {
        const m = CW.getM(h.id), ep = m.type === "series" ? DATA.episodes(m, h.s)[h.e - 1] : null, pct = Math.round(h.pct * 100), done = pct >= 95, url = `watch.html?id=${m.id}&s=${h.s}&e=${h.e}`;
        return `<li class="hist-item"><a class="hist-thumb" href="${url}" tabindex="-1" aria-hidden="true"><img src="${ep ? ep.thumb : DATA.backdrop(m)}" alt="" loading="lazy" width="320" height="180"><span class="progress"><i style="width:${pct}%"></i></span></a>
          <div class="hist-info"><h3><a href="movie-detail.html?id=${m.id}">${esc(m.title)}</a></h3><p class="muted small">${esc(CW.epLabel(m, h))}</p><p class="small"><span class="muted">Watched ${fmtDate(h.at)}</span> · ${done ? "Finished" : pct + "% complete"}</p></div>
          <div class="hist-actions"><a class="btn btn-primary btn-sm" href="${url}">${icon("play")} ${done ? "Watch again" : t("Continue Watching")}</a><button type="button" class="btn btn-ghost btn-sm" data-remove="${Store.hKey(h)}" aria-label="Remove ${esc(m.title)} from history">${icon("trash")}<span class="hide-sm"> Remove</span></button></div></li>`;
      }).join("")}</ul>`;
    };
    out.addEventListener("click", (e) => { const b = e.target.closest("[data-remove]"); if (b) { Store.removeHistory(b.dataset.remove); render(); CW.toast("Removed from history", "info"); } });
    clear.addEventListener("click", async () => { if (await CW.confirm("Clear watch history?", "This also clears your Continue Watching progress for this profile.", "Clear history")) { Store.clearHistory(); render(); CW.toast("Watch history cleared", "success"); } });
    render();
  }

  const pages = { home, movies: () => listing("movie"), series: () => listing("series"), genres, detail, mylist: myList, history: historyPage };
  const run = pages[document.body.dataset.page];
  if (run) run();
})();
