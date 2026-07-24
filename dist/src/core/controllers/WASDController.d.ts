import { Behavior } from '../behaviors/index.js';
import { InputInterface } from '../index.js';
import { AudioSystem } from '../../audio/AudioSystem.js';
import { InputMode } from '../../enums/index.js';
/**
 * Configuration for the WASDController.
 */
export interface WASDControllerOptions {
    /** The input source. Required for reading keys. */
    input?: InputInterface;
    /** Audio system reference. Required — no global fallback. */
    audio?: AudioSystem;
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
    constructor(options: WASDControllerOptions);
    update(deltaTime: number): void;
}
