/* CineWave — auth.js
   Login / register (DEMO authentication), profile & settings page, subscription plans.
   Nothing here talks to a server. Accounts live in this browser's localStorage and the "checksum" is
   NOT real password security — never enter a real password. */
(() => {
  const { $, $$, esc, t, icon } = CW;
  const page = document.body.dataset.page;
  const checksum = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DEMO = { name: "Demo Viewer", email: "demo@cinewave.test", ck: checksum("demo@cinewave.test:demo1234") };
  const ADMIN = { name: "Site Admin", email: "admin@cinewave.test", ck: checksum("admin@cinewave.test:admin1234"), role: "admin" };
  const accounts = () => [DEMO, ADMIN, ...Store.get("accounts", [])];

  /* ---------- login / register ---------- */
  function authPage() {
    const tabs = $$("[data-tab]"), forms = { login: $("#login-form"), register: $("#register-form") };
    const msg = $("#auth-msg");
    const show = (which) => {
      tabs.forEach((b) => { const on = b.dataset.tab === which; b.setAttribute("aria-selected", on); b.tabIndex = on ? 0 : -1; });
      Object.entries(forms).forEach(([k, f]) => (f.hidden = k !== which)); msg.textContent = "";
    };
    tabs.forEach((b) => b.addEventListener("click", () => show(b.dataset.tab)));
    show(location.hash === "#register" ? "register" : "login");

    const err = (input, text) => { const s = $(`[data-err="${input.name}"]`, input.form); if (s) s.textContent = text || ""; input.setAttribute("aria-invalid", !!text); return !text; };
    const finish = (u, remember) => {
      if (remember) { Store.set("user", u); try { sessionStorage.removeItem("cw:session"); } catch (e) {} }
      else { try { sessionStorage.setItem("cw:session", JSON.stringify(u)); } catch (e) { Store.set("user", u); } Store.set("user", null); }
      CW.toast(`Welcome, ${u.name}!`, "success");
      setTimeout(() => (location.href = CW.param("next") || "index.html"), 700);
    };
    $$(".toggle-pw").forEach((b) => b.addEventListener("click", () => { const i = b.previousElementSibling; i.type = i.type === "password" ? "text" : "password"; b.textContent = i.type === "password" ? "Show" : "Hide"; }));

    forms.login.addEventListener("submit", (e) => {
      e.preventDefault(); const f = forms.login, em = f.email, pw = f.password;
      const ok = err(em, EMAIL.test(em.value.trim()) ? "" : "Enter a valid email address.") & err(pw, pw.value ? "" : "Enter your password.");
      if (!ok) return;
      const acc = accounts().find((a) => a.email === em.value.trim().toLowerCase() && a.ck === checksum(em.value.trim().toLowerCase() + ":" + pw.value));
      if (!acc) { msg.textContent = "Email or password is incorrect. (Demo: demo@cinewave.test / demo1234)"; return; }
      finish({ name: acc.name, email: acc.email, ...(acc.role ? { role: acc.role } : {}) }, f.remember.checked);
    });
    $("#use-demo").addEventListener("click", () => { forms.login.email.value = DEMO.email; forms.login.password.value = "demo1234"; forms.login.password.focus(); });
    $("#use-admin").addEventListener("click", () => { forms.login.email.value = ADMIN.email; forms.login.password.value = "admin1234"; forms.login.password.focus(); });
    $("#forgot").addEventListener("click", () => CW.modal({
      title: "Reset password (demo)", body: `<p class="muted">This is a simulation — no email is sent and no account is changed.</p><label class="field"><span>Email</span><input type="email" id="fp-email" placeholder="you@example.com" autocomplete="email"></label>`,
      actions: [{ label: "Cancel" }, { label: "Send reset link", cls: "btn-primary", onClick: (d) => { CW.toast(EMAIL.test($("#fp-email", d).value) ? "Demo: a reset link would be sent now" : "Enter a valid email first", EMAIL.test($("#fp-email", d).value) ? "success" : "error"); } }],
    }));

    forms.register.addEventListener("submit", (e) => {
      e.preventDefault(); const f = forms.register, name = f.name, em = f.email, pw = f.password, c = f.confirm;
      const email = em.value.trim().toLowerCase();
      const ok = err(name, name.value.trim().length >= 2 ? "" : "Please enter your name.") & err(em, !EMAIL.test(email) ? "Enter a valid email address." : accounts().some((a) => a.email === email) ? "That email is already registered in this demo." : "")
        & err(pw, pw.value.length >= 8 ? "" : "Use at least 8 characters.") & err(c, c.value === pw.value ? "" : "Passwords do not match.");
      if (!ok) return;
      Store.set("accounts", [...Store.get("accounts", []), { name: name.value.trim(), email, ck: checksum(email + ":" + pw.value) }]);
      finish({ name: name.value.trim(), email }, true);
    });
  }

  /* ---------- profile & settings ---------- */
  function tasteHtml() {
    const { w, signal, ratings } = CW.tasteProfile(), top = Object.entries(w.g).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 5), max = top.length ? top[0][1] : 1;
    if (!signal) return '<div class="block"><h2>Your taste</h2><p class="muted">Watch, rate or save a few titles and CineWave will tune your recommendations.</p></div>';
    return '<div class="block"><h2>Your taste</h2><p class="muted small">Built from your history, My List and ' + Object.keys(ratings).length + ' star rating(s) on this profile.</p><ul class="taste">' +
      top.map(([g, v]) => '<li><span>' + g + '</span><i><b style="width:' + Math.round((v / max) * 100) + '%"></b></i></li>').join("") + "</ul></div>";
  }

  function profilePage() {
    const root = $("#profile-root"), me = CW.profile, u = CW.user(), plan = Store.plan();
    const cont = Store.continueWatching().filter((h) => CW.getM(h.id)), list = Store.getList().map((x) => CW.getM(x.id)).filter(Boolean);
    const hist = Store.getHistory().filter((h) => CW.getM(h.id)).slice(0, 5);
    const av = (p, cls = "") => `<span class="avatar ${cls}" style="--h:${p.hue}">${esc(p.name.charAt(0))}</span>`;
    const s = Store.settings();
    root.innerHTML = `<section class="profile-head">${av(me, "xl")}<div><h1>${esc(u ? u.name : me.name)}</h1><p class="muted">${u ? esc(u.email) : `Not signed in · <a href="login.html">Sign in</a>`} · Profile: <b>${esc(me.name)}</b>${me.kids ? ' <em class="pill">Kids Mode</em>' : ""}</p>
        <p><span class="pill plan">${plan[0].toUpperCase() + plan.slice(1)} plan</span> <a class="link-btn" href="subscription.html">Manage plan</a></p></div></section>
      <div class="tabs" role="tablist" aria-label="Profile sections">${["overview", "profiles", "settings"].map((k) => `<button type="button" role="tab" data-ptab="${k}" aria-selected="false">${k[0].toUpperCase() + k.slice(1)}</button>`).join("")}</div>
      <section data-panel="overview" role="tabpanel">${CW.row({ title: t("Continue Watching"), items: cont, cardFn: CW.cwCard, cls: "wide" }) || ""}
        ${CW.row({ title: t("My List"), items: list, href: "my-list.html" }) || CW.empty({ ic: "plus", title: "My List is empty", text: "Save titles to see them here." })}
        ${tasteHtml()}
        <div class="block"><div class="block-head"><h2>Recently watched</h2><a class="see-all" href="history.html">${t("See all")} ${icon("chevR")}</a></div>
          ${hist.length ? `<ul class="mini-list">${hist.map((h) => { const m = CW.getM(h.id); return `<li><a href="movie-detail.html?id=${m.id}"><b>${esc(m.title)}</b><span class="muted small">${esc(CW.epLabel(m, h))} · ${CW.ago(h.at)} · ${Math.round(h.pct * 100)}%</span></a></li>`; }).join("")}</ul>` : '<p class="muted">Nothing watched yet on this profile.</p>'}</div></section>
      <section data-panel="profiles" role="tabpanel" hidden><p class="muted">Each profile keeps its own My List and watch history. The Kids profile hides mature titles and uses simplified navigation.</p>
        <div class="profile-cards">${Store.profiles().map((p) => `<div class="pcard ${p.id === me.id ? "current" : ""}">${av(p, "lg")}<form data-rename="${p.id}"><label class="sr-only" for="rn-${p.id}">Profile name</label><input id="rn-${p.id}" value="${esc(p.name)}" maxlength="16" required><button class="btn btn-ghost btn-sm">Rename</button></form>
          <p class="muted small">${p.kids ? "Kids Mode · ages 7 and under" : "Full catalogue"}</p>${p.id === me.id ? '<span class="pill">Active</span>' : `<button type="button" class="btn btn-primary btn-sm" data-action="switch-profile" data-id="${p.id}">Switch to ${esc(p.name)}</button>`}</div>`).join("")}</div></section>
      <section data-panel="settings" role="tabpanel" hidden><form class="settings" id="settings-form">
        <label class="field"><span>Theme</span><select name="theme"><option value="dark">Dark</option><option value="light">Light</option></select></label>
        <label class="field"><span>Preferred language</span><select name="lang"><option value="en">English</option><option value="vi">Tiếng Việt</option></select></label>
        <label class="field"><span>Default subtitles</span><select name="subtitle">${["Off", "Vietnamese", "English"].map((o) => `<option ${s.subtitle === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>
        <label class="field"><span>Default quality</span><select name="quality">${["Auto", "360p", "480p", "720p", "1080p", "4K"].map((o) => `<option ${s.quality === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>
        <label class="check"><input type="checkbox" name="autoNext" ${s.autoNext ? "checked" : ""}> Play next episode automatically</label>
        <div class="danger-zone"><h3>Demo data</h3><p class="muted small">Clears every CineWave value stored in this browser (profiles, lists, history, account, plan).</p><button type="button" class="btn btn-danger" id="reset-data">${icon("trash")} Reset demo data</button></div></form></section>`;

    const tabs = $$("[data-ptab]", root), panels = $$("[data-panel]", root);
    const open = (k) => { tabs.forEach((b) => b.setAttribute("aria-selected", b.dataset.ptab === k)); panels.forEach((p) => (p.hidden = p.dataset.panel !== k)); };
    tabs.forEach((b) => b.addEventListener("click", () => { open(b.dataset.ptab); try { history.replaceState(null, "", "#" + b.dataset.ptab); } catch (e) {} }));
    open(["profiles", "settings"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "overview");

    $$("[data-rename]", root).forEach((f) => f.addEventListener("submit", (e) => { e.preventDefault(); const v = f.querySelector("input").value.trim(); if (v) { Store.renameProfile(f.dataset.rename, v); CW.toast("Profile renamed", "success"); setTimeout(() => location.reload(), 500); } }));
    const form = $("#settings-form"); form.theme.value = Store.get("theme", "dark"); form.lang.value = Store.get("lang", "en");
    form.addEventListener("change", (e) => {
      const n = e.target.name;
      if (n === "theme") { Store.set("theme", e.target.value); document.documentElement.dataset.theme = e.target.value; }
      else if (n === "lang") { Store.set("lang", e.target.value); location.reload(); return; }
      else Store.setSetting(n, e.target.type === "checkbox" ? e.target.checked : e.target.value);
      CW.toast("Setting saved", "success");
    });
    $("#reset-data").addEventListener("click", async () => { if (await CW.confirm("Reset all demo data?", "Profiles, lists, history, account and plan will return to their defaults.", "Reset")) { Store.resetAll(); location.href = "index.html"; } });
  }

  /* ---------- subscription ---------- */
  function subscriptionPage() {
    const PLANS = [
      { id: "free", name: "Free", price: 0, blurb: "Try CineWave with limited content.", features: ["Limited catalogue", "Standard quality (480p)", "Contains ads (simulated)", "1 device"], devices: 1, quality: "480p" },
      { id: "standard", name: "Standard", price: 79000, blurb: "The full catalogue in Full HD.", features: ["Full catalogue", "Full HD (1080p)", "No ads", "Up to 3 devices", "Downloads on mobile (coming soon)"], devices: 3, quality: "1080p", popular: true },
      { id: "premium", name: "Premium", price: 129000, blurb: "Everything, in 4K, for the whole family.", features: ["Full catalogue + Premium originals", "4K Ultra HD + HDR", "No ads", "Up to 5 devices", "Early access to new episodes"], devices: 5, quality: "4K" },
    ];
    let yearly = false;
    const root = $("#plans"), manage = $("#manage");
    const DAY = 864e5, fmtD = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const getSub = () => {
      let sub = Store.get("sub", null);
      if (!sub) {
        const now = Date.now();
        sub = {
          status: "active", cycle: "monthly", renews: now + 21 * DAY, method: null, promo: null,
          devices: [{ id: 1, name: "Living-room TV", last: now - 2 * 3600e3 }, { id: 2, name: "Chrome on Windows", last: now }, { id: 3, name: "iPhone", last: now - 3 * DAY }],
          invoices: [3, 2, 1].map((n) => ({ id: "INV-" + (1000 + n), date: now - (30 * n - 9) * DAY, desc: "Standard plan — monthly", amount: 79000 })),
        };
        Store.set("sub", sub);
      }
      return sub;
    };
    const priceOf = (p, cycle) => (cycle === "yearly" ? Math.round((p.price * 10) / 1000) * 1000 : p.price);
    function changePlan(p) {
      const sub = getSub(), amount = priceOf(p, yearly ? "yearly" : "monthly") * (sub.promo ? 0.9 : 1);
      sub.cycle = yearly ? "yearly" : "monthly"; sub.status = "active"; sub.renews = Date.now() + (yearly ? 365 : 30) * DAY;
      if (p.price) sub.invoices.unshift({ id: "INV-" + (1000 + sub.invoices.length + 4), date: Date.now(), desc: p.name + " plan — " + sub.cycle + (sub.promo ? " (CINE10 −10%)" : ""), amount: Math.round(amount) });
      sub.promo = null;
      Store.set("sub", sub);
    }
    function drawManage() {
      const sub = getSub(), cur = PLANS.find((x) => x.id === Store.plan()), free = cur.id === "free", left = Math.max(0, Math.ceil((sub.renews - Date.now()) / DAY));
      const mins = Store.getHistory().reduce((n, h) => { const t = CW.getM(h.id); return n + (t ? h.pct * t.duration : 0); }, 0);
      const status = free ? "Free" : sub.status === "canceled" ? "Cancels " + fmtD(sub.renews) : "Active";
      const price = CW.money(Math.round(priceOf(cur, sub.cycle) * (sub.promo ? 0.9 : 1)));
      manage.innerHTML = `<h2 class="sub-h">Manage membership</h2><div class="manage-grid">
        <section class="mcard" aria-labelledby="m-plan"><h3 id="m-plan">Your plan</h3><p class="big-line">${cur.name} <span class="pill ${sub.status === "canceled" && !free ? "warn" : "plan"}">${status}</span></p>
          <p class="muted">${free ? "You're on the free plan." : sub.status === "canceled" ? `Access continues until ${fmtD(sub.renews)} (${left} days).` : `Renews ${fmtD(sub.renews)} (${left} days) · ${price} / ${sub.cycle === "yearly" ? "year" : "month"}`}${sub.promo ? " · promo CINE10 applied" : ""}</p>
          <div class="btn-row">${free ? "" : sub.status === "canceled" ? '<button class="btn btn-primary btn-sm" data-sub="resume">Resume membership</button>' : '<button class="btn btn-ghost btn-sm" data-sub="cancel">Cancel membership</button>'}${free ? "" : '<button class="btn btn-danger btn-sm" data-sub="end">End now &amp; go Free</button>'}</div>
          <p class="muted small">You've watched about <b>${Math.round(mins)}</b> minutes on this profile.</p></section>
        <section class="mcard" aria-labelledby="m-pay"><h3 id="m-pay">Payment method</h3>
          ${sub.method ? `<p class="big-line">${sub.method.brand} •••• ${sub.method.last4}</p><p class="muted">${CW.esc(sub.method.name)}</p>` : '<p class="muted">No payment method on file.</p>'}
          <form id="pay-form" class="pay-form"><p class="notice">${icon("alert")} <span>Demo only — <b>never enter a real card number</b>. Only a brand and 4 digits are kept, in this browser.</span></p>
            <div class="two"><label class="field"><span>Brand</span><select name="brand"><option>Visa</option><option>Mastercard</option><option>JCB</option></select></label><label class="field"><span>Last 4 digits</span><input name="last4" inputmode="numeric" maxlength="4" placeholder="4242" required></label></div>
            <label class="field"><span>Name on card</span><input name="name" maxlength="30" placeholder="Nguyen Van A" required></label><button class="btn btn-ghost btn-sm" type="submit">${sub.method ? "Replace" : "Add"} demo card</button></form>
          <form id="promo-form" class="promo-row"><label class="sr-only" for="promo">Promo code</label><input id="promo" placeholder="Promo code (try CINE10)"><button class="btn btn-ghost btn-sm" type="submit">Apply</button></form></section>
        <section class="mcard wide" aria-labelledby="m-dev"><h3 id="m-dev">Devices (${sub.devices.length} of ${cur.devices})</h3><ul class="dev-list">${sub.devices.map((d) => `<li><span>${CW.esc(d.name)}</span><small class="muted">Last active ${CW.ago(d.last)}</small><button class="link-btn" data-dev="${d.id}">Sign out</button></li>`).join("") || '<li class="muted">No signed-in devices.</li>'}</ul></section>
        <section class="mcard wide" aria-labelledby="m-bill"><h3 id="m-bill">Billing history</h3>${sub.invoices.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Invoice</th><th>Date</th><th>Description</th><th class="num">Amount</th><th><span class="sr-only">Download</span></th></tr></thead><tbody>${sub.invoices.map((v) => `<tr><td>${v.id}</td><td>${fmtD(v.date)}</td><td>${CW.esc(v.desc)}</td><td class="num">${CW.money(v.amount)}</td><td><button class="link-btn" data-inv="${v.id}">Download</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">No invoices yet.</p>'}</section></div>`;
    }
    manage.addEventListener("click", async (e) => {
      const sub = getSub(), b = e.target.closest("[data-sub]"), d = e.target.closest("[data-dev]"), inv = e.target.closest("[data-inv]");
      if (b) {
        const a = b.dataset.sub;
        if (a === "cancel" && await CW.confirm("Cancel membership?", "You'll keep access until the end of the billing period. (Demo — nothing is charged.)", "Cancel membership")) { sub.status = "canceled"; CW.toast("Membership will end on " + fmtD(sub.renews), "info"); }
        if (a === "resume") { sub.status = "active"; CW.toast("Membership resumed", "success"); }
        if (a === "end" && await CW.confirm("End now and switch to Free?", "You'll lose access to paid titles immediately.", "Switch to Free")) { Store.setPlan("free"); sub.status = "active"; CW.toast("You're on the Free plan", "info"); draw(); }
        Store.set("sub", sub); drawManage();
      }
      if (d) { sub.devices = sub.devices.filter((x) => x.id !== Number(d.dataset.dev)); Store.set("sub", sub); drawManage(); CW.toast("Device signed out", "success"); }
      if (inv) {
        const v = sub.invoices.find((x) => x.id === inv.dataset.inv), blob = new Blob(["CINEWAVE (DEMO INVOICE)\n" + v.id + "\n" + fmtD(v.date) + "\n" + v.desc + "\nTotal: " + CW.money(v.amount) + "\n\nThis is a simulated invoice. No payment was processed."], { type: "text/plain" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = v.id + ".txt"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
    });
    manage.addEventListener("submit", (e) => {
      e.preventDefault(); const sub = getSub();
      if (e.target.id === "pay-form") {
        const f = e.target; if (!/^\d{4}$/.test(f.last4.value)) return CW.toast("Enter exactly 4 digits", "error");
        sub.method = { brand: f.brand.value, last4: f.last4.value, name: f.name.value.trim() }; Store.set("sub", sub); drawManage(); CW.toast("Demo card saved", "success");
      }
      if (e.target.id === "promo-form") {
        const code = $("#promo", manage).value.trim().toUpperCase();
        if (code === "CINE10") { sub.promo = "CINE10"; Store.set("sub", sub); drawManage(); CW.toast("CINE10 applied — 10% off your next invoice", "success"); } else CW.toast("That code isn't valid", "error");
      }
    });
    const draw = () => {
      const cur = Store.plan();
      root.innerHTML = PLANS.map((p) => {
        const price = yearly ? Math.round((p.price * 10) / 12 / 1000) * 1000 : p.price;
        return `<article class="plan${p.popular ? " popular" : ""}${p.id === cur ? " current" : ""}" aria-labelledby="pl-${p.id}">${p.popular ? '<span class="ribbon">Most popular</span>' : ""}<h2 id="pl-${p.id}">${p.name}</h2><p class="muted">${p.blurb}</p>
          <p class="price"><b>${p.price ? CW.money(price) : "Free"}</b>${p.price ? "<span>/month</span>" : ""}</p>${p.price && yearly ? `<p class="muted small">Billed ${CW.money(price * 12)} yearly</p>` : '<p class="muted small">&nbsp;</p>'}
          <dl class="plan-facts"><div><dt>Video quality</dt><dd>${p.quality}</dd></div><div><dt>Devices</dt><dd>${p.devices}</dd></div></dl>
          <ul>${p.features.map((f) => `<li>${icon("check")}${f}</li>`).join("")}</ul>
          <button type="button" class="btn ${p.id === cur ? "btn-ghost" : "btn-primary"} btn-block" data-plan="${p.id}" ${p.id === cur ? 'aria-disabled="true"' : ""}>${p.id === cur ? "Current plan" : cur === "free" || PLANS.findIndex((x) => x.id === cur) < PLANS.indexOf(p) ? `Choose ${p.name}` : `Switch to ${p.name}`}</button></article>`;
      }).join("");
    };
    draw(); drawManage();
    $$('input[name="billing"]').forEach((r) => r.addEventListener("change", () => { yearly = r.value === "yearly" && r.checked; draw(); }));
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-plan]"); if (!b || b.getAttribute("aria-disabled")) return;
      const p = PLANS.find((x) => x.id === b.dataset.plan);
      CW.modal({ title: `Switch to ${p.name}?`, body: `<p>You're selecting the <b>${p.name}</b> plan${p.price ? ` at <b>${CW.money(p.price)}</b>/month` : ""}.</p><p class="notice">${icon("info")} Demo only — no payment is taken and no card details are collected.</p>`,
        actions: [{ label: "Cancel" }, { label: "Confirm", cls: "btn-primary", onClick: () => { Store.setPlan(p.id); changePlan(p); draw(); drawManage(); CW.toast(`You're now on the ${p.name} plan (demo)`, "success"); } }] });
    });
  }

  ({ login: authPage, profile: profilePage, subscription: subscriptionPage })[page]?.();
})();
