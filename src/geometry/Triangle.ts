/// src/geometry/Triangle.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
import { Vector3D } from "../math/Vector3D.js";

/**
 * A triangle geometry.
 */
export class Triangle extends AbstractGeometry {
  /**
   * Creates a new Triangle geometry.
   * @param pointA The first point.
   * @param pointB The second point.
   * @param pointC The third point.
   */
  constructor(
    public pointA: Vector3D,
    public pointB: Vector3D,
    public pointC: Vector3D,
  ) {
    super();
    this.generateGeometryData();
  }

  /**
   * @inheritdoc
   */
  protected override generateGeometryData(): void {
    this._vertices = new Float32Array([
      this.pointA.x,
      this.pointA.y,
      this.pointA.z,
      this.pointB.x,
      this.pointB.y,
      this.pointB.z,
      this.pointC.x,
      this.pointC.y,
      this.pointC.z,
    ]);
    this._uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);
    this._indices = new Uint16Array([0, 1, 2]);
  }
}
