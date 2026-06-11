import { BoundingVolume, FrustumInterface } from '../interfaces/index.js';
import { Vector3D, Matrix4 } from '../math/index.js';
import { BoundingType } from '../enums/index.js';
/**
 * Represents a bounding sphere in 3D space.
 */
export declare class BoundingSphere implements BoundingVolume {
    center: Vector3D;
    radius: number;
    /** @inheritdoc */
    type: BoundingType;
    /**
     * Creates a new BoundingSphere.
     * @param center The center position of the sphere.
     * @param radius The radius of the sphere.
     */
    constructor(center: Vector3D, radius: number);
    /** @inheritdoc */
    getBroadRadius(): number;
    /** @inheritdoc */
    intersectsFrustum(frustum: FrustumInterface): boolean;
    /** @inheritdoc */
    intersectsVolume(other: BoundingVolume): boolean;
    /** @inheritdoc */
    containsVolume(other: BoundingVolume): boolean;
    /** @inheritdoc */
    transform(matrix: Matrix4): void;
}
