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
  /** Points in order, tracing the polygon's perimeter (either winding direction). Minimum 3. */
  points: StagePoint2D[];
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
  public readonly points: { u: number; v: number; scale: number }[];

  constructor(options: StageZoneOptions) {
    if (options.points.length < 3) {
      throw new Error(
        `StageZone "${options.id}" needs at least 3 points to form a polygon (got ${options.points.length}).`,
      );
    }
    this.id = options.id;
    this.name = options.name;
    this.points = options.points.map((p) => ({ u: p.u, v: p.v, scale: p.scale ?? 1.0 }));
  }

  /**
   * Point-in-polygon test using Ray-Casting (Even-Odd rule) with optional edge tolerance.
   * Works for both convex and concave polygons of any vertex count.
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

  private _closestPointOnSegment(
    pu: number,
    pv: number,
    u1: number,
    v1: number,
    u2: number,
    v2: number,
  ): { u: number; v: number } {
    const l2 = (u2 - u1) * (u2 - u1) + (v2 - v1) * (v2 - v1);
    if (l2 === 0) return { u: u1, v: v1 };
    let t = ((pu - u1) * (u2 - u1) + (pv - v1) * (v2 - v1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return { u: u1 + t * (u2 - u1), v: v1 + t * (v2 - v1) };
  }

  private _distToSegmentSquared(
    pu: number,
    pv: number,
    u1: number,
    v1: number,
    u2: number,
    v2: number,
  ): number {
    const proj = this._closestPointOnSegment(pu, pv, u1, v1, u2, v2);
    return (pu - proj.u) * (pu - proj.u) + (pv - proj.v) * (pv - proj.v);
  }

  /**
   * Returns the closest point to (u, v) that actually lies on this zone's polygon -- itself if
   * already inside, otherwise the nearest point on its perimeter. Used to pin a character to a
   * zone's drawn boundary instead of letting it linger at a coordinate just outside every zone
   * (which `containsPoint`'s edge tolerance alone would otherwise allow).
   */
  public clampToPolygon(u: number, v: number): { u: number; v: number } {
    if (this.containsPoint(u, v)) return { u, v };

    const pts = this.points;
    let bestDistSq = Infinity;
    let best = { u, v };
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i]!;
      const p2 = pts[(i + 1) % pts.length]!;
      const proj = this._closestPointOnSegment(u, v, p1.u, p1.v, p2.u, p2.v);
      const dSq = (u - proj.u) * (u - proj.u) + (v - proj.v) * (v - proj.v);
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        best = proj;
      }
    }
    return best;
  }

  /**
   * Interpolates the character scale factor at given (u, v) coordinates using barycentric
   * interpolation across a fan of triangles radiating from the first point (points[0], points[i],
   * points[i+1] for i = 1..length-2) -- a quad's classic two-triangle split generalized to any
   * polygon vertex count. Byte-identical to the pre-generalization two-triangle version for
   * quads, since that was already exactly this fan with n=4.
   */
  public getScaleAt(u: number, v: number): number {
    const pts = this.points;
    const p0 = pts[0]!;
    for (let i = 1; i < pts.length - 1; i++) {
      const scale = this._barycentricScale(p0, pts[i]!, pts[i + 1]!, u, v);
      if (scale !== null) return scale;
    }

    // Fallback: average across every corner (point technically outside the polygon, e.g. a
    // slightly-off drag or a concave shape's notch).
    let sum = 0;
    for (const p of pts) sum += p.scale;
    return sum / pts.length;
  }

  /**
   * Derives this zone's local movement basis at a given (u, v) position: `forward` is the
   * direction in which the interpolated `scale` (see `getScaleAt`) decreases fastest -- i.e.
   * "deeper into the painted background" -- and `right` is a 90-degree rotation of it. A zone
   * traced onto a perspective background is rarely axis-aligned, so character input (WASD) must
   * be mapped through this basis instead of fixed screen axes.
   *
   * Every zone shipped today has exactly 4 points, so this keeps the original corner-pair basis
   * (forward from edge P0-P1 toward P3-P2, right from edge P0-P3 toward P1-P2) byte-identical for
   * that case -- it predates and is independent of `scale`, so switching quads to a
   * gradient-based basis would silently change the movement feel of every existing scene. Polygons
   * with a different vertex count use the new scale-gradient basis, computed from the same fan
   * triangulation `getScaleAt` uses; a degenerate or near-zero gradient (e.g. a uniformly-scaled
   * zone) falls back to a fixed basis -- no current content exercises this path since only 4-point
   * zones exist in production today.
   */
  public getLocalAxes(
    u: number,
    v: number,
  ): { forward: { u: number; v: number }; right: { u: number; v: number } } {
    const pts = this.points;

    if (pts.length === 4) {
      const [p0, p1, p2, p3] = pts as [
        { u: number; v: number; scale: number },
        { u: number; v: number; scale: number },
        { u: number; v: number; scale: number },
        { u: number; v: number; scale: number },
      ];
      const forwardU = (p3.u - p0.u + (p2.u - p1.u)) * 0.5;
      const forwardV = (p3.v - p0.v + (p2.v - p1.v)) * 0.5;
      const rightU = (p1.u - p0.u + (p2.u - p3.u)) * 0.5;
      const rightV = (p1.v - p0.v + (p2.v - p3.v)) * 0.5;

      return {
        forward: StageZone._normalize2D(forwardU, forwardV, 0, -1),
        right: StageZone._normalize2D(rightU, rightV, 1, 0),
      };
    }

    const p0 = pts[0]!;
    for (let i = 1; i < pts.length - 1; i++) {
      const gradient = this._gradientForTriangle(p0, pts[i]!, pts[i + 1]!, u, v);
      if (gradient) {
        const forward = StageZone._normalize2D(-gradient.gu, -gradient.gv, 0, -1);
        return { forward, right: { u: forward.v, v: -forward.u } };
      }
    }

    return { forward: { u: 0, v: -1 }, right: { u: 1, v: 0 } };
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

  /**
   * Barycentric weights of (pu, pv) with respect to triangle (a, b, c), or `null` if the
   * triangle is degenerate or the point falls outside it (with a small tolerance for points
   * right on an edge).
   */
  private _baryWeights(
    a: { u: number; v: number },
    b: { u: number; v: number },
    c: { u: number; v: number },
    pu: number,
    pv: number,
  ): { w1: number; w2: number; w3: number } | null {
    const det = (b.v - c.v) * (a.u - c.u) + (c.u - b.u) * (a.v - c.v);
    if (Math.abs(det) < 0.00001) return null;

    const w1 = ((b.v - c.v) * (pu - c.u) + (c.u - b.u) * (pv - c.v)) / det;
    const w2 = ((c.v - a.v) * (pu - c.u) + (a.u - c.u) * (pv - c.v)) / det;
    const w3 = 1.0 - w1 - w2;

    if (w1 >= -0.01 && w2 >= -0.01 && w3 >= -0.01) return { w1, w2, w3 };
    return null;
  }

  private _barycentricScale(
    a: { u: number; v: number; scale: number },
    b: { u: number; v: number; scale: number },
    c: { u: number; v: number; scale: number },
    pu: number,
    pv: number,
  ): number | null {
    const w = this._baryWeights(a, b, c, pu, pv);
    if (!w) return null;
    return w.w1 * a.scale + w.w2 * b.scale + w.w3 * c.scale;
  }

  /**
   * Gradient of the linear `scale` field across triangle (a, b, c), evaluated only when (pu, pv)
   * actually falls inside that triangle -- `null` otherwise, or when the gradient is degenerate
   * (zero-area triangle, or a near-zero gradient such as a uniformly-scaled zone).
   */
  private _gradientForTriangle(
    a: { u: number; v: number; scale: number },
    b: { u: number; v: number; scale: number },
    c: { u: number; v: number; scale: number },
    pu: number,
    pv: number,
  ): { gu: number; gv: number } | null {
    if (!this._baryWeights(a, b, c, pu, pv)) return null;

    const e1u = b.u - a.u;
    const e1v = b.v - a.v;
    const e2u = c.u - a.u;
    const e2v = c.v - a.v;
    const d1 = b.scale - a.scale;
    const d2 = c.scale - a.scale;

    const det = e1u * e2v - e1v * e2u;
    if (Math.abs(det) < 0.00001) return null;

    const gu = (d1 * e2v - d2 * e1v) / det;
    const gv = (e1u * d2 - e2u * d1) / det;
    if (Math.sqrt(gu * gu + gv * gv) < 0.00001) return null;

    return { gu, gv };
  }
}
