import { ObjectGeometry } from "./ObjectGeometry.js";

export class Cube extends ObjectGeometry {
  constructor(public size: number = 1) {
    super();
    this.generateGeometryData();
  }

  protected generateGeometryData(): void {
    const h = this.size / 2;
    // 8 Ecken des Würfels
    this.vertices = new Float32Array([
      -h,
      -h,
      h,
      h,
      -h,
      h,
      h,
      h,
      h,
      -h,
      h,
      h, // Vorne (0, 1, 2, 3)
      -h,
      -h,
      -h,
      h,
      -h,
      -h,
      h,
      h,
      -h,
      -h,
      h,
      -h, // Hinten (4, 5, 6, 7)
    ]);

    // 36 Indizes (12 Dreiecke = 6 Seiten * 2 Dreiecke pro Seite)
    this.indices = new Uint16Array([
      // Front
      0, 1, 2, 0, 2, 3,
      // Right
      1, 5, 6, 1, 6, 2,
      // Back
      5, 4, 7, 5, 7, 6,
      // Left
      4, 0, 3, 4, 3, 7,
      // Top
      3, 2, 6, 3, 6, 7,
      // Bottom
      4, 5, 1, 4, 1, 0,
    ]);
  }
}
