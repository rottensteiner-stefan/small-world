import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";

/**
 * Configuration options for hollow cylinder geometry (Hohlzylinder / cylindrical shell).
 */
export interface HollowCylinderOptions {
  /** The outer radius (r1) of the hollow cylinder. Defaults to 1. */
  radiusOuter?: number;
  /** Alias for radiusOuter. */
  radius?: number;
  /** The inner radius (r2) of the hollow cylinder (hole size). Defaults to 0.5. */
  radiusInner?: number;
  /** Alias for radiusInner. */
  innerRadius?: number;
  /**
   * Wall thickness b = r1 - r2. If specified and radiusInner is omitted,
   * radiusInner is computed as radiusOuter - wallThickness.
   */
  wallThickness?: number;
  /** The total height (h) of the hollow cylinder. Defaults to 2. */
  height?: number;
  /** The number of radial subdivisions around the circumference. Defaults to 32. */
  radialSegments?: number;
  /** The number of height subdivisions along the vertical axis. Defaults to 1. */
  heightSegments?: number;
  /** The start angle of the sector in radians. Defaults to 0. */
  thetaStart?: number;
  /** The central angle of the sector in radians (2π for full cylinder). Defaults to 2π. */
  thetaLength?: number;
  /** Whether the cylinder ends are open (no annular ring caps). Defaults to false. */
  openEnded?: boolean;
}

/**
 * A hollow cylinder geometry (Hohlzylinder / cylindrical shell / pipe).
 *
 * Implements exact geometry generation for hollow cylinders with distinct
 * surface normals for the outer wall, inner wall, top annular cap, bottom annular cap,
 * and optional cut-plane end caps for partial sectors (thetaLength < 2π).
 *
 * Mathematical formulas:
 * - Outer radius $r_1$, Inner radius $r_2$, Wall thickness $b = r_1 - r_2$, Height $h$
 * - Volume: $V = \pi \cdot (r_1^2 - r_2^2) \cdot h$
 * - Lateral area: $M = 2\pi \cdot (r_1 + r_2) \cdot h$
 * - Total surface area: $A = 2\pi \cdot (r_1 + r_2) \cdot (r_1 - r_2 + h)$
 *
 * @see https://rechneronline.de/pi/hohlzylinder.php
 */
export class HollowCylinder extends AbstractGeometry {
  /** The outer radius (r1). */
  public radiusOuter: number;
  /** The inner radius (r2). */
  public radiusInner: number;
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
  /** Whether the cylinder ends are open (no caps). */
  public openEnded: boolean;

  /**
   * Creates a new HollowCylinder geometry.
   * @param options Configuration options.
   */
  constructor(options: HollowCylinderOptions = {}) {
    super();
    const {
      radiusOuter = options.radius ?? 1,
      radiusInner = options.innerRadius ??
        (options.wallThickness !== undefined
          ? Math.max(0, radiusOuter - options.wallThickness)
          : 0.5),
      height = 2,
      radialSegments = 32,
      heightSegments = 1,
      thetaStart = 0,
      thetaLength = MathUtils.TWO_PI,
      openEnded = false,
    } = options;

    const rOuter = Math.max(0, radiusOuter);
    const rInner = Math.min(rOuter, Math.max(0, radiusInner));

    this.radiusOuter = rOuter;
    this.radiusInner = rInner;
    this.height = Math.max(0, height);
    this.radialSegments = Math.max(3, Math.floor(radialSegments));
    this.heightSegments = Math.max(1, Math.floor(heightSegments));
    this.thetaStart = thetaStart;
    this.thetaLength = Math.max(0, Math.min(MathUtils.TWO_PI, thetaLength));
    this.openEnded = openEnded;

    this.generateGeometryData();
  }

  /** Gets the outer radius (r1). */
  public get radius(): number {
    return this.radiusOuter;
  }

  /** Sets the outer radius (r1). */
  public set radius(val: number) {
    this.radiusOuter = Math.max(0, val);
  }

  /** Gets the inner radius (r2). */
  public get innerRadius(): number {
    return this.radiusInner;
  }

  /** Sets the inner radius (r2). */
  public set innerRadius(val: number) {
    this.radiusInner = Math.max(0, val);
  }

  /**
   * Calculates the wall thickness $b = r_1 - r_2$.
   */
  public getWallThickness(): number {
    return Math.max(0, this.radiusOuter - this.radiusInner);
  }

  /**
   * Calculates the volume $V = \frac{\theta_{\text{len}}}{2\pi} \cdot \pi (r_1^2 - r_2^2) h$.
   */
  public getVolume(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    return fraction * Math.PI * (this.radiusOuter ** 2 - this.radiusInner ** 2) * this.height;
  }

  /**
   * Calculates the lateral / mantle surface area $M = \frac{\theta_{\text{len}}}{2\pi} \cdot 2\pi (r_1 + r_2) h$.
   */
  public getLateralArea(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    return fraction * 2 * Math.PI * (this.radiusOuter + this.radiusInner) * this.height;
  }

  /**
   * Calculates the total surface area $A$.
   */
  public getTotalSurfaceArea(): number {
    const fraction = this.thetaLength / MathUtils.TWO_PI;
    const lateral = this.getLateralArea();
    const capArea = this.openEnded
      ? 0
      : 2 * fraction * Math.PI * (this.radiusOuter ** 2 - this.radiusInner ** 2);
    const sideCaps =
      this.thetaLength < MathUtils.TWO_PI ? 2 * this.getWallThickness() * this.height : 0;
    return lateral + capArea + sideCaps;
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const wireframeLines: number[] = [];
    const hh: number = this.height / 2.0;
    const isSector: boolean = this.thetaLength < MathUtils.TWO_PI - 0.00001;

    // --- 1. Outer Cylindrical Surface (Normals pointing outward +r) ---
    const outerOffset = v.length / 3;
    for (let y = 0; y <= this.heightSegments; y++) {
      const vCoord = y / this.heightSegments;
      const yPos = vCoord * this.height - hh;

      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        v.push(this.radiusOuter * Math.sin(theta), yPos, this.radiusOuter * Math.cos(theta));
        uv.push(uCoord, 1.0 - vCoord);
      }
    }

    for (let y = 0; y < this.heightSegments; y++) {
      for (let x = 0; x < this.radialSegments; x++) {
        const first = outerOffset + y * (this.radialSegments + 1) + x;
        const second = first + this.radialSegments + 1;
        idx.push(first, first + 1, second);
        idx.push(first + 1, second + 1, second);

        wireframeLines.push(first, first + 1);
        wireframeLines.push(first, second);
      }
      const last = outerOffset + y * (this.radialSegments + 1) + this.radialSegments;
      const belowLast = outerOffset + (y + 1) * (this.radialSegments + 1) + this.radialSegments;
      wireframeLines.push(last, belowLast);
    }
    const outerBottomRow = outerOffset + this.heightSegments * (this.radialSegments + 1);
    for (let x = 0; x < this.radialSegments; x++) {
      wireframeLines.push(outerBottomRow + x, outerBottomRow + x + 1);
    }

    // --- 2. Inner Cylindrical Surface (Normals pointing inward -r) ---
    if (0 < this.radiusInner) {
      const innerOffset = v.length / 3;
      for (let y = 0; y <= this.heightSegments; y++) {
        const vCoord = y / this.heightSegments;
        const yPos = vCoord * this.height - hh;

        for (let x = 0; x <= this.radialSegments; x++) {
          const uCoord = x / this.radialSegments;
          const theta = this.thetaStart + uCoord * this.thetaLength;
          v.push(this.radiusInner * Math.sin(theta), yPos, this.radiusInner * Math.cos(theta));
          uv.push(1.0 - uCoord, 1.0 - vCoord);
        }
      }

      for (let y = 0; y < this.heightSegments; y++) {
        for (let x = 0; x < this.radialSegments; x++) {
          const first = innerOffset + y * (this.radialSegments + 1) + x;
          const second = first + this.radialSegments + 1;
          // Inverted winding for interior view
          idx.push(first, second, first + 1);
          idx.push(first + 1, second, second + 1);

          wireframeLines.push(first, first + 1);
          wireframeLines.push(first, second);
        }
        const last = innerOffset + y * (this.radialSegments + 1) + this.radialSegments;
        const belowLast = innerOffset + (y + 1) * (this.radialSegments + 1) + this.radialSegments;
        wireframeLines.push(last, belowLast);
      }
      const innerBottomRow = innerOffset + this.heightSegments * (this.radialSegments + 1);
      for (let x = 0; x < this.radialSegments; x++) {
        wireframeLines.push(innerBottomRow + x, innerBottomRow + x + 1);
      }
    }

    // --- 3. Top Annular Cap (Ring at +hh, Normals pointing +Y) ---
    if (!this.openEnded && 0 < this.radiusOuter) {
      const topOffset = v.length / 3;
      // Outer ring vertices
      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        v.push(this.radiusOuter * Math.sin(theta), hh, this.radiusOuter * Math.cos(theta));
        uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 + Math.cos(theta) * 0.5);
      }
      // Inner ring vertices
      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        const rIn = this.radiusInner;
        const rRatio = this.radiusOuter > 0 ? rIn / this.radiusOuter : 0;
        v.push(rIn * Math.sin(theta), hh, rIn * Math.cos(theta));
        uv.push(0.5 + Math.sin(theta) * 0.5 * rRatio, 0.5 + Math.cos(theta) * 0.5 * rRatio);
      }

      for (let x = 0; x < this.radialSegments; x++) {
        const o1 = topOffset + x;
        const o2 = topOffset + x + 1;
        const i1 = topOffset + (this.radialSegments + 1) + x;
        const i2 = topOffset + (this.radialSegments + 1) + x + 1;

        idx.push(o1, o2, i1);
        idx.push(o2, i2, i1);

        wireframeLines.push(o1, i1);
      }
      wireframeLines.push(topOffset + this.radialSegments, topOffset + 2 * this.radialSegments + 1);
    }

    // --- 4. Bottom Annular Cap (Ring at -hh, Normals pointing -Y) ---
    if (!this.openEnded && 0 < this.radiusOuter) {
      const bottomOffset = v.length / 3;
      // Outer ring vertices
      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        v.push(this.radiusOuter * Math.sin(theta), -hh, this.radiusOuter * Math.cos(theta));
        uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 - Math.cos(theta) * 0.5);
      }
      // Inner ring vertices
      for (let x = 0; x <= this.radialSegments; x++) {
        const uCoord = x / this.radialSegments;
        const theta = this.thetaStart + uCoord * this.thetaLength;
        const rIn = this.radiusInner;
        const rRatio = this.radiusOuter > 0 ? rIn / this.radiusOuter : 0;
        v.push(rIn * Math.sin(theta), -hh, rIn * Math.cos(theta));
        uv.push(0.5 + Math.sin(theta) * 0.5 * rRatio, 0.5 - Math.cos(theta) * 0.5 * rRatio);
      }

      for (let x = 0; x < this.radialSegments; x++) {
        const o1 = bottomOffset + x;
        const o2 = bottomOffset + x + 1;
        const i1 = bottomOffset + (this.radialSegments + 1) + x;
        const i2 = bottomOffset + (this.radialSegments + 1) + x + 1;

        idx.push(o1, i1, o2);
        idx.push(o2, i1, i2);

        wireframeLines.push(o1, i1);
      }
      wireframeLines.push(
        bottomOffset + this.radialSegments,
        bottomOffset + 2 * this.radialSegments + 1,
      );
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

          // Inner point
          v.push(this.radiusInner * sin, yPos, this.radiusInner * cos);
          uv.push(0, vCoord);
          // Outer point
          v.push(this.radiusOuter * sin, yPos, this.radiusOuter * cos);
          uv.push(1, vCoord);
        }

        for (let y = 0; y < this.heightSegments; y++) {
          const i1 = sideOffset + y * 2;
          const o1 = i1 + 1;
          const i2 = sideOffset + (y + 1) * 2;
          const o2 = i2 + 1;

          if (isStart) {
            idx.push(i1, o1, i2);
            idx.push(o1, o2, i2);
          } else {
            idx.push(i1, i2, o1);
            idx.push(o1, i2, o2);
          }

          wireframeLines.push(i1, o1);
          wireframeLines.push(i1, i2);
          wireframeLines.push(o1, o2);
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
