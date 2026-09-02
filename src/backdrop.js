/* The room the framework sits in: a navy vignette with a slow drift of specks
 * across it.
 *
 * This was a three.js plane plus a 900-point additive Points cloud. It is the
 * same thing in 2D canvas now, because putting three.js back for a particle
 * field would cost 600KB to draw dots. The numbers below are carried over
 * from that version so it reads the same: same gradient stops, same speck
 * colour and count, same elliptical spread, same drift and rotation rates.
 *
 * It runs a frame loop, so it stops itself whenever it is not on screen. On a
 * kiosk that runs all day, a field of dots animating behind an open pool is
 * heat for nothing.
 */

const STOPS = [
  [0.0, '#0e2044'],
  [0.45, '#07102a'],
  [1.0, '#03050c'],
];
const COUNT = 900;
const SPECK = '#6fc4ff';
const SPECK_ALPHA = 0.55;

// The cloud was a ring in world units: radius 6 to 28, squashed to 0.72 on y.
// Expressed against the smaller viewport axis so it holds its shape at any size.
const R_INNER = 0.11;
const R_OUTER = 0.52;
const Y_SQUASH = 0.72;

const DRIFT = 0.3; // bob rate
const DRIFT_AMOUNT = 0.0016; // per frame, in world units, as before
const SPIN = 0.008; // whole-field rotation, radians per second

export function createBackdrop(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let w = 0;
  let h = 0;
  let dpr = 1;
  let grad = null;
  const specks = [];

  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = R_INNER + Math.random() * (R_OUTER - R_INNER);
    specks.push({
      a,
      r,
      // Depth stands in for the old z spread: nearer specks are bigger and
      // brighter, which is what gave the field its sense of volume.
      depth: Math.random(),
      seed: Math.random() * Math.PI * 2,
      bob: 0,
    });
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // The old vignette was a 140-unit plane behind everything, so the gradient
    // has to reach past the corners rather than stop at the shorter edge.
    const reach = Math.hypot(w, h) * 0.62;
    grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.04, w / 2, h / 2, reach);
    for (const [at, colour] of STOPS) grad.addColorStop(at, colour);
  }

  function draw(t) {
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const base = Math.min(w, h);
    const spin = reduced ? 0 : t * SPIN;
    // Additive, like the old material, so overlapping specks build up rather
    // than flatly covering each other.
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = SPECK;

    for (const s of specks) {
      if (!reduced) s.bob += Math.sin(t * DRIFT + s.seed) * DRIFT_AMOUNT;
      const a = s.a + spin;
      const x = w / 2 + Math.cos(a) * s.r * base;
      const y = h / 2 + (Math.sin(a) * s.r * Y_SQUASH + s.bob) * base;
      const size = (0.7 + s.depth * 1.9) * dpr;
      ctx.globalAlpha = SPECK_ALPHA * (0.35 + s.depth * 0.65);
      ctx.fillRect(x, y, size, size);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  let raf = null;
  let running = false;
  let started = 0;

  function frame(now) {
    if (!running) return;
    draw((now - started) / 1000);
    raf = requestAnimationFrame(frame);
  }

  resize();
  addEventListener('resize', resize);

  return {
    /* Nothing to animate while the backdrop is off screen. Draws one frame on
     * the way in so it is never blank for a frame, and one on the way out so a
     * screenshot of a paused board is not empty either. */
    setRunning(on) {
      if (on === running) return;
      running = on;
      if (on) {
        started = performance.now() - 0;
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
        raf = null;
        draw(0);
      }
    },
    // For a deep link or a still: paint once without starting the loop.
    paintOnce() {
      draw(0);
    },
  };
}
