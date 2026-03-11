import { Vector3D } from "../math/Vector3D.js";
import { Matrix4 } from "../math/Matrix4.js";
export class Object3D {
    uuid = crypto.randomUUID();
    name = "";
    geometry = null;
    material = null; // <--- NEU
    bounds = null;
    position = new Vector3D(0, 0, 0);
    rotation = new Vector3D(0, 0, 0);
    scale = new Vector3D(1, 1, 1);
    localMatrix = new Matrix4();
    worldMatrix = new Matrix4();
    parent = null;
    children = [];
    isVisible = true;
    frustumCulled = true;
    constructor(name = "") {
        this.name = name;
    }
    add(child) {
        if (child.parent)
            child.parent.remove(child);
        child.parent = this;
        this.children.push(child);
    }
    remove(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            child.parent = null;
            this.children.splice(index, 1);
        }
    }
    updateMatrixWorld(force = false) {
        this.localMatrix.compose(this.position, this.rotation, this.scale);
        if (this.parent === null) {
            this.worldMatrix.data.set(this.localMatrix.data);
        }
        else {
            Matrix4.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
        }
        for (const child of this.children) {
            child.updateMatrixWorld(force);
        }
    }
}
//# sourceMappingURL=Object3D.js.map