/// src/geometry/Sphere.ts

import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * Configuration options for sphere geometry.
 */
export interface SphereOptions {
  /** The radius of the sphere. Defaults to 1. */
  radius?: number;
  /** The number of horizontal segments. Defaults to 16. */
  widthSegments?: number;
  /** The number of vertical segments. Defaults to 12. */
  heightSegments?: number;
}

/**
 * A sphere geometry.
 */
export class Sphere extends AbstractGeometry {
  /** The radius of the sphere. */
  public radius: number;

  /** The number of horizontal segments. */
  public widthSegments: number;

  /** The number of vertical segments. */
  public heightSegments: number;

  /**
   * Creates a new Sphere geometry.
   * @param options The configuration options for the sphere.
   */
  constructor(options: SphereOptions = {}) {
    super();
    const { radius = 1, widthSegments = 16, heightSegments = 12 } = options;
    this.radius = radius;
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;
    this.generateGeometryData();
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const n: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];

    for (let y: number = 0; y <= this.heightSegments; y++) {
      const vRatio: number = y / this.heightSegments;
      const phi: number = vRatio * Math.PI;

      for (let x: number = 0; x <= this.widthSegments; x++) {
        const uRatio: number = x / this.widthSegments;
        const theta: number = uRatio * Math.PI * 2;

        const px: number = -(this.radius * Math.sin(phi) * Math.cos(theta));
        const py: number = this.radius * Math.cos(phi);
        const pz: number = this.radius * Math.sin(phi) * Math.sin(theta);

        v.push(px, py, pz);

        n.push(px / this.radius, py / this.radius, pz / this.radius);

        uv.push(uRatio, 1 - vRatio);
      }
    }

    for (let y: number = 0; y < this.heightSegments; y++) {
      for (let x: number = 0; x < this.widthSegments; x++) {
        const first: number = y * (this.widthSegments + 1) + x;
        const second: number = first + this.widthSegments + 1;
        idx.push(first, second, first + 1);
        idx.push(second, second + 1, first + 1);
      }
    }

    this._vertices = new Float32Array(v);
    this._normals = new Float32Array(n);
    this._uvs = new Float32Array(uv);
    this._indices = new Uint16Array(idx);
  }
}
