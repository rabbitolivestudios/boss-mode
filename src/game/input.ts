/** Keyboard + a floating touch joystick that appears wherever the thumb lands. */
export class Input {
  private keys = new Set<string>();
  private touchId: number | null = null;
  private origin = { x: 0, y: 0 };
  private stick = { x: 0, y: 0 };
  onRoar: () => void = () => {};
  onPause: () => void = () => {};
  /** Off during the build phase, when taps place buildings instead of moving the boss. */
  joystick = true;

  constructor(private base: HTMLElement, private knob: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space') { this.onRoar(); e.preventDefault(); }
      if (e.code === 'Escape' || e.code === 'KeyP') this.onPause();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    const surface = document.getElementById('touch-surface');
    if (!surface) throw new Error('missing #touch-surface');
    surface.addEventListener('pointerdown', (e) => {
      if (!this.joystick || this.touchId !== null) return;
      this.touchId = e.pointerId;
      this.origin = { x: e.clientX, y: e.clientY };
      this.stick = { x: 0, y: 0 };
      this.base.style.display = 'block';
      this.base.style.left = `${e.clientX}px`;
      this.base.style.top = `${e.clientY}px`;
      this.knob.style.transform = 'translate(-50%, -50%)';
      surface.setPointerCapture(e.pointerId);
    });
    surface.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.touchId) return;
      const max = 55;
      let dx = e.clientX - this.origin.x;
      let dy = e.clientY - this.origin.y;
      const len = Math.hypot(dx, dy);
      if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
      this.stick = { x: dx / max, y: dy / max };
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    });
    const end = (e: PointerEvent) => {
      if (e.pointerId !== this.touchId) return;
      this.touchId = null;
      this.stick = { x: 0, y: 0 };
      this.base.style.display = 'none';
    };
    surface.addEventListener('pointerup', end);
    surface.addEventListener('pointercancel', end);
  }

  /** Returns a direction on the ground plane with length 0..1. */
  move(): { x: number; z: number } {
    let x = 0;
    let z = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) z -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) z += 1;
    x += this.stick.x;
    z += this.stick.y;
    const len = Math.hypot(x, z);
    if (len > 1) { x /= len; z /= len; }
    // Tiny thumb wobble should not make the boss drift.
    if (len < 0.15) return { x: 0, z: 0 };
    return { x, z };
  }
}
