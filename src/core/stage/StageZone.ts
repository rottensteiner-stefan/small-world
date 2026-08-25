/**
 * A 2D point defining a corner vertex of a stage zone, in normalized image space (0..1 on both
 * axes, matching the background art's own pixel grid -- u=0 left edge, v=0 top edge).
 */
export interface StagePoint2D {
  u: number;
  v: number;
  /** Uniform character scale at this corner (default: 1.0). Used for forced-perspective
   * shrinking as the character "recedes" into the painted background -- see `getScaleAt`. */
  scale?: number;
}

/**
 * Configuration options for creating a StageZone.
 */
export interface StageZoneOptions {
  id: string;
  name: string;
  /** 4 corner points in order, tracing the polygon's perimeter (either winding direction). */
  points: [StagePoint2D, StagePoint2D, StagePoint2D, StagePoint2D];
}

/**
 * A walkable region of a 2.5D stage, traced directly on top of a painted background image in
 * that image's own normalized (u, v) space -- no camera, no world coordinates, no perspective
 * reconstruction. This intentionally mirrors how classic 2.5D adventures (Grim Fandango, Monkey
 * Island) author walk masks: an artist draws a shape directly on the picture, and a small
 * per-corner `scale` fakes the size falloff a real camera would produce. There is no rectangle
 * or vanishing-point constraint on the shape -- it's exactly what you see, not a projection of
 * an assumed real-world form.
 */
export class StageZone {
  public readonly id: string;
  public readonly name: string;
  public readonly points: [
    { u: number; v: number; scale: number },
    { u: number; v: number; scale: number },
    { u: number; v: number; scale: number },
    { u: number; v: number; scale: number },
  ];

  constructor(options: StageZoneOptions) {
    this.id = options.id;
    this.name = options.name;
    this.points = options.points.map((p) => ({ u: p.u, v: p.v, scale: p.scale ?? 1.0 })) as [
      { u: number; v: number; scale: number },
      { u: number; v: number; scale: number },
      { u: number; v: number; scale: number },
      { u: number; v: number; scale: number },
    ];
  }

  /**
   * Point-in-polygon test using Ray-Casting (Even-Odd rule) with optional edge tolerance.
   * Works for both convex and concave quadrilaterals.
   * @param u Normalized image-space X (0..1).
   * @param v Normalized image-space Y (0..1).
   * @param tolerance Optional distance buffer (in the same 0..1 units) for seamless transitions
   * between adjoining zones.
   */
  public containsPoint(u: number, v: number, tolerance: number = 0.0): boolean {
    const pts = this.points;
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const ui = pts[i]!.u;
      const vi = pts[i]!.v;
      const uj = pts[j]!.u;
      const vj = pts[j]!.v;

      const intersect = vi > v !== vj > v && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui;
      if (intersect) inside = !inside;
    }

    if (inside) return true;

    if (tolerance > 0) {
      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i]!;
        const p2 = pts[(i + 1) % pts.length]!;
        const dSq = this._distToSegmentSquared(u, v, p1.u, p1.v, p2.u, p2.v);
        if (dSq <= tolerance * tolerance) return true;
      }
    }

    return false;
  }

  private _distToSegmentSquared(
    pu: number,
    pv: number,
    u1: number,
    v1: number,
    u2: number,
    v2: number,
  ): number {
    const l2 = (u2 - u1) * (u2 - u1) + (v2 - v1) * (v2 - v1);
    if (l2 === 0) return (pu - u1) * (pu - u1) + (pv - v1) * (pv - v1);
    let t = ((pu - u1) * (u2 - u1) + (pv - v1) * (v2 - v1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projU = u1 + t * (u2 - u1);
    const projV = v1 + t * (v2 - v1);
    return (pu - projU) * (pu - projU) + (pv - projV) * (pv - projV);
  }

  /**
   * Interpolates the character scale factor at given (u, v) coordinates using barycentric
   * interpolation across the quad's two triangles (p0-p1-p2 and p0-p2-p3).
   */
  public getScaleAt(u: number, v: number): number {
    const [p0, p1, p2, p3] = this.points;

    const t1 = this._barycentricScale(p0, p1, p2, u, v);
    if (t1 !== null) return t1;

    const t2 = this._barycentricScale(p0, p2, p3, u, v);
    if (t2 !== null) return t2;

    // Fallback: average across all 4 corners (point technically outside the quad, e.g. a
    // slightly-off drag or a concave shape's notch).
    return (p0.scale + p1.scale + p2.scale + p3.scale) * 0.25;
  }

  /**
   * Derives this zone's local movement basis from its corner points: `forward` points from the
   * near edge (P0-P1) toward the far edge (P3-P2), and `right` points from the left edge (P0-P3)
   * toward the right edge (P1-P2). A zone traced onto a perspective background is rarely
   * axis-aligned, so character input (WASD) must be mapped through this basis instead of fixed
   * screen axes -- otherwise "forward" stops meaning "deeper into the painted corridor" the
   * moment the zone's shape is angled to fit the art.
   */
  public getLocalAxes(): { forward: { u: number; v: number }; right: { u: number; v: number } } {
    const [p0, p1, p2, p3] = this.points;

    const forwardU = (p3.u - p0.u + (p2.u - p1.u)) * 0.5;
    const forwardV = (p3.v - p0.v + (p2.v - p1.v)) * 0.5;
    const rightU = (p1.u - p0.u + (p2.u - p3.u)) * 0.5;
    const rightV = (p1.v - p0.v + (p2.v - p3.v)) * 0.5;

    return {
      forward: StageZone._normalize2D(forwardU, forwardV, 0, -1),
      right: StageZone._normalize2D(rightU, rightV, 1, 0),
    };
  }

  private static _normalize2D(
    u: number,
    v: number,
    fallbackU: number,
    fallbackV: number,
  ): { u: number; v: number } {
    const len = Math.sqrt(u * u + v * v);
    if (len < 0.00001) return { u: fallbackU, v: fallbackV };
    return { u: u / len, v: v / len };
  }

  private _barycentricScale(
    a: { u: number; v: number; scale: number },
    b: { u: number; v: number; scale: number },
    c: { u: number; v: number; scale: number },
    pu: number,
    pv: number,
  ): number | null {
    const det = (b.v - c.v) * (a.u - c.u) + (c.u - b.u) * (a.v - c.v);
    if (Math.abs(det) < 0.00001) return null;

    const w1 = ((b.v - c.v) * (pu - c.u) + (c.u - b.u) * (pv - c.v)) / det;
    const w2 = ((c.v - a.v) * (pu - c.u) + (a.u - c.u) * (pv - c.v)) / det;
    const w3 = 1.0 - w1 - w2;

    if (w1 >= -0.01 && w2 >= -0.01 && w3 >= -0.01) {
      return w1 * a.scale + w2 * b.scale + w3 * c.scale;
    }

    return null;
  }
}
