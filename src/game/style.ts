export type StyleId = 'classic' | 'paper' | 'dungeon' | 'diorama';

export const STYLES: { id: StyleId; label: string }[] = [
  { id: 'paper', label: '📄 Paper' },
  { id: 'dungeon', label: '🔥 Dungeon' },
  { id: 'diorama', label: '🗺️ Diorama' },
  { id: 'classic', label: '🧱 Classic' },
];

/** The look is chosen per page load (`?style=paper`), since each style builds a different scene. */
export function currentStyle(): StyleId {
  const q = new URLSearchParams(location.search).get('style');
  return STYLES.some((s) => s.id === q) ? (q as StyleId) : 'classic';
}
