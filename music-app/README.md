# Sóng — Music Streaming Prototype

A fully interactive music streaming frontend built with **HTML5, CSS3 and vanilla JavaScript (ES6+)**. No frameworks, no build step, no backend.

The design is original, inspired by general UX patterns from Zing MP3, NhacCuaTui, Spotify and Apple Music. It uses a night-sea navy palette with a lantern-gold accent, and the typeface is **Be Vietnam Pro**, which was designed for Vietnamese diacritics.

## Run it

1. Open `index.html` in a modern browser, **or**
2. In VS Code, right-click `index.html` → **Open with Live Server**.

An internet connection is needed for the demo audio streams and the Google Font. The rest of the UI works offline, falling back to system fonts.

## Features

- **Browse:** home (hero, recently played, trending, popular artists, recommended albums and playlists), Discover with genre filters, and album, artist and playlist detail pages
- **Search:** live results for songs, artists, albums and playlists, with a "top result" card and an empty state. Search is accent-insensitive, so `sai gon` finds *Sài Gòn Mơ* and `pho cu` finds *Phố Cũ*
- **Player:** play/pause, next/previous, seek, volume and mute, shuffle, repeat (off / all / one), auto-advance, a queue drawer (play next, add to queue, remove, clear), and OS media keys via the Media Session API
- **Playlists:** create, rename, delete, add and remove songs, play or shuffle an entire playlist
- **Favorites:** a heart on every song, plus a dedicated Favorites page
- **Recently played:** the last 24 songs, recorded when playback actually starts
- **Theme:** dark (default) and light, applied before first paint so there is no flash
- **Persistence (localStorage):** favorites, playlists, recently played, theme, volume, shuffle and repeat, plus the queue and playback position
- **Responsive:** desktop sidebar, a tablet off-canvas drawer, and on mobile a bottom tab bar, compact player and swipeable shelves
- **Accessible:** semantic landmarks, labelled controls, `aria-pressed` and `aria-expanded` states, keyboard-navigable menus and dialogs, visible focus rings, a skip link, and `prefers-reduced-motion` support

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play / pause |
| `Shift + →` / `Shift + ←` | Next / previous track |
| `M` | Mute / unmute |
| `L` | Favorite the current song |
| `/` | Focus search |
| `Esc` | Close menu, queue or sidebar |

## Project structure

```text
music-app/
├── index.html          App shell, icon sprite, player, dialogs
├── css/
│   └── style.css       Theme tokens (CSS variables), layout, components, responsive rules
├── js/
│   ├── music-data.js   Catalogue: 16 songs, 8 artists, 8 albums, 6 playlists; generated SVG artwork
│   ├── storage.js      Safe localStorage wrapper
│   ├── player.js       MusicPlayer class (HTML5 <audio>, queue, shuffle, repeat, events)
│   ├── components.js   HTML template helpers (cards, track lists, headers)
│   └── app.js          Router, views, event delegation, playlists and favorites, player UI
├── assets/
│   ├── images/         (empty: artwork is generated in code)
│   └── audio/          (drop your own audio files here)
└── README.md
```

Scripts are loaded as classic `<script>` tags rather than ES modules, so the app also works when opened directly from `file://`. Browsers block ES modules on that protocol.

## Content and licensing

- All artists, albums and song titles are **fictional**.
- Artwork is **generated SVG**, so no copyrighted images are included.
- Audio streams from the **SoundHelix** demo library (`soundhelix.com/examples/mp3/`), which offers royalty-free example tracks for testing. No audio is bundled with the project.

### Using your own audio

Put files in `assets/audio/` and change the `AUDIO` helper in `js/music-data.js`, for example:

```js
const AUDIO = n => `assets/audio/track-${n}.mp3`;
```

Real durations are read from each file's metadata the first time it loads, then cached.

## Resetting data

Open DevTools → Application → Local Storage and delete the keys starting with `song:`. Or run this in the console:

```js
AppStorage.clearAll(); location.reload();
```

## Tested

Playback, next and previous, seek, volume, shuffle and repeat, auto-advance and end-of-queue, the queue drawer, search (including the empty state and accent-free queries), the full playlist lifecycle, favorites, recently played, theme switching, persistence across reloads, every route including 404, and desktop, tablet and mobile layouts. There were no console errors and no broken images.
