/// src/geometry/Tube.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
import { MathUtils } from "../math/index.js";
/**
 * A hollow cylinder geometry (Tube).
 */
export class Tube extends AbstractGeometry {
    /** The outer radius. */
    radius;
    /** The inner radius. */
    innerRadius;
    /** The height. */
    height;
    /** The number of radial segments. */
    radialSegments;
    /** The number of height segments. */
    heightSegments;
    /**
     * Creates a new Tube geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { radius = 1, innerRadius = 0.5, height = 2, radialSegments = 16, heightSegments = 1, } = options;
        this.radius = radius;
        this.innerRadius = innerRadius;
        this.height = height;
        this.radialSegments = radialSegments;
        this.heightSegments = heightSegments;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        const v = [];
        const uv = [];
        const idx = [];
        const hh = this.height / 2.0;
        /**
         * Builds one surface of the tube (inner or outer).
         */
        const buildSurface = (r, isInner) => {
            const offset = v.length / 3;
            for (let y = 0; y <= this.heightSegments; y++) {
                const vCoord = y / this.heightSegments;
                const yPos = vCoord * this.height - hh;
                for (let x = 0; x <= this.radialSegments; x++) {
                    const uCoord = x / this.radialSegments;
                    const theta = uCoord * MathUtils.TWO_PI;
                    v.push(r * Math.sin(theta), yPos, r * Math.cos(theta));
                    uv.push(uCoord, vCoord);
                }
            }
            for (let y = 0; y < this.heightSegments; y++) {
                for (let x = 0; x < this.radialSegments; x++) {
                    const first = offset + y * (this.radialSegments + 1) + x;
                    const second = first + this.radialSegments + 1;
                    if (isInner) {
                        idx.push(first, second, first + 1);
                        idx.push(second, second + 1, first + 1);
                    }
                    else {
                        idx.push(first, first + 1, second);
                        idx.push(first + 1, second + 1, second);
                    }
                }
            }
        };
        // Outer surface
        buildSurface(this.radius, false);
        // Inner surface
        buildSurface(this.innerRadius, true);
        const verticesPerSurface = (this.heightSegments + 1) * (this.radialSegments + 1);
        /**
         * Connects inner and outer surfaces with caps.
         */
        const connectCaps = (isTop) => {
            const outerOffset = isTop ? this.heightSegments * (this.radialSegments + 1) : 0;
            const innerOffset = verticesPerSurface + (isTop ? this.heightSegments * (this.radialSegments + 1) : 0);
            for (let x = 0; x < this.radialSegments; x++) {
                const o1 = outerOffset + x;
                const o2 = outerOffset + x + 1;
                const i1 = innerOffset + x;
                const i2 = innerOffset + x + 1;
                if (isTop) {
                    idx.push(o1, o2, i1);
                    idx.push(i1, o2, i2);
                }
                else {
                    idx.push(o1, i1, o2);
                    idx.push(i1, i2, o2);
                }
            }
        };
        connectCaps(true);
        connectCaps(false);
        this._vertices = new Float32Array(v);
        this._uvs = new Float32Array(uv);
        this._indices = this._createIndexArray(idx.length);
        this._indices.set(idx);
        this.computeNormals();
    }
}
//# sourceMappingURL=Tube.js.map