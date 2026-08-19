# Value pool videos

Drop an MP4 here named after the value pool and it appears automatically in that
pool's panel — no code change needed. Anything missing falls back to a marked
placeholder tile, and tapping the tile still opens the expanded view.

| File                               | Value pool                   | Real-world visual direction        |
| ---------------------------------- | ---------------------------- | ---------------------------------- |
| `ai-strategy-engineering.mp4`      | AI Strategy & Engineering    | Enterprise / operating-model scale  |
| `data-for-ai.mp4`                  | Data for AI                  | Data operations, real environments  |
| `process-ai.mp4`                   | Process AI                   | People and agents working a process |
| `agentic-legacy-modernization.mp4` | Agentic Legacy Modernization | Existing estate being modernised    |
| `physical-ai.mp4`                  | Physical AI                  | Manufacturing floor (Nitin's example) |
| `ai-trust.mp4`                     | AI Trust                     | Governance / assurance in practice  |

## Brief

From Nitin Mankar's review on 14 Aug 2026:

- **30 seconds to 1 minute per pool.** Longer than a background loop — these are
  watched, not glanced at.
- Scripted and cut by Charleselena, based on the **definitions doc** already
  shared.
- **Real-world visuals**, not abstract motion. A manufacturing floor for Physical
  AI was the example given.
- This is where the creative effort goes. On the wall video Nitin said both
  opening concepts were fine and the real work is in each value pool section.

## Specs

H.264 MP4, 16:9, 1080p. **No audio track** — the panel plays muted and looped,
so anything essential has to be carried visually or on-screen. Keep each file
under ~40 MB so the booth machine runs fully offline and the shared link stays
usable.

At 30–60s these will be noticeably heavier than the 15 MB originally budgeted;
six of them plus the intro is the bulk of the deployed size. Worth checking the
total before the event if the demo is served over conference wifi.

## Case studies

Each pool's panel now carries a swipeable deck: the value pool film first, then
its case studies. Tapping any tile opens it full screen.

`cases/<pool-id>-<n>.jpg` are the thumbnails. Text lives in `cases` on each pool
in [../../src/data.js](../../src/data.js) — client, title, challenge, what we
did, outcome, and a headline metric.

> **All of it is placeholder.** The write-ups are invented stand-ins for the
> **403 client-masked case studies** Infosys is tagging (113 offerings mapped so
> far), and the thumbnails are AI-generated scenes, not photographs of real
> client sites. The lightbox shows a **PLACEHOLDER CONTENT** badge so nobody in
> the room reads them as real client claims.
>
> Set `BRAND.casesArePlaceholder = false` in `src/data.js` once real studies and
> real photography are in — that removes the badge. Don't clear it before the
> content is genuinely replaced.

## Poster frames

`posters/<pool-id>.jpg` is the still sitting in each pool's **film slot** until
the real MP4 lands, so the panel reads the way it will with video in place.
Dropping in `<pool-id>.mp4` replaces it automatically — no code change.

These are purpose-shot-looking stand-ins, one per pool, generated with
`openai/gpt-image-2` and graded toward that pool's accent colour: an enterprise
command floor for AI Strategy, a data centre cold aisle for Data for AI, an
operations floor for Process AI, a server room mid-modernisation for Agentic
Legacy, an automotive line throwing sparks for Physical AI (Nitin's example), a
security operations centre for AI Trust. 900x440 JPEG, ~70 KB each.

They are **placeholder like everything else here** — cinematic AI stills, not
frames from the real films. Replace each one with a genuine frame from the
finished cut, which is also the cheapest way to make the panel look right before
the videos themselves are cleared.

Thumbnails are 1280×720 JPEG, ~80 KB each. Three per pool keeps the deck
scrolling without inventing more than necessary; the structure takes any number.

## Background plates

`backgrounds/<pool-id>.jpg` is the atmospheric plate behind each pool, described
in the root [README](../../README.md). Abstract, very dark, one accent hue each,
left half kept empty for the copy column. 1600x900 JPEG, ~130 KB each.

Placeholder like the rest: generated, not shot. They are the least urgent thing
here to replace — they are meant to be barely noticed.

If you replace one, **check it against the others for brightness**. The set is
normalised so all six read at the same strength (~57 mean luminance over the open
right side), and that correction is baked into the files rather than applied at
runtime. A raw generated plate dropped in next to these will look either invisible
or far too hot.
