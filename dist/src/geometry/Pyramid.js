/// src/geometry/Pyramid.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";
/**
 * A pyramid geometry with a flat base and a tip.
 */
export class Pyramid extends AbstractGeometry {
    /** The size of the base. */
    base;
    /** The height of the pyramid. */
    height;
    /** The number of radial segments. */
    radialSegments;
    /**
     * Creates a new Pyramid geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { base = 1, height = 1, radialSegments = 4 } = options;
        this.base = base;
        this.height = height;
        this.radialSegments = radialSegments;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        const v = [];
        const uv = [];
        const idx = [];
        const hh = this.height / 2.0;
        const rb = this.base / 2.0;
        // --- Side faces ---
        // Tip vertex
        v.push(0, hh, 0);
        uv.push(0.5, 1.0);
        const tipIndex = 0;
        for (let i = 0; i <= this.radialSegments; i++) {
            const theta = (i / this.radialSegments) * MathUtils.TWO_PI;
            v.push(rb * Math.sin(theta), -hh, rb * Math.cos(theta));
            uv.push(i / this.radialSegments, 0.0);
        }
        for (let i = 0; i < this.radialSegments; i++) {
            idx.push(tipIndex, i + 1, i + 2);
        }
        // --- Base cap ---
        const baseCenterIndex = v.length / 3;
        v.push(0, -hh, 0);
        uv.push(0.5, 0.5);
        const baseOffset = v.length / 3;
        for (let i = 0; i <= this.radialSegments; i++) {
            const theta = (i / this.radialSegments) * MathUtils.TWO_PI;
            v.push(rb * Math.sin(theta), -hh, rb * Math.cos(theta));
            uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 + Math.cos(theta) * 0.5);
        }
        for (let i = 0; i < this.radialSegments; i++) {
            idx.push(baseCenterIndex, baseOffset + i + 1, baseOffset + i);
        }
        this._vertices = new Float32Array(v);
        this._uvs = new Float32Array(uv);
        this._indices = this._createIndexArray(idx.length);
        this._indices.set(idx);
        this.computeNormals();
    }
}
//# sourceMappingURL=Pyramid.js.map