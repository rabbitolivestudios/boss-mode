import './style.css';
import { BOSSES, NIGHTS, type BossId } from './game/config';
import { BuildUi } from './game/buildui';
import { Game, type SeasonSave } from './game/game';
import { Input } from './game/input';
import { duckMusic, setSoundPrefs, soundPrefs, unlockAudio } from './game/audio';
import { music, type Mood } from './game/music';
import { board, drawBoard, playerName, setPlayerName } from './game/leaderboard';
import { currentStyle } from './game/style';
import { Ui } from './game/ui';
import { World } from './game/world';

const byId = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
};

const world = new World(byId('game') as HTMLCanvasElement, currentStyle());
const ui = new Ui();
const input = new Input(byId('joy-base'), byId('joy-knob'));
// `?speed=4` fast-forwards the clock for playtesting late-game waves.
const timeScale = Number(new URLSearchParams(location.search).get('speed') ?? '1') || 1;


const SAVE_KEY = 'boss-mode-season';

function readSave(): SeasonSave | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as SeasonSave) : null;
  } catch { return null; }
}

function writeSave(sv: SeasonSave | null): void {
  try {
    if (sv) localStorage.setItem(SAVE_KEY, JSON.stringify(sv));
    else localStorage.removeItem(SAVE_KEY);
  } catch { /* saving is a convenience; the season still plays without it */ }
}

const game: Game = new Game(world, byId('labels'), {
  levelUp: (choices) => ui.levelUp(choices, (c) => game.choose(c)),
  end: (s) => {
    if (s.win) writeSave(null);
    ui.end(s, () => { ui.showTitle(begin); showContinue(); }, s.win ? undefined : () => { byId('end').classList.add('hidden'); game.retryNight(); });
    void board.submit(s);
  },
  build: (night) => {
    ui.hud(false);
    input.joystick = false;
    world.overview = true;
    writeSave(game.save);
    buildUi.show(night);
  },
  challenger: (kind, text) => buildUi.challenger(kind, text),
  dawn: (report) => {
    ui.hud(false);
    ui.clearBanner();
    buildUi.dawn(report, () => game.nextNight());
  },
  banner: (t, s) => ui.banner(t, s),
  killfeed: (t) => ui.killfeed(t),
  roar: () => ui.banner('ROOOAAAR!', 'Frenzy: double speed attacks!'),
  combo: (n) => ui.combo(n),
});

const buildUi = new BuildUi(game, world, byId('touch-surface'), () => {
  game.startRaid();
  buildUi.hide();
  ui.startRun();
  input.joystick = true;
  world.overview = false;
});

function begin(boss: BossId): void {
  unlockAudio();
  ui.startRun();
  game.start(boss, ui.difficulty);
}

/** Offers to pick up a saved season from its last build phase. */
function showContinue(): void {
  const sv = readSave();
  const btn = byId('btn-continue') as HTMLButtonElement;
  btn.hidden = !sv;
  if (!sv) return;
  btn.textContent = `Continue: ${BOSSES[sv.boss].name}, night ${sv.night + 1}`;
  btn.onclick = () => { unlockAudio(); ui.startRun(); game.restore(sv); };
}

function togglePause(): void {
  if (!game.running || game.choosing) return;
  game.paused = !game.paused;
  ui.pause(game.paused);
}

input.onRoar = () => game.roar();
input.onPause = togglePause;
byId('roar').addEventListener('pointerdown', (e) => { e.stopPropagation(); game.roar(); });
byId('btn-pause').addEventListener('click', togglePause);
byId('btn-resume').addEventListener('click', togglePause);
byId('btn-quit').addEventListener('click', () => {
  game.paused = false;
  game.running = false;
  ui.pause(false);
  game.phase = 'title';
  world.overview = false;
  input.joystick = true;
  ui.showTitle(begin);
  showContinue();
});
// Settings open from a gear that is on screen in every phase, and pause a raid while open.
let pausedBySettings = false;
function showSoundPrefs(): void {
  const p = soundPrefs();
  byId('set-music').textContent = `🎵 Music: ${p.music ? 'ON' : 'OFF'}`;
  byId('set-sfx').textContent = `🔊 Sound effects: ${p.sfx ? 'ON' : 'OFF'}`;
  byId('set-music').classList.toggle('off', !p.music);
  byId('set-sfx').classList.toggle('off', !p.sfx);
}
byId('btn-settings').addEventListener('click', (e) => {
  e.stopPropagation();
  showSoundPrefs();
  byId('settings').classList.remove('hidden');
  if (game.running && !game.paused && !game.choosing) { game.paused = true; pausedBySettings = true; }
});
byId('btn-settings-done').addEventListener('click', () => {
  byId('settings').classList.add('hidden');
  if (pausedBySettings) { game.paused = false; pausedBySettings = false; }
});
byId('set-music').addEventListener('click', () => { const p = soundPrefs(); setSoundPrefs({ ...p, music: !p.music }); showSoundPrefs(); });
byId('set-sfx').addEventListener('click', () => { const p = soundPrefs(); setSoundPrefs({ ...p, sfx: !p.sfx }); showSoundPrefs(); });
// Browsers only start audio after a gesture, so the first tap or key anywhere starts the title music.
for (const ev of ['pointerdown', 'keydown'] as const) window.addEventListener(ev, unlockAudio, { capture: true });

/** Which loop fits the moment: champions take over the night, the Chosen One gets the key change. */
function mood(): Mood {
  if (game.phase === 'title') return 'title';
  if (game.phase === 'build') return 'build';
  if (game.phase === 'raid' && game.running) {
    if (game.champions.some((c) => c.final)) return 'final';
    return game.champions.length ? 'champion' : 'raid';
  }
  return 'none';
}

function updateMusic(): void {
  if (document.body.dataset.phase !== game.phase) document.body.dataset.phase = game.phase;
  music.set(mood());
  if (game.phase === 'raid') {
    const d = NIGHTS[game.night].duration;
    const progress = Number.isFinite(d) ? game.nightTime / d : 1;
    music.setIntensity(0.2 + progress * 0.7 + (game.champions.length ? 0.3 : 0) + (game.frenzy > 0 ? 0.3 : 0));
  }
  duckMusic(game.paused || game.choosing ? 0.35 : 1);
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.running && !game.paused && !game.choosing) togglePause();
});

ui.showTitle(begin);
showContinue();

const nameInput = byId('player-name') as HTMLInputElement;
function showName(): void {
  nameInput.value = playerName();
}
function saveName(): void {
  if (nameInput.value.trim() === playerName()) return;
  const why = setPlayerName(nameInput.value);
  byId('name-msg').textContent = why ?? `Saved! You are ${playerName()}.`;
  if (why) nameInput.value = playerName();
  else showBoards();
}
byId('name-row').addEventListener('submit', (e) => { e.preventDefault(); saveName(); nameInput.blur(); });
nameInput.addEventListener('change', saveName);
// Typing a name must not steer the boss or trigger ROAR and pause.
for (const ev of ['keydown', 'keyup'] as const) nameInput.addEventListener(ev, (e) => e.stopPropagation());
function showBoards(): void {
  drawBoard(byId('board'));
  const last = board.last;
  byId('end-score').textContent = last ? `SCORE ${last.score.toLocaleString()}${last.rank ? ` · #${last.rank} ${board.isShared() ? 'in the Hall!' : 'of your seasons'}` : ''}` : '';
  drawBoard(byId('end-board'), last?.score);
}
board.onChange(showBoards);
showName();
showBoards();
// Exposed in dev builds only, so playtest scripts can read the run's numbers.
if (import.meta.env.MODE !== 'production') (window as unknown as { game: Game }).game = game;

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000) * timeScale;
  last = now;
  game.update(dt, input.move());
  world.update(game.x, game.z, dt);
  game.render();
  game.fx.update(game.running && !game.paused && !game.choosing ? dt : 0);
  if (game.running) ui.update(game);
  else if (game.phase === 'build') buildUi.refresh();
  world.render();
  updateMusic();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
