/// src/core/cameras/strategies/FixedStrategy.ts
import { CameraStrategyType } from "../../../enums/index.js";
/**
 * A camera strategy where the camera stays at its current position but looks at a target.
 * This strategy allows manual movement of the camera's position property while
 * ensuring the view orientation is updated correctly.
 */
export class FixedStrategy {
    /** @inheritdoc */
    type = CameraStrategyType.FIXED;
    /** @inheritdoc */
    constraints;
    /** @inheritdoc */
    update(camera, targetPos, _dx, _dy) {
        // If a target position is provided (from a controller), update the camera's target.
        // Otherwise, it keeps its current target.
        if (targetPos !== camera.position) {
            camera.target.copyFrom(targetPos);
        }
        // Apply constraints to target if any
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
        // Note: We do NOT update camera.position here.
        // This allows manual movement in the update loop (e.g., camera.position.x += 1).
    }
}
//# sourceMappingURL=FixedStrategy.js.map