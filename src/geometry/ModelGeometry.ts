/// src/geometry/ModelGeometry.ts

import { AbstractGeometry } from "./AbstractGeometry.js";

/**
 * A geometry loaded from a model file.
 */
export class ModelGeometry extends AbstractGeometry {
  /**
   * Creates a new ModelGeometry.
   * @param vertices The vertices.
   * @param uvs The UV coordinates.
   * @param normals The normals.
   * @param indices The indices.
   */
  constructor(vertices: number[], uvs: number[], normals: number[], indices: number[]) {
    super();
    this._vertices = new Float32Array(vertices);
    this._uvs = new Float32Array(uvs);
    this._normals = new Float32Array(normals);
    this._indices = new Uint16Array(indices);

    // Falls das Modell keine Normalen mitbringt, berechnen wir sie selbst
    if (this._normals.length === 0) {
      this.computeNormals();
    }
  }

  /**
   * @inheritdoc
   */
  protected override generateGeometryData(): void {
    // Bleibt leer, da die Daten bereits im Konstruktor übergeben und gesetzt werden.
  }
}
