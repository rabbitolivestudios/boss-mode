import * as THREE from 'three';
import {
  BOOMERANG, BOSSES, BUILDINGS, CASTLE, CHAIN, FROST, TORNADO, CHAMPION_POWERS, CHAMPIONS, COUNTERS, DEFAULT_TIER, SABOTAGE, DIFFICULTIES, HEROES, LIMIT_BREAKS, MAX_LEVEL, MINION, NIGHT_TOUGHNESS, NIGHTS, PASSIVES, PHYSICS, RUN, STARS, TRAPS, TREASURE, WAVES, WEAPONS, XP, xpToNext,
  type BossId, type BuildingId, type ChampionPower, type Difficulty, type HeroDef, type HeroKind, type PassiveId, type WeaponId,
} from './config';
import { Fx } from './fx';
import { buildBoss, instanced, toon, type BossModel } from './models';
import { gamerTag } from './names';
import { BOSS_PARTS, bossAtlas, type Face } from './bossart';
import { CAST, castAtlas, castFor, type CastId } from './cast';
import { CHAMPION_LINES, Chatter, LINES, pick } from './chatter';
import { Castle, type Building } from './castle';
import { castleAtlas, castleCell } from './castleart';
import { lootAtlas, lootCell } from './lootart';
import { spellAtlas, spellCell, type SpellId } from './spellart';
import { SpriteBatch } from './paper';
import { BossRig, PuppetRig, type Action } from './puppet';
import { sfx } from './sfx';
import { FpsMeter, track } from '../analytics/track';
import type { BuildingKey, PickKey } from '../analytics/contract';
import type { World } from './world';

export interface Hero {
  kind: HeroKind; def: HeroDef; x: number; z: number; hp: number; maxHp: number;
  kx: number; kz: number; cd: number; dashT: number; dashCd: number; flash: number; face: number; phase: number;
  alive: boolean; batCd: number; trapCd: number; tag: string | null; label: HTMLDivElement | null; final: boolean; aura: THREE.Mesh | null;
  /** Airborne heroes are physics projectiles: no AI, and they bowl over whoever they land on. */
  y: number; vy: number; air: boolean; spin: number;
  /** Outfit variant, champion index, and the -1..1 facing used for the card-flip turn. */
  variant: number; champ: number; turn: number;
  /** Current puppet action (sword swing, bow shot, staff raise), its seconds left and length, and the hit reaction timer. */
  action: Action; actT: number; actDur: number; hitT: number;
  /** 'loot' heroes ignore the boss and go for the vault; `carry` is the gold in their sack. */
  goal: 'boss' | 'loot' | 'sabotage'; carry: number; grabT: number; slowT: number;
  /** Counter-hero state: shield still up, saboteur target and work progress, and whether the boss caused its launch. */
  shield: boolean; target: Building | null; workT: number; bossLaunch: boolean; lastHit: 'boss' | BuildingId;
  /** Seconds left frozen by Frost Nova: no walking, stealing or fighting, and the boss hits harder. */
  iceT: number;
  /** Boss heroes: their power, its timers, seconds of shield left, a look override, and whether this is a fake clone. */
  power: ChampionPower | null; powerT: number; power2T: number; guard: number; look: CastId | null; decoy: boolean;
}
/** A fake xX_Clutch_Xx: looks and moves like the real one, but falls in a few hits. */
const DECOY: HeroDef = { ...HEROES.champion, dps: 8, ranged: undefined, dash: { cooldown: 4, duration: 0.4, mult: 2.5 } };
/** A Quickscope Queen arrow volley: a red circle that hurts the boss when the arrows land. */
interface Volley { x: number; z: number; t: number; ring: number }
/** Gold knocked out of a thief's sack: it bounces, then flies home to the vault. */
interface Spill { x: number; z: number; y: number; vx: number; vz: number; vy: number; t: number; sx: number; sz: number }
export interface Escape { tag: string; gold: number; kind: HeroKind }
/** A defeated paper hero folding flat before it disappears. */
interface Corpse { x: number; z: number; y: number; cast: number; face: number; size: number; born: number; spin: number; seed: number }

/** Moves toward a target at a fixed rate, so a flip from -1 to 1 passes through 0 (edge-on) visibly. */
function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step);
}
interface Trap { kind: 'spring' | 'saw'; x: number; z: number; life: number; bounce: number }
interface Shot { x: number; z: number; vx: number; vz: number; life: number; dmg: number; pierce: number; hit: Set<Hero> | null; enemy: boolean; src?: BuildingId }
interface Gem { x: number; z: number; value: number; tier: number; pulled: boolean; spin: number; snack?: boolean; vacuum?: boolean }
interface Lava { x: number; z: number; r: number; life: number; tick: number }
/** A spell piece drawn as a paper cutout for a moment: bolts, storm clouds, explosions, snowflakes. */
interface Flash { cell: SpellId; x: number; y: number; z: number; vx: number; vz: number; w: number; h: number; life: number; max: number; roll: number; face: number }
interface Twister { x: number; z: number; vx: number; vz: number; life: number; tick: number; dmg: number; seed: number }
interface Boomerang { x: number; z: number; vx: number; vz: number; t: number; back: boolean; dmg: number; hit: Set<Hero> }
interface Minion { x: number; z: number; hp: number; life: number; hitCd: number; face: number; phase: number; turn?: number; actT?: number; seed?: number }

export type Choice =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  | { kind: 'limit'; id: 'might' | 'haste' | 'hp' | 'speed' }
  | { kind: 'snack' };

function choiceKey(c: Choice): PickKey {
  return c.kind === 'snack' ? 'snack' : `${c.kind}:${c.id}` as PickKey;
}

export interface Summary {
  /** Gold in the vault when the last night began, and the thieves that got away with gold that night. */
  nightStart: number; nightEscapes: number; nightStolen: number;
  season: number; retries: number; difficulty: Difficulty; win: boolean; time: number; kills: number; level: number; boss: BossId; champions: number; bestCombo: number; treasure: number; stolen: number; reason: 'hp' | 'vault' | 'win'; escapes: Escape[]; allPicksAt: number | null; night: number }

export interface GameHooks {
  levelUp(choices: Choice[]): void;
  end(summary: Summary): void;
  banner(title: string, sub: string): void;
  killfeed(text: string): void;
  roar(): void;
  combo(n: number): void;
  /** A night's build phase has begun. */
  build(night: number): void;
  /** A night was survived. */
  dawn(report: NightReport): void;
  /** A counter-hero joins the raids for the first time this night. */
  challenger(kind: HeroKind, text: string): void;
}

export interface NightReport { night: number; kills: number; stolen: number; recovered: number; tribute: number; stars: number; treasure: number; damage: number; buildingShare: number; adapting: string | null; level: number; maxed: boolean }

/** Everything needed to replay a night from its build phase, or to continue a season later. */
export interface SeasonSave {
  boss: BossId; difficulty: string; night: number; treasure: number; time: number;
  buildings: [BuildingId, number, number, number, number?][];
  seed: number;
  level: number; xp: number; weapons: [WeaponId, number][]; passives: [PassiveId, number][];
  kills: number; stolen: number; championsBeaten: number; bestCombo: number;
  /** Nights replayed after a loss; each one costs leaderboard score. */
  retries?: number;
  nextSquad: number; nextHeist: number; escapes: Escape[];
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
  difficulty: Difficulty = DIFFICULTIES[DEFAULT_TIER];
  private model: BossModel | null = null;
  private bossShadow: THREE.Mesh;

  // Boss state
  x = 0; z = 0; face = 0; hp = 100; maxHp = 100; hurt = 0; moving = false;
  private turn = 1; private ouch = 0; private ouchCd = 0;
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
  retries = 0;
  /** Random id for analytics, set by the app when a season starts or is continued; never the seed. */
  trackSeason = '';
  readonly fps = new FpsMeter();
  private buildStats = { t0: 0, spent: 0, placed: {} as Partial<Record<BuildingKey, number>>, sold: 0, repaired: false };
  private raidStart = { taken: { contact: 0, arrows: 0, champion: 0 }, buildings: 0 };
  private offered: PickKey[] = [];
  private shots: Shot[] = [];
  private gems: Gem[] = [];
  private lava: Lava[] = [];
  private minions: Minion[] = [];
  private traps: Trap[] = [];
  combo = 0;
  bestCombo = 0;
  /** Gold in the vault, gold carried off for good, and who carried it. */
  treasure: number = TREASURE.start;
  stolen = 0;
  escapes: Escape[] = [];
  /** Every possible breach point, and tonight's active ones (heroes enter and thieves leave through these). */
  readonly breaches: { x: number; z: number }[] = [];
  gates: { x: number; z: number }[] = [];
  /** A telegraphed breach about to open mid-night; standing on it cancels it. */
  surprise: { x: number; z: number; t: number; done: boolean } | null = null;
  private surpriseDone = false;
  private seasonSeed = 1;
  private spills: Spill[] = [];
  private flashes: Flash[] = [];
  private volleys: Volley[] = [];
  /** Tonight's boss hero: beaten yet, whether the dawn warning showed, and a Captain Loot on his way back. */
  private bossBeaten = false;
  private bossWarned = false;
  private bossReturn: { at: number; hp: number } | null = null;
  private chestReward = { gold: 0, levels: 0 };
  private twisters: Twister[] = [];
  private booms: Boomerang[] = [];
  private warnedThief = false;
  private warnedLow = false;
  /** Real seconds of slow motion left, used once when the first thief of a season grabs gold. */
  private slowmo = 0;
  private nextHeist: number = TREASURE.heistFirst;
  // Season state
  readonly castle: Castle;
  phase: 'title' | 'build' | 'raid' | 'dawn' | 'over' = 'title';
  night = 0;
  nightTime = 0;
  private nightKills = 0;
  private nightStolen = 0;
  private nightGrabs = 0;
  private nightEscapes = 0;
  private nightRecovered = 0;
  private nightStartGold = 0;
  save: SeasonSave | null = null;
  /** Counter-hero weight multipliers, raised by the buildings that did the killing last night. */
  private counterBoost = new Map<HeroKind, number>();
  private nightBuildingKills = new Map<BuildingId, number>();
  private nightDamage = 0;
  /** Season time when every upgrade had been taken, for the summary. */
  allPicksAt: number | null = null;
  private limits: Partial<Record<'might' | 'haste' | 'hp' | 'speed', number>> = {};
  /** Damage taken by source, for tuning. */
  taken = { contact: 0, arrows: 0, champion: 0 };
  private comboT = 0;
  private chest: { x: number; z: number } | null = null;
  private grid = new Map<number, Hero[]>();
  private labels = 0;

  // Meshes
  private hBody; private hHead; private hGear; private hLegL; private hLegR; private shadows;
  private mFire; private mArrow; private mGem; private mBat; private mLava; private mGob; private mGobHead; private mSpring; private mSpringTop; private mSaw; private mSnack; private mVacuum; private chestMesh: THREE.Group;
  private paper: { heroes: SpriteBatch; rig: PuppetRig; boss: SpriteBatch; bossRig: BossRig; loot: SpriteBatch; castle: SpriteBatch; spells: SpriteBatch; corpses: Corpse[] } | null = null;
  private gridMesh: THREE.InstancedMesh;
  /** Cell under the pointer during the build phase, and whether the current tool may go there. */
  hover: { cx: number; cz: number; ok: boolean } | null = null;
  private bossActT = 0;
  private walkBlend = 0;
  private chatter: Chatter;
  private chatCd = 2;
  private bossLight: THREE.PointLight | null = null;
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
    this.chatter = new Chatter(labelLayer, world.camera);
    for (let i = 0; i < TREASURE.gates; i++) {
      const a = (i / TREASURE.gates) * Math.PI * 2 + Math.PI / 4;
      this.breaches.push({ x: Math.cos(a) * TREASURE.gateRadius, z: Math.sin(a) * TREASURE.gateRadius });
    }
    this.castle = new Castle(this.breaches);
    this.gates = this.breaches.slice(0, 2);
    // Build-phase grid: one flat tile per cell, tinted by what can be built there.
    const tile = new THREE.PlaneGeometry(CASTLE.cell * 0.92, CASTLE.cell * 0.92);
    tile.rotateX(-Math.PI / 2);
    this.gridMesh = new THREE.InstancedMesh(tile, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28, depthWrite: false }), this.castle.size * this.castle.size);
    this.gridMesh.frustumCulled = false;
    this.gridMesh.visible = false;
    world.scene.add(this.gridMesh);
    // Keep scenery off the vault and out of the gateways.
    // The whole castle is kept clear so buildings never hide behind trees.
    world.keepClear = [{ x: 0, z: 0, r: CASTLE.buildRadius + 3 }];
    const cap = RUN.maxHeroes + 4;
    // The diorama is lit like a painted map, so its figures use matte shading instead of cartoon bands.
    const white = () => (world.style === 'diorama' ? new THREE.MeshLambertMaterial({ color: 0xffffff }) : toon(0xffffff));
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

    if (world.style === 'paper') {
      const ha = castAtlas();
      const ba = bossAtlas();
      const bossBatch = new SpriteBatch(ba.tex, ba.cols, ba.rows, Math.max(...Object.values(BOSS_PARTS).map((ps) => ps.length)), world.standeeTilt);
      // Seven puppet pieces per figure.
      const heroes = new SpriteBatch(ha.tex, ha.cols, ha.rows, (cap + MAX_MINIONS + 80) * 7, world.standeeTilt);
      this.paper = {
        heroes,
        rig: new PuppetRig(heroes, ha),
        boss: bossBatch,
        bossRig: new BossRig(bossBatch, ba),
        loot: (() => { const la = lootAtlas(); return new SpriteBatch(la.tex, la.cols, la.rows, RUN.maxHeroes + 260, world.standeeTilt); })(),
        castle: (() => { const ca = castleAtlas(); return new SpriteBatch(ca.tex, ca.cols, ca.rows, CASTLE.half * CASTLE.half * 4, world.standeeTilt); })(),
        spells: (() => { const sa = spellAtlas(); return new SpriteBatch(sa.tex, sa.cols, sa.rows, MAX_SHOTS + RUN.maxHeroes + 200, world.standeeTilt); })(),
        corpses: [],
      };
      scene.add(this.paper.castle.mesh, this.paper.heroes.mesh, this.paper.boss.mesh, this.paper.loot.mesh, this.paper.spells.mesh);
      // Fireballs are drawn as paper comets instead.
      this.mFire.visible = false;
      for (const m of [this.hBody, this.hHead, this.hGear, this.hLegL, this.hLegR, this.mGob, this.mGobHead]) m.visible = false;
    }
    if (world.shadows) {
      for (const m of [this.hBody, this.hHead, this.hGear, this.hLegL, this.hLegR, this.mGob, this.mGobHead, this.mSpring, this.mSaw, this.mBat]) m.castShadow = true;
      this.chestMesh.traverse((o) => { o.castShadow = true; });
      this.shadows.visible = false;
      this.bossShadow.visible = false;
    }
    if (world.style === 'dungeon') {
      // Over-bright colours so the bloom pass makes spells and loot glow.
      (this.mFire.material as THREE.MeshBasicMaterial).color.setRGB(4, 1.6, 0.4);
      (this.mGem.material as THREE.MeshBasicMaterial).color.setScalar(2.2);
      (this.mLava.material as THREE.MeshBasicMaterial).color.setRGB(3, 0.9, 0.2);
      this.bossLight = new THREE.PointLight(0xffc27a, 18, 14, 1.4);
      scene.add(this.bossLight);
    }

    for (const k of Object.keys(HEROES) as HeroKind[]) {
      const d = HEROES[k];
      this.colors.set(k, [new THREE.Color(d.body), new THREE.Color(d.head), new THREE.Color(d.gear)]);
    }
  }

  start(boss: BossId, difficulty: Difficulty = DIFFICULTIES[DEFAULT_TIER]): void {
    this.difficulty = difficulty;
    this.reset();
    this.retries = 0;
    this.bossId = boss;
    const def = BOSSES[boss];
    if (this.model) this.world.scene.remove(this.model.root);
    this.model = buildBoss(boss, def.color, def.accent);
    if (this.world.shadows) this.model.root.traverse((o) => { o.castShadow = true; });
    if (!this.paper) this.world.scene.add(this.model.root);
    this.bossLight?.color.setHex(def.accent);
    this.radius = def.radius;
    this.bossShadow.scale.setScalar(def.radius * 1.1);
    this.weapons.set(def.start, { level: 1, cd: 0.5 });
    this.recalc();
    this.hp = this.maxHp;
    this.castle.clear();
    this.night = 0;
    this.seasonSeed = 1 + Math.floor(Math.random() * 1e9);
    this.enterBuild();
  }

  /** Seeded per season and night, so a retried night opens the same breaches. */
  private nightRng(salt: number): () => number {
    let s = (this.seasonSeed * 31 + this.night * 7919 + salt * 104729) % 2147483647 || 1;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }

  /** Picks tonight's breaches: a few, never the exact same set as last night, all of them on the final night. */
  private planBreaches(): void {
    const n = TREASURE.breachesPerNight[this.night] ?? 4;
    if (n >= this.breaches.length) { this.gates = [...this.breaches]; this.castle.setActive(this.gates); return; }
    const rng = this.nightRng(1);
    const prev = new Set(this.gates);
    let pick: { x: number; z: number }[] = [];
    for (let tries = 0; tries < 20; tries++) {
      const pool = [...this.breaches];
      pick = [];
      while (pick.length < n) pick.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
      if (this.night === 0 || pick.some((g) => !prev.has(g))) break;
    }
    this.gates = pick;
    this.castle.setActive(this.gates);
  }

  /** From the surprise night on, one unopened breach cracks open mid-night after a warning. */
  private updateSurprise(dt: number): void {
    if (!this.surpriseDone && this.night >= TREASURE.surpriseFromNight && this.gates.length < this.breaches.length
      && this.nightTime >= NIGHTS[this.night].duration * TREASURE.surpriseAt) {
      this.surpriseDone = true;
      const far = this.breaches.filter((b) => !this.gates.includes(b) && Math.hypot(b.x - this.x, b.z - this.z) >= TREASURE.surpriseMinDistance);
      const pool = far.length ? far : this.breaches.filter((b) => !this.gates.includes(b));
      const at = pool[Math.floor(this.nightRng(2)() * pool.length)];
      if (at) {
        this.surprise = { x: at.x, z: at.z, t: TREASURE.surpriseWarning, done: false };
        this.hooks.killfeed(`🚨 ${gamerTag()} found a back door!`);
        this.hooks.banner('BACK DOOR!', 'Stand on the glowing crack to seal it');
        sfx.siren();
      }
    }
    const sp = this.surprise;
    if (!sp) return;
    const before = sp.t;
    sp.t -= dt;
    if (Math.floor(before * 3) !== Math.floor(sp.t * 3)) {
      this.fx.ring(sp.x, sp.z, TREASURE.surpriseCancel, 0xff3d5a, 0.3);
      this.fx.burst(sp.x, 0.2, sp.z, 0x6a4a2a, 5, 3, 0.2);
    }
    if (sp.t > 0) return;
    this.surprise = null;
    const at = this.breaches.find((b) => b.x === sp.x && b.z === sp.z);
    if (Math.hypot(this.x - sp.x, this.z - sp.z) < TREASURE.surpriseCancel || !at) {
      // Sealed: the telegraph rewards being in the right place.
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        this.gems.push({ x: sp.x + Math.cos(a) * 1.5, z: sp.z + Math.sin(a) * 1.5, value: 2, tier: 1, pulled: true, spin: i });
      }
      this.fx.ring(sp.x, sp.z, 4, 0xffd23a, 0.5);
      this.hooks.banner('SEALED!', 'Back door closed. Bonus gems!');
      sfx.level();
      return;
    }
    this.gates = [...this.gates, at];
    this.castle.setActive(this.gates);
    const wrecked = this.shred();
    this.world.addShake(0.6);
    this.fx.burst(sp.x, 0.5, sp.z, 0x6a4a2a, 30, 9, 0.3);
    const kinds: HeroKind[] = ['rogue', 'rogue', 'noob', 'sweat'];
    for (let i = 0; i < TREASURE.surpriseCrew && this.heroes.length < RUN.maxHeroes; i++) {
      this.addHero(kinds[i % kinds.length], sp.x + (Math.random() - 0.5) * 3, sp.z + (Math.random() - 0.5) * 3);
    }
    this.hooks.banner('THEY GOT IN!', wrecked ? `A new breach wrecked ${wrecked} building${wrecked > 1 ? 's' : ''}` : 'A new breach is open');
  }

  /** Buildings caught inside a newly opened breach zone are wrecked, with a partial refund. */
  private shred(): number {
    let n = 0;
    for (const b of [...this.castle.buildings]) {
      const [x, z] = this.castle.center(b.cx, b.cz);
      if (!this.castle.inBreach(x, z)) continue;
      this.castle.remove(b);
      this.treasure += Math.floor(BUILDINGS[b.id].cost * CASTLE.shredRefund);
      this.fx.burst(x, 0.8, z, 0xc08a4c, 14, 6, 0.22);
      n++;
    }
    return n;
  }

  // ---------- Season ----------

  /** Clears the arena between nights; the boss keeps its level, powers and castle. */
  private clearRaid(): void {
    for (const h of this.heroes) this.dropExtras(h);
    this.heroes = []; this.champions = []; this.shots = []; this.gems = []; this.lava = []; this.minions = [];
    this.traps = this.traps.filter(() => false);
    this.spills = []; this.flashes = []; this.volleys = []; this.bossReturn = null; this.twisters = []; this.booms = []; this.chest = null; this.chestMesh.visible = false;
    if (this.paper) this.paper.corpses = [];
    this.combo = 0; this.comboT = 0; this.frenzy = 0; this.hurt = 0; this.ouch = 0;
    this.fx.clear();
    this.chatter.clear();
  }

  private enterBuild(): void {
    this.clearRaid();
    this.phase = 'build';
    this.running = false;
    this.x = 4.5; this.z = 0.5;
    this.hp = this.maxHp;
    this.surprise = null; this.surpriseDone = false;
    this.planBreaches();
    const wrecked = this.shred();
    this.save = this.snapshot();
    this.buildStats = { t0: performance.now(), spent: 0, placed: {}, sold: 0, repaired: false };
    this.hooks.build(this.night);
    const debut = COUNTERS.find((c) => c.from === this.night);
    if (debut) this.hooks.challenger(debut.kind, debut.card);
    if (wrecked) this.hooks.banner('Breach!', `${wrecked} building${wrecked > 1 ? 's were' : ' was'} wrecked by a new breach (half refunded)`);
  }

  startRaid(): void {
    if (this.phase !== 'build') return;
    this.phase = 'raid';
    this.running = true;
    this.bossBeaten = false; this.bossWarned = false; this.bossReturn = null;
    this.hover = null;
    this.nightTime = 0; this.nightKills = 0; this.nightStolen = 0; this.nightRecovered = 0; this.warnedLow = false; this.nightGrabs = 0; this.nightEscapes = 0;
    this.nightDamage = 0; this.nightBuildingKills.clear();
    this.nightStartGold = this.treasure;
    this.trackBuild();
    this.raidStart = { taken: { ...this.taken }, buildings: this.castle.buildings.length };
    const last = this.night === NIGHTS.length - 1;
    this.hooks.banner(`NIGHT ${this.night + 1}${last ? ': THE FINAL RAID' : ''}`, last ? 'The Chosen One is coming for your treasure' : 'Guard the vault until sunrise!');
    sfx.horn();
  }

  /** Sunrise: surviving heroes flee, gold still in sacks drops back into the vault, tribute is paid. */
  private dawn(): void {
    let returned = 0;
    for (const h of this.heroes) returned += h.carry;
    returned += this.spills.length;
    this.treasure += returned;
    this.nightRecovered += returned;
    const tribute = NIGHTS[this.night].tribute;
    this.trackNight('survived');
    this.treasure += tribute;
    const kept = this.nightStartGold > 0 ? (this.nightStartGold - this.nightStolen) / this.nightStartGold : 1;
    const stars = kept >= STARS.three ? 3 : kept >= STARS.two ? 2 : 1;
    // The raiders adapt: whichever buildings did the killing make their counter-hero more common.
    let byBuildings = 0;
    for (const n of this.nightBuildingKills.values()) byBuildings += n;
    let adapting: string | null = null, strongest = 1.4;
    for (const c of COUNTERS) {
      const share = c.boost.reduce((sum, id) => sum + (this.nightBuildingKills.get(id) ?? 0), 0) / Math.max(1, this.nightKills);
      const boost = 1 + SABOTAGE.boostPerShare * share;
      this.counterBoost.set(c.kind, boost);
      if (boost > strongest && this.night + 1 >= c.from) { strongest = boost; adapting = c.taunt; }
    }
    for (const b of this.castle.buildings) b.jammed = 0;
    this.phase = 'dawn';
    this.running = false;
    this.clearRaid();
    sfx.win();
    this.hooks.dawn({
      night: this.night, kills: this.nightKills, stolen: this.nightStolen, recovered: this.nightRecovered, tribute, stars,
      treasure: this.treasure, damage: Math.round(this.nightDamage), buildingShare: byBuildings / Math.max(1, this.nightKills),
      adapting, level: this.level, maxed: this.allPicksAt !== null,
    });
  }

  nextNight(): void {
    if (this.phase !== 'dawn') return;
    this.night++;
    this.enterBuild();
  }

  /** Replays the current night from its build phase. */
  retryNight(): void {
    if (this.save) this.restore({ ...this.save, retries: (this.save.retries ?? 0) + 1 });
  }

  nightLeft(): number {
    return Math.max(0, NIGHTS[this.night].duration - this.nightTime);
  }

  // ---------- Building ----------

  canBuild(cx: number, cz: number, id: BuildingId): string | null {
    // The vault always keeps at least one coin, so building can never lose the game on its own.
    const spendable = this.spendable();
    if (BUILDINGS[id].cost > spendable) {
      // Having exactly the price reads like enough gold, so say why it is not.
      return this.treasure >= BUILDINGS[id].cost
        ? `1 coin must stay in your vault! You can spend ${spendable}.`
        : `Need ${BUILDINGS[id].cost - spendable} more gold`;
    }
    return this.castle.whyNot(cx, cz, id);
  }

  build(cx: number, cz: number, id: BuildingId): string | null {
    if (this.phase !== 'build') return 'Build between nights';
    const why = this.canBuild(cx, cz, id);
    if (why) return why;
    this.castle.place(cx, cz, id, this.night, BUILDINGS[id].hp);
    this.treasure -= BUILDINGS[id].cost;
    this.buildStats.spent += BUILDINGS[id].cost;
    this.buildStats.placed[id] = (this.buildStats.placed[id] ?? 0) + 1;
    sfx.place();
    const [x, z] = this.castle.center(cx, cz);
    this.fx.burst(x, 0.5, z, 0xc08a4c, 8, 4, 0.18);
    return null;
  }

  /** What selling a building returns: full price if placed this build phase, less if it survived a night. */
  refund(cx: number, cz: number): number {
    const b = this.castle.at(cx, cz);
    if (!b) return 0;
    return b.night === this.night ? BUILDINGS[b.id].cost : Math.floor(BUILDINGS[b.id].cost * CASTLE.oldRefund);
  }

  /** Same-night undo is free, so experimenting costs nothing; moving an old defence costs half its price. */
  sell(cx: number, cz: number): boolean {
    if (this.phase !== 'build') return false;
    const b = this.castle.at(cx, cz);
    if (!b) return false;
    const back = this.refund(cx, cz);
    this.treasure += back;
    this.buildStats.spent -= back;
    this.buildStats.sold++;
    this.castle.remove(b);
    sfx.sell();
    return true;
  }

  private snapshot(): SeasonSave {
    return {
      boss: this.bossId, difficulty: this.difficulty.id, night: this.night, treasure: this.treasure, time: this.time,
      buildings: this.castle.buildings.map((b) => [b.id, b.cx, b.cz, b.night, b.hp]),
      seed: this.seasonSeed,
      level: this.level, xp: this.xp, weapons: [...this.weapons].map(([id, w]) => [id, w.level]), passives: [...this.passives],
      kills: this.kills, stolen: this.stolen, championsBeaten: this.championsBeaten, bestCombo: this.bestCombo, retries: this.retries,
      nextSquad: this.nextSquad, nextHeist: this.nextHeist, escapes: [...this.escapes],
    };
  }

  /** Rebuilds a season from a save: used for "retry night" and for continuing a saved season. */
  restore(sv: SeasonSave): void {
    this.start(sv.boss, DIFFICULTIES.find((d) => d.id === sv.difficulty) ?? DIFFICULTIES[DEFAULT_TIER]);
    this.weapons.clear();
    for (const [id, lv] of sv.weapons) this.weapons.set(id, { level: lv, cd: 0.5 });
    this.passives = new Map(sv.passives);
    this.recalc();
    this.level = sv.level; this.xp = sv.xp; this.xpNeed = xpToNext(sv.level);
    this.treasure = sv.treasure; this.time = sv.time; this.night = sv.night;
    this.kills = sv.kills; this.stolen = sv.stolen; this.championsBeaten = sv.championsBeaten; this.bestCombo = sv.bestCombo;
    this.nextSquad = sv.nextSquad; this.nextHeist = sv.nextHeist; this.escapes = [...sv.escapes];
    this.nextChampion = CHAMPIONS.filter((c) => c.night - 1 < sv.night).length;
    this.seasonSeed = sv.seed ?? 1;
    this.retries = sv.retries ?? 0;
    this.castle.clear();
    for (const [id, cx, cz, night, hp] of sv.buildings) { const b = this.castle.place(cx, cz, id, night ?? sv.night, BUILDINGS[id].hp); b.hp = hp ?? b.maxHp; }
    this.enterBuild();
  }

  private reset(): void {
    for (const h of this.heroes) this.dropExtras(h);
    this.heroes = []; this.champions = []; this.shots = []; this.gems = []; this.lava = []; this.minions = []; this.traps = [];
    this.combo = 0; this.bestCombo = 0; this.comboT = 0;
    this.taken = { contact: 0, arrows: 0, champion: 0 };
    this.chest = null; this.chestMesh.visible = false;
    this.weapons.clear(); this.passives.clear(); this.limits = {}; this.allPicksAt = null;
    this.x = 4.5; this.z = 0.5; this.time = 0; this.kills = 0; this.championsBeaten = 0;
    this.treasure = TREASURE.start; this.stolen = 0; this.escapes = []; this.spills = []; this.warnedThief = false; this.nextHeist = TREASURE.heistFirst;
    this.level = 1; this.xp = 0; this.xpNeed = xpToNext(1); this.rage = 0; this.frenzy = 0; this.hurt = 0;
    this.pendingLevels = 0; this.spawnAcc = 0; this.nextSquad = RUN.squadEvery; this.nextChampion = 0;
    this.paused = false; this.choosing = false; this.labels = 0;
    this.turn = 1; this.ouch = 0; this.ouchCd = 0; this.chatCd = 2;
    if (this.paper) this.paper.corpses = [];
    this.fx.clear();
    this.chatter.clear();
  }

  private recalc(): void {
    const p = (id: PassiveId) => (this.passives.get(id) ?? 0) * PASSIVES[id].per;
    const lim = (id: 'might' | 'haste' | 'hp' | 'speed') => (this.limits[id] ?? 0) * (LIMIT_BREAKS.find((l) => l.id === id)?.per ?? 0);
    const def = BOSSES[this.bossId];
    const oldMax = this.maxHp;
    this.maxHp = def.hp + p('heart') + lim('hp');
    this.hp += Math.max(0, this.maxHp - oldMax);
    this.speed = def.speed * (1 + p('boots') + lim('speed'));
    this.dmgMul = 1 + p('might') + lim('might');
    this.cdMul = Math.max(0.35, 1 - p('haste') - lim('haste'));
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
    if (!out.length) {
      // Everything is maxed: record when, then keep offering small uncapped boosts.
      if (this.allPicksAt === null) this.allPicksAt = this.time;
      const lb = [...LIMIT_BREAKS];
      while (out.length < 3 && lb.length) out.push({ kind: 'limit', id: lb.splice(Math.floor(Math.random() * lb.length), 1)[0].id });
    }
    this.offered = out.map(choiceKey);
    return out;
  }

  choose(c: Choice): void {
    if (this.offered.length) track({ type: 'pick', season: this.trackSeason, night: this.night + 1, level: this.level, offered: this.offered, picked: choiceKey(c) });
    if (c.kind === 'weapon') {
      const w = this.weapons.get(c.id);
      if (w) w.level = c.level;
      else this.weapons.set(c.id, { level: 1, cd: 0.2 });
    } else if (c.kind === 'passive') {
      this.passives.set(c.id, c.level);
      if (c.id === 'heart') this.hp = Math.min(this.maxHp + PASSIVES.heart.per, this.hp + PASSIVES.heart.per);
      this.recalc();
    } else if (c.kind === 'limit') {
      this.limits[c.id] = (this.limits[c.id] ?? 0) + 1;
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
    if (this.phase !== 'raid' || !this.running || this.paused || this.choosing) return;
    if (this.slowmo > 0) { this.slowmo -= dt; dt *= 0.3; }
    this.time += dt;
    this.nightTime += dt;
    this.castle.trackBoss(this.x, this.z);
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
    if (move.x !== 0) this.turn = approach(this.turn, Math.sign(move.x), dt * 7);
    this.ouch = Math.max(0, this.ouch - dt);
    this.bossActT = Math.max(0, this.bossActT - dt);
    this.walkBlend = approach(this.walkBlend, this.moving ? 1 : 0, dt * 5);
    this.ouchCd -= dt;
    this.chatter.update(dt);
    this.chatCd -= dt;
    if (this.chatCd <= 0) {
      this.chatCd = 1.6 + Math.random() * 1.8;
      // Only heroes near the boss talk, so the bubble is actually on screen.
      const near = this.heroes.filter((h) => h.alive && !h.air && Math.hypot(h.x - this.x, h.z - this.z) < 13);
      if (near.length) { const h = pick(near); this.chatter.say(h, pick(LINES.taunt), 2.4 * h.def.scale); }
    }

    this.buildGrid();
    this.spawn(dt);
    this.updateSurprise(dt);
    this.updateHeroes(dt);
    this.updateWeapons(dt);
    this.updateShots(dt);
    this.updateMinions(dt);
    this.updateGems(dt);
    this.updateSpills(dt);
    this.updateBuildings(dt);
    this.heroes = this.heroes.filter((h) => h.alive);
    if (this.running && this.nightTime >= NIGHTS[this.night].duration) {
      // Dawn waits for tonight's boss hero.
      const boss = this.bossToBeat();
      if (!boss) { this.dawn(); return; }
      if (!this.bossWarned) { this.bossWarned = true; this.hooks.banner(`Defeat ${boss} to see dawn!`, 'The sun will not rise while the boss stands'); sfx.horn(); }
    }

    if (this.running && !this.warnedLow && this.treasure <= TREASURE.lowWarning) {
      this.warnedLow = true;
      this.hooks.banner('VAULT ALMOST EMPTY!', 'If thieves take the last coin, you lose!');
      sfx.siren();
    }
    if (this.hp <= 0) this.finish(false, 'hp');
    else if (this.treasure <= 0 && this.spills.length === 0 && !this.heroes.some((h) => h.carry > 0)) this.finish(false, 'vault');
    else if (this.pendingLevels > 0 && !this.choosing) {
      this.choosing = true;
      sfx.level();
      this.hooks.levelUp(this.rollChoices());
    }
  }

  private finish(win: boolean, reason: Summary['reason']): void {
    if (this.phase === 'raid') this.trackNight(win ? 'survived' : reason === 'vault' ? 'vault' : 'hp');
    this.running = false;
    this.phase = 'over';
    if (win) sfx.win(); else sfx.lose();
    this.hooks.end({
      nightStart: this.nightStartGold, nightEscapes: this.nightEscapes, nightStolen: this.nightStolen,
      season: this.seasonSeed,
      retries: this.retries,
      difficulty: this.difficulty, win, reason, time: this.time, kills: this.kills, level: this.level, boss: this.bossId, champions: this.championsBeaten,
      bestCombo: this.bestCombo, treasure: this.treasure, stolen: this.stolen, escapes: this.escapes, allPicksAt: this.allPicksAt, night: this.night,
    });
  }

  // ---------- Analytics ----------

  private trackBuild(): void {
    if (!this.trackSeason) return;
    track({ type: 'build', build: {
      season: this.trackSeason, night: this.night + 1, seconds: Math.round((performance.now() - this.buildStats.t0) / 1000),
      spent: Math.max(0, this.buildStats.spent), gold: this.treasure, placed: this.buildStats.placed, sold: this.buildStats.sold, repaired: this.buildStats.repaired,
    } });
  }

  private trackNight(outcome: 'survived' | 'hp' | 'vault'): void {
    this.fps.flush();
    if (!this.trackSeason) return;
    const d = (k: 'contact' | 'arrows' | 'champion') => this.taken[k] - this.raidStart.taken[k];
    const buildings: Partial<Record<BuildingKey, number>> = {};
    for (const b of this.castle.buildings) buildings[b.id] = (buildings[b.id] ?? 0) + 1;
    let byBuildings = 0;
    for (const n of this.nightBuildingKills.values()) byBuildings += n;
    track({ type: 'night', report: {
      season: this.trackSeason, night: this.night + 1, outcome, seconds: Math.round(this.nightTime),
      hpPct: Math.max(0, Math.round((this.hp / this.maxHp) * 100)), vaultKept: Math.max(0, this.treasure), stolen: this.nightStolen,
      kills: this.nightKills, buildingKillPct: Math.round((byBuildings / Math.max(1, this.nightKills)) * 100), level: this.level, retries: this.retries,
      // Champion hits are also counted in contact damage; split them out so the shares add up.
      damage: { contact: Math.round(Math.max(0, d('contact') - d('champion'))), arrows: Math.round(d('arrows')), champion: Math.round(d('champion')) },
      buildings, destroyed: Math.max(0, this.raidStart.buildings - this.castle.buildings.length), grabs: this.nightGrabs, escapes: this.nightEscapes,
    } });
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
    if (champ && champ.night - 1 === this.night && this.nightTime >= champ.at) {
      this.nextChampion++;
      this.spawnChampion(this.nextChampion - 1, null);
      this.slowmo = Math.max(this.slowmo, 0.8);
      this.hooks.banner(`⚔️ ${champ.name} has joined the raid!`, champ.blurb);
    }
    // Captain Loot comes back after an escape, straight away once the timer has run out.
    if (this.bossReturn && (this.nightTime >= this.bossReturn.at || this.nightTime >= NIGHTS[this.night].duration)) {
      const hp = this.bossReturn.hp;
      this.bossReturn = null;
      const idx = CHAMPIONS.findIndex((c) => c.night - 1 === this.night);
      if (idx >= 0) { this.spawnChampion(idx, hp); this.hooks.banner(`${CHAMPIONS[idx].name} is back for more!`, 'Knock the gold out of him!'); }
    }

    if (t >= this.nextHeist) {
      this.nextHeist += TREASURE.heistEvery;
      // The crew picks the gate farthest from the boss, so guarding the vault means leaving it.
      const gate = [...this.gates].sort((a, b) => Math.hypot(b.x - this.x, b.z - this.z) - Math.hypot(a.x - this.x, a.z - this.z))[0];
      const size = Math.round((TREASURE.heistSize + t / TREASURE.heistGrowth) * this.difficulty.loot);
      for (let i = 0; i < size && this.heroes.length < RUN.maxHeroes; i++) {
        const h = this.addHero('rogue', gate.x + (Math.random() - 0.5) * 3, gate.z + (Math.random() - 0.5) * 3);
        if (i === 0) this.chatter.say(h, 'HEIST TIME!', 2.4, true);
      }
      sfx.steal();
      this.hooks.banner('HEIST CREW!', 'Rogues are sneaking in the far gate');
    }

    if (t >= this.nextSquad) {
      this.nextSquad += RUN.squadEvery;
      this.hooks.banner('A squad has queued up!', 'They are surrounding you!');
      sfx.horn();
      const kind: HeroKind = t > 240 ? 'knight' : t > 120 ? 'sweat' : 'noob';
      const size = Math.round(RUN.squadSize + t / RUN.squadGrowth);
      for (let i = 0; i < size && this.heroes.length < RUN.maxHeroes; i++) {
        const a = (i / size) * Math.PI * 2;
        const h = this.addHero(kind, this.x + Math.cos(a) * 15, this.z + Math.sin(a) * 15);
        if (i === 0) this.chatter.say(h, pick(LINES.squad), 2.4, true);
      }
    }

    const rate = Math.min(RUN.spawnCap, RUN.spawnBase + t * RUN.spawnRamp) * this.difficulty.spawn;
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.heroes.length >= RUN.maxHeroes) { this.spawnAcc = 0; break; }
      this.makeHero(this.pickKind());
    }
  }

  /** Brings in a boss hero; `hp` carries over the health of one returning after an escape. */
  private spawnChampion(idx: number, hp: number | null): Hero {
    const champ = CHAMPIONS[idx];
    const h = this.makeHero('champion');
    h.maxHp = HEROES.champion.hp * champ.hpMul * this.difficulty.hp;
    h.hp = hp ?? h.maxHp;
    h.tag = champ.name;
    h.final = champ.final === true;
    h.champ = idx;
    h.power = champ.power;
    h.powerT = 2;
    h.power2T = 4;
    if (champ.power === 'heist') h.goal = 'loot';
    h.label = this.makeLabel(champ.name, true);
    this.chatter.say(h, CHAMPION_LINES[idx] ?? CHAMPION_LINES[0], 2.4 * h.def.scale + 0.6, true);
    this.addAura(h);
    this.champions.push(h);
    sfx.horn();
    return h;
  }

  private addAura(h: Hero): void {
    h.aura = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.8, 32), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    h.aura.rotation.x = -Math.PI / 2;
    this.world.scene.add(h.aura);
  }

  /** Name of tonight's boss hero while it still has to be beaten, or null. */
  bossToBeat(): string | null {
    const c = CHAMPIONS.find((x) => x.night - 1 === this.night);
    return c && !c.final && !this.bossBeaten ? c.name : null;
  }

  private pickKind(): HeroKind {
    let band = WAVES[0];
    for (const w of WAVES) if (this.time >= w.from) band = w;
    const entries = Object.entries(band.mix) as [HeroKind, number][];
    for (const c of COUNTERS) if (this.night >= c.from) entries.push([c.kind, c.weight * (this.counterBoost.get(c.kind) ?? 1)]);
    let roll = Math.random() * entries.reduce((s, [, n]) => s + n, 0);
    for (const [k, n] of entries) { roll -= n; if (roll <= 0) return k; }
    return 'noob';
  }

  /** Heroes march in through the castle gates, spread across the gateway. */
  private makeHero(kind: HeroKind): Hero {
    const g = this.gates[Math.floor(Math.random() * this.gates.length)];
    const len = Math.hypot(g.x, g.z) || 1;
    const side = (Math.random() - 0.5) * 3;
    const back = Math.random() * 2;
    return this.addHero(kind, g.x - (g.z / len) * side + (g.x / len) * back, g.z + (g.x / len) * side + (g.z / len) * back);
  }

  private lootShare(): number {
    if (this.night === 0 && this.nightTime < TREASURE.graceSeconds) return 0;
    return Math.min(TREASURE.lootShareCap, TREASURE.lootShareBase + this.time * TREASURE.lootShareRamp) * this.difficulty.loot;
  }

  /** How much tougher heroes are right now, including the difficulty tier. */
  private heroToughness(): number {
    return (1 + this.time / RUN.hpGrowthPeriod) * NIGHT_TOUGHNESS[Math.min(this.night, NIGHT_TOUGHNESS.length - 1)] * this.difficulty.hp;
  }

  private addHero(kind: HeroKind, x: number, z: number): Hero {
    const def = HEROES[kind];
    const hp = def.hp * this.heroToughness();
    const h: Hero = {
      kind, def, x, z, hp, maxHp: hp, kx: 0, kz: 0, cd: Math.random() * (def.ranged?.cooldown ?? def.heal?.cooldown ?? 1),
      dashT: 0, dashCd: Math.random() * 3, flash: 0, face: 0, phase: Math.random() * 6, alive: true, batCd: 0, trapCd: 0,
      y: 0, vy: 0, air: false, spin: 0,
      tag: null, label: null, final: false, aura: null,
      variant: Math.random() < 0.5 ? 0 : 1, champ: 0, turn: x < this.x ? 1 : -1,
      action: kind === 'archer' ? 'shoot' : kind === 'healer' ? 'raise' : 'swing', actT: 0, actDur: 0.4, hitT: 0,
      goal: def.saboteur ? 'sabotage' : kind === 'rogue' ? 'loot' : kind !== 'champion' && !def.flying && !def.shield && Math.random() < this.lootShare() ? 'loot' : 'boss',
      carry: 0, grabT: 0, slowT: 0, iceT: 0, power: null, powerT: 0, power2T: 0, guard: 0, look: null, decoy: false,
      shield: def.shield === true, target: null, workT: 0, bossLaunch: false, lastHit: 'boss',
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
    if (h.label) { h.label.remove(); if (h.kind !== 'champion' && !h.decoy) this.labels--; h.label = null; }
    if (h.aura) { this.world.scene.remove(h.aura); h.aura = null; }
  }

  private updateHeroes(dt: number): void {
    const dmgScale = (1 + this.time / 400) * this.difficulty.damage;
    const decay = Math.exp(-8 * dt);
    let contact = 0;
    const rally = this.champions.some((c) => c.power === 'rally' || (c.power === 'chosen' && c.hp < c.maxHp * 0.66));
    this.updateVolleys(dt, dmgScale);
    for (const h of this.heroes) {
      if (!h.alive) continue;
      const def = h.def;
      h.flash = Math.max(0, h.flash - dt);
      h.batCd -= dt;
      h.trapCd -= dt;
      h.actT = Math.max(0, h.actT - dt);
      h.hitT = Math.max(0, h.hitT - dt);
      if (h.air) { this.fly(h, dt); continue; }
      if (h.iceT > 0) {
        // Frozen solid: no walking, stealing or fighting, but a hit still slides the ice block.
        h.iceT -= dt;
        const px = h.x, pz = h.z;
        h.x += h.kx * dt; h.z += h.kz * dt;
        [h.x, h.z] = this.castle.collide(h.x, h.z, px, pz);
        h.kx *= decay; h.kz *= decay;
        continue;
      }
      if (h.power) this.championPower(h, dt);
      if (h.goal === 'loot' && this.heist(h, dt, decay)) continue;
      if (h.goal === 'sabotage' && this.sabotage(h, dt, decay)) continue;
      let dx = this.x - h.x, dz = this.z - h.z;
      const d = Math.hypot(dx, dz) || 0.001;
      dx /= d; dz /= d;
      h.face = Math.atan2(dx, dz);
      // Heroes always look at the boss; the dead zone stops them flip-flopping when directly above or below it.
      if (Math.abs(dx) > 0.2) h.turn = approach(h.turn, Math.sign(dx), dt * 6);

      // Heroes far behind the camera teleport ahead instead of being lost forever.
      if (d > RUN.spawnRadius * 2.2 && h.kind !== 'champion') {
        const a = Math.atan2(-dz, -dx) + (Math.random() - 0.5);
        h.x = this.x - Math.cos(a) * RUN.spawnRadius; h.z = this.z - Math.sin(a) * RUN.spawnRadius;
        continue;
      }

      let speed = def.speed * (rally && h.kind === 'noob' ? CHAMPION_POWERS.rally.noobSpeed : 1);
      let mx = dx, mz = dz;
      // Beyond arm's reach, heroes follow the castle's walkable path to the boss instead of walking into walls.
      if (d > 3 && !def.flying) { const st = this.castle.steer('boss', h.x, h.z); if (st) { mx = st[0]; mz = st[1]; } }
      if (h.slowT > 0) { h.slowT -= dt; speed *= CASTLE.spikeSlow; }
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
      if (def.ranged && (h.kind !== 'champion' || CHAMPIONS[h.champ]?.shoots !== false)) {
        h.cd -= dt;
        if (h.cd <= 0 && d < def.ranged.range) {
          h.cd = def.ranged.cooldown * (0.8 + Math.random() * 0.4);
          if (h.kind === 'champion' && Math.random() < 0.5) {
            for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; this.enemyShot(h, Math.cos(a), Math.sin(a), def.ranged.damage * dmgScale, def.ranged.speed * 0.7); }
          } else this.enemyShot(h, dx, dz, def.ranged.damage * dmgScale, def.ranged.speed);
          this.act(h, h.kind === 'champion' ? 'swing' : 'shoot', 0.45);
        }
      }
      if (def.heal) {
        h.cd -= dt;
        if (h.cd <= 0) {
          h.cd = def.heal.cooldown;
          const amt = def.heal.amount * this.heroToughness();
          this.near(h.x, h.z, def.heal.range, (o) => { if (o !== h && o.hp < o.maxHp) { o.hp = Math.min(o.maxHp, o.hp + amt); this.fx.burst(o.x, 1.2, o.z, 0x7dffb0, 2, 2, 0.15); } });
          this.fx.burst(h.x, 1.6, h.z, 0x7dffb0, 4, 2, 0.14);
          this.act(h, 'raise', 0.6);
        }
      }

      h.phase += dt * speed * 2.2;
      const px = h.x, pz = h.z;
      h.x += (mx * speed + h.kx) * dt;
      h.z += (mz * speed + h.kz) * dt;
      if (!def.flying) [h.x, h.z] = this.castle.collide(h.x, h.z, px, pz);
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
        if (h.actT <= 0 && !def.ranged && !def.heal && Math.random() < dt * 2.5) this.act(h, 'swing', 0.38);
        if (h.kind === 'champion') this.taken.champion += def.dps * dmgScale * dt;
      }
    }
    if (contact > 0) {
      const dealt = Math.min(contact, (RUN.contactCap + this.time / RUN.contactGrowth) * this.difficulty.damage) * dt;
      this.taken.contact += dealt;
      this.hurtBoss(dealt);
    }
  }

  // ---------- Treasure ----------

  /**
   * Moves a hero who is after the gold: to the vault, grab, then to the nearest gate.
   * Returns false when the vault is empty and the hero should fight the boss instead.
   */
  private heist(h: Hero, dt: number, decay: number): boolean {
    let tx = 0, tz = 0;
    if (h.carry === 0) {
      if (this.treasure <= 0) { h.goal = 'boss'; return false; }
    } else {
      let best = Infinity;
      for (const g of this.gates) { const gd = Math.hypot(g.x - h.x, g.z - h.z); if (gd < best) { best = gd; tx = g.x; tz = g.z; } }
    }
    let dx = tx - h.x, dz = tz - h.z;
    const d = Math.hypot(dx, dz) || 0.001;
    dx /= d; dz /= d;
    const st = this.castle.steer(h.carry === 0 ? 'vault' : 'gates', h.x, h.z);
    if (st && d > 1.5) { dx = st[0]; dz = st[1]; }
    h.face = Math.atan2(dx, dz);
    if (Math.abs(dx) > 0.2) h.turn = approach(h.turn, Math.sign(dx), dt * 6);

    if (h.carry === 0 && d < TREASURE.vaultRadius + h.def.radius) {
      // Stuffing the sack: stand still, arm raised, for grabTime.
      h.grabT += dt;
      if (h.actT <= 0) this.act(h, 'raise', 0.4);
      if (h.grabT >= TREASURE.grabTime) {
        h.grabT = 0;
        this.nightGrabs++;
        h.carry = Math.min(h.power === 'heist' ? CHAMPION_POWERS.heist.carry : TREASURE.carry, Math.max(0, this.treasure));
        this.treasure -= h.carry;
        sfx.steal();
        if (!this.warnedThief) {
          this.warnedThief = true;
          // The first grab of a season slows time so the player sees who has the gold.
          this.slowmo = 1.4;
          this.world.addShake(0.3);
          this.hooks.banner('STOP HIM! 💰', 'He has your gold! Hit him before he reaches a gate.');
        }
        if (Math.random() < 0.3) this.chatter.say(h, pick(LINES.grab), 2.4 * h.def.scale);
      }
    } else if (h.carry > 0 && d < TREASURE.escapeDistance) {
      this.escape(h);
      return true;
    } else {
      let speed = h.def.speed * (h.carry > 0 ? (h.power === 'heist' ? CHAMPION_POWERS.heist.getaway : this.getaway()) : 1);
      if (h.slowT > 0) { h.slowT -= dt; speed *= CASTLE.spikeSlow; }
      h.phase += dt * speed * 2.2;
      const px = h.x, pz = h.z;
      h.x += (dx * speed + h.kx) * dt;
      h.z += (dz * speed + h.kz) * dt;
      [h.x, h.z] = this.castle.collide(h.x, h.z, px, pz);
    }
    h.kx *= decay; h.kz *= decay;
    this.near(h.x, h.z, h.def.radius, (o, ox, oz, od) => {
      if (o === h || od < 0.0001) return;
      const push = (h.def.radius + o.def.radius - od) * 0.5;
      if (push > 0) { h.x -= (ox / od) * push; h.z -= (oz / od) * push; }
    });
    // Thieves still bump into the boss, but they do not stop to fight.
    const bx = h.x - this.x, bz = h.z - this.z;
    const bd = Math.hypot(bx, bz) || 0.001;
    const touch = this.radius + h.def.radius;
    if (bd < touch) { h.x = this.x + (bx / bd) * touch; h.z = this.z + (bz / bd) * touch; }
    return true;
  }

  /**
   * Trap Nerds walk to the nearest working trap and disarm it; Sappers walk to the nearest building and
   * blow it up. With nothing left to sabotage they fight the boss. Returns false to fall back to that.
   */
  private sabotage(h: Hero, dt: number, decay: number): boolean {
    const jam = h.def.saboteur === 'jam';
    const valid = (b: Building | null) => !!b && this.castle.buildings.includes(b) && (!jam || (b.id !== 'wall' && b.jammed <= 0));
    if (!valid(h.target)) {
      h.target = null; h.workT = 0;
      let best = Infinity;
      for (const b of this.castle.buildings) {
        if (!valid(b)) continue;
        const [bx, bz] = this.castle.center(b.cx, b.cz);
        const d = Math.hypot(bx - h.x, bz - h.z);
        if (d < best) { best = d; h.target = b; }
      }
      if (!h.target) { h.goal = 'boss'; return false; }
    }
    const b = h.target as Building;
    const [tx, tz] = this.castle.center(b.cx, b.cz);
    let dx = tx - h.x, dz = tz - h.z;
    const d = Math.hypot(dx, dz) || 0.001;
    dx /= d; dz /= d;
    if (Math.abs(dx) > 0.2) h.turn = approach(h.turn, Math.sign(dx), dt * 6);
    // Walls are solid, so "arrived" is anywhere touching the target's cell.
    if (d < CASTLE.cell * 0.9) {
      if (jam) {
        h.workT += dt;
        if (h.actT <= 0) this.act(h, 'swing', 0.35);
        if (Math.random() < dt * 6) this.fx.burst(tx, 0.6, tz, 0xffd23a, 2, 3, 0.1);
        if (h.workT >= SABOTAGE.jamWork) {
          b.jammed = SABOTAGE.jamFor;
          h.workT = 0; h.target = null;
          this.fx.burst(tx, 0.8, tz, 0x9aa4b1, 12, 5, 0.18);
          this.hooks.killfeed(`🔧 A Trap Nerd disarmed your ${BUILDINGS[b.id].name}!`);
        }
      } else {
        this.explode(h, tx, tz);
      }
    } else {
      let speed = h.def.speed;
      if (h.slowT > 0) { h.slowT -= dt; speed *= CASTLE.spikeSlow; }
      h.phase += dt * speed * 2.2;
      const px = h.x, pz = h.z;
      const st = this.castle.steer('vault', h.x, h.z);
      // Head for the target, but follow the castle's paths when a wall is in the way.
      const mx = this.castle.isBlocked(h.x + dx * 1.2, h.z + dz * 1.2) && st && d > CASTLE.cell * 1.5 ? st[0] : dx;
      const mz = this.castle.isBlocked(h.x + dx * 1.2, h.z + dz * 1.2) && st && d > CASTLE.cell * 1.5 ? st[1] : dz;
      h.x += (mx * speed + h.kx) * dt;
      h.z += (mz * speed + h.kz) * dt;
      [h.x, h.z] = this.castle.collide(h.x, h.z, px, pz);
    }
    h.kx *= decay; h.kz *= decay;
    const bx = h.x - this.x, bz = h.z - this.z;
    const bd = Math.hypot(bx, bz) || 0.001;
    const touch = this.radius + h.def.radius;
    if (bd < touch) { h.x = this.x + (bx / bd) * touch; h.z = this.z + (bz / bd) * touch; }
    return true;
  }

  /** A sapper's bomb: damages every building nearby, destroys the ones it breaks, and takes the sapper with it. */
  private explode(h: Hero, x: number, z: number): void {
    let broke = 0;
    for (const b of [...this.castle.buildings]) {
      const [bx, bz] = this.castle.center(b.cx, b.cz);
      if (Math.hypot(bx - x, bz - z) > SABOTAGE.sapRadius) continue;
      b.hp -= SABOTAGE.sapDamage;
      if (b.hp <= 0) { this.castle.remove(b); broke++; this.fx.burst(bx, 0.8, bz, 0xc08a4c, 16, 7, 0.24); }
    }
    this.fx.ring(x, z, SABOTAGE.sapRadius, 0xff9a1a, 0.35);
    this.fx.burst(x, 1, z, 0x2a2a2a, 20, 8, 0.25);
    this.world.addShake(0.35);
    sfx.stomp();
    if (broke) this.hooks.killfeed(`💥 A Sapper blew up ${broke} of your buildings!`);
    h.lastHit = 'boss';
    h.hp = 0;
    this.kill(h);
  }

  /** Gold to fix every damaged building: half the price of the missing health. */
  repairCost(): number {
    let c = 0;
    for (const b of this.castle.buildings) c += (1 - b.hp / b.maxHp) * BUILDINGS[b.id].cost * SABOTAGE.repairShare;
    return Math.ceil(c);
  }

  /** Gold that building and repairs may use: all but the last coin. */
  spendable(): number {
    return Math.max(0, this.treasure - 1);
  }

  repairAll(): boolean {
    const cost = this.repairCost();
    if (this.phase !== 'build' || cost <= 0 || cost > this.spendable()) return false;
    this.treasure -= cost;
    this.buildStats.spent += cost;
    this.buildStats.repaired = true;
    for (const b of this.castle.buildings) b.hp = b.maxHp;
    sfx.repair();
    return true;
  }

  /** Each boss hero's signature move; the Chosen One gains more of them as his health drops. */
  private championPower(h: Hero, dt: number): void {
    const P = CHAMPION_POWERS;
    h.powerT -= dt;
    h.power2T -= dt;
    h.guard = Math.max(0, h.guard - dt);
    const ratio = h.hp / h.maxHp;
    const rally = h.power === 'rally' || (h.power === 'chosen' && ratio < 0.66);
    const volley = h.power === 'volley' || (h.power === 'chosen' && ratio < 0.33);
    if (rally && h.powerT <= 0) {
      h.powerT = P.rally.every;
      for (let i = 0; i < P.rally.squad && this.heroes.length < RUN.maxHeroes; i++) {
        const a = (i / P.rally.squad) * Math.PI * 2;
        const n = this.addHero('noob', h.x + Math.cos(a) * 2.5, h.z + Math.sin(a) * 2.5);
        n.goal = 'boss';
      }
      this.chatter.say(h, 'SQUAD, ATTACK!', 2.4 * h.def.scale + 0.6, true);
      this.fx.ring(h.x, h.z, 3, 0x2f7dff, 0.4);
    }
    if (volley && (h.power === 'volley' ? h.powerT : h.power2T) <= 0) {
      if (h.power === 'volley') h.powerT = P.volley.every; else h.power2T = P.volley.every + 1;
      for (let i = 0; i < P.volley.count; i++) {
        const a = Math.random() * Math.PI * 2, d = i === 0 ? 0 : 2 + Math.random() * 4;
        this.volleys.push({ x: this.x + Math.cos(a) * d, z: this.z + Math.sin(a) * d, t: P.volley.warn, ring: 0 });
      }
      this.act(h, 'shoot', 0.45);
    }
    if (h.power === 'guard' && h.powerT <= 0) {
      h.powerT = P.guard.up + P.guard.down;
      h.guard = P.guard.up;
    }
    if (h.power === 'guard') {
      if (h.guard > 0 && Math.random() < dt * 5) this.fx.ring(h.x, h.z, 1.9, 0xffd23a, 0.25);
      // The moment the shield drops, he charges.
      if (h.guard > 0 && h.guard - dt <= 0 && h.def.dash) { h.dashT = h.def.dash.duration * 1.6; h.dashCd = h.def.dash.cooldown; }
    }
    if (h.power === 'clones' && h.powerT <= 0) {
      h.powerT = P.clones.every;
      const fakes: Hero[] = [];
      for (let i = 0; i < P.clones.count && this.heroes.length < RUN.maxHeroes; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = this.addHero('sweat', h.x + Math.cos(a) * 3, h.z + Math.sin(a) * 3);
        d.def = DECOY; d.decoy = true; d.look = 'clutch'; d.goal = 'boss'; d.carry = 0;
        d.hp = d.maxHp = HEROES.champion.hp * P.clones.hp * this.difficulty.hp;
        d.tag = h.tag; d.label = h.tag ? this.makeLabel(h.tag, true) : null;
        this.addAura(d);
        fakes.push(d);
        this.fx.burst(d.x, 1.5, d.z, 0x7a2cff, 14, 6, 0.22);
      }
      // Swap places with a fake so the player loses track of the real one.
      const swap = fakes[Math.floor(Math.random() * fakes.length)];
      if (swap) { [h.x, swap.x] = [swap.x, h.x]; [h.z, swap.z] = [swap.z, h.z]; }
      this.chatter.say(h, 'Which one is real? 😏', 2.4 * h.def.scale + 0.6, true);
    }
    if ((h.power === 'mend' && h.powerT <= 0) || (h.power === 'chosen' && ratio < 0.33 && h.powerT <= 0)) {
      h.powerT = P.mend.every * (h.power === 'chosen' ? 2 : 1);
      this.fx.ring(h.x, h.z, P.mend.radius, 0x7dffb0, 0.5);
      this.near(h.x, h.z, P.mend.radius, (o) => {
        if (o === h || o.hp >= o.maxHp) return;
        o.hp = Math.min(o.maxHp, o.hp + o.maxHp * P.mend.share);
        this.fx.burst(o.x, 1.2, o.z, 0x7dffb0, 2, 2, 0.15);
      });
      this.act(h, 'raise', 0.6);
    }
  }

  /** Arrow volleys: a red circle warns, then the arrows land and hurt the boss if it is still inside. */
  private updateVolleys(dt: number, dmgScale: number): void {
    const V = CHAMPION_POWERS.volley;
    for (let i = this.volleys.length - 1; i >= 0; i--) {
      const v = this.volleys[i];
      v.t -= dt; v.ring -= dt;
      if (v.ring <= 0 && v.t > 0) { v.ring = 0.25; this.fx.ring(v.x, v.z, V.radius, 0xff3d5a, 0.25); }
      if (v.t > 0) continue;
      this.volleys.splice(i, 1);
      this.fx.burst(v.x, 0.4, v.z, 0x8a5a2b, 12, 6, 0.18);
      this.flash('boom', v.x, 0.2, v.z, 1.4, 0.15);
      if (Math.hypot(this.x - v.x, this.z - v.z) < V.radius + this.radius * 0.5) {
        const dmg = V.damage * dmgScale;
        this.hurtBoss(dmg);
        // Counted with contact damage, as champion hits are, so the damage shares still add up.
        this.taken.champion += dmg;
        this.taken.contact += dmg;
      }
    }
  }

  /** Speed of a thief carrying gold: slow on the learning nights, then the tier's own. */
  private getaway(): number {
    return this.night < TREASURE.slowNights ? Math.min(TREASURE.earlyGetaway, this.difficulty.getaway) : this.difficulty.getaway;
  }

  private escape(h: Hero): void {
    h.alive = false;
    if (h.kind === 'champion') {
      // A boss hero that gets away comes back later; the night still waits for him.
      this.champions = this.champions.filter((c) => c !== h);
      this.bossReturn = { at: this.nightTime + CHAMPION_POWERS.heist.back, hp: h.hp };
    }
    this.stolen += h.carry;
    this.nightStolen += h.carry;
    this.nightEscapes++;
    const tag = h.tag ?? gamerTag();
    this.escapes.push({ tag, gold: h.carry, kind: h.kind });
    this.hooks.killfeed(`💰 ${tag} escaped with ${h.carry} gold!`);
    this.chatter.say({ x: h.x, z: h.z, alive: false }, pick(LINES.escaped), 2.4 * h.def.scale, true);
    sfx.escape();
    this.dropExtras(h);
  }

  /** Knocks the gold out of a thief's sack; it bounces for a moment, then flies home. */
  private spill(h: Hero, count: number): void {
    const n = Math.min(count, h.carry);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.spills.push({ x: h.x, z: h.z, y: 1.2, vx: Math.cos(a) * 3, vz: Math.sin(a) * 3, vy: 5 + Math.random() * 2, t: 0, sx: 0, sz: 0 });
    }
    this.fx.burst(h.x, 1.4, h.z, 0xffd23a, 10, 5, 0.18);
    this.fx.number(h.x, 2.8, h.z, n, true, '#ffd23a');
    sfx.coin();
    h.carry -= n;
  }

  private updateSpills(dt: number): void {
    for (let i = this.spills.length - 1; i >= 0; i--) {
      const c = this.spills[i];
      c.t += dt;
      if (c.t < TREASURE.returnDelay) {
        c.vy -= 20 * dt;
        c.x += c.vx * dt; c.z += c.vz * dt; c.y += c.vy * dt;
        if (c.y < 0.3) { c.y = 0.3; c.vy = Math.abs(c.vy) * 0.45; c.vx *= 0.6; c.vz *= 0.6; }
        c.sx = c.x; c.sz = c.z;
        continue;
      }
      // Arc home: ease across to the vault over 0.6s with a hop.
      const k = Math.min(1, (c.t - TREASURE.returnDelay) / 0.6);
      const e = k * k * (3 - 2 * k);
      c.x = c.sx * (1 - e);
      c.z = c.sz * (1 - e);
      c.y = 0.6 + Math.sin(k * Math.PI) * 3;
      if (k >= 1) {
        this.treasure += 1;
        this.spills.splice(i, 1);
        sfx.coin();
      }
    }
  }

  private act(h: Hero, action: Action, dur: number): void {
    h.action = action;
    h.actT = h.actDur = dur;
  }

  private enemyShot(h: Hero, dx: number, dz: number, dmg: number, speed: number): void {
    if (this.shots.length >= MAX_SHOTS) return;
    this.shots.push({ x: h.x, z: h.z, vx: dx * speed, vz: dz * speed, life: 2.2, dmg, pierce: 1, hit: null, enemy: true });
  }

  private hurtBoss(amount: number): void {
    this.hp -= amount;
    this.nightDamage += amount;
    if (this.hurt <= 0.05) sfx.hurt();
    this.hurt = 0.2;
    // The "ouch" face is rationed: under constant contact damage it would otherwise never leave.
    if (this.ouchCd <= 0) { this.ouch = 0.35; this.ouchCd = 1.4; }
  }

  /**
   * `src` is the boss (its upgrades, frenzy and crits apply) or a building type (flat damage, so traps
   * do not grow with the boss's build). Shieldbearers ignore buildings until the boss breaks the shield.
   */
  damage(h: Hero, base: number, kx = 0, kz = 0, src: 'boss' | BuildingId = 'boss'): void {
    if (!h.alive) return;
    if (src !== 'boss' && h.shield) {
      if (Math.random() < 0.2) this.fx.burst(h.x, 1.4, h.z, 0xdfe6ee, 3, 3, 0.12);
      return;
    }
    if (src === 'boss' && h.shield) {
      h.shield = false;
      this.fx.burst(h.x, 1.4, h.z, 0xd8263a, 14, 6, 0.22);
      this.fx.number(h.x, 2.6 * h.def.scale, h.z, 0, true, '#ffd23a');
      sfx.stomp();
    }
    const crit = src === 'boss' && Math.random() < 0.1;
    const dmg = (src === 'boss' ? base * this.dmgMul * (this.frenzy > 0 ? 1.5 : 1) * (crit ? 2 : 1) * (h.iceT > 0 ? FROST.shatter : 1) : base) * (h.guard > 0 ? CHAMPION_POWERS.guard.taken : 1);
    h.lastHit = src;
    h.hp -= dmg;
    h.flash = 0.1;
    h.hitT = 0.22;
    if (h.carry > 0) this.spill(h, h.hp <= 0 ? h.carry : TREASURE.knockOut);
    // Champions shrug off most knockback so they stay threatening.
    const kb = h.kind === 'champion' ? 0.15 : h.kind === 'knight' ? 0.5 : 1;
    h.kx += kx * kb; h.kz += kz * kb;
    if (!h.air && h.kind !== 'champion' && !h.def.flying && Math.hypot(h.kx, h.kz) > PHYSICS.launchAt) this.launch(h, 0, src === 'boss');
    this.fx.number(h.x, 1.8 * h.def.scale, h.z, dmg, crit);
    sfx.hit();
    if (h.kind === 'champion') this.rage = Math.min(RUN.rageMax, this.rage + dmg * 0.02);
    if (h.hp <= 0) this.kill(h);
  }

  private kill(h: Hero): void {
    h.alive = false;
    this.kills++;
    this.nightKills++;
    if (h.lastHit !== 'boss') this.nightBuildingKills.set(h.lastHit, (this.nightBuildingKills.get(h.lastHit) ?? 0) + 1);
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
    if (this.paper && this.paper.corpses.length < 80) {
      this.paper.corpses.push({ x: h.x, z: h.z, y: h.y, cast: this.castIndex(h), face: h.turn, size: this.standeeSize(h), born: this.time, spin: Math.random() < 0.5 ? -1 : 1, seed: h.phase });
    }
    if (Math.random() < 0.05 && this.chatter.busy < 3) this.chatter.say({ x: h.x, z: h.z, alive: false }, pick(LINES.defeated), 2.2 * h.def.scale);
    if (h.kind === 'champion') {
      this.championsBeaten++;
      this.bossBeaten = true;
      this.champions = this.champions.filter((c) => c !== h);
      // The fakes vanish with the real one.
      for (const d of this.heroes) if (d.decoy && d.alive) { d.alive = false; this.dropExtras(d); this.fx.burst(d.x, 1.5, d.z, 0x7a2cff, 16, 6, 0.22); }
      this.chestReward = CHAMPIONS[h.champ]?.chest ?? { gold: 0, levels: 0 };
      this.world.addShake(0.8);
      this.fx.burst(h.x, 1.5, h.z, 0xffd23a, 60, 12, 0.3);
      if (h.final) { this.finish(true, 'win'); return; }
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
    // Harder tiers spawn more heroes; dividing keeps that from also handing out more XP.
    const value = h.def.xp / this.difficulty.spawn;
    if (this.gems.length >= RUN.maxGems) {
      const g = this.gems[Math.floor(Math.random() * this.gems.length)];
      if (g.snack) return;
      g.value += value; g.tier = Math.min(2, g.tier + (g.value > 6 ? 1 : 0));
    } else {
      this.gems.push({ x: h.x, z: h.z, value, tier: value >= 3 ? 2 : value >= 2 ? 1 : 0, pulled: false, spin: Math.random() * 6 });
    }
  }

  // ---------- Physics ----------

  /** Only launches the boss causes feed the combo; trap launches still bowl heroes over. */
  private launch(h: Hero, lift = 0, byBoss = true): void {
    h.air = true;
    h.bossLaunch = byBoss;
    h.shield = false;
    h.vy = 5 + Math.hypot(h.kx, h.kz) * 0.35 + lift;
    h.y = Math.max(h.y, 0.05);
    if (Math.random() < 0.06 && this.chatter.busy < 3) this.chatter.say(h, pick(LINES.launched), 2.4 * h.def.scale);
  }

  private fly(h: Hero, dt: number): void {
    h.vy -= PHYSICS.gravity * dt;
    h.y += h.vy * dt;
    const px = h.x, pz = h.z;
    h.x += h.kx * dt;
    h.z += h.kz * dt;
    // High flyers sail over walls; low ones bounce off them.
    if (h.y < 1.2) [h.x, h.z] = this.castle.collide(h.x, h.z, px, pz);
    h.spin += dt * 14;
    const speed = Math.hypot(h.kx, h.kz);
    if (h.y < 2.5 && speed > 3) {
      this.near(h.x, h.z, h.def.radius, (o, ox, oz, od) => {
        if (o === h || o.air || !h.alive) return;
        const crash = (PHYSICS.crashDamage + speed * PHYSICS.crashPerSpeed);
        if (o.kind === 'champion') { this.damage(o, crash, 0, 0, h.bossLaunch ? 'boss' : 'pad'); h.kx *= -0.3; h.kz *= -0.3; return; }
        // Pass momentum along, fanned out a little, so a hit turns into a bowling strike.
        const n = od || 1;
        const t = PHYSICS.transfer;
        o.kx = h.kx * t + (ox / n) * speed * 0.35;
        o.kz = h.kz * t + (oz / n) * speed * 0.35;
        this.launch(o, 0, h.bossLaunch);
        h.kx *= 0.8; h.kz *= 0.8;
        if (h.bossLaunch) this.addCombo(o);
        else this.comboT = Math.max(this.comboT, 0.5);
        this.damage(o, crash, 0, 0, h.bossLaunch ? 'boss' : 'pad');
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
      if (fired && (id === 'fireball' || id === 'stomp' || id === 'minions')) this.bossActT = 0.4;
    }
    this.updateBats(dt);
    this.updateLava(dt);
    this.updateTraps(dt);
    this.updateTwisters(dt);
    this.updateBoomerangs(dt);
    this.updateFlashes(dt);
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
        const chains = level >= CHAIN.fromLevel ? 1 + (level >= MAX_LEVEL ? CHAIN.extraAtMax : 0) : 0;
        for (let k = 0; k < n && pool.length; k++) {
          const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
          const tx = t.x, tz = t.z;
          this.strike(tx, tz, true);
          this.damage(t, dmg);
          this.near(tx, tz, 1.4, (h) => { if (h !== t) this.damage(h, dmg * 0.5); });
          // The bolt jumps on to the nearest heroes it has not hit yet.
          let from = t;
          const hit = new Set<Hero>([t]);
          for (let c = 0; c < chains; c++) {
            let next: Hero | null = null, best = Infinity;
            this.near(from.x, from.z, CHAIN.range, (h, _dx, _dz, d) => { if (!hit.has(h) && d < best) { best = d; next = h; } });
            const to = next as Hero | null;
            if (!to) break;
            hit.add(to);
            this.arc(from.x, from.z, to.x, to.z);
            this.strike(to.x, to.z, false);
            this.damage(to, dmg * CHAIN.share);
            from = to;
          }
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
      case 'frost': {
        const r = n + this.radius * 0.5;
        this.fx.ring(this.x, this.z, r, 0x9fe6ff, 0.45);
        this.fx.burst(this.x, 0.6, this.z, 0xcff4ff, 16, 7, 0.2);
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + Math.random() * 0.3;
          this.flash('flake', this.x + Math.cos(a) * 1.5, 1 + Math.random(), this.z + Math.sin(a) * 1.5, 0.9, 0.5, Math.cos(a) * r * 1.8, Math.sin(a) * r * 1.8);
        }
        sfx.freeze();
        const freeze = FROST.freeze[level - 1];
        this.near(this.x, this.z, r, (h) => {
          this.damage(h, dmg);
          if (!h.alive || h.air) return;
          if (h.kind === 'champion') h.slowT = Math.max(h.slowT, FROST.champSlow);
          else { h.iceT = freeze; h.dashT = 0; h.grabT = 0; }
        });
        return true;
      }
      case 'tornado': {
        const aim = this.nearest(1, 18)[0];
        const base = aim ? Math.atan2(aim.z - this.z, aim.x - this.x) : Math.random() * Math.PI * 2;
        for (let k = 0; k < n; k++) {
          const a = base + (k - (n - 1) / 2) * 1.2;
          this.twisters.push({ x: this.x + Math.cos(a) * 2, z: this.z + Math.sin(a) * 2, vx: Math.cos(a) * TORNADO.speed, vz: Math.sin(a) * TORNADO.speed, life: TORNADO.life, tick: 0, dmg, seed: Math.random() * 6 });
        }
        sfx.whirl();
        return true;
      }
      case 'boomerang': {
        const targets = this.nearest(n, 14);
        if (!targets.length) return false;
        for (let k = 0; k < n; k++) {
          const t = targets[k % targets.length];
          const a = Math.atan2(t.z - this.z, t.x - this.x) + (k >= targets.length ? (k - targets.length + 1) * 0.5 : 0);
          this.booms.push({ x: this.x, z: this.z, vx: Math.cos(a) * BOOMERANG.speed, vz: Math.sin(a) * BOOMERANG.speed, t: 0, back: false, dmg, hit: new Set() });
        }
        sfx.swish();
        return true;
      }
      default:
        return false;
    }
  }

  /** A lightning strike: in paper style a cutout bolt under a storm cloud, otherwise the plain bolt. */
  private strike(x: number, z: number, big: boolean): void {
    if (!this.paper) { this.fx.bolt(x, z); return; }
    const cell = (['bolt0', 'bolt1', 'bolt2'] as const)[Math.floor(Math.random() * 3)];
    const h = big ? 6.5 : 3.6;
    this.flash(cell, x, 0, z, h, 0.24, 0, 0, Math.random() < 0.5 ? -1 : 1);
    if (big) this.flash('cloud', x, h - 0.9, z - 0.2, 3.2, 0.45);
    this.fx.burst(x, 0.3, z, 0xffe24a, big ? 10 : 5, 6, 0.2);
    this.fx.ring(x, z, big ? 1.8 : 1.1, 0xfff27a, 0.25);
    if (big) this.world.addShake(0.06);
  }

  /** Crackling sparks along a chain from one hero to the next. */
  private arc(x0: number, z0: number, x1: number, z1: number): void {
    const steps = Math.max(3, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.7));
    for (let i = 1; i < steps; i++) {
      const k = i / steps;
      this.fx.burst(x0 + (x1 - x0) * k + (Math.random() - 0.5) * 0.5, 1 + Math.random() * 0.6, z0 + (z1 - z0) * k + (Math.random() - 0.5) * 0.5, 0xfff27a, 1, 1.5, 0.2);
    }
  }

  private flash(cell: SpellId, x: number, y: number, z: number, size: number, life: number, vx = 0, vz = 0, face = 1): void {
    if (!this.paper || this.flashes.length > 160) return;
    this.flashes.push({ cell, x, y, z, vx, vz, w: size, h: size, life, max: life, roll: (Math.random() - 0.5) * 0.3, face });
  }

  private updateFlashes(dt: number): void {
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.life -= dt;
      f.x += f.vx * dt; f.z += f.vz * dt;
      f.vx *= 0.9; f.vz *= 0.9;
      if (f.life <= 0) this.flashes.splice(i, 1);
    }
  }

  /** Tornados drift toward heroes, pull everyone nearby into the middle, and fling whoever reaches it. */
  private updateTwisters(dt: number): void {
    for (let i = this.twisters.length - 1; i >= 0; i--) {
      const tw = this.twisters[i];
      tw.life -= dt;
      tw.tick -= dt;
      let best = Infinity, tx = 0, tz = 0;
      this.near(tw.x, tw.z, 9, (h, _dx, _dz, d) => { if (d < best && d > TORNADO.coreRadius) { best = d; tx = h.x; tz = h.z; } });
      if (best < Infinity) {
        const d = Math.hypot(tx - tw.x, tz - tw.z) || 1;
        tw.vx += ((tx - tw.x) / d * TORNADO.speed - tw.vx) * dt * 2;
        tw.vz += ((tz - tw.z) / d * TORNADO.speed - tw.vz) * dt * 2;
      }
      tw.x += tw.vx * dt; tw.z += tw.vz * dt;
      this.near(tw.x, tw.z, TORNADO.pullRadius, (h, dx, dz, d) => {
        if (h.air || h.kind === 'champion' || h.def.flying) return;
        const n = d || 1;
        // Pull in with a swirl; knockback decays fast, so this settles near the pull speed.
        h.kx += (-dx / n * TORNADO.pull - dz / n * TORNADO.pull * 0.5) * dt * 8;
        h.kz += (-dz / n * TORNADO.pull + dx / n * TORNADO.pull * 0.5) * dt * 8;
      });
      if (tw.tick <= 0) {
        tw.tick = TORNADO.hitEvery;
        this.near(tw.x, tw.z, TORNADO.coreRadius, (h) => {
          this.damage(h, tw.dmg);
          if (!h.alive || h.air || h.kind === 'champion' || h.def.flying) return;
          const a = Math.random() * Math.PI * 2;
          h.kx = Math.cos(a) * TORNADO.fling; h.kz = Math.sin(a) * TORNADO.fling;
          h.iceT = 0;
          this.launch(h, 6, true);
        });
        if (Math.random() < 0.5) this.fx.burst(tw.x, 0.3, tw.z, 0xb9c8da, 3, 4, 0.2);
      }
      if (tw.life <= 0) { this.fx.burst(tw.x, 1, tw.z, 0xdfe7f2, 12, 5, 0.25); this.twisters.splice(i, 1); }
    }
  }

  /** Boomerangs slow down on the way out, turn around, and come home, hitting each hero once per leg. */
  private updateBoomerangs(dt: number): void {
    for (let i = this.booms.length - 1; i >= 0; i--) {
      const b = this.booms[i];
      b.t += dt;
      if (!b.back && b.t >= BOOMERANG.out) { b.back = true; b.hit.clear(); }
      if (b.back) {
        const dx = this.x - b.x, dz = this.z - b.z, d = Math.hypot(dx, dz) || 1;
        b.vx = (dx / d) * BOOMERANG.back; b.vz = (dz / d) * BOOMERANG.back;
        if (d < this.radius || b.t > BOOMERANG.life) { this.booms.splice(i, 1); continue; }
      } else {
        const slow = 1 - (b.t / BOOMERANG.out) * 0.7;
        b.x += b.vx * slow * dt; b.z += b.vz * slow * dt;
      }
      if (b.back) { b.x += b.vx * dt; b.z += b.vz * dt; }
      const sp = Math.hypot(b.vx, b.vz) || 1;
      this.near(b.x, b.z, 0.9, (h) => {
        if (b.hit.has(h)) return;
        b.hit.add(h);
        this.damage(h, b.dmg, (b.vx / sp) * 5, (b.vz / sp) * 5);
      });
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

  private updateBuildings(dt: number): void {
    for (const b of this.castle.buildings) {
      b.cd -= dt;
      b.bounce = Math.max(0, b.bounce - dt * 4);
      if (b.jammed > 0) { b.jammed -= dt; continue; }
      const [x, z] = this.castle.center(b.cx, b.cz);
      switch (b.id) {
        case 'spikes':
          this.near(x, z, CASTLE.cell * 0.55, (h) => {
            if (h.air || h.def.flying) return;
            h.slowT = 0.3;
            if (h.trapCd > 0) return;
            h.trapCd = CASTLE.spikeEvery;
            this.damage(h, CASTLE.spikeDamage, 0, 0, 'spikes');
          });
          break;
        case 'pad':
          this.near(x, z, 0.9, (h) => {
            if (h.air || h.def.flying || h.kind === 'champion' || h.trapCd > 0) return;
            h.trapCd = 0.5;
            // Castle pads throw heroes back toward the gates, through whoever is following them in.
            let dx = h.x, dz = h.z;
            const d = Math.hypot(dx, dz) || 1;
            dx /= d; dz /= d;
            h.kx = dx * TRAPS.springPower; h.kz = dz * TRAPS.springPower;
            this.launch(h, 6, false);
            b.bounce = 1;
            this.damage(h, CASTLE.padDamage, 0, 0, 'pad');
          });
          break;
        case 'saw':
          this.near(x, z, TRAPS.sawRadius, (h, dx, dz, d) => {
            if (h.trapCd > 0 || h.def.flying) return;
            h.trapCd = TRAPS.sawHitEvery;
            const n = d || 1;
            this.damage(h, CASTLE.sawDamage, (-dz / n) * 8 + (dx / n) * 3, (dx / n) * 8 + (dz / n) * 3, 'saw');
            this.fx.burst(h.x, 0.6, h.z, 0xfff27a, 3, 4, 0.12);
          });
          break;
        case 'tower': {
          if (b.cd > 0) break;
          let target: Hero | null = null;
          let best = Infinity;
          this.near(x, z, CASTLE.towerRange, (h, _dx, _dz, d) => { if (!h.air && d < best) { best = d; target = h; } });
          const t = target as Hero | null;
          if (!t || this.shots.length >= MAX_SHOTS) break;
          b.cd = CASTLE.towerEvery;
          const dx = t.x - x, dz = t.z - z, len = Math.hypot(dx, dz) || 1;
          this.shots.push({ x, z, vx: (dx / len) * 18, vz: (dz / len) * 18, life: 0.9, dmg: CASTLE.towerDamage, pierce: 1, hit: new Set(), enemy: false, src: 'tower' });
          break;
        }
        default:
          break;
      }
    }
  }

  private updateShots(dt: number): void {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.life -= dt;
      s.x += s.vx * dt; s.z += s.vz * dt;
      if (!s.enemy && !s.src && Math.random() < 0.35) this.fx.burst(s.x, 1, s.z, Math.random() < 0.5 ? 0xff8a1a : 0xffd23a, 1, 1, 0.14);
      if (s.enemy) {
        if (Math.hypot(s.x - this.x, s.z - this.z) < this.radius) { this.hurtBoss(s.dmg); this.taken.arrows += s.dmg; s.life = 0; this.fx.burst(s.x, 1, s.z, 0xffffff, 3, 3, 0.12); }
      } else {
        this.near(s.x, s.z, 0.4, (h) => {
          if (s.hit?.has(h)) return;
          s.hit?.add(h);
          const sp = Math.hypot(s.vx, s.vz) || 1;
          this.damage(h, s.dmg, (s.vx / sp) * 5, (s.vz / sp) * 5, s.src ?? 'boss');
          this.fx.burst(s.x, 0.8, s.z, 0xff7a1a, 4, 4, 0.16);
          if (!s.src) this.flash('boom', s.x, 0.3, s.z, 1.7, 0.16);
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
      m.actT = Math.max(0, (m.actT ?? 0) - dt);
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
      if (Math.abs(dx / d) > 0.2) m.turn = approach(m.turn ?? 1, Math.sign(dx), dt * 7);
      if (t && d <= stop + 0.1 && m.hitCd <= 0) {
        m.hitCd = MINION.hitEvery;
        m.actT = 0.3;
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
      this.pendingLevels += this.chestReward.levels;
      this.treasure += this.chestReward.gold;
      this.hooks.banner('TREASURE!', '+25 gold, +2 upgrades and a big snack');
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
    this.bossLight?.position.set(this.x, 3.5, this.z);
    if (this.paper) this.renderPaper();

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
      if (this.paper) {
        setShadow(h.x, h.z, h.def.radius * 1.1 / (1 + h.y * 0.25));
        if (h.aura) { h.aura.position.set(h.x, 0.05, h.z); h.aura.rotation.z = t * 2; }
        continue;
      }
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
    for (const b of this.castle.buildings) {
      const [bx, bz] = this.castle.center(b.cx, b.cz);
      if (b.id === 'pad') {
        this.tmp.position.set(bx, 0.1, bz); this.tmp.rotation.set(0, 0, 0); this.tmp.scale.setScalar(1); this.tmp.updateMatrix();
        this.mSpring.setMatrixAt(sp, this.tmp.matrix);
        this.tmp.position.y = 0.25 + b.bounce * 0.6; this.tmp.updateMatrix();
        this.mSpringTop.setMatrixAt(sp++, this.tmp.matrix);
      } else if (b.id === 'saw') {
        this.tmp.position.set(bx, TRAPS.sawRadius * 0.6, bz); this.tmp.rotation.set(b.jammed > 0 ? 0 : t * 18, 0, Math.PI / 2); this.tmp.scale.setScalar(1); this.tmp.updateMatrix();
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

  /** Paper style: the crowd and boss are cutout standees; flipping them left/right is the whole "turn" animation. */
  private renderPaper(): void {
    const p = this.paper;
    if (!p) return;
    const now = performance.now() / 1000;
    p.heroes.begin();
    p.heroes.setTime(now);
    for (const h of this.heroes) {
      if (!h.alive) continue;
      const size = this.standeeSize(h);
      p.rig.draw(this.castIndex(h), {
        x: h.x, z: h.z, y: h.air ? h.y : h.def.flying ? 1.1 + Math.sin(now * 3 + h.phase) * 0.15 : 0, size, face: h.turn,
        roll: h.air ? h.spin : 0,
        walk: h.air || h.iceT > 0 ? 0 : 1, phase: h.phase, time: now, seed: h.dashCd * 7 + h.variant,
        action: h.action, act: h.actT > 0 ? 1 - h.actT / h.actDur : 0,
        hit: h.hitT / 0.22, air: h.air, flash: h.flash > 0 ? 0.85 : h.iceT > 0 ? 0.5 : 0,
      });
    }
    const gob = CAST.indexOf('goblin');
    this.minions.forEach((m, i) => {
      p.rig.draw(gob, {
        x: m.x, y: 0, z: m.z, size: 1.9, face: m.turn ?? 1, walk: 1, phase: m.phase, time: now, seed: i * 1.7,
        action: 'swing', act: (m.actT ?? 0) > 0 ? 1 - (m.actT ?? 0) / 0.3 : 0,
      });
    });
    // Defeated heroes fall backwards flat like a knocked-over standee, then fold away.
    p.corpses = p.corpses.filter((c) => this.time - c.born < 0.55);
    for (const c of p.corpses) {
      const k = (this.time - c.born) / 0.55;
      const shrink = 1 - Math.max(0, (k - 0.55) / 0.45);
      p.rig.draw(c.cast, {
        x: c.x, z: c.z, y: c.y * (1 - k) + Math.sin(k * Math.PI) * 0.5, size: c.size * shrink, face: c.face,
        roll: c.spin * k * 0.9, lean: k * 1.2, walk: 0, phase: 0, time: now, seed: c.seed,
        air: true, flash: 0.35 * (1 - k),
      });
    }
    p.heroes.end();

    const expr: Face = this.ouch > 0 ? 'hurt' : now % 3.3 < 0.14 ? 'blink' : 'idle';
    p.boss.begin();
    p.boss.setTime(now);
    p.bossRig.draw(this.bossId, {
      x: this.x, y: 0, z: this.z, size: this.radius * 4.9, face: this.turn,
      roll: this.ouch > 0 ? Math.sin(now * 60) * 0.05 : 0,
      time: now, moving: this.walkBlend, act: this.bossActT > 0 ? 1 - this.bossActT / 0.4 : 0,
      hurt: this.ouch / 0.35, expr,
    });
    p.boss.end();

    // Castle: walls and towers stand up; spike pits lie flat on the ground.
    p.castle.begin();
    const flat = Math.PI / 2 - this.world.standeeTilt;
    for (const b of this.castle.buildings) {
      const [bx, bz] = this.castle.center(b.cx, b.cz);
      // Disarmed buildings blink; damaged ones sag a little so repairs are easy to spot.
      const flash = b.jammed > 0 ? 0.35 + Math.sin(now * 10) * 0.3 : 0;
      const sag = 0.75 + 0.25 * (b.hp / b.maxHp);
      if (b.id === 'wall') p.castle.push({ x: bx, y: 0, z: bz, w: 2.3, h: 2.3 * sag, cell: castleCell('wall'), face: 1, flash, roll: (1 - sag) * 0.4 });
      else if (b.id === 'tower') p.castle.push({ x: bx, y: 0, z: bz, w: 3.2, h: 3.2 * sag, cell: castleCell('tower'), face: 1, flash, roll: (1 - sag) * 0.3 });
      else if (b.id === 'spikes') p.castle.push({ x: bx, y: 0.03, z: bz + CASTLE.cell * 0.5, w: CASTLE.cell, h: CASTLE.cell, cell: castleCell('spikes'), face: 1, lean: flat, flash });
    }
    p.castle.end();
    this.drawGrid();

    // Treasure: gates, the vault at its fill level, sacks over thieves, and coins flying home.
    p.loot.begin();
    // Gates lean well back so the ones near the camera never wall off the view.
    for (const g of this.gates) p.loot.push({ x: g.x, y: 0, z: g.z, w: 4.2, h: 4.2, cell: lootCell('gate'), face: 1, lean: g.z > 0 ? 0.75 : 0.2 });
    const full = this.treasure / TREASURE.start;
    const level = full > 0.66 ? 'vault3' : full > 0.33 ? 'vault2' : full > 0 ? 'vault1' : 'vault0';
    p.loot.push({ x: 0, y: 0, z: 0, w: 4.6, h: 4.6, cell: lootCell(level), face: 1, roll: Math.sin(now * 2) * 0.02 });
    for (const h of this.heroes) {
      if (!h.alive || h.carry <= 0) continue;
      const size = this.standeeSize(h);
      p.loot.push({ x: h.x, z: h.z, y: (h.air ? h.y : 0) + size * 0.78 + Math.abs(Math.sin(h.phase)) * 0.12, w: 1.25, h: 1.25, cell: lootCell('bag'), face: h.turn, roll: h.air ? h.spin : Math.sin(h.phase) * 0.15 });
    }
    for (const c of this.spills) p.loot.push({ x: c.x, y: c.y - 0.3, z: c.z, w: 0.75, h: 0.75, cell: lootCell('coin'), face: Math.cos(now * 9 + c.sx), roll: 0 });
    p.loot.end();
    this.renderSpells(now);
  }

  /** Spells as paper cutouts: comet fireballs, bolts under storm clouds, tornados, boomerangs, ice. */
  private renderSpells(now: number): void {
    const sp = this.paper?.spells;
    if (!sp) return;
    sp.begin();
    const flicker = Math.floor(now * 14) % 2 ? spellCell('fire1') : spellCell('fire0');
    for (const s of this.shots) {
      if (s.enemy || s.src) continue;
      // The comet points along its flight: flipped for left/right, tipped for toward/away from the camera.
      const face = s.vx < 0 ? -1 : 1;
      const roll = -face * Math.atan2(s.vz * 0.8, Math.abs(s.vx) + 0.001);
      sp.push({ x: s.x, y: 0.35, z: s.z, w: 2.4, h: 2.4, cell: flicker, face, roll: Math.max(-1.2, Math.min(1.2, roll)) });
    }
    for (const f of this.flashes) {
      const k = f.life / f.max;
      // Pop in big, then shrink away; bolts stay full height and flicker instead.
      const bolt = f.cell.startsWith('bolt');
      const scale = bolt ? 1 : Math.min(1, (1 - k) * 6) * (0.6 + 0.4 * k);
      sp.push({ x: f.x, y: f.y, z: f.z, w: f.w * scale * (bolt ? 0.55 : 1), h: f.h * scale, cell: spellCell(f.cell), face: bolt && Math.floor(now * 30) % 2 ? -f.face : f.face, roll: f.roll, flash: bolt && k > 0.7 ? 0.6 : 0 });
    }
    for (const tw of this.twisters) {
      const grow = Math.min(1, (TORNADO.life - tw.life) * 4, tw.life * 3);
      sp.push({ x: tw.x, y: 0, z: tw.z, w: 3.3 * grow, h: 4.4 * grow, cell: spellCell(Math.floor(now * 12 + tw.seed) % 2 ? 'twister1' : 'twister0'), face: Math.sin(now * 5 + tw.seed) > 0 ? 1 : -1, roll: Math.sin(now * 7 + tw.seed) * 0.12 });
    }
    for (const b of this.booms) sp.push({ x: b.x, y: 0.5, z: b.z, w: 1.7, h: 1.7, cell: spellCell('boomerang'), face: 1, roll: b.t * 22 });
    for (const h of this.heroes) {
      if (!h.alive || h.iceT <= 0 || h.air) continue;
      const size = this.standeeSize(h);
      sp.push({ x: h.x, y: 0, z: h.z + 0.05, w: size * 1.05, h: size * 0.75, cell: spellCell('ice'), face: h.turn >= 0 ? 1 : -1 });
    }
    sp.end();
  }

  /** Build-phase grid: faint tiles where building is allowed, and the hovered tile in green or red. */
  private drawGrid(): void {
    const m = this.gridMesh;
    m.visible = this.phase === 'build';
    if (!m.visible) return;
    let n = 0;
    const col = this.col;
    for (let cz = 0; cz < this.castle.size; cz++) {
      for (let cx = 0; cx < this.castle.size; cx++) {
        const [x, z] = this.castle.center(cx, cz);
        if (Math.hypot(x, z) > CASTLE.buildRadius) continue;
        const hovered = this.hover && this.hover.cx === cx && this.hover.cz === cz;
        const breach = this.castle.inBreach(x, z);
        if (!hovered && !breach && (this.castle.at(cx, cz) || this.castle.whyNot(cx, cz, 'spikes'))) continue;
        this.tmp.position.set(x, 0.04, z); this.tmp.rotation.set(0, 0, 0); this.tmp.scale.setScalar(1); this.tmp.updateMatrix();
        m.setMatrixAt(n, this.tmp.matrix);
        // Breach zones show red so the player can see where heroes will pour in.
        m.setColorAt(n, hovered ? col.setHex(this.hover?.ok ? 0x3ee07a : 0xff3d5a) : breach ? col.setHex(0xff2040) : col.setHex(0xffffff));
        n++;
      }
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }

  private castIndex(h: Hero): number {
    // A Shieldbearer whose shield broke is drawn as a plain knight, so the change is visible.
    if (h.look) return CAST.indexOf(h.look);
    if (h.kind === 'shieldbearer' && !h.shield) return CAST.indexOf('knight');
    return CAST.indexOf(castFor(h.kind, h.variant, h.champ));
  }

  /** Puppet pieces are drawn a little smaller than their cells (see cast.ts FIT), so the standee is scaled up to match. */
  private standeeSize(h: Hero): number {
    return 2.05 * h.def.scale;
  }

  /**
   * Edge-of-screen arrows for things the player must not lose track of: the vault when it is off
   * screen, and the nearest thieves carrying gold. Positions are in CSS pixels, clamped to the edge.
   */
  markers(): { kind: 'vault' | 'thief' | 'breach'; x: number; y: number; angle: number }[] {
    const w = window.innerWidth, h = window.innerHeight, pad = 34;
    const out: { kind: 'vault' | 'thief' | 'breach'; x: number; y: number; angle: number }[] = [];
    const place = (kind: 'vault' | 'thief' | 'breach', wx: number, wz: number) => {
      this.v3.set(wx, 1, wz).project(this.world.camera);
      let sx = (this.v3.x * 0.5 + 0.5) * w, sy = (-this.v3.y * 0.5 + 0.5) * h;
      if (this.v3.z > 1) { sx = w - sx; sy = h - sy; }
      if (sx > pad && sx < w - pad && sy > pad + 60 && sy < h - pad) return;
      const cx = w / 2, cy = h / 2;
      const angle = Math.atan2(sy - cy, sx - cx);
      const t = Math.min((w / 2 - pad) / Math.abs(Math.cos(angle) || 1e-6), (h / 2 - pad - 30) / Math.abs(Math.sin(angle) || 1e-6));
      out.push({ kind, x: cx + Math.cos(angle) * t, y: cy + 15 + Math.sin(angle) * t, angle });
    };
    place('vault', 0, 0);
    if (this.surprise) place('breach', this.surprise.x, this.surprise.z);
    this.heroes
      .filter((hh) => hh.alive && hh.carry > 0)
      .sort((a, b) => Math.hypot(a.x - this.x, a.z - this.z) - Math.hypot(b.x - this.x, b.z - this.z))
      .slice(0, 4)
      .forEach((t) => place('thief', t.x, t.z));
    return out;
  }

  private breachLabels: HTMLDivElement[] = [];

  /** Build phase: a "BREACH" tag over each active breach point. */
  private placeBreachLabels(w: number, hgt: number): void {
    const show = this.phase === 'build';
    while (this.breachLabels.length < this.breaches.length) {
      const el = document.createElement('div');
      el.className = 'tag breach';
      el.textContent = '⚠️ BREACH';
      this.labelLayer.appendChild(el);
      this.breachLabels.push(el);
    }
    this.breachLabels.forEach((el, i) => {
      const g = this.gates[i];
      el.hidden = !show || !g;
      if (!g || !show) return;
      this.v3.set(g.x, 3.2, g.z).project(this.world.camera);
      el.style.transform = `translate(${(this.v3.x * 0.5 + 0.5) * w}px, ${(-this.v3.y * 0.5 + 0.5) * hgt}px) translate(-50%, -100%)`;
    });
  }

  private placeLabels(): void {
    const w = window.innerWidth, hgt = window.innerHeight;
    this.placeBreachLabels(w, hgt);
    for (const h of this.heroes) {
      if (!h.label || !h.alive) continue;
      this.v3.set(h.x, 2.2 * h.def.scale + 0.3, h.z).project(this.world.camera);
      h.label.style.transform = `translate(${(this.v3.x * 0.5 + 0.5) * w}px, ${(-this.v3.y * 0.5 + 0.5) * hgt}px) translate(-50%, -100%)`;
    }
  }
}
