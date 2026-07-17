import { Behavior } from './Behavior.js';
import { Vector3D } from '../../math/index.js';
export interface GridMovementOptions {
    /** The speed in units per second */
    speed?: number;
    /** The size of the grid cells. Turns are only evaluated when crossing these bounds. */
    gridSize?: number;
    /** Initial movement direction. Must be normalized. */
    direction?: Vector3D;
    /** Callback fired every time the object reaches a grid intersection.
     * Return a new Vector3D to change direction, or null to keep the current direction. */
    onGridIntersection?: (currentPosition: Vector3D, currentDirection: Vector3D) => Vector3D | null;
}
/**
 * A behavior that moves an object strictly along orthogonal axes (X or Z)
 * and evaluates grid intersections to allow for perfect 90-degree turns.
 */
export declare class GridMovementBehavior extends Behavior {
    speed: number;
    direction: Vector3D;
    gridSize: number;
    onGridIntersection?: ((currentPosition: Vector3D, currentDirection: Vector3D) => Vector3D | null) | undefined;
    private _distanceMoved;
    constructor(options?: GridMovementOptions);
    update(deltaTime: number): void;
    /**
     * Resets the movement tracker. Call this if you manually teleport the object.
     */
    resetMovement(): void;
}
