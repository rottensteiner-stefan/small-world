import { Vector2D } from "./Vector2D.js";

/**
 * A 2D ray, for planar/cross-section geometry (top-down gameplay logic, sightlines, or a
 * horizontal/vertical slice through a 3D scene -- e.g. tracing a light ray through a prism's
 * triangular cross-section, as `showcases/28` does). For raycasting against full 3D scene
 * geometry, see `src/physix/Ray.ts` instead.
 */
export class Ray2D {
  constructor(
    public origin: Vector2D,
    public direction: Vector2D,
  ) {}

  /**
   * First forward intersection of this ray with segment `a`-`b`, or `undefined` if the ray misses
   * the segment or the segment lies behind the ray's origin.
   */
  public intersectSegment(a: Vector2D, b: Vector2D): Vector2D | undefined {
    const segX = b.x - a.x;
    const segY = b.y - a.y;
    const denom = this.direction.x * segY - this.direction.y * segX;
    if (Math.abs(denom) < 1e-9) return undefined; // parallel
    const diffX = a.x - this.origin.x;
    const diffY = a.y - this.origin.y;
    const t = (diffX * segY - diffY * segX) / denom;
    const u = (diffX * this.direction.y - diffY * this.direction.x) / denom;
    if (t <= 1e-6 || u < 0 || u > 1) return undefined;
    return new Vector2D(this.origin.x + this.direction.x * t, this.origin.y + this.direction.y * t);
  }
}
