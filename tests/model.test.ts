import { describe, expect, test } from 'vitest';
import { addToSeason, addToSession, BadEvent, median, newSession, normalize, summarize, type SeasonRecord, type SessionRecord } from '../worker/model';

const SID = '11111111-1111-4111-8111-111111111111';
const VID = '22222222-2222-4222-8222-222222222222';
const SEASON = '33333333-3333-4333-8333-333333333333';
const ctx = { sessionId: SID, visitorId: VID, device: 'mobile', browser: 'Chrome', locale: 'pt' };
const night = (n: number, outcome: string, extra: Record<string, unknown> = {}) => ({
  ...ctx, type: 'night', report: {
    season: SEASON, night: n, outcome, seconds: 90, hpPct: 50, vaultKept: 80, stolen: 5, kills: 300, buildingKillPct: 20, level: 10 + n,
    retries: 0, damage: { contact: 60, arrows: 30, champion: 10 }, buildings: { wall: 4, spikes: 2 }, destroyed: 1, ...extra,
  },
});

describe('normalize', () => {
  test('keeps only contract fields, so a name or free text sent by a client is never stored', () => {
    const e = normalize({ ...ctx, type: 'season_start', season: SEASON, boss: 'dragon', tier: 'normal', continued: false, name: 'Lucas', note: 'hi' });
    expect(e).toEqual({ ...ctx, test: undefined, type: 'season_start', season: SEASON, boss: 'dragon', tier: 'normal', continued: false });
    expect(JSON.stringify(e)).not.toContain('Lucas');
  });
  test('rejects unknown types, enums and malformed ids', () => {
    expect(() => normalize({ ...ctx, type: 'chat', text: 'x' })).toThrow(BadEvent);
    expect(() => normalize({ ...ctx, type: 'season_start', season: SEASON, boss: 'kraken', tier: 'normal', continued: false })).toThrow(BadEvent);
    expect(() => normalize({ ...ctx, sessionId: 'not-a-uuid', type: 'visit' })).toThrow(BadEvent);
    expect(() => normalize({ ...ctx, type: 'night', report: { ...night(1, 'survived').report, buildings: { castle: 1 } } })).toThrow(BadEvent);
  });
  test('clamps numbers into their ranges', () => {
    const e = normalize(night(1, 'survived', { hpPct: 400, kills: -5 }));
    expect(e.type === 'night' && [e.report.hpPct, e.report.kills]).toEqual([100, 0]);
  });
});

function build(events: Record<string, unknown>[], t0 = Date.parse('2026-09-20T12:00:00Z')) {
  let session: SessionRecord | undefined;
  let season: SeasonRecord | undefined;
  events.forEach((raw, i) => {
    const e = normalize(raw);
    const now = t0 + i * 60000;
    session = addToSession(session ?? newSession(e, 'BR', now), e, now) ?? session;
    session = session && { ...session, visitorKey: `real:${VID}`, newVisitor: true };
    season = addToSeason(season, e, now) ?? season;
  });
  return { session: session as SessionRecord, season: season as SeasonRecord, now: t0 + events.length * 60000 };
}

describe('summarize', () => {
  const { session, season, now } = build([
    { ...ctx, type: 'visit' },
    { ...ctx, type: 'season_start', season: SEASON, boss: 'slime', tier: 'heroic', continued: false },
    night(1, 'survived'),
    { ...ctx, type: 'pick', season: SEASON, night: 2, level: 12, offered: ['weapon:bats', 'passive:might', 'snack'], picked: 'weapon:bats' },
    night(2, 'hp'),
    night(2, 'survived', { retries: 1 }),
    night(3, 'vault', { retries: 1 }),
    { ...ctx, type: 'season_end', season: SEASON, outcome: 'vault', nights: 2, score: 4200, retries: 1, level: 14, seconds: 400, allPicksAt: null },
    { ...ctx, type: 'settings', music: false, sfx: true },
  ]);
  const s = summarize([session], [season], 30, 'real', now, now - 1e6);

  test('counts every attempt per night, so retries show up as extra attempts', () => {
    expect(s.nights[1]).toMatchObject({ night: 2, attempts: 2, survived: 1, hp: 1, vault: 0 });
    expect(s.nights[2]).toMatchObject({ night: 3, attempts: 1, survived: 0, vault: 1 });
  });
  test('the funnel uses the final attempt of each night: a retried night 2 counts as survived', () => {
    expect(s.funnel.map((f) => f.n)).toEqual([1, 1, 1, 0, 0, 0]);
  });
  test('damage share, picks, tiers and settings', () => {
    expect(s.nights[0].damageShare).toEqual({ contact: 60, arrows: 30, champion: 10 });
    expect(s.picks.find((p) => p.key === 'weapon:bats')).toEqual({ key: 'weapon:bats', offered: 1, picked: 1, rate: 100 });
    expect(s.picks.find((p) => p.key === 'passive:might')).toEqual({ key: 'passive:might', offered: 1, picked: 0, rate: 0 });
    expect(s.tiers.find((t) => t.key === 'heroic')).toEqual({ key: 'heroic', started: 1, wins: 0, medianNights: 2 });
    expect(s.tech.musicOffShare).toBe(100);
    expect(s.audience).toMatchObject({ sessions: 1, visitors: 1, newVisitors: 1, returningVisitors: 0 });
  });
  test('activity feed lists what happened, newest first, without ids or names', () => {
    expect(s.activity.map((a) => a.kind)).toEqual(['lost', 'start', 'visit']);
    expect(s.activity[0]).toMatchObject({ kind: 'lost', boss: 'slime', tier: 'heroic', night: 3, device: 'mobile', country: 'BR' });
    expect(JSON.stringify(s.activity)).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
  });
  test('daily rows split new from returning players, and the heatmap counts the session once', () => {
    const today = s.audience.daily.filter((d) => d.sessions > 0);
    expect(today).toEqual([expect.objectContaining({ sessions: 1, visitors: 1, newVisitors: 1, returning: 0, seasons: 1, wins: 0 })]);
    expect(s.hours.reduce((n, h) => n + h.sessions, 0)).toBe(1);
  });
  test('no comparison is offered before tracking covers the earlier period', () => {
    expect(s.previous?.available).toBe(false);
  });
  test('test traffic is kept apart from real traffic', () => {
    const t = summarize([{ ...session, test: true }], [{ ...season, test: true }], 30, 'real', now, null);
    expect([t.audience.sessions, t.seasons.started]).toEqual([0, 0]);
  });
  test('a season event from another session cannot create or join a season it did not start', () => {
    const other = normalize({ ...night(4, 'survived'), sessionId: '44444444-4444-4444-8444-444444444444' });
    expect(season.sessionId).toBe(SID);
    expect(addToSeason(season, other, now)).toBeNull();
    expect(addToSeason(season, normalize(night(4, 'survived')), now)?.nights.length).toBe(season.nights.length + 1);
  });
});

test('median', () => {
  expect([median([]), median([3]), median([1, 9, 2]), median([1, 2, 3, 10])]).toEqual([null, 3, 2, 2.5]);
});
