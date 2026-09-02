import '@fontsource-variable/inter';

import { POOLS, BRAND } from './data.js';
import { createBoard } from './hexboard.js';
import { createBackdrop } from './backdrop.js';

const IDLE_RESET_MS = 60_000; // kiosk: drop back to the overview after a minute
const ATTRACT_AFTER_MS = 9_000; // idle on the overview: start sweeping segments
const INTRO_RETURN_MS = 90_000; // untouched for this long: back to the intro loop
const WARP_MS = 12_000; // the wormhole clip at its own speed, not compressed
// The objects need room to arrive before the names start landing on top of
// them, so the first pool name holds off until the jump is underway.
const WARP_NAMES_DELAY_MS = 2_500;
// The clip ends on a white flash, and white text over it is unreadable. Names
// finish this far before the end so they are gone before the fade begins.
// Retime this if the tail of John's video changes.
const WARP_TAIL_MS = 3_200;
// Each name's own animation. Shorter than the gap between them, so one clears
// before the next arrives rather than the two overlapping into mush.
const WARP_NAME_MS = 1_100;
const FOCUS_SCALE = 2.5; // how far the board zooms when a pool is opened (2.1 -> +20%)

/* The copy above the fold is held until the face is in — see .fonts-ready in
 * the stylesheet. The board no longer bakes its labels into canvas textures,
 * but the DOM copy still paints and then reflows if it lands in the fallback
 * face first, which is the flicker on first load. These are the weights the
 * design actually uses: 500 for display and titles, 600 for eyebrows.
 *
 * This used to sit beside the three.js board build. It moved here when that
 * went, and it must not be dropped: without it every screen's copy, and the
 * lockup with it, stays at opacity 0 for good. */
await Promise.all(
  ['500 40px Geist', '600 40px Geist'].map((f) => document.fonts.load(f).catch(() => {}))
);
document.documentElement.classList.add('fonts-ready');

/* ------------------------------------------------------------------ *
 * Background plates
 *
 * Two DOM layers cross-faded against each other, so a stage can change its
 * ground without a cut. These were WebGL quads until the board stopped being
 * 3D; as plain elements they cost nothing and the browser does the fade.
 * ------------------------------------------------------------------ */

// How strongly a pool plate reads. Full strength was too bright behind the
// copy, so it sits at 80%. Live on __demo for tuning at the venue.
const PLATE_OPACITY = 0.8;

const plateUrl = (name) => `${import.meta.env.BASE_URL}media/backgrounds/${name}.jpg`;

// The stats card gets its own plate at full strength: it already carries the
// tint Evelyn puts over it in Figma, so dimming it would just muddy artwork
// that is already balanced for the copy sitting on it.
//
// The framework screen no longer takes one. overview.jpg is dark by design and
// the new hexagon is dark navy on white, so the two cannot share a screen. A
// light replacement is Evelyn's to supply.
const STAGE_PLATES = { stats: 'stats' };

const platePair = [document.getElementById('plateA'), document.getElementById('plateB')];
const plateState = { front: 0, current: null };

function setPlate(name, strength = PLATE_OPACITY) {
  if (plateState.current === name) return;
  plateState.current = name;
  if (!name) {
    platePair.forEach((n) => (n.style.opacity = '0'));
    return;
  }
  // Bring the idle layer in with the new plate and retire the other.
  const next = 1 - plateState.front;
  platePair[next].style.backgroundImage = `url("${plateUrl(name)}")`;
  platePair[next].style.opacity = String(strength);
  platePair[plateState.front].style.opacity = '0';
  plateState.front = next;
}

// Which plate belongs to the moment. Driven by the stage rather than by
// select(), so the stats card gets one too and not just an open pool.
function resolvePlate() {
  if (introOpen() || warpOpen()) setPlate(null);
  else if (statsOpen()) setPlate(STAGE_PLATES.stats, 1);
  else if (state.selected >= 0) setPlate(POOLS[state.selected].id);
  else setPlate(null);
}

/* ------------------------------------------------------------------ *
 * Backdrop
 * ------------------------------------------------------------------ */
const backdrop = createBackdrop(document.getElementById('backdrop'));

/* ------------------------------------------------------------------ *
 * The framework hexagon
 * ------------------------------------------------------------------ */
const board = createBoard({
  host: document.getElementById('board'),
  pools: POOLS,
  artUrl: `${import.meta.env.BASE_URL}media/hex/piece.jpg`,
  centre: BRAND.centerTitle,
  // A tap in a channel between pieces reads as "off the board" and closes the
  // pool, the same as tapping the background did on the 3D version.
  onSelect: (i) => (i >= 0 ? select(i) : deselect()),
});

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */
const state = {
  selected: -1,
  isPortrait: false,
  lastInput: performance.now(),
  attract: -1,
  attractTimer: 0,
};

function layout() {
  state.isPortrait = innerHeight / innerWidth > 1 || innerWidth < 900;
}

addEventListener('resize', layout);
layout();


/* ------------------------------------------------------------------ *
 * DOM
 * ------------------------------------------------------------------ */
const el = (id) => document.getElementById(id);
const dom = {
  overview: el('overview'),
  panel: el('panel'),
  verb: el('panelVerb'),
  title: el('panelTitle'),
  hook: el('panelHook'),
  media: el('panelMedia'),
  dots: el('dots'),
  lockup: el('lockup'),
  autoplay: el('autoplay'),
  prompt: el('prompt'),
  poolHint: el('poolHint'),
};

el('brandLine').textContent = BRAND.brandLine;
el('continueLabel').textContent = BRAND.continueCta;

// Save the real mark as public/media/brand-logo.svg (or .png) and it replaces
// the text stand-in automatically, the same way the videos resolve.
(async () => {
  for (const ext of ['svg', 'png']) {
    const url = `${import.meta.env.BASE_URL}media/brand-logo.${ext}`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.startsWith('image/')) continue;
      el('brandLogo').src = url;
      el('brandLogo').hidden = false;
      el('brandWord').hidden = true;
      return;
    } catch {
      /* keep the text stand-in */
    }
  }
})();
el('introHeadline').textContent = BRAND.intro.headline;
el('introSub').textContent = BRAND.intro.sub;
el('beginLabel').textContent = BRAND.intro.cta;
el('overviewHeadline').innerHTML = BRAND.headline.join('<br>');
el('overviewSub').textContent = BRAND.subhead;
el('overviewEyebrow').textContent = BRAND.statsEyebrow;
el('overviewEyebrow').hidden = !BRAND.statsEyebrow;
el('facts').innerHTML = BRAND.facts
  .map(
    (f, i) => `<div class="fact">
       <span class="fact-index">${String(i + 1).padStart(2, '0')}</span>
       <span class="fact-body"><span class="v">${f.value}</span><span class="l">${f.label}</span></span>
     </div>`
  )
  .join('');

dom.dots.innerHTML = POOLS.map((_, i) => `<i data-i="${i}"></i>`).join('');
dom.dots.addEventListener('click', (e) => {
  const i = e.target?.dataset?.i;
  if (i != null) select(Number(i));
});

if (matchMedia('(hover: none)').matches) document.body.classList.add('touch');

/* ------------------------------------------------------------------ *
 * Video slot — drops in automatically if public/media/<id>.mp4 exists
 * ------------------------------------------------------------------ */
const videoCache = new Map();
async function resolveVideo(id) {
  if (videoCache.has(id)) return videoCache.get(id);
  const url = `${import.meta.env.BASE_URL}media/${id}.mp4`;
  let found = null;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const type = res.headers.get('content-type') || '';
    if (res.ok && type.includes('video')) found = url;
  } catch {
    /* offline / missing — fall through to the placeholder */
  }
  videoCache.set(id, found);
  return found;
}

// The film sits inline in the panel. Case studies live behind their own control
// so the two are not competing for the same strip.
function buildMedia(pool) {
  dom.media.classList.remove('has-video');
  // Until the real films land, the pool's own generated scene stands in as a
  // poster frame so the panel reads the way it will with video in place.
  dom.media.innerHTML = `
    <video playsinline muted loop preload="none"></video>
    <div class="media-placeholder">
      <img class="media-poster" src="${import.meta.env.BASE_URL}media/posters/${pool.id}.jpg" alt="" decoding="async">
      <div class="media-scrim"></div>
      <div class="media-icon">&#9654;</div>
      <div class="media-copy">
        <strong>Value pool film</strong>
        <span>public/media/${pool.id}.mp4</span>
      </div>
    </div>`;
  el('casesCount').textContent = pool.cases.length;
  el('casesLabel').textContent = 'Case studies';

  resolveVideo(pool.id).then((url) => {
    if (!url || POOLS[state.selected]?.id !== pool.id) return;
    const v = dom.media.querySelector('video');
    v.src = url;
    dom.media.classList.add('has-video');
    v.play().catch(() => {});
  });
}

/* ------------------------------------------------------------------ *
 * Intro / homepage
 *
 * A full-screen layer over the live scene rather than a separate page, so
 * Begin is an instant fade — the WebGL board is already built behind it.
 * ------------------------------------------------------------------ */
const introVideo = el('introVideo');
const playIntro = () => introVideo.play().catch(() => {});

resolveVideo('intro').then((url) => {
  if (!url) return; // missing file: the intro still shows over its gradient
  introVideo.src = url;
  playIntro();
});

// Muted autoplay is permitted by policy, but some contexts still gate it until
// the page has been interacted with. Retry on every opening we get rather than
// risk the booth sitting on a frozen first frame.
introVideo.addEventListener('canplay', playIntro);
['pointerdown', 'keydown', 'touchstart'].forEach((ev) =>
  addEventListener(ev, playIntro, { once: true, capture: true })
);
addEventListener('visibilitychange', () => {
  if (!document.hidden) playIntro();
});

const introOpen = () => document.body.classList.contains('intro-open');

function enterExperience() {
  if (!introOpen()) return;
  document.body.classList.remove('intro-open');
  // If the warp cannot run, land on the stats page anyway.
  if (!playWarp()) document.body.classList.add('stats-open');
  paintStage();
  state.lastInput = performance.now();
}

const statsOpen = () => document.body.classList.contains('stats-open');

function leaveStats() {
  seen.clear();
  document.body.classList.remove('stats-open');
  paintStage();
  state.lastInput = performance.now();
}

function returnToIntro() {
  if (introOpen()) return;
  seen.clear();
  document.body.classList.remove('stats-open');
  endWarp();
  hideVideo();
  hideCases();
  deselect();
  document.body.classList.add('intro-open');
  paintStage();
  introVideo.currentTime = 0;
  playIntro();
  state.lastInput = performance.now();
}

/* Warp transition — the wormhole clip played once on the way in.
 *
 * The source is 12s; playbackRate compresses it to WARP_MS so the whole jump
 * happens in about two seconds. It is decorative and must never gate entry:
 * a missing file, a blocked play() or a stalled decode all fall through to the
 * framework, and any tap or key skips it. */
const warpVideo = el('warpVideo');
const warpOpen = () => document.body.classList.contains('warp-open');
let warpTimer = null;

resolveVideo('warp').then((url) => {
  if (url) warpVideo.src = url;
});

function endWarp() {
  if (!document.body.classList.contains('warp-open')) return;
  clearTimeout(warpTimer);
  warpTimer = null;
  document.body.classList.remove('warp-open');
  // The warp lands on the stats page, not straight on the board.
  if (!introOpen()) document.body.classList.add('stats-open');
  paintStage();
  warpVideo.pause();
  state.lastInput = performance.now();
}

function playWarp() {
  if (!warpVideo.src) return false;
  document.body.classList.add('warp-open');
  paintStage();
  warpVideo.currentTime = 0;
  // Metadata is normally in by the time anyone reads the intro and clicks, but
  // fall back to the source's own length rather than skipping the transition.
  const seconds = warpVideo.readyState >= 1 && warpVideo.duration ? warpVideo.duration : 12;
  // Chrome refuses rates above 16.
  warpVideo.playbackRate = Math.min(16, seconds / (WARP_MS / 1000));
  warpVideo.play().catch(() => endWarp());
  // Belt and braces: 'ended' can be missed if the decode stalls.
  clearTimeout(warpTimer);
  warpTimer = setTimeout(endWarp, WARP_MS + 250);
  return true;
}

// The six pools are named as you fly through, so the jump carries the story
// rather than just being motion. Timing is driven off WARP_MS.
// Solve the step so the LAST name finishes exactly at the start of the tail,
// rather than spreading the names across the whole clip and running into it.
const warpNameStep = Math.max(
  260,
  (WARP_MS - WARP_TAIL_MS - WARP_NAMES_DELAY_MS - WARP_NAME_MS) / (POOLS.length - 1)
);
el('warpNames').innerHTML = POOLS.map((p, i) => {
  const at = (WARP_NAMES_DELAY_MS + i * warpNameStep) / 1000;
  return `<span style="animation-delay:${at.toFixed(2)}s">${p.title}</span>`;
}).join('');
document.documentElement.style.setProperty('--warp-name-ms', `${WARP_NAME_MS}ms`);

warpVideo.addEventListener('ended', endWarp);
el('warp').addEventListener('click', endWarp);

// The hint doubles as the way back to the framework, so the wording can name a
// destination instead of describing a gesture.
el('hintFramework').addEventListener('click', (e) => {
  e.stopPropagation();
  deselect();
});

el('continue').addEventListener('click', leaveStats);
el('begin').addEventListener('click', enterExperience);
// Whole layer is tappable — kinder on a kiosk than hunting for the button.
el('intro').addEventListener('click', enterExperience);

/* ------------------------------------------------------------------ *
 * Expanded video
 *
 * Tapping the panel thumbnail lifts the clip out to near-full screen. Works
 * before the MP4s land too — the lightbox falls back to the same marked slot,
 * so the interaction is demonstrable today.
 * ------------------------------------------------------------------ */
const lightbox = el('lightboxVideo');
const lightboxImage = el('lightboxImage');
const videoOpen = () => document.body.classList.contains('video-open');

function openLayer() {
  document.body.classList.add('video-open');
  el('videoLayer').setAttribute('aria-hidden', 'false');
  state.lastInput = performance.now();
}

async function showVideo() {
  const pool = POOLS[state.selected];
  if (!pool) return;

  document.body.classList.remove('case-mode');
  el('videoVerb').textContent = pool.verb;
  el('videoTitle').textContent = pool.title;
  el('videoEmptyHint').textContent = `public/media/${pool.id}.mp4`;
  el('videoFrame').classList.remove('has-video', 'has-image');
  openLayer();

  const url = await resolveVideo(pool.id);
  // The visitor may have closed it, or moved on, while that resolved.
  if (!url || !videoOpen() || POOLS[state.selected]?.id !== pool.id) return;
  lightbox.src = url;
  el('videoFrame').classList.add('has-video');
  lightbox.currentTime = 0;
  lightbox.play().catch(() => {});
}

function showCase(index) {
  const pool = POOLS[state.selected];
  const study = pool?.cases?.[index];
  if (!study) return;

  document.body.classList.add('case-mode');
  el('caseBadge').hidden = !BRAND.casesArePlaceholder;
  el('caseClient').textContent = study.client;
  el('caseTitle').textContent = study.title;
  el('caseFacts').innerHTML = [
    ['Challenge', study.challenge],
    ['What we did', study.action],
    ['Outcome', study.outcome],
  ]
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
    .join('');
  el('caseMetricValue').textContent = study.metric.value;
  el('caseMetricLabel').textContent = study.metric.label;

  lightbox.pause();
  lightboxImage.src = `${import.meta.env.BASE_URL}media/cases/${study.id}.jpg`;
  el('videoFrame').classList.remove('has-video');
  el('videoFrame').classList.add('has-image');
  openLayer();
}

function hideVideo() {
  if (!videoOpen()) return;
  document.body.classList.remove('video-open', 'case-mode');
  el('videoLayer').setAttribute('aria-hidden', 'true');
  lightbox.pause();
  state.lastInput = performance.now();
}

dom.media.addEventListener('click', showVideo);

// filmIn fills 'both', so its last keyframe pins opacity to 1 and outranks
// `body.panel-open .panel-media`. Left on, the film stayed on screen after the
// panel closed — visible when swiping forward off the last pool returned to the
// board with the film still sitting over it. Clearing the class once the
// animation has played hands the element back to the stylesheet.
dom.media.addEventListener('animationend', (e) => {
  if (e.target === dom.media) dom.media.classList.remove('media-swap');
});

// Swiping is not discoverable on a screen nobody has touched yet, so the dot
// row gets an arrow either side. They run through cycle(), the same path as a
// swipe and the arrow keys, so forward from the last pool still returns to the
// framework rather than quietly looping.
el('poolPrev').addEventListener('click', () => cycle(-1));
el('poolNext').addEventListener('click', () => cycle(1));

/* Case study gallery — the pool's studies, one step away from the panel. */
const casesOpen = () => document.body.classList.contains('cases-open');

function showCases() {
  const pool = POOLS[state.selected];
  if (!pool) return;
  el('casesVerb').textContent = pool.verb;
  el('casesTitle').textContent = `${pool.title} case studies`;
  el('casesGrid').innerHTML = pool.cases
    .map(
      (c, i) => `<button class="case-card" data-index="${i}">
        <img src="${import.meta.env.BASE_URL}media/cases/${c.id}.jpg" alt="" loading="lazy">
        <span class="client">${c.client}</span>
        <span class="headline">${c.title}</span>
      </button>`
    )
    .join('');
  document.body.classList.add('cases-open');
  el('casesLayer').setAttribute('aria-hidden', 'false');
  state.lastInput = performance.now();
}

function hideCases() {
  if (!casesOpen()) return;
  document.body.classList.remove('cases-open');
  el('casesLayer').setAttribute('aria-hidden', 'true');
  state.lastInput = performance.now();
}

el('casesCta').addEventListener('click', showCases);
el('casesClose').addEventListener('click', hideCases);
el('casesLayer').addEventListener('click', (e) => {
  if (e.target === el('casesLayer')) hideCases();
});
el('casesGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.case-card');
  if (card) showCase(Number(card.dataset.index));
});

el('videoClose').addEventListener('click', hideVideo);
el('videoLayer').addEventListener('click', (e) => {
  // Backdrop only — clicking the media or the write-up must not dismiss it.
  if (!e.target.closest('.video-stage')) hideVideo();
});

/* ------------------------------------------------------------------ *
 * Selection
 * ------------------------------------------------------------------ */
/* Replays the panel's staggered entrance.
 *
 * `dir` is the direction of travel, so the copy enters from the side the visitor
 * swiped from: +1 moving forward through the pools, -1 back, 0 on first open.
 * The class has to be removed and re-added around a forced reflow, otherwise the
 * browser sees no change and the animation does not restart. */
function replayPanelSwap(dir) {
  const inner = dom.panel.querySelector('.panel-inner');
  inner.classList.remove('panel-swap');
  void inner.offsetWidth; // reflow, so the animation is genuinely restarted
  inner.style.setProperty('--swap-dir', String(dir));
  inner.classList.add('panel-swap');

  // The film sits outside .panel-inner now, so it needs its own replay or it
  // is the one thing on screen that does not move when you swipe.
  dom.media.classList.remove('media-swap');
  void dom.media.offsetWidth;
  dom.media.style.setProperty('--swap-dir', String(dir));
  dom.media.classList.add('media-swap');
}

// Shortest way round the ring, so stepping 6 -> 1 reads as forward, not back.
function swapDirection(from, to) {
  if (from < 0) return 0;
  let d = to - from;
  if (d > POOLS.length / 2) d -= POOLS.length;
  if (d < -POOLS.length / 2) d += POOLS.length;
  return Math.sign(d);
}

function select(i) {
  seen.add(i);
  if (i === state.selected) return;
  const dir = swapDirection(state.selected, i);
  state.selected = i;
  state.attract = -1;

  const pool = POOLS[i];
  document.body.classList.add('panel-open');
  dom.overview.classList.add('hidden');
  dom.panel.classList.add('open');
  dom.panel.setAttribute('aria-hidden', 'false');
  // On the body, not the panel, so the case studies pick up the pool's accent too.
  document.body.style.setProperty('--accent', '#' + pool.accent.toString(16).padStart(6, '0'));

  dom.verb.textContent = pool.verb;
  dom.title.textContent = pool.title;
  dom.hook.textContent = pool.description;
  [...dom.dots.children].forEach((d, k) => d.classList.toggle('on', k === i));

  buildMedia(pool);

  board.setSelected(i);
  paintStage();
  // Last, so the freshly built media node is included in the stagger.
  replayPanelSwap(dir);
}

function deselect() {
  seen.clear();
  if (state.selected < 0) return;
  hideVideo();
  hideCases();
  state.selected = -1;
  document.body.classList.remove('panel-open');
  dom.media.classList.remove('media-swap');
  dom.overview.classList.remove('hidden');
  dom.panel.classList.remove('open');
  dom.panel.setAttribute('aria-hidden', 'true');
  document.body.style.removeProperty('--accent');
  board.setSelected(-1);
  paintStage();
}

/* Once a visitor has opened all six, swiping on returns them to the framework
 * instead of wrapping round to pool one again. Before this they either looped
 * indefinitely or waited out the idle timer and had to press Begin a second
 * time. Tapping a pool directly still works at any point. */
const seen = new Set();

const cycle = (dir) => {
  const next = (state.selected + dir + POOLS.length) % POOLS.length;
  // Tour finished: swiping ON from the last pool lands back on the framework
  // instead of looping round again.
  //
  // Forward only. The first version fired on any direction once all six were
  // in `seen`, and since every pool was then in the set it matched every time —
  // so swiping stopped working entirely and only ever bounced you out. A back
  // swipe is someone re-reading, not finishing.
  if (dir > 0 && seen.size >= POOLS.length) {
    deselect();
    return;
  }
  select(next);
};

// No Back button any more — tapping outside the pool returns to the board, and
// a horizontal swipe moves between pools. Both are hinted under the object.

/* ------------------------------------------------------------------ *
 * Pointer + keyboard input
 * ------------------------------------------------------------------ */
/* Taps on the board itself are handled inside hexboard.js, where the traced
 * outline does the hit testing. This layer only has to catch the two gestures
 * that are not a tap on a piece: a horizontal swipe between pools, and a tap
 * anywhere else on the screen, which closes an open pool.
 *
 * It listens on the document rather than on a canvas, because there is no
 * canvas any more, and skips anything inside the panel or an overlay so it
 * never swallows a button press. */
let down = null;
const IGNORE_HIT = '.panel, .video-layer, .cases-layer, .intro, .overview, .autoplay, .brand, button, a';

// e.target is not always an Element — a synthetic event can carry the document
// itself — and closest() only exists on elements.
const hits = (target, sel) => (target instanceof Element ? target.closest(sel) : null);

document.addEventListener('pointerdown', (e) => {
  state.lastInput = performance.now();
  down = hits(e.target, IGNORE_HIT) ? null : { x: e.clientX, y: e.clientY };
});

document.addEventListener('pointerup', (e) => {
  state.lastInput = performance.now();
  if (!down) return;
  const dx = e.clientX - down.x;
  const dy = e.clientY - down.y;
  const moved = Math.hypot(dx, dy);
  down = null;

  // A deliberate horizontal drag moves between pools rather than selecting.
  if (state.selected >= 0 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    cycle(dx < 0 ? 1 : -1);
    return;
  }
  if (moved > 14) return; // treat as a drag, not a tap
  // A tap that reached the board's own handler has already been dealt with.
  if (hits(e.target, '.board-piece')) return;
  if (state.selected >= 0) deselect();
});

/* ------------------------------------------------------------------ *
 * Auto play
 * ------------------------------------------------------------------ *
 * Walks the whole experience on its own — intro, warp, stats, board, then each
 * value pool in turn — and loops. Two jobs: the booth plays itself when nobody
 * is standing at it, and a presenter can let it run while they talk over it.
 *
 * It drives the same functions a visitor's touch does rather than synthesising
 * clicks, so there is one code path for both and no way for the two to diverge.
 */
const TOUR_HOLD = {
  warp: WARP_MS + 700, // the jump, plus a beat to land
  stats: 6_000, // long enough to read the headline and three proof points
  board: 3_200, // the hexagon on its own before the first pool opens
  pool: 7_000, // one value pool: title, three points, film
  reset: 2_400, // back on the intro before it goes round again
};

const tour = { on: false, token: 0 };

function paintTour() {
  if (!dom.autoplay.isConnected) return;
  dom.autoplay.setAttribute('aria-pressed', String(tour.on));
  el('autoplayLabel').textContent = tour.on ? 'Playing' : 'Auto play';
}

function stopTour() {
  if (!tour.on) return;
  tour.on = false;
  tour.token++; // orphans any beat still in flight
  paintTour();
}

async function startTour() {
  if (tour.on) return;
  tour.on = true;
  const token = ++tour.token;
  paintTour();

  const alive = () => tour.on && token === tour.token;
  // Every beat counts as input too, so the kiosk idle timers never fire
  // underneath the tour and yank it back to the intro mid-loop.
  const beat = (ms) =>
    new Promise((r) => setTimeout(r, ms)).then(() => {
      state.lastInput = performance.now();
      return alive();
    });

  while (alive()) {
    hideVideo();
    hideCases();
    if (!introOpen()) {
      returnToIntro();
      if (!(await beat(TOUR_HOLD.reset))) return;
    }

    enterExperience();
    // Only wait out the warp if it actually started — a missing or blocked clip
    // drops straight onto the stats page and should not sit there twice as long.
    if (document.body.classList.contains('warp-open')) {
      if (!(await beat(TOUR_HOLD.warp))) return;
      endWarp();
    }
    if (!statsOpen()) {
      document.body.classList.add('stats-open');
      paintStage();
    }
    if (!(await beat(TOUR_HOLD.stats))) return;

    leaveStats();
    if (!(await beat(TOUR_HOLD.board))) return;

    for (let i = 0; i < POOLS.length; i++) {
      select(i);
      if (!(await beat(TOUR_HOLD.pool))) return;
    }

    deselect();
    if (!(await beat(TOUR_HOLD.board))) return;
    returnToIntro();
    if (!(await beat(TOUR_HOLD.reset))) return;
  }
}

/* Auto play was built to show the client the 90-second unattended loop, and it
 * was agreed on 20 Aug that it should not be part of the final build. Rather
 * than delete the feature, the control is opt-in: add ?autoplay=1 to the URL to
 * get the button back for a demo. Nothing shows it by default. */
const autoplayEnabled = new URLSearchParams(location.search).get('autoplay') === '1';
if (!autoplayEnabled) {
  dom.autoplay.remove();
} else {
  dom.autoplay.addEventListener('click', () => (tour.on ? stopTour() : startTour()));
}

// The lockup is the way back to the start from anywhere.
el('brandHome').addEventListener('click', () => {
  stopTour();
  returnToIntro();
});

addEventListener('keydown', (e) => {
  state.lastInput = performance.now();
  // Anyone reaching for the keyboard is taking over; the tour steps aside.
  if (tour.on && !e.target?.closest?.('.autoplay')) stopTour();
  if (document.body.classList.contains('warp-open')) {
    endWarp();
    return;
  }
  if (introOpen()) {
    if (e.key === 'Enter' || e.key === ' ') enterExperience();
    return;
  }
  if (videoOpen()) {
    if (e.key === 'Escape') hideVideo();
    return;
  }
  if (casesOpen()) {
    if (e.key === 'Escape') hideCases();
    return;
  }
  if (statsOpen()) {
    if (e.key === 'Enter' || e.key === ' ') leaveStats();
    return;
  }
  if (e.key === 'Escape') return deselect();
  if (e.key === 'ArrowRight') return cycle(1);
  if (e.key === 'ArrowLeft') return cycle(-1);
  const n = Number(e.key);
  if (n >= 1 && n <= POOLS.length) select(n - 1);
});
addEventListener(
  'pointerdown',
  (e) => {
    state.lastInput = performance.now();
    // A visitor touching anything drops auto play, so the tour never fights
    // whoever is standing at the booth. Its own button is the exception.
    if (tour.on && !e.target?.closest?.('.autoplay')) stopTour();
  },
  true
);

/* ------------------------------------------------------------------ *
 * Stage
 *
 * There is no render loop any more. The board is SVG and the plates are DOM,
 * so every transition is a CSS one and the browser drives it. What is left is
 * the kiosk's own bookkeeping — idle timers and the attract sweep — which does
 * not need a frame callback, so it runs on a quarter-second tick instead.
 * ------------------------------------------------------------------ */

/* Which stage owns the screen. One class on the body; the stylesheet does the
 * rest. Every transition calls this — enterExperience, leaveStats, endWarp,
 * playWarp, returnToIntro, select, deselect and the tour. Declared rather than
 * assigned so it hoists above those callers. The framework screen is the only one that shows the board, and an open
 * pool hands the whole right side to its film, so the board clears out with it.
 * Putting the board back on an open pool is deleting one clause here. */
function paintStage() {
  const boardUp = !introOpen() && !statsOpen() && !warpOpen() && state.selected < 0;
  document.body.classList.toggle('board-in', boardUp);
  // The specks only drift while the framework is the screen. Everywhere else
  // something opaque is over them, and a kiosk running all day should not be
  // animating a particle field nobody can see.
  backdrop.setRunning(boardUp);
  resolvePlate();
}

paintStage();

const KIOSK_TICK_MS = 250;

setInterval(() => {
  const idle = performance.now() - state.lastInput;

  // Kiosk: return to the framework once the visitor walks away, then all the
  // way back to the intro loop so the booth resets itself.
  if (state.selected >= 0 && idle > IDLE_RESET_MS) deselect();
  if (!introOpen() && idle > INTRO_RETURN_MS) returnToIntro();

  // Attract mode: sweep a highlight around the ring while nobody is touching.
  if (state.selected < 0 && !introOpen() && !statsOpen() && !warpOpen() && idle > ATTRACT_AFTER_MS) {
    state.attractTimer += KIOSK_TICK_MS;
    if (state.attractTimer > 1_600) {
      state.attractTimer = 0;
      state.attract = (state.attract + 1) % POOLS.length;
      board.setAttract(state.attract);
    }
  } else if (state.attract !== -1) {
    state.attract = -1;
    state.attractTimer = 0;
    board.setAttract(-1);
  }
}, KIOSK_TICK_MS);

/* Deep link straight to a state — for review links and for capturing stills:
 *   ?screen=overview | pool | video | case   &pool=0-5  &case=0-2
 * Transitions are suppressed for a beat so a capture is never mid-animation. */
(() => {
  const q = new URLSearchParams(location.search);
  const screen = q.get('screen');
  if (!screen || screen === 'intro') return;

  const clamp = (n, max) => Math.min(Math.max(Number(n) || 0, 0), max);
  enterExperience();
  // enterExperience lands on the stats card, which is right for a visitor but
  // not for a deep link: every screen below it sits past that card, so leaving
  // the class on rendered the title card on top of the target screen.
  endWarp();
  leaveStats();
  if (screen !== 'overview') select(clamp(q.get('pool'), POOLS.length - 1));
  if (screen === 'video') showVideo();
  if (screen === 'case') showCase(clamp(q.get('case'), 2));

  // Deep links are meant to arrive already on their screen, so the fades that
  // normally carry you there have to be skipped rather than played. Without
  // this the board and the plate spend their first half second ramping up from
  // nothing, which the autoplay walk and any screenshot both catch.
  document.body.classList.add('no-anim');
  paintStage();
  // Two frames: one for the class to land, one for the snapped state to paint
  // before transitions are allowed again. The timeout is a backstop, because a
  // backgrounded or throttled tab may not run a frame callback for a long time
  // and leaving this class on would kill every transition in the build.
  const release = () => document.body.classList.remove('no-anim');
  requestAnimationFrame(() => requestAnimationFrame(release));
  setTimeout(release, 300);
})();

// Handy while tuning the booth build; harmless in production.
window.__demo = {
  state,
  board,
  startTour,
  stopTour,
  tour,
  TOUR_HOLD,
  platePair,
  backdrop,
  resolvePlate,
  paintStage,
  STAGE_PLATES,
  select,
  deselect,
};
