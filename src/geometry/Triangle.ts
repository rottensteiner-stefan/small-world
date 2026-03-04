import { Vector3D } from "../math/Vector3D.js";

export class Triangle {
  /**
   * Erzeugt ein einzelnes Dreieck.
   * @param pointA Erster Eckpunkt.
   * @param pointB Zweiter Eckpunkt.
   * @param pointC Dritter Eckpunkt.
   */
  constructor(
    public pointA: Vector3D = new Vector3D(0, 1, 0),
    public pointB: Vector3D = new Vector3D(-1, -1, 0),
    public pointC: Vector3D = new Vector3D(1, -1, 0),
  ) {}

  public getPrimitiveData() {
    const vertices = new Float32Array([
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

    // Linienzug für das Dreieck: A->B, B->C, C->A
    const indices = new Uint16Array([0, 1, 1, 2, 2, 0]);

    return { vertices, indices };
  }
}
