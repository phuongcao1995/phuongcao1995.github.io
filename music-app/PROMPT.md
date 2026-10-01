Create a modern **music streaming web application** using only **HTML, CSS, and vanilla JavaScript**.

The website should be inspired by the overall user experience of popular music platforms such as **Zing MP3, NhacCuaTui, Spotify, and Apple Music**, but do **not** copy their branding, logos, copyrighted assets, or exact UI. Create an original design that combines the best general UX patterns from these platforms.

## 1. Main Goal

Build a polished, responsive music-listening website where users can:

* Browse music
* Search for songs, artists, and albums
* Play/pause music
* Skip to next/previous track
* Control volume
* Seek through a song
* View playlists
* Browse albums and artists
* Like/favorite songs
* Create and manage playlists
* View recently played songs
* Switch between light and dark themes

The result should look like a **real production-quality music streaming website**, not a basic HTML demo.

## 2. Technology Requirements

Use:

* HTML5
* CSS3
* Vanilla JavaScript (ES6+)

Do NOT use:

* React
* Vue
* Angular
* TypeScript
* Backend frameworks

You may use CDN-based libraries only when they provide meaningful UI functionality.

Keep the project simple and easy to run locally by opening `index.html` or using VS Code Live Server.

## 3. Page Layout

Create a responsive layout with three main areas:

### Left Sidebar

Include:

* Logo / application name
* Home
* Discover
* Search
* Library
* Favorites
* Recently Played
* Playlists
* Albums
* Artists

Add a "Your Playlists" section containing several sample playlists.

The sidebar should be collapsible on smaller screens.

### Main Content

Create a modern music discovery homepage containing:

#### Hero Section

A large featured music banner with:

* Album artwork
* Song/album title
* Artist
* Short description
* "Play Now" button
* "Add to Playlist" button

#### Recently Played

Display recently played songs as horizontal cards.

#### Trending Music

Show popular songs with:

* Cover image
* Song title
* Artist
* Duration
* Play button

#### Popular Artists

Display circular artist images and artist names.

#### Recommended Albums

Display album cards containing:

* Album cover
* Album title
* Artist
* Release year

#### Recommended Playlists

Display visually attractive playlist cards.

## 4. Music Player

Create a **fixed music player at the bottom of the screen**.

It should contain:

### Left

* Album artwork
* Song title
* Artist
* Favorite button

### Center

* Previous button
* Play/Pause button
* Next button
* Shuffle
* Repeat
* Progress bar
* Current time
* Total duration

### Right

* Volume control
* Queue button
* Additional options button

The player must actually work with sample audio files or publicly available demo audio URLs.

Implement:

* Play/pause
* Next/previous
* Seek
* Volume control
* Progress updates
* Song duration
* Automatic next-song playback
* Shuffle
* Repeat
* Queue

Use the HTML5 `<audio>` API.

## 5. Search

Implement a functional search interface.

Users should be able to search:

* Songs
* Artists
* Albums
* Playlists

Show search results dynamically without reloading the page.

Example:

Search for:

`Perfect`

Results should display matching songs, artists, and albums.

Add an empty-state message when there are no results.

## 6. Music Data

Create a JavaScript data structure containing sample music data.

For example:

```javascript
const songs = [
    {
        id: 1,
        title: "Song Title",
        artist: "Artist Name",
        album: "Album Name",
        duration: 245,
        cover: "...",
        audio: "..."
    }
];
```

Include at least:

* 15 songs
* 8 artists
* 8 albums
* 5 playlists

Use realistic sample data, preferably a mixture of Vietnamese and international music.

Do not use copyrighted audio files bundled with the project.

## 7. Playlist Functionality

Allow users to:

* Create a playlist
* Rename a playlist
* Delete a playlist
* Add songs to a playlist
* Remove songs from a playlist
* Play an entire playlist

Persist playlists using `localStorage`.

## 8. Favorites

Users should be able to click a heart/favorite button to:

* Add a song to favorites
* Remove a song from favorites

Persist favorite songs using `localStorage`.

Create a dedicated **Favorites** page/section.

## 9. Recently Played

Whenever a song is played, store it in the recently played list.

Display the latest songs in the "Recently Played" section.

Use `localStorage` so the data survives page refreshes.

## 10. Theme

Support:

* Dark mode
* Light mode

Dark mode should be the default.

Store the user's theme preference using `localStorage`.

Use CSS variables for the theme:

```css
:root {
    --background: ...;
    --surface: ...;
    --primary: ...;
    --text-primary: ...;
    --text-secondary: ...;
}
```

## 11. Visual Design

Create a premium modern music-streaming aesthetic.

Design characteristics:

* Dark background
* Subtle gradients
* Large album artwork
* Rounded cards
* Smooth hover effects
* Subtle shadows
* Clear typography
* Modern iconography
* Consistent spacing
* Smooth transitions
* Responsive layout

Use a strong accent color for important actions such as Play, Like, and selected navigation items.

Avoid making the design look like a direct Spotify/Zing/Nhaccuatui clone.

## 12. Responsive Design

The website must work well on:

* Desktop
* Laptop
* Tablet
* Mobile

On mobile:

* Collapse the sidebar
* Use a mobile-friendly navigation
* Make the music player compact
* Allow horizontal scrolling for music cards
* Keep buttons large enough for touch interaction

## 13. Animations

Add subtle animations for:

* Card hover
* Play button
* Favorite button
* Sidebar transitions
* Page/section transitions
* Music player interactions
* Album artwork while music is playing

Do not overuse animations.

## 14. Accessibility

Include:

* Semantic HTML
* Proper button labels
* Keyboard-friendly controls
* Visible focus states
* Sufficient color contrast
* `aria-label` where appropriate

## 15. Code Structure

Organize the project like this:

```text
music-app/
│
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── player.js
│   ├── music-data.js
│   └── storage.js
├── assets/
│   ├── images/
│   └── audio/
└── README.md
```

Keep JavaScript modular and avoid putting the entire application into one huge file.

## 16. Important UX Requirements

The application should feel like a real music streaming service.

For example:

1. User opens the website.
2. They see recommended music.
3. They click a song.
4. The bottom music player starts playing.
5. They can continue browsing while the music plays.
6. They can search for another song.
7. They can add songs to Favorites or Playlists.
8. Refreshing the page should preserve Favorites, Playlists, Recently Played, and Theme.

## 17. Final Quality Requirements

Before finishing:

* Test all buttons.
* Test music playback.
* Test search.
* Test favorites.
* Test playlists.
* Test localStorage.
* Test responsive layout.
* Test dark/light mode.
* Test next/previous track.
* Test progress and volume controls.
* Fix console errors.
* Make sure there are no broken images or links.
* Make sure the UI looks polished on both desktop and mobile.

The final result should be a **fully interactive music streaming frontend prototype**, not just a static landing page.

Start by creating the complete project structure and then implement the UI and functionality step by step.
