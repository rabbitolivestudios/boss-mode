import * as THREE from 'three';
import {
  BOSSES, CHAMPIONS, HEROES, MAX_LEVEL, MINION, PASSIVES, PHYSICS, RUN, TRAPS, WAVES, WEAPONS, XP, xpToNext,
  type BossId, type HeroDef, type HeroKind, type PassiveId, type WeaponId,
} from './config';
import { Fx } from './fx';
import { buildBoss, instanced, toon, type BossModel } from './models';
import { gamerTag } from './names';
import { sfx } from './sfx';
import type { World } from './world';

export interface Hero {
  kind: HeroKind; def: HeroDef; x: number; z: number; hp: number; maxHp: number;
  kx: number; kz: number; cd: number; dashT: number; dashCd: number; flash: number; face: number; phase: number;
  alive: boolean; batCd: number; trapCd: number; tag: string | null; label: HTMLDivElement | null; final: boolean; aura: THREE.Mesh | null;
  /** Airborne heroes are physics projectiles: no AI, and they bowl over whoever they land on. */
  y: number; vy: number; air: boolean; spin: number;
}
interface Trap { kind: 'spring' | 'saw'; x: number; z: number; life: number; bounce: number }
interface Shot { x: number; z: number; vx: number; vz: number; life: number; dmg: number; pierce: number; hit: Set<Hero> | null; enemy: boolean }
interface Gem { x: number; z: number; value: number; tier: number; pulled: boolean; spin: number; snack?: boolean; vacuum?: boolean }
interface Lava { x: number; z: number; r: number; life: number; tick: number }
interface Minion { x: number; z: number; hp: number; life: number; hitCd: number; face: number; phase: number }

export type Choice =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  | { kind: 'snack' };

export interface Summary { win: boolean; time: number; kills: number; level: number; boss: BossId; champions: number; bestCombo: number }

export interface GameHooks {
  levelUp(choices: Choice[]): void;
  end(summary: Summary): void;
  banner(title: string, sub: string): void;
  killfeed(text: string): void;
  roar(): void;
  combo(n: number): void;
}

const CELL = 2;
const MAX_SHOTS = 260;
const MAX_MINIONS = 12;
const MAX_BATS = 10;
const MAX_LAVA = 24;
const MAX_LABELS = 10;
const MAX_TRAPS = 12;

export class Game {
  readonly fx: Fx;
  bossId: BossId = 'dragon';
  private model: BossModel | null = null;
  private bossShadow: THREE.Mesh;

  // Boss state
  x = 0; z = 0; face = 0; hp = 100; maxHp = 100; hurt = 0; moving = false;
  speed = 5; dmgMul = 1; cdMul = 1; magnet = 1; regen = 0; radius = 1.2;
  level = 1; xp = 0; xpNeed = xpToNext(1); rage = 0; frenzy = 0;
  weapons = new Map<WeaponId, { level: number; cd: number }>();
  passives = new Map<PassiveId, number>();

  // Run state
  time = 0; kills = 0; championsBeaten = 0; running = false; paused = false; choosing = false;
  private pendingLevels = 0;
  private spawnAcc = 0;
  private nextSquad = RUN.squadEvery;
  private nextChampion = 0;
  private feedCd = 0;

  heroes: Hero[] = [];
  champions: Hero[] = [];
  private shots: Shot[] = [];
  private gems: Gem[] = [];
  private lava: Lava[] = [];
  private minions: Minion[] = [];
  private traps: Trap[] = [];
  combo = 0;
  bestCombo = 0;
  /** Damage taken by source, for tuning. */
  taken = { contact: 0, arrows: 0, champion: 0 };
  private comboT = 0;
  private chest: { x: number; z: number } | null = null;
  private grid = new Map<number, Hero[]>();
  private labels = 0;

  // Meshes
  private hBody; private hHead; private hGear; private hLegL; private hLegR; private shadows;
  private mFire; private mArrow; private mGem; private mBat; private mLava; private mGob; private mGobHead; private mSpring; private mSpringTop; private mSaw; private mSnack; private mVacuum; private chestMesh: THREE.Group;
  private tmp = new THREE.Object3D();
  private m4 = new THREE.Matrix4();
  private base = new THREE.Matrix4();
  private col = new THREE.Color();
  private white = new THREE.Color(0xffffff);
  private colors = new Map<HeroKind, [THREE.Color, THREE.Color, THREE.Color]>();
  private v3 = new THREE.Vector3();

  constructor(private world: World, private labelLayer: HTMLElement, private hooks: GameHooks) {
    const scene = world.scene;
    this.fx = new Fx(scene, world.camera, labelLayer);
    const cap = RUN.maxHeroes + 4;
    const white = () => toon(0xffffff);
    this.hBody = instanced(new THREE.BoxGeometry(0.7, 0.75, 0.45), white(), cap);
    this.hHead = instanced(new THREE.BoxGeometry(0.55, 0.55, 0.55), white(), cap);
    this.hGear = instanced(new THREE.BoxGeometry(0.12, 0.95, 0.14), white(), cap);
    this.hLegL = instanced(new THREE.BoxGeometry(0.26, 0.45, 0.3), toon(0x3b3f58), cap);
    this.hLegR = instanced(new THREE.BoxGeometry(0.26, 0.45, 0.3), toon(0x3b3f58), cap);
    this.shadows = instanced(new THREE.CircleGeometry(1, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }), cap + MAX_MINIONS);
    this.mFire = instanced(new THREE.IcosahedronGeometry(0.38, 0), new THREE.MeshBasicMaterial({ color: 0xff7a1a }), MAX_SHOTS);
    this.mArrow = instanced(new THREE.BoxGeometry(0.1, 0.1, 0.8), new THREE.MeshBasicMaterial({ color: 0x5a3a1a }), MAX_SHOTS);
    this.mGem = instanced(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), RUN.maxGems);
    this.mBat = instanced(new THREE.OctahedronGeometry(0.4, 0), toon(0x5b2a86, 0x2a0040, 0.4), MAX_BATS);
    this.mLava = instanced(new THREE.CylinderGeometry(1, 1, 0.08, 20), new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.8 }), MAX_LAVA);
    this.mGob = instanced(new THREE.BoxGeometry(0.55, 0.55, 0.4), toon(0x4bd14b), MAX_MINIONS);
    this.mGobHead = instanced(new THREE.ConeGeometry(0.3, 0.6, 5), toon(0x7af06a), MAX_MINIONS);
    this.mSpring = instanced(new THREE.CylinderGeometry(0.8, 0.9, 0.2, 16), toon(0x3a3f55), MAX_TRAPS);
    this.mSpringTop = instanced(new THREE.CylinderGeometry(0.7, 0.7, 0.15, 16), toon(0xff3d5a, 0xff0030, 0.3), MAX_TRAPS);
    this.mSaw = instanced(new THREE.CylinderGeometry(TRAPS.sawRadius, TRAPS.sawRadius, 0.12, 10), toon(0xd8dde6), MAX_TRAPS);
    this.mSnack = instanced(new THREE.CapsuleGeometry(0.28, 0.35, 4, 8), toon(0xc8702a, 0x6a2a00, 0.3), 40);
    this.mVacuum = instanced(new THREE.TorusGeometry(0.35, 0.14, 8, 12, Math.PI), toon(0xff2a4a, 0x800010, 0.4), 10);
    for (const m of [this.mSpring, this.mSpringTop, this.mSaw, this.mSnack, this.mVacuum]) scene.add(m);
    for (const m of [this.shadows, this.hBody, this.hHead, this.hGear, this.hLegL, this.hLegR, this.mFire, this.mArrow, this.mGem, this.mBat, this.mLava, this.mGob, this.mGobHead]) scene.add(m);
    this.shadows.renderOrder = -1;

    this.chestMesh = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), toon(0x9b5a22));
    box.position.y = 0.4;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.3, 0.85), toon(0xffc93a, 0xffa000, 0.4));
    lid.position.y = 0.9;
    this.chestMesh.add(box, lid);
    this.chestMesh.visible = false;
    scene.add(this.chestMesh);

    this.bossShadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
    this.bossShadow.rotation.x = -Math.PI / 2;
    scene.add(this.bossShadow);

    for (const k of Object.keys(HEROES) as HeroKind[]) {
      const d = HEROES[k];
      this.colors.set(k, [new THREE.Color(d.body), new THREE.Color(d.head), new THREE.Color(d.gear)]);
    }
  }

  start(boss: BossId): void {
    this.reset();
    this.bossId = boss;
    const def = BOSSES[boss];
    if (this.model) this.world.scene.remove(this.model.root);
    this.model = buildBoss(boss, def.color, def.accent);
    this.world.scene.add(this.model.root);
    this.radius = def.radius;
    this.bossShadow.scale.setScalar(def.radius * 1.1);
    this.weapons.set(def.start, { level: 1, cd: 0.5 });
    this.recalc();
    this.hp = this.maxHp;
    this.running = true;
    this.hooks.banner(`You are ${def.name} ${def.title}`, 'The heroes are coming for your treasure. Stop them!');
  }

  private reset(): void {
    for (const h of this.heroes) this.dropExtras(h);
    this.heroes = []; this.champions = []; this.shots = []; this.gems = []; this.lava = []; this.minions = []; this.traps = [];
    this.combo = 0; this.bestCombo = 0; this.comboT = 0;
    this.taken = { contact: 0, arrows: 0, champion: 0 };
    this.chest = null; this.chestMesh.visible = false;
    this.weapons.clear(); this.passives.clear();
    this.x = 0; this.z = 0; this.time = 0; this.kills = 0; this.championsBeaten = 0;
    this.level = 1; this.xp = 0; this.xpNeed = xpToNext(1); this.rage = 0; this.frenzy = 0; this.hurt = 0;
    this.pendingLevels = 0; this.spawnAcc = 0; this.nextSquad = RUN.squadEvery; this.nextChampion = 0;
    this.paused = false; this.choosing = false; this.labels = 0;
    this.fx.clear();
  }

  private recalc(): void {
    const p = (id: PassiveId) => (this.passives.get(id) ?? 0) * PASSIVES[id].per;
    const def = BOSSES[this.bossId];
    const oldMax = this.maxHp;
    this.maxHp = def.hp + p('heart');
    this.hp += Math.max(0, this.maxHp - oldMax);
    this.speed = def.speed * (1 + p('boots'));
    this.dmgMul = 1 + p('might');
    this.cdMul = Math.max(0.4, 1 - p('haste'));
    this.magnet = 1 + p('magnet');
    this.regen = p('regen');
  }

  // ---------- Level ups ----------

  private rollChoices(): Choice[] {
    const pool: Choice[] = [];
    for (const id of Object.keys(WEAPONS) as WeaponId[]) {
      const lv = this.weapons.get(id)?.level ?? 0;
      // New abilities are capped at four so builds stay readable on a small screen.
      if (lv < MAX_LEVEL && (lv > 0 || this.weapons.size < 4)) pool.push({ kind: 'weapon', id, level: lv + 1 });
    }
    for (const id of Object.keys(PASSIVES) as PassiveId[]) {
      const lv = this.passives.get(id) ?? 0;
      if (lv < MAX_LEVEL) pool.push({ kind: 'passive', id, level: lv + 1 });
    }
    const out: Choice[] = [];
    while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    if (!out.length) out.push({ kind: 'snack' });
    return out;
  }

  choose(c: Choice): void {
    if (c.kind === 'weapon') {
      const w = this.weapons.get(c.id);
      if (w) w.level = c.level;
      else this.weapons.set(c.id, { level: 1, cd: 0.2 });
    } else if (c.kind === 'passive') {
      this.passives.set(c.id, c.level);
      if (c.id === 'heart') this.hp = Math.min(this.maxHp + PASSIVES.heart.per, this.hp + PASSIVES.heart.per);
      this.recalc();
    } else {
      this.hp = Math.min(this.maxHp, this.hp + 40);
    }
    this.pendingLevels--;
    if (this.pendingLevels > 0) this.hooks.levelUp(this.rollChoices());
    else this.choosing = false;
  }

  roar(): void {
    if (!this.running || this.paused || this.choosing || this.rage < RUN.rageMax) return;
    this.rage = 0;
    this.frenzy = RUN.frenzySeconds;
    this.world.addShake(1.2);
    sfx.roar();
    this.hooks.roar();
    for (let i = 0; i < 3; i++) setTimeout(() => this.fx.ring(this.x, this.z, RUN.roarRadius * (0.5 + i * 0.3), 0xffffff, 0.5), i * 90);
    this.fx.burst(this.x, 1.5, this.z, BOSSES[this.bossId].accent, 60, 14, 0.35);
    this.near(this.x, this.z, RUN.roarRadius, (h, dx, dz, d) => {
      this.damage(h, RUN.roarDamage, (dx / (d || 1)) * 22, (dz / (d || 1)) * 22);
    });
  }

  // ---------- Main update ----------

  update(dt: number, move: { x: number; z: number }): void {
    if (!this.running || this.paused || this.choosing) return;
    this.time += dt;
    this.hurt = Math.max(0, this.hurt - dt);
    this.frenzy = Math.max(0, this.frenzy - dt);
    this.feedCd -= dt;
    this.comboT -= dt;
    if (this.comboT <= 0 && this.combo > 0) { this.combo = 0; this.hooks.combo(0); }
    this.hp = Math.min(this.maxHp, this.hp + this.regen * dt);

    this.moving = move.x !== 0 || move.z !== 0;
    this.x += move.x * this.speed * dt;
    this.z += move.z * this.speed * dt;
    if (this.moving) {
      const target = Math.atan2(move.x, move.z);
      let diff = target - this.face;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.face += diff * Math.min(1, dt * 12);
    }

    this.buildGrid();
    this.spawn(dt);
    this.updateHeroes(dt);
    this.updateWeapons(dt);
    this.updateShots(dt);
    this.updateMinions(dt);
    this.updateGems(dt);
    this.heroes = this.heroes.filter((h) => h.alive);

    if (this.hp <= 0) this.finish(false);
    else if (this.pendingLevels > 0 && !this.choosing) {
      this.choosing = true;
      sfx.level();
      this.hooks.levelUp(this.rollChoices());
    }
  }

  private finish(win: boolean): void {
    this.running = false;
    if (win) sfx.win(); else sfx.lose();
    this.hooks.end({ win, time: this.time, kills: this.kills, level: this.level, boss: this.bossId, champions: this.championsBeaten, bestCombo: this.bestCombo });
  }

  // ---------- Spatial grid ----------

  private key(cx: number, cz: number): number {
    return (cx + 32768) * 65536 + (cz + 32768);
  }

  private buildGrid(): void {
    this.grid.clear();
    for (const h of this.heroes) {
      if (!h.alive) continue;
      const k = this.key(Math.floor(h.x / CELL), Math.floor(h.z / CELL));
      const cell = this.grid.get(k);
      if (cell) cell.push(h); else this.grid.set(k, [h]);
    }
  }

  /** Visits live heroes whose edge is within `r` of the point. */
  private near(x: number, z: number, r: number, fn: (h: Hero, dx: number, dz: number, d: number) => void | boolean): void {
    const reach = r + 1.2;
    const x0 = Math.floor((x - reach) / CELL), x1 = Math.floor((x + reach) / CELL);
    const z0 = Math.floor((z - reach) / CELL), z1 = Math.floor((z + reach) / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const cell = this.grid.get(this.key(cx, cz));
        if (!cell) continue;
        for (const h of cell) {
          if (!h.alive) continue;
          const dx = h.x - x, dz = h.z - z;
          const d = Math.hypot(dx, dz);
          if (d <= r + h.def.radius && fn(h, dx, dz, d) === true) return;
        }
      }
    }
  }

  // ---------- Heroes ----------

  private spawn(dt: number): void {
    const t = this.time;
    const champ = CHAMPIONS[this.nextChampion];
    if (champ && t >= champ.at) {
      this.nextChampion++;
      const h = this.makeHero('champion', RUN.spawnRadius * 0.8);
      h.hp = h.maxHp = HEROES.champion.hp * champ.hpMul;
      h.tag = champ.name;
      h.final = champ.final === true;
      h.label = this.makeLabel(champ.name, true);
      h.aura = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 32), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
      h.aura.rotation.x = -Math.PI / 2;
      this.world.scene.add(h.aura);
      this.champions.push(h);
      sfx.horn();
      this.hooks.banner(`⚔️ ${champ.name} has joined the raid!`, champ.final ? 'Beat the Chosen One to win!' : 'A champion hero is hunting you');
    }

    if (t >= this.nextSquad) {
      this.nextSquad += RUN.squadEvery;
      this.hooks.banner('A squad has queued up!', 'They are surrounding you!');
      sfx.horn();
      const kind: HeroKind = t > 240 ? 'knight' : t > 120 ? 'sweat' : 'noob';
      const size = Math.round(RUN.squadSize + t / RUN.squadGrowth);
      for (let i = 0; i < size && this.heroes.length < RUN.maxHeroes; i++) {
        const a = (i / size) * Math.PI * 2;
        this.addHero(kind, this.x + Math.cos(a) * 15, this.z + Math.sin(a) * 15);
      }
    }

    const rate = Math.min(RUN.spawnCap, RUN.spawnBase + t * RUN.spawnRamp);
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.heroes.length >= RUN.maxHeroes) { this.spawnAcc = 0; break; }
      this.makeHero(this.pickKind(), RUN.spawnRadius * this.world.zoom);
    }
  }

  private pickKind(): HeroKind {
    let band = WAVES[0];
    for (const w of WAVES) if (this.time >= w.from) band = w;
    const entries = Object.entries(band.mix) as [HeroKind, number][];
    let roll = Math.random() * entries.reduce((s, [, n]) => s + n, 0);
    for (const [k, n] of entries) { roll -= n; if (roll <= 0) return k; }
    return 'noob';
  }

  private makeHero(kind: HeroKind, radius: number): Hero {
    const a = Math.random() * Math.PI * 2;
    return this.addHero(kind, this.x + Math.cos(a) * radius, this.z + Math.sin(a) * radius);
  }

  private addHero(kind: HeroKind, x: number, z: number): Hero {
    const def = HEROES[kind];
    const hp = def.hp * (1 + this.time / RUN.hpGrowthPeriod);
    const h: Hero = {
      kind, def, x, z, hp, maxHp: hp, kx: 0, kz: 0, cd: Math.random() * (def.ranged?.cooldown ?? def.heal?.cooldown ?? 1),
      dashT: 0, dashCd: Math.random() * 3, flash: 0, face: 0, phase: Math.random() * 6, alive: true, batCd: 0, trapCd: 0,
      y: 0, vy: 0, air: false, spin: 0,
      tag: null, label: null, final: false, aura: null,
    };
    // A few regular heroes wear visible gamer tags so the crowd reads as "other players".
    if (kind !== 'champion' && this.labels < MAX_LABELS && Math.random() < 0.06) {
      h.tag = gamerTag();
      h.label = this.makeLabel(h.tag, false);
    }
    this.heroes.push(h);
    return h;
  }

  private makeLabel(text: string, big: boolean): HTMLDivElement {
    const el = document.createElement('div');
    el.className = big ? 'tag champ' : 'tag';
    el.textContent = text;
    this.labelLayer.appendChild(el);
    if (!big) this.labels++;
    return el;
  }

  private dropExtras(h: Hero): void {
    if (h.label) { h.label.remove(); if (h.kind !== 'champion') this.labels--; h.label = null; }
    if (h.aura) { this.world.scene.remove(h.aura); h.aura = null; }
  }

  private updateHeroes(dt: number): void {
    const dmgScale = 1 + this.time / 400;
    const decay = Math.exp(-8 * dt);
    let contact = 0;
    for (const h of this.heroes) {
      if (!h.alive) continue;
      const def = h.def;
      h.flash = Math.max(0, h.flash - dt);
      h.batCd -= dt;
      h.trapCd -= dt;
      if (h.air) { this.fly(h, dt); continue; }
      let dx = this.x - h.x, dz = this.z - h.z;
      const d = Math.hypot(dx, dz) || 0.001;
      dx /= d; dz /= d;
      h.face = Math.atan2(dx, dz);

      // Heroes far behind the camera teleport ahead instead of being lost forever.
      if (d > RUN.spawnRadius * 2.2 && h.kind !== 'champion') {
        const a = Math.atan2(-dz, -dx) + (Math.random() - 0.5);
        h.x = this.x - Math.cos(a) * RUN.spawnRadius; h.z = this.z - Math.sin(a) * RUN.spawnRadius;
        continue;
      }

      let speed = def.speed;
      let mx = dx, mz = dz;
      if (def.dash) {
        h.dashCd -= dt;
        if (h.dashCd <= 0 && d < 14) { h.dashT = def.dash.duration; h.dashCd = def.dash.cooldown * (0.8 + Math.random() * 0.4); }
        if (h.dashT > 0) { h.dashT -= dt; speed *= def.dash.mult; }
      }
      const keep = def.ranged?.range ?? def.heal?.range;
      if (keep !== undefined && h.kind !== 'champion') {
        const want = def.heal ? 7 : keep * 0.75;
        if (d < want * 0.7) { mx = -dx; mz = -dz; }
        else if (d < want) { const s = Math.sin(h.phase) > 0 ? 1 : -1; mx = -dz * s * 0.6; mz = dx * s * 0.6; }
      }
      if (def.ranged) {
        h.cd -= dt;
        if (h.cd <= 0 && d < def.ranged.range) {
          h.cd = def.ranged.cooldown * (0.8 + Math.random() * 0.4);
          if (h.kind === 'champion' && Math.random() < 0.5) {
            for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; this.enemyShot(h, Math.cos(a), Math.sin(a), def.ranged.damage * dmgScale, def.ranged.speed * 0.7); }
          } else this.enemyShot(h, dx, dz, def.ranged.damage * dmgScale, def.ranged.speed);
        }
      }
      if (def.heal) {
        h.cd -= dt;
        if (h.cd <= 0) {
          h.cd = def.heal.cooldown;
          const amt = def.heal.amount * (1 + this.time / RUN.hpGrowthPeriod);
          this.near(h.x, h.z, def.heal.range, (o) => { if (o !== h && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + amt); this.fx.burst(o.x, 1.2, o.z, 0x7dffb0, 2, 2, 0.15); } });
          this.fx.ring(h.x, h.z, def.heal.range, 0x7dffb0, 0.4);
        }
      }

      h.phase += dt * speed * 2.2;
      h.x += (mx * speed + h.kx) * dt;
      h.z += (mz * speed + h.kz) * dt;
      h.kx *= decay; h.kz *= decay;

      // Crowd separation keeps the horde reading as a crowd rather than one blob.
      this.near(h.x, h.z, def.radius, (o, ox, oz, od) => {
        if (o === h || od < 0.0001) return;
        const push = (def.radius + o.def.radius - od) * 0.5;
        if (push > 0) { h.x -= (ox / od) * push; h.z -= (oz / od) * push; }
      });

      const bx = h.x - this.x, bz = h.z - this.z;
      const bd = Math.hypot(bx, bz) || 0.001;
      const touch = this.radius + def.radius;
      if (bd < touch) {
        h.x = this.x + (bx / bd) * touch;
        h.z = this.z + (bz / bd) * touch;
        contact += def.dps * dmgScale;
        if (h.kind === 'champion') this.taken.champion += def.dps * dmgScale * dt;
      }
    }
    if (contact > 0) {
      const dealt = Math.min(contact, RUN.contactCap + this.time / RUN.contactGrowth) * dt;
      this.taken.contact += dealt;
      this.hurtBoss(dealt);
    }
  }

  private enemyShot(h: Hero, dx: number, dz: number, dmg: number, speed: number): void {
    if (this.shots.length >= MAX_SHOTS) return;
    this.shots.push({ x: h.x, z: h.z, vx: dx * speed, vz: dz * speed, life: 2.2, dmg, pierce: 1, hit: null, enemy: true });
  }

  private hurtBoss(amount: number): void {
    this.hp -= amount;
    if (this.hurt <= 0.05) sfx.hurt();
    this.hurt = 0.2;
  }

  damage(h: Hero, base: number, kx = 0, kz = 0): void {
    if (!h.alive) return;
    const crit = Math.random() < 0.1;
    const dmg = base * this.dmgMul * (this.frenzy > 0 ? 1.5 : 1) * (crit ? 2 : 1);
    h.hp -= dmg;
    h.flash = 0.1;
    // Champions shrug off most knockback so they stay threatening.
    const kb = h.kind === 'champion' ? 0.15 : h.kind === 'knight' ? 0.5 : 1;
    h.kx += kx * kb; h.kz += kz * kb;
    if (!h.air && h.kind !== 'champion' && Math.hypot(h.kx, h.kz) > PHYSICS.launchAt) this.launch(h);
    this.fx.number(h.x, 1.8 * h.def.scale, h.z, dmg, crit);
    sfx.hit();
    if (h.kind === 'champion') this.rage = Math.min(RUN.rageMax, this.rage + dmg * 0.02);
    if (h.hp <= 0) this.kill(h);
  }

  private kill(h: Hero): void {
    h.alive = false;
    this.kills++;
    this.rage = Math.min(RUN.rageMax, this.rage + 1);
    this.fx.burst(h.x, 0.8, h.z, h.def.body, 8, 6);
    this.fx.burst(h.x, 1.2, h.z, h.def.head, 4, 5);
    sfx.pop();
    const name = h.tag ?? (this.feedCd <= 0 ? gamerTag() : null);
    if (name) {
      this.feedCd = 1.3;
      this.hooks.killfeed(`${BOSSES[this.bossId].emoji} ${BOSSES[this.bossId].name} eliminated ${name}`);
    }
    this.dropExtras(h);
    if (h.kind === 'champion') {
      this.championsBeaten++;
      this.champions = this.champions.filter((c) => c !== h);
      this.world.addShake(0.8);
      this.fx.burst(h.x, 1.5, h.z, 0xffd23a, 60, 12, 0.3);
      if (h.final) { this.finish(true); return; }
      this.chest = { x: h.x, z: h.z };
      this.chestMesh.visible = true;
      this.hooks.banner(`${h.tag} was defeated!`, 'Grab the treasure chest!');
      return;
    }
    if (Math.random() < RUN.vacuumChance) {
      this.gems.push({ x: h.x, z: h.z, value: 0, tier: 0, pulled: false, spin: 0, snack: true, vacuum: true });
      return;
    }
    if (Math.random() < RUN.snackChance) {
      this.gems.push({ x: h.x, z: h.z, value: 0, tier: 0, pulled: false, spin: 0, snack: true });
      return;
    }
    const value = h.def.xp;
    if (this.gems.length >= RUN.maxGems) {
      const g = this.gems[Math.floor(Math.random() * this.gems.length)];
      if (g.snack) return;
      g.value += value; g.tier = Math.min(2, g.tier + (g.value > 6 ? 1 : 0));
    } else {
      this.gems.push({ x: h.x, z: h.z, value, tier: value >= 3 ? 2 : value >= 2 ? 1 : 0, pulled: false, spin: Math.random() * 6 });
    }
  }

  // ---------- Physics ----------

  private launch(h: Hero, lift = 0): void {
    h.air = true;
    h.vy = 5 + Math.hypot(h.kx, h.kz) * 0.35 + lift;
    h.y = Math.max(h.y, 0.05);
  }

  private fly(h: Hero, dt: number): void {
    h.vy -= PHYSICS.gravity * dt;
    h.y += h.vy * dt;
    h.x += h.kx * dt;
    h.z += h.kz * dt;
    h.spin += dt * 14;
    const speed = Math.hypot(h.kx, h.kz);
    if (h.y < 2.5 && speed > 3) {
      this.near(h.x, h.z, h.def.radius, (o, ox, oz, od) => {
        if (o === h || o.air || !h.alive) return;
        const crash = (PHYSICS.crashDamage + speed * PHYSICS.crashPerSpeed);
        if (o.kind === 'champion') { this.damage(o, crash); h.kx *= -0.3; h.kz *= -0.3; return; }
        // Pass momentum along, fanned out a little, so a hit turns into a bowling strike.
        const n = od || 1;
        const t = PHYSICS.transfer;
        o.kx = h.kx * t + (ox / n) * speed * 0.35;
        o.kz = h.kz * t + (oz / n) * speed * 0.35;
        this.launch(o);
        h.kx *= 0.8; h.kz *= 0.8;
        this.addCombo(o);
        this.damage(o, crash);
      });
    }
    if (h.y <= 0) {
      h.y = 0;
      if (h.vy < -7) {
        h.vy *= -0.35;
        this.fx.burst(h.x, 0.1, h.z, 0xb99a6a, 4, 3, 0.15);
      } else {
        h.air = false; h.vy = 0; h.spin = 0;
        h.kx *= 0.3; h.kz *= 0.3;
      }
    }
  }

  private addCombo(h: Hero): void {
    this.combo++;
    this.comboT = PHYSICS.comboWindow;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.rage = Math.min(RUN.rageMax, this.rage + 0.5);
    if (this.combo >= 3) this.hooks.combo(this.combo);
    if (this.combo % 10 === 0) this.fx.number(h.x, 3, h.z, this.combo, true, '#ffd23a');
  }

  // ---------- Weapons ----------

  private updateWeapons(dt: number): void {
    const haste = this.cdMul * (this.frenzy > 0 ? 0.5 : 1);
    for (const [id, w] of this.weapons) {
      const def = WEAPONS[id];
      const i = w.level - 1;
      w.cd -= dt;
      if (id === 'bats') continue;
      if (w.cd > 0) continue;
      const fired = this.fire(id, def.dmg[i], def.n[i], w.level);
      if (fired) w.cd = def.cd[i] * haste;
    }
    this.updateBats(dt);
    this.updateLava(dt);
    this.updateTraps(dt);
  }

  private fire(id: WeaponId, dmg: number, n: number, level: number): boolean {
    switch (id) {
      case 'stomp': {
        const r = n + this.radius * 0.5;
        this.fx.ring(this.x, this.z, r, 0xffffff, 0.35);
        this.fx.burst(this.x, 0.2, this.z, 0x9b7a4a, 14, 8, 0.25);
        this.world.addShake(0.25);
        sfx.stomp();
        this.near(this.x, this.z, r, (h, dx, dz, d) => { this.damage(h, dmg, (dx / (d || 1)) * 10, (dz / (d || 1)) * 10); });
        return true;
      }
      case 'fireball': {
        const targets = this.nearest(n, 20);
        if (!targets.length) return false;
        const pierce = level >= 5 ? 4 : level >= 3 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const t = targets[k % targets.length];
          let dx = t.x - this.x, dz = t.z - this.z;
          const spread = k >= targets.length ? (k - targets.length + 1) * 0.25 : 0;
          const a = Math.atan2(dz, dx) + spread;
          dx = Math.cos(a); dz = Math.sin(a);
          if (this.shots.length < MAX_SHOTS) this.shots.push({ x: this.x + dx * this.radius, z: this.z + dz * this.radius, vx: dx * 16, vz: dz * 16, life: 1.5, dmg, pierce, hit: new Set(), enemy: false });
        }
        sfx.fire();
        return true;
      }
      case 'lava': {
        if (this.lava.length < MAX_LAVA) this.lava.push({ x: this.x, z: this.z, r: n, life: 3, tick: 0 });
        return true;
      }
      case 'lightning': {
        const pool: Hero[] = [];
        this.near(this.x, this.z, 16, (h) => { pool.push(h); });
        if (!pool.length) return false;
        for (let k = 0; k < n && pool.length; k++) {
          const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
          const tx = t.x, tz = t.z;
          this.fx.bolt(tx, tz);
          this.damage(t, dmg);
          this.near(tx, tz, 1.4, (h) => { if (h !== t) this.damage(h, dmg * 0.5); });
        }
        sfx.zap();
        return true;
      }
      case 'minions': {
        const max = Math.min(MAX_MINIONS, n);
        if (this.minions.length >= max) return false;
        const a = Math.random() * Math.PI * 2;
        const mx = this.x + Math.cos(a) * (this.radius + 0.8), mz = this.z + Math.sin(a) * (this.radius + 0.8);
        this.minions.push({ x: mx, z: mz, hp: MINION.hp * (1 + (level - 1) * 0.25), life: MINION.life, hitCd: 0, face: 0, phase: 0 });
        this.fx.burst(mx, 0.5, mz, 0x4bd14b, 10, 4);
        return true;
      }
      case 'spring':
      case 'saw': {
        const mine = this.traps.filter((tr) => tr.kind === id);
        if (mine.length >= n) {
          // Full: recycle the oldest so the player can keep re-building the maze as they move.
          const old = mine[0];
          this.traps.splice(this.traps.indexOf(old), 1);
        }
        if (this.traps.length >= MAX_TRAPS) return false;
        const bx = this.x - Math.sin(this.face) * (this.radius + 0.6);
        const bz = this.z - Math.cos(this.face) * (this.radius + 0.6);
        this.traps.push({ kind: id, x: bx, z: bz, life: id === 'spring' ? TRAPS.springLife : TRAPS.sawLife, bounce: 0 });
        this.fx.ring(bx, bz, 1.4, id === 'spring' ? 0xff3d5a : 0xd8dde6, 0.3);
        return true;
      }
      default:
        return false;
    }
  }

  private nearest(n: number, range: number): Hero[] {
    const found: { h: Hero; d: number }[] = [];
    this.near(this.x, this.z, range, (h, _dx, _dz, d) => { found.push({ h, d }); });
    found.sort((a, b) => a.d - b.d);
    return found.slice(0, n).map((f) => f.h);
  }

  private batAngle(i: number, n: number): { x: number; z: number } {
    const a = this.time * 3.2 + (i / n) * Math.PI * 2;
    const r = this.radius + 2.2;
    return { x: this.x + Math.cos(a) * r, z: this.z + Math.sin(a) * r };
  }

  private updateBats(_dt: number): void {
    const w = this.weapons.get('bats');
    if (!w) { this.mBat.count = 0; return; }
    const def = WEAPONS.bats;
    const i = w.level - 1;
    const n = Math.min(MAX_BATS, def.n[i]);
    for (let b = 0; b < n; b++) {
      const p = this.batAngle(b, n);
      this.near(p.x, p.z, 0.5, (h, dx, dz, d) => {
        if (h.batCd > 0) return;
        h.batCd = def.cd[i] * this.cdMul;
        this.damage(h, def.dmg[i], (dx / (d || 1)) * 4, (dz / (d || 1)) * 4);
      });
      this.tmp.position.set(p.x, 1.4 + Math.sin(this.time * 10 + b) * 0.2, p.z);
      this.tmp.rotation.set(0, -this.time * 3.2 - (b / n) * Math.PI * 2, 0);
      this.tmp.scale.set(1.4 + Math.sin(this.time * 30 + b) * 0.5, 0.35, 0.6);
      this.tmp.updateMatrix();
      this.mBat.setMatrixAt(b, this.tmp.matrix);
    }
    this.mBat.count = n;
    this.mBat.instanceMatrix.needsUpdate = true;
  }

  private updateLava(dt: number): void {
    const w = this.weapons.get('lava');
    const dmg = w ? WEAPONS.lava.dmg[w.level - 1] : 0;
    for (let i = this.lava.length - 1; i >= 0; i--) {
      const p = this.lava[i];
      p.life -= dt;
      p.tick -= dt;
      if (p.tick <= 0) {
        p.tick = 0.25;
        this.near(p.x, p.z, p.r, (h) => { this.damage(h, dmg * 0.25); });
      }
      if (p.life <= 0) this.lava.splice(i, 1);
    }
  }

  private updateTraps(dt: number): void {
    const spring = this.weapons.get('spring');
    const saw = this.weapons.get('saw');
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const tr = this.traps[i];
      tr.life -= dt;
      tr.bounce = Math.max(0, tr.bounce - dt * 4);
      if (tr.life <= 0) { this.traps.splice(i, 1); continue; }
      if (tr.kind === 'spring' && spring) {
        const lv = spring.level - 1;
        this.near(tr.x, tr.z, 0.8, (h) => {
          if (h.air || h.kind === 'champion' || h.trapCd > 0) return;
          h.trapCd = 0.5;
          // Launch away from the boss so the flying hero ploughs into the crowd chasing behind it.
          let dx = h.x - this.x, dz = h.z - this.z;
          const d = Math.hypot(dx, dz) || 1;
          dx /= d; dz /= d;
          const power = TRAPS.springPower * (1 + lv * 0.12);
          h.kx = dx * power; h.kz = dz * power;
          this.launch(h, 6);
          tr.bounce = 1;
          this.damage(h, WEAPONS.spring.dmg[lv]);
          this.fx.burst(tr.x, 0.3, tr.z, 0xff3d5a, 5, 5, 0.18);
        });
      } else if (tr.kind === 'saw' && saw) {
        const lv = saw.level - 1;
        const r = TRAPS.sawRadius * (lv >= 4 ? 1.4 : 1);
        this.near(tr.x, tr.z, r, (h, dx, dz, d) => {
          if (h.trapCd > 0) return;
          h.trapCd = TRAPS.sawHitEvery;
          // Saws fling sideways (tangent to the blade) so heroes spray off it.
          const n = d || 1;
          this.damage(h, WEAPONS.saw.dmg[lv], (-dz / n) * 8 + (dx / n) * 3, (dx / n) * 8 + (dz / n) * 3);
          this.fx.burst(h.x, 0.6, h.z, 0xfff27a, 3, 4, 0.12);
        });
      }
    }
  }

  private updateShots(dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.life -= dt;
      s.x += s.vx * dt; s.z += s.vz * dt;
      if (s.enemy) {
        if (Math.hypot(s.x - this.x, s.z - this.z) < this.radius) { this.hurtBoss(s.dmg); this.taken.arrows += s.dmg; s.life = 0; this.fx.burst(s.x, 1, s.z, 0xffffff, 3, 3, 0.12); }
      } else {
        this.near(s.x, s.z, 0.4, (h) => {
          if (s.hit?.has(h)) return;
          s.hit?.add(h);
          const sp = Math.hypot(s.vx, s.vz) || 1;
          this.damage(h, s.dmg, (s.vx / sp) * 5, (s.vz / sp) * 5);
          this.fx.burst(s.x, 0.8, s.z, 0xff7a1a, 4, 4, 0.16);
          s.pierce--;
          if (s.pierce <= 0) { s.life = 0; return true; }
        });
      }
      if (s.life <= 0) { this.shots[i] = this.shots[this.shots.length - 1]; this.shots.pop(); }
    }
  }

  private updateMinions(dt: number): void {
    const w = this.weapons.get('minions');
    const dmg = w ? WEAPONS.minions.dmg[w.level - 1] : 0;
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      m.life -= dt;
      m.hitCd -= dt;
      let target: Hero | null = null;
      let best = Infinity;
      this.near(m.x, m.z, 12, (h, _dx, _dz, d) => { if (d < best) { best = d; target = h; } });
      let tx = this.x, tz = this.z;
      const t = target as Hero | null;
      if (t) { tx = t.x; tz = t.z; }
      const dx = tx - m.x, dz = tz - m.z;
      const d = Math.hypot(dx, dz) || 1;
      const stop = t ? MINION.radius + t.def.radius : this.radius + 1.5;
      if (d > stop) { m.x += (dx / d) * MINION.speed * dt; m.z += (dz / d) * MINION.speed * dt; m.phase += dt * 14; }
      m.face = Math.atan2(dx, dz);
      if (t && d <= stop + 0.1 && m.hitCd <= 0) {
        m.hitCd = MINION.hitEvery;
        this.damage(t, dmg, (dx / d) * 3, (dz / d) * 3);
        m.hp -= t.def.dps * 0.5;
      }
      if (m.hp <= 0 || m.life <= 0) {
        this.fx.burst(m.x, 0.5, m.z, 0x4bd14b, 8, 4);
        this.minions.splice(i, 1);
      }
    }
  }

  private updateGems(dt: number): void {
    const reach = XP.magnetBase * this.magnet + this.radius;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const dx = this.x - g.x, dz = this.z - g.z;
      const d = Math.hypot(dx, dz);
      if (d < reach && !g.snack) g.pulled = true;
      if (g.pulled) {
        const sp = 14 + (reach - Math.min(d, reach)) * 4;
        g.x += (dx / (d || 1)) * sp * dt; g.z += (dz / (d || 1)) * sp * dt;
      }
      if (d < this.radius * 0.8) {
        if (g.vacuum) { for (const o of this.gems) if (!o.snack) o.pulled = true; this.hooks.banner('LOOT VACUUM!', 'All the loot comes to you'); }
        else if (g.snack) { this.hp = Math.min(this.maxHp, this.hp + RUN.snackHeal); this.fx.number(this.x, 3, this.z, RUN.snackHeal, false, '#7dffb0'); }
        else this.gainXp(g.value);
        sfx.gem();
        this.gems[i] = this.gems[this.gems.length - 1];
        this.gems.pop();
      }
    }
    if (this.chest && Math.hypot(this.x - this.chest.x, this.z - this.chest.z) < this.radius + 0.8) {
      this.fx.burst(this.chest.x, 1, this.chest.z, 0xffd23a, 40, 10, 0.3);
      this.chest = null;
      this.chestMesh.visible = false;
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.3);
      this.pendingLevels += 2;
      this.hooks.banner('TREASURE!', '+2 upgrades and a big snack');
    }
  }

  private gainXp(v: number): void {
    this.xp += v;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.xpNeed = xpToNext(this.level);
      this.pendingLevels++;
    }
  }

  // ---------- Rendering ----------

  render(): void {
    const t = this.time;
    if (this.model) {
      this.model.root.position.set(this.x, 0, this.z);
      this.model.root.rotation.y = this.face;
      this.model.animate(performance.now() / 1000, this.moving && this.running, this.hurt);
    }
    this.bossShadow.position.set(this.x, 0.03, this.z);

    let n = 0;
    let s = 0;
    const setShadow = (x: number, z: number, r: number) => {
      this.tmp.position.set(x, 0.02, z); this.tmp.rotation.set(-Math.PI / 2, 0, 0); this.tmp.scale.setScalar(r); this.tmp.updateMatrix();
      this.shadows.setMatrixAt(s++, this.tmp.matrix);
    };
    const part = (mesh: THREE.InstancedMesh, x: number, y: number, z: number, rx = 0) => {
      this.m4.makeRotationX(rx).setPosition(x, y, z);
      this.m4.premultiply(this.base);
      mesh.setMatrixAt(n, this.m4);
    };
    for (const h of this.heroes) {
      if (!h.alive) continue;
      const sc = h.def.scale;
      const bob = Math.abs(Math.sin(h.phase)) * 0.12;
      this.tmp.position.set(h.x, h.air ? h.y : bob * sc, h.z);
      this.tmp.rotation.set(h.air ? h.spin : 0, h.face, h.air ? h.spin * 0.6 : Math.sin(h.phase) * 0.06);
      this.tmp.scale.setScalar(sc);
      this.tmp.updateMatrix();
      this.base.copy(this.tmp.matrix);
      const swing = Math.sin(h.phase) * 0.7;
      part(this.hBody, 0, 0.82, 0);
      part(this.hHead, 0, 1.47, 0);
      part(this.hGear, 0.45, 0.95, 0.2, h.kind === 'archer' ? 0 : 0.6 + swing * 0.4);
      this.m4.makeTranslation(0, -0.22, 0).premultiply(new THREE.Matrix4().makeRotationX(swing)).setPosition(-0.17, 0.45, 0).premultiply(this.base);
      this.hLegL.setMatrixAt(n, this.m4);
      this.m4.makeTranslation(0, -0.22, 0).premultiply(new THREE.Matrix4().makeRotationX(-swing)).setPosition(0.17, 0.45, 0).premultiply(this.base);
      this.hLegR.setMatrixAt(n, this.m4);
      const c = this.colors.get(h.kind);
      if (c) {
        const f = h.flash > 0;
        this.hBody.setColorAt(n, f ? this.white : c[0]);
        this.hHead.setColorAt(n, f ? this.white : c[1]);
        this.hGear.setColorAt(n, f ? this.white : c[2]);
      }
      setShadow(h.x, h.z, h.def.radius * 1.1 / (1 + h.y * 0.25));
      if (h.aura) { h.aura.position.set(h.x, 0.05, h.z); h.aura.rotation.z = t * 2; }
      n++;
    }
    for (const m of [this.hBody, this.hHead, this.hGear, this.hLegL, this.hLegR]) {
      m.count = n;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }

    let k = 0;
    for (const m of this.minions) {
      const hop = Math.abs(Math.sin(m.phase)) * 0.25;
      this.tmp.position.set(m.x, 0.3 + hop, m.z); this.tmp.rotation.set(0, m.face, 0); this.tmp.scale.setScalar(1); this.tmp.updateMatrix();
      this.mGob.setMatrixAt(k, this.tmp.matrix);
      this.tmp.position.y = 0.85 + hop; this.tmp.updateMatrix();
      this.mGobHead.setMatrixAt(k, this.tmp.matrix);
      setShadow(m.x, m.z, 0.45);
      k++;
    }
    this.mGob.count = this.mGobHead.count = k;
    this.mGob.instanceMatrix.needsUpdate = this.mGobHead.instanceMatrix.needsUpdate = true;
    this.shadows.count = s;
    this.shadows.instanceMatrix.needsUpdate = true;

    let f = 0, a = 0;
    for (const sh of this.shots) {
      if (sh.enemy) {
        this.tmp.position.set(sh.x, 1.1, sh.z); this.tmp.rotation.set(0, Math.atan2(sh.vx, sh.vz), 0); this.tmp.scale.setScalar(1); this.tmp.updateMatrix();
        this.mArrow.setMatrixAt(a++, this.tmp.matrix);
      } else {
        this.tmp.position.set(sh.x, 1.1, sh.z); this.tmp.rotation.set(t * 9, t * 7, 0); this.tmp.scale.setScalar(1 + Math.sin(t * 30) * 0.15); this.tmp.updateMatrix();
        this.mFire.setMatrixAt(f++, this.tmp.matrix);
      }
    }
    this.mFire.count = f; this.mArrow.count = a;
    this.mFire.instanceMatrix.needsUpdate = this.mArrow.instanceMatrix.needsUpdate = true;

    let g = 0, sn = 0, vc = 0;
    for (const gem of this.gems) {
      if (gem.vacuum) {
        if (vc >= 10) continue;
        this.tmp.position.set(gem.x, 0.7 + Math.sin(t * 4) * 0.15, gem.z); this.tmp.rotation.set(0, t * 3, Math.PI); this.tmp.scale.setScalar(1.3); this.tmp.updateMatrix();
        this.mVacuum.setMatrixAt(vc++, this.tmp.matrix);
        continue;
      }
      if (gem.snack) {
        if (sn >= 40) continue;
        this.tmp.position.set(gem.x, 0.5 + Math.sin(t * 4) * 0.1, gem.z); this.tmp.rotation.set(0.6, t * 2, 0.9); this.tmp.scale.setScalar(1); this.tmp.updateMatrix();
        this.mSnack.setMatrixAt(sn++, this.tmp.matrix);
        continue;
      }
      this.tmp.position.set(gem.x, 0.45 + Math.sin(t * 4 + gem.spin) * 0.12, gem.z);
      this.tmp.rotation.set(0, t * 3 + gem.spin, 0);
      this.tmp.scale.setScalar(1 + gem.tier * 0.3);
      this.tmp.updateMatrix();
      this.mGem.setMatrixAt(g, this.tmp.matrix);
      this.mGem.setColorAt(g, this.col.setHex(XP.gemValueColors[gem.tier]));
      g++;
    }
    this.mGem.count = g;
    this.mSnack.count = sn;
    this.mVacuum.count = vc;
    this.mSnack.instanceMatrix.needsUpdate = this.mVacuum.instanceMatrix.needsUpdate = true;
    this.mGem.instanceMatrix.needsUpdate = true;
    if (this.mGem.instanceColor) this.mGem.instanceColor.needsUpdate = true;

    let l = 0;
    for (const p of this.lava) {
      const grow = Math.min(1, (3 - p.life) * 6) * Math.min(1, p.life * 2);
      this.tmp.position.set(p.x, 0.04, p.z); this.tmp.rotation.set(0, t, 0); this.tmp.scale.set(p.r * grow, 1, p.r * grow); this.tmp.updateMatrix();
      this.mLava.setMatrixAt(l++, this.tmp.matrix);
    }
    this.mLava.count = l;
    this.mLava.instanceMatrix.needsUpdate = true;

    let sp = 0, sw = 0;
    for (const tr of this.traps) {
      const fade = Math.min(1, tr.life * 2);
      if (tr.kind === 'spring') {
        this.tmp.position.set(tr.x, 0.1, tr.z); this.tmp.rotation.set(0, 0, 0); this.tmp.scale.setScalar(fade); this.tmp.updateMatrix();
        this.mSpring.setMatrixAt(sp, this.tmp.matrix);
        this.tmp.position.y = 0.25 + tr.bounce * 0.6; this.tmp.updateMatrix();
        this.mSpringTop.setMatrixAt(sp, this.tmp.matrix);
        sp++;
      } else {
        const big = (this.weapons.get('saw')?.level ?? 1) >= 5 ? 1.4 : 1;
        this.tmp.position.set(tr.x, TRAPS.sawRadius * big * 0.6, tr.z);
        this.tmp.rotation.set(t * 18, 0, Math.PI / 2);
        this.tmp.scale.setScalar(big * fade); this.tmp.updateMatrix();
        this.mSaw.setMatrixAt(sw++, this.tmp.matrix);
      }
    }
    this.mSpring.count = this.mSpringTop.count = sp;
    this.mSaw.count = sw;
    this.mSpring.instanceMatrix.needsUpdate = this.mSpringTop.instanceMatrix.needsUpdate = this.mSaw.instanceMatrix.needsUpdate = true;

    if (this.chest) {
      this.chestMesh.position.set(this.chest.x, Math.abs(Math.sin(t * 3)) * 0.3, this.chest.z);
      this.chestMesh.rotation.y = t;
    }

    this.placeLabels();
  }

  private placeLabels(): void {
    const w = window.innerWidth, hgt = window.innerHeight;
    for (const h of this.heroes) {
      if (!h.label || !h.alive) continue;
      this.v3.set(h.x, 2.2 * h.def.scale + 0.3, h.z).project(this.world.camera);
      h.label.style.transform = `translate(${(this.v3.x * 0.5 + 0.5) * w}px, ${(-this.v3.y * 0.5 + 0.5) * hgt}px) translate(-50%, -100%)`;
    }
  }
}
