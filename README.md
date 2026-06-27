# 2027-afl-kids-tracker

Personal AFL Kids League stat tracker and storytelling platform for Hammond Park Hurricanes. Tracks game stats, generates match reports and season narratives for a junior player. PWA hosted on GitHub Pages.

## Project structure

```
2027-afl-kids-tracker/
├── docs/                     # GitHub Pages serves from here (the live PWA)
│   ├── index.html            # Two-flag landing page
│   ├── manifest.json         # PWA manifest
│   ├── sw.js                 # Service worker (offline shell cache)
│   ├── icons/                # App icons (SVG)
│   ├── styles/               # CSS
│   └── scripts/              # App JS
├── src/                      # Source/scaffolding for upcoming phases
│   ├── components/
│   ├── screens/
│   ├── utils/
│   └── styles/
├── data/                     # JSON data
│   ├── season-config.json    # Player, club, season info
│   ├── fixtures.json         # Full season schedule + results
│   ├── games/                # game-YYYY-MM-DD.json (per-game stats) — _template.json shows the schema
│   └── stories/              # story-YYYY-MM-DD.json (match stories) — _template.json shows the schema
└── PROJECT-INSTRUCTIONS-v1.0.md
```

## GitHub Pages

- **Source:** Deploy from branch `main`, folder `/docs`
- **URL:** `zstoimenov.github.io/2027-afl-kids-tracker`

> Enable Pages in **Settings → Pages → Build and deployment → Deploy from a branch**, then select `main` / `/docs`.

## Phase 1 — done

- Repo folder structure (`docs/`, `src/`, `data/`)
- JSON data schema starter files with empty/default values
- PWA shell: installable manifest, offline service worker, and the two-flag (🇦🇺 / 🇧🇬) landing page

## Local preview

The PWA is static. Serve `docs/` over HTTP (service workers need a server, not `file://`):

```bash
cd docs && python3 -m http.server 8000
# open http://localhost:8000
```
