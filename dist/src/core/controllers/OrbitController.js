/// src/core/controllers/OrbitController.ts
import { Behavior } from "../behaviors/Behavior.js";
import { Input } from "../Input.js";
/**
 * A controller that orbits a camera around a fixed target.
 */
export class OrbitController extends Behavior {
    enabled = true;
    _options;
    /**
     * Creates a new OrbitController.
     * @param options Configuration options.
     */
    constructor(options = {}) {
        super();
        this._options = {
            lookSensitivity: options.lookSensitivity ?? 0.005,
            rotationSpeed: options.rotationSpeed ?? 2.0,
            minPhi: options.minPhi ?? 0.01,
            maxPhi: options.maxPhi ?? Math.PI - 0.01,
            enableRotation: options.enableRotation ?? true,
        };
    }
    update(_deltaTime) {
        if (!this.enabled || !this.target) {
            return;
        }
        const cam = this.target;
        // 1. Handle Rotation
        if (this._options.enableRotation) {
            if (Input.isPointerLocked) {
                cam.pendingDx += Input.mouse.dx;
                cam.pendingDy += Input.mouse.dy;
            }
        }
    }
}
//# sourceMappingURL=OrbitController.js.map