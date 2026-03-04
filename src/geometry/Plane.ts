export class Plane {
  /**
   * Erzeugt eine flache Ebene (XZ-Ausrichtung).
   * @param width Die Breite der Ebene (X-Achse).
   * @param depth Die Tiefe der Ebene (Z-Achse).
   * @param widthSegments Unterteilungen in der Breite.
   * @param depthSegments Unterteilungen in der Tiefe.
   */
  constructor(
    public width: number = 1,
    public depth: number = 1,
    public widthSegments: number = 1,
    public depthSegments: number = 1,
  ) {}

  public getPrimitiveData() {
    const vertices: number[] = [];
    const indices: number[] = [];

    const halfWidth = this.width / 2;
    const halfDepth = this.depth / 2;

    const segmentWidth = this.width / this.widthSegments;
    const segmentDepth = this.depth / this.depthSegments;

    // Erzeuge Vertices
    for (let z = 0; z <= this.depthSegments; z++) {
      const zPos = z * segmentDepth - halfDepth;
      for (let x = 0; x <= this.widthSegments; x++) {
        const xPos = x * segmentWidth - halfWidth;
        vertices.push(xPos, 0, zPos);
      }
    }

    // Erzeuge Indizes für das Wireframe (Gitter-Linien)
    for (let z = 0; z <= this.depthSegments; z++) {
      for (let x = 0; x <= this.widthSegments; x++) {
        const current = z * (this.widthSegments + 1) + x;

        // Horizontale Linie
        if (x < this.widthSegments) {
          indices.push(current, current + 1);
        }
        // Vertikale Linie
        if (z < this.depthSegments) {
          indices.push(current, current + (this.widthSegments + 1));
        }
      }
    }

    return {
      vertices: new Float32Array(vertices),
      indices: new Uint16Array(indices),
    };
  }
}
