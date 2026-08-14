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

const { group: hexGroup, pools, core, coreTitle } = buildHexagon();
world.add(hexGroup);

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
    v.object.scale.setScalar(1.25);
    v.object.position.z = 0.35;
    core.add(v.object);
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

const target = { x: 0, y: 0, scale: 1, tiltX: 0, tiltY: 0, spin: 0 };
const current = { x: 0, y: 0, scale: 1, tiltX: 0, tiltY: 0, spin: 0 };

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

  if (state.isPortrait) {
    target.x = 0;
    target.y = state.selected < 0 ? worldH * 0.09 : worldH * 0.235;
    target.scale = state.selected < 0 ? 1 : 0.5;
  } else {
    // The overview and the open state share one framing, so selecting a pool
    // swaps the copy beside a board that stays put.
    // Slightly less than half the panel width keeps it optically centred in
    // the space it has left rather than pinned to the edge.
    target.x = -worldW * state.panelFraction * 0.38;
    target.y = 0;
    target.scale = 1 - state.panelFraction * 0.38;
  }

  if (state.selected < 0) {
    target.tiltX = 0;
    target.tiltY = 0;
    return;
  }
  const th = (pools[state.selected].theta * Math.PI) / 180;
  target.tiltX = -Math.sin(th) * 0.17;
  target.tiltY = Math.cos(th) * 0.17;
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
  video: el('panelVideo'),
  mediaHint: el('mediaHint'),
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

async function loadMedia(pool) {
  dom.media.classList.remove('has-video');
  dom.video.removeAttribute('src');
  dom.video.load();
  dom.mediaHint.textContent = `public/media/${pool.id}.mp4`;

  const url = await resolveVideo(pool.id);
  if (!url || POOLS[state.selected]?.id !== pool.id) return;
  dom.video.src = url;
  dom.media.classList.add('has-video');
  dom.video.play().catch(() => {});
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
  state.lastInput = performance.now();
}

function returnToIntro() {
  if (introOpen()) return;
  hideQr();
  hideVideo();
  deselect();
  document.body.classList.add('intro-open');
  introVideo.currentTime = 0;
  playIntro();
  state.lastInput = performance.now();
}

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
const videoOpen = () => document.body.classList.contains('video-open');

async function showVideo() {
  const pool = POOLS[state.selected];
  if (!pool) return;

  el('videoVerb').textContent = pool.verb;
  el('videoTitle').textContent = pool.title;
  el('videoEmptyHint').textContent = `public/media/${pool.id}.mp4`;
  el('videoFrame').classList.remove('has-video');

  document.body.classList.add('video-open');
  el('videoLayer').setAttribute('aria-hidden', 'false');
  dom.video.pause(); // no point decoding the thumbnail behind the overlay
  state.lastInput = performance.now();

  const url = await resolveVideo(pool.id);
  // The visitor may have closed it, or moved on, while that resolved.
  if (!url || !videoOpen() || POOLS[state.selected]?.id !== pool.id) return;
  lightbox.src = url;
  el('videoFrame').classList.add('has-video');
  lightbox.currentTime = 0;
  lightbox.play().catch(() => {});
}

function hideVideo() {
  if (!videoOpen()) return;
  document.body.classList.remove('video-open');
  el('videoLayer').setAttribute('aria-hidden', 'true');
  lightbox.pause();
  if (dom.media.classList.contains('has-video')) dom.video.play().catch(() => {});
  state.lastInput = performance.now();
}

dom.media.addEventListener('click', showVideo);
el('videoClose').addEventListener('click', hideVideo);
el('videoLayer').addEventListener('click', (e) => {
  // Backdrop only — clicking the video itself must not dismiss it.
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

  loadMedia(pool);

  pools.forEach((p, k) => {
    p.targetLift = k === i ? 1 : -0.35;
    p.targetGlow = k === i ? 1 : 0;
    p.targetDim = k === i ? 1 : 0.2;
  });

  vizCache.forEach((v, k) => (v.object.visible = k === i));
  vizFor(i).object.visible = true;
  applyTargets();
}

function deselect() {
  if (state.selected < 0) return;
  hideVideo();
  state.selected = -1;
  document.body.classList.remove('panel-open');
  dom.overview.classList.remove('hidden');
  dom.panel.classList.remove('open');
  dom.panel.setAttribute('aria-hidden', 'true');
  document.body.style.removeProperty('--accent');
  dom.video.pause();
  pools.forEach((p) => {
    p.targetLift = 0;
    p.targetGlow = 0;
    p.targetDim = 1;
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

  world.position.set(current.x, current.y, 0);
  world.scale.setScalar(current.scale);
  world.rotation.set(current.tiltX + Math.sin(t * 0.21) * 0.02, current.tiltY + current.spin, 0);

  // Per-segment state.
  pools.forEach((p, i) => {
    const isHot = i === state.hovered || i === state.attract;
    const wantGlow = state.selected === i ? 1 : isHot && state.selected < 0 ? 0.65 : p.targetGlow;
    const wantLift = state.selected < 0 && isHot ? 0.35 : p.targetLift;

    p.glow = damp(p.glow, wantGlow, 6, dt);
    p.lift = damp(p.lift, wantLift, 5.5, dt);
    p.dim = damp(p.dim, p.targetDim, 5, dt);

    p.holder.position.z = p.lift * 0.85 + (state.selected < 0 ? Math.sin(t * 0.8 + i) * 0.045 : 0);
    p.rimMesh.material.opacity = p.glow * 0.9;
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
    p.labels.forEach((l) => (l.material.opacity = 0.18 + p.dim * 0.82));
  });

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
  const ringAlpha = coreTitle.material.opacity;
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
