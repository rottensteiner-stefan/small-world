export class Cube {
    size;
    /**
     * Erzeugt eine Cube-Geometrie (Wireframe).
     * @param size Die Kantenlänge des Würfels.
     */
    constructor(size = 1) {
        this.size = size;
    }
    getPrimitiveData() {
        const halfSize = this.size / 2;
        // Eckpunkte des Würfels (8 Punkte)
        const vertices = new Float32Array([
            -halfSize,
            -halfSize,
            halfSize, // 0
            halfSize,
            -halfSize,
            halfSize, // 1
            halfSize,
            halfSize,
            halfSize, // 2
            -halfSize,
            halfSize,
            halfSize, // 3
            -halfSize,
            -halfSize,
            -halfSize, // 4
            halfSize,
            -halfSize,
            -halfSize, // 5
            halfSize,
            halfSize,
            -halfSize, // 6
            -halfSize,
            halfSize,
            -halfSize, // 7
        ]);
        // Linien-Indizes für das Wireframe
        const indices = new Uint16Array([
            0,
            1,
            1,
            2,
            2,
            3,
            3,
            0, // Vorderseite
            4,
            5,
            5,
            6,
            6,
            7,
            7,
            4, // Rückseite
            0,
            4,
            1,
            5,
            2,
            6,
            3,
            7, // Verbindungen
        ]);
        return { vertices, indices };
    }
}
//# sourceMappingURL=Cube.js.map