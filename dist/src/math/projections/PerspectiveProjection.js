import { Projection } from "./Projection.js";
import { Matrix4 } from "../Matrix4.js";
export class PerspectiveProjection extends Projection {
    fov;
    aspect;
    near;
    far;
    constructor(fov, aspect, near, far) {
        super();
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.update();
    }
    update() { Matrix4.perspective(this.fov, this.aspect, this.near, this.far, this.matrix); }
    getMatrix() { return this.matrix; }
}
//# sourceMappingURL=PerspectiveProjection.js.map