/// src/core/controllers/ZoomController.ts
import { Behavior } from "../behaviors/Behavior.js";
import { Input } from "../Input.js";
/**
 * A standalone controller for handling camera zoom (Wheel/Pinch).
 */
export class ZoomController extends Behavior {
    enabled = true;
    _options;
    /**
     * Creates a new ZoomController.
     * @param options Configuration options.
     */
    constructor(options = {}) {
        super();
        this._options = {
            zoomSensitivity: options.zoomSensitivity ?? 0.5,
        };
    }
    update(_deltaTime) {
        if (!this.enabled || !this.target || 0 === Input.mouse.zoom) {
            return;
        }
        const cam = this.target;
        cam.zoom(Input.mouse.zoom * this._options.zoomSensitivity);
    }
}
//# sourceMappingURL=ZoomController.js.map