# Unlock AI Value — interactive hexagon demo

A three.js show-and-tell for **Confluence US 2026**: the Infosys AI-First Value
Framework as a touchable 3D hexagon. It opens on a looping video homepage;
**Begin** drops you into the framework. Tap any of the six value pools and the
board reconfigures — the segment lifts and takes on its accent colour, the rest
recede, a procedural 3D visual takes over the centre, and the right-hand column
swaps to that pool's hook, three points, and a video.

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
| **Begin** (or tap anywhere on the intro, or Enter/Space) | Enters the framework |
| Tap / click a segment | Opens that value pool |
| Tap the centre or outside the hexagon | Back to the overview |
| `1`–`6` | Jump straight to a pool (presenter shortcut) |
| `←` `→` | Cycle pools |
| `esc` | Back to the overview |
| Panel arrows / dots | Cycle pools |

Idle behaviour, so the booth resets itself:

| Untouched for | What happens |
| --- | --- |
| 9s on the overview | A highlight starts sweeping around the ring |
| 60s inside a pool | Drops back to the framework overview |
| 90s | Returns to the looping intro — the attract loop |

## The intro video

`public/media/intro.mp4` is the homepage loop. It **must be H.264** — HEVC does
not play in Firefox and is unreliable in Chrome off macOS, so an HEVC file will
show a black screen at the booth. To convert a new clip (`avconvert` ships with
macOS, no install needed):

```bash
avconvert --source "/path/to/new-clip.mov" --preset Preset1920x1080 --output public/media/intro.mp4 --replace --progress
```

Keep it silent and seamless — it loops muted and autoplays. If the file is
missing the intro still renders over its gradient, so the demo never breaks.

## The guidebook takeaway

At the end of every pool panel there's a **Download the guidebook** button. It
opens a full-screen QR code; scanning it takes the visitor to a landing page
where they enter their details and Infosys sends them the guidebook.

The QR is rendered locally from the URL, so it works with no network at the
booth. To point it somewhere new, change one line in
[src/data.js](src/data.js) — `BRAND.guidebook.url`. The code re-encodes itself;
there is no image to regenerate.

> **Currently a placeholder.** `url` points at the public Infosys page. Swap it
> for the real lead-capture landing page before the event, or nobody's details
> get collected. That page is Infosys's to build and host — this demo only links
> to it and never collects personal data itself.

The CTA deliberately does **not** appear on the framework overview; it shows up
only once a visitor has opened a value pool and read something.

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

Specs, the full list and the creative brief live in
[public/media/README.md](public/media/README.md). 30–60s per pool, muted, 16:9,
H.264, real-world visuals.

Tapping the thumbnail expands the clip to near-full screen. Dismiss with the
close button, the backdrop, or `esc`. Before the MP4s land the expanded view
shows the same marked slot, so the interaction still demos.

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
