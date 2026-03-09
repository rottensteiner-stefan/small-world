import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";
export class ObjectGeometry {
    vertices = new Float32Array();
    indices = new Uint16Array();
    normals = new Float32Array(); // <--- NEU
    getGeometryData() {
        return { vertices: this.vertices, indices: this.indices, normals: this.normals };
    }
    // <--- NEU: Die magische Methode zur automatischen Berechnung!
    computeNormals() {
        this.normals = new Float32Array(this.vertices.length);
        // Fallback für Linien-Geometrien (Grid, Line), die keine Dreiecke bilden
        if (this.indices.length % 3 !== 0) {
            for (let i = 0; i < this.normals.length; i += 3) {
                this.normals[i] = 0;
                this.normals[i + 1] = 1;
                this.normals[i + 2] = 0;
            }
            return;
        }
        // Kreuzprodukt für jedes Dreieck berechnen
        for (let i = 0; i < this.indices.length; i += 3) {
            const iA = this.indices[i] * 3;
            const iB = this.indices[i + 1] * 3;
            const iC = this.indices[i + 2] * 3;
            // Die 3 Punkte des Dreiecks
            const ax = this.vertices[iA], ay = this.vertices[iA + 1], az = this.vertices[iA + 2];
            const bx = this.vertices[iB], by = this.vertices[iB + 1], bz = this.vertices[iB + 2];
            const cx = this.vertices[iC], cy = this.vertices[iC + 1], cz = this.vertices[iC + 2];
            // Kantenvektoren u und v
            const ux = bx - ax, uy = by - ay, uz = bz - az;
            const vx = cx - ax, vy = cy - ay, vz = cz - az;
            // Kreuzprodukt (Normalenvektor)
            const nx = uy * vz - uz * vy;
            const ny = uz * vx - ux * vz;
            const nz = ux * vy - uy * vx;
            // Die Normale zu den beteiligten Vertices addieren (für Smooth Shading)
            this.normals[iA] += nx;
            this.normals[iA + 1] += ny;
            this.normals[iA + 2] += nz;
            this.normals[iB] += nx;
            this.normals[iB + 1] += ny;
            this.normals[iB + 2] += nz;
            this.normals[iC] += nx;
            this.normals[iC + 1] += ny;
            this.normals[iC + 2] += nz;
        }
        // Alle Normalen am Ende auf eine Länge von 1.0 normieren (Normalize)
        for (let i = 0; i < this.normals.length; i += 3) {
            const nx = this.normals[i], ny = this.normals[i + 1], nz = this.normals[i + 2];
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
            if (len > 0) {
                this.normals[i] /= len;
                this.normals[i + 1] /= len;
                this.normals[i + 2] /= len;
            }
        }
    }
    applyMatrix4(matrix) {
        const v = new Vector3D();
        for (let i = 0; i < this.vertices.length; i += 3) {
            v.x = this.vertices[i];
            v.y = this.vertices[i + 1];
            v.z = this.vertices[i + 2];
            matrix.transformVector(v);
            this.vertices[i] = v.x;
            this.vertices[i + 1] = v.y;
            this.vertices[i + 2] = v.z;
        }
        this.computeNormals(); // <--- WICHTIG: Nach Verformung Normalen neu berechnen!
        return this;
    }
    scale(f) {
        const m = new Matrix4();
        Matrix4.scale(f, m);
        return this.applyMatrix4(m);
    }
    rotateX(a) {
        const m = new Matrix4();
        Matrix4.rotateX(a, m);
        return this.applyMatrix4(m);
    }
    rotateY(a) {
        const m = new Matrix4();
        Matrix4.rotateY(a, m);
        return this.applyMatrix4(m);
    }
    rotateZ(a) {
        const m = new Matrix4();
        Matrix4.rotateZ(a, m);
        return this.applyMatrix4(m);
    }
}
//# sourceMappingURL=ObjectGeometry.js.map