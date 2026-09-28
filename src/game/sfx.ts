/** Tiny synth sound effects: no audio files to download, and nothing to license. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const last: Record<string, number> = {};

export function unlockAudio(): void {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
}

export function toggleMute(): boolean {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.35;
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur);
}

function noise(dur: number, vol: number): void {
  if (!ctx || !master) return;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource();
  const g = ctx.createGain();
  g.gain.value = vol;
  src.buffer = buf;
  src.connect(g).connect(master);
  src.start();
}

/** Hundreds of hits per second would turn into a buzz, so each sound has a minimum gap. */
function gate(key: string, gap: number): boolean {
  const now = performance.now();
  if ((last[key] ?? 0) + gap > now) return false;
  last[key] = now;
  return true;
}

export const sfx = {
  hit: () => gate('hit', 45) && tone(220 + Math.random() * 120, 0.06, 'square', 0.08, 0.5),
  pop: () => gate('pop', 40) && tone(520 + Math.random() * 200, 0.08, 'triangle', 0.12, 1.8),
  gem: () => gate('gem', 30) && tone(900 + Math.random() * 300, 0.07, 'sine', 0.1, 1.5),
  hurt: () => gate('hurt', 180) && tone(140, 0.15, 'sawtooth', 0.15, 0.5),
  stomp: () => gate('stomp', 100) && (noise(0.25, 0.3), tone(90, 0.25, 'sine', 0.4, 0.4)),
  zap: () => gate('zap', 60) && (noise(0.12, 0.15), tone(1400, 0.1, 'square', 0.06, 0.3)),
  fire: () => gate('fire', 90) && tone(300, 0.1, 'sawtooth', 0.05, 0.6),
  level: () => [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', 0.18), i * 70)),
  roar: () => { noise(0.8, 0.5); tone(70, 0.9, 'sawtooth', 0.4, 0.5); tone(110, 0.9, 'square', 0.15, 0.6); },
  horn: () => [392, 392, 523].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'square', 0.12), i * 180)),
  siren: () => [0, 1, 2, 3].forEach((i) => setTimeout(() => tone(i % 2 ? 620 : 880, 0.28, 'square', 0.1), i * 300)),
  coin: () => gate('coin', 50) && (tone(1320, 0.06, 'square', 0.07), setTimeout(() => tone(1760, 0.12, 'square', 0.07), 50)),
  steal: () => gate('steal', 300) && [660, 520, 400].forEach((f, i) => setTimeout(() => tone(f, 0.08, 'triangle', 0.1), i * 60)),
  escape: () => gate('escape', 400) && [300, 240, 180].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sawtooth', 0.1), i * 110)),
  win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.2), i * 120)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.2), i * 200)),
};
