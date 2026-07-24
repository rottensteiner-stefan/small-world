import { FirstPersonController, FirstPersonControllerOptions, EventDispatcherImpl } from '../../core/index.js';
/**
 * A retro style controller for forward/backward movement and left/right rotation.
 * It extends FirstPersonController and adds shooting, weapon selection, and damage logic.
 */
export declare class YadController extends FirstPersonController {
    private events;
    private _lastShotTime;
    private _lastHurtTime;
    /**
     * Creates a new YadController.
     * @param events The event bus
     * @param options The configuration options.
     */
    constructor(events: EventDispatcherImpl, options?: FirstPersonControllerOptions);
    update(deltaTime: number): void;
}
