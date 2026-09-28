import { INK, blob, canvas, cutout, dot, line, pack, shade, shine, type G } from './ink';
import type { HeroKind } from './config';

// The hero cast as paper puppets. Everyone shares one chibi body (big head, short limbs) cut into separate
// paper pieces - cape, arms, legs, body, head - each with its own white border, so the renderer can
// swing them around their joints like a split-pin puppet. Personality comes from outfit, face and gear.

export const CELL = 160;
const S = CELL / 128; // characters are designed on a 128px grid, rendered at CELL
/** The design is shrunk slightly inside each cell so plumes, bows and swinging weapons never clip. */
const FIT = 0.86;

export type CastId =
  | 'noob' | 'noob2' | 'archer' | 'archer2' | 'knight' | 'knight2' | 'sweat' | 'sweat2' | 'healer' | 'healer2'
  | 'goblin' | 'tryhard' | 'clutch' | 'chosen';

export const CAST: CastId[] = ['noob', 'noob2', 'archer', 'archer2', 'knight', 'knight2', 'sweat', 'sweat2', 'healer', 'healer2', 'goblin', 'tryhard', 'clutch', 'chosen'];

/** Which drawing a hero uses: two outfits per class for crowd variety, and a unique look per champion. */
export function castFor(kind: HeroKind | 'goblin', variant: number, championIndex = 0): CastId {
  if (kind === 'champion') return (['tryhard', 'clutch', 'chosen'] as const)[championIndex] ?? 'tryhard';
  if (kind === 'goblin') return 'goblin';
  return (variant ? `${kind}2` : kind) as CastId;
}

/** Puppet pieces in back-to-front draw order. */
export const PARTS = ['back', 'armB', 'legB', 'body', 'legF', 'head', 'armF'] as const;
export type PartId = typeof PARTS[number];

/** Pieces are drawn in a neutral pose; animation rotates them about these joints. */
interface Pose { leg: number }
const NEUTRAL: Pose = { leg: 0 };

interface Look {
  skin: string;
  shirt: string;
  pants: string;
  shoes: string;
  headR?: number;
  robe?: string;
  short?: boolean;
  back?(g: G, p: Pose): void;
  torso?(g: G, p: Pose): void;
  head?(g: G, p: Pose): void;
  face?(g: G, p: Pose): void;
  hat?(g: G, p: Pose): void;
  hand?(g: G, p: Pose): void;
}

function limb(g: G, x: number, y: number, angle: number, len: number, w: number, fill: string, end?: () => void): void {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  blob(g, fill, () => g.roundRect(-w / 2, -2, w, len, w / 2), 2.5);
  if (end) { g.translate(0, len); end(); }
  g.restore();
}

function shoe(g: G, color: string): void {
  blob(g, color, () => g.ellipse(3, 0, 9, 5.5, 0, 0, Math.PI * 2), 2.5);
}

const SHOULDER_Y = 66;
const hipY = (look: Look) => 92 - (look.short ? 4 : 0);
const shortBy = (look: Look) => (look.short ? 8 : 0);

/** Design-space joint positions per piece (before the FIT shrink and the goblin's shorter frame). */
function joints(look: Look): Record<PartId, [number, number]> {
  return { back: [60, 62], armB: [52, SHOULDER_Y], legB: [58, hipY(look)], body: [64, 96], legF: [70, hipY(look)], head: [64, 58], armF: [78, SHOULDER_Y] };
}

/** Where a design-space point lands in the unit quad the renderer uses (x -0.5..0.5 centred, y 0..1 up). */
export function unitPoint(px: number, py: number, short = 0): [number, number] {
  const y = py + short;
  return [((px - 64) * FIT) / 128, ((128 - y) * FIT) / 128];
}

function drawPart(look: Look, part: PartId, g: G): boolean {
  const p = NEUTRAL;
  const hr = look.headR ?? 25;
  switch (part) {
    case 'back':
      if (!look.back) return false;
      look.back(g, p);
      return true;
    case 'armB':
      // Back limbs are a shade darker so the figure reads as having depth.
      g.filter = 'brightness(0.82)';
      limb(g, 52, SHOULDER_Y, 0.2, 21, 10, look.shirt, () => dot(g, 0, 0, 5.5, look.skin));
      return true;
    case 'legB':
      if (look.robe) return false;
      g.filter = 'brightness(0.82)';
      limb(g, 58, hipY(look), 0.12, 24, 12, look.pants, () => shoe(g, look.shoes));
      return true;
    case 'legF':
      if (look.robe) return false;
      limb(g, 70, hipY(look), -0.12, 24, 12, look.pants, () => shoe(g, look.shoes));
      return true;
    case 'body':
      if (look.robe) {
        const robe = () => { g.moveTo(46, 62); g.lineTo(84, 62); g.quadraticCurveTo(90, 100, 92, 118); g.lineTo(38, 118); g.quadraticCurveTo(40, 100, 46, 62); };
        for (const x of [56, 74]) { g.save(); g.translate(x, 118); shoe(g, look.shoes); g.restore(); }
        blob(g, look.robe, robe);
        shade(g, robe, 80, 118);
      } else {
        const torso = () => g.roundRect(45, 58, 38, 38, 11);
        blob(g, look.shirt, torso);
        shade(g, torso, 70, 96);
      }
      look.torso?.(g, p);
      return true;
    case 'head': {
      const head = () => g.arc(64, 36, hr, 0, Math.PI * 2);
      if (look.head) look.head(g, p);
      else {
        blob(g, look.skin, () => g.arc(47, 40, 6, 0, Math.PI * 2), 2.5);
        blob(g, look.skin, head);
        shade(g, head, 38, 36 + hr, 0.15);
        shine(g, 54, 22, 9, 5);
      }
      look.face?.(g, p);
      look.hat?.(g, p);
      return true;
    }
    case 'armF':
      limb(g, 78, SHOULDER_Y, -0.3, 21, 10, look.shirt, () => {
        look.hand?.(g, p);
        blob(g, look.skin, () => g.arc(0, 0, 5.5, 0, Math.PI * 2), 2.5);
      });
      return true;
  }
}

/** One puppet piece as its own paper cutout, or null when this character has no such piece. */
function piece(look: Look, part: PartId): HTMLCanvasElement | null {
  const [c, g] = canvas(CELL, CELL);
  g.scale(S, S);
  g.translate(64, 128);
  g.scale(FIT, FIT);
  g.translate(-64, -128 + shortBy(look));
  if (!drawPart(look, part, g)) return null;
  return cutout(c, 4 * S);
}

/** The whole character in its neutral pose, for menus and review sheets. */
function portrait(look: Look): HTMLCanvasElement {
  const [c, g] = canvas(CELL, CELL);
  for (const part of PARTS) { const pc = piece(look, part); if (pc) g.drawImage(pc, 0, 0); }
  return c;
}

// ---------- Faces ----------

function eyes(g: G, x: number, y: number, opts: { size?: number; gap?: number; look?: number; lid?: number; color?: string } = {}): void {
  const { size = 6, gap = 13, look = 1.2, lid = 0, color = INK } = opts;
  for (const dx of [0, gap]) {
    blob(g, '#fff', () => g.ellipse(x + dx, y, size * 0.78, size, 0, 0, Math.PI * 2), 2);
    dot(g, x + dx + look * 1.6, y + 0.8, size * 0.5, color);
    dot(g, x + dx + look * 1.6 + 1.3, y - 1.4, size * 0.16, '#fff');
    if (lid) { g.fillStyle = INK; g.fillRect(x + dx - size, y - size - 1, size * 2, lid); }
  }
}

function brows(g: G, x: number, y: number, gap: number, angry: number): void {
  line(g, 3, INK, [[x - 5, y - angry], [x + 5, y + angry]]);
  line(g, 3, INK, [[x + gap - 5, y + angry], [x + gap + 5, y - angry]]);
}

function grin(g: G, x: number, y: number, w = 14, open = 6): void {
  blob(g, '#6a1f2f', () => { g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y + open * 2, x + w / 2, y - 1); g.closePath(); }, 2.2);
  g.save(); g.beginPath(); g.moveTo(x - w / 2, y); g.quadraticCurveTo(x, y + open * 2, x + w / 2, y - 1); g.closePath(); g.clip();
  g.fillStyle = '#fff'; g.fillRect(x - w / 2, y - 2, w, 3.5);
  g.restore();
}

function blush(g: G, x: number, y: number): void {
  g.fillStyle = 'rgba(255,110,130,0.35)';
  g.beginPath(); g.ellipse(x, y, 5, 3, 0, 0, Math.PI * 2); g.fill();
}

// ---------- Gear ----------

function sword(g: G, blade: string, len = 34, glow?: string): void {
  g.save();
  g.rotate(-2.2);
  if (glow) { g.shadowColor = glow; g.shadowBlur = 12; }
  blob(g, blade, () => { g.moveTo(-3.5, 6); g.lineTo(-3.5, 6 + len); g.lineTo(0, 12 + len); g.lineTo(3.5, 6 + len); g.lineTo(3.5, 6); g.closePath(); }, 2.2);
  g.shadowBlur = 0;
  line(g, 1.5, 'rgba(255,255,255,0.7)', [[-1, 10], [-1, 4 + len]]);
  blob(g, '#8a5a2b', () => g.roundRect(-9, 2, 18, 5, 2), 2);
  blob(g, '#6b4424', () => g.roundRect(-2.5, -6, 5, 9, 2), 2);
  g.restore();
}

const noobLook = (shirt: string, pants: string): Look => ({
  skin: '#ffd23a', shirt, pants, shoes: '#3b3f58',
  face: (g) => {
    eyes(g, 66, 34, { size: 7, gap: 14, look: 1 });
    blush(g, 62, 46);
    grin(g, 76, 45, 12, 5);
  },
  hand: (g) => sword(g, '#dfe6ee', 30),
});

const archerLook = (tunic: string, hood: string): Look => ({
  skin: '#ffcfa6', shirt: tunic, pants: '#7a5230', shoes: '#5a3a22',
  back: (g) => {
    g.save(); g.translate(46, 62); g.rotate(-0.35);
    blob(g, '#8a5a2b', () => g.roundRect(-7, -4, 14, 34, 5));
    for (const dx of [-4, 0, 4]) { line(g, 2, '#e9e4d4', [[dx, -4], [dx, -12]]); blob(g, '#d8263a', () => { g.moveTo(dx - 3, -10); g.lineTo(dx, -18); g.lineTo(dx + 3, -10); g.closePath(); }, 1.5); }
    g.restore();
  },
  torso: (g) => { blob(g, '#6b4424', () => g.roundRect(45, 84, 38, 6, 2), 2); dot(g, 66, 87, 2.5, '#ffd23a'); },
  face: (g) => {
    eyes(g, 67, 36, { size: 6, gap: 13, look: 1.6, lid: 3 });
    brows(g, 67, 27, 13, 1.5);
    line(g, 2.5, INK, [[72, 47], [80, 46], [84, 43]]);
  },
  hat: (g) => {
    const hoodShape = () => { g.moveTo(38, 44); g.quadraticCurveTo(34, 8, 66, 9); g.quadraticCurveTo(90, 10, 90, 26); g.lineTo(80, 22); g.quadraticCurveTo(60, 18, 50, 30); g.quadraticCurveTo(46, 44, 52, 58); g.lineTo(40, 60); g.closePath(); };
    blob(g, hood, hoodShape);
    shine(g, 50, 16, 8, 4);
    blob(g, '#d8263a', () => { g.moveTo(44, 16); g.quadraticCurveTo(24, 0, 20, -6); g.quadraticCurveTo(34, 2, 48, 12); g.closePath(); }, 2);
  },
  hand: (g) => {
    g.save(); g.rotate(-0.25);
    line(g, 5, '#8a5a2b', [[6, -26], [14, -10], [16, 6], [14, 22], [6, 36]]);
    line(g, 1.4, INK, [[6, -26], [6, 36]]);
    g.restore();
  },
});

const knightLook = (metal: string, plume: string, shield: string): Look => ({
  skin: '#ffcfa6', shirt: metal, pants: '#5a6275', shoes: '#4a4f63',
  torso: (g) => {
    line(g, 2, 'rgba(42,31,61,0.5)', [[48, 72], [80, 72]]);
    blob(g, shield, () => g.roundRect(58, 60, 12, 10, 3), 2);
  },
  head: (g) => {
    const helm = () => { g.moveTo(40, 40); g.quadraticCurveTo(40, 10, 64, 10); g.quadraticCurveTo(90, 10, 90, 40); g.lineTo(90, 56); g.lineTo(40, 56); g.closePath(); };
    blob(g, metal, helm);
    shade(g, helm, 30, 56, 0.25);
    shine(g, 52, 20, 9, 4);
    blob(g, '#2a1f3d', () => g.roundRect(60, 30, 30, 9, 3), 0);
    dot(g, 72, 34.5, 2.6, '#bfefff');
    dot(g, 83, 34.5, 2.6, '#bfefff');
    for (const x of [58, 66, 74]) line(g, 1.5, 'rgba(42,31,61,0.5)', [[x, 44], [x + 1, 52]]);
  },
  hat: (g, p) => {
    blob(g, plume, () => { g.moveTo(60, 12); g.quadraticCurveTo(58 - p.leg * 4, -10, 30, -6 + p.leg * 3); g.quadraticCurveTo(44, 2, 50, 14); g.closePath(); });
  },
  hand: (g) => {
    g.save(); g.rotate(0.3); g.translate(4, -14);
    const kite = () => { g.moveTo(-14, 0); g.lineTo(14, 0); g.lineTo(14, 18); g.quadraticCurveTo(0, 40, -14, 18); g.closePath(); };
    blob(g, shield, kite, 3);
    shade(g, kite, 10, 34, 0.2);
    line(g, 3, '#e9e4d4', [[0, 4], [0, 28]]);
    line(g, 3, '#e9e4d4', [[-9, 12], [9, 12]]);
    shine(g, -6, 6, 5, 3);
    g.restore();
  },
});

const sweatLook = (hoodie: string): Look => ({
  skin: '#ffcfa6', shirt: hoodie, pants: '#2a2a3a', shoes: '#ffffff',
  torso: (g) => {
    blob(g, hoodie, () => { g.moveTo(46, 60); g.quadraticCurveTo(64, 72, 82, 60); g.lineTo(78, 56); g.quadraticCurveTo(64, 64, 50, 56); g.closePath(); }, 2);
    line(g, 2, '#fff', [[62, 64], [61, 76]]);
    line(g, 2, '#fff', [[68, 64], [69, 76]]);
  },
  face: (g) => {
    eyes(g, 68, 37, { size: 5.5, gap: 13, look: 1.8, lid: 3.5 });
    brows(g, 68, 28, 13, 3);
    blob(g, '#fff', () => g.roundRect(72, 45, 12, 5, 2), 2);
    line(g, 1, INK, [[76, 45], [76, 50]]); line(g, 1, INK, [[80, 45], [80, 50]]);
    // Sweat drops: this hero is trying VERY hard.
    for (const [x, y] of [[88, 22], [92, 32]]) blob(g, '#6fd6ff', () => { g.moveTo(x, y - 6); g.quadraticCurveTo(x + 5, y + 2, x, y + 3); g.quadraticCurveTo(x - 5, y + 2, x, y - 6); }, 1.5);
  },
  hat: (g) => {
    blob(g, '#2a1f3d', () => { g.moveTo(40, 30); g.lineTo(44, 12); g.lineTo(50, 18); g.lineTo(56, 6); g.lineTo(62, 14); g.lineTo(70, 4); g.lineTo(74, 14); g.lineTo(84, 10); g.quadraticCurveTo(86, 20, 82, 24); g.quadraticCurveTo(60, 16, 44, 34); g.closePath(); }, 2);
    line(g, 4, '#222', [[42, 34], [48, 12], [64, 8], [80, 16]]);
    blob(g, '#222', () => g.roundRect(38, 30, 12, 16, 5), 2);
    dot(g, 44, 38, 3, '#29e0ff');
    line(g, 2.5, '#222', [[44, 44], [60, 52], [70, 50]]);
    dot(g, 70, 50, 2.5, '#222');
  },
  hand: (g) => sword(g, '#9ff3ff', 30, '#29e0ff'),
});

const healerLook = (skin: string, trim: string): Look => ({
  skin, shirt: '#fbfbf5', pants: '#fbfbf5', shoes: '#8a5a2b', robe: '#fbfbf5',
  torso: (g) => {
    line(g, 3, trim, [[64, 64], [64, 116]]);
    blob(g, '#3ed17a', () => { g.rect(61, 70, 6, 16); g.rect(56, 75, 16, 6); }, 0);
    blob(g, trim, () => g.roundRect(44, 94, 44, 5, 2), 0);
  },
  face: (g) => {
    for (const x of [68, 81]) line(g, 2.5, INK, [[x - 4, 36], [x, 33], [x + 4, 36]]);
    blush(g, 64, 44); blush(g, 86, 44);
    line(g, 2.5, INK, [[72, 46], [76, 49], [81, 46]]);
  },
  hat: (g) => {
    const mitre = () => { g.moveTo(44, 20); g.quadraticCurveTo(48, -8, 64, -14); g.quadraticCurveTo(80, -8, 84, 20); g.closePath(); };
    blob(g, '#fbfbf5', mitre);
    shade(g, mitre, -14, 20, 0.12);
    blob(g, trim, () => g.roundRect(43, 16, 42, 6, 3), 2);
    blob(g, '#3ed17a', () => { g.rect(61, -4, 6, 16); g.rect(56, 1, 16, 6); }, 0);
  },
  hand: (g) => {
    g.save(); g.translate(6, 4); g.rotate(0.35);
    line(g, 5, '#8a5a2b', [[0, -44], [0, 22]]);
    g.shadowColor = '#7dffb0'; g.shadowBlur = 14;
    blob(g, '#aaffcf', () => g.arc(0, -50, 8, 0, Math.PI * 2), 2);
    g.shadowBlur = 0;
    shine(g, -2, -53, 3, 2);
    for (const s of [-1, 1]) blob(g, '#3ed17a', () => g.ellipse(s * 8, -42, 6, 3, s * 0.6, 0, Math.PI * 2), 1.5);
    g.restore();
  },
});

const goblinLook: Look = {
  skin: '#5ccf4f', shirt: '#5ccf4f', pants: '#8a5a2b', shoes: '#4a8a3a', short: true,
  torso: (g) => { blob(g, '#8a5a2b', () => { g.moveTo(45, 82); g.lineTo(83, 82); g.lineTo(78, 98); g.lineTo(64, 92); g.lineTo(50, 98); g.closePath(); }, 2); },
  head: (g) => {
    for (const [x, dir] of [[42, -1], [86, 1]] as const) blob(g, '#5ccf4f', () => { g.moveTo(x, 30); g.lineTo(x + dir * 20, 18); g.lineTo(x, 44); g.closePath(); });
    const head = () => g.ellipse(64, 38, 25, 23, 0, 0, Math.PI * 2);
    blob(g, '#5ccf4f', head);
    shade(g, head, 38, 60, 0.15);
    shine(g, 54, 24, 8, 4);
  },
  face: (g) => {
    eyes(g, 66, 34, { size: 7, gap: 15, look: 1.5, color: '#b8860b' });
    brows(g, 66, 25, 15, 2.5);
    blob(g, '#4bb842', () => { g.moveTo(80, 40); g.lineTo(94, 44); g.lineTo(80, 47); g.closePath(); }, 2);
    grin(g, 72, 50, 18, 5);
    g.fillStyle = '#fff';
    for (const x of [66, 76]) { g.beginPath(); g.moveTo(x, 50); g.lineTo(x + 2.5, 55); g.lineTo(x + 5, 50); g.fill(); }
  },
  hand: (g) => {
    g.save(); g.rotate(-2.3);
    blob(g, '#8a5a2b', () => { g.moveTo(-3, 0); g.lineTo(-7, 30); g.quadraticCurveTo(0, 38, 7, 30); g.lineTo(3, 0); g.closePath(); }, 2.2);
    for (const [x, y] of [[-7, 22], [7, 26], [-5, 32]]) blob(g, '#dfe6ee', () => { g.moveTo(x, y - 3); g.lineTo(x + Math.sign(x) * 6, y); g.lineTo(x, y + 3); g.closePath(); }, 1.5);
    g.restore();
  },
};

const cape = (color: string) => (g: G, p: Pose) => {
  const sway = p.leg * 5;
  const shape = () => { g.moveTo(50, 60); g.quadraticCurveTo(30 + sway, 90, 22 + sway, 116); g.lineTo(58, 110); g.lineTo(72, 62); g.closePath(); };
  blob(g, color, shape);
  shade(g, shape, 60, 116, 0.25);
};

const tryhardLook: Look = {
  skin: '#ffcfa6', shirt: '#ffd23a', pants: '#b8860b', shoes: '#6b4424',
  back: cape('#2f5dff'),
  torso: (g) => { line(g, 2, 'rgba(42,31,61,0.5)', [[48, 74], [80, 74]]); dot(g, 64, 66, 4, '#d8263a'); },
  face: (g) => {
    eyes(g, 67, 34, { size: 5.5, gap: 13, look: 1, lid: 2 });
    brows(g, 67, 26, 13, -1);
    blob(g, '#6b4424', () => { g.moveTo(66, 44); g.quadraticCurveTo(76, 40, 90, 46); g.quadraticCurveTo(80, 44, 76, 48); g.quadraticCurveTo(70, 46, 66, 44); }, 1.5);
  },
  hat: (g, p) => {
    const helm = () => { g.moveTo(40, 30); g.quadraticCurveTo(40, 6, 64, 6); g.quadraticCurveTo(88, 6, 90, 26); g.lineTo(40, 26); g.closePath(); };
    blob(g, '#ffd23a', helm);
    shine(g, 54, 14, 9, 4);
    blob(g, '#2f5dff', () => { g.moveTo(58, 8); g.quadraticCurveTo(52 - p.leg * 4, -18, 20, -12 + p.leg * 3); g.quadraticCurveTo(36, -2, 46, 10); g.closePath(); });
  },
  hand: (g) => sword(g, '#fff6c2', 44, '#ffd23a'),
};

const clutchLook: Look = {
  skin: '#e0a57a', shirt: '#7a2cff', pants: '#2a2a3a', shoes: '#ffd23a',
  torso: (g) => {
    g.font = 'bold 20px Arial Black, sans-serif'; g.textAlign = 'center';
    g.lineWidth = 3; g.strokeStyle = INK; g.strokeText('1', 64, 88);
    g.fillStyle = '#ffd23a'; g.fillText('1', 64, 88);
  },
  face: (g) => {
    blob(g, '#111', () => { g.moveTo(58, 30); g.lineTo(92, 30); g.lineTo(90, 40); g.quadraticCurveTo(84, 44, 78, 38); g.lineTo(72, 38); g.quadraticCurveTo(66, 44, 60, 40); g.closePath(); }, 2);
    line(g, 2, 'rgba(255,255,255,0.7)', [[62, 33], [68, 33]]);
    line(g, 2.5, INK, [[70, 47], [78, 48], [85, 44]]);
  },
  hat: (g) => {
    blob(g, '#ff3d5a', () => { g.moveTo(40, 24); g.quadraticCurveTo(44, 6, 66, 6); g.quadraticCurveTo(88, 8, 88, 24); g.closePath(); });
    blob(g, '#ff3d5a', () => g.roundRect(26, 18, 18, 6, 3), 2);
    line(g, 4, '#ffd23a', [[42, 34], [46, 12], [64, 6]]);
    blob(g, '#ffd23a', () => g.roundRect(38, 30, 12, 16, 5), 2);
  },
  hand: (g) => {
    g.save(); g.rotate(-2.3);
    blob(g, '#6b4424', () => g.roundRect(-3, -4, 6, 34, 3), 2);
    g.shadowColor = '#29e0ff'; g.shadowBlur = 12;
    blob(g, '#9ff3ff', () => g.roundRect(-14, 28, 28, 18, 5), 2.5);
    g.shadowBlur = 0;
    shine(g, -6, 32, 5, 3);
    g.restore();
  },
};

const chosenLook: Look = {
  skin: '#ffcfa6', shirt: '#fbfbf5', pants: '#e9dcb8', shoes: '#8a5a2b',
  back: (g, p) => {
    const sway = p.leg * 6;
    blob(g, '#e8392f', () => { g.moveTo(56, 58); g.quadraticCurveTo(30, 60 + sway, 14, 74 + sway); g.lineTo(22, 80 + sway); g.quadraticCurveTo(40, 70, 60, 66); g.closePath(); });
  },
  torso: (g) => { blob(g, '#ffd23a', () => g.roundRect(45, 84, 38, 6, 2), 2); line(g, 3, '#ffd23a', [[64, 60], [64, 84]]); },
  face: (g) => {
    eyes(g, 67, 36, { size: 7, gap: 13, look: 1.4, color: '#2f5dff' });
    brows(g, 67, 27, 13, 2);
    line(g, 2.5, INK, [[72, 47], [78, 50], [84, 46]]);
  },
  hat: (g) => {
    blob(g, '#ffe066', () => {
      g.moveTo(38, 38); g.lineTo(34, 18); g.lineTo(44, 22); g.lineTo(42, 4); g.lineTo(54, 14); g.lineTo(58, -4); g.lineTo(66, 12);
      g.lineTo(78, -2); g.lineTo(78, 14); g.lineTo(94, 8); g.lineTo(86, 22); g.quadraticCurveTo(70, 18, 60, 22); g.quadraticCurveTo(46, 26, 44, 40); g.closePath();
    });
    shine(g, 58, 8, 7, 3);
    for (const [x, y] of [[26, 8], [100, 20], [96, -4]]) {
      g.fillStyle = '#fff6a0';
      g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 2, y - 2); g.lineTo(x + 6, y); g.lineTo(x + 2, y + 2); g.lineTo(x, y + 6); g.lineTo(x - 2, y + 2); g.lineTo(x - 6, y); g.lineTo(x - 2, y - 2); g.fill();
    }
  },
  hand: (g) => sword(g, '#ffffff', 46, '#fff27a'),
};

const LOOKS: Record<CastId, Look> = {
  noob: noobLook('#2f7dff', '#3fb24f'),
  noob2: noobLook('#ff4d4d', '#2f5dff'),
  archer: archerLook('#2fae55', '#248a44'),
  archer2: archerLook('#1fa3a3', '#16807f'),
  knight: knightLook('#c9d3e2', '#d8263a', '#d8263a'),
  knight2: knightLook('#e0a86a', '#2f7dff', '#2f5dff'),
  sweat: sweatLook('#ff3d7f'),
  sweat2: sweatLook('#8a4dff'),
  healer: healerLook('#ffcfa6', '#3ed17a'),
  healer2: healerLook('#c68a5e', '#ffc93a'),
  goblin: goblinLook,
  tryhard: tryhardLook,
  clutch: clutchLook,
  chosen: chosenLook,
};

export interface PuppetAtlas {
  tex: ReturnType<typeof pack>['tex'];
  cols: number;
  rows: number;
  /** Cell index for cast member * PARTS.length + part, or -1 where that piece does not exist. */
  cells: number[];
  /** Joint positions in unit-quad space, per cast member and part. */
  joints: [number, number][][];
}

export function castAtlas(): PuppetAtlas {
  const images: HTMLCanvasElement[] = [];
  const cells: number[] = [];
  const js: [number, number][][] = [];
  for (const id of CAST) {
    const look = LOOKS[id];
    const j = joints(look);
    js.push(PARTS.map((part) => unitPoint(j[part][0], j[part][1], shortBy(look))));
    for (const part of PARTS) {
      const pc = piece(look, part);
      cells.push(pc ? images.length : -1);
      if (pc) images.push(pc);
    }
  }
  const atlas = pack(images, CELL, 10);
  return { ...atlas, cells, joints: js };
}

/** A labelled sheet of the whole cast, for reviewing the art outside the game. */
export function castSheet(): HTMLCanvasElement {
  const cols = 7;
  const [c, g] = canvas(cols * CELL, Math.ceil(CAST.length / cols) * (CELL + 28));
  g.fillStyle = '#93cf63';
  g.fillRect(0, 0, c.width, c.height);
  CAST.forEach((id, i) => {
    const x = (i % cols) * CELL, y = Math.floor(i / cols) * (CELL + 28);
    g.drawImage(portrait(LOOKS[id]), x, y);
    g.font = 'bold 18px sans-serif'; g.textAlign = 'center'; g.fillStyle = INK;
    g.fillText(id, x + CELL / 2, y + CELL + 20);
  });
  return c;
}
