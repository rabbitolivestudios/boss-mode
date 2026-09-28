import * as THREE from 'three';

// Shared drawing kit for the paper look: ink-lined flat shapes, cut out with a white paper border.

export const INK = '#2a1f3d';
export type G = CanvasRenderingContext2D;

export const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;

export function canvas(w: number, h: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable');
  return [c, g];
}

function silhouette(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const [sil, sg] = canvas(src.width, src.height);
  sg.drawImage(src, 0, 0);
  sg.globalCompositeOperation = 'source-in';
  sg.fillStyle = color;
  sg.fillRect(0, 0, sil.width, sil.height);
  return sil;
}

/** Adds the paper-cutout border and a soft drop shadow around whatever was drawn. */
export function cutout(src: HTMLCanvasElement, border: number): HTMLCanvasElement {
  const white = silhouette(src, '#ffffff');
  const shadow = silhouette(src, '#000000');
  const [out, g] = canvas(src.width, src.height);
  g.globalAlpha = 0.2;
  for (let a = 0; a < 12; a++) g.drawImage(shadow, Math.cos(a / 12 * Math.PI * 2) * border + border * 0.6, Math.sin(a / 12 * Math.PI * 2) * border + border);
  g.globalAlpha = 1;
  for (let r = border; r > 0; r -= border / 3) {
    for (let a = 0; a < 20; a++) g.drawImage(white, Math.cos(a / 20 * Math.PI * 2) * r, Math.sin(a / 20 * Math.PI * 2) * r);
  }
  g.drawImage(src, 0, 0);
  return out;
}

/** Fills and ink-strokes a path. */
export function blob(g: G, fill: string | CanvasGradient, draw: () => void, line = 3): void {
  g.beginPath();
  draw();
  g.fillStyle = fill;
  g.fill();
  if (line > 0) {
    g.lineWidth = line;
    g.strokeStyle = INK;
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.stroke();
  }
}

export function line(g: G, width: number, color: string, pts: [number, number][]): void {
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.lineWidth = width;
  g.strokeStyle = color;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
}

export function dot(g: G, x: number, y: number, r: number, color: string): void {
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = color;
  g.fill();
}

/** A soft highlight so flat paper shapes still read as round. */
export function shine(g: G, x: number, y: number, rx: number, ry: number, rot = -0.5, alpha = 0.35): void {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  g.fillStyle = `rgba(255,255,255,${alpha})`;
  g.fill();
}

/** Shades the lower part of whatever shape was just filled, clipped to that shape. */
export function shade(g: G, draw: () => void, fromY: number, toY: number, alpha = 0.18): void {
  g.save();
  g.beginPath();
  draw();
  g.clip();
  const grad = g.createLinearGradient(0, fromY, 0, toY);
  grad.addColorStop(0, 'rgba(40,20,60,0)');
  grad.addColorStop(1, `rgba(40,20,60,${alpha})`);
  g.fillStyle = grad;
  g.fillRect(0, fromY, 2000, toY - fromY);
  g.restore();
}

export function texture(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  return t;
}

/** Packs equal-size cells into a grid texture; returns each cell's grid position by index. */
export function pack(cells: HTMLCanvasElement[], size: number, cols: number): { tex: THREE.CanvasTexture; cols: number; rows: number } {
  const rows = Math.ceil(cells.length / cols);
  const [c, g] = canvas(cols * size, rows * size);
  cells.forEach((cell, i) => g.drawImage(cell, (i % cols) * size, Math.floor(i / cols) * size, size, size));
  return { tex: texture(c), cols, rows };
}
