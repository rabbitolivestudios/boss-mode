import './style.css';
import type { BossId } from './game/config';
import { Game } from './game/game';
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
let lastBoss: BossId = 'dragon';

const game: Game = new Game(world, byId('labels'), {
  levelUp: (choices) => ui.levelUp(choices, (c) => game.choose(c)),
  end: (s) => ui.end(s, () => begin(lastBoss)),
  banner: (t, s) => ui.banner(t, s),
  killfeed: (t) => ui.killfeed(t),
  roar: () => ui.banner('ROOOAAAR!', 'Frenzy: double speed attacks!'),
  combo: (n) => ui.combo(n),
});

function begin(boss: BossId): void {
  unlockAudio();
  lastBoss = boss;
  ui.startRun();
  game.start(boss, ui.difficulty);
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
  ui.showTitle(begin);
});
byId('btn-mute').addEventListener('click', (e) => {
  (e.currentTarget as HTMLElement).textContent = toggleMute() ? '🔇' : '🔊';
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.running && !game.paused && !game.choosing) togglePause();
});

ui.showTitle(begin);
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
  world.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
