import * as THREE from 'three';
import { BUILDINGS, CASTLE, HEROES, NIGHTS, TREASURE, type BuildingId, type HeroKind } from './config';
import { castFor, castPortrait } from './cast';
import type { Game, NightReport } from './game';
import type { World } from './world';
import { sfx } from './sfx';

// The between-nights interface: the build bar, placing and selling on the grid, and the dawn report.

const $ = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
};

type Tool = BuildingId | 'sell';

export class BuildUi {
  tool: Tool = 'wall';
  private ray = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private hit = new THREE.Vector3();
  private msgTimer = 0;

  private drag: { x: number; y: number; moved: boolean; fx: number; fz: number } | null = null;

  constructor(private game: Game, private world: World, surface: HTMLElement, onStart: () => void) {
    // A tap builds or sells; a drag pans the camera (phones only need it, but it is harmless elsewhere).
    surface.addEventListener('pointerdown', (e) => {
      if (this.game.phase !== 'build') return;
      this.drag = { x: e.clientX, y: e.clientY, moved: false, fx: this.world.focus.x, fz: this.world.focus.z };
    });
    surface.addEventListener('pointerup', (e) => {
      if (this.game.phase !== 'build' || !this.drag) return;
      const moved = this.drag.moved;
      this.drag = null;
      if (moved) return;
      const cell = this.cellAt(e.clientX, e.clientY);
      if (!cell) return;
      const [cx, cz] = cell;
      if (this.tool === 'sell' || this.game.castle.at(cx, cz)) {
        if (!this.game.sell(cx, cz) && this.tool === 'sell') this.say('Tap a building to sell it');
      } else {
        const why = this.game.build(cx, cz, this.tool);
        if (why) this.say(why);
      }
      this.refresh();
    });
    surface.addEventListener('pointermove', (e) => {
      if (this.game.phase !== 'build') return;
      if (this.drag) {
        const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y;
        if (Math.hypot(dx, dy) > 10) this.drag.moved = true;
        if (this.drag.moved) {
          // Roughly one world unit per 18px at the phone build zoom; clamp so every buildable tile can be reached.
          const lim = CASTLE.buildRadius;
          this.world.focus.x = Math.max(-lim, Math.min(lim, this.drag.fx - dx / 18));
          this.world.focus.z = Math.max(-lim, Math.min(lim, this.drag.fz - dy / 18));
          this.game.hover = null;
          return;
        }
      }
      const cell = this.cellAt(e.clientX, e.clientY);
      if (!cell) { this.game.hover = null; return; }
      const [cx, cz] = cell;
      const ok = this.tool === 'sell' ? !!this.game.castle.at(cx, cz) : !this.game.canBuild(cx, cz, this.tool);
      this.game.hover = { cx, cz, ok };
    });
    $('btn-raid').addEventListener('click', onStart);
    $('btn-repair').addEventListener('click', () => {
      if (this.game.repairAll()) this.say('All repaired!');
      else this.say(`Repairs cost ${this.game.repairCost()} gold, and 1 coin must stay in your vault`);
      this.shown = '';
      this.refresh();
    });
    $('btn-challenger').addEventListener('click', () => $('challenger').classList.add('hidden'));
    window.addEventListener('resize', () => requestAnimationFrame(() => this.measure()));
  }

  private cellAt(px: number, py: number): [number, number] | null {
    const ndc = new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.world.camera);
    if (!this.ray.ray.intersectPlane(this.ground, this.hit)) return null;
    const [cx, cz] = this.game.castle.cellOf(this.hit.x, this.hit.z);
    return this.game.castle.inside(cx, cz) ? [cx, cz] : null;
  }

  show(night: number): void {
    this.world.focus = { x: 0, z: 0 };
    this.advice = null;
    this.shown = '';
    $('buildbar').classList.remove('hidden');
    $('build-title').textContent = `NIGHT ${night + 1} of ${NIGHTS.length}`;
    $('btn-raid').textContent = night === NIGHTS.length - 1 ? 'START THE FINAL RAID ▶' : `START NIGHT ${night + 1} ▶`;
    const tools = $('tools');
    tools.innerHTML = '';
    const add = (id: Tool, icon: string, label: string, cost?: number) => {
      const b = document.createElement('button');
      b.className = 'tool';
      b.dataset.tool = id;
      b.innerHTML = `<span class="ti">${icon}</span><span class="tn">${label}</span>${cost !== undefined ? `<span class="tc">💰${cost}</span>` : ''}`;
      b.onclick = () => { this.tool = id; sfx.click(); this.refresh(); this.say(id === 'sell' ? 'Tap a building to sell it for a full refund' : BUILDINGS[id].blurb); };
      tools.appendChild(b);
    };
    for (const id of Object.keys(BUILDINGS) as BuildingId[]) add(id, BUILDINGS[id].icon, BUILDINGS[id].name, BUILDINGS[id].cost);
    add('sell', '💸', 'Sell');
    const drag = this.world.compact ? ' Drag to move the map.' : '';
    this.say(night === 0 ? `Build your castle! Gold you spend leaves the vault, and an empty vault loses the season.${drag}` : `Spend gold on defences, or keep it in the vault: if thieves empty it, you lose!${drag}`);
    this.refresh();
    this.measure();
  }

  /** Tells the camera how much of the screen the build bar covers, so the castle is framed above it. */
  measure(): void {
    const bar = $('build-bottom');
    this.world.bottomInset = $('buildbar').classList.contains('hidden') ? 0 : window.innerHeight - bar.getBoundingClientRect().top + 8;
  }

  hide(): void {
    $('buildbar').classList.add('hidden');
    this.world.bottomInset = 0;
    this.game.hover = null;
  }

  private shown = '';
  private advice: 'safe' | 'careful' | 'risky' | null = null;

  /**
   * Tells the player how exposed the vault is: a green, yellow or red tag under the gold. It never
   * blocks spending; the first time a purchase tips the vault into red, the tip explains why it matters.
   */
  private vaultAdvice(): void {
    const t = this.game.treasure;
    const state = t >= TREASURE.safe ? 'safe' : t >= TREASURE.risky ? 'careful' : 'risky';
    const el = $('vault-meter');
    el.className = state;
    el.textContent = state === 'safe' ? '🛡️ Vault safe' : state === 'careful' ? '⚠️ Vault getting low' : '🚨 Vault at risk!';
    if (state === 'risky' && this.advice !== null && this.advice !== 'risky') this.say(`Risky! With only ${t} gold, one or two thieves could empty your vault and end the season.`);
    this.advice = state;
  }

  refresh(): void {
    const repair = this.game.repairCost();
    const key = `${this.game.treasure}|${this.tool}|${repair}`;
    if (key === this.shown) return;
    this.shown = key;
    $('build-gold').textContent = `💰 ${this.game.treasure}`;
    this.vaultAdvice();
    const rb = $('btn-repair') as HTMLButtonElement;
    rb.hidden = repair <= 0;
    rb.textContent = `🔧 Repair all: 💰${repair}`;
    this.measure();
    document.querySelectorAll<HTMLButtonElement>('#tools .tool').forEach((b) => {
      const id = b.dataset.tool as Tool;
      b.classList.toggle('on', id === this.tool);
      b.classList.toggle('poor', id !== 'sell' && BUILDINGS[id].cost > this.game.spendable());
    });
  }

  private say(text: string): void {
    const el = $('build-msg');
    el.textContent = text;
    window.clearTimeout(this.msgTimer);
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    // On small screens the tip covers the castle, so it steps aside after a few seconds.
    if (this.world.compact) this.msgTimer = window.setTimeout(() => { el.textContent = ''; }, 6000);
  }

  challenger(kind: HeroKind, text: string): void {
    const art = $('ch-art');
    art.innerHTML = '';
    art.appendChild(castPortrait(castFor(kind, 0)));
    $('ch-name').textContent = HEROES[kind].label.toUpperCase();
    $('ch-text').textContent = text;
    $('challenger').classList.remove('hidden');
  }

  dawn(r: NightReport, onNext: () => void): void {
    $('dawn').classList.remove('hidden');
    $('dawn-title').textContent = `NIGHT ${r.night + 1} SURVIVED!`;
    $('dawn-stars').textContent = '⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
    $('dawn-stats').innerHTML = `
      <div><b>${r.kills}</b>heroes beaten</div>
      <div><b>💰 ${r.stolen}</b>gold stolen</div>
      <div><b>+${r.tribute}</b>sunrise tribute</div>
      <div><b>💰 ${r.treasure}</b>in the vault</div>
      <div><b>${r.damage}</b>damage you took</div>
      <div><b>${Math.round(r.buildingShare * 100)}%</b>kills by buildings</div>`;
    $('dawn-adapt').textContent = r.adapting ? `💬 Heroes' chat: "${r.adapting}"` : '';
    $('dawn-hint').textContent = r.stars === 3 ? 'Perfect night: not a single coin escaped!' : 'Stars come from keeping gold: stop thieves before they reach your vault.';
    const btn = $('btn-next');
    btn.textContent = r.night + 1 === NIGHTS.length - 1 ? 'Prepare for the final raid ▶' : 'Build ▶';
    btn.onclick = () => { $('dawn').classList.add('hidden'); onNext(); };
  }
}
