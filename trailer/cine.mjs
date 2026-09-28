import { chromium } from 'playwright';
const [,, dir, out, list] = process.argv;
const times = list ? list.split(',').map(Number) : Array.from({ length: 900 }, (_, i) => i / 30);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`file://${dir}/index.html`);
await p.evaluate(() => window.ready);
for (const [i, t] of times.entries()) {
  await p.evaluate((t) => window.render(t), t);
  await p.screenshot({ path: list ? `${out}/t${String(t).replace('.', '_')}.png` : `${out}/c${String(i).padStart(4, '0')}.png` });
}
console.log('errors', errs); await b.close();
