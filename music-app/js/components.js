/* =========================================================
   components.js
   Pure template helpers that turn data into HTML strings.
   No event handling lives here; app.js wires everything up
   through data-action attributes (event delegation).
   Exposed as window.Components
   ========================================================= */
(function () {
  'use strict';

  const D = window.MusicData;
  const ctx = { isLiked: () => false };

  function init(options) { Object.assign(ctx, options); }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));

  const icon = (name, cls = '') =>
    `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

  const playIcons = () => icon('play', 'ico-play') + icon('pause', 'ico-pause');

  const idList = list => list.map(s => (typeof s === 'object' ? s.id : s)).join(',');

  function likeButton(song, cls = '') {
    const liked = ctx.isLiked(song.id);
    return `<button type="button" class="icon-btn like-btn ${cls}" data-action="toggle-like" data-id="${song.id}" data-like-id="${song.id}" aria-pressed="${liked}" aria-label="Favorite ${esc(song.title)}">${icon('heart', 'ico-heart')}${icon('heart-fill', 'ico-heart-fill')}</button>`;
  }

  /* ---------- cards ---------- */
  function songCard(song) {
    return `<article class="card song-card" data-song-id="${song.id}">
      <div class="card__art">
        <img src="${song.cover}" alt="" loading="lazy" width="200" height="200">
        <span class="play-fab" aria-hidden="true">${playIcons()}</span>
      </div>
      <h3 class="card__title"><button type="button" class="card__hit" data-action="play-song" data-id="${song.id}" aria-label="Play ${esc(song.title)} by ${esc(song.artist)}">${esc(song.title)}</button></h3>
      <p class="card__sub"><a href="#/artist/${song.artistId}">${esc(song.artist)}</a></p>
    </article>`;
  }

  function albumCard(album) {
    return `<article class="card">
      <div class="card__art">
        <img src="${album.cover}" alt="" loading="lazy" width="200" height="200">
        <button type="button" class="play-fab" data-action="play-collection" data-type="album" data-id="${album.id}" data-source-key="album:${album.id}" aria-label="Play album ${esc(album.title)}">${playIcons()}</button>
      </div>
      <h3 class="card__title"><a class="card__link" href="#/album/${album.id}">${esc(album.title)}</a></h3>
      <p class="card__sub"><span>${album.year}</span><a href="#/artist/${album.artistId}">${esc(album.artist)}</a></p>
    </article>`;
  }

  function artistCard(artist) {
    return `<article class="card card--artist">
      <div class="card__art">
        <img src="${artist.image}" alt="" loading="lazy" width="200" height="200">
        <button type="button" class="play-fab" data-action="play-collection" data-type="artist" data-id="${artist.id}" data-source-key="artist:${artist.id}" aria-label="Play ${esc(artist.name)}">${playIcons()}</button>
      </div>
      <h3 class="card__title"><a class="card__link" href="#/artist/${artist.id}">${esc(artist.name)}</a></h3>
      <p class="card__sub">${esc(artist.genre)}</p>
    </article>`;
  }

  /** Artwork for a user playlist: 2×2 mosaic, single cover or placeholder */
  function userArt(pl) {
    const covers = [...new Set(pl.songIds.map(id => (D.getSong(id) || {}).cover).filter(Boolean))];
    if (covers.length >= 4) {
      return `<span class="mosaic">${covers.slice(0, 4).map(c => `<img src="${c}" alt="" loading="lazy">`).join('')}</span>`;
    }
    if (covers.length) return `<img src="${covers[0]}" alt="" loading="lazy">`;
    const [c1, c2] = pl.colors || ['#1e3a8a', '#f2b544'];
    return `<span class="art-placeholder" style="--c1:${c1};--c2:${c2}">${icon('music')}</span>`;
  }

  /** pl is a normalised playlist: {id, title, description, songIds, isUser, cover, colors} */
  function playlistCard(pl) {
    const art = pl.isUser ? userArt(pl) : `<img src="${pl.cover}" alt="" loading="lazy" width="200" height="200">`;
    const sub = pl.isUser ? `${pl.songIds.length} ${pl.songIds.length === 1 ? 'song' : 'songs'}` : esc(pl.description);
    return `<article class="card card--playlist">
      <div class="card__art">
        ${art}
        <button type="button" class="play-fab" data-action="play-collection" data-type="playlist" data-id="${pl.id}" data-source-key="playlist:${pl.id}" aria-label="Play playlist ${esc(pl.title)}">${playIcons()}</button>
      </div>
      <h3 class="card__title"><a class="card__link" href="#/playlist/${pl.id}">${esc(pl.title)}</a></h3>
      <p class="card__sub card__sub--clamp">${sub}</p>
    </article>`;
  }

  /* ---------- track list ---------- */
  function trackRow(s, i, o) {
    return `<li class="track" data-song-id="${s.id}">
      <button type="button" class="track__lead" data-action="play-song" data-id="${s.id}" aria-label="Play ${esc(s.title)} by ${esc(s.artist)}">
        <span class="track__num">${i + 1}</span>${playIcons()}<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
      <div class="track__main">
        ${o.showCover ? `<img class="track__cover" src="${s.cover}" alt="" loading="lazy" width="44" height="44">` : ''}
        <div class="track__text">
          <span class="track__title">${esc(s.title)}</span>
          <a class="track__artist" href="#/artist/${s.artistId}">${esc(s.artist)}</a>
        </div>
      </div>
      ${o.showAlbum ? `<a class="track__album" href="#/album/${s.albumId}">${esc(s.album)}</a>` : ''}
      ${likeButton(s, 'track__like')}
      <span class="track__dur" data-dur-id="${s.id}">${D.formatTime(s.duration)}</span>
      <button type="button" class="icon-btn track__more" data-action="song-menu" data-id="${s.id}" aria-haspopup="menu" aria-expanded="false" aria-label="More options for ${esc(s.title)}">${icon('more')}</button>
    </li>`;
  }

  function trackList(songs, { source = '', showAlbum = true, showCover = true, compact = false, split = false, playlistId = null } = {}) {
    if (!songs.length) return '';
    const cls = ['tracks', compact && 'tracks--compact', !showAlbum && 'tracks--no-album', split && 'tracks--split'].filter(Boolean).join(' ');
    const rows = Math.ceil(songs.length / 2);
    return `<ol class="${cls}" style="--rows:${rows}" data-queue="${idList(songs)}" data-source="${esc(source)}"${playlistId ? ` data-playlist="${playlistId}"` : ''}>
      ${songs.map((s, i) => trackRow(s, i, { showAlbum, showCover })).join('')}
    </ol>`;
  }

  /* ---------- layout pieces ---------- */
  function shelf(itemsHtml, { queue = null, source = '' } = {}) {
    const attrs = queue ? ` data-queue="${idList(queue)}" data-source="${esc(source)}"` : '';
    return `<div class="shelf-row"${attrs}>${itemsHtml.join('')}</div>`;
  }

  function section({ id, title, sub = '', href = '', scroll = false, body = '' }) {
    const scrollBtns = scroll
      ? `<button type="button" class="icon-btn icon-btn--sm scroll-btn" data-action="scroll-shelf" data-dir="-1" aria-label="Scroll ${esc(title)} left">${icon('chevron-left')}</button>
         <button type="button" class="icon-btn icon-btn--sm scroll-btn" data-action="scroll-shelf" data-dir="1" aria-label="Scroll ${esc(title)} right">${icon('chevron-right')}</button>`
      : '';
    return `<section class="section" aria-labelledby="${id}">
      <div class="section__head">
        <div>
          <h2 class="section__title" id="${id}">${esc(title)}</h2>
          ${sub ? `<p class="section__sub">${esc(sub)}</p>` : ''}
        </div>
        <div class="section__tools">${href ? `<a class="link-all" href="${href}">Show all</a>` : ''}${scrollBtns}</div>
      </div>
      ${body}
    </section>`;
  }

  function pageHead({ kicker = '', title, sub = '', actions = '' }) {
    return `<header class="page-head">
      <div>
        ${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ''}
        <h1 class="page-head__title" tabindex="-1" data-page-title>${esc(title)}</h1>
        ${sub ? `<p class="page-head__sub">${sub}</p>` : ''}
      </div>
      ${actions ? `<div class="page-head__actions">${actions}</div>` : ''}
    </header>`;
  }

  function collectionHead({ kicker, title, sub = '', meta = '', art, colors, round = false, sourceKey = '' }) {
    const [c1, c2] = colors;
    return `<header class="collection-head" style="--c1:${c1};--c2:${c2}"${sourceKey ? ` data-source-key="${sourceKey}"` : ''}>
      <div class="collection-head__art${round ? ' is-round' : ''}">${art}</div>
      <div class="collection-head__info">
        <p class="kicker kicker--light">${esc(kicker)}</p>
        <h1 class="collection-head__title" tabindex="-1" data-page-title>${esc(title)}</h1>
        ${sub ? `<p class="collection-head__sub">${sub}</p>` : ''}
        ${meta ? `<p class="collection-head__meta">${meta}</p>` : ''}
      </div>
    </header>`;
  }

  function emptyState({ icon: ic = 'music', title, text = '', action = '' }) {
    return `<div class="empty">
      <span class="empty__icon">${icon(ic)}</span>
      <h3 class="empty__title">${esc(title)}</h3>
      ${text ? `<p class="empty__text">${text}</p>` : ''}
      ${action}
    </div>`;
  }

  window.Components = {
    init, esc, icon, playIcons, idList, likeButton,
    songCard, albumCard, artistCard, playlistCard, userArt,
    trackList, shelf, section, pageHead, collectionHead, emptyState,
  };
})();
