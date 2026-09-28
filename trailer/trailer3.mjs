// Trailer v3: renders the real game frame by frame at fixed 1/30 s steps, following a scripted storyline.
// Usage: node trailer3.mjs OUTDIR [frame,frame,...]  (the list renders only those frames, for previews)
import { chromium } from 'playwright';
const OUT = process.argv[2];
const ONLY = process.argv[3] ? new Set(process.argv[3].split(',').map(Number)) : null;
const FPS = 30, TOTAL = 900;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  let s = 42; Math.random = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  try {
    localStorage.clear();
    // Hall of Bosses rows for the victory shot.
    const rows = [['Sneaky Goblin', 21480, 'dragon', 'heroic', 7, true], ['Turbo Wizard', 18920, 'slime', 'normal', 7, true], ['Laser Zombie', 15310, 'bonelord', 'normal', 6, false], ['Mega Kraken', 12040, 'dragon', 'chill', 7, true]];
    localStorage.setItem('boss-mode-board', JSON.stringify(rows.map(([name, score, boss, tier, nights, win]) => ({ name, score, boss, tier, nights, win, at: 1 }))));
    localStorage.setItem('boss-mode-name', JSON.stringify({ id: 'ptrailer', name: 'Epic Dragon', player: '11111111-1111-4111-8111-111111111111' }));
  } catch {}
});
await page.goto('http://localhost:5173/play.html?speed=0.00001');
await page.waitForTimeout(1500);
await page.evaluate(() => document.fonts.ready);
await page.addStyleTag({ content: `
  #vignette, #banner, #buttons, #btn-settings, #build-msg, #challenger, #btn-again, #btn-retry, #frenzy { display: none !important; }
  #trailer { position: fixed; inset: 0; z-index: 50; pointer-events: none; font-family: 'Lilita One', 'Arial Black', sans-serif; }
  #tr-dark { position: absolute; inset: 0; background: #0d0620; opacity: 0; }
  #tr-flash { position: absolute; inset: 0; background: #fff; opacity: 0; }
  #tr-cap { position: absolute; left: 0; right: 0; text-align: center; color: #fff; font-size: 66px; line-height: 1.05; padding: 0 40px; text-shadow: 0 6px 0 #000, 0 0 30px rgba(0,0,0,.7); }
  #tr-cap b { color: #ffd23a; } #tr-cap i { color: #ff3d8b; font-style: normal; }
  #tr-end { position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: radial-gradient(ellipse 80% 70% at 50% 30%, #7a44d9 0%, #50289f 35%, #1b1033 80%); }
  #tr-end .logo { width: 560px; }
  #tr-end .bosses { position: absolute; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 30px; }
  #tr-end .bosses img { height: 230px; }
  #tr-end .sub { font-size: 38px; color: #fff; text-shadow: 0 4px 0 #000; }
  #tr-end .url { font-size: 44px; color: #1b1033; background: linear-gradient(#ffe46a, #ffd23a 55%, #ff9d00); border: 5px solid #2a1f3d; border-radius: 20px; padding: 6px 30px 10px; box-shadow: 0 0 0 5px #fff, 0 10px 0 5px #2a1f3d; }
`});
await page.evaluate(() => {
  const d = document.createElement('div');
  d.id = 'trailer';
  d.innerHTML = `<div id="tr-dark"></div><div id="tr-cap"></div><div id="tr-end"><div class="bosses"><img src="/art/boss-dragon.webp" style="transform:scaleX(-1)"><img src="/art/boss-bonelord.webp"></div>` +
    `<img class="logo" src="/art/logo.webp"><div class="sub">For once, YOU are the final boss.</div><div class="url">bossmode.mac-tbo.com</div></div><div id="tr-flash"></div>`;
  document.body.appendChild(d);
});
await page.waitForTimeout(500);

// [frame]: scene change, caption, flash.
const cues = {
  0: { setup: 'intro', cap: 'EVERY GAME HAS A<br><b>FINAL BOSS</b>...', pos: 'mid' },
  60: { setup: 'close', cap: 'THIS TIME,<br>IT\'S <i>YOU.</i>', pos: 'mid', flash: true },
  120: { setup: 'build', cap: 'BUILD YOUR <b>CASTLE</b>', pos: 'top', flash: true },
  240: { setup: 'raid', cap: 'EVERY HERO IN THE SERVER<br>WANTS <b>YOUR GOLD</b>', pos: 'low', flash: true },
  360: { setup: 'thieves', cap: 'STOP THE <i>THIEVES!</i>', pos: 'low' },
  465: { setup: 'counters', cap: 'THEY <i>LEARN</i><br>YOUR TRICKS', pos: 'low', flash: true },
  570: { setup: 'roar', cap: '', pos: 'low', flash: true },
  585: { cap: '<span style="font-size:150px">ROOOAR!</span>', pos: 'mid', roar: true },
  630: { setup: 'chosen', cap: 'BEAT <b>THE CHOSEN ONE</b>', pos: 'low', flash: true },
  745: { setup: 'victory', cap: 'CLIMB THE<br><b>HALL OF BOSSES</b>', pos: 'low', flash: true },
  810: { setup: 'end', cap: '', pos: 'low', flash: true },
};

// Building order for the build scene: a wall arc, traps in the lanes, towers behind.
const PLAN = [['wall', 6, -4], ['wall', 6, -2], ['wall', 6, 2], ['wall', 6, 4], ['spikes', 9, 0], ['tower', 3, 7], ['wall', -6, -4], ['wall', -6, -2],
  ['wall', -6, 2], ['wall', -6, 4], ['spikes', -9, 0], ['tower', -3, -7], ['pad', 0, 10], ['saw', 0, -10]];

for (let f = 0; f < TOTAL; f++) {
  const cue = cues[f] ?? null;
  await page.evaluate(({ f, cue, FPS, PLAN }) => {
    const g = window.game, W = g.world;
    performance.now = () => 100000 + (f / FPS) * 1000;
    const $ = (id) => document.getElementById(id);
    const st = (window.__tr ??= { capStart: 0, mode: '', planned: 0 });
    const give = (list) => { g.weapons.clear(); for (const [id, lv] of list) g.weapons.set(id, { level: lv, cd: Math.random() }); };
    const quiet = () => { g.hooks.banner = () => {}; g.hooks.killfeed = () => {}; };
    const near = (kind, n, x, z, r) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, d = Math.random() * r; g.addHero(kind, x + Math.cos(a) * d, z + Math.sin(a) * d); } };
    if (cue?.setup) {
      st.mode = cue.setup;
      switch (cue.setup) {
        case 'intro':
          document.querySelectorAll('.boss-card')[0].click(); quiet();
          g.treasure = 400; g.xpNeed = 1e9;
          W.overview = true; W.focus = { x: 0, z: 0 };
          break;
        case 'close':
          W.overview = false;
          break;
        case 'build':
          W.overview = true; W.focus = { x: 0, z: 0 };
          break;
        case 'raid':
          document.getElementById('btn-raid').click(); quiet();
          g.time = 260; g.xpNeed = 1e9; g.nextSquad = 1e9; g.nextChampion = 99;
          give([['fireball', 4], ['bats', 3], ['lightning', 3]]);
          for (let i = 0; i < 40; i++) g.spawnAcc = (g.spawnAcc ?? 0) + 1;
          break;
        case 'thieves':
          near('rogue', 7, 14, -10, 3);
          break;
        case 'counters':
          near('sapper', 3, 9, -3, 1.5); near('shieldbearer', 4, 11, 2, 2); near('glider', 4, -11, 3, 2);
          break;
        case 'roar':
          near('noob', 50, g.x, g.z, 9); near('knight', 25, g.x, g.z, 9);
          g.rage = 999;
          break;
        case 'chosen':
          g.night = 6; g.nextChampion = 2; g.nightTime = 36;
          give([['fireball', 5], ['lightning', 5], ['bats', 5], ['lava', 4]]);
          break;
        case 'victory': {
          const c = g.champions.find((h) => h.final);
          if (c) { c.lastHit = 'boss'; c.hp = 0; g.kill(c); }
          setTimeout(() => {}, 0);
          break;
        }
        case 'end':
          $('tr-end').style.display = 'flex';
          break;
      }
    }
    if (cue?.roar) g.roar();
    if (cue && 'cap' in cue) {
      st.capStart = f;
      $('tr-cap').innerHTML = cue.cap;
      $('tr-cap').style.top = cue.pos === 'mid' ? '34%' : cue.pos === 'top' ? '40px' : '';
      $('tr-cap').style.bottom = cue.pos === 'low' ? '70px' : '';
    }
    if (cue?.flash) st.flashAt = f;
    // The victory screen's board heading reads as the shared Hall.
    const head = document.querySelector('#end-board .board-head');
    if (head) head.textContent = '🏆 HALL OF BOSSES';

    const k = Math.min(1, (f - st.capStart) / 8);
    const pop = k < 1 ? 1.8 - 0.8 * (1 - Math.pow(1 - k, 3)) + Math.sin(k * Math.PI) * 0.15 : 1;
    $('tr-cap').style.transform = `scale(${pop}) rotate(${(1 - k) * -4}deg)`;
    $('tr-cap').style.opacity = String(Math.min(1, k * 2));
    $('tr-dark').style.opacity = f < 60 ? '0.5' : f < 72 ? String(0.5 * (1 - (f - 60) / 12)) : '0';
    $('tr-flash').style.opacity = st.flashAt !== undefined ? String(Math.max(0, 0.85 - (f - st.flashAt) * 0.2)) : '0';
    const logo = document.querySelector('#tr-end .logo');
    if (logo && f >= 810) { const e = Math.min(1, (f - 810) / 10); logo.style.transform = `scale(${1 + Math.max(0, 1 - e) * 0.6 + Math.sin(f * 0.2) * 0.015})`; }

    // Build scene: one building every 8 frames, so the castle grows on screen.
    if (st.mode === 'build' && f % 8 === 0 && st.planned < PLAN.length) {
      const [id, x, z] = PLAN[st.planned++];
      const [cx, cz] = g.castle.cellOf(x, z);
      g.build(cx, cz, id);
    }
    if (st.mode === 'build') { W.focus = { x: Math.sin(f / 50) * 1.5, z: Math.cos(f / 60) * 1.2 }; }

    let mx = 0, mz = 0;
    const t = f / FPS;
    if (st.mode === 'raid') { mx = Math.cos(t * 0.7); mz = Math.sin(t * 0.7) * 0.6; }
    else if (st.mode === 'thieves' || st.mode === 'counters') {
      // Chase whatever is carrying gold, else the nearest counter-hero.
      const target = g.heroes.find((h) => h.carry > 0) ?? g.heroes.find((h) => ['sapper', 'shieldbearer', 'glider'].includes(h.kind));
      if (target) { const dx = target.x - g.x, dz = target.z - g.z, d = Math.hypot(dx, dz) || 1; if (d > 1.5) { mx = dx / d; mz = dz / d; } }
    } else if (st.mode === 'chosen') {
      const c = g.champions[0];
      if (c) { const dx = g.x - c.x, dz = g.z - c.z, d = Math.hypot(dx, dz); if (d > 6) { c.x += dx / d * 0.35; c.z += dz / d * 0.35; } mx = -dx / (d || 1) * 0.3; mz = -dz / (d || 1) * 0.3; }
    }
    const running = ['raid', 'thieves', 'counters', 'roar', 'chosen'].includes(st.mode);
    if (running) {
      g.hp = g.maxHp;
      if (g.choosing) document.querySelector('#cards .card')?.click();
      g.update(1 / FPS, { x: mx, z: mz });
      g.hp = g.maxHp;
      if (g.treasure < 60) g.treasure = 60;
    }
    if (st.mode !== 'end' && st.mode !== 'victory') {
      W.update(g.x, g.z, 1 / FPS);
      g.render();
      g.fx.update(1 / FPS);
      W.render();
    }
  }, { f, cue, FPS, PLAN });
  if (!ONLY || ONLY.has(f)) await page.screenshot({ path: `${OUT}/f${String(f).padStart(4, '0')}.png` });
  if (f % 90 === 0) console.log('frame', f, errors.length ? errors : '');
}
await browser.close();
console.log('done errors=', errors);
