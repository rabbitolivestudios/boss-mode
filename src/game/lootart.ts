import { ART_SCALE, INK, blob, canvas, cutout, dot, line, pack, shade, shine, type G } from './ink';

// Paper art for the treasure game: the vault at four fill levels, the gates, a thief's sack and a coin.

const CELL = 192 * ART_SCALE;
const S = CELL / 128;

export const LOOT = ['vault3', 'vault2', 'vault1', 'vault0', 'gate', 'bag', 'coin'] as const;
export type LootId = typeof LOOT[number];

function coin(g: G, x: number, y: number, r: number): void {
  blob(g, '#ffd23a', () => g.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2), 2);
  g.beginPath(); g.ellipse(x, y, r * 0.6, r * 0.45, 0, 0, Math.PI * 2);
  g.strokeStyle = '#d9a21a'; g.lineWidth = 1.5; g.stroke();
  shine(g, x - r * 0.35, y - r * 0.3, r * 0.25, r * 0.15, -0.5, 0.7);
}

function gem(g: G, x: number, y: number, r: number, color: string): void {
  blob(g, color, () => { g.moveTo(x, y - r); g.lineTo(x + r * 0.8, y - r * 0.2); g.lineTo(x, y + r); g.lineTo(x - r * 0.8, y - r * 0.2); g.closePath(); }, 2);
  shine(g, x - r * 0.25, y - r * 0.35, r * 0.2, r * 0.3, 0.4, 0.7);
}

/** An open chest whose pile of gold shrinks as the fill level drops. */
function vault(g: G, fill: number): void {
  // Lid, tipped open behind the chest.
  const lid = () => { g.moveTo(22, 70); g.quadraticCurveTo(24, 40, 64, 38); g.quadraticCurveTo(104, 40, 106, 70); g.closePath(); };
  blob(g, '#9b5a22', lid, 3);
  line(g, 5, '#ffc93a', [[24, 64], [104, 64]]);
  line(g, 5, '#ffc93a', [[64, 40], [64, 66]]);
  // Pile of coins spilling over the rim.
  if (fill > 0) {
    const top = [0, 70, 54, 34][fill];
    blob(g, '#ffd23a', () => { g.moveTo(20, 80); g.quadraticCurveTo(40, top - 2, 64, top); g.quadraticCurveTo(88, top - 2, 108, 80); g.closePath(); }, 3);
    const coins: [number, number][] = [[34, 76], [48, 70], [62, 66], [78, 70], [92, 76], [56, 58], [72, 60], [64, 48], [44, 64], [86, 64]];
    coins.slice(0, fill * 4 - 2).forEach(([x, y]) => coin(g, x, Math.max(y, top + 8), 6));
    if (fill >= 2) gem(g, 50, top + 16, 7, '#29e0ff');
    if (fill >= 3) { gem(g, 80, top + 14, 8, '#ff3d7f'); gem(g, 64, top + 4, 7, '#3ee07a'); }
  }
  // Chest body.
  const body = () => g.roundRect(18, 78, 92, 42, 8);
  blob(g, '#b8702e', body, 3);
  shade(g, body, 90, 120, 0.25);
  for (const x of [22, 60, 98]) blob(g, '#ffc93a', () => g.roundRect(x, 78, 8, 42, 2), 2);
  blob(g, '#ffc93a', () => g.roundRect(55, 92, 18, 16, 4), 2.5);
  dot(g, 64, 100, 3, INK);
  if (fill > 0) { coin(g, 12, 118, 6); coin(g, 116, 116, 5); }
  if (fill >= 2) { coin(g, 24, 124, 5); coin(g, 104, 124, 6); }
}

function gate(g: G): void {
  const pillar = (x: number) => { const p = () => g.roundRect(x, 30, 22, 94, 4); blob(g, '#a9b3c0', p, 3); shade(g, p, 60, 124, 0.25); for (const y of [50, 74, 98]) line(g, 2, 'rgba(42,31,61,0.3)', [[x + 2, y], [x + 20, y]]); };
  blob(g, '#2a1f3d', () => { g.moveTo(30, 124); g.lineTo(30, 56); g.quadraticCurveTo(64, 20, 98, 56); g.lineTo(98, 124); g.closePath(); }, 0);
  pillar(12);
  pillar(94);
  const arch = () => { g.moveTo(10, 40); g.quadraticCurveTo(64, -10, 118, 40); g.lineTo(118, 52); g.lineTo(96, 52); g.quadraticCurveTo(64, 14, 32, 52); g.lineTo(10, 52); g.closePath(); };
  blob(g, '#bcc6d2', arch, 3);
  shine(g, 40, 22, 14, 4, -0.3);
  // A banner so gates read as the heroes' way in.
  blob(g, '#2f7dff', () => { g.moveTo(52, 30); g.lineTo(76, 30); g.lineTo(76, 58); g.lineTo(64, 50); g.lineTo(52, 58); g.closePath(); }, 2.5);
  blob(g, '#ffd23a', () => { g.moveTo(64, 34); g.lineTo(68, 42); g.lineTo(64, 48); g.lineTo(60, 42); g.closePath(); }, 1.5);
}

function bag(g: G): void {
  const sack = () => { g.moveTo(44, 72); g.quadraticCurveTo(22, 90, 30, 114); g.quadraticCurveTo(64, 126, 98, 114); g.quadraticCurveTo(106, 90, 84, 72); g.closePath(); };
  blob(g, '#c8955a', sack, 3);
  shade(g, sack, 90, 122, 0.25);
  blob(g, '#c8955a', () => { g.moveTo(46, 74); g.lineTo(40, 56); g.lineTo(54, 64); g.lineTo(64, 52); g.lineTo(74, 64); g.lineTo(88, 56); g.lineTo(82, 74); g.closePath(); }, 3);
  line(g, 4, '#6b4424', [[44, 74], [84, 74]]);
  g.font = 'bold 30px Arial Black, sans-serif'; g.textAlign = 'center';
  g.lineWidth = 4; g.strokeStyle = INK; g.strokeText('$', 64, 108);
  g.fillStyle = '#ffd23a'; g.fillText('$', 64, 108);
  coin(g, 64, 56, 8);
}

function drawLoot(id: LootId): HTMLCanvasElement {
  const [c, g] = canvas(CELL, CELL);
  g.scale(S, S);
  switch (id) {
    case 'vault3': vault(g, 3); break;
    case 'vault2': vault(g, 2); break;
    case 'vault1': vault(g, 1); break;
    case 'vault0': vault(g, 0); break;
    case 'gate': gate(g); break;
    case 'bag': bag(g); break;
    case 'coin': coin(g, 64, 100, 22); break;
  }
  return cutout(c, 6 * S);
}

export function lootAtlas(): ReturnType<typeof pack> {
  return pack(LOOT.map(drawLoot), CELL, 4);
}

export const lootCell = (id: LootId): number => LOOT.indexOf(id);

export function lootSheet(): HTMLCanvasElement {
  const [c, g] = canvas(CELL * LOOT.length, CELL);
  g.fillStyle = '#93cf63';
  g.fillRect(0, 0, c.width, c.height);
  LOOT.forEach((id, i) => g.drawImage(drawLoot(id), i * CELL, 0));
  return c;
}
