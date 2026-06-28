# Story generation — prompt & process

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

- **Target a 3–5 minute read** for the narrative voices — roughly 500–800
  words across `commentator` + `coach` combined per language. Rich and
  specific, never a stat dump.
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
- Reference the established colour: #13, the orange boots, Hammond Park Blue,
  Frankland Park (home).
- Stay true to the facts in the game JSON — invent atmosphere, not events.

## Season arc (Phase 7, on demand)

When asked, Claude reads all game JSONs for a season and writes a season-arc
narrative (development, milestones, stat trends) in the same dual
commentator/coach structure. Saved separately; not auto-generated.
