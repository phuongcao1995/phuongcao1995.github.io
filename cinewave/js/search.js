/* CineWave — search.js
   Advanced search page: live results, operators (genre:action year:2025 rating:>8 actor:kim), typo-tolerant matching,
   multi-genre chips, year range / runtime / age filters, saved searches, recent + popular searches.
   Matching itself lives in CW.search (app.js) so the header search box shares it. */
(() => {
  const { $, $$, esc, t, icon, param, filterFields, readForm } = CW;
  const form = $("#search-form"), input = $("#q"), box = $("#q-suggest"), filters = $("#filters"), idle = $("#idle"), out = $("#results"), info = $("#result-info");
  const SELECTS = ["country", "rating", "type", "quality", "sort"];
  const POPULAR = ["Saigon", "Romance", "Sci-Fi", "Animation", "Thriller", "Kim", "Nguyễn", "2026", "genre:action rating:>8", "type:series country:korea"];
  const AGES = [["", "Any"], ["0", "All ages"], ["7", "7+"], ["13", "13+"], ["16", "16+"]];
  const RUNTIME = [["", "Any length"], ["short", "Under 60 min"], ["medium", "60–110 min"], ["long", "Over 110 min"]];
  const YEARS = ["2024", "2025", "2026"];
  const opt = (list, cur) => list.map(([v, l]) => `<option value="${v}" ${String(cur) === v ? "selected" : ""}>${l}</option>`).join("");

  const init = Object.fromEntries(["country", "rating", "type", "quality", "sort", "yearFrom", "yearTo", "age", "runtime", "unwatched", "genre"].map((f) => [f, param(f) || ""]));
  const genres = CW.listOf(init.genre);
  filters.innerHTML = `<div class="filters-head"><h2>Filters</h2><button type="button" class="link-btn" id="clear-filters">Clear all</button></div>
    <fieldset class="genre-set"><legend>Genres <small class="muted">(any of)</small></legend><div class="gchips">${DATA.GENRES.map((g) => `<label class="gchip"><input type="checkbox" name="g" value="${g}" ${genres.includes(g) ? "checked" : ""}><span>${g}</span></label>`).join("")}</div></fieldset>
    ${filterFields(SELECTS, init)}
    <div class="two"><label class="field"><span>Year from</span><select name="yearFrom"><option value="">Any</option>${YEARS.map((y) => `<option ${init.yearFrom === y ? "selected" : ""}>${y}</option>`).join("")}</select></label>
    <label class="field"><span>Year to</span><select name="yearTo"><option value="">Any</option>${YEARS.map((y) => `<option ${init.yearTo === y ? "selected" : ""}>${y}</option>`).join("")}</select></label></div>
    <label class="field"><span>Max age rating</span><select name="age">${opt(AGES, init.age)}</select></label>
    <label class="field"><span>Runtime</span><select name="runtime">${opt(RUNTIME, init.runtime)}</select></label>
    <label class="check"><input type="checkbox" name="unwatched" value="1" ${init.unwatched ? "checked" : ""}> Hide titles I've finished</label>`;
  const sortSel = $('select[name="sort"]', filters);
  sortSel.insertAdjacentHTML("afterbegin", '<option value="relevance">Relevance</option>');
  sortSel.value = param("sort") || "relevance";
  input.value = param("q") || "";

  const collect = () => { const f = readForm(filters); delete f.g; const g = $$('input[name="g"]:checked', filters).map((x) => x.value); if (g.length) f.genre = g.join(","); return f; };
  const chips = (list, attr) => list.map((x) => `<button type="button" class="chip" ${attr}="${esc(x)}">${esc(x)}</button>`).join("");
  const saved = () => Store.pget("saved", []);

  function showIdle() {
    const recent = Store.getSearches(), sv = saved();
    idle.hidden = false; out.innerHTML = ""; info.textContent = "";
    idle.innerHTML = `${sv.length ? `<section class="block"><h2>Saved searches</h2><div class="chip-row">${sv.map((x, i) => `<span class="chip saved"><button type="button" data-saved="${i}">${icon("search")} ${esc(x.label)}</button><button type="button" data-unsave="${i}" aria-label="Delete saved search ${esc(x.label)}">${icon("x")}</button></span>`).join("")}</div></section>` : ""}
      ${recent.length ? `<section class="block"><div class="block-head"><h2>Recent searches</h2><button type="button" class="link-btn" id="clear-recent">Clear</button></div><div class="chip-row">${chips(recent, "data-q")}</div></section>` : ""}
      <section class="block"><h2>Popular searches</h2><div class="chip-row">${chips(POPULAR, "data-q")}</div>
        <p class="muted small op-help">Tip: combine free text with operators — <code>genre:</code> <code>year:</code> <code>country:</code> <code>type:</code> <code>quality:</code> <code>rating:&gt;8</code> <code>actor:</code> <code>director:</code>. Small typos are forgiven.</p></section>
      <section class="block"><h2>${t("Trending Now")}</h2><div id="idle-grid"></div></section>`;
    CW.grid($("#idle-grid"), CW.sorted(CW.catalog(), "trending").slice(0, 12), { size: 12 });
  }

  function run(push = true) {
    const f = collect(), q = input.value.trim(), parsed = CW.parseQuery(q);
    const active = q || Object.entries(f).some(([k, v]) => v && k !== "sort");
    if (push) {
      const p = new URLSearchParams(Object.entries({ q, ...f }).filter(([k, v]) => v && !(k === "sort" && v === "relevance")));
      try { history.replaceState(null, "", location.pathname + (p.toString() ? "?" + p : "")); } catch (e) {}
    }
    if (!active) return showIdle();
    idle.hidden = true;
    const items = CW.search(q, f);
    const applied = [...parsed.ops.map((o) => `<span class="chip op">${esc(o)}</span>`), ...Object.entries(f).filter(([k, v]) => v && k !== "sort").map(([k, v]) => `<span class="chip op">${esc(k)}: ${esc(v === "1" ? "yes" : v)}</span>`)].join("");
    info.innerHTML = `<b>${items.length}</b> result${items.length === 1 ? "" : "s"}${parsed.text ? ` for “${esc(parsed.text)}”` : ""} <button type="button" class="link-btn" id="save-search">${icon("plus")} Save search</button>${applied ? `<span class="applied">${applied}</span>` : ""}`;
    CW.grid(out, items, {
      emptyHtml: CW.empty({ ic: "search", title: "No results found", text: q ? `We couldn't find anything for “${q}”. Check the spelling, try fewer words, or clear some filters.` : "No titles match those filters." }) + `<div class="chip-row center">${chips(POPULAR.slice(0, 5), "data-q")}</div>`,
    });
  }

  /* suggestions while typing */
  const closeBox = () => { box.hidden = true; box.innerHTML = ""; };
  let timer;
  input.addEventListener("input", () => {
    const s = CW.suggestions(input.value.replace(/\w+:\S*/g, "").trim());
    if (s.length) { box.innerHTML = s.map((x) => `<a role="option" href="${x.href}"><span class="s-type">${x.type}</span>${esc(x.label)}</a>`).join(""); box.hidden = false; } else closeBox();
    clearTimeout(timer); timer = setTimeout(() => run(true), 220);
  });
  input.addEventListener("keydown", (e) => { if (e.key === "ArrowDown") { const a = $("a", box); if (a) { e.preventDefault(); a.focus(); } } if (e.key === "Escape") closeBox(); });
  box.addEventListener("keydown", (e) => {
    const items = $$("a", box), i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(i + 1, items.length - 1)].focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); (items[i - 1] || input).focus(); }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest(".search-bar")) closeBox(); });
  form.addEventListener("submit", (e) => { e.preventDefault(); closeBox(); Store.addSearch(input.value); run(true); });
  filters.addEventListener("change", () => run(true));
  $("#clear-filters").addEventListener("click", () => { $$("select", filters).forEach((s) => (s.value = s.name === "sort" ? "relevance" : "")); $$('input[type="checkbox"]', filters).forEach((c) => (c.checked = false)); run(true); });
  $("#filter-toggle").addEventListener("click", (e) => { const open = filters.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", open); });

  const useQuery = (q) => { input.value = q; Store.addSearch(q); run(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  idle.addEventListener("click", (e) => {
    const c = e.target.closest("[data-q]"), sv = e.target.closest("[data-saved]"), un = e.target.closest("[data-unsave]");
    if (c) useQuery(c.dataset.q);
    if (sv) {
      const x = saved()[sv.dataset.saved]; input.value = x.q;
      $$("select", filters).forEach((s) => (s.value = x.f[s.name] ?? (s.name === "sort" ? "relevance" : "")));
      $$('input[type="checkbox"]', filters).forEach((c) => (c.checked = c.name === "g" ? CW.listOf(x.f.genre).includes(c.value) : !!x.f[c.name]));
      run(true);
    }
    if (un) { Store.pset("saved", saved().filter((_, i) => i !== Number(un.dataset.unsave))); showIdle(); }
    if (e.target.id === "clear-recent") { Store.clearSearches(); showIdle(); }
  });
  info.addEventListener("click", (e) => {
    if (!e.target.closest("#save-search")) return;
    const f = collect(), q = input.value.trim(), label = q || Object.values(f).filter((v) => v && v !== "relevance").join(" · ");
    Store.pset("saved", [{ label: label.slice(0, 40), q, f }, ...saved().filter((x) => x.label !== label.slice(0, 40))].slice(0, 8));
    CW.toast("Search saved — find it on the empty search page", "success");
  });
  out.addEventListener("click", (e) => { const c = e.target.closest("[data-q]"); if (c) useQuery(c.dataset.q); });

  if (param("q")) Store.addSearch(param("q"));
  CW.load(out, () => { run(false); }, "grid", 200);
})();
