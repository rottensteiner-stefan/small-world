/// src/core/Object3D.ts
import { MathUtils, Matrix4, Quaternion, Vector3D } from "../math/index.js";
/**
 * Base class for all 3D objects in the scene.
 */
export class Object3D {
    uuid = MathUtils.generateUUID();
    name = "";
    geometry = undefined;
    material = undefined;
    bounds = undefined;
    position = new Vector3D();
    rotation = new Vector3D();
    scale = new Vector3D(1, 1, 1);
    localMatrix = new Matrix4();
    worldMatrix = new Matrix4();
    parent = undefined;
    children = [];
    isVisible = true;
    frustumCulled = true;
    isStatic = false;
    inFrustum = true;
    constructor(name) {
        this.name = name || MathUtils.generateUUID();
    }
    add(...children) {
        for (const child of children) {
            if (child.parent)
                child.parent.remove(child);
            child.parent = this;
            this.children.push(child);
        }
    }
    remove(...children) {
        for (const child of children) {
            const index = this.children.indexOf(child);
            if (-1 !== index) {
                child.parent = undefined;
                this.children.splice(index, 1);
            }
        }
    }
    translate(v) {
        this.position.add(v);
        return this;
    }
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        return this;
    }
    setRotation(x, y, z) {
        this.rotation.set(x, y, z);
        return this;
    }
    setScale(x, y = x, z = x) {
        this.scale.set(x, y, z);
        return this;
    }
    computeBounds() {
        if (this.geometry) {
            // 1. Get local bounds from geometry
            this.bounds = this.geometry.getBoundingVolume();
            // 2. Transform bounds to world space
            this.bounds.transform(this.worldMatrix);
        }
        return this;
    }
    lookAt(target, up = new Vector3D(0, 1, 0)) {
        const m = new Matrix4();
        Matrix4.lookAt(this.position, target, up, m);
        const q = new Quaternion();
        q.setFromRotationMatrix(m);
        return this;
    }
    updateMatrixWorld(force = false) {
        this.localMatrix.compose(this.position, this.rotation, this.scale);
        if (undefined === this.parent) {
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