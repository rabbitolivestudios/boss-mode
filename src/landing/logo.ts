import { INK, blob, canvas, cutout, dot, shine, type G } from '../game/ink';

/**
 * The BOSS MODE wordmark and app icon, drawn with the game's own paper kit: ink outlines, a raised
 * letter edge like the title screen, a crown for the boss, and the white cut-paper border.
 * Rendered to images by scripts/render-landing-art.mjs; the site ships the images, not this code.
 */

const GOLD = ['#fff07a', '#ffc21a', '#ff9d00'];

function crown(g: G, x: number, y: number, w: number, rot: number): void {
  const h = w * 0.62;
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  const grad = g.createLinearGradient(0, -h, 0, h * 0.4);
  grad.addColorStop(0, GOLD[0]); grad.addColorStop(0.6, GOLD[1]); grad.addColorStop(1, GOLD[2]);
  blob(g, grad, () => {
    g.moveTo(-w / 2, h * 0.35);
    g.lineTo(-w / 2, -h * 0.35);
    g.lineTo(-w * 0.27, -h * 0.02);
    g.lineTo(0, -h * 0.62);
    g.lineTo(w * 0.27, -h * 0.02);
    g.lineTo(w / 2, -h * 0.35);
    g.lineTo(w / 2, h * 0.35);
    g.closePath();
  }, w * 0.055);
  blob(g, GOLD[2], () => g.rect(-w / 2, h * 0.14, w, h * 0.21), w * 0.04);
  for (const [gx, gy, c] of [[-w / 2, -h * 0.35, '#ff4fa3'], [0, -h * 0.62, '#29e0ff'], [w / 2, -h * 0.35, '#7dffb0']] as const) {
    dot(g, gx, gy, w * 0.075, INK);
    dot(g, gx, gy, w * 0.052, c);
  }
  for (const [gx, c] of [[-w * 0.25, '#ff4fa3'], [0, '#29e0ff'], [w * 0.25, '#ff4fa3']] as const) {
    dot(g, gx, h * 0.245, w * 0.05, INK);
    dot(g, gx, h * 0.245, w * 0.033, c);
  }
  shine(g, -w * 0.18, -h * 0.12, w * 0.12, h * 0.07, -0.4, 0.45);
  g.restore();
}

/** Letters with an ink outline, a coloured raised edge below, and a highlight on the letter faces only. */
function word(g: G, text: string, x: number, y: number, size: number, fill: string | CanvasGradient, edge: string, depth: number): void {
  const setup = (ctx: G) => { ctx.font = `${size}px "Lilita One"`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; };
  setup(g);
  const ink = size * 0.11;
  // Ink first for the whole extrusion, then the edge colour inside it, so the side reads as one coloured band.
  g.lineWidth = ink; g.strokeStyle = INK;
  for (let d = depth; d >= 0; d -= 2) g.strokeText(text, x, y + d);
  g.fillStyle = edge;
  for (let d = depth; d > 0; d -= 2) g.fillText(text, x, y + d);
  g.fillStyle = fill; g.fillText(text, x, y);
  const [hl, hg] = canvas(g.canvas.width, g.canvas.height);
  setup(hg);
  hg.fillStyle = '#fff'; hg.fillText(text, x, y);
  hg.globalCompositeOperation = 'source-in';
  const band = hg.createLinearGradient(0, y - size * 0.75, 0, y - size * 0.3);
  band.addColorStop(0, 'rgba(255,255,255,0.55)'); band.addColorStop(1, 'rgba(255,255,255,0)');
  hg.fillStyle = band; hg.fillRect(0, 0, hl.width, hl.height);
  g.drawImage(hl, 0, 0);
}

export async function drawLogo(width = 1600): Promise<HTMLCanvasElement> {
  await document.fonts.load(`200px "Lilita One"`);
  const k = width / 1600;
  const [c, g] = canvas(width, Math.round(900 * k));
  g.scale(k, k);
  g.translate(800, 470);
  g.rotate(-0.05);
  // BOSS is drawn onto its own layer so the highlight only lands on its letters.
  const [bossLayer, bg] = canvas(1600, 900);
  const grad = bg.createLinearGradient(0, 70, 0, 400);
  grad.addColorStop(0, GOLD[0]); grad.addColorStop(0.55, GOLD[1]); grad.addColorStop(1, GOLD[2]);
  word(bg, 'BOSS', 800, 400, 400, grad, '#b8330b', 26);
  const [modeLayer, mg] = canvas(1600, 900);
  word(mg, 'MODE', 800, 640, 250, '#ffffff', '#ff3d8b', 18);
  g.drawImage(bossLayer, -800, -470);
  g.drawImage(modeLayer, -800, -470);
  crown(g, -440, -330, 230, -0.32);
  return cutout(c, 18 * k);
}

/**
 * The app icon: the crown on the game's night purple. Home-screen icons must be full squares, since
 * iOS and Android cut their own corners and turn transparent corners black; tab icons get rounded ones.
 */
export function drawIcon(size = 512, rounded = false): HTMLCanvasElement {
  const [c, g] = canvas(size, size);
  const bg = g.createRadialGradient(size / 2, size * 0.35, size * 0.1, size / 2, size / 2, size * 0.72);
  bg.addColorStop(0, '#6a3fd0'); bg.addColorStop(1, '#1b1033');
  g.fillStyle = bg;
  g.beginPath();
  if (rounded) g.roundRect(0, 0, size, size, size * 0.22);
  else g.rect(0, 0, size, size);
  g.fill();
  // Inside the central 80% so the crown survives Android's circular mask.
  crown(g, size / 2, size * 0.57, size * 0.62, -0.12);
  return c;
}
