/// src/math/projections/PerspectiveProjection.ts
import { Matrix4 } from "../Matrix4.js";
import { AbstractProjection } from "./AbstractProjection.js";
import { ProjectionType } from "../../enums/index.js";
import { MathUtils } from "../MathUtils.js";
/**
 * Perspective camera projection for 3D views.
 */
export class PerspectiveProjection extends AbstractProjection {
    /** Field of view in radians. */
    fov;
    /** Aspect ratio (width / height). */
    aspect;
    /** Near clip plane. */
    near;
    /** Far clip plane. */
    far;
    /** @inheritdoc */
    type = ProjectionType.PERSPECTIVE;
    /**
     * Creates a new PerspectiveProjection.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { fov = MathUtils.degToRad(75), aspect = 1, near = 0.1, far = 1000 } = options;
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.update();
    }
    /** @inheritdoc */
    update() {
        Matrix4.perspective(this.fov, this.aspect, this.near, this.far, this._matrix);
    }
    setAspect(value) {
        this.aspect = value;
        this.update();
    }
    zoom(delta) {
        this.fov += delta * this.fov;
        // Clamp FOV between 10 and 120 degrees
        this.fov = MathUtils.clamp(this.fov, MathUtils.degToRad(10), MathUtils.degToRad(120));
        this.update();
    }
    /** @inheritdoc */
    getMatrix() {
        return this._matrix;
    }
}
//# sourceMappingURL=PerspectiveProjection.js.map