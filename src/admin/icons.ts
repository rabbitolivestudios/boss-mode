import {
  Activity, Castle, ChartColumnBig, Clock, Coins, Crown, DoorOpen, ExternalLink, FlaskConical, Gauge, Globe, Hammer, Heart,
  Info, Languages, Lightbulb, LogOut, Monitor, Music, Play, RefreshCw, RotateCcw, Skull, Smartphone, Sparkles, Swords, Tablet,
  Target, Timer, TrendingDown, TrendingUp, TriangleAlert, Trophy, UserPlus, Users, Volume2, Zap,
} from 'lucide';

/** Lucide line icons (ISC licence) rendered to inline SVG strings, sized by CSS. */

type Node = [string, Record<string, string | number>][];

const ICONS = {
  activity: Activity, castle: Castle, chart: ChartColumnBig, clock: Clock, coins: Coins, crown: Crown, door: DoorOpen,
  external: ExternalLink, flask: FlaskConical, gauge: Gauge, globe: Globe, hammer: Hammer, heart: Heart, info: Info,
  languages: Languages, idea: Lightbulb, logout: LogOut, monitor: Monitor, music: Music, play: Play, refresh: RefreshCw,
  returning: RotateCcw, skull: Skull, phone: Smartphone, sparkles: Sparkles, swords: Swords, tablet: Tablet, target: Target,
  timer: Timer, down: TrendingDown, up: TrendingUp, alert: TriangleAlert, trophy: Trophy, newUser: UserPlus, users: Users,
  sound: Volume2, zap: Zap,
} as const satisfies Record<string, unknown>;

export type IconName = keyof typeof ICONS;

export function icon(name: IconName, cls = 'ic'): string {
  const inner = (ICONS[name] as unknown as Node)
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`)
    .join('');
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}
