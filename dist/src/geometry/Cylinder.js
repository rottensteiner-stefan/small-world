/// src/geometry/Cylinder.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";
/**
 * A generalized cylinder geometry.
 * Can represent standard cylinders, cones (top radius 0), and conical frustums.
 * Supports partial sectors (pie slices) via thetaStart and thetaLength.
 */
export class Cylinder extends AbstractGeometry {
    /** The radius at the top. */
    radiusTop;
    /** The radius at the bottom. */
    radiusBottom;
    /** The total height. */
    height;
    /** The number of radial segments. */
    radialSegments;
    /** The number of height segments. */
    heightSegments;
    /** The start angle in radians. */
    thetaStart;
    /** The central angle in radians. */
    thetaLength;
    /**
     * Creates a new Cylinder geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { radiusTop = 1, radiusBottom = 1, height = 2, radialSegments = 16, heightSegments = 1, thetaStart = 0, thetaLength = MathUtils.TWO_PI, } = options;
        this.radiusTop = radiusTop;
        this.radiusBottom = radiusBottom;
        this.height = height;
        this.radialSegments = radialSegments;
        this.heightSegments = heightSegments;
        this.thetaStart = thetaStart;
        this.thetaLength = thetaLength;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        const v = [];
        const uv = [];
        const idx = [];
        const hh = this.height / 2.0;
        // --- Side surface ---
        for (let y = 0; y <= this.heightSegments; y++) {
            const vCoord = y / this.heightSegments;
            const yPos = vCoord * this.height - hh;
            const radius = vCoord * (this.radiusTop - this.radiusBottom) + this.radiusBottom;
            for (let x = 0; x <= this.radialSegments; x++) {
                const uCoord = x / this.radialSegments;
                const theta = this.thetaStart + uCoord * this.thetaLength;
                v.push(radius * Math.sin(theta), yPos, radius * Math.cos(theta));
                uv.push(uCoord, 1.0 - vCoord);
            }
        }
        for (let y = 0; y < this.heightSegments; y++) {
            for (let x = 0; x < this.radialSegments; x++) {
                const first = y * (this.radialSegments + 1) + x;
                const second = first + this.radialSegments + 1;
                idx.push(first, first + 1, second);
                idx.push(first + 1, second + 1, second);
            }
        }
        // --- Top cap ---
        if (0 < this.radiusTop) {
            const topOffset = v.length / 3;
            v.push(0, hh, 0); // Center point
            uv.push(0.5, 0.5);
            for (let x = 0; x <= this.radialSegments; x++) {
                const uCoord = x / this.radialSegments;
                const theta = this.thetaStart + uCoord * this.thetaLength;
                v.push(this.radiusTop * Math.sin(theta), hh, this.radiusTop * Math.cos(theta));
                uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 + Math.cos(theta) * 0.5);
            }
            for (let x = 0; x < this.radialSegments; x++) {
                idx.push(topOffset, topOffset + x + 1, topOffset + x + 2);
            }
        }
        // --- Bottom cap ---
        if (0 < this.radiusBottom) {
            const bottomOffset = v.length / 3;
            v.push(0, -hh, 0); // Center point
            uv.push(0.5, 0.5);
            for (let x = 0; x <= this.radialSegments; x++) {
                const uCoord = x / this.radialSegments;
                const theta = this.thetaStart + uCoord * this.thetaLength;
                v.push(this.radiusBottom * Math.sin(theta), -hh, this.radiusBottom * Math.cos(theta));
                uv.push(0.5 + Math.sin(theta) * 0.5, 0.5 - Math.cos(theta) * 0.5);
            }
            for (let x = 0; x < this.radialSegments; x++) {
                idx.push(bottomOffset, bottomOffset + x + 2, bottomOffset + x + 1);
            }
        }
        // --- Side caps (for partial sectors) ---
        if (MathUtils.TWO_PI > this.thetaLength) {
            const buildSideCap = (isStart) => {
                const angle = isStart ? this.thetaStart : this.thetaStart + this.thetaLength;
                const sin = Math.sin(angle);
                const cos = Math.cos(angle);
                const offset = v.length / 3;
                // Points along the axis (center) and the edge
                for (let y = 0; y <= this.heightSegments; y++) {
                    const vCoord = y / this.heightSegments;
                    const yPos = vCoord * this.height - hh;
                    const radius = vCoord * (this.radiusTop - this.radiusBottom) + this.radiusBottom;
                    v.push(0, yPos, 0); // Axis point
                    uv.push(0, vCoord);
                    v.push(radius * sin, yPos, radius * cos); // Edge point
                    uv.push(1, vCoord);
                }
                for (let y = 0; y < this.heightSegments; y++) {
                    const base = offset + y * 2;
                    if (isStart) {
                        idx.push(base, base + 1, base + 2);
                        idx.push(base + 2, base + 1, base + 3);
                    }
                    else {
                        idx.push(base, base + 2, base + 1);
                        idx.push(base + 2, base + 3, base + 1);
                    }
                }
            };
            buildSideCap(true);
            buildSideCap(false);
        }
        this._vertices = new Float32Array(v);
        this._uvs = new Float32Array(uv);
        this._indices = this._createIndexArray(idx.length);
        this._indices.set(idx);
        this.computeNormals();
    }
}
//# sourceMappingURL=Cylinder.js.map