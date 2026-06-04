/// src/math/projections/OrthographicProjection.ts
import { Matrix4 } from "../Matrix4.js";
import { AbstractProjection } from "./AbstractProjection.js";
import { ProjectionType } from "../../enums/index.js";
/**
 * Modern Orthographic projection implementation.
 */
export class OrthographicProjection extends AbstractProjection {
    left;
    right;
    bottom;
    top;
    near;
    far;
    type = ProjectionType.ORTHOGRAPHIC;
    constructor(options = {}) {
        super();
        this.left = options.left ?? -1;
        this.right = options.right ?? 1;
        this.bottom = options.bottom ?? -1;
        this.top = options.top ?? 1;
        this.near = options.near ?? 0.1;
        this.far = options.far ?? 1000;
        this.update();
    }
    update() {
        Matrix4.orthographic(this.left, this.right, this.bottom, this.top, this.near, this.far, this._matrix);
    }
    /**
     * Adjusts the left/right bounds to match a specific aspect ratio while keeping top/bottom fixed.
     * @param aspect The target aspect ratio (width / height).
     */
    setAspect(aspect) {
        const height = this.top - this.bottom;
        const centerX = (this.left + this.right) / 2;
        this.left = centerX - (height * aspect) / 2;
        this.right = centerX + (height * aspect) / 2;
        this.update();
    }
    zoom(delta) {
        const factor = 1.0 + delta;
        this.left *= factor;
        this.right *= factor;
        this.top *= factor;
        this.bottom *= factor;
        this.update();
    }
    getMatrix() {
        return this._matrix;
    }
}
//# sourceMappingURL=OrthographicProjection.js.map