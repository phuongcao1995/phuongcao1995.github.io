/* =========================================================
   app.js
   Application controller: state, hash router, views, event
   delegation, dialogs, menus and player UI bindings.
   Depends on: MusicData, AppStorage, MusicPlayer, Components
   ========================================================= */
(function () {
  'use strict';

  const D = window.MusicData;
  const S = window.AppStorage;
  const C = window.Components;
  const { esc, icon } = C;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const validSong = id => !!D.getSong(id);
  const parseIds = str => String(str || '').split(',').map(Number).filter(validSong);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const go = hash => { if (location.hash === hash) render(); else location.hash = hash; };

  /* =====================================================
     State
     ===================================================== */
  const cachedDurations = S.get(S.KEYS.durations, {}) || {};
  D.songs.forEach(s => {
    const d = cachedDurations[s.id];
    if (Number.isFinite(d) && d > 0) s.duration = d;
  });

  function loadPlaylists() {
    const saved = S.get(S.KEYS.playlists, null);
    if (!Array.isArray(saved)) {
      const seed = D.seedPlaylists.map(p => ({ ...p, songIds: p.songIds.slice() }));
      S.set(S.KEYS.playlists, seed);
      return seed;
    }
    return saved
      .filter(p => p && typeof p.id === 'string' && typeof p.name === 'string')
      .map(p => ({ ...p, songIds: Array.isArray(p.songIds) ? p.songIds.filter(validSong) : [] }));
  }

  const loadIdList = key => {
    const v = S.get(key, []);
    return Array.isArray(v) ? v.filter(validSong) : [];
  };

  const state = {
    favorites: new Set(loadIdList(S.KEYS.favorites)),
    playlists: loadPlaylists(),
    recent: loadIdList(S.KEYS.recent),
    theme: S.get(S.KEYS.theme, 'dark') === 'light' ? 'light' : 'dark',
    discoverGenre: 'All',
    queueOpen: false,
  };

  const persistFavorites = () => S.set(S.KEYS.favorites, [...state.favorites]);
  const persistPlaylists = () => S.set(S.KEYS.playlists, state.playlists);
  const persistRecent = () => S.set(S.KEYS.recent, state.recent);

  C.init({ isLiked: id => state.favorites.has(id) });

  const player = new window.MusicPlayer($('#audio'), id => D.getSong(id));
  const searchInput = $('#search-input');

  /* =====================================================
     Playlists
     ===================================================== */
  const PALETTES = [
    ['#1e3a8a', '#f2b544'], ['#14532d', '#84cc16'], ['#4c1d95', '#f472b6'],
    ['#7c2d12', '#fb923c'], ['#0c4a6e', '#22d3ee'], ['#831843', '#fda4af'],
  ];

  const userView = p => ({ id: p.id, title: p.name, description: '', songIds: p.songIds, isUser: true, colors: p.colors });
  const featuredView = p => ({ id: p.id, title: p.title, description: p.description, songIds: p.songIds, isUser: false, cover: p.cover, colors: p.colors });

  function getPlaylist(id) {
    const u = state.playlists.find(p => p.id === id);
    if (u) return userView(u);
    const f = D.getFeaturedPlaylist(id);
    return f ? featuredView(f) : null;
  }

  function createPlaylist(name, songIds = []) {
    const pl = {
      id: 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.slice(0, 40),
      songIds: [...new Set(songIds.filter(validSong))],
      colors: PALETTES[state.playlists.length % PALETTES.length],
      createdAt: Date.now(),
    };
    state.playlists.push(pl);
    persistPlaylists();
    renderSidebarPlaylists();
    return pl;
  }

  function addToPlaylist(pid, ids) {
    const pl = state.playlists.find(p => p.id === pid);
    if (!pl) return;
    let added = 0;
    ids.forEach(id => { if (!pl.songIds.includes(id)) { pl.songIds.push(id); added++; } });
    persistPlaylists();
    renderSidebarPlaylists();
    if (currentRoute.path === `/playlist/${pid}` || currentRoute.nav === 'library' || currentRoute.nav === 'playlists') render();
    if (!added) toast(`Already in “${pl.name}”`);
    else toast(ids.length === 1 ? `Added to “${pl.name}”` : `Added ${plural(added, 'song')} to “${pl.name}”`);
  }

  function removeFromPlaylist(pid, songId) {
    const pl = state.playlists.find(p => p.id === pid);
    if (!pl) return;
    pl.songIds = pl.songIds.filter(id => id !== songId);
    persistPlaylists();
    renderSidebarPlaylists();
    if (currentRoute.path === `/playlist/${pid}`) render();
    toast(`Removed from “${pl.name}”`);
  }

  async function promptCreatePlaylist(songIds = []) {
    const name = await askName({ title: 'Create playlist', confirm: 'Create', value: `My Playlist #${state.playlists.length + 1}` });
    if (!name) return null;
    const pl = createPlaylist(name, songIds);
    toast(songIds.length ? `Created “${pl.name}” with ${plural(pl.songIds.length, 'song')}` : `Created “${pl.name}”`);
    return pl;
  }

  async function promptRenamePlaylist(pid) {
    const pl = state.playlists.find(p => p.id === pid);
    if (!pl) return;
    const name = await askName({ title: 'Rename playlist', confirm: 'Save', value: pl.name });
    if (!name || name === pl.name) return;
    pl.name = name.slice(0, 40);
    persistPlaylists();
    renderSidebarPlaylists();
    render();
    toast('Playlist renamed');
  }

  async function promptDeletePlaylist(pid) {
    const pl = state.playlists.find(p => p.id === pid);
    if (!pl) return;
    const ok = await confirmDialog({
      title: 'Delete playlist?',
      message: `“${pl.name}” will be removed from your library. The songs stay in the catalogue.`,
      confirm: 'Delete',
    });
    if (!ok) return;
    state.playlists = state.playlists.filter(p => p.id !== pid);
    persistPlaylists();
    renderSidebarPlaylists();
    toast(`Deleted “${pl.name}”`);
    if (currentRoute.path === `/playlist/${pid}`) go('#/library');
    else render();
  }

  /* =====================================================
     Favorites & recently played
     ===================================================== */
  function toggleLike(id) {
    const song = D.getSong(id);
    if (!song) return;
    const liked = !state.favorites.has(id);
    if (liked) state.favorites.add(id); else state.favorites.delete(id);
    persistFavorites();
    $$(`[data-like-id="${id}"]`).forEach(btn => {
      btn.setAttribute('aria-pressed', String(liked));
      btn.classList.remove('pop');
      void btn.offsetWidth;
      if (liked) btn.classList.add('pop');
    });
    updateCounts();
    refreshLive(['favorites-list', 'favorites-count', 'liked-meta']);
    toast(liked ? 'Added to Favorites' : 'Removed from Favorites');
  }

  function addRecent(id) {
    state.recent = [id, ...state.recent.filter(x => x !== id)].slice(0, 24);
    persistRecent();
    refreshLive(['recent-cards', 'recent-list']);
  }

  function updateCounts() {
    $$('[data-count="favorites"]').forEach(el => { el.textContent = state.favorites.size || ''; });
  }

  /* =====================================================
     Playback helpers
     ===================================================== */
  function collectionIds(type, id) {
    switch (type) {
      case 'album': return D.songsByAlbum(id).map(s => s.id);
      case 'artist': return D.songsByArtist(id).map(s => s.id);
      case 'playlist': { const p = getPlaylist(id); return p ? p.songIds.slice() : []; }
      case 'favorites': return [...state.favorites].reverse();
      case 'recent': return state.recent.slice();
      case 'chart': return D.trending(10).map(s => s.id);
      default: return [];
    }
  }

  function playCollection(type, id, { shuffle = false } = {}) {
    const key = `${type}:${id}`;
    if (!shuffle && player.sourceKey === key && player.current) { player.toggle(); return; }
    const ids = collectionIds(type, id);
    if (!ids.length) { toast('Nothing to play here yet'); return; }
    let start = 0;
    if (shuffle) {
      player.setShuffle(true);
      start = Math.floor(Math.random() * ids.length);
    }
    player.setQueue(ids, start, { autoplay: true, source: key });
  }

  function playSongFromEl(el) {
    const holder = el.closest('[data-song-id]');
    const id = Number(el.dataset.id || (holder && holder.dataset.songId));
    if (!validSong(id)) return;
    const cur = player.current;
    if (cur && cur.id === id) { player.toggle(); return; }
    const list = el.closest('[data-queue]');
    const ids = list ? parseIds(list.dataset.queue) : [id];
    const idx = Math.max(0, ids.indexOf(id));
    player.setQueue(ids.length ? ids : [id], idx, { autoplay: true, source: (list && list.dataset.source) || null });
  }

  /* =====================================================
     View helpers
     ===================================================== */
  function collectionActions({ type, id, title, extra = '' }) {
    return `<div class="collection-actions">
      <button type="button" class="play-fab play-fab--lg" data-action="play-collection" data-type="${type}" data-id="${id}" data-source-key="${type}:${id}" aria-label="Play ${esc(title)}">${C.playIcons()}</button>
      <button type="button" class="icon-btn icon-btn--lg" data-action="shuffle-collection" data-type="${type}" data-id="${id}" aria-label="Shuffle play ${esc(title)}">${icon('shuffle')}</button>
      ${extra}
    </div>`;
  }

  const totalDuration = songs => songs.reduce((t, s) => t + (s.duration || 0), 0);
  const allPlaylistViews = () => [...state.playlists.map(userView), ...D.featuredPlaylists.map(featuredView)];

  function createCard() {
    return `<button type="button" class="create-card" data-action="create-playlist">
      <span class="create-card__icon">${icon('plus')}</span>New playlist
    </button>`;
  }

  /* ---------- live regions (re-rendered in place) ---------- */
  const liveRenderers = {
    'recent-cards': () => {
      const songs = state.recent.map(D.getSong).filter(Boolean).slice(0, 12);
      if (!songs.length) {
        return `<div class="empty empty--inline"><span class="empty__icon">${icon('clock')}</span><div><h3 class="empty__title">Nothing played yet</h3><p class="empty__text">Songs you play will appear here. Start with the featured album above or anything in Trending Music.</p></div></div>`;
      }
      return C.shelf(songs.map(C.songCard), { queue: songs, source: 'recent:all' });
    },
    'recent-list': () => {
      const songs = state.recent.map(D.getSong).filter(Boolean);
      if (!songs.length) {
        return C.emptyState({ icon: 'clock', title: 'Your listening history is empty', text: 'Play any song and it will be saved here, even after you refresh the page.', action: '<a class="btn btn--primary" href="#/discover">Discover music</a>' });
      }
      return C.trackList(songs, { source: 'recent:all' });
    },
    'favorites-list': () => {
      const songs = collectionIds('favorites').map(D.getSong).filter(Boolean);
      if (!songs.length) {
        return C.emptyState({ icon: 'heart', title: 'Songs you like will appear here', text: 'Tap the heart next to any song to save it to Favorites.', action: '<a class="btn btn--primary" href="#/discover">Find songs</a>' });
      }
      return C.trackList(songs, { source: 'favorites:all' });
    },
    'favorites-count': () => plural(state.favorites.size, 'song'),
    'liked-meta': () => plural(state.favorites.size, 'song'),
    'discover-list': () => {
      const g = state.discoverGenre;
      const list = g === 'All' ? D.songs.slice().sort((a, b) => b.plays - a.plays) : D.songs.filter(s => s.genre === g);
      return `<h2 class="subhead">${g === 'All' ? 'All tracks' : esc(g)} <span class="count">${plural(list.length, 'song')}</span></h2>` +
        C.trackList(list, { source: `genre:${g}` });
    },
  };

  function refreshLive(keys) {
    keys.forEach(key => {
      $$(`[data-live="${key}"]`).forEach(el => { el.innerHTML = liveRenderers[key](); });
    });
    syncPlayingUI();
  }

  const live = (key, tag = 'div') => `<${tag} data-live="${key}">${liveRenderers[key]()}</${tag}>`;

  /* =====================================================
     Views
     ===================================================== */
  function viewHome() {
    const album = D.getAlbum(D.hero.albumId);
    const heroSongs = D.songsByAlbum(album.id);
    const h = new Date().getHours();
    const greet = h < 5 ? 'Late night listening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const [c1, c2] = album.colors;

    const hero = `<section class="hero" aria-labelledby="hero-title" style="--c1:${c1};--c2:${c2}" data-source-key="album:${album.id}">
      <img class="hero__backdrop" src="${album.cover}" alt="" aria-hidden="true">
      <div class="hero__content">
        <p class="kicker kicker--light">New album, out now</p>
        <h1 class="hero__title" id="hero-title" tabindex="-1" data-page-title>${esc(album.title)}</h1>
        <p class="hero__artist">by <a href="#/artist/${album.artistId}">${esc(album.artist)}</a>, ${album.year}</p>
        <p class="hero__desc">${esc(album.description)}</p>
        <div class="hero__actions">
          <button type="button" class="btn btn--primary btn--lg" data-action="play-collection" data-type="album" data-id="${album.id}" data-source-key="album:${album.id}">
            ${C.playIcons()}<span class="label-play">Play Now</span><span class="label-pause">Pause</span>
          </button>
          <button type="button" class="btn btn--ghost btn--on-dark btn--lg" data-action="add-to-playlist" data-ids="${C.idList(heroSongs)}">${icon('plus')}Add to Playlist</button>
        </div>
      </div>
      <div class="hero__art">
        <span class="vinyl" aria-hidden="true"></span>
        <a class="hero__cover" href="#/album/${album.id}"><img src="${album.cover}" alt="Cover of ${esc(album.title)}"></a>
      </div>
    </section>`;

    const artists = D.artists.slice().sort((a, b) => b.followers - a.followers);
    return {
      title: 'Home',
      html: `<p class="greeting">${greet}</p>${hero}
        ${C.section({ id: 'sec-recent', title: 'Recently Played', href: '#/recent', scroll: true, body: live('recent-cards') })}
        ${C.section({ id: 'sec-trending', title: 'Trending Music', sub: 'Most played on Sóng this week', body: C.trackList(D.trending(10), { source: 'chart:trending', compact: true, showAlbum: false, split: true }) })}
        ${C.section({ id: 'sec-artists', title: 'Popular Artists', href: '#/artists', scroll: true, body: C.shelf(artists.map(C.artistCard)) })}
        ${C.section({ id: 'sec-albums', title: 'Recommended Albums', href: '#/albums', scroll: true, body: C.shelf(D.albums.map(C.albumCard)) })}
        ${C.section({ id: 'sec-playlists', title: 'Recommended Playlists', href: '#/playlists', scroll: true, body: C.shelf(D.featuredPlaylists.map(p => C.playlistCard(featuredView(p)))) })}`,
    };
  }

  function viewDiscover(m, params) {
    const g = params.get('genre');
    if (g && D.genres.some(x => x.name === g)) state.discoverGenre = g;
    else if (!g) state.discoverGenre = 'All';
    const chips = ['All', ...D.genres.map(x => x.name)].map(name =>
      `<button type="button" class="chip" data-action="genre" data-genre="${esc(name)}" aria-pressed="${name === state.discoverGenre}">${esc(name)}</button>`
    ).join('');
    const newest = D.albums.slice().sort((a, b) => b.year - a.year);
    return {
      title: 'Discover',
      html: `${C.pageHead({ kicker: 'Explore', title: 'Discover', sub: 'Browse the catalogue by genre, from Saigon lo-fi to Oslo rock.' })}
        <div class="chips" role="group" aria-label="Filter by genre">${chips}</div>
        ${live('discover-list')}
        ${C.section({ id: 'sec-new', title: 'New releases', scroll: true, body: C.shelf(newest.map(C.albumCard)) })}
        ${C.section({ id: 'sec-moods', title: 'Playlists for every mood', scroll: true, body: C.shelf(D.featuredPlaylists.map(p => C.playlistCard(featuredView(p)))) })}`,
    };
  }

  function runSearch(q) {
    const n = D.normalize(q);
    const has = t => D.normalize(t).includes(n);
    const score = t => { const x = D.normalize(t); return x === n ? 3 : x.startsWith(n) ? 2 : x.includes(n) ? 1 : 0; };
    const songs = D.songs.filter(s => has(s.title) || has(s.artist) || has(s.album))
      .sort((a, b) => score(b.title) - score(a.title) || b.plays - a.plays);
    const artists = D.artists.filter(a => has(a.name) || has(a.genre));
    const albums = D.albums.filter(a => has(a.title) || has(a.artist));
    const playlists = allPlaylistViews().filter(p => has(p.title) || has(p.description));

    const candidates = [
      ...artists.map(item => ({ type: 'artist', item, s: score(item.name) + 0.5 })),
      ...songs.map(item => ({ type: 'song', item, s: score(item.title) + 0.3 })),
      ...albums.map(item => ({ type: 'album', item, s: score(item.title) + 0.2 })),
      ...playlists.map(item => ({ type: 'playlist', item, s: score(item.title) })),
    ].filter(c => c.s >= 1);
    candidates.sort((a, b) => b.s - a.s);
    return { songs, artists, albums, playlists, top: candidates[0] || null };
  }

  function topResultHtml(top, songs) {
    const { type, item } = top;
    let art, title, href, meta, play;
    if (type === 'artist') {
      art = `<span class="top-result__art is-round"><img src="${item.image}" alt=""></span>`;
      title = item.name; href = `#/artist/${item.id}`;
      meta = `<span class="pill">Artist</span><span>${esc(item.genre)}</span>`;
      play = `<button type="button" class="play-fab" data-action="play-collection" data-type="artist" data-id="${item.id}" data-source-key="artist:${item.id}" aria-label="Play ${esc(item.name)}">${C.playIcons()}</button>`;
    } else if (type === 'song') {
      art = `<span class="top-result__art"><img src="${item.cover}" alt=""></span>`;
      title = item.title; href = `#/album/${item.albumId}`;
      meta = `<span class="pill">Song</span><a href="#/artist/${item.artistId}">${esc(item.artist)}</a>`;
      play = `<span data-queue="${C.idList(songs)}" data-source="search"><button type="button" class="play-fab" data-action="play-song" data-id="${item.id}" aria-label="Play ${esc(item.title)}">${C.playIcons()}</button></span>`;
    } else if (type === 'album') {
      art = `<span class="top-result__art"><img src="${item.cover}" alt=""></span>`;
      title = item.title; href = `#/album/${item.id}`;
      meta = `<span class="pill">Album</span><a href="#/artist/${item.artistId}">${esc(item.artist)}</a>`;
      play = `<button type="button" class="play-fab" data-action="play-collection" data-type="album" data-id="${item.id}" data-source-key="album:${item.id}" aria-label="Play ${esc(item.title)}">${C.playIcons()}</button>`;
    } else {
      art = `<span class="top-result__art">${item.isUser ? C.userArt(item) : `<img src="${item.cover}" alt="">`}</span>`;
      title = item.title; href = `#/playlist/${item.id}`;
      meta = `<span class="pill">Playlist</span><span>${plural(item.songIds.length, 'song')}</span>`;
      play = `<button type="button" class="play-fab" data-action="play-collection" data-type="playlist" data-id="${item.id}" data-source-key="playlist:${item.id}" aria-label="Play ${esc(item.title)}">${C.playIcons()}</button>`;
    }
    return `<div><h2 class="search-heading">Top result</h2>
      <article class="top-result card" data-song-id="${type === 'song' ? item.id : ''}">
        ${art}
        <h3 class="top-result__title"><a class="card__link" href="${href}">${esc(title)}</a></h3>
        <p class="top-result__meta">${meta}</p>
        ${play}
      </article></div>`;
  }

  function viewSearch(m, params) {
    const q = (params.get('q') || '').trim();
    const after = () => { if (searchInput.value.trim() !== q) searchInput.value = q; };
    if (!q) {
      const tiles = D.genres.map(g => `<a class="genre-tile" href="#/discover?genre=${encodeURIComponent(g.name)}" style="--c1:${g.colors[0]};--c2:${g.colors[1]}">${esc(g.name)}<img src="${g.cover}" alt="" loading="lazy"></a>`).join('');
      return {
        title: 'Search', after,
        html: `${C.pageHead({ kicker: 'Search', title: 'Browse all', sub: 'Type in the search bar to find songs, artists, albums and playlists. Accents are optional: “sai gon” finds “Sài Gòn”.' })}
          ${C.section({ id: 'sec-genres', title: 'Genres', body: `<div class="genre-grid">${tiles}</div>` })}`,
      };
    }
    const r = runSearch(q);
    const total = r.songs.length + r.artists.length + r.albums.length + r.playlists.length;
    const head = C.pageHead({ kicker: 'Search results', title: `“${q}”`, sub: total ? `${plural(total, 'result')} found` : '' });
    if (!total) {
      return {
        title: `Search: ${q}`, after,
        html: head + C.emptyState({
          icon: 'search',
          title: `No results for “${q}”`,
          text: 'Check the spelling, try fewer words, or search for an artist or genre instead.',
          action: '<a class="btn btn--ghost" href="#/discover">Browse genres</a>',
        }),
      };
    }
    const songsBlock = r.songs.length
      ? `<div class="search-top__songs"><h2 class="search-heading">Songs</h2>${C.trackList(r.songs.slice(0, 5), { source: 'search', showAlbum: false, compact: true })}</div>`
      : '';
    return {
      title: `Search: ${q}`, after,
      html: `${head}
        <div class="search-top">${r.top ? topResultHtml(r.top, r.songs) : ''}${songsBlock}</div>
        ${r.songs.length > 5 ? C.section({ id: 'sec-s-songs', title: 'All matching songs', body: C.trackList(r.songs, { source: 'search' }) }) : ''}
        ${r.artists.length ? C.section({ id: 'sec-s-artists', title: 'Artists', scroll: r.artists.length > 4, body: C.shelf(r.artists.map(C.artistCard)) }) : ''}
        ${r.albums.length ? C.section({ id: 'sec-s-albums', title: 'Albums', scroll: r.albums.length > 4, body: C.shelf(r.albums.map(C.albumCard)) }) : ''}
        ${r.playlists.length ? C.section({ id: 'sec-s-playlists', title: 'Playlists', scroll: r.playlists.length > 4, body: C.shelf(r.playlists.map(C.playlistCard)) }) : ''}`,
    };
  }

  function viewLibrary() {
    const liked = `<a class="liked-tile" href="#/favorites">
        ${icon('heart-fill', 'big')}
        <span class="liked-tile__title">Favorites</span>
        <span class="liked-tile__meta" data-live="liked-meta">${liveRenderers['liked-meta']()}</span>
      </a>`;
    return {
      title: 'Library',
      html: `${C.pageHead({ kicker: 'Your collection', title: 'Library', sub: 'Your favorites, playlists and listening history, saved in this browser.', actions: `<button type="button" class="btn btn--primary" data-action="create-playlist">${icon('plus')}New playlist</button>` })}
        ${C.section({ id: 'sec-lib-pl', title: 'Your playlists', body: `<div class="grid">${liked}${state.playlists.map(p => C.playlistCard(userView(p))).join('')}${createCard()}</div>` })}
        ${C.section({ id: 'sec-lib-recent', title: 'Recently Played', href: '#/recent', scroll: true, body: live('recent-cards') })}`,
    };
  }

  function viewFavorites() {
    return {
      title: 'Favorites',
      html: `${C.collectionHead({
          kicker: 'Your playlist', title: 'Favorites',
          sub: 'Every song you’ve hearted, newest first.',
          meta: `<span data-live="favorites-count">${liveRenderers['favorites-count']()}</span>`,
          art: `<span class="fav-art">${icon('heart-fill')}</span>`,
          colors: ['#3b2a8f', '#b3336b'],
        })}
        ${collectionActions({ type: 'favorites', id: 'all', title: 'Favorites' })}
        ${live('favorites-list')}`,
    };
  }

  function viewRecent() {
    return {
      title: 'Recently Played',
      html: `${C.collectionHead({
          kicker: 'History', title: 'Recently Played',
          sub: 'The last 24 songs you played on this device.',
          art: `<span class="fav-art recent-art">${icon('clock')}</span>`,
          colors: ['#0e7490', '#3b5bdb'],
        })}
        ${collectionActions({ type: 'recent', id: 'all', title: 'Recently Played', extra: `<button type="button" class="btn btn--ghost" data-action="clear-recent">${icon('trash')}Clear history</button>` })}
        ${live('recent-list')}`,
    };
  }

  function viewPlaylists() {
    return {
      title: 'Playlists',
      html: `${C.pageHead({ kicker: 'Playlists', title: 'Playlists', sub: 'Build your own or start from one of ours.', actions: `<button type="button" class="btn btn--primary" data-action="create-playlist">${icon('plus')}New playlist</button>` })}
        ${C.section({ id: 'sec-pl-yours', title: 'Your playlists', body: `<div class="grid">${state.playlists.map(p => C.playlistCard(userView(p))).join('')}${createCard()}</div>` })}
        ${C.section({ id: 'sec-pl-featured', title: 'Made for you', body: `<div class="grid">${D.featuredPlaylists.map(p => C.playlistCard(featuredView(p))).join('')}</div>` })}`,
    };
  }

  function viewAlbums() {
    const list = D.albums.slice().sort((a, b) => b.year - a.year);
    return {
      title: 'Albums',
      html: `${C.pageHead({ kicker: 'Catalogue', title: 'Albums', sub: `${plural(list.length, 'album')} from Vietnamese and international artists.` })}
        <div class="grid" style="margin-top:20px">${list.map(C.albumCard).join('')}</div>`,
    };
  }

  function viewArtists() {
    const list = D.artists.slice().sort((a, b) => b.followers - a.followers);
    return {
      title: 'Artists',
      html: `${C.pageHead({ kicker: 'Catalogue', title: 'Artists', sub: 'Tap an artist to hear their most played songs.' })}
        <div class="grid" style="margin-top:20px">${list.map(C.artistCard).join('')}</div>`,
    };
  }

  function viewAlbum(m) {
    const a = D.getAlbum(m[1]);
    if (!a) return viewNotFound();
    const songs = D.songsByAlbum(a.id);
    const others = D.albums.filter(x => x.id !== a.id);
    return {
      title: a.title,
      html: `${C.collectionHead({
          kicker: `${a.genre} album`, title: a.title, sub: esc(a.description),
          meta: `<a href="#/artist/${a.artistId}">${esc(a.artist)}</a><span>${a.year}</span><span>${plural(songs.length, 'song')}, ${D.formatLong(totalDuration(songs))}</span>`,
          art: `<img src="${a.cover}" alt="Cover of ${esc(a.title)}">`,
          colors: a.colors, sourceKey: `album:${a.id}`,
        })}
        ${collectionActions({ type: 'album', id: a.id, title: a.title, extra: `<button type="button" class="btn btn--ghost" data-action="add-to-playlist" data-ids="${C.idList(songs)}">${icon('plus')}Add to Playlist</button>` })}
        ${C.trackList(songs, { source: `album:${a.id}`, showAlbum: false, showCover: false })}
        ${C.section({ id: 'sec-more-albums', title: 'You might also like', scroll: true, body: C.shelf(others.map(C.albumCard)) })}`,
    };
  }

  function viewArtist(m) {
    const a = D.getArtist(m[1]);
    if (!a) return viewNotFound();
    const songs = D.songsByArtist(a.id);
    const albums = D.albumsByArtist(a.id);
    const similar = D.artists.filter(x => x.id !== a.id);
    return {
      title: a.name,
      html: `${C.collectionHead({
          kicker: `${a.genre} artist`, title: a.name,
          meta: `<span>${D.formatCount(a.followers)} followers</span><span>${plural(songs.length, 'song')}</span>`,
          art: `<img src="${a.image}" alt="">`, round: true,
          colors: a.colors, sourceKey: `artist:${a.id}`,
        })}
        ${collectionActions({ type: 'artist', id: a.id, title: a.name })}
        <h2 class="subhead">Popular</h2>
        ${C.trackList(songs, { source: `artist:${a.id}` })}
        ${C.section({ id: 'sec-disco', title: 'Discography', body: C.shelf(albums.map(C.albumCard)) })}
        <section class="artist-bio" aria-label="About ${esc(a.name)}"><h2 class="subhead">About</h2><p>${esc(a.bio)}</p></section>
        ${C.section({ id: 'sec-similar', title: 'Fans also like', scroll: true, body: C.shelf(similar.map(C.artistCard)) })}`,
    };
  }

  function viewPlaylist(m) {
    const p = getPlaylist(m[1]);
    if (!p) return viewNotFound();
    const songs = p.songIds.map(D.getSong).filter(Boolean);
    const art = p.isUser ? C.userArt(p) : `<img src="${p.cover}" alt="">`;
    const colors = p.isUser ? (p.colors || PALETTES[0]) : p.colors;
    const extra = p.isUser
      ? `<button type="button" class="btn btn--ghost" data-action="rename-playlist" data-id="${p.id}">${icon('edit')}Rename</button>
         <button type="button" class="btn btn--ghost" data-action="delete-playlist" data-id="${p.id}">${icon('trash')}Delete</button>`
      : `<button type="button" class="btn btn--ghost" data-action="add-to-playlist" data-ids="${C.idList(songs)}">${icon('plus')}Add to Playlist</button>`;
    const list = songs.length
      ? C.trackList(songs, { source: `playlist:${p.id}`, playlistId: p.isUser ? p.id : null })
      : C.emptyState({ icon: 'playlist', title: 'This playlist is empty', text: 'Use the ••• menu next to any song, or “Add to Playlist” on an album, to add music here.', action: '<a class="btn btn--primary" href="#/search">Find songs</a>' });
    return {
      title: p.title,
      html: `${C.collectionHead({
          kicker: p.isUser ? 'Your playlist' : 'Playlist made for you', title: p.title,
          sub: p.description ? esc(p.description) : '',
          meta: `<span>${plural(songs.length, 'song')}${songs.length ? `, ${D.formatLong(totalDuration(songs))}` : ''}</span>`,
          art, colors, sourceKey: `playlist:${p.id}`,
        })}
        ${collectionActions({ type: 'playlist', id: p.id, title: p.title, extra })}
        ${list}`,
    };
  }

  function viewNotFound() {
    return {
      title: 'Not found',
      html: `${C.pageHead({ title: 'Page not found' })}${C.emptyState({ icon: 'compass', title: 'This page doesn’t exist', text: 'The link may be broken or the playlist may have been deleted.', action: '<a class="btn btn--primary" href="#/home">Go home</a>' })}`,
    };
  }

  /* =====================================================
     Router
     ===================================================== */
  const routes = [
    { re: /^\/(home)?$/, nav: 'home', view: viewHome },
    { re: /^\/discover$/, nav: 'discover', view: viewDiscover },
    { re: /^\/search$/, nav: 'search', view: viewSearch },
    { re: /^\/library$/, nav: 'library', view: viewLibrary },
    { re: /^\/favorites$/, nav: 'favorites', view: viewFavorites },
    { re: /^\/recent$/, nav: 'recent', view: viewRecent },
    { re: /^\/playlists$/, nav: 'playlists', view: viewPlaylists },
    { re: /^\/albums$/, nav: 'albums', view: viewAlbums },
    { re: /^\/artists$/, nav: 'artists', view: viewArtists },
    { re: /^\/album\/([\w-]+)$/, nav: 'albums', view: viewAlbum },
    { re: /^\/artist\/([\w-]+)$/, nav: 'artists', view: viewArtist },
    { re: /^\/playlist\/([\w-]+)$/, nav: 'playlists', view: viewPlaylist },
  ];

  let currentRoute = { path: '', nav: '' };
  let firstRender = true;

  function parseHash() {
    const raw = location.hash.replace(/^#/, '') || '/home';
    const qi = raw.indexOf('?');
    let path = qi >= 0 ? raw.slice(0, qi) : raw;
    if (!path.startsWith('/')) path = '/' + path;
    return { path, params: new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : '') };
  }

  function render() {
    const { path, params } = parseHash();
    let route = null, match = null;
    for (const r of routes) {
      match = path.match(r.re);
      if (match) { route = r; break; }
    }
    const result = route ? route.view(match, params) : viewNotFound();
    const view = $('#view');
    const samePath = currentRoute.path === path;

    view.innerHTML = result.html;
    currentRoute = { path, nav: route ? route.nav : '' };
    document.body.dataset.route = currentRoute.nav || 'none';
    document.title = `${result.title} · Sóng`;
    setActiveNav();

    if (!samePath) {
      view.classList.remove('view-enter');
      void view.offsetWidth;
      view.classList.add('view-enter');
      $('#main').scrollTo({ top: 0, behavior: 'auto' });
    }
    if (typeof result.after === 'function') result.after();
    if (currentRoute.nav !== 'search' && document.activeElement !== searchInput) searchInput.value = '';
    syncPlayingUI();

    if (!firstRender && !samePath && document.activeElement !== searchInput) {
      if (currentRoute.nav === 'search') searchInput.focus({ preventScroll: true });
      else {
        const h = $('[data-page-title]', view);
        if (h) h.focus({ preventScroll: true });
      }
    }
    firstRender = false;
  }

  function setActiveNav() {
    $$('[data-nav]').forEach(a => {
      const on = a.dataset.nav === currentRoute.nav;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    $$('[data-pl-link]').forEach(a => {
      const on = currentRoute.path === `/playlist/${a.dataset.plLink}`;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function renderSidebarPlaylists() {
    const ul = $('#sidebar-playlists');
    if (!state.playlists.length) {
      ul.innerHTML = '<li class="sidebar__empty">No playlists yet. Use + to create one.</li>';
      return;
    }
    ul.innerHTML = state.playlists.map(p => `<li>
      <a class="pl-link" href="#/playlist/${p.id}" data-pl-link="${p.id}">
        <span class="pl-link__art">${C.userArt(userView(p))}</span>
        <span class="pl-link__text">
          <span class="pl-link__name">${esc(p.name)}</span>
          <span class="pl-link__meta">${plural(p.songIds.length, 'song')}</span>
        </span>
      </a></li>`).join('');
    setActiveNav();
  }

  /* =====================================================
     Toasts, dialogs, menus
     ===================================================== */
  function toast(msg) {
    const wrap = $('#toasts');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    wrap.appendChild(t);
    while (wrap.children.length > 3) wrap.firstElementChild.remove();
    setTimeout(() => {
      t.classList.add('is-leaving');
      setTimeout(() => t.remove(), 300);
    }, 2600);
  }

  function openDialog(dlg) {
    dlg.returnValue = '';
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }

  function askName({ title, value = '', confirm = 'Save' }) {
    return new Promise(resolve => {
      const dlg = $('#dlg-name');
      const input = $('#dlg-name-input');
      $('#dlg-name-title').textContent = title;
      $('#dlg-name-ok').textContent = confirm;
      input.value = value;
      const onClose = () => {
        dlg.removeEventListener('close', onClose);
        resolve(dlg.returnValue === 'ok' ? input.value.trim() || null : null);
      };
      dlg.addEventListener('close', onClose);
      openDialog(dlg);
      input.focus();
      input.select();
    });
  }

  function confirmDialog({ title, message, confirm = 'Delete' }) {
    return new Promise(resolve => {
      const dlg = $('#dlg-confirm');
      $('#dlg-confirm-title').textContent = title;
      $('#dlg-confirm-msg').textContent = message;
      $('#dlg-confirm-ok').textContent = confirm;
      const onClose = () => {
        dlg.removeEventListener('close', onClose);
        resolve(dlg.returnValue === 'ok');
      };
      dlg.addEventListener('close', onClose);
      openDialog(dlg);
    });
  }

  let pendingAddIds = [];
  function openAddToPlaylist(ids) {
    ids = ids.filter(validSong);
    if (!ids.length) return;
    pendingAddIds = ids;
    $('#dlg-add-sub').textContent = ids.length === 1 ? `“${D.getSong(ids[0]).title}”` : plural(ids.length, 'song');
    $('#dlg-add-list').innerHTML = state.playlists.length
      ? state.playlists.map(p => {
        const all = ids.every(id => p.songIds.includes(id));
        return `<li><button type="button" class="pick" data-pick="${p.id}"${all ? ' aria-disabled="true"' : ''}>
          <span class="pick__art">${C.userArt(userView(p))}</span>
          <span class="pick__text"><span class="pick__name">${esc(p.name)}</span><span class="pick__meta">${all ? 'Already added' : plural(p.songIds.length, 'song')}</span></span>
          ${all ? icon('check', 'pick__check') : icon('plus', 'pick__plus')}
        </button></li>`;
      }).join('')
      : '<li class="dlg-empty">You don’t have any playlists yet.</li>';
    openDialog($('#dlg-add'));
  }

  const menu = { el: $('#ctx-menu'), items: [], anchor: null, openedAt: 0 };

  function openMenu(anchor, items) {
    closeMenu(false);
    menu.items = items.filter(Boolean);
    menu.anchor = anchor;
    menu.el.innerHTML = menu.items.map((it, i) => it === '-'
      ? '<div class="menu__sep" role="separator"></div>'
      : `<button type="button" role="menuitem" class="menu__item${it.danger ? ' menu__item--danger' : ''}" data-menu-index="${i}">${icon(it.icon)}<span>${esc(it.label)}</span></button>`
    ).join('');
    menu.el.hidden = false;
    menu.openedAt = Date.now();
    anchor.setAttribute('aria-expanded', 'true');

    const r = anchor.getBoundingClientRect();
    const m = menu.el.getBoundingClientRect();
    let top = r.bottom + 6;
    let left = r.right - m.width;
    if (top + m.height > window.innerHeight - 8) top = r.top - m.height - 6;
    left = Math.max(8, Math.min(left, window.innerWidth - m.width - 8));
    top = Math.max(8, top);
    menu.el.style.top = `${top}px`;
    menu.el.style.left = `${left}px`;
    const first = menu.el.querySelector('[role="menuitem"]');
    if (first) first.focus();
  }

  function closeMenu(returnFocus = false) {
    if (menu.el.hidden) return;
    menu.el.hidden = true;
    menu.el.innerHTML = '';
    if (menu.anchor) {
      menu.anchor.setAttribute('aria-expanded', 'false');
      if (returnFocus && document.contains(menu.anchor)) menu.anchor.focus();
    }
    menu.anchor = null;
  }

  function songMenuItems(song, playlistId) {
    const liked = state.favorites.has(song.id);
    return [
      { label: 'Play next', icon: 'play-next', run: () => { player.playNext([song.id]); toast('Playing next'); } },
      { label: 'Add to queue', icon: 'queue', run: () => { player.addToQueue([song.id]); toast('Added to queue'); } },
      { label: 'Add to playlist…', icon: 'plus', run: () => openAddToPlaylist([song.id]) },
      playlistId && { label: 'Remove from this playlist', icon: 'minus-circle', danger: true, run: () => removeFromPlaylist(playlistId, song.id) },
      '-',
      { label: liked ? 'Remove from Favorites' : 'Add to Favorites', icon: liked ? 'heart-fill' : 'heart', run: () => toggleLike(song.id) },
      { label: 'Go to album', icon: 'disc', run: () => go(`#/album/${song.albumId}`) },
      { label: 'Go to artist', icon: 'mic', run: () => go(`#/artist/${song.artistId}`) },
    ];
  }

  const REPEAT_LABELS = { off: 'Off', all: 'All', one: 'One song' };

  function playerMenuItems() {
    const s = player.current;
    return [
      s && { label: 'Add to playlist…', icon: 'plus', run: () => openAddToPlaylist([s.id]) },
      s && { label: 'Go to album', icon: 'disc', run: () => go(`#/album/${s.albumId}`) },
      s && { label: 'Go to artist', icon: 'mic', run: () => go(`#/artist/${s.artistId}`) },
      s && '-',
      { label: `Shuffle: ${player.shuffle ? 'On' : 'Off'}`, icon: 'shuffle', run: () => player.toggleShuffle() },
      { label: `Repeat: ${REPEAT_LABELS[player.repeat]}`, icon: player.repeat === 'one' ? 'repeat-one' : 'repeat', run: () => player.cycleRepeat() },
      { label: state.queueOpen ? 'Hide queue' : 'Show queue', icon: 'queue', run: () => setQueueOpen(!state.queueOpen) },
    ];
  }

  /* =====================================================
     Sidebar & queue drawers
     ===================================================== */
  const mqCompact = window.matchMedia('(max-width: 1024px)');

  function applySidebarInert() {
    const sb = $('#sidebar');
    if (mqCompact.matches && !document.body.classList.contains('sidebar-open')) sb.setAttribute('inert', '');
    else sb.removeAttribute('inert');
  }

  function setSidebar(open) {
    if (!mqCompact.matches) open = false;
    const was = document.body.classList.contains('sidebar-open');
    document.body.classList.toggle('sidebar-open', open);
    $('#btn-menu').setAttribute('aria-expanded', String(open));
    applySidebarInert();
    if (open && !was) { const first = $('#sidebar a'); if (first) first.focus(); }
    if (!open && was) $('#btn-menu').focus({ preventScroll: true });
  }

  function setQueueOpen(open) {
    state.queueOpen = open;
    const q = $('#queue');
    q.classList.toggle('is-open', open);
    if (open) q.removeAttribute('inert'); else q.setAttribute('inert', '');
    ui.queueBtn.setAttribute('aria-expanded', String(open));
    ui.queueBtn.classList.toggle('is-active', open);
    if (open) {
      renderQueue();
      const btn = $('.queue__head .icon-btn');
      if (btn) btn.focus();
    }
  }

  function renderQueue() {
    if (!state.queueOpen) return;
    const body = $('#queue-body');
    const cur = player.current;
    if (!cur) {
      body.innerHTML = C.emptyState({ icon: 'queue', title: 'Your queue is empty', text: 'Play something and upcoming songs will line up here.' });
      return;
    }
    const item = (song, index, isCurrent) => `<li class="q-item${isCurrent ? ' is-current' : ''}">
      <button type="button" class="q-item__play" data-action="queue-play" data-index="${index}" aria-label="${isCurrent ? 'Now playing' : 'Play'} ${esc(song.title)} by ${esc(song.artist)}">
        <img src="${song.cover}" alt="" width="42" height="42">
        <span class="q-item__text"><span class="q-item__title">${esc(song.title)}</span><span class="q-item__artist">${esc(song.artist)}</span></span>
      </button>
      ${isCurrent ? '' : `<button type="button" class="icon-btn icon-btn--sm" data-action="queue-remove" data-index="${index}" aria-label="Remove ${esc(song.title)} from queue">${icon('close')}</button>`}
    </li>`;
    const upcoming = player.upcoming;
    const modes = [player.shuffle && 'Shuffle is on', player.repeat !== 'off' && `Repeat: ${REPEAT_LABELS[player.repeat]}`].filter(Boolean).join('. ');
    body.innerHTML = `
      <h3 class="queue__label">Now playing</h3>
      <ul>${item(cur, player.index, true)}</ul>
      <div class="queue__label-row">
        <h3 class="queue__label">Next up</h3>
        ${upcoming.length ? '<button type="button" class="queue__clear" data-action="queue-clear">Clear</button>' : ''}
      </div>
      ${modes ? `<p class="queue__modes">${modes}.</p>` : ''}
      ${upcoming.length
        ? `<ul>${upcoming.map((id, k) => item(D.getSong(id), player.index + 1 + k, false)).join('')}</ul>`
        : `<p class="queue__note">${player.repeat === 'all' ? 'The queue will start again from the top.' : 'Nothing else queued. Use “Add to queue” in any song’s ••• menu.'}</p>`}`;
  }

  /* =====================================================
     Player UI
     ===================================================== */
  const ui = {
    root: $('#player'),
    art: $('#player-art'),
    artLink: $('#player-art-link'),
    title: $('#player-title'),
    artist: $('#player-artist'),
    like: $('#player-like'),
    play: $('#btn-play'),
    prev: $('#btn-prev'),
    next: $('#btn-next'),
    shuffle: $('#btn-shuffle'),
    repeat: $('#btn-repeat'),
    seek: $('#seek'),
    cur: $('#time-current'),
    total: $('#time-total'),
    mute: $('#btn-mute'),
    volume: $('#volume'),
    queueBtn: $('#btn-queue'),
    more: $('#btn-more'),
  };
  let scrubbing = false;
  let recordPending = false;
  let lastSave = 0;
  let errorStreak = 0;

  const setFill = (range) => {
    const pct = ((range.value - range.min) / (range.max - range.min)) * 100 || 0;
    range.style.setProperty('--fill', `${pct}%`);
  };

  function renderPlayerTrack() {
    const s = player.current;
    ui.root.classList.toggle('is-empty', !s);
    if (!s) return;
    ui.art.src = s.cover;
    ui.art.alt = `Cover of ${s.album}`;
    ui.artLink.href = `#/album/${s.albumId}`;
    ui.artLink.setAttribute('aria-label', `Open album ${s.album}`);
    ui.title.textContent = s.title;
    ui.title.href = `#/album/${s.albumId}`;
    ui.artist.textContent = s.artist;
    ui.artist.href = `#/artist/${s.artistId}`;
    ui.like.dataset.id = s.id;
    ui.like.dataset.likeId = s.id;
    ui.like.setAttribute('aria-pressed', String(state.favorites.has(s.id)));
    ui.like.setAttribute('aria-label', `Favorite ${s.title}`);
  }

  function renderPlayState() {
    const playing = player.isPlaying;
    document.body.classList.toggle('is-playing', playing);
    ui.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    ui.shuffle.setAttribute('aria-pressed', String(player.shuffle));
    ui.shuffle.setAttribute('aria-label', `Shuffle: ${player.shuffle ? 'on' : 'off'}`);
    ui.repeat.dataset.mode = player.repeat;
    ui.repeat.setAttribute('aria-pressed', String(player.repeat !== 'off'));
    ui.repeat.setAttribute('aria-label', `Repeat: ${REPEAT_LABELS[player.repeat].toLowerCase()}`);
  }

  function renderTime() {
    const d = player.duration;
    const t = player.currentTime;
    if (!scrubbing) {
      ui.seek.value = d ? Math.round((t / d) * 1000) : 0;
      ui.cur.textContent = D.formatTime(t);
    }
    setFill(ui.seek);
    ui.total.textContent = D.formatTime(d);
    ui.seek.setAttribute('aria-valuetext', `${D.formatTime(scrubbing ? (ui.seek.value / 1000) * d : t)} of ${D.formatTime(d)}`);
  }

  function renderVolume() {
    const muted = player.muted;
    const v = muted ? 0 : Math.round(player.volume * 100);
    ui.volume.value = v;
    setFill(ui.volume);
    ui.mute.dataset.level = muted ? 'mute' : v < 50 ? 'low' : 'high';
    ui.mute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    ui.volume.setAttribute('aria-valuetext', `${v}%`);
  }

  function syncPlayingUI() {
    const cur = player.current;
    const key = player.sourceKey;
    $$('.is-current[data-song-id]').forEach(el => { el.classList.remove('is-current'); el.removeAttribute('aria-current'); });
    if (cur) {
      $$(`[data-song-id="${cur.id}"]`).forEach(el => {
        el.classList.add('is-current');
        if (el.classList.contains('track')) el.setAttribute('aria-current', 'true');
      });
    }
    $$('[data-source-key]').forEach(el => el.classList.toggle('is-source', !!key && el.dataset.sourceKey === key));
  }

  function savePlayerState() {
    lastSave = Date.now();
    S.set(S.KEYS.player, player.serialize());
  }

  function bindPlayer() {
    player.addEventListener('trackchange', () => {
      recordPending = true;
      renderPlayerTrack();
      renderTime();
      syncPlayingUI();
      renderQueue();
      savePlayerState();
    });
    player.addEventListener('statechange', () => {
      renderPlayState();
      syncPlayingUI();
      if (player.isPlaying && recordPending && player.current) {
        recordPending = false;
        addRecent(player.current.id);
      }
      savePlayerState();
    });
    player.addEventListener('timeupdate', () => {
      renderTime();
      if (player.isPlaying && Date.now() - lastSave > 5000) savePlayerState();
    });
    player.addEventListener('durationchange', () => {
      const s = player.current;
      const d = player.audio.duration;
      if (s && Number.isFinite(d) && d > 0) {
        const r = Math.round(d);
        if (s.duration !== r) {
          s.duration = r;
          cachedDurations[s.id] = r;
          S.set(S.KEYS.durations, cachedDurations);
          $$(`[data-dur-id="${s.id}"]`).forEach(el => { el.textContent = D.formatTime(r); });
        }
      }
      renderTime();
    });
    player.addEventListener('queuechange', () => { renderQueue(); savePlayerState(); });
    player.addEventListener('volumechange', () => { renderVolume(); savePlayerState(); });
    player.addEventListener('buffering', e => document.body.classList.toggle('is-buffering', !!e.detail.buffering && player.wantsPlay));
    player.addEventListener('playing', () => { errorStreak = 0; });
    player.addEventListener('blocked', () => toast('Press play to start listening'));
    player.addEventListener('queueend', () => toast('End of queue'));
    player.addEventListener('error', e => {
      if (!player.wantsPlay) return; // don't auto-skip a track that was only restored
      const song = e.detail.song;
      if (!navigator.onLine) { toast('You’re offline. Audio streams need an internet connection.'); return; }
      errorStreak++;
      if (errorStreak >= Math.min(3, player.queue.length)) {
        errorStreak = 0;
        player.pause();
        toast('Audio couldn’t be loaded. Check your connection and press play to retry.');
        return;
      }
      toast(`Couldn’t load “${song ? song.title : 'this track'}”. Skipping to the next song.`);
      setTimeout(() => player.next(), 1200);
    });

    ui.play.addEventListener('click', () => player.toggle());
    ui.next.addEventListener('click', () => player.next());
    ui.prev.addEventListener('click', () => player.prev());
    ui.shuffle.addEventListener('click', () => {
      player.toggleShuffle();
      toast(player.shuffle ? 'Shuffle on' : 'Shuffle off');
    });
    ui.repeat.addEventListener('click', () => {
      player.cycleRepeat();
      toast(`Repeat: ${REPEAT_LABELS[player.repeat].toLowerCase()}`);
    });
    ui.seek.addEventListener('input', () => {
      scrubbing = true;
      setFill(ui.seek);
      ui.cur.textContent = D.formatTime((ui.seek.value / 1000) * player.duration);
    });
    ui.seek.addEventListener('change', () => {
      player.seekRatio(ui.seek.value / 1000);
      scrubbing = false;
      renderTime();
    });
    ui.volume.addEventListener('input', () => { player.setVolume(ui.volume.value / 100); setFill(ui.volume); });
    ui.mute.addEventListener('click', () => player.toggleMute());
    ui.queueBtn.addEventListener('click', () => setQueueOpen(!state.queueOpen));
    ui.more.addEventListener('click', () => {
      if (menu.anchor === ui.more) { closeMenu(true); return; }
      openMenu(ui.more, playerMenuItems());
    });

    window.addEventListener('pagehide', savePlayerState);
  }

  /* =====================================================
     Theme
     ===================================================== */
  function applyTheme(t, persist = true) {
    state.theme = t;
    document.documentElement.setAttribute('data-theme', t);
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#f3f5fa' : '#0d1220');
    $('#btn-theme').setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    if (persist) S.set(S.KEYS.theme, t);
  }

  /* =====================================================
     Event delegation
     ===================================================== */
  const actions = {
    'play-song': el => playSongFromEl(el),
    'play-collection': el => playCollection(el.dataset.type, el.dataset.id),
    'shuffle-collection': el => playCollection(el.dataset.type, el.dataset.id, { shuffle: true }),
    'toggle-like': el => toggleLike(Number(el.dataset.id)),
    'song-menu': el => {
      if (menu.anchor === el) { closeMenu(true); return; }
      const song = D.getSong(el.dataset.id);
      if (!song) return;
      const list = el.closest('[data-playlist]');
      openMenu(el, songMenuItems(song, list ? list.dataset.playlist : null));
    },
    'add-to-playlist': el => openAddToPlaylist(parseIds(el.dataset.ids)),
    'create-playlist': async () => {
      const pl = await promptCreatePlaylist();
      if (pl) go(`#/playlist/${pl.id}`);
    },
    'rename-playlist': el => promptRenamePlaylist(el.dataset.id),
    'delete-playlist': el => promptDeletePlaylist(el.dataset.id),
    'toggle-theme': () => applyTheme(state.theme === 'dark' ? 'light' : 'dark'),
    'toggle-sidebar': () => setSidebar(!document.body.classList.contains('sidebar-open')),
    'close-sidebar': () => setSidebar(false),
    'close-queue': () => { setQueueOpen(false); ui.queueBtn.focus(); },
    'queue-play': el => {
      const i = Number(el.dataset.index);
      if (i === player.index) player.toggle(); else player.playAt(i);
    },
    'queue-remove': el => player.removeAt(Number(el.dataset.index)),
    'queue-clear': () => { player.clearUpcoming(); toast('Queue cleared'); },
    'clear-recent': async () => {
      if (!state.recent.length) return;
      const ok = await confirmDialog({ title: 'Clear listening history?', message: 'This removes every song from Recently Played on this device.', confirm: 'Clear history' });
      if (!ok) return;
      state.recent = [];
      persistRecent();
      refreshLive(['recent-cards', 'recent-list']);
      toast('Listening history cleared');
    },
    'genre': el => {
      state.discoverGenre = el.dataset.genre;
      const g = state.discoverGenre;
      history.replaceState(null, '', '#/discover' + (g === 'All' ? '' : `?genre=${encodeURIComponent(g)}`));
      $$('[data-action="genre"]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.genre === g)));
      refreshLive(['discover-list']);
    },
    'scroll-shelf': el => {
      const section = el.closest('.section');
      const row = section && section.querySelector('.shelf-row');
      if (!row) return;
      row.scrollBy({ left: Number(el.dataset.dir) * row.clientWidth * 0.8, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    },
    'history-back': () => history.back(),
    'history-forward': () => history.forward(),
  };

  document.addEventListener('click', e => {
    const skip = e.target.closest('.skip-link');
    if (skip) { e.preventDefault(); $('#view').focus(); return; }

    const closer = e.target.closest('[data-close]');
    if (closer) { const dlg = closer.closest('dialog'); if (dlg) dlg.close('cancel'); return; }

    const menuItem = e.target.closest('[data-menu-index]');
    if (menuItem) {
      const it = menu.items[Number(menuItem.dataset.menuIndex)];
      closeMenu(true);
      if (it && it.run) it.run();
      return;
    }

    const t = e.target.closest('[data-action]');
    if (t) {
      const fn = actions[t.dataset.action];
      if (fn) { e.preventDefault(); fn(t, e); }
      return;
    }

    // Clicking anywhere on a track row (outside its links/buttons) plays it
    const row = e.target.closest('.track');
    if (row && !e.target.closest('a, button, input')) playSongFromEl(row);

    // Navigating from the drawer closes it
    if (e.target.closest('#sidebar a')) setSidebar(false);
  });

  // Close menu on outside press
  document.addEventListener('pointerdown', e => {
    if (menu.el.hidden) return;
    if (menu.el.contains(e.target) || (menu.anchor && menu.anchor.contains(e.target))) return;
    closeMenu(false);
  });
  // ignore the scroll/resize that can fire right after opening (e.g. scroll-into-view)
  const closeMenuSoon = () => { if (Date.now() - menu.openedAt > 250) closeMenu(false); };
  $('#main').addEventListener('scroll', closeMenuSoon, { passive: true });
  window.addEventListener('resize', closeMenuSoon);

  // Menu keyboard navigation
  menu.el.addEventListener('keydown', e => {
    const items = $$('[role="menuitem"]', menu.el);
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === 'Tab') closeMenu(false);
  });

  // Add-to-playlist dialog
  $('#dlg-add-list').addEventListener('click', e => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    if (b.getAttribute('aria-disabled') === 'true') { toast('Already in this playlist'); return; }
    $('#dlg-add').close();
    addToPlaylist(b.dataset.pick, pendingAddIds);
  });
  $('#dlg-add-new').addEventListener('click', async () => {
    $('#dlg-add').close();
    await promptCreatePlaylist(pendingAddIds);
  });
  // Clicking the backdrop closes dialogs
  $$('dialog').forEach(dlg => dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close('cancel'); }));

  // Search
  function runSearchRoute() {
    const q = searchInput.value.trim();
    const target = '#/search' + (q ? `?q=${encodeURIComponent(q)}` : '');
    if (currentRoute.path === '/search') {
      history.replaceState(null, '', target);
      render();
    } else {
      location.hash = target;
    }
  }
  searchInput.addEventListener('input', debounce(runSearchRoute, 180));
  $('#search-form').addEventListener('submit', e => { e.preventDefault(); runSearchRoute(); });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!menu.el.hidden) { closeMenu(true); return; }
      if (document.querySelector('dialog[open]')) return;
      if (state.queueOpen) { setQueueOpen(false); ui.queueBtn.focus(); return; }
      if (document.body.classList.contains('sidebar-open')) { setSidebar(false); return; }
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    const typing = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]');
    if (typing) return;
    const interactive = e.target.closest && e.target.closest('button, a');

    if (e.key === '/') { e.preventDefault(); if (currentRoute.nav !== 'search') go('#/search'); searchInput.focus(); }
    else if (e.code === 'Space' && !interactive) { e.preventDefault(); player.toggle(); }
    else if (e.shiftKey && e.key === 'ArrowRight') { e.preventDefault(); player.next(); }
    else if (e.shiftKey && e.key === 'ArrowLeft') { e.preventDefault(); player.prev(); }
    else if (e.key === 'm' || e.key === 'M') player.toggleMute();
    else if ((e.key === 'l' || e.key === 'L') && player.current) toggleLike(player.current.id);
  });

  window.addEventListener('hashchange', () => {
    closeMenu(false);
    setSidebar(false);
    render();
  });

  mqCompact.addEventListener('change', () => {
    if (!mqCompact.matches) document.body.classList.remove('sidebar-open');
    applySidebarInert();
  });

  /* =====================================================
     Init
     ===================================================== */
  function init() {
    applyTheme(state.theme, false);
    renderSidebarPlaylists();
    updateCounts();
    bindPlayer();
    const restored = player.restore(S.get(S.KEYS.player, null));
    if (!restored) {
      player.setVolume(0.8);
      player.setQueue(D.trending(10).map(s => s.id), 0, { autoplay: false, source: 'chart:trending' });
    }
    renderPlayerTrack();
    renderPlayState();
    renderVolume();
    renderTime();
    applySidebarInert();
    if (!location.hash) history.replaceState(null, '', '#/home');
    render();
  }

  init();
})();
