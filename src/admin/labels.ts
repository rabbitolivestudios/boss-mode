/** Display names for the ids the analytics contract uses. */

export const BOSS: Record<string, string> = { dragon: '🐉 Blaze', slime: '🟢 Gloop', bonelord: '💀 Rattles' };
export const TIER: Record<string, string> = { chill: 'Chill', normal: 'Normal', heroic: 'Heroic', legendary: 'Legendary' };
export const PICK: Record<string, string> = {
  'weapon:stomp': 'Ground Pound', 'weapon:fireball': 'Fireball', 'weapon:bats': 'Bat Swarm', 'weapon:lava': 'Lava Pools', 'weapon:lightning': 'Lightning',
  'weapon:minions': 'Summon Goblins', 'weapon:spring': 'Spring Trap', 'weapon:saw': 'Saw Blades', 'passive:might': 'Might', 'passive:haste': 'Haste',
  'passive:boots': 'Boots', 'passive:heart': 'Big Heart', 'passive:magnet': 'Magnet', 'passive:regen': 'Regen', 'limit:might': 'Limit: Power',
  'limit:haste': 'Limit: Speed Up', 'limit:hp': 'Limit: Toughness', 'limit:speed': 'Limit: Speed', snack: 'Snack (heal)',
};
export const BUILDINGS = ['wall', 'spikes', 'pad', 'saw', 'tower'] as const;
export const BUILDING: Record<string, string> = { wall: 'Wall', spikes: 'Spike pit', pad: 'Launch pad', saw: 'Saw blade', tower: 'Bone archer' };
export const DEVICE: Record<string, string> = { mobile: 'Phone', tablet: 'Tablet', desktop: 'Computer' };
export const LOCALE: Record<string, string> = { pt: 'Portuguese', en: 'English', es: 'Spanish', other: 'Other' };
