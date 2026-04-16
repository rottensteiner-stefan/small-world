import { CameraInterfaceData, Controller } from '../../interfaces/index.js';
/**
 * Configuration for the ZoomController.
 */
export interface ZoomControllerOptions {
    /** Zoom sensitivity. Defaults to 0.5. */
    zoomSensitivity?: number;
}
/**
 * A standalone controller for handling camera zoom (Wheel/Pinch).
 */
export declare class ZoomController implements Controller {
    /** @inheritdoc */
    enabled: boolean;
    private _camera;
    private _options;
    /**
     * Creates a new ZoomController.
     * @param camera The camera to control.
     * @param options Configuration options.
     */
    constructor(camera: CameraInterfaceData, options?: ZoomControllerOptions);
    /** @inheritdoc */
    update(_deltaTime: number): void;
}
