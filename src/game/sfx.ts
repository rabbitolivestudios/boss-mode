import { getEngine, hiss, kick, midi, note, tom, type Voice } from './audio';

/** Layered synth sound effects on the shared engine. Phrases are scheduled on the audio clock. */

const last: Record<string, number> = {};

/** Hundreds of hits per second would turn into a buzz, so each sound has a minimum gap. */
function gate(key: string, gap: number): boolean {
  const now = performance.now();
  if ((last[key] ?? 0) + gap > now) return false;
  last[key] = now;
  return true;
}

/** Runs a sound with a dry and a reverb-send voice at the current audio time, if audio is on. */
function play(fn: (v: Voice, wet: Voice, t: number) => void): void {
  const e = getEngine();
  if (!e) return;
  fn({ out: e.sfx }, { out: e.sfx, wet: 0.35 }, e.ctx.currentTime + 0.005);
}

const r = (a: number, b: number): number => a + Math.random() * (b - a);

/** Paper being crumpled: a few quick bursts of bright, narrow noise. */
function crinkle(v: Voice, t: number, vol: number, bursts: number): void {
  for (let i = 0; i < bursts; i++) {
    hiss(v, t + r(0, 0.09), { vol: vol * r(0.5, 1), dur: r(0.008, 0.025), filter: 'bandpass', freq: r(2500, 7000), q: r(2, 6) });
  }
}

function fanfare(v: Voice, t: number, notes: number[], gap: number, len: number, vol: number): void {
  notes.forEach((n, i) => {
    note(v, t + i * gap, midi(n), { type: 'sawtooth', vol, attack: 0.02, dur: len, release: 0.25, detune: 8, cutoff: 2600, cutoffEnd: 1200 });
    note(v, t + i * gap, midi(n + 12), { type: 'triangle', vol: vol * 0.6, attack: 0.01, dur: len, release: 0.3 });
  });
}

export const sfx = {
  /** The boss's attack landing: a thwack with a little pitch so repeats don't drone. */
  hit: () => gate('hit', 45) && play((v, _w, t) => {
    hiss(v, t, { vol: 0.14, dur: 0.04, filter: 'bandpass', freq: r(1200, 2000), q: 1.5 });
    note(v, t, r(180, 260), { type: 'square', vol: 0.05, dur: 0.02, release: 0.05, slide: 0.5, cutoff: 1500 });
  }),
  /** A hero defeated: paper crumple plus a comic pop. */
  pop: () => gate('pop', 40) && play((v, _w, t) => {
    crinkle(v, t, 0.12, 4);
    note(v, t, r(500, 700), { type: 'triangle', vol: 0.1, dur: 0.02, release: 0.07, slide: 2 });
  }),
  gem: () => gate('gem', 30) && play((_v, w, t) => {
    note(w, t, r(1500, 1900), { type: 'sine', vol: 0.07, dur: 0.02, release: 0.12, slide: 1.3 });
  }),
  hurt: () => gate('hurt', 180) && play((v, _w, t) => {
    note(v, t, 150, { type: 'sawtooth', vol: 0.14, dur: 0.05, release: 0.12, slide: 0.5, cutoff: 900 });
    hiss(v, t, { vol: 0.1, dur: 0.08, filter: 'lowpass', freq: 900 });
  }),
  stomp: () => gate('stomp', 100) && play((v, _w, t) => {
    kick(v, t, 0.9, 110);
    hiss(v, t, { vol: 0.25, dur: 0.3, filter: 'lowpass', freq: 1400, freqEnd: 200 });
    crinkle(v, t + 0.03, 0.06, 3);
  }),
  zap: () => gate('zap', 60) && play((v, _w, t) => {
    note(v, t, 1800, { type: 'square', vol: 0.05, dur: 0.03, release: 0.08, slide: 0.25, cutoff: 5000 });
    hiss(v, t, { vol: 0.08, dur: 0.1, filter: 'highpass', freq: 4000 });
  }),
  fire: () => gate('fire', 90) && play((v, _w, t) => {
    hiss(v, t, { vol: 0.1, dur: 0.12, filter: 'bandpass', freq: 900, freqEnd: 400, q: 1 });
  }),
  /** Frost Nova: a glassy shimmer over a cold hiss. */
  freeze: () => gate('freeze', 150) && play((v, w, t) => {
    [96, 91, 88, 84].forEach((n, i) => note(w, t + i * 0.035, midi(n), { type: 'sine', vol: 0.06, dur: 0.02, release: 0.35 }));
    hiss(v, t, { vol: 0.14, dur: 0.35, filter: 'highpass', freq: 5000, freqEnd: 2500 });
  }),
  /** Tornado: a rising, swirling rush of wind. */
  whirl: () => gate('whirl', 250) && play((_v, w, t) => {
    hiss(w, t, { vol: 0.22, dur: 0.9, attack: 0.3, filter: 'bandpass', freq: 300, freqEnd: 1800, q: 3 });
  }),
  /** Boomerang: a quick swish past the ear. */
  swish: () => gate('swish', 120) && play((v, _w, t) => {
    hiss(v, t, { vol: 0.12, dur: 0.18, attack: 0.05, filter: 'bandpass', freq: 1200, freqEnd: 3200, q: 2 });
  }),
  level: () => play((_v, w, t) => {
    [72, 76, 79, 84, 88].forEach((n, i) => note(w, t + i * 0.06, midi(n), { type: 'triangle', vol: 0.13, dur: 0.04, release: 0.4 }));
    hiss(w, t + 0.3, { vol: 0.05, dur: 0.4, filter: 'highpass', freq: 9000 });
  }),
  /** A monster roar: a growling sawtooth, tremolo'd, over a sub drop and a breathy rush. */
  roar: () => play((v, w, t) => {
    const e = getEngine();
    if (!e) return;
    const growl = e.ctx.createOscillator();
    const trem = e.ctx.createOscillator();
    const tremGain = e.ctx.createGain();
    const g = e.ctx.createGain();
    const f = e.ctx.createBiquadFilter();
    growl.type = 'sawtooth';
    growl.frequency.setValueAtTime(95, t);
    growl.frequency.linearRampToValueAtTime(130, t + 0.25);
    growl.frequency.exponentialRampToValueAtTime(55, t + 1.1);
    trem.frequency.value = 28; tremGain.gain.value = 0.25;
    f.type = 'lowpass'; f.Q.value = 5;
    f.frequency.setValueAtTime(600, t);
    f.frequency.linearRampToValueAtTime(1600, t + 0.25);
    f.frequency.exponentialRampToValueAtTime(300, t + 1.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.45, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    trem.connect(tremGain).connect(g.gain);
    growl.connect(f).connect(g).connect(v.out);
    growl.start(t); trem.start(t); growl.stop(t + 1.25); trem.stop(t + 1.25);
    hiss(w, t, { vol: 0.35, dur: 1, attack: 0.08, filter: 'bandpass', freq: 1200, freqEnd: 300, q: 0.8 });
    kick(v, t, 1, 90);
  }),
  horn: () => play((_v, w, t) => fanfare(w, t, [55, 55, 60], 0.18, 0.16, 0.08)),
  siren: () => play((v, _w, t) => {
    for (let i = 0; i < 4; i++) note(v, t + i * 0.3, i % 2 ? 620 : 880, { type: 'square', vol: 0.07, dur: 0.22, release: 0.05, cutoff: 2500 });
  }),
  /** A coin: two bright bell partials, the classic up-step. */
  coin: () => gate('coin', 50) && play((_v, w, t) => {
    for (const [dt, f] of [[0, 1320], [0.055, 1760]] as const) {
      note(w, t + dt, f, { type: 'sine', vol: 0.08, dur: 0.01, release: 0.25 });
      note(w, t + dt, f * 2.76, { type: 'sine', vol: 0.025, dur: 0.01, release: 0.1 });
    }
  }),
  steal: () => gate('steal', 300) && play((v, _w, t) => {
    [660, 520, 400].forEach((f, i) => note(v, t + i * 0.06, f, { type: 'triangle', vol: 0.1, dur: 0.05, release: 0.06 }));
    hiss(v, t, { vol: 0.08, dur: 0.15, filter: 'bandpass', freq: 3000, freqEnd: 1200, q: 2 });
  }),
  escape: () => gate('escape', 400) && play((v, _w, t) => {
    [60, 57, 53].forEach((n, i) => note(v, t + i * 0.11, midi(n), { type: 'sawtooth', vol: 0.09, dur: 0.12, release: 0.08, cutoff: 1500 }));
  }),
  /** A building going down: wood thunk plus paper. */
  place: () => play((v, _w, t) => {
    tom(v, t, 220, 0.35);
    hiss(v, t, { vol: 0.12, dur: 0.05, filter: 'bandpass', freq: 800, q: 2 });
    crinkle(v, t + 0.02, 0.05, 2);
  }),
  sell: () => play((v, _w, t) => {
    crinkle(v, t, 0.1, 5);
    note(v, t, 700, { type: 'triangle', vol: 0.06, dur: 0.02, release: 0.1, slide: 0.6 });
  }),
  repair: () => play((v, _w, t) => {
    for (let i = 0; i < 3; i++) note(v, t + i * 0.09, 900, { type: 'square', vol: 0.05, dur: 0.01, release: 0.05, cutoff: 3000 });
  }),
  click: () => gate('click', 60) && play((v, _w, t) => {
    note(v, t, 1100, { type: 'triangle', vol: 0.05, dur: 0.01, release: 0.04 });
  }),
  win: () => play((_v, w, t) => {
    fanfare(w, t, [60, 64, 67, 72], 0.14, 0.12, 0.09);
    fanfare(w, t + 0.6, [72], 0, 0.8, 0.09);
    fanfare(w, t + 0.6, [76, 79], 0, 0.8, 0.05);
  }),
  lose: () => play((_v, w, t) => {
    [67, 66, 65, 64].forEach((n, i) => note(w, t + i * 0.28, midi(n - 12), { type: 'sawtooth', vol: 0.09, dur: 0.22, release: 0.2, cutoff: 1400, vibrato: i === 3 ? 0.03 : 0 }));
  }),
};
