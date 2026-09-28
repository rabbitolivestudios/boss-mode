// Renders the landing page's art from the game's own drawing code, at 3x, into public/art as WebP.
// Run after changing any character or logo art:  node scripts/render-landing-art.mjs
// It starts a Vite dev server with VITE_ART_SCALE=3, draws every piece in Chromium, trims the
// transparent margins, and writes the files. Needs Chromium for Playwright (PLAYWRIGHT_BROWSERS_PATH
// or `npx playwright install chromium`) and ffmpeg on PATH or FFMPEG for the WebP conversion.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const OUT = 'public/art';
const PORT = 5199;
const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';

const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { env: { ...process.env, VITE_ART_SCALE: '3' }, stdio: 'ignore' });
try {
  // Wait for the dev server to answer rather than guessing how long it takes to start.
  for (let i = 0; ; i++) {
    try { if ((await fetch(`http://localhost:${PORT}/analytics.html`)).ok) break; } catch { /* not up yet */ }
    if (i > 60) throw new Error('Vite dev server did not start');
    await new Promise((r) => setTimeout(r, 500));
  }
  const executablePath = process.env.PLAYWRIGHT_BROWSERS_PATH ? `${process.env.PLAYWRIGHT_BROWSERS_PATH}/chromium` : undefined;
  const browser = await chromium.launch({ executablePath });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/analytics.html`);
  const files = await page.evaluate(async () => {
    await import('/node_modules/@fontsource/lilita-one/index.css');
    const cast = await import('/src/game/cast.ts');
    const boss = await import('/src/game/bossart.ts');
    const loot = await import('/src/game/lootart.ts');
    const castle = await import('/src/game/castleart.ts');
    const logo = await import('/src/landing/logo.ts');
    const trim = (c) => {
      const g = c.getContext('2d');
      const { data, width: w, height: h } = g.getImageData(0, 0, c.width, c.height);
      let x0 = w, y0 = h, x1 = 0, y1 = 0;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 8) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const o = document.createElement('canvas');
      o.width = x1 - x0 + 1; o.height = y1 - y0 + 1;
      o.getContext('2d').drawImage(c, -x0, -y0);
      return o.toDataURL('image/png');
    };
    const fromAtlas = (atlas, ids, prefix, res) => ids.forEach((id, i) => {
      const cols = atlas.cols, cell = atlas.tex.image.width / cols;
      const o = document.createElement('canvas');
      o.width = cell; o.height = cell;
      o.getContext('2d').drawImage(atlas.tex.image, -(i % cols) * cell, -Math.floor(i / cols) * cell);
      res[`${prefix}-${id}`] = trim(o);
    });
    const res = {};
    for (const id of ['dragon', 'slime', 'bonelord']) res[`boss-${id}`] = trim(boss.bossPortrait(id));
    for (const id of cast.CAST) res[`hero-${id}`] = trim(cast.castPortrait(id));
    fromAtlas(loot.lootAtlas(), loot.LOOT, 'loot', res);
    fromAtlas(castle.castleAtlas(), castle.CASTLE_ART, 'castle', res);
    res.logo = trim(await logo.drawLogo(1600));
    // App icons: full-square for home screens and installs, rounded for browser tabs.
    for (const [name, size, rounded] of [['icon-512', 512, false], ['icon-192', 192, false], ['apple-touch-icon', 180, false], ['favicon-32', 32, true], ['favicon-16', 16, true], ['icon', 512, true]]) {
      res[name] = logo.drawIcon(size, rounded).toDataURL('image/png');
    }
    return res;
  });
  await browser.close();
  if (errors.length) throw new Error(errors.join('\n'));
  mkdirSync(OUT, { recursive: true });
  for (const [name, url] of Object.entries(files)) {
    const png = `${OUT}/${name}.png`;
    writeFileSync(png, Buffer.from(url.split(',')[1], 'base64'));
    // The icon stays PNG (browsers and home screens want PNG icons); everything else becomes WebP.
    if (name.startsWith('icon') || name.startsWith('favicon') || name === 'apple-touch-icon') continue;
    const r = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', png, '-c:v', 'libwebp', '-quality', '88', `${OUT}/${name}.webp`]);
    if (r.status !== 0) throw new Error(`ffmpeg failed on ${name}`);
    rmSync(png);
  }
  // Browsers still ask for /favicon.ico at the site root; build it from the two tab sizes.
  const ico = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', `${OUT}/favicon-32.png`, 'public/favicon.ico']);
  if (ico.status !== 0) throw new Error('ffmpeg failed on favicon.ico');
  console.log(`rendered ${Object.keys(files).length} images into ${OUT}`);
} finally {
  vite.kill();
}
