export type StyleId = 'classic' | 'paper' | 'dungeon' | 'diorama';

export const STYLES: { id: StyleId; label: string }[] = [
  { id: 'paper', label: '📄 Paper' },
  { id: 'dungeon', label: '🔥 Dungeon' },
  { id: 'diorama', label: '🗺️ Diorama' },
  { id: 'classic', label: '🧱 Classic' },
];

/**
 * Paper is the game's look. The other styles stay reachable by URL (`?style=classic`) as reference
 * while the paper art matures; each builds a different scene, so the choice is per page load.
 */
export function currentStyle(): StyleId {
  const q = new URLSearchParams(location.search).get('style');
  return STYLES.some((s) => s.id === q) ? (q as StyleId) : 'paper';
}
