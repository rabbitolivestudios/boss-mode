import type { Activity, Summary } from '../analytics/contract';
import { bars, card, countryName, dailyColumns, donut, empty, esc, flag, fmt, funnel, heatmap, kpi, pct, stacked, table } from './charts';
import { icon, type IconName } from './icons';
import { insights } from './insights';
import { BOSS, BUILDING, BUILDINGS, DEVICE, LOCALE, PICK, TIER } from './labels';

/** Each tab of the dashboard, drawn from one summary. */

const last14 = <T>(a: T[]): T[] => a.slice(-14);
const share = (part: number, whole: number): number | null => (whole ? (part / whole) * 100 : null);

function kpis(s: Summary): string {
  const d = last14(s.audience.daily), p = s.previous?.available ? s.previous : null;
  return `<div class="kpis">${[
    kpi({ ic: 'users', label: 'Players', value: fmt(s.audience.visitors), spark: d.map((x) => x.visitors), slot: 1, now: s.audience.visitors, before: p ? p.visitors : null, note: `Browsers that opened the game, not people: a phone, a tablet and a home-screen app count as three.${s.audience.browsersSeen > s.audience.visitors ? ` ${fmt(s.audience.browsersSeen - s.audience.visitors)} more only saw the landing page.` : ''}` }),
    kpi({ ic: 'returning', label: 'Came back', value: fmt(s.audience.returningVisitors), spark: d.map((x) => x.returning), slot: 3, now: s.audience.returningVisitors, before: p ? p.returning : null, note: 'Played again on a later day than their first visit.' }),
    kpi({ ic: 'swords', label: 'Seasons started', value: fmt(s.seasons.started), spark: d.map((x) => x.seasons), slot: 2, now: s.seasons.started, before: p ? p.seasons : null, note: `${fmt(s.seasons.finished)} finished · ${pct(s.seasons.continuedShare)} continued from a save` }),
    kpi({ ic: 'crown', label: 'Seasons won', value: fmt(s.seasons.wins), spark: d.map((x) => x.wins), slot: 1, now: s.seasons.wins, before: p ? p.wins : null, note: `${pct(share(s.seasons.wins, s.seasons.finished))} of finished seasons` }),
  ].join('')}</div>`;
}

function strip(s: Summary): string {
  const errors = s.tech.errors.reduce((a, e) => a + e.n, 0);
  const item = (ic: IconName, label: string, value: string) => `<span class="strip-item">${icon(ic, 'ic tiny')} ${esc(label)} <b>${esc(value)}</b></span>`;
  return `<div class="strip">${[
    item('activity', 'Sessions', fmt(s.audience.sessions)),
    item('timer', 'Median session', s.audience.medianSessionMinutes === null ? '–' : `${fmt(s.audience.medianSessionMinutes, 1)} min`),
    item('target', 'Median nights reached', s.seasons.medianNights === null ? '–' : fmt(s.seasons.medianNights, 1)),
    item('returning', 'Retries per season', s.seasons.retriesPerSeason === null ? '–' : fmt(s.seasons.retriesPerSeason, 2)),
    item('door', 'Landing → play', pct(share(s.audience.landing.played, s.audience.landing.sessions))),
    item('alert', 'Errors', fmt(errors)),
  ].join('')}</div>`;
}

function banner(s: Summary): string {
  const lines = insights(s);
  return `<div class="banner"><span class="banner-tag">${icon('idea', 'ic tiny')} Reading of the period</span><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></div>`;
}

function dailyCard(s: Summary): string {
  const days = s.audience.daily;
  return card({
    title: 'Players per day', ic: 'chart', hint: 'New and returning players each day, Chicago time. Hover a day for sessions and seasons.', cls: 'wide-2',
    body: dailyColumns(days.map((d) => ({ date: d.date, a: d.newVisitors, b: d.returning, tip: `${d.date}: ${d.newVisitors} new, ${d.returning} returning · ${d.sessions} sessions · ${d.seasons} seasons · ${d.wins} wins` })),
      [{ key: 'new', label: 'New', slot: 1 }, { key: 'ret', label: 'Returning', slot: 3 }]),
    table: table(['Day', 'New', 'Returning', 'Sessions', 'Seasons', 'Wins'], days.map((d) => [d.date, d.newVisitors, d.returning, d.sessions, d.seasons, d.wins])),
  });
}

function funnelCard(s: Summary): string {
  const ics: IconName[] = ['door', 'swords', 'castle', 'skull', 'trophy', 'crown'];
  return card({
    title: 'From opening to winning', ic: 'target', hint: 'Sessions reaching each stage. A retried night counts once it is survived.',
    body: funnel(s.funnel.map((f, i) => ({ label: f.label, ic: ics[i] ?? 'target', n: f.n }))),
    table: table(['Stage', 'Sessions'], s.funnel.map((f) => [f.label, f.n])),
  });
}

const ACT: Record<Activity['kind'], { ic: IconName; slot: 1 | 2 | 3; text: (a: Activity) => string }> = {
  visit: { ic: 'door', slot: 3, text: () => 'Opened the game' },
  start: { ic: 'swords', slot: 2, text: (a) => `Started a ${TIER[a.tier ?? ''] ?? ''} season as ${BOSS[a.boss ?? ''] ?? 'a boss'}` },
  win: { ic: 'crown', slot: 1, text: (a) => `Won the season with ${BOSS[a.boss ?? ''] ?? 'a boss'} 👑` },
  lost: { ic: 'skull', slot: 2, text: (a) => `${a.outcome === 'vault' ? 'Robbed' : 'Defeated'} on night ${a.night ?? '?'} (${TIER[a.tier ?? ''] ?? ''})` },
  quit: { ic: 'logout', slot: 3, text: (a) => `Quit on night ${a.night ?? '?'}` },
};

function activityCard(s: Summary): string {
  const time = (at: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(at));
  const body = s.activity.length ? `<ul class="feed">${s.activity.map((a) => {
    const k = ACT[a.kind];
    return `<li><span class="kpi-ic slot-${k.slot}">${icon(k.ic)}</span><span class="feed-text"><b>${esc(k.text(a))}</b><small>${flag(a.country)} ${esc(countryName(a.country))} · ${esc(DEVICE[a.device] ?? a.device)}</small></span><time>${esc(time(a.at))}</time></li>`;
  }).join('')}</ul>` : empty();
  return card({ title: 'Latest activity', ic: 'activity', hint: 'The most recent things that happened. No names, no ids.', body });
}

function heatCard(s: Summary): string {
  return card({ title: 'When they play', ic: 'clock', hint: 'Sessions by weekday and hour. Tap a cell for the count.', body: heatmap(s.hours) });
}

function deviceCard(s: Summary): string {
  const n = (k: string) => s.audience.devices.find((d) => d.key === k)?.n ?? 0;
  return card({
    title: 'Devices', ic: 'phone', hint: 'Share of sessions.',
    body: donut([{ label: 'Phone', ic: 'phone', value: n('mobile'), slot: 1 }, { label: 'Computer', ic: 'monitor', value: n('desktop'), slot: 2 }, { label: 'Tablet', ic: 'tablet', value: n('tablet'), slot: 3 }], 'sessions'),
  });
}

function breakdown(title: string, ic: IconName, list: { key: string; n: number }[], total: number, label: (k: string) => string, lead?: (k: string) => string): string {
  return card({
    title, ic, hint: 'Share of sessions.',
    body: bars(list.slice(0, 6).map((c) => ({ label: label(c.key), lead: lead ? `<span class="lead">${lead(c.key)}</span>` : '', value: c.n, text: `${fmt(c.n)} · ${pct(share(c.n, total))}`, tip: `${label(c.key)}: ${c.n} sessions` })), { slot: 3 }),
    table: table(['', 'Sessions'], list.map((c) => [label(c.key), c.n])),
  });
}

const countries = (s: Summary) => breakdown('Countries', 'globe', s.audience.countries, s.audience.sessions, countryName, flag);

export function overview(s: Summary): string {
  return `${kpis(s)}${strip(s)}<div class="grid">${dailyCard(s)}${funnelCard(s)}</div>${banner(s)}` +
    `<div class="grid">${heatCard(s)}${activityCard(s)}</div>` +
    `<h3 class="section">${icon('users', 'ic')} Who plays</h3><div class="grid three">${deviceCard(s)}${countries(s)}${breakdown('Languages', 'languages', s.audience.locales, s.audience.sessions, (k) => LOCALE[k] ?? k)}</div>`;
}

export function players(s: Summary): string {
  const a = s.audience;
  return `${kpis(s)}<div class="grid">${dailyCard(s)}${card({
    title: 'Landing page', ic: 'door', hint: 'Visitors who saw the front page, and how many pressed play.',
    body: bars([{ label: 'Saw the landing page', value: a.landing.sessions, text: fmt(a.landing.sessions), tip: 'Sessions that opened bossmode.mac-tbo.com' },
      { label: 'Went on to play', value: a.landing.played, text: `${fmt(a.landing.played)} · ${pct(share(a.landing.played, a.landing.sessions))}`, tip: 'Of those, sessions that opened the game' }], { slot: 1 }),
  })}</div><div class="grid">${heatCard(s)}${card({
    title: 'Players by device and browser', ic: 'phone', hint: 'Each line is one browser that opened the game. Your own phone, computer and home-screen app each appear here, so this is the place to recognise yourself.',
    body: bars(a.playerDevices.map((c) => { const [dev, br] = c.key.split('|'); return { label: `${DEVICE[dev] ?? dev} · ${br}`, value: c.n, text: `${fmt(c.n)} player${c.n === 1 ? '' : 's'}`, tip: `${c.n} browsers` }; }), { slot: 1 }),
    table: table(['Device · browser', 'Players'], a.playerDevices.map((c) => [c.key.replace('|', ' · '), c.n])),
  })}</div><div class="grid">${activityCard(s)}${deviceCard(s)}</div><div class="grid three">${countries(s)}` +
    `${breakdown('Browsers', 'globe', a.browsers, a.sessions, (k) => k)}${breakdown('Languages', 'languages', a.locales, a.sessions, (k) => LOCALE[k] ?? k)}</div>`;
}

export function difficulty(s: Summary): string {
  const rows = s.nights.filter((n) => n.attempts > 0);
  const winRate = (w: number, n: number) => (n ? (w / n) * 100 : 0);
  return `${banner(s)}<div class="grid">${card({
    title: 'Every night, every try', ic: 'skull', hint: 'Attempts at each night, retries included. Defeated = the boss fell. Robbed = the vault was emptied.', cls: 'wide-2',
    body: stacked(rows.map((n) => ({ label: `Night ${n.night}`, parts: { survived: n.survived, hp: n.hp, vault: n.vault }, note: `${fmt(n.attempts)} tries · ${pct(winRate(n.survived, n.attempts))} survived` })),
      [{ key: 'survived', label: 'Survived', slot: 3 }, { key: 'hp', label: 'Defeated', slot: 2 }, { key: 'vault', label: 'Robbed', slot: 1 }]),
    table: table(['Night', 'Tries', 'Survived', 'Defeated', 'Robbed', 'Median HP left', 'Median gold kept', 'Median kills by buildings', 'Median level'],
      rows.map((n) => [n.night, n.attempts, n.survived, n.hp, n.vault, pct(n.medianHpPct), fmt(n.medianVaultKept), pct(n.medianBuildingKillPct), fmt(n.medianLevel)])),
  })}${card({
    title: 'What hurts the boss', ic: 'heart', hint: 'Share of damage taken each night, by source.',
    body: stacked(rows.map((n) => ({ label: `Night ${n.night}`, parts: n.damageShare })),
      [{ key: 'contact', label: 'Melee heroes', slot: 2 }, { key: 'arrows', label: 'Arrows', slot: 3 }, { key: 'champion', label: 'Champions', slot: 1 }], '%'),
    table: table(['Night', 'Melee %', 'Arrows %', 'Champions %'], rows.map((n) => [n.night, n.damageShare.contact, n.damageShare.arrows, n.damageShare.champion])),
  })}</div><div class="grid">${card({
    title: 'Difficulty tiers', ic: 'target', hint: 'Win rate of seasons started on each tier.',
    body: bars(s.tiers.filter((t) => t.started).map((t) => ({ label: TIER[t.key], value: winRate(t.wins, t.started), text: `${pct(winRate(t.wins, t.started))} of ${fmt(t.started)}`, tip: `${TIER[t.key]}: ${t.wins} wins, median ${fmt(t.medianNights, 1)} nights`, sub: `median ${fmt(t.medianNights, 1)} nights reached` })), { max: 100, slot: 1 }),
    table: table(['Tier', 'Seasons', 'Wins', 'Median nights'], s.tiers.map((t) => [TIER[t.key], t.started, t.wins, fmt(t.medianNights, 1)])),
  })}${card({
    title: 'Bosses', ic: 'crown', hint: 'How often each boss is picked, and how it does.',
    body: bars(s.bosses.map((b) => ({ label: BOSS[b.key], value: b.started, text: `${fmt(b.started)} seasons`, tip: `${BOSS[b.key]}: ${b.wins} wins`, sub: `${pct(winRate(b.wins, b.started))} won · median ${fmt(b.medianNights, 1)} nights` })), { slot: 2 }),
    table: table(['Boss', 'Seasons', 'Wins', 'Median nights'], s.bosses.map((b) => [BOSS[b.key], b.started, b.wins, fmt(b.medianNights, 1)])),
  })}</div>`;
}

export function builds(s: Summary): string {
  const rows = s.builds.filter((b) => b.phases > 0);
  return `<div class="grid">${card({
    title: 'Upgrade pick rate', ic: 'sparkles', hint: 'How often an upgrade is taken when it is offered. Low rates are candidates to buff.', cls: 'tall',
    body: bars(s.picks.map((p) => ({ label: PICK[p.key] ?? p.key, value: p.rate, text: `${pct(p.rate)}`, tip: `${PICK[p.key] ?? p.key}: picked ${p.picked} of ${p.offered} times offered`, sub: `picked ${fmt(p.picked)} of ${fmt(p.offered)} offers` })), { max: 100, slot: 1 }) +
      `<p class="note">${icon('timer', 'ic tiny')} Everything maxed at a median of ${s.firstPickAllAt.medianMinutes === null ? '–' : `${fmt(s.firstPickAllAt.medianMinutes, 1)} min`} (${fmt(s.firstPickAllAt.seasons)} seasons).</p>`,
    table: table(['Upgrade', 'Offered', 'Picked', 'Rate'], s.picks.map((p) => [PICK[p.key] ?? p.key, p.offered, p.picked, pct(p.rate)])),
  })}${card({
    title: 'Building between nights', ic: 'hammer', hint: 'Buildings placed before each night, all players together. Traps = spikes, pads and saws.',
    // Five building types exceed the three validated colour slots, so the chart groups the traps; the table keeps all five.
    body: stacked(rows.map((b) => ({ label: `Before night ${b.night}`, note: `${fmt(b.medianSpent)} gold · ${fmt(b.medianSeconds)}s`,
      parts: { wall: b.placed.wall ?? 0, traps: (b.placed.spikes ?? 0) + (b.placed.pad ?? 0) + (b.placed.saw ?? 0), tower: b.placed.tower ?? 0 } })),
      [{ key: 'wall', label: 'Walls', slot: 3 }, { key: 'traps', label: 'Traps', slot: 2 }, { key: 'tower', label: 'Archer towers', slot: 1 }]),
    table: table(['Before night', 'Build phases', 'Median gold spent', 'Median seconds', 'Repaired', ...BUILDINGS.map((k) => BUILDING[k])],
      rows.map((b) => [b.night, b.phases, fmt(b.medianSpent), fmt(b.medianSeconds), pct(b.repairedShare), ...BUILDINGS.map((k) => b.placed[k] ?? 0)])),
  })}</div>`;
}

export function performance(s: Summary): string {
  const t = s.tech;
  const errors = t.errors.reduce((a, e) => a + e.n, 0);
  const fpsRows = t.fps.filter((f) => f.samples > 0);
  return `<div class="grid">${card({
    title: 'Smoothness', ic: 'gauge', hint: 'Frames per second during raids: typical, and the slowest 10% of moments. 60 is perfect; under 30 feels choppy.',
    body: fpsRows.length ? bars(fpsRows.map((f) => ({ label: DEVICE[f.device] ?? f.device, lead: icon(f.device === 'mobile' ? 'phone' : f.device === 'tablet' ? 'tablet' : 'monitor', 'ic lead-ic'), value: f.median ?? 0, text: `${fmt(f.median)} fps`, tip: `${f.samples} nights measured`, sub: `slowest 10%: ${fmt(f.low)} fps · ${fmt(f.samples)} nights measured` })), { max: 60, slot: 3 }) : empty(),
    table: table(['Device', 'Nights measured', 'Median FPS', 'Slowest 10%'], t.fps.map((f) => [DEVICE[f.device] ?? f.device, f.samples, fmt(f.median), fmt(f.low)])),
  })}${card({
    title: 'Settings and safety', ic: 'sound', hint: 'Share of sessions that changed sound, and name attempts the filter refused.',
    body: bars([
      { label: 'Music off', lead: icon('music', 'ic lead-ic'), value: t.musicOffShare ?? 0, text: pct(t.musicOffShare), tip: 'Sessions with music switched off' },
      { label: 'Sound effects off', lead: icon('sound', 'ic lead-ic'), value: t.sfxOffShare ?? 0, text: pct(t.sfxOffShare), tip: 'Sessions with effects switched off' },
      { label: 'Names refused', lead: icon('alert', 'ic lead-ic'), value: t.nameRejectedShare ?? 0, text: pct(t.nameRejectedShare), tip: 'Name attempts blocked by the filter' },
    ], { max: 100, slot: 2 }),
  })}${card({
    title: 'Errors', ic: 'alert', hint: 'Only a category is recorded, never the message.',
    body: errors ? bars(t.errors.map((e) => ({ label: e.key, value: e.n, text: fmt(e.n), tip: `${e.key}: ${e.n}` })), { slot: 2 }) : `<p class="empty ok">${icon('sparkles', 'ic tiny')} No errors in this period.</p>`,
  })}</div>`;
}
