import { ObjectGeometry } from "./ObjectGeometry.js";
export class ModelGeometry extends ObjectGeometry {
    constructor(vertices, uvs, normals, indices) {
        super();
        this.vertices = new Float32Array(vertices);
        this.uvs = new Float32Array(uvs);
        this.normals = new Float32Array(normals);
        this.indices = new Uint16Array(indices);
        // Falls das Modell keine Normalen mitbringt, berechnen wir sie selbst
        if (this.normals.length === 0) {
            this.computeNormals();
        }
    }
    generateGeometryData() {
        // Bleibt leer, da die Daten bereits im Konstruktor übergeben und gesetzt werden.
    }
}
//# sourceMappingURL=ModelGeometry.js.map