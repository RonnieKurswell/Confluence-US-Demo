# Unlock AI Value — interactive hexagon demo

A three.js show-and-tell for **Confluence US 2026**: the Infosys AI-First Value
Framework as a touchable 3D hexagon. It opens on a looping video homepage;
**Begin** warps you into the framework. Tap any of the six value pools and that
segment is pushed to the middle of the screen and zoomed into while the others
fade away, with its hook, three points, film and case studies on the left.

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
| **Begin** (or tap anywhere on the intro, or Enter/Space) | Plays the warp, lands on the stats page |
| **The Infosys lockup**, top left | Starts the whole experience over, from any screen |
| **Auto play**, top right | Runs the demo unattended, on a loop |
| **Explore the framework** (or Enter/Space) | Leaves the stats page for the hexagon |
| Tap / click a segment | Opens that value pool |
| Tapping outside the pool | Returns to the hexagon |
| Swiping horizontally | Moves to the next / previous pool |
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

The current loop is 1920x1080, 5s, 3 MB. It is deliberately dark and even, so
the intro scrim and the `brightness()` on `.intro-video` are tuned light. Swap in
a brighter clip and both need raising again or the copy will lose contrast.

## The warp transition

Pressing **Begin** plays `public/media/warp.mp4` once before the framework
appears — a hexagonal wormhole that matches the board's geometry.

The source is 12s. `WARP_MS` in [src/main.js](src/main.js) compresses it via
`playbackRate`, currently to **6 seconds**; change that one constant to retime
it. The pool names that fly past are timed off the same constant, so they
rescale with it. Note the 19 Aug review asked for 3s — 6s was a later call, and
it is the longest a visitor stands waiting anywhere in the demo.

It is decorative and can never block entry. A missing file, a blocked
`play()` or a stalled decode all fall straight through to the framework, and any
tap or key press skips it.

## Brand lockup

Top left, on every screen: the Infosys mark, a hairline rule, then the demo's
name. The line itself is `BRAND.brandLine` in [src/data.js](src/data.js).

It is also a button — pressing it starts the experience over from the intro, from
wherever the visitor happens to be. It sits above the panel and the case / QR
layers, so it is the one control that is always reachable and nobody can get
stranded somewhere with no way back.

## Auto play

Top right, opposite the lockup. It walks the whole thing on its own — intro,
warp, stats, board, then each of the six pools in turn — and loops until it is
switched off. Two jobs: the booth plays itself when nobody is standing at it, and
a presenter can let it run while they talk over the top.

Timings are one object, `TOUR_HOLD` in [src/main.js](src/main.js):

| Beat | Hold |
| --- | --- |
| Warp | `WARP_MS` + 0.7s |
| Stats | 6s |
| Board, before the first pool | 3.2s |
| Each value pool | 7s |
| Intro, before going round again | 2.4s |

That is roughly a 65-second loop. `__demo.TOUR_HOLD` is live, so the beats can be
retuned at the booth without a rebuild. It drives the same functions a visitor's touch
does rather than synthesising clicks, so there is one code path for both.

**Any touch or key press anywhere drops it back to manual**, so the tour never
fights whoever walks up to the booth. Its own button is the exception. It also
counts each beat as input, so the idle timers below never fire underneath it and
pull it back to the intro mid-loop.

It runs the main spine only — it does not open the case galleries, the expanded
film or the QR code, which would push the loop past two minutes.

The mark is currently a **text stand-in**. Save the real logo as
`public/media/brand-logo.svg` (or `.png`) and it swaps itself in — same
resolve-if-present pattern as the videos, no code change needed. A white or
light version is what the dark background needs.

## Screen order

1. **Intro** — looping video, centred headline and Begin
2. **Warp** — the wormhole, naming each pool as it flies past
3. **Stats** — a centred title card over a drifting hexagon field
   ([src/constellation.js](src/constellation.js)), with the three proof points
   as one divided row and a Continue control
4. **Hexagon** — the board, touch a value pool
5. **Value pool** — sector pushed to centre and zoomed, copy on the left

The board is held back entirely until the stats page is dismissed, so stages 3
and 4 read as separate screens rather than one crowded one.

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

## Moving between pools

The board eases between pools over about half a second. The copy used to be
replaced in a single frame, so the words and the thumbnail snapped while the
object glided, which read as mechanical. Each block now enters on a short
stagger — verb, title, description, the three bullets one after another, then the
film slot and the actions — and it enters **from the direction of travel**, so
swiping forward and swiping back feel different. The poster gets a little scale
on top so the film slot lands rather than appears.

It is **enter-only**, deliberately. A true cross-fade means holding the new copy
back until the old has left, and a booth cannot afford to feel laggy; the board
moving underneath covers the cut. `replayPanelSwap()` in
[src/main.js](src/main.js) restarts it, and the timings are the
`animation-delay`s under `.panel-swap` in [src/style.css](src/style.css).

Respects `prefers-reduced-motion`.

## Per-pool backgrounds

Each value pool has its own background plate in `public/media/backgrounds/`,
sitting behind the WebGL canvas and cross-fading as visitors move between pools,
so each pool has a sense of place instead of all six sharing one black void. The
framework overview and the intro carry none — the board stays neutral, and the
place arrives with the pool.

The plates are **quads inside the 3D scene**, parked at `PLATE_Z` behind
everything, cross-fading against each other. The obvious approach — a DOM image
behind a transparent canvas — does not work here and it is worth knowing why: the
post-processing chain (bloom, output pass) writes **opaque alpha**, so the canvas
paints over whatever sits behind it no matter what `alpha: true` promises. The
symptom is that every pool looks like the same starry void. In the scene there is
no compositing question at all.

Two knobs:

- `PLATE_OPACITY` in [src/main.js](src/main.js) — how strongly a plate reads,
  currently `0.8`. Exposed as `__demo.platePair` for tuning at the venue.
- `.pool-bg` in [src/style.css](src/style.css) — the scrim over the top, which
  guarantees a contrast floor for the copy whatever the plate does. Heaviest on
  the left in landscape, rolling to the bottom in portrait where the copy becomes
  a sheet. **If a plate ever fights the words, lift the scrim rather than dimming
  the plate.**

A missing texture leaves the quad blank and the base colour shows, the same
resolve-if-present behaviour as the videos, so a bad filename never breaks it.

**These are Evelyn's, exported from Figma on 28 Aug.** They replace the generated
placeholders entirely, so nothing in this folder is stand-in artwork any more.

Source: the `Backgrounds 3.0` page, `For Demo` row. Each section frame there holds
the full-resolution background as a separate image fill under the mockup UI, so
the plates are pulled clean with no text baked in. They are centre-cropped to
16:9 and saved at 1600x900, matching what the plate quads sample.

Art direction from the 25 Aug review: one blue tone throughout, soft 3D and
slightly realistic, with the pools separated by subject rather than by hue. The
six subjects are a datacenter, a city plaza, a dashboard field, an industrial
floor, a smart city, and a process hub.

They run brighter than the plates they replace, roughly 64 to 75 mean against 41
to 54 before. That was checked rather than assumed: compositing the plate at
`PLATE_OPACITY` over the scene and applying both `.pool-bg` scrim layers, the
worst contrast anywhere in the copy column is 4.85:1, which still clears the 4.5
needed for body text. Most of the column sits between 6:1 and 17:1. So the scrim
did not need changing.

If a future set comes in brighter still, re-run that check before shipping it.
The copy column is the left third; the danger zone is its right edge, around 44%
across, where the scrim has already faded out.

### The two stage plates

`stats.jpg` and `overview.jpg` back the stats title card and the framework
overview. Those two screens used to sit on the plain ground, so unlike the pool
plates they needed wiring as well as exporting: `resolvePlate()` now picks the
plate from the stage each frame rather than only when a pool is selected, and
both render at full strength instead of `PLATE_OPACITY`.

They came out of the frames as single image nodes overflowing the artboard, so
exporting the node gives the plate already cropped to 16:9 with no UI on it.

The stats plate carries a flat multiply layer in Figma that its isolated export
does not include. Comparing Evelyn's rendered frame against the clean plate gives
a per-channel ratio of 0.268, 0.520, 0.725, consistent to within 0.002 across
every clean region, so it is a pure multiply and is baked into the file. The
result matches her frame to within half a level per channel. The overview plate
needed nothing: its clean export already matches her frame.

Adding the stats plate cost the sub-paragraph its legibility, since the light
shaft in the artwork lands exactly where that line sits. Measured against the
real element boxes at 1920x1080 it fell to 2.67:1 against `--ink-soft`, under the
4.5 body text needs. `body.stats-open .pool-bg` puts a soft centred scrim behind
the copy, which lifts it to 5.56:1 and leaves the artwork alone. Every other
element on that page clears its threshold with room to spare.

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

The film sits inline in the panel, showing that pool's poster frame from
`public/media/posters/` until the real MP4 lands, and expands to near-full
screen on tap. Case
studies are one step behind their own control, opening a full-screen gallery;
picking one shows its write-up beside the still, and closing returns to the
gallery rather than all the way out.

**The case studies are placeholder** — invented text and AI-generated
thumbnails standing in for the 403 client-masked studies Infosys is tagging.
They carry a visible badge saying so. See
[public/media/README.md](public/media/README.md).

## Type

Bullets are marked with a small pointy-top hexagon in the pool's accent, cut to
the same proportion as the board's own sectors, so the list reads as part of the
framework rather than a generic bulleted list.

Geist for display — headlines, pool titles and every control — and Inter for
body copy, mirroring the split on the Infosys site. Titles are **Geist Medium
(500)**, not bold; tracking was relaxed to suit the lighter weight. Both are
self-hosted, so the booth machine needs no network: Geist's weights sit in
`public/fonts/`, Inter comes in through `@fontsource-variable/inter`.

The board's labels are baked into canvas textures, so `src/main.js` waits for
Geist to load before building the hexagon — canvas text falls back silently to a
system face if the webfont has not arrived yet, and the texture only bakes once.

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
- [src/style.css](src/style.css) — overlay UI. Landscape puts the copy column on
  the left; portrait (a tall kiosk panel) turns it into a bottom sheet.

## Opening a value pool

Selecting a pool pushes that sector to the middle of the free space, rolls it
square and zooms in, while the other five fade out.

Squaring a sector up leaves a half-turn ambiguity, and taking the shortest turn
lands three of the six mirrored — the verb band above the title for some pools
and below it for others, which reads as the object jumping up and down as
visitors swipe. So the roll picks the half-turn that always points the sector
outward-down, putting the verb above the title for all six, matching the
eyebrow-then-title order of the copy column. The labels carry the opposite of
whatever that adds beyond squaring up (`labelFlip`), so the text stays upright
while the geometry turns underneath it. Detail copy appears on the
left. There is no Back button — an instruction under the object says to swipe
between pools or tap outside to return, which keeps the chrome off the screen. `FOCUS_SCALE` in [src/main.js](src/main.js) sets
how far it zooms; the damping is tuned so the move settles in about half a
second, which is the responsiveness the brief asks for.

## Booth notes

- Runs on any machine with a GPU that can do WebGL2; pixel ratio is capped at 2.
- Portrait and landscape both work — the layout switches on aspect ratio.
- Chrome kiosk mode: `chrome --kiosk --app=file:///path/to/dist/index.html`
  (serve `dist/` over `http://` instead if you want video autoplay to be
  reliable — `python3 -m http.server` from inside `dist/` is enough).
- `window.__demo` is exposed for quick on-site tuning (`__demo.select(0)`,
  `__demo.startTour()`).
