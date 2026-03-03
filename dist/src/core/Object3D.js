import { Matrix4 } from '../math/Matrix4.js';
export class Object3D {
    position = [0, 0, 0];
    rotation = [0, 0, 0];
    color = [0, 1, 0, 1];
    geometry = null;
    modelMatrix = new Matrix4();
    static tM = new Matrix4();
    static rM = new Matrix4();
    updateMatrix() {
        Matrix4.translate(this.position[0], this.position[1], this.position[2], this.modelMatrix);
        if (this.rotation[1] !== 0) {
            Matrix4.rotateY(this.rotation[1], Object3D.rM);
            Matrix4.multiply(this.modelMatrix, Object3D.rM, Object3D.tM);
            this.modelMatrix.data.set(Object3D.tM.data);
        }
    }
}
//# sourceMappingURL=Object3D.js.map