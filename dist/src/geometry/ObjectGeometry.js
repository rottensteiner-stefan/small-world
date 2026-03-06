import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";
export class ObjectGeometry {
    vertices = new Float32Array();
    indices = new Uint16Array();
    getGeometryData() {
        return { vertices: this.vertices, indices: this.indices };
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