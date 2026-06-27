# 2027 AFL Kids Tracker - Project Instructions v1.0

## Product Vision

A self-contained PWA that tracks an AFL Kids League player's game stats, generates rich match stories, and shares them with family. The stats are fuel for the narrative. The goal is for a 9-year-old named Alek to feel like a professional AFL player after every game.

**Core emotional outcome:** After every game, Alek reads a personalised match report that makes him feel like he's reading about himself in The Age sports section.

---

## The People

| Person | Role | Language | Access |
|---|---|---|---|
| Zak (dad) | Designer, stat logger, primary user | English | Tracker password |
| Alek | 9-year-old player, report reader | English | Set up by Zak |
| Family / Grandparents | Fans following from Bulgaria | Bulgarian | Family password |

**About Alek:**
- Plays for Hammond Park Blue (part of Hammond Park Hurricanes club)
- Currently wears #13 (may change next season - use `season-config.json`)
- Loves feeling like a real AFL star
- Enjoys reading his own match reports
- The stories help him and Zak identify and work on areas of improvement

---

## Club & Team Details

- **Club:** Hammond Park Hurricanes
- **Team:** Hammond Park Blue
- **Home Ground:** Frankland Park
- **Home colours:** Green (primary), White (secondary)
- **Away colours:** White (primary), Green (secondary)
- The app auto-detects home/away from `fixtures.json` and adjusts colour scheme accordingly

---

## App Architecture

### Entry Point

Landing page with two large flag buttons. No password at this level.

```
[🇦🇺 English]     [🇧🇬 Bulgarian]
```

### English Side (Tracker Password - English UI)

- 📊 Stat Tracker (mobile-first, one screen, no scroll)
- 🏆 Alek's Match Reports (kid-friendly, saved permanently)
- 📅 Fixtures & Results (admin/schedule tone)

### Bulgarian Side (Family Password - Bulgarian UI)

- 📖 Game Stories (rich narrative, grandparent tone)
- 🏆 Season Arc (on demand)
- 📅 Fixtures & Results (fan/proud grandparent tone - warm, not admin)

---

## Password System

| Gate | Audience | Language | Format |
|---|---|---|---|
| Tracker | Zak only | English | HASH - caps and numbers |
| Family Screen | Grandparents | Bulgarian | HASH - caps and numbers |

**Rules:**
- Entry fields are case-insensitive (older users should not be confused)
- Passwords do not change during the season
- Tracker stays unlocked for the full session once entered
- Passwords stored as environment config, never in data files

---

## Repo Structure

```
2027-afl-kids-tracker/
│
├── docs/                        # GitHub Pages serves from here
│   ├── index.html
│   ├── manifest.json
│   └── icons/
│
├── src/
│   ├── components/
│   ├── screens/
│   ├── utils/
│   └── styles/
│
├── data/
│   ├── season-config.json       # Player, club, season info
│   ├── fixtures.json            # Full season schedule + results
│   ├── games/
│   │   └── game-YYYY-MM-DD.json
│   └── stories/
│       └── story-YYYY-MM-DD.json
│
└── PROJECT-INSTRUCTIONS-v1.0.md
```

**GitHub Pages config:**
- Source: Deploy from branch `main`, folder `/docs`
- URL: `zstoimenov.github.io/2027-afl-kids-tracker`

---

## Data Schemas

### season-config.json

```json
{
  "season": 2027,
  "club": "Hammond Park Hurricanes",
  "team": "Hammond Park Blue",
  "seasonTeamName": "",
  "player": {
    "name": "Alek",
    "number": 13,
    "nicknames": [],
    "shoeColour": ""
  },
  "colours": {
    "home": { "primary": "green", "secondary": "white" },
    "away": { "primary": "white", "secondary": "green" }
  },
  "homeGround": "Frankland Park",
  "extras": {}
}
```

### fixtures.json

```json
{
  "season": 2027,
  "rounds": [
    {
      "round": 1,
      "date": "2027-03-15",
      "homeTeam": "Hammond Park Blue",
      "awayTeam": "Opposition Team",
      "ground": "Frankland Park",
      "result": {
        "hammondPark": { "goals": 0, "behinds": 0, "score": 0 },
        "opposition": { "goals": 0, "behinds": 0, "score": 0 },
        "winner": ""
      }
    }
  ]
}
```

### games/game-YYYY-MM-DD.json

```json
{
  "round": 1,
  "date": "2027-03-15",
  "opponent": "Opposition Team",
  "homeAway": "home",
  "quarters": [
    {
      "quarter": 1,
      "position": "midfielder",
      "mood": "motivated",
      "notes": "",
      "aleksStats": {
        "scoring": { "goals": 0, "behinds": 0, "goalAttempts": 0 },
        "marks": { "attempts": 0, "successful": 0 },
        "disposals": { "attempts": 0, "successful": 0 },
        "tackles": { "attempts": 0, "successful": 0 }
      },
      "teamScore": {
        "hammondPark": { "goals": 0, "behinds": 0, "score": 0 },
        "opposition": { "goals": 0, "behinds": 0, "score": 0 }
      }
    }
  ],
  "totals": {
    "aleksStats": {
      "scoring": { "goals": 0, "behinds": 0, "goalAttempts": 0 },
      "marks": { "attempts": 0, "successful": 0 },
      "disposals": { "attempts": 0, "successful": 0 },
      "tackles": { "attempts": 0, "successful": 0 },
      "points": 0
    },
    "teamScore": {
      "hammondPark": { "goals": 0, "behinds": 0, "score": 0 },
      "opposition": { "goals": 0, "behinds": 0, "score": 0 }
    }
  },
  "debrief": {
    "didWell": "",
    "workOn": ""
  }
}
```

**Points calculation:** `(goals x 6) + (behinds x 1) = points`

**Score calculation:** `(goals x 6) + behinds = score`

### stories/story-YYYY-MM-DD.json

```json
{
  "game": "2027-03-15",
  "round": 1,
  "generated": "2027-03-15",
  "english": {
    "headline": "",
    "commentator": "",
    "coach": ""
  },
  "bulgarian": {
    "headline": "",
    "commentator": "",
    "coach": ""
  }
}
```

---

## Stat Tracker - Interaction Model

### Alek's Three Buttons

| Button | Single Tap | Long Press |
|---|---|---|
| 🤲 Disposal | Attempt | Successful disposal |
| 🤼 Tackle | Attempt | Successful tackle |
| 🏉 Mark | Attempt | Successful mark |

### Scoreboard Interactions (Team Scoring)

| Interaction | Action |
|---|---|
| Single tap - Hammond Park side | Alek shot attempt |
| Double tap - Hammond Park side | Behind popup |
| Long press - Hammond Park side | Goal popup |
| Double tap - Opposition side | Behind (no player attribution) |
| Long press - Opposition side | Goal (no player attribution) |

### Fork Popup (Behind or Goal)

Appears after double tap or long press on Hammond Park side.

```
[ Alek ]     [ Teammate ]
```

Celebration animation plays AFTER attribution is selected, not before.

### Haptic Feedback

| Action | Haptic |
|---|---|
| Attempt / miss | Short, weak |
| Successful action | Long, strong |

### Mood Icons (Per Quarter)

| Value | Emoji | Meaning |
|---|---|---|
| `motivated` | 🔥 | Fired up, loving it |
| `neutral` | 😐 | Steady, doing the job |
| `tired` | 😮‍💨 | Blowing, needs a rest |

---

## Stat Display Rules

| Context | Format |
|---|---|
| In-game (per stat) | `x/y` (successful/attempts) |
| Season summary | `x/y` and `z%` |
| Points | Calculated field, displayed separately |

---

## Screen Layout (Tracker - Mobile First, No Scroll)

### Thumb Zone Logic

| Zone | Elements | Frequency |
|---|---|---|
| Top | Undo, Fixture, Menu, Q, Position, Timer | Rarely touched |
| Middle | Scoreboard (dominant, broadcast scale) | Occasionally |
| Bottom | Disposal, Tackle, Mark buttons | Constantly |

### Layout Structure

```
[Undo]      [Fixture]      [Menu]
Q2  [MID]  |  08:43  |  ▶ RUNNING
─────────────────────────────────
  HOME              AWAY
  [Team]        [Hammond Park]
  
     24      :      31
    4.0              5.1
─────────────────────────────────
⭐ ALEK #13
2G · 3D · 1M · 2T
─────────────────────────────────
  [🤲 Disposal]    [🤼 Tackle]
          [🏉 Mark]
─────────────────────────────────
```

### Position Selector

- Tap position label in top bar to change
- Options: No position / Defender / Midfielder / Attacker
- Locks automatically at quarter end
- Can be changed mid-quarter if Alek comes off bench

### Quarter Progression

- Hold quarter label to advance to next quarter
- Data locks at end of each quarter

---

## Design Language

- **Aesthetic:** Fox Footy broadcast overlay - think how Fox Footy presents live stats on screen
- **Feel:** Modern, clean, bold typography, purposeful use of green/white
- **Score:** Dominant on screen - visible to other parents mid-game without hesitation
- **Colour scheme:** Auto-detects home/away from fixtures.json and shifts entire UI accordingly
- **Platform:** Mobile-first, designed for one-handed use at an outdoor oval in winter

---

## Claude's Role - Storytelling Only

Claude does NOT handle data storage, calculations, or session management. Claude writes stories only.

### Story Structure (Per Game)

**English:**
- `headline` - punchy match headline
- `commentator` - Fox Footy style commentary about Hammond Park and Alek's performance. Alek loves feeling like a real AFL star. Rich, vivid, exciting.
- `coach` - Coach's notes tone. Acknowledges what went well, identifies one or two areas to work on. Warm but purposeful. Uses debrief fields (`didWell`, `workOn`) as primary input.

**Bulgarian:**
- Same three fields, translated and adapted in tone
- Grandparent audience - warm, proud, descriptive
- 2-3 rich paragraphs that help someone who wasn't there imagine the game and feel close to Alek

### Story Input Claude Receives

When generating a story, Claude will receive a structured JSON block containing:
- Game metadata (round, opponent, home/away, date)
- Quarter-by-quarter stats and positions
- Totals
- Mood per quarter
- Quarter notes
- Post-game debrief (didWell, workOn)
- Season context (optional - for richer storytelling)

### Storytelling Guardrails

- No pre-recorded message library - Claude has creative freedom
- Stories should feel fresh, specific to this game, never templated
- Reference specific stats as evidence, not as a list
- Vary the structure and opening each week
- Reference position (defender/midfielder/attacker) to contextualise stats
- Reference quarter mood where it adds colour
- English commentator voice: energetic, specific, AFL broadcast style
- Bulgarian voice: warm, narrative, written for a proud grandparent
- Coach notes: constructive, encouraging, never harsh for a 9-year-old

### Season Arc (On Demand)

When asked to write a season arc, Claude receives all game JSON files and produces:
- A narrative of Alek's development across the season
- Key moments and milestones
- Trends in his stats (improvement in accuracy, consistency, etc.)
- Written in the same commentator/coach dual structure

### Token Efficiency Rules

- Claude receives only the structured JSON block - no conversational preamble
- Stories are generated once and saved to `stories/story-YYYY-MM-DD.json`
- Stories are never regenerated unless explicitly requested
- Season arc uses a compact season state block, not full chat history

---

## Family Screen (Bulgarian) - Design Notes

- Password entry in Bulgarian, case-insensitive, caps and numbers only
- Latest game story shown by default
- All past game stories accessible
- Fixtures shown in fan/grandparent tone - not admin schedule
- Season arc available on demand
- Key stats shown visually alongside stories so grandparents can visualise the game
- Tone throughout: warm, proud, close to the action despite being far away

---

## Fixtures Screen - Tone by Audience

| Audience | Tone |
|---|---|
| English (Zak) | Admin - round, date, ground, opponent, result |
| Bulgarian (Family) | Fan - "Round 3 - Alek takes on the..." warm narrative framing |

---

## Future Considerations (Not in v1)

- Player number may change next season - always read from `season-config.json`
- `seasonTeamName` field reserved for next year's team name
- `nicknames` array in player config for story variety
- `shoeColour` and other personal details for richer stories
- `extras` object in season-config for anything not yet anticipated

---

*Project: 2027-afl-kids-tracker*
*Repo: github.com/zstoimenov/2027-afl-kids-tracker*
*GitHub Pages: zstoimenov.github.io/2027-afl-kids-tracker*
*Last updated: 2026-06-27*
