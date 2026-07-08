import { Behavior } from './Behavior.js';
import { Vector3D } from '../../math/index.js';
/**
 * Smoothly interpolates an object towards a target position, creating an inertia/spring-like effect.
 */
export declare class SpringLerpBehavior extends Behavior {
    targetPosition: Vector3D;
    lerpFactor: number;
    /**
     * @param targetPosition The position to move towards.
     * @param lerpFactor The interpolation factor (0.0 to 1.0). Default 0.1.
     */
    constructor(targetPosition: Vector3D, lerpFactor?: number);
    update(deltaTime: number): void;
}
