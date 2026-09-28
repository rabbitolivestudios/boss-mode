import type { EventContext, GameEvent } from './contract';

/**
 * Sends anonymous gameplay events to the game's own server. Stays off unless the page is served by
 * the Boss Mode worker (checked once through /api/health), so copies of the game elsewhere, like the
 * claude.ai artifact or a saved file, send nothing. Events wait in a short queue until that answer.
 */

const SESSION_KEY = 'bm-session';
const VISITOR_KEY = 'bm-visitor';
const TEST_KEY = 'bm-test';
const SESSION_IDLE_MS = 30 * 60000;
const VISITOR_TTL_MS = 90 * 86400000;
const QUEUE_MAX = 60;

type Payload = GameEvent extends infer E ? E extends EventContext ? Omit<E, keyof EventContext> : never : never;

let state: 'probing' | 'on' | 'off' = 'probing';
const queue: Payload[] = [];

function read<T>(key: string): T | null {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : null; } catch { return null; }
}
function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked: ids last this page load */ }
}

export const uuid = (): string => crypto.randomUUID();

let memorySession: { id: string; last: number } | null = null;
function sessionId(now: number): string {
  const s = read<{ id: string; last: number }>(SESSION_KEY) ?? memorySession;
  const id = s && now - s.last < SESSION_IDLE_MS ? s.id : uuid();
  memorySession = { id, last: now };
  write(SESSION_KEY, memorySession);
  return id;
}

function visitorId(now: number): string | undefined {
  const v = read<{ id: string; at: number }>(VISITOR_KEY);
  if (v && now - v.at < VISITOR_TTL_MS) return v.id;
  const fresh = { id: uuid(), at: now };
  write(VISITOR_KEY, fresh);
  return read<{ id: string }>(VISITOR_KEY)?.id;
}

function device(): EventContext['device'] {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
  if (/Mobi|Android|iPhone/i.test(ua)) return Math.min(screen.width, screen.height) >= 700 ? 'tablet' : 'mobile';
  return 'desktop';
}

function browser(): EventContext['browser'] {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\/|CriOS\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'other';
}

function locale(): EventContext['locale'] {
  const l = (navigator.language || '').slice(0, 2).toLowerCase();
  return l === 'pt' || l === 'en' || l === 'es' ? l : 'other';
}

function testTraffic(): boolean {
  const q = new URLSearchParams(location.search).get('test');
  if (q === '1') write(TEST_KEY, true);
  if (q === '0') { try { localStorage.removeItem(TEST_KEY); } catch { /* ignore */ } }
  return read<boolean>(TEST_KEY) === true;
}

function send(p: Payload): void {
  const now = Date.now();
  const event = { ...p, sessionId: sessionId(now), visitorId: visitorId(now), test: testTraffic() || undefined, device: device(), browser: browser(), locale: locale() };
  void fetch('/api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(event), keepalive: true }).catch(() => { /* analytics never disturb play */ });
}

export function track(p: Payload): void {
  if (state === 'on') send(p);
  else if (state === 'probing' && queue.length < QUEUE_MAX) queue.push(p);
}

/** Whether this copy of the game is served by its own worker, which also hosts the shared board. */
export const served: Promise<boolean> = (async () => {
  if (!/^https?:$/.test(location.protocol)) return false;
  try {
    const r = await fetch('/api/health', { cache: 'no-store' });
    const body = r.ok ? ((await r.json()) as { app?: string }) : null;
    return body?.app === 'boss-mode';
  } catch { return false; }
})();

void served.then((on) => {
  state = on ? 'on' : 'off';
  if (on) for (const p of queue.splice(0)) send(p);
  else queue.length = 0;
});

/** Frame-rate sampler for the perf event: fed every raid frame, flushed at the end of a night. */
export class FpsMeter {
  private samples: number[] = [];
  frame(dt: number): void {
    if (dt > 0 && dt < 1 && this.samples.length < 20000) this.samples.push(1 / dt);
  }
  flush(): void {
    if (this.samples.length < 60) { this.samples = []; return; }
    const s = [...this.samples].sort((a, b) => a - b);
    this.samples = [];
    track({ type: 'perf', fpsMedian: Math.round(s[s.length >> 1]), fpsLow: Math.round(s[Math.floor(s.length * 0.1)]) });
  }
}
