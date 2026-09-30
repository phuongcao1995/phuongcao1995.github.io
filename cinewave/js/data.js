/* CineWave — data.js
   Fictional catalogue (50 titles) + generated artwork. Nothing here is copyrighted:
   titles, people and plots are invented; posters/backdrops are SVG data-URIs drawn at runtime. */
const DATA = (() => {
  const GENRES = ["Action", "Adventure", "Animation", "Comedy", "Crime", "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi", "Thriller", "Documentary", "Family"];
  const REGION = { Vietnam: "Vietnam", "South Korea": "South Korea", China: "China", Japan: "Japan", US: "US" };

  /* [title, Vietnamese title, type, year, minutes (episode length for series), rating, genres, country, quality (4=HD+4K), age, seasons] */
  const RAW = [
    ["The Last Journey", "Chuyến Đi Cuối Cùng", "movie", 2026, 124, 8.4, "Action/Drama", "Vietnam", 4, "13+"],
    ["Saigon Midnight", "Sài Gòn Nửa Đêm", "movie", 2025, 112, 7.9, "Crime/Thriller", "Vietnam", 4, "18+"],
    ["Monsoon Hearts", "Mùa Mưa Yêu Thương", "series", 2026, 45, 8.1, "Romance/Drama", "Vietnam", 0, "13+", 2],
    ["The Lantern Village", "Làng Đèn Lồng", "movie", 2024, 98, 7.6, "Fantasy/Family", "Vietnam", 0, "7+"],
    ["Cloud Pass", "Đèo Mây", "movie", 2025, 105, 7.4, "Adventure/Drama", "Vietnam", 0, "13+"],
    ["Bamboo Kingdom", "Vương Quốc Tre", "movie", 2025, 92, 8.0, "Animation/Family", "Vietnam", 4, "All"],
    ["Hanoi Rewind", "Hà Nội Ngược Dòng", "series", 2025, 50, 8.3, "Drama/Thriller", "Vietnam", 4, "16+", 2],
    ["Wedding Season Chaos", "Mùa Cưới Rộn Ràng", "movie", 2026, 101, 7.1, "Comedy/Romance", "Vietnam", 0, "13+"],
    ["Ghost of Lotus Lane", "Bóng Ma Ngõ Sen", "movie", 2025, 96, 6.9, "Horror/Thriller", "Vietnam", 0, "18+"],
    ["Little Dragon Academy", "Học Viện Rồng Nhỏ", "series", 2026, 24, 8.2, "Animation/Family", "Vietnam", 4, "All", 2],
    ["Seoul Signal", "Tín Hiệu Seoul", "movie", 2026, 118, 8.0, "Thriller/Crime", "South Korea", 4, "16+"],
    ["Spring in Busan", "Mùa Xuân Ở Busan", "series", 2025, 60, 8.5, "Romance/Drama", "South Korea", 4, "13+", 2],
    ["Neon Blade Academy", "Học Viện Kiếm Neon", "series", 2026, 55, 7.8, "Action/Fantasy", "South Korea", 4, "16+", 1],
    ["The Quiet Bakery", "Tiệm Bánh Yên Tĩnh", "movie", 2024, 109, 7.7, "Drama/Family", "South Korea", 0, "7+"],
    ["Midnight Subway", "Chuyến Tàu Nửa Đêm", "movie", 2025, 94, 7.0, "Horror", "South Korea", 0, "18+"],
    ["Hanbok Heist", "Phi Vụ Hanbok", "movie", 2026, 115, 7.5, "Comedy/Crime", "South Korea", 4, "13+"],
    ["Star Crown", "Vương Miện Sao", "series", 2025, 65, 8.4, "Fantasy/Romance", "South Korea", 4, "13+", 2],
    ["Jade Emperor's Road", "Con Đường Ngọc Đế", "series", 2025, 48, 8.2, "Fantasy/Adventure", "China", 4, "13+", 2],
    ["Shadow of the Silk River", "Bóng Trên Sông Tơ", "movie", 2024, 132, 7.9, "Action/Adventure", "China", 4, "13+"],
    ["Moonlit Dumplings", "Sủi Cảo Dưới Trăng", "movie", 2025, 100, 7.3, "Comedy/Family", "China", 0, "7+"],
    ["Crimson Wuxia", "Huyết Kiếm Giang Hồ", "movie", 2026, 127, 8.1, "Action/Fantasy", "China", 4, "16+"],
    ["Chengdu Nights", "Đêm Thành Đô", "series", 2025, 42, 7.6, "Crime/Drama", "China", 0, "16+", 1],
    ["The Paper Kite", "Cánh Diều Giấy", "movie", 2025, 88, 8.3, "Animation/Fantasy", "China", 4, "All"],
    ["Sakura Protocol", "Giao Thức Sakura", "series", 2026, 47, 8.0, "Sci-Fi/Thriller", "Japan", 4, "16+", 1],
    ["Ramen at the End of the World", "Tô Mì Cuối Thế Giới", "movie", 2025, 104, 8.2, "Comedy/Drama", "Japan", 0, "13+"],
    ["Tokyo Tide", "Triều Tokyo", "movie", 2024, 116, 7.5, "Romance/Drama", "Japan", 0, "13+"],
    ["Kitsune Tales", "Truyện Hồ Ly", "series", 2025, 24, 8.6, "Animation/Fantasy", "Japan", 4, "7+", 2],
    ["Iron Samurai 2099", "Samurai Thép 2099", "movie", 2026, 130, 7.8, "Sci-Fi/Action", "Japan", 4, "16+"],
    ["Ghost Train to Kyoto", "Tàu Ma Đến Kyoto", "movie", 2024, 91, 6.8, "Horror/Thriller", "Japan", 0, "18+"],
    ["Orbit Zero", "Quỹ Đạo Không", "movie", 2026, 138, 8.7, "Sci-Fi/Adventure", "US", 4, "13+"],
    ["Desert Highway", "Xa Lộ Sa Mạc", "movie", 2025, 110, 7.4, "Action/Crime", "US", 4, "16+"],
    ["The Signal Room", "Căn Phòng Tín Hiệu", "series", 2026, 52, 8.5, "Sci-Fi/Thriller", "US", 4, "16+", 3],
    ["Laugh Track", "Tiếng Cười Thu Sẵn", "series", 2025, 30, 7.7, "Comedy", "US", 0, "13+", 3],
    ["Ocean Deep", "Đại Dương Sâu Thẳm", "movie", 2025, 86, 8.4, "Documentary/Adventure", "US", 4, "All"],
    ["Captain Comet & Friends", "Đội Trưởng Sao Chổi", "movie", 2024, 84, 7.9, "Animation/Family", "US", 0, "All"],
    ["Backstage Blues", "Hậu Trường Xanh", "movie", 2024, 121, 7.6, "Drama/Romance", "US", 0, "13+"],
    ["Night Shift Diner", "Quán Ăn Ca Đêm", "series", 2025, 38, 7.4, "Horror/Comedy", "US", 0, "16+", 2],
    ["Crimson Harbor", "Cảng Đỏ", "series", 2025, 54, 8.0, "Crime/Drama", "US", 4, "18+", 2],
    ["Wild Wonders", "Kỳ Quan Hoang Dã", "series", 2025, 40, 8.3, "Documentary/Family", "US", 4, "All", 2],
    ["Space Cadets Club", "Câu Lạc Bộ Phi Hành Gia Nhí", "series", 2026, 22, 7.8, "Animation/Sci-Fi", "US", 0, "7+", 2],
    ["Nordic Ice", "Băng Giá Bắc Âu", "series", 2025, 50, 8.3, "Crime/Thriller", "Sweden", 4, "16+", 2],
    ["The Lavender Manor", "Biệt Thự Oải Hương", "movie", 2024, 112, 7.5, "Romance/Drama", "France", 0, "13+"],
    ["Berlin Underground", "Berlin Ngầm", "movie", 2026, 119, 7.9, "Thriller/Crime", "Germany", 4, "16+"],
    ["Castle of Whispers", "Lâu Đài Thì Thầm", "series", 2025, 55, 8.0, "Fantasy/Horror", "UK", 4, "16+", 2],
    ["Tuscan Summer", "Mùa Hè Tuscany", "movie", 2025, 103, 7.2, "Romance/Comedy", "Italy", 0, "13+"],
    ["Madrid Rooftops", "Những Mái Nhà Madrid", "series", 2025, 46, 7.8, "Drama/Crime", "Spain", 0, "13+", 2],
    ["The Little Lighthouse", "Ngọn Hải Đăng Nhỏ", "movie", 2025, 82, 8.1, "Animation/Family", "Ireland", 0, "All"],
    ["Iceland Odyssey", "Hành Trình Iceland", "movie", 2024, 94, 8.0, "Documentary/Adventure", "Iceland", 4, "All"],
    ["Baker Street Ghosts", "Bóng Ma Phố Baker", "series", 2025, 40, 7.9, "Comedy/Crime", "UK", 0, "13+", 2],
    ["Alpine Rescue", "Giải Cứu Trên Alps", "movie", 2026, 107, 7.6, "Action/Adventure", "Switzerland", 4, "13+"],
    ["Tet Reunion", "Đoàn Viên Ngày Tết", "movie", 2026, 99, 7.8, "Family/Comedy", "Vietnam", 0, "All"],
    ["Blue Lotus Detective", "Thám Tử Sen Xanh", "series", 2026, 46, 7.7, "Crime/Drama", "Vietnam", 4, "13+", 1],
  ];

  const NAMES = {
    Vietnam: [["Minh Anh", "Thu Hà", "Quốc Bảo", "Hải Yến", "Gia Huy", "Ngọc Lan", "Tuấn Kiệt", "Bảo Trân", "Đức Anh", "Khánh Linh"], ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Vũ", "Đặng", "Bùi"]],
    "South Korea": [["Ji-woo", "Min-seo", "Hyun-woo", "Seo-yeon", "Do-yoon", "Ha-eun", "Joon-ho", "Yu-na"], ["Kim", "Lee", "Park", "Choi", "Jung", "Kang"]],
    China: [["Wei", "Xiu Ying", "Jun Jie", "Mei Lin", "Hao Ran", "Yu Xuan", "Bo Wen", "Li Na"], ["Li", "Wang", "Zhang", "Chen", "Liu", "Zhao"]],
    Japan: [["Haruto", "Yui", "Ren", "Sakura", "Kaito", "Hina", "Sota", "Aoi"], ["Sato", "Tanaka", "Suzuki", "Takahashi", "Ito", "Watanabe"]],
    US: [["Jordan", "Avery", "Riley", "Morgan", "Casey", "Taylor", "Quinn", "Elliot", "Dana", "Rowan"], ["Hale", "Brooks", "Bennett", "Carter", "Monroe", "Ellison", "Vance", "Whitaker"]],
    EU: [["Lukas", "Elena", "Mathis", "Sofia", "Anders", "Ingrid", "Matteo", "Clara", "Oskar", "Lena"], ["Lindqvist", "Moreau", "Keller", "Rossi", "Navarro", "Dubois", "Novak", "Larsen"]],
  };
  const PLACES = {
    Vietnam: ["Saigon", "Hanoi", "Da Nang", "Hoi An"], "South Korea": ["Seoul", "Busan", "Jeju"], China: ["Chengdu", "Shanghai", "Xi'an"],
    Japan: ["Tokyo", "Kyoto", "Osaka"], US: ["Los Angeles", "Nevada", "Chicago"], Sweden: ["Stockholm"], France: ["Provence"], Germany: ["Berlin"],
    UK: ["London", "Edinburgh"], Italy: ["Tuscany"], Spain: ["Madrid"], Ireland: ["the Irish coast"], Iceland: ["Reykjavík"], Switzerland: ["the Alps"],
  };
  const LANG = { Vietnam: "Vietnamese", "South Korea": "Korean", China: "Mandarin", Japan: "Japanese", US: "English", Sweden: "Swedish", France: "French", Germany: "German", UK: "English", Italy: "Italian", Spain: "Spanish", Ireland: "English", Iceland: "Icelandic", Switzerland: "German" };
  const LINES = {
    Action: "A disgraced courier has one night to cross {p}, outrun old rivals and deliver the one package that could change everything.",
    Adventure: "Armed with a torn map and an unlikely crew, a young explorer sets out across {p} in search of a place nobody believes exists.",
    Animation: "In a hand-drawn world above {p}, a curious little hero discovers that the smallest voice can move the biggest mountain.",
    Comedy: "When a simple plan in {p} spirals out of control, an ordinary family finds out how far they will go for one perfect day.",
    Crime: "A tired detective in {p} follows a trail of small lies to a truth that reaches far higher than anyone dared to look.",
    Drama: "Three generations gather in {p} for one last season and must decide what to keep, what to forgive and what to let go.",
    Fantasy: "Beyond the mist of {p} an old kingdom is waking, and a reluctant heir must choose between the crown and the people.",
    Horror: "Locals in {p} never talk about the night the lights went out — until a newcomer starts asking the wrong questions.",
    Romance: "Two strangers keep missing each other across {p}, until one rainy evening a lost umbrella changes both their stories.",
    "Sci-Fi": "Decades after first contact, a small crew in {p} receives a message that was never meant for humans.",
    Thriller: "A quiet witness in {p} realises the whole city is watching — and only has until sunrise to prove she is telling the truth.",
    Documentary: "Filmed over three years, this journey through {p} reveals the fragile beauty of a world we rarely stop to see.",
    Family: "A warm, funny tale about home, courage and the people who show up for us — set in the heart of {p}.",
  };
  const EP_TITLES = ["The Beginning", "The Journey", "The Secret", "The Return", "The Choice", "The Storm", "The Reveal", "The Finale"];
  /* Open-licence sample clips (Blender Foundation CC-BY, MDN CC0). The player tries each in turn and falls back to simulated playback. */
  const VIDEOS = [
    "https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4",
  ];
  const TIER_RANK = { free: 0, standard: 1, premium: 2 };

  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const pick = (arr, seed, n = 0) => arr[(seed + n * 7) % arr.length];
  const person = (region, seed, n) => { const [g, f] = NAMES[region]; const first = pick(g, seed, n), last = pick(f, seed >>> 3, n + 1); return region === "Vietnam" ? `${last} ${first}` : `${first} ${last}`; };
  const regionOf = (c) => (NAMES[c] ? c : "EU");
  const ageNum = (a) => (a === "All" ? 0 : parseInt(a, 10));

  /* admin-added titles and edits are kept in localStorage (see admin.js) */
  const custom = Store.get("custom", []), edits = Store.get("edits", {});
  const ENTRIES = RAW.map((raw, i) => ({ id: i + 1, raw })).concat(custom);
  const movies = ENTRIES.map(({ id, raw: r }) => {
    const i = id;
    const [title, vi, type, year, duration, rating, g, country, q, age, seasons] = r;
    const h = hash(title), reg = regionOf(country), genres = g.split("/");
    const place = pick(PLACES[country] || [country], h);
    const second = genres[1] ? ` A story of ${genres[1].toLowerCase()}, ${["loyalty", "memory", "courage", "secrets", "home"][h % 5]} and second chances.` : "";
    const cast = [0, 1, 2, 3, 4].map((n) => person(reg, h >>> n, n * 3 + 1));
    const tier = q === 4 && rating >= 8.5 ? "premium" : (year === 2026 || id % 2 === 0) ? "standard" : "free";
    const lang = LANG[country] || "English";
    const base = {
      id, title, originalTitle: country === "Vietnam" ? vi : title, viTitle: vi, type, year, duration, rating, genres, country,
      region: REGION[country] || "Europe", quality: q === 4 ? ["HD", "4K"] : ["HD"], ageRating: age, tier,
      director: person(reg, h >>> 5, 11), cast, hue: h % 360, seasons: seasons || 0,
      episodesPerSeason: seasons ? 6 : 0,
      audio: lang === "Vietnamese" ? ["Vietnamese"] : [lang, "Vietnamese (dub)"], subtitles: ["Vietnamese", "English"],
      description: LINES[genres[0]].replace("{p}", place) + second,
      trend: Math.round(rating * 10 + (year - 2020) * 4 + (h % 25)),
      addedDaysAgo: (2026 - year) * 120 + (h % 100),
      trailer: VIDEOS[(i + 1) % 3], video: VIDEOS[i % 3], custom: id >= 1000,
    };
    return Object.assign(base, edits[id] || {});
  });
  const byId = new Map(movies.map((m) => [m.id, m]));

  /* ---------- generated artwork ---------- */
  const cache = new Map();
  const xml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const uri = (svg) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  function wrap(text, max) {
    const lines = []; let cur = "";
    text.split(" ").forEach((w) => { if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim(); });
    if (cur) lines.push(cur);
    return lines.slice(0, 4);
  }
  function shapes(m, W, H) {
    const a = m.hue, b = (m.hue + 50 + (m.id * 17) % 60) % 360, v = m.id % 3, s = W / 300;
    let out = `<circle cx="${W * 0.78}" cy="${H * 0.26}" r="${W * 0.3}" fill="hsl(${b} 85% 62%)" opacity=".28"/><circle cx="${W * 0.16}" cy="${H * 0.55}" r="${W * 0.4}" fill="hsl(${a} 85% 66%)" opacity=".14"/>`;
    if (v === 1) out += `<path d="M${W * 0.5} ${H * 0.1} L${W * 0.9} ${H * 0.4} L${W * 0.5} ${H * 0.7} L${W * 0.1} ${H * 0.4}Z" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="${3 * s}"/>`;
    else if (v === 2) for (let i = 0; i < 7; i++) out += `<rect x="${W * (0.08 + i * 0.13)}" y="${H * 0.08}" width="${W * 0.05}" height="${H * (0.2 + ((i * 37 + m.id) % 30) / 100)}" rx="${W * 0.025}" fill="#fff" opacity=".14"/>`;
    else out += `<circle cx="${W * 0.5}" cy="${H * 0.36}" r="${W * 0.22}" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="${3 * s}"/><circle cx="${W * 0.5}" cy="${H * 0.36}" r="${W * 0.12}" fill="#fff" opacity=".12"/>`;
    return out + `<path d="M0 ${H * 0.62} Q${W * 0.25} ${H * 0.55} ${W * 0.5} ${H * 0.62} T${W} ${H * 0.62} V${H} H0Z" fill="#000" opacity=".22"/>`;
  }
  function svg(m, W, H, inner) {
    const a = m.hue, b = (m.hue + 50 + (m.id * 17) % 60) % 360;
    return uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${a} 68% 40%)"/><stop offset="1" stop-color="hsl(${b} 72% 15%)"/></linearGradient><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset=".4" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${shapes(m, W, H)}${inner}</svg>`);
  }
  const FONT = "Segoe UI,Arial,sans-serif";
  const poster = (m) => {
    const k = "p" + m.id;
    if (!cache.has(k)) {
      const lines = wrap(m.title.toUpperCase(), 13);
      const t = lines.map((l, i) => `<text x="24" y="${372 - (lines.length - 1 - i) * 34}" font-family="${FONT}" font-weight="800" font-size="30" fill="#fff">${xml(l)}</text>`).join("");
      cache.set(k, svg(m, 300, 450, `<rect width="300" height="450" fill="url(#f)"/><text x="24" y="${372 - lines.length * 34 - 4}" font-family="${FONT}" font-size="13" letter-spacing="3" fill="#fff" opacity=".8">${xml(m.genres[0].toUpperCase() + " · " + m.year)}</text>${t}<text x="24" y="424" font-family="${FONT}" font-size="12" letter-spacing="4" fill="#fff" opacity=".55">CINEWAVE</text>`));
    }
    return cache.get(k);
  };
  const backdrop = (m) => {
    const k = "b" + m.id;
    if (!cache.has(k)) {
      let bokeh = "";
      for (let i = 0; i < 16; i++) { const h = hash(m.title + i); bokeh += `<circle cx="${h % 1280}" cy="${(h >>> 8) % 520}" r="${6 + (h >>> 4) % 26}" fill="#fff" opacity="${0.04 + (h % 9) / 100}"/>`; }
      cache.set(k, svg(m, 1280, 720, `${bokeh}<rect width="1280" height="720" fill="url(#f)"/>`));
    }
    return cache.get(k);
  };
  const thumb = (m, n) => {
    const k = `t${m.id}-${n}`;
    if (!cache.has(k)) cache.set(k, svg({ ...m, id: m.id + n }, 320, 180, `<rect width="320" height="180" fill="url(#f)"/><text x="16" y="160" font-family="${FONT}" font-weight="800" font-size="34" fill="#fff" opacity=".9">${n}</text>`));
    return cache.get(k);
  };

  /* ---------- helpers ---------- */
  function episodes(m, season) {
    if (m.type !== "series") return [];
    return Array.from({ length: m.episodesPerSeason }, (_, i) => {
      const n = i + 1, t = EP_TITLES[(i + (season - 1) * 2) % EP_TITLES.length];
      return {
        n, season, title: t, duration: m.duration + ((n * 3 + season) % 7) - 3, thumb: thumb(m, n + (season - 1) * 10),
        description: `${m.title} · Season ${season}, episode ${n}: ${t.replace("The ", "the ").toLowerCase()} unfolds as old secrets come to light.`,
      };
    });
  }

  return { GENRES, videos: VIDEOS, movies, byId, poster, backdrop, thumb, episodes, ageNum, TIER_RANK, hash };
})();
