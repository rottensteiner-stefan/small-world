/// src/math/projections/ObliqueProjection.ts
import { Matrix4 } from "../Matrix4.js";
import { AbstractProjection } from "./AbstractProjection.js";
import { ProjectionType } from "../../enums/index.js";
/**
 * Oblique camera projection for specialized 2.5D views.
 */
export class ObliqueProjection extends AbstractProjection {
    /** Left clip plane. */
    left;
    /** Right clip plane. */
    right;
    /** Bottom clip plane. */
    bottom;
    /** Top clip plane. */
    top;
    /** Near clip plane. */
    near;
    /** Far clip plane. */
    far;
    /** @inheritdoc */
    type = ProjectionType.OBLIQUE;
    /**
     * Creates an ObliqueProjection from engine config options.
     * @param options The projection options from EngineOptions.
     * @param initialAspect The initial aspect ratio.
     */
    static fromConfig(options, initialAspect) {
        const size = options?.orthoSize ?? 10;
        return new ObliqueProjection({
            left: -size * initialAspect,
            right: size * initialAspect,
            bottom: -size,
            top: size,
            near: options?.near ?? 0.1,
            far: options?.far ?? 1000,
        });
    }
    /**
     * Creates a new ObliqueProjection.
     * @param options The configuration options.
     */
    constructor(options = {}) {
        super();
        const { left = -1, right = 1, bottom = -1, top = 1, near = 0.1, far = 1000 } = options;
        this.left = left;
        this.right = right;
        this.bottom = bottom;
        this.top = top;
        this.near = near;
        this.far = far;
        this.update();
    }
    /** @inheritdoc */
    update() {
        Matrix4.orthographic(this.left, this.right, this.bottom, this.top, this.near, this.far, this._matrix);
    }
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
    /** @inheritdoc */
    getMatrix() {
        return this._matrix;
    }
}
//# sourceMappingURL=ObliqueProjection.js.map