import { DurableObject } from 'cloudflare:workers';
import type { BoardRow, GameEvent, Summary, Traffic } from '../src/analytics/contract';
import { BOSS_IDS, TIER_IDS } from '../src/analytics/contract';
import { checkName } from '../src/game/nameguard';
import { addToSeason, addToSession, newSession, RETENTION_MS, summarize, type SeasonRecord, type SessionRecord } from './model';

const BOARD_SIZE = 10;
/** Rows kept in the Hall; far more than are shown, so a new season is compared against everyone. */
const HALL_KEEP = 500;
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
    sql.exec('CREATE TABLE IF NOT EXISTS secrets (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
    sql.exec('CREATE INDEX IF NOT EXISTS sessions_first ON sessions(first_at)');
    sql.exec('CREATE INDEX IF NOT EXISTS seasons_started ON seasons(started_at)');
    sql.exec('CREATE INDEX IF NOT EXISTS board_score ON board(score)');
    // The Hall lists seasons, not players: one row per player and season, so every good run can show.
    // The old one-row-per-player board is copied in once, each row standing as that player's earlier season.
    sql.exec('CREATE TABLE IF NOT EXISTS hall (id TEXT PRIMARY KEY, player TEXT NOT NULL, score INTEGER NOT NULL, data TEXT NOT NULL)');
    sql.exec('CREATE INDEX IF NOT EXISTS hall_score ON hall(score)');
    sql.exec('CREATE INDEX IF NOT EXISTS hall_player ON hall(player)');
    if (!sql.exec('SELECT 1 FROM meta WHERE key=?', 'hall_migrated').toArray().length) {
      sql.exec("INSERT OR IGNORE INTO hall(id,player,score,data) SELECT player || ':earlier', player, score, data FROM board");
      sql.exec('INSERT INTO meta(key,value) VALUES (?,?)', 'hall_migrated', Date.now());
    }
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
      // An explicit lookup, since a cursor's rowsWritten is not guaranteed final until it is consumed.
      const known = sql.exec<{ first_at: number }>('SELECT first_at FROM visitors WHERE id=?', key).toArray()[0];
      if (!known) sql.exec('INSERT INTO visitors(id,first_at) VALUES (?,?)', key, now);
      session.visitorKey = key;
      session.newVisitor = !known;
      session.visitorFirstAt = known?.first_at ?? now;
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

  /**
   * The key that signs dashboard sessions when none is set as a Worker secret: made once at random
   * and kept only in this store, so it is never in the code, the repo or the deploy settings.
   */
  async sessionSecret(): Promise<string> {
    const sql = this.ctx.storage.sql;
    const found = sql.exec<{ value: string }>("SELECT value FROM secrets WHERE key='session'").toArray()[0];
    if (found) return found.value;
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const value = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    sql.exec("INSERT OR IGNORE INTO secrets(key,value) VALUES ('session',?)", value);
    return sql.exec<{ value: string }>("SELECT value FROM secrets WHERE key='session'").toArray()[0].value;
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

  /**
   * Copies the anonymous analytics (sessions and seasons, never the name leaderboard) into the D1
   * database, so they can be read from the Cloudflare account without the dashboard. Rows are the
   * same validated JSON the dashboard uses; rows past retention are dropped there too.
   */
  async mirror(): Promise<{ sessions: number; seasons: number } | null> {
    const db = (this.env as { DB?: D1Database }).DB;
    if (!db) return null;
    await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, first_at INTEGER NOT NULL, data TEXT NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS seasons (id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, data TEXT NOT NULL)'),
      db.prepare('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)'),
    ]);
    const sql = this.ctx.storage.sql;
    const cutoff = Date.now() - RETENTION_MS;
    const sessions = sql.exec<{ id: string; first_at: number; data: string }>('SELECT id,first_at,data FROM sessions').toArray();
    const seasons = sql.exec<{ id: string; started_at: number; data: string }>('SELECT id,started_at,data FROM seasons').toArray();
    const writes: D1PreparedStatement[] = [
      ...sessions.map((r) => db.prepare('INSERT INTO sessions(id,first_at,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind(r.id, r.first_at, r.data)),
      ...seasons.map((r) => db.prepare('INSERT INTO seasons(id,started_at,data) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').bind(r.id, r.started_at, r.data)),
      db.prepare('DELETE FROM sessions WHERE first_at<?').bind(cutoff),
      db.prepare('DELETE FROM seasons WHERE started_at<?').bind(cutoff),
      db.prepare("INSERT INTO meta(key,value) VALUES ('mirrored_at',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(new Date().toISOString()),
    ];
    for (let i = 0; i < writes.length; i += 80) await db.batch(writes.slice(i, i + 80));
    return { sessions: sessions.length, seasons: seasons.length };
  }

  async board(player: string | null): Promise<BoardRow[]> {
    const rows = this.ctx.storage.sql.exec<{ player: string; data: string }>('SELECT player,data FROM hall ORDER BY score DESC, id LIMIT ?', BOARD_SIZE).toArray();
    return rows.map((r) => ({ ...(JSON.parse(r.data) as BoardRow), me: player !== null && r.player === player || undefined }));
  }

  /**
   * Keeps one row per player and season: a retried season keeps its best showing, and every season
   * can make the Hall. A rename shows on all of the player's rows. Clients that send no season id
   * (older builds) keep a single row per player, as before.
   */
  async submit(player: string, raw: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
    const checked = checkName(String(raw.name ?? ''));
    if ('error' in checked) return { ok: false, error: checked.error };
    const sql = this.ctx.storage.sql;
    if (raw.rename === true) {
      for (const r of sql.exec<{ id: string; data: string }>('SELECT id,data FROM hall WHERE player=?', player).toArray()) {
        sql.exec('UPDATE hall SET data=? WHERE id=?', JSON.stringify({ ...(JSON.parse(r.data) as BoardRow), name: checked.name }), r.id);
      }
      return { ok: true };
    }
    const score = Number(raw.score), nights = Number(raw.nights);
    if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) return { ok: false, error: 'bad score' };
    if (!Number.isInteger(nights) || nights < 0 || nights > 7) return { ok: false, error: 'bad nights' };
    if (!BOSS_IDS.includes(raw.boss as never) || !TIER_IDS.includes(raw.tier as never)) return { ok: false, error: 'bad season' };
    const row: BoardRow = { name: checked.name, score, boss: raw.boss as BoardRow['boss'], tier: raw.tier as BoardRow['tier'], nights, win: raw.win === true, at: Date.now() };
    const season = Number(raw.season);
    const id = Number.isInteger(season) && season > 0 && season < 1e10 ? `${player}:${season}` : player;
    const prev = sql.exec<{ data: string }>('SELECT data FROM hall WHERE id=?', id).toArray()[0];
    const old = prev ? (JSON.parse(prev.data) as BoardRow) : null;
    const best = !old || row.score > old.score ? row : { ...old, name: row.name };
    sql.exec('INSERT INTO hall(id,player,score,data) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET score=excluded.score, data=excluded.data', id, player, best.score, JSON.stringify(best));
    // Only the top of the Hall is ever shown; keep a generous margin and drop the rest.
    sql.exec('DELETE FROM hall WHERE id NOT IN (SELECT id FROM hall ORDER BY score DESC LIMIT ?)', HALL_KEEP);
    return { ok: true };
  }
}
