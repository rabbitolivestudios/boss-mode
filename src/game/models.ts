import * as THREE from 'three';
import type { BossId } from './config';

let gradient: THREE.DataTexture | null = null;

/** Three-step ramp gives the chunky cartoon shading instead of smooth gradients. */
function toonRamp(): THREE.DataTexture {
  if (gradient) return gradient;
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

export function toon(color: number, emissive = 0x000000, emissiveIntensity = 0): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), emissive, emissiveIntensity });
}

function mesh(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, toon(color));
  m.position.set(x, y, z);
  return m;
}

function eyes(parent: THREE.Object3D, y: number, z: number, spread: number, size: number, pupil = 0x111111): void {
  for (const s of [-1, 1]) {
    const white = mesh(new THREE.SphereGeometry(size, 12, 8), 0xffffff, s * spread, y, z);
    const dot = mesh(new THREE.SphereGeometry(size * 0.55, 10, 6), pupil, 0, 0, size * 0.6);
    white.add(dot);
    parent.add(white);
  }
}

export interface BossModel {
  root: THREE.Group;
  animate(t: number, moving: boolean, hurt: number): void;
}

export function buildBoss(id: BossId, color: number, accent: number): BossModel {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  if (id === 'dragon') {
    const torso = mesh(new THREE.IcosahedronGeometry(1.05, 1), color, 0, 1.15, 0);
    torso.scale.set(1, 0.95, 1.15);
    const belly = mesh(new THREE.IcosahedronGeometry(0.8, 1), accent, 0, 1.0, 0.45);
    belly.scale.set(0.9, 0.9, 0.6);
    const head = new THREE.Group();
    head.position.set(0, 2.25, 0.55);
    head.add(mesh(new THREE.BoxGeometry(1.1, 0.85, 1.0), color));
    head.add(mesh(new THREE.BoxGeometry(0.8, 0.45, 0.6), color, 0, -0.15, 0.7));
    for (const s of [-1, 1]) {
      const horn = mesh(new THREE.ConeGeometry(0.14, 0.6, 6), accent, s * 0.35, 0.6, -0.2);
      horn.rotation.x = -0.5;
      head.add(horn);
      head.add(mesh(new THREE.SphereGeometry(0.06, 6, 4), 0x222222, s * 0.18, -0.05, 1.0));
    }
    eyes(head, 0.18, 0.5, 0.28, 0.17);
    const wings: THREE.Mesh[] = [];
    for (const s of [-1, 1]) {
      const wing = mesh(new THREE.ConeGeometry(0.9, 1.9, 3), accent, s * 1.1, 1.8, -0.4);
      wing.rotation.z = s * -1.2;
      wing.scale.set(1, 1, 0.15);
      wings.push(wing);
      body.add(wing);
    }
    const tail = mesh(new THREE.ConeGeometry(0.4, 1.8, 6), color, 0, 0.7, -1.3);
    tail.rotation.x = -1.3;
    for (const s of [-1, 1]) body.add(mesh(new THREE.BoxGeometry(0.35, 0.5, 0.45), color, s * 0.55, 0.25, 0.2));
    body.add(torso, belly, head, tail);
    return {
      root,
      animate(t, moving, hurt) {
        const flap = Math.sin(t * (moving ? 12 : 5)) * 0.35;
        wings[0].rotation.z = 1.2 + flap;
        wings[1].rotation.z = -1.2 - flap;
        body.position.y = Math.abs(Math.sin(t * (moving ? 9 : 3))) * (moving ? 0.25 : 0.08);
        tail.rotation.y = Math.sin(t * 4) * 0.4;
        head.rotation.x = Math.sin(t * 2) * 0.08;
        body.rotation.z = hurt > 0 ? Math.sin(t * 60) * 0.1 : 0;
      },
    };
  }

  if (id === 'slime') {
    const blob = mesh(new THREE.SphereGeometry(1.35, 24, 16), color, 0, 1.2, 0);
    (blob.material as THREE.MeshToonMaterial).transparent = true;
    (blob.material as THREE.MeshToonMaterial).opacity = 0.9;
    const core = mesh(new THREE.IcosahedronGeometry(0.45, 0), 0x1d9a4f, 0, 1.0, -0.2);
    const crown = new THREE.Group();
    crown.position.set(0, 2.55, 0);
    crown.add(mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.35, 10, 1, true), accent));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      crown.add(mesh(new THREE.ConeGeometry(0.13, 0.4, 5), accent, Math.cos(a) * 0.55, 0.35, Math.sin(a) * 0.55));
      crown.add(mesh(new THREE.SphereGeometry(0.08, 6, 4), 0xff3d7f, Math.cos(a) * 0.58, 0.05, Math.sin(a) * 0.58));
    }
    eyes(blob, 0.25, 1.05, 0.42, 0.26);
    const mouth = mesh(new THREE.TorusGeometry(0.28, 0.07, 6, 12, Math.PI), 0x0d4a26, 0, -0.2, 1.22);
    mouth.rotation.z = Math.PI;
    blob.add(mouth);
    body.add(blob, core, crown);
    return {
      root,
      animate(t, moving, hurt) {
        const k = Math.sin(t * (moving ? 10 : 4));
        const squash = 1 + k * (moving ? 0.12 : 0.05);
        blob.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
        blob.position.y = 1.2 * squash;
        crown.position.y = 2.4 * squash + 0.15;
        crown.rotation.z = Math.sin(t * 3) * 0.08;
        core.rotation.y = t;
        core.position.y = 1.0 * squash;
        body.rotation.z = hurt > 0 ? Math.sin(t * 60) * 0.1 : 0;
      },
    };
  }

  // Bone Lord
  const ribs = new THREE.Group();
  ribs.position.y = 1.35;
  ribs.add(mesh(new THREE.BoxGeometry(0.25, 1.2, 0.25), color));
  for (let i = 0; i < 4; i++) ribs.add(mesh(new THREE.BoxGeometry(1.0 - i * 0.12, 0.12, 0.5), color, 0, 0.35 - i * 0.22, 0));
  const skull = new THREE.Group();
  skull.position.set(0, 2.35, 0.05);
  skull.add(mesh(new THREE.BoxGeometry(0.9, 0.8, 0.85), color));
  skull.add(mesh(new THREE.BoxGeometry(0.6, 0.25, 0.6), color, 0, -0.45, 0.1));
  for (const s of [-1, 1]) {
    const socket = mesh(new THREE.SphereGeometry(0.15, 8, 6), 0x220033, s * 0.2, 0.05, 0.4);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: accent }));
    glow.position.z = 0.08;
    socket.add(glow);
    skull.add(socket);
  }
  const crown = new THREE.Group();
  crown.position.y = 0.5;
  for (let i = 0; i < 4; i++) crown.add(mesh(new THREE.ConeGeometry(0.12, 0.45, 4), 0xffc93a, -0.3 + i * 0.2, 0.15, 0));
  skull.add(crown);
  const cape = mesh(new THREE.ConeGeometry(1.2, 2.2, 8, 1, true), accent, 0, 1.2, -0.1);
  (cape.material as THREE.MeshToonMaterial).side = THREE.DoubleSide;
  const staff = new THREE.Group();
  staff.position.set(1.1, 1.4, 0.3);
  staff.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), 0x5a3a22));
  const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshBasicMaterial({ color: accent }));
  orb.position.y = 1.3;
  staff.add(orb);
  body.add(cape, ribs, skull, staff);
  return {
    root,
    animate(t, moving, hurt) {
      body.position.y = 0.2 + Math.sin(t * 2.5) * 0.15;
      cape.rotation.y = Math.sin(t * (moving ? 8 : 2)) * 0.15;
      staff.rotation.z = Math.sin(t * 2) * 0.15;
      orb.scale.setScalar(1 + Math.sin(t * 6) * 0.15);
      skull.rotation.y = Math.sin(t * 1.3) * 0.2;
      body.rotation.z = hurt > 0 ? Math.sin(t * 60) * 0.1 : 0;
    },
  };
}

/** One draw call per part keeps hundreds of heroes cheap on phones. */
export function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, count: number): THREE.InstancedMesh {
  const m = new THREE.InstancedMesh(geo, mat, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.count = 0;
  m.frustumCulled = false;
  return m;
}
