import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";

/**
 * Configuration options for HollowTruncatedCone geometry (Hohlkegelstumpf / Truncated Hollow Cone).
 */
export interface HollowTruncatedConeOptions {
  /** Outer radius at the bottom base (R). Defaults to 2.0. */
  outerRadiusBottom?: number;
  /** Outer radius at the top cap (r). Defaults to 1.0. */
  outerRadiusTop?: number;
  /** Inner radius at the bottom base (S). Defaults to 1.6. */
  innerRadiusBottom?: number;
  /** Inner radius at the top cap (s). Defaults to 0.8. */
  innerRadiusTop?: number;
  /** Wall thickness (d). If provided, sets S = R - d and s = r - d. */
  thickness?: number;
  /** Total height (h). Defaults to 2.0. */
  height?: number;
  /** Number of radial subdivisions around circumference. Defaults to 32. */
  radialSegments?: number;
  /** Number of height subdivisions along vertical axis. Defaults to 1. */
  heightSegments?: number;
  /** Start angle of the sector in radians. Defaults to 0. */
  thetaStart?: number;
  /** Central angle of the sector in radians (2π for full cone). Defaults to 2π. */
  thetaLength?: number;
  /** Whether the cone ends are open (no top and bottom annular caps). Defaults to false. */
  openEnded?: boolean;
}

/**
 * A HollowTruncatedCone (Hohlkegelstumpf / Truncated Hollow Cone) geometry.
 *
 * A conical frustum with a coaxial inner conical frustum carved out, forming a hollow
 * cone with outer mantle, inner mantle, and two annular circular caps (Kreisringe).
 *
 * Mathematical formulas:
 * - Outer base radius $R$, Outer top radius $r$
 * - Inner base radius $S$, Inner top radius $s$
 * - Height $h$
 * - Wall thickness: $d = R - S = r - s$ (when uniform)
 * - Outer slant height: $m_{\text{outer}} = \sqrt{(R - r)^2 + h^2}$
 * - Inner slant height: $m_{\text{inner}} = \sqrt{(S - s)^2 + h^2}$
 * - Outer lateral area: $M_{\text{outer}} = \frac{\theta_{\text{len}}}{2\pi} \cdot \pi (R + r) m_{\text{outer}}$
 * - Inner lateral area: $M_{\text{inner}} = \frac{\theta_{\text{len}}}{2\pi} \cdot \pi (S + s) m_{\text{inner}}$
 * - Bottom annular cap area: $A_{\text{bottom}} = \frac{\theta_{\text{len}}}{2\pi} \cdot \pi (R^2 - S^2)$
 * - Top annular cap area: $A_{\text{top}} = \frac{\theta_{\text{len}}}{2\pi} \cdot \pi (r^2 - s^2)$
 * - Total surface area: $A = M_{\text{outer}} + M_{\text{inner}} + A_{\text{bottom}} + A_{\text{top}}$
 * - Volume: $V = \frac{\theta_{\text{len}}}{2\pi} \cdot \frac{\pi h}{3} (R^2 + R r + r^2 - S^2 - S s - s^2)$
 * - Surface-to-volume ratio: $A / V$
 *
 * @see https://rechneronline.de/pi/hohlkegelstumpf.php
 */
export class HollowTruncatedCone extends AbstractGeometry {
  /** Outer radius at the bottom base (R). */
  public outerRadiusBottom: number;
  /** Outer radius at the top cap (r). */
  public outerRadiusTop: number;
  /** Inner radius at the bottom base (S). */
  public innerRadiusBottom: number;
  /** Inner radius at the top cap (s). */
  public innerRadiusTop: number;
  /** Total height (h). */
  public height: number;
  /** Number of radial subdivisions. */
  public radialSegments: number;
  /** Number of height subdivisions. */
  public heightSegments: number;
  /** Start angle in radians. */
  public thetaStart: number;
  /** Central angle in radians. */
  public thetaLength: number;
  /** Whether the cone ends are open (no caps). */
  public openEnded: boolean;

  /**
   * Creates a new HollowTruncatedCone geometry.
   * @param options Configuration options.
   */
  constructor(options: HollowTruncatedConeOptions = {}) {
    super();
    const {
      outerRadiusBottom = 2.0,
      outerRadiusTop = 1.0,
      innerRadiusBottom,
      innerRadiusTop,
      thickness,
      height = 2.0,
      radialSegments = 32,
      heightSegments = 1,
      thetaStart = 0,
      thetaLength = MathUtils.TWO_PI,
      openEnded = false,
    } = options;

    this.outerRadiusBottom = Math.max(0.01, outerRadiusBottom);
    this.outerRadiusTop = Math.max(0.01, outerRadiusTop);
    this.height = Math.max(0.01, height);
    this.radialSegments = Math.max(3, Math.floor(radialSegments));
    this.heightSegments = Math.max(1, Math.floor(heightSegments));
    this.thetaStart = thetaStart;
    this.thetaLength = Math.max(0, Math.min(MathUtils.TWO_PI, thetaLength));
    this.openEnded = openEnded;

    if (thickness !== undefined && 0 < thickness) {
      const d = Math.min(thickness, Math.min(this.outerRadiusBottom, this.outerRadiusTop) - 0.001);
      this.innerRadiusBottom = Math.max(0.001, this.outerRadiusBottom - d);
      this.innerRadiusTop = Math.max(0.001, this.outerRadiusTop - d);
    } else {
      const sBottom = innerRadiusBottom !== undefined ? innerRadiusBottom : 1.6;
      const sTop = innerRadiusTop !== undefined ? innerRadiusTop : 0.8;
      this.innerRadiusBottom = Math.max(0.001, Math.min(this.outerRadiusBottom - 0.001, sBottom));
      this.innerRadiusTop = Math.max(0.001, Math.min(this.outerRadiusTop - 0.001, sTop));
    }

    this.generateGeometryData();
  }

  /**
   * Calculates the outer slant height $m_{\text{outer}} = \sqrt{(R - r)^2 + h^2}$.
   */
  public getOuterSlantHeight(): number {
    const dr = this.outerRadiusBottom - this.outerRadiusTop;
    return Math.sqrt(dr * dr + this.height * this.height);
  }

  /**
   * Calculates the inner slant height $m_{\text{inner}} = \sqrt{(S - s)^2 + h^2}$.
   */
  public getInnerSlantHeight(): number {
    const ds = this.innerRadiusBottom - this.innerRadiusTop;
    return Math.sqrt(ds * ds + this.height * this.height);
  }

  /**
   * Calculates the outer lateral area $M_{\text{outer}}$.
   */
  public getOuterLateralArea(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    const R = this.outerRadiusBottom;
    const r = this.outerRadiusTop;
    return fraction * Math.PI * (R + r) * this.getOuterSlantHeight();
  }

  /**
   * Calculates the inner lateral area $M_{\text{inner}}$.
   */
  public getInnerLateralArea(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    const S = this.innerRadiusBottom;
    const s = this.innerRadiusTop;
    return fraction * Math.PI * (S + s) * this.getInnerSlantHeight();
  }

  /**
   * Calculates the bottom base annular cap area $A_{\text{bottom}} = \frac{\theta_{\text{len}}}{2\pi} \cdot \pi (R^2 - S^2)$.
   */
  public getBottomCapArea(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    const R = this.outerRadiusBottom;
    const S = this.innerRadiusBottom;
    return fraction * Math.PI * (R * R - S * S);
  }

  /**
   * Calculates the top cap annular area $A_{\text{top}} = \frac{\theta_{\text{len}}}{2\pi} \cdot \pi (r^2 - s^2)$.
   */
  public getTopCapArea(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    const r = this.outerRadiusTop;
    const s = this.innerRadiusTop;
    return fraction * Math.PI * (r * r - s * s);
  }

  /**
   * Calculates the volume $V = \frac{\theta_{\text{len}}}{2\pi} \cdot \frac{\pi h}{3} (R^2 + R r + r^2 - S^2 - S s - s^2)$.
   */
  public getVolume(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    const R = this.outerRadiusBottom;
    const r = this.outerRadiusTop;
    const S = this.innerRadiusBottom;
    const s = this.innerRadiusTop;
    const h = this.height;
    return fraction * ((Math.PI * h) / 3) * (R * R + R * r + r * r - S * S - S * s - s * s);
  }

  /**
   * Calculates the total surface area.
   */
  public getTotalSurfaceArea(): number {
    const mOut = this.getOuterLateralArea();
    const mIn = this.getInnerLateralArea();
    const caps = this.openEnded ? 0 : this.getBottomCapArea() + this.getTopCapArea();
    let sideCaps = 0;
    if (this.thetaLength < MathUtils.TWO_PI) {
      const R = this.outerRadiusBottom;
      const r = this.outerRadiusTop;
      const S = this.innerRadiusBottom;
      const s = this.innerRadiusTop;
      const dBottom = R - S;
      const dTop = r - s;
      sideCaps = 2 * 0.5 * (dBottom + dTop) * this.height;
    }
    return mOut + mIn + caps + sideCaps;
  }

  /**
   * Calculates the surface-to-volume ratio $A / V$.
   */
  public getSurfaceToVolumeRatio(): number {
    const vol = this.getVolume();
    if (vol <= 0) return 0;
    return this.getTotalSurfaceArea() / vol;
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const wireframeLines: number[] = [];

    const hh = this.height / 2.0;
    const isSector = this.thetaLength < MathUtils.TWO_PI - 0.00001;
    const R = this.outerRadiusBottom;
    const r = this.outerRadiusTop;
    const S = this.innerRadiusBottom;
    const s = this.innerRadiusTop;

    // --- 1. Outer Conical Mantle Surface ---
    const outerMantleOffset = v.length / 3;

    for (let y = 0; y <= this.heightSegments; y++) {
      const vCoord = y / this.heightSegments;
      const yPos = vCoord * this.height - hh;
      const radius = vCoord * (r - R) + R;

      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        v.push(radius * Math.sin(theta), yPos, radius * Math.cos(theta));
        uv.push(uCoord, 1.0 - vCoord);
      }
    }

    for (let y = 0; y < this.heightSegments; y++) {
      for (let x = 0; x < this.radialSegments; x++) {
        const first = outerMantleOffset + y * (this.radialSegments + 1) + x;
        const second = first + this.radialSegments + 1;
        idx.push(first, first + 1, second);
        idx.push(first + 1, second + 1, second);

        wireframeLines.push(first, first + 1);
        wireframeLines.push(first, second);
      }
      const last = outerMantleOffset + y * (this.radialSegments + 1) + this.radialSegments;
      const belowLast =
        outerMantleOffset + (y + 1) * (this.radialSegments + 1) + this.radialSegments;
      wireframeLines.push(last, belowLast);
    }
    const outerBottomRow = outerMantleOffset + this.heightSegments * (this.radialSegments + 1);
    for (let x = 0; x < this.radialSegments; x++) {
      wireframeLines.push(outerBottomRow + x, outerBottomRow + x + 1);
    }

    // --- 2. Inner Conical Mantle Surface (Inward Facing) ---
    const innerMantleOffset = v.length / 3;

    for (let y = 0; y <= this.heightSegments; y++) {
      const vCoord = y / this.heightSegments;
      const yPos = vCoord * this.height - hh;
      const radius = vCoord * (s - S) + S;

      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        v.push(radius * Math.sin(theta), yPos, radius * Math.cos(theta));
        uv.push(uCoord, 1.0 - vCoord);
      }
    }

    for (let y = 0; y < this.heightSegments; y++) {
      for (let x = 0; x < this.radialSegments; x++) {
        const first = innerMantleOffset + y * (this.radialSegments + 1) + x;
        const second = first + this.radialSegments + 1;
        // Reversed winding for inward facing mantle
        idx.push(first, second, first + 1);
        idx.push(first + 1, second, second + 1);

        wireframeLines.push(first, first + 1);
        wireframeLines.push(first, second);
      }
      const last = innerMantleOffset + y * (this.radialSegments + 1) + this.radialSegments;
      const belowLast =
        innerMantleOffset + (y + 1) * (this.radialSegments + 1) + this.radialSegments;
      wireframeLines.push(last, belowLast);
    }
    const innerBottomRow = innerMantleOffset + this.heightSegments * (this.radialSegments + 1);
    for (let x = 0; x < this.radialSegments; x++) {
      wireframeLines.push(innerBottomRow + x, innerBottomRow + x + 1);
    }

    // --- 3. Top Annular Cap (at +hh, Normal +Y) ---
    if (!this.openEnded) {
      const topCapOffset = v.length / 3;

      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);

        // Outer top rim vertex
        v.push(r * sin, hh, r * cos);
        uv.push(0.5 + 0.5 * (r / R) * sin, 0.5 + 0.5 * (r / R) * cos);

        // Inner top rim vertex
        v.push(s * sin, hh, s * cos);
        uv.push(0.5 + 0.5 * (s / R) * sin, 0.5 + 0.5 * (s / R) * cos);
      }

      for (let x = 0; x < this.radialSegments; x++) {
        const o1 = topCapOffset + x * 2;
        const i1 = o1 + 1;
        const o2 = topCapOffset + (x + 1) * 2;
        const i2 = o2 + 1;

        // Normal +Y => CCW in X-Z
        idx.push(o1, o2, i2);
        idx.push(o1, i2, i1);

        wireframeLines.push(o1, o2);
        wireframeLines.push(i1, i2);
        wireframeLines.push(o1, i1);
      }
      const lastTop = topCapOffset + this.radialSegments * 2;
      wireframeLines.push(lastTop, lastTop + 1);
    }

    // --- 4. Bottom Annular Cap (at -hh, Normal -Y) ---
    if (!this.openEnded) {
      const bottomCapOffset = v.length / 3;

      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);

        // Outer bottom rim vertex
        v.push(R * sin, -hh, R * cos);
        uv.push(0.5 + 0.5 * sin, 0.5 - 0.5 * cos);

        // Inner bottom rim vertex
        v.push(S * sin, -hh, S * cos);
        uv.push(0.5 + 0.5 * (S / R) * sin, 0.5 - 0.5 * (S / R) * cos);
      }

      for (let x = 0; x < this.radialSegments; x++) {
        const o1 = bottomCapOffset + x * 2;
        const i1 = o1 + 1;
        const o2 = bottomCapOffset + (x + 1) * 2;
        const i2 = o2 + 1;

        // Normal -Y => reversed winding
        idx.push(o1, i2, o2);
        idx.push(o1, i1, i2);

        wireframeLines.push(o1, o2);
        wireframeLines.push(i1, i2);
        wireframeLines.push(o1, i1);
      }
      const lastBottom = bottomCapOffset + this.radialSegments * 2;
      wireframeLines.push(lastBottom, lastBottom + 1);
    }

    // --- 5. Side Cut Plane Caps (for partial sectors) ---
    if (isSector) {
      const buildSideCap = (angle: number, isStart: boolean): void => {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const sideOffset = v.length / 3;

        for (let y = 0; y <= this.heightSegments; y++) {
          const vCoord = y / this.heightSegments;
          const yPos = vCoord * this.height - hh;
          const rOut = vCoord * (r - R) + R;
          const rIn = vCoord * (s - S) + S;

          v.push(rIn * sin, yPos, rIn * cos);
          uv.push(0, vCoord);
          v.push(rOut * sin, yPos, rOut * cos);
          uv.push(1, vCoord);
        }

        for (let y = 0; y < this.heightSegments; y++) {
          const c1 = sideOffset + y * 2;
          const r1 = c1 + 1;
          const c2 = sideOffset + (y + 1) * 2;
          const r2 = c2 + 1;

          if (isStart) {
            idx.push(c1, r1, c2);
            idx.push(r1, r2, c2);
          } else {
            idx.push(c1, c2, r1);
            idx.push(r1, c2, r2);
          }

          wireframeLines.push(c1, r1);
          wireframeLines.push(c1, c2);
          wireframeLines.push(r1, r2);
        }
        const lastRow = sideOffset + this.heightSegments * 2;
        wireframeLines.push(lastRow, lastRow + 1);
      };

      buildSideCap(this.thetaStart, true);
      buildSideCap(this.thetaStart + this.thetaLength, false);
    }

    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = this._createIndexArray(idx.length);
    this._indices.set(idx);
    this._wireframeIndices = this._createIndexArray(wireframeLines.length);
    this._wireframeIndices.set(wireframeLines);

    this.computeNormals();
  }
}
