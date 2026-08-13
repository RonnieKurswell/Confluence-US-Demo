import * as THREE from 'three';

// Procedural, per-pool 3D visuals that take over the centre of the hexagon
// when a value pool is opened. Each returns { object, update(t, dt) }.

const line = (color, opacity = 0.9) =>
  new THREE.LineBasicMaterial({ color, transparent: true, opacity, toneMapped: false });
const solid = (color, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, toneMapped: false });

function orbit(color) {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), solid(color, 0.9));
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.05, 1)),
    line(color, 0.55)
  );
  g.add(hub, wire);

  const nodes = [];
  for (let i = 0; i < 9; i++) {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), solid(color, 0.95));
    const ring = new THREE.Group();
    ring.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    ring.add(n);
    n.userData = { r: 1.25 + Math.random() * 0.55, speed: 0.5 + Math.random(), phase: Math.random() * 6.28 };
    g.add(ring);
    nodes.push({ n, ring });
  }
  return {
    object: g,
    update(t) {
      wire.rotation.y = t * 0.28;
      wire.rotation.x = t * 0.16;
      hub.rotation.y = -t * 0.5;
      hub.scale.setScalar(1 + Math.sin(t * 2.2) * 0.06);
      nodes.forEach(({ n }) => {
        const { r, speed, phase } = n.userData;
        n.position.set(Math.cos(t * speed + phase) * r, Math.sin(t * speed + phase) * r, 0);
      });
    },
  };
}

function lattice(color) {
  const g = new THREE.Group();
  const N = 9;
  const cells = [];
  const geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
  for (let x = 0; x < N; x++) {
    for (let y = 0; y < N; y++) {
      const m = new THREE.Mesh(geo, solid(color, 0.85));
      m.position.set((x - (N - 1) / 2) * 0.28, (y - (N - 1) / 2) * 0.28, 0);
      m.userData.d = Math.hypot(x - (N - 1) / 2, y - (N - 1) / 2);
      g.add(m);
      cells.push(m);
    }
  }
  g.rotation.x = -0.55;
  return {
    object: g,
    update(t) {
      g.rotation.z = t * 0.12;
      cells.forEach((m) => {
        const w = Math.sin(t * 2.4 - m.userData.d * 0.8);
        m.position.z = w * 0.45;
        m.scale.setScalar(0.7 + (w + 1) * 0.5);
        m.material.opacity = 0.35 + (w + 1) * 0.3;
      });
    },
  };
}

function flow(color) {
  const g = new THREE.Group();
  const curve = new THREE.TorusKnotGeometry(1.15, 0.035, 220, 8, 2, 3);
  const tube = new THREE.Mesh(curve, solid(color, 0.35));
  g.add(tube);

  const dots = [];
  const p = 2, q = 3;
  for (let i = 0; i < 18; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), solid(color, 1));
    d.userData.o = i / 18;
    g.add(d);
    dots.push(d);
  }
  const at = (u) => {
    const a = u * Math.PI * 2 * p;
    const r = 1.15 * (2 + Math.cos((q * a) / p)) / 3;
    return new THREE.Vector3(
      r * Math.cos(a),
      r * Math.sin(a),
      1.15 * Math.sin((q * a) / p) / 3
    );
  };
  return {
    object: g,
    update(t) {
      g.rotation.y = t * 0.35;
      g.rotation.x = 0.4 + Math.sin(t * 0.3) * 0.15;
      dots.forEach((d) => {
        const u = (d.userData.o + t * 0.09) % 1;
        d.position.copy(at(u));
        d.material.opacity = 0.55 + 0.45 * Math.sin(u * Math.PI * 2 + t);
      });
    },
  };
}

function rebuild(color) {
  const g = new THREE.Group();
  const bricks = [];
  const geo = new THREE.BoxGeometry(0.34, 0.34, 0.34);
  for (let i = 0; i < 64; i++) {
    const m = new THREE.Mesh(geo, solid(color, 0.8));
    const x = (i % 4) - 1.5;
    const y = (Math.floor(i / 4) % 4) - 1.5;
    const z = Math.floor(i / 16) - 1.5;
    m.userData.home = new THREE.Vector3(x * 0.44, y * 0.44, z * 0.44);
    m.userData.scatter = new THREE.Vector3(
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5,
      (Math.random() - 0.5) * 5
    );
    m.userData.delay = Math.random();
    g.add(m);
    bricks.push(m);
  }
  return {
    object: g,
    update(t) {
      g.rotation.y = t * 0.3;
      g.rotation.x = 0.3;
      // Sweeps from scattered legacy estate to a clean rebuilt block and back.
      const cycle = (Math.sin(t * 0.5) + 1) / 2;
      bricks.forEach((m) => {
        const k = THREE.MathUtils.clamp((cycle - m.userData.delay * 0.35) / 0.65, 0, 1);
        const e = k * k * (3 - 2 * k);
        m.position.lerpVectors(m.userData.scatter, m.userData.home, e);
        m.material.opacity = 0.25 + e * 0.7;
        m.scale.setScalar(0.5 + e * 0.5);
      });
    },
  };
}

function pulse(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.6, 0), solid(color, 0.9));
  const cage = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.OctahedronGeometry(0.95, 0)),
    line(color, 0.6)
  );
  g.add(body, cage);

  const rings = [];
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.02, 72), solid(color, 0.6));
    r.userData.o = i / 4;
    g.add(r);
    rings.push(r);
  }
  g.rotation.x = -0.5;
  return {
    object: g,
    update(t) {
      body.rotation.y = t * 0.7;
      body.rotation.x = t * 0.4;
      cage.rotation.y = -t * 0.4;
      rings.forEach((r) => {
        const u = (r.userData.o + t * 0.32) % 1;
        r.scale.setScalar(0.4 + u * 1.9);
        r.material.opacity = 0.7 * (1 - u);
      });
    },
  };
}

function shield(color) {
  const g = new THREE.Group();
  const shells = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.7 + i * 0.36, 1)),
      line(color, 0.55 - i * 0.12)
    );
    g.add(s);
    shells.push(s);
  }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 2), solid(color, 0.95));
  g.add(core);

  const scan = new THREE.Mesh(new THREE.RingGeometry(0.05, 1.5, 72, 1, 0, Math.PI * 0.5), solid(color, 0.35));
  g.add(scan);

  return {
    object: g,
    update(t) {
      shells.forEach((s, i) => {
        const dir = i % 2 ? -1 : 1;
        s.rotation.y = t * 0.22 * dir * (1 + i * 0.4);
        s.rotation.x = t * 0.14 * dir;
      });
      core.rotation.y = t * 0.6;
      core.scale.setScalar(1 + Math.sin(t * 3) * 0.05);
      scan.rotation.z = t * 1.6;
      scan.rotation.x = 0.9;
    },
  };
}

const BUILDERS = { orbit, lattice, flow, rebuild, pulse, shield };

export function createCoreViz(kind, accent) {
  const build = BUILDERS[kind] || orbit;
  const viz = build(new THREE.Color(accent));
  viz.object.visible = false;
  return viz;
}

export function disposeViz(viz) {
  viz.object.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      Array.isArray(o.material) ? o.material.forEach((m) => m.dispose()) : o.material.dispose();
    }
  });
}
