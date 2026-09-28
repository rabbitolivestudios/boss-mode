import { CASTLE, type BuildingId } from './config';

// The castle grid: what is built where, which cells block walking, and flow fields that tell every hero
// the shortest walkable way to the vault, to the nearest gate, or to the boss.

export interface Building { id: BuildingId; cx: number; cz: number; cd: number; bounce: number }

const N = CASTLE.half * 2;
const INF = 1e9;

export class Castle {
  readonly size = N;
  buildings: Building[] = [];
  private blocked = new Uint8Array(N * N);
  private byCell = new Map<number, Building>();
  /** Walking distance in cells to each target; INF where unreachable. */
  private toVault = new Float32Array(N * N);
  private toGates = new Float32Array(N * N);
  private toBoss = new Float32Array(N * N);
  private bossCell = -1;

  constructor(private gates: { x: number; z: number }[]) {
    this.rebuild();
  }

  // ---------- Coordinates ----------

  cellOf(x: number, z: number): [number, number] {
    return [Math.floor(x / CASTLE.cell) + CASTLE.half, Math.floor(z / CASTLE.cell) + CASTLE.half];
  }

  inside(cx: number, cz: number): boolean {
    return cx >= 0 && cz >= 0 && cx < N && cz < N;
  }

  center(cx: number, cz: number): [number, number] {
    return [(cx - CASTLE.half + 0.5) * CASTLE.cell, (cz - CASTLE.half + 0.5) * CASTLE.cell];
  }

  private idx(cx: number, cz: number): number {
    return cz * N + cx;
  }

  isBlocked(x: number, z: number): boolean {
    const [cx, cz] = this.cellOf(x, z);
    return this.inside(cx, cz) && this.blocked[this.idx(cx, cz)] === 1;
  }

  at(cx: number, cz: number): Building | undefined {
    return this.byCell.get(this.idx(cx, cz));
  }

  // ---------- Building ----------

  /** Why a cell cannot take a building, or null if it can. */
  whyNot(cx: number, cz: number, id: BuildingId): string | null {
    if (!this.inside(cx, cz)) return 'Outside your castle';
    if (this.byCell.has(this.idx(cx, cz))) return 'Something is already there';
    const [x, z] = this.center(cx, cz);
    if (Math.hypot(x, z) > CASTLE.buildRadius) return 'Outside your castle';
    if (Math.hypot(x, z) < CASTLE.vaultClear) return 'Too close to the vault';
    if (this.gates.some((g) => Math.hypot(g.x - x, g.z - z) < CASTLE.gateClear)) return 'Keep the gates open';
    if (id === 'wall' && !this.stillOpen(cx, cz)) return 'Heroes need a way in!';
    return null;
  }

  place(cx: number, cz: number, id: BuildingId): Building {
    const b: Building = { id, cx, cz, cd: 0, bounce: 0 };
    this.buildings.push(b);
    this.byCell.set(this.idx(cx, cz), b);
    this.rebuild();
    return b;
  }

  remove(b: Building): void {
    this.buildings = this.buildings.filter((o) => o !== b);
    this.byCell.delete(this.idx(b.cx, b.cz));
    this.rebuild();
  }

  clear(): void {
    this.buildings = [];
    this.byCell.clear();
    this.rebuild();
  }

  /** Walls must leave every gate a path to the vault: tower defense mazing, not sealing. */
  private stillOpen(cx: number, cz: number): boolean {
    const i = this.idx(cx, cz);
    this.blocked[i] = 1;
    const dist = new Float32Array(N * N);
    this.flood(dist, [this.vaultCell()]);
    this.blocked[i] = 0;
    return this.gates.every((g) => {
      const [gx, gz] = this.cellOf(g.x, g.z);
      return !this.inside(gx, gz) || dist[this.idx(gx, gz)] < INF;
    });
  }

  private vaultCell(): number {
    const [cx, cz] = this.cellOf(0, 0);
    return this.idx(cx, cz);
  }

  private rebuild(): void {
    this.blocked.fill(0);
    for (const b of this.buildings) if (b.id === 'wall') this.blocked[this.idx(b.cx, b.cz)] = 1;
    this.flood(this.toVault, [this.vaultCell()]);
    const gateCells = this.gates.map((g) => this.cellOf(g.x, g.z)).filter(([x, z]) => this.inside(x, z)).map(([x, z]) => this.idx(x, z));
    this.flood(this.toGates, gateCells);
    this.bossCell = -1;
  }

  /** Breadth-first walking distance from the sources over unblocked cells (8-way, no corner cutting). */
  private flood(dist: Float32Array, sources: number[]): void {
    dist.fill(INF);
    const queue = new Int32Array(N * N);
    let head = 0, tail = 0;
    for (const s of sources) { dist[s] = 0; queue[tail++] = s; }
    while (head < tail) {
      const i = queue[head++];
      const cx = i % N, cz = (i / N) | 0;
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dz) continue;
          const nx = cx + dx, nz = cz + dz;
          if (!this.inside(nx, nz)) continue;
          const j = this.idx(nx, nz);
          if (this.blocked[j]) continue;
          if (dx && dz && (this.blocked[this.idx(cx + dx, cz)] || this.blocked[this.idx(cx, cz + dz)])) continue;
          const nd = dist[i] + (dx && dz ? 1.414 : 1);
          if (nd < dist[j]) {
            // Only diagonal steps can improve an already-queued cell, so re-queueing is rare and cheap.
            if (dist[j] === INF) queue[tail++] = j;
            dist[j] = nd;
          }
        }
      }
    }
  }

  /** Recomputes the boss field when the boss moves to a new cell. */
  trackBoss(x: number, z: number): void {
    const [cx, cz] = this.cellOf(x, z);
    if (!this.inside(cx, cz)) { this.bossCell = -2; return; }
    const i = this.idx(cx, cz);
    if (i === this.bossCell) return;
    this.bossCell = i;
    this.flood(this.toBoss, [i]);
  }

  /**
   * Direction to walk from (x, z) along a field, or null when the field does not apply there
   * (outside the grid, or no path), in which case the caller walks straight.
   */
  steer(field: 'vault' | 'gates' | 'boss', x: number, z: number): [number, number] | null {
    if (field === 'boss' && this.bossCell < 0) return null;
    const dist = field === 'vault' ? this.toVault : field === 'gates' ? this.toGates : this.toBoss;
    const [cx, cz] = this.cellOf(x, z);
    if (!this.inside(cx, cz)) return null;
    const here = dist[this.idx(cx, cz)];
    if (here >= INF) return null;
    let best = here, bx = -1, bz = -1;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, nz = cz + dz;
        if (!this.inside(nx, nz) || (!dx && !dz)) continue;
        const d = dist[this.idx(nx, nz)];
        if (d < best) { best = d; bx = nx; bz = nz; }
      }
    }
    if (bx < 0) return null;
    const [tx, tz] = this.center(bx, bz);
    const len = Math.hypot(tx - x, tz - z) || 1;
    return [(tx - x) / len, (tz - z) / len];
  }

  /** Pushes a walker out of wall cells, sliding along the wall instead of stopping dead. */
  collide(x: number, z: number, px: number, pz: number): [number, number] {
    if (!this.isBlocked(x, z)) return [x, z];
    if (!this.isBlocked(x, pz)) return [x, pz];
    if (!this.isBlocked(px, z)) return [px, z];
    return [px, pz];
  }
}
