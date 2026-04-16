/// src/geometry/Torus.ts

import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";

export interface TorusOptions {
  /** The radius of the torus. Defaults to 1. */
  radius?: number;
  /** The radius of the tube. Defaults to 0.4. */
  tube?: number;
  /** The number of radial segments. Defaults to 16. */
  radialSegments?: number;
  /** The number of tubular segments. Defaults to 32. */
  tubularSegments?: number;
}

/**
 * A torus geometry.
 */
export class Torus extends AbstractGeometry {
  /** The radius of the torus. */
  public radius: number;
  /** The radius of the tube. */
  public tube: number;
  /** The number of radial segments. */
  public radialSegments: number;
  /** The number of tubular segments. */
  public tubularSegments: number;

  /**
   * Creates a new Torus geometry.
   * @param options The configuration options for the torus.
   */
  constructor(options: TorusOptions = {}) {
    super();
    const { radius = 1, tube = 0.4, radialSegments = 16, tubularSegments = 32 } = options;
    this.radius = radius;
    this.tube = tube;
    this.radialSegments = radialSegments;
    this.tubularSegments = tubularSegments;
    this.generateGeometryData();
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];

    for (let j = 0; j <= this.radialSegments; j++) {
      const vRatio: number = j / this.radialSegments;
      const vArg: number = vRatio * MathUtils.TWO_PI;
      const cosV: number = Math.cos(vArg);
      const sinV: number = Math.sin(vArg);

      for (let i = 0; i <= this.tubularSegments; i++) {
        const uRatio: number = i / this.tubularSegments;
        const uArg: number = uRatio * MathUtils.TWO_PI;
        const cosU: number = Math.cos(uArg);
        const sinU: number = Math.sin(uArg);

        v.push(
          (this.radius + this.tube * cosV) * cosU,
          this.tube * sinV,
          (this.radius + this.tube * cosV) * sinU,
        );
        uv.push(uRatio, vRatio);
      }
    }

    for (let j = 1; j <= this.radialSegments; j++) {
      for (let i = 1; i <= this.tubularSegments; i++) {
        const a: number = (this.tubularSegments + 1) * j + i - 1;
        const b: number = (this.tubularSegments + 1) * (j - 1) + i - 1;
        const c: number = (this.tubularSegments + 1) * (j - 1) + i;
        const d: number = (this.tubularSegments + 1) * j + i;

        idx.push(a, b, d);
        idx.push(b, c, d);
      }
    }

    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = this._createIndexArray(idx.length);
    this._indices.set(idx);
    this.computeNormals();
  }
}
