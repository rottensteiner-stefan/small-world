/// src/geometry/Torus.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";
/**
 * A torus (donut-shaped) geometry.
 */
export class Torus extends AbstractGeometry {
    /** The radius of the torus ring. */
    radius;
    /** The radius of the tube. */
    tube;
    /** The number of radial segments. */
    radialSegments;
    /** The number of tubular segments. */
    tubularSegments;
    /**
     * Creates a new Torus geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { radius = 1, tube = 0.4, radialSegments = 16, tubularSegments = 32 } = options;
        this.radius = radius;
        this.tube = tube;
        this.radialSegments = radialSegments;
        this.tubularSegments = tubularSegments;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        const v = [];
        const uv = [];
        const idx = [];
        for (let j = 0; j <= this.radialSegments; j++) {
            const vRatio = j / this.radialSegments;
            const vArg = vRatio * MathUtils.TWO_PI;
            const cosV = Math.cos(vArg);
            const sinV = Math.sin(vArg);
            for (let i = 0; i <= this.tubularSegments; i++) {
                const uRatio = i / this.tubularSegments;
                const uArg = uRatio * MathUtils.TWO_PI;
                const cosU = Math.cos(uArg);
                const sinU = Math.sin(uArg);
                v.push((this.radius + this.tube * cosV) * cosU, this.tube * sinV, (this.radius + this.tube * cosV) * sinU);
                uv.push(uRatio, vRatio);
            }
        }
        for (let j = 1; j <= this.radialSegments; j++) {
            for (let i = 1; i <= this.tubularSegments; i++) {
                const a = (this.tubularSegments + 1) * j + i - 1;
                const b = (this.tubularSegments + 1) * (j - 1) + i - 1;
                const c = (this.tubularSegments + 1) * (j - 1) + i;
                const d = (this.tubularSegments + 1) * j + i;
                idx.push(a, d, b);
                idx.push(b, d, c);
            }
        }
        this._vertices = new Float32Array(v);
        this._uvs = new Float32Array(uv);
        this._indices = this._createIndexArray(idx.length);
        this._indices.set(idx);
        this.computeNormals();
    }
}
//# sourceMappingURL=Torus.js.map