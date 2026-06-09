import { Behavior } from '../behaviors/Behavior.js';
import { InputMode } from '../../enums/index.js';
/**
 * Configuration for the WASDController.
 */
export interface WASDControllerOptions {
    /** Movement speed in units per second. Defaults to 10. */
    moveSpeed?: number;
    /** Input mode for A/D keys (STRAFE or TANK). Defaults to TANK. */
    inputMode?: InputMode;
    /** Whether vertical movement (Q/E) is enabled. Defaults to false. */
    enableVertical?: boolean;
}
/**
 * A controller that moves an Object3D using WASD keys.
 * Movement is relative to the object's rotation (local forward).
 */
export declare class WASDController extends Behavior {
    enabled: boolean;
    private _options;
    /**
     * Creates a new WASDController.
     * @param options Configuration options.
     */
    constructor(options?: WASDControllerOptions);
    update(deltaTime: number): void;
}
