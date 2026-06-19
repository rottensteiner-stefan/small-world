/// src/geometry/Line.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
/**
 * A simple line geometry connecting two points.
 */
export class Line extends AbstractGeometry {
    start;
    end;
    /**
     * Creates a new Line geometry.
     * @param start The start position of the line.
     * @param end The end position of the line.
     */
    constructor(start, end) {
        super();
        this.start = start;
        this.end = end;
        this._isLineGeometry = true;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        this._vertices = new Float32Array([
            this.start.x,
            this.start.y,
            this.start.z,
            this.end.x,
            this.end.y,
            this.end.z,
        ]);
        this._uvs = new Float32Array([0, 0, 1, 1]);
        this._indices = this._createIndexArray(2);
        this._indices.set([0, 1]);
    }
}
//# sourceMappingURL=Line.js.map