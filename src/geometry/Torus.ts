import { ObjectGeometry } from "./ObjectGeometry.js";

export class Torus extends ObjectGeometry {
  constructor(
    public radius: number = 1,
    public tube: number = 0.4,
    public radialSegments: number = 16,
    public tubularSegments: number = 32,
  ) {
    super();
    this.generateGeometryData();
  }

  protected generateGeometryData(): void {
    const v: number[] = [];
    const idx: number[] = [];

    // Vertices berechnen
    for (let j = 0; j <= this.radialSegments; j++) {
      const vArg = (j / this.radialSegments) * Math.PI * 2;
      const cosV = Math.cos(vArg);
      const sinV = Math.sin(vArg);

      for (let i = 0; i <= this.tubularSegments; i++) {
        const uArg = (i / this.tubularSegments) * Math.PI * 2;
        const cosU = Math.cos(uArg);
        const sinU = Math.sin(uArg);

        const x = (this.radius + this.tube * cosV) * cosU;
        const y = this.tube * sinV;
        const z = (this.radius + this.tube * cosV) * sinU;

        v.push(x, y, z);
      }
    }

    // Indizes (Dreiecke) verknüpfen
    for (let j = 1; j <= this.radialSegments; j++) {
      for (let i = 1; i <= this.tubularSegments; i++) {
        const a = (this.tubularSegments + 1) * j + i - 1;
        const b = (this.tubularSegments + 1) * (j - 1) + i - 1;
        const c = (this.tubularSegments + 1) * (j - 1) + i;
        const d = (this.tubularSegments + 1) * j + i;

        idx.push(a, b, d);
        idx.push(b, c, d);
      }
    }

    this.vertices = new Float32Array(v);
    this.indices = new Uint16Array(idx);
    this.computeNormals();
  }
}
