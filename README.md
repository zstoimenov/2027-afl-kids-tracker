# 2027 AFL Kids Tracker

Personal AFL Kids League stat tracker and storytelling platform for Hammond Park Hurricanes. Tracks game stats for Alek (#13, Hammond Park Blue), generates Fox Footy-style match reports and season narratives, and shares them with family in Bulgaria. PWA hosted on GitHub Pages.

---

## Project structure

```
2027-afl-kids-tracker/
├── docs/                          # GitHub Pages serves from here (the live PWA)
│   ├── index.html                 # Two-flag landing page (EN / BG)
│   ├── manifest.json              # PWA manifest
│   ├── sw.js                      # Service worker (offline shell + data cache)
│   ├── icons/                     # App icons (SVG)
│   ├── styles/
│   │   ├── main.css               # Landing page + base styles
│   │   ├── fixtures.css           # Fixtures & Results screen
│   │   ├── tracker.css            # Stat tracker screen
│   │   └── story.css              # Story reader screen
│   ├── scripts/
│   │   ├── app.js                 # SPA router + password guards
│   │   ├── auth.js                # Password gates (EN + BG), SHA-256 hashes
│   │   ├── fixtures.js            # Fixtures & Results (EN + BG) + header menu
│   │   ├── tracker.js             # Stat tracker (EN only)
│   │   └── story.js               # Story reader: season picker, full season, single chapter (BG)
│   └── data/
│       ├── fixtures.json          # 2026 season schedule + results
│       ├── fixtures-YYYY.json     # Future seasons (loaded by year selector)
│       ├── games/                 # game-YYYY-MM-DD.json (saved after each game)
│       └── stories/
│           └── 2026.json          # BG stories: prologue + chapters 1–9
├── data/                          # Schema reference files
│   ├── season-config.json
│   ├── fixtures.json
│   ├── games/_template.json
│   └── stories/_template.json
└── PROJECT-INSTRUCTIONS-v1.0.md
```

## GitHub Pages

- **Source:** Deploy from branch `main`, folder `/docs`
- **URL:** `zstoimenov.github.io/2027-afl-kids-tracker`

> Enable Pages in **Settings → Pages → Build and deployment → Deploy from a branch**, then select `main` / `/docs`.

## Local preview

The PWA is static. Serve `docs/` over HTTP (service workers need a server, not `file://`):

```bash
cd docs && python3 -m http.server 8000
# open http://localhost:8000
```

---

## Development plan

### Phase 1 — Foundation ✅ Complete

| Task | Status |
|---|---|
| Repo folder structure (`docs/`, `src/`, `data/`) | ✅ Done |
| JSON data schema files with default values | ✅ Done |
| PWA shell: installable manifest + service worker | ✅ Done |
| Two-flag landing page (🇦🇺 EN / 🇧🇬 BG) | ✅ Done |
| Hash-based SPA router (`#/`, `#/en`, `#/bg`, `#/en/tracker`, `#/bg/story/*`) | ✅ Done |
| Landing page polish — Fox Footy broadcast aesthetic | ✅ Done |

---

### Phase 2 — Fixtures & Stories ✅ Complete

| Task | Status |
|---|---|
| EN Fixtures & Results screen (round, date, ground, result, score) | ✅ Done |
| BG Fixtures & Results screen (fan/grandparent tone, warm narrative framing) | ✅ Done |
| Multi-year season selector (year bar with prev/next navigation) | ✅ Done |
| AWST → EEST time conversion for BG screen | ✅ Done |
| Score display: goals.behinds (total) format | ✅ Done |
| Prologue card at top of BG fixtures list | ✅ Done |
| BG story reader screen (`#/bg/story/prologue`, `#/bg/story/N`) | ✅ Done |
| Bulgarian story content: prologue + chapters 1–9 (2026 season) | ✅ Done |
| Story buttons on BG past-game cards (rounds 1–9) | ✅ Done |

---

### Phase 3 — Stat Tracker ✅ Complete

| Task | Status |
|---|---|
| Tracker screen layout: ctrl-bar / game-bar / scoreboard / alek strip / stat buttons | ✅ Done |
| Quarter countdown timer (default 15 min, editable before game start, locked after) | ✅ Done |
| Start / pause / resume timer with ▶ / ⏸ button | ✅ Done |
| Position selector: tap to cycle — / DEF / MID / FWD | ✅ Done |
| Scoreboard interactions: single tap HP = shot attempt | ✅ Done |
| Scoreboard interactions: double tap HP = behind fork, long press HP = goal fork | ✅ Done |
| Scoreboard interactions: double tap / long press opp = behind / goal (no fork) | ✅ Done |
| Fork popup: GOAL / BEHIND → Alek #13 / Teammate attribution | ✅ Done |
| Stat buttons: tap = attempt, long press = successful (🤲 Disposal / 🤼 Tackle / 🏉 Mark) | ✅ Done |
| Haptic feedback: short/weak for attempts, long/strong for successes | ✅ Done |
| Quarter recap popup (long press Q label): mood 🔥😐😮‍💨 + notes field + End Quarter | ✅ Done |
| Per-quarter state: position, mood, notes, aleksStats, teamScore snapshot | ✅ Done |
| Undo last action | ✅ Done |
| LocalStorage persistence (resume mid-game after accidental navigation) | ✅ Done |
| Summary screen: scoreline, per-quarter breakdown with moods, totals | ✅ Done |
| Export JSON to clipboard with GitHub Mobile paste instructions | ✅ Done |
| Game JSON schema matching spec: per-quarter + totals + points calculation | ✅ Done |
| BG side blocked from tracker (view-only) | ✅ Done |
| Old game results not editable (results come from saved JSON only) | ✅ Done |

---

### Phase 4 — Password Gates ✅ Complete

| Task | Status |
|---|---|
| English-side password gate — case-insensitive, caps + numbers | ✅ Done (gates the whole English side) |
| Bulgarian-side (Family) password gate — case-insensitive, caps + numbers | ✅ Done (gates the whole Bulgarian side) |
| Session unlock: stays unlocked for the full session once entered | ✅ Done (`sessionStorage`, per side) |
| Passwords stored as hashes, never as plaintext | ✅ Done — SHA-256 hashes in `scripts/auth.js`; plaintext never in repo |

> **Gate scope:** the landing page (two flags) is always open. Picking 🇦🇺 unlocks the whole English side with the tracker password; picking 🇧🇬 unlocks the whole Bulgarian side with the family password. Both are word + two-digit-number + word, entered case-insensitively.
>
> **Note / future hardening:** this is a client-side gate suitable for a private family app — the hashes ship in the source, so it keeps casual visitors out but is not a hardened secret. To move to true build-time secret injection (e.g. GitHub Actions), the `/docs` deploy would need a build step. To rotate a password, replace the matching hash in `scripts/auth.js` (the file documents the one-liner).

---

### Phase 5 — Game Data Pipeline 🔲 Not started

The tracker currently saves game JSON via clipboard → GitHub Mobile paste. Once game files exist in `docs/data/games/`, the pipeline below makes the rest of the app data-driven.

| Task | Status |
|---|---|
| Fixtures screen reads results from `games/game-YYYY-MM-DD.json` (not hard-coded in fixtures.json) | 🔲 Todo |
| `fixtures.json` result fields updated from game files on load | 🔲 Todo |
| Debrief section in game JSON: `didWell` + `workOn` fields (post-game input screen) | 🔲 Todo |
| `season-config.json` integration: read player number, team name dynamically | 🔲 Todo |
| Home/away colour scheme auto-detection from fixtures.json | 🔲 Todo |

---

### Phase 6 — Match Reports & Story Generation 🔲 Not started

Claude generates stories from game JSON. Stories are saved once and never regenerated unless explicitly requested.

| Task | Status |
|---|---|
| Story generation prompt: Claude receives game JSON → outputs EN + BG story JSON | 🔲 Todo |
| EN story format: headline + Fox Footy commentator + coach notes | 🔲 Todo |
| BG story format: warm grandparent-tone narrative (2–3 rich paragraphs) | 🔲 Todo |
| Story saved to `docs/data/stories/story-YYYY-MM-DD.json` | 🔲 Todo |
| EN Match Reports screen (Alek-facing, kid-friendly) | 🔲 Todo |
| BG Game Stories screen updated to read from per-game story JSON files | 🔲 Todo |

---

### Phase 7 — Season Arc 🔲 Not started

| Task | Status |
|---|---|
| Season arc generation: Claude receives all game JSONs → season narrative | 🔲 Todo |
| BG Season Arc screen | 🔲 Todo |
| EN Season summary view | 🔲 Todo |

---

### Known gaps / future improvements

| Item | Note |
|---|---|
| Player number / name | ✅ Now read from `season-config.json` in the tracker (strip, fork, placeholders) |
| `seasonTeamName` field | Reserved for next year's team rename — not yet used |
| `nicknames` array in player config | Story variety — not yet used |
| `shoeColour` + personal details | Richer story colour — not yet used |
| Home/away colour scheme shift | `season-config.colours` defined but UI does not yet re-theme by home/away |
| Fixtures for 2027 season | Add `docs/data/fixtures-2027.json` when the schedule is published |
| Stories for 2027 season | Add `docs/data/stories/2027.json` — the season picker and per-card story links pick it up automatically |
| EN section hubs | Both languages currently open straight to Fixtures; reachable via the header menu. Full hubs deferred until Match Reports (Phase 6) and Season Arc (Phase 7) exist |

---

## Progress log

A running summary of what's been built. Newest at the bottom.

### Foundation → Stat Tracker (Phases 1–3)
- Installable PWA shell: manifest, service worker (offline app shell + network-first data), two-flag landing page, hash-based SPA router.
- Fixtures & Results for both languages (admin tone EN / warm fan tone BG), multi-season year bar, AWST→EEST time conversion, `goals.behinds (total)` scores.
- Bulgarian story content for 2026: prologue + chapters 1–9.
- Full stat tracker rebuilt to the wireframe: ctrl-bar / game-bar / dominant scoreboard / Alek strip / three stat buttons. Quarter timer (15 min default, editable pre-game, locked after start), three-way scoreboard interactions (tap = shot, double = behind fork, long = goal fork), Alek/Teammate attribution fork, per-quarter mood + notes, haptics, undo, localStorage resume, summary screen, and clipboard JSON export.

### Tracker correctness & UX pass
- Fixed teammate goals/behinds being credited to Alek (scorer now gates the personal-stat increment in both record and undo).
- Alek strip shows `x/y` (successful/attempts) per the spec.
- Fixed `NaN:NaN` timer from stale saved state (migration guards on restore).
- Card-based layout, neutral charcoal palette with green as accent only, larger stat buttons for cold-weather/gloved use.
- Back button moved to the left; **New Game** button added to the summary.
- Post-game **debrief** (`didWell` / `workOn`) captured on the summary and written into the exported JSON.
- Consistent stat order everywhere — Goals/Behinds/Shots → Marks → Disposals → Tackles — including the three buttons, the Alek strip, the summary, and the exported JSON.
- **Home team always renders on the left** across tracker, summary, and fixtures (score buttons stay bound to HP/opposition by ID, so attribution can't be mixed up).
- `games/_template.json` synced to the live export schema.
- Player **name + number read from `season-config.json`** (no more hardcoded `#13`).

### Navigation & stories
- Header dropdown menu (☰) on the Fixtures screen, per language; **Track a Game** lives on the English side only (removed from the landing page).
- BG **season picker** → full-season story page (prologue + every chapter in one read); auto-discovers seasons by probing `data/stories/{year}.json`.
- Per-card BG story links are **season-aware** — they open the viewed season's chapter and light up automatically when `stories/2027.json` is added.
- **PWA install instructions** added to the header menu (iOS Safari + Android Chrome, platform-detected), in both languages.

### Phase 4 — Password gates
- Whole **English side** and whole **Bulgarian side** gated behind a password each (landing stays open).
- Passwords are word + two-digit number + word, entered **case-insensitively**; only **SHA-256 hashes** are stored (`scripts/auth.js`), never plaintext.
- Unlock persists for the session (`sessionStorage`), per side.
