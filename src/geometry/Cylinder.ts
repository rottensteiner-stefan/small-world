/// src/geometry/Cylinder.ts

import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * Configuration options for cylinder geometry.
 */
export interface CylinderOptions {
  /** The radius at the top. Defaults to 1. Set to 0 for a cone. */
  radiusTop?: number;
  /** The radius at the bottom. Defaults to 1. */
  radiusBottom?: number;
  /** The height of the cylinder. Defaults to 2. */
  height?: number;
  /** The number of radial segments around the circumference. Defaults to 16. */
  radialSegments?: number;
  /** The number of height segments along the height. Defaults to 1. */
  heightSegments?: number;
  /** The start angle of the sector in radians. Defaults to 0. */
  thetaStart?: number;
  /** The central angle of the sector in radians. Defaults to 2 * Math.PI (full cylinder). */
  thetaLength?: number;
}

/**
 * A generalized cylinder geometry that can represent cylinders, cones, and conical frustums.
 * Supports partial sectors (pie slices).
 */
export class Cylinder extends AbstractGeometry {
  /** The radius at the top. */
  public radiusTop: number;
  /** The radius at the bottom. */
  public radiusBottom: number;
  /** The height. */
  public height: number;
  /** The number of radial segments. */
  public radialSegments: number;
  /** The number of height segments. */
  public heightSegments: number;
  /** The start angle. */
  public thetaStart: number;
  /** The central angle. */
  public thetaLength: number;

  /**
   * Creates a new Cylinder geometry.
   * @param options The configuration options.
   */
  constructor(options: CylinderOptions = {}) {
    super();
    const {
      radiusTop = 1,
      radiusBottom = 1,
      height = 2,
      radialSegments = 16,
      heightSegments = 1,
      thetaStart = 0,
      thetaLength = Math.PI * 2,
    } = options;

    this.radiusTop = radiusTop;
    this.radiusBottom = radiusBottom;
    this.height = height;
    this.radialSegments = radialSegments;
    this.heightSegments = heightSegments;
    this.thetaStart = thetaStart;
    this.thetaLength = thetaLength;

    this.generateGeometryData();
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const hh: number = this.height / 2;

    // --- Side surface ---
    for (let y: number = 0; y <= this.heightSegments; y++) {
      const vCoord: number = y / this.heightSegments;
      const yPos: number = vCoord * this.height - hh;
      const radius: number = vCoord * (this.radiusTop - this.radiusBottom) + this.radiusBottom;

      for (let x: number = 0; x <= this.radialSegments; x++) {
        const uCoord: number = x / this.radialSegments;
        const theta: number = this.thetaStart + uCoord * this.thetaLength;
        v.push(radius * Math.sin(theta), yPos, radius * Math.cos(theta));
        uv.push(uCoord, 1 - vCoord);
      }
    }

    for (let y: number = 0; y < this.heightSegments; y++) {
      for (let x: number = 0; x < this.radialSegments; x++) {
        const first: number = y * (this.radialSegments + 1) + x;
        const second: number = first + this.radialSegments + 1;
        idx.push(first, second, first + 1);
        idx.push(second, second + 1, first + 1);
      }
    }

    // --- Top cap ---
    if (this.radiusTop > 0) {
      const topOffset: number = v.length / 3;
      v.push(0, hh, 0); // Center point
      uv.push(0.5, 0.5);
      for (let x: number = 0; x <= this.radialSegments; x++) {
        const uCoord: number = x / this.radialSegments;
        const theta: number = this.thetaStart + uCoord * this.thetaLength;
        v.push(this.radiusTop * Math.sin(theta), hh, this.radiusTop * Math.cos(theta));
        uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 + Math.cos(theta) * 0.5);
      }
      for (let x: number = 0; x < this.radialSegments; x++) {
        idx.push(topOffset, topOffset + x + 1, topOffset + x + 2);
      }
    }

    // --- Bottom cap ---
    if (this.radiusBottom > 0) {
      const bottomOffset: number = v.length / 3;
      v.push(0, -hh, 0); // Center point
      uv.push(0.5, 0.5);
      for (let x: number = 0; x <= this.radialSegments; x++) {
        const uCoord: number = x / this.radialSegments;
        const theta: number = this.thetaStart + uCoord * this.thetaLength;
        v.push(this.radiusBottom * Math.sin(theta), -hh, this.radiusBottom * Math.cos(theta));
        uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 - Math.cos(theta) * 0.5);
      }
      for (let x: number = 0; x < this.radialSegments; x++) {
        idx.push(bottomOffset, bottomOffset + x + 2, bottomOffset + x + 1);
      }
    }

    // --- Side caps (for partial sectors) ---
    if (this.thetaLength < Math.PI * 2) {
      const buildSideCap = (isStart: boolean): void => {
        const angle: number = isStart ? this.thetaStart : this.thetaStart + this.thetaLength;
        const sin: number = Math.sin(angle);
        const cos: number = Math.cos(angle);
        const offset: number = v.length / 3;

        // Points along the axis (center) and the edge
        for (let y: number = 0; y <= this.heightSegments; y++) {
          const vCoord: number = y / this.heightSegments;
          const yPos: number = vCoord * this.height - hh;
          const radius: number = vCoord * (this.radiusTop - this.radiusBottom) + this.radiusBottom;

          v.push(0, yPos, 0); // Axis point
          uv.push(0, vCoord);
          v.push(radius * sin, yPos, radius * cos); // Edge point
          uv.push(1, vCoord);
        }

        for (let y: number = 0; y < this.heightSegments; y++) {
          const base: number = offset + y * 2;
          if (isStart) {
            idx.push(base, base + 1, base + 2);
            idx.push(base + 2, base + 1, base + 3);
          } else {
            idx.push(base, base + 2, base + 1);
            idx.push(base + 2, base + 3, base + 1);
          }
        }
      };

      buildSideCap(true);
      buildSideCap(false);
    }

    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = new Uint16Array(idx);
    this.computeNormals();
  }
}
