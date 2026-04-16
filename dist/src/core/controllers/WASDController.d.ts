import { Controller } from '../../interfaces/index.js';
import { Object3D } from '../Object3D.js';
/**
 * Configuration for the WASDController.
 */
export interface WASDControllerOptions {
    /** Movement speed in units per second. Defaults to 10. */
    moveSpeed?: number;
    /** Whether vertical movement (Q/E) is enabled. Defaults to false. */
    enableVertical?: boolean;
}
/**
 * A controller that moves an Object3D using WASD keys.
 * Movement is relative to the object's rotation (local forward).
 */
export declare class WASDController implements Controller {
    /** @inheritdoc */
    enabled: boolean;
    private _target;
    private _options;
    /**
     * Creates a new WASDController.
     * @param target The object to move.
     * @param options Configuration options.
     */
    constructor(target: Object3D, options?: WASDControllerOptions);
    /** @inheritdoc */
    update(deltaTime: number): void;
}
