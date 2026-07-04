import { Vector3D } from './Vector3D.js';
/**
 * Base class for mathematical 3D curves.
 */
export declare abstract class Curve3D {
    private static _p1;
    private static _p2;
    /**
     * Evaluates the point on the curve at parameter t (0.0 to 1.0).
     * @param t Interpolation factor.
     * @param out Optional target vector to prevent allocation.
     */
    abstract getPoint(t: number, out?: Vector3D): Vector3D;
    /**
     * Approximates the tangent (derivative) vector at parameter t.
     * @param t Interpolation factor.
     * @param out Optional target vector to prevent allocation.
     */
    getTangent(t: number, out?: Vector3D): Vector3D;
}
