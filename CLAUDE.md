# Claude Code — Project Instructions

This file is the canonical briefing for any Claude session working on this repo. Read it before touching any file.

---

## What this project is

A personal PWA for tracking AFL Kids League games for Alek (#13, Hammond Park Hurricanes Blue). It generates Fox Footy-style match reports and season narratives in English (for Alek) and Bulgarian (for his grandparents). Hosted as a static app on GitHub Pages from `/docs`.

**Not a team app. Not a public app.** One player, two audiences, one device per game.

---

## Hard constraints — never break these

- **Passwords as hashes, never plaintext.** `scripts/auth.js` stores SHA-256 hashes. Plaintext passwords never enter any file in the repo. To rotate a password, replace the hash. The file documents the one-liner.
- **BG side is view-only.** Bulgarian screens show stats and stories only. No game tracking, no editing, no write operations. The tracker is English-side only (`#/en/tracker`). This is enforced in the router in `scripts/app.js`.
- **Old games are not editable.** Games can only be tracked live. Saved game JSON files are final. There is no edit flow for past games.
- **Do not include the model identifier in commits, PRs, code comments, or any repo artifact.** Keep it to chat replies only.
- **Do not add build steps or bundlers.** The deploy is static: Pages serves `/docs` as-is. No npm build, no webpack, no postinstall magic.

---

## Architecture

### Stack

- Plain ES modules (no bundler, no framework)
- Hash-based SPA router (`#/`, `#/en`, `#/bg`, `#/en/tracker`, `#/bg/story/*`, `#/en/arc`, `#/bg/arc`)
- Service worker for offline shell (cache-first) + data (network-first, fallback to cache)
- GitHub Pages static host; data files are fetched at runtime
- PWA: installable on iOS (Safari) and Android (Chrome)

### Design system (glass-morphism)

CSS custom properties on `:root`:
- `--t` — page background (dark charcoal)
- `--glass`, `--glass-strong` — card backgrounds
- `--blur` — backdrop blur amount
- `--hairline`, `--edge-top` — borders and top edge glow
- `--lift`, `--lift-sm`, `--press` — box-shadow tokens
- `--text-hi`, `--text-mid`, `--text-lo` — text hierarchy
- `--green-accent` — the one accent colour (AFL green). Used for HP scores, positive stats, position button active state.

### Icon system

All icons are inline SVG via `icon(name, cls)` in `scripts/icons.js`. Returns `<svg class="icn ${cls}">`. Thin-line style. Never use emoji or font icons.

### Routing and screens

| Route | Module | Description |
|---|---|---|
| `#/` | `app.js` | Two-flag landing page |
| `#/en` | `fixtures.js` | EN Fixtures & Results |
| `#/bg` | `fixtures.js` | BG Fixtures (fan/grandparent tone) |
| `#/en/tracker` | `tracker.js` | Live game tracker (EN, password-gated) |
| `#/bg/story/prologue` | `story.js` | BG season prologue |
| `#/bg/story/{N}` | `story.js` | BG season chapter N |
| `#/en/reports` | `story.js` | EN match reports list |
| `#/en/report/{date}` | `story.js` | EN match report reader |
| `#/bg/reports` | `story.js` | BG match reports list |
| `#/bg/report/{date}` | `story.js` | BG match report reader |
| `#/en/arc` | `story.js` | EN season summary (stats + arc) |
| `#/bg/arc` | `story.js` | BG season arc (stats + warm narrative) |

### Menu

`scripts/menu.js` provides `menuButtonHtml(lang, currentKey, extras=[])` and `attachMenu(lang, onAction)`. The `extras` array is `[{action, ic, label}]` objects that render as `data-action` buttons. The click handler dispatches `onAction(action)` for extras before checking for `href`.

---

## Data schemas

### season-config.json

```json
{
  "player": { "name": "Alek", "number": 13, "nicknames": ["Aleko", "Alek"] },
  "teamName": "Hammond Park Hurricanes",
  "seasonTeamName": null,
  "shoeColour": "white",
  "colours": { "primary": "#006633", "secondary": "#FFFFFF" }
}
```

### fixtures.json

```json
{
  "rounds": [
    {
      "round": 1, "date": "YYYY-MM-DD", "time": "HH:MM",
      "ground": "...", "isHome": true,
      "result": null, "score": null, "opponentScore": null
    }
  ]
}
```

Results in `fixtures.json` are placeholders — they are overridden at runtime by `games/index.json` + `game-YYYY-MM-DD.json`.

### games/game-YYYY-MM-DD.json

```json
{
  "date": "YYYY-MM-DD",
  "round": 1,
  "isHome": true,
  "ground": "...",
  "quarterDuration": 900,
  "quarters": [
    {
      "quarter": 1,
      "position": "mid",
      "mood": "🔥",
      "notes": "...",
      "aleksStats": { "goals": 0, "behinds": 0, "shots": 0, "marks": 0, "markAttempts": 0, "disposals": 0, "disposalAttempts": 0, "tackles": 0, "tackleAttempts": 0 },
      "teamScore": { "hp": { "goals": 0, "behinds": 0 }, "opp": { "goals": 0, "behinds": 0 } }
    }
  ],
  "totals": {
    "aleksStats": { "goals": 0, "behinds": 0, "shots": 0, "marks": 0, "markAttempts": 0, "disposals": 0, "disposalAttempts": 0, "tackles": 0, "tackleAttempts": 0 },
    "teamScore": { "hp": { "goals": 0, "behinds": 0 }, "opp": { "goals": 0, "behinds": 0 } }
  },
  "debrief": { "didWell": "...", "workOn": "..." },
  "events": [
    { "quarter": 1, "time": 142, "action": "goal", "position": "fwd", "team": "hp", "scorer": "alek", "points": 6 },
    { "quarter": 1, "time": 55, "action": "position", "from": "mid", "to": "fwd" },
    { "quarter": 1, "time": 300, "action": "mark", "position": "fwd", "ok": true },
    { "quarter": 1, "time": 300, "action": "disposal", "position": "fwd", "ok": false },
    { "quarter": 1, "time": 300, "action": "tackle", "position": "fwd", "ok": true }
  ]
}
```

**Events stream notes:**
- `time` is seconds elapsed from the start of that quarter (0 = quarter start, `quarterDuration` = quarter end)
- For scoring actions: `team` is `"hp"` or `"opp"`, `scorer` is `"alek"` or `"teammate"`, `points` is 6 (goal) or 1 (behind)
- For position actions: `from` and `to` are position keys (`"def"`, `"mid"`, `"fwd"`, `null` = bench/unset); no `position` field
- For stat actions: `ok` is `true` for successful, `false` for attempt; `position` is current position
- Historical games (rounds 1–9, 2026) predate the events stream and have `events: []`. The timeline graph and by-position breakdown only render when events are present.

### stories/story-YYYY-MM-DD.json

```json
{
  "date": "YYYY-MM-DD",
  "round": 1,
  "english": {
    "headline": "...",
    "commentator": "...",
    "coach": "..."
  },
  "bulgarian": {
    "headline": "...",
    "commentator": "...",
    "coach": "..."
  }
}
```

### stories/season-YYYY.json

```json
{
  "season": 2026,
  "english": { "arc": "..." },
  "bulgarian": { "arc": "..." }
}
```

---

## Tracker architecture

`scripts/tracker.js` is the live-game tracking module. Key internals:

### State object `G`

```js
{
  quarter: 1,
  timerRemaining: 900,
  timerRunning: false,
  quarterDuration: 900,
  current: { position: null },
  log: [],     // undo stack
  events: [],  // events stream (written to exported JSON)
  quarters: [] // per-quarter snapshots
}
```

### Position cycling (debounced)

Position changes are debounced with a 1.1s settle timer. Module-level globals:
- `_posTimer` — the pending settle timeout
- `_posStart` — `{from, q, t}` captured at the first tap of a burst (the moment the sub actually happened)
- `_posDisplay` — the position shown on the button during cycling

`cyclePosition()` advances `_posDisplay` and resets the timer. `commitPosition()` fires after the timer settles: records one `{type:'position', from, to}` log entry and one `{action:'position', from, to, quarter, time}` event. Round-trips (end up back at `from`) record nothing.

`flushPosition()` is called before every `logAction()` so that if a stat is recorded while a cycle is settling, the position change commits first with the right timestamp.

`cancelPositionCycle()` is called by undo when `_posTimer !== null` — aborts the cycle and restores the displayed label.

### Log vs events

- `G.log` is the **undo stack** — internal format, used for undo only
- `G.events` is the **events stream** — exported in JSON, used for match reports

They grow in parallel. `undoLast()` pops from `G.log` and mirrors the reversal in `G.events`.

### Scoreboard layout

```
[ Q1 chip (left) | clock (centre) | ▶ run button (right) ]
[ HP score  :  Opp score ]
```

HP score is always on the left. Team names below scores, HP name in green.

### Menu extras

Tracker registers `TRACKER_MENU_EXTRAS = [{action:'newgame', ic:'play', label:'New Game'}]`. The New Game action confirms if a game is in progress, then clears localStorage and re-renders.

---

## Match reports (`scripts/story.js`)

### Report body order

1. Stats summary (totals)
2. Score timeline (SVG worm — only renders when `game.events` has scoring entries)
3. By-position breakdown (only renders when `game.events` has position-change entries)
4. Coach notes
5. Headline
6. Commentator narrative

### Timeline graph

SVG score margin worm. HP above the midline (green fill, 22% opacity), opposition below (red fill, 20% opacity). Dashed quarter separators. Legend with lead text. Uses `<clipPath>` to split the area fill by sign.

### By-position breakdown

Aggregates events stream by `e.position`. Rows: position label / points / stat counts (G/B/S + M/D/T). Only the positions Alek actually played appear.

### Position labels

```js
const POS_FULL = {
  def: { en: 'Defence',  bg: 'Защита' },
  mid: { en: 'Midfield', bg: 'Полузащита' },
  fwd: { en: 'Forward',  bg: 'Нападение' },
  none: { en: 'Unset / bench', bg: 'Без позиция' }
};
```

---

## Service worker

`docs/sw.js` caches the app shell (cache-first) and data files (network-first, fallback).

**Cache names:**
- Shell: `afl-shell-v33` — bump the version number (v34, v35, …) whenever any shell asset changes
- Data: `afl-data-v1` — bump only if the data fetch strategy changes

**When to bump the shell cache:** any change to HTML, CSS, JS, or icon files. The SW activate event deletes old caches automatically, so bumping ensures users get the new files.

---

## Development workflow

### Branch

All work happens on `claude/phase-1-project-setup-ofhvai`. Push to that branch; the user merges to `main` for Pages deploy.

### Recording a game (end to end)

1. Track the game in the tracker; tap **Copy JSON** at the summary screen.
2. In GitHub Mobile, create `docs/data/games/game-YYYY-MM-DD.json` and paste.
3. Add the date string to the `games` array in `docs/data/games/index.json`.
4. Generate a story (see `docs/data/stories/GENERATION.md`) and save as `docs/data/stories/story-YYYY-MM-DD.json`.
5. Add the date string to the `stories` array in `docs/data/stories/index.json`.
6. The result appears on Fixtures, and the report appears in Match Reports, automatically.

### File serving

The PWA is static. Use a local server for dev (not `file://` — service workers require HTTP):

```bash
cd docs && python3 -m http.server 8000
# open http://localhost:8000
```

### Adding a new season

1. Copy `docs/data/fixtures.json` schema → `docs/data/fixtures-YYYY.json`
2. Add `docs/data/stories/YYYY.json` (season narrative bundle for BG)
3. The year bar and BG story picker discover the new season automatically when the year file exists.

---

## Current project status (as of June 2026)

All 7 planned phases are complete, plus a tracker overhaul. The 2026 season (rounds 1–9) is fully documented with game JSON, match reports, and a season arc. The app is live on GitHub Pages.

### Phases complete

| Phase | Description |
|---|---|
| 1 | Foundation: PWA shell, router, two-flag landing |
| 2 | Fixtures & Stories: EN/BG fixtures, season picker, BG story reader |
| 3 | Stat Tracker: live game tracking, per-quarter state, export |
| 4 | Password Gates: SHA-256 hashes, session unlock, EN+BG sides |
| 5 | Game Data Pipeline: results driven by game files, config.js |
| 6 | Match Reports: score timeline graph, by-position breakdown, EN+BG report reader |
| 7 | Season Arc: aggregated season stats, EN+BG arc narrative |

### Tracker overhaul (post-Phase 7)

- Timer moved into scoreboard top row (Q chip | clock | run button)
- Team names prominent below scores; HP name in green
- New Game action in the tracker menu
- Undo button correctly disabled when log is empty or a position cycle is settling
- Debounced position cycling: only the final settled position is logged, with a timestamp stamped at the first tap
- Events stream in exported JSON: per-action timestamps with quarter, time-in-quarter, position

---

## Known gaps / future work

| Item | Note |
|---|---|
| `seasonTeamName` | Reserved for next year's team rename — not yet used |
| `nicknames` in player config | For story variety — not yet used |
| `shoeColour` + personal details | For richer story colour — not yet used |
| Fixtures for 2027 season | Add `docs/data/fixtures-2027.json` when schedule is published |
| Stories for 2027 season | Add `docs/data/stories/2027.json` — picker auto-discovers it |
| BG chapters 4–9 expanded | Still at original length; chapters 1–3 rewritten to ~3 min reads |
| GitHub Actions deploy | Documented in README as a future option for hardened secrets; not planned |
