import * as THREE from 'three';
import { BOSS_PARTS, FACES, bossUnit, type BossAtlas, type Face } from './bossart';
import { PARTS, type PartId, type PuppetAtlas } from './cast';
import type { BossId } from './config';
import type { SpriteBatch } from './paper';

// Animates the paper puppets: every piece swings about its joint, driven by the hero's state.
// Angles are in the puppet's own 2D plane (facing right, counter-clockwise positive), so a positive
// leg or arm angle moves the hand or foot forward.

export type Action = 'swing' | 'shoot' | 'raise';

export interface PuppetPose {
  x: number; y: number; z: number;
  size: number;
  /** -1..1 facing; passes through 0 during the card-flip turn. */
  face: number;
  roll?: number;
  lean?: number;
  /** 0..1 how much of the walk cycle to apply. */
  walk: number;
  phase: number;
  time: number;
  /** Per-character offset so idle motion is never in lockstep across the crowd. */
  seed: number;
  action?: Action;
  /** 0..1 progress through the action, or 0 when none is playing. */
  act?: number;
  /** 0..1 recent-hit reaction. */
  hit?: number;
  air?: boolean;
  flash?: number;
}

const LAYER = 0.012;
const ATTACHED_TO_BODY: Record<PartId, boolean> = { back: true, armB: true, legB: false, body: true, legF: false, head: true, armF: true };

export class PuppetRig {
  private base = new THREE.Matrix4();
  private hip = new THREE.Matrix4();
  private body = new THREE.Matrix4();
  private m = new THREE.Matrix4();
  private r = new THREE.Matrix4();
  private out = new THREE.Matrix4();

  constructor(private batch: SpriteBatch, private atlas: PuppetAtlas) {}

  draw(castIndex: number, p: PuppetPose): void {
    this.batch.standeeMatrix({ x: p.x, y: p.y, z: p.z, w: p.size, h: p.size, face: p.face, roll: p.roll, lean: p.lean }, this.base);
    const angles = this.angles(p);
    const hit = p.hit ?? 0;
    const breathe = 1 + Math.sin(p.time * 3 + p.seed) * 0.022;
    const s = Math.sin(p.phase);
    // The body rises on the passing pose (legs together) and leans into the walk.
    const bob = p.air ? 0 : 0.03 * p.walk * (1 - Math.abs(s));
    const joints = this.atlas.joints[castIndex];
    const [hx, hy] = joints[PARTS.indexOf('body')];

    this.hip.makeTranslation(0, bob, 0);
    this.body.copy(this.hip)
      .multiply(this.m.makeTranslation(hx, hy, 0))
      .multiply(this.r.makeRotationZ(-0.07 * p.walk + angles.body))
      .multiply(this.m.makeScale(1 + hit * 0.16, (1 - hit * 0.16) * breathe, 1))
      .multiply(this.m.makeTranslation(-hx, -hy, 0));

    PARTS.forEach((part, i) => {
      const cell = this.atlas.cells[castIndex * PARTS.length + i];
      if (cell < 0) return;
      const [jx, jy] = joints[i];
      this.out.copy(this.base)
        .multiply(ATTACHED_TO_BODY[part] ? this.body : this.hip)
        .multiply(this.m.makeTranslation(jx, jy, i * LAYER))
        .multiply(this.r.makeRotationZ(angles[part]))
        .multiply(this.m.makeTranslation(-jx, -jy, 0));
      // Capes and heads flutter; limbs stay crisp so the swing reads clearly.
      const flutter = part === 'back' || part === 'head' ? p.seed + i : -1;
      this.batch.pushMatrix(this.out, cell, p.flash ?? 0, flutter);
    });
  }

  private angles(p: PuppetPose): Record<PartId, number> & { body: number } {
    const s = Math.sin(p.phase);
    const idle = Math.sin(p.time * 2.2 + p.seed);
    const w = p.walk;
    const a = {
      back: 0.18 * w + Math.sin(p.time * 5 + p.seed) * 0.08,
      armB: 0.55 * s * w + idle * 0.06,
      legB: -0.55 * s * w,
      body: 0,
      legF: 0.55 * s * w,
      head: 0.06 * Math.sin(p.phase * 2 + 1) * w + idle * 0.04 + (p.hit ?? 0) * 0.45,
      armF: -0.55 * s * w - idle * 0.06,
    };
    if (p.air) {
      // Launched: limbs flail and the head whips around.
      a.armF = 2.3 + Math.sin(p.time * 22 + p.seed) * 0.7;
      a.armB = 2.1 + Math.cos(p.time * 19 + p.seed) * 0.7;
      a.legF = Math.sin(p.time * 17 + p.seed) * 0.7;
      a.legB = -Math.sin(p.time * 17 + p.seed) * 0.7;
      a.head = Math.sin(p.time * 14) * 0.3;
      a.back = 0.6;
    }
    const k = p.act ?? 0;
    if (k > 0) {
      const arc = Math.sin(k * Math.PI);
      if (p.action === 'swing') {
        // Wind up overhead, then chop down past the resting angle.
        a.armF = k < 0.4 ? THREE.MathUtils.lerp(a.armF, 2.6, k / 0.4) : THREE.MathUtils.lerp(2.6, -0.5, (k - 0.4) / 0.6);
        a.body = k < 0.4 ? 0.12 : -0.14;
      } else if (p.action === 'shoot') {
        a.armF = 1.45 - (k > 0.7 ? (k - 0.7) * 1.2 : 0);
        a.armB = 1.2 + arc * 0.25;
      } else if (p.action === 'raise') {
        a.armF = 2.2 * arc;
        a.head = -0.15 * arc;
      }
    }
    return a;
  }
}

// ---------- Bosses ----------

export interface BossPuppetPose {
  x: number; z: number; y: number;
  size: number;
  face: number;
  roll?: number;
  time: number;
  /** 0..1 how hard the boss is walking. */
  moving: number;
  /** 0..1 progress of the current attack, 0 when none. */
  act: number;
  /** 0..1 flinch after being hit. */
  hurt: number;
  expr: Face;
}

interface Motion { rot?: number; dx?: number; dy?: number; sx?: number; sy?: number }

/** How each boss piece moves. Offsets are in unit-quad space (1 = the boss's full height). */
const BOSS_MOTION: Record<BossId, (part: string, p: BossPuppetPose) => Motion> = {
  dragon: (part, p) => {
    const t = p.time, mv = p.moving, lunge = Math.sin(p.act * Math.PI);
    const step = Math.sin(t * 9) * mv;
    switch (part) {
      case 'wing': return { rot: Math.sin(t * (5 + mv * 7)) * (0.25 + mv * 0.2) - lunge * 0.3 };
      case 'tail': return { rot: Math.sin(t * 4) * 0.22 + mv * 0.1 };
      case 'legB': return { rot: 0.4 * step };
      case 'legF': return { rot: -0.4 * step };
      case 'body': return { dy: Math.abs(step) * 0.025 + Math.sin(t * 3) * 0.006, rot: -0.05 * mv, sy: 1 + Math.sin(t * 3) * 0.02 };
      case 'head': return { rot: Math.sin(t * 3) * 0.05 - lunge * 0.28 + p.hurt * 0.3, dx: lunge * 0.05 };
      default: return {};
    }
  },
  slime: (part, p) => {
    const t = p.time, mv = p.moving;
    const crouch = Math.sin(p.act * Math.PI);
    const wob = Math.sin(t * (4 + mv * 6)) * (0.04 + mv * 0.05);
    const sy = 1 + wob - crouch * 0.22 + p.hurt * 0.1;
    switch (part) {
      case 'body': return { sy, sx: 1 / Math.sqrt(Math.max(0.5, sy)), dy: p.act > 0.5 ? crouch * 0.12 : 0 };
      case 'face': return { rot: Math.sin(t * 2) * 0.04, dy: -crouch * 0.02 };
      // The crown bounces a beat behind the body, like it is only loosely balanced.
      case 'crown': return { dy: Math.sin(t * (4 + mv * 6) - 1) * 0.025 + crouch * 0.06, rot: Math.sin(t * 3) * 0.1 - p.hurt * 0.25 };
      default: return {};
    }
  },
  bonelord: (part, p) => {
    const t = p.time, mv = p.moving, raise = Math.sin(p.act * Math.PI);
    switch (part) {
      case 'body': return { dy: 0.035 + Math.sin(t * 2.5) * 0.02, rot: -0.04 * mv };
      case 'cape': return { rot: Math.sin(t * (2 + mv * 4)) * 0.1 + mv * 0.12 };
      case 'skull': return { rot: Math.sin(t * 1.3) * 0.1 + p.hurt * 0.3 - raise * 0.1 };
      case 'staff': return { rot: Math.sin(t * 2) * 0.08 + raise * 0.35, dy: raise * 0.08 };
      default: return {};
    }
  },
};

export class BossRig {
  private base = new THREE.Matrix4();
  private body = new THREE.Matrix4();
  private m = new THREE.Matrix4();
  private out = new THREE.Matrix4();

  constructor(private batch: SpriteBatch, private atlas: BossAtlas) {}

  draw(id: BossId, p: BossPuppetPose): void {
    this.batch.standeeMatrix({ x: p.x, y: p.y, z: p.z, w: p.size, h: p.size, face: p.face, roll: p.roll }, this.base);
    const parts = BOSS_PARTS[id];
    const motion = BOSS_MOTION[id];
    const bodyPart = parts.find((q) => q.id === 'body');
    this.body.identity();
    if (bodyPart) this.local(this.body.identity(), bossUnit(...bodyPart.joint), motion('body', p));
    parts.forEach((part, i) => {
      const cells = this.atlas.cell[id][i];
      const cell = part.face ? cells[FACES.indexOf(p.expr)] : cells[0];
      this.out.copy(this.base).multiply(this.m.makeTranslation(0, 0, i * 0.012));
      if (part.id === 'body' || part.parent === 'body') this.out.multiply(this.body);
      if (part.id !== 'body') this.local(this.out, bossUnit(...part.joint), motion(part.id, p));
      this.batch.pushMatrix(this.out, cell, 0, part.id === 'cape' || part.id === 'wing' ? i * 1.3 : -1);
    });
  }

  /** Applies a piece's motion about its joint: offset, then rotate and scale around the joint. */
  private local(target: THREE.Matrix4, [jx, jy]: [number, number], mo: Motion): void {
    target
      .multiply(this.m.makeTranslation(jx + (mo.dx ?? 0), jy + (mo.dy ?? 0), 0))
      .multiply(this.m.makeRotationZ(mo.rot ?? 0))
      .multiply(this.m.makeScale(mo.sx ?? 1, mo.sy ?? 1, 1))
      .multiply(this.m.makeTranslation(-jx, -jy, 0));
  }
}
