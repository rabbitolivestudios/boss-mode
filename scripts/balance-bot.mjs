// Season bot for balance testing, driving the real game in a headless browser.
// Start the dev server first (npx vite --port 5175), then: node scripts/balance-bot.mjs BOSS TIER MODE RESERVE PICKS TAG [MAXMIN] [MOVE]
//   BOSS dragon|slime|bonelord, TIER 0-3 (Chill..Legendary), MODE mortal|immortal (immortal locks health to measure theft only),
//   RESERVE coins kept in the vault when building, PICKS smart|random, MOVE kite|thin|nochase|camp|late
//   (kite and late dodge warning circles; nochase ignores thieves; camp sits on the vault; late camps from night 4). Prints one JSON line per season.
// Drawing is switched off (the page frame loop never runs); the bot steps the simulation itself, so a season takes seconds.
import { chromium } from 'playwright';
const [,, BOSS = 'dragon', TIER = '1', MODE = 'mortal', RESERVE = '25', PICKS = 'smart', TAG = 'run', MAXMIN = '25', MOVE = 'kite'] = process.argv;
const PORT = process.env.PORT ?? '5175';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
await page.goto(`http://localhost:${PORT}/play.html?test=1`, { timeout: 120000 });
await page.waitForFunction(() => window.game, null, { timeout: 60000 });
await page.evaluate(async ({ boss, tier, mode, reserve, picks, move }) => {
  const c = await import('/src/game/config.ts');
  const g = window.game;
  g.start(boss, c.DIFFICULTIES[tier]);
  g.hooks.banner = () => {}; g.hooks.killfeed = () => {};
  window.__cfg = { mode, reserve, picks, move, W: c.WEAPONS }; window.__nochase = move === 'nochase' || move === 'camp'; window.__cfg.dodge = move === 'kite' || move === 'late';
  window.__nights = []; window.__grab = new WeakSet(); window.__grabs = 0; window.__minHp = 1;
  const dawn = g.hooks.dawn;
  g.hooks.dawn = (r) => {
    window.__nights.push({ n: r.night + 1, start: g.nightStartGold, stolen: r.stolen, grabs: window.__grabs, kept: r.treasure - r.tribute, minHp: Math.round(window.__minHp * 100), lvl: g.level, kills: r.kills, bld: g.castle.buildings.length });
    window.__grabs = 0; window.__minHp = 1;
    dawn(r);
  };
  const end = g.hooks.end;
  g.hooks.end = (s) => { window.__end = { nightTime: Math.round(g.nightTime), taken: Object.fromEntries(Object.entries(g.taken).map(([k, v]) => [k, Math.round(v)])), heroes: g.heroes.length, kinds: Object.entries(g.heroes.reduce((m, h) => (m[h.kind] = (m[h.kind] ?? 0) + 1, m), {})).sort((a, b) => b[1] - a[1]).slice(0, 5), win: s.win, reason: s.reason, night: s.night + 1, time: Math.round(s.time), kills: s.kills, level: s.level, treasure: s.treasure, stolen: s.stolen }; end(s); };
}, { boss: BOSS, tier: +TIER, mode: MODE, reserve: +RESERVE, picks: PICKS, move: MOVE });

const t0 = Date.now();
let st = null;
while (Date.now() - t0 < +MAXMIN * 60000) {
  st = await page.evaluate(() => {
    const g = window.game, C = window.__cfg;
    const choose = () => {
      const cards = [...document.querySelectorAll('#cards .card')];
      if (!cards.length) return;
      if (C.picks === 'random') return cards[Math.floor(Math.random() * cards.length)].click();
      // Smart: new weapons while slots are free, then level weapons, then damage/cooldown/health.
      const score = (el) => {
        const t = el.textContent;
        if (/NEW/.test(t) && g.weapons.size < 4) return 10;
        for (const [id, w] of Object.entries(C.W)) if (t.includes(w.name)) return 8;
        if (/Big Muscles|Hyper Mode/.test(t)) return 6;
        if (/Mega Heart/.test(t)) return 5;
        return 1;
      };
      cards.sort((a, b) => score(b) - score(a))[0].click();
    };
    for (let i = 0; i < 300 && g.phase !== 'over'; i++) {
      if (g.phase === 'build') {
        g.repairAll();
        // Towers and spikes in a ring around the vault, keeping the reserve.
        for (let k = 0; k < 300; k++) {
          const free = g.treasure - C.reserve;
          const id = free >= 25 ? 'tower' : free >= 10 ? 'spikes' : free >= 4 ? 'wall' : null;
          if (!id) break;
          const a = Math.random() * 6.283, r = 4.5 + Math.random() * 5;
          const [cx, cz] = g.castle.cellOf(Math.cos(a) * r, Math.sin(a) * r);
          g.build(cx, cz, id);
        }
        g.startRaid();
      }
      if (g.phase === 'dawn') { g.nextNight(); continue; }
      if (g.choosing) choose();
      if (g.choosing) continue;
      for (const h of g.heroes) if (h.carry > 0 && !window.__grab.has(h)) { window.__grab.add(h); window.__grabs++; }
      // Move: chase the nearest thief with gold; otherwise go where the crowd is thinnest, staying near the vault.
      let mx = 0, mz = 0;
      const thief = window.__nochase ? null : g.heroes.filter((h) => h.alive && h.carry > 0).sort((a, b) => Math.hypot(a.x - g.x, a.z - g.z) - Math.hypot(b.x - g.x, b.z - g.z))[0];
      if (thief) { mx = thief.x - g.x; mz = thief.z - g.z; }
      else if (C.move === 'kite' || C.move === 'nochase' || C.move === 'late') {
        // Push away from nearby heroes (closer ones push harder), orbit the vault, and drift back if too far.
        for (const h of g.heroes) {
          if (!h.alive || h.air) continue;
          const dx = g.x - h.x, dz = g.z - h.z, d = Math.hypot(dx, dz);
          if (d > 7 || d < 0.01) continue;
          const w = (h.kind === 'champion' ? 6 : 1) / (d * d);
          mx += dx * w; mz += dz * w;
        }
        const vd = Math.hypot(g.x, g.z) || 1;
        const orbit = 0.25;
        mx += (-g.z / vd) * orbit; mz += (g.x / vd) * orbit;
        if (vd > 9) { mx -= (g.x / vd) * 0.6; mz -= (g.z / vd) * 0.6; }
      }
      else {
        let best = Infinity;
        for (let d = 0; d < 8; d++) {
          const a = d * Math.PI / 4, px = g.x + Math.cos(a) * 3, pz = g.z + Math.sin(a) * 3;
          let crowd = 0;
          for (const h of g.heroes) if (h.alive && Math.hypot(h.x - px, h.z - pz) < 3.5) crowd += h.kind === 'champion' ? 8 : 1;
          const cost = crowd + Math.max(0, Math.hypot(px, pz) - 7) * 2;
          if (cost < best) { best = cost; mx = Math.cos(a); mz = Math.sin(a); }
        }
      }
      // A player steps out of warning circles (bombs, airstrikes, arrow rain) that are about to land on them.
      if (C.dodge) { let bx = 0, bz = 0; for (const v of g.volleys) { const dx = g.x - v.x, dz = g.z - v.z, d = Math.hypot(dx, dz); if (d < v.radius + g.radius) { bx += dx / (d || 0.1); bz += dz / (d || 0.1); } } if (bx || bz) { mx = bx; mz = bz; } }
      if (C.move === 'camp' || (C.move === 'late' && g.night >= 3)) { const vd = Math.hypot(g.x, g.z); mx = vd > 1.5 ? -g.x : 0; mz = vd > 1.5 ? -g.z : 0; }
      const l = Math.hypot(mx, mz) || 1;
      if (g.rage >= 100) g.roar();
      if (C.mode === 'immortal') g.hp = g.maxHp;
      g.update(1 / 30, { x: mx / l, z: mz / l });
      window.__minHp = Math.min(window.__minHp, Math.max(0, g.hp / g.maxHp));
    }
    return { over: g.phase === 'over', night: g.night + 1, t: Math.round(g.time) };
  });
  if (st.over) break;
}
const out = await page.evaluate(() => ({ end: window.__end ?? null, nights: window.__nights, weapons: [...window.game.weapons].map(([id, w]) => `${id}${w.level}`), now: { night: window.game.night + 1, t: Math.round(window.game.time), gold: window.game.treasure } }));
console.log(JSON.stringify({ tag: TAG, move: MOVE, boss: BOSS, tier: +TIER, mode: MODE, reserve: +RESERVE, picks: PICKS, minutes: Math.round((Date.now() - t0) / 6000) / 10, ...out, errors: errors.slice(0, 3) }));
await browser.close();
