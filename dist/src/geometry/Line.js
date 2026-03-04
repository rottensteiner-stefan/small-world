import { Vector3D } from "../math/Vector3D.js";
export class Line {
    start;
    end;
    /**
     * Erzeugt eine einfache Linien-Geometrie.
     * @param start Der Startpunkt als Vector3D.
     * @param end Der Endpunkt als Vector3D.
     */
    constructor(start = new Vector3D(0, 0, 0), end = new Vector3D(0, 1, 0)) {
        this.start = start;
        this.end = end;
    }
    getPrimitiveData() {
        // Wir flachen die Vektoren für die GPU in ein Float32Array ab
        const vertices = new Float32Array([
            this.start.x,
            this.start.y,
            this.start.z,
            this.end.x,
            this.end.y,
            this.end.z,
        ]);
        // Eine Linie verbindet Punkt 0 mit Punkt 1
        const indices = new Uint16Array([0, 1]);
        return { vertices, indices };
    }
}
//# sourceMappingURL=Line.js.map