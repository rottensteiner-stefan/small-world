/// src/core/cameras/strategies/StiffStrategy.ts
import { CameraStrategyType } from "../../../enums/index.js";
import { MathUtils } from "../../../math/index.js";
/**
 * A camera strategy that rigidly follows a target.
 */
export class StiffStrategy {
    /** @inheritdoc */
    type = CameraStrategyType.STIFF;
    /** The radius of the camera from the target. */
    radius = 20;
    /** Minimum allowed radius. */
    minRadius = 2;
    /** Maximum allowed radius. */
    maxRadius = 500;
    /** @inheritdoc */
    constraints;
    /** @inheritdoc */
    update(camera, targetPos, dx, dy) {
        if (0 !== dx || 0 !== dy) {
            camera.theta -= dx * 0.005;
            camera.phi += dy * 0.005;
            const limit = MathUtils.HALF_PI - 0.01;
            if (limit < camera.phi)
                camera.phi = limit;
            if (-limit > camera.phi)
                camera.phi = -limit;
        }
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
        camera.position.x =
            camera.target.x + this.radius * Math.sin(camera.theta) * Math.cos(camera.phi);
        camera.position.y = camera.target.y + this.radius * Math.sin(camera.phi);
        camera.position.z =
            camera.target.z + this.radius * Math.cos(camera.theta) * Math.cos(camera.phi);
    }
    /** @inheritdoc */
    zoom(_camera, delta) {
        this.radius += delta * this.radius;
        this.radius = MathUtils.clamp(this.radius, this.minRadius, this.maxRadius);
        return true;
    }
}
//# sourceMappingURL=StiffStrategy.js.map