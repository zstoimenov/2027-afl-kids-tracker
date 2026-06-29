# Game processing workflow — for Claude Code

This is the canonical instruction file for turning a freshly-tracked game into
live content. When the user pastes a game JSON into Claude Code, **read this
file first**, then follow it end to end.

The user's role stops at pasting the JSON and approving the PR. Everything in
between — generating narrative, writing files, updating manifests, pushing, and
opening the PR — is yours.

---

## The pipeline

1. **User generates** the game JSON in the app (tracker → summary → **Copy JSON**).
2. **User pastes** the JSON into Claude Code.
3. **Claude Code reads this file** and understands the workflow, guardrails, and required output.
4. **Claude Code generates** the stories, summaries, and all narrative components per the rules below.
5. **Claude Code writes/updates** the repo files, pushes to the dev branch, and opens a PR.
6. **User confirms** the PR on GitHub → the app updates and is live.

Do not ask the user to create or edit any data file by hand. Do not push to
`main`. Develop on the active branch in `CLAUDE.md` and open a PR.

---

## Inputs you receive

- **The pasted game JSON** — the live export. Its schema is documented in
  `CLAUDE.md` (game `events` stream, `quarters`, `totals`, `debrief`, etc.).
- **The repo** — for season context: prior `docs/data/games/*.json`,
  `docs/data/fixtures*.json` (opponent, ground, home/away), and
  `docs/data/season-config.json` (player name, number, birth year, colours).

Derive everything else from these. Invent atmosphere, never events or stats.

---

## Required outputs

For each pasted game, produce **all four** of the following.

### 1. Game file + index

- Write the pasted JSON verbatim to `docs/data/games/game-YYYY-MM-DD.json`
  (use the game's `date`). Do not alter the numbers.
- Add the date string to the `games` array in `docs/data/games/index.json`
  (keep it sorted; don't duplicate).

This alone makes the result appear on the Fixtures screen.

### 2. Per-game match report — EN + BG

Write `docs/data/stories/story-YYYY-MM-DD.json` and add the date to
`docs/data/stories/index.json` (with its `round`).

```json
{
  "game": "YYYY-MM-DD",
  "round": 0,
  "generated": "YYYY-MM-DD",
  "english":   { "headline": "", "commentator": "", "coach": "" },
  "bulgarian": { "headline": "", "commentator": "", "coach": "" }
}
```

- Fill **both** `english` and `bulgarian` — all three fields each. (Historical
  2026 files left `bulgarian` empty; new games must not.)
- `headline` — punchy, one line.
- `commentator` — Fox Footy broadcast energy (EN) / warm proud-grandparent
  narrative (BG). Reference specific moments as evidence; name his position; use
  quarter mood for colour.
- `coach` — coach's-notes tone. Acknowledge what went well, name one or two
  things to work on, driven by `debrief.didWell` / `debrief.workOn`. Warm and
  constructive — never harsh for a child his age.
- **Length:** target a 3–5 minute read — roughly 500–800 words across
  `commentator` + `coach` per language. Rich and specific, never a stat dump.

### 3. BG season chapter

Append a chapter to the season narrative bundle
`docs/data/stories/YYYY.json` (e.g. `2026.json`). This is the long-form BG read
the grandparents follow via the season story picker, and its `title` is what the
BG Fixtures card shows for the game.

```json
{ "round": 0, "title": "Глава N — …", "body": "" }
```

- Match the established chapter style: `title` is `Глава {round} — {short name}`;
  `body` is a rich Bulgarian narrative (~3 min read) continuing the season story.
- Add the new chapter to the `rounds` array in round order; don't duplicate.

### 4. Season arc refresh

Regenerate `docs/data/stories/season-YYYY.json` so the season arc and aggregate
narrative include the new game.

```json
{
  "season": 0,
  "english":   { "headline": "", "arc": "" },
  "bulgarian": { "headline": "", "arc": "" }
}
```

- Re-read every game file for the season and rewrite the arc as a cohesive
  development narrative (key moments, milestones, stat trends) in the dual
  commentator/coach voice. Keep EN and BG in sync in substance, adapted in tone.

---

## Guardrails

- **No templates.** Each story fresh and specific; vary the structure and the
  opening every week.
- **Stay true to the JSON.** Invent atmosphere, not events or numbers.
- **Established colour:** #13, the orange boots, Frankland Park (home ground).
- **Age** — compute from `season-config.json`: `season − player.birthYear`
  (2026 → 8, 2027 → 9, …). Never hardcode it.
- **Kit colours** — every Hammond Park team plays the **club** colours:
  **green/white at home, white/green away**. The team is *Hammond Park Blue*
  (BG: *Сините* / "the Blues") but does **not** wear blue. Keep the name; never
  dress them in blue. The orange boots are Alek's, not the kit.
- **Don't regenerate** existing stories unless explicitly asked — only add the
  new game (the season arc is the one file you rewrite each time, by design).

---

## Finishing up

1. Make sure all four outputs are written and the two `index.json` manifests
   include the new date.
2. Bump the service worker shell cache in `docs/sw.js` **only if** a shell asset
   (HTML/CSS/JS/icon) changed — pure data additions do not require a bump.
3. Commit with a clear message, push to the active dev branch (see `CLAUDE.md`),
   and open a PR summarising the game and the files added.
4. Hand the PR link back to the user to confirm.
