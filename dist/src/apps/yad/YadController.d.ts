import { FirstPersonController, FirstPersonControllerOptions } from '../../core/behaviors/FirstPersonController.js';
/**
 * A retro style controller for forward/backward movement and left/right rotation.
 * It extends FirstPersonController and adds shooting, weapon selection, and damage logic.
 */
export declare class YadController extends FirstPersonController {
    private _lastShotTime;
    private _lastHurtTime;
    /**
     * Creates a new YadController.
     * @param options The configuration options.
     */
    constructor(options?: FirstPersonControllerOptions);
    update(deltaTime: number): void;
}
