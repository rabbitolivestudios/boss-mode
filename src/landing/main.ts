import './landing.css';
import { served, track } from '../analytics/track';
import { checkName } from '../game/nameguard';

/** The landing page's only moving parts: the shared Hall of Bosses, and an anonymous page-view count. */

track({ type: 'landing' });

const BOSS: Record<string, string> = { dragon: '🐉', slime: '🟢', bonelord: '💀' };
const TIER: Record<string, string> = { chill: 'Chill', normal: 'Normal', heroic: 'Heroic', legendary: 'Legendary' };

interface Row { name: string; score: number; boss: string; tier: string; nights: number; win: boolean }

async function hall(): Promise<void> {
  if (!(await served)) return;
  try {
    const r = await fetch('/api/board', { cache: 'no-store' });
    if (!r.ok) return;
    const rows = ((await r.json()) as { rows: Row[] }).rows
      // Rows come from other players' browsers: only well-formed ones with allowed names are shown.
      .filter((x) => 'name' in checkName(String(x.name)) && Number.isFinite(x.score) && x.boss in BOSS);
    if (!rows.length) return;
    const list = document.getElementById('board') as HTMLOListElement;
    for (const [i, x] of rows.entries()) {
      const li = document.createElement('li');
      const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = String(i + 1);
      const who = document.createElement('span');
      who.textContent = `${BOSS[x.boss]} ${x.name}`;
      const meta = document.createElement('span'); meta.className = 'meta';
      meta.textContent = `${TIER[x.tier] ?? ''} · ${x.win ? 'won the season 👑' : `reached night ${Math.min(7, x.nights + 1)}`}`;
      who.append(meta);
      const score = document.createElement('span'); score.className = 'score'; score.textContent = x.score.toLocaleString();
      li.append(rank, who, score);
      list.append(li);
    }
    (document.getElementById('hall') as HTMLElement).hidden = false;
  } catch { /* the page is complete without the board */ }
}

void hall();
