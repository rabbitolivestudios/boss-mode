/**
 * The shared sound engine: one AudioContext, a music bus and an effects bus into a compressor, and a
 * small instrument kit that both the music sequencer and the sound effects play. Everything is
 * synthesized, so there are no audio files to download and nothing to license.
 */

export type SoundSetting = 'all' | 'sfx' | 'off';
const SETTING_KEY = 'boss-mode-sound';
const MUSIC_LEVEL = 0.55;
const SFX_LEVEL = 0.9;

export interface Engine {
  ctx: AudioContext;
  music: GainNode;
  sfx: GainNode;
  /** Send to the shared room reverb; both buses can use it. */
  reverb: GainNode;
  noise: AudioBuffer;
}

let engine: Engine | null = null;
let setting: SoundSetting = readSetting();
let ducked = 1;

function readSetting(): SoundSetting {
  try {
    const v = localStorage.getItem(SETTING_KEY);
    return v === 'sfx' || v === 'off' ? v : 'all';
  } catch { return 'all'; }
}

export function getEngine(): Engine | null {
  return engine;
}

/** Browsers only allow sound after a tap or key press, so this runs from input handlers. */
export function unlockAudio(): void {
  if (!engine) {
    const ctx = new AudioContext();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
    comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(ctx.destination);

    const music = ctx.createGain();
    const sfx = ctx.createGain();
    music.connect(comp); sfx.connect(comp);

    const reverb = ctx.createGain();
    reverb.gain.value = 0.9;
    const conv = ctx.createConvolver();
    conv.buffer = impulse(ctx, 2.2, 2.6);
    reverb.connect(conv).connect(comp);

    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    engine = { ctx, music, sfx, reverb, noise };
    applyLevels(0);
  }
  if (engine.ctx.state === 'suspended') void engine.ctx.resume();
}

function impulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function applyLevels(ramp: number): void {
  if (!engine) return;
  const t = engine.ctx.currentTime;
  const m = setting === 'all' ? MUSIC_LEVEL * ducked : 0;
  const s = setting === 'off' ? 0 : SFX_LEVEL;
  engine.music.gain.setTargetAtTime(m, t, ramp || 0.001);
  engine.sfx.gain.setTargetAtTime(s, t, ramp || 0.001);
}

export function soundSetting(): SoundSetting {
  return setting;
}

/** All sound, then effects only (for players who bring their own music), then silence. */
export function cycleSound(): SoundSetting {
  setting = setting === 'all' ? 'sfx' : setting === 'sfx' ? 'off' : 'all';
  try { localStorage.setItem(SETTING_KEY, setting); } catch { /* private mode: setting lasts this visit */ }
  applyLevels(0.05);
  return setting;
}

/** Pulls the music down under pause menus and big moments, then lets it back up. */
export function duckMusic(level: number, ramp = 0.15): void {
  if (level === ducked) return;
  ducked = level;
  applyLevels(ramp);
}

// ---------- Instruments ----------
// Each takes an absolute start time, so the sequencer can schedule ahead and effects can play
// little phrases without setTimeout drift.

export interface Voice { out: AudioNode; wet?: number }

function env(g: GainNode, t: number, vol: number, attack: number, dur: number, release: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + attack);
  g.gain.setValueAtTime(Math.max(0.0002, vol), t + Math.max(attack, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(attack, dur) + release);
}

function route(e: Engine, node: AudioNode, v: Voice): void {
  node.connect(v.out);
  if (v.wet) {
    const w = e.ctx.createGain();
    w.gain.value = v.wet;
    node.connect(w).connect(e.reverb);
  }
}

export const midi = (n: number): number => 440 * Math.pow(2, (n - 69) / 12);

/** A pitched note: oscillator(s) through an optional low-pass with its own envelope. */
export function note(v: Voice, t: number, freq: number, o: {
  type?: OscillatorType; vol?: number; attack?: number; dur?: number; release?: number;
  detune?: number; cutoff?: number; cutoffEnd?: number; q?: number; slide?: number; vibrato?: number;
}): void {
  const e = engine;
  if (!e) return;
  const { type = 'triangle', vol = 0.2, attack = 0.005, dur = 0.1, release = 0.12, detune = 0, cutoff = 0, cutoffEnd, q = 1, slide = 0, vibrato = 0 } = o;
  const g = e.ctx.createGain();
  env(g, t, vol, attack, dur, release);
  let head: AudioNode = g;
  if (cutoff) {
    const f = e.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.Q.value = q;
    f.frequency.setValueAtTime(cutoff, t);
    if (cutoffEnd) f.frequency.exponentialRampToValueAtTime(cutoffEnd, t + dur + release);
    g.connect(f); head = f;
  }
  route(e, head, v);
  const end = t + Math.max(attack, dur) + release + 0.02;
  const oscs = detune ? [-detune, detune] : [0];
  for (const cents of oscs) {
    const osc = e.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.detune.value = cents;
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur + release);
    if (vibrato) {
      const lfo = e.ctx.createOscillator();
      const depth = e.ctx.createGain();
      lfo.frequency.value = 5.5; depth.gain.value = freq * vibrato;
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(t + 0.08); lfo.stop(end);
    }
    osc.connect(g);
    osc.start(t); osc.stop(end);
  }
}

/** Filtered noise: hats, snares, paper, whooshes. */
export function hiss(v: Voice, t: number, o: {
  vol?: number; dur?: number; attack?: number; filter?: BiquadFilterType; freq?: number; freqEnd?: number; q?: number;
}): void {
  const e = engine;
  if (!e) return;
  const { vol = 0.2, dur = 0.05, attack = 0.002, filter = 'highpass', freq = 6000, freqEnd, q = 1 } = o;
  const src = e.ctx.createBufferSource();
  src.buffer = e.noise;
  const f = e.ctx.createBiquadFilter();
  f.type = filter; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = e.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + dur);
  src.connect(f).connect(g);
  route(e, g, v);
  src.start(t, Math.random() * 1.5);
  src.stop(t + attack + dur + 0.02);
}

export function kick(v: Voice, t: number, vol = 0.9, from = 150): void {
  note(v, t, from, { type: 'sine', vol, attack: 0.002, dur: 0.02, release: 0.22, slide: 0.28 });
  hiss(v, t, { vol: vol * 0.15, dur: 0.012, filter: 'lowpass', freq: 3000 });
}

export function snare(v: Voice, t: number, vol = 0.4): void {
  note(v, t, 190, { type: 'triangle', vol: vol * 0.7, dur: 0.02, release: 0.08, slide: 0.6 });
  hiss(v, t, { vol, dur: 0.14, filter: 'bandpass', freq: 2400, q: 0.7 });
}

export function hat(v: Voice, t: number, vol = 0.12, open = false): void {
  hiss(v, t, { vol, dur: open ? 0.16 : 0.03, filter: 'highpass', freq: 8000 });
}

export function tom(v: Voice, t: number, freq: number, vol = 0.5): void {
  note(v, t, freq, { type: 'sine', vol, dur: 0.03, release: 0.3, slide: 0.55 });
}
