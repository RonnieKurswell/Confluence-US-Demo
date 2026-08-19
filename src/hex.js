import * as THREE from 'three';
import { POOLS, PALETTE } from './data.js';

const DEG = Math.PI / 180;

// Pointy-top hexagon: vertices at 30°, 90°, ... ; edge mid-points at 0°, 60°, ...
export const R = 5;
// `from` / `to` are circumradius factors; labels are placed along the edge
// normal, so their radii are apothem-based (circumradius x cos30).
const APOTHEM = Math.cos(30 * (Math.PI / 180));
const BANDS = {
  outer: { from: 1.0, to: 0.795, depth: 0.2, labelR: ((1.0 + 0.795) / 2) * APOTHEM },
  inner: { from: 0.735, to: 0.525, depth: 0.34, labelR: ((0.735 + 0.525) / 2) * APOTHEM },
};
const GAP = 0.032; // fraction of the edge trimmed at each end, giving the seams

function edgePoint(theta, radius, u) {
  const a = (theta - 30) * DEG;
  const b = (theta + 30) * DEG;
  const v0 = new THREE.Vector2(Math.cos(a), Math.sin(a)).multiplyScalar(radius);
  const v1 = new THREE.Vector2(Math.cos(b), Math.sin(b)).multiplyScalar(radius);
  return v0.clone().lerp(v1, u);
}

function trapezoidShape(theta, from, to) {
  const p0 = edgePoint(theta, R * from, GAP);
  const p1 = edgePoint(theta, R * from, 1 - GAP);
  const p2 = edgePoint(theta, R * to, 1 - GAP);
  const p3 = edgePoint(theta, R * to, GAP);
  const s = new THREE.Shape();
  s.moveTo(p0.x, p0.y);
  s.lineTo(p1.x, p1.y);
  s.lineTo(p2.x, p2.y);
  s.lineTo(p3.x, p3.y);
  s.closePath();
  return s;
}

const BEVEL = 0.05;

function extrude(shape, depth) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: 0.045,
    bevelSegments: 3,
    curveSegments: 1,
  });
  g.translate(0, 0, -depth / 2);
  return g;
}

// Keeps text parallel to its hexagon edge and never upside down.
function labelRotation(theta) {
  let rot = theta - 90;
  while (rot > 90) rot -= 180;
  while (rot <= -90) rot += 180;
  return rot * DEG;
}

function makeTextTexture(text, opts = {}) {
  const {
    width = 1024,
    height = 220,
    weight = 700,
    size = 92,
    tracking = 0,
    color = '#ffffff',
    lines = null,
  } = opts;

  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const rows = lines || [text];
  let fontSize = size;
  // Display face, matching the CSS — see --font-display.
  const font = (s) => `${weight} ${s}px Geist, Helvetica, Arial, sans-serif`;

  // Shrink to fit the longest row.
  ctx.font = font(fontSize);
  const maxW = width * 0.92;
  let widest = Math.max(...rows.map((r) => ctx.measureText(r).width + tracking * r.length));
  while (widest > maxW && fontSize > 10) {
    fontSize -= 2;
    ctx.font = font(fontSize);
    widest = Math.max(...rows.map((r) => ctx.measureText(r).width + tracking * r.length));
  }

  const lineH = fontSize * 1.16;
  const top = height / 2 - ((rows.length - 1) * lineH) / 2;
  rows.forEach((row, i) => {
    if (tracking) {
      const totalW = ctx.measureText(row).width + tracking * (row.length - 1);
      let x = width / 2 - totalW / 2;
      for (const ch of row) {
        ctx.textAlign = 'left';
        ctx.fillText(ch, x, top + i * lineH);
        x += ctx.measureText(ch).width + tracking;
      }
      ctx.textAlign = 'center';
    } else {
      ctx.fillText(row, width / 2, top + i * lineH);
    }
  });

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function labelMesh(text, theta, radiusFactor, planeW, planeH, texOpts) {
  const tex = makeTextTexture(text, texOpts);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), mat);
  const a = theta * DEG;
  mesh.position.set(Math.cos(a) * R * radiusFactor, Math.sin(a) * R * radiusFactor, 0);
  mesh.rotation.z = labelRotation(theta);
  // Kept so the focus transform can counter-rotate the label against an extra
  // half-turn of board roll — see labelFlip in main.js.
  mesh.userData.baseRot = mesh.rotation.z;
  mesh.renderOrder = 5;
  return mesh;
}

function wrapTitle(title) {
  // Two lines max, split near the middle on a word boundary.
  const words = title.split(' ');
  if (words.length < 3) return [title];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

/**
 * Builds the hexagon. Returns { group, pools } where each pool entry carries
 * the meshes and animation state for one value pool.
 */
export function buildHexagon() {
  const group = new THREE.Group();
  const pools = [];

  POOLS.forEach((pool, i) => {
    const theta = i * 60;
    const holder = new THREE.Group();
    holder.userData.poolIndex = i;

    const outerMat = new THREE.MeshStandardMaterial({
      color: PALETTE.outer,
      roughness: 0.34,
      metalness: 0.5,
      emissive: new THREE.Color(pool.accent),
      emissiveIntensity: 0.06,
    });
    const innerMat = new THREE.MeshStandardMaterial({
      color: PALETTE.inner,
      roughness: 0.42,
      metalness: 0.62,
      emissive: new THREE.Color(pool.accent),
      emissiveIntensity: 0.015,
    });

    const outerMesh = new THREE.Mesh(
      extrude(trapezoidShape(theta, BANDS.outer.from, BANDS.outer.to), BANDS.outer.depth),
      outerMat
    );
    const innerMesh = new THREE.Mesh(
      extrude(trapezoidShape(theta, BANDS.inner.from, BANDS.inner.to), BANDS.inner.depth),
      innerMat
    );
    outerMesh.castShadow = innerMesh.castShadow = true;
    outerMesh.receiveShadow = innerMesh.receiveShadow = true;

    // Glowing rim that traces the outer edge — lights up on hover / select.
    const rimShape = trapezoidShape(theta, BANDS.outer.from, BANDS.outer.from - 0.028);
    const rimMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(pool.accent),
      transparent: true,
      opacity: 0,
      toneMapped: false,
    });
    const rimMesh = new THREE.Mesh(extrude(rimShape, BANDS.outer.depth * 1.05), rimMat);

    const titleLabel = labelMesh(
      pool.title,
      theta,
      BANDS.outer.labelR,
      R * 0.8,
      R * 0.16,
      { lines: wrapTitle(pool.title), size: 96, weight: 500, width: 1024, height: 205 }
    );
    const verbLabel = labelMesh(pool.verb, theta, BANDS.inner.labelR, R * 0.52, R * 0.095, {
      size: 78,
      weight: 600,
      tracking: 12,
      width: 1024,
      height: 160,
      color: '#dfefff',
    });
    // Labels sit just clear of the bevelled front face of each band.
    verbLabel.position.z = BANDS.inner.depth / 2 + BEVEL + 0.02;
    titleLabel.position.z = BANDS.outer.depth / 2 + BEVEL + 0.02;

    holder.add(outerMesh, innerMesh, rimMesh, titleLabel, verbLabel);
    group.add(holder);

    pools.push({
      index: i,
      data: pool,
      theta,
      accentColor: new THREE.Color(pool.accent),
      holder,
      outerMesh,
      innerMesh,
      rimMesh,
      titleLabel,
      verbLabel,
      materials: [outerMat, innerMat],
      labels: [titleLabel, verbLabel],
      hitTargets: [outerMesh, innerMesh, rimMesh],
      // animated state
      lift: 0,
      targetLift: 0,
      glow: 0,
      targetGlow: 0,
      dim: 1,
      targetDim: 1,
    });
  });

  // Centre well — the "UNLOCK AI VALUE" plate.
  const coreShape = new THREE.Shape();
  for (let v = 0; v < 6; v++) {
    const a = (30 + v * 60) * DEG;
    const x = Math.cos(a) * R * 0.5;
    const y = Math.sin(a) * R * 0.5;
    v === 0 ? coreShape.moveTo(x, y) : coreShape.lineTo(x, y);
  }
  coreShape.closePath();

  const corePlate = new THREE.Mesh(
    extrude(coreShape, 0.18),
    new THREE.MeshStandardMaterial({
      color: PALETTE.core,
      roughness: 0.25,
      metalness: 0.75,
      emissive: new THREE.Color(0x0a1b45),
      emissiveIntensity: 0.5,
    })
  );
  corePlate.position.z = -0.02;
  corePlate.receiveShadow = true;

  const coreTitle = new THREE.Mesh(
    new THREE.PlaneGeometry(R * 0.82, R * 0.34),
    new THREE.MeshBasicMaterial({
      map: makeTextTexture('', {
        lines: ['UNLOCK', 'AI VALUE'],
        size: 128,
        weight: 500,
        width: 1024,
        height: 420,
        tracking: 4,
      }),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    })
  );
  coreTitle.position.z = 0.14;
  coreTitle.renderOrder = 6;

  const core = new THREE.Group();
  core.add(corePlate, coreTitle);
  group.add(core);

  return { group, pools, core, coreTitle, corePlate };
}

export { makeTextTexture };
