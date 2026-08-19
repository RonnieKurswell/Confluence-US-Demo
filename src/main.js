import * as THREE from 'three';
import QRCode from 'qrcode';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { POOLS, BRAND, PALETTE } from './data.js';
import { buildHexagon, R } from './hex.js';
import { createCoreViz } from './coreviz.js';

const IDLE_RESET_MS = 60_000; // kiosk: drop back to the overview after a minute
const ATTRACT_AFTER_MS = 9_000; // idle on the overview: start sweeping segments
const INTRO_RETURN_MS = 90_000; // untouched for this long: back to the intro loop
const WARP_MS = 3_000; // the 12s wormhole clip, compressed into the jump
const FOCUS_SCALE = 2.1; // how far the board zooms when a pool is opened

/* ------------------------------------------------------------------ *
 * Renderer, scene, camera
 * ------------------------------------------------------------------ */
const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.bg);
scene.fog = new THREE.Fog(PALETTE.bg, 26, 52);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
camera.position.set(0, 0, 16);

/* ------------------------------------------------------------------ *
 * Lighting
 * ------------------------------------------------------------------ */
scene.add(new THREE.AmbientLight(0x4d6fa8, 0.55));

const key = new THREE.DirectionalLight(0xdcecff, 2.1);
key.position.set(-7, 9, 12);
scene.add(key);

const fill = new THREE.DirectionalLight(0x2f7ad6, 1.0);
fill.position.set(9, -6, 8);
scene.add(fill);

const rim = new THREE.PointLight(0x36d6ff, 34, 34, 2);
rim.position.set(0, 0, -5);
scene.add(rim);

/* ------------------------------------------------------------------ *
 * Backdrop: vignette plane + drifting particles
 * ------------------------------------------------------------------ */
function backdropTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
  g.addColorStop(0, '#0e2044');
  g.addColorStop(0.45, '#07102a');
  g.addColorStop(1, '#03050c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(140, 140),
  new THREE.MeshBasicMaterial({ map: backdropTexture(), depthWrite: false })
);
backdrop.position.z = -22;
scene.add(backdrop);

const PARTICLES = 900;
const pPos = new Float32Array(PARTICLES * 3);
const pSeed = new Float32Array(PARTICLES);
for (let i = 0; i < PARTICLES; i++) {
  const r = 6 + Math.random() * 22;
  const a = Math.random() * Math.PI * 2;
  pPos[i * 3] = Math.cos(a) * r;
  pPos[i * 3 + 1] = Math.sin(a) * r * 0.72;
  pPos[i * 3 + 2] = -14 + Math.random() * 18;
  pSeed[i] = Math.random() * 6.283;
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particles = new THREE.Points(
  pGeo,
  new THREE.PointsMaterial({
    color: 0x6fc4ff,
    size: 0.055,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
);
scene.add(particles);

/* ------------------------------------------------------------------ *
 * Hexagon
 * ------------------------------------------------------------------ */
const world = new THREE.Group();
scene.add(world);

const { group: hexGroup, pools, core, coreTitle, corePlate } = buildHexagon();
world.add(hexGroup);

// Opening a pool fades the rest of the board out, so every material that takes
// part needs to be able to carry an alpha.
const corePlateMat = corePlate.material;
corePlateMat.transparent = true;
pools.forEach((p) => {
  p.materials.forEach((m) => (m.transparent = true));
  p.fade = 1;
  p.targetFade = 1;
});

// A hex ring tracing the inner boundary — the "deeply interconnected" idea,
// shown rather than written. Fades away once a pool is open. Six-sided, to stay
// consistent with the rest of the visual language.
const RING_R = R * 0.49;
const ringPoint = (t) => {
  const u = ((t % 1) + 1) % 1;
  const seg = Math.floor(u * 6);
  const f = u * 6 - seg;
  const a0 = (30 + seg * 60) * (Math.PI / 180);
  const a1 = (30 + (seg + 1) * 60) * (Math.PI / 180);
  return new THREE.Vector3(
    THREE.MathUtils.lerp(Math.cos(a0), Math.cos(a1), f) * RING_R,
    THREE.MathUtils.lerp(Math.sin(a0), Math.sin(a1), f) * RING_R,
    0.24
  );
};
const ringLine = new THREE.LineLoop(
  new THREE.BufferGeometry().setFromPoints([...Array(6)].map((_, i) => ringPoint(i / 6))),
  new THREE.LineBasicMaterial({ color: 0x5fd8ff, transparent: true, opacity: 0.3, toneMapped: false })
);
hexGroup.add(ringLine);

const vizCache = new Map();
function vizFor(i) {
  if (!vizCache.has(i)) {
    const v = createCoreViz(POOLS[i].viz, POOLS[i].accent);
    v.object.scale.setScalar(0.95);
    // Sits behind its own sector, so it stays with the pool when the board
    // pushes that sector to the middle of the screen.
    const th = (i * 60 * Math.PI) / 180;
    const r = R * ((1.0 + 0.795) / 2) * Math.cos(Math.PI / 6);
    v.object.position.set(Math.cos(th) * r, Math.sin(th) * r, -0.9);
    hexGroup.add(v.object);
    vizCache.set(i, v);
  }
  return vizCache.get(i);
}

/* ------------------------------------------------------------------ *
 * Post-processing
 * ------------------------------------------------------------------ */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.34, 0.6, 0.93);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ------------------------------------------------------------------ *
 * Layout / resize
 * ------------------------------------------------------------------ */
const state = {
  selected: -1,
  hovered: -1,
  isPortrait: false,
  panelFraction: 0,
  lastInput: performance.now(),
  attract: -1,
  attractTimer: 0,
};

const target = { x: 0, y: 0, scale: 1, tiltX: 0, tiltY: 0, spin: 0, roll: 0 };
const current = { x: 0, y: 0, scale: 1, tiltX: 0, tiltY: 0, spin: 0, roll: 0 };

function layout() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
  camera.aspect = w / h;

  state.isPortrait = h / w > 1 || w < 900;

  // Distance that keeps the whole hexagon in frame on both axes, with margin
  // for the lockup above and the fact strip below.
  const half = Math.tan((camera.fov * Math.PI) / 360);
  // Portrait leaves more headroom: the prompt and the copy column stack under
  // the board there rather than sitting beside it.
  const rNeeded = R * (state.isPortrait ? 1.26 : 1.7);
  camera.position.z = Math.max(rNeeded / half, rNeeded / (half * camera.aspect));
  camera.updateProjectionMatrix();

  // Fraction of the viewport the detail panel covers.
  // Keep in step with --panel-w in style.css.
  const panelPx = state.isPortrait ? 0 : Math.min(w * 0.46, 880);
  state.panelFraction = panelPx / w;

  applyTargets();
}

function applyTargets() {
  const half = Math.tan((camera.fov * Math.PI) / 360);
  const worldW = 2 * camera.position.z * half * camera.aspect;
  const worldH = 2 * camera.position.z * half;

  // Centre of the space the copy column leaves free. The column is on the left,
  // so the board lives to the right of it.
  const freeCentreX = (worldW * state.panelFraction) / 2;

  if (state.selected < 0) {
    target.x = state.isPortrait ? 0 : worldW * state.panelFraction * 0.38;
    target.y = state.isPortrait ? worldH * 0.09 : 0;
    target.scale = state.isPortrait ? 1 : 1 - state.panelFraction * 0.38;
    target.tiltX = 0;
    target.tiltY = 0;
    target.roll = 0;
    return;
  }

  // Opening a pool pushes that sector to the middle and zooms into it. Solving
  // for position rather than animating a child keeps one transform authoritative.
  const theta = pools[state.selected].theta;
  const th = (theta * Math.PI) / 180;
  const rSector = R * ((1.0 + 0.795) / 2) * Math.cos(Math.PI / 6);

  // With the other five hidden there is nothing left to disorient, so the board
  // rolls until the open sector sits square — its label reads straight across.
  let deg = theta + 90;
  while (deg > 90) deg -= 180;
  while (deg <= -90) deg += 180;
  target.roll = (-deg * Math.PI) / 180;

  // Position has to solve against the roll, or the sector lands off-centre.
  const cos = Math.cos(target.roll);
  const sin = Math.sin(target.roll);
  const px = Math.cos(th) * rSector;
  const py = Math.sin(th) * rSector;
  const rx = px * cos - py * sin;
  const ry = px * sin + py * cos;

  if (state.isPortrait) {
    target.scale = FOCUS_SCALE * 0.62;
    target.x = -target.scale * rx;
    target.y = worldH * 0.2 - target.scale * ry;
  } else {
    target.scale = FOCUS_SCALE;
    target.x = freeCentreX - target.scale * rx;
    target.y = -target.scale * ry;
  }
  // Straight on while focused — a tilt fights the zoom and hurts legibility.
  target.tiltX = 0;
  target.tiltY = 0;
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
  bullets: el('panelBullets'),
  proof: el('panelProof'),
  media: el('panelMedia'),
  dots: el('dots'),
  lockup: el('lockup'),
  prompt: el('prompt'),
};

el('eyebrow').textContent = BRAND.eyebrow;
el('event').textContent = BRAND.event;
el('introEyebrow').textContent = BRAND.eyebrow;
el('introEvent').textContent = BRAND.event;
el('introHeadline').textContent = BRAND.intro.headline;
el('introSub').textContent = BRAND.intro.sub;
el('beginLabel').textContent = BRAND.intro.cta;
el('overviewHeadline').innerHTML = BRAND.headline.join('<br>');
el('overviewSub').textContent = BRAND.subhead;
el('facts').innerHTML = BRAND.facts
  .map((f) => `<div class="fact"><span class="v">${f.value}</span><span class="l">${f.label}</span></div>`)
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
  dom.media.innerHTML = `
    <video playsinline muted loop preload="none"></video>
    <div class="media-placeholder">
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
  playWarp();
  state.lastInput = performance.now();
}

function returnToIntro() {
  if (introOpen()) return;
  endWarp();
  hideQr();
  hideVideo();
  hideCases();
  deselect();
  document.body.classList.add('intro-open');
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
let warpTimer = null;

resolveVideo('warp').then((url) => {
  if (url) warpVideo.src = url;
});

function endWarp() {
  if (!document.body.classList.contains('warp-open')) return;
  clearTimeout(warpTimer);
  warpTimer = null;
  document.body.classList.remove('warp-open');
  warpVideo.pause();
  state.lastInput = performance.now();
}

function playWarp() {
  if (!warpVideo.src) return false;
  document.body.classList.add('warp-open');
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
el('warpNames').innerHTML = POOLS.map(
  (p, i) =>
    `<span style="animation-delay:${((i * (WARP_MS * 0.82)) / POOLS.length / 1000).toFixed(2)}s">${p.title}</span>`
).join('');
document.documentElement.style.setProperty('--warp-name-ms', `${Math.round(WARP_MS / POOLS.length + 260)}ms`);

warpVideo.addEventListener('ended', endWarp);
el('warp').addEventListener('click', endWarp);

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

/* Case study gallery — the pool's studies, one step away from the panel. */
const casesOpen = () => document.body.classList.contains('cases-open');

function showCases() {
  const pool = POOLS[state.selected];
  if (!pool) return;
  el('casesVerb').textContent = pool.verb;
  el('casesTitle').textContent = `${pool.title} — case studies`;
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
 * Guidebook takeaway
 *
 * The QR is rendered locally rather than fetched, so it still works on a
 * booth machine with no network. The destination is the only thing that
 * needs maintaining — see BRAND.guidebook.url in data.js.
 * ------------------------------------------------------------------ */
const GUIDE = BRAND.guidebook;
el('ctaLabel').textContent = GUIDE.cta;
el('qrTitle').textContent = GUIDE.title;
el('qrSub').textContent = GUIDE.sub;
el('qrFoot').textContent = GUIDE.footnote;

QRCode.toString(GUIDE.url, {
  type: 'svg',
  errorCorrectionLevel: 'M',
  margin: 0,
  color: { dark: '#04060e', light: '#ffffff' },
})
  .then((svg) => {
    el('qrCode').innerHTML = svg;
  })
  .catch(() => {
    // Never leave a blank white square on a booth screen.
    el('qrCode').textContent = GUIDE.url;
  });

const qrOpen = () => document.body.classList.contains('qr-open');
const showQr = () => {
  document.body.classList.add('qr-open');
  el('qrLayer').setAttribute('aria-hidden', 'false');
  state.lastInput = performance.now();
};
const hideQr = () => {
  document.body.classList.remove('qr-open');
  el('qrLayer').setAttribute('aria-hidden', 'true');
  state.lastInput = performance.now();
};

el('guidebookCta').addEventListener('click', showQr);
el('qrClose').addEventListener('click', hideQr);
// Tapping the backdrop dismisses; tapping the card itself does not.
el('qrLayer').addEventListener('click', (e) => {
  if (e.target === el('qrLayer')) hideQr();
});

/* ------------------------------------------------------------------ *
 * Selection
 * ------------------------------------------------------------------ */
function select(i) {
  if (i === state.selected) return;
  state.selected = i;
  state.attract = -1;

  const pool = POOLS[i];
  document.body.classList.add('panel-open');
  dom.overview.classList.add('hidden');
  dom.panel.classList.add('open');
  dom.panel.setAttribute('aria-hidden', 'false');
  // On the body, not the panel, so the CTA and QR pick up the pool's accent too.
  document.body.style.setProperty('--accent', '#' + pool.accent.toString(16).padStart(6, '0'));

  dom.verb.textContent = pool.verb;
  dom.title.textContent = pool.title;
  dom.hook.textContent = pool.hook;
  dom.bullets.innerHTML = pool.bullets.map((b) => `<li>${b}</li>`).join('');
  dom.proof.textContent = pool.proof;
  [...dom.dots.children].forEach((d, k) => d.classList.toggle('on', k === i));

  buildMedia(pool);

  pools.forEach((p, k) => {
    p.targetLift = k === i ? 1 : 0;
    p.targetGlow = k === i ? 1 : 0;
    p.targetDim = 1;
    // Everything but the open pool clears out of the way entirely.
    p.targetFade = k === i ? 1 : 0;
  });

  vizCache.forEach((v, k) => (v.object.visible = k === i));
  vizFor(i).object.visible = true;
  applyTargets();
}

function deselect() {
  if (state.selected < 0) return;
  hideVideo();
  hideCases();
  state.selected = -1;
  document.body.classList.remove('panel-open');
  dom.overview.classList.remove('hidden');
  dom.panel.classList.remove('open');
  dom.panel.setAttribute('aria-hidden', 'true');
  document.body.style.removeProperty('--accent');
  pools.forEach((p) => {
    p.targetLift = 0;
    p.targetGlow = 0;
    p.targetDim = 1;
    p.targetFade = 1;
  });
  vizCache.forEach((v) => (v.object.visible = false));
  applyTargets();
}

const cycle = (dir) => select((state.selected + dir + POOLS.length) % POOLS.length);

el('close').addEventListener('click', deselect);
el('prevBtn').addEventListener('click', () => cycle(-1));
el('nextBtn').addEventListener('click', () => cycle(1));

/* ------------------------------------------------------------------ *
 * Pointer + keyboard input
 * ------------------------------------------------------------------ */
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const hitTargets = pools.flatMap((p) => p.hitTargets);

function poolAt(clientX, clientY) {
  ndc.x = (clientX / innerWidth) * 2 - 1;
  ndc.y = -(clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(hitTargets, false)[0];
  if (!hit) return -1;
  let o = hit.object;
  while (o && o.userData.poolIndex === undefined) o = o.parent;
  return o ? o.userData.poolIndex : -1;
}

let down = null;
canvas.addEventListener('pointerdown', (e) => {
  down = { x: e.clientX, y: e.clientY };
  state.lastInput = performance.now();
});
canvas.addEventListener('pointerup', (e) => {
  state.lastInput = performance.now();
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 14) return; // treat as a drag, not a tap
  const i = poolAt(e.clientX, e.clientY);
  if (i >= 0) select(i);
  else deselect();
});
canvas.addEventListener('pointermove', (e) => {
  state.lastInput = performance.now();
  if (e.pointerType === 'touch') return;
  const i = poolAt(e.clientX, e.clientY);
  state.hovered = i;
  canvas.style.cursor = i >= 0 ? 'pointer' : 'default';
});
canvas.addEventListener('pointerleave', () => (state.hovered = -1));

addEventListener('keydown', (e) => {
  state.lastInput = performance.now();
  if (document.body.classList.contains('warp-open')) {
    endWarp();
    return;
  }
  if (introOpen()) {
    if (e.key === 'Enter' || e.key === ' ') enterExperience();
    return;
  }
  if (qrOpen()) {
    if (e.key === 'Escape') hideQr();
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
  if (e.key === 'Escape') return deselect();
  if (e.key === 'ArrowRight') return cycle(1);
  if (e.key === 'ArrowLeft') return cycle(-1);
  const n = Number(e.key);
  if (n >= 1 && n <= POOLS.length) select(n - 1);
});
addEventListener('pointerdown', () => (state.lastInput = performance.now()), true);

/* ------------------------------------------------------------------ *
 * Animation loop
 * ------------------------------------------------------------------ */
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const clock = new THREE.Clock();
const projected = new THREE.Vector3();
const promptAt = { x: -1, y: -1 };

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const now = performance.now();
  const idle = now - state.lastInput;

  // Kiosk: return to the overview once the visitor walks away, then all the
  // way back to the intro loop so the booth resets itself.
  if (state.selected >= 0 && idle > IDLE_RESET_MS) deselect();
  if (!introOpen() && idle > INTRO_RETURN_MS) returnToIntro();

  // Attract mode: sweep a highlight around the ring while nobody is touching.
  if (state.selected < 0 && idle > ATTRACT_AFTER_MS) {
    state.attractTimer += dt;
    if (state.attractTimer > 1.6) {
      state.attractTimer = 0;
      state.attract = (state.attract + 1) % POOLS.length;
    }
  } else if (state.selected >= 0 || idle <= ATTRACT_AFTER_MS) {
    state.attract = -1;
    state.attractTimer = 0;
  }

  // Slow idle spin of the whole board, parked while a pool is open.
  target.spin = state.selected < 0 ? Math.sin(t * 0.14) * 0.09 : 0;

  current.x = damp(current.x, target.x, 4.2, dt);
  current.y = damp(current.y, target.y, 4.2, dt);
  current.scale = damp(current.scale, target.scale, 4.2, dt);
  current.tiltX = damp(current.tiltX, target.tiltX, 3.4, dt);
  current.tiltY = damp(current.tiltY, target.tiltY, 3.4, dt);
  current.spin = damp(current.spin, target.spin, 2.0, dt);
  current.roll = damp(current.roll, target.roll, 4.2, dt);

  world.position.set(current.x, current.y, 0);
  world.scale.setScalar(current.scale);
  world.rotation.set(current.tiltX + Math.sin(t * 0.21) * 0.02, current.tiltY + current.spin, current.roll);

  // Per-segment state.
  pools.forEach((p, i) => {
    const isHot = i === state.hovered || i === state.attract;
    const wantGlow = state.selected === i ? 1 : isHot && state.selected < 0 ? 0.65 : p.targetGlow;
    const wantLift = state.selected < 0 && isHot ? 0.35 : p.targetLift;

    p.glow = damp(p.glow, wantGlow, 6, dt);
    p.lift = damp(p.lift, wantLift, 5.5, dt);
    p.dim = damp(p.dim, p.targetDim, 5, dt);
    // ~0.5s to settle, per the brief: responsive, no sense of a video cut.
    p.fade = damp(p.fade ?? 1, p.targetFade ?? 1, 9, dt);

    p.holder.visible = p.fade > 0.01;
    p.materials.forEach((m) => (m.opacity = p.fade));
    p.labels.forEach((l) => (l.material.opacity = p.fade * (0.18 + p.dim * 0.82)));

    p.holder.position.z = p.lift * 0.85 + (state.selected < 0 ? Math.sin(t * 0.8 + i) * 0.045 : 0);
    p.rimMesh.material.opacity = p.glow * 0.9 * p.fade;
    p.materials.forEach((m, k) => {
      // Navy ring stays neutral at rest; the pool's accent only washes in on
      // hover / select so the board reads as one system.
      m.emissiveIntensity = (k === 0 ? 0.05 : 0.015) + p.glow * (k === 0 ? 0.3 : 0.24);
      const base = k === 0 ? PALETTE.outer : PALETTE.inner;
      const dimmed = k === 0 ? PALETTE.outerDim : PALETTE.innerDim;
      m.color
        .setHex(dimmed)
        .lerp(new THREE.Color(base), p.dim)
        .lerp(p.accentColor, p.glow * (k === 0 ? 0.42 : 0.3));
    });
  });

  // Core plate and ring belong to the hexagon view; they clear out when a pool
  // takes over the screen.
  const boardAlpha = damp(core.userData.alpha ?? 1, state.selected < 0 ? 1 : 0, 9, dt);
  core.userData.alpha = boardAlpha;
  core.visible = boardAlpha > 0.01;
  corePlateMat.opacity = boardAlpha;

  // Centre: the title fades out as a pool's visual takes over.
  const showTitle = state.selected < 0 ? 1 : 0;
  coreTitle.material.opacity = damp(coreTitle.material.opacity, showTitle, 9, dt);
  coreTitle.visible = coreTitle.material.opacity > 0.01;
  core.rotation.z = -current.tiltY * 0.4;
  if (state.selected >= 0) vizFor(state.selected).update(t, dt);

  // Park the "touch a value pool" prompt just below the board. Projecting the
  // bottom vertex keeps it attached however the board is scaled or shifted.
  if (!state.isPortrait && state.selected < 0) {
    projected.set(0, -R * 1.06, 0);
    hexGroup.localToWorld(projected).project(camera);
    const px = Math.round((projected.x * 0.5 + 0.5) * innerWidth);
    const py = Math.round((-projected.y * 0.5 + 0.5) * innerHeight) + 26;
    if (px !== promptAt.x || py !== promptAt.y) {
      promptAt.x = px;
      promptAt.y = py;
      dom.prompt.style.left = `${px}px`;
      dom.prompt.style.top = `${py}px`;
    }
  }

  // Interconnect ring rides with the overview state.
  const ringAlpha = coreTitle.material.opacity * boardAlpha;
  ringLine.material.opacity = 0.3 * ringAlpha;
  ringLine.visible = ringAlpha > 0.02;

  // Backdrop life.
  const pos = pGeo.attributes.position;
  for (let i = 0; i < PARTICLES; i++) {
    pos.array[i * 3 + 1] += Math.sin(t * 0.3 + pSeed[i]) * 0.0016;
  }
  pos.needsUpdate = true;
  particles.rotation.z = t * 0.008;
  rim.intensity = 70 + Math.sin(t * 1.3) * 22;

  composer.render();
  requestAnimationFrame(tick);
}

coreTitle.material.transparent = true;
coreTitle.material.opacity = 1;
requestAnimationFrame(tick);

/* Deep link straight to a state — for review links and for capturing stills:
 *   ?screen=overview | pool | video | case | qr   &pool=0-5  &case=0-2
 * Transforms are snapped so a capture is never mid-animation. */
(() => {
  const q = new URLSearchParams(location.search);
  const screen = q.get('screen');
  if (!screen || screen === 'intro') return;

  const clamp = (n, max) => Math.min(Math.max(Number(n) || 0, 0), max);
  enterExperience();
  if (screen !== 'overview') select(clamp(q.get('pool'), POOLS.length - 1));
  if (screen === 'video') showVideo();
  if (screen === 'case') showCase(clamp(q.get('case'), 2));
  if (screen === 'qr') showQr();

  Object.assign(current, target);
  pools.forEach((p) => {
    p.lift = p.targetLift;
    p.glow = p.targetGlow;
    p.dim = p.targetDim;
  });
  coreTitle.material.opacity = state.selected < 0 ? 1 : 0;
})();

// Handy while tuning the booth build; harmless in production.
window.__demo = {
  state,
  pools,
  core,
  coreTitle,
  vizCache,
  select,
  deselect,
  current,
  target,
  snap: () => Object.assign(current, target),
};
