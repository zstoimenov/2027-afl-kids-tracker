# Story generation — prompt & process

> The full end-to-end game pipeline (what to produce when a game JSON is pasted,
> and how to ship it) lives in **`GAME-WORKFLOW.md`** at the repo root. This file
> is the story-craft detail it refers to: length, tone, and guardrails.


Claude writes the stories. The app only stores and displays them. Stories are
generated **once per game** from that game's JSON and saved; they are never
regenerated unless explicitly asked.

## Inputs Claude receives

- The game file: `docs/data/games/game-YYYY-MM-DD.json` (quarters, totals,
  positions, per-quarter mood + notes, debrief `didWell` / `workOn`).
- The fixture row for that round (opponent, home/away, ground, date).
- Optional season context (prior games, running stats) for richer colour.

No conversational preamble — just the structured JSON block.

## Output

A single file: `docs/data/stories/story-YYYY-MM-DD.json`

```json
{
  "game": "2026-07-04",
  "round": 10,
  "generated": "2026-07-05",
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

Then add the date string to `docs/data/stories/index.json` so the Match
Reports screen lists it.

## Length & tone

- **Keep it short — a quick, exciting read for an 8-year-old.** The
  `commentator` Play-by-Play is the page Alek opens after a game: **no more than
  a couple of paragraphs**, two tight and vivid beats a wall of text. `coach`
  stays brief too. Think a short newspaper clipping, not a feature — rich and
  specific, never a stat dump, never padded to a word count.
- `headline` — punchy, one line.
- `english.commentator` — Fox Footy broadcast energy. Alek should feel like he
  is reading about himself in the paper. Reference specific moments (a goal, a
  smother, a run of tackles) as evidence, name his position, use the quarter
  mood where it adds colour.
- `english.coach` — coach's-notes tone. Acknowledge what went well, name one or
  two things to work on. Warm but purposeful; uses the debrief fields as the
  primary steer. Never harsh for a 9-year-old.
- `bulgarian.*` — same three fields, adapted (not literally translated) for a
  proud grandparent audience: warm, narrative, vivid enough that someone who
  wasn't there can picture the game and feel close to Alek.

## Guardrails

- No templates or a pre-written message library — each story fresh and specific.
- Vary the structure and the opening every week.
- Reference the established colour: #13, the orange boots, Frankland Park (home).
- Stay true to the facts in the game JSON — invent atmosphere, not events.

### Two facts to always get right

- **Age** — read Alek's age from `season-config.json`: `season − player.birthYear`
  (2026 → 8, 2027 → 9, …). Never hardcode it; use the season's correct age.
- **Kit colours** — every Hammond Park team plays in the **club** colours:
  **green/white at home, white/green away**. The team is named *Hammond Park
  Blue* (BG: *Сините* / "the Blues"), but they do **not** wear blue. Keep the
  name; never dress them in blue. The orange boots are Alek's, not the kit.

## Season arc (Phase 7, on demand)

When asked, Claude reads all game JSONs for a season and writes a season-arc
narrative (development, milestones, stat trends) in the same dual
commentator/coach structure. Saved separately; not auto-generated.
