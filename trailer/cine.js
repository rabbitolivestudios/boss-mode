// BOSS MODE cartoon cinematic: 30 seconds, wordless, rendered by render(t) so every frame is exact.
const $ = (id) => document.getElementById(id);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const back = (p) => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const lerp = (a, b, p) => a + (b - a) * p;
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

const GROUND = 578;
/** Places an element by its bottom-centre point, with rotation and squash/stretch around its feet. */
function place(el, x, y, o = {}) {
  const { r = 0, sx = 1, sy = 1, op = 1, flip = false } = o;
  el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%) rotate(${r}deg) scale(${flip ? -sx : sx}, ${sy})`;
  el.style.opacity = String(op);
}
/** Same, but around the centre, for rings, bubbles and screen overlays. */
function placeC(el, x, y, o = {}) {
  const { r = 0, s = 1, op = 1 } = o;
  el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${r}deg) scale(${s})`;
  el.style.opacity = String(op);
}
function make(parent, cls, html = '') {
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  $(parent).appendChild(el);
  return el;
}

// ---- Cast ----
const HEROES = [
  ['noob', 'xX_BaconSlayer_Xx'], ['archer', 'TurboToast2014'], ['knight', 'SirClanksALot'], ['sweat', 'ProGamer_99'],
  ['healer', 'HealzPlz'], ['noob2', 'i_am_epic'], ['rogue', 'NinjaPotato'], ['nerd', 'BlockyLegend'],
].map(([id, tag], i) => {
  const el = document.createElement('div');
  el.className = 'a';
  el.innerHTML = `${i % 2 === 0 || id === 'rogue' ? `<div class="label">${tag}</div>` : ''}<img src="art/hero-${id}.webp" width="${id === 'knight' ? 126 : 116}">`;
  $('heroes').appendChild(el);
  const bang = make('fx', 'a bubble bang', '!');
  const sweat = make('fx', 'a sweat');
  return { el, id, i, bang, sweat, endX: 700 + i * 88, seed: rnd() * 6 };
});
const ROGUE = HEROES.find((h) => h.id === 'rogue');
const ZZZ = [0, 1, 2].map(() => make('fx', 'a zzz', 'Z'));
const RINGS = [0, 1, 2].map(() => make('fx', 'a ring'));
const BITS = Array.from({ length: 36 }, (_, i) => {
  const el = make('fx', 'a bit');
  el.style.background = ['#ffd23a', '#ff4fa3', '#29e0ff', '#fff', '#7cc653'][i % 5];
  return { el, a: -Math.PI * (0.15 + rnd() * 0.9), v: 500 + rnd() * 700, spin: rnd() * 900 - 450 };
});
const DUST = Array.from({ length: 18 }, (_, i) => ({ el: make('fx', 'a bit'), a: (i / 18) * Math.PI * 2, v: 220 + rnd() * 160 }));
for (const d of DUST) { d.el.style.background = '#e9dcc0'; d.el.style.borderRadius = '50%'; d.el.style.width = '26px'; d.el.style.height = '22px'; }
const DRAGON_SWEAT = make('fx', 'a sweat');
const ARMY = Array.from({ length: 46 }, (_, i) => {
  const ids = ['noob', 'archer', 'knight', 'sweat', 'healer', 'rogue', 'noob2', 'knight2', 'archer2', 'sweat2', 'shieldbearer', 'glider', 'sapper', 'nerd'];
  const img = document.createElement('img');
  img.className = 'a army';
  img.src = `art/hero-${ids[i % ids.length]}.webp`;
  img.width = 62 + (i % 3) * 8;
  $('armyLayer').appendChild(img);
  return { img, x: 180 + (i % 23) * 46 + (i >= 23 ? 22 : 0), row: i >= 23 ? 1 : 0, delay: rnd() * 0.8 };
});

// Head of the (mirrored) dragon in world coordinates, for zooms, Zzz and the roar.
const DRAGON_X = 1790, HEAD = { x: 1700, y: 300 };

function camera(t) {
  // [time, centreX, centreY, zoom]; cuts are pairs of keys at the same time.
  const K = [
    [0, 1560, 400, 0.88], [5, 1680, 390, 1.2],
    [5, 0, 470, 1.4], [10, 1000, 470, 1.4],
    [10, 1300, 470, 1.5], [12.5, 1450, 460, 1.6],
    [12.5, HEAD.x, HEAD.y, 3.2], [14, HEAD.x - 20, HEAD.y + 10, 3.4],
    [14, 1320, 440, 1.02], [18, 1340, 440, 1.06],
    [18, 1400, 400, 0.95], [22, 1500, 410, 1.0],
    [22, 1500, 410, 1.0], [22.8, 680, 360, 0.98], [24.4, 680, 350, 1.05],
    [24.4, HEAD.x, HEAD.y + 10, 2.6], [26, HEAD.x, HEAD.y + 20, 2.8],
    [26, 1640, 330, 0.92], [30, 1640, 325, 0.95],
  ];
  let a = K[0], b = K[0];
  for (let i = 0; i < K.length - 1; i++) if (t >= K[i][0] && t <= K[i + 1][0] && K[i + 1][0] > K[i][0]) { a = K[i]; b = K[i + 1]; }
  const p = b[0] > a[0] ? easeInOut(seg(t, a[0], b[0])) : 0;
  let x = lerp(a[1], b[1], p), y = lerp(a[2], b[2], p);
  const z = lerp(a[3], b[3], p);
  // Shake: the eye opening, the roar, the army's rumble, the logo slam.
  const shake = (from, to, amp) => (t >= from && t < to ? amp * (1 - seg(t, from, to)) : 0);
  const s = shake(13.05, 13.5, 10) + shake(18, 19.9, 26) + (t >= 22 && t < 24.4 ? 4 : 0) + shake(27.6, 28.2, 16);
  x += Math.sin(t * 91) * s; y += Math.cos(t * 77) * s;
  $('world').style.transform = `translate(${640 - x * z}px, ${360 - y * z}px) scale(${z})`;
}

function dragon(t) {
  const d = $('dragon');
  let src = 'dragon-blink', sx = 1, sy = 1, r = 0, y = GROUND + 4, x = DRAGON_X;
  if (t < 13.05) { sy = 1 + 0.035 * Math.sin((t / 2.2) * Math.PI * 2); sx = 1 - 0.015 * Math.sin((t / 2.2) * Math.PI * 2); }
  else if (t < 18) {
    src = 'dragon-idle';
    const pop = t < 13.4 ? 1 + 0.12 * Math.sin(seg(t, 13.05, 13.4) * Math.PI) : 1;
    const rise = easeOut(seg(t, 14.2, 14.8));
    const inhale = easeInOut(seg(t, 15.2, 17.8));
    sx = pop * (1 - 0.08 * inhale); sy = pop * (1 + 0.24 * inhale); r = 7 * inhale; y -= 18 * rise;
  } else if (t < 20) {
    src = 'dragon-hurt';
    const punch = seg(t, 18, 18.35);
    const k = 1 + 0.28 * (1 - easeOut(punch));
    sx = k * (1 + 0.04 * Math.sin(t * 40) * (1 - seg(t, 18, 19.8))); sy = k * 0.96; r = -9 * (1 - seg(t, 19, 20));
  } else if (t < 21.4) { src = 'dragon-idle'; r = 3 * Math.sin(t * 3); }
  else if (t < 24.5) { src = 'dragon-blink'; sy = 1 + 0.035 * Math.sin((t / 2.2) * Math.PI * 2); }
  else if (t < 26) {
    src = 'dragon-idle';
    const gulp = Math.sin(seg(t, 25.1, 25.5) * Math.PI);
    sy = 1 - 0.1 * gulp; sx = 1 + 0.05 * gulp;
  } else { src = 'dragon-idle'; const land = Math.sin(seg(t, 27.6, 27.9) * Math.PI); sy = 1 - 0.08 * land; sx = 1 + 0.05 * land; }
  if (!d.src.endsWith(`${src}.png`)) d.src = `art/${src}.png`;
  place(d, x, y, { sx, sy, r, flip: true });

  // Zzz while asleep.
  ZZZ.forEach((z, i) => {
    const asleep = t < 12.4 || (t > 21.6 && t < 24.4);
    const c = ((t + i * 0.8) % 2.4) / 2.4;
    placeC(z, HEAD.x - 10 - c * 60 + i * 5, HEAD.y - 50 - c * 150, { s: 0.5 + c * 0.9, r: -12 + c * 20, op: asleep ? Math.sin(c * Math.PI) : 0 });
  });
  // Nervous sweat at the gulp.
  const sw = seg(t, 24.9, 25.9);
  placeC(DRAGON_SWEAT, HEAD.x + 55, HEAD.y - 30 + sw * 70, { s: 1.3, op: t > 24.9 && t < 25.9 ? 1 - sw * 0.5 : 0 });
}

function heroes(t) {
  for (const h of HEROES) {
    let x, y = GROUND, r = 0, sy = 1, sx = 1, op = 1;
    const walkStart = 5.0 + h.i * 0.18, walkEnd = 9.8 + h.i * 0.05;
    // Tiptoe: each 0.5 s step moves in its first 60%, then holds, like sneaking.
    const w = seg(t, walkStart, walkEnd);
    const steps = w * 10, stepP = Math.min(1, (steps % 1) / 0.6), progress = (Math.floor(steps) + easeInOut(stepP)) / 10;
    const startX = -80 - (7 - h.i) * 95;
    x = lerp(startX, h.endX, Math.min(1, progress));
    if (t > walkStart && t < walkEnd) { y -= Math.abs(Math.sin(steps * Math.PI)) * 16; r = Math.sin(steps * Math.PI) * 6; sy = 1 + 0.05 * Math.sin(steps * Math.PI * 2); }
    // The knight trips flat on his face, then gets up.
    if (h.id === 'knight' && t > 7.6 && t < 9.2) {
      const fall = t < 8.0 ? easeOut(seg(t, 7.6, 8.0)) : 1 - easeInOut(seg(t, 8.6, 9.2));
      r = 84 * fall; y += 6 * fall;
    }
    // The rogue goes on alone to the vault and lifts a coin.
    if (h === ROGUE) {
      const go = easeInOut(seg(t, 10.0, 11.3));
      if (t >= 10) x = lerp(h.endX, 1440, go);
      if (t > 10 && t < 11.3) { y -= Math.abs(Math.sin(t * 14)) * 12; r = Math.sin(t * 14) * 5; }
      if (t > 12.2 && t < 13.05) x = 1440 - easeOut(seg(t, 12.2, 13.05)) * 40;
      if (t >= 13.05 && t < 18) x = 1400;
    }
    // Frozen with fright: a "!" and a sweat drop each, a little tremble.
    const scared = t > 14.3 && t < 18;
    if (scared) { x += Math.sin(t * 60 + h.seed) * 1.5; sy = 1 + 0.03 * Math.sin(t * 20 + h.seed); }
    const bangT = seg(t, 14.3 + h.i * 0.07, 14.55 + h.i * 0.07);
    placeC(h.bang, x + 8, y - 175, { s: scared ? back(bangT) : 0, r: -10 + h.i * 3, op: scared ? 1 : 0 });
    const sweatC = ((t - 15) % 1.1) / 1.1;
    placeC(h.sweat, x + 40, y - 120 + sweatC * 60, { op: t > 15 && t < 18 ? 1 - sweatC : 0 });
    // Blown away by the roar: each hero spins off in an arc.
    if (t >= 18) {
      const f = seg(t, 18.05 + h.i * 0.035, 19.5 + h.i * 0.035);
      const base = h === ROGUE ? 1400 : h.endX;
      x = base - (1200 + h.i * 90) * easeOut(f);
      y = GROUND - Math.sin(f * Math.PI * 0.8) * (320 + h.i * 25) - f * 120;
      r = -900 * f - h.i * 30; sx = sy = 1 - 0.4 * f; op = f >= 1 ? 0 : 1;
    }
    if (t >= 20) op = 0;
    place(h.el, x, y, { r, sx, sy, op });
  }
}

function coin(t) {
  const c = $('coin');
  let x = 1560, y = 468, r = 0, op = 0;
  if (t >= 11.4 && t < 15.5) {
    const lift = easeOut(seg(t, 11.4, 12.2));
    const rx = ROGUE.el.style.transform.match(/translate\(([-\d.]+)px/);
    const hx = rx ? Number(rx[1]) + 36 : 1470;
    x = lerp(1560, hx, lift); y = lerp(468, GROUND - 58, lift) - Math.sin(lift * Math.PI) * 60; op = 1;
    if (t > 12.2) y += Math.sin(t * 12) * 3;
  } else if (t >= 15.5 && t < 20.2) {
    const drop = seg(t, 15.5, 15.9);
    x = 1430; y = lerp(GROUND - 58, GROUND - 4, easeOut(drop)) - Math.sin(drop * Math.PI) * 30; r = 90 * drop; op = 1;
  } else if (t >= 20.2 && t < 21.3) {
    // It rolls and hops back into the vault by itself.
    const home = seg(t, 20.2, 21.3);
    x = lerp(1430, 1560, home); y = lerp(GROUND - 4, 470, home) - Math.sin(home * Math.PI) * 140; r = 720 * home; op = 1 - seg(t, 21.1, 21.3);
  }
  place(c, x, y, { r, op });
}

function roarFx(t) {
  RINGS.forEach((ring, i) => {
    const p = seg(t, 18 + i * 0.22, 18.95 + i * 0.22);
    const size = 40 + easeOut(p) * 1500;
    ring.style.width = ring.style.height = `${size}px`;
    ring.style.borderWidth = `${14 - 10 * p}px`;
    placeC(ring, HEAD.x - 60, HEAD.y + 40, { op: p > 0 && p < 1 ? 0.9 * (1 - p) : 0 });
  });
  for (const b of BITS) {
    const p = seg(t, 18.05, 19.8);
    const d = b.v * easeOut(p);
    placeC(b.el, HEAD.x - 60 + Math.cos(b.a) * d - p * 300, HEAD.y + 30 + Math.sin(b.a) * d + p * p * 500, { r: b.spin * p, op: p > 0 && p < 1 ? 1 : 0 });
  }
  const rt = seg(t, 18, 18.3);
  placeC($('roarText'), 640, 150, { s: t >= 18 && t < 19.9 ? back(rt) * (1 + 0.04 * Math.sin(t * 50)) : 0, r: -6 + Math.sin(t * 30) * 2, op: t >= 18 && t < 19.9 ? 1 - seg(t, 19.6, 19.9) : 0 });
}

function army(t) {
  for (const a of ARMY) {
    const rise = easeOut(seg(t, 22.3 + a.delay, 23.2 + a.delay));
    const step = Math.abs(Math.sin((t + a.delay) * 8)) * 6 * rise;
    place(a.img, a.x, 470 - a.row * 26 + (1 - rise) * 110 - step, { op: t > 22 && t < 26 ? 1 : 0 });
  }
  const c = easeOut(seg(t, 23.0, 23.9));
  const on = t > 22.9 && t < 26;
  place($('chosen'), 690, 470 - c * 95, { op: on ? 1 : 0, sy: 1 + 0.02 * Math.sin(t * 6) });
  placeC($('glow'), 690, 350 - c * 95, { s: 0.6 + c * 0.6 + 0.04 * Math.sin(t * 7), op: on ? c : 0 });
  placeC($('rays'), 690, 350 - c * 95, { r: t * 25, s: 0.4 + c * 0.8, op: on ? c * 0.9 : 0 });
}

function finale(t) {
  // Gloop bounces in from the right, Rattles from the left, each landing with a squash.
  const g = seg(t, 26.1, 26.9), rr = seg(t, 26.5, 27.3);
  const gl = t > 26.9 && t < 27.2 ? 1 - Math.sin(seg(t, 26.9, 27.2) * Math.PI) * 0.18 : 1;
  const rl = t > 27.3 && t < 27.6 ? 1 - Math.sin(seg(t, 27.3, 27.6) * Math.PI) * 0.18 : 1;
  place($('gloop'), lerp(2700, 2150, easeOut(g)), GROUND + 10 - Math.sin(g * Math.PI) * 260, { sy: gl, sx: 2 - gl, r: (1 - g) * 25, op: t > 26.1 ? 1 : 0 });
  place($('rattles'), lerp(800, 1230, easeOut(rr)), GROUND + 8 - Math.sin(rr * Math.PI) * 240, { sy: rl, sx: 2 - rl, r: -(1 - rr) * 25, op: t > 26.5 ? 1 : 0 });
  const l = seg(t, 27.6, 28.05);
  placeC($('logo'), 640, lerp(-300, 140, easeOut(l)), { s: t < 28.05 ? lerp(1.9, 1, easeOut(l)) : 1 + 0.12 * Math.sin(seg(t, 28.05, 28.35) * Math.PI) * (1 - seg(t, 28.05, 28.35)), r: -3, op: t > 27.6 ? 1 : 0 });
  for (const d of DUST) {
    const p = seg(t, 28.0, 28.9);
    placeC(d.el, 640 + Math.cos(d.a) * d.v * easeOut(p) * 1.4, 260 + Math.sin(d.a) * d.v * easeOut(p) * 0.4, { s: 1 + p, op: p > 0 && p < 1 ? 1 - p : 0 });
  }
  // The dust puffs are screen-space, so they move to the overlay layer.
  const tg = seg(t, 28.6, 28.95);
  placeC($('tagline'), 640, 322, { s: t > 28.6 ? back(tg) : 0, r: 2, op: t > 28.6 ? 1 : 0 });
  $('flash').style.opacity = String(t > 29.7 ? seg(t, 29.7, 30) : Math.max(t < 5.25 && t >= 5 ? 1 - seg(t, 5, 5.25) : 0, t >= 18 && t < 18.25 ? 0.8 * (1 - seg(t, 18, 18.25)) : 0));
}

// Static set pieces.
place($('moon'), 2050, 290);
place($('towerL'), 1160, GROUND + 8); place($('wall1'), 1270, GROUND + 6); place($('wall2'), 1375, GROUND + 6);
place($('vault'), 1560, GROUND + 10); place($('wall3'), 2000, GROUND + 6); place($('towerR'), 2140, GROUND + 8);
for (const d of DUST) $('overlay').appendChild(d.el);
for (const d of DUST) d.el.style.position = 'absolute';

window.render = (t) => {
  camera(t);
  dragon(t);
  heroes(t);
  coin(t);
  roarFx(t);
  army(t);
  finale(t);
};
window.ready = Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = r; i.onerror = r; })))).then(() => document.fonts.load('40px "Lilita One"'));
render(0);
