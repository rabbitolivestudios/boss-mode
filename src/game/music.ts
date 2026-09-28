import { getEngine, hat, hiss, kick, midi, note, snare, tom, type Voice } from './audio';

/**
 * Procedural soundtrack: four short loops written as code, scheduled a moment ahead on the audio
 * clock so they stay in time even when a frame stutters. Each mood owns its own gain, so a change of
 * mood crossfades instead of cutting. Intensity (0..1) adds layers as a night heats up.
 */

export type Mood = 'none' | 'title' | 'build' | 'raid' | 'champion' | 'final';

const MINOR = [0, 2, 3, 5, 7, 8, 10];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const HARMONIC = [0, 2, 3, 5, 7, 8, 11];

interface Step {
  t: number; step: number; bar: number; sd: number; intensity: number;
  /** MIDI note of a scale degree, counted from the song root; the chord's degree is not added. */
  deg: (d: number, octave?: number) => number;
  /** MIDI note of the current chord's tone i (0 root, 1 third, 2 fifth, 3 root up an octave...). */
  ct: (i: number, octave?: number) => number;
  drums: Voice; bass: Voice; pad: Voice; lead: Voice;
}

interface Song {
  bpm: number; root: number; scale: number[];
  /** Chord root per bar, as a scale degree. */
  bars: number[];
  play: (s: Step) => void;
}

/** A melody as [step within the phrase, scale degree, length in steps]. */
type Line = [number, number, number][];

function lineAt(line: Line, i: number): [number, number] | null {
  for (const [st, d, len] of line) if (st === i) return [d, len];
  return null;
}

// ----- The Lair (title): a creepy-fun harpsichord waltz of a villain plotting -----
const TITLE_BELL: Line = [[0, 7, 16], [16, 5, 16], [32, 3, 16], [48, 4, 16]];
const title: Song = {
  bpm: 100, root: 50, scale: HARMONIC, bars: [0, 5, 3, 4],
  play: (s) => {
    const arp = [0, 1, 2, 3, 2, 1, 2, 1];
    if (s.step % 2 === 0) note(s.lead, s.t, midi(s.ct(arp[s.step / 2], 1)), { type: 'square', vol: 0.07, dur: 0.04, release: 0.18, cutoff: 2600, cutoffEnd: 600 });
    if (s.step === 0) note(s.bass, s.t, midi(s.ct(0, -1)), { type: 'triangle', vol: 0.35, dur: 0.5, release: 0.6 });
    if (s.step === 8) note(s.bass, s.t, midi(s.ct(2, -1)), { type: 'triangle', vol: 0.25, dur: 0.3, release: 0.4 });
    if (s.step === 0) for (const i of [0, 1, 2]) note(s.pad, s.t, midi(s.ct(i, 0)), { type: 'sawtooth', vol: 0.03, attack: 0.5, dur: 1.6, release: 0.8, detune: 9, cutoff: 900 });
    if (s.step % 8 === 0) kick(s.drums, s.t, 0.35, 90);
    const b = lineAt(TITLE_BELL, (s.bar % 4) * 16 + s.step);
    if (b && s.bar % 8 >= 4) note(s.lead, s.t, midi(s.deg(b[0], 2)), { type: 'sine', vol: 0.12, dur: 0.05, release: 1.4 });
  },
};

// ----- Blueprints (build): bouncy, sneaky planning music -----
const BUILD_HOOK: Line = [
  [0, 0, 2], [2, 2, 2], [4, 4, 2], [6, 2, 2], [8, 7, 4], [12, 4, 4],
  [16, 5, 2], [18, 4, 2], [20, 2, 2], [22, 4, 2], [24, 5, 8],
  [32, 3, 2], [34, 2, 2], [36, 3, 2], [38, 5, 2], [40, 7, 2], [42, 5, 2], [44, 3, 4],
  [48, 4, 4], [52, 6, 2], [54, 4, 2], [56, 1, 8],
];
const build: Song = {
  bpm: 96, root: 53, scale: MAJOR, bars: [0, 5, 3, 4],
  play: (s) => {
    if (s.step === 0 || s.step === 8) note(s.bass, s.t, midi(s.ct(s.step ? 2 : 0, -1)), { type: 'triangle', vol: 0.4, dur: 0.05, release: 0.2 });
    if (s.step === 6 || s.step === 14) note(s.bass, s.t, midi(s.ct(0, -1)), { type: 'triangle', vol: 0.2, dur: 0.04, release: 0.12 });
    if (s.step % 4 === 2) hat(s.drums, s.t, 0.05);
    if (s.step % 8 === 4) hiss(s.drums, s.t, { vol: 0.08, dur: 0.05, filter: 'bandpass', freq: 5000, q: 2 });
    if (s.step === 0) for (const i of [0, 1, 2]) note(s.pad, s.t, midi(s.ct(i, 0)), { type: 'triangle', vol: 0.035, attack: 0.3, dur: 2, release: 0.6 });
    const cycle = Math.floor(s.bar / 4);
    if (cycle % 2 === 1) {
      const n = lineAt(BUILD_HOOK, (s.bar % 4) * 16 + s.step);
      if (n) marimba(s.lead, s.t, midi(s.deg(n[0], 1)), 0.16);
    } else if (s.step % 4 === 0) {
      marimba(s.lead, s.t, midi(s.ct([0, 2, 1, 3][s.step / 4], 1)), 0.08);
    }
  },
};

function marimba(v: Voice, t: number, f: number, vol: number): void {
  note(v, t, f, { type: 'sine', vol, dur: 0.02, release: 0.35 });
  note(v, t, f * 4, { type: 'sine', vol: vol * 0.25, dur: 0.01, release: 0.06 });
}

// ----- Raid Night: the main fight loop, layers stacking as the night goes on -----
const RAID_HOOK: Line = [
  [0, 4, 2], [3, 4, 1], [4, 3, 2], [6, 4, 2], [10, 6, 4],
  [16, 4, 2], [19, 3, 1], [20, 2, 2], [22, 3, 6],
  [32, 2, 2], [35, 2, 1], [36, 1, 2], [38, 2, 2], [42, 4, 4],
  [48, 3, 6], [56, 6, 2], [58, 7, 6],
];
const raid: Song = {
  bpm: 136, root: 45, scale: MINOR, bars: [0, 5, 2, 6],
  play: (s) => {
    const hot = s.intensity;
    if (s.step % 4 === 0) kick(s.drums, s.t, 0.85);
    if (s.step === 4 || s.step === 12) snare(s.drums, s.t, 0.32);
    if (hot > 0.75 && s.bar % 4 === 3 && s.step >= 12) snare(s.drums, s.t, 0.18 + (s.step - 12) * 0.05);
    if (s.step % 2 === 1 || hot > 0.6) hat(s.drums, s.t, s.step % 2 ? 0.1 : 0.05, s.step % 8 === 6);
    if (s.step % 2 === 0) {
      const oct = s.step % 4 === 2 ? 0 : -1;
      note(s.bass, s.t, midi(s.ct(0, oct)), { type: 'sawtooth', vol: 0.22, dur: 0.07, release: 0.08, cutoff: 1400, cutoffEnd: 200, q: 4 });
    }
    if (s.step === 0) for (const i of [0, 1, 2]) note(s.pad, s.t, midi(s.ct(i, 0)), { type: 'sawtooth', vol: 0.025, attack: 0.2, dur: 1.5, release: 0.4, detune: 12, cutoff: 1300 });
    if (hot > 0.3) {
      const arp = [0, 1, 2, 3, 2, 1, 2, 4];
      note(s.lead, s.t, midi(s.ct(arp[s.step % 8], 1)), { type: 'square', vol: 0.035, dur: 0.03, release: 0.06, cutoff: 3200 });
    }
    if (hot > 0.5 && Math.floor(s.bar / 4) % 2 === 1) {
      const n = lineAt(RAID_HOOK, (s.bar % 4) * 16 + s.step);
      if (n) note(s.lead, s.t, midi(s.deg(n[0], 2)), { type: 'square', vol: 0.09, attack: 0.01, dur: n[1] * stepLen(raid) * 0.8, release: 0.1, cutoff: 2800, vibrato: 0.012 });
    }
  },
};

// ----- Champion: a boss-fight theme, from the other side of the boss fight -----
const champion: Song = {
  bpm: 150, root: 40, scale: [0, 1, 3, 5, 7, 8, 10], bars: [0, 1, 0, 6],
  play: (s) => {
    if (s.step % 4 === 0 || s.step === 10 || s.step === 14) kick(s.drums, s.t, 0.95, 130);
    if (s.step === 4 || s.step === 12) snare(s.drums, s.t, 0.4);
    if (s.step % 2 === 1) hat(s.drums, s.t, 0.09);
    if (s.bar % 2 === 1 && s.step >= 12) tom(s.drums, s.t, [200, 170, 140, 110][s.step - 12], 0.45);
    note(s.bass, s.t, midi(s.ct(0, -1)), { type: 'sawtooth', vol: 0.18, dur: 0.06, release: 0.05, detune: 14, cutoff: 900, cutoffEnd: 180, q: 6 });
    if ([0, 3, 6, 10].includes(s.step)) {
      for (const i of [0, 1, 2]) note(s.lead, s.t, midi(s.ct(i, 1)), { type: 'sawtooth', vol: 0.05, attack: 0.01, dur: 0.12, release: 0.15, detune: 10, cutoff: 3000, cutoffEnd: 700 });
    }
    if (s.step === 0) for (const i of [0, 2, 3]) note(s.pad, s.t, midi(s.ct(i, 0)), { type: 'sine', vol: 0.06, attack: 0.3, dur: 1.2, release: 0.5, vibrato: 0.006 });
    if (s.intensity > 0.9 && s.step % 2 === 0) {
      const run = [0, 1, 2, 3, 4, 3, 2, 1];
      note(s.lead, s.t, midi(s.deg(run[s.step / 2] + s.sd, 2)), { type: 'square', vol: 0.05, dur: 0.05, release: 0.05, cutoff: 3500 });
    }
  },
};

const SONGS: Record<Exclude<Mood, 'none'>, Song> = { title, build, raid, champion, final: { ...champion, root: 42 } };

function stepLen(song: Song): number {
  return 60 / song.bpm / 4;
}

class Music {
  private mood: Mood = 'none';
  private bus: GainNode | null = null;
  private voices: { drums: Voice; bass: Voice; pad: Voice; lead: Voice } | null = null;
  private step = 0;
  private next = 0;
  private timer = 0;
  private intensity = 0;

  set(mood: Mood): void {
    if (mood === this.mood) return;
    const e = getEngine();
    if (!e) return;
    this.mood = mood;
    const t = e.ctx.currentTime;
    if (this.bus) {
      const old = this.bus;
      old.gain.cancelScheduledValues(t);
      old.gain.setValueAtTime(old.gain.value, t);
      old.gain.linearRampToValueAtTime(0, t + 0.9);
      setTimeout(() => old.disconnect(), 1500);
      this.bus = null; this.voices = null;
    }
    if (mood === 'none') return;
    const bus = e.ctx.createGain();
    bus.gain.setValueAtTime(0, t);
    bus.gain.linearRampToValueAtTime(1, t + 0.6);
    bus.connect(e.music);
    this.bus = bus;
    this.voices = { drums: { out: bus }, bass: { out: bus }, pad: { out: bus, wet: 0.5, verb: e.musicVerb }, lead: { out: bus, wet: 0.3, verb: e.musicVerb } };
    this.step = 0;
    this.next = t + 0.08;
    if (!this.timer) this.timer = window.setInterval(() => this.pump(), 25);
  }

  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  private pump(): void {
    const e = getEngine();
    if (!e || !this.voices || this.mood === 'none') return;
    const song = SONGS[this.mood];
    const len = stepLen(song);
    // A tab in the background throttles timers; skip ahead rather than play a burst of missed notes.
    if (this.next < e.ctx.currentTime - 0.2) this.next = e.ctx.currentTime + 0.05;
    while (this.next < e.ctx.currentTime + 0.15) {
      const bar = Math.floor(this.step / 16);
      const sd = song.bars[bar % song.bars.length];
      const deg = (d: number, octave = 0): number => {
        const n = song.scale.length;
        return song.root + 12 * (octave + Math.floor(d / n)) + song.scale[((d % n) + n) % n];
      };
      song.play({
        t: this.next, step: this.step % 16, bar, sd, intensity: this.intensity,
        deg, ct: (i, octave = 0) => deg(sd + (i % 3) * 2 + 7 * Math.floor(i / 3), octave),
        ...this.voices,
      });
      this.step++;
      this.next += len;
    }
  }
}

export const music = new Music();
