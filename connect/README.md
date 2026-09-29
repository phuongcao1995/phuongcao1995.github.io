# Connect — social network prototype

A static, framework-free social network UI. Open `index.html` in any modern browser; no server or build step is needed.

## Structure

```
connect/
├── index.html        App shell, icon sprite, top bar, sidebars, mobile nav
├── css/style.css     Design tokens (light + dark), components, responsive rules
├── js/app.js         Mock data, rendering, routing and all interactions
└── assets/
    ├── logo.svg, favicon.svg
    └── photos/       Original illustrated photos used by posts, stories and covers
```

## How the code is organised (js/app.js)

1. **Mock data** – `users`, `posts`, `stories`, `conversations`, `notifications`, `events`, `groups`, `rel` (friendships).
2. **Helpers** – formatting, accent-insensitive search (`normalize`), storage.
3. **UI primitives** – `openModal`, `confirmDialog`, `openMenu`, dropdowns, `toast`.
4. **Components** – pure functions returning HTML strings (`postHTML`, `notifHTML`, `personCardHTML`…).
5. **Views** – hash router (`#/feed`, `#/profile/u3`, `#/messages/c1`, `#/search/hoi an`…).
6. **Features** – reactions, comments, sharing, polls, stories, composer, friends, messaging.
7. **Actions** – one delegated click handler maps `data-action="…"` to functions.

To connect a backend, replace the data arrays and mutation helpers (`reactTo`, `addComment`, `sendMessage`, `addFriend`…) with API calls; views only read from the data objects.

Data resets on reload. Theme, settings and recent searches are kept in localStorage when the browser allows it.
