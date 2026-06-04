/// src/geometry/Disk.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";
/**
 * A disk geometry with concentric rings, providing better tessellation for displacement than a simple Circle.
 */
export class Disk extends AbstractGeometry {
    /** The radius of the disk. */
    radius;
    /** The number of segments. */
    segments;
    /** The number of rings. */
    rings;
    /**
     * Creates a new Disk geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { radius = 1, segments = 32, rings = 8 } = options;
        this.radius = radius;
        this.segments = segments;
        this.rings = rings;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        const v = [];
        const uv = [];
        const idx = [];
        // Center vertex
        v.push(0, 0, 0);
        uv.push(0.5, 0.5);
        // Vertices for each ring
        for (let r = 1; r <= this.rings; r++) {
            const ringRadius = (r / this.rings) * this.radius;
            for (let s = 0; s <= this.segments; s++) {
                const segmentAngle = (s / this.segments) * MathUtils.TWO_PI;
                const cos = Math.cos(segmentAngle);
                const sin = Math.sin(segmentAngle);
                v.push(cos * ringRadius, 0, sin * ringRadius);
                uv.push(0.5 + cos * 0.5 * (r / this.rings), 0.5 + sin * 0.5 * (r / this.rings));
            }
        }
        // Indices
        // Center to first ring
        for (let s = 0; s < this.segments; s++) {
            idx.push(0, s + 1, s + 2);
        }
        // Subsequent rings
        for (let r = 1; r < this.rings; r++) {
            const offset = 1 + (r - 1) * (this.segments + 1);
            const nextOffset = 1 + r * (this.segments + 1);
            for (let s = 0; s < this.segments; s++) {
                const a = offset + s;
                const b = offset + s + 1;
                const c = nextOffset + s + 1;
                const d = nextOffset + s;
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
//# sourceMappingURL=Disk.js.map