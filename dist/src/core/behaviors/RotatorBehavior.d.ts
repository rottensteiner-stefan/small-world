import { Behavior } from './Behavior.js';
import { Vector3D } from '../../math/Vector3D.js';
/**
 * Continuously rotates the attached object along specified axes.
 */
export declare class RotatorBehavior extends Behavior {
    speed: Vector3D;
    /**
     * @param speed The rotation speed per axis in radians per second. Defaults to Y-axis rotation (0, 1, 0).
     */
    constructor(speed?: Vector3D);
    update(deltaTime: number): void;
}
