/// src/geometry/Line.ts

import { AbstractGeometry } from "./AbstractGeometry.js";
import { Vector3D } from "../math/Vector3D.js";

/**
 * A simple line geometry.
 */
export class Line extends AbstractGeometry {
  /**
   * Creates a new Line geometry.
   * @param start The start point.
   * @param end The end point.
   */
  constructor(
    public start: Vector3D,
    public end: Vector3D,
  ) {
    super();
    this.generateGeometryData();
  }

  /**
   * @inheritdoc
   */
  protected override generateGeometryData(): void {
    this._vertices = new Float32Array([
      this.start.x,
      this.start.y,
      this.start.z,
      this.end.x,
      this.end.y,
      this.end.z,
    ]);
    this._uvs = new Float32Array([0, 0, 1, 1]);
    this._indices = new Uint16Array([0, 1]);
  }
}
