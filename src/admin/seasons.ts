import type { SeasonDetail, Summary } from '../analytics/contract';
import { card, empty, esc, table } from './charts';
import { BOSS, PICK, TIER } from './labels';

/** The Seasons tab: each recent game night by night, to read why one run was won or lost. */

const OUTCOME: Record<string, string> = { win: 'Won', hp: 'Defeated', vault: 'Robbed', quit: 'Quit' };
const NIGHT_OUTCOME: Record<string, string> = { survived: 'Survived', hp: 'Defeated', vault: 'Robbed' };
const when = (iso: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const n = (v: number | null) => (v === null ? '–' : String(v));

function season(d: SeasonDetail): string {
  const last = d.nights[d.nights.length - 1];
  const result = d.outcome ? `${OUTCOME[d.outcome] ?? d.outcome}${d.outcome !== 'win' && last ? ` on night ${last.night}` : ''}` : `In progress${last ? `, night ${last.night}` : ''}`;
  const title = `${when(d.startedAt)} · ${BOSS[d.boss] ?? d.boss} · ${TIER[d.tier] ?? d.tier} · ${result}`;
  const hint = [
    d.score !== null ? `Score ${d.score.toLocaleString('en-US')}` : null,
    `${d.retries} ${d.retries === 1 ? 'retry' : 'retries'}`,
    d.weapons.length ? `Powers: ${d.weapons.map((w) => PICK[w] ?? w).join(', ')}` : null,
  ].filter(Boolean).join(' · ');
  const rows = d.nights.map((r) => [
    `Night ${r.night}`, NIGHT_OUTCOME[r.outcome] ?? r.outcome, n(r.goldBefore), n(r.spent), n(r.goldStart), n(r.grabs), n(r.escapes), r.stolen, r.vaultKept,
    r.kills, `${r.hpPct}%`, `${r.buildingKillPct}%`, r.buildings, r.destroyed, r.level, `${Math.floor(r.seconds / 60)}:${String(Math.round(r.seconds % 60)).padStart(2, '0')}`,
  ]);
  const body = d.nights.length
    ? table(['Night', 'Result', 'Gold before building', 'Spent', 'Vault at start', 'Thieves at vault', 'Thieves escaped', 'Stolen', 'Vault at end', 'Kills', 'Health left', 'Kills by buildings', 'Buildings', 'Destroyed', 'Level', 'Time'], rows)
    : empty('No night finished yet.');
  return card({ title, ic: d.outcome === 'win' ? 'crown' : d.outcome === 'vault' ? 'coins' : 'swords', hint, body, cls: 'wide-3' });
}

export function seasons(s: Summary): string {
  if (!s.recent.length) return empty('No seasons in this period yet.');
  return `<p class="note">${s.recent.length === 1 ? "The latest season." : `The latest ${esc(String(s.recent.length))} seasons, newest first.`} "Thieves at vault" and "Thieves escaped" are recorded from this update on; older nights show –. A retried night appears once per try.</p>` +
    `<div class="grid one">${s.recent.map(season).join('')}</div>`;
}
