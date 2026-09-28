// All tunable numbers live here so the game can be rebalanced without touching logic.

export const RUN = {
  /** Seconds until the final champion arrives. */
  finalChampionAt: 450,
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
  /** Thieves are weighed down by the bag, so the boss can catch them. */
  thiefSpeed: 0.85,
  /** Gates sit on a ring this far from the vault; heroes enter and escape through them. */
  gateRadius: 26,
  gates: 4,
  /** How close to a gate a thief must get to escape. */
  escapeDistance: 1.6,
  /** Share of non-rogue heroes that go for the gold instead of the boss: base + t * ramp, capped. */
  lootShareBase: 0.08,
  lootShareRamp: 1 / 2400,
  lootShareCap: 0.22,
  /** Seconds before spilled coins fly home to the vault. */
  returnDelay: 0.9,
  vaultRadius: 2.2,
  /** Heist crews: packs of rogues that enter at the gate farthest from the boss. Size = base + t / growth. */
  heistFirst: 70,
  heistEvery: 90,
  heistSize: 5,
  heistGrowth: 70,
};

export type DifficultyId = 'normal' | 'heroic' | 'legendary';

export interface Difficulty {
  id: DifficultyId;
  name: string;
  /** Multipliers on hero health, spawn rate, hero damage, and the share of heroes who go for the gold. */
  hp: number;
  spawn: number;
  damage: number;
  loot: number;
}

/** Each tier unlocks by winning the one before it. */
export const DIFFICULTIES: Difficulty[] = [
  { id: 'normal', name: 'Normal', hp: 1, spawn: 1, damage: 1, loot: 1 },
  { id: 'heroic', name: 'Heroic', hp: 1.5, spawn: 1.25, damage: 1.2, loot: 1.3 },
  { id: 'legendary', name: 'Legendary', hp: 2.2, spawn: 1.5, damage: 1.4, loot: 1.6 },
];

export type HeroKind = 'noob' | 'archer' | 'knight' | 'sweat' | 'healer' | 'rogue' | 'champion';

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
}

export const HEROES: Record<HeroKind, HeroDef> = {
  noob: { label: 'Noob', hp: 9, speed: 3.2, dps: 8, radius: 0.45, scale: 1, xp: 1, body: 0x2f7dff, head: 0xffd83a, gear: 0x9aa4b1 },
  archer: {
    label: 'Archer', hp: 8, speed: 3.4, dps: 5, radius: 0.45, scale: 1, xp: 2, body: 0x2fbf5a, head: 0xffc9a0, gear: 0x8a5a2b,
    ranged: { range: 10, cooldown: 3.4, speed: 8, damage: 3 },
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

export const CHAMPIONS: { at: number; name: string; hpMul: number; final?: boolean }[] = [
  { at: 150, name: 'Sir Tryhard', hpMul: 1 },
  { at: 300, name: 'xX_Clutch_Xx', hpMul: 3 },
  { at: RUN.finalChampionAt, name: 'THE CHOSEN ONE', hpMul: 14, final: true },
];

export type WeaponId = 'stomp' | 'fireball' | 'bats' | 'lava' | 'lightning' | 'minions' | 'spring' | 'saw';
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
    blurb: ['Lightning zaps random heroes.', '+1 strike', '+1 strike', '+1 strike, more damage', '+2 strikes'],
    cd: [2.0, 1.8, 1.6, 1.5, 1.2], dmg: [18, 22, 26, 34, 44], n: [1, 2, 3, 4, 6],
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
    blurb: ['Drop a spinning saw. Lure heroes into it.', 'Sharper saw', '+1 saw', 'Sharper saw', '+1 saw, bigger blades'],
    cd: [5.0, 4.6, 4.2, 3.8, 3.2], dmg: [7, 10, 12, 16, 20], n: [1, 1, 2, 2, 3],
  },
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

export const TRAPS = { springLife: 22, springPower: 17, sawLife: 14, sawRadius: 1.1, sawHitEvery: 0.3 };

export const MINION = { hp: 30, speed: 7.5, radius: 0.4, hitEvery: 0.4, life: 20 };

export interface PassiveDef { name: string; icon: string; blurb: string; per: number }

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  might: { name: 'Big Muscles', icon: '💪', blurb: '+15% damage', per: 0.15 },
  haste: { name: 'Hyper Mode', icon: '⏩', blurb: '-8% ability cooldown', per: 0.08 },
  boots: { name: 'Speedy Boots', icon: '👟', blurb: '+10% move speed', per: 0.1 },
  heart: { name: 'Mega Heart', icon: '❤️', blurb: '+25 max HP and heal', per: 25 },
  magnet: { name: 'Loot Magnet', icon: '🧲', blurb: '+45% pickup range', per: 0.45 },
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
  gemValueColors: [0x3aa8ff, 0x3aff8a, 0xc05bff] as const,
};

export function xpToNext(level: number): number {
  return XP.first + (level - 1) * XP.perLevel + Math.floor(Math.pow(level, 1.5));
}
