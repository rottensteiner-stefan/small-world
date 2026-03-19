/// src/geometry/ModelGeometry.ts
import { AbstractGeometry } from "./AbstractGeometry.js";

export class ModelGeometry extends AbstractGeometry {
  constructor(vertices: number[], uvs: number[], normals: number[], indices: number[]) {
    super();
    this.vertices = new Float32Array(vertices);
    this.uvs = new Float32Array(uvs);
    this.normals = new Float32Array(normals);
    this.indices = new Uint16Array(indices);

    // Falls das Modell keine Normalen mitbringt, berechnen wir sie selbst
    if (this.normals.length === 0) {
      this.computeNormals();
    }
  }

  protected generateGeometryData(): void {
    // Bleibt leer, da die Daten bereits im Konstruktor übergeben und gesetzt werden.
  }
}
