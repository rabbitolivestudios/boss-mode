import type { BossId } from './config';
import { INK, blob, canvas, cutout, dot, line, pack, shade, shine, type G } from './ink';

// The three bosses as big paper puppets. Each is cut into pieces (wing, tail, legs, body, head...) that
// the renderer swings about their joints; faces have idle, blink and "ouch" versions.

const CELL = 320;
const S = CELL / 256;
/** Shrink inside the cell so flapping and wagging pieces never clip. */
const FIT = 0.9;

export type Face = 'idle' | 'blink' | 'hurt';
export const FACES: Face[] = ['idle', 'blink', 'hurt'];

type Parent = 'root' | 'body';

export interface BossPart {
  id: string;
  parent: Parent;
  /** Joint in 256px design space. */
  joint: [number, number];
  /** Parts with a face get one cell per expression. */
  face?: boolean;
  draw(g: G, face: Face): void;
}

function bossEye(g: G, x: number, y: number, r: number, face: Face, pupil = INK, look = 1): void {
  if (face === 'blink') { line(g, 4, INK, [[x - r, y], [x, y + r * 0.35], [x + r, y]]); return; }
  if (face === 'hurt') { line(g, 4, INK, [[x - r * 0.8, y - r * 0.6], [x + r * 0.5, y], [x - r * 0.8, y + r * 0.6]]); return; }
  blob(g, '#fff', () => g.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2), 3);
  dot(g, x + look * r * 0.3, y + r * 0.1, r * 0.52, pupil);
  dot(g, x + look * r * 0.3 + r * 0.2, y - r * 0.2, r * 0.18, '#fff');
}

const DRAGON: BossPart[] = [
  {
    id: 'wing', parent: 'body', joint: [112, 112],
    draw: (g) => {
      const wing = () => { g.moveTo(112, 108); g.quadraticCurveTo(70, 30, 36, 14); g.quadraticCurveTo(48, 50, 40, 58); g.quadraticCurveTo(62, 60, 64, 76); g.quadraticCurveTo(84, 74, 92, 96); g.closePath(); };
      blob(g, '#ffb52e', wing, 4);
      shade(g, wing, 20, 110, 0.2);
      line(g, 3, 'rgba(160,90,0,0.5)', [[108, 104], [52, 34]]);
      line(g, 3, 'rgba(160,90,0,0.5)', [[108, 104], [66, 70]]);
    },
  },
  {
    id: 'tail', parent: 'body', joint: [80, 176],
    draw: (g) => {
      const tail = () => { g.moveTo(74, 184); g.quadraticCurveTo(20, 206, 14, 158); g.quadraticCurveTo(8, 140, 22, 132); g.quadraticCurveTo(24, 176, 84, 164); g.closePath(); };
      blob(g, '#e8392f', tail, 4);
      blob(g, '#ffd23a', () => { g.moveTo(22, 132); g.lineTo(6, 120); g.lineTo(28, 126); g.closePath(); }, 3);
    },
  },
  { id: 'legB', parent: 'root', joint: [99, 204], draw: (g) => { g.filter = 'brightness(0.85)'; blob(g, '#c42a22', () => g.roundRect(84, 196, 30, 40, 13), 4); } },
  {
    id: 'body', parent: 'root', joint: [124, 214],
    draw: (g) => {
      for (const x of [86, 110, 134]) blob(g, '#ffd23a', () => { g.moveTo(x, 118); g.lineTo(x + 8, 102); g.lineTo(x + 16, 116); g.closePath(); }, 3);
      const body = () => g.ellipse(124, 170, 70, 56, 0, 0, Math.PI * 2);
      blob(g, '#e8392f', body, 4);
      shade(g, body, 150, 226, 0.22);
      shine(g, 96, 138, 20, 10);
      blob(g, '#ffe07a', () => g.ellipse(146, 182, 38, 32, 0, 0, Math.PI * 2), 3);
      for (const y of [166, 180, 194]) line(g, 2.5, '#e0a93a', [[116, y], [140, y + 5], [174, y]]);
    },
  },
  {
    id: 'legF', parent: 'root', joint: [161, 204],
    draw: (g) => {
      blob(g, '#e8392f', () => g.roundRect(146, 198, 30, 38, 13), 4);
      for (const x of [150, 160, 170]) dot(g, x, 234, 3.5, '#fff');
    },
  },
  {
    id: 'head', parent: 'body', joint: [160, 124], face: true,
    draw: (g, face) => {
      blob(g, '#ffd23a', () => { g.moveTo(166, 66); g.quadraticCurveTo(150, 36, 140, 22); g.quadraticCurveTo(164, 34, 180, 60); g.closePath(); }, 3.5);
      blob(g, '#ffd23a', () => { g.moveTo(194, 58); g.quadraticCurveTo(196, 30, 208, 16); g.quadraticCurveTo(210, 40, 208, 62); g.closePath(); }, 3.5);
      blob(g, '#e8392f', () => g.roundRect(150, 104, 30, 34, 12), 4);
      const head = () => g.ellipse(186, 94, 46, 42, 0, 0, Math.PI * 2);
      blob(g, '#e8392f', head, 4);
      blob(g, '#e8392f', () => g.roundRect(192, 86, 56, 38, 17), 4);
      shade(g, head, 90, 136, 0.18);
      shine(g, 168, 68, 14, 7);
      dot(g, 238, 98, 3.5, INK);
      if (face === 'hurt') blob(g, '#6a1f2f', () => g.ellipse(226, 124, 16, 10, 0, 0, Math.PI * 2), 3);
      else {
        line(g, 3.5, INK, [[204, 118], [222, 122], [244, 116]]);
        g.fillStyle = '#fff';
        for (const x of [210, 224]) { g.beginPath(); g.moveTo(x, 119); g.lineTo(x + 5, 128); g.lineTo(x + 10, 120); g.fill(); }
      }
      g.fillStyle = 'rgba(255,110,130,0.4)'; g.beginPath(); g.ellipse(196, 112, 10, 6, 0, 0, Math.PI * 2); g.fill();
      bossEye(g, 184, 84, 15, face);
      line(g, 4, INK, [[166, 64], [196, 70]]);
    },
  },
];

const SLIME: BossPart[] = [
  {
    id: 'body', parent: 'root', joint: [128, 244],
    draw: (g) => {
      const body = () => { g.moveTo(22, 236); g.bezierCurveTo(6, 118, 56, 58, 128, 58); g.bezierCurveTo(200, 58, 250, 118, 234, 236); g.quadraticCurveTo(128, 252, 22, 236); };
      const grad = g.createLinearGradient(0, 60, 0, 240);
      grad.addColorStop(0, '#7af0a0'); grad.addColorStop(1, '#27c060');
      blob(g, grad, body, 5);
      dot(g, 120, 206, 24, 'rgba(20,120,60,0.35)');
      dot(g, 172, 220, 12, 'rgba(20,120,60,0.3)');
      shine(g, 70, 116, 16, 34, -0.5, 0.5);
      shine(g, 92, 84, 7, 5, -0.5, 0.6);
      for (const [x, y] of [[40, 238], [214, 240]]) blob(g, '#27c060', () => g.ellipse(x, y, 12, 8, 0, 0, Math.PI * 2), 3);
    },
  },
  {
    id: 'face', parent: 'body', joint: [135, 160], face: true,
    draw: (g, face) => {
      bossEye(g, 110, 136, 20, face);
      bossEye(g, 160, 136, 20, face);
      if (face === 'hurt') blob(g, '#0d4a26', () => g.ellipse(136, 186, 18, 14, 0, 0, Math.PI * 2), 3.5);
      else {
        blob(g, '#0d4a26', () => { g.moveTo(106, 176); g.quadraticCurveTo(136, 214, 170, 176); g.closePath(); }, 3.5);
        blob(g, '#ff6f91', () => g.ellipse(142, 192, 13, 7, 0, 0, Math.PI * 2), 2.5);
      }
      g.fillStyle = 'rgba(255,110,130,0.4)';
      for (const x of [88, 184]) { g.beginPath(); g.ellipse(x, 168, 12, 7, 0, 0, Math.PI * 2); g.fill(); }
    },
  },
  {
    id: 'crown', parent: 'body', joint: [128, 70],
    draw: (g) => {
      const crown = () => { g.moveTo(82, 70); g.lineTo(86, 20); g.lineTo(106, 44); g.lineTo(128, 10); g.lineTo(150, 44); g.lineTo(170, 20); g.lineTo(174, 70); g.closePath(); };
      blob(g, '#ffd23a', crown, 4);
      shade(g, crown, 50, 70, 0.2);
      shine(g, 104, 50, 5, 10, 0);
      for (const [x, c] of [[102, '#ff3d7f'], [128, '#29e0ff'], [154, '#ff3d7f']] as const) blob(g, c, () => g.arc(x, 60, 7, 0, Math.PI * 2), 2.5);
    },
  },
];

const BONELORD: BossPart[] = [
  {
    id: 'cape', parent: 'body', joint: [126, 86],
    draw: (g) => {
      const cape = () => { g.moveTo(92, 82); g.quadraticCurveTo(50, 170, 26, 244); g.lineTo(196, 244); g.quadraticCurveTo(170, 160, 160, 82); g.closePath(); };
      blob(g, '#9b4dff', cape, 4);
      shade(g, cape, 120, 244, 0.3);
      blob(g, '#6a2cc0', () => { g.moveTo(92, 82); g.quadraticCurveTo(80, 96, 70, 102); g.lineTo(182, 102); g.quadraticCurveTo(172, 96, 160, 82); g.closePath(); }, 3);
    },
  },
  {
    id: 'body', parent: 'root', joint: [126, 226],
    draw: (g) => {
      blob(g, '#e9e4d4', () => g.roundRect(119, 100, 14, 112, 6), 3);
      for (let i = 0; i < 4; i++) { const w = 78 - i * 8, y = 112 + i * 22; blob(g, '#e9e4d4', () => g.roundRect(126 - w / 2, y, w, 12, 6), 3); }
      blob(g, '#e9e4d4', () => g.ellipse(126, 216, 30, 14, 0, 0, Math.PI * 2), 3);
      blob(g, '#e9e4d4', () => g.arc(206, 150, 10, 0, Math.PI * 2), 3);
    },
  },
  {
    id: 'skull', parent: 'body', joint: [126, 110], face: true,
    draw: (g, face) => {
      const skull = () => g.roundRect(72, 22, 108, 88, 40);
      blob(g, '#f4efe0', skull, 5);
      shade(g, skull, 70, 110, 0.18);
      shine(g, 100, 40, 16, 8);
      blob(g, '#f4efe0', () => g.roundRect(96, 94, 64, 30, 10), 4);
      for (const x of [108, 122, 136, 150]) line(g, 3, INK, [[x, 98], [x, 118]]);
      for (const x of [104, 148]) {
        if (face === 'blink') { line(g, 5, INK, [[x - 14, 66], [x + 14, 66]]); continue; }
        blob(g, '#220033', () => g.ellipse(x, 66, 17, face === 'hurt' ? 12 : 19, 0, 0, Math.PI * 2), 3);
        g.save(); g.shadowColor = '#c58cff'; g.shadowBlur = 14;
        dot(g, x + 4, 66, face === 'hurt' ? 4 : 7, '#e2b0ff');
        g.restore();
      }
      blob(g, '#220033', () => { g.moveTo(126, 80); g.lineTo(120, 92); g.lineTo(132, 92); g.closePath(); }, 2);
      const crown = () => { g.moveTo(84, 34); g.lineTo(90, 0); g.lineTo(106, 22); g.lineTo(126, -6); g.lineTo(146, 22); g.lineTo(162, 0); g.lineTo(168, 34); g.closePath(); };
      blob(g, '#ffc93a', crown, 4);
      shine(g, 104, 16, 4, 8, 0);
      dot(g, 126, 22, 7, '#ff3d7f');
    },
  },
  {
    id: 'staff', parent: 'body', joint: [212, 156],
    draw: (g) => {
      line(g, 11, INK, [[214, 60], [214, 246]]);
      line(g, 7, '#6b4424', [[214, 60], [214, 246]]);
      g.save(); g.shadowColor = '#c58cff'; g.shadowBlur = 30;
      const orb = g.createRadialGradient(212, 42, 4, 214, 46, 26);
      orb.addColorStop(0, '#ffffff'); orb.addColorStop(0.45, '#d9a8ff'); orb.addColorStop(1, '#8a3cff');
      blob(g, orb, () => g.arc(214, 46, 22, 0, Math.PI * 2), 3.5);
      g.restore();
    },
  },
];

export const BOSS_PARTS: Record<BossId, BossPart[]> = { dragon: DRAGON, slime: SLIME, bonelord: BONELORD };

function piece(part: BossPart, face: Face): HTMLCanvasElement {
  const [c, g] = canvas(CELL, CELL);
  g.scale(S, S);
  g.translate(128, 256);
  g.scale(FIT, FIT);
  g.translate(-128, -256);
  part.draw(g, face);
  return cutout(c, 7 * S);
}

/** Joint in unit-quad space (x -0.5..0.5, y 0..1 up), matching how pieces sit in their cells. */
export function bossUnit(px: number, py: number): [number, number] {
  return [((px - 128) * FIT) / 256, ((256 - py) * FIT) / 256];
}

export interface BossAtlas {
  tex: ReturnType<typeof pack>['tex'];
  cols: number;
  rows: number;
  /** cell[boss][part] = cell index per face for face parts, or a single-entry list. */
  cell: Record<BossId, number[][]>;
}

export function bossAtlas(): BossAtlas {
  const images: HTMLCanvasElement[] = [];
  const cell = {} as Record<BossId, number[][]>;
  for (const id of Object.keys(BOSS_PARTS) as BossId[]) {
    cell[id] = BOSS_PARTS[id].map((part) => (part.face ? FACES : (['idle'] as Face[])).map((f) => { images.push(piece(part, f)); return images.length - 1; }));
  }
  return { ...pack(images, CELL, 6), cell };
}

/** The whole boss in its idle pose, for menus. */
export function bossPortrait(id: BossId): HTMLCanvasElement {
  const [c, g] = canvas(CELL, CELL);
  for (const part of BOSS_PARTS[id]) g.drawImage(piece(part, 'idle'), 0, 0);
  return c;
}

export function bossSheet(): HTMLCanvasElement {
  const ids = Object.keys(BOSS_PARTS) as BossId[];
  const [c, g] = canvas(CELL * FACES.length, CELL * ids.length);
  g.fillStyle = '#93cf63';
  g.fillRect(0, 0, c.width, c.height);
  ids.forEach((id, r) => FACES.forEach((f, col) => {
    for (const part of BOSS_PARTS[id]) g.drawImage(piece(part, part.face ? f : 'idle'), col * CELL, r * CELL);
  }));
  return c;
}
