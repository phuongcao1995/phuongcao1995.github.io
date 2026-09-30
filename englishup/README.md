# EnglishUp — Learn English. Speak with Confidence.

A static, frontend-only English learning web app for Vietnamese learners.
Pure HTML5, CSS3 and vanilla JavaScript — no frameworks, no build step.

## Run it
Open `index.html` in any modern browser (Chrome, Edge, Safari, Firefox). That's it.
For the best audio experience use Chrome or Edge (better English voices).

**Demo account:** `phuong@englishup.vn` / `demo123` (or register a new account, or use the simulated Google sign-in).

## Pages
| Page | File |
|---|---|
| Landing page, features, testimonials, pricing | `index.html` |
| Login + forgot password / Register | `login.html`, `register.html` |
| Level test (A1–C2) | `level-test.html` |
| Student dashboard | `dashboard.html` |
| Courses / Course detail / Lesson player | `courses.html`, `course-detail.html`, `lesson.html` |
| AI Pronunciation Coach | `pronunciation.html` |
| Speaking practice (10 scenarios) | `speaking.html` |
| Vocabulary builder (5 modes, spaced repetition) | `vocabulary.html` |
| Grammar / Listening | `grammar.html`, `listening.html` |
| Live classes marketplace / Teacher profile & booking | `live-classes.html`, `teacher.html` |
| AI English Tutor / AI Writing Checker | `ai-tutor.html`, `writing-checker.html` |
| Progress analytics / Achievements & leaderboard | `progress.html`, `achievements.html` |
| Practice hub + daily challenge | `practice.html` |
| Profile, subscription & settings | `profile.html` (`#subscription`, `#settings`) |

## How the "AI" and audio work in this demo
- **Audio** uses the browser's Web Speech API (text-to-speech), respecting the Sound and Playback speed settings.
- **Recording & pronunciation scoring are simulated.** The first attempt at "I would like to improve my English." always returns the reference result (87 / 92 / 81 / 88 with a tip on "to").
- **Speaking practice** uses real speech recognition when the browser supports it over http(s); otherwise (e.g. opened as a local file) it simulates your answer.
- **Tutor & writing checker** use a rule-based engine (`DATA.grammarRules`) for common mistakes Vietnamese learners make, plus vocabulary/naturalness dictionaries. Vietnamese translation covers the built-in sample sentences.
- Bookings, payments and Google login are simulated. Nothing leaves your browser.

## Data & state
- All demo content lives in `js/data.js` (17 courses, 30 detailed lessons, 50 words, 20+ grammar questions, 20 listening questions, 10 scenarios, 10 teachers, 10 achievements, 10 notifications).
- Progress is saved in `localStorage` (`englishup_state`, `englishup_users`). Use **Profile → Settings → Reset demo data** to start over.

## Structure
```
css/  style.css (tokens, dark theme, layout) · components.css · pages.css · responsive.css
js/   utils.js · data.js · app.js (state, shell, XP, grammar engine, landing)
      auth.js · dashboard.js · courses.js · lessons.js · vocabulary.js · pronunciation.js
      speaking.js · grammar.js · listening.js · classes.js · tutor.js · progress.js · profile.js
```

## Features
Dark mode, Vietnamese/English hint toggle (header), global search, notifications, XP levels (Beginner → Fluent),
badges, streaks, daily challenge (+100 XP), responsive layout (desktop sidebar, tablet icon rail, mobile bottom nav),
keyboard navigation, focus states, ARIA labels and reduced-motion support.
