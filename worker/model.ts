import {
  BOSS_IDS, BROWSERS, PHASES, BUILDING_IDS, DEVICES, ERROR_CODES, LOCALES, NIGHT_OUTCOMES, PICK_IDS, SEASON_OUTCOMES, TIER_IDS,
  type Activity, type BuildReport, type BuildingKey, type Count, type GameEvent, type NightReport, type NightStats, type PickKey,
  type Summary, type Traffic,
} from '../src/analytics/contract';

/** Pure functions: validate client events, fold them into session and season records, summarize. */

export const RETENTION_MS = 90 * 86400000;
const MAX_EVENTS_PER_SESSION = 1500;
const TIME_ZONE = 'America/Chicago';
/** A game that pinged within this long counts as playing now; pings come every minute. */
export const LIVE_MS = 3 * 60000;

export interface SessionRecord {
  id: string; firstAt: number; lastAt: number; test: boolean; events: number;
  device: string; browser: string; locale: string; country: string;
  /** Whether this session's visitor was first seen in it; null when the browser sent no visitor id. */
  newVisitor: boolean | null; visitorKey: string | null;
  /** When this browser was first seen by the store; older records only have newVisitor. */
  visitorFirstAt?: number;
  visit: boolean; landing?: boolean; seasons: string[];
  settings: { music: boolean; sfx: boolean } | null;
  fps: [number, number][];
  errors: Record<string, number>;
  names: { accepted: number; rejected: number };
  /** What the game was doing at its latest ping. */
  now?: { phase: string; night: number };
}

export interface SeasonRecord {
  id: string; sessionId: string; test: boolean; startedAt: number;
  boss: string; tier: string; continued: boolean;
  nights: NightReport[]; builds: BuildReport[];
  picks: { night: number; level: number; offered: PickKey[]; picked: PickKey }[];
  end: { outcome: string; nights: number; score: number; retries: number; level: number; seconds: number; allPicksAt: number | null; endedAt?: number } | null;
}

export class BadEvent extends Error {}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function id(v: unknown): string { if (typeof v !== 'string' || !ID.test(v)) throw new BadEvent('id'); return v.toLowerCase(); }
function oneOf<T extends string>(list: readonly T[], v: unknown): T { if (!list.includes(v as T)) throw new BadEvent('enum'); return v as T; }
function num(v: unknown, lo: number, hi: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new BadEvent('number');
  return Math.min(hi, Math.max(lo, Math.round(v * 100) / 100));
}
function int(v: unknown, lo: number, hi: number): number { return Math.round(num(v, lo, hi)); }
function bool(v: unknown): boolean { if (typeof v !== 'boolean') throw new BadEvent('bool'); return v; }
function obj(v: unknown): Record<string, unknown> { if (!v || typeof v !== 'object' || Array.isArray(v)) throw new BadEvent('object'); return v as Record<string, unknown>; }
function perBuilding(v: unknown): Partial<Record<BuildingKey, number>> {
  const o = obj(v), out: Partial<Record<BuildingKey, number>> = {};
  for (const [k, n] of Object.entries(o)) out[oneOf(BUILDING_IDS, k)] = int(n, 0, 600);
  return out;
}

/** Rebuilds an event from only the fields the contract allows, rejecting anything malformed. */
export function normalize(raw: unknown): GameEvent {
  const e = obj(raw);
  const ctx = {
    sessionId: id(e.sessionId),
    visitorId: e.visitorId === undefined ? undefined : id(e.visitorId),
    test: e.test === true ? true : undefined,
    device: oneOf(DEVICES, e.device), browser: oneOf(BROWSERS, e.browser), locale: oneOf(LOCALES, e.locale),
  };
  switch (e.type) {
    case 'visit': return { ...ctx, type: 'visit' };
    case 'landing': return { ...ctx, type: 'landing' };
    case 'season_start':
      return { ...ctx, type: 'season_start', season: id(e.season), boss: oneOf(BOSS_IDS, e.boss), tier: oneOf(TIER_IDS, e.tier), continued: bool(e.continued) };
    case 'build': {
      const b = obj(e.build);
      return { ...ctx, type: 'build', build: {
        season: id(b.season), night: int(b.night, 1, 7), seconds: num(b.seconds, 0, 7200), spent: int(b.spent, 0, 1e5),
        gold: int(b.gold, 0, 1e5), placed: perBuilding(b.placed), sold: int(b.sold, 0, 1000), repaired: bool(b.repaired),
      } };
    }
    case 'night': {
      const r = obj(e.report), d = obj(r.damage);
      return { ...ctx, type: 'night', report: {
        season: id(r.season), night: int(r.night, 1, 7), outcome: oneOf(NIGHT_OUTCOMES, r.outcome), seconds: num(r.seconds, 0, 7200),
        hpPct: int(r.hpPct, 0, 100), vaultKept: int(r.vaultKept, 0, 1e5), stolen: int(r.stolen, 0, 1e5), kills: int(r.kills, 0, 1e6),
        buildingKillPct: int(r.buildingKillPct, 0, 100), level: int(r.level, 1, 500), retries: int(r.retries, 0, 1000),
        damage: { contact: num(d.contact, 0, 1e6), arrows: num(d.arrows, 0, 1e6), champion: num(d.champion, 0, 1e6) },
        buildings: perBuilding(r.buildings), destroyed: int(r.destroyed, 0, 600),
      } };
    }
    case 'pick': {
      if (!Array.isArray(e.offered) || e.offered.length < 1 || e.offered.length > 4) throw new BadEvent('offered');
      return { ...ctx, type: 'pick', season: id(e.season), night: int(e.night, 1, 7), level: int(e.level, 1, 500),
        offered: e.offered.map((p) => oneOf(PICK_IDS, p)), picked: oneOf(PICK_IDS, e.picked) };
    }
    case 'season_end':
      return { ...ctx, type: 'season_end', season: id(e.season), outcome: oneOf(SEASON_OUTCOMES, e.outcome), nights: int(e.nights, 0, 7),
        score: int(e.score, 0, 1e7), retries: int(e.retries, 0, 1000), level: int(e.level, 1, 500), seconds: num(e.seconds, 0, 86400),
        allPicksAt: e.allPicksAt === null ? null : num(e.allPicksAt, 0, 86400) };
    case 'settings': return { ...ctx, type: 'settings', music: bool(e.music), sfx: bool(e.sfx) };
    case 'perf': return { ...ctx, type: 'perf', fpsMedian: num(e.fpsMedian, 0, 500), fpsLow: num(e.fpsLow, 0, 500) };
    case 'name': return { ...ctx, type: 'name', accepted: bool(e.accepted) };
    case 'client_error': return { ...ctx, type: 'client_error', code: oneOf(ERROR_CODES, e.code) };
    case 'ping': return { ...ctx, type: 'ping', phase: oneOf(PHASES, e.phase), night: int(e.night, 0, 7) };
    default: throw new BadEvent('type');
  }
}

export function newSession(e: GameEvent, country: string, now: number): SessionRecord {
  return {
    id: e.sessionId, firstAt: now, lastAt: now, test: e.test === true, events: 0,
    device: e.device, browser: e.browser, locale: e.locale, country: /^[A-Z]{2}$/.test(country) ? country : 'XX',
    newVisitor: null, visitorKey: null, visit: false, seasons: [], settings: null, fps: [], errors: {}, names: { accepted: 0, rejected: 0 },
  };
}

/** Folds one event into its session. Returns null when the session is over its event budget. */
export function addToSession(prev: SessionRecord, e: GameEvent, now: number): SessionRecord | null {
  if (prev.events >= MAX_EVENTS_PER_SESSION) return null;
  const s: SessionRecord = { ...prev, lastAt: now, events: prev.events + 1, test: prev.test || e.test === true };
  if (e.type === 'visit') s.visit = true;
  if (e.type === 'landing') s.landing = true;
  if (e.type === 'ping') s.now = { phase: e.phase, night: e.night };
  if (e.type === 'season_start' && !s.seasons.includes(e.season) && s.seasons.length < 100) s.seasons = [...s.seasons, e.season];
  if (e.type === 'settings') s.settings = { music: e.music, sfx: e.sfx };
  if (e.type === 'perf' && s.fps.length < 60) s.fps = [...s.fps, [e.fpsMedian, e.fpsLow]];
  if (e.type === 'client_error') s.errors = { ...s.errors, [e.code]: (s.errors[e.code] ?? 0) + 1 };
  if (e.type === 'name') s.names = e.accepted ? { ...s.names, accepted: s.names.accepted + 1 } : { ...s.names, rejected: s.names.rejected + 1 };
  return s;
}

/** Folds a gameplay event into its season; returns null for events that are not about a season. */
export function addToSeason(prev: SeasonRecord | undefined, e: GameEvent, now: number): SeasonRecord | null {
  if (e.type === 'season_start') {
    if (prev) return prev;
    return { id: e.season, sessionId: e.sessionId, test: e.test === true, startedAt: now, boss: e.boss, tier: e.tier, continued: e.continued, nights: [], builds: [], picks: [], end: null };
  }
  // Only the session that started a season may add to it, so a guessed season id cannot write into another player's.
  if (!prev || prev.sessionId !== e.sessionId) return null;
  if (e.type === 'night' && prev.nights.length < 60) return { ...prev, nights: [...prev.nights, e.report] };
  if (e.type === 'build' && prev.builds.length < 60) return { ...prev, builds: [...prev.builds, e.build] };
  if (e.type === 'pick' && prev.picks.length < 400) return { ...prev, picks: [...prev.picks, { night: e.night, level: e.level, offered: e.offered, picked: e.picked }] };
  // A lost night can be retried, so the latest ending of a season is the one that stands.
  if (e.type === 'season_end') {
    return { ...prev, end: { outcome: e.outcome, nights: e.nights, score: e.score, retries: e.retries, level: e.level, seconds: e.seconds, allPicksAt: e.allPicksAt, endedAt: now } };
  }
  return null;
}

// ---------- Summary ----------

interface Player { first: number; laterDay: boolean; device: string; browser: string }

/**
 * Browsers that opened the game (not just the landing page), each with when it was first seen and
 * whether it played again on a later day than that, the definition Footy Draft uses. Anonymous ids
 * mean one child on a phone, a tablet and a home-screen app counts three times.
 */
function players(sessions: SessionRecord[]): Map<string, Player> {
  const out = new Map<string, Player>();
  for (const s of sessions) {
    if (!s.visitorKey || !s.visit) continue;
    // Older records only say whether the browser was new at that session; a later session of the same
    // browser says nothing about when it was first seen, so it must not pull the date back.
    const first = s.visitorFirstAt ?? (s.newVisitor ? s.firstAt : Infinity);
    const p = out.get(s.visitorKey) ?? { first, laterDay: false, device: s.device, browser: s.browser };
    p.first = Math.min(p.first, first);
    out.set(s.visitorKey, p);
  }
  // No first-seen date at all means the browser was first seen before this window.
  for (const p of out.values()) if (!Number.isFinite(p.first)) p.first = 0;
  for (const s of sessions) {
    const p = s.visitorKey ? out.get(s.visitorKey) : undefined;
    if (p && s.visit && day(s.firstAt) > day(p.first)) p.laterDay = true;
  }
  return out;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b), m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
const share = (part: number, whole: number): number | null => (whole ? Math.round((part / whole) * 1000) / 10 : null);
function counts(values: string[]): Count[] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);
}
const day = (t: number): string => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function weekdayHour(t: number): [number, number] {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(t);
  const wd = WEEKDAYS.indexOf(parts.find((p) => p.type === 'weekday')?.value ?? 'Sun');
  return [Math.max(0, wd), Number(parts.find((p) => p.type === 'hour')?.value ?? 0) % 24];
}
const ACTIVITY_SIZE = 14;

/** The attempt that counts for each night of a season: its last one, since a retry replaces a loss. */
function finalNights(s: SeasonRecord): NightReport[] {
  const byNight = new Map<number, NightReport>();
  for (const n of s.nights) byNight.set(n.night, n);
  return [...byNight.values()].sort((a, b) => a.night - b.night);
}
const nightsSurvived = (s: SeasonRecord): number => s.end?.nights ?? finalNights(s).filter((n) => n.outcome === 'survived').length;

export function summarize(
  allSessions: SessionRecord[], allSeasons: SeasonRecord[], days: number, traffic: Traffic, now: number, trackingSince: number | null,
): Summary {
  const from = now - days * 86400000;
  const keep = (test: boolean): boolean => traffic === 'all' || (traffic === 'test') === test;
  const sessions = allSessions.filter((s) => s.firstAt >= from && keep(s.test));
  const seasons = allSeasons.filter((s) => s.startedAt >= from && keep(s.test));

  const recent = allSessions.filter((s) => s.visit && keep(s.test) && now - s.lastAt <= LIVE_MS);
  const lastEvent = allSessions.filter((s) => keep(s.test)).reduce((m, s) => Math.max(m, s.lastAt), 0);
  const live = {
    windowMinutes: LIVE_MS / 60000, playing: recent.length, inRaid: recent.filter((s) => s.now?.phase === 'raid').length,
    lastEventAt: lastEvent ? new Date(lastEvent).toISOString() : null,
    now: recent.map((s) => ({ device: s.device, phase: s.now?.phase ?? 'title', night: s.now?.night ?? 0 })),
  };

  const people = players(sessions);
  const everyone = new Set(sessions.flatMap((s) => (s.visitorKey ? [s.visitorKey] : [])));
  const newVisitors = [...people.values()].filter((p) => p.first >= from).length;
  const returningVisitors = [...people.values()].filter((p) => p.laterDay).length;

  const dailyMap = new Map<string, { sessions: number; seasons: number; visitors: number; newVisitors: number; returning: number; wins: number }>();
  for (let t = from; t <= now; t += 86400000) dailyMap.set(day(t), { sessions: 0, seasons: 0, visitors: 0, newVisitors: 0, returning: 0, wins: 0 });
  const seenPerDay = new Map<string, Set<string>>();
  for (const s of sessions) {
    const key = day(s.firstAt), d = dailyMap.get(key);
    if (!d) continue;
    d.sessions++;
    const p = s.visitorKey ? people.get(s.visitorKey) : undefined;
    if (!p || !s.visit) continue;
    const seen = seenPerDay.get(key) ?? new Set<string>();
    seenPerDay.set(key, seen);
    if (seen.has(s.visitorKey as string)) continue;
    seen.add(s.visitorKey as string);
    d.visitors++;
    // New on the day the browser was first seen; returning on any later day it plays.
    if (key === day(p.first)) d.newVisitors++; else if (key > day(p.first)) d.returning++;
  }
  for (const s of seasons) {
    const d = dailyMap.get(day(s.startedAt)); if (d) d.seasons++;
    if (s.end?.outcome === 'win') { const w = dailyMap.get(day(s.end.endedAt ?? s.startedAt)); if (w) w.wins++; }
  }
  const hours = new Map<string, number>();
  for (const s of sessions) { const [w, h] = weekdayHour(s.firstAt); hours.set(`${w}:${h}`, (hours.get(`${w}:${h}`) ?? 0) + 1); }
  const activity: Activity[] = [];
  const where = (sessionId: string) => sessions.find((x) => x.id === sessionId);
  for (const s of sessions) if (s.visit) activity.push({ at: new Date(s.firstAt).toISOString(), kind: 'visit', device: s.device, country: s.country });
  for (const s of seasons) {
    const x = where(s.sessionId);
    const base = { boss: s.boss, tier: s.tier, device: x?.device ?? 'desktop', country: x?.country ?? 'XX' };
    activity.push({ ...base, at: new Date(s.startedAt).toISOString(), kind: 'start' });
    if (s.end) {
      const kind = s.end.outcome === 'win' ? 'win' : s.end.outcome === 'quit' ? 'quit' : 'lost';
      activity.push({ ...base, at: new Date(s.end.endedAt ?? s.startedAt).toISOString(), kind, night: Math.min(7, s.end.nights + (kind === 'win' ? 0 : 1)), outcome: s.end.outcome });
    }
  }
  activity.sort((a, b) => (a.at < b.at ? 1 : -1));
  const prevFrom = from - days * 86400000;
  const before = allSessions.filter((s) => s.firstAt >= prevFrom && s.firstAt < from && keep(s.test));
  const beforeSeasons = allSeasons.filter((s) => s.startedAt >= prevFrom && s.startedAt < from && keep(s.test));
  const beforePeople = players(before);
  const previous = {
    // Comparisons only mean something once tracking covers the whole earlier window.
    available: trackingSince !== null && trackingSince <= prevFrom,
    visitors: beforePeople.size, returning: [...beforePeople.values()].filter((p) => p.laterDay).length,
    seasons: beforeSeasons.length, wins: beforeSeasons.filter((s) => s.end?.outcome === 'win').length,
  };

  const bySession = new Map<string, SeasonRecord[]>();
  for (const s of seasons) bySession.set(s.sessionId, [...(bySession.get(s.sessionId) ?? []), s]);
  const reached = (test: (s: SeasonRecord) => boolean): number => sessions.filter((x) => (bySession.get(x.id) ?? []).some(test)).length;
  const survivedNight = (n: number) => (s: SeasonRecord) => finalNights(s).some((r) => r.night === n && r.outcome === 'survived');

  const finished = seasons.filter((s) => s.end);
  const nights: NightStats[] = [];
  for (let n = 1; n <= 7; n++) {
    const attempts = seasons.flatMap((s) => s.nights.filter((r) => r.night === n));
    const survived = attempts.filter((r) => r.outcome === 'survived');
    const dmg = attempts.reduce((a, r) => ({ contact: a.contact + r.damage.contact, arrows: a.arrows + r.damage.arrows, champion: a.champion + r.damage.champion }), { contact: 0, arrows: 0, champion: 0 });
    const total = dmg.contact + dmg.arrows + dmg.champion;
    nights.push({
      night: n, attempts: attempts.length, survived: survived.length,
      hp: attempts.filter((r) => r.outcome === 'hp').length, vault: attempts.filter((r) => r.outcome === 'vault').length,
      medianHpPct: median(survived.map((r) => r.hpPct)), medianVaultKept: median(survived.map((r) => r.vaultKept)),
      medianBuildingKillPct: median(attempts.map((r) => r.buildingKillPct)), medianLevel: median(attempts.map((r) => r.level)),
      damageShare: { contact: share(dmg.contact, total) ?? 0, arrows: share(dmg.arrows, total) ?? 0, champion: share(dmg.champion, total) ?? 0 },
    });
  }

  const group = (key: 'tier' | 'boss', ids: readonly string[]) => ids.map((k) => {
    const g = seasons.filter((s) => s[key] === k);
    return { key: k, started: g.length, wins: g.filter((s) => s.end?.outcome === 'win').length, medianNights: median(g.filter((s) => s.end).map(nightsSurvived)) };
  });

  const offered = new Map<string, number>(), picked = new Map<string, number>();
  for (const s of seasons) for (const p of s.picks) {
    for (const o of new Set(p.offered)) offered.set(o, (offered.get(o) ?? 0) + 1);
    picked.set(p.picked, (picked.get(p.picked) ?? 0) + 1);
  }
  const allPicks = finished.map((s) => s.end?.allPicksAt).filter((v): v is number => typeof v === 'number');

  const builds = [];
  for (let n = 1; n <= 7; n++) {
    const b = seasons.flatMap((s) => s.builds.filter((x) => x.night === n));
    const placed: Partial<Record<BuildingKey, number>> = {};
    for (const x of b) for (const [k, v] of Object.entries(x.placed) as [BuildingKey, number][]) placed[k] = (placed[k] ?? 0) + v;
    builds.push({ night: n, phases: b.length, medianSpent: median(b.map((x) => x.spent)), placed, medianSeconds: median(b.map((x) => x.seconds)), repairedShare: share(b.filter((x) => x.repaired).length, b.length) });
  }

  const withSettings = sessions.filter((s) => s.settings);
  const nameTries = sessions.reduce((a, s) => a + s.names.accepted + s.names.rejected, 0);
  const lengths = sessions.filter((s) => s.events > 1).map((s) => (s.lastAt - s.firstAt) / 60000);

  return {
    generatedAt: new Date(now).toISOString(),
    period: { days, from: new Date(from).toISOString(), to: new Date(now).toISOString() },
    trackingSince: trackingSince ? new Date(trackingSince).toISOString() : null,
    traffic,
    audience: {
      sessions: sessions.length, visitors: people.size, newVisitors, returningVisitors, browsersSeen: everyone.size,
      playerDevices: counts([...people.values()].map((p) => `${p.device}|${p.browser}`)),
      medianSessionMinutes: median(lengths),
      landing: { sessions: sessions.filter((s) => s.landing).length, played: sessions.filter((s) => s.landing && s.visit).length },
      daily: [...dailyMap].map(([date, v]) => ({ date, ...v })),
      devices: counts(sessions.map((s) => s.device)), browsers: counts(sessions.map((s) => s.browser)),
      locales: counts(sessions.map((s) => s.locale)), countries: counts(sessions.map((s) => s.country)),
    },
    funnel: [
      { key: 'visit', label: 'Opened game', n: sessions.filter((s) => s.visit).length },
      { key: 'start', label: 'Started season', n: reached(() => true) },
      { key: 'n1', label: 'Survived night 1', n: reached(survivedNight(1)) },
      { key: 'n3', label: 'Survived night 3', n: reached(survivedNight(3)) },
      { key: 'n5', label: 'Survived night 5', n: reached(survivedNight(5)) },
      { key: 'win', label: 'Won season', n: reached((s) => s.end?.outcome === 'win') },
    ],
    hours: [...hours].map(([k, n]) => { const [w, h] = k.split(':').map(Number); return { weekday: w, hour: h, sessions: n }; }),
    live,
    activity: activity.slice(0, ACTIVITY_SIZE),
    previous,
    seasons: {
      started: seasons.length, finished: finished.length, wins: finished.filter((s) => s.end?.outcome === 'win').length,
      outcomes: counts(finished.map((s) => s.end?.outcome ?? '')),
      medianNights: median(finished.map(nightsSurvived)), medianScore: median(finished.map((s) => s.end?.score ?? 0)),
      retriesPerSeason: finished.length ? Math.round((finished.reduce((a, s) => a + (s.end?.retries ?? 0), 0) / finished.length) * 100) / 100 : null,
      continuedShare: share(seasons.filter((s) => s.continued).length, seasons.length),
    },
    nights,
    tiers: group('tier', TIER_IDS),
    bosses: group('boss', BOSS_IDS),
    picks: PICK_IDS.map((k) => ({ key: k, offered: offered.get(k) ?? 0, picked: picked.get(k) ?? 0, rate: share(picked.get(k) ?? 0, offered.get(k) ?? 0) ?? 0 }))
      .filter((p) => p.offered > 0).sort((a, b) => b.rate - a.rate),
    firstPickAllAt: { medianMinutes: median(allPicks.map((v) => v / 60)), seasons: allPicks.length },
    builds,
    tech: {
      fps: DEVICES.map((d) => {
        const f = sessions.filter((s) => s.device === d).flatMap((s) => s.fps);
        return { device: d, samples: f.length, median: median(f.map((x) => x[0])), low: median(f.map((x) => x[1])) };
      }),
      errors: counts(sessions.flatMap((s) => Object.entries(s.errors).flatMap(([k, n]) => Array<string>(n).fill(k)))),
      musicOffShare: share(withSettings.filter((s) => !s.settings?.music).length, withSettings.length),
      sfxOffShare: share(withSettings.filter((s) => !s.settings?.sfx).length, withSettings.length),
      nameRejectedShare: share(sessions.reduce((a, s) => a + s.names.rejected, 0), nameTries),
    },
  };
}
