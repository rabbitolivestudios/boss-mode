// Heroes carry online-style gamer tags: the joke is that YOU are the raid boss they queued up for.
const A = ['Bacon', 'Turbo', 'Pixel', 'Noob', 'Epic', 'Toast', 'Ninja', 'Sweaty', 'Cheese', 'Laggy', 'Pro', 'Mega', 'Chunky', 'Goofy', 'Rizz', 'Default', 'Speedy', 'Blocky', 'Sus', 'Nugget'];
const B = ['Slayer', 'Gamer', 'Knight', 'Bro', 'Legend', 'Hero', 'Sniper', 'King', 'Dude', 'Master', 'Potato', 'Warrior', 'Goblin', 'Wizard', 'Builder', 'Dragon'];

export function gamerTag(r: () => number = Math.random): string {
  const a = A[Math.floor(r() * A.length)];
  const b = B[Math.floor(r() * B.length)];
  const n = Math.floor(r() * 9999);
  switch (Math.floor(r() * 5)) {
    case 0: return `xX_${a}${b}_Xx`;
    case 1: return `${a}${b}${n}`;
    case 2: return `${a}_${b}`;
    case 3: return `i_am_${a.toLowerCase()}`;
    default: return `${a}${b}${2010 + (n % 15)}`;
  }
}
