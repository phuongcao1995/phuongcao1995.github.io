/* CineWave — admin.js
   Demo admin dashboard: KPIs + charts, content management (publish/hide/feature/edit/add), users, review
   moderation and revenue. Access requires the demo admin account (see login page). Analytics numbers are
   generated deterministically from the catalogue plus what happens in this browser — nothing is real. */
(() => {
  const { $, $$, esc, icon } = CW;
  const root = $("#admin-root");
  const u = CW.user();
  if (!u || u.role !== "admin") {
    root.innerHTML = CW.empty({ ic: "lock", title: "Admin access only", text: "Sign in with the demo admin account (admin@cinewave.test / admin1234) to open the dashboard.", action: { href: "login.html?next=admin.html", label: "Sign in as admin" } });
    return;
  }
  const PRICE = { free: 0, standard: 79000, premium: 129000 }, DAY = 864e5;
  const hash = DATA.hash, money = CW.money, num = (n) => new Intl.NumberFormat("en-US").format(Math.round(n));
  const hiddenSet = () => new Set(Store.get("hidden", [])), featuredList = () => Store.get("featured", []);

  /* ---------- deterministic demo analytics ---------- */
  const realPlays = (id) => Store.getHistory().filter((h) => h.id === id).length;
  const views = (m) => 1200 + (hash(m.title) % 8000) + m.trend * 20 + realPlays(m.id) * 150;
  const daily = Array.from({ length: 14 }, (_, i) => { const d = 13 - i; return Math.round(21000 + 4200 * Math.sin(i / 2.2) + (hash("d" + i) % 3500) + i * 380 + (i === 13 ? Store.getHistory().length * 120 : 0)); });
  const FIRST = ["An", "Bao", "Chi", "Dung", "Emi", "Felix", "Gia", "Hoa", "Ivan", "Jun", "Khoa", "Lan", "Mika", "Nam", "Olga", "Phuc", "Quinn", "Rin", "Son", "Thu", "Uyen", "Vy", "Wen", "Xuan", "Yen", "Zed", "Hana", "Leo"];
  const LAST = ["Nguyen", "Tran", "Le", "Pham", "Kim", "Sato", "Chen", "Brooks", "Moreau", "Rossi"];
  const baseUsers = () => FIRST.map((f, i) => {
    const h = hash(f + i), o = Store.get("adminUsers", {})[i] || {};
    return { id: i, name: `${f} ${LAST[h % LAST.length]}`, email: `${f.toLowerCase()}${i}@example.test`, plan: o.plan || ["free", "standard", "standard", "premium"][h % 4], joined: Date.now() - (10 + (h % 400)) * DAY, last: Date.now() - (h % 9) * DAY, status: o.status || "active" };
  });

  /* ---------- tiny SVG charts (theme-aware through CSS variables) ---------- */
  const COL = ["var(--accent)", "var(--accent-2)", "var(--star)", "var(--ok)", "var(--danger)", "#f472b6", "#94a3b8"];
  function lineChart(vals, labels) {
    const W = 600, H = 200, pad = 28, max = Math.max(...vals) * 1.1, x = (i) => pad + (i * (W - pad * 2)) / (vals.length - 1), y = (v) => H - pad - (v / max) * (H - pad * 2);
    const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
    return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Daily views for the last 14 days">${[0, 0.5, 1].map((f) => `<line x1="${pad}" x2="${W - pad}" y1="${y(max * f / 1.1)}" y2="${y(max * f / 1.1)}" class="grid-l"/>`).join("")}
      <polygon points="${pad},${H - pad} ${pts} ${W - pad},${H - pad}" fill="var(--accent)" opacity=".18"/><polyline points="${pts}" fill="none" stroke="var(--accent-2)" stroke-width="3" stroke-linejoin="round"/>
      ${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="var(--accent-2)"><title>${labels[i]}: ${num(v)} views</title></circle>`).join("")}
      ${[0, 6, 13].map((i) => `<text x="${x(i)}" y="${H - 8}" text-anchor="${i === 0 ? "start" : i === 13 ? "end" : "middle"}">${labels[i]}</text>`).join("")}</svg>`;
  }
  function hBars(items, fmt = num) {
    const max = Math.max(...items.map((i) => i.value));
    return `<ul class="hbars">${items.map((i, k) => `<li><span class="lbl">${esc(i.label)}</span><i><b style="width:${(i.value / max) * 100}%;background:${COL[k % COL.length]}"></b></i><span class="val">${fmt(i.value)}</span></li>`).join("")}</ul>`;
  }
  function donut(parts) {
    const total = parts.reduce((n, p) => n + p.value, 0) || 1; let a = -Math.PI / 2; const R = 70, r = 44;
    const arcs = parts.map((p, i) => {
      const f = p.value / total, b = a + f * Math.PI * 2 - 0.001, big = f > 0.5 ? 1 : 0, pt = (ang, rad) => `${90 + Math.cos(ang) * rad},${90 + Math.sin(ang) * rad}`;
      const d = `M${pt(a, R)} A${R},${R} 0 ${big} 1 ${pt(b, R)} L${pt(b, r)} A${r},${r} 0 ${big} 0 ${pt(a, r)}Z`; a += f * Math.PI * 2;
      return `<path d="${d}" fill="${COL[i]}"><title>${p.label}: ${p.value} (${Math.round(f * 100)}%)</title></path>`;
    }).join("");
    return `<div class="donut"><svg viewBox="0 0 180 180" role="img" aria-label="Plan distribution">${arcs}<text x="90" y="88" text-anchor="middle" class="big">${total}</text><text x="90" y="106" text-anchor="middle">users</text></svg>
      <ul class="legend">${parts.map((p, i) => `<li><i style="background:${COL[i]}"></i>${esc(p.label)} <b>${p.value}</b></li>`).join("")}</ul></div>`;
  }
  const kpi = (label, value, note, ic) => `<div class="kpi"><span class="kpi-ic">${icon(ic)}</span><div><small>${label}</small><b>${value}</b><em>${note}</em></div></div>`;

  /* ---------- panels ---------- */
  const users = () => baseUsers();
  const mrr = () => users().filter((x) => x.status === "active").reduce((n, x) => n + PRICE[x.plan], 0);
  const days = Array.from({ length: 14 }, (_, i) => new Date(Date.now() - (13 - i) * DAY).toLocaleDateString("en-GB", { day: "numeric", month: "short" }));

  function overview() {
    const cat = DATA.movies, pub = cat.filter((m) => !hiddenSet().has(m.id)), us = users(), mix = ["free", "standard", "premium"].map((p) => ({ label: p[0].toUpperCase() + p.slice(1), value: us.filter((x) => x.plan === p).length }));
    const top = [...cat].sort((a, b) => views(b) - views(a)).slice(0, 7).map((m) => ({ label: m.title, value: views(m) }));
    const g = DATA.GENRES.map((n) => ({ label: n, value: cat.filter((m) => m.genres.includes(n)).reduce((s, m) => s + views(m), 0) })).sort((a, b) => b.value - a.value).slice(0, 6);
    return `<div class="kpis">${kpi("Published titles", pub.length + " / " + cat.length, "hidden: " + (cat.length - pub.length), "film")}${kpi("Active users", us.filter((x) => x.status === "active").length + 1, "incl. you", "users")}${kpi("Views (14 days)", num(daily.reduce((a, b) => a + b, 0)), "+" + Math.round(((daily[13] - daily[0]) / daily[0]) * 100) + "% vs. start", "chart")}${kpi("Monthly revenue", money(mrr()), "demo MRR", "bolt")}</div>
      <div class="charts"><section class="acard wide"><h3>Views per day</h3>${lineChart(daily, days)}</section><section class="acard"><h3>Plan distribution</h3>${donut(mix)}</section>
      <section class="acard"><h3>Top titles by views</h3>${hBars(top)}</section><section class="acard"><h3>Views by genre</h3>${hBars(g)}</section></div>`;
  }

  let cFilter = { q: "", status: "" };
  function content() {
    const hid = hiddenSet(), feat = featuredList();
    const rows = DATA.movies.filter((m) => (!cFilter.q || CW.norm(m.title + m.viTitle).includes(CW.norm(cFilter.q))) && (!cFilter.status || (cFilter.status === "hidden") === hid.has(m.id)));
    return `<div class="toolbar"><label class="field"><span class="sr-only">Search titles</span><input id="c-q" placeholder="Search titles…" value="${esc(cFilter.q)}"></label>
      <label class="field"><span class="sr-only">Status</span><select id="c-status"><option value="">All statuses</option><option value="published" ${cFilter.status === "published" ? "selected" : ""}>Published</option><option value="hidden" ${cFilter.status === "hidden" ? "selected" : ""}>Hidden</option></select></label>
      <button class="btn btn-primary btn-sm" data-a="add">${icon("plus")} Add title</button></div>
      <div class="table-wrap"><table class="tbl"><caption class="sr-only">Catalogue</caption><thead><tr><th>Title</th><th>Type</th><th>Year</th><th>Access</th><th class="num">Views</th><th>Status</th><th>Featured</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
      ${rows.map((m) => `<tr class="${hid.has(m.id) ? "dim" : ""}"><td><div class="cell-title"><img src="${DATA.poster(m)}" alt="" width="34" height="51" loading="lazy"><div><b>${esc(m.title)}</b>${m.custom ? ' <em class="pill">Added</em>' : ""}<small class="muted">${esc(m.genres.join(", "))} · ${esc(m.country)}</small></div></div></td>
        <td>${m.type}</td><td>${m.year}</td><td>${m.tier}</td><td class="num">${num(views(m))}</td>
        <td><button class="switch" role="switch" aria-checked="${!hid.has(m.id)}" aria-label="Published: ${esc(m.title)}" data-a="pub" data-id="${m.id}"><i></i></button></td>
        <td><input type="checkbox" data-a="feat" data-id="${m.id}" ${feat.includes(m.id) ? "checked" : ""} aria-label="Feature ${esc(m.title)} on home"></td>
        <td class="acts"><button class="link-btn" data-a="edit" data-id="${m.id}">Edit</button>${m.custom ? `<button class="link-btn danger" data-a="del" data-id="${m.id}">Delete</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="8" class="muted">No titles match.</td></tr>'}</tbody></table></div>
      <p class="muted small">Publish/hide and featured changes apply to the public site immediately (in this browser). Edits and new titles reload the catalogue.</p>`;
  }

  let uFilter = { q: "", plan: "" };
  function usersPanel() {
    const list = users().filter((x) => (!uFilter.q || (x.name + x.email).toLowerCase().includes(uFilter.q.toLowerCase())) && (!uFilter.plan || x.plan === uFilter.plan));
    const fmt = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `<div class="toolbar"><label class="field"><span class="sr-only">Search users</span><input id="u-q" placeholder="Search name or email…" value="${esc(uFilter.q)}"></label>
      <label class="field"><span class="sr-only">Plan</span><select id="u-plan"><option value="">All plans</option>${["free", "standard", "premium"].map((p) => `<option ${uFilter.plan === p ? "selected" : ""}>${p}</option>`).join("")}</select></label></div>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>User</th><th>Plan</th><th>Joined</th><th>Last active</th><th>Status</th><th></th></tr></thead><tbody>
      <tr class="you"><td><b>${esc(u.name)}</b> <em class="pill">You · admin</em><small class="muted">${esc(u.email)}</small></td><td>${Store.plan()}</td><td>—</td><td>now</td><td><span class="pill ok">active</span></td><td></td></tr>
      ${list.map((x) => `<tr class="${x.status === "suspended" ? "dim" : ""}"><td><b>${esc(x.name)}</b><small class="muted">${esc(x.email)}</small></td>
        <td><select data-a="plan" data-id="${x.id}" aria-label="Plan for ${esc(x.name)}">${["free", "standard", "premium"].map((p) => `<option ${x.plan === p ? "selected" : ""}>${p}</option>`).join("")}</select></td>
        <td>${fmt(x.joined)}</td><td>${CW.ago(x.last)}</td><td><span class="pill ${x.status === "active" ? "ok" : "warn"}">${x.status}</span></td>
        <td class="acts"><button class="link-btn ${x.status === "active" ? "danger" : ""}" data-a="susp" data-id="${x.id}">${x.status === "active" ? "Suspend" : "Reinstate"}</button></td></tr>`).join("")}</tbody></table></div>`;
  }

  let rFilter = "flagged";
  function reviewsPanel() {
    const flags = new Set(Store.get("flags", [])), all = DATA.movies.flatMap((m) => Social.allFor(m, { includeRemoved: true }).map((r) => ({ ...r, m })));
    const list = all.filter((r) => (rFilter === "flagged" ? r.flagged : rFilter === "removed" ? r.removed : true)).sort((a, b) => b.at - a.at).slice(0, 60);
    return `<div class="toolbar"><label class="field"><span class="sr-only">Filter</span><select id="r-filter">${[["flagged", "Reported (" + all.filter((r) => flags.has(r.id)).length + ")"], ["removed", "Removed"], ["all", "All reviews (" + all.length + ")"]].map(([v, l]) => `<option value="${v}" ${rFilter === v ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
      <ul class="mod-list">${list.map((r) => `<li class="${r.removed ? "dim" : ""}"><div><b>${esc(r.name)}</b> on <a href="movie-detail.html?id=${r.m.id}">${esc(r.m.title)}</a> ${CW.stars(r.rating)} ${r.flagged ? '<span class="pill warn">reported</span>' : ""}${r.removed ? '<span class="pill">removed</span>' : ""}<p>${esc(r.text || "(no text)")}</p><small class="muted">${CW.ago(r.at)} · ${r.helpful} helpful</small></div>
        <button class="btn btn-ghost btn-sm" data-a="mod" data-id="${r.id}">${r.removed ? "Restore" : "Remove"}</button></li>`).join("") || '<li class="muted">Nothing here — no reviews match this filter.</li>'}</ul>`;
  }

  function revenue() {
    const us = users().filter((x) => x.status === "active"), by = ["standard", "premium"].map((p) => ({ label: p[0].toUpperCase() + p.slice(1), value: us.filter((x) => x.plan === p).length * PRICE[p] }));
    const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"].map((l, i) => ({ label: l, value: Math.round(mrr() * (0.62 + i * 0.075)) }));
    const inv = (Store.get("sub", null) || { invoices: [] }).invoices;
    return `<div class="kpis">${kpi("MRR", money(mrr()), "demo", "bolt")}${kpi("ARPU", money(mrr() / Math.max(1, us.length)), "per active user", "user")}${kpi("Paying users", us.filter((x) => x.plan !== "free").length, "of " + us.length, "users")}${kpi("Churn (demo)", "2.4%", "last 30 days", "chart")}</div>
      <div class="charts"><section class="acard"><h3>Revenue by plan</h3>${hBars(by, money)}</section><section class="acard"><h3>MRR trend</h3>${hBars(months, money)}</section>
      <section class="acard wide"><h3>Invoices in this browser</h3>${inv.length ? `<div class="table-wrap"><table class="tbl"><tbody>${inv.slice(0, 8).map((v) => `<tr><td>${v.id}</td><td>${new Date(v.date).toLocaleDateString("en-GB")}</td><td>${esc(v.desc)}</td><td class="num">${money(v.amount)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Open the Membership page to generate demo invoices.</p>'}</section></div>`;
  }

  /* ---------- shell ---------- */
  const TABS = [["overview", "Overview", "chart", overview], ["content", "Content", "film", content], ["users", "Users", "users", usersPanel], ["reviews", "Reviews", "star", reviewsPanel], ["revenue", "Revenue", "bolt", revenue]];
  let tab = TABS.some((t) => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : "overview";
  function draw(keepFocus) {
    const t = TABS.find((x) => x[0] === tab), focusId = keepFocus && document.activeElement && document.activeElement.id;
    root.innerHTML = `<div class="admin"><nav class="admin-nav" aria-label="Admin sections">${TABS.map(([k, l, ic]) => `<button type="button" data-tab="${k}" aria-current="${k === tab}">${icon(ic)}<span>${l}</span></button>`).join("")}</nav>
      <section class="admin-main" aria-labelledby="ad-h"><header class="admin-head"><h1 id="ad-h">${t[1]}</h1><span class="pill">Demo data</span></header>${t[3]()}</section></div>`;
    if (focusId) { const el = document.getElementById(focusId); if (el) { el.focus(); if (el.setSelectionRange) el.setSelectionRange(el.value.length, el.value.length); } }
  }
  const save = (k, v) => Store.set(k, v);
  const titleForm = (m) => `<form id="t-form" class="tform"><label class="field"><span>Title</span><input name="title" required value="${esc(m ? m.title : "")}"></label><label class="field"><span>Vietnamese title</span><input name="vi" value="${esc(m ? m.viTitle : "")}"></label>
    ${m ? "" : `<div class="two"><label class="field"><span>Type</span><select name="type"><option value="movie">Movie</option><option value="series">Series</option></select></label><label class="field"><span>Year</span><input name="year" type="number" value="2026" min="1990" max="2030"></label></div>
    <div class="two"><label class="field"><span>Genres (comma separated)</span><input name="genres" value="Drama"></label><label class="field"><span>Country</span><input name="country" value="Vietnam"></label></div>
    <div class="two"><label class="field"><span>Minutes (per episode for series)</span><input name="duration" type="number" value="105" min="5"></label><label class="field"><span>Age rating</span><select name="age"><option>All</option><option>7+</option><option selected>13+</option><option>16+</option><option>18+</option></select></label></div>`}
    <label class="field"><span>Access tier</span><select name="tier">${["free", "standard", "premium"].map((t) => `<option ${m && m.tier === t ? "selected" : ""}>${t}</option>`).join("")}</select></label>
    ${m ? `<label class="field"><span>Description</span><textarea name="description" rows="4">${esc(m.description)}</textarea></label>` : ""}</form>`;

  root.addEventListener("click", (e) => {
    const tb = e.target.closest("[data-tab]"), a = e.target.closest("[data-a]");
    if (tb) { tab = tb.dataset.tab; try { history.replaceState(null, "", "#" + tab); } catch (x) {} draw(); return; }
    if (!a) return;
    const id = Number(a.dataset.id), act = a.dataset.a;
    if (act === "pub") { const h = hiddenSet(); h.has(id) ? h.delete(id) : h.add(id); save("hidden", [...h]); CW.toast(h.has(id) ? "Title hidden from the site" : "Title published", "success"); draw(); }
    if (act === "del") CW.confirm("Delete this title?", "It will be removed from the catalogue.", "Delete").then((ok) => { if (ok) { save("custom", Store.get("custom", []).filter((c) => c.id !== id)); location.reload(); } });
    if (act === "susp") { const o = Store.get("adminUsers", {}), cur = users().find((x) => x.id === id); o[id] = { ...(o[id] || {}), status: cur.status === "active" ? "suspended" : "active" }; save("adminUsers", o); CW.toast("User " + o[id].status, "info"); draw(); }
    if (act === "mod") { const r = new Set(Store.get("modRemoved", [])), k = a.dataset.id; r.has(k) ? r.delete(k) : r.add(k); save("modRemoved", [...r]); CW.toast(r.has(k) ? "Review removed" : "Review restored", "success"); draw(); }
    if (act === "edit") {
      const m = CW.getM(id);
      CW.modal({ title: "Edit title", wide: false, body: titleForm(m), actions: [{ label: "Cancel" }, { label: "Save", cls: "btn-primary", close: false, onClick: (d) => {
        const f = $("#t-form", d), ed = Store.get("edits", {}); ed[id] = { title: f.title.value.trim() || m.title, viTitle: f.vi.value.trim(), tier: f.tier.value, description: f.description.value.trim() };
        save("edits", ed); location.reload(); } }] });
    }
    if (act === "add") {
      CW.modal({ title: "Add title", body: titleForm(null), actions: [{ label: "Cancel" }, { label: "Add to catalogue", cls: "btn-primary", close: false, onClick: (d) => {
        const f = $("#t-form", d); if (!f.title.value.trim()) return CW.toast("Title is required", "error");
        const cust = Store.get("custom", []), id2 = cust.length ? Math.max(...cust.map((c) => c.id)) + 1 : 1000;
        const genres = f.genres.value.split(",").map((s) => s.trim()).filter((g) => DATA.GENRES.includes(g));
        cust.push({ id: id2, raw: [f.title.value.trim(), f.vi.value.trim() || f.title.value.trim(), f.type.value, Number(f.year.value), Number(f.duration.value), 7.5, (genres.length ? genres : ["Drama"]).join("/"), f.country.value.trim() || "Vietnam", 0, f.age.value, f.type.value === "series" ? 1 : undefined] });
        save("custom", cust); const ed = Store.get("edits", {}); ed[id2] = { tier: f.tier.value }; save("edits", ed); location.reload(); } }] });
    }
  });
  root.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.a === "feat") { const f = new Set(featuredList()); t.checked ? f.add(Number(t.dataset.id)) : f.delete(Number(t.dataset.id)); save("featured", [...f]); CW.toast(t.checked ? "Pinned to the home hero" : "Removed from home hero", "success"); }
    if (t.dataset.a === "plan") { const o = Store.get("adminUsers", {}); o[t.dataset.id] = { ...(o[t.dataset.id] || {}), plan: t.value }; save("adminUsers", o); CW.toast("Plan updated", "success"); draw(); }
    if (t.id === "c-status") { cFilter.status = t.value; draw(true); }
    if (t.id === "u-plan") { uFilter.plan = t.value; draw(true); }
    if (t.id === "r-filter") { rFilter = t.value; draw(true); }
  });
  root.addEventListener("input", (e) => {
    if (e.target.id === "c-q") { cFilter.q = e.target.value; draw(true); }
    if (e.target.id === "u-q") { uFilter.q = e.target.value; draw(true); }
  });
  draw();
})();
