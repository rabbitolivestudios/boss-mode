// Records the trailer soundtrack from the game's own audio engine, following a cue sheet.
// Output: a 60 s WAV aligned so that 0 s is the first frame of the trailer.
import { chromium } from 'playwright';
import fs from 'fs';
const OUT = process.argv[2];
const LEN = 60;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.addInitScript(() => {
  // Capture the master output as raw samples, before any encoding.
  const orig = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    const r = orig.call(this, dest, ...rest);
    if (dest instanceof AudioDestinationNode && !window.__cap) {
      const ctx = this.context;
      const proc = ctx.createScriptProcessor(4096, 2, 2);
      const cap = { l: [], r: [], rate: ctx.sampleRate, started: false };
      proc.onaudioprocess = (e) => { if (!cap.started) return; cap.l.push(new Float32Array(e.inputBuffer.getChannelData(0))); cap.r.push(new Float32Array(e.inputBuffer.getChannelData(1))); };
      orig.call(this, proc); orig.call(proc, ctx.destination);
      window.__cap = cap;
    }
    return r;
  };
});
await p.goto('http://localhost:5173/analytics.html');
const wavB64 = await p.evaluate(async (LEN) => {
  const A = await import('/src/game/audio.ts');
  const { music } = await import('/src/game/music.ts');
  const { sfx } = await import('/src/game/sfx.ts');
  A.unlockAudio();
  await new Promise((r) => setTimeout(r, 600));
  const e = A.getEngine();
  const V = { out: e.sfx }, W = { out: e.sfx, wet: 0.35, verb: e.sfxVerb };
  const now = () => e.ctx.currentTime + 0.01;
  const R = (a, b) => a + Math.random() * (b - a);
  const snore = () => { const t = now(); A.hiss(V, t, { vol: 0.22, dur: 0.9, attack: 0.5, filter: 'lowpass', freq: 260, freqEnd: 520 }); A.note(V, t + 1.0, 900, { type: 'sine', vol: 0.05, attack: 0.05, dur: 0.35, release: 0.2, slide: 0.6 }); };
  const clank = () => { const t = now(); A.tom(V, t, 180, 0.5); A.note(V, t, 1300, { type: 'square', vol: 0.06, dur: 0.02, release: 0.3, cutoff: 4000 }); A.note(V, t + 0.07, 1700, { type: 'square', vol: 0.05, dur: 0.02, release: 0.25, cutoff: 4000 }); sfx.hurt(); };
  const dun = () => { const t = now(); A.kick(V, t, 1, 90); A.note(W, t, 110, { type: 'sawtooth', vol: 0.12, dur: 0.3, release: 0.8, cutoff: 600 }); };
  const inhale = () => { const t = now(); A.hiss(W, t, { vol: 0.32, dur: 2.6, attack: 2.4, filter: 'bandpass', freq: 250, freqEnd: 3200, q: 1.2 }); };
  const rumble = () => { for (let i = 0; i < 9; i++) A.kick(V, now() + i * 0.25, 0.5 + i * 0.04, 70); };
  const gulp = () => { const t = now(); A.note(V, t, 420, { type: 'sine', vol: 0.25, dur: 0.08, release: 0.15, slide: 0.35 }); A.note(V, t + 0.18, 300, { type: 'sine', vol: 0.18, dur: 0.05, release: 0.12, slide: 0.4 }); };
  const boing = () => { const t = now(); A.note(V, t, 220, { type: 'triangle', vol: 0.18, dur: 0.05, release: 0.3, slide: 3 }); };
  const whoosh = () => { A.hiss(W, now(), { vol: 0.3, dur: 0.45, attack: 0.25, filter: 'bandpass', freq: 400, freqEnd: 4000, q: 0.8 }); };
  const slam = () => { const t = now(); A.kick(V, t, 1, 120); A.hiss(V, t, { vol: 0.35, dur: 0.4, filter: 'lowpass', freq: 1500, freqEnd: 200 }); sfx.horn(); };
  const combat = (from, to) => { for (let t = from; t < to; t += R(0.08, 0.2)) cue(t, () => [sfx.hit, sfx.pop, sfx.pop, sfx.zap, sfx.gem, sfx.fire][Math.floor(Math.random() * 6)]()); };

  const cues = [];
  const cue = (t, fn) => cues.push([t, fn]);
  // ---- Cartoon (0-30 s) ----
  cue(0, () => music.set('title'));
  for (let t = 0.2; t < 12.3; t += 2.2) cue(t, snore);
  cue(5.0, () => music.set('build'));
  cue(7.95, clank);
  cue(11.75, () => sfx.coin());
  cue(12.45, () => music.set('none'));
  cue(13.05, () => { dun(); sfx.pop(); });
  for (let i = 0; i < 8; i++) cue(14.3 + i * 0.07, () => sfx.click());
  cue(15.2, inhale);
  cue(15.55, () => sfx.gem());
  cue(18.0, () => { sfx.roar(); A.kick(V, now(), 1, 80); });
  for (let i = 0; i < 8; i++) cue(18.1 + i * 0.09, () => sfx.pop());
  cue(20.25, boing); cue(20.8, boing); cue(21.2, () => sfx.coin());
  for (let t = 21.7; t < 22.2; t += 2.2) cue(t, snore);
  cue(22.0, rumble);
  cue(22.35, () => { music.setIntensity(1); music.set('final'); });
  cue(23.0, () => sfx.level());
  cue(24.4, () => music.set('none'));
  cue(25.1, gulp);
  cue(26.0, () => { music.setIntensity(0.9); music.set('raid'); });
  cue(26.9, () => sfx.stomp()); cue(27.3, () => sfx.stomp());
  cue(27.6, slam);
  cue(28.6, () => sfx.click());
  cue(29.6, whoosh);
  // ---- Gameplay (30-56 s) + end card hold (56-60 s) ----
  cue(30.0, () => { music.setIntensity(0.3); music.set('build'); });
  for (let k = 0; k < 14; k++) cue(30.0 + k * 0.267, () => sfx.place());
  cue(34.0, () => { music.setIntensity(0.85); music.set('raid'); sfx.horn(); });
  combat(34.3, 50.7);
  cue(37.6, () => sfx.steal()); cue(38.9, () => sfx.coin()); cue(39.6, () => sfx.escape());
  cue(41.6, () => sfx.stomp()); cue(42.4, () => sfx.stomp());
  cue(45.5, () => sfx.roar());
  cue(47.0, () => { music.setIntensity(1); music.set('final'); sfx.horn(); });
  cue(50.83, () => { music.set('none'); sfx.win(); });
  cue(53.0, () => { music.set('title'); slam(); });

  const cap = window.__cap;
  cap.started = true;
  const t0 = performance.now();
  cues.sort((a, b) => a[0] - b[0]);
  for (const [t, fn] of cues) {
    const wait = t0 + t * 1000 - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    fn();
  }
  await new Promise((r) => setTimeout(r, t0 + LEN * 1000 + 300 - performance.now()));
  cap.started = false;
  // Interleave to 16-bit WAV, trimmed to exactly LEN seconds.
  const n = Math.min(cap.l.reduce((a, c) => a + c.length, 0), Math.round(LEN * cap.rate));
  const l = new Float32Array(n), r = new Float32Array(n);
  let o = 0; for (let i = 0; i < cap.l.length && o < n; i++) { const c = cap.l[i].subarray(0, n - o); l.set(c, o); r.set(cap.r[i].subarray(0, c.length), o); o += c.length; }
  const buf = new DataView(new ArrayBuffer(44 + n * 4));
  const str = (off, s) => { for (let i = 0; i < s.length; i++) buf.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); buf.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 2, true);
  buf.setUint32(24, cap.rate, true); buf.setUint32(28, cap.rate * 4, true); buf.setUint16(32, 4, true); buf.setUint16(34, 16, true); str(36, 'data'); buf.setUint32(40, n * 4, true);
  for (let i = 0; i < n; i++) { buf.setInt16(44 + i * 4, Math.max(-1, Math.min(1, l[i])) * 32767, true); buf.setInt16(46 + i * 4, Math.max(-1, Math.min(1, r[i])) * 32767, true); }
  const bytes = new Uint8Array(buf.buffer);
  let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}, LEN);
fs.writeFileSync(OUT, Buffer.from(wavB64, 'base64'));
console.log('wrote', OUT, 'errors', errs); await b.close();
