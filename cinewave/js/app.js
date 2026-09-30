/* CineWave — app.js
   Shared shell + reusable components: layout (header, drawer, bottom nav, footer), icons, cards, rows,
   filters, search core, toasts, modals, notifications, profile switching, theme and i18n.
   Page-specific behaviour lives in movies.js / player.js / search.js / auth.js. */
const CW = (() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const param = (k) => new URLSearchParams(location.search).get(k);
  const page = document.body.dataset.page;

  /* ---------- i18n (English keys; Vietnamese overrides) ---------- */
  const VI = {
    Home: "Trang chủ", Movies: "Phim lẻ", "TV Series": "Phim bộ", Genres: "Thể loại", Trending: "Xu hướng", "New Releases": "Mới phát hành", "My List": "Danh sách của tôi",
    Search: "Tìm kiếm", "Watch Now": "Xem ngay", "More Info": "Chi tiết", "Add to My List": "Thêm vào danh sách", "In My List": "Trong danh sách", Trailer: "Trailer",
    "Trending Now": "Đang thịnh hành", "Popular Movies": "Phim phổ biến", "Top Rated": "Đánh giá cao", "Recommended For You": "Dành cho bạn", "Continue Watching": "Xem tiếp",
    Action: "Hành động", Comedy: "Hài hước", Romance: "Lãng mạn", Horror: "Kinh dị", "Sci-Fi": "Khoa học viễn tưởng", "Vietnamese Movies": "Phim Việt Nam",
    "Korean Movies": "Phim Hàn Quốc", "Chinese Movies": "Phim Trung Quốc", "US Movies": "Phim Mỹ", "Sign in": "Đăng nhập", "Sign out": "Đăng xuất", Notifications: "Thông báo",
    "Mark all as read": "Đánh dấu đã đọc", "Watch history": "Lịch sử xem", Profile: "Hồ sơ", Subscription: "Gói thành viên", "See all": "Xem tất cả", "Popular Series": "Phim bộ nổi bật",
    "New Series": "Phim bộ mới", "Browse by Genre": "Khám phá theo thể loại", "Kids Mode": "Chế độ trẻ em", Menu: "Menu",
  };
  const lang = Store.get("lang", "en");
  const t = (k) => (lang === "vi" && VI[k]) || k;
  document.documentElement.lang = lang;

  /* ---------- icons ---------- */
  const ICONS = {
    play: ['<polygon points="7 4 20 12 7 20"/>', 1], pause: ['<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>', 1],
    star: ['<polygon points="12 2 15.1 8.6 22 9.3 16.8 14 18.4 21 12 17.3 5.6 21 7.2 14 2 9.3 8.9 8.6"/>', 1],
    skipNext: ['<polygon points="5 4 15 12 5 20"/><rect x="17" y="4" width="2.5" height="16"/>', 1], skipPrev: ['<polygon points="19 4 9 12 19 20"/><rect x="4.5" y="4" width="2.5" height="16"/>', 1],
    plus: ["M12 5v14M5 12h14"], check: ["M20 6 9 17l-5-5"], x: ["M18 6 6 18M6 6l12 12"], menu: ["M4 6h16M4 12h16M4 18h16"],
    info: ['<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'],
    search: ['<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'],
    bell: ["M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"],
    home: ["m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"],
    film: ['<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 12h18M3 16h4M17 8h4M17 16h4"/>'],
    tv: ['<rect x="2" y="7" width="20" height="14" rx="2"/><path d="m17 2-5 5-5-5"/>'],
    user: ['<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'],
    chevL: ["m15 18-6-6 6-6"], chevR: ["m9 18 6-6-6-6"], chevD: ["m6 9 6 6 6-6"],
    volume: ["M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"],
    mute: ["M11 5 6 9H2v6h4l5 4zM22 9l-6 6M16 9l6 6"],
    full: ["M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"],
    cc: ['<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3"/>'],
    sliders: ["M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"],
    trash: ["M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"], clock: ['<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'],
    globe: ['<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/>'],
    grid: ["M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"], lock: ['<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'],
    alert: ['<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>'],
    users: ['<circle cx="9" cy="8" r="4"/><path d="M1 21a8 8 0 0 1 16 0M17 4a4 4 0 0 1 0 8M23 21a8 8 0 0 0-5-7.4"/>'],
    pip: ['<rect x="2" y="4" width="20" height="16" rx="2"/><rect x="12" y="12" width="7" height="5" rx="1" fill="currentColor"/>'],
    theater: ['<rect x="2" y="6" width="20" height="12" rx="2"/>'],
    chart: ["M3 3v18h18M7 15l4-5 3 3 5-7"],
    bolt: ["M13 2 3 14h9l-1 8 10-12h-9z"], rewind: ["M1 4v6h6M3.5 15a9 9 0 1 0 2.1-9.4L1 10"],
  };
  const icon = (n, cls = "") => {
    const [d, filled] = ICONS[n] || ICONS.info;
    const inner = d.startsWith("<") ? d : `<path d="${d}"/>`;
    return `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ${filled ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${inner}</svg>`;
  };

  /* ---------- formatting ---------- */
  const runtime = (m) => (m.type === "series" ? `${m.duration}m / ep` : `${Math.floor(m.duration / 60)}h ${String(m.duration % 60).padStart(2, "0")}m`);
  const bestQuality = (m) => (m.quality.includes("4K") ? "4K" : "HD");
  const ago = (ts) => { const s = (Date.now() - ts) / 1000; if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`; if (s < 86400) return `${Math.round(s / 3600)}h ago`; return `${Math.round(s / 86400)}d ago`; };
  const money = (v) => new Intl.NumberFormat("vi-VN").format(v) + "₫";
  const getM = (id) => DATA.byId.get(Number(id));
  const user = () => { try { const s = sessionStorage.getItem("cw:session"); if (s) return JSON.parse(s); } catch (e) {} return Store.get("user", null); };
  const locked = (m) => DATA.TIER_RANK[m.tier] > DATA.TIER_RANK[Store.plan()];
  const profile = Store.activeProfile();

  /* ---------- catalogue access (kids mode aware) ---------- */
  const kidSafe = (m) => DATA.ageNum(m.ageRating) <= 7 && !m.genres.some((g) => ["Horror", "Crime", "Thriller"].includes(g));
  const hiddenIds = new Set(Store.get("hidden", []));
  const catalog = () => DATA.movies.filter((m) => !hiddenIds.has(m.id) && (!profile.kids || kidSafe(m)));
  const SORT = {
    trending: (a, b) => b.trend - a.trend, rating: (a, b) => b.rating - a.rating,
    new: (a, b) => b.year - a.year || a.addedDaysAgo - b.addedDaysAgo, year: (a, b) => b.year - a.year, title: (a, b) => a.title.localeCompare(b.title),
  };
  const sorted = (items, key = "trending") => [...items].sort(SORT[key] || SORT.trending);

  /* ---------- search core (diacritic-insensitive) ---------- */
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
  const hay = (m) => m._h || (m._h = norm([m.title, m.originalTitle, m.viTitle, m.director, m.cast.join(" "), m.genres.join(" "), m.country, m.region, m.year, m.type === "series" ? "series tv phim bo" : "movie phim le"].join(" | ")));
  const listOf = (v) => (Array.isArray(v) ? v : String(v || "").split(",").filter(Boolean));
  function applyFilters(items, f = {}) {
    const genres = listOf(f.genre), watched = f.unwatched ? new Set(Store.getHistory().filter((h) => h.pct >= 0.95).map((h) => h.id)) : null;
    return items.filter((m) =>
      (!genres.length || genres.some((g) => m.genres.includes(g))) && (!f.country || m.region === f.country) && (!f.year || String(m.year) === String(f.year)) &&
      (!f.yearFrom || m.year >= Number(f.yearFrom)) && (!f.yearTo || m.year <= Number(f.yearTo)) &&
      (!f.rating || m.rating >= Number(f.rating)) && (!f.type || m.type === f.type) && (!f.quality || m.quality.includes(f.quality)) &&
      (!f.age || DATA.ageNum(m.ageRating) <= Number(f.age)) &&
      (!f.runtime || (f.runtime === "short" ? m.duration < 60 : f.runtime === "medium" ? m.duration >= 60 && m.duration <= 110 : m.duration > 110)) &&
      (!watched || !watched.has(m.id)));
  }
  /* "genre:action year:2025 rating:>8 actor:kim" style operators, extracted from the free text */
  function parseQuery(q) {
    const f = {}, ops = [];
    const rest = String(q || "").replace(/(\w+):("[^"]+"|\S+)/g, (all, k, v) => {
      v = v.replace(/"/g, ""); k = k.toLowerCase();
      const map = { genre: "genre", year: "year", country: "country", type: "type", quality: "quality", age: "age", rating: "rating", actor: "_p", director: "_p", cast: "_p" };
      if (!map[k]) return all;
      if (k === "type") v = /^(tv|series|show)/i.test(v) ? "series" : "movie";
      if (k === "genre") v = DATA.GENRES.find((g) => norm(g) === norm(v)) || v;
      if (k === "country") v = /^(korea|kr)/i.test(v) ? "South Korea" : /^(us|usa|america)/i.test(v) ? "US" : /^(eu|europe)/i.test(v) ? "Europe" : v[0].toUpperCase() + v.slice(1);
      if (k === "rating") v = v.replace(/[>=]/g, "");
      if (k === "quality") v = v.toUpperCase();
      if (map[k] === "_p") f._p = (f._p ? f._p + " " : "") + v; else f[map[k]] = v;
      ops.push(k + ":" + v); return " ";
    });
    return { text: rest.trim(), f, ops };
  }
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  const words = (m) => m._w || (m._w = new Set(hay(m).split(/[^a-z0-9]+/).filter((w) => w.length > 2)));
  /* token matches by substring, or (for longer tokens) within a small edit distance of a word: "smaurai" -> samurai */
  function tokenScore(m, k) {
    if (hay(m).includes(k)) return 1;
    if (k.length < 4) return 0;
    const maxD = k.length > 6 ? 2 : 1;
    for (const w of words(m)) if (Math.abs(w.length - k.length) <= maxD && lev(w, k) <= maxD) return 0.5;
    return 0;
  }
  function search(q, f = {}) {
    const p = parseQuery(q), flt = { ...f, ...p.f };
    if (p.f.genre && f.genre) flt.genre = [...listOf(f.genre), p.f.genre];
    const tokens = norm(p.text).split(/\s+/).filter(Boolean).concat(p.f._p ? norm(p.f._p).split(/\s+/) : []);
    const base = applyFilters(catalog(), flt);
    if (!tokens.length) return sorted(base, flt.sort && flt.sort !== "relevance" ? flt.sort : "trending");
    const scored = base.map((m) => {
      let s = 0; const title = norm(m.title + " " + m.viTitle + " " + m.originalTitle), people = norm(m.cast.join(" ") + " " + m.director);
      for (const k of tokens) { const t0 = tokenScore(m, k); if (!t0) return null; s += (title.startsWith(k) ? 6 : title.includes(k) ? 4 : people.includes(k) ? 2 : 1) * t0; }
      return { m, s };
    }).filter(Boolean);
    if (flt.sort && flt.sort !== "relevance") return sorted(scored.map((x) => x.m), flt.sort);
    return scored.sort((a, b) => b.s - a.s || b.m.trend - a.m.trend).map((x) => x.m);
  }
  function suggestions(q, max = 8) {
    const k = norm(q.trim()); if (!k) return [];
    const out = [], seen = new Set(), cat = catalog();
    const add = (type, label, href) => { const key = type + label; if (!seen.has(key) && out.length < max) { seen.add(key); out.push({ type, label, href }); } };
    cat.filter((m) => norm(m.title + " " + m.viTitle).includes(k)).sort(SORT.trending).slice(0, 5).forEach((m) => add("Title", m.title, `movie-detail.html?id=${m.id}`));
    DATA.GENRES.filter((g) => norm(g).includes(k)).forEach((g) => add("Genre", g, `genres.html?g=${encodeURIComponent(g)}`));
    cat.forEach((m) => { m.cast.forEach((c) => norm(c).includes(k) && add("Actor", c, `search.html?q=${encodeURIComponent(c)}`)); norm(m.director).includes(k) && add("Director", m.director, `search.html?q=${encodeURIComponent(m.director)}`); });
    return out;
  }

  /* ---------- toast / modal ---------- */
  function toast(msg, type = "info") {
    const box = $("#toasts"); if (!box) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `${icon(type === "error" ? "alert" : type === "success" ? "check" : "info")}<span>${esc(msg)}</span>`;
    box.append(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 250); }, 3200);
  }
  function modal({ title, body, actions = [], wide = false, onClose }) {
    const d = $("#modal");
    d.className = "modal" + (wide ? " wide" : "");
    d.setAttribute("aria-labelledby", "modal-title");
    d.innerHTML = `<div class="modal-box"><header><h2 id="modal-title">${esc(title)}</h2><button type="button" class="icon-btn" data-action="modal-close" aria-label="Close dialog">${icon("x")}</button></header><div class="modal-body">${body}</div>${actions.length ? `<footer>${actions.map((a, i) => `<button type="button" class="btn ${a.cls || "btn-ghost"}" data-modal-action="${i}">${esc(a.label)}</button>`).join("")}</footer>` : ""}</div>`;
    $$("[data-modal-action]", d).forEach((b) => b.addEventListener("click", () => { const a = actions[b.dataset.modalAction]; if (a.onClick) a.onClick(d); if (a.close !== false) d.close(); }));
    d.onclose = () => { d.innerHTML = ""; onClose && onClose(); };
    d.showModal();
    return d;
  }
  const confirmDialog = (title, msg, ok = "Confirm") => new Promise((res) => {
    let done = false;
    modal({ title, body: `<p>${esc(msg)}</p>`, onClose: () => !done && res(false), actions: [{ label: "Cancel" }, { label: ok, cls: "btn-primary", onClick: () => { done = true; res(true); } }] });
  });
  function trailer(m) {
    const d = modal({ title: `${m.title} — Trailer`, wide: true, body: `<div class="trailer-box"><video controls autoplay playsinline poster="${DATA.backdrop(m)}" src="${m.trailer}#t=0,45"></video></div><p class="muted small">Simulated trailer: a public open-licence demo clip stands in for real trailer footage.</p>`, actions: [{ label: "Watch now", cls: "btn-primary", onClick: () => (location.href = playUrl(m)) }] });
    $("video", d).addEventListener("error", () => { $(".trailer-box", d).innerHTML = `<div class="state" style="height:100%;border:0">${icon("film", "big")}<h3>Trailer unavailable</h3><p>The demo clip could not be loaded (are you offline?).</p></div>`; });
  }

  /* ---------- reusable components ---------- */
  const playUrl = (m) => {
    if (m.type !== "series") return `watch.html?id=${m.id}`;
    const h = Store.continueWatching().find((x) => x.id === m.id);
    return `watch.html?id=${m.id}&s=${h ? h.s : 1}&e=${h ? h.e : 1}`;
  };
  const rate = (m) => `<span class="rate">${icon("star")}${m.rating.toFixed(1)}</span>`;
  const listBtn = (m, { label = false, cls = "btn-icon" } = {}) => {
    const on = Store.inList(m.id);
    return `<button type="button" class="${cls} list-btn" data-action="toggle-list" data-id="${m.id}" aria-pressed="${on}" aria-label="My List: ${esc(m.title)}" data-tip="My List"><span class="off-only">${icon("plus")}${label ? `<span>${t("Add to My List")}</span>` : ""}</span><span class="on-only">${icon("check")}${label ? `<span>${t("In My List")}</span>` : ""}</span></button>`;
  };
  function card(m, o = {}) {
    return `<article class="card"><div class="card-poster">
      <img src="${DATA.poster(m)}" alt="Poster of ${esc(m.title)}" width="300" height="450" loading="lazy" decoding="async">
      <span class="badge q">${bestQuality(m)}</span><span class="badge kind">${m.type === "series" ? "Series" : "Movie"}</span>
      ${locked(m) ? `<span class="badge tier" data-tip="Requires ${m.tier} plan">${icon("lock")}${m.tier === "premium" ? "Premium" : "Standard"}</span>` : ""}
      <div class="card-overlay"><h4>${esc(m.title)}</h4><p class="ov-meta">${rate(m)}<span>${m.year}</span><span>${runtime(m)}</span><span class="age">${m.ageRating}</span></p><p class="ov-desc">${esc(m.description)}</p>
        <div class="ov-actions"><a class="btn-icon primary" href="${playUrl(m)}" aria-label="Play ${esc(m.title)}">${icon("play")}</a>${listBtn(m)}</div></div>
      <a class="card-link" href="movie-detail.html?id=${m.id}" aria-label="${esc(m.title)} — details"></a></div>
      <div class="card-body"><h3 class="card-title"><a href="movie-detail.html?id=${m.id}">${esc(m.title)}</a></h3><p class="card-meta">${o.match ? `<b class="match">${o.match}% match</b> · ` : ""}${m.year} · ${rate(m)} · ${runtime(m)}</p>${o.reason ? `<p class="card-reason">${esc(o.reason)}</p>` : ""}</div></article>`;
  }
  const epLabel = (m, h) => (m.type === "series" ? `S${h.s} · E${h.e} — ${DATA.episodes(m, h.s)[h.e - 1]?.title || ""}` : "Movie");
  function cwCard(h) {
    const m = getM(h.id); if (!m) return "";
    const ep = m.type === "series" ? DATA.episodes(m, h.s)[h.e - 1] : null, dur = ep ? ep.duration : m.duration;
    const pct = Math.round(h.pct * 100), left = Math.max(1, Math.round((1 - h.pct) * dur)), url = `watch.html?id=${m.id}&s=${h.s}&e=${h.e}`;
    return `<article class="cw-card"><a class="cw-thumb" href="${url}" aria-label="Continue ${esc(m.title)}"><img src="${ep ? ep.thumb : DATA.backdrop(m)}" alt="" loading="lazy" decoding="async" width="320" height="180"><span class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${pct}% watched"><i style="width:${pct}%"></i></span><span class="play-fab">${icon("play")}</span></a>
      <div class="cw-body"><h3>${esc(m.title)}</h3><p class="muted small">${esc(epLabel(m, h))}</p><p class="cw-stats"><b>${pct}%</b> watched · ${left} minutes remaining</p><a class="btn btn-primary btn-sm" href="${url}">${icon("play")} ${t("Continue Watching")}</a></div></article>`;
  }
  function row({ id = "", title, items, href = "", cardFn = card, cls = "" }) {
    if (!items.length) return "";
    return `<section class="row ${cls}" ${id ? `id="${id}"` : ""} aria-label="${esc(title)}"><div class="row-head"><h2>${esc(title)}</h2>${href ? `<a class="see-all" href="${href}">${t("See all")} ${icon("chevR")}</a>` : ""}</div>
      <div class="row-wrap"><button type="button" class="row-arrow prev" data-action="scroll" data-dir="-1" aria-label="Scroll left">${icon("chevL")}</button><div class="row-scroll" tabindex="0">${items.map((x) => cardFn(x)).join("")}</div><button type="button" class="row-arrow next" data-action="scroll" data-dir="1" aria-label="Scroll right">${icon("chevR")}</button></div></section>`;
  }
  const empty = ({ ic = "film", title, text = "", action }) => `<div class="state empty">${icon(ic, "big")}<h3>${esc(title)}</h3><p>${esc(text)}</p>${action ? `<a class="btn btn-primary" href="${action.href}">${esc(action.label)}</a>` : ""}</div>`;
  const errorState = (msg = "Something went wrong while loading this section.") => `<div class="state error" role="alert">${icon("alert", "big")}<h3>Couldn't load content</h3><p>${esc(msg)}</p><button type="button" class="btn btn-primary" data-action="reload">Try again</button></div>`;
  const skeleton = (kind = "row", n = 8) => kind === "row"
    ? `<div class="row"><div class="row-head"><span class="sk sk-line"></span></div><div class="row-scroll">${'<div class="card"><div class="sk sk-poster"></div><span class="sk sk-line"></span></div>'.repeat(n)}</div></div>`
    : `<div class="grid">${'<div class="card"><div class="sk sk-poster"></div><span class="sk sk-line"></span></div>'.repeat(n)}</div>`;
  /* show a skeleton, then render (simulates network latency); errors fall back to an error state */
  function load(el, fn, kind = "grid", ms = 280) {
    el.innerHTML = skeleton(kind); el.setAttribute("aria-busy", "true");
    setTimeout(() => { try { const r = fn(); if (typeof r === "string") el.innerHTML = r; } catch (e) { console.error(e); el.innerHTML = errorState(); } el.removeAttribute("aria-busy"); }, ms);
  }
  /* paged grid with a "Load more" button */
  function grid(el, items, { size = 24, cardFn = card, emptyHtml } = {}) {
    if (!items.length) { el.innerHTML = emptyHtml || empty({ ic: "search", title: "No titles found", text: "Try changing or clearing your filters." }); return; }
    let shown = 0;
    el.innerHTML = '<div class="grid"></div><div class="more"></div>';
    const g = $(".grid", el), more = $(".more", el);
    const next = () => {
      g.insertAdjacentHTML("beforeend", items.slice(shown, shown + size).map((x) => cardFn(x)).join(""));
      shown = Math.min(items.length, shown + size);
      more.innerHTML = shown < items.length ? `<button type="button" class="btn btn-ghost" data-more>Load more (${items.length - shown})</button>` : "";
      const b = $("[data-more]", more); if (b) b.onclick = next;
    };
    next();
  }
  /* shared filter bar markup */
  function filterFields(fields, v = {}) {
    const opts = {
      genre: ["Genre", DATA.GENRES], country: ["Country", ["Vietnam", "South Korea", "China", "Japan", "US", "Europe"]], year: ["Year", ["2026", "2025", "2024"]],
      rating: ["Rating", [["8", "8.0+"], ["7", "7.0+"], ["6", "6.0+"]]], type: ["Type", [["movie", "Movies"], ["series", "TV Series"]]], quality: ["Quality", ["HD", "4K"]],
      sort: ["Sort by", [["trending", "Trending"], ["rating", "Top rated"], ["new", "Newest"], ["title", "Title A–Z"]]],
    };
    return fields.map((f) => { const [label, list] = opts[f]; const all = f === "sort" ? "" : `<option value="">All</option>`;
      return `<label class="field"><span>${label}</span><select name="${f}">${all}${list.map((o) => { const [val, txt] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v[f] ?? (f === "sort" ? "trending" : "")) === String(val) ? "selected" : ""}>${esc(txt)}</option>`; }).join("")}</select></label>`; }).join("");
  }
  const readForm = (el) => Object.fromEntries($$("select[name],input[name]", el).filter((x) => x.type !== "checkbox" && x.type !== "radio" || x.checked).map((x) => [x.name, x.value]));

  /* ---------- hero-less helpers used by several pages ---------- */
  /* Smart recommendations: a taste profile from history (weighted by completion + recency), My List and the
     user's own star ratings, scored against every unseen title. Returns [{ m, match, reason }]. */
  function tasteProfile() {
    const w = { g: {}, c: {}, t: {} }, bump = (m, x) => { m.genres.forEach((g) => (w.g[g] = (w.g[g] || 0) + x)); w.c[m.region] = (w.c[m.region] || 0) + x * 0.6; w.t[m.type] = (w.t[m.type] || 0) + x * 0.4; };
    const now = Date.now(), ratings = Store.pget("ratings", {});
    Store.getHistory().forEach((h) => { const m = getM(h.id); if (m) bump(m, (0.4 + h.pct) * Math.exp(-(now - h.at) / (14 * 864e5))); });
    Store.getList().forEach((x) => { const m = getM(x.id); if (m) bump(m, 1.2); });
    Object.entries(ratings).forEach(([id, r]) => { const m = getM(id); if (m) bump(m, (r - 3) * 1.4); });
    const signal = Object.values(w.g).some((v) => v > 0);
    return { w, signal, ratings };
  }
  function recommend({ limit = 14, kind } = {}) {
    const { w, signal, ratings } = tasteProfile(), hist = Store.getHistory(), started = new Set(hist.map((h) => h.id));
    const watchedTitles = hist.map((h) => getM(h.id)).filter(Boolean);
    const gMax = Math.max(1, ...Object.values(w.g)), cMax = Math.max(1, ...Object.values(w.c));
    const out = catalog().filter((m) => !started.has(m.id) && !(m.id in ratings) && (!kind || m.type === kind)).map((m) => {
      const gs = m.genres.reduce((n, g) => n + (w.g[g] || 0), 0) / gMax / m.genres.length, cs = (w.c[m.region] || 0) / cMax, ts = (w.t[m.type] || 0) / gMax;
      const score = (signal ? gs * 3 + cs * 0.9 + ts * 0.4 : 0) + m.rating / 10 * 1.4 + m.trend / 140 + (m.year === 2026 ? 0.25 : 0);
      const top = m.genres.filter((g) => w.g[g] > 0).sort((a, b) => w.g[b] - w.g[a])[0];
      const shared = (x) => x.genres.filter((g) => m.genres.includes(g)).length;
      const like = watchedTitles.filter((x) => shared(x) || x.region === m.region).sort((a, b) => shared(b) - shared(a))[0];
      const reason = !signal ? (m.trend > 100 ? "Trending this week" : "Highly rated") : like && top ? "Because you watched " + like.title : top ? "You like " + top : "Popular right now";
      return { m, score, reason };
    }).sort((a, b) => b.score - a.score).slice(0, limit);
    const hi = out.length ? out[0].score : 1, lo = out.length ? out[out.length - 1].score : 0;
    return out.map((x) => ({ ...x, match: Math.round(72 + 26 * ((x.score - lo) / Math.max(0.01, hi - lo))) }));
  }
  const recommended = () => recommend().map((x) => x.m);
  /* "Because you watched X" rows: titles most similar to the last distinct things you watched */
  function becauseRows(n = 2) {
    const seen = new Set(), rows = [], done = new Set(Store.getHistory().filter((h) => h.pct >= 0.95).map((h) => h.id));
    for (const h of Store.getHistory()) {
      const src = getM(h.id); if (!src || seen.has(src.id) || rows.length >= n) continue; seen.add(src.id);
      const items = catalog().filter((m) => m.id !== src.id && !seen.has(m.id) && !done.has(m.id)).map((m) => ({ m, s: m.genres.filter((g) => src.genres.includes(g)).length * 2 + (m.region === src.region ? 1 : 0) + (m.type === src.type ? 0.5 : 0) + m.rating / 20 })).filter((x) => x.s >= 2).sort((a, b) => b.s - a.s).slice(0, 12).map((x) => x.m);
      if (items.length >= 4) rows.push({ src, items });
    }
    return rows;
  }
  const stars = (n, cls = "") => '<span class="stars ' + cls + '" role="img" aria-label="' + (+n).toFixed(1) + ' out of 5">' + [1, 2, 3, 4, 5].map((i) => '<i class="' + (n >= i - 0.25 ? "full" : n >= i - 0.75 ? "half" : "") + '">★</i>').join("") + "</span>";

  /* ---------- layout ---------- */
  function buildHeader() {
    const kids = profile.kids;
    let links = [["Home", "index.html", "home"], ["Movies", "movies.html", "movies"], ["TV Series", "series.html", "series"], ["Genres", "genres.html", "genres"], ["Trending", "index.html#trending", "trending"], ["New Releases", "movies.html?sort=new", "new"], ["My List", "my-list.html", "mylist"]];
    if (kids) links = links.filter((l) => ["home", "movies", "series", "mylist"].includes(l[2]));
    const nav = (cls) => links.map(([label, href, key]) => `<a class="${cls}${page === key ? " active" : ""}" href="${href}" ${page === key ? 'aria-current="page"' : ""}>${t(label)}</a>`).join("");
    const u = user(), initial = esc((u ? u.name : profile.name).charAt(0).toUpperCase());
    const avatar = (p) => `<span class="avatar" style="--h:${p.hue}">${esc(p.name.charAt(0))}</span>`;
    $("#site-header").innerHTML = `<a class="skip-link" href="#main">Skip to content</a>
      <div class="header-inner">
        <button type="button" class="icon-btn only-compact" data-action="drawer" aria-label="Open menu" aria-expanded="false" aria-controls="drawer">${icon("menu")}</button>
        <a class="logo" href="index.html" aria-label="CineWave home"><svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#8b5cf6"/></linearGradient></defs><rect width="64" height="64" rx="16" fill="url(#lg)"/><path d="M24 18v28l22-14z" fill="#fff"/></svg><span>Cine<b>Wave</b></span></a>
        <nav class="nav" aria-label="Main">${nav("nav-link")}</nav>
        <div class="header-actions">
          <form class="hsearch" id="hsearch" role="search" action="search.html" autocomplete="off">
            <input id="hs-input" name="q" type="search" placeholder="Titles, actors, genres…" aria-label="Search titles, actors, genres" value="${page === "search" ? esc(param("q") || "") : ""}">
            <button type="button" class="icon-btn" data-action="search-toggle" aria-label="${t("Search")}" data-tip="${t("Search")}">${icon("search")}</button>
            <div class="suggest" id="hs-suggest" role="listbox" hidden></div>
          </form>
          <label class="lang" data-tip="Language">${icon("globe")}<span class="sr-only">Language</span><select id="lang-select" aria-label="Language"><option value="en" ${lang === "en" ? "selected" : ""}>EN</option><option value="vi" ${lang === "vi" ? "selected" : ""}>VI</option></select></label>
          <div class="menu-wrap"><button type="button" class="icon-btn" data-menu="notif-menu" aria-haspopup="true" aria-expanded="false" aria-label="Notifications" data-tip="${t("Notifications")}">${icon("bell")}<span class="dot" id="notif-dot" hidden></span></button>
            <div class="dropdown notif" id="notif-menu" hidden></div></div>
          <div class="menu-wrap"><button type="button" class="avatar-btn" data-menu="profile-menu" aria-haspopup="true" aria-expanded="false" aria-label="Profile menu: ${esc(profile.name)}">${avatar(profile)}</button>
            <div class="dropdown profile-dd" id="profile-menu" hidden>
              <p class="dd-title">Who's watching?</p>
              ${Store.profiles().map((p) => `<button type="button" class="dd-item ${p.id === profile.id ? "current" : ""}" data-action="switch-profile" data-id="${p.id}">${avatar(p)}<span>${esc(p.name)}${p.kids ? ' <em class="pill">Kids Mode</em>' : ""}</span>${p.id === profile.id ? icon("check") : ""}</button>`).join("")}
              <hr>
              <a class="dd-item" href="profile.html">${icon("user")}<span>${t("Profile")}${u ? ` · ${esc(u.name)}` : ""}</span></a>
              <a class="dd-item" href="history.html">${icon("clock")}<span>${t("Watch history")}</span></a>
              <a class="dd-item" href="subscription.html">${icon("bolt")}<span>${t("Subscription")}</span></a>${u && u.role === "admin" ? `<a class="dd-item" href="admin.html">${icon("grid")}<span>Admin dashboard</span></a>` : ""}
              <button type="button" class="dd-item" data-action="theme">${icon("sliders")}<span>Theme: <b id="theme-label">${document.documentElement.dataset.theme}</b></span></button>
              <hr>
              ${u ? `<button type="button" class="dd-item" data-action="signout">${icon("x")}<span>${t("Sign out")}</span></button>` : `<a class="dd-item" href="login.html">${icon("user")}<span>${t("Sign in")}</span></a>`}
            </div></div>
        </div>
      </div>
      <div class="drawer" id="drawer" hidden><div class="drawer-panel" role="dialog" aria-label="Menu"><div class="drawer-head"><span class="logo-text">${t("Menu")}</span><button type="button" class="icon-btn" data-action="drawer" aria-label="Close menu">${icon("x")}</button></div>${nav("drawer-link")}
        <a class="drawer-link" href="history.html">${t("Watch history")}</a><a class="drawer-link" href="subscription.html">${t("Subscription")}</a><a class="drawer-link" href="profile.html">${t("Profile")}</a></div></div>`;
    $(".header-actions .avatar-btn .avatar").textContent = initial;
  }
  function buildFooter() {
    $("#site-footer").innerHTML = `<div class="footer-inner"><div><a class="logo" href="index.html"><span>Cine<b>Wave</b></span></a><p class="muted small">A fictional streaming service built as a portfolio project with HTML, CSS and vanilla JavaScript. All titles, people and artwork are invented or generated. Sample clips: Blender Foundation open movies (CC-BY) and MDN (CC0).</p></div>
      <nav aria-label="Footer"><a href="movies.html">Movies</a><a href="series.html">TV Series</a><a href="genres.html">Genres</a><a href="subscription.html">Membership</a><a href="profile.html">Profile &amp; settings</a></nav>
      <p class="muted small">Demo only — no accounts, payments or personal data leave your browser.</p></div>`;
    document.body.insertAdjacentHTML("beforeend", `<nav class="bottom-nav" aria-label="Quick navigation">${[["home", "index.html", "Home", "home"], ["movies", "movies.html", "Movies", "film"], ["series", "series.html", "Series", "tv"], ["search", "search.html", "Search", "search"], ["mylist", "my-list.html", "My List", "plus"]].map(([k, h, l, ic]) => `<a href="${h}" class="${page === k ? "active" : ""}" ${page === k ? 'aria-current="page"' : ""}>${icon(ic)}<span>${t(l)}</span></a>`).join("")}</nav><div id="toasts" class="toasts" aria-live="polite"></div><dialog id="modal" class="modal"></dialog>`);
  }

  /* ---------- notifications ---------- */
  function renderNotifs() {
    const list = Store.notifications(), unread = list.filter((n) => !n.read).length, dot = $("#notif-dot");
    dot.hidden = !unread; dot.textContent = unread;
    $("#notif-menu").innerHTML = `<div class="dd-head"><b>${t("Notifications")}</b><button type="button" class="link-btn" data-action="notif-all" ${unread ? "" : "disabled"}>${t("Mark all as read")}</button></div>
      <ul>${list.map((n) => `<li><button type="button" class="notif-item ${n.read ? "" : "unread"}" data-action="notif-read" data-id="${n.id}">${icon(n.icon || "bell")}<span><span class="n-text">${esc(n.text)}</span><small>${ago(n.at)}</small></span></button></li>`).join("") || `<li class="muted pad">You're all caught up.</li>`}</ul>`;
  }

  /* ---------- theme ---------- */
  function applyTheme(th) { document.documentElement.dataset.theme = th; const l = $("#theme-label"); if (l) l.textContent = th; const m = $('meta[name="theme-color"]'); if (m) m.content = th === "dark" ? "#0b0d14" : "#f4f5fa"; }
  applyTheme(Store.get("theme", "dark"));

  /* ---------- header search UI ---------- */
  function initSearchBox() {
    const form = $("#hsearch"), input = $("#hs-input"), box = $("#hs-suggest");
    const close = () => { box.hidden = true; box.innerHTML = ""; };
    input.addEventListener("input", () => {
      const s = suggestions(input.value);
      if (!s.length) return close();
      box.innerHTML = s.map((x, i) => `<a role="option" href="${x.href}" tabindex="-1"><span class="s-type">${x.type}</span>${esc(x.label)}</a>`).join("");
      box.hidden = false;
    });
    form.addEventListener("submit", () => Store.addSearch(input.value));
    form.addEventListener("keydown", (e) => {
      const items = $$("a", box), i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown" && items.length) { e.preventDefault(); items[Math.min(i + 1, items.length - 1)].focus(); }
      else if (e.key === "ArrowUp" && i >= 0) { e.preventDefault(); (items[i - 1] || input).focus(); }
      else if (e.key === "Escape") { close(); form.classList.remove("open"); }
    });
    document.addEventListener("click", (e) => { if (!e.target.closest("#hsearch")) { close(); if (!input.value) form.classList.remove("open"); } });
  }

  /* ---------- global delegated actions ---------- */
  function syncListButtons() {
    $$(".list-btn").forEach((b) => { const on = Store.inList(Number(b.dataset.id)); b.setAttribute("aria-pressed", on); });
  }
  const closeMenus = (except) => $$(".dropdown").forEach((d) => { if (d !== except && !d.hidden) { d.hidden = true; const b = $(`[data-menu="${d.id}"]`); b && b.setAttribute("aria-expanded", "false"); } });
  const setDrawer = (open) => { const d = $("#drawer"); d.hidden = !open; $('[data-action="drawer"][aria-controls]').setAttribute("aria-expanded", open); document.body.classList.toggle("no-scroll", open); };
  const actions = {
    "toggle-list"(el) {
      const m = getM(el.dataset.id), on = Store.toggleList(m.id);
      syncListButtons(); toast(on ? `Added "${m.title}" to My List` : `Removed "${m.title}" from My List`, on ? "success" : "info");
      document.dispatchEvent(new CustomEvent("cw:list", { detail: { id: m.id, on } }));
    },
    scroll(el) { const s = $(".row-scroll", el.closest(".row")); s.scrollBy({ left: Number(el.dataset.dir) * s.clientWidth * 0.85, behavior: "smooth" }); },
    "modal-close"() { $("#modal").close(); },
    drawer() { setDrawer($("#drawer").hidden); },
    "search-toggle"() {
      const form = $("#hsearch"), input = $("#hs-input");
      if (form.classList.contains("open") && input.value.trim()) return form.requestSubmit();
      form.classList.toggle("open"); if (form.classList.contains("open")) input.focus();
    },
    "switch-profile"(el) { Store.setProfile(el.dataset.id); const p = Store.activeProfile(); toast(`Switched to ${p.name}${p.kids ? " — Kids Mode on" : ""}`, "success"); setTimeout(() => (location.href = page === "watch" || page === "detail" ? "index.html" : location.pathname.split("/").pop() + location.search), 500); },
    theme() { const n = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; Store.set("theme", n); applyTheme(n); },
    signout() { try { sessionStorage.removeItem("cw:session"); } catch (e) {} Store.set("user", null); toast("Signed out", "info"); setTimeout(() => location.reload(), 400); },
    "notif-read"(el) { Store.saveNotifications(Store.notifications().map((n) => (n.id === Number(el.dataset.id) ? { ...n, read: true } : n))); renderNotifs(); },
    "notif-all"() { Store.saveNotifications(Store.notifications().map((n) => ({ ...n, read: true }))); renderNotifs(); toast("All notifications marked as read", "success"); },
    reload() { location.reload(); },
  };
  function bindGlobal() {
    document.addEventListener("click", (e) => {
      const menuBtn = e.target.closest("[data-menu]");
      if (menuBtn) { const d = $("#" + menuBtn.dataset.menu), open = d.hidden; closeMenus(d); d.hidden = !open; menuBtn.setAttribute("aria-expanded", open); return; }
      if (!e.target.closest(".dropdown")) closeMenus();
      const a = e.target.closest("[data-action]");
      if (a && actions[a.dataset.action]) { e.preventDefault(); actions[a.dataset.action](a, e); }
      if (e.target === $("#modal")) $("#modal").close();
      if (e.target.closest(".drawer-link") || e.target.classList.contains("drawer")) setDrawer(false);
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeMenus(); if (!$("#drawer").hidden) setDrawer(false); } });
    $("#lang-select").addEventListener("change", (e) => { Store.set("lang", e.target.value); location.reload(); });
    document.addEventListener("cw:list", syncListButtons);
  }

  /* ---------- boot ---------- */
  document.body.classList.toggle("kids", !!profile.kids);
  buildHeader(); buildFooter(); renderNotifs(); initSearchBox(); bindGlobal();
  $$("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  const hdr = $("#site-header"); const onScroll = () => hdr.classList.toggle("scrolled", window.scrollY > 20); onScroll(); addEventListener("scroll", onScroll, { passive: true });

  return { $, $$, esc, param, t, icon, runtime, bestQuality, ago, money, getM, user, locked, profile, catalog, sorted, SORT, kidSafe, norm, applyFilters, parseQuery, search, recommend, becauseRows, tasteProfile, stars, listOf, suggestions, toast, modal, confirm: confirmDialog, trailer, playUrl, rate, listBtn, card, cwCard, epLabel, row, empty, errorState, skeleton, load, grid, filterFields, readForm, recommended, syncListButtons, renderNotifs };
})();
