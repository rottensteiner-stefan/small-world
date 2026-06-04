/// src/core/controllers/OrbitController.ts
import { Input } from "../Input.js";
import { Keys } from "../../enums/index.js";
/**
 * A controller that orbits a camera around a fixed target.
 */
export class OrbitController {
    /** @inheritdoc */
    enabled = true;
    _camera;
    _options;
    /**
     * Creates a new OrbitController.
     * @param camera The camera to control.
     * @param options Configuration options.
     */
    constructor(camera, options = {}) {
        this._camera = camera;
        this._options = {
            lookSensitivity: options.lookSensitivity ?? 0.005,
            rotationSpeed: options.rotationSpeed ?? 2.0,
            minPhi: options.minPhi ?? 0.01,
            maxPhi: options.maxPhi ?? Math.PI - 0.01,
            enableRotation: options.enableRotation ?? true,
        };
    }
    /** @inheritdoc */
    update(deltaTime) {
        if (!this.enabled) {
            return;
        }
        // 1. Handle Rotation
        let dx = 0;
        let dy = 0;
        if (this._options.enableRotation) {
            if (Input.isPointerLocked) {
                dx = Input.mouse.dx;
                dy = Input.mouse.dy;
            }
            // Keyboard Rotation (A/D)
            const rotateY = Input.getAxis(Keys.A, Keys.D);
            if (0 !== rotateY) {
                this._camera.theta -= rotateY * this._options.rotationSpeed * deltaTime;
            }
        }
        // 2. Update Camera
        this._camera.update(this._camera.target, dx, dy, deltaTime);
    }
}
//# sourceMappingURL=OrbitController.js.map