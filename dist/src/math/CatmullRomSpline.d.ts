import { Curve3D } from './Curve3D.js';
import { Vector3D } from './Vector3D.js';
/**
 * Evaluates a smooth Catmull-Rom spline passing directly through a set of 3D points.
 */
export declare class CatmullRomSpline extends Curve3D {
    points: Vector3D[];
    closed: boolean;
    constructor(points?: Vector3D[], closed?: boolean);
    getPoint(t: number, out?: Vector3D): Vector3D;
}
