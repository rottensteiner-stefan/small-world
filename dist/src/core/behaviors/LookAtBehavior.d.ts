import { Behavior } from './Behavior.js';
import { Object3D } from '../Object3D.js';
import { Vector3D } from '../../math/Vector3D.js';
/**
 * Constantly rotates the object to face a target position or another object.
 * Perfect for surveillance cameras, NPC tracking, or simple 2D billboards.
 */
export declare class LookAtBehavior extends Behavior {
    targetPoint: Vector3D | Object3D;
    constructor(targetPoint: Vector3D | Object3D);
    update(_deltaTime: number): void;
}
