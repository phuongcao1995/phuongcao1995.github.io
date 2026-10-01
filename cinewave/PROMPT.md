Create a **modern, responsive static movie/TV streaming web application** using **only HTML, CSS, and vanilla JavaScript**.

The application should simulate a real-world online entertainment platform similar in overall functionality to platforms such as **Netflix, FPT Play, TV360, and Vietnamese movie-streaming websites**, but use completely original branding, layouts, content names, and UI designs.

## 1. Technical Requirements

* Use **HTML5, CSS3, and vanilla JavaScript only**
* No React, Angular, Vue, Bootstrap, Tailwind, or other frameworks
* No backend
* No database
* No build tools
* The application must run directly by opening `index.html`
* Use JavaScript with mock/static data to simulate application behavior
* Use `localStorage` where useful for:

  * Watch history
  * Favorites
  * My List
  * User preferences
  * Continue Watching
* Responsive design:

  * Desktop
  * Laptop
  * Tablet
  * Mobile
* Use semantic HTML and clean, maintainable CSS/JS
* Organize the project clearly:

```text
/movie-streaming-app
│
├── index.html
├── movies.html
├── series.html
├── genres.html
├── movie-detail.html
├── watch.html
├── search.html
├── my-list.html
├── history.html
├── login.html
├── profile.html
│
├── css/
│   ├── style.css
│   ├── responsive.css
│   └── components.css
│
├── js/
│   ├── app.js
│   ├── data.js
│   ├── movies.js
│   ├── player.js
│   ├── search.js
│   ├── auth.js
│   └── storage.js
│
└── assets/
    ├── images/
    ├── icons/
    └── posters/
```

---

# 2. Branding

Create an original streaming service name such as:

**CineWave**

Use a modern entertainment-focused visual identity.

Do not copy Netflix, FPT Play, TV360, MọtPhim, or any other platform's:

* Logo
* Brand colors exactly
* Layout
* Text
* Images
* Icons
* Branding
* Copyrighted content

Use the referenced platforms only as **UX/product inspiration**.

---

# 3. Main Navigation

Create a responsive navigation bar containing:

* Logo
* Home
* Movies
* TV Series
* Genres
* Trending
* New Releases
* My List
* Search
* Language selector
* Notification icon
* User profile

Desktop navigation should have a full navbar.

Mobile navigation should transform into a compact mobile menu/bottom navigation.

---

# 4. Home Page

Create a rich streaming-service homepage.

### Hero Section

Display a large featured movie with:

* Background image
* Movie title
* Short description
* Genre
* Release year
* Duration
* Rating
* Quality badge such as `HD`, `4K`
* `Watch Now` button
* `Add to My List` button
* `More Info` button

Include an attractive gradient overlay so the text remains readable.

Add a carousel/slider allowing users to switch featured movies.

---

# 5. Movie Categories

Create horizontal movie sections similar to modern streaming platforms.

Examples:

### Trending Now

Movie cards with:

* Poster
* Title
* Year
* Rating
* Quality
* Movie type

### Popular Movies

### New Releases

### Top Rated

### Recommended For You

### Action

### Comedy

### Romance

### Horror

### Sci-Fi

### Vietnamese Movies

### Korean Movies

### Chinese Movies

### US Movies

Each section should support horizontal scrolling.

---

# 6. Movie Card

Create reusable movie cards.

Each card should display:

* Poster
* Movie title
* Year
* Rating
* Duration
* HD/4K badge
* Movie/Series badge

On hover:

* Slightly enlarge the card
* Show dark overlay
* Display:

  * Play button
  * Add to My List
  * Movie information
  * Rating
  * Description preview

Clicking a movie should open its detail page.

---

# 7. Movie Detail Page

Create a detailed movie information page.

Include:

* Large backdrop
* Poster
* Title
* Original title
* Vietnamese title
* Release year
* Country
* Genre
* Duration
* Rating
* Quality
* Age rating
* Director
* Actors
* Description
* Trailer button
* Watch Now button
* Add to My List button

Also include:

### Movie Information

Example:

```text
Country: Vietnam
Year: 2026
Genre: Action, Drama
Duration: 120 minutes
Quality: 4K
Audio: Vietnamese
Subtitle: Vietnamese, English
```

### Cast

Display actor cards.

### Trailer

Provide a simulated trailer section.

### Related Movies

Display recommended movies based on genre.

---

# 8. Watch Page / Video Player

Create a realistic movie-watching interface.

The player should contain:

* Play/Pause
* Progress bar
* Current time
* Duration
* Volume
* Mute
* Fullscreen
* Playback speed
* Quality selector
* Subtitle selector
* Next episode
* Skip intro
* Previous/Next episode

Use a sample public/demo video or simulated player behavior.

Do not use copyrighted movie streams.

Below the player display:

* Movie title
* Episode information
* Description
* Cast
* Related movies

---

# 9. TV Series

Create a dedicated TV Series experience.

Features:

* Series banner
* Series description
* Seasons
* Episodes
* Episode thumbnails
* Episode duration
* Episode progress
* Continue Watching

Example:

```text
Season 1

Episode 1 — The Beginning
Episode 2 — The Journey
Episode 3 — The Secret
Episode 4 — The Return
```

Allow users to select seasons and episodes.

---

# 10. Continue Watching

Create a section showing partially watched movies/episodes.

Each card should include:

* Poster
* Title
* Progress bar
* Percentage watched
* Remaining time
* Continue button

Store progress using `localStorage`.

Example:

```text
The Last Journey
████████░░ 72%
32 minutes remaining
[Continue Watching]
```

---

# 11. My List

Allow users to add/remove movies from their personal list.

Features:

* Add to My List
* Remove from My List
* Filter
* Sort
* Empty-state screen

Persist the list using `localStorage`.

---

# 12. Search

Create a powerful search interface.

Search by:

* Movie title
* Actor
* Director
* Genre
* Country
* Year

Add filters:

```text
Genre
Country
Year
Rating
Movie / Series
Quality
```

Include:

* Search suggestions
* Recent searches
* Popular searches
* Search results
* No-results state

Implement the search entirely with JavaScript and mock data.

---

# 13. Genre Page

Create a genre browsing page.

Display genres such as:

* Action
* Adventure
* Animation
* Comedy
* Crime
* Drama
* Fantasy
* Horror
* Romance
* Sci-Fi
* Thriller
* Documentary
* Family

Clicking a genre should display matching movies.

---

# 14. User Profile

Create a simple profile system using localStorage.

Profile page should include:

* Avatar
* Name
* Email
* Preferred language
* Watch history
* My List
* Continue Watching
* Settings

Create multiple demo profiles such as:

```text
Personal
Kids
Guest
```

Allow profile switching.

---

# 15. Kids Mode

Create a simplified Kids Mode.

Features:

* Child-friendly movie categories
* Animation
* Family
* Educational
* No mature content
* Large cards
* Simple navigation

Add a simple profile switcher between normal mode and Kids Mode.

---

# 16. Login / Register UI

Create a simulated authentication interface.

Pages:

### Login

Fields:

* Email
* Password
* Remember me
* Login button
* Forgot password

### Register

Fields:

* Name
* Email
* Password
* Confirm password

Since there is no backend, simulate authentication using `localStorage`.

Clearly treat this as demo authentication and never imply that real credentials are securely stored.

---

# 17. Subscription / Membership Page

Create a simulated subscription page.

Plans:

### Free

* Limited content
* Standard quality
* Ads simulation

### Standard

* Full catalog
* Full HD
* Multiple devices

### Premium

* 4K
* Multiple devices
* Premium content

Display:

* Monthly price
* Features
* Device limits
* Video quality

Buttons should simulate selecting a plan without processing real payments.

---

# 18. Notifications

Create a notification dropdown.

Examples:

```text
New episode available
Your movie is now available in 4K
New movies added this week
Your watchlist has been updated
```

Allow notifications to be marked as read.

---

# 19. Watch History

Create a history page containing:

* Recently watched
* Watch date
* Movie title
* Episode
* Progress

Allow:

* Remove item
* Clear history
* Continue watching

Use localStorage.

---

# 20. Responsive Design

The application must work well on:

### Desktop

* Large hero banner
* Multiple movie cards per row
* Sidebar/filter layouts

### Tablet

* Reduced number of cards
* Responsive navigation

### Mobile

* Mobile navigation
* 2-column movie grid
* Compact cards
* Touch-friendly controls
* Full-screen video player
* Mobile search

Do not simply shrink the desktop UI. Create an appropriate mobile experience.

---

# 21. UI/UX Requirements

Use a modern streaming-service design.

Characteristics:

* Dark theme by default
* Clean typography
* Large movie artwork
* Rounded cards
* Subtle animations
* Smooth hover effects
* Gradient overlays
* Clear call-to-action buttons
* Good spacing
* Strong visual hierarchy

Include:

* Loading skeletons
* Empty states
* Error states
* Toast notifications
* Modal dialogs
* Tooltips
* Hover effects
* Smooth transitions

---

# 22. Mock Movie Dataset

Create at least **40–60 mock movies/series**.

Each item should contain:

```javascript
{
    id: 1,
    title: "The Last Journey",
    originalTitle: "The Last Journey",
    type: "movie",
    year: 2026,
    duration: 124,
    rating: 8.4,
    genres: ["Action", "Drama"],
    country: "Vietnam",
    quality: ["HD", "4K"],
    ageRating: "13+",
    director: "Example Director",
    cast: [
        "Actor One",
        "Actor Two"
    ],
    description: "Movie description...",
    poster: "...",
    backdrop: "...",
    trailer: "...",
    video: "..."
}
```

Include a mixture of:

* Vietnamese
* Korean
* Chinese
* Japanese
* US
* European

movies and series.

Use fictional titles/data or appropriately licensed/public-domain/demo assets.

---

# 23. JavaScript Functionality

Implement real frontend interactions including:

* Movie filtering
* Movie searching
* Genre filtering
* Sorting
* Carousel
* Modal
* Video player controls
* Add/remove My List
* Watch history
* Continue Watching
* Progress tracking
* Profile switching
* Theme settings
* Notifications
* Login simulation
* Subscription selection
* Toast notifications
* Responsive navigation

Avoid unnecessary JavaScript complexity.

Use reusable functions and components where possible.

---

# 24. Accessibility

Implement:

* Semantic HTML
* Keyboard navigation
* Visible focus states
* ARIA labels where appropriate
* Sufficient contrast
* Accessible buttons
* Alt text for images
* Captions/subtitle controls in the demo player

---

# 25. Performance

Optimize the static application:

* Lazy-load images
* Avoid unnecessary DOM manipulation
* Use efficient event listeners
* Avoid duplicated JavaScript
* Keep CSS organized
* Use reusable movie-card rendering functions
* Minimize unnecessary animations

---

# 26. Demo Data and Assets

Do not depend on copyrighted movie content.

Use:

* Placeholder images
* Public/demo images
* Fictional movie data
* Demo videos
* Generated gradient backgrounds where appropriate

The application should still look realistic even when using mock data.

---

# 27. Final Expected Result

The final application should feel like a **real-world Vietnamese online entertainment platform**, including:

```text
Home
 ├── Hero Banner
 ├── Trending
 ├── Continue Watching
 ├── Popular Movies
 ├── New Releases
 ├── Recommended
 └── Genres

Movies
 ├── All Movies
 ├── Filter
 ├── Sort
 └── Search

TV Series
 ├── Popular Series
 ├── New Series
 ├── Seasons
 └── Episodes

Movie Detail
 ├── Information
 ├── Trailer
 ├── Cast
 ├── Watch
 └── Related Movies

Watch
 ├── Video Player
 ├── Episodes
 ├── Subtitle
 ├── Quality
 └── Recommendations

My List
History
Search
Profiles
Kids Mode
Subscription
Settings
```

Focus on making the application **visually polished, realistic, responsive, and highly interactive**, while keeping the implementation strictly **HTML + CSS + vanilla JavaScript**.

The result should look like a portfolio-quality frontend project that demonstrates practical skills in:

* UI/UX
* Responsive web design
* JavaScript
* DOM manipulation
* State management with localStorage
* Search/filtering
* Media-player interfaces
* Reusable components
* Accessibility
* Real-world web application architecture
