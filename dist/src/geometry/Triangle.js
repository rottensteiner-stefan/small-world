import { Vector3D } from "../math/Vector3D.js";
export class Triangle {
    pointA;
    pointB;
    pointC;
    /**
     * Erzeugt ein einzelnes Dreieck.
     * @param pointA Erster Eckpunkt.
     * @param pointB Zweiter Eckpunkt.
     * @param pointC Dritter Eckpunkt.
     */
    constructor(pointA = new Vector3D(0, 1, 0), pointB = new Vector3D(-1, -1, 0), pointC = new Vector3D(1, -1, 0)) {
        this.pointA = pointA;
        this.pointB = pointB;
        this.pointC = pointC;
    }
    getPrimitiveData() {
        const vertices = new Float32Array([
            this.pointA.x, this.pointA.y, this.pointA.z,
            this.pointB.x, this.pointB.y, this.pointB.z,
            this.pointC.x, this.pointC.y, this.pointC.z
        ]);
        // Linienzug für das Dreieck: A->B, B->C, C->A
        const indices = new Uint16Array([0, 1, 1, 2, 2, 0]);
        return { vertices, indices };
    }
}
//# sourceMappingURL=Triangle.js.map