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
│   │   ├── config.js              # Shared season-config loader (player + team name)
│   │   ├── fixtures.js            # Fixtures & Results (EN + BG) + header menu + results pipeline
│   │   ├── tracker.js             # Stat tracker (EN only)
│   │   └── story.js               # Story reader: season picker, full season, single chapter (BG)
│   └── data/
│       ├── fixtures.json          # 2026 season schedule + results
│       ├── fixtures-YYYY.json     # Future seasons (loaded by year selector)
│       ├── games/
│       │   ├── index.json         # Lists which dates have a saved game file
│       │   └── game-YYYY-MM-DD.json  # Saved after each game (source of truth for results)
│       └── stories/
│           ├── index.json         # Lists which dates have a per-game story file
│           ├── GENERATION.md      # How Claude turns a game JSON into a story
│           ├── 2026.json          # BG season narrative: prologue + chapters
│           └── story-YYYY-MM-DD.json  # Per-game report (EN+BG: headline/commentator/coach)
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

### Phase 5 — Game Data Pipeline ✅ Complete

The tracker saves game JSON via clipboard → GitHub Mobile paste. Saved game files in `docs/data/games/` are now the source of truth for results: the Fixtures screen reads them and overrides whatever is hard-coded in `fixtures.json`.

| Task | Status |
|---|---|
| Fixtures reads results from `games/game-YYYY-MM-DD.json` | ✅ Done — via `games/index.json` manifest; derives score + winner from `totals.teamScore` |
| `fixtures.json` result fields overridden from game files on load | ✅ Done — in-memory, per viewed season |
| Debrief (`didWell` / `workOn`) captured post-game and exported | ✅ Done — summary screen + JSON export |
| `season-config.json`: player number + team name read dynamically | ✅ Done — shared `scripts/config.js`; player in tracker, team name in Fixtures/Story headers |
| Home/away colour scheme auto-detection | ⏭️ Superseded — replaced by the deliberate neutral palette (green = accent only); see deviations. Not implemented by design |

**Recording a game, end to end:**
1. Track the game in the tracker; at full time tap **Copy JSON**.
2. In GitHub Mobile, create `docs/data/games/game-YYYY-MM-DD.json` and paste.
3. Add the date string to the `games` array in `docs/data/games/index.json`.
4. The result now appears on the Fixtures screen automatically (overriding any placeholder in `fixtures.json`).

> `games/index.json` exists to avoid blindly probing (and 404-ing) every fixture date on a static host — it lists exactly which dates have a saved game file.

---

### Phase 6 — Match Reports & Story Generation 🚧 In progress

Claude generates stories from game JSON. Stories are saved once and never regenerated unless explicitly requested.

| Task | Status |
|---|---|
| Story generation prompt / process documented | ✅ Done — `docs/data/stories/GENERATION.md` (inputs, output, 3–5 min length, tone, guardrails) |
| EN story format: headline + Fox Footy commentator + coach notes | ✅ Done — per-game `story-YYYY-MM-DD.json` schema |
| BG story format: warm grandparent-tone narrative | ✅ Done — same per-game schema (`bulgarian.*`); season narrative bundle also retained |
| Story saved to `docs/data/stories/story-YYYY-MM-DD.json` + `index.json` | ✅ Format + manifest ready (`stories/index.json`); files added per game |
| EN Match Reports screen (Alek-facing) | ✅ Done — list + reader (`#/en/reports`, `#/en/report/{date}`), tasteful empty state |
| Existing BG chapters expanded to 3–5 minute reads | 🚧 In progress — prologue + early chapters done; rest rolling forward |

> **Two story shapes, by design:** the **BG Game Stories** are the warm season-narrative chapters (the `2026.json` bundle, read via the season picker) — kept because they make the best long-form grandparent read. The **per-game `story-YYYY-MM-DD.json`** format (headline / commentator / coach, EN + BG) drives the new **Match Reports** screen and any future generated stories. The BG narrative bundle is not being force-migrated into per-game files.

---

### Phase 7 — Season Arc ✅ Complete

| Task | Status |
|---|---|
| Season arc narrative (all game JSONs → season story) | ✅ Done — `stories/season-YYYY.json` (EN + BG arc), written from the 9 game files |
| Season screen (stats + arc) | ✅ Done — `#/en/arc` (Season Summary) and `#/bg/arc` (Сезонен преглед) |
| EN season summary view | ✅ Done — record hero (W–L), aggregated stat grid with `x/y` + `%`, season points, then the arc |
| BG Season Arc screen | ✅ Done — same stats, warm grandparent-tone arc |

The Season screen aggregates every game file for the season live (record, goals/behinds/shots, marks/disposals/tackles with success %, total points) and renders the saved arc narrative underneath. Added to both header menus.

---

### Known gaps / future improvements

| Item | Note |
|---|---|
| Player number / name | ✅ Now read from `season-config.json` in the tracker (strip, fork, placeholders) |
| `seasonTeamName` field | Reserved for next year's team rename — not yet used |
| `nicknames` array in player config | Story variety — not yet used |
| `shoeColour` + personal details | Richer story colour — not yet used |
| Home/away colour scheme shift | Intentionally not implemented — superseded by the deliberate neutral palette (green = accent only). `season-config.colours` remains for future use |
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

### Phase 5 — Game data pipeline
- Fixtures **results are now driven by saved game files**: a `games/index.json` manifest lists which dates have a `game-YYYY-MM-DD.json`; the Fixtures screen loads those, derives score + winner from `totals.teamScore`, and overrides the placeholder result in `fixtures.json` for the matching round.
- Per-season: only game files for the year being viewed are fetched.
- Shared **`scripts/config.js`** is now the single source of truth for identity — player name/number (tracker) and full team name (Fixtures + Story headers) read from `season-config.json`.
- Tracker summary now reminds you to add the date to `games/index.json` after pasting a game file.
- Home/away colour shift from the original spec is intentionally **not** implemented — superseded by the deliberate neutral palette.

### Subtle home/away accent
- Green = home, soft steel = away, applied as a thin left stripe on each fixture card, the AWAY chip, and (on the tracker) the HP HOME/AWAY label + a small tab over the scoreboard. The main score stays green so our team reads instantly.

### Phase 6 — Match Reports & story generation (in progress)
- New **English Match Reports** screen (list + reader) reading per-game `story-YYYY-MM-DD.json`; tasteful empty state until games are saved. Added to the EN menu.
- Per-game story format (EN + BG: headline / commentator / coach) + `stories/index.json` manifest + `GENERATION.md` documenting the process and the **3–5 minute** length target.
- **Story length:** the prologue + chapters 1–3 of the 2026 BG season have been rewritten as richer reads (roughly doubled, ~2.5–3.5 min); chapters 4–9 still to be expanded/lengthened to the full target.

### Real 2026 data + tap-to-open
- **Cards open on tap** (no buttons): EN played game → stats report, EN today → tracker, BG → story, with a short hint + chevron.
- **Real game data for rounds 1–9** plugged in from the previous app: `games/game-2026-*.json` (totals + per-quarter), with coach Highlight/Focus → debrief and commentator Insight → `story-2026-*.json` (all 9 rounds have a write-up). Fixtures results now flow from these; corrected round 5 to away (HPFC Green).

### Phase 7 — Season Arc
- **Season screen** (`#/en/arc`, `#/bg/arc`): aggregates all game files live — record (8–1), goals/behinds/shots, marks/disposals/tackles with success %, season points (42) — then the **season arc** narrative (`stories/season-2026.json`, EN + BG). Added to both menus.

---

## Future consideration — GitHub Actions deploy (hardened secrets)

**Status:** not planned for now. Documented here as a deliberate decision so it can be picked up later.

### Why it exists as an option

The current password gate (Phase 4) is **client-side**: the SHA-256 hashes ship inside `scripts/auth.js`, which is served as static source. That is the right level for a private family app — it keeps casual visitors out — but it is **not a hardened secret**:

- The hashes are visible to anyone who views source, and a short word + two-digit-number + word password is brute-forceable offline against a known hash.
- The check runs in the browser, so it can be bypassed in dev tools regardless of the password.

Moving the secret out of the committed source requires a **build step**, which the project currently does not have (Pages deploys the `/docs` folder as-is from `main`).

### What a GitHub Actions deploy would involve

1. **Switch Pages source** from "Deploy from branch (`main` / `/docs`)" to **GitHub Actions**.
2. Add a workflow (`.github/workflows/deploy.yml`) that, on push to `main`:
   - checks out the repo,
   - injects the password hashes from **repository secrets** (e.g. `EN_HASH`, `BG_HASH`) into a generated config (replacing a placeholder in `auth.js`, or writing a small `auth-config.js`),
   - uploads `/docs` as the Pages artifact and deploys it.
3. Store the hashes as **encrypted repo secrets** (Settings → Secrets and variables → Actions). The plaintext passwords never enter the repo or the build logs; only the deployed artifact carries the hash.

### Trade-offs

- **Gains:** secrets live in encrypted GitHub config instead of committed source; rotating a password is a secret change + redeploy, no code commit; opens the door to other build-time niceties (asset hashing for cache-busting, minification, story/season manifest generation).
- **Costs:** adds a build pipeline and a moving part to a currently dead-simple static deploy; a broken workflow blocks all deploys; still does **not** make the gate cryptographically strong on its own — the hash is in the shipped bundle either way. True server-side enforcement would need an actual backend (e.g. a small auth function / edge worker), which is out of scope for a static PWA.

### Recommendation

Keep the static client-side gate while this is a private, low-stakes family app. Revisit the Actions deploy if/when the app is shared more widely, the passwords need to rotate often, or a build step is wanted for other reasons (cache-busting, minification). If stronger protection is ever required, the real answer is a lightweight backend, not just moving the hash.
