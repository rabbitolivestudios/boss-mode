import * as THREE from 'three';
import { instanced, toon } from './models';

const GROUND_SIZE = 220;
const GROUND_REPEAT = 55;
const DECOR_SPAN = 90;

function grassTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  g.fillStyle = '#5fcf5a';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#56c252';
  g.fillRect(0, 0, 64, 64);
  g.fillRect(64, 64, 64, 64);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = i % 3 ? '#6ddc63' : '#4db249';
    g.fillRect((i * 37) % 128, (i * 61) % 128, 3, 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(GROUND_REPEAT, GROUND_REPEAT);
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface DecorSet { mesh: THREE.InstancedMesh; spots: { x: number; z: number; s: number; r: number }[]; y: number }

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private ground: THREE.Mesh;
  private grass: THREE.CanvasTexture;
  private decor: DecorSet[] = [];
  private tmp = new THREE.Object3D();
  private shake = 0;
  private camTarget = new THREE.Vector3();
  zoom = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.background = new THREE.Color(0x8fd8ff);
    this.scene.fog = new THREE.Fog(0x8fd8ff, 38, 70);
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

    this.scene.add(new THREE.HemisphereLight(0xdff4ff, 0x5a8a3a, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(6, 12, 8);
    this.scene.add(sun);

    this.grass = grassTexture();
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), new THREE.MeshLambertMaterial({ map: this.grass }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);

    this.addDecor(new THREE.IcosahedronGeometry(1.1, 0), toon(0x2e9e4a), 55, 1.9, 0.8, 1.4);
    this.addDecor(new THREE.CylinderGeometry(0.22, 0.3, 1.0, 6), toon(0x7a4a2a), 55, 0.5, 0.8, 1.4, 0);
    this.addDecor(new THREE.DodecahedronGeometry(0.7, 0), toon(0xa9b3c0), 45, 0.3, 0.5, 1.6);
    this.addDecor(new THREE.OctahedronGeometry(0.5, 0), toon(0xb07dff, 0x6a2cff, 0.5), 18, 0.7, 0.8, 1.5);
    this.addDecor(new THREE.SphereGeometry(0.18, 6, 4), toon(0xfff15a), 90, 0.1, 0.8, 1.2);
    this.addDecor(new THREE.SphereGeometry(0.18, 6, 4), toon(0xff6fb0), 90, 0.1, 0.8, 1.2);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private decorSeed = 1;
  private rand(): number {
    // Cheap LCG so the scenery is the same every run.
    this.decorSeed = (this.decorSeed * 16807) % 2147483647;
    return this.decorSeed / 2147483647;
  }

  /** Trunks reuse the tree layout by seeding identically when `pairSeed` is 0. */
  private addDecor(geo: THREE.BufferGeometry, mat: THREE.Material, n: number, y: number, smin: number, smax: number, pairSeed?: number): void {
    if (pairSeed === 0) this.decorSeed = 1;
    else if (this.decor.length === 0) this.decorSeed = 1;
    const spots = [];
    for (let i = 0; i < n; i++) {
      spots.push({ x: this.rand() * DECOR_SPAN, z: this.rand() * DECOR_SPAN, s: smin + this.rand() * (smax - smin), r: this.rand() * Math.PI });
    }
    const m = instanced(geo, mat, n);
    m.count = n;
    this.scene.add(m);
    this.decor.push({ mesh: m, spots, y });
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Portrait phones see less width, so pull the camera back to keep the crowd visible.
    this.zoom = w < h ? 1.45 : 1;
    this.camera.updateProjectionMatrix();
  }

  addShake(amount: number): void {
    this.shake = Math.min(1.2, this.shake + amount);
  }

  update(px: number, pz: number, dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 3);
    this.camTarget.set(px, 0, pz);
    const sx = (Math.random() - 0.5) * this.shake;
    const sz = (Math.random() - 0.5) * this.shake;
    const d = this.zoom;
    this.camera.position.set(px + sx, 21 * d, pz + 13 * d + sz);
    this.camera.lookAt(this.camTarget.x + sx * 0.5, 0, this.camTarget.z - 1);

    this.ground.position.set(px, 0, pz);
    const tile = GROUND_SIZE / GROUND_REPEAT;
    this.grass.offset.set(px / tile, -pz / tile);

    for (const set of this.decor) {
      for (let i = 0; i < set.spots.length; i++) {
        const s = set.spots[i];
        const x = wrapNear(s.x, px);
        const z = wrapNear(s.z, pz);
        this.tmp.position.set(x, set.y * s.s, z);
        this.tmp.rotation.set(0, s.r, 0);
        this.tmp.scale.setScalar(s.s);
        this.tmp.updateMatrix();
        set.mesh.setMatrixAt(i, this.tmp.matrix);
      }
      set.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}

/** The scenery tiles endlessly: each prop appears at its copy closest to the player. */
function wrapNear(base: number, center: number): number {
  const half = DECOR_SPAN / 2;
  let v = base + Math.round((center - base) / DECOR_SPAN) * DECOR_SPAN;
  if (v - center > half) v -= DECOR_SPAN;
  if (center - v > half) v += DECOR_SPAN;
  return v;
}
