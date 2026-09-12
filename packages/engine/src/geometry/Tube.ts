import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";

/**
 * Configuration options for tube geometry.
 */
export interface TubeOptions {
  /** The outer radius of the tube. Defaults to 1. */
  radius?: number;
  /** The inner radius of the tube (hole size). Defaults to 0.5. */
  innerRadius?: number;
  /** The total height of the tube. Defaults to 2. */
  height?: number;
  /** The number of radial segments. Defaults to 16. */
  radialSegments?: number;
  /** The number of height segments along the vertical axis. Defaults to 1. */
  heightSegments?: number;
}

/**
 * A hollow cylinder geometry (Tube).
 */
export class Tube extends AbstractGeometry {
  /** The outer radius. */
  public radius: number;
  /** The inner radius. */
  public innerRadius: number;
  /** The height. */
  public height: number;
  /** The number of radial segments. */
  public radialSegments: number;
  /** The number of height segments. */
  public heightSegments: number;

  /**
   * Creates a new Tube geometry.
   * @param options The configuration options.
   */
  constructor(options: TubeOptions = {}) {
    super();
    const {
      radius = 1,
      innerRadius = 0.5,
      height = 2,
      radialSegments = 16,
      heightSegments = 1,
    } = options;
    this.radius = Math.max(0, radius);
    this.innerRadius = Math.max(0, innerRadius);
    this.height = Math.max(0, height);
    this.radialSegments = Math.max(3, Math.floor(radialSegments));
    this.heightSegments = Math.max(1, Math.floor(heightSegments));
    this.generateGeometryData();
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const v: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const wireframeLines: number[] = [];
    const hh: number = this.height / 2.0;

    /**
     * Builds one surface of the tube (inner or outer).
     */
    const buildSurface = (r: number, isInner: boolean): void => {
      const offset: number = v.length / 3;
      for (let y: number = 0; y <= this.heightSegments; y++) {
        const vCoord: number = y / this.heightSegments;
        const yPos: number = vCoord * this.height - hh;

        for (let x: number = 0; x <= this.radialSegments; x++) {
          const uCoord: number = x / this.radialSegments;
          const theta: number = uCoord * MathUtils.TWO_PI;
          v.push(r * Math.sin(theta), yPos, r * Math.cos(theta));
          uv.push(uCoord, vCoord);
        }
      }

      for (let y: number = 0; y < this.heightSegments; y++) {
        for (let x: number = 0; x < this.radialSegments; x++) {
          const first: number = offset + y * (this.radialSegments + 1) + x;
          const second: number = first + this.radialSegments + 1;
          if (isInner) {
            idx.push(first, second, first + 1);
            idx.push(second, second + 1, first + 1);
          } else {
            idx.push(first, first + 1, second);
            idx.push(first + 1, second + 1, second);
          }
          wireframeLines.push(first, first + 1);
          wireframeLines.push(first, second);
        }
        const last = offset + y * (this.radialSegments + 1) + this.radialSegments;
        const belowLast = offset + (y + 1) * (this.radialSegments + 1) + this.radialSegments;
        wireframeLines.push(last, belowLast);
      }
      const bottomRow = offset + this.heightSegments * (this.radialSegments + 1);
      for (let x: number = 0; x < this.radialSegments; x++) {
        wireframeLines.push(bottomRow + x, bottomRow + x + 1);
      }
    };

    // Outer surface
    buildSurface(this.radius, false);
    // Inner surface
    buildSurface(this.innerRadius, true);

    const verticesPerSurface = (this.heightSegments + 1) * (this.radialSegments + 1);

    /**
     * Connects inner and outer surfaces with caps.
     */
    const connectCaps = (isTop: boolean): void => {
      const outerOffset: number = isTop ? this.heightSegments * (this.radialSegments + 1) : 0;
      const innerOffset: number =
        verticesPerSurface + (isTop ? this.heightSegments * (this.radialSegments + 1) : 0);

      for (let x: number = 0; x < this.radialSegments; x++) {
        const o1: number = outerOffset + x;
        const o2: number = outerOffset + x + 1;
        const i1: number = innerOffset + x;
        const i2: number = innerOffset + x + 1;

        if (isTop) {
          idx.push(o1, o2, i1);
          idx.push(i1, o2, i2);
        } else {
          idx.push(o1, i1, o2);
          idx.push(i1, i2, o2);
        }
        wireframeLines.push(o1, i1);
      }
      wireframeLines.push(outerOffset + this.radialSegments, innerOffset + this.radialSegments);
    };

    connectCaps(true);
    connectCaps(false);

    this._vertices = new Float32Array(v);
    this._uvs = new Float32Array(uv);
    this._indices = this._createIndexArray(idx.length);
    this._indices.set(idx);

    this._wireframeIndices = this._createIndexArray(wireframeLines.length);
    this._wireframeIndices.set(wireframeLines);

    this.computeNormals();
  }
}
