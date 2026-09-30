# CineWave

A fictional movie / TV streaming web app — **HTML + CSS + vanilla JavaScript only**, no build step, no backend.
Open `index.html` (or serve the folder) and it runs.

## Highlights
- 52 fictional titles (movies + series, Vietnam / Korea / China / Japan / US / Europe); posters, backdrops and episode thumbnails are generated SVG data-URIs.
- Home hero carousel, horizontal rows, Continue Watching, recommendations, genre browsing, filters + sorting, search with suggestions, recent/popular searches.
- Series: seasons, episodes, per-episode progress. Custom player: seek, volume, speed, quality, demo captions, skip intro, prev/next episode, keyboard shortcuts, fullscreen. Falls back to simulated playback if the public sample clips can't be reached.
- Profiles (Personal / Kids / Guest) with separate My List and history; **Kids Mode** hides mature titles and enlarges the UI.
- Demo-only login/register, membership plans (Free shows a simulated ad; higher tiers unlock titles/4K), notifications, light/dark theme, EN/VI labels.
- State lives in `localStorage` under the `cw:` prefix (Profile → Settings → *Reset demo data* clears it).

## Layout
`css/` style (tokens/layout) · components · responsive — `js/` storage · data · app (shared shell/components) · movies (browse pages) · player · search · auth (login, profile, plans).

Demo notes: authentication is simulated and not secure; no payments are processed; sample video clips are open-licence (Blender Foundation CC-BY, MDN CC0).
