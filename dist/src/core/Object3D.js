import { Matrix4 } from "../math/Matrix4.js";
import { Vector3D } from "../math/Vector3D.js";
export class Object3D {
    uuid = crypto.randomUUID();
    name = "";
    position = new Vector3D(0, 0, 0);
    rotation = new Vector3D(0, 0, 0);
    scale = new Vector3D(1, 1, 1);
    localMatrix = new Matrix4();
    worldMatrix = new Matrix4();
    parent = null;
    children = [];
    constructor(name = "") {
        this.name = name;
    }
    add(child) {
        if (child.parent) {
            child.parent.remove(child);
        }
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
    /**
     * Berechnet die Matrizen rekursiv für den gesamten Baum.
     */
    updateMatrixWorld(force = false) {
        // 1. Lokale Matrix aus Pos/Rot/Scale bauen
        this.localMatrix.compose(this.position, this.rotation, this.scale);
        // 2. Welt-Matrix berechnen
        if (this.parent === null) {
            this.worldMatrix.data.set(this.localMatrix.data);
        }
        else {
            Matrix4.multiply(this.parent.worldMatrix, this.localMatrix, this.worldMatrix);
        }
        // 3. Kinder anweisen, sich ebenfalls zu aktualisieren
        for (const child of this.children) {
            child.updateMatrixWorld(force);
        }
    }
}
//# sourceMappingURL=Object3D.js.map