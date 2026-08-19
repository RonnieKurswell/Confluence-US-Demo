import * as THREE from 'three';

/**
 * A drifting field of hexagons for the stats screen — the lattice the framework
 * is built from, before it resolves into the board itself. Blue on blue and
 * deliberately low contrast so the copy over it stays readable.
 */

const COUNT = 96;
const LINK_DISTANCE = 7.2;
const MAX_LINKS = 150;

function hexPoints(radius) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (30 + i * 60) * (Math.PI / 180);
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return pts;
}

export function createConstellation() {
  const group = new THREE.Group();
  group.name = 'Constellation';

  // One shared geometry, scaled per instance — 96 line loops is nothing, but
  // there is no reason to build 96 buffers either.
  const unit = new THREE.BufferGeometry().setFromPoints(hexPoints(1));

  const cells = [];
  const rand = (a, b) => a + Math.random() * (b - a);

  for (let i = 0; i < COUNT; i++) {
    // Weighted to the right and back, so the copy column stays clear.
    const x = rand(-16, 30);
    const y = rand(-15, 15);
    const z = rand(-26, 1);
    const radius = rand(0.22, 1.25);
    const depth = (z + 26) / 27; // 0 far, 1 near

    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(0.57, 0.55, 0.22 + depth * 0.3),
      transparent: true,
      opacity: 0.1 + depth * 0.3,
      toneMapped: false,
    });
    const hex = new THREE.LineLoop(unit, material);
    hex.position.set(x, y, z);
    hex.scale.setScalar(radius);
    hex.rotation.z = rand(0, Math.PI);

    hex.userData = {
      baseY: y,
      baseOpacity: material.opacity,
      drift: rand(0.12, 0.42),
      phase: rand(0, Math.PI * 2),
      spin: rand(-0.06, 0.06),
    };
    group.add(hex);
    cells.push(hex);
  }

  // A handful sit solid, so the field has weight as well as line.
  const solids = [];
  for (let i = 0; i < 7; i++) {
    const source = cells[Math.floor(Math.random() * cells.length)];
    const shape = new THREE.Shape();
    hexPoints(1).forEach((p, k) => (k ? shape.lineTo(p.x, p.y) : shape.moveTo(p.x, p.y)));
    const mesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshBasicMaterial({
        color: 0x1b4f80,
        transparent: true,
        opacity: 0.16,
        toneMapped: false,
        side: THREE.DoubleSide,
      })
    );
    mesh.position.copy(source.position).setZ(source.position.z - 0.05);
    mesh.scale.copy(source.scale);
    mesh.rotation.z = source.rotation.z;
    mesh.userData = { ...source.userData, baseOpacity: 0.16 };
    group.add(mesh);
    solids.push(mesh);
  }

  // Links between near neighbours: the "deeply interconnected" idea, stated
  // quietly. Pairs are fixed at build time; only the vertices move.
  const pairs = [];
  for (let i = 0; i < cells.length && pairs.length < MAX_LINKS; i++) {
    for (let j = i + 1; j < cells.length && pairs.length < MAX_LINKS; j++) {
      if (cells[i].position.distanceTo(cells[j].position) < LINK_DISTANCE) pairs.push([i, j]);
    }
  }
  const linkGeo = new THREE.BufferGeometry();
  const linkPos = new Float32Array(pairs.length * 6);
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  const links = new THREE.LineSegments(
    linkGeo,
    new THREE.LineBasicMaterial({ color: 0x2f7fbf, transparent: true, opacity: 0.1, toneMapped: false })
  );
  group.add(links);

  const drifting = [...cells, ...solids];

  return {
    object: group,
    update(t, alpha) {
      group.visible = alpha > 0.01;
      if (!group.visible) return;

      for (const cell of drifting) {
        const d = cell.userData;
        cell.position.y = d.baseY + Math.sin(t * d.drift + d.phase) * 1.4;
        cell.rotation.z += d.spin * 0.01;
        cell.material.opacity = d.baseOpacity * alpha;
      }

      for (let k = 0; k < pairs.length; k++) {
        const a = cells[pairs[k][0]].position;
        const b = cells[pairs[k][1]].position;
        linkPos.set([a.x, a.y, a.z, b.x, b.y, b.z], k * 6);
      }
      linkGeo.attributes.position.needsUpdate = true;
      links.material.opacity = 0.1 * alpha;

      // The whole field breathes, very slightly.
      group.rotation.z = Math.sin(t * 0.05) * 0.02;
      group.position.z = Math.sin(t * 0.07) * 0.6;
    },
  };
}
