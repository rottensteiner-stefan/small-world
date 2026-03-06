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
        const idx = [];
        for (let y = 0; y <= this.heightSegments; y++) {
            const phi = (y / this.heightSegments) * Math.PI;
            for (let x = 0; x <= this.widthSegments; x++) {
                const theta = (x / this.widthSegments) * Math.PI * 2;
                v.push(-(this.radius * Math.sin(phi) * Math.cos(theta)), this.radius * Math.cos(phi), this.radius * Math.sin(phi) * Math.sin(theta));
            }
        }
        for (let y = 0; y < this.heightSegments; y++) {
            for (let x = 0; x < this.widthSegments; x++) {
                const first = y * (this.widthSegments + 1) + x;
                const second = first + this.widthSegments + 1;
                idx.push(first, second, first, first + 1);
            }
        }
        this.vertices = new Float32Array(v);
        this.indices = new Uint16Array(idx);
    }
}
//# sourceMappingURL=Sphere.js.map