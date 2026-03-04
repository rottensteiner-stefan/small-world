import { Vector3D } from "../math/Vector3D.js";

export class Sphere {
  /**
   * Erzeugt eine Kugel-Geometrie (Wireframe).
   * @param radius Der Radius der Kugel.
   * @param widthSegments Anzahl der Segmente um die Y-Achse (Längengrade).
   * @param heightSegments Anzahl der Segmente entlang der Y-Achse (Breitengrade).
   */
  constructor(
    public radius: number = 1,
    public widthSegments: number = 16,
    public heightSegments: number = 12,
  ) {}

  public getPrimitiveData() {
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y <= this.heightSegments; y++) {
      const v = y / this.heightSegments;
      const phi = v * Math.PI;

      for (let x = 0; x <= this.widthSegments; x++) {
        const u = x / this.widthSegments;
        const theta = u * Math.PI * 2;

        // Sphärische Koordinaten in Vector3D umrechnen
        const pos = new Vector3D(
          -(this.radius * Math.sin(phi) * Math.cos(theta)),
          this.radius * Math.cos(phi),
          this.radius * Math.sin(phi) * Math.sin(theta),
        );

        vertices.push(pos.x, pos.y, pos.z);
      }
    }

    for (let y = 0; y < this.heightSegments; y++) {
      for (let x = 0; x < this.widthSegments; x++) {
        const first = y * (this.widthSegments + 1) + x;
        const second = first + this.widthSegments + 1;

        // Wireframe-Linien (Längs- und Breitengrade)
        indices.push(first, second);
        indices.push(first, first + 1);
      }
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }
}
