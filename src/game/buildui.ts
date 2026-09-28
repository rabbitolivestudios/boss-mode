import * as THREE from 'three';
import { BUILDINGS, CASTLE, HEROES, NIGHTS, type BuildingId, type HeroKind } from './config';
import { castFor, castPortrait } from './cast';
import type { Game, NightReport } from './game';
import type { World } from './world';

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
          // Roughly one world unit per 18px at the phone build zoom; clamp to the castle.
          const lim = CASTLE.half * CASTLE.cell * 0.6;
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
      else this.say('Not enough gold to repair');
      this.shown = '';
      this.refresh();
    });
    $('btn-challenger').addEventListener('click', () => $('challenger').classList.add('hidden'));
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
      b.onclick = () => { this.tool = id; this.refresh(); this.say(id === 'sell' ? 'Tap a building to sell it for a full refund' : BUILDINGS[id].blurb); };
      tools.appendChild(b);
    };
    for (const id of Object.keys(BUILDINGS) as BuildingId[]) add(id, BUILDINGS[id].icon, BUILDINGS[id].name, BUILDINGS[id].cost);
    add('sell', '💸', 'Sell');
    this.say(night === 0 ? 'Build your castle! Tap a tile to place. Careful: gold you spend leaves the vault.' : 'Spend gold on defences, or keep it safe in the vault.');
    this.refresh();
  }

  hide(): void {
    $('buildbar').classList.add('hidden');
    this.game.hover = null;
  }

  private shown = '';

  refresh(): void {
    const repair = this.game.repairCost();
    const key = `${this.game.treasure}|${this.tool}|${repair}`;
    if (key === this.shown) return;
    this.shown = key;
    $('build-gold').textContent = `💰 ${this.game.treasure}`;
    const rb = $('btn-repair') as HTMLButtonElement;
    rb.hidden = repair <= 0;
    rb.textContent = `🔧 Repair all: 💰${repair}`;
    document.querySelectorAll<HTMLButtonElement>('#tools .tool').forEach((b) => {
      const id = b.dataset.tool as Tool;
      b.classList.toggle('on', id === this.tool);
      b.classList.toggle('poor', id !== 'sell' && BUILDINGS[id].cost >= this.game.treasure);
    });
  }

  private say(text: string): void {
    const el = $('build-msg');
    el.textContent = text;
    window.clearTimeout(this.msgTimer);
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
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
    $('dawn-hint').textContent = r.stars === 3 ? 'Perfect night: not a single coin escaped!' : 'Stars come from keeping gold: stop thieves before they reach a gate.';
    const btn = $('btn-next');
    btn.textContent = r.night + 1 === NIGHTS.length - 1 ? 'Prepare for the final raid ▶' : 'Build ▶';
    btn.onclick = () => { $('dawn').classList.add('hidden'); onNext(); };
  }
}
