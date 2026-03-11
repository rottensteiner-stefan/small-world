import { ObjectGeometry } from "./ObjectGeometry.js";
export class Sphere extends ObjectGeometry {
    radius;
    widthSegments;
    heightSegments;
    constructor(radius = 1, widthSegments = 16, heightSegments = 12) {
        super();
        this.radius = radius;
        this.widthSegments = widthSegments;
        this.heightSegments = heightSegments;
        this.generateGeometryData();
    }
    generateGeometryData() {
        const v = [];
        const n = []; // <-- NEU: Array für unsere perfekten Normalen
        const uv = [];
        const idx = [];
        for (let y = 0; y <= this.heightSegments; y++) {
            const vRatio = y / this.heightSegments;
            const phi = vRatio * Math.PI;
            for (let x = 0; x <= this.widthSegments; x++) {
                const uRatio = x / this.widthSegments;
                const theta = uRatio * Math.PI * 2;
                // Position berechnen
                const px = -(this.radius * Math.sin(phi) * Math.cos(theta));
                const py = this.radius * Math.cos(phi);
                const pz = this.radius * Math.sin(phi) * Math.sin(theta);
                v.push(px, py, pz);
                // NEU: Perfekte Normale direkt mathematisch berechnen.
                // Da die Kugel im Ursprung (0,0,0) generiert wird, ist die Normale
                // einfach die Position geteilt durch den Radius (Normalisierung).
                n.push(px / this.radius, py / this.radius, pz / this.radius);
                uv.push(uRatio, 1 - vRatio);
            }
        }
        for (let y = 0; y < this.heightSegments; y++) {
            for (let x = 0; x < this.widthSegments; x++) {
                const first = y * (this.widthSegments + 1) + x;
                const second = first + this.widthSegments + 1;
                idx.push(first, second, first + 1);
                idx.push(second, second + 1, first + 1);
            }
        }
        this.vertices = new Float32Array(v);
        this.normals = new Float32Array(n); // <-- NEU: Setze die berechneten Normalen
        this.uvs = new Float32Array(uv);
        this.indices = new Uint16Array(idx);
        // WICHTIG: this.computeNormals() wurde hier entfernt!
        // Dadurch verhindern wir, dass der automatische Algorithmus
        // unsere perfekten Normalen wieder an der Naht kaputt rechnet.
    }
}
//# sourceMappingURL=Sphere.js.map