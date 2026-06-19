/// src/geometry/Plane.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
/**
 * A simple flat plane geometry on the XZ plane.
 */
export class Plane extends AbstractGeometry {
    /** The width of the plane. */
    width;
    /** The depth of the plane. */
    depth;
    /** The number of segments along the width. */
    widthSegments;
    /** The number of segments along the depth. */
    depthSegments;
    /**
     * Creates a new Plane geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { width = 1, depth = 1, widthSegments = 1, depthSegments = 1 } = options;
        this.width = width;
        this.depth = depth;
        this.widthSegments = widthSegments;
        this.depthSegments = depthSegments;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        const v = [];
        const uv = [];
        const idx = [];
        const hW = this.width / 2.0;
        const hD = this.depth / 2.0;
        for (let z = 0; z <= this.depthSegments; z++) {
            const vRatio = z / this.depthSegments;
            for (let x = 0; x <= this.widthSegments; x++) {
                const uRatio = x / this.widthSegments;
                v.push(uRatio * this.width - hW, 0, vRatio * this.depth - hD);
                uv.push(uRatio, 1.0 - vRatio);
            }
        }
        for (let z = 0; z < this.depthSegments; z++) {
            for (let x = 0; x < this.widthSegments; x++) {
                const a = x + (this.widthSegments + 1) * z;
                const b = x + (this.widthSegments + 1) * (z + 1);
                const c = x + 1 + (this.widthSegments + 1) * (z + 1);
                const d = x + 1 + (this.widthSegments + 1) * z;
                idx.push(a, b, d);
                idx.push(b, c, d);
            }
        }
        this._vertices = new Float32Array(v);
        this._uvs = new Float32Array(uv);
        this._indices = this._createIndexArray(idx.length);
        this._indices.set(idx);
        this.computeNormals();
    }
}
//# sourceMappingURL=Plane.js.map