import * as THREE from 'three';

// Heroes talk like players in a lobby. Short, kid-safe trash talk in comic speech bubbles.

export const LINES = {
  taunt: ['1v1 me bro', 'ez loot', 'get the boss!', 'who is carrying??', 'trust me im pro', 'noob boss lol', 'LETS GOOO', 'is that the boss?', 'brb', 'my ping is 900', 'follow me!', 'i have a plan', 'free xp!', 'wait for me!!'],
  launched: ['AAAAH', 'wheee!', 'not the face!', 'LAG!!', 'report bug!', 'i can fly!', 'nooooo', 'mom look!'],
  defeated: ['gg', 'rip', 'no fair!', 'i lagged', 'respawn pls', 'nerf boss', 'ok that was sick'],
  squad: ['SQUAD UP!', 'surround it!', 'now, team!'],
  grab: ['mine now!', 'shiny!!', 'ez loot', 'yoink', 'free gold lol', 'nobody saw that'],
  escaped: ['ez loot', 'gg no re', 'see ya boss!', 'LOOT GET', 'too slow!'],
};

export const CHAMPION_LINES = ['SQUAD, ASSEMBLE!', 'Behold... a TRYHARD!', 'No scope. No mercy.', '1v1 me. No items.', 'Nobody dies on MY watch!', 'Yoink! Your gold is MINE!', 'It is my DESTINY!'];

interface Bubble { el: HTMLDivElement; target: { x: number; z: number; alive?: boolean }; x: number; z: number; height: number; life: number; age: number }

const MAX = 5;

export class Chatter {
  private pool: HTMLDivElement[] = [];
  private live: Bubble[] = [];
  private v = new THREE.Vector3();

  constructor(layer: HTMLElement, private camera: THREE.Camera) {
    for (let i = 0; i < MAX; i++) {
      const el = document.createElement('div');
      el.className = 'bubble';
      el.style.display = 'none';
      layer.appendChild(el);
      this.pool.push(el);
    }
  }

  get busy(): number { return this.live.length; }

  /** Returns false when every bubble is in use, so callers can skip rather than queue chatter. */
  say(target: { x: number; z: number; alive?: boolean }, text: string, height: number, big = false): boolean {
    if (this.live.some((b) => b.target === target)) return false;
    const el = this.pool.pop() ?? (big ? this.live.shift()?.el : undefined);
    if (!el) return false;
    el.textContent = text;
    el.className = big ? 'bubble big' : 'bubble';
    el.style.display = 'block';
    this.live.push({ el, target, x: target.x, z: target.z, height, life: big ? 2.8 : 1.9, age: 0 });
    return true;
  }

  update(dt: number): void {
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = this.live.length - 1; i >= 0; i--) {
      const b = this.live[i];
      b.life -= dt;
      if (b.target.alive !== false) { b.x = b.target.x; b.z = b.target.z; }
      if (b.life <= 0) { b.el.style.display = 'none'; this.pool.push(b.el); this.live.splice(i, 1); continue; }
      this.v.set(b.x, b.height, b.z).project(this.camera);
      b.age += dt;
      const pop = Math.min(1, b.age * 8);
      b.el.style.transform = `translate(${(this.v.x * 0.5 + 0.5) * w}px, ${(-this.v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%) scale(${0.6 + pop * 0.4})`;
      b.el.style.opacity = String(Math.min(1, b.life * 4));
    }
  }

  clear(): void {
    for (const b of this.live) { b.el.style.display = 'none'; this.pool.push(b.el); }
    this.live.length = 0;
  }
}

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}
