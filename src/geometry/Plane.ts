/// src/geometry/Plane.ts

import { AbstractGeometry } from "./AbstractGeometry.js";
import { BoundingVolume } from "../interfaces/index.js";
import { BoundingBox, } from "../physics/index.js";
import { Vector3D } from "../math/index.js";

/**
 * Configuration options for plane geometry.
 */
export interface PlaneOptions {
  /** The total width of the plane. Defaults to 1. */
  width?: number;
  /** The total depth of the plane. Defaults to 1. */
  depth?: number;
  /** The number of segments along the width (subdivisions). Defaults to 1. */
  widthSegments?: number;
  /** The number of segments along the depth (subdivisions). Defaults to 1. */
  depthSegments?: number;
}

/**
 * A simple flat plane geometry on the XZ plane.
 */
export class Plane extends AbstractGeometry {
  /** The width of the plane. */
  public width: number;
  /** The depth of the plane. */
  public depth: number;
  /** The number of segments along the width. */
  public widthSegments: number;
  /** The number of segments along the depth. */
  public depthSegments: number;

  /**
   * Creates a new Plane geometry.
   * @param options The configuration options.
   */
  constructor(options: PlaneOptions = {}) {
    super();
    const { width = 1, depth = 1, widthSegments = 1, depthSegments = 1 } = options;
    this.width = width;
    this.depth = depth;
    this.widthSegments = widthSegments;
    this.depthSegments = depthSegments;
    this.generateGeometryData();
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const hW: number = this.width / 2.0;
    const hD: number = this.depth / 2.0;

    for (let z: number = 0; z <= this.depthSegments; z++) {
      const vRatio: number = z / this.depthSegments;
      for (let x: number = 0; x <= this.widthSegments; x++) {
        const uRatio: number = x / this.widthSegments;
        v.push(uRatio * this.width - hW, 0, vRatio * this.depth - hD);
        uv.push(uRatio, 1.0 - vRatio);
      }
    }

    for (let z: number = 0; z < this.depthSegments; z++) {
      for (let x: number = 0; x < this.widthSegments; x++) {
        const a: number = x + (this.widthSegments + 1) * z;
        const b: number = x + (this.widthSegments + 1) * (z + 1);
        const c: number = x + 1 + (this.widthSegments + 1) * (z + 1);
        const d: number = x + 1 + (this.widthSegments + 1) * z;

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

  /** @inheritdoc */
  public override getBoundingVolume(): BoundingVolume {
    const hW = this.width / 2;
    const hD = this.depth / 2;
    return new BoundingBox(new Vector3D(-hW, -0.01, -hD), new Vector3D(hW, 0.01, hD));
  }
}
