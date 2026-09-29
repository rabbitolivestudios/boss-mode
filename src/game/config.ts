// All tunable numbers live here so the game can be rebalanced without touching logic.

export const RUN = {
  spawnRadius: 26,
  maxHeroes: 520,
  maxGems: 380,
  /** Spawns per second = base + t * ramp, capped. */
  spawnBase: 0.9,
  spawnRamp: 1 / 40,
  spawnCap: 14,
  /**
   * Hero HP multiplier = 1 + t / hpGrowthPeriod. Late in a run the player's build outgrows this on
   * purpose: the final minutes are the power fantasy, and challenge comes from the difficulty tiers.
   * Steeper growth and faster late spawns were tried and only fed the player more XP.
   */
  hpGrowthPeriod: 200,
  /** Chance a defeated hero drops a drumstick, and how much it heals. */
  snackChance: 0.012,
  snackHeal: 20,
  /** Chance of a loot vacuum, which pulls every gem on the map to the boss. */
  vacuumChance: 0.004,
  squadEvery: 75,
  /** Squad size = squadSize + t / squadGrowth. */
  squadSize: 12,
  squadGrowth: 18,
  /** Contact damage per second is capped at contactCap + t / contactGrowth, so a swarm hurts but never deletes you. */
  contactCap: 14,
  contactGrowth: 22,
  rageMax: 100,
  roarRadius: 15,
  roarDamage: 60,
  frenzySeconds: 6,
};

/** The treasure vault at the centre of the arena, and the heroes who try to rob it. */
export const TREASURE = {
  start: 100,
  /** Coins a thief carries out per trip. */
  carry: 3,
  /** Seconds a hero spends stuffing coins into the bag. */
  grabTime: 0.7,
  /** Coins knocked out of a sack per hit; defeating the thief drops the rest. */
  knockOut: 1,
  /** Gates sit on a ring this far from the vault; heroes enter and escape through them. */
  /** Breach points sit on a ring this far from the vault (inside the castle grid). */
  gateRadius: 22,
  /** Candidate breach points around the ring; a few open each night. */
  gates: 12,
  /** Active breaches per night; the last night opens them all. */
  breachesPerNight: [2, 2, 3, 3, 4, 4, 12],
  /** Surprise breaches open from this night (0-based) at this share of the night, after a telegraph. */
  surpriseFromNight: 3,
  surpriseAt: 0.4,
  surpriseWarning: 3,
  /** Standing within this distance of a warned breach when it opens cancels it. */
  surpriseCancel: 2.6,
  surpriseMinDistance: 12,
  surpriseCrew: 8,
  /** How close to a gate a thief must get to escape. */
  escapeDistance: 1.6,
  /** Share of non-rogue heroes that go for the gold instead of the boss: base + t * ramp, capped. */
  lootShareBase: 0.08,
  lootShareRamp: 1 / 2400,
  lootShareCap: 0.22,
  /** Seconds before spilled coins fly home to the vault. */
  returnDelay: 0.9,
  vaultRadius: 2.2,
  /** At or below this much gold during a raid, a warning says an empty vault loses the season. */
  lowWarning: 10,
  /**
   * Learning nights. Live data: a new phone player spent 98 of 100 coins, was robbed 25 s into night 1,
   * retried with 4 coins, lost at 48 s, and quit. So on night 1 no hero goes for the gold for the first
   * `graceSeconds`, and on the first `slowNights` nights thieves carrying gold are slow on every tier.
   */
  graceSeconds: 30,
  /**
   * Night 1 is a warm-up: this share of the usual heroes (and rogues) go for the gold, and no heist crew
   * comes. Live data after the Reddit post: two new Normal players on night 1 saw 31 and 4 thieves reach
   * the vault, 8 and 3 escape, and one was robbed at 56 s; the test bot never sees this because it chases
   * every carrier perfectly.
   */
  warmupLoot: 0.35,
  slowNights: 2,
  earlyGetaway: 0.85,
  /** Build-phase vault advice: at or above `safe` reads safe, below `risky` reads risky. Advice only, never a limit. */
  safe: 25,
  risky: 10,
  /** Heist crews: packs of rogues that enter at the gate farthest from the boss. Size = base + t / growth. */
  heistFirst: 70,
  heistEvery: 90,
  heistSize: 5,
  heistGrowth: 70,
};

export type DifficultyId = 'chill' | 'normal' | 'heroic' | 'legendary';

export interface Difficulty {
  id: DifficultyId;
  name: string;
  /** Multipliers on hero health, spawn rate, hero damage, and the share of heroes who go for the gold. */
  hp: number;
  spawn: number;
  damage: number;
  loot: number;
  /**
   * Speed of a thief carrying gold, as a share of its normal speed. Gold is only lost when a thief
   * escapes, and when any hit emptied the whole sack a Heroic bot saw up to 58 raids a night and lost
   * 0 gold, so on harder tiers thieves sprint away with the loot. Chill keeps them weighed down.
   */
  getaway: number;
  /** Anti-camping pressure: 0 turns off airstrikes and camper barrages and halves bombers (Chill, for kids); 1 is full. */
  pressure: number;
}

/**
 * Chill and Normal are open from the start (Normal is the default); each tier after that unlocks by
 * winning the one before it. After playtests where strong players won easily, the ladder was shifted up:
 * Chill is the original Normal, Normal is the original Heroic.
 */
export const DIFFICULTIES: Difficulty[] = [
  { id: 'chill', name: 'Chill', hp: 1, spawn: 1, damage: 1, loot: 1, getaway: 0.85, pressure: 0 },
  { id: 'normal', name: 'Normal', hp: 1.5, spawn: 1.25, damage: 1.2, loot: 1.3, getaway: 1, pressure: 1 },
  { id: 'heroic', name: 'Heroic', hp: 2.5, spawn: 1.55, damage: 1.5, loot: 1.6, getaway: 1.15, pressure: 1 },
  { id: 'legendary', name: 'Legendary', hp: 3.3, spawn: 1.8, damage: 1.7, loot: 2, getaway: 1.25, pressure: 1 },
];

/** Tiers open without winning anything, and the tier picked by default. */
export const OPEN_TIERS = 1;
export const DEFAULT_TIER = 1;

export type HeroKind = 'noob' | 'archer' | 'knight' | 'sweat' | 'healer' | 'rogue' | 'shieldbearer' | 'glider' | 'nerd' | 'sapper' | 'bomber' | 'champion';

export interface HeroDef {
  label: string;
  hp: number;
  speed: number;
  /** Contact damage per second while touching the boss. */
  dps: number;
  radius: number;
  scale: number;
  xp: number;
  body: number;
  head: number;
  gear: number;
  ranged?: { range: number; cooldown: number; speed: number; damage: number };
  heal?: { range: number; cooldown: number; amount: number };
  dash?: { cooldown: number; duration: number; mult: number };
  /** Counter-heroes: each beats one kind of defence (see COUNTERS). */
  shield?: boolean;
  flying?: boolean;
  saboteur?: 'jam' | 'sap';
}

export const HEROES: Record<HeroKind, HeroDef> = {
  noob: { label: 'Noob', hp: 9, speed: 3.2, dps: 8, radius: 0.45, scale: 1, xp: 1, body: 0x2f7dff, head: 0xffd83a, gear: 0x9aa4b1 },
  archer: {
    label: 'Archer', hp: 8, speed: 3.4, dps: 5, radius: 0.45, scale: 1, xp: 2, body: 0x2fbf5a, head: 0xffc9a0, gear: 0x8a5a2b,
    ranged: { range: 11, cooldown: 2.8, speed: 9, damage: 4 },
  },
  knight: { label: 'Knight', hp: 34, speed: 2.4, dps: 14, radius: 0.6, scale: 1.35, xp: 3, body: 0xb8c4d6, head: 0x6c7a8f, gear: 0xe0e6ef },
  sweat: {
    label: 'Tryhard', hp: 12, speed: 4.6, dps: 10, radius: 0.42, scale: 0.95, xp: 2, body: 0xff3d7f, head: 0x222222, gear: 0x00e5ff,
    dash: { cooldown: 3, duration: 0.35, mult: 3.2 },
  },
  healer: {
    label: 'Healer', hp: 14, speed: 3.0, dps: 4, radius: 0.45, scale: 1, xp: 3, body: 0xffffff, head: 0xffc9a0, gear: 0x7dffb0,
    heal: { range: 5, cooldown: 2, amount: 6 },
  },
  shieldbearer: { label: 'Shieldbearer', hp: 28, speed: 2.6, dps: 10, radius: 0.55, scale: 1.25, xp: 3, body: 0x6c7a8f, head: 0xffcfa6, gear: 0xd8263a, shield: true },
  glider: { label: 'Glider', hp: 14, speed: 3.9, dps: 6, radius: 0.45, scale: 1, xp: 3, body: 0x29a3ff, head: 0xffcfa6, gear: 0xffffff, flying: true },
  nerd: { label: 'Trap Nerd', hp: 16, speed: 3.3, dps: 4, radius: 0.45, scale: 1, xp: 3, body: 0xffa31a, head: 0xffcfa6, gear: 0x9aa4b1, saboteur: 'jam' },
  sapper: { label: 'Sapper', hp: 12, speed: 3.7, dps: 5, radius: 0.45, scale: 1, xp: 3, body: 0x5a5a6a, head: 0xffcfa6, gear: 0x2a2a2a, saboteur: 'sap' },
  // Bombers keep their distance and lob a bomb at where the boss stands every `cooldown` seconds (see BOMBERS).
  bomber: { label: 'Bomber', hp: 14, speed: 3.0, dps: 4, radius: 0.45, scale: 1, xp: 3, body: 0xff9a1a, head: 0xffcfa6, gear: 0x2a2a2a, ranged: { range: 12, cooldown: 3.4, speed: 0, damage: 9 } },
  rogue: { label: 'Rogue', hp: 10, speed: 4.1, dps: 6, radius: 0.42, scale: 0.95, xp: 2, body: 0x5a3a8a, head: 0x2a1f3d, gear: 0xdfe6ee },
  champion: {
    label: 'Champion', hp: 450, speed: 3.4, dps: 16, radius: 1.1, scale: 2.4, xp: 0, body: 0xffc21a, head: 0xffe7b0, gear: 0xff5a1a,
    ranged: { range: 14, cooldown: 3.6, speed: 9, damage: 6 },
    dash: { cooldown: 5, duration: 0.5, mult: 3 },
  },
};

/** Weight tables by elapsed seconds; the last band whose `from` has passed applies. */
export const WAVES: { from: number; mix: Partial<Record<HeroKind, number>> }[] = [
  { from: 0, mix: { noob: 1 } },
  { from: 30, mix: { noob: 85, rogue: 15 } },
  { from: 50, mix: { noob: 60, archer: 25, rogue: 15 } },
  { from: 110, mix: { noob: 45, archer: 20, sweat: 20, rogue: 15 } },
  { from: 170, mix: { noob: 35, archer: 18, sweat: 17, knight: 18, rogue: 12 } },
  { from: 250, mix: { noob: 27, archer: 18, sweat: 17, knight: 18, healer: 8, rogue: 12 } },
  { from: 360, mix: { noob: 18, archer: 22, sweat: 18, knight: 22, healer: 8, rogue: 12 } },
];

export type ChampionPower = 'rally' | 'guard' | 'volley' | 'clones' | 'mend' | 'heist' | 'chosen';

/**
 * A boss hero ends every night: it arrives `at` seconds in, and dawn waits until it is beaten, even
 * past the timer. `hpMul` scales the Champion base health (times the tier's hero health); `chest` is
 * the gold and level-ups its treasure chest gives (level-ups only on nights 1-2: six chests of
 * level-ups snowballed, taking bot Normal wins from 9/30 to 18/36); `shoots` gives it the ring of arrows. Powers are tuned
 * in CHAMPION_POWERS. 72 bot seasons: with every boss shooting, Heroic bots died 60-75 s into night 1
 * (right after the Noob Captain), so nights 1-3 fight up close with less health; without the rings the
 * second half went soft (Normal nights 5-6 lowest health back near 75%), so nights 4-6 shoot and hit harder.
 */
export const CHAMPIONS: { night: number; at: number; name: string; hpMul: number; power: ChampionPower; shoots: boolean; chest: { gold: number; levels: number }; blurb: string; final?: boolean }[] = [
  { night: 1, at: 52, name: 'Noob Captain', hpMul: 0.45, power: 'rally', shoots: false, chest: { gold: 10, levels: 1 }, blurb: 'Calls in noob squads, and they run faster while he stands' },
  { night: 2, at: 58, name: 'Sir Tryhard', hpMul: 0.85, power: 'guard', shoots: false, chest: { gold: 10, levels: 1 }, blurb: 'Raises a golden shield, then charges. Hit him when it drops!' },
  { night: 3, at: 65, name: 'Quickscope Queen', hpMul: 1.6, power: 'volley', shoots: false, chest: { gold: 20, levels: 0 }, blurb: 'Rains arrows on the red circles. Keep moving!' },
  { night: 4, at: 71, name: 'xX_Clutch_Xx', hpMul: 3.0, power: 'clones', shoots: true, chest: { gold: 20, levels: 0 }, blurb: 'Splits into fakes. Only one is real' },
  { night: 5, at: 78, name: 'Dr. Heals', hpMul: 3.4, power: 'mend', shoots: true, chest: { gold: 20, levels: 0 }, blurb: 'Heals every hero around her. Take her down first!' },
  { night: 6, at: 84, name: 'Captain Loot', hpMul: 3.4, power: 'heist', shoots: true, chest: { gold: 20, levels: 0 }, blurb: 'Grabs 10 coins at once and runs. Knock them out of him!' },
  { night: 7, at: 35, name: 'THE CHOSEN ONE', hpMul: 18, power: 'chosen', shoots: true, chest: { gold: 0, levels: 0 }, blurb: 'Beat the Chosen One to win!', final: true },
];

/** Tuning for the boss heroes' powers. */
export const CHAMPION_POWERS = {
  /** Noob Captain: squad size and interval, and how much faster noobs run while he stands. */
  rally: { every: 8, squad: 6, noobSpeed: 1.25 },
  /** Sir Tryhard: seconds shield up and down; share of damage taken while up; charge speed. */
  guard: { up: 3, down: 3, taken: 0.2, charge: 3 },
  /** Quickscope Queen: circles per volley, seconds between volleys, warning time, radius, and damage. */
  volley: { count: 5, every: 5, warn: 1.2, radius: 1.8, damage: 12 },
  /** xX_Clutch_Xx: fakes per split, seconds between splits, and a fake's health as a share of a Champion's base. */
  clones: { count: 2, every: 12, hp: 0.06 },
  /** Dr. Heals: seconds between heals, radius, and share of max health restored. */
  mend: { every: 3, radius: 7, share: 0.15 },
  /** Captain Loot: coins grabbed per trip, getaway speed, and seconds before he comes back after escaping. */
  heist: { carry: 10, getaway: 1.3, back: 12 },
};

/**
 * The season: seven nights, each a raid with a build phase before it. `duration` is seconds of raid;
 * the last night lasts until the Chosen One falls. `tribute` is gold paid into the vault for surviving.
 */
export const NIGHTS: { duration: number; tribute: number }[] = [
  { duration: 80, tribute: 15 },
  { duration: 90, tribute: 20 },
  { duration: 100, tribute: 25 },
  { duration: 110, tribute: 30 },
  { duration: 120, tribute: 35 },
  { duration: 130, tribute: 40 },
  { duration: Infinity, tribute: 0 },
];

/** Stars for a night: share of the vault kept through the raid. */
export const STARS = { two: 0.9, three: 1 };

export type BuildingId = 'wall' | 'spikes' | 'pad' | 'saw' | 'tower';

export interface BuildingDef { name: string; icon: string; cost: number; blurb: string }

export interface BuildingDefFull extends BuildingDef { hp: number }

export const BUILDINGS: Record<BuildingId, BuildingDefFull> = {
  wall: { name: 'Wall', icon: '🧱', cost: 4, hp: 60, blurb: 'Heroes must walk around it' },
  spikes: { name: 'Spike Pit', icon: '📌', cost: 10, hp: 50, blurb: 'Hurts and slows heroes who cross' },
  pad: { name: 'Launch Pad', icon: '🚀', cost: 15, hp: 50, blurb: 'Flings heroes into each other' },
  saw: { name: 'Saw Blade', icon: '🪚', cost: 18, hp: 70, blurb: 'Shreds anyone who touches it' },
  tower: { name: 'Bone Archer', icon: '🏹', cost: 25, hp: 80, blurb: 'Shoots the nearest hero' },
};

/**
 * Counter-heroes join the raids from a given night (0-based) with a spawn weight added to the wave mix.
 * `boost` names the building whose kills make this hero more common next night.
 */
export const COUNTERS: { kind: HeroKind; from: number; weight: number; boost: BuildingId[]; card: string; taunt: string }[] = [
  { kind: 'shieldbearer', from: 1, weight: 9, boost: ['tower', 'saw'], card: 'Your buildings cannot hurt it. Hit it yourself (or launch it) to shatter the shield.', taunt: 'shields up, they spam towers lol' },
  { kind: 'glider', from: 2, weight: 9, boost: ['spikes', 'pad', 'wall'], card: 'Flies over walls, spikes, pads and saws. Towers and your attacks still hit it.', taunt: 'bring wings, they spam spikes' },
  { kind: 'nerd', from: 3, weight: 6, boost: ['saw', 'pad', 'spikes'], card: 'Walks up to a trap and disarms it for a while. Stop it before the wrench finishes.', taunt: 'nerd squad, go fix their traps' },
  { kind: 'sapper', from: 4, weight: 6, boost: ['wall', 'tower'], card: 'Runs at your buildings and blows them up. Repair at dawn, or stop it first.', taunt: 'sappers! blow up their walls' },
];

export const SABOTAGE = {
  /** Seconds a Trap Nerd works on a trap, and how long the trap stays disarmed. */
  jamWork: 2.5,
  jamFor: 9,
  sapDamage: 45,
  sapRadius: 2.4,
  /** Share of a building's price paid to repair it from 0 HP (prorated). */
  repairShare: 0.5,
  /** Next night's weight multiplier = 1 + boostPerShare * (share of kills by the boosting buildings). */
  boostPerShare: 2.5,
};

/** The buildable grid around the vault, and what each building does. */
export const CASTLE = {
  cell: 2,
  /** Grid spans -half..half cells on each axis. */
  half: 12,
  /** Nothing can be built this close to the vault or to a gate. */
  vaultClear: 3.5,
  /** No-build radius around an active breach, wide enough that traps cannot seal a spawn point. */
  breachClear: 5,
  /** Buildable only inside this radius; heroes still walk the whole grid. */
  buildRadius: 23,
  spikeDamage: 8,
  spikeEvery: 0.5,
  spikeSlow: 0.5,
  towerRange: 10,
  towerEvery: 1.1,
  towerDamage: 12,
  /** Selling a building placed on an earlier night refunds this share (same-night undo stays free). */
  oldRefund: 0.5,
  /** Buildings wrecked by a new breach refund this share. */
  shredRefund: 0.5,
  padDamage: 8,
  sawDamage: 12,
};

export type WeaponId = 'stomp' | 'fireball' | 'bats' | 'lava' | 'lightning' | 'minions' | 'spring' | 'saw' | 'frost' | 'tornado' | 'boomerang';
export type PassiveId = 'might' | 'haste' | 'boots' | 'heart' | 'magnet' | 'regen';

export interface WeaponDef {
  name: string;
  icon: string;
  blurb: string[];
  cd: number[];
  dmg: number[];
  /** Weapon-specific per-level number: radius, count, strikes... */
  n: number[];
}

export const MAX_LEVEL = 5;

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  stomp: {
    name: 'Ground Pound', icon: '💥',
    blurb: ['Slam the floor. Heroes go flying.', 'Bigger shockwave', 'Faster slams', 'Bigger AND harder', 'EARTHQUAKE MODE'],
    cd: [1.8, 1.7, 1.5, 1.35, 1.1], dmg: [14, 18, 22, 28, 38], n: [4.0, 4.6, 5.0, 5.6, 6.8],
  },
  fireball: {
    name: 'Fireball', icon: '🔥',
    blurb: ['Spit fire at the nearest hero.', '+1 fireball', 'Fireballs pierce', '+1 fireball', '+1 fireball, burns through crowds'],
    cd: [1.1, 1.0, 0.9, 0.85, 0.7], dmg: [10, 12, 15, 18, 24], n: [1, 2, 2, 3, 4],
  },
  bats: {
    name: 'Bat Swarm', icon: '🦇',
    blurb: ['Bats circle you and bite heroes.', '+1 bat', '+1 bat, sharper teeth', '+1 bat', '+2 bats'],
    cd: [0.45, 0.45, 0.4, 0.4, 0.35], dmg: [5, 6, 8, 10, 12], n: [2, 3, 4, 5, 7],
  },
  lava: {
    name: 'Lava Trail', icon: '🌋',
    blurb: ['Leave pools of lava behind you.', 'Bigger pools', 'More often', 'Hotter lava', 'VOLCANO FEET'],
    cd: [2.4, 2.2, 1.9, 1.7, 1.4], dmg: [12, 15, 18, 24, 32], n: [1.7, 2.0, 2.2, 2.5, 3.0],
  },
  lightning: {
    name: 'Storm Call', icon: '⚡',
    blurb: ['Lightning zaps random heroes.', '+1 strike', '+1 strike, bolts jump to a 2nd hero', '+1 strike, more damage', '+2 strikes, bolts jump twice'],
    cd: [2.0, 1.8, 1.6, 1.5, 1.2], dmg: [16, 20, 24, 30, 40], n: [1, 2, 3, 4, 6],
  },
  minions: {
    name: 'Summon Goblins', icon: '👺',
    blurb: ['Goblins fight the heroes for you.', '+1 goblin', '+1 goblin, tougher', '+1 goblin', '+2 goblins'],
    cd: [2.0, 1.8, 1.6, 1.4, 1.2], dmg: [10, 12, 14, 17, 22], n: [3, 4, 5, 6, 8],
  },
  spring: {
    name: 'Launch Pad', icon: '🚀',
    blurb: ['Drop a trap pad. Heroes who step on it get YEETED.', '+1 pad', 'Pads rebuild faster', '+1 pad, bigger launches', '+2 pads'],
    cd: [4.0, 3.6, 3.0, 2.6, 2.2], dmg: [6, 8, 10, 14, 18], n: [1, 2, 2, 3, 5],
  },
  saw: {
    name: 'Saw Blade', icon: '🪚',
    blurb: ['Drop a spinning saw. Lure heroes into it.', '+1 saw', 'Sharper saw', '+1 saw', '+1 saw, faster drops'],
    cd: [4.2, 3.8, 3.4, 3.0, 2.6], dmg: [11, 14, 17, 21, 27], n: [1, 2, 2, 3, 4],
  },
  frost: {
    name: 'Frost Nova', icon: '❄️',
    blurb: ['Blast of ice freezes nearby heroes solid. Frozen thieves cannot run!', 'Bigger blast', 'Colder: longer freeze', 'Bigger AND colder', 'ICE AGE'],
    cd: [4.2, 3.9, 3.5, 3.1, 2.6], dmg: [9, 11, 14, 17, 23], n: [4.8, 5.4, 5.8, 6.6, 7.8],
  },
  tornado: {
    name: 'Tornado', icon: '🌪️',
    blurb: ['Summon a tornado that sucks heroes in and flings them.', 'Stronger winds', '+1 tornado', 'Stronger winds', '+1 tornado, MEGA STORM'],
    cd: [6.5, 6.0, 5.5, 5.0, 4.2], dmg: [7, 9, 11, 14, 18], n: [1, 1, 2, 2, 3],
  },
  boomerang: {
    name: 'Bone Boomerang', icon: '🪃',
    blurb: ['Throw a boomerang that hits on the way out AND back.', 'Sharper bone', '+1 boomerang', 'Sharper bone', '+2 boomerangs'],
    cd: [1.9, 1.8, 1.6, 1.5, 1.3], dmg: [9, 12, 14, 18, 22], n: [1, 1, 2, 2, 4],
  },
};

/** Frost Nova: seconds frozen by level, bonus damage from the boss on frozen heroes, and champions are only slowed. */
export const FROST = { freeze: [1.6, 1.8, 2.2, 2.4, 3.0], shatter: 1.5, champSlow: 1.5 };

/** Tornado: how long one lasts, how fast it drifts, its pull radius and strength, and how hard it flings. */
export const TORNADO = { life: 4.5, speed: 3.2, pullRadius: 4.2, pull: 9, coreRadius: 1.4, hitEvery: 0.45, fling: 11 };

/** Boomerang: outward speed, seconds before it turns back, and return speed. */
export const BOOMERANG = { speed: 15, out: 0.55, back: 18, life: 3 };

/** Storm Call chains from its target to nearby heroes at these levels, within this range, for this share of damage. */
export const CHAIN = { fromLevel: 3, extraAtMax: 1, range: 5, share: 0.6 };

/**
 * Pressure on a boss that stands still. Live data: from night 3 on, winning players finished nights at
 * 94-100% health with almost no contact damage, sitting on the vault while a maxed Loot Magnet (picked 5-7
 * times in every win) brought the gems in. Each of these lands where the boss is standing, after a warning
 * circle, so a boss that keeps moving is never hit.
 */
export const BOMBERS = {
  /** From this night (0-based), bombers join the wave mix with weight base + perNight per later night. */
  fromNight: 2, weight: 5, perNight: 2,
  /** Warning before a bomb lands, and its blast radius. Range, rate and damage are the Bomber's `ranged` in HEROES. */
  warn: 1.1, radius: 1.7,
};
export const AIRSTRIKE = {
  /** From this night (0-based), a plane bombs a line through the boss every `every` seconds (plus up to `jitter`). */
  fromNight: 3, first: 25, every: 45, jitter: 15,
  /** Bombs along the line, spacing, warning before the first, delay between bombs, radius, damage, and damage to buildings. */
  bombs: 8, spacing: 2.2, warn: 1.6, stagger: 0.12, radius: 2, damage: 14, buildingDamage: 25,
};
export const CAMPER = {
  /** From this night (0-based): staying within `radius` for `seconds` calls in a barrage; it repeats every `repeat` s. */
  fromNight: 1, radius: 3, seconds: 10, repeat: 6,
  /** Bombs in the barrage, spread around the boss, warning, blast radius and damage. */
  bombs: 6, spread: 2.5, warn: 1.2, blast: 1.8, damage: 10,
};

export const PHYSICS = {
  /** Knockback speed above which a hero leaves the ground and becomes a projectile. */
  launchAt: 7,
  gravity: 30,
  /** Share of a flying hero's speed passed to whoever it crashes into. */
  transfer: 0.75,
  crashDamage: 3,
  crashPerSpeed: 0.6,
  comboWindow: 1.5,
};

export const TRAPS = { springLife: 22, springPower: 17, sawLife: 16, sawRadius: 1.35, sawHitEvery: 0.3 };

export const MINION = { hp: 30, speed: 7.5, radius: 0.4, hitEvery: 0.4, life: 20 };

export interface PassiveDef { name: string; icon: string; blurb: string; per: number }

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  might: { name: 'Big Muscles', icon: '💪', blurb: '+15% damage', per: 0.15 },
  haste: { name: 'Hyper Mode', icon: '⏩', blurb: '-8% ability cooldown', per: 0.08 },
  boots: { name: 'Speedy Boots', icon: '👟', blurb: '+10% move speed', per: 0.1 },
  heart: { name: 'Mega Heart', icon: '❤️', blurb: '+25 max HP and heal', per: 25 },
  // Was +45% a level: maxed, it pulled gems from about 20 units, the whole screen, so winners stood still (picked 5-7 times in every live win).
  magnet: { name: 'Loot Magnet', icon: '🧲', blurb: '+25% pickup range', per: 0.25 },
  regen: { name: 'Snack Break', icon: '🍗', blurb: '+0.6 HP per second', per: 0.6 },
};

export type BossId = 'dragon' | 'slime' | 'bonelord';

export interface BossDef {
  name: string;
  title: string;
  emoji: string;
  hp: number;
  speed: number;
  radius: number;
  start: WeaponId;
  color: number;
  accent: number;
}

export const BOSSES: Record<BossId, BossDef> = {
  dragon: { name: 'Blaze', title: 'the Dragon', emoji: '🐉', hp: 130, speed: 5.2, radius: 1.2, start: 'fireball', color: 0xe8392f, accent: 0xffc93a },
  slime: { name: 'Gloop', title: 'the Slime King', emoji: '🟢', hp: 170, speed: 4.4, radius: 1.35, start: 'stomp', color: 0x3ee07a, accent: 0xffe14a },
  bonelord: { name: 'Rattles', title: 'the Bone Lord', emoji: '💀', hp: 110, speed: 5.6, radius: 1.1, start: 'minions', color: 0xe9e4d4, accent: 0x9b4dff },
};

export const XP = {
  first: 3,
  perLevel: 5,
  magnetBase: 6,
  /** Seconds a gem lies on the ground before it fades (it blinks for the last `gemBlink`); gems already flying to the boss stay. */
  gemLife: 8,
  gemBlink: 2,
  lateFrom: 25,
  lateSquare: 0.5,
  gemValueColors: [0x3aa8ff, 0x3aff8a, 0xc05bff] as const,
};

/**
 * XP for the next level. The squared term past XP.lateFrom only affects the last ~20 picks: a strong run
 * used to max every upgrade by night 5-6, so the finish line moved out without slowing the early game.
 */
export function xpToNext(level: number): number {
  const late = Math.max(0, level - XP.lateFrom);
  return XP.first + (level - 1) * XP.perLevel + Math.floor(Math.pow(level, 1.5)) + Math.floor(XP.lateSquare * late * late);
}

/** Uncapped small boosts offered once every upgrade is maxed. */
export const LIMIT_BREAKS: { id: 'might' | 'haste' | 'hp' | 'speed'; name: string; icon: string; blurb: string; per: number }[] = [
  { id: 'might', name: 'Limit Break: Power', icon: '⭐', blurb: '+5% damage', per: 0.05 },
  { id: 'haste', name: 'Limit Break: Speed Up', icon: '⭐', blurb: '-3% cooldowns', per: 0.03 },
  { id: 'hp', name: 'Limit Break: Toughness', icon: '⭐', blurb: '+12 max HP', per: 12 },
  { id: 'speed', name: 'Limit Break: Zoom', icon: '⭐', blurb: '+3% move speed', per: 0.03 },
];

/**
 * Hero health multiplier for each night, on top of the time curve. It used to rise 0.15 a night, but
 * 159 bot seasons showed night 2 as the wall (13 of 20 Normal losses; counter-heroes debut then) while
 * nights 4-6 were easy (lowest health 60-80%) because upgrades outgrow a straight line. So night 2
 * stays at 1 and the middle nights climb faster.
 */
export const NIGHT_TOUGHNESS = [1, 1, 1.2, 1.55, 1.85, 2.15, 2.3];

/**
 * Leaderboard score for a season. Nights are worth the most so a deep run beats a farmed one;
 * retries cost enough that winning first time outranks grinding one night; harder tiers multiply.
 */
export const SCORE = {
  night: 1000,
  win: 2000,
  gold: 10,
  kill: 1,
  retry: 500,
  tier: { chill: 0.5, normal: 1, heroic: 1.5, legendary: 2 } as Record<string, number>,
};
