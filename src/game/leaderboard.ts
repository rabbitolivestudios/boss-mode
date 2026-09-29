import { BOSSES, SCORE, type BossId } from './config';
import type { Summary } from './game';
import { checkName } from './nameguard';
import { served, uuid } from '../analytics/track';

/**
 * The Hall of Bosses. Players type their own name (checked by `nameguard`); until they do, they get a
 * generated two-word one so nobody has to type before playing. Scores go to the artifact's shared
 * store when the page runs inside claude.ai with it granted, and always to this device.
 */

const ADJ = [
  'Sneaky', 'Grumpy', 'Mighty', 'Sleepy', 'Spooky', 'Turbo', 'Mega', 'Cosmic', 'Tiny', 'Giant', 'Sparkly', 'Crunchy',
  'Wobbly', 'Shadow', 'Thunder', 'Frosty', 'Blazing', 'Rusty', 'Golden', 'Ninja', 'Laser', 'Stompy', 'Goofy', 'Epic',
  'Sassy', 'Jumbo', 'Salty', 'Bouncy', 'Chaos', 'Stealthy', 'Royal', 'Fuzzy', 'Mystic', 'Rocket', 'Zappy', 'Lava',
];
const NOUN = [
  'Goblin', 'Dragon', 'Slime', 'Skeleton', 'Troll', 'Kraken', 'Golem', 'Wizard', 'Mummy', 'Yeti', 'Gargoyle', 'Bat',
  'Ogre', 'Hydra', 'Minotaur', 'Imp', 'Werewolf', 'Phantom', 'Cyclops', 'Beholder', 'Lich', 'Basilisk', 'Mimic', 'Wyvern',
  'Griffin', 'Spider', 'Pumpkin', 'Zombie', 'Ghost', 'Blob', 'Knight', 'Robot', 'Octopus', 'Cactus', 'Toaster', 'Donut',
];
const TOP = 10;
const NAME_KEY = 'boss-mode-name';
const LOCAL_KEY = 'boss-mode-board';

export interface Entry { season?: number; name: string; score: number; boss: BossId; tier: string; nights: number; win: boolean; at: number; me?: boolean }

/** `player` is the random id the game's own server knows this device's board row by. */
interface Identity { id: string; name: string; player: string }

function store<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function keep(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked: lasts this visit */ }
}

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const rollName = (): string => `${pick(ADJ)} ${pick(NOUN)}`;

const saved = store<Identity | null>(NAME_KEY, null);
let identity: Identity = { id: saved?.id ?? `p${Math.random().toString(36).slice(2, 12)}`, name: saved && 'name' in checkName(saved.name) ? saved.name : rollName(), player: saved?.player ?? uuid() };
keep(NAME_KEY, identity);

export function playerName(): string { return identity.name; }
/** Saves a typed name; returns why it was refused, or null when it was saved. */
export function setPlayerName(raw: string): string | null {
  const r = checkName(raw);
  if ('error' in r) return r.error;
  identity = { ...identity, name: r.name };
  keep(NAME_KEY, identity);
  void board.rename();
  return null;
}

export function seasonScore(s: Summary): number {
  const nights = s.win ? 7 : s.night;
  const raw = nights * SCORE.night + (s.win ? SCORE.win : 0) + s.treasure * SCORE.gold + s.kills * SCORE.kill - s.retries * SCORE.retry;
  return Math.max(0, Math.round(raw * (SCORE.tier[s.difficulty.id] ?? 1)));
}

/** Anything read from the shared store came from another browser, so only well-formed rows count. */
function valid(d: Record<string, unknown> | undefined): Entry | null {
  if (!d) return null;
  const name = typeof d.name === 'string' ? d.name : '';
  if (!('name' in checkName(name))) return null;
  const score = Number(d.score);
  if (!Number.isFinite(score) || score < 0 || score > 1e7) return null;
  const boss = String(d.boss) as BossId;
  if (!(boss in BOSSES)) return null;
  return {
    name, score: Math.round(score), boss, tier: String(d.tier ?? ''), nights: Math.min(7, Math.max(0, Number(d.nights) || 0)),
    win: d.win === true, at: Number(d.at) || 0,
  };
}

// Just enough of the claude.ai runtime's db surface for this board; the page works without it.
interface DocSnap { id: string; exists: boolean; data(): Record<string, unknown> | undefined }
interface Db {
  doc(path: string): { get(): Promise<DocSnap>; set(d: Record<string, unknown>): Promise<void> };
  collection(path: string): { orderBy(f: string, dir: 'desc'): { limit(n: number): { onSnapshot(next: (s: { docs: DocSnap[] }) => void, err: (e: { code: string }) => void): () => void } } };
}
interface ClaudeRuntime { use(name: 'db'): Promise<Db | null> }

class Leaderboard {
  private db: Db | null = null;
  /** True when the game's own server hosts the board; it outranks the claude.ai store. */
  private server = false;
  private shared: Entry[] | null = null;
  private listeners: (() => void)[] = [];
  last: { score: number; rank: number | null } | null = null;

  constructor() {
    void served.then((on) => {
      if (on) { this.server = true; void this.refresh(); } else this.useClaude();
    });
  }

  private async refresh(): Promise<void> {
    try {
      const r = await fetch(`/api/board?me=${identity.player}`, { cache: 'no-store' });
      if (!r.ok) return;
      const body = (await r.json()) as { rows: (Record<string, unknown> & { me?: boolean })[] };
      this.shared = body.rows.flatMap((d): Entry[] => { const e = valid(d); return e ? [{ ...e, me: d.me === true }] : []; });
      this.emit();
    } catch { /* offline: keep what is shown */ }
  }

  private async post(body: Record<string, unknown>): Promise<void> {
    try {
      await fetch('/api/board', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ player: identity.player, ...body }) });
    } catch { /* offline: the local board still has it */ }
    await this.refresh();
  }

  /** A new name shows on the player's existing row straight away. */
  async rename(): Promise<void> {
    if (this.server) await this.post({ rename: true, name: identity.name });
  }

  private useClaude(): void {
    const claude = (window as unknown as { claude?: ClaudeRuntime }).claude;
    if (!claude?.use) return;
    void claude.use('db').then((db) => {
      if (!db) return;
      this.db = db;
      db.collection('scores').orderBy('score', 'desc').limit(TOP).onSnapshot(
        (snap) => {
          this.shared = snap.docs.flatMap((d): Entry[] => { const e = valid(d.data()); return e ? [{ ...e, me: d.id === identity.id }] : []; });
          this.emit();
        },
        () => { this.shared = null; this.db = null; this.emit(); },
      );
    }).catch(() => { /* no runtime: local board only */ });
  }

  /** True once the shared board is live; otherwise the lists are this device's own seasons. */
  isShared(): boolean { return this.shared !== null; }

  entries(): Entry[] {
    if (this.shared) return this.shared;
    return store<Entry[]>(LOCAL_KEY, []).map((e) => ({ ...e, me: true }));
  }

  onChange(fn: () => void): void { this.listeners.push(fn); }
  private emit(): void { for (const fn of this.listeners) fn(); }

  async submit(s: Summary): Promise<void> {
    const score = seasonScore(s);
    const entry: Entry = { season: s.season, name: identity.name, score, boss: s.boss, tier: s.difficulty.id, nights: s.win ? 7 : s.night, win: s.win, at: Date.now() };
    // A retried season is still one season: it keeps its best showing rather than listing every attempt.
    const earlier = store<Entry[]>(LOCAL_KEY, []);
    const same = earlier.find((e) => e.season === s.season);
    const local = [...earlier.filter((e) => e !== same), same && same.score > score ? same : entry].sort((a, b) => b.score - a.score).slice(0, TOP);
    keep(LOCAL_KEY, local);
    const list = this.shared ?? local;
    // Every season is its own row, the player's own earlier seasons included.
    const rank = list.filter((e) => e.score > score && (this.shared ? true : e.season !== s.season)).length + 1;
    this.last = { score, rank: rank <= TOP ? rank : null };
    this.emit();
    if (this.server) {
      await this.post({ name: identity.name, score, boss: s.boss, tier: s.difficulty.id, nights: entry.nights, win: s.win, season: s.season });
      const shared = this.shared as Entry[] | null;
      const pos = shared ? shared.findIndex((e) => e.me && e.score === score) : -1;
      if (pos >= 0) { this.last = { score, rank: pos + 1 }; this.emit(); }
      return;
    }
    if (!this.db) return;
    try {
      // One row per player, holding their best season; a worse run leaves it alone.
      const ref = this.db.doc(`scores/${identity.id}`);
      const mine = valid((await ref.get()).data());
      const best = !mine || score > mine.score ? entry : mine;
      if (best !== mine || mine.name !== identity.name) await ref.set({ ...best, name: identity.name });
    } catch { /* offline or not allowed to write: the local board still has it */ }
  }
}

export const board = new Leaderboard();

const TIER_ICON: Record<string, string> = { chill: '🌱', normal: '⚔️', heroic: '🔥', legendary: '👑' };

/** Draws a board into a container with DOM text nodes only, never HTML from the store. */
export function drawBoard(el: HTMLElement, highlight?: number): void {
  el.replaceChildren();
  const head = document.createElement('div');
  head.className = 'board-head';
  head.textContent = board.isShared() ? '🏆 HALL OF BOSSES' : '🏆 YOUR BEST SEASONS';
  el.append(head);
  const rows = board.entries();
  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'board-empty';
    empty.textContent = 'No seasons yet. Be the first!';
    el.append(empty);
    return;
  }
  rows.forEach((e, i) => {
    const row = document.createElement('div');
    row.className = 'board-row' + (e.me && (board.isShared() || e.score === highlight) ? ' me' : '');
    const cells = [`${i + 1}`, `${BOSSES[e.boss].emoji} ${e.name}`, `${TIER_ICON[e.tier] ?? ''} ${e.win ? '👑' : `N${e.nights + 1}`}`, e.score.toLocaleString()];
    for (const c of cells) { const span = document.createElement('span'); span.textContent = c; row.append(span); }
    el.append(row);
  });
}
