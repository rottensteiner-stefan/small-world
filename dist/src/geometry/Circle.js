/// src/geometry/Circle.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";
/**
 * A simple circle geometry, optionally as a segment or sector.
 */
export class Circle extends AbstractGeometry {
    /** The radius of the circle. */
    radius;
    /** The number of segments. */
    segments;
    /** The start angle in radians. */
    thetaStart;
    /** The central angle in radians. */
    thetaLength;
    /**
     * Creates a new Circle geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { radius = 1, segments = 32, thetaStart = 0, thetaLength = MathUtils.TWO_PI } = options;
        this.radius = radius;
        this.segments = segments;
        this.thetaStart = thetaStart;
        this.thetaLength = thetaLength;
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
        const centerIndex = 0;
        // Vertices on the circumference
        for (let n = 0; n <= this.segments; n++) {
            const segmentAngle = this.thetaStart + (n / this.segments) * this.thetaLength;
            const cos = Math.cos(segmentAngle);
            const sin = Math.sin(segmentAngle);
            v.push(cos * this.radius, 0, sin * this.radius);
            uv.push(0.5 + cos * 0.5, 0.5 + sin * 0.5);
        }
        // Indices for triangles (fan from center)
        for (let n = 0; n < this.segments; n++) {
            idx.push(centerIndex, n + 1, n + 2);
        }
        this._vertices = new Float32Array(v);
        this._uvs = new Float32Array(uv);
        this._indices = this._createIndexArray(idx.length);
        this._indices.set(idx);
        this.computeNormals();
    }
}
//# sourceMappingURL=Circle.js.map