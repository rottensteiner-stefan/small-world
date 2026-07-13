import { Vector3D, Matrix4 } from '../math/index.js';
import { BoundingVolume, FrustumInterface } from '../interfaces/index.js';
import { BoundingType } from '../enums/index.js';
/**
 * An Oriented Bounding Box (OBB).
 * Essential for the Separating Axis Theorem (SAT) and precise collisions of rotated objects.
 */
export declare class OBB implements BoundingVolume {
    type: BoundingType;
    /** Center of the OBB in world space. */
    center: Vector3D;
    /** Half-extents of the OBB along its local axes. */
    halfExtents: Vector3D;
    /** The 3 orthogonal local axes of the OBB (X, Y, Z). */
    axes: [Vector3D, Vector3D, Vector3D];
    getBroadRadius(): number;
    intersectsFrustum(_frustum: FrustumInterface): boolean;
    intersectsVolume(_other: BoundingVolume): boolean;
    containsVolume(_other: BoundingVolume): boolean;
    /**
     * Transforms this OBB using a world matrix.
     * @param matrix The transformation matrix.
     */
    transform(matrix: Matrix4): void;
}
