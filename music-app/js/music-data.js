/* =========================================================
   music-data.js
   Sample catalogue for Sóng. All artists, songs and albums are
   fictional. Artwork is generated as SVG so the project ships
   with no copyrighted images, and audio streams from the
   royalty-free SoundHelix demo library.
   Exposed as window.MusicData
   ========================================================= */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  function hashStr(str) {
    let h = 2166136261;
    for (const ch of String(str)) {
      h ^= ch.codePointAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rng(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  const escXml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));
  const svgUri = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const n1 = v => Math.round(v * 10) / 10;

  function shapes(variant, r, seed, c1, c2, accent) {
    let out = '';
    switch (variant) {
      case 'sun': {
        const cy = n1(170 + r() * 30);
        const rad = n1(96 + r() * 26);
        out += `<circle cx="200" cy="${cy}" r="${rad}" fill="${accent}"/>`;
        out += `<clipPath id="c${seed}"><circle cx="200" cy="${cy}" r="${rad}"/></clipPath><g clip-path="url(#c${seed})">`;
        for (let i = 0; i < 6; i++) {
          out += `<rect x="0" y="${n1(cy + 8 + i * 17)}" width="400" height="${n1(3 + i * 2.4)}" fill="${c2}"/>`;
        }
        out += '</g>';
        out += `<rect y="${n1(cy + rad - 6)}" width="400" height="400" fill="${c1}" opacity=".55"/>`;
        break;
      }
      case 'waves': {
        for (let i = 0; i < 6; i++) {
          const y = 140 + i * 44;
          const a = n1(18 + r() * 34);
          out += `<path d="M0 ${y} C 100 ${y - a}, 140 ${y + a}, 200 ${y} S 320 ${y - a}, 400 ${y} V400 H0Z" fill="${accent}" opacity="${n1(0.14 + i * 0.1)}"/>`;
        }
        break;
      }
      case 'rings': {
        const cx = n1(110 + r() * 180);
        const cy = n1(110 + r() * 180);
        for (let i = 1; i <= 8; i++) {
          out += `<circle cx="${cx}" cy="${cy}" r="${i * 32}" fill="none" stroke="${accent}" stroke-width="${10 - i}" opacity="${n1(1 - i * 0.1)}"/>`;
        }
        out += `<circle cx="${cx}" cy="${cy}" r="14" fill="${accent}"/>`;
        break;
      }
      case 'grid': {
        for (let x = 0; x < 8; x++) {
          for (let y = 0; y < 8; y++) {
            out += `<circle cx="${28 + x * 49}" cy="${28 + y * 49}" r="${n1(2 + r() * 13)}" fill="${accent}" opacity="${n1(0.3 + r() * 0.7)}"/>`;
          }
        }
        break;
      }
      case 'bands': {
        out += `<g transform="rotate(${n1(-38 + r() * 18)} 200 200)">`;
        for (let i = -4; i < 10; i++) {
          const odd = Math.abs(i) % 2 === 1;
          out += `<rect x="-300" y="${i * 52}" width="1000" height="${n1(14 + r() * 18)}" fill="${odd ? accent : '#ffffff'}" opacity="${odd ? 0.6 : 0.1}"/>`;
        }
        out += '</g>';
        break;
      }
      case 'blobs':
      default: {
        out += `<g filter="url(#b${seed})">`;
        out += `<circle cx="${n1(120 + r() * 60)}" cy="${n1(120 + r() * 60)}" r="130" fill="${accent}" opacity=".85"/>`;
        out += `<circle cx="${n1(260 + r() * 60)}" cy="${n1(250 + r() * 60)}" r="120" fill="${c1}" opacity=".9"/>`;
        out += `<circle cx="${n1(280 + r() * 40)}" cy="${n1(90 + r() * 40)}" r="70" fill="#ffffff" opacity=".35"/>`;
        out += '</g>';
        out += `<circle cx="200" cy="200" r="${n1(70 + r() * 30)}" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="3"/>`;
      }
    }
    return out;
  }

  function makeCover({ key, colors, variant, label }) {
    const [c1, c2, accent] = colors;
    const seed = hashStr(key) % 100000;
    const r = rng(seed);
    let text = '';
    if (label) {
      // wrap the playlist title onto at most two lines
      const words = label.split(' ');
      const lines = [''];
      words.forEach(w => {
        const cur = lines[lines.length - 1];
        if ((cur + ' ' + w).trim().length > 11 && cur && lines.length < 2) lines.push(w);
        else lines[lines.length - 1] = (cur + ' ' + w).trim();
      });
      const startY = lines.length === 2 ? 312 : 352;
      text = `<rect y="250" width="400" height="150" fill="#000" opacity=".22"/>` + lines.map((l, i) =>
        `<text x="30" y="${startY + i * 44}" font-family="Be Vietnam Pro, Segoe UI, Arial, sans-serif" font-size="40" font-weight="800" fill="#ffffff" letter-spacing="-1">${escXml(l)}</text>`
      ).join('');
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><linearGradient id="g${seed}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><filter id="b${seed}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="34"/></filter></defs><rect width="400" height="400" fill="url(#g${seed})"/>${shapes(variant, r, seed, c1, c2, accent)}${text}</svg>`;
    return svgUri(svg);
  }

  function makeAvatar(name, colors) {
    const [c1, c2, accent] = colors;
    const seed = hashStr(name) % 100000;
    const words = name.split(/\s+/).filter(w => !/^the$/i.test(w));
    const initials = (words[0][0] + (words.length > 1 ? words[words.length - 1][0] : '')).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs><radialGradient id="a${seed}" cx="30%" cy="25%" r="90%"><stop offset="0" stop-color="${accent}"/><stop offset=".45" stop-color="${c2}"/><stop offset="1" stop-color="${c1}"/></radialGradient></defs><rect width="400" height="400" fill="url(#a${seed})"/><circle cx="330" cy="330" r="140" fill="#ffffff" opacity=".08"/><circle cx="60" cy="360" r="90" fill="#000000" opacity=".12"/><text x="200" y="200" text-anchor="middle" dominant-baseline="central" font-family="Be Vietnam Pro, Segoe UI, Arial, sans-serif" font-size="150" font-weight="800" fill="#ffffff" fill-opacity=".94" letter-spacing="-6">${escXml(initials)}</text></svg>`;
    return svgUri(svg);
  }

  /* ---------- artists ---------- */
  const artists = [
    { id: 'luna-rivers', name: 'Luna Rivers', genre: 'Pop', followers: 2480000, colors: ['#2e1065', '#9d174d', '#f9a8d4'],
      bio: 'Singer-songwriter from Melbourne writing glossy synth-pop about night trains, long-distance love and the cities in between.' },
    { id: 'ha-linh', name: 'Hà Linh', genre: 'V-Pop', followers: 1920000, colors: ['#7c2d12', '#ea580c', '#fde68a'],
      bio: 'Giọng ca trong trẻo đến từ Huế, nổi bật với những bản ballad pop mang hơi thở mùa hạ và tuổi trẻ.' },
    { id: 'dong-phong', name: 'Đông Phong', genre: 'Indie', followers: 640000, colors: ['#052e2b', '#0f766e', '#a7f3d0'],
      bio: 'Ban nhạc indie Hà Nội, kể chuyện phố cũ, những con ngõ nhỏ và nỗi nhớ bằng guitar và synth mộc.' },
    { id: 'kai-sato', name: 'Kai Sato', genre: 'Electronic', followers: 1310000, colors: ['#1e1b4b', '#1d4ed8', '#67e8f9'],
      bio: 'Tokyo-born producer blending city-pop samples with club rhythms. Known for high-energy live sets.' },
    { id: 'aria-vale', name: 'Aria Vale', genre: 'R&B', followers: 890000, colors: ['#4c0519', '#be123c', '#fecdd3'],
      bio: 'Soulful vocalist and producer crafting slow-burning R&B with lush harmonies and warm bass.' },
    { id: 'may-trang', name: 'Mây Trắng', genre: 'Lo-fi', followers: 455000, colors: ['#1e293b', '#6d28d9', '#ddd6fe'],
      bio: 'Dự án lo-fi từ Sài Gòn: tiếng mưa, tiếng xe và những giai điệu chill cho buổi sáng cà phê.' },
    { id: 'northern-lights', name: 'The Northern Lights', genre: 'Rock', followers: 1070000, colors: ['#052e16', '#15803d', '#bbf7d0'],
      bio: 'Four-piece alt-rock band from Oslo with wide-open guitars and big, cinematic choruses.' },
    { id: 'bao-khang', name: 'Bảo Khang', genre: 'Ballad', followers: 770000, colors: ['#082f49', '#0369a1', '#fde68a'],
      bio: 'Chàng ca sĩ Đà Nẵng với chất giọng ấm, hát về biển, gió và những chuyến đi xa nhà.' },
  ];

  /* ---------- albums ---------- */
  const albums = [
    { id: 'midnight-postcards', title: 'Midnight Postcards', artistId: 'luna-rivers', year: 2024, genre: 'Pop', variant: 'blobs',
      colors: ['#2e1065', '#db2777', '#fbcfe8'],
      description: 'A dreamy synth-pop diary of late trains, city lights and letters never sent.' },
    { id: 'mua-ha', title: 'Mùa Hạ', artistId: 'ha-linh', year: 2023, genre: 'V-Pop', variant: 'sun',
      colors: ['#9a3412', '#f59e0b', '#fff7cc'],
      description: 'Album thứ hai của Hà Linh: rực nắng, trong veo và đầy kỷ niệm tuổi học trò.' },
    { id: 'ha-noi-ve-dem', title: 'Hà Nội Về Đêm', artistId: 'dong-phong', year: 2021, genre: 'Indie', variant: 'bands',
      colors: ['#022c22', '#115e59', '#fcd34d'],
      description: 'Những bản indie mộc mạc viết trong những đêm lang thang phố cổ.' },
    { id: 'city-pulse', title: 'City Pulse', artistId: 'kai-sato', year: 2024, genre: 'Electronic', variant: 'grid',
      colors: ['#1e1b4b', '#0e7490', '#67e8f9'],
      description: 'Neon-lit club tracks built from field recordings of Tokyo, Seoul and Saigon.' },
    { id: 'paper-moons', title: 'Paper Moons', artistId: 'aria-vale', year: 2022, genre: 'R&B', variant: 'rings',
      colors: ['#3f0a1c', '#be185d', '#fecdd3'],
      description: 'Slow, late-night R&B about the quiet hours after the party ends.' },
    { id: 'sai-gon-mo', title: 'Sài Gòn Mơ', artistId: 'may-trang', year: 2023, genre: 'Lo-fi', variant: 'blobs',
      colors: ['#1e293b', '#7c3aed', '#c4b5fd'],
      description: 'Lo-fi beats cho những buổi chiều mưa Sài Gòn và ly cà phê sữa đá.' },
    { id: 'wildfield', title: 'Wildfield', artistId: 'northern-lights', year: 2020, genre: 'Rock', variant: 'sun',
      colors: ['#052e16', '#166534', '#fde047'],
      description: 'Big-sky rock recorded live in a barn outside Oslo over one snowy week.' },
    { id: 'mien-trung', title: 'Miền Trung Nắng Gió', artistId: 'bao-khang', year: 2024, genre: 'Ballad', variant: 'waves',
      colors: ['#0c4a6e', '#0284c7', '#e0f2fe'],
      description: 'Những bản ballad về biển Đà Nẵng, cát trắng và gió chiều miền Trung.' },
  ];

  /* ---------- songs ----------
     [id, title, artistId, albumId, duration (s), plays, SoundHelix track #]
     Durations are approximate and are corrected from the audio
     file's real metadata the first time each track loads. */
  const AUDIO = n => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;
  const songRows = [
    [1, 'Perfect Night', 'luna-rivers', 'midnight-postcards', 372, 48210331, 1],
    [2, 'Mưa Tháng Sáu', 'ha-linh', 'mua-ha', 425, 39120442, 2],
    [3, 'Phố Cũ', 'dong-phong', 'ha-noi-ve-dem', 344, 12840551, 3],
    [4, 'Neon Hearts', 'kai-sato', 'city-pulse', 302, 27410093, 4],
    [5, 'Chạm Vào Nắng', 'ha-linh', 'mua-ha', 353, 33500210, 5],
    [6, 'Amber Hour', 'aria-vale', 'paper-moons', 325, 21980034, 6],
    [7, 'Đêm Sài Gòn', 'may-trang', 'sai-gon-mo', 426, 9870112, 7],
    [8, 'Perfectly Lost', 'northern-lights', 'wildfield', 305, 18230990, 8],
    [9, 'Stardust Avenue', 'luna-rivers', 'midnight-postcards', 300, 30110477, 9],
    [10, 'Gió Biển', 'bao-khang', 'mien-trung', 336, 15670321, 10],
    [11, 'Low Tide', 'aria-vale', 'paper-moons', 313, 11450876, 11],
    [12, 'Sóng Vỗ Bờ Xa', 'bao-khang', 'mien-trung', 357, 8930445, 12],
    [13, 'Overdrive', 'kai-sato', 'city-pulse', 274, 24400120, 13],
    [14, 'Café Sáng', 'may-trang', 'sai-gon-mo', 310, 13210567, 14],
    [15, 'Echoes in the Pines', 'northern-lights', 'wildfield', 328, 10020389, 15],
    [16, 'Ngày Mai Trời Lại Sáng', 'dong-phong', 'ha-noi-ve-dem', 237, 16780214, 16],
  ];

  /* ---------- editorial playlists ---------- */
  const featuredPlaylists = [
    { id: 'chill-vibes', title: 'Chill Vibes', description: 'Mellow grooves to slow the day down.',
      songIds: [7, 14, 11, 6, 3, 12], colors: ['#0f172a', '#4f46e5', '#a5b4fc'], variant: 'blobs' },
    { id: 'vpop-hom-nay', title: 'V-Pop Hôm Nay', description: 'Những bản hit Việt đang được nghe nhiều nhất.',
      songIds: [2, 5, 10, 16, 3, 12], colors: ['#7c2d12', '#f97316', '#fed7aa'], variant: 'sun' },
    { id: 'workout-energy', title: 'Workout Energy', description: 'High-tempo tracks to push through the last set.',
      songIds: [13, 4, 8, 1, 15, 9], colors: ['#450a0a', '#dc2626', '#fecaca'], variant: 'bands' },
    { id: 'late-night-drive', title: 'Late Night Drive', description: 'Neon highways and synth-soaked roads.',
      songIds: [4, 1, 9, 13, 6, 11], colors: ['#020617', '#7c3aed', '#f0abfc'], variant: 'grid' },
    { id: 'ca-phe-cuoi-tuan', title: 'Cà Phê Cuối Tuần', description: 'Lo-fi và acoustic cho buổi sáng thong thả.',
      songIds: [14, 7, 3, 16, 11, 5], colors: ['#3b2415', '#b45309', '#fde68a'], variant: 'rings' },
    { id: 'focus-flow', title: 'Focus Flow', description: 'Steady, mostly instrumental tracks for deep work.',
      songIds: [15, 12, 10, 7, 14, 4], colors: ['#042f2e', '#0d9488', '#99f6e4'], variant: 'waves' },
  ];

  /* ---------- starter user playlists (copied to localStorage on first run) ---------- */
  const seedPlaylists = [
    { id: 'u-my-mix', name: 'My Mix', songIds: [1, 2, 4, 6], colors: ['#1e3a8a', '#f2b544'], createdAt: 1 },
    { id: 'u-road-trip', name: 'Road Trip', songIds: [8, 13, 9, 10, 15], colors: ['#14532d', '#84cc16'], createdAt: 2 },
    { id: 'u-hoc-bai', name: 'Học Bài', songIds: [14, 7, 12], colors: ['#4c1d95', '#f472b6'], createdAt: 3 },
  ];

  /* ---------- build derived fields ---------- */
  artists.forEach(a => { a.image = makeAvatar(a.name, a.colors); });
  const artistMap = new Map(artists.map(a => [a.id, a]));

  albums.forEach(al => {
    al.artist = artistMap.get(al.artistId).name;
    al.cover = makeCover({ key: al.id, colors: al.colors, variant: al.variant });
  });
  const albumMap = new Map(albums.map(a => [a.id, a]));

  const songs = songRows.map(([id, title, artistId, albumId, duration, plays, n]) => {
    const album = albumMap.get(albumId);
    return {
      id, title, artistId, albumId, duration, plays,
      artist: artistMap.get(artistId).name,
      album: album.title,
      genre: album.genre,
      year: album.year,
      cover: album.cover,
      audio: AUDIO(n),
    };
  });
  const songMap = new Map(songs.map(s => [s.id, s]));

  featuredPlaylists.forEach(p => {
    p.cover = makeCover({ key: p.id, colors: p.colors, variant: p.variant, label: p.title });
  });
  const playlistMap = new Map(featuredPlaylists.map(p => [p.id, p]));

  const genreColors = {
    'V-Pop': ['#c2410c', '#f59e0b'], Pop: ['#9d174d', '#6d28d9'], Indie: ['#115e59', '#65a30d'],
    Electronic: ['#1d4ed8', '#0891b2'], 'R&B': ['#9f1239', '#c026d3'], 'Lo-fi': ['#4338ca', '#64748b'],
    Rock: ['#166534', '#a16207'], Ballad: ['#0369a1', '#0d9488'],
  };
  const genres = Object.keys(genreColors).map(name => ({
    name,
    colors: genreColors[name],
    cover: (albums.find(a => a.genre === name) || albums[0]).cover,
  }));

  /* ---------- lookup + formatting utilities ---------- */
  function normalize(str) {
    return String(str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D')
      .toLowerCase()
      .trim();
  }

  function formatTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '0:00';
    sec = Math.floor(sec);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = String(sec % 60).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
  }

  function formatLong(sec) {
    const m = Math.round(sec / 60);
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} hr ${m % 60} min`;
  }

  const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
  const formatCount = n => compact.format(n);

  window.MusicData = {
    songs, artists, albums, featuredPlaylists, seedPlaylists, genres,
    hero: { albumId: 'midnight-postcards' },
    getSong: id => songMap.get(Number(id)) || null,
    getArtist: id => artistMap.get(id) || null,
    getAlbum: id => albumMap.get(id) || null,
    getFeaturedPlaylist: id => playlistMap.get(id) || null,
    songsByAlbum: id => songs.filter(s => s.albumId === id),
    songsByArtist: id => songs.filter(s => s.artistId === id).sort((a, b) => b.plays - a.plays),
    albumsByArtist: id => albums.filter(a => a.artistId === id),
    trending: (n = 10) => songs.slice().sort((a, b) => b.plays - a.plays).slice(0, n),
    normalize, formatTime, formatLong, formatCount,
  };
})();
