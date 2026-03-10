import { ObjectGeometry } from "./ObjectGeometry.js";
export class Torus extends ObjectGeometry {
    radius;
    tube;
    radialSegments;
    tubularSegments;
    constructor(radius = 1, tube = 0.4, radialSegments = 16, tubularSegments = 32) {
        super();
        this.radius = radius;
        this.tube = tube;
        this.radialSegments = radialSegments;
        this.tubularSegments = tubularSegments;
        this.generateGeometryData();
    }
    generateGeometryData() {
        const v = [];
        const idx = [];
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
//# sourceMappingURL=Torus.js.map