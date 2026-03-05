import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";
import { Color } from "./Color.js";
export class Object3D {
    position = new Vector3D(0, 0, 0);
    rotation = new Vector3D(0, 0, 0);
    scale = new Vector3D(1, 1, 1);
    color = Color.WHITE;
    geometry = null;
    bounds = null; // NEU: Physische Grenze
    modelMatrix = new Matrix4();
    static tM = new Matrix4();
    static rM = new Matrix4();
    updateMatrix() {
        Matrix4.translate(this.position, this.modelMatrix);
        if (this.rotation.y !== 0) {
            Matrix4.rotateY(this.rotation.y, Object3D.rM);
            Matrix4.multiply(this.modelMatrix, Object3D.rM, Object3D.tM);
            this.modelMatrix.data.set(Object3D.tM.data);
        }
    }
}
//# sourceMappingURL=Object3D.js.map