/**
 * Player-chosen leaderboard names, with a filter for known offensive words. The players are 10 to 14,
 * so the filter errs on the side of blocking; it guards against the obvious and is not a moderator.
 * English and Portuguese, since both are spoken by the first players.
 */

export const NAME_MAX = 16;
const NAME_MIN = 2;

/** Blocked anywhere in a name, even inside a longer word: roots long or rare enough not to hide in innocent words. */
const ANYWHERE = [
  // English
  'fuck', 'fuk', 'fck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'penis', 'vagina', 'boob', 'tits', 'titty',
  'whore', 'slut', 'bastard', 'asshole', 'wank', 'jizz', 'dildo', 'porn', 'sex', 'nude', 'naked',
  'nigg', 'fag', 'retard', 'tranny', 'dyke', 'chink', 'kike', 'wetback', 'gook',
  'nazi', 'hitler', 'rapist', 'pedo', 'molest', 'kkk', 'suicide', 'killyourself', 'horny',
  'orgasm', 'erection', 'milf', 'bollock', 'twat', 'douche', 'butthole', 'dumbass', 'jackass', 'badass',
  // Portuguese
  'porra', 'caralho', 'merda', 'buceta', 'boceta', 'puta', 'foda', 'fode', 'viado', 'bosta', 'piroca',
  'cacete', 'arrombad', 'xoxota', 'punheta', 'siririca', 'vadia', 'safad', 'otario', 'babaca',
  'desgraca', 'corno', 'sapatao', 'estupr', 'filhodaputa',
];

/** Blocked only as a whole word, because inside words they are innocent (class, bass, cup, Scunthorpe...). */
const WHOLE_WORD = [
  'ass', 'arse', 'cum', 'rape', 'raped', 'raper', 'anal', 'coon', 'spic', 'prick', 'piss', 'crap', 'damn', 'kys', 'hoe', 'hoes', 'tit', 'nig', 'nigga',
  'cu', 'pau', 'cus', 'pica', 'teta', 'rola', 'pinto', 'bicha', 'veado', 'macaco', 'fdp', 'vsf', 'tnc', 'pqp', 'krl', 'pnc',
];

/** Innocent words that contain a blocked root (the Scunthorpe problem); they are cut out before checking. */
const ALLOW = [
  'peacock', 'hancock', 'hitchcock', 'cockatoo', 'cockatiel', 'cockpit', 'cocktail', 'cockroach', 'cockerel', 'woodcock',
  'dickens', 'dickinson', 'scunthorpe', 'sussex', 'essex', 'middlesex', 'therapist', 'shitake', 'shiitake',
  'comput', 'reput', 'disput', 'amput', 'deput', 'imput',
];

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '8': 'b', '9': 'g' };

/** Lowercase letters only, with leetspeak and accents undone: "F.u_ck" and "fück" both read as "fuck". */
function letters(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[0-9!|@$]/g, (c) => LEET[c] ?? c);
}

/** The ways a name is read: as written, and with stretched letters squashed ("fuuuck" to "fuck"). */
const readings = (s: string): string[] => [s, s.replace(/(.)\1+/g, '$1')];

export function offensive(name: string): boolean {
  const flat = letters(name);
  let joined = flat.replace(/[^a-z]/g, '');
  for (const ok of ALLOW) joined = joined.split(ok).join('_');
  if (readings(joined).some((r) => ANYWHERE.some((w) => r.includes(w)))) return true;
  const words = flat.split(/[^a-z]+/).filter(Boolean);
  // Letters spelled out with gaps ("a s s") are read as one word too.
  if (words.length > 1 && words.every((w) => w.length === 1)) words.push(words.join(''));
  return words.some((w) => readings(w).some((r) => WHOLE_WORD.includes(r)));
}

/** A cleaned name, or the reason it cannot be used, worded for the player. */
export function checkName(raw: string): { name: string } | { error: string } {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name.length < NAME_MIN) return { error: 'Name is too short' };
  if (name.length > NAME_MAX) return { error: `${NAME_MAX} letters max` };
  if (!/^[\p{L}\p{N} _.-]+$/u.test(name)) return { error: 'Letters, numbers and spaces only' };
  if (offensive(name)) return { error: 'That name is not allowed. Try another!' };
  return { name };
}
