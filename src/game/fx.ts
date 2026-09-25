import * as THREE from 'three';
import { instanced } from './models';

interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; size: number; color: THREE.Color }
interface Ring { x: number; z: number; r: number; max: number; life: number; color: number; mesh: THREE.Mesh }
interface Bolt { mesh: THREE.Mesh; life: number }
interface Pop { el: HTMLDivElement; x: number; y: number; z: number; life: number }

const MAX_PARTICLES = 700;

export class Fx {
  private parts: Particle[] = [];
  private partMesh: THREE.InstancedMesh;
  private rings: Ring[] = [];
  private ringPool: THREE.Mesh[] = [];
  private bolts: Bolt[] = [];
  private boltPool: THREE.Mesh[] = [];
  private pops: Pop[] = [];
  private popPool: HTMLDivElement[] = [];
  private tmp = new THREE.Object3D();
  private v = new THREE.Vector3();

  constructor(private scene: THREE.Scene, private camera: THREE.Camera, layer: HTMLElement) {
    this.partMesh = instanced(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_PARTICLES);
    scene.add(this.partMesh);
    for (let i = 0; i < 40; i++) {
      const el = document.createElement('div');
      el.className = 'dmg';
      el.style.display = 'none';
      layer.appendChild(el);
      this.popPool.push(el);
    }
  }

  burst(x: number, y: number, z: number, color: number, n: number, speed = 6, size = 0.22): void {
    for (let i = 0; i < n && this.parts.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({
        x, y, z,
        vx: Math.cos(a) * s, vy: 2 + Math.random() * speed, vz: Math.sin(a) * s,
        life: 0.5 + Math.random() * 0.4, max: 0.9, size: size * (0.6 + Math.random() * 0.8), color: new THREE.Color(color),
      });
    }
  }

  ring(x: number, z: number, radius: number, color: number, dur = 0.35): void {
    const mesh = this.ringPool.pop() ?? new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 40),
      new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    (mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    this.scene.add(mesh);
    this.rings.push({ x, z, r: 0, max: radius, life: dur, color, mesh });
  }

  bolt(x: number, z: number): void {
    const mesh = this.boltPool.pop() ?? new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 14, 0.35),
      new THREE.MeshBasicMaterial({ color: 0xfff27a, transparent: true, depthWrite: false }),
    );
    mesh.position.set(x, 7, z);
    mesh.rotation.y = Math.random() * Math.PI;
    this.scene.add(mesh);
    this.bolts.push({ mesh, life: 0.18 });
    this.burst(x, 0.3, z, 0xfff27a, 8, 5, 0.18);
    this.ring(x, z, 1.4, 0xfff27a, 0.2);
  }

  number(x: number, y: number, z: number, value: number, crit: boolean, color?: string): void {
    const el = this.popPool.pop() ?? this.pops.shift()?.el;
    if (!el) return;
    el.textContent = String(Math.round(value));
    el.className = crit ? 'dmg crit' : 'dmg';
    el.style.color = color ?? '';
    el.style.display = 'block';
    this.pops.push({ el, x: x + (Math.random() - 0.5) * 0.6, y, z, life: 0.7 });
  }

  update(dt: number): void {
    let n = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts[i] = this.parts[this.parts.length - 1]; this.parts.pop(); continue; }
      p.vy -= 22 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.4; p.vx *= 0.7; p.vz *= 0.7; }
      this.tmp.position.set(p.x, p.y, p.z);
      this.tmp.rotation.set(p.life * 8, p.life * 5, 0);
      this.tmp.scale.setScalar(p.size * Math.min(1, p.life / 0.3));
      this.tmp.updateMatrix();
      this.partMesh.setMatrixAt(n, this.tmp.matrix);
      this.partMesh.setColorAt(n, p.color);
      n++;
    }
    this.partMesh.count = n;
    this.partMesh.instanceMatrix.needsUpdate = true;
    if (this.partMesh.instanceColor) this.partMesh.instanceColor.needsUpdate = true;

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      r.r += (r.max - r.r) * Math.min(1, dt * 14);
      r.mesh.position.set(r.x, 0.08, r.z);
      r.mesh.scale.setScalar(Math.max(0.01, r.r));
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, r.life * 3);
      if (r.life <= 0) { this.scene.remove(r.mesh); this.ringPool.push(r.mesh); this.rings.splice(i, 1); }
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.life -= dt;
      (b.mesh.material as THREE.MeshBasicMaterial).opacity = b.life / 0.18;
      if (b.life <= 0) { this.scene.remove(b.mesh); this.boltPool.push(b.mesh); this.bolts.splice(i, 1); }
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = this.pops.length - 1; i >= 0; i--) {
      const p = this.pops[i];
      p.life -= dt;
      p.y += dt * 2.2;
      if (p.life <= 0) { p.el.style.display = 'none'; this.popPool.push(p.el); this.pops.splice(i, 1); continue; }
      this.v.set(p.x, p.y, p.z).project(this.camera);
      p.el.style.transform = `translate(${(this.v.x * 0.5 + 0.5) * w}px, ${(-this.v.y * 0.5 + 0.5) * h}px) translate(-50%, -50%) scale(${0.8 + p.life * 0.5})`;
      p.el.style.opacity = String(Math.min(1, p.life * 3));
    }
  }

  clear(): void {
    this.parts.length = 0;
    for (const r of this.rings) { this.scene.remove(r.mesh); this.ringPool.push(r.mesh); }
    this.rings.length = 0;
    for (const b of this.bolts) { this.scene.remove(b.mesh); this.boltPool.push(b.mesh); }
    this.bolts.length = 0;
    for (const p of this.pops) { p.el.style.display = 'none'; this.popPool.push(p.el); }
    this.pops.length = 0;
  }
}
