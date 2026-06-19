/// src/geometry/Capsule.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";
/**
 * A capsule geometry consisting of a cylinder with hemispherical caps.
 */
export class Capsule extends AbstractGeometry {
    /** The radius of the capsule. */
    radius;
    /** The length of the cylinder part. */
    length;
    /** The number of radial segments. */
    radialSegments;
    /** The number of segments for the caps. */
    capSegments;
    /**
     * Creates a new Capsule geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { radius = 0.5, length = 1, radialSegments = 16, capSegments = 8 } = options;
        this.radius = radius;
        this.length = length;
        this.radialSegments = radialSegments;
        this.capSegments = capSegments;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        const v = [];
        const n = [];
        const uv = [];
        const idx = [];
        const halfLength = this.length / 2.0;
        // --- Generate Vertices and Normals ---
        // From top cap to bottom cap
        for (let y = 0; y <= this.capSegments * 2 + 1; y++) {
            let radius;
            let yPos;
            let vCoord;
            // Top cap
            if (y <= this.capSegments) {
                const phi = (y / this.capSegments) * MathUtils.HALF_PI - MathUtils.HALF_PI;
                radius = this.radius * Math.cos(phi);
                yPos = halfLength - this.radius * Math.sin(phi);
                vCoord = (y / (this.capSegments * 2 + 1)) * 0.5;
            }
            // Bottom cap
            else {
                const phi = ((y - 1) / this.capSegments) * MathUtils.HALF_PI - MathUtils.HALF_PI;
                radius = this.radius * Math.cos(phi);
                yPos = -halfLength - this.radius * Math.sin(phi);
                vCoord = y / (this.capSegments * 2 + 1);
            }
            for (let x = 0; x <= this.radialSegments; x++) {
                const uCoord = x / this.radialSegments;
                const theta = uCoord * MathUtils.TWO_PI;
                const vx = radius * Math.sin(theta);
                const vz = radius * Math.cos(theta);
                v.push(vx, yPos, vz);
                // Normals: From center of the caps or outwards from cylinder axis
                const nx = vx;
                const ny = y <= this.capSegments ? yPos - halfLength : yPos + halfLength;
                const nz = vz;
                const nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
                if (0 < nLen) {
                    n.push(nx / nLen, ny / nLen, nz / nLen);
                }
                else {
                    n.push(0, 1, 0);
                }
                uv.push(uCoord, 1.0 - vCoord);
            }
        }
        // --- Generate Indices ---
        for (let y = 0; y < this.capSegments * 2 + 1; y++) {
            for (let x = 0; x < this.radialSegments; x++) {
                const first = y * (this.radialSegments + 1) + x;
                const second = first + this.radialSegments + 1;
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
//# sourceMappingURL=Capsule.js.map