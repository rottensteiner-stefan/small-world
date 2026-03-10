import { ObjectGeometry } from "./ObjectGeometry.js";
export class Sphere extends ObjectGeometry {
    radius;
    widthSegments;
    heightSegments;
    constructor(radius = 1, widthSegments = 16, heightSegments = 12) {
        super();
        this.radius = radius;
        this.widthSegments = widthSegments;
        this.heightSegments = heightSegments;
        this.generateGeometryData();
    }
    generateGeometryData() {
        const v = [];
        const uv = [];
        const idx = [];
        for (let y = 0; y <= this.heightSegments; y++) {
            const vRatio = y / this.heightSegments;
            const phi = vRatio * Math.PI;
            for (let x = 0; x <= this.widthSegments; x++) {
                const uRatio = x / this.widthSegments;
                const theta = uRatio * Math.PI * 2;
                v.push(-(this.radius * Math.sin(phi) * Math.cos(theta)), this.radius * Math.cos(phi), this.radius * Math.sin(phi) * Math.sin(theta));
                uv.push(uRatio, 1 - vRatio);
            }
        }
        for (let y = 0; y < this.heightSegments; y++) {
            for (let x = 0; x < this.widthSegments; x++) {
                const first = y * (this.widthSegments + 1) + x;
                const second = first + this.widthSegments + 1;
                idx.push(first, second, first + 1);
                idx.push(second, second + 1, first + 1);
            }
        }
        this.vertices = new Float32Array(v);
        this.uvs = new Float32Array(uv);
        this.indices = new Uint16Array(idx);
        this.computeNormals();
    }
}
//# sourceMappingURL=Sphere.js.map