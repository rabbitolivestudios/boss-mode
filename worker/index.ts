import type { Traffic } from '../src/analytics/contract';
import { BadEvent, normalize } from './model';
import { authorizePassword, loginPage, passwordLogin, passwordLogout, type PasswordConfiguration } from './password';
import type { Store } from './store';

export { Store } from './store';

interface Env extends PasswordConfiguration {
  ASSETS: Fetcher;
  STORE: DurableObjectNamespace<Store>;
  EVENT_LIMITER: RateLimit;
  BOARD_LIMITER: RateLimit;
  READ_LIMITER: RateLimit;
  LOGIN_LIMITER: RateLimit;
}

const PLAYER = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY = 8192;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });

/** Every private or write route answers only to this site's own pages. */
function sameOrigin(request: Request, url: URL): boolean {
  const origin = request.headers.get('Origin');
  return (!origin || origin === url.origin) && request.headers.get('Sec-Fetch-Site') !== 'cross-site';
}

async function limited(limiter: RateLimit, name: string, request: Request): Promise<boolean> {
  return !(await limiter.limit({ key: `${name}:${request.headers.get('CF-Connecting-IP') ?? 'local'}` })).success;
}

async function body(request: Request): Promise<unknown> {
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) throw new BadEvent('size');
  const text = await request.text();
  if (text.length > MAX_BODY) throw new BadEvent('size');
  return JSON.parse(text);
}

// A single store keeps the numbers exact; Boss Mode's traffic fits one Durable Object comfortably.
const store = (env: Env) => env.STORE.getByName('boss-mode-v1');

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const isAnalytics = /^\/analytics(?:\/|$)/.test(path);
    // The dashboard page is served only through the password check below, never as a plain file.
    if (path.startsWith('/analytics') && !isAnalytics) return new Response(null, { status: 404 });
    if (!path.startsWith('/api/') && !isAnalytics) return env.ASSETS.fetch(request);

    const dashboardNavigation = request.method === 'GET' && (path === '/analytics' || path === '/analytics/');
    if (!dashboardNavigation && !sameOrigin(request, url)) return json({ error: 'origin' }, 403);

    if (isAnalytics) {
      if (path === '/analytics/login') {
        if (request.method !== 'POST') return new Response(null, { status: 405 });
        if (await limited(env.LOGIN_LIMITER, 'login', request)) {
          const r = loginPage(true, 429);
          r.headers.set('Retry-After', '60');
          return r;
        }
        return passwordLogin(request, env);
      }
      if (path === '/analytics/logout') {
        if (request.method !== 'POST') return new Response(null, { status: 405 });
        if (request.headers.get('Origin') !== url.origin) return new Response(null, { status: 403 });
        return passwordLogout();
      }
      if (request.method !== 'GET') return new Response(null, { status: 405 });
      if (await limited(env.READ_LIMITER, 'admin', request)) return json({ error: 'rate' }, 429);
      if (!(await authorizePassword(request, env))) return path === '/analytics/api/summary' ? json({ error: 'access_required' }, 403) : loginPage();
      if (path === '/analytics/api/summary') {
        const days = Number(url.searchParams.get('days') ?? 30);
        const t = url.searchParams.get('traffic');
        const traffic: Traffic = t === 'test' || t === 'all' ? t : 'real';
        const summary = await store(env).summary(days, traffic);
        const r = json(summary);
        r.headers.set('X-Robots-Tag', 'noindex, nofollow');
        r.headers.set('Cache-Control', 'private, no-store');
        return r;
      }
      if (path !== '/analytics' && path !== '/analytics/') return new Response(null, { status: 404 });
      // Asked for by its clean path: the asset server redirects /analytics.html to /analytics, which would loop.
      const page = await env.ASSETS.fetch(new Request(new URL('/analytics', url), request));
      const secured = new Response(page.body, page);
      secured.headers.set('Cache-Control', 'private, no-store');
      secured.headers.set('X-Robots-Tag', 'noindex, nofollow');
      secured.headers.set('X-Frame-Options', 'DENY');
      return secured;
    }

    try {
      if (path === '/api/health' && request.method === 'GET') return json({ ok: true, app: 'boss-mode' });

      if (path === '/api/event' && request.method === 'POST') {
        if (await limited(env.EVENT_LIMITER, 'event', request)) return json({ error: 'rate' }, 429);
        const event = normalize(await body(request));
        await store(env).record(event, request.headers.get('CF-IPCountry') ?? 'XX');
        return new Response(null, { status: 204 });
      }

      if (path === '/api/board') {
        if (await limited(env.BOARD_LIMITER, 'board', request)) return json({ error: 'rate' }, 429);
        if (request.method === 'GET') {
          const me = url.searchParams.get('me');
          return json({ rows: await store(env).board(me && PLAYER.test(me) ? me.toLowerCase() : null) });
        }
        if (request.method === 'POST') {
          const b = await body(request) as Record<string, unknown>;
          const player = String(b.player ?? '');
          if (!PLAYER.test(player)) return json({ error: 'player' }, 400);
          const r = await store(env).submit(player.toLowerCase(), b);
          return json(r, r.ok ? 200 : 400);
        }
      }
      return json({ error: 'not_found' }, 404);
    } catch (e) {
      if (e instanceof BadEvent || e instanceof SyntaxError) return json({ error: 'invalid' }, 400);
      throw e;
    }
  },
} satisfies ExportedHandler<Env>;
