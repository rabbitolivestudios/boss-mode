import { ART_SCALE, INK, blob, canvas, cutout, dot, line, pack, shine, type G } from './ink';

// Paper art for the boss's spells: fireballs, lightning, storm clouds, explosions, tornados, boomerangs and ice.

const CELL = 192 * ART_SCALE;
const S = CELL / 128;

export const SPELLS = ['fire0', 'fire1', 'boom', 'bolt0', 'bolt1', 'bolt2', 'cloud', 'twister0', 'twister1', 'boomerang', 'ice', 'flake'] as const;
export type SpellId = typeof SPELLS[number];

/** A comet of fire pointing right: red tail, orange body, yellow core. `f` flickers the tail tips. */
function fireball(g: G, f: number): void {
  const tail = (k: number) => () => {
    g.moveTo(118, 64);
    g.bezierCurveTo(118, 34, 92, 26, 72, 34);
    g.quadraticCurveTo(46, 22 + f * k, 6 + f * 2 * k, 30 + f * k);
    g.quadraticCurveTo(30, 48, 12 - f * k, 58);
    g.quadraticCurveTo(34, 66, 4 + f * 3 * k, 80 - f * k);
    g.quadraticCurveTo(32, 86, 20 + f * k, 104 - f * k);
    g.quadraticCurveTo(52, 100, 72, 94);
    g.bezierCurveTo(92, 102, 118, 94, 118, 64);
    g.closePath();
  };
  blob(g, '#ff3d1a', tail(1), 4);
  g.save(); g.translate(40, 20); g.scale(0.7, 0.7);
  blob(g, '#ff8a1a', tail(-1), 0);
  g.restore();
  blob(g, '#ffd23a', () => g.ellipse(88, 64, 24, 22, 0, 0, Math.PI * 2), 0);
  blob(g, '#fff6c8', () => g.ellipse(92, 60, 12, 10, 0, 0, Math.PI * 2), 0);
  shine(g, 96, 52, 8, 4, -0.4, 0.8);
  for (const [x, y, r] of [[30, 20, 5], [16, 96, 4], [48, 110, 3]] as const) blob(g, '#ffb21a', () => g.arc(x + f, y, r, 0, Math.PI * 2), 2);
}

/** The pop when a fireball lands: a spiky star, orange around yellow around white. */
function boom(g: G): void {
  const star = (r1: number, r2: number, n: number, rot: number) => () => {
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r2 : r1;
      const x = 64 + Math.cos(a) * r, y = 64 + Math.sin(a) * r;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
  };
  blob(g, '#ff5a1a', star(60, 34, 9, 0.2), 4);
  blob(g, '#ffb21a', star(42, 24, 9, 0.5), 0);
  blob(g, '#fff2a0', () => g.arc(64, 64, 18, 0, Math.PI * 2), 0);
  shine(g, 56, 54, 8, 5, -0.5, 0.8);
}

/**
 * A tall, solid cartoon bolt from the top of the cell to the ground: a zigzag spine widened into a
 * filled shape that tapers toward the strike point. Each variant has its own fixed shape.
 */
function bolt(g: G, v: number): void {
  const spine = ([
    [[66, 0], [50, 34], [74, 42], [50, 76], [72, 82], [60, 128]],
    [[58, 0], [76, 30], [52, 46], [78, 70], [54, 88], [66, 128]],
    [[64, 0], [46, 26], [72, 50], [48, 64], [74, 94], [62, 128]],
  ] as [number, number][][])[v];
  const width = (i: number) => 16 - i * 2.4;
  const left: [number, number][] = [], right: [number, number][] = [];
  spine.forEach(([x, y], i) => { left.push([x - width(i), y]); right.push([x + width(i), y]); });
  blob(g, '#ffe24a', () => {
    left.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
    g.closePath();
  }, 4);
  line(g, 3, '#fffbe0', spine.slice(0, 4).map(([x, y], i) => [x - width(i) * 0.3, y + 3] as [number, number]));
  // A thin fork off the middle.
  const [bx, by] = spine[2];
  const dir = v === 1 ? -1 : 1;
  blob(g, '#ffe24a', () => { g.moveTo(bx, by - 4); g.lineTo(bx + dir * 22, by + 12); g.lineTo(bx + dir * 16, by + 14); g.lineTo(bx + dir * 24, by + 32); g.lineTo(bx + dir * 8, by + 12); g.lineTo(bx, by + 6); g.closePath(); }, 3);
}

function cloud(g: G): void {
  const puffs: [number, number, number][] = [[34, 74, 22], [58, 60, 28], [86, 64, 24], [104, 80, 16], [18, 86, 14], [64, 84, 26]];
  blob(g, '#4b3f6b', () => { for (const [x, y, r] of puffs) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); } }, 4);
  blob(g, '#5e5286', () => { for (const [x, y, r] of puffs) { g.moveTo(x + r * 0.7, y - 4); g.arc(x, y - 4, r * 0.7, 0, Math.PI * 2); } }, 0);
  shine(g, 56, 46, 14, 6, -0.2, 0.25);
  line(g, 4, '#ffe24a', [[44, 96], [38, 106], [46, 108], [40, 118]]);
}

/** A funnel of wind: stacked swirls that widen upward, with the stripes shifted per frame. */
function twister(g: G, f: number): void {
  const funnel = () => { g.moveTo(14, 10); g.quadraticCurveTo(64, 0, 114, 10); g.quadraticCurveTo(84, 60, 70, 124); g.lineTo(58, 124); g.quadraticCurveTo(44, 60, 14, 10); g.closePath(); };
  blob(g, '#dfe7f2', funnel, 4);
  g.save(); g.beginPath(); funnel(); g.clip();
  for (let i = 0; i < 7; i++) {
    const y = 14 + i * 17 + f * 8;
    const w = 50 - i * 6;
    g.beginPath(); g.ellipse(64 + Math.sin(i + f) * 4, y, w, 5, 0.08, 0.1, Math.PI - 0.1);
    g.lineWidth = 3.5; g.strokeStyle = i % 2 ? '#9fb2c9' : '#b9c8da'; g.stroke();
  }
  g.restore();
  shine(g, 40, 24, 14, 4, 0.1, 0.5);
  for (const [x, y] of [[20 + f * 6, 40], [104 - f * 6, 56], [30, 90 - f * 6]] as const) blob(g, '#9ad06a', () => g.ellipse(x, y, 6, 3, 0.6, 0, Math.PI * 2), 2);
}

/** A bone boomerang, bent in the middle. */
function boomerang(g: G): void {
  const arm = () => { g.moveTo(18, 30); g.quadraticCurveTo(40, 26, 64, 64); g.quadraticCurveTo(88, 26, 110, 30); g.quadraticCurveTo(116, 42, 104, 46); g.quadraticCurveTo(84, 48, 64, 92); g.quadraticCurveTo(44, 48, 24, 46); g.quadraticCurveTo(12, 42, 18, 30); g.closePath(); };
  blob(g, '#f1ead6', arm, 4);
  shine(g, 40, 36, 14, 4, 0.3, 0.6);
  shine(g, 88, 36, 14, 4, -0.3, 0.6);
  for (const x of [20, 108]) blob(g, '#f1ead6', () => g.arc(x, 36, 9, 0, Math.PI * 2), 3);
  dot(g, 64, 70, 4, '#9b4dff');
}

/** Shards of ice around a frozen hero's feet. */
function ice(g: G): void {
  const shard = (x: number, h: number, w: number, lean: number) => blob(g, '#9fe6ff', () => { g.moveTo(x - w, 124); g.lineTo(x + lean, 124 - h); g.lineTo(x + w, 124); g.closePath(); }, 3);
  shard(24, 44, 12, -8); shard(104, 50, 12, 8); shard(46, 70, 14, -4); shard(84, 64, 14, 4); shard(64, 86, 16, 0);
  for (const [x, y] of [[62, 60], [44, 92], [84, 90]] as const) shine(g, x, y, 3, 10, 0, 0.8);
}

function flake(g: G): void {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = 64 + Math.cos(a) * 46, y = 64 + Math.sin(a) * 46;
    line(g, 12, INK, [[64, 64], [x, y]]);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = 64 + Math.cos(a) * 46, y = 64 + Math.sin(a) * 46;
    const mx = 64 + Math.cos(a) * 28, my = 64 + Math.sin(a) * 28;
    line(g, 6, '#cff4ff', [[64, 64], [x, y]]);
    line(g, 5, '#cff4ff', [[mx, my], [mx + Math.cos(a + 0.9) * 12, my + Math.sin(a + 0.9) * 12]]);
    line(g, 5, '#cff4ff', [[mx, my], [mx + Math.cos(a - 0.9) * 12, my + Math.sin(a - 0.9) * 12]]);
  }
  dot(g, 64, 64, 8, '#ffffff');
}

function drawSpell(id: SpellId): HTMLCanvasElement {
  const [c, g] = canvas(CELL, CELL);
  g.scale(S, S);
  switch (id) {
    case 'fire0': fireball(g, 0); break;
    case 'fire1': fireball(g, 5); break;
    case 'boom': boom(g); break;
    case 'bolt0': bolt(g, 0); break;
    case 'bolt1': bolt(g, 1); break;
    case 'bolt2': bolt(g, 2); break;
    case 'cloud': cloud(g); break;
    case 'twister0': twister(g, 0); break;
    case 'twister1': twister(g, 1); break;
    case 'boomerang': boomerang(g); break;
    case 'ice': ice(g); break;
    case 'flake': flake(g); break;
  }
  return cutout(c, 5 * S);
}

export function spellAtlas(): ReturnType<typeof pack> {
  return pack(SPELLS.map(drawSpell), CELL, 4);
}

export const spellCell = (id: SpellId): number => SPELLS.indexOf(id);

export function spellSheet(): HTMLCanvasElement {
  const [c, g] = canvas(CELL * 6, CELL * 2);
  g.fillStyle = '#93cf63';
  g.fillRect(0, 0, c.width, c.height);
  SPELLS.forEach((id, i) => g.drawImage(drawSpell(id), (i % 6) * CELL, Math.floor(i / 6) * CELL));
  return c;
}
