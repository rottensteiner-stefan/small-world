/**
 * Base interface for all input controllers.
 */
export interface Controller {
    /** Whether the controller is currently enabled. */
    enabled: boolean;
    /**
     * Updates the controller logic.
     * @param deltaTime Time elapsed since the last frame in seconds.
     */
    update(deltaTime: number): void;
}
