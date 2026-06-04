/// src/geometry/Sphere.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";
/**
 * A spherical geometry based on UV mapping (latitude-longitude).
 */
export class Sphere extends AbstractGeometry {
    /** The radius of the sphere. */
    radius;
    /** The number of horizontal segments. */
    widthSegments;
    /** The number of vertical segments. */
    heightSegments;
    /**
     * Creates a new Sphere geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { radius = 1, widthSegments = 16, heightSegments = 12 } = options;
        this.radius = radius;
        this.widthSegments = widthSegments;
        this.heightSegments = heightSegments;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        const v = [];
        const n = [];
        const uv = [];
        const idx = [];
        for (let y = 0; y <= this.heightSegments; y++) {
            const vRatio = y / this.heightSegments;
            const phi = vRatio * Math.PI;
            for (let x = 0; x <= this.widthSegments; x++) {
                const uRatio = x / this.widthSegments;
                // Exact 0 at start, and exact TWO_PI at end to avoid precision issues
                const theta = this.widthSegments === x ? 0 : uRatio * MathUtils.TWO_PI;
                let px, py, pz;
                if (0 === y) {
                    px = 0;
                    py = this.radius;
                    pz = 0;
                }
                else if (this.heightSegments === y) {
                    px = 0;
                    py = -this.radius;
                    pz = 0;
                }
                else {
                    px = -(this.radius * Math.sin(phi) * Math.cos(theta));
                    py = this.radius * Math.cos(phi);
                    pz = this.radius * Math.sin(phi) * Math.sin(theta);
                }
                v.push(px, py, pz);
                n.push(px / this.radius, py / this.radius, pz / this.radius);
                uv.push(uRatio, vRatio);
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
        this._vertices = new Float32Array(v);
        this._normals = new Float32Array(n);
        this._uvs = new Float32Array(uv);
        this._indices = this._createIndexArray(idx.length);
        this._indices.set(idx);
    }
}
//# sourceMappingURL=Sphere.js.map