import * as THREE from 'three';
import { HEROES, type BossId, type HeroKind } from './config';

// Paper style: every character is a flat cutout drawn in code, with an ink line and a white paper border,
// packed into one atlas so the whole crowd stays a single draw call.

const INK = '#2a1f3d';
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  return [c, g];
}

/** Adds the paper-cutout border and a soft drop shadow around whatever was drawn. */
function silhouette(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const [sil, sg] = canvas(src.width, src.height);
  sg.drawImage(src, 0, 0);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = color;
  sg.fillRect(0, 0, sil.width, sil.height);
  return sil;
}

/** Adds the paper-cutout border and a soft drop shadow around whatever was drawn. */
function cutout(src: HTMLCanvasElement, border: number): HTMLCanvasElement {
  const white = silhouette(src, '#ffffff');
  const shadow = silhouette(src, '#000000');
  const [out, g] = canvas(src.width, src.height);
  g.globalAlpha = 0.2;
  for (let a = 0; a < 12; a++) g.drawImage(shadow, Math.cos(a / 12 * Math.PI * 2) * border + 3, Math.sin(a / 12 * Math.PI * 2) * border + 5);
  g.globalAlpha = 1;
  for (let r = border; r > 0; r -= border / 2) {
    for (let a = 0; a < 16; a++) g.drawImage(white, Math.cos(a / 16 * Math.PI * 2) * r, Math.sin(a / 16 * Math.PI * 2) * r);
  }
  g.drawImage(src, 0, 0);
  return out;
}

function flash(src: HTMLCanvasElement): HTMLCanvasElement {
  const [c, g] = canvas(src.width, src.height);
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

type G = CanvasRenderingContext2D;

function blob(g: G, fill: string, draw: () => void, line = 3): void {
  g.beginPath();
  draw();
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = line;
  g.strokeStyle = INK;
  g.lineJoin = 'round';
  g.stroke();
}

function rrect(g: G, x: number, y: number, w: number, h: number, r: number): void {
  g.roundRect(x, y, w, h, r);
}

function eyes(g: G, x: number, y: number, size: number, gap: number, look = 1): void {
  for (const dx of [0, gap]) {
    blob(g, '#fff', () => g.ellipse(x + dx, y, size * 0.8, size, 0, 0, Math.PI * 2), 2);
    g.beginPath();
    g.fillStyle = INK;
    g.ellipse(x + dx + look * size * 0.35, y + size * 0.1, size * 0.42, size * 0.55, 0, 0, Math.PI * 2);
    g.fill();
  }
}

export type SpriteKind = HeroKind | 'goblin';
export const SPRITE_KINDS: SpriteKind[] = ['noob', 'archer', 'knight', 'sweat', 'healer', 'champion', 'goblin'];

function drawHero(kind: SpriteKind, frame: number): HTMLCanvasElement {
  const [c, g] = canvas(128, 128);
  const d = kind === 'goblin' ? { body: 0x4bd14b, head: 0x7af06a, gear: 0x8a5a2b } : HEROES[kind];
  const body = hex(d.body), head = hex(d.head), gear = hex(d.gear);
  const swing = frame === 0 ? 0.35 : -0.35;
  g.translate(0, kind === 'goblin' ? 10 : 0);

  if (kind === 'champion') blob(g, '#d8263a', () => { g.moveTo(44, 58); g.lineTo(26, 112); g.lineTo(70, 104); g.closePath(); });

  for (const [hip, s] of [[54, swing], [74, -swing]] as const) {
    g.save();
    g.translate(hip, 94);
    g.rotate(s);
    blob(g, '#3b3f58', () => rrect(g, -7, 0, 14, 24, 5));
    g.restore();
  }
  blob(g, body, () => rrect(g, 40, 58, 48, 40, 10));
  if (kind === 'healer') { g.fillStyle = '#3ed17a'; g.fillRect(58, 66, 12, 26); g.fillRect(51, 73, 26, 12); }
  if (kind === 'champion') { g.fillStyle = '#fff3b0'; g.fillRect(46, 64, 36, 6); }

  if (kind === 'goblin') {
    blob(g, head, () => { g.moveTo(40, 34); g.lineTo(18, 22); g.lineTo(44, 48); g.closePath(); });
    blob(g, head, () => { g.moveTo(88, 34); g.lineTo(110, 22); g.lineTo(84, 48); g.closePath(); });
  }
  blob(g, head, () => rrect(g, 38, 14, 52, 46, 14));

  switch (kind) {
    case 'knight':
      blob(g, '#6c7a8f', () => rrect(g, 36, 10, 56, 50, 14));
      g.fillStyle = INK; g.fillRect(56, 30, 32, 7);
      blob(g, '#c9d3e2', () => { g.moveTo(72, 62); g.lineTo(104, 62); g.lineTo(104, 88); g.quadraticCurveTo(88, 108, 72, 88); g.closePath(); });
      g.fillStyle = '#d8263a'; g.fillRect(86, 66, 4, 26); g.fillRect(77, 74, 22, 4);
      break;
    case 'sweat':
      eyes(g, 64, 34, 5, 16);
      blob(g, gear, () => rrect(g, 36, 20, 56, 8, 3), 2);
      blob(g, gear, () => { g.moveTo(38, 22); g.lineTo(20, 14 + swing * 10); g.lineTo(22, 26); g.closePath(); }, 2);
      g.fillStyle = '#ff9ec0'; g.beginPath(); g.ellipse(62, 44, 4, 3, 0, 0, Math.PI * 2); g.fill();
      break;
    case 'archer':
      blob(g, gear === '#8a5a2b' ? '#2f8f47' : gear, () => { g.moveTo(34, 26); g.quadraticCurveTo(64, -8, 94, 26); g.lineTo(94, 20); g.quadraticCurveTo(64, 0, 34, 20); g.closePath(); });
      eyes(g, 62, 36, 6, 16);
      g.lineWidth = 5; g.strokeStyle = gear; g.beginPath(); g.arc(88, 72, 24, -1.3, 1.3); g.stroke();
      g.lineWidth = 1.5; g.strokeStyle = INK; g.beginPath(); g.moveTo(88 + Math.cos(-1.3) * 24, 72 + Math.sin(-1.3) * 24); g.lineTo(88 + Math.cos(1.3) * 24, 72 + Math.sin(1.3) * 24); g.stroke();
      break;
    case 'healer':
      eyes(g, 60, 36, 6, 16);
      g.lineWidth = 5; g.strokeStyle = '#8a5a2b'; g.beginPath(); g.moveTo(98, 40); g.lineTo(98, 112); g.stroke();
      blob(g, gear, () => g.arc(98, 36, 9, 0, Math.PI * 2));
      break;
    case 'champion':
      eyes(g, 62, 36, 6, 16);
      blob(g, '#ffd23a', () => { g.moveTo(40, 16); g.lineTo(44, 0); g.lineTo(54, 10); g.lineTo(64, -2); g.lineTo(74, 10); g.lineTo(84, 0); g.lineTo(88, 16); g.closePath(); });
      g.save(); g.translate(96, 70); g.rotate(-0.5 + swing * 0.3);
      blob(g, '#ffb14a', () => rrect(g, -6, -52, 12, 56, 4));
      blob(g, '#8a5a2b', () => rrect(g, -14, 0, 28, 8, 3));
      g.restore();
      break;
    case 'goblin':
      eyes(g, 58, 32, 7, 18);
      blob(g, head, () => { g.moveTo(84, 38); g.lineTo(100, 44); g.lineTo(84, 48); g.closePath(); }, 2);
      g.save(); g.translate(94, 74); g.rotate(-0.4 + swing);
      blob(g, gear, () => rrect(g, -5, -30, 10, 36, 5));
      g.restore();
      break;
    default: // noob
      eyes(g, 60, 34, 6, 16);
      g.lineWidth = 2.5; g.strokeStyle = INK; g.beginPath(); g.arc(70, 44, 7, 0.2, Math.PI - 0.2); g.stroke();
      g.save(); g.translate(94, 78); g.rotate(-0.6 + swing * 0.6);
      blob(g, '#dfe6ee', () => rrect(g, -4, -40, 8, 40, 3));
      blob(g, '#8a5a2b', () => rrect(g, -10, 0, 20, 6, 3));
      g.restore();
  }
  return cutout(c, 5);
}

/** Atlas layout: column = kind * 2 + frame, row 0 = normal, row 1 = hit flash. */
export function heroAtlas(): { tex: THREE.CanvasTexture; cols: number; rows: number } {
  const cols = SPRITE_KINDS.length * 2;
  const [c, g] = canvas(cols * 128, 256);
  SPRITE_KINDS.forEach((k, i) => {
    for (let f = 0; f < 2; f++) {
      const cell = drawHero(k, f);
      g.drawImage(cell, (i * 2 + f) * 128, 0);
      g.drawImage(flash(cell), (i * 2 + f) * 128, 128);
    }
  });
  return { tex: texture(c), cols, rows: 2 };
}

function drawBoss(id: BossId, frame: number): HTMLCanvasElement {
  const [c, g] = canvas(256, 256);
  if (id === 'dragon') {
    const up = frame === 0;
    blob(g, '#ffc93a', () => { g.moveTo(110, 110); g.lineTo(up ? 40 : 30, up ? 20 : 120); g.lineTo(up ? 80 : 60, up ? 60 : 140); g.lineTo(up ? 100 : 90, up ? 34 : 150); g.lineTo(140, 118); g.closePath(); });
    blob(g, '#e8392f', () => { g.moveTo(70, 180); g.quadraticCurveTo(10, 200, 18, 150); g.quadraticCurveTo(30, 190, 80, 160); g.closePath(); });
    for (const x of [96, 150]) blob(g, '#c42a22', () => rrect(g, x - 14, 200, 28, 34, 10));
    blob(g, '#e8392f', () => g.ellipse(122, 170, 68, 52, 0, 0, Math.PI * 2));
    blob(g, '#ffe07a', () => g.ellipse(140, 184, 38, 30, 0, 0, Math.PI * 2), 2);
    g.strokeStyle = '#e0a93a'; g.lineWidth = 2;
    for (const y of [168, 182, 196]) { g.beginPath(); g.moveTo(112, y); g.quadraticCurveTo(140, y + 6, 170, y); g.stroke(); }
    blob(g, '#ffc93a', () => { g.moveTo(164, 64); g.lineTo(150, 26); g.lineTo(178, 58); g.closePath(); });
    blob(g, '#ffc93a', () => { g.moveTo(190, 58); g.lineTo(196, 20); g.lineTo(206, 62); g.closePath(); });
    blob(g, '#e8392f', () => { g.ellipse(184, 94, 44, 40, 0, 0, Math.PI * 2); });
    blob(g, '#e8392f', () => rrect(g, 190, 88, 52, 34, 14));
    g.fillStyle = INK; g.beginPath(); g.ellipse(232, 98, 3, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
    for (const x of [204, 218, 230]) { g.beginPath(); g.moveTo(x, 122); g.lineTo(x + 5, 131); g.lineTo(x + 10, 122); g.fill(); }
    eyes(g, 180, 82, 11, 0, 1);
  } else if (id === 'slime') {
    blob(g, '#3ee07a', () => { g.moveTo(26, 236); g.bezierCurveTo(10, 120, 60, 58, 128, 58); g.bezierCurveTo(196, 58, 246, 120, 230, 236); g.quadraticCurveTo(128, 250, 26, 236); }, 4);
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(80, 110, 16, 28, -0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(20,120,60,0.35)'; g.beginPath(); g.ellipse(120, 200, 26, 18, 0, 0, Math.PI * 2); g.fill();
    blob(g, '#ffd23a', () => { g.moveTo(84, 70); g.lineTo(88, 22); g.lineTo(108, 46); g.lineTo(128, 14); g.lineTo(148, 46); g.lineTo(168, 22); g.lineTo(172, 70); g.closePath(); });
    for (const x of [100, 128, 156]) blob(g, '#ff3d7f', () => g.arc(x, 58, 6, 0, Math.PI * 2), 2);
    eyes(g, 112, 128, 18, 44, 1);
    blob(g, '#0d4a26', () => { g.moveTo(112, 168); g.quadraticCurveTo(142, 204, 176, 168); g.closePath(); });
    blob(g, '#ff6f91', () => g.ellipse(146, 184, 12, 7, 0, 0, Math.PI * 2), 2);
  } else {
    blob(g, '#9b4dff', () => { g.moveTo(96, 80); g.lineTo(30, 240); g.lineTo(190, 240); g.lineTo(150, 80); g.closePath(); });
    for (let i = 0; i < 4; i++) blob(g, '#e9e4d4', () => rrect(g, 90 - i * 2 + i * 4, 110 + i * 22, 76 - i * 6, 12, 5), 2.5);
    blob(g, '#e9e4d4', () => rrect(g, 120, 100, 14, 110, 5), 2.5);
    blob(g, '#e9e4d4', () => rrect(g, 76, 30, 100, 78, 26), 4);
    blob(g, '#e9e4d4', () => rrect(g, 98, 96, 56, 26, 8), 3);
    g.fillStyle = INK;
    for (const x of [106, 120, 134]) g.fillRect(x, 102, 4, 14);
    for (const x of [108, 148]) {
      blob(g, '#220033', () => g.ellipse(x, 66, 15, 17, 0, 0, Math.PI * 2), 2);
      g.fillStyle = '#e2b0ff'; g.beginPath(); g.arc(x + 3, 66, 6, 0, Math.PI * 2); g.fill();
    }
    blob(g, '#ffc93a', () => { g.moveTo(86, 36); g.lineTo(92, 6); g.lineTo(108, 26); g.lineTo(126, 0); g.lineTo(144, 26); g.lineTo(160, 6); g.lineTo(166, 36); g.closePath(); });
    g.lineWidth = 8; g.strokeStyle = '#5a3a22'; g.beginPath(); g.moveTo(214, 60); g.lineTo(214, 244); g.stroke();
    g.lineWidth = 2; g.strokeStyle = INK; g.strokeRect(210, 60, 8, 184);
    const glow = g.createRadialGradient(214, 46, 4, 214, 46, 30);
    glow.addColorStop(0, '#ffffff'); glow.addColorStop(0.4, '#c58cff'); glow.addColorStop(1, 'rgba(155,77,255,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(214, 46, 30, 0, Math.PI * 2); g.fill();
  }
  return cutout(c, 7);
}

/** Boss atlas: dragon wing-up, dragon wing-down, slime, bone lord. */
export function bossAtlas(): { tex: THREE.CanvasTexture; cols: number; rows: number; cell: Record<BossId, number[]> } {
  const [c, g] = canvas(1024, 512);
  const cells: [BossId, number][] = [['dragon', 0], ['dragon', 1], ['slime', 0], ['bonelord', 0]];
  cells.forEach(([id, f], i) => {
    const b = drawBoss(id, f);
    g.drawImage(b, i * 256, 0);
    g.drawImage(flash(b), i * 256, 256);
  });
  return { tex: texture(c), cols: 4, rows: 2, cell: { dragon: [0, 1], slime: [2], bonelord: [3] } };
}

export type Prop = 'tree' | 'pine' | 'bush' | 'rock' | 'flowers' | 'mushroom';
export const PROPS: Prop[] = ['tree', 'pine', 'bush', 'rock', 'flowers', 'mushroom'];

function drawProp(p: Prop): HTMLCanvasElement {
  const [c, g] = canvas(128, 128);
  switch (p) {
    case 'tree':
      blob(g, '#8a5a2b', () => rrect(g, 56, 70, 16, 52, 4));
      blob(g, '#43b54a', () => { g.arc(48, 62, 26, 0, Math.PI * 2); });
      blob(g, '#43b54a', () => { g.arc(82, 60, 26, 0, Math.PI * 2); });
      blob(g, '#55c95a', () => { g.arc(64, 40, 30, 0, Math.PI * 2); });
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(54, 30, 8, 0, Math.PI * 2); g.fill();
      break;
    case 'pine':
      blob(g, '#8a5a2b', () => rrect(g, 58, 96, 12, 26, 3));
      for (const [y, w] of [[98, 44], [72, 36], [46, 26]]) blob(g, '#2e9e62', () => { g.moveTo(64 - w, y); g.lineTo(64, y - 40); g.lineTo(64 + w, y); g.closePath(); });
      break;
    case 'bush':
      for (const [x, y, r] of [[40, 96, 20], [86, 96, 20], [64, 84, 26]]) blob(g, '#4fc25a', () => g.arc(x, y, r, 0, Math.PI * 2));
      for (const [x, y] of [[48, 88], [78, 80], [66, 100]]) { g.fillStyle = '#ff5a7a'; g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
      break;
    case 'rock':
      blob(g, '#a9b3c0', () => { g.moveTo(26, 118); g.lineTo(36, 78); g.lineTo(64, 62); g.lineTo(94, 72); g.lineTo(106, 118); g.closePath(); });
      g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(40, 84); g.lineTo(62, 70); g.lineTo(58, 86); g.fill();
      break;
    case 'flowers':
      for (const [x, col] of [[40, '#ffd23a'], [64, '#ff6fb0'], [88, '#ffffff']] as const) {
        g.lineWidth = 3; g.strokeStyle = '#2e9e62'; g.beginPath(); g.moveTo(x, 120); g.lineTo(x, 90); g.stroke();
        for (let a = 0; a < 5; a++) blob(g, col, () => g.arc(x + Math.cos(a * 1.26) * 7, 86 + Math.sin(a * 1.26) * 7, 5, 0, Math.PI * 2), 1.5);
        blob(g, '#ff9a1a', () => g.arc(x, 86, 4, 0, Math.PI * 2), 1.5);
      }
      break;
    case 'mushroom':
      blob(g, '#f4ead8', () => rrect(g, 52, 80, 24, 40, 8));
      blob(g, '#e8392f', () => { g.moveTo(24, 86); g.quadraticCurveTo(64, 24, 104, 86); g.closePath(); });
      for (const [x, y] of [[48, 70], [72, 60], [86, 76]]) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill(); }
      break;
  }
  return cutout(c, 5);
}

export function propAtlas(): { tex: THREE.CanvasTexture; cols: number; rows: number } {
  const [c, g] = canvas(PROPS.length * 128, 128);
  PROPS.forEach((p, i) => g.drawImage(drawProp(p), i * 128, 0));
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

function texture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * Instanced cutouts that stand up from the ground like cardboard standees.
 * Each instance picks its atlas cell through a per-instance UV offset.
 */
export class SpriteBatch {
  readonly mesh: THREE.InstancedMesh;
  private cells: THREE.InstancedBufferAttribute;
  private tmp = new THREE.Object3D();
  private n = 0;

  constructor(tex: THREE.Texture, private cols: number, private rows: number, cap: number, private tilt: number) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    this.cells = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2);
    this.cells.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aCell', this.cells);
    const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide });
    const size = `vec2(${(1 / cols).toFixed(6)}, ${(1 / rows).toFixed(6)})`;
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 aCell;')
        .replace('#include <uv_vertex>', `#include <uv_vertex>\nvMapUv = vMapUv * ${size} + aCell;`);
    };
    mat.customProgramCacheKey = () => `sprite-${cols}x${rows}`;
    this.mesh = new THREE.InstancedMesh(geo, mat, cap);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
  }

  begin(): void { this.n = 0; }

  push(x: number, y: number, z: number, w: number, h: number, col: number, row: number, flip: boolean, roll = 0): void {
    if (this.n >= this.cells.count) return;
    this.tmp.position.set(x, y, z);
    this.tmp.rotation.set(-this.tilt, 0, roll);
    this.tmp.scale.set(flip ? -w : w, h, 1);
    this.tmp.updateMatrix();
    this.mesh.setMatrixAt(this.n, this.tmp.matrix);
    this.cells.setXY(this.n, col / this.cols, 1 - (row + 1) / this.rows);
    this.n++;
  }

  end(): void {
    this.mesh.count = this.n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.cells.needsUpdate = true;
  }
}
