// Folds dist/ into one self-contained HTML file so a build can be shared as a single page.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist-single';
let html = readFileSync(join(dist, 'play.html'), 'utf8');
const assets = readdirSync(join(dist, 'assets'));
for (const file of assets) {
  const body = readFileSync(join(dist, 'assets', file), 'utf8');
  if (file.endsWith('.js')) {
    html = html.replace(
      new RegExp(`<script[^>]*src="\\./assets/${file}"[^>]*></script>`),
      () => `<script type="module">${body.replace(/<\/script/g, '<\\/script')}</script>`,
    );
  } else if (file.endsWith('.css')) {
    html = html.replace(new RegExp(`<link[^>]*href="\\./assets/${file}"[^>]*>`), () => `<style>${body}</style>`);
  }
}
// A leftover asset reference would load nothing once the page is shared on its own, so fail instead.
if (/\.\/assets\//.test(html)) throw new Error('an asset reference was left outside the single file');
writeFileSync(join(dist, 'boss-mode.html'), html);
console.log(`wrote dist-single/boss-mode.html (${(html.length / 1024).toFixed(0)} KB)`);
