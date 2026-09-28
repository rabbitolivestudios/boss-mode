import type { Summary } from '../analytics/contract';
import { fmt, pct } from './charts';
import { PICK } from './labels';

/**
 * A few sentences a person would say reading the charts: the hardest night, the favourite and the
 * ignored upgrade, how the default tier is going. Each needs a minimum sample, so a single run
 * never gets written up as a trend.
 */
export function insights(s: Summary): string[] {
  const out: string[] = [];
  if (!s.audience.sessions) return ['No one has played in this period yet. Share bossmode.mac-tbo.com and check back.'];

  const nights = s.nights.filter((n) => n.attempts >= 5);
  if (nights.length) {
    const wall = [...nights].sort((a, b) => a.survived / a.attempts - b.survived / b.attempts)[0];
    const rate = (wall.survived / wall.attempts) * 100;
    const cause = wall.vault > wall.hp ? 'mostly robbed' : 'mostly defeated';
    out.push(`Night ${wall.night} is the wall: ${pct(rate)} of ${fmt(wall.attempts)} tries survive it, ${cause}.`);
  }

  const picks = s.picks.filter((p) => p.offered >= 10);
  if (picks.length >= 2) {
    const [top, low] = [picks[0], picks[picks.length - 1]];
    out.push(`Favourite upgrade: ${PICK[top.key] ?? top.key} (${pct(top.rate)} when offered). Least wanted: ${PICK[low.key] ?? low.key} (${pct(low.rate)}), a candidate to buff.`);
  }

  const normal = s.tiers.find((t) => t.key === 'normal');
  if (normal && normal.started >= 5) {
    out.push(`Normal: ${fmt(normal.wins)} wins from ${fmt(normal.started)} seasons (${pct((normal.wins / normal.started) * 100)}).`);
  }

  if (s.seasons.started && s.seasons.started < 10) out.push(`Only ${fmt(s.seasons.started)} seasons so far, so treat these numbers as early signs.`);
  if (!out.length) out.push(`${fmt(s.audience.sessions)} sessions so far. Trends appear here once a few seasons have been played.`);
  return out;
}
