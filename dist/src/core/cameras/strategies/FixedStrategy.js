/// src/core/cameras/strategies/FixedStrategy.ts
import { CameraStrategyType } from "../../../enums/index.js";
/**
 * A camera strategy where the camera remains at a fixed position but looks at a target.
 */
export class FixedStrategy {
    /** @inheritdoc */
    type = CameraStrategyType.FIXED;
    /** @inheritdoc */
    constraints;
    /** @inheritdoc */
    update(camera, targetPos, _dx, _dy) {
        camera.target.copyFrom(targetPos);
        if (undefined !== this.constraints) {
            if (undefined !== this.constraints.min && undefined !== this.constraints.max) {
                camera.target.clamp(this.constraints.min, this.constraints.max);
            }
            else if (undefined !== this.constraints.min) {
                camera.target.x = Math.max(this.constraints.min.x, camera.target.x);
                camera.target.y = Math.max(this.constraints.min.y, camera.target.y);
                camera.target.z = Math.max(this.constraints.min.z, camera.target.z);
            }
            else if (undefined !== this.constraints.max) {
                camera.target.x = Math.min(this.constraints.max.x, camera.target.x);
                camera.target.y = Math.min(this.constraints.max.y, camera.target.y);
                camera.target.z = Math.min(this.constraints.max.z, camera.target.z);
            }
        }
    }
}
//# sourceMappingURL=FixedStrategy.js.map