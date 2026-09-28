import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { instanced, toon } from './models';
import { PROPS, SpriteBatch, paperGround, propAtlas, type Prop } from './paper';
import type { StyleId } from './style';

const GROUND_SIZE = 220;

interface Spot { x: number; z: number; s: number; r: number }
interface Part { mesh: THREE.InstancedMesh; y: number }
interface DecorSet { span: number; spots: Spot[]; parts: Part[] }
interface SpriteDecor { span: number; spots: (Spot & { prop: number })[]; batch: SpriteBatch; size: number }
interface Brazier { spot: Spot; light: THREE.PointLight; flame: THREE.Mesh; phase: number }

interface CameraRig { height: number; back: number; fov: number }

const RIGS: Record<StyleId, CameraRig> = {
  classic: { height: 21, back: 13, fov: 42 },
  paper: { height: 15, back: 17, fov: 42 },
  dungeon: { height: 17, back: 14, fov: 45 },
  diorama: { height: 44, back: 30, fov: 22 },
};

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /** Tilt that makes paper cutouts face the camera while still standing on the ground. */
  readonly standeeTilt: number;
  private ground!: THREE.Mesh;
  private groundTex!: THREE.Texture;
  private groundTile = 4;
  private decor: DecorSet[] = [];
  private sprites: SpriteDecor[] = [];
  private braziers: Brazier[] = [];
  private sun: THREE.DirectionalLight | null = null;
  private composer: EffectComposer | null = null;
  private tmp = new THREE.Object3D();
  private shake = 0;
  private seed = 1;
  private rig: CameraRig;
  zoom = 1;
  /** Areas scenery must not cover (the vault, the gateways). */
  keepClear: { x: number; z: number; r: number }[] = [];
  /** Build phase: pull the camera up over the whole castle instead of following the boss. */
  overview = false;

  constructor(canvas: HTMLCanvasElement, readonly style: StyleId) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: window.devicePixelRatio < 2, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.rig = RIGS[style];
    this.camera = new THREE.PerspectiveCamera(this.rig.fov, 1, 0.1, 300);
    this.standeeTilt = Math.atan2(this.rig.height, this.rig.back) * 0.55;
    document.body.classList.add(`style-${style}`);

    if (style === 'paper') this.buildPaper();
    else if (style === 'dungeon') this.buildDungeon();
    else if (style === 'diorama') this.buildDiorama();
    else this.buildClassic();

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  get shadows(): boolean { return this.style === 'diorama'; }

  // ---------- Environments ----------

  private makeGround(tex: THREE.Texture, tile: number, lit: boolean): void {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(GROUND_SIZE / tile, GROUND_SIZE / tile);
    this.groundTex = tex;
    this.groundTile = tile;
    const mat = lit ? new THREE.MeshLambertMaterial({ map: tex }) : new THREE.MeshBasicMaterial({ map: tex });
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE), mat);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = this.shadows;
    this.scene.add(this.ground);
  }

  private buildClassic(): void {
    this.scene.background = new THREE.Color(0x8fd8ff);
    this.scene.fog = new THREE.Fog(0x8fd8ff, 38, 70);
    this.scene.add(new THREE.HemisphereLight(0xdff4ff, 0x5a8a3a, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 2.2);
    sun.position.set(6, 12, 8);
    this.scene.add(sun);
    const [c, g] = canvas(128);
    g.fillStyle = '#5fcf5a'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#56c252'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64);
    for (let i = 0; i < 40; i++) { g.fillStyle = i % 3 ? '#6ddc63' : '#4db249'; g.fillRect((i * 37) % 128, (i * 61) % 128, 3, 6); }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    this.makeGround(t, 4, true);
    this.group(90, 55, 0.8, 1.4, [
      { geo: new THREE.IcosahedronGeometry(1.1, 0), mat: toon(0x2e9e4a), y: 1.9 },
      { geo: new THREE.CylinderGeometry(0.22, 0.3, 1.0, 6), mat: toon(0x7a4a2a), y: 0.5 },
    ]);
    this.group(90, 45, 0.5, 1.6, [{ geo: new THREE.DodecahedronGeometry(0.7, 0), mat: toon(0xa9b3c0), y: 0.3 }]);
    this.group(90, 18, 0.8, 1.5, [{ geo: new THREE.OctahedronGeometry(0.5, 0), mat: toon(0xb07dff, 0x6a2cff, 0.5), y: 0.7 }]);
    this.group(90, 90, 0.8, 1.2, [{ geo: new THREE.SphereGeometry(0.18, 6, 4), mat: toon(0xfff15a), y: 0.1 }]);
    this.group(90, 90, 0.8, 1.2, [{ geo: new THREE.SphereGeometry(0.18, 6, 4), mat: toon(0xff6fb0), y: 0.1 }]);
  }

  private buildPaper(): void {
    this.scene.background = new THREE.Color(0xbfe6ff);
    this.scene.fog = new THREE.Fog(0xbfe6ff, 40, 80);
    this.makeGround(paperGround(), 16, false);
    // Cutouts are unlit, but traps, loot and chests are still 3D and need light to show their colours.
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb8e08a, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(4, 12, 8);
    this.scene.add(sun);
    const atlas = propAtlas();
    const batch = new SpriteBatch(atlas.tex, atlas.cols, atlas.rows, 200, this.standeeTilt);
    this.scene.add(batch.mesh);
    const weights: Record<Prop, number> = { tree: 5, pine: 4, bush: 5, rock: 3, flowers: 7, mushroom: 2 };
    const pool = PROPS.flatMap((p, i) => Array<number>(weights[p]).fill(i));
    const spots: SpriteDecor['spots'] = [];
    this.seed = 11;
    for (let i = 0; i < 140; i++) spots.push({ x: this.rand() * 90, z: this.rand() * 90, s: 0.8 + this.rand() * 0.5, r: 0, prop: pool[Math.floor(this.rand() * pool.length)] });
    this.sprites.push({ span: 90, spots, batch, size: 2.4 });
  }

  private buildDungeon(): void {
    this.scene.background = new THREE.Color(0x0b0913);
    this.scene.fog = new THREE.Fog(0x0b0913, 22, 46);
    this.scene.add(new THREE.HemisphereLight(0x8a8cff, 0x2a1810, 0.8));
    const moon = new THREE.DirectionalLight(0x9fb4ff, 0.8);
    moon.position.set(-6, 14, 4);
    this.scene.add(moon);
    this.makeGround(stoneFloor(), 12, true);

    this.group(60, 10, 0.9, 1.2, [
      { geo: new THREE.CylinderGeometry(0.7, 0.8, 4.5, 8), mat: toon(0x6a6f86), y: 2.25 },
      { geo: new THREE.BoxGeometry(2, 0.5, 2), mat: toon(0x565a70), y: 4.6 },
      { geo: new THREE.BoxGeometry(2, 0.4, 2), mat: toon(0x565a70), y: 0.2 },
    ]);
    this.group(60, 30, 0.5, 1.4, [{ geo: new THREE.DodecahedronGeometry(0.6, 0), mat: toon(0x4d5064), y: 0.25 }]);
    this.group(60, 20, 0.7, 1.1, [{ geo: new THREE.CapsuleGeometry(0.08, 0.6, 2, 6), mat: toon(0xe9e4d4), y: 0.1 }]);
    this.group(60, 14, 0.8, 1.2, [{ geo: new THREE.BoxGeometry(0.9, 0.9, 0.9), mat: toon(0x6b4424), y: 0.45 }]);
    this.group(60, 26, 0.6, 1.0, [{ geo: new THREE.OctahedronGeometry(0.35, 0), mat: new THREE.MeshBasicMaterial({ color: 0x6af0ff }), y: 0.3 }]);

    // Braziers carry the real point lights; a handful is enough because they wrap with the player.
    const bowlGeo = new THREE.CylinderGeometry(0.7, 0.35, 0.6, 10);
    const legGeo = new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6);
    const flameGeo = new THREE.ConeGeometry(0.45, 1.1, 7);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });
    this.seed = 29;
    for (let i = 0; i < 7; i++) {
      const spot = { x: this.rand() * 44, z: this.rand() * 44, s: 1, r: 0 };
      const light = new THREE.PointLight(0xff8a2a, 22, 13, 1.6);
      const bowl = new THREE.Mesh(bowlGeo, toon(0x3a3340));
      const leg = new THREE.Mesh(legGeo, toon(0x3a3340));
      const flame = new THREE.Mesh(flameGeo, flameMat);
      bowl.name = 'bowl'; leg.name = 'leg';
      this.scene.add(light, bowl, leg, flame);
      this.braziers.push({ spot, light, flame, phase: this.rand() * 10 });
    }

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.4, 0.92));
    this.composer.addPass(new OutputPass());
  }

  private buildDiorama(): void {
    this.scene.background = new THREE.Color(0xd8cfb4);
    this.scene.fog = new THREE.Fog(0xd8cfb4, 70, 120);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.add(new THREE.HemisphereLight(0xfff4dc, 0x6a5a3a, 1.2));
    const sun = new THREE.DirectionalLight(0xfff0d0, 2.6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const cam = sun.shadow.camera;
    cam.left = -30; cam.right = 30; cam.top = 30; cam.bottom = -30; cam.near = 1; cam.far = 80;
    sun.shadow.bias = -0.0008;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    this.makeGround(paintedTerrain(), 60, true);

    const lam = (c: number) => new THREE.MeshLambertMaterial({ color: c });
    const roof = new THREE.CylinderGeometry(1.7, 1.7, 3.2, 3, 1);
    roof.rotateZ(Math.PI / 2);
    roof.rotateX(Math.PI / 6);
    this.group(90, 9, 0.9, 1.2, [
      { geo: new THREE.BoxGeometry(3.2, 2, 2.6), mat: lam(0xe8dcc0), y: 1 },
      { geo: roof, mat: lam(0x9a4a32), y: 2.8 },
      { geo: new THREE.BoxGeometry(0.5, 1.1, 0.5), mat: lam(0x7a6a5a), y: 3.6 },
    ]);
    this.group(90, 40, 0.8, 1.3, [
      { geo: new THREE.IcosahedronGeometry(1.2, 1), mat: lam(0x4f6a2e), y: 2.2 },
      { geo: new THREE.CylinderGeometry(0.2, 0.28, 1.4, 6), mat: lam(0x5a4028), y: 0.7 },
    ]);
    this.group(90, 22, 0.9, 1.1, [{ geo: new THREE.CylinderGeometry(0.4, 0.4, 0.9, 10), mat: lam(0x6a4a2a), y: 0.45 }]);
    this.group(90, 18, 0.8, 1.2, [{ geo: new THREE.BoxGeometry(0.8, 0.8, 0.8), mat: lam(0xa58a5a), y: 0.4 }]);
    const bale = new THREE.CylinderGeometry(0.6, 0.6, 1.1, 12);
    bale.rotateZ(Math.PI / 2);
    this.group(90, 16, 0.9, 1.1, [{ geo: bale, mat: lam(0xd9b85a), y: 0.6 }]);
    this.group(90, 20, 1, 1, [
      { geo: new THREE.BoxGeometry(4, 0.12, 0.1), mat: lam(0x7a5a3a), y: 0.7 },
      { geo: new THREE.BoxGeometry(4, 0.12, 0.1), mat: lam(0x7a5a3a), y: 0.35 },
      { geo: new THREE.BoxGeometry(0.15, 0.9, 0.15), mat: lam(0x6a4a2a), y: 0.45 },
    ]);
    this.group(90, 30, 0.5, 1.2, [{ geo: new THREE.DodecahedronGeometry(0.5, 0), mat: lam(0x8a8578), y: 0.2 }]);
  }

  // ---------- Decor plumbing ----------

  private rand(): number {
    // Seeded so the scenery is the same every run.
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  private group(span: number, n: number, smin: number, smax: number, parts: { geo: THREE.BufferGeometry; mat: THREE.Material; y: number }[]): void {
    this.seed = 7 + this.decor.length * 101;
    const spots: Spot[] = [];
    for (let i = 0; i < n; i++) spots.push({ x: this.rand() * span, z: this.rand() * span, s: smin + this.rand() * (smax - smin), r: this.rand() * Math.PI });
    const built: Part[] = parts.map((p) => {
      const mesh = instanced(p.geo, p.mat, n);
      mesh.count = n;
      mesh.castShadow = mesh.receiveShadow = this.shadows;
      this.scene.add(mesh);
      return { mesh, y: p.y };
    });
    this.decor.push({ span, spots, parts: built });
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer?.setSize(w, h);
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
    const sx = (Math.random() - 0.5) * this.shake;
    const sz = (Math.random() - 0.5) * this.shake;
    const d = this.zoom;
    if (this.overview) {
      px = 0; pz = 0;
      this.camera.position.set(0, 38 * d, 30 * d);
      this.camera.lookAt(0, 0, 1);
    } else {
      this.camera.position.set(px + sx, this.rig.height * d, pz + this.rig.back * d + sz);
      this.camera.lookAt(px + sx * 0.5, 0, pz - 1);
    }

    this.ground.position.set(px, 0, pz);
    this.groundTex.offset.set(px / this.groundTile, -pz / this.groundTile);

    for (const set of this.decor) {
      for (let i = 0; i < set.spots.length; i++) {
        const s = set.spots[i];
        const x = wrapNear(s.x, px, set.span);
        const z = wrapNear(s.z, pz, set.span);
        for (const p of set.parts) {
          this.tmp.position.set(x, p.y * s.s, z);
          this.tmp.rotation.set(0, s.r, 0);
          this.tmp.scale.setScalar(s.s);
          this.tmp.updateMatrix();
          p.mesh.setMatrixAt(i, this.tmp.matrix);
        }
      }
      for (const p of set.parts) p.mesh.instanceMatrix.needsUpdate = true;
    }

    for (const sd of this.sprites) {
      sd.batch.begin();
      for (const s of sd.spots) {
        const size = sd.size * s.s;
        const x = wrapNear(s.x, px, sd.span), z = wrapNear(s.z, pz, sd.span);
        if (this.keepClear.some((k) => Math.hypot(x - k.x, z - k.z) < k.r)) continue;
        sd.batch.push({ x, y: 0, z, w: size, h: size, cell: s.prop, face: s.x > 45 ? -1 : 1 });
      }
      sd.batch.end();
    }

    const now = performance.now() / 1000;
    for (const b of this.braziers) {
      const x = wrapNear(b.spot.x, px, 44);
      const z = wrapNear(b.spot.z, pz, 44);
      const flicker = 1 + Math.sin(now * 13 + b.phase) * 0.12 + Math.sin(now * 29 + b.phase * 2) * 0.08;
      b.light.position.set(x, 2.4, z);
      b.light.intensity = 22 * flicker;
      b.flame.position.set(x, 2.25, z);
      b.flame.scale.set(1, flicker, 1);
    }
    this.placeBraziers(px, pz);

    if (this.sun) {
      this.sun.position.set(px + 18, 34, pz + 12);
      this.sun.target.position.set(px, 0, pz);
    }
  }

  private brazierParts: THREE.Object3D[][] | null = null;

  private placeBraziers(px: number, pz: number): void {
    if (!this.braziers.length) return;
    if (!this.brazierParts) {
      const bowls = this.scene.children.filter((c) => c.name === 'bowl');
      const legs = this.scene.children.filter((c) => c.name === 'leg');
      this.brazierParts = this.braziers.map((_, i) => [bowls[i], legs[i]]);
    }
    this.braziers.forEach((b, i) => {
      const x = wrapNear(b.spot.x, px, 44);
      const z = wrapNear(b.spot.z, pz, 44);
      const parts = this.brazierParts?.[i];
      if (!parts) return;
      parts[0].position.set(x, 1.75, z);
      parts[1].position.set(x, 0.8, z);
    });
  }

  render(): void {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}

/** The scenery tiles endlessly: each prop appears at its copy closest to the player. */
function wrapNear(base: number, center: number, span: number): number {
  const half = span / 2;
  let v = base + Math.round((center - base) / span) * span;
  if (v - center > half) v -= span;
  if (center - v > half) v += span;
  return v;
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  return [c, g];
}

function tex(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Irregular flagstones with mortar and cracks; laid out on a 4x4 grid so the tile repeats cleanly. */
function stoneFloor(): THREE.CanvasTexture {
  const S = 512;
  const [c, g] = canvas(S);
  g.fillStyle = '#1b1a24';
  g.fillRect(0, 0, S, S);
  let seed = 5;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const cell = S / 4;
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      const offset = gy % 2 ? cell / 2 : 0;
      for (const wrap of [0, -S]) {
        const x = gx * cell + offset + wrap + 5, y = gy * cell + 5, w = cell - 10, h = cell - 10;
        const shade = 70 + Math.floor(r() * 28);
        g.fillStyle = `rgb(${shade - 6},${shade - 2},${shade + 16})`;
        g.beginPath();
        g.roundRect(x, y, w, h, 10);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(x + 4, y + 4, w - 8, 6);
        if (r() < 0.45) {
          g.strokeStyle = 'rgba(10,8,16,0.6)';
          g.lineWidth = 2;
          g.beginPath();
          let cx = x + r() * w, cy = y + r() * h;
          g.moveTo(cx, cy);
          for (let k = 0; k < 4; k++) { cx += (r() - 0.5) * 40; cy += (r() - 0.5) * 40; g.lineTo(cx, cy); }
          g.stroke();
        }
        if (r() < 0.25) {
          g.fillStyle = 'rgba(60,110,70,0.35)';
          g.beginPath(); g.ellipse(x + r() * w, y + h - 8, 18, 8, 0, 0, Math.PI * 2); g.fill();
        }
      }
    }
  }
  return tex(c);
}

/** Periodic value noise, so the painted map tiles without seams. */
function periodicNoise(size: number, period: number, seed: number): (x: number, y: number) => number {
  const lattice = new Float32Array(period * period);
  let s = seed;
  for (let i = 0; i < lattice.length; i++) { s = (s * 16807) % 2147483647; lattice[i] = s / 2147483647; }
  const at = (ix: number, iy: number) => lattice[((iy % period + period) % period) * period + ((ix % period + period) % period)];
  return (x, y) => {
    const fx = (x / size) * period, fy = (y / size) * period;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * sx;
    const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * sx;
    return a + (b - a) * sy;
  };
}

/** Commandos-style painted map: olive grass, trodden dirt roads, scattered stones. */
function paintedTerrain(): THREE.CanvasTexture {
  const S = 1024;
  const [c, g] = canvas(S);
  const img = g.createImageData(S, S);
  const n1 = periodicNoise(S, 8, 3), n2 = periodicNoise(S, 32, 7), n3 = periodicNoise(S, 128, 11);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = n1(x, y) * 0.55 + n2(x, y) * 0.3 + n3(x, y) * 0.15;
      const roadA = Math.abs(y - (S * 0.5 + Math.sin((x / S) * Math.PI * 2) * S * 0.12 + Math.sin((x / S) * Math.PI * 6) * 18));
      const roadB = Math.abs(x - (S * 0.28 + Math.sin((y / S) * Math.PI * 4) * S * 0.06));
      const road = Math.min(roadA, roadB);
      const roadMix = Math.max(0, Math.min(1, (46 + n2(x, y) * 24 - road) / 14));
      const dirtPatch = Math.max(0, Math.min(1, (n1(x, y) - 0.62) * 6));
      const grass = [96 + n * 50, 112 + n * 44, 58 + n * 24];
      const dirt = [168 + n * 40, 146 + n * 34, 104 + n * 26];
      const m = Math.max(roadMix, dirtPatch * 0.8);
      const edge = roadMix > 0.05 && roadMix < 0.6 ? 0.82 : 1;
      const i = (y * S + x) * 4;
      img.data[i] = (grass[0] * (1 - m) + dirt[0] * m) * edge;
      img.data[i + 1] = (grass[1] * (1 - m) + dirt[1] * m) * edge;
      img.data[i + 2] = (grass[2] * (1 - m) + dirt[2] * m) * edge;
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  let seed = 9;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 2600; i++) {
    const x = r() * S, y = r() * S;
    g.fillStyle = r() > 0.5 ? 'rgba(60,70,30,0.35)' : 'rgba(230,220,190,0.25)';
    g.fillRect(x, y, 2 + r() * 3, 2 + r() * 3);
  }
  for (let i = 0; i < 90; i++) {
    const x = r() * S, y = r() * S;
    g.strokeStyle = 'rgba(90,110,40,0.5)';
    g.lineWidth = 1.5;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(x + k * 2, y); g.lineTo(x + k * 2 + (r() - 0.5) * 4, y - 6 - r() * 5); g.stroke(); }
  }
  return tex(c);
}
