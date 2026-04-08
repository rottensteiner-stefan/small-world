/// src/geometry/Capsule.ts

import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";

/**
 * Configuration options for capsule geometry.
 */
export interface CapsuleOptions {
  /** The radius of the capsule. Defaults to 0.5. */
  radius?: number;
  /** The length of the cylinder part. Defaults to 1. */
  length?: number;
  /** The number of radial segments. Defaults to 16. */
  radialSegments?: number;
  /** The number of height segments for the caps. Defaults to 8. */
  capSegments?: number;
}

/**
 * A capsule geometry consisting of a cylinder with hemispherical caps.
 */
export class Capsule extends AbstractGeometry {
  /** The radius of the capsule. */
  public radius: number;
  /** The length of the cylinder part. */
  public length: number;
  /** The number of radial segments. */
  public radialSegments: number;
  /** The number of segments for the caps. */
  public capSegments: number;

  /**
   * Creates a new Capsule geometry.
   * @param options The configuration options.
   */
  constructor(options: CapsuleOptions = {}) {
    super();
    const { radius = 0.5, length = 1, radialSegments = 16, capSegments = 8 } = options;
    this.radius = radius;
    this.length = length;
    this.radialSegments = radialSegments;
    this.capSegments = capSegments;
    this.generateGeometryData();
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const n: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];

    const halfLength: number = this.length / 2;

    // --- Generate Vertices and Normals ---
    // From top cap to bottom cap
    for (let y: number = 0; y <= this.capSegments * 2 + 1; y++) {
      let radius: number;
      let yPos: number;
      let vCoord: number;

      // Top cap
      if (y <= this.capSegments) {
        const phi: number = (y / this.capSegments) * MathUtils.HALF_PI - MathUtils.HALF_PI;
        radius = this.radius * Math.cos(phi);
        yPos = halfLength - this.radius * Math.sin(phi);
        vCoord = (y / (this.capSegments * 2 + 1)) * 0.5;
      }
      // Bottom cap
      else if (y > this.capSegments) {
        const phi: number = ((y - 1) / this.capSegments) * MathUtils.HALF_PI - MathUtils.HALF_PI;
        radius = this.radius * Math.cos(phi);
        yPos = -halfLength - this.radius * Math.sin(phi);
        vCoord = y / (this.capSegments * 2 + 1);
      } else {
        // Should not happen with current logic
        radius = this.radius;
        yPos = 0;
        vCoord = 0.5;
      }

      for (let x: number = 0; x <= this.radialSegments; x++) {
        const uCoord: number = x / this.radialSegments;
        const theta: number = uCoord * MathUtils.TWO_PI;

        const vx: number = radius * Math.sin(theta);
        const vz: number = radius * Math.cos(theta);

        v.push(vx, yPos, vz);

        // Normals: From center of the caps or outwards from cylinder axis
        const nx: number = vx;
        const ny: number = y <= this.capSegments ? yPos - halfLength : yPos + halfLength;
        const nz: number = vz;
        const nLen: number = Math.sqrt(nx * nx + ny * ny + nz * nz);
        n.push(nx / nLen, ny / nLen, nz / nLen);

        uv.push(uCoord, 1 - vCoord);
      }
    }

    // --- Generate Indices ---
    for (let y: number = 0; y < this.capSegments * 2 + 1; y++) {
      for (let x: number = 0; x < this.radialSegments; x++) {
        const first: number = y * (this.radialSegments + 1) + x;
        const second: number = first + this.radialSegments + 1;
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
