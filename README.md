# AFL Junior League

Personal AFL stat tracker and storytelling PWA for Hammond Park Hurricanes. Tracks game stats for Alek (#13, Hammond Park Blue), generates Fox Footy-style match reports in English and Bulgarian, and shares them with family. Hosted on GitHub Pages.

- **Live app:** `zstoimenov.github.io/2027-afl-kids-tracker`
- **Stack:** plain ES modules, no bundler, no framework
- **Audiences:** Zak (stat logger, EN), Alek (report reader, EN), grandparents (BG, view-only)

---

## Project structure

```
2027-afl-kids-tracker/
├── docs/                          # GitHub Pages root (the live PWA)
│   ├── index.html                 # Two-flag landing page (EN / BG)
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker (offline shell + data cache)
│   ├── icons/                     # App icons (SVG)
│   ├── styles/
│   │   ├── main.css               # Landing page + base styles
│   │   ├── fixtures.css           # Fixtures & Results screen
│   │   ├── tracker.css            # Stat tracker screen
│   │   └── story.css              # Story / report reader screen
│   ├── scripts/
│   │   ├── app.js                 # SPA router + password guards
│   │   ├── auth.js                # Password gates (EN + BG), SHA-256 hashes
│   │   ├── config.js              # Season-config loader (player + team name)
│   │   ├── icons.js               # Inline SVG icon set
│   │   ├── menu.js                # Shared header menu
│   │   ├── fixtures.js            # Fixtures & Results (EN + BG)
│   │   ├── tracker.js             # Live stat tracker (EN only)
│   │   └── story.js               # Match reports + season arc reader
│   └── data/
│       ├── season-config.json     # Player + team details
│       ├── fixtures.json          # Current season schedule (results overridden by game files)
│       ├── fixtures-YYYY.json     # Additional seasons (auto-discovered by year selector)
│       ├── games/
│       │   ├── index.json         # Lists which dates have a saved game file
│       │   └── game-YYYY-MM-DD.json  # Saved after each game (source of truth for results)
│       └── stories/
│           ├── index.json         # Lists which dates have a per-game story
│           ├── GENERATION.md      # How to generate a story from game JSON
│           ├── season-YYYY.json   # Season arc narrative (EN + BG)
│           └── story-YYYY-MM-DD.json  # Per-game report (EN + BG: headline / commentator / coach)
```

---

## Screens

| Route | Screen | Access |
|---|---|---|
| `#/` | Two-flag landing | Open |
| `#/en` | EN Fixtures & Results | EN password |
| `#/bg` | BG Fixtures (fan tone) | BG password |
| `#/en/tracker` | Live stat tracker | EN password |
| `#/en/reports` | EN match reports list | EN password |
| `#/en/report/{date}` | EN match report reader | EN password |
| `#/en/arc` | EN season summary + arc | EN password |
| `#/bg/reports` | BG match reports list | BG password |
| `#/bg/report/{date}` | BG match report reader | BG password |
| `#/bg/arc` | BG season arc | BG password |
| `#/bg/story/prologue` | BG season prologue | BG password |
| `#/bg/story/{N}` | BG season chapter N | BG password |

---

## GitHub Pages

- **Source:** Deploy from branch `main`, folder `/docs`
- **URL:** `zstoimenov.github.io/2027-afl-kids-tracker`

Enable Pages in **Settings → Pages → Build and deployment → Deploy from a branch**, then select `main` / `/docs`.

---

## Local development

Serve `docs/` over HTTP — service workers require a server, not `file://`:

```bash
cd docs && python3 -m http.server 8000
# open http://localhost:8000
```

**Service worker cache:** bump `SHELL_CACHE` in `docs/sw.js` (e.g. `afl-shell-v34` → `afl-shell-v35`) whenever any HTML, CSS, JS, or icon file changes. The activate event cleans up old caches automatically.

---

## Recording a game (end to end)

1. Track the game in the tracker; tap **Copy JSON** at the summary screen.
2. In GitHub Mobile, create `docs/data/games/game-YYYY-MM-DD.json` and paste.
3. Add the date string to the `games` array in `docs/data/games/index.json`.
4. Generate a story (see `docs/data/stories/GENERATION.md`) and save as `docs/data/stories/story-YYYY-MM-DD.json`.
5. Add the date string to the `stories` array in `docs/data/stories/index.json`.

The game result appears on the Fixtures screen and the report appears in Match Reports automatically.

---

## Adding a new season

1. Create `docs/data/fixtures-YYYY.json` with the new season schedule.
2. Create `docs/data/stories/season-YYYY.json` for the season arc narrative.
3. The year selector and BG story picker auto-discover the new season.

---

## Password security

Passwords are stored as SHA-256 hashes in `scripts/auth.js` — plaintext never enters the repo. This is a client-side gate suitable for a private family app (keeps casual visitors out). To rotate a password, replace the hash (the file documents the one-liner).

---

## Current status (June 2026)

2026 season complete: 9 rounds, all game JSON saved, all match reports generated, season arc written. App is live and installable on iOS and Android.

**What's next:**
- Add `docs/data/fixtures-2027.json` when the 2027 schedule is published
- Add `docs/data/stories/season-2027.json` for the season arc
- Generate per-game stories as each 2027 game is played
