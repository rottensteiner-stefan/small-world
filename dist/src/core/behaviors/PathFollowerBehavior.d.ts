import { Behavior } from './Behavior.js';
import { Curve3D } from '../../math/index.js';
/**
 * Moves an object along a 3D curve (e.g., CatmullRomSpline) over time.
 * Optionally orients the object to face the direction of travel.
 */
export declare class PathFollowerBehavior extends Behavior {
    curve: Curve3D;
    duration: number;
    lookForward: boolean;
    pingPong: boolean;
    private _time;
    private _direction;
    private _scratchTangent;
    /**
     * @param curve The mathematical path to follow.
     * @param duration Time in seconds to complete the path.
     * @param lookForward If true, aligns the object's rotation with the path's tangent (forward direction).
     * @param pingPong If true, the object reverses direction at the ends of the path. Otherwise it loops back to 0.
     */
    constructor(curve: Curve3D, duration?: number, lookForward?: boolean, pingPong?: boolean);
    update(deltaTime: number): void;
}
