import { ObjectGeometry } from "./ObjectGeometry.js";
export class Plane extends ObjectGeometry {
    width;
    depth;
    widthSegments;
    depthSegments;
    constructor(width = 1, depth = 1, widthSegments = 1, depthSegments = 1) {
        super();
        this.width = width;
        this.depth = depth;
        this.widthSegments = widthSegments;
        this.depthSegments = depthSegments;
        this.generateGeometryData();
    }
    generateGeometryData() {
        const v = [];
        const uv = [];
        const i = [];
        const hW = this.width / 2;
        const hD = this.depth / 2;
        for (let z = 0; z <= this.depthSegments; z++) {
            const vRatio = z / this.depthSegments;
            for (let x = 0; x <= this.widthSegments; x++) {
                const uRatio = x / this.widthSegments;
                v.push(uRatio * this.width - hW, 0, vRatio * this.depth - hD);
                uv.push(uRatio, 1 - vRatio);
            }
        }
        for (let z = 0; z < this.depthSegments; z++) {
            for (let x = 0; x < this.widthSegments; x++) {
                const a = x + (this.widthSegments + 1) * z;
                const b = x + (this.widthSegments + 1) * (z + 1);
                const c = x + 1 + (this.widthSegments + 1) * (z + 1);
                const d = x + 1 + (this.widthSegments + 1) * z;
                i.push(a, b, d);
                i.push(b, c, d);
            }
        }
        this.vertices = new Float32Array(v);
        this.uvs = new Float32Array(uv);
        this.indices = new Uint16Array(i);
        this.computeNormals();
    }
}
//# sourceMappingURL=Plane.js.map