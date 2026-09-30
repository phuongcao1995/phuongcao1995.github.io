/* FinBank — Branch & ATM locator (CSS/SVG faux map, no external map API) */
(function () {
  const db = FB.db, $ = FB.$, $$ = FB.$$, esc = FB.esc;
  const ME = { x: 42, y: 50 };
  const state = { q: '', kind: 'all', open: false, cash: false, sel: null, zoom: 1 };
  const st = document.createElement('style');
  st.textContent = '.loc-grid{grid-template-columns:1.7fr 1fr;align-items:start}.map-card{padding:0;overflow:hidden}.map{position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--surface-2);--z:1;touch-action:manipulation}' +
    '.map-inner{position:absolute;inset:0;transition:transform .35s ease,transform-origin .35s ease}.map-inner svg{position:absolute;inset:0;width:100%;height:100%;display:block}' +
    '.blk{fill:var(--border);opacity:.7}.park{fill:var(--accent);opacity:.28}.river{fill:none;stroke:var(--info);opacity:.35;stroke-width:6;stroke-linecap:round}.river2{fill:none;stroke:var(--surface-2);opacity:.5;stroke-width:1.2;stroke-linecap:round}' +
    '.rd{stroke:var(--surface);stroke-linecap:round;fill:none;vector-effect:non-scaling-stroke}.rd.main{stroke-width:7;stroke:var(--surface)}.rd.min{stroke-width:3}.rd-o{stroke:var(--border-strong);stroke-width:9;fill:none;stroke-linecap:round;vector-effect:non-scaling-stroke;opacity:.6}' +
    '.dlab{position:absolute;transform:translate(-50%,-50%) scale(calc(1/var(--z)));font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-3);pointer-events:none;white-space:nowrap}.dlab.wat{color:var(--info);font-style:italic;text-transform:none;letter-spacing:0}' +
    '.pin{position:absolute;transform:translate(-50%,-100%) scale(calc(1/var(--z)));transform-origin:50% 100%;border:0;background:none;padding:0;cursor:pointer;z-index:2;transition:filter .2s}.pin span{display:grid;place-items:center;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--primary);border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35)}' +
    '.pin span b{transform:rotate(45deg);font-size:15px}.pin.atm span{background:var(--accent)}.pin.nocash span{background:var(--text-3)}.pin.sel{z-index:4}.pin.sel span{background:var(--danger);width:40px;height:40px;animation:bob .8s ease-in-out infinite alternate}.pin:focus-visible span{outline:2px solid var(--text)}@keyframes bob{to{margin-top:-6px}}' +
    '.me{position:absolute;transform:translate(-50%,-50%) scale(calc(1/var(--z)));z-index:3;pointer-events:none}.me i{display:block;width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 0 rgba(37,99,235,.5);animation:ping 1.8s infinite}.me small{position:absolute;top:20px;left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--text);color:var(--bg);padding:1px 7px;border-radius:6px;font-size:10.5px;font-weight:600}@keyframes ping{70%{box-shadow:0 0 0 14px rgba(37,99,235,0)}100%{box-shadow:0 0 0 0 rgba(37,99,235,0)}}' +
    '.zoom{position:absolute;right:12px;top:12px;z-index:6;display:flex;flex-direction:column;gap:6px}.zoom button{width:38px;height:38px;border-radius:10px;border:1px solid var(--border-strong);background:var(--surface);font-size:20px;font-weight:700;box-shadow:var(--shadow)}.zoom button:disabled{opacity:.4}' +
    '.mkey{position:absolute;left:10px;bottom:10px;z-index:6;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:6px 10px;font-size:11.5px;display:flex;gap:10px;flex-wrap:wrap}.mkey i{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px}' +
    '.loc-item.sel{background:var(--primary-50)}@media (max-width:960px){.loc-grid{grid-template-columns:1fr}.map{aspect-ratio:1/1}}';
  document.head.appendChild(st);

  /* ---------- Faux map ---------- */
  const rnd = (() => { let s = 7; return () => ((s = (s * 9301 + 49297) % 233280) / 233280); })();
  function buildMap() {
    const inPark = (x, y) => x > 22 && x < 36 && y > 30 && y < 44;
    let blocks = '';
    for (let cx = 0; cx < 12; cx++) for (let cy = 0; cy < 10; cy++) {
      const x = cx * 8.4 + 1 + rnd() * 1.2, y = cy * 10.2 + 1.2 + rnd() * 1.2;
      if (inPark(x + 3, y + 4)) continue;
      blocks += '<rect class="blk" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (5.2 + rnd() * 1.6).toFixed(1) + '" height="' + (6.4 + rnd() * 1.8).toFixed(1) + '" rx=".8"/>';
    }
    const mainRoads = ['M0 46 L100 40', 'M38 0 L44 100', 'M0 78 L100 70', 'M72 0 L66 100', 'M0 20 L60 24'], minorRoads = ['M0 30 L100 33', 'M0 62 L100 60', 'M20 0 L18 100', 'M56 0 L58 100', 'M86 0 L90 100', 'M0 92 L100 90', 'M0 10 L100 8'];
    const roads = mainRoads.map((d) => '<path class="rd-o" d="' + d + '"/>').join('') + mainRoads.map((d) => '<path class="rd main" d="' + d + '"/>').join('') + minorRoads.map((d) => '<path class="rd min" d="' + d + '"/>').join('');
    const river = 'M100 18 C90 22 86 44 74 50 C64 55 60 66 66 78 C70 88 66 94 62 100';
    const labels = [['District 1', 46, 36], ['District 3', 20, 20], ['Binh Thanh', 82, 30], ['Thu Duc', 80, 8], ['Tan Binh', 12, 62], ['District 4', 54, 82], ['Saigon River', 86, 62, 1], ['Tao Dan Park', 29, 37, 0, 1]];
    $('#map').innerHTML = '<div class="map-inner" id="mapIn"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + blocks + '<rect class="park" x="22" y="30" width="14" height="14" rx="2"/><rect class="park" x="6" y="82" width="12" height="10" rx="2"/><rect class="park" x="88" y="72" width="10" height="14" rx="2"/>' + roads + '<path class="river" d="' + river + '"/><path class="river2" d="' + river + '"/></svg>' +
      labels.map((l) => '<span class="dlab' + (l[3] ? ' wat' : '') + '" style="left:' + l[1] + '%;top:' + l[2] + '%;' + (l[4] ? 'color:var(--accent);text-transform:none;letter-spacing:0;font-size:10px' : '') + '">' + l[0] + '</span>').join('') +
      '<div class="me" style="left:' + ME.x + '%;top:' + ME.y + '%"><i></i><small>You are here</small></div><div id="pins"></div></div>' +
      '<div class="zoom"><button id="zIn" aria-label="Zoom in">+</button><button id="zOut" aria-label="Zoom out">−</button></div><div class="mkey"><span><i style="background:var(--primary)"></i>Branch</span><span><i style="background:var(--accent)"></i>ATM</span><span><i style="background:var(--text-3)"></i>No cash</span><span><i style="background:#2563eb"></i>You</span></div>';
    $('#zIn').onclick = () => zoom(0.5); $('#zOut').onclick = () => zoom(-0.5);
  }
  function zoom(d) {
    state.zoom = Math.min(2.5, Math.max(1, state.zoom + d)); applyZoom();
  }
  function applyZoom() {
    const b = db.branches.find((x) => x.id === state.sel), o = b ? b.x + '% ' + b.y + '%' : ME.x + '% ' + ME.y + '%';
    $('#map').style.setProperty('--z', state.zoom); const inn = $('#mapIn'); inn.style.transformOrigin = o; inn.style.transform = 'scale(' + state.zoom + ')';
    $('#zIn').disabled = state.zoom >= 2.5; $('#zOut').disabled = state.zoom <= 1;
  }

  /* ---------- Data ---------- */
  const isCash = (b) => !b.outOfCash;
  const list = () => {
    const q = state.q.toLowerCase();
    return db.branches.filter((b) => (state.kind === 'all' || b.kind === state.kind) && (!state.open || b.open) && (!state.cash || isCash(b)) && (!q || (b.name + ' ' + b.address + ' ' + b.services.join(' ')).toLowerCase().includes(q))).sort((a, b) => a.distance - b.distance);
  };
  const dist = (d) => (d < 1 ? Math.round(d * 1000) + ' m' : d.toFixed(1) + ' km');

  function drawPins(items) {
    $('#pins').innerHTML = items.map((b) => '<button class="pin ' + (b.kind === 'ATM' ? 'atm ' : '') + (!isCash(b) ? 'nocash ' : '') + (b.id === state.sel ? 'sel' : '') + '" style="left:' + b.x + '%;top:' + b.y + '%" data-id="' + b.id + '" aria-label="' + esc(b.name) + '"><span><b>' + (b.kind === 'ATM' ? '💵' : '🏦') + '</b></span></button>').join('');
    $$('.pin').forEach((p) => (p.onclick = () => select(p.dataset.id, true)));
  }
  function drawList(items) {
    $('#count').textContent = items.length + ' result' + (items.length === 1 ? '' : 's') + ' · nearest first';
    $('#results').innerHTML = items.length ? items.map((b) => '<div class="row-item clickable loc-item ' + (b.id === state.sel ? 'sel' : '') + '" data-id="' + b.id + '" tabindex="0" role="button"><div class="row-icon">' + (b.kind === 'ATM' ? '💵' : '🏦') + '</div><div class="row-main"><b style="white-space:normal">' + esc(b.name) + '</b><small>' + esc(b.address) + '</small><div class="mt-1"><span class="badge ' + (b.open ? 'success' : 'danger') + '">' + (b.open ? 'Open' : 'Closed') + '</span> ' + (b.kind === 'ATM' ? '<span class="badge ' + (isCash(b) ? 'success' : 'warn') + '">' + (isCash(b) ? 'Cash available' : 'Out of cash') + '</span>' : '') + '</div></div><b style="white-space:nowrap">' + dist(b.distance) + '</b></div>').join('') : FB.empty('📍', 'No locations found', 'Try clearing filters or search.');
    $$('.loc-item').forEach((r) => { r.onclick = () => select(r.dataset.id, false); r.onkeydown = (e) => { if (e.key === 'Enter') select(r.dataset.id, false); }; });
  }
  function detail() {
    const b = db.branches.find((x) => x.id === state.sel), el = $('#detail');
    if (!b) { el.innerHTML = '<div class="card flat center muted">👆 Select a pin or a result to see details.</div>'; return; }
    el.innerHTML = '<div class="card"><div class="flex between gap-1 wrap"><div><span class="badge primary">' + b.kind + '</span> <h3 style="display:inline">' + esc(b.name) + '</h3></div><b>' + dist(b.distance) + ' away</b></div>' +
      '<dl class="kv mt-2"><dt>Address</dt><dd>' + esc(b.address) + '</dd><dt>Opening hours</dt><dd>' + esc(b.hours) + '</dd><dt>Status</dt><dd><span class="badge ' + (b.open ? 'success' : 'danger') + '">' + (b.open ? 'Open now' : 'Closed now') + '</span></dd>' +
      (b.kind === 'ATM' ? '<dt>Cash availability</dt><dd><span class="badge ' + (isCash(b) ? 'success' : 'warn') + '">' + (isCash(b) ? 'Cash available' : 'Temporarily out of cash') + '</span></dd>' : '') + '<dt>Services</dt><dd>' + b.services.map((s) => '<span class="badge">' + esc(s) + '</span>').join(' ') + '</dd></dl>' +
      '<div class="flex gap-1 wrap mt-2"><button class="btn" id="dir">🧭 Get directions</button><a class="btn btn-outline" id="call" href="tel:19005555">📞 Call</a></div></div>';
    $('#dir').onclick = (e) => FB.busy(e.currentTarget, 700, () => FB.toast('Opening route to ' + b.name + ' (' + dist(b.distance) + ', about ' + Math.max(2, Math.round(b.distance * 4)) + ' min by motorbike).', 'success', 'Directions'));
    $('#call').onclick = () => FB.toast('Calling FinBank hotline 1900 5555…', 'info');
  }
  function select(id, scroll) {
    state.sel = id; render(); applyZoom();
    if (window.innerWidth <= 960) $('#detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    else if (scroll) { const r = $('.loc-item.sel'); if (r) r.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  function render() { const items = list(); if (state.sel && !items.some((b) => b.id === state.sel)) state.sel = null; drawPins(items); drawList(items); detail(); }

  /* ---------- Side panel ---------- */
  $('#side').innerHTML = '<div class="field"><label class="sr-only" for="q">Search</label><input class="input" id="q" type="search" placeholder="Search name, address or service" autocomplete="off"></div><div class="chips mb-2" id="chips"></div><div class="flex between items-center mb-2"><small class="muted" id="count"></small></div><div class="list" id="results" style="max-height:520px;overflow:auto"></div>';
  const CH = [['kind:all', 'All'], ['kind:Branch', 'Branch'], ['kind:ATM', 'ATM'], ['open', 'Open now'], ['cash', 'Cash available']];
  function chips() {
    $('#chips').innerHTML = CH.map((c) => { const on = c[0].startsWith('kind:') ? state.kind === c[0].slice(5) : state[c[0]]; return '<button class="chip ' + (on ? 'active' : '') + '" data-k="' + c[0] + '" aria-pressed="' + !!on + '">' + c[1] + '</button>'; }).join('');
    $$('[data-k]').forEach((b) => (b.onclick = () => { const k = b.dataset.k; if (k.startsWith('kind:')) state.kind = k.slice(5); else state[k] = !state[k]; chips(); render(); }));
  }
  $('#q').oninput = FB.debounce((e) => { state.q = e.target.value.trim(); render(); }, 150);

  buildMap(); chips();
  FB.skeleton($('#results'), () => { render(); applyZoom(); }, 450);
  $('#count').textContent = 'Loading…';
})();
