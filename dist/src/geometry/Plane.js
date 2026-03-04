export class Plane {
    width;
    depth;
    widthSegments;
    depthSegments;
    /**
     * Erzeugt eine flache Ebene (XZ-Ausrichtung).
     * @param width Die Breite der Ebene (X-Achse).
     * @param depth Die Tiefe der Ebene (Z-Achse).
     * @param widthSegments Unterteilungen in der Breite.
     * @param depthSegments Unterteilungen in der Tiefe.
     */
    constructor(width = 1, depth = 1, widthSegments = 1, depthSegments = 1) {
        this.width = width;
        this.depth = depth;
        this.widthSegments = widthSegments;
        this.depthSegments = depthSegments;
    }
    getPrimitiveData() {
        const vertices = [];
        const indices = [];
        const halfWidth = this.width / 2;
        const halfDepth = this.depth / 2;
        const segmentWidth = this.width / this.widthSegments;
        const segmentDepth = this.depth / this.depthSegments;
        // Erzeuge Vertices
        for (let z = 0; z <= this.depthSegments; z++) {
            const zPos = z * segmentDepth - halfDepth;
            for (let x = 0; x <= this.widthSegments; x++) {
                const xPos = x * segmentWidth - halfWidth;
                vertices.push(xPos, 0, zPos);
            }
        }
        // Erzeuge Indizes für das Wireframe (Gitter-Linien)
        for (let z = 0; z <= this.depthSegments; z++) {
            for (let x = 0; x <= this.widthSegments; x++) {
                const current = z * (this.widthSegments + 1) + x;
                // Horizontale Linie
                if (x < this.widthSegments) {
                    indices.push(current, current + 1);
                }
                // Vertikale Linie
                if (z < this.depthSegments) {
                    indices.push(current, current + (this.widthSegments + 1));
                }
            }
        }
        return {
            vertices: new Float32Array(vertices),
            indices: new Uint16Array(indices),
        };
    }
}
//# sourceMappingURL=Plane.js.map