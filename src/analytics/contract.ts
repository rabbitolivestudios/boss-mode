/**
 * What the game may tell the analytics server, and nothing more. Privacy rules, as in Footy Draft:
 * no player names, no free text, no IPs, no permanent ids. A session id rotates after 30 idle
 * minutes and a visitor id after 90 days; both are random and live only in the player's browser.
 * Every field is an enum, a boolean or a bounded number, so the server can validate all of it.
 */

export const BOSS_IDS = ['dragon', 'slime', 'bonelord'] as const;
export const TIER_IDS = ['chill', 'normal', 'heroic', 'legendary'] as const;
export const BUILDING_IDS = ['wall', 'spikes', 'pad', 'saw', 'tower'] as const;
export const PICK_IDS = [
  'weapon:stomp', 'weapon:fireball', 'weapon:bats', 'weapon:lava', 'weapon:lightning', 'weapon:minions', 'weapon:spring', 'weapon:saw', 'weapon:frost', 'weapon:tornado', 'weapon:boomerang',
  'passive:might', 'passive:haste', 'passive:boots', 'passive:heart', 'passive:magnet', 'passive:regen',
  'limit:might', 'limit:haste', 'limit:hp', 'limit:speed', 'snack',
] as const;
export const NIGHT_OUTCOMES = ['survived', 'hp', 'vault'] as const;
export const SEASON_OUTCOMES = ['win', 'hp', 'vault', 'quit'] as const;
export const ERROR_CODES = ['script', 'webgl', 'audio', 'storage', 'network'] as const;
export const DEVICES = ['mobile', 'tablet', 'desktop'] as const;
export const BROWSERS = ['Safari', 'Chrome', 'Firefox', 'Edge', 'other'] as const;
export const LOCALES = ['pt', 'en', 'es', 'other'] as const;
export const PHASES = ['title', 'build', 'raid', 'dawn', 'over'] as const;

export type BossKey = (typeof BOSS_IDS)[number];
export type TierKey = (typeof TIER_IDS)[number];
export type BuildingKey = (typeof BUILDING_IDS)[number];
export type PickKey = (typeof PICK_IDS)[number];
export type NightOutcome = (typeof NIGHT_OUTCOMES)[number];
export type SeasonOutcome = (typeof SEASON_OUTCOMES)[number];
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface EventContext {
  sessionId: string;
  visitorId?: string;
  /** Owner and scripted test traffic, set explicitly with ?test=1, never guessed. */
  test?: boolean;
  device: (typeof DEVICES)[number];
  browser: (typeof BROWSERS)[number];
  locale: (typeof LOCALES)[number];
}

/** A season is a random id made when it starts; it is never the game's seed. */
export interface NightReport {
  season: string;
  night: number; // 1..7
  outcome: NightOutcome;
  seconds: number;
  hpPct: number; // 0..100 at the end of the night
  vaultKept: number; // gold in the vault at the end
  stolen: number;
  kills: number;
  buildingKillPct: number; // 0..100
  level: number;
  retries: number; // retries so far this season
  damage: { contact: number; arrows: number; champion: number };
  buildings: Partial<Record<BuildingKey, number>>;
  destroyed: number;
  /** Thieves that reached the vault, and coins they pocketed there for good (added later; older reports lack them). */
  grabs?: number;
  pocketed?: number;
}

export interface BuildReport {
  season: string;
  night: number;
  seconds: number;
  spent: number;
  gold: number; // treasure left when the night starts
  placed: Partial<Record<BuildingKey, number>>;
  sold: number;
  repaired: boolean;
}

export type GameEvent = EventContext & (
  | { type: 'visit' }
  | { type: 'landing' }
  | { type: 'season_start'; season: string; boss: BossKey; tier: TierKey; continued: boolean }
  | { type: 'build'; build: BuildReport }
  | { type: 'night'; report: NightReport }
  | { type: 'pick'; season: string; night: number; level: number; offered: PickKey[]; picked: PickKey }
  | { type: 'season_end'; season: string; outcome: SeasonOutcome; nights: number; score: number; retries: number; level: number; seconds: number; allPicksAt: number | null }
  | { type: 'settings'; music: boolean; sfx: boolean }
  | { type: 'perf'; fpsMedian: number; fpsLow: number }
  | { type: 'name'; accepted: boolean }
  | { type: 'client_error'; code: ErrorCode }
  /** Sent once a minute while the game is open and visible, so the dashboard can show who is playing now. */
  | { type: 'ping'; phase: (typeof PHASES)[number]; night: number }
);

export type Traffic = 'real' | 'test' | 'all';

export interface Count { key: string; n: number }

export interface NightStats {
  night: number;
  attempts: number;
  survived: number;
  hp: number;
  vault: number;
  medianHpPct: number | null;
  medianVaultKept: number | null;
  medianBuildingKillPct: number | null;
  medianLevel: number | null;
  damageShare: { contact: number; arrows: number; champion: number };
}

/** One recent season, night by night, for reading a single game. Kinds and numbers only. */
export interface SeasonDetail {
  startedAt: string;
  boss: string;
  tier: string;
  outcome: string | null;
  score: number | null;
  retries: number;
  weapons: string[];
  nights: {
    night: number; outcome: string; seconds: number;
    /** Gold before building, spent building, and in the vault when the raid began. */
    goldBefore: number | null; spent: number | null; goldStart: number | null;
    stolen: number; grabs: number | null; pocketed: number | null; vaultKept: number;
    kills: number; hpPct: number; buildingKillPct: number; level: number; buildings: number; destroyed: number;
  }[];
}

export interface Summary {
  generatedAt: string;
  period: { days: number; from: string; to: string };
  trackingSince: string | null;
  traffic: Traffic;
  audience: {
    sessions: number;
    visitors: number;
    newVisitors: number;
    returningVisitors: number;
    /** Every browser seen, landing-page-only visitors included. */
    browsersSeen: number;
    /** Players by device and browser ("mobile|Safari"), to spot one person's several browsers. */
    playerDevices: Count[];
    medianSessionMinutes: number | null;
    /** Sessions that saw the landing page, and how many of those went on to open the game. */
    landing: { sessions: number; played: number };
    daily: { date: string; sessions: number; seasons: number; visitors: number; newVisitors: number; returning: number; wins: number }[];
    devices: Count[];
    browsers: Count[];
    locales: Count[];
    countries: Count[];
  };
  funnel: { key: string; label: string; n: number }[];
  /** Sessions by weekday (Sunday = 0) and hour, Chicago time, for the when-do-they-play heatmap. */
  hours: { weekday: number; hour: number; sessions: number }[];
  /** Who is playing right now: browsers whose game sent anything in the last few minutes, any period. */
  live: { windowMinutes: number; playing: number; inRaid: number; lastEventAt: string | null; now: { device: string; phase: string; night: number }[] };
  /** The latest things that happened, newest first. Never names or ids: only kinds and categories. */
  activity: Activity[];
  /** The latest seasons of the period, newest first, night by night. */
  recent: SeasonDetail[];
  /** The same headline numbers for the period just before, so cards can show a change. */
  previous: { available: boolean; visitors: number; returning: number; seasons: number; wins: number } | null;
  seasons: {
    started: number;
    finished: number;
    wins: number;
    outcomes: Count[];
    medianNights: number | null;
    medianScore: number | null;
    retriesPerSeason: number | null;
    continuedShare: number | null;
  };
  nights: NightStats[];
  tiers: { key: string; started: number; wins: number; medianNights: number | null }[];
  bosses: { key: string; started: number; wins: number; medianNights: number | null }[];
  picks: { key: string; offered: number; picked: number; rate: number }[];
  firstPickAllAt: { medianMinutes: number | null; seasons: number };
  builds: {
    night: number;
    phases: number;
    medianSpent: number | null;
    placed: Partial<Record<BuildingKey, number>>;
    medianSeconds: number | null;
    repairedShare: number | null;
  }[];
  tech: {
    fps: { device: string; samples: number; median: number | null; low: number | null }[];
    errors: Count[];
    musicOffShare: number | null;
    sfxOffShare: number | null;
    nameRejectedShare: number | null;
  };
}

export interface Activity {
  at: string;
  kind: 'visit' | 'start' | 'win' | 'lost' | 'quit';
  boss?: string;
  tier?: string;
  night?: number;
  outcome?: string;
  device: string;
  country: string;
}

/** A leaderboard row as the public board serves it. */
export interface BoardRow { name: string; score: number; boss: BossKey; tier: TierKey; nights: number; win: boolean; at: number; me?: boolean }
