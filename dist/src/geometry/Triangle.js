/// src/geometry/Triangle.ts
import { AbstractGeometry } from "./AbstractGeometry.js";
/**
 * A simple triangle geometry defined by three points.
 */
export class Triangle extends AbstractGeometry {
    pointA;
    pointB;
    pointC;
    /**
     * Creates a new Triangle geometry.
     * @param pointA The first vertex position.
     * @param pointB The second vertex position.
     * @param pointC The third vertex position.
     */
    constructor(pointA, pointB, pointC) {
        super();
        this.pointA = pointA;
        this.pointB = pointB;
        this.pointC = pointC;
        this.generateGeometryData();
    }
    /** @inheritdoc */
    generateGeometryData() {
        this._vertices = new Float32Array([
            this.pointA.x,
            this.pointA.y,
            this.pointA.z,
            this.pointB.x,
            this.pointB.y,
            this.pointB.z,
            this.pointC.x,
            this.pointC.y,
            this.pointC.z,
        ]);
        this._uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);
        this._indices = new Uint16Array([0, 1, 2]);
    }
}
//# sourceMappingURL=Triangle.js.map