import { Behavior } from './Behavior.js';
import { Vector2D } from '../../math/Vector2D.js';
/**
 * Configuration options for UVScrollBehavior.
 */
export interface UVScrollBehaviorOptions {
    /** The scrolling speed in UV space per second. Defaults to (0.1, 0.0). */
    speed?: Vector2D;
}
/**
 * A behavior that constantly scrolls the UV coordinates of its target's material.
 * Note: The material must support `u_texOffset` (e.g., StandardMaterial).
 */
export declare class UVScrollBehavior extends Behavior {
    /** The scrolling speed in UV space per second. */
    speed: Vector2D;
    /**
     * Creates a new UVScrollBehavior.
     * @param options Configuration options.
     */
    constructor(options?: UVScrollBehaviorOptions);
    /** @inheritdoc */
    update(deltaTime: number): void;
}
