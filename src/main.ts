import './style.css';
import { BOSSES, type BossId } from './game/config';
import { BuildUi } from './game/buildui';
import { Game, type SeasonSave } from './game/game';
import { Input } from './game/input';
import { toggleMute, unlockAudio } from './game/sfx';
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
  },
  build: (night) => {
    ui.hud(false);
    input.joystick = false;
    world.overview = true;
    writeSave(game.save);
    buildUi.show(night);
  },
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
byId('btn-mute').addEventListener('click', (e) => {
  (e.currentTarget as HTMLElement).textContent = toggleMute() ? '🔇' : '🔊';
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.running && !game.paused && !game.choosing) togglePause();
});

ui.showTitle(begin);
showContinue();
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
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
