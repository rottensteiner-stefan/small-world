import { ObjectGeometry } from "./ObjectGeometry.js";
export class Triangle extends ObjectGeometry {
    pointA;
    pointB;
    pointC;
    constructor(pointA, pointB, pointC) {
        super();
        this.pointA = pointA;
        this.pointB = pointB;
        this.pointC = pointC;
        this.generateGeometryData();
    }
    generateGeometryData() {
        this.vertices = new Float32Array([this.pointA.x, this.pointA.y, this.pointA.z, this.pointB.x, this.pointB.y, this.pointB.z, this.pointC.x, this.pointC.y, this.pointC.z]);
        this.indices = new Uint16Array([0, 1, 1, 2, 2, 0]);
    }
}
//# sourceMappingURL=Triangle.js.map