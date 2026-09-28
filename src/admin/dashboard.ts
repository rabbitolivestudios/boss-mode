import './dashboard.css';
import type { Summary } from '../analytics/contract';
import { bars, card, columns, esc, fmt, pct, stacked, table, tile, tooltips } from './charts';

/** The private /analytics page: fetches the summary for the chosen period and draws it. */

const BOSS: Record<string, string> = { dragon: '🐉 Blaze', slime: '🟢 Gloop', bonelord: '💀 Rattles' };
const TIER: Record<string, string> = { chill: 'Chill', normal: 'Normal', heroic: 'Heroic', legendary: 'Legendary' };
const PICK: Record<string, string> = {
  'weapon:stomp': 'Ground Pound', 'weapon:fireball': 'Fireball', 'weapon:bats': 'Bat Swarm', 'weapon:lava': 'Lava Pools', 'weapon:lightning': 'Lightning',
  'weapon:minions': 'Summon Goblins', 'weapon:spring': 'Spring Trap', 'weapon:saw': 'Saw Blades', 'passive:might': 'Might', 'passive:haste': 'Haste',
  'passive:boots': 'Boots', 'passive:heart': 'Big Heart', 'passive:magnet': 'Magnet', 'passive:regen': 'Regen', 'limit:might': 'Limit: Power',
  'limit:haste': 'Limit: Speed Up', 'limit:hp': 'Limit: Toughness', 'limit:speed': 'Limit: Speed', snack: 'Snack (heal)',
};
const BUILDINGS = ['wall', 'spikes', 'pad', 'saw', 'tower'] as const;
const BUILDING: Record<string, string> = { wall: 'Wall', spikes: 'Spike pit', pad: 'Launch pad', saw: 'Saw blade', tower: 'Archer tower' };

const root = document.getElementById('app') as HTMLElement;
const params = new URLSearchParams(location.search);
let days = Number(params.get('days') ?? 30);
let traffic = params.get('traffic') ?? 'real';

function controls(): string {
  const opt = (name: string, value: string | number, label: string, current: string | number) =>
    `<button class="chip${String(value) === String(current) ? ' on' : ''}" data-${name}="${value}" aria-pressed="${String(value) === String(current)}">${label}</button>`;
  return `<div class="controls"><div class="group" role="group" aria-label="Period">${[[1, 'Today'], [7, '7 days'], [30, '30 days'], [90, '90 days']].map(([v, l]) => opt('days', v, String(l), days)).join('')}</div>` +
    `<div class="group" role="group" aria-label="Traffic">${[['real', 'Players'], ['test', 'Test'], ['all', 'All']].map(([v, l]) => opt('traffic', v, l, traffic)).join('')}</div>` +
    `<form method="post" action="/analytics/logout"><button class="chip ghost" type="submit">Sign out</button></form></div>`;
}

function render(s: Summary): string {
  const a = s.audience, se = s.seasons;
  const winRate = se.finished ? (se.wins / se.finished) * 100 : null;
  const f0 = s.funnel[0]?.n || 1;
  const nightRows = s.nights.filter((n) => n.attempts > 0);

  const tiles = `<div class="tiles">${[
    tile('Sessions', fmt(a.sessions), `median ${a.medianSessionMinutes === null ? '–' : fmt(a.medianSessionMinutes, 1) + ' min'}`),
    tile('Players', fmt(a.visitors), `${fmt(a.newVisitors)} new · ${fmt(a.returningVisitors)} returning`),
    tile('Seasons', fmt(se.started), `${fmt(se.finished)} finished · ${pct(se.continuedShare)} continued`),
    tile('Win rate', pct(winRate), `${fmt(se.wins)} wins`),
    tile('Nights reached', se.medianNights === null ? '–' : fmt(se.medianNights, 1), 'median per finished season'),
    tile('Retries', se.retriesPerSeason === null ? '–' : fmt(se.retriesPerSeason, 2), 'per finished season'),
    tile('Landing page', fmt(a.landing.sessions), `${pct(a.landing.sessions ? (a.landing.played / a.landing.sessions) * 100 : null)} pressed play`),
  ].join('')}</div>`;

  const daily = card('Activity', 'Sessions per day (Chicago time). Hover a day for seasons started.',
    columns(a.daily.map((d) => ({ date: d.date.slice(5), value: d.sessions, tip: `${d.date}: ${d.sessions} sessions · ${d.seasons} seasons` }))),
    table(['Day', 'Sessions', 'Seasons'], a.daily.map((d) => [d.date, d.sessions, d.seasons])), true);

  const funnel = card('How far players get', 'Sessions reaching each stage. A retried night counts once it is survived.',
    bars(s.funnel.map((f) => ({ label: f.label, value: f.n, text: `${fmt(f.n)} · ${pct((f.n / f0) * 100)}`, tip: `${f.label}: ${f.n} sessions` })), { max: f0, ordinal: true }),
    table(['Stage', 'Sessions', '% of opened'], s.funnel.map((f) => [f.label, f.n, pct((f.n / f0) * 100)])));

  const outcome = card('Difficulty by night', 'Every attempt at each night, retries included. Died = boss health ran out; Robbed = vault emptied.',
    stacked(nightRows.map((n) => ({ label: `Night ${n.night}`, parts: { survived: n.survived, hp: n.hp, vault: n.vault }, note: `${fmt(n.attempts)} tries · ${pct((n.survived / n.attempts) * 100)} won` })),
      [{ key: 'survived', label: 'Survived', slot: 1 }, { key: 'hp', label: 'Died', slot: 2 }, { key: 'vault', label: 'Robbed', slot: 3 }]),
    table(['Night', 'Attempts', 'Survived', 'Died', 'Robbed', 'Median HP left', 'Median vault kept', 'Median building kills', 'Median level'],
      nightRows.map((n) => [n.night, n.attempts, n.survived, n.hp, n.vault, pct(n.medianHpPct), fmt(n.medianVaultKept), pct(n.medianBuildingKillPct), fmt(n.medianLevel)])), true);

  const damage = card('What hurts the boss', 'Share of damage taken each night, by source.',
    stacked(nightRows.map((n) => ({ label: `Night ${n.night}`, parts: n.damageShare })),
      [{ key: 'contact', label: 'Melee heroes', slot: 1 }, { key: 'arrows', label: 'Arrows', slot: 2 }, { key: 'champion', label: 'Champions', slot: 3 }], '%'),
    table(['Night', 'Melee %', 'Arrows %', 'Champions %'], nightRows.map((n) => [n.night, n.damageShare.contact, n.damageShare.arrows, n.damageShare.champion])));

  const tierCard = card('Difficulty tiers', 'Win rate of seasons started on each tier.',
    bars(s.tiers.filter((t) => t.started).map((t) => ({ label: TIER[t.key], value: t.started ? (t.wins / t.started) * 100 : 0, text: `${pct(t.started ? (t.wins / t.started) * 100 : 0)} of ${fmt(t.started)}`, tip: `${TIER[t.key]}: ${t.wins} wins of ${t.started} seasons · median ${fmt(t.medianNights, 1)} nights` })), { max: 100 }),
    table(['Tier', 'Seasons', 'Wins', 'Median nights'], s.tiers.map((t) => [TIER[t.key], t.started, t.wins, fmt(t.medianNights, 1)])));

  const bossCard = card('Bosses', 'How often each boss is picked, and its win rate on hover.',
    bars(s.bosses.map((b) => ({ label: BOSS[b.key], value: b.started, text: fmt(b.started), tip: `${BOSS[b.key]}: ${b.started} seasons · ${b.wins} wins · median ${fmt(b.medianNights, 1)} nights` }))),
    table(['Boss', 'Seasons', 'Wins', 'Median nights'], s.bosses.map((b) => [BOSS[b.key], b.started, b.wins, fmt(b.medianNights, 1)])));

  const picks = card('Upgrade pick rate', 'How often an upgrade is taken when it is offered. Low rates are candidates to buff.',
    bars(s.picks.map((p) => ({ label: PICK[p.key] ?? p.key, value: p.rate, text: `${pct(p.rate)} · ${fmt(p.offered)}`, tip: `${PICK[p.key] ?? p.key}: picked ${p.picked} of ${p.offered} times offered` })), { max: 100 }),
    table(['Upgrade', 'Offered', 'Picked', 'Rate'], s.picks.map((p) => [PICK[p.key] ?? p.key, p.offered, p.picked, pct(p.rate)])) +
      `<p class="note">Everything maxed at a median of ${s.firstPickAllAt.medianMinutes === null ? '–' : fmt(s.firstPickAllAt.medianMinutes, 1) + ' min'} (${fmt(s.firstPickAllAt.seasons)} seasons).</p>`);

  const buildRows = s.builds.filter((b) => b.phases > 0);
  const builds = card('Building', 'Buildings placed in each build phase, all players together.',
    // Five types exceed the three validated colour slots, so the chart groups the three traps; the table keeps all five.
    stacked(buildRows.map((b) => ({ label: `Before night ${b.night}`, note: `${fmt(b.medianSpent)} gold`,
      parts: { wall: b.placed.wall ?? 0, traps: (b.placed.spikes ?? 0) + (b.placed.pad ?? 0) + (b.placed.saw ?? 0), tower: b.placed.tower ?? 0 } })),
      [{ key: 'wall', label: 'Walls', slot: 1 }, { key: 'traps', label: 'Traps (spikes, pads, saws)', slot: 2 }, { key: 'tower', label: 'Archer towers', slot: 3 }]),
    table(['Before night', 'Phases', 'Median gold spent', 'Median seconds', 'Repaired', ...BUILDINGS.map((k) => BUILDING[k])],
      buildRows.map((b) => [b.night, b.phases, fmt(b.medianSpent), fmt(b.medianSeconds), pct(b.repairedShare), ...BUILDINGS.map((k) => b.placed[k] ?? 0)])), true);

  const breakdown = (title: string, list: { key: string; n: number }[]) =>
    card(title, 'Share of sessions.', bars(list.slice(0, 8).map((c) => ({ label: c.key, value: c.n, text: `${pct((c.n / Math.max(1, a.sessions)) * 100)}`, tip: `${c.key}: ${c.n} sessions` }))),
      table(['', 'Sessions'], list.map((c) => [c.key, c.n])));

  const t = s.tech;
  const tech = card('Performance and settings', 'Frames per second during raids: median and the slowest 10%.',
    table(['Device', 'Nights measured', 'Median FPS', 'Slowest 10%'], t.fps.map((f) => [f.device, f.samples, fmt(f.median), fmt(f.low)])) +
      `<div class="tiles small">${[
        tile('Music off', pct(t.musicOffShare)), tile('Sound effects off', pct(t.sfxOffShare)), tile('Names refused', pct(t.nameRejectedShare)),
        tile('Errors', fmt(t.errors.reduce((x, e) => x + e.n, 0)), t.errors.map((e) => `${e.key} ${e.n}`).join(' · ')),
      ].join('')}</div>`,
    table(['Error', 'Count'], t.errors.map((e) => [e.key, e.n])));

  const since = s.trackingSince ? new Date(s.trackingSince).toLocaleDateString() : 'no data yet';
  return `${tiles}<div class="grid">${daily}${funnel}${outcome}${damage}${tierCard}${bossCard}${picks}${builds}${tech}` +
    `${breakdown('Devices', a.devices)}${breakdown('Browsers', a.browsers)}${breakdown('Languages', a.locales)}${breakdown('Countries', a.countries)}</div>` +
    `<p class="foot">Tracking since ${esc(since)} · updated ${esc(new Date(s.generatedAt).toLocaleTimeString())} · anonymous events only, kept 90 days</p>`;
}

async function load(): Promise<void> {
  const url = `/analytics/api/summary?days=${days}&traffic=${traffic}`;
  history.replaceState(null, '', `?days=${days}&traffic=${traffic}`);
  root.innerHTML = `<header><h1><span>BOSS MODE</span> Analytics</h1>${controls()}</header><main id="body"><p class="empty">Loading…</p></main>`;
  const body = document.getElementById('body') as HTMLElement;
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (r.status === 403) { location.reload(); return; }
    if (!r.ok) throw new Error(String(r.status));
    body.innerHTML = render((await r.json()) as Summary);
  } catch {
    body.innerHTML = '<p class="empty">Could not load the numbers. Try again in a moment.</p>';
  }
}

root.addEventListener('click', (e) => {
  const b = (e.target as Element).closest<HTMLElement>('[data-days],[data-traffic]');
  if (!b) return;
  if (b.dataset.days) days = Number(b.dataset.days);
  if (b.dataset.traffic) traffic = b.dataset.traffic;
  void load();
});
tooltips(root);
void load();
