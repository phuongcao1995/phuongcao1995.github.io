'use strict';
/* =========================================================
   IrriCourse – Hệ thống quản lý tưới sân golf (bản mẫu tĩnh)
   Toàn bộ dữ liệu là dữ liệu mô phỏng lưu trong bộ nhớ trình duyệt.
   Không có backend, không gọi API.
   ========================================================= */

/* ================= 1. Tiện ích ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rand = mulberry32(20260923);
const rnd = (a, b) => a + rand() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = arr => arr[Math.floor(rand() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pad = n => String(n).padStart(2, '0');
const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const sum = arr => arr.reduce((a, b) => a + b, 0);
const fmt = (n, d = 0) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtTime = d => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const fmtHM = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmtDate = d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtDT = ts => { const d = new Date(ts); return `${fmtHM(d)} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const minToHM = m => `${pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad(Math.round(((m % 60) + 60) % 60))}`;
const hmToMin = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const weekday = d => (d.getDay() + 6) % 7; // 0 = Thứ Hai
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DOW_LONG = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
const GAL_TO_M3 = 0.0037854;
function ago(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 10) return 'Vừa xong';
  if (s < 60) return `${s} giây trước`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}
function durText(min) {
  min = Math.max(0, Math.round(min));
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}
function hoursText(h) { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return `${hh} giờ ${pad(mm)} phút`; }
const icon = (n, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const hl = (text, q) => { const t = esc(text); if (!q) return t; const i = String(text).toLowerCase().indexOf(q.toLowerCase()); if (i < 0) return t; return esc(String(text).slice(0, i)) + '<mark>' + esc(String(text).slice(i, i + q.length)) + '</mark>' + esc(String(text).slice(i + q.length)); };
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const COLORS = { water: '#1B7BD3', ink: '#15302A', muted: '#63766E', grid: '#E5ECE8', turf: '#2E9A5E', amber: '#E2A11A', red: '#CF3F2E', pine: '#1D6A55', violet: '#6D5BD0', teal: '#139C9C', slate: '#9AA8A3' };
const SERIES = [COLORS.water, COLORS.turf, COLORS.amber, COLORS.violet, COLORS.teal, COLORS.red];

/* ================= 2. Từ điển trạng thái ================= */
const STATION_ST = {
  idle: { label: 'Sẵn sàng', cls: 'ok', dot: 'ok' },
  running: { label: 'Đang tưới', cls: 'run', dot: 'run' },
  waiting: { label: 'Đang chờ', cls: 'wait', dot: 'wait' },
  completed: { label: 'Hoàn thành', cls: 'done', dot: 'done' },
  error: { label: 'Lỗi', cls: 'err', dot: 'err' },
  offline: { label: 'Mất kết nối', cls: 'err', dot: 'err' }
};
const EQ_ST = {
  online: { label: 'Trực tuyến', cls: 'ok' },
  warning: { label: 'Cảnh báo', cls: 'warn' },
  offline: { label: 'Ngoại tuyến', cls: 'err' }
};
const SENSOR_ST = {
  normal: { label: 'Bình thường', cls: 'ok' },
  warning: { label: 'Cảnh báo', cls: 'warn' },
  offline: { label: 'Mất tín hiệu', cls: 'err' }
};
const PUMP_ST = {
  running: { label: 'Đang chạy', cls: 'run' },
  stopped: { label: 'Đã dừng', cls: 'idle' },
  fault: { label: 'Sự cố', cls: 'err' }
};
const PRIO = { high: { label: 'Cao', cls: 'p-high' }, mid: { label: 'Trung bình', cls: 'p-mid' }, low: { label: 'Thấp', cls: 'p-low' } };
const b = (cls, label) => `<span class="badge b-${cls}">${esc(label)}</span>`;
const stBadge = s => b(STATION_ST[s].cls, STATION_ST[s].label);
const eqBadge = s => b(EQ_ST[s].cls, EQ_ST[s].label);
const senBadge = s => b(SENSOR_ST[s].cls, SENSOR_ST[s].label);
const prioHTML = p => `<span class="prio ${PRIO[p].cls}"><i></i>${PRIO[p].label}</span>`;

/* ================= 3. Dữ liệu mẫu ================= */
const CLUB = { id: 'CLUB', name: 'Riverside Golf Club', location: 'Hòa Vang, Đà Nẵng' };
const DB = { courses: [], sites: [], holes: [], areas: [], stations: [], sensors: [], satellites: [], decoders: [], radios: [], pumps: [], programs: [], alerts: [] };
let byId = {};
function reindex() { byId = {}; for (const k of ['courses', 'sites', 'holes', 'areas', 'stations', 'sensors', 'satellites', 'decoders', 'radios', 'pumps', 'programs']) DB[k].forEach(o => { byId[o.id] = o; }); }
const get = id => byId[id];

const AREA = {
  tee: { code: 'TE', name: 'Tee', vi: 'Khu phát bóng', n: 1, flow: [15, 20], run: 10, turf: 'Cỏ Zoysia Matrella' },
  fairway: { code: 'FW', name: 'Fairway', vi: 'Đường bóng chính', n: 3, flow: [42, 55], run: 18, turf: 'Cỏ Bermuda 419' },
  green: { code: 'GR', name: 'Green', vi: 'Khu gạt bóng', n: 2, flow: [18, 24], run: 12, turf: 'Cỏ Bermuda TifEagle' },
  rough: { code: 'RO', name: 'Rough', vi: 'Vùng cỏ rậm', n: 1, flow: [30, 38], run: 15, turf: 'Cỏ Paspalum' }
};
const AREA_KEYS = ['tee', 'fairway', 'green', 'rough'];
const HEADS = { tee: 'Đầu tưới xoay 1″ – toàn vòng', fairway: 'Đầu tưới xoay 1,5″ – toàn vòng', green: 'Đầu tưới xoay 1″ – bán nguyệt', rough: 'Đầu tưới xoay 1,5″ – cung 180°' };

const SENSOR_TYPES = {
  flow: { name: 'Cảm biến lưu lượng', short: 'Lưu lượng', unit: 'GPM', icon: 'drop', dec: 0 },
  pressure: { name: 'Cảm biến áp suất', short: 'Áp suất', unit: 'PSI', icon: 'gauge', dec: 1 },
  moisture: { name: 'Cảm biến độ ẩm đất', short: 'Độ ẩm đất', unit: '%', icon: 'sprout', dec: 1 },
  temperature: { name: 'Cảm biến nhiệt độ', short: 'Nhiệt độ', unit: '°C', icon: 'sensor', dec: 1 },
  rain: { name: 'Cảm biến mưa', short: 'Lượng mưa', unit: 'mm', icon: 'rain', dec: 1 },
  level: { name: 'Cảm biến mực nước', short: 'Mực nước', unit: 'm', icon: 'wave', dec: 2 }
};

// Bố cục 6 hố trên bản đồ (hệ tọa độ 1000 × 620): điểm phát bóng, điểm điều khiển đường cong, green
const LAYOUT = [
  { t: [90, 545], c: [120, 370], g: [215, 210] },
  { t: [270, 110], c: [380, 70], g: [480, 150] },
  { t: [540, 245], c: [450, 350], g: [370, 470] },
  { t: [440, 565], c: [570, 590], g: [690, 500] },
  { t: [770, 440], c: [720, 300], g: [790, 170] },
  { t: [870, 85], c: [945, 260], g: [905, 455] }
];
function mapPt(p, ci) { let [x, y] = p; if (ci === 1) x = 1000 - x; if (ci === 2) y = 620 - y; return [x, y]; }
function bez(g, t) { const [x0, y0] = g.t, [cx, cy] = g.c, [x2, y2] = g.g, u = 1 - t; return [u * u * x0 + 2 * u * t * cx + t * t * x2, u * u * y0 + 2 * u * t * cy + t * t * y2]; }
function bezN(g, t) { const [x0, y0] = g.t, [cx, cy] = g.c, [x2, y2] = g.g; const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x2 - cx), dy = 2 * (1 - t) * (cy - y0) + 2 * t * (y2 - cy); const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }
function stationPos(g, type, n) {
  if (type === 'tee') return bez(g, 0.04);
  if (type === 'fairway') { const t = [0.34, 0.53, 0.72][n] || 0.5, p = bez(g, t), nn = bezN(g, t), o = n % 2 ? 12 : -12; return [p[0] + nn[0] * o, p[1] + nn[1] * o]; }
  if (type === 'green') { const p = bez(g, 1), nn = bezN(g, 0.98), o = n ? 15 : -15; return [p[0] + nn[0] * o, p[1] + nn[1] * o]; }
  const p = bez(g, 0.5), nn = bezN(g, 0.5); return [p[0] + nn[0] * 42, p[1] + nn[1] * 42];
}

function buildData() {
  const now = Date.now();
  const courseDefs = [
    ['C01', 'Sân Bắc', 'North Course', 'Phân khu Bắc, ven sông Cổ Cò'],
    ['C02', 'Sân Nam', 'South Course', 'Phân khu Nam, giáp đồi cát ven biển'],
    ['C03', 'Sân Hồ', 'Lake Course', 'Phân khu Đông, quanh hồ điều hòa']
  ];
  let holeNo = 0, siteNo = 0;
  courseDefs.forEach(([id, name, en, location], ci) => {
    DB.courses.push({ id, name, en, location, status: 'online', ci, lake: mapPt([620, 340], ci), pumpHouse: mapPt([600, 420], ci), club: mapPt([650, 55], ci), weather: mapPt([745, 45], ci), area: [21.6, 19.8, 20.4][ci] });
    for (let s = 0; s < 2; s++) {
      siteNo++;
      const sid = 'S' + pad(siteNo);
      const site = { id: sid, courseId: id, name: 'Site ' + pad(siteNo), location: `${name}, cụm hố ${pad(holeNo + 1)}–${pad(holeNo + 3)}`, status: 'online' };
      DB.sites.push(site);
      for (let k = 0; k < 3; k++) {
        holeNo++;
        const hid = 'H' + pad(holeNo), L = LAYOUT[s * 3 + k];
        const geo = { t: mapPt(L.t, ci), c: mapPt(L.c, ci), g: mapPt(L.g, ci), idx: s * 3 + k };
        const len = Math.hypot(geo.g[0] - geo.t[0], geo.g[1] - geo.t[1]);
        const par = len < 230 ? 3 : len < 340 ? 4 : 5;
        DB.holes.push({ id: hid, no: holeNo, courseId: id, siteId: sid, name: 'Hố ' + pad(holeNo), par, length: Math.round(len * (par === 3 ? 0.82 : 1.32) + rnd(0, 18)), status: 'online', geo, location: `${name}, ${site.name}` });
        let stNo = 0;
        AREA_KEYS.forEach(type => {
          const A = AREA[type], aid = `A${pad(holeNo)}-${A.code}`;
          DB.areas.push({ id: aid, holeId: hid, siteId: sid, courseId: id, type, name: A.name, vi: A.vi, turf: A.turf, status: 'online', location: `Hố ${pad(holeNo)}, ${A.vi.toLowerCase()}` });
          for (let n = 0; n < A.n; n++) {
            stNo++;
            DB.stations.push({
              id: `ST-${pad(holeNo)}${pad(stNo)}`, name: `Trạm ${pad(holeNo)}-${pad(stNo)}`, holeId: hid, areaId: aid, siteId: sid, courseId: id, type,
              flow: Math.round(rnd(A.flow[0], A.flow[1])), defRun: A.run, head: HEADS[type],
              status: 'idle', elapsed: 0, duration: 0, program: null, lastRun: now - rint(8, 30) * 3600e3, runsToday: 0,
              pos: stationPos(geo, type, n), satelliteId: null, decoderId: null, fault: ''
            });
          }
        });
      }
    }
  });

  // Bộ điều khiển (Satellite), Bộ giải mã (Decoder), Radio
  const satPerSite = [2, 2, 2, 1, 2, 1];
  const comms = ['Cáp quang', 'Cáp tín hiệu 2 dây', 'Radio UHF'];
  let satNo = 0, decNo = 100, radNo = 200;
  DB.sites.forEach((site, si) => {
    const holes = DB.holes.filter(h => h.siteId === site.id);
    const cnt = satPerSite[si];
    for (let k = 0; k < cnt; k++) {
      satNo++;
      const id = 'SAT-' + String(satNo).padStart(3, '0');
      const myHoles = cnt === 1 ? holes : (k === 0 ? holes.slice(0, 2) : holes.slice(2));
      const sts = DB.stations.filter(s => myHoles.some(h => h.id === s.holeId));
      sts.forEach(s => { s.satelliteId = id; });
      const cx = avg(sts.map(s => s.pos[0])), cy = avg(sts.map(s => s.pos[1]));
      const label = myHoles.length > 1 ? `Hố ${pad(myHoles[0].no)}–${pad(myHoles[myHoles.length - 1].no)}` : `Hố ${pad(myHoles[0].no)}`;
      const seen = now - rint(3, 40) * 1000;
      DB.satellites.push({
        id, name: `Tủ điều khiển ${label}`, siteId: site.id, courseId: site.courseId, status: 'online',
        ip: `10.20.${si + 1}.${11 + k}`, comm: comms[(satNo + k) % 3], firmware: (satNo === 4 || satNo === 9) ? 'v5.2.8' : 'v5.3.2',
        model: 'Bộ điều khiển hiện trường 48 kênh', lastSeen: seen, lastOk: seen, ping: rint(14, 42), signal: rint(80, 98),
        errorCode: '', errorMsg: '', holeIds: myHoles.map(h => h.id), pos: [cx + 22, cy - 26]
      });
      for (let d = 0; d < 2; d++) {
        decNo++;
        const did = 'DEC-' + decNo;
        const half = sts.filter((s, i) => d === 0 ? i < Math.ceil(sts.length / 2) : i >= Math.ceil(sts.length / 2));
        half.forEach(s => { s.decoderId = did; });
        const seenD = now - rint(4, 55) * 1000;
        DB.decoders.push({
          id: did, siteId: site.id, courseId: site.courseId, satelliteId: id,
          address: '0x' + rint(0x1000, 0xFFFF).toString(16).toUpperCase(), model: `Bộ giải mã ${half.length <= 4 ? 4 : half.length <= 8 ? 8 : 12} kênh`,
          status: 'online', current: rint(18, 31), voltage: +rnd(33.4, 35.8).toFixed(1), ping: rint(40, 120),
          lastSeen: seenD, lastOk: seenD, errorCode: '', errorMsg: ''
        });
      }
      radNo++;
      const seenR = now - rint(2, 30) * 1000;
      DB.radios.push({
        id: 'RAD-' + radNo, type: radNo === 203 ? 'Bộ lặp tín hiệu UHF' : (radNo === 206 || radNo === 209) ? 'LoRa 923 MHz' : 'Radio UHF 450 MHz',
        freq: (radNo === 206 || radNo === 209) ? '923,2 MHz' : `${(450 + (radNo - 200) * 0.125).toFixed(3).replace('.', ',')} MHz`,
        siteId: site.id, courseId: site.courseId, satelliteId: id, signal: -rint(58, 76), ping: rint(60, 180),
        status: 'online', lastSeen: seenR, lastOk: seenR, errorCode: '', errorMsg: ''
      });
    }
  });
  reindex();

  // Tình trạng bất thường có chủ đích để minh họa
  const dec102 = get('DEC-102');
  Object.assign(dec102, { status: 'warning', errorCode: 'E-305', errorMsg: 'Dòng điện solenoid bất thường trên 2 kênh', current: 58 });
  DB.stations.filter(s => s.decoderId === 'DEC-102').slice(0, 2).forEach(s => { s.status = 'error'; s.fault = 'Solenoid không phản hồi – dòng điện thấp hơn ngưỡng'; });
  const dec114 = get('DEC-114');
  Object.assign(dec114, { status: 'offline', errorCode: 'E-401', errorMsg: 'Không phản hồi lệnh truy vấn', ping: null, lastOk: now - 48 * 60e3, lastSeen: now - 48 * 60e3 });
  DB.stations.filter(s => s.decoderId === 'DEC-114').forEach(s => { s.status = 'offline'; s.fault = 'Bộ giải mã DEC-114 ngoại tuyến'; });
  Object.assign(get('SAT-007'), { status: 'warning', errorCode: 'E-214', errorMsg: 'Thời gian phản hồi cao (> 800 ms)', ping: 840, signal: 54, lastOk: now - 130 * 60e3 });
  Object.assign(get('RAD-203'), { status: 'offline', errorCode: 'E-502', errorMsg: 'Mất liên kết vô tuyến với trung tâm', signal: null, ping: null, lastOk: now - 12 * 60e3, lastSeen: now - 12 * 60e3 });
  Object.assign(get('RAD-208'), { status: 'warning', errorCode: 'E-510', errorMsg: 'Tín hiệu yếu dưới ngưỡng -85 dBm', signal: -87 });

  // Cảm biến
  const H = n => DB.holes[n - 1];
  const areaOf = (n, type) => `A${pad(n)}-${AREA[type].code}`;
  const S = (id, type, location, opt) => DB.sensors.push(Object.assign({ id, type, location, holeId: null, areaId: null, courseId: null, status: 'normal', lo: null, hi: null, battery: null, sticky: null, lastUpdate: now - rint(2, 20) * 1000 }, opt));
  S('FS-01', 'flow', 'Trạm bơm chính, ống xả tổng', { mapCourse: 'C01', where: 'pump', value: 0 });
  S('FS-02', 'flow', 'Đường ống chính Sân Bắc', { courseId: 'C01', where: 'main', value: 0 });
  S('FS-03', 'flow', 'Đường ống chính Sân Nam', { courseId: 'C02', where: 'main', value: 0 });
  S('FS-04', 'flow', 'Đường ống chính Sân Hồ', { courseId: 'C03', where: 'main', value: 0 });
  S('FS-05', 'flow', 'Nhánh phụ Hố 12', { holeId: 'H12', courseId: 'C02', areaId: areaOf(12, 'fairway'), value: 0, sticky: 'warning' });
  S('PS-01', 'pressure', 'Trạm bơm, đầu đẩy', { mapCourse: 'C01', where: 'pump', value: 74, lo: 55, hi: 85 });
  S('PS-02', 'pressure', 'Cuối tuyến Hố 03', { holeId: 'H03', courseId: 'C01', areaId: areaOf(3, 'green'), value: 66, lo: 50, hi: 85 });
  S('PS-03', 'pressure', 'Cuối tuyến Hố 09', { holeId: 'H09', courseId: 'C02', areaId: areaOf(9, 'green'), value: 65, lo: 50, hi: 85 });
  S('PS-04', 'pressure', 'Cuối tuyến Hố 15', { holeId: 'H15', courseId: 'C03', areaId: areaOf(15, 'green'), value: 67, lo: 50, hi: 85 });
  S('PS-05', 'pressure', 'Trạm bơm, đầu hút', { mapCourse: 'C01', where: 'pump2', value: 9.2, lo: 5, hi: 15 });
  [[1, 'green', 27.4], [3, 'green', 25.9], [5, 'fairway', 22.8], [7, 'green', 28.1], [9, 'green', 26.3], [11, 'fairway', 23.5], [12, 'green', 32.5], [14, 'green', 29.0], [16, 'fairway', 14.2], [18, 'green', 27.7]].forEach(([n, t, v], i) => {
    S('SM-' + pad(i + 1), 'moisture', `Hố ${pad(n)}, ${AREA[t].name}`, { holeId: H(n).id, courseId: H(n).courseId, areaId: areaOf(n, t), value: v, lo: 18, hi: 42, battery: rint(58, 97) });
  });
  S('TS-01', 'temperature', 'Trạm khí tượng, không khí', { mapCourse: 'C01', where: 'weather', value: 31.4, lo: 10, hi: 40 });
  S('TS-02', 'temperature', 'Hố 05, nhiệt độ đất', { holeId: 'H05', courseId: 'C01', areaId: areaOf(5, 'fairway'), value: 27.8, lo: 15, hi: 36 });
  S('TS-03', 'temperature', 'Hố 14, nhiệt độ đất', { holeId: 'H14', courseId: 'C03', areaId: areaOf(14, 'green'), value: 28.3, lo: 15, hi: 36 });
  S('TS-04', 'temperature', 'Nhà trạm bơm, phòng máy', { mapCourse: 'C01', where: 'pump3', value: 34.6, lo: 10, hi: 45 });
  S('RS-01', 'rain', 'Trạm khí tượng trung tâm', { mapCourse: 'C01', where: 'weather2', value: 0, lo: null, hi: 5 });
  S('RS-02', 'rain', 'Nhà điều hành Sân Nam', { courseId: 'C02', where: 'club', value: 0, hi: 5 });
  S('RS-03', 'rain', 'Hố 16, Sân Hồ', { holeId: 'H16', courseId: 'C03', areaId: areaOf(16, 'rough'), value: 0.2, hi: 5 });
  S('WL-01', 'level', 'Hồ chứa chính', { mapCourse: 'C01', where: 'lake', value: 3.42, lo: 1.5, hi: 4.5 });
  S('WL-02', 'level', 'Hồ điều hòa Sân Hồ', { courseId: 'C03', where: 'lake', value: 2.18, lo: 1.2, hi: 3.5 });
  S('WL-03', 'level', 'Bể hút trạm bơm', { mapCourse: 'C01', where: 'pump4', value: 1.86, lo: 1.2, hi: 2.6 });
  DB.sensors.forEach(s => {
    if (!s.mapCourse) s.mapCourse = s.courseId;
    const c = DB.courses.find(c => c.id === s.mapCourse);
    if (s.areaId) {
      const st = DB.stations.find(x => x.areaId === s.areaId);
      s.pos = st ? [st.pos[0] + 16, st.pos[1] + 12] : [500, 300];
    } else {
      const offs = { pump: [28, -6], pump2: [-26, -6], pump3: [28, 18], pump4: [-26, 18], main: [0, -40], weather: [0, 0], weather2: [22, 0], club: [-30, 16], lake: [0, 0] };
      const base = s.where.startsWith('pump') || s.where === 'main' ? c.pumpHouse : s.where.startsWith('weather') ? c.weather : s.where === 'club' ? c.club : c.lake;
      const o = offs[s.where] || [0, 0];
      s.pos = [base[0] + o[0], base[1] + o[1]];
    }
    s.history = genHistory(s);
    s.live = [];
    evalSensor(s);
  });

  // Máy bơm
  DB.pumps = [
    { id: 'P-01', name: 'Bơm chính 01', type: 'Bơm ly tâm trục ngang, biến tần', rated: 1000, kw: 75, status: 'running', mode: 'auto', setSpeed: 70, runtime: 5.4, starts: 2 },
    { id: 'P-02', name: 'Bơm chính 02', type: 'Bơm ly tâm trục ngang, biến tần', rated: 1000, kw: 75, status: 'running', mode: 'auto', setSpeed: 70, runtime: 4.9, starts: 2, anomaly: 16, highFlag: true },
    { id: 'P-03', name: 'Bơm chính 03', type: 'Bơm ly tâm trục ngang, biến tần', rated: 1000, kw: 75, status: 'stopped', mode: 'auto', setSpeed: 70, runtime: 1.2, starts: 1 },
    { id: 'P-04', name: 'Bơm bù áp (Jockey)', type: 'Bơm trục đứng đa tầng', rated: 120, kw: 11, status: 'running', mode: 'auto', setSpeed: 75, runtime: 11.6, starts: 6, jockey: true },
    { id: 'P-05', name: 'Bơm tăng áp Sân Hồ', type: 'Bơm ly tâm trục ngang', rated: 600, kw: 37, status: 'stopped', mode: 'manual', setSpeed: 60, runtime: 0, starts: 0 }
  ];
  DB.pumps.forEach(p => Object.assign(p, { flow: 0, target: 0, speed: 0, pressure: 0, power: 0, temp: p.status === 'running' ? 52 : 31 }));

  // Lịch tưới
  const P = (id, name, courseId, holeNos, areas, start, duration, days, priority, enabled, concurrency, note) =>
    DB.programs.push({ id, name, courseId, holeIds: holeNos.map(n => 'H' + pad(n)), areaTypes: areas, start, duration, days, priority, enabled, concurrency, note: note || '', lastRun: now - 86400e3, lastResult: 'Hoàn thành', state: { running: false, queue: [] } });
  const ALL = [0, 1, 2, 3, 4, 5, 6];
  P('PRG-01', 'Chương trình A – Green sáng sớm', 'C01', [1, 2, 3, 4, 5, 6], ['green'], '04:30', 12, ALL, 'high', true, 12, 'Tưới green trước giờ cắt cỏ buổi sáng');
  P('PRG-02', 'Chương trình B – Fairway & Rough Sân Bắc', 'C01', [1, 2, 3, 4, 5, 6], ['fairway', 'rough'], '05:10', 18, ALL, 'mid', true, 16);
  P('PRG-03', 'Chương trình C – Green, Tee & Rough Sân Nam', 'C02', [7, 8, 9, 10, 11, 12], ['green', 'tee', 'rough'], '05:40', 12, ALL, 'high', true, 16);
  P('PRG-04', 'Chương trình D – Fairway Sân Nam', 'C02', [7, 8, 9, 10, 11, 12], ['fairway'], '06:30', 18, [0, 2, 4, 6], 'mid', true, 12);
  P('PRG-05', 'Chương trình E – Toàn bộ Sân Hồ', 'C03', [13, 14, 15, 16, 17, 18], ['tee', 'fairway', 'green', 'rough'], '21:30', 15, ALL, 'mid', true, 14);
  P('PRG-06', 'Chương trình F – Rough luân phiên Sân Bắc', 'C01', [1, 2, 3, 4, 5, 6], ['rough'], '22:30', 15, [1, 3, 5], 'low', true, 6);
  P('PRG-07', 'Chương trình G – Tưới làm mát Green buổi trưa', 'C02', [7, 8, 9, 10, 11, 12], ['green'], '12:30', 3, ALL, 'high', true, 12, 'Chu kỳ làm mát ngắn khi nhiệt độ trên 32 °C');
  P('PRG-08', 'Chương trình H – Green Sân Hồ', 'C03', [13, 14, 15, 16, 17, 18], ['green'], '04:45', 10, ALL, 'high', true, 12);
  P('PRG-09', 'Chương trình I – Tee Sân Bắc', 'C01', [1, 2, 3, 4, 5, 6], ['tee'], '06:00', 10, [0, 3], 'low', false, 6, 'Tạm dừng trong thời gian gieo hạt bổ sung');
  P('PRG-10', 'Chương trình K – Rough Sân Nam', 'C02', [7, 8, 9, 10, 11, 12], ['rough'], '23:00', 15, [2, 5], 'low', true, 6);
  reindex();
  const prgA = get('PRG-01');
  prgA.lastRun = now - 35 * 60e3;
  programStations(prgA).forEach(id => { const s = get(id); if (s.status === 'idle') { s.status = 'completed'; s.lastRun = now - rint(35, 80) * 60e3; s.runsToday = 1; } });

  // Cảnh báo ban đầu
  const A = (sev, title, source, min, cat, read) => DB.alerts.push({ id: 'AL' + (++alertSeq), sev, title, source, ts: now - min * 60e3, read: !!read, ack: false, cat });
  const n114 = DB.stations.filter(s => s.decoderId === 'DEC-114').length;
  A('warning', 'Máy bơm P-02 có áp suất cao (88 PSI)', 'Trạm bơm chính', 5, 'pump');
  A('critical', 'Radio RAD-203 mất kết nối', 'Site 02, Sân Bắc', 12, 'comm');
  A('warning', 'Lưu lượng Hố 12 thấp hơn mức dự kiến 18%', 'Cảm biến FS-05', 20, 'flow');
  A('success', 'Lịch tưới Chương trình A đã hoàn thành', 'Sân Bắc', 35, 'schedule');
  A('critical', `Bộ giải mã DEC-114 ngoại tuyến, ${n114} trạm không thể tưới`, 'Site 04, Sân Nam', 48, 'comm');
  A('warning', 'Độ ẩm đất Hố 16 dưới ngưỡng (14,2%)', 'Cảm biến SM-09', 64, 'sensor', true);
  A('warning', 'Bộ giải mã DEC-102: dòng điện solenoid bất thường', 'Site 01, Sân Bắc', 92, 'device', true);
  A('info', 'Bộ điều khiển SAT-007 phản hồi chậm (840 ms)', 'Site 04, Sân Nam', 130, 'comm', true);
}
let alertSeq = 0;

function genHistory(s) {
  const pts = [], now = new Date(), nowHr = now.getHours() + now.getMinutes() / 60;
  const night = hr => (hr >= 21 || hr < 7.5) ? 1 : 0.12;
  const pat = hr => {
    switch (s.type) {
      case 'moisture': return 4 * Math.cos((hr - 6.5) / 24 * 2 * Math.PI);
      case 'temperature': return (s.where === 'weather' ? -4.5 : -1.8) * Math.cos((hr - 14) / 24 * 2 * Math.PI);
      default: return 0;
    }
  };
  for (let i = 47; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 30 * 60e3), hr = t.getHours() + t.getMinutes() / 60;
    let v;
    if (s.type === 'flow') { const peak = s.id === 'FS-01' ? 1250 : s.id === 'FS-05' ? 180 : 420; v = peak * night(hr) * rnd(0.85, 1.1); }
    else if (s.type === 'pressure') v = s.id === 'PS-05' ? rnd(8.6, 9.6) : (s.id === 'PS-01' ? 75 : 66) - 4 * night(hr) + rnd(-1.5, 1.5);
    else if (s.type === 'rain') v = (i > 30 && i < 36 && s.id !== 'RS-02') ? rnd(0, 1.2) : 0;
    else if (s.type === 'level') v = s.value + i * 0.004 + rnd(-0.01, 0.01);
    else v = s.value + pat(hr) - pat(nowHr) + rnd(-0.5, 0.5);
    pts.push({ t: t.getTime(), v: Math.max(0, v) });
  }
  return pts;
}
function evalSensor(s) {
  if (s.sticky) { s.status = s.sticky; return; }
  if (s.status === 'offline') return;
  const lo = s.type === 'moisture' ? SETTINGS.moistureMin : s.lo;
  s.status = (lo != null && s.value < lo) || (s.hi != null && s.value > s.hi) ? 'warning' : 'normal';
}

/* ================= 4. Cài đặt & trạng thái ứng dụng ================= */
const DEFAULT_SETTINGS = { clubName: 'Riverside Golf Club', interval: 3, simStep: 0.5, autoDemo: true, pressureMax: 85, flowMin: 200, flowMax: 2200, moistureMin: 18, notifyCritical: true, notifyWarning: true, notifyInfo: true };
const SETTINGS = Object.assign({}, DEFAULT_SETTINGS);

const state = {
  ctx: { courseId: 'all', siteId: 'all' },
  flow: { current: 0, target: 0, pressure: 0 },
  flowHist: [],
  lastUpdate: new Date(),
  tick: 0, idleTicks: 0, zeroTicks: 0, demoIdx: 0,
  page: 'dashboard', sub: null,
  drawer: null,
  tree: { open: new Set(['CLUB', 'C01', 'S01', 'H01']), selected: null, q: '' },
  structList: 'courses',
  eq: { tab: 'stations', course: 'all', site: 'all', hole: 'all', status: 'all', q: '', sort: { key: 'id', dir: 1 } },
  sched: { view: 'day', date: new Date(), selected: null },
  sensors: { type: 'all', status: 'all', course: 'all', q: '', sort: { key: 'id', dir: 1 } },
  map: { courseId: 'C01', layers: { stations: true, satellites: true, sensors: true, pipes: true }, status: 'all', vb: [0, 0, 1000, 620], selected: null },
  reports: { tab: 'water', from: isoDate(addDays(new Date(), -6)), to: isoDate(new Date()), course: 'all', site: 'all', hole: 'all', equip: 'all' },
  diag: { running: false, log: [], scope: 'all', filter: 'all', lastRun: null }
};

/* ---------- Truy vấn dữ liệu ---------- */
const courseName = id => (get(id) || {}).name || 'Toàn hệ thống';
const siteLabel = id => { const s = get(id); return s ? `${s.name}, ${courseName(s.courseId)}` : '—'; };
function inCtx(o) {
  const { courseId, siteId } = state.ctx;
  if (courseId !== 'all' && o.courseId && o.courseId !== courseId) return false;
  if (siteId !== 'all' && o.siteId && o.siteId !== siteId) return false;
  return true;
}
function ctxLabel() {
  const { courseId, siteId } = state.ctx;
  if (siteId !== 'all') return siteLabel(siteId);
  if (courseId !== 'all') return courseName(courseId);
  return 'Toàn bộ ' + SETTINGS.clubName;
}
function programStations(p) { return DB.stations.filter(s => p.holeIds.includes(s.holeId) && p.areaTypes.includes(s.type)).map(s => s.id); }
function programLen(p) { const n = programStations(p).filter(id => usable(get(id))).length; return Math.ceil(n / Math.max(1, p.concurrency)) * p.duration; }
function programVolume(p) { return sum(programStations(p).map(id => get(id).flow)) * p.duration * GAL_TO_M3; }
function programSites(p) { return [...new Set(p.holeIds.map(h => (get(h) || {}).siteId).filter(Boolean))]; }
function progStatus(p) {
  if (p.state.running) return { key: 'run', label: 'Đang chạy', cls: 'run' };
  if (!p.enabled) return { key: 'paused', label: 'Tạm dừng', cls: 'idle' };
  const start = hmToMin(p.start), today = p.days.includes(weekday(new Date()));
  if (today && start + programLen(p) < nowMin() || (p.lastRun && sameDay(new Date(p.lastRun), new Date()))) return { key: 'done', label: 'Hoàn thành', cls: 'done' };
  return { key: 'up', label: 'Chờ đến giờ', cls: 'wait' };
}
function progProgress(p) {
  if (!p.state.running) return null;
  const running = DB.stations.filter(s => s.program === p.id && s.status === 'running');
  const remaining = p.state.queue.length + running.length;
  const total = p.state.total || 1;
  const partial = sum(running.map(s => s.elapsed / s.duration));
  return { total, done: total - remaining, pct: clamp((total - remaining + partial) / total * 100, 0, 100), running: running.length };
}
const usable = s => s && s.status !== 'error' && s.status !== 'offline';
function stationsUnder(type, id) {
  if (type === 'club') return DB.stations;
  const key = { course: 'courseId', site: 'siteId', hole: 'holeId', area: 'areaId' }[type];
  if (!key) return type === 'station' ? [get(id)] : [];
  return DB.stations.filter(s => s[key] === id);
}
function sensorsUnder(type, id) {
  if (type === 'club') return DB.sensors;
  if (type === 'course') return DB.sensors.filter(s => s.courseId === id || (!s.courseId && s.mapCourse === id && id === 'C01'));
  if (type === 'site') { const holes = DB.holes.filter(h => h.siteId === id).map(h => h.id); return DB.sensors.filter(s => holes.includes(s.holeId)); }
  if (type === 'hole') return DB.sensors.filter(s => s.holeId === id);
  if (type === 'area') return DB.sensors.filter(s => s.areaId === id);
  return [];
}
function equipmentUnder(type, id) {
  const sts = stationsUnder(type, id);
  const sats = [...new Set(sts.map(s => s.satelliteId))].map(get).filter(Boolean);
  const decs = [...new Set(sts.map(s => s.decoderId))].map(get).filter(Boolean);
  const rads = DB.radios.filter(r => sats.some(s => s.id === r.satelliteId));
  return { sats, decs, rads };
}
const holeStations = id => DB.stations.filter(s => s.holeId === id);

/* ================= 5. Động cơ mô phỏng ================= */
function startStation(s, dur, progId) { Object.assign(s, { status: 'running', elapsed: 0, duration: dur, program: progId, startedAt: Date.now() }); }
function stopStation(s) {
  if (s.program) { const p = get(s.program); if (p && p.state.queue) p.state.queue = p.state.queue.filter(id => id !== s.id); }
  Object.assign(s, { status: 'idle', program: null, elapsed: 0, duration: 0 });
}
function startManual(s, dur) {
  if (!usable(s)) return false;
  if (s.program) { const p = get(s.program); if (p) p.state.queue = p.state.queue.filter(id => id !== s.id); }
  startStation(s, dur, null);
  return true;
}
function startProgram(p) {
  if (p.state.running) return false;
  const q = []; let skipped = 0;
  programStations(p).forEach(id => {
    const s = get(id);
    if (!usable(s)) { skipped++; return; }
    if (s.status === 'running' || s.status === 'waiting') return;
    s.status = 'waiting'; s.program = p.id; q.push(id);
  });
  if (!q.length) return false;
  p.state = { running: true, queue: q, startedAt: Date.now(), skipped, total: q.length };
  fillProgram(p);
  return true;
}
function fillProgram(p) {
  let free = p.concurrency - DB.stations.filter(s => s.program === p.id && s.status === 'running').length;
  while (free > 0 && p.state.queue.length) {
    const s = get(p.state.queue.shift());
    if (s && s.status === 'waiting' && s.program === p.id) { startStation(s, p.duration, p.id); free--; }
  }
}
function stopProgram(p) {
  DB.stations.forEach(s => { if (s.program === p.id) Object.assign(s, { status: 'idle', program: null, elapsed: 0, duration: 0 }); });
  p.state = { running: false, queue: [] };
}
function finishProgram(p) {
  p.state.running = false;
  p.lastRun = Date.now();
  p.lastResult = p.state.skipped ? `Hoàn thành, bỏ qua ${p.state.skipped} trạm lỗi` : 'Hoàn thành';
  pushAlert('success', `Lịch tưới ${p.name} đã hoàn thành`, courseName(p.courseId), 'schedule');
}
function nextDemoProgram() {
  const cands = DB.programs.filter(p => p.enabled && !p.manual && !p.state.running && programStations(p).some(id => usable(get(id)) && !['running', 'waiting'].includes(get(id).status)));
  if (!cands.length) return null;
  state.demoIdx = (state.demoIdx + 1) % cands.length;
  return cands[state.demoIdx];
}
const demandOf = filter => sum(DB.stations.filter(s => s.status === 'running' && (!filter || filter(s))).map(s => s.flow));

function simPumps() {
  const dem = demandOf();
  const manual = DB.pumps.filter(p => !p.jockey && p.mode === 'manual' && p.status === 'running');
  const manualFlow = sum(manual.map(p => p.rated * p.setSpeed / 100 * 0.92));
  const autos = DB.pumps.filter(p => !p.jockey && p.mode === 'auto' && p.status !== 'fault');
  const rest = Math.max(0, dem - manualFlow);
  const cap = 880;
  const need = rest > 40 ? Math.min(autos.length, Math.ceil(rest / cap)) : 0;
  const running = autos.filter(p => p.status === 'running');
  while (running.length < need) {
    const p = autos.find(x => x.status !== 'running'); if (!p) break;
    p.status = 'running'; p.starts++; running.push(p);
    pushAlert('info', `Máy bơm ${p.id} tự động khởi động do nhu cầu lưu lượng tăng`, 'Trạm bơm chính', 'pump');
  }
  state.zeroTicks = rest <= 0 ? state.zeroTicks + 1 : 0;
  while (running.length > need && ((running.length > 1 && rest < (running.length - 1) * cap * 0.75) || (need === 0 && state.zeroTicks >= 4))) {
    const p = running.pop(); p.status = 'stopped';
    pushAlert('info', `Máy bơm ${p.id} tự động dừng do nhu cầu lưu lượng giảm`, 'Trạm bơm chính', 'pump');
  }
  const share = running.length ? rest / running.length : 0;
  DB.pumps.forEach(p => {
    if (p.status !== 'running') { Object.assign(p, { flow: 0, speed: 0, power: 0, pressure: 0, target: p.mode === 'auto' ? 0 : p.rated * p.setSpeed / 100 }); p.temp += (31 - p.temp) * 0.12; return; }
    let f;
    if (p.jockey) f = dem < 150 ? rnd(70, 95) : rnd(22, 38);
    else if (p.mode === 'manual') f = p.rated * p.setSpeed / 100 * rnd(0.9, 0.95) * (dem > 0 ? 1 : 0.35);
    else f = share * rnd(0.97, 1.03);
    p.flow = Math.max(0, f);
    p.target = p.jockey ? 80 : p.mode === 'manual' ? p.rated * p.setSpeed / 100 : share;
    p.speed = (p.mode === 'manual' && !p.jockey) ? p.setSpeed : clamp(Math.round(28 + p.flow / p.rated * 72 + rnd(-1, 1)), 30, 100);
    p.pressure = 66 + p.speed * 0.09 + rnd(-1.2, 1.2) + (p.anomaly || 0);
    p.power = p.kw * Math.pow(p.speed / 100, 3) * 1.08;
    p.temp += ((40 + p.speed * 0.22) - p.temp) * 0.15 + rnd(-0.3, 0.3);
    p.runtime += SETTINGS.simStep / 60;
    if (p.pressure > SETTINGS.pressureMax && !p.highFlag) { p.highFlag = true; pushAlert('warning', `Máy bơm ${p.id} có áp suất cao (${fmt(p.pressure)} PSI)`, 'Trạm bơm chính', 'pump'); }
    else if (p.pressure < SETTINGS.pressureMax - 3 && p.highFlag && !p.anomaly) p.highFlag = false;
  });
  const tot = sum(DB.pumps.map(p => p.flow));
  const main = DB.pumps.filter(p => p.status === 'running' && !p.jockey);
  const jockey = DB.pumps.find(p => p.jockey);
  const press = main.length ? avg(main.map(p => p.pressure - (p.anomaly || 0) * 0.6)) - 1.5 : (jockey && jockey.status === 'running' ? jockey.pressure - 4 : 0);
  state.flow = { current: tot, target: dem, pressure: press };
  state.flowHist.push({ t: Date.now(), cur: tot, target: dem, press });
  if (state.flowHist.length > 80) state.flowHist.shift();
}

function simSensors() {
  const f = state.flow;
  DB.sensors.forEach(s => {
    if (s.status === 'offline') return;
    switch (s.type) {
      case 'flow':
        if (s.id === 'FS-01') s.value = f.current;
        else if (s.id === 'FS-05') s.value = demandOf(x => x.holeId === 'H12') * 0.82;
        else s.value = demandOf(x => x.courseId === s.courseId) * rnd(0.97, 1.03);
        break;
      case 'pressure':
        if (s.id === 'PS-05') s.value = rnd(8.6, 9.6);
        else if (s.id === 'PS-01') s.value = f.pressure || 58 + rnd(-1, 1);
        else s.value = (f.pressure || 58) - rnd(6, 10);
        break;
      case 'moisture': {
        const wet = DB.stations.some(x => x.areaId === s.areaId && x.status === 'running');
        s.value = clamp(s.value + (wet ? rnd(0.06, 0.14) : -rnd(0, 0.015)), 8, 45);
        break;
      }
      case 'temperature': s.value += rnd(-0.06, 0.07); break;
      case 'rain': break;
      case 'level':
        s.value = s.id === 'WL-03' ? clamp(1.86 + rnd(-0.03, 0.03), 1, 3) : Math.max(0.5, s.value - f.current * 0.0000004);
        break;
    }
    s.lastUpdate = Date.now();
    s.live.push(s.value); if (s.live.length > 40) s.live.shift();
    s.history[s.history.length - 1].v = s.value;
    evalSensor(s);
  });
  const t = get('TS-01'); if (t) $('#side-temp').textContent = `${fmt(t.value, 1)} °C`;
}

function simComms() {
  const now = Date.now();
  [...DB.satellites, ...DB.decoders, ...DB.radios].forEach(d => {
    if (d.status === 'offline') return;
    if (rand() < 0.5) d.lastSeen = now - rint(1, 6) * 1000;
    if (d.status === 'online') d.lastOk = d.lastSeen;
    if (d.ping != null) d.ping = Math.max(8, Math.round(d.ping + rnd(-4, 4)));
    if (d.id.startsWith('RAD') && d.signal != null) d.signal = clamp(Math.round(d.signal + rnd(-1.4, 1.4)), -95, -50);
  });
}

const EVENTS = [
  () => {
    const r = get('RAD-208');
    if (r.status === 'warning') { Object.assign(r, { status: 'online', signal: -71, errorCode: '', errorMsg: '' }); pushAlert('info', 'Radio RAD-208 tín hiệu phục hồi (-71 dBm)', siteLabel(r.siteId), 'comm'); }
    else { Object.assign(r, { status: 'warning', signal: -87, errorCode: 'E-510', errorMsg: 'Tín hiệu yếu dưới ngưỡng -85 dBm' }); pushAlert('warning', 'Radio RAD-208 tín hiệu yếu (-87 dBm)', siteLabel(r.siteId), 'comm'); }
  },
  () => {
    const s = get('PS-03');
    pushAlert('warning', `Áp suất cuối tuyến Hố 09 dao động bất thường (${fmt(s.value, 1)} PSI)`, 'Cảm biến PS-03', 'sensor');
  },
  () => {
    const sat = get('SAT-007');
    if (sat.status === 'warning') { Object.assign(sat, { status: 'online', ping: 96, signal: 81, errorCode: '', errorMsg: '' }); pushAlert('info', 'Bộ điều khiển SAT-007 phản hồi ổn định trở lại', siteLabel(sat.siteId), 'comm'); }
    else { Object.assign(sat, { status: 'warning', ping: 860, signal: 52, errorCode: 'E-214', errorMsg: 'Thời gian phản hồi cao (> 800 ms)' }); pushAlert('warning', 'Bộ điều khiển SAT-007 phản hồi chậm (860 ms)', siteLabel(sat.siteId), 'comm'); }
  }
];

function simTick() {
  state.tick++;
  const step = SETTINGS.simStep;
  DB.stations.forEach(s => {
    if (s.status !== 'running') return;
    s.elapsed += step;
    if (s.elapsed >= s.duration) {
      const pid = s.program;
      Object.assign(s, { status: 'completed', lastRun: Date.now(), program: null, elapsed: s.duration });
      s.runsToday++;
      if (pid) { const p = get(pid); if (p) fillProgram(p); }
    }
  });
  DB.programs.forEach(p => {
    if (p.state.running && !p.state.queue.length && !DB.stations.some(s => s.program === p.id)) finishProgram(p);
  });
  if (SETTINGS.autoDemo) {
    const runningProgs = DB.programs.filter(p => p.state.running).length;
    if (runningProgs < 2) {
      state.idleTicks++;
      if (state.idleTicks >= 3) {
        state.idleTicks = 0;
        const c = nextDemoProgram();
        if (c && startProgram(c)) pushAlert('info', `Lịch tưới ${c.name} bắt đầu theo lịch`, courseName(c.courseId), 'schedule');
      }
    } else state.idleTicks = 0;
  }
  simPumps();
  simSensors();
  simComms();
  state.volToday = (state.volToday || 0) + state.flow.current * step * GAL_TO_M3;
  if (state.tick % 16 === 0 && rand() < 0.6) pick(EVENTS)();
  state.lastUpdate = new Date();
  updateLive();
}

function seedSimulation() {
  // Chương trình B và C đang chạy khi mở ứng dụng
  ['PRG-02', 'PRG-03'].forEach((id, i) => {
    const p = get(id);
    startProgram(p);
    const pre = p.state.queue.splice(0, i ? 3 : 5);
    pre.forEach(sid => { const s = get(sid); Object.assign(s, { status: 'completed', program: null, lastRun: Date.now() - rint(2, 14) * 60e3 }); s.runsToday = 1; });
    DB.stations.filter(s => s.program === p.id && s.status === 'running').forEach(s => { s.elapsed = rnd(0.5, s.duration * 0.85); });
  });
  state.volToday = 1864;
  // Lịch sử lưu lượng ban đầu (khoảng 4 phút)
  const dem = demandOf();
  for (let i = 60; i > 0; i--) {
    const cur = dem * (0.9 + 0.1 * Math.sin(i / 7)) + rnd(-25, 25) + 60;
    state.flowHist.push({ t: Date.now() - i * SETTINGS.interval * 1000, cur, target: dem * (0.96 + 0.04 * Math.sin(i / 9)), press: 74 + rnd(-1.5, 1.5) });
  }
  simPumps();
  simSensors();
}

/* ================= 6. Thông báo & cảnh báo ================= */
const SEV_ICON = { critical: 'alert', warning: 'alert', info: 'info', success: 'check' };
function pushAlert(sev, title, source, cat) {
  DB.alerts.unshift({ id: 'AL' + (++alertSeq), sev, title, source, ts: Date.now(), read: false, ack: false, cat });
  if (DB.alerts.length > 80) DB.alerts.pop();
  const allow = sev === 'critical' ? SETTINGS.notifyCritical : sev === 'warning' ? SETTINGS.notifyWarning : SETTINGS.notifyInfo;
  if (allow && !(cat === 'pump' && sev === 'info')) toast(title, sev);
  renderNotifBadge();
  if (!$('#notif-dd').hidden) renderNotifDD();
}
const activeAlerts = () => DB.alerts.filter(a => !a.ack && (a.sev === 'critical' || a.sev === 'warning'));
function renderNotifBadge() {
  const n = DB.alerts.filter(a => !a.read).length;
  const el = $('#bell-badge');
  el.hidden = !n; el.textContent = n > 9 ? '9+' : n;
}
function notifHTML(a) {
  return `<div class="notif ${a.read ? '' : 'unread'}">
    <span class="sev-ic sev-${a.sev}">${icon(SEV_ICON[a.sev])}</span>
    <div class="notif-body"><p>${esc(a.title)}</p><div class="notif-meta"><span>${ago(a.ts)}</span><span>${esc(a.source)}</span></div></div>
  </div>`;
}
function renderNotifDD() {
  const unread = DB.alerts.filter(a => !a.read).length;
  $('#notif-dd').innerHTML = `
    <div class="notif-head"><h3>Thông báo <span class="sub muted">${unread} chưa đọc</span></h3><button class="link" data-action="read-all">Đánh dấu đã đọc</button></div>
    <div class="notif-list">${DB.alerts.slice(0, 14).map(notifHTML).join('') || '<div class="empty-state">Không có thông báo</div>'}</div>
    <div class="notif-foot"><button class="link" data-go="dashboard">Xem tất cả cảnh báo trên Tổng quan</button></div>`;
}

/* ================= 7. Toast, modal, drawer, tooltip ================= */
const TOAST_ICON = { success: 'check', warning: 'alert', critical: 'alert', error: 'alert', info: 'info' };
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast t-${type}`;
  el.innerHTML = `${icon(TOAST_ICON[type] || 'info')}<span>${esc(msg)}</span>`;
  const box = $('#toasts');
  box.append(el);
  while (box.children.length > 4) box.firstElementChild.remove();
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 4000);
}

let modalCloseCb = null, lastFocus = null;
function openModal({ title, body, footer = '', size = '', onMount }) {
  const m = $('#modal');
  lastFocus = document.activeElement;
  m.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <div class="modal-head"><h2 id="modal-title">${esc(title)}</h2><button class="icon-btn sm" data-close aria-label="Đóng">${icon('x')}</button></div>
    <div class="modal-body">${body}</div>${footer ? `<div class="modal-foot">${footer}</div>` : ''}</div>`;
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add('open'));
  const box = m.firstElementChild;
  if (onMount) onMount(box);
  setTimeout(() => { const f = box.querySelector('.modal-body input, .modal-body select, #confirm-ok'); if (f) f.focus(); }, 40);
  return box;
}
function closeModal() {
  const m = $('#modal');
  if (m.hidden) return;
  m.classList.remove('open');
  setTimeout(() => { if (!m.classList.contains('open')) { m.hidden = true; m.innerHTML = ''; } }, 180);
  const cb = modalCloseCb; modalCloseCb = null; if (cb) cb();
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}
function confirmDialog({ title, message, confirmText = 'Xác nhận', danger = false }) {
  return new Promise(res => {
    openModal({
      title, size: 'sm',
      body: `<div class="confirm ${danger ? 'danger' : ''}">${icon(danger ? 'alert' : 'info', 'confirm-ic')}<p>${message}</p></div>`,
      footer: `<button class="btn" data-close>Hủy</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${esc(confirmText)}</button>`,
      onMount: box => { $('#confirm-ok', box).onclick = () => { modalCloseCb = null; closeModal(); res(true); }; }
    });
    modalCloseCb = () => res(false);
  });
}
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });

function openDrawer(html, info) {
  const d = $('#drawer');
  d.innerHTML = `<div class="drawer-panel" role="dialog" aria-label="Chi tiết">${html}</div>`;
  d.hidden = false;
  state.drawer = info || null;
  requestAnimationFrame(() => d.classList.add('open'));
  drawDrawerCharts();
}
function closeDrawer() {
  const d = $('#drawer');
  if (d.hidden) return;
  d.classList.remove('open');
  state.drawer = null;
  setTimeout(() => { if (!d.classList.contains('open')) { d.hidden = true; d.innerHTML = ''; } }, 240);
  if (state.page === 'map') { state.map.selected = null; liveMap(); }
}
$('#drawer').addEventListener('mousedown', e => { if (e.target.id === 'drawer') closeDrawer(); });

const tip = $('#tooltip');
function showTipAt(html, x, y) {
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let left = x + 14, top = y + 14;
  if (left + r.width > innerWidth - 8) left = x - r.width - 14;
  if (top + r.height > innerHeight - 8) top = y - r.height - 14;
  tip.style.left = Math.max(8, left) + 'px'; tip.style.top = Math.max(8, top) + 'px';
}
function showTipFor(el, text) {
  tip.textContent = text; tip.hidden = false;
  const r = el.getBoundingClientRect(), t = tip.getBoundingClientRect();
  let left = r.left + r.width / 2 - t.width / 2, top = r.top - t.height - 8;
  if (el.dataset.tipSide && document.body.classList.contains('side-collapsed')) { left = r.right + 10; top = r.top + r.height / 2 - t.height / 2; }
  if (top < 8) top = r.bottom + 8;
  tip.style.left = clamp(left, 8, innerWidth - t.width - 8) + 'px'; tip.style.top = top + 'px';
}
const hideTip = () => { tip.hidden = true; };
document.addEventListener('mouseover', e => {
  const t = e.target.closest('[data-tip],[data-tip-side]');
  if (!t) { if (!e.target.closest('canvas,.m-st,.m-sat,.m-sen')) hideTip(); return; }
  const text = t.dataset.tip || (document.body.classList.contains('side-collapsed') ? t.dataset.tipSide : '');
  if (text) showTipFor(t, text); else hideTip();
});
document.addEventListener('focusin', e => { const t = e.target.closest('[data-tip]'); if (t) showTipFor(t, t.dataset.tip); });
document.addEventListener('focusout', hideTip);
document.addEventListener('scroll', hideTip, true);

/* ================= 8. Biểu đồ canvas ================= */
function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count, mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step };
}
function chart(canvas, cfg) {
  if (!canvas) return;
  canvas._cfg = cfg;
  if (!canvas._bound) {
    canvas._bound = true;
    canvas.addEventListener('mousemove', e => chartHover(canvas, e));
    canvas.addEventListener('mouseleave', () => { canvas._hover = null; drawChart(canvas); hideTip(); });
  }
  drawChart(canvas);
}
function drawChart(c) {
  const cfg = c._cfg;
  if (!cfg || !c.isConnected) return;
  const w = c.clientWidth, h = c.clientHeight;
  if (!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const font = '11px "Be Vietnam Pro", system-ui, sans-serif';
  const P = { l: 46, r: 14, t: 10, b: 24 };
  const iw = w - P.l - P.r, ih = h - P.t - P.b;
  const n = cfg.labels.length;
  const isBar = cfg.type === 'bar';
  let vals = [];
  if (isBar && cfg.stacked) for (let i = 0; i < n; i++) vals.push(sum(cfg.series.map(s => s.data[i] || 0)));
  else cfg.series.forEach(s => vals.push(...s.data.filter(v => v != null)));
  (cfg.lines || []).forEach(l => vals.push(l.y));
  let min = cfg.min != null ? cfg.min : (isBar ? 0 : Math.min(...vals));
  let max = cfg.max != null ? cfg.max : Math.max(...vals);
  if (!isFinite(min)) { min = 0; max = 1; }
  if (cfg.min == null && !isBar) { const pad = (max - min) * 0.12 || 1; min = Math.max(cfg.floor != null ? cfg.floor : -Infinity, min - pad); max += pad; }
  const tk = niceTicks(min, max, cfg.ticks || 4);
  min = cfg.min != null ? cfg.min : tk.min; max = cfg.max != null ? cfg.max : tk.max;
  const Y = v => P.t + ih - (v - min) / (max - min || 1) * ih;
  const X = i => isBar ? P.l + (i + 0.5) * iw / n : P.l + (n <= 1 ? iw / 2 : i * iw / (n - 1));
  c._geo = { P, iw, ih, n, X, isBar };
  // Lưới
  ctx.font = font; ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
  for (let v = tk.min; v <= tk.max + tk.step / 2; v += tk.step) {
    if (v < min - 1e-9 || v > max + 1e-9) continue;
    const y = Math.round(Y(v)) + 0.5;
    ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(w - P.r, y); ctx.stroke();
    ctx.fillStyle = COLORS.muted; ctx.fillText(fmt(v, tk.step < 1 ? 1 : 0), P.l - 8, y);
  }
  // Nhãn trục X
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / (cfg.labelW || 64)))));
  cfg.labels.forEach((lb, i) => { if (i % every === 0 || (isBar && n <= 14)) { ctx.fillStyle = COLORS.muted; ctx.fillText(lb, X(i), h - P.b + 7); } });
  // Đường ngưỡng
  (cfg.lines || []).forEach(l => {
    const y = Math.round(Y(l.y)) + 0.5;
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = l.color; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(P.l, y); ctx.lineTo(w - P.r, y); ctx.stroke(); ctx.restore();
    if (l.label) { ctx.font = '600 10.5px "Be Vietnam Pro", system-ui'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillStyle = l.color; ctx.fillText(l.label, w - P.r - 4, y - 3); ctx.font = font; }
  });
  // Chuỗi dữ liệu
  if (isBar) {
    const groupW = iw / n * 0.72, sN = cfg.stacked ? 1 : cfg.series.length, bw = Math.max(2, groupW / sN - (sN > 1 ? 2 : 0));
    for (let i = 0; i < n; i++) {
      let acc = 0;
      cfg.series.forEach((s, si) => {
        const v = s.data[i] || 0;
        const x0 = X(i) - groupW / 2 + (cfg.stacked ? 0 : si * (groupW / sN));
        const yTop = Y(cfg.stacked ? acc + v : v), yBot = Y(cfg.stacked ? acc : Math.max(min, 0));
        ctx.fillStyle = s.color; ctx.globalAlpha = c._hover == null || c._hover === i ? 1 : 0.55;
        const r = Math.min(3, bw / 2), hh = Math.max(0, yBot - yTop);
        ctx.beginPath();
        if (ctx.roundRect && (!cfg.stacked || si === cfg.series.length - 1)) ctx.roundRect(x0, yTop, bw, hh, [r, r, 0, 0]); else ctx.rect(x0, yTop, bw, hh);
        ctx.fill(); ctx.globalAlpha = 1;
        acc += v;
      });
    }
  } else {
    cfg.series.forEach(s => {
      ctx.save();
      if (s.dash) ctx.setLineDash([6, 4]);
      ctx.strokeStyle = s.color; ctx.lineWidth = s.width || 2; ctx.lineJoin = 'round';
      ctx.beginPath();
      let started = false;
      s.data.forEach((v, i) => { if (v == null) return; const x = X(i), y = Y(v); if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y); });
      ctx.stroke();
      if (s.fill) {
        ctx.lineTo(X(s.data.length - 1), P.t + ih); ctx.lineTo(X(0), P.t + ih); ctx.closePath();
        const g = ctx.createLinearGradient(0, P.t, 0, P.t + ih); g.addColorStop(0, s.color + '33'); g.addColorStop(1, s.color + '03');
        ctx.fillStyle = g; ctx.fill();
      }
      ctx.restore();
    });
    if (c._hover != null) {
      const x = X(c._hover);
      ctx.strokeStyle = 'rgba(21,48,42,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, P.t); ctx.lineTo(x, P.t + ih); ctx.stroke();
      cfg.series.forEach(s => { const v = s.data[c._hover]; if (v == null) return; ctx.fillStyle = '#fff'; ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, Y(v), 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    } else if (cfg.lastDot) {
      cfg.series.forEach(s => { if (s.dash) return; const i = s.data.length - 1; ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(X(i), Y(s.data[i]), 3.5, 0, Math.PI * 2); ctx.fill(); });
    }
  }
}
function chartHover(c, e) {
  const g = c._geo, cfg = c._cfg; if (!g || !cfg) return;
  const r = c.getBoundingClientRect(), x = e.clientX - r.left;
  let i = g.isBar ? Math.floor((x - g.P.l) / (g.iw / g.n)) : Math.round((x - g.P.l) / (g.iw / Math.max(1, g.n - 1)));
  if (i < 0 || i >= g.n) { c._hover = null; drawChart(c); hideTip(); return; }
  c._hover = i; drawChart(c);
  const u = cfg.unit ? ' ' + cfg.unit : '';
  showTipAt(`<div class="tt-title">${esc(cfg.labels[i])}</div>` + cfg.series.map(s => `<div class="tt-row"><span><i style="background:${s.color}"></i>${esc(s.name)}</span><b>${s.data[i] == null ? '—' : fmt(s.data[i], cfg.dec || 0) + u}</b></div>`).join(''), e.clientX, e.clientY);
}
function redrawAllCharts() { $$('canvas').forEach(c => c._cfg && drawChart(c)); }
window.addEventListener('resize', debounce(redrawAllCharts, 120));
function sparkSVG(data, color = COLORS.water, w = 90, h = 26) {
  if (!data || data.length < 2) return '';
  const mn = Math.min(...data), mx = Math.max(...data), rg = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1) * w).toFixed(1)},${(h - 3 - (v - mn) / rg * (h - 6)).toFixed(1)}`).join(' ');
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}

/* ================= 9. Bảng dữ liệu dùng chung ================= */
function sortRows(rows, cols, sort) {
  const c = cols.find(x => x.key === sort.key);
  if (!c) return rows;
  const val = c.sortVal || (r => r[c.key]);
  return [...rows].sort((a, b2) => {
    const x = val(a), y = val(b2);
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'vi', { numeric: true })) * sort.dir;
  });
}
function tableHTML(id, cols, rows, sort, opts = {}) {
  const sorted = sort ? sortRows(rows, cols, sort) : rows;
  const th = cols.map(c => {
    const sortable = sort && c.sort !== false;
    const aria = sortable ? `data-sort="${c.key}" aria-sort="${sort.key === c.key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}"` : '';
    return `<th ${aria} class="${c.cls || ''}">${c.label}${sortable ? '<span class="sort-ic"></span>' : ''}</th>`;
  }).join('');
  const body = sorted.length ? sorted.map(r => `<tr ${opts.noClick ? '' : `data-id="${esc(r.id)}" tabindex="0"`} class="${opts.rowCls ? opts.rowCls(r) : ''}">${cols.map(c => `<td class="${c.cls || ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')
    : `<tr class="empty"><td colspan="${cols.length}">${opts.empty || 'Không có dữ liệu phù hợp với bộ lọc hiện tại.'}</td></tr>`;
  return `<table class="table" id="${id}"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}
function bindSort(container, sortState, rerender) {
  container.addEventListener('click', e => {
    const th = e.target.closest('th[data-sort]'); if (!th) return;
    const k = th.dataset.sort;
    if (sortState.key === k) sortState.dir *= -1; else { sortState.key = k; sortState.dir = 1; }
    rerender();
  });
}
function keepScroll(el, fn) { const t = el ? el.scrollTop : 0, l = el ? el.scrollLeft : 0; fn(); if (el) { el.scrollTop = t; el.scrollLeft = l; } }

/* ================= 10. Điều hướng ================= */
const PAGES = {};
const PAGE_TITLES = { dashboard: 'Tổng quan', structure: 'Sân & Khu vực', equipment: 'Thiết bị hiện trường', schedule: 'Lịch tưới', pumps: 'Lưu lượng & Máy bơm', sensors: 'Cảm biến', map: 'Bản đồ tưới', diagnostics: 'Chẩn đoán', reports: 'Báo cáo', settings: 'Cài đặt' };
function go(page, sub) {
  const hash = `#/${page}${sub ? '/' + sub : ''}`;
  if (location.hash === hash) onRoute(); else location.hash = hash;
}
function onRoute() {
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  let page = parts[0] || 'dashboard';
  if (!PAGES[page]) page = 'dashboard';
  const sub = parts[1] || null;
  const changed = state.page !== page;
  state.page = page; state.sub = sub;
  $$('.page').forEach(p => { p.hidden = p.id !== 'page-' + page; });
  $$('[data-nav]').forEach(a => {
    const k = a.dataset.nav;
    a.classList.toggle('active', k === page || k === `${page}/${sub}` || (!sub && k === page));
    if (a.closest('.nav-sub')) a.classList.toggle('active', k === `${page}/${sub}`);
  });
  $$('.nav-group').forEach(g => {
    const has = g.dataset.group === page;
    g.classList.toggle('has-active', has);
    if (has) { g.classList.add('open'); $('.nav-toggle', g).setAttribute('aria-expanded', 'true'); }
  });
  document.title = `${PAGE_TITLES[page]} – IrriCourse`;
  document.body.classList.remove('side-open');
  hideTip();
  PAGES[page].render(sub);
  if (changed) window.scrollTo(0, 0);
}
window.addEventListener('hashchange', onRoute);

function updateLive() {
  $('#last-updated').textContent = fmtTime(state.lastUpdate);
  const live = $('.live'); live.classList.add('flash'); setTimeout(() => live.classList.remove('flash'), 400);
  renderNotifBadge();
  renderSysStatus();
  const p = PAGES[state.page];
  if (p && p.live) p.live();
  if (state.drawer) liveDrawer();
}
function renderSysStatus() {
  const fault = DB.pumps.some(p => p.status === 'fault');
  const crit = activeAlerts().filter(a => a.sev === 'critical').length;
  const flowBad = state.flow.current > SETTINGS.flowMax;
  const el = $('#sys-status');
  let cls = '', txt = 'Trạng thái hệ thống: Bình thường';
  if (fault || flowBad) { cls = 'err'; txt = 'Trạng thái hệ thống: Sự cố'; }
  else if (crit > 2) { cls = 'warn'; txt = 'Trạng thái hệ thống: Cần chú ý'; }
  el.className = 'sys-status ' + cls;
  $('#sys-status-text').textContent = txt;
  el.dataset.tip = `${activeAlerts().length} cảnh báo chưa xác nhận, ${DB.pumps.filter(p => p.status === 'running').length}/${DB.pumps.length} máy bơm đang chạy`;
}

/* ---------- Bộ chọn ngữ cảnh sân / khu vực ---------- */
function renderCtxSelects() {
  const cs = $('#ctx-course'), ss = $('#ctx-site');
  cs.innerHTML = `<option value="all">Tất cả sân (${DB.courses.length})</option>` + DB.courses.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  cs.value = state.ctx.courseId;
  const sites = DB.sites.filter(s => state.ctx.courseId === 'all' || s.courseId === state.ctx.courseId);
  ss.innerHTML = `<option value="all">Tất cả khu vực</option>` + sites.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
  if (!sites.some(s => s.id === state.ctx.siteId)) state.ctx.siteId = 'all';
  ss.value = state.ctx.siteId;
}
function applyCtx() {
  const { courseId, siteId } = state.ctx;
  Object.assign(state.eq, { course: courseId, site: siteId, hole: 'all' });
  state.sensors.course = courseId;
  Object.assign(state.reports, { course: courseId, site: siteId, hole: 'all' });
  if (courseId !== 'all') state.map.courseId = courseId;
  renderCtxSelects();
  PAGES[state.page].render(state.sub);
}
$('#ctx-course').addEventListener('change', e => { state.ctx.courseId = e.target.value; state.ctx.siteId = 'all'; applyCtx(); toast(`Đang xem: ${ctxLabel()}`, 'info'); });
$('#ctx-site').addEventListener('change', e => { state.ctx.siteId = e.target.value; applyCtx(); });

/* ---------- Sidebar ---------- */
$('#collapse-btn').addEventListener('click', () => {
  const c = document.body.classList.toggle('side-collapsed');
  $('#collapse-btn').setAttribute('aria-label', c ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng');
  setTimeout(redrawAllCharts, 260);
});
$('#mobile-menu').addEventListener('click', () => document.body.classList.toggle('side-open'));
$('#side-backdrop').addEventListener('click', () => document.body.classList.remove('side-open'));
$$('.nav-toggle').forEach(btn => btn.addEventListener('click', () => {
  const g = btn.closest('.nav-group');
  if (document.body.classList.contains('side-collapsed')) { go(g.dataset.group, g.dataset.group === 'structure' ? 'courses' : 'stations'); return; }
  const open = g.classList.toggle('open');
  btn.setAttribute('aria-expanded', open);
}));

/* ---------- Dropdown chung ---------- */
function closeDropdowns(except) {
  $$('[data-dd]').forEach(btn => { const dd = $('#' + btn.dataset.dd); if (dd !== except) { dd.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  $$('.dd-menu').forEach(m => { if (m !== except) m.hidden = true; });
}
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-dd]');
  if (btn) {
    const dd = $('#' + btn.dataset.dd);
    const open = dd.hidden;
    closeDropdowns(dd);
    dd.hidden = !open; btn.setAttribute('aria-expanded', open);
    if (open && dd.id === 'notif-dd') renderNotifDD();
    return;
  }
  const menuBtn = e.target.closest('[data-menu]');
  if (menuBtn) { const m = $('#' + menuBtn.dataset.menu); const open = m.hidden; closeDropdowns(m); m.hidden = !open; return; }
  if (!e.target.closest('.dropdown')) closeDropdowns();
  if (!e.target.closest('#gsearch')) $('#gs-results').hidden = true;
});

/* ---------- Đồng hồ ---------- */
function tickClock() {
  const d = new Date();
  $('#clock-time').textContent = fmtTime(d);
  $('#clock-date').textContent = `${DOW_LONG[weekday(d)]}, ${fmtDate(d)}`;
}

/* ---------- Tìm kiếm toàn hệ thống ---------- */
let gsItems = [], gsFocus = -1;
function globalSearch(q) {
  q = q.trim().toLowerCase();
  const box = $('#gs-results');
  if (!q) { box.hidden = true; return; }
  const groups = [
    ['Sân golf', DB.courses, c => [c.id, c.name, c.en], c => c.location, 'course'],
    ['Khu vực (Site)', DB.sites, s => [s.id, s.name], s => courseName(s.courseId), 'site'],
    ['Hố golf', DB.holes, h => [h.id, h.name], h => `${courseName(h.courseId)}, Par ${h.par}`, 'hole'],
    ['Trạm tưới', DB.stations, s => [s.id, s.name], s => `${get(s.holeId).name}, ${AREA[s.type].name}`, 'station'],
    ['Bộ điều khiển', DB.satellites, s => [s.id, s.name, s.ip], s => siteLabel(s.siteId), 'satellite'],
    ['Bộ giải mã', DB.decoders, d => [d.id, d.address], d => siteLabel(d.siteId), 'decoder'],
    ['Thiết bị Radio', DB.radios, r => [r.id, r.type], r => siteLabel(r.siteId), 'radio'],
    ['Cảm biến', DB.sensors, s => [s.id, s.location, SENSOR_TYPES[s.type].short], s => SENSOR_TYPES[s.type].short, 'sensor']
  ];
  gsItems = []; let html = '';
  groups.forEach(([title, list, keys, sub, type]) => {
    const hits = list.filter(o => keys(o).some(k => String(k).toLowerCase().includes(q))).slice(0, 5);
    if (!hits.length) return;
    html += `<div class="gs-group">${title}</div>`;
    hits.forEach(o => {
      const i = gsItems.length; gsItems.push({ type, id: o.id });
      const label = o.name || o.location || o.type;
      html += `<button class="gs-item" data-gs="${i}"><span class="gs-id">${hl(o.id, q)}</span><span>${hl(label, q)}</span><span class="gs-sub">${esc(sub(o))}</span></button>`;
    });
  });
  box.innerHTML = html || `<div class="gs-empty">Không tìm thấy kết quả cho “${esc(q)}”. Thử mã thiết bị như ST-0102, SAT-003 hoặc tên hố.</div>`;
  box.hidden = false; gsFocus = -1;
}
function openSearchResult(item) {
  $('#gs-results').hidden = true; $('#g-search').value = '';
  const { type, id } = item;
  if (['course', 'site', 'hole'].includes(type)) { selectTreeNode(type, id); go('structure'); }
  else if (type === 'station') openStationDrawer(id);
  else if (type === 'sensor') { go('sensors'); openSensorDrawer(id); }
  else { state.eq.q = ''; state.eq.course = 'all'; state.eq.site = 'all'; state.eq.status = 'all'; go('equipment', type + 's'); openEquipDrawer(id); }
}
const gsInput = $('#g-search');
gsInput.addEventListener('input', debounce(e => globalSearch(e.target.value), 100));
gsInput.addEventListener('focus', e => { if (e.target.value) globalSearch(e.target.value); });
gsInput.addEventListener('keydown', e => {
  const btns = $$('.gs-item');
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); if (!btns.length) return;
    gsFocus = (gsFocus + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length;
    btns.forEach((x, i) => x.classList.toggle('focus', i === gsFocus)); btns[gsFocus].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') { const i = gsFocus >= 0 ? gsFocus : 0; if (gsItems[i]) openSearchResult(gsItems[i]); }
  else if (e.key === 'Escape') { $('#gs-results').hidden = true; gsInput.blur(); }
});
$('#gs-results').addEventListener('click', e => { const b2 = e.target.closest('[data-gs]'); if (b2) openSearchResult(gsItems[+b2.dataset.gs]); });
document.addEventListener('keydown', e => {
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); gsInput.focus(); }
  if (e.key === 'Escape') { if (!$('#modal').hidden) closeModal(); else if (!$('#drawer').hidden) closeDrawer(); else closeDropdowns(); }
});

/* ================= 11. Bộ xử lý hành động toàn cục ================= */
const ACTIONS = {};
document.addEventListener('click', e => {
  if (e.target.closest('[data-close]')) { closeModal(); return; }
  const goEl = e.target.closest('[data-go]');
  if (goEl) {
    e.preventDefault();
    const [page, sub] = goEl.dataset.go.split('/');
    closeDropdowns();
    if (goEl.closest('.drawer')) closeDrawer();
    go(page, sub);
    return;
  }
  const a = e.target.closest('[data-action]');
  if (a && ACTIONS[a.dataset.action]) {
    e.preventDefault();
    ACTIONS[a.dataset.action](a, e);
  }
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const t = e.target;
  if (t.matches('[data-action]:not(button):not(a)')) { e.preventDefault(); t.click(); }
});

Object.assign(ACTIONS, {
  'read-all': () => { DB.alerts.forEach(a => { a.read = true; }); renderNotifBadge(); renderNotifDD(); },
  profile: () => { closeDropdowns(); toast('Hồ sơ cá nhân không khả dụng trong chế độ demo', 'info'); },
  logout: () => { closeDropdowns(); toast('Đăng xuất bị vô hiệu hóa trong chế độ demo', 'info'); },
  'drawer-close': () => closeDrawer(),
  'open-station': el => openStationDrawer(el.dataset.id),
  'open-eq': el => openEquipDrawer(el.dataset.id),
  'open-sensor': el => openSensorDrawer(el.dataset.id),
  'open-program': el => openProgramDrawer(el.dataset.id),
  'open-pump': el => { closeDrawer(); go('pumps'); setTimeout(() => { const c = $(`.pump-card[data-pump="${el.dataset.id}"]`); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); },
  'ack-alert': el => {
    const a = DB.alerts.find(x => x.id === el.dataset.id); if (!a) return;
    a.ack = true; a.read = true;
    toast('Đã xác nhận cảnh báo', 'success');
    renderNotifBadge(); renderSysStatus();
    if (PAGES[state.page].live) PAGES[state.page].live(true);
  },
  'ack-all': () => {
    activeAlerts().forEach(a => { a.ack = true; a.read = true; });
    toast('Đã xác nhận tất cả cảnh báo', 'success');
    renderNotifBadge(); renderSysStatus();
    if (PAGES[state.page].live) PAGES[state.page].live(true);
  },
  'st-start': el => {
    const s = get(el.dataset.id); if (!s) return;
    const sel = $('#dr-dur');
    const dur = sel ? +sel.value : s.defRun;
    if (!startManual(s, dur)) { toast(`${s.name} không thể tưới: ${STATION_ST[s.status].label.toLowerCase()}`, 'error'); return; }
    toast(`Đã bắt đầu tưới ${s.name} trong ${dur} phút`, 'success');
    simPumps();
    updateLive();
  },
  'st-stop': async el => {
    const s = get(el.dataset.id); if (!s) return;
    const ok = await confirmDialog({ title: 'Dừng tưới trạm', message: `Dừng tưới <b>${esc(s.name)}</b> (${esc(s.id)}) ngay lập tức?${s.program ? ' Trạm sẽ bị loại khỏi lượt chạy hiện tại của lịch tưới.' : ''}`, confirmText: 'Dừng tưới', danger: true });
    if (!ok) return;
    stopStation(s);
    toast(`Đã dừng tưới ${s.name}`, 'warning');
    simPumps();
    updateLive();
  },
  'st-map': el => {
    const s = get(el.dataset.id);
    state.map.courseId = s.courseId; state.map.selected = s.id;
    if (state.page === 'map') PAGES.map.render(); else go('map');
  },
  'tree-open': el => { closeDrawer(); selectTreeNode(el.dataset.type, el.dataset.id); go('structure'); },
  'eq-ping': el => runPing(el.dataset.id),
  'eq-reboot': el => rebootDevice(el.dataset.id),
  'sen-cal': el => toast(`Đã gửi lệnh hiệu chuẩn đến ${el.dataset.id}. Kết quả sẽ có sau vài phút`, 'info'),
  'sen-map': el => {
    const s = get(el.dataset.id);
    state.map.courseId = s.mapCourse; state.map.selected = s.id;
    if (state.page === 'map') PAGES.map.render(); else go('map');
  }
});

/* ================= 12. Ngăn chi tiết (drawer) ================= */
const crumbsHTML = parts => `<div class="crumbs">${parts.map((p, i) => (i ? icon('chev-right') : '') + (p.type ? `<button data-action="tree-open" data-type="${p.type}" data-id="${p.id}">${esc(p.label)}</button>` : `<span>${esc(p.label)}</span>`)).join('')}</div>`;
const drawerHead = (crumbs, title, tags) => `<div class="drawer-head"><div style="min-width:0">${crumbs}<h2>${esc(title)}</h2><div class="detail-title-row">${tags}</div></div><button class="icon-btn sm" data-action="drawer-close" aria-label="Đóng">${icon('x')}</button></div>`;
const kvHTML = rows => `<dl class="kv">${rows.map(([k, v, full]) => `<div class="${full ? 'full' : ''}"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const eqLink = id => id ? `<button class="link" data-action="open-eq" data-id="${id}">${esc(id)}</button>` : '—';
function sigBars(dbm) {
  if (dbm == null) return `<span class="sig"><i></i><i></i><i></i><i></i></span>`;
  const lvl = dbm > -65 ? 4 : dbm > -75 ? 3 : dbm > -85 ? 2 : 1;
  return `<span class="sig l${lvl}"><i></i><i></i><i></i><i></i></span>`;
}
function sigPct(p) { if (p == null) return sigBars(null); return sigBars(p > 85 ? -60 : p > 70 ? -70 : p > 55 ? -80 : -90); }
const pingCls = p => p == null ? 'ping-bad' : p < 150 ? 'ping-good' : p < 500 ? 'ping-mid' : 'ping-bad';
const pingText = p => p == null ? '<span class="ping-bad">Hết thời gian chờ</span>' : `<span class="${pingCls(p)}">${fmt(p)} ms</span>`;

/* ---------- Trạm tưới ---------- */
function stationDyn(s) {
  let top = '';
  if (s.status === 'running') {
    const p = s.program ? get(s.program) : null;
    top = `<div class="run-box">
      <div class="rb-top"><strong>${icon('drop')} Đang tưới${p ? ` theo ${esc(p.name.split('–')[0].trim())}` : ' thủ công'}</strong><span id="dr-prog-text">${fmt(s.elapsed, 1)} / ${s.duration} phút</span></div>
      <div class="progress lg"><span id="dr-prog-bar" style="width:${s.elapsed / s.duration * 100}%"></span></div>
      <div class="rb-top muted"><span>Lưu lượng: <b>${fmt(s.flow)} GPM</b></span><span id="dr-prog-left">Còn lại ${durText(s.duration - s.elapsed)}</span></div>
    </div>
    <div class="btn-row" style="margin-top:12px"><button class="btn btn-danger" data-action="st-stop" data-id="${s.id}">${icon('stop')}Dừng tưới</button></div>`;
  } else if (!usable(s)) {
    top = `<div class="fault-box">${icon('alert')}<div><strong>${STATION_ST[s.status].label}</strong><br>${esc(s.fault || 'Không thể điều khiển trạm')}<br><span class="muted">Kiểm tra ${eqLink(s.decoderId)} hoặc chạy chẩn đoán cho khu vực này.</span></div></div>
    <div class="btn-row" style="margin-top:12px"><button class="btn" data-go="diagnostics">${icon('pulse')}Mở trang chẩn đoán</button></div>`;
  } else {
    const waitP = s.status === 'waiting' && s.program ? get(s.program) : null;
    top = `${waitP ? `<div class="note-box" style="margin-bottom:12px">${icon('clock')}<span>Trạm đang trong hàng đợi của <b>${esc(waitP.name)}</b>. Tưới thủ công sẽ bỏ trạm khỏi hàng đợi.</span></div>` : ''}
    <div class="manual-ctrl">
      <div class="field"><label for="dr-dur">Thời gian tưới thủ công</label>
        <select class="select" id="dr-dur">${[3, 5, 10, 12, 15, 20, 30].map(m => `<option value="${m}" ${m === s.defRun ? 'selected' : ''}>${m} phút</option>`).join('')}</select></div>
      <button class="btn btn-water" data-action="st-start" data-id="${s.id}">${icon('play')}Bắt đầu tưới</button>
    </div>
    <p class="muted" style="font-size:12px;margin-top:8px">Nước dự kiến: ${fmt(s.flow * s.defRun * GAL_TO_M3, 2)} m³ cho ${s.defRun} phút. Máy bơm sẽ tự động điều chỉnh theo nhu cầu.</p>`;
  }
  return top;
}
function stationSig(s) { return `${s.status}|${s.program}`; }
function openStationDrawer(id) {
  const s = get(id); if (!s) return;
  const h = get(s.holeId), a = get(s.areaId), site = get(s.siteId), c = get(s.courseId);
  const progs = DB.programs.filter(p => programStations(p).includes(s.id));
  const sens = DB.sensors.filter(x => x.areaId === s.areaId || x.holeId === s.holeId);
  const html = drawerHead(
    crumbsHTML([{ label: c.name, type: 'course', id: c.id }, { label: site.name, type: 'site', id: site.id }, { label: h.name, type: 'hole', id: h.id }, { label: a.name, type: 'area', id: a.id }]),
    s.name, `<span class="tag t-station">${s.id}</span><span id="dr-badge">${stBadge(s.status)}</span>`) +
    `<div class="drawer-body">
      <div class="section" id="dr-dyn">${stationDyn(s)}</div>
      <div class="section"><div class="section-title"><h3>Thông tin trạm</h3></div>${kvHTML([
        ['Khu tưới', `${esc(a.name)} – ${esc(a.vi)}`], ['Loại cỏ', esc(a.turf)],
        ['Đầu tưới', esc(s.head), true],
        ['Lưu lượng thiết kế', `${fmt(s.flow)} GPM`], ['Thời gian mặc định', `${s.defRun} phút`],
        ['Bộ điều khiển', eqLink(s.satelliteId)], ['Bộ giải mã', eqLink(s.decoderId)],
        ['Lần tưới gần nhất', `<span id="dr-last">${s.lastRun ? fmtDT(s.lastRun) : '—'}</span>`], ['Số lần tưới hôm nay', `<span id="dr-runs">${s.runsToday}</span>`]
      ])}</div>
      <div class="section"><div class="section-title"><h3>Lịch tưới liên quan</h3><span class="muted">${progs.length}</span></div>
        <div class="mini-list">${progs.map(p => `<button class="mini-row" data-action="open-program" data-id="${p.id}"><span>${esc(p.name)}</span><span class="muted">${p.start} · ${p.duration} phút</span></button>`).join('') || '<div class="muted">Không thuộc lịch tưới nào</div>'}</div></div>
      <div class="section"><div class="section-title"><h3>Cảm biến lân cận</h3></div>
        <div class="mini-list">${sens.map(x => `<button class="mini-row" data-action="open-sensor" data-id="${x.id}"><span><b>${x.id}</b> · ${esc(SENSOR_TYPES[x.type].short)}</span><span>${fmt(x.value, SENSOR_TYPES[x.type].dec)} ${SENSOR_TYPES[x.type].unit} ${senBadge(x.status)}</span></button>`).join('') || '<div class="muted">Không có cảm biến tại hố này</div>'}</div></div>
      <div class="section"><div class="btn-row"><button class="btn" data-action="st-map" data-id="${s.id}">${icon('map')}Xem trên bản đồ</button><button class="btn btn-ghost" data-action="tree-open" data-type="hole" data-id="${h.id}">${icon('layers')}Mở ${esc(h.name)} trong cây</button></div></div>
    </div>`;
  openDrawer(html, { type: 'station', id, sig: stationSig(s) });
}

/* ---------- Thiết bị hiện trường ---------- */
const EQ_KIND = { SAT: 'Bộ điều khiển', DEC: 'Bộ giải mã', RAD: 'Thiết bị Radio' };
const eqKind = id => EQ_KIND[id.split('-')[0]];
const eqStations = d => d.id.startsWith('SAT') ? DB.stations.filter(s => s.satelliteId === d.id) : d.id.startsWith('DEC') ? DB.stations.filter(s => s.decoderId === d.id) : DB.stations.filter(s => s.satelliteId === d.satelliteId);
function eqSig(d) { return `${d.status}|${d.errorCode}|${d.rebooting ? 1 : 0}`; }
function equipDyn(d) {
  const sts = eqStations(d);
  const cnt = k => sts.filter(s => s.status === k).length;
  const rows = [['Trạng thái', eqBadge(d.status) + (d.rebooting ? ' <span class="badge b-wait">Đang khởi động lại</span>' : '')], ['Độ trễ (ping)', `<span id="dr-ping">${pingText(d.ping)}</span>`]];
  if (d.id.startsWith('SAT')) rows.push(['Địa chỉ IP', d.ip], ['Kênh truyền', d.comm], ['Firmware', d.firmware + (d.firmware !== 'v5.3.2' ? ' <span class="badge b-warn">Có bản mới</span>' : '')], ['Cường độ tín hiệu', `${sigPct(d.signal)}${d.signal != null ? d.signal + '%' : '—'}`], ['Model', d.model, true]);
  if (d.id.startsWith('DEC')) rows.push(['Địa chỉ', d.address], ['Model', d.model], ['Dòng điện', `${fmt(d.current)} mA`], ['Điện áp đường truyền', `${fmt(d.voltage, 1)} V`], ['Bộ điều khiển', eqLink(d.satelliteId)]);
  if (d.id.startsWith('RAD')) rows.push(['Loại', d.type], ['Tần số', d.freq], ['Tín hiệu', `${sigBars(d.signal)}${d.signal != null ? d.signal + ' dBm' : '—'}`], ['Bộ điều khiển', eqLink(d.satelliteId)]);
  rows.push(['Lần liên lạc gần nhất', `<span id="dr-seen">${ago(d.lastSeen)}</span>`], ['Liên lạc thành công', fmtDT(d.lastOk)]);
  return `${d.errorCode ? `<div class="fault-box" style="margin-bottom:14px">${icon('alert')}<div><span class="err-code">${d.errorCode}</span> · ${esc(d.errorMsg)}<br><span class="muted">Mất liên lạc ổn định từ ${fmtDT(d.lastOk)}</span></div></div>` : ''}
    ${kvHTML(rows)}
    <div class="section-title" style="margin-top:16px"><h3>Trạm tưới kết nối</h3><span class="muted">${sts.length} trạm</span></div>
    <div class="mini-list"><div><span>Sẵn sàng / Hoàn thành</span><b>${cnt('idle') + cnt('completed')}</b></div><div><span>Đang tưới / Đang chờ</span><b>${cnt('running') + cnt('waiting')}</b></div><div><span>Lỗi / Mất kết nối</span><b class="${cnt('error') + cnt('offline') ? 'ping-bad' : ''}">${cnt('error') + cnt('offline')}</b></div></div>
    <div class="btn-row" style="margin-top:16px">
      <button class="btn" data-action="eq-ping" data-id="${d.id}" ${d.rebooting ? 'disabled' : ''}>${icon('wifi')}Kiểm tra kết nối</button>
      <button class="btn" data-action="eq-reboot" data-id="${d.id}" ${d.rebooting ? 'disabled' : ''}>${icon('refresh')}Khởi động lại</button>
    </div>
    <div class="console" id="dr-ping-out" style="margin-top:12px;min-height:0;border-radius:var(--r);${d._pingLog ? '' : 'display:none'}">${d._pingLog || ''}</div>`;
}
function openEquipDrawer(id) {
  const d = get(id); if (!d) return;
  const site = get(d.siteId);
  const sts = eqStations(d);
  const title = d.id.startsWith('SAT') ? d.name : d.id.startsWith('DEC') ? `${d.id} – ${d.model}` : `${d.id} – ${d.type}`;
  const holes = [...new Set(sts.map(s => s.holeId))];
  const html = drawerHead(
    crumbsHTML([{ label: courseName(d.courseId), type: 'course', id: d.courseId }, { label: site.name, type: 'site', id: site.id }, { label: eqKind(id) }]),
    title, `<span class="tag">${d.id}</span>`) +
    `<div class="drawer-body">
      <div class="section" id="dr-dyn">${equipDyn(d)}</div>
      <div class="section"><div class="section-title"><h3>Phạm vi phục vụ</h3></div>
        <div class="equip-chips">${holes.map(hid => `<button class="eq-chip" data-action="tree-open" data-type="hole" data-id="${hid}">${icon('flag')}${esc(get(hid).name)}</button>`).join('')}</div>
        <div class="st-chips" style="margin-top:12px">${sts.slice(0, 12).map(s => `<button class="st-chip ${s.status === 'running' ? 'run' : usable(s) ? '' : 'err'}" data-action="open-station" data-id="${s.id}"><span class="top"><strong>${s.id}</strong><span class="sdot ${STATION_ST[s.status].dot}"></span></span><span class="s">${AREA[s.type].name} · ${STATION_ST[s.status].label}</span></button>`).join('')}</div>
        ${sts.length > 12 ? `<p class="muted" style="font-size:12px;margin-top:8px">và ${sts.length - 12} trạm khác</p>` : ''}
      </div>
    </div>`;
  openDrawer(html, { type: 'equip', id, sig: eqSig(d) });
}
function runPing(id) {
  const d = get(id);
  const out = $('#dr-ping-out'); if (!out) return;
  out.style.display = '';
  const t = () => fmtTime(new Date());
  const target = d.ip || d.address || d.freq;
  let log = `<div class="ln"><time>${t()}</time><span class="run">▶ PING ${d.id} (${esc(target)}) – 4 gói tin</span></div>`;
  out.innerHTML = log;
  let i = 0, okN = 0; const times = [];
  const iv = setInterval(() => {
    if (!$('#dr-ping-out') || state.drawer?.id !== id) { clearInterval(iv); return; }
    i++;
    if (d.status === 'offline') log += `<div class="ln"><time>${t()}</time><span class="err">✗ Gói ${i}: hết thời gian chờ (2000 ms)</span></div>`;
    else { const ms = Math.max(8, Math.round((d.ping || 40) * rnd(0.85, 1.2))); times.push(ms); okN++; log += `<div class="ln"><time>${t()}</time><span class="${ms > 500 ? 'warn' : 'ok'}">${ms > 500 ? '⚠' : '✓'} Gói ${i}: phản hồi ${ms} ms</span></div>`; }
    if (i === 4) {
      clearInterval(iv);
      log += `<div class="ln"><time>${t()}</time><span class="sum">Kết quả: ${okN}/4 gói thành công${times.length ? `, trung bình ${Math.round(avg(times))} ms` : ''}</span></div>`;
      if (okN) { d.lastSeen = Date.now(); if (d.status === 'online') d.lastOk = d.lastSeen; }
    }
    d._pingLog = log;
    const o = $('#dr-ping-out'); if (o) { o.innerHTML = log; o.scrollTop = o.scrollHeight; }
  }, 550);
}
async function rebootDevice(id) {
  const d = get(id);
  const n = eqStations(d).filter(s => s.status === 'running').length;
  const ok = await confirmDialog({ title: `Khởi động lại ${eqKind(id).toLowerCase()}`, message: `Khởi động lại <b>${esc(d.id)}</b>? Thiết bị sẽ mất liên lạc khoảng 30 giây.${n ? ` <b>${n} trạm đang tưới</b> sẽ tạm dừng và tiếp tục sau khi thiết bị kết nối lại.` : ''}`, confirmText: 'Khởi động lại', danger: true });
  if (!ok) return;
  d.rebooting = true; d._pingLog = '';
  toast(`Đang khởi động lại ${d.id}…`, 'info');
  liveDrawer(true);
  setTimeout(() => {
    d.rebooting = false;
    const now = Date.now();
    if (d.errorCode === 'E-305') {
      d.lastSeen = d.lastOk = now;
      pushAlert('warning', `${d.id} đã khởi động lại nhưng lỗi E-305 vẫn còn – cần kiểm tra solenoid tại hiện trường`, siteLabel(d.siteId), 'device');
    } else {
      const was = d.status;
      Object.assign(d, { status: 'online', errorCode: '', errorMsg: '', lastSeen: now, lastOk: now });
      if (d.ping == null || d.ping > 400) d.ping = d.id.startsWith('SAT') ? rint(18, 40) : d.id.startsWith('RAD') ? rint(70, 140) : rint(50, 110);
      if (d.id.startsWith('RAD') && (d.signal == null || d.signal < -80)) d.signal = -rint(62, 72);
      if (d.id.startsWith('SAT') && d.signal < 70) d.signal = rint(82, 94);
      let rec = 0;
      DB.stations.forEach(s => { if (s.status === 'offline' && (s.decoderId === d.id || s.satelliteId === d.id)) { s.status = 'idle'; s.fault = ''; rec++; } });
      DB.alerts.forEach(a => { if (a.title.includes(d.id) && a.sev !== 'success') { a.ack = true; a.read = true; } });
      pushAlert('success', `${d.id} đã kết nối lại${was === 'offline' ? ' và hoạt động bình thường' : ''}${rec ? `, ${rec} trạm sẵn sàng tưới` : ''}`, siteLabel(d.siteId), 'comm');
    }
    updateLive();
  }, 4200);
}

/* ---------- Cảm biến ---------- */
function sensorLimitsText(s) {
  const T = SENSOR_TYPES[s.type], lo = s.type === 'moisture' ? SETTINGS.moistureMin : s.lo;
  if (lo == null && s.hi == null) return '—';
  return `${lo != null ? fmt(lo, T.dec) : '—'} – ${s.hi != null ? fmt(s.hi, T.dec) : '—'} ${T.unit}`;
}
function openSensorDrawer(id) {
  const s = get(id); if (!s) return;
  const T = SENSOR_TYPES[s.type];
  const h = s.holeId ? get(s.holeId) : null;
  const crumbs = [{ label: courseName(s.mapCourse), type: 'course', id: s.mapCourse }];
  if (h) crumbs.push({ label: get(h.siteId).name, type: 'site', id: h.siteId }, { label: h.name, type: 'hole', id: h.id });
  else crumbs.push({ label: 'Hạ tầng chung' });
  const html = drawerHead(crumbsHTML(crumbs), `${s.id} – ${T.short}`, `<span class="tag t-sensor">${esc(T.name)}</span><span id="dr-badge">${senBadge(s.status)}</span>`) +
    `<div class="drawer-body">
      <div class="section">
        <div class="section-title"><div><div class="muted" style="font-size:12px">Giá trị hiện tại</div><div class="kpi-value" id="dr-sen-val">${fmt(s.value, T.dec)}<small>${T.unit}</small></div></div>
        <div style="text-align:right"><div class="muted" style="font-size:12px">Ngưỡng cho phép</div><b>${sensorLimitsText(s)}</b></div></div>
        ${s.sticky ? `<div class="note-box">${icon('info')}<span>Giá trị đo thấp hơn mức dự kiến theo lưu lượng thiết kế của nhánh. Có thể do rò rỉ hoặc tắc đầu tưới.</span></div>` : ''}
      </div>
      <div class="section"><div class="section-title"><h3>Lịch sử 24 giờ</h3><span class="muted">30 phút/điểm</span></div><div class="chart-box h-200" style="padding:0"><canvas id="dr-chart"></canvas></div></div>
      <div class="section">${kvHTML([
        ['Vị trí lắp đặt', esc(s.location), true], ['Loại cảm biến', esc(T.name)], ['Đơn vị', T.unit],
        ['Pin', s.battery != null ? `${s.battery}%` : 'Nguồn lưới'], ['Cập nhật', `<span id="dr-seen">${ago(s.lastUpdate)}</span>`],
        ['Trung bình 24h', fmt(avg(s.history.map(p => p.v)), T.dec) + ' ' + T.unit], ['Cao nhất 24h', fmt(Math.max(...s.history.map(p => p.v)), T.dec) + ' ' + T.unit]
      ])}</div>
      <div class="section"><div class="btn-row"><button class="btn" data-action="sen-map" data-id="${s.id}">${icon('map')}Xem trên bản đồ</button><button class="btn btn-ghost" data-action="sen-cal" data-id="${s.id}">${icon('gauge')}Hiệu chuẩn</button></div></div>
    </div>`;
  openDrawer(html, { type: 'sensor', id, sig: s.status });
}

/* ---------- Lịch tưới (drawer) ---------- */
function programSig(p) { return `${p.state.running}|${p.enabled}|${progStatus(p).key}`; }
function programDyn(p) {
  const st = progStatus(p), pr = progProgress(p);
  const running = DB.stations.filter(s => s.program === p.id && s.status === 'running');
  return `<div class="section-title"><span>${b(st.cls, st.label)}</span><span class="muted">Lần chạy gần nhất: ${p.lastRun ? fmtDT(p.lastRun) : '—'} · ${esc(p.lastResult)}</span></div>
    ${pr ? `<div class="run-box"><div class="rb-top"><strong>Tiến độ</strong><span id="dr-pp-text">${pr.done}/${pr.total} trạm · ${fmt(pr.pct)}%</span></div><div class="progress lg"><span id="dr-pp-bar" style="width:${pr.pct}%"></span></div><div class="rb-top muted"><span>Đang tưới đồng thời: <b id="dr-pp-run">${pr.running}</b>/${p.concurrency}</span><span>${p.state.skipped ? `Bỏ qua ${p.state.skipped} trạm lỗi` : ''}</span></div></div>
      <div class="mini-list" style="margin-top:10px" id="dr-pp-list">${running.slice(0, 6).map(s => `<button class="mini-row" data-action="open-station" data-id="${s.id}"><span><b>${s.id}</b> · ${esc(get(s.holeId).name)}, ${AREA[s.type].name}</span><span class="muted">${fmt(s.elapsed, 1)}/${s.duration} phút</span></button>`).join('')}</div>` : ''}
    <div class="btn-row" style="margin-top:14px">
      ${p.state.running ? `<button class="btn btn-danger" data-action="prog-stop" data-id="${p.id}">${icon('stop')}Dừng lịch</button>` : `<button class="btn btn-water" data-action="prog-run" data-id="${p.id}" ${p.enabled ? '' : 'disabled'}>${icon('play')}Chạy ngay</button>`}
      <button class="btn" data-action="prog-edit" data-id="${p.id}">${icon('edit')}Chỉnh sửa</button>
      <button class="btn" data-action="prog-copy" data-id="${p.id}">${icon('copy')}Sao chép</button>
      <button class="btn" data-action="prog-toggle" data-id="${p.id}">${icon(p.enabled ? 'pause' : 'check')}${p.enabled ? 'Tạm dừng' : 'Kích hoạt'}</button>
      <button class="btn btn-ghost" data-action="prog-delete" data-id="${p.id}">${icon('trash')}Xóa</button>
    </div>`;
}
function openProgramDrawer(id) {
  const p = get(id); if (!p) return;
  const sts = programStations(p);
  const html = drawerHead(crumbsHTML([{ label: 'Lịch tưới' }, { label: courseName(p.courseId), type: 'course', id: p.courseId }]), p.name, `<span class="tag">${p.id}</span>${prioHTML(p.priority)}`) +
    `<div class="drawer-body">
      <div class="section" id="dr-dyn">${programDyn(p)}</div>
      <div class="section">${kvHTML([
        ['Sân golf', esc(courseName(p.courseId))], ['Khu vực', programSites(p).map(x => get(x).name).join(', ')],
        ['Hố golf', p.holeIds.map(h => get(h).no).join(', '), true],
        ['Khu tưới', p.areaTypes.map(t => AREA[t].name).join(', ')], ['Số trạm', `${sts.length} trạm`],
        ['Giờ bắt đầu', p.start], ['Thời gian mỗi trạm', `${p.duration} phút`],
        ['Tổng thời lượng', durText(programLen(p))], ['Lượng nước dự kiến', `${fmt(programVolume(p), 1)} m³`],
        ['Ngày chạy', p.days.length === 7 ? 'Hằng ngày' : p.days.map(d => DOW[d]).join(', ')], ['Số trạm đồng thời', p.concurrency],
        ['Ghi chú', esc(p.note || '—'), true]
      ])}</div>
    </div>`;
  openDrawer(html, { type: 'program', id, sig: programSig(p) });
}

/* ---------- Cập nhật drawer theo thời gian thực ---------- */
function liveDrawer(force) {
  const info = state.drawer; if (!info) return;
  const o = get(info.id);
  if (!o) { closeDrawer(); return; }
  const dyn = $('#dr-dyn');
  if (info.type === 'station') {
    const sig = stationSig(o);
    if (sig !== info.sig || force) {
      info.sig = sig;
      const sel = $('#dr-dur'), v = sel && sel.value;
      if (dyn) dyn.innerHTML = stationDyn(o);
      const s2 = $('#dr-dur'); if (s2 && v) s2.value = v;
      const bd = $('#dr-badge'); if (bd) bd.innerHTML = stBadge(o.status);
      const l = $('#dr-last'); if (l) l.textContent = o.lastRun ? fmtDT(o.lastRun) : '—';
      const r = $('#dr-runs'); if (r) r.textContent = o.runsToday;
    } else if (o.status === 'running') {
      const bar = $('#dr-prog-bar'); if (bar) bar.style.width = (o.elapsed / o.duration * 100) + '%';
      const t = $('#dr-prog-text'); if (t) t.textContent = `${fmt(o.elapsed, 1)} / ${o.duration} phút`;
      const lf = $('#dr-prog-left'); if (lf) lf.textContent = `Còn lại ${durText(o.duration - o.elapsed)}`;
    }
  } else if (info.type === 'equip') {
    const sig = eqSig(o);
    if (sig !== info.sig || force) { info.sig = sig; if (dyn) dyn.innerHTML = equipDyn(o); }
    else { const p = $('#dr-ping'); if (p) p.innerHTML = pingText(o.ping); const sn = $('#dr-seen'); if (sn) sn.textContent = ago(o.lastSeen); }
  } else if (info.type === 'sensor') {
    const T = SENSOR_TYPES[o.type];
    const v = $('#dr-sen-val'); if (v) v.innerHTML = `${fmt(o.value, T.dec)}<small>${T.unit}</small>`;
    const bd = $('#dr-badge'); if (bd) bd.innerHTML = senBadge(o.status);
    const sn = $('#dr-seen'); if (sn) sn.textContent = ago(o.lastUpdate);
    drawDrawerCharts();
  } else if (info.type === 'program') {
    const sig = programSig(o);
    if (sig !== info.sig || force || o.state.running) { info.sig = sig; if (dyn) dyn.innerHTML = programDyn(o); }
  }
}
function drawDrawerCharts() {
  const info = state.drawer; if (!info || info.type !== 'sensor') return;
  const s = get(info.id), T = SENSOR_TYPES[s.type], c = $('#dr-chart'); if (!c) return;
  const lo = s.type === 'moisture' ? SETTINGS.moistureMin : s.lo;
  const lines = [];
  if (lo != null) lines.push({ y: lo, color: COLORS.amber, label: 'Ngưỡng dưới' });
  if (s.hi != null && s.type !== 'rain') lines.push({ y: s.hi, color: COLORS.red, label: 'Ngưỡng trên' });
  chart(c, { type: s.type === 'rain' ? 'bar' : 'line', labels: s.history.map(p => fmtHM(new Date(p.t))), series: [{ name: T.short, data: s.history.map(p => p.v), color: s.type === 'moisture' ? COLORS.turf : s.type === 'temperature' ? COLORS.amber : COLORS.water, fill: true }], lines, unit: T.unit, dec: T.dec, floor: 0, lastDot: true, labelW: 56 });
}

/* ================= 13. Trang Tổng quan ================= */
const realPrograms = () => DB.programs.filter(p => !p.manual);
const pageHead = (title, sub, actions = '') => `<div class="page-head"><div><h1>${title}</h1><p class="page-sub">${sub}</p></div><div class="page-actions">${actions}</div></div>`;
const statCell = (label, value, unit, sub, id) => `<div><div class="fs-label">${label}</div><div class="fs-value" ${id ? `id="${id}"` : ''}>${value}${unit ? `<small>${unit}</small>` : ''}</div>${sub ? `<div class="kpi-sub">${sub}</div>` : ''}</div>`;

function dashCounts() {
  const sts = DB.stations.filter(inCtx);
  const c = k => sts.filter(s => s.status === k).length;
  return {
    courses: DB.courses.filter(x => state.ctx.courseId === 'all' || x.id === state.ctx.courseId).length,
    sites: DB.sites.filter(inCtx).length, holes: DB.holes.filter(inCtx).length,
    stations: sts.length, running: c('running'), waiting: c('waiting'), completed: c('completed'), idle: c('idle'), error: c('error') + c('offline'),
    pumpsOn: DB.pumps.filter(p => p.status === 'running').length, alerts: activeAlerts().length,
    crit: activeAlerts().filter(a => a.sev === 'critical').length, sts
  };
}
function kpiHTML() {
  const k = dashCounts();
  const cell = (go, ic, label, value, sub, cls = '', unit = '') => `<button class="kpi ${cls}" data-go="${go}"><span class="kpi-label">${icon(ic)}${label}</span><span class="kpi-value">${value}${unit ? `<small>${unit}</small>` : ''}</span><span class="kpi-sub">${sub}</span></button>`;
  return cell('structure/courses', 'flag', 'Sân golf', k.courses, `${fmt(sum(DB.courses.filter(c => state.ctx.courseId === 'all' || c.id === state.ctx.courseId).map(c => c.area)), 1)} ha diện tích tưới`) +
    cell('structure/sites', 'layers', 'Khu vực (Site)', k.sites, `${DB.satellites.filter(inCtx).length} bộ điều khiển`) +
    cell('structure/holes', 'flag', 'Hố golf', k.holes, `Par ${sum(DB.holes.filter(inCtx).map(h => h.par))}`) +
    cell('equipment/stations', 'station', 'Trạm tưới', k.stations, `${k.error} trạm lỗi / mất kết nối`) +
    cell('map', 'drop', 'Đang tưới', k.running, `${k.waiting} trạm đang chờ`, 'run', 'trạm') +
    cell('pumps', 'pump', 'Máy bơm đang chạy', `${k.pumpsOn}/${DB.pumps.length}`, DB.pumps.some(p => p.highFlag) ? 'Có máy bơm áp suất cao' : 'Hoạt động ổn định') +
    cell('pumps', 'gauge', 'Lưu lượng hiện tại', fmt(state.flow.current), `Áp suất ${fmt(state.flow.pressure, 1)} PSI`, 'run', 'GPM') +
    cell('diagnostics', 'alert', 'Cảnh báo', k.alerts, `${k.crit} nghiêm trọng`, k.crit ? 'warn' : '');
}
function irrStatusHTML() {
  const k = dashCounts(), tot = k.stations || 1;
  const rows = [['Đang tưới', k.running, COLORS.water], ['Đã hoàn thành', k.completed, '#7FB89A'], ['Đang chờ', k.waiting, '#9DBDD9'], ['Lỗi', k.error, COLORS.red], ['Sẵn sàng', k.idle, '#D6DFDB']];
  const progs = DB.programs.filter(p => p.state.running && (state.ctx.courseId === 'all' || p.courseId === state.ctx.courseId));
  return `<div class="irr-bar">${rows.map(r => `<span style="width:${r[1] / tot * 100}%;background:${r[2]}" data-tip="${r[0]}: ${r[1]} trạm"></span>`).join('')}</div>
    <div class="irr-rows">${rows.slice(0, 4).map(r => `<div class="irr-row"><i style="background:${r[2]}"></i><span>${r[0]}</span><b>${r[1]}</b><span class="pct">${fmt(r[1] / tot * 100)}%</span></div>`).join('')}</div>
    <div class="prog-mini">${progs.length ? progs.map(p => { const pr = progProgress(p); return `<div class="prog-mini-row" data-action="open-program" data-id="${p.id}" tabindex="0"><div class="top"><strong>${esc(p.name)}</strong><span class="muted">${pr.done}/${pr.total} trạm</span></div><div class="progress"><span style="width:${pr.pct}%"></span></div></div>`; }).join('') : '<span class="muted" style="font-size:12.5px">Không có lịch tưới nào đang chạy</span>'}</div>`;
}
function pumpsTableHTML() {
  return tableHTML('dash-pumps', [
    { key: 'name', label: 'Máy bơm', render: p => `<b>${p.id}</b><span class="cell-sub">${esc(p.name)}</span>` },
    { key: 'status', label: 'Trạng thái', render: p => b(p.highFlag && p.status === 'running' ? 'warn' : PUMP_ST[p.status].cls, p.highFlag && p.status === 'running' ? 'Áp suất cao' : PUMP_ST[p.status].label) + ` <span class="muted" style="font-size:11.5px">${p.mode === 'auto' ? 'Tự động' : 'Thủ công'}</span>` },
    { key: 'flow', label: 'Lưu lượng', cls: 'num', render: p => `${fmt(p.flow)} <span class="muted">GPM</span>` },
    { key: 'pressure', label: 'Áp suất', cls: 'num', render: p => p.status === 'running' ? `<span class="${p.pressure > SETTINGS.pressureMax ? 'ping-bad' : ''}">${fmt(p.pressure, 1)}</span> <span class="muted">PSI</span>` : '—' },
    { key: 'speed', label: 'Tốc độ', render: p => `<div class="meter"><div class="progress ${p.status === 'running' ? '' : 'turf'}"><span style="width:${p.speed}%"></span></div><span class="v">${p.speed}%</span></div>` },
    { key: 'runtime', label: 'Giờ chạy hôm nay', cls: 'num', render: p => hoursText(p.runtime) }
  ], DB.pumps, null, { rowCls: () => '' });
}
function alertsHTML() {
  const list = DB.alerts.filter(a => a.sev !== 'success' || Date.now() - a.ts < 3600e3).slice(0, 14);
  if (!list.length) return `<div class="empty-state">${icon('check')}Không có cảnh báo</div>`;
  return list.map(a => `<div class="alert-item ${a.ack ? 'acked' : ''} ${!a.ack ? 'sev-row-' + a.sev : ''}">
    <span class="sev-ic sev-${a.sev}">${icon(SEV_ICON[a.sev])}</span>
    <div class="ai-body"><p>${esc(a.title)}</p><div class="ai-meta"><span>${ago(a.ts)}</span><span>${esc(a.source)}</span><span>${{ critical: 'Nghiêm trọng', warning: 'Cảnh báo', info: 'Thông tin', success: 'Hoàn thành' }[a.sev]}</span></div></div>
    ${!a.ack && (a.sev === 'critical' || a.sev === 'warning') ? `<button class="btn btn-sm" data-action="ack-alert" data-id="${a.id}">Xác nhận</button>` : a.ack ? `<span class="muted" style="font-size:11.5px">Đã xác nhận</span>` : ''}
  </div>`).join('');
}
function runListHTML() {
  const sts = DB.stations.filter(s => s.status === 'running' && inCtx(s)).sort((a, c) => (c.elapsed / c.duration) - (a.elapsed / a.duration));
  if (!sts.length) return `<div class="empty-state">${icon('drop')}Hiện không có trạm nào đang tưới<button class="btn btn-sm" data-go="structure">Chọn trạm để tưới thủ công</button></div>`;
  return sts.slice(0, 9).map(s => { const p = s.program ? get(s.program) : null; return `<div class="run-item" data-action="open-station" data-id="${s.id}" tabindex="0">
    <div><b>${s.id}</b><div class="muted" style="font-size:11.5px">${fmt(s.flow)} GPM</div></div>
    <div class="ri-where">${esc(get(s.holeId).name)} · ${AREA[s.type].name}<span>${esc(courseName(s.courseId))} · ${p ? esc(p.name.split('–')[0].trim()) : 'Tưới thủ công'}</span></div>
    <div class="ri-prog"><span>Còn ${durText(s.duration - s.elapsed)}</span><div class="progress"><span style="width:${s.elapsed / s.duration * 100}%"></span></div></div>
  </div>`; }).join('') + (sts.length > 9 ? `<div class="run-more">và ${sts.length - 9} trạm khác đang tưới · <button class="link" data-go="equipment/stations">Xem tất cả</button></div>` : '');
}
function timelineHTML() {
  const today = weekday(new Date());
  const progs = realPrograms().filter(p => p.days.includes(today) && (state.ctx.courseId === 'all' || p.courseId === state.ctx.courseId)).sort((a, c) => hmToMin(a.start) - hmToMin(c.start));
  if (!progs.length) return `<div class="empty-state">${icon('cal')}Không có lịch tưới hôm nay</div>`;
  return progs.map(p => { const st = progStatus(p); return `<div class="tl-item st-${st.key}" data-action="open-program" data-id="${p.id}" tabindex="0">
    <span class="tl-time">${p.start}</span><span class="tl-dot"></span>
    <div class="tl-body"><strong>${esc(p.name)}</strong><span>${esc(courseName(p.courseId))} · ${programStations(p).length} trạm · ${durText(programLen(p))}</span></div>
    ${b(st.cls, st.label)}</div>`; }).join('');
}
function flowChartCfg(n = 60) {
  const h = state.flowHist.slice(-n);
  return {
    type: 'line', labels: h.map(x => fmtTime(new Date(x.t)).slice(0, 5 + 3)), unit: 'GPM', floor: 0, lastDot: true, labelW: 70,
    series: [{ name: 'Lưu lượng thực tế', data: h.map(x => x.cur), color: COLORS.water, fill: true, width: 2.2 }, { name: 'Nhu cầu mục tiêu', data: h.map(x => x.target), color: COLORS.ink, dash: true, width: 1.4 }],
    lines: [{ y: SETTINGS.flowMax, color: COLORS.red, label: `Tối đa ${fmt(SETTINGS.flowMax)}` }, { y: SETTINGS.flowMin, color: COLORS.amber, label: `Tối thiểu ${fmt(SETTINGS.flowMin)}` }]
  };
}
PAGES.dashboard = {
  render() {
    const el = $('#page-dashboard');
    el.innerHTML = pageHead('Tổng quan hệ thống tưới', `${esc(ctxLabel())} · ${DOW_LONG[weekday(new Date())]}, ${fmtDate(new Date())}`,
      `<button class="btn" data-go="map">${icon('map')}Bản đồ tưới</button><button class="btn btn-primary" data-action="new-program">${icon('plus')}Tạo lịch tưới</button>`) +
      `<div class="panel kpi-panel" id="dash-kpi">${kpiHTML()}</div>
      <div class="dash-grid">
        <div class="panel span-8">
          <div class="panel-head"><h3>Lưu lượng hệ thống <span class="sub">Thời gian thực, cập nhật mỗi ${SETTINGS.interval} giây</span></h3>
            <div class="legend"><span><i style="background:${COLORS.water}"></i>Thực tế</span><span><i style="background:${COLORS.ink}"></i>Mục tiêu</span><span><i style="background:${COLORS.red}"></i>Giới hạn</span></div></div>
          <div class="flow-stats" id="dash-fs"></div>
          <div class="chart-box h-260"><canvas id="dash-flow"></canvas></div>
        </div>
        <div class="panel span-4"><div class="panel-head"><h3>Trạng thái tưới</h3><button class="link" data-go="equipment/stations">Chi tiết</button></div><div class="panel-body" id="dash-irr"></div></div>
        <div class="panel span-7"><div class="panel-head"><h3>Trạng thái máy bơm</h3><button class="link" data-go="pumps">Điều khiển máy bơm</button></div><div class="table-wrap" id="dash-pumps-w"></div></div>
        <div class="panel span-5"><div class="panel-head"><h3>Cảnh báo <span class="count-pill" id="dash-al-n"></span></h3><button class="link" data-action="ack-all">Xác nhận tất cả</button></div><div class="alert-list" id="dash-alerts"></div></div>
        <div class="panel span-7"><div class="panel-head"><h3>Trạm đang tưới <span class="sub" id="dash-run-n"></span></h3><button class="link" data-go="map">Xem trên bản đồ</button></div><div class="run-list" id="dash-run"></div></div>
        <div class="panel span-5"><div class="panel-head"><h3>Lịch tưới hôm nay</h3><button class="link" data-go="schedule">Mở lịch tưới</button></div><div class="timeline" id="dash-tl"></div></div>
      </div>`;
    this.live(true);
  },
  live(force) {
    if (!$('#dash-kpi')) return;
    $('#dash-kpi').innerHTML = kpiHTML();
    const f = state.flow, util = f.current / (SETTINGS.flowMax || 1) * 100;
    $('#dash-fs').innerHTML = statCell('<i></i>Hiện tại', fmt(f.current), 'GPM', `${fmt(util)}% công suất tối đa`) + statCell('<i class="dash"></i>Mục tiêu', fmt(f.target), 'GPM', 'Tổng nhu cầu các trạm') + statCell('Áp suất đường ống', fmt(f.pressure, 1), 'PSI', `Ngưỡng cao ${SETTINGS.pressureMax} PSI`) + statCell('Nước đã dùng hôm nay', fmt(state.volToday, 0), 'm³', `≈ ${fmt(state.volToday / GAL_TO_M3 / 1000)} nghìn gallon`);
    chart($('#dash-flow'), flowChartCfg());
    $('#dash-irr').innerHTML = irrStatusHTML();
    $('#dash-pumps-w').innerHTML = pumpsTableHTML();
    $$('#dash-pumps tbody tr').forEach((tr, i) => { tr.dataset.action = 'open-pump'; tr.dataset.id = DB.pumps[i].id; });
    const n = activeAlerts().length;
    const pill = $('#dash-al-n'); pill.textContent = n; pill.classList.toggle('neutral', !n);
    const sig = DB.alerts.map(a => a.id + a.ack).join();
    const al = $('#dash-alerts');
    if (force || al._sig !== sig || state.tick % 10 === 0) keepScroll(al, () => { al.innerHTML = alertsHTML(); al._sig = sig; });
    const rl = DB.stations.filter(s => s.status === 'running' && inCtx(s)).length;
    $('#dash-run-n').textContent = `${rl} trạm`;
    $('#dash-run').innerHTML = runListHTML();
    const tl = $('#dash-tl'); keepScroll(tl, () => { tl.innerHTML = timelineHTML(); });
  }
};

/* ================= 14. Sân & Khu vực (cây phân cấp) ================= */
const TYPE_LABEL = { club: 'Câu lạc bộ', course: 'Sân golf', site: 'Khu vực', hole: 'Hố golf', area: 'Khu tưới', station: 'Trạm tưới', sensor: 'Cảm biến' };
function nodeObj(type, id) { return type === 'club' ? CLUB : get(id); }
function nodeChildren(type, id) {
  switch (type) {
    case 'club': return DB.courses.map(c => ['course', c.id]);
    case 'course': return DB.sites.filter(s => s.courseId === id).map(s => ['site', s.id]);
    case 'site': return DB.holes.filter(h => h.siteId === id).map(h => ['hole', h.id]);
    case 'hole': return DB.areas.filter(a => a.holeId === id).map(a => ['area', a.id]);
    case 'area': return [...DB.stations.filter(s => s.areaId === id).map(s => ['station', s.id]), ...DB.sensors.filter(s => s.areaId === id).map(s => ['sensor', s.id])];
    default: return [];
  }
}
function nodeParent(type, id) {
  const o = nodeObj(type, id);
  switch (type) {
    case 'course': return ['club', 'CLUB'];
    case 'site': return ['course', o.courseId];
    case 'hole': return ['site', o.siteId];
    case 'area': return ['hole', o.holeId];
    case 'station': return ['area', o.areaId];
    case 'sensor': return o.areaId ? ['area', o.areaId] : o.holeId ? ['hole', o.holeId] : ['course', o.mapCourse];
    default: return null;
  }
}
function nodeLabel(type, id) {
  const o = nodeObj(type, id);
  if (type === 'station') return `${o.id} · ${o.name}`;
  if (type === 'sensor') return `${o.id} · ${SENSOR_TYPES[o.type].short}`;
  if (type === 'area') return `${o.name} (${o.vi})`;
  return o.name;
}
function nodeStatus(type, id) {
  if (type === 'sensor') { const s = get(id); return { normal: 'ok', warning: 'warn', offline: 'err' }[s.status]; }
  const sts = stationsUnder(type, id);
  if (type === 'station') return STATION_ST[sts[0].status].dot;
  if (!sts.length) return 'idle';
  if (sts.some(s => s.status === 'running')) return 'run';
  if (sts.some(s => !usable(s))) return sts.every(s => !usable(s)) ? 'err' : 'warn';
  if (sts.some(s => s.status === 'waiting')) return 'wait';
  return 'ok';
}
function nodeMeta(type, id) {
  if (type === 'station') { const s = get(id); return s.status === 'running' ? `${durText(s.duration - s.elapsed)}` : STATION_ST[s.status].label; }
  if (type === 'sensor') { const s = get(id), T = SENSOR_TYPES[s.type]; return `${fmt(s.value, T.dec)} ${T.unit}`; }
  const sts = stationsUnder(type, id), r = sts.filter(s => s.status === 'running').length;
  if (type === 'hole') return `Par ${get(id).par} · ${sts.length} trạm${r ? ` · <span class="ping-good" style="color:var(--water-2)">${r} đang tưới</span>` : ''}`;
  return `${sts.length} trạm${r ? ` · <span style="color:var(--water-2)">${r} đang tưới</span>` : ''}`;
}
function nodeMatches(type, id, q) {
  if (!q) return true;
  const o = nodeObj(type, id);
  const hay = [o.id, o.name, o.vi, o.location, type === 'sensor' ? SENSOR_TYPES[o.type].short : ''].join(' ').toLowerCase();
  return hay.includes(q);
}
function treeHTML() {
  const q = state.tree.q.trim().toLowerCase();
  const sel = state.tree.selected;
  const memo = new Map();
  const visible = (type, id) => {
    const k = type + ':' + id;
    if (memo.has(k)) return memo.get(k);
    const v = nodeMatches(type, id, q) || nodeChildren(type, id).some(([t, i]) => visible(t, i));
    memo.set(k, v); return v;
  };
  const rec = (type, id, d) => {
    if (q && !visible(type, id)) return '';
    const kids = nodeChildren(type, id);
    const key = type + ':' + id;
    const open = q ? kids.some(([t, i]) => visible(t, i)) : state.tree.open.has(id);
    const isSel = sel && sel.type === type && sel.id === id;
    const label = nodeLabel(type, id);
    return `<li role="none"><div class="tn ${isSel ? 'sel' : ''}" role="treeitem" tabindex="${isSel ? 0 : -1}" aria-selected="${!!isSel}" ${kids.length ? `aria-expanded="${open}"` : ''} data-node="${key}" style="--d:${d}">
      <button class="tn-caret" data-caret tabindex="-1" aria-label="${open ? 'Thu gọn' : 'Mở rộng'}" aria-expanded="${open}" ${kids.length ? '' : 'disabled'}>${icon('chev-right')}</button>
      <span class="sdot ${nodeStatus(type, id)}"></span><span class="tn-name">${q ? hl(label, q) : esc(label)}</span><span class="tn-meta">${nodeMeta(type, id)}</span>
    </div>${kids.length && open ? `<ul role="group">${kids.map(([t, i]) => rec(t, i, d + 1)).join('')}</ul>` : ''}</li>`;
  };
  const html = rec('club', 'CLUB', 0);
  return html || `<li class="empty-state">${icon('search')}Không tìm thấy “${esc(q)}”</li>`;
}
function selectTreeNode(type, id) {
  if (type === 'station' || type === 'sensor' || !nodeObj(type, id)) { if (type === 'station') openStationDrawer(id); else if (type === 'sensor') openSensorDrawer(id); return; }
  state.tree.selected = { type, id };
  let p = nodeParent(type, id);
  state.tree.open.add(id);
  while (p) { state.tree.open.add(p[1]); p = nodeParent(p[0], p[1]); }
  if (state.page === 'structure') { renderTree(); renderStructDetail(); scrollTreeToSel(); }
}
function scrollTreeToSel() { const n = $('#tree .tn.sel'); if (n) n.scrollIntoView({ block: 'nearest' }); }
function renderTree() { const t = $('#tree'); if (!t) return; keepScroll(t, () => { t.innerHTML = treeHTML(); }); t._sig = structSig(); }
const structSig = () => DB.stations.map(s => s.status[0] + s.status[1]).join('') + DB.sensors.map(s => s.status[0]).join('') + DB.stations.length;

function crumbsFor(type, id) {
  const chain = []; let cur = [type, id];
  while (cur) { chain.unshift(cur); cur = nodeParent(cur[0], cur[1]); }
  return crumbsHTML(chain.map(([t, i], k) => k === chain.length - 1 ? { label: nodeObj(t, i).name } : { label: nodeObj(t, i).name, type: t, id: i }));
}
function structDetailHTML() {
  const sel = state.tree.selected || { type: 'club', id: 'CLUB' };
  const { type, id } = sel, o = nodeObj(type, id);
  const sts = stationsUnder(type, id), sens = sensorsUnder(type, id), eq = equipmentUnder(type, id);
  const run = sts.filter(s => s.status === 'running').length, bad = sts.filter(s => !usable(s)).length;
  const stKey = nodeStatus(type, id);
  const stBadgeN = { run: b('run', 'Đang tưới'), err: b('err', 'Lỗi'), warn: b('warn', 'Cảnh báo'), wait: b('wait', 'Đang chờ'), ok: b('ok', 'Hoạt động'), idle: b('idle', 'Chưa có trạm') }[stKey];
  const acts = [];
  if (type === 'course') acts.push(`<button class="btn btn-sm" data-action="struct-add" data-kind="site" data-parent="${id}">${icon('plus')}Thêm khu vực</button>`);
  if (type === 'site') acts.push(`<button class="btn btn-sm" data-action="struct-add" data-kind="hole" data-parent="${id}">${icon('plus')}Thêm hố</button>`);
  if (['site', 'hole', 'area'].includes(type)) acts.push(run ? `<button class="btn btn-sm btn-danger" data-action="struct-stop" data-type="${type}" data-id="${id}">${icon('stop')}Dừng tưới</button>` : `<button class="btn btn-sm btn-water" data-action="struct-water" data-type="${type}" data-id="${id}" ${sts.some(usable) ? '' : 'disabled'}>${icon('play')}Tưới toàn ${type === 'area' ? 'khu' : type === 'hole' ? 'hố' : 'khu vực'}</button>`);
  if (type !== 'club') acts.push(`<button class="btn btn-sm" data-action="struct-edit" data-type="${type}" data-id="${id}">${icon('edit')}Chỉnh sửa</button>`, `<button class="btn btn-sm btn-ghost" data-action="struct-delete" data-type="${type}" data-id="${id}" aria-label="Xóa">${icon('trash')}Xóa</button>`);
  const info = [['Tên', esc(o.name)], ['Mã', `<span class="tag t-${type}">${esc(o.id)}</span>`], ['Trạng thái', stBadgeN], ['Vị trí', esc(o.location || '—')], ['Số trạm tưới', `${sts.length}${bad ? ` <span class="muted" style="font-weight:400">(${bad} lỗi)</span>` : ''}`], ['Số cảm biến', sens.length], ['Đang tưới', `<span style="color:var(--water-2)">${run} trạm</span>`]];
  if (type === 'course') info.push(['Diện tích tưới', `${fmt(o.area, 1)} ha`], ['Số hố', DB.holes.filter(h => h.courseId === id).length]);
  if (type === 'hole') info.push(['Par', o.par], ['Chiều dài', `${fmt(o.length)} m`]);
  if (type === 'area') info.push(['Loại cỏ', esc(o.turf)], ['Lưu lượng thiết kế', `${fmt(sum(sts.map(s => s.flow)))} GPM`]);
  if (type === 'club') info.push(['Sân golf', DB.courses.length], ['Hố golf', DB.holes.length]);
  const kids = nodeChildren(type, id).filter(([t]) => t !== 'station' && t !== 'sensor');
  const eqChips = [...eq.sats.map(x => [x, 'chip']), ...eq.decs.map(x => [x, 'chip']), ...eq.rads.map(x => [x, 'radio'])];
  return `<div class="detail-head"><div style="min-width:0">${type === 'club' ? `<div class="crumbs"><span>Cấu trúc hệ thống</span></div>` : crumbsFor(type, id)}
      <h2>${esc(o.name)}</h2><div class="detail-title-row"><span class="tag t-${type}">${TYPE_LABEL[type]}</span>${type === 'hole' ? `<span class="muted" style="font-size:12.5px">${esc(courseName(o.courseId))} · ${esc(get(o.siteId).name)}</span>` : ''}</div></div>
      <div class="btn-row">${acts.join('')}</div></div>
    <dl class="info-grid">${info.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
    ${kids.length ? `<div class="section"><div class="section-title"><h3>${TYPE_LABEL[kids[0][0]]} trực thuộc</h3><span class="muted">${kids.length}</span></div>
      <div class="st-chips">${kids.map(([t, i]) => { const k = nodeObj(t, i), s2 = stationsUnder(t, i), r2 = s2.filter(s => s.status === 'running').length; return `<button class="st-chip ${r2 ? 'run' : ''}" data-action="tree-select" data-type="${t}" data-id="${i}"><span class="top"><strong>${esc(k.name)}</strong><span class="sdot ${nodeStatus(t, i)}"></span></span><span class="s">${t === 'area' ? esc(k.vi) + ' · ' : ''}${s2.length} trạm${r2 ? ` · ${r2} đang tưới` : ''}</span></button>`; }).join('')}</div></div>` : ''}
    ${['hole', 'area'].includes(type) ? `<div class="section"><div class="section-title"><h3>Trạm tưới</h3><span class="muted">Nhấn để xem chi tiết và điều khiển</span></div>
      <div class="st-chips">${sts.map(s => `<button class="st-chip ${s.status === 'running' ? 'run' : usable(s) ? '' : 'err'}" data-action="open-station" data-id="${s.id}"><span class="top"><strong>${s.id}</strong>${stBadge(s.status)}</span><span class="s">${AREA[s.type].name} · ${fmt(s.flow)} GPM${s.status === 'running' ? ` · còn ${durText(s.duration - s.elapsed)}` : ''}</span></button>`).join('')}</div></div>` : ''}
    <div class="section"><div class="section-title"><h3>Thiết bị kết nối</h3><span class="muted">${eq.sats.length} bộ điều khiển · ${eq.decs.length} bộ giải mã · ${eq.rads.length} radio</span></div>
      <div class="equip-chips">${eqChips.map(([d, ic]) => `<button class="eq-chip" data-action="open-eq" data-id="${d.id}" data-tip="${esc(eqKind(d.id))}: ${EQ_ST[d.status].label}"><span class="sdot ${EQ_ST[d.status].cls === 'ok' ? 'ok' : EQ_ST[d.status].cls}"></span>${d.id}</button>`).join('') || '<span class="muted">Chưa có thiết bị</span>'}</div></div>
    <div class="section"><div class="section-title"><h3>Cảm biến</h3><span class="muted">${sens.length}</span></div>
      ${sens.length ? `<div class="equip-chips">${sens.map(s => `<button class="eq-chip" data-action="open-sensor" data-id="${s.id}"><span class="sdot ${{ normal: 'ok', warning: 'warn', offline: 'err' }[s.status]}"></span>${s.id} · ${fmt(s.value, SENSOR_TYPES[s.type].dec)} ${SENSOR_TYPES[s.type].unit}</button>`).join('')}</div>` : '<span class="muted">Không có cảm biến</span>'}</div>`;
}
function renderStructDetail() { const d = $('#struct-detail'); if (!d) return; d.innerHTML = structDetailHTML(); d._sig = structSig() + JSON.stringify(state.tree.selected); }

const LEVELS = {
  courses: { label: 'Sân golf', type: 'course', rows: () => DB.courses, cols: [
    { key: 'id', label: 'Mã', render: o => `<b>${o.id}</b>` }, { key: 'name', label: 'Tên sân', render: o => `${esc(o.name)}<span class="cell-sub">${esc(o.en)}</span>` },
    { key: 'sites', label: 'Khu vực', cls: 'num', sortVal: o => DB.sites.filter(s => s.courseId === o.id).length, render: o => DB.sites.filter(s => s.courseId === o.id).length },
    { key: 'holes', label: 'Hố', cls: 'num', sortVal: o => DB.holes.filter(s => s.courseId === o.id).length, render: o => DB.holes.filter(s => s.courseId === o.id).length },
    { key: 'st', label: 'Trạm', cls: 'num', sortVal: o => stationsUnder('course', o.id).length, render: o => stationsUnder('course', o.id).length },
    { key: 'area', label: 'Diện tích', cls: 'num', render: o => `${fmt(o.area, 1)} ha` }, { key: 'location', label: 'Vị trí' }] },
  sites: { label: 'Khu vực (Site)', type: 'site', rows: () => DB.sites.filter(inCtx), cols: [
    { key: 'id', label: 'Mã', render: o => `<b>${o.id}</b>` }, { key: 'name', label: 'Tên khu vực' }, { key: 'courseId', label: 'Sân', render: o => esc(courseName(o.courseId)) },
    { key: 'holes', label: 'Hố', cls: 'num', sortVal: o => DB.holes.filter(s => s.siteId === o.id).length, render: o => DB.holes.filter(s => s.siteId === o.id).length },
    { key: 'st', label: 'Trạm', cls: 'num', sortVal: o => stationsUnder('site', o.id).length, render: o => stationsUnder('site', o.id).length },
    { key: 'sat', label: 'Bộ điều khiển', render: o => DB.satellites.filter(s => s.siteId === o.id).map(s => s.id).join(', ') || '—' }, { key: 'location', label: 'Vị trí' }] },
  holes: { label: 'Hố golf', type: 'hole', rows: () => DB.holes.filter(inCtx), cols: [
    { key: 'no', label: 'Hố', render: o => `<b>${esc(o.name)}</b>` }, { key: 'courseId', label: 'Sân / Khu vực', render: o => `${esc(courseName(o.courseId))}<span class="cell-sub">${esc(get(o.siteId).name)}</span>` },
    { key: 'par', label: 'Par', cls: 'num' }, { key: 'length', label: 'Chiều dài', cls: 'num', render: o => `${fmt(o.length)} m` },
    { key: 'st', label: 'Trạm', cls: 'num', sortVal: o => holeStations(o.id).length, render: o => holeStations(o.id).length },
    { key: 'status', label: 'Trạng thái', sort: false, render: o => { const k = nodeStatus('hole', o.id); return { run: b('run', 'Đang tưới'), err: b('err', 'Lỗi'), warn: b('warn', 'Có trạm lỗi'), wait: b('wait', 'Đang chờ'), ok: b('ok', 'Hoạt động'), idle: b('idle', 'Chưa có trạm') }[k]; } }] },
  areas: { label: 'Khu tưới (Area)', type: 'area', rows: () => DB.areas.filter(inCtx), cols: [
    { key: 'id', label: 'Mã', render: o => `<b>${o.id}</b>` }, { key: 'name', label: 'Khu tưới', render: o => `${esc(o.name)}<span class="cell-sub">${esc(o.vi)}</span>` },
    { key: 'holeId', label: 'Hố', render: o => esc(get(o.holeId).name) }, { key: 'turf', label: 'Loại cỏ' },
    { key: 'st', label: 'Trạm', cls: 'num', sortVal: o => stationsUnder('area', o.id).length, render: o => stationsUnder('area', o.id).length },
    { key: 'status', label: 'Trạng thái', sort: false, render: o => { const k = nodeStatus('area', o.id); return { run: b('run', 'Đang tưới'), err: b('err', 'Lỗi'), warn: b('warn', 'Có trạm lỗi'), wait: b('wait', 'Đang chờ'), ok: b('ok', 'Hoạt động'), idle: b('idle', 'Chưa có trạm') }[k]; } }] }
};
state.levelSort = { key: 'id', dir: 1 }; state.levelQ = '';
function renderLevelList() {
  const w = $('#struct-list'); if (!w) return;
  const L = LEVELS[state.structList];
  const q = state.levelQ.toLowerCase();
  const rows = L.rows().filter(o => !q || [o.id, o.name, o.location, o.vi].join(' ').toLowerCase().includes(q));
  const sort = L.cols.some(c => c.key === state.levelSort.key) ? state.levelSort : (state.levelSort = { key: L.cols[0].key, dir: 1 });
  $('#struct-list-title').textContent = `Danh sách ${L.label.toLowerCase()}`;
  $('#struct-list-n').textContent = `${rows.length} mục`;
  const tw = $('#struct-table');
  keepScroll(tw, () => { tw.innerHTML = tableHTML('lvl-table', L.cols, rows, sort, { rowCls: r => state.tree.selected && state.tree.selected.id === r.id ? 'sel' : '' }); });
}
PAGES.structure = {
  render(sub) {
    if (sub && LEVELS[sub]) state.structList = sub;
    if (!state.tree.selected) state.tree.selected = { type: 'course', id: DB.courses[0].id };
    const el = $('#page-structure');
    el.innerHTML = pageHead('Sân & Khu vực', 'Cấu trúc Sân golf → Khu vực → Hố → Khu tưới → Trạm tưới / Cảm biến',
      `<button class="btn" data-action="struct-add" data-kind="course">${icon('plus')}Thêm sân</button><button class="btn" data-action="struct-add" data-kind="site">${icon('plus')}Thêm khu vực</button><button class="btn btn-primary" data-action="struct-add" data-kind="hole">${icon('plus')}Thêm hố</button>`) +
      `<div class="struct-layout">
        <div class="panel tree-panel">
          <div class="tree-tools">
            <div class="search-field">${icon('search')}<input class="input" id="tree-q" placeholder="Tìm trong cây: tên, mã trạm…" value="${esc(state.tree.q)}" aria-label="Tìm trong cây"></div>
            <div class="btn-row"><button class="btn btn-sm" data-action="tree-expand">${icon('plus')}Mở tất cả</button><button class="btn btn-sm" data-action="tree-collapse">${icon('minus')}Thu gọn</button></div>
          </div>
          <ul class="tree" id="tree" role="tree" aria-label="Cấu trúc sân golf"></ul>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <div class="panel" id="struct-detail"></div>
          <div class="panel">
            <div class="panel-head"><h3><span id="struct-list-title"></span> <span class="sub" id="struct-list-n"></span></h3>
              <div class="seg" id="lvl-seg">${Object.entries(LEVELS).map(([k, L]) => `<button data-lvl="${k}" aria-pressed="${state.structList === k}">${L.label.split(' (')[0]}</button>`).join('')}</div></div>
            <div class="filters"><div class="field search-field"><label for="lvl-q">Tìm kiếm</label>${icon('search')}<input class="input" id="lvl-q" placeholder="Lọc theo tên, mã, vị trí" value="${esc(state.levelQ)}"></div></div>
            <div class="table-wrap max-h" id="struct-table"></div>
          </div>
        </div>
      </div>`;
    renderTree(); renderStructDetail(); renderLevelList(); scrollTreeToSel();
    const tree = $('#tree');
    tree.addEventListener('click', e => {
      const n = e.target.closest('.tn'); if (!n) return;
      const [type, id] = n.dataset.node.split(':');
      if (e.target.closest('[data-caret]')) { state.tree.open.has(id) ? state.tree.open.delete(id) : state.tree.open.add(id); renderTree(); return; }
      if (type === 'station') { state.tree.focus = n.dataset.node; openStationDrawer(id); return; }
      if (type === 'sensor') { openSensorDrawer(id); return; }
      selectTreeNode(type, id);
    });
    tree.addEventListener('dblclick', e => { const n = e.target.closest('.tn'); if (!n || e.target.closest('[data-caret]')) return; const id = n.dataset.node.split(':')[1]; state.tree.open.has(id) ? state.tree.open.delete(id) : state.tree.open.add(id); renderTree(); });
    tree.addEventListener('keydown', e => {
      const n = e.target.closest('.tn'); if (!n) return;
      const all = $$('#tree .tn'), i = all.indexOf(n), id = n.dataset.node.split(':')[1];
      if (e.key === 'ArrowDown' && all[i + 1]) { e.preventDefault(); all[i + 1].focus(); }
      else if (e.key === 'ArrowUp' && all[i - 1]) { e.preventDefault(); all[i - 1].focus(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); if (e.key === 'ArrowRight') state.tree.open.add(id); else state.tree.open.delete(id); renderTree(); const again = $(`#tree [data-node="${n.dataset.node}"]`); if (again) again.focus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); n.click(); const again = $(`#tree [data-node="${n.dataset.node}"]`); if (again) again.focus(); }
    });
    $('#tree-q').addEventListener('input', debounce(e => { state.tree.q = e.target.value; renderTree(); }, 120));
    $('#lvl-seg').addEventListener('click', e => { const bt = e.target.closest('[data-lvl]'); if (!bt) return; go('structure', bt.dataset.lvl); });
    $('#lvl-q').addEventListener('input', debounce(e => { state.levelQ = e.target.value; renderLevelList(); }, 120));
    bindSort($('#struct-table'), state.levelSort, renderLevelList);
    $('#struct-table').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (!tr || e.target.closest('th')) return; selectTreeNode(LEVELS[state.structList].type, tr.dataset.id); renderLevelList(); $('#struct-detail').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  },
  live() {
    const t = $('#tree'); if (!t) return;
    const sig = structSig();
    if (t._sig !== sig && !t.contains(document.activeElement)) renderTree();
    const d = $('#struct-detail');
    if (d._sig !== sig + JSON.stringify(state.tree.selected)) renderStructDetail();
  }
};

Object.assign(ACTIONS, {
  'tree-select': el => selectTreeNode(el.dataset.type, el.dataset.id),
  'tree-expand': () => { ['CLUB', ...DB.courses.map(x => x.id), ...DB.sites.map(x => x.id), ...DB.holes.map(x => x.id)].forEach(id => state.tree.open.add(id)); renderTree(); },
  'tree-collapse': () => { state.tree.open = new Set(['CLUB']); renderTree(); },
  'struct-add': el => structForm(el.dataset.kind, null, el.dataset.parent),
  'struct-edit': el => structForm(el.dataset.type, el.dataset.id),
  'struct-delete': el => structDelete(el.dataset.type, el.dataset.id),
  'struct-water': el => structWater(el.dataset.type, el.dataset.id),
  'struct-stop': async el => {
    const { type, id } = el.dataset, o = nodeObj(type, id);
    const run = stationsUnder(type, id).filter(s => s.status === 'running' || s.status === 'waiting');
    const ok = await confirmDialog({ title: 'Dừng tưới', message: `Dừng tất cả <b>${run.length} trạm</b> đang tưới hoặc đang chờ tại <b>${esc(o.name)}</b>?`, confirmText: 'Dừng tưới', danger: true });
    if (!ok) return;
    run.forEach(s => stopStation(s));
    DB.programs.filter(p => p.manual && p.state.running && !DB.stations.some(s => s.program === p.id)).forEach(p => { p.state = { running: false, queue: [] }; });
    toast(`Đã dừng tưới ${run.length} trạm tại ${o.name}`, 'warning');
    simPumps(); updateLive();
  }
});

/* ---------- Tưới toàn khu (chương trình thủ công tạm thời) ---------- */
let manualSeq = 0;
function structWater(type, id) {
  const o = nodeObj(type, id), sts = stationsUnder(type, id).filter(usable);
  const skipped = stationsUnder(type, id).length - sts.length;
  const defDur = type === 'area' ? AREA[o.type].run : 12;
  const calc = box => {
    const d = +$('#w-dur', box).value, c = +$('#w-conc', box).value;
    $('#w-sum', box).innerHTML = `${sts.length} trạm · ${Math.ceil(sts.length / c)} lượt · tổng thời gian khoảng <b>${durText(Math.ceil(sts.length / c) * d)}</b> · nước dự kiến <b>${fmt(sum(sts.map(s => s.flow)) * d * GAL_TO_M3, 1)} m³</b> · lưu lượng đỉnh ≈ <b>${fmt(sum(sts.slice(0, c).map(s => s.flow)))} GPM</b>`;
  };
  openModal({
    title: `Tưới thủ công – ${o.name}`, size: 'sm',
    body: `<div class="form-grid">
      <div class="field"><label for="w-dur">Thời gian mỗi trạm</label><select class="select" id="w-dur">${[3, 5, 8, 10, 12, 15, 18, 20, 25, 30].map(m => `<option value="${m}" ${m === defDur ? 'selected' : ''}>${m} phút</option>`).join('')}</select></div>
      <div class="field"><label for="w-conc">Số trạm chạy đồng thời</label><select class="select" id="w-conc">${[1, 2, 3, 4, 6, 8, 12].filter(n => n <= Math.max(1, sts.length)).map(n => `<option value="${n}" ${n === Math.min(4, sts.length) ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      <div class="full note-box">${icon('info')}<span id="w-sum"></span></div>
      ${skipped ? `<div class="full fault-box">${icon('alert')}<span>${skipped} trạm đang lỗi hoặc mất kết nối sẽ được bỏ qua.</span></div>` : ''}
    </div>`,
    footer: `<button class="btn" data-close>Hủy</button><button class="btn btn-water" id="w-ok">${icon('play')}Bắt đầu tưới</button>`,
    onMount: box => {
      calc(box);
      $('#w-dur', box).onchange = () => calc(box); $('#w-conc', box).onchange = () => calc(box);
      $('#w-ok', box).onclick = () => {
        const dur = +$('#w-dur', box).value, conc = +$('#w-conc', box).value;
        const p = { id: 'MAN-' + (++manualSeq), manual: true, name: `Tưới thủ công – ${o.name}`, courseId: o.courseId || sts[0].courseId, holeIds: [...new Set(sts.map(s => s.holeId))], areaTypes: [...new Set(sts.map(s => s.type))], start: minToHM(nowMin()), duration: dur, days: [], priority: 'high', enabled: true, concurrency: conc, note: '', lastRun: null, lastResult: '—', state: { running: false, queue: [] }, only: sts.map(s => s.id) };
        DB.programs.push(p); reindex();
        const q = [];
        sts.forEach(s => { if (s.status === 'running' || s.status === 'waiting') return; s.status = 'waiting'; s.program = p.id; q.push(s.id); });
        if (!q.length) { closeModal(); toast('Tất cả trạm đã đang tưới hoặc đang chờ', 'warning'); return; }
        p.state = { running: true, queue: q, startedAt: Date.now(), skipped, total: q.length };
        fillProgram(p);
        closeModal();
        toast(`Bắt đầu tưới ${q.length} trạm tại ${o.name}`, 'success');
        simPumps(); updateLive();
      };
    }
  });
}

/* ---------- Thêm / sửa / xóa cấu trúc ---------- */
function nextId(prefix, list, width = 2) { let n = list.length + 1; while (list.some(x => x.id === prefix + String(n).padStart(width, '0'))) n++; return prefix + String(n).padStart(width, '0'); }
function structForm(kind, id, parentId) {
  const o = id ? get(id) : null;
  const edit = !!o;
  const f = (k, label, input, full) => `<div class="field ${full ? 'full' : ''}" data-f="${k}"><label for="sf-${k}">${label}</label>${input}<div class="field-error"></div></div>`;
  const inp = (k, v, attrs = '') => `<input class="input" id="sf-${k}" value="${esc(v ?? '')}" ${attrs}>`;
  const selOpts = (list, v) => list.map(x => `<option value="${x.id}" ${x.id === v ? 'selected' : ''}>${esc(x.name)}${x.courseId ? ' – ' + esc(courseName(x.courseId)) : ''}</option>`).join('');
  let body = '';
  const defCourse = parentId && kind === 'site' ? parentId : state.ctx.courseId !== 'all' ? state.ctx.courseId : DB.courses[0].id;
  const defSite = parentId && kind === 'hole' ? parentId : state.ctx.siteId !== 'all' ? state.ctx.siteId : (state.tree.selected && state.tree.selected.type === 'site' ? state.tree.selected.id : DB.sites[0] && DB.sites[0].id);
  if (kind === 'course') body = f('name', 'Tên sân', inp('name', o ? o.name : '', 'placeholder="VD: Sân Đồi Thông"')) + f('en', 'Tên tiếng Anh', inp('en', o ? o.en : '', 'placeholder="VD: Pine Hill Course"')) + f('location', 'Vị trí', inp('location', o ? o.location : ''), true) + f('area', 'Diện tích tưới (ha)', inp('area', o ? o.area : '18', 'type="number" min="1" step="0.1"'));
  if (kind === 'site') body = f('name', 'Tên khu vực', inp('name', o ? o.name : `Site ${pad(DB.sites.length + 1)}`)) + f('courseId', 'Thuộc sân', `<select class="select" id="sf-courseId" ${edit ? 'disabled' : ''}>${selOpts(DB.courses, o ? o.courseId : defCourse)}</select>`) + f('location', 'Vị trí / mô tả', inp('location', o ? o.location : ''), true);
  if (kind === 'hole') body = f('no', 'Số hố', inp('no', o ? o.no : Math.max(0, ...DB.holes.map(h => h.no)) + 1, 'type="number" min="1" max="99"')) + f('siteId', 'Thuộc khu vực', `<select class="select" id="sf-siteId" ${edit ? 'disabled' : ''}>${selOpts(DB.sites, o ? o.siteId : defSite)}</select>`) + f('par', 'Par', `<select class="select" id="sf-par">${[3, 4, 5].map(n => `<option ${o && o.par === n || !o && n === 4 ? 'selected' : ''}>${n}</option>`).join('')}</select>`) + f('length', 'Chiều dài (m)', inp('length', o ? o.length : 360, 'type="number" min="60" max="700"')) + (edit ? '' : `<div class="field full"><label class="check"><input type="checkbox" id="sf-auto" checked> Tự động tạo 4 khu tưới (Tee, Fairway, Green, Rough) và 7 trạm tưới mặc định</label></div>`);
  if (kind === 'area') body = f('name', 'Tên khu tưới', inp('name', o.name)) + f('turf', 'Loại cỏ', inp('turf', o.turf)) + f('location', 'Vị trí', inp('location', o.location), true);
  if (!body) return;
  if (!DB.sites.length && kind === 'hole') { toast('Cần tạo khu vực trước khi thêm hố', 'warning'); return; }
  if (!DB.courses.length && kind === 'site') { toast('Cần tạo sân golf trước khi thêm khu vực', 'warning'); return; }
  openModal({
    title: `${edit ? 'Chỉnh sửa' : 'Thêm'} ${TYPE_LABEL[kind].toLowerCase()}${edit ? ` – ${o.name}` : ''}`, size: '',
    body: `<div class="form-grid">${body}</div>`,
    footer: `${edit ? `<span class="left">Mã: ${o.id}</span>` : ''}<button class="btn" data-close>Hủy</button><button class="btn btn-primary" id="sf-ok">${icon('check')}${edit ? 'Lưu thay đổi' : 'Thêm mới'}</button>`,
    onMount: box => {
      $$('.input', box).forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('invalid')));
      $('#sf-ok', box).onclick = () => {
        const v = k => { const e = $('#sf-' + k, box); return e ? e.value.trim() : ''; };
        const errs = {};
        if ('name' in { name: 1 } && $('#sf-name', box) && !v('name')) errs.name = 'Vui lòng nhập tên';
        if (kind === 'course' && (!(+v('area') > 0))) errs.area = 'Diện tích phải lớn hơn 0';
        if (kind === 'course' && DB.courses.some(c => c.name.toLowerCase() === v('name').toLowerCase() && (!o || c.id !== o.id))) errs.name = 'Tên sân đã tồn tại';
        if (kind === 'site' && DB.sites.some(s => s.name.toLowerCase() === v('name').toLowerCase() && s.courseId === (o ? o.courseId : v('courseId')) && (!o || s.id !== o.id))) errs.name = 'Tên khu vực đã tồn tại trong sân này';
        if (kind === 'hole') {
          const no = +v('no');
          if (!Number.isInteger(no) || no < 1 || no > 99) errs.no = 'Số hố từ 1 đến 99';
          else if (DB.holes.some(h => h.no === no && (!o || h.id !== o.id))) errs.no = `Hố ${pad(no)} đã tồn tại`;
          const L = +v('length'); if (!(L >= 60 && L <= 700)) errs.length = 'Chiều dài từ 60 đến 700 m';
        }
        $$('.field[data-f]', box).forEach(fd => { const k = fd.dataset.f; fd.classList.toggle('invalid', !!errs[k]); $('.field-error', fd).textContent = errs[k] || ''; });
        if (Object.keys(errs).length) { const first = $('.field.invalid .input', box); if (first) first.focus(); return; }
        let target;
        if (kind === 'course') {
          if (o) Object.assign(o, { name: v('name'), en: v('en'), location: v('location'), area: +v('area') });
          else {
            const nid = nextId('C', DB.courses);
            target = { id: nid, name: v('name'), en: v('en') || v('name'), location: v('location') || 'Chưa cập nhật', status: 'online', ci: DB.courses.length % 3, area: +v('area'), lake: [620, 340], pumpHouse: [600, 420], club: [650, 55], weather: [745, 45] };
            DB.courses.push(target);
          }
        } else if (kind === 'site') {
          if (o) Object.assign(o, { name: v('name'), location: v('location') });
          else { const cid = v('courseId'); target = { id: nextId('S', DB.sites), courseId: cid, name: v('name'), location: v('location') || `${courseName(cid)}`, status: 'online' }; DB.sites.push(target); }
        } else if (kind === 'hole') {
          const no = +v('no');
          if (o) {
            Object.assign(o, { no, name: 'Hố ' + pad(no), par: +v('par'), length: +v('length') });
          } else {
            const site = get(v('siteId'));
            let hid = 'H' + pad(no); if (get(hid)) hid = nextId('H', DB.holes);
            target = { id: hid, no, courseId: site.courseId, siteId: site.id, name: 'Hố ' + pad(no), par: +v('par'), length: +v('length'), status: 'online', geo: null, location: `${courseName(site.courseId)}, ${site.name}` };
            DB.holes.push(target);
            if ($('#sf-auto', box).checked) {
              const sat = DB.satellites.find(s => s.siteId === site.id), dec = sat && DB.decoders.find(d => d.satelliteId === sat.id);
              let stNo = 0;
              AREA_KEYS.forEach(type => {
                const A = AREA[type], aid = `A${pad(no)}-${A.code}`;
                DB.areas.push({ id: aid, holeId: hid, siteId: site.id, courseId: site.courseId, type, name: A.name, vi: A.vi, turf: A.turf, status: 'online', location: `Hố ${pad(no)}, ${A.vi.toLowerCase()}` });
                for (let n = 0; n < A.n; n++) { stNo++; DB.stations.push({ id: `ST-${pad(no)}${pad(stNo)}`, name: `Trạm ${pad(no)}-${pad(stNo)}`, holeId: hid, areaId: aid, siteId: site.id, courseId: site.courseId, type, flow: Math.round((A.flow[0] + A.flow[1]) / 2), defRun: A.run, head: HEADS[type], status: 'idle', elapsed: 0, duration: 0, program: null, lastRun: null, runsToday: 0, pos: null, satelliteId: sat ? sat.id : null, decoderId: dec ? dec.id : null, fault: '' }); }
              });
              if (sat) sat.holeIds.push(hid);
            }
          }
        } else if (kind === 'area') Object.assign(o, { name: v('name'), turf: v('turf'), location: v('location') });
        reindex(); renderCtxSelects();
        closeModal();
        toast(edit ? `Đã lưu thay đổi cho ${TYPE_LABEL[kind].toLowerCase()} ${o.name}` : `Đã thêm ${TYPE_LABEL[kind].toLowerCase()} ${target.name} (${target.id})`, 'success');
        if (target) selectTreeNode(kind, target.id);
        if (state.page === 'structure') PAGES.structure.render(state.sub); else go('structure');
      };
    }
  });
}
async function structDelete(type, id) {
  const o = nodeObj(type, id);
  const sts = stationsUnder(type, id), sens = sensorsUnder(type, id);
  const holes = type === 'course' ? DB.holes.filter(h => h.courseId === id) : type === 'site' ? DB.holes.filter(h => h.siteId === id) : type === 'hole' ? [o] : [];
  const sites = type === 'course' ? DB.sites.filter(s => s.courseId === id) : type === 'site' ? [o] : [];
  const areas = type === 'area' ? [o] : DB.areas.filter(a => holes.some(h => h.id === a.holeId));
  const running = sts.filter(s => s.status === 'running').length;
  const parts = [sites.length && type !== 'site' ? `${sites.length} khu vực` : '', holes.length && type !== 'hole' ? `${holes.length} hố` : '', areas.length && type !== 'area' ? `${areas.length} khu tưới` : '', `${sts.length} trạm tưới`, sens.length ? `${sens.length} cảm biến` : ''].filter(Boolean);
  const ok = await confirmDialog({ title: `Xóa ${TYPE_LABEL[type].toLowerCase()}`, danger: true, confirmText: 'Xóa vĩnh viễn',
    message: `Xóa <b>${esc(o.name)}</b> (${o.id}) cùng toàn bộ dữ liệu trực thuộc: ${parts.join(', ')}?${running ? ` <b>${running} trạm đang tưới sẽ bị dừng.</b>` : ''} Thao tác này không thể hoàn tác.` });
  if (!ok) return;
  const stIds = new Set(sts.map(s => s.id));
  sts.forEach(s => { if (s.status === 'running' || s.status === 'waiting') stopStation(s); });
  DB.stations = DB.stations.filter(s => !stIds.has(s.id));
  const aIds = new Set(areas.map(a => a.id)), hIds = new Set(holes.map(h => h.id)), sIds = new Set(sites.map(s => s.id));
  DB.areas = DB.areas.filter(a => !aIds.has(a.id));
  DB.holes = DB.holes.filter(h => !hIds.has(h.id));
  DB.sites = DB.sites.filter(s => !sIds.has(s.id));
  if (type === 'course') DB.courses = DB.courses.filter(c => c.id !== id);
  const senIds = new Set(sens.filter(s => type !== 'course' || s.courseId === id).map(s => s.id));
  DB.sensors = DB.sensors.filter(s => !senIds.has(s.id));
  ['satellites', 'decoders', 'radios'].forEach(k => { DB[k] = DB[k].filter(d => !sIds.has(d.siteId)); });
  DB.satellites.forEach(s => { s.holeIds = s.holeIds.filter(h => !hIds.has(h)); });
  DB.programs.forEach(p => { p.holeIds = p.holeIds.filter(h => !hIds.has(h)); if (p.state.running) p.state.queue = p.state.queue.filter(x => !stIds.has(x)); });
  const emptied = DB.programs.filter(p => type === 'course' ? p.courseId === id : !p.holeIds.length);
  DB.programs = DB.programs.filter(p => !emptied.includes(p));
  reindex();
  if (state.ctx.courseId !== 'all' && !get(state.ctx.courseId)) state.ctx.courseId = 'all';
  if (state.ctx.siteId !== 'all' && !get(state.ctx.siteId)) state.ctx.siteId = 'all';
  renderCtxSelects();
  const par = nodeParentSafe(type, o);
  state.tree.selected = par;
  closeDrawer();
  toast(`Đã xóa ${TYPE_LABEL[type].toLowerCase()} ${o.name}${emptied.length ? ` và ${emptied.length} lịch tưới liên quan` : ''}`, 'warning');
  if (DB.courses.length === 0) state.tree.selected = { type: 'club', id: 'CLUB' };
  simPumps();
  PAGES.structure.render(state.sub);
}
function nodeParentSafe(type, o) {
  const m = { course: ['club', 'CLUB'], site: ['course', o.courseId], hole: ['site', o.siteId], area: ['hole', o.holeId] }[type];
  if (!m || (m[0] !== 'club' && !get(m[1]))) return { type: 'club', id: 'CLUB' };
  return { type: m[0], id: m[1] };
}

/* ================= 15. Thiết bị hiện trường ================= */
function refreshView() {
  const p = PAGES[state.page];
  if (['schedule'].includes(state.page)) p.render(state.sub);
  else if (p.live) p.live(true);
  if (state.drawer) liveDrawer(true);
  renderNotifBadge(); renderSysStatus();
}
const seenCell = d => `<span class="${d.status === 'offline' ? 'ping-bad' : ''}">${ago(d.lastSeen)}</span><span class="cell-sub">${fmtDT(d.lastOk)}</span>`;
const whereCell = o => `${esc(courseName(o.courseId))}<span class="cell-sub">${esc((get(o.siteId) || {}).name || '—')}</span>`;
const errCell = d => d.errorCode ? `<span class="err-code">${d.errorCode}</span><span class="cell-sub">${esc(d.errorMsg)}</span>` : '<span class="muted">—</span>';
const EQ_TABS = {
  satellites: {
    label: 'Bộ điều khiển', list: () => DB.satellites, holes: d => d.holeIds, typeLabel: 'Kênh truyền', typeOf: d => d.comm,
    cols: [
      { key: 'id', label: 'Mã', render: d => `<b>${d.id}</b>` },
      { key: 'name', label: 'Tên / Model', render: d => `${esc(d.name)}<span class="cell-sub">${esc(d.model)}</span>` },
      { key: 'siteId', label: 'Sân / Khu vực', render: whereCell },
      { key: 'ip', label: 'Địa chỉ IP', render: d => `<code>${d.ip}</code>` },
      { key: 'comm', label: 'Kênh truyền' },
      { key: 'st', label: 'Trạm', cls: 'num', sortVal: d => eqStations(d).length, render: d => eqStations(d).length },
      { key: 'firmware', label: 'Firmware', render: d => d.firmware + (d.firmware !== 'v5.3.2' ? ' <span class="badge b-warn" data-tip="Có bản cập nhật v5.3.2">Cũ</span>' : '') },
      { key: 'signal', label: 'Tín hiệu', render: d => d.signal == null ? '—' : `${sigPct(d.signal)}${d.signal}%` },
      { key: 'ping', label: 'Ping', cls: 'num', render: d => pingText(d.ping) },
      { key: 'status', label: 'Trạng thái', render: d => eqBadge(d.status) },
      { key: 'lastSeen', label: 'Liên lạc gần nhất', render: seenCell }
    ]
  },
  decoders: {
    label: 'Bộ giải mã', list: () => DB.decoders, holes: d => [...new Set(eqStations(d).map(s => s.holeId))], typeLabel: 'Model', typeOf: d => d.model,
    cols: [
      { key: 'id', label: 'Mã', render: d => `<b>${d.id}</b>` },
      { key: 'address', label: 'Địa chỉ', render: d => `<code>${d.address}</code>` },
      { key: 'model', label: 'Model' },
      { key: 'satelliteId', label: 'Bộ điều khiển', render: d => eqLink(d.satelliteId) },
      { key: 'siteId', label: 'Sân / Khu vực', render: whereCell },
      { key: 'st', label: 'Trạm', cls: 'num', sortVal: d => eqStations(d).length, render: d => { const s = eqStations(d); return `${s.length}<span class="cell-sub">${s.map(x => x.id.slice(3)).slice(0, 3).join(', ')}${s.length > 3 ? '…' : ''}</span>`; } },
      { key: 'current', label: 'Dòng điện', cls: 'num', render: d => `<span class="${d.current > 45 ? 'ping-mid' : ''}">${fmt(d.current)} mA</span>` },
      { key: 'status', label: 'Trạng thái', render: d => eqBadge(d.status) },
      { key: 'errorCode', label: 'Mã lỗi', render: errCell },
      { key: 'lastSeen', label: 'Liên lạc gần nhất', render: seenCell }
    ]
  },
  radios: {
    label: 'Thiết bị Radio', list: () => DB.radios, holes: d => (get(d.satelliteId) || { holeIds: [] }).holeIds, typeLabel: 'Loại radio', typeOf: d => d.type,
    cols: [
      { key: 'id', label: 'Mã', render: d => `<b>${d.id}</b>` },
      { key: 'type', label: 'Loại' },
      { key: 'freq', label: 'Tần số' },
      { key: 'satelliteId', label: 'Bộ điều khiển', render: d => eqLink(d.satelliteId) },
      { key: 'siteId', label: 'Sân / Khu vực', render: whereCell },
      { key: 'signal', label: 'Tín hiệu', render: d => d.signal == null ? '<span class="ping-bad">Không có</span>' : `${sigBars(d.signal)}${d.signal} dBm` },
      { key: 'ping', label: 'Ping', cls: 'num', render: d => pingText(d.ping) },
      { key: 'status', label: 'Trạng thái', render: d => eqBadge(d.status) },
      { key: 'errorCode', label: 'Mã lỗi', render: errCell },
      { key: 'lastSeen', label: 'Liên lạc gần nhất', render: seenCell }
    ]
  },
  stations: {
    label: 'Trạm tưới', list: () => DB.stations, holes: s => [s.holeId], typeLabel: 'Khu tưới', typeOf: s => AREA[s.type].name, station: true,
    cols: [
      { key: 'id', label: 'Mã', render: s => `<b>${s.id}</b><span class="cell-sub">${esc(s.name)}</span>` },
      { key: 'holeId', label: 'Sân / Hố', sortVal: s => get(s.holeId).no, render: s => `${esc(get(s.holeId).name)}<span class="cell-sub">${esc(courseName(s.courseId))} · ${esc(get(s.siteId).name)}</span>` },
      { key: 'type', label: 'Khu tưới', sortVal: s => AREA_KEYS.indexOf(s.type), render: s => `${AREA[s.type].name}<span class="cell-sub">${esc(s.head)}</span>` },
      { key: 'decoderId', label: 'Bộ giải mã', render: s => `${eqLink(s.decoderId)}<span class="cell-sub">${esc(s.satelliteId || '')}</span>` },
      { key: 'flow', label: 'Lưu lượng', cls: 'num', render: s => `${fmt(s.flow)} GPM` },
      { key: 'status', label: 'Trạng thái', sortVal: s => Object.keys(STATION_ST).indexOf(s.status), render: s => stBadge(s.status) },
      { key: 'elapsed', label: 'Tiến độ / Lần tưới', sortVal: s => s.status === 'running' ? s.elapsed / s.duration : -1, render: s => s.status === 'running' ? `<div class="meter"><div class="progress"><span style="width:${s.elapsed / s.duration * 100}%"></span></div><span class="v">${fmt(s.elapsed / s.duration * 100)}%</span></div>` : `<span class="muted">${s.lastRun ? fmtDT(s.lastRun) : '—'}</span>` },
      { key: 'act', label: '', sort: false, cls: 'num', render: s => s.status === 'running' ? `<button class="btn btn-sm" data-action="st-stop" data-id="${s.id}">${icon('stop')}Dừng</button>` : `<button class="btn btn-sm" data-action="st-quick" data-id="${s.id}" ${usable(s) ? '' : 'disabled'}>${icon('play')}Tưới</button>` }
    ]
  }
};
function eqFiltered(tab) {
  const T = EQ_TABS[tab], f = state.eq, q = f.q.trim().toLowerCase();
  return T.list().filter(d => {
    if (f.course !== 'all' && d.courseId !== f.course) return false;
    if (f.site !== 'all' && d.siteId !== f.site) return false;
    if (f.hole !== 'all' && !T.holes(d).includes(f.hole)) return false;
    if (f.status !== 'all') {
      if (T.station) { if (f.status === 'error' ? usable(d) : d.status !== f.status) return false; }
      else if (d.status !== f.status) return false;
    }
    if (f.type && f.type !== 'all' && T.typeOf(d) !== f.type) return false;
    if (q && ![d.id, d.name, d.ip, d.address, d.type, d.model, d.errorCode, d.head].some(x => x && String(x).toLowerCase().includes(q))) return false;
    return true;
  });
}
function eqFiltersHTML() {
  const f = state.eq, T = EQ_TABS[f.tab];
  const opt = (v, l, cur) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
  const sites = DB.sites.filter(s => f.course === 'all' || s.courseId === f.course);
  const holes = DB.holes.filter(h => (f.course === 'all' || h.courseId === f.course) && (f.site === 'all' || h.siteId === f.site));
  const types = [...new Set(T.list().map(T.typeOf))];
  const sts = T.station ? [['running', 'Đang tưới'], ['waiting', 'Đang chờ'], ['completed', 'Hoàn thành'], ['idle', 'Sẵn sàng'], ['error', 'Lỗi / Mất kết nối']] : Object.entries(EQ_ST).map(([k, v]) => [k, v.label]);
  return `<div class="field search-field"><label for="eq-q">Tìm kiếm</label>${icon('search')}<input class="input" id="eq-q" placeholder="Mã, tên, IP, mã lỗi…" value="${esc(f.q)}"></div>
    <div class="field"><label for="eq-course">Sân golf</label><select class="select" id="eq-course">${opt('all', 'Tất cả sân', f.course)}${DB.courses.map(c => opt(c.id, c.name, f.course)).join('')}</select></div>
    <div class="field"><label for="eq-site">Khu vực</label><select class="select" id="eq-site">${opt('all', 'Tất cả khu vực', f.site)}${sites.map(s => opt(s.id, s.name, f.site)).join('')}</select></div>
    <div class="field"><label for="eq-hole">Hố golf</label><select class="select" id="eq-hole">${opt('all', 'Tất cả hố', f.hole)}${holes.map(h => opt(h.id, h.name, f.hole)).join('')}</select></div>
    <div class="field"><label for="eq-status">Trạng thái</label><select class="select" id="eq-status">${opt('all', 'Tất cả trạng thái', f.status)}${sts.map(([k, l]) => opt(k, l, f.status)).join('')}</select></div>
    <div class="field"><label for="eq-type">${T.typeLabel}</label><select class="select" id="eq-type">${opt('all', 'Tất cả', f.type || 'all')}${types.map(t => opt(t, t, f.type)).join('')}</select></div>
    <button class="btn btn-ghost btn-sm" id="eq-reset" style="height:34px">Xóa lọc</button>`;
}
function renderEqTable() {
  const w = $('#eq-table'); if (!w) return;
  const T = EQ_TABS[state.eq.tab];
  if (!T.cols.some(c => c.key === state.eq.sort.key)) state.eq.sort = { key: 'id', dir: 1 };
  const rows = eqFiltered(state.eq.tab);
  keepScroll(w, () => { w.innerHTML = tableHTML('eq-tbl', T.cols, rows, state.eq.sort, { rowCls: d => (state.drawer && state.drawer.id === d.id ? 'sel' : '') }); });
  const all = T.list();
  const bad = all.filter(d => T.station ? !usable(d) : d.status !== 'online').length;
  $('#eq-foot').innerHTML = `<span>Hiển thị <b>${rows.length}</b> / ${all.length} ${T.label.toLowerCase()}</span><span>${T.station ? `${all.filter(s => s.status === 'running').length} đang tưới · ` : ''}${bad} ${T.station ? 'lỗi / mất kết nối' : 'cảnh báo / ngoại tuyến'}</span>`;
  $$('#eq-tabs .tab').forEach(t => { const k = t.dataset.tab; t.querySelector('.n').textContent = eqFiltered(k).length; });
}
PAGES.equipment = {
  render(sub) {
    if (sub && EQ_TABS[sub] && state.eq.tab !== sub) { state.eq.tab = sub; state.eq.status = 'all'; state.eq.type = 'all'; }
    const el = $('#page-equipment');
    const cnt = k => DB[k].filter(d => d.status !== 'online').length;
    el.innerHTML = pageHead('Thiết bị hiện trường', `${DB.satellites.length} bộ điều khiển · ${DB.decoders.length} bộ giải mã · ${DB.radios.length} radio · ${DB.stations.length} trạm tưới`,
      `<button class="btn" data-go="diagnostics">${icon('pulse')}Chẩn đoán</button><button class="btn" data-action="eq-export">${icon('download')}Xuất CSV</button>`) +
      `<div class="panel">
        <div class="tabs" id="eq-tabs" role="tablist">${Object.entries(EQ_TABS).map(([k, T]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${state.eq.tab === k}">${T.label}<span class="n"></span>${k !== 'stations' && cnt(k) ? `<span class="count-pill" style="height:18px;min-width:18px;padding:0 5px;font-size:11px">${cnt(k)}</span>` : ''}</button>`).join('')}</div>
        <div class="filters" id="eq-filters">${eqFiltersHTML()}</div>
        <div class="table-wrap max-h" id="eq-table"></div>
        <div class="table-foot" id="eq-foot"></div>
      </div>`;
    renderEqTable();
    $('#eq-tabs').addEventListener('click', e => { const t = e.target.closest('[data-tab]'); if (t) go('equipment', t.dataset.tab); });
    const fl = $('#eq-filters');
    fl.addEventListener('change', e => {
      const id = e.target.id, v = e.target.value;
      if (id === 'eq-course') { state.eq.course = v; state.eq.site = 'all'; state.eq.hole = 'all'; }
      if (id === 'eq-site') { state.eq.site = v; state.eq.hole = 'all'; }
      if (id === 'eq-hole') state.eq.hole = v;
      if (id === 'eq-status') state.eq.status = v;
      if (id === 'eq-type') state.eq.type = v;
      if (id !== 'eq-q') { fl.innerHTML = eqFiltersHTML(); renderEqTable(); }
    });
    fl.addEventListener('input', debounce(e => { if (e.target.id === 'eq-q') { state.eq.q = e.target.value; renderEqTable(); } }, 120));
    fl.addEventListener('click', e => { if (e.target.id === 'eq-reset') { Object.assign(state.eq, { course: 'all', site: 'all', hole: 'all', status: 'all', type: 'all', q: '' }); fl.innerHTML = eqFiltersHTML(); renderEqTable(); } });
    const tw = $('#eq-table');
    bindSort(tw, state.eq.sort, renderEqTable);
    tw.addEventListener('click', e => {
      if (e.target.closest('button, a, th')) return;
      const tr = e.target.closest('tr[data-id]'); if (!tr) return;
      if (state.eq.tab === 'stations') openStationDrawer(tr.dataset.id); else openEquipDrawer(tr.dataset.id);
      renderEqTable();
    });
    tw.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('tr[data-id]')) e.target.click(); });
  },
  live() { if ($('#eq-table') && !$('#eq-filters').contains(document.activeElement)) renderEqTable(); }
};
Object.assign(ACTIONS, {
  'st-quick': el => {
    const s = get(el.dataset.id);
    if (!startManual(s, s.defRun)) { toast(`${s.name} không thể tưới`, 'error'); return; }
    toast(`Đã bắt đầu tưới ${s.name} trong ${s.defRun} phút`, 'success');
    simPumps(); updateLive();
  },
  'eq-export': () => {
    const T = EQ_TABS[state.eq.tab], rows = sortRows(eqFiltered(state.eq.tab), T.cols, state.eq.sort);
    const cols = T.cols.filter(c => c.key !== 'act');
    const txt = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' ').trim(); };
    downloadCSV(`thiet-bi-${state.eq.tab}-${isoDate(new Date())}.csv`, [cols.map(c => c.label), ...rows.map(r => cols.map(c => txt(c.render ? c.render(r) : esc(r[c.key]))))]);
  }
});
function downloadCSV(name, rows) {
  const csv = '\uFEFF' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Đã xuất tệp ${name}`, 'success');
}

/* ================= 16. Lịch tưới ================= */
state.sched.filter = { course: 'all', status: 'all' };
state.sched.sort = { key: 'start', dir: 1 };
const progRunsOn = (p, d) => p.days.includes(weekday(d));
function progStatusOn(p, d) {
  const t = new Date();
  if (sameDay(d, t)) return progStatus(p);
  if (!p.enabled) return { key: 'paused', label: 'Tạm dừng', cls: 'idle' };
  return d < t ? { key: 'done', label: 'Hoàn thành', cls: 'done' } : { key: 'up', label: 'Chờ đến giờ', cls: 'wait' };
}
const schedPrograms = () => realPrograms().filter(p => (state.ctx.courseId === 'all' || p.courseId === state.ctx.courseId));
function schedLabel() {
  const d = state.sched.date, v = state.sched.view;
  if (v === 'day') return `${DOW_LONG[weekday(d)]}, ${fmtDate(d)}`;
  if (v === 'week') { const s = addDays(d, -weekday(d)), e = addDays(s, 6); return `Tuần ${fmtDate(s).slice(0, 5)} – ${fmtDate(e)}`; }
  return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
}
function dayViewHTML() {
  const d = state.sched.date, progs = schedPrograms().filter(p => progRunsOn(p, d)).sort((a, c) => hmToMin(a.start) - hmToMin(c.start));
  const pct = m => (m / 1440 * 100).toFixed(3) + '%';
  const isToday = sameDay(d, new Date());
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const hours = Array.from({ length: 13 }, (_, i) => i * 2);
  const rows = progs.map(p => {
    const st = progStatusOn(p, d), s = hmToMin(p.start), len = Math.max(programLen(p), 5);
    const segs = s + len > 1440 ? [[s, 1440 - s], [0, s + len - 1440]] : [[s, len]];
    return `<div class="g-row"><div class="g-label"><strong>${esc(p.name)}</strong><span>${esc(courseName(p.courseId))} · ${programStations(p).length} trạm</span></div>
      <div class="g-track">${segs.map(([a, l]) => `<button class="g-block st-${st.key} ${state.sched.selected === p.id ? 'sel' : ''}" style="left:${pct(a)};width:${pct(l)}" data-pick="${p.id}" data-tip="${esc(p.name)}: ${p.start} – ${minToHM(s + len)} (${durText(len)}) · ${st.label}">${p.start} · ${durText(len)}</button>`).join('')}</div></div>`;
  }).join('');
  const seq = progs.map(p => { const st = progStatusOn(p, d); return `<div class="tl-item st-${st.key}" data-pick="${p.id}" tabindex="0"><span class="tl-time">${p.start}</span><span class="tl-dot"></span><div class="tl-body"><strong>${esc(p.name.split('–')[1] ? p.name.split('–')[1].trim() : p.name)}</strong><span>${esc(p.id)} · ${durText(programLen(p))} · ${fmt(programVolume(p), 0)} m³</span></div>${b(st.cls, st.label)}</div>`; }).join('');
  return `<div class="sched-layout"><div><div class="gantt"><div class="gantt-inner">
      <div class="g-scale"><span></span><div class="g-hours">${hours.map(h => `<span style="left:${pct(h * 60)}">${pad(h % 24)}:00</span>`).join('')}</div></div>
      ${rows || `<div class="empty-state">${icon('cal')}Không có lịch tưới trong ngày này</div>`}
      ${isToday && rows ? `<div style="position:absolute;left:200px;right:0;top:22px;bottom:0;pointer-events:none"><div class="g-now" id="g-now" style="left:${pct(nm)}" data-label="${fmtHM(now)}"></div></div>` : ''}
    </div></div></div>
    <div><div class="seq-head"><h3>Trình tự trong ngày</h3><span class="muted" style="font-size:12.5px">${progs.length} chương trình · ${fmt(sum(progs.map(programVolume)), 0)} m³ dự kiến</span></div><div class="seq-list timeline">${seq || '<div class="empty-state">Trống</div>'}</div></div></div>`;
}
function weekViewHTML() {
  const s = addDays(state.sched.date, -weekday(state.sched.date)), progs = schedPrograms().sort((a, c) => hmToMin(a.start) - hmToMin(c.start));
  return `<div class="week-grid">${Array.from({ length: 7 }, (_, i) => {
    const d = addDays(s, i), list = progs.filter(p => progRunsOn(p, d));
    return `<div class="wk-col ${sameDay(d, new Date()) ? 'today' : ''}"><div class="wk-head" data-day="${isoDate(d)}" style="cursor:pointer">${DOW_LONG[i]}<strong>${d.getDate()}</strong></div>
      <div class="wk-body">${list.map(p => `<button class="ev ${PRIO[p.priority].cls} ${p.enabled ? '' : 'paused'} ${state.sched.selected === p.id ? 'sel' : ''}" data-pick="${p.id}"><b>${p.start} – ${minToHM(hmToMin(p.start) + programLen(p))}</b><span>${esc(p.name)}</span><span class="muted">${esc(courseName(p.courseId))}${p.enabled ? '' : ' · Tạm dừng'}</span></button>`).join('') || '<span class="muted" style="font-size:12px;padding:4px">Không có lịch</span>'}</div></div>`;
  }).join('')}</div>`;
}
function monthViewHTML() {
  const d = state.sched.date, first = new Date(d.getFullYear(), d.getMonth(), 1), start = addDays(first, -weekday(first));
  const progs = schedPrograms().filter(p => p.enabled).sort((a, c) => hmToMin(a.start) - hmToMin(c.start));
  return `<div class="month-grid">${DOW.map(x => `<div class="mo-dow">${x}</div>`).join('')}${Array.from({ length: 42 }, (_, i) => {
    const day = addDays(start, i), list = progs.filter(p => progRunsOn(p, day));
    return `<div class="mo-cell ${day.getMonth() !== d.getMonth() ? 'other' : ''} ${sameDay(day, new Date()) ? 'today' : ''}" data-day="${isoDate(day)}"><span class="mo-num">${day.getDate()}</span>${list.slice(0, 3).map(p => `<span class="mo-ev ${PRIO[p.priority].cls}">${p.start} ${esc(p.name.split('–')[0].trim())}</span>`).join('')}${list.length > 3 ? `<span class="mo-more">+${list.length - 3} lịch khác</span>` : ''}</div>`;
  }).join('')}</div>`;
}
const PROG_COLS = [
  { key: 'name', label: 'Chương trình', render: p => `<b>${esc(p.name)}</b><span class="cell-sub">${p.id}${p.note ? ' · ' + esc(p.note) : ''}</span>` },
  { key: 'courseId', label: 'Sân / Khu vực', render: p => `${esc(courseName(p.courseId))}<span class="cell-sub">${programSites(p).map(s => get(s).name).join(', ')}</span>` },
  { key: 'holes', label: 'Hố', sortVal: p => p.holeIds.length, render: p => p.holeIds.length > 4 ? `${get(p.holeIds[0]).no}–${get(p.holeIds[p.holeIds.length - 1]).no} <span class="muted">(${p.holeIds.length})</span>` : p.holeIds.map(h => get(h).no).join(', ') },
  { key: 'areas', label: 'Khu tưới', sort: false, render: p => p.areaTypes.map(t => AREA[t].name).join(', ') },
  { key: 'st', label: 'Trạm', cls: 'num', sortVal: p => programStations(p).length, render: p => programStations(p).length },
  { key: 'start', label: 'Bắt đầu', sortVal: p => hmToMin(p.start), render: p => `<b>${p.start}</b><span class="cell-sub">${p.days.length === 7 ? 'Hằng ngày' : p.days.map(d => DOW[d]).join(' ')}</span>` },
  { key: 'duration', label: 'Thời lượng', cls: 'num', sortVal: p => programLen(p), render: p => `${durText(programLen(p))}<span class="cell-sub">${p.duration} phút/trạm</span>` },
  { key: 'vol', label: 'Lượng nước', cls: 'num', sortVal: programVolume, render: p => `${fmt(programVolume(p), 1)} m³` },
  { key: 'priority', label: 'Ưu tiên', sortVal: p => ['high', 'mid', 'low'].indexOf(p.priority), render: p => prioHTML(p.priority) },
  { key: 'status', label: 'Trạng thái', sortVal: p => progStatus(p).key, render: p => { const s = progStatus(p), pr = progProgress(p); return b(s.cls, s.label) + (pr ? `<div class="progress" style="margin-top:6px"><span style="width:${pr.pct}%"></span></div>` : ''); } },
  { key: 'act', label: '', sort: false, render: p => `<div class="row-actions">${p.state.running ? `<button class="icon-btn sm" data-action="prog-stop" data-id="${p.id}" data-tip="Dừng">${icon('stop')}</button>` : `<button class="icon-btn sm" data-action="prog-run" data-id="${p.id}" data-tip="Chạy ngay" ${p.enabled ? '' : 'disabled'}>${icon('play')}</button>`}<button class="icon-btn sm" data-action="prog-edit" data-id="${p.id}" data-tip="Chỉnh sửa">${icon('edit')}</button><button class="icon-btn sm" data-action="open-program" data-id="${p.id}" data-tip="Chi tiết">${icon('info')}</button></div>` }
];
function progFiltered() {
  const f = state.sched.filter;
  return schedPrograms().filter(p => (f.course === 'all' || p.courseId === f.course) && (f.status === 'all' || progStatus(p).key === f.status));
}
function progToolbarHTML() {
  const p = state.sched.selected && get(state.sched.selected), dis = p ? '' : 'disabled';
  return `<span class="sel-name">${p ? `Đã chọn: <b>${esc(p.name.split('–')[0].trim())}</b>` : 'Chọn một chương trình để thao tác'}</span>
    <button class="btn btn-sm" data-action="prog-edit" data-id="${p ? p.id : ''}" ${dis}>${icon('edit')}Chỉnh sửa</button>
    <button class="btn btn-sm" data-action="prog-copy" data-id="${p ? p.id : ''}" ${dis}>${icon('copy')}Sao chép</button>
    <button class="btn btn-sm" data-action="prog-enable" data-id="${p ? p.id : ''}" ${p && !p.enabled ? '' : 'disabled'}>${icon('check')}Kích hoạt</button>
    <button class="btn btn-sm" data-action="prog-pause" data-id="${p ? p.id : ''}" ${p && p.enabled ? '' : 'disabled'}>${icon('pause')}Tạm dừng</button>
    ${p && p.state.running ? `<button class="btn btn-sm btn-danger" data-action="prog-stop" data-id="${p.id}">${icon('stop')}Dừng</button>` : `<button class="btn btn-sm btn-water" data-action="prog-run" data-id="${p ? p.id : ''}" ${p && p.enabled ? '' : 'disabled'}>${icon('play')}Chạy ngay</button>`}
    <button class="btn btn-sm btn-ghost" data-action="prog-delete" data-id="${p ? p.id : ''}" ${dis}>${icon('trash')}Xóa</button>`;
}
function renderProgTable() {
  const w = $('#prog-table'); if (!w) return;
  keepScroll(w, () => { w.innerHTML = tableHTML('prog-tbl', PROG_COLS, progFiltered(), state.sched.sort, { rowCls: p => state.sched.selected === p.id ? 'sel' : '', empty: 'Không có chương trình phù hợp. Nhấn “Tạo lịch tưới” để thêm mới.' }); });
  $('#prog-actions').innerHTML = progToolbarHTML();
  const all = schedPrograms();
  $('#prog-foot').innerHTML = `<span>${progFiltered().length} / ${all.length} chương trình</span><span>${all.filter(p => p.enabled).length} đang kích hoạt · ${all.filter(p => p.state.running).length} đang chạy · Tổng nước/ngày ≈ ${fmt(sum(all.filter(p => p.enabled && progRunsOn(p, new Date())).map(programVolume)), 0)} m³</span>`;
}
function renderCalendar() {
  const c = $('#sched-cal'); if (!c) return;
  const v = state.sched.view;
  c.innerHTML = v === 'day' ? dayViewHTML() : v === 'week' ? weekViewHTML() : monthViewHTML();
  $('#sched-date').textContent = schedLabel();
  $$('#sched-view button').forEach(x => x.setAttribute('aria-pressed', x.dataset.view === v));
}
function pickProgram(id, open) {
  state.sched.selected = id;
  renderCalendar(); renderProgTable();
  if (open) openProgramDrawer(id);
}
PAGES.schedule = {
  render() {
    const el = $('#page-schedule');
    const f = state.sched.filter;
    const chips = [['all', 'Tất cả'], ['run', 'Đang chạy'], ['up', 'Chờ đến giờ'], ['done', 'Hoàn thành'], ['paused', 'Tạm dừng']];
    el.innerHTML = pageHead('Lịch tưới', `${schedPrograms().length} chương trình tưới · ${esc(ctxLabel())}`, `<button class="btn btn-primary" data-action="new-program">${icon('plus')}Tạo lịch tưới</button>`) +
      `<div class="panel">
        <div class="sched-toolbar">
          <div class="seg" id="sched-view">${[['day', 'Ngày'], ['week', 'Tuần'], ['month', 'Tháng']].map(([k, l]) => `<button data-view="${k}" aria-pressed="${state.sched.view === k}">${l}</button>`).join('')}</div>
          <div class="btn-row"><button class="icon-btn sm" id="sched-prev" aria-label="Trước">${icon('chev-left')}</button><button class="btn btn-sm" id="sched-today">Hôm nay</button><button class="icon-btn sm" id="sched-next" aria-label="Sau">${icon('chev-right')}</button></div>
          <span class="date-label" id="sched-date"></span>
          <span class="spacer" style="flex:1"></span>
          <div class="legend"><span><i style="background:var(--water)"></i>Đang chạy</span><span><i style="background:#7FB89A"></i>Hoàn thành</span><span><i style="background:var(--pine-3)"></i>Chờ đến giờ</span><span><i style="background:#C9D3CE"></i>Tạm dừng</span></div>
        </div>
        <div id="sched-cal"></div>
      </div>
      <div class="panel" style="margin-top:16px">
        <div class="panel-head"><h3>Chương trình tưới</h3><div class="prog-actions" id="prog-actions"></div></div>
        <div class="filters" id="prog-filters">
          <div class="field"><label for="pf-course">Sân golf</label><select class="select" id="pf-course"><option value="all">Tất cả sân</option>${DB.courses.map(c => `<option value="${c.id}" ${f.course === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><span class="label" style="font-size:11.5px;color:var(--muted)">Trạng thái</span><div class="chips" id="pf-status">${chips.map(([k, l]) => `<button class="chip" data-st="${k}" aria-pressed="${f.status === k}">${l}</button>`).join('')}</div></div>
        </div>
        <div class="table-wrap" id="prog-table"></div>
        <div class="table-foot" id="prog-foot"></div>
      </div>`;
    renderCalendar(); renderProgTable();
    $('#sched-view').addEventListener('click', e => { const bt = e.target.closest('[data-view]'); if (bt) { state.sched.view = bt.dataset.view; renderCalendar(); } });
    const shift = dir => { const v = state.sched.view, d = state.sched.date; state.sched.date = v === 'day' ? addDays(d, dir) : v === 'week' ? addDays(d, dir * 7) : new Date(d.getFullYear(), d.getMonth() + dir, 1); renderCalendar(); };
    $('#sched-prev').onclick = () => shift(-1); $('#sched-next').onclick = () => shift(1);
    $('#sched-today').onclick = () => { state.sched.date = new Date(); renderCalendar(); };
    const cal = $('#sched-cal');
    cal.addEventListener('click', e => {
      const pk = e.target.closest('[data-pick]'); if (pk) { pickProgram(pk.dataset.pick, true); return; }
      const dy = e.target.closest('[data-day]'); if (dy) { const [y, m, d] = dy.dataset.day.split('-').map(Number); state.sched.date = new Date(y, m - 1, d); state.sched.view = 'day'; renderCalendar(); }
    });
    cal.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.dataset.pick) pickProgram(e.target.dataset.pick, true); });
    $('#pf-course').onchange = e => { f.course = e.target.value; renderProgTable(); };
    $('#pf-status').addEventListener('click', e => { const c = e.target.closest('[data-st]'); if (!c) return; f.status = c.dataset.st; $$('#pf-status .chip').forEach(x => x.setAttribute('aria-pressed', x === c)); renderProgTable(); });
    const tw = $('#prog-table');
    bindSort(tw, state.sched.sort, renderProgTable);
    tw.addEventListener('click', e => { if (e.target.closest('button, th')) return; const tr = e.target.closest('tr[data-id]'); if (tr) pickProgram(tr.dataset.id, false); });
    tw.addEventListener('dblclick', e => { const tr = e.target.closest('tr[data-id]'); if (tr) openProgramDrawer(tr.dataset.id); });
    tw.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('tr[data-id]')) pickProgram(e.target.dataset.id, true); });
  },
  live() {
    if (!$('#sched-cal')) return;
    const sig = schedPrograms().map(p => progStatus(p).key + p.enabled).join();
    const pr = schedPrograms().filter(p => p.state.running).map(p => fmt(progProgress(p).pct)).join();
    if (this._sig !== sig) { this._sig = sig; renderCalendar(); }
    if (this._pr !== pr || this._sig2 !== sig) { this._pr = pr; this._sig2 = sig; renderProgTable(); }
    const n = $('#g-now'); if (n) { const d = new Date(), m = d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; n.style.left = (m / 1440 * 100) + '%'; n.dataset.label = fmtHM(d); }
  }
};

/* ---------- Biểu mẫu chương trình tưới ---------- */
function programForm(src, mode) {
  const edit = mode === 'edit';
  const p = src ? JSON.parse(JSON.stringify({ ...src, state: undefined })) : { name: '', courseId: state.ctx.courseId !== 'all' ? state.ctx.courseId : DB.courses[0].id, holeIds: [], areaTypes: ['green'], start: '05:00', duration: 12, days: [0, 1, 2, 3, 4, 5, 6], priority: 'mid', enabled: true, concurrency: 8, note: '' };
  if (!src) p.holeIds = DB.holes.filter(h => h.courseId === p.courseId).map(h => h.id);
  if (mode === 'copy') { p.name = src.name + ' (bản sao)'; p.enabled = false; }
  const holesGrid = cid => DB.sites.filter(s => s.courseId === cid).map(s => `<span class="grp">${esc(s.name)}</span>${DB.holes.filter(h => h.siteId === s.id).map(h => `<label class="check"><input type="checkbox" name="pf-hole" value="${h.id}" ${p.holeIds.includes(h.id) ? 'checked' : ''}>${esc(h.name)}</label>`).join('')}`).join('') || '<span class="muted">Sân chưa có hố</span>';
  const field = (k, label, html, full, hint) => `<div class="field ${full ? 'full' : ''}" data-f="${k}"><label ${k.startsWith('x') ? '' : `for="pf-${k}"`}>${label}</label>${html}${hint ? `<span class="hint">${hint}</span>` : ''}<div class="field-error"></div></div>`;
  openModal({
    title: edit ? `Chỉnh sửa lịch tưới – ${src.id}` : mode === 'copy' ? `Sao chép lịch tưới ${src.id}` : 'Tạo lịch tưới mới', size: 'lg',
    body: `<div class="form-grid">
      ${field('name', 'Tên chương trình', `<input class="input" id="pf-name" value="${esc(p.name)}" placeholder="VD: Chương trình L – Green buổi tối">`, true)}
      ${field('course', 'Sân golf', `<select class="select" id="pf-course">${DB.courses.map(c => `<option value="${c.id}" ${c.id === p.courseId ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`)}
      ${field('priority', 'Mức ưu tiên', `<select class="select" id="pf-priority">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${k === p.priority ? 'selected' : ''}>${v.label}</option>`).join('')}</select>`)}
      ${field('xholes', 'Hố golf', `<div class="check-grid" id="pf-holes">${holesGrid(p.courseId)}</div>`, true, '<button class="link" type="button" id="pf-all">Chọn tất cả</button> · <button class="link" type="button" id="pf-none">Bỏ chọn</button>')}
      ${field('xareas', 'Khu tưới', `<div class="chips" id="pf-areas">${AREA_KEYS.map(t => `<button type="button" class="chip" data-area="${t}" aria-pressed="${p.areaTypes.includes(t)}">${AREA[t].name} <span class="n">${AREA[t].vi}</span></button>`).join('')}</div>`, true)}
      ${field('start', 'Giờ bắt đầu', `<input class="input" type="time" id="pf-start" value="${p.start}">`)}
      ${field('duration', 'Thời gian tưới mỗi trạm (phút)', `<input class="input" type="number" id="pf-duration" min="1" max="60" value="${p.duration}">`)}
      ${field('concurrency', 'Số trạm chạy đồng thời', `<input class="input" type="number" id="pf-concurrency" min="1" max="30" value="${p.concurrency}">`, false, 'Giới hạn theo công suất trạm bơm')}
      ${field('xdays', 'Ngày chạy', `<div class="day-toggles" id="pf-days">${DOW.map((d, i) => `<button type="button" data-day="${i}" aria-pressed="${p.days.includes(i)}">${d}</button>`).join('')}</div>`)}
      ${field('note', 'Ghi chú', `<input class="input" id="pf-note" value="${esc(p.note)}" placeholder="Không bắt buộc">`, true)}
      <div class="field full"><label class="switch"><input type="checkbox" id="pf-enabled" ${p.enabled ? 'checked' : ''}><span class="track"></span>Kích hoạt chương trình sau khi lưu</label></div>
      <div class="full note-box" id="pf-sum"></div>
    </div>`,
    footer: `<button class="btn" data-close>Hủy</button><button class="btn btn-primary" id="pf-ok">${icon('check')}${edit ? 'Lưu thay đổi' : 'Tạo lịch tưới'}</button>`,
    onMount: box => {
      const read = () => ({
        name: $('#pf-name', box).value.trim(), courseId: $('#pf-course', box).value, priority: $('#pf-priority', box).value,
        holeIds: $$('input[name="pf-hole"]:checked', box).map(i => i.value), areaTypes: $$('#pf-areas [aria-pressed="true"]', box).map(x => x.dataset.area),
        start: $('#pf-start', box).value, duration: +$('#pf-duration', box).value, concurrency: +$('#pf-concurrency', box).value,
        days: $$('#pf-days [aria-pressed="true"]', box).map(x => +x.dataset.day), note: $('#pf-note', box).value.trim(), enabled: $('#pf-enabled', box).checked
      });
      const upd = () => {
        const v = read(), tmp = { ...v, state: {} };
        const n = programStations(tmp).length;
        const len = n && v.duration > 0 && v.concurrency > 0 ? programLen(tmp) : 0;
        const peak = sum(programStations(tmp).slice(0, v.concurrency).map(id => get(id).flow));
        const overlap = v.start && len ? realPrograms().filter(o => (!edit || o.id !== src.id) && o.enabled && o.courseId === v.courseId && o.days.some(d => v.days.includes(d)) && hmToMin(o.start) < hmToMin(v.start) + len && hmToMin(v.start) < hmToMin(o.start) + programLen(o)) : [];
        $('#pf-sum', box).innerHTML = `${icon('info')}<span><b>${n} trạm</b> · tổng thời lượng <b>${durText(len)}</b>${v.start && len ? ` (${v.start} – ${minToHM(hmToMin(v.start) + len)})` : ''} · nước dự kiến <b>${fmt(n ? programVolume(tmp) : 0, 1)} m³</b> · lưu lượng đỉnh ≈ <b>${fmt(peak)} GPM</b>${peak > SETTINGS.flowMax ? ' <span class="ping-bad">vượt giới hạn trạm bơm</span>' : ''}${overlap.length ? `<br><span class="ping-mid">⚠ Trùng thời gian với ${overlap.map(o => o.id).join(', ')} trên cùng sân</span>` : ''}</span>`;
      };
      const bindHoles = () => $$('input[name="pf-hole"]', box).forEach(i => i.onchange = () => { box.querySelector('[data-f="xholes"]').classList.remove('invalid'); upd(); });
      $('#pf-course', box).onchange = e => { p.holeIds = DB.holes.filter(h => h.courseId === e.target.value).map(h => h.id); $('#pf-holes', box).innerHTML = holesGrid(e.target.value); bindHoles(); upd(); };
      bindHoles();
      $('#pf-all', box).onclick = () => { $$('input[name="pf-hole"]', box).forEach(i => { i.checked = true; }); upd(); };
      $('#pf-none', box).onclick = () => { $$('input[name="pf-hole"]', box).forEach(i => { i.checked = false; }); upd(); };
      $('#pf-areas', box).onclick = e => { const c = e.target.closest('[data-area]'); if (!c) return; c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true'); upd(); };
      $('#pf-days', box).onclick = e => { const c = e.target.closest('[data-day]'); if (!c) return; c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true'); upd(); };
      $$('input', box).forEach(i => i.addEventListener('input', () => { const fd = i.closest('.field'); if (fd) fd.classList.remove('invalid'); upd(); }));
      upd();
      $('#pf-ok', box).onclick = () => {
        const v = read(), errs = {};
        if (!v.name) errs.name = 'Vui lòng nhập tên chương trình';
        else if (v.name.length > 80) errs.name = 'Tên tối đa 80 ký tự';
        else if (realPrograms().some(o => o.name.toLowerCase() === v.name.toLowerCase() && (!edit || o.id !== src.id))) errs.name = 'Tên chương trình đã tồn tại';
        if (!v.holeIds.length) errs.xholes = 'Chọn ít nhất một hố golf';
        if (!v.areaTypes.length) errs.xareas = 'Chọn ít nhất một khu tưới';
        if (!/^\d{2}:\d{2}$/.test(v.start)) errs.start = 'Giờ bắt đầu không hợp lệ';
        if (!(Number.isInteger(v.duration) && v.duration >= 1 && v.duration <= 60)) errs.duration = 'Từ 1 đến 60 phút';
        if (!(Number.isInteger(v.concurrency) && v.concurrency >= 1 && v.concurrency <= 30)) errs.concurrency = 'Từ 1 đến 30 trạm';
        if (!v.days.length) errs.xdays = 'Chọn ít nhất một ngày';
        if (!errs.xholes && !errs.xareas && !programStations({ ...v }).length) errs.xareas = 'Không có trạm tưới nào phù hợp với lựa chọn';
        $$('.field[data-f]', box).forEach(fd => { const k = fd.dataset.f; fd.classList.toggle('invalid', !!errs[k]); $('.field-error', fd).textContent = errs[k] || ''; });
        if (Object.keys(errs).length) { const f1 = $('.field.invalid', box); if (f1) f1.scrollIntoView({ block: 'nearest' }); toast('Vui lòng kiểm tra lại thông tin lịch tưới', 'error'); return; }
        let target;
        if (edit) {
          target = src;
          if (src.state.running && (v.courseId !== src.courseId || !v.enabled)) stopProgram(src);
          Object.assign(src, v);
        } else {
          let n = DB.programs.length + 1; while (get('PRG-' + pad(n))) n++;
          target = { id: 'PRG-' + pad(n), ...v, lastRun: null, lastResult: 'Chưa chạy', state: { running: false, queue: [] } };
          DB.programs.push(target); reindex();
        }
        closeModal();
        toast(edit ? `Đã lưu ${target.name}` : `Đã tạo lịch tưới ${target.name} (${target.id})`, 'success');
        state.sched.selected = target.id;
        if (state.page === 'schedule') PAGES.schedule.render(); else go('schedule');
        if (state.drawer) liveDrawer(true);
      };
    }
  });
}
Object.assign(ACTIONS, {
  'new-program': () => { closeDrawer(); if (state.page !== 'schedule') go('schedule'); setTimeout(() => programForm(null, 'new'), 30); },
  'prog-edit': el => { const p = get(el.dataset.id); if (p) programForm(p, 'edit'); },
  'prog-copy': el => { const p = get(el.dataset.id); if (p) programForm(p, 'copy'); },
  'prog-run': async el => {
    const p = get(el.dataset.id); if (!p) return;
    const n = programStations(p).filter(id => usable(get(id))).length;
    const ok = await confirmDialog({ title: 'Chạy lịch tưới ngay', message: `Bắt đầu <b>${esc(p.name)}</b> ngay bây giờ với ${n} trạm, thời lượng khoảng ${durText(programLen(p))}?`, confirmText: 'Chạy ngay' });
    if (!ok) return;
    if (!startProgram(p)) { toast('Không có trạm khả dụng để chạy chương trình này', 'error'); return; }
    toast(`Đã bắt đầu ${p.name}`, 'success');
    simPumps(); refreshView(); updateLive();
  },
  'prog-stop': async el => {
    const p = get(el.dataset.id); if (!p) return;
    const ok = await confirmDialog({ title: 'Dừng lịch tưới', message: `Dừng <b>${esc(p.name)}</b>? Tất cả trạm đang tưới và đang chờ của chương trình sẽ dừng ngay.`, confirmText: 'Dừng lịch', danger: true });
    if (!ok) return;
    stopProgram(p); p.lastRun = Date.now(); p.lastResult = 'Dừng thủ công';
    toast(`Đã dừng ${p.name}`, 'warning');
    simPumps(); refreshView(); updateLive();
  },
  'prog-toggle': el => ACTIONS[get(el.dataset.id).enabled ? 'prog-pause' : 'prog-enable'](el),
  'prog-enable': el => { const p = get(el.dataset.id); p.enabled = true; toast(`Đã kích hoạt ${p.name}`, 'success'); refreshView(); },
  'prog-pause': async el => {
    const p = get(el.dataset.id);
    if (p.state.running) {
      const ok = await confirmDialog({ title: 'Tạm dừng lịch tưới', message: `<b>${esc(p.name)}</b> đang chạy. Tạm dừng sẽ dừng ngay tất cả trạm của chương trình. Tiếp tục?`, confirmText: 'Tạm dừng', danger: true });
      if (!ok) return;
      stopProgram(p); simPumps();
    }
    p.enabled = false; toast(`Đã tạm dừng ${p.name}`, 'warning'); refreshView();
  },
  'prog-delete': async el => {
    const p = get(el.dataset.id); if (!p) return;
    const ok = await confirmDialog({ title: 'Xóa lịch tưới', message: `Xóa vĩnh viễn <b>${esc(p.name)}</b> (${p.id})?${p.state.running ? ' Chương trình đang chạy sẽ bị dừng.' : ''} Thao tác này không thể hoàn tác.`, confirmText: 'Xóa', danger: true });
    if (!ok) return;
    if (p.state.running) stopProgram(p);
    DB.programs = DB.programs.filter(x => x !== p); reindex();
    if (state.sched.selected === p.id) state.sched.selected = null;
    if (state.drawer && state.drawer.id === p.id) closeDrawer();
    toast(`Đã xóa ${p.name}`, 'warning');
    simPumps(); refreshView();
  }
});

/* ================= 17. Lưu lượng & Máy bơm ================= */
const GAUGE_LEN = 216.77;
const pumpState = p => p.status === 'fault' ? 'fault' : p.status !== 'running' ? 'stopped' : (p.highFlag || p.temp > 70) ? 'warn' : 'running';
const pumpSig = p => `${p.status}|${p.mode}|${pumpState(p)}|${p.setSpeed}`;
function pumpBadge(p) {
  const k = pumpState(p);
  return k === 'warn' ? b('warn', p.highFlag ? 'Áp suất cao' : 'Nhiệt độ cao') : k === 'running' ? b('run', 'Đang chạy') : k === 'fault' ? b('err', 'Sự cố') : b('idle', 'Đã dừng');
}
function pumpCardHTML(p) {
  const k = pumpState(p), frac = clamp(p.flow / p.rated, 0, 1), man = p.mode === 'manual';
  return `<div class="pump-card ${k}" data-pump="${p.id}">
    <div class="pc-head"><div><h3>${esc(p.name)}</h3><p>${p.id} · ${esc(p.type)}</p></div>${pumpBadge(p)}</div>
    <div class="pc-mid">
      <div class="gauge" data-tip="Lưu lượng so với định mức ${fmt(p.rated)} GPM"><svg viewBox="0 0 116 116" aria-hidden="true">
        <circle class="g-track" cx="58" cy="58" r="46" fill="none" stroke-width="10" stroke-linecap="round" transform="rotate(135 58 58)" stroke-dasharray="${GAUGE_LEN} 999"/>
        <circle class="g-val" data-k="gauge" cx="58" cy="58" r="46" fill="none" stroke-width="10" stroke-linecap="round" transform="rotate(135 58 58)" stroke-dasharray="${(frac * GAUGE_LEN).toFixed(1)} 999"/></svg>
        <div class="gauge-num"><strong data-k="flow">${fmt(p.flow)}</strong><span>GPM · <b data-k="pct">${fmt(frac * 100)}</b>%</span></div></div>
      <dl class="pc-metrics">
        <div><dt>Mục tiêu</dt><dd data-k="target">${fmt(p.target)} GPM</dd></div>
        <div><dt>Áp suất</dt><dd data-k="pressure">${p.status === 'running' ? fmt(p.pressure, 1) + ' PSI' : '—'}</dd></div>
        <div><dt>Tốc độ</dt><dd data-k="speed">${p.speed}%</dd></div>
        <div><dt>Công suất</dt><dd data-k="power">${fmt(p.power, 1)} kW</dd></div>
        <div><dt>Nhiệt độ</dt><dd data-k="temp">${fmt(p.temp, 1)} °C</dd></div>
        <div><dt>Giờ chạy</dt><dd data-k="runtime">${hoursText(p.runtime)}</dd></div>
      </dl>
    </div>
    ${k === 'warn' ? `<div class="pc-warn">${icon('alert')}${p.highFlag ? `Áp suất vượt ngưỡng ${SETTINGS.pressureMax} PSI – kiểm tra van xả áp` : 'Nhiệt độ động cơ cao'}</div>` : ''}
    <div class="pc-extra"><span>Định mức <b>${fmt(p.rated)} GPM</b> · <b>${p.kw} kW</b></span><span>Khởi động hôm nay <b>${p.starts}</b></span></div>
    <div class="pc-controls">
      <div class="row"><div class="seg" role="group" aria-label="Chế độ vận hành">
        <button data-action="pump-mode" data-id="${p.id}" data-mode="auto" aria-pressed="${!man}">Tự động</button>
        <button data-action="pump-mode" data-id="${p.id}" data-mode="manual" aria-pressed="${man}">Thủ công</button></div>
        <div class="speed-ctl" data-tip="${man ? 'Điều chỉnh tốc độ biến tần' : 'Chuyển sang Thủ công để chỉnh tốc độ'}">
          <button class="icon-btn sm" data-action="pump-speed" data-id="${p.id}" data-d="-5" aria-label="Giảm tốc độ" ${man && p.setSpeed > 30 ? '' : 'disabled'}>${icon('minus')}</button>
          <output>${man ? p.setSpeed : p.speed}%</output>
          <button class="icon-btn sm" data-action="pump-speed" data-id="${p.id}" data-d="5" aria-label="Tăng tốc độ" ${man && p.setSpeed < 100 ? '' : 'disabled'}>${icon('plus')}</button></div></div>
      <div class="row">
        <button class="btn btn-sm btn-water" data-action="pump-start" data-id="${p.id}" ${man && p.status !== 'running' ? '' : 'disabled'} style="flex:1">${icon('play')}Khởi động</button>
        <button class="btn btn-sm btn-danger" data-action="pump-stop" data-id="${p.id}" ${man && p.status === 'running' ? '' : 'disabled'} style="flex:1">${icon('stop')}Dừng</button></div>
      ${man ? '' : '<span class="muted" style="font-size:11.5px">Chế độ tự động: máy bơm khởi động/dừng theo nhu cầu lưu lượng</span>'}
    </div>
  </div>`;
}
function pumpSummaryHTML() {
  const f = state.flow, on = DB.pumps.filter(p => p.status === 'running');
  const cell = (l, v, u, s) => `<div><div class="fs-label">${l}</div><div class="fs-value">${v}<small>${u}</small></div><div class="kpi-sub">${s}</div></div>`;
  return cell('Tổng lưu lượng', fmt(f.current), 'GPM', `${fmt(f.current / SETTINGS.flowMax * 100)}% giới hạn`) + cell('Nhu cầu mục tiêu', fmt(f.target), 'GPM', `${DB.stations.filter(s => s.status === 'running').length} trạm đang tưới`) +
    cell('Áp suất đường ống', fmt(f.pressure, 1), 'PSI', `Ngưỡng ${SETTINGS.pressureMax} PSI`) + cell('Máy bơm đang chạy', `${on.length}/${DB.pumps.length}`, '', on.map(p => p.id).join(', ') || 'Không có') +
    cell('Công suất điện', fmt(sum(DB.pumps.map(p => p.power)), 1), 'kW', `≈ ${fmt(sum(DB.pumps.map(p => p.power)) * 1850 / 1000, 0)} nghìn đ/giờ`) + cell('Nước hôm nay', fmt(state.volToday), 'm³', `Mực hồ ${fmt((get('WL-01') || {}).value, 2)} m`);
}
function drawPumpCharts() {
  const h = state.flowHist.slice(-80);
  const lab = h.map(x => fmtTime(new Date(x.t)));
  chart($('#pp-flow'), { type: 'line', labels: lab, unit: 'GPM', floor: 0, lastDot: true, labelW: 72,
    series: [{ name: 'Lưu lượng thực tế', data: h.map(x => x.cur), color: COLORS.water, fill: true, width: 2.2 }, { name: 'Lưu lượng mục tiêu', data: h.map(x => x.target), color: COLORS.ink, dash: true, width: 1.4 }],
    lines: [{ y: SETTINGS.flowMax, color: COLORS.red, label: `Tối đa ${fmt(SETTINGS.flowMax)} GPM` }, { y: SETTINGS.flowMin, color: COLORS.amber, label: `Tối thiểu ${fmt(SETTINGS.flowMin)} GPM` }] });
  chart($('#pp-press'), { type: 'line', labels: lab, unit: 'PSI', dec: 1, lastDot: true, labelW: 72, min: 40, max: 100,
    series: [{ name: 'Áp suất', data: h.map(x => x.press), color: COLORS.violet, width: 2 }], lines: [{ y: SETTINGS.pressureMax, color: COLORS.red, label: 'Ngưỡng cao' }, { y: 55, color: COLORS.amber, label: 'Ngưỡng thấp' }] });
  chart($('#pp-share'), { type: 'bar', labels: DB.pumps.map(p => p.id), unit: 'GPM', series: [{ name: 'Lưu lượng hiện tại', data: DB.pumps.map(p => p.flow), color: COLORS.water }, { name: 'Định mức', data: DB.pumps.map(p => p.rated), color: '#C9D8E6' }] });
}
PAGES.pumps = {
  render() {
    const el = $('#page-pumps');
    el.innerHTML = pageHead('Quản lý lưu lượng & máy bơm', 'Trạm bơm chính · 3 bơm chính biến tần, 1 bơm bù áp, 1 bơm tăng áp',
      `<button class="btn" data-action="pumps-auto">${icon('refresh')}Đặt tất cả về Tự động</button><button class="btn" data-go="sensors">${icon('sensor')}Cảm biến lưu lượng</button>`) +
      `<div class="panel summary-strip" id="pp-sum">${pumpSummaryHTML()}</div>
      <div class="pump-grid" id="pp-grid">${DB.pumps.map(pumpCardHTML).join('')}</div>
      <div class="panel"><div class="panel-head"><h3>Lưu lượng thời gian thực <span class="sub">khoảng ${Math.round(80 * SETTINGS.interval / 60)} phút gần nhất</span></h3>
        <div class="legend"><span><i style="background:${COLORS.water}"></i>Thực tế</span><span><i style="background:${COLORS.ink}"></i>Mục tiêu</span><span><i style="background:${COLORS.red}"></i>Tối đa</span><span><i style="background:${COLORS.amber}"></i>Tối thiểu</span></div></div>
        <div class="chart-box h-300"><canvas id="pp-flow"></canvas></div></div>
      <div class="charts-2" style="margin-top:16px">
        <div class="panel"><div class="panel-head"><h3>Áp suất đường ống chính</h3></div><div class="chart-box h-220"><canvas id="pp-press"></canvas></div></div>
        <div class="panel"><div class="panel-head"><h3>Phân bổ lưu lượng theo máy bơm</h3><div class="legend"><span><i style="background:${COLORS.water}"></i>Hiện tại</span><span><i style="background:#C9D8E6"></i>Định mức</span></div></div><div class="chart-box h-220"><canvas id="pp-share"></canvas></div></div>
      </div>`;
    this._sigs = {};
    DB.pumps.forEach(p => { this._sigs[p.id] = pumpSig(p); });
    drawPumpCharts();
  },
  live() {
    if (!$('#pp-grid')) return;
    $('#pp-sum').innerHTML = pumpSummaryHTML();
    DB.pumps.forEach(p => {
      const card = $(`.pump-card[data-pump="${p.id}"]`); if (!card) return;
      const sig = pumpSig(p);
      if (this._sigs[p.id] !== sig) { this._sigs[p.id] = sig; card.outerHTML = pumpCardHTML(p); return; }
      const set = (k, v) => { const e = card.querySelector(`[data-k="${k}"]`); if (e) e.textContent = v; };
      const frac = clamp(p.flow / p.rated, 0, 1);
      card.querySelector('[data-k="gauge"]').setAttribute('stroke-dasharray', `${(frac * GAUGE_LEN).toFixed(1)} 999`);
      set('flow', fmt(p.flow)); set('pct', fmt(frac * 100)); set('target', `${fmt(p.target)} GPM`);
      set('pressure', p.status === 'running' ? fmt(p.pressure, 1) + ' PSI' : '—'); set('speed', `${p.speed}%`);
      set('power', `${fmt(p.power, 1)} kW`); set('temp', `${fmt(p.temp, 1)} °C`); set('runtime', hoursText(p.runtime));
      if (p.mode === 'auto') card.querySelector('.speed-ctl output').textContent = `${p.speed}%`;
    });
    drawPumpCharts();
  }
};
Object.assign(ACTIONS, {
  'pump-mode': el => {
    const p = get(el.dataset.id), m = el.dataset.mode; if (p.mode === m) return;
    p.mode = m;
    if (m === 'manual') p.setSpeed = clamp(Math.round((p.speed || 70) / 5) * 5, 30, 100);
    toast(`${p.id} chuyển sang chế độ ${m === 'auto' ? 'Tự động' : 'Thủ công'}`, 'info');
    simPumps(); updateLive();
  },
  'pump-speed': el => {
    const p = get(el.dataset.id);
    p.setSpeed = clamp(p.setSpeed + +el.dataset.d, 30, 100);
    simPumps(); updateLive();
  },
  'pump-start': el => {
    const p = get(el.dataset.id);
    p.status = 'running'; p.starts++;
    toast(`Đã khởi động ${p.name} ở ${p.setSpeed}% tốc độ`, 'success');
    simPumps(); updateLive();
  },
  'pump-stop': async el => {
    const p = get(el.dataset.id);
    const dem = state.flow.target, other = DB.pumps.filter(x => x !== p && x.status === 'running' && !x.jockey);
    const ok = await confirmDialog({ title: 'Dừng máy bơm', danger: true, confirmText: 'Dừng máy bơm',
      message: `Dừng <b>${esc(p.name)}</b> (${p.id}) đang cấp ${fmt(p.flow)} GPM?${dem > 0 && !other.length ? ' <b>Không còn bơm chính nào chạy</b>, các trạm đang tưới có thể thiếu áp.' : ''}` });
    if (!ok) return;
    p.status = 'stopped';
    toast(`Đã dừng ${p.name}`, 'warning');
    simPumps(); updateLive();
  },
  'pumps-auto': () => { DB.pumps.forEach(p => { p.mode = 'auto'; }); toast('Tất cả máy bơm đã chuyển sang chế độ Tự động', 'success'); simPumps(); updateLive(); }
});

/* ================= 18. Cảm biến ================= */
function sensorFiltered() {
  const f = state.sensors, q = f.q.trim().toLowerCase();
  return DB.sensors.filter(s => (f.type === 'all' || s.type === f.type) && (f.status === 'all' || s.status === f.status) && (f.course === 'all' || s.mapCourse === f.course || s.courseId === f.course) && (!q || [s.id, s.location, SENSOR_TYPES[s.type].short].join(' ').toLowerCase().includes(q)));
}
function typeTilesHTML() {
  return Object.entries(SENSOR_TYPES).map(([k, T]) => {
    const list = DB.sensors.filter(s => s.type === k), warn = list.filter(s => s.status !== 'normal').length;
    const val = k === 'flow' ? (get('FS-01') || list[0] || {}).value : k === 'rain' ? Math.max(0, ...list.map(s => s.value)) : avg(list.map(s => s.value));
    const lab = { flow: 'Tổng trạm bơm', pressure: 'Trung bình', moisture: 'Trung bình', temperature: 'Trung bình', rain: 'Cao nhất', level: 'Trung bình' }[k];
    return `<button class="type-tile" data-type="${k}" aria-pressed="${state.sensors.type === k}"><span class="tt-top">${T.short}${icon(T.icon)}</span><span class="tt-val">${fmt(val, T.dec)}<small>${T.unit}</small></span><span class="tt-sub">${lab} · ${list.length} cảm biến${warn ? ` · <b>${warn} cảnh báo</b>` : ''}</span></button>`;
  }).join('');
}
const SEN_COLS = [
  { key: 'id', label: 'Mã', render: s => `<b>${s.id}</b>` },
  { key: 'type', label: 'Loại', render: s => `<span class="tag t-sensor">${SENSOR_TYPES[s.type].short}</span>` },
  { key: 'location', label: 'Vị trí', render: s => `${esc(s.location)}<span class="cell-sub">${esc(courseName(s.mapCourse))}${s.holeId ? ' · ' + esc(get(s.holeId).name) : ''}</span>` },
  { key: 'value', label: 'Giá trị', cls: 'num', render: s => `<span class="val-cell ${s.status === 'warning' ? 'ping-mid' : ''}">${fmt(s.value, SENSOR_TYPES[s.type].dec)}<small>${SENSOR_TYPES[s.type].unit}</small></span>` },
  { key: 'trend', label: 'Xu hướng 24h', sort: false, render: s => sparkSVG(s.history.map(p => p.v), s.status === 'warning' ? COLORS.amber : COLORS.water) },
  { key: 'lim', label: 'Ngưỡng', sort: false, render: s => `<span class="muted">${sensorLimitsText(s)}</span>` },
  { key: 'battery', label: 'Pin', cls: 'num', render: s => s.battery == null ? '<span class="muted">Nguồn lưới</span>' : `<span class="${s.battery < 30 ? 'ping-bad' : ''}">${s.battery}%</span>` },
  { key: 'status', label: 'Trạng thái', render: s => senBadge(s.status) },
  { key: 'lastUpdate', label: 'Cập nhật', render: s => `<span class="muted">${ago(s.lastUpdate)}</span>` }
];
function renderSensorTable() {
  const w = $('#sen-table'); if (!w) return;
  const rows = sensorFiltered();
  keepScroll(w, () => { w.innerHTML = tableHTML('sen-tbl', SEN_COLS, rows, state.sensors.sort, { rowCls: s => state.drawer && state.drawer.id === s.id ? 'sel' : '' }); });
  $('#sen-foot').innerHTML = `<span>Hiển thị <b>${rows.length}</b> / ${DB.sensors.length} cảm biến</span><span>${DB.sensors.filter(s => s.status === 'warning').length} cảnh báo · ${DB.sensors.filter(s => s.status === 'offline').length} mất tín hiệu</span>`;
}
function drawSensorCharts() {
  const H = id => (get(id) || { history: [] }).history;
  const base = H('SM-01'), lab = base.map(p => fmtHM(new Date(p.t)));
  const moist = DB.sensors.filter(s => s.type === 'moisture');
  const avgAt = (list, i) => avg(list.map(s => s.history[i] ? s.history[i].v : 0));
  const lowest = [...moist].sort((a, c) => a.value - c.value)[0], highest = [...moist].sort((a, c) => c.value - a.value)[0];
  const common = { type: 'line', labels: lab, labelW: 56, lastDot: true };
  chart($('#sc-moist'), { ...common, unit: '%', dec: 1, series: [{ name: 'Trung bình toàn sân', data: base.map((_, i) => avgAt(moist, i)), color: COLORS.turf, width: 2.4 }, ...(lowest ? [{ name: `${lowest.id} (thấp nhất)`, data: lowest.history.map(p => p.v), color: COLORS.amber }] : []), ...(highest ? [{ name: `${highest.id} (cao nhất)`, data: highest.history.map(p => p.v), color: COLORS.water }] : [])], lines: [{ y: SETTINGS.moistureMin, color: COLORS.red, label: `Ngưỡng ${SETTINGS.moistureMin}%` }] });
  chart($('#sc-flow'), { ...common, unit: 'GPM', floor: 0, series: [{ name: 'FS-01 Trạm bơm', data: H('FS-01').map(p => p.v), color: COLORS.water, fill: true }, { name: 'FS-02 Sân Bắc', data: H('FS-02').map(p => p.v), color: COLORS.teal }, { name: 'FS-05 Nhánh Hố 12', data: H('FS-05').map(p => p.v), color: COLORS.amber }] });
  chart($('#sc-press'), { ...common, unit: 'PSI', dec: 1, series: [{ name: 'PS-01 Đầu đẩy', data: H('PS-01').map(p => p.v), color: COLORS.violet, width: 2.2 }, { name: 'PS-03 Cuối tuyến Hố 09', data: H('PS-03').map(p => p.v), color: COLORS.teal }], lines: [{ y: SETTINGS.pressureMax, color: COLORS.red, label: 'Ngưỡng cao' }] });
  chart($('#sc-temp'), { ...common, unit: '°C', dec: 1, series: [{ name: 'TS-01 Không khí', data: H('TS-01').map(p => p.v), color: COLORS.red, width: 2.2 }, { name: 'TS-02 Đất Hố 05', data: H('TS-02').map(p => p.v), color: COLORS.amber }, { name: 'TS-03 Đất Hố 14', data: H('TS-03').map(p => p.v), color: COLORS.turf }] });
}
PAGES.sensors = {
  render() {
    const el = $('#page-sensors'), f = state.sensors;
    const lg = arr => `<div class="legend">${arr.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`;
    el.innerHTML = pageHead('Cảm biến', `${DB.sensors.length} cảm biến: lưu lượng, áp suất, độ ẩm đất, nhiệt độ, mưa, mực nước`, `<button class="btn" data-action="sen-export">${icon('download')}Xuất CSV</button>`) +
      `<div class="type-tiles" id="sen-tiles">${typeTilesHTML()}</div>
      <div class="charts-2">
        <div class="panel"><div class="panel-head"><h3>Độ ẩm đất</h3>${lg([[COLORS.turf, 'Trung bình'], [COLORS.amber, 'Thấp nhất'], [COLORS.water, 'Cao nhất']])}</div><div class="chart-box h-220"><canvas id="sc-moist"></canvas></div></div>
        <div class="panel"><div class="panel-head"><h3>Lưu lượng</h3>${lg([[COLORS.water, 'FS-01'], [COLORS.teal, 'FS-02'], [COLORS.amber, 'FS-05']])}</div><div class="chart-box h-220"><canvas id="sc-flow"></canvas></div></div>
        <div class="panel"><div class="panel-head"><h3>Áp suất</h3>${lg([[COLORS.violet, 'PS-01'], [COLORS.teal, 'PS-03']])}</div><div class="chart-box h-220"><canvas id="sc-press"></canvas></div></div>
        <div class="panel"><div class="panel-head"><h3>Nhiệt độ</h3>${lg([[COLORS.red, 'Không khí'], [COLORS.amber, 'Đất Hố 05'], [COLORS.turf, 'Đất Hố 14']])}</div><div class="chart-box h-220"><canvas id="sc-temp"></canvas></div></div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Danh sách cảm biến</h3>${f.type !== 'all' ? `<button class="chip" data-action="sen-type-clear" aria-pressed="true">${SENSOR_TYPES[f.type].short} ${icon('x')}</button>` : ''}</div>
        <div class="filters" id="sen-filters">
          <div class="field search-field"><label for="sen-q">Tìm kiếm</label>${icon('search')}<input class="input" id="sen-q" placeholder="Mã hoặc vị trí cảm biến" value="${esc(f.q)}"></div>
          <div class="field"><label for="sen-course">Sân golf</label><select class="select" id="sen-course"><option value="all">Tất cả sân</option>${DB.courses.map(c => `<option value="${c.id}" ${f.course === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="sen-type">Loại</label><select class="select" id="sen-type"><option value="all">Tất cả loại</option>${Object.entries(SENSOR_TYPES).map(([k, T]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${T.short}</option>`).join('')}</select></div>
          <div class="field"><label for="sen-status">Trạng thái</label><select class="select" id="sen-status"><option value="all">Tất cả</option>${Object.entries(SENSOR_ST).map(([k, v]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></div>
        </div>
        <div class="table-wrap max-h" id="sen-table"></div><div class="table-foot" id="sen-foot"></div>
      </div>`;
    renderSensorTable(); drawSensorCharts();
    $('#sen-tiles').addEventListener('click', e => { const t = e.target.closest('[data-type]'); if (!t) return; f.type = f.type === t.dataset.type ? 'all' : t.dataset.type; this.render(); });
    $('#sen-filters').addEventListener('change', e => { const m = { 'sen-course': 'course', 'sen-type': 'type', 'sen-status': 'status' }[e.target.id]; if (m) { f[m] = e.target.value; if (m === 'type') this.render(); else renderSensorTable(); } });
    $('#sen-q').addEventListener('input', debounce(e => { f.q = e.target.value; renderSensorTable(); }, 120));
    const tw = $('#sen-table');
    bindSort(tw, f.sort, renderSensorTable);
    tw.addEventListener('click', e => { if (e.target.closest('th, button')) return; const tr = e.target.closest('tr[data-id]'); if (tr) { openSensorDrawer(tr.dataset.id); renderSensorTable(); } });
    tw.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('tr[data-id]')) e.target.click(); });
  },
  live() {
    if (!$('#sen-tiles')) return;
    $('#sen-tiles').innerHTML = typeTilesHTML();
    if (!$('#sen-filters').contains(document.activeElement)) renderSensorTable();
    drawSensorCharts();
  }
};
Object.assign(ACTIONS, {
  'sen-type-clear': () => { state.sensors.type = 'all'; PAGES.sensors.render(); },
  'sen-export': () => downloadCSV(`cam-bien-${isoDate(new Date())}.csv`, [['Mã', 'Loại', 'Vị trí', 'Sân', 'Giá trị', 'Đơn vị', 'Trạng thái', 'Cập nhật'], ...sortRows(sensorFiltered(), SEN_COLS, state.sensors.sort).map(s => [s.id, SENSOR_TYPES[s.type].short, s.location, courseName(s.mapCourse), fmt(s.value, SENSOR_TYPES[s.type].dec), SENSOR_TYPES[s.type].unit, SENSOR_ST[s.status].label, fmtDT(s.lastUpdate)])])
});

/* ================= 19. Bản đồ tưới ================= */
const MAP_W = 1000, MAP_H = 620;
function mapBaseSVG(c) {
  const r = mulberry32(c.ci * 97 + 11);
  const holes = DB.holes.filter(h => h.courseId === c.id && h.geo);
  const trees = Array.from({ length: 70 }, () => { const x = r() * MAP_W, y = r() * MAP_H; return [x, y, 7 + r() * 11]; })
    .filter(([x, y]) => !holes.some(h => { for (let t = 0; t <= 1; t += 0.1) { const p = bez(h.geo, t); if (Math.hypot(p[0] - x, p[1] - y) < 52) return true; } return false; }) && Math.hypot(c.lake[0] - x, c.lake[1] - y) > 90);
  const path = g => `M${g.t[0]},${g.t[1]} Q${g.c[0]},${g.c[1]} ${g.g[0]},${g.g[1]}`;
  return `<defs><pattern id="mow" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="14" height="28" fill="rgba(255,255,255,.06)"/></pattern>
      <style>.pipe-on{stroke-dasharray:7 6;animation:mflow 1s linear infinite}@keyframes mflow{to{stroke-dashoffset:-13}}@media (prefers-reduced-motion:reduce){.pipe-on{animation:none}}</style></defs>
    <rect width="${MAP_W}" height="${MAP_H}" fill="#9CC08A"/>
    ${trees.map(([x, y, s]) => `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${s.toFixed(1)}" fill="#6F9E5E" opacity=".75"/><circle cx="${(x - s * .25).toFixed(0)}" cy="${(y - s * .25).toFixed(0)}" r="${(s * .55).toFixed(1)}" fill="#86B271" opacity=".8"/>`).join('')}
    <ellipse cx="${c.lake[0]}" cy="${c.lake[1]}" rx="78" ry="48" fill="#6FA8CC" stroke="#A9CFE3" stroke-width="4"/>
    <ellipse cx="${c.lake[0] - 10}" cy="${c.lake[1] - 8}" rx="46" ry="22" fill="#82B6D6"/>
    <text class="m-label light" x="${c.lake[0]}" y="${c.lake[1] + 4}" text-anchor="middle">${c.id === 'C03' ? 'Hồ điều hòa' : 'Hồ chứa'}</text>
    ${holes.map(h => `<path d="${path(h.geo)}" fill="none" stroke="#8DB978" stroke-width="84" stroke-linecap="round" opacity=".55"/>`).join('')}
    ${holes.map(h => `<path d="${path(h.geo)}" fill="none" stroke="#B9DE93" stroke-width="44" stroke-linecap="round"/><path d="${path(h.geo)}" fill="none" stroke="url(#mow)" stroke-width="44" stroke-linecap="round"/>`).join('')}
    ${holes.map(h => { const g = h.geo, nn = bezN(g, 0.97), p0 = bez(g, 0.08), bk = [g.g[0] - nn[0] * 36, g.g[1] - nn[1] * 36], bk2 = bez(g, 0.66);
      return `<ellipse cx="${bk[0].toFixed(0)}" cy="${bk[1].toFixed(0)}" rx="15" ry="9" fill="#EDE0B5" stroke="#D9C990"/>
        <ellipse cx="${(bk2[0] + nn[0] * 26).toFixed(0)}" cy="${(bk2[1] + nn[1] * 26).toFixed(0)}" rx="11" ry="7" fill="#EDE0B5" stroke="#D9C990"/>
        <circle cx="${g.g[0]}" cy="${g.g[1]}" r="30" fill="#D3EEB0" stroke="#A9D58A" stroke-width="3"/>
        <line x1="${g.g[0]}" y1="${g.g[1]}" x2="${g.g[0]}" y2="${g.g[1] - 26}" stroke="#15302A" stroke-width="1.6"/><path d="M${g.g[0]},${g.g[1] - 26} l14,5 l-14,5z" fill="#CF3F2E"/>
        <rect x="${(p0[0] - 11).toFixed(0)}" y="${(p0[1] - 7).toFixed(0)}" width="22" height="14" rx="3" fill="#CDE8A8" stroke="#A9D58A" stroke-width="2"/>
        <circle cx="${(g.t[0] - nn[0] * 34).toFixed(0)}" cy="${(g.t[1] - nn[1] * 34).toFixed(0)}" r="11" fill="#135040"/><text class="m-hole-no" x="${(g.t[0] - nn[0] * 34).toFixed(0)}" y="${(g.t[1] - nn[1] * 34 + 4).toFixed(0)}" text-anchor="middle">${h.no}</text>`; }).join('')}
    <g><rect x="${c.pumpHouse[0] - 26}" y="${c.pumpHouse[1] - 16}" width="52" height="32" rx="4" fill="#E8EEE9" stroke="#15302A" stroke-width="1.5"/><text class="m-label" x="${c.pumpHouse[0]}" y="${c.pumpHouse[1] + 30}" text-anchor="middle">Trạm bơm</text>
      <circle cx="${c.pumpHouse[0] - 10}" cy="${c.pumpHouse[1]}" r="6" fill="#1B7BD3"/><circle cx="${c.pumpHouse[0] + 8}" cy="${c.pumpHouse[1]}" r="6" fill="#1B7BD3"/></g>
    <g><rect x="${c.club[0] - 40}" y="${c.club[1] - 18}" width="80" height="36" rx="5" fill="#F4EFE4" stroke="#8A7D63" stroke-width="1.5"/><text class="m-label" x="${c.club[0]}" y="${c.club[1] + 4}" text-anchor="middle">Nhà CLB</text></g>`;
}
function mapDynSVG(c) {
  const L = state.map.layers, fs = state.map.status, sel = state.map.selected;
  const sts = DB.stations.filter(s => s.courseId === c.id && s.pos);
  const holes = DB.holes.filter(h => h.courseId === c.id && h.geo);
  const match = s => fs === 'all' || (fs === 'error' ? !usable(s) : fs === 'idle' ? (s.status === 'idle' || s.status === 'completed') : s.status === fs);
  let out = '';
  if (L.pipes) {
    const ph = c.pumpHouse;
    out += holes.map(h => { const m = bez(h.geo, 0.5), on = sts.some(s => s.holeId === h.id && s.status === 'running');
      const hs = sts.filter(s => s.holeId === h.id);
      return `<path d="M${ph[0]},${ph[1]} L${m[0].toFixed(0)},${m[1].toFixed(0)}" stroke="#1B7BD3" stroke-width="3.5" fill="none" opacity="${on ? .75 : .32}" class="${on ? 'pipe-on' : ''}"/>` +
        hs.map(s => `<path d="M${m[0].toFixed(0)},${m[1].toFixed(0)} L${s.pos[0].toFixed(0)},${s.pos[1].toFixed(0)}" stroke="#1B7BD3" stroke-width="1.6" fill="none" opacity="${s.status === 'running' ? .8 : .28}" class="${s.status === 'running' ? 'pipe-on' : ''}"/>`).join(''); }).join('');
  }
  if (L.stations) out += sts.map(s => `<g class="m-st s-${s.status} ${match(s) ? '' : 'dim'} ${sel === s.id ? 'sel' : ''}" data-st="${s.id}" transform="translate(${s.pos[0].toFixed(1)},${s.pos[1].toFixed(1)})" tabindex="0" role="button" aria-label="${s.name}, ${STATION_ST[s.status].label}">
      ${s.status === 'running' ? `<circle class="m-spray" r="${s.type === 'fairway' || s.type === 'rough' ? 22 : 16}"/><circle class="m-ring" r="7"/>` : ''}<circle class="core" r="${sel === s.id ? 8 : 6.5}"/></g>`).join('');
  if (L.satellites) out += DB.satellites.filter(x => x.courseId === c.id && x.pos).map(x => `<g class="m-sat s-${x.status} ${sel === x.id ? 'sel' : ''}" data-sat="${x.id}" transform="translate(${x.pos[0].toFixed(0)},${x.pos[1].toFixed(0)})" tabindex="0" role="button" aria-label="${x.id}">
      <rect x="-9" y="-9" width="18" height="18" rx="3"/><path d="M-4,-3h8M-4,1h8M-4,5h5" stroke="#fff" stroke-width="1.4"/><text class="m-label" x="13" y="4">${x.id.replace('SAT-', 'S')}</text></g>`).join('');
  if (L.sensors) out += DB.sensors.filter(x => x.mapCourse === c.id && x.pos).map(x => `<g class="m-sen s-${x.status} ${sel === x.id ? 'sel' : ''}" data-sen="${x.id}" transform="translate(${x.pos[0].toFixed(0)},${x.pos[1].toFixed(0)})" tabindex="0" role="button" aria-label="${x.id}">
      <rect x="-6" y="-6" width="12" height="12" rx="2" transform="rotate(45)"${sel === x.id ? ' stroke="#15302A" stroke-width="2.5"' : ''}/></g>`).join('');
  return out;
}
function mapCountHTML(c) {
  const sts = DB.stations.filter(s => s.courseId === c.id);
  const n = k => sts.filter(s => s.status === k).length;
  return `<div><strong style="color:var(--water-2)">${n('running')}</strong><span>Đang tưới</span></div><div><strong>${n('waiting')}</strong><span>Đang chờ</span></div><div><strong style="color:var(--turf)">${n('idle') + n('completed')}</strong><span>Sẵn sàng / Xong</span></div><div><strong style="color:var(--red)">${n('error') + n('offline')}</strong><span>Lỗi / Mất kết nối</span></div>`;
}
function applyVB() { const svg = $('#map-svg'); if (svg) svg.setAttribute('viewBox', state.map.vb.map(v => v.toFixed(1)).join(' ')); }
function zoomMap(f, cx, cy) {
  const [x, y, w, h] = state.map.vb;
  const nw = clamp(w * f, 220, MAP_W), nh = nw * MAP_H / MAP_W;
  cx = cx ?? x + w / 2; cy = cy ?? y + h / 2;
  const nx = clamp(cx - (cx - x) * nw / w, 0, MAP_W - nw), ny = clamp(cy - (cy - y) * nh / h, 0, MAP_H - nh);
  state.map.vb = [nx, ny, nw, nh]; applyVB();
}
function liveMap() {
  const g = $('#m-dyn'); if (!g || state.page !== 'map') return;
  const c = get(state.map.courseId); if (!c) return;
  const sig = DB.stations.filter(s => s.courseId === c.id).map(s => s.status[0] + s.status[2]).join('') + DB.satellites.map(s => s.status[1]).join('') + DB.sensors.map(s => s.status[0]).join('') + state.map.selected + state.map.status + JSON.stringify(state.map.layers);
  if (g._sig !== sig) { g.innerHTML = mapDynSVG(c); g._sig = sig; }
  $('#map-count').innerHTML = mapCountHTML(c);
}
function mapTip(el, e) {
  if (el.dataset.st) { const s = get(el.dataset.st); showTipAt(`<div class="tt-title">${s.id} · ${esc(s.name)}</div><div class="tt-row"><span>${esc(get(s.holeId).name)}, ${AREA[s.type].name}</span></div><div class="tt-row"><span>Trạng thái</span><b>${STATION_ST[s.status].label}</b></div>${s.status === 'running' ? `<div class="tt-row"><span>Còn lại</span><b>${durText(s.duration - s.elapsed)}</b></div>` : ''}<div class="tt-row"><span>Lưu lượng</span><b>${s.flow} GPM</b></div>`, e.clientX, e.clientY); }
  else if (el.dataset.sat) { const d = get(el.dataset.sat); showTipAt(`<div class="tt-title">${d.id}</div><div class="tt-row"><span>${esc(d.name)}</span></div><div class="tt-row"><span>Trạng thái</span><b>${EQ_ST[d.status].label}</b></div><div class="tt-row"><span>Ping</span><b>${d.ping == null ? '—' : d.ping + ' ms'}</b></div>`, e.clientX, e.clientY); }
  else if (el.dataset.sen) { const s = get(el.dataset.sen), T = SENSOR_TYPES[s.type]; showTipAt(`<div class="tt-title">${s.id} · ${T.short}</div><div class="tt-row"><span>${esc(s.location)}</span></div><div class="tt-row"><span>Giá trị</span><b>${fmt(s.value, T.dec)} ${T.unit}</b></div><div class="tt-row"><span>Trạng thái</span><b>${SENSOR_ST[s.status].label}</b></div>`, e.clientX, e.clientY); }
}
PAGES.map = {
  render() {
    if (!get(state.map.courseId)) state.map.courseId = DB.courses[0] ? DB.courses[0].id : null;
    const c = get(state.map.courseId), el = $('#page-map');
    const L = state.map.layers;
    const chips = [['all', 'Tất cả'], ['running', 'Đang tưới'], ['waiting', 'Đang chờ'], ['idle', 'Sẵn sàng'], ['error', 'Lỗi']];
    const hasGeo = c && DB.holes.some(h => h.courseId === c.id && h.geo);
    el.innerHTML = pageHead('Bản đồ tưới', 'Bản đồ tương tác các hố, trạm tưới, bộ điều khiển, cảm biến và đường ống. Nhấn vào trạm để xem chi tiết và điều khiển.',
      `<div class="seg" id="map-course">${DB.courses.map(x => `<button data-c="${x.id}" aria-pressed="${x.id === state.map.courseId}">${esc(x.name)}</button>`).join('')}</div>`) +
      `<div class="map-layout">
        <div class="panel map-panel">
          <div class="panel-head"><h3>${c ? esc(c.name) : 'Chưa có sân'} <span class="sub">${c ? esc(c.en) + ' · ' + DB.holes.filter(h => h.courseId === c.id).length + ' hố' : ''}</span></h3>
            <div class="chips" id="map-status">${chips.map(([k, l]) => `<button class="chip" data-s="${k}" aria-pressed="${state.map.status === k}">${l}</button>`).join('')}</div></div>
          ${hasGeo ? `<div class="map-stage" id="map-stage">
            <svg id="map-svg" viewBox="${state.map.vb.join(' ')}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Bản đồ ${esc(c.name)}"><g>${mapBaseSVG(c)}</g><g id="m-dyn"></g></svg>
            <div class="map-zoom"><button id="mz-in" aria-label="Phóng to">${icon('plus')}</button><button id="mz-out" aria-label="Thu nhỏ">${icon('minus')}</button><button id="mz-reset" aria-label="Đặt lại khung nhìn">${icon('refresh')}</button></div>
            <div class="map-hint">Kéo để di chuyển · Cuộn để phóng to</div></div>` : `<div class="empty-state" style="padding:80px 20px">${icon('map')}Sân này chưa có dữ liệu bản đồ số hóa.</div>`}
        </div>
        <div class="map-side">
          <div class="panel"><div class="panel-head"><h3>Tình trạng trạm</h3></div><div class="panel-body"><div class="map-count" id="map-count">${c ? mapCountHTML(c) : ''}</div></div></div>
          <div class="panel"><div class="panel-head"><h3>Lớp hiển thị</h3></div><div class="panel-body layer-list" id="map-layers">
            ${[['stations', 'Trạm tưới'], ['satellites', 'Bộ điều khiển'], ['sensors', 'Cảm biến'], ['pipes', 'Đường ống']].map(([k, l]) => `<label class="switch"><input type="checkbox" data-layer="${k}" ${L[k] ? 'checked' : ''}><span class="track"></span>${l}</label>`).join('')}</div></div>
          <div class="panel"><div class="panel-head"><h3>Chú giải</h3></div><div class="panel-body legend-list">
            <div><span class="lg-dot" style="background:#2E9A5E"></span>Trạm sẵn sàng / trực tuyến</div>
            <div><span class="lg-dot" style="background:#1B7BD3"></span>Đang tưới</div>
            <div><span class="lg-dot" style="background:#fff;box-shadow:0 0 0 2px #1B7BD3"></span>Đang chờ</div>
            <div><span class="lg-dot" style="background:#E2A11A"></span>Cảnh báo</div>
            <div><span class="lg-dot" style="background:#CF3F2E"></span>Lỗi / Ngoại tuyến</div>
            <div><span class="lg-sq" style="background:#135040"></span>Bộ điều khiển (Satellite)</div>
            <div><span class="lg-dia" style="background:#6D5BD0"></span>Cảm biến</div>
            <div><span class="lg-line"></span>Đường ống (nét động khi có nước)</div>
            <div><span class="lg-dot" style="background:#D3EEB0;box-shadow:0 0 0 1px #A9D58A"></span>Green · <span class="lg-sq" style="background:#B9DE93"></span>Fairway</div>
          </div></div>
        </div>
      </div>`;
    $('#map-course').addEventListener('click', e => { const bt = e.target.closest('[data-c]'); if (!bt) return; state.map.courseId = bt.dataset.c; state.map.vb = [0, 0, MAP_W, MAP_H]; state.map.selected = null; closeDrawer(); this.render(); });
    $('#map-status').addEventListener('click', e => { const bt = e.target.closest('[data-s]'); if (!bt) return; state.map.status = bt.dataset.s; $$('#map-status .chip').forEach(x => x.setAttribute('aria-pressed', x === bt)); liveMap(); });
    $('#map-layers').addEventListener('change', e => { const k = e.target.dataset.layer; if (k) { L[k] = e.target.checked; liveMap(); } });
    if (!hasGeo) return;
    liveMap();
    const stage = $('#map-stage'), svg = $('#map-svg');
    const toMap = (cx, cy) => { const r = svg.getBoundingClientRect(), [x, y, w, h] = state.map.vb; const s = Math.max(w / r.width, h / r.height), ox = (r.width - w / s) / 2, oy = (r.height - h / s) / 2; return [x + (cx - r.left - ox) * s, y + (cy - r.top - oy) * s, s]; };
    $('#mz-in').onclick = () => zoomMap(0.75); $('#mz-out').onclick = () => zoomMap(1 / 0.75); $('#mz-reset').onclick = () => { state.map.vb = [0, 0, MAP_W, MAP_H]; applyVB(); };
    stage.addEventListener('wheel', e => { e.preventDefault(); const [mx, my] = toMap(e.clientX, e.clientY); zoomMap(e.deltaY > 0 ? 1.15 : 1 / 1.15, mx, my); }, { passive: false });
    let drag = null;
    stage.addEventListener('pointerdown', e => { if (e.button !== 0 || e.target.closest('.map-zoom')) return; drag = { x: e.clientX, y: e.clientY, vb: [...state.map.vb], moved: false }; });
    window.addEventListener('pointermove', e => {
      if (!drag || !$('#map-svg')) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 4) return;
      if (!drag.moved) { drag.moved = true; stage.classList.add('dragging'); try { stage.setPointerCapture(e.pointerId); } catch (_) { } hideTip(); }
      const s = toMap(0, 0)[2], [, , w, h] = drag.vb;
      state.map.vb = [clamp(drag.vb[0] - dx * s, 0, MAP_W - w), clamp(drag.vb[1] - dy * s, 0, MAP_H - h), w, h]; applyVB();
    });
    window.addEventListener('pointerup', () => { if (drag && drag.moved) { stage.classList.remove('dragging'); stage._justDragged = true; setTimeout(() => { stage._justDragged = false; }, 50); } drag = null; });
    const pickEl = e => e.target.closest('[data-st],[data-sat],[data-sen]');
    stage.addEventListener('click', e => {
      if (stage._justDragged) return;
      const t = pickEl(e); if (!t) return;
      hideTip();
      if (t.dataset.st) { state.map.selected = t.dataset.st; liveMap(); openStationDrawer(t.dataset.st); }
      else if (t.dataset.sat) { state.map.selected = t.dataset.sat; liveMap(); openEquipDrawer(t.dataset.sat); }
      else { state.map.selected = t.dataset.sen; liveMap(); openSensorDrawer(t.dataset.sen); }
    });
    stage.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && pickEl(e)) { e.preventDefault(); pickEl(e).dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
    stage.addEventListener('mousemove', e => { if (drag && drag.moved) return; const t = pickEl(e); if (t) mapTip(t, e); else hideTip(); });
    stage.addEventListener('mouseleave', hideTip);
    const s = state.map.selected && get(state.map.selected);
    if (s && s.pos && state.map.vb[2] === MAP_W) { const w = 560, h = w * MAP_H / MAP_W; state.map.vb = [clamp(s.pos[0] - w / 2, 0, MAP_W - w), clamp(s.pos[1] - h / 2, 0, MAP_H - h), w, h]; applyVB(); }
  },
  live() { liveMap(); }
};

/* ================= 20. Chẩn đoán ================= */
Object.assign(state.diag, { status: 'all', sort: { key: 'status', dir: 1 }, pct: 0 });
const DIAG_ORDER = { offline: 0, warning: 1, online: 2 };
const DIAG_KIND = { SAT: 'Bộ điều khiển', DEC: 'Bộ giải mã', RAD: 'Radio' };
function diagDevices() {
  const f = state.diag.filter, st = state.diag.status;
  return [...DB.satellites, ...DB.decoders, ...DB.radios].filter(d => inCtx(d)
    && (f === 'all' || d.id.startsWith(f)) && (st === 'all' || d.status === st));
}
function diagSignal(d) {
  if (d.id.startsWith('RAD')) return d.signal == null ? '<span class="ping-bad">Không có</span>' : `${sigBars(d.signal)}${d.signal} dBm`;
  if (d.id.startsWith('SAT')) return d.signal == null ? '—' : `${sigPct(d.signal)}${d.signal}%`;
  return d.status === 'offline' ? '<span class="ping-bad">Không có</span>' : `${fmt(d.voltage, 1)} V · ${fmt(d.current)} mA`;
}
const DIAG_COLS = [
  { key: 'id', label: 'Thiết bị', render: d => `<b>${d.id}</b><span class="cell-sub">${esc(d.name || d.model || d.type)}</span>` },
  { key: 'kind', label: 'Loại', sortVal: d => d.id.slice(0, 3), render: d => DIAG_KIND[d.id.slice(0, 3)] },
  { key: 'site', label: 'Khu vực', sortVal: d => d.siteId, render: d => `${esc(get(d.siteId).name)}<span class="cell-sub">${esc(courseName(d.courseId))}</span>` },
  { key: 'status', label: 'Trạng thái', sortVal: d => DIAG_ORDER[d.status], render: d => eqBadge(d.status) + (d.rebooting ? '<span class="cell-sub">Đang khởi động lại…</span>' : '') },
  { key: 'ping', label: 'Ping', cls: 'num', sortVal: d => d.status === 'offline' ? 1e9 : d.ping, render: d => pingText(d.status === 'offline' ? null : d.ping) },
  { key: 'signal', label: 'Tín hiệu', sort: false, render: diagSignal },
  { key: 'errorCode', label: 'Mã lỗi / thông báo', sortVal: d => d.errorCode || 'zz', render: d => d.errorCode ? `<span class="err-code">${d.errorCode}</span><span class="cell-sub">${esc(d.errorMsg)}</span>` : '<span class="muted">—</span>' },
  { key: 'lastSeen', label: 'Giao tiếp gần nhất', sortVal: d => -d.lastSeen, render: d => `<span class="${d.status === 'offline' ? 'ping-bad' : ''}">${ago(d.lastSeen)}</span>` },
  { key: 'lastOk', label: 'Thành công gần nhất', sortVal: d => -d.lastOk, render: d => fmtDT(d.lastOk) }
];
const ERROR_CODES = [
  ['E-120', 'Áp suất đầu đẩy máy bơm vượt ngưỡng', 'Kiểm tra van xả áp, giảm tốc độ biến tần, kiểm tra van tay đóng nhầm.'],
  ['E-214', 'Bộ điều khiển phản hồi chậm (> 800 ms)', 'Kiểm tra đường truyền, nhiễu radio, tải CPU của bộ điều khiển.'],
  ['E-305', 'Dòng điện solenoid bất thường', 'Đo điện trở cuộn solenoid, kiểm tra mối nối chống nước tại hộp van.'],
  ['E-401', 'Bộ giải mã không phản hồi lệnh truy vấn', 'Kiểm tra cáp 2 dây, cầu chì bảo vệ sét, thay bộ giải mã nếu cần.'],
  ['E-502', 'Mất liên kết vô tuyến với trung tâm', 'Kiểm tra nguồn và anten bộ lặp, vật cản mới trong đường truyền.'],
  ['E-510', 'Tín hiệu radio yếu dưới -85 dBm', 'Điều chỉnh hướng anten, kiểm tra cáp đồng trục và đầu nối.']
];
function diagSummaryHTML() {
  const all = [...DB.satellites, ...DB.decoders, ...DB.radios].filter(inCtx);
  const n = s => all.filter(d => d.status === s).length;
  const pings = all.filter(d => d.status !== 'offline' && d.ping != null).map(d => d.ping);
  const cell = (l, v, u, s) => `<div><div class="fs-label">${l}</div><div class="fs-value">${v}<small>${u}</small></div><div class="kpi-sub">${s}</div></div>`;
  return cell('Trực tuyến', n('online'), `/ ${all.length}`, `${fmt(n('online') / (all.length || 1) * 100, 1)}% thiết bị`) + cell('Cảnh báo', n('warning'), 'thiết bị', 'Tín hiệu yếu / phản hồi chậm')
    + cell('Ngoại tuyến', n('offline'), 'thiết bị', `${DB.stations.filter(s => s.status === 'offline' && inCtx(s)).length} trạm bị ảnh hưởng`) + cell('Ping trung bình', fmt(avg(pings)), 'ms', `Cao nhất ${fmt(Math.max(0, ...pings))} ms`);
}
function renderDiagTable() {
  const w = $('#dg-table'); if (!w) return;
  const rows = diagDevices();
  keepScroll(w, () => { w.innerHTML = tableHTML('dg-t', DIAG_COLS, rows, state.diag.sort, { rowCls: d => d.status === 'offline' ? 'sel' : '' }); });
  $('#dg-foot').textContent = `${rows.length} thiết bị`;
  $('#dg-sum').innerHTML = diagSummaryHTML();
}
function renderConsole() {
  const c = $('#dg-console'); if (!c) return;
  c.innerHTML = state.diag.log.length ? state.diag.log.map(l => `<div class="ln"><time>${l.t}</time><span class="${l.c}">${l.m}</span></div>`).join('')
    : '<div class="ln placeholder">Nhấn “Chạy chẩn đoán” để kiểm tra kết nối toàn bộ thiết bị hiện trường, máy bơm và cảm biến.</div>';
  c.scrollTop = c.scrollHeight;
  $('#dg-prog').style.width = state.diag.pct + '%';
  const btn = $('#dg-run');
  btn.disabled = state.diag.running;
  btn.innerHTML = state.diag.running ? `${icon('refresh')}Đang chẩn đoán…` : `${icon('play')}Chạy chẩn đoán`;
  $('#dg-last').textContent = state.diag.lastRun ? `Lần chạy gần nhất: ${fmtDT(state.diag.lastRun)}` : 'Chưa chạy trong phiên này';
}
function runDiagnostics() {
  if (state.diag.running) return;
  const scope = state.diag.scope, inScope = o => scope === 'all' || o.courseId === scope;
  const steps = [];
  const add = (c, m) => steps.push({ c, m });
  add('run', `▶ Bắt đầu chẩn đoán: ${scope === 'all' ? 'toàn hệ thống' : courseName(scope)}`);
  add('ok', '✓ Máy chủ điều khiển trung tâm: phản hồi 4 ms, CSDL đồng bộ');
  DB.satellites.filter(inScope).forEach(s => {
    if (s.status === 'offline') add('err', `✗ Bộ điều khiển ${s.id}: không phản hồi (${s.errorCode || 'E-401'})`);
    else if (s.status === 'warning') add('warn', `⚠ Bộ điều khiển ${s.id} phản hồi chậm (${fmt(s.ping)} ms)`);
    else add('ok', `✓ Kết nối Satellite ${s.id} (${fmt(s.ping)} ms, ${s.comm})`);
    DB.decoders.filter(d => d.satelliteId === s.id).forEach(d => {
      if (d.status === 'offline') add('err', `✗ Bộ giải mã ${d.id} không phản hồi – ${eqStations(d).length} trạm không thể điều khiển`);
      else if (d.status === 'warning') add('warn', `⚠ Bộ giải mã ${d.id}: ${d.errorMsg.toLowerCase()} (${d.errorCode})`);
      else add('ok', `✓ Kết nối Decoder ${d.id} (${eqStations(d).length} kênh, ${fmt(d.voltage, 1)} V)`);
    });
  });
  DB.radios.filter(inScope).forEach(r => {
    const no = r.id.split('-')[1];
    if (r.status === 'offline') add('err', `⚠ Radio ${no} mất kết nối (${r.errorCode})`);
    else if (r.status === 'warning') add('warn', `⚠ Radio ${no} tín hiệu yếu (${r.signal} dBm)`);
    else add('ok', `✓ Kiểm tra Radio ${no} (${r.signal} dBm)`);
  });
  if (scope === 'all' || scope === 'C01') {
    const on = DB.pumps.filter(p => p.status === 'running');
    add('ok', `✓ Trạm bơm: ${on.length}/${DB.pumps.length} máy đang chạy, áp suất ${fmt(state.flow.pressure, 1)} PSI`);
    DB.pumps.filter(p => p.status === 'running' && p.pressure > SETTINGS.pressureMax).forEach(p => add('warn', `⚠ Máy bơm ${p.id} áp suất cao ${fmt(p.pressure, 1)} PSI (E-120)`));
  }
  const sens = DB.sensors.filter(s => scope === 'all' || s.courseId === scope || s.mapCourse === scope);
  add('ok', `✓ Cảm biến: ${sens.filter(s => s.status !== 'offline').length}/${sens.length} phản hồi`);
  sens.filter(s => s.status === 'warning').forEach(s => add('warn', `⚠ Cảm biến ${s.id} ngoài ngưỡng (${fmt(s.value, SENSOR_TYPES[s.type].dec)} ${SENSOR_TYPES[s.type].unit})`));
  const nOk = steps.filter(s => s.c === 'ok').length, nW = steps.filter(s => s.c === 'warn').length, nE = steps.filter(s => s.c === 'err').length;
  state.diag = Object.assign(state.diag, { running: true, log: [], pct: 0 });
  const t0 = Date.now();
  let i = 0;
  const next = () => {
    if (i < steps.length) {
      const s = steps[i++];
      state.diag.log.push({ t: fmtTime(new Date()), c: s.c, m: esc(s.m) });
      state.diag.pct = i / steps.length * 100;
      if (state.page === 'diagnostics') renderConsole();
      setTimeout(next, 120 + rand() * 180);
    } else {
      state.diag.running = false; state.diag.lastRun = Date.now();
      state.diag.log.push({ t: fmtTime(new Date()), c: 'sum', m: `Hoàn tất: ${steps.length - 1} kiểm tra · ${nOk - 1} đạt · ${nW} cảnh báo · ${nE} lỗi · ${fmt((Date.now() - t0) / 1000, 1)} giây` });
      if (state.page === 'diagnostics') renderConsole();
      toast(`Chẩn đoán hoàn tất: ${nW} cảnh báo, ${nE} lỗi`, nE ? 'warning' : 'success');
    }
  };
  if (state.page === 'diagnostics') renderConsole();
  next();
}
PAGES.diagnostics = {
  render() {
    const el = $('#page-diagnostics');
    const f = state.diag;
    el.innerHTML = pageHead('Chẩn đoán', 'Kiểm tra truyền thông bộ điều khiển, bộ giải mã, radio, máy bơm và cảm biến',
      `<button class="btn" data-go="equipment/satellites">${icon('chip')}Thiết bị hiện trường</button>`) + `
      <div class="diag-layout">
        <div class="grid">
          <div class="panel diag-summary" id="dg-sum"></div>
          <div class="panel"><div class="panel-head"><h2>Trạng thái truyền thông</h2><span class="small muted" id="dg-foot"></span></div>
            <div class="filters"><div class="chips" id="dg-chips">${[['all', 'Tất cả'], ['SAT', 'Bộ điều khiển'], ['DEC', 'Bộ giải mã'], ['RAD', 'Radio']].map(([k, l]) => `<button class="chip" data-f="${k}" aria-pressed="${f.filter === k}">${l}</button>`).join('')}</div>
              <span class="spacer"></span><div class="field"><label for="dg-status">Trạng thái</label><select class="select" id="dg-status">${[['all', 'Tất cả'], ['online', 'Trực tuyến'], ['warning', 'Cảnh báo'], ['offline', 'Ngoại tuyến']].map(([k, l]) => `<option value="${k}" ${f.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
            <div class="table-wrap max-h" id="dg-table"></div></div>
        </div>
        <div class="grid">
          <div class="panel"><div class="panel-head"><h2>Chẩn đoán hệ thống</h2></div>
            <div class="diag-ctrl"><div class="field"><label for="dg-scope">Phạm vi kiểm tra</label><select class="select" id="dg-scope"><option value="all">Toàn hệ thống</option>${DB.courses.map(c => `<option value="${c.id}" ${f.scope === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
              <button class="btn btn-primary" id="dg-run">${icon('play')}Chạy chẩn đoán</button>
              <div class="progress"><span id="dg-prog" style="width:0"></span></div><span class="small muted" id="dg-last"></span></div>
            <div class="console" id="dg-console" aria-live="polite"></div></div>
          <div class="panel"><div class="panel-head"><h2>Tra cứu mã lỗi</h2></div><div class="panel-body"><div class="mini-list">${ERROR_CODES.map(([c, t, fix]) => `<div style="flex-direction:column;align-items:flex-start;gap:2px"><span><span class="err-code">${c}</span> · <b>${t}</b></span><span class="small muted">${fix}</span></div>`).join('')}</div></div></div>
        </div>
      </div>`;
    renderDiagTable(); renderConsole();
    $('#dg-chips').onclick = e => { const c = e.target.closest('[data-f]'); if (!c) return; f.filter = c.dataset.f; $$('#dg-chips .chip').forEach(x => x.setAttribute('aria-pressed', x === c)); renderDiagTable(); };
    $('#dg-status').onchange = e => { f.status = e.target.value; renderDiagTable(); };
    $('#dg-scope').onchange = e => { f.scope = e.target.value; };
    $('#dg-run').onclick = runDiagnostics;
    bindSort($('#dg-table'), f.sort, renderDiagTable);
    $('#dg-table').addEventListener('click', e => { const tr = e.target.closest('tr[data-id]'); if (tr && !e.target.closest('th')) openEquipDrawer(tr.dataset.id); });
  },
  live() { renderDiagTable(); }
};

/* ================= 21. Báo cáo ================= */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const srand = key => mulberry32(hashStr(key));
const sr = (key, a, b2) => a + srand(key)() * (b2 - a);
function repDays() {
  const out = [], from = new Date(state.reports.from + 'T00:00'), to = new Date(state.reports.to + 'T00:00');
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) out.push(new Date(d));
  return out;
}
function weatherOf(d) {
  const k = isoDate(d), rain = sr(k + 'r', 0, 1) < 0.2 && !sameDay(d, new Date());
  return { rain, mm: rain ? sr(k + 'mm', 4, 22) : sr(k + 'mm', 0, 0.6), et0: rain ? sr(k + 'et', 2.2, 3.4) : sr(k + 'et', 3.9, 5.8), factor: rain ? 0.3 : sr(k + 'f', 0.88, 1.14) };
}
function repHoles() {
  const r = state.reports;
  return DB.holes.filter(h => (r.course === 'all' || h.courseId === r.course) && (r.site === 'all' || h.siteId === r.site) && (r.hole === 'all' || h.id === r.hole));
}
function repStations(h) { const e = state.reports.equip; return holeStations(h.id).filter(s => !e.startsWith('SAT') || s.satelliteId === e); }
function holeVol(h, d) { const w = weatherOf(d); return sum(repStations(h).map(s => s.flow * s.defRun)) * GAL_TO_M3 * 1.35 * w.factor * sr(h.id + isoDate(d), 0.9, 1.1); }
function repGroups() {
  const r = state.reports, hs = repHoles();
  if (r.hole !== 'all') return [{ name: get(r.hole).name, holes: hs }];
  if (r.site !== 'all') return hs.map(h => ({ name: h.name, holes: [h] }));
  if (r.course !== 'all') return DB.sites.filter(s => s.courseId === r.course).map(s => ({ name: s.name, holes: hs.filter(h => h.siteId === s.id) }));
  return DB.courses.map(c => ({ name: c.name, holes: hs.filter(h => h.courseId === c.id) }));
}
const REP_TABS = { water: 'Lượng nước sử dụng', runtime: 'Thời gian tưới', pumps: 'Hiệu suất máy bơm', flow: 'Lịch sử lưu lượng', sensor: 'Lịch sử cảm biến', equipment: 'Tình trạng thiết bị', schedule: 'Lịch sử lịch tưới' };
function repEquipOptions(tab) {
  if (tab === 'pumps') return [['all', 'Tất cả máy bơm'], ...DB.pumps.map(p => [p.id, `${p.id} – ${p.name}`])];
  if (tab === 'sensor') return Object.entries(SENSOR_TYPES).filter(([k]) => k !== 'rain').map(([k, t]) => [k, t.name]);
  if (tab === 'equipment') return [['all', 'Tất cả thiết bị'], ['SAT', 'Bộ điều khiển'], ['DEC', 'Bộ giải mã'], ['RAD', 'Thiết bị Radio']];
  if (tab === 'flow') return [['all', 'Toàn hệ thống (FS-01)'], ...DB.sensors.filter(s => s.type === 'flow').map(s => [s.id, `${s.id} – ${s.location}`])];
  return [['all', 'Tất cả bộ điều khiển'], ...DB.satellites.filter(s => state.reports.site === 'all' || s.siteId === state.reports.site).map(s => [s.id, `${s.id} – ${s.name}`])];
}
const rCell = (l, v, u, s = '') => `<div><div class="fs-label">${l}</div><div class="fs-value">${v}<small>${u}</small></div><div class="kpi-sub">${s}</div></div>`;
function buildReport(tab, days) {
  const labels = days.map(d => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`);
  const hs = repHoles(), r = state.reports;
  if (tab === 'water') {
    const groups = repGroups();
    const data = groups.map(g => days.map(d => sum(g.holes.map(h => holeVol(h, d)))));
    const totals = days.map((d, i) => sum(data.map(s => s[i])));
    const tot = sum(totals), prev = tot * sr(r.from + r.to + 'prev', 0.9, 1.12);
    const mx = Math.max(...totals), mi = totals.indexOf(mx);
    return {
      stats: rCell('Tổng lượng nước', fmt(tot), 'm³', `≈ ${fmt(tot * 264.17)} gallon`) + rCell('Trung bình / ngày', fmt(tot / days.length), 'm³', `${days.length} ngày`) + rCell('Ngày cao nhất', fmt(mx), 'm³', labels[mi]) + rCell('So với kỳ trước', (tot >= prev ? '+' : '') + fmt((tot - prev) / prev * 100, 1), '%', `Kỳ trước ${fmt(prev)} m³`),
      title: 'Lượng nước theo ngày (m³)', chart: { type: 'bar', stacked: true, labels, unit: 'm³', series: groups.map((g, i) => ({ name: g.name, data: data[i], color: SERIES[i % SERIES.length] })) },
      cols: ['Ngày', ...groups.map(g => g.name), 'Tổng (m³)', 'Lượng mưa (mm)', 'ET₀ (mm)'],
      rows: days.map((d, i) => [fmtDate(d), ...data.map(s => fmt(s[i], 1)), `<b>${fmt(totals[i], 1)}</b>`, fmt(weatherOf(d).mm, 1), fmt(weatherOf(d).et0, 1)])
    };
  }
  if (tab === 'runtime') {
    const rows = hs.map(h => {
      const sts = repStations(h), bad = sts.filter(s => !usable(s)).length;
      const runs = Math.round(sum(days.map(d => sts.length * 1.3 * weatherOf(d).factor)));
      const hours = sum(days.map(d => sum(sts.map(s => s.defRun)) * 1.3 * weatherOf(d).factor * sr(h.id + isoDate(d) + 'rt', 0.9, 1.1))) / 60;
      const comp = sts.length ? clamp(100 - bad / sts.length * 100 * 0.6 - sr(h.id + 'c', 0, 4), 0, 100) : 0;
      return { h, sts: sts.length, runs, hours, comp };
    });
    const T = sum(rows.map(x => x.hours));
    return {
      stats: rCell('Tổng thời gian tưới', fmt(T, 1), 'giờ-trạm') + rCell('Số lượt tưới', fmt(sum(rows.map(x => x.runs))), 'lượt') + rCell('Trung bình mỗi hố', fmt(T / (rows.length || 1), 1), 'giờ') + rCell('Tỉ lệ hoàn thành', fmt(avg(rows.map(x => x.comp)), 1), '%'),
      title: 'Thời gian tưới theo hố (giờ)', chart: { type: 'bar', labels: rows.map(x => x.h.name.replace('Hố ', 'H')), unit: 'giờ', dec: 1, series: [{ name: 'Thời gian tưới', data: rows.map(x => x.hours), color: COLORS.water }] },
      cols: ['Hố', 'Sân', 'Số trạm', 'Tổng thời gian (giờ)', 'Số lượt', 'TB mỗi lượt (phút)', 'Hoàn thành'],
      rows: rows.map(x => [`<b>${x.h.name}</b>`, esc(courseName(x.h.courseId)), x.sts, fmt(x.hours, 1), fmt(x.runs), fmt(x.runs ? x.hours * 60 / x.runs : 0, 1), `${fmt(x.comp, 1)}%`])
    };
  }
  if (tab === 'pumps') {
    const pumps = DB.pumps.filter(p => r.equip === 'all' || p.id === r.equip);
    const base = { 'P-01': [6, 9], 'P-02': [5, 8], 'P-03': [1, 4], 'P-04': [10, 14], 'P-05': [0, 2] };
    const hrs = pumps.map(p => days.map(d => { const [a, b2] = base[p.id] || [2, 6]; return sr(p.id + isoDate(d), a, b2) * (weatherOf(d).rain ? 0.35 : 1); }));
    const rows = pumps.map((p, i) => {
      const H = sum(hrs[i]), fl = p.rated * (p.jockey ? 0.55 : sr(p.id + 'fl', 0.68, 0.84)), kwh = p.kw * 0.56 * H;
      return { p, H, fl, pr: 70 + sr(p.id + 'pr', 0, 6) + (p.anomaly ? 14 : 0), kwh, eff: kwh ? fl * 60 * H * GAL_TO_M3 / kwh : 0, starts: Math.round(sum(hrs[i].map(h => h > 0.5 ? (p.jockey ? 5 : 2) : 0))), warn: p.anomaly ? days.length * 2 : 0 };
    });
    return {
      stats: rCell('Tổng giờ chạy', fmt(sum(rows.map(x => x.H)), 1), 'giờ') + rCell('Điện năng tiêu thụ', fmt(sum(rows.map(x => x.kwh))), 'kWh', `≈ ${fmt(sum(rows.map(x => x.kwh)) * 1.85, 0)} nghìn đồng`) + rCell('Hiệu suất trung bình', fmt(avg(rows.filter(x => x.H).map(x => x.eff)), 2), 'm³/kWh') + rCell('Số lần khởi động', fmt(sum(rows.map(x => x.starts))), 'lần'),
      title: 'Giờ chạy máy bơm theo ngày', chart: { type: 'bar', labels, unit: 'giờ', dec: 1, series: pumps.map((p, i) => ({ name: p.id, data: hrs[i], color: SERIES[i % SERIES.length] })) },
      cols: ['Máy bơm', 'Giờ chạy', 'Lưu lượng TB (GPM)', 'Áp suất TB (PSI)', 'Điện năng (kWh)', 'Hiệu suất (m³/kWh)', 'Số lần khởi động', 'Cảnh báo'],
      rows: rows.map(x => [`<b>${x.p.id}</b> ${esc(x.p.name)}`, fmt(x.H, 1), fmt(x.fl), fmt(x.pr, 1), fmt(x.kwh), fmt(x.eff, 2), x.starts, x.warn ? `<span class="err-code">${x.warn}</span>` : '0'])
    };
  }
  if (tab === 'flow') {
    const scale = r.equip === 'all' ? 1 : r.equip === 'FS-05' ? 0.1 : 0.34;
    const rows = days.map(d => { const w = weatherOf(d), k = isoDate(d) + r.equip; const peak = sr(k + 'p', 1480, 2080) * (w.rain ? 0.55 : 1) * scale; return { d, peak, hour: `0${Math.floor(sr(k + 'h', 4, 6))}:${pad(Math.floor(sr(k + 'm', 0, 59)))}`, avgF: peak * sr(k + 'a', 0.62, 0.74), vol: sum(hs.map(h => holeVol(h, d))) * scale, over: scale === 1 && peak > SETTINGS.flowMax ? Math.ceil(sr(k + 'o', 1, 4)) : 0 }; });
    return {
      stats: rCell('Lưu lượng đỉnh', fmt(Math.max(...rows.map(x => x.peak))), 'GPM') + rCell('TB trong giờ tưới', fmt(avg(rows.map(x => x.avgF))), 'GPM') + rCell('Tổng thể tích', fmt(sum(rows.map(x => x.vol))), 'm³') + rCell('Vượt ngưỡng tối đa', sum(rows.map(x => x.over)), 'lần', `Ngưỡng ${fmt(SETTINGS.flowMax)} GPM`),
      title: 'Lưu lượng đỉnh và trung bình theo ngày (GPM)', chart: { type: 'line', labels, unit: 'GPM', floor: 0, series: [{ name: 'Đỉnh', data: rows.map(x => x.peak), color: COLORS.water, fill: true }, { name: 'Trung bình giờ tưới', data: rows.map(x => x.avgF), color: COLORS.turf }], lines: scale === 1 ? [{ y: SETTINGS.flowMax, color: COLORS.red, label: 'Tối đa' }] : [] },
      cols: ['Ngày', 'Lưu lượng đỉnh (GPM)', 'Giờ đạt đỉnh', 'TB giờ tưới (GPM)', 'Thể tích (m³)', 'Vượt ngưỡng'],
      rows: rows.map(x => [fmtDate(x.d), fmt(x.peak), x.hour, fmt(x.avgF), fmt(x.vol, 1), x.over])
    };
  }
  if (tab === 'sensor') {
    const type = SENSOR_TYPES[r.equip] ? r.equip : 'moisture', T = SENSOR_TYPES[type];
    const hIds = new Set(hs.map(h => h.id));
    const sens = DB.sensors.filter(s => s.type === type && (!s.holeId ? (r.hole === 'all' && r.site === 'all' && (r.course === 'all' || s.mapCourse === r.course || s.courseId === r.course)) : hIds.has(s.holeId))).slice(0, 8);
    const lo = type === 'moisture' ? SETTINGS.moistureMin : null;
    const data = sens.map(s => days.map(d => { const w = weatherOf(d), k = s.id + isoDate(d); let v = type === 'flow' ? (s.id === 'FS-01' ? 1250 : 380) * w.factor * sr(k, 0.85, 1.1) * 0.4 : s.value + sr(k, -1, 1) * (type === 'moisture' ? 2.4 : type === 'level' ? 0.08 : 1.2); if (type === 'moisture' && w.rain) v += 4; return Math.max(0, v); }));
    return {
      stats: rCell('Số cảm biến', sens.length, 'thiết bị', T.name) + rCell('Giá trị trung bình', fmt(avg(data.flat()), T.dec), T.unit) + rCell('Thấp nhất', fmt(Math.min(...data.flat()), T.dec), T.unit) + rCell('Cao nhất', fmt(Math.max(...data.flat()), T.dec), T.unit),
      title: `${T.name} – trung bình ngày (${T.unit})`, chart: { type: 'line', labels, unit: T.unit, dec: T.dec, series: sens.map((s, i) => ({ name: s.id, data: data[i], color: SERIES[i % SERIES.length], width: 1.8 })), lines: lo ? [{ y: lo, color: COLORS.amber, label: 'Ngưỡng dưới' }] : [] },
      cols: ['Cảm biến', 'Vị trí', 'Thấp nhất', 'Cao nhất', 'Trung bình', 'Số ngày vượt ngưỡng', 'Trạng thái hiện tại'],
      rows: sens.map((s, i) => { const L = type === 'moisture' ? SETTINGS.moistureMin : s.lo; return [`<b>${s.id}</b>`, esc(s.location), fmt(Math.min(...data[i]), T.dec), fmt(Math.max(...data[i]), T.dec), fmt(avg(data[i]), T.dec), data[i].filter(v => (L != null && v < L) || (s.hi != null && v > s.hi)).length, SENSOR_ST[s.status].label]; })
    };
  }
  if (tab === 'equipment') {
    const devs = [...DB.satellites, ...DB.decoders, ...DB.radios].filter(d => (r.course === 'all' || d.courseId === r.course) && (r.site === 'all' || d.siteId === r.site) && (r.equip === 'all' || d.id.startsWith(r.equip)));
    const up = d => d.status === 'offline' ? sr(d.id + 'u', 92, 96.5) : d.status === 'warning' ? sr(d.id + 'u', 97, 99) : sr(d.id + 'u', 99.3, 100);
    const daily = days.map(d => avg(devs.map(x => clamp(up(x) + sr(x.id + isoDate(d), -1.2, 0.6), 80, 100))));
    const inc = devs.map(d => d.status === 'online' ? Math.round(sr(d.id + 'i', 0, 1.4)) : Math.round(sr(d.id + 'i', 2, 6)));
    return {
      stats: rCell('Tỉ lệ sẵn sàng', fmt(avg(daily), 2), '%') + rCell('Thiết bị trực tuyến', devs.filter(d => d.status === 'online').length, `/ ${devs.length}`) + rCell('Sự cố trong kỳ', sum(inc), 'lần') + rCell('Thời gian khắc phục TB', fmt(sr(r.from + 'mttr', 1.2, 3.8), 1), 'giờ', 'MTTR'),
      title: 'Tỉ lệ sẵn sàng thiết bị theo ngày (%)', chart: { type: 'line', labels, unit: '%', dec: 2, min: 90, max: 100, series: [{ name: 'Sẵn sàng', data: daily, color: COLORS.turf, fill: true }] },
      cols: ['Thiết bị', 'Loại', 'Khu vực', 'Trạng thái hiện tại', 'Thời gian hoạt động', 'Số lần mất kết nối', 'Mã lỗi gần nhất'],
      rows: devs.map((d, i) => [`<b>${d.id}</b>`, DIAG_KIND[d.id.slice(0, 3)], esc(siteLabel(d.siteId)), EQ_ST[d.status].label, `${fmt(up(d), 2)}%`, inc[i], d.errorCode || '—'])
    };
  }
  // schedule
  const hIds = new Set(hs.map(h => h.id)), now = new Date();
  const runs = [];
  days.forEach(d => DB.programs.filter(p => p.enabled && p.days.includes(weekday(d)) && p.holeIds.some(h => hIds.has(h))).forEach(p => {
    if (sameDay(d, now) && hmToMin(p.start) > nowMin()) return;
    const w = weatherOf(d), k = p.id + isoDate(d), bad = programStations(p).filter(id => !usable(get(id))).length;
    let res = 'done', label = 'Hoàn thành';
    if (w.rain && p.priority !== 'high') { res = 'skip'; label = 'Hoãn do mưa'; }
    else if (sr(k + 'x', 0, 1) < 0.05) { res = 'stop'; label = 'Dừng thủ công'; }
    else if (bad) { res = 'warn'; label = `Hoàn thành, bỏ qua ${bad} trạm`; }
    if (sameDay(d, now) && p.state.running) { res = 'run'; label = 'Đang chạy'; }
    const len = programLen(p) * (res === 'stop' ? 0.4 : 1);
    runs.push({ d, p, res, label, end: minToHM(hmToMin(p.start) + len), n: programStations(p).length - bad, vol: res === 'skip' ? 0 : programVolume(p) * (res === 'stop' ? 0.4 : 1) * sr(k, 0.95, 1.05) });
  }));
  runs.sort((x, y) => y.d - x.d || hmToMin(y.p.start) - hmToMin(x.p.start));
  const cnt = (res, d) => runs.filter(x => (!res || res.includes(x.res)) && (!d || sameDay(x.d, d))).length;
  const RB = { done: 'done', warn: 'warn', skip: 'idle', stop: 'err', run: 'run' };
  return {
    stats: rCell('Tổng lượt chạy', runs.length, 'lượt') + rCell('Hoàn thành', cnt(['done', 'warn']), 'lượt', `${fmt(cnt(['done', 'warn']) / (runs.length || 1) * 100, 1)}%`) + rCell('Hoãn / dừng', cnt(['skip', 'stop']), 'lượt', 'Do mưa hoặc thao tác thủ công') + rCell('Tổng lượng nước', fmt(sum(runs.map(x => x.vol))), 'm³'),
    title: 'Kết quả lượt chạy theo ngày', chart: { type: 'bar', stacked: true, labels, unit: 'lượt', series: [{ name: 'Hoàn thành', data: days.map(d => cnt(['done', 'run'], d)), color: COLORS.turf }, { name: 'Bỏ qua trạm lỗi', data: days.map(d => cnt(['warn'], d)), color: COLORS.amber }, { name: 'Hoãn / dừng', data: days.map(d => cnt(['skip', 'stop'], d)), color: COLORS.slate }] },
    cols: ['Ngày', 'Chương trình', 'Sân', 'Bắt đầu', 'Kết thúc', 'Số trạm', 'Lượng nước (m³)', 'Kết quả'],
    rows: runs.slice(0, 300).map(x => [fmtDate(x.d), `<b>${x.p.id}</b> ${esc(x.p.name)}`, esc(courseName(x.p.courseId)), x.p.start, x.end, x.n, fmt(x.vol, 1), b(RB[x.res], x.label)])
  };
}
function repValidate() {
  const r = state.reports, f = new Date(r.from + 'T00:00'), t = new Date(r.to + 'T00:00');
  if (!r.from || isNaN(f)) return ['from', 'Ngày bắt đầu không hợp lệ'];
  if (!r.to || isNaN(t)) return ['to', 'Ngày kết thúc không hợp lệ'];
  if (f > t) return ['to', 'Ngày kết thúc phải sau ngày bắt đầu'];
  if (t > new Date()) return ['to', 'Không thể chọn ngày trong tương lai'];
  if ((t - f) / 864e5 > 61) return ['from', 'Khoảng thời gian tối đa 62 ngày'];
  return null;
}
let lastReport = null;
function renderReportBody() {
  const box = $('#rp-body'); if (!box) return;
  const form = $('#rp-filters');
  $$('.field', form).forEach(x => x.classList.remove('invalid')); $$('.field-error', form).forEach(x => { x.textContent = ''; });
  const bad = repValidate();
  if (bad) { const fld = $(`[name="${bad[0]}"]`, form).closest('.field'); fld.classList.add('invalid'); fld.querySelector('.field-error').textContent = bad[1]; box.innerHTML = `<div class="empty-state">${icon('alert')}${bad[1]}</div>`; lastReport = null; return; }
  const tab = state.reports.tab, rep = buildReport(tab, repDays());
  lastReport = rep;
  box.innerHTML = `<div class="report-stats">${rep.stats}</div>
    <div class="panel-head" style="border-bottom:0"><h2>${rep.title}</h2>${rep.chart.series.length > 1 ? `<div class="legend">${rep.chart.series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>` : ''}</div>
    <div class="chart-box h-260"><canvas id="rp-chart"></canvas></div>
    <div class="table-wrap max-h" style="border-top:1px solid var(--line-2)"><table class="table"><thead><tr>${rep.cols.map((c, i) => `<th class="${i ? 'num' : ''}">${c}</th>`).join('')}</tr></thead>
      <tbody>${rep.rows.map(r => `<tr>${r.map((v, i) => `<td class="${i && !/badge/.test(v) && !/<b>[A-Z]/.test(v) ? 'num' : ''}">${v}</td>`).join('')}</tr>`).join('') || `<tr class="empty"><td colspan="${rep.cols.length}">Không có dữ liệu trong khoảng thời gian đã chọn.</td></tr>`}</tbody></table></div>
    <div class="table-foot"><span>${rep.rows.length} dòng · ${fmtDate(new Date(state.reports.from))} – ${fmtDate(new Date(state.reports.to))}</span><span>Dữ liệu mô phỏng</span></div>`;
  chart($('#rp-chart'), Object.assign({ labelW: 48 }, rep.chart));
}
PAGES.reports = {
  render(sub) {
    const r = state.reports;
    if (sub && REP_TABS[sub]) r.tab = sub;
    const opts = repEquipOptions(r.tab);
    if (!opts.some(o => o[0] === r.equip)) r.equip = opts[0][0];
    const sites = DB.sites.filter(s => r.course === 'all' || s.courseId === r.course);
    if (r.site !== 'all' && !sites.some(s => s.id === r.site)) r.site = 'all';
    const holes = DB.holes.filter(h => (r.course === 'all' || h.courseId === r.course) && (r.site === 'all' || h.siteId === r.site));
    if (r.hole !== 'all' && !holes.some(h => h.id === r.hole)) r.hole = 'all';
    const sel = (name, label, list, val) => `<div class="field"><label>${label}</label><select class="select" name="${name}">${list.map(([k, l]) => `<option value="${k}" ${val === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><div class="field-error"></div></div>`;
    $('#page-reports').innerHTML = pageHead('Báo cáo', 'Thống kê vận hành hệ thống tưới – nước, thời gian tưới, máy bơm, cảm biến và thiết bị',
      `<button class="btn" id="rp-print">${icon('report')}In báo cáo</button><button class="btn btn-primary" id="rp-csv">${icon('download')}Xuất CSV</button>`) + `
      <div class="panel"><div class="tabs" id="rp-tabs" role="tablist">${Object.entries(REP_TABS).map(([k, l]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${r.tab === k}">${l}</button>`).join('')}</div>
        <form class="filters" id="rp-filters" onsubmit="return false">
          <div class="field"><label>Từ ngày</label><input class="input" type="date" name="from" value="${r.from}" max="${isoDate(new Date())}"><div class="field-error"></div></div>
          <div class="field"><label>Đến ngày</label><input class="input" type="date" name="to" value="${r.to}" max="${isoDate(new Date())}"><div class="field-error"></div></div>
          <div class="field"><label>Nhanh</label><div class="seg" id="rp-quick"><button type="button" data-q="0">Hôm nay</button><button type="button" data-q="6">7 ngày</button><button type="button" data-q="29">30 ngày</button></div></div>
          ${sel('course', 'Sân golf', [['all', 'Tất cả sân'], ...DB.courses.map(c => [c.id, c.name])], r.course)}
          ${sel('site', 'Khu vực', [['all', 'Tất cả khu vực'], ...sites.map(s => [s.id, s.name])], r.site)}
          ${sel('hole', 'Hố golf', [['all', 'Tất cả hố'], ...holes.map(h => [h.id, h.name])], r.hole)}
          ${sel('equip', r.tab === 'sensor' ? 'Loại cảm biến' : 'Thiết bị', opts, r.equip)}
        </form>
        <div id="rp-body"></div></div>`;
    renderReportBody();
    $('#rp-tabs').onclick = e => { const t = e.target.closest('[data-tab]'); if (t) go('reports', t.dataset.tab); };
    $('#rp-filters').addEventListener('change', e => {
      const n = e.target.name; if (!n) return;
      r[n] = e.target.value;
      if (['course', 'site'].includes(n)) { if (n === 'course') r.site = 'all'; r.hole = 'all'; this.render(); } else renderReportBody();
    });
    $('#rp-quick').onclick = e => { const q = e.target.closest('[data-q]'); if (!q) return; r.to = isoDate(new Date()); r.from = isoDate(addDays(new Date(), -q.dataset.q)); this.render(); };
    $('#rp-print').onclick = () => window.print();
    $('#rp-csv').onclick = () => {
      if (!lastReport) { toast('Không có dữ liệu để xuất – kiểm tra lại bộ lọc', 'error'); return; }
      const txt = h => { const d = document.createElement('div'); d.innerHTML = String(h); return d.textContent.trim(); };
      downloadCSV(`bao-cao-${r.tab}-${r.from}_${r.to}.csv`, [lastReport.cols, ...lastReport.rows.map(row => row.map(txt))]);
    };
  }
};

/* ================= 22. Cài đặt ================= */
const SET_FIELDS = [
  ['clubName', 'text', 'Tên câu lạc bộ', v => v.trim().length >= 3 ? '' : 'Tên tối thiểu 3 ký tự'],
  ['interval', 'number', 'Chu kỳ cập nhật dữ liệu (giây)', v => v >= 1 && v <= 30 ? '' : 'Giá trị từ 1 đến 30 giây'],
  ['simStep', 'number', 'Thời gian mô phỏng mỗi chu kỳ (phút)', v => v >= 0.1 && v <= 5 ? '' : 'Giá trị từ 0,1 đến 5 phút'],
  ['pressureMax', 'number', 'Áp suất tối đa (PSI)', v => v >= 60 && v <= 120 ? '' : 'Giá trị từ 60 đến 120 PSI'],
  ['flowMin', 'number', 'Lưu lượng tối thiểu (GPM)', v => v >= 0 && v <= 1000 ? '' : 'Giá trị từ 0 đến 1.000 GPM'],
  ['flowMax', 'number', 'Lưu lượng tối đa (GPM)', (v, all) => v >= 500 && v <= 5000 ? (v > all.flowMin ? '' : 'Phải lớn hơn lưu lượng tối thiểu') : 'Giá trị từ 500 đến 5.000 GPM'],
  ['moistureMin', 'number', 'Độ ẩm đất tối thiểu (%)', v => v >= 5 && v <= 40 ? '' : 'Giá trị từ 5 đến 40%']
];
function applySettings() {
  $('#club-name').textContent = SETTINGS.clubName;
  DB.sensors.forEach(evalSensor);
  DB.pumps.forEach(p => { if (p.pressure < SETTINGS.pressureMax && !p.anomaly) p.highFlag = false; });
  restartSim(); renderCtxSelects(); renderSysStatus();
}
PAGES.settings = {
  render() {
    const S = SETTINGS;
    const inp = ([k, t, l]) => `<div class="field"><label for="set-${k}">${l}</label><input class="input" id="set-${k}" name="${k}" type="${t}" ${t === 'number' ? 'step="any"' : ''} value="${esc(S[k])}"><div class="field-error"></div></div>`;
    const sw = (k, l, sub) => `<label class="switch"><input type="checkbox" name="${k}" ${S[k] ? 'checked' : ''}><span class="track"></span><span>${l}${sub ? `<span class="cell-sub muted small">${sub}</span>` : ''}</span></label>`;
    const F = k => SET_FIELDS.find(f => f[0] === k);
    $('#page-settings').innerHTML = pageHead('Cài đặt', 'Cấu hình hệ thống, ngưỡng cảnh báo và mô phỏng dữ liệu') + `
      <form id="set-form" novalidate onsubmit="return false"><div class="settings-grid">
        <div class="panel"><div class="panel-head"><h2>Thông tin sân golf</h2></div><div class="panel-body">${inp(F('clubName'))}
          <div class="field"><label>Địa điểm</label><input class="input" value="${esc(CLUB.location)}" disabled></div>
          <div class="field"><label>Múi giờ</label><select class="select" disabled><option>(GMT+07:00) Hà Nội, Bangkok, Jakarta</option></select></div>
          <div class="field"><label>Đơn vị đo</label><select class="select" disabled><option>Lưu lượng GPM · Áp suất PSI · Thể tích m³</option></select></div></div></div>
        <div class="panel"><div class="panel-head"><h2>Mô phỏng dữ liệu</h2><span class="badge b-run">Live Demo</span></div><div class="panel-body">${inp(F('interval'))}${inp(F('simStep'))}
          ${sw('autoDemo', 'Tự động khởi chạy lịch tưới mô phỏng', 'Khi ít hơn 2 chương trình đang chạy, hệ thống sẽ tự khởi động chương trình kế tiếp')}</div></div>
        <div class="panel"><div class="panel-head"><h2>Ngưỡng cảnh báo</h2></div><div class="panel-body">${inp(F('pressureMax'))}<div class="form-grid">${inp(F('flowMin'))}${inp(F('flowMax'))}</div>${inp(F('moistureMin'))}</div></div>
        <div class="panel"><div class="panel-head"><h2>Thông báo</h2></div><div class="panel-body">
          ${sw('notifyCritical', 'Cảnh báo nghiêm trọng', 'Mất kết nối thiết bị, sự cố máy bơm')}${sw('notifyWarning', 'Cảnh báo', 'Áp suất cao, lưu lượng bất thường, độ ẩm thấp')}${sw('notifyInfo', 'Thông tin', 'Lịch tưới bắt đầu / hoàn thành, thiết bị phục hồi')}
          <div class="note-box">${icon('info')}<span>Tất cả thông báo vẫn được lưu trong danh sách chuông thông báo; tùy chọn này chỉ ảnh hưởng tới thông báo bật lên.</span></div></div></div>
      </div>
      <div class="settings-foot"><button class="btn" id="set-reset">${icon('refresh')}Khôi phục mặc định</button><button class="btn btn-primary" id="set-save">${icon('check')}Lưu thay đổi</button></div></form>`;
    const form = $('#set-form');
    form.addEventListener('input', e => { const f = e.target.closest('.field'); if (f) { f.classList.remove('invalid'); const er = f.querySelector('.field-error'); if (er) er.textContent = ''; } });
    $('#set-save').onclick = () => {
      const fd = new FormData(form), vals = {};
      SET_FIELDS.forEach(([k, t]) => { vals[k] = t === 'number' ? parseFloat(String(fd.get(k)).replace(',', '.')) : String(fd.get(k) || ''); });
      let first = null;
      SET_FIELDS.forEach(([k, , , check]) => {
        const v = vals[k], msg = (typeof v === 'number' && isNaN(v)) ? 'Vui lòng nhập số hợp lệ' : check(v, vals);
        const f = $(`[name="${k}"]`, form).closest('.field');
        f.classList.toggle('invalid', !!msg); f.querySelector('.field-error').textContent = msg;
        if (msg && !first) first = $(`[name="${k}"]`, form);
      });
      if (first) { first.focus(); toast('Vui lòng kiểm tra lại các trường được đánh dấu', 'error'); return; }
      Object.assign(SETTINGS, vals, { clubName: vals.clubName.trim() });
      ['autoDemo', 'notifyCritical', 'notifyWarning', 'notifyInfo'].forEach(k => { SETTINGS[k] = !!fd.get(k); });
      applySettings();
      toast('Đã lưu cài đặt hệ thống', 'success');
    };
    $('#set-reset').onclick = async () => {
      if (!await confirmDialog({ title: 'Khôi phục mặc định', message: 'Đặt lại toàn bộ cài đặt về giá trị mặc định của hệ thống?', confirmText: 'Khôi phục', danger: true })) return;
      Object.assign(SETTINGS, DEFAULT_SETTINGS); applySettings(); this.render();
      toast('Đã khôi phục cài đặt mặc định', 'success');
    };
  }
};

/* ================= 23. Khởi động ứng dụng ================= */
let simTimer = null;
function restartSim() { clearInterval(simTimer); simTimer = setInterval(simTick, SETTINGS.interval * 1000); }
(function init() {
  buildData();
  seedSimulation();
  renderCtxSelects();
  renderNotifBadge();
  renderSysStatus();
  tickClock(); setInterval(tickClock, 1000);
  $('#last-updated').textContent = fmtTime(state.lastUpdate);
  restartSim();
  if (!location.hash) history.replaceState(null, '', '#/dashboard');
  onRoute();
})();
