/// src/core/controllers/ZoomController.ts
import { Input } from "../Input.js";
/**
 * A standalone controller for handling camera zoom (Wheel/Pinch).
 */
export class ZoomController {
    /** @inheritdoc */
    enabled = true;
    _camera;
    _options;
    /**
     * Creates a new ZoomController.
     * @param camera The camera to control.
     * @param options Configuration options.
     */
    constructor(camera, options = {}) {
        this._camera = camera;
        this._options = {
            zoomSensitivity: options.zoomSensitivity ?? 0.5,
        };
    }
    /** @inheritdoc */
    update(_deltaTime) {
        if (!this.enabled || 0 === Input.mouse.zoom) {
            return;
        }
        this._camera.zoom(Input.mouse.zoom * this._options.zoomSensitivity);
    }
}
//# sourceMappingURL=ZoomController.js.map