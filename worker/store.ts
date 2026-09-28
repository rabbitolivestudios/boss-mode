import { DurableObject } from 'cloudflare:workers';
import type { BoardRow, GameEvent, Summary, Traffic } from '../src/analytics/contract';
import { BOSS_IDS, TIER_IDS } from '../src/analytics/contract';
import { checkName } from '../src/game/nameguard';
import { addToSeason, addToSession, newSession, RETENTION_MS, summarize, type SeasonRecord, type SessionRecord } from './model';

const BOARD_SIZE = 10;
/** The best a real season can plausibly score (7 nights, a full vault, thousands of heroes, Legendary). */
const MAX_SCORE = 200000;

/**
 * One small private store for analytics and the public leaderboard. Only validated, anonymous
 * records are kept: no IPs, no names in analytics, nothing older than 90 days.
 */
export class Store extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env as never);
    const sql = ctx.storage.sql;
    sql.exec('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, first_at INTEGER NOT NULL, data TEXT NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS seasons (id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, data TEXT NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS visitors (id TEXT PRIMARY KEY, first_at INTEGER NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS board (player TEXT PRIMARY KEY, score INTEGER NOT NULL, data TEXT NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)');
    sql.exec('CREATE INDEX IF NOT EXISTS sessions_first ON sessions(first_at)');
    sql.exec('CREATE INDEX IF NOT EXISTS seasons_started ON seasons(started_at)');
    sql.exec('CREATE INDEX IF NOT EXISTS board_score ON board(score)');
    void ctx.blockConcurrencyWhile(async () => {
      if ((await ctx.storage.getAlarm()) === null) await ctx.storage.setAlarm(Date.now() + 86400000);
    });
  }

  /** Daily cleanup: analytics older than the retention window are deleted, not archived. */
  async alarm(): Promise<void> {
    const cutoff = Date.now() - RETENTION_MS;
    const sql = this.ctx.storage.sql;
    sql.exec('DELETE FROM sessions WHERE first_at<?', cutoff);
    sql.exec('DELETE FROM seasons WHERE started_at<?', cutoff);
    sql.exec('DELETE FROM visitors WHERE first_at<?', cutoff);
    await this.ctx.storage.setAlarm(Date.now() + 86400000);
  }

  private row<T>(table: 'sessions' | 'seasons', id: string): T | undefined {
    const r = this.ctx.storage.sql.exec<{ data: string }>(`SELECT data FROM ${table} WHERE id=?`, id).toArray()[0];
    return r ? (JSON.parse(r.data) as T) : undefined;
  }

  async record(e: GameEvent, country: string): Promise<void> {
    const now = Date.now();
    const sql = this.ctx.storage.sql;
    const prev = this.row<SessionRecord>('sessions', e.sessionId) ?? newSession(e, country, now);
    const session = addToSession(prev, e, now);
    if (!session) return;
    if (e.visitorId && session.visitorKey === null) {
      // Visitor ids are namespaced by traffic kind so test runs never make a real visitor look returning.
      const key = `${session.test ? 'test' : 'real'}:${e.visitorId}`;
      sql.exec('DELETE FROM visitors WHERE id=? AND first_at<?', key, now - RETENTION_MS);
      const inserted = sql.exec('INSERT OR IGNORE INTO visitors(id,first_at) VALUES (?,?)', key, now).rowsWritten > 0;
      session.visitorKey = key;
      session.newVisitor = inserted;
    }
    sql.exec('INSERT INTO sessions(id,first_at,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', session.id, session.firstAt, JSON.stringify(session));
    sql.exec("INSERT OR IGNORE INTO meta(key,value) VALUES ('tracking_since',?)", now);
    if ('season' in e || e.type === 'night' || e.type === 'build') {
      const seasonId = e.type === 'night' ? e.report.season : e.type === 'build' ? e.build.season : 'season' in e ? e.season : '';
      const season = addToSeason(this.row<SeasonRecord>('seasons', seasonId), e, now);
      if (season) {
        sql.exec('INSERT INTO seasons(id,started_at,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', season.id, season.startedAt, JSON.stringify({ ...season, test: season.test || session.test }));
      }
    }
  }

  async summary(days: number, traffic: Traffic): Promise<Summary> {
    const safeDays = [1, 7, 30, 90].includes(days) ? days : 30;
    const now = Date.now();
    const oldest = now - RETENTION_MS;
    const sql = this.ctx.storage.sql;
    const sessions = sql.exec<{ data: string }>('SELECT data FROM sessions WHERE first_at>=?', oldest).toArray().map((r) => JSON.parse(r.data) as SessionRecord);
    const seasons = sql.exec<{ data: string }>('SELECT data FROM seasons WHERE started_at>=?', oldest).toArray().map((r) => JSON.parse(r.data) as SeasonRecord);
    const since = sql.exec<{ value: number }>("SELECT value FROM meta WHERE key='tracking_since'").toArray()[0]?.value ?? null;
    return summarize(sessions, seasons, safeDays, traffic, now, since);
  }

  async board(player: string | null): Promise<BoardRow[]> {
    const rows = this.ctx.storage.sql.exec<{ player: string; data: string }>('SELECT player,data FROM board ORDER BY score DESC LIMIT ?', BOARD_SIZE).toArray();
    return rows.map((r) => ({ ...(JSON.parse(r.data) as BoardRow), me: player !== null && r.player === player || undefined }));
  }

  /** Keeps one row per player: their best season, under their current name. */
  async submit(player: string, raw: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
    const checked = checkName(String(raw.name ?? ''));
    if ('error' in checked) return { ok: false, error: checked.error };
    const score = Number(raw.score), nights = Number(raw.nights);
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return { ok: false, error: 'bad score' };
    if (!Number.isInteger(nights) || nights < 0 || nights > 7) return { ok: false, error: 'bad nights' };
    if (!BOSS_IDS.includes(raw.boss as never) || !TIER_IDS.includes(raw.tier as never)) return { ok: false, error: 'bad season' };
    const row: BoardRow = { name: checked.name, score, boss: raw.boss as BoardRow['boss'], tier: raw.tier as BoardRow['tier'], nights, win: raw.win === true, at: Date.now() };
    const sql = this.ctx.storage.sql;
    const prev = sql.exec<{ data: string }>('SELECT data FROM board WHERE player=?', player).toArray()[0];
    const old = prev ? (JSON.parse(prev.data) as BoardRow) : null;
    const best = !old || row.score > old.score ? row : { ...old, name: row.name };
    sql.exec('INSERT INTO board(player,score,data) VALUES (?,?,?) ON CONFLICT(player) DO UPDATE SET score=excluded.score, data=excluded.data', player, best.score, JSON.stringify(best));
    return { ok: true };
  }
}
