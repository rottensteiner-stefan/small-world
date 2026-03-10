import { ObjectGeometry } from "./ObjectGeometry.js";
export class Cylinder extends ObjectGeometry {
    radius;
    height;
    segments;
    constructor(radius = 1, height = 2, segments = 16) {
        super();
        this.radius = radius;
        this.height = height;
        this.segments = segments;
        this.generateGeometryData();
    }
    generateGeometryData() {
        const v = [];
        const uv = [];
        const idx = [];
        const hh = this.height / 2;
        // --- Seitenwand ---
        for (let y = 0; y <= 1; y++) {
            const yPos = y === 0 ? -hh : hh;
            const vCoord = y === 0 ? 0 : 1;
            for (let x = 0; x <= this.segments; x++) {
                const uCoord = x / this.segments;
                const theta = uCoord * Math.PI * 2;
                v.push(this.radius * Math.sin(theta), yPos, this.radius * Math.cos(theta));
                uv.push(uCoord, vCoord);
            }
        }
        for (let x = 0; x < this.segments; x++) {
            const first = x;
            const second = first + this.segments + 1;
            idx.push(first, second, first + 1);
            idx.push(second, second + 1, first + 1);
        }
        // --- Deckel Oben ---
        let offset = v.length / 3;
        v.push(0, hh, 0);
        uv.push(0.5, 0.5); // Zentrum
        for (let x = 0; x <= this.segments; x++) {
            const theta = (x / this.segments) * Math.PI * 2;
            v.push(this.radius * Math.sin(theta), hh, this.radius * Math.cos(theta));
            uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 + Math.cos(theta) * 0.5);
        }
        for (let x = 0; x < this.segments; x++)
            idx.push(offset, offset + x + 1, offset + x + 2);
        // --- Deckel Unten ---
        offset = v.length / 3;
        v.push(0, -hh, 0);
        uv.push(0.5, 0.5); // Zentrum
        for (let x = 0; x <= this.segments; x++) {
            const theta = (x / this.segments) * Math.PI * 2;
            v.push(this.radius * Math.sin(theta), -hh, this.radius * Math.cos(theta));
            uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 - Math.cos(theta) * 0.5);
        }
        for (let x = 0; x < this.segments; x++)
            idx.push(offset, offset + x + 2, offset + x + 1);
        this.vertices = new Float32Array(v);
        this.uvs = new Float32Array(uv);
        this.indices = new Uint16Array(idx);
        this.computeNormals();
    }
}
//# sourceMappingURL=Cylinder.js.map