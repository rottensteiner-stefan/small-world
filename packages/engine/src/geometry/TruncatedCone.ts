import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";

/**
 * Configuration options for truncated cone geometry (Kegelstumpf / conical frustum).
 */
export interface TruncatedConeOptions {
  /** The radius at the bottom base (r1). Defaults to 1.5. */
  radiusBottom?: number;
  /** The radius at the top cap (r2). Defaults to 0.75. */
  radiusTop?: number;
  /** The total height (h). Defaults to 2. */
  height?: number;
  /** The number of radial subdivisions around the circumference. Defaults to 32. */
  radialSegments?: number;
  /** The number of height subdivisions along the vertical axis. Defaults to 1. */
  heightSegments?: number;
  /** The start angle of the sector in radians. Defaults to 0. */
  thetaStart?: number;
  /** The central angle of the sector in radians (2π for full cone). Defaults to 2π. */
  thetaLength?: number;
  /** Whether the cone ends are open (no top and bottom circular caps). Defaults to false. */
  openEnded?: boolean;
}

/**
 * A truncated cone geometry (Kegelstumpf / conical frustum).
 *
 * Mathematically, a truncated cone is a cone whose apex is sliced off by a plane parallel
 * to its base.
 *
 * Mathematical formulas:
 * - Base radius $r_1$, Top radius $r_2$, Height $h$
 * - Slant height (Mantellinie): $s = \sqrt{(r_1 - r_2)^2 + h^2}$
 * - Lateral area (Mantelfläche): $M = \pi (r_1 + r_2) s$
 * - Total surface area: $A = M + \pi r_1^2 + \pi r_2^2$
 * - Volume: $V = \frac{\pi \cdot h}{3} (r_1^2 + r_1 r_2 + r_2^2)$
 *
 * @see https://rechneronline.de/pi/kegelstumpf.php
 */
export class TruncatedCone extends AbstractGeometry {
  /** The base radius at the bottom (r1). */
  public radiusBottom: number;
  /** The cap radius at the top (r2). */
  public radiusTop: number;
  /** The total height (h). */
  public height: number;
  /** The number of radial subdivisions. */
  public radialSegments: number;
  /** The number of height subdivisions. */
  public heightSegments: number;
  /** The start angle in radians. */
  public thetaStart: number;
  /** The central angle in radians. */
  public thetaLength: number;
  /** Whether the cone ends are open (no caps). */
  public openEnded: boolean;

  /**
   * Creates a new TruncatedCone geometry.
   * @param options Configuration options.
   */
  constructor(options: TruncatedConeOptions = {}) {
    super();
    const {
      radiusBottom = 1.5,
      radiusTop = 0.75,
      height = 2,
      radialSegments = 32,
      heightSegments = 1,
      thetaStart = 0,
      thetaLength = MathUtils.TWO_PI,
      openEnded = false,
    } = options;

    this.radiusBottom = Math.max(0, radiusBottom);
    this.radiusTop = Math.max(0, radiusTop);
    this.height = Math.max(0, height);
    this.radialSegments = Math.max(3, Math.floor(radialSegments));
    this.heightSegments = Math.max(1, Math.floor(heightSegments));
    this.thetaStart = thetaStart;
    this.thetaLength = Math.max(0, Math.min(MathUtils.TWO_PI, thetaLength));
    this.openEnded = openEnded;

    this.generateGeometryData();
  }

  /**
   * Calculates the slant height (Mantellinie) $s = \sqrt{(r_1 - r_2)^2 + h^2}$.
   */
  public getSlantHeight(): number {
    return Math.sqrt((this.radiusBottom - this.radiusTop) ** 2 + this.height ** 2);
  }

  /**
   * Calculates the lateral / mantle surface area $M = \frac{\theta_{\text{len}}}{2\pi} \cdot \pi (r_1 + r_2) s$.
   */
  public getLateralArea(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    return fraction * Math.PI * (this.radiusBottom + this.radiusTop) * this.getSlantHeight();
  }

  /**
   * Calculates the bottom base circular area $A_{\text{base}} = \frac{\theta_{\text{len}}}{2\pi} \cdot \pi r_1^2$.
   */
  public getBaseArea(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    return fraction * Math.PI * this.radiusBottom ** 2;
  }

  /**
   * Calculates the top cap circular area $A_{\text{top}} = \frac{\theta_{\text{len}}}{2\pi} \cdot \pi r_2^2$.
   */
  public getTopArea(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    return fraction * Math.PI * this.radiusTop ** 2;
  }

  /**
   * Calculates the volume $V = \frac{\theta_{\text{len}}}{2\pi} \cdot \frac{\pi h}{3} (r_1^2 + r_1 r_2 + r_2^2)$.
   */
  public getVolume(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    const r1 = this.radiusBottom;
    const r2 = this.radiusTop;
    return fraction * ((Math.PI * this.height) / 3) * (r1 ** 2 + r1 * r2 + r2 ** 2);
  }

  /**
   * Calculates the total surface area $A$.
   */
  public getTotalSurfaceArea(): number {
    const lateral = this.getLateralArea();
    const bottomCap = this.openEnded ? 0 : this.getBaseArea();
    const topCap = this.openEnded ? 0 : this.getTopArea();
    const sideCaps =
      this.thetaLength < MathUtils.TWO_PI
        ? 2 * 0.5 * (this.radiusBottom + this.radiusTop) * this.height
        : 0;
    return lateral + bottomCap + topCap + sideCaps;
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const wireframeLines: number[] = [];
    const hh: number = this.height / 2.0;
    const isSector: boolean = this.thetaLength < MathUtils.TWO_PI - 0.00001;

    // --- 1. Conical Mantle Surface ---
    const mantleOffset = v.length / 3;

    for (let y = 0; y <= this.heightSegments; y++) {
      const vCoord = y / this.heightSegments;
      const yPos = vCoord * this.height - hh;
      const radius = vCoord * (this.radiusTop - this.radiusBottom) + this.radiusBottom;

      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        v.push(radius * Math.sin(theta), yPos, radius * Math.cos(theta));
        uv.push(uCoord, 1.0 - vCoord);
      }
    }

    for (let y = 0; y < this.heightSegments; y++) {
      for (let x = 0; x < this.radialSegments; x++) {
        const first = mantleOffset + y * (this.radialSegments + 1) + x;
        const second = first + this.radialSegments + 1;
        idx.push(first, first + 1, second);
        idx.push(first + 1, second + 1, second);

        wireframeLines.push(first, first + 1);
        wireframeLines.push(first, second);
      }
      const last = mantleOffset + y * (this.radialSegments + 1) + this.radialSegments;
      const belowLast = mantleOffset + (y + 1) * (this.radialSegments + 1) + this.radialSegments;
      wireframeLines.push(last, belowLast);
    }
    const mantleBottomRow = mantleOffset + this.heightSegments * (this.radialSegments + 1);
    for (let x = 0; x < this.radialSegments; x++) {
      wireframeLines.push(mantleBottomRow + x, mantleBottomRow + x + 1);
    }

    // --- 2. Top Circular Cap (at +hh, Normal +Y) ---
    if (!this.openEnded && 0 < this.radiusTop) {
      const topOffset = v.length / 3;
      v.push(0, hh, 0); // Center point
      uv.push(0.5, 0.5);

      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        v.push(this.radiusTop * Math.sin(theta), hh, this.radiusTop * Math.cos(theta));
        uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 + Math.cos(theta) * 0.5);
      }

      for (let x = 0; x < this.radialSegments; x++) {
        idx.push(topOffset, topOffset + x + 1, topOffset + x + 2);
        wireframeLines.push(topOffset, topOffset + x + 1);
        wireframeLines.push(topOffset + x + 1, topOffset + x + 2);
      }
      wireframeLines.push(topOffset, topOffset + this.radialSegments + 1);
    }

    // --- 3. Bottom Circular Cap (at -hh, Normal -Y) ---
    if (!this.openEnded && 0 < this.radiusBottom) {
      const bottomOffset = v.length / 3;
      v.push(0, -hh, 0); // Center point
      uv.push(0.5, 0.5);

      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        v.push(this.radiusBottom * Math.sin(theta), -hh, this.radiusBottom * Math.cos(theta));
        uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 - Math.cos(theta) * 0.5);
      }

      for (let x = 0; x < this.radialSegments; x++) {
        idx.push(bottomOffset, bottomOffset + x + 2, bottomOffset + x + 1);
        wireframeLines.push(bottomOffset, bottomOffset + x + 1);
        wireframeLines.push(bottomOffset + x + 1, bottomOffset + x + 2);
      }
      wireframeLines.push(bottomOffset, bottomOffset + this.radialSegments + 1);
    }

    // --- 4. Side Cut Plane Caps (for partial sectors) ---
    if (isSector) {
      const buildSideCap = (angle: number, isStart: boolean): void => {
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const sideOffset = v.length / 3;

        for (let y = 0; y <= this.heightSegments; y++) {
          const vCoord = y / this.heightSegments;
          const yPos = vCoord * this.height - hh;
          const radius = vCoord * (this.radiusTop - this.radiusBottom) + this.radiusBottom;

          v.push(0, yPos, 0); // Axis center point
          uv.push(0, vCoord);
          v.push(radius * sin, yPos, radius * cos); // Outer edge point
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
