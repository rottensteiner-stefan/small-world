/// src/geometry/Grid.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
/**
 * A helper geometry representing a flat grid of lines on the XZ plane.
 */
export class Grid extends AbstractGeometry {
    /** The total size of the grid. */
    size;
    /** The number of divisions. */
    divisions;
    /**
     * Creates a new Grid geometry.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { size = 20, divisions = 20 } = options;
        this.size = size;
        this.divisions = divisions;
        this._isLineGeometry = true;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        const v = [];
        const uv = [];
        const idx = [];
        const step = this.size / this.divisions;
        const half = this.size / 2.0;
        let index = 0;
        for (let j = 0; j <= this.divisions; j++) {
            const pos = j * step - half;
            const ratio = j / this.divisions;
            // Vertical line
            v.push(pos, 0, -half, pos, 0, half);
            uv.push(ratio, 0, ratio, 1);
            idx.push(index, index + 1);
            index += 2;
            // Horizontal line
            v.push(-half, 0, pos, half, 0, pos);
            uv.push(0, ratio, 1, ratio);
            idx.push(index, index + 1);
            index += 2;
        }
        this._vertices = new Float32Array(v);
        this._uvs = new Float32Array(uv);
        this._indices = this._createIndexArray(idx.length);
        this._indices.set(idx);
    }
}
//# sourceMappingURL=Grid.js.map