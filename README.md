# Unlock AI Value — interactive hexagon demo

A three.js show-and-tell for **Confluence US 2026**: the Infosys AI-First Value
Framework as a touchable 3D hexagon. Tap any of the six value pools and the
board reconfigures — the segment lifts and takes on its accent colour, the rest
recede, a procedural 3D visual takes over the centre, and a panel slides in with
a one-line hook, three points, and a video.

Built for a booth: big hit targets, attract mode, and an idle reset so it looks
alive when nobody is standing at it.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173. For the booth machine, build a static bundle:

```bash
npm run build
```

`dist/` is fully self-contained and uses relative paths, so it runs from a USB
stick, a local folder, or any static host — no network needed.

## Interaction

| Input | What it does |
| --- | --- |
| Tap / click a segment | Opens that value pool |
| Tap the centre or outside the hexagon | Back to the overview |
| `1`–`6` | Jump straight to a pool (presenter shortcut) |
| `←` `→` | Cycle pools |
| `esc` | Back to the overview |
| Panel arrows / dots | Cycle pools |

Idle behaviour: after 9 seconds on the overview a highlight sweeps around the
ring to pull people in. After 60 seconds inside a pool it drops back to the
overview on its own.

## Dropping in videos

Put an MP4 in `public/media/` named after the pool and it appears automatically
— nothing to wire up. Missing files fall back to a marked placeholder tile, so
the demo is always presentable.

```
public/media/ai-strategy-engineering.mp4
public/media/data-for-ai.mp4
public/media/process-ai.mp4
public/media/agentic-legacy-modernization.mp4
public/media/physical-ai.mp4
public/media/ai-trust.mp4
```

Specs and the full list live in [public/media/README.md](public/media/README.md).
Short (10–20s), muted, 16:9, H.264.

## Changing the words

All copy — pool titles, verbs, hooks, bullets, the headline facts — lives in
[src/data.js](src/data.js). Nothing else needs touching to re-cut the messaging.
Keep bullets to roughly five words; the panel is designed to be glanced at, not
read.

Each pool also names its centre visual via `viz`. The six procedural scenes
(`orbit`, `lattice`, `flow`, `rebuild`, `pulse`, `shield`) are in
[src/coreviz.js](src/coreviz.js) — swap the name to reassign one.

## Layout

- [src/hex.js](src/hex.js) — builds the hexagon: two bevelled bands per sector
  plus canvas-texture labels, laid out on a pointy-top hexagon so the six edges
  land exactly where they do in the framework artwork.
- [src/coreviz.js](src/coreviz.js) — the six centre visuals.
- [src/main.js](src/main.js) — scene, bloom, raycasting, state machine, panel
  wiring, attract/idle behaviour.
- [src/style.css](src/style.css) — overlay UI. Landscape puts the panel on the
  right; portrait (a tall kiosk panel) turns it into a bottom sheet.

## Booth notes

- Runs on any machine with a GPU that can do WebGL2; pixel ratio is capped at 2.
- Portrait and landscape both work — the layout switches on aspect ratio.
- Chrome kiosk mode: `chrome --kiosk --app=file:///path/to/dist/index.html`
  (serve `dist/` over `http://` instead if you want video autoplay to be
  reliable — `python3 -m http.server` from inside `dist/` is enough).
- `window.__demo` is exposed for quick on-site tuning (`__demo.select(0)`).
