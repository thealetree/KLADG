# KLADG Radio — Project Spec

## Overview

KLADG Radio is a minimal, black-and-white music streaming site for ~100+ original tracks. It functions as a personal radio station with a distinctive scroll-wheel browser, user playlists, a global rating system, and shareable track links.

**Live URL:** `kladg.com` (custom domain → GitHub Pages)
**Repo:** `thealetree/kladg-radio`

---

## Stack

- **Frontend:** React (Vite), static build, deployed to GitHub Pages via Actions
- **Auth:** Firebase Anonymous Auth (persistent UID, no sign-up required)
- **Database:** Firebase Firestore (playlists, ratings)
- **Audio hosting:** Internet Archive (direct MP4 URLs, free, no bandwidth limits)
- **Art images:** Stored in repo under `public/art/` (original graphic art, randomly paired with tracks)
- **Fonts:** Google Fonts — use Manrope or Satoshi. Light/thin weights for display, regular for labels. Do NOT use Inter, Roboto, or Arial.
- **Icons:** Lucide React, thin stroke weight

Use the existing Firebase project already set up for wanderingwojo. All Firebase config (Firestore, Auth) lives in a shared `firebase.js` util.

---

## Design Spec

- Background: `#000000`
- Text/lines: `#ffffff`
- No color anywhere except album art
- All borders/dividers: 1px solid white only, never thicker
- Hover/active states: opacity transitions only (no color changes)
- Mobile-first, single column, responsive
- The overall feel should be: elegant, minimal, confident. Think high-end gallery, not startup landing page.
- Subtle branding: "KLADG Radio" in thin uppercase tracking at top of page, small. Tagline area can say "now playing" contextually.

---

## Data Model

### Static JSON (in repo)

**`src/data/tracks.json`**
```json
[
  {
    "id": "track-001",
    "title": "Song Title",
    "duration": 214,
    "archiveUrl": "https://archive.org/download/item-id/filename.mp4",
    "artId": "art-012",
    "tags": []
  }
]
```

- `id`: URL-safe slug, used in routes and Firestore
- `tags`: empty array at launch, will be populated later for filtering
- `artId`: maps to an entry in `art.json`
- `duration`: in seconds

**`src/data/art.json`**
```json
[
  {
    "id": "art-012",
    "filename": "art-012.jpg"
  }
]
```

Art images live in `public/art/`. They are randomly assigned to tracks in the JSON — the pairing doesn't need to be meaningful, just visually distinctive.

### Firestore Schema

**Ratings (global, aggregated):**
```
ratings/{trackId} → {
  totalScore: number,
  totalVotes: number,
  average: number
}
```

**User ratings:**
```
users/{uid}/ratings/{trackId} → {
  score: number (1-5),
  ratedAt: timestamp
}
```

**User playlists:**
```
users/{uid}/playlists/{playlistId} → {
  name: string,
  trackIds: string[],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Firestore security rules:**
- Users can read/write their own `users/{uid}/**` docs (where `request.auth.uid == uid`)
- `ratings/{trackId}` is readable by all authenticated users
- `ratings/{trackId}` is writable via a Cloud Function OR use a Firestore transaction: read user's existing vote, update the aggregate atomically. Users should be able to change their rating (subtract old score, add new score in a transaction).

---

## Page Layout (Single Page App)

The page is one continuous view with two sections. No page transitions.

### Top: Radio Player (always visible, fixed/sticky top)

This is the primary interface. It should feel like the whole site when browse is collapsed.

```
┌─────────────────────────────────┐
│         KLADG RADIO             │  ← thin uppercase, tracked out
│                                 │
│      ┌─────────────────┐        │
│      │                 │        │
│      │    Album Art    │        │
│      │   (large, sq)   │        │
│      │                 │        │
│      └─────────────────┘        │
│                                 │
│        Song Title               │  ← thin weight, centered
│                                 │
│     ◀     ●     ▶               │  ← prev, play/pause, next (Lucide icons)
│                                 │
│ ─────────●──────────────────── │  ← 1px progress line, full width
│                                 │
│  0:42              3:14         │  ← elapsed / total, small mono text
│                                 │
│   [share]  [+ playlist]  [♡ rate]  [queue]  │  ← small icon row
│                                 │
│   UP NEXT: Track Name → ✕       │  ← only visible when queue has items
│                                 │
└─────────────────────────────────┘
```

**Transport controls:**
- Play/pause (center, slightly larger)
- Previous: go to previous track (in queue, playlist, or random history)
- Next: skip to next track (pulls from queue first, then playlist order, then random)

**Progress bar:**
- 1px white line spanning full width
- Small circle indicator for current position
- Tappable/clickable to scrub
- Elapsed time left-aligned, total time right-aligned, small monospace text

**Action icons (below transport):**
- **Share:** copies `kladg.com/#/track/{id}` to clipboard, shows brief "copied" toast
- **Add to playlist:** opens small dropdown of user's playlists, tap to add current track
- **Rate:** opens a minimal 1-5 star/dot rating UI inline, shows current global average
- **Queue:** opens the Up Next queue view

### Bottom: Browse Wheel (expandable)

Collapsed by default. User pulls up / taps a "browse" handle to reveal.

**The Scroll Wheel (iOS date-picker style):**
- Tracks scroll vertically in a 3D cylindrical perspective
- Center item is large, focused, and fully opaque
- Items above and below curve away with `rotateX` transforms and fade in opacity
- Each item shows: art thumbnail (small square) + track title + global rating (small stars or dots)
- Tapping the center/focused item loads it into the radio player
- Long-press or tap "+" on center item adds it to the Up Next queue
- Scroll is momentum-based with snap-to-center (use `requestAnimationFrame` for smooth physics, CSS `perspective` + `rotateX` per item)
- Slight rubber-band effect at top and bottom bounds

**Above the wheel — controls:**
- **Search bar:** text input that filters the wheel contents in real time
- **Sort toggle:** two modes accessible via small toggle or segmented control:
  - "Random" (default) — shuffled order
  - "Top Rated" — sorted by global average rating descending
- **Filter pills** (future): when tags exist, horizontal scrolling pill buttons appear here to filter by mood/vibe

```
┌─────────────────────────────────┐
│  [Search...]                    │
│  (Random) (Top Rated)           │
│                                 │
│       ~~  track 97  ~~          │  ← faded, rotated away
│      ~  track 34  ~             │  ← slightly faded
│    ▶ [ art ] Track 12  ★4.2    │  ← CENTER: focused, full size
│      ~  track 88  ~             │  ← slightly faded
│       ~~  track 03  ~~          │  ← faded, rotated away
│                                 │
└─────────────────────────────────┘
```

---

## Features

### 1. Radio Mode (Core)

- On site load (no hash route), pick a random track and start playing
- After a track ends, play the next track from:
  1. **Up Next queue** (if items exist) — play and remove from queue
  2. **Playlist order** (if in playlist mode) — advance to next track
  3. **Random** — pick a random track not recently played (keep a short history buffer of ~20 to avoid repeats)
- Maintain a "recently played" history so the Previous button works (navigate backward through play history)

### 2. Up Next Queue

- Users can add tracks to a queue from the browse wheel or from the radio player's add-to-queue action
- Queue is displayed as a small expandable list below the radio transport (or in a slide-over panel)
- Tracks in queue show title + art thumbnail, with a ✕ to remove
- Drag to reorder queue items
- Once the queue is empty, radio returns to random (or playlist order if in playlist mode)
- Queue is ephemeral — stored in React state only, does not persist across sessions

### 3. Rating System

- Each track can be rated 1-5 by any user (anonymous auth)
- Rating UI: 5 small dots or thin circles that fill on tap, inline below the track in radio view
- Show the global average rating next to the track title (e.g., "★ 4.2" or "4.2 / 5")
- Show total number of votes in small text (e.g., "4.2 (17 votes)")
- Ratings update globally in real-time for all users (use Firestore `onSnapshot` on the `ratings` collection)
- A user can change their rating at any time (old score is swapped atomically in a Firestore transaction)
- In browse wheel: each track row shows the global average rating
- Sort by "Top Rated" orders the wheel by `ratings/{trackId}.average` descending

### 4. Playlists

- User can create named playlists, rename, delete
- Add tracks from radio player (+ icon) or browse wheel
- Playlist panel: slide-over or bottom sheet, accessible from a small icon in the radio player area
- Inside a playlist: simple track list, drag to reorder, swipe or tap ✕ to remove
- "Play playlist" button: loads the playlist into radio mode, plays in order, then stops (or optionally loops)
- While in playlist mode, the Up Next queue still takes priority — queue items play first, then playlist resumes
- All playlist data persisted in Firestore under `users/{uid}/playlists/`

### 5. Share

- Share button on radio player copies `kladg.com/#/track/{trackId}` to clipboard
- Brief toast notification: "link copied" — appears for ~2 seconds, fades out, positioned unobtrusively
- Opening a shared URL starts radio mode on that specific track, then continues randomly after it finishes
- Consider also supporting native Web Share API on mobile (falls back to clipboard copy on desktop)

### 6. Search & Filter

- Search bar above browse wheel filters tracks by title in real time (case-insensitive substring match)
- When tags are added later: horizontal scrollable pill buttons filter by tag
- Multiple tags can be selected (AND or OR — start with OR for broader results)
- Search + tag filters combine: search filters within the tag-filtered set

---

## Routing (Hash-based)

| Route | Behavior |
|---|---|
| `/#/` or `/` | Radio mode, random track, browse collapsed |
| `/#/track/{trackId}` | Radio mode starting on specific track (share links) |
| `/#/browse` | Page loads with browse wheel expanded |
| `/#/playlist/{playlistId}` | Radio mode playing user's playlist (only works for playlist owner — if wrong user, fall back to random radio) |

Use a lightweight hash router — no need for React Router. A small custom `router.js` utility that listens to `hashchange` and parses the route is sufficient.

---

## Firebase Setup

Use the existing Firebase project (already configured for wanderingwojo).

### Anonymous Auth
- On first visit, call `signInAnonymously()` — user gets a persistent UID
- UID persists across sessions on the same device (Firebase stores it in IndexedDB)
- No sign-up, no email, no friction
- Future enhancement: allow users to "upgrade" to email/Google auth to sync across devices

### Firestore Indexes
- `ratings` collection: no special indexes needed for single-doc reads
- For "top rated" sort: query all `ratings` docs ordered by `average` descending — may need a composite index if combined with other filters later

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    // Ratings are readable by anyone authenticated
    match /ratings/{trackId} {
      allow read: if request.auth != null;
      // Write via transaction only — validate that the score adjustment is legitimate
      allow write: if request.auth != null;
    }
  }
}
```

### Rating Transaction Logic
When a user rates a track:
1. Read `users/{uid}/ratings/{trackId}` for existing vote (if any)
2. Read `ratings/{trackId}` for current aggregate
3. In a single Firestore transaction:
   - If new vote: increment `totalVotes` by 1, add score to `totalScore`
   - If changing vote: subtract old score, add new score (totalVotes stays same)
   - Recalculate `average = totalScore / totalVotes`
   - Write updated aggregate to `ratings/{trackId}`
   - Write user's vote to `users/{uid}/ratings/{trackId}`

---

## File Structure

```
kladg-radio/
├── index.html
├── vite.config.js
├── package.json
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions: build + deploy to Pages
├── public/
│   ├── art/                    ← album art images (jpg/webp)
│   ├── CNAME                   ← contains "kladg.com"
│   └── favicon.ico
├── src/
│   ├── App.jsx                 ← root component, router, layout
│   ├── main.jsx                ← entry point
│   ├── index.css               ← global styles, CSS variables
│   ├── components/
│   │   ├── RadioPlayer.jsx     ← top section: art, transport, progress, actions
│   │   ├── ScrollWheel.jsx     ← 3D cylindrical scroll picker
│   │   ├── PlaylistPanel.jsx   ← slide-over playlist management
│   │   ├── QueueView.jsx       ← up next queue display
│   │   ├── RatingStars.jsx     ← 1-5 rating UI + global average display
│   │   ├── ShareButton.jsx     ← copy link + toast
│   │   ├── SearchBar.jsx       ← search input for browse filtering
│   │   ├── SortToggle.jsx      ← random / top rated toggle
│   │   └── FilterPills.jsx     ← tag filters (future, empty at launch)
│   ├── data/
│   │   ├── tracks.json         ← track metadata
│   │   └── art.json            ← art image mappings
│   ├── hooks/
│   │   ├── useAudioPlayer.js   ← HTML5 Audio management, play/pause/skip/scrub
│   │   ├── usePlaylists.js     ← Firestore CRUD for playlists
│   │   ├── useRatings.js       ← Firestore rating transactions + real-time listener
│   │   ├── useQueue.js         ← ephemeral Up Next queue state
│   │   └── useAuth.js          ← Firebase anonymous auth init
│   └── utils/
│       ├── router.js           ← hash-based route parsing + navigation
│       ├── firebase.js         ← Firebase app init, Firestore/Auth instances
│       └── shuffle.js          ← Fisher-Yates shuffle + recent-history buffer
└── README.md
```

---

## Deployment

1. GitHub Actions workflow triggers on push to `main`
2. Runs `npm run build` (Vite)
3. Deploys `dist/` to `gh-pages` branch
4. `CNAME` file in `public/` points to `kladg.com`
5. DNS: `kladg.com` configured with GitHub Pages IP addresses (A records) or CNAME to `thealetree.github.io`

---

## Internet Archive Upload

For each track:
1. Upload MP4 file to Internet Archive as an item
2. The direct URL format will be: `https://archive.org/download/{item-identifier}/{filename}.mp4`
3. Use a consistent naming scheme for items, e.g., `kladg-radio-001`, `kladg-radio-002`
4. Populate `archiveUrl` in `tracks.json` with the direct download URL for each track
5. The HTML5 `<audio>` element can play MP4 (AAC) directly from these URLs with no CORS issues from Internet Archive

---

## Implementation Priority

1. **Phase 1 — Core radio:** Audio playback, random track selection, play/pause/skip, progress bar, basic layout, hash routing for track share links
2. **Phase 2 — Browse wheel:** Scroll wheel component with 3D transforms, search bar, sort toggle
3. **Phase 3 — Firebase integration:** Anonymous auth, rating system with real-time updates, playlist CRUD
4. **Phase 4 — Queue:** Up Next queue, queue-to-radio handoff logic
5. **Phase 5 — Polish:** Toast notifications, Web Share API, mobile refinements, rubber-band scroll physics, deploy pipeline

---

## Notes

- The scroll wheel is the most complex UI component. It should use CSS `perspective` and `rotateX` transforms calculated per-item based on scroll offset. Use `requestAnimationFrame` for momentum/deceleration physics. Snap to the nearest item on scroll end. Reference the iOS UIPickerView for feel.
- All audio playback uses a single HTML5 `<audio>` element managed by `useAudioPlayer`. Do not create multiple audio elements.
- The site should feel like a radio station you stumbled onto, not a music library you have to organize. The default experience is passive — music just plays.
- Tags are empty at launch but the UI scaffold (FilterPills component, tags field in data model) should exist so they can be populated later without refactoring.
- Art images do not correspond to specific songs meaningfully — they're randomly assigned for visual texture. Keep them small/optimized (WebP preferred, ~200-400px square).
