import './dashboard.css';
import type { Summary } from '../analytics/contract';
import { esc, tooltips } from './charts';
import { icon, type IconName } from './icons';
import { builds, difficulty, overview, performance, players } from './sections';

/**
 * The private /analytics page. Loads the summary on open, every 30 seconds while the tab is
 * visible, when the tab comes back, and on demand. A failed refresh keeps the last numbers on
 * screen with a warning; an expired session goes back to the sign-in page.
 */

const TABS: { key: string; label: string; ic: IconName; draw: (s: Summary) => string }[] = [
  { key: 'overview', label: 'Overview', ic: 'activity', draw: overview },
  { key: 'players', label: 'Players', ic: 'users', draw: players },
  { key: 'difficulty', label: 'Difficulty', ic: 'skull', draw: difficulty },
  { key: 'builds', label: 'Builds & upgrades', ic: 'hammer', draw: builds },
  { key: 'performance', label: 'Performance', ic: 'gauge', draw: performance },
];
const REFRESH_MS = 30000;
const TIMEOUT_MS = 15000;
// The same flag the game reads (as JSON), so marking this browser makes its plays test traffic.
const TEST_KEY = 'bm-test';

const root = document.getElementById('app') as HTMLElement;
const params = new URLSearchParams(location.search);
let days = [1, 7, 30, 90].includes(Number(params.get('days'))) ? Number(params.get('days')) : 7;
let traffic = ['real', 'test', 'all'].includes(params.get('traffic') ?? '') ? (params.get('traffic') as string) : 'real';
let tab = TABS.some((t) => t.key === params.get('tab')) ? (params.get('tab') as string) : 'overview';
let data: Summary | null = null;
let failedAt: Date | null = null;
let loading = false;

const isTestBrowser = (): boolean => { try { return localStorage.getItem(TEST_KEY) === 'true'; } catch { return false; } };

const chip = (attr: string, value: string | number, label: string, current: string | number) =>
  `<button class="chip${String(value) === String(current) ? ' on' : ''}" data-${attr}="${value}" aria-pressed="${String(value) === String(current)}">${label}</button>`;

function shell(): void {
  root.innerHTML = `<header class="top">
    <a class="brand" href="/" title="Back to the game"><img src="/art/logo.webp" alt="BOSS MODE" /><span><b>War room</b><small>Private analytics</small></span></a>
    <div class="top-actions">
      <div class="segmented">${[[1, 'Today'], [7, '7 days'], [30, '30 days'], [90, '90 days']].map(([v, l]) => chip('days', v, String(l), days)).join('')}</div>
      <button class="btn" data-refresh>${icon('refresh', 'ic tiny')} Refresh</button>
      <a class="btn" href="/play" target="_blank" rel="noopener">${icon('play', 'ic tiny')} Open game</a>
      <form method="post" action="/analytics/logout"><button class="btn ghost" type="submit">${icon('logout', 'ic tiny')} Sign out</button></form>
    </div>
  </header>
  <nav class="tabs">
    <div class="tab-list" role="tablist">${TABS.map((t) => `<button role="tab" class="tab${t.key === tab ? ' on' : ''}" data-tab="${t.key}" aria-selected="${t.key === tab}">${icon(t.ic, 'ic tiny')} ${esc(t.label)}</button>`).join('')}</div>
    <div class="tab-side">
      <div class="segmented small">${[['real', 'Players'], ['test', 'Test'], ['all', 'All']].map(([v, l]) => chip('traffic', v, l, traffic)).join('')}</div>
      <button class="btn small${isTestBrowser() ? ' marked' : ''}" data-testmark>${icon('flask', 'ic tiny')} ${isTestBrowser() ? 'This browser counts as test' : 'Mark this browser as test'}</button>
    </div>
  </nav>
  <p class="status" id="status"></p>
  <main id="body"><p class="empty">Loading…</p></main>
  <footer class="foot">BOSS MODE · Rabbit &amp; Olive Studios · anonymous events only, kept 90 days, no names or ids</footer>`;
}

function status(): void {
  const el = document.getElementById('status');
  if (!el || !data) return;
  const chicago = (d: Date) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' }).format(d);
  const since = data.trackingSince ? new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric' }).format(new Date(data.trackingSince)) : 'no data yet';
  el.innerHTML = `<span class="live${failedAt ? ' stale' : ''}"></span> ${failedAt ? `Could not refresh at ${esc(chicago(failedAt))}. Showing the last numbers.` : 'Live · refreshes every 30 s'}` +
    ` · Updated ${esc(chicago(new Date(data.generatedAt)))} Chicago · Tracking since ${esc(since)}` +
    (traffic !== 'real' ? ` · <b>${traffic === 'test' ? 'Test traffic only' : 'Players and test traffic'}</b>` : '');
}

function draw(): void {
  const body = document.getElementById('body');
  if (!body || !data) return;
  body.innerHTML = (TABS.find((t) => t.key === tab) ?? TABS[0]).draw(data);
  status();
}

const remember = () => history.replaceState(null, '', `?tab=${tab}&days=${days}&traffic=${traffic}`);

async function load(): Promise<void> {
  if (loading) return;
  loading = true;
  remember();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(`/analytics/api/summary?days=${days}&traffic=${traffic}`, { cache: 'no-store', credentials: 'same-origin', signal: ctrl.signal });
    if (r.status === 403) { location.reload(); return; }
    if (!r.ok) throw new Error(String(r.status));
    data = (await r.json()) as Summary;
    failedAt = null;
    draw();
  } catch {
    failedAt = new Date();
    if (data) status();
    else (document.getElementById('body') as HTMLElement).innerHTML = `<p class="empty">${icon('alert', 'ic tiny')} Could not load the numbers. It will retry in 30 seconds.</p>`;
  } finally {
    clearTimeout(timer);
    loading = false;
  }
}

root.addEventListener('click', (e) => {
  const el = (e.target as Element).closest<HTMLElement>('[data-days],[data-traffic],[data-tab],[data-refresh],[data-testmark]');
  if (!el) return;
  if (el.dataset.tab) { tab = el.dataset.tab; shell(); draw(); remember(); window.scrollTo(0, 0); return; }
  if (el.hasAttribute('data-testmark')) {
    try { if (isTestBrowser()) localStorage.removeItem(TEST_KEY); else localStorage.setItem(TEST_KEY, 'true'); } catch { /* storage blocked */ }
    shell(); draw(); return;
  }
  if (el.dataset.days) days = Number(el.dataset.days);
  if (el.dataset.traffic) traffic = el.dataset.traffic;
  shell();
  void load();
});

shell();
tooltips(root);
void load();
setInterval(() => { if (!document.hidden) void load(); }, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) void load(); });
