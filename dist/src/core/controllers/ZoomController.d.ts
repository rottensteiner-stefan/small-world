import { Behavior } from '../behaviors/Behavior.js';
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
export declare class ZoomController extends Behavior {
    enabled: boolean;
    private _options;
    /**
     * Creates a new ZoomController.
     * @param options Configuration options.
     */
    constructor(options?: ZoomControllerOptions);
    update(_deltaTime: number): void;
}
