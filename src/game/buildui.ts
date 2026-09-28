import * as THREE from 'three';
import { BUILDINGS, NIGHTS, type BuildingId } from './config';
import type { Game, NightReport } from './game';

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

  constructor(private game: Game, private camera: THREE.Camera, surface: HTMLElement, onStart: () => void) {
    surface.addEventListener('pointerdown', (e) => {
      if (this.game.phase !== 'build') return;
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
      const cell = this.cellAt(e.clientX, e.clientY);
      if (!cell) { this.game.hover = null; return; }
      const [cx, cz] = cell;
      const ok = this.tool === 'sell' ? !!this.game.castle.at(cx, cz) : !this.game.canBuild(cx, cz, this.tool);
      this.game.hover = { cx, cz, ok };
    });
    $('btn-raid').addEventListener('click', onStart);
  }

  private cellAt(px: number, py: number): [number, number] | null {
    const ndc = new THREE.Vector2((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    if (!this.ray.ray.intersectPlane(this.ground, this.hit)) return null;
    const [cx, cz] = this.game.castle.cellOf(this.hit.x, this.hit.z);
    return this.game.castle.inside(cx, cz) ? [cx, cz] : null;
  }

  show(night: number): void {
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
    const key = `${this.game.treasure}|${this.tool}`;
    if (key === this.shown) return;
    this.shown = key;
    $('build-gold').textContent = `💰 ${this.game.treasure}`;
    document.querySelectorAll<HTMLButtonElement>('.tool').forEach((b) => {
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

  dawn(r: NightReport, onNext: () => void): void {
    $('dawn').classList.remove('hidden');
    $('dawn-title').textContent = `NIGHT ${r.night + 1} SURVIVED!`;
    $('dawn-stars').textContent = '⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
    $('dawn-stats').innerHTML = `
      <div><b>${r.kills}</b>heroes beaten</div>
      <div><b>💰 ${r.stolen}</b>gold stolen</div>
      <div><b>+${r.tribute}</b>sunrise tribute</div>
      <div><b>💰 ${r.treasure}</b>in the vault</div>`;
    $('dawn-hint').textContent = r.stars === 3 ? 'Perfect night: not a single coin escaped!' : 'Stars come from keeping gold: stop thieves before they reach a gate.';
    const btn = $('btn-next');
    btn.textContent = r.night + 1 === NIGHTS.length - 1 ? 'Prepare for the final raid ▶' : 'Build ▶';
    btn.onclick = () => { $('dawn').classList.add('hidden'); onNext(); };
  }
}
