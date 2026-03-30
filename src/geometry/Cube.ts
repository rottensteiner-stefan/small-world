/// src/geometry/Cube.ts

import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * Configuration options for cube geometry.
 */
export interface CubeOptions {
  /** The size of the cube. Defaults to 1. */
  size?: number;
  /** Number of segments along the width. Defaults to 1. */
  widthSegments?: number;
  /** Number of segments along the height. Defaults to 1. */
  heightSegments?: number;
  /** Number of segments along the depth. Defaults to 1. */
  depthSegments?: number;
}

/**
 * A cube geometry with support for subdivisions.
 */
export class Cube extends AbstractGeometry {
  /** The size of the cube. */
  public size: number;
  /** Number of segments along the width. */
  public widthSegments: number;
  /** Number of segments along the height. */
  public heightSegments: number;
  /** Number of segments along the depth. */
  public depthSegments: number;

  /**
   * Creates a new Cube geometry.
   * @param options The configuration options for the cube.
   */
  constructor(options: CubeOptions = {}) {
    super();
    const { size = 1, widthSegments = 1, heightSegments = 1, depthSegments = 1 } = options;
    this.size = size;
    this.widthSegments = widthSegments;
    this.heightSegments = heightSegments;
    this.depthSegments = depthSegments;
    this.generateGeometryData();
  }

  /** @inheritdoc */
  protected override generateGeometryData(): void {
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    let vertexCount: number = 0;

    const buildPlane = (
      u: "x" | "y" | "z",
      v: "x" | "y" | "z",
      w: "x" | "y" | "z",
      udir: number,
      vdir: number,
      width: number,
      height: number,
      depth: number,
      gridX: number,
      gridY: number,
    ): void => {
      const segmentWidth: number = width / gridX;
      const segmentHeight: number = height / gridY;
      const widthHalf: number = width / 2;
      const heightHalf: number = height / 2;
      const depthHalf: number = depth / 2;

      for (let iy: number = 0; iy <= gridY; iy++) {
        const y: number = iy * segmentHeight - heightHalf;
        for (let ix: number = 0; ix <= gridX; ix++) {
          const x: number = ix * segmentWidth - widthHalf;

          const vertex: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
          vertex[u] = x * udir;
          vertex[v] = y * vdir;
          vertex[w] = depthHalf;

          vertices.push(vertex.x, vertex.y, vertex.z);
          uvs.push(ix / gridX, 1 - iy / gridY);

          if (iy < gridY && ix < gridX) {
            const a: number = vertexCount + ix + iy * (gridX + 1);
            const b: number = vertexCount + ix + (iy + 1) * (gridX + 1);
            const c: number = vertexCount + ix + 1 + (iy + 1) * (gridX + 1);
            const d: number = vertexCount + ix + 1 + iy * (gridX + 1);

            indices.push(a, b, d);
            indices.push(b, c, d);
          }
        }
      }
      vertexCount += (gridX + 1) * (gridY + 1);
    };

    // Build all 6 sides
    buildPlane(
      "z",
      "y",
      "x",
      -1,
      -1,
      this.size,
      this.size,
      this.size,
      this.depthSegments,
      this.heightSegments,
    ); // Right
    buildPlane(
      "z",
      "y",
      "x",
      1,
      -1,
      this.size,
      this.size,
      -this.size,
      this.depthSegments,
      this.heightSegments,
    ); // Left
    buildPlane(
      "x",
      "z",
      "y",
      1,
      1,
      this.size,
      this.size,
      this.size,
      this.widthSegments,
      this.depthSegments,
    ); // Top
    buildPlane(
      "x",
      "z",
      "y",
      1,
      -1,
      this.size,
      this.size,
      -this.size,
      this.widthSegments,
      this.depthSegments,
    ); // Bottom
    buildPlane(
      "x",
      "y",
      "z",
      1,
      -1,
      this.size,
      this.size,
      this.size,
      this.widthSegments,
      this.heightSegments,
    ); // Front
    buildPlane(
      "x",
      "y",
      "z",
      -1,
      -1,
      this.size,
      this.size,
      -this.size,
      this.widthSegments,
      this.heightSegments,
    ); // Back

    this._vertices = new Float32Array(vertices);
    this._uvs = new Float32Array(uvs);
    this._indices = new Uint16Array(indices);

    this.computeNormals();
  }
}
