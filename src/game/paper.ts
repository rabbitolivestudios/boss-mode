import * as THREE from 'three';
import { blob, canvas, cutout, dot, shine, texture } from './ink';

// Paper style scenery, ground, and the instanced standee renderer used for every cutout.

export type Prop = 'tree' | 'pine' | 'bush' | 'rock' | 'flowers' | 'mushroom';
export const PROPS: Prop[] = ['tree', 'pine', 'bush', 'rock', 'flowers', 'mushroom'];

const PROP_CELL = 192;

function drawProp(p: Prop): HTMLCanvasElement {
  const [c, g] = canvas(PROP_CELL, PROP_CELL);
  g.scale(PROP_CELL / 128, PROP_CELL / 128);
  switch (p) {
    case 'tree':
      blob(g, '#8a5a2b', () => g.roundRect(56, 70, 16, 52, 5));
      for (const [x, y, r, col] of [[46, 64, 26, '#3fae48'], [84, 62, 26, '#3fae48'], [64, 40, 31, '#55c95a']] as const) blob(g, col, () => g.arc(x, y, r, 0, Math.PI * 2));
      shine(g, 54, 28, 10, 6);
      for (const [x, y] of [[40, 58], [86, 52], [68, 34]]) dot(g, x, y, 4, '#ff5a5a');
      break;
    case 'pine':
      blob(g, '#8a5a2b', () => g.roundRect(58, 96, 12, 26, 3));
      for (const [y, w] of [[100, 44], [74, 36], [48, 26]]) blob(g, '#2e9e62', () => { g.moveTo(64 - w, y); g.quadraticCurveTo(64, y - 8, 64, y - 42); g.quadraticCurveTo(64, y - 8, 64 + w, y); g.closePath(); });
      shine(g, 56, 40, 4, 8, 0.3);
      break;
    case 'bush':
      for (const [x, y, r] of [[40, 96, 20], [86, 96, 20], [64, 84, 26]]) blob(g, '#4fc25a', () => g.arc(x, y, r, 0, Math.PI * 2));
      shine(g, 56, 72, 8, 5);
      for (const [x, y] of [[48, 88], [78, 80], [66, 100]]) dot(g, x, y, 4, '#ff5a7a');
      break;
    case 'rock':
      blob(g, '#a9b3c0', () => { g.moveTo(26, 118); g.quadraticCurveTo(28, 82, 44, 72); g.quadraticCurveTo(64, 56, 90, 70); g.quadraticCurveTo(106, 90, 106, 118); g.closePath(); });
      shine(g, 50, 82, 12, 6);
      break;
    case 'flowers':
      for (const [x, col] of [[40, '#ffd23a'], [64, '#ff6fb0'], [88, '#ffffff']] as const) {
        g.lineWidth = 3; g.strokeStyle = '#2e9e62'; g.beginPath(); g.moveTo(x, 120); g.lineTo(x, 90); g.stroke();
        for (let a = 0; a < 5; a++) blob(g, col, () => g.arc(x + Math.cos(a * 1.26) * 7, 86 + Math.sin(a * 1.26) * 7, 5, 0, Math.PI * 2), 1.5);
        blob(g, '#ff9a1a', () => g.arc(x, 86, 4, 0, Math.PI * 2), 1.5);
      }
      break;
    case 'mushroom':
      blob(g, '#f4ead8', () => g.roundRect(52, 80, 24, 40, 8));
      blob(g, '#e8392f', () => { g.moveTo(24, 86); g.quadraticCurveTo(64, 24, 104, 86); g.closePath(); });
      for (const [x, y] of [[48, 70], [72, 60], [86, 76]]) dot(g, x, y, 6, '#fff');
      break;
  }
  return cutout(c, 7);
}

export function propAtlas(): { tex: THREE.CanvasTexture; cols: number; rows: number } {
  const [c, g] = canvas(PROPS.length * PROP_CELL, PROP_CELL);
  PROPS.forEach((p, i) => g.drawImage(drawProp(p), i * PROP_CELL, 0));
  return { tex: texture(c), cols: PROPS.length, rows: 1 };
}

/** Construction-paper grass: layered cut shapes and fibres, drawn so it tiles seamlessly. */
export function paperGround(): THREE.CanvasTexture {
  const S = 512;
  const [c, g] = canvas(S, S);
  g.fillStyle = '#93cf63';
  g.fillRect(0, 0, S, S);
  let seed = 3;
  const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const wrapped = (fn: (ox: number, oy: number) => void) => { for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) fn(ox, oy); };
  for (let i = 0; i < 14; i++) {
    const cx = r() * S, cy = r() * S, rad = 30 + r() * 60;
    const pts: [number, number][] = [];
    for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2; const rr = rad * (0.7 + r() * 0.5); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    const light = i % 3 !== 0;
    wrapped((ox, oy) => {
      g.beginPath();
      pts.forEach(([x, y], k) => (k ? g.lineTo(cx + x + ox + 3, cy + y + oy + 4) : g.moveTo(cx + x + ox + 3, cy + y + oy + 4)));
      g.fillStyle = 'rgba(40,90,30,0.18)'; g.fill();
      g.beginPath();
      pts.forEach(([x, y], k) => (k ? g.lineTo(cx + x + ox, cy + y + oy) : g.moveTo(cx + x + ox, cy + y + oy)));
      g.fillStyle = light ? '#a3da72' : '#84c056'; g.fill();
    });
  }
  for (let i = 0; i < 1400; i++) {
    const x = r() * S, y = r() * S, a = r() * Math.PI, l = 3 + r() * 6;
    g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,40,0,0.08)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return texture(c);
}

export interface Standee {
  x: number; y: number; z: number;
  w: number; h: number;
  cell: number;
  /** -1..1: horizontal scale. Sign is facing; passing through 0 is the Paper Mario card-flip turn. */
  face: number;
  roll?: number;
  /** 0..1 white hit flash. */
  flash?: number;
  /** Extra backwards lean, used when a defeated cutout falls flat. */
  lean?: number;
}

/**
 * Instanced cutouts that stand up from the ground like cardboard standees.
 * Each instance picks its atlas cell and hit flash through one per-instance attribute.
 */
export class SpriteBatch {
  readonly mesh: THREE.InstancedMesh;
  private attr: THREE.InstancedBufferAttribute;
  private tmp = new THREE.Object3D();
  private n = 0;
  private time = { value: 0 };
  private scratch = new THREE.Matrix4();

  constructor(tex: THREE.Texture, private cols: number, private rows: number, cap: number, private tilt: number) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    this.attr = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    this.attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aCell', this.attr);
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    const size = `vec2(${(1 / cols).toFixed(6)}, ${(1 / rows).toFixed(6)})`;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.time;
      // aCell = (u, v, flash, flutter phase). Flutter bends the top of each paper piece a little,
      // so even a standing figure never looks like a rigid sticker.
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aCell;\nvarying float vFlash;\nuniform float uTime;')
        .replace('#include <uv_vertex>', `#include <uv_vertex>\nvMapUv = vMapUv * ${size} + aCell.xy;\nvFlash = aCell.z;`)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nif (aCell.w >= 0.0) transformed.x += sin(uTime * 2.6 + aCell.w) * 0.025 * position.y * position.y;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vFlash;')
        .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), vFlash);');
    };
    mat.customProgramCacheKey = () => `standee-${cols}x${rows}`;
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
  }

  begin(): void { this.n = 0; }

  /** Base transform of a standing cutout: position, lean back toward the camera, roll, and flip width. */
  standeeMatrix(s: Omit<Standee, 'cell' | 'flash'>, out: THREE.Matrix4): THREE.Matrix4 {
    this.tmp.position.set(s.x, s.y, s.z);
    this.tmp.rotation.set(-this.tilt - (s.lean ?? 0), 0, s.roll ?? 0);
    // Never exactly zero width: a degenerate matrix would drop the instance for a frame mid-flip.
    const fw = Math.abs(s.face) < 0.06 ? 0.06 * Math.sign(s.face || 1) : s.face;
    this.tmp.scale.set(s.w * fw, s.h, 1);
    this.tmp.updateMatrix();
    return out.copy(this.tmp.matrix);
  }

  push(s: Standee): void {
    this.pushMatrix(this.standeeMatrix(s, this.scratch), s.cell, s.flash ?? 0, -1);
  }

  /** Adds one piece with a full transform. `flutter` < 0 keeps the piece rigid. */
  pushMatrix(m: THREE.Matrix4, cell: number, flash: number, flutter: number): void {
    if (this.n >= this.attr.count || cell < 0) return;
    this.mesh.setMatrixAt(this.n, m);
    const col = cell % this.cols, row = Math.floor(cell / this.cols);
    this.attr.setXYZW(this.n, col / this.cols, 1 - (row + 1) / this.rows, flash, flutter);
    this.n++;
  }

  setTime(t: number): void {
    this.time.value = t;
  }

  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.attr.needsUpdate = true;
  }
}
