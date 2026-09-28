import { ART_SCALE, INK, blob, canvas, cutout, dot, line, pack, shade, shine, type G } from './ink';

// Paper art for castle buildings. Walls and towers stand up like the characters; spike pits lie flat.

const CELL = 192 * ART_SCALE;
const S = CELL / 128;

export const CASTLE_ART = ['wall', 'spikes', 'tower'] as const;
export type CastleArt = typeof CASTLE_ART[number];

function wall(g: G): void {
  blob(g, '#8a8f9e', () => g.roundRect(6, 100, 116, 24, 6), 3);
  for (let i = 0; i < 6; i++) {
    const x = 10 + i * 18;
    const post = () => { g.moveTo(x, 104); g.lineTo(x, 40 + (i % 2) * 6); g.lineTo(x + 8, 30 + (i % 2) * 6); g.lineTo(x + 16, 40 + (i % 2) * 6); g.lineTo(x + 16, 104); g.closePath(); };
    blob(g, i % 2 ? '#b07a40' : '#c08a4c', post, 3);
    shade(g, post, 60, 104, 0.2);
    line(g, 1.5, 'rgba(90,50,20,0.5)', [[x + 5, 50], [x + 5, 96]]);
  }
  line(g, 6, '#6b4424', [[6, 62], [122, 62]]);
  line(g, 6, '#6b4424', [[6, 86], [122, 86]]);
  for (const x of [20, 64, 108]) dot(g, x, 62, 3, '#c9d3e2');
}

/** Drawn as seen from above, because the pit lies flat on the ground. */
function spikes(g: G): void {
  const pit = () => g.roundRect(8, 8, 112, 112, 16);
  blob(g, '#4a3a2e', pit, 4);
  shade(g, pit, 8, 120, 0.3);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const x = 26 + c * 26, y = 26 + r * 26;
      blob(g, '#c9d3e2', () => { g.moveTo(x - 9, y + 8); g.lineTo(x, y - 10); g.lineTo(x + 9, y + 8); g.closePath(); }, 2);
      line(g, 1.5, '#ffffff', [[x - 2, y + 4], [x, y - 6]]);
    }
  }
}

function tower(g: G): void {
  const body = () => { g.moveTo(34, 124); g.lineTo(40, 58); g.lineTo(88, 58); g.lineTo(94, 124); g.closePath(); };
  blob(g, '#a9b3c0', body, 3);
  shade(g, body, 80, 124, 0.25);
  for (const y of [74, 92, 110]) line(g, 2, 'rgba(42,31,61,0.3)', [[38, y], [90, y]]);
  blob(g, '#2a1f3d', () => g.roundRect(56, 96, 16, 28, 6), 0);
  // Skeleton archer peering over the battlements.
  blob(g, '#f4efe0', () => g.roundRect(50, 22, 28, 26, 10), 3);
  for (const x of [58, 70]) dot(g, x, 34, 4, '#220033');
  line(g, 2, INK, [[58, 44], [70, 44]]);
  g.lineWidth = 4; g.strokeStyle = '#8a5a2b'; g.beginPath(); g.arc(86, 40, 16, -1.3, 1.3); g.stroke();
  line(g, 1.2, INK, [[86 + Math.cos(-1.3) * 16, 40 + Math.sin(-1.3) * 16], [86 + Math.cos(1.3) * 16, 40 + Math.sin(1.3) * 16]]);
  const top = () => { g.moveTo(32, 62); g.lineTo(32, 46); g.lineTo(42, 46); g.lineTo(42, 52); g.lineTo(52, 52); g.lineTo(52, 46); g.lineTo(76, 46); g.lineTo(76, 52); g.lineTo(86, 52); g.lineTo(86, 46); g.lineTo(96, 46); g.lineTo(96, 62); g.closePath(); };
  blob(g, '#bcc6d2', top, 3);
  shine(g, 46, 54, 8, 3, 0);
  blob(g, '#9b4dff', () => { g.moveTo(64, 10); g.lineTo(64, 24); g.moveTo(64, 10); g.lineTo(78, 14); g.lineTo(64, 18); g.closePath(); }, 2);
}

const DRAW: Record<CastleArt, (g: G) => void> = { wall, spikes, tower };

export function castleAtlas(): ReturnType<typeof pack> {
  return pack(CASTLE_ART.map((id) => {
    const [c, g] = canvas(CELL, CELL);
    g.scale(S, S);
    DRAW[id](g);
    return cutout(c, 5 * S);
  }), CELL, 3);
}

export const castleCell = (id: CastleArt): number => CASTLE_ART.indexOf(id);
